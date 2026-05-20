const EXPORT_PAINT_PROPERTIES = [
  'backgroundColor',
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'backgroundRepeat',
  'boxShadow',
  'color',
  'borderTopWidth',
  'borderTopStyle',
  'borderTopColor',
  'borderRightWidth',
  'borderRightStyle',
  'borderRightColor',
  'borderBottomWidth',
  'borderBottomStyle',
  'borderBottomColor',
  'borderLeftWidth',
  'borderLeftStyle',
  'borderLeftColor',
  'outlineWidth',
  'outlineStyle',
  'outlineColor',
];

function applyComputedPaintStyles(container) {
  const snapshots = [];
  const nodes = [container, ...container.querySelectorAll('*')];

  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) continue;
    const computed = window.getComputedStyle(el);
    snapshots.push({ el, style: el.getAttribute('style') });

    for (const prop of EXPORT_PAINT_PROPERTIES) {
      const value = computed[prop];
      if (!value || value === 'none' || value === 'normal') continue;
      if (
        prop === 'backgroundColor' &&
        (value === 'transparent' || value === 'rgba(0, 0, 0, 0)')
      ) {
        continue;
      }
      el.style[prop] = value;
    }
  }

  return () => {
    for (const { el, style } of snapshots) {
      if (style === null) el.removeAttribute('style');
      else el.setAttribute('style', style);
    }
  };
}

function formatExportFileDate() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function buildExportSheet(tabs) {
  const sheet = document.createElement('div');
  sheet.className = 'export-sheet';

  const multipleTabs = tabs.length > 1;

  for (const tab of tabs) {
    const tabBlock = document.createElement('section');
    tabBlock.className = 'export-tab-block';

    if (multipleTabs) {
      const tabLabel = document.createElement('h2');
      tabLabel.className = 'export-tab-label';
      tabLabel.textContent = tab.name;
      tabBlock.appendChild(tabLabel);
    }

    const floorsWrap = document.createElement('div');
    floorsWrap.className = 'export-floors';

    const multipleFloors = tab.floors.length > 1;

    for (const floor of tab.floors) {
      const floorBlock = document.createElement('div');
      floorBlock.className = 'export-floor-block';

      if (multipleFloors) {
        const floorLabel = document.createElement('h3');
        floorLabel.className = 'export-floor-label';
        floorLabel.textContent = floor.name;
        floorBlock.appendChild(floorLabel);
      }

      const gridState = cloneGridState(floor.grid);
      floorBlock.appendChild(buildGridFrameElement(gridState));
      floorsWrap.appendChild(floorBlock);
    }

    tabBlock.appendChild(floorsWrap);
    sheet.appendChild(tabBlock);
  }

  return sheet;
}

async function exportPlanAsImage() {
  if (typeof html2canvas !== 'function') {
    throw new Error('html2canvas non chargé');
  }

  const tabs = getMapTabs();
  if (!tabs.length) {
    throw new Error('Aucune carte à exporter');
  }

  const host = document.createElement('div');
  host.className = 'export-host';
  host.setAttribute('aria-hidden', 'true');
  host.appendChild(buildExportSheet(tabs));
  document.body.appendChild(host);

  const bg =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg')
      .trim() || '#1a1a28';

  let restorePaintStyles = () => {};

  try {
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const width = Math.ceil(host.scrollWidth);
    const height = Math.ceil(host.scrollHeight);
    if (width < 1 || height < 1) {
      throw new Error('Rien à exporter (grille vide)');
    }

    restorePaintStyles = applyComputedPaintStyles(host);

    const canvas = await html2canvas(host, {
      backgroundColor: bg,
      scale: 2,
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
    });

    if (canvas.width < 1 || canvas.height < 1) {
      throw new Error('Capture image vide');
    }

    const link = document.createElement('a');
    link.download = `donjon-${formatExportFileDate()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    restorePaintStyles();
    host.remove();
  }
}
