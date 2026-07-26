# SM3 Readability — Test Build Handoff

Status: `[T] TEST BUILD ONLY`

This records the standalone browser build `orbital-ventures-sm3-readability.html`, produced from the prior SM2 test build. It is not yet authoritative repository source and must not be marked `[x] DONE` until ported into `src/`, built, tested, and browser-verified.

## Added in the test build

- Selection halo around the currently selected body.
- Distant-body screen-space markers for major planets when their apparent size becomes too small.
- Marker clicks select and smoothly focus the body.
- Label tiers for system, planetary, and close views.
- Lightweight screen-space collision rejection with priority preservation for selected, hovered, Earth, active route destination, and major bodies.
- Orbit display modes: Relevant, Selected, All, Hidden.
- Relevant mode includes Earth, selected body, planned destination, committed destination, and hovered orbit.
- Hover feedback enlarges the hovered body, emphasizes its label, and highlights its orbit.
- All SM1 and SM2 behavior is retained.

## Validation completed

- All inline JavaScript blocks parse with Node `vm.Script`.
- The implementation retains one live Three.js map renderer/context.
- The new DOM marker layer is moved by `remountMap3D()` and removed by `disposeMap3D()`.
- Existing WebGL reparenting, ResizeObserver, camera presets, smooth transitions, and 2D fallback were not intentionally changed.

## Not yet done

- Not ported into `src/shell.html` / `src/render.js`.
- No focused headless tests have been added.
- No `node build.js` source-generated release has been produced.
- No full repository test suite has been run for this test build.
- Visual overlap thresholds, halo scale, marker threshold, and hover intensity still require local Firefox review.

## Recommended source slices

1. `SM3.1` selection halo and hover state.
2. `SM3.2` distant-body marker overlay and remount lifecycle.
3. `SM3.3` label tier and collision helper with focused tests.
4. `SM3.4` orbit mode registry and toolbar controls.
5. `SM3.5` hover emphasis and browser tuning.

Do not edit generated `orbital-ventures.html` as the authoritative implementation. Port into `src/`, then build and validate according to repository conventions.

## Source integration completed — 2026-07-26

SM3 is now implemented in authoritative source with selection halo, distant-body DOM markers, screen-stable/collision-managed labels, orbit modes, and hover emphasis. Firefox verification caught and corrected prototype-scale label clipping; visible DOM markers now suppress duplicate sprite labels. The focused source guard and all 11 existing map/Three.js regression suites pass.
