# Orbital Ventures — Feature Backlog (from EVALUATION-2026-07.md)

Full, unprioritized-by-omission list of all 105 feature ideas from the 2026-07-10
evaluation, organized exactly as the evaluation grouped them. This is the *complete*
companion to `ROADMAP.md`'s priority filter — every item below exists here whether or
not it made the roadmap's named workstreams.

**Columns:** Cx = complexity (S <1 day · M 1–5 days · L 1–3 weeks · XL 1+ month).
Impact = ★–★★★. Pri = priority (H/M/L) as scored in the evaluation.

**Roadmap status column (added here, not in the original eval):**
- `E0.x` / `E1.x` / `E2.x` — folded into that ROADMAP.md workstream item
- `Deferred` — named in ROADMAP.md's "Deferred / noted, not committed" list
- `Backlog` — not yet on ROADMAP.md in any form; lives only here until prioritized

Cross-reference: see `EVALUATION-2026-07.md` §12 for the original rationale column
context (each table also appears there verbatim as part of the full evaluation).

---

## 12. Feature Suggestions (105)

Complexity: S = <1 day, M = 1–5 days, L = 1–3 weeks, XL = 1+ month. Impact: ★–★★★. Deps noted where they exist. Priority H/M/L.

### Quality of life (1–25)
| # | Feature | Why | Cx | Impact | Deps | Pri | Status |
|---|---|---|---|---|---|---|---|
|1| Keyboard shortcuts (tabs 1–5, space pause, +/- time) | Sim audience expectation | S | ★★★ | — | H |E0.4|
|2| Esc closes modals / focus trap in modals | Basic UX hygiene | S | ★★ | — | H |E0.4|
|3| UI scale slider (CSS var) | Readability, older audience | S | ★★ | — | H |E0.4|
|4| `prefers-reduced-motion` gating | Accessibility | S | ★ | — | H |E0.4|
|5| Colorblind-safe redundancy (icons beside color states) | Accessibility | M | ★★ | — | H |E0.4|
|6| Save export/import as first-class UI (file download) | Trust; localStorage is fragile | S | ★★★ | — | H |E0.2|
|7| Multiple save slots (IndexedDB) | Standard expectation | M | ★★★ | 6 | H |E0.2|
|8| Autosave ring (keep last 3) | Corruption insurance | S | ★★ | 7 | H |E0.2|
|9| Floating money/rep deltas on change | Feedback | S | ★★ | — | M |Backlog|
|10| Hover math breakdowns (reliability ∏, net econ) | Auditability = trust | M | ★★★ | — | H |E1.5|
|11| Confirm-with-preview on all destructive actions | Prevent rage-quits | S | ★★ | — | H |Backlog|
|12| Undo last build-change on bench | Design iteration comfort | M | ★★ | — | M |Backlog|
|13| Searchable tech tree | 110 nodes needs it | S | ★★ | — | M |Already shipped — techSearchMatch()/#techSearch input in R&D render|
|14| Pin a research node as "goal" → path highlight | Planning aid | M | ★★ | — | M |Shipped 2026-07-17 — persistent prereq-chain highlight + rail progress band|
|15| Notification center (missed events while warping) | Smart-time complement | M | ★★ | — | M |Backlog|
|16| Log filters already exist → add text search | Late-game archaeology | S | ★ | — | L |Backlog|
|17| Compare two vehicle families side-by-side | Decision support | M | ★★ | — | M |Already shipped — vehicleCompareHTML() in render.js|
|18| "Why can't I fly this?" explainer on disabled launch | Removes guesswork | S | ★★★ | — | H |E1.5|
|19| Time-to-affordability estimates on purchases | Planning | S | ★★ | — | M |Backlog|
|20| Clock/date always visible during flight overlay | Orientation | S | ★ | Overlay | M |Backlog|
|21| Settings: autosave frequency control | Player agency | S | ★ | — | L |Backlog|
|22| Copy build sharecode (base64 blueprint) | Community seeding | M | ★★ | — | M |Backlog|
|23| In-game changelog viewer | Live-game hygiene | S | ★ | — | L |Backlog|
|24| Tutorial replay from settings | Onboarding recovery | S | ★★ | Tutorial | M |Backlog|
|25| FPS/perf toggle overlay (debug) | Support triage | S | ★ | — | L |Backlog|

### Flight & operations (26–45)
|26| Ship flight overlay Slices B–D (already scoped) | Finishes core arc | L | ★★★ | — | H |E1.2|
|27| Ascent abort decision window | Watching→playing | M | ★★★ | 26 | H |E1.2|
|28| Launch weather + scrub/hold system | Cadence texture | M | ★★ | — | M |E1.2|
|29| Pad turnaround time per pad | Ops as resource | M | ★★★ | — | H |E1.5|
|30| Second launch site (inclination economics) | Strategic geography | L | ★★ | 29 | M |Deferred — de-risked by #114 (inclination physics scoped 2026-07-17); LAUNCH_SITE_LAT const is the per-site seam|
|31| Range scheduling conflicts with rivals | Rival friction | M | ★★ | Rival AI | M |Backlog|
|32| Post-flight failure report naming causal chain | Failure as content | M | ★★★ | — | H |E1.5|
|33| Part-level fatigue on reused hardware | Reuse tradeoff | L | ★★ | — | M |Backlog|
|34| Recovery fleet (ships/zones) for splashdowns | Thematic sink | M | ★ | — | L |Backlog|
|35| Countdown voice + hold at T-31s events | Drama | M | ★★ | — | M |E1.6|
|36| Telemetry strip during ascent (alt/vel/Q) | Sim credibility | S | ★★ | 26 | H |E1.2|
|37| Max-Q structural check vs. fairing choice | Part relevance | M | ★★ | — | M |Backlog|
|38| Night launches (era/window dependent) w/ visuals | Spectacle | S | ★ | — | L |Shipped 2026-07-13|
|39| Pad aborts that damage pad (repair time) | Risk depth | S | ★★ | 29 | M |Backlog|
|40| Crew survival mini-arc on failures (escape tower) | Emotional stakes | M | ★★★ | — | H |Backlog|
|41| Debris/range-safety consequences on populated tracks | Site choice matters | M | ★ | 30 | L |Backlog|
|42| Mission patches (procedural SVG) per flight | Attachment/collection | M | ★★ | — | M |Backlog|
|43| Photo mode / GIF export of flights | Marketing engine | L | ★★ | — | M |Backlog|
|44| Simultaneous missions in flight (overlapping ops) | Late-game ops density | L | ★★★ | Outliner | H |Closed 2026-07-11 — already fully covered (engine+hangar+Outliner), see ROADMAP.md|
|45| Ground track visualization on map | Sim texture | M | ★ | — | L |Shipped 2026-07-17 — solid+dashed track on Earth-globe popout, shown for missions with .inclination|

### Rivals, politics, world (46–60)
|46| Rival milestone race schedules ± variance | Core dread | L | ★★★ | — | H |E1.1|
|47| Rivals claim "firsts" → your payout/rep decays | Urgency | M | ★★★ | 46 | H |E1.1|
|48| Engineer/astronaut poaching after your failures | Personnel stakes | M | ★★ | 46 | M |E1.1|
|49| Intel reports on rival progress (spend money to see) | Info economy | M | ★★ | 46 | M |E1.1|
|50| Joint-mission offers (share cost, share credit) | Diplomacy lite | L | ★★ | 46 | M |Backlog|
|51| Budget hearings after fatal failures | Political stakes | M | ★★★ | — | H |E1.1|
|52| Multi-month geopolitical event arcs | World alive | M | ★★ | — | M |E2|
|53| Public support decomposed (visible drivers) | Auditability | S | ★ | — | L |Backlog|
|54| Media system: press conferences after events | Support management | M | ★★ | — | M |E2|
|55| Congressional mandate negotiation (pick 1 of 3) | Agency over mandates | M | ★★ | — | M |E2|
|56| Rival bankruptcy/merger events | Dynamic field | S | ★ | 46 | L |Backlog|
|57| Espionage/leak events (2-way) | Flavor + risk | M | ★ | 46 | L |Backlog|
|58| International sanctions era-events affecting materials | Ties markets to world | S | ★ | — | L |Backlog|
|59| Anniversary/commemoration support beats | Warmth | S | ★ | — | L |Backlog|
|60| End-of-era "state of the race" interstitial | Narrative rhythm | S | ★★ | 46 | M |Backlog|

### Personnel & crew (61–72)
|61| Astronaut roster: names, portraits (procedural), traits | Identity | M | ★★★ | — | H |E1.4|
|62| Training pipeline (class selection → currency) | Crew as system | L | ★★ | 61 | M |Deferred|
|63| Flight logs per astronaut (missions flown) | Attachment | S | ★★ | 61 | H |E1.4|
|64| Crew assignment tradeoffs (veteran vs. rookie rel/morale) | Decisions | M | ★★ | 61 | M |Backlog|
|65| Memorial wall on losses | Emotional weight | S | ★★★ | 61 | H |E1.4|
|66| Chief designer character (Korolev-alike) with buffs/mortality | Era storytelling | M | ★★ | — | M |Backlog|
|67| Department lead personalities → advisor lines | Leads already exist | S | ★★ | — | M |Backlog|
|68| Staff aging/retirement across 50-year campaign | Time weight | M | ★★ | — | M |Backlog|
|69| Hiring market quality tied to rep/support | Feedback loop | S | ★ | — | L |Backlog|
|70| Strikes/morale events tied to overwork (launch cadence) | Ops coupling | M | ★ | — | L |Backlog|
|71| Astronaut PR tours (send hero on tour = support, unavailable) | Tradeoff | S | ★★ | 61 | M |Backlog|
|72| Named test pilots for static-fire/atmospheric era | Pre-1957 texture | S | ★ | 61 | L |Backlog|

### Stations, logistics, late game (73–85)
|73| Station assembly loop (launch modules, dock) | Economy/UI done 2026-07-02 (`5c60c8c`); remaining = real launch/dock interactivity | L | ★★★ | — | H |E2 (scoped 2026-07-11)|
|74| Station resupply contracts (recurring ops) | Late-game loop | L | ★★★ | 73 | H |E2|
|75| Crew rotation cadence requirements | Standing obligation | M | ★★ | 73,61 | M |Backlog|
|76| Module degradation/maintenance | Sink + tension | M | ★★ | 73 | M |Backlog|
|77| Science-over-time from staffed station | Passive→active R&D | M | ★★ | 73 | M |Already shipped (M17 facilities pass) — facilityProduction().sci feeds the daily tick|
|78| Depot network view (already have depots) | Logistics legibility | M | ★ | — | L |Backlog|
|79| Cargo manifest choices on resupply (pick 3 of 5) | Small decisions | S | ★★ | 74 | M |Backlog|
|80| Surface base tier after ISRU (Moon/Mars) | Colonization-lite | XL | ★★ | — | L |Deferred|
|81| Sample return market (sell/keep for science) | Economy branch | M | ★ | — | L |Shipped 2026-07-17 — bank/sell decision on all 4 sciMission completions|
|82| Space telescope program (standing science + events) | Passive with events | M | ★★ | — | M |Shipped 2026-07-16 (E1.7)|
|83| Satellite constellation management (aging, replacement) | Passive contracts deepen | L | ★★ | — | M |Deferred|
|84| Orbital debris accumulation from failures | Long-arc consequence | M | ★ | — | L |Backlog|
|85| Tourism vertical: flights with famous-passenger events | Commercial era color | M | ★★ | — | M |Backlog|

### Content, systems, meta (86–105)
|86| Procedural contract generator (era+capability keyed) | Fills troughs | L | ★★★ | — | H |E1.3|
|87| 3–4 more committed program forks (Mars, crew vehicle, propulsion) | Replayability core | L | ★★★ | — | H |E2|
|88| Manufacturing lines w/ learning-curve rates (#7 seam) | Money→time decisions | XL | ★★★ | — | M |Deferred|
|89| Tracking-station network requirement for deep space | Classic sink | M | ★★ | — | M |Shipped 2026-07-17 (both slices) — hard gate on unflown deep-space missions + DSN build UI on Map tab; kill-switch flag retained, real-browser playtest still owed (see ROADMAP.md)|
|90| Biology/human-factors research track | Late-era R&D identity | M | ★★ | — | M |Backlog|
|91| Synergy prospecting UI ("2 of 3") | Set collection | S | ★★ | — | M |E2|
|92| Era research capacity limits (can't buy everything) | Strategic scarcity | M | ★★★ | — | H |E2|
|93| Alt-history start scenarios (1957 USSR-alike, 1970 stagnation) | Replayability | L | ★★ | — | M |Deferred|
|94| Ironman mode | Genre expectation | S | ★★ | 7 | M |Deferred|
|95| Challenge scenarios with fixed seeds + par scores | Community competition | M | ★★ | — | M |Deferred|
|96| End-of-campaign chronicle export (shareable HTML) | Bragging artifact | M | ★★ | — | M |Deferred|
|97| Newspaper front pages on milestones | Genre-classic joy | M | ★★★ | — | H |E1.6|
|98| Achievements (Steam) | Discoverability | M | ★★ | Steam | H |E2|
|99| Cloud save (Steam) | Expectation | M | ★★ | Steam | H |E2|
|100| Difficulty presets that alter systems (not just numbers) | Depth | M | ★★ | — | M |Backlog|
|101| In-game encyclopedia (engines/history — content exists in blurbs) | Surfacing your best asset | M | ★★ | — | M |Deferred|
|102| Localization scaffold (string table extraction) | Market size; painful later | XL | ★★ | File split | M |Deferred|
|103| Mod-lite: external JSON content packs (missions/contracts) | Longevity | L | ★★ | File split | L |Deferred|
|104| Statistics screen (charts exist — add records/superlatives) | Reflection | S | ★ | — | L |Backlog|
|105| Soundtrack: 4–6 era-shifting ambient tracks | Identity | M | ★★★ | — | H |E1.6|
|106| Guided first launch (5-step interactive tutorial — none exists; #24 presumed one) | Onboarding | M | ★★★ | — | H |Backlog|
|107| First-session tooltips on header stats (Δv, rep, ⚛ jargon-cold to new players) | Onboarding | S | ★★ | 106 | M |Backlog|
|108| Desktop breakpoint ~1280px (zero @media rules; CC deck overflows laptops) | Accessibility | S | ★★ | — | M |Backlog|
|109| Font-scale setting | Accessibility | S | ★ | — | L |Backlog|
|110| Progressive CC deck (hide advanced cards until after first launch) | Onboarding | S | ★ | 106 | L |Backlog|
|111| Base Bench: third bench tab for lunar/Mars surface bases (horizontal ground-line SVG; facilities already run full station machinery) | Empire visualization | M | ★★★ | — | H |Shipped 2026-07-16 (E1.8 A+B+C+D complete)|
|112| Surface-specific base modules (ISRU plant, greenhouse, reactor pad, rover garage; surface:true flag filtering) | Base depth | M | ★★ | 111 | M |Shipped 2026-07-16 (E1.8 C)|
|113| Part-based vehicle bench — KSP-VAB 2D drag-drop builder, parts-as-truth, deep per-part physics, all 4 categories | Core loop overhaul | XL | ★★★ | — | H |Built 2026-07-16 (E3.0-E3.6, BENCH_V2 flag off pending playtest)|
|114| Orbital inclination as a physics dimension (plane-change Δv from launch-site latitude; effectiveReqDv accessor; retrofit Crewed Orbit + Comsat) | Sim depth · unblocks #45 & #30 | M | ★★ | — | M |Shipped 2026-07-17 (both slices) — #45 ground track now unblocked; launch-azimuth ceiling/dogleg tax added 2026-07-17 (symmetric extension, see ROADMAP.md)|
|115| Fleet Registry — unified expandable status board for all assets (in-flight vehicles, logistics, bases/stations, depot, programs, standing ops) | Consolidation · info architecture | M | ★★ | — | M |Scoped 2026-07-17, not built — consolidates Outliner + Flights modal + empire strip; satellites-as-objects is an open (A)/(B) call, see ROADMAP.md|

---


---

## Status tally

| Status | Count | Meaning |
|---|---|---|
| E0.x | 8 | Folded into a named critical-fix item |
| E1.x | 20 | Folded into a named high-value item |
| E2 | 10 | Folded into medium-priority grouped item |
| Deferred | 12 | Named in ROADMAP.md's deferred list |
| **Backlog** | **52** | Not yet on ROADMAP.md in any form |

Over half the list (58/112) hasn't been triaged onto ROADMAP.md yet — mostly small
QoL items (#9, 11–12, 15–16, 19–25), flight/ops texture (#31, 33–34, 37–45), rival/world
flavor beyond the reactive-race core (#50, 53, 56–60), and personnel/station depth
beyond the named E1.4/E2 items (#64, 66–72, 75–79, 82, 84–85, 89–90, 100, 104).
None of these are blocking — they're candidates for future slice selection once E0/E1
land. Revisit this tally each time ROADMAP.md workstreams close out.
