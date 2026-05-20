const PRESET_MIME = 'application/x-dungeon-preset-id';
const CELL_MOVE_MIME = 'application/x-dungeon-cell-move';

let highlightedDropCell = null;
let dragActive = false;
let dragSourceCell = null;
let lastDragEndedAt = 0;

function isDragActive() {
  return dragActive;
}

function wasDragJustCompleted() {
  return Date.now() - lastDragEndedAt < 300;
}

function markDragEnded() {
  lastDragEndedAt = Date.now();
}

function clearDropHighlight() {
  if (highlightedDropCell) {
    highlightedDropCell.classList.remove('grid-cell--drop-target');
    highlightedDropCell = null;
  }
}

function setDropHighlight(cellEl) {
  if (highlightedDropCell === cellEl) return;
  clearDropHighlight();
  if (cellEl) {
    cellEl.classList.add('grid-cell--drop-target');
    highlightedDropCell = cellEl;
  }
}

function getPresetIdFromDragEvent(event) {
  return event.dataTransfer.getData(PRESET_MIME);
}

function getCellMoveFromDragEvent(event) {
  const raw = event.dataTransfer.getData(CELL_MOVE_MIME);
  if (!raw) return null;
  const [x, y] = raw.split(',').map((n) => parseInt(n, 10));
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

function isCellMoveDrag(event) {
  return event.dataTransfer.types.includes(CELL_MOVE_MIME);
}

function isPresetDrag(event) {
  return event.dataTransfer.types.includes(PRESET_MIME);
}

function canAcceptCellMove(x, y, hasRoom, targetFloorId = null) {
  if (hasRoom) return false;
  if (!dragSourceCell) return false;
  if (
    targetFloorId &&
    dragSourceCell.floorId &&
    dragSourceCell.floorId !== targetFloorId
  ) {
    return true;
  }
  return dragSourceCell.x !== x || dragSourceCell.y !== y;
}

function attachPaletteDrag(item, presetId) {
  item.draggable = true;
  item.classList.add('palette-item--draggable');

  item.addEventListener('dragstart', (event) => {
    dragActive = true;
    dragSourceCell = null;
    event.dataTransfer.setData(PRESET_MIME, presetId);
    event.dataTransfer.effectAllowed = 'copy';
    item.classList.add('palette-item--dragging');
  });

  item.addEventListener('dragend', () => {
    dragActive = false;
    markDragEnded();
    item.classList.remove('palette-item--dragging');
    clearDropHighlight();
  });
}

function attachCellDrag(cellEl, x, y, floorId = null) {
  cellEl.draggable = true;
  cellEl.classList.add('grid-cell--draggable');

  cellEl.addEventListener('dragstart', (event) => {
    dragActive = true;
    dragSourceCell = { x, y, floorId };
    event.dataTransfer.setData(CELL_MOVE_MIME, `${x},${y}`);
    event.dataTransfer.effectAllowed = 'move';
    cellEl.classList.add('grid-cell--dragging');
  });

  cellEl.addEventListener('dragend', () => {
    dragActive = false;
    dragSourceCell = null;
    markDragEnded();
    cellEl.classList.remove('grid-cell--dragging');
    clearDropHighlight();
  });
}

function attachCellDropHandlers(cellEl, x, y, handlers) {
  const { hasRoom, onPlacePreset, onMoveCell, floorId = null } = handlers;

  cellEl.addEventListener('dragover', (event) => {
    if (isCellMoveDrag(event)) {
      if (!onMoveCell || !canAcceptCellMove(x, y, hasRoom, floorId)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDropHighlight(cellEl);
      return;
    }

    if (isPresetDrag(event) && onPlacePreset) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDropHighlight(cellEl);
    }
  });

  cellEl.addEventListener('dragleave', (event) => {
    if (!cellEl.contains(event.relatedTarget)) {
      if (highlightedDropCell === cellEl) {
        clearDropHighlight();
      }
    }
  });

  cellEl.addEventListener('drop', (event) => {
    event.preventDefault();
    clearDropHighlight();

    const moveFrom = getCellMoveFromDragEvent(event);
    if (moveFrom && onMoveCell && canAcceptCellMove(x, y, hasRoom, floorId)) {
      onMoveCell(moveFrom.x, moveFrom.y, x, y, dragSourceCell?.floorId ?? null);
      return;
    }

    const presetId = getPresetIdFromDragEvent(event);
    if (presetId && onPlacePreset) {
      onPlacePreset(x, y, presetId);
    }
  });
}

function setupGridDragCleanup(container) {
  container.addEventListener('dragover', (event) => {
    if (!event.target.closest('.grid-container--editable')) return;
    event.preventDefault();
  });

  document.addEventListener('dragend', () => {
    dragSourceCell = null;
    clearDropHighlight();
  });
}
