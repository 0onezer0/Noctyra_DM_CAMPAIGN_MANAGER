export type IslandCategory =
  | "command"
  | "status"
  | "navigation"
  | "insight"
  | "entity"
  | "ambient";

export type IslandMode = "micro" | "compact" | "standard" | "wide" | "hero";

export type IslandSpan =
  | "micro"
  | "smallPill"
  | "compact"
  | "standard"
  | "wide"
  | "tall"
  | "hero"
  | "mega";

export type ShapeVariant =
  | "softRect"
  | "pill"
  | "circle"
  | "tallCapsule"
  | "notchTopRight"
  | "notchBottomRight"
  | "notchTopLeft"
  | "notchBottomLeft";

export type DockingAbility = "none" | "dock" | "anchor";

export type AccentStrength = "quiet" | "soft" | "medium" | "high";

export type PreferredZone = "top" | "right" | "bottom" | "left" | "center";

export interface SlotAvailability {
  header?: boolean;
  meta?: boolean;
  body?: boolean;
  chart?: boolean;
  actions?: boolean;
  footer?: boolean;
  media?: boolean;
  primaryMetric?: boolean;
  icon?: boolean;
}

export interface IslandSpec {
  id: string;
  title: string;
  shortLabel: string;
  category: IslandCategory;
  scope: "global" | "creature";
  priority: number;
  defaultSpan: IslandSpan;
  expandedSpan: IslandSpan;
  allowedSpans: IslandSpan[];
  allowedModes: IslandMode[];
  allowedShapes: ShapeVariant[];
  dockingAbility: DockingAbility;
  accentStrength: AccentStrength;
  preferredZones: PreferredZone[];
  affinity: string[];
  slotAvailability: SlotAvailability;
}

export interface IslandLayoutItem {
  id: string;
  kind: string;
  creatureId: string | null;
  span: IslandSpan;
  col: number;
  row: number;
  cols?: number;
  rows?: number;
  locked?: boolean;
}

export interface ResolvedGridMetrics {
  columns: 12 | 8 | 4;
  gap: number;
  rowUnit: number;
  breakpoint: "desktop" | "tablet" | "mobile";
}

export interface DockState {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface ResolvedIsland extends IslandLayoutItem {
  spec: IslandSpec;
  grid: ResolvedGridMetrics;
  mode: IslandMode;
  shape: ShapeVariant;
  accent: AccentStrength;
  dockState: DockState;
  slotVisibility: Required<SlotAvailability>;
  isFocused: boolean;
  isActive: boolean;
}

export declare const GRID_COLUMNS: {
  desktop: 12;
  tablet: 8;
  mobile: 4;
};

export declare const GRID_BREAKPOINTS: {
  tablet: number;
  mobile: number;
};

export declare const ROW_UNIT: number;

export declare const SPAN_PRESETS: Record<
  IslandSpan,
  { cols: number; rows: number; mode: IslandMode }
>;

export declare const SLOT_TEMPLATE: Record<
  IslandMode,
  Required<SlotAvailability>
>;

export declare const DASHBOARD_TOKENS: Record<string, unknown>;

export declare function resolveGridMetrics(viewportWidth?: number): ResolvedGridMetrics;
export declare function getSpanCells(spanKey?: IslandSpan): {
  cols: number;
  rows: number;
  mode: IslandMode;
};
export declare function spanFitsColumns(spanKey: IslandSpan, columns: number): boolean;
export declare function resolveModeFromSpan(spanKey: IslandSpan): IslandMode;
export declare function clampMode(mode: IslandMode, spec: IslandSpec): IslandMode;
export declare function resolveSlotVisibility(
  spec: IslandSpec,
  mode: IslandMode
): Required<SlotAvailability>;
export declare function normalizeLayoutItem(
  item: Partial<IslandLayoutItem>,
  spec: IslandSpec
): IslandLayoutItem | null;
export declare function createIslandLayoutItem(
  kind: string,
  creatureId: string | null,
  registry: Record<string, IslandSpec>,
  overrides?: Partial<IslandLayoutItem>
): IslandLayoutItem | null;
export declare function normalizeLayout(
  layout: IslandLayoutItem[],
  registry: Record<string, IslandSpec>,
  options?: { columns?: number; maxRows?: number }
): IslandLayoutItem[];
export declare function resolveDockState(
  island: IslandLayoutItem,
  layout: IslandLayoutItem[]
): DockState;
export declare function resolveShapeVariant(options: {
  spec: IslandSpec;
  mode: IslandMode;
  dockState: DockState;
  spanKey: IslandSpan;
}): ShapeVariant;
export declare function resolveAccentStrength(options: {
  spec: IslandSpec;
  isFocused: boolean;
  isActive: boolean;
  allowHighAccent: boolean;
}): AccentStrength;
export declare function buildResolvedIslands(
  layout: IslandLayoutItem[],
  registry: Record<string, IslandSpec>,
  state: Record<string, unknown>,
  viewportWidth: number
): ResolvedIsland[];
