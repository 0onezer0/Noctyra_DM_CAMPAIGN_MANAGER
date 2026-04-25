# Campaign Codex

`Campaign Codex` is an Owlbear Rodeo extension starter for DMs who want a modular combat dashboard made of movable mini-windows.

The current build focuses on:

- Tracking a creature's stats directly on its Owlbear token metadata so HP, AC, initiative, conditions, actions, spells, and notes stay synced in real time.
- Opening panel "islands" like `Overview`, `Stats`, `Combat`, `Spellbook`, `Conditions`, `Relations`, `Initiative`, and `Roll Log`.
- Uploading custom portraits, showing class sigils, and keeping inline HP bars visible even when a full overview panel is closed.
- Rolling attack checks, spell attacks, and saving throws with automatic hit checks against the current target's AC.
- Applying basic immunity, resistance, and vulnerability adjustments when attack or spell damage lands.
- Scaling attacks and spells by level thresholds, tracking spell slots, and supporting spell upcasts.
- Pasting a 5e statblock into the overview parser to autofill core combat data and action entries.

## Files

- `manifest.json`: Owlbear Rodeo extension manifest.
- `background.js`: registers a token context-menu shortcut so selected tokens can be tracked quickly.
- `index.html` + `styles.css`: dashboard shell and styling.
- `src/`: no-build JavaScript modules for state, UI, Owlbear loading, statblock parsing, and sample preview mode.

## Run Locally

This workspace could not execute a normal Node/npm toolchain, so the extension is intentionally set up as a static no-build site.

From this folder:

```powershell
python -m http.server 5173
```

Then in Owlbear Rodeo:

1. Open your profile.
2. Add a custom extension using `http://localhost:5173/manifest.json`.
3. Enable the extension in your room.
4. Select one or more tokens and either:
   - click `Import Selected` inside the extension, or
   - right-click a token and choose `Track in Campaign Codex`.

## Important Note

The Owlbear Rodeo docs show the SDK being consumed from npm in a bundled project. Because npm was not usable in this environment, this starter tries to load the SDK through a CDN first and falls back to a local preview roster if Owlbear is unavailable.

If Owlbear's iframe CSP blocks CDN module loading in your room, the next step is to bundle `@owlbear-rodeo/sdk` locally with Vite and keep the same app structure.

## Sources

- Owlbear Rodeo getting started: https://docs.owlbear.rodeo/extensions/getting-started/
- Manifest reference: https://docs.owlbear.rodeo/extensions/reference/manifest/
- Action API: https://docs.owlbear.rodeo/extensions/apis/action/
- Context menu API: https://docs.owlbear.rodeo/extensions/apis/context-menu/
- Scene items API: https://docs.owlbear.rodeo/extensions/apis/scene/items/
- Metadata reference: https://docs.owlbear.rodeo/extensions/reference/metadata/
- Theme API: https://docs.owlbear.rodeo/extensions/apis/theme
- Player API: https://docs.owlbear.rodeo/extensions/apis/player/
- Install tutorial: https://docs.owlbear.rodeo/extensions/tutorial-hello-world/install-your-extension
