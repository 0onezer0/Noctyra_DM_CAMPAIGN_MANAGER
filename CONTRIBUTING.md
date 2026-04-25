# Contributing to Noctyra DM Campaign Manager

Thanks for helping improve the project.

## Before You Start

- Check existing issues first.
- If the change is large, open an issue before implementing it.
- Prefer small, reviewable pull requests over large mixed changes.

## Setup

This repo currently runs as a static project instead of a bundled app.

Start a local preview server from the repo root:

```powershell
python -m http.server 5173
```

Use:

- `http://127.0.0.1:4173/index.html` for the local UI preview
- `http://localhost:5173/manifest.json` for Owlbear installation

## Contribution Priorities

High-value areas:

- Owlbear runtime integration and sync behavior
- Compact island layouts and responsive fixes
- Better statblock parsing coverage
- Combat automation quality
- UX improvements for DMs during live sessions
- Accessibility, keyboard support, and readability

## Code Guidelines

- Keep the project no-build unless a change clearly requires a build step.
- Preserve the modular island architecture.
- Prefer small reusable helpers over repeated inline logic.
- Avoid broad visual rewrites unless the PR is specifically about design.
- Keep comments short and useful.
- Do not commit temporary screenshots, local profiles, or debug logs.

## Pull Requests

Please include:

- A short summary of the problem
- What changed
- Any tradeoffs or follow-up work
- Screenshots for UI changes
- Notes about how you tested it

If you changed interaction behavior, describe:

- what the old behavior was
- what the new behavior is
- any known edge cases still left

## Reporting Bugs

Useful bug reports include:

- What you expected
- What actually happened
- Steps to reproduce
- Browser and OS details
- Owlbear room/runtime context if relevant
- Screenshots or recordings when possible

## Design and UX Changes

For layout, styling, and workflow updates:

- explain the DM use case
- mention whether the change targets desktop, tablet, or mobile
- include before/after screenshots if possible

## Scope

Good first contributions:

- text clipping or layout bugs
- island spacing and wrapping fixes
- parser improvements for common 5e statblocks
- accessibility refinements
- clearer empty states and helper copy

## Questions

If something is unclear, open an issue and ask before building a large solution.
