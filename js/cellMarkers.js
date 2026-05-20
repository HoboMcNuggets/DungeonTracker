const MARKER_TYPES = {
  entrance: {
    id: 'entrance',
    label: 'Entrée',
    shortLabel: 'E',
    unique: true,
  },
  key: {
    id: 'key',
    label: 'Clé requise',
    shortLabel: 'K',
    unique: false,
  },
  chest: {
    id: 'chest',
    label: 'Coffre',
    shortLabel: 'C',
    unique: false,
  },
};

const STAIRCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function getMarkerList() {
  return Object.values(MARKER_TYPES);
}

function getMarkerById(id) {
  return MARKER_TYPES[id] ?? null;
}
