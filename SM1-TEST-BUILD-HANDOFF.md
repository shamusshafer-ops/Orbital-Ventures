# SM1 Test-Build Handoff — Viewport Size and Pop-out Layout

**Date:** 2026-07-25  
**Status:** `[T] TEST BUILD ONLY — browser-ready HTML produced; source port still required`

## What was completed in the test build

- `[T] SM1.1` Larger inline Solar System map.
  - Inline host no longer uses the legacy 980 px presentation cap.
  - Desktop map height targets approximately 620–760 px using a responsive clamp.
  - Roster and map tracks stretch together while the map track keeps `min-width:0`.
- `[T] SM1.2` Near-full-screen Solar System pop-out.
  - Map pop-out receives a dedicated `calc(100vw - 16px)` × `calc(100vh - 16px)` default.
  - Shared drag, resize, pin, fade, and close behaviors remain in use.
  - Nominal fallback dimensions were raised to 1600×900, but the live renderer uses measured host dimensions.
- `[T] SM1.3` Collapsible layout controls.
  - `Bodies` cycles Open → Compact → Hidden.
  - `Details` toggles Open/Hidden.
  - `Map Only` hides both rails and assigns the full body to the live map stage.
  - Layout state is session-local and does not touch save data.
- `[T] SM1.4` Real-size resize lifecycle.
  - A shared `resizeMap3DToHost()` updates renderer size, camera aspect, and projection.
  - `ResizeObserver` follows the active inline or pop-out host.
  - Window resize and rail/layout changes schedule one animation-frame resize.
  - `remountMap3D()` still moves the one live canvas/context; it does not create a second renderer.
  - `ovMapDiag()` includes resize observer state, pending resize state, layout state, and both info rails.

## Validation performed

- All inline non-module JavaScript blocks passed `node --check` after the edit.
- Existing single-context remount, fallback, context-loss guard, and `#mapPopStage{min-width:0}` architecture were retained.
- No save, simulation, mission, economy, R&D, personnel, contracts, flight, or Cape logic was intentionally changed.

## Source-port status

The browser-ready file was derived from the current generated `orbital-ventures.html` supplied by the owner. Per repository rules, that generated file is not the authoritative source. Claude/Codex must still port the exact SM1 changes into:

- `src/shell.html` — map and map-pop-out CSS plus inline map host presentation.
- `src/render.js` — layout state/controls, map pop-out markup, renderer resize helper, observer lifecycle, and diagnostics.
- focused tests, preferably `tests/test-map3d-layout.js` plus updates to `tests/test-popout-sizing.js` where pure behavior is testable.

Then run:

1. focused tests;
2. `node build.js`;
3. `node --check build/game.js`;
4. full test suite;
5. `git diff --check`;
6. Firefox browser verification, including repeated inline ↔ pop-out cycles and `ovMapDiag()` before/after rail toggles and manual resize.

## Explicitly not complete in the repository

- `[ ]` Source-module port.
- `[ ]` Generated release rebuild from source.
- `[ ]` Headless focused tests.
- `[ ]` Full-suite validation.
- `[ ]` Firefox visual verification of the SM1 changes.
- `[ ]` SM1 status promotion from `[T]` to `[x]` in `SOLAR-SYSTEM-MAP-ROADMAP.md`.

Do not mark SM1 shipped until all six items above are complete.
