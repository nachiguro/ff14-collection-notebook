const http = require("node:http");
const fs = require("node:fs/promises");
const fssync = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(rootDir, "data");
const backupDir = path.join(dataDir, "backups");
const catalogPath = path.join(dataDir, "catalog.json");
const progressPath = path.join(dataDir, "user-progress.json");
const settingsPath = path.join(dataDir, "settings.json");
const runtimePath = path.join(rootDir, ".ff14cn-server.json");
const backupRetentionLimit = 20;
const backupMinIntervalMs = 10 * 60 * 1000;
let progressMigrationChecked = false;

const seedCatalog = {
  schemaVersion: 1,
  catalogVersion: "2026-05-04-minion-seed",
  category: "minion",
  updatedAt: "2026-05-04T00:00:00.000Z",
  source: {
    name: "FFXIV Collect",
    url: "https://ffxivcollect.com/minions",
    note: "Bundled starter catalog. Use the in-app refresh action to pull the latest minion catalog."
  },
  legal: {
    copyright: "© SQUARE ENIX",
    notes: [
      "FINAL FANTASY is a registered trademark of Square Enix Holdings Co., Ltd.",
      "This notebook stores personal progress locally and does not interact with the game client."
    ]
  },
  items: [
    {
      id: "minion-589",
      category: "minion",
      nameEn: "Wind-up Prishe",
      patch: "7.5",
      sourceType: "dungeon",
      sourceSummary: "Windurst: The Third Walk",
      ownedPercent: "0%",
      tradeable: false,
      icon: "https://ffxivcollect.com/images/minions/small/589.png",
      image: "https://ffxivcollect.com/images/minions/large/589.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/589" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-581",
      category: "minion",
      nameEn: "Little Red Viking",
      patch: "7.5",
      sourceType: "unknown",
      sourceSummary: "Source not yet verified",
      ownedPercent: "0%",
      tradeable: false,
      icon: "https://ffxivcollect.com/images/minions/small/581.png",
      image: "https://ffxivcollect.com/images/minions/large/581.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/581" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-575",
      category: "minion",
      nameEn: "Wind-up Red XIII",
      patch: "7.45",
      sourceType: "premium",
      sourceSummary: "Online Store",
      ownedPercent: "0.2%",
      tradeable: false,
      icon: "https://ffxivcollect.com/images/minions/small/575.png",
      image: "https://ffxivcollect.com/images/minions/large/575.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/575" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-568",
      category: "minion",
      nameEn: "Magic Lamp",
      patch: "7.45",
      sourceType: "dungeon",
      sourceSummary: "The Merchant's Tale",
      ownedPercent: "0.8%",
      tradeable: true,
      icon: "https://ffxivcollect.com/images/minions/small/568.png",
      image: "https://ffxivcollect.com/images/minions/large/568.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/568" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-578",
      category: "minion",
      nameEn: "Soothing Sea-beast",
      patch: "7.45",
      sourceType: "currency",
      sourceSummary: "Trisassant - Old Sharlayan - 12 Pieces of Corvosi Brass",
      ownedPercent: "0.2%",
      tradeable: true,
      icon: "https://ffxivcollect.com/images/minions/small/578.png",
      image: "https://ffxivcollect.com/images/minions/large/578.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/578" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-569",
      category: "minion",
      nameEn: "Droningway",
      patch: "7.41",
      sourceType: "cosmic-exploration",
      sourceSummary: "Cosmic Fortune - Oizys",
      ownedPercent: "1.2%",
      tradeable: true,
      icon: "https://ffxivcollect.com/images/minions/small/569.png",
      image: "https://ffxivcollect.com/images/minions/large/569.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/569" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-570",
      category: "minion",
      nameEn: "G-Warrior MGSD",
      patch: "7.4",
      sourceType: "pvp",
      sourceSummary: "PvP Series 10 - Level 15",
      ownedPercent: "1.2%",
      tradeable: false,
      icon: "https://ffxivcollect.com/images/minions/small/570.png",
      image: "https://ffxivcollect.com/images/minions/large/570.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/570" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-576",
      category: "minion",
      nameEn: "Grooving Green",
      patch: "7.4",
      sourceType: "raid",
      sourceSummary: "AAC Heavyweight M4 / AAC Heavyweight M4 (Savage)",
      ownedPercent: "4.1%",
      tradeable: false,
      icon: "https://ffxivcollect.com/images/minions/small/576.png",
      image: "https://ffxivcollect.com/images/minions/large/576.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/576" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-534",
      category: "minion",
      nameEn: "Wind-up Pelupelu",
      patch: "7.1",
      sourceType: "tribal",
      sourceSummary: "Pavli - Dock Poga (Kozama'uka) - 8 Pelu Pelplumes (Rank 4)",
      ownedPercent: "8.8%",
      tradeable: false,
      icon: "https://ffxivcollect.com/images/minions/small/534.png",
      image: "https://ffxivcollect.com/images/minions/large/534.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/534" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-505",
      category: "minion",
      nameEn: "Wind-up Garnet",
      patch: "7.0",
      sourceType: "collector-edition",
      sourceSummary: "Dawntrail Collector's Edition",
      ownedPercent: "15%",
      tradeable: false,
      icon: "https://ffxivcollect.com/images/minions/small/505.png",
      image: "https://ffxivcollect.com/images/minions/large/505.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/505" }
      ],
      verifiedAt: "2026-05-04"
    },
    {
      id: "minion-487",
      category: "minion",
      nameEn: "Wind-up Athena",
      patch: "6.4",
      sourceType: "raid",
      sourceSummary: "Anabaseios: The Twelfth Circle / Savage",
      ownedPercent: "24%",
      tradeable: false,
      icon: "https://ffxivcollect.com/images/minions/small/487.png",
      image: "https://ffxivcollect.com/images/minions/large/487.png",
      references: [
        { "title": "FFXIV Collect", "url": "https://ffxivcollect.com/minions/487" }
      ],
      verifiedAt: "2026-05-04"
    }
  ]
};

const seedProgress = {
  schemaVersion: 1,
  updatedAt: null,
  items: {}
};

const seedSettings = {
  schemaVersion: 1,
  theme: "nocturne",
  density: "comfortable",
  defaultSort: "patch-desc"
};

const collectionCategories = {
  mount: {
    endpoint: "mounts",
    path: "mounts",
    label: "マウント",
    imageFolder: "mounts"
  },
  minion: {
    endpoint: "minions",
    path: "minions",
    label: "ミニオン",
    imageFolder: "minions"
  },
  orchestrion: {
    endpoint: "orchestrions",
    path: "orchestrions",
    label: "オーケストリオン譜"
  },
  card: {
    endpoint: "triad/cards",
    path: "triad/cards",
    label: "トリプルトライアドカード"
  },
  emote: {
    endpoint: "emotes",
    path: "emotes",
    label: "エモート"
  },
  spell: {
    endpoint: "spells",
    path: "spells",
    label: "青魔法"
  },
  hairstyle: {
    endpoint: "hairstyles",
    path: "hairstyles",
    label: "髪型"
  },
  fashion: {
    endpoint: "fashions",
    path: "fashions",
    label: "傘/ファッションアクセサリー"
  },
  beast: {
    endpoint: null,
    path: "beasts",
    label: "魔獣図鑑"
  }
};

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(backupDir, { recursive: true });
  await ensureJsonFile(catalogPath, seedCatalog);
  await ensureJsonFile(progressPath, seedProgress);
  await ensureJsonFile(settingsPath, seedSettings);
  if (!progressMigrationChecked) {
    progressMigrationChecked = true;
    await migrateProgressFile();
  }
}

async function ensureJsonFile(filePath, seed) {
  try {
    await fs.access(filePath);
  } catch {
    await atomicWriteJson(filePath, seed);
  }
}

async function readJson(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text);
}

async function readProgress() {
  const { progress } = pruneProgressPayload(await readJson(progressPath));
  return progress;
}

async function migrateProgressFile() {
  try {
    const current = await readJson(progressPath);
    const { progress, pruned } = pruneProgressPayload(current);
    if (pruned > 0) {
      progress.updatedAt = current.updatedAt || new Date().toISOString();
      await atomicWriteJson(progressPath, progress, { backup: true, backupMinIntervalMs: 0 });
    }
  } catch (error) {
    console.warn(`Could not migrate progress file: ${error.message}`);
  }
}

function pruneProgressPayload(progress) {
  const normalized = {
    schemaVersion: 1,
    updatedAt: progress?.updatedAt || null,
    items: {}
  };
  let pruned = 0;

  if (progress?.items && typeof progress.items === "object") {
    Object.entries(progress.items).forEach(([itemId, itemProgress]) => {
      const normalizedItem = normalizeProgressItem(itemProgress);
      if (isDefaultProgressItem(normalizedItem)) {
        pruned += 1;
      } else {
        normalized.items[itemId] = normalizedItem;
      }
    });
  }

  if (progress?.lodestone && typeof progress.lodestone === "object") {
    normalized.lodestone = progress.lodestone;
  }
  if (progress?.screenshot && typeof progress.screenshot === "object") {
    normalized.screenshot = progress.screenshot;
  }

  return { progress: normalized, pruned };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function progressPayloadError(payload) {
  if (!isPlainObject(payload)) return "Progress payload must be an object.";
  if (payload.schemaVersion !== undefined && payload.schemaVersion !== 1) {
    return `Unsupported progress schemaVersion: ${String(payload.schemaVersion)}.`;
  }
  if (!isPlainObject(payload.items)) return "Progress payload must include an items object.";

  for (const [itemId, item] of Object.entries(payload.items)) {
    if (!itemId || !isPlainObject(item)) return `Invalid progress item: ${itemId || "(empty id)"}.`;
    if (item.owned !== undefined && typeof item.owned !== "boolean") return `${itemId}.owned must be boolean.`;
    if (item.wanted !== undefined && typeof item.wanted !== "boolean") return `${itemId}.wanted must be boolean.`;
    if (item.priority !== undefined && !["none", "low", "medium", "high"].includes(item.priority)) return `${itemId}.priority is invalid.`;
    if (item.notes !== undefined && typeof item.notes !== "string") return `${itemId}.notes must be string.`;
    if (item.updatedAt !== undefined && item.updatedAt !== null && typeof item.updatedAt !== "string") return `${itemId}.updatedAt must be string or null.`;
  }
  if (payload.lodestone !== undefined && !isPlainObject(payload.lodestone)) return "lodestone must be an object.";
  if (payload.screenshot !== undefined && !isPlainObject(payload.screenshot)) return "screenshot must be an object.";
  return null;
}

let progressWriteQueue = Promise.resolve();

function writeProgressQueued(progress, options = {}) {
  const write = () => atomicWriteJson(progressPath, progress, options);
  const pending = progressWriteQueue.then(write, write);
  progressWriteQueue = pending.catch(() => {});
  return pending;
}

function normalizeProgressItem(progress) {
  return {
    owned: progress?.owned === true,
    wanted: progress?.wanted === true,
    priority: ["none", "low", "medium", "high"].includes(progress?.priority) ? progress.priority : "none",
    notes: typeof progress?.notes === "string" ? progress.notes : "",
    updatedAt: progress?.updatedAt || null
  };
}

function isDefaultProgressItem(progress) {
  return !progress.owned &&
    !progress.wanted &&
    (!progress.priority || progress.priority === "none") &&
    !progress.notes;
}

function normalizeSettingsPayload(settings) {
  const normalized = { ...seedSettings, schemaVersion: 1 };
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return normalized;
  }

  const allowedThemes = new Set(["nocturne"]);
  const allowedDensity = new Set(["comfortable"]);
  const allowedSorts = new Set(["patch-desc", "name-asc", "source-asc", "priority-desc", "number-asc", "orchestrion-category-number-asc"]);

  if (allowedThemes.has(settings.theme)) {
    normalized.theme = settings.theme;
  }
  if (allowedDensity.has(settings.density)) {
    normalized.density = settings.density;
  }
  if (allowedSorts.has(settings.defaultSort)) {
    normalized.defaultSort = settings.defaultSort;
  }

  return normalized;
}

async function atomicWriteJson(filePath, data, options = {}) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  if (options.backup && fssync.existsSync(filePath)) {
    try {
      await createJsonBackup(filePath, options);
    } catch (error) {
      console.warn(`Could not create JSON backup for ${path.basename(filePath)}: ${error.message}`);
    }
  }

  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    throw new Error(`データファイルを書き込めませんでした: ${filePath} (${error.message})`);
  }
}

async function createJsonBackup(filePath, options = {}) {
  await fs.mkdir(backupDir, { recursive: true });

  const base = path.basename(filePath, ".json");
  const backups = await listJsonBackups(base);
  const newest = backups[0];
  const minIntervalMs = options.backupMinIntervalMs ?? backupMinIntervalMs;

  if (!newest || Date.now() - newest.mtimeMs >= minIntervalMs) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `${base}.${stamp}.json`);
    await fs.copyFile(filePath, backupPath);
    const stat = await fs.stat(backupPath);
    backups.unshift({ name: path.basename(backupPath), path: backupPath, mtimeMs: stat.mtimeMs });
  }

  await pruneJsonBackups(base, options.backupRetentionLimit ?? backupRetentionLimit, backups);
}

async function listJsonBackups(base) {
  let entries;
  try {
    entries = await fs.readdir(backupDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const prefix = `${base}.`;
  const backups = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.startsWith(prefix) || !entry.name.endsWith(".json")) {
      continue;
    }

    const backupPath = path.join(backupDir, entry.name);
    try {
      const stat = await fs.stat(backupPath);
      backups.push({ name: entry.name, path: backupPath, mtimeMs: stat.mtimeMs });
    } catch {
      // Ignore files that disappeared while rotating backups.
    }
  }

  backups.sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
  return backups;
}

async function pruneJsonBackups(base, retentionLimit = backupRetentionLimit, knownBackups = null) {
  const backups = knownBackups || await listJsonBackups(base);
  const staleBackups = backups.slice(Math.max(0, retentionLimit));

  for (const backup of staleBackups) {
    try {
      await fs.unlink(backup.path);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Could not remove old backup ${backup.name}: ${error.message}`);
      }
    }
  }
}

function jsonResponse(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readRequestBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    throw httpError(415, "Content-Type must be application/json.");
  }

  const body = await readRequestBody(req);
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw httpError(400, "Invalid JSON body.");
  }
}

function validateApiRequest(req) {
  const host = parseHeaderUrl(req.headers.host);
  if (!host || !isAllowedLocalHostname(host.hostname)) {
    return "Invalid Host header.";
  }

  const originHeader = req.headers.origin;
  if (!originHeader) {
    return null;
  }

  const origin = parseHeaderUrl(originHeader);
  if (!origin || origin.protocol !== "http:" || origin.host.toLowerCase() !== host.host.toLowerCase()) {
    return "Invalid Origin header.";
  }

  return null;
}

function parseHeaderUrl(value) {
  const text = String(value || "").trim();
  if (!text || text === "null") {
    return null;
  }

  try {
    return new URL(text.includes("://") ? text : `http://${text}`);
  } catch {
    return null;
  }
}

function isAllowedLocalHostname(hostname) {
  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(String(hostname || "").toLowerCase());
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeSourceType(entry) {
  const text = [
    ...(entry.sources || []).map((source) => source.type || source.text || ""),
    entry.source || "",
    entry.source_type || ""
  ].join(" ").toLowerCase();

  const pairs = [
    ["online store", "premium"],
    ["premium", "premium"],
    ["pvp", "pvp"],
    ["achievement", "achievement"],
    ["deep dungeon", "deep-dungeon"],
    ["dungeon", "dungeon"],
    ["raid", "raid"],
    ["trial", "trial"],
    ["quest", "quest"],
    ["fate", "fate"],
    ["craft", "crafting"],
    ["gather", "gathering"],
    ["gold saucer", "gold-saucer"],
    ["tribal", "tribal"],
    ["beast tribe", "tribal"],
    ["treasure", "treasure-hunt"],
    ["event", "event"],
    ["voyage", "voyages"],
    ["venture", "venture"],
    ["cosmic", "cosmic-exploration"],
    ["island", "island-sanctuary"],
    ["purchase", "purchase"]
  ];

  const match = pairs.find(([needle]) => text.includes(needle));
  return match ? match[1] : "other";
}

function normalizeSources(entry) {
  if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
    return [];
  }

  return entry.sources
    .map((source) => ({
      type: source.type || source.related_type || "Source",
      text: source.text || source.name || "",
      relatedType: source.related_type || null,
      relatedId: source.related_id || null
    }))
    .filter((source) => source.text || source.type);
}

function sourceSummary(entry) {
  const sources = normalizeSources(entry);
  if (sources.length === 0) {
    return localizeSourceText(entry.source || entry.source_text || "Source not yet verified");
  }

  return sources
    .map((source) => localizeSourceText(stripMarkdown(source.text || source.type)))
    .filter(Boolean)
    .slice(0, 4)
    .join(" / ");
}

function localizeSourceText(value) {
  let text = String(value || "");
  const replacements = [
    [/Source not yet verified/g, "入手方法未確認"],
    [/Online Store/g, "オンラインストア"],
    [/China Only/g, "中国版限定"],
    [/Dawntrail Collector'?s Edition/g, "黄金のレガシー コレクターズエディション"],
    [/Endwalker Collector'?s Edition/g, "暁月のフィナーレ コレクターズエディション"],
    [/Shadowbringers Collector'?s Edition/g, "漆黒のヴィランズ コレクターズエディション"],
    [/Stormblood Collector'?s Edition/g, "紅蓮のリベレーター コレクターズエディション"],
    [/Heavensward Collector'?s Edition/g, "蒼天のイシュガルド コレクターズエディション"],
    [/A Realm Reborn Collector'?s Edition/g, "新生エオルゼア コレクターズエディション"],
    [/Item code included with/g, "アイテムコード付属:"],
    [/The Art of Succession -Relics of Heritage-/g, "公式画集:継承の秘宝"],
    [/The Art of Resurrection -Beyond the Veil-/g, "公式画集:ヴェールの彼方"],
    [/The Art of Resurrection -Among The Stars-/g, "公式画集:星々の狭間"],
    [/The Art of Reflection -Histories Unwritten-/g, "公式画集:未記されし歴史"],
    [/The Art of Reflection -Histories Forsaken-/g, "公式画集:忘れられし歴史"],
    [/The Art of the Revolution -Eastern Memories-/g, "公式画集:東方の記憶"],
    [/The Art of the Revolution -Western Memories-/g, "公式画集:西方の記憶"],
    [/The Art of Ishgard -The Scars of War-/g, "公式画集:戦傷"],
    [/Dawntrail Original Soundtrack/g, "黄金のレガシー オリジナルサウンドトラック"],
    [/Endwalker Original Soundtrack/g, "暁月のフィナーレ オリジナルサウンドトラック"],
    [/Shadowbringers Original Soundtrack/g, "漆黒のヴィランズ オリジナルサウンドトラック"],
    [/Stormblood Original Soundtrack/g, "紅蓮のリベレーター オリジナルサウンドトラック"],
    [/Heavensward Original Soundtrack/g, "蒼天のイシュガルド オリジナルサウンドトラック"],
    [/Before Meteor Original Soundtrack/g, "ビフォアメテオ オリジナルサウンドトラック"],
    [/A Realm Reborn Original Soundtrack/g, "新生エオルゼア オリジナルサウンドトラック"],
    [/Growing Light/g, "光明の起点"],
    [/Death Unto Dawn/g, "黎明の死闘"],
    [/Before the Fall/g, "希望の灯火"],
    [/The Far Edge of Fate/g, "宿命の果て"],
    [/Heavensward Pre-order/g, "蒼天のイシュガルド 予約特典"],
    [/The Art of Eorzea -Another Dawn-/g, "公式画集:新たな夜明け"],
    [/Emerald Carbuncle Plushie/g, "エメラルドカーバンクルぬいぐるみ"],
    [/Delivery Moogle Plushie/g, "レターモーグリぬいぐるみ"],
    [/Original Soundtrack/g, "オリジナルサウンドトラック"],
    [/Artbook/g, "アートブック"],
    [/Encyclopaedia Eorzea III/g, "エオルゼア百科全書 第3巻"],
    [/Encyclopaedia Eorzea/g, "エオルゼア百科全書"],
    [/Dawntrail Pre-order/g, "黄金のレガシー 予約特典"],
    [/Endwalker Pre-order/g, "暁月のフィナーレ 予約特典"],
    [/Shadowbringers Pre-order/g, "漆黒のヴィランズ 予約特典"],
    [/Stormblood Pre-order/g, "紅蓮のリベレーター 予約特典"],
    [/Final Fantasy XVI Collaboration/g, "FF16コラボ"],
    [/Final Fantasy XI Collaboration/g, "FF11コラボ"],
    [/Final Fantasy 11 Collaboration/g, "FF11コラボ"],
    [/Fall Guys Collaboration/g, "フォールガイズコラボ"],
    [/Yo-kai Watch Collaboration/g, "妖怪ウォッチコラボ"],
    [/The Make It Rain Campaign/g, "ゴールドソーサー・フェスティバル"],
    [/Twitch Campaign \(August 2026\)/g, "Twitch視聴キャンペーン（2026年8月）"],
    [/Quest "Hero's Day Off" \(Intersocietal\)/g, "友好部族エクストラストーリー クエスト「英雄の休日」"],
    [/North Horn/g, "クレセントアイル：北征編"],
    [/The Forked Tower: Magic/g, "フォークタワー：魔の塔"],
    [/Kornago Merchant - Bentbranch Meadows/g, "コルナゴ派の商人 - 黒衣森：中央森林 (Ｘ:21.9 Ｙ:22.6)"],
    [/Requires Achievement "A Beast in the Hand V"/g, "アチーブメント「ビーストマニア：ランク5」達成が必要"],
    [/Requires Achievement "Crucible Reforged II"/g, "アチーブメント「闘獣練 特二盤を制覇せし者」達成が必要"],
    [/Heavensturn/g, "降神祭"],
    [/The Rising/g, "新生祭"],
    [/Hatching-tide/g, "エッグハント"],
    [/All Saints' Wake/g, "守護天節"],
    [/Valentione's Day/g, "ヴァレンティオンデー"],
    [/The Starlight Celebration/g, "星芒祭"],
    [/Moonfire Faire/g, "紅蓮祭"],
    [/Little Ladies' Day/g, "プリンセスデー"],
    [/Digital Fan Festival/g, "デジタルファンフェスティバル"],
    [/Fan Festival/g, "ファンフェスティバル"],
    [/PvP Series/g, "PvPシリーズ"],
    [/Level/g, "レベル"],
    [/Crafted by/g, "製作:"],
    [/Gathered by/g, "採集:"],
    [/Fisher/g, "漁師"],
    [/Miner/g, "採掘師"],
    [/Botanist/g, "園芸師"],
    [/Weaver/g, "裁縫師"],
    [/Armorer/g, "甲冑師"],
    [/Alchemist/g, "錬金術師"],
    [/Blacksmith/g, "鍛冶師"],
    [/Carpenter/g, "木工師"],
    [/Goldsmith/g, "彫金師"],
    [/Leatherworker/g, "革細工師"],
    [/Culinarian/g, "調理師"],
    [/Retainer Ventures?/g, "リテイナーベンチャー"],
    [/Treasure Hunt/g, "宝の地図"],
    [/Deep Dungeon/g, "ディープダンジョン"],
    [/Gold Saucer/g, "ゴールドソーサー"],
    [/MGP/g, "MGP"],
    [/MGF/g, "MGF"],
    [/Achievement Certificates?/g, "アチーブメントスクリップ"],
    [/Khloe's Bronze Certificate of Commendation/g, "クロの賞状:銅賞"],
    [/Khloe's Silver Certificate of Commendation/g, "クロの賞状:銀賞"],
    [/Khloe's Gold Certificate of Commendation/g, "クロの賞状:金賞"],
    [/Allagan Tomestones of Poetics/g, "アラガントームストーン:詩学"],
    [/Wolf Marks/g, "対人戦績"],
    [/Seals/g, "軍票"],
    [/Gil/g, "ギル"],
    [/Faux Leaves/g, "幻の葉"],
    [/Skybuilders' Scrips/g, "蒼天街振興券"],
    [/Bicolor Gemstones/g, "バイカラージェム"],
    [/Sacks of Nuts/g, "モブハントの戦利品"],
    [/Seafarer's Cowries/g, "シェルダレースクリップ:青船貨"],
    [/Enlightenment Silver Pieces/g, "啓蒙銀貨"],
    [/Enlightenment Gold Pieces/g, "啓蒙金貨"],
    [/Pieces of Corvosi Brass/g, "コルヴォス真鍮片"],
    [/Phials of Luminous Oil/g, "発光する油瓶"],
    [/Chunks of Sanguinite/g, "サングイナイトの塊"],
    [/Guardian Scales/g, "守護者の鱗"],
    [/Trophy Crystals/g, "トロフィークリスタル"],
    [/Yok Huy Wards/g, "ヨカフイ族通貨"],
    [/Mamool Ja Nanook/g, "マムージャ族通貨"],
    [/Pelu Pelplumes/g, "ペルペル族通貨"],
    [/Loporrit Carats/g, "レポリット族通貨"],
    [/Omicron Omnitokens/g, "オミクロン族通貨"],
    [/Arkasodara Pana/g, "アルカソーダラ族通貨"],
    [/Fae Fancies/g, "ピクシー族通貨"],
    [/Qitari Compliments/g, "キタリ族通貨"],
    [/Hammered Frogments/g, "ドワーフ族通貨"],
    [/Kojin Sango/g, "コウジン族通貨"],
    [/Ananta Dreamstaves/g, "アナンタ族通貨"],
    [/Namazu Koban/g, "ナマズオ族通貨"],
    [/Gelmorran Potsherds/g, "ゲルモラ土器片"],
    [/Empyrean Potsherds/g, "天之土器片"],
    [/Bozjan Clusters/g, "ボズヤクラスター"],
    [/Daivadipa's Beads/g, "ダイヴァディーパの宝珠"],
    [/Archaeotania's Horn/g, "アルケオタニアの角"],
    [/Formidable Cog/g, "フォーミダブルの歯車"],
    [/Dancing Wing/g, "ダンシングウィング"],
    [/Ixion Horns/g, "イクシオンの角片"],
    [/Sassho-seki Fragments/g, "殺生石の欠片"],
    [/Cosmic Fortune/g, "コスモフォーチュン"],
    [/Pilgrim's Traverse/g, "ピルグリムズ・トラバース"],
    [/Subaquatic Voyages/g, "サブマリンボイジャー"],
    [/Field Exploration/g, "リテイナー探索依頼:平地"],
    [/Highland Exploration/g, "リテイナー探索依頼:山岳"],
    [/Waterside Exploration/g, "リテイナー探索依頼:水辺"],
    [/Woodland Exploration/g, "リテイナー探索依頼:森林"],
    [/Quick Exploration/g, "ほりだしもの依頼"],
    [/Gardening/g, "栽培"],
    [/Kupo of Fortune/g, "クポフォーチュン"],
    [/Fête Present/g, "フェトゥ・プレゼント"],
    [/Itinerant Moogle/g, "旅のモーグリ"],
    [/Attend a Ceremony of Eternal Bonding/g, "エターナルバンドのセレモニーに参加"],
    [/The Palace of the Dead/g, "死者の宮殿"],
    [/Heaven-on-High/g, "アメノミハシラ"],
    [/Eureka Orthos/g, "オルト・エウレカ"],
    [/Delubrum Reginae/g, "グンヒルド・ディルーブラム"],
    [/Castrum Lacus Litore/g, "カストルム・ラクスリトレ攻城戦"],
    [/Southern Front Lockbox/g, "南方戦線のロックボックス"],
    [/Zadnor Lockbox/g, "ザトゥノル高原のロックボックス"],
    [/Sanctuary Materiel Container/g, "無人島素材コンテナ"],
    [/Anemos Lockbox/g, "アネモス帯のロックボックス"],
    [/Pagos Lockbox/g, "パゴス帯のロックボックス"],
    [/Pyros Lockbox/g, "ピューロス帯のロックボックス"],
    [/Hydatos Lockbox/g, "ヒュダトス帯のロックボックス"],
    [/Happy Bunny Lockbox/g, "しあわせうさぎの財宝箱"],
    [/Heat-warped Lockbox/g, "変異したロックボックス【火】"],
    [/Moisture-warped Lockbox/g, "変異したロックボックス【水】"],
    [/Bronze Ancient Record/g, "古びた記録:銅"],
    [/Silver Ancient Record/g, "古びた記録:銀"],
    [/Gold Ancient Record/g, "古びた記録:金"],
    [/Bronze\/Silver Ancient Record/g, "古びた記録:銅/銀"],
    [/Bronze\/Silver\/Gold Ancient Record/g, "古びた記録:銅/銀/金"],
    [/Bronze\/Silver Sack/g, "銅/銀の袋"],
    [/Silver\/Gold Sack/g, "銀/金の袋"],
    [/Bronze\/Silver\/Gold Sack/g, "銅/銀/金の袋"],
    [/Any Sack/g, "いずれかの袋"],
    [/Bronze Sack/g, "銅の袋"],
    [/Silver Sack/g, "銀の袋"],
    [/Gold Sack/g, "金の袋"],
    [/Bronze\/Silver Coffer/g, "銅/銀の宝箱"],
    [/Silver\/Gold Coffer/g, "銀/金の宝箱"],
    [/Bronze Coffer/g, "銅の宝箱"],
    [/Silver Coffer/g, "銀の宝箱"],
    [/Gold Coffer/g, "金の宝箱"],
    [/Pot\/Bunny Coffer/g, "壺/うさぎの宝箱"],
    [/Timeworn Kumbhiraskin\/Ophiotauroskin Map/g, "古ぼけた地図G14/G15"],
    [/Timeworn Gazelleskin Map/g, "古ぼけた地図G10"],
    [/FATEs?/g, "FATE"],
    [/Requires Quest/g, "前提クエスト"],
    [/Rank/g, "ランク"],
    [/only available during the "ゴールドソーサー・フェスティバル" event/g, "ゴールドソーサー・フェスティバル期間限定"],
    [/Old Sharlayan/g, "オールド・シャーレアン"],
    [/Tuliyollal/g, "トライヨラ"],
    [/Radz-at-Han/g, "ラザハン"],
    [/Yak T'el/g, "ヤクテル樹海"],
    [/Urqopacha/g, "オルコ・パチャ"],
    [/Kozama'uka/g, "コザマル・カ"],
    [/Thavnair/g, "サベネア島"],
    [/Ultima Thule/g, "ウルティマ・トゥーレ"],
    [/Mare Lamentorum/g, "嘆きの海"],
    [/Il Mheg/g, "イル・メグ"],
    [/Lakeland/g, "レイクランド"],
    [/The Rak'tika Greatwood/g, "ラケティカ大森林"],
    [/Eulmore/g, "ユールモア"],
    [/The Crystarium/g, "クリスタリウム"],
    [/The Ruby Sea/g, "紅玉海"],
    [/The Azim Steppe/g, "アジムステップ"],
    [/Rhalgr's Reach/g, "ラールガーズリーチ"],
    [/Kugane/g, "クガネ"],
    [/The Fringes/g, "ギラバニア辺境地帯"],
    [/The Lochs/g, "ギラバニア湖畔地帯"],
    [/Yanxia/g, "ヤンサ"],
    [/Kholusia/g, "コルシア島"],
    [/The Tempest/g, "テンペスト"],
    [/The Churning Mists/g, "ドラヴァニア雲海"],
    [/South Shroud/g, "黒衣森:南部森林"],
    [/Western La Noscea/g, "西ラノシア"],
    [/Eastern Thanalan/g, "東ザナラーン"],
    [/Limsa Lominsa/g, "リムサ・ロミンサ"],
    [/Gridania/g, "グリダニア"],
    [/Ul'dah/g, "ウルダハ"],
    [/Old Gridania/g, "グリダニア:旧市街"],
    [/Mor Dhona/g, "モードゥナ"],
    [/Idyllshire/g, "イディルシャイア"],
    [/The Gold Saucer/g, "ゴールドソーサー"],
    [/Oizys/g, "オイジュス"],
    [/Phaenna/g, "フェーナ"],
    [/Sinus Ardonum/g, "シヌス・アルドノム"],
    [/South Horn/g, "サウスホーン"],
    [/Trisassant/g, "トリザサン"],
    [/Smithy/g, "鍛冶屋"],
    [/Rarkorgor/g, "ラルコルゴル"],
    [/Shelter/g, "シェルター"],
    [/Veerul Ja/g, "ヴィール・ジャ"],
    [/Gok Golma/g, "ゴク・ゴルマ"],
    [/Pavli/g, "パヴリ"],
    [/Dock Poga/g, "ポガ停船所"],
    [/Ryubool Ja/g, "リュブール・ジャ"],
    [/Rral Wuruq/g, "ルラル・ウルク"],
    [/Tepli/g, "テプリ"],
    [/Coiningway/g, "コイニングウェイ"],
    [/Hoper's Hold/g, "ホーパーズホールド"],
    [/Ghanta/g, "ガーンタ"],
    [/Svarna/g, "スヴァルナ"],
    [/N-0598/g, "N-0598"],
    [/N-1499/g, "N-1499"],
    [/Base Omicron/g, "ベース・オミクロン"],
    [/A-4 Research/g, "A-4調査"],
    [/Mizutt/g, "ミズット"],
    [/Watts's Anvil/g, "ワッツハンマー・ガレージ"],
    [/Sul Lad/g, "スール＝ラド"],
    [/Lydha Lran/g, "リェー・メグ"],
    [/Jul Oul/g, "ユール＝オール"],
    [/Yuqurl Manl/g, "ユクル＝マンル"],
    [/Hopl's Stopple/g, "ホパル古盤"],
    [/Nacille/g, "ナシル"],
    [/Fanow/g, "ファノヴの里"],
    [/Halden/g, "ハルデン"],
    [/Twine/g, "トゥワイン"],
    [/Fathard/g, "ファサード"],
    [/Xylle/g, "シル"],
    [/Ilfroy/g, "イルフロイ"],
    [/Giant Beaver/g, "ジャイアントビーバー"],
    [/Shikitahe/g, "シキタヘ"],
    [/Tamamizu/g, "碧のタマミズ"],
    [/Madhura/g, "マドゥラ"],
    [/Castellum Velodyna/g, "カストルム・ベロジナ"],
    [/Gyosho/g, "ギョショウ"],
    [/Dhoro Iloh/g, "ドーロ・イロー"],
    [/Eschina/g, "エシナ"],
    [/Leuekin/g, "リューキン"],
    [/Estrild/g, "エストリルド"],
    [/E-Una-Kotor/g, "エ・ウナ・コトロ"],
    [/Quarrymill/g, "クォーリーミル"],
    [/Magic Pot/g, "マジックポット"],
    [/The Isles of Umbra/g, "幻影諸島"],
    [/Mogmul Mogbelly/g, "モグムリ"],
    [/Bahrr Lehs/g, "バール・レス"],
    [/Maudlin Latool Ja/g, "マスク・ド・ブルー"],
    [/J'lakshai/g, "ジャラクシャイ"],
    [/Wilmetta/g, "ウィルメッタ"],
    [/Nesvaaz/g, "ネズヴァズ"],
    [/Gramsol/g, "グラムソル"],
    [/Amh Araeng/g, "アム・アレーン"],
    [/Eureka Pyros/g, "エウレカ:ピューロス帯"],
    [/Eureka Pagos/g, "エウレカ:パゴス帯"],
    [/Eureka Anemos/g, "エウレカ:アネモス帯"],
    [/Eureka Hydatos/g, "エウレカ:ヒュダトス帯"],
    [/The Baldesion Arsenal/g, "バルデシオンアーセナル"],
    [/Absolute Virtue Chest/g, "アブソリュートヴァーチューの宝箱"],
    [/Confederate Custodian/g, "海賊衆のよろず屋"],
    [/Crick/g, "クリック"],
    [/Allied 軍票/g, "同盟記章"],
    [/Centurio 軍票/g, "セントリオ記章"],
    [/Hi-Elixir/g, "ハイエリクサー"],
    [/Crystalline Conflict: Random Drop/g, "クリスタルコンフリクト:ランダムドロップ"],
    [/The Art of Ishgard -Stone and Steel-/g, "公式画集:石と鋼"],
    [/Gold\/Platinum Sack/g, "金/プラチナの袋"],
    [/Iron\/銀\/金の袋/g, "鉄/銀/金の袋"],
    [/Gold\/Platinum/g, "ゴールド/プラチナ"],
    [/Timeworn Dragonskin Map/g, "古ぼけた地図G8"],
    [/Timeworn Wyvernskin Map/g, "古ぼけた地図G7"],
    [/Timeworn Peisteskin Map/g, "古ぼけた地図G5"],
    [/Timeworn Toadskin Map/g, "古ぼけた地図G4"],
    [/Timeworn Boarskin Map/g, "古ぼけた地図G3"],
    [/Unhidden Leather Map/g, "隠された地図"],
    [/Topaz Carbuncle Plushie/g, "トパーズカーバンクルぬいぐるみ"],
    [/The Minstrel Balad: Shinryu's Domain/g, "極神龍討滅戦"],
    [/Jonathas/g, "ジョナサス"],
    [/The Navel/g, "タイタン討滅戦"],
    [/The Howling Eye/g, "ガルーダ討滅戦"],
    [/The Bowl of Embers/g, "イフリート討滅戦"],
    [/Vath Stickpeddler/g, "ヴァス族のよろず屋"],
    [/Loth ast Vath/g, "ロス・アスト・ヴァス"],
    [/The Dravanian Forelands/g, "高地ドラヴァニア"],
    [/Luna Vanu/g, "ルナバヌ"],
    [/Ok' Gundu Nakki/g, "オク・ズンド"],
    [/The Sea of Clouds/g, "アバラシア雲海"],
    [/LoVM/g, "ロード・オブ・ヴァーミニオン"],
    [/Ardolain/g, "アルドラン"],
    [/The Forgotten Knight/g, "忘れられた騎士亭"],
    [/Ishgard/g, "イシュガルド"],
    [/Sahagin Vendor/g, "サハギン族のよろず屋"],
    [/Novv's Nursery/g, "ノォヴ一族の集落"],
    [/Kobold Vendor/g, "コボルド族のよろず屋"],
    [/789th Order Dig/g, "第789洞穴団の採掘地"],
    [/Outer La Noscea/g, "外地ラノシア"],
    [/Ixali Vendor/g, "イクサル族のよろず屋"],
    [/Ehcatl/g, "エカトル"],
    [/North Shroud/g, "黒衣森:北部森林"],
    [/Amalj'aa Vendor/g, "アマルジャ族のよろず屋"],
    [/Ring of Ash/g, "灰の陣営"],
    [/Southern Thanalan/g, "南ザナラーン"],
    [/Sylphic Vendor/g, "シルフ族のよろず屋"],
    [/Little Solace/g, "シルフの仮宿"],
    [/East Shroud/g, "黒衣森:東部森林"],
    [/The Binding Coil of Bahamut -Turn 1, 2, 4 and 5/g, "大迷宮バハムート:邂逅編1/2/4/5"],
    [/Desynthesize a Ninja Betta/g, "ニンジャベタを分解"],
    [/Hunt Billmaster/g, "モブハント担当官"],
    [/Any Grand Company Headquarters/g, "グランドカンパニー本部"],
    [/Elixir/g, "エリクサー"],
    [/Dragon Quest (10|X) Collaboration/g, "ドラクエ10コラボ"],
    [/A Realm Reborn Pre-order/g, "新生エオルゼア 予約特典"],
    [/Minion Trader/g, "ミニオントレーダー"],
    [/Maisenta/g, "マイセンタ"],
    [/Roarich/g, "ロアリッチ"],
    [/Bango Zango/g, "バンゴ・ザンゴ"],
    [/Auriana/g, "オーリアナ"],
    [/Eastern La Noscea/g, "東ラノシア"],
    [/Coerthas Central Highlands/g, "クルザス中央高地"],
    [/Northern Thanalan/g, "北ザナラーン"],
    [/Upper La Noscea/g, "高地ラノシア"],
    [/Junkmonger Nonoroon/g, "雑貨屋ノノルン"],
    [/Poor Maid's Mill/g, "プアメイド・ミル"],
    [/Boughbury Trader/g, "バウバリー商人"],
    [/Redbelly Hive/g, "レッドベリー砦"],
    [/Chachamun/g, "チャチャムン"],
    [/Highbridge/g, "ハイブリッジ"],
    [/Flame Quartermaster/g, "不滅隊補給担当官"],
    [/Serpent Quartermaster/g, "双蛇党補給担当官"],
    [/Storm Quartermaster/g, "黒渦団補給担当官"],
    [/Flame 軍票/g, "不滅隊軍票"],
    [/Serpent 軍票/g, "双蛇党軍票"],
    [/Storm 軍票/g, "黒渦団軍票"],
    [/The Wreath of Snakes \(Extreme\)/g, "極青龍征魂戦"],
    [/Hell's Kier \(Extreme\)/g, "極朱雀征魂戦"],
    [/The Jade Stoa \(Extreme\)/g, "極白虎征魂戦"],
    [/The Minstrel'?s Balad: Shinryu'?s Domain/g, "極神龍討滅戦"],
    [/Thok ast Thok \(Extreme\)/g, "極ラーヴァナ討滅戦"],
    [/The Limitless Blue \(Extreme\)/g, "極ビスマルク討滅戦"],
    [/The Pool of Tribute \(Extreme\)/g, "極スサノオ討滅戦"],
    [/Emanation \(Extreme\)/g, "極ラクシュミ討滅戦"],
    [/The Akh Afah Amphitheatre \(Extreme\)/g, "極シヴァ討滅戦"],
    [/Storm's Crown \(Extreme\)/g, "極バルバリシア討滅戦"],
    [/\s+-\s+/g, " - "]
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  const romanRanks = {
    XXXI: "31",
    XXX: "30",
    XXIX: "29",
    XXVIII: "28",
    XXVII: "27",
    XXVI: "26",
    XXV: "25",
    XXIV: "24",
    XXIII: "23",
    XXII: "22",
    XXI: "21",
    XX: "20",
    XIX: "19",
    XVIII: "18",
    XVII: "17",
    XVI: "16",
    XV: "15",
    XIV: "14",
    XIII: "13",
    XII: "12",
    XI: "11",
    X: "10"
  };
  text = text.replace(/\b(XXXI|XXX|XXIX|XXVIII|XXVII|XXVI|XXV|XXIV|XXIII|XXII|XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X)\b/g, (match) => romanRanks[match] || match);
  text = text
    .replace(/サブマリンボイジャー[:\s-]+[^/]+/g, "サブマリンボイジャー（探索海域）")
    .replace(/FATE\s+"[^"]+"/g, "FATE")
    .replace(/\(FATE\s+"[^"]+"\s*-\s*([^)]+)\)/g, "（FATE - $1）")
    .replace(/\(前提クエスト "[^"]+"\)/g, "（前提クエストあり）")
    .replace(/\(Requires FATE\)/g, "（前提FATEあり）")
    .replace(/\(Savage\)/g, "（零式）")
    .replace(/Savage/g, "零式")
    .replace(/\(Extreme\)/g, "（極）")
    .replace(/\(Hard\)/g, "（ハード）")
    .replace(/\bHard\b/g, "ハード")
    .replace(/and "[^"]+"/g, "")
    .replace(/\s+and\s+/g, "/")
    .replace(/Bronze\/古びた記録:銀\/古びた記録:金/g, "古びた記録:銅/銀/金")
    .replace(/Bronze\/古びた記録:銀/g, "古びた記録:銅/銀");

  return text
    .replace(/古びた記録:銅\/古びた記録:銀\/古びた記録:金/g, "古びた記録:銅/銀/金")
    .replace(/古びた記録:銅\/古びた記録:銀/g, "古びた記録:銅/銀")
    .replace(/Old グリダニア/g, "グリダニア:旧市街")
    .replace(/The ゴールドソーサー/g, "ゴールドソーサー")
    .replace(/\(ランク (\d+)\)/g, "（ランク$1）")
    .replace(/\((\d{4})\)/g, "（$1）")
    .replace(/\(中国版限定\)/g, "（中国版限定）")
    .replace(/\s+\/\s+/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksJapanese(value) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(value || ""));
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function mapCollectionItem(entry, categoryKey) {
  const config = collectionCategories[categoryKey] || collectionCategories.minion;
  const externalId = entry.id ?? entry.ID ?? entry.row_id;
  const id = externalId ? `${categoryKey}-${externalId}` : `${categoryKey}-${slug(entry.name || entry.Name || "unknown")}`;
  const image = entry.image || entry.image_blue || entry.image_red || fallbackImage(config, externalId);
  const icon = entry.icon || fallbackIcon(config, externalId) || image;
  const name = entry.name || entry.Name || "Unknown Minion";
  const isJapanese = looksJapanese(name);
  const description = stripMarkdown(entry.enhanced_description || entry.description || entry.tooltip || "");
  const summary = sourceSummary(entry);

  return {
    id,
    externalIds: {
      ffxivCollect: externalId || null,
      item: entry.item_id || entry.itemId || null
    },
    category: categoryKey,
    categoryLabel: config.label,
    nameJa: isJapanese ? name : "",
    nameEn: isJapanese ? "" : name,
    descriptionJa: isJapanese ? description : "",
    description: isJapanese ? "" : description,
    patch: String(entry.patch || ""),
    sourceType: normalizeSourceType(entry),
    sourceSummaryJa: isJapanese ? summary : "",
    sourceSummary: isJapanese ? "" : summary,
    sources: normalizeSources(entry),
    ownedPercent: entry.owned || null,
    tradeable: typeof entry.tradeable === "boolean" ? entry.tradeable : null,
    meta: collectionMeta(entry, categoryKey),
    icon,
    image,
    references: [
      externalId
        ? { title: "FFXIV Collect", url: entry.link || `https://ffxivcollect.com/${config.path}/${externalId}` }
        : { title: "FFXIV Collect", url: `https://ffxivcollect.com/${config.path}` },
      ...(config.endpoint
        ? [{ title: "FFXIV Collect API", url: `https://ffxivcollect.com/api/${config.endpoint}` }]
        : [])
    ],
    verifiedAt: new Date().toISOString().slice(0, 10)
  };
}

function fallbackImage(config, externalId) {
  if (!externalId || !config.imageFolder) {
    return "";
  }
  return `https://ffxivcollect.com/images/${config.imageFolder}/large/${externalId}.png`;
}

function fallbackIcon(config, externalId) {
  if (!externalId || !config.imageFolder) {
    return "";
  }
  return `https://ffxivcollect.com/images/${config.imageFolder}/small/${externalId}.png`;
}

function collectionMeta(entry, categoryKey) {
  const meta = [];
  const add = (label, value) => {
    if (value !== undefined && value !== null && value !== "") {
      meta.push({ label, value: String(value) });
    }
  };

  if (categoryKey === "mount") {
    add("座席", entry.seats ? `${entry.seats}人` : "");
    add("移動", localizeSourceText(entry.movement || ""));
  }
  if (categoryKey === "orchestrion") {
    add("番号", entry.number);
    add("分類", entry.category?.name);
  }
  if (categoryKey === "card") {
    add("番号", entry.number);
    add("レア", entry.stars ? `${entry.stars}★` : "");
    add("種別", entry.type?.name);
  }
  if (categoryKey === "emote") {
    add("コマンド", entry.command);
    add("分類", entry.category?.name);
  }
  if (categoryKey === "spell") {
    add("ランク", entry.rank ? `${entry.rank}★` : "");
    add("分類", entry.type?.name);
    add("属性", entry.aspect?.name);
  }
  if (categoryKey === "fashion") {
    add("種別", "ファッションアクセサリー");
  }
  if (categoryKey === "beast") {
    add("番号", entry.number);
  }

  return meta;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchCollectionCategory(categoryKey) {
  const config = collectionCategories[categoryKey];
  if (categoryKey === "beast") {
    return fetchBeastCategory();
  }
  const response = await fetch(`https://ffxivcollect.com/api/${config.endpoint}?language=ja`, {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "ja",
      "User-Agent": "FF14 Collection Notebook personal local app"
    }
  });

  if (!response.ok) {
    throw new Error(`${config.label}: FFXIV Collect API returned ${response.status}.`);
  }

  const raw = await response.json();
  const list = Array.isArray(raw) ? raw : raw.results || raw.data || [];

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`${config.label}: FFXIV Collect API response did not include an item list.`);
  }

  return list.map((entry) => mapCollectionItem(entry, categoryKey)).sort(comparePatchDesc);
}

async function fetchBeastCategory() {
  const response = await fetch("https://ffxivcollect.com/beasts", {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ja",
      "User-Agent": "FF14 Collection Notebook personal local app"
    }
  });

  if (!response.ok) {
    throw new Error(`魔獣図鑑: FFXIV Collect returned ${response.status}.`);
  }

  const html = await response.text();
  const rows = html.match(/<tr\b[^>]*class="[^"]*\bcollectable\b[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const entries = rows.map((row) => {
    const idMatch = row.match(/href="\/beasts\/(\d+)"/i);
    const nameMatch = row.match(/<a\b[^>]*class="[^"]*\bname\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const imageMatch = row.match(/<img\b[^>]*src="([^"]+)"/i);
    const sourceMatch = row.match(/<td\b[^>]*class="[^"]*\bhide-xs\b[^"]*"[^>]*data-value="([^"]*)"/i);
    const patchMatch = row.match(/<td\b[^>]*class="[^"]*\btext-center\b[^"]*"[^>]*data-value="[\d.]+"[^>]*>\s*(\d+(?:\.\d+)?)\s*<\/td>/i);
    const ownedMatch = row.match(/title="[^"]*characters?"[^>]*>\s*([\d.]+%)\s*<\/span>/i);
    const externalId = Number.parseInt(idMatch?.[1] || "", 10);

    if (!externalId || !nameMatch) return null;
    return {
      id: externalId,
      name: stripTags(nameMatch[1]),
      image: decodeHtml(imageMatch?.[1] || ""),
      icon: decodeHtml(imageMatch?.[1] || ""),
      source: decodeHtml(sourceMatch?.[1] || "入手方法未確認").replace(/^Beastmaster\s+/i, ""),
      owned: ownedMatch?.[1] || null,
      patch: patchMatch?.[1] || "7.56",
      number: externalId,
      link: `https://ffxivcollect.com/beasts/${externalId}`
    };
  }).filter(Boolean);

  if (entries.length !== 50) {
    throw new Error(`魔獣図鑑: expected 50 entries but found ${entries.length}.`);
  }

  return entries.map((entry) => mapCollectionItem(entry, "beast")).sort((a, b) =>
    Number(a.externalIds.ffxivCollect) - Number(b.externalIds.ffxivCollect)
  );
}

async function refreshCollectionCatalog() {
  let currentCatalog = seedCatalog;
  try {
    currentCatalog = await readJson(catalogPath);
  } catch {
    currentCatalog = seedCatalog;
  }

  const groups = await Promise.all(Object.keys(collectionCategories).map(async (categoryKey) => {
    try {
      return {
        categoryKey,
        items: await fetchCollectionCategory(categoryKey),
        error: null
      };
    } catch (error) {
      return {
        categoryKey,
        items: (currentCatalog.items || []).filter((item) => item.category === categoryKey),
        error: error.message
      };
    }
  }));
  const errors = groups
    .filter((group) => group.error)
    .map((group) => ({ category: group.categoryKey, error: group.error }));
  const items = groups.flatMap((group) => group.items).sort(comparePatchDesc);
  const counts = Object.fromEntries(groups.map((group) => [group.categoryKey, group.items.length]));
  const catalog = {
    schemaVersion: 2,
    catalogVersion: `ffxivcollect-${new Date().toISOString()}`,
    categories: Object.fromEntries(
      Object.entries(collectionCategories).map(([key, config]) => [key, { label: config.label, count: counts[key] || 0 }])
    ),
    counts,
    updatedAt: new Date().toISOString(),
    source: {
      name: "FFXIV Collect API",
      url: "https://ffxivcollect.com/api/",
      note: errors.length
        ? "Refreshed locally by FF14 Collection Notebook. Failed categories kept their previous data."
        : "Refreshed locally by FF14 Collection Notebook with Japanese localized collection data."
    },
    legal: seedCatalog.legal,
    refreshErrors: errors,
    items
  };

  await atomicWriteJson(catalogPath, catalog, { backup: true });
  return catalog;
}

function comparePatchDesc(a, b) {
  return patchNumber(b.patch) - patchNumber(a.patch) || itemDisplayName(a).localeCompare(itemDisplayName(b), "ja");
}

function patchNumber(patch) {
  const match = String(patch || "0").match(/\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : 0;
}

function parseCharacterId(value) {
  const text = String(value || "").trim();
  const match = text.match(/(?:character\/)?(\d{6,})(?:\/|$)/);
  return match ? match[1] : null;
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

async function fetchText(url, attempt = 0) {
  const response = await fetch(url, {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ja",
      "User-Agent": "FF14 Collection Notebook personal local app"
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const lodestoneImportCategories = {
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLodestoneTooltips(html, characterId, config) {
  const totalMatch =
    html.match(new RegExp(`${escapeRegExp(config.totalClass)}[\\s\\S]*?<span>(\\d+)<\\/span>`)) ||
    html.match(/TOTAL\s*<span>(\d+)<\/span>/);
  const tooltipPattern = new RegExp(`data-tooltip_href="([^"]*?/lodestone/character/${characterId}/${config.path}/tooltip/[^"]+)"`, "g");
  const urls = [];
  const seen = new Set();
  let match;

  while ((match = tooltipPattern.exec(html))) {
    const url = new URL(decodeHtml(match[1]), "https://jp.finalfantasyxiv.com").toString();
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return {
    total: totalMatch ? Number.parseInt(totalMatch[1], 10) : urls.length,
    urls
  };
}

function parseLodestoneTooltip(html, url, config) {
  const headerClass = escapeRegExp(config.headerClass);
  const textClass = escapeRegExp(config.textClass);
  const nameMatch = html.match(new RegExp(`<h4[^>]*class="[^"]*${headerClass}[^"]*"[^>]*>([\\s\\S]*?)<\\/h4>`));
  const textMatch = html.match(new RegExp(`<p[^>]*class="[^"]*${textClass}[^"]*"[^>]*>([\\s\\S]*?)<\\/p>`));

  return {
    nameJa: stripTags(nameMatch?.[1] || ""),
    descriptionJa: stripTags(textMatch?.[1] || ""),
    url
  };
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
        results[index] = { error: error.message, url: values[index] };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[「」『』\s\-‐‑‒–—―・･'’"“”]/g, "")
    .trim();
}

function itemDisplayName(item) {
  return item.nameJa || item.nameEn || "";
}

async function importLodestoneCollection(characterInput, categoryKey) {
  const config = lodestoneImportCategories[categoryKey];
  if (!config) {
    throw httpError(400, "このカテゴリはLodestone読込に対応していません。");
  }

  const characterId = parseCharacterId(characterInput);
  if (!characterId) {
    throw httpError(400, "LodestoneのキャラクターURL、またはキャラクターIDを入力してください。");
  }

  const pageUrl = `https://jp.finalfantasyxiv.com/lodestone/character/${characterId}/${config.path}/`;
  const html = await fetchText(pageUrl);
  const { total, urls } = extractLodestoneTooltips(html, characterId, config);

  if (urls.length === 0) {
    throw httpError(404, `Lodestoneの${config.label}一覧を読み取れませんでした。キャラクターの公開設定を確認してください。`);
  }

  const tooltips = (await mapLimit(urls, 5, async (url) => parseLodestoneTooltip(await fetchText(url), url, config)))
    .filter((entry) => entry && entry.nameJa);

  const catalog = await readJson(catalogPath);
  const progress = await readJson(progressPath);
  const byName = new Map();

  for (const item of catalog.items || []) {
    if (item.category !== categoryKey) {
      continue;
    }
    byName.set(normalizeName(item.nameJa), item);
    byName.set(normalizeName(item.nameEn), item);
    byName.set(normalizeName(itemDisplayName(item)), item);
  }

  const unmatched = [];
  const matched = [];

  for (const owned of tooltips) {
    const item = byName.get(normalizeName(owned.nameJa));
    if (!item) {
      unmatched.push(owned.nameJa);
      continue;
    }

    progress.items[item.id] = {
      owned: true,
      wanted: false,
      priority: progress.items[item.id]?.priority || "none",
      notes: progress.items[item.id]?.notes || "",
      updatedAt: new Date().toISOString()
    };

    if (!item.nameJa) {
      item.nameJa = owned.nameJa;
    }
    if (!item.descriptionJa && owned.descriptionJa) {
      item.descriptionJa = owned.descriptionJa;
    }
    matched.push(item.id);
  }

  progress.schemaVersion = 1;
  progress.updatedAt = new Date().toISOString();
  const importSummary = {
    characterId,
    url: pageUrl,
    importedAt: new Date().toISOString(),
    total,
    tooltipCount: tooltips.length,
    matched: matched.length,
    unmatched: unmatched.slice(0, 50)
  };
  progress.lodestone = {
    ...(progress.lodestone && typeof progress.lodestone === "object" ? progress.lodestone : {}),
    [categoryKey]: importSummary,
    lastCategory: categoryKey,
    lastImportedAt: importSummary.importedAt
  };

  catalog.updatedAt = new Date().toISOString();
  catalog.source = {
    ...(catalog.source || {}),
    note: "Japanese catalog with Lodestone-owned collections imported locally."
  };

  await atomicWriteJson(progressPath, progress, { backup: true });
  await atomicWriteJson(catalogPath, catalog, { backup: true });

  return {
    characterId,
    category: categoryKey,
    categoryLabel: config.label,
    total,
    read: tooltips.length,
    matched: matched.length,
    unmatched: unmatched.length,
    unmatchedNames: unmatched.slice(0, 20),
    progress
  };
}

async function importLodestoneMinions(characterInput) {
  return importLodestoneCollection(characterInput, "minion");
}

async function importLodestoneMounts(characterInput) {
  return importLodestoneCollection(characterInput, "mount");
}

async function handleApi(req, res, url) {
  const requestError = validateApiRequest(req);
  if (requestError) {
    jsonResponse(res, 403, { error: requestError });
    return true;
  }

  await ensureDataFiles();

  if (req.method === "GET" && url.pathname === "/api/catalog") {
    jsonResponse(res, 200, await readJson(catalogPath));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/progress") {
    jsonResponse(res, 200, await readProgress());
    return true;
  }

  if (req.method === "PUT" && url.pathname === "/api/progress") {
    const parsed = await readJsonBody(req);
    const validationError = progressPayloadError(parsed);
    if (validationError) {
      jsonResponse(res, 400, { error: validationError });
      return true;
    }

    const { progress } = pruneProgressPayload(parsed);
    progress.schemaVersion = 1;
    progress.updatedAt = new Date().toISOString();
    await writeProgressQueued(progress, { backup: true });
    jsonResponse(res, 200, { ok: true, progress });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/settings") {
    jsonResponse(res, 200, await readJson(settingsPath));
    return true;
  }

  if (req.method === "PUT" && url.pathname === "/api/settings") {
    const settings = normalizeSettingsPayload(await readJsonBody(req));
    await atomicWriteJson(settingsPath, settings, { backup: true });
    jsonResponse(res, 200, { ok: true, settings });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/catalog/refresh") {
    try {
      const catalog = await refreshCollectionCatalog();
      jsonResponse(res, 200, { ok: true, count: catalog.items.length, counts: catalog.counts || {}, catalog });
    } catch (error) {
      jsonResponse(res, 502, { ok: false, error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/lodestone/minions/import") {
    try {
      const payload = await readJsonBody(req);
      const result = await importLodestoneMinions(payload.character || payload.url || payload.characterId || "");
      jsonResponse(res, 200, { ok: true, ...result });
    } catch (error) {
      jsonResponse(res, error.status || 502, { ok: false, error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/lodestone/mounts/import") {
    try {
      const payload = await readJsonBody(req);
      const result = await importLodestoneMounts(payload.character || payload.url || payload.characterId || "");
      jsonResponse(res, 200, { ok: true, ...result });
    } catch (error) {
      jsonResponse(res, error.status || 502, { ok: false, error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/progress/import") {
    const parsed = await readJsonBody(req);
    const validationError = progressPayloadError(parsed);
    if (validationError) {
      jsonResponse(res, 400, { error: validationError });
      return true;
    }

    const { progress: imported } = pruneProgressPayload(parsed);
    imported.schemaVersion = 1;
    imported.updatedAt = new Date().toISOString();
    await writeProgressQueued(imported, { backup: true, backupMinIntervalMs: 0 });
    jsonResponse(res, 200, { ok: true, progress: imported });
    return true;
  }

  return false;
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = path.resolve(publicDir, `.${pathname}`);
  if (!isPathInside(publicDir, filePath)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": [".html", ".js", ".css"].includes(ext) ? "no-store" : "max-age=300"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml; charset=utf-8"
  }[ext] || "application/octet-stream";
}

function isPathInside(parentDir, targetPath) {
  const relative = path.relative(parentDir, targetPath);
  return relative === "" || Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

async function requestHandler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (!handled) {
        jsonResponse(res, 404, { error: "Unknown API endpoint." });
      }
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    jsonResponse(res, error.status || 500, { error: error.message });
  }
}

function listenWithFallback(server, port, attempts = 12) {
  return new Promise((resolve, reject) => {
    const tryListen = (candidate, remaining) => {
      const onError = (error) => {
        server.off("listening", onListening);
        if (error.code === "EADDRINUSE" && remaining > 0) {
          tryListen(candidate + 1, remaining - 1);
          return;
        }
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve(candidate);
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(candidate, "127.0.0.1");
    };

    tryListen(port, attempts);
  });
}

function cleanupRuntimeFile() {
  try {
    if (!fssync.existsSync(runtimePath)) {
      return;
    }
    const runtime = JSON.parse(fssync.readFileSync(runtimePath, "utf8"));
    if (runtime.pid === process.pid) {
      fssync.unlinkSync(runtimePath);
    }
  } catch {
    // Best-effort cleanup only.
  }
}

async function main() {
  await ensureDataFiles();
  const server = http.createServer(requestHandler);
  const requestedPort = Number.parseInt(process.env.PORT || "4173", 10);
  const port = await listenWithFallback(server, requestedPort);
  const runtime = {
    name: "FF14 Collection Notebook",
    url: `http://127.0.0.1:${port}`,
    port,
    pid: process.pid,
    startedAt: new Date().toISOString()
  };
  await atomicWriteJson(runtimePath, runtime);
  process.once("exit", cleanupRuntimeFile);
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      cleanupRuntimeFile();
      process.exit(0);
    });
  }
  console.log(`FF14 Collection Notebook is running at ${runtime.url}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
