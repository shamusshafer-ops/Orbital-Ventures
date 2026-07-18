# Cape 3D Architecture and Visual Design

Status: design approved for review; implementation intentionally not started.

## 1. Outcome

Replace the Command Center Cape's primary Canvas/Phaser presentation with a real Three.js site scene while preserving every existing game-state relationship, building action, pop-out behavior, launch handoff, and fallback path.

The target is a readable, grounded launch complex rather than a photogrammetric replica. It should feel physically constructed: dimensional buildings, convincing materials, directional sunlight and shadows, moving ground traffic, water and atmosphere, and a procedural vehicle standing on the active pad. The scene must remain legible as a management interface.

## 2. Current system

The existing Cape has four useful layers:

1. `ISO_BUILDINGS`, `isoLayout()`, `siteBuildings()`, `siteScale()`, route helpers, and the current vehicle specification provide the authoritative layout and game-state data.
2. `drawCape()` paints a complete 1200×860 isometric scene to Canvas.
3. Phaser's `CapeScene` refreshes that Canvas texture and adds smoke. The non-Phaser fallback runs `drawCape()` directly.
4. DOM hotspot buttons are positioned using rectangles produced by `isoLayout()`. The pop-out independently redraws the same Canvas and reuses the hotspot HTML.

The current CSS camera translates and scales a flat image. The pop-out has a separate animation loop and Canvas. A 3D migration therefore cannot be a material swap: it needs a scene controller, world-space layout, a real camera, and projected interaction anchors.

## 3. Architectural decisions

### 3.1 One scene, one renderer, two mounts

Create one transient `cape3d` controller containing one Three.js scene, renderer, camera, asset cache, animation clock, and interaction state. Its canvas is remounted between:

- `#ccSceneHost` for the normal Command Center; and
- a new `#ccPop3dHost` inside the Command Center pop-out.

Opening the pop-out moves the live canvas to the pop-out host and resizes the camera. Closing it moves the same canvas back. No second scene, texture cache, animation loop, or divergent pop-out rendering path is created.

The existing Phaser and direct-Canvas paths remain available as fallbacks and retain their current independent pop-out implementation.

### 3.2 Existing game data remains authoritative

No scene-only copy of facility levels, building status, routes, or the current vehicle is persisted. The renderer consumes existing pure functions and derives a scene descriptor:

```text
game state
  ├─ ISO_BUILDINGS + siteScale() ──> facility descriptors
  ├─ siteBuildings() ──────────────> actions/status/glyphs
  ├─ crawlerRouteGrid()/gridPath() ─> moving vehicle paths
  ├─ current vehicle state ────────> procedural pad vehicle
  └─ _liftoff ─────────────────────> rocket/effect/camera animation
                                      │
                                      ▼
                               Cape3DController
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
              normal mount                         pop-out mount
```

The 3D scene adds no save fields. Camera position and animation caches are transient UI state.

### 3.3 World coordinates

Retain `gx` and `gy` as site-plan coordinates instead of preserving their current screen-space projection:

```js
worldX = gx * CAPE_TILE_M;
worldZ = gy * CAPE_TILE_M;
worldY = terrainHeight(worldX, worldZ);
```

Recommended scale constants:

- `CAPE_TILE_M = 120`: makes the VAB footprint roughly 228×180 scene metres from its existing `fw`/`fd` values.
- `CAPE_HEIGHT_M_PER_PX = 1.1`: maps the current VAB height to roughly 156 metres and the launch tower to roughly 171 metres.
- Existing `fw` and `fd` become world-space footprint dimensions multiplied by `CAPE_TILE_M`.

Routes continue to use grid waypoints. A pure `capeWorldPoint(gx, gy, elevation=0)` helper performs the conversion for buildings, roads, vehicles, effects, labels, and tests.

### 3.4 Scene graph

```text
CapeScene
  ├─ environment
  │   ├─ sky dome / atmospheric shader
  │   ├─ ocean
  │   ├─ terrain
  │   ├─ shoreline
  │   └─ fog
  ├─ infrastructure
  │   ├─ roads and crawlerway
  │   ├─ utility props
  │   └─ facility groups keyed by ISO_BUILDINGS.key
  ├─ dynamic
  │   ├─ active launch vehicle
  │   ├─ crawler, tanker, bus, and fire truck
  │   ├─ personnel instances
  │   └─ era/facility growth items
  ├─ effects
  │   ├─ smoke and steam
  │   ├─ engine plume
  │   ├─ pad lighting
  │   └─ obstruction beacons
  ├─ interactionAnchors
  └─ lights
      ├─ directional Sun
      ├─ hemisphere sky/ground fill
      └─ local night lights
```

Each facility is a `THREE.Group` with stable `userData.bodyKey`/`facilityKey`, an interaction anchor, and optional status-light anchor. Groups are updated or replaced only when their descriptor changes, not rebuilt every frame.

## 4. Geometry design

Use authored-by-code low/mid-poly geometry for the first pass. This keeps the single-file build manageable and allows facility growth to remain procedural.

### 4.1 Facility factories

Provide one factory per existing building type:

- VAB: box massing, recessed bay doors, roof structures, flag/agency panels, exhaust stack.
- Launch pad: concrete apron, flame trench, service tower lattice, umbilical arms, propellant tanks, pipes, lightning towers.
- Mission Control: stepped office/control building, roof antennas, illuminated window strips.
- R&D: laboratory blocks, roof vents, compact test annex.
- Production: sawtooth roof, loading doors, yard props, storage tanks.
- Personnel/admin: lower office structure with entrance canopy and parking detail.
- Orbital Ops: dish field with animated azimuth/elevation.
- Solar System dome: faceted dome or observatory-like structure.
- Rival pad: simplified, slightly desaturated pad geometry to keep visual hierarchy on the player's site.

Repeated details—windows, trees, lamp posts, fence sections, personnel, parking markings—should use instancing where possible.

### 4.2 Procedural launch vehicle

Add a `capeVehicleMesh(spec)` adapter over the same current vehicle state used by `buildVehicleShape()`. It should create stage cylinders/cones, engine bells, radial boosters, transfer/crew silhouettes, and the current livery. Geometry is cached by a stable specification key and rebuilt only when the vehicle changes.

This is a Cape representation, not a replacement for vehicle-bench rendering or flight physics.

### 4.3 Terrain

Start with a bounded plane using a low-resolution deterministic height field. Keep facility pads and roads level by flattening sampled terrain around their footprints. The terrain must include:

- grass/scrub interior;
- sandy shoreline transition;
- ocean plane with subtle animated normals;
- roads, parking, and crawlerway slightly above terrain to avoid z-fighting; and
- sparse instanced vegetation outside building and route clearance masks.

## 5. Materials and texture assets

Planetary equirectangular maps are not reusable on the Cape. The reusable part is the local, embedded, `file://`-safe asset pipeline.

Use a small PBR material library:

- terrain: albedo + normal + roughness;
- concrete/asphalt: tileable albedo + normal + roughness;
- painted metal: tintable albedo/normal/roughness;
- bare structural steel;
- glass/window emissive mask;
- sand and shoreline blend;
- water normal map; and
- smoke/plume sprite sheets or procedural Canvas textures.

Asset rules:

- Prefer CC0; permit CC-BY with a precise entry in `assets/CREDITS.md`.
- Package every runtime asset locally and embed it in generated browser artifacts. Do not depend on runtime image URLs.
- Prefer 512–1024px tileable WebP/JPEG assets. Normal/roughness maps can usually be 512px.
- Target an additional compressed asset payload of 4–8 MB for the complete Cape pass.
- Generalize the current build manifest from planet-only JPEGs to typed embedded assets rather than adding another one-off base64 mechanism.

## 6. Lighting and atmosphere

Use a `DirectionalLight` for the Sun; a point light is not appropriate for a terrestrial site at this scale.

- Directional Sun drives the building shadows and time-of-day read.
- Hemisphere light supplies restrained sky and ground bounce.
- A low-intensity ambient term prevents crushed shadows but does not erase shape.
- Window, pad, beacon, and road lights become emissive/local lights at dusk and night.
- Shadow map: 2048², restricted to the visible site bounds. Only the Sun casts broad shadows; only major structures and the launch vehicle cast into it.
- Use output sRGB and conservative/no cinematic tone mapping until texture values are visually calibrated.
- Reuse the existing `skyAtmosphere(t)` progression as the source for sun angle, sky colour, star visibility, and practical-light intensity so the 3D and fallback views remain behaviorally aligned.

Atmospheric presentation should include distance fog and a simple sky dome. Clouds can initially remain billboard layers; volumetric clouds are outside this scope.

## 7. Camera and interaction

### 7.1 Camera

Use a perspective camera with a restrained management-game orbit:

- initial field of view: 35–42°;
- initial azimuth chosen to resemble the current isometric view;
- elevation constrained to approximately 24–68°;
- wheel/pinch dollies toward the cursor/focus point;
- drag orbits around a target; modifier/right-drag may pan;
- double-click resets to the site overview;
- clicking a facility eases the target toward its interaction anchor but does not force a disorienting close-up.

The normal and pop-out mounts share camera state. Opening the pop-out changes only aspect ratio and renderer size.

### 7.2 Accessible hotspots

Keep DOM buttons rather than relying exclusively on raycasting. Each facility provides a world-space anchor. Every rendered frame:

1. project the anchor through the active camera;
2. convert normalized device coordinates to host pixels;
3. position the existing `.ccspot`/status UI near that point;
4. hide or dim anchors behind the camera or outside the viewport; and
5. preserve the current action, title, status glyph, keyboard focus, and pop-out close-then-act behavior.

Mesh raycasting may enlarge mouse targets, but it dispatches through the same `siteBuildings()` action mapping as the DOM control. A drag threshold prevents camera movement from activating facilities.

Static `isoLayout().rect` hotspots remain unchanged for the fallback renderer.

## 8. Animation and simulation seams

### 8.1 Frame update

The controller owns one requestAnimationFrame loop and updates:

- camera easing and controls;
- sun/sky/practical lighting;
- route-driven vehicles;
- dish tracking;
- beacons, window emissive intensity, water, and smoke;
- launch sequence transforms/effects; and
- projected DOM anchors.

Expensive descriptor comparisons occur only after game renders or state changes, not every frame.

### 8.2 Liftoff

Keep `playLiftoff()` and `_liftoff` as the launch sequence authority. The 3D controller consumes its normalized progress:

- move the rocket group vertically;
- ramp plume and ground-cloud emitters;
- optionally ease the camera toward the rocket;
- honor click-to-skip;
- preserve normal/pop-out camera state before the sequence;
- restore the prior Cape camera at handoff; and
- call the existing flight-overlay transition at the same completion point.

No launch outcome or physics moves into Three.js.

### 8.3 Site growth

`siteScale()` and existing facility state drive geometry variants. Additional pads, built orbital/lunar/Mars operations, VAB growth, and era variation are descriptor changes. The first implementation must inventory every item currently emitted by `isoGrowthItems()` so 3D does not silently drop earned visual progression.

## 9. Lifecycle and fallback chain

Target selection order:

```text
Three.js + WebGL + Cape3D feature flag
  → 3D Cape
  → otherwise current Phaser Cape
  → otherwise current direct Canvas Cape
```

Required controller operations:

- `startCape3D(hostId, width, height)`
- `mountCape3D(hostId)`
- `resizeCape3D(width, height)`
- `pauseCape3D()`
- `resumeCape3D()`
- `syncCape3DFromState()`
- `disposeCape3D()`
- `beginCape3DLiftoff(sequence)`

Pause the animation loop when neither the Command Center nor its pop-out is visible. Keep GPU resources while merely switching normal/pop-out mounts. Dispose on WebGL context loss, fatal scene error, new-game teardown if needed, or explicit fallback.

Any 3D startup/tick failure must log once, dispose safely, and immediately mount the existing Phaser/Canvas path. The 3D feature flag ships off until the browser acceptance checklist passes.

## 10. Performance budgets

Initial desktop targets:

- steady 60 fps at 1280×800 on a typical integrated GPU;
- acceptable floor of 30 fps in the full-screen pop-out;
- 150k visible triangles or fewer at overview;
- 75 draw calls or fewer at overview;
- no more than one renderer and one animation loop;
- 2048² maximum broad shadow map;
- device pixel ratio capped at 1.5 for the Cape unless performance headroom is measured;
- total new compressed Cape assets: 4–8 MB; and
- no per-frame geometry/material/texture allocation.

Use instancing, merged static geometry, texture reuse, object pools for effects, and cached procedural geometry. Add a low-quality mode that lowers pixel ratio, shadow resolution, vegetation count, particles, and water animation without changing gameplay.

## 11. Test strategy

### 11.1 Headless tests

Keep most new logic pure and testable without Three.js:

- grid-to-world conversion and scale anchors;
- facility descriptor generation from `ISO_BUILDINGS`/`siteScale()`;
- route conversion and movement ordering;
- camera clamp/reset calculations;
- asset manifest completeness;
- normal/pop-out mount state transitions;
- hotspot projection math using plain matrices/vectors or a small pure adapter;
- liftoff progress mapping;
- feature-off and Three-absent fallback; and
- no save/state mutation from scene operations.

### 11.2 Browser acceptance checklist

- 3D starts after asynchronous Three.js loading and never remains on the fallback accidentally.
- All current facilities, growth items, current rocket, roads, traffic, water, and labels are represented.
- Materials remain visible and correctly mapped when opened directly through `file://`.
- Sunlit and night scenes retain readable textures without grey washout or crushed blacks.
- Drag, zoom, reset, click, keyboard focus, and tooltip behavior work in normal and pop-out mounts.
- Opening/closing the pop-out preserves scene animation and camera state without duplicate canvases or loops.
- Every building action still opens the correct tab/modal; pop-out actions close the overlay first.
- Liftoff runs, skips, follows the rocket, restores camera state, and transitions to flight exactly once.
- Leaving/re-entering Command Center pauses/resumes cleanly.
- Forced Three/WebGL/texture failure reaches the existing Cape without breaking Command Center.
- No meaningful regression at the supported viewport baselines.

## 12. Implementation slices

Implementation should proceed only after this design is accepted.

### Slice A — pure model and dormant shell

- Add the feature flag, world-coordinate helpers, scene descriptors, controller interface, and headless tests.
- Add a guarded renderer shell with a clear-color scene and camera, but keep the flag off.
- Generalize the embedded asset manifest without adding final art.

Exit: dormant 3D startup/fallback and pure mappings are tested; current Cape output is unchanged.

### Slice B — environment and facility massing

- Terrain, ocean, roads, lighting, camera, all facility groups, and procedural current vehicle.
- Solid-colour/PBR placeholder materials are acceptable in this slice.

Exit: complete spatial/content parity at overview with stable camera performance.

### Slice C — interaction and mount parity

- Projected accessible hotspots, raycasting, status glyphs, normal/pop-out remounting, resizing, pause/resume, and failure fallback.

Exit: all current building actions and both presentation modes behave identically.

### Slice D — materials and environmental art

- Licensed local material set, embedded asset delivery, terrain blending, water, vegetation, windows, shadows, sky, night practicals, and era styling.

Exit: approved visual-quality pass without asset-loading failures.

### Slice E — dynamics and liftoff

- Traffic, dishes, smoke/steam, animated props, site growth inventory, launch plume, rocket rise, camera chase, skip, and flight handoff.

Exit: complete behavioral parity with the existing animated Cape.

### Slice F — hardening and default-on decision

- Performance profiling, quality scaling, context-loss handling, viewport checks, full regression suite, and browser checklist.
- Enable by default only after visual sign-off; retain Phaser/Canvas fallback permanently.

## 13. Explicit non-goals

- Photogrammetry or a survey-accurate Kennedy/Cape Canaveral replica.
- A walkable first-person mode.
- Moving launch physics or mission outcomes into Three.js.
- Replacing vehicle-bench or flight-overlay renderers.
- Volumetric clouds, physically simulated ocean, or global weather.
- Persisting camera or scene cache data in saves.
- Removing the current Cape fallback.

## 14. Approval decisions before implementation

The recommended defaults are:

- stylized-realistic launch complex, not strict historical reconstruction;
- perspective management camera with constrained orbit;
- one live renderer remounted between normal and pop-out;
- code-built facility geometry plus a compact licensed PBR material set;
- projected accessible DOM hotspots backed by optional mesh raycasting;
- dynamic day/night presentation based on the existing atmosphere clock; and
- feature flag off until Slice F sign-off.

Implementation is paused here by request.
