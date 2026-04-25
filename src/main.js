import { loadSdk } from "./obr-loader.js";
import { createCampaignStore } from "./store.js";
import { mountApp } from "./ui.js";

async function main() {
  const root = document.querySelector("#app");
  if (!root) {
    return;
  }

  const sdk = await loadSdk();
  const store = createCampaignStore({
    OBR: sdk.OBR,
    isImage: sdk.isImage,
    demoMode: sdk.demoMode,
  });

  mountApp(root, store);
  await store.init();
}

main();
