const MARKER_TYPES = {
  chest: {
    id: 'chest',
    label: 'Coffre',
    shortLabel: '',
    unique: false,
  },
  boss: {
    id: 'boss',
    label: 'Boss',
    shortLabel: '',
    unique: false,
  },
};

const STAIRCASE_LETTERS = 'ABCDEFGHIJ'.split('');

function isValidStaircaseLetter(letter) {
  const normalized = String(letter).toUpperCase();
  return STAIRCASE_LETTERS.includes(normalized);
}

function buildStaircaseIconDataUri(letter) {
  const char = isValidStaircaseLetter(letter)
    ? String(letter).toUpperCase()
    : '?';
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
    '<rect x="1" y="1" width="22" height="22" rx="4" fill="#f2ebe0" stroke="#c4a882" stroke-width="1"/>',
    '<g stroke="#4a3018" stroke-width="0.6" stroke-linejoin="round">',
    '<rect x="3.8" y="5" width="1.4" height="14.5" rx="0.35" fill="#6b4423"/>',
    '<rect x="8.4" y="5" width="1.4" height="14.5" rx="0.35" fill="#6b4423"/>',
    '<rect x="3.8" y="7.2" width="6" height="1.1" rx="0.25" fill="#8a5a30"/>',
    '<rect x="3.8" y="10" width="6" height="1.1" rx="0.25" fill="#8a5a30"/>',
    '<rect x="3.8" y="12.8" width="6" height="1.1" rx="0.25" fill="#8a5a30"/>',
    '<rect x="3.8" y="15.6" width="6" height="1.1" rx="0.25" fill="#8a5a30"/>',
    '<rect x="3.8" y="18.4" width="6" height="1.1" rx="0.25" fill="#8a5a30"/>',
    '</g>',
    `<text x="17" y="16.5" font-size="14" font-weight="900" fill="#1a1028" text-anchor="middle" font-family="system-ui,sans-serif">${char}</text>`,
    '</svg>',
  ].join('');
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function createStaircaseBadge(letter) {
  const normalized = String(letter).toUpperCase();
  const badge = document.createElement('span');
  badge.className = 'room__marker room__marker--staircase';
  badge.dataset.staircaseLetter = normalized;
  badge.style.backgroundImage = buildStaircaseIconDataUri(normalized);
  badge.setAttribute('aria-hidden', 'true');
  badge.title = getStaircaseBadgeTitle(normalized);
  if (isStaircaseLinkedToOtherFloor(normalized)) {
    badge.classList.add('room__marker--staircase-linked');
  }
  return badge;
}

function getMarkerList() {
  return Object.values(MARKER_TYPES);
}

function getMarkerById(id) {
  return MARKER_TYPES[id] ?? null;
}
