# SM5 — Toolbar and Operating Modes Test Build

Status: `[T] TEST BUILD ONLY`

This records the standalone browser build `orbital-ventures-sm5-operating-modes.html`. It is not yet ported into authoritative `src/` modules and must not be marked repository-complete.

## Added in the test build

- A shared Solar Map operating-mode toolbar in the inline map and pop-out.
- Persistent map-only visual preference key: `ov_map_mode`.
- Four modes over the same live Three.js scene:
  - Navigation
  - Mission Planning
  - Operations
  - Strategic
- Mode-specific layer emphasis without duplicate mission or asset truth.
- Mode status description shown in the inline map.
- `ovMapDiag()` extended to report the active operating mode.

## Mode behavior

### Navigation

- Balanced body/moon browsing.
- Relevant orbits.
- Strategic badges, route arcs, and active-flight markers are de-emphasized/hidden.

### Mission Planning

- Reuses `plannedRoute()`, committed-window state, `missionBody()`, route arcs, preview arcs, and existing window geometry.
- Emphasizes Earth, selected destination, route geometry, and planning labels.
- Uses the existing SM2 route/selected camera fitting.

### Operations

- Reuses `activeShipMarkers()` and existing committed trajectory state.
- Shows active spacecraft markers and labels.
- Shows committed route geometry, not speculative planned-route clutter.
- Initial mode switch fits Earth plus active spacecraft when possible.

### Strategic

- Reuses `mapAssetModel()` and `rivalsAtBody()`.
- Shows facility, depot, ISRU, first, claim, tracking, and rival-reach badges.
- Filters labels toward strategically relevant major bodies.

## Validation completed

- All four inline JavaScript blocks passed `node --check`.
- No second renderer or WebGL context was added.
- Existing SM1–SM4 systems remain in the test build.

## Not yet done in repository source

- Port mode toolbar markup/CSS into `src/shell.html`.
- Port mode state/filtering into `src/render.js`.
- Add focused tests such as `tests/test-map3d-modes.js`.
- Run `node build.js`, then `node --check build/game.js`.
- Run the full test suite and `git diff --check`.
- Browser-verify all modes in Firefox from the generated build.
- Update `CLAUDE.md` STATUS/history and append the completed slice to `ROADMAP.md` only after source integration.

## Explicitly untouched

- Mission definitions and gating.
- Simulation, economy, R&D, personnel, contracts, and saves.
- Flight/Cape renderers.
- D1–D4 truth sources.
- Single-context remount architecture.
