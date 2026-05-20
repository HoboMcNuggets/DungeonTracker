const EMPTY_PRESET = {
  id: 'empty',
  label: 'Vide',
  doors: { n: false, e: false, s: false, w: false },
  isEmpty: true,
};

const ROOM_PRESETS = [
  EMPTY_PRESET,
  { id: 'dead_n', label: 'Cul-de-sac N', doors: { n: true, e: false, s: false, w: false } },
  { id: 'dead_e', label: 'Cul-de-sac E', doors: { n: false, e: true, s: false, w: false } },
  { id: 'dead_s', label: 'Cul-de-sac S', doors: { n: false, e: false, s: true, w: false } },
  { id: 'dead_w', label: 'Cul-de-sac O', doors: { n: false, e: false, s: false, w: true } },
  { id: 'corridor_ns', label: 'Couloir N-S', doors: { n: true, e: false, s: true, w: false } },
  { id: 'corridor_ew', label: 'Couloir E-O', doors: { n: false, e: true, s: false, w: true } },
  { id: 'corner_ne', label: 'Coin N-E', doors: { n: true, e: true, s: false, w: false } },
  { id: 'corner_nw', label: 'Coin N-O', doors: { n: true, e: false, s: false, w: true } },
  { id: 'corner_se', label: 'Coin S-E', doors: { n: false, e: true, s: true, w: false } },
  { id: 'corner_sw', label: 'Coin S-O', doors: { n: false, e: false, s: true, w: true } },
  { id: 't_nes', label: 'T N-E-S', doors: { n: true, e: true, s: true, w: false } },
  { id: 't_new', label: 'T N-E-O', doors: { n: true, e: true, s: false, w: true } },
  { id: 't_nsw', label: 'T N-S-O', doors: { n: true, e: false, s: true, w: true } },
  { id: 't_esw', label: 'T E-S-O', doors: { n: false, e: true, s: true, w: true } },
  { id: 'cross', label: 'Croix', doors: { n: true, e: true, s: true, w: true } },
];

function getPresetById(id) {
  if (id === null || id === undefined) return null;
  return ROOM_PRESETS.find((p) => p.id === id) ?? null;
}

function getAllPresetsForPalette() {
  return ROOM_PRESETS;
}

const PRESET_SECTIONS = [
  {
    id: 'one',
    label: '1 ouverture',
    doorCount: 1,
    presetIds: ['dead_n', 'dead_e', 'dead_s', 'dead_w'],
  },
  {
    id: 'two',
    label: '2 ouvertures',
    doorCount: 2,
    rows: [
      { presetIds: ['corridor_ns', 'corridor_ew'] },
      { presetIds: ['corner_ne', 'corner_nw', 'corner_se', 'corner_sw'] },
    ],
  },
  {
    id: 'three',
    label: '3 ouvertures',
    doorCount: 3,
    presetIds: ['t_nes', 't_new', 't_nsw', 't_esw'],
  },
  {
    id: 'four',
    label: '4 ouvertures',
    doorCount: 4,
    presetIds: ['cross'],
  },
];

function resolvePresetIds(presetIds) {
  return presetIds.map((id) => getPresetById(id)).filter(Boolean);
}

function getPresetSections() {
  return PRESET_SECTIONS.map((section) => {
    if (section.rows) {
      const rows = section.rows.map((row) => ({
        presets: resolvePresetIds(row.presetIds),
      }));
      return {
        id: section.id,
        label: section.label,
        doorCount: section.doorCount,
        rows,
        presets: rows.flatMap((row) => row.presets),
      };
    }
    return {
      id: section.id,
      label: section.label,
      doorCount: section.doorCount,
      presets: resolvePresetIds(section.presetIds),
    };
  });
}

function getDraggablePresets() {
  return ROOM_PRESETS.filter((p) => !p.isEmpty);
}

function getEditablePresets() {
  return ROOM_PRESETS.filter((p) => !p.isEmpty);
}
