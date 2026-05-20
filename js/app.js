(function () {
  const MIN_SIZE = 1;
  const MAX_SIZE = 20;

  const sizeForm = document.getElementById('size-form');
  const widthInput = document.getElementById('grid-width');
  const heightInput = document.getElementById('grid-height');
  const sizeMessage = document.getElementById('size-message');
  const floorsView = document.getElementById('floors-view');
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
  const gridSection = document.getElementById('grid-section');
  const mapZoomInBtn = document.getElementById('map-zoom-in');
  const mapZoomOutBtn = document.getElementById('map-zoom-out');
  const mapZoomLabel = document.getElementById('map-zoom-label');

  let activeCell = null;
  let hoveredStaircaseLetter = null;
  let showAllFloors = false;
  const markerButtons = {};
  const staircaseButtons = {};
  const entranceButtons = {};
  const lockButtons = {};

  function getGridContainerFromTarget(target) {
    return target?.closest?.('.grid-container--editable') ?? null;
  }

  function getActiveGridContainer() {
    const activeId = getActiveFloorId();
    if (!activeId) return null;
    return (
      floorsView.querySelector(
        `.grid-container--editable[data-floor-id="${activeId}"]`
      ) ?? floorsView.querySelector('.floor-block--active .grid-container--editable')
    );
  }

  function getStaircaseLinksOverlay() {
    return (
      floorsView.querySelector('.floor-block--active .staircase-links-overlay') ??
      floorsView.querySelector('#staircase-links-overlay')
    );
  }

  function getFloorIdFromGridContainer(gridContainer) {
    return gridContainer?.dataset.floorId ?? getActiveFloorId();
  }

  function runOnFloorGrid(floorId, fn) {
    syncActiveFloorFromGrid();
    const activeId = getActiveFloorId();
    const targetFloor = getFloorById(floorId);
    if (!targetFloor) return;

    if (floorId === activeId) {
      fn();
      syncActiveFloorFromGrid();
      return;
    }

    const activeFloor = getFloorById(activeId);
    setGridState(cloneGridState(targetFloor.grid));
    fn();
    targetFloor.grid = cloneGridState(getGridState());
    if (activeFloor) {
      setGridState(cloneGridState(activeFloor.grid));
    }
  }

  function cloneCellData(cell) {
    if (!cell) return null;
    return {
      presetId: cell.presetId,
      markers: [...cell.markers],
      staircases: [...cell.staircases],
      lockedDoors: { ...cell.lockedDoors },
      entranceSide: cell.entranceSide,
    };
  }

  function getCellInFloorGrid(grid, x, y) {
    if (y < 0 || y >= grid.height || x < 0 || x >= grid.width) return null;
    return normalizeCell(grid.cells[y]?.[x]);
  }

  function moveCellBetweenFloors(
    sourceFloorId,
    fromX,
    fromY,
    targetFloorId,
    toX,
    toY
  ) {
    syncActiveFloorFromGrid();
    const sourceFloor = getFloorById(sourceFloorId);
    const targetFloor = getFloorById(targetFloorId);
    if (!sourceFloor || !targetFloor) return false;

    const sourceGrid = cloneGridState(
      sourceFloorId === getActiveFloorId()
        ? getGridState()
        : sourceFloor.grid
    );
    const targetGrid = cloneGridState(
      targetFloorId === getActiveFloorId()
        ? getGridState()
        : targetFloor.grid
    );

    const sourceCell = getCellInFloorGrid(sourceGrid, fromX, fromY);
    if (!sourceCell) return false;
    if (getCellInFloorGrid(targetGrid, toX, toY)) return false;

    targetGrid.cells[toY][toX] = cloneCellData(sourceCell);
    sourceGrid.cells[fromY][fromX] = null;

    sourceFloor.grid = sourceGrid;
    targetFloor.grid = targetGrid;

    if (
      getActiveFloorId() === sourceFloorId ||
      getActiveFloorId() === targetFloorId
    ) {
      loadActiveFloorIntoEditor();
    }
    return true;
  }

  function focusFloorForEdit(floorId) {
    if (!floorId || getActiveFloorId() === floorId) return;
    syncActiveFloorFromGrid();
    switchToFloor(floorId);
    syncSizeInputsFromGrid();
    if (showAllFloors) {
      refreshGrid();
      refreshFloorTabs();
    }
  }

  function syncCell(x, y) {
    const gridContainer = getActiveGridContainer();
    if (!gridContainer) return;
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
      onReorder: handleMapTabReorder,
    });
  }

  function refreshFloorTabs() {
    renderFloorTabs(floorTabsContainer, getFloors(), getActiveFloorId(), {
      onSelect: handleFloorSelect,
      onAdd: handleFloorAdd,
      onRename: handleFloorRename,
      onDelete: handleFloorDelete,
      onReorder: handleFloorReorder,
    });
  }

  function handleMapTabReorder(sourceTabId, targetTabId) {
    if (!reorderMapTabs(sourceTabId, targetTabId)) return;
    refreshChrome();
  }

  function handleFloorReorder(sourceFloorId, targetFloorId) {
    if (!reorderFloors(sourceFloorId, targetFloorId)) return;
    refreshFloorTabs();
    refreshGrid();
  }

  function refreshChrome() {
    refreshMapTabs();
    refreshFloorTabs();
  }

  function handleTabSelect(tabId) {
    if (getActiveTabId() !== tabId && !switchToTab(tabId)) return;
    showAllFloors = true;
    activeCell = null;
    syncSizeInputsFromGrid();
    showPiecesView();
    refreshGrid();
    refreshChrome();
  }

  function handleTabAdd() {
    createMapTab();
    showAllFloors = true;
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
      `Supprimer la carte Â« ${tab.name} Â» ? Tous ses Ã©tages seront perdus.`
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
    if (getActiveFloorId() !== floorId && !switchToFloor(floorId)) return;
    showAllFloors = false;
    activeCell = null;
    syncSizeInputsFromGrid();
    showPiecesView();
    refreshGrid();
    refreshFloorTabs();
  }

  function handleFloorAdd() {
    createFloor();
    showAllFloors = false;
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
      `Supprimer l'Ã©tage Â« ${floor.name} Â» ? Cette action est irrÃ©versible.`
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
        `Valeur ajustÃ©e entre ${MIN_SIZE} et ${MAX_SIZE}.`,
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
    getActiveGridContainer()
      ?.querySelectorAll('.grid-cell--active')
      .forEach((el) => {
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
    const gridContainer = getActiveGridContainer();
    if (!gridContainer) return;
    setActiveCell(gridContainer, x, y);

    const cell = getCell(x, y);
    const preset = cell ? getPresetById(cell.presetId) : null;
    editHint.textContent = preset
      ? `Case ${formatCellCoord(x, y)} â€” ${preset.label}`
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
    if (!preset || preset.isEmpty) return false;

    setCell(x, y, presetId);
    return true;
  }

  function handleDropOnFloor(floorId, x, y, presetId) {
    runOnFloorGrid(floorId, () => handleDrop(x, y, presetId));
    if (showAllFloors) {
      refreshGrid();
    } else {
      syncCell(x, y);
    }
  }

  function handleMove(fromX, fromY, toX, toY) {
    if (!moveCell(fromX, fromY, toX, toY)) return null;

    const wasEditingMovedCell =
      activeCell && activeCell.x === fromX && activeCell.y === fromY;

    if (wasEditingMovedCell) {
      activeCell = { x: toX, y: toY };
    }

    return { wasEditingMovedCell };
  }

  function handleMoveOnFloor(
    targetFloorId,
    fromX,
    fromY,
    toX,
    toY,
    sourceFloorId = null
  ) {
    const sourceId = sourceFloorId || targetFloorId;
    let editAfter = null;

    if (sourceId !== targetFloorId) {
      const wasEditing =
        activeCell &&
        getActiveFloorId() === sourceId &&
        activeCell.x === fromX &&
        activeCell.y === fromY;

      if (
        !moveCellBetweenFloors(
          sourceId,
          fromX,
          fromY,
          targetFloorId,
          toX,
          toY
        )
      ) {
        return;
      }

      if (wasEditing) {
        activeCell = null;
        showPiecesView();
      }
    } else {
      let moveResult = null;
      runOnFloorGrid(targetFloorId, () => {
        moveResult = handleMove(fromX, fromY, toX, toY);
      });
      if (!moveResult) return;
      if (moveResult.wasEditingMovedCell) {
        editAfter = { x: toX, y: toY };
      }
    }

    refreshGrid();
    if (editAfter) {
      showEditView(editAfter.x, editAfter.y);
    }
  }

  function handleEditPresetSelect(presetId) {
    if (!activeCell) return;

    setCell(activeCell.x, activeCell.y, presetId);
    syncCell(activeCell.x, activeCell.y);
    updateEditPaletteSelection(editPresetContainer, presetId);

    const preset = getPresetById(presetId);
    editHint.textContent = preset
      ? `Case ${formatCellCoord(activeCell.x, activeCell.y)} â€” ${preset.label}`
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

    const { x, y } = activeCell;
    toggleStaircase(x, y, letter);
    syncMapTabFromGrid();
    refreshGrid();
    showEditView(x, y);
    updateEditToggles();
  }

  function handleLockToggle(side) {
    if (!activeCell) return;

    const { coords } = toggleLockedDoor(activeCell.x, activeCell.y, side);
    for (const { x, y } of coords) {
      syncCell(x, y);
    }
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

  function clearStaircaseLinksOverlay() {
    hoveredStaircaseLetter = null;
    const staircaseLinksOverlay = getStaircaseLinksOverlay();
    if (staircaseLinksOverlay) {
      staircaseLinksOverlay.replaceChildren();
    }
  }

  function getCellCenterInContainer(x, y) {
    const gridContainer = getActiveGridContainer();
    if (!gridContainer) return null;
    const cellEl = getCellElement(gridContainer, x, y);
    if (!cellEl) return null;

    const containerRect = gridContainer.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();
    return {
      x: cellRect.left - containerRect.left + cellRect.width / 2,
      y: cellRect.top - containerRect.top + cellRect.height / 2,
    };
  }

  function updateStaircaseLinksOverlay(letter) {
    const staircaseLinksOverlay = getStaircaseLinksOverlay();
    if (!staircaseLinksOverlay) return;

    const gridContainer = getActiveGridContainer();
    if (!gridContainer) return;

    const positions = findStaircasePositionsInGrid(getGridState(), letter);
    if (positions.length < 2) {
      staircaseLinksOverlay.replaceChildren();
      return;
    }

    const centers = positions
      .map(({ x, y }) => getCellCenterInContainer(x, y))
      .filter(Boolean);
    if (centers.length < 2) {
      staircaseLinksOverlay.replaceChildren();
      return;
    }

    const containerRect = gridContainer.getBoundingClientRect();
    staircaseLinksOverlay.setAttribute(
      'viewBox',
      `0 0 ${containerRect.width} ${containerRect.height}`
    );
    staircaseLinksOverlay.replaceChildren();

    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const line = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'line'
        );
        line.setAttribute('x1', String(centers[i].x));
        line.setAttribute('y1', String(centers[i].y));
        line.setAttribute('x2', String(centers[j].x));
        line.setAttribute('y2', String(centers[j].y));
        staircaseLinksOverlay.appendChild(line);
      }
    }
  }

  function handleStaircaseHover(letter) {
    const normalized = String(letter).toUpperCase();
    if (hoveredStaircaseLetter === normalized) return;
    hoveredStaircaseLetter = normalized;
    updateStaircaseLinksOverlay(normalized);
  }

  function handleStaircaseNavigate(letter) {
    syncMapTabFromGrid();
    const targetFloorId = resolveTargetFloorIdForStaircase(
      letter,
      getActiveFloorId()
    );
    if (!targetFloorId) return;

    clearStaircaseLinksOverlay();
    if (!switchToFloor(targetFloorId)) return;

    showAllFloors = false;
    activeCell = null;
    syncSizeInputsFromGrid();
    showPiecesView();
    refreshGrid();
    refreshFloorTabs();
  }

  function refreshGrid() {
    clearStaircaseLinksOverlay();
    const floors = getFloors();
    const activeFloorId = getActiveFloorId();
    const floorsToShow = showAllFloors
      ? floors
      : floors.filter((floor) => floor.id === activeFloorId);

    floorsView.classList.toggle('floors-view--all', showAllFloors);
    floorsView.classList.toggle('floors-view--single', !showAllFloors);
    floorsView.replaceChildren();

    for (const floor of floorsToShow) {
      const isActive = floor.id === activeFloorId;
      const block = document.createElement('div');
      block.className = isActive
        ? 'floor-block floor-block--active'
        : 'floor-block floor-block--inactive';
      block.id = `floor-block-${floor.id}`;
      block.dataset.floorId = floor.id;

      if (showAllFloors) {
        const label = document.createElement('h3');
        label.className = 'floor-block__label';
        label.textContent = floor.name;
        label.tabIndex = 0;
        if (!isActive) {
          label.addEventListener('click', () => handleFloorSelect(floor.id));
          label.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleFloorSelect(floor.id);
            }
          });
        }
        block.appendChild(label);
      }

      const gridState = isActive ? getGridState() : cloneGridState(floor.grid);
      const { frame } = buildFloorGridFrame(gridState, {
        editable: true,
        floorId: floor.id,
        useGridContainerId: !showAllFloors,
        activeCell: isActive && !showAllFloors ? activeCell : null,
        onDrop: (x, y, presetId) => handleDropOnFloor(floor.id, x, y, presetId),
        onMove: (fromX, fromY, toX, toY, sourceFloorId) =>
          handleMoveOnFloor(floor.id, fromX, fromY, toX, toY, sourceFloorId),
      });

      block.appendChild(frame);
      floorsView.appendChild(block);
    }

    requestAnimationFrame(refreshMapZoomLayout);
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
        `EntrÃ©e cÃ´tÃ© ${DOOR_SIDE_NAMES[side]}`
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
    if (!activeCell || isDragActive() || wasMapPanJustCompleted()) return;
    if (editPanel.contains(event.target)) return;
    if (event.target.closest('.grid-cell--filled')) return;
    showPiecesView();
  }

  function findStaircaseBadgeFromEvent(event, gridContainer) {
    if (event.target.closest?.('.room__marker--staircase')) {
      return event.target.closest('.room__marker--staircase');
    }
    if (!gridContainer) return null;
    const cell = event.target.closest('.grid-cell--filled');
    if (!cell || !gridContainer.contains(cell)) return null;
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    const cellData = getCell(x, y);
    if (!cellData?.staircases.length) return null;

    const markers = cell.querySelector('.room__markers');
    if (!markers) return null;

    const badges = markers.querySelectorAll('.room__marker--staircase');
    if (!badges.length) return null;

    const pointerX = event.clientX;
    const pointerY = event.clientY;
    const hitPad = 4;

    let hitBadge = null;
    let hitDist = Infinity;
    for (const badge of badges) {
      const rect = badge.getBoundingClientRect();
      if (
        pointerX >= rect.left - hitPad &&
        pointerX <= rect.right + hitPad &&
        pointerY >= rect.top - hitPad &&
        pointerY <= rect.bottom + hitPad
      ) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = (pointerX - cx) ** 2 + (pointerY - cy) ** 2;
        if (dist < hitDist) {
          hitDist = dist;
          hitBadge = badge;
        }
      }
    }
    return hitBadge;
  }

  floorsView.addEventListener('click', (event) => {
    const gridContainer = getGridContainerFromTarget(event.target);
    if (!gridContainer) return;
    if (isDragActive() || wasDragJustCompleted() || wasMapPanJustCompleted()) return;

    if (showAllFloors) {
      focusFloorForEdit(getFloorIdFromGridContainer(gridContainer));
    }

    const staircaseBadge = findStaircaseBadgeFromEvent(event, gridContainer);
    if (staircaseBadge) {
      event.preventDefault();
      event.stopPropagation();
      syncMapTabFromGrid();
      const letter = staircaseBadge.dataset.staircaseLetter;
      const isLinked = isStaircaseLinkedToOtherFloor(letter);
      staircaseBadge.classList.toggle('room__marker--staircase-linked', isLinked);
      if (isLinked) {
        handleStaircaseNavigate(letter);
      }
      return;
    }

    const cell = event.target.closest('.grid-cell--filled');
    if (!cell || !gridContainer.contains(cell)) return;
    event.stopPropagation();
    handleCellEditClick(
      parseInt(cell.dataset.x, 10),
      parseInt(cell.dataset.y, 10)
    );
  });

  floorsView.addEventListener('mousemove', (event) => {
    const gridContainer = getGridContainerFromTarget(event.target);
    if (!gridContainer) {
      if (hoveredStaircaseLetter) {
        clearStaircaseLinksOverlay();
      }
      return;
    }

    if (showAllFloors && getFloorIdFromGridContainer(gridContainer) !== getActiveFloorId()) {
      if (hoveredStaircaseLetter) {
        clearStaircaseLinksOverlay();
      }
      return;
    }

    const staircaseBadge = findStaircaseBadgeFromEvent(event, gridContainer);
    if (staircaseBadge) {
      handleStaircaseHover(staircaseBadge.dataset.staircaseLetter);
      return;
    }
    if (hoveredStaircaseLetter) {
      clearStaircaseLinksOverlay();
    }
  });

  floorsView.addEventListener('mouseleave', (event) => {
    const gridContainer = getActiveGridContainer();
    if (gridContainer && gridContainer.contains(event.relatedTarget)) return;
    clearStaircaseLinksOverlay();
  });

  floorsView.addEventListener('keydown', (event) => {
    const gridContainer = getGridContainerFromTarget(event.target);
    if (!gridContainer) return;

    if (showAllFloors) {
      focusFloorForEdit(getFloorIdFromGridContainer(gridContainer));
    }

    const staircaseBadge = event.target.closest('.room__marker--staircase');
    if (
      staircaseBadge &&
      gridContainer.contains(staircaseBadge) &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      if (staircaseBadge.classList.contains('room__marker--staircase-linked')) {
        handleStaircaseNavigate(staircaseBadge.dataset.staircaseLetter);
      }
      return;
    }

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
    showSizeMessage('Export de lâ€™image en coursâ€¦');

    try {
      await exportPlanAsImage();
      showSizeMessage('Image exportÃ©e.');
    } catch {
      showSizeMessage('Ã‰chec de lâ€™export image.');
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

  setupGridDragCleanup(floorsView);
  initMapZoom({
    gridSection,
    zoomInBtn: mapZoomInBtn,
    zoomOutBtn: mapZoomOutBtn,
    zoomLabel: mapZoomLabel,
    onZoomChange: () => {
      if (hoveredStaircaseLetter) {
        updateStaircaseLinksOverlay(hoveredStaircaseLetter);
      }
    },
  });

  window.addEventListener('resize', () => {
    refreshMapZoomLayout();
    if (hoveredStaircaseLetter) {
      updateStaircaseLinksOverlay(hoveredStaircaseLetter);
    }
  });
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
