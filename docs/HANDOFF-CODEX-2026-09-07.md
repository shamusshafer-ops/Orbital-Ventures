# Codex pass-on — engineering, realism, and gameplay recommendations

## Current checkpoint

The owner requested a senior software/game-development review emphasizing detail,
realism, and creative gameplay, selected the mission-mass correction first, and
asked that the remaining recommendations be committed for the next session.
The proposals below are a planning backlog, not completed features or an
instruction to implement every item without further prioritization.

- Repository: `shamusshafer-ops/Orbital-Ventures`.
- Reviewed main baseline: `7f73cb2`.
- Implemented fix: `1634a3f`, on `codex/mission-mass-accounting`.
- Remote review: [draft PR #2](https://github.com/shamusshafer-ops/Orbital-Ventures/pull/2).
  At this checkpoint the fix is pushed but not merged into `main`.
- Recorded implementation validation: 168 headless suites passed, one intentional
  skip (`test-progress-unify.js`), zero failures. This is evidence for the mass-fix
  commit, not a new test run or a browser/playability sign-off.

Read this alongside `CLAUDE.md` and the current source. Older handoff status and
line numbers can be stale; confirm a purported missing feature before scoping it.

## Completed first recommendation: mass conservation and event order

`missionMassManifest()`, `lvPayload()`, and `simulateMission()` in `src/sim.js`
now agree on the initially carried hardware and propellant. Power and avionics
remain aboard for later burns, fairings leave after ascent, detached modules stop
contributing mass or boil-off, and depot fuel joins after ascent. Future coast
losses no longer make the rocket lighter before it launches or departs.

`tests/test-mission-mass-accounting.js` adds 21 checks; the new regression tests
reproduced eight failures on the original implementation. Catalog-wide checks
covered launch-mass agreement across assembly, depot, and power choices.
Build parity, generated-script syntax, quarantine, and diff checks passed.
Corrected hardware mass can reduce the margins of previously marginal designs.

See [MISSION-MASS-ACCOUNTING.md](MISSION-MASS-ACCOUNTING.md) for the exact model.
Existing profiles still use an explicitly labeled coast-timing approximation;
the change does not solve transfer trajectories or replace ISRU with inventory.

## Engineering and realism follow-through

1. **Author coast timing where it changes a decision.** Add explicit `coastDays`
   to selected mission profiles, separating transit, loiter, and surface stay.
   Keep their sum within the mission duration and test that a later coast cannot
   change an earlier burn. Start with one lunar and one Mars mission; compare
   vehicle margins and the planning notes in a real browser before expanding.

2. **Make ISRU depend on available production and stored fuel.** The current
   research-gated return-burn support is a deliberate abstraction. Evolve it into
   plant throughput, local feedstock, power availability, storage, and reserved
   propellant only after the player has a usable inventory/planning view. A
   researched technology alone should eventually be insufficient to supply a
   return burn. Test conservation, reservation ownership, and interrupted supply;
   do not silently remove the abstraction before replacement gameplay exists.

3. **Repair the full-suite runner's standalone classification.** The review found
   that `tests/run-gate0-evidence.js` bundles some filesystem-based suites with the
   game harness, changing their `__dirname` and producing misleading failures.
   The affected suites (`test-dead-tokens.js`, `test-theme-palettes.js`,
   `test-themeable-surfaces.js`, and `test-typography.js`) were run directly for
   the recorded validation. Give
   suites an explicit execution mode and verify every discovered suite runs once,
   with intentional skips distinguished from passes. This runner fix is pending.

4. **Close browser and campaign-validation gaps.** Exercise the real bench,
   launch, debrief, and reload path with marginal and comfortably viable designs.
   Re-capture UI baselines at their actual stated dimensions. Headless checks do
   not establish readable telemetry, useful difficulty, or campaign balance.
   Re-check the older Gate 3/6 and parts-builder playtest items against current
   code and evidence before carrying them forward as open work.

## Gameplay recommendations

The game already has staging, architecture choices, build queues, heritage,
personnel, inquiries, mandates, science, rivals, stations, resupply, docking,
windows, radiation, and communications delay. Deepen their interactions rather
than building duplicate systems.

| Opportunity | First playable slice | Meaningful player choice |
| --- | --- | --- |
| Failure learning | Extend `triggerInquiry()` / `resolveInquiry()` with a suspect subsystem and two or three corrective programs: inspect a lot, redesign, or integrated testing. Charge time, staff, bays, and money; affect relevant confidence. | Delay the next flight for evidence, or accept a stated residual risk. Keep uncertain causes distinct from known facts. |
| Logistics planning | A 12–36 month manifest for one LEO station and one lunar base, reusing station operations, build queues, resupply, and docking reservations. Show local stocks and deadlines before adding reorder policies. | Allocate scarce launches among propellant, food/spares, crew rotation, construction, and revenue cargo; divert a launch when supply fails. |
| Personnel assignment | Assign a flight director and small discipline team to a major mission or campaign; connect mission familiarity and fatigue to existing staff/crew records. | Choose a rested rookie or an experienced veteran. Traits should change available responses and interpretation, not only add percentage bonuses. |
| Campaign architecture | Extend the existing LOR/Direct/EOR pattern to two or three feasible Mars or outer-system plans with launch sequences and contingencies. | Trade shorter exposure against energy, depot dependence, abort options, and the cost of waiting for another window. |
| Player-authored commitments | Extend mandates and hearings so the player proposes a measurable cadence, science, date, or safety commitment for restricted funding. | Promise an ambitious program for resources and attention, then manage the consequences of slipping it. |
| Scientific payload identity | Give one precursor mission a small instrument manifest with mass, power, data-rate, and redundancy costs. Feed its result into a later resource or mission decision. | Spend mass and money to learn local ice yield before committing an ISRU plant, or accept the uncertainty. |
| Information quality | Introduce confidence ranges for one forecast, narrowed by existing tests, tracking coverage, heritage, or reconnaissance. | Buy better evidence when it can change the plan; retain clear feasibility and causal explanations. Avoid hiding everything. |
| Program portfolios | Prototype an era-level capacity constraint using existing doctrine, programs, partnerships, and rivals. | Postpone lunar permanence to fund Mars-first, or favor robotic science over crew prestige. Delayed branches can return at an opportunity cost. |

## Suggested sequence and acceptance criteria

1. Finish browser validation of the mass fix and correct the test-runner reporting.
2. Prototype **failure learning** first: it can reuse inquiries and reliability
   breakdowns and produces a short, visible engineering story. Confirm that
   corrective action has a traceable, subsystem-specific effect and that choices
   consume resources exactly once across save/load and repeated UI actions.
3. Prototype **logistics planning** around the two destinations above. Keep one
   authoritative stock/reservation record per destination. Demonstrate a supply
   shortfall that has at least two understandable, recoverable responses before
   extending ISRU to production-limited return flights.
4. Add **personnel assignment** to give those failure and supply stories recurring
   characters. Prevent simultaneous incompatible assignments and double-counted
   bonuses; surface the tradeoff before the player commits.
5. Expand architecture, commitments, and instruments after those loops survive a
   campaign playtest. Introduce uncertainty selectively; tune portfolio limits
   after the core campaign is playable end to end.

Logistics has the largest systemic potential, while failure learning is the
recommended smaller next feature. This sequence is separate from the owner's
already completed selection of the mass-accounting fix as the first task.

## Design constraints for the next developer

- Physics determines feasibility; organization, uncertainty, and contingency
  planning create drama. Do not tune the rocket equation to rescue a design.
- Add physical detail when it changes a choice: mass, power, time, dose,
  inventory, and communications delay should have visible consequences.
- Prefer conservative options that preserve crew/hardware at an opportunity
  cost, and failures that create manageable problems before ending a campaign.
- Label approximations, speculative technology, and tuned values honestly.
- Reuse existing authority and settlement paths. Preserve unrelated content;
  no broad framework rewrite is required for these recommendations.
- Follow the repository's source/build and save-version conventions. Add focused
  invariant/regression tests for implementation, and record browser evidence
  separately from automated results. This handoff itself changes documentation.
