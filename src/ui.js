import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  CONDITIONS,
  SPELL_SLOT_LEVELS,
} from "./constants.js";
import { ISLAND_REGISTRY, ISLAND_TOOLBAR_ORDER } from "./island-registry.js";
import { resolveGridMetrics } from "./island-system.js";
import { abilityModifier, buildScaledDamageExpression, toSigned } from "./sheet.js";

const CONDITION_MAP = Object.fromEntries(CONDITIONS.map((condition) => [condition.key, condition]));
const CONDITION_GLYPHS = {
  blinded: "BL",
  burning: "FI",
  charmed: "CH",
  deafened: "DF",
  frightened: "FR",
  grappled: "GR",
  incapacitated: "IC",
  invisible: "IN",
  paralyzed: "PA",
  petrified: "PE",
  poisoned: "PO",
  prone: "PR",
  restrained: "RE",
  sleeping: "SL",
  stunned: "ST",
  unconscious: "UN",
};
const CLASS_ICON_LIBRARY = [
  { match: /artificer|artficer/, file: "Artficer.png", label: "Artificer" },
  { match: /fighter/, file: "Fighter.png", label: "Fighter" },
  { match: /mystic/, file: "Mystic.png", label: "Mystic" },
  { match: /paladin/, file: "Paladin.png", label: "Paladin" },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getSelectedCreature(state) {
  return state.creatures.find((creature) => creature.itemId === state.selectedCreatureId) || null;
}

function getTargetCreature(state) {
  return state.creatures.find((creature) => creature.itemId === state.targetCreatureId) || null;
}

function isTightIslandMode(mode) {
  return mode === "compact" || mode === "standard";
}

function getCreatureForIsland(state, island) {
  if (island.creatureId) {
    return state.creatures.find((creature) => creature.itemId === island.creatureId) || null;
  }
  return getSelectedCreature(state);
}

function sortByInitiative(creatures) {
  return [...creatures].sort((left, right) => {
    if (right.sheet.initiative !== left.sheet.initiative) {
      return right.sheet.initiative - left.sheet.initiative;
    }
    return left.sheet.name.localeCompare(right.sheet.name);
  });
}

function getActiveConditions(sheet) {
  return Object.entries(sheet.conditions || {})
    .filter(([, active]) => active)
    .map(([key]) => CONDITION_MAP[key] || { key, label: key.toUpperCase(), short: key.slice(0, 2).toUpperCase() });
}

function getShortName(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts[0] || "Unit";
}

function getPassivePerception(creature) {
  const wisMod = abilityModifier(creature.sheet.stats.wis);
  const wisSave = Number.isFinite(Number(creature.sheet.saves.wis)) ? creature.sheet.saves.wis : wisMod;
  return 10 + Math.max(wisMod, wisSave);
}

function getExpertiseLabel(creature) {
  const highest = ABILITY_KEYS.map((ability) => ({
    ability,
    modifier: creature.sheet.saves[ability] ?? abilityModifier(creature.sheet.stats[ability]),
  })).sort((left, right) => right.modifier - left.modifier)[0];

  return highest ? `${ABILITY_LABELS[highest.ability]} ${toSigned(highest.modifier)}` : "None";
}

function getCompactClassLabel(className = "") {
  const words = String(className || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "Tracked entity";
  }

  return words.length === 1 ? words[0] : words.at(-1);
}

function getClassIcon(className) {
  const source = String(className || "").trim().toLowerCase();
  if (!source) {
    return null;
  }

  const found = CLASS_ICON_LIBRARY.find((entry) => entry.match.test(source));
  if (!found) {
    return null;
  }

  return {
    src: `./assets/class-icons/${found.file}`,
    label: found.label,
  };
}

function renderClassArt(className, tone = "light", size = "small") {
  const icon = getClassIcon(className);
  if (!icon) {
    const initials =
      String(className || "CC")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("")
        .slice(0, 3) || "CC";
    return `<span class="class-mark class-mark--${escapeHtml(size)}">${escapeHtml(initials)}</span>`;
  }

  return `
    <span class="class-icon-badge class-icon-badge--${escapeHtml(size)} class-icon-badge--${escapeHtml(tone)}">
      <img
        class="class-icon ${tone === "light" ? "class-icon--inverted" : ""}"
        src="${escapeHtml(icon.src)}"
        alt="${escapeHtml(icon.label)}"
      />
    </span>
  `;
}

function renderPortrait(creature, size = "large") {
  return `
    <div class="portrait-shell portrait-shell--${escapeHtml(size)}">
      <div
        class="portrait portrait--${escapeHtml(size)}"
        style="background-image:url('${escapeHtml(creature?.portraitUrl || "")}')"
      ></div>
    </div>
  `;
}

function renderPortraitUpload(creature) {
  return `
    <label class="button button--ghost button--upload">
      <input
        type="file"
        accept="image/*"
        data-portrait-upload="true"
        data-item-id="${escapeHtml(creature.itemId)}"
      />
      ${creature.portraitUrl ? "Change portrait" : "Upload portrait"}
    </label>
  `;
}

function renderMetric(label, value, tone = "default") {
  return `
    <div class="metric-pill metric-pill--${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderSummaryChip(label, value, tone = "muted") {
  return `
    <span class="summary-chip summary-chip--${escapeHtml(tone)}">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
    </span>
  `;
}

function renderHpTrack(creature, mode = "standard") {
  const current = creature.sheet.hp.current;
  const max = Math.max(1, creature.sheet.hp.max);
  const temp = creature.sheet.hp.temp;
  const percent = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  const tempPercent = Math.max(0, Math.min(100, Math.round((temp / max) * 100)));

  return `
    <div class="hp-cluster hp-cluster--${escapeHtml(mode)}">
      <div class="hp-track" style="--hp-percent:${percent}%;">
        <div class="hp-track__fill"></div>
        <div class="hp-track__label">HP ${escapeHtml(`${current} / ${max}`)}</div>
      </div>
      ${
        temp > 0
          ? `
            <div class="hp-track hp-track--temp" style="--hp-percent:${tempPercent}%;">
              <div class="hp-track__fill"></div>
              <div class="hp-track__label">Temp ${escapeHtml(`${temp}`)}</div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderConditionBadge(condition, interactive = false, creature = null) {
  const glyph = CONDITION_GLYPHS[condition.key] || condition.short || condition.label.slice(0, 2);
  const actionAttributes =
    interactive && creature
      ? `data-action="toggle-condition" data-item-id="${escapeHtml(creature.itemId)}" data-condition-key="${escapeHtml(
          condition.key
        )}"`
      : "";

  const tag = interactive ? "button" : "span";
  return `
    <${tag}
      class="condition-badge"
      ${interactive ? `type="button"` : ""}
      ${actionAttributes}
      title="${escapeHtml(condition.label)}"
    >
      <span class="condition-badge__glyph">${escapeHtml(glyph)}</span>
      <span class="condition-badge__label">${escapeHtml(condition.label)}</span>
    </${tag}>
  `;
}

function renderCreatureChip(creature, active = false) {
  return `
    <button
      class="creature-chip ${active ? "is-active" : ""}"
      type="button"
      data-action="focus-creature"
      data-creature-id="${escapeHtml(creature.itemId)}"
    >
      ${renderPortrait(creature, "tiny")}
      <span>${escapeHtml(creature.sheet.name)}</span>
    </button>
  `;
}

function renderInitiativeCapsule(creature, activeTurnId) {
  const isActive = creature.itemId === activeTurnId;
  return `
    <button
      class="initiative-capsule ${isActive ? "is-active" : ""}"
      type="button"
      data-action="set-turn"
      data-creature-id="${escapeHtml(creature.itemId)}"
    >
      <strong>${escapeHtml(creature.sheet.initiative)}</strong>
      <span>${escapeHtml(getShortName(creature.sheet.name))}</span>
    </button>
  `;
}

function renderSpellAction(creature, spell, mode) {
  const castableLevels = SPELL_SLOT_LEVELS.filter(
    (level) =>
      level >= spell.level &&
      ((creature.sheet.spellSlots?.[level]?.total || 0) > 0 || level === spell.level)
  );
  const remaining =
    spell.level > 0 && creature.sheet.spellSlots?.[spell.level]
      ? Math.max(0, creature.sheet.spellSlots[spell.level].total - creature.sheet.spellSlots[spell.level].used)
      : null;

  return `
    <div class="entry-line entry-line--spell">
      <div>
        <strong>${escapeHtml(spell.name)}</strong>
        <span>${escapeHtml(spell.level === 0 ? "Cantrip" : `Level ${spell.level}`)}${
          remaining !== null ? ` | ${escapeHtml(`${remaining} left`)}` : ""
        }</span>
      </div>
      <div class="entry-line__controls">
        ${
          spell.level > 0 && mode !== "micro"
            ? `
              <select class="field-select js-cast-level">
                ${castableLevels
                  .map((level) => {
                    const slot = creature.sheet.spellSlots?.[level];
                    const suffix = slot?.total ? ` (${Math.max(0, slot.total - slot.used)} left)` : "";
                    return `
                      <option value="${escapeHtml(level)}" ${level === spell.level ? "selected" : ""}>
                        ${escapeHtml(`L${level}${suffix}`)}
                      </option>
                    `;
                  })
                  .join("")}
              </select>
            `
            : ""
        }
        <button
          class="button button--accent button--mini"
          type="button"
          data-action="cast-spell"
          data-item-id="${escapeHtml(creature.itemId)}"
          data-entry-id="${escapeHtml(spell.id)}"
        >
          Cast
        </button>
      </div>
    </div>
  `;
}

function renderAttackAction(creature, attack) {
  const damage = buildScaledDamageExpression(attack, creature.sheet.level) || attack.damage || "n/a";
  return `
    <div class="entry-line">
      <div>
        <strong>${escapeHtml(attack.name)}</strong>
        <span>${escapeHtml(`${toSigned(attack.toHit)} to hit | ${damage}`)}</span>
      </div>
      <button
        class="button button--accent button--mini"
        type="button"
        data-action="roll-attack"
        data-item-id="${escapeHtml(creature.itemId)}"
        data-entry-id="${escapeHtml(attack.id)}"
      >
        Attack
      </button>
    </div>
  `;
}

function renderStatChart(creature) {
  return `
    <div class="stat-chart">
      ${ABILITY_KEYS.map((ability) => {
        const score = creature.sheet.stats[ability];
        const percent = Math.max(14, Math.min(100, Math.round((score / 20) * 100)));
        return `
          <div class="stat-chart__bar">
            <span>${escapeHtml(ability.toUpperCase())}</span>
            <div class="stat-chart__track">
              <div class="stat-chart__fill" style="--fill:${percent}%"></div>
            </div>
            <strong>${escapeHtml(score)}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderIslandModel(island, state) {
  const creature = getCreatureForIsland(state, island);
  const target = getTargetCreature(state);
  const sortedCreatures = sortByInitiative(state.creatures);

  switch (island.kind) {
    case "command-center":
      return {
        eyebrow: "Command",
        title: "Campaign Codex",
        meta: creature
          ? `${creature.sheet.name} on deck | ${state.creatures.length} tracked`
          : "Import tokens to start the board.",
        icon: `<span class="glyph-badge">CMD</span>`,
        primaryMetric: `
          <div class="metric-callout">
            <strong>${escapeHtml(state.creatures.length)}</strong>
            <span>tracked entities</span>
          </div>
        `,
        body: `
          <div class="cluster cluster--roster">
            ${state.creatures
              .slice(0, 6)
              .map((entry) => renderCreatureChip(entry, entry.itemId === state.selectedCreatureId))
              .join("")}
          </div>
          ${
            creature
              ? `
                <div class="selected-strip">
                  ${renderPortrait(creature, "tiny")}
                  <div>
                    <strong>${escapeHtml(creature.sheet.name)}</strong>
                    <span>${escapeHtml(creature.sheet.className || "Tracked creature")}</span>
                  </div>
                </div>
              `
              : ""
          }
          <label class="field-stack">
            <span>Locked target</span>
            <select class="field-select" data-target-select="true">
              ${state.creatures
                .map(
                  (entry) => `
                    <option value="${escapeHtml(entry.itemId)}" ${
                      entry.itemId === state.targetCreatureId ? "selected" : ""
                    }>
                      ${escapeHtml(entry.sheet.name)}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
        `,
        actions: `
          <button class="button button--accent" type="button" data-action="import-selection">Import</button>
          <button class="button button--ghost" type="button" data-action="normalize-layout">Normalize</button>
          ${
            creature
              ? `<button class="button button--ghost" type="button" data-action="open-island" data-island-kind="entity-overview">Overview</button>`
              : ""
          }
        `,
        footer: `
          ${renderSummaryChip("Role", state.role, "muted")}
          ${renderSummaryChip("Scene", state.sceneReady ? "Ready" : "Offline", "muted")}
          ${state.demoMode ? renderSummaryChip("Mode", "Demo", "muted") : ""}
        `,
      };
    case "roster":
      return {
        eyebrow: "Navigation",
        title:
          island.mode === "compact"
            ? state.creatures.length
              ? "Navigator"
              : "Roster"
            : state.creatures.length
              ? "Party Navigator"
              : "Navigator",
        meta: creature
          ? island.mode === "compact"
            ? `${getShortName(creature.sheet.name)} selected`
            : `${creature.sheet.name} selected`
          : island.mode === "compact"
            ? "No selection"
            : "No active creature",
        icon: `<span class="glyph-badge">NAV</span>`,
        primaryMetric: `
          <div class="metric-callout metric-callout--compact">
            <strong>${escapeHtml(state.creatures.length)}</strong>
            <span>actors</span>
          </div>
        `,
        body: `
          <div class="roster-grid">
            ${state.creatures
              .map((entry) => renderCreatureChip(entry, entry.itemId === state.selectedCreatureId))
              .join("")}
          </div>
        `,
        footer: creature
          ? `
              <div class="selected-strip">
                ${renderPortrait(creature, "tiny")}
                <div>
                  <strong>${escapeHtml(creature.sheet.name)}</strong>
                  <span>${escapeHtml(`${creature.sheet.hp.current}/${creature.sheet.hp.max} HP`)}</span>
                </div>
              </div>
            `
          : "",
      };
    case "turn-order": {
      const lead = sortedCreatures[0] || null;
      const turnMeta = lead
        ? island.mode === "compact"
          ? `${getShortName(lead.sheet.name)} leads now`
          : island.mode === "standard"
            ? `${lead.sheet.name} leads the stack`
            : `${lead.sheet.name} currently leads the stack`
        : island.mode === "compact"
          ? "No turn queue"
          : "No tracked initiatives yet.";
      return {
        eyebrow: "Status",
        title: island.mode === "compact" ? "Turn Order" : "Turn Order",
        meta: turnMeta,
        icon: `<span class="glyph-badge">TO</span>`,
        primaryMetric: `
          <div class="metric-callout">
            <strong>${escapeHtml(sortedCreatures.length)}</strong>
            <span>tracked turns</span>
          </div>
        `,
        body: `
          <div class="initiative-row">
            ${sortedCreatures
              .slice(0, island.mode === "hero" ? 6 : 4)
              .map((entry) => renderInitiativeCapsule(entry, state.activeTurnCreatureId))
              .join("")}
          </div>
        `,
        chart: `
          <div class="timeline-strip">
            ${sortedCreatures
              .slice(0, 6)
              .map(
                (entry) => `
                  <span class="timeline-strip__dot ${entry.itemId === state.activeTurnCreatureId ? "is-active" : ""}">
                    ${escapeHtml(entry.sheet.initiative)}
                  </span>
                `
              )
              .join("")}
          </div>
        `,
        actions: creature
          ? `
              <button
                class="button button--accent"
                type="button"
                data-action="roll-initiative"
                data-creature-id="${escapeHtml(creature.itemId)}"
              >
                Roll for ${escapeHtml(getShortName(creature.sheet.name))}
              </button>
            `
          : "",
      };
    }
    case "entity-overview": {
      if (!creature) {
        return {
          eyebrow: "Entity",
          title: "No Entity Selected",
          meta: "Focus a tracked creature to populate this island.",
          icon: `<span class="glyph-badge">ENT</span>`,
          primaryMetric: `<div class="metric-callout metric-callout--compact"><strong>0</strong><span>entity</span></div>`,
          actions: `<button class="button button--accent" type="button" data-action="import-selection">Import</button>`,
        };
      }
      const activeConditions = getActiveConditions(creature.sheet);
      return {
        eyebrow: creature.sheet.affiliations || "Entity",
        title: creature.sheet.name,
        meta: `${creature.sheet.className || "Tracked entity"} | Level ${creature.sheet.level}`,
        icon: renderClassArt(creature.sheet.className, "light", island.mode === "hero" ? "large" : "small"),
        media: `
          <div class="media-stack">
            ${renderPortrait(creature, island.mode === "micro" ? "tiny" : "large")}
            <div class="media-stack__tools">
              ${renderPortraitUpload(creature)}
              ${
                activeConditions.length
                  ? `<div class="status-row">${activeConditions
                      .slice(0, island.mode === "hero" ? 6 : 3)
                      .map((condition) => renderConditionBadge(condition))
                      .join("")}</div>`
                  : `<span class="subtle-note">No active conditions</span>`
              }
            </div>
          </div>
        `,
        primaryMetric: renderHpTrack(creature, island.mode),
        body: `
          <div class="metric-grid">
            ${renderMetric("AC", creature.sheet.ac, "violet")}
            ${renderMetric("Level", creature.sheet.level, "olive")}
            ${renderMetric("Speed", `${creature.sheet.speed} ft`, "graphite")}
            ${renderMetric("Init", toSigned(creature.sheet.initiative || 0), "graphite")}
          </div>
          <div class="summary-row">
            ${creature.sheet.affiliations ? renderSummaryChip("Faction", creature.sheet.affiliations, "violet") : ""}
            ${renderSummaryChip("Passive", getPassivePerception(creature), "muted")}
          </div>
        `,
        actions: `
          <button
            class="button button--ghost"
            type="button"
            data-action="center-creature"
            data-creature-id="${escapeHtml(creature.itemId)}"
          >
            Center
          </button>
          <button
            class="button button--ghost"
            type="button"
            data-action="adjust-hp"
            data-item-id="${escapeHtml(creature.itemId)}"
            data-delta="-5"
          >
            -5 HP
          </button>
          <button
            class="button button--ghost"
            type="button"
            data-action="adjust-hp"
            data-item-id="${escapeHtml(creature.itemId)}"
            data-delta="5"
          >
            +5 HP
          </button>
        `,
        footer: creature.sheet.notes
          ? `<p class="note-snippet">${escapeHtml(creature.sheet.notes)}</p>`
          : `<p class="note-snippet">No notes yet. Use the active islands to build quick context.</p>`,
      };
    }
    case "battle-readout": {
      if (!creature) {
        return {
          eyebrow: "Insight",
          title: "Battle Readout",
          meta: "Attach this island to a tracked creature.",
          icon: `<span class="glyph-badge">ATK</span>`,
        };
      }
      const primaryAttack = creature.sheet.attacks[0] || null;
      const primarySpell = creature.sheet.spells[0] || null;
      const battleMeta = target
        ? isTightIslandMode(island.mode)
          ? `${getShortName(target.sheet.name)} targeted`
          : `${target.sheet.name} locked as target`
        : island.mode === "compact"
          ? "Pick a target"
          : "Choose a target to resolve attacks.";
      return {
        eyebrow: "Insight",
        title: isTightIslandMode(island.mode) ? "Combat" : `${creature.sheet.name} Combat`,
        meta: battleMeta,
        icon: `<span class="glyph-badge">ATK</span>`,
        primaryMetric: primaryAttack
          ? `<div class="metric-callout"><strong>${escapeHtml(toSigned(primaryAttack.toHit))}</strong><span>${
              isTightIslandMode(island.mode) ? "hit" : "to hit"
            }</span></div>`
          : `<div class="metric-callout metric-callout--compact"><strong>0</strong><span>attacks</span></div>`,
        body: `
          <div class="metric-grid">
            ${renderMetric("Target AC", target?.sheet.ac ?? "n/a", "violet")}
            ${renderMetric(
              "Damage",
              primaryAttack ? buildScaledDamageExpression(primaryAttack, creature.sheet.level) || primaryAttack.damage : "n/a",
              "olive"
            )}
            ${renderMetric("Attacks", creature.sheet.attacks.length, "graphite")}
            ${renderMetric("Spells", creature.sheet.spells.length, "graphite")}
          </div>
          <div class="stack">
            ${primaryAttack ? renderAttackAction(creature, primaryAttack) : `<div class="empty-line">No parsed attacks yet.</div>`}
            ${primarySpell ? renderSpellAction(creature, primarySpell, island.mode) : ""}
          </div>
        `,
        actions: `
          ${
            primaryAttack
              ? `
                <button
                  class="button button--accent"
                  type="button"
                  data-action="roll-attack"
                  data-item-id="${escapeHtml(creature.itemId)}"
                  data-entry-id="${escapeHtml(primaryAttack.id)}"
                >
                  Attack
                </button>
              `
              : ""
          }
          ${
            primarySpell
              ? `
                <button
                  class="button button--ghost"
                  type="button"
                  data-action="cast-spell"
                  data-item-id="${escapeHtml(creature.itemId)}"
                  data-entry-id="${escapeHtml(primarySpell.id)}"
                >
                  Cast ${escapeHtml(getShortName(primarySpell.name))}
                </button>
              `
              : ""
          }
        `,
        footer: target
          ? `<div class="summary-row">${renderSummaryChip("Target", target.sheet.name, "yellow")}${renderSummaryChip(
              "HP",
              `${target.sheet.hp.current}/${target.sheet.hp.max}`,
              "muted"
            )}</div>`
          : "",
      };
    }
    case "spellbook": {
      if (!creature) {
        return {
          eyebrow: "Insight",
          title: "Spellbook",
          meta: "No caster attached.",
          icon: `<span class="glyph-badge">SPL</span>`,
        };
      }
      const spells = creature.sheet.spells;
      const remainingSlots = SPELL_SLOT_LEVELS.reduce((sum, level) => {
        const slot = creature.sheet.spellSlots?.[level];
        if (!slot) {
          return sum;
        }
        return sum + Math.max(0, slot.total - slot.used);
      }, 0);
      return {
        eyebrow: "Insight",
        title: `${creature.sheet.name} Spellbook`,
        meta: spells.length ? `${spells.length} spells prepared` : "No spells parsed yet.",
        icon: `<span class="glyph-badge">SPL</span>`,
        primaryMetric: `
          <div class="metric-callout">
            <strong>${escapeHtml(remainingSlots)}</strong>
            <span>slots left</span>
          </div>
        `,
        body: `
          <div class="metric-grid">
            ${SPELL_SLOT_LEVELS
              .slice(0, island.mode === "hero" ? 4 : 2)
              .filter((level) => (creature.sheet.spellSlots?.[level]?.total || 0) > 0)
              .map((level) => {
                const slot = creature.sheet.spellSlots[level];
                return renderMetric(`L${level}`, `${Math.max(0, slot.total - slot.used)}/${slot.total}`, "olive");
              })
              .join("")}
          </div>
          <div class="stack">
            ${
              spells.length
                ? spells
                    .slice(0, island.mode === "hero" ? 4 : island.mode === "standard" ? 2 : 1)
                    .map((spell) => renderSpellAction(creature, spell, island.mode))
                    .join("")
                : `<div class="empty-line">No spells tracked yet.</div>`
            }
          </div>
        `,
        footer: spells[0]?.description ? `<p class="note-snippet">${escapeHtml(spells[0].description)}</p>` : "",
      };
    }
    case "stat-constellation": {
      if (!creature) {
        return {
          eyebrow: "Insight",
          title: "Stats",
          meta: "No creature bound.",
          icon: `<span class="glyph-badge">STA</span>`,
        };
      }
      const expertiseLabel = getExpertiseLabel(creature);
      return {
        eyebrow: "Insight",
        title: isTightIslandMode(island.mode) ? "Stats" : `${creature.sheet.name} Stats`,
        meta: isTightIslandMode(island.mode)
          ? getCompactClassLabel(creature.sheet.className)
          : `${creature.sheet.className || "Tracked entity"} | expertise in ${expertiseLabel}`,
        icon: `<span class="glyph-badge">STA</span>`,
        primaryMetric: `
          <div class="metric-callout">
            <strong>${escapeHtml(getPassivePerception(creature))}</strong>
            <span>${isTightIslandMode(island.mode) ? "passive" : "passive perception"}</span>
          </div>
        `,
        body: `
          <div class="metric-grid metric-grid--dense">
            ${renderMetric("Init", toSigned(creature.sheet.initiative || 0), "violet")}
            ${renderMetric("Expert", getShortName(getExpertiseLabel(creature)), "olive")}
            ${renderMetric("STR", toSigned(abilityModifier(creature.sheet.stats.str)), "graphite")}
            ${renderMetric("DEX", toSigned(abilityModifier(creature.sheet.stats.dex)), "graphite")}
          </div>
        `,
        chart: renderStatChart(creature),
        footer: `
          <div class="summary-row">
            ${renderSummaryChip("Best save", expertiseLabel, "violet")}
            ${renderSummaryChip("Passive", getPassivePerception(creature), "muted")}
          </div>
        `,
      };
    }
    case "condition-lane": {
      if (!creature) {
        return {
          eyebrow: "Status",
          title: "Conditions",
          meta: "No creature selected.",
          icon: `<span class="glyph-badge">CON</span>`,
        };
      }
      const activeConditions = getActiveConditions(creature.sheet);
      return {
        eyebrow: "Status",
        title: `${creature.sheet.name} Conditions`,
        meta: activeConditions.length ? `${activeConditions.length} active states` : "No active conditions",
        icon: `<span class="glyph-badge">CON</span>`,
        primaryMetric: `
          <div class="metric-callout metric-callout--compact">
            <strong>${escapeHtml(activeConditions.length)}</strong>
            <span>active</span>
          </div>
        `,
        body: `
          <div class="condition-grid">
            ${(activeConditions.length ? activeConditions : CONDITIONS.slice(0, island.mode === "micro" ? 2 : 6))
              .slice(0, island.mode === "hero" ? 8 : island.mode === "wide" ? 6 : 4)
              .map((condition) => renderConditionBadge(condition, island.mode !== "micro", creature))
              .join("")}
          </div>
        `,
        actions: `
          ${CONDITIONS.slice(0, island.mode === "hero" ? 6 : 3)
            .map((condition) => renderConditionBadge(condition, true, creature))
            .join("")}
        `,
        footer: activeConditions.length
          ? `<div class="summary-row">${activeConditions
              .slice(0, 3)
              .map((condition) => renderSummaryChip("Status", condition.label, "yellow"))
              .join("")}</div>`
          : `<span class="subtle-note">Track quick status changes from here.</span>`,
      };
    }
    case "relation-orbit": {
      if (!creature) {
        return {
          eyebrow: "Entity",
          title: "Relations",
          meta: "No creature bound.",
          icon: `<span class="glyph-badge">REL</span>`,
        };
      }
      const relations = creature.sheet.relationships || [];
      return {
        eyebrow: "Entity",
        title: `${creature.sheet.name} Relations`,
        meta: relations.length ? `${relations.length} ties tracked` : "No relationships recorded yet.",
        icon: `<span class="glyph-badge">REL</span>`,
        primaryMetric: `
          <div class="metric-callout metric-callout--compact">
            <strong>${escapeHtml(relations.length)}</strong>
            <span>links</span>
          </div>
        `,
        body: relations.length
          ? `
              <div class="stack">
                ${relations
                  .slice(0, island.mode === "wide" ? 3 : 2)
                  .map(
                    (relation) => `
                      <div class="entry-line entry-line--plain">
                        <div>
                          <strong>${escapeHtml(relation.name)}</strong>
                          <span>${escapeHtml(relation.bond || relation.notes || "No details recorded.")}</span>
                        </div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
          : `<div class="empty-line">No relationship cards yet.</div>`,
        footer: creature.sheet.affiliations ? renderSummaryChip("Faction", creature.sheet.affiliations, "violet") : "",
      };
    }
    case "roll-log": {
      const latest = state.rollLog[0] || null;
      const rollMeta = latest
        ? island.mode === "compact"
          ? "Latest result ready."
          : "Latest combat output on deck."
        : island.mode === "compact"
          ? "Quiet board."
          : "Quiet board. Rolls appear here.";
      return {
        eyebrow: "Ambient",
        title: "Roll Log",
        meta: rollMeta,
        icon: `<span class="glyph-badge">LOG</span>`,
        primaryMetric: `
          <div class="metric-callout metric-callout--compact">
            <strong>${escapeHtml(state.rollLog.length)}</strong>
            <span>entries</span>
          </div>
        `,
        body: latest
          ? `
              <div class="stack">
                ${state.rollLog
                  .slice(0, island.mode === "wide" ? 4 : 2)
                  .map(
                    (entry) => `
                      <div class="log-line">
                        <strong>${escapeHtml(new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</strong>
                        <span>${escapeHtml(entry.text)}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
          : `<div class="empty-line">No rolls yet.</div>`,
        actions: state.rollLog.length
          ? `<button class="button button--ghost" type="button" data-action="clear-log">Clear</button>`
          : "",
      };
    }
    default:
      return {
        eyebrow: island.spec.title,
        title: island.spec.title,
        meta: "Adaptive island",
        icon: `<span class="glyph-badge">BOX</span>`,
      };
  }
}

function renderSlot(name, visible, content) {
  if (!visible || !content) {
    return "";
  }
  return `<div class="island__slot island__slot--${escapeHtml(name)}">${content}</div>`;
}

function renderIsland(island, state) {
  const model = renderIslandModel(island, state);
  const slots = island.slotVisibility;
  return `
    <article
      class="island island--${escapeHtml(island.spec.category)} island--mode-${escapeHtml(
        island.mode
      )} island--shape-${escapeHtml(island.shape)} island--accent-${escapeHtml(island.accent)} ${
        island.isFocused ? "is-focused" : ""
      } ${island.isActive ? "is-active" : ""}"
      data-island-id="${escapeHtml(island.id)}"
      data-island-kind="${escapeHtml(island.kind)}"
      data-col="${escapeHtml(island.col)}"
      data-row="${escapeHtml(island.row)}"
      style="grid-column:${island.col} / span ${island.cols};grid-row:${island.row} / span ${island.rows};"
    >
      <div class="island__surface">
        <header class="island__header ${slots.header ? "" : "island__header--minimal"}" data-drag-handle="true">
          <div class="island__headcopy">
            <div class="island__eyebrow">${escapeHtml(model.eyebrow || island.spec.title)}</div>
            ${slots.header ? `<h3 class="island__title">${escapeHtml(model.title || island.spec.title)}</h3>` : ""}
            ${slots.meta ? `<p class="island__meta">${escapeHtml(model.meta || "")}</p>` : ""}
          </div>
          <div class="island__controls">
            ${model.icon && slots.icon ? `<div class="island__icon">${model.icon}</div>` : ""}
            <button
              class="button button--ghost button--mini"
              type="button"
              data-action="toggle-island"
              data-island-id="${escapeHtml(island.id)}"
            >
              ${island.span === island.spec.expandedSpan ? "-" : "+"}
            </button>
            <button
              class="button button--ghost button--mini"
              type="button"
              data-action="close-island"
              data-island-id="${escapeHtml(island.id)}"
            >
              x
            </button>
          </div>
        </header>
        <div class="island__layout">
          ${renderSlot("media", slots.media, model.media)}
          ${renderSlot("primaryMetric", slots.primaryMetric, model.primaryMetric)}
          ${renderSlot("body", slots.body, model.body)}
          ${renderSlot("chart", slots.chart, model.chart)}
          ${renderSlot("actions", slots.actions, model.actions)}
          ${renderSlot("footer", slots.footer, model.footer)}
        </div>
      </div>
    </article>
  `;
}

function renderDock(state) {
  return `
    <aside class="dock">
      <button class="dock__logo" type="button" data-action="focus-home" aria-label="Campaign Codex">
        cc
      </button>
      <div class="dock__stack">
        <button class="dock-button dock-button--accent" type="button" data-action="import-selection">
          <span>+</span>
          <small>Import</small>
        </button>
        <button class="dock-button" type="button" data-action="normalize-layout">
          <span>#</span>
          <small>Normalize</small>
        </button>
      </div>
      <div class="dock__stack dock__stack--panels">
        ${ISLAND_TOOLBAR_ORDER.map((kind) => {
          const spec = ISLAND_REGISTRY[kind];
          const targetId = spec.scope === "global" ? null : state.selectedCreatureId;
          const active = state.islands.some(
            (island) => island.kind === kind && island.creatureId === targetId
          );
          const disabled = spec.scope === "creature" && !state.selectedCreatureId ? "disabled" : "";
          return `
            <button
              class="dock-button ${active ? "is-active" : ""}"
              type="button"
              ${disabled}
              data-action="open-island"
              data-island-kind="${escapeHtml(kind)}"
            >
              <span>${escapeHtml(spec.shortLabel)}</span>
              <small>${escapeHtml(spec.title)}</small>
            </button>
          `;
        }).join("")}
      </div>
      <div class="dock__footer">
        ${state.demoMode ? `<div class="dock-badge">Demo</div>` : ""}
        <div class="dock-badge">${escapeHtml(state.role)}</div>
      </div>
    </aside>
  `;
}

function renderWorkspace(state, resolvedIslands, grid) {
  return `
    <main class="main">
      <section
        class="workspace workspace-canvas"
        style="--grid-columns:${grid.columns};--grid-gap:${grid.gap}px;--row-unit:${grid.rowUnit}px;"
      >
        ${
          !resolvedIslands.length
            ? `
              <div class="workspace-empty">
                <h3>Open adaptive islands</h3>
                <p>
                  Start from the command layer, then add only the entity and insight islands you need.
                </p>
                <div class="workspace-empty__actions">
                  <button class="button button--accent" type="button" data-action="import-selection">Import</button>
                  <button class="button button--ghost" type="button" data-action="open-island" data-island-kind="command-center">Open Command</button>
                </div>
              </div>
            `
            : resolvedIslands.map((island) => renderIsland(island, state)).join("")
        }
      </section>
    </main>
  `;
}

function renderApp(state, resolvedIslands, grid) {
  return `
    <div class="app" data-mode="${escapeHtml(state.theme?.mode || "DARK")}">
      <div class="shell shell--dense">
        ${renderDock(state)}
        ${renderWorkspace(state, resolvedIslands, grid)}
      </div>
    </div>
  `;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function getWorkspace(root) {
  return root.querySelector(".workspace-canvas");
}

function getWorkspaceWidth(root) {
  return getWorkspace(root)?.clientWidth || 1280;
}

function getResolvedContext(root, store, state) {
  const width = getWorkspaceWidth(root);
  const grid = resolveGridMetrics(width);
  const resolvedIslands = store.getResolvedIslands(width);
  return { width, grid, resolvedIslands };
}

function getDropPosition(root, clientX, clientY) {
  const workspace = getWorkspace(root);
  if (!workspace) {
    return { col: 1, row: 1 };
  }
  const rect = workspace.getBoundingClientRect();
  const computed = globalThis.getComputedStyle(workspace);
  const paddingLeft = parseFloat(computed.paddingLeft || "0");
  const paddingTop = parseFloat(computed.paddingTop || "0");
  const paddingRight = parseFloat(computed.paddingRight || "0");
  const grid = resolveGridMetrics(rect.width);
  const gap = parseFloat(computed.columnGap || `${grid.gap}`) || grid.gap;
  const rowGap = parseFloat(computed.rowGap || `${grid.gap}`) || grid.gap;
  const usableWidth = rect.width - paddingLeft - paddingRight - gap * (grid.columns - 1);
  const cellWidth = usableWidth / grid.columns;
  const relativeX = Math.max(0, clientX - rect.left - paddingLeft);
  const relativeY = Math.max(0, clientY - rect.top - paddingTop);
  const col = Math.max(1, Math.min(grid.columns, Math.floor(relativeX / (cellWidth + gap)) + 1));
  const row = Math.max(1, Math.floor(relativeY / (grid.rowUnit + rowGap)) + 1);
  return { col, row };
}

export function mountApp(root, store) {
  let state = store.getState();
  let drag = null;

  function render() {
    const { grid, resolvedIslands } = getResolvedContext(root, store, state);
    root.innerHTML = renderApp(state, resolvedIslands, grid);
  }

  store.subscribe((nextState) => {
    state = nextState;
    render();
  });

  globalThis.addEventListener("resize", () => {
    render();
  });

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    switch (button.dataset.action) {
      case "focus-home":
        break;
      case "open-island":
        store.openIsland(button.dataset.islandKind, state.selectedCreatureId, getWorkspaceWidth(root));
        break;
      case "toggle-island":
        store.toggleIslandExpanded(button.dataset.islandId, getWorkspaceWidth(root));
        break;
      case "close-island":
        store.closeIsland(button.dataset.islandId);
        break;
      case "normalize-layout":
        store.autoArrangeIslands(getWorkspaceWidth(root));
        break;
      case "import-selection":
        await store.importSelection();
        break;
      case "focus-creature":
        await store.focusCreature(button.dataset.creatureId);
        break;
      case "set-turn":
        store.setActiveTurnCreature(button.dataset.creatureId);
        break;
      case "center-creature":
        await store.centerOnCreature(button.dataset.creatureId);
        break;
      case "adjust-hp":
        await store.adjustHp(button.dataset.itemId, Number(button.dataset.delta || 0));
        break;
      case "toggle-condition":
        await store.toggleCondition(button.dataset.itemId, button.dataset.conditionKey);
        break;
      case "roll-initiative":
        await store.rollInitiative(button.dataset.creatureId);
        break;
      case "roll-attack":
        await store.performAttack(
          button.dataset.itemId,
          button.dataset.entryId,
          state.targetCreatureId
        );
        break;
      case "cast-spell": {
        const island = button.closest(".island");
        const castLevel = Number(island?.querySelector(".js-cast-level")?.value || 0);
        await store.performSpell(
          button.dataset.itemId,
          button.dataset.entryId,
          state.targetCreatureId,
          { castLevel }
        );
        break;
      }
      case "clear-log":
        store.clearLog();
        break;
      default:
        break;
    }
  });

  root.addEventListener("change", async (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
      if (target instanceof HTMLInputElement && target.dataset.portraitUpload === "true") {
        const file = target.files?.[0];
        if (file) {
          const dataUrl = await readFileAsDataUrl(file);
          await store.patchField(target.dataset.itemId, "portraitUrl", dataUrl);
          target.value = "";
        }
        return;
      }

      if (target.dataset.targetSelect === "true") {
        store.setTargetCreature(target.value);
      }
    }
  });

  root.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, input, select, textarea, a, label")) {
      return;
    }

    const handle = event.target.closest("[data-drag-handle]");
    if (!handle || globalThis.matchMedia("(max-width: 980px)").matches) {
      return;
    }

    const island = handle.closest(".island");
    if (!island) {
      return;
    }

    drag = {
      islandId: island.dataset.islandId,
      startX: event.clientX,
      startY: event.clientY,
      element: island,
    };
    island.classList.add("is-dragging");
    event.preventDefault();
  });

  globalThis.addEventListener("pointermove", (event) => {
    if (!drag) {
      return;
    }
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    drag.element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  });

  globalThis.addEventListener("pointerup", (event) => {
    if (!drag) {
      return;
    }
    const drop = getDropPosition(root, event.clientX, event.clientY);
    store.moveIsland(drag.islandId, drop.col, drop.row, getWorkspaceWidth(root));
    drag = null;
  });

  render();
}
