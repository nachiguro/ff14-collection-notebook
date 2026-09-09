import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const workerUrl = new URL("../workers/lodestone-proxy/src/index.js", import.meta.url);
const source = await fs.readFile(workerUrl, "utf8");
const worker = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const allowedOrigin = "https://nachiguro.github.io";

async function call(pathname, init = {}) {
  const request = new Request(`https://worker.test${pathname}`, {
    ...init,
    headers: { Origin: allowedOrigin, ...(init.headers || {}) }
  });
  return worker.default.fetch(request);
}

async function expectJsonError(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), allowedOrigin);
  const payload = await response.json();
  assert.equal(typeof payload.error, "string");
  assert.ok(payload.error.length > 0);
}

test("worker converts validation failures into CORS JSON responses", async () => {
  await expectJsonError(await call("/collection?characterId=bad&category=minion"), 400);
  await expectJsonError(await call("/collection?characterId=12345&category=spell"), 400);
  await expectJsonError(await call("/tooltips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json"
  }), 400);
});

test("worker converts upstream failures into CORS JSON responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("upstream unavailable", { status: 503 });
  try {
    await expectJsonError(await call("/collection?characterId=12345&category=minion"), 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker leaves expected ownership count unknown when the page has no total", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(`
    <p class="frame__chara__name">Test Character</p>
    <p class="frame__chara__world">Test World</p>
    <a data-tooltip_href="/lodestone/character/12345/minion/tooltip/abc/">item</a>
  `, { status: 200 });
  try {
    const response = await call("/collection?characterId=12345&category=minion");
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.expectedOwnedCount, null);
    assert.equal(payload.total, null);
    assert.equal(payload.discoveredCount, 1);
    assert.equal(payload.completeness, "unknown");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker accepts a verified empty collection", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(`
    <p class="frame__chara__name">Test Character</p>
    <p class="frame__chara__world">Test World</p>
    <div class="minion__sort__total">TOTAL <span>0</span></div>
  `, { status: 200 });
  try {
    const response = await call("/collection?characterId=12345&category=minion");
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.expectedOwnedCount, 0);
    assert.equal(payload.discoveredCount, 0);
    assert.equal(payload.completeness, "complete");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
