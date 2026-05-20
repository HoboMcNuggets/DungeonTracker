const MIN_SIZE = 1;
const MAX_SIZE = 20;

let gridState = {
  width: 10,
  height: 10,
  cells: [],
};

function createEmptyCellData(presetId) {
  return {
    presetId,
    markers: [],
    staircase: null,
  };
}

function normalizeCell(cell) {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'string') {
    return createEmptyCellData(cell);
  }
  return {
    presetId: cell.presetId,
    markers: Array.isArray(cell.markers) ? [...cell.markers] : [],
    staircase: cell.staircase ? String(cell.staircase).toUpperCase() : null,
  };
}

function clampSize(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return MIN_SIZE;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, n));
}

function createGrid(width, height) {
  const w = clampSize(width);
  const h = clampSize(height);
  const cells = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      row.push(null);
    }
    cells.push(row);
  }
  gridState = { width: w, height: h, cells };
  return gridState;
}

function setGridState(state) {
  const w = clampSize(state.width);
  const h = clampSize(state.height);
  const cells = [];

  for (let y = 0; y < h; y++) {
    const row = [];
    const sourceRow = state.cells[y];
    for (let x = 0; x < w; x++) {
      const cell = sourceRow ? sourceRow[x] : null;
      row.push(cell === null || cell === undefined ? null : normalizeCell(cell));
    }
    cells.push(row);
  }

  gridState = { width: w, height: h, cells };
  return gridState;
}

function getGridState() {
  return gridState;
}

function getGridDimensions() {
  return { width: gridState.width, height: gridState.height };
}

function getCell(x, y) {
  if (y < 0 || y >= gridState.height || x < 0 || x >= gridState.width) {
    return undefined;
  }
  return normalizeCell(gridState.cells[y][x]);
}

function getCellPresetId(x, y) {
  const cell = getCell(x, y);
  return cell ? cell.presetId : null;
}

function hasMarker(x, y, markerId) {
  const cell = getCell(x, y);
  return cell ? cell.markers.includes(markerId) : false;
}

function findCellWithMarker(markerId) {
  for (let y = 0; y < gridState.height; y++) {
    for (let x = 0; x < gridState.width; x++) {
      if (hasMarker(x, y, markerId)) {
        return { x, y };
      }
    }
  }
  return null;
}

function getEntrance() {
  return findCellWithMarker('entrance');
}

function isEntrance(x, y) {
  return hasMarker(x, y, 'entrance');
}

function clearMarkerEverywhere(markerId) {
  for (let y = 0; y < gridState.height; y++) {
    for (let x = 0; x < gridState.width; x++) {
      const cell = normalizeCell(gridState.cells[y][x]);
      if (cell && cell.markers.includes(markerId)) {
        cell.markers = cell.markers.filter((id) => id !== markerId);
        gridState.cells[y][x] = cell;
      }
    }
  }
}

function toggleMarker(x, y, markerId) {
  const cell = getCell(x, y);
  if (!cell) return false;

  const marker = getMarkerById(markerId);
  if (!marker) return false;

  if (cell.markers.includes(markerId)) {
    cell.markers = cell.markers.filter((id) => id !== markerId);
    gridState.cells[y][x] = cell;
    return false;
  }

  if (marker.unique) {
    clearMarkerEverywhere(markerId);
  }

  cell.markers.push(markerId);
  gridState.cells[y][x] = cell;
  return true;
}

function setStaircase(x, y, letter) {
  const cell = getCell(x, y);
  if (!cell) return false;

  if (!letter) {
    cell.staircase = null;
  } else {
    const normalized = String(letter).toUpperCase();
    if (!/^[A-Z]$/.test(normalized)) return false;
    cell.staircase = normalized;
  }

  gridState.cells[y][x] = cell;
  return true;
}

function setCell(x, y, presetId) {
  if (y < 0 || y >= gridState.height || x < 0 || x >= gridState.width) {
    return false;
  }

  if (presetId === null || presetId === 'empty') {
    gridState.cells[y][x] = null;
    return true;
  }

  const preset = getPresetById(presetId);
  if (!preset || preset.isEmpty) {
    gridState.cells[y][x] = null;
    return true;
  }

  const existing = getCell(x, y);
  gridState.cells[y][x] = {
    presetId: preset.id,
    markers: existing ? [...existing.markers] : [],
    staircase: existing ? existing.staircase : null,
  };
  return true;
}
