# Gate 1 contracts — make the game tell one truth

**Captured:** 2026-08-08. **Baseline:** Gate 0 closure commit
`aa9c2e9f9877fa3fc56254eb0ac13f8d899e34fc`. Gate 1 establishes authorities
and vocabulary without rebalancing the economy, reliability, random outcomes,
mission ladder, navigation, or renderers.

## G1A — premise, truth labels, and public vocabulary

Orbital Ventures is explicitly an **alternate-history, government-enabled
public-private space venture founded in 1942**. It is not presented as an actual
1942 institution or a documentary recreation. Public copy uses “venture,”
“program,” or the company name for the player entity; “agency” remains valid
only where it describes a real or fictional state agency as a category.

Every explicitly classified claim belongs to one of five kinds in `TRUTH_KINDS`:

| Kind | Player label | Meaning |
|---|---|---|
| `history` | HISTORY | Sourced real event or demonstrated capability. |
| `fiction` | ALT-HISTORY | Counterfactual campaign institution or event. |
| `schematic` | SCHEMATIC | Real relationship displayed at non-literal scale or timing. |
| `simulation` | SIMULATION | Decision-bearing gameplay model or abstraction. |
| `speculative` | CONCEPT | Studied engineering concept without demonstrated flight performance. |

Gate 1 does not falsely certify the 107 inherited editorial `.hist` notes as
sourced history. They render as neutral CONTEXT notes until a later provenance
pass classifies and sources them. Classified callouts carry an explicit
`truth-*` class and a real in-DOM badge; HISTORY additionally requires valid
`data-sources` ids. The Solar System surface states that body sizes, orbital
spacing, and playback are schematic while modeled angles and mission Δv remain
decision inputs. Startup/new-game surfaces label the alternate-history premise.

`CONTENT_SOURCES` is the source registry. Gate 1 starts with:

- [NASA Science — Voyager 1](https://science.nasa.gov/mission/voyager/voyager-1/)
- [NASA Science — Oort Cloud](https://science.nasa.gov/solar-system/oort-cloud/facts/)
- [NASA ADS — Project Daedalus final study](https://ui.adsabs.harvard.edu/abs/1978JBIS...31S...1B/abstract)

The public capstone is **Interstellar Precursor**. Its stable internal id remains
`oort_precursor` to avoid pointless code churn, but its objective is a
heliopause crossing into interstellar space. It owns an explicit non-body
`Heliopause / Interstellar Boundary` destination. The distant Oort Cloud remains
a map/reference body with no mission association, not the claimed destination of
this 15-year flight. The same non-body destination authority supplies the flight
report label and deep-space environment: solar arrays are explicitly unusable at
the heliopause instead of silently inheriting Earth-orbit sunlight. The fusion
drive is labeled a concept; Voyager crossings are labeled history.

Units and time constants are connected through `GAME_TRUTH`: `fM()` consumes its
currency symbol/suffix, `DAYS_PER_MONTH` consumes its 30-day calendar constant,
and startup exposes the basis to the player. Money is millions of nominal
campaign-year US dollars (`$M`) with no inflation model; mass is metric tonnes or
kilograms, velocity is metres per second, and reliability is a modeled
probability rather than a safety certification.

## G1B — fresh state and lifecycle records

`createFreshState(difficulty)` is the only new-campaign/default authority. Every
call returns an independent JSON-safe graph with explicit lifecycle collections,
an `ov-campaign-v1` schema id, and a complete Pioneer-era snapshot. New Game and
load both cross `resetSessionTransients()`, which abandons old timers, decisions,
animations, modal ownership, renderer caches, derived sequences, and save-session
counters before installing another campaign.

Canonical JSON-safe factories define these words:

| Record | Contract |
|---|---|
| Family | Named design lineage and accumulated heritage. |
| Order | Paid manufacturing commitment with status, cost, mission, spec snapshot, and request id. |
| Hull | One serial-numbered physical article with exactly one lifecycle status. |
| Hull history | Resolved event record for that exact physical article. |
| Annal | Compact permanent campaign-wide significant event. |
| Launch transaction | Serializable owner joining request, mission, exact order/hull, quote, timing, decision, outcome, and applied-effect flags. |

`state.launchTxn` remains `null`. The transaction factory is schema only: Gate 1
does not make launch atomic, resume an interrupted decision, reject replayed
mutations, or implement rollback. Those are Gate 2 responsibilities, and
G0-B01/B02/B08 remain quarantined for that reason.

Save version 61 adds the schema/defaults. Version 60 remains best-effort
compatible: older ready/build orders missing the new physical snapshot fields
freeze them once from that save's current Bench/defaults because their historical
per-order values cannot be reconstructed. This is not a migration project. An
explicit schema mismatch or newer version is rejected before mutating the payload
or current live state.

## G1C — quote and time authority

`calculateLaunchQuote(input)` is pure and deterministic. It separately reports:

- build cash paid at commitment;
- operating carry through build;
- later flight/test/rehearsal burn;
- launch-period operating reserve;
- long-mission carry;
- cash required now and at flight;
- end-to-end runway;
- nominal ready/flight dates; and
- modeled success probability plus stable rejection reason codes.

`launchCommitmentQuote()` snapshots current campaign inputs into that pure
calculator. The Bench label, staged commitment panel, queue gate, launch gate,
and ready-hull action consume the same authority. Every ready-hull surface
(Bench, production manifest, Command decks, planner, and Space shortcut) resolves
the exact order/hull through its frozen design snapshot, not the mutable live
Bench. The snapshot includes stages/modules, boosters, ECLSS, recovery hardware,
performance parts, power source, engine-out configuration, livery, family,
test campaign, and rehearsal. Depot draw and orbital assembly remain explicit
flight-time logistics choices: neither changes the built hull, and both are
deliberately excluded from its order snapshot. A ready hull is projected after
it leaves Hangar, so its own parked-fleet maintenance is not incorrectly charged
into its launch month. Execution receives that one validated pre-transfer quote;
it may not re-quote after removing the hull and apply the maintenance credit twice.

The locked Engineer/First Flight baseline is:

| Metric | Locked value |
|---|---:|
| Starting treasury | $3.50M |
| Build commitment now | $0.44M |
| Build duration | 2 months / 60 days |
| Operating carry through build | $0.24M |
| Later flight burn | $0.14M |
| Ready-hull launch reserve | $0.12M |
| Nominal build-through-launch | 3 months / 90 days |
| Modeled reliability | 65% |
| End-to-end runway | $0.94M |

These values document the existing balance; Gate 1 does not change the economy,
reliability curve, mission payout, or random outcome distribution.

## G1D — interaction and accessibility foundation

Action descriptors carry a stable semantic id, label, role, enabled state,
disabled reason, exact subject type/id, quote snapshot, and revision. Re-rendering
the same logical action does not mint another id. Manufacturing orders retain
the request id for Gate 2, but replay is intentionally not rejected yet.

Ready-hull actions bind both the order and exact hull, use primary launch styling,
reject a stale hull identity before mutation, and refresh the owning UI as soon
as the hull leaves Hangar. This promotes G0-B06. Staged quote disclosure promotes
G0-B07. G0-B05 is narrower now: the action is honestly disabled with its exact
shortfall, while opening-economy continuity remains deferred to Gate 3.

Native buttons, links, inputs, selects, text areas, content-editable controls,
open modals, and key-repeat retain ownership of Space/Enter/navigation/time-warp
keys. The shared modal exposes dialog semantics, label/title association,
focus trapping and restoration, and an `aria-hidden` lifecycle. Mutations report
through a polite screen-reader live region.

## Explicit non-goals and next ownership

- **Gate 2:** atomic/resumable launch ownership, save/reload boundaries,
  terminal timing, and request replay rejection (G0-B01/B02/B03/B04/B08).
- **Gate 3:** non-Ironman economic continuity and the remaining opening runway
  problem (G0-B05). Permanent failure remains acceptable only when Ironman is
  selected, per the locked product decision.
- **Gate 4:** progressive disclosure and first-session redesign.
- **Gate 5:** physics/trajectory realism and the known-red 3D trajectory suite.
- **Gate 6:** presentation, graphics, and aesthetic polish.
- **Before content expansion:** classify and source the inherited neutral
  CONTEXT-note backlog; it may not silently become HISTORY.
- **After Gate 7:** new missions, worlds, systems, currencies, facilities, or
  other expansion work.

## Required validation

```bash
node build.js --check
node tests/test-build-parity.js
node tests/run-gate1-contracts.js
node tests/run-expected-failures.js
node tests/run-gate0-evidence.js --output docs/evidence/gate1-headless-results.json
```

The fast Gate 1 lane contains 101 assertions across five suites. Full headless
and two-engine browser evidence is recorded separately in
`docs/evidence/GATE-1-EVIDENCE.md`.
