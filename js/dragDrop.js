const PRESET_MIME = 'application/x-dungeon-preset-id';

let highlightedDropCell = null;
let dragActive = false;

function isDragActive() {
  return dragActive;
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

function attachPaletteDrag(item, presetId) {
  item.draggable = true;
  item.classList.add('palette-item--draggable');

  item.addEventListener('dragstart', (event) => {
    dragActive = true;
    event.dataTransfer.setData(PRESET_MIME, presetId);
    event.dataTransfer.effectAllowed = 'copy';
    item.classList.add('palette-item--dragging');
  });

  item.addEventListener('dragend', () => {
    dragActive = false;
    item.classList.remove('palette-item--dragging');
    clearDropHighlight();
  });
}

function attachCellDropHandlers(cellEl, x, y, onDrop) {
  cellEl.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropHighlight(cellEl);
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
    const presetId = getPresetIdFromDragEvent(event);
    if (presetId) {
      onDrop(x, y, presetId);
    }
  });
}

function setupGridDragCleanup(container) {
  container.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  document.addEventListener('dragend', clearDropHighlight);
}
