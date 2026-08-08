# Gate 2 evidence record

**Status:** implementation, automated acceptance, and three-reviewer
adversarial closure are complete. The evidence-bearing commit remains subject
to explicit user authorization.

## Checkout identity and scope

- Capture date: `2026-08-08`.
- Gate 1 baseline: `cf1fb4940d4014d9ba158520caa18f91f4850cae`.
- Branch: `main`.
- Contract: [GATE-2-CONTRACTS.md](../GATE-2-CONTRACTS.md).
- Machine-readable evidence:
  [headless/build results](gate2-headless-results.json) and
  [two-engine browser results](gate2-browser-results.json).

Both captures identify the complete authoritative source, test, asset, and
Gate 1-2 contract scope with the same SHA-256 content fingerprint:
`ef73f14331f70ce5ae33879304e8337c928807ff6a0a90e065d8ec067e5870e2`
(189 files, 15,593,634 bytes). Generated artifacts and evidence are excluded
from that digest to avoid circular hashes.

Gate 2 adds save-v62 launch transactions, stable mutation receipts, exact hull
ownership, safe decision checkpoints, reload projection, idempotent delivery,
post-settlement terminal ordering, and capability-honest vehicle/crew
disposition. It promotes G0-B01, G0-B02, G0-B03, G0-B04, and G0-B08. The only
remaining Gate 0 quarantine is G0-B05, assigned to Gate 3 economy continuity.

## Contract lanes

Commands:

```bash
node tests/run-gate1-contracts.js
node tests/run-gate2-contracts.js
node tests/run-expected-failures.js
```

Recorded results:

- Gate 1: **5/5 suites; 102/102 checks**.
- Gate 2: **3/3 suites; 49/49 checks**.
- Quarantine: **only G0-B05 reproduced; 0 unexpected**.

The Gate 2 lane covers canonical request identity, one exact lifecycle owner,
v62 rejection/migration, every decision's persisted projection, Skip behavior,
weather/rescue mutation barriers, exact autosave reload, orphan-hull rejection,
exactly-once outcome and terminal settlement, fitted recovery, and LES/no-LES
live-abort truth.

## Build parity and full headless sweep

Commands:

```bash
node build.js
node build.js --check
node tests/run-gate0-evidence.js --output docs/evidence/gate2-headless-results.json
```

Recorded results:

- Build parity: **passed**.
- Generated sizes: `orbital-ventures.html` 18,726,316 bytes;
  `build/game.js` 2,016,801 bytes; `index.html` 119,842 bytes.
- Full sweep: **138/140 suites passed; 0 unexpected reds**.
- Known red: `test-flight3d-trajectory.js` (Gate 5 trajectory physics).
- Known skip: `test-progress-unify.js` with `RUN_F4` unset.

The linked JSON preserves commands, environment, complete suite output,
classifications, build sizes, worktree provenance, and the shared fingerprint.

## Real-browser acceptance

Command used on this host:

```bash
OV_CHROMIUM_WEBDRIVER_BINARY=/tmp/ov-chrome-testing.kfNw8D/chromedriver \
OV_CHROMIUM_BINARY=/tmp/ov-chrome-testing.kfNw8D/chrome \
node tests/run-browser-gate0.js --browser all \
  --json-output docs/evidence/gate2-browser-results.json
```

| Engine | Version | G0-B01 Skip/reload | G0-B08 same-control replay |
|---|---:|---:|---:|
| Firefox | 153.0 / geckodriver 0.37.0 | pass | pass |
| Chromium | 151.0.7922.77 / matching ChromeDriver | pass | pass |

Combined result: **4 passed; 0 unexpected; 0 unavailable**. The player flow
builds a real exact hull, launches it, skips before its future decision, reloads
the persisted transaction, and verifies that the same hull and decision remain
owned and reachable. A separate real DOM flow activates one stale control twice
and proves one order and one debit.

## Adversarial reviewer closure

- Design/playability reviewer (Banach): **APPROVED** — weather and rescue
  choices expose no partial save, Skip/reload preserves the exact future
  decision, and the promoted boundaries remain playable rather than merely
  hidden.
- Engineering/UX reviewer (Pascal): **APPROVED** — transaction effects are
  atomic/idempotent, every active hull has one owner, v62 load rejects malformed
  partial ownership, and the exact autosave probes reload without replay.
- Space-realism/aesthetic reviewer (Aquinas): **APPROVED** — recovery and crew
  disposition use frozen fitted hardware, and live aborts across
  pad/ascent/staging never promise survival without a launch-escape system.

Earlier rejection findings were converted into regression coverage before this
capture: no selected/unapplied weather or rescue save boundary, no zero-owner
active hull, no false no-LES survival promise, and current generated artifacts.

## Closure checklist

- [x] Every launch mutation has a stable request and transaction identity.
- [x] Exact hull ownership survives weather, Skip, reload, cruise, recall, and arrival.
- [x] Decision selection plus cost/time/effect is one no-save mutation group.
- [x] Outcome, ledger, hull history, and terminal state settle exactly once.
- [x] Vehicle recovery and crew survival use frozen fitted capabilities.
- [x] Gate 1, Gate 2, quarantine, full headless, and two-engine browser evidence pass.
- [x] All three original reviewers approve the final fingerprinted diff.
- [ ] Commit and push only with explicit user authorization.
