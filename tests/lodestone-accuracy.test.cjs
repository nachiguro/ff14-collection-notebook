const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "catalog.json"), "utf8"));

function loadReviewApi() {
  const context = vm.createContext({
    console,
    URL,
    URLSearchParams,
    Intl,
    Date,
    Map,
    Set,
    setTimeout,
    clearTimeout,
    document: { querySelector: () => ({}), querySelectorAll: () => [] }
  });
  vm.runInContext(
    source.replace(/init\(\);\s*$/, "") +
      "\nglobalThis.review = { state, normalizeOcrText, findLodestoneSnapshotCandidates, enrichLodestoneSnapshot };",
    context
  );
  context.review.state.catalog = catalog;
  context.review.state.progress = { items: {} };
  return { context, api: context.review };
}

test("exact identity is resolved against the full catalog before owned items are removed", () => {
  const { api } = loadReviewApi();
  const cases = [
    ["アイスゴーレム", "beast-47", "beast-23"],
    ["コブラン", "beast-7", "beast-42"],
    ["メガロクラブ", "beast-9", "beast-15"]
  ];

  for (const [name, ownedId, incorrectId] of cases) {
    api.state.progress = { items: { [ownedId]: { owned: true } } };
    const candidates = api.findLodestoneSnapshotCandidates({ entries: [{ text: name, status: "owned" }] }, "beast");
    assert.deepEqual(Array.from(candidates, ({ item }) => item.id), []);
    assert.equal(candidates.some(({ item }) => item.id === incorrectId), false);
  }
});

test("ownership and identifier conflicts are never auto-selected", () => {
  const { api } = loadReviewApi();
  const first = catalog.items.find((item) => item.category === "minion");
  const second = catalog.items.find((item) => item.category === "minion" && item.id !== first.id);

  const statusConflict = api.findLodestoneSnapshotCandidates({
    entries: [
      { text: first.nameJa, status: "owned", ownershipEvidence: "owned-marker" },
      { text: first.nameJa, status: "missing", ownershipEvidence: "missing-marker" }
    ]
  }, "minion");
  assert.equal(statusConflict.length, 1);
  assert.equal(statusConflict[0].status, "conflict");
  assert.equal(statusConflict[0].autoSelected, false);

  const idConflict = api.findLodestoneSnapshotCandidates({
    entries: [{
      text: first.nameJa,
      status: "owned",
      ownershipEvidence: "ffxiv-collect-api",
      externalId: first.externalIds.ffxivCollect,
      itemId: second.id
    }]
  }, "minion");
  assert.equal(idConflict.length, 0);
  assert.equal(idConflict.metrics.conflictCount, 1);
});

test("Lodestone names require an exact match and never expand a short menu label", () => {
  const { api } = loadReviewApi();
  const candidates = api.findLodestoneSnapshotCandidates({
    entries: [{ text: "ゴールドソーサー", status: "unknown", ownershipEvidence: "none" }]
  }, "orchestrion");

  assert.equal(candidates.length, 0);
  assert.equal(candidates.some(({ item }) => item.id === "orchestrion-856"), false);
  assert.equal(candidates.metrics.unmatchedCount, 1);
  assert.equal("partialMatchCount" in candidates.metrics, false);
});

test("structured and legacy Orchestrion rows resolve by their exact item name", () => {
  const { api } = loadReviewApi();
  const cases = [
    ["orchestrion-131", { name: "砂塵", text: "049 砂塵 049砂塵 オーケストリオン譜 入手方法 ゴールドソーサー 入手アイテム オーケストリオン譜:砂塵" }],
    ["orchestrion-747", { text: "061 轟 061轟 オーケストリオン譜 入手方法 イディルシャイアにて交換 入手アイテム オーケストリオン譜:轟" }],
    ["orchestrion-825", { text: "--- 最高のケーキを作るクポ ～ヴァレンティオンパティスリー～ ---最高のケーキを作るクポ ～ヴァレンティオンパティスリー～ オーケストリオン譜 入手方法 シーズナルイベント報酬 入手アイテム オーケストリオン譜:最高のケーキを作るクポ" }]
  ];

  for (const [expectedId, value] of cases) {
    const entry = { ...value, status: "owned", ownershipEvidence: "owned-marker" };
    const candidates = api.findLodestoneSnapshotCandidates({ entries: [entry] }, "orchestrion");
    assert.deepEqual(Array.from(candidates, ({ item }) => item.id), [expectedId]);
    assert.equal(candidates[0].matchKind, "exact-name");
  }
});

test("legacy unacquired classes override the old substring ownership error", () => {
  const { api } = loadReviewApi();
  const candidates = api.findLodestoneSnapshotCandidates({
    entries: [{
      name: "砂塵",
      text: "砂塵",
      className: "entry unacquired",
      status: "owned",
      ownershipEvidence: "owned-marker"
    }]
  }, "orchestrion");

  assert.equal(candidates.length, 0);
});

test("API evidence is appended without replacing the original snapshot", async () => {
  const { context, api } = loadReviewApi();
  const minion = catalog.items.find((item) => item.category === "minion");
  vm.runInContext(
    "fetchOwnedCollectionByCharacter = async (characterId, endpoint, categoryKey) => " +
      "({ characterId, categoryKey, ownedItems: [], source: 'review-empty-api', completeness: 'complete', fetchedAt: new Date().toISOString() });",
    context
  );

  const original = { categoryHint: "minion", entries: [{ text: minion.nameJa, status: "owned" }] };
  const enriched = await api.enrichLodestoneSnapshot({ characterId: "12345", capturedAt: "2026-09-10T00:00:00.000Z", collections: [original] });

  assert.equal(enriched.collections[0].entries.length, 1);
  assert.equal(enriched.originalCollections[0].entries.length, 1);
  assert.ok(enriched.collections.some((collection) => collection !== enriched.collections[0] && collection.categoryHint === "minion" && collection.entries.length === 0));
  assert.ok(enriched.comparisons.some((comparison) => comparison.categoryHint === "minion" && comparison.apiEmptyWithOriginalEvidence));
});
