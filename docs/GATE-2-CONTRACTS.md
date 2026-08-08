# Gate 2 — Atomic launch transactions

Gate 2 makes a launch a durable campaign transaction instead of a chain of
transient callbacks. It promotes G0-B01, G0-B02, G0-B03, G0-B04, and G0-B08.
G0-B05 remains quarantined for Gate 3 because it is an opening-economy problem,
not a transaction-integrity problem.

## Locked product rules

- Weather recycle is preflight. The exact hull remains assigned, its flight
  count and launch history do not advance, and the later liftoff continues the
  same transaction.
- Post-liftoff abort, deorbit, and recall do not imply vehicle recovery. A hull
  is recovered only when that exact hull carried recovery hardware; otherwise
  it is expended or lost. Crew disposition is reported separately.
- Permanent campaign failure remains an Ironman-only concern outside this gate.
- Pre-v62 saves captured with an in-progress launch or mission flight are
  rejected. Development builds do not invent a missing random result, hull
  owner, or history event.

## Persisted authority

Save v62 and lifecycle schema 2 add one foreground `state.launchTxn`. A deferred
cruise owns the same serialized transaction on its `activeFlights` record; an
arrival or recall transfers it back to the foreground before removing the
flight record.

The transaction is JSON-only and contains:

- stable transaction and request identity plus an exact canonical intent;
- mission snapshot/id, order id, hull id, quote, physical specification, and
  timing snapshot;
- locked weather and flight outcomes;
- a revisioned decision with stable option ids, selected option, locked random
  draw, and resolved effect;
- a capability/disposition snapshot separating liftoff, recovery hardware,
  crew return, launch escape, vehicle disposition, and crew disposition;
- monotonic application receipts and the next required action.

The foreground phases are `preparing`, `decision`, `liftoff`, `settling`, and
`presentation`, followed by `resolved` or `rolled-back`. `cruise` ownership is
serialized on the active flight rather than duplicated in the foreground.

## Mutation and replay rules

Every player mutation carries a stable request id. Repeating the same request
and canonical intent returns its existing order/transaction; it cannot create a
second order, debit, flight, outcome, ledger row, hull event, or terminal event.
Reusing an id for different intent is rejected.

Launch mutation groups suppress save writes only while a partial group is being
applied. Checkpoints are written after exact hull transfer, decision creation,
locked liftoff outcome, cruise ownership transfer, outcome settlement, and
foreground release. Presentation is disposable; economic settlement is not.

## Decisions and reload

Weather, live abort/press-on, reserve burn/bank, orbital maneuver, anomaly, and
rescue decisions all persist their exact transaction id, revision, options,
context, and locked result data. Load clears transient UI owners, validates the
single durable owner, then rebuilds the appropriate `_pending*` projection and
flight decision panel.

Skip advances presentation to the pending hold point. It cannot dismiss a
current or future unresolved decision, and Space/Enter use the same rule. Once
no decision remains, presentation can still be skipped normally.

## Settlement and terminal ordering

Outcome effects execute inside one no-save mutation group. The transaction
records the effective decision-overridden outcome, exact hull disposition,
ledger receipt, and outcome receipt before presentation begins. Re-entry during
presentation is a no-op; after release, the durable request receipt rejects a
replayed resolved delivery.

Bankruptcy requests raised during launch preparation, weather delay, cruise
advance, rescue delay, or settlement set a pending terminal condition rather
than latching game over in the middle of ownership. After settlement/release,
terminal state is derived again from final cash. A successful payout therefore
clears a stale negative crossing; a still-insolvent campaign sees the bridge
loan modal only after the transaction is safe.

## Required evidence

```text
node build.js --check
node tests/run-gate1-contracts.js
node tests/run-gate2-contracts.js
node tests/run-expected-failures.js
node tests/run-gate0-evidence.js --output docs/evidence/gate2-headless-results.json
node tests/run-browser-gate0.js --json-output docs/evidence/gate2-browser-results.json
```

Gate 2 acceptance requires:

- Gate 1: 5/5 suites, 102/102 checks;
- Gate 2: 3/3 suites, 49/49 checks;
- full headless sweep: no unexpected failures;
- quarantine: only G0-B05 reproduced;
- Firefox and Chromium: positive Skip/reload and same-control idempotency flows;
- `git diff --check` and deterministic build parity.
