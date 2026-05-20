const STORAGE_KEY = 'dungeonTracker.mapTabs';
const MAX_TAB_NAME_LENGTH = 40;
const MAX_FLOOR_NAME_LENGTH = 40;
const DEFAULT_TAB_NAME_PREFIX = 'Carte';
const DEFAULT_FLOOR_NAME_PREFIX = 'Étage';

let mapTabsState = {
  tabs: [],
  activeTabId: null,
};

let nextTabId = 1;
let nextFloorId = 1;

function generateTabId() {
  return `map-${Date.now()}-${nextTabId++}`;
}

function generateFloorId() {
  return `floor-${Date.now()}-${nextFloorId++}`;
}

function defaultTabName(index) {
  return `${DEFAULT_TAB_NAME_PREFIX} ${index}`;
}

function defaultFloorName(index) {
  return index === 1 ? 'RDC' : `${DEFAULT_FLOOR_NAME_PREFIX} ${index}`;
}

function normalizeTabName(name, fallback) {
  const trimmed = String(name ?? '').trim().slice(0, MAX_TAB_NAME_LENGTH);
  return trimmed || fallback;
}

function normalizeFloorName(name, fallback) {
  const trimmed = String(name ?? '').trim().slice(0, MAX_FLOOR_NAME_LENGTH);
  return trimmed || fallback;
}

function normalizeFloorGrid(grid) {
  const { width, height } = normalizeGridDimensions(grid);
  return cloneGridState({ ...grid, width, height, cells: grid.cells });
}

function cloneGridState(state) {
  return {
    width: state.width,
    height: state.height,
    cells: state.cells.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return null;
        if (typeof cell === 'string') return cell;
        return {
          presetId: cell.presetId,
          markers: Array.isArray(cell.markers)
            ? cell.markers.filter((id) => id !== 'key' && id !== 'entrance')
            : [],
          staircases: normalizeStaircases(cell),
          lockedDoors: normalizeLockedDoors(cell),
          breakableWalls: normalizeBreakableWalls(cell),
          entranceSide: cell.entranceSide ?? null,
        };
      })
    ),
  };
}

function createEmptyFloor(name, index = 1) {
  const grid = createGrid(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE);
  return {
    id: generateFloorId(),
    name: normalizeFloorName(name, defaultFloorName(index)),
    grid: cloneGridState(grid),
  };
}

function normalizeTabFromStorage(tab, index) {
  const tabId = tab.id || generateTabId();
  const tabName = normalizeTabName(tab.name, defaultTabName(index + 1));

  let floors;
  let activeFloorId;

  if (Array.isArray(tab.floors) && tab.floors.length > 0) {
    floors = tab.floors.map((floor, floorIndex) => ({
      id: floor.id || generateFloorId(),
      name: normalizeFloorName(floor.name, defaultFloorName(floorIndex + 1)),
      grid:
        floor.grid && floor.grid.cells
          ? normalizeFloorGrid(floor.grid)
          : cloneGridState(createGrid(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE)),
    }));
    const activeExists = floors.some((f) => f.id === tab.activeFloorId);
    activeFloorId = activeExists ? tab.activeFloorId : floors[0].id;
  } else if (tab.grid && tab.grid.cells) {
    const floor = {
      id: generateFloorId(),
      name: 'RDC',
      grid: normalizeFloorGrid(tab.grid),
    };
    floors = [floor];
    activeFloorId = floor.id;
  } else {
    const floor = createEmptyFloor('RDC', 1);
    floors = [floor];
    activeFloorId = floor.id;
  }

  return {
    id: tabId,
    name: tabName,
    theme: normalizeMapThemeId(tab.theme),
    floors,
    activeFloorId,
  };
}

function createEmptyTab(name) {
  const floor = createEmptyFloor('RDC', 1);
  return {
    id: generateTabId(),
    name: normalizeTabName(name, defaultTabName(1)),
    theme: normalizeMapThemeId(MAP_THEME_DEFAULT),
    floors: [floor],
    activeFloorId: floor.id,
  };
}

function getActiveTab() {
  return mapTabsState.tabs.find((tab) => tab.id === mapTabsState.activeTabId) ?? null;
}

function getActiveFloor() {
  const tab = getActiveTab();
  if (!tab) return null;
  return tab.floors.find((f) => f.id === tab.activeFloorId) ?? null;
}

function getMapTabs() {
  return mapTabsState.tabs;
}

function getActiveTabId() {
  return mapTabsState.activeTabId;
}

function getFloors() {
  const tab = getActiveTab();
  return tab ? tab.floors : [];
}

function getActiveFloorId() {
  const tab = getActiveTab();
  return tab ? tab.activeFloorId : null;
}

function getTabById(tabId) {
  return mapTabsState.tabs.find((tab) => tab.id === tabId) ?? null;
}

function getFloorById(floorId) {
  const tab = getActiveTab();
  if (!tab) return null;
  return tab.floors.find((f) => f.id === floorId) ?? null;
}

function loadActiveFloorIntoEditor() {
  const floor = getActiveFloor();
  if (floor) {
    setGridState(floor.grid);
  }
}

function syncActiveFloorFromGrid() {
  const floor = getActiveFloor();
  if (!floor) return;
  floor.grid = cloneGridState(getGridState());
  saveMapTabsToStorage();
}

function syncActiveTabFromGrid() {
  syncActiveFloorFromGrid();
}

function persistMapTabs() {
  saveMapTabsToStorage();
}

function saveMapTabsToStorage() {
  try {
    const payload = {
      tabs: mapTabsState.tabs.map((tab) => ({
        id: tab.id,
        name: tab.name,
        theme: normalizeMapThemeId(tab.theme),
        activeFloorId: tab.activeFloorId,
        floors: tab.floors.map((floor) => ({
          id: floor.id,
          name: floor.name,
          grid: floor.grid,
        })),
      })),
      activeTabId: mapTabsState.activeTabId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota ou mode privé */
  }
}

function loadMapTabsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.tabs) || data.tabs.length === 0) return false;

    mapTabsState.tabs = data.tabs.map((tab, index) =>
      normalizeTabFromStorage(tab, index)
    );

    const activeExists = mapTabsState.tabs.some((t) => t.id === data.activeTabId);
    mapTabsState.activeTabId = activeExists
      ? data.activeTabId
      : mapTabsState.tabs[0].id;

    return true;
  } catch {
    return false;
  }
}

function initMapTabs() {
  if (!loadMapTabsFromStorage()) {
    const tab = createEmptyTab(defaultTabName(1));
    mapTabsState = { tabs: [tab], activeTabId: tab.id };
    persistMapTabs();
  }
  loadActiveFloorIntoEditor();
}

function switchToFloor(floorId) {
  const tab = getActiveTab();
  if (!tab || floorId === tab.activeFloorId) return false;

  const target = tab.floors.find((f) => f.id === floorId);
  if (!target) return false;

  syncActiveFloorFromGrid();
  tab.activeFloorId = floorId;
  loadActiveFloorIntoEditor();
  persistMapTabs();
  return true;
}

function switchToTab(tabId) {
  const target = getTabById(tabId);
  if (!target || tabId === mapTabsState.activeTabId) return false;

  syncActiveFloorFromGrid();
  mapTabsState.activeTabId = tabId;
  loadActiveFloorIntoEditor();
  persistMapTabs();
  return true;
}

function createMapTab(name) {
  syncActiveFloorFromGrid();

  const index = mapTabsState.tabs.length + 1;
  const tab = createEmptyTab(name ?? defaultTabName(index));
  mapTabsState.tabs.push(tab);
  mapTabsState.activeTabId = tab.id;
  loadActiveFloorIntoEditor();
  persistMapTabs();
  return tab;
}

function createFloor(name) {
  const tab = getActiveTab();
  if (!tab) return null;

  syncActiveFloorFromGrid();

  const index = tab.floors.length + 1;
  const floor = createEmptyFloor(name ?? defaultFloorName(index), index);
  tab.floors.push(floor);
  tab.activeFloorId = floor.id;
  loadActiveFloorIntoEditor();
  persistMapTabs();
  return floor;
}

function renameMapTab(tabId, name) {
  const tab = getTabById(tabId);
  if (!tab) return false;

  const index = mapTabsState.tabs.indexOf(tab) + 1;
  tab.name = normalizeTabName(name, defaultTabName(index));
  persistMapTabs();
  return true;
}

function renameFloor(floorId, name) {
  const floor = getFloorById(floorId);
  if (!floor) return false;

  const tab = getActiveTab();
  const index = tab.floors.indexOf(floor) + 1;
  floor.name = normalizeFloorName(name, defaultFloorName(index));
  persistMapTabs();
  return true;
}

function deleteMapTab(tabId) {
  if (mapTabsState.tabs.length <= 1) return false;

  const index = mapTabsState.tabs.findIndex((t) => t.id === tabId);
  if (index === -1) return false;

  const wasActive = mapTabsState.activeTabId === tabId;
  mapTabsState.tabs.splice(index, 1);

  if (wasActive) {
    const nextIndex = Math.min(index, mapTabsState.tabs.length - 1);
    mapTabsState.activeTabId = mapTabsState.tabs[nextIndex].id;
    loadActiveFloorIntoEditor();
  }

  persistMapTabs();
  return true;
}

function reorderItemsById(items, sourceId, targetId) {
  const fromIndex = items.findIndex((item) => item.id === sourceId);
  const toIndex = items.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return false;

  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  return true;
}

function reorderMapTabs(sourceTabId, targetTabId) {
  syncActiveFloorFromGrid();
  if (!reorderItemsById(mapTabsState.tabs, sourceTabId, targetTabId)) {
    return false;
  }
  persistMapTabs();
  return true;
}

function reorderFloors(sourceFloorId, targetFloorId) {
  syncActiveFloorFromGrid();
  const tab = getActiveTab();
  if (!tab) return false;
  if (!reorderItemsById(tab.floors, sourceFloorId, targetFloorId)) {
    return false;
  }
  persistMapTabs();
  return true;
}

function deleteFloor(floorId) {
  const tab = getActiveTab();
  if (!tab || tab.floors.length <= 1) return false;

  const index = tab.floors.findIndex((f) => f.id === floorId);
  if (index === -1) return false;

  const wasActive = tab.activeFloorId === floorId;
  tab.floors.splice(index, 1);

  if (wasActive) {
    const nextIndex = Math.min(index, tab.floors.length - 1);
    tab.activeFloorId = tab.floors[nextIndex].id;
    loadActiveFloorIntoEditor();
  }

  persistMapTabs();
  return true;
}
