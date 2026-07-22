# Claude/Codex collaboration handoff

⚠️ **Read the STATUS block below first.** It is rewritten in full each session — not appended to.
Everything from `## History (pure append below)` onward is the permanent archive: never edit or
reorder existing entries there, only add new ones at the end, same as `ROADMAP.md`.

---

## STATUS (as of 2026-07-22, HEAD `839148a`)

**Repo health:** 95 test suites, clean build parity, `git diff --check` clean. Only known drift:
`test-flight3d-trajectory.js` (long-standing — Codex's own accepted trajectory/vehicle-physics
changes, not a regression). If you see a DIFFERENT test failing, don't assume it's pre-existing —
check the history below for whether it's a known, intentional behavior change first.

**In progress:** (none claimed right now)
> When you start a task, replace this line with: `<task> — <Claude|Codex> — started <date>`.
> When done, clear it back to "(none claimed right now)" and add your entry to the history below.

**Oriented quickly (last few sessions, newest first) — see History for full detail:**
- Consolidation pass (Claude) — verified Codex's tech-tree completion (98 nodes, closed), camera
  director, and altitude-driven Earth reveal all integrate cleanly with prior work. No conflicts.
- Flight 3D: physical Earth handoff + orbital operations (Codex) — Mission Control maneuver
  sequence at orbit insertion, named camera-director shots, altitude-driven (not progress-driven)
  Earth reveal, 0.1× default playback speed (intentional, confirmed with owner).
- Tech-tree design pass, slices 1–4 (Claude slice 1, Codex slices 2–4) — 110→98 nodes, closed.
- Palette Population PP.0/PP.1/PP.3 (Codex) — parts.js content, self-contained.
- Crew-escape mini-arc, BACKLOG #40; launch camera + staging fixes; deep-failure/cislunar-reentry
  3D coverage (Claude) — see History for the full run.

**Standing conventions (both agents, keep doing):**
- Always re-pull `main` HEAD before starting anything — state moves between sessions.
- One dedicated test file per feature/slice; run it first when debugging anything adjacent before
  assuming a regression is new.
- Grep every external reference to an id/function BEFORE renaming or removing it (how the tech-tree
  merges and dead-capstone fixes stayed safe).
- Tag intentional, test-visible behavior changes in the commit message with a leading
  `BEHAVIOR CHANGE:` line — saves the other agent from reverse-engineering "regression or on
  purpose" from scratch (cost real time twice this week: the post-failure hold screen, the 0.1×
  default speed).
- Claim a task in the STATUS block above before starting it; clear the claim when you push.
- `ROADMAP.md` and the History section below stay pure-append, always. This STATUS block is the one
  exception — overwrite it fully each session; never touch anything past the divider.
- The Git Data API push itself is a conflict guard: pushing against a stale base SHA fails outright
  rather than silently overwriting the other agent's work. If a push fails, re-pull, don't force.

---

## History (pure append below — do not edit or reorder existing entries)

# Claude collaboration handoff

`main` is the shared integration branch for Codex and Claude. Before editing, pull/rebase
against `origin/main`; after a coherent, verified slice, commit and push to `main`.

## Current E4 status

- E4.4 shipped: `state.hulls` provides persistent, serial-numbered physical launch-vehicle
  records. Rollout, launch, loss/expending, recovery, reuse count, save migration, and Fleet
  Registry visibility are implemented. The physical trajectory is frozen per vehicle from its
  thrust, mass, propellant, Isp, and drag inputs.
- E4.5 shipped: deferred interplanetary hulls appear as clickable 3D Solar System markers on
  true two-body transfer arcs. The shared marker path is `flightTargetBody`, `flightScenePos`,
  `activeShipMarkers`, and `map3dUpdateShipMarkers`; it is explicitly mission-progress
  visualization, not fabricated live orbital telemetry. Test: `tests/test-flight-markers.js`.
- E4.7 has been extended: successful cislunar missions stay in Three.js through a dedicated
  Earth–Moon transfer presentation instead of handing off to the legacy 2D canvas. Pad/ascent,
  suborbital splashdown, Earth orbit, cislunar transfer, and crewed Earth reentry are already
  rendered through the Flight 3D adapter.

## Current UI / flight-report pass (Codex)

- The Command Center now follows the framed-monitor composition: responsive side rails, clear
  central Cape viewport, and one readable bottom scene-navigation row. The Earth pop-out uses
  the same packaged equirectangular day-map as the Solar Map, with the correct longitude origin
  for the Cape marker.
- Vehicle, Station, Solar System, Earth, Command Center, and Contracts pop-outs are desktop
  windows: drag their top bar, resize from the lower-right grip, or pin them to keep working in
  the underlying game. Their existing close controls remain at the top.
- Flight reports are data-backed by `flightReport()`: the bench shows a pre-flight card; the
  launch overlay has an always-visible Flight Card; completion/failure holds a Flight Debrief
  with payload, mass, Δv/TWR, duration, distance, outcome, and any recorded failed subsystem.
  Do not replace these values with animation-derived estimates.

## Visual multi-stage separation — SHIPPED (Claude), core mechanism visually validated

Done. `cape3dTrajectoryPlan` now records `stageEvents[]` (booster-jettison and spent-stage-drop
times, positions, and velocities — real values from the burn integration it already ran; they were
previously discarded). Pure query `cape3dSeparationStates(plan, time)` maps the current flight time
to which pieces have separated and how long each has been falling. `cape3dVehicleMesh` is now built
as per-stage sub-groups (`userData.stageGroups`, `userData.boosterGroup`) with byte-identical visual
output; `cape3dResetStaging(rocket)` reattaches them before each flight since the mesh is built once
and reused. `cape3dUpdateLaunchPresentation` detaches each piece at its real separation time via
`root.attach()` (world-transform-preserving, so no jump across the rocket's pitch) and drifts it
under real free fall (scene is 1:1 metres, reuses `G0`); the flame FX moves to the new bottom
stage's base on a core separation so the next stage visibly ignites. Sim and outcome logic untouched.

**Update (2026-07-20):** since the sandbox has no WebGL, a standalone offline preview
(`staging-preview.html`, not committed to the repo — a scratch tuning tool) was built that pastes
`cape3dTrajectoryPlan`/`cape3dSeparationStates` in **verbatim** from `build/game.js` and runs a
faithful copy of the detach/free-fall logic against four synthetic vehicles (two-stage, three-stage,
boosters+2-stage, single-stage control). The repo owner reviewed it directly and confirmed the
separation timing and ballistic fall/tumble read correctly — boosters drop before the core stage,
pieces coast away under gravity rather than popping, trajectory trails visibly diverge. **This
confirms the underlying math and detach/fall logic are sound**, which was the main open risk.

What it does NOT confirm: the ACTUAL in-game Cape 3D scene — real camera behavior (pulls back with
altitude on its own schedule, unverified), real vehicle art/livery, and — importantly — **mesh
reuse across a second launch in the real game session** (the preview rebuilds a fresh rocket per
vehicle-button click, so it never exercised `cape3dResetStaging`'s actual job of un-doing a prior
flight's separations). A real-browser playtest in the actual game should still confirm: the camera
frames a separation sensibly at real Cape distances, and a second launch after a first shows a
complete, correctly-reset rocket.

Headless coverage unchanged: `tests/test-flight3d-staging.js`, 29 checks (stageEvents recording for
1/2/3-stage and boosters+stages vehicles, ordering, separation-state time mapping/edge cases).

## Deep (in-space) failure stays in 3D — SHIPPED (Claude)

A strand/loss that happens AFTER reaching orbit or cislunar cruise (`success===false`,
`failPhase==='deep'` — e.g. life-support/propulsion loss in space) used to cut to the flat 2D
fallback at the flight's most dramatic beat, because `updateFlight3DSession` gated `orbit` on
`success!==false`. Now it stays in the Three.js renderer: the orbit/transfer presentation freezes
the craft at the loss fraction (0.42, matching the 2D renderer's freeze point) and tumbles it
dead-and-dark (`deadStick`), engine cut, with the readout showing `SPACECRAFT LOST`.

Mechanism mirrors the existing ascent-failure path: `flight3dPresentationSnapshot` now emits
`effects.deepFailure` / `deepFailureFrac` / `deepFailureProgress` (armed only for `orbit`/`transfer`
phases past the freeze fraction) and passes `failPhase` through. `cape3dOrbitProfile` /
`cape3dTransferProfile` freeze `progress` and cut `burn`/`arrival` when dead-stick, exposing
`deadStick` + `failProgress`; the two presentations apply a building tumble. The gate in
`updateFlight3DSession` was loosened to keep `orbit` in 3D for a deep fail (`transfer` was already
unconditionally in 3D but had no failure visual before this). Sim/outcome logic untouched — this is
presentation only; the outcome was resolved by the sim long before the animation opened.

Test: `tests/test-flight3d-deepfail.js` (26 checks — the signal arms only for a deep fail past the
freeze fraction, never on success or an ascent fail; orbit + transfer profiles freeze/dead-stick
identically; a successful flight still runs full progress and reaches arrival). NOT browser-verified
(no WebGL here) — the tumble render should be eyeballed in a real failed-orbital-insertion flight.

NOTE — a related gap found while scoping, NOT fixed here: a crewed **cislunar** mission gets **no
reentry leg at all** (`flightHasReentry` requires `isOrbital`, which cislunar isn't), so a Moon
mission's Earth return currently isn't animated — the flight ends after the transfer with a
post-flight card. That's missing content (a new mission leg), not a gating fix; logged as the next
Flight-3D-coverage candidate.

## Crewed cislunar returns get a reentry leg — SHIPPED (Claude)

`flightHasReentry` now allows `isCislunar` (not just `isOrbital`), so a crewed successful Moon
mission gets the same 6.4s reentry leg an orbital crewed flight does — previously its Earth return
was never animated (flight ended after the transfer). The reentry presentation is already
progress-only (no isOrbital dependency), so no new renderer was needed; `drawScene`'s `entering`
check already fires for cislunar once past the cruise. The `updateFlight3DSession` reentry gate was
widened to `(isOrbital||isCislunar)`. Uncrewed/failed cislunar correctly get no reentry.
Test: `tests/test-flight3d-cislunar-reentry.js` (8 checks). NOT browser-verified.

## Booster/stage separation polish — SHIPPED (Claude)

Two additions on the E4.7 staging base: (1) a brief expanding additive puff at the interstage when
a piece detaches (`cape3dSepPuffPool`/`cape3dSpawnSepPuff`/`cape3dTickSepPuffs`, a 4-sprite reused
pool, spawned at the detach point, expands+fades over 900ms); (2) a transient flight-readout beat —
`flightSeparationBeat(snapshot)` finds the most-recent staging event within 3.2s of the current
flight time and returns `BOOSTER SEP` / `STAGE N SEP` (1-indexed) with a 1→0 fade, surfaced in the
`flightAltitude` readout. Reuses the real `stageEvents` — no new timing. Sim untouched.
Test: `tests/test-flight3d-sepbeat.js` (10 checks). Puff is Three.js (not headless-testable); beat
label/timing is. NOT browser-verified — eyeball a multi-stage launch.

## Vehicle bench height/diameter scale readout — SHIPPED (Claude)

New `vehicleRealDimensions(spec)` (flight.js): honest metres-based estimate distinct from
`buildVehicleShape`'s `h` (a deliberately-compressed rendering unit). Tank length = propellant
volume ÷ cross-section (~1.0 t/m³ representative density) + 15% structure margin; diameter is the
real `dia` value already used by drag. Surfaced as a "📏 Vehicle scale" flag line in both bench
readouts (`renderReadout`/`renderProfileReadout`) — total height, max diameter, per-stage heights.
Test: `tests/test-vehicle-dimensions.js` (12 checks, pure). This also answers the earlier "does the
mesh reflect the bench design" question — it does (prop/dia-driven), just wasn't legible before.

## Flight playback speed range widened — SHIPPED (Claude)

`ANIM_SPEEDS` (shell.js) already existed and applies to every flight overlay screen (2D and 3D
alike — the button sits outside `flightCanvasWrap`) but only offered 0.5/1/2x. Widened to
0.1x/0.25x/1x/2x/5x/10x/25x/50x — sub-fps slow-mo for watching a separation closely, up to 50x for
skipping through a long cislunar cruise without a hard cut. Default stays 1x (index fixed to point
at the 1x entry so behavior is unchanged unless the player cycles). Fixed a stale static button
label ("1× Slow" → "1× Normal") found in the process. Cycle via the existing button or [Enter].
Test: `tests/test-anim-speed.js` (9 checks, pure).

## Launch camera distance bug + Earth-curvature reveal — SHIPPED (Claude)

Root-caused all three player-reported issues (far camera even at zoom, "no ship, just plume" after
a booster/stage sep, panning shows the flat launch-site square not an expanding Earth):

1. **Camera distance bug (mine, from the prior camera slice):** `baseDist` scaled linearly with
   raw ALTITUDE IN METRES (`150+altitudeM*.05`) — exploded to 5000+ units by 100 km and 15000+ by a
   realistic ~300 km insertion, far beyond what the .35–3.2x zoom range could pull back. This is
   the dominant explanation for "far even with zoom," and very likely for "no ship, just plume"
   too (a small/distant mesh reads as invisible against a bright additive flame). Fixed:
   `cape3dLaunchChaseDist(altitude)` now uses sqrt(km), capped at 620 units — extracted as a
   standalone pure function so the "never runs away" property is directly tested.
2. **Earth-curvature reveal was fully built but force-disabled.** `cape3dAscentBlend` already
   computed the right `space`/`capeVisible` curve; the update function hardcoded opacity to 0 and
   the flat site plane to always-visible, with a comment noting a past bright-flash bug from the
   Earth texture loading async. Re-wired to actually use the blend curve, gated on
   `earth.material.map.image` being truthy (real decoded image data) so opacity can't rise before
   there's something real to show — the same flash risk, closed properly instead of left disabled.

Test: `tests/test-launch-camera.js` (11 checks — distance boundedness/monotonicity, blend curve
shape). NOT browser-verified (no WebGL here) — this is exactly the kind of thing worth a look.

## Launch view: real fixes for "no ship after sep" + "pad/Earth mixed" — SHIPPED (Claude)

The prior camera-distance fix wasn't the actual cause of "no rocket, just a plume." Root-caused
both remaining reports with a headless scene-graph inspection (a minimal THREE stub in
`/tmp/three_stub.js`, not committed) confirming the mesh itself was fine — the bug was elsewhere:

1. **"No rocket, just plume" after separation:** the camera/flame target used `rocket.position+55`
   — a FIXED offset assuming stage 0's original span (baseY 0..totalHeight) for the whole flight.
   Once stage 0 separates and leaves, the remaining stack's actual base is wherever the NEXT
   still-attached stage starts (confirmed via the stub: e.g. baseY jumps from 0 to 20.9 on a
   2-stage vehicle) — but the camera kept aiming at the now-empty space stage 0 vacated. Only the
   flame (which DOES correctly reanchor) was in frame. New `cape3dLiveStageSpan(stageGroups,rocket)`
   — pure, scans which stage groups are still parented to the rocket, returns the REAL current span
   — re-centers both camera target and (implicitly, since it shares the target) framing on whatever
   remains.
2. **"Earth/pad mixed, no smooth transition":** `cape3dAscentBlend`'s `space` (Earth opacity) and
   `capeVisible` (flat launch-site ground) were on two different clocks — `space` reaches full
   opacity at progress 0.62, but `capeVisible` stayed true until 0.72. A real 0.10-progress window
   had the fully-opaque Earth sphere AND the fully-visible flat pad ground rendering
   simultaneously, then the ground popped off in one frame. Aligned `capeVisible` to cut off at the
   exact point `space` saturates — verified with an exhaustive scan (no progress value has both
   ≥full-opacity Earth and a visible site).

Test: `tests/test-launch-camera.js` now 24 checks (was 11) — added live-span recentring (mock
stage-group objects, no THREE needed) and the exhaustive no-overlap-window scan. NOT
browser-verified (no WebGL here) — this is exactly the category of thing worth confirming visually.

## Two stale test drifts fixed — SHIPPED (Claude)

Confirmed both were the SAME intentional Codex behavior ("Refine command UI and flight reporting"):
a failure (ascent-fail directly, or abort→scrub) now correctly HOLDS on a post-failure debrief card
(`held:true, exploding:true`) instead of the old behavior — a real UX improvement, not a
regression. Verified directly by pumping each to completion and inspecting the final animState.
Updated both tests' assertions to verify the new correct behavior rather than the stale one.
`test-decision-panel.js` 35/35, `test-pad-a.js` 36/36. Only `test-flight3d-trajectory.js` (Codex's
accepted physics changes, unrelated) remains as a known drift.

## BACKLOG #40: crew survival mini-arc (escape-save visual) — SHIPPED (Claude)

Investigated first: the `launch_escape` tech and its outcome-level branch (crewed ascent failure
becomes `kind:'abort'` — crew survives — instead of the crew-death path) ALREADY existed, complete
with UI warnings and flavor text. The real gap: the 3D failure VISUAL couldn't tell an escape-tower
save apart from a full catastrophe — both set `success=false/failPhase='ascent'`, so the same
explosion (and "VEHICLE LOSS" text) played either way, undercutting the "the escape system pulled
the crew clear" story line.

Fix reuses the existing failure-debrief system rather than building new geometry: the top stage
group (holding the nose/capsule) is already cloned as one discrete debris "piece"; tagged as the
escape-pod candidate at build time. On a real escape save (`spec.crewEscaped`, derived from
`outcome.kind==='abort'`, threaded spec→snapshot→effects), that piece gets a distinct fast,
mostly-upward clear-away velocity + its own brief abort-motor flash and a much slower fade, instead
of joining the generic radial debris spread every other piece gets. Readout shows "LAUNCH ESCAPE —
CREW CLEAR" instead of "VEHICLE LOSS".

Test: `tests/test-crew-escape.js` (12 checks — signal only fires for a real crewed/abort-kind/
ascent-phase save, never premature, never for uncrewed or a genuine loss; readout text). The pod
clear-away render itself isn't headless-testable (no WebGL) — every value driving it is. BACKLOG.md
#40 marked shipped.

## Tech-tree audit + fixed 2 dead capstone nodes — SHIPPED (Claude)

Ran a full structural audit of the 110-node tree (cost/depth pacing, effect-type distribution,
prereq depth, dead-end analysis). Verdict: strong core — cost scales cleanly with depth (2.8→18
avg), reliability hard-capped so the 28 reliability nodes can't trivialize risk — but ~20% filler,
concentrated in tiny passive stat nodes, and TWO genuinely dead nodes found: `megastructure_construction`
(cost 18, the single most expensive node) and `atmospheric_isru` (cost 10) both had `effect:{}` and
ZERO references anywhere else — researching them did literally nothing (worst-feel outcome for a
capstone). Wired both to real, cap-bounded effects matching their descriptions: megastructure →
buildCostCut 0.10 + buildTimeCut 1.5 (civilization-scale production economy); atmospheric_isru →
launchCostCut 0.08 (deep-space propellant relieves outer-system launch cost). Both flow through the
existing `dimCurve` soft-knee caps, so they're felt but can't unbalance. Test:
`tests/test-tech-capstones.js` (13 checks).

The larger audit finding (NOT done here, logged for a future balance pass): ~35 nodes are
+0.02-type passive stat-shavers (32% of the tree), individually imperceptible; and 36 nodes are
dead-end leaves. A tightening pass merging stat clusters (esp. the 6-node guidance reliability
chain) → ~85 punchier nodes would make each research choice matter more. Scope separately — it's a
real balance pass, not a fix.

## Tech-tree design pass — SLICE 1 (guidance) SHIPPED (Claude)

First slice of the tree-tightening balance pass (option 1: real merges, no back-compat constraint —
owner confirmed). Guidance reliability chain collapsed 6→3: radio_guidance + inertial_nav + digital_computer
→ one `digital_computer` ("Onboard Guidance & Flight Computer", req:[], reliability 0.07); star_trackers +
autonomous_navigation → one `autonomous_navigation` (req:digital_computer, reliability 0.06);
quantum_navigation kept as the deep-tail capstone. Preserved the two LOAD-BEARING ids other systems
reference (digital_computer gates deep_space/flight_automation + has a leveled sim.js variant;
autonomous_navigation feeds the autonomous_landing synergy) and the EXACT 0.15 reliability total — no
stealth buff/nerf, just fewer/punchier nodes. Removed ids (radio_guidance, inertial_nav, star_trackers)
have zero remaining references anywhere. Test: `tests/test-tech-guidance-merge.js` (18 checks).

**Pattern proven — repeat for the other clusters when ready** (each its own slice): testing (9→~4-5),
structures (7 sigma→~4), propulsion combustion sub-chain (combustion_stability→turbopump→regen→chamber,
4→~2). Same recipe: keep any id referenced externally (grep first), collapse the rest, preserve the
effect total, rewire prereqs through survivors, test for dangling reqs.

## Next task

## Flight 3D: physical Earth handoff + orbital operations — SHIPPED (Codex)

This pass turns the Flight 3D Earth-orbit segment into an interactive Mission Control sequence.
Earth-orbit flights now pause at insertion and expose four authoritative maneuver outcomes:
planned circularization, a reserve-margin-gated orbit raise, a reserve-margin-gated orbit lower,
or deorbit/recovery. The selected plan threads through settlement (payout/rep/outcome), the 3D
orbit plane, and the new Mission Control telemetry card (apoapsis, periapsis, inclination,
velocity, remaining maneuver Δv). Orbit camera drag/zoom remains enabled instead of being detached.

The launch side now uses named, event-driven camera shots (pad, tower clear, ascent, actual
booster/stage separation, insertion) and a decimated guide derived from the real integrated
trajectory plus real staging markers. Camera offsets stay player-adjustable. Default playback is
now **0.1× Slow-mo**; the existing control still cycles through 50× for coasts.

**Important visual correction:** the ascent Earth is now physically scaled (Earth mean radius
6,371 km) and permanently anchored below the pad. Its handoff is based on physical altitude rather
than animation progress: globe begins at ~28 km and completes around 96 km; camera far distance is
the real geometric horizon plus margin. The old texture guard left only a pale atmosphere shell
while a map decoded, so the Earth mesh now renders immediately with a dark-blue fallback, then
attaches the photo texture when ready. Atmosphere opacity is deliberately very low (4.5% of the
blend) to avoid masking the surface.

Files: `src/sim.js` (maneuver outcomes), `src/flight.js` (pause/HUD), `src/render.js` (orbit,
trajectory, camera, physical Earth), `src/shell.js` + `src/shell.html` (speed/HUD/responsive CSS).
Generated: `build/game.js`, `index.html`, `orbital-ventures.html`. Tests added/extended:
`tests/test-orbital-maneuvers.js`, `tests/test-launch-camera.js`, `tests/test-anim-speed.js`.

Validated after the final fallback-Earth fix: launch camera 37/37; orbital maneuvers 14/14;
flight-3D foundation 58/58; deep-failure 26/26; cislunar reentry 8/8; staging 29/29;
separation beat 10/10; regression 18/18; build parity and `git diff --check` clean.

**Claude browser follow-up:** visually fly an orbital mission and inspect the 28–96 km Earth
handoff now that the fallback globe cannot disappear. If the real horizon still needs art tuning,
change only the constants in `cape3dPhysicalAscentBlend`, the physical-Earth material, or the
camera director—do not return to a camera-relative globe. Plane changes are deliberately next;
rendezvous/docking follows after that.

Suggested (open — pick per priority):
OR pick up remaining **E4.7** scope (fold any remaining legacy 2D-canvas flight paths into the
Flight 3D adapter). Coordinate on which. If continuing staging: the detached-debris drift is
deliberately simple ballistic (no re-contact, no atmospheric tumble model) and debris is culled
3000 m below the pad — a polish pass could add a small separation flash/puff at the interstage and
a one-line "Stage 1 separation" beat on the always-visible Flight Card. Keep sim/outcome untouched.

The core separation math/logic is now visually confirmed sound (see above) — the one remaining
staging risk worth a quick real-browser check before further polish: fly two launches back-to-back
in one session and confirm the second rocket is fully intact (mesh reuse + `cape3dResetStaging`
was never exercised by the offline preview, only by the pure identity logic in code).

Two pre-existing test drifts to be aware of (NOT from the staging work — verified against a clean
pre-edit pull): `test-flight3d-trajectory.js` (Codex's accepted trajectory/vehicle-physics changes)
and, newer, `test-decision-panel.js` + `test-pad-a.js` (from the "Refine command UI and flight
reporting" commit — look like an intentional post-failure hold/debrief screen). Confirm intent and
refresh those assertions when convenient.

## Verification

```bash
node build.js
node tests/test-build-parity.js
```

Additional focused checks for this pass:

```bash
node tests/test-command-hero-layout.js
```

Focused harness commands use `tests/harness.js + build/game.js + test file`, e.g.:

```bash
node -e "const F=require('fs'); const a=F.readFileSync('tests/harness.js','utf8'), b=F.readFileSync('build/game.js','utf8'), c=F.readFileSync('tests/test-flight3d-foundation.js','utf8'); require('vm').runInThisContext(a+'\n'+b+'\n'+c);"
```

Also run `git diff --check`. Generated files are `build/game.js`, `index.html`, and
`orbital-ventures.html`; edit `src/` and run `node build.js`, never edit the generated HTML.

## Tech-tree design pass — complete, 4 slices (Claude, 2026-07-20/21)

Note for Codex (or whoever touches `RESEARCH` in `src/data.js` next): a 4-slice tree-tightening
pass just landed on `main`, triggered by a 2026-07-20 audit that found two dead capstone nodes
(fixed same session) plus ~35 individually-imperceptible passive stat-shaver nodes. Full detail
and per-slice reasoning is in `ROADMAP.md` — search "tech-tree design pass" for all 4 entries — but
the load-bearing summary is:

- `RESEARCH` is now **98 nodes**, down from 110. 12 ids were removed and folded into surviving
  nodes; 0 orphaned, 0 dangling reqs, 0 unreachable (verified by a full-tree BFS reachability proof
  after the last slice).
- **Removed ids** — do not reference these, they no longer exist: `radio_guidance`, `inertial_nav`,
  `star_trackers` (guidance); `flight_telemetry`, `vibration_testing`, `accelerated_life_testing`,
  `digital_twin`, `autonomous_qa`, `stage_test` (testing); `composite_structures`,
  `friction_stir_welding`, `carbon_cryotanks`, `self_healing_materials`, `metamaterial_structures`
  (structures); `combustion_stability`, `regen_cooling` (propulsion combustion chain).
- **Two reqs were re-pointed** onto merge survivors, not just internal chain links: `sustainer`
  now reqs `turbopump` (was `combustion_stability`); `methane_propulsion` now reqs
  `chamber_pressure` (was `regen_cooling`). This is a real gating-depth change for those two nodes,
  not just a rename — flagged explicitly in the slice-4 ROADMAP entry and in
  `tests/test-tech-combustion-merge.js`.
- No save-compat shim exists for any of this (owner waived back-compat for the whole pass). A save
  with a completed removed-id flag just carries a harmless dead key — `curRel()`/`curSigma()`/
  `researchEffectSum()` all iterate the live `RESEARCH` array, not raw `state.research` keys, so
  stale flags are inert, not broken. If you add a save-compat layer later, these are the ids to map.
- Every merge slice has its own dedicated test file (`test-tech-guidance-merge.js`,
  `test-tech-testing-merge.js`, `test-tech-structures-merge.js`, `test-tech-combustion-merge.js`) —
  run these first if you're debugging anything tech-tree-adjacent, before assuming a regression is
  new.
- This pass is considered CLOSED — no more clusters are queued. If you're picking up the remaining
  scattered +0.02-type stat-shavers flagged by the 2026-07-20 audit, note they don't form clean
  linear chains like the 4 tackled here, so the same "collapse a chain" recipe won't directly apply.

## Consolidation pass (Claude, 2026-07-22) — repo verified in a single healthy state

Pulled fresh at HEAD `7d6d0df` (Codex's "Palette Population PP.3") and reconciled against my last
push (`c62b3a6`, guidance tech-tree slice 1). Summary for whoever picks this up next:

**Everything since `c62b3a6` is sound and cleanly integrated — no conflicts found.** Checked
specifically because several commits touched files I'd been working in:

- **Tech-tree design pass**: Codex picked up the recipe from my slice-1 entry and completed slices
  2–4 (testing 9→5, structures 7→4, combustion 4→2) — the whole pass is now closed at 98 nodes (was
  110). Their handoff note above is thorough; nothing to add.
- **Camera director** (`cape3dLaunchCameraProfile`): a new named-shot system (PAD TRACKER, TOWER
  CLEAR, ASCENT TRACK, INSERTION TRACK, reactive SEPARATION shots) that layers `distMul`/`az`/`el`
  offsets on top of — not instead of — my `cape3dLaunchChaseDist` (sqrt-altitude base distance) and
  the player's manual drag/zoom (`cape3d.launchCam`). Verified the actual call site combines all
  three correctly. Clean extension.
- **`cape3dPhysicalAscentBlend`** supersedes my `cape3dAscentBlend` (progress-driven) with an
  altitude-driven Earth-reveal — a genuine correctness improvement I hadn't caught: tying the
  reveal to playback progress meant a fast, powerful vehicle would "reach space" at the same
  progress % as a slow climber regardless of real altitude. Altitude-driven is right. My old
  function is now dead code (harmless, unused) — not cleaned up, matching the pure-append/no-
  destructive-edit convention; flagging for whoever wants to prune it.
- **0.1× default playback speed**: confirmed intentional with the owner (was going to flag as a
  likely regression — it isn't). Not reverting.
- **Palette Population (PP.0/PP.1/PP.3)**: entirely self-contained in `src/parts.js` + new tests.
  Zero overlap with anything I or the mission-control pass touched.

**Stale note correction:** an earlier note here said `test-decision-panel.js` + `test-pad-a.js`
needed their assertions "refreshed when convenient" for an intentional post-failure hold screen.
That was already done (commit `2ee7888`, 2026-07-20) — and `test-pad-a.js` was independently
re-touched again by the mission-control commit for the new 0.1× default. Both are current and
passing. Disregard that note going forward.

**Full regression, clean pull, rebuilt from scratch:** 95 suites. Only `test-flight3d-trajectory.js`
fails — the same single pre-existing drift flagged for weeks (Codex's own accepted
trajectory/vehicle-physics changes). Build parity clean, `git diff --check` clean. No code changes
were needed this pass — this is a documentation/verification consolidation only.

**On Codex's direct ask** ("Claude browser follow-up: visually fly an orbital mission and inspect
the 28–96 km Earth handoff"): still can't — this sandbox has no WebGL/display, unchanged limitation.
Passing that ask through to the repo owner, who does have a browser.

**Respecting Codex's stated next direction** (plane changes, then rendezvous/docking) — not
proposing a competing next task here.

## BACKLOG #37: Max-Q structural check vs. fairing choice — SHIPPED (Claude)

"Max-Q" was a cosmetic 2D-canvas approximation (`35 + reqDv*0.003`) with zero gameplay weight; the
fairing choice was a flat, trajectory-blind reliability delta ("No fairing" always −2%, regardless
of how brutal the ascent actually was). Wired them together for real:

- `cape3dTrajectoryPlan` now exposes real per-point dynamic pressure (`qKpa`, from the same ρ/v² the
  drag term already computes) and a `maxQKpa` peak — reflecting THIS vehicle's actual diameter,
  mass, thrust, and gravity-turn shape, not a reqDv formula.
- New `vehicleMaxQ(m, vehicle)` / `structuralLoadAssessment(m, v, crewed)` (sim.js): the real peak
  Max-Q combined with fairing sensitivity (none=1.6×, standard=1.0×, heavy=0.65×; crewed=neutral,
  no fairing choice) into a bounded weight multiplier (0.6–2.4×) and a qualitative band
  (Low/Nominal/High/Severe).
- Modulates the `structures` fragility weight in `subsystemFragilities` — **attribution only**. The
  `subsystemReport` renormalization (`rel_i = R^(weight_i/ΣW)`) guarantees `∏rel_i = R` exactly
  regardless of weights, so aggregate mission difficulty is provably unchanged — verified directly
  in the test (exact equality, not approximate). A no-fairing vehicle flying an aggressive ascent
  just gets blamed for structural failures far more often, instead of an arbitrary flat penalty.
- Surfaced as a "🛡 Structural load" bench flag (both readouts) with a plain-language note
  ("no fairing on this high-Q ascent; fit one to cut structural-failure risk") so the player can see
  *why* before a failure teaches them, matching the "Vehicle scale" readout precedent.

Also fixed a real (not stale-build) test issue found while regressing: `test-pad-a.js`'s orbital
pump-loop frame budget (3000) was sized for the old 1x default speed and fell just short of `held`
at the now-intentional 0.1x default (~5ms virt/frame worst case) — bumped to 6000 with the math
documented inline.

Test: `tests/test-maxq-fairing.js` (18 checks — real q exposure, vehicle-shape sensitivity,
fairing-band response, the aggregate-neutrality invariant proven exactly, crewed-neutral
sensitivity). Regression: 96 suites, only the 1 pre-existing Codex drift.

## Next task

Suggested (open — pick per priority): #11 confirm-with-preview on destructive actions (S); #106
guided first-launch tutorial (H, none exists); or continue the tech-tree bloat cleanup (36 dead-end
leaves still untouched — different from the merged clusters already done).
