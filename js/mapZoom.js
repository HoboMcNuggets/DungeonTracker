const MAP_ZOOM_STEP = 10;
const MAP_ZOOM_MIN = 50;
const MAP_ZOOM_MAX = 250;
const MAP_ZOOM_DEFAULT = 100;
const MAP_PAN_CLICK_THRESHOLD = 4;

let mapZoomPercent = MAP_ZOOM_DEFAULT;
let mapZoomSectionEl = null;
let mapZoomSectionElForZoom = null;
let mapZoomLabelEl = null;
let mapZoomInBtn = null;
let mapZoomOutBtn = null;
let mapZoomOnChange = null;

let panActive = false;
let panMoved = false;
let panStartX = 0;
let panStartY = 0;
let panStartScrollLeft = 0;
let panStartScrollTop = 0;
let lastPanEndedAt = 0;

function clampMapZoomPercent(percent) {
  const stepped = Math.round(percent / MAP_ZOOM_STEP) * MAP_ZOOM_STEP;
  return Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, stepped));
}

function getMapZoomPercent() {
  return mapZoomPercent;
}

function wasMapPanJustCompleted() {
  return Date.now() - lastPanEndedAt < 300;
}

function isMapScrollable() {
  if (!mapZoomSectionEl) return false;
  return (
    mapZoomSectionEl.scrollWidth > mapZoomSectionEl.clientWidth + 1 ||
    mapZoomSectionEl.scrollHeight > mapZoomSectionEl.clientHeight + 1
  );
}

function refreshMapZoomLayout() {
  updateMapZoomSectionState();
}

function updateMapZoomSectionState() {
  if (!mapZoomSectionEl) return;
  mapZoomSectionEl.classList.toggle(
    'grid-section--zoomed',
    mapZoomPercent > MAP_ZOOM_DEFAULT
  );
  mapZoomSectionEl.classList.toggle(
    'grid-section--pannable',
    isMapScrollable()
  );
}

function applyMapZoomToFrame() {
  if (!mapZoomSectionElForZoom) return;
  const zoom = String(mapZoomPercent / 100);
  mapZoomSectionElForZoom.querySelectorAll('.grid-frame').forEach((frame) => {
    frame.style.setProperty('--map-zoom', zoom);
  });
  requestAnimationFrame(updateMapZoomSectionState);
}

function updateMapZoomControls() {
  if (mapZoomLabelEl) {
    mapZoomLabelEl.textContent = `${mapZoomPercent}%`;
  }
  if (mapZoomInBtn) {
    mapZoomInBtn.disabled = mapZoomPercent >= MAP_ZOOM_MAX;
  }
  if (mapZoomOutBtn) {
    mapZoomOutBtn.disabled = mapZoomPercent <= MAP_ZOOM_MIN;
  }
}

function setMapZoomPercent(percent) {
  const next = clampMapZoomPercent(percent);
  if (next === mapZoomPercent) return false;

  mapZoomPercent = next;
  applyMapZoomToFrame();
  updateMapZoomControls();
  if (typeof mapZoomOnChange === 'function') {
    mapZoomOnChange(mapZoomPercent);
  }
  return true;
}

function changeMapZoomByStep(deltaSteps) {
  setMapZoomPercent(mapZoomPercent + deltaSteps * MAP_ZOOM_STEP);
}

function isOutsideGrid(target) {
  return Boolean(target) && !target.closest('.grid-frame');
}

function canPanFromTarget(target) {
  if (!target || !mapZoomSectionEl) return false;
  if (target.closest('.map-zoom-toolbar')) return false;
  if (!isOutsideGrid(target)) return false;
  return mapZoomSectionEl.contains(target);
}

function startMapPan(event) {
  if (!mapZoomSectionEl || !isMapScrollable()) return;
  if (!canPanFromTarget(event.target)) return;

  const isMiddleButton = event.button === 1;
  const isLeftButton = event.button === 0;

  if (!isMiddleButton && !isLeftButton) return;

  panActive = true;
  panMoved = false;
  panStartX = event.clientX;
  panStartY = event.clientY;
  panStartScrollLeft = mapZoomSectionEl.scrollLeft;
  panStartScrollTop = mapZoomSectionEl.scrollTop;
  mapZoomSectionEl.classList.add('grid-section--panning');
  event.preventDefault();
}

function moveMapPan(event) {
  if (!panActive || !mapZoomSectionEl) return;

  const dx = event.clientX - panStartX;
  const dy = event.clientY - panStartY;

  if (
    !panMoved &&
    Math.abs(dx) < MAP_PAN_CLICK_THRESHOLD &&
    Math.abs(dy) < MAP_PAN_CLICK_THRESHOLD
  ) {
    return;
  }

  panMoved = true;
  mapZoomSectionEl.scrollLeft = panStartScrollLeft - dx;
  mapZoomSectionEl.scrollTop = panStartScrollTop - dy;
}

function endMapPan() {
  if (!panActive || !mapZoomSectionEl) return;

  panActive = false;
  mapZoomSectionEl.classList.remove('grid-section--panning');

  if (panMoved) {
    lastPanEndedAt = Date.now();
  }
  panMoved = false;
}

function setupMapPan(gridSection) {
  mapZoomSectionEl = gridSection;
  if (!mapZoomSectionEl) return;

  mapZoomSectionEl.addEventListener('mousedown', startMapPan);
  mapZoomSectionEl.addEventListener('auxclick', (event) => {
    if (event.button === 1) {
      event.preventDefault();
    }
  });

  document.addEventListener('mousemove', moveMapPan);
  document.addEventListener('mouseup', endMapPan);
  window.addEventListener('resize', updateMapZoomSectionState);
}

function initMapZoom(options = {}) {
  const {
    gridSection,
    zoomInBtn,
    zoomOutBtn,
    zoomLabel,
    onZoomChange,
  } = options;

  mapZoomSectionElForZoom = gridSection;
  mapZoomLabelEl = zoomLabel;
  mapZoomInBtn = zoomInBtn;
  mapZoomOutBtn = zoomOutBtn;
  mapZoomOnChange = onZoomChange;

  mapZoomPercent = MAP_ZOOM_DEFAULT;
  applyMapZoomToFrame();
  updateMapZoomControls();
  setupMapPan(gridSection);

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => changeMapZoomByStep(1));
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => changeMapZoomByStep(-1));
  }

  if (gridSection) {
    gridSection.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        changeMapZoomByStep(event.deltaY < 0 ? 1 : -1);
      },
      { passive: false }
    );
  }
}
