# Roadmap

This file tracks the most useful next steps for `Noctyra DM Campaign Manager` so contributors can find good entry points quickly.

## Current Priorities

### 1. Owlbear Integration

- Validate the extension flow inside live Owlbear Rodeo rooms.
- Improve token import and metadata syncing between tokens and islands.
- Reduce drift between demo data and real Owlbear runtime data.
- Harden context-menu and selection behavior for multi-token workflows.

### 2. Island Layout System

- Improve snap-to-grid and island compaction rules.
- Refine compact, pill, and circle modes so text never feels cramped.
- Add clearer docking/group behavior between related islands.
- Polish responsive behavior for tablet and mobile widths.

### 3. Combat and Rules Automation

- Expand hit, save, damage, and condition automation.
- Improve spell slot handling, upcasting, and spell attack flows.
- Support more attack/stat scaling patterns from parsed statblocks.
- Add clearer feedback for immunities, resistances, and vulnerabilities.

### 4. Parser and Data Entry

- Support more 5e statblock variations and formatting quirks.
- Extract more structured actions, traits, spells, and senses.
- Make parse failures easier to diagnose and fix.
- Add safer manual correction tools after parsing.

## Good First Contributions

These are especially good places for new contributors to start:

- Fix a compact island where text still clips or wraps awkwardly.
- Improve one parser rule for a common 5e statblock variant.
- Add icons or UI polish for conditions and status chips.
- Tighten one combat flow such as attack resolution or saving throws.
- Improve README screenshots or contributor documentation.
- Test the extension in Owlbear and report exact integration gaps.

## Medium-Term Goals

- Better grouped island behavior for overview, combat, spellbook, and conditions.
- Cleaner visual hierarchy for the bento dashboard.
- Stronger initiative management and encounter pacing tools.
- Richer relationship, notes, and campaign context islands.
- Better local persistence and restoration of island layouts.

## Longer-Term Ideas

- Encounter presets and reusable creature templates.
- Campaign-level views for factions, quests, and recurring NPCs.
- Export/import tools for character or creature data.
- Optional rules modules for different DM preferences.
- More automated syncing between tabletop state and dashboard state.

## Contributor Notes

- If you want to pick something up, open an issue first or comment on an existing one.
- UI changes are easier to review when they include screenshots or a short recording.
- If you fix a parser or rules edge case, include the exact input that was failing.
