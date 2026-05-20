(function () {
  const MIN_SIZE = 1;
  const MAX_SIZE = 20;

  const sizeForm = document.getElementById('size-form');
  const widthInput = document.getElementById('grid-width');
  const heightInput = document.getElementById('grid-height');
  const sizeMessage = document.getElementById('size-message');
  const gridContainer = document.getElementById('grid-container');
  const piecesPanel = document.getElementById('pieces-panel');
  const paletteContainer = document.getElementById('palette-container');
  const editPanel = document.getElementById('edit-panel');
  const editHint = document.getElementById('edit-hint');
  const editPresetContainer = document.getElementById('edit-preset-container');
  const markerToggles = document.getElementById('marker-toggles');
  const staircaseEnabled = document.getElementById('staircase-enabled');
  const staircaseLetter = document.getElementById('staircase-letter');
  const deleteCellBtn = document.getElementById('delete-cell-btn');
  const mapTabsContainer = document.getElementById('map-tabs-container');
  const floorTabsContainer = document.getElementById('floor-tabs-container');

  let activeCell = null;
  const markerButtons = {};

  function syncCell(x, y) {
    const cellEl = getCellElement(gridContainer, x, y);
    if (cellEl) {
      updateCellElement(cellEl, getCell(x, y));
    }
  }

  function syncMapTabFromGrid() {
    syncActiveFloorFromGrid();
  }

  function syncSizeInputsFromGrid() {
    const { width, height } = getGridDimensions();
    widthInput.value = String(width);
    heightInput.value = String(height);
  }

  function refreshMapTabs() {
    renderMapTabs(mapTabsContainer, getMapTabs(), getActiveTabId(), {
      onSelect: handleTabSelect,
      onAdd: handleTabAdd,
      onRename: handleTabRename,
      onDelete: handleTabDelete,
    });
  }

  function refreshFloorTabs() {
    renderFloorTabs(floorTabsContainer, getFloors(), getActiveFloorId(), {
      onSelect: handleFloorSelect,
      onAdd: handleFloorAdd,
      onRename: handleFloorRename,
      onDelete: handleFloorDelete,
    });
  }

  function refreshChrome() {
    refreshMapTabs();
    refreshFloorTabs();
  }

  function handleTabSelect(tabId) {
    if (!switchToTab(tabId)) return;
    activeCell = null;
    syncSizeInputsFromGrid();
    showPiecesView();
    refreshGrid();
    refreshChrome();
  }

  function handleTabAdd() {
    createMapTab();
    activeCell = null;
    syncSizeInputsFromGrid();
    showPiecesView();
    refreshGrid();
    refreshChrome();
  }

  function handleTabRename(tabId, name) {
    renameMapTab(tabId, name);
    refreshMapTabs();
  }

  function handleTabDelete(tabId) {
    const tab = getTabById(tabId);
    if (!tab) return;

    const confirmed = window.confirm(
      `Supprimer la carte « ${tab.name} » ? Tous ses étages seront perdus.`
    );
    if (!confirmed) return;

    if (!deleteMapTab(tabId)) return;

    activeCell = null;
    syncSizeInputsFromGrid();
    showPiecesView();
    refreshGrid();
    refreshChrome();
  }

  function handleFloorSelect(floorId) {
    if (!switchToFloor(floorId)) return;
    activeCell = null;
    syncSizeInputsFromGrid();
    showPiecesView();
    refreshGrid();
    refreshFloorTabs();
  }

  function handleFloorAdd() {
    createFloor();
    activeCell = null;
    syncSizeInputsFromGrid();
    showPiecesView();
    refreshGrid();
    refreshFloorTabs();
  }

  function handleFloorRename(floorId, name) {
    renameFloor(floorId, name);
    refreshFloorTabs();
  }

  function handleFloorDelete(floorId) {
    const floor = getFloorById(floorId);
    if (!floor) return;

    const confirmed = window.confirm(
      `Supprimer l'étage « ${floor.name} » ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    if (!deleteFloor(floorId)) return;

    activeCell = null;
    syncSizeInputsFromGrid();
    showPiecesView();
    refreshGrid();
    refreshFloorTabs();
  }

  function syncCellAndNeighbors(x, y) {
    const coords = [{ x, y }];
    const entrance = getEntrance();
    if (entrance && (entrance.x !== x || entrance.y !== y)) {
      coords.push(entrance);
    }
    syncCellsVisuals(gridContainer, coords);
  }

  function showSizeMessage(text, isWarning = false) {
    sizeMessage.textContent = text;
    sizeMessage.classList.toggle('size-message--warning', isWarning);
  }

  function clampInput(input) {
    let value = parseInt(input.value, 10);
    if (Number.isNaN(value)) value = MIN_SIZE;
    if (value < MIN_SIZE || value > MAX_SIZE) {
      const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, value));
      input.value = String(clamped);
      showSizeMessage(
        `Valeur ajustée entre ${MIN_SIZE} et ${MAX_SIZE}.`,
        true
      );
      return clamped;
    }
    showSizeMessage('');
    return value;
  }

  function showPiecesView() {
    activeCell = null;
    piecesPanel.classList.remove('sidebar-view--hidden');
    piecesPanel.setAttribute('aria-hidden', 'false');
    editPanel.classList.add('sidebar-view--hidden');
    editPanel.setAttribute('aria-hidden', 'true');
    gridContainer.querySelectorAll('.grid-cell--active').forEach((el) => {
      el.classList.remove('grid-cell--active');
    });
  }

  function updateMarkerButtons() {
    if (!activeCell) return;
    const cell = getCell(activeCell.x, activeCell.y);
    if (!cell) return;

    for (const marker of getMarkerList()) {
      const btn = markerButtons[marker.id];
      if (!btn) continue;
      const active = cell.markers.includes(marker.id);
      btn.classList.toggle('btn--marker-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    staircaseEnabled.checked = Boolean(cell.staircase);
    staircaseLetter.disabled = !cell.staircase;
    staircaseLetter.value = cell.staircase || '';
  }

  function showEditView(x, y) {
    activeCell = { x, y };
    setActiveCell(gridContainer, x, y);

    const cell = getCell(x, y);
    const preset = cell ? getPresetById(cell.presetId) : null;
    editHint.textContent = preset
      ? `Case ${formatCellCoord(x, y)} — ${preset.label}`
      : `Case ${formatCellCoord(x, y)}`;

    renderSectionedPalette(editPresetContainer, getPresetSections(), {
      draggable: false,
      selectedPresetId: cell ? cell.presetId : null,
      onSelect: handleEditPresetSelect,
    });

    updateMarkerButtons();

    piecesPanel.classList.add('sidebar-view--hidden');
    piecesPanel.setAttribute('aria-hidden', 'true');
    editPanel.classList.remove('sidebar-view--hidden');
    editPanel.setAttribute('aria-hidden', 'false');
  }

  function handleCellEditClick(x, y) {
    if (!getCell(x, y)) return;
    showEditView(x, y);
  }

  function handleDrop(x, y, presetId) {
    const preset = getPresetById(presetId);
    if (!preset || preset.isEmpty) return;

    setCell(x, y, presetId);
    syncCell(x, y);
    syncMapTabFromGrid();
  }

  function handleEditPresetSelect(presetId) {
    if (!activeCell) return;

    setCell(activeCell.x, activeCell.y, presetId);
    syncCell(activeCell.x, activeCell.y);
    updateEditPaletteSelection(editPresetContainer, presetId);

    const preset = getPresetById(presetId);
    editHint.textContent = preset
      ? `Case ${formatCellCoord(activeCell.x, activeCell.y)} — ${preset.label}`
      : editHint.textContent;
    updateMarkerButtons();
    syncMapTabFromGrid();
  }

  function handleMarkerToggle(markerId) {
    if (!activeCell) return;

    const previousEntrance = getEntrance();
    toggleMarker(activeCell.x, activeCell.y, markerId);

    const coords = [{ x: activeCell.x, y: activeCell.y }];
    if (markerId === 'entrance' && previousEntrance) {
      coords.push(previousEntrance);
    }
    const newEntrance = getEntrance();
    if (newEntrance && markerId === 'entrance') {
      coords.push(newEntrance);
    }

    syncCellsVisuals(gridContainer, coords);
    updateMarkerButtons();
    syncMapTabFromGrid();
  }

  function handleStaircaseToggle() {
    if (!activeCell) return;

    if (!staircaseEnabled.checked) {
      setStaircase(activeCell.x, activeCell.y, null);
      staircaseLetter.disabled = true;
      staircaseLetter.value = '';
    } else {
      staircaseLetter.disabled = false;
      const letter = staircaseLetter.value || 'A';
      staircaseLetter.value = letter;
      setStaircase(activeCell.x, activeCell.y, letter);
    }

    syncCell(activeCell.x, activeCell.y);
    updateMarkerButtons();
    syncMapTabFromGrid();
  }

  function handleStaircaseLetterChange() {
    if (!activeCell || !staircaseEnabled.checked) return;
    const letter = staircaseLetter.value;
    if (letter) {
      setStaircase(activeCell.x, activeCell.y, letter);
      syncCell(activeCell.x, activeCell.y);
      syncMapTabFromGrid();
    }
  }

  function handleDeleteCell() {
    if (!activeCell) return;

    const { x, y } = activeCell;
    const previousEntrance = getEntrance();
    setCell(x, y, 'empty');
    syncCell(x, y);

    if (previousEntrance) {
      syncCellsVisuals(gridContainer, [previousEntrance]);
    }

    showPiecesView();
    syncMapTabFromGrid();
  }

  function applyGridSize() {
    const width = clampInput(widthInput);
    const height = clampInput(heightInput);
    createGrid(width, height);
    showPiecesView();
    refreshGrid();
    syncMapTabFromGrid();
  }

  function refreshGrid() {
    const state = getGridState();
    renderGrid(gridContainer, state, {
      activeCell,
      onDrop: handleDrop,
    });
  }

  function initMarkerToggles() {
    markerToggles.replaceChildren();

    for (const marker of getMarkerList()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn btn--marker btn--marker-${marker.id}`;
      btn.textContent = marker.label;
      btn.dataset.markerId = marker.id;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => handleMarkerToggle(marker.id));
      markerButtons[marker.id] = btn;
      markerToggles.appendChild(btn);
    }
  }

  function initStaircaseSelect() {
    staircaseLetter.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '—';
    staircaseLetter.appendChild(empty);

    for (const letter of STAIRCASE_LETTERS) {
      const opt = document.createElement('option');
      opt.value = letter;
      opt.textContent = letter;
      staircaseLetter.appendChild(opt);
    }
  }

  function initPalette() {
    renderSectionedPalette(paletteContainer, getPresetSections(), {
      draggable: true,
    });
  }

  function handleClickOutside(event) {
    if (!activeCell || isDragActive()) return;
    if (editPanel.contains(event.target)) return;
    if (event.target.closest('.grid-cell--filled')) return;
    showPiecesView();
  }

  gridContainer.addEventListener('click', (event) => {
    if (isDragActive()) return;
    const cell = event.target.closest('.grid-cell--filled');
    if (!cell || !gridContainer.contains(cell)) return;
    event.stopPropagation();
    handleCellEditClick(
      parseInt(cell.dataset.x, 10),
      parseInt(cell.dataset.y, 10)
    );
  });

  gridContainer.addEventListener('keydown', (event) => {
    const cell = event.target.closest('.grid-cell--filled');
    if (!cell || !gridContainer.contains(cell)) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCellEditClick(
        parseInt(cell.dataset.x, 10),
        parseInt(cell.dataset.y, 10)
      );
    }
  });

  document.addEventListener('click', (event) => {
    if (!activeCell) return;
    handleClickOutside(event);
  });

  sizeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    applyGridSize();
  });

  widthInput.addEventListener('change', () => clampInput(widthInput));
  heightInput.addEventListener('change', () => clampInput(heightInput));

  deleteCellBtn.addEventListener('click', handleDeleteCell);
  staircaseEnabled.addEventListener('change', handleStaircaseToggle);
  staircaseLetter.addEventListener('change', handleStaircaseLetterChange);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      showPiecesView();
    }
  });

  setupGridDragCleanup(gridContainer);
  initMarkerToggles();
  initStaircaseSelect();
  initPalette();
  initMapTabs();
  syncSizeInputsFromGrid();
  refreshChrome();
  refreshGrid();
})();
