import { EXTENSION_ID, SHEET_KEY } from "./src/constants.js";
import { loadSdk, whenObrReady } from "./src/obr-loader.js";
import { createStarterSheet, normalizeSheet } from "./src/sheet.js";

async function main() {
  const sdk = await loadSdk();
  const { OBR, demoMode } = sdk;

  if (!OBR || demoMode) {
    return;
  }

  await whenObrReady(OBR);

  try {
    await OBR.contextMenu.create({
      id: `${EXTENSION_ID}/track-token`,
      icons: [
        {
          icon: "/icon.svg",
          label: "Track in Campaign Codex",
          filter: {
            min: 1,
            roles: ["GM"],
            every: [{ key: ["metadata", SHEET_KEY], value: undefined }],
          },
        },
      ],
      async onClick(context) {
        await OBR.scene.items.updateItems(context.items, (items) => {
          for (const item of items) {
            item.metadata ??= {};
            item.metadata[SHEET_KEY] = normalizeSheet(
              item.metadata[SHEET_KEY] ?? createStarterSheet(item),
              item
            );
          }
        });

        const suffix = context.items.length === 1 ? "" : "s";
        await OBR.notification.show(
          `Campaign Codex is now tracking ${context.items.length} token${suffix}.`
        );
      },
    });
  } catch (error) {
    console.error("Campaign Codex background failed to register.", error);
  }
}

main();
