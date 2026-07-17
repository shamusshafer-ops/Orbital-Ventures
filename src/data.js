/* ============================================================
   ORBITAL VENTURES — M1 vertical slice
   Core loop: design (rocket equation) → launch → economy → research
   ============================================================ */
const G0 = 9.81;
// User-directed icon set (2026-07-11): the timeline-category icons were emoji, which render
// differently per OS/browser and can't pick up the theme's ink color. Small inline SVG line icons,
// 16x16, stroke=currentColor so they theme-sync for free (no JS color table needed, unlike the
// canvas HUD chrome — these are plain DOM/innerHTML, currentColor just works). ~1em sizing so they
// sit inline with surrounding text exactly like the emoji they replace.
const ICON_PATHS={
  launch:  '<path d="M8 2 L12 12 L8 10 L4 12 Z" fill="currentColor" stroke="none"/>',
  research:'<g fill="none" stroke="currentColor" stroke-width="1.3"><ellipse cx="8" cy="8" rx="6.2" ry="2.3"/><ellipse cx="8" cy="8" rx="6.2" ry="2.3" transform="rotate(60 8 8)"/><ellipse cx="8" cy="8" rx="6.2" ry="2.3" transform="rotate(120 8 8)"/></g><circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none"/>',
  rivals:  '<path d="M4 2 L4 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4.5 2.5 L11.5 3.8 L9 6 L11.5 8.2 L4.5 9.2 Z" fill="currentColor" stroke="none"/>',
  crew:    '<g fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="5.3" cy="5.8" r="2.1"/><circle cx="10.7" cy="5.8" r="2.1"/><path d="M1.5 14 C1.5 10.6 3.3 9.2 5.3 9.2 C6.3 9.2 7.1 9.5 7.8 10"/><path d="M14.5 14 C14.5 10.6 12.7 9.2 10.7 9.2 C9.7 9.2 8.9 9.5 8.2 10"/></g>',
  infra:   '<g fill="currentColor" stroke="none"><rect x="1.5" y="9" width="3" height="5"/><rect x="6.5" y="5.5" width="3" height="8.5"/><rect x="11.5" y="2.5" width="3" height="11.5"/></g>',
  other:   '<circle cx="8" cy="8" r="2.4" fill="currentColor" stroke="none"/>',
};
function svgIcon(name, size){
  const p=ICON_PATHS[name]; if(!p) return '';
  return `<svg width="${size||'1em'}" height="${size||'1em'}" viewBox="0 0 16 16" style="display:inline-block;vertical-align:-0.15em" aria-hidden="true">${p}</svg>`;
}
const TL_CAT_ICON={launch:svgIcon('launch'), research:svgIcon('research'), economy:'$', rivals:svgIcon('rivals'), crew:svgIcon('crew'), infra:svgIcon('infra'), other:svgIcon('other')};
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const ERAS = [
  {id:'pioneer',      name:'Pioneer',           from:1942, to:1957, blurb:'Liquid/solid sounding rockets, captured/derived V-2-class tech. Sub-orbital, upper atmosphere.'},
  {id:'early_orbital',name:'Early Orbital',     from:1957, to:1969, blurb:'First satellites, expendable orbital launchers. LEO, basic comms/recon sats.'},
  {id:'crewed_lunar', name:'Crewed &amp; Lunar',     from:1961, to:1975, blurb:'Human spaceflight, capsules, lunar trajectories. Crewed LEO, Moon flybys &amp; landings.'},
  {id:'station_shuttle',name:'Station &amp; Shuttle',from:1975, to:2000, blurb:'Partial reuse, long-duration stations, deep-space probes. LEO stations, planetary probes.'},
  {id:'commercial',   name:'Commercial',        from:2000, to:2030, blurb:'Cheap reusable launch, smallsats, commercial crew. Megaconstellations, crewed commercial.'},
  {id:'expansion',    name:'Expansion',         from:2030, to:2060, blurb:'In-space refueling, ISRU, lunar/Mars surface ops. Lunar base, Mars landing.'},
  {id:'interplanetary',name:'Interplanetary',   from:2060, to:2100, blurb:'Nuclear thermal/electric, asteroid mining, cyclers. Belt, outer-planet moons.'},
  {id:'speculative',  name:'Speculative',       from:2100, to:9999, blurb:'Fusion drives, large-scale settlement, mass drivers. Whole system economy, precursor interstellar.'},
];
// Eras are soft and overlapping by design (calendar-driven, not a hard gate): the
// "current" era is the LAST one whose start year has been reached.
function currentEra(){
  let cur=ERAS[0];
  for(const e of ERAS){ if(state.year>=e.from) cur=e; else break; }
  return cur;
}
function eraIndex(e){ return ERAS.indexOf(e); }
// #38 backlog: night launches, era-dependent. Early Pioneer-era ranges rarely worked night ops
// (visual tracking, no radar-independent range safety); night launches became routine as the
// program matured. Scales 8% (Pioneer) to 32% (Commercial+), plateauing at the last couple eras.
function nightLaunchChance(){ return Math.min(0.32, 0.08+eraIndex(currentEra())*0.035); }
// P6 6.1: pure era-index-from-year (currentEra reads global state.year; this takes an explicit
// year so it can run at load/migration time before `state` is assigned). Same "last era whose
// start has been reached" rule — ERAS.from is strictly increasing, so break-on-first-greater holds.
function eraIndexForYear(year){ let idx=0; for(let i=0;i<ERAS.length;i++){ if((year||1942)>=ERAS[i].from) idx=i; else break; } return idx; }
// User-directed era-evolving visual identity (2026-07-11): the console itself ages up as the
// campaign advances, automatically (tied to state.year via eraIndex/currentEra — not a manual
// picker like THEMES). Groups the 8 ERAS entries into 4 visual eras matching the ask (Apollo →
// 80s NASA/Shuttle → 90s/2000s Commercial → SpaceX-modern) — coarser than the gameplay era
// granularity on purpose, so the console doesn't visually reskin every few gameplay years.
// Applied in render.js's applyEraVisual() as a body.era-* class (see shell.html for the CSS).
// All 4 keys have real distinct CSS (shell.html): apollo reuses Apollo Beige's palette, 80s reuses
// Control Room Green's, 90s2000s and spacex are new palettes with no existing theme to reuse.
const ERA_VISUAL_MAP=['apollo','apollo','apollo','80s','90s2000s','spacex','spacex','spacex']; // indexed by eraIndex(currentEra())
function eraVisualKey(){ return ERA_VISUAL_MAP[eraIndex(currentEra())]||ERA_VISUAL_MAP[ERA_VISUAL_MAP.length-1]; }
// P6 6.1: baseline metrics for the era-retrospective diff — flights flown, firsts claimed by the
// player (completed missions) vs. scooped by rivals, treasury, reputation. Read from global state.
function eraSnapshot(){ return {
  flights: state.flights||0,
  playerFirsts: Object.keys(state.completed||{}).length,
  rivalFirsts: Object.keys(state.scooped||{}).length,
  money: state.money||0,
  rep: state.rep||0
}; }

// M4b: Rival agencies/firms — each pursues its own "firsts" on a calendar
// roughly anchored to ERAS, independent of player progress. Surfaced as
// log/news entries only (no economy effect — that's M4c).
// M4c: if a rival claims a "first" tied to one of your not-yet-completed
// missions, your own first-time completion payout for that mission is cut by
// this factor (your rep reward is unaffected — you still proved capability).
const SCOOP_PAYOUT_MULT = 0.6;

/* ---------- M6: Personnel ---------- */
// Named engineer pool. era: earliest era index (0=Pioneer) when they become hirable.
// specialty: propulsion | structures | avionics | production
const ENGINEERS = [
  {id:'e01', name:'Wernher Haas',     specialty:'propulsion',  skill:0.82, salary:0.08, era:0, bio:'Propulsion veteran — drafted from the old V-2 program. Knows how to coax every Isp point out of an engine.'},
  {id:'e02', name:'Ruth Kessler',     specialty:'structures',  skill:0.74, salary:0.07, era:0, bio:'Stress-analysis specialist. Her margins keep vehicles from shaking themselves apart.'},
  {id:'e03', name:'Dmitri Volkov',    specialty:'avionics',    skill:0.68, salary:0.06, era:0, bio:'Guidance and navigation. Launched his first gyroscope before the war ended.'},
  {id:'e04', name:'Anita Rhys',       specialty:'production',  skill:0.71, salary:0.06, era:0, bio:'Manufacturing lead — cuts build time and keeps the factory floor from chaos.'},
  {id:'e05', name:'James Osei',       specialty:'propulsion',  skill:0.78, salary:0.09, era:1, bio:'Kerolox combustion expert. Arrived just as RP-1 was starting to look interesting.'},
  {id:'e06', name:'Lena Marchetti',   specialty:'avionics',    skill:0.85, salary:0.11, era:1, bio:'Chief GNC. Her autopilot code flies tighter arcs than anyone else in the industry.'},
  {id:'e07', name:'Sam Treadwell',    specialty:'structures',  skill:0.80, salary:0.10, era:2, bio:'Lightweight alloys and thermal protection. Critical once reentry heating became real.'},
  {id:'e08', name:'Yuki Tanaka',      specialty:'production',  skill:0.88, salary:0.13, era:2, bio:'Rapid-integration specialist. Can cut a build campaign by weeks through sheer process discipline.'},
  {id:'e09', name:'Priya Nambiar',    specialty:'propulsion',  skill:0.91, salary:0.15, era:3, bio:'Cryogenic propulsion lead. Wrote the book on LH2 handling in the field.'},
  {id:'e10', name:'Carlos Reyes',     specialty:'avionics',    skill:0.87, salary:0.13, era:3, bio:'Fault-tolerant flight software. His triple-redundancy architecture has never lost a mission.'},
  {id:'e11', name:'Saoirse Flynn',    specialty:'structures',  skill:0.93, salary:0.16, era:4, bio:'Composite structures. Cuts dry mass in ways that would have been impossible a decade earlier.'},
  {id:'e12', name:'Marcus Chen',      specialty:'production',  skill:0.95, salary:0.18, era:4, bio:'Star hire. Built the automated factory floor that made rapid reuse economically viable.'},
  {id:'e13', name:'Grace Okonkwo',    specialty:'propulsion',  skill:0.84, salary:0.11, era:2, bio:'Hypergolic storable-propellant specialist. Her upper stages restart cold after a long coast.'},
  {id:'e14', name:'Dieter Falk',      specialty:'propulsion',  skill:0.94, salary:0.17, era:4, bio:'Full-flow staged-combustion authority. Squeezes chamber pressures others call reckless.'},
  {id:'e15', name:'Tomas Ceballos',   specialty:'structures',  skill:0.77, salary:0.08, era:1, bio:'Thin-wall balloon-tank welder from the Atlas school. Saves dry mass by the ounce.'},
  {id:'e16', name:'Freya Lindholm',   specialty:'structures',  skill:0.89, salary:0.14, era:3, bio:'Cryogenic tank insulation lead. Kept boil-off in check long before anyone had a name for it.'},
  {id:'e17', name:'Raj Malhotra',     specialty:'avionics',    skill:0.83, salary:0.11, era:2, bio:'Inertial-platform engineer. His drift budgets made unmanned deep-space navigation trustworthy.'},
  {id:'e18', name:'Ingrid Sato',      specialty:'avionics',    skill:0.94, salary:0.17, era:4, bio:'Autonomous flight-management architect. Her software flies rendezvous no human could hand-fly.'},
  {id:'e19', name:'Bram de Vries',    specialty:'production',  skill:0.76, salary:0.08, era:1, bio:'Assembly-line foreman. Turned one-off rocket craft into repeatable manufacturing.'},
  {id:'e20', name:'Zainab Farah',     specialty:'production',  skill:0.90, salary:0.14, era:3, bio:'Integration-flow specialist. Parallelizes build campaigns to keep every pad busy.'},
  {id:'e21', name:'Margaret Hale',    specialty:'software',    skill:0.75, salary:0.08, era:1, bio:'Wrote guidance code by hand when "software" was barely a word. Rope-core memory was her canvas.'},
  {id:'e22', name:'Viktor Novak',     specialty:'software',    skill:0.84, salary:0.11, era:2, bio:'Real-time executive scheduler. His priority-interrupt design keeps the flight computer from ever locking up.'},
  {id:'e23', name:'Amara Blackwood',  specialty:'software',    skill:0.93, salary:0.16, era:4, bio:'Autonomous GNC software. Her fault-detection stack reasons through failures faster than any ground loop.'},
  {id:'e24', name:'Otto Brand',       specialty:'materials',   skill:0.74, salary:0.07, era:1, bio:'Metallurgist. Knows which alloy cracks at which temperature before the test stand does.'},
  {id:'e25', name:'Lucia Ferrari',    specialty:'materials',   skill:0.88, salary:0.13, era:3, bio:'Composite-layup and thermal-protection expert. Her ablators come home unscorched.'},
  {id:'e26', name:'Hiroshi Ono',      specialty:'materials',   skill:0.94, salary:0.17, era:4, bio:'Additive-manufacturing and exotic-alloy lead. Prints engine parts that used to be un-machinable.'},
];

// Named astronaut pool. era: earliest era index when hirable.
const ASTRONAUTS = [
  {id:'a01', name:'Jack Morrow',    skill:0.72, salary:0.05, era:1, bio:'Test pilot. Flew everything the Air Force had. Calm under pressure.'},
  {id:'a02', name:'Valentina Sorokina', skill:0.78, salary:0.06, era:1, bio:'Aeronautical engineer and pilot. Her mission reports are as rigorous as her flying.'},
  {id:'a03', name:'Ed Kamau',       skill:0.74, salary:0.05, era:1, bio:'Naval aviator. Specialized in high-G reentry profiles.'},
  {id:'a04', name:'Mei-Lin Fong',   skill:0.82, salary:0.08, era:2, bio:'Mission specialist. Spacewalk record holder and ECLSS expert.'},
  {id:'a05', name:'Renzo Bianchi',  skill:0.80, salary:0.07, era:2, bio:'Lunar surface geologist and pilot. Has spent more time on simulators than most have in orbit.'},
  {id:'a06', name:'Aisha Diallo',   skill:0.88, salary:0.10, era:3, bio:'Commander-class. Her crew management cut mission-critical errors by 40% on long-duration flights.'},
  {id:'a07', name:'Sven Lindqvist', skill:0.85, salary:0.09, era:3, bio:'Flight surgeon and pilot. Indispensable on multi-month crewed missions.'},
  {id:'a08', name:'Nora Vasquez',   skill:0.93, salary:0.13, era:4, bio:'Star astronaut. Three deep-space missions, two EVA records, zero incidents. Rivals are trying to poach her.'},
  {id:'a09', name:'Gus Halloran',   skill:0.75, salary:0.05, era:1, bio:'X-plane test pilot. Deadstick landings are his party trick.'},
  {id:'a10', name:'Imani Serwaa',   skill:0.83, salary:0.08, era:2, bio:'EVA and rendezvous specialist. Logged more spacewalk hours than anyone in her cohort.'},
  {id:'a11', name:'Anton Rykov',    skill:0.87, salary:0.10, era:3, bio:'Long-duration commander. Ran a station crew for a year without a serious incident.'},
  {id:'a12', name:'Sofia Delgado',  skill:0.92, salary:0.12, era:4, bio:'Interplanetary mission commander. Trained for Mars-transit isolation and thrives in it.'},
];

// Named scientist pool — boost science yield and R&D. era: earliest era index when hirable (≥1).
const SCIENTISTS = [
  {id:'s01', name:'Dr. Cecelia Vaughn', skill:0.76, salary:0.07, era:1, bio:'Astrophysicist. Turns every flight into a data harvest the rest of the field envies.'},
  {id:'s02', name:'Dr. Kwame Asante',   skill:0.85, salary:0.10, era:2, bio:"Planetary geochemist. Reads a world's history from a single spectrometer trace."},
  {id:'s03', name:'Dr. Yelena Mirova',  skill:0.93, salary:0.15, era:4, bio:'Exobiologist and lab director. Her instruments answer questions others cannot even pose.'},
];

// Named executive pool — lift government funding, cut overhead, sweeten mandates. era ≥1.
const EXECUTIVES = [
  {id:'x01', name:'Howard Blaine',   skill:0.76, salary:0.08, era:1, bio:'Ex-defense-contract negotiator. Turns a handshake into a line item on the federal budget.'},
  {id:'x02', name:'Priyanka Rao',    skill:0.85, salary:0.11, era:2, bio:'CFO who reads a balance sheet like a trajectory. Finds the fuel margin hiding in the books.'},
  {id:'x03', name:'Gerald Fox',      skill:0.93, salary:0.16, era:4, bio:'Rainmaker. His government relationships open funding doors that were bolted shut.'},
];

// Named mission-controller pool — prevent anomalies, steady live calls, run rescues. era ≥1.
const CONTROLLERS = [
  {id:'k01', name:'Gene Braddock',  skill:0.77, salary:0.08, era:1, bio:'Flight director from the first crewed programs. Calm voice, faster calls than the computers.'},
  {id:'k02', name:'Nadia Petrov',   skill:0.86, salary:0.11, era:2, bio:'Ascent-and-entry specialist. Has talked more vehicles through anomalies than anyone on the loop.'},
  {id:'k03', name:'Dale Okafor',    skill:0.93, salary:0.16, era:4, bio:'Lead flight director. His mission-ops discipline turns near-losses into recoveries.'},
];

// How many months of low morale (<20) before the person quits
const MORALE_QUIT_MONTHS = 3;
// M9: personnel traits — each hire has a temperament that bends their contribution.
// Assigned deterministically per person id (stable across a save). rel/rd/pay are
// multipliers on that person's reliability / R&D / astronaut-payout effect; `team`
// (mentors) lifts the whole engineering team.
const ENG_TRAITS={
  perfectionist:{name:'Perfectionist', rel:1.30, rd:0.82, desc:'Obsessive margins — harder hardware, but slower research.'},
  risk_taker:   {name:'Risk-taker',    rel:0.85, rd:1.30, desc:'Moves fast and breaks things — quick R&D, looser reliability.'},
  visionary:    {name:'Visionary',     rel:1.00, rd:1.42, desc:'Sees three steps ahead — accelerates the research timeline.'},
  veteran:      {name:'Veteran',       rel:1.35, rd:0.95, desc:'Decades of hard-won heritage — rock-steady hardware.'},
  mentor:       {name:'Mentor',        rel:1.10, rd:1.10, team:0.12, desc:'Lifts the whole team\'s game.'},
};
const ASTRO_TRAITS={
  steady:     {name:'Steady',       rel:1.30, pay:1.00, desc:'Calm under pressure — safer crewed flights.'},
  daredevil:  {name:'Daredevil',    rel:0.85, pay:1.40, desc:'Bold and bankable — big PR, more risk.'},
  charismatic:{name:'Charismatic',  rel:1.00, pay:1.55, desc:'A household name — sponsors love them.'},
  iron:       {name:'Iron-willed',  rel:1.45, pay:1.00, desc:'Endures the longest missions without a wobble.'},
};
// Scientist temperaments — own trait table (never fold into ENG/ASTRO keys; see registry note below).
const SCI_TRAITS={
  theorist:   {name:'Theorist',   rd:1.30, yield:1.00, desc:'Chases the deep model — accelerates research more than raw data yield.'},
  empiricist: {name:'Empiricist', rd:1.00, yield:1.30, desc:'Lives in the data — squeezes more knowledge out of every mission.'},
  polymath:   {name:'Polymath',   rd:1.15, yield:1.15, desc:'Ranges across fields — lifts both research pace and science yield.'},
};
// Executive temperaments — own trait table (channels: gov funding / opex / mandate).
const EXEC_TRAITS={
  lobbyist:   {name:'Lobbyist',    gov:1.30, opex:1.00, mandate:1.10, desc:'Works the halls of power — maximizes government funding.'},
  costcutter: {name:'Cost-cutter', gov:1.00, opex:1.35, mandate:1.00, desc:'Ruthless with overhead — trims the monthly burn hardest.'},
  dealmaker:  {name:'Dealmaker',   gov:1.05, opex:1.00, mandate:1.40, desc:'Lives for the big contract — squeezes the most out of mandates.'},
};
// Mission-controller temperaments — own trait table (channels: anom prevention / live call / rescue).
const CTRL_TRAITS={
  coolhead:   {name:'Cool Head',   call:1.30, anom:1.00, rescue:1.10, desc:'Unflappable on the loop — gets the most out of a live call.'},
  bythebook:  {name:'By-the-Book', call:1.00, anom:1.30, rescue:1.00, desc:'Procedure-perfect — heads off anomalies before they start.'},
  improviser: {name:'Improviser',  call:1.10, anom:1.00, rescue:1.35, desc:'Thinks fast when it goes wrong — best at pulling off a rescue.'},
};
const ENG_TRAIT_KEYS=Object.keys(ENG_TRAITS), ASTRO_TRAIT_KEYS=Object.keys(ASTRO_TRAITS), SCI_TRAIT_KEYS=Object.keys(SCI_TRAITS), EXEC_TRAIT_KEYS=Object.keys(EXEC_TRAITS), CTRL_TRAIT_KEYS=Object.keys(CTRL_TRAITS);
/* ===== Staff role registry — generalizes the old engineer/astronaut binary so new hire
   categories (controllers, scientists, executives) slot in without a growing if/else at
   every touchpoint. Each pool = one role with its own named list + trait table. With only
   engineers + astronauts registered, every lookup below is identical to the old binary.
   NOTE: never reorder or extend ENG_TRAITS / ASTRO_TRAITS keys — trait assignment is
   hash(id) % keys.length (derived, not saved), so changing those lists silently reassigns
   every existing character's personality mid-save. New roles get their OWN trait tables. */
const STAFF_POOLS = [
  {role:'eng',   list:ENGINEERS,  traits:ENG_TRAITS,   traitKeys:ENG_TRAIT_KEYS,   label:null},
  {role:'astro', list:ASTRONAUTS, traits:ASTRO_TRAITS, traitKeys:ASTRO_TRAIT_KEYS, label:'astronaut'},
  {role:'sci',   list:SCIENTISTS, traits:SCI_TRAITS,   traitKeys:SCI_TRAIT_KEYS,   label:'scientist'},
  {role:'exec',  list:EXECUTIVES, traits:EXEC_TRAITS,  traitKeys:EXEC_TRAIT_KEYS,  label:'executive'},
  {role:'controller', list:CONTROLLERS, traits:CTRL_TRAITS, traitKeys:CTRL_TRAIT_KEYS, label:'flight director'},
];
function poolOf(id){ for(const P of STAFF_POOLS){ if(P.list.some(p=>p.id===id)) return P; } return null; }
function roleOf(id){ const P=poolOf(id); return P?P.role:null; }
// Human-readable role tag: engineers show their specialty; other roles show their label.
function roleLabel(p){ if(!p) return ''; const P=poolOf(p.id); if(!P) return ''; return P.label || p.specialty || P.role; }
function _hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h); }
function isEngineerId(id){ return roleOf(id)==='eng'; }
function traitKeyOf(id){ const P=poolOf(id); const keys=P?P.traitKeys:ENG_TRAIT_KEYS; return keys[_hashStr(id)%keys.length]; }
function traitOf(id){ const P=poolOf(id); const tbl=P?P.traits:ENG_TRAITS; return tbl[traitKeyOf(id)]; }
// Engineer team effects on reliability and R&D speed
const ENG_REL_BONUS_MAX  = 0.08; // max reliability boost from a fully-skilled, high-morale team
const ENG_RD_SPEED_MAX   = 0.30; // max fraction of extra R&D progress per month (0.3 = 30% faster)
// Astronaut effects on crewed missions
const ASTRO_REL_BONUS_MAX  = 0.06; // max reliability boost from the assigned astronaut
const ASTRO_PAYOUT_BONUS_MAX = 0.15; // max payout multiplier bonus from assigned astronaut
// Raise cost and morale effect
const RAISE_SALARY_BUMP = 0.02; // $M/mo increase per raise
const RAISE_MORALE_BUMP = 20;
const COMMEND_MORALE_BUMP = 8;
const COMMEND_COOLDOWN_MONTHS = 3;

/* ===== #19 Organizational scaling — departments ============================
   A department is an ORG LAYER over the staff you already hire, not a replacement
   for the named individuals (which carry the #9 traits, #5 poaching, and M6 morale).
   Membership is DERIVED: an engineering department's members are your hired engineers
   of that specialty; the Astronaut Corps' members are your hired astronauts. Each
   department can have one promoted LEAD, whose skill/morale/trait amplify that
   department's contribution. Everything is balance-neutral with no leads declared
   (the lead weight collapses to 1.0), so a fresh game plays exactly as before. */
const DEPARTMENTS = [
  {id:'propulsion', name:'Propulsion',      icon:'🔥', kind:'eng',   specialty:'propulsion', blurb:'Engines, combustion, Isp. Turns propellant into Δv.'},
  {id:'structures', name:'Structures',      icon:'🏗', kind:'eng',   specialty:'structures', blurb:'Airframes, tankage, thermal protection. Keeps the stack from tearing itself apart.'},
  {id:'avionics',   name:'Avionics',        icon:'📡', kind:'eng',   specialty:'avionics',   blurb:'Guidance, navigation, flight software. Flies the trajectory.'},
  {id:'production', name:'Production',       icon:'⚙',  kind:'eng',   specialty:'production', blurb:'Factory floor, integration, build cadence. Gets vehicles out the door.'},
  {id:'sciencedept',name:'Science Division', icon:'🔬', kind:'sci',   specialty:null,         blurb:'Researchers who turn missions into knowledge and speed the R&D pipeline.'},
  {id:'software',   name:'Flight Software',  icon:'💻', kind:'eng',   specialty:'software',   blurb:'Flight code, real-time executives, autonomy. The mind that flies the vehicle.'},
  {id:'materials',  name:'Materials & Processes', icon:'🧪', kind:'eng', specialty:'materials', blurb:'Alloys, composites, thermal protection. The stuff everything else is made of.'},
  {id:'frontoffice',name:'Front Office',     icon:'💼', kind:'exec',  specialty:null,         blurb:'Finance, government relations, contracts. Keeps the money flowing.'},
  {id:'missionops', name:'Mission Control',  icon:'🎧', kind:'controller', specialty:null,     blurb:'Flight directors and controllers. Prevent anomalies, steady live calls, run rescues.'},
  {id:'astronaut',  name:'Astronaut Corps', icon:'🧑‍🚀', kind:'astro', specialty:null,         blurb:'The crews who fly. Leadership here steadies every crewed mission.'},
];
function departmentDef(id){ return DEPARTMENTS.find(d=>d.id===id); }
// A promoted department lead counts for LEAD_WEIGHT in its team's weighted average
// (vs 1.0 for a rank-and-file member) — so promoting your best-trait engineer amplifies
// that trait across the whole team score. Neutral when no leads exist (all weights 1.0).
const DEPT_LEAD_WEIGHT = 1.6;
// The Astronaut Corps lead lends a small flat crewed-reliability steadiness on top of the
// assigned astronaut's own bonus (leadership → fewer crew errors). Zero with no corps lead.
const CORPS_LEAD_REL_BONUS_MAX = 0.03;
// #19 slice C: workforce planning — a fully-unstaffed CORE engineering specialty is a real risk.
// Era-scaled (0 in Pioneer, like CE4 stakes) so early game is provably unchanged.
const DEPT_UNDERSTAFF_REL_PEN = 0.03; // reliability hit per unstaffed core department at full era scaling
const DEPT_UNDERSTAFF_REL_CAP = 0.09; // total cap on the understaffing penalty
function defaultDepartments(){ const o={}; for(const d of DEPARTMENTS) o[d.id]={lead:null, training:0}; return o; }

const RIVALS = [
  {
    id:'vostochny', name:'Vostochny Dynamics', flag:'🛰', kind:'State Agency', color:'#e0564f',
    blurb:'A state-funded launch directorate that moves fast on national-prestige firsts, especially early in the space race.',
    firsts:[
      {year:1957, name:'First artificial satellite reaches orbit', missionId:'first_sat', body:'earth'},
      {year:1961, name:'First crewed orbital flight', missionId:'crew_orbit', body:'earth'},
      {year:1965, name:'First spacewalk (EVA)', body:'earth'},
      {year:1971, name:'First space station launched', body:'earth'},
      {year:1986, name:'First modular space station core', body:'earth'},
      {year:2009, name:'First robotic sample return from a near-Earth asteroid', body:'belt'},
      {year:2049, name:'First flyby of the Jovian system', body:'jupiter'},
    ],
  },
  {
    id:'meridian', name:'Meridian Aerospace', flag:'🚀', kind:'Legacy Contractor', color:'#5aa9e0',
    blurb:'A well-funded, methodical contractor that wins the big crewed-lunar and station-era programs through sheer budget and engineering depth.',
    firsts:[
      {year:1969, name:'First crewed lunar landing', missionId:'luna_landing', body:'moon'},
      {year:1981, name:'First reusable crewed orbiter', body:'earth', marketImpact:{payoutMult:0.9, months:24, note:'shuttle-class reuse pressures the launch market'}},
      {year:1998, name:'First multinational station module integrated', body:'earth'},
      {year:2012, name:'First robotic Mars rover with surface mobility', body:'mars'},
      {year:2025, name:'First crewed lunar return (post-Apollo)', body:'moon'},
      {year:2035, name:'First robotic mining survey of the Asteroid Belt', body:'belt'},
      {year:2060, name:'First orbiter inserted around a Jovian moon', body:'jupiter'},
    ],
  },
  {
    id:'halcyon', name:'Halcyon Systems', flag:'⚡', kind:'Commercial Newcomer', color:'#f5a623',
    blurb:'A scrappy commercial upstart, late to the game but disruptive — drives down launch costs and pushes the reusability/expansion frontier.',
    firsts:[
      {year:2008, name:'First privately developed orbital launch vehicle', body:'earth', marketImpact:{payoutMult:0.9, months:24, note:'commercial entrants undercut launch prices'}},
      {year:2015, name:'First propulsive landing of an orbital booster', body:'earth', marketImpact:{payoutMult:0.8, months:36, note:'reusable boosters commoditise launch'}},
      {year:2020, name:'First commercial crew flight to orbit', body:'earth'},
      {year:2031, name:'First commercial lunar surface delivery', body:'moon'},
      {year:2045, name:'First commercial propellant depot in LEO', body:'earth'},
      {year:2053, name:'First commercial platinum-group claim in the Belt', body:'belt'},
    ],
  },
];
// CE1 slice (a): rival AGENTS. Each rival's `firsts` become GOALS, not scripted dates.
// A rival accrues budget into capital and "buys" its next goal when capital clears the
// goal's cost; momentum (reactive to the race) speeds or slows that. Because
// cost = income·12·window and accrual = income·momentum, income cancels in timing —
// a goal fires after ~12·window/momentum months from its saving window opening, so
// MOMENTUM is the whole reactive lever (>1 pulls the date in, <1 slips it). A historical
// floor (MAX_PULL_IN) keeps the year plausible; income magnitude is reserved for the
// shared-resource levers in slice (b) (contract crowding draining capital).
const RIVAL_PROFILES = {
  vostochny:{income:1.0}, // fast-moving state agency
  meridian: {income:1.2}, // deep-budgeted legacy contractor
  halcyon:  {income:1.5}, // disruptive commercial newcomer (late but accelerating)
};
// P4 [QW] · Rival voice — short flavor communiqués attributed to each rival, keyed by its
// existing archetype (state agency / legacy contractor / commercial newcomer). STRINGS ONLY:
// no gameplay effect, no persisted state. A line is picked at random when a rival event fires
// (`taunt` when a rival claims a first from tickRivals(); `defiant` when you beat it to a goal).
const RIVAL_VOICE = {
  vostochny:{ // Vostochny Dynamics — state directorate, prestige-driven, dry propaganda
    taunt:[
      'The State salutes another first. History will note who came second.',
      'The directorate does not race. It arrives — on schedule, ahead of you.',
      'A first for the program, a lesson for the competition.',
      'Another milestone for the motherland. We trust you took notes.',
    ],
    defiant:[
      'A setback is a rounding error in a five-year plan.',
      'Enjoy the lead. The State is patient.',
      'You claimed one milestone. The directorate keeps a longer list.',
    ],
    distress:[ // P5: said when the rival suffers a disaster (crewed or uncrewed)
      'A regrettable anomaly. The commission will convene. The program continues.',
      'The State mourns, and the State perseveres. There will be no pause.',
      'An engineering variance, nothing the directorate cannot absorb.',
    ],
    humbled:[ // P5: said when the PLAYER successfully rescues the rival's crew
      'The directorate acknowledges your assistance. This will be noted in the record.',
      'Our crew is home. The State does not forget a debt — however unwelcome.',
      'A gesture. The competition remains. But — thank you.',
    ],
  },
  meridian:{ // Meridian Aerospace — legacy contractor, corporate, methodical
    taunt:[
      "Decades of engineering depth, delivered on budget. Nothing personal.",
      "Meridian doesn't gamble on firsts. We schedule them.",
      'Another line item closed. Our shareholders send their regards.',
      'This is what a mature program looks like. Study it.',
    ],
    defiant:[
      'One quarter’s miss. Meridian plans in decades.',
      'A minor variance. The program remains fully funded.',
      "You moved fast. We move deliberately — and we don't stop.",
    ],
    distress:[ // P5: said when the rival suffers a disaster (crewed or uncrewed)
      'A loss. Our review board will be thorough, as always. The contract holds.',
      'Setbacks are priced into a mature program. We proceed on schedule.',
      'The shareholders have been briefed. Meridian will recover, deliberately.',
    ],
    humbled:[ // P5: said when the PLAYER successfully rescues the rival's crew
      'Meridian records its gratitude, formally, for the assistance rendered.',
      'A competitor today, a colleague in a crisis. Our crew thanks you.',
      "We'll return the professional courtesy. Off the record: well flown.",
    ],
  },
  halcyon:{ // Halcyon Systems — scrappy commercial newcomer, brash, cheap and fast
    taunt:[
      'Late to the party, first out the door. Move fast, remember?',
      "We did it cheaper and we did it first. You're welcome, industry.",
      'Turns out the upstarts fly too. Keep up.',
      'Iterate, launch, repeat. The old guard never saw us coming.',
    ],
    defiant:[
      "Cute. We'll ship the next one before you finish the paperwork.",
      "One loss won't slow the burn rate. Back to the pad.",
      'You want a race? Halcyon lives for this.',
    ],
    distress:[ // P5: said when the rival suffers a disaster (crewed or uncrewed)
      "Okay, that one hurt. Root-cause it, patch it, fly again. That's the model.",
      'We move fast; sometimes we break things. Back to the pad, wiser.',
      'Rough day at Halcyon. The burn rate does not care. Neither do we.',
    ],
    humbled:[ // P5: said when the PLAYER successfully rescues the rival's crew
      "You saved our people. We won't forget that — even if we still beat you.",
      'No swagger today. Just thanks. Our crew is alive because of you.',
      "That's the real win, and it's yours. Halcyon owes you one.",
    ],
  },
};
// P4 [QW] · pick a random voice line for a rival event; returns null if none defined (safe no-op).
function rivalVoiceLine(r, kind){
  const v=RIVAL_VOICE[r.id]; if(!v||!v[kind]||!v[kind].length) return null;
  return v[kind][Math.floor(Math.random()*v[kind].length)];
}
const RIVAL_FIRST_RUNWAY=6;  // years a rival "saves" before its debut goal's nominal year
const RIVAL_MAX_PULL_IN=4;   // a goal can fire at most this many years before its nominal year
const RIVAL_MIN_WINDOW=2;    // floor on a goal's saving window (years) so cost stays sane
const RIVAL_MOM_MIN=0.5, RIVAL_MOM_MAX=1.8; // momentum bounds (slip ↔ pull-in)
const RIVAL_MOM_SENS=0.18;   // momentum sensitivity to how far ahead/behind the rival is
const RIVAL_MOM_DRIFT=0.15;  // monthly drift of momentum toward its standing-derived target
const RIVAL_MOM_RUBBER=0.8;  // rubber-band floor: a dominated rival never fully stalls
// CE1 slice (b) — player levers against the rival agents.
const RIVAL_CROWD_PER=0.06;  // each active passive contract slows EVERY rival's saving by this
const RIVAL_CROWD_CAP=0.35;  // ...up to this much (cornering the market starves rivals)
const RIVAL_DENY_MOM=0.30;   // momentum knocked off a rival when you beat it to its pending goal
const RIVAL_DENY_DRAIN=0.5;  // and its accumulated capital toward that goal is cut to this
const RIVAL_POACH_MOM_BUMP=0.08; // a successful poach feeds the rival's momentum (it got your talent)
const RIVAL_COUNTERPOACH_COST=2.5; // $M to counter-poach a rival's engineers
const RIVAL_COUNTERPOACH_MOM=0.25; // momentum knocked off the rival you counter-poach
const RIVAL_COUNTERPOACH_MORALE=4; // morale lift to your staff when you win a talent fight
const RIVAL_INTEL_COST=1.5; // $M, one-time per rival, unlocks the full remaining-firsts projected timeline (cheaper than the momentum-affecting counter-poach — pure information)
// Ambient economy events — fire on the monthly tick (rate-limited), adjust capital
// or apply a temporary market modifier. Gated by year/rep/flights so the early game
// stays quiet. money/dur are [min,max] ranges rolled at fire time.
const ECONOMY_EVENTS=[
  {id:'gov_grant', kind:'good', weight:3, minYear:1945, maxEra:3, label:'Government research grant', money:[1.5,4.0], blurb:'A national science directorate underwrites part of your program.'}, // P6 6.2: agency-underwriting flavor; retired once the Commercial era (idx 4) arrives.
  {id:'investor',  kind:'good', weight:2, minYear:1950, minRep:40, label:'Investor windfall', money:[2.0,5.0], blurb:'A backer buys into your rising reputation.'},
  {id:'patent',    kind:'good', weight:2, minYear:1955, reqFlights:5, label:'Patent licensing payout', money:[1.0,3.0], blurb:'Rivals quietly license your hard-won engineering.'},
  {id:'insurance', kind:'good', weight:1, minYear:1948, reqFlights:1, label:'Insurance settlement', money:[0.8,2.0], blurb:'A claim from an earlier loss finally pays out.'},
  {id:'budget_cut',kind:'bad',  weight:2, minYear:1950, label:'Budget shortfall', money:[-3.0,-1.0], blurb:'A program overrun eats into your reserves.'},
  {id:'liability', kind:'bad',  weight:2, minYear:1952, reqFlights:3, label:'Accident liability', money:[-2.5,-0.8], blurb:'A ground mishap brings a settlement.'},
  {id:'supply',    kind:'bad',  weight:2, minYear:1955, label:'Propellant price spike', money:[-2.0,-0.6], blurb:'Commodity markets move against you.'},
  {id:'boom',      kind:'good', weight:3, minYear:1957, label:'Launch market boom', dur:[5,9], payoutMult:1.15, blurb:'Demand for launch surges — contracts pay more.'},
  {id:'downturn',  kind:'bad',  weight:3, minYear:1957, label:'Launch market downturn', dur:[5,9], payoutMult:0.85, blurb:'A glut of capacity drives contract prices down.'},
  {id:'subsidy',   kind:'good', weight:2, minYear:1960, maxEra:4, label:'Operations subsidy', dur:[4,8], overheadAdd:-0.05, blurb:'A standing grant offsets your monthly overhead.'}, // P6 6.2: standing government subsidy; persists through Commercial (commercial-crew subsidies) then retires at Expansion (idx 5).
  {id:'austerity', kind:'bad',  weight:2, minYear:1960, label:'Austerity audit', dur:[4,8], overheadAdd:0.06, blurb:'Compliance overhead raises your monthly burn.'},
  // M2: fuel-market events (only once a LEO depot exists to trade through)
  {id:'fuel_shortage', kind:'bad',  weight:2, minYear:1965, reqDepot:true, label:'Propellant shortage', fuelShock:1.45, blurb:'A supply crunch spikes orbital propellant prices.'},
  {id:'fuel_glut',     kind:'good', weight:2, minYear:1965, reqDepot:true, label:'Propellant glut', fuelShock:0.7, blurb:'Oversupply drives propellant prices down — a buyer\'s market.'},
  {id:'fuel_buyer',    kind:'good', weight:2, minYear:1965, reqDepot:true, label:'Rival propellant buy order', buyer:true, blurb:'A rival needs fuel fast and is paying a premium at your depot.'},
  // 2.3: route interruption — only eligible while a logistics shipment is actually in cruise (reqLogi gate)
  {id:'logi_mishap',   kind:'bad',  weight:2, minYear:1965, reqLogi:true, label:'Resupply route interruption', logiMishap:true, blurb:'A cruise anomaly threatens to set a resupply shipment back.'},
  // ── P6 6.2: per-era event pools. minEra/maxEra are ERA INDEX bounds, inclusive (see ERAS ~:751).
  //   Effect kinds/magnitudes mirror the era-agnostic entries above (money windfalls sized to gov_grant/
  //   investor scale, hits to budget_cut/liability scale). No new persisted state; no SAVE_VERSION bump.
  // Cold War prestige band — eras 1–2 (Early Orbital 1957 → Crewed & Lunar, ~1974): space-race politics.
  {id:'cw_prestige',      kind:'good', weight:2, minEra:1, maxEra:2, label:'Prestige funding surge', money:[2.0,5.0], blurb:'A rival\'s headline sparks a prestige panic — emergency program funds are rushed through.'},
  {id:'cw_audit',         kind:'bad',  weight:2, minEra:1, maxEra:2, label:'Prestige program audit', money:[-2.5,-1.0], blurb:'A legislative prestige audit freezes discretionary funds pending review.'},
  // Commercial investor-mania band — eras 4–5 (Commercial 2000 → Expansion): speculative launch-stock capital.
  {id:'investor_mania',   kind:'good', weight:2, minEra:4, maxEra:5, minRep:60, label:'Investor mania', money:[2.5,5.5], blurb:'Retail money floods launch stocks — a secondary offering clears at a frothy valuation.'},
  {id:'market_correction',kind:'bad',  weight:2, minEra:4, maxEra:6, label:'Market correction', money:[-4.0,-1.5], blurb:'The launch-stock bubble corrects; a down round wipes value off your balance sheet.'},
  // Expansion / ISRU band — eras 5–7 (Expansion 2030 → Speculative): off-world resource economics.
  {id:'isru_windfall',    kind:'good', weight:2, minEra:5, maxEra:7, label:'ISRU surplus sale', money:[2.5,5.5], blurb:'In-situ propellant output exceeds your own needs — the surplus sells at a premium off-world.'},
  {id:'offworld_dispute', kind:'bad',  weight:2, minEra:5, maxEra:7, label:'Off-world claims dispute', money:[-3.5,-1.0], blurb:'A resource-rights dispute over your off-world claims ties up assets in arbitration.'},
];
const EVENT_CHANCE=0.14;   // monthly probability of a new event (when off cooldown)
const EVENT_MIN_GAP=5;     // months of quiet enforced after each event
// M2: LEO propellant market
const FUEL_BASE=0.4, FUEL_MIN=0.18, FUEL_MAX=0.95, FUEL_SPREAD=0.10;

// ── Passive-income contracts (repeatable, with cooldown + diminishing returns) ──
// Standing service / licensing / defense contracts that pay a fixed monthly income for
// a fixed term, then expire onto a cooldown before they can be re-signed. Each renewal
// of the same contract pays a little less (PASSIVE_DIMINISH^signings, floored), so they
// are a renewable-but-fading revenue stream rather than infinite money. Gated by flown
// mission / research / reputation.
const PASSIVE_DIMINISH=0.85;        // each renewal of a contract pays 85% of the previous
const PASSIVE_FLOOR=0.40;           // …but never below 40% of the contract's base income
const PASSIVE_COOLDOWN=12;          // default months a contract rests before it can re-sign
const PASSIVE_CONTRACT_DEFS=[
  {id:'svc_orbit', cat:'sat', name:'Satellite Servicing Fleet', income:2.6, term:30, setup:5.0,
    reqResearch:'onorbit_servicing', minRep:150, blurb:'Robotic tugs refuel, repair and relocate customer satellites on retainer — the fleet On-Orbit Servicing research put in reach.'},
  // satellite services — open up once you can reach orbit
  {id:'sat_weather', cat:'sat', name:'Weather Satellite Operations', income:0.9, term:36, setup:2.0,
    reqMission:'first_sat', minRep:40, blurb:'Feed meteorological data to shipping, agriculture and media clients under a commercial met-data contract.',
    eraVariants:[{maxEra:3, blurb:'Operate a meteorological satellite for the national weather service.'}]}, // P6 6.3: government weather service (eras 0-3) → commercial met-data (era 4+)
  {id:'sat_comms', cat:'sat', name:'Commercial Comms Relay', income:1.6, term:36, setup:4.0,
    reqMission:'first_sat', minRep:90, blurb:'Lease transponder capacity on a commercial communications relay.',
    eraVariants:[{maxEra:3, name:'Experimental Comms Relay', blurb:'Lease capacity on an experimental communications relay for the national telecom authority.'}]}, // P6 6.3: experimental/state relay (eras 0-3) → commercial transponder lease (era 4+)
  {id:'sat_imaging', cat:'sat', name:'Earth-Imaging Constellation', income:2.4, term:36, setup:6.0,
    reqMission:'first_sat', minRep:140, blurb:'Sell multispectral imagery to agriculture, insurance and mapping clients.',
    eraVariants:[{maxEra:3, name:'Cartographic Survey Satellite', blurb:'Return survey imagery to the national mapping and resource-survey office.'}]}, // P6 6.3: state cartographic survey (eras 0-3) → commercial imaging constellation (era 4+)
  // human spaceflight / tourism
  {id:'tour_suborbit', cat:'tour', name:'Suborbital Tourism', income:0.7, term:30, setup:1.5,
    reqMission:'first_astro', minRep:70, blurb:'Fly paying passengers on suborbital arcs to the edge of space.'},
  {id:'tour_orbital', cat:'tour', name:'Orbital Tourism', income:1.8, term:30, setup:4.5,
    reqMission:'crew_orbit', minRep:120, blurb:'Private astronauts buy seats for a few days in orbit.'},
  {id:'tour_lunar', cat:'tour', name:'Lunar Flyby Tourism', income:4.5, term:36, setup:12.0,
    reqMission:'luna_flyby', minRep:240, blurb:'The ultimate ticket: a free-return loop around the Moon.'},
  // technology licensing — needs the technology, not just a flight
  {id:'lic_recovery', cat:'lic', name:'Booster-Recovery Licensing', income:2.0, term:36, setup:5.0,
    reqResearch:'propulsive_landing', minRep:120, blurb:'License your propulsive-landing IP to other launch providers.'},
  {id:'lic_ntr', cat:'lic', name:'Nuclear-Thermal Patent Licensing', income:3.5, term:36, setup:9.0,
    reqResearch:'nuclear_thermal', minRep:200, blurb:'Space agencies and defense pay to use your NTR designs.'},
  {id:'lic_isru', cat:'lic', name:'Sabatier ISRU Licensing', income:2.8, term:36, setup:7.0,
    reqResearch:'mars_isru', minRep:220, blurb:'License in-situ propellant production to the wider industry.'},
  // P8: Rapid Refurbishment synergy unlock (rapid_inspection + qa_program)
  {id:'lic_refurb', cat:'lic', name:'Fleet Refurbishment Licensing', income:2.4, term:36, setup:6.0,
    reqSynergy:'rapid_refurb', minRep:150, blurb:'License your rapid-turnaround inspection and refurbishment process to other operators running reusable fleets.'},
  // P9: one doctrine-exclusive standing contract per doctrine — only signable while that doctrine
  // is declared (reqDoctrine). An already-signed one keeps running if you later switch doctrine
  // (same as any other req-gated contract whose gate later stops holding) — just not renewable.
  {id:'doct_reuse', cat:'doct', name:'Turnaround Advisory Retainer', income:1.8, term:30, setup:3.0,
    reqDoctrine:'reuse', minRep:60, blurb:'Other operators pay a standing retainer for your rapid-refly turnaround expertise.'},
  {id:'doct_heavy', cat:'doct', name:'Heavy-Cargo Charter', income:2.2, term:30, setup:4.0,
    reqDoctrine:'heavy', minRep:60, blurb:'A standing charter for oversized payloads only your throw-weight can lift.'},
  {id:'doct_commercial', cat:'doct', name:'Manifest Brokerage', income:2.0, term:30, setup:3.5,
    reqDoctrine:'commercial', minRep:60, blurb:'Broker spare manifest capacity to other payload customers on a standing commission.'},
  {id:'doct_statecraft', cat:'doct', name:'National Prestige Program', income:1.6, term:30, setup:3.0, support:2,
    reqDoctrine:'statecraft', minRep:60, blurb:'A standing state retainer to keep the flag-planting program visible.'},
  {id:'doct_science', cat:'doct', name:'Research Consortium Grant', income:1.6, term:30, setup:3.0,
    reqDoctrine:'science', minRep:60, blurb:'A standing multi-university grant funding your ongoing science manifest.'},
  // military & defense — pay more, shorter terms (more churn), and lift public support
  {id:'mil_launch', cat:'mil', name:'Defense Launch Services', income:2.2, term:24, setup:5.0, cooldown:10, support:3,
    reqMission:'first_sat', minRep:90, blurb:'Assured-access launch for military payloads on a standing contract.',
    eraVariants:[{maxEra:3, name:'Strategic Launch Mandate', blurb:'Guarantee the government assured access to space for military payloads by direct mandate — no interruption tolerated for national security.'}]}, // P6 6.3: Cold War strategic mandate (eras 0-3) → standing commercial defense contract (era 4+)
  {id:'mil_recon', cat:'mil', name:'Reconnaissance Satellite Program', income:3.2, term:24, setup:8.0, cooldown:10, support:4,
    reqMission:'first_sat', minRep:160, blurb:'Build and operate classified imaging satellites for the defense ministry.',
    eraVariants:[{minEra:4, name:'Commercial Reconnaissance Partnership', blurb:'License classified-grade imaging capacity to the intelligence community under a commercial remote-sensing partnership.'}]}, // P6 6.3: classic state recon program (eras 0-3) → commercial-partnership imagery (era 4+)
  {id:'mil_warning', cat:'mil', name:'Missile-Warning Constellation', income:4.0, term:30, setup:11.0, cooldown:12, support:5,
    reqMission:'crew_orbit', minRep:220, blurb:'Early-warning infrared sentinels in high orbit — a national-security backbone.',
    eraVariants:[{maxEra:3, name:'Strategic Early-Warning Network', blurb:'Field infrared missile-warning sentinels in high orbit for the national defense command — the backbone of nuclear deterrence.'}]}, // P6 6.3: Cold War deterrence network (eras 0-3) → national-security backbone (era 4+)
];
const PASSIVE_CATS={sat:'Satellite Services', tour:'Human Spaceflight', lic:'Technology Licensing', mil:'Military & Defense', doct:'Doctrine'};
// P6 6.3: resolve a passive contract's era-appropriate name/blurb. eraVariants entries are checked in
// order (first bound match wins); a variant may override just name, just blurb, or both — anything it
// doesn't set falls through to the base def. No eraVariants / no match → base def, unchanged.
function passiveContractDisplay(d){
  if(d.eraVariants){
    const era=eraIndex(currentEra());
    for(const v of d.eraVariants){
      if(v.minEra!=null && era<v.minEra) continue;
      if(v.maxEra!=null && era>v.maxEra) continue;
      return {name:v.name||d.name, blurb:v.blurb||d.blurb};
    }
  }
  return {name:d.name, blurb:d.blurb};
}

// #8 Program politics (first slice): public support drives government funding.
// Support is a 0–100 mood dial; missions move it, the rivalry erodes it (national
// prestige), and it mean-reverts toward neutral. High support unlocks real monthly
// government grants — so a launch's value is reputational + political, not just cash.
const SUPPORT_BASE=50, SUPPORT_MIN=0, SUPPORT_MAX=100;
const SUPPORT_REVERT=0.04;        // monthly pull back toward neutral (slow — events lead)
const GOV_FUNDING_BASE=1.0;       // $M/mo at 100% support, era 0; grows +15%/era. Earned above neutral support only (see govMonthlyFunding).
const SUPPORT_TIERS=[             // ordered high→low; first match wins
  {min:85, label:'Galvanized',  color:'var(--ok)'},
  {min:65, label:'Supportive',  color:'var(--ok)'},
  {min:45, label:'Neutral',     color:'var(--readout)'},
  {min:25, label:'Skeptical',   color:'var(--warn)'},
  {min:0,  label:'Hostile',     color:'var(--bad)'},
];
const SUPPORT_DELTA={             // outcome-driven support swings
  routineSuccess:0.5, partial:1.0, abort:-3, lossUncrewed:-2,
  lossCrewed:-12, strand:-14, rivalFirst:-2.5, rivalFirstDone:-0.5,
};
// P6 6.4: era-sensitive public mood. Pioneer through Station & Shuttle (eras 0-3) — the space race is
// still front-page news — keep every SUPPORT_DELTA value exactly as tuned (mult 1, byte-identical).
// From Commercial era on, spaceflight is progressively more routine and a single mission's outcome
// swings public opinion less; same idiom as the sat_*/mil_* era reskins and gov_grant/subsidy retirement
// elsewhere in P6 (old-era behavior is the untouched reference, later eras are the ones that change).
const SUPPORT_ERA_MULT=[1,1,1,1, 0.85,0.7,0.55,0.45]; // indexed by era (Pioneer..Speculative)
function supportEraMult(){ return SUPPORT_ERA_MULT[eraIndex(currentEra())] ?? 1; }
function supportDelta(key){ return (SUPPORT_DELTA[key]||0)*supportEraMult(); }

const ENGINES = {
  a4:          {id:'a4',          name:'V-2 (A-4) Powerplant',            prop:'Alcohol/LOX', ispSL:203, ispVac:215, thrustSL:245, thrustVac:265, mass:0.95, cost:0.30, rel:0.96, base:true},
  kerolox_mk1: {id:'kerolox_mk1', name:'Rocketdyne S-3D',  prop:'RP-1/LOX',    ispSL:255, ispVac:290, thrustSL:360, thrustVac:400, mass:1.10, cost:0.60, rel:0.96},
  vernier_v:   {id:'vernier_v',   name:'Bell Agena XLR81',      prop:'RP-1/LOX',    ispSL:200, ispVac:315, thrustSL:55,  thrustVac:70,  mass:0.30, cost:0.45, rel:0.97},
  kerolox_mk2: {id:'kerolox_mk2', name:'Rocketdyne MA-3 Sustainer',prop:'RP-1/LOX',    ispSL:265, ispVac:312, thrustSL:520, thrustVac:580, mass:1.35, cost:0.95, rel:0.95},
  kerolox_mk3: {id:'kerolox_mk3', name:'Rocketdyne H-1',    prop:'RP-1/LOX',    ispSL:285, ispVac:335, thrustSL:1300,thrustVac:1450, mass:3.00, cost:2.20, rel:0.94},
  hyper_storable:{id:'hyper_storable',name:'AJ10 Aerozine/N₂O₄',prop:'Aerozine/N₂O₄',ispSL:270,ispVac:321, thrustSL:90,  thrustVac:100,  mass:0.45, cost:0.70, rel:0.97},
  hydrolox_up: {id:'hydrolox_up', name:'Rocketdyne J-2', prop:'LH₂/LOX',     ispSL:360, ispVac:425, thrustSL:800, thrustVac:900,  mass:1.80, cost:1.80, rel:0.95},
  f1_class:    {id:'f1_class',    name:'Rocketdyne F-1',  prop:'RP-1/LOX',    ispSL:263, ispVac:304, thrustSL:6700,thrustVac:7700, mass:8.40, cost:5.50, rel:0.93},
  // BC4 sidegrade: high-thrust kerolox first-stage engine — more thrust, less Isp, cheaper, heavier than the S-3D
  kerolox_le:  {id:'kerolox_le',  name:'Rocketdyne LR79',  prop:'RP-1/LOX',    ispSL:250, ispVac:278, thrustSL:480, thrustVac:520, mass:1.25, cost:0.55, rel:0.95},
  // BC4 sidegrade: small high-Isp cryo upper (RL10-class) — far higher Isp but little thrust; light + cheap
  hydrolox_rl10:{id:'hydrolox_rl10',name:'RL10-class Cryo Upper', prop:'LH₂/LOX', ispSL:150, ispVac:450, thrustSL:90, thrustVac:110, mass:0.55, cost:1.50, rel:0.96},
  // Propulsion expansion: methane (full-flow, reusable) — high Isp AND high thrust, usable on launch stages
  methalox:    {id:'methalox',    name:'Methalox Full-Flow (Raptor-class)', prop:'CH₄/LOX', ispSL:330, ispVac:363, thrustSL:1850, thrustVac:2000, mass:1.60, cost:1.90, rel:0.95},
  // BC4 sidegrade: vacuum-optimized methalox upper — more vac Isp, much less thrust than the full-flow booster
  methalox_vac:{id:'methalox_vac',name:'Methalox Vacuum (RL-class)', prop:'CH₄/LOX', ispSL:170, ispVac:385, thrustSL:600, thrustVac:750, mass:1.20, cost:1.70, rel:0.95},
  // Solid motors: high thrust, low Isp (little altitude compensation → SL≈Vac), cheap, very reliable to
  // ignite but no throttle and no shutdown once lit (solid:true). Usable as launch stages + strap-on boosters.
  solid_castor:{id:'solid_castor',name:'Castor Solid Motor', prop:'Solid (PBAN)', ispSL:235, ispVac:265, thrustSL:430, thrustVac:480, mass:1.10, cost:0.50, rel:0.975, solid:true, noThrottle:true},
  solid_scout: {id:'solid_scout', name:'Scout-class Solid Stage', prop:'Solid (CTPB)', ispSL:250, ispVac:278, thrustSL:100, thrustVac:120, mass:0.50, cost:0.55, rel:0.975, solid:true, noThrottle:true},
  solid_srb:   {id:'solid_srb',   name:'Segmented Solid Booster', prop:'Solid (APCP)', ispSL:242, ispVac:268, thrustSL:13000, thrustVac:14000, mass:11.0, cost:6.50, rel:0.965, solid:true, noThrottle:true},
  // M7 outer-system nuclear engines + solar-electric — in-space (transfer stage) only, blocked from launch-vehicle stages
  ntr_nerva:   {id:'ntr_nerva',   name:'NERVA (NRX) NTR', prop:'LH₂ (nuclear-thermal)', ispSL:0, ispVac:825, thrustSL:0, thrustVac:330, mass:6.80, cost:7.00, rel:0.95, transferOnly:true},
  nep_snap:    {id:'nep_snap',    name:'SNAP-derived NEP', prop:'Xe (nuclear-electric)', ispSL:0, ispVac:3000, thrustSL:0, thrustVac:5, mass:5.50, cost:9.00, rel:0.97, transferOnly:true, lowThrust:true, selfPowered:true},
  hall_thruster:{id:'hall_thruster',name:'Hall-Effect Thruster', prop:'Xe (solar-electric)', ispSL:0, ispVac:1800, thrustSL:0, thrustVac:3, mass:1.20, cost:3.50, rel:0.98, transferOnly:true, lowThrust:true, solarElectric:true, powerDraw:15},
  ion_xenon:   {id:'ion_xenon',   name:'Gridded Ion Thruster', prop:'Xe (solar-electric)', ispSL:0, ispVac:3600, thrustSL:0, thrustVac:0.5, mass:0.80, cost:4.00, rel:0.98, transferOnly:true, lowThrust:true, solarElectric:true, powerDraw:25},
  fusion_torch:{id:'fusion_torch', name:'Daedalus Fusion Torch', prop:'D–He₃ plasma', ispSL:0, ispVac:6000, thrustSL:0, thrustVac:60, mass:9.0, cost:25.0, rel:0.92, transferOnly:true},
};

const MISSIONS = [
  {id:'first_flight', name:'First Flight',          reqDv:1000, payload:0.05, crew:0, days:0, payout:1.6,  rep:5,  minRep:0,  blurb:'Get a vehicle off the pad and back intact. Prove the company can fly.<span class="hist">↳ Goddard\'s first liquid-fuel rocket rose just 12 m over a Massachusetts field in 1926.</span>'},
  {id:'sounding',     name:'Sounding Rocket',       reqDv:1900, payload:0.10, crew:0, days:0, payout:2.3,  rep:9,  minRep:4,  blurb:'Loft instruments into the upper atmosphere, roughly 80 km.<span class="hist">↳ The WAC Corporal and Aerobee first carried science into the upper atmosphere in the late 1940s.</span>'},
  {id:'reach_space',  name:'Reach Space',           reqDv:2900, payload:0.10, crew:0, days:0, payout:3.3,  rep:15, minRep:10, blurb:'Cross the Kármán line at 100 km — at the edge of what alcohol/LOX can do.<span class="hist">↳ A V-2 fired straight up in 1944 became the first craft to cross 100 km into space.</span>'},
  {id:'high_alt',     name:'High-Altitude Science', reqDv:4200, payload:0.25, crew:0, days:0, payout:5.0,  rep:22, minRep:16, blurb:'Carry a heavier package higher than the A-4 can reach — kerosene or staging required.<span class="hist">↳ The two-stage Bumper-WAC hit 393 km in 1949 — altitudes a single stage couldn\'t touch.</span>'},
  {id:'reentry_test', name:'Reentry Test Vehicle',  reqDv:6000, payload:0.10, crew:0, days:0, payout:8.5,  rep:38, minRep:26, blurb:'Loft a scaled nose cone on a high-energy ballistic arc far downrange — a staging and booster-clustering trial just short of orbital speed.<span class="hist">↳ Jupiter-C, 1956: a Redstone with clustered solid upper stages flew 1,094 km high and 5,300 km downrange — it would have orbited but for an inert final stage, a year before Sputnik.</span>'},
  {id:'first_sat',    name:'First Satellite',       reqDv:9400, payload:0.05, crew:0, days:0, payout:18.0, rep:60, minRep:38, blurb:'Reach orbital velocity (~9,400 m/s incl. losses). The Pioneer-era summit.<span class="hist">↳ Sputnik 1, October 1957: an 84 kg sphere whose radio beep opened the Space Age.</span>'},
  {id:'first_astro',  name:'First Astronaut',       reqDv:2900, payload:0.0, crew:1, days:0.2, payout:16.0, rep:50,  minRep:80,  reqResearch:'crew_capsule', blurb:'Put a person on a suborbital arc and bring them home alive. Man-rating begins here.<span class="hist">↳ Alan Shepard\'s 15-minute suborbital hop aboard Freedom 7, May 1961.</span>'},
  {id:'crew_orbit',   name:'Crewed Orbit',          reqDv:9400, payload:0.0, crew:1, days:1,   inclination:65, payout:35.0, rep:70,  minRep:105, reqResearch:'crew_capsule', blurb:'One astronaut, a day in orbit, a safe reentry. The defining flight of the era.<span class="hist">↳ Yuri Gagarin circled the Earth once aboard Vostok 1 on 12 April 1961, in a 65° orbit — easy from Baikonur\'s high-latitude, over-land range, but steeper than the Cape\'s ~57° direct-azimuth ceiling, so it costs a small dogleg here.</span>'},
  {id:'multi_day',    name:'Multi-Day Mission',     reqDv:9400, payload:0.0, crew:2, days:7,   payout:38.0, rep:65,  minRep:145, reqResearch:'crew_capsule', blurb:'Two crew, a week in orbit. Consumable mass starts to matter.<span class="hist">↳ Project Gemini stretched two-crew flights from days to two weeks through 1965.</span>'},
  {id:'endurance',    name:'Endurance Flight',      reqDv:9400, payload:0.0, crew:3, days:120, payout:75.0, rep:140, minRep:195, reqResearch:'crew_capsule', blurb:'Three crew, four months. Open-loop life support gets heavy — recovery tech pays for itself.<span class="hist">↳ Skylab\'s last crew logged 84 days in 1973–74; Salyut soon pushed past 120 by recycling air and water.</span>'},
  {id:'luna_flyby',   name:'Lunar Flyby',           crew:1, days:6, payout:55.0, rep:110, minRep:210, reqResearch:'deep_space',
    modules:['lv','transfer','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Lunar Injection', dv:3120, by:'transfer'}],
    blurb:'Loop a crew around the far side on a free-return trajectory and home again.<span class="hist">↳ Apollo 8 carried the first humans around the Moon at Christmas 1968.</span>'},
  {id:'luna_orbit',   name:'Lunar Orbit',           crew:1, days:8, payout:80.0, rep:150, minRep:300, reqResearch:'deep_space',
    modules:['lv','transfer','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Lunar Injection', dv:3120, by:'transfer'},{name:'Lunar Orbit Insertion', dv:900, by:'transfer'},{name:'Trans-Earth Injection', dv:900, by:'transfer'}],
    blurb:'Capture into lunar orbit, hold, then burn home. Your transfer stage must do all three deep-space burns on one tank.<span class="hist">↳ Apollo 10 rehearsed the full profile bar the landing in May 1969.</span>'},
  {id:'luna_landing', name:'Lunar Landing',         crew:2, days:10, payout:160.0, rep:260, minRep:420, reqResearch:null, archFork:'luna_landing', // CE3(c): gated by the committed lunar architecture (LOR/Direct/EOR), not a single tech
    modules:['lv','transfer','lander','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},
             {name:'Trans-Lunar Injection', dv:3120, by:'transfer'},
             {name:'Lunar Orbit Insertion', dv:900, by:'transfer'},
             {name:'Powered Descent', dv:1730, by:'descent', dropAfter:['descent']},
             {name:'Ascent to Lunar Orbit', dv:1730, by:'ascent', dropAfter:['ascent']},
             {name:'Trans-Earth Injection', dv:900, by:'transfer'}],
    blurb:'Two crew descend to the surface and lift off again to rejoin the transfer stage for the trip home. The descent stage stays on the Moon; the ascent stage is left in lunar orbit.<span class="hist">↳ Apollo 11, July 1969: the LM\'s descent stage became the launch pad for its own ascent stage.</span>'},
  {id:'mars_flyby',   name:'Mars Flyby',            crew:2, days:420, payout:220.0, rep:200, minRep:480, reqResearch:'mars_traj', window:true,
    modules:['lv','transfer','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Mars Injection', dv:3600, by:'transfer'}],
    blurb:'A free-return swing past Mars and back — over a year aloft. Closed-loop life support stops being optional.<span class="hist">↳ The 1960s-era Mars flyby studies that became the basis for crewed deep-space mission planning.</span>'},
  {id:'mars_orbit',   name:'Mars Orbit',            crew:3, days:520, payout:340.0, rep:280, minRep:560, reqResearch:'mars_traj', window:true,
    modules:['lv','transfer','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Mars Injection', dv:3600, by:'transfer'},{name:'Mars Orbit Insertion', dv:1400, by:'transfer'},{name:'Trans-Earth Injection', dv:1400, by:'transfer'}],
    blurb:'Capture into Mars orbit, wait out the return window, then burn home — a year and a half away from Earth on one tank.<span class="hist">↳ Mars mission architectures from the 1980s onward converge on long-stay, opposition-class profiles like this one.</span>'},
  // I1: the Ares Program's missing capstone — precision_edl already existed as a research node
  // ("Curiosity and Perseverance landed with guided entry and skycrane precision") with nothing to
  // unlock. Ascent (4100 dv) deliberately dwarfs the Moon's (1730): Mars's thin atmosphere still
  // cushions descent (reused at 1000, same as mars_orbit's implied surface leg) but gives no lift
  // on the way back up, unlike the Moon's symmetric descent/ascent. window:true like every other
  // Mars mission — it launches on the same 26-month synodic cadence.
  {id:'mars_landing', name:'Mars Landing',          crew:2, days:650, payout:560.0, rep:460, minRep:820, reqResearch:'precision_edl', window:true,
    modules:['lv','transfer','lander','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},
             {name:'Trans-Mars Injection', dv:3600, by:'transfer'},
             {name:'Mars Orbit Insertion', dv:1400, by:'transfer'},
             {name:'Powered Descent', dv:1000, by:'descent', dropAfter:['descent']},
             {name:'Ascent to Mars Orbit', dv:4100, by:'ascent', dropAfter:['ascent']},
             {name:'Trans-Earth Injection', dv:1400, by:'transfer'}],
    blurb:'Two crew descend to the surface and lift off again to rejoin the transfer stage for the trip home — Mars\'s thin atmosphere cushions the way down, but there\'s no help getting back up. The ascent stage alone is a harder burn than the entire trip to Earth orbit.<span class="hist">↳ Every serious Mars architecture since the 1990s (Mars Direct, NASA\'s Design Reference Architecture) treats the ascent vehicle as the single hardest problem in the mission.</span>'},
  {id:'belt_survey',  name:'Belt Survey',           crew:0, days:780, payout:280.0, rep:220, minRep:620, reqResearch:'nuclear_thermal',
    modules:['lv','transfer'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Belt Injection', dv:8000, by:'transfer'},{name:'Ceres Orbit Insertion', dv:500, by:'transfer'}],
    blurb:'A robotic prospector to the Asteroid Belt — years of cruise on a single nuclear tank, then a gentle capture at Ceres. No return.<span class="hist">↳ Dawn used ion propulsion to orbit both Vesta and Ceres, proving low-thrust transfer to the Belt.</span>'},
  {id:'belt_mining',  name:'Belt Mining Claim',     crew:2, days:960, payout:320.0, rep:300, minRep:760, reqResearch:'nuclear_thermal',
    modules:['lv','transfer','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Belt Injection', dv:8000, by:'transfer'},{name:'Ceres Orbit Insertion', dv:500, by:'transfer'},{name:'Trans-Earth Injection', dv:7600, by:'transfer'}],
    pgm:true,
    blurb:'Two crew stake the first platinum-group mining claim in the Belt and bring a sample home. First success opens a standing royalty stream. The return burn is brutal — Belt Volatiles ISRU all but requires it.<span class="hist">↳ A single metallic asteroid may hold more platinum-group metal than has ever been mined on Earth.</span>'},
  {id:'jupiter_flyby',name:'Jupiter Flyby',         crew:2, days:1460, payout:480.0, rep:360, minRep:900, reqResearch:'rad_shielding',
    modules:['lv','transfer','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Jupiter Injection', dv:6300, by:'transfer'}],
    blurb:'A crewed free-return swing through the Jovian system — four years aloft through the harshest radiation in the Solar System. Shielding is mandatory.<span class="hist">↳ Pioneer 10 was the first craft to cross the Belt and reach Jupiter, in 1973.</span>'},
  {id:'jupiter_orbit',name:'Jupiter Orbital Mission',crew:3, days:2190, payout:680.0, rep:480, minRep:1100, reqResearch:'rad_shielding',
    modules:['lv','transfer','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Jupiter Injection', dv:6300, by:'transfer'},{name:'Jovian Orbit Insertion', dv:1000, by:'transfer'},{name:'Trans-Earth Injection', dv:6300, by:'transfer'}],
    blurb:'Capture three crew into the Jovian system, survey the Galilean moons, and burn home — six years on one transfer stage. The far edge of the inner giants; only nuclear-electric makes the mass ratio close.<span class="hist">↳ Galileo orbited Jupiter for eight years; a crewed equivalent is the defining goal of the outer-system era.</span>'}, // I1: "capstone" wording retired — Saturn/Titan now sit beyond it
  // I1: the Saturn/Titan pair — BODIES already fully defined the ring system + Titan's aerobrake
  // capture with nothing to fly. nuclear_electric ("makes the deep outer system reachable") is the
  // gate, a sibling of Jupiter's rad_shielding off the same nuclear_thermal prereq — no soft-lock.
  {id:'saturn_orbit', name:'Saturn Orbital Survey', crew:3, days:2900, payout:950.0, rep:620, minRep:1400, reqResearch:'nuclear_electric',
    modules:['lv','transfer','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Saturn Injection', dv:7000, by:'transfer'},{name:'Saturn System Capture', dv:1100, by:'transfer'}],
    blurb:'Survey the rings and the largest moons from orbit — eight years aloft on a single nuclear-electric tank, four times the burn of the whole trip to Jupiter and back.<span class="hist">↳ Cassini orbited Saturn for 13 years before its final plunge into the planet in 2017.</span>'},
  {id:'titan_landing', name:'Titan Landing',         crew:2, days:3100, payout:1300.0, rep:780, minRep:1650, reqResearch:'nuclear_electric',
    modules:['lv','transfer','lander','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},
             {name:'Trans-Saturn Injection', dv:7000, by:'transfer'},
             {name:'Saturn System Capture', dv:1100, by:'transfer'},
             {name:'Titan Descent (aerobrake)', dv:400, by:'descent', dropAfter:['descent']},
             {name:'Ascent from Titan', dv:1500, by:'ascent', dropAfter:['ascent']},
             {name:'Trans-Earth Injection', dv:1100, by:'transfer'}],
    blurb:'A thick nitrogen atmosphere and a seventh of Earth\'s gravity make Titan the gentlest landing — and the gentlest departure — of any world beyond the Moon. Descend through orange haze onto a methane shoreline, then leave it again on a fraction of what Mars demands.<span class="hist">↳ Huygens returned the only images ever taken from Titan\'s surface, in January 2005 — a 2.5-hour parachute descent through a genuine atmosphere.</span>'},
  {id:'tanker_leo',   name:'Tanker Run (LEO Depot)', crew:0, days:0, payout:0, rep:6, minRep:38, reqResearch:'orbital_depot', reqDv:9400,
    payload:0, tanker:true,
    blurb:'No crew, no science — just propellant. Deliver a tank of fuel to the LEO depot for future missions to draw from.<span class="hist">↳ Propellant depots were proposed for Apollo-era architectures and became central to post-2010 reusable-launch economics.</span>'},
  // P8: Autonomous Landing synergy unlock (propulsive_landing + autonomous_navigation) — an uncrewed
  // mission type that couldn't exist on either tech alone: precision propulsive landing needs precise
  // autonomous guidance to place a high-value payload exactly, not just get it to orbit.
  {id:'precision_cargo', name:'Precision Cargo Delivery', reqDv:9400, payload:0.30, crew:0, days:0, payout:22.0, rep:55, minRep:180, reqSynergy:'autonomous_landing',
    blurb:'Autonomous guidance flies the final approach and a propulsive landing sets a high-value, fragile payload down exactly on target — no crew, no margin for drift.<span class="hist">↳ Precision propulsive landing under full autonomy is the capability that makes uncrewed point-delivery viable.</span>'},
  // #3: prestige science missions — pay little money, but bank a large knowledge windfall (sciYield)
  // that funds the science-gated deep-tech nodes (#1). The reason to collect science.
  {id:'space_telescope', name:'Orbital Observatory',  reqDv:9700, payload:0.12, crew:0, days:0, payout:6.0,  rep:24, minRep:70,  sciMission:true, sciYield:22, blurb:'Loft a long-baseline space telescope above the atmosphere — little commercial return, but years of discovery and prestige. A pure science play that banks the knowledge to unlock deep tech.<span class="hist">↳ The Hubble Space Telescope reshaped astronomy from low Earth orbit after its 1990 launch.</span>'},
  {id:'sample_return',   name:'Lunar Sample Return',   crew:0, days:12, payout:14.0, rep:40, minRep:230, reqResearch:'deep_space', sciMission:true, sciYield:42,
    modules:['lv','transfer'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Lunar Injection', dv:3120, by:'transfer'},{name:'Lunar Orbit Insertion', dv:900, by:'transfer'},{name:'Trans-Earth Injection', dv:900, by:'transfer'}],
    blurb:'A robotic lander scoops lunar regolith and rockets the capsule home — modest pay, a scientific windfall that funds your deep-tech programs.<span class="hist">↳ Luna 16 returned the first robotic soil sample from the Moon in 1970.</span>'},
  {id:'astrobiology',    name:'Astrobiology Survey',   crew:2, days:540, payout:48.0, rep:70, minRep:600, reqResearch:'mars_traj', window:true, sciMission:true, sciYield:78,
    modules:['lv','transfer','crew'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Mars Injection', dv:3600, by:'transfer'},{name:'Mars Orbit Insertion', dv:1400, by:'transfer'},{name:'Trans-Earth Injection', dv:1400, by:'transfer'}],
    blurb:'A dedicated search for life in the Martian subsurface — the science payoff dwarfs the contract fee, and only flights like this bank enough knowledge for the deepest tech.<span class="hist">↳ Viking\'s 1976 biology experiments remain the only direct astrobiology tests run on another planet.</span>'},
  // I1: the true endgame capstone. fusion_propulsion_research's own description already called this
  // out — "the drive every other transfer stage has been building toward" / "the most-studied path to
  // true interstellar precursor missions" — a research node with nothing to unlock until now.
  // Uncrewed (Voyager precedent, no return — the point is the burn, not the destination) and priced
  // as the biggest single payday in the game, matching its status as the last program on the list.
  {id:'oort_precursor', name:'Oort Cloud Precursor', crew:0, days:5500, payout:1800.0, rep:900, minRep:1900, reqResearch:'fusion_propulsion_research', sciMission:true, sciYield:120,
    modules:['lv','transfer'],
    profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Solar System Escape Injection', dv:8500, by:'transfer'}],
    blurb:'An uncrewed probe rides the fusion torch past the ice giants and out through the Oort Cloud, crossing into interstellar space at a fraction of the speed true interstellar flight will eventually need — the first real proof the drive works. No return; the point is the burn, not the destination.<span class="hist">↳ Voyager 1 crossed the heliopause into interstellar space in 2012 — the only human-made object ever to do so; Daedalus-class fusion drives were designed to make that crossing in years, not decades.</span>'},
];
// resolves EITHER an authored mission or a live procedural contract offer by id — the only
// lookup any "what mission is this id" call site needs once procedural ids exist (E1.3)
function missionById(id){ return MISSIONS.find(x=>x.id===id) || (state.contractOffers||[]).find(x=>x.id===id); }

/* ---------- E1.3: procedural contract generator ----------
   Fills the troughs between authored missions with repeatable, era + capability-gated filler
   contracts. Deliberately NOT authored milestones: proc:true opts them out of the firsts/completed
   tracking (finalizeLaunch), so they never trigger a milestone modal, rival-goal denial, or
   first-of-design prestige — see the proc gate at finalizeLaunch's success branch. Priced below the
   comparable authored mission (see each archetype's payout) so routine reflying of an authored
   mission stays the better long-run play; these are the "no station in range" filler, not the goal. */
const CONTRACT_ARCHETYPES=[
  { kind:'comsat', label:'Comsat Block Buy', minEra:1,
    req:st=>(st.leoFlights||0)>=3,
    weight:st=>1+Math.min(3,(st.leoFlights||0)/10),
    build:eraIdx=>{ const payload=round2(0.3+0.05*eraIdx);
      return { name:'Comsat Block Buy', reqDv:9400, payload, crew:0, days:0, minRep:0, inclination:0,
        payout:round2((18+3.4*eraIdx)*0.6), rep:6,
        blurb:'A commercial operator wants a standing block of comsats in equatorial (0°) geostationary orbit — the manifest pays well, but reaching the equatorial plane from the Cape\'s 28.4° latitude is a costly plane change. Real money, no headlines.' }; } },
  { kind:'crew_rotation', label:'Crew Rotation', minEra:2, reqResearch:'crew_capsule',
    req:st=>!!(st.research&&st.research.crew_capsule) && (st.crewFlown||0)>=1,
    weight:st=>1+Math.min(3,(st.crewFlown||0)/6),
    build:eraIdx=>{ const days=3+Math.floor(Math.random()*10);
      return { name:'Crew Rotation', reqDv:9400, payload:0, crew:1, days, minRep:0, reqResearch:'crew_capsule',
        payout:round2((6+1.2*days)*(1+0.1*eraIdx)*0.6), rep:8,
        blurb:'A standing crew slot needs rotating out — no new ground broken, but the manifest has to fly.' }; } },
  // Slice B: profile-shaped (short cruise, stays under DEFER_CRUISE_DAYS so it resolves synchronously
  // like the authored Lunar Sample Return — no deferred/activeFlights interaction to worry about).
  // Deliberately NO sciYield (unlike the authored mission it echoes) — that bonus is explicitly
  // first-flight-only (see finalizeLaunch), and a regenerating procedural offer would farm it forever.
  { kind:'sample_return', label:'Deep-Space Sample Return', minEra:2, reqResearch:'deep_space',
    req:st=>!!(st.research&&st.research.deep_space) && (st.deepFlights||0)>=1,
    weight:st=>1+Math.min(3,(st.deepFlights||0)/4),
    build:eraIdx=>{ const days=10+Math.floor(Math.random()*8);
      return { name:'Deep-Space Sample Return', reqDv:9400, payload:0, crew:0, days, minRep:0, reqResearch:'deep_space',
        modules:['lv','transfer'],
        profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Lunar Injection', dv:3120, by:'transfer'},{name:'Lunar Orbit Insertion', dv:900, by:'transfer'},{name:'Trans-Earth Injection', dv:900, by:'transfer'}],
        payout:round2((14+1.5*eraIdx)*0.55), rep:12,
        blurb:'A commercial lab wants another regolith sample — a proven profile, a standing customer, no new ground broken.' }; } },
];

/* ---------- Newspaper "below the fold" filler briefs (Slice C, 2026-07-12) ----------
   Disposable procedural texture that rides UNDER the main story whenever a real Agency Wire edition
   fires (milestone / disaster hearing / victory). Shaped like CONTRACT_ARCHETYPES above — {kind,
   minEra, req(st), weight(st), build(st,eraIdx)} — but build() returns a {headline, blurb} text pair
   instead of a mission. State-derived so the briefs read as current; req() gates out ones with nothing
   to draw from (no named staff, no built facility) so a brief is never empty or nonsensical. NOTHING
   here is persisted — it is picked fresh at render time and is not part of the Chronicle record (the
   main headline/dek is). Voice: the dry, faintly wry in-world trade-press register of the archetype
   blurbs and RIVAL_VOICE lines above — reporting, not joking. */
const NEWS_FILLER=[
  // A live rival's public posture, coloured by how many firsts it has actually claimed so far.
  { kind:'rival', minEra:1, req:st=>RIVALS.length>0, weight:st=>1.4,
    build:(st,eraIdx)=>{ const r=RIVALS[Math.floor(Math.random()*RIVALS.length)];
      const claims=Object.keys(st.rivalFired||{}).filter(k=>k.indexOf(r.id+'|')===0).length;
      const tail=claims>=3?`already sitting on ${claims} claimed firsts`
        :claims>0?`${claims} claimed first${claims===1?'':'s'} to its name`
        :'still hunting its first headline';
      return { headline:`${r.name} briefs on the decade ahead`,
        blurb:`The ${String(r.kind).toLowerCase()} talked reporters through an ambitious roadmap — ${tail}, and no shortage of confidence.` }; } },
  // A named hire gets the weekend-feature treatment. Gated on having actually hired someone.
  { kind:'staff', minEra:0, req:st=>Array.isArray(st.staff)&&st.staff.some(s=>personById(s.id)),
    weight:st=>1+Math.min(2,((st.staff||[]).length)/4),
    build:(st,eraIdx)=>{ const hired=(st.staff||[]).map(s=>personById(s.id)).filter(Boolean);
      const p=hired[Math.floor(Math.random()*hired.length)]; const role=(roleLabel(p)||'staff').toLowerCase();
      return { headline:`Trade press profiles ${p.name}, ${role}`,
        blurb:`A weekend feature on the agency's newest name to know — long on temperament and short on anything the competition didn't already know.` }; } },
  // A standing facility's "nothing to report" quarter. Gated on owning a built facility.
  { kind:'facility', minEra:2, req:st=>{ for(const id in (st.facilities||{})) if(facilityBuilt(id)) return true; return false; },
    weight:st=>1.2,
    build:(st,eraIdx)=>{ const built=Object.keys(st.facilities||{}).filter(id=>facilityBuilt(id));
      const id=built[Math.floor(Math.random()*built.length)]; const def=facilityById(id); const fs=facilityState(id);
      const mods=(fs&&fs.modules)||1;
      return { headline:`${def.name} logs another quiet quarter`,
        blurb:`The ${mods}-module outpost keeps ticking over with no incidents to report — which, in this line of work, passes for good news.` }; } },
  // The launch market, era-scaled: easy money early, crowded and margin-thin once the field fills in.
  { kind:'market', minEra:1, req:st=>true, weight:st=>1,
    build:(st,eraIdx)=>{ const crowded=eraIdx>=4;
      return { headline:crowded?'Launch market crowds further':'Launch market holds steady',
        blurb:crowded
          ? 'Brokers report margins thinning as more operators chase the same manifests — the era of an easy contract is well behind everyone.'
          : 'A stable quarter for launch pricing, with steady demand and few surprises on the manifest.' }; } },
  // Current public sentiment, phrased off the live support tier.
  { kind:'morale', minEra:0, req:st=>true, weight:st=>1,
    build:(st,eraIdx)=>{ const tier=publicMood().label.toLowerCase();
      return { headline:`Polling: the public turns ${tier}`,
        blurb:`This month's numbers put public sentiment toward the agency in ${tier} territory — the sort of figure that funds a program, or quietly fails to.` }; } },
];

/* ---------- Programs & long-term ambition (the "dream" layer) ----------
   Programs group the existing missions into named campaigns with objectives and a
   one-time completion bonus. Ambitions are the player's chosen long-term goal; the
   game tracks progress toward a capstone mission. Neither changes the rocket
   equation — they frame the missions you already fly so each one means something. */
const PROGRAMS = [
  {id:'pioneer',  name:'Pioneer Program',     blurb:'Get off the pad and to the edge of space.',                  missions:['first_flight','sounding','reach_space','high_alt','reentry_test'], reward:{money:4, rep:15}},
  {id:'vanguard', name:'Vanguard Program',    blurb:'Reach orbital velocity — the Space Age begins.',             missions:['first_sat'],                                       reward:{money:6, rep:25}},
  {id:'mercury',  name:'Mercury Program',     blurb:'Put a human in space and bring them home.',                  missions:['first_astro','crew_orbit'],                        reward:{money:10, rep:35}},
  {id:'gemini',   name:'Gemini Program',      blurb:'Endurance and operations — the skills the Moon demands.',    missions:['multi_day','endurance'],                           reward:{money:16, rep:45}},
  {id:'apollo',   name:'Apollo Program',      blurb:'Fly to the Moon, orbit it, and land.',                       missions:['luna_flyby','luna_orbit','luna_landing'],          reward:{money:35, rep:90}},
  {id:'ares',     name:'Ares Program',        blurb:'Carry a crew to Mars, land, and bring them home.',           missions:['mars_flyby','mars_orbit','mars_landing'],          reward:{money:100, rep:190}}, // I1: capstone extended to the landing; reward bumped for the 3rd, much harder objective
  {id:'outer',    name:'Outer Worlds Program',blurb:'The Belt and the Jovian system — the deep frontier.',        missions:['belt_survey','belt_mining','jupiter_flyby','jupiter_orbit'], reward:{money:110, rep:220}},
  {id:'cronus',   name:'Cronian Frontier',    blurb:'Saturn\'s rings, then Titan itself — the furthest a crew has ever gone.', missions:['saturn_orbit','titan_landing'],                    reward:{money:180, rep:340}}, // I1: the program beyond Outer Worlds — Saturn/Titan
  {id:'daedalus', name:'Daedalus Program',    blurb:'Prove fusion propulsion works — send a probe out past the Oort Cloud and into true interstellar space.', missions:['oort_precursor'],                                  reward:{money:250, rep:450}}, // I1: the last program on the list — the interstellar-precursor capstone
];
const AMBITIONS = [
  {id:'flag',       name:'Plant the Flag',     blurb:'Put boots on another world. The Moon is the prize — and the proof your company can do the impossible.', capstone:'luna_landing'},
  {id:'red_planet', name:'The Red Planet',     blurb:'Land a crew on Mars and bring them home. The hardest thing anyone has ever attempted.',                capstone:'mars_landing'}, // I1: capstone raised from mars_orbit — a landing, not just an orbit, is the actual hardest-thing-attempted
  {id:'belt_baron', name:'Baron of the Belt',  blurb:'Build a mining fortune in the Asteroid Belt — turn platinum-group metals into a launch empire.',       capstone:'belt_mining'},
  {id:'jovian',     name:'The Jovian Frontier',blurb:'Carry a crew to Jupiter and back — once the deep frontier, now the doorway to it.',                    capstone:'jupiter_orbit'}, // I1: "furthest humans have ever gone" retired — Titan now sits beyond it
  {id:'titan_bound',name:'The Methane Shore',  blurb:'Land a crew on Titan, past Saturn\'s rings — the furthest anyone has ever set foot.',                  capstone:'titan_landing'}, // I1: the new furthest-out ambition
  {id:'interstellar',name:'First Light, First Star', blurb:'Send a probe past the Oort Cloud and into interstellar space — proof a Daedalus-class drive can one day carry a crew to another star.', capstone:'oort_precursor'}, // I1: the true endgame ambition
];

/* ---------- Persistent infrastructure (stations & bases that remain and grow) ----------
   Found a facility once you've proven the capability (reqMission), then invest capital to
   expand it module by module across the decades. Built facilities persist in
   state.facilities[] and produce every month (passive income, propellant into the LEO
   depot, prestige) and give a "home-field" bonus (cheaper builds + a small reliability
   bump) to missions at that body. Unlike a one-off contract, what you build stays. */
const FACILITY_DEFS = [
  {id:'leo_station', name:'LEO Station', body:'earth', icon:'▣', color:'#5aa9e0',
   reqMission:'crew_orbit', foundCost:18, foundMonths:6,
   blurb:'A crewed outpost in low Earth orbit — laboratory, fuel node, and a permanent foothold above the atmosphere.',
   base:{income:0.7, fuel:0, rep:1, sci:1.5}, perModule:{income:0.5, fuel:0, rep:0.5, sci:1.2}},
  {id:'lunar_base', name:'Lunar Base', body:'moon', icon:'◆', color:'#b9c0c7',
   reqMission:'luna_landing', foundCost:55, foundMonths:12,
   blurb:'A permanent settlement on the Moon. Habitats, an ISRU plant cracking polar ice into propellant, and the first town beyond Earth.',
   base:{income:1.4, fuel:0.4, rep:2, sci:2.5}, perModule:{income:1.0, fuel:0.5, rep:1, sci:2}},
  {id:'mars_base', name:'Mars Base', body:'mars', icon:'★', color:'#c1532b',
   reqMission:'mars_orbit', foundCost:130, foundMonths:18,
   blurb:'A foothold on Mars. Sabatier methalox production, greenhouses, and the seed of a self-sustaining second home for humanity.',
   base:{income:2.6, fuel:0.6, rep:3, sci:4}, perModule:{income:1.8, fuel:0.8, rep:1.5, sci:3}},
];

// #89: three real Deep Space Network analogs — the actual historical siting (~120° apart in
// longitude) for genuine round-the-clock coverage of a probe as Earth turns. `body:'earth'` matches
// the FACILITY_DEFS convention (unused this slice; groundwork for slice 2's map marker). Setup/upkeep
// costs are a first pass, sized similarly to Research Partnerships (sim.js PARTNERS) — not a final
// balance call. Lifecycle functions (trackingStationCount/canBuildStation/buildTrackingStation) live in
// sim.js, same FACILITY_DEFS(data.js)/facility-functions(sim.js) split already used for facilities.
const TRACKING_STATIONS = [
  {id:'goldstone', name:'Goldstone Deep Space Complex', place:'Mojave Desert, California', body:'earth', icon:'▲', color:'#8fc4ff',
   reqResearch:'deep_space', setup:3.0, upkeep:0.10,
   blurb:'The original Deep Space Network site — dishes in the Mojave that have tracked everything from Mariner to Voyager.'},
  {id:'madrid', name:'Madrid Deep Space Complex', place:'Robledo de Chavela, Spain', body:'earth', icon:'▲', color:'#8fc4ff',
   reqResearch:'deep_space', setup:3.5, upkeep:0.12,
   blurb:'The European leg of the network — closes the gap as Earth turns Goldstone away from a distant probe.'},
  {id:'canberra', name:'Canberra Deep Space Complex', place:'Tidbinbilla, Australia', body:'earth', icon:'▲', color:'#8fc4ff',
   reqResearch:'deep_space', setup:4.0, upkeep:0.14,
   blurb:'The southern-hemisphere anchor — with Goldstone and Madrid, closes full round-the-clock coverage.'},
];

// Side-view module spec (model space, +x downstream): a pressurized can with an axial docking
// node, radial berthing ports, dish + whip antennas, solar wings and a radiator. Each `parts`
// entry is a labelled detail the bench annotates with a leader line — the hook future content
// extends. Coordinates are relative to the module centre.
const STATION_MODULES = [
  { id:'can_std', name:'Pressurized Habitat', short:'HAB', len:200, dia:88, color:'#b8c0c7',
    cost:8, buildMo:4, stats:{ mass:18.0, crew:3, powerGenKw:6.0, powerDrawKw:4.2 },
    prod:{ income:0.5, fuel:0, rep:0.5, sci:0.8 }, role:'Core / crew',
    blurb:'Crew quarters, galley and workstations — the living space every station grows from.',
    hist:'Skylab (1973) gave the US its first roomy orbital home; Mir\'s core module (1986) proved a station could be permanently crewed for a decade.',
    synHint:'Supplies the crew that Labs, Depots and Greenhouses need. Pairs with a Lab for +20% science and a Greenhouse for +15% income.',
    parts:[
      { key:'axial_dock', label:'Axial docking port',   x:120,  y:0,   note:'Forward CBM / androgynous dock' },
      { key:'port_p',     label:'Radial berthing port', x:30,   y:-48, note:'Side hatch for branch modules' },
      { key:'port_s',     label:'Radial berthing port', x:-30,  y:48,  note:'Side hatch (opposite face)' },
      { key:'dish',       label:'High-gain antenna',    x:-70,  y:-78, note:'Steerable comms dish' },
      { key:'whip',       label:'Omni antenna',         x:70,   y:-72, note:'Low-gain whip' },
      { key:'solar_p',    label:'Solar array wing',     x:0,    y:-150,note:'Photovoltaic wing (port)' },
      { key:'solar_s',    label:'Solar array wing',     x:0,    y:150, note:'Photovoltaic wing (starboard)' },
      { key:'radiator',   label:'Thermal radiator',     x:-95,  y:60,  note:'Heat-rejection panel' },
      { key:'aft',        label:'Aft node / endcap',    x:-120, y:0,   note:'Pressure dome + utility trunk' },
    ] },
  { id:'lab_mod', name:'Research Laboratory', short:'LAB', len:180, dia:84, color:'#5aa9e0',
    cost:11, buildMo:5, stats:{ mass:16.5, crew:0, crewReq:2, powerGenKw:0, powerDrawKw:5.5 },
    prod:{ income:0.2, fuel:0, rep:0.3, sci:2.6 }, role:'Science',
    blurb:'Racks of microgravity experiments — materials, biology, fluids. The station\'s science engine.',
    hist:'The ISS Destiny lab (2001) and Europe\'s Columbus (2008) turned the station into a permanent research platform, running thousands of experiments a year.',
    synHint:'Big science, but power-hungry and needs 2 crew from a Habitat. With a Habitat aboard, crewed research runs +20% science.' },
  { id:'power_truss', name:'Solar Power Truss', short:'PWR', len:150, dia:36, color:'#e8b64c',
    cost:6, buildMo:3, stats:{ mass:12.0, crew:0, powerGenKw:16.0, powerDrawKw:0.4 },
    prod:{ income:0.25, fuel:0, rep:0, sci:0 }, role:'Power',
    blurb:'Deployable photovoltaic wings and batteries. Power-hungry modules need one of these behind them.',
    hist:'The ISS Integrated Truss carries an acre of solar arrays generating ~120 kW — the backbone that lets every other module run at once.',
    synHint:'+16 kW keeps Labs and Greenhouses out of the 60%-output power-starve penalty. Push the station to +8 kW net surplus for a station-wide efficiency bonus.' },
  { id:'node_hub', name:'Docking Node', short:'NODE', len:90, dia:76, color:'#8f9aa6',
    cost:5, buildMo:3, stats:{ mass:9.0, crew:0, powerGenKw:0, powerDrawKw:0.8 },
    prod:{ income:0.1, fuel:0, rep:0.2, sci:0 }, ports:3, role:'Structure',
    blurb:'A six-port junction sphere. Every node adds 3 berths of growth room to the station.',
    hist:'The ISS nodes Unity, Harmony and Tranquility are the junctions everything else bolts onto — without them the station couldn\'t branch.',
    synHint:'Cheap and light. The only way past the 4-port base limit — dock one before the station fills up, or growth stalls.' },
  { id:'depot_mod', name:'Propellant Depot Module', short:'FUEL', len:170, dia:96, color:'#67c587',
    cost:12, buildMo:5, stats:{ mass:20.0, crew:0, crewReq:1, powerGenKw:0, powerDrawKw:2.2 }, reqResearch:'orbital_depot',
    prod:{ income:0.35, fuel:0.8, rep:0.3, sci:0 }, role:'Logistics',
    blurb:'Insulated tankage and transfer plumbing — the station becomes a gas station, feeding the LEO depot economy.',
    hist:'Long theorized (von Braun sketched orbital tankers in the 1950s), propellant depots are the enabling infrastructure for cheap deep-space missions that never launch full.',
    synHint:'Produces depot propellant that cuts the launch mass of your deep missions. Add a Power Truss and the pumps run +25% fuel throughput.' },
  { id:'greenhouse', name:'Greenhouse Module', short:'GRN', len:190, dia:90, color:'#7bc46a',
    cost:10, buildMo:5, stats:{ mass:15.0, crew:0, crewReq:1, powerGenKw:0, powerDrawKw:4.8 }, reqResearch:'eclss_partial',
    prod:{ income:0.15, fuel:0, rep:0.4, sci:0.4 }, resupplyCut:0.15, role:'Life support',
    blurb:'Crops under grow-lights. Each greenhouse cuts this facility\'s standing resupply cost 15% — food grown on-site never needs launching.',
    hist:'Salyut cosmonauts grew the first plants in orbit; the ISS Veggie system (2014) served the first space-grown salad. Closed-loop food is the key to bases far from resupply.',
    synHint:'Each one cuts standing resupply 15% and feeds itself — decisive on the Moon/Mars where resupply is 2–4× costlier. With a Habitat, closed-loop life support adds +15% income.' },
  // ---- E1.8 slice C: surface-only base modules (surface:true). Excluded from the orbital station
  // bench; surface benches exclude the orbital-only modules (Docking Node's berth-sphere, the
  // radiator-heavy structure) in turn. Wider/shorter hulls read as ground hardware, not cans. ----
  { id:'isru_plant', name:'ISRU Plant', short:'ISRU', len:210, dia:104, color:'#c88a4a', surface:true,
    cost:14, buildMo:6, stats:{ mass:22.0, crew:0, crewReq:1, powerGenKw:0, powerDrawKw:7.5 }, reqResearch:'lunar_isru',
    prod:{ income:0.4, fuel:1.4, rep:0.5, sci:0.3 }, role:'Surface / propellant',
    blurb:'Cracks local ice or atmosphere into propellant on the surface — the reason a base pays for itself. Feeds the depot economy from the Moon or Mars instead of from Earth.',
    hist:'Every serious lunar or Mars architecture since Apollo has turned on ISRU — making the return propellant on-site instead of hauling it across the Solar System.',
    synHint:'Big surface fuel output, power-hungry. Back it with a Reactor Pad or Power Truss; each Greenhouse-cut on resupply keeps it running cheaper.' },
  { id:'reactor_pad', name:'Surface Reactor', short:'RTG', len:160, dia:80, color:'#d0563a', surface:true,
    cost:13, buildMo:6, stats:{ mass:14.0, crew:0, powerGenKw:24.0, powerDrawKw:0.6 }, reqResearch:'surface_fission_power',
    prod:{ income:0.15, fuel:0, rep:0.2, sci:0 }, resupplyCut:0.1, role:'Surface / power',
    blurb:'A compact fission reactor that powers the base through the long lunar night or a Martian winter — the surface answer to arrays that go dark.',
    hist:'NASA\'s Kilopower / Fission Surface Power work targets tens of kilowatts on another world — steady power regardless of sun angle or dust.',
    synHint:'+24 kW day or night, unlike solar. The power backbone every crewed surface base wants; also trims standing resupply 10%.' },
  { id:'hab_dome', name:'Habitat Dome', short:'DOME', len:220, dia:120, color:'#c3cad1', surface:true,
    cost:12, buildMo:5, stats:{ mass:20.0, crew:4, powerGenKw:5.0, powerDrawKw:5.0 },
    prod:{ income:0.6, fuel:0, rep:0.8, sci:0.9 }, role:'Surface / crew',
    blurb:'A regolith-shielded pressurized dome — more crew capacity than an orbital can, and the social heart of a surface settlement.',
    hist:'Buried or regolith-piled habitats are the standard concept for shielding a surface crew from radiation and micrometeorites over long stays.',
    synHint:'The surface Habitat: crew for ISRU plants and Labs, plus a rep/income lift from a growing settlement. Pairs with a Lab and a Greenhouse just like the orbital Habitat.' },
  { id:'rover_garage', name:'Rover Garage', short:'ROV', len:190, dia:98, color:'#9aa6b0', surface:true,
    cost:9, buildMo:4, stats:{ mass:13.0, crew:0, crewReq:1, powerGenKw:0, powerDrawKw:3.0 },
    prod:{ income:0.3, fuel:0, rep:0.5, sci:1.4 }, role:'Surface / mobility',
    blurb:'Pressurized rovers and an airlock bay — extends the base\'s reach for field science and prospecting far beyond the habitat.',
    hist:'Apollo\'s Lunar Roving Vehicle tripled crew traverse range; pressurized rovers are the concept for multi-week surface expeditions on the Moon and Mars.',
    synHint:'Steady field science that grows with the base. Needs a crew slot from a Habitat Dome — mobility is people-driven.' },
];
const STATION_PORT_BASE=4; // a core stack holds 4 modules; each Docking Node adds its ports

/* ---------- #7: Manufacturing capacity (first slice) ----------
   Money was nearly the only resource. This adds an industrial layer: three
   leveled production lines you fund with capital AND ongoing monthly upkeep, so
   "another pad vs. hydrogen engines" becomes a real allocation decision. All
   three start at level 1 (the garage baseline) with NO effect, so early-game
   balance is preserved — only investment changes the pipeline.
     • Assembly Bays  — a CAPACITY CONSTRAINT: a vehicle's integration "units"
       (stages + transfer/lander/crew + assembly flights) must fit your bay
       throughput, or build time balloons; surplus bays streamline every build.
     • Engine Foundry — economies of scale cut the marginal BUILD COST.
     • Launch Pads    — more ground capacity amortizes LAUNCH COST per flight.
   Later slices (tracked in ROADMAP #7): raw-material supply chains, production
   scheduling/bottlenecks, QA→#16 reliability, inventory, refurbishment. */
const PRODUCTION_DEFS = [
  {key:'bays',    name:'Assembly Bays', icon:'🏭', baseCost:6, months:3, upkeep:0.05,
   blurb:'Parallel integration cells. Capacity to assemble complex vehicles without overstretching the line — and surplus bays streamline every build.'},
  {key:'foundry', name:'Engine Foundry', icon:'⚙', baseCost:8, months:4, upkeep:0.06,
   blurb:'In-house engine and tank production. Economies of scale cut the marginal cost of every vehicle you build.'},
  {key:'pads',    name:'Launch Pads', icon:'🛫', baseCost:5, months:3, upkeep:0.04,
   blurb:'Additional pads and integration towers. Each level both amortizes launch operations (cheaper per launch) AND raises launch CADENCE — fly one prebuilt rapid flight per pad in the same month (L1 → 1/mo, L5 → 5/mo) so a real fleet flies on a tempo, not one at a time.'},
  {key:'qa',      name:'Quality Assurance', icon:'🔬', baseCost:7, months:3, upkeep:0.05,
   blurb:'Inspection, traceability, and process control on the line — fewer manufacturing defects, so every vehicle you build flies a little more reliably.'},
];
const PROD_MAX_LEVEL = 5;
const BAY_CAP_BASE = 3, BAY_CAP_PER = 2;        // assembly capacity = base + per·(level−1)
const BAY_SPEED_CAP = 2;                         // most build-months a roomy plant can shave
const FOUNDRY_PER = 0.05, FOUNDRY_FLOOR = 0.78;  // build-cost multiplier (≤22% off at L5)
const PAD_PER = 0.12, PAD_FLOOR = 0.60;          // launch-cost multiplier (≤40% off at L5)
const QA_REL_PER = 0.012, QA_REL_CAP = 0.05;     // #7 slice 2: QA reliability bonus per level / cap (≤+4.8% at L5)
const QA_FRAG_PER = 0.05, QA_FRAG_CAP = 0.20;    // #7 slice 3 (QA→#16): mfg-subsystem fragility weight cut per level / cap (≤−20% at L5)
const QA_MFG_SUBSYS = new Set(['propulsion','structures','separation','boosters']); // subsystems QA can actually fix (welds, tolerances, pyros, integration) — avionics/life-support/deep-propulsion are software/environment-driven
const OVERSTRETCH_REL_PER = 0.015, OVERSTRETCH_REL_CAP = 0.06; // reliability lost per build-month over bay capacity / cap
// #7 slice 5 — cadence pressure: pushing builds through faster than the line can sustain costs extra (overtime, expediting parts).
const CADENCE_WINDOW = 12;             // months of recent build history that counts
const CADENCE_SURCHARGE_PER = 0.05;    // +5% buildCost per 0.10 load over capacity
const CADENCE_SURCHARGE_CAP = 0.30;    // ≤30% rush surcharge at extreme cadence
// #7 slice 6 — raw-material supply chains. Two commodities you can't avoid buying;
// the spot price wanders and a long-term contract trades a small premium for predictability.
const MATERIAL_DEFS = [
  {key:'alloy',       name:'Alloys',      icon:'⛓', share:0.50, blurb:'Aerospace-grade aluminum, steel, and titanium for tankage, structures, and engines.'},
  {key:'electronics', name:'Electronics', icon:'💾', share:0.20, blurb:'Avionics-grade integrated circuits, guidance hardware, sensors.'},
];
const MATERIAL_BASELINE_SHARE = 0.30;  // labor + everything that isn't a tracked commodity
const MATERIAL_PRICE_MIN = 0.7;
const MATERIAL_PRICE_MAX = 1.4;
const MATERIAL_PRICE_REVERT = 0.10;    // mean-revert pull toward 1.0
const MATERIAL_PRICE_WALK = 0.05;      // ±5% random walk per month
// (The 12-mo contract-lock constants were removed here — retired with the market collapse,
// no longer referenced anywhere; materialPriceTick() still decrements/expires any contract
// object a legacy save might carry, using the stored monthsLeft directly.)
// #7 slice 7 — inventory & forecasting. 1 stock unit = 1 build's worth of that commodity.
// Cost per stock unit = spot × share (so a build-worth of alloy at spot 1.0 buys for $0.50M,
// matching alloy's 50% slice of a notional $1.0M build). Held stock is used at avg cost when
// the next build runs, insulating you from spot moves you've already bought past.
const MATERIAL_STOCK_UNIT_BUILD = 1.0; // calibrated against a $1M reference build (share*spot = $M/unit)
const MATERIAL_STOCK_CAP = 24;          // can't pile more than 24 builds' worth in the yard
const MATERIAL_HISTORY_LEN = 24;        // months of spot-price history retained for the sparkline
// Collapsed market — the one real decision is buying a dip. Routine per-commodity buying and the
// 12-mo contract lock were retired (weak-pull surface); the market now only asks for attention when
// a commodity falls into the dip band, at which point one bulk-buy stocks the yard at a discount.
const MATERIAL_DIP_THRESHOLD = 0.88;    // spot at/below this = a buying opportunity ("on sale")
const MATERIAL_DIP_BONUS     = 0.05;    // a dip bulk-buy shaves another 5% under the already-low spot
const MATERIAL_DIP_BATCH     = 8;       // one dip buy tops the yard up by this many builds' worth (capped)
const METRIC_HISTORY_LEN = 24;          // #28: months of core-metric history retained for dashboard sparklines
// #28: per-metric monthly trend buffers (capital/rep/support/success-rate/science)
// Finances tab: revenue/expenses/net added — money[] is the capital LEVEL each month (a running
// balance), these three are the recurring FLOW for that month (state.lastMonth, snapshotted here
// rather than derived by diffing money[], since one-time windfalls would otherwise pollute the diff).
function defaultMetricHist(){ return {money:[], rep:[], support:[], success:[], science:[], revenue:[], expenses:[], net:[]}; }
// Bench customization slice 1: cosmetic livery (body + accent color, nose style, name).
// Pure visual — read by drawVehicle, so it shows on the bench preview AND in flight.
const DEFAULT_LIVERY={ body:'#d4dee4', accent:'#e0564f', nose:'auto', name:'' };
function defaultLivery(){ return Object.assign({}, DEFAULT_LIVERY); }
function curLivery(){ const l=state&&state.livery; return l?Object.assign(defaultLivery(),l):defaultLivery(); }
// Bench customization slice 2 (BC2): performance parts — engineering levers that feed
// computeVehicle. The DEFAULT of each lever is a zero-impact baseline (sigmaMult 1, cost 0,
// rel 0, mass 0) so default vehicles compute EXACTLY as before — every option is a real
// tradeoff away from that baseline, keeping existing balance intact.
const TANK_MATERIALS={
  standard:{name:'Aluminum alloy',    sigmaMult:1.00, costMult:1.00, rel:0,     desc:'Baseline tank structure.'},
  alli:    {name:'Aluminum-lithium',  sigmaMult:0.85, costMult:1.30, rel:-0.01, desc:'−15% structural mass (more Δv), +30% build cost, −1% reliability (thinner walls).'},
  steel:   {name:'Stainless steel',   sigmaMult:1.20, costMult:0.78, rel:0.02,  desc:'+20% structural mass (less Δv), −22% build cost, +2% reliability (rugged).'},
};
const AVIONICS={
  basic:   {name:'Basic guidance',    rel:0,    cost:0,   mass:0,    desc:'Minimal autopilot — baseline.'},
  standard:{name:'Inertial + radio',  rel:0.03, cost:0.4, mass:0.05, desc:'+3% reliability · +$0.4M · +0.05 t.'},
  triple:  {name:'Triple-redundant',  rel:0.06, cost:1.0, mass:0.12, desc:'+6% reliability · +$1.0M · +0.12 t.'},
};
const FAIRINGS={
  standard:{name:'Standard fairing',  mass:0,   cost:0,    rel:0,     desc:'Protects the payload through max-Q — baseline.'},
  none:    {name:'No fairing',        mass:0,   cost:-0.1, rel:-0.02, desc:'Strip the shroud — −$0.1M but −2% reliability (exposed payload). Uncrewed only.'},
  heavy:   {name:'Extended fairing',  mass:0.5, cost:0.4,  rel:0.02,  desc:'Larger shroud: +2% reliability but +0.5 t to loft and +$0.4M.'},
};
function defaultParts(){ return {tank:'standard', avionics:'basic', fairing:'standard'}; }
function curParts(){ const p=state&&state.parts; return p?Object.assign(defaultParts(),p):defaultParts(); }
function tankMaterial(){ return TANK_MATERIALS[curParts().tank]||TANK_MATERIALS.standard; }
function avionicsPart(){ return AVIONICS[curParts().avionics]||AVIONICS.basic; }
function fairingPart(){ return FAIRINGS[curParts().fairing]||FAIRINGS.standard; }
// extra lofted mass from parts (avionics always; fairing only on uncrewed flights, which use a capsule)
function partsExtraMass(m){ const crewed=!!(m&&m.crew>0); return avionicsPart().mass + (crewed?0:fairingPart().mass); }
// reliability delta from parts (tank + avionics always; fairing only uncrewed)
function partsRelBonus(crewed){ return avionicsPart().rel + tankMaterial().rel + (crewed?0:fairingPart().rel); }
// additive part build cost (fairing only on uncrewed)
function partsBuildCost(crewed){ return avionicsPart().cost + (crewed?0:fairingPart().cost); }
// BC3: per-stage geometry — diameter as a multiplier around the natural (volume-derived)
// size. Default 1.0 == today's shape AND mass (so balance is unchanged). Wider = stouter
// (more structural mass → less Δv, but +reliability); narrower = slender (lighter → more
// Δv, but −reliability). Length follows from propellant volume, so diameter is the lever.
const GEO_DIA_MIN=0.7, GEO_DIA_MAX=1.4;
const GEO_MASS_K=0.5;  // structural-mass sensitivity to diameter (0.7→0.85×, 1.4→1.20×)
const GEO_REL_K=0.06;  // reliability per stage per unit diameter deviation
function stageDia(st){ return clampA((st&&st.dia)||1, GEO_DIA_MIN, GEO_DIA_MAX); }
function geoStructMult(dia){ dia=dia||1; return clampA(1+GEO_MASS_K*(dia-1), 0.6, 1.6); }
function geoRelBonus(){ let s=0; for(const st of (state.stages||[])) s+=GEO_REL_K*(stageDia(st)-1); return clampA(s,-0.05,0.05); }

/* ---------- Mission architectures (how you get there is a strategy) ----------
   For supported missions, the player picks an architecture that reshapes the
   mission profile (which legs, which stage does them), the hardware (modules),
   the duration, and the risk. The rocket-equation engine already simulates any
   profile, so an architecture is just a profile/modules/days swap + a small
   reliability modifier — no new missions, but a deep strategic fork. */
const MISSION_ARCH = {
  luna_landing: [
    // CE3(c): the lunar architecture fork — a committed, mutually-exclusive company choice.
    // Each route demands a DIFFERENT enabling technology (lander vs heavy-lift vs rendezvous),
    // so your research focus (CE3b) decides which path is open and cheap. reqResearch gates which
    // architectures you may commit to; the base luna_landing mission is flyable once ANY is unlocked.
    {id:'lor', name:'Lunar Orbit Rendezvous', relMod:0, reqResearch:'lunar_lander', needs:'a dedicated lunar lander',
     blurb:'A dedicated two-stage lander descends while the transfer stage waits in orbit — the mass-efficient route Apollo took. Needs the lander, but the lightest propellant bill.',
     modules:['lv','transfer','lander','crew'],
     profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},
              {name:'Trans-Lunar Injection', dv:3120, by:'transfer'},
              {name:'Lunar Orbit Insertion', dv:900, by:'transfer'},
              {name:'Powered Descent', dv:1730, by:'descent', dropAfter:['descent']},
              {name:'Ascent to Lunar Orbit', dv:1730, by:'ascent', dropAfter:['ascent']},
              {name:'Trans-Earth Injection', dv:900, by:'transfer'}]},
    {id:'direct', name:'Direct Ascent', relMod:0.02, reqResearch:'heavy_lift_infrastructure', needs:'heavy-lift ground infrastructure',
     blurb:'No separate lander — the transfer stage carries the whole crew stack down to the surface and back. Far fewer separations (steadier reliability), but it must haul all the return propellant down and up: a brutal mass penalty demanding an enormous launcher.',
     modules:['lv','transfer','crew'],
     profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},
              {name:'Trans-Lunar Injection', dv:3120, by:'transfer'},
              {name:'Lunar Orbit Insertion', dv:900, by:'transfer'},
              {name:'Powered Descent', dv:1730, by:'transfer'},
              {name:'Ascent from Surface', dv:1730, by:'transfer'},
              {name:'Trans-Earth Injection', dv:900, by:'transfer'}]},
    {id:'eor', name:'Earth Orbit Rendezvous', relMod:-0.02, reqResearch:'orbital_assembly', days:12, needs:'orbital assembly & docking',
     blurb:'Assemble the lunar stack in Earth orbit from several smaller launches, then depart as one — the route for a company that mastered rendezvous instead of a giant rocket or a bespoke lander. A lander still descends (mass-efficient), but every docking is a chance to fail: more ops, more risk.',
     modules:['lv','transfer','lander','crew','assembly'],
     profile:[{name:'Ascent to LEO (assembled)', dv:9400, by:'lv'},
              {name:'Trans-Lunar Injection', dv:3120, by:'transfer'},
              {name:'Lunar Orbit Insertion', dv:900, by:'transfer'},
              {name:'Powered Descent', dv:1730, by:'descent', dropAfter:['descent']},
              {name:'Ascent to Lunar Orbit', dv:1730, by:'ascent', dropAfter:['ascent']},
              {name:'Trans-Earth Injection', dv:900, by:'transfer'}]},
  ],
  mars_orbit: [
    {id:'conjunction', name:'Conjunction-class', relMod:0, days:520,
     blurb:'Long surface/orbit stay, minimum-energy transfers both ways — the cheapest path to Mars, but you are gone over 17 months.',
     modules:['lv','transfer','crew'],
     profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Mars Injection', dv:3600, by:'transfer'},{name:'Mars Orbit Insertion', dv:1400, by:'transfer'},{name:'Trans-Earth Injection', dv:1400, by:'transfer'}]},
    {id:'opposition', name:'Opposition-class (fast)', relMod:-0.015, days:330,
     blurb:'A short-stay sprint home — back in under a year. But the high-energy transfers and a hot inner-system swing-by demand far more propellant and add risk.',
     modules:['lv','transfer','crew'],
     profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Mars Injection', dv:4700, by:'transfer'},{name:'Mars Orbit Insertion', dv:1700, by:'transfer'},{name:'Trans-Earth Injection', dv:2600, by:'transfer'}]},
  ],
};
function missionArchList(id){ return MISSION_ARCH[id]||null; }
// ---------- CE3 slice (c): the lunar architecture fork — a committed, mutually-exclusive choice ----------
// luna_landing's three routes each demand a different enabling tech; you can only commit to one you've
// unlocked, the base mission is flyable once ANY is unlocked, and switching afterward (you've built a
// whole program around it) costs heavy capital + months — a genuine either/or, the one hard fork.
function lunarArchUnlocked(a){ return !!(a && (!a.reqResearch || (state.research && state.research[a.reqResearch]))); }
function anyLunarArchUnlocked(){ const l=missionArchList('luna_landing')||[]; return l.some(lunarArchUnlocked); }
function firstUnlockedLunarArch(){ const l=missionArchList('luna_landing')||[]; const a=l.find(lunarArchUnlocked); return a?a.id:(l[0]&&l[0].id)||null; }
function committedLunarArch(){ return state.lunarArch||null; }
const LUNAR_SWITCH_MONTHS=8;
function lunarSwitchCost(){ return round2(Math.max(20, (state.flights||0)*1.0 + 15)); } // re-architecting a lunar program is a major capital event
function canCommitLunarArch(id){
  const l=missionArchList('luna_landing')||[]; const a=l.find(x=>x.id===id);
  if(!a) return {ok:false,why:'unknown architecture'};
  if(!lunarArchUnlocked(a)) return {ok:false,why:`needs ${a.needs}`};
  if(state.lunarArch===id) return {ok:false,why:'already committed'};
  if(!state.lunarArch) return {ok:true, first:true};                       // first commitment is free
  if(state.money < lunarSwitchCost()) return {ok:false,why:`re-architecting costs ${fM(lunarSwitchCost())}`};
  return {ok:true, first:false};
}
function commitLunarArch(id){
  const chk=canCommitLunarArch(id); if(!chk.ok) return;
  const a=(missionArchList('luna_landing')||[]).find(x=>x.id===id);
  if(chk.first){
    state.lunarArch=id;
    log('ok',`Lunar architecture committed: ${a.name}. Your whole lunar program is built around it now.`);
  }else{
    const cost=lunarSwitchCost();
    state.money=round2(state.money-cost); state.lunarArch=id;
    log('note',`Lunar program re-architected to ${a.name} — ${fM(cost)} and ${LUNAR_SWITCH_MONTHS} months of redesign.`);
    advance(LUNAR_SWITCH_MONTHS);
  }
  render();
}
// #89: does mission m need the tracking network at all, right now? Shared by missionTechMet (the
// real gate) and missionAdvisor (the explainer, render.js) so the two can never drift out of sync.
// Applies to deep-space EXPLORATION missions (.profile) that haven't been flown yet. Two exemptions:
//  - already-completed missions (grandfathered — nothing already earned gets taken away);
//  - module-delivery logistics runs (.deliverModule) to a base you already operate — those are
//    resupply, not an exploration first, and they never set state.completed, so without this exemption
//    they'd be permanently gated (and it's the wrong call besides: you built the base, DSN or no).
function needsTrackingNetwork(m){ return TRACKING_NETWORK_LIVE && !!(m && m.profile) && !m.deliverModule && !state.completed[m.id]; }
// the gate a player actually flies through: normal reqResearch, plus the luna_landing arch fork
function missionTechMet(m){
  if(!m) return false;
  if(m.reqResearch && !(state.research && state.research[m.reqResearch])) return false;
  if(m.reqSynergy && !synergyUnlocked(m.reqSynergy)) return false; // P8: cross-track synergy unlock
  // #89: MUST come before the luna_landing branch below — that branch returns early, and
  // luna_landing is itself a .profile mission, so inserting this after would silently bypass it.
  if(needsTrackingNetwork(m) && trackingStationCount()<1) return false;
  if(m.id==='luna_landing') return anyLunarArchUnlocked();
  return true;
}
function activeArchId(id){
  const list=missionArchList(id); if(!list) return null;
  if(id==='luna_landing') return committedLunarArch() || firstUnlockedLunarArch() || list[0].id; // committed fork (or first unlocked preview)
  return (state.architectures&&state.architectures[id]) || list[0].id;
}
function missionArchOf(id){ const list=missionArchList(id); if(!list) return null; const aid=activeArchId(id); return list.find(a=>a.id===aid)||list[0]; }
// the active mission as the player will actually fly it (base merged with the chosen architecture)
function curMission(){
  const base=missionById(state.activeMission);
  if(!base) return base;
  const arch=missionArchOf(base.id);
  if(!arch) return base;
  return Object.assign({}, base, {profile:arch.profile||base.profile, modules:arch.modules||base.modules, days:arch.days!=null?arch.days:base.days, _arch:arch});
}
function setArchitecture(missionId, archId){
  if(!missionArchList(missionId)) return;
  if(missionId==='luna_landing'){ commitLunarArch(archId); return; } // CE3(c): the lunar fork is a committed choice, not a free toggle
  state.architectures=state.architectures||{}; state.architectures[missionId]=archId; render();
}

/* ---------- #3: Vehicle families (named lineages with heritage) ----------
   A family is a persistent, named saved design (OV-1 → OV-2 → OV-Heavy) that lives
   in state.vehicles, distinct from the live bench config. Flying the active family
   accrues heritage: reliability climbs as it proves itself, manufacturing knowledge
   makes it cheaper to build, milestones earn brand reputation, and a derived family
   inherits a fraction of its parent's experience. All bonuses are bounded so the
   existing reliability caps remain the ceiling. activeVehicle=null = an untracked
   one-off (the original behaviour, zero heritage). */
const FAM_REL_PER = 0.02, FAM_REL_CAP = 0.12;   // +rel per experience point, capped
const FAM_BUILD_PER = 0.03, FAM_BUILD_FLOOR = 0.70; // build-cost learning curve floor
const FAM_INHERIT = 0.4;                          // fraction of parent experience carried to a derived family
const FAM_EXP_CAP = 6;                            // experience contribution saturates here
const FAM_MILESTONES = [5,10,20];                 // successful-flight brand-rep milestones
function vehicleFamilies(){ return state.vehicles||(state.vehicles=[]); }
function familyById(fid){ return vehicleFamilies().find(f=>f.id===fid); }
function activeFamily(){ return state.activeVehicle?familyById(state.activeVehicle):null; }
function familyExperience(fam){ return fam?Math.min(FAM_EXP_CAP,(fam.successes||0)+(fam.inherited||0)):0; }
function familyRelBonus(fam){ return Math.min(FAM_REL_CAP, FAM_REL_PER*familyExperience(fam)); }
function familyBuildMult(fam){ return fam?Math.max(FAM_BUILD_FLOOR, 1-FAM_BUILD_PER*(fam.successes||0)):1; }
function familySuccessRate(fam){ return (fam&&fam.flights>0)?Math.round(100*(fam.successes||0)/fam.flights):null; }
function nextFamilyName(){
  let n=1; const taken=new Set(vehicleFamilies().map(f=>f.name));
  while(taken.has('OV-'+n)) n++;
  return 'OV-'+n;
}
function benchSpecSnapshot(){
  return JSON.parse(JSON.stringify({stages:state.stages, transfer:state.transfer, descent:state.descent, ascent:state.ascent, eclss:state.eclss}));
}
function saveAsFamily(){
  const parent=activeFamily();
  const fam={ id:'veh_'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36),
    name:nextFamilyName(), born:dateStr(), parentId:parent?parent.id:null,
    inherited: parent?Math.floor(FAM_INHERIT*familyExperience(parent)):0,
    flights:0, successes:0, losses:0, spec:benchSpecSnapshot() };
  vehicleFamilies().push(fam);
  state.activeVehicle=fam.id;
  log('info',`New vehicle family registered: ${fam.name}${parent?` (derived from ${parent.name}, inheriting ${fam.inherited} flights of heritage)`:''}. Heritage will build as it flies.`);
  render();
}
function loadFamily(fid){
  const fam=familyById(fid); if(!fam) return;
  const s=fam.spec||{};
  if(s.stages) state.stages=JSON.parse(JSON.stringify(s.stages));
  if(s.transfer) state.transfer=JSON.parse(JSON.stringify(s.transfer));
  if(s.descent) state.descent=JSON.parse(JSON.stringify(s.descent));
  if(s.ascent) state.ascent=JSON.parse(JSON.stringify(s.ascent));
  if(s.eclss) state.eclss=s.eclss;
  state.activeVehicle=fid;
  render();
}
function retireFamily(fid){
  const fam=familyById(fid); if(!fam) return;
  state.vehicles=vehicleFamilies().filter(f=>f.id!==fid);
  if(state.activeVehicle===fid) state.activeVehicle=null;
  log('info',`${fam.name} retired from the fleet after ${fam.flights} flight${fam.flights===1?'':'s'}.`);
  render();
}
// Saved designs (blueprints): the FULL bench configuration — stages (incl. per-stage
// diameter), boosters, in-space stages, ECLSS, power, recovery, plus the BC livery & parts —
// captured to a named slot and reloadable, independent of the family/heritage system.
function blueprints(){ return state.blueprints||(state.blueprints=[]); }
function fullBenchSnapshot(){
  return JSON.parse(JSON.stringify({
    stages:state.stages, boosters:state.boosters, transfer:state.transfer, descent:state.descent, ascent:state.ascent,
    eclss:state.eclss, powerSource:state.powerSource, recovery:state.recovery,
    livery:curLivery(), parts:curParts()
  }));
}
function applyFullSnapshot(s){
  if(!s) return;
  if(s.stages) state.stages=JSON.parse(JSON.stringify(s.stages));
  if(s.boosters) state.boosters=JSON.parse(JSON.stringify(s.boosters));
  if(s.transfer) state.transfer=JSON.parse(JSON.stringify(s.transfer));
  if(s.descent) state.descent=JSON.parse(JSON.stringify(s.descent));
  if(s.ascent) state.ascent=JSON.parse(JSON.stringify(s.ascent));
  if(s.eclss) state.eclss=s.eclss;
  if(s.powerSource) state.powerSource=s.powerSource;
  if(typeof s.recovery==='boolean') state.recovery=s.recovery;
  if(s.livery) state.livery=Object.assign(defaultLivery(), s.livery);
  if(s.parts) state.parts=Object.assign(defaultParts(), s.parts);
}
function blueprintSummary(){
  const eng=state.stages.reduce((a,s)=>a+s.count,0);
  return `${state.stages.length} stage${state.stages.length>1?'s':''} · ${eng} eng${boostersFitted()?` · ${state.boosters.count} bstr`:''}`;
}
function saveBlueprint(){
  const inp=$('bpName'); let name=((inp&&inp.value)||'').trim();
  if(!name) name='Design '+(blueprints().length+1);
  const bp={ id:'bp_'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36),
    name:name.slice(0,28), born:dateStr(), summary:blueprintSummary(), spec:fullBenchSnapshot() };
  blueprints().push(bp);
  log('info',`Design saved: ${bp.name}.`);
  render();
}
function loadBlueprint(id){
  const bp=blueprints().find(b=>b.id===id); if(!bp) return;
  applyFullSnapshot(bp.spec);
  log('info',`Design loaded: ${bp.name}.`);
  render();
}
function deleteBlueprint(id){
  const bp=blueprints().find(b=>b.id===id);
  state.blueprints=blueprints().filter(b=>b.id!==id);
  if(bp) log('info',`Design deleted: ${bp.name}.`);
  render();
}

const RESEARCH = [
  {id:'kerosene', track:'propulsion',     name:'Kerosene Propulsion',           cost:2.0, months:3, req:[],          effect:{engines:['kerolox_mk1','kerolox_le']}, desc:'Unlocks the Rocketdyne S-3D (efficient) and the LR79 (more thrust, cheaper, lower Isp) — higher Isp than alcohol/LOX.<span class="hist">↳ Refined kerosene (RP-1) replaced the V-2\'s alcohol in Rocketdyne\'s Atlas and Thor engines.</span>'},
  {id:'vac_upper', track:'propulsion',    name:'Vacuum-Optimized Upper Stage',  cost:2.5, months:3, req:[],          effect:{engine:'vernier_v'},   desc:'Unlocks the Bell Agena XLR81 upper stage engine (Isp 315 s in vacuum).<span class="hist">↳ Restartable vacuum stages like the Agena turned launchers into orbit-and-beyond vehicles.</span>'},
  {id:'sustainer', track:'propulsion',    name:'High-Thrust Sustainer',         cost:3.0, months:4, req:['combustion_stability'],effect:{engine:'kerolox_mk2'}, desc:'Unlocks the Rocketdyne MA-3 Sustainer — more thrust and Isp for first stages.<span class="hist">↳ Atlas\'s sustainer kept firing to orbit after the boosters dropped away — &ldquo;stage-and-a-half.&rdquo;</span>'},
  {id:'alloy_tanks', track:'structures',  name:'Welded Alloy Tanks',            cost:2.0, months:3, req:[],          effect:{sigma:0.09},           desc:'Lowers σ from 0.12 to 0.09. Lighter tanks, better mass ratio.<span class="hist">↳ Welded aluminium alloy replaced the heavy riveted steel of the earliest airframes.</span>'},
  {id:'balloon_tanks', track:'structures',name:'Stainless Balloon Tanks',       cost:3.0, months:3, req:['alloy_tanks'],effect:{sigma:0.07},        desc:'Lowers σ to 0.07. The mass-ratio edge that makes orbit reachable.<span class="hist">↳ Atlas used pressure-stabilized stainless &ldquo;balloon&rdquo; tanks so thin they\'d crumple unless kept inflated.</span>'},
  {id:'test_program', track:'testing', name:'Static Fire Test Program',      cost:1.5, months:2, req:[],          effect:{reliability:0.08},     desc:'Ground-fire engines before flight: +8% launch reliability. Vital while heritage is low.<span class="hist">↳ Test stands from Peenemünde to Santa Susana turned ground explosions into flight reliability.</span>'},
  {id:'composite_structures', track:'structures', name:'Composite &amp; Isogrid Structures', cost:4.0, months:4, req:['balloon_tanks'], effect:{sigma:0.055}, desc:'Machined isogrid panels and filament-wound composite tanks: lowers σ to 0.055. The last big mass-ratio gain chemistry can give you.<span class="hist">↳ Saturn used machined isogrid; later stages and fairings went to carbon-fibre composites for the lightest structures flown.</span>'},
  {id:'flight_telemetry', track:'testing', name:'Flight Telemetry &amp; Instrumentation', cost:2.0, months:3, req:['test_program'], effect:{reliability:0.04}, desc:'Dense sensor suites and downlinked telemetry turn every flight — success or failure — into data you can act on. +4% reliability.<span class="hist">↳ Heavily instrumented early flights let engineers trace failures to a single valve or weld and fix them for the next launch.</span>'},
  {id:'qa_program', track:'testing', name:'Quality-Assurance Program', cost:2.5, months:3, req:['test_program'], effect:{reliability:0.05}, desc:'Inspection, traceability, and process control across the whole build — catching defects on the bench instead of on the pad. +5% reliability.<span class="hist">↳ Apollo-era QA traced every part to its lot and operator; process discipline, not heroics, is what made crewed flight survivable.</span>'},
  {id:'vibration_testing', track:'testing', name:'Vibration &amp; Acoustic Qualification', cost:2.5, months:3, req:['flight_telemetry'], effect:{reliability:0.03}, desc:'Shake tables and acoustic chambers qualify the vehicle against launch loads before it ever flies. +3% reliability.<span class="hist">↳ The brutal acoustic and vibration environment of liftoff has killed more hardware than vacuum ever has — qualification testing tames it.</span>'},
  {id:'redundant_avionics', track:'guidance', name:'Redundant Flight Avionics', cost:3.5, months:4, req:['qa_program'], effect:{reliability:0.05}, desc:'Triple-redundant flight computers that vote out a failed unit mid-ascent, so a single fault no longer loses the vehicle. +5% reliability.<span class="hist">↳ The Shuttle flew four identical computers voting in lockstep plus a fifth on independent software — fault tolerance as doctrine.</span>'},
  {id:'heavy_booster', track:'propulsion',name:'Heavy Booster',                 cost:4.0, months:5, req:['sustainer','turbopump','engine_test_stands'],   effect:{engine:'kerolox_mk3'}, desc:'Unlocks the Rocketdyne H-1 — the lift needed to put crew and life support into orbit.<span class="hist">↳ The high-thrust machines that first lifted people: Atlas for Mercury, the clustered R-7 for Vostok.</span>'},
  {id:'strapon_integration', track:'propulsion', name:'Strap-on Booster Integration', cost:3.5, months:4, req:['turbopump'], effect:{}, desc:'Structural attach points, separation ordnance and combined-thrust guidance to clamp strap-on boosters around a core stage — extra liftoff thrust and a Δv kick without redesigning the core. <b>Unlocks the Boosters card on the design bench.</b><span class="hist">↳ Strap-on boosters — from the Titan III to Atlas V, Ariane and the Delta IV Heavy — are how a core stage is scaled up without a clean-sheet vehicle.</span>'},
  {id:'solid_propellant', track:'propulsion', name:'Solid Propellant Casting', cost:1.5, months:2, req:[], effect:{engines:['solid_castor','solid_scout']}, desc:'Cast composite solid grains, igniters and ablative nozzles — motors with no turbopumps to fail, ready to fire after years in storage. High thrust and dead-simple, but low Isp and no throttle or shutdown once lit. <b>Unlocks the Castor strap-on motor and the Scout-class solid stage.</b><span class="hist">↳ From JATO bottles to the all-solid Scout and the Minuteman ICBM, cast solids are the simplest path to high thrust.</span>'},
  {id:'segmented_srb', track:'propulsion', name:'Segmented Solid Motors', cost:4.5, months:5, req:['solid_propellant'], effect:{engine:'solid_srb'}, desc:'Field-jointed segmented casings let a solid motor scale to enormous thrust — the heavy-lift strap-on that augments a liquid core off the pad. <b>Unlocks the Segmented Solid Booster.</b><span class="hist">↳ The Space Shuttle SRBs, Ariane 5 EAP and Titan III UA1205 were segmented solids — the most powerful boosters ever flown. Their field joints are also what doomed Challenger.</span>'},
  {id:'propulsive_landing', track:'reuse', name:'Propulsive Landing & Recovery', cost:5.0, months:6, req:['kerosene','heavy_booster'], effect:{unlock:'recovery'}, desc:'Landing legs, grid fins, and a reserved propellant margin let the first stage fly itself back instead of being thrown away. Fit recovery to a booster (+hardware cost every flight); once a mission is routine, the booster is reflown — far cheaper to refurbish than rebuild, and faster to turn around.<span class="hist">↳ Reusing the most expensive part of the rocket — the booster — is what finally bent the launch-cost curve downward.</span>'},
  {id:'crew_capsule', track:'crew', name:'Pressurized Crew Capsule',      cost:3.0, months:4, req:[],              effect:{unlock:'crew'},        desc:'Pressure vessel, heat shield, parachutes. Enables crewed missions.<span class="hist">↳ Mercury and Vostok — blunt-body capsules with ablative heat shields and parachute recovery.</span>'},
  {id:'launch_escape', track:'crew',name:'Launch Escape System',          cost:2.5, months:3, req:['crew_capsule'],effect:{unlock:'les'},         desc:'Abort tower (+0.3 t). Crew survive a launch failure instead of being lost with the vehicle.<span class="hist">↳ In 1983 a Soyuz escape tower pulled its two crew clear of a rocket exploding on the pad.</span>'},
  {id:'eclss_partial', track:'crew',name:'CO₂ &amp; Water Recovery',          cost:3.0, months:4, req:['crew_capsule'],effect:{unlock:'eclss'},       desc:'Scrub CO₂, recycle water: 60% consumable recovery. Pays off on multi-day missions.<span class="hist">↳ Gemini and Apollo scrubbed CO₂ with lithium-hydroxide canisters and carried their water.</span>'},
  {id:'eclss_closed', track:'crew', name:'Closed-Loop ECLSS',             cost:4.5, months:5, req:['eclss_partial'],effect:{unlock:'eclss'},       desc:'90% recovery plus its own power — heavy. Only worth it on very long missions (foreshadows deep space).<span class="hist">↳ Mir and the ISS recover most of their water and oxygen to sustain months-long stays.</span>'},
  {id:'hypergolic', track:'propulsion',   name:'Storable Hypergolic Propulsion',cost:3.5, months:4, req:['vac_upper'],     effect:{engine:'hyper_storable'},desc:'Unlocks the AJ10 (Aerozine/N₂O₄) — a restartable, storable in-space engine (Isp 321 s) ideal for transfer stages and landers that must coast for days then reignite.<span class="hist">↳ Aerozine-50/N₂O₄ powered the Apollo service and lunar modules: storable, hypergolic, restart-on-demand.</span>'},
  {id:'cryo_upper', track:'propulsion',   name:'Cryogenic Hydrogen Upper Stage',cost:4.0, months:5, req:['vac_upper'],     effect:{engines:['hydrolox_up','hydrolox_rl10']},  desc:'Unlocks the Rocketdyne J-2 (high-thrust) and the RL10-class (small, very high Isp) LH₂/LOX upper stages (Isp 425–450 s), the energy to throw heavy payloads to orbit and beyond. (Cryogenic: boils off over long coasts.)<span class="hist">↳ The hydrogen-fuelled Centaur and Saturn\'s S-IVB gave deep-space launch its decisive edge.</span>'},
  {id:'deep_space', track:'deepspace',   name:'Lunar Trajectory &amp; Deep-Space Tracking',cost:4.0, months:5, req:['digital_computer','sustainer'],effect:{unlock:'lunar'},desc:'Trajectory design and a tracking network — enough to navigate to the Moon and back. Unlocks cislunar missions. (Navigation, not lift: the Moon-bound Δv still comes from the vehicle you build — a heavy booster is wanted, not required, here.)<span class="hist">↳ NASA\'s Deep Space Network and Apollo\'s guidance computers turned a quarter-million-mile shot into routine.</span>'},
  {id:'lunar_lander', track:'deepspace', name:'Lunar Lander (Descent &amp; Ascent)', cost:6.0, months:7, req:['deep_space','hypergolic'], effect:{unlock:'lander'}, desc:'A two-stage lander: a descent stage for the powered landing, left on the surface, and a separate ascent stage to return to orbit. Unlocks Lunar Landing.<span class="hist">↳ The Apollo Lunar Module flew as two stages — Eagle\'s descent stage is still on the Sea of Tranquility.</span>'},
  {id:'super_heavy', track:'propulsion',  name:'Rocketdyne F-1 Engine Development',  cost:7.0, months:8, req:['lunar_lander','chamber_pressure'], effect:{engine:'f1_class'}, desc:'A first-stage engine an order of magnitude beyond anything before it (6.7 MN thrust). The lander\'s mass — lifted, carried to the Moon, and lowered to the surface — demands a booster this size.<span class="hist">↳ Five F-1 engines powered the Saturn V\'s first stage, still the most powerful rocket ever flown.</span>'},
  {id:'mars_traj', track:'deepspace',    name:'Mars Transfer Trajectory Planning', cost:6.5, months:7, req:['deep_space'], sciCost:18, effect:{unlock:'mars'}, desc:'Interplanetary navigation for Hohmann-class transfers to Mars. Launch windows open roughly every 26 months — miss one and you wait for the next.<span class="hist">↳ Mariner and Viking proved the trajectories; the synodic period of Earth and Mars sets the rhythm ever since.</span>'},
  {id:'orbital_depot', track:'refueling',name:'Orbital Propellant Depot',       cost:5.5, months:6, req:['deep_space'], effect:{unlock:'depot'}, desc:'A propellant tank farm in LEO. Tanker Run contracts deposit fuel into it; any mission\'s transfer stage can then top off from the depot instead of carrying that propellant up from Earth.<span class="hist">↳ Depot-based architectures let a transfer stage launch nearly empty and fill up in orbit — the key to breaking the rocket equation\'s compounding.</span>'},
  {id:'lunar_isru', track:'refueling',   name:'Lunar ISRU (Water → LOX/LH₂)',   cost:6.0, months:7, req:[], reqMissionDone:'luna_landing', effect:{unlock:'isru_moon'}, desc:'Polar water ice, electrolyzed into liquid oxygen and hydrogen at a surface plant. Once established, your lander\'s ascent stage refuels on the Moon — that propellant no longer has to be launched from Earth.<span class="hist">↳ Permanently shadowed craters at the lunar poles hold water ice — the resource every lunar architecture since Apollo has wanted to reach.</span>'},
  {id:'mars_isru', track:'refueling',    name:'Mars ISRU (Sabatier Methalox)',  cost:7.5, months:8, req:[], reqMissionDone:'mars_orbit', effect:{unlock:'isru_mars'}, desc:'Atmospheric CO₂ plus water ice, run through the Sabatier reaction, yields methane and oxygen on the Martian surface. The return propellant for Trans-Earth Injection is made on Mars, not carried there.<span class="hist">↳ Sabatier-process ISRU is the linchpin of every serious Mars architecture — making the return fuel on-site instead of hauling it from Earth.</span>'},
  {id:'nuclear_thermal', track:'nuclear', name:'Nuclear Thermal Propulsion (NERVA)', cost:9.0, months:10, req:['cryo_upper','deep_space'], sciCost:30, effect:{engine:'ntr_nerva'}, desc:'A solid-core reactor heats liquid hydrogen to ~825 s Isp — roughly double the best chemical upper stage. Unlocks the NERVA transfer engine, the key to the high-Δv burns the outer system demands.<span class="hist">↳ The NERVA program ground-tested flight-class nuclear-thermal engines through the late 1960s before cancellation in 1973.</span>'},
  {id:'nuclear_electric', track:'nuclear', name:'Nuclear-Electric Propulsion', cost:12.0, months:12, req:['nuclear_thermal'], sciCost:45, effect:{engine:'nep_snap'}, desc:'A reactor-driven electric thruster: ~3,000 s Isp at minuscule thrust. Burns measured in months, not minutes — but the mass ratio it buys makes the deep outer system reachable. Unlocks the SNAP-derived NEP transfer engine.<span class="hist">↳ SNAP reactors flew in the 1960s; nuclear-electric remains the leading concept for crewed outer-planet transfer.</span>'},
  {id:'rad_shielding', track:'deepspace', name:'Deep-Space Radiation Shielding', cost:6.0, months:6, req:['nuclear_thermal'], sciCost:24, effect:{unlock:'rad_shield'}, desc:'Storm shelters and hydrogen-rich shielding to keep crews alive through Jovian radiation and multi-year cruises. Required for any crewed Jupiter mission.<span class="hist">↳ Jupiter\'s magnetosphere is the harshest radiation environment in the Solar System short of the Sun itself.</span>'},
  {id:'belt_volatiles', track:'refueling', name:'Belt Volatiles ISRU', cost:8.0, months:9, req:['nuclear_thermal'], reqMissionDone:'belt_mining', effect:{unlock:'isru_belt'}, desc:'Water and volatiles mined from carbonaceous asteroids, cracked into hydrogen/oxygen propellant at the claim. Once established, the Belt return burn (Trans-Earth Injection) is fuelled on-site instead of hauled from Earth.<span class="hist">↳ C-type asteroids are up to ~10% water by mass — the propellant depots of a spacefaring economy.</span>'},
  {id:'orbital_assembly', track:'assembly', name:'Orbital Assembly &amp; Docking', cost:5.0, months:6, req:['deep_space'], effect:{unlock:'assembly'}, desc:'Rendezvous and docking, plus the structures and procedures to mate modules in orbit. Lets you launch a heavy in-space stack (transfer stage, lander) on separate flights and assemble it in LEO — so no single rocket has to lift the whole thing. An alternative to brute-force heavy lift.<span class="hist">↑ From Gemini’s first dockings to the on-orbit assembly of Mir and the ISS — the route to big spacecraft without a giant booster.</span>'},
  {id:'auto_rendezvous', track:'assembly', name:'Automated Rendezvous &amp; Docking', cost:4.0, months:5, req:['orbital_assembly'], effect:{unlock:'auto_dock'}, desc:'Sensors and guidance for hands-off docking. Halves the reliability penalty of orbital assembly, making multi-launch architectures dependable enough to bet a crewed mission on.<span class="hist">↑ Progress, ATV and Dragon refined fully automated rendezvous — turning docking from a piloted feat into routine logistics.</span>'},
  // ── R&D epic slice 2: early-era depth (Propulsion / Guidance / Testing) ──
  // These are organisational/capability gates: they cost capital and months and
  // are prerequisites for later engines and the whole deep-space era, lengthening
  // the road through the early game. They carry no direct stat effect yet
  // (quantitative +Isp/+thrust effects await the engine-model extension in a
  // later slice) — so the rocket equation and reliability ceilings are untouched.
  {id:'combustion_stability', track:'propulsion', name:'RP-1 Combustion Stability', cost:2.0, months:3, req:['kerosene'], effect:{thrust:0.04}, desc:'Baffled injectors and acoustic cavities tame the combustion instabilities that wreck kerosene engines on the test stand. The groundwork every higher-thrust chamber is built on. <b>+4% liftoff thrust.</b><span class="hist">↳ The F-1 program spent years and hundreds of tests beating combustion instability before the engine could be trusted to fly.</span>'},
  {id:'turbopump', track:'propulsion', name:'Turbopump Engineering', cost:2.5, months:3, req:['combustion_stability'], effect:{thrust:0.05}, desc:'High-speed turbopumps feed propellant at the pressures big chambers demand — the difference between a pressure-fed toy and a real launch engine. <b>+5% liftoff thrust.</b><span class="hist">↳ The turbopump is the beating heart of a liquid engine: the V-2\'s steam-driven pump was its most advanced single component.</span>'},
  {id:'regen_cooling', track:'propulsion', name:'Regenerative Cooling', cost:3.0, months:4, req:['turbopump'], effect:{isp:0.04}, desc:'Route cryogenic propellant through the chamber walls before burning it, so the engine cools itself. Unlocks the sustained, high-output firing longer burns need. <b>+4% Isp.</b><span class="hist">↳ Regenerative cooling let engines run for minutes instead of seconds without melting their own throats.</span>'},
  {id:'chamber_pressure', track:'propulsion', name:'High Chamber Pressure', cost:3.5, months:4, req:['regen_cooling'], effect:{isp:0.04,thrust:0.05}, desc:'Push chamber pressure higher for more thrust and efficiency from the same engine size — the discipline a truly heavy booster is built on. <b>+4% Isp, +5% thrust.</b><span class="hist">↳ Staged-combustion engines reach chamber pressures of hundreds of atmospheres; raw pressure is raw performance.</span>'},
  {id:'radio_guidance', track:'guidance', name:'Radio Command Guidance', cost:1.5, months:2, req:[], effect:{reliability:0.02}, desc:'Ground stations track the vehicle and radio steering corrections up to it. Crude and range-limited, but the first step off a ballistic arc toward a controlled trajectory. <b>+2% reliability.</b><span class="hist">↳ Early Atlas and Thor flights were steered from the ground by radio command before inertial guidance matured.</span>'},
  {id:'inertial_nav', track:'guidance', name:'Inertial Navigation', cost:2.5, months:3, req:['radio_guidance'], effect:{reliability:0.02}, desc:'Gyroscopes and accelerometers let the vehicle know where it is and where it\'s pointed without help from the ground — guidance that works beyond radio range. <b>+2% reliability.</b><span class="hist">↳ Inertial platforms freed rockets from ground control and made precise orbital insertion possible.</span>'},
  {id:'digital_computer', track:'guidance', name:'Digital Flight Computer', cost:3.5, months:4, req:['inertial_nav'], effect:{reliability:0.03}, desc:'A programmable onboard computer that flies the vehicle and runs the navigation in real time. The hard prerequisite for any mission that has to navigate to another world. <b>+3% reliability.</b><span class="hist">↳ The Apollo Guidance Computer — kilobytes of memory — flew humans to the Moon and back.</span>'},
  {id:'engine_test_stands', track:'testing', name:'Engine Test Stands', cost:2.0, months:3, req:['test_program'], effect:{reliability:0.02}, desc:'Dedicated stands to fire engines through their full duty cycle on the ground, again and again, until they\'re trusted. The backbone of a real test discipline. <b>+2% reliability.</b><span class="hist">↳ Sprawling test-stand complexes at Santa Susana, Edwards and Stennis turned engine development from guesswork into engineering.</span>'},
  // ── R&D epic slice 6: mid/late-era content across every track (heavily mission-gated) ──
  // Structures & Materials — extend the mass-ratio ladder
  {id:'friction_stir_welding', track:'structures', name:'Friction Stir Welding', cost:4.5, months:5, req:['composite_structures'], effect:{sigma:0.050}, desc:'Solid-state welds with no melt zone make large tanks both lighter and stronger. Lowers structural coefficient to 0.050. <b>σ → 0.050.</b><span class="hist">↳ Friction stir welding gave modern launch tanks their light, defect-free seams.</span>'},
  {id:'carbon_cryotanks', track:'structures', name:'Carbon-Fiber Cryotanks', cost:6.0, months:6, req:['friction_stir_welding'], effect:{sigma:0.045}, desc:'Filament-wound composite tanks that hold cryogenic propellant at a fraction of the dry mass of metal. Lowers σ to 0.045. <b>σ → 0.045.</b><span class="hist">↳ Composite cryotanks are the structural holy grail chased from the X-33 onward.</span>'},
  {id:'self_healing_materials', track:'structures', name:'Self-Healing Materials', cost:8.0, months:7, req:['carbon_cryotanks'], effect:{sigma:0.042}, desc:'Microcapsule and vascular composites that seal micrometeoroid and fatigue damage in flight. The lightest, most durable structures yet. <b>σ → 0.042.</b><span class="hist">↳ Self-healing polymers move from the lab toward spaceflight as long-duration missions demand it.</span>'},
  // Testing & Reliability
  {id:'accelerated_life_testing', track:'testing', name:'Accelerated Lifetime Testing', cost:3.5, months:4, req:['vibration_testing'], effect:{reliability:0.03}, desc:'Run hardware through compressed years of thermal, vacuum and load cycles to find what wears out before it flies. <b>+3% reliability.</b><span class="hist">↳ Accelerated-life rigs let engineers age a part decades in months.</span>'},
  {id:'digital_twin', track:'testing', name:'Digital-Twin Simulation', cost:5.0, months:5, req:['accelerated_life_testing'], sciCost:20, effect:{reliability:0.04}, desc:'A high-fidelity simulation of every vehicle, updated from flight data, that predicts failures before the hardware does. <b>+4% reliability.</b><span class="hist">↳ Digital twins now shadow real spacecraft through their entire lives.</span>'},
  // Guidance & Avionics
  {id:'star_trackers', track:'guidance', name:'Star Trackers', cost:3.5, months:4, req:['digital_computer'], effect:{reliability:0.03}, desc:'Optical star sensors fix the vehicle attitude against the sky to arc-second precision, far beyond gyros alone. <b>+3% reliability.</b><span class="hist">↳ Star trackers are the gold standard for deep-space attitude reference.</span>'},
  {id:'autonomous_navigation', track:'guidance', name:'Autonomous Navigation', cost:5.0, months:6, req:['star_trackers'], effect:{reliability:0.03}, desc:'Onboard optical navigation lets a spacecraft fix its own position against planets and stars without waiting on light-lagged ground tracking. <b>+3% reliability.</b><span class="hist">↳ Deep Impact and OSIRIS-REx proved autonomous optical nav at other worlds.</span>'},
  // Crew & Life Support
  {id:'orbital_eva', track:'crew', name:'Orbital EVA Suits', cost:4.0, months:5, req:['crew_capsule'], reqMissionDone:'crew_orbit', effect:{}, desc:'Pressure suits, airlocks and tethers for working outside the spacecraft. <b>Crewed missions become more reliable (in-flight inspection &amp; repair: crew penalty 0.92 → 0.95).</b><span class="hist">↳ Leonov first floated free of his Voskhod in 1965; EVA became routine by Gemini.</span>'},
  {id:'long_duration_hab', track:'crew', name:'Long-Duration Habitats', cost:5.5, months:6, req:['eclss_closed'], reqMissionDone:'multi_day', effect:{reliability:0.02,lsRecovery:0.02}, desc:'Galleys, sleep stations, exercise and hygiene that keep crews healthy and effective for months. <b>+2% crewed reliability.</b><span class="hist">↳ Salyut, Skylab and the ISS turned spacecraft into places people live.</span>'},
  {id:'radiation_countermeasures', track:'crew', name:'Radiation Countermeasures', cost:6.0, months:6, req:['long_duration_hab'], effect:{reliability:0.02}, desc:'Storm shelters, dosimetry and pharmacology to keep crews within dose limits on multi-year flights. <b>+2% crewed reliability.</b><span class="hist">↳ Solar-particle events make radiation the gating crew-health problem for Mars.</span>'},
  // Deep Space
  {id:'high_gain_antenna', track:'deepspace', name:'High-Gain Antennas', cost:3.5, months:4, req:['deep_space'], effect:{reliability:0.02}, desc:'Steerable dish antennas and deep-space transponders that hold a data link across hundreds of millions of kilometers. <b>+2% reliability.</b><span class="hist">↳ The Deep Space Network and onboard high-gain dishes keep distant probes in contact.</span>'},
  {id:'precision_edl', track:'deepspace', name:'Precision Entry, Descent & Landing', cost:6.5, months:7, req:['mars_traj'], reqMissionDone:'mars_flyby', effect:{}, desc:'Guided hypersonic entry, supersonic retropropulsion and terrain-relative navigation to put a lander within meters of its target on another world.<span class="hist">↳ Curiosity and Perseverance landed with guided entry and skycrane precision.</span>'},
  // Nuclear
  {id:'reactor_materials', track:'nuclear', name:'High-Temperature Reactor Materials', cost:7.0, months:7, req:['nuclear_thermal'], effect:{reliability:0.02}, desc:'Refractory fuel elements and moderators that survive the extreme temperatures a nuclear engine demands. <b>+2% reliability.</b><span class="hist">↳ Coated-particle and carbide fuels are the heart of modern nuclear-thermal designs.</span>'},
  {id:'surface_fission_power', track:'nuclear', name:'Surface Fission Power', cost:8.0, months:8, req:['nuclear_thermal'], reqMissionDone:'luna_landing', effect:{}, desc:'A compact surface reactor that powers a base through the long lunar night or a Martian winter. <b>Cuts every facility&apos;s standing resupply cost by 25%</b> — a base that makes its own power ships fewer consumables.<span class="hist">↳ NASA Kilopower / FSP work targets tens of kilowatts on the surface of another world.</span>'},
  // Refueling & ISRU
  {id:'cryo_boiloff_control', track:'refueling', name:'Cryogenic Boil-off Control', cost:5.0, months:6, req:['cryo_upper'], effect:{}, desc:'Active cooling, multilayer insulation and zero-boil-off systems. <b>Cryogenic in-space stages (LH₂; methane at half rate) now lose propellant to boil-off on long missions — this cuts the loss rate ~4× (1.5%/mo → 0.4%/mo).</b><span class="hist">↳ Boil-off is the quiet enemy of every long cryogenic mission; zero-boil-off cryocoolers are the answer.</span>'},
  {id:'electrolysis_scaleup', track:'refueling', name:'Electrolysis Scale-Up', cost:6.0, months:7, req:['orbital_depot'], effect:{}, desc:'Industrial-scale water electrolysis and propellant liquefaction — the plant that turns mined water into tonnes of LOX and LH2 at a depot or base.<span class="hist">↳ Scaling electrolysis is what turns a trickle of ISRU propellant into a real supply.</span>'},
  // Orbital Operations
  {id:'station_keeping', track:'assembly', name:'Station Keeping', cost:4.0, months:5, req:['orbital_assembly'], effect:{}, desc:'Reaction control, momentum management and orbit maintenance that hold a large structure in a stable orbit and attitude for years.<span class="hist">↳ Control moment gyros keep stations pointed without burning precious propellant.</span>'},
  {id:'large_space_stations', track:'assembly', name:'Large Space Stations', cost:6.5, months:7, req:['station_keeping'], reqMissionDone:'crew_orbit', effect:{}, desc:'Multi-module pressurized complexes assembled in orbit — the staging posts, laboratories and shipyards of a spacefaring economy.<span class="hist">↳ Mir and the ISS proved that permanent, expandable orbital outposts are possible.</span>'},
  {id:'onorbit_servicing', track:'assembly', name:'On-Orbit Servicing', cost:6.0, months:7, req:['auto_rendezvous'], effect:{}, desc:'Robotic refueling, repair and upgrade of spacecraft already in orbit. <b>Unlocks the Satellite Servicing Fleet standing contract</b> ($2.6M/mo retainer).<span class="hist">↳ MEV-1 docked with and relocated a live commercial satellite in 2020.</span>'},
  // Manufacturing & Production
  {id:'assembly_line', track:'manufacturing', name:'Assembly-Line Production', cost:2.5, months:3, req:[], effect:{buildCostCut:0.04,buildTimeCut:0.5}, desc:'Move vehicle build off the artisan bench and onto a repeatable line with stations, jigs and travelers — the foundation of building more than one of anything.<span class="hist">↳ The assembly line is what turned aircraft, then rockets, from craft into industry.</span>'},
  {id:'modular_design', track:'manufacturing', name:'Modular Vehicle Design', cost:3.5, months:4, req:['assembly_line'], effect:{reliability:0.02,buildCostCut:0.05,buildTimeCut:0.5}, desc:'Standard interfaces and interchangeable modules so subsystems are designed once and reused across the fleet. <b>+2% reliability.</b><span class="hist">↳ Common cores and modular buses cut cost and risk across whole families of vehicles.</span>'},
  {id:'cad_manufacturing', track:'manufacturing', name:'Computer-Aided Manufacturing', cost:4.5, months:5, req:['modular_design'], effect:{reliability:0.02,buildCostCut:0.05,buildTimeCut:0.5}, desc:'CNC machining and digital work instructions tie design straight to the shop floor, cutting human error out of fabrication. <b>+2% reliability.</b><span class="hist">↳ CAM closed the loop from CAD model to finished part.</span>'},
  {id:'additive_manufacturing', track:'manufacturing', name:'Additive Manufacturing', cost:6.0, months:6, req:['cad_manufacturing'], reqMissionDone:'first_sat', effect:{reliability:0.02,buildCostCut:0.06,buildTimeCut:1.0}, desc:'3D-printed combustion chambers, brackets and structures — fewer parts, fewer joints, fewer ways to fail. <b>+2% reliability.</b><span class="hist">↳ Printed engine parts went from novelty to flight hardware within a decade.</span>'},
  // Ground Infrastructure
  {id:'concrete_pads', track:'ground', name:'Reinforced Launch Pads', cost:2.0, months:3, req:[], effect:{launchCostCut:0.04}, desc:'Hardened concrete pads, hold-downs and blast protection that let a real launch vehicle leave the ground without destroying the site.<span class="hist">↳ The pad is the unglamorous foundation every launch depends on.</span>'},
  {id:'flame_trenches', track:'ground', name:'Flame Trenches & Deluge', cost:3.0, months:4, req:['concrete_pads'], effect:{launchCostCut:0.04}, desc:'Flame deflectors, trenches and sound-suppression water that channel a booster exhaust and tame the acoustic shock of ignition.<span class="hist">↳ Sound-suppression deluge protects both pad and vehicle from their own noise.</span>'},
  {id:'mobile_service_tower', track:'ground', name:'Mobile Service Towers', cost:4.0, months:5, req:['flame_trenches'], effect:{launchCostCut:0.05,buildTimeCut:0.5}, desc:'Gantries and swing arms for vertical integration, crew access and propellant loading — the scaffolding of a real launch campaign.<span class="hist">↳ Service towers and crawler-transporters defined the look of the Apollo pads.</span>'},
  {id:'cryo_ground_systems', track:'ground', name:'Cryogenic Ground Systems', cost:5.0, months:6, req:['mobile_service_tower'], reqMissionDone:'first_sat', effect:{launchCostCut:0.05,buildTimeCut:0.5}, desc:'Storage farms, vacuum-jacketed lines and fast-fill systems to load deep-cryo propellants reliably, the ground half of any hydrogen or methane vehicle.<span class="hist">↳ Cryogenic ground support is as demanding as the flight hardware it feeds.</span>'},
  // Automation & AI
  {id:'flight_automation', track:'automation', name:'Flight Automation', cost:4.0, months:5, req:['digital_computer'], effect:{reliability:0.02}, desc:'Automated countdown, abort and range-safety logic that reacts faster and more consistently than any human operator. <b>+2% reliability.</b><span class="hist">↳ Autonomous flight-termination systems replaced ground range-safety officers.</span>'},
  {id:'autonomous_operations', track:'automation', name:'Autonomous Mission Operations', cost:5.5, months:6, req:['flight_automation'], reqMissionDone:'crew_orbit', effect:{}, desc:'Spacecraft that plan, sequence and recover from faults on their own — essential where light-lag makes ground control too slow to help.<span class="hist">↳ Remote Agent flew an AI that ran a spacecraft autonomously back in 1999.</span>'},
  {id:'ai_mission_management', track:'automation', name:'AI Mission Management', cost:8.0, months:8, req:['autonomous_operations'], effect:{reliability:0.03}, desc:'A learning mission-management layer that coordinates whole fleets and campaigns, anticipating failures before they cascade. <b>+3% reliability.</b><span class="hist">↳ Fleet-scale autonomy is the frontier of modern mission operations.</span>'},
  // Science & Exploration
  {id:'earth_observation', track:'science', name:'Earth Observation', cost:2.0, months:3, req:[], effect:{sciYield:0.10}, desc:'Imaging, weather and remote-sensing instruments — the first science payloads, and the contracts that pay for an early program.<span class="hist">↳ TIROS and Landsat turned orbit into a vantage point on our own world.</span>'},
  {id:'planetary_science', track:'science', name:'Planetary Science Instruments', cost:3.5, months:4, req:['earth_observation'], effect:{sciYield:0.12}, desc:'Cameras, spectrometers and particle detectors built to characterize other worlds from flyby and orbit.<span class="hist">↳ Mariner and Voyager carried the instruments that first mapped the planets.</span>'},
  {id:'sample_return_science', track:'science', name:'Sample-Return Science', cost:6.0, months:7, req:['planetary_science'], reqMissionDone:'luna_landing', effect:{sciYield:0.15}, desc:'Curation, containment and analysis of returned material — the deepest science a robotic or crewed mission can deliver.<span class="hist">↳ Apollo, Hayabusa and OSIRIS-REx brought pieces of other worlds home to the lab.</span>'},
  {id:'astrobiology', track:'science', name:'Astrobiology', cost:7.0, months:8, req:['sample_return_science'], reqMissionDone:'mars_orbit', effect:{sciYield:0.15}, desc:'Life-detection instruments and planetary-protection protocols — the search for whether we are alone, and the prestige missions that chase it.<span class="hist">↳ From Viking biology to Mars Sample Return, astrobiology drives the boldest missions.</span>'},
  // Reusability
  {id:'parachute_recovery', track:'reuse', name:'Parachute Recovery', cost:2.5, months:3, req:[], effect:{launchCostCut:0.02}, desc:'Recover boosters and capsules by parachute into the ocean or onto land — the first, simplest step toward not throwing the rocket away.<span class="hist">↳ Mercury capsules and Shuttle SRBs were fished from the Atlantic and reflown.</span>'},
  {id:'rapid_inspection', track:'reuse', name:'Rapid Inspection & Refurbishment', cost:5.0, months:6, req:['propulsive_landing'], effect:{launchCostCut:0.05}, desc:'Borescopes, automated NDE and lean refurbishment that turn a landed booster around in days instead of months — the difference between reuse and rapid reuse.<span class="hist">↳ Fast inspection is what separates an airliner from a refurbished spacecraft.</span>'},
  {id:'reusable_upper_stage', track:'reuse', name:'Reusable Upper Stage', cost:9.0, months:9, req:['propulsive_landing','cryo_upper'], reqMissionDone:'first_sat', effect:{buildCostCut:0.05}, desc:'A heat-shielded, recoverable upper stage — the hardest part of full reuse, since it must survive orbital re-entry. The last piece of a fully reusable vehicle.<span class="hist">↳ A reusable second stage is the holy grail that bends launch cost toward airline economics.</span>'},
  {id:'stage_test', track:'testing', name:'Stage Test Facilities', cost:3.0, months:4, req:['engine_test_stands'], effect:{reliability:0.03}, desc:'Test a complete stage — engines, plumbing, structure, avionics — as an integrated system before committing it to flight. The qualification step a deep-space campaign cannot skip. <b>+3% reliability.</b><span class="hist">↳ Full-stage green runs caught integration failures that no single-component test ever could.</span>'},
  // ── Propulsion expansion: methane, electric, and deeper cryogenic branches ──
  {id:'methane_propulsion', track:'propulsion', name:'Methane Propulsion', cost:4.5, months:5, req:['regen_cooling'], effect:{engines:['methalox','methalox_vac']}, desc:'Liquid methane burns clean, stores at temperatures close to oxygen, and can be made from CO2 and water off-world. Unlocks a full-flow methalox engine — high Isp and high thrust on one engine, and the basis of a reusable booster. <b>Unlocks the Methalox Full-Flow engine + a vacuum-optimized methalox upper.</b><span class="hist">↳ Methane went from a fringe choice to the propellant of the reusable era.</span>'},
  {id:'deep_throttling', track:'propulsion', name:'Deep Throttling', cost:4.0, months:4, req:['methane_propulsion'], effect:{reliability:0.02}, desc:'Run an engine smoothly from full thrust down to a fraction of it — the control authority a powered landing and a gentle crewed ascent both demand. <b>+2% reliability.</b><span class="hist">↳ Deep, stable throttling is what lets a booster hover and set itself down.</span>'},
  {id:'ion_propulsion', track:'propulsion', name:'Ion Thrusters', cost:5.0, months:5, req:['vac_upper'], effect:{engine:'ion_xenon'}, desc:'Electrostatically accelerate xenon ions to enormous exhaust velocity — vanishingly little thrust, but Isp no chemical engine can touch. A solar-electric transfer drive for patient cargo. <b>Unlocks the Gridded Ion Thruster (transfer stage).</b><span class="hist">↳ Deep Space 1 and Dawn proved ion propulsion on real interplanetary missions.</span>'},
  {id:'hall_effect', track:'propulsion', name:'Hall-Effect Thrusters', cost:4.5, months:5, req:['ion_propulsion'], effect:{engine:'hall_thruster'}, desc:'A higher-thrust electric drive that trades some Isp for thrust — the workhorse between gridded ion and chemical. <b>Unlocks the Hall-Effect Thruster (transfer stage).</b><span class="hist">↳ Hall thrusters now fly by the thousand on commercial satellites.</span>'},
  {id:'high_power_sep', track:'propulsion', name:'High-Power Solar Electric', cost:6.0, months:6, req:['hall_effect'], effect:{reliability:0.02}, desc:'Large, lightweight solar arrays feeding clustered thrusters — the power to push real cargo with electric propulsion. <b>+2% reliability.</b><span class="hist">↳ Roll-out solar arrays made tens-of-kilowatt electric propulsion practical.</span>'},
  {id:'megawatt_electric', track:'propulsion', name:'Megawatt Electric Propulsion', cost:9.0, months:9, req:['high_power_sep'], reqMissionDone:'belt_survey', effect:{}, desc:'Megawatt-class electric drives — nuclear- or vast-array-powered. <b>+10% Isp on every electric drive (Hall, Ion, NEP).</b> The freight engine of an interplanetary economy.<span class="hist">↳ MW-class electric propulsion is the leading concept for crewed and cargo outer-system transport.</span>'},
  {id:'hydrogen_storage', track:'propulsion', name:'Liquid Hydrogen Storage', cost:4.0, months:4, req:['cryo_upper'], effect:{}, desc:'Densified hydrogen, advanced insulation and slosh control that make the lightest, highest-Isp propellant manageable on a real vehicle.<span class="hist">↳ Taming liquid hydrogen is half the battle of every high-energy upper stage.</span>'},
  {id:'expander_cycle', track:'propulsion', name:'Expander Cycle', cost:5.0, months:5, req:['hydrogen_storage'], effect:{reliability:0.02}, desc:'Drive the turbopumps with propellant warmed by the chamber walls instead of a gas generator — an inherently benign, restartable upper-stage cycle. <b>+2% reliability.</b><span class="hist">↳ The expander-cycle RL10 has flown reliably for over half a century.</span>'},
  {id:'advanced_cryo_upper', track:'propulsion', name:'Advanced Cryogenic Upper Stage', cost:6.0, months:6, req:['expander_cycle'], effect:{isp:0.02}, desc:'A long-duration, restartable hydrolox upper stage with low boil-off and high performance — the energy to throw heavy payloads onto interplanetary trajectories. <b>+2% Isp.</b><span class="hist">↳ Centaur and the S-IVB set the template every high-energy upper stage still follows.</span>'},
  // ── R&D epic slice 6d: far-future / capstone tier (gated to the deepest missions) ──
  {id:'full_flow_staged', track:'propulsion', name:'Full-Flow Staged Combustion', cost:9.0, months:9, req:['chamber_pressure'], effect:{reliability:0.02}, desc:'Burn every gram of propellant through the turbines before the chamber — the most efficient, most durable, hardest-to-build engine cycle there is. <b>+2% reliability.</b><span class="hist">↳ Full-flow staged combustion ran on test stands for decades before flight hardware finally caught up.</span>'},
  {id:'bimodal_ntr', track:'nuclear', name:'Bimodal Nuclear Thermal', cost:11.0, months:11, req:['reactor_materials'], effect:{reliability:0.02}, desc:'A nuclear engine that doubles as a power reactor between burns — thrust when you need it, kilowatts the rest of the cruise. <b>+2% reliability.</b><span class="hist">↳ Bimodal NTR concepts promise both propulsion and abundant electrical power on one reactor.</span>'},
  {id:'fusion_propulsion_research', track:'nuclear', name:'Fusion Propulsion Research', cost:16.0, months:16, req:['nuclear_electric'], reqMissionDone:'jupiter_orbit', effect:{engine:'fusion_torch'}, desc:'The long-shot program: confined-plasma fusion drives that would put the outer system within months. <b>Unlocks the Daedalus Fusion Torch</b> — Isp 6,000 s with real thrust (60 kN), the drive every other transfer stage has been building toward.<span class="hist">↳ Fusion propulsion remains the most-studied path to true interstellar precursor missions.</span>'},
  {id:'full_vehicle_reuse', track:'reuse', name:'Full Vehicle Reuse', cost:12.0, months:10, req:['reusable_upper_stage'], effect:{launchCostCut:0.06}, desc:'Both stages fly home, are inspected, and fly again — the airline model finally applied to spaceflight. <b>−6% launch-ops cost.</b><span class="hist">↳ Full reuse is the line beyond which launch stops being an event and becomes a schedule.</span>'},
  {id:'metamaterial_structures', track:'structures', name:'Metamaterial Structures', cost:10.0, months:9, req:['self_healing_materials'], effect:{sigma:0.040}, desc:'Engineered lattices with properties no natural material has — stiffer, lighter, and tunable. The last word in mass ratio. <b>σ → 0.040.</b><span class="hist">↳ Architected metamaterials reach strength-to-weight ratios bulk materials cannot.</span>'},
  {id:'autonomous_qa', track:'testing', name:'Autonomous Quality Assurance', cost:6.0, months:6, req:['digital_twin'], effect:{reliability:0.02}, desc:'Machine-vision inspection and self-checking systems that qualify hardware continuously, with no human in the loop. <b>+2% reliability.</b><span class="hist">↳ Automated NDE catches defects that tired human inspectors miss.</span>'},
  {id:'quantum_navigation', track:'guidance', name:'Quantum Inertial Navigation', cost:8.0, months:8, req:['autonomous_navigation'], effect:{reliability:0.02}, desc:'Cold-atom interferometers that measure acceleration with quantum precision, holding a position fix for years without drift. <b>+2% reliability.</b><span class="hist">↳ Quantum inertial sensors promise GPS-free navigation that never drifts.</span>'},
  {id:'fleet_autonomy', track:'automation', name:'Fleet Autonomy', cost:10.0, months:9, req:['ai_mission_management'], effect:{reliability:0.02}, desc:'Whole fleets of vehicles that coordinate, refuel and repair each other with no ground intervention — the nervous system of an interplanetary logistics network. <b>+2% reliability.</b><span class="hist">↳ Fleet-scale autonomy is the prerequisite for any self-sustaining off-world economy.</span>'},
  {id:'artificial_gravity', track:'crew', name:'Artificial Gravity', cost:9.0, months:9, req:['radiation_countermeasures'], reqMissionDone:'mars_orbit', effect:{reliability:0.02}, desc:'Rotating habitats that spin up a fraction of a gee, holding off the bone and muscle loss of years in freefall. <b>+2% crewed reliability.</b><span class="hist">↳ Tethered or rotating habitats are the leading answer to long-duration deconditioning.</span>'},
  {id:'closed_ecology', track:'crew', name:'Closed Ecological Life Support', cost:9.0, months:9, req:['long_duration_hab'], reqMissionDone:'endurance', sciCost:36, effect:{reliability:0.02,lsRecovery:0.07}, desc:'A bioregenerative loop — plants, algae and microbes — that grows food and recycles air and water indefinitely. The biology a self-sufficient colony runs on. <b>+2% crewed reliability.</b><span class="hist">↳ BIOS-3 and MELiSSA pioneered the closed ecologies a Mars colony will need.</span>'},
  {id:'gravity_assist_planning', track:'deepspace', name:'Gravity-Assist Trajectory Design', cost:6.0, months:6, req:['high_gain_antenna'], effect:{}, desc:'Multi-body trajectory optimization that steals momentum from planets. <b>Jupiter, Saturn and Belt transfer burns cost 8% less Δv.</b> The math that opened the outer system.<span class="hist">↳ Voyager toured four planets on a single gravity-assist chain discovered by a grad student.</span>'},
  {id:'aerocapture', track:'deepspace', name:'Aerocapture', cost:7.5, months:7, req:['precision_edl'], effect:{}, desc:'Skim a planetary atmosphere once to shed orbital velocity, capturing into orbit with almost no propellant. <b>−70% Δv on Mars, Jovian and Saturn orbital-capture burns.</b> The trick that makes heavy outer-planet orbiters affordable.<span class="hist">↳ Aerocapture has been studied for every ice-giant mission as the enabling technology.</span>'},
  {id:'atmospheric_isru', track:'refueling', name:'Atmospheric ISRU', cost:10.0, months:10, req:['electrolysis_scaleup'], reqMissionDone:'jupiter_orbit', effect:{}, desc:'Scoop and process the atmospheres of the gas giants and their moons for hydrogen, helium-3 and volatiles — refueling at the edge of the Solar System.<span class="hist">↳ Gas-giant atmospheres are the largest propellant and helium-3 reservoirs in the system.</span>'},
  {id:'orbital_shipyards', track:'assembly', name:'Orbital Shipyards', cost:13.0, months:12, req:['large_space_stations'], reqMissionDone:'mars_orbit', effect:{buildCostCut:0.05}, desc:'Build spacecraft in orbit that never have to survive a launch — larger, lighter, and assembled from delivered parts. <b>−5% build cost.</b><span class="hist">↳ A true orbital shipyard is the point where spacecraft stop being launched and start being built in space.</span>'},
  {id:'heavy_lift_infrastructure', track:'ground', name:'Heavy-Lift Infrastructure', cost:8.0, months:8, req:['cryo_ground_systems'], effect:{launchCostCut:0.04,buildTimeCut:0.5}, desc:'The largest pads, transporters and integration buildings — the ground footprint a super-heavy launch program needs. <b>−4% launch-ops cost · −0.5 mo build.</b><span class="hist">↳ The biggest rockets demand the biggest ground infrastructure ever built.</span>'},
  {id:'dual_launch_pads', track:'ground', name:'Dual Launch Pads', cost:9.0, months:8, req:['heavy_lift_infrastructure'], effect:{launchCostCut:0.04}, desc:'A second and third pad so one vehicle can fly while the next is integrated — the difference between a launch and a launch cadence. <b>−4% launch-ops cost.</b><span class="hist">↳ Parallel pads are how a program flies dozens of times a year instead of a few.</span>'},
  {id:'exoplanet_survey', track:'science', name:'Exoplanet Survey', cost:8.0, months:8, req:['astrobiology'], effect:{sciYield:0.10}, desc:'Space telescopes that find and characterize worlds around other stars — the science that frames every long-term ambition. <b>+10% mission science yield.</b><span class="hist">↳ Kepler and TESS turned exoplanets from theory into thousands of catalogued worlds.</span>'},
  {id:'advanced_research_institutes', track:'science', name:'Advanced Research Institutes', cost:11.0, months:10, req:['exoplanet_survey'], effect:{sciYield:0.12}, desc:'In-house laboratories and university partnerships that compound every discovery into the next. <b>+12% mission science yield.</b><span class="hist">↳ Standing research institutes are how agencies turn one-off missions into durable knowledge.</span>'},
  {id:'automated_factory', track:'manufacturing', name:'Fully Automated Factory', cost:12.0, months:10, req:['additive_manufacturing'], effect:{buildCostCut:0.05,buildTimeCut:1.0}, desc:'A lights-out plant where robots build vehicles end to end, around the clock. <b>−5% build cost · −1 mo build.</b><span class="hist">↳ Full factory automation is the endgame of manufacturing — the line that builds itself.</span>'},
  {id:'megastructure_construction', track:'assembly', name:'Megastructure Construction', cost:18.0, months:18, req:['orbital_shipyards'], reqMissionDone:'jupiter_orbit', effect:{}, desc:'Kilometer-scale orbital construction — solar collectors, rotating colonies, the bones of a spacefaring civilization. The capstone of everything the company has learned.<span class="hist">↳ Megastructures are where an aerospace company becomes a civilization-scale enterprise.</span>'},
];
// P8: Cross-Track Synergies. Thoughtful composition across ≥2 research tracks earns a bonus no
// single node grants alone. Fully derived from the researched set — no new state. The two
// numeric-fold seeds fold into the SAME reliability accumulator as familyRelBonus/doctrineRelMod/
// inquiryRelBonus (existing 0.995 cap still bounds everything); the other two are upgraded to
// real unlocks (a new mission type, a new passive contract) per the plan, gated via reqSynergy.
const SYNERGIES=[
  {id:'lightweight_cryo', name:'Lightweight Cryotanks', requires:['balloon_tanks','cryo_upper'],
    effect:{reliability:0.01}, blurb:'Thin-wall balloon-tank construction and cryogenic upper-stage propulsion compound into a more mature, better-integrated stage.'},
  {id:'autonomous_landing', name:'Autonomous Landing', requires:['propulsive_landing','autonomous_navigation'],
    blurb:'Precision propulsive landing plus autonomous guidance is precise enough to unlock uncrewed Precision Cargo Delivery contracts.'},
  {id:'rad_hardening', name:'Radiation Hardening', requires:['rad_shielding','redundant_avionics','radiation_countermeasures'],
    effect:{reliability:0.015}, blurb:'Shielding, fault-tolerant avionics and crew countermeasures compound into a further reliability trim on deep missions.'},
  {id:'rapid_refurb', name:'Rapid Refurbishment', requires:['rapid_inspection','qa_program'],
    blurb:'Fast-turnaround inspection plus a mature QA line is process know-how other operators will pay to license.'},
];
function synergyActive(s){ return s.requires.every(id=>!!(state.research&&state.research[id])); }
function activeSynergies(){ return SYNERGIES.filter(synergyActive); }
// reqSynergy on a mission/contract references a SYNERGY's own id directly (not a separate unlock key)
function synergyUnlocked(id){ const s=SYNERGIES.find(x=>x.id===id); return !!s && synergyActive(s); }
function synergyRelBonus(){ return activeSynergies().reduce((a,s)=>a+((s.effect&&s.effect.reliability)||0),0); }
function synergiesStripHTML(){
  const chips=SYNERGIES.map(s=>{
    const active=synergyActive(s);
    const missing=s.requires.filter(id=>!(state.research&&state.research[id])).map(id=>(RESEARCH.find(r=>r.id===id)||{}).name||id);
    const title=(active?s.blurb:`${s.blurb} Needs: ${missing.join(', ')}.`).replace(/"/g,'&quot;');
    return `<span class="pill ${active?'ok':'lock'}" title="${title}" style="margin:0 6px 6px 0;display:inline-block">${active?'✓':'○'} ${s.name}</span>`;
  }).join('');
  return `<div style="margin-bottom:10px"><div class="cc-panel-h" style="margin:0 0 4px">⚗ Cross-Track Synergies</div><div>${chips}</div></div>`;
}

// #6: research tracks — divergent branches, used by the swimlane tech-tree layout.
// R&D epic slice 1: the old combined 'structures' track is split into
// Structures & Materials, Testing & Reliability, and Guidance & Avionics.
// 'assembly' is relabelled Orbital Operations (key kept for back-compat).
const TRACKS = [
  {key:'propulsion', label:'Propulsion',             color:'#f5a623'},
  {key:'structures', label:'Structures & Materials', color:'#9aa7b0'},
  {key:'testing',    label:'Testing & Reliability',  color:'#cf7a6a'},
  {key:'guidance',   label:'Guidance & Avionics',    color:'#c9a23a'},
  {key:'crew',       label:'Crew & Life Support',    color:'#58c47a'},
  {key:'deepspace',  label:'Deep Space',             color:'#5aa9e0'},
  {key:'nuclear',    label:'Nuclear',                color:'#b07ce0'},
  {key:'refueling',  label:'Refueling & ISRU',       color:'#4fd1d9'},
  {key:'assembly',   label:'Orbital Operations',     color:'#e08a4f'},
  // R&D epic slice 6: the remaining tracks from the 13-track vision
  {key:'manufacturing', label:'Manufacturing & Production', color:'#7e9b54'},
  {key:'ground',        label:'Ground Infrastructure',      color:'#9c8b6e'},
  {key:'reuse',         label:'Reusability',                color:'#5bb8a0'},
  {key:'automation',    label:'Automation & AI',            color:'#c77fb0'},
  {key:'science',       label:'Science & Exploration',      color:'#b9d04a'},
];
function trackOf(id){ const r=RESEARCH.find(x=>x.id===id); return (r&&r.track)||'propulsion'; }
function trackColor(key){ const t=TRACKS.find(x=>x.key===key); return t?t.color:'#9aa7b0'; }

/* ---------- Solar System map data ---------- */
// Orbital radius is schematic (log-ish spacing for legibility), not to scale.
// legs: each Δv segment a mission must budget, in sequence from Earth's surface.
const BODIES = [
  {id:'mercury', name:'Mercury', kind:'planet', r:40, dotR:5, color:'#9a8a7a', note:'Sun-scorched and airless — a high-Δv target deep in the Sun\'s gravity well, mostly a gravity-assist waypoint.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Mercury transfer', dv:6400, note:'Shedding Earth\'s orbital speed to fall inward is expensive.'},{label:'Transfer → Mercury orbit', dv:4500, note:'No atmosphere to brake against — all propulsive.'}]},
  {id:'venus', name:'Venus', kind:'planet', r:60, dotR:8, color:'#e0c068', note:'Earth\'s near-twin in size, hostile in every other way — crushing pressure, acid clouds. Flyby and gravity-assist target.',
    legs:[
      {label:'Surface → LEO', dv:9400},
      {label:'LEO → Trans-Venus Injection', dv:3300, note:'Inbound transfer; capture into orbit costs considerably more due to Venus\'s deep gravity well and thick atmosphere.'},
    ]},
  {id:'earth', name:'Earth', kind:'planet', r:82, dotR:8, color:'#3a7bd5', note:'Home. Every mission starts (and most end) here.',
    missions:['first_flight','sounding','reach_space','high_alt','reentry_test','first_sat','first_astro','crew_orbit','multi_day','endurance'],
    legs:[{label:'Surface → LEO', dv:9400, note:'The great filter — gravity, drag, and steering losses included.'}]},
  {id:'moon', name:'The Moon', kind:'moon', around:'earth', moonR:14, dotR:5, color:'#b9c0c7', note:'Closest body beyond Earth. Water ice at the poles makes it the first refueling target.',
    missions:['luna_flyby','luna_orbit','luna_landing'],
    legs:[
      {label:'Surface → LEO', dv:9400},
      {label:'LEO → Trans-Lunar Injection', dv:3120},
      {label:'TLI → Lunar Orbit (LOI)', dv:900},
      {label:'Lunar Orbit → Surface (descent)', dv:1730, note:'Ascent back to orbit costs roughly the same.'},
    ]},
  {id:'mars', name:'Mars', kind:'planet', r:104, dotR:6, color:'#c1532b', note:'The long-term goal. CO₂ + water ice enables Sabatier-process methalox — propellant made on-site.',
    missions:['mars_flyby','mars_orbit','mars_landing'],
    legs:[
      {label:'Surface → LEO', dv:9400},
      {label:'LEO → Trans-Mars Injection', dv:3600, note:'Window-dependent — opens roughly every 26 months.'},
      {label:'TMI → Mars Orbit (MOI)', dv:1400, note:'Less with aerobraking.'},
      {label:'Mars Orbit → Surface', dv:1000, note:'Mostly aerodynamic; powered terminal descent — but ascent back to orbit costs far more. No atmosphere left to push against on the way up.'},
    ]},
  {id:'phobos', name:'Phobos', kind:'moon', around:'mars', moonR:11, dotR:3, color:'#8a8378', note:'Tiny, low-gravity Mars moon — a candidate staging point that barely costs anything to land on.',
    legs:[
      {label:'Surface → LEO', dv:9400},
      {label:'LEO → Trans-Mars Injection', dv:3600},
      {label:'TMI → Phobos rendezvous', dv:1500, note:'Phobos\'s gravity is negligible — this is essentially matching orbits.'},
    ]},
  {id:'belt', name:'Asteroid Belt (Ceres)', kind:'belt', r:128, color:'#9aa0a6', note:'Volatiles for propellant, metals, and platinum-group bounty — at the cost of years of transit.',
    missions:['belt_survey','belt_mining'],
    legs:[
      {label:'Surface → LEO', dv:9400},
      {label:'LEO → Belt transfer', dv:8000, note:'Highly target-dependent — figure is illustrative.'},
      {label:'Transfer → Ceres orbit', dv:500, note:'Ceres\'s gravity is weak; capture is cheap once you arrive.'},
    ]},
  {id:'jupiter', name:'Jupiter System', kind:'planet', r:156, dotR:14, color:'#d9a066', note:'Europa and Ganymede beckon — but radiation, distance, and light-lag make this an autonomous-era destination.',
    missions:['jupiter_flyby','jupiter_orbit'],
    legs:[
      {label:'Surface → LEO', dv:9400},
      {label:'LEO → Jupiter transfer', dv:6300, note:'Gravity assists can reduce this substantially.'},
      {label:'Transfer → Jovian system capture', dv:1000, note:'Highly mission-dependent — orbit insertion around a moon, not Jupiter itself.'},
    ]},
  {id:'io', name:'Io', kind:'moon', around:'jupiter', moonR:18, dotR:4, color:'#e8d44a', note:'The most volcanically active world in the system — sulphur plains under a lethal radiation bath.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Jupiter transfer', dv:6300},{label:'Capture → Io orbit', dv:1700, note:'Deep in Jupiter\'s radiation belts.'}]},
  {id:'europa', name:'Europa', kind:'moon', around:'jupiter', moonR:25, dotR:4, color:'#cdb89a', note:'An ice shell over a global ocean — the system\'s prime astrobiology target.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Jupiter transfer', dv:6300},{label:'Capture → Europa orbit', dv:1400}]},
  {id:'ganymede', name:'Ganymede', kind:'moon', around:'jupiter', moonR:32, dotR:5, color:'#9a8f80', note:'The largest moon in the solar system — bigger than Mercury, with its own magnetic field.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Jupiter transfer', dv:6300},{label:'Capture → Ganymede orbit', dv:1100}]},
  {id:'callisto', name:'Callisto', kind:'moon', around:'jupiter', moonR:39, dotR:5, color:'#6f6a63', note:'The most heavily cratered body known — outside the worst radiation, the safest Jovian base site.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Jupiter transfer', dv:6300},{label:'Capture → Callisto orbit', dv:900}]},
  {id:'saturn', name:'Saturn System', kind:'planet', r:188, dotR:12, color:'#e3c68a', note:'The ringed jewel — Titan and Enceladus make it a premier outer-system destination.',
    missions:['saturn_orbit'],
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Saturn transfer', dv:7000, note:'Gravity assists strongly recommended.'},{label:'Transfer → Saturn system capture', dv:1100}]},
  {id:'titan', name:'Titan', kind:'moon', around:'saturn', moonR:18, dotR:5, color:'#d98a3a', note:'A thick nitrogen atmosphere and methane lakes — you can aerobrake here, and almost fly.',
    missions:['titan_landing'],
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Saturn transfer', dv:7000},{label:'Capture → Titan (aerobrake)', dv:700, note:'The atmosphere does most of the braking.'}]},
  {id:'rhea', name:'Rhea', kind:'moon', around:'saturn', moonR:26, dotR:4, color:'#c8ccd0', note:'Saturn\'s second-largest moon — a cratered iceball.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Saturn transfer', dv:7000},{label:'Capture → Rhea orbit', dv:900}]},
  {id:'uranus', name:'Uranus System', kind:'planet', r:218, dotR:9, color:'#9fe3e0', note:'The tipped ice giant — orbiting on its side, a cold and distant frontier.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Uranus transfer', dv:7700},{label:'Transfer → Uranus system capture', dv:1000}]},
  {id:'titania', name:'Titania', kind:'moon', around:'uranus', moonR:15, dotR:4, color:'#b8a89a', note:'Uranus\'s largest moon — fault canyons across an icy crust.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Uranus transfer', dv:7700},{label:'Capture → Titania orbit', dv:800}]},
  {id:'oberon', name:'Oberon', kind:'moon', around:'uranus', moonR:21, dotR:4, color:'#9a8a80', note:'The outermost large Uranian moon — ancient, dark, cratered.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Uranus transfer', dv:7700},{label:'Capture → Oberon orbit', dv:700}]},
  {id:'neptune', name:'Neptune System', kind:'planet', r:246, dotR:9, color:'#3a6ed0', note:'The windiest world — supersonic storms on the outermost ice giant.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Neptune transfer', dv:8200},{label:'Transfer → Neptune system capture', dv:1100}]},
  {id:'triton', name:'Triton', kind:'moon', around:'neptune', moonR:16, dotR:4, color:'#cfe0e6', note:'A captured Kuiper-belt world orbiting backwards, with nitrogen geysers — likely an ocean within.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Neptune transfer', dv:8200},{label:'Capture → Triton orbit', dv:900, note:'Retrograde orbit makes capture geometry tricky.'}]},
  {id:'pluto', name:'Pluto', kind:'dwarf', r:272, dotR:4, color:'#caa884', note:'The classic ninth — a nitrogen-ice dwarf with a heart-shaped plain, far out in the Kuiper Belt.',
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Pluto transfer', dv:8800, note:'A decade-plus cruise even with assists.'},{label:'Transfer → Pluto orbit', dv:1300, note:'No atmosphere — all propulsive capture.'}]},
  {id:'oort', name:'Oort Cloud', kind:'cloud', r:320, color:'#8fb3c8', note:'A vast spherical shell of icy planetesimals at the edge of the Sun\'s gravity — the source of long-period comets, light-months away. Schematic ring only.',
    missions:['oort_precursor'], // I1: the interstellar-precursor capstone
    legs:[{label:'Surface → LEO', dv:9400},{label:'LEO → Solar System Escape', dv:8500, note:'A fusion-torch precursor burn — no other propulsion in reach has a realistic exhaust velocity for this.'}]},
];
// fixed display angles (radians) so bodies aren't collinear — purely cosmetic. Moons use the angle about their planet.
const ANGLES = {mercury:2.6, venus:2.1, earth:-0.7, moon:0.9, mars:-1.6, phobos:0.3, belt:-0.2,
  jupiter:1.3, io:0.2, europa:1.7, ganymede:3.2, callisto:4.7,
  saturn:0.4, titan:0.6, rhea:3.5, uranus:-2.4, titania:1.2, oberon:4.0, neptune:3.0, triton:2.3, pluto:-2.9, oort:0};

/* ---------- M2: crew & life support ---------- */
const DAILY_CONSUMABLE = 0.005; // t per crew per day (~5 kg: O2 + water + food + packaging)
const CAPSULE = { base:0.5, perCrew:0.4, les:0.3 }; // tonnes
const ECLSS = {
  open:    {id:'open',    name:'Open-Loop',           recovery:0.00, sysBase:0.05, perCrew:0.05, research:null},
  partial: {id:'partial', name:'CO₂/Water Recovery',  recovery:0.60, sysBase:0.40, perCrew:0.12, research:'eclss_partial'},
  closed:  {id:'closed',  name:'Closed-Loop',         recovery:0.90, sysBase:1.20, perCrew:0.18, research:'eclss_closed'},
};
const TEST_LEVELS = [
  {name:'No campaign',         rel:0.00, cost:0.0, months:0},
  {name:'Static fire',         rel:0.05, cost:0.6, months:1},
  {name:'Uncrewed test flight',rel:0.12, cost:2.5, months:3},
];
// Crew & Life Support research that improves recycling (e.g. bioregenerative loops)
// pushes consumable recovery beyond the base ECLSS tier — directly shrinking the
// supply mass you must lift. Only applies once you have an actual recycling system
// (partial/closed tier), and can never reach a perfect 100% closed loop.
const LS_RECOVERY_CAP=0.98;
function lsRecoveryBonus(){ return researchEffectSum('lsRecovery'); }
function eclssRecovery(eclssId){
  const t=ECLSS[eclssId]||ECLSS.open;
  return t.recovery>0 ? Math.min(LS_RECOVERY_CAP, t.recovery + lsRecoveryBonus()) : t.recovery;
}
function lifeSupport(m, eclssId){
  const t=ECLSS[eclssId]||ECLSS.open;
  const recovery = eclssRecovery(eclssId); // base tier + crew-research recycling bonus (capped)
  const consumables = m.crew*m.days*DAILY_CONSUMABLE*(1-recovery);
  const system = t.sysBase + t.perCrew*m.crew;
  const capsule = CAPSULE.base + CAPSULE.perCrew*m.crew + (state.research.launch_escape?CAPSULE.les:0);
  const total = capsule + system + consumables + (m.payload||0);
  return {consumables, system, capsule, total, recovery, baseRecovery:t.recovery};
}

/* ---------- difficulty (design §13: math exposure / forgiveness) ----------
   Difficulty NEVER touches the rocket equation — Δv math is identical in both
   modes. It scales economy, reliability forgiveness, and how much of the math
   is exposed. Napkin: friendlier numbers, equations under the hood. Engineer:
   sub-scale budgets, green-company unreliability, full math on display. */
const DIFFICULTY={
  napkin:{
    label:'Napkin', tag:'Forgiving',
    blurb:'Back-of-the-envelope mode. The budget is roomier, hardware is more reliable, and the rocket equation stays under the hood — you see the results, not the derivations.',
    startMoney:8.0, overhead:0.08, relBonus:0.12, relFloor:0.55, relCap:0.985,
    payoutMult:1.25, buildCostMult:0.85, showEquations:false, govFloor:0.05
  },
  engineer:{
    label:'Engineer', tag:'Realistic',
    blurb:'Slide-rule mode. Sub-scale budgets, the genuine unreliability of a green company, and the full rocket-equation math exposed at every step on the bench.',
    startMoney:5.0, overhead:0.12, relBonus:0.0, relFloor:0.35, relCap:0.95,
    payoutMult:1.0, buildCostMult:1.0, showEquations:true
  },
  custom:{
    label:'Custom', tag:'Your rules',
    blurb:'Set every knob yourself. Drag the sliders below to dial in budget, overhead, reliability, payouts, build cost, and whether the rocket-equation math is on display.',
    // these double as the seed defaults for state.customDifficulty
    startMoney:5.0, overhead:0.12, relBonus:0.06, relFloor:0.45, relCap:0.97,
    payoutMult:1.1, buildCostMult:0.95, showEquations:true, custom:true
  }
};
// Adjustable knobs for Custom mode: key, label, slider range, and value formatter.
const CUSTOM_KNOBS=[
  {key:'startMoney',    label:'Starting capital',  min:2,    max:20,   step:0.5,   fmt:v=>fM(v)},
  {key:'overhead',      label:'Monthly overhead',  min:0.02, max:0.30, step:0.01,  fmt:v=>fM(v)},
  {key:'relBonus',      label:'Reliability bump',  min:0,    max:0.25, step:0.01,  fmt:v=>(v>0?'+':'')+Math.round(v*100)+'%'},
  {key:'relFloor',      label:'Reliability floor', min:0.20, max:0.80, step:0.05,  fmt:v=>Math.round(v*100)+'%'},
  {key:'relCap',        label:'Reliability cap',   min:0.80, max:0.999,step:0.005, fmt:v=>(v*100).toFixed(1)+'%'},
  {key:'payoutMult',    label:'Mission payouts',   min:0.5,  max:2.0,  step:0.05,  fmt:v=>'×'+v.toFixed(2)},
  {key:'buildCostMult', label:'Build cost',        min:0.5,  max:1.5,  step:0.05,  fmt:v=>'×'+v.toFixed(2)}
];
function customDefaults(){
  const c=DIFFICULTY.custom, o={};
  CUSTOM_KNOBS.forEach(k=>o[k.key]=c[k.key]);
  o.showEquations=c.showEquations;
  return o;
}
function diff(){
  const m=(state&&state.difficulty)||'engineer';
  if(m==='custom') return Object.assign({label:'Custom',tag:'Your rules',custom:true}, customDefaults(), (state&&state.customDifficulty)||{});
  return DIFFICULTY[m] || DIFFICULTY.engineer;
}
function diffLabel(m){ return (DIFFICULTY[m]&&DIFFICULTY[m].label)||'Engineer'; }
