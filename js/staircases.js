function floorHasStaircaseLetter(grid, letter) {
  const normalized = String(letter).toUpperCase();
  if (!isValidStaircaseLetter(normalized)) return false;

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = normalizeCell(grid.cells[y]?.[x]);
      if (cell?.staircases.includes(normalized)) return true;
    }
  }
  return false;
}

function findStaircasePositionsInGrid(grid, letter) {
  const normalized = String(letter).toUpperCase();
  if (!isValidStaircaseLetter(normalized)) return [];

  const positions = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = normalizeCell(grid.cells[y]?.[x]);
      if (cell?.staircases.includes(normalized)) {
        positions.push({ x, y });
      }
    }
  }
  return positions;
}

function getGridForFloor(floor) {
  if (floor.id === getActiveFloorId()) {
    return getGridState();
  }
  return floor.grid;
}

function getFloorsWithStaircaseLetter(letter) {
  const tab = getActiveTab();
  if (!tab) return [];

  const normalized = String(letter).toUpperCase();
  return tab.floors.filter((floor) =>
    floorHasStaircaseLetter(getGridForFloor(floor), normalized)
  );
}

function resolveTargetFloorIdForStaircase(letter, currentFloorId) {
  const linked = getFloorsWithStaircaseLetter(letter);
  if (linked.length < 2) return null;

  const currentIndex = linked.findIndex((floor) => floor.id === currentFloorId);
  if (currentIndex === -1) return linked[0].id;

  const nextIndex = (currentIndex + 1) % linked.length;
  return linked[nextIndex].id;
}

function isStaircaseLinkedToOtherFloor(letter) {
  return resolveTargetFloorIdForStaircase(letter, getActiveFloorId()) !== null;
}

function getStaircaseBadgeTitle(letter) {
  const normalized = String(letter).toUpperCase();
  const targetFloorId = resolveTargetFloorIdForStaircase(
    normalized,
    getActiveFloorId()
  );
  if (!targetFloorId) {
    return `Escalier ${normalized}`;
  }

  const floor = getFloorById(targetFloorId);
  const floorName = floor?.name ?? 'un autre étage';
  return `Escalier ${normalized} — aller à ${floorName}`;
}
