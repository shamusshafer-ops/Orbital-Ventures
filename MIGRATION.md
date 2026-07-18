# MIGRATION.md — 3D Viewport + Deeper Orbital Mechanics

**Status:** Scoping / not started. Renderer path and orbital-mechanics depth RESOLVED
(2026-07-18); remaining opens are build-time details + E-workstream numbering (§9).
**Authoritative status source:** `ROADMAP.md` (this doc is the plan; ROADMAP tracks execution).
**Owner:** Shamus
**Last updated:** 2026-07-18

> **Framing correction.** This started as a "port to C++/Python/Godot" question.
> After checking ROADMAP, that framing is moot: there is no monolith to escape and
> no performance wall. The web build is already modular (E0.1) and the real orbital
> math is cheap. This is therefore **two features on the existing web base**, not a
> migration — a 3D map viewport, and (optionally) deeper *decision-bearing* orbital
> mechanics. The doc keeps the name MIGRATION.md only so existing references hold.

---

## 1. Goals (from the user)

1. Deeper orbital mechanics.
2. Tracking of individual ships.
3. Better graphics — a real 3D solar system with camera control.

Each is re-scoped in §4 against what already exists.

---

## 2. Status correction — what is ALREADY true (verified against ROADMAP 2026-07-18)

The pre-session memory was behind the 2026-07-16/17 work. Reality:

- **The build is already split and modular (E0.1, 2026-07-10).** Eight classic-script
  modules — `src/data.js parts.js sim.js save.js shell.js flight.js render.js main.js`
  (`parts.js` added by E3) — loaded in order into **one shared global scope**. `node build.js` concatenates them into
  `orbital-ventures.html` (single inline `<script>`, "open the file and play"),
  `index.html` (dev, `<script src>` tags), and `build/game.js` (harness input). This
  is a **zero-dependency string concat, deliberately NOT ES modules or a bundler** —
  the 241 string `onclick=` handlers require global functions. *There is no Phase 0.
  Do not introduce esbuild/Vite/rollup; it fights a deliberate architecture.*
- **Individual-asset tracking already exists (Fleet Registry #115, 2026-07-17,
  both slices).** `assetRegistryGroups()` (sim.js) is a DOM-free normalized collector
  covering in-flight vehicles, logistics, bases/stations, the LEO depot, standing
  programs, and the astronaut corps, rendered as an accordion board. Goal 2 is mostly
  done; only *persistent hull identity across flights* remains (see §4-B).
- **A substantial physics-realism pass already shipped (2026-07-17):** orbital
  inclination as a real plane-change Δv tax (#inclination slices 1+2), ground-track
  visualization (#45), launch-azimuth ceiling / dogleg tax, one-way comm light-lag,
  solar-conjunction blackout, orbital-decay/station-keeping. Two more are *scoped but
  not built*: the tracking-station network requirement (#89) and additional
  inclination economics (#30, a second launch site).
- **The physics core is pure-Tsiolkovsky by deliberate design:** Δv / mass-ratio /
  per-leg budgets, **no orbital elements**. Planet positions still use the M3b-i
  **synodic approximation** (~26-month Earth–Mars cadence with quality variance).

---

## 3. Inherited design philosophy (binding constraints, not suggestions)

These come straight from how the codebase already works. Any plan here obeys them.

1. **Physics is added only where it is a real, decision-bearing cost.** The inclination
   work is the template: it modeled plane-change Δv *because GEO comsats really pay it*,
   not to draw a curve. Corollary: **do not add full orbital-element propagation merely
   to make a 3D view accurate.** If new orbital mechanics go in, they must create real
   decisions (windows, phasing, plane changes, rendezvous), or they don't go in.
2. **No fabricated telemetry.** Fleet Registry deliberately shows *no* location/Δv/
   consumables for passive contracts because none exists — "fabricating it would be
   exactly the fake telemetry the feature exists to avoid." A 3D view must render only
   what the sim actually knows, or must earn the data by adding real mechanics (per #1).
3. **Single-file-playable core; optional graphics layers may CDN-load if guarded.**
   The established house style (verified in `src/shell.html`) is: the core sim is
   standalone in one inline script, and **optional decorative graphics load from a
   pinned CDN with *all* use guarded so absence degrades gracefully** — that's exactly
   how Phaser 3 is already included (`phaser@3.90.0` via jsDelivr, "ALL Phaser use is
   guarded"). So a new graphics dependency is admissible *if* it follows that pattern:
   pinned CDN, every call guarded, a working fallback when it doesn't load. Not
   inline-vendored (no build bloat); not unguarded (no hard offline break of the sim).
4. **Opt-in scalar fields + identity-guarantee tests.** New physics attaches as optional
   fields (like `m.inclination`) that leave every existing mission numerically untouched,
   proven by a test asserting no number moves (the inclination `effectiveReqDv===reqDv`
   identity test is the pattern). No silent rebalancing of the ~37 existing missions.
5. **Headless-validated before push.** `node build.js` then concat `harness.js` +
   `build/game.js` + test file, run as one script. Physics is fully testable this way;
   rendering is not (see §5).

---

## 4. Re-scoped goals

### A. Deeper orbital mechanics — a real fork to settle

Per §3.1, "deeper orbital mechanics" is only legitimate if it's decision-bearing. Two
honest directions (not mutually exclusive, but different amounts of work and risk):

- **A1 — Truthful ephemeris, no new gameplay physics.** Replace the *synodic
  approximation* for planet positions with real elliptical-orbit positions over time
  (Kepler's equation per planet, on-rails). This makes transfer-window *timing* and the
  eventual 3D view geometrically honest without touching the Tsiolkovsky per-leg budget
  model. Modest, low-risk, headless-testable against real 2026–2033 Mars window dates.
  It's *positions*, not a new cost — so it borders on §3.1's "just for visuals" line;
  it's justified only because window timing is already a real mechanic the current
  approximation fakes.
- **A2 — Orbital elements as real gameplay** (the ambitious read of the goal). Phase
  angle / launch-window quality as a real Δv-and-time decision; rendezvous & phasing for
  reuse/refuel; extend the existing inclination tax into a fuller plane-management layer.
  Each lands as an opt-in scalar field per §3.4, following the inclination slice template
  exactly. This is where "deeper orbital mechanics" becomes *felt*, not decorative.

**RESOLVED (2026-07-18): A1 + A2.** A1 first (it de-fakes windows and underpins honest
3D geometry), then A2 mechanics one opt-in slice at a time, each following the inclination
slice template (opt-in scalar field + identity-guarantee test, no rebalancing of existing
missions). A full n-body/Keplerian *ship* propagator remains explicitly **out of scope** —
on-rails Keplerian positions (A1) plus discrete decision-bearing costs (A2) deliver
"deeper orbital mechanics" without a per-frame integrator the design values don't want.

### B. Persistent ship identity (narrow — registry already exists)

Fleet Registry #115 tracks *active flights and facilities*, not persistent hulls. The
gap: a ship as a durable object with identity, flight history, and reuse count that
exists *between* missions and feeds the depot/ISRU/reuse systems. Small, additive,
save-versioned. Reuses the #115 collector shape.

### C. 3D solar-system viewport (Three.js — see §6)

The Solar System map tab becomes a 3D scene (sun, planets on real §A1 positions, orbit
ellipses, individual ships as tracked markers, time-warp-aware, pan/zoom/focus-on-ship),
rendered with Three.js via the §6 CDN+guard+shim integration. The management-sim shell —
all benches (incl. the E3 SVG part builder), tech tree, econ panels, Outliner, Advisor,
Chronicle, personnel, save UI — is untouched.

---

## 5. What can and cannot be validated headlessly

- **Testable (gate before push):** all §A physics — Kepler solver convergence,
  window-date accuracy, plane-change Δv, propagate-forward-then-back round-trips,
  the §3.4 identity guarantees; §B registry-collector correctness and save migration
  parity.
- **NOT testable (needs your browser playtest):** the 3D view's visual correctness and
  feel. Same constraint as BENCH_V2 and the Fleet Registry board — this sandbox has no
  browser. Maximize the testable scene-*math* layer (world→screen positions, camera
  transforms, time-warp stepping) and keep a written playtest checklist; do not flip the
  3D tab to default-on until a real playtest pass.
- **Harness gap to fix first (from the 2026-07-17 log):** the harness has *no seedable
  RNG*, which already flaked `test-station-slice2` and hid a latent `dockModuleNow`
  crash. Add seedable RNG to the harness before the time-advancing propagation tests in
  §A, so they're deterministic.

---

## 6. Renderer path — RESOLVED (2026-07-18): Path 2, Three.js

Alternatives considered: **Path 1** (hand-rolled canvas 3D-projection, zero new
dependency, generalizing the existing orthographic `P(lon,lat)` Earth-globe projection —
theme-fit but capped at vector/instrument visuals) vs **Path 2** (Three.js / WebGL — real
meshes, textures, lighting, shaders, photoreal ceiling). **Chosen: Path 2**, for the
higher visual ceiling.

**Integration (follows the Phaser precedent — §3.3, verified in `shell.html`):**
- **Pinned CDN `<script>`, not inline-vendored.** Add Three.js the same way Phaser is
  added — a single pinned jsDelivr tag — so there's no single-file bloat and no build
  change. (This is why the earlier "~600KB vendored, bloats the file" concern does *not*
  apply here.)
- **Guard all use → 2D fallback.** Every Three.js call is guarded exactly like Phaser's,
  so if the CDN/WebGL is unavailable the map degrades to the existing 2D Solar System
  view instead of hard-failing. The 2D map is retained as that fallback, not deleted.
- **ESM→global shim (build-time item).** Modern Three.js is ESM-only (the global
  `three.min.js` UMD build was dropped ~r160), but the game is classic-script/global
  scope. Load Three.js via a tiny module shim that runs *before* the game script and
  stashes it globally, e.g.
  `<script type="module">import * as THREE from '…three.module.js'; window.THREE = THREE;</script>` —
  this uses current Three.js as ESM without making any of the game's 241 `onclick`
  handlers modular. Pin the exact `three` version in that URL. (Alternative: pin an older
  release that still ships the UMD global build — rejected; the shim keeps us on current
  Three.js.)
- **Guarding note:** because the shim is async (module scripts defer), Three.js may not be
  present at first paint — the guard must treat "not loaded yet" the same as "absent" and
  the 3D tab must initialize on first open, not at boot.

---

## 7. Proposed sequence (assign E-workstream numbers in ROADMAP when adopted)

```
(pre)  Harness: add seedable RNG                  [Sonnet; small, enabling]
 A1    Truthful planetary ephemeris (on-rails)     [heavy — math core, window tests]
 C.0   Three.js CDN tag + ESM→global shim + guard  [Sonnet; small, plumbing per §6]
 C.1   3D scene math + camera (headless-testable)  [heavy design → Sonnet features]
 C.2   Ships as tracked markers on §A1 positions    [heavy seam → Sonnet]
 B     Persistent hull identity + save migration    [heavy design → Sonnet wiring]
 A2    Orbital-element gameplay, opt-in slices       [heavy per slice]
 C.3   Flight animations into the 3D scene;          [Sonnet + heavy seams]
       retire 2D-canvas flight paths (incl. folding
       unified-overlay Slices B/C/D straight to 3D,
       per the prior-session decision — no 2D versions)
```

Each step leaves a shippable game; nothing goes dark. Goals 1–2 (§A1 + §B) can land
before any renderer change. §C is the visible payoff.

---

## 8. Cross-cutting

- **Save versioning.** §B adds ship-registry state; §A2 slices add opt-in fields. Each
  bumps `SAVE_VERSION` (currently 54+ as of E3.5 — confirm in `save.js`) with a
  non-destructive migration + a migration-parity test, per the E3.5 pattern.
- **Build/test.** No change to the zero-dep concat. Continue `node build.js` → concat
  harness + `build/game.js` + test → node. ESLint against the concatenated build.
- **PAT workflow.** Git Data API via Python/urllib (blob→tree→commit→ref PATCH).
  Session-scoped token, reused across pushes within a session, revoke at session end.

## 9. Open items (build-time, non-blocking for adoption)

1. **Three.js version pin** for the CDN tag + ESM shim (§6) — decide at C.0 build time.
2. **A2 slice list** — which orbital-element decisions to model, in what order (phase-
   angle window quality, rendezvous/phasing for reuse, extended plane management). Scope
   each as its own opt-in slice when reached, per the inclination template.
3. **E-workstream numbering** for the §7 steps (slot into ROADMAP's E-series on adoption).
