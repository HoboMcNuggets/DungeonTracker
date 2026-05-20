const MAP_THEME_DEFAULT = 'alttp';

const MAP_THEME_IDS = {
  classic: 'classic',
  nes: 'nes',
  alttp: 'alttp',
  oot32: 'oot32',
};

const MAP_THEME_VALID = new Set(Object.values(MAP_THEME_IDS));

function normalizeMapThemeId(themeId) {
  const id = String(themeId ?? '').trim();
  return MAP_THEME_VALID.has(id) ? id : MAP_THEME_DEFAULT;
}

function applyMapThemeToDocument(themeId) {
  const id = normalizeMapThemeId(themeId);
  document.documentElement.dataset.theme = id;
}

function getActiveTabMapTheme() {
  const tab = getActiveTab();
  return normalizeMapThemeId(tab?.theme);
}

function setActiveTabMapTheme(themeId) {
  const tab = getActiveTab();
  if (!tab) return;

  const id = normalizeMapThemeId(themeId);
  tab.theme = id;
  applyMapThemeToDocument(id);
  persistMapTabs();
}

function applyActiveTabMapTheme() {
  applyMapThemeToDocument(getActiveTabMapTheme());
}

function syncMapThemeSelect(selectEl) {
  if (!selectEl) return;
  selectEl.value = getActiveTabMapTheme();
}

function initMapTheme(selectEl) {
  if (!selectEl) return;

  selectEl.addEventListener('change', () => {
    setActiveTabMapTheme(selectEl.value);
  });
}

(function applySavedMapThemeEarly() {
  let raw = null;
  try {
    raw = localStorage.getItem('dungeonTracker.mapTabs');
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.tabs) || data.tabs.length === 0) return;

    const tab =
      data.tabs.find((t) => t.id === data.activeTabId) ?? data.tabs[0];
    applyMapThemeToDocument(normalizeMapThemeId(tab.theme));
  } catch {
    /* mode privé ou données invalides */
  }
})();
