# Noctyra DM Campaign Manager

`Noctyra DM Campaign Manager` is an Owlbear Rodeo extension project for Dungeon Masters who want a modular campaign and combat dashboard built from movable, adaptive islands.

The current prototype is focused on fast encounter management:

- Track creature and player data directly from Owlbear token metadata.
- Open modular islands like `Overview`, `Stats`, `Combat`, `Spellbook`, `Conditions`, `Relations`, `Turn Order`, and `Roll Log`.
- Keep portraits, class marks, HP, AC, initiative, and conditions visible in compact layouts.
- Roll attacks, spell attacks, and saves with target-aware hit logic.
- Apply basic immunity, resistance, and vulnerability adjustments when damage lands.
- Scale attacks and spells by level thresholds, support upcasting, and track spell slots.
- Parse a 5e statblock into creature data to accelerate setup.
- Preview the UI locally in demo mode without needing Owlbear active.

## Project Status

This is an active prototype.

What already works:

- Static local preview
- Adaptive bento-island dashboard layout
- Token-backed creature tracking structure
- Portrait upload and class icon support
- Combat, conditions, spell slot, and roll-log foundations
- Statblock parsing for fast data entry

What still needs improvement:

- Deeper Owlbear Rodeo runtime validation
- Better drag/snap/group behaviors between islands
- More robust parser coverage for varied statblock formats
- Cleaner compact layouts and responsive polish
- Broader rules automation and richer combat flows

## Run Locally

This project is intentionally set up as a static no-build site.

From the project folder:

```powershell
python -m http.server 5173
```

Then open:

- Preview mode: `http://127.0.0.1:4173/index.html`
- Owlbear manifest: `http://127.0.0.1:5173/manifest.json`

To install in Owlbear Rodeo:

1. Open your Owlbear Rodeo profile.
2. Add a custom extension using `http://localhost:5173/manifest.json`.
3. Enable the extension in your room.
4. Select tokens and import them through the extension UI or context menu.

## Project Structure

- `manifest.json`: Owlbear Rodeo extension manifest
- `background.js`: token context-menu hook
- `index.html`: app shell entry
- `styles.css`: shared visual system and responsive layout
- `src/constants.js`: reference data and UI constants
- `src/island-registry.js`: island registry definitions
- `src/island-system.js`: adaptive layout and rendering rules
- `src/store.js`: app state and actions
- `src/ui.js`: island rendering and interaction wiring
- `src/sheet.js`: statblock parsing and creature sheet helpers
- `assets/class-icons/`: class PNG marks used in the UI

## Contributing

Contributions are welcome.

If you want to help:

1. Open an issue for bugs, UX problems, or feature ideas.
2. Fork the repo and create a focused branch.
3. Keep changes small and explain the why, not just the what.
4. Include screenshots or short recordings for UI changes when possible.
5. Open a pull request with clear notes about behavior changes and known gaps.

Start with [CONTRIBUTING.md](./CONTRIBUTING.md) for practical guidelines.
See [ROADMAP.md](./ROADMAP.md) for current priorities and good places to jump in.

## Good Contribution Areas

- Owlbear Rodeo integration fixes
- Layout and card-behavior polish
- Better statblock parsing
- Rules automation improvements
- Accessibility and mobile responsiveness
- Better DM workflow design
- Data validation and state syncing

## Known Constraints

- This repo currently avoids a full Node/Vite toolchain and runs as a static project.
- Some Owlbear SDK loading paths may eventually need to be bundled locally.
- Demo mode is useful for UI work, but it is not a substitute for live Owlbear testing.

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
