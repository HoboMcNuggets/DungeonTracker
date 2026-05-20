const MIN_SIZE = 1;
const MAX_SIZE = 20;
const DEFAULT_GRID_SIZE = 10;

const DOOR_SIDES = ['n', 'e', 's', 'w'];
const DOOR_SIDE_ARROWS = { n: '↑', e: '→', s: '↓', w: '←' };
const DOOR_SIDE_NAMES = { n: 'nord', e: 'est', s: 'sud', w: 'ouest' };
const OPPOSITE_DOOR_SIDE = { n: 's', s: 'n', e: 'w', w: 'e' };
const DOOR_NEIGHBOR_OFFSET = { n: { x: 0, y: -1 }, e: { x: 1, y: 0 }, s: { x: 0, y: 1 }, w: { x: -1, y: 0 } };
const REMOVED_MARKER_IDS = new Set(['key', 'entrance']);

const EMPTY_LOCKED_DOORS = { n: false, e: false, s: false, w: false };

let gridState = createGrid(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE);

function createEmptyCellData(presetId) {
  return {
    presetId,
    markers: [],
    staircases: [],
    lockedDoors: { ...EMPTY_LOCKED_DOORS },
    entranceSide: null,
  };
}

function sanitizeMarkers(markers) {
  return (Array.isArray(markers) ? markers : []).filter(
    (id) => !REMOVED_MARKER_IDS.has(id)
  );
}

function normalizeEntranceSide(cell, preset) {
  let side = cell.entranceSide ?? null;
  if (side && !DOOR_SIDES.includes(side)) {
    side = null;
  }
  if (side && !preset?.doors[side]) {
    side = null;
  }

  const markers = Array.isArray(cell.markers) ? cell.markers : [];
  if (!side && markers.includes('entrance') && preset) {
    side = DOOR_SIDES.find((s) => preset.doors[s]) ?? null;
  }

  return side;
}

function normalizeLockedDoors(cell) {
  const preset = getPresetById(cell.presetId);
  const raw =
    cell.lockedDoors && typeof cell.lockedDoors === 'object'
      ? cell.lockedDoors
      : EMPTY_LOCKED_DOORS;
  const locked = { ...EMPTY_LOCKED_DOORS };

  for (const side of DOOR_SIDES) {
    locked[side] = Boolean(raw[side]) && Boolean(preset?.doors[side]);
  }

  return locked;
}

function normalizeStaircases(cell) {
  if (Array.isArray(cell.staircases)) {
    const seen = new Set();
    const letters = [];
    for (const raw of cell.staircases) {
      const letter = String(raw).toUpperCase();
      if (!isValidStaircaseLetter(letter) || seen.has(letter)) continue;
      seen.add(letter);
      letters.push(letter);
    }
    return letters.sort();
  }

  if (cell.staircase) {
    const letter = String(cell.staircase).toUpperCase();
    return isValidStaircaseLetter(letter) ? [letter] : [];
  }

  return [];
}

function normalizeCell(cell) {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'string') {
    return createEmptyCellData(cell);
  }

  const presetId = cell.presetId;
  const preset = getPresetById(presetId);
  const entranceSide = normalizeEntranceSide(cell, preset);
  const normalized = {
    presetId,
    markers: sanitizeMarkers(cell.markers),
    staircases: normalizeStaircases(cell),
    lockedDoors: normalizeLockedDoors(cell),
    entranceSide,
  };

  if (entranceSide) {
    normalized.lockedDoors[entranceSide] = false;
  }

  return normalized;
}

function clampSize(value, fallback = DEFAULT_GRID_SIZE) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, n));
}

function normalizeGridDimensions(grid) {
  if (!grid || !Array.isArray(grid.cells)) {
    return { width: DEFAULT_GRID_SIZE, height: DEFAULT_GRID_SIZE };
  }

  const heightFromCells = grid.cells.length;
  const widthFromCells = grid.cells.reduce(
    (max, row) => Math.max(max, Array.isArray(row) ? row.length : 0),
    0
  );

  return {
    width: clampSize(grid.width ?? (widthFromCells || DEFAULT_GRID_SIZE)),
    height: clampSize(grid.height ?? (heightFromCells || DEFAULT_GRID_SIZE)),
  };
}

function createGrid(width = DEFAULT_GRID_SIZE, height = DEFAULT_GRID_SIZE) {
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
  return { width: w, height: h, cells };
}

function resizeGrid(width, height) {
  const current = getGridState();
  return setGridState({
    width,
    height,
    cells: current.cells,
  });
}

function setGridState(state) {
  const { width: w, height: h } = normalizeGridDimensions(state);
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

function isEntrance(x, y) {
  const cell = getCell(x, y);
  return Boolean(cell?.entranceSide);
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

function getDoorNeighborCoords(x, y, side) {
  const offset = DOOR_NEIGHBOR_OFFSET[side];
  if (!offset) return null;
  return { x: x + offset.x, y: y + offset.y };
}

function syncLinkedDoorLock(sourceX, sourceY, side, locked, updatedCoords) {
  const neighborCoords = getDoorNeighborCoords(sourceX, sourceY, side);
  if (!neighborCoords) return;

  const { x: nx, y: ny } = neighborCoords;
  const neighborCell = getCell(nx, ny);
  if (!neighborCell) return;

  const oppositeSide = OPPOSITE_DOOR_SIDE[side];
  const neighborPreset = getPresetById(neighborCell.presetId);
  if (!neighborPreset?.doors[oppositeSide]) return;
  if (neighborCell.entranceSide === oppositeSide) return;

  neighborCell.lockedDoors[oppositeSide] = locked;
  gridState.cells[ny][nx] = neighborCell;
  updatedCoords.push({ x: nx, y: ny });
}

function toggleLockedDoor(x, y, side) {
  const cell = getCell(x, y);
  if (!cell || !DOOR_SIDES.includes(side)) {
    return { locked: false, coords: [] };
  }

  const preset = getPresetById(cell.presetId);
  if (!preset?.doors[side]) {
    return { locked: false, coords: [] };
  }
  if (cell.entranceSide === side) {
    return { locked: false, coords: [] };
  }

  cell.lockedDoors[side] = !cell.lockedDoors[side];
  gridState.cells[y][x] = cell;

  const coords = [{ x, y }];
  syncLinkedDoorLock(x, y, side, cell.lockedDoors[side], coords);
  return { locked: cell.lockedDoors[side], coords };
}

function toggleEntranceDoor(x, y, side) {
  const cell = getCell(x, y);
  if (!cell || !DOOR_SIDES.includes(side)) return false;

  const preset = getPresetById(cell.presetId);
  if (!preset?.doors[side]) return false;

  if (cell.entranceSide === side) {
    cell.entranceSide = null;
    gridState.cells[y][x] = cell;
    return false;
  }

  cell.entranceSide = side;
  cell.lockedDoors[side] = false;
  gridState.cells[y][x] = cell;
  return true;
}

function toggleStaircase(x, y, letter) {
  const cell = getCell(x, y);
  if (!cell) return false;

  const normalized = String(letter).toUpperCase();
  if (!isValidStaircaseLetter(normalized)) return false;

  const index = cell.staircases.indexOf(normalized);
  if (index >= 0) {
    cell.staircases.splice(index, 1);
  } else {
    cell.staircases.push(normalized);
    cell.staircases.sort();
  }

  gridState.cells[y][x] = cell;
  return index < 0;
}

function moveCell(fromX, fromY, toX, toY) {
  if (fromX === toX && fromY === toY) return false;
  if (
    fromY < 0 ||
    fromY >= gridState.height ||
    fromX < 0 ||
    fromX >= gridState.width ||
    toY < 0 ||
    toY >= gridState.height ||
    toX < 0 ||
    toX >= gridState.width
  ) {
    return false;
  }

  const source = getCell(fromX, fromY);
  if (!source) return false;
  if (getCell(toX, toY)) return false;

  gridState.cells[toY][toX] = {
    presetId: source.presetId,
    markers: [...source.markers],
    staircases: [...source.staircases],
    lockedDoors: { ...source.lockedDoors },
    entranceSide: source.entranceSide,
  };
  gridState.cells[fromY][fromX] = null;
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
  const lockedDoors = existing
    ? normalizeLockedDoors({ presetId: preset.id, lockedDoors: existing.lockedDoors })
    : { ...EMPTY_LOCKED_DOORS };

  let entranceSide = existing?.entranceSide ?? null;
  if (entranceSide && !preset.doors[entranceSide]) {
    entranceSide = null;
  }
  if (entranceSide) {
    lockedDoors[entranceSide] = false;
  }

  gridState.cells[y][x] = {
    presetId: preset.id,
    markers: existing ? [...existing.markers] : [],
    staircases: existing ? [...existing.staircases] : [],
    lockedDoors,
    entranceSide,
  };
  return true;
}
