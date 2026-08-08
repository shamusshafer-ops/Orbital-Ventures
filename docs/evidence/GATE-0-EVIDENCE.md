# Gate 0 evidence record

**Status:** Gate 0 implementation and evidence are complete; closure is recorded
by this evidence-bearing commit on `main`.

## Checkout identity and capture environment

- Capture date: `2026-08-08`.
- Baseline/base commit: `bfe31ff1b53bc86a058ea35891b68f06605ae12a`
  (`Tier 3.2: persistent history archive (state.annals)`).
- Branch: `main`.
- Two-engine browser and audit host recorded on 2026-08-08:
  `Linux Hal9100 6.6.87.2-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC Thu Jun 5 18:30:46 UTC 2025 x86_64 GNU/Linux`.
- Closing commit: **this Gate 0 closure commit on `main`**. Its immutable hash is
  the Git object containing this evidence record.
- Machine-readable evidence:
  [headless/build results](gate0-headless-results.json) and
  [browser results](gate0-browser-results.json). These record checkout state,
  commands, exit codes, raw suite output, artifact sizes, browser capabilities,
  and per-engine flow results.

Identity commands:

```bash
git rev-parse HEAD
git status -sb
uname -a
```

## Build parity

Commands:

```bash
node build.js --check
node tests/test-build-parity.js
```

Recorded results:

- `node build.js --check`: `build parity ok`.
- Isolated build-parity fixture: `3/3 build parity checks passed`.
- Texture-embed split fixture: `2/2 texture-embed split checks passed`.

## Full headless sweep

Recorded result: 132 `tests/test-*.js` suites were present; 130 suites passed,
one was an explicit empty quarantine, and one matched its exact known-red
signature. `test-flight3d-trajectory.js` was the known-red suite, with 13/31
checks passing and 18 previously known trajectory/vehicle-physics expectation
failures. `test-progress-unify.js` exited 0/0 with `RUN_F4` unset and remains an
explicit expected-forward quarantine rather than evidence of implemented F4 work.

The canonical per-suite construction documented in `tests/README.md` is:

```bash
cd tests
cat harness.js ../build/game.js test-regression.js > bundle.js
node bundle.js
```

The durable closing rerun is implemented by:

```bash
node tests/run-gate0-evidence.js --output docs/evidence/gate0-headless-results.json
```

The linked JSON retains every suite's command, exit code, elapsed time, stdout,
stderr, and classification. It exits nonzero for any additional red suite or if
the named trajectory drift unexpectedly passes without being reclassified.

## Expected-failure quarantine

Command:

```bash
node tests/run-expected-failures.js
```

Recorded result: `8 reproduced, 0 unexpected`.

Recorded deterministic inputs:

- G0-B04: seeds `1…1000`; 364 solvent-but-terminal-latched results.
- G0-B05: seed `7`; the prominent static-fire risk-reduction path ends with
  `$0.25M` and a surfaced, enabled, displayed-affordable exact-hull action that
  execution rejects. Eventual recovery routes are not exhausted.
- Other fixtures construct or force their boundary directly; no unrecorded random
  seed should be inferred for them.
- G0-B08's headless direct-call fixture is supporting evidence only. The linked
  browser JSON contains the required same-retained-control reproduction.

## Artifact sizes

Recorded pre-removal measurements:

| Artifact | Bytes |
|---|---:|
| `src/` tracked content | 2,069,507 |
| `tests/` tracked content | 823,804 |
| `assets/` tracked content | 12,443,285 |
| `godot-base-bench/` export | 39,874,905 |
| `godot-base-bench/index.wasm` | 39,513,091 |
| `godot-base-bench-src/` editable source | 31,227 |

Recorded post-removal measurements:

| Artifact | Bytes |
|---|---:|
| `orbital-ventures.html` standalone release | 18,654,000 |
| `build/game.js` bare game script | 1,945,584 |
| Active Godot payload | 0 |

Commands for the closing rerun. The `git ls-files` forms preserve the recorded
"tracked content" definition; `du` would also count untracked files and is not an
equivalent measurement:

```bash
wc -c orbital-ventures.html build/game.js
git ls-files -z src | xargs -0 wc -c
git ls-files -z tests | xargs -0 wc -c
git ls-files -z assets | xargs -0 wc -c
test ! -e godot-base-bench && test ! -e godot-base-bench-src
rg -n -i 'godot|baseGodot|godot-base-bench' src tests MIGRATION.md ROADMAP.md
```

The final search is expected to retain historical prose in `MIGRATION.md` and
`ROADMAP.md`; it must find no active runtime, player control, test, or payload
dependency.

## Real-browser Skip/reload flow

Command:

```bash
node tests/run-browser-gate0.js
```

The harness serves the generated game locally with optional Phaser and Three.js
CDN tags removed in memory. It performs synthetic DOM `button.click()` activations;
its elapsed value is full-flow automation wall time, not human onboarding time or
time-to-launch.

Recorded browser configuration and results:

| Engine | Browser / driver | Headless flags | Result | Full-flow wall time | Synthetic activations |
|---|---|---|---|---:|---|
| Firefox | Firefox 153.0 / geckodriver 0.37.0 | `-headless` | XFAIL G0-B01: exact `hull_1` orphaned; XFAIL G0-B08: same control creates 2 orders/$0.88M | 3,046 ms | 16 player-facing, 7 dev-control, 1 reload; plus 2 B08 activations |
| Chromium | Chrome for Testing 151.0.7922.77 / ChromeDriver 151.0.7922.77 | `--headless=new --disable-gpu` (sandbox retained) | XFAIL G0-B01: exact `hull_1` orphaned; XFAIL G0-B08: same control creates 2 orders/$0.88M | 2,077 ms | 16 player-facing, 7 dev-control, 1 reload; plus 2 B08 activations |

The [browser JSON](gate0-browser-results.json) records the runner and driver
commands, base commit and dirty status, OS/Node environment, requested and
negotiated capabilities, driver versions, bounded graceful shutdown, and exact
per-flow ownership/ledger results. The combined run used neither
`--allow-missing` nor `OV_CHROMIUM_NO_SANDBOX` and reports **4 reproduced,
0 unexpected, 0 unavailable**.

## Gate 0 closure checklist

- [x] Full-sweep raw artifact and exact aggregate command retained.
- [x] Firefox and Chromium raw results/capabilities retained.
- [x] G0-B08 browser double-delivery evidence retained.
- [x] Engineering JSON evidence linked here.
- [x] Closing commit is this evidence-bearing Gate 0 commit on `main`.
- [x] No additional red suite or active Godot dependency introduced.
