const APP_CONFIG = {
  title: "SenBulk",
  maintainer: "DemariaLab",
  maintainerUrl: "https://demarialab.com/",
  lastUpdated: "2026 March",
  issueUrl: ""
};

const PLOT_PREFERENCES_KEY = "senbulk-plot-preferences";
const PLOT_SCALE_LIMITS = { min: 50, max: 300, fallback: 150 };
const DOT_SCALE_LIMITS = { min: 5, max: 300, fallback: 40 };
const PLOT_SURFACE_LIMITS = { minWidth: 320, minHeight: 320, maxHeight: 5000 };
const PNG_EXPORT_WIDTH = 2000;
const COPY_CSV_BUTTON_DEFAULT = "Copy CSV";
const COPY_CSV_BUTTON_SUCCESS = "Copied to clipboard!";
const PLOT_LEGEND_RADIUS = 5;
const HOME_TRY_GENES = ["CDKN2A", "HMGB2", "CCND1"];

const state = {
  currentView: "home",
  activeGene: "",
  currentCsvText: "",
  plotColorMode: "significance",
  plotScale: 150,
  plotDotScale: 40,
  showDotOutline: false,
  plotSurfaceWidth: null,
  plotSurfaceHeight: null,
  manifestCache: new Map(),
  manifestRequests: new Map(),
  geneRequestId: 0,
  currentPlotRows: [],
  searchBoxes: [],
  activeTab: "plot",
  theme: "light",
  copyCsvFeedbackTimeout: null,
  homeTryGenesDismissed: false
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  initialisePlotPreferences();
  initialiseTheme();
  initialiseFooter();
  initialiseShell();
  initialisePlotSurfaceResizing();
  initialiseSearch();
  hydrateRoute();
});

function bindElements() {
  elements.body = document.body;
  elements.topbar = document.querySelector(".topbar");
  elements.brandHomeButton = document.getElementById("brand-home-button");
  elements.homeScreen = document.getElementById("home-screen");
  elements.dashboardScreen = document.getElementById("dashboard-screen");
  elements.loadingProgress = document.getElementById("loading-progress");
  elements.themeToggles = Array.from(document.querySelectorAll("[data-theme-toggle]"));
  elements.homeAboutToggle = document.getElementById("home-about-toggle");
  elements.aboutDialog = document.getElementById("about-dialog");
  elements.aboutDialogClose = document.getElementById("about-dialog-close");
  elements.homeSearchMount = document.getElementById("home-search-mount");
  elements.dashboardSearchMount = document.getElementById("dashboard-search-mount");
  elements.sharedSearchShell = document.getElementById("shared-search-shell");
  elements.sharedSearchForm = document.getElementById("home-search-form");
  elements.sharedSearchField = document.getElementById("shared-search-field");
  elements.sharedSearchInput = document.getElementById("home-search-input");
  elements.sharedSearchSubmit = document.getElementById("home-search-submit");
  elements.footerMaintainer = document.getElementById("footer-maintainer");
  elements.footerMaintainerLink = document.getElementById("footer-maintainer-link");
  elements.footerUpdated = document.getElementById("footer-updated");
  elements.footerRepoLink = document.getElementById("footer-repo-link");
  elements.plotDescriptionText = document.getElementById("plot-description-text");
  elements.plotSurface = document.querySelector(".plot-surface");
  elements.plotHost = document.getElementById("forest-plot");
  elements.plotStatusCard = document.getElementById("plot-status-card");
  elements.plotResizeHandles = Array.from(document.querySelectorAll("[data-resize-handle]"));
  elements.exportPngButton = document.getElementById("export-png-button");
  elements.exportSvgButton = document.getElementById("export-svg-button");
  elements.copyCsvButton = document.getElementById("copy-csv-button");
  elements.rawCsvContent = document.getElementById("raw-csv-content");
  elements.viewTabs = document.querySelector(".view-tabs");
  elements.viewTabIndicator = document.getElementById("view-tab-indicator");
  elements.tabButtons = Array.from(document.querySelectorAll("[data-tab-target]"));
  elements.tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
  elements.plotColorModeSelect = document.getElementById("plot-color-mode");
  elements.plotScaleSlider = document.getElementById("plot-scale-slider");
  elements.plotScaleInput = document.getElementById("plot-scale-input");
  elements.plotDotScaleSlider = document.getElementById("plot-dot-scale-slider");
  elements.plotDotScaleInput = document.getElementById("plot-dot-scale-input");
  elements.plotDotOutlineInput = document.getElementById("plot-dot-outline");
  elements.directionSignificantOnlyInput = document.getElementById("direction-significant-only");
  elements.summaryEyebrow = document.getElementById("summary-eyebrow");
  elements.statComparisons = document.getElementById("stat-comparisons");
  elements.statSignificant = document.getElementById("stat-significant");
  elements.statMedian = document.getElementById("stat-median");
  elements.directionUpCount = document.getElementById("direction-up-count");
  elements.directionDownCount = document.getElementById("direction-down-count");
  elements.directionUpBar = document.getElementById("direction-up-bar");
  elements.directionDownBar = document.getElementById("direction-down-bar");
  elements.directionUpLabel = document.getElementById("direction-up-label");
  elements.directionDownLabel = document.getElementById("direction-down-label");
  elements.liveRegion = document.getElementById("live-region");
}

function initialisePlotPreferences() {
  const stored = readStoredPlotPreferences();
  if (stored) {
    state.plotColorMode = sanitisePlotColorMode(stored.plotColorMode);
    state.plotScale = sanitiseBoundedInteger(stored.plotScale, PLOT_SCALE_LIMITS);
    state.plotDotScale = sanitiseBoundedInteger(stored.plotDotScale, DOT_SCALE_LIMITS);
    if (typeof stored.showDotOutline === "boolean") {
      state.showDotOutline = stored.showDotOutline;
    }
    if (Number.isFinite(stored.plotSurfaceWidth)) {
      state.plotSurfaceWidth = Math.round(stored.plotSurfaceWidth);
    }
    if (Number.isFinite(stored.plotSurfaceHeight)) {
      state.plotSurfaceHeight = Math.round(stored.plotSurfaceHeight);
    }
  }

  syncPlotPreferenceControls();
}

function readStoredPlotPreferences() {
  try {
    const raw = window.localStorage.getItem(PLOT_PREFERENCES_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function persistPlotPreferences() {
  const payload = {
    plotColorMode: state.plotColorMode,
    plotScale: state.plotScale,
    plotDotScale: state.plotDotScale,
    showDotOutline: state.showDotOutline,
    plotSurfaceWidth: state.plotSurfaceWidth,
    plotSurfaceHeight: state.plotSurfaceHeight
  };

  try {
    window.localStorage.setItem(PLOT_PREFERENCES_KEY, JSON.stringify(payload));
  } catch (error) {
    return;
  }
}

function syncPlotPreferenceControls() {
  elements.plotColorModeSelect.value = state.plotColorMode;
  syncRangedControl(elements.plotScaleSlider, elements.plotScaleInput, state.plotScale);
  syncRangedControl(elements.plotDotScaleSlider, elements.plotDotScaleInput, state.plotDotScale);
  elements.plotDotOutlineInput.checked = state.showDotOutline;
}

function initialiseTheme() {
  const storedTheme = window.localStorage.getItem("senbulk-theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  state.theme = storedTheme || (systemDark ? "dark" : "light");
  applyTheme(state.theme);

  elements.themeToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      window.localStorage.setItem("senbulk-theme", state.theme);
      applyTheme(state.theme);
    });
  });
}

function applyTheme(theme) {
  elements.body.dataset.theme = theme;
  elements.themeToggles.forEach((toggle) => {
    toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  });
}

function initialiseFooter() {
  elements.footerMaintainer.textContent = `Maintained by ${APP_CONFIG.maintainer}`;
  elements.footerUpdated.textContent = `Data last updated on ${APP_CONFIG.lastUpdated}`;
  elements.footerMaintainerLink.href = APP_CONFIG.maintainerUrl || "#";

  const repoUrl = resolveRepoUrl();
  elements.footerRepoLink.href = repoUrl || "#";

  if (!APP_CONFIG.maintainerUrl) {
    elements.footerMaintainerLink.setAttribute("aria-disabled", "true");
    elements.footerMaintainerLink.addEventListener("click", (event) => event.preventDefault());
  }

  if (!repoUrl) {
    elements.footerRepoLink.setAttribute("aria-disabled", "true");
    elements.footerRepoLink.addEventListener("click", (event) => event.preventDefault());
  }
}

function resolveRepoUrl() {
  if (APP_CONFIG.issueUrl) {
    return APP_CONFIG.issueUrl.replace(/\/issues\/?$/, "");
  }

  const hostname = window.location.hostname;
  if (!hostname.endsWith("github.io")) {
    return "";
  }

  const owner = hostname.split(".")[0];
  const firstPathSegment = window.location.pathname.split("/").filter(Boolean)[0];
  if (!owner || !firstPathSegment) {
    return "";
  }

  return `https://github.com/${owner}/${firstPathSegment}`;
}

function initialiseShell() {
  elements.brandHomeButton.addEventListener("click", () => {
    showHome();
  });
  elements.homeAboutToggle.addEventListener("click", openAboutDialog);
  elements.aboutDialogClose.addEventListener("click", () => closeAboutDialog({ restoreFocus: true }));
  elements.aboutDialog.addEventListener("click", (event) => {
    if (event.target === elements.aboutDialog) {
      closeAboutDialog({ restoreFocus: true });
    }
  });

  elements.exportPngButton.addEventListener("click", () => exportPlotImage("png"));
  elements.exportSvgButton.addEventListener("click", () => exportPlotImage("svg"));
  elements.copyCsvButton.addEventListener("click", copyRawCsvToClipboard);
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectTab(button.dataset.tabTarget);
    });
  });
  elements.plotColorModeSelect.addEventListener("change", () => {
    state.plotColorMode = sanitisePlotColorMode(elements.plotColorModeSelect.value);
    persistPlotPreferences();
    rerenderActivePlot();
  });
  initialiseRangedPlotControl({
    slider: elements.plotScaleSlider,
    input: elements.plotScaleInput,
    limits: PLOT_SCALE_LIMITS,
    getValue: () => state.plotScale,
    setValue: (value) => {
      state.plotScale = value;
      persistPlotPreferences();
      rerenderActivePlot();
    }
  });
  initialiseRangedPlotControl({
    slider: elements.plotDotScaleSlider,
    input: elements.plotDotScaleInput,
    limits: DOT_SCALE_LIMITS,
    getValue: () => state.plotDotScale,
    setValue: (value) => {
      state.plotDotScale = value;
      persistPlotPreferences();
      rerenderActivePlot();
    }
  });
  elements.plotDotOutlineInput.addEventListener("change", () => {
    state.showDotOutline = elements.plotDotOutlineInput.checked;
    persistPlotPreferences();
    rerenderActivePlot();
  });
  elements.directionSignificantOnlyInput.addEventListener("change", () => {
    updateDirectionSummary(state.currentPlotRows);
  });

  window.addEventListener("popstate", () => {
    hydrateRoute();
  });
  window.addEventListener("resize", () => {
    applyPlotSurfaceDimensions({ persist: true });
    schedulePlotlyResize();
    updateTabIndicator();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.aboutDialog.classList.contains("is-hidden")) {
      closeAboutDialog({ restoreFocus: true });
    }
  });
}

function openAboutDialog() {
  elements.homeAboutToggle.setAttribute("aria-expanded", "true");
  elements.aboutDialog.classList.remove("is-hidden");
  elements.aboutDialogClose.focus();
}

function closeAboutDialog(options = {}) {
  elements.homeAboutToggle.setAttribute("aria-expanded", "false");
  elements.aboutDialog.classList.add("is-hidden");
  if (options.restoreFocus) {
    elements.homeAboutToggle.focus();
  }
}

function initialisePlotSurfaceResizing() {
  applyPlotSurfaceDimensions();

  elements.plotResizeHandles.forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      startPlotSurfaceResize(event, handle.dataset.resizeHandle);
    });
  });
}

function startPlotSurfaceResize(event, direction) {
  if (!elements.plotSurface || !direction) {
    return;
  }

  event.preventDefault();
  const startRect = elements.plotSurface.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;

  elements.body.classList.add("is-resizing-plot");
  elements.body.dataset.resizeDirection = direction;

  const onPointerMove = (moveEvent) => {
    let nextWidth = startRect.width;
    let nextHeight = startRect.height;

    if (direction.includes("east")) {
      nextWidth += moveEvent.clientX - startX;
    }
    if (direction.includes("south")) {
      nextHeight += moveEvent.clientY - startY;
    }

    applyPlotSurfaceDimensions({
      width: nextWidth,
      height: nextHeight,
      persist: false
    });
    schedulePlotlyResize();
  };

  const stopResizing = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopResizing);
    window.removeEventListener("pointercancel", stopResizing);
    elements.body.classList.remove("is-resizing-plot");
    delete elements.body.dataset.resizeDirection;
    persistPlotPreferences();
    schedulePlotlyResize();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopResizing);
  window.addEventListener("pointercancel", stopResizing);
}

function initialiseRangedPlotControl(options) {
  const { slider, input, limits, getValue, setValue } = options;
  syncRangedControl(slider, input, getValue());

  slider.addEventListener("input", () => {
    const nextValue = sanitiseBoundedInteger(slider.value, limits);
    syncRangedControl(slider, input, nextValue);
    setValue(nextValue);
  });

  input.addEventListener("change", () => {
    commitRangedNumberInput(input, slider, limits, getValue, setValue);
  });

  input.addEventListener("blur", () => {
    if (input.value === "" || input.validity.badInput) {
      syncRangedControl(slider, input, getValue());
      return;
    }

    commitRangedNumberInput(input, slider, limits, getValue, setValue);
  });
}

function commitRangedNumberInput(input, slider, limits, getValue, setValue) {
  if (input.value === "" || input.validity.badInput) {
    syncRangedControl(slider, input, getValue());
    return;
  }

  const nextValue = sanitiseBoundedInteger(input.value, limits);
  syncRangedControl(slider, input, nextValue);
  setValue(nextValue);
}

function syncRangedControl(slider, input, value) {
  slider.value = String(value);
  input.value = String(value);
  updateRangeProgress(slider);
}

function updateRangeProgress(slider) {
  const minimum = Number.parseFloat(slider.min);
  const maximum = Number.parseFloat(slider.max);
  const current = Number.parseFloat(slider.value);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || !Number.isFinite(current) || maximum <= minimum) {
    slider.style.setProperty("--range-progress", "0%");
    return;
  }

  const progress = ((current - minimum) / (maximum - minimum)) * 100;
  slider.style.setProperty("--range-progress", `${Math.min(Math.max(progress, 0), 100)}%`);
}

function applyPlotSurfaceDimensions(options = {}) {
  if (!elements.plotSurface) {
    return;
  }

  const parentWidth = elements.plotSurface.parentElement ? elements.plotSurface.parentElement.clientWidth : 0;
  const maxWidth = Math.max(PLOT_SURFACE_LIMITS.minWidth, parentWidth || PLOT_SURFACE_LIMITS.minWidth);

  if (Number.isFinite(options.width)) {
    state.plotSurfaceWidth = clampDimension(options.width, PLOT_SURFACE_LIMITS.minWidth, maxWidth);
  } else if (Number.isFinite(state.plotSurfaceWidth) && parentWidth) {
    state.plotSurfaceWidth = clampDimension(state.plotSurfaceWidth, PLOT_SURFACE_LIMITS.minWidth, maxWidth);
  }

  if (Number.isFinite(options.height)) {
    state.plotSurfaceHeight = clampDimension(options.height, PLOT_SURFACE_LIMITS.minHeight, PLOT_SURFACE_LIMITS.maxHeight);
  } else if (Number.isFinite(state.plotSurfaceHeight)) {
    state.plotSurfaceHeight = clampDimension(state.plotSurfaceHeight, PLOT_SURFACE_LIMITS.minHeight, PLOT_SURFACE_LIMITS.maxHeight);
  }

  if (Number.isFinite(state.plotSurfaceWidth)) {
    elements.plotSurface.style.width = `${state.plotSurfaceWidth}px`;
  } else {
    elements.plotSurface.style.width = "";
  }

  if (Number.isFinite(state.plotSurfaceHeight)) {
    elements.plotSurface.style.height = `${state.plotSurfaceHeight}px`;
  } else {
    elements.plotSurface.style.height = "";
  }

  if (options.persist) {
    persistPlotPreferences();
  }
}

function ensurePlotSurfaceHeight(minimumHeight) {
  if (!elements.plotSurface) {
    return PLOT_SURFACE_LIMITS.minHeight;
  }

  const preferredHeight = Number.isFinite(state.plotSurfaceHeight) ? state.plotSurfaceHeight : null;
  let baseHeight = PLOT_SURFACE_LIMITS.minHeight;

  if (preferredHeight) {
    baseHeight = preferredHeight;
  } else {
    const previousHeight = elements.plotSurface.style.height;
    elements.plotSurface.style.height = "";
    baseHeight = Math.round(elements.plotSurface.getBoundingClientRect().height) || PLOT_SURFACE_LIMITS.minHeight;
    elements.plotSurface.style.height = previousHeight;
  }

  const nextHeight = clampDimension(Math.max(baseHeight, minimumHeight || 0), PLOT_SURFACE_LIMITS.minHeight, PLOT_SURFACE_LIMITS.maxHeight);

  if (preferredHeight) {
    elements.plotSurface.style.height = `${nextHeight}px`;
    return nextHeight;
  }

  if (nextHeight > baseHeight) {
    elements.plotSurface.style.height = `${nextHeight}px`;
    return nextHeight;
  }

  elements.plotSurface.style.height = "";
  return baseHeight;
}

function clampDimension(value, minimum, maximum) {
  return Math.round(Math.min(Math.max(value, minimum), maximum));
}

function schedulePlotlyResize() {
  if (typeof window.Plotly === "undefined" || !elements.plotHost || elements.plotHost.classList.contains("is-hidden")) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (typeof window.Plotly !== "undefined" && !elements.plotHost.classList.contains("is-hidden")) {
      window.Plotly.Plots.resize(elements.plotHost);
      window.requestAnimationFrame(() => {
        applyPlotLegendCornerRadius();
      });
    }
  });
}

function initialiseSearch() {
  state.searchBoxes = [
    createSearchBox({
      formId: "home-search-form",
      inputId: "home-search-input",
      suggestionsCardId: "home-suggestions-card",
      suggestionsListId: "home-suggestions-list"
    })
  ];
  initialiseHomeTryGenesHint();

  window.addEventListener("resize", refreshVisibleSuggestions);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", refreshVisibleSuggestions);
    window.visualViewport.addEventListener("scroll", refreshVisibleSuggestions);
  }

  window.setTimeout(() => {
    state.searchBoxes[0].input.focus();
  }, 50);
}

function initialiseHomeTryGenesHint() {
  if (!elements.sharedSearchForm || !elements.sharedSearchShell || elements.homeTryGenesHint) {
    return;
  }

  const hint = document.createElement("div");
  hint.className = "home-try-genes";
  hint.append("Try ");

  HOME_TRY_GENES.forEach((gene, index) => {
    const link = document.createElement("a");
    link.href = `?gene=${encodeURIComponent(gene)}`;
    link.className = "home-try-gene";
    link.textContent = gene;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      dismissHomeTryGenesHint({ permanent: true });
      submitGene(gene);
    });
    hint.append(link);

    if (index < HOME_TRY_GENES.length - 2) {
      hint.append(", ");
    } else if (index === HOME_TRY_GENES.length - 2) {
      hint.append(", or ");
    } else {
      hint.append(".");
    }
  });

  elements.sharedSearchForm.insertAdjacentElement("afterend", hint);
  elements.homeTryGenesHint = hint;
  syncHomeTryGenesHintVisibility();
}

function dismissHomeTryGenesHint(options = {}) {
  if (options.permanent) {
    state.homeTryGenesDismissed = true;
  }

  syncHomeTryGenesHintVisibility();
}

function syncHomeTryGenesHintVisibility() {
  if (!elements.homeTryGenesHint || !elements.sharedSearchInput) {
    return;
  }

  const hasValue = normaliseGene(elements.sharedSearchInput.value).length > 0;
  elements.homeTryGenesHint.classList.toggle("is-dismissed", state.homeTryGenesDismissed || hasValue);
}

function refreshVisibleSuggestions() {
  state.searchBoxes.forEach((box) => {
    if (!box.suggestionsCard.classList.contains("is-hidden")) {
      updateSuggestionsPosition(box);
      updateSuggestionsMaxHeight(box);
    }
  });
}

function mountSharedSearch(view) {
  const isDashboard = view === "dashboard";
  const mount = isDashboard ? elements.dashboardSearchMount : elements.homeSearchMount;
  if (mount && elements.sharedSearchShell.parentElement !== mount) {
    mount.append(elements.sharedSearchShell);
  }

  elements.sharedSearchForm.classList.toggle("search-panel-compact", isDashboard);
  elements.sharedSearchForm.classList.toggle("topbar-search", isDashboard);
  elements.sharedSearchSubmit.classList.toggle("primary-button", !isDashboard);
  elements.sharedSearchSubmit.classList.toggle("secondary-button", isDashboard);
  elements.sharedSearchSubmit.classList.toggle("home-inline-button", !isDashboard);
  elements.sharedSearchInput.placeholder = isDashboard ? "Search another gene" : "Type a gene symbol";
  syncHomeTryGenesHintVisibility();
}

function createSearchBox(config) {
  const box = {
    form: document.getElementById(config.formId),
    input: document.getElementById(config.inputId),
    submitButton: document.querySelector(`#${config.formId} [type="submit"]`),
    clearButton: document.querySelector(`#${config.formId} [data-clear-field]`),
    suggestionsCard: document.getElementById(config.suggestionsCardId),
    suggestionsList: document.getElementById(config.suggestionsListId),
    positionFromForm: Boolean(config.positionFromForm),
    suggestions: [],
    feedbackMessage: "",
    highlightedIndex: -1,
    requestToken: 0
  };

  box.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = getSelectedSearchQuery(box);
    if (query) {
      submitGene(query);
    }
  });

  box.input.addEventListener("input", async () => {
    box.input.value = normaliseGene(box.input.value);
    if (box.input.value.length > 0) {
      dismissHomeTryGenesHint({ permanent: true });
    }
    clearSearchFeedback();
    syncSearchBoxes(box.input.value, box.input);
    await updateSuggestions(box);
  });

  box.input.addEventListener("focus", async () => {
    if (box.input.value.trim().length >= 2) {
      clearSearchFeedback();
      await updateSuggestions(box);
    }
  });

  box.input.addEventListener("keydown", (event) => handleSearchKeydown(event, box));

  box.input.addEventListener("blur", () => {
    window.setTimeout(() => hideSuggestions(box), 120);
  });

  box.suggestionsList.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  box.suggestionsList.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-gene]");
    if (!trigger) {
      return;
    }

    selectSuggestion(box, trigger.dataset.gene);
  });

  if (box.clearButton) {
    box.clearButton.addEventListener("click", () => {
      clearSearchFeedback();
      box.input.value = "";
      box.suggestions = [];
      box.highlightedIndex = -1;
      syncSearchBoxes("", box.input);
      hideSuggestions(box);
      updateSearchBoxControls(box);
      box.input.focus();
    });
  }

  updateSearchBoxControls(box);
  return box;
}

function handleSearchKeydown(event, box) {
  if (event.key === "ArrowDown") {
    if (!box.suggestions.length) {
      return;
    }
    event.preventDefault();
    box.highlightedIndex = (box.highlightedIndex + 1) % box.suggestions.length;
    renderSuggestions(box);
    return;
  }

  if (event.key === "ArrowUp") {
    if (!box.suggestions.length) {
      return;
    }
    event.preventDefault();
    box.highlightedIndex = box.highlightedIndex <= 0 ? box.suggestions.length - 1 : box.highlightedIndex - 1;
    renderSuggestions(box);
    return;
  }

  if (event.key === "Enter" && box.highlightedIndex >= 0 && box.suggestions[box.highlightedIndex]) {
    event.preventDefault();
    selectSuggestion(box, box.suggestions[box.highlightedIndex]);
    return;
  }

  if (event.key === "Escape") {
    hideSuggestions(box);
  }
}

async function updateSuggestions(box) {
  const query = normaliseGene(box.input.value);

  if (query.length < 2) {
    box.suggestions = [];
    box.highlightedIndex = -1;
    hideSuggestions(box);
    return;
  }

  const token = Date.now() + Math.random();
  box.requestToken = token;

  try {
    const manifest = await loadManifest(query.slice(0, 2));
    if (box.requestToken !== token) {
      return;
    }

    box.suggestions = manifest.filter((gene) => gene.startsWith(query));
    box.highlightedIndex = -1;
    renderSuggestions(box);
  } catch (error) {
    if (box.requestToken !== token) {
      return;
    }

    box.suggestions = [];
    box.highlightedIndex = -1;
    hideSuggestions(box);
  }
}

async function loadManifest(prefix) {
  if (state.manifestCache.has(prefix)) {
    return state.manifestCache.get(prefix);
  }

  if (state.manifestRequests.has(prefix)) {
    return state.manifestRequests.get(prefix);
  }

  const request = fetch(`data/manifest/${encodeURIComponent(prefix)}.txt`, { cache: "force-cache" })
    .then((response) => {
      if (response.status === 404) {
        return "";
      }
      if (!response.ok) {
        throw new Error(`Manifest request failed with ${response.status}`);
      }
      return response.text();
    })
    .then((text) => text.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean))
    .then((entries) => {
      state.manifestCache.set(prefix, entries);
      state.manifestRequests.delete(prefix);
      return entries;
    })
    .catch((error) => {
      state.manifestRequests.delete(prefix);
      throw error;
    });

  state.manifestRequests.set(prefix, request);
  return request;
}

function renderSuggestions(box) {
  box.suggestionsList.innerHTML = "";
  updateSuggestionsPosition(box);
  updateSuggestionsMaxHeight(box);

  if (box.feedbackMessage) {
    const feedbackItem = document.createElement("li");
    feedbackItem.className = "suggestion-empty";
    feedbackItem.textContent = box.feedbackMessage;
    box.suggestionsList.append(feedbackItem);
    box.suggestionsCard.classList.remove("is-hidden");
    return;
  }

  if (!box.suggestions.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "suggestion-empty";
    emptyItem.textContent = "No matching gene symbols.";
    box.suggestionsList.append(emptyItem);
    box.suggestionsCard.classList.remove("is-hidden");
    return;
  }

  box.suggestions.forEach((gene, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-button";
    button.dataset.gene = gene;
    if (index === box.highlightedIndex) {
      button.classList.add("is-active");
    }
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === box.highlightedIndex ? "true" : "false");
    button.textContent = gene;
    item.append(button);
    box.suggestionsList.append(item);
  });

  box.suggestionsCard.classList.remove("is-hidden");
}

function hideSuggestions(box) {
  box.suggestionsCard.classList.add("is-hidden");
}

function updateSuggestionsPosition(box) {
  if (!box.positionFromForm) {
    return;
  }

  const container = box.suggestionsCard.offsetParent;
  if (!container) {
    return;
  }

  const formRect = box.form.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  box.suggestionsCard.style.top = `${formRect.bottom - containerRect.top + 4}px`;
}

function updateSuggestionsMaxHeight(box) {
  const formRect = box.form.getBoundingClientRect();
  const visualViewport = window.visualViewport;
  const viewportHeight = visualViewport ? visualViewport.height : window.innerHeight;
  const viewportOffsetTop = visualViewport ? visualViewport.offsetTop : 0;
  const viewportBottomGap = 16;
  const formBottomInViewport = formRect.bottom - viewportOffsetTop;
  const availableHeight = Math.max(0, Math.floor(viewportHeight - formBottomInViewport - viewportBottomGap));
  const dashboardCap = Math.floor(viewportHeight * 0.5);
  const maxHeight = state.currentView === "dashboard" ? Math.min(availableHeight, dashboardCap) : availableHeight;
  box.suggestionsList.style.maxHeight = `${maxHeight}px`;
}

function selectSuggestion(box, gene) {
  box.input.value = gene;
  syncSearchBoxes(gene, box.input);
  hideSuggestions(box);
  submitGene(gene);
}

function getSelectedSearchQuery(box) {
  if (box.highlightedIndex >= 0 && box.suggestions[box.highlightedIndex]) {
    return box.suggestions[box.highlightedIndex];
  }

  return normaliseGene(box.input.value);
}

function syncSearchBoxes(value, sourceInput) {
  state.searchBoxes.forEach((box) => {
    box.input.value = value;
    updateSearchBoxControls(box);
  });
  syncHomeTryGenesHintVisibility();
}

function updateSearchBoxControls(box) {
  const hasValue = normaliseGene(box.input.value).length > 0;

  if (!box.submitButton) {
    return hasValue;
  }

  box.submitButton.disabled = !hasValue;
  if (box.clearButton) {
    box.clearButton.classList.toggle("is-inactive", !hasValue);
    box.clearButton.disabled = !hasValue;
  }
  return hasValue;
}

function hydrateRoute() {
  const url = new URL(window.location.href);
  const requestedGene = normaliseGene(url.searchParams.get("gene") || "");

  if (!requestedGene) {
    showHome({ replaceHistory: true });
    return;
  }

  syncSearchBoxes(requestedGene);
  if (state.currentView === "home") {
    resolveHomeGeneSubmission(requestedGene, { pushHistory: false, scrollToTop: false });
    return;
  }

  showDashboard({ keepRoute: true });
  loadGene(requestedGene, { pushHistory: false });
}

function showHome(options = {}) {
  state.currentView = "home";
  elements.body.dataset.view = "home";
  closeAboutDialog();
  mountSharedSearch("home");
  state.searchBoxes.forEach((box) => hideSuggestions(box));
  elements.exportPngButton.disabled = true;
  elements.exportSvgButton.disabled = true;
  state.currentCsvText = "";
  clearSearchFeedback();
  selectTab("plot");
  resetSummary();
  if (options.replaceHistory) {
    updateUrl("", true);
  } else if (window.location.search) {
    updateUrl("", true);
  }
  document.title = APP_CONFIG.title;
  announce("Home search ready.");
  state.searchBoxes[0].input.focus();
}

function showDashboard(options = {}) {
  state.currentView = "dashboard";
  elements.body.dataset.view = "dashboard";
  closeAboutDialog();
  mountSharedSearch("dashboard");
  clearSearchFeedback();
  selectTab(state.activeTab);
  window.requestAnimationFrame(() => {
    applyPlotSurfaceDimensions({ persist: true });
    schedulePlotlyResize();
    updateTabIndicator();
  });
  if (!options.keepRoute) {
    announce("Dashboard opened.");
  }
}

function submitGene(rawGene) {
  const gene = normaliseGene(rawGene);
  if (!gene) {
    announce("Type a gene symbol first.");
    return;
  }

  state.searchBoxes.forEach((box) => hideSuggestions(box));
  syncSearchBoxes(gene);

  if (state.currentView === "home") {
    resolveHomeGeneSubmission(gene, { pushHistory: true, scrollToTop: true });
    return;
  }

  resolveDashboardGeneSubmission(gene, { pushHistory: true, scrollToTop: true });
}

async function loadGene(gene, options = {}) {
  const requestId = ++state.geneRequestId;
  state.activeGene = gene;
  setLoading(true);
  resetSummary();
  updateSummaryEyebrow(gene);
  setPlotStatus(`Loading ${gene}`, `Fetching ${gene}.csv from the static data directory.`);
  elements.exportPngButton.disabled = true;
  elements.exportSvgButton.disabled = true;
  elements.plotHost.dataset.gene = "";

  if (options.pushHistory) {
    updateUrl(gene);
  }

  try {
    const { csvText, rows } = await fetchGeneDataset(gene);
    if (requestId !== state.geneRequestId) {
      return;
    }

    state.currentCsvText = csvText;
    state.currentPlotRows = rows;
    renderDashboard(gene, rows);
    announce(`${gene} loaded with ${rows.length} comparisons.`);
  } catch (error) {
    if (requestId !== state.geneRequestId) {
      return;
    }

    state.currentPlotRows = [];
    state.currentCsvText = "";
    renderGeneError(gene, error);
  } finally {
    if (requestId === state.geneRequestId) {
      setLoading(false);
    }
  }
}

async function resolveHomeGeneSubmission(gene, options = {}) {
  const requestId = ++state.geneRequestId;
  state.activeGene = gene;
  clearSearchFeedback();

  if (options.scrollToTop) {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  try {
    const { csvText, rows } = await fetchGeneDataset(gene);
    if (requestId !== state.geneRequestId) {
      return;
    }

    state.currentCsvText = csvText;
    state.currentPlotRows = rows;
    showDashboard({ keepRoute: true });
    if (options.pushHistory) {
      updateUrl(gene);
    }
    renderDashboard(gene, rows);
    announce(`${gene} loaded with ${rows.length} comparisons.`);
  } catch (error) {
    if (requestId !== state.geneRequestId) {
      return;
    }

    state.activeGene = "";
    state.currentCsvText = "";
    state.currentPlotRows = [];
    renderHomeGeneError(gene, error);
  }
}

async function resolveDashboardGeneSubmission(gene, options = {}) {
  const requestId = ++state.geneRequestId;
  clearSearchFeedback();

  if (options.scrollToTop) {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  setLoading(true);

  try {
    const { csvText, rows } = await fetchGeneDataset(gene);
    if (requestId !== state.geneRequestId) {
      return;
    }

    state.activeGene = gene;
    state.currentCsvText = csvText;
    state.currentPlotRows = rows;
    if (options.pushHistory) {
      updateUrl(gene);
    }
    renderDashboard(gene, rows);
    announce(`${gene} loaded with ${rows.length} comparisons.`);
  } catch (error) {
    if (requestId !== state.geneRequestId) {
      return;
    }

    renderDashboardGeneError(gene, error);
  } finally {
    if (requestId === state.geneRequestId) {
      setLoading(false);
    }
  }
}

async function fetchGeneDataset(gene) {
  const response = await fetch(`data/genes/${encodeURIComponent(gene)}.csv`, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "not-found" : `request-${response.status}`);
  }

  const csvText = await response.text();
  const rows = parseGeneCsv(csvText);
  if (!rows.length) {
    throw new Error("empty-file");
  }

  return { csvText, rows };
}

function renderDashboard(gene, rows) {
  const significantCount = rows.filter((row) => row.isSignificant).length;
  const significantPercent = rows.length ? (significantCount / rows.length) * 100 : 0;
  const medianLog2fc = calculateMedian(rows.map((row) => row.log2fc));
  const plotLibraryAvailable = typeof window.Plotly !== "undefined";

  updateSummaryEyebrow(gene);
  elements.plotDescriptionText.textContent = "Hover over each point to view experiment details. Click on legend to isolate group.";
  elements.statComparisons.textContent = `${rows.length}`;
  elements.statSignificant.textContent = `${significantCount} (${significantPercent.toFixed(1)}%)`;
  elements.statMedian.textContent = `${medianLog2fc >= 0 ? "+" : ""}${medianLog2fc.toFixed(3)}`;
  updateDirectionSummary(rows);
  renderRawCsv(state.currentCsvText);
  selectTab("plot");
  document.title = `${gene} | ${APP_CONFIG.title}`;

  if (!plotLibraryAvailable) {
    setPlotStatus(
      "Plot library unavailable",
      "The vendored Plotly bundle could not be loaded, so the forest plot cannot be drawn in this environment."
    );
    return;
  }

  elements.plotStatusCard.classList.add("is-hidden");
  elements.plotHost.classList.remove("is-hidden");
  elements.exportPngButton.disabled = false;
  elements.exportSvgButton.disabled = false;
  renderForestPlot(gene, rows);
}

function renderGeneError(gene, error) {
  const { message } = describeGeneError(gene, error);

  if (typeof window.Plotly !== "undefined") {
    window.Plotly.purge(elements.plotHost);
  }
  elements.plotHost.classList.add("is-hidden");
  elements.plotHost.dataset.gene = "";
  elements.exportPngButton.disabled = true;
  elements.exportSvgButton.disabled = true;
  renderRawCsv("");
  syncSearchBoxes(gene);
  showHome({ replaceHistory: true });
  showSearchFeedback(message);
  announce(message);
}

function renderHomeGeneError(gene, error) {
  const { message } = describeGeneError(gene, error);
  syncSearchBoxes(gene);
  if (window.location.search) {
    updateUrl("", true);
  }
  showSearchFeedback(message);
  announce(message);
}

function renderDashboardGeneError(gene, error) {
  const { message } = describeGeneError(gene, error);
  syncSearchBoxes(gene);
  showSearchFeedback(message);
  announce(message);
}

function describeGeneError(gene, error) {
  const isMissing = error.message === "not-found";
  return {
    title: isMissing ? "Gene data not found" : "Unable to load gene data",
    message: isMissing
      ? `${gene} was not found. Try another gene symbol.`
      : `The data file for ${gene} could not be loaded. Try again or choose another gene.`
  };
}

function showSearchFeedback(message) {
  const box = state.searchBoxes[0];
  if (!box) {
    return;
  }

  box.suggestions = [];
  box.highlightedIndex = -1;
  box.feedbackMessage = message;
  renderSuggestions(box);
}

function clearSearchFeedback() {
  state.searchBoxes.forEach((box) => {
    box.feedbackMessage = "";
  });
}

function setLoading(isLoading) {
  elements.loadingProgress.classList.toggle("is-active", isLoading);
  elements.loadingProgress.setAttribute("aria-hidden", isLoading ? "false" : "true");
}

function setPlotStatus(title, message) {
  elements.plotStatusCard.innerHTML = `<h3 class="status-title">${escapeHtml(title)}</h3><p class="status-copy">${escapeHtml(message)}</p>`;
  elements.plotStatusCard.classList.remove("is-hidden");
  elements.plotHost.classList.add("is-hidden");
}

function selectTab(tabName) {
  state.activeTab = tabName;
  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.tabPanel !== tabName);
  });
  window.requestAnimationFrame(() => updateTabIndicator());
}

function updateTabIndicator() {
  if (!elements.viewTabs || !elements.viewTabIndicator) {
    return;
  }

  const activeButton = elements.tabButtons.find((button) => button.classList.contains("is-active"));
  if (!activeButton || !activeButton.offsetWidth || !elements.viewTabs.offsetWidth) {
    return;
  }

  const indicatorInset = Number.parseFloat(window.getComputedStyle(elements.viewTabIndicator).left) || 0;
  const offsetX = activeButton.offsetLeft - indicatorInset;

  elements.viewTabIndicator.style.width = `${activeButton.offsetWidth}px`;
  elements.viewTabIndicator.style.transform = `translateX(${offsetX}px)`;
}

function renderRawCsv(csvText) {
  const hasCsv = Boolean(csvText);
  elements.rawCsvContent.textContent = hasCsv ? csvText : "No data loaded.";
  elements.copyCsvButton.disabled = !hasCsv;
  resetCopyCsvButtonLabel();
}

function rerenderActivePlot() {
  if (typeof window.Plotly === "undefined" || !state.currentPlotRows.length || !state.activeGene) {
    return;
  }

  renderForestPlot(state.activeGene, state.currentPlotRows);
}

async function copyRawCsvToClipboard() {
  if (!state.currentCsvText) {
    return;
  }

  let copied = false;

  try {
    await navigator.clipboard.writeText(state.currentCsvText);
    copied = true;
  } catch (error) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = state.currentCsvText;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      document.body.append(textArea);
      textArea.select();
      copied = document.execCommand("copy");
      textArea.remove();
    } catch (fallbackError) {
      copied = false;
    }
  }

  if (!copied) {
    return;
  }

  flashCopyCsvButtonSuccess();
  announce("CSV copied to clipboard.");
}

function flashCopyCsvButtonSuccess() {
  if (state.copyCsvFeedbackTimeout) {
    window.clearTimeout(state.copyCsvFeedbackTimeout);
  }

  elements.copyCsvButton.textContent = COPY_CSV_BUTTON_SUCCESS;
  state.copyCsvFeedbackTimeout = window.setTimeout(() => {
    resetCopyCsvButtonLabel();
  }, 1600);
}

function resetCopyCsvButtonLabel() {
  if (state.copyCsvFeedbackTimeout) {
    window.clearTimeout(state.copyCsvFeedbackTimeout);
    state.copyCsvFeedbackTimeout = null;
  }

  elements.copyCsvButton.textContent = COPY_CSV_BUTTON_DEFAULT;
}

function updateDirectionSummary(rows) {
  const sourceRows = elements.directionSignificantOnlyInput.checked
    ? rows.filter((row) => row.isSignificant)
    : rows;
  const upCount = sourceRows.filter((row) => row.log2fc > 0).length;
  const downCount = sourceRows.filter((row) => row.log2fc < 0).length;
  const directionalTotal = upCount + downCount;
  const upPercent = directionalTotal ? (upCount / directionalTotal) * 100 : 0;
  const downPercent = directionalTotal ? (downCount / directionalTotal) * 100 : 0;

  setDirectionCount(elements.directionUpCount, "Up", upCount);
  setDirectionCount(elements.directionDownCount, "Down", downCount);
  elements.directionUpBar.style.width = `${upPercent}%`;
  elements.directionDownBar.style.width = `${downPercent}%`;
  elements.directionUpLabel.textContent = `${Math.round(upPercent)}%`;
  elements.directionDownLabel.textContent = `${Math.round(downPercent)}%`;
}

function setDirectionCount(element, label, count) {
  const countDigits = document.createElement("span");
  countDigits.className = "stat-count-digits";
  countDigits.textContent = String(count);
  element.replaceChildren(`${label} `, countDigits);
}

function resetSummary() {
  updateSummaryEyebrow("");
  elements.statComparisons.textContent = "-";
  elements.statSignificant.textContent = "-";
  elements.statMedian.textContent = "-";
  setDirectionCount(elements.directionUpCount, "Up", 0);
  setDirectionCount(elements.directionDownCount, "Down", 0);
  elements.directionUpBar.style.width = "0";
  elements.directionDownBar.style.width = "0";
  elements.directionUpLabel.textContent = "0%";
  elements.directionDownLabel.textContent = "0%";
  renderRawCsv("");
}

function updateSummaryEyebrow(gene) {
  elements.summaryEyebrow.textContent = gene ? `${gene} summary` : "Summary";
}

function renderForestPlot(gene, rows) {
  const rankedRows = rows.slice().sort((left, right) => right.log2fc - left.log2fc);
  const indexedRows = rankedRows.map((row, index) => ({
    ...row,
    y: index + 1
  }));

  const ranges = indexedRows.flatMap((row) => [row.log2fc - row.lfcSE, row.log2fc + row.lfcSE, 0]);
  const minX = Math.min(...ranges);
  const maxX = Math.max(...ranges);
  const padding = Math.max((maxX - minX) * 0.08, 0.5);
  const plotSizing = buildPlotSizing(state.plotScale, state.plotDotScale);
  const hoverFontSize = Number.parseFloat(window.getComputedStyle(document.body).fontSize) || 16;
  const traces = buildPlotTraces(indexedRows, state.plotColorMode, plotSizing, state.showDotOutline);
  const legendLabels = traces
    .filter((trace) => trace.showlegend !== false)
    .map((trace) => trace.legendgroup || trace.name);
  const legendCount = legendLabels.length;
  const axisTitleStandoff = Math.round(14 + Math.max(0, plotSizing.axisTitleSize - 14) * 0.9);
  const longestLegendLabel = legendLabels.reduce((maximum, label) => Math.max(maximum, String(label || "").length), 0);
  const legendWidth = Math.round(Math.min(440, Math.max(150, longestLegendLabel * plotSizing.legendFontSize * 0.62 + 62)));
  const legendHeight = Math.round(Math.max(legendCount, 1) * (plotSizing.legendFontSize + 8) + 28);
  ensurePlotSurfaceHeight(legendHeight + 120);

  const layout = {
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
    margin: {
      l: Math.round(28 + Math.max(0, plotSizing.axisTitleSize - 14) * 1.3),
      r: legendWidth,
      t: Math.round(48 + Math.max(0, plotSizing.baseFontSize - 12) * 1.5),
      b: Math.round(48 + axisTitleStandoff)
    },
    title: {
      text: gene,
      x: 0.5,
      xanchor: "center",
      y: 0.99,
      yanchor: "top",
      pad: {
        b: 2
      },
      font: {
        size: Math.max(12, Math.round(16 * plotSizing.factor)),
        color: "#17242d"
      }
    },
    showlegend: true,
    hovermode: "closest",
    hoverdistance: 24,
    dragmode: false,
    clickmode: "none",
    legend: {
      orientation: "v",
      yanchor: "top",
      y: 1,
      xanchor: "left",
      x: 1.02,
      bgcolor: "rgba(255, 255, 255, 0.92)",
      bordercolor: "#d0dbe3",
      borderwidth: 1,
      font: { size: plotSizing.legendFontSize, color: "#425a67" }
    },
    font: {
      family: "\"Aptos\", \"Segoe UI Variable Display\", \"Segoe UI\", sans-serif",
      color: "#17242d",
      size: plotSizing.baseFontSize
    },
    hoverlabel: {
      bgcolor: "#f8fbfd",
      bordercolor: "#d0dbe3",
      font: { color: "#17242d", size: hoverFontSize }
    },
    xaxis: {
      title: {
        text: "log<sub>2</sub> fold change",
        font: { size: plotSizing.axisTitleSize },
        standoff: axisTitleStandoff
      },
      range: [minX - padding, maxX + padding],
      gridcolor: "#e6edf2",
      linecolor: "#222222",
      linewidth: 1,
      zeroline: false,
      ticks: "outside",
      tickcolor: "#222222",
      tickwidth: 1,
      tickfont: { size: plotSizing.tickFontSize },
      automargin: true,
      fixedrange: true
    },
    yaxis: {
      autorange: "reversed",
      showticklabels: false,
      showgrid: false,
      zeroline: false,
      ticks: "",
      fixedrange: true
    },
    shapes: [
      {
        type: "line",
        x0: 0,
        x1: 0,
        y0: 0,
        y1: 1,
        yref: "paper",
        line: {
          color: "#222222",
          width: 1
        }
      }
    ]
  };

  const config = {
    responsive: true,
    displayModeBar: false,
    scrollZoom: false,
    doubleClick: false
  };

  window.Plotly.react(elements.plotHost, traces, layout, config).then(() => {
    applyPlotLegendCornerRadius();
  });
  elements.plotHost.dataset.gene = gene;
}

function applyPlotLegendCornerRadius() {
  if (!elements.plotHost) {
    return;
  }

  elements.plotHost.querySelectorAll(".legend .bg").forEach((node) => {
    node.setAttribute("rx", String(PLOT_LEGEND_RADIUS));
    node.setAttribute("ry", String(PLOT_LEGEND_RADIUS));
  });
}

function buildPlotSizing(plotScalePercent, dotScalePercent) {
  const factor = Math.min(Math.max((Number.isFinite(plotScalePercent) ? plotScalePercent : 100) / 100, 0.5), 3);
  const dotFactor = Math.min(Math.max((Number.isFinite(dotScalePercent) ? dotScalePercent : 100) / 100, 0.25), 3);
  return {
    factor,
    dotFactor,
    markerSize: 12 * factor * dotFactor,
    markerLineWidth: Math.max(0.8, 1.2 * factor * Math.max(0.8, dotFactor)),
    errorThickness: Math.max(1, 1.8 * factor),
    referenceLineWidth: Math.max(1, 1.5 * factor),
    baseFontSize: Math.max(9, Math.round(12 * factor)),
    tickFontSize: Math.max(8, Math.round(12 * factor)),
    axisTitleSize: Math.max(10, Math.round(14 * factor)),
    legendFontSize: Math.max(9, Math.round(12 * factor)),
    hoverFontSize: Math.max(9, Math.round(12 * factor))
  };
}

function buildPlotTraces(rows, mode, plotSizing, showDotOutline) {
  const orderedRows = rows.slice().sort((left, right) => left.log2fc - right.log2fc);

  if (mode === "direction") {
    return buildOrderedRowTraces(
      orderedRows,
      (row) => ({
        name: row.log2fc > 0 ? "log2FC > 0" : "log2FC <= 0",
        color: row.log2fc > 0 ? "#188038" : "#d93025",
        legendRank: row.log2fc > 0 ? 1 : 2
      }),
      plotSizing,
      showDotOutline
    );
  }

  if (mode === "organism" || mode === "simple_label") {
    const palette = ["#1a73e8", "#188038", "#d93025", "#9334e6", "#f29900", "#00897b", "#5f6368", "#c2185b", "#3949ab", "#7cb342"];
    const labels = Array.from(new Set(orderedRows.map((row) => String(row[mode] || "Unknown").trim() || "Unknown"))).sort((left, right) => left.localeCompare(right));
    const labelStyles = new Map(labels.map((label, index) => [label, {
      color: palette[index % palette.length],
      legendRank: index + 1
    }]));

    return buildOrderedRowTraces(
      orderedRows,
      (row) => {
        const label = String(row[mode] || "Unknown").trim() || "Unknown";
        const style = labelStyles.get(label);
        return {
          name: label,
          color: style.color,
          legendRank: style.legendRank
        };
      },
      plotSizing,
      showDotOutline
    );
  }

  return buildOrderedRowTraces(
    orderedRows,
    (row) => ({
      name: row.isSignificant ? "padj<0.05" : "N.S.",
      color: row.isSignificant ? "#1a73e8" : "#9aa0a6",
      legendRank: row.isSignificant ? 1 : 2
    }),
    plotSizing,
    showDotOutline
  );
}

function buildOrderedRowTraces(rows, describeRow, plotSizing, showDotOutline) {
  const seenLegendGroups = new Set();

  return rows.flatMap((row) => {
    const description = describeRow(row);
    const traces = buildTracePair(row, description.name, description.color, plotSizing, showDotOutline);
    if (!traces.length) {
      return [];
    }

    traces.forEach((trace) => {
      trace.legendgroup = description.name;
      trace.legendrank = description.legendRank;
      trace.showlegend = false;
    });

    const markerTrace = traces[traces.length - 1];
    markerTrace.showlegend = !seenLegendGroups.has(description.name);
    seenLegendGroups.add(description.name);
    return traces;
  }).filter(Boolean);
}

function buildTracePair(row, name, color, plotSizing, showDotOutline) {
  if (!row) {
    return [];
  }

  const customdata = [
    row.study,
    row.comparison,
    row.padj,
    row.sample_type,
    row.origin,
    row.genotype,
    row.organism,
    row.simple_label,
    row.lfcSE.toFixed(3)
  ];
  const hovertemplate = buildPlotHoverTemplate();

  return [
    {
      type: "scatter",
      mode: "lines",
      name,
      x: [row.log2fc - row.lfcSE, row.log2fc + row.lfcSE],
      y: [row.y, row.y],
      line: {
        color,
        width: plotSizing.errorThickness
      },
      customdata: [customdata, customdata],
      hovertemplate
    },
    {
      type: "scatter",
      mode: "markers",
      name,
      x: [row.log2fc],
      y: [row.y],
      marker: {
        size: plotSizing.markerSize,
        color,
        line: {
          color: "#ffffff",
          width: showDotOutline ? plotSizing.markerLineWidth : 0
        }
      },
      customdata: [customdata],
      hovertemplate
    }
  ];
}

function buildPlotHoverTemplate() {
  return (
    "<b>%{customdata[0]}</b><br>" +
    "<b>Comparison</b>: %{customdata[1]}<br>" +
    "<b>padj</b>: %{customdata[2]}<br>" +
    "<b>Sample type</b>: %{customdata[3]}<br>" +
    "<b>Origin</b>: %{customdata[4]}<br>" +
    "<b>Genotype</b>: %{customdata[5]}<br>" +
    "<b>Organism</b>: %{customdata[6]}<br>" +
    "<b>Label</b>: %{customdata[7]}<br>" +
    "<b>log2FC</b>: %{x:.3f}<br>" +
    "<b>lfcSE</b>: %{customdata[8]}<extra></extra>"
  );
}

async function exportPlotImage(format) {
  if (typeof window.Plotly === "undefined" || !elements.plotHost.dataset.gene) {
    return;
  }

  const exportFormat = format === "svg" ? "svg" : "png";
  const width = Math.max(1, Math.round(elements.plotHost.clientWidth || elements.plotHost.getBoundingClientRect().width));
  const height = Math.max(1, Math.round(elements.plotHost.clientHeight || elements.plotHost.getBoundingClientRect().height));
  const scale = exportFormat === "png" ? PNG_EXPORT_WIDTH / width : 1;
  const filename = buildExportFileName(elements.plotHost.dataset.gene, state.plotColorMode);

  try {
    const svgMarkup = await buildExportSvgMarkup(width, height);
    if (exportFormat === "svg") {
      downloadBlob(new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
      return;
    }

    const pngBlob = await renderSvgMarkupToPngBlob(svgMarkup, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    if (!pngBlob) {
      return;
    }

    downloadBlob(pngBlob, `${filename}.png`);
  } catch (error) {
    return;
  }
}

async function buildExportSvgMarkup(width, height) {
  const svgDataUrl = await window.Plotly.toImage(elements.plotHost, {
    format: "svg",
    width,
    height,
    scale: 1
  });

  return applyLegendCornerRadiusToSvgMarkup(decodeSvgDataUrl(svgDataUrl));
}

function decodeSvgDataUrl(dataUrl) {
  const separatorIndex = dataUrl.indexOf(",");
  if (separatorIndex === -1) {
    return dataUrl;
  }

  const metadata = dataUrl.slice(0, separatorIndex);
  const payload = dataUrl.slice(separatorIndex + 1);
  if (metadata.includes(";base64")) {
    const binary = window.atob(payload);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  return decodeURIComponent(payload);
}

function applyLegendCornerRadiusToSvgMarkup(svgMarkup) {
  const documentFragment = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  documentFragment.querySelectorAll(".legend .bg").forEach((node) => {
    node.setAttribute("rx", String(PLOT_LEGEND_RADIUS));
    node.setAttribute("ry", String(PLOT_LEGEND_RADIUS));
  });
  return new XMLSerializer().serializeToString(documentFragment);
}

async function renderSvgMarkupToPngBlob(svgMarkup, width, height) {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.drawImage(image, 0, 0, width, height);
    return await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function downloadBlob(blob, fileName) {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}

function buildExportFileName(gene, colorMode) {
  const modeLabel = getPlotColorModeExportLabel(colorMode);
  return `senbulk-${slugifyExportSegment(gene)}-plot-${slugifyExportSegment(modeLabel)}`;
}

function getPlotColorModeExportLabel(colorMode) {
  switch (sanitisePlotColorMode(colorMode)) {
    case "direction":
      return "log2fc-above-0";
    case "organism":
      return "organism";
    case "simple_label":
      return "simple-label";
    default:
      return "padj-0.05";
  }
}

function slugifyExportSegment(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function parseGeneCsv(text) {
  const records = parseCsv(text);
  if (records.length < 2) {
    return [];
  }

  const headers = records[0].map((header) => header.trim());
  return records
    .slice(1)
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row) => {
      const entry = Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]));
      return {
        study: entry.study,
        comparison: entry.comparison,
        log2fc: Number.parseFloat(entry.log2fc),
        lfcSE: Number.parseFloat(entry.lfcSE),
        padj: entry.padj,
        sample_type: entry.sample_type,
        origin: entry.origin,
        genotype: entry.genotype,
        organism: toTitleCase(entry.organism),
        simple_label: entry.simple_label,
        isSignificant: entry.padj.trim().toUpperCase() !== "N.S."
      };
    })
    .filter((row) => Number.isFinite(row.log2fc) && Number.isFinite(row.lfcSE));
}

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        value += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += character;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function calculateMedian(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  if (!sorted.length) {
    return 0;
  }

  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }

  return sorted[midpoint];
}

function sanitisePlotColorMode(value) {
  const allowedModes = new Set(["significance", "direction", "organism", "simple_label"]);
  return allowedModes.has(value) ? value : "significance";
}

function sanitiseBoundedInteger(value, limits) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return limits.fallback;
  }

  return Math.round(Math.min(Math.max(parsed, limits.min), limits.max));
}

function normaliseGene(value) {
  return (value || "").trim().toUpperCase();
}

function updateUrl(gene, replace = false) {
  const url = new URL(window.location.href);
  if (gene) {
    url.searchParams.set("gene", gene);
  } else {
    url.searchParams.delete("gene");
  }

  if (replace) {
    window.history.replaceState({}, "", url);
  } else {
    window.history.pushState({}, "", url);
  }
}

function announce(message) {
  elements.liveRegion.textContent = message;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
