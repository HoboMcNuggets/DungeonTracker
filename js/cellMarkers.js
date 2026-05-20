const MARKER_TYPES = {
  chest: {
    id: 'chest',
    label: 'Coffre',
    shortLabel: 'C',
    unique: false,
  },
};

const STAIRCASE_EXCLUDED = new Set(['E', 'C']);
const STAIRCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  .split('')
  .filter((letter) => !STAIRCASE_EXCLUDED.has(letter))
  .slice(0, 10);

function isValidStaircaseLetter(letter) {
  const normalized = String(letter).toUpperCase();
  return STAIRCASE_LETTERS.includes(normalized);
}

function createStaircaseBadge(letter) {
  const badge = document.createElement('span');
  badge.className = 'room__marker room__marker--staircase';
  badge.textContent = letter;
  badge.setAttribute('aria-hidden', 'true');
  badge.title = `Escalier ${letter}`;
  return badge;
}

function getMarkerList() {
  return Object.values(MARKER_TYPES);
}

function getMarkerById(id) {
  return MARKER_TYPES[id] ?? null;
}
