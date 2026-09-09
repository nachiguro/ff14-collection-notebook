const state = {
  catalog: null,
  progress: null,
  settings: null,
  category: "minion",
  status: "all",
  sourceType: "all",
  version: "all",
  search: "",
  sort: "patch-desc",
  layout: "grid",
  storageMode: "server",
  config: null,
  selectedId: null,
  detailVisible: true,
  detailReturnFocusId: null,
  saveTimer: null,
  pendingSaveToast: false,
  progressRevision: 0,
  savedProgressRevision: 0,
  saveInFlight: null,
  saveError: null,
  lodestoneImportRunning: false,
  lodestoneImportId: 0,
  searchTimer: null,
  screenshotImportRunning: false,
  screenshotCandidates: [],
  screenshotOcrFileIndex: 0,
  screenshotOcrFileCount: 1,
  lodestoneSnapshot: null,
  lodestoneSnapshotCategory: null,
  lodestoneSnapshotCandidates: []
};

let tesseractLoadPromise = null;

const elements = {
  refreshCatalog: document.querySelector("#refreshCatalog"),
  exportProgress: document.querySelector("#exportProgress"),
  importProgress: document.querySelector("#importProgress"),
  restoreProgressImport: document.querySelector("#restoreProgressImport"),
  saveStatus: document.querySelector("#saveStatus"),
  openLodestoneTool: document.querySelector("#openLodestoneTool"),
  lodestoneToolDialog: document.querySelector("#lodestoneToolDialog"),
  closeLodestoneTool: document.querySelector("#closeLodestoneTool"),
  cancelLodestoneTool: document.querySelector("#cancelLodestoneTool"),
  lodestoneBookmarkletLink: document.querySelector("#lodestoneBookmarkletLink"),
  copyLodestoneBookmarklet: document.querySelector("#copyLodestoneBookmarklet"),
  downloadLodestoneBookmarklet: document.querySelector("#downloadLodestoneBookmarklet"),
  lodestoneSnapshotCategory: document.querySelector("#lodestoneSnapshotCategory"),
  lodestoneSnapshotFile: document.querySelector("#lodestoneSnapshotFile"),
  lodestoneSnapshotStatus: document.querySelector("#lodestoneSnapshotStatus"),
  lodestoneSnapshotCandidates: document.querySelector("#lodestoneSnapshotCandidates"),
  lodestoneSnapshotSummary: document.querySelector("#lodestoneSnapshotSummary"),
  lodestoneSnapshotCandidateList: document.querySelector("#lodestoneSnapshotCandidateList"),
  selectAllLodestoneCandidates: document.querySelector("#selectAllLodestoneCandidates"),
  clearLodestoneCandidates: document.querySelector("#clearLodestoneCandidates"),
  applyLodestoneSnapshot: document.querySelector("#applyLodestoneSnapshot"),
  openScreenshotImport: document.querySelector("#openScreenshotImport"),
  screenshotImportDialog: document.querySelector("#screenshotImportDialog"),
  screenshotImportTitle: document.querySelector("#screenshotImportTitle"),
  closeScreenshotImport: document.querySelector("#closeScreenshotImport"),
  cancelScreenshotImport: document.querySelector("#cancelScreenshotImport"),
  screenshotFiles: document.querySelector("#screenshotFiles"),
  screenshotFileLabel: document.querySelector("#screenshotFileLabel"),
  screenshotOwnedOnly: document.querySelector("#screenshotOwnedOnly"),
  screenshotImportStatus: document.querySelector("#screenshotImportStatus"),
  screenshotImportProgress: document.querySelector("#screenshotImportProgress"),
  screenshotCandidates: document.querySelector("#screenshotCandidates"),
  screenshotCandidateSummary: document.querySelector("#screenshotCandidateSummary"),
  screenshotCandidateList: document.querySelector("#screenshotCandidateList"),
  selectAllScreenshotCandidates: document.querySelector("#selectAllScreenshotCandidates"),
  clearScreenshotCandidates: document.querySelector("#clearScreenshotCandidates"),
  analyzeScreenshots: document.querySelector("#analyzeScreenshots"),
  applyScreenshotImport: document.querySelector("#applyScreenshotImport"),
  lodestoneInput: document.querySelector("#lodestoneInput"),
  importLodestone: document.querySelector("#importLodestone"),
  categoryTitle: document.querySelector("#categoryTitle"),
  categoryButtons: document.querySelectorAll(".category-button"),
  searchInput: document.querySelector("#searchInput"),
  sourceFilter: document.querySelector("#sourceFilter"),
  versionFilter: document.querySelector("#versionFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  viewButtons: document.querySelectorAll(".view-button"),
  contentGrid: document.querySelector(".content-grid"),
  detailPanel: document.querySelector(".detail-panel"),
  detailClose: document.querySelector("#detailClose"),
  minionGrid: document.querySelector("#minionGrid"),
  resultMeta: document.querySelector("#resultMeta"),
  detailContent: document.querySelector("#detailContent"),
  completionRate: document.querySelector("#completionRate"),
  completionCount: document.querySelector("#completionCount"),
  wantedCount: document.querySelector("#wantedCount"),
  highPriorityCount: document.querySelector("#highPriorityCount"),
  latestPatch: document.querySelector("#latestPatch"),
  catalogUpdated: document.querySelector("#catalogUpdated"),
  toast: document.querySelector("#toast")
};

const categoryLabels = {
  mount: "マウント",
  minion: "ミニオン",
  orchestrion: "オーケストリオン譜",
  card: "トリプルトライアドカード",
  emote: "エモート",
  spell: "青魔法",
  hairstyle: "髪型",
  fashion: "傘/ファッションアクセサリー",
  beast: "魔獣図鑑"
};

const lodestoneCategories = {
  mount: "mounts",
  minion: "minions",
  emote: "emotes"
};

const lodestoneProxyTooltipBatchSize = 20;
const tesseractScriptUrl = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

const storageKeys = {
  progress: "ff14CollectionNotebook.progress.v1",
  settings: "ff14CollectionNotebook.settings.v1",
  progressImportBackup: "ff14CollectionNotebook.progressImportBackup.v1",
  progressRecovery: "ff14CollectionNotebook.progressRecovery.v1"
};

const defaultProgress = {
  schemaVersion: 1,
  updatedAt: null,
  items: {}
};

const defaultSettings = {
  schemaVersion: 1,
  theme: "nocturne",
  density: "comfortable",
  defaultSort: "patch-desc"
};

const defaultAppConfig = {
  lodestoneProxyUrl: ""
};

const numberedSortCategories = new Set(["orchestrion", "card", "beast"]);
const japaneseCollator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

const orchestrionCategoryOrder = [
  "フィールド1",
  "フィールド2",
  "ダンジョン1",
  "ダンジョン2",
  "討伐・討滅戦",
  "レイド1",
  "レイド2",
  "環境音",
  "クエスト関連",
  "その他",
  "シーズナル"
];

const orchestrionCategoryRanks = new Map(orchestrionCategoryOrder.map((category, index) => [category, index]));

const statusLabels = {
  all: "すべて",
  missing: "未取得",
  owned: "取得済み",
  wanted: "欲しい"
};

const priorityLabels = {
  none: "なし",
  low: "低",
  medium: "中",
  high: "高"
};

const sourceLabels = {
  achievement: "アチーブメント",
  "collector-edition": "CE/予約",
  "cosmic-exploration": "コスモエクスプローラー",
  crafting: "製作",
  currency: "交換",
  "deep-dungeon": "ディープダンジョン",
  dungeon: "ダンジョン",
  event: "イベント",
  fate: "FATE",
  gathering: "採集",
  "gold-saucer": "ゴールドソーサー",
  "island-sanctuary": "無人島",
  other: "その他",
  premium: "オンラインストア",
  purchase: "購入",
  pvp: "PvP",
  quest: "クエスト",
  raid: "レイド",
  treasure: "宝物庫",
  "treasure-hunt": "宝物庫",
  tribal: "友好部族",
  trial: "討滅戦",
  unknown: "未確認",
  venture: "リテイナー",
  voyages: "探索任務"
};

function init() {
  bindEvents();
  prepareLodestoneBookmarklet();
  loadData();
}

function bindEvents() {
  elements.categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      state.sourceType = "all";
      state.version = "all";
      state.selectedId = null;
      state.detailVisible = !isCompactDetail();
      syncCategoryButtons();
      populateSourceFilter();
      populateVersionFilter();
      syncSortOptions();
      syncLodestoneAvailability();
      selectFirstItem();
      render();
    });
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.status = button.dataset.status;
      syncSegments();
      render();
    });
  });

  elements.searchInput.addEventListener("input", (event) => {
    clearTimeout(state.searchTimer);
    const nextSearch = normalizeSearchText(event.target.value);
    state.searchTimer = setTimeout(() => {
      state.search = nextSearch;
      render();
    }, 180);
  });

  elements.sourceFilter.addEventListener("change", (event) => {
    state.sourceType = event.target.value;
    render();
  });

  elements.versionFilter.addEventListener("change", (event) => {
    state.version = event.target.value;
    render();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });

  elements.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.layout = button.dataset.layout;
      syncViewButtons();
      renderGrid(filteredItems());
    });
  });

  elements.refreshCatalog.addEventListener("click", refreshCatalog);
  elements.detailClose.addEventListener("click", () => {
    closeDetailPanel(true);
  });
  elements.importLodestone.addEventListener("click", importLodestone);
  elements.lodestoneInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      importLodestone();
    }
  });
  elements.exportProgress.addEventListener("click", exportProgress);
  elements.importProgress.addEventListener("change", importProgress);
  elements.restoreProgressImport.addEventListener("click", restoreProgressImport);
  elements.openLodestoneTool.addEventListener("click", openLodestoneTool);
  elements.closeLodestoneTool.addEventListener("click", closeLodestoneTool);
  elements.cancelLodestoneTool.addEventListener("click", closeLodestoneTool);
  elements.lodestoneBookmarkletLink.addEventListener("click", (event) => {
    event.preventDefault();
    showToast("リンクをブックマークバーへドラッグしてください");
  });
  elements.copyLodestoneBookmarklet.addEventListener("click", copyLodestoneBookmarklet);
  elements.downloadLodestoneBookmarklet.addEventListener("click", downloadLodestoneBookmarklet);
  elements.lodestoneSnapshotFile.addEventListener("change", importLodestoneSnapshotFile);
  elements.lodestoneSnapshotCategory.addEventListener("change", analyzeLodestoneSnapshot);
  elements.selectAllLodestoneCandidates.addEventListener("click", () => setAllLodestoneCandidates(true));
  elements.clearLodestoneCandidates.addEventListener("click", () => setAllLodestoneCandidates(false));
  elements.lodestoneSnapshotCandidateList.addEventListener("change", syncLodestoneSnapshotSummary);
  elements.applyLodestoneSnapshot.addEventListener("click", applyLodestoneSnapshot);
  elements.lodestoneToolDialog.addEventListener("close", resetLodestoneTool);
  elements.openScreenshotImport.addEventListener("click", openScreenshotImport);
  elements.closeScreenshotImport.addEventListener("click", closeScreenshotImport);
  elements.cancelScreenshotImport.addEventListener("click", closeScreenshotImport);
  elements.screenshotFiles.addEventListener("change", handleScreenshotFilesChanged);
  elements.screenshotOwnedOnly.addEventListener("change", syncScreenshotImportControls);
  elements.analyzeScreenshots.addEventListener("click", analyzeScreenshots);
  elements.applyScreenshotImport.addEventListener("click", applyScreenshotImport);
  elements.selectAllScreenshotCandidates.addEventListener("click", () => setAllScreenshotCandidates(true));
  elements.clearScreenshotCandidates.addEventListener("click", () => setAllScreenshotCandidates(false));
  elements.screenshotCandidateList.addEventListener("change", syncScreenshotCandidateSummary);
  elements.screenshotImportDialog.addEventListener("close", resetScreenshotImport);
  elements.screenshotImportDialog.addEventListener("cancel", (event) => {
    if (state.screenshotImportRunning) event.preventDefault();
  });
  elements.minionGrid.addEventListener("click", handleGridClick);
  elements.minionGrid.addEventListener("error", handleCollectionImageError, true);
  elements.detailContent.addEventListener("error", handleCollectionImageError, true);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushSave(false, false, true);
    }
  });
  window.addEventListener("pagehide", () => {
    flushSave(false, false, true);
  });
  window.addEventListener("online", () => {
    if (hasUnsavedProgress()) flushSave(false);
  });
  window.addEventListener("resize", () => {
    if (!isCompactDetail() && state.selectedId) state.detailVisible = true;
    syncDetailPanel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isCompactDetail() && state.detailVisible) {
      event.preventDefault();
      closeDetailPanel(true);
    }
  });
}

async function loadData() {
  try {
    const { catalog, progress, settings, storageMode, config } = await loadAppData();

    state.catalog = catalog;
    state.progress = normalizeProgress(progress);
    state.settings = settings;
    state.storageMode = storageMode;
    state.config = { ...defaultAppConfig, ...(config || {}) };
    elements.refreshCatalog.hidden = storageMode === "browser";
    state.sort = settings.defaultSort || "patch-desc";
    state.detailVisible = !isCompactDetail();
    const recovered = loadNewerProgressRecovery(state.progress);
    if (recovered) state.progress = recovered;
    state.progressRevision = recovered ? 1 : 0;
    state.savedProgressRevision = 0;
    state.saveError = recovered ? "前回の未保存データを復元しました" : null;
    syncSaveStatus();
    syncRestoreProgressAvailability();
    syncCategoryButtons();
    populateSourceFilter();
    populateVersionFilter();
    syncSortOptions();
    syncLodestoneAvailability();
    selectFirstItem();
    render();
    if (recovered) {
      showToast("前回の未保存データを復元しました");
      state.saveTimer = setTimeout(() => flushSave(false), 500);
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function loadAppData() {
  const config = await loadAppConfig();

  if (shouldTryServerApi()) {
    try {
      const [catalog, progress, settings] = await Promise.all([
        fetchJson("/api/catalog"),
        fetchJson("/api/progress"),
        fetchJson("/api/settings")
      ]);
      return { catalog, progress, settings, storageMode: "server", config };
    } catch (error) {
      console.warn(`Server API unavailable, using browser storage: ${error.message}`);
    }
  }

  const catalog = await fetchJson("data/catalog.json", { cache: "no-store" });
  return {
    catalog,
    progress: loadStoredJson(storageKeys.progress, defaultProgress),
    settings: loadStoredJson(storageKeys.settings, defaultSettings),
    storageMode: "browser",
    config
  };
}

async function loadAppConfig() {
  const config = { ...defaultAppConfig };

  try {
    const response = await fetch("data/app-config.json", { cache: "no-store" });
    if (response.ok) {
      const loaded = await response.json();
      Object.assign(config, loaded || {});
    } else if (response.status !== 404) {
      console.warn(`App config unavailable: ${response.status}`);
    }
  } catch (error) {
    console.warn(`App config unavailable: ${error.message}`);
  }

  const urlParams = new URLSearchParams(location.search);
  const overrideUrl =
    urlParams.get("lodestoneProxyUrl") ||
    localStorage.getItem("ff14CollectionNotebook.lodestoneProxyUrl");
  if (overrideUrl) {
    config.lodestoneProxyUrl = overrideUrl;
  }

  config.lodestoneProxyUrl = String(config.lodestoneProxyUrl || "").trim().replace(/\/+$/, "");
  return config;
}

function shouldTryServerApi() {
  return location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed: ${response.status}`;
    try {
      const payload = JSON.parse(text);
      message = payload.error || payload.message || message;
    } catch {
      // Keep the original response text when the server did not return JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

function loadStoredJson(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : cloneJson(fallback);
  } catch {
    return cloneJson(fallback);
  }
}

function saveStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadNewerProgressRecovery(persistedProgress) {
  try {
    const recovery = JSON.parse(localStorage.getItem(storageKeys.progressRecovery) || "null");
    if (!isPlainObject(recovery) || !recovery.savedAt || !recovery.progress) return null;
    const persistedAt = Date.parse(persistedProgress?.updatedAt || "") || 0;
    const recoveryAt = Date.parse(recovery.savedAt) || 0;
    return recoveryAt > persistedAt ? validateProgressPayload(recovery.progress) : null;
  } catch {
    return null;
  }
}

function normalizeProgress(progress) {
  const normalized = {
    schemaVersion: 1,
    updatedAt: progress?.updatedAt || null,
    items: {}
  };

  if (progress?.items && typeof progress.items === "object") {
    Object.entries(progress.items).forEach(([itemId, itemProgress]) => {
      const normalizedItem = normalizeProgressItem(itemProgress);
      if (!isDefaultProgressItem(normalizedItem)) {
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

  return normalized;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateProgressPayload(payload) {
  if (!isPlainObject(payload)) {
    throw new Error("進捗JSONのルートはオブジェクトである必要があります");
  }
  if (payload.schemaVersion !== undefined && payload.schemaVersion !== 1) {
    throw new Error(`未対応の進捗バージョンです: ${String(payload.schemaVersion)}`);
  }
  if (!isPlainObject(payload.items)) {
    throw new Error("進捗JSONに正しいitemsオブジェクトがありません");
  }

  for (const [itemId, item] of Object.entries(payload.items)) {
    if (!itemId || !isPlainObject(item)) {
      throw new Error(`items.${itemId || "(空のID)"} が正しい進捗ではありません`);
    }
    if (item.owned !== undefined && typeof item.owned !== "boolean") {
      throw new Error(`items.${itemId}.owned は真偽値である必要があります`);
    }
    if (item.wanted !== undefined && typeof item.wanted !== "boolean") {
      throw new Error(`items.${itemId}.wanted は真偽値である必要があります`);
    }
    if (item.priority !== undefined && !Object.hasOwn(priorityLabels, item.priority)) {
      throw new Error(`items.${itemId}.priority の値が不正です`);
    }
    if (item.notes !== undefined && typeof item.notes !== "string") {
      throw new Error(`items.${itemId}.notes は文字列である必要があります`);
    }
    if (item.updatedAt !== undefined && item.updatedAt !== null && typeof item.updatedAt !== "string") {
      throw new Error(`items.${itemId}.updatedAt は文字列またはnullである必要があります`);
    }
  }
  if (payload.lodestone !== undefined && !isPlainObject(payload.lodestone)) {
    throw new Error("lodestone はオブジェクトである必要があります");
  }
  if (payload.screenshot !== undefined && !isPlainObject(payload.screenshot)) {
    throw new Error("screenshot はオブジェクトである必要があります");
  }

  return normalizeProgress(payload);
}

function progressSummary(progress) {
  const items = Object.values(progress.items || {});
  return {
    entries: items.length,
    owned: items.filter((item) => item.owned).length,
    wanted: items.filter((item) => item.wanted).length,
    notes: items.filter((item) => item.notes).length
  };
}

function createDefaultProgressItem() {
  return {
    owned: false,
    wanted: false,
    priority: "none",
    notes: "",
    updatedAt: null
  };
}

function normalizeProgressItem(progress) {
  const normalized = createDefaultProgressItem();
  if (!progress || typeof progress !== "object") {
    return normalized;
  }

  normalized.owned = progress.owned === true;
  normalized.wanted = progress.wanted === true;
  normalized.priority = priorityLabels[progress.priority] ? progress.priority : "none";
  normalized.notes = typeof progress.notes === "string" ? progress.notes : "";
  normalized.updatedAt = progress.updatedAt || null;
  return normalized;
}

function isDefaultProgressItem(progress) {
  return !progress.owned &&
    !progress.wanted &&
    (!progress.priority || progress.priority === "none") &&
    !progress.notes;
}

function populateSourceFilter() {
  const types = Array.from(new Set(categoryItems().map((item) => item.sourceType || "other"))).sort();
  elements.sourceFilter.innerHTML = '<option value="all">入手種別: すべて</option>';

  types.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = sourceLabels[type] || type;
    elements.sourceFilter.append(option);
  });
}

function populateVersionFilter() {
  const versions = Array.from(new Set(categoryItems()
    .map((item) => patchMajor(item.patch))
    .filter(Boolean)))
    .sort((a, b) => Number(a) - Number(b));
  const current = state.version;

  elements.versionFilter.innerHTML = '<option value="all">バージョン: すべて</option>';

  versions.forEach((version) => {
    const option = document.createElement("option");
    option.value = version;
    option.textContent = `${version}.X`;
    elements.versionFilter.append(option);
  });

  elements.versionFilter.value = versions.includes(current) ? current : "all";
  state.version = elements.versionFilter.value;
}

function syncSortOptions() {
  const options = [
    ["patch-desc", "パッチ 新しい順"],
    ["name-asc", "名前 A-Z"],
    ["source-asc", "入手種別 A-Z"],
    ["priority-desc", "優先度 高い順"]
  ];

  if (state.category === "orchestrion") {
    options.splice(1, 0, ["orchestrion-category-number-asc", "分類・番号順"], ["number-asc", "番号順"]);
  } else if (numberedSortCategories.has(state.category)) {
    options.splice(1, 0, ["number-asc", "番号順"]);
  }

  elements.sortSelect.innerHTML = options
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
  elements.sortSelect.value = options.some(([value]) => value === state.sort) ? state.sort : "patch-desc";
  state.sort = elements.sortSelect.value;
}

function syncSegments() {
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === state.status);
  });
}

function syncCategoryButtons() {
  elements.categoryButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.category === state.category);
  });
  elements.categoryTitle.textContent = categoryLabel(state.category);
}

function syncLodestoneAvailability() {
  const supportsLodestone = Boolean(lodestoneCategories[state.category]);
  elements.lodestoneInput.disabled = !supportsLodestone || state.lodestoneImportRunning;
  elements.importLodestone.disabled = !supportsLodestone || state.lodestoneImportRunning;
  elements.lodestoneInput.placeholder = supportsLodestone
    ? "Lodestone キャラクターURL / ID"
    : "Lodestone読込はマウント/ミニオン/エモートのみ対応";
}

function syncViewButtons() {
  elements.viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.layout === state.layout);
  });
}

function syncDetailPanel() {
  const compact = isCompactDetail();
  elements.contentGrid.classList.toggle("detail-collapsed", !state.detailVisible);
  elements.detailPanel.classList.toggle("collapsed", !state.detailVisible);
  elements.detailPanel.setAttribute("aria-hidden", String(!state.detailVisible));
  if (compact) {
    elements.detailPanel.setAttribute("role", "dialog");
    elements.detailPanel.setAttribute("aria-modal", "true");
  } else {
    elements.detailPanel.removeAttribute("role");
    elements.detailPanel.removeAttribute("aria-modal");
  }
  document.body.classList.toggle("detail-drawer-open", compact && state.detailVisible);
}

function isCompactDetail() {
  return window.matchMedia("(max-width: 1180px)").matches;
}

function openDetailPanel(itemId) {
  state.selectedId = itemId;
  state.detailReturnFocusId = itemId;
  state.detailVisible = true;
  render();
  if (isCompactDetail()) {
    requestAnimationFrame(() => elements.detailClose.focus({ preventScroll: true }));
  }
}

function closeDetailPanel(restoreFocus = false) {
  const returnId = state.detailReturnFocusId || state.selectedId;
  state.detailVisible = false;
  syncDetailPanel();
  if (restoreFocus && returnId) {
    requestAnimationFrame(() => {
      elements.minionGrid.querySelector(`[data-id="${CSS.escape(returnId)}"] [data-action="select"]`)?.focus({ preventScroll: true });
    });
  }
}

function selectFirstItem() {
  const first = categoryItems()[0];
  state.selectedId = first?.id || null;
}

function getProgress(itemId) {
  return state.progress.items[itemId] || createDefaultProgressItem();
}

function getWritableProgress(itemId) {
  const current = state.progress.items[itemId];
  const progress = current ? normalizeProgressItem(current) : createDefaultProgressItem();
  state.progress.items[itemId] = progress;
  return progress;
}

function pruneProgress(progress) {
  return normalizeProgress(progress);
}

function itemsWithProgress() {
  return categoryItems().map((item) => ({
    ...item,
    progress: getProgress(item.id)
  }));
}

function normalizeSearchText(value) {
  return String(value || "").normalize("NFKC").toLowerCase().trim();
}

function categoryItems() {
  return (state.catalog?.items || []).filter((item) => item.category === state.category);
}

function filteredItems() {
  const query = state.search;

  return itemsWithProgress()
    .filter((item) => {
      if (state.status === "owned" && !item.progress.owned) return false;
      if (state.status === "missing" && item.progress.owned) return false;
      if (state.status === "wanted" && !item.progress.wanted) return false;
      if (state.sourceType !== "all" && item.sourceType !== state.sourceType) return false;
      if (state.version !== "all" && patchMajor(item.patch) !== state.version) return false;
      if (!query) return true;

      return normalizeSearchText([
        item.nameJa,
        item.nameEn,
        item.patch,
        item.sourceType,
        sourceLabels[item.sourceType],
        item.sourceSummaryJa,
        item.sourceSummary,
        item.descriptionJa,
        item.description,
        item.progress.notes
      ].filter(Boolean).join(" ")).includes(query);
    })
    .sort(sorter(state.sort));
}

function sorter(sortKey) {
  if (sortKey === "orchestrion-category-number-asc") {
    return (a, b) =>
      orchestrionCategoryRank(a) - orchestrionCategoryRank(b) ||
      collectionNumber(a) - collectionNumber(b) ||
      compareText(displayName(a), displayName(b));
  }

  if (sortKey === "number-asc") {
    return (a, b) =>
      collectionNumberGroup(a) - collectionNumberGroup(b) ||
      collectionNumber(a) - collectionNumber(b) ||
      compareText(displayName(a), displayName(b));
  }

  if (sortKey === "name-asc") {
    return (a, b) => compareText(displayName(a), displayName(b));
  }

  if (sortKey === "source-asc") {
    return (a, b) => compareText(sourceLabel(a), sourceLabel(b)) || compareText(displayName(a), displayName(b));
  }

  if (sortKey === "priority-desc") {
    const score = { high: 3, medium: 2, low: 1, none: 0 };
    return (a, b) => (score[b.progress.priority] || 0) - (score[a.progress.priority] || 0) || compareText(displayName(a), displayName(b));
  }

  return (a, b) => patchNumber(b.patch) - patchNumber(a.patch) || compareText(displayName(a), displayName(b));
}

function compareText(a, b) {
  return japaneseCollator.compare(String(a || ""), String(b || ""));
}

function orchestrionCategoryRank(item) {
  const category = orchestrionCategory(item);
  return orchestrionCategoryRanks.has(category) ? orchestrionCategoryRanks.get(category) : orchestrionCategoryOrder.length;
}

function orchestrionCategory(item) {
  const meta = item.meta || [];
  const categoryMeta =
    meta.find((entry) => entry.label === "分類" || /^(category|type)$/i.test(String(entry.label || ""))) ||
    (item.category === "orchestrion" ? meta[1] : null);
  return String(categoryMeta?.value || "");
}

function collectionNumber(item) {
  const value = collectionNumberText(item);
  const match = value.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.POSITIVE_INFINITY;
}

function collectionNumberGroup(item) {
  if (item.category !== "card") {
    return 0;
  }

  const value = collectionNumberText(item).trim().toLowerCase();
  if (value.startsWith("no.")) return 0;
  if (value.startsWith("ex.")) return 1;
  return 2;
}

function collectionNumberText(item) {
  const meta = item.meta || [];
  const numberMeta =
    meta.find((entry) => entry.label === "番号" || /^(number|no\.?)$/i.test(String(entry.label || ""))) ||
    (numberedSortCategories.has(item.category) ? meta[0] : null);
  return String(numberMeta?.value || item.number || "");
}

function patchNumber(patch) {
  const match = String(patch || "0").match(/\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : 0;
}

function patchMajor(patch) {
  const match = String(patch || "").match(/^(\d+)/);
  return match ? match[1] : "";
}

function render() {
  if (!state.catalog || !state.progress) return;

  const items = filteredItems();
  if (!items.some((item) => item.id === state.selectedId)) {
    state.selectedId = items[0]?.id || categoryItems()[0]?.id || null;
  }

  syncCategoryButtons();
  syncDetailPanel();
  renderStats();
  renderGrid(items);
  renderDetail();
}

function renderStats() {
  const items = itemsWithProgress();
  const total = items.length;
  const owned = items.filter((item) => item.progress.owned).length;
  const wanted = items.filter((item) => item.progress.wanted).length;
  const high = items.filter((item) => item.progress.priority === "high").length;
  const rate = total ? Math.round((owned / total) * 100) : 0;
  const latest = items.reduce((max, item) => (patchNumber(item.patch) > patchNumber(max) ? item.patch : max), "-");

  elements.completionRate.textContent = `${rate}%`;
  elements.completionCount.textContent = `${owned} / ${total}`;
  elements.wantedCount.textContent = wanted;
  elements.highPriorityCount.textContent = high;
  elements.latestPatch.textContent = latest || "-";
  elements.catalogUpdated.textContent = formatDate(state.catalog.updatedAt);
}

function renderGrid(items) {
  elements.resultMeta.textContent = `${categoryLabel(state.category)} ${items.length}件 ･ ${statusLabels[state.status] || "すべて"}`;
  elements.minionGrid.className = `minion-grid view-${state.layout}`;
  elements.minionGrid.innerHTML = items
    .map((item) => {
      const selected = item.id === state.selectedId ? " selected" : "";
      const owned = item.progress.owned ? " owned" : "";
      const wanted = item.progress.wanted ? " wanted" : "";
      return `
        <article class="minion-card${selected}${owned}${wanted}" data-id="${escapeAttr(item.id)}">
          <button class="card-hit" type="button" data-action="select" aria-label="${escapeAttr(displayName(item))}"></button>
          <div class="portrait-frame">
            <img src="${escapeAttr(item.icon || item.image || "")}" alt="" loading="lazy">
          </div>
          <div class="card-copy">
            <div class="card-title-row">
              <h3>${escapeHtml(displayName(item))}</h3>
              <span class="patch-badge">${escapeHtml(item.patch || "-")}</span>
            </div>
            <div class="card-source-block">
              <p>${escapeHtml(sourceSummaryText(item))}</p>
              <div class="card-tags">
                <span>${escapeHtml(sourceLabel(item))}</span>
                ${tradeableTag(item)}
                ${item.progress.wanted ? "<span>欲しい</span>" : ""}
              </div>
            </div>
          </div>
          <div class="card-actions">
            <button class="icon-button ${item.progress.owned ? "active" : ""}" data-action="owned" title="取得済み" aria-label="取得済み" aria-pressed="${item.progress.owned}"></button>
            <button class="icon-button star ${item.progress.wanted ? "active" : ""}" data-action="wanted" title="欲しい" aria-label="欲しい" aria-pressed="${item.progress.wanted}"></button>
          </div>
        </article>
      `;
    })
    .join("");
}

function handleGridClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionTarget = event.target.closest("[data-action]");
  const card = event.target.closest(".minion-card");
  if (!actionTarget || !card || !elements.minionGrid.contains(card)) {
    return;
  }

  const action = actionTarget.dataset.action;
  const id = card.dataset.id;
  if (!id) {
    return;
  }

  if (action === "select") {
    openDetailPanel(id);
    return;
  }

  if (action === "owned") {
    toggleOwned(id);
    return;
  }

  if (action === "wanted") {
    toggleWanted(id);
  }
}

function handleCollectionImageError(event) {
  if (!(event.target instanceof HTMLImageElement)) {
    return;
  }

  event.target.closest(".portrait-frame, .detail-image")?.classList.add("image-missing");
}

function renderDetail() {
  const item = itemsWithProgress().find((candidate) => candidate.id === state.selectedId);
  if (!item) {
    elements.detailContent.className = "detail-empty";
    elements.detailContent.innerHTML = `<div class="empty-sigil" aria-hidden="true"></div><p>${escapeHtml(categoryLabel(state.category))}を選択</p>`;
    return;
  }

  elements.detailContent.className = "detail-content";
  elements.detailContent.innerHTML = `
    <div class="detail-hero">
      <div class="detail-image">
        <img src="${escapeAttr(item.image || item.icon || "")}" alt="">
      </div>
      <div>
        <span class="kicker">Patch ${escapeHtml(item.patch || "-")}</span>
        <h3>${escapeHtml(displayName(item))}</h3>
        <div class="detail-chips">
          <span>${escapeHtml(categoryLabel(item.category))}</span>
          <span>${escapeHtml(sourceLabel(item))}</span>
          ${tradeableChip(item)}
          ${item.ownedPercent ? `<span>所持率 ${escapeHtml(item.ownedPercent)}</span>` : ""}
          ${(item.meta || []).map((meta) => `<span>${escapeHtml(meta.label)} ${escapeHtml(meta.value)}</span>`).join("")}
        </div>
      </div>
    </div>

    <div class="detail-actions">
      <button class="button ${item.progress.owned ? "active" : ""}" data-detail-action="owned" type="button" aria-pressed="${item.progress.owned}">取得済み</button>
      <button class="button ${item.progress.wanted ? "active" : ""}" data-detail-action="wanted" type="button" aria-pressed="${item.progress.wanted}">欲しい</button>
      <select id="prioritySelect" aria-label="Priority">
        ${Object.entries(priorityLabels).map(([value, label]) => `
          <option value="${value}" ${item.progress.priority === value ? "selected" : ""}>優先度 ${label}</option>
        `).join("")}
      </select>
    </div>

      <dl class="detail-list">
      <div>
        <dt>入手方法</dt>
        <dd>${escapeHtml(sourceSummaryText(item))}</dd>
      </div>
      <div>
        <dt>確認日</dt>
        <dd>${escapeHtml(item.verifiedAt || "-")}</dd>
      </div>
      ${descriptionText(item) ? `
        <div>
          <dt>説明</dt>
          <dd>${escapeHtml(descriptionText(item))}</dd>
        </div>
      ` : ""}
    </dl>

    <label class="notes-label" for="notesInput">メモ</label>
    <textarea id="notesInput" spellcheck="false">${escapeHtml(item.progress.notes || "")}</textarea>

    <div class="reference-list">
      ${(item.references || []).map(referenceLinkHtml).join("")}
    </div>
  `;

  elements.detailContent.querySelectorAll("[data-detail-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.detailAction === "owned") toggleOwned(item.id, "[data-detail-action=owned]");
      if (button.dataset.detailAction === "wanted") toggleWanted(item.id, "[data-detail-action=wanted]");
    });
  });

  elements.detailContent.querySelector("#prioritySelect").addEventListener("change", (event) => {
    const progress = getWritableProgress(item.id);
    progress.priority = event.target.value;
    progress.updatedAt = new Date().toISOString();
    scheduleSave();
    renderStats();
    renderGrid(filteredItems());
  });

  elements.detailContent.querySelector("#notesInput").addEventListener("input", (event) => {
    const progress = getWritableProgress(item.id);
    progress.notes = event.target.value;
    progress.updatedAt = new Date().toISOString();
    scheduleSave(false);
  });
}

function toggleOwned(id, restoreDetailFocus = "") {
  const progress = getWritableProgress(id);
  progress.owned = !progress.owned;
  if (progress.owned) {
    progress.wanted = false;
  }
  progress.updatedAt = new Date().toISOString();
  scheduleSave();
  render();
  restoreDetailControlFocus(restoreDetailFocus);
}

function toggleWanted(id, restoreDetailFocus = "") {
  const progress = getWritableProgress(id);
  progress.wanted = !progress.wanted;
  if (progress.wanted && progress.priority === "none") {
    progress.priority = "medium";
  }
  progress.updatedAt = new Date().toISOString();
  scheduleSave();
  render();
  restoreDetailControlFocus(restoreDetailFocus);
}

function restoreDetailControlFocus(selector) {
  if (!selector) return;
  requestAnimationFrame(() => elements.detailContent.querySelector(selector)?.focus({ preventScroll: true }));
}

function scheduleSave(withToast = true) {
  state.progressRevision += 1;
  clearTimeout(state.saveTimer);
  state.pendingSaveToast = state.pendingSaveToast || withToast;
  state.saveError = null;
  storeProgressRecovery();
  syncSaveStatus();
  state.saveTimer = setTimeout(() => {
    flushSave();
  }, 350);
}

function hasUnsavedProgress() {
  return state.savedProgressRevision < state.progressRevision;
}

function syncSaveStatus() {
  if (!elements.saveStatus) return;
  elements.saveStatus.classList.toggle("error", Boolean(state.saveError));
  if (state.saveInFlight) {
    elements.saveStatus.textContent = "保存中";
  } else if (state.saveError) {
    elements.saveStatus.textContent = "未保存・再試行待ち";
  } else if (hasUnsavedProgress()) {
    elements.saveStatus.textContent = "未保存";
  } else {
    elements.saveStatus.textContent = "保存済み";
  }
}

function storeProgressRecovery() {
  try {
    saveStoredJson(storageKeys.progressRecovery, {
      savedAt: new Date().toISOString(),
      progress: pruneProgress(state.progress)
    });
  } catch (error) {
    state.saveError = `ブラウザに復旧データを保持できません: ${error.message}`;
  }
}

async function flushSave(withToast = state.pendingSaveToast, rethrow = false, keepalive = false) {
  if (state.pendingSaveToast && !hasUnsavedProgress()) {
    state.progressRevision += 1;
    storeProgressRecovery();
  }
  clearTimeout(state.saveTimer);
  state.saveTimer = null;

  if (state.saveInFlight) {
    try {
      await state.saveInFlight;
    } catch {
      // The active save reports and preserves its own failure state.
    }
    if (hasUnsavedProgress()) return flushSave(withToast, rethrow, keepalive);
    return;
  }

  if (!hasUnsavedProgress()) return;

  const targetRevision = state.progressRevision;
  const payload = pruneProgress(state.progress);
  payload.schemaVersion = 1;
  payload.updatedAt = new Date().toISOString();
  const savePromise = persistProgress(payload, keepalive);
  state.saveInFlight = savePromise;
  state.pendingSaveToast = false;
  syncSaveStatus();

  try {
    await savePromise;
    state.savedProgressRevision = Math.max(state.savedProgressRevision, targetRevision);
    state.progress.updatedAt = payload.updatedAt;
    state.saveError = null;
    if (!hasUnsavedProgress()) localStorage.removeItem(storageKeys.progressRecovery);
    if (withToast) showToast("保存しました");
  } catch (error) {
    state.saveError = error.message;
    storeProgressRecovery();
    showToast(`保存できませんでした: ${error.message}`, "error");
    state.saveTimer = setTimeout(() => flushSave(false), 5000);
    if (rethrow) throw error;
  } finally {
    state.saveInFlight = null;
    syncSaveStatus();
    if (!state.saveError && hasUnsavedProgress() && !state.saveTimer) {
      state.saveTimer = setTimeout(() => flushSave(false), 0);
    }
  }
}

async function saveProgressNow() {
  if (!hasUnsavedProgress()) {
    state.progressRevision += 1;
    storeProgressRecovery();
  }
  return flushSave(false, true);
}

async function persistProgress(progress, keepalive = false) {
  if (state.storageMode === "browser") {
    saveStoredJson(storageKeys.progress, progress);
    return;
  }

  await fetchJson("/api/progress", {
    method: "PUT",
    body: JSON.stringify(progress),
    keepalive
  });
}

async function refreshCatalog() {
  if (state.storageMode === "browser") {
    showToast("Web版ではカタログ更新は管理者側で行います。最新化後にページを再読み込みしてください。", "error");
    return;
  }

  elements.refreshCatalog.disabled = true;
  elements.refreshCatalog.textContent = "更新中";

  try {
    const result = await fetchJson("/api/catalog/refresh", { method: "POST" });
    state.catalog = result.catalog;
    populateSourceFilter();
    populateVersionFilter();
    syncSortOptions();
    selectFirstItem();
    render();
    const failedCount = result.catalog?.refreshErrors?.length || 0;
    if (failedCount) {
      showToast(`${result.count}件を読み込みました（一部カテゴリは既存データを維持）`, "error");
    } else {
      showToast(`${result.count}件のコレクションを読み込みました`);
    }
  } catch (error) {
    showToast(`更新できませんでした: ${error.message}`, "error");
  } finally {
    elements.refreshCatalog.disabled = false;
    elements.refreshCatalog.textContent = "カタログ更新";
  }
}

async function importLodestone() {
  if (state.lodestoneImportRunning) return;

  const categoryKey = state.category;
  const categoryName = categoryLabel(categoryKey);
  const endpointCategory = lodestoneCategories[categoryKey];
  if (!endpointCategory) {
    showToast(`${categoryName}はLodestone読込に対応していません`, "error");
    return;
  }

  const character = elements.lodestoneInput.value.trim();
  if (!character) {
    showToast("LodestoneのキャラクターURL、またはIDを入力してください", "error");
    return;
  }

  const operationId = ++state.lodestoneImportId;
  state.lodestoneImportRunning = true;
  syncLodestoneAvailability();
  elements.importLodestone.textContent = "読込中";

  try {
    const result = await importLodestoneViaFfxivCollect(character, endpointCategory, categoryKey);
    if (operationId !== state.lodestoneImportId) return;
    state.progress = normalizeProgress(result.progress);
    await saveProgressNow();
    render();
    showToast(`Lodestone: ${categoryName} 新規 ${result.newOwned}件、登録済み ${result.alreadyOwned}件${result.conflicts ? `、競合 ${result.conflicts}件` : ""}${result.completeness === "partial" ? "（一部取得）" : ""}`);
  } catch (error) {
    showToast(`読み込めませんでした: ${error.message}`, "error");
  } finally {
    if (operationId === state.lodestoneImportId) {
      state.lodestoneImportRunning = false;
      elements.importLodestone.textContent = "Lodestone読込";
      syncLodestoneAvailability();
    }
  }
}

async function importLodestoneViaFfxivCollect(characterInput, endpointCategory, categoryKey) {
  const characterId = parseCharacterId(characterInput);
  if (!characterId) {
    throw new Error("LodestoneのキャラクターURL、またはIDを入力してください");
  }

  const collection = await fetchOwnedCollectionByCharacter(characterId, endpointCategory, categoryKey, true);
  saveStoredJson(storageKeys.progressImportBackup, pruneProgress(state.progress));
  syncRestoreProgressAvailability();
  return applyOwnedCollectionImport(collection);
}

async function fetchOwnedCollectionByCharacter(characterId, endpointCategory, categoryKey, allowProxy = false) {
  try {
    const characterUrl = `https://ffxivcollect.com/api/characters/${encodeURIComponent(characterId)}`;
    const character = await fetchExternalJson(characterUrl);
    const categoryStatus = character?.[endpointCategory];
    if (categoryStatus?.public === false) {
      throw new Error(`${categoryLabel(categoryKey)}の公開設定がオフになっています`);
    }

    const ownedItems = await fetchExternalJson(`${characterUrl}/${endpointCategory}/owned`);
    if (!Array.isArray(ownedItems)) {
      throw new Error("FFXIV Collectから所持情報を読み取れませんでした");
    }

    const fetchedAt = new Date().toISOString();
    return {
      characterId,
      categoryKey,
      ownedItems,
      total: categoryStatus?.count ?? ownedItems.length,
      expectedOwnedCount: categoryStatus?.count ?? null,
      discoveredCount: ownedItems.length,
      parsedCount: ownedItems.length,
      failedCount: 0,
      completeness: categoryStatus?.count == null
        ? "unknown"
        : Number(categoryStatus.count) === ownedItems.length ? "complete" : "partial",
      source: "FFXIV Collect API",
      fetchedAt,
      sourceUpdatedAt: character?.last_parsed ?? character?.lastParsed ?? character?.updated_at ?? null,
      characterName: character?.name || "",
      server: character?.server || ""
    };
  } catch (error) {
    if (allowProxy && ["mount", "minion"].includes(categoryKey)) {
      return fetchOwnedCollectionViaProxy(characterId, endpointCategory, categoryKey, error);
    }
    throw error;
  }
}

async function fetchOwnedCollectionViaProxy(characterId, endpointCategory, categoryKey, originalError) {
  const proxyBaseUrl = String(state.config?.lodestoneProxyUrl || "").trim().replace(/\/+$/, "");
  if (!proxyBaseUrl) {
    throw new Error(`FFXIV Collect API: ${originalError.message}`);
  }

  const collectionUrl = new URL(`${proxyBaseUrl}/collection`);
  collectionUrl.searchParams.set("characterId", characterId);
  collectionUrl.searchParams.set("category", categoryKey);

  const collection = await fetchExternalJson(collectionUrl.toString());
  const tooltipUrls = Array.from(new Set(Array.isArray(collection.tooltipUrls) ? collection.tooltipUrls : []));
  const expectedOwnedCount = Number.isInteger(collection.expectedOwnedCount)
    ? collection.expectedOwnedCount
    : Number.isInteger(collection.total) ? collection.total : null;

  if (tooltipUrls.length === 0 && expectedOwnedCount !== 0) {
    throw new Error(`${categoryLabel(categoryKey)}のLodestone一覧を読み取れませんでした。公開設定を確認してください。`);
  }

  const ownedItems = [];
  const failedUrls = [];

  const fetchTooltipBatch = async (batch) => {
    const result = await fetchExternalJson(`${proxyBaseUrl}/tooltips`, {
      method: "POST",
      body: JSON.stringify({ category: categoryKey, urls: batch })
    });
    if (Array.isArray(result.items)) ownedItems.push(...result.items);
    if (Array.isArray(result.errors)) {
      failedUrls.push(...result.errors.map((entry) => entry?.url).filter(Boolean));
    }
  };

  for (let index = 0; index < tooltipUrls.length; index += lodestoneProxyTooltipBatchSize) {
    const batch = tooltipUrls.slice(index, index + lodestoneProxyTooltipBatchSize);
    elements.importLodestone.textContent = `読込中 ${Math.min(index + batch.length, tooltipUrls.length)}/${tooltipUrls.length}`;
    await fetchTooltipBatch(batch);
  }

  const retryUrls = Array.from(new Set(failedUrls));
  failedUrls.length = 0;
  for (let index = 0; index < retryUrls.length; index += lodestoneProxyTooltipBatchSize) {
    const batch = retryUrls.slice(index, index + lodestoneProxyTooltipBatchSize);
    elements.importLodestone.textContent = `再試行 ${Math.min(index + batch.length, retryUrls.length)}/${retryUrls.length}`;
    await fetchTooltipBatch(batch);
  }

  if (ownedItems.length === 0 && expectedOwnedCount !== 0) {
    throw new Error("Lodestoneから取得済みアイテムを読み取れませんでした。");
  }

  const uniqueItems = Array.from(new Map(ownedItems.map((item) => [item.url || normalizeCollectionName(item.nameJa), item])).values());
  const completeness = failedUrls.length || (expectedOwnedCount != null && uniqueItems.length !== expectedOwnedCount)
    ? "partial"
    : expectedOwnedCount == null ? "unknown" : "complete";
  return {
    characterId: collection.characterId || characterId,
    categoryKey,
    ownedItems: uniqueItems,
    total: expectedOwnedCount ?? uniqueItems.length,
    expectedOwnedCount,
    discoveredCount: tooltipUrls.length,
    parsedCount: uniqueItems.length,
    failedCount: failedUrls.length,
    failedUrls: Array.from(new Set(failedUrls)),
    completeness,
    source: "Lodestone via Cloudflare Workers",
    fetchedAt: new Date().toISOString(),
    sourceUpdatedAt: null,
    characterName: collection.characterName || "",
    server: collection.server || ""
  };
}

function applyOwnedCollectionImport({
  characterId,
  categoryKey,
  ownedItems,
  total,
  expectedOwnedCount = null,
  discoveredCount = ownedItems.length,
  parsedCount = ownedItems.length,
  failedCount = 0,
  completeness = "unknown",
  source,
  fetchedAt = null,
  sourceUpdatedAt = null,
  characterName,
  server
}) {
  const catalogItems = (state.catalog?.items || []).filter((item) => item.category === categoryKey);
  const byItemId = new Map();
  const byExternalId = new Map();
  const byName = new Map();

  for (const item of catalogItems) {
    byItemId.set(item.id, item);

    const externalId = ffxivCollectIdForItem(item, categoryKey);
    if (externalId) {
      byExternalId.set(externalId, item);
    }

    [item.nameJa, item.nameEn, displayName(item)].forEach((name) => {
      const normalized = normalizeCollectionName(name);
      if (!normalized) return;
      const values = byName.get(normalized) || [];
      if (!values.some((value) => value.id === item.id)) values.push(item);
      byName.set(normalized, values);
    });
  }

  const matched = [];
  const unmatched = [];
  const conflicts = [];
  let alreadyOwned = 0;
  let newOwned = 0;
  const importedAt = new Date().toISOString();

  for (const ownedItem of ownedItems) {
    const externalId = Number(ownedItem?.id);
    const idMatches = [
      ownedItem?.itemId ? byItemId.get(String(ownedItem.itemId)) : null,
      Number.isFinite(externalId) ? byExternalId.get(externalId) : null
    ].filter(Boolean);
    const uniqueIdMatches = Array.from(new Map(idMatches.map((item) => [item.id, item])).values());
    if (uniqueIdMatches.length > 1) {
      conflicts.push(ownedItem?.name || ownedItem?.nameJa || String(ownedItem?.id || ""));
      continue;
    }
    const nameMatches = byName.get(normalizeCollectionName(ownedItem?.name || ownedItem?.nameJa || ownedItem?.nameEn)) || [];
    const item = uniqueIdMatches[0] || (nameMatches.length === 1 ? nameMatches[0] : null);

    if (!item) {
      if (nameMatches.length > 1) conflicts.push(ownedItem?.name || ownedItem?.nameJa || "同名項目");
      else
      unmatched.push(ownedItem?.name || ownedItem?.nameJa || ownedItem?.itemId || String(ownedItem?.id || ""));
      continue;
    }

    if (getProgress(item.id).owned) alreadyOwned += 1;
    else newOwned += 1;
    const progress = getWritableProgress(item.id);
    progress.owned = true;
    progress.wanted = false;
    progress.priority = progress.priority || "none";
    progress.notes = progress.notes || "";
    progress.updatedAt = importedAt;
    matched.push(item.id);
  }

  state.progress.schemaVersion = 1;
  state.progress.updatedAt = importedAt;
  state.progress.lodestone = {
    ...(state.progress.lodestone && typeof state.progress.lodestone === "object" ? state.progress.lodestone : {}),
    [categoryKey]: {
      characterId,
      characterName,
      server,
      importedAt,
      total: total ?? ownedItems.length,
      read: ownedItems.length,
      matched: matched.length,
      expectedOwnedCount,
      discoveredCount,
      parsedCount,
      alreadyOwnedCount: alreadyOwned,
      newOwnedCount: newOwned,
      conflictCount: conflicts.length,
      failedCount,
      completeness,
      unmatched: unmatched.slice(0, 50),
      conflicts: conflicts.slice(0, 50),
      source,
      fetchedAt,
      sourceUpdatedAt
    },
    lastCategory: categoryKey,
    lastImportedAt: importedAt
  };

  return {
    characterId,
    read: ownedItems.length,
    matched: matched.length,
    alreadyOwned,
    newOwned,
    conflicts: conflicts.length,
    completeness,
    unmatched: unmatched.length,
    progress: state.progress
  };
}

async function fetchExternalJson(url, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {})
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    let message = `外部APIの読み込みに失敗しました: ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.error || payload.message || message;
    } catch {
      // Keep the status message when the external API did not return JSON.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function parseCharacterId(value) {
  const text = String(value || "").trim();
  const urlMatch = text.match(/\/lodestone\/character\/(\d+)/);
  if (urlMatch) return urlMatch[1];

  const pathMatch = text.match(/(?:character\/)?(\d+)(?:\/|$)/);
  return pathMatch ? pathMatch[1] : null;
}

function ffxivCollectIdForItem(item, categoryKey) {
  const externalId = Number(item?.externalIds?.ffxivCollect);
  if (Number.isFinite(externalId) && externalId > 0) {
    return externalId;
  }

  const prefix = `${categoryKey}-`;
  if (String(item?.id || "").startsWith(prefix)) {
    const id = Number(String(item.id).slice(prefix.length));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  return null;
}

function normalizeCollectionName(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-‐‑‒–—―'’"“”.,:;!?()[\]{}（）【】「」『』・･]/g, "")
    .trim();
}

function exportProgress() {
  const payload = JSON.stringify(state.progress, null, 2);
  const blob = new Blob([`${payload}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ff14-collection-progress-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importProgress(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    const progress = validateProgressPayload(imported);
    const before = progressSummary(state.progress);
    const after = progressSummary(progress);
    const emptyWarning = after.entries === 0 ? "\n\n読み込み後は空の進捗になります。" : "";
    const confirmed = confirm(
      `進捗を上書きします。\n\n現在: ${before.entries}件（取得済み${before.owned}・欲しい${before.wanted}・メモ${before.notes}）\n読込後: ${after.entries}件（取得済み${after.owned}・欲しい${after.wanted}・メモ${after.notes}）${emptyWarning}\n\n直前の状態は「元に戻す」から復元できます。続けますか？`
    );
    if (!confirmed) return;

    saveStoredJson(storageKeys.progressImportBackup, pruneProgress(state.progress));
    progress.updatedAt = new Date().toISOString();

    if (state.storageMode === "browser") {
      saveStoredJson(storageKeys.progress, progress);
    } else {
      const result = await fetchJson("/api/progress/import", {
        method: "POST",
        body: JSON.stringify(progress)
      });
      Object.assign(progress, validateProgressPayload(result.progress));
    }

    state.progress = progress;
    state.progressRevision += 1;
    state.savedProgressRevision = state.progressRevision;
    state.saveError = null;
    syncSaveStatus();
    syncRestoreProgressAvailability();
    render();
    showToast("読み込みました");
  } catch (error) {
    showToast(`読み込めませんでした: ${error.message}`, "error");
  } finally {
    event.target.value = "";
  }
}

function syncRestoreProgressAvailability() {
  elements.restoreProgressImport.hidden = !localStorage.getItem(storageKeys.progressImportBackup);
}

async function restoreProgressImport() {
  try {
    const backupText = localStorage.getItem(storageKeys.progressImportBackup);
    if (!backupText) return;
    const backup = validateProgressPayload(JSON.parse(backupText));
    if (!confirm("直前の進捗取込前の状態へ戻しますか？")) return;

    if (state.storageMode === "browser") {
      saveStoredJson(storageKeys.progress, backup);
    } else {
      const result = await fetchJson("/api/progress/import", {
        method: "POST",
        body: JSON.stringify(backup)
      });
      Object.assign(backup, validateProgressPayload(result.progress));
    }

    state.progress = backup;
    state.progressRevision += 1;
    state.savedProgressRevision = state.progressRevision;
    state.saveError = null;
    localStorage.removeItem(storageKeys.progressImportBackup);
    syncRestoreProgressAvailability();
    syncSaveStatus();
    render();
    showToast("直前の進捗へ戻しました");
  } catch (error) {
    showToast(`復元できませんでした: ${error.message}`, "error");
  }
}

function lodestonePageExporter() {
  const host = location.hostname.toLowerCase();
  if (!host.endsWith("finalfantasyxiv.com")) {
    alert("このブックマークはLodestoneのページで実行してください。");
    return;
  }

  const isVisible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const classify = (element) => {
    const images = Array.from(element.querySelectorAll("img"));
    const signal = cleanText([
      element.className,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      ...images.flatMap((image) => [image.alt, image.title, image.className])
    ].join(" ")).toLowerCase();
    if (element.querySelector('input:checked, [aria-checked="true"]')) return "owned";
    if (/未取得|未修得|未登録|unobtained|unlearned|unregistered|not acquired|locked|disabled/.test(signal)) return "missing";
    if (/取得済|修得済|登録済|所持済|acquired|obtained|learned|registered|owned|complete/.test(signal)) return "owned";
    return "unknown";
  };
  const root = document.querySelector("main, #character, .ldst__main") || document.body;
  const selectors = [
    "tr",
    "li",
    "article",
    '[class*="collection"]',
    '[class*="collectable"]',
    '[class*="card-list"] > *',
    '[class*="spell-list"] > *',
    '[class*="item-list"] > *'
  ].join(",");
  const nodes = Array.from(root.querySelectorAll(selectors))
    .filter(isVisible)
    .map((element) => ({ element, text: cleanText(element.innerText) }))
    .filter(({ text }) => text.length >= 2 && text.length <= 500)
    .sort((a, b) => a.text.length - b.text.length);
  const seen = new Set();
  const entries = [];

  for (const { element, text } of nodes) {
    const key = text.normalize("NFKC").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      text,
      status: classify(element),
      className: cleanText(element.className).slice(0, 300),
      ariaLabel: cleanText(element.getAttribute("aria-label")).slice(0, 300)
    });
    if (entries.length >= 3000) break;
  }

  const headings = cleanText(Array.from(root.querySelectorAll("h1, h2, h3"))
    .filter(isVisible)
    .map((element) => element.innerText)
    .join(" "));
  const pageSignal = `${location.pathname} ${document.title} ${headings}`.toLowerCase();
  const categoryRules = [
    ["card", /triple.?triad|triad|トリプルトライアド|カードリスト/],
    ["spell", /blue.?magic|blue.?mage|bluemage|青魔道書|青魔法/],
    ["orchestrion", /orchestrion|オーケストリオン/],
    ["minion", /minion|ミニオン/],
    ["mount", /mount|マウント/],
    ["emote", /emote|エモート/],
    ["hairstyle", /hairstyle|髪型/],
    ["fashion", /fashion.?accessor|ファッションアクセサリー|傘/],
    ["beast", /bestiary|beastmaster|魔獣図鑑|魔獣使い/]
  ];
  const categoryHint = categoryRules.find(([, pattern]) => pattern.test(pageSignal))?.[0] || null;
  const payload = {
    schemaVersion: 1,
    source: "ff14-collection-notebook-lodestone-bookmarklet",
    capturedAt: new Date().toISOString(),
    url: location.href,
    title: document.title,
    headings,
    categoryHint,
    entries
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `ff14-lodestone-${categoryHint || "collection"}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

async function lodestoneAllCategoriesExporter() {
  if (!location.hostname.toLowerCase().endsWith("finalfantasyxiv.com")) {
    alert("このブックマークはLodestoneのページで実行してください。");
    return;
  }

  const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const categoryRules = [
    ["card", /triple.?triad|triad|トリプルトライアド|カードリスト/],
    ["spell", /blue.?magic|blue.?mage|bluemage|青魔道書|青魔法/],
    ["orchestrion", /orchestrion|オーケストリオン/],
    ["minion", /minion|ミニオン/],
    ["mount", /mount|マウント/],
    ["emote", /emote|エモート/],
    ["hairstyle", /hairstyle|髪型/],
    ["fashion", /fashion.?accessor|ファッションアクセサリー|傘/],
    ["beast", /bestiary|beastmaster|beast|魔獣図鑑|魔獣使い/]
  ];
  const detectCategory = (url, doc) => {
    const headings = cleanText(Array.from(doc.querySelectorAll("h1, h2, h3"))
      .map((element) => element.textContent)
      .join(" "));
    const signal = `${new URL(url).pathname} ${doc.title} ${headings}`.toLowerCase();
    return categoryRules.find(([, pattern]) => pattern.test(signal))?.[0] || null;
  };
  const classify = (element) => {
    const descendants = Array.from(element.querySelectorAll("img, [aria-label], [data-status], [data-state]"));
    const signal = cleanText([element, ...descendants].flatMap((node) => [
      node.className,
      node.getAttribute?.("aria-label"),
      node.getAttribute?.("title"),
      node.getAttribute?.("data-status"),
      node.getAttribute?.("data-state"),
      node.alt
    ]).join(" ")).toLowerCase();
    if (/未取得|未修得|未登録|未所持|unobtained|unlearned|unregistered|not acquired|not obtained|is-locked/.test(signal)) {
      return { status: "missing", ownershipEvidence: "missing-marker" };
    }
    if (/取得済|修得済|登録済|所持済|acquired|obtained|learned|registered|owned/.test(signal)) {
      return { status: "owned", ownershipEvidence: "owned-marker" };
    }
    return { status: "unknown", ownershipEvidence: "none" };
  };
  const extractCollection = (doc, url) => {
    const root = doc.querySelector("main, #character, .ldst__main") || doc.body;
    const categoryHint = detectCategory(url, doc);
    const selectors = [
      "tr",
      "li",
      "article",
      '[class*="collection"]',
      '[class*="collectable"]',
      '[class*="card-list"] > *',
      '[class*="spell-list"] > *',
      '[class*="item-list"] > *'
    ].join(",");
    const characterMatch = new URL(url).pathname.match(/\/lodestone\/character\/(\d+)\//);
    const ownedOnlyCategory = ["mount", "minion"].includes(categoryHint);
    const tooltipSelector = characterMatch && ownedOnlyCategory
      ? `[data-tooltip_href*="/lodestone/character/${characterMatch[1]}/${categoryHint}/tooltip/"]`
      : null;
    const hasVerifiedOwnedOnlyList = Boolean(tooltipSelector && root.querySelector(tooltipSelector));
    const itemElements = hasVerifiedOwnedOnlyList
      ? Array.from(root.querySelectorAll(tooltipSelector)).map((tooltip) =>
        tooltip.closest("tr, li, article") || tooltip.parentElement
      ).filter(Boolean)
      : Array.from(root.querySelectorAll(selectors));
    const nodes = Array.from(new Set(itemElements))
      .filter((element) => !element.closest('[hidden], [aria-hidden="true"]'))
      .map((element) => ({ element, text: cleanText(element.textContent) }))
      .filter(({ text }) => text.length >= 2 && text.length <= 500)
      .sort((a, b) => a.text.length - b.text.length);
    const seen = new Set();
    const entries = [];
    for (const { element, text } of nodes) {
      const anchor = element.matches("a[href]") ? element : element.querySelector("a[href]");
      const image = element.matches("img") ? element : element.querySelector("img");
      const href = anchor?.getAttribute("href") ? new URL(anchor.getAttribute("href"), url).href : "";
      const dataId = cleanText(element.getAttribute("data-id") || element.querySelector("[data-id]")?.getAttribute("data-id"));
      const key = `${text.normalize("NFKC").toLowerCase()}|${href}|${dataId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const classified = classify(element);
      const ownsByVerifiedList = classified.status === "unknown" && hasVerifiedOwnedOnlyList &&
        (element.matches(tooltipSelector) || element.querySelector(tooltipSelector));
      entries.push({
        text,
        status: ownsByVerifiedList ? "owned" : classified.status,
        ownershipEvidence: ownsByVerifiedList ? "verified-owned-only-list" : classified.ownershipEvidence,
        className: cleanText(element.className).slice(0, 300),
        ariaLabel: cleanText(element.getAttribute("aria-label")).slice(0, 300),
        title: cleanText(element.getAttribute("title") || anchor?.getAttribute("title")).slice(0, 300),
        imageAlt: cleanText(image?.alt || image?.title).slice(0, 300),
        href,
        dataId
      });
      if (entries.length >= 3000) break;
    }
    return {
      url,
      title: doc.title,
      headings: cleanText(Array.from(root.querySelectorAll("h1, h2, h3"))
        .map((element) => element.textContent)
        .join(" ")),
      categoryHint,
      layoutStatus: entries.length ? (hasVerifiedOwnedOnlyList ? "verified-owned-only-list" : "review-required") : "unsupported-layout",
      entries
    };
  };

  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.style.cssText = "position:fixed;right:16px;top:16px;z-index:2147483647;max-width:320px;padding:12px 16px;color:#fff;background:#20242c;border:1px solid #c9a65b;border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,.35);font:14px/1.5 sans-serif";
  status.textContent = "取得ページを探しています...";
  document.body.append(status);

  try {
    const currentUrl = new URL(location.href);
    currentUrl.hash = "";
    const characterMatch = currentUrl.pathname.match(/^(.*\/lodestone\/character\/(\d+)\/)/);
    if (!characterMatch) {
      throw new Error("ログイン後、自分のキャラクターページで実行してください。");
    }
    const characterRoot = new URL(characterMatch[1], currentUrl.origin).href;
    const characterId = characterMatch[2];
    const documents = new Map([[currentUrl.href, document]]);
    const failures = [];
    const validateDocument = (doc, finalUrl, expectedUrl) => {
      const actual = new URL(finalUrl);
      const expected = new URL(expectedUrl);
      if (actual.origin !== currentUrl.origin || !actual.pathname.startsWith(new URL(characterRoot).pathname)) {
        throw new Error("別のページへ移動しました。ログイン状態を確認してください。");
      }
      const pageText = cleanText(doc.body?.textContent).toLowerCase();
      if (/ログイン|login/.test(pageText) && doc.querySelector('input[type="password"], form[action*="login"]')) {
        throw new Error("Lodestoneのログインが切れています。");
      }
      const canonical = doc.querySelector('link[rel="canonical"]')?.href;
      const canonicalCharacter = canonical && new URL(canonical, actual).pathname.match(/\/lodestone\/character\/(\d+)\//)?.[1];
      if (canonicalCharacter && canonicalCharacter !== characterId) {
        throw new Error("別キャラクターのページを検出しました。");
      }
      if (expected.pathname.includes(`/character/${characterId}/`) && !actual.pathname.includes(`/character/${characterId}/`)) {
        throw new Error("キャラクターIDを確認できませんでした。");
      }
    };
    const fetchDocument = async (url) => {
      if (documents.has(url)) return documents.get(url);
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      validateDocument(doc, response.url, url);
      documents.set(url, doc);
      return doc;
    };

    let profileDocument = document;
    if (currentUrl.href !== characterRoot) {
      status.textContent = "キャラクターページを確認しています...";
      try {
        profileDocument = await fetchDocument(characterRoot);
      } catch (error) {
        failures.push({ url: characterRoot, error: error.message });
      }
    }

    const categoryUrls = new Map();
    const addCategoryUrl = (category, href, prefer = false) => {
      if (!category) return;
      const url = new URL(href, characterRoot);
      url.hash = "";
      if (url.origin !== currentUrl.origin || !url.href.startsWith(characterRoot)) return;
      if (prefer || !categoryUrls.has(category)) categoryUrls.set(category, url.href);
    };
    addCategoryUrl(detectCategory(currentUrl.href, document), currentUrl.href, true);
    for (const doc of new Set([document, profileDocument])) {
      for (const link of doc.querySelectorAll("a[href]")) {
        const href = new URL(link.getAttribute("href"), characterRoot);
        const signal = `${href.pathname} ${cleanText(link.textContent)} ${cleanText(link.getAttribute("title"))}`.toLowerCase();
        addCategoryUrl(categoryRules.find(([, pattern]) => pattern.test(signal))?.[0], href.href);
      }
    }
    addCategoryUrl("minion", new URL("minion/", characterRoot).href);
    addCategoryUrl("mount", new URL("mount/", characterRoot).href);

    const collections = [];
    let completed = 0;
    for (const [category, url] of categoryUrls) {
      status.textContent = `取得中 ${completed + 1}/${categoryUrls.size}`;
      try {
        const collection = extractCollection(await fetchDocument(url), url);
        collection.categoryHint ||= category;
        collections.push(collection);
      } catch (error) {
        failures.push({ categoryHint: category, url, error: error.message });
      }
      completed += 1;
    }
    if (!collections.length) {
      throw new Error("取得できるカテゴリページが見つかりませんでした。");
    }

    const payload = {
      schemaVersion: 3,
      source: "ff14-collection-notebook-lodestone-bookmarklet",
      capturedAt: new Date().toISOString(),
      characterId,
      characterUrl: characterRoot,
      collections,
      failures
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `ff14-lodestone-all-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    status.textContent = `${collections.length}カテゴリを書き出しました${failures.length ? `（${failures.length}件取得失敗）` : ""}`;
    setTimeout(() => status.remove(), 5000);
  } catch (error) {
    status.remove();
    alert(error.message);
  }
}

function lodestoneBookmarkletSource() {
  return `javascript:void(${lodestoneAllCategoriesExporter.toString()})()`;
}

function prepareLodestoneBookmarklet() {
  elements.lodestoneBookmarkletLink.href = lodestoneBookmarkletSource();
  elements.lodestoneBookmarkletLink.title = "ブックマークバーへドラッグ";
}

function openLodestoneTool() {
  resetLodestoneTool();
  elements.lodestoneToolDialog.showModal();
}

function closeLodestoneTool() {
  elements.lodestoneToolDialog.close();
}

function resetLodestoneTool() {
  state.lodestoneSnapshot = null;
  state.lodestoneSnapshotCategory = null;
  state.lodestoneSnapshotCandidates = [];
  elements.lodestoneSnapshotFile.value = "";
  elements.lodestoneSnapshotCategory.value = "auto";
  elements.lodestoneSnapshotCategory.hidden = false;
  elements.lodestoneSnapshotCategory.disabled = false;
  elements.lodestoneSnapshotStatus.textContent = "";
  elements.lodestoneSnapshotCandidates.hidden = true;
  elements.lodestoneSnapshotCandidateList.innerHTML = "";
  elements.applyLodestoneSnapshot.hidden = true;
}

async function copyLodestoneBookmarklet() {
  try {
    await navigator.clipboard.writeText(lodestoneBookmarkletSource());
    showToast("ブックマークレットのコードをコピーしました");
  } catch {
    showToast("コードをコピーできませんでした。JavaScriptを保存して内容をコピーしてください。", "error");
  }
}

function downloadLodestoneBookmarklet() {
  const blob = new Blob([`${lodestoneBookmarkletSource()}\n`], { type: "text/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ff14-lodestone-export.bookmarklet.js";
  link.click();
  URL.revokeObjectURL(url);
}

async function importLodestoneSnapshotFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("JSONファイルが大きすぎます");
    }
    const snapshot = JSON.parse(await file.text());
    const hasCollections = snapshot?.schemaVersion >= 2 && Array.isArray(snapshot.collections);
    if (snapshot?.source !== "ff14-collection-notebook-lodestone-bookmarklet" || (!Array.isArray(snapshot.entries) && !hasCollections)) {
      throw new Error("Lodestone取込ツールで書き出したJSONではありません");
    }
    elements.lodestoneSnapshotStatus.textContent = "キャラクターIDから取得状況を照合しています...";
    state.lodestoneSnapshot = await enrichLodestoneSnapshot(snapshot);
    analyzeLodestoneSnapshot();
  } catch (error) {
    state.lodestoneSnapshot = null;
    state.lodestoneSnapshotCandidates = [];
    elements.lodestoneSnapshotCandidates.hidden = true;
    elements.applyLodestoneSnapshot.hidden = true;
    elements.lodestoneSnapshotStatus.textContent = error.message;
    showToast(error.message, "error");
  }
}

async function enrichLodestoneSnapshot(snapshot) {
  if (!Array.isArray(snapshot.collections)) return snapshot;
  const characterId = parseCharacterId(snapshot.characterId || snapshot.characterUrl);
  if (!characterId) return snapshot;

  const originalCollections = snapshot.collections.map((collection) => ({
    ...collection,
    evidenceSource: collection.evidenceSource || "lodestone-bookmarklet",
    capturedAt: collection.capturedAt || snapshot.capturedAt || null
  }));
  const directImports = [];
  const directFailures = [];
  const directCollections = await Promise.all(Object.entries(lodestoneCategories).map(async ([category, endpointCategory]) => {
    try {
      const result = await fetchOwnedCollectionByCharacter(characterId, endpointCategory, category, true);
      directImports.push({
        categoryHint: category,
        read: result.ownedItems.length,
        source: result.source,
        expectedOwnedCount: result.expectedOwnedCount ?? null,
        discoveredCount: result.discoveredCount ?? result.ownedItems.length,
        parsedCount: result.parsedCount ?? result.ownedItems.length,
        failedCount: result.failedCount ?? 0,
        completeness: result.completeness || "unknown",
        fetchedAt: result.fetchedAt,
        sourceUpdatedAt: result.sourceUpdatedAt ?? null
      });
      return {
        url: `https://ffxivcollect.com/api/characters/${encodeURIComponent(characterId)}/${endpointCategory}/owned`,
        title: `${categoryLabel(category)} - ${result.characterName || characterId}`,
        headings: categoryLabel(category),
        categoryHint: category,
        matchMethod: "character-id",
        evidenceSource: result.source === "FFXIV Collect API" ? "ffxiv-collect-api" : "lodestone-proxy",
        fetchedAt: result.fetchedAt || new Date().toISOString(),
        sourceUpdatedAt: result.sourceUpdatedAt ?? null,
        expectedOwnedCount: result.expectedOwnedCount ?? null,
        discoveredCount: result.discoveredCount ?? result.ownedItems.length,
        parsedCount: result.parsedCount ?? result.ownedItems.length,
        failedCount: result.failedCount ?? 0,
        completeness: result.completeness || "unknown",
        entries: result.ownedItems.map((item) => ({
          text: item?.name || item?.nameJa || item?.nameEn || "",
          status: "owned",
          ownershipEvidence: result.source === "FFXIV Collect API" ? "ffxiv-collect-api" : "lodestone-proxy-owned-list",
          externalId: item?.id ?? null,
          itemId: item?.itemId ?? item?.item_id ?? null
        }))
      };
    } catch (error) {
      directFailures.push({ categoryHint: category, error: error.message });
      return null;
    }
  }));

  const apiCollections = directCollections.filter(Boolean);
  const collections = originalCollections.concat(apiCollections);
  const comparisons = apiCollections.map((apiCollection) => {
    const originals = originalCollections.filter((collection) => detectLodestoneSnapshotCategory(collection) === apiCollection.categoryHint);
    const originalOwnedCount = originals.reduce((total, collection) => total + collection.entries.filter((entry) => entry?.status === "owned").length, 0);
    return {
      categoryHint: apiCollection.categoryHint,
      originalOwnedCount,
      apiOwnedCount: apiCollection.entries.length,
      difference: apiCollection.entries.length - originalOwnedCount,
      apiEmptyWithOriginalEvidence: apiCollection.entries.length === 0 && originalOwnedCount > 0
    };
  });

  return {
    ...snapshot,
    characterId,
    collections,
    originalCollections,
    directImports,
    directFailures,
    comparisons
  };
}

function analyzeLodestoneSnapshot() {
  const snapshot = state.lodestoneSnapshot;
  if (!snapshot) return;

  const collections = Array.isArray(snapshot.collections) ? snapshot.collections : [snapshot];
  const isBatch = Array.isArray(snapshot.collections);
  elements.lodestoneSnapshotCategory.hidden = isBatch;
  elements.lodestoneSnapshotCategory.disabled = isBatch;
  const override = isBatch ? "auto" : elements.lodestoneSnapshotCategory.value;
  const analyzed = collections.map((collection) => {
    const category = override === "auto" ? detectLodestoneSnapshotCategory(collection) : override;
    return { collection, category };
  });
  const recognized = analyzed.filter(({ category }) => category && categoryLabels[category]);
  state.lodestoneSnapshotCategory = recognized.length === 1 ? recognized[0].category : null;

  if (!recognized.length) {
    state.lodestoneSnapshotCandidates = [];
    elements.lodestoneSnapshotCandidates.hidden = true;
    elements.applyLodestoneSnapshot.hidden = true;
    elements.lodestoneSnapshotStatus.textContent = isBatch
      ? "取り込めるカテゴリを判定できませんでした。"
      : "カテゴリを判定できませんでした。カテゴリを選択してください。";
    return;
  }

  const candidateMap = new Map();
  const analysisMetrics = { alreadyOwnedCount: 0, unmatchedCount: 0, conflictCount: 0, partialMatchCount: 0 };
  for (const { collection, category } of recognized) {
    const candidates = findLodestoneSnapshotCandidates(collection, category);
    for (const key of Object.keys(analysisMetrics)) {
      analysisMetrics[key] += candidates.metrics?.[key] || 0;
    }
    for (const candidate of candidates) {
      const existing = candidateMap.get(candidate.item.id);
      if (!existing) {
        candidateMap.set(candidate.item.id, { ...candidate, category });
        continue;
      }
      const statuses = new Set([existing.status, candidate.status]);
      const conflict = statuses.has("conflict") || (statuses.has("owned") && statuses.has("missing"));
      candidateMap.set(candidate.item.id, {
        ...existing,
        status: conflict ? "conflict" : statuses.has("owned") ? "owned" : statuses.has("unknown") ? "unknown" : "missing",
        autoSelected: !conflict && (existing.autoSelected || candidate.autoSelected),
        evidence: [...(existing.evidence || []), ...(candidate.evidence || [])]
      });
    }
  }
  state.lodestoneSnapshotCandidates = Array.from(candidateMap.values()).sort((a, b) => {
    if (a.category !== b.category) return categoryLabel(a.category).localeCompare(categoryLabel(b.category), "ja");
    if (a.status !== b.status) return a.status === "owned" ? -1 : 1;
    return compareText(displayName(a.item), displayName(b.item));
  });
  renderLodestoneSnapshotCandidates();
  const knownOwned = state.lodestoneSnapshotCandidates.filter((candidate) => candidate.autoSelected).length;
  const conflicts = state.lodestoneSnapshotCandidates.filter((candidate) => candidate.status === "conflict").length + analysisMetrics.conflictCount;
  const categories = Array.from(new Set(recognized.map(({ category }) => category)));
  const failed = Array.isArray(snapshot.failures) ? snapshot.failures.length : 0;
  const directMatched = Array.isArray(snapshot.directImports)
    ? snapshot.directImports.reduce((total, result) => total + result.read, 0)
    : 0;
  const directFailed = Array.isArray(snapshot.directFailures) ? snapshot.directFailures.length : 0;
  const skipped = analyzed.length - recognized.length;
  const partialImports = Array.isArray(snapshot.directImports)
    ? snapshot.directImports.filter((result) => result.completeness === "partial").length
    : 0;
  const apiDifferences = Array.isArray(snapshot.comparisons)
    ? snapshot.comparisons.filter((result) => result.difference !== 0).length
    : 0;
  const directSummary = directMatched || directFailed || partialImports || apiDifferences
    ? `、API/ID証拠 ${directMatched}件${directFailed ? `（${directFailed}カテゴリ失敗）` : ""}${partialImports ? `、不完全 ${partialImports}カテゴリ` : ""}${apiDifferences ? `、元データとの差 ${apiDifferences}カテゴリ` : ""}`
    : "";
  elements.lodestoneSnapshotStatus.textContent = state.lodestoneSnapshotCandidates.length
    ? `${categories.map(categoryLabel).join("・")}を解析しました。自動選択 ${knownOwned}件、要確認 ${state.lodestoneSnapshotCandidates.length - knownOwned}件${conflicts ? `、競合 ${conflicts}件` : ""}${analysisMetrics.alreadyOwnedCount ? `、登録済み ${analysisMetrics.alreadyOwnedCount}件` : ""}${directSummary}${failed || skipped ? `、未取込 ${failed + skipped}カテゴリ` : ""}です。`
    : `${categories.map(categoryLabel).join("・")}に追加候補はありません${analysisMetrics.alreadyOwnedCount ? `（登録済み ${analysisMetrics.alreadyOwnedCount}件）` : ""}${conflicts ? `。競合 ${conflicts}件を確認してください` : ""}。${directSummary}`;
}

function detectLodestoneSnapshotCategory(snapshot) {
  if (categoryLabels[snapshot.categoryHint]) return snapshot.categoryHint;

  const signal = normalizeOcrText([snapshot.url, snapshot.title, snapshot.headings].filter(Boolean).join(" "));
  const rules = [
    ["card", ["tripletriad", "triad", "トリプルトライアド", "カードリスト"]],
    ["spell", ["bluemagic", "bluemage", "bluemage", "青魔道書", "青魔法"]],
    ["orchestrion", ["orchestrion", "オーケストリオン"]],
    ["minion", ["minion", "ミニオン"]],
    ["mount", ["mount", "マウント"]],
    ["emote", ["emote", "エモート"]],
    ["hairstyle", ["hairstyle", "髪型"]],
    ["fashion", ["fashionaccessor", "ファッションアクセサリー"]],
    ["beast", ["bestiary", "beastmaster", "beast", "魔獣図鑑", "魔獣使い"]]
  ];
  const direct = rules.find(([, terms]) => terms.some((term) => signal.includes(normalizeOcrText(term))));
  if (direct) return direct[0];

  const text = normalizeOcrText(snapshot.entries.map((entry) => entry.text).join("\n"));
  const scores = Object.keys(categoryLabels).map((category) => ({
    category,
    score: (state.catalog?.items || [])
      .filter((item) => item.category === category)
      .filter((item) => [item.nameJa, item.nameEn]
        .map(normalizeOcrText)
        .some((name) => name.length >= 3 && text.includes(name)))
      .length
  })).sort((a, b) => b.score - a.score);
  return scores[0]?.score > 0 ? scores[0].category : null;
}

function findLodestoneSnapshotCandidates(snapshot, category) {
  const entries = snapshot.entries.map((entry) => ({
    names: [entry?.name, entry?.text, entry?.title, entry?.imageAlt, entry?.ariaLabel]
      .map(normalizeOcrText)
      .filter((value) => value.length >= 2),
    status: ["owned", "missing"].includes(entry?.status) ? entry.status : "unknown",
    ownershipEvidence: String(entry?.ownershipEvidence || "none"),
    source: snapshot.evidenceSource || snapshot.source || "unknown",
    observedAt: snapshot.fetchedAt || snapshot.capturedAt || null,
    externalId: Number(entry?.externalId),
    itemId: String(entry?.itemId || ""),
    dataId: String(entry?.dataId || "")
  })).filter((entry) => entry.names.length || Number.isFinite(entry.externalId) || entry.itemId || entry.dataId);

  const catalogItems = (state.catalog?.items || [])
    .filter((item) => item.category === category)
    .map((item) => ({
      item,
      aliases: Array.from(new Set([item.nameJa, item.nameEn, displayName(item)]
        .map(normalizeOcrText)
        .filter((name) => name.length >= 2)))
    }));
  const byInternalId = new Map(catalogItems.map(({ item }) => [item.id, item]));
  const byExternalId = new Map();
  const byGameItemId = new Map();
  const byName = new Map();
  for (const { item, aliases } of catalogItems) {
    const externalId = ffxivCollectIdForItem(item, category);
    if (externalId) byExternalId.set(String(externalId), item);
    const gameItemId = String(item?.externalIds?.item || "");
    if (gameItemId) byGameItemId.set(gameItemId, item);
    for (const alias of aliases) {
      const values = byName.get(alias) || [];
      if (!values.some((value) => value.id === item.id)) values.push(item);
      byName.set(alias, values);
    }
  }

  const matchesById = new Map();
  const metrics = { alreadyOwnedCount: 0, unmatchedCount: 0, conflictCount: 0, partialMatchCount: 0 };
  const addMatch = (item, entry, matchKind) => {
    const values = matchesById.get(item.id) || [];
    values.push({ ...entry, matchKind });
    matchesById.set(item.id, values);
  };

  for (const entry of entries) {
    const idMatches = [];
    if (Number.isFinite(entry.externalId) && entry.externalId > 0) idMatches.push(byExternalId.get(String(entry.externalId)));
    if (entry.itemId) idMatches.push(byInternalId.get(entry.itemId), byGameItemId.get(entry.itemId));
    if (entry.dataId) {
      idMatches.push(byInternalId.get(entry.dataId));
      const namespaced = entry.dataId.match(new RegExp(`^${category}-(\\d+)$`));
      if (namespaced) idMatches.push(byExternalId.get(namespaced[1]));
    }
    const resolvedIds = Array.from(new Map(idMatches.filter(Boolean).map((item) => [item.id, item])).values());
    if (resolvedIds.length > 1) {
      metrics.conflictCount += 1;
      continue;
    }
    if (resolvedIds.length === 1) {
      addMatch(resolvedIds[0], entry, "id");
      continue;
    }

    const exactMatches = Array.from(new Map(entry.names
      .flatMap((name) => byName.get(name) || [])
      .map((item) => [item.id, item])).values());
    if (exactMatches.length === 1) {
      addMatch(exactMatches[0], entry, "exact-name");
      continue;
    }
    if (exactMatches.length > 1) {
      metrics.conflictCount += 1;
      continue;
    }

    const partialMatches = catalogItems.map(({ item, aliases }) => ({
      item,
      alias: aliases.filter((alias) => entry.names.some((name) => name.includes(alias) || alias.includes(name)))
        .sort((a, b) => b.length - a.length)[0]
    })).filter(({ alias }) => alias).sort((a, b) => b.alias.length - a.alias.length).slice(0, 5);
    if (!partialMatches.length) metrics.unmatchedCount += 1;
    for (const { item } of partialMatches) {
      metrics.partialMatchCount += 1;
      addMatch(item, { ...entry, status: "unknown" }, "partial-name");
    }
  }

  const trustedOwnership = new Set(["owned-marker", "verified-owned-only-list", "ffxiv-collect-api", "lodestone-proxy-owned-list"]);
  const candidates = catalogItems
    .map(({ item }) => {
      const matches = matchesById.get(item.id) || [];
      if (!matches.length || matches.every((entry) => entry.status === "missing")) return null;
      if (getProgress(item.id).owned) {
        metrics.alreadyOwnedCount += 1;
        return null;
      }
      const statuses = new Set(matches.map((entry) => entry.status));
      const status = statuses.has("owned") && statuses.has("missing")
        ? "conflict"
        : statuses.has("owned") ? "owned" : "unknown";
      const strongIdentity = matches.every((entry) => entry.matchKind === "id" || entry.matchKind === "exact-name");
      return {
        item,
        status,
        matchKind: matches.some((entry) => entry.matchKind === "partial-name") ? "partial-name" : matches[0].matchKind,
        autoSelected: status === "owned" && strongIdentity && matches.some((entry) => trustedOwnership.has(entry.ownershipEvidence)),
        evidence: matches.map(({ source, observedAt, ownershipEvidence, matchKind, status: evidenceStatus }) => ({
          source, observedAt, ownershipEvidence, matchKind, status: evidenceStatus
        }))
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "owned" ? -1 : 1;
      return compareText(displayName(a.item), displayName(b.item));
    });
  Object.defineProperty(candidates, "metrics", { value: metrics, enumerable: false });
  return candidates;
}

function renderLodestoneSnapshotCandidates() {
  const candidates = state.lodestoneSnapshotCandidates;
  elements.lodestoneSnapshotCandidates.hidden = false;
  elements.applyLodestoneSnapshot.hidden = candidates.length === 0;
  elements.lodestoneSnapshotCandidateList.innerHTML = candidates.map(({ item, status, category, autoSelected, matchKind, evidence }) => `
    <label class="candidate-row">
      <input type="checkbox" value="${escapeAttr(item.id)}"${autoSelected ? " checked" : ""}>
      <span class="candidate-image${item.icon || item.image ? "" : " image-missing"}">
        ${item.icon || item.image ? `<img src="${escapeAttr(item.icon || item.image)}" alt="" loading="lazy">` : ""}
      </span>
      <span class="candidate-name">${escapeHtml(displayName(item))}</span>
      <span class="candidate-score">${escapeHtml(categoryLabel(category))} · ${status === "conflict" ? "競合" : autoSelected ? "根拠確認済み" : "要確認"} · ${matchKind === "id" ? "ID一致" : matchKind === "exact-name" ? "名前完全一致" : "部分一致"}${evidence?.[0]?.source ? ` · ${escapeHtml(evidence[0].source)}` : ""}</span>
    </label>
  `).join("");
  syncLodestoneSnapshotSummary();
}

function setAllLodestoneCandidates(checked) {
  elements.lodestoneSnapshotCandidateList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = checked;
  });
  syncLodestoneSnapshotSummary();
}

function syncLodestoneSnapshotSummary() {
  const inputs = Array.from(elements.lodestoneSnapshotCandidateList.querySelectorAll('input[type="checkbox"]'));
  const selected = inputs.filter((input) => input.checked).length;
  elements.lodestoneSnapshotSummary.textContent = `候補 ${inputs.length}件 / 選択 ${selected}件`;
  elements.applyLodestoneSnapshot.disabled = selected === 0;
}

async function applyLodestoneSnapshot() {
  const selectedIds = Array.from(elements.lodestoneSnapshotCandidateList.querySelectorAll('input[type="checkbox"]:checked'))
    .map((input) => input.value);
  if (!selectedIds.length) return;

  saveStoredJson(storageKeys.progressImportBackup, pruneProgress(state.progress));
  syncRestoreProgressAvailability();
  const importedAt = new Date().toISOString();
  const selectedSet = new Set(selectedIds);
  const selectedCandidates = state.lodestoneSnapshotCandidates.filter(({ item }) => selectedSet.has(item.id));
  for (const id of selectedIds) {
    const progress = getWritableProgress(id);
    progress.owned = true;
    progress.wanted = false;
    progress.updatedAt = importedAt;
  }
  const lodestoneProgress = {
    ...(state.progress.lodestone && typeof state.progress.lodestone === "object" ? state.progress.lodestone : {})
  };
  const collections = Array.isArray(state.lodestoneSnapshot.collections)
    ? state.lodestoneSnapshot.collections
    : [state.lodestoneSnapshot];
  const importedCategories = Array.from(new Set(selectedCandidates.map(({ category }) => category)));
  for (const category of importedCategories) {
    lodestoneProgress[category] = {
      importedAt,
      read: collections
        .filter((collection) => detectLodestoneSnapshotCategory(collection) === category)
        .reduce((total, collection) => total + collection.entries.length, 0),
      matched: selectedCandidates.filter((candidate) => candidate.category === category).length,
      source: "Lodestone bookmarklet"
    };
  }
  const firstCategory = importedCategories[0];
  lodestoneProgress.lastCategory = firstCategory;
  lodestoneProgress.lastImportedAt = importedAt;
  state.progress.lodestone = lodestoneProgress;

  try {
    await saveProgressNow();
    state.category = firstCategory;
    state.sourceType = "all";
    state.version = "all";
    state.selectedId = selectedIds[0];
    syncCategoryButtons();
    populateSourceFilter();
    populateVersionFilter();
    syncSortOptions();
    syncLodestoneAvailability();
    render();
    elements.lodestoneToolDialog.close();
    showToast(`${importedCategories.length}カテゴリ ${selectedIds.length}件を取得済みにしました`);
  } catch (error) {
    showToast(`反映内容を保存できませんでした: ${error.message}`, "error");
  }
}

function openScreenshotImport() {
  resetScreenshotImport();
  elements.screenshotImportTitle.textContent = `${categoryLabel(state.category)}の画像取り込み`;
  elements.screenshotImportDialog.showModal();
}

function closeScreenshotImport() {
  if (!state.screenshotImportRunning) {
    elements.screenshotImportDialog.close();
  }
}

function resetScreenshotImport() {
  if (state.screenshotImportRunning) return;
  state.screenshotCandidates = [];
  elements.screenshotFiles.value = "";
  elements.screenshotOwnedOnly.checked = false;
  elements.screenshotFileLabel.textContent = "画像を選択";
  elements.screenshotImportStatus.textContent = "";
  elements.screenshotImportProgress.hidden = true;
  elements.screenshotImportProgress.value = 0;
  elements.screenshotCandidates.hidden = true;
  elements.screenshotCandidateList.innerHTML = "";
  elements.applyScreenshotImport.hidden = true;
  syncScreenshotImportControls();
}

function handleScreenshotFilesChanged() {
  const files = Array.from(elements.screenshotFiles.files || []);
  elements.screenshotFileLabel.textContent = files.length
    ? `${files.length}枚の画像を選択中`
    : "画像を選択";
  state.screenshotCandidates = [];
  elements.screenshotCandidates.hidden = true;
  elements.screenshotCandidateList.innerHTML = "";
  elements.applyScreenshotImport.hidden = true;
  elements.screenshotImportStatus.textContent = "";
  syncScreenshotImportControls();
}

function syncScreenshotImportControls() {
  const hasFiles = Boolean(elements.screenshotFiles.files?.length);
  elements.analyzeScreenshots.disabled =
    state.screenshotImportRunning || !hasFiles || !elements.screenshotOwnedOnly.checked;
  elements.screenshotFiles.disabled = state.screenshotImportRunning;
  elements.screenshotOwnedOnly.disabled = state.screenshotImportRunning;
  elements.closeScreenshotImport.disabled = state.screenshotImportRunning;
  elements.cancelScreenshotImport.disabled = state.screenshotImportRunning;
}

async function analyzeScreenshots() {
  const files = Array.from(elements.screenshotFiles.files || []);
  if (!files.length || !elements.screenshotOwnedOnly.checked) return;

  state.screenshotImportRunning = true;
  state.screenshotCandidates = [];
  elements.screenshotCandidates.hidden = true;
  elements.applyScreenshotImport.hidden = true;
  elements.screenshotImportProgress.hidden = false;
  elements.screenshotImportProgress.value = 0;
  elements.screenshotImportStatus.textContent = "OCRを準備中";
  syncScreenshotImportControls();

  let worker;
  try {
    await loadTesseract();
    worker = await window.Tesseract.createWorker(["jpn", "eng"], window.Tesseract.OEM.LSTM_ONLY, {
      logger: updateScreenshotOcrProgress
    });

    const recognizedTexts = [];
    state.screenshotOcrFileCount = files.length;
    for (let index = 0; index < files.length; index += 1) {
      state.screenshotOcrFileIndex = index;
      elements.screenshotImportStatus.textContent = `画像を解析中 ${index + 1} / ${files.length}`;
      const result = await worker.recognize(files[index], { rotateAuto: true });
      recognizedTexts.push(result.data.text || "");
      elements.screenshotImportProgress.value = ((index + 1) / files.length) * 100;
    }

    state.screenshotCandidates = findScreenshotCandidates(recognizedTexts.join("\n"));
    renderScreenshotCandidates();
    elements.screenshotImportStatus.textContent = state.screenshotCandidates.length
      ? "候補を確認して反映してください"
      : "一致する項目を検出できませんでした";
  } catch (error) {
    console.error(error);
    elements.screenshotImportStatus.textContent = "画像の解析に失敗しました";
    showToast(`画像を解析できませんでした: ${error.message}`, "error");
  } finally {
    if (worker) await worker.terminate();
    state.screenshotImportRunning = false;
    elements.screenshotImportProgress.hidden = true;
    syncScreenshotImportControls();
    syncScreenshotCandidateSummary();
  }
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoadPromise) return tesseractLoadPromise;

  tesseractLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = tesseractScriptUrl;
    script.dataset.tesseract = "true";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => {
      script.remove();
      tesseractLoadPromise = null;
      reject(new Error("OCRライブラリを読み込めませんでした"));
    };
    document.head.append(script);
  });
  return tesseractLoadPromise;
}

function updateScreenshotOcrProgress(message) {
  if (message.status !== "recognizing text") return;
  const progress = Math.min(100, ((state.screenshotOcrFileIndex + Number(message.progress || 0)) / state.screenshotOcrFileCount) * 100);
  elements.screenshotImportProgress.value = progress;
}

function findScreenshotCandidates(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map(normalizeOcrText)
    .filter((line) => line.length >= 2);

  return categoryItems()
    .filter((item) => !getProgress(item.id).owned)
    .map((item) => {
      const aliases = Array.from(new Set([item.nameJa, item.nameEn, displayName(item)]
        .map(normalizeOcrText)
        .filter((alias) => alias.length >= 2)));
      let score = 0;

      for (const alias of aliases) {
        for (const line of lines) {
          if (line.includes(alias)) {
            score = 1;
            break;
          }
          if (alias.length >= 4) {
            score = Math.max(score, bestSubstringSimilarity(alias, line));
          }
        }
        if (score === 1) break;
      }

      return { item, score };
    })
    .filter((candidate) => candidate.score >= 0.84)
    .sort((a, b) => b.score - a.score || compareText(displayName(a.item), displayName(b.item)));
}

function normalizeOcrText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-‐‑‒–—―'’"“”.,:;!?()[\]{}（）【】「」『』・･]/g, "")
    .trim();
}

function bestSubstringSimilarity(target, text) {
  if (!target || !text) return 0;
  if (text.length <= target.length) {
    return 1 - levenshteinDistance(target, text) / Math.max(target.length, text.length);
  }

  let best = 0;
  for (let index = 0; index <= text.length - target.length; index += 1) {
    const fragment = text.slice(index, index + target.length);
    best = Math.max(best, 1 - levenshteinDistance(target, fragment) / target.length);
    if (best === 1) break;
  }
  return best;
}

function levenshteinDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function renderScreenshotCandidates() {
  const candidates = state.screenshotCandidates;
  elements.screenshotCandidates.hidden = false;
  elements.applyScreenshotImport.hidden = candidates.length === 0;
  elements.screenshotCandidateList.innerHTML = candidates.map(({ item, score }) => `
    <label class="candidate-row">
      <input type="checkbox" value="${escapeAttr(item.id)}" checked>
      <span class="candidate-image${item.icon || item.image ? "" : " image-missing"}">
        ${item.icon || item.image ? `<img src="${escapeAttr(item.icon || item.image)}" alt="" loading="lazy">` : ""}
      </span>
      <span class="candidate-name">${escapeHtml(displayName(item))}</span>
      <span class="candidate-score">${score === 1 ? "完全一致" : `近似 ${Math.round(score * 100)}%`}</span>
    </label>
  `).join("");
  syncScreenshotCandidateSummary();
}

function setAllScreenshotCandidates(checked) {
  elements.screenshotCandidateList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = checked;
  });
  syncScreenshotCandidateSummary();
}

function syncScreenshotCandidateSummary() {
  const inputs = Array.from(elements.screenshotCandidateList.querySelectorAll('input[type="checkbox"]'));
  const selected = inputs.filter((input) => input.checked).length;
  elements.screenshotCandidateSummary.textContent = `候補 ${inputs.length}件 / 選択 ${selected}件`;
  elements.applyScreenshotImport.disabled = selected === 0 || state.screenshotImportRunning;
}

async function applyScreenshotImport() {
  const selectedIds = Array.from(elements.screenshotCandidateList.querySelectorAll('input[type="checkbox"]:checked'))
    .map((input) => input.value);
  if (!selectedIds.length) return;

  const importedAt = new Date().toISOString();
  for (const id of selectedIds) {
    const progress = getWritableProgress(id);
    progress.owned = true;
    progress.wanted = false;
    progress.updatedAt = importedAt;
  }
  state.progress.screenshot = {
    category: state.category,
    importedAt,
    matched: selectedIds.length
  };

  try {
    await saveProgressNow();
    render();
    elements.screenshotImportDialog.close();
    showToast(`${categoryLabel(state.category)} ${selectedIds.length}件を取得済みにしました`);
  } catch (error) {
    showToast(`反映内容を保存できませんでした: ${error.message}`, "error");
  }
}

function displayName(item) {
  return item.nameJa || item.nameEn || "Unknown Minion";
}

function categoryLabel(category) {
  return categoryLabels[category] || category || "コレクション";
}

function sourceSummaryText(item) {
  return item.sourceSummaryJa || item.sourceSummary || "入手方法未確認";
}

function descriptionText(item) {
  return item.descriptionJa || item.description || "";
}

function sourceLabel(item) {
  return sourceLabels[item.sourceType] || item.sourceType || "その他";
}

function tradeableTag(item) {
  if (item.tradeable === true) return "<span>取引可</span>";
  if (item.tradeable === false) return "<span>取引不可</span>";
  return "";
}

function tradeableChip(item) {
  if (item.tradeable === true) return "<span>取引可</span>";
  if (item.tradeable === false) return "<span>取引不可</span>";
  return "";
}

function referenceLinkHtml(reference) {
  const url = safeExternalUrl(reference?.url);
  if (!url) {
    return "";
  }

  return `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(reference.title || "Reference")}</a>`;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""), location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function formatDate(value) {
  if (!value) return "Seed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function showToast(message, tone = "normal") {
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", tone === "error");
  elements.toast.classList.add("visible");
  clearTimeout(elements.toast.hideTimer);
  elements.toast.hideTimer = setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, tone === "error" ? 8000 : 3200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

init();
