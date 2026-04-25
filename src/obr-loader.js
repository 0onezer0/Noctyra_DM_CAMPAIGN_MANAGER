import { createMockSdk } from "./mock-obr.js";

const CDN_URL = "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3.1.0/+esm";

function isStandalonePreview() {
  try {
    return globalThis.window?.top === globalThis.window?.self;
  } catch {
    return false;
  }
}

export async function whenObrReady(OBR) {
  if (!OBR) {
    return;
  }

  if (OBR.isReady) {
    return;
  }

  await new Promise((resolve) => {
    const unsubscribe = OBR.onReady(() => {
      unsubscribe?.();
      resolve();
    });
  });
}

export async function loadSdk() {
  if (isStandalonePreview()) {
    return createMockSdk();
  }

  if (globalThis.OBR) {
    return {
      OBR: globalThis.OBR,
      isImage: (item) => item?.type === "IMAGE",
      demoMode: false,
    };
  }

  try {
    const module = await import(CDN_URL);
    return {
      OBR: module.default,
      isImage: module.isImage || ((item) => item?.type === "IMAGE"),
      demoMode: false,
    };
  } catch (error) {
    console.warn("Campaign Codex could not load the Owlbear SDK. Falling back to demo mode.", error);
    return createMockSdk();
  }
}
