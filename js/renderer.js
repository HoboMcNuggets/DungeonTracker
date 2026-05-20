const EDGES = ['n', 'e', 's', 'w'];

function columnToLetter(x) {
  return String.fromCharCode(65 + x);
}

function formatCellCoord(x, y) {
  return `${columnToLetter(x)}${y + 1}`;
}

function formatCellLabel(x, y, preset, cellData) {
  const coord = formatCellCoord(x, y);
  let label = preset ? `Case ${coord} : ${preset.label}` : `Case ${coord} : vide`;

  if (cellData) {
    const markerLabels = cellData.markers
      .map((id) => getMarkerById(id)?.label)
      .filter(Boolean);
    if (markerLabels.length) {
      label += ` — ${markerLabels.join(', ')}`;
    }
    if (cellData.entranceSide) {
      label += ` — entrée ${DOOR_SIDE_ARROWS[cellData.entranceSide]}`;
    }
    if (preset) {
      const locked = EDGES.filter(
        (side) => preset.doors[side] && cellData.lockedDoors[side]
      ).map((side) => DOOR_SIDE_ARROWS[side]);
      if (locked.length) {
        const plural = locked.length > 1;
        label += ` — porte${plural ? 's' : ''} verrouillée${plural ? 's' : ''} ${locked.join(', ')}`;
      }
      const breakable = EDGES.filter(
        (side) => cellData.breakableWalls[side]
      ).map((side) => DOOR_SIDE_ARROWS[side]);
      if (breakable.length) {
        const plural = breakable.length > 1;
        label += ` — porte${plural ? 's' : ''} brisable${plural ? 's' : ''} ${breakable.join(', ')}`;
      }
    }
    if (cellData.staircases.length) {
      label += ` — escaliers ${cellData.staircases.join(', ')}`;
    }
  }

  return label;
}

function getMarkersLayoutClass(count) {
  if (count <= 1) return 'room__markers--single';
  if (count <= 4) return 'room__markers--grid-2';
  return 'room__markers--grid-3';
}

function collectMarkerBadges(cellData) {
  const badges = [];

  for (const markerId of cellData.markers) {
    const marker = getMarkerById(markerId);
    if (!marker) continue;
    const badge = document.createElement('span');
    badge.className = `room__marker room__marker--${markerId}`;
    badge.textContent = marker.shortLabel;
    badge.setAttribute('aria-hidden', 'true');
    badge.title = marker.label;
    badges.push(badge);
  }

  for (const letter of cellData.staircases) {
    badges.push(createStaircaseBadge(letter));
  }

  return badges;
}

function buildMarkerBadges(cellData) {
  const badges = collectMarkerBadges(cellData);
  const wrap = document.createElement('div');
  wrap.className = `room__markers ${getMarkersLayoutClass(badges.length)}`;
  badges.forEach((badge) => wrap.appendChild(badge));
  return wrap;
}

function buildRoomElement(preset, cellData = null) {
  const room = document.createElement('div');
  room.className = 'room';

  if (!preset || preset.isEmpty) {
    room.classList.add('room--empty');
    return room;
  }

  room.classList.add('room--filled');
  if (cellData?.entranceSide) {
    room.classList.add('room--entrance');
  }

  for (const side of EDGES) {
    const edge = document.createElement('div');
    const hasDoor = preset.doors[side];
    const isEntranceDoor = Boolean(hasDoor && cellData?.entranceSide === side);
    const isLocked = Boolean(
      hasDoor && cellData?.lockedDoors?.[side] && !isEntranceDoor
    );
    const isBreakable = Boolean(
      cellData?.breakableWalls?.[side] && !isEntranceDoor
    );
    const showAsDoor = hasDoor || isBreakable;
    edge.classList.add('room__edge', `room__edge--${side}`);
    edge.classList.add(showAsDoor ? 'room__edge--door' : 'room__edge--wall');
    if (isEntranceDoor) {
      edge.classList.add('room__edge--entrance');
    }
    if (isLocked) {
      edge.classList.add('room__edge--locked');
      const lock = document.createElement('span');
      lock.className = 'room__edge__lock';
      lock.setAttribute('aria-hidden', 'true');
      edge.appendChild(lock);
    }
    if (isBreakable) {
      edge.classList.add('room__edge--breakable');
      const bomb = document.createElement('span');
      bomb.className = 'room__edge__bomb';
      bomb.setAttribute('aria-hidden', 'true');
      edge.appendChild(bomb);
    }
    room.appendChild(edge);
  }

  if (cellData && (cellData.markers.length || cellData.staircases.length)) {
    room.appendChild(buildMarkerBadges(cellData));
  }

  return room;
}

function buildCellElement(x, y, cellData, options = {}) {
  const { isActive = false, onDrop, onMove, floorId = null } = options;
  const preset = cellData ? getPresetById(cellData.presetId) : null;
  const hasRoom = Boolean(preset);

  const cell = document.createElement('div');
  cell.className = 'grid-cell';
  cell.dataset.x = String(x);
  cell.dataset.y = String(y);
  cell.setAttribute('role', hasRoom ? 'button' : 'gridcell');
  cell.setAttribute('tabindex', hasRoom ? '0' : '-1');
  cell.setAttribute('aria-label', formatCellLabel(x, y, preset, cellData));

  if (hasRoom) {
    cell.classList.add('grid-cell--filled');
  }
  if (isActive) {
    cell.classList.add('grid-cell--active');
  }
  if (cellData?.entranceSide) {
    cell.classList.add('grid-cell--entrance');
  }

  cell.appendChild(buildRoomElement(preset, cellData));

  if (onDrop || onMove) {
    attachCellDropHandlers(cell, x, y, {
      hasRoom,
      onPlacePreset: onDrop,
      onMoveCell: onMove,
      floorId,
    });
  }

  if (hasRoom && onMove) {
    attachCellDrag(cell, x, y, floorId);
  }

  return cell;
}

function buildPresetIcon(preset) {
  const wrap = document.createElement('div');
  wrap.className = 'palette-item__icon';
  wrap.appendChild(buildRoomElement(preset));
  return wrap;
}

function createPaletteItem(preset, options = {}) {
  const { draggable = false, selected = false, onSelect } = options;

  const item = document.createElement('div');
  item.className = 'palette-item';
  item.dataset.presetId = preset.id;
  item.setAttribute('role', onSelect ? 'button' : 'listitem');
  item.setAttribute('tabindex', onSelect ? '0' : '-1');
  item.setAttribute('aria-label', preset.label);

  if (selected) {
    item.classList.add('palette-item--selected');
  }

  item.appendChild(buildPresetIcon(preset));

  const label = document.createElement('span');
  label.className = 'palette-item__label';
  label.textContent = preset.label;
  item.appendChild(label);

  if (draggable) {
    attachPaletteDrag(item, preset.id);
  }

  if (onSelect) {
    const select = () => onSelect(preset.id);
    item.addEventListener('click', select);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  }

  return item;
}

function updateCellElement(cellEl, cellData) {
  const x = parseInt(cellEl.dataset.x, 10);
  const y = parseInt(cellEl.dataset.y, 10);
  const preset = cellData ? getPresetById(cellData.presetId) : null;
  const hasRoom = Boolean(preset);

  cellEl.classList.toggle('grid-cell--filled', hasRoom);
  cellEl.classList.toggle(
    'grid-cell--entrance',
    Boolean(cellData?.entranceSide)
  );
  cellEl.setAttribute('role', hasRoom ? 'button' : 'gridcell');
  cellEl.setAttribute('tabindex', hasRoom ? '0' : '-1');
  cellEl.setAttribute('aria-label', formatCellLabel(x, y, preset, cellData));
  cellEl.replaceChildren(buildRoomElement(preset, cellData));
}

function buildColLabel(x) {
  const label = document.createElement('span');
  label.className = 'grid-ruler grid-ruler--col';
  label.textContent = columnToLetter(x);
  return label;
}

function buildRowLabel(y) {
  const label = document.createElement('span');
  label.className = 'grid-ruler grid-ruler--row';
  label.textContent = String(y + 1);
  return label;
}

function renderGridRulers(width, height, colLabelsEl = null, rowLabelsEl = null) {
  const colLabels =
    colLabelsEl ?? document.getElementById('grid-col-labels');
  const rowLabels =
    rowLabelsEl ?? document.getElementById('grid-row-labels');
  if (!colLabels || !rowLabels) return;

  colLabels.replaceChildren();
  colLabels.style.gridTemplateColumns = `repeat(${width}, var(--cell-size))`;

  rowLabels.replaceChildren();
  rowLabels.style.gridTemplateRows = `repeat(${height}, var(--cell-size))`;

  for (let x = 0; x < width; x++) {
    colLabels.appendChild(buildColLabel(x));
  }
  for (let y = 0; y < height; y++) {
    rowLabels.appendChild(buildRowLabel(y));
  }
}

function buildFloorGridFrame(state, options = {}) {
  const {
    editable = false,
    activeCell = null,
    onDrop,
    onMove,
    previewLabel = null,
    floorId = null,
    useGridContainerId = true,
  } = options;

  const frame = document.createElement('div');
  frame.className = 'grid-frame';
  frame.style.setProperty('--grid-cols', String(state.width));
  frame.style.setProperty('--grid-rows', String(state.height));

  const corner = document.createElement('div');
  corner.className = 'grid-frame__corner';
  corner.setAttribute('aria-hidden', 'true');

  const colLabels = document.createElement('div');
  colLabels.className = 'grid-frame__col-labels';
  colLabels.setAttribute('aria-hidden', 'true');

  const rowLabels = document.createElement('div');
  rowLabels.className = 'grid-frame__row-labels';
  rowLabels.setAttribute('aria-hidden', 'true');

  const wrap = document.createElement('div');
  wrap.className = 'grid-container-wrap';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid-container';

  let staircaseLinksOverlay = null;

  if (editable) {
    gridContainer.classList.add('grid-container--editable');
    gridContainer.setAttribute('role', 'grid');
    if (floorId) {
      gridContainer.dataset.floorId = floorId;
    }
    if (useGridContainerId) {
      gridContainer.id = 'grid-container';
    }

    staircaseLinksOverlay = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    staircaseLinksOverlay.classList.add('staircase-links-overlay');
    if (useGridContainerId) {
      staircaseLinksOverlay.id = 'staircase-links-overlay';
    }
    staircaseLinksOverlay.setAttribute('aria-hidden', 'true');
    wrap.append(gridContainer, staircaseLinksOverlay);
  } else {
    gridContainer.setAttribute('role', 'img');
    if (previewLabel) {
      gridContainer.setAttribute('aria-label', previewLabel);
    }
    wrap.appendChild(gridContainer);
  }

  frame.append(corner, colLabels, rowLabels, wrap);

  renderGrid(gridContainer, state, {
    colLabelsEl: colLabels,
    rowLabelsEl: rowLabels,
    floorId: editable ? floorId : null,
    activeCell: editable ? activeCell : null,
    onDrop: editable ? onDrop : undefined,
    onMove: editable ? onMove : undefined,
  });

  return { frame, gridContainer, staircaseLinksOverlay };
}

function buildGridFrameElement(state, options = {}) {
  const cellSize = options.cellSize ?? 'var(--cell-size-max)';

  const frame = document.createElement('div');
  frame.className = 'grid-frame export-grid-frame';
  frame.style.setProperty('--cell-size', cellSize);
  frame.style.setProperty('--grid-cols', String(state.width));
  frame.style.setProperty('--grid-rows', String(state.height));

  const corner = document.createElement('div');
  corner.className = 'grid-frame__corner';
  corner.setAttribute('aria-hidden', 'true');

  const colLabels = document.createElement('div');
  colLabels.className = 'grid-frame__col-labels';
  colLabels.setAttribute('aria-hidden', 'true');

  const rowLabels = document.createElement('div');
  rowLabels.className = 'grid-frame__row-labels';
  rowLabels.setAttribute('aria-hidden', 'true');

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid-container';
  gridContainer.setAttribute('role', 'img');

  frame.append(corner, colLabels, rowLabels, gridContainer);

  renderGrid(gridContainer, state, {
    colLabelsEl: colLabels,
    rowLabelsEl: rowLabels,
    activeCell: null,
  });

  return frame;
}

function renderGrid(container, state, options = {}) {
  const {
    activeCell = null,
    onDrop,
    onMove,
    floorId = null,
    colLabelsEl = null,
    rowLabelsEl = null,
  } = options;
  const useDedicatedRulers = Boolean(colLabelsEl && rowLabelsEl);

  container.replaceChildren();
  container.style.gridTemplateColumns = `repeat(${state.width}, var(--cell-size))`;

  if (useDedicatedRulers) {
    renderGridRulers(state.width, state.height, colLabelsEl, rowLabelsEl);
  } else {
    const root = document.documentElement;
    root.style.setProperty('--grid-cols', String(state.width));
    root.style.setProperty('--grid-rows', String(state.height));
    renderGridRulers(state.width, state.height);
  }

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cellData = normalizeCell(state.cells[y][x]);
      const isActive = activeCell && activeCell.x === x && activeCell.y === y;
      const cell = buildCellElement(x, y, cellData, {
        isActive,
        onDrop,
        onMove,
        floorId,
      });
      container.appendChild(cell);
    }
  }
}

function renderSectionedPalette(container, sections, options = {}) {
  const { draggable = false, selectedPresetId = null, onSelect } = options;
  container.replaceChildren();
  container.className = 'palette-sections';
  container.setAttribute('role', 'list');

  for (const section of sections) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'palette-section';
    sectionEl.dataset.sectionId = section.id;
    sectionEl.setAttribute('aria-label', section.label);

    const title = document.createElement('h3');
    title.className = 'palette-section__title';
    title.textContent = section.label;
    sectionEl.appendChild(title);

    const rows = section.rows ?? [{ presets: section.presets }];

    for (const row of rows) {
      const items = document.createElement('div');
      items.className = 'palette-section__items';
      items.setAttribute('role', 'list');

      for (const preset of row.presets) {
        const item = createPaletteItem(preset, {
          draggable,
          selected: selectedPresetId === preset.id,
          onSelect,
        });
        items.appendChild(item);
      }

      sectionEl.appendChild(items);
    }

    container.appendChild(sectionEl);
  }
}

function getCellElement(container, x, y) {
  return container.querySelector(`[data-x="${x}"][data-y="${y}"]`);
}

function setActiveCell(container, x, y) {
  container.querySelectorAll('.grid-cell--active').forEach((el) => {
    el.classList.remove('grid-cell--active');
  });
  const cell = getCellElement(container, x, y);
  if (cell) {
    cell.classList.add('grid-cell--active');
  }
}

function updateEditPaletteSelection(container, presetId) {
  container.querySelectorAll('.palette-item').forEach((el) => {
    el.classList.toggle(
      'palette-item--selected',
      el.dataset.presetId === presetId
    );
  });
}

function syncCellsVisuals(container, coords) {
  for (const coord of coords) {
    if (!coord) continue;
    const cellEl = getCellElement(container, coord.x, coord.y);
    if (cellEl) {
      updateCellElement(cellEl, getCell(coord.x, coord.y));
    }
  }
}

function startSegmentRename(labelEl, itemId, currentName, onRename, options = {}) {
  const { classPrefix = 'map-tabs', renameAriaLabel = 'Renommer', maxLength = 40 } =
    options;

  if (labelEl.querySelector(`.${classPrefix}__rename-input`)) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = `${classPrefix}__rename-input`;
  input.value = currentName;
  input.setAttribute('aria-label', renameAriaLabel);
  input.maxLength = maxLength;

  const finish = (save) => {
    if (save) {
      onRename(itemId, input.value);
    } else {
      labelEl.textContent = currentName;
    }
  };

  labelEl.replaceChildren(input);
  input.focus();
  input.select();

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });

  input.addEventListener('blur', () => finish(true));
}

const TAB_REORDER_MIME = 'application/x-dungeon-tab-reorder';
const TAB_CLICK_DELAY_MS = 250;

let tabReorderDragId = null;
let lastTabReorderEndedAt = 0;

function wasTabReorderJustCompleted() {
  return Date.now() - lastTabReorderEndedAt < 300;
}

function attachTabReorder(tabBtn, itemId, classPrefix, items, onReorder) {
  if (!onReorder || items.length < 2) return;

  tabBtn.draggable = true;

  tabBtn.addEventListener('dragstart', (event) => {
    if (event.target.closest(`.${classPrefix}__close`)) {
      event.preventDefault();
      return;
    }
    tabReorderDragId = itemId;
    event.dataTransfer.setData(TAB_REORDER_MIME, itemId);
    event.dataTransfer.effectAllowed = 'move';
    tabBtn.classList.add(`${classPrefix}__tab--dragging`);
  });

  tabBtn.addEventListener('dragend', () => {
    tabBtn.classList.remove(`${classPrefix}__tab--dragging`);
    tabReorderDragId = null;
    tabBtn
      .closest(`.${classPrefix}`)
      ?.querySelectorAll(`.${classPrefix}__tab--drop-target`)
      .forEach((el) => el.classList.remove(`${classPrefix}__tab--drop-target`));
    lastTabReorderEndedAt = Date.now();
  });

  tabBtn.addEventListener('dragover', (event) => {
    if (!event.dataTransfer.types.includes(TAB_REORDER_MIME)) return;
    if (tabReorderDragId === itemId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    tabBtn.classList.add(`${classPrefix}__tab--drop-target`);
  });

  tabBtn.addEventListener('dragleave', (event) => {
    if (!tabBtn.contains(event.relatedTarget)) {
      tabBtn.classList.remove(`${classPrefix}__tab--drop-target`);
    }
  });

  tabBtn.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    tabBtn.classList.remove(`${classPrefix}__tab--drop-target`);
    const sourceId = event.dataTransfer.getData(TAB_REORDER_MIME);
    if (sourceId && sourceId !== itemId) {
      onReorder(sourceId, itemId);
    }
  });
}

function renderSegmentTabs(container, items, activeId, options = {}) {
  const {
    classPrefix = 'map-tabs',
    ariaLabel = 'Onglets',
    addAriaLabel = 'Ajouter',
    addTitle = 'Ajouter',
    renameAriaLabel = 'Renommer',
    onSelect,
    onAdd,
    onRename,
    onDelete,
    onReorder,
  } = options;

  const canDelete = items.length > 1;
  const canReorder = items.length > 1 && typeof onReorder === 'function';

  container.replaceChildren();
  container.className = classPrefix;
  container.setAttribute('role', 'tablist');
  container.setAttribute('aria-label', ariaLabel);

  for (const item of items) {
    const isActive = item.id === activeId;
    const tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    tabBtn.className = `${classPrefix}__tab`;
    tabBtn.classList.toggle(`${classPrefix}__tab--active`, isActive);
    tabBtn.setAttribute('role', 'tab');
    tabBtn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tabBtn.dataset.itemId = item.id;
    tabBtn.title = canReorder
      ? `${item.name} — glisser pour réordonner`
      : item.name;

    const label = document.createElement('span');
    label.className = `${classPrefix}__label`;
    label.textContent = item.name;
    tabBtn.appendChild(label);

    let clickTimer = null;

    const clearClickTimer = () => {
      clearTimeout(clickTimer);
      clickTimer = null;
    };

    const beginRename = (event) => {
      if (event.target.closest(`.${classPrefix}__close`)) return;
      event.preventDefault();
      event.stopPropagation();
      clearClickTimer();
      if (label.querySelector(`.${classPrefix}__rename-input`)) return;
      startSegmentRename(label, item.id, item.name, onRename, {
        classPrefix,
        renameAriaLabel,
      });
    };

    tabBtn.addEventListener('dblclick', beginRename);

    if (canDelete) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = `${classPrefix}__close`;
      closeBtn.setAttribute('aria-label', `Supprimer ${item.name}`);
      closeBtn.setAttribute('aria-hidden', 'true');
      closeBtn.textContent = '\u00D7';
      closeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        onDelete(item.id);
      });
      tabBtn.appendChild(closeBtn);
    }

    if (canReorder) {
      attachTabReorder(tabBtn, item.id, classPrefix, items, onReorder);
      tabBtn.addEventListener('dragstart', clearClickTimer);
    }

    tabBtn.addEventListener('click', (event) => {
      if (event.target.closest(`.${classPrefix}__close`)) return;
      if (wasTabReorderJustCompleted()) return;
      clearClickTimer();
      clickTimer = setTimeout(() => {
        clickTimer = null;
        onSelect(item.id);
      }, TAB_CLICK_DELAY_MS);
    });

    container.appendChild(tabBtn);
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = `${classPrefix}__add`;
  addBtn.setAttribute('aria-label', addAriaLabel);
  addBtn.textContent = '+';
  addBtn.title = addTitle;
  addBtn.addEventListener('click', onAdd);
  container.appendChild(addBtn);
}

function renderMapTabs(container, tabs, activeTabId, options = {}) {
  renderSegmentTabs(container, tabs, activeTabId, {
    classPrefix: 'map-tabs',
    ariaLabel: 'Cartes du donjon',
    addAriaLabel: 'Nouvelle carte',
    addTitle: 'Nouvelle carte',
    renameAriaLabel: 'Renommer la carte',
    ...options,
  });
}

function renderFloorTabs(container, floors, activeFloorId, options = {}) {
  renderSegmentTabs(container, floors, activeFloorId, {
    classPrefix: 'floor-tabs',
    ariaLabel: 'Étages de la carte',
    addAriaLabel: 'Nouvel étage',
    addTitle: 'Nouvel étage',
    renameAriaLabel: "Renommer l'étage",
    ...options,
  });
}

