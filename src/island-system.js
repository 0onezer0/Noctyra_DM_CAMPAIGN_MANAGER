export const GRID_COLUMNS = {
  desktop: 12,
  tablet: 8,
  mobile: 4,
};

export const GRID_BREAKPOINTS = {
  tablet: 1100,
  mobile: 720,
};

export const ROW_UNIT = 88;

export const GRID_GAPS = {
  desktop: 18,
  tablet: 16,
  mobile: 12,
};

export const SPAN_PRESETS = {
  micro: { cols: 1, rows: 1, mode: "micro" },
  smallPill: { cols: 2, rows: 1, mode: "micro" },
  compact: { cols: 2, rows: 2, mode: "compact" },
  standard: { cols: 3, rows: 2, mode: "standard" },
  wide: { cols: 4, rows: 2, mode: "wide" },
  tall: { cols: 3, rows: 3, mode: "standard" },
  hero: { cols: 4, rows: 3, mode: "hero" },
  mega: { cols: 6, rows: 3, mode: "hero" },
};

export const SLOT_TEMPLATE = {
  micro: {
    header: false,
    meta: false,
    body: false,
    chart: false,
    actions: false,
    footer: false,
    media: false,
    primaryMetric: true,
    icon: true,
  },
  compact: {
    header: true,
    meta: true,
    body: false,
    chart: false,
    actions: true,
    footer: false,
    media: true,
    primaryMetric: true,
    icon: true,
  },
  standard: {
    header: true,
    meta: true,
    body: true,
    chart: false,
    actions: true,
    footer: true,
    media: true,
    primaryMetric: true,
    icon: true,
  },
  wide: {
    header: true,
    meta: true,
    body: true,
    chart: true,
    actions: true,
    footer: true,
    media: true,
    primaryMetric: true,
    icon: true,
  },
  hero: {
    header: true,
    meta: true,
    body: true,
    chart: true,
    actions: true,
    footer: true,
    media: true,
    primaryMetric: true,
    icon: true,
  },
};

export const DASHBOARD_TOKENS = {
  canvas: "#050506",
  canvasRaised: "#0d0d0e",
  textPrimary: "#f4f0ea",
  textSecondary: "#aaa296",
  textMuted: "#807a72",
  outline: "rgba(255,255,255,0.06)",
  shadow: "0 24px 72px rgba(0,0,0,0.38)",
  surface: {
    graphite: "#0d0d0e",
    charcoal: "#09090a",
    olive: "#0c0b0b",
    brown: "#100b09",
    ember: "#ff7a24",
    orange: "#ff5612",
    apricot: "#ffd7c2",
    amber: "#ffb35a",
    rose: "#ff8742",
  },
  radii: {
    soft: "34px",
    pill: "999px",
    circle: "999px",
  },
};

const HIGH_ACCENT_ORDER = ["quiet", "soft", "medium", "high"];
const HERO_SPANS = new Set(["hero", "mega"]);

function uniquePositions(positions) {
  const seen = new Set();
  return positions.filter((position) => {
    const key = `${position.col}:${position.row}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function spanArea(spanKey) {
  const span = SPAN_PRESETS[spanKey] || SPAN_PRESETS.compact;
  return span.cols * span.rows;
}

function getRequestedSpan(item, spec) {
  return item?.span || spec?.defaultSpan || spec?.allowedSpans?.[0] || "compact";
}

function sortAllowedSpansByArea(allowedSpans = []) {
  return [...allowedSpans].sort((left, right) => spanArea(right) - spanArea(left));
}

function pickFittingSpan(allowedSpans, columns, preferredSpan) {
  const ordered = sortAllowedSpansByArea(allowedSpans);
  if (preferredSpan && allowedSpans.includes(preferredSpan) && spanFitsColumns(preferredSpan, columns)) {
    return preferredSpan;
  }
  return ordered.find((spanKey) => spanFitsColumns(spanKey, columns)) || ordered.at(-1) || "compact";
}

function downgradeHeroSpan(spec, columns) {
  const nonHero = (spec.allowedSpans || []).filter((spanKey) => !HERO_SPANS.has(spanKey));
  return pickFittingSpan(nonHero.length ? nonHero : spec.allowedSpans, columns, spec.expandedSpan || spec.defaultSpan);
}

function createOccupancyMap(layout) {
  const map = new Map();
  for (const island of layout) {
    const span = getSpanCells(island.span);
    for (let row = island.row; row < island.row + span.rows; row += 1) {
      for (let col = island.col; col < island.col + span.cols; col += 1) {
        map.set(`${col}:${row}`, island.id);
      }
    }
  }
  return map;
}

function removeIslandFromOccupancy(map, island) {
  const span = getSpanCells(island.span);
  for (let row = island.row; row < island.row + span.rows; row += 1) {
    for (let col = island.col; col < island.col + span.cols; col += 1) {
      map.delete(`${col}:${row}`);
    }
  }
}

function addIslandToOccupancy(map, island) {
  const span = getSpanCells(island.span);
  for (let row = island.row; row < island.row + span.rows; row += 1) {
    for (let col = island.col; col < island.col + span.cols; col += 1) {
      map.set(`${col}:${row}`, island.id);
    }
  }
}

function canOccupyPosition(position, span, occupancy, columns, ignoreId = "") {
  if (position.col < 1 || position.row < 1 || position.col + span.cols - 1 > columns) {
    return false;
  }
  for (let row = position.row; row < position.row + span.rows; row += 1) {
    for (let col = position.col; col < position.col + span.cols; col += 1) {
      const occupant = occupancy.get(`${col}:${row}`);
      if (occupant && occupant !== ignoreId) {
        return false;
      }
    }
  }
  return true;
}

function enumeratePositions(columns, rows, span) {
  const positions = [];
  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= columns - span.cols + 1; col += 1) {
      positions.push({ col, row });
    }
  }
  return positions;
}

function scoreZone(position, span, columns, maxRows, zone) {
  switch (zone) {
    case "top":
      return position.row - 1;
    case "left":
      return position.col - 1;
    case "right":
      return columns - (position.col + span.cols - 1);
    case "bottom":
      return maxRows - (position.row + span.rows - 1);
    case "center": {
      const centerCol = (columns + 1) / 2;
      const centerRow = (maxRows + 1) / 2;
      const islandCenterCol = position.col + (span.cols - 1) / 2;
      const islandCenterRow = position.row + (span.rows - 1) / 2;
      return Math.abs(centerCol - islandCenterCol) + Math.abs(centerRow - islandCenterRow);
    }
    default:
      return 0;
  }
}

function findAffinityAnchor(item, placed, registry) {
  const spec = registry[item.kind];
  const affinity = spec?.affinity || [];
  if (!affinity.length) {
    return null;
  }

  for (const affinityKind of affinity) {
    const exactMatch = placed.find(
      (candidate) =>
        candidate.kind === affinityKind &&
        (candidate.creatureId === item.creatureId || !candidate.creatureId || !item.creatureId)
    );
    if (exactMatch) {
      return exactMatch;
    }
  }
  return null;
}

function buildAffinityPositions(anchor, span, columns) {
  if (!anchor) {
    return [];
  }

  const anchorSpan = getSpanCells(anchor.span);
  return uniquePositions([
    { col: anchor.col + anchorSpan.cols, row: anchor.row },
    { col: anchor.col - span.cols, row: anchor.row },
    { col: anchor.col, row: anchor.row + anchorSpan.rows },
    { col: anchor.col, row: anchor.row - span.rows },
    { col: anchor.col + anchorSpan.cols, row: anchor.row + 1 },
    { col: anchor.col, row: anchor.row + anchorSpan.rows - 1 },
    { col: Math.max(1, Math.min(columns - span.cols + 1, anchor.col)), row: anchor.row },
  ]).filter((position) => position.col >= 1 && position.row >= 1);
}

function scorePosition(position, span, columns, maxRows, spec, anchor) {
  const zones = spec.preferredZones?.length ? spec.preferredZones : ["top", "left"];
  const zoneScore = zones.reduce(
    (total, zone, index) => total + scoreZone(position, span, columns, maxRows, zone) * (index + 1),
    0
  );

  if (!anchor) {
    return zoneScore;
  }

  const anchorDistance =
    Math.abs(position.col - anchor.col) +
    Math.abs(position.row - anchor.row);

  return zoneScore + anchorDistance * 0.6;
}

function compactLayout(layout, columns) {
  const occupancy = createOccupancyMap(layout);
  const ordered = [...layout].sort((left, right) => {
    if (left.row !== right.row) {
      return left.row - right.row;
    }
    return left.col - right.col;
  });

  return ordered.map((island) => {
    const span = getSpanCells(island.span);
    const next = { ...island };
    removeIslandFromOccupancy(occupancy, island);

    while (
      next.row > 1 &&
      canOccupyPosition({ col: next.col, row: next.row - 1 }, span, occupancy, columns, next.id)
    ) {
      next.row -= 1;
    }

    while (
      next.col > 1 &&
      canOccupyPosition({ col: next.col - 1, row: next.row }, span, occupancy, columns, next.id)
    ) {
      next.col -= 1;
    }

    addIslandToOccupancy(occupancy, next);
    return next;
  });
}

export function resolveGridMetrics(viewportWidth = 1440) {
  const width = Number(viewportWidth) || 1440;
  if (width <= GRID_BREAKPOINTS.mobile) {
    return { columns: GRID_COLUMNS.mobile, gap: GRID_GAPS.mobile, rowUnit: ROW_UNIT, breakpoint: "mobile" };
  }
  if (width <= GRID_BREAKPOINTS.tablet) {
    return { columns: GRID_COLUMNS.tablet, gap: GRID_GAPS.tablet, rowUnit: ROW_UNIT, breakpoint: "tablet" };
  }
  return { columns: GRID_COLUMNS.desktop, gap: GRID_GAPS.desktop, rowUnit: ROW_UNIT, breakpoint: "desktop" };
}

export function getSpanCells(spanKey = "compact") {
  return SPAN_PRESETS[spanKey] || SPAN_PRESETS.compact;
}

export function spanFitsColumns(spanKey, columns) {
  const span = getSpanCells(spanKey);
  return span.cols <= columns;
}

export function resolveModeFromSpan(spanKey) {
  return getSpanCells(spanKey).mode;
}

export function clampMode(mode, spec) {
  if (!spec?.allowedModes?.length) {
    return mode;
  }
  if (spec.allowedModes.includes(mode)) {
    return mode;
  }
  const fallbackOrder = ["micro", "compact", "standard", "wide", "hero"];
  return fallbackOrder.find((candidate) => spec.allowedModes.includes(candidate)) || spec.allowedModes[0];
}

export function resolveSlotVisibility(spec, mode) {
  const base = SLOT_TEMPLATE[mode] || SLOT_TEMPLATE.compact;
  const availability = spec?.slotAvailability || {};
  return Object.fromEntries(
    Object.keys(base).map((slot) => [slot, Boolean(base[slot] && availability[slot] !== false)])
  );
}

export function normalizeLayoutItem(item, spec) {
  if (!item || !spec) {
    return null;
  }
  return {
    id: item.id,
    kind: spec.id,
    creatureId: spec.scope === "global" ? null : item.creatureId || null,
    span: getRequestedSpan(item, spec),
    col: Math.max(1, Number(item.col) || 1),
    row: Math.max(1, Number(item.row) || 1),
    locked: Boolean(item.locked),
  };
}

export function createIslandLayoutItem(kind, creatureId, registry, overrides = {}) {
  const spec = registry[kind];
  if (!spec) {
    return null;
  }
  return normalizeLayoutItem(
    {
      id: overrides.id,
      kind,
      creatureId: spec.scope === "global" ? null : creatureId || null,
      span: overrides.span || spec.defaultSpan,
      col: overrides.col || 1,
      row: overrides.row || 1,
      locked: overrides.locked || false,
    },
    spec
  );
}

export function normalizeLayout(layout, registry, options = {}) {
  const columns = options.columns || GRID_COLUMNS.desktop;
  const maxRows = options.maxRows || Math.max(18, layout.length * 4);

  const prepared = layout
    .map((item) => normalizeLayoutItem(item, registry[item.kind]))
    .filter(Boolean)
    .map((item) => {
      const spec = registry[item.kind];
      const requestedSpan = getRequestedSpan(item, spec);
      const fittingSpan = pickFittingSpan(spec.allowedSpans, columns, requestedSpan);
      return {
        ...item,
        span: fittingSpan,
      };
    });

  let heroCount = 0;
  const clampedHeroes = prepared.map((item) => {
    const spec = registry[item.kind];
    if (!HERO_SPANS.has(item.span)) {
      return item;
    }
    if (heroCount < 2) {
      heroCount += 1;
      return item;
    }
    return {
      ...item,
      span: downgradeHeroSpan(spec, columns),
    };
  });

  const placementOrder = [...clampedHeroes].sort((left, right) => {
    const leftSpec = registry[left.kind];
    const rightSpec = registry[right.kind];
    const leftAmbient = leftSpec.category === "ambient" ? 1 : 0;
    const rightAmbient = rightSpec.category === "ambient" ? 1 : 0;
    if (leftAmbient !== rightAmbient) {
      return leftAmbient - rightAmbient;
    }
    if (leftSpec.priority !== rightSpec.priority) {
      return rightSpec.priority - leftSpec.priority;
    }
    const areaDelta = spanArea(right.span) - spanArea(left.span);
    if (areaDelta !== 0) {
      return areaDelta;
    }
    return 0;
  });

  const occupancy = new Map();
  const placed = [];

  for (const item of placementOrder) {
    const spec = registry[item.kind];
    const span = getSpanCells(item.span);
    const affinityAnchor = findAffinityAnchor(item, placed, registry);
    const candidates = [
      { col: item.col, row: item.row },
      ...buildAffinityPositions(affinityAnchor, span, columns),
      ...enumeratePositions(columns, maxRows, span).sort((left, right) => {
        const scoreDelta =
          scorePosition(left, span, columns, maxRows, spec, affinityAnchor) -
          scorePosition(right, span, columns, maxRows, spec, affinityAnchor);
        if (scoreDelta !== 0) {
          return scoreDelta;
        }
        if (left.row !== right.row) {
          return left.row - right.row;
        }
        return left.col - right.col;
      }),
    ];

    const nextPosition =
      uniquePositions(candidates).find((candidate) =>
        canOccupyPosition(candidate, span, occupancy, columns, item.id)
      ) || { col: 1, row: maxRows + 1 };

    const nextIsland = {
      ...item,
      col: nextPosition.col,
      row: nextPosition.row,
    };

    addIslandToOccupancy(occupancy, nextIsland);
    placed.push(nextIsland);
  }

  return compactLayout(placed, columns)
    .sort((left, right) => {
      if (left.row !== right.row) {
        return left.row - right.row;
      }
      return left.col - right.col;
    })
    .map((item) => {
      const span = getSpanCells(item.span);
      return {
        ...item,
        cols: span.cols,
        rows: span.rows,
      };
    });
}

export function resolveDockState(island, layout) {
  const span = getSpanCells(island.span);
  const bounds = {
    left: island.col,
    right: island.col + span.cols - 1,
    top: island.row,
    bottom: island.row + span.rows - 1,
  };

  const dockState = { top: false, right: false, bottom: false, left: false };

  for (const neighbor of layout) {
    if (neighbor.id === island.id) {
      continue;
    }
    const neighborSpan = getSpanCells(neighbor.span);
    const neighborBounds = {
      left: neighbor.col,
      right: neighbor.col + neighborSpan.cols - 1,
      top: neighbor.row,
      bottom: neighbor.row + neighborSpan.rows - 1,
    };

    const overlapsX = bounds.left <= neighborBounds.right && bounds.right >= neighborBounds.left;
    const overlapsY = bounds.top <= neighborBounds.bottom && bounds.bottom >= neighborBounds.top;

    if (overlapsX && neighborBounds.bottom + 1 === bounds.top) {
      dockState.top = true;
    }
    if (overlapsX && bounds.bottom + 1 === neighborBounds.top) {
      dockState.bottom = true;
    }
    if (overlapsY && neighborBounds.right + 1 === bounds.left) {
      dockState.left = true;
    }
    if (overlapsY && bounds.right + 1 === neighborBounds.left) {
      dockState.right = true;
    }
  }

  return dockState;
}

export function resolveShapeVariant({ spec, mode, dockState, spanKey }) {
  const allowed = spec?.allowedShapes || ["softRect"];
  const span = getSpanCells(spanKey);
  if (mode === "micro" && allowed.includes("circle") && span.cols === span.rows) {
    return "circle";
  }
  if (span.rows > span.cols && allowed.includes("tallCapsule")) {
    return "tallCapsule";
  }
  if (span.rows === 1 && allowed.includes("pill")) {
    return "pill";
  }
  if (mode === "wide" && allowed.includes("pill")) {
    return "pill";
  }

  return allowed[0] || "softRect";
}

export function resolveAccentStrength({ spec, isFocused, isActive, allowHighAccent }) {
  const baseIndex = Math.max(0, HIGH_ACCENT_ORDER.indexOf(spec?.accentStrength || "soft"));
  const boosted = Math.min(
    HIGH_ACCENT_ORDER.length - 1,
    baseIndex + (isActive ? 1 : 0) + (isFocused ? 1 : 0)
  );
  const clamped = !allowHighAccent && HIGH_ACCENT_ORDER[boosted] === "high" ? boosted - 1 : boosted;
  return HIGH_ACCENT_ORDER[Math.max(0, clamped)];
}

export function buildResolvedIslands(layout, registry, state, viewportWidth) {
  const grid = resolveGridMetrics(viewportWidth);
  const normalized = normalizeLayout(layout, registry, { columns: grid.columns });
  let highAccentAvailable = true;

  return normalized.map((item) => {
    const spec = registry[item.kind];
    const baseMode = resolveModeFromSpan(item.span);
    const mode = clampMode(baseMode, spec);
    const dockState = resolveDockState(item, normalized);
    const shape = resolveShapeVariant({
      spec,
      mode,
      dockState,
      spanKey: item.span,
    });
    const isFocused =
      (item.creatureId && item.creatureId === state.selectedCreatureId) || item.kind === "command-center";
    const isActive =
      item.kind === "turn-order" ||
      (item.creatureId && item.creatureId === state.targetCreatureId);
    const accent = resolveAccentStrength({
      spec,
      isFocused,
      isActive,
      allowHighAccent: highAccentAvailable,
    });

    if (accent === "high") {
      highAccentAvailable = false;
    }

    return {
      ...item,
      spec,
      grid,
      mode,
      shape,
      accent,
      dockState,
      slotVisibility: resolveSlotVisibility(spec, mode),
      isFocused,
      isActive,
    };
  });
}
