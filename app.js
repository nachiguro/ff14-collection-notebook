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
  saveTimer: null
};

const elements = {
  refreshCatalog: document.querySelector("#refreshCatalog"),
  exportProgress: document.querySelector("#exportProgress"),
  importProgress: document.querySelector("#importProgress"),
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
  fashion: "傘/ファッションアクセサリー"
};

const lodestoneCategories = {
  mount: "mounts",
  minion: "minions"
};

const lodestoneProxyTooltipBatchSize = 20;

const storageKeys = {
  progress: "ff14CollectionNotebook.progress.v1",
  settings: "ff14CollectionNotebook.settings.v1"
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

const numberedSortCategories = new Set(["orchestrion", "card"]);

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
  loadData();
}

function bindEvents() {
  elements.categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      state.sourceType = "all";
      state.version = "all";
      state.selectedId = null;
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
    state.search = event.target.value.trim().toLowerCase();
    render();
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
    state.detailVisible = false;
    syncDetailPanel();
  });
  elements.importLodestone.addEventListener("click", importLodestone);
  elements.lodestoneInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      importLodestone();
    }
  });
  elements.exportProgress.addEventListener("click", exportProgress);
  elements.importProgress.addEventListener("change", importProgress);
}

async function loadData() {
  try {
    const { catalog, progress, settings, storageMode, config } = await loadAppData();

    state.catalog = catalog;
    state.progress = normalizeProgress(progress);
    state.settings = settings;
    state.storageMode = storageMode;
    state.config = { ...defaultAppConfig, ...(config || {}) };
    state.sort = settings.defaultSort || "patch-desc";
    syncCategoryButtons();
    populateSourceFilter();
    populateVersionFilter();
    syncSortOptions();
    syncLodestoneAvailability();
    selectFirstItem();
    render();
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

function normalizeProgress(progress) {
  const normalized = {
    schemaVersion: 1,
    updatedAt: progress?.updatedAt || null,
    items: progress?.items && typeof progress.items === "object" ? progress.items : {}
  };

  if (progress?.lodestone && typeof progress.lodestone === "object") {
    normalized.lodestone = progress.lodestone;
  }

  return normalized;
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
  elements.lodestoneInput.disabled = !supportsLodestone;
  elements.importLodestone.disabled = !supportsLodestone;
  elements.lodestoneInput.placeholder = supportsLodestone
    ? "Lodestone キャラクターURL / ID"
    : "Lodestone読込はミニオン/マウントのみ対応";
}

function syncViewButtons() {
  elements.viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.layout === state.layout);
  });
}

function syncDetailPanel() {
  elements.contentGrid.classList.toggle("detail-collapsed", !state.detailVisible);
  elements.detailPanel.classList.toggle("collapsed", !state.detailVisible);
}

function selectFirstItem() {
  const first = categoryItems()[0];
  state.selectedId = first?.id || null;
}

function getProgress(itemId) {
  if (!state.progress.items[itemId]) {
    state.progress.items[itemId] = {
      owned: false,
      wanted: false,
      priority: "none",
      notes: "",
      updatedAt: null
    };
  }
  return state.progress.items[itemId];
}

function itemsWithProgress() {
  return categoryItems().map((item) => ({
    ...item,
    progress: getProgress(item.id)
  }));
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

      return [
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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort(sorter(state.sort));
}

function sorter(sortKey) {
  if (sortKey === "orchestrion-category-number-asc") {
    return (a, b) =>
      orchestrionCategoryRank(a) - orchestrionCategoryRank(b) ||
      collectionNumber(a) - collectionNumber(b) ||
      displayName(a).localeCompare(displayName(b));
  }

  if (sortKey === "number-asc") {
    return (a, b) =>
      collectionNumberGroup(a) - collectionNumberGroup(b) ||
      collectionNumber(a) - collectionNumber(b) ||
      displayName(a).localeCompare(displayName(b));
  }

  if (sortKey === "name-asc") {
    return (a, b) => displayName(a).localeCompare(displayName(b));
  }

  if (sortKey === "source-asc") {
    return (a, b) => sourceLabel(a).localeCompare(sourceLabel(b)) || displayName(a).localeCompare(displayName(b));
  }

  if (sortKey === "priority-desc") {
    const score = { high: 3, medium: 2, low: 1, none: 0 };
    return (a, b) => (score[b.progress.priority] || 0) - (score[a.progress.priority] || 0) || displayName(a).localeCompare(displayName(b));
  }

  return (a, b) => patchNumber(b.patch) - patchNumber(a.patch) || displayName(a).localeCompare(displayName(b));
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
            <img src="${escapeAttr(item.icon || item.image || "")}" alt="" loading="lazy" onerror="this.closest('.portrait-frame').classList.add('image-missing')">
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
            <button class="icon-button ${item.progress.owned ? "active" : ""}" data-action="owned" title="取得済み" aria-label="取得済み"></button>
            <button class="icon-button star ${item.progress.wanted ? "active" : ""}" data-action="wanted" title="欲しい" aria-label="欲しい"></button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.minionGrid.querySelectorAll(".minion-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      const id = card.dataset.id;
      if (!action) return;

      if (action === "select") {
        state.selectedId = id;
        state.detailVisible = true;
        render();
        return;
      }

      if (action === "owned") {
        toggleOwned(id);
        return;
      }

      if (action === "wanted") {
        toggleWanted(id);
      }
    });
  });
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
        <img src="${escapeAttr(item.image || item.icon || "")}" alt="" onerror="this.closest('.detail-image').classList.add('image-missing')">
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
      <button class="button ${item.progress.owned ? "active" : ""}" data-detail-action="owned" type="button">取得済み</button>
      <button class="button ${item.progress.wanted ? "active" : ""}" data-detail-action="wanted" type="button">欲しい</button>
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
      ${(item.references || []).map((reference) => `
        <a href="${escapeAttr(reference.url)}" target="_blank" rel="noreferrer">${escapeHtml(reference.title || "Reference")}</a>
      `).join("")}
    </div>
  `;

  elements.detailContent.querySelectorAll("[data-detail-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.detailAction === "owned") toggleOwned(item.id);
      if (button.dataset.detailAction === "wanted") toggleWanted(item.id);
    });
  });

  elements.detailContent.querySelector("#prioritySelect").addEventListener("change", (event) => {
    const progress = getProgress(item.id);
    progress.priority = event.target.value;
    progress.updatedAt = new Date().toISOString();
    scheduleSave();
    render();
  });

  elements.detailContent.querySelector("#notesInput").addEventListener("input", (event) => {
    const progress = getProgress(item.id);
    progress.notes = event.target.value;
    progress.updatedAt = new Date().toISOString();
    scheduleSave(false);
  });
}

function toggleOwned(id) {
  const progress = getProgress(id);
  progress.owned = !progress.owned;
  if (progress.owned) {
    progress.wanted = false;
  }
  progress.updatedAt = new Date().toISOString();
  scheduleSave();
  render();
}

function toggleWanted(id) {
  const progress = getProgress(id);
  progress.wanted = !progress.wanted;
  if (progress.wanted && progress.priority === "none") {
    progress.priority = "medium";
  }
  progress.updatedAt = new Date().toISOString();
  scheduleSave();
  render();
}

function scheduleSave(withToast = true) {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(async () => {
    try {
      state.progress.schemaVersion = 1;
      state.progress.updatedAt = new Date().toISOString();

      if (state.storageMode === "browser") {
        saveStoredJson(storageKeys.progress, state.progress);
      } else {
        await fetchJson("/api/progress", {
          method: "PUT",
          body: JSON.stringify(state.progress)
        });
      }

      if (withToast) showToast("保存しました");
    } catch (error) {
      showToast(error.message, "error");
    }
  }, 350);
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
    showToast(`${result.count}件のコレクションを読み込みました`);
  } catch (error) {
    showToast(`更新できませんでした: ${error.message}`, "error");
  } finally {
    elements.refreshCatalog.disabled = false;
    elements.refreshCatalog.textContent = "カタログ更新";
  }
}

async function importLodestone() {
  const endpointCategory = lodestoneCategories[state.category];
  if (!endpointCategory) {
    showToast(`${categoryLabel(state.category)}はLodestone読込に対応していません`, "error");
    return;
  }

  const character = elements.lodestoneInput.value.trim();
  if (!character) {
    showToast("LodestoneのキャラクターURL、またはIDを入力してください", "error");
    return;
  }

  elements.importLodestone.disabled = true;
  elements.importLodestone.textContent = "読込中";

  try {
    if (state.storageMode === "browser") {
      const result = await importLodestoneViaFfxivCollect(character, endpointCategory, state.category);
      state.progress = normalizeProgress(result.progress);
      render();
      showToast(`Lodestone: ${categoryLabel(state.category)} ${result.read}件中 ${result.matched}件を取得済みにしました`);
      return;
    }

    const result = await fetchJson(`/api/lodestone/${endpointCategory}/import`, {
      method: "POST",
      body: JSON.stringify({ character })
    });
    state.progress = normalizeProgress(result.progress);
    state.catalog = await fetchJson("/api/catalog");
    populateSourceFilter();
    populateVersionFilter();
    syncSortOptions();
    render();
    showToast(`Lodestone: ${categoryLabel(state.category)} ${result.read}件中 ${result.matched}件を取得済みにしました`);
  } catch (error) {
    showToast(`読み込めませんでした: ${error.message}`, "error");
  } finally {
    elements.importLodestone.textContent = "Lodestone読込";
    syncLodestoneAvailability();
  }
}

async function importLodestoneViaFfxivCollect(characterInput, endpointCategory, categoryKey) {
  const characterId = parseCharacterId(characterInput);
  if (!characterId) {
    throw new Error("LodestoneのキャラクターURL、またはIDを入力してください");
  }

  try {
    const characterUrl = `https://ffxivcollect.com/api/characters/${encodeURIComponent(characterId)}`;
    const character = await fetchExternalJson(characterUrl);
    const categoryStatus = character?.[endpointCategory];
    if (categoryStatus?.public === false) {
      throw new Error(`${categoryLabel(categoryKey)}の公開設定がオフになっているようです。Lodestone側の公開設定を確認してください。`);
    }

    const ownedUrl = `${characterUrl}/${endpointCategory}/owned`;
    const ownedItems = await fetchExternalJson(ownedUrl);
    if (!Array.isArray(ownedItems)) {
      throw new Error("FFXIV Collectから所持情報を読み取れませんでした");
    }

    return applyOwnedCollectionImport({
      characterId,
      categoryKey,
      ownedItems,
      total: categoryStatus?.count ?? ownedItems.length,
      source: "FFXIV Collect API",
      characterName: character?.name || "",
      server: character?.server || ""
    });
  } catch (error) {
    return importLodestoneViaProxy(characterId, endpointCategory, categoryKey, error);
  }
}

async function importLodestoneViaProxy(characterId, endpointCategory, categoryKey, originalError) {
  const proxyBaseUrl = String(state.config?.lodestoneProxyUrl || "").trim().replace(/\/+$/, "");
  if (!proxyBaseUrl) {
    throw new Error(`ブラウザ版のLodestone読込にはCloudflare Workerの設定が必要です。FFXIV Collect API: ${originalError.message}`);
  }

  const collectionUrl = new URL(`${proxyBaseUrl}/collection`);
  collectionUrl.searchParams.set("characterId", characterId);
  collectionUrl.searchParams.set("category", categoryKey);

  const collection = await fetchExternalJson(collectionUrl.toString());
  const tooltipUrls = Array.isArray(collection.tooltipUrls) ? collection.tooltipUrls : [];

  if (tooltipUrls.length === 0) {
    throw new Error(`${categoryLabel(categoryKey)}のLodestone一覧を読み取れませんでした。公開設定を確認してください。`);
  }

  const ownedItems = [];

  for (let index = 0; index < tooltipUrls.length; index += lodestoneProxyTooltipBatchSize) {
    const batch = tooltipUrls.slice(index, index + lodestoneProxyTooltipBatchSize);
    elements.importLodestone.textContent = `読込中 ${Math.min(index + batch.length, tooltipUrls.length)}/${tooltipUrls.length}`;

    const tooltipResult = await fetchExternalJson(`${proxyBaseUrl}/tooltips`, {
      method: "POST",
      body: JSON.stringify({
        category: categoryKey,
        urls: batch
      })
    });

    if (Array.isArray(tooltipResult.items)) {
      ownedItems.push(...tooltipResult.items);
    }
  }

  if (ownedItems.length === 0) {
    throw new Error("Lodestoneから取得済みアイテムを読み取れませんでした。");
  }

  return applyOwnedCollectionImport({
    characterId: collection.characterId || characterId,
    categoryKey,
    ownedItems,
    total: collection.total ?? ownedItems.length,
    source: "Lodestone via Cloudflare Workers",
    characterName: collection.characterName || "",
    server: collection.server || ""
  });
}

function applyOwnedCollectionImport({ characterId, categoryKey, ownedItems, total, source, characterName, server }) {
  const catalogItems = categoryItems();
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
      if (normalized) byName.set(normalized, item);
    });
  }

  const matched = [];
  const unmatched = [];
  const importedAt = new Date().toISOString();

  for (const ownedItem of ownedItems) {
    const externalId = Number(ownedItem?.id);
    const item =
      byItemId.get(ownedItem?.itemId) ||
      byExternalId.get(externalId) ||
      byName.get(normalizeCollectionName(ownedItem?.name || ownedItem?.nameJa || ownedItem?.nameEn));

    if (!item) {
      unmatched.push(ownedItem?.name || ownedItem?.nameJa || ownedItem?.itemId || String(ownedItem?.id || ""));
      continue;
    }

    const progress = getProgress(item.id);
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
      unmatched: unmatched.slice(0, 50),
      source
    },
    lastCategory: categoryKey,
    lastImportedAt: importedAt
  };

  saveStoredJson(storageKeys.progress, state.progress);

  return {
    characterId,
    read: ownedItems.length,
    matched: matched.length,
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
    .toLowerCase()
    .replace(/[\s\-‐‑‒–—―'’"“”.,:;!?()[\]{}（）【】「」『』・]/g, "")
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
    const progress = normalizeProgress(imported);
    progress.updatedAt = new Date().toISOString();

    if (state.storageMode === "browser") {
      saveStoredJson(storageKeys.progress, progress);
      state.progress = progress;
    } else {
      const result = await fetchJson("/api/progress/import", {
        method: "POST",
        body: JSON.stringify(progress)
      });
      state.progress = normalizeProgress(result.progress);
    }

    render();
    showToast("読み込みました");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    event.target.value = "";
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
  }, tone === "error" ? 15000 : 3200);
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
