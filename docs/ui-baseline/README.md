# Command Center UI baseline

Captured before the cinematic dashboard redesign.

## Guardrails

- Preserve simulation, economy, missions, saves, and progression behavior.
- Keep all five primary scenes and every management drill reachable.
- Preserve keyboard controls, modal focus behavior, zoom/pan, time controls, timeline filters, and UI scaling.
- Edit `src/` only, then regenerate build artifacts with `node build.js`.

## Required entry points

- Top HUD: company/era, date, time controls, capital, reputation, flights, support, conditional stats, settings, collapse.
- Navigation: Command Center, Design Bench, R&D, Solar System, Station Bench, notification badges.
- Center: summary strip, Cape hotspots, zoom/pan/reset, Cape pop-out, program timeline.
- Right side: Mission Control, Flight Plan, Objectives, Contracts, outliner/next event, Rivals, Finances, Chronicle, news.
- Timeline: category filters, collapse state, event navigation, horizontal scroll, live updates.
- Modals/hotkeys: save/load/import/export/new game, management drills, Esc/Enter behavior, focus trapping and restoration.

## Test baseline

- 41 suites executed.
- 40 suites passed.
- `test-station-slice2.js`: 24/28, with four existing Mars deferred-flight/module-docking failures.
- `test-progress-unify.js`: skipped by its existing feature flag.

## Screenshots

- `command-1920x1080.png`
- `command-1536x1024.png`
- `command-1366x768.png`
- `command-1280x800.png`
