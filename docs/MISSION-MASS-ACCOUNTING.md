# Mission mass accounting

Multi-leg missions use the same initial carried-mass inventory for launch planning
and the mission simulator. The inventory includes the crew/life-support package,
cargo, power hardware, avionics, fairing, and the selected in-space modules.
Propellant burns and coast losses update a local simulation copy; planning never
consumes the player's depot inventory or edits the vehicle design.

## Timing and scope

A profile may specify a positive, finite `coastDays` on an in-space leg to describe
the coast immediately before that maneuver. Coast metadata on launch-vehicle
legs is ignored. Authored coasts consume the total `m.days` budget in profile
order, with excess durations clamped and unused time applied after the last leg.
Losses during a later coast cannot alter the initial launch
mass or an earlier departure burn. Detached hardware no longer contributes mass
or incurs later boil-off, and depot propellant enters the inventory only after
the ascent to LEO.

Existing mission profiles specify a total duration but do not specify individual
coast intervals. For these profiles, the simulator uses a conservative planning
approximation: the unspecified duration follows the first in-space maneuver,
before the next maneuver if one exists. This keeps future losses out of liftoff
and departure calculations without inventing a detailed transfer itinerary.
It does **not** solve departure/arrival geometry or distribute transit and surface
stay time physically. Explicit coast schedules should be authored when that
additional mission-design detail is introduced.

Cryogenic loss uses the existing linear monthly rates and cumulative 30% cap.
It acts on the propellant remaining after earlier burns. Splitting an otherwise
unchanged coast into shorter intervals gives the same result. The fairing is
carried through the ascent calculation and discarded before in-space maneuvers;
avionics and power hardware remain aboard.

The crew/life-support package retains its existing mass convention. Consuming a
provision does not automatically remove its mass from the spacecraft: a model of
venting, waste disposal, and recycling would be a separate change. ISRU's existing
research-based burn support also remains an abstraction; this change does not
introduce production facilities or resource logistics.

## Verification

`tests/test-mission-mass-accounting.js` exercises the initial-mass agreement,
power-system tradeoffs, coast ordering, separation, depot loading, orbital
assembly, and simulation purity. These are physical/state invariants rather than
snapshots of particular vehicle balance values.

Corrected mass accounting can reduce the margins of designs that previously
omitted power hardware or benefited from early propellant loss. Review marginal
designs on the bench before committing another mission. Saved vehicle designs
keep their existing fields; the inventory is derived for each calculation.
