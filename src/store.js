import {
  ABILITY_KEYS,
  DEFAULT_THEME,
  LAYOUT_KEY,
  SHEET_KEY,
} from "./constants.js";
import {
  buildResolvedIslands,
  createIslandLayoutItem,
  normalizeLayout,
  normalizeLayoutItem,
  resolveGridMetrics,
} from "./island-system.js";
import { ISLAND_REGISTRY, createDefaultDesktopLayout } from "./island-registry.js";
import {
  abilityModifier,
  applyDamageAdjustments,
  buildScaledDamageExpression,
  clone,
  createId,
  createStarterSheet,
  getItemLabel,
  normalizeSheet,
  parseStatblock,
  rollD20,
  rollDiceExpression,
  toSigned,
} from "./sheet.js";
import { whenObrReady } from "./obr-loader.js";

const DEFAULT_VIEWPORT_WIDTH = 1440;

function safeCall(fn, fallback) {
  return Promise.resolve()
    .then(fn)
    .catch(() => fallback);
}

function sortCreatures(left, right) {
  if (right.sheet.initiative !== left.sheet.initiative) {
    return right.sheet.initiative - left.sheet.initiative;
  }
  return left.sheet.name.localeCompare(right.sheet.name);
}

function countRemainingSlots(sheet, level) {
  const slot = sheet.spellSlots?.[level];
  if (!slot) {
    return null;
  }
  return Math.max(0, slot.total - slot.used);
}

function setByPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    cursor[key] ??= {};
    cursor = cursor[key];
  }
  cursor[parts.at(-1)] = value;
}

function getColumnsForWidth(workspaceWidth = DEFAULT_VIEWPORT_WIDTH) {
  return resolveGridMetrics(workspaceWidth).columns;
}

function loadIslands() {
  try {
    const raw = globalThis.localStorage?.getItem(LAYOUT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const islands = parsed
      .map((item) => normalizeLayoutItem(item, ISLAND_REGISTRY[item?.kind]))
      .filter(Boolean);
    return normalizeLayout(islands, ISLAND_REGISTRY, { columns: getColumnsForWidth() });
  } catch {
    return null;
  }
}

function saveIslands(islands) {
  try {
    globalThis.localStorage?.setItem(LAYOUT_KEY, JSON.stringify(islands));
  } catch {
    // Ignore storage failures in restricted browsing modes.
  }
}

export function createCampaignStore({ OBR, isImage, demoMode }) {
  const listeners = new Set();
  const storedIslands = loadIslands();

  let state = {
    ready: false,
    role: "GM",
    theme: clone(DEFAULT_THEME),
    sceneReady: demoMode,
    demoMode,
    creatures: [],
    selectedCreatureId: null,
    targetCreatureId: null,
    activeTurnCreatureId: null,
    islands: storedIslands || [],
    hasSavedLayout: Boolean(storedIslands),
    rollLog: [],
  };

  function emit() {
    const snapshot = clone(state);
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function persistIslands() {
    saveIslands(state.islands);
  }

  function getCreature(itemId) {
    return state.creatures.find((creature) => creature.itemId === itemId) || null;
  }

  function getIslandTarget(kind, creatureId = state.selectedCreatureId) {
    const spec = ISLAND_REGISTRY[kind];
    if (!spec) {
      return null;
    }
    if (spec.scope === "global") {
      return null;
    }
    return creatureId || null;
  }

  function normalizeIslands(nextIslands, workspaceWidth = DEFAULT_VIEWPORT_WIDTH) {
    return normalizeLayout(nextIslands, ISLAND_REGISTRY, {
      columns: getColumnsForWidth(workspaceWidth),
    });
  }

  function pushLog(text) {
    state = {
      ...state,
      rollLog: [
        { id: createId("log"), text, timestamp: new Date().toISOString() },
        ...state.rollLog,
      ].slice(0, 40),
    };
    emit();
  }

  async function notify(message) {
    try {
      await OBR.notification.show(message);
    } catch {
      // Ignore notifications if unavailable.
    }
  }

  function refreshFromItems(items) {
    const creatures = items
      .filter((item) => item?.metadata)
      .map((item) => {
        const rawSheet = item.metadata?.[SHEET_KEY];
        if (!rawSheet) {
          return null;
        }
        const sheet = normalizeSheet(rawSheet, item);
        return {
          itemId: item.id,
          item,
          name: sheet.name || getItemLabel(item),
          portraitUrl: sheet.portraitUrl || "",
          sheet,
          hpPercent: sheet.hp.max ? Math.round((sheet.hp.current / sheet.hp.max) * 100) : 0,
          activeConditions: Object.entries(sheet.conditions)
            .filter(([, active]) => active)
            .map(([condition]) => condition),
        };
      })
      .filter(Boolean)
      .sort(sortCreatures);

    const selectedCreatureId =
      state.selectedCreatureId && creatures.some((creature) => creature.itemId === state.selectedCreatureId)
        ? state.selectedCreatureId
        : creatures[0]?.itemId || null;

    const targetCreatureId =
      state.targetCreatureId && creatures.some((creature) => creature.itemId === state.targetCreatureId)
        ? state.targetCreatureId
        : selectedCreatureId;

    const activeTurnCreatureId =
      state.activeTurnCreatureId && creatures.some((creature) => creature.itemId === state.activeTurnCreatureId)
        ? state.activeTurnCreatureId
        : creatures[0]?.itemId || selectedCreatureId;

    let islands = state.islands.filter(
      (island) =>
        island.creatureId === null ||
        creatures.some((creature) => creature.itemId === island.creatureId)
    );

    let hasSavedLayout = state.hasSavedLayout;
    if (!hasSavedLayout && islands.length === 0 && creatures.length > 0) {
      islands = normalizeIslands(
        createDefaultDesktopLayout({
          creatures,
          selectedCreatureId,
        }),
        DEFAULT_VIEWPORT_WIDTH
      );
      hasSavedLayout = true;
    } else if (islands.length) {
      islands = normalizeIslands(islands, DEFAULT_VIEWPORT_WIDTH);
    }

    state = {
      ...state,
      creatures,
      selectedCreatureId,
      targetCreatureId,
      activeTurnCreatureId,
      islands,
      hasSavedLayout,
    };
    persistIslands();
    emit();
  }

  async function refreshItems() {
    if (!state.sceneReady && !demoMode) {
      refreshFromItems([]);
      return;
    }
    const items = await OBR.scene.items.getItems();
    refreshFromItems(items);
  }

  async function mutateSheet(itemId, mutator) {
    await OBR.scene.items.updateItems([itemId], (items) => {
      for (const item of items) {
        item.metadata ??= {};
        const draft = clone(normalizeSheet(item.metadata[SHEET_KEY], item));
        const result = mutator(draft, item);
        item.metadata[SHEET_KEY] = normalizeSheet(result ?? draft, item);
      }
    });
  }

  async function patchField(itemId, path, value) {
    await mutateSheet(itemId, (draft) => {
      if (path.startsWith("stats.")) {
        const ability = path.split(".")[1];
        const oldMod = abilityModifier(draft.stats[ability]);
        setByPath(draft, path, value);
        if (draft.saves[ability] === oldMod) {
          draft.saves[ability] = abilityModifier(value);
        }
        return draft;
      }
      setByPath(draft, path, value);
      return draft;
    });
  }

  async function patchListField(itemId, listName, entryId, field, value) {
    await mutateSheet(itemId, (draft) => {
      const entry = draft[listName]?.find((candidate) => candidate.id === entryId);
      if (entry) {
        entry[field] = value;
      }
      return draft;
    });
  }

  async function addListEntry(itemId, listName) {
    const templates = {
      attacks: {
        id: createId("attack"),
        name: "New Attack",
        toHit: 0,
        damage: "1d6",
        damageType: "bludgeoning",
        levelScaleAt: "",
        levelScaleDamage: "",
        notes: "",
      },
      actions: {
        id: createId("action"),
        name: "New Action",
        saveAbility: "str",
        saveDc: 10,
        description: "",
      },
      spells: {
        id: createId("spell"),
        name: "New Spell",
        level: 1,
        attackBonus: 0,
        saveAbility: "",
        saveDc: 0,
        damage: "",
        damageType: "",
        levelScaleAt: "",
        levelScaleDamage: "",
        upcastDamage: "",
        halfOnSave: false,
        description: "",
      },
      relationships: {
        id: createId("bond"),
        name: "New Relationship",
        bond: "",
        notes: "",
      },
    };

    await mutateSheet(itemId, (draft) => {
      draft[listName] = [...(draft[listName] || []), clone(templates[listName])];
      return draft;
    });
  }

  async function removeListEntry(itemId, listName, entryId) {
    await mutateSheet(itemId, (draft) => {
      draft[listName] = (draft[listName] || []).filter((entry) => entry.id !== entryId);
      return draft;
    });
  }

  function openIsland(kind, creatureId = state.selectedCreatureId, workspaceWidth = DEFAULT_VIEWPORT_WIDTH) {
    const spec = ISLAND_REGISTRY[kind];
    if (!spec) {
      return;
    }

    const targetId = getIslandTarget(kind, creatureId);
    if (spec.scope === "creature" && !targetId) {
      return;
    }

    const existing = state.islands.find(
      (island) => island.kind === kind && island.creatureId === targetId
    );
    if (existing) {
      return;
    }

    const island = createIslandLayoutItem(kind, targetId, ISLAND_REGISTRY, {
      id: createId("island"),
      col: 1,
      row: 1,
      span: spec.defaultSpan,
    });

    if (!island) {
      return;
    }

    state = {
      ...state,
      islands: normalizeIslands([...state.islands, island], workspaceWidth),
      hasSavedLayout: true,
    };
    persistIslands();
    emit();
  }

  function closeIsland(islandId) {
    state = {
      ...state,
      islands: normalizeIslands(state.islands.filter((island) => island.id !== islandId)),
      hasSavedLayout: true,
    };
    persistIslands();
    emit();
  }

  function toggleIslandExpanded(islandId, workspaceWidth = DEFAULT_VIEWPORT_WIDTH) {
    state = {
      ...state,
      islands: normalizeIslands(
        state.islands.map((island) => {
          if (island.id !== islandId) {
            return island;
          }
          const spec = ISLAND_REGISTRY[island.kind];
          const nextSpan =
            island.span === spec.expandedSpan ? spec.defaultSpan : spec.expandedSpan;
          return {
            ...island,
            span: nextSpan,
          };
        }),
        workspaceWidth
      ),
      hasSavedLayout: true,
    };
    persistIslands();
    emit();
  }

  function autoArrangeIslands(workspaceWidth = DEFAULT_VIEWPORT_WIDTH) {
    state = {
      ...state,
      islands: normalizeIslands(state.islands, workspaceWidth),
      hasSavedLayout: true,
    };
    persistIslands();
    emit();
  }

  function moveIsland(islandId, col, row, workspaceWidth = DEFAULT_VIEWPORT_WIDTH) {
    state = {
      ...state,
      islands: normalizeIslands(
        state.islands.map((island) =>
          island.id === islandId
            ? {
                ...island,
                col: Math.max(1, Math.round(col)),
                row: Math.max(1, Math.round(row)),
              }
            : island
        ),
        workspaceWidth
      ),
      hasSavedLayout: true,
    };
    persistIslands();
    emit();
  }

  async function importSelection() {
    const selection = await OBR.player.getSelection();
    if (!selection?.length) {
      await notify("Select one or more tokens first.");
      return;
    }

    await OBR.scene.items.updateItems(selection, (items) => {
      for (const item of items) {
        item.metadata ??= {};
        const current = item.metadata[SHEET_KEY];
        item.metadata[SHEET_KEY] = normalizeSheet(current ?? createStarterSheet(item), item);
      }
    });

    state = {
      ...state,
      selectedCreatureId: selection[0],
      targetCreatureId: selection[0],
      activeTurnCreatureId: selection[0],
    };
    emit();
    openIsland("entity-overview", selection[0], DEFAULT_VIEWPORT_WIDTH);
    await notify(`Imported ${selection.length} token${selection.length === 1 ? "" : "s"} into Campaign Codex.`);
  }

  async function focusCreature(itemId) {
    state = {
      ...state,
      selectedCreatureId: itemId,
      targetCreatureId: state.targetCreatureId || itemId,
    };
    emit();
    if (OBR.player.select) {
      await safeCall(() => OBR.player.select([itemId], true), undefined);
    }
  }

  function setTargetCreature(itemId) {
    state = { ...state, targetCreatureId: itemId || null };
    emit();
  }

  function setActiveTurnCreature(itemId) {
    state = { ...state, activeTurnCreatureId: itemId || null };
    emit();
  }

  async function centerOnCreature(itemId) {
    await safeCall(async () => {
      const bounds = await OBR.scene.items.getItemBounds([itemId]);
      await OBR.viewport.animateToBounds(bounds);
    }, undefined);
  }

  async function adjustHp(itemId, delta, silent = false) {
    const creature = getCreature(itemId);
    if (!creature) {
      return;
    }

    await mutateSheet(itemId, (draft) => {
      if (delta < 0) {
        let incomingDamage = Math.abs(delta);
        const absorbedByTemp = Math.min(draft.hp.temp, incomingDamage);
        draft.hp.temp -= absorbedByTemp;
        incomingDamage -= absorbedByTemp;
        draft.hp.current = Math.max(0, draft.hp.current - incomingDamage);
        return draft;
      }

      draft.hp.current = Math.max(0, Math.min(draft.hp.current + delta, draft.hp.max));
      return draft;
    });

    if (!silent) {
      const verb = delta >= 0 ? "heals" : "takes";
      pushLog(`${creature.sheet.name} ${verb} ${Math.abs(delta)} HP.`);
    }
  }

  async function consumeSpellSlot(itemId, slotLevel) {
    const creature = getCreature(itemId);
    if (!creature || slotLevel <= 0) {
      return { ok: true, tracked: false };
    }

    const remaining = countRemainingSlots(creature.sheet, slotLevel);
    if (remaining === null) {
      return { ok: true, tracked: false };
    }

    if (remaining <= 0) {
      await notify(`${creature.sheet.name} has no level ${slotLevel} spell slots remaining.`);
      return { ok: false, tracked: true };
    }

    await mutateSheet(itemId, (draft) => {
      draft.spellSlots[slotLevel].used = Math.min(
        draft.spellSlots[slotLevel].total,
        draft.spellSlots[slotLevel].used + 1
      );
      return draft;
    });

    return { ok: true, tracked: true, remaining: remaining - 1 };
  }

  async function applyStatblockToCreature(itemId, source) {
    const creature = getCreature(itemId);
    if (!creature) {
      return;
    }

    const parsed = parseStatblock(source, creature.sheet);
    if (!parsed) {
      await notify("Paste a statblock first.");
      return;
    }

    await mutateSheet(itemId, (draft, item) =>
      normalizeSheet(
        {
          ...draft,
          ...parsed,
          hp: {
            ...draft.hp,
            ...(parsed.hp || {}),
          },
          stats: {
            ...draft.stats,
            ...(parsed.stats || {}),
          },
          saves: {
            ...draft.saves,
            ...(parsed.saves || {}),
          },
          attacks: parsed.attacks?.length ? parsed.attacks : draft.attacks,
          actions: parsed.actions?.length ? parsed.actions : draft.actions,
        },
        item
      )
    );

    pushLog(`${creature.sheet.name} was refreshed from a pasted statblock.`);
    await notify(`Imported statblock details for ${parsed.name || creature.sheet.name}.`);
  }

  async function toggleCondition(itemId, conditionKey) {
    const creature = getCreature(itemId);
    if (!creature) {
      return;
    }
    const nextValue = !creature.sheet.conditions[conditionKey];
    await mutateSheet(itemId, (draft) => {
      draft.conditions[conditionKey] = nextValue;
      return draft;
    });
    pushLog(`${creature.sheet.name} is now ${nextValue ? "" : "no longer "}${conditionKey}.`);
  }

  async function rollInitiative(itemId) {
    const creature = getCreature(itemId);
    if (!creature) {
      return;
    }

    const modifier = abilityModifier(creature.sheet.stats.dex);
    const roll = rollD20(modifier);
    await patchField(itemId, "initiative", roll.total);
    state = { ...state, activeTurnCreatureId: itemId };
    emit();
    pushLog(
      `${creature.sheet.name} rolls initiative: ${roll.die} ${toSigned(modifier)} = ${roll.total}.`
    );
  }

  async function performSave(itemId, ability, dc = null, label = "Saving throw", options = {}) {
    const creature = getCreature(itemId);
    if (!creature) {
      return;
    }

    const resolvedAbility = ABILITY_KEYS.includes(ability) ? ability : "con";
    const modifier =
      creature.sheet.saves[resolvedAbility] ??
      abilityModifier(creature.sheet.stats[resolvedAbility] || 10);
    const roll = rollD20(modifier);
    const resolvedDc = Number.isFinite(Number(dc)) && Number(dc) > 0 ? Number(dc) : null;
    let message = `${creature.sheet.name} rolls ${resolvedAbility.toUpperCase()} save for ${label}: ${roll.die} ${toSigned(modifier)} = ${roll.total}`;

    if (resolvedDc !== null) {
      const success = roll.critical || roll.total >= resolvedDc;
      message += success ? ` vs DC ${resolvedDc}, success.` : ` vs DC ${resolvedDc}, fail.`;

      if (options.damage) {
        const damageRoll = rollDiceExpression(options.damage);
        if (damageRoll.valid) {
          const baseDamage = success
            ? options.halfOnSave
              ? Math.floor(damageRoll.total / 2)
              : 0
            : damageRoll.total;
          const adjustment = applyDamageAdjustments(
            baseDamage,
            options.damageType,
            creature.sheet
          );
          if (adjustment.final > 0) {
            await adjustHp(itemId, -adjustment.final, true);
          }
          message += ` Damage: ${damageRoll.total}`;
          if (options.damageType) {
            message += ` ${options.damageType}`;
          }
          if (adjustment.effect !== "normal") {
            message += ` (${adjustment.effect})`;
          }
          message += adjustment.final !== damageRoll.total ? ` -> ${adjustment.final}.` : ".";
        }
      }
    } else {
      message += ".";
    }

    pushLog(message);
  }

  async function performAttack(attackerId, attackId, targetId) {
    const attacker = getCreature(attackerId);
    const target = getCreature(targetId);
    if (!attacker || !target) {
      await notify("Choose an attacker and a target first.");
      return;
    }

    const attack = attacker.sheet.attacks.find((entry) => entry.id === attackId);
    if (!attack) {
      return;
    }

    const roll = rollD20(attack.toHit);
    const hit = roll.critical || (!roll.fumble && roll.total >= target.sheet.ac);
    let message = `${attacker.sheet.name} attacks ${target.sheet.name} with ${attack.name}: ${roll.die} ${toSigned(
      attack.toHit
    )} = ${roll.total} vs AC ${target.sheet.ac} -> ${hit ? "hit" : "miss"}.`;

    if (hit && attack.damage) {
      const scaledDamage = buildScaledDamageExpression(attack, attacker.sheet.level);
      const damageRoll = rollDiceExpression(scaledDamage);
      if (damageRoll.valid) {
        const adjustment = applyDamageAdjustments(
          damageRoll.total,
          attack.damageType,
          target.sheet
        );
        if (adjustment.final > 0) {
          await adjustHp(targetId, -adjustment.final, true);
        }
        message += ` Damage ${damageRoll.total}`;
        if (attack.damageType) {
          message += ` ${attack.damageType}`;
        }
        if (scaledDamage && scaledDamage !== attack.damage) {
          message += ` [${scaledDamage}]`;
        }
        if (adjustment.effect !== "normal") {
          message += ` (${adjustment.effect})`;
        }
        message += adjustment.final !== damageRoll.total ? ` -> ${adjustment.final}.` : ".";
      }
    }

    pushLog(message);
  }

  async function performAction(attackerId, actionId, targetId) {
    const attacker = getCreature(attackerId);
    const target = getCreature(targetId);
    if (!attacker || !target) {
      await notify("Choose a target before resolving the action.");
      return;
    }

    const action = attacker.sheet.actions.find((entry) => entry.id === actionId);
    if (!action) {
      return;
    }

    await performSave(targetId, action.saveAbility, action.saveDc, `${attacker.sheet.name}: ${action.name}`);
  }

  async function performSpell(casterId, spellId, targetId, options = {}) {
    const caster = getCreature(casterId);
    const target = getCreature(targetId);
    if (!caster || !target) {
      await notify("Choose a target before casting.");
      return;
    }

    const spell = caster.sheet.spells.find((entry) => entry.id === spellId);
    if (!spell) {
      return;
    }

    const resolvedCastLevel =
      spell.level > 0 ? Math.max(spell.level, options?.castLevel || spell.level) : 0;

    if (resolvedCastLevel > 0) {
      const slotUsage = await consumeSpellSlot(casterId, resolvedCastLevel);
      if (!slotUsage.ok) {
        return;
      }
    }

    if (!spell.attackBonus && !spell.saveAbility) {
      pushLog(
        `${caster.sheet.name} casts ${spell.name}${
          resolvedCastLevel ? ` at level ${resolvedCastLevel}` : ""
        }. ${spell.description || "No mechanics recorded yet."}`
      );
      return;
    }

    const scaledDamage = buildScaledDamageExpression(spell, caster.sheet.level, resolvedCastLevel);

    if (spell.attackBonus) {
      const roll = rollD20(spell.attackBonus);
      const hit = roll.critical || (!roll.fumble && roll.total >= target.sheet.ac);
      let message = `${caster.sheet.name} casts ${spell.name} at ${target.sheet.name}: ${roll.die} ${toSigned(
        spell.attackBonus
      )} = ${roll.total} vs AC ${target.sheet.ac} -> ${hit ? "hit" : "miss"}.`;

      if (resolvedCastLevel > 0) {
        message = `${caster.sheet.name} casts ${spell.name} (level ${resolvedCastLevel}) at ${target.sheet.name}: ${roll.die} ${toSigned(
          spell.attackBonus
        )} = ${roll.total} vs AC ${target.sheet.ac} -> ${hit ? "hit" : "miss"}.`;
      }

      if (hit && scaledDamage) {
        const damageRoll = rollDiceExpression(scaledDamage);
        if (damageRoll.valid) {
          const adjustment = applyDamageAdjustments(
            damageRoll.total,
            spell.damageType,
            target.sheet
          );
          if (adjustment.final > 0) {
            await adjustHp(targetId, -adjustment.final, true);
          }
          message += ` Damage ${damageRoll.total}`;
          if (spell.damageType) {
            message += ` ${spell.damageType}`;
          }
          if (scaledDamage !== spell.damage) {
            message += ` [${scaledDamage}]`;
          }
          if (adjustment.effect !== "normal") {
            message += ` (${adjustment.effect})`;
          }
          message += adjustment.final !== damageRoll.total ? ` -> ${adjustment.final}.` : ".";
        }
      }

      pushLog(message);
      return;
    }

    const label = `${caster.sheet.name}: ${spell.name}${
      resolvedCastLevel > 0 ? ` (level ${resolvedCastLevel})` : ""
    }`;

    await performSave(targetId, spell.saveAbility, spell.saveDc, label, {
      damage: scaledDamage,
      damageType: spell.damageType,
      halfOnSave: spell.halfOnSave,
    });
  }

  function clearLog() {
    state = { ...state, rollLog: [] };
    emit();
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(clone(state));
    return () => listeners.delete(listener);
  }

  async function init() {
    await whenObrReady(OBR);

    const [role, theme, sceneReady] = await Promise.all([
      safeCall(() => OBR.player.getRole(), "GM"),
      safeCall(() => OBR.theme.getTheme(), clone(DEFAULT_THEME)),
      safeCall(() => OBR.scene.isReady(), demoMode),
    ]);

    state = {
      ...state,
      ready: true,
      role,
      theme,
      sceneReady,
    };
    emit();

    await safeCall(() => OBR.action.setWidth(1220), undefined);
    await safeCall(() => OBR.action.setHeight(860), undefined);

    OBR.theme.onChange((nextTheme) => {
      state = { ...state, theme: nextTheme || clone(DEFAULT_THEME) };
      emit();
    });

    OBR.player.onChange((player) => {
      state = { ...state, role: player?.role || state.role };
      emit();
    });

    OBR.scene.onReadyChange(async (ready) => {
      state = { ...state, sceneReady: ready };
      emit();
      if (ready) {
        await refreshItems();
      } else {
        refreshFromItems([]);
      }
    });

    OBR.scene.items.onChange((items) => {
      refreshFromItems(items);
    });

    await refreshItems();
  }

  return {
    subscribe,
    init,
    openIsland,
    closeIsland,
    moveIsland,
    toggleIslandExpanded,
    autoArrangeIslands,
    importSelection,
    focusCreature,
    setTargetCreature,
    setActiveTurnCreature,
    centerOnCreature,
    patchField,
    patchListField,
    addListEntry,
    removeListEntry,
    adjustHp,
    toggleCondition,
    rollInitiative,
    applyStatblockToCreature,
    performAttack,
    performAction,
    performSpell,
    performSave,
    clearLog,
    getResolvedIslands(viewportWidth = DEFAULT_VIEWPORT_WIDTH) {
      return buildResolvedIslands(state.islands, ISLAND_REGISTRY, state, viewportWidth);
    },
    openPanel(type, creatureId, workspaceWidth) {
      const legacyMap = {
        overview: "entity-overview",
        initiative: "turn-order",
        combat: "battle-readout",
        spellbook: "spellbook",
        stats: "stat-constellation",
        conditions: "condition-lane",
        relations: "relation-orbit",
        log: "roll-log",
      };
      openIsland(legacyMap[type] || type, creatureId, workspaceWidth);
    },
    closePanel(panelId) {
      closeIsland(panelId);
    },
    movePanel(panelId, col, row, workspaceWidth) {
      moveIsland(panelId, col, row, workspaceWidth);
    },
    togglePanelExpanded(panelId, workspaceWidth) {
      toggleIslandExpanded(panelId, workspaceWidth);
    },
    autoArrangePanels(workspaceWidth) {
      autoArrangeIslands(workspaceWidth);
    },
    getState() {
      return clone(state);
    },
  };
}
