const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");

function loadResetProgressCategories() {
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
      "\nglobalThis.resetProgressCategoriesForTest = resetProgressCategories;",
    context
  );
  return context.resetProgressCategoriesForTest;
}

test("category reset removes only selected category data and import history", () => {
  const resetProgressCategories = loadResetProgressCategories();
  const progress = {
    schemaVersion: 1,
    updatedAt: "2026-09-10T00:00:00.000Z",
    items: {
      "mount-1": { owned: true, wanted: false, priority: "none", notes: "", updatedAt: null },
      "mount-retired": { owned: false, wanted: true, priority: "high", notes: "legacy", updatedAt: null },
      "minion-1": { owned: true, wanted: false, priority: "none", notes: "keep", updatedAt: null }
    },
    lodestone: {
      mount: { importedAt: "2026-09-10T00:00:00.000Z" },
      minion: { importedAt: "2026-09-10T00:00:00.000Z" }
    },
    screenshot: { category: "mount", importedAt: "2026-09-10T00:00:00.000Z", matched: 1 }
  };
  const original = structuredClone(progress);

  const result = resetProgressCategories(progress, ["mount"], [
    { id: "mount-1", category: "mount" },
    { id: "minion-1", category: "minion" }
  ]);

  assert.equal(result.removedItems, 2);
  assert.deepEqual(Object.keys(result.progress.items), ["minion-1"]);
  assert.deepEqual(Object.keys(result.progress.lodestone), ["minion"]);
  assert.equal("screenshot" in result.progress, false);
  assert.deepEqual(progress, original);
});

test("category reset ignores unsupported category values", () => {
  const resetProgressCategories = loadResetProgressCategories();
  const progress = {
    schemaVersion: 1,
    updatedAt: null,
    items: {
      "minion-1": { owned: true, wanted: false, priority: "none", notes: "", updatedAt: null }
    }
  };

  const result = resetProgressCategories(progress, ["unknown"], [
    { id: "minion-1", category: "minion" }
  ]);

  assert.equal(result.removedItems, 0);
  assert.deepEqual(Object.keys(result.progress.items), ["minion-1"]);
});
