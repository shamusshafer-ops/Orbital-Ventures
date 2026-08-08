# Gate 1 evidence record

**Status:** Gate 1 implementation, validation, and three-reviewer adversarial
closure are complete. The evidence-bearing commit remains subject to explicit
user authorization.

## Checkout identity and scope

- Capture date: `2026-08-08`.
- Gate 0 baseline: `aa9c2e9f9877fa3fc56254eb0ac13f8d899e34fc`.
- Branch: `main`.
- Gate 1 contract: [GATE-1-CONTRACTS.md](../GATE-1-CONTRACTS.md).
- Machine-readable evidence:
  [headless/build results](gate1-headless-results.json),
  [two-engine browser results](gate1-browser-results.json), and the
  [locked First Flight baseline](gate1-first-flight-baseline.json).

The evidence was captured from the complete uncommitted Gate 1 working tree, so
the JSON deliberately records the Gate 0 baseline hash plus the dirty paths. The
eventual evidence-bearing commit is the immutable Gate 1 closure identity.

Both machine-readable captures independently record the same SHA-256 content
fingerprint for the complete authoritative source/test/asset/contract scope:
`4ce10e9ab894b971fbd5ea956c2f50962b629f9d9e85d49d451c0c0b68c27bf1`
(184 files, 15,535,032 bytes). Generated artifacts and evidence files are
excluded to avoid circular hashes. This digest, not the dirty baseline HEAD
alone, identifies the bytes exercised by both captures.

Gate 1 establishes one public premise, explicit truth classes, canonical
lifecycle records, one fresh-state authority, one quote/time authority, and
stable semantic action contracts. It does not implement atomic launch
transactions, rebalance the opening economy, replace the trajectory model,
redesign onboarding, or add content.

## Gate 1 contract lane

Command:

```bash
node tests/run-gate1-contracts.js
```

Recorded result: **5/5 suites passed; 102/102 checks passed**.

| Suite | Result | Contract covered |
|---|---:|---|
| `test-gate1-truth-contract.js` | 25/25 | Premise, public vocabulary, operational Oort/heliopause boundary and power environment, legacy profile-radiation fallback, truth kinds, sources, map/fusion disclosure. |
| `test-gate1-state-contract.js` | 22/22 | Independent fresh state, adversarial JSON safety, schema/defaults, v60 frozen-spec backfill, load rejection, stale callback reset. |
| `test-gate1-quote-contract.js` | 22/22 | Pure quote authority, locked baseline, stock-adjusted window execution, staged affordability and timing. |
| `test-gate1-interaction-contract.js` | 18/18 | Stable semantic actions, exact subjects, keyboard/modal/accessibility ownership. |
| `test-gate1-lifecycle-regressions.js` | 15/15 | Complete physical order snapshot, one pre-transfer execution quote, all launch surfaces, exact ownership/scrap audit, and promoted G0-B06/G0-B07 behavior. |

The locked Engineer/First Flight fixture remains $3.50M starting capital,
$0.44M immediate build, $0.24M build carry, $0.14M later flight burn, $0.12M
ready-hull reserve, 60 days to ready, 90 days build-to-launch, 65% modeled
reliability, and $0.94M end-to-end runway.

## Build parity and full headless sweep

Commands:

```bash
node build.js
node build.js --check
node tests/test-build-parity.js
node tests/run-gate0-evidence.js --output docs/evidence/gate1-headless-results.json
```

Recorded results:

- Build completed; `orbital-ventures.html` is 18,694,221 bytes and
  `build/game.js` is 1,984,706 bytes.
- Generated artifacts matched source: `build parity ok`.
- Isolated fixtures passed 3/3 build-parity and 2/2 texture-embedding checks.
- Full sweep: **135/137 suites passed, 0 unexpected reds**.
- `test-flight3d-trajectory.js` remains the exact known-red Gate 5 physics suite.
- `test-progress-unify.js` remains the explicit forward-work skip with `RUN_F4`
  unset.

The linked headless JSON preserves every command, suite result, exit code,
elapsed time, stdout/stderr, environment, generated artifact size, and
classification.

## Expected-failure quarantine

Command:

```bash
node tests/run-expected-failures.js
```

Recorded result: **6 reproduced, 0 unexpected**.

| Boundary | Result | Next owner |
|---|---|---|
| G0-B01 Skip can orphan an in-flight hull | XFAIL retained | Gate 2 transaction ownership |
| G0-B02 reload can lose weather-boundary ownership | XFAIL retained | Gate 2 serialization/resume |
| G0-B03 terminal evaluation can precede resolution | XFAIL retained | Gate 2 terminal sequencing |
| G0-B04 successful payout can leave a stale terminal latch | XFAIL retained; 364/1000 seeded trials | Gate 2 terminal sequencing |
| G0-B05 recommended opening path is $0.26M short | XFAIL narrowed to honest staged affordability | Gate 3 non-Ironman continuity |
| G0-B08 duplicate delivery can debit twice | XFAIL retained | Gate 2 request idempotency |

G0-B06 is promoted: the ready-hull action is now a primary exact-hull launch
action and refreshes its owning UI immediately. G0-B07 is promoted: build, carry,
later burn, reserve, timing, and modeled probability are visibly staged from the
same quote authority. Neither remains in the failure manifest.

## Real-browser contract and quarantine

Command used for this host:

```bash
OV_CHROMIUM_WEBDRIVER_BINARY=/tmp/ov-chrome-testing.kfNw8D/chromedriver \
OV_CHROMIUM_BINARY=/tmp/ov-chrome-testing.kfNw8D/chrome \
node tests/run-browser-gate0.js \
  --json-output docs/evidence/gate1-browser-results.json
```

The full synthetic player flow first proves the new positive Gate 1 contract:
the primary commitment keeps its semantic id across a re-render and its displayed
stages match the live quote authority. After rollout, Bench, production manifest,
both Command surfaces, and planner all bind the same exact order, hull, semantic
request id, frozen-order flight burn, and reserve. A native Fly button, key repeat,
and an open modal retain keyboard ownership; Tab remains trapped in the modal;
document-level Space then launches that exact hull. The flow subsequently crosses
the deliberately unfixed Gate 2 boundaries.

| Engine | Browser / driver | Positive Gate 1 result | Retained quarantine | Full-flow wall time |
|---|---|---|---|---:|
| Firefox | Firefox 153.0 / geckodriver 0.37.0 | all five staged exact-hull surfaces; keyboard ownership; Space route | XFAIL G0-B01 and G0-B08 | 2,939 ms |
| Chromium | Chrome for Testing 151.0.7922.77 / matching ChromeDriver | all five staged exact-hull surfaces; keyboard ownership; Space route | XFAIL G0-B01 and G0-B08 | 2,568 ms |

Combined result: **4 expected reproductions, 0 unexpected results, 0 unavailable
engines**. The browser flow legitimately observes live post-research quote
values rather than assuming the locked fresh-state baseline; it asserts the UI
against the current quote authority in each engine.

## Adversarial reviewer sign-off

The same three independent reviewers who scoped Gate 1 inspected fingerprint
`4ce10e9ab894b971fbd5ea956c2f50962b629f9d9e85d49d451c0c0b68c27bf1`:

- Design and playability reviewer (Banach): **APPROVED** — the design contract,
  frozen legacy-order backfill, unchanged profile-radiation balance, heliopause
  truth, and exact ready-hull quote execution have no remaining Gate 1 blocker.
- Engineering and UX reviewer (Pascal): **APPROVED** — frozen physical specs,
  single validated execution quote, v60 backfill, and the pinned legacy
  radiation fallback are correctly implemented and regression-tested.
- Space realism and aesthetic reviewer (Aquinas): **APPROVED** — heliopause
  identity/environment and Oort's reference-only role are truthful; detailed
  trajectory and presentation work remain correctly assigned to Gates 5 and 6.

Every credible blocking finding from the first and second passes was fixed and
its affected evidence rerun before approval.

## Gate 1 closure checklist

- [x] Public premise, truth labels, source registry, and capstone vocabulary are explicit.
- [x] Fresh state and JSON-safe lifecycle schema have one authority.
- [x] First Flight quote/time baseline is locked without a balance change.
- [x] Stable semantic action descriptors and accessibility ownership are enforced.
- [x] G0-B06 and G0-B07 are positively promoted.
- [x] Contract lane, full headless sweep, and two-engine browser evidence are durable.
- [x] Remaining failures are exact, reproduced, and assigned to later gates.
- [x] All three original reviewers approve the finished Gate 1 diff.
- [ ] Gate 1 closure is committed and pushed when explicitly requested.
