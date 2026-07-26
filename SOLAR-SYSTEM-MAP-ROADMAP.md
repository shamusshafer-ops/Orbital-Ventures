# Solar System Map — Phased Slice Roadmap

> Added 2026-07-25 as a dedicated continuation of the completed Solar Map D-pass.
> This file is implementation planning, not proof that an item has shipped.
> Claude and Codex should update the status ledger below after every coherent slice.

## Status legend

- `[x] DONE` — implemented in repository source, built, tested, and recorded.
- `[~] IN PROGRESS` — actively claimed in `CLAUDE.md` STATUS; do not duplicate work.
- `[ ] PLANNED / NOT TOUCHED` — documented only; no repository implementation should be inferred.
- `[!] BLOCKED / NEEDS OWNER REVIEW` — implementation paused pending a decision or browser validation.
- `[T] TEST BUILD ONLY` — demonstrated in an exported HTML outside the repository; must not be treated as shipped.

## Protected baseline — already complete

These systems are the stable foundation. Future slices must preserve them unless a slice explicitly says otherwise.

- [x] D1 — asset/facility/rival overlays and committed/planned transfer arcs.
- [x] D2 — AU orbit labels plus real distance and light-time readouts.
- [x] D3a — navigable body roster and moon-label level of detail.
- [x] D3b — ecliptic reference grid and off-screen Sun/Earth chevrons.
- [x] D4 — time preview, next-window navigation, window readout, and preview transfer arc.
- [x] One live Three.js/WebGL scene is reparented between inline and pop-out hosts.
- [x] `pauseMap3D()` pauses animation without destroying the WebGL context.
- [x] `remountMap3D()` measures the real host and resizes renderer/camera.
- [x] `ovMapDiag()` reports host, canvas, render-loop, context, camera, and draw-call state.
- [x] 2D fallback remains available for startup, tick, or context-loss failures.
- [x] Pop-out flex fix: `#mapPopStage{min-width:0}`.

## Important current-state note

- [T] Lighting and layered-starfield improvements were produced in a standalone test HTML during review.
- [ ] Those visual changes are **not yet merged into `src/`**, are **not built by `node build.js`**, and are **not repository-complete**.
- [ ] Before adopting them, port the changes into the proper source module, add a focused test where practical, run the full build/syntax checks, and browser-verify Firefox.

---

# Phase SM1 — Viewport size and pop-out layout

**Goal:** Make the Solar System map read as a primary game scene and make the pop-out feel like a dedicated operations console.

## SM1.1 — Larger inline map

- [ ] Remove or substantially raise the inline `#mapHost` 980 px width cap.
- [ ] Increase the inline map’s usable height to roughly 700–740 px on desktop.
- [ ] Preserve responsive behavior below tablet widths.
- [ ] Ensure the Three canvas fills the available host without stretching its drawing buffer incorrectly.
- [ ] Verify left/right application rails do not force the map below a useful width.

**Acceptance criteria**

- Inline map is visibly larger on 1920×1080 without horizontal overflow.
- Canvas has non-zero size after tab switches and pop-out round trips.
- Existing roster, HUD, hover card, chevrons, and input remain aligned.

## SM1.2 — Near-full-screen map pop-out

- [ ] Give the Solar Map a dedicated pop-out sizing rule instead of relying only on the shared 1380×820 cap.
- [ ] Target approximately `calc(100vw - 16px)` × `calc(100vh - 16px)` with sensible minimums.
- [ ] Keep drag, resize, pin, and close behavior.
- [ ] Measure the actual stage after the pop-out mounts; do not assume 960×680 is the real viewport.

**Acceptance criteria**

- On 1920×1080, the map stage is materially larger than the inline map.
- No roster/details-induced flex overflow.
- Opening/closing never creates a second WebGL context.

## SM1.3 — Collapsible side rails and Map Only mode

- [ ] Add toolbar controls: `Bodies`, `Details`, and `Map Only`.
- [ ] Body roster states: open, compact, hidden.
- [ ] Details rail states: open, collapsed.
- [ ] Map Only hides both rails and gives the stage the full pop-out body.
- [ ] Persist only if a clear local UI preference pattern already exists; otherwise keep session-local.

**Acceptance criteria**

- Toggling either rail triggers a renderer/camera resize.
- Selection remains synchronized when a rail is hidden and reopened.
- Keyboard focus remains usable and controls have accessible labels.

## SM1.4 — Real-size resize lifecycle

- [ ] Add or extend a `ResizeObserver` for the active map host/stage.
- [ ] Update renderer size, camera aspect, projection matrix, and screen-space overlays together.
- [ ] Cap device pixel ratio by quality tier to avoid excessive 4K load.
- [ ] Guard against zero-size measurements during DOM transitions.

**Suggested test**

- `tests/test-map3d-layout.js` for pure sizing helpers and source guards.
- Firefox browser verification using `ovMapDiag()` before/after rail changes and pop-out resize.

---

# Phase SM2 — Camera usability and navigation

**Goal:** Make the map easy to frame, recover, and navigate without repeated manual orbit/zoom work.

## SM2.1 — Named camera presets

- [ ] Add presets: System, Inner System, Earth–Moon, Outer System, Selected Body, Mission Route.
- [ ] Add Top and Perspective orientations.
- [ ] Expose presets in the map toolbar and keep keyboard shortcuts discoverable.

## SM2.2 — Fit-visible-objects helper

- [ ] Build a pure bounds/fitting helper using relevant object positions or a combined bounding sphere.
- [ ] Include 15–25% composition padding.
- [ ] Account for the current aspect ratio and visible side rails.
- [ ] Reuse for system, selected body, and route framing.

## SM2.3 — Smooth camera transitions

- [ ] Add transition state for target, distance, azimuth/elevation where required.
- [ ] Use a short eased transition rather than snapping.
- [ ] Allow user input to cancel or take over immediately.
- [ ] Avoid transition allocations every frame.

## SM2.4 — Better zoom behavior

- [ ] Scale zoom speed by camera distance.
- [ ] Evaluate cursor-directed zoom without destabilizing orbit controls.
- [ ] Add visible `Reset`, `Fit System`, and `Focus Selected` controls.
- [ ] Preserve existing keyboard and wheel controls.

**Suggested test**

- `tests/test-map3d-camera.js` for fit math, limits, preset targets, and transition completion.

---

# Phase SM3 — Object and label readability

**Goal:** Keep bodies, missions, and selections readable at both system and close scales.

## SM3.1 — Selected-body emphasis

- [ ] Add a camera-facing selection halo/ring.
- [ ] Keep its apparent screen size within a controlled range.
- [ ] Ensure it does not obscure moons or trigger excessive bloom.

## SM3.2 — Distant-body HUD markers

- [ ] Show screen-readable markers when a body projects below a minimum apparent size.
- [ ] Keep markers clickable and synchronized with the roster/details panel.
- [ ] Fade markers as the real body becomes visually large enough.

## SM3.3 — Label tiers and collision management

- [ ] Define label tiers for system, planetary, and close views.
- [ ] Project labels to screen space and resolve overlaps by priority.
- [ ] Always preserve selected, hovered, active-mission, Sun, and Earth labels.
- [ ] Extend existing moon-label LOD rather than creating an unrelated system.

## SM3.4 — Orbit presentation modes

- [ ] Add All, Relevant, Selected Only, and Hidden modes.
- [ ] Highlight selected/mission-relevant orbits.
- [ ] Distinguish planetary orbits, committed routes, planned routes, and spacecraft paths.
- [ ] Keep opacity low enough that the starfield and planets remain legible.

## SM3.5 — Hover feedback

- [ ] Increase label/marker/orbit emphasis on hover.
- [ ] Avoid permanent clutter or heavy per-frame material creation.

**Suggested test**

- `tests/test-map3d-labels.js` for priority and overlap decisions.
- `tests/test-map3d-layers.js` for orbit-mode visibility rules.

---

# Phase SM4 — Visual environment and performance tiers

**Goal:** Improve lighting and deep-space presentation without compromising Firefox stability.

## SM4.1 — Directional lighting pass

- [ ] Port the reviewed warm solar key light into source.
- [ ] Reduce broad ambient wash while preserving texture readability.
- [ ] Improve day/night terminators and planetary material roughness.
- [ ] Keep the Sun/corona controlled near close views.
- [ ] Confirm tone-mapping compatibility with the repository’s Three.js version.

## SM4.2 — Layered deterministic starfield

- [ ] Replace the single flat star shell with deterministic near/mid/far layers.
- [ ] Add restrained stellar color-temperature variation.
- [ ] Add subtle parallax tied to camera movement.
- [ ] Keep generation stable across opens and saves.

## SM4.3 — Galactic backdrop

- [ ] Add a faint Milky Way/deep-space band that remains subordinate to gameplay.
- [ ] Avoid external texture dependencies unless explicitly approved.
- [ ] Ensure backdrop does not rotate or drift in a way that confuses orbital orientation.

## SM4.4 — Map quality settings

- [ ] Add Low, Balanced, High tiers for pixel ratio, star count, atmosphere/glow, and geometry detail.
- [ ] Default to Balanced.
- [ ] Keep settings map-specific.
- [ ] Avoid introducing a second renderer or post-processing chain unless measured and justified.

**Suggested test**

- Source guard tests for deterministic seed/count/tier values.
- Firefox browser verification for frame pacing, context count, and repeated pop-out cycles.

---

# Phase SM5 — Map toolbar and operating modes

**Goal:** Organize the map around player intent instead of showing every layer at once.

## SM5.1 — Toolbar structure

- [ ] Add grouped controls for View, Layers, Camera, and Layout.
- [ ] Keep the primary actions visible; move secondary toggles into compact menus only if needed.
- [ ] Add a concise controls/help overlay.

## SM5.2 — Navigation mode

- [ ] Bodies, moons, roster, labels, and basic details.
- [ ] Default browsing mode.

## SM5.3 — Mission Planning mode

- [ ] Emphasize Earth, destination, route, launch window, travel time, delta-v, and readiness.
- [ ] Reuse existing `bodyPlan`, `missionPlan`, `computeWindows`, and transfer-arc geometry.
- [ ] Do not create alternate mission truth in the renderer.

## SM5.4 — Operations mode

- [ ] Emphasize active spacecraft, estimated arrivals, communication delays, warnings, and next event.
- [ ] Add follow-spacecraft camera behavior.
- [ ] Keep markers explicitly mission-progress visualization, not fabricated telemetry.

## SM5.5 — Strategic mode

- [ ] Emphasize facilities, depots, ISRU, firsts, rival reach, claims, and logistics-relevant assets.
- [ ] Reuse `mapAssetModel()` and existing rival/facility truth.

**Suggested test**

- `tests/test-map3d-modes.js` for layer membership and shared-data-source guards.

---

# Phase SM6 — Advanced navigation and spatial context

**Goal:** Reduce disorientation when zoomed deeply into planetary systems.

## SM6.1 — Breadcrumb navigation

- [ ] Add clickable context such as `Solar System › Earth System › Moon`.
- [ ] Breadcrumb actions use camera presets/fitting rather than hard-coded teleports.

## SM6.2 — Optional overview locator

- [ ] Evaluate a small system locator only when deeply zoomed.
- [ ] Prefer a lightweight overlay over a second Three.js scene or renderer.
- [ ] Show camera target/current region, not a misleading linear miniature.

## SM6.3 — Scale communication

- [ ] Keep numeric AU, distance, and light-time readouts.
- [ ] Add a clear note that orbital distance is compressed and body radius enhanced.
- [ ] Do **not** add a universal linear scale bar; the scene-to-AU mapping is nonlinear and the D2 review explicitly rejected it.

---

# Recommended implementation order

1. `SM1.1` larger inline map.
2. `SM1.2` near-full-screen pop-out.
3. `SM1.3` collapsible rails / Map Only.
4. `SM1.4` resize lifecycle.
5. `SM2.1` presets and `SM2.2` fit helper.
6. `SM2.3` smooth transitions and `SM2.4` zoom improvements.
7. `SM3` readability slices.
8. `SM4` lighting/starfield and quality tiers.
9. `SM5` operating modes.
10. `SM6` advanced context aids.

## Slice discipline

For every slice:

1. Claim the exact slice in `CLAUDE.md` STATUS before editing.
2. Re-pull current `main` and inspect adjacent map tests.
3. Edit `src/`, never generated `orbital-ventures.html`.
4. Add one focused test file where logic can be exercised headlessly.
5. Run the focused test first.
6. Run `node build.js`.
7. Run `node --check build/game.js` immediately after the build.
8. Run the full test suite and `git diff --check`.
9. Browser-verify Firefox for layout/rendering slices; use `ovMapDiag()` for mount and context state.
10. Update this ledger and append the completed slice to `ROADMAP.md`/Claude History according to existing repository rules.

## Explicitly not touched by this roadmap addition

- No gameplay simulation values.
- No mission definitions or mission gating.
- No save schema or migration.
- No economy, R&D, personnel, contracts, facilities, or rival logic.
- No flight renderer or Cape scene.
- No current Three.js/WebGL map source implementation.
- No generated release HTML.
- No existing tests.
- No D1–D4 completed behavior.
