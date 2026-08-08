# Gate 0 baseline — freeze and reproduce

**Captured:** 2026-08-08. **Scope:** stabilization only; no feature, renderer,
destination, technology, facility, economy-layer, or strategic-layer work may enter
this worktree before Gate 7 reopens it.

## Evidence labels

- **Measured** means observed from this checkout or a command recorded below.
- **Review observation** means a finding from the preceding three-reviewer
  stabilization assessment; it is a required reproduction, not yet a confirmed
  automated regression.
- **Target** is a Gate 0 deliverable, not a claim about current behavior.

The command-level audit record, including explicit gaps that must be closed before
Gate 1, is [docs/evidence/GATE-0-EVIDENCE.md](evidence/GATE-0-EVIDENCE.md).

## Repository and build context

- **Measured:** repository `Orbital-Ventures`, branch `main`, commit
  `bfe31ff1b53bc86a058ea35891b68f06605ae12a` (`Tier 3.2: persistent history
  archive (state.annals)`); worktree was clean when captured.
- **Measured:** the application is zero-dependency classic JavaScript: eight
  ordered shared-global modules in `src/` plus `src/shell.html`; `build.js`
  emits standalone release HTML, dev HTML, and `build/game.js`.
- **Measured:** 132 `tests/test-*.js` Node/headless suites are present. The
  harness stubs DOM, canvas, audio, and storage; it is not a real-browser test
  environment.
- **Measured:** `orbital-ventures.html`, `index.html`, and `build/game.js` are
  present and `node build.js --check` reports `build parity ok`. The isolated
  `node tests/test-build-parity.js` fixture suite passes **3/3** parity and
  **2/2** texture-embed checks.
- **Measured:** tracked content footprint at capture: `src/` 2,069,507 bytes,
  `tests/` 823,804 bytes, `assets/` 12,443,285 bytes. The active Godot export is
  39,874,905 bytes (its WASM is 39,513,091 bytes); its editable prototype source
  is 31,227 bytes.

## Existing validation and review evidence

- **Measured:** `test-progress-unify.js` exits **0/0** unless `RUN_F4=1`; its
  header calls this an intentional expected-forward test for unfinished F4 work.
  It must remain visibly quarantined until either implemented or removed by an
  approved scope decision.
- **Measured:** the current full headless sweep records **130 passing suites,
  1 explicit empty quarantine, and 1 known-red suite**. The known-red suite is
  the previously documented `test-flight3d-trajectory.js`,
  which passes **13/31 checks** and retains 18 long-standing trajectory/vehicle-
  physics expectation failures. No other red result is normalized as
  pre-existing.
- **Measured (historical browser evidence):** the Godot handoff records a
  headless Firefox 153 localhost integration check; the architecture and roadmap
  documents also contain targeted Firefox/WebGL observations. No Chromium,
  Firefox opening-workflow, or WebKit release-candidate suite exists at capture.
- **Review observation:** the first-session path exposes too many systems and
  competing work surfaces before the player can reliably research, build, and
  fly. Existing UI screenshots cover Command Center at 1280×800, 1366×768,
  1536×1024, and 1920×1080, but are not a timed/click-count onboarding study.

## Blocker register and deterministic reproduction contracts

| ID | Observed blocker contract | Evidence and current status |
|---|---|---|
| G0-B01 | Skip can consume an unresolved flight. | `tests/expected-failures/skip-before-decision.js` plus the two-browser Skip/reload flow. |
| G0-B02 | Reload can lose active launch ownership. | `tests/expected-failures/launch-save-boundaries.js` reaches a production weather hold and checks exact mission/hull ownership across ordinary and lifecycle-forced save. Later live/reserve/ops/anomaly/rescue/arrival boundaries remain separate G2 coverage obligations. |
| G0-B03 | A weather scrub can trigger premature game-over. | `tests/expected-failures/weather-scrub-premature-terminal.js` observes two terminal calls while the transaction still owns an in-flight hull. |
| G0-B04 | The terminal latch can remain stale after a weather scrub even when cash is still positive. | `tests/expected-failures/weather-scrub-gameover.js` reproduces 364 solvent-but-terminal-latched states across seeds 1…1000. |
| G0-B05 | The prominent opening risk-reduction path through static fire can block the ready hull. | `tests/expected-failures/static-fire-opening.js` runs that path at seed 7 and proves that its surfaced, enabled, displayed-affordable exact-hull action is rejected. It does not claim that every player was instructed to take the separate bench test or that all eventual recovery routes are exhausted. |
| G0-B06 | The exact-hull Hangar flight control can be visually subordinate, ghosted, or stale after ownership changes. | `tests/expected-failures/hangar-fly-action.js` checks the ready hull's control prominence and verifies that consuming that exact hull requires an immediate refresh. |
| G0-B07 | Commitment surfaces omit staged cash requirements and underquote ready-hull affordability. | `tests/expected-failures/commitment-quote.js` separates immediate build commitment, later flight burn, operating carry, and the valid displayed-price/affordability mismatch. |
| G0-B08 | Repeated delivery of one build activation duplicates work. | `tests/browser/gate0-duplicate-control.js` retains one rendered **Build & Launch** node and activates that same node twice in one browser task; both engines produce two orders and a $0.88M debit instead of one order/$0.44M. The headless fixture is supporting mutation evidence only. |

**Measured:** `node tests/run-expected-failures.js` reports **8 reproduced,
0 unexpected**. The inversion runner accepts only reserved exit code 42 with an
exact structured known-failure result; setup errors, ordinary exit 1, signals,
timeouts, crashes, malformed results, and unexpected passes fail. The real-browser
quarantine covers startup → research → build → rollout → launch → Skip →
save/reload plus same-control duplicate delivery in both required engines.

## Opening baseline metrics

| Metric | Current baseline | Gate 0 target |
|---|---|---|
| Automated full-flow wall time and synthetic DOM activations | Firefox: 3,046 ms; Chromium: 2,077 ms for the entire startup → research → build → rollout → launch → Skip → reload/Continue flow. Each used 16 synthetic player-facing DOM activations, 7 separately counted synthetic dev-control activations, and 1 reload. | Repeat after each workflow redesign. This is automation throughput, not human onboarding time or time-to-launch. |
| Visible top-level navigation after Engineer startup | 6 visible entries: Command Center, Design Bench, R&D, Solar System, Station Bench, Base Bench. Only Command Center is the active central view. This does not count every system exposed inside those views. | Use as the top-level progressive-disclosure baseline. |
| Opening solvency/failure recovery | The prominent static-fire path ends at $0.25M with a displayed-affordable enabled action that is rejected; later recovery routes are not exhausted by this fixture. Constrained launch seeds produce 364/1000 solvent-but-terminal-latched states, all with bridge loans still available. | G3 must eliminate permanent failure outside Ironman and add the locked continuity route. |
| Browser defects | Firefox 153.0/geckodriver 0.37.0 and Chrome for Testing 151.0.7922.77/ChromeDriver 151.0.7922.77 both reproduce the exact orphaned `hull_1` after Skip/reload and the same-control duplicate build (2 orders/$0.88M vs 1/$0.44M). | Promote both browser quarantines to required passing regressions in G2. |
| Release/runtime payload | Pre-removal Godot export: 39,874,905 bytes. Post-removal: standalone release 18,654,000 bytes; bare game script 1,945,584 bytes; no Godot payload. | Runtime remains the web player with optional Phaser 3.90.0 and Three.js 0.185.1 CDN enhancement; both have non-Godot fallbacks. |

## Godot removal inventory

- **Measured before removal:** `src/render.js` rendered the Base Bench **Godot
  test** button, iframe, bridge state, postMessage handling, and lifecycle
  functions; the assembly test asserted that bridge. `godot-base-bench-src/`
  held the prototype source and `godot-base-bench/` held its generated Web
  payload.
- **Measured after removal:** the player controls, runtime detection,
  iframe/bridge code, generated export, prototype source, active tests, and
  active documentation dependencies have been removed. The existing Three.js
  and SVG Base Bench remain. Deleted tracked material is recoverable from Git.

## Deferred until stabilization completes

New worlds, missions, facilities, technology branches, graphics engines,
procedural expansion, multiplayer, new currencies, and additional management
layers are frozen. Gate 0 may add only reproduction harnesses, browser-test
scaffolding, measurement instrumentation, and removal work needed to establish
the next gate's authoritative foundations.

## Gate 0 exit criteria

1. Every known blocker in G0-B01…G0-B08 has a deterministic reproduction and
   visible issue identifier; known-red tests are explicitly quarantined.
2. Chromium and Firefox execute the minimal opening workflow through the
   real-browser scaffold; results and known gaps are recorded.
3. The production player build has no Godot control, runtime, payload, active
   test, build/package, or active-documentation dependency.
4. Baseline measurements above are captured with commands, seed(s), browser
   version(s), and artifact sizes; build/test status distinguishes fixture,
   headless, and real-browser evidence. Any missing raw artifact is explicitly
   marked pending in the linked evidence record rather than inferred from prose.
5. No frozen feature work is introduced, and this document is updated with the
   closing commit and evidence links before Gate 1 begins.
