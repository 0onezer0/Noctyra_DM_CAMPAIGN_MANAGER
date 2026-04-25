import { DEFAULT_THEME } from "./constants.js";
import { clone, createSampleItems } from "./sheet.js";

function filterItems(items, filterOrItems) {
  if (!filterOrItems) {
    return items;
  }

  if (typeof filterOrItems === "function") {
    return items.filter(filterOrItems);
  }

  if (Array.isArray(filterOrItems)) {
    const ids = new Set(
      filterOrItems.map((entry) => (typeof entry === "string" ? entry : entry?.id)).filter(Boolean)
    );
    return items.filter((item) => ids.has(item.id));
  }

  return items;
}

export function createMockSdk() {
  let items = createSampleItems();
  let selection = [items[0]?.id].filter(Boolean);
  let theme = clone(DEFAULT_THEME);

  const itemListeners = new Set();
  const playerListeners = new Set();
  const themeListeners = new Set();
  const sceneListeners = new Set();

  function emitItems() {
    const snapshot = clone(items);
    for (const listener of itemListeners) {
      listener(snapshot);
    }
  }

  function emitPlayer() {
    const payload = {
      role: "GM",
      selection: clone(selection),
    };
    for (const listener of playerListeners) {
      listener(payload);
    }
  }

  return {
    demoMode: true,
    isImage: (item) => item?.type === "IMAGE",
    OBR: {
      isAvailable: false,
      isReady: true,
      onReady(callback) {
        queueMicrotask(callback);
        return () => {};
      },
      action: {
        async setWidth() {},
        async setHeight() {},
      },
      notification: {
        async show(message) {
          console.info(`[Campaign Codex demo] ${message}`);
        },
      },
      theme: {
        async getTheme() {
          return clone(theme);
        },
        onChange(callback) {
          themeListeners.add(callback);
          return () => themeListeners.delete(callback);
        },
      },
      player: {
        id: "demo-gm",
        async getRole() {
          return "GM";
        },
        async getSelection() {
          return clone(selection);
        },
        async select(nextSelection, replace = true) {
          const incoming = nextSelection.map((entry) =>
            typeof entry === "string" ? entry : entry?.id
          );
          selection = replace
            ? incoming.filter(Boolean)
            : Array.from(new Set([...selection, ...incoming.filter(Boolean)]));
          emitPlayer();
        },
        onChange(callback) {
          playerListeners.add(callback);
          return () => playerListeners.delete(callback);
        },
      },
      scene: {
        async isReady() {
          return true;
        },
        onReadyChange(callback) {
          queueMicrotask(() => callback(true));
          sceneListeners.add(callback);
          return () => sceneListeners.delete(callback);
        },
        items: {
          async getItems(filterOrItems) {
            return clone(filterItems(items, filterOrItems));
          },
          async updateItems(filterOrItems, update) {
            const subset = clone(filterItems(items, filterOrItems));
            update(subset);
            const byId = new Map(subset.map((item) => [item.id, item]));
            items = items.map((item) => byId.get(item.id) || item);
            emitItems();
          },
          async getItemBounds() {
            return { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
          },
          onChange(callback) {
            itemListeners.add(callback);
            queueMicrotask(() => callback(clone(items)));
            return () => itemListeners.delete(callback);
          },
        },
      },
      viewport: {
        async animateToBounds() {},
      },
      contextMenu: {
        async create() {},
      },
    },
  };
}
