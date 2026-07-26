# SM4 — Lighting and Deep Space Test Build

Status: `[T] TEST BUILD ONLY`

Added in browser build `orbital-ventures-sm4-lighting-deep-space.html` on 2026-07-25.

## Implemented in the standalone build

- Warm solar key light with reduced broad ambient wash.
- Restrained hemisphere and camera-side fill so planetary night sides remain readable.
- Neutral tone-mapping fallback chain compatible with the bundled Three.js version.
- Controlled solar corona intensity by quality tier.
- Three deterministic star layers with distinct radii, sizes, opacity, and color-temperature variation.
- Camera-relative parallax for near/mid/far star layers.
- Deterministic tilted galactic band with additive, low-opacity presentation.
- Map-specific quality settings: Low, Balanced, High.
- Quality settings persist in localStorage key `ov_map_quality`; they are not save-game state.
- Quality tiers control pixel ratio, star draw ranges, galactic-band count/visibility, atmospheric halos, corona, and fill-light levels.
- Inline and pop-out toolbars both expose the same quality control.
- `ovMapDiag()` reports current quality id, label, and configuration.

## Preserved

- SM1 viewport/pop-out layout and ResizeObserver.
- SM2 camera presets, fit helper, transitions, zoom/reset controls.
- SM3 selection halo, markers, label collision, orbit modes, and hover feedback.
- Single live WebGL context reparented between mounts.
- Context-loss guards, fallback path, D1–D4 overlays, simulation, save data, and gameplay logic.

## Validation completed

- All inline JavaScript blocks pass `node --check`.
- No second renderer or post-processing chain was introduced.
- Star generation is deterministic through fixed seeds.

## Still not repository-complete

- Not yet ported into authoritative `src/render.js` and `src/shell.html`.
- No focused source-level test file added yet.
- Generated repository release HTML has not been rebuilt from `src/`.
- Full repository test suite has not been run for this standalone build.
- Firefox visual review is still required for brightness, galactic-band subtlety, and quality-tier performance.

Do not mark SM4 `[x] DONE` in the source roadmap until the source port, build, tests, and Firefox verification are complete.
