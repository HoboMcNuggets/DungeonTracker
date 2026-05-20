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
  const staircaseToggles = document.getElementById('staircase-toggles');
  const entranceToggles = document.getElementById('entrance-toggles');
  const lockToggles = document.getElementById('lock-toggles');
  const deleteCellBtn = document.getElementById('delete-cell-btn');
  const mapTabsContainer = document.getElementById('map-tabs-container');
  const floorTabsContainer = document.getElementById('floor-tabs-container');
  const exportImageBtn = document.getElementById('export-image-btn');

  let activeCell = null;
  const markerButtons = {};
  const staircaseButtons = {};
  const entranceButtons = {};
  const lockButtons = {};

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

  async function handleTabDelete(tabId) {
    const tab = getTabById(tabId);
    if (!tab) return;

    const confirmed = await showConfirm(
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

  async function handleFloorDelete(floorId) {
    const floor = getFloorById(floorId);
    if (!floor) return;

    const confirmed = await showConfirm(
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

  function updateEditToggles() {
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

    for (const letter of STAIRCASE_LETTERS) {
      const btn = staircaseButtons[letter];
      if (!btn) continue;
      const active = cell.staircases.includes(letter);
      btn.classList.toggle('btn--staircase-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    const preset = getPresetById(cell.presetId);
    for (const side of DOOR_SIDES) {
      const hasDoor = Boolean(preset?.doors[side]);
      const isEntrance = hasDoor && cell.entranceSide === side;

      const entranceBtn = entranceButtons[side];
      if (entranceBtn) {
        entranceBtn.hidden = !hasDoor;
        entranceBtn.disabled = !hasDoor;
        entranceBtn.classList.toggle('btn--entrance-side-active', isEntrance);
        entranceBtn.setAttribute('aria-pressed', isEntrance ? 'true' : 'false');
      }

      const lockBtn = lockButtons[side];
      if (!lockBtn) continue;
      lockBtn.hidden = !hasDoor;
      lockBtn.disabled = !hasDoor || isEntrance;
      const locked = hasDoor && cell.lockedDoors[side];
      lockBtn.classList.toggle('btn--lock-active', locked);
      lockBtn.setAttribute('aria-pressed', locked ? 'true' : 'false');
    }
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

    updateEditToggles();

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

  function handleMove(fromX, fromY, toX, toY) {
    if (!moveCell(fromX, fromY, toX, toY)) return;

    const wasEditingMovedCell =
      activeCell && activeCell.x === fromX && activeCell.y === fromY;

    if (wasEditingMovedCell) {
      activeCell = { x: toX, y: toY };
    }

    refreshGrid();
    syncMapTabFromGrid();

    if (wasEditingMovedCell) {
      showEditView(toX, toY);
    }
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
    updateEditToggles();
    syncMapTabFromGrid();
  }

  function handleMarkerToggle(markerId) {
    if (!activeCell) return;

    toggleMarker(activeCell.x, activeCell.y, markerId);
    syncCell(activeCell.x, activeCell.y);
    updateEditToggles();
    syncMapTabFromGrid();
  }

  function handleEntranceToggle(side) {
    if (!activeCell) return;

    toggleEntranceDoor(activeCell.x, activeCell.y, side);
    syncCell(activeCell.x, activeCell.y);
    updateEditToggles();
    syncMapTabFromGrid();
  }

  function handleStaircaseToggle(letter) {
    if (!activeCell) return;

    toggleStaircase(activeCell.x, activeCell.y, letter);
    syncCell(activeCell.x, activeCell.y);
    updateEditToggles();
    syncMapTabFromGrid();
  }

  function handleLockToggle(side) {
    if (!activeCell) return;

    toggleLockedDoor(activeCell.x, activeCell.y, side);
    syncCell(activeCell.x, activeCell.y);
    updateEditToggles();
    syncMapTabFromGrid();
  }

  function handleDeleteCell() {
    if (!activeCell) return;

    const { x, y } = activeCell;
    setCell(x, y, 'empty');
    syncCell(x, y);

    showPiecesView();
    syncMapTabFromGrid();
  }

  function applyGridSize() {
    const width = clampInput(widthInput);
    const height = clampInput(heightInput);
    const { width: currentWidth, height: currentHeight } = getGridDimensions();

    if (width === currentWidth && height === currentHeight) {
      showSizeMessage('');
      return;
    }

    resizeGrid(width, height);
    showPiecesView();
    refreshGrid();
    syncMapTabFromGrid();
  }

  function refreshGrid() {
    const state = getGridState();
    renderGrid(gridContainer, state, {
      activeCell,
      onDrop: handleDrop,
      onMove: handleMove,
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

  function initEntranceToggles() {
    entranceToggles.replaceChildren();

    for (const side of DOOR_SIDES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--entrance-side';
      btn.textContent = DOOR_SIDE_ARROWS[side];
      btn.dataset.side = side;
      btn.hidden = true;
      btn.disabled = true;
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute(
        'aria-label',
        `Entrée côté ${DOOR_SIDE_NAMES[side]}`
      );
      btn.addEventListener('click', () => handleEntranceToggle(side));
      entranceButtons[side] = btn;
      entranceToggles.appendChild(btn);
    }
  }

  function initLockToggles() {
    lockToggles.replaceChildren();

    for (const side of DOOR_SIDES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--lock';
      btn.textContent = DOOR_SIDE_ARROWS[side];
      btn.dataset.side = side;
      btn.hidden = true;
      btn.disabled = true;
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute(
        'aria-label',
        `Verrouiller la porte ${DOOR_SIDE_NAMES[side]}`
      );
      btn.addEventListener('click', () => handleLockToggle(side));
      lockButtons[side] = btn;
      lockToggles.appendChild(btn);
    }
  }

  function initStaircaseToggles() {
    staircaseToggles.replaceChildren();

    for (const letter of STAIRCASE_LETTERS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--staircase';
      btn.dataset.letter = letter;
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', `Escalier ${letter}`);
      btn.textContent = letter;
      btn.addEventListener('click', () => handleStaircaseToggle(letter));
      staircaseButtons[letter] = btn;
      staircaseToggles.appendChild(btn);
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
    if (isDragActive() || wasDragJustCompleted()) return;
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

  exportImageBtn.addEventListener('click', async () => {
    syncMapTabFromGrid();
    exportImageBtn.disabled = true;
    showSizeMessage('Export de l’image en cours…');

    try {
      await exportPlanAsImage();
      showSizeMessage('Image exportée.');
    } catch {
      showSizeMessage('Échec de l’export image.');
    } finally {
      exportImageBtn.disabled = false;
      refreshGrid();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      showPiecesView();
    }
  });

  setupGridDragCleanup(gridContainer);
  initMarkerToggles();
  initEntranceToggles();
  initLockToggles();
  initStaircaseToggles();
  initPalette();
  initMapTabs();
  syncSizeInputsFromGrid();
  refreshChrome();
  refreshGrid();
})();
