import { ABILITY_KEYS, CONDITIONS, SHEET_KEY, SPELL_SLOT_LEVELS } from "./constants.js";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function createId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toSigned(value) {
  const amount = toNumber(value, 0);
  return amount >= 0 ? `+${amount}` : `${amount}`;
}

export function parseCsv(input) {
  if (Array.isArray(input)) {
    return input
      .map((entry) => toText(entry).trim())
      .filter(Boolean);
  }

  return toText(input)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseNumberCsv(input) {
  return parseCsv(input)
    .map((entry) => toNumber(entry, NaN))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function formatThresholds(input) {
  return [...new Set(parseNumberCsv(input))].sort((left, right) => left - right).join(", ");
}

export function abilityModifier(score) {
  return Math.floor((toNumber(score, 10) - 10) / 2);
}

export function getItemPortrait(item) {
  return item?.image?.url || "";
}

export function getItemLabel(item) {
  return (
    item?.name ||
    item?.text?.plainText ||
    item?.text?.text ||
    item?.metadata?.[SHEET_KEY]?.name ||
    "Unnamed Creature"
  );
}

export function createPortraitDataUrl(name, start = "#0f7f83", end = "#d8a458") {
  const initials = toText(name, "CC")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "CC";

  const safeName = toText(name, "Campaign Codex");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" role="img" aria-label="${safeName}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="320" height="400" rx="36" fill="#0a1117" />
      <rect x="20" y="20" width="280" height="360" rx="26" fill="url(#bg)" opacity="0.92" />
      <circle cx="160" cy="142" r="72" fill="rgba(255,255,255,0.16)" />
      <path d="M88 316c18-52 58-84 72-84s54 32 72 84" fill="rgba(255,255,255,0.16)" />
      <text x="160" y="354" text-anchor="middle" fill="#f5f0e7" font-size="74" font-family="Space Grotesk, Segoe UI, sans-serif" font-weight="700">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeAttack(entry) {
  return {
    id: entry?.id || createId("attack"),
    name: toText(entry?.name, "Weapon Strike"),
    toHit: toNumber(entry?.toHit, 5),
    damage: toText(entry?.damage, "1d8+3"),
    damageType: toText(entry?.damageType, "slashing"),
    levelScaleAt: formatThresholds(entry?.levelScaleAt),
    levelScaleDamage: toText(entry?.levelScaleDamage, ""),
    notes: toText(entry?.notes),
  };
}

function normalizeAction(entry) {
  return {
    id: entry?.id || createId("action"),
    name: toText(entry?.name, "Combat Option"),
    saveAbility: toText(entry?.saveAbility, "str"),
    saveDc: toNumber(entry?.saveDc, 13),
    description: toText(entry?.description, ""),
  };
}

function normalizeSpell(entry) {
  return {
    id: entry?.id || createId("spell"),
    name: toText(entry?.name, "Spell"),
    level: toNumber(entry?.level, 1),
    attackBonus: toNumber(entry?.attackBonus, 0),
    saveAbility: toText(entry?.saveAbility, ""),
    saveDc: toNumber(entry?.saveDc, 0),
    damage: toText(entry?.damage, ""),
    damageType: toText(entry?.damageType, ""),
    levelScaleAt: formatThresholds(entry?.levelScaleAt),
    levelScaleDamage: toText(entry?.levelScaleDamage, ""),
    upcastDamage: toText(entry?.upcastDamage, ""),
    halfOnSave: Boolean(entry?.halfOnSave),
    description: toText(entry?.description, ""),
  };
}

function normalizeRelationship(entry) {
  return {
    id: entry?.id || createId("bond"),
    name: toText(entry?.name, "Relationship"),
    bond: toText(entry?.bond, ""),
    notes: toText(entry?.notes, ""),
  };
}

function normalizeSpellSlots(raw = {}) {
  return Object.fromEntries(
    SPELL_SLOT_LEVELS.map((level) => {
      const total = Math.max(0, toNumber(raw?.[level]?.total, 0));
      const used = Math.max(0, Math.min(toNumber(raw?.[level]?.used, 0), total));
      return [level, { total, used }];
    })
  );
}

function buildBaseSheet(item, raw = {}) {
  const name = toText(raw?.name, getItemLabel(item));
  const portraitUrl = toText(raw?.portraitUrl, getItemPortrait(item) || createPortraitDataUrl(name));

  const stats = Object.fromEntries(
    ABILITY_KEYS.map((ability) => [ability, toNumber(raw?.stats?.[ability], 10)])
  );

  const saves = Object.fromEntries(
    ABILITY_KEYS.map((ability) => [ability, toNumber(raw?.saves?.[ability], abilityModifier(stats[ability]))])
  );

  return {
    version: 2,
    name,
    nickname: "",
    className: "",
    affiliations: "",
    notes: "",
    portraitUrl,
    level: 1,
    initiative: 0,
    ac: 12,
    speed: 30,
    hp: { current: 18, max: 18, temp: 0 },
    stats,
    saves,
    conditions: Object.fromEntries(CONDITIONS.map((condition) => [condition.key, false])),
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    spellSlots: normalizeSpellSlots(),
    relationships: [],
    attacks: [normalizeAttack({})],
    actions: [
      normalizeAction({
        name: "Shove",
        saveAbility: "str",
        saveDc: 13,
        description: "Push the target back or force it prone if the fiction fits.",
      }),
    ],
    spells: [],
    tags: [],
  };
}

export function normalizeSheet(raw = {}, item = {}) {
  const base = buildBaseSheet(item, raw);
  const hpMax = Math.max(1, toNumber(raw?.hp?.max, base.hp.max));

  const stats = Object.fromEntries(
    ABILITY_KEYS.map((ability) => [ability, toNumber(raw?.stats?.[ability], base.stats[ability])])
  );

  const saves = Object.fromEntries(
    ABILITY_KEYS.map((ability) => {
      const inferred = abilityModifier(stats[ability]);
      return [ability, toNumber(raw?.saves?.[ability], inferred)];
    })
  );

  return {
    version: 2,
    name: toText(raw?.name, base.name),
    nickname: toText(raw?.nickname, base.nickname),
    className: toText(raw?.className, base.className),
    affiliations: toText(raw?.affiliations, base.affiliations),
    notes: toText(raw?.notes, base.notes),
    portraitUrl: toText(raw?.portraitUrl, base.portraitUrl),
    level: Math.max(0, toNumber(raw?.level, base.level)),
    initiative: toNumber(raw?.initiative, base.initiative),
    ac: toNumber(raw?.ac, base.ac),
    speed: toNumber(raw?.speed, base.speed),
    hp: {
      current: Math.max(0, Math.min(toNumber(raw?.hp?.current, base.hp.current), hpMax)),
      max: hpMax,
      temp: Math.max(0, toNumber(raw?.hp?.temp, base.hp.temp)),
    },
    stats,
    saves,
    conditions: Object.fromEntries(
      CONDITIONS.map((condition) => [condition.key, Boolean(raw?.conditions?.[condition.key])])
    ),
    resistances: parseCsv(raw?.resistances),
    immunities: parseCsv(raw?.immunities),
    vulnerabilities: parseCsv(raw?.vulnerabilities),
    spellSlots: normalizeSpellSlots(raw?.spellSlots),
    relationships: Array.isArray(raw?.relationships)
      ? raw.relationships.map(normalizeRelationship)
      : base.relationships,
    attacks: Array.isArray(raw?.attacks) ? raw.attacks.map(normalizeAttack) : base.attacks,
    actions: Array.isArray(raw?.actions) ? raw.actions.map(normalizeAction) : base.actions,
    spells: Array.isArray(raw?.spells) ? raw.spells.map(normalizeSpell) : base.spells,
    tags: parseCsv(raw?.tags),
  };
}

export function createStarterSheet(item = {}, overrides = {}) {
  return normalizeSheet(
    {
      ...buildBaseSheet(item, overrides),
      ...overrides,
      hp: {
        ...buildBaseSheet(item, overrides).hp,
        ...(overrides.hp || {}),
      },
      stats: {
        ...buildBaseSheet(item, overrides).stats,
        ...(overrides.stats || {}),
      },
      saves: {
        ...buildBaseSheet(item, overrides).saves,
        ...(overrides.saves || {}),
      },
      conditions: {
        ...buildBaseSheet(item, overrides).conditions,
        ...(overrides.conditions || {}),
      },
    },
    item
  );
}

export function rollDie(sides) {
  return Math.max(1, Math.floor(Math.random() * sides) + 1);
}

export function rollD20(modifier = 0) {
  const die = rollDie(20);
  return {
    die,
    modifier,
    total: die + modifier,
    critical: die === 20,
    fumble: die === 1,
  };
}

export function rollDiceExpression(expression) {
  const source = toText(expression, "0").replace(/\s+/g, "");
  if (!source) {
    return { valid: false, total: 0, breakdown: "0" };
  }

  const terms = source.replace(/-/g, "+-").split("+").filter(Boolean);
  let total = 0;
  const breakdown = [];

  for (const term of terms) {
    const diceMatch = term.match(/^(-?\d*)d(\d+)$/i);
    if (diceMatch) {
      const countRaw = diceMatch[1];
      const negative = countRaw?.startsWith("-");
      const count = Math.abs(toNumber(countRaw || 1, 1));
      const sides = toNumber(diceMatch[2], 0);
      if (!sides) {
        return { valid: false, total: 0, breakdown: source };
      }
      const rolls = Array.from({ length: count }, () => rollDie(sides));
      const subtotal = rolls.reduce((sum, value) => sum + value, 0) * (negative ? -1 : 1);
      total += subtotal;
      breakdown.push(`${negative ? "-" : ""}${count}d${sides} [${rolls.join(", ")}]`);
      continue;
    }

    if (/^-?\d+$/.test(term)) {
      total += toNumber(term, 0);
      breakdown.push(term);
      continue;
    }

    return { valid: false, total: 0, breakdown: source };
  }

  return {
    valid: true,
    total,
    breakdown: breakdown.join(" + "),
  };
}

export function buildScaledDamageExpression(entry, actorLevel = 0, castLevel = null) {
  const parts = [];
  const baseDamage = toText(entry?.damage).trim();
  if (baseDamage) {
    parts.push(baseDamage);
  }

  const thresholds = parseNumberCsv(entry?.levelScaleAt);
  const bonusDamage = toText(entry?.levelScaleDamage).trim();
  if (bonusDamage) {
    const repeats = thresholds.filter((threshold) => actorLevel >= threshold).length;
    for (let index = 0; index < repeats; index += 1) {
      parts.push(bonusDamage);
    }
  }

  const upcastDamage = toText(entry?.upcastDamage).trim();
  if (upcastDamage && castLevel !== null) {
    const baseLevel = Math.max(0, toNumber(entry?.level, 0));
    const resolvedCastLevel = Math.max(baseLevel, toNumber(castLevel, baseLevel));
    const repeats = Math.max(0, resolvedCastLevel - baseLevel);
    for (let index = 0; index < repeats; index += 1) {
      parts.push(upcastDamage);
    }
  }

  return parts.join(" + ");
}

function extractTextLine(source, matcher) {
  const match = source.match(matcher);
  return match?.[1]?.trim() || "";
}

function parseAbilityBlock(source) {
  const compact = source.match(
    /STR\s*(\d+)[\s\S]*?DEX\s*(\d+)[\s\S]*?CON\s*(\d+)[\s\S]*?INT\s*(\d+)[\s\S]*?WIS\s*(\d+)[\s\S]*?CHA\s*(\d+)/i
  );
  if (compact) {
    return {
      str: toNumber(compact[1], 10),
      dex: toNumber(compact[2], 10),
      con: toNumber(compact[3], 10),
      int: toNumber(compact[4], 10),
      wis: toNumber(compact[5], 10),
      cha: toNumber(compact[6], 10),
    };
  }

  const verbose = Object.fromEntries(
    ABILITY_KEYS.map((ability) => {
      const label = {
        str: "Strength",
        dex: "Dexterity",
        con: "Constitution",
        int: "Intelligence",
        wis: "Wisdom",
        cha: "Charisma",
      }[ability];
      const value = extractTextLine(source, new RegExp(`${label}\\s+(\\d+)`, "i"));
      return [ability, toNumber(value, 10)];
    })
  );

  return verbose;
}

function parseSavingThrows(source, stats) {
  const line = extractTextLine(source, /Saving Throws\s+([^\n\r]+)/i);
  if (!line) {
    return Object.fromEntries(
      ABILITY_KEYS.map((ability) => [ability, abilityModifier(stats[ability] || 10)])
    );
  }

  const byAbility = Object.fromEntries(
    ABILITY_KEYS.map((ability) => [ability, abilityModifier(stats[ability] || 10)])
  );

  for (const chunk of line.split(",")) {
    const match = chunk.trim().match(/(Str|Dex|Con|Int|Wis|Cha)\s*([+-]?\d+)/i);
    if (!match) {
      continue;
    }
    byAbility[match[1].slice(0, 3).toLowerCase()] = toNumber(match[2], 0);
  }

  return byAbility;
}

function parseActionEntry(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const name = trimmed.split(".")[0]?.trim() || "Action";
  const attackMatch = trimmed.match(/([+-]\d+)\s*to hit/i);
  const damageMatch = trimmed.match(/Hit:\s*(?:\d+\s*\(([^)]+)\)|([0-9d+\- ]+))\s*([a-z]+)\s+damage/i);
  const saveMatch = trimmed.match(
    /DC\s*(\d+)\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Str|Dex|Con|Int|Wis|Cha)/i
  );

  if (attackMatch) {
    return {
      kind: "attack",
      entry: normalizeAttack({
        name,
        toHit: toNumber(attackMatch[1], 0),
        damage: (damageMatch?.[1] || damageMatch?.[2] || "").replace(/\s+/g, ""),
        damageType: damageMatch?.[3] || "",
        notes: trimmed,
      }),
    };
  }

  if (saveMatch) {
    return {
      kind: "action",
      entry: normalizeAction({
        name,
        saveDc: toNumber(saveMatch[1], 10),
        saveAbility: saveMatch[2].slice(0, 3).toLowerCase(),
        description: trimmed,
      }),
    };
  }

  return {
    kind: "action",
    entry: normalizeAction({
      name,
      description: trimmed,
    }),
  };
}

function extractSection(source, title) {
  const section = source.match(
    new RegExp(
      `${title}\\s*\\n([\\s\\S]*?)(?=\\n(?:Bonus Actions|Reactions|Legendary Actions|Mythic Actions|Lair Actions|Regional Effects|Actions|Spellcasting|Description|$))`,
      "i"
    )
  );
  return section?.[1]?.trim() || "";
}

function parseActionsFromStatblock(source) {
  const actionsSection = extractSection(source, "Actions");
  if (!actionsSection) {
    return { attacks: [], actions: [] };
  }

  const chunks = actionsSection
    .split(/\n(?=[A-Z][^\n]{0,80}\.)/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const attacks = [];
  const actions = [];

  for (const chunk of chunks) {
    const parsed = parseActionEntry(chunk);
    if (!parsed) {
      continue;
    }
    if (parsed.kind === "attack") {
      attacks.push(parsed.entry);
    } else {
      actions.push(parsed.entry);
    }
  }

  return { attacks, actions };
}

export function parseStatblock(source, currentSheet = {}) {
  const text = toText(source).replace(/\r/g, "").trim();
  if (!text) {
    return null;
  }

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const name = lines[0] || currentSheet.name || "Unnamed Creature";
  const className = lines[1] || currentSheet.className || "";
  const ac = toNumber(extractTextLine(text, /Armor Class\s+(\d+)/i), currentSheet.ac || 12);
  const hpMax = Math.max(1, toNumber(extractTextLine(text, /Hit Points\s+(\d+)/i), currentSheet.hp?.max || 1));
  const speed = toNumber(extractTextLine(text, /Speed\s+(\d+)/i), currentSheet.speed || 30);
  const level =
    toNumber(extractTextLine(text, /(\d+)(?:st|nd|rd|th)-level spellcaster/i), NaN) ||
    toNumber(extractTextLine(text, /Challenge\s+(\d+)/i), currentSheet.level || 1) ||
    currentSheet.level ||
    1;

  const stats = parseAbilityBlock(text);
  const saves = parseSavingThrows(text, stats);
  const { attacks, actions } = parseActionsFromStatblock(text);
  const resistances = parseCsv(extractTextLine(text, /Damage Resistances\s+([^\n\r]+)/i));
  const immunities = parseCsv(extractTextLine(text, /Damage Immunities\s+([^\n\r]+)/i));
  const vulnerabilities = parseCsv(extractTextLine(text, /Damage Vulnerabilities\s+([^\n\r]+)/i));
  const notes = extractTextLine(text, /(?:Traits|Description)\s+([^\n\r]+)/i) || currentSheet.notes || "";

  return {
    name,
    className,
    ac,
    level,
    speed,
    hp: {
      current: Math.min(currentSheet.hp?.current ?? hpMax, hpMax),
      max: hpMax,
      temp: currentSheet.hp?.temp || 0,
    },
    stats,
    saves,
    resistances: resistances.length ? resistances : currentSheet.resistances || [],
    immunities: immunities.length ? immunities : currentSheet.immunities || [],
    vulnerabilities: vulnerabilities.length ? vulnerabilities : currentSheet.vulnerabilities || [],
    attacks: attacks.length ? attacks : currentSheet.attacks || [],
    actions: actions.length ? actions : currentSheet.actions || [],
    notes,
  };
}

export function applyDamageAdjustments(amount, damageType, targetSheet) {
  const baseAmount = Math.max(0, toNumber(amount, 0));
  const kind = toText(damageType).trim().toLowerCase();

  if (!kind) {
    return { final: baseAmount, effect: "normal" };
  }

  const immunities = targetSheet.immunities.map((entry) => entry.toLowerCase());
  const resistances = targetSheet.resistances.map((entry) => entry.toLowerCase());
  const vulnerabilities = targetSheet.vulnerabilities.map((entry) => entry.toLowerCase());

  if (immunities.includes(kind)) {
    return { final: 0, effect: "immune" };
  }

  if (resistances.includes(kind)) {
    return { final: Math.floor(baseAmount / 2), effect: "resisted" };
  }

  if (vulnerabilities.includes(kind)) {
    return { final: baseAmount * 2, effect: "vulnerable" };
  }

  return { final: baseAmount, effect: "normal" };
}

function createSampleItem(id, name, layer, sheetOverrides, start, end) {
  const item = {
    id,
    type: "IMAGE",
    layer,
    name,
    image: { url: createPortraitDataUrl(name, start, end) },
    metadata: {},
  };

  item.metadata[SHEET_KEY] = createStarterSheet(item, {
    name,
    portraitUrl: item.image.url,
    ...sheetOverrides,
  });

  return item;
}

export function createSampleItems() {
  return [
    createSampleItem(
      "demo-lyra-voss",
      "Lyra Voss",
      "CHARACTER",
      {
        nickname: "Stormglass",
        className: "Battle Master Fighter",
        affiliations: "Silver Lantern Company",
        level: 8,
        ac: 18,
        initiative: 16,
        speed: 30,
        hp: { current: 44, max: 52, temp: 4 },
        stats: { str: 16, dex: 14, con: 16, int: 10, wis: 12, cha: 13 },
        saves: { str: 6, dex: 5, con: 6, int: 0, wis: 1, cha: 1 },
        relationships: [
          {
            id: createId("bond"),
            name: "Brother Alden",
            bond: "Trusted healer",
            notes: "Keeps Lyra standing when the front line breaks.",
          },
          {
            id: createId("bond"),
            name: "Shadeclaw",
            bond: "Marked rival",
            notes: "Swore to finish the basilisk after the bridge ambush.",
          },
        ],
        attacks: [
          {
            id: createId("attack"),
            name: "Longsword",
            toHit: 7,
            damage: "1d8+4",
            damageType: "slashing",
            levelScaleAt: "5, 11",
            levelScaleDamage: "1d8",
            notes: "Versatile in two hands when needed.",
          },
          {
            id: createId("attack"),
            name: "Heavy Crossbow",
            toHit: 5,
            damage: "1d10+2",
            damageType: "piercing",
            notes: "Loaded before initiative begins.",
          },
        ],
        actions: [
          {
            id: createId("action"),
            name: "Menacing Feint",
            saveAbility: "wis",
            saveDc: 15,
            description: "Target is rattled and may become frightened on a failed save.",
          },
        ],
        spells: [],
        conditions: { frightened: false, prone: false },
        notes:
          "Party vanguard. Keeps a running tally of enemy commanders and never leaves a wounded ally behind.",
      },
      "#196f7a",
      "#f0bf6a"
    ),
    createSampleItem(
      "demo-brother-alden",
      "Brother Alden",
      "CHARACTER",
      {
        nickname: "Ashcloak",
        className: "Life Cleric",
        affiliations: "The Ember Hospice",
        level: 7,
        ac: 16,
        initiative: 12,
        speed: 25,
        hp: { current: 33, max: 38, temp: 0 },
        stats: { str: 10, dex: 10, con: 14, int: 12, wis: 18, cha: 15 },
        saves: { str: 0, dex: 0, con: 2, int: 1, wis: 7, cha: 4 },
        attacks: [
          {
            id: createId("attack"),
            name: "Mace",
            toHit: 5,
            damage: "1d6+3",
            damageType: "bludgeoning",
            notes: "Used mostly when spells run dry.",
          },
        ],
        actions: [
          {
            id: createId("action"),
            name: "Turn Undead",
            saveAbility: "wis",
            saveDc: 15,
            description: "Undead creatures recoil or flee on a failed save.",
          },
        ],
        spells: [
          {
            id: createId("spell"),
            name: "Guiding Bolt",
            level: 1,
            attackBonus: 7,
            damage: "4d6",
            damageType: "radiant",
            upcastDamage: "1d6",
            halfOnSave: false,
            description: "A radiant strike that leaves the target exposed.",
          },
          {
            id: createId("spell"),
            name: "Sacred Flame",
            level: 0,
            attackBonus: 0,
            saveAbility: "dex",
            saveDc: 15,
            damage: "2d8",
            damageType: "radiant",
            levelScaleAt: "5, 11, 17",
            levelScaleDamage: "1d8",
            halfOnSave: false,
            description: "Target makes a DEX save or takes radiant damage.",
          },
        ],
        spellSlots: {
          1: { total: 4, used: 1 },
          2: { total: 3, used: 1 },
          3: { total: 2, used: 0 },
          4: { total: 1, used: 0 },
        },
        relationships: [
          {
            id: createId("bond"),
            name: "Lyra Voss",
            bond: "Field commander",
            notes: "Alden trusts Lyra's calls even when they hurt.",
          },
        ],
        notes: "Keeps the group stitched together with blessings and grim campfire humor.",
      },
      "#4d5f9f",
      "#e6b86c"
    ),
    createSampleItem(
      "demo-shadeclaw",
      "Shadeclaw",
      "CHARACTER",
      {
        className: "Basilisk Stalker",
        affiliations: "Glass Maw Pack",
        level: 6,
        ac: 15,
        initiative: 14,
        speed: 30,
        hp: { current: 67, max: 67, temp: 0 },
        stats: { str: 18, dex: 12, con: 16, int: 3, wis: 10, cha: 6 },
        saves: { str: 4, dex: 1, con: 3, int: -4, wis: 0, cha: -2 },
        attacks: [
          {
            id: createId("attack"),
            name: "Bite",
            toHit: 6,
            damage: "2d6+4",
            damageType: "piercing",
            notes: "On a crit, venom seeps into the wound.",
          },
          {
            id: createId("attack"),
            name: "Tail Sweep",
            toHit: 6,
            damage: "1d10+4",
            damageType: "bludgeoning",
            notes: "Can knock smaller targets prone.",
          },
        ],
        actions: [
          {
            id: createId("action"),
            name: "Petrifying Gaze",
            saveAbility: "con",
            saveDc: 14,
            description: "A failed save leaves the target partially calcified and slowed.",
          },
        ],
        resistances: ["poison"],
        immunities: ["petrified"],
        vulnerabilities: [],
        conditions: { burning: true, frightened: false, restrained: false, prone: false },
        notes: "Lurks near ruined bridges and reacts violently to torchlight.",
      },
      "#264c36",
      "#d18b51"
    ),
  ];
}
