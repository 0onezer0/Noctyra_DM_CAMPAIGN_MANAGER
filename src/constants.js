export const EXTENSION_ID = "dev.codex.campaign-codex";
export const SHEET_KEY = `${EXTENSION_ID}/sheet`;
export const LAYOUT_KEY = `${EXTENSION_ID}/layout-v6`;
export const RULES_GLOSSARY_URL = "https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary/";
export const CONDITION_REFERENCE_URLS = {
  blinded: `${RULES_GLOSSARY_URL}#BlindedCondition`,
  charmed: `${RULES_GLOSSARY_URL}#CharmedCondition`,
  deafened: `${RULES_GLOSSARY_URL}#DeafenedCondition`,
  burning: `${RULES_GLOSSARY_URL}#BurningHazard`,
  frightened: `${RULES_GLOSSARY_URL}#FrightenedCondition`,
  grappled: `${RULES_GLOSSARY_URL}#GrappledCondition`,
  incapacitated: `${RULES_GLOSSARY_URL}#IncapacitatedCondition`,
  invisible: `${RULES_GLOSSARY_URL}#InvisibleCondition`,
  paralyzed: `${RULES_GLOSSARY_URL}#ParalyzedCondition`,
  petrified: `${RULES_GLOSSARY_URL}#PetrifiedCondition`,
  poisoned: `${RULES_GLOSSARY_URL}#PoisonedCondition`,
  prone: `${RULES_GLOSSARY_URL}#ProneCondition`,
  restrained: `${RULES_GLOSSARY_URL}#RestrainedCondition`,
  stunned: `${RULES_GLOSSARY_URL}#StunnedCondition`,
  unconscious: `${RULES_GLOSSARY_URL}#UnconsciousCondition`,
};

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
export const SPELL_SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const ABILITY_LABELS = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export const DEFAULT_THEME = {
  mode: "DARK",
  primary: {
    main: "#4cb9b0",
    light: "#8fe2d7",
    dark: "#0f7f83",
    contrastText: "#061114",
  },
  secondary: {
    main: "#d8a458",
    light: "#ebc486",
    dark: "#9c6629",
    contrastText: "#101214",
  },
  background: {
    default: "#091117",
    paper: "#121c24",
  },
  text: {
    primary: "#f4efe5",
    secondary: "#94a2ad",
    disabled: "#5c6873",
  },
};

export const PANEL_LIBRARY = {
  overview: {
    title: "Overview",
    scope: "creature",
    layoutOrder: 1,
    sizes: {
      compact: { cols: 3, rows: 3 },
      expanded: { cols: 4, rows: 4 },
    },
  },
  stats: {
    title: "Stats",
    scope: "creature",
    layoutOrder: 5,
    sizes: {
      compact: { cols: 2, rows: 1 },
      expanded: { cols: 2, rows: 2 },
    },
  },
  combat: {
    title: "Combat",
    scope: "creature",
    layoutOrder: 3,
    sizes: {
      compact: { cols: 3, rows: 3 },
      expanded: { cols: 4, rows: 4 },
    },
  },
  spellbook: {
    title: "Spellbook",
    scope: "creature",
    layoutOrder: 4,
    sizes: {
      compact: { cols: 2, rows: 3 },
      expanded: { cols: 2, rows: 4 },
    },
  },
  conditions: {
    title: "Conditions",
    scope: "creature",
    layoutOrder: 7,
    sizes: {
      compact: { cols: 2, rows: 2 },
      expanded: { cols: 3, rows: 3 },
    },
  },
  relations: {
    title: "Relations",
    scope: "creature",
    layoutOrder: 8,
    sizes: {
      compact: { cols: 2, rows: 2 },
      expanded: { cols: 3, rows: 3 },
    },
  },
  initiative: {
    title: "Initiative",
    scope: "global",
    layoutOrder: 2,
    sizes: {
      compact: { cols: 2, rows: 3 },
      expanded: { cols: 4, rows: 4 },
    },
  },
  log: {
    title: "Roll Log",
    scope: "global",
    layoutOrder: 6,
    sizes: {
      compact: { cols: 2, rows: 2 },
      expanded: { cols: 3, rows: 2 },
    },
  },
};

export const PANEL_TOOLBAR_ORDER = [
  "overview",
  "stats",
  "combat",
  "spellbook",
  "conditions",
  "relations",
  "initiative",
  "log",
];

export const CONDITIONS = [
  {
    key: "blinded",
    label: "Blinded",
    short: "BL",
    summary: "Cannot see, auto-fails sight checks, attacks against it have advantage.",
    referenceUrl: CONDITION_REFERENCE_URLS.blinded,
  },
  {
    key: "charmed",
    label: "Charmed",
    short: "CH",
    summary: "Cannot attack the charmer and grants them social edge.",
    referenceUrl: CONDITION_REFERENCE_URLS.charmed,
  },
  {
    key: "deafened",
    label: "Deafened",
    short: "DF",
    summary: "Cannot hear and automatically fails hearing-based checks.",
    referenceUrl: CONDITION_REFERENCE_URLS.deafened,
  },
  {
    key: "burning",
    label: "Burning",
    short: "FI",
    summary: "Ongoing fire tracker. A burning creature takes fire damage until the flames are put out.",
    referenceUrl: CONDITION_REFERENCE_URLS.burning,
  },
  {
    key: "frightened",
    label: "Frightened",
    short: "FR",
    summary: "Has disadvantage while the source is visible and cannot move closer.",
    referenceUrl: CONDITION_REFERENCE_URLS.frightened,
  },
  {
    key: "grappled",
    label: "Grappled",
    short: "GR",
    summary: "Speed becomes 0 until the grapple ends.",
    referenceUrl: CONDITION_REFERENCE_URLS.grappled,
  },
  {
    key: "incapacitated",
    label: "Incapacitated",
    short: "IC",
    summary: "Cannot take actions or reactions.",
    referenceUrl: CONDITION_REFERENCE_URLS.incapacitated,
  },
  {
    key: "invisible",
    label: "Invisible",
    short: "IN",
    summary: "Hidden from sight. Attacks against it have disadvantage and its attacks have advantage.",
    referenceUrl: CONDITION_REFERENCE_URLS.invisible,
  },
  {
    key: "paralyzed",
    label: "Paralyzed",
    short: "PA",
    summary: "Incapacitated, cannot move or speak, STR/DEX saves fail automatically.",
    referenceUrl: CONDITION_REFERENCE_URLS.paralyzed,
  },
  {
    key: "petrified",
    label: "Petrified",
    short: "PE",
    summary: "Turned to inert stone or similar matter, speed 0, and resistant to all damage.",
    referenceUrl: CONDITION_REFERENCE_URLS.petrified,
  },
  {
    key: "poisoned",
    label: "Poisoned",
    short: "PO",
    summary: "Has disadvantage on attack rolls and ability checks.",
    referenceUrl: CONDITION_REFERENCE_URLS.poisoned,
  },
  {
    key: "prone",
    label: "Prone",
    short: "PR",
    summary: "Must crawl. Melee attacks against it have advantage, ranged attacks have disadvantage.",
    referenceUrl: CONDITION_REFERENCE_URLS.prone,
  },
  {
    key: "restrained",
    label: "Restrained",
    short: "RE",
    summary: "Speed 0, attacks against it have advantage, its DEX saves have disadvantage.",
    referenceUrl: CONDITION_REFERENCE_URLS.restrained,
  },
  {
    key: "sleeping",
    label: "Sleeping",
    short: "SL",
    summary: "Unconscious-style tracking helper for rests, magical sleep, or narrative states.",
    referenceUrl: "",
  },
  {
    key: "stunned",
    label: "Stunned",
    short: "ST",
    summary: "Incapacitated, cannot move, and STR/DEX saves automatically fail.",
    referenceUrl: CONDITION_REFERENCE_URLS.stunned,
  },
  {
    key: "unconscious",
    label: "Unconscious",
    short: "UN",
    summary: "Drops prone, cannot act, and attacks against it have advantage.",
    referenceUrl: CONDITION_REFERENCE_URLS.unconscious,
  },
];
