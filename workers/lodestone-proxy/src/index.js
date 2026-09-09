const LODESTONE_ORIGIN = "https://jp.finalfantasyxiv.com";
const MAX_TOOLTIP_URLS = 25;
const TOOLTIP_CACHE_TTL_SECONDS = 60 * 60 * 24;
const ALLOWED_ORIGINS = new Set([
  "https://nachiguro.github.io",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:4184",
  "http://localhost:4173",
  "http://localhost:4184"
]);

const CATEGORIES = {
  minion: {
    path: "minion",
    label: "ミニオン",
    totalClass: "minion__sort__total",
    headerClass: "minion__header__label",
    textClass: "minion__text"
  },
  mount: {
    path: "mount",
    label: "マウント",
    totalClass: "minion__sort__total",
    headerClass: "mount__header__label",
    textClass: "mount__text"
  }
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      const status = isAllowedRequestOrigin(request) ? 204 : 403;
      return new Response(null, { status, headers: corsHeaders(request) });
    }

    try {
      if (!isAllowedRequestOrigin(request)) {
        return jsonResponse({ error: "Origin is not allowed." }, 403, request);
      }

      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/") {
        return jsonResponse({
          ok: true,
          name: "FF14 Collection Notebook Lodestone Proxy",
          endpoints: ["/collection", "/tooltips"]
        }, 200, request);
      }

      if (request.method === "GET" && url.pathname === "/collection") {
        return await handleCollection(url, request);
      }

      if (request.method === "POST" && url.pathname === "/tooltips") {
        return await handleTooltips(request);
      }

      return jsonResponse({ error: "Not found." }, 404, request);
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      return jsonResponse({ error: error.message || "Worker error." }, status, request);
    }
  }
};

async function handleCollection(url, request) {
  const characterId = parseCharacterId(url.searchParams.get("characterId"));
  const categoryKey = normalizeCategory(url.searchParams.get("category"));
  const config = CATEGORIES[categoryKey];

  if (!characterId) {
    throw httpError(400, "characterId must be numeric.");
  }
  if (!config) {
    throw httpError(400, "category must be minion or mount.");
  }

  const pageUrl = `${LODESTONE_ORIGIN}/lodestone/character/${characterId}/${config.path}/`;
  const html = await fetchText(pageUrl);
  const character = parseCharacter(html);
  const { expectedOwnedCount, urls } = extractTooltipUrls(html, characterId, config);

  if (urls.length === 0 && expectedOwnedCount !== 0) {
    throw httpError(404, `Lodestone ${config.label} collection was not readable.`);
  }

  return jsonResponse({
    schemaVersion: 1,
    characterId,
    category: categoryKey,
    categoryLabel: config.label,
    characterName: character.name,
    server: character.server,
    sourceUrl: pageUrl,
    total: expectedOwnedCount,
    expectedOwnedCount,
    discoveredCount: urls.length,
    completeness: expectedOwnedCount == null ? "unknown" : expectedOwnedCount === urls.length ? "complete" : "partial",
    read: urls.length,
    tooltipUrls: urls
  }, 200, request);
}

async function handleTooltips(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw httpError(400, "Request body must be JSON.");
  }

  const categoryKey = normalizeCategory(body?.category);
  const config = CATEGORIES[categoryKey];
  const urls = Array.isArray(body?.urls) ? body.urls : [];

  if (!config) {
    throw httpError(400, "category must be minion or mount.");
  }
  if (urls.length === 0) {
    throw httpError(400, "urls must contain Lodestone tooltip paths.");
  }
  if (urls.length > MAX_TOOLTIP_URLS) {
    throw httpError(400, `urls must contain ${MAX_TOOLTIP_URLS} entries or fewer.`);
  }

  const paths = urls.map((value) => sanitizeTooltipPath(value, config));
  const parsed = await mapLimit(paths, 5, async (path) => {
    return fetchCachedTooltip(path, config);
  });

  return jsonResponse({
    schemaVersion: 1,
    category: categoryKey,
    items: parsed.filter((entry) => entry && entry.nameJa),
    errors: parsed.filter((entry) => entry && entry.error)
  }, 200, request);
}

async function fetchCachedTooltip(path, config) {
  const cacheKey = new Request(`${LODESTONE_ORIGIN}${path}`);
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    return cached.json();
  }

  const html = await fetchText(`${LODESTONE_ORIGIN}${path}`);
  const parsed = parseTooltip(html, path, config);

  if (parsed.nameJa) {
    try {
      await caches.default.put(cacheKey, new Response(JSON.stringify(parsed), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, max-age=${TOOLTIP_CACHE_TTL_SECONDS}`
        }
      }));
    } catch {
      // Tooltip parsing succeeded; cache write failures should not block import.
    }
  }

  return parsed;
}

async function fetchText(url, attempt = 0) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja"
    }
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 2) {
    await sleep(600 + attempt * 1200);
    return fetchText(url, attempt + 1);
  }

  if (!response.ok) {
    throw httpError(response.status, `Lodestone returned ${response.status}.`);
  }

  return response.text();
}

function parseCharacter(html) {
  const nameMatch = html.match(/<p class="frame__chara__name">([\s\S]*?)<\/p>/);
  const worldMatch = html.match(/<p class="frame__chara__world">([\s\S]*?)<\/p>/);

  return {
    name: stripTags(nameMatch?.[1] || ""),
    server: stripTags(worldMatch?.[1] || "")
  };
}

function extractTooltipUrls(html, characterId, config) {
  const totalMatch =
    html.match(new RegExp(`${escapeRegExp(config.totalClass)}[\\s\\S]*?<span>(\\d+)<\\/span>`)) ||
    html.match(/TOTAL\s*<span>(\d+)<\/span>/);
  const tooltipPattern = new RegExp(
    `data-tooltip_href="([^"]*?/lodestone/character/${characterId}/${config.path}/tooltip/[^"]+)"`,
    "g"
  );
  const urls = [];
  const seen = new Set();
  let match;

  while ((match = tooltipPattern.exec(html))) {
    const parsed = new URL(decodeHtml(match[1]), LODESTONE_ORIGIN);
    if (parsed.origin !== LODESTONE_ORIGIN) {
      continue;
    }

    const path = `${parsed.pathname}${parsed.search}`;
    if (!seen.has(path)) {
      seen.add(path);
      urls.push(path);
    }
  }

  return {
    expectedOwnedCount: totalMatch ? Number.parseInt(totalMatch[1], 10) : null,
    urls
  };
}

function parseTooltip(html, path, config) {
  const headerClass = escapeRegExp(config.headerClass);
  const textClass = escapeRegExp(config.textClass);
  const nameMatch = html.match(new RegExp(`<h4[^>]*class="[^"]*${headerClass}[^"]*"[^>]*>([\\s\\S]*?)<\\/h4>`));
  const textMatch = html.match(new RegExp(`<p[^>]*class="[^"]*${textClass}[^"]*"[^>]*>([\\s\\S]*?)<\\/p>`));

  return {
    nameJa: stripTags(nameMatch?.[1] || ""),
    descriptionJa: stripTags(textMatch?.[1] || ""),
    url: `${LODESTONE_ORIGIN}${path}`
  };
}

function sanitizeTooltipPath(value, config) {
  const parsed = new URL(String(value || ""), LODESTONE_ORIGIN);
  if (parsed.origin !== LODESTONE_ORIGIN) {
    throw httpError(400, "Tooltip URL origin is not allowed.");
  }

  const path = parsed.pathname;
  if (!path.startsWith("/lodestone/character/") || !path.includes(`/${config.path}/tooltip/`)) {
    throw httpError(400, "Tooltip URL path is not allowed.");
  }

  return `${path}${parsed.search}`;
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      try {
        results[index] = await mapper(values[index], index);
      } catch (error) {
        results[index] = {
          error: error.message || "Fetch failed.",
          url: values[index]
        };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function normalizeCategory(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "minions") return "minion";
  if (key === "mounts") return "mount";
  return key;
}

function parseCharacterId(value) {
  const text = String(value || "").trim();
  return /^\d+$/.test(text) ? text : null;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function jsonResponse(payload, status = 200, request = null) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request)
    }
  });
}

function corsHeaders(request = null) {
  const origin = allowedResponseOrigin(request);
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Accept",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function isAllowedRequestOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function allowedResponseOrigin(request) {
  const origin = request?.headers?.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }
  return "https://nachiguro.github.io";
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
