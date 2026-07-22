let state;
function newGame(difficulty){
  const mode=DIFFICULTY[difficulty]?difficulty:'engineer';
  const customDifficulty=customDefaults();
  const startMoney=mode==='custom'?customDifficulty.startMoney:DIFFICULTY[mode].startMoney;
  state = {
    company:'ORBITAL VENTURES',
    difficulty:mode, customDifficulty,
    year:1942, month:0, day:0, // month 0 = Jan; day 0..DAYS_PER_MONTH-1 (Time Granularity epic)
    money:startMoney, rep:0, sigma:0.12,
    successes:0, flights:0,
    research:{}, unlocked:{a4:true}, activeResearch:null,
    completed:{}, activeMission:'first_flight',
    stages:[{eng:'a4', count:1, prop:2.0}],
    boosters:{eng:null, count:0, prop:0}, // parallel strap-on boosters (count:0 = none)
    transfer:{eng:'hyper_storable', prop:10.0},
    descent:{eng:'hyper_storable', prop:6.0},
    ascent:{eng:'hyper_storable', prop:2.5},
    eclss:'open', testLevel:0,
    windows:{}, committedWindow:null, selectedBody:'moon', mapZoom:null,
    depot:0, depotUse:0,
    tab:'command', won:false, wonM2:false, wonM3a:false, wonM3aii:false, wonM3b:false, wonM3bii:false, over:false,
    log:[], rivalFired:{}, scooped:{}, rivalThreat:{}, rivalState:{},
    staff:[], assignedAstronaut:null, persEventCooldown:5,
    departments:defaultDepartments(), // #19: org layer over hired staff (per-dept lead + training)
    econEvents:[], eventCooldown:6, pgmRoyalty:0,
    passiveContracts:[], contractCooldown:{}, contractSignings:{}, engineHeritage:{}, // passive-income contracts (repeatable + cooldown + diminishing)
    publicSupport:SUPPORT_BASE, // #8: program politics — public mood dial
    production:{bays:1,foundry:1,pads:1,qa:1}, // #7: manufacturing capacity — leveled production lines
    engineStock:{}, // #7 sub-assemblies: pre-built engines in the yard (engId -> count)
    engineStockTested:{}, // #7 slice 3: bench-tested subset of engineStock (engId -> count)
    partStock:{}, // #7 sub-assemblies slice 2: pre-built tank sets / crew modules ("kind:sub" -> count)
    partStockTested:{}, // #7 slice 3: bench-tested subset of partStock ("kind:sub" -> count)
    lastMonth:{revenue:0,expenses:0,net:0,flights:0}, // #18: rolling ops-summary ledger
    history:{}, // #18: missionId -> completion year, for the Home timeline
    metricHist:defaultMetricHist(), // #28: monthly trend buffers for dashboard sparklines
    livery:defaultLivery(), // bench customization: cosmetic vehicle livery
    parts:defaultParts(), // BC2: performance parts (tank material / avionics / fairing)
    blueprints:[], // saved full ship designs (reloadable blueprints)
    frontPages:[], // P7: The Agency Wire — headline records for the Chronicle scrapbook
    crisis:null, crisisDone:null, leoFlights:0, deepFlights:0, crisisHistory:[], // P11/I3: the crisis roster (leoFlights/deepFlights are trigger counters; crisisHistory is every resolved crisis)
    researchNext:null, // I5: queued "start next" research pick — auto-starts once the active project finishes and it's affordable/eligible
    researchGoal:null, // #14: pinned research goal — the tech tree persistently highlights this node's full prereq chain (and the R&D rail shows steps remaining) until it's researched or unpinned
    trackingStations:[], // #89: built tracking-station ids (see TRACKING_STATIONS, data.js). Gate itself is OFF (TRACKING_NETWORK_LIVE=false) until slice 2 ships a build UI.
    ambition:'flag', programsAwarded:{}, ambitionFulfilled:false,
    facilities:{}, fuelPrice:FUEL_BASE, fuelPrevPrice:FUEL_BASE, fuelBuyer:null,
    architectures:{}, science:0,
    vehicles:[], activeVehicle:null, // #3: named vehicle lineages with heritage
    assembleOrbit:false, // #6: orbital-assembly route toggle (per-launch, resets after flight)
    recovery:false, // M5: reusability — first-stage recovery fitted to the current design (persists)
    rehearsal:false, // #20 slice 4: pre-flight rehearsal fitted to this flight (per-launch, resets after flight)
    techLevel:{}, // #3: per-tech investment level for leveled technologies
    divisions:{}, // #4: research divisions (skill/exp/morale per division)
    partnerships:[], // #6: active research-partnership ids (accelerate a track for setup + upkeep)
    breakthroughCooldown:3, // #5: division R&D breakthrough rate-limiter
    relDebt:0, // #26: permanent reliability penalty from "ship it degraded" research setbacks
    powerSource:'solar', // Phase 2: vehicle power plant (solar/rtg/reactor)
    recentBuilds:[], // #7 slice 5: rolling ring buffer {at,units} of the last CADENCE_WINDOW months of builds
    materials:defaultMaterialsState(), // #7 slice 6: per-commodity spot price + optional fixed-price contract
    buildQueue:[], hangar:[], hulls:[], hullSeq:0, orderSeq:0, // #7 final + E4.4: production orders, ready vehicles, and serial-numbered physical hulls
    padMonthAbs:-1, padMonthUsed:0, // CE2(b): launch-cadence — pad slots used in the current calendar month
    standingProd:null, juggernautReached:false, // CE2(c): juggernaut capstone — standing production line + milestone flag
    doctrine:null, // CE3(a): company doctrine (strategic identity) — null = undeclared/neutral
    lunarArch:null, // CE3(c): committed lunar architecture (LOR/Direct/EOR) — null = uncommitted
    uiLayer:'advanced', // #23: progressive UI complexity (basic/advanced/expert), independent of difficulty
    loanInterest:0, // CE4(c): permanent monthly bridge-loan debt service
    inquiryCredit:null, // P3: unused funded-inquiry reliability credit {subsystem,rel,flights} or null
    eraSeen:0, eraStartSnapshot:null, // P6 6.1: last era acknowledged via the interstitial + its start-of-era baseline (set just below)
  };
  state.eraStartSnapshot=eraSnapshot(); // P6 6.1: Pioneer-era baseline (flights 0, no firsts, start money, rep 0)
  log('info','Company founded. The pad is yours — go make some noise.');
  reconcileEngineMods(); // reset engine stats to base for a fresh company
}

/* ---------- helpers ---------- */
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const $=id=>document.getElementById(id);
const fM=v=>'$'+v.toFixed(2)+'M';
const fI=v=>Math.round(v).toLocaleString();
// #30 domain color-coding — the shared vocabulary. Each domain maps to a CSS custom property
// (defined in :root) so dynamic markup can tint to match the static .dom-* / .dombar-* classes.
const DOMAINS={
  economy:    {label:'Economy',     color:'var(--dom-economy)'},
  engineering:{label:'Engineering', color:'var(--dom-engineering)'},
  research:   {label:'Research',    color:'var(--dom-research)'},
  military:   {label:'Military',    color:'var(--dom-military)'},
  exploration:{label:'Exploration', color:'var(--dom-exploration)'},
  crew:       {label:'Crew',        color:'var(--dom-crew)'},
  warn:       {label:'Warning',     color:'var(--dom-warn)'},
};
function domColor(d){ return (DOMAINS[d]||{}).color || 'var(--ink)'; }
function domDot(d){ return `<span class="dom-dot" style="background:${domColor(d)}"></span>`; } // a small colored chip prefix
function dateStr(){return ((state.day||0)+1)+' '+MONTHS[state.month]+' '+state.year;} // "14 Mar 1962" — day-of-month is 1-based (Time Granularity)
function log(kind,msg,nav,detail){state.log.unshift({when:dateStr(),kind,msg,nav,detail}); if(state.log.length>40)state.log.pop();} // E1.5: optional 4th `detail` (plain text) — transient UI-only causal chain for failure entries, never persisted (JSON drops undefined)
function curSigma(){return clampA(state.sigma * tankMaterial().sigmaMult, 0.02, 0.9);} // BC2: tank material scales structural coefficient
function curRel(){
  let base=0.65+0.025*Math.min(state.successes,12); // heritage: green company is genuinely unreliable
  // sum every completed node that buys reliability — now spread across the Testing & Reliability and Guidance & Avionics tracks (test_program, telemetry, QA, vibration, redundant avionics); track-agnostic so the split is balance-neutral
  for(const r of RESEARCH){ if(state.research[r.id] && r.effect && r.effect.reliability) base+=r.effect.reliability; }
  base+=techLevelEffectSum('reliability'); // #3: any reliability from leveled techs (still under relCap)
  base+=engRelBonus(); // M6: engineer team reliability bonus
  base+=diff().relBonus; // difficulty: forgiveness bump
  base-=relDebt(); // #26: lasting penalty from research setbacks shipped with the flaw unresolved
  base-=deptStaffingRelPenalty(); // #19 slice C: era-scaled hit for leaving a core department unstaffed (0 in Pioneer)
  return base; // note: effectiveReliability still clamps to diff().relCap, so the cap preserves balance
}
// #26: bounded reliability debt accumulated from "ship it degraded" research-setback calls
function relDebt(){ return Math.min(SETBACK_REL_DEBT_CAP, state.relDebt||0); }
// R&D epic slice 2b: research-driven engine performance. Completed nodes can carry
// effect.isp / effect.thrust (fractional); these accumulate (capped) and scale the
// LAUNCH-VEHICLE stages' Isp/thrust — the rocket equation itself is untouched, only
// its inputs. In-space legs (transfer/lander) are deliberately NOT scaled, so
// deep-space mass ratios stay as balanced and the buff is bounded to ascent.
const ISP_BONUS_CAP=0.10, THRUST_BONUS_CAP=0.15;
function researchEffectSum(key){ let s=0; for(const r of RESEARCH){ if(state.research[r.id] && r.effect && r.effect[key]) s+=r.effect[key]; } return s + techLevelEffectSum(key); }
function ispMult(){ return 1 + Math.min(ISP_BONUS_CAP, researchEffectSum('isp')); }
function thrustMult(){ return 1 + Math.min(THRUST_BONUS_CAP, researchEffectSum('thrust')); }
// R&D epic slice 6b: wire the new-track gate nodes to real economy effects.
// Manufacturing/Reuse cut build cost; Ground/Reuse cut launch-ops cost; Science
// multiplies mission science yield. All feed researchEffectSum.
// CE2 · Power Curve (2026-06-26): the ECONOMY effects (build cost, launch-ops cost,
// build time) are released from hard ceilings to a *diminishing-but-unbounded* curve so
// a maxed late-game company genuinely builds far cheaper/faster than a startup — felt
// power that never touches the rocket equation. PHYSICS effects (Isp, thrust, reliability
// → relCap) keep their hard caps elsewhere; those bound Δv/reliability so missions can't
// trivialise. sciYield is a *payout* multiplier (not a cost curve) so it stays bounded —
// reward inflation is CE4's concern, not this epic's.
// dimCurve is the identity at/below the old cap (so a save already sitting under the cap
// sees ZERO change — exact balance preservation) and bends smoothly past it: slope 1 at
// the cap (C1-continuous, no kink), asymptoting toward `asymptote` but never reaching it,
// so every further node still pays off and cost/time can never hit zero (no runaway).
const BUILD_CUT_CAP=0.30, LAUNCH_CUT_CAP=0.30, SCI_YIELD_CAP=0.50, BUILD_TIME_CAP=3;
const BUILD_CUT_ASYMP=0.80, LAUNCH_CUT_ASYMP=0.80, BUILD_TIME_ASYMP=6; // CE2 curve ceilings (asymptotic — never reached)
function dimCurve(sum, cap, asymptote){
  if(sum<=cap) return sum;                          // identity below the old cap — balance preserved exactly
  const span=asymptote-cap;                          // headroom past the cap (>0)
  return cap + span*(1-Math.exp(-(sum-cap)/span));   // smooth join (slope 1 at cap), → asymptote
}
function mfgBuildMult(){ return 1 - dimCurve(researchEffectSum('buildCostCut'), BUILD_CUT_CAP, BUILD_CUT_ASYMP); }
function groundLaunchMult(){ return 1 - dimCurve(researchEffectSum('launchCostCut'), LAUNCH_CUT_CAP, LAUNCH_CUT_ASYMP); }
function sciYieldMult(){ return (1 + Math.min(SCI_YIELD_CAP, researchEffectSum('sciYield'))) * (1 + sciStaffYieldBonus()); } // research term stays bounded (CE4 owns reward inflation); science staff add a separate staffing-derived multiplier (0 when unstaffed)
function buildTimeCut(){ return dimCurve(researchEffectSum('buildTimeCut'), BUILD_TIME_CAP, BUILD_TIME_ASYMP); } // #6c: months shaved (Manufacturing/Ground), now uncapped-on-curve
// ---------- CE3 slice (a): Company Doctrine — strategic identity ----------
// A one-time, semi-irreversible identity choice. Each doctrine grants a standing BONUS *and* a
// standing PENALTY (multipliers folded into the existing economy hooks below), so "what kind of
// company am I?" becomes a real trade, not a cosmetic label. state.doctrine=null = UNDECLARED —
// every doctrine multiplier defaults to 1 / delta 0, i.e. today's exact neutral behaviour, so a
// save with no doctrine is unchanged. The first declaration is free; switching afterward (doctrine
// drift) costs heavy capital + rep + months of upheaval, making it a commitment, not a menu.
const DOCTRINES = {
  reuse:     { name:'Reusability', icon:'♻', tag:'fly it, land it, fly it again',
    blurb:'Cheap launch ops above all — at the price of a harder, costlier R&D road and shakier early hardware.',
    effects:{ launch:0.80, rd:1.20, relEarly:-0.05 },
    pros:['−20% launch-ops cost'], cons:['+20% R&D cost','−5% reliability, fading over your first 12 flights'] },
  heavy:     { name:'Heavy-Lift', icon:'🏗', tag:'no payload too big',
    blurb:'Brute-force throw weight. Vehicles are cheaper to build but expensive to fly — you move mass, not pennies.',
    effects:{ build:0.85, launch:1.15 },
    pros:['−15% build cost'], cons:['+15% launch-ops cost'] },
  commercial:{ name:'Commercial', icon:'$', tag:'spaceflight as a business',
    blurb:'Chase the contract. Missions pay more, but the state keeps its distance — far less public funding.',
    effects:{ payout:1.20, gov:0.70 },
    pros:['+20% mission payout'], cons:['−30% government funding'] },
  statecraft:{ name:'Statecraft', icon:'★', tag:'an instrument of the nation',
    blurb:'A flag-planting national program. Generous public funding and prestige — but commercial work pays you less.',
    effects:{ gov:1.40, rep:1.25, payout:0.88 },
    pros:['+40% government funding','+25% reputation gain'], cons:['−12% mission payout'] },
  science:   { name:'Science', icon:'⚗', tag:'knowledge is the mission',
    blurb:'Discovery first. Missions yield far more science, but the flights pay less and R&D runs dearer.',
    effects:{ sci:1.40, payout:0.85, rd:1.10 },
    pros:['+40% mission science yield'], cons:['−15% mission payout','+10% R&D cost'] },
};
function activeDoctrine(){ return state.doctrine ? DOCTRINES[state.doctrine] : null; }
function doctrineMult(key){ const d=activeDoctrine(); return d && d.effects && d.effects[key]!=null ? d.effects[key] : 1; }
// reliability delta — an early-heritage penalty that fades to 0 by 12 successes (bounded)
function doctrineRelMod(){
  const d=activeDoctrine(); if(!d||!d.effects||d.effects.relEarly==null) return 0;
  const fade=Math.max(0, 1 - Math.min(state.successes||0,12)/12);
  return d.effects.relEarly*fade;
}
// CE3 slice (b): branch opportunity cost (branchAffinity). Depth in a research track DISCOUNTS
// its further nodes (a focused line compounds toward its capstone); tracks you've fallen behind
// on carry a SURCHARGE proportional to the gap below your most-developed track (the road not
// taken costs more). Purely derived from state.research + node.track — no new state, and at game
// start every track's affinity is 0 so the multiplier is exactly 1 (today's neutral behaviour).
// You can still get everything; focus just reaches its capstone far sooner than a generalist.
const BRANCH_DISC_PER=0.035, BRANCH_DISC_CAP=0.35;   // depth discount: per owned node in the track / cap
const BRANCH_SUR_PER=0.030,  BRANCH_SUR_CAP=0.30;    // neglect surcharge: per node of gap below your top track / cap
const BRANCH_MULT_FLOOR=0.55, BRANCH_MULT_CEIL=1.30; // net R&D-cost multiplier is clamped here (never free, never punitive)
function trackAffinity(track){ if(!track) return 0; let n=0; for(const r of RESEARCH){ if(r.track===track && state.research && state.research[r.id]) n++; } return n; }
function maxTrackAffinity(){ const seen={}; let mx=0; for(const r of RESEARCH){ if(state.research && state.research[r.id]){ seen[r.track]=(seen[r.track]||0)+1; if(seen[r.track]>mx) mx=seen[r.track]; } } return mx; }
function branchAffinityMult(track){
  const aff=trackAffinity(track);
  const discount=Math.min(BRANCH_DISC_CAP, BRANCH_DISC_PER*aff);            // your depth in THIS track
  const gap=Math.max(0, maxTrackAffinity()-aff);                            // how far behind your strongest line
  const surcharge=Math.min(BRANCH_SUR_CAP, BRANCH_SUR_PER*gap);            // the road not taken
  return clampA(1 - discount + surcharge, BRANCH_MULT_FLOOR, BRANCH_MULT_CEIL);
}
function rdCostOf(r){ return round2((r?r.cost:0)*doctrineMult('rd')*branchAffinityMult(r&&r.track)); } // doctrine + branch-affinity R&D price
// #1 science gate: a handful of flagship deep-tech nodes also cost banked science to *start* —
// knowledge you can only have by flying (prestige science missions feed this). 0 = ungated.
function sciGateCost(r){ return (r&&r.sciCost)||0; }
function sciGateMet(r){ return (state.science||0) >= sciGateCost(r); }
// switching ("doctrine drift") is a real commitment: capital that grows with company size, rep, and time
const DOCTRINE_SWITCH_REP=20, DOCTRINE_SWITCH_MONTHS=6;
function doctrineSwitchCost(){ return round2(Math.max(8, (state.flights||0)*0.8 + 6)); }
function canSetDoctrine(id){
  if(!DOCTRINES[id]) return {ok:false,why:'unknown doctrine'};
  if(state.doctrine===id) return {ok:false,why:'already your doctrine'};
  if(!state.doctrine) return {ok:true, first:true};                         // first declaration is free
  if(state.money < doctrineSwitchCost()) return {ok:false,why:`switching costs ${fM(doctrineSwitchCost())}`};
  if(state.rep < DOCTRINE_SWITCH_REP) return {ok:false,why:`switching costs ${DOCTRINE_SWITCH_REP} rep`};
  return {ok:true, first:false};
}
function setDoctrine(id){
  const chk=canSetDoctrine(id); if(!chk.ok) return;
  if(chk.first){
    state.doctrine=id;
    log('ok',`Company doctrine declared: ${DOCTRINES[id].icon} ${DOCTRINES[id].name} — ${DOCTRINES[id].tag}.`);
  }else{
    const cost=doctrineSwitchCost();
    state.money=round2(state.money-cost); state.rep=Math.max(0,state.rep-DOCTRINE_SWITCH_REP);
    state.doctrine=id;
    log('note',`Doctrine drift — refocused to ${DOCTRINES[id].icon} ${DOCTRINES[id].name} at a cost of ${fM(cost)}, ${DOCTRINE_SWITCH_REP} rep and ${DOCTRINE_SWITCH_MONTHS} months of upheaval.`);
    advance(DOCTRINE_SWITCH_MONTHS);
  }
  render();
}
// R&D epic slice 3: Tech Levels — flagship technologies you keep investing in.
// After a leveled tech is researched (L1), capital + time raise it to L2..max; each
// level adds to the SAME isp/thrust/reliability accumulators above, so the existing
// caps still bound performance. Mirrors the #7 production-line level pattern.
const TECH_LEVELS = {
  cryo_upper: { name:'Cryogenic Engines', max:4, baseCost:4.0, costMul:1.7, months:5,
                names:['Atlas-Centaur','Saturn','Shuttle','Modern Reusable'],
                per:{ isp:0.02 } }, // +2% Isp per level beyond L1 (global Isp cap still applies)
  digital_computer: { name:'Flight Computers', max:3, baseCost:5.0, costMul:1.7, months:5,
                names:['Discrete Logic','Integrated Circuits','Fault-Tolerant AI'],
                per:{ reliability:0.015 } }, // +1.5% reliability per level beyond L1 (relCap still bounds it)
  full_vehicle_reuse: { name:'Vehicle Reuse', max:3, baseCost:8.0, costMul:1.7, months:6,
                names:['Refurbish','Rapid Reflight','Airline-like'],
                per:{ launchCostCut:0.02 } }, // deeper reuse keeps cutting launch-ops cost (capped)
  automated_factory: { name:'Automated Factory', max:3, baseCost:8.0, costMul:1.7, months:6,
                names:['Lights-out Line','Robotic Plant','Self-Replicating'],
                per:{ buildCostCut:0.02 } }, // a maturing factory keeps cutting build cost (capped)
};
function isLeveledTech(id){ return !!TECH_LEVELS[id]; }
function techLevel(id){ if(!state.research||!state.research[id]) return 0; return Math.max(1, (state.techLevel&&state.techLevel[id])||1); }
function techLevelName(id){ const d=TECH_LEVELS[id], l=techLevel(id); return (d&&d.names&&d.names[l-1])||('Level '+l); }
function techUpgradeCost(id){ const d=TECH_LEVELS[id]; return round2(d.baseCost*Math.pow(d.costMul, techLevel(id)-1)); }
function canUpgradeTech(id){
  const d=TECH_LEVELS[id]; if(!d) return {ok:false,why:'Not a leveled technology.'};
  if(!state.research||!state.research[id]) return {ok:false,why:'Research it first.'};
  if(techLevel(id)>=d.max) return {ok:false,why:'At maximum level.'};
  if(state.activeResearch) return {ok:false,why:'Another project in progress.'};
  if(state.money<techUpgradeCost(id)) return {ok:false,why:'Not enough capital.'};
  return {ok:true};
}
function upgradeTech(id){
  const chk=canUpgradeTech(id); if(!chk.ok) return;
  const d=TECH_LEVELS[id], cost=techUpgradeCost(id);
  state.money-=cost;
  advance(d.months); // development time — the new level comes online after the work
  if(state.over){ render(); return; }
  if(!state.techLevel) state.techLevel={};
  state.techLevel[id]=techLevel(id)+1;
  log('ok',`${d.name} advanced to ${techLevelName(id)} (Level ${state.techLevel[id]}/${d.max}).`);
  render();
}
// total bonus contributed by leveled techs for an effect key (levels beyond L1)
function techLevelEffectSum(key){
  let s=0;
  for(const id in TECH_LEVELS){ const d=TECH_LEVELS[id]; if(d.per&&d.per[key]&&state.research&&state.research[id]) s+=d.per[key]*(techLevel(id)-1); }
  return s;
}

/* ---------- R&D epic slice 4: Research Divisions (first slice of #19) ----------
   Org-level depth above individual engineers (M6). Research is carried out by named
   divisions, each covering a few tracks. A division's QUALITY (skill + accumulated
   experience + morale) accelerates research in its tracks — a pure speed bonus that
   stacks with the engineer-team bonus. You invest capital to train a division
   (raise skill); experience grows as it completes projects; morale tracks financial
   health. Generalises the flat engRdSpeedBonus() into per-track speed. */
const DIVISIONS = [
  {id:'propulsion', name:'Propulsion Division',        tracks:['propulsion','nuclear','reuse'],          blurb:'Engines, combustion, nuclear, reusable boosters.'},
  {id:'structures', name:'Structures & Production Division', tracks:['structures','testing','manufacturing','ground'], blurb:'Airframes, materials, testing, factory & ground systems.'},
  {id:'avionics',   name:'Avionics & Software Division',tracks:['guidance','assembly','automation'],     blurb:'Guidance, flight computers, docking, automation & AI.'},
  {id:'lifesci',    name:'Life Sciences Division',     tracks:['crew'],                                  blurb:'Crew systems, life support, human factors.'},
  {id:'deepspace',  name:'Deep Space & Science Division', tracks:['deepspace','refueling','science'],    blurb:'Trajectories, deep-space ops, refueling/ISRU, science.'},
];
const DIV_EXP_FULL=8;        // completed projects for full experience credit
const DIV_SPEED_MAX=0.25;    // max fractional R&D-speed bonus from a top-quality division
const DIV_TRAIN_BASE=1.0;    // $M base training cost (escalates with skill)
const DIV_TRAIN_SKILL=0.12;  // skill gained per training investment
const DIV_TRAIN_MORALE=5;    // morale gained per training investment
const DIV_SKILL0=0.40, DIV_MORALE0=60; // starting skill / morale
function divisionDef(id){ return DIVISIONS.find(d=>d.id===id); }
function divisionState(id){ const s=(state.divisions&&state.divisions[id])||{}; return {skill:s.skill!=null?s.skill:DIV_SKILL0, exp:s.exp||0, morale:s.morale!=null?s.morale:DIV_MORALE0}; }
function divisionForTrack(track){ const d=DIVISIONS.find(x=>x.tracks.includes(track)); return d?d.id:null; }
function divisionForResearch(r){ return r?divisionForTrack(r.track||'propulsion'):null; }
function divisionExpLevel(id){ return Math.min(1, divisionState(id).exp/DIV_EXP_FULL); }
function divisionQuality(id){ const s=divisionState(id); return Math.max(0, Math.min(1, 0.5*s.skill + 0.3*divisionExpLevel(id) + 0.2*(s.morale/100))); }
function divisionSpeedBonus(r){ const id=divisionForResearch(r); if(!id) return 0; return divisionQuality(id)*DIV_SPEED_MAX; }
function divisionTrainCost(id){ return round2(DIV_TRAIN_BASE*(1+divisionState(id).skill*4)); }

/* ===== #6 / R&D pillar — Research Partnerships =======================================
   Form a standing partnership with an external institution to accelerate one or more
   research TRACKS, in exchange for an upfront fee + ongoing monthly upkeep. A real
   strategic choice: a capped number of slots + the recurring cost mean you back only
   the tracks your program actually needs right now. Stacks additively (capped) with
   your engineers and Research Divisions on the active project's track. */
const PARTNERS = [
  {id:'university',    name:'University Aerospace Consortium', tracks:['structures','testing','guidance'], speed:0.18, setup:2.0, upkeep:0.08, minRep:30,  blurb:'Academic labs co-develop materials, test rigs and guidance — broad but modest acceleration.'},
  {id:'propulsion_lab',name:'National Propulsion Laboratory',  tracks:['propulsion','reuse'],              speed:0.30, setup:3.5, upkeep:0.14, minRep:70,  blurb:'A government engine lab — deep combustion and reusable-booster expertise.'},
  {id:'med_institute', name:'Aerospace Medical Institute',     tracks:['crew'],                            speed:0.32, setup:3.0, upkeep:0.12, minRep:95,  blurb:'Human-factors and life-support research for long-duration crews.'},
  {id:'planetary_sci', name:'Planetary Science Foundation',    tracks:['deepspace','refueling','science'], speed:0.24, setup:4.0, upkeep:0.15, minRep:130, blurb:'Trajectory science, ISRU chemistry and deep-space instrumentation.'},
  {id:'atomic',        name:'Atomic Energy Commission',        tracks:['nuclear'],                         speed:0.40, setup:6.0, upkeep:0.22, minRep:170, reqResearch:'deep_space', blurb:'Classified reactor work — the fast path through nuclear propulsion.'},
];
const PARTNERSHIP_CAP=3;       // simultaneous partnerships — you can't back every front at once
const PARTNER_SPEED_CAP=0.45;  // bound on the combined partner R&D-speed bonus for any one track
function partnerDef(id){ return PARTNERS.find(p=>p.id===id); }
function partnerActive(id){ return !!(state.partnerships && state.partnerships.indexOf(id)>=0); }
function partnerUnlocked(p){ if(!p) return false; if((state.rep||0)<p.minRep) return false; if(p.reqResearch && !(state.research&&state.research[p.reqResearch])) return false; return true; }
// fractional R&D-speed bonus a research node gets from active partnerships covering its track
function partnerSpeedBonus(r){ if(!r || !state.partnerships) return 0; const track=r.track||'propulsion'; let b=0;
  for(const id of state.partnerships){ const p=partnerDef(id); if(p && p.tracks.indexOf(track)>=0) b+=p.speed; }
  return Math.min(PARTNER_SPEED_CAP, b); }
function partnershipUpkeep(){ if(!state.partnerships) return 0; return round2(state.partnerships.reduce((a,id)=>{ const p=partnerDef(id); return a+(p?p.upkeep:0); },0)); }

/* ===== #89 — Tracking-station network (data model in data.js's TRACKING_STATIONS) ====================
   A hard requirement for new deep-space firsts (see needsTrackingNetwork/missionTechMet, data.js):
   build at least one of the three real DSN-analog sites to unlock them. Modeled directly on Research
   Partnerships just above (setup fee + ongoing upkeep, gated behind prerequisite research) but simpler:
   build-only for V1, no dissolve — decommissioning your only station would re-lock content that was
   flyable a moment ago, and there's no player-facing reason to want that yet.
   TRACKING_NETWORK_LIVE: the flag that actually turns the gate on. As of slice 2 (2026-07-17) the Map
   tab's Earth body-card carries the build panel (trackingPanelHTML, render.js), so the gate is now LIVE
   — a player who hits a locked deep-space mission has an in-game path to satisfy it. The flag is kept
   (rather than deleted) as a single kill-switch: flip to false to fully disable the requirement if a
   balance problem surfaces in playtest, without unwinding the wiring. Declared `let`, not `const` — the
   test suite flips it to exercise both gated and ungated branches, then restores it.
   NOTE: this was never run in a real browser (headless sandbox) — the marker cluster + build panel
   should get a real-browser eyeball before this is considered fully done (see ROADMAP.md #89 slice 2). */
let TRACKING_NETWORK_LIVE=true;
function stationDef(id){ return TRACKING_STATIONS.find(s=>s.id===id); }
function stationBuilt(id){ return !!(state.trackingStations && state.trackingStations.indexOf(id)>=0); }
function trackingStationCount(){ return (state.trackingStations||[]).length; }
function canBuildStation(id){
  const s=stationDef(id); if(!s) return {ok:false, why:'Unknown station.'};
  if(stationBuilt(id)) return {ok:false, why:'Already built.'};
  if(s.reqResearch && !(state.research && state.research[s.reqResearch])) return {ok:false, why:'Needs prerequisite research.'};
  if(state.money<s.setup) return {ok:false, why:'Not enough capital for the setup fee.'};
  return {ok:true, cost:s.setup};
}
function buildTrackingStation(id){
  const chk=canBuildStation(id); if(!chk.ok) return;
  const s=stationDef(id);
  state.money-=s.setup; state.trackingStations=state.trackingStations||[]; state.trackingStations.push(id);
  log('ok', `Tracking station built — ${s.name} (${fM(s.setup)} setup · −${fM(s.upkeep)}/mo). Deep-space missions are online.`);
  render();
}
function trackingUpkeep(){ return round2((state.trackingStations||[]).reduce((a,id)=>{ const s=stationDef(id); return a+(s?s.upkeep:0); },0)); }
function canFormPartnership(id){
  const p=partnerDef(id); if(!p) return {ok:false, why:'Unknown partner.'};
  if(partnerActive(id)) return {ok:false, why:'Already partnered.'};
  if(!partnerUnlocked(p)) return {ok:false, why:(state.rep||0)<p.minRep?`Needs ${p.minRep} reputation.`:'Needs prerequisite research.'};
  if((state.partnerships||[]).length>=PARTNERSHIP_CAP) return {ok:false, why:`At the ${PARTNERSHIP_CAP}-partnership limit — dissolve one first.`};
  if(state.money<p.setup) return {ok:false, why:'Not enough capital for the setup fee.'};
  return {ok:true, cost:p.setup};
}
function formPartnership(id){
  const chk=canFormPartnership(id); if(!chk.ok) return;
  const p=partnerDef(id); state.money-=p.setup; state.partnerships=state.partnerships||[]; state.partnerships.push(id);
  log('ok', `Partnership formed — ${p.name} (${fM(p.setup)} setup · −${fM(p.upkeep)}/mo). +${Math.round(p.speed*100)}% R&D speed on ${p.tracks.map(t=>(TRACKS.find(x=>x.key===t)||{}).label||t).join(', ')}.`);
  render();
}
function dissolvePartnership(id){
  if(!partnerActive(id)) return; const p=partnerDef(id);
  state.partnerships=state.partnerships.filter(x=>x!==id);
  log('note', `Partnership with ${p.name} dissolved — its upkeep ends.`);
  render();
}
function canTrainDivision(id){
  if(!divisionDef(id)) return {ok:false,why:'Unknown division.'};
  if(divisionState(id).skill>=1) return {ok:false,why:'Fully trained.'};
  if(state.money<divisionTrainCost(id)) return {ok:false,why:'Not enough capital.'};
  return {ok:true};
}
function trainDivision(id){
  const chk=canTrainDivision(id); if(!chk.ok) return;
  const cost=divisionTrainCost(id); state.money-=cost;
  if(!state.divisions) state.divisions={};
  const cur=divisionState(id);
  state.divisions[id]={skill:Math.min(1, cur.skill+DIV_TRAIN_SKILL), exp:cur.exp, morale:Math.min(100, cur.morale+DIV_TRAIN_MORALE)};
  log('ok',`${divisionDef(id).name} trained — skill now ${Math.round(state.divisions[id].skill*100)}% (−${fM(cost)}).`);
  render();
}
function divisionGainExp(r){ const id=divisionForResearch(r); if(!id) return; if(!state.divisions) state.divisions={}; const cur=divisionState(id); state.divisions[id]={skill:cur.skill, exp:cur.exp+1, morale:Math.min(100,cur.morale+2)}; }
function tickDivisionMorale(){
  if(!state.divisions) state.divisions={};
  const healthy=state.money>0;
  for(const d of DIVISIONS){ const cur=divisionState(d.id); const target=healthy?70:25; const m=cur.morale + Math.sign(target-cur.morale)*0.6;
    state.divisions[d.id]={skill:cur.skill, exp:cur.exp, morale:Math.max(0,Math.min(100, m))}; }
}
/* R&D epic slice 5: Breakthrough Events — the division-driven sibling of the #9
   personnel breakthroughs (extends, doesn't duplicate: the #9 one is staff/trait-
   driven, this one is the active project's covering DIVISION). A higher-quality
   division rolls breakthroughs more often; each shaves months off the active
   project and lifts the division's morale. Rate-limited by its own cooldown. */
const BREAK_BASE_CHANCE=0.03, BREAK_QUALITY_SCALE=0.14, BREAK_GAP=4;
const BREAK_PHRASE={
  propulsion:'cracked a stubborn combustion-stability problem',
  nuclear:'stabilised a troublesome reactor design',
  structures:'found a markedly lighter structural layout',
  testing:'caught a hidden failure mode on the test stand',
  guidance:'simplified a thorny guidance algorithm',
  crew:'made a life-support breakthrough',
  deepspace:'refined the trajectory and navigation math',
  refueling:'improved the propellant-transfer process',
  assembly:'streamlined the rendezvous-and-docking procedure',
};
function checkDivisionBreakthroughs(){
  state.breakthroughCooldown=(state.breakthroughCooldown||0)-1;
  if(state.breakthroughCooldown>0) return;
  const ar=state.activeResearch; if(!ar || ar.monthsLeft<=1) return;
  const r=RESEARCH.find(x=>x.id===ar.id); if(!r) return;
  const divId=divisionForResearch(r); if(!divId) return;
  const q=divisionQuality(divId);
  if(Math.random() > BREAK_BASE_CHANCE + q*BREAK_QUALITY_SCALE) return; // higher quality → more frequent
  state.breakthroughCooldown=BREAK_GAP;
  const shave=Math.min(ar.monthsLeft-1, q>0.6?2:1);
  ar.monthsLeft=Math.max(1, ar.monthsLeft-shave);
  if(!state.divisions) state.divisions={}; const cur=divisionState(divId);
  state.divisions[divId]={skill:cur.skill, exp:cur.exp, morale:Math.min(100,cur.morale+4)};
  state.rep+=2;
  const phrase=BREAK_PHRASE[r.track]||'had a research breakthrough';
  log('ok',`⚡ BREAKTHROUGH! The ${divisionDef(divId).name} ${phrase} — ${shave} month${shave>1?'s':''} shaved off ${r.name}. +2 rep.`);
}
/* ---------- #26: Experimental research failures ----------
   The negative sibling of Breakthrough Events. While a project runs, it can hit a
   setback (combustion instability, a buckled test article, a guidance defect…) that
   pauses progress and forces a call: fund an emergency fix (capital, no delay), rework
   it properly (a schedule slip), or push it through with the flaw unresolved (a lasting
   reliability penalty via relDebt). Division quality lowers the odds, and a cooldown
   rate-limits it — exactly like breakthroughs. _pendingSetback freezes the research tick
   until resolved; the modal reuses the #20 anomaly-decision pattern. */
const SETBACK_BASE_CHANCE=0.05, SETBACK_QUALITY_SCALE=0.05, SETBACK_MIN_CHANCE=0.015, SETBACK_GAP=6;
const SETBACK_DELAY_MIN=2, SETBACK_DELAY_MAX=4;
const SETBACK_REL_DEBT=0.03, SETBACK_REL_DEBT_CAP=0.09;
const SETBACK_PHRASE={
  propulsion:'combustion instability destroyed a prototype on the test stand',
  nuclear:'a reactor test scrammed and set the program back',
  structures:'a structural test article buckled under load',
  testing:'the test campaign uncovered a flaw that needs rework',
  guidance:'a guidance-software defect failed verification',
  crew:'a life-support loop failed its qualification run',
  deepspace:'a navigation-model error invalidated months of analysis',
  refueling:'a cryogenic-transfer test sprang a leak',
  assembly:'the docking mechanism jammed in rehearsal',
};
let _pendingSetback=null;          // a research project paused at a setback decision (transient, like _pendingOps)
let _setbackCooldown=SETBACK_GAP;  // rate-limiter, mirrors state.breakthroughCooldown
function checkResearchSetback(){
  if(_pendingSetback) return;
  _setbackCooldown=(_setbackCooldown||0)-1;
  if(_setbackCooldown>0) return;
  const ar=state.activeResearch; if(!ar || ar.monthsLeft<=1) return; // need remaining work to disrupt
  const r=RESEARCH.find(x=>x.id===ar.id); if(!r) return;
  const divId=divisionForResearch(r);
  const q=divId?divisionQuality(divId):0.3; // a covered project (a trained division) fails less; uncovered work sits at a middling baseline
  const chance=Math.max(SETBACK_MIN_CHANCE, SETBACK_BASE_CHANCE - q*SETBACK_QUALITY_SCALE);
  if(Math.random()>=chance) return;
  _setbackCooldown=SETBACK_GAP;
  const delay=SETBACK_DELAY_MIN+Math.floor(Math.random()*(SETBACK_DELAY_MAX-SETBACK_DELAY_MIN+1));
  const fundCost=round2(Math.max(0.6, rdCostOf(r)*0.4)); // CE3(a): setback-recovery scales with the doctrine-adjusted R&D price
  _pendingSetback={ rId:r.id, rName:r.name, divId, phrase:SETBACK_PHRASE[r.track]||'hit an unexpected setback', delay, fundCost };
  log('bad',`⚠ R&D SETBACK — ${r.name}: ${_pendingSetback.phrase}. A decision is needed.`);
}
function maybeShowSetback(){ if(_pendingSetback) showSetbackModal(); }
function showSetbackModal(){
  const s=_pendingSetback; if(!s) return;
  const fundOk=state.money>=s.fundCost;
  showModal(`<h2 style="color:var(--bad)">⚠ Research setback</h2>
    <p><b>${s.rName}</b> — ${s.phrase}.</p>
    <p class="muted">Progress is halted until you make a call.</p>
    <button class="btn" onclick="resolveSetback('fund')" ${fundOk?'':'disabled'} title="${fundOk?'':'Not enough capital'}">Fund an emergency fix — ${fM(s.fundCost)} <span class="dim">· no delay</span></button>
    <button class="btn ghost" style="margin-top:8px" onclick="resolveSetback('delay')">Rework it properly — +${s.delay} mo <span class="dim">· free</span></button>
    <button class="btn ghost" style="margin-top:8px" onclick="resolveSetback('ship')">Push it through as-is <span class="dim">· −${Math.round(SETBACK_REL_DEBT*100)}% reliability, permanent</span></button>`);
}
function resolveSetback(choice){
  const s=_pendingSetback; if(!s) return;
  const ar=state.activeResearch;
  if(!ar || ar.id!==s.rId){ _pendingSetback=null; hideModal(); render(); return; } // research ended underneath us — just clear
  if(choice==='fund'){
    if(state.money<s.fundCost) return; // guarded; button is disabled when unaffordable
    state.money-=s.fundCost;
    log('note',`Emergency funding cleared the ${s.rName} setback — no schedule slip.`);
  } else if(choice==='delay'){
    ar.monthsLeft+=s.delay;
    if(s.divId){ const cur=divisionState(s.divId); state.divisions=state.divisions||{}; state.divisions[s.divId]={skill:cur.skill,exp:cur.exp,morale:Math.max(0,cur.morale-3)}; }
    log('note',`${s.rName} reworked properly — +${s.delay} mo to the schedule.`);
  } else { // ship it degraded
    state.relDebt=Math.min(SETBACK_REL_DEBT_CAP,(state.relDebt||0)+SETBACK_REL_DEBT);
    state.rep=Math.max(0,state.rep-1);
    log('bad',`${s.rName} pushed through with the flaw unresolved — a lasting −${Math.round(relDebt()*100)}% reliability penalty on every vehicle.`);
  }
  _pendingSetback=null; hideModal();
  if(state.money<0) gameOver(); else render();
  maybeShowMishap(); // if a logistics mishap also came due this tick, surface it now that the setback is cleared
  maybeShowInquiry(); // then a pending failure inquiry (lowest precedence of the three)
  maybeShowHearing(); // then a pending budget hearing (E1.1, mutually exclusive with inquiry in practice)
}
/* ---------- 2.3: logistics route interruptions ----------
   A negative economy event (logi_mishap in ECONOMY_EVENTS, reqLogi-gated so it can only roll while
   a resupply shipment is actually in cruise) that threatens one randomly chosen in-transit shipment
   with a 20–45 day slip. The player decides: expedite (pay to hold the original arrival) or accept
   the delay for free. Mirrors _pendingSetback's transient pending-state + modal + resolve pattern;
   the slip is applied to the record's existing (persisted) arriveAbs only on 'accept', so no new
   persisted state and no SAVE_VERSION bump. */
const LOGI_MISHAP_DELAY_MIN=20, LOGI_MISHAP_DELAY_MAX=45;   // days added to the shipment's arrival on 'accept'
const LOGI_EXPEDITE_PER_MONTH=0.6;                          // expedite = fraction of a full month's resupply cost per 30 slip-days bought back
let _pendingLogiMishap=null;                                // a resupply shipment awaiting an expedite/accept decision (transient, like _pendingSetback)
// cost to hold the original schedule: scaled off the shipment's full (market-aware) resupply cost and the delay erased
function logiExpediteCost(facId, delay){ return round2(Math.max(0.4, resupplyCostFull(facId)*LOGI_EXPEDITE_PER_MONTH*(delay/30))); }
function triggerLogiMishap(inst){
  const flights=logiFlightsInTransit(); if(!flights.length) return; // reqLogi gate should guarantee ≥1; defensive
  const fl=flights[Math.floor(Math.random()*flights.length)];       // 2.3: exactly one shipment, picked at random
  const delay=LOGI_MISHAP_DELAY_MIN+Math.floor(Math.random()*(LOGI_MISHAP_DELAY_MAX-LOGI_MISHAP_DELAY_MIN+1));
  const def=facilityById(fl.facId);
  _pendingLogiMishap={ fltId:fl.id, facId:fl.facId, facName:def?def.name:'a facility', facIcon:def?def.icon:'📦',
    delay, expediteCost:logiExpediteCost(fl.facId, delay), blurb:inst.blurb };
  log('bad',`⚠ LOGISTICS MISHAP — ${_pendingLogiMishap.facIcon} ${_pendingLogiMishap.facName} resupply: ${inst.blurb} A decision is needed.`);
}
function maybeShowMishap(){ if(_pendingLogiMishap && !_pendingSetback) showMishapModal(); } // setback modal takes priority if both are pending
function showMishapModal(){
  const s=_pendingLogiMishap; if(!s) return;
  const payOk=state.money>=s.expediteCost;
  showModal(`<h2 style="color:var(--bad)">⚠ Resupply route interruption</h2>
    <p><b>${s.facIcon} ${s.facName}</b> — ${s.blurb}</p>
    <p class="muted">Its resupply shipment will arrive +${s.delay} days late unless you expedite it.</p>
    <button class="btn" onclick="resolveMishap('expedite')" ${payOk?'':'disabled'} title="${payOk?'':'Not enough capital'}">Expedite the shipment — ${fM(s.expediteCost)} <span class="dim">· holds its original arrival</span></button>
    <button class="btn ghost" style="margin-top:8px" onclick="resolveMishap('accept')">Accept the delay — +${s.delay} d <span class="dim">· free</span></button>`);
}
function resolveMishap(choice){
  const s=_pendingLogiMishap; if(!s) return;
  const fl=(state.activeFlights||[]).find(f=>f&&f.id===s.fltId);
  if(!fl){ _pendingLogiMishap=null; hideModal(); render(); return; } // shipment arrived/removed underneath us — nothing to delay
  const def=facilityById(s.facId);
  if(choice==='expedite'){
    if(state.money<s.expediteCost) return; // guarded; the button is disabled when unaffordable
    state.money-=s.expediteCost;
    log('note',`${def?def.icon+' '+def.name:'Facility'} resupply expedited — the shipment holds its original arrival (−${fM(s.expediteCost)}).`);
  } else { // accept the delay
    fl.arriveAbs=(fl.arriveAbs||0)+s.delay;
    log('bad',`${def?def.icon+' '+def.name:'Facility'} resupply delayed +${s.delay} d — arrival pushed back; the base draws down further before it lands.`);
  }
  _pendingLogiMishap=null; hideModal();
  if(state.money<0) gameOver(); else render();
  maybeShowInquiry(); // if a failure inquiry is also pending, surface it now that the mishap is cleared
  maybeShowHearing(); // then a pending budget hearing (E1.1)
}
/* ---------- P3: failure investigation loop ----------
   After an UNCREWED loss/abort/strand finalizes, offer a funded inquiry that converts the failure
   into a reward keyed on WHAT failed. Reuses the _pendingSetback / _pendingLogiMishap transient
   pending-state + fund/decline modal shape. Precedence: setback > mishap > inquiry (this is the
   third pending-decision type; maybeShowInquiry defers to the other two, and both resolve* paths
   chain into it). state.inquiryCredit is the ONE persisted addition (SAVE_VERSION 42→43). */
const INQUIRY_COST_FRAC=0.3, INQUIRY_COST_FLOOR=0.6; // fund cost = max(FLOOR, FRAC × the lost flight's outlay) — mirrors the setback's max(0.6, 0.4×rdCostOf)
const INQUIRY_REL=0.02, INQUIRY_FLIGHTS=3;           // ascent/staging reward: +2% additive R (like familyRelBonus), gated to the failed subsystem, over 3 flights
const INQUIRY_SCI_BONUS=10;                           // deep-phase reward: flat science windfall (~1.5× a base deep mission's ~5-7⚛ yield, above SCI_RUSH_BASE=6)
// E1.7: space telescope standing program — term length, base monthly yield, and instrument-aging
// parameters. Base yield is deliberately modest (a fraction of INQUIRY_SCI_BONUS per month) since
// it compounds over the whole term rather than paying out once.
const TELESCOPE_TERM=60;          // months (5 years) before the program needs re-flying
const TELESCOPE_SCI_BASE=2;       // ⚛/month baseline drip
const TELESCOPE_HEALTH_DRAIN=1.2; // instrument wear per month absent a fault (slow — faults are the real driver)
const TELESCOPE_DISCOVERY_CHANCE=0.06; // per-month roll while the program is active
const TELESCOPE_FAULT_SHARE=0.35; // of discovery rolls, the fraction that are a fault (rest are windfalls)
const TELESCOPE_WINDFALL_SCI=8;   // flat bonus on a windfall roll
const TELESCOPE_FAULT_HEALTH=25;  // health lost if a fault is declined
const TELESCOPE_REPAIR_COST_FRAC=0.02; // fraction of current capital, floor below
const TELESCOPE_REPAIR_COST_FLOOR=0.4; // $M — mirrors INQUIRY_COST_FLOOR's max(floor, frac×basis) shape
let _pendingInquiry=null;                             // an uncrewed loss awaiting a fund/decline inquiry decision (transient, like _pendingSetback)
// ascent/staging subsystems → reliability credit; deep-phase (deep_propulsion / life_support) → science grant
function inquiryRewardKind(subKey){ return SUBSYS_PHASE[subKey]==='deep' ? 'science' : 'reliability'; }
function triggerInquiry(ctx, outcome){
  if(_pendingInquiry) return;                         // one inquiry decision at a time
  const sub=outcome&&outcome.subsystem; if(!sub) return; // no subsystem attribution → nothing to investigate
  const cost=round2(Math.max(INQUIRY_COST_FLOOR, INQUIRY_COST_FRAC*(ctx.flightExpense||0)));
  _pendingInquiry={ mName:ctx.m.name, subsystem:sub, subLabel:SUBSYS_LABEL[sub]||'systems', reward:inquiryRewardKind(sub), cost };
  log('bad',`⚠ FAILURE INQUIRY — ${ctx.m.name}: the ${(SUBSYS_LABEL[sub]||'systems').toLowerCase()} loss can be formally investigated. A decision is needed.`);
}
function maybeShowInquiry(){ if(_pendingInquiry && !_pendingSetback && !_pendingLogiMishap) showInquiryModal(); } // setback + mishap take priority if any coexist
function showInquiryModal(){
  const s=_pendingInquiry; if(!s) return;
  const fundOk=state.money>=s.cost;
  const rewardTxt = s.reward==='science'
    ? `+${INQUIRY_SCI_BONUS}⚛ science`
    : `+${Math.round(INQUIRY_REL*100)}% ${s.subLabel.toLowerCase()} reliability · next ${INQUIRY_FLIGHTS} flights`;
  showModal(`<h2 style="color:var(--bad)">⚠ Failure inquiry</h2>
    <p><b>${s.mName}</b> — the loss traced to the ${s.subLabel.toLowerCase()}.</p>
    <p class="muted">A funded inquiry turns this failure into hard data.</p>
    <button class="btn" onclick="resolveInquiry('fund')" ${fundOk?'':'disabled'} title="${fundOk?'':'Not enough capital'}">Fund the inquiry — ${fM(s.cost)} <span class="dim">· ${rewardTxt}</span></button>
    <button class="btn ghost" style="margin-top:8px" onclick="resolveInquiry('decline')">Move on <span class="dim">· free, no findings</span></button>`);
}
function resolveInquiry(choice){
  const s=_pendingInquiry; if(!s) return;
  if(choice==='fund'){
    if(state.money<s.cost) return; // guarded; the button is disabled when unaffordable
    state.money-=s.cost;
    if(s.reward==='science'){
      state.science=round2((state.science||0)+INQUIRY_SCI_BONUS);
      log('ok',`Inquiry into the ${s.subLabel.toLowerCase()} failure banked +${INQUIRY_SCI_BONUS}⚛ of deep-space engineering data.`);
    } else {
      state.inquiryCredit={ subsystem:s.subsystem, rel:INQUIRY_REL, flights:INQUIRY_FLIGHTS }; // REPLACES any prior unused credit — no stacking
      log('ok',`Inquiry into the ${s.subLabel.toLowerCase()} failure yields a fix — +${Math.round(INQUIRY_REL*100)}% ${s.subLabel.toLowerCase()} reliability on the next ${INQUIRY_FLIGHTS} flights that fly it.`);
    }
  } else {
    log('note',`No inquiry funded — the ${s.mName} loss goes on the books without a formal review.`);
  }
  _pendingInquiry=null; hideModal();
  if(state.money<0) gameOver(); else render();
}
/* ---------- #81: Sample-return disposition — bank vs sell ----------
   Every sciMission (space_telescope, sample_return, astrobiology, oort_precursor) used to bank a fixed
   sciYield windfall automatically on its first flight. This turns that windfall into a real choice,
   reusing the inquiry fund/decline modal shape: bank it (unchanged outcome — the windfall, computed with
   the same sciYieldMult/doctrineMult multipliers as before) or sell it (convert the same windfall into
   money at SCI_SELL_RATE). The baseline per-flight sciGain (present on every successful flight) is
   untouched either way — this only affects the prestige bonus. Gated identically to the line it replaces:
   first flight only, not routine, not procedural (the Deep-Space Sample Return contract carries no
   sciYield at all, by design — see its comment in data.js). */
const SCI_SELL_RATE=0.5; // $M per ⚛ if sold instead of banked — a first-pass number, not a final balance
                          // call: it roughly matches/beats a mission's own payout early (sample_return:
                          // 42⚛→$21M vs its $14M payout) and fades to irrelevant late (oort_precursor:
                          // 120⚛→$60M vs its own $1800M payout), so selling is tempting early, banking
                          // wins naturally once money stops being the bottleneck.
let _pendingSampleDecision=null; // a prestige science-mission windfall awaiting a bank/sell decision (transient, like _pendingInquiry)
function triggerSampleDecision(m, sciAmount){
  if(_pendingSampleDecision){ // one at a time — extremely rare (two prestige flights resolving the same
    // tick via deferred arrivals); auto-bank rather than silently losing the second windfall or clobbering
    // the pending one.
    state.science=round2((state.science||0)+sciAmount);
    log('note',`${m.name}: sample data auto-banked (+${sciAmount} ⚛) — another disposition decision was already pending.`);
    return;
  }
  _pendingSampleDecision={ mName:m.name, sciAmount, moneyAmount:round2(sciAmount*SCI_SELL_RATE) };
  log('note',`🧪 SAMPLE RETURNED — ${m.name}: bank it for research or license it commercially. A decision is needed.`);
}
function maybeShowSampleDecision(){ if(_pendingSampleDecision && !_pendingSetback && !_pendingLogiMishap && !_pendingInquiry && !_pendingHearing && !_pendingRivalDisaster) showSampleDecisionModal(); } // lowest precedence — good news, not a crisis
function showSampleDecisionModal(){
  const s=_pendingSampleDecision; if(!s) return;
  showModal(`<h2 style="color:var(--readout)">🧪 Sample returned</h2>
    <p><b>${s.mName}</b> brought material/data home — what happens to it?</p>
    <button class="btn" onclick="resolveSampleDecision('bank')">Bank for research <span class="dim">· +${s.sciAmount} ⚛</span></button>
    <button class="btn ghost" style="margin-top:8px" onclick="resolveSampleDecision('sell')">License commercially <span class="dim">· +${fM(s.moneyAmount)}, no science</span></button>`);
}
function resolveSampleDecision(choice){
  const s=_pendingSampleDecision; if(!s) return;
  if(choice==='sell'){
    state.money+=s.moneyAmount;
    log('ok',`${s.mName}: sample licensed to industry — +${fM(s.moneyAmount)}, no science banked.`);
  } else {
    state.science=round2((state.science||0)+s.sciAmount);
    log('ok',`${s.mName}: sample banked for research — +${s.sciAmount} ⚛.`);
  }
  _pendingSampleDecision=null; hideModal();
  if(state.money<0) gameOver(); else render();
}
/* ---------- E1.7: space telescope standing program ----------
   Reuses two proven shapes rather than inventing new ones: the passive-contract tick/expiry loop
   (steady monthly drip, ages out) for the routine case, and the inquiry fund/decline decision for
   the occasional-event case (an instrument fault, needing a call). One program slot — seeded on a
   successful Orbital Observatory flight (see finish() above). */
let _pendingDiscovery=null; // an instrument fault awaiting a fund/decline repair decision (transient, like _pendingInquiry)
function tickScienceProgram(){
  const sp=state.scienceProgram; if(!sp) return;
  state.science=round2((state.science||0)+sp.sciPerMonth);
  sp.monthsLeft--; sp.health=Math.max(0,sp.health-TELESCOPE_HEALTH_DRAIN);
  if(Math.random()<TELESCOPE_DISCOVERY_CHANCE) triggerDiscovery();
  if(sp.monthsLeft<=0){
    log('note','🔭 The Orbital Observatory has completed its program term — re-fly the mission to stand up a new one.');
    state.scienceProgram=null;
  } else if(sp.health<=0){
    log('bad','🔭 The Orbital Observatory has failed beyond repair — the program ends.');
    state.scienceProgram=null;
  }
}
function triggerDiscovery(){
  if(_pendingDiscovery || !state.scienceProgram) return; // one discovery decision at a time
  const isFault=Math.random()<TELESCOPE_FAULT_SHARE;
  if(isFault){
    const cost=round2(Math.max(TELESCOPE_REPAIR_COST_FLOOR, TELESCOPE_REPAIR_COST_FRAC*state.money));
    _pendingDiscovery={kind:'fault', cost};
    log('bad','⚠ Orbital Observatory: an instrument fault needs a decision.');
  } else {
    // windfalls pay out immediately — no decision needed, just the good news
    state.science=round2((state.science||0)+TELESCOPE_WINDFALL_SCI);
    log('ok',`🔭 Orbital Observatory discovery — an unplanned windfall banks +${TELESCOPE_WINDFALL_SCI}⚛ science.`);
  }
}
function maybeShowDiscovery(){ if(_pendingDiscovery && !_pendingSetback && !_pendingLogiMishap && !_pendingInquiry && !_pendingHearing && !_pendingRivalDisaster) showDiscoveryModal(); } // lowest precedence — the others are time-critical crises, this is routine upkeep
function showDiscoveryModal(){
  const s=_pendingDiscovery; if(!s) return;
  const fundOk=state.money>=s.cost;
  showModal(`<h2 style="color:var(--warn)">🔭 Instrument fault</h2>
    <p>The Orbital Observatory has developed a fault. Left unrepaired, the instrument keeps degrading.</p>
    <button class="btn" onclick="resolveDiscovery('fund')" ${fundOk?'':'disabled'} title="${fundOk?'':'Not enough capital'}">Fund the repair — ${fM(s.cost)} <span class="dim">· health restored</span></button>
    <button class="btn ghost" style="margin-top:8px" onclick="resolveDiscovery('decline')">Leave it <span class="dim">· −${TELESCOPE_FAULT_HEALTH} health</span></button>`);
}
function resolveDiscovery(choice){
  const s=_pendingDiscovery; if(!s) return;
  const sp=state.scienceProgram;
  if(choice==='fund' && sp){
    if(state.money<s.cost) return; // guarded; button disabled when unaffordable
    state.money-=s.cost; sp.health=100;
    log('ok','Orbital Observatory fault repaired — the instrument is back to full health.');
  } else if(sp){
    sp.health=Math.max(0,sp.health-TELESCOPE_FAULT_HEALTH);
    log('note',`No repair funded — Orbital Observatory health down to ${Math.round(sp.health)}%.`);
    if(sp.health<=0){ log('bad','🔭 The Orbital Observatory has failed beyond repair — the program ends.'); state.scienceProgram=null; }
  }
  _pendingDiscovery=null; hideModal();
  if(state.money<0) gameOver(); else render();
}
/* ---------- E1.1: budget hearing after a fatal crewed loss ----------
   The inquiry above is the ENGINEERING response to an uncrewed failure; this is the POLITICAL
   response to a crewed one (catastrophe or strand) — the case P3's own comment explicitly left
   untouched ("crewed catastrophes keep their existing grounding narration"). Same transient
   pending-decision shape as _pendingSetback/_pendingInquiry; mutually exclusive with inquiry in
   practice (a flight is either crewed or not), but gated behind the same higher-priority pendings
   for consistency. No persisted state beyond the transient. */
const HEARING_FUND_COST=2.0, HEARING_SUPPORT_FUND=6, HEARING_SUPPORT_DEFEND=3, HEARING_SUPPORT_BLAME=4;
const HEARING_REP_COST_DEFEND=3, HEARING_MORALE_HIT_BLAME=8, HEARING_POACH_HEAT_BLAME=9;
let _pendingHearing=null; // a fatal crewed loss awaiting a fund/defend/blame decision (transient, like _pendingInquiry)
function hearingFundCost(){ return round2(HEARING_FUND_COST*(1+eraStakesFrac())); } // later eras draw bigger scrutiny, same spirit as applyEraStakes
function triggerHearing(ctx){
  if(_pendingHearing) return; // one at a time
  // Slice B: an ascent crewed loss files a 'disaster' front page immediately before this call
  // (the strand branch does not) — capture that exact entry so the hearing modal can lead with the
  // Agency Wire disaster edition. Match kind+headline+month so a strand hearing (or a stale wire top)
  // never surfaces an unrelated front page.
  const fp=frontPages()[0];
  const disasterFP=(fp && fp.kind==='disaster' && fp.abs===absMonth() && fp.headline===ctx.m.name+': crew lost') ? fp : null;
  _pendingHearing={ mName:ctx.m.name, frontPage:disasterFP };
  log('bad',`⚠ BUDGET HEARING — ${ctx.m.name}: the fatal loss draws government scrutiny. A decision is needed.`);
}
function maybeShowHearing(){ if(_pendingHearing && !_pendingSetback && !_pendingLogiMishap && !_pendingInquiry) showHearingModal(); } // setback/mishap/inquiry take priority
function showHearingModal(){
  const s=_pendingHearing; if(!s) return;
  const cost=hearingFundCost(), fundOk=state.money>=cost;
  showModal(`${s.frontPage?frontPageHTML(s.frontPage, true)+'<div style="height:14px"></div>':''}<h2 style="color:var(--bad)">⚠ Budget hearing</h2>
    <p><b>${esc(s.mName)}</b> — a fatal loss draws a program review. How do you play it?</p>
    <button class="btn" onclick="resolveHearing('fund')" ${fundOk?'':'disabled'} title="${fundOk?'':'Not enough capital'}">Fund a safety program — ${fM(cost)} <span class="dim">· +${HEARING_SUPPORT_FUND} support</span></button>
    <button class="btn ghost" style="margin-top:8px" onclick="resolveHearing('defend')">Defend the program's record <span class="dim">· free, −${HEARING_REP_COST_DEFEND} rep, +${HEARING_SUPPORT_DEFEND} support</span></button>
    <button class="btn ghost" style="margin-top:8px" onclick="resolveHearing('blame')">Blame the vendor <span class="dim">· free, +${HEARING_SUPPORT_BLAME} support, staff morale hit</span></button>`, s.frontPage?'newspaper':undefined);
}
function resolveHearing(choice){
  const s=_pendingHearing; if(!s) return;
  if(choice==='fund'){
    const cost=hearingFundCost(); if(state.money<cost) return; // guarded; button disabled when unaffordable
    state.money-=cost; addSupport(HEARING_SUPPORT_FUND);
    log('ok',`Budget hearing: funded a safety program after the ${s.mName} loss. −${fM(cost)}, +${HEARING_SUPPORT_FUND} support.`);
  } else if(choice==='defend'){
    state.rep=Math.max(0,state.rep-HEARING_REP_COST_DEFEND); addSupport(HEARING_SUPPORT_DEFEND);
    log('note',`Budget hearing: you defended the program's record. −${HEARING_REP_COST_DEFEND} rep, +${HEARING_SUPPORT_DEFEND} support.`);
  } else { // blame
    addSupport(HEARING_SUPPORT_BLAME);
    (state.staff||[]).forEach(st=>{ st.morale=clampA((st.morale||50)-HEARING_MORALE_HIT_BLAME,0,100); });
    state.poachHeat=Math.max(state.poachHeat||0, HEARING_POACH_HEAT_BLAME); // spin over substance leaves staff rattled — rivals notice more than usual
    log('bad',`Budget hearing: you blamed the vendor. +${HEARING_SUPPORT_BLAME} support, but staff morale takes a hit — and it shows.`);
  }
  _pendingHearing=null; hideModal();
  if(state.money<0) gameOver(); else render();
}
// Time Granularity epic — the simulation funnel iterates DAYS, not months. Each day runs the
// CONTINUOUS flows in `tickContinuousDay()` (slice 2: overhead, payroll, Belt royalty; slice 3a:
// public-support revert, gov funding, R&D progress; slice 3b: facility production payout) at
// perDay() strength; the discrete MONTHLY block (markets, facility supply/starvation bookkeeping,
// build queue, morale/attrition, events, rivals, snapshots) fires only when a whole month completes.
// Whole-month behaviour stays balance-preserving: 30·perDay(x)=x, and support reverts at the exact
// geometric day-rate that compounds to SUPPORT_REVERT/mo, so the monthly aggregates match the old
// economy within float ε (R&D/funding/facility output now read morale/support/supply a drift-step
// earlier within the month — a deliberately tiny shift, this being the day-resolution retune slice).
// The whole money economy now flows daily. Still monthly-gated (genuinely month-quantized concepts):
// supply drain + starvation/abandon counters, morale drift, market RNG walks, build/event cadence.
const DAYS_PER_MONTH=30; // abstracted flat 30-day month — keeps absMonth()/synodic/pad-cadence math exact
const SUPPORT_REVERT_DAY = 1 - Math.pow(1-SUPPORT_REVERT, 1/DAYS_PER_MONTH); // per-day rate that compounds to SUPPORT_REVERT over a month
function perDay(monthlyRate){ return monthlyRate/DAYS_PER_MONTH; } // a monthly rate spread across the month
function daysFor(months){ return Math.round(months*DAYS_PER_MONTH); } // a duration in months → whole days
function absDay(){ return absMonth()*DAYS_PER_MONTH + (state.day||0); }
// format a fractional month-count as a human countdown — e.g. 2.9 → "2 mo 27 d", 0.4 → "12 d", 1 → "1 mo".
// Days round UP so the readout counts down to completion (… "1 mo 1 d" → "1 mo" → "29 d" …).
function fmtTimeLeft(months){
  const totalDays=Math.max(0, Math.ceil((months||0)*DAYS_PER_MONTH));
  const mo=Math.floor(totalDays/DAYS_PER_MONTH), d=totalDays%DAYS_PER_MONTH;
  if(mo<=0) return d+' d';
  if(d<=0) return mo+' mo';
  return mo+' mo '+d+' d';
}
function advance(months){ advanceDays(daysFor(months)); }
function advanceDays(days){
  for(let i=0; i<days; i++){
    state.day=(state.day||0)+1;
    const monthEnd = state.day>=DAYS_PER_MONTH;
    if(monthEnd){ state.day=0; state.month++; if(state.month>11){state.month=0;state.year++;} } // a month completed
    tickContinuousDay();              // per-day money flows (overhead, payroll, royalty)
    if(monthEnd) tickMonthlyBoundary(); // discrete monthly subsystems — same order as the old tick
  }
  if(state.money<0 && !state.over){ gameOver(); }
  if(!state.over){ pumpFlightArrivals(); autosave(); ringAutosave(); } // P1 1.2a: resolve arrivals; S1: fast localStorage autosave (throttled); E0.2 Slice B: coarse IndexedDB autosave ring (month+3min cadence, idle-deferred)
}
// the smooth daily flows — inputs are stable within a month, so 30 days sum to the monthly total.
function tickContinuousDay(){
  state.money-=perDay(Math.max(0,diff().overhead+econOverheadAdd()+productionUpkeep()+empireOpex()+loanInterest()+partnershipUpkeep()+trackingUpkeep())); // overhead (difficulty + market events + #7 production upkeep + CE4(a) empire carrying cost + CE4(c) bridge-loan interest + #6 research-partnership upkeep + #89 tracking-station upkeep)
  if(state.pgmRoyalty>0) state.money+=perDay(state.pgmRoyalty); // M7: platinum-group royalties from an established Belt claim
  state.staff.forEach(s=>{ const p=personById(s.id); if(p) state.money-=perDay(p.salary); }); // M6: personnel salary
  { const rate=publicSupport()>SUPPORT_BASE ? SUPPORT_REVERT_DAY*0.5 : SUPPORT_REVERT_DAY; // earned goodwill fades half as fast as bad blood heals
    state.publicSupport=clampA(publicSupport()+(SUPPORT_BASE-publicSupport())*rate, SUPPORT_MIN, SUPPORT_MAX); } // #8: mood reverts toward neutral
  state.money+=perDay(govMonthlyFunding()); // #8: public support buys government funding (slice 3a: accrues daily)
  if(state.activeResearch && !_pendingSetback){ // #26: R&D progresses daily; a pending setback freezes it
    const _rdNode=RESEARCH.find(r=>r.id===state.activeResearch.id);
    const rdBonus=engRdSpeedBonus()+stationRdSpeedBonus()+divisionSpeedBonus(_rdNode)+partnerSpeedBonus(_rdNode)+sciStaffRdBonus(); // #6: research partnerships accelerate their track; orbital labs add station R&D speed; science staff add R&D speed
    state.activeResearch.monthsLeft-=perDay(1+rdBonus); // rate reads (monthly-drifting) morale — stable within a month
    if(state.activeResearch.monthsLeft<=0) completeResearch();
  }
  // M17: persistent facilities produce daily (slice 3b). The supply factor is stable within a month —
  // supply drain + starvation/abandon bookkeeping stay on the monthly boundary. Accumulate raw (no
  // per-day round2 — rounding tiny daily fuel/sci increments would inflate the monthly total).
  for(const fid in (state.facilities||{})){
    if(!facilityBuilt(fid)) continue;
    const factor=facilitySupplyFactor(fid), pr=facilityProduction(facilityById(fid), facilityState(fid));
    state.money+=perDay(pr.income*factor); state.rep+=perDay(pr.rep*factor);
    if(pr.fuel>0) state.depot+=perDay(pr.fuel*factor);
    if(pr.sci>0) state.science=(state.science||0)+perDay(pr.sci*factor);
  }
  tickBuildQueue(); // #7 final: progress queued vehicle builds (slice 3c: per-day); finished ones go to the hangar
}
// the monthly subsystem tick — the original advance() body minus the now-continuous flows (≈22
// subsystems), fired once per completed month instead of per loop iteration.
function tickMonthlyBoundary(){
    tickPassiveContracts(); // passive-income contracts pay monthly, then age toward expiry/cooldown
    tickScienceProgram(); // E1.7: space telescope standing program — monthly drip + discovery-event roll
    for(const fid in (state.facilities||{})){ // M17: facility bookkeeping — supply drain + starvation/abandon (production payout is now the daily flow in tickContinuousDay)
      if(!facilityBuilt(fid)) continue;
      const fdef=facilityById(fid), fst=facilityState(fid);
      fst.supply=Math.max(0,(fst.supply!=null?fst.supply:FAC_SUPPLY_MONTHS)-facilitySupplyDrain(fid)); // CE4(b): consume a month of provisions
      if(fst.autoResupply && facilitySupply(fid)<=AUTO_RESUPPLY_THRESHOLD && canResupply(fid).ok){ // 2.4: auto-reorder — same gate/cost/lifecycle as a manual click; canResupply blocks a second order in transit + the money-gate
        log('note',`${fdef.icon} ${fdef.name}: auto-resupply triggered — supply at ${facilitySupplyMonths(fid)} mo of provisions.`);
        resupplyFacility(fid); // instant (LEO/Moon) tops fst.supply back to full before the starvation check below; Mars launches a shipment and keeps draining
      }
      if(fst.supply<=0){ // CE4(b): an unsupplied crewed outpost decays — rep/politics bleed, then crew evacuate a module
        fst.starvedMonths=(fst.starvedMonths||0)+1;
        state.rep=Math.max(0, state.rep-FAC_STARVE_REP);
        state.publicSupport=clampA(publicSupport()-FAC_STARVE_SUPPORT, SUPPORT_MIN, SUPPORT_MAX);
        if(fst.starvedMonths===1) log('bad',`${fdef.icon} ${fdef.name} has run out of supplies — the crew are on emergency reserves. Resupply now or you'll start losing modules.`);
        if(fst.starvedMonths>=FAC_STARVE_ABANDON_MONTHS){
          fst.starvedMonths=0;
          if((fst.modules||1)>1){ fst.modules-=1; log('bad',`${fdef.icon} ${fdef.name}: a module was evacuated and mothballed — capacity cut to ${fst.modules}. Resupply to halt the decline.`); }
          else { fst.built=false; log('bad',`${fdef.icon} ${fdef.name} was abandoned — the outpost is lost. Re-establish it to return.`); }
        }
      } else if(fst.starvedMonths){ fst.starvedMonths=0; }
    }
    tickStationOperations();
    state.depot=round2(state.depot); state.science=round2(state.science||0); state.rep=round2(state.rep); // tidy the daily facility accruals (depot/science/rep) once a month
    // M2: LEO propellant price — mean-reverting random walk, plus buyer-order countdown
    state.fuelPrevPrice=state.fuelPrice;
    state.fuelPrice=clampA(round2(state.fuelPrice+(FUEL_BASE-state.fuelPrice)*0.12+(Math.random()-0.5)*0.05), FUEL_MIN, FUEL_MAX);
    if(state.fuelBuyer){ state.fuelBuyer.monthsLeft--; if(state.fuelBuyer.monthsLeft<=0 || state.fuelBuyer.cap<=0){ log('note',`Market — ${state.fuelBuyer.name}'s propellant buy order has closed.`); state.fuelBuyer=null; } }
    // #7 slice 6: raw-material spot prices wander; active contracts tick toward expiry
    materialPriceTick();
    checkJuggernaut(); tickStandingProduction(); // CE2(c): juggernaut milestone + standing self-funding production line

    // M6: morale tick — slow drift toward 50 and commend cooldown
    state.staff.forEach(s=>{
      if(s.morale>50) s.morale=Math.max(50,s.morale-1);
      else if(s.morale<50) s.morale=Math.min(50,s.morale+1);
      if(s.commendCooldown>0) s.commendCooldown--;
    });
    accrueStaffXp(); // #19 slice B: career progression — banked monthly, accelerated by dept training

    // M6: attrition — personnel quit after sustained low morale
    state.staff=state.staff.filter(s=>{
      if(s.morale<20){ s.lowMoraleMonths=(s.lowMoraleMonths||0)+1; }
      else{ s.lowMoraleMonths=0; }
      if(s.lowMoraleMonths>=MORALE_QUIT_MONTHS){
        const p=personById(s.id);
        if(state.assignedAstronaut===s.id) state.assignedAstronaut=null;
        log('bad',`${p?p.name:'A staff member'} quit due to low morale.`);
        return false;
      }
      return true;    });
    reconcileDeptLeads(); // #19 slice C: a lead who quit is succeeded by the best remaining member

    // #4 division: morale drift toward baseline (R&D progress itself is now a continuous daily flow)
    tickDivisionMorale();

    // #18 (Home): snapshot this month's recurring cashflow for the ops-summary panel
    const mRev=round2(totalFacilityIncome()+(state.pgmRoyalty>0?state.pgmRoyalty:0)+govMonthlyFunding()+passiveMonthlyIncome());
    const mExp=round2(Math.max(0,diff().overhead+econOverheadAdd()+productionUpkeep()+empireOpex()+loanInterest()+partnershipUpkeep()+trackingUpkeep())+monthlyPayroll());
    state.lastMonth={revenue:mRev, expenses:mExp, net:round2(mRev-mExp), flights:0};
    // Economy tension: warn (once per threshold crossing) when the runway gets short.
    const rw=runwayMonths();
    if(rw<=6 && state._runwayWarned!==6){ state._runwayWarned=6; timeInterrupt(); log('bad',`⚠ Treasury critical — about ${Math.max(1,Math.round(rw))} months of runway at current burn. Fly something, sign a contract, or cut payroll.`); }
    else if(rw<=12 && rw>6 && state._runwayWarned!==12){ state._runwayWarned=12; log('note',`Treasury warning — roughly ${Math.round(rw)} months of runway at current burn.`); }
    else if(rw>18 && state._runwayWarned){ state._runwayWarned=null; }

    tickRivals(); // CE1: rival agents (budget + reactive momentum) — replaces calendar-only firing
    tickPoachHeat(); // E1.1: decay the post-fatal-loss poach-heat window
    checkPoaching();
    checkPersonnelEvents();
    checkDivisionBreakthroughs(); // #5: division-driven R&D breakthroughs (sibling of #9)
    checkResearchSetback(); // #26: experimental research failures (negative sibling of breakthroughs)
    checkEvents();
    tickMandate(); // mandates: offer / deadline check (economy tension pass)
    checkScoringDate(); // chronicle: the soft scoring date fires once
    tickSpecialContract(); // special contracts: limited-time commercial variants
    tickContractOffers(); // E1.3: procedural filler contracts — era + capability keyed
    tickRivalSnatch(); // E1.1: a surging rival may bid on an uncommitted procedural contract offer
    tickCrisis(); // P11: the one late-game crisis — trigger check, then escalate/remediate if active
    tryStartQueuedResearch(); // I5: retry monthly in case the queued pick just became affordable/unlocked (the immediate try lives in completeResearch)
    pushMetricHistory(); // #28: snapshot this month's core metrics for the dashboard sparklines
}
// #28: append the current core-metric values to their trend buffers (capped at METRIC_HISTORY_LEN).
function pushMetricHistory(){
  if(!state.metricHist) state.metricHist=defaultMetricHist();
  const h=state.metricHist;
  const push=(key,v)=>{ if(!Array.isArray(h[key])) h[key]=[]; h[key].push(round2(v)); if(h[key].length>METRIC_HISTORY_LEN) h[key].splice(0, h[key].length-METRIC_HISTORY_LEN); };
  push('money', state.money);
  push('rep', state.rep);
  push('support', publicSupport());
  const lm=state.lastMonth||{revenue:0,expenses:0,net:0}; // Finances tab: recurring monthly flow history
  push('revenue', lm.revenue||0); push('expenses', lm.expenses||0); push('net', lm.net||0);
  push('success', state.flights>0 ? 100*state.successes/state.flights : 0);
  push('science', state.science||0);
}


/* ---------- Milestone "FIRST!" celebrations (KSP-style fanfare with the space-race angle) ----------
   Fires once per first-time mission completion. Frames the achievement against the rival
   timeline: did you beat them to it, match them, or arrive after being scooped? */
function rivalRaceLine(missionId){
  for(const r of RIVALS){
    const f=(r.firsts||[]).find(x=>x.missionId===missionId);
    if(!f) continue;
    const claimed=!!state.rivalFired[r.id+'|'+f.name];
    if(claimed) return `<span style="color:var(--muted)">${r.name} got there first (${f.year}) — but flying it yourself is what builds an agency.</span>`;
    const margin=f.year-state.year;
    if(margin>0) return `<span style="color:var(--ok)">You beat ${r.name} to it by ~${margin} year${margin===1?'':'s'}. The history books will remember.</span>`;
    return `<span style="color:var(--ok)">You edged out ${r.name} — they were months away.</span>`;
  }
  return '';
}
function showMilestoneModal(m, payout, rep){
  const race=rivalRaceLine(m.id);
  const hist=(m.blurb||'').match(/<span class="hist">([\s\S]*?)<\/span>/);
  pushFrontPage('milestone', '✦', m.name, race.replace(/<[^>]+>/g,''));
  // shared payout/rep summary strip (identical in both the compact and front-page layouts)
  const strip=`<div style="display:flex;gap:14px;justify-content:center;font-family:var(--mono);font-size:13px;margin:12px 0">
      <span style="color:var(--ok)">+${fM(payout)}</span><span style="color:var(--readout)">+${rep} rep</span>
    </div>`;
  // Slice A: significant firsts (same rep≥15 bar the Chronicle uses) get the full "Agency Wire"
  // front page, reusing the entry we just filed above so the modal and the Chronicle scoop match.
  if((m.rep||0)>=15){
    const e=frontPages()[0];
    showModal(`${frontPageHTML(e, true)}
    ${hist?`<p class="muted" style="font-family:Georgia,'Times New Roman',serif;font-size:13px;text-align:center;margin:8px 0">${hist[1]}</p>`:''}
    ${strip}
    <button class="btn launch" style="width:100%" onclick="hideModal()">Onward ▸</button>`, 'newspaper');
    return;
  }
  showModal(`<div style="text-align:center">
    <div style="font-size:12px;letter-spacing:.35em;color:var(--ignite);text-transform:uppercase;margin-bottom:6px">✦ Milestone ✦</div>
    <h2 style="margin:0 0 2px">${m.name}</h2>
    <div class="dim" style="font-family:var(--mono);font-size:12px;margin-bottom:10px">${dateStr()} · Era ${eraIndex(currentEra())+1}: ${currentEra().name}</div>
    ${race?`<p style="font-size:13px;margin:8px 0">${race}</p>`:''}
    ${hist?`<p class="muted" style="font-size:12px;margin:8px 0">${hist[1]}</p>`:''}
    ${strip}
    <button class="btn launch" onclick="hideModal()">Onward ▸</button>
  </div>`);
}

/* ---------- Government mandates (economy tension + Stellaris-style arriving decisions) ----------
   Every so often the government offers a MANDATE: complete a specific not-yet-flown mission by a
   deadline for a cash bonus + support boost. Decline freely (small cooldown); accept and miss the
   deadline and support takes a real hit. Mandates are the designed bridge financing for an ACTIVE
   agency — the replacement for the old ambient grants — and they make the calendar matter. */
const MANDATE_COOLDOWN_MO=15;     // months between offers (after resolve/decline)
const MANDATE_BONUS_MULT=0.65;    // bonus = mission payout × this (+ era scaling)
const MANDATE_SUPPORT_WIN=8;      // support gained on fulfilment
const MANDATE_SUPPORT_MISS=-10;   // support lost on a missed deadline
// P10: schedule-pressure premium — flying a mandate close to its deadline (instead of comfortably
// early, fully de-risked) pays up to this much more on top of the base bonus. 0 at the moment you
// accept it, ramping to +SCHEDULE_PRESSURE_MAX right at the wire.
const SCHEDULE_PRESSURE_MAX=0.5;
// P10: first-flight-of-design prestige — flying a vehicle configuration that has never flown before
// (vs. re-flying the same proven design) pays a small premium, restoring a real choice once
// reliability alone is ground down to ~97%+ and stops being an interesting decision on its own.
const FIRST_DESIGN_PAYOUT_BONUS=0.10;
const FIRST_DESIGN_REP_BONUS=2;
function mandateCandidate(){
  // a mission the player hasn't flown, whose research gate is already met (or nearly-met via
  // an affordable node), and whose rep gate is within reach — i.e. plausibly achievable
  return MISSIONS.filter(m=>!state.completed[m.id] && (m.payout||0)>0
      && (!m.reqResearch || state.research[m.reqResearch] || (RESEARCH.find(r=>r.id===m.reqResearch && reqsMet(r))))
      && state.rep >= (m.minRep||0)*0.5)
    .sort((a,b)=>(a.minRep||0)-(b.minRep||0))[0]||null;
}
function offerMandate(){
  if(state.mandate || (state.mandateCooldown||0)>0) return;
  const m=mandateCandidate(); if(!m) return;
  const lead=Math.max(24, Math.round(buildMonths(m)*3+18)); // generous: 3× build + margin
  const bonus=round2((m.payout||2)*MANDATE_BONUS_MULT*(1+0.15*eraIndex(currentEra()))*(1+execMandateBonus()));
  state.mandate={missionId:m.id, name:m.name, bonus, deadlineAbs:absMonth()+lead, offeredAbs:absMonth()};
  timeInterrupt(); // smart time: an offer on the table stops the clock
  log('note',`📜 Government mandate offered: fly ${m.name} within ${lead} months for a ${fM(bonus)} bonus.`);
  if(animEnabled) showMandateModal();
}
function showMandateModal(){
  const md=state.mandate; if(!md) return;
  const left=md.deadlineAbs-absMonth();
  showModal(`<h2>📜 Government mandate</h2>
    <p>The national space directorate offers a mandate: <b>${md.name}</b> within <b>${left} months</b>.</p>
    <p>Fulfil it for a <b style="color:var(--ok)">${fM(md.bonus)} bonus</b> and <b style="color:var(--ok)">+${MANDATE_SUPPORT_WIN} public support</b>.
    Accept and miss the deadline, and support takes a <b style="color:var(--bad)">${MANDATE_SUPPORT_MISS}</b> hit.</p>
    <button class="btn launch" onclick="acceptMandate()">Accept the mandate</button>
    <button class="btn ghost" onclick="declineMandate()" style="margin-top:8px">Decline (no penalty)</button>`);
}
function acceptMandate(){ if(state.mandate) state.mandate.accepted=true; hideModal(); log('note',`Mandate accepted: ${state.mandate.name} by ${dateOfAbs(state.mandate.deadlineAbs)}.`); render(); }
function declineMandate(){ if(state.mandate){ log('note',`Mandate declined: ${state.mandate.name}.`); state.mandate=null; state.mandateCooldown=MANDATE_COOLDOWN_MO; } hideModal(); render(); }
function dateOfAbs(abs){ const y=1942+Math.floor(abs/12), mo=abs%12; return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mo]+' '+y; }
// called monthly from the tick + on mission completion
function tickMandate(){
  if(state.mandateCooldown>0) state.mandateCooldown--;
  const md=state.mandate;
  if(md){
    if(!md.accepted){ // unanswered offer in headless/anims-off: auto-accept (it's strictly optional upside until accepted... keep it pending 6mo then quietly lapse)
      if(absMonth()-md.offeredAbs>6){ state.mandate=null; state.mandateCooldown=MANDATE_COOLDOWN_MO; }
    } else if(absMonth()>md.deadlineAbs){
      addSupport(MANDATE_SUPPORT_MISS);
      log('bad',`📜 Mandate FAILED — ${md.name} was not flown by the deadline. Public support ${MANDATE_SUPPORT_MISS}.`);
      state.mandate=null; state.mandateCooldown=MANDATE_COOLDOWN_MO;
    }
  } else offerMandate();
}
function fulfillMandateIfMatch(missionId){
  const md=state.mandate; if(!md || !md.accepted || md.missionId!==missionId) return;
  if(absMonth()<=md.deadlineAbs){
    const lead=Math.max(1, md.deadlineAbs-md.offeredAbs);
    const pressure=clampA((md.deadlineAbs-absMonth())/lead, 0, 1); // 1 = flown right at offer, 0 = flown right at the deadline
    const scheduleMult=1+SCHEDULE_PRESSURE_MAX*(1-pressure); // P10: the closer to the wire, the bigger the premium
    const bonus=round2(md.bonus*scheduleMult);
    state.money+=bonus; addSupport(MANDATE_SUPPORT_WIN);
    const pressureTxt=scheduleMult>1.01?` (schedule-pressure premium ×${scheduleMult.toFixed(2)} — cut it close)`:'';
    log('ok',`📜 Mandate fulfilled: ${md.name}. +${fM(bonus)} bonus${pressureTxt}, +${MANDATE_SUPPORT_WIN} public support.`);
  }
  state.mandate=null; state.mandateCooldown=MANDATE_COOLDOWN_MO;
}

/* ---------- ambient events (economy + rival expansion) ---------- */
function econPayoutMult(){ return (state.econEvents||[]).reduce((a,e)=>a*(e.payoutMult||1),1); }
function econOverheadAdd(){ return (state.econEvents||[]).reduce((a,e)=>a+(e.overheadAdd||0),0); }
function round2(v){ return Math.round(v*100)/100; }
// #18 (Home): fold a flown mission's lumpy revenue/cost onto the current month's ledger
function recordFlightLedger(revenue, expense){
  if(!state.lastMonth) state.lastMonth={revenue:0,expenses:0,net:0,flights:0};
  state.lastMonth.revenue=round2(state.lastMonth.revenue+(revenue||0));
  state.lastMonth.expenses=round2(state.lastMonth.expenses+(expense||0));
  state.lastMonth.net=round2(state.lastMonth.revenue-state.lastMonth.expenses);
  state.lastMonth.flights=(state.lastMonth.flights||0)+1;
}
// #8 Program politics helpers
function publicSupport(){ return clampA(state.publicSupport==null?SUPPORT_BASE:state.publicSupport, SUPPORT_MIN, SUPPORT_MAX); }
function publicMood(){ const s=publicSupport(); return SUPPORT_TIERS.find(t=>s>=t.min)||SUPPORT_TIERS[SUPPORT_TIERS.length-1]; }
function addSupport(delta){ state.publicSupport=clampA(publicSupport()+delta, SUPPORT_MIN, SUPPORT_MAX); return state.publicSupport; }
// monthly government grant: scales with support (linear, 0 at no support) and era
// Economy tension pass: government funding is EARNED, not ambient. Only support above
// neutral (50) buys funding — an idle agency reverts to neutral and the grants dry up,
// leaving overhead to eat the balance sheet. Napkin difficulty keeps a small floor grant
// (still below its overhead, so idling stays net-negative — just slower to bite).
function govMonthlyFunding(){
  const excess=Math.max(0, publicSupport()-SUPPORT_BASE);
  const earned=GOV_FUNDING_BASE*Math.min(1,excess/30)*(1+0.15*eraIndex(currentEra()))*doctrineMult('gov')*(1+execGovBonus())*crisisGovFundingMult(); // full grant at 80 support — every point above neutral pays; executives lift the earned grant (0 when unstaffed); I3: a Funding Collapse crisis cuts the earned grant, not the difficulty floor below
  return round2(earned + (diff().govFloor||0));
} // CE3(a): Statecraft +, Commercial −
// Months of cash left at the current monthly burn (Infinity when cash-positive).
function runwayMonths(){
  const lm=state.lastMonth; if(!lm) return Infinity;
  const net=lm.net!=null?lm.net:0;
  if(net>=0) return Infinity;
  return state.money/(-net);
}

/* ---------- passive-income contracts (repeatable · cooldown · diminishing) ---------- */
function passiveDef(id){ return PASSIVE_CONTRACT_DEFS.find(c=>c.id===id); }
function passiveActive(id){ return (state.passiveContracts||[]).find(c=>c.id===id); }
function passiveSignings(id){ return (state.contractSignings||{})[id]||0; }
function passiveCooldownLeft(id){ return (state.contractCooldown||{})[id]||0; }
// diminishing multiplier applied to the NEXT signing, given how many times it's been signed
function passiveDiminish(id){ return clampA(Math.pow(PASSIVE_DIMINISH, passiveSignings(id)), PASSIVE_FLOOR, 1); }
// income the contract would pay if signed right now (base × diminishing, rounded)
function passiveIncomeNow(id){ const d=passiveDef(id); return d?round2(d.income*passiveDiminish(id)):0; }
function passiveReqMet(d){
  if(!d) return false;
  if(d.reqMission && !state.completed[d.reqMission]) return false;
  if(d.reqResearch && !state.research[d.reqResearch]) return false;
  if(d.reqSynergy && !synergyUnlocked(d.reqSynergy)) return false; // P8: cross-track synergy unlock
  if(d.reqDoctrine && state.doctrine!==d.reqDoctrine) return false; // P9: doctrine-exclusive contract
  if(d.minRep && state.rep<d.minRep) return false;
  return true;
}
// 'active' (running) · 'cooldown' (resting) · 'available' (signable) · 'unaffordable' · 'locked'
function passiveStatus(id){
  const d=passiveDef(id); if(!d) return 'locked';
  if(passiveActive(id)) return 'active';
  if(!passiveReqMet(d)) return 'locked';
  if(passiveCooldownLeft(id)>0) return 'cooldown';
  if(state.money < d.setup) return 'unaffordable';
  return 'available';
}
function signPassiveContract(id){
  const d=passiveDef(id); if(!d || passiveStatus(id)!=='available') return false;
  const mult=passiveDiminish(id);
  const income=round2(d.income*mult);
  state.money=round2(state.money-d.setup);
  state.passiveContracts=state.passiveContracts||[];
  state.passiveContracts.push({id, monthsLeft:d.term, income});
  state.contractSignings=state.contractSignings||{};
  const n=(state.contractSignings[id]=passiveSignings(id)+1);
  if(d.support) addSupport(d.support);
  log('ok',`Signed ${passiveContractDisplay(d).name} — +${fM(income)}/mo for ${d.term} months${n>1?` (renewal #${n-1}, ${Math.round(mult*100)}% of base)`:''}.`);
  render();
  return true;
}
function passiveMonthlyIncome(){ return round2((state.passiveContracts||[]).reduce((a,c)=>a+(c.income||0),0)); }
// monthly tick: pay each active contract, expire it onto cooldown, count cooldowns down
function tickPassiveContracts(){
  const still=[];
  (state.passiveContracts||[]).forEach(c=>{
    state.money=round2(state.money+(c.income||0));
    c.monthsLeft--;
    if(c.monthsLeft<=0){
      const d=passiveDef(c.id);
      state.contractCooldown=state.contractCooldown||{};
      const cd=(d&&d.cooldown)||PASSIVE_COOLDOWN;
      state.contractCooldown[c.id]=cd;
      if(d) log('note',`${passiveContractDisplay(d).name} contract has run its term — renewable in ${cd} months.`);
    } else still.push(c);
  });
  state.passiveContracts=still;
  const cool=state.contractCooldown||{};
  for(const k in cool){ if(cool[k]>0) cool[k]--; }
}
function monthlyPayroll(){ return round2((state.staff||[]).reduce((a,s)=>{const p=personById(s.id);return a+(p?p.salary:0);},0)); }
/* ---------- Special contracts: the game comes to you ----------
   Between mission-ladder rungs, a client arrives with a limited-time variant of a mission
   you can already fly: procedural body (mission × modifier × deadline), hand-authored
   historical flavor. One live at a time, era-appropriate, real money for flying NOW.
   The commercial cousin of mandates — short-horizon goals that make the calendar matter. */
const SPECIAL_MODS=[
  {id:'rush',   name:'Rush order',        mult:0.9,  lead:8,
   flavors:["A customer's original launch provider blew up on the pad — they need a ride and they need it yesterday.",
            "A treaty deadline looms; the ministry will pay handsomely for a flight before the signing."]},
  {id:'polar',  name:'Polar insertion',   mult:1.2,  lead:12,
   flavors:["A mapping agency wants full-globe coverage — a polar-corridor flight at premium rates.",
            "Weather service requirement: sun-synchronous coverage, and they're paying for the plane change."]},
  {id:'media',  name:'Broadcast charter', mult:1.0,  lead:10, reqCrew:true,
   flavors:["A television network wants cameras on this flight — live coverage, worldwide audience, appearance fees.",
            "A film studio has chartered seats and coverage rights. The premiere date is not negotiable."]},
  {id:'science',name:'Instrument ride',   mult:1.1,  lead:14,
   flavors:["A university consortium has an instrument package ready and a grant expiring — they'll pay for the manifest slot.",
            "An observatory needs its detector above the atmosphere before the comet arrives."]},
  {id:'prestige',name:'State showcase',   mult:1.4,  lead:10, minRep:60,
   flavors:["A state visit is scheduled — the government wants a flawless flight to show off, and will pay like it.",
            "An international exposition wants a launch timed to its opening ceremony. National prestige budgets are generous."]},
  // P10: insurance underwriters pay the biggest premium of any special contract precisely because
  // they're pricing in the risk, not despite it — the "reward for flying risky" lever alongside the
  // first-of-design bonus and the mandate schedule-pressure premium. Flavor-only like every other
  // mod here (no mechanical risk check) — a deliberate scope boundary, not an oversight.
  {id:'insurance',name:'High-risk underwriting', mult:1.6, lead:8, minRep:80,
   flavors:["A reinsurer is pricing next year's launch-liability book off this flight — they'll cover the premium if you fly it now, margins as they stand.",
            "An underwriting syndicate wants the loss data before a competitor's; they'll pay top rate for a flight on your current, unproven margins."]},
];
const SPECIAL_COOLDOWN_MO=9;
function specialCandidateMissions(){
  return MISSIONS.filter(m=>(m.payout||0)>0 && state.completed[m.id] && state.rep>=(m.minRep||0));
}
function tickSpecialContract(){
  if(state.specialCooldown>0) state.specialCooldown--;
  const sc=state.specialContract;
  if(sc){
    if(absMonth()>sc.deadlineAbs){ log('note',`★ The ${sc.title} window closed — the client went elsewhere.`);
      state.specialContract=null; state.specialCooldown=SPECIAL_COOLDOWN_MO; }
    return;
  }
  if((state.specialCooldown||0)>0) return;
  if(Math.random()>0.5) return; // arrives within ~2 months of eligibility, not like clockwork
  const pool=specialCandidateMissions(); if(!pool.length) return;
  const m=pool[Math.floor(Math.random()*pool.length)];
  const mods=SPECIAL_MODS.filter(md=>(!md.reqCrew || (m.crew||0)>0) && state.rep>=(md.minRep||0));
  if(!mods.length) return;
  const mod=mods[Math.floor(Math.random()*mods.length)];
  const bonus=round2(m.payout*mod.mult);
  state.specialContract={ missionId:m.id, modId:mod.id, bonus, deadlineAbs:absMonth()+mod.lead,
    title:`${mod.name}: ${m.name}`, flavor:mod.flavors[Math.floor(Math.random()*mod.flavors.length)] };
  timeInterrupt();
  log('note',`★ Special contract: ${state.specialContract.title} — ${fM(bonus)} bonus if flown within ${mod.lead} months. ${state.specialContract.flavor}`);
}
function fulfillSpecialIfMatch(missionId){
  const sc=state.specialContract; if(!sc || sc.missionId!==missionId) return;
  if(absMonth()<=sc.deadlineAbs){
    state.money+=sc.bonus; addSupport(3); state.rep+=2;
    log('ok',`★ Special contract fulfilled: ${sc.title}. +${fM(sc.bonus)} bonus, +3 support, +2 rep.`);
  }
  state.specialContract=null; state.specialCooldown=SPECIAL_COOLDOWN_MO;
}

/* ---------- E1.3: procedural filler contracts ----------
   A rotating board of era + capability-gated repeatable contracts (see CONTRACT_ARCHETYPES,
   data.js) — the "no station in range" filler between authored missions. Deliberately simpler
   than special contracts: no modifier layer, no deadline-vs-existing-mission bonus — each offer
   IS the flyable mission, priced below its authored counterpart, expiring and rotating on its own. */
const CONTRACT_OFFER_LEAD=6; // months an offer stays open before the client goes elsewhere
function contractOfferCap(){ return eraIndex(currentEra())>=4 ? 3 : 2; } // Slice B balance pass: a 3rd concurrent slot opens Commercial era onward, once there's enough mission variety to fill it
function contractOfferReferenced(id){
  return state.activeMission===id
    || (state.buildQueue||[]).some(o=>o.missionId===id)
    || (state.hangar||[]).some(h=>h.missionId===id);
}
function tickContractOffers(){
  state.contractOffers=(state.contractOffers||[]).filter(o=>{
    if(o.deliverModule) return true; // #73 Slice 1: a module delivery is a player-committed infra project, not a rotating commercial contract — never expires on its own, only consumed by finalizeLaunch
    if(absMonth()<=o.expiresAbs || contractOfferReferenced(o.id)) return true; // still open, or committed to (build queue/hangar/selected) — don't yank it out from under a build
    log('note',`${o.name}: contract window closed — the client went elsewhere.`);
    return false;
  });
  if(state.contractOffers.length>=contractOfferCap()) return;
  if(Math.random()>0.4) return; // arrives every few months, not like clockwork
  const eraIdx=eraIndex(currentEra());
  const pool=CONTRACT_ARCHETYPES.filter(a=>eraIdx>=a.minEra && a.req(state));
  if(!pool.length) return;
  const totalW=pool.reduce((s,a)=>s+a.weight(state),0);
  let r=Math.random()*totalW, pick=pool[pool.length-1];
  for(const a of pool){ r-=a.weight(state); if(r<=0){ pick=a; break; } }
  state.procSeq=(state.procSeq||0)+1;
  const built=pick.build(eraIdx);
  const offer=Object.assign({id:'pc_'+state.procSeq, proc:true, expiresAbs:absMonth()+CONTRACT_OFFER_LEAD}, built);
  (state.contractOffers=state.contractOffers||[]).push(offer);
  log('note',`New contract offer: ${offer.name} — ${fM(offer.payout)}, open ${CONTRACT_OFFER_LEAD} months.`);
}
/* ---------- E1.1: rivals bid on your procedural contract offers ----------
   A surging rival can snatch an open, uncommitted contract offer out from under you — a two-beat
   warning (bid placed) then take (offer lost) unless you commit to it first. Committing is the whole
   counter: contractOfferReferenced() (the same guard tickContractOffers uses to protect a build in
   progress) makes a bid-on offer immune the instant you select/queue/hangar it. Reward is a small
   rival CAPITAL bump, not momentum — momentum drives the MC-tuned firsts-claiming pace (data.js),
   and a snatch shouldn't touch that. Never touches authored missions, the special contract, or
   mandates — only state.contractOffers. */
const RIVAL_SNATCH_MOM_THRESHOLD=1.1, RIVAL_SNATCH_WARN_MONTHS=2, RIVAL_SNATCH_CAPITAL_BUMP=1.0;
function tickRivalSnatch(){
  for(const o of (state.contractOffers||[]).slice()){
    if(!o.rivalBid) continue;
    if(contractOfferReferenced(o.id)){ o.rivalBid=null; continue; } // committed in time — bid falls through
    if(absMonth()<o.rivalBid.snatchAbs) continue;
    const r=RIVALS.find(x=>x.id===o.rivalBid.rivalId);
    state.contractOffers=(state.contractOffers||[]).filter(x=>x.id!==o.id);
    if(r){ const rs=rivalStateFor(r); rs.capital=(rs.capital||0)+RIVAL_SNATCH_CAPITAL_BUMP;
      log('bad',`${r.flag} ${r.name} snatched the ${o.name} contract out from under you.`);
      pushFrontPage('rival', r.flag, `${r.name} wins ${o.name}`, 'A contract you left on the table.');
    }
  }
  if(Math.random()>0.5) return; // loose cadence, matching the other monthly rolls in this block
  const candidates=(state.contractOffers||[]).filter(o=>!o.rivalBid && !contractOfferReferenced(o.id));
  if(!candidates.length) return;
  const surging=RIVALS.filter(r=>rivalMomentumOf(r)>=RIVAL_SNATCH_MOM_THRESHOLD);
  if(!surging.length) return;
  const rival=surging[Math.floor(Math.random()*surging.length)];
  const target=candidates[Math.floor(Math.random()*candidates.length)];
  target.rivalBid={rivalId:rival.id, snatchAbs:absMonth()+RIVAL_SNATCH_WARN_MONTHS};
  log('note',`${rival.flag} ${rival.name} is bidding on your ${target.name} contract — commit within ${RIVAL_SNATCH_WARN_MONTHS} months or lose it.`);
}
function rollEconEvent(){
  // Economy tension: positive windfalls require a recently ACTIVE program (a flight in the
  // last 24 months or support above neutral). Nobody grants money to an agency going nowhere.
  const activeProgram = (absMonth()-(state.lastFlightAbs??-999))<=36 || !!state.activeResearch || publicSupport()>SUPPORT_BASE+3;
  // P6 6.2: per-era gating — optional minEra/maxEra are ERA INDEX bounds (inclusive). Absent ⇒ no era
  // restriction (backward compatible: every pre-6.2 entry has neither, so its eligibility is unchanged).
  const eraIdx=eraIndexForYear(state.year);
  const elig=ECONOMY_EVENTS.filter(e=> state.year>=(e.minYear||0) && state.rep>=(e.minRep||0) && state.flights>=(e.reqFlights||0) && (!e.reqDepot || state.research.orbital_depot) && (!e.reqLogi || logiFlightsInTransit().length>0) && eraIdx>=(e.minEra||0) && eraIdx<=(e.maxEra??(ERAS.length-1)) && !(e.kind==='good' && e.money && !activeProgram));
  if(!elig.length) return null;
  const tot=elig.reduce((a,e)=>a+e.weight,0);
  let r=Math.random()*tot, pick=elig[0];
  for(const e of elig){ if((r-=e.weight)<=0){ pick=e; break; } }
  const inst={id:pick.id, label:pick.label, kind:pick.kind, blurb:pick.blurb};
  if(pick.money) inst.money=round2(pick.money[0]+Math.random()*(pick.money[1]-pick.money[0]));
  if(pick.dur)   inst.monthsLeft=Math.round(pick.dur[0]+Math.random()*(pick.dur[1]-pick.dur[0]));
  if(pick.payoutMult!=null) inst.payoutMult=pick.payoutMult;
  if(pick.overheadAdd!=null) inst.overheadAdd=pick.overheadAdd;
  if(pick.fuelShock!=null) inst.fuelShock=pick.fuelShock;
  if(pick.buyer) inst.buyer=true;
  if(pick.logiMishap) inst.logiMishap=true;
  return inst;
}
function applyEconEvent(inst){
  if(inst.fuelShock!=null){ // M2: immediate propellant price shock (mean reversion pulls it back)
    state.fuelPrice=clampA(round2(state.fuelPrice*inst.fuelShock), FUEL_MIN, FUEL_MAX);
    log(inst.kind==='good'?'ok':'bad', `Market — ${inst.label}: propellant now ${fM(state.fuelPrice)}/t. ${inst.blurb}`);
  } else if(inst.buyer){ // M2: a rival posts a premium standing buy order at your depot
    const r=RIVALS[Math.floor(Math.random()*RIVALS.length)];
    const premium=round2(state.fuelPrice*(1.3+Math.random()*0.35));
    const months=4+Math.floor(Math.random()*4);
    state.fuelBuyer={name:r.name, color:r.color, price:premium, monthsLeft:months, cap:round2(20+Math.random()*40)};
    log('ok', `Market — ${r.name} is buying propellant at ${fM(premium)}/t for ${months} mo (up to ${state.fuelBuyer.cap} t). ${inst.blurb}`);
  } else if(inst.logiMishap){ // 2.3: raise a route-interruption decision (applied/logged in triggerLogiMishap; modal shown post-tick)
    triggerLogiMishap(inst);
  } else if(inst.money!=null){
    state.money+=inst.money;
    log(inst.kind==='good'?'ok':'bad', `Market — ${inst.label}: ${inst.money>=0?'+':'−'}${fM(Math.abs(inst.money))}. ${inst.blurb}`);
  } else {
    state.econEvents.push(inst);
    const eff=inst.payoutMult!=null ? `payouts ×${inst.payoutMult}`
            : inst.overheadAdd!=null ? `overhead ${inst.overheadAdd>=0?'+':'−'}${fM(Math.abs(inst.overheadAdd))}/mo` : '';
    log(inst.kind==='good'?'ok':'bad', `Market — ${inst.label}: ${eff} for ${inst.monthsLeft} mo. ${inst.blurb}`);
  }
}
function checkEvents(){
  // tick down active temporary events, expiring the ones that run out
  state.econEvents=(state.econEvents||[]).filter(e=>{
    e.monthsLeft--;
    if(e.monthsLeft<=0){ log('note', `Market — ${e.label} has passed; conditions normalise.`); return false; }
    return true;
  });
  // roll a new event, rate-limited by a cooldown
  state.eventCooldown=(state.eventCooldown||0)-1;
  if(state.eventCooldown<=0 && Math.random()<EVENT_CHANCE){
    const inst=rollEconEvent();
    if(inst){ applyEconEvent(inst); state.eventCooldown=EVENT_MIN_GAP; }
  }
}
// rivals whose fired "firsts" reached a given body, most recent first
function rivalsAtBody(bodyId){
  const out=[];
  for(const r of RIVALS){
    for(const f of r.firsts){
      if(f.body===bodyId && state.rivalFired[r.id+'|'+f.name]) out.push({rival:r, year:f.year, name:f.name});
    }
  }
  return out.sort((a,b)=>b.year-a.year);
}
/* ---------- programs & ambition ---------- */
function programComplete(p){ return p.missions.every(mid=>state.completed[mid]); }
function currentAmbition(){ return AMBITIONS.find(a=>a.id===state.ambition) || AMBITIONS[0]; }
function setAmbition(id){ if(!AMBITIONS.find(a=>a.id===id)) return; state.ambition=id; log('info',`Long-term ambition set: ${AMBITIONS.find(a=>a.id===id).name}.`); render(); }
// the next unfinished objective across the program ladder (drives the one-more-turn nudge)
function nextObjective(){
  for(const p of PROGRAMS){
    for(const mid of p.missions){
      if(!state.completed[mid]) return {program:p, missionId:mid, mission:MISSIONS.find(m=>m.id===mid)};
    }
  }
  return null;
}
// progress toward the chosen ambition: completed objective-missions up to and
// including the program that holds the capstone, as a fraction.
function ambitionProgress(){
  const amb=currentAmbition();
  const path=[]; let found=false;
  for(const p of PROGRAMS){ for(const mid of p.missions){ path.push(mid); } if(p.missions.includes(amb.capstone)){ found=true; break; } }
  if(!found){ path.length=0; for(const p of PROGRAMS) for(const mid of p.missions) path.push(mid); }
  const done=path.filter(mid=>state.completed[mid]).length;
  return {done, total:path.length, pct: path.length?Math.round(100*done/path.length):0, capstoneDone:!!state.completed[amb.capstone]};
}
// award any newly-completed programs and the ambition capstone (each once); nudge the next goal.
// returns a pendingCelebration thunk if the ambition was just fulfilled, else null.
function checkPrograms(){
  let celebrate=null;
  for(const p of PROGRAMS){
    if(programComplete(p) && !state.programsAwarded[p.id]){
      state.programsAwarded[p.id]=true;
      state.money+=p.reward.money; state.rep+=p.reward.rep;
      log('ok',`★ ${p.name} complete — all objectives flown. Program bonus: +${fM(p.reward.money)}, +${p.reward.rep} rep.`);
    }
  }
  const amb=currentAmbition();
  if(state.completed[amb.capstone] && !state.ambitionFulfilled){
    state.ambitionFulfilled=true;
    log('ok',`✦ AMBITION FULFILLED — “${amb.name}.” The dream you set out to chase is real.`);
    celebrate=()=>showModal(`<h2>✦ ${amb.name}</h2><p class="muted">${amb.blurb}</p><p>Your founding ambition is fulfilled. Set a new horizon from the Objectives panel's <b>Programs →</b> — there is always a further frontier.</p><button class="btn" onclick="hideModal()" style="margin-top:10px">Onward</button>`);
  }
  const nx=nextObjective();
  if(nx) log('note',`Next objective: ${nx.mission.name} — ${nx.program.name}.`);
  return celebrate;
}
/* ---------- persistent infrastructure ---------- */
function facilityById(id){ return FACILITY_DEFS.find(f=>f.id===id); }
function facilityState(id){ return (state.facilities||{})[id]; }
function facilityBuilt(id){ const fs=facilityState(id); return !!(fs&&fs.built); }
function missionBody(mid){ for(const b of BODIES){ if((b.missions||[]).includes(mid)) return b.id; } return null; }
// monthly output of a built facility, scaling with its module count

/* ---------- Station assembly (slice 2): typed modules on real facilities ----------
   Every built facility carries fs.moduleList — the core Habitat plus whatever you've
   docked since. Legacy saves migrate lazily (generic modules become Habitats).
   Production is typed per module (scaled by the facility body's multiplier), power
   must balance or output suffers, ports cap growth, greenhouses cut resupply. */
function stationModuleDef(id){ return STATION_MODULES.find(m=>m.id===id); }
function facilityModuleList(fs){
  if(!fs.moduleList){ fs.moduleList=Array(Math.max(1,fs.modules||1)).fill('can_std'); }
  fs.modules=fs.moduleList.length; // keep the legacy count in lockstep
  return fs.moduleList;
}
// Station operations are lazy so existing facilities keep their established output until the
// player explicitly assigns crew or signs a resupply contract. New facilities opt into condition
// tracking immediately; new fields are persisted with the facility and remain harmless to older saves.
const STATION_MAINT_MAX=100, STATION_MAINT_DECAY_BASE=0.55, STATION_MAINT_DECAY_PER_MODULE=0.12;
const STATION_REPAIR_COST_PER_MODULE=0.10, STATION_ROTATION_MONTHS=12;
const STATION_RESUPPLY_CONTRACT_TERM=24, STATION_RESUPPLY_CONTRACT_SETUP=0.45;
const STATION_RESUPPLY_CONTRACT_PREMIUM=0.12;
function stationOps(fs){
  if(!fs) return {condition:STATION_MAINT_MAX, crewIds:[], crewManaged:false, rotationDueAbs:absMonth()+STATION_ROTATION_MONTHS, resupplyContract:null};
  if(fs.condition==null) fs.condition=STATION_MAINT_MAX;
  if(!Array.isArray(fs.crewIds)) fs.crewIds=[];
  if(fs.crewManaged==null) fs.crewManaged=false;
  if(fs.maintenanceEnabled==null) fs.maintenanceEnabled=false;
  if(fs.rotationDueAbs==null) fs.rotationDueAbs=absMonth()+STATION_ROTATION_MONTHS;
  if(fs.rotationNotifiedAbs==null) fs.rotationNotifiedAbs=-1;
  if(fs.resupplyContract===undefined) fs.resupplyContract=null;
  return fs;
}
function stationCondition(fs){ return Math.max(0,Math.min(STATION_MAINT_MAX, stationOps(fs).condition)); }
function stationMaintenanceFactor(fs){
  if(!stationOps(fs).maintenanceEnabled) return 1;
  const c=stationCondition(fs);
  return c>=70?1:Math.max(0.65,0.65+(c/70)*0.35);
}
function stationMaintenanceCost(facId){
  const fs=facilityState(facId); if(!fs) return 0;
  return round2(Math.max(0,100-stationCondition(fs))/100*STATION_REPAIR_COST_PER_MODULE*Math.max(1,facilityModuleList(fs).length));
}
function repairStation(facId){
  const fs=facilityState(facId), def=facilityById(facId), cost=stationMaintenanceCost(facId);
  if(!fs||!def||cost<=0||state.money<cost) return;
  state.money-=cost; stationOps(fs).maintenanceEnabled=true; stationOps(fs).condition=STATION_MAINT_MAX;
  log('ok',`${def.icon} ${def.name}: maintenance campaign complete — condition restored to 100% (−${fM(cost)}).`);
  render();
}
function stationCrewIds(fs){
  const ops=stationOps(fs);
  ops.crewIds=ops.crewIds.filter(id=>staffRecord(id)&&!isCrewDeployed(id));
  return ops.crewIds;
}
function stationCrewCount(fs){ return stationOps(fs).crewManaged?stationCrewIds(fs).length:0; }
function stationCrewAssigned(id){
  return Object.keys(state.facilities||{}).some(fid=>stationCrewIds(facilityState(fid)).includes(id));
}
function stationCrewCandidates(){
  return (state.staff||[]).filter(s=>roleOf(s.id)==='astro' && !isCrewDeployed(s.id) && !stationCrewAssigned(s.id));
}
function stationRotationDue(fs){ return stationOps(fs).crewManaged && absMonth()>=stationOps(fs).rotationDueAbs; }
function rotateStationCrew(facId){
  const fs=facilityState(facId), def=facilityById(facId); if(!fs||!def) return;
  const ops=stationOps(fs), ids=stationCrewIds(fs), candidates=stationCrewCandidates();
  if(!ops.crewManaged||!ids.length||!candidates.length){
    ops.rotationDueAbs=absMonth()+STATION_ROTATION_MONTHS;
    log('note',`${def.icon} ${def.name}: rotation cycle logged; no replacement was available.`);
    render(); return;
  }
  const outgoing=ids[0], incoming=candidates.sort((a,b)=>effSkill(b.id)-effSkill(a.id))[0].id;
  ops.crewIds=[...ids.slice(1),incoming]; ops.rotationDueAbs=absMonth()+STATION_ROTATION_MONTHS; ops.rotationNotifiedAbs=-1;
  log('ok',`${def.icon} ${def.name}: crew rotation complete — ${personById(outgoing)?.name||outgoing} relieved, ${personById(incoming)?.name||incoming} aboard.`);
  render();
}
function assignStationCrew(facId, id){
  const fs=facilityState(facId), def=facilityById(facId), p=personById(id);
  if(!fs||!def||!p||roleOf(id)!=='astro'||!isHired(id)||isCrewDeployed(id)||stationCrewAssigned(id)) return;
  const ops=stationOps(fs), cap=facilityModuleList(fs).reduce((n,mid)=>n+((stationModuleDef(mid)?.stats?.crew)||0),0);
  if(ops.crewIds.length>=cap) return;
  ops.crewManaged=true; ops.maintenanceEnabled=true; ops.crewIds.push(id); ops.rotationDueAbs=absMonth()+STATION_ROTATION_MONTHS;
  log('note',`${def.icon} ${def.name}: ${p.name} assigned to station duty.`); render();
}
function removeStationCrew(facId, id){
  const fs=facilityState(facId), def=facilityById(facId); if(!fs||!def) return;
  const ops=stationOps(fs); ops.crewIds=ops.crewIds.filter(x=>x!==id);
  log('note',`${def.icon} ${def.name}: ${personById(id)?.name||id} rotated off station duty.`); render();
}
function resupplyContractCost(facId){
  const fs=facilityState(facId); return fs?round2(STATION_RESUPPLY_CONTRACT_SETUP*Math.max(1,facilityModuleList(fs).length)):0;
}
function stationContractActive(fs){ const c=stationOps(fs).resupplyContract; return !!(c&&absMonth()<c.untilAbs); }
function signResupplyContract(facId){
  const fs=facilityState(facId), def=facilityById(facId), cost=resupplyContractCost(facId); if(!fs||!def||stationContractActive(fs)||state.money<cost) return;
  stationOps(fs).maintenanceEnabled=true;
  stationOps(fs).resupplyContract={untilAbs:absMonth()+STATION_RESUPPLY_CONTRACT_TERM, premium:STATION_RESUPPLY_CONTRACT_PREMIUM};
  state.money-=cost;
  log('ok',`${def.icon} ${def.name}: signed a ${STATION_RESUPPLY_CONTRACT_TERM}-month resupply contract (−${fM(cost)} setup). It will reorder at ${AUTO_RESUPPLY_THRESHOLD} months.`);
  render();
}
function cancelResupplyContract(facId){
  const fs=facilityState(facId), def=facilityById(facId); if(!fs||!def) return;
  stationOps(fs).resupplyContract=null; log('note',`${def.icon} ${def.name}: resupply contract cancelled.`); render();
}
function facilityPortCap(fs, def){
  // E1.8 D fix: slice C excluded node_hub (the orbital berth-sphere) from surface benches, which
  // left surface bases hard-capped at STATION_PORT_BASE forever — no growth module was reachable.
  // Ports are an orbital-assembly metaphor (finite berths on a stack); a ground base just spreads
  // out, so surface facilities get no cap instead of inventing a parallel "surface port" module.
  if(def && def.body!=='earth') return Infinity;
  const nodes=facilityModuleList(fs).filter(id=>id==='node_hub').length;
  return STATION_PORT_BASE + nodes*((stationModuleDef('node_hub').ports)||3);
}
function facilityPower(fs){
  let gen=0, draw=0;
  facilityModuleList(fs).forEach(id=>{ const d=stationModuleDef(id); if(d){ gen+=d.stats.powerGenKw||0; draw+=d.stats.powerDrawKw||0; } });
  return {gen:Math.round(gen*10)/10, draw:Math.round(draw*10)/10, net:Math.round((gen-draw)*10)/10};
}
function facilityGreenhouses(fs){ return facilityModuleList(fs).filter(id=>id==='greenhouse').length; }
// Crew balance: Habitats supply crew capacity; labs/depot/greenhouse demand crew to run.
// Under-crewed stations degrade output (soft) rather than shutting modules off.
function facilityCrew(fs){
  let cap=0, req=0;
  facilityModuleList(fs).forEach(id=>{ const d=stationModuleDef(id); if(!d) return;
    cap+=d.stats.crew||0; req+=d.stats.crewReq||0; });
  const ops=stationOps(fs), actual=ops.crewManaged?stationCrewCount(fs):cap;
  return {cap:actual, req, factor: req<=0?1:Math.min(1, Math.max(0.4, actual/req))}; // legacy facilities use module capacity until crew management is enabled
}
// Module synergies: thoughtful composition earns aggregate multipliers.
//  - Lab + Habitat: crewed research runs hotter (+science)
//  - Greenhouse + Habitat: closed-loop life support (+income efficiency, already cuts resupply)
//  - Power surplus: a well-powered station (net ≥ +8kW) runs a small efficiency bonus
//  - Depot + Power Truss: pumping propellant needs power headroom (+fuel)
function facilitySynergies(fs){
  const list=facilityModuleList(fs);
  const has=id=>list.includes(id), n=id=>list.filter(x=>x===id).length;
  const pw=facilityPower(fs);
  const syn=[];
  if(has('lab_mod')&&has('can_std')) syn.push({key:'crewed_research', label:'Crewed research', sci:0.20});
  if(has('greenhouse')&&has('can_std')) syn.push({key:'closed_loop', label:'Closed-loop life support', income:0.15});
  if(pw.net>=8) syn.push({key:'power_surplus', label:'Power surplus', income:0.10, sci:0.10});
  if(has('depot_mod')&&n('power_truss')>=1) syn.push({key:'active_depot', label:'Active depot pumping', fuel:0.25});
  return syn;
}
function facilitySynergyMult(fs){
  const m={income:1, fuel:1, rep:1, sci:1};
  facilitySynergies(fs).forEach(s=>{ for(const k in m) if(s[k]) m[k]+=s[k]; });
  return m;
}
// per-body production multiplier: preserves the old LEO/lunar/Mars scaling (perModule.income 0.5/1.0/1.8)
function facilityBodyMult(def){ return Math.max(1, (def.perModule&&def.perModule.income||0.5)/0.5); }
function stationModuleCost(def, fs, modDef){
  // escalates with station size, scaled by how expensive this body is to build at
  const n=facilityModuleList(fs).length;
  return round2(modDef.cost*facilityBodyMult(def)*(1+0.25*(n-1)));
}
// E1.8 C: surface/orbital module compatibility — shared by all three module-acquire gates
// (canAddStationModule / canContractStationModule / canFlyModuleDelivery) so they can't drift.
// Surface modules only mount on a Moon/Mars base; the orbital berth-sphere Node has no place on a
// surface base. Guards save-edits and stale delivery offers, not just the (already-filtered) palette.
function moduleFacilityCompatible(def, md){
  const onSurface = def && def.body!=='earth';
  if(md.surface && !onSurface) return {ok:false, why:'Surface module — only builds on a Moon/Mars base'};
  if(!md.surface && onSurface && md.id==='node_hub') return {ok:false, why:'Orbital structure — no place on a surface base'};
  return {ok:true};
}
function canAddStationModule(facId, modId){
  const def=facilityById(facId), fs=facilityState(facId), md=stationModuleDef(modId);
  if(!def||!fs||!md) return {ok:false, why:'—'};
  { const compat=moduleFacilityCompatible(def, md); if(!compat.ok) return compat; } // E1.8 C
  if(md.reqResearch && !state.research[md.reqResearch]) return {ok:false, why:'Needs '+((RESEARCH.find(r=>r.id===md.reqResearch)||{}).name||md.reqResearch)};
  if(facilityModuleList(fs).length>=facilityPortCap(fs,def) && modId!=='node_hub') return {ok:false, why:'All ports occupied — dock a Node for growth room'};
  const cost=stationModuleCost(def, fs, md);
  if(state.money<cost) return {ok:false, why:'Needs '+fM(cost)};
  return {ok:true, cost};
}
// Docks a module onto a built facility RIGHT NOW — shared by the instant "dock"/"contract" purchases
// and by a successful "fly it yourself" delivery mission (#73 Slice 1, finalizeLaunch). Caller has
// already charged (or, for a flown delivery, is about to charge) money; this only handles the
// module-list/supply/logging side, so the three callers can't drift out of sync with each other.
function dockModuleNow(facId, modId, note){
  const def=facilityById(facId), fs=facilityState(facId), md=stationModuleDef(modId);
  facilityModuleList(fs).push(modId); fs.modules=fs.moduleList.length; stationOps(fs).maintenanceEnabled=true;
  fs.supply=FAC_SUPPLY_MONTHS; fs.starvedMonths=0; // fresh provisions ride along with any delivery
  const pw=facilityPower(fs);
  log('ok',`${def.name}: ${md.name} docked${note?` (${note})`:''}. ${fs.moduleList.length} modules · power ${pw.net>=0?'+':''}${pw.net} kW.`);
  if(pw.net<0) log('note',`${def.name} is power-starved — production is running at 60%. Dock a Solar Power Truss.`);
}
function addStationModule(facId, modId){
  const chk=canAddStationModule(facId, modId); if(!chk.ok) return;
  const md=stationModuleDef(modId);
  state.money-=chk.cost;
  advance(md.buildMo||4); if(state.over){ render(); return; }
  dockModuleNow(facId, modId, `${fM(chk.cost)}, ${md.buildMo} mo`);
  render();
}

/* ---------- #73 Slice 1 (2026-07-11): module delivery is a real launch, player's choice ----------
   Docking the FIRST module of a given type on a facility is now a genuine "launch modules, dock"
   choice: fly it yourself (design/launch a real delivery mission — base module cost, no premium, but
   you pay for the vehicle+launch) or contract it (pay a premium, instant, no flight — the old
   one-click behavior). Repeats of an already-proven type on that facility skip this fork entirely and
   keep using addStationModule() unchanged, above — see stationModuleCard()'s `first` gate. */
const MODULE_CONTRACT_PREMIUM=0.35; // pay 35% over base to skip a real delivery flight
function contractedModuleCost(def, fs, md){ return round2(stationModuleCost(def, fs, md)*(1+MODULE_CONTRACT_PREMIUM)); }
function canContractStationModule(facId, modId){
  const def=facilityById(facId), fs=facilityState(facId), md=stationModuleDef(modId);
  if(!def||!fs||!md) return {ok:false, why:'—'};
  { const compat=moduleFacilityCompatible(def, md); if(!compat.ok) return compat; } // E1.8 C
  if(md.reqResearch && !state.research[md.reqResearch]) return {ok:false, why:'Needs '+((RESEARCH.find(r=>r.id===md.reqResearch)||{}).name||md.reqResearch)};
  if(facilityModuleList(fs).length>=facilityPortCap(fs,def) && modId!=='node_hub') return {ok:false, why:'All ports occupied — dock a Node for growth room'};
  const cost=contractedModuleCost(def, fs, md);
  if(state.money<cost) return {ok:false, why:'Needs '+fM(cost)};
  return {ok:true, cost};
}
function contractStationModule(facId, modId){
  const chk=canContractStationModule(facId, modId); if(!chk.ok) return;
  const md=stationModuleDef(modId);
  state.money-=chk.cost;
  advance(md.buildMo||4); if(state.over){ render(); return; }
  dockModuleNow(facId, modId, `${fM(chk.cost)} contracted delivery, ${md.buildMo} mo`);
  render();
}
// Raw materials + size-escalation only — no body/distance multiplier. The multiplier represents the
// cost of getting the module THERE; flying it yourself pays for that trip via a real launch instead (a
// real Δv/cruise-time cost, not a dollar one), so charging the multiplier again here would double-count
// delivery. stationModuleCost (with the multiplier) is unchanged for repeat-of-type instant dockings,
// and is still what contractedModuleCost is built from — the multiplier there correctly represents
// "someone else makes that same trip for you," which IS worth paying extra for.
function flyModuleCost(def, fs, md){ const n=facilityModuleList(fs).length; return round2(md.cost*(1+0.25*(n-1))); }
// Structural-only check for "fly it yourself" — no money changes hands until the delivery actually
// lands (finalizeLaunch), so this doesn't gate on current affordability the way the instant paths do.
function canFlyModuleDelivery(facId, modId){
  const def=facilityById(facId), fs=facilityState(facId), md=stationModuleDef(modId);
  if(!def||!fs||!md) return {ok:false, why:'—'};
  { const compat=moduleFacilityCompatible(def, md); if(!compat.ok) return compat; } // E1.8 C
  if(md.reqResearch && !state.research[md.reqResearch]) return {ok:false, why:'Needs '+((RESEARCH.find(r=>r.id===md.reqResearch)||{}).name||md.reqResearch)};
  if(facilityModuleList(fs).length>=facilityPortCap(fs,def) && modId!=='node_hub') return {ok:false, why:'All ports occupied — dock a Node for growth room'};
  return {ok:true, cost:flyModuleCost(def, fs, md)};
}
function pendingModuleDelivery(facId, modId){
  return (state.contractOffers||[]).find(o=>o.deliverModule && o.deliverModule.facId===facId && o.deliverModule.modId===modId);
}
/* ---------- #73 Slice 2 (2026-07-11): Moon/Mars delivery is a real profile-based cargo cruise ----------
   User chose the mechanically-consistent option over a cheap simple-mission reskin: Moon/Mars delivery
   flies leg-by-leg exactly like every authored Moon/Mars mission (Ascent→TLI/TMI→Orbit Insertion), via
   a genuinely new, reusable mechanic — m.cargo, an uncrewed payload mass carried through every leg of a
   profile mission (see lvPayload()/simulateMission()'s stackMass()). One-way: no Trans-Earth/Earth
   return leg, since nothing/no one needs to come home. Ends at ORBIT INSERTION, not a surface landing —
   this game has no landing/descent simulation anywhere yet (even the abstracted Mars resupply system
   stops at "shipment arrives"), so inventing one just for this would be its own separate mechanic;
   "docking" at a surface base's orbit is the same abstraction boundary the existing logistics system
   already draws. Lunar days (8, matching luna_orbit) stay under DEFER_CRUISE_DAYS(60) — resolves
   synchronously, same turn, like LEO. Mars days (210, reusing LOGI_TRANSIT_DAYS.mars's existing one-way
   figure) crosses that threshold — proceedLaunch's EXISTING missionDays>=DEFER_CRUISE_DAYS branch
   automatically defers it into state.activeFlights with full cruise telemetry / abort-in-cruise /
   mishap-pool eligibility, with ZERO new deferred-flight code: it's a normal ctx-bearing flight record,
   resolved on arrival via the same pumpFlightArrivals()→beginResolve()→finalizeLaunch() chain any other
   deferred mission uses — m.deliverModule's dock-on-success hook (Slice 1) fires identically either way.
   Deliberately NOT window-gated (unlike the authored Mars missions) — payout is 0 either way, so synodic
   timing has no economic stake here; a documented simplification, not an oversight. */
// Generates a real, flyable delivery mission (reuses the E1.3 procedural-contract machinery: proc:true,
// lives in state.contractOffers, resolved via missionById/finalizeLaunch's m.proc consumption) and takes
// the player straight to the bench with it active. Re-selecting an already-pending delivery (rather than
// creating a duplicate) if they navigate away and click again.
function flyModuleDelivery(facId, modId){
  const existing=pendingModuleDelivery(facId, modId);
  if(existing){ selectMission(existing.id); return; }
  const chk=canFlyModuleDelivery(facId, modId); if(!chk.ok) return;
  const def=facilityById(facId), md=stationModuleDef(modId);
  state.mdSeq=(state.mdSeq||0)+1;
  const id='md_'+state.mdSeq;
  const cargoTxt=`${md.name.toLowerCase()} (${md.stats.mass.toFixed(1)} t)`, payTxt=`Pays only the module's base cost (${fM(chk.cost)}) on success — no contracted-delivery premium, but you're footing the launch.`;
  const base={ id, proc:true, deliverModule:{facId, modId}, moduleCost:chk.cost, crew:0, minRep:0, payout:0, rep:0,
    name:`Deliver ${md.name} — ${def.name}` };
  let offer;
  if(def.body==='moon'){
    offer=Object.assign(base, { days:8, modules:['lv','transfer'], cargo:md.stats.mass,
      profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Lunar Injection', dv:3120, by:'transfer'},{name:'Lunar Orbit Insertion', dv:900, by:'transfer'}],
      blurb:`A real cargo cruise: loft the ${cargoTxt} to lunar orbit and dock it at ${def.name} on arrival — one-way, no return burn needed. ${payTxt}` });
  }else if(def.body==='mars'){
    offer=Object.assign(base, { days:210, modules:['lv','transfer'], cargo:md.stats.mass,
      profile:[{name:'Ascent to LEO', dv:9400, by:'lv'},{name:'Trans-Mars Injection', dv:3600, by:'transfer'},{name:'Mars Orbit Insertion', dv:1400, by:'transfer'}],
      blurb:`A real cargo cruise: loft the ${cargoTxt} toward Mars and dock it at ${def.name} on arrival — a ~210-day one-way cruise (the flight departs and resolves on arrival; you'll see it in the cruise telemetry panel). ${payTxt}` });
  }else{ // earth/LEO — Slice 1's simple synchronous mission, unchanged
    offer=Object.assign(base, { days:0, reqDv:9400, payload:md.stats.mass,
      blurb:`A real delivery flight: loft the ${cargoTxt} to ${def.name} and dock it on arrival. ${payTxt}` });
  }
  (state.contractOffers=state.contractOffers||[]).push(offer);
  selectMission(id);
}

function facilityProduction(def, fs){
  const list=facilityModuleList(fs), mult=facilityBodyMult(def);
  const pw=facilityPower(fs), starve=pw.net<0?0.6:1; // power-starved stations run at 60%
  const crew=facilityCrew(fs), syn=facilitySynergyMult(fs);
  const sum={income:0,fuel:0,rep:0,sci:0};
  list.forEach((id,i)=>{ if(i===0) return; const d=stationModuleDef(id); if(d&&d.prod) for(const k in sum) sum[k]+=(d.prod[k]||0); });
  const maint=stationMaintenanceFactor(fs);
  const add=(k)=> ((def.base[k]||0) + sum[k]*mult)*starve*crew.factor*maint*(syn[k]||1);
  return {income:round2(add('income')), fuel:round2(add('fuel')), rep:round2(add('rep')), sci:round2(add('sci')),
    modules:list.length, powerNet:pw.net, crew, synergies:facilitySynergies(fs)};
}
// home-field bonus for missions to a body that hosts one of your bases
function facilityBonus(body){
  const def=FACILITY_DEFS.find(f=>f.body===body);
  if(!def || !facilityBuilt(def.id)) return {buildDiscount:0, relBump:0};
  const mod=Math.max(1, facilityState(def.id).modules||1);
  return {buildDiscount:Math.min(0.25, 0.05*mod), relBump:Math.min(0.03, 0.008*mod)};
}
function expandCost(id){ const def=facilityById(id), fs=facilityState(id); const mod=(fs&&fs.modules)||1; return round2(def.foundCost*0.45*mod); }
function expandMonths(def){ return Math.max(2, Math.round(def.foundMonths*0.4)); }
function totalFacilityIncome(){ let s=0; for(const id in (state.facilities||{})){ if(facilityBuilt(id)) s+=facilityProduction(facilityById(id), facilityState(id)).income*facilitySupplyFactor(id); } return s; }
/* ---------- CE4(b): standing resupply obligations — a base is a commitment, not a trophy ----------
   A crewed outpost is not a one-time win: it consumes consumables every month and must be
   resupplied or it decays. Each built facility carries a supply meter (months of provisions);
   `advance()` burns one month per calendar month. While stocked it produces normally; once it
   runs dry it runs on emergency reserves (output cut to FAC_STARVE_PROD), bleeds reputation and
   public support every month, and after FAC_STARVE_ABANDON_MONTHS of neglect the crew evacuate a
   module — and a single-module outpost is abandoned outright. Resupply is a contracted launch
   whose cost scales with size AND distance (a Mars run costs far more than a LEO top-up), so the
   bigger and farther your empire, the heavier the standing logistics burden. Derived from a new
   per-facility `supply` field defaulting to full for legacy saves, so nothing already built is
   retroactively starved; a fresh company has no facilities, so the early game is untouched. */
const FAC_SUPPLY_MONTHS=8;            // a fully-provisioned facility holds 8 months of consumables
const FAC_RESUPPLY_PER_MODULE=0.95;  // $M to fully provision one module from empty (before distance)
const FAC_STARVE_PROD=0.4;           // production multiplier while a facility is starved (out of supply)
const FAC_STARVE_REP=2;              // reputation lost each month a crewed facility goes unsupplied
const FAC_STARVE_SUPPORT=1.5;        // public support lost per starved month
const FAC_STARVE_ABANDON_MONTHS=6;   // consecutive starved months before crew evacuate a module
const BODY_RESUPPLY_MULT={earth:1.0, moon:2.2, mars:4.2}; // launch-logistics multiplier by destination
function bodyResupplyMult(body){ return BODY_RESUPPLY_MULT[body]||1; }
// Slice 2.1: resupply cruise time by destination body. Earth/Moon top up instantly (< DEFER_CRUISE_DAYS);
// Mars ships across a Hohmann-class transit and arrives ~210 d later as a live logistics flight. No existing
// one-way Earth→Mars constant to reuse (mars_flyby.days:420 is a round trip), so 210 d is a fresh figure.
const LOGI_TRANSIT_DAYS={earth:0, moon:4, mars:210};
function logiTransitDays(body){ return LOGI_TRANSIT_DAYS[body]||0; }
function facilitySupply(id){ const fs=facilityState(id); if(!fs) return 0; return fs.supply!=null?fs.supply:FAC_SUPPLY_MONTHS; } // legacy facilities default to fully provisioned
function facilitySupplyDrain(){ return 1; } // one month of provisions consumed per calendar month
function facilityStarved(id){ return facilityBuilt(id) && facilitySupply(id)<=0; }
function facilitySupplyFactor(id){ return facilityStarved(id)?FAC_STARVE_PROD:1; } // starved bases run at reduced output
function facilitySupplyMonths(id){ return Math.round(facilitySupply(id)); } // months of runway remaining
// Slice 2.2: resupply cost now floats with the live propellant market and cryo boil-off.
const LOGI_FUEL_FRAC=0.45;           // fraction of a resupply's cost that is propellant (rest: food/spares/crew consumables)
// Shared cryogenic boil-off rates — used by BOTH the mission simulator (computeMissionOutcome) and the resupply cost model.
const BOILOFF_RATE_BASE=0.015;       // per month, uncontrolled LH₂ (CH₄ at half); the flat resupply cost implicitly assumes this rate
const BOILOFF_RATE_CONTROLLED=0.004; // per month, with cryo_boiloff_control research (~4× cut)
const BOILOFF_CAP=0.30;              // max fractional propellant loss over a cruise
function boiloffMargin(months, controlled){ // extra-propellant factor needed to still arrive full after boil-off
  const rate=controlled?BOILOFF_RATE_CONTROLLED:BOILOFF_RATE_BASE;
  const frac=Math.min(BOILOFF_CAP, rate*months); // linear accrual + cap, identical to the sim's loss model
  return 1/(1-frac);
}
const FUEL_BUY_BASE=round2(FUEL_BASE*(1+FUEL_SPREAD)); // baseline buy price the flat resupply cost implicitly assumed
function resupplyCostFull(id){ const def=facilityById(id), fs=facilityState(id); if(!def||!fs) return 0; const mod=Math.max(1,fs.modules||1); const fission=state.research.surface_fission_power?0.75:1; /* a base that makes its own power ships fewer consumables */ const grn=Math.max(0.5, 1-0.15*facilityGreenhouses(fs)); /* greenhouses grow food on-site */ const feedMod=Math.max(1, mod-facilityGreenhouses(fs)); /* a greenhouse feeds itself */
  const base=FAC_RESUPPLY_PER_MODULE*feedMod*bodyResupplyMult(def.body)*fission*grn; // pre-2.2 flat cost
  // 2.2: fold in the live fuel market (marketRatio) and cryo boil-off margin (boiloffRatio) on the propellant fraction only.
  const marketRatio=fuelBuyPrice()/FUEL_BUY_BASE;                         // 1.0 at baseline fuel price → neutral
  const months=logiTransitDays(def.body)/30;                             // cruise duration; ~0 for LEO/Moon → neutral
  const controlled=!!state.research.cryo_boiloff_control;
  const boiloffRatio=boiloffMargin(months, controlled)/boiloffMargin(months, false); // 1.0 without cryo (base assumes uncontrolled); <1 with cryo → discount
  return round2(base*(1-LOGI_FUEL_FRAC + LOGI_FUEL_FRAC*marketRatio*boiloffRatio));
}
function resupplyCost(id){ const missing=Math.max(0, FAC_SUPPLY_MONTHS-facilitySupply(id)); return round2(resupplyCostFull(id)*(missing/FAC_SUPPLY_MONTHS)); } // pay for what you actually ship up
// Slice 2.1: a resupply shipment already in cruise toward this facility (Mars only, in practice)
function resupplyInTransit(id){ return (state.activeFlights||[]).find(f=>f&&f.kind==='logistics'&&f.facId===id)||null; }
// 2.3: every resupply shipment still genuinely in cruise (not yet at its arrival) — the reqLogi gate + mishap target pool
function logiFlightsInTransit(){ return (state.activeFlights||[]).filter(f=>f&&f.kind==='logistics'&&f.deferred&&absDay()<(f.arriveAbs||0)); }
function canResupply(id){
  if(!facilityBuilt(id)) return {ok:false,why:'No facility.'};
  if(resupplyInTransit(id)) return {ok:false,why:'Resupply en route.'}; // 2.1: one shipment in flight at a time
  if(facilitySupply(id)>=FAC_SUPPLY_MONTHS) return {ok:false,why:'Fully provisioned.'};
  if(state.money<resupplyCost(id)) return {ok:false,why:'Not enough capital.'};
  return {ok:true};
}
function resupplyFacility(id, source){
  const chk=canResupply(id); if(!chk.ok) return;
  const def=facilityById(id), fs=facilityState(id);
  const premium=source==='contract' ? (stationOps(fs).resupplyContract?.premium||STATION_RESUPPLY_CONTRACT_PREMIUM) : 0;
  const cost=round2(resupplyCost(id)*(1+premium));
  if(state.money<cost) return;
  const missing=Math.max(0, FAC_SUPPLY_MONTHS-facilitySupply(id)); // months actually shipped (matches the cost basis)
  const transit=logiTransitDays(def.body);
  state.money-=cost; // 2.1: pay on order, regardless of whether the run is instant or a live cruise
  if(transit<DEFER_CRUISE_DAYS){ // Earth/Moon: resolves instantly, byte-identical to pre-2.1 behavior
    fs.supply=FAC_SUPPLY_MONTHS; fs.starvedMonths=0;
    log('ok',`${def.icon} ${def.name} resupplied — ${FAC_SUPPLY_MONTHS} months of provisions aboard (−${fM(cost)}).`);
    render();
    return;
  }
  // Mars: the shipment becomes a live logistics flight, applied on arrival by pumpFlightArrivals()
  state.activeFlights=state.activeFlights||[];
  const launchAbs=absDay();
  state.activeFlights.push({ id:'flt'+(++_flightSeq), kind:'logistics', deferred:true, facId:id,
    monthsShipped:missing, launchAbs, arriveAbs:launchAbs+transit,
    name:`Resupply — ${def.name}`, crew:0 });
  log('note',`${def.icon} ${def.name}: resupply shipment launched${source==='contract'?' under contract':''} — arrival in ~${Math.round(transit/30)} mo (${transit} d), ${missing.toFixed(1)} mo of provisions aboard (−${fM(cost)}). The base draws down its reserves until it lands.`);
  render();
}
function tickStationOperations(){
  for(const fid in (state.facilities||{})){
    if(!facilityBuilt(fid)) continue;
    const fs=facilityState(fid), def=facilityById(fid), ops=stationOps(fs), modules=facilityModuleList(fs).length;
    if(ops.maintenanceEnabled) ops.condition=Math.max(0,stationCondition(fs)-(STATION_MAINT_DECAY_BASE+modules*STATION_MAINT_DECAY_PER_MODULE));
    if(ops.crewManaged && stationRotationDue(fs) && ops.rotationNotifiedAbs!==absMonth()){
      const names=stationCrewIds(fs).map(id=>personById(id)?.name||id).join(', ')||'station crew';
      log('note',`${def.icon} ${def.name}: crew rotation due for ${names}.`);
      ops.rotationNotifiedAbs=absMonth();
    }
    const c=ops.resupplyContract;
    if(c && absMonth()>=c.untilAbs){ ops.resupplyContract=null; log('note',`${def.icon} ${def.name}: resupply contract expired.`); }
    const contractCost=round2(resupplyCost(fid)*(1+(ops.resupplyContract?.premium||STATION_RESUPPLY_CONTRACT_PREMIUM)));
    if(stationContractActive(fs) && facilitySupply(fid)<=AUTO_RESUPPLY_THRESHOLD && canResupply(fid).ok && state.money>=contractCost){
      resupplyFacility(fid, 'contract');
    }
  }
}
// Slice 2.4: per-facility auto-reorder. When fs.autoResupply is ON, the monthly tick auto-fires
// resupplyFacility() the moment supply falls to/below this many months — identical cost/gate/lifecycle
// to a manual order (respects canResupply, so it never double-orders while a shipment is in transit and
// never fires if the base can't afford it). Easy to retune: 6 (of FAC_SUPPLY_MONTHS=8) leaves a ~2-month
// reaction buffer on instant LEO/Moon bodies and fires as early as the shortfall-shipped model usefully
// can for Mars (a single in-flight shipment carries only the shortfall, so Mars stays marginal by design).
const AUTO_RESUPPLY_THRESHOLD=6;
function toggleAutoResupply(id){ const fs=facilityState(id); if(!fs) return; fs.autoResupply=!fs.autoResupply; const def=facilityById(id); log('info',`${def.icon} ${def.name}: auto-resupply ${fs.autoResupply?'enabled':'disabled'}.`); render(); }
function canFound(id){
  const def=facilityById(id); if(!def) return {ok:false,why:'Unknown facility.'};
  if(facilityBuilt(id)) return {ok:false,why:'Already established.'};
  if(def.reqMission && !state.completed[def.reqMission]) return {ok:false,why:`Requires a completed ${MISSIONS.find(m=>m.id===def.reqMission).name}.`};
  if(state.money<def.foundCost) return {ok:false,why:'Not enough capital.'};
  return {ok:true};
}
function foundFacility(id){
  const chk=canFound(id); if(!chk.ok) return;
  const def=facilityById(id);
  state.money-=def.foundCost;
  advance(def.foundMonths); // construction — facility is not yet producing
  if(state.over){ render(); return; }
  state.facilities[id]={built:true, modules:1, since:state.year, supply:FAC_SUPPLY_MONTHS, starvedMonths:0, autoResupply:false, maintenanceEnabled:true, condition:STATION_MAINT_MAX, crewIds:[], crewManaged:false, rotationDueAbs:absMonth()+STATION_ROTATION_MONTHS}; // CE4(b): founded fully provisioned; 2.4: auto-resupply opt-in, off by default
  log('ok',`★ ${def.name} established — your first permanent presence at ${BODIES.find(b=>b.id===def.body).name}. It will grow and produce for decades.`);
  render();
}
function expandFacility(id){
  if(!facilityBuilt(id)) return;
  const def=facilityById(id), cost=expandCost(id);
  if(state.money<cost) return;
  state.money-=cost;
  advance(expandMonths(def)); // construction at the current module count
  if(state.over){ render(); return; }
  const fs=facilityState(id); facilityModuleList(fs).push('can_std'); fs.modules=fs.moduleList.length;
  fs.supply=FAC_SUPPLY_MONTHS; fs.starvedMonths=0; // CE4(b): the expansion ships up fresh provisions
  const pr=facilityProduction(def, fs);
  log('ok',`${def.name} expanded to ${fs.modules} modules — now +${fM(pr.income)}/mo${pr.fuel>0?`, +${pr.fuel.toFixed(1)} t fuel/mo`:''}.`);
  render();
}
/* ---------- #7: Manufacturing capacity helpers & actions ---------- */
function prodDef(key){ return PRODUCTION_DEFS.find(d=>d.key===key); }
function prodLevel(key){ return Math.max(1, (state.production&&state.production[key])||1); }
// integration "units" a vehicle needs — the same components buildMonths counts, +1 core
function vehicleUnits(m){
  let extra=Math.max(0, state.stages.length-1);
  if(boostersFitted()) extra+=state.boosters.count; // each strap-on is an integration unit
  if(m && m.profile){
    if(m.modules.includes('transfer')) extra+=1;
    if(m.modules.includes('lander')) extra+=1;
    if(m.modules.includes('crew')) extra+=1;
  }
  extra+=assemblyFlights(m);
  return extra+1;
}
function bayCapacity(){ return BAY_CAP_BASE + BAY_CAP_PER*(prodLevel('bays')-1); }
// build-time months added (overstretch) or removed (roomy plant) by assembly-bay capacity
function bayBuildDelta(m){
  const units=vehicleUnits(m), cap=bayCapacity();
  if(units>cap) return units-cap;                       // overstretched: +1 mo per unit over
  return -Math.min(BAY_SPEED_CAP, Math.floor((cap-units)/3)); // surplus: streamlined, bounded
}
function foundryCostMult(){ return Math.max(FOUNDRY_FLOOR, 1 - FOUNDRY_PER*(prodLevel('foundry')-1)); }
function padLaunchMult(){ return Math.max(PAD_FLOOR, 1 - PAD_PER*(prodLevel('pads')-1)); }
// CE2 slice (b) — launch CADENCE. A launch normally costs a calendar month (advance(+1)).
// Extra pads let *prebuilt, rapid* launches (hangar vehicle, no test campaign, no rehearsal,
// no transfer window) share a month: the first flight of a month advances the calendar; up to
// launchPadCap()-1 further flights that same month fly in parallel off the other pads with no
// extra month charged. So launches/month == Launch Pads level — a late juggernaut sustains a
// tempo (5/mo at L5) a one-pad startup (1/mo, today's exact behavior) can't match. This is
// throughput growth, not a stat buff: Δv/reliability are untouched. Build throughput already
// scales the same way via buildSlots()==Assembly Bays (parallel in-progress orders).
function launchPadCap(){ return prodLevel('pads'); }                 // flights you can fly in one calendar month
function curMonthPadUsed(){ return state.padMonthAbs===absMonth() ? (state.padMonthUsed||0) : 0; } // slots reset each new month
function padSlotsLeft(){ return Math.max(0, launchPadCap()-curMonthPadUsed()); }
// a prebuilt, rapid flight can share the month iff a pad already flew this month and a slot is free
function canParallelLaunch(prebuilt, tl, rehMo, buildMo, m){
  if(!prebuilt || buildMo>0 || rehMo>0) return false;               // real multi-month work can't be parallelised
  if(tl && tl.months>0) return false;                               // a test campaign serialises the flight
  if(m && m.window) return false;                                   // a transfer window pins the launch to its date
  const used=curMonthPadUsed();
  return used>=1 && used<launchPadCap();                            // 1st flight of the month is normal; extras up to the cap are free
}
function recordPadLaunch(){ // call AFTER the launch's advance(); stamps the calendar month this flight occupied
  if(state.padMonthAbs!==absMonth()){ state.padMonthAbs=absMonth(); state.padMonthUsed=0; }
  state.padMonthUsed=(state.padMonthUsed||0)+1;
}
// #7 slice 2: production-quality bridge into reliability (QA helps; overstretching the bays hurts)
function qaRelBonus(){ return Math.min(QA_REL_CAP, QA_REL_PER*(prodLevel('qa')-1)); }
function qaFragMult(){ return 1 - Math.min(QA_FRAG_CAP, QA_FRAG_PER*(prodLevel('qa')-1)); } // #7→#16: QA shrinks mfg-subsystem weight share; lvl 1 → 1.00, lvl 5 → 0.80
function overstretchRelPenalty(m){ const d=bayBuildDelta(m); return d>0?Math.min(OVERSTRETCH_REL_CAP, OVERSTRETCH_REL_PER*d):0; }
function productionRelMod(m){ return qaRelBonus() - overstretchRelPenalty(m); }
// #7 slice 5: build cadence. The rolling buffer is summed against sustainable throughput
// (bayCapacity units/month × CADENCE_WINDOW months). load=1.0 means you've been running flat-out;
// past that you start paying overtime, expediting parts, etc. — modeled as a buildCost surcharge.
function cadenceRecent(){ const list=state&&state.recentBuilds; if(!Array.isArray(list)) return []; const cutoff=absMonth()-CADENCE_WINDOW; return list.filter(r=>r&&r.at>cutoff); }
function cadenceUnits(){ return cadenceRecent().reduce((a,r)=>a+(r.units||0),0); }
function cadenceLoad(){ const cap=bayCapacity()*CADENCE_WINDOW; return cap>0?cadenceUnits()/cap:0; }
function cadenceSurcharge(){ const over=cadenceLoad()-1; if(over<=0) return 0; return Math.min(CADENCE_SURCHARGE_CAP, over*(CADENCE_SURCHARGE_PER/0.10)); }
// Bottleneck = whichever line is hurting the player the most right now. Bays cover both
// overstretch (single-build, too big) and cadence (long-run, too many).
function bottleneckLine(m){
  if(cadenceSurcharge()>0) return 'bays';
  if(m && bayBuildDelta(m)>0) return 'bays';
  return null;
}
/* ---------- #7 final: production queue & manifest ----------
   Decouples building from launching. Queue a vehicle from the bench: the build cost is
   paid up front and the order builds over its buildMonths during advance(), occupying a
   bay slot. Assembly Bays level sets how many orders build in PARALLEL (L1=1 → sequential,
   exactly today's feel; each level adds a slot). Finished vehicles go to the hangar and
   launch on demand, skipping the build wait — the timing lever for tight launch windows
   and sustained cadence. Total cost is identical to building on demand (no discount). */
const QUEUE_MAX=8;
function buildSlots(){ return prodLevel('bays'); }   // parallel build capacity = Assembly Bays level
function buildQueueList(){ return Array.isArray(state.buildQueue)?state.buildQueue:(state.buildQueue=[]); }
function hangarList(){ return Array.isArray(state.hangar)?state.hangar:(state.hangar=[]); }
/* E4.4: families describe designs; hulls are the individual physical vehicles.  This
   records identity without changing the existing recovery/refurbishment economics. */
function hullList(){ return Array.isArray(state.hulls)?state.hulls:(state.hulls=[]); }
function hullById(id){ return id?hullList().find(h=>h&&h.id===id):null; }
function hullSerial(n){ return 'OVH-'+String(n).padStart(4,'0'); }
function addHullEvent(h,outcome,missionId){ if(h){ h.history=Array.isArray(h.history)?h.history:[]; h.history.push({abs:absDay(),outcome,missionId:missionId||null}); if(h.history.length>24) h.history=h.history.slice(-24); } }
function makeHull(spec,source){
  const n=state.hullSeq=(state.hullSeq||0)+1, fam=spec&&spec.activeVehicle?familyById(spec.activeVehicle):null;
  const h={id:'hull_'+n,serial:hullSerial(n),familyId:(spec&&spec.activeVehicle)||null,familyName:fam?fam.name:'Untracked vehicle',builtAbs:absDay(),status:'hangar',flights:0,reuseCount:0,recoveryFitted:!!(spec&&spec.recovery),history:[]};
  addHullEvent(h,source||'rollout'); hullList().push(h); return h;
}
function assignHullToHangar(rec){
  const familyId=(rec.spec&&rec.spec.activeVehicle)||null;
  let h=(rec.spec&&rec.spec.recovery)?hullList().find(x=>x&&x.status==='recovered'&&x.familyId===familyId):null;
  if(h){ h.status='hangar'; addHullEvent(h,'refurbished',rec.missionId); }
  else h=makeHull(rec.spec,'rollout');
  rec.hullId=h.id; return h;
}
function markHullLaunched(id,missionId){ const h=hullById(id); if(h){ h.status='in-flight'; h.flights=(h.flights||0)+1; h.reuseCount=Math.max(0,h.flights-1); addHullEvent(h,'launched',missionId); } return h; }
function settleHullFlight(id,m,outcome){ const h=hullById(id); if(!h) return; const safe=/^(success|partial|scrub)$/.test(outcome||''); h.status=(safe&&h.recoveryFitted&&recoveryActive(m))?'recovered':(safe?'expended':'lost'); addHullEvent(h,h.status,m&&m.id); }
// snapshot the full bench design (incl. boosters/recovery/family) so a queued order builds
// the design as it was when ordered, even if the bench changes afterward. Also carries
// testLevel/rehearsal — irrelevant to the original build-ahead-of-time use, but load-bearing
// now that a committed Launch (see queueBuild's `committed` flag) routes through this same
// snapshot: the test campaign/rehearsal choice made at commit time must survive to the later
// Fly click even if the player changes the Bench's live toggles for a different design meanwhile.
function queueSpecSnapshot(){
  return JSON.parse(JSON.stringify({stages:state.stages, transfer:state.transfer, descent:state.descent,
    ascent:state.ascent, eclss:state.eclss, boosters:state.boosters, recovery:!!state.recovery, activeVehicle:state.activeVehicle,
    testLevel:state.testLevel, rehearsal:!!state.rehearsal}));
}
function loadOrderSpec(s){
  if(!s) return;
  if(s.stages) state.stages=JSON.parse(JSON.stringify(s.stages));
  if(s.transfer) state.transfer=JSON.parse(JSON.stringify(s.transfer));
  if(s.descent) state.descent=JSON.parse(JSON.stringify(s.descent));
  if(s.ascent) state.ascent=JSON.parse(JSON.stringify(s.ascent));
  if(s.eclss) state.eclss=s.eclss;
  if(s.boosters) state.boosters=JSON.parse(JSON.stringify(s.boosters));
  if(typeof s.recovery==='boolean') state.recovery=s.recovery;
  if('activeVehicle' in s) state.activeVehicle=s.activeVehicle;
  if(s.testLevel!=null) state.testLevel=s.testLevel;
  if(typeof s.rehearsal==='boolean') state.rehearsal=s.rehearsal;
}
// feasibility to queue: the design must be able to do the mission (same core checks as
// canLaunch, minus window/test/weather, which are resolved at launch), plus pay the build now.
function canQueue(m,v,sim){
  if(!m) return {ok:false,why:'no mission'};
  if(m.tanker){
    if(v.totalDv < m.reqDv) return {ok:false,why:'Δv shortfall'};
    if(v.twr<=1.0) return {ok:false,why:'TWR ≤ 1'};
  }else if(m.profile){
    const pw=powerViable(m); if(!pw.ok) return {ok:false,why:pw.why};
    if(!sim||!sim.ok) return {ok:false,why:'a mission leg falls short'};
  }else{
    if(v.totalDv < effectiveReqDv(m)) return {ok:false,why:'Δv shortfall'};
    if(v.twr<=1.0) return {ok:false,why:'TWR ≤ 1'};
  }
  if(buildQueueList().length>=QUEUE_MAX) return {ok:false,why:'queue full'};
  if(state.money < v.buildCost) return {ok:false,why:'can’t afford the build'};
  return {ok:true};
}
// `committed` (new): true when this build was started by a "Launch" commit rather than the
// build-ahead-of-time "Queue this build" button — same machinery either way, just a clearer
// log line and an order flag the Command Center progress card can use if it ever wants to
// distinguish them (it currently doesn't need to).
function queueBuild(committed){
  const m=curMission(); const v=computeVehicle(); const sim=m&&m.profile?simulateMission(m):null;
  const chk=canQueue(m,v,sim); if(!chk.ok){ return; }
  state.money-=v.buildCost;                       // build cost committed up front
  consumeMaterialsForBuild();                     // #7 s7: draw materials now (the build is starting)
  buildQueueList();                               // ensure array
  state.recentBuilds=state.recentBuilds||[];      // #7 s5: cadence load is incurred when work begins
  state.recentBuilds.push({at:absMonth(), units:vehicleUnits(m)});
  const _cut=absMonth()-CADENCE_WINDOW; state.recentBuilds=state.recentBuilds.filter(r=>r&&r.at>_cut);
  const mo=buildMonths(m);
  const fam=activeFamily();
  const order={ id:'ord'+(state.orderSeq=(state.orderSeq||0)+1),
    name:(fam?fam.name:'Vehicle')+' — '+m.name, missionId:m.id, missionName:m.name,
    spec:queueSpecSnapshot(), units:vehicleUnits(m), monthsTotal:mo, monthsLeft:mo, cost:v.buildCost, started:false, committed:!!committed };
  state.buildQueue.push(order);
  log('note', committed
    ? `Launch committed: ${order.name} — building now (${mo>0?mo+' mo':'<1 mo'}, ${fM(order.cost)}). Fly it from the hangar once it rolls out.`
    : `Manufacturing — queued ${order.name} (${mo} mo, ${fM(order.cost)}). It builds while you work.`);
  render();
}
// runs each month in advance(): fill bay slots FIFO, progress active orders, retire finished ones to the hangar
// Time Granularity slice 3c: builds progress per DAY (parallel to per-day R&D). Slot assignment
// (FIFO into free bays) runs daily too, so an order starts the moment a bay frees. 30 days of
// perDay(1) = one month — the old monthly cadence — but step-by-day now visibly advances the build.
function tickBuildQueue(){
  const q=buildQueueList(); if(!q.length) return;
  let active=q.filter(o=>o.started).length;
  for(const o of q){ if(active>=buildSlots()) break; if(!o.started){ o.started=true; active++; } }
  const done=[];
  for(const o of q){ if(o.started){ o.monthsLeft-=perDay(1); if(o.monthsLeft<=0) done.push(o); } }
  if(done.length){
    for(const o of done){
      const ready={id:o.id, name:o.name, missionId:o.missionId, missionName:o.missionName, spec:o.spec, units:o.units, builtMonth:absMonth()};
      assignHullToHangar(ready); hangarList().push(ready);
      log('ok',`Manufacturing — ${o.name} rolled out, ready to fly.`);
    }
    if(done.length) timeInterrupt(); // smart time: a finished vehicle is a decision point
    state.buildQueue=q.filter(o=>o.monthsLeft>0);
  }
}
function cancelOrder(id){
  const q=buildQueueList(); const i=q.findIndex(o=>o.id===id); if(i<0) return;
  const o=q[i];
  if(!o.started){ state.money+=o.cost; log('note',`Manufacturing — cancelled ${o.name}; ${fM(o.cost)} refunded (build not yet started).`); }
  else { log('note',`Manufacturing — scrapped ${o.name} mid-build; the committed ${fM(o.cost)} is lost.`); }
  q.splice(i,1); render();
}
function scrapHangar(id){
  const h=hangarList(); const i=h.findIndex(x=>x.id===id); if(i<0) return;
  log('note',`Manufacturing — scrapped ${h[i].name} from the hangar.`);
  h.splice(i,1); render();
}
function hangarToBench(id){ const h=hangarList().find(x=>x.id===id); if(h){ state.activeMission=h.missionId; setTab('bench'); } }
function hangarFor(m){ return m?hangarList().filter(h=>h.missionId===m.id):[]; }
// launch a finished vehicle: load its snapshot into the bench, validate, then fly prebuilt
function launchFromHangar(id){
  const h=hangarList().find(x=>x.id===id); if(!h) return;
  state.activeMission=h.missionId; loadOrderSpec(h.spec);
  const m=curMission(), v=computeVehicle(), sim=m&&m.profile?simulateMission(m):null;
  const chk=canLaunch(v,m,sim,true); // prebuilt-aware (build cost already paid)
  if(!chk.ok){ log('note',`Can’t fly ${h.name}: ${chk.why}`); render(); return; }
  state.hangar=hangarList().filter(x=>x.id!==id); // consumed by this flight
  markHullLaunched(h.hullId, h.missionId);
  launch(true, h.hullId);
}
// ---------- CE2 slice (c): the JUGGERNAUT capstone — standing, self-funding production ----------
// The payoff for maxing the whole production tree. A juggernaut (all four production lines at
// PROD_MAX_LEVEL *and* the automated_factory research node — "the line that builds itself")
// unlocks a qualitatively new VERB: designate ONE proven design for STANDING PRODUCTION and the
// factory builds it on its own — a finished copy rolls into the hangar every month (instant: the
// self-replicating-line fantasy), up to a stock cap that scales with launch cadence, paying full
// build cost each time and never dipping below a cash reserve. Set-and-forget: paired with slice
// (b) launch cadence it sustains a standing megafleet no hand-queued company could. It can't print
// money (it SPENDS capital to make vehicles) and is bounded by the stock cap + reserve — no runaway.
const STANDING_RESERVE = 3.0;                 // never auto-spend below this much cash on hand
function isJuggernaut(){
  for(const d of PRODUCTION_DEFS){ if(prodLevel(d.key) < PROD_MAX_LEVEL) return false; }
  return !!(state.research && state.research.automated_factory);
}
function standingStockCap(){ return Math.max(2, launchPadCap()*2); } // keep ~2 months of launch tempo stocked
function standingHangarCount(){ const sp=state.standingProd; if(!sp) return 0; return hangarList().filter(h=>h.missionId===sp.missionId).length; }
// snapshot the CURRENT bench design as the standing line (must be a juggernaut + a flyable design)
function setStandingProduction(missionId){
  if(!isJuggernaut()) return;
  const m = (missionId && missionById(missionId)) || curMission(); if(!m || m.proc) return; // E1.3: procedural contracts expire/rotate — not a fit for a standing repeat-build line
  const v = computeVehicle(); const sim=m.profile?simulateMission(m):null;
  const chk=canQueue(m,v,sim); if(!chk.ok && chk.why!=='can’t afford the build' && chk.why!=='queue full'){ log('note',`Can’t set standing production: ${chk.why}`); return; }
  const fam = activeFamily();
  state.standingProd = { missionId:m.id, missionName:m.name, name:(fam?fam.name:'Vehicle')+' — '+m.name,
    spec:queueSpecSnapshot(), units:vehicleUnits(m), buildCost:round2(v.buildCost), enabled:true };
  log('ok',`🏭 Standing production online — ${state.standingProd.name}. The line builds itself now, ${fM(state.standingProd.buildCost)}/copy, up to ${standingStockCap()} in stock.`);
  render();
}
function toggleStandingProduction(){ if(state.standingProd){ state.standingProd.enabled=!state.standingProd.enabled; log('note',`Standing production ${state.standingProd.enabled?'resumed':'paused'}.`); render(); } }
function clearStandingProduction(){ if(state.standingProd){ log('note',`Standing production line cleared (${state.standingProd.name}).`); state.standingProd=null; render(); } }
// runs each month in advance(): the line rolls one finished copy into the hangar if there's stock
// room and cash stays above the reserve. Pays full build cost and logs cadence load — real work.
function tickStandingProduction(){
  const sp=state.standingProd;
  if(!sp || !sp.enabled || !isJuggernaut()) return;
  if(standingHangarCount() >= standingStockCap()) return;        // stock full — idle until a copy is flown
  if(state.money - sp.buildCost < STANDING_RESERVE) return;      // protect the cash reserve
  state.money = round2(state.money - sp.buildCost);
  const ready={ id:'sp'+(state.orderSeq=(state.orderSeq||0)+1), name:sp.name, missionId:sp.missionId,
    missionName:sp.missionName, spec:JSON.parse(JSON.stringify(sp.spec)), units:sp.units, builtMonth:absMonth(), standing:true };
  assignHullToHangar(ready); hangarList().push(ready);
  state.recentBuilds=state.recentBuilds||[];                     // the standing line still loads the cadence buffer
  state.recentBuilds.push({at:absMonth(), units:sp.units});
  const _cut=absMonth()-CADENCE_WINDOW; state.recentBuilds=state.recentBuilds.filter(r=>r&&r.at>_cut);
}
// fire a one-time milestone the first time juggernaut status is reached (whichever action completes the set)
function checkJuggernaut(){
  if(isJuggernaut() && !state.juggernautReached){
    state.juggernautReached=true;
    log('info','🏆 JUGGERNAUT — every production line is maxed and the automated factory is online. Standing production unlocked: set a design and the line builds itself.');
  }
}
// bench affordance: a "queue this build" button + a "fly a ready hangar vehicle" shortcut
function benchQueueHTML(m){
  if(!m) return '';
  const v=computeVehicle(); const sim=m.profile?simulateMission(m):null;
  const cq=canQueue(m,v,sim); const ready=hangarFor(m); const slots=buildSlots();
  let html='';
  if(ready.length){
    html+=`<div class="flag ok" style="margin-top:6px">✓ ${ready.length} ${m.name} vehicle${ready.length>1?'s':''} built &amp; waiting — <button class="btn ghost" style="padding:2px 8px;font-size:12px" onclick="launchFromHangar('${ready[0].id}')">Fly from hangar</button> <span class="dim">skips the build wait</span></div>`;
  }
  html += cq.ok
    ? `<button class="btn ghost" style="width:100%;margin-top:6px" onclick="queueBuild()">⊕ Queue this build — ${fM(v.buildCost)} now · ${buildMonths(m)} mo${slots>1?` · ${slots} bay slots`:''}</button>`
    : `<button class="btn ghost" style="width:100%;margin-top:6px" disabled>Queue build — ${cq.why}</button>`;
  return html;
}
// CE2(c): the standing-production control — only shown to a juggernaut
function standingProductionHTML(){
  if(!isJuggernaut()) return '';
  const sp=state.standingProd, cap=standingStockCap();
  let body;
  if(sp){
    const stock=standingHangarCount();
    const stateTxt = !sp.enabled ? '<span class="dim">paused</span>'
      : stock>=cap ? `<span class="dim">stock full (${stock}/${cap}) — fly a copy to resume</span>`
      : `<span class="flag-ok-text" style="color:var(--ok)">building — ${stock}/${cap} in stock · ${fM(sp.buildCost)}/copy</span>`;
    body = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0">
        <div><b>${sp.name}</b><br><span style="font-size:12px">${stateTxt}</span></div>
        <div style="display:flex;gap:4px">
          <button class="btn ghost" style="padding:2px 8px;font-size:12px" onclick="toggleStandingProduction()">${sp.enabled?'Pause':'Resume'}</button>
          <button class="btn ghost" style="padding:2px 8px;font-size:12px" onclick="clearStandingProduction()">Clear</button>
        </div></div>`;
  }else{
    const m=curMission();
    const can = m ? (()=>{ const v=computeVehicle(); const sim=m.profile?simulateMission(m):null; const c=canQueue(m,v,sim); return c.ok||c.why==='can’t afford the build'||c.why==='queue full'; })() : false;
    body = `<div style="padding:5px 0">${can
      ? `<button class="btn" style="width:100%;padding:4px 8px;font-size:12px" onclick="setStandingProduction()">⚙ Put “${m.name}” into standing production — the line auto-builds up to ${cap} copies</button>`
      : `<span class="dim" style="font-size:12px">Bench a flyable design, then set it as your standing line — the factory builds it on its own.</span>`}</div>`;
  }
  return `<div style="margin-top:12px;border-top:1px solid #3a3320;padding-top:8px">
    <div style="font-weight:600;font-size:12px;color:#e6c14a">🏭 Standing production <span class="dim" style="font-weight:400">· juggernaut capstone · self-funding line</span></div>
    ${body}</div>`;
}
function buildQueuePanelHTML(){
  const q=buildQueueList(), hangar=hangarList(), slots=buildSlots();
  const active=q.filter(o=>o.started).length;
  const orderRows = q.length ? q.map(o=>{
    const pct=Math.round(100*(o.monthsTotal-o.monthsLeft)/Math.max(1,o.monthsTotal));
    const status=o.started?`building · ${fmtTimeLeft(o.monthsLeft)} left`:'queued · waiting for a bay slot';
    return `<div style="padding:6px 0;border-top:1px solid #2a2a2a">
      <div style="display:flex;justify-content:space-between;gap:8px"><b>${o.name}</b><span class="dim" style="font-size:12px">${status}</span></div>
      <div class="bar" style="margin:4px 0;height:6px"><div class="fill" style="width:${o.started?pct:0}%;background:var(--readout)"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="dim" style="font-size:12px">${o.units} units · ${fM(o.cost)} committed</span>
      <button class="btn ghost" style="padding:2px 8px;font-size:12px" onclick="cancelOrder('${o.id}')">${o.started?'Scrap':'Cancel · refund'}</button></div>
    </div>`;
  }).join('') : `<div class="dim" style="font-size:12px;padding:6px 0">No builds in progress. Queue a vehicle from the Design Bench to build it ahead of launch.</div>`;
  const hangarRows = hangar.length ? hangar.map(h=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #2a2a2a">
      <div><b>${h.name}</b> <span class="dim" style="font-size:12px">· ${h.missionName}</span></div>
      <div style="display:flex;gap:4px"><button class="btn ghost" style="padding:2px 8px;font-size:12px" onclick="hangarToBench('${h.id}')">Bench</button>
      <button class="btn" style="padding:2px 8px;font-size:12px" onclick="launchFromHangar('${h.id}')">Fly</button>
      <button class="btn ghost" style="padding:2px 8px;font-size:12px" onclick="scrapHangar('${h.id}')">Scrap</button></div>
    </div>`).join('') : `<div class="dim" style="font-size:12px;padding:6px 0">Hangar empty — finished vehicles wait here, ready to launch on demand.</div>`;
  return `<div class="card" style="background:var(--panel2);margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <div class="mission-name" style="font-size:14px">🏗 Production queue &amp; manifest${isJuggernaut()?' <span style="font-size:11px;color:#e6c14a;border:1px solid #e6c14a;border-radius:3px;padding:0 4px;vertical-align:middle">JUGGERNAUT</span>':''}</div>
      <div class="dim" style="font-size:12px">${active}/${slots} bay slot${slots>1?'s':''} active · Assembly Bays sets parallel slots</div>
    </div>
    <p class="muted" style="font-size:12px;margin:4px 0 6px">Pre-build vehicles so they're ready when you are — hit tight launch windows and sustain cadence. Build cost is paid up front; flying from the hangar skips the build wait.</p>
    <div style="font-weight:600;font-size:12px;margin-top:6px">Build queue</div>
    ${orderRows}
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:10px">
      <div style="font-weight:600;font-size:12px">Hangar — ready to fly (${hangar.length})</div>
      <div class="dim" style="font-size:12px" title="Launch Pads set how many prebuilt rapid flights share one calendar month. Extra flights this month fly off the other pads with no added wait.">🛫 ${launchPadCap()}/mo cadence${curMonthPadUsed()>0?` · ${padSlotsLeft()} pad${padSlotsLeft()===1?'':'s'} free this month`:''}</div>
    </div>
    ${hangarRows}
    ${standingProductionHTML()}
  </div>`;
}
// #7 slice 6: raw-material supply chains. Each commodity wanders on a spot market;
// a contract trades a small premium for predictability over a year.
function defaultMaterialsState(){ const o={}; for(const d of MATERIAL_DEFS) o[d.key]={spot:1.0, prev:1.0, contract:null, stock:0, avgCost:1.0, history:[]}; return o; }
function materialDef(key){ return MATERIAL_DEFS.find(d=>d.key===key); }
function materialState(key){ const ms=state&&state.materials; if(!ms) return null; if(!ms[key]) ms[key]={spot:1.0, prev:1.0, contract:null, stock:0, avgCost:1.0, history:[]}; const s=ms[key]; if(typeof s.stock!=='number') s.stock=0; if(typeof s.avgCost!=='number') s.avgCost=1.0; if(!Array.isArray(s.history)) s.history=[]; return s; }
function materialEffectivePrice(key){
  const s=materialState(key); if(!s) return 1.0;
  if(s.stock>=1) return s.avgCost; // #7 slice 7: this build pulls from inventory at the price you paid
  if(s.contract && s.contract.monthsLeft>0) return s.contract.lockedPrice;
  return s.spot;
}
// Collapsed market — the only remaining player action. A commodity dips into the buying band
// (spot <= MATERIAL_DIP_THRESHOLD) roughly as often as the mean-reverting walk touches its floor;
// when it does, one bulk buy tops the yard up at a further discount below the already-low spot.
// Outside the dip band there's nothing to click — routine per-unit buying and the 12-mo lock
// (weak-pull surfaces per the 2026-07-02 audit) were retired; consumeMaterialsForBuild/avgCost
// pricing is unchanged so existing stock, saves, and build-cost math all still work exactly as before.
function materialUnitBuyCost(key){ const s=materialState(key), d=materialDef(key); if(!s||!d) return 0; return round2(d.share*s.spot*MATERIAL_STOCK_UNIT_BUILD); }
function isMaterialDip(key){ const s=materialState(key); return !!(s && s.spot<=MATERIAL_DIP_THRESHOLD); }
function materialDipUnitCost(key){ const s=materialState(key), d=materialDef(key); if(!s||!d) return 0; return round2(d.share*s.spot*(1-MATERIAL_DIP_BONUS)*MATERIAL_STOCK_UNIT_BUILD); }
function materialDipUnits(key){ const s=materialState(key); if(!s) return 0; return Math.max(0, Math.min(MATERIAL_DIP_BATCH, MATERIAL_STOCK_CAP-s.stock)); }
function materialDipTotal(key){ return round2(materialDipUnitCost(key)*materialDipUnits(key)); }
function canBuyMaterialDip(key){
  const s=materialState(key); if(!s) return {ok:false,why:'No market data.'};
  if(!isMaterialDip(key)) return {ok:false,why:'Not currently discounted.'};
  const units=materialDipUnits(key); if(units<=0) return {ok:false,why:`Yard cap is ${MATERIAL_STOCK_CAP} builds worth.`};
  const cost=materialDipTotal(key);
  if(state.money<cost) return {ok:false,why:'Not enough capital.'};
  return {ok:true,cost,units};
}
function buyMaterialDip(key){
  const chk=canBuyMaterialDip(key); if(!chk.ok) return;
  const s=materialState(key), d=materialDef(key), units=chk.units;
  state.money-=chk.cost;
  const newStock=s.stock+units;
  s.avgCost = round2((s.stock*s.avgCost + units*materialDipUnitCost(key))/newStock);
  s.stock=newStock;
  log('ok', `Supply — ${d.name} on sale at ${s.spot.toFixed(2)}× spot: bulk-bought ${units} builds-worth at ${materialDipUnitCost(key).toFixed(2)}× (${fM(chk.cost)}). Stock ${s.stock} · avg ${s.avgCost.toFixed(2)}×.`);
  render();
}
// Consumes one build's worth from each commodity's stock if available. Avg cost is unchanged
// (we're removing units at the current avg). Returns a {key:drewFromStock} map for diagnostics.
function consumeMaterialsForBuild(){
  const drew={};
  for(const d of MATERIAL_DEFS){
    const s=materialState(d.key);
    if(s && s.stock>=1){ s.stock=round2(s.stock-1); drew[d.key]=true; }
    else drew[d.key]=false;
  }
  return drew;
}
/* ---------- #7 sub-assemblies: the Engine Yard ----------
   Named engines you pre-manufacture during downtime and stock. A vehicle build draws matching
   engines from the yard, cutting assembly TIME (the engines are already made) — and since you paid
   for them when you stocked them, the at-launch build cost drops by exactly what you pre-paid, so
   the total is unchanged (a cadence/timing tool, not a discount). Pairs with day-granular time +
   windows: build engines while you wait out a transfer window, then assemble fast when it opens. */
const ENGINE_BUILD_DAYS_BASE=20;      // days to manufacture one engine at foundry L1
const ENGINE_BUILD_DAYS_PER_FOUNDRY=3;// each foundry level shaves this off
const ENGINE_BUILD_DAYS_MIN=6;        // floor on per-engine build time
const ENGINE_ASSEMBLY_SAVE_DAYS=6;    // days shaved off a vehicle's assembly per pre-built engine fitted
const ENGINE_BUILD_FLOOR_DAYS=8;      // a vehicle still needs this much assembly even with every engine on hand
const ENGINE_STOCK_CAP=24;            // yard holds at most this many of one engine type
// #7 sub-assemblies slice 3 — bench-tested / flight-proven components. A stocked component can be
// run through a proof/static-fire campaign during downtime: it costs more and takes longer, but a
// bench-tested component fitted to a build adds a reliability bump to that flight (heritage you can
// bank). Default (untested) stock is unchanged → balance-neutral when you never bench-test.
const BENCH_TEST_COST_MULT=0.6;       // bench-testing adds this fraction of the component's unit cost
const BENCH_TEST_DAYS_MULT=0.5;       // …and this fraction of its build time (the test campaign)
const BENCH_REL_PER=0.015;            // each fitted bench-tested component adds +1.5% flight reliability
const BENCH_REL_CAP=0.06;             // …capped at +6% from proven hardware on hand
function engineUnitCost(engId){ const e=ENGINES[engId]; return e? round2(e.cost*diff().buildCostMult) : 0; } // stock charge == vehicle-build credit → cost-neutral
// #7 sub-assemblies: a propulsion-type icon for each engine so the yard reads at a glance
function engineIcon(engId){ const e=ENGINES[engId]||{};
  if(e.solid) return '🧨';                              // solid motor
  if(e.transferOnly && e.lowThrust) return '⚡';         // ion / Hall / NEP electric
  if(e.transferOnly) return '☢️';                       // nuclear-thermal (NERVA)
  if(/LH₂/.test(e.prop||'')) return '❄️';               // cryogenic hydrolox upper
  return '🔥';                                          // chemical liquid (kerolox / hypergolic / methalox)
}
function engineBuildDays(){ return Math.max(ENGINE_BUILD_DAYS_MIN, Math.round(ENGINE_BUILD_DAYS_BASE-ENGINE_BUILD_DAYS_PER_FOUNDRY*(prodLevel('foundry')-1))); }
function engineParallel(){ return prodLevel('foundry'); } // foundry level = engines built in parallel
function engineBuildBatchDays(count){ return engineBuildDays()*Math.max(1, Math.ceil(count/engineParallel())); }
function engineStockCount(engId){ const s=state.engineStock; return s? Math.max(0, Math.floor(s[engId]||0)) : 0; }
function engineStockTestedCount(engId){ const s=state.engineStockTested; return s? Math.min(engineStockCount(engId), Math.max(0, Math.floor(s[engId]||0))) : 0; } // bench-tested subset, never exceeds total
function unlockedEngines(){ return Object.keys(ENGINES).filter(id=>state.unlocked&&state.unlocked[id]); }
// every engine the current vehicle design needs (stages + boosters + transfer/lander) → {engId:count}
function vehicleEngineNeeds(m){
  const need={}, add=(eng,n)=>{ if(eng&&ENGINES[eng]&&n>0) need[eng]=(need[eng]||0)+n; };
  for(const s of (state.stages||[])) add(s.eng, s.count);
  if(boostersFitted()) add(state.boosters.eng, state.boosters.count);
  if(m && m.profile && m.modules){
    if(m.modules.includes('transfer')) add(state.transfer.eng, 1);
    if(m.modules.includes('lander')){ add(state.descent.eng,1); add(state.ascent.eng,1); }
  }
  return need;
}
// how many engines this build can pull from the yard: {draw, total, credit (cost pre-paid), saveDays}
function engineDrawForBuild(m){
  const need=vehicleEngineNeeds(m), draw={}; let total=0, credit=0, tested=0;
  for(const eng in need){ const d=Math.min(need[eng], engineStockCount(eng)); if(d>0){ draw[eng]=d; total+=d; credit+=d*engineUnitCost(eng); tested+=Math.min(d, engineStockTestedCount(eng)); } }
  return {draw, total, credit:round2(credit), saveDays:total*ENGINE_ASSEMBLY_SAVE_DAYS, tested};
}
function consumeEngineStock(draw){ state.engineStock=state.engineStock||{}; state.engineStockTested=state.engineStockTested||{};
  for(const eng in draw){ const fitTested=Math.min(draw[eng], engineStockTestedCount(eng)); // proven units are fitted (and consumed) first
    state.engineStockTested[eng]=Math.max(0, engineStockTestedCount(eng)-fitTested); state.engineStock[eng]=Math.max(0, engineStockCount(eng)-draw[eng]); } }
function canBuildEngineStock(engId, count, tested){
  count=count||1;
  if(!ENGINES[engId] || !(state.unlocked&&state.unlocked[engId])) return {ok:false, why:'Engine not unlocked.'};
  if(count<=0) return {ok:false, why:'No engines selected.'};
  if(engineStockCount(engId)+count>ENGINE_STOCK_CAP) return {ok:false, why:`Yard holds at most ${ENGINE_STOCK_CAP} of a type.`};
  const cost=round2(engineUnitCost(engId)*(tested?1+BENCH_TEST_COST_MULT:1)*count);
  if(state.money<cost) return {ok:false, why:'Not enough capital.'};
  const base=engineBuildBatchDays(count), days=base+(tested?Math.ceil(base*BENCH_TEST_DAYS_MULT):0);
  return {ok:true, cost, days};
}
function buildEngineStock(engId, count, tested){
  count=count||1;
  const chk=canBuildEngineStock(engId,count,tested); if(!chk.ok) return;
  state.money-=chk.cost;
  state.engineStock=state.engineStock||{};
  state.engineStock[engId]=engineStockCount(engId)+count;
  if(tested){ state.engineStockTested=state.engineStockTested||{}; state.engineStockTested[engId]=engineStockTestedCount(engId)+count; }
  const proven=engineStockTestedCount(engId);
  log('ok', `Engine yard — manufacturing ${count}× ${engineIcon(engId)} ${ENGINES[engId].name}${tested?' (bench-tested)':''} (${fM(chk.cost)}, ${chk.days} d). Stock now ${engineStockCount(engId)}${proven>0?` · ${proven} proven`:''}.`);
  advanceDays(chk.days); // the engines take calendar time to build (do it during downtime)
  if(!state.over){ render(); maybeShowSetback(); maybeShowMishap(); maybeShowRivalDisaster(); maybeShowEraInterstitial(); maybeShowDiscovery(); }
}
// reliability bump from bench-tested engines + structural components fitted to the current build (heritage you banked)
function benchRelBonus(m){
  if(!m) return 0;
  const e=engineDrawForBuild(m).tested||0, p=partDrawForBuild(m).tested||0;
  return Math.min(BENCH_REL_CAP, BENCH_REL_PER*(e+p));
}

/* ===== #7 sub-assemblies slice 2 — structures & habitats ==============================
   The same cadence-tool pattern as the Engine Yard, extended to the rest of the airframe:
   pre-fabricate named STRUCTURAL sub-assemblies during downtime and stock them. A vehicle
   assembly draws matching components — a stage TANK SET per stage (keyed by tank material)
   and a crew-module HABITAT per crewed flight (keyed by ECLSS tier). Cost-neutral (charged
   when stocked, credited at assembly → only the payment TIMING shifts) and each fitted
   component shaves PART_ASSEMBLY_SAVE_DAYS off the build. state.partStock is keyed by a
   composite "kind:sub" key ("tank:steel", "hab:closed"). Foundry level builds in parallel
   and shortens per-unit build time, exactly like the engine yard. */
const PART_BUILD_DAYS_BASE=16;        // days to fabricate one structural component at foundry L1
const PART_BUILD_DAYS_PER_FOUNDRY=2;  // each foundry level shaves this off
const PART_BUILD_DAYS_MIN=5;          // floor on per-component build time
const PART_ASSEMBLY_SAVE_DAYS=5;      // days shaved off assembly per pre-built component fitted
const PART_STOCK_CAP=12;              // yard holds at most this many of one component type
const TANK_UNIT_BASE=0.15;            // representative stage tank-set fabrication cost ($M, before material × difficulty)
const HAB_UNIT_BASE=0.3;             // representative crew-module pressure-vessel fabrication cost ($M)
                                     // kept modest so a fitted component's credit never exceeds even a small vehicle's buildCost
function partCompName(key){ const [kind,sub]=key.split(':');
  if(kind==='tank') return (TANK_MATERIALS[sub]||TANK_MATERIALS.standard).name+' tank set';
  if(kind==='hab')  return (ECLSS[sub]||ECLSS.open).name+' crew module';
  return key; }
// an icon per structural sub-assembly — tank materials read by their property, crew modules by their recycling tier
function partCompIcon(key){ const [kind,sub]=key.split(':');
  if(kind==='tank') return sub==='alli'?'🪶':sub==='steel'?'🔩':'🛢️';   // lightweight Al-Li / rugged steel / baseline aluminum
  if(kind==='hab')  return sub==='closed'?'🌱':sub==='partial'?'♻️':'🧑‍🚀'; // closed-loop / recovery / open-loop life support
  return '🛠️'; }
// per-unit fabrication cost — charged at stock, credited at assembly (cost-neutral, like engines)
function partCompCost(key){ const [kind,sub]=key.split(':');
  if(kind==='tank'){ const t=TANK_MATERIALS[sub]||TANK_MATERIALS.standard; return round2(TANK_UNIT_BASE*t.costMult*diff().buildCostMult); }
  if(kind==='hab'){  const t=ECLSS[sub]||ECLSS.open; return round2((HAB_UNIT_BASE+0.4*t.sysBase)*diff().buildCostMult); }
  return 0; }
function partCompBuildable(key){ const [kind,sub]=key.split(':');
  if(kind==='tank') return !!TANK_MATERIALS[sub]; // tank materials carry no research gate
  if(kind==='hab'){ const t=ECLSS[sub]; return !!(t && (!t.research || (state.research&&state.research[t.research]))); }
  return false; }
function partStockCount(key){ const s=state.partStock; return s? Math.max(0, Math.floor(s[key]||0)) : 0; }
function partStockTestedCount(key){ const s=state.partStockTested; return s? Math.min(partStockCount(key), Math.max(0, Math.floor(s[key]||0))) : 0; } // bench-tested subset
function partBuildDays(){ return Math.max(PART_BUILD_DAYS_MIN, Math.round(PART_BUILD_DAYS_BASE-PART_BUILD_DAYS_PER_FOUNDRY*(prodLevel('foundry')-1))); }
function partParallel(){ return prodLevel('foundry'); } // foundry level = components built in parallel
function partBuildBatchDays(count){ return partBuildDays()*Math.max(1, Math.ceil(count/partParallel())); }
// the structural components the catalog can stock right now (current tank material + reachable ECLSS tiers)
function stockablePartKeys(){
  const keys=['tank:'+curParts().tank];
  for(const id in ECLSS){ if(partCompBuildable('hab:'+id)) keys.push('hab:'+id); }
  return keys;
}
// every structural sub-assembly the current vehicle design needs → {compKey:count}
function vehiclePartNeeds(m){
  const need={};
  const stageN=(state.stages||[]).length + (boostersFitted()?1:0); // one tank set per stage + a booster set
  if(stageN>0) need['tank:'+curParts().tank]=stageN;
  if(m && m.crew>0) need['hab:'+state.eclss]=1; // a crewed flight needs its pressurized crew module
  return need;
}
// how many components this build can pull from the yard: {draw, total, credit (pre-paid), saveDays}
function partDrawForBuild(m){
  const need=vehiclePartNeeds(m), draw={}; let total=0, credit=0, tested=0;
  for(const key in need){ const d=Math.min(need[key], partStockCount(key)); if(d>0){ draw[key]=d; total+=d; credit+=d*partCompCost(key); tested+=Math.min(d, partStockTestedCount(key)); } }
  return {draw, total, credit:round2(credit), saveDays:total*PART_ASSEMBLY_SAVE_DAYS, tested};
}
function consumePartStock(draw){ state.partStock=state.partStock||{}; state.partStockTested=state.partStockTested||{};
  for(const key in draw){ const fitTested=Math.min(draw[key], partStockTestedCount(key)); // proven units fitted (and consumed) first
    state.partStockTested[key]=Math.max(0, partStockTestedCount(key)-fitTested); state.partStock[key]=Math.max(0, partStockCount(key)-draw[key]); } }
function canBuildPartStock(key, count, tested){
  count=count||1;
  if(!partCompBuildable(key)) return {ok:false, why:'Component not available.'};
  if(count<=0) return {ok:false, why:'Nothing selected.'};
  if(partStockCount(key)+count>PART_STOCK_CAP) return {ok:false, why:`Yard holds at most ${PART_STOCK_CAP} of a type.`};
  const cost=round2(partCompCost(key)*(tested?1+BENCH_TEST_COST_MULT:1)*count);
  if(state.money<cost) return {ok:false, why:'Not enough capital.'};
  const base=partBuildBatchDays(count), days=base+(tested?Math.ceil(base*BENCH_TEST_DAYS_MULT):0);
  return {ok:true, cost, days};
}
function buildPartStock(key, count, tested){
  count=count||1;
  const chk=canBuildPartStock(key,count,tested); if(!chk.ok) return;
  state.money-=chk.cost;
  state.partStock=state.partStock||{};
  state.partStock[key]=partStockCount(key)+count;
  if(tested){ state.partStockTested=state.partStockTested||{}; state.partStockTested[key]=partStockTestedCount(key)+count; }
  const proven=partStockTestedCount(key);
  log('ok', `Structures yard — fabricating ${count}× ${partCompIcon(key)} ${partCompName(key)}${tested?' (bench-tested)':''} (${fM(chk.cost)}, ${chk.days} d). Stock now ${partStockCount(key)}${proven>0?` · ${proven} proven`:''}.`);
  advanceDays(chk.days); // structural components take calendar time to fabricate (do it during downtime)
  if(!state.over){ render(); maybeShowSetback(); maybeShowMishap(); maybeShowRivalDisaster(); maybeShowEraInterstitial(); maybeShowDiscovery(); }
}
// Forecast: months of coverage at the recent build cadence.
function materialMonthsCoverage(key){
  const s=materialState(key); if(!s) return 0;
  const builds=cadenceRecent().length;
  if(builds<=0) return Infinity; // no recent flights → coverage is unbounded
  const ratePerMonth = builds / CADENCE_WINDOW;
  return s.stock / Math.max(0.0001, ratePerMonth);
}
function materialBlendMult(){
  let acc=MATERIAL_BASELINE_SHARE;
  for(const d of MATERIAL_DEFS) acc += d.share * materialEffectivePrice(d.key);
  return acc;
}
function materialCostMult(){ return materialBlendMult(); }
function materialPriceTick(){
  if(!state.materials) state.materials=defaultMaterialsState();
  for(const d of MATERIAL_DEFS){
    const s=materialState(d.key);
    s.prev=s.spot;
    s.spot=clampA(round2(s.spot + (1.0 - s.spot)*MATERIAL_PRICE_REVERT + (Math.random()-0.5)*2*MATERIAL_PRICE_WALK), MATERIAL_PRICE_MIN, MATERIAL_PRICE_MAX);
    s.history.push(s.spot);
    if(s.history.length>MATERIAL_HISTORY_LEN) s.history.splice(0, s.history.length-MATERIAL_HISTORY_LEN);
    if(s.contract){ s.contract.monthsLeft--; if(s.contract.monthsLeft<=0){ log('note', `Supply — ${d.name} contract expired; back to spot pricing (${s.spot.toFixed(2)}×).`); s.contract=null; } }
  }
}
// Note: the 12-mo contract-lock offer was retired with the market collapse (weak-pull surface).
// materialPriceTick() above still resolves/decrements any contract already on a legacy save so an
// in-progress lock finishes out and expires cleanly; nothing can newly sign one.
function materialSparklineSVG(key, width, height){
  width = width||120; height = height||24;
  const s = materialState(key); if(!s) return '';
  const pts = (s.history && s.history.length) ? s.history.slice(-MATERIAL_HISTORY_LEN) : [s.spot];
  const lo = MATERIAL_PRICE_MIN, hi = MATERIAL_PRICE_MAX, range = hi - lo;
  const pad = 2, w = width-pad*2, h = height-pad*2;
  const xFor = i => pad + (pts.length<=1 ? w/2 : (i/(pts.length-1))*w);
  const yFor = v => pad + h - ((Math.max(lo,Math.min(hi,v))-lo)/range)*h;
  const path = pts.map((v,i)=>(i===0?'M':'L')+xFor(i).toFixed(1)+' '+yFor(v).toFixed(1)).join(' ');
  const baselineY = yFor(1.0).toFixed(1);
  const cur = pts[pts.length-1];
  const color = cur>1.05?'var(--bad)':(cur<0.95?'var(--ok)':'var(--ink)');
  const last = pts.length ? `<circle cx="${xFor(pts.length-1).toFixed(1)}" cy="${yFor(cur)}" r="1.8" fill="${color}"/>` : '';
  // Legacy contract-lock band: only drawn if an old save still has one resolving out
  // (new locks can no longer be signed — the offer was retired with the market collapse).
  const lockColor = '#e6c14a';
  let lockLine = '';
  if (s.contract && isFinite(s.contract.lockedPrice)) {
    const y = yFor(s.contract.lockedPrice).toFixed(1);
    lockLine = `<line x1="${pad}" x2="${width-pad}" y1="${y}" y2="${y}" stroke="${lockColor}" stroke-width="0.9" opacity="0.95"/>`;
  }
  // Dip-band shading: the buying threshold, so the strip reads "on sale" at a glance.
  const dipY = yFor(MATERIAL_DIP_THRESHOLD).toFixed(1);
  const dipBand = `<rect x="${pad}" y="${dipY}" width="${width-pad*2}" height="${(pad+h-parseFloat(dipY)).toFixed(1)}" fill="var(--ok)" opacity="0.08"/>`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block" aria-label="${key} spot-price history">
    ${dipBand}
    <line x1="${pad}" x2="${width-pad}" y1="${baselineY}" y2="${baselineY}" stroke="#444" stroke-width="0.6" stroke-dasharray="2 2"/>
    ${lockLine}
    <path d="${path}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${last}
  </svg>`;
}
// #28: a generic auto-scaling sparkline for any numeric series (dashboard trend lines).
// Auto-fits to the data's own min/max (optionally clamped via opts.min/opts.max, e.g. 0..100
// for a percentage), draws a flat centred line for empty/constant series, and tints the
// stroke green when the series ended up rising vs its start, red when falling.
function sparklineSVG(points, opts){
  opts=opts||{};
  const width=opts.width||124, height=opts.height||30, pad=3;
  let pts=(points&&points.length)?points.slice():[0];
  if(pts.length===1) pts=[pts[0],pts[0]]; // a single sample → a flat line, not a dot
  let lo=Math.min.apply(null,pts), hi=Math.max.apply(null,pts);
  if(opts.min!=null) lo=Math.min(lo,opts.min);
  if(opts.max!=null) hi=Math.max(hi,opts.max);
  if(hi-lo<1e-9){ hi=lo+1; lo=lo-1; }              // constant series → centre the line
  const w=width-pad*2, h=height-pad*2, range=hi-lo;
  const xFor=i=> pad + (i/(pts.length-1))*w;
  const yFor=v=> pad + h - ((v-lo)/range)*h;
  const path=pts.map((v,i)=>(i===0?'M':'L')+xFor(i).toFixed(1)+' '+yFor(v).toFixed(1)).join(' ');
  const cur=pts[pts.length-1], first=pts[0];
  const color=opts.color || (cur>=first?'var(--ok)':'var(--bad)');
  const area=`<path d="${path} L ${xFor(pts.length-1).toFixed(1)} ${(height-pad).toFixed(1)} L ${xFor(0).toFixed(1)} ${(height-pad).toFixed(1)} Z" fill="${color}" opacity="0.10"/>`;
  const dot=`<circle cx="${xFor(pts.length-1).toFixed(1)}" cy="${yFor(cur).toFixed(1)}" r="1.9" fill="${color}"/>`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;width:100%" preserveAspectRatio="none" aria-label="${opts.label||'trend'}">${area}<path d="${path}" fill="none" stroke="${color}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>${dot}</svg>`;
}
// Finances tab: a diverging bar chart around a zero baseline — unlike sparklineSVG (one line,
// one trend color), monthly net can cross zero month to month, so each bar gets its own
// green/red rather than the series as a whole reading as one color.
function netFlowBarsSVG(points, opts){
  opts=opts||{};
  const width=opts.width||520, height=opts.height||70, pad=4;
  const pts=(points&&points.length)?points.slice():[0];
  const lo=Math.min(0,...pts), hi=Math.max(0,...pts);
  const range=(hi-lo)||1;
  const w=width-pad*2, h=height-pad*2;
  const zeroY=pad+h-((0-lo)/range)*h;
  const bw=Math.max(1.5, (w/pts.length)*0.7);
  const bars=pts.map((v,i)=>{
    const cx=pad+(i+0.5)*(w/pts.length);
    const vy=pad+h-((v-lo)/range)*h;
    const y=Math.min(vy,zeroY), bh=Math.max(0.6,Math.abs(vy-zeroY));
    const col=v>=0?'var(--ok)':'var(--bad)';
    return `<rect x="${(cx-bw/2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col}" opacity="0.85"/>`;
  }).join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;width:100%" preserveAspectRatio="none" aria-label="${opts.label||'monthly net cash flow'}">
    <line x1="${pad}" y1="${zeroY.toFixed(1)}" x2="${width-pad}" y2="${zeroY.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>
    ${bars}</svg>`;
}
// #28: one labelled sparkline cell for the dashboard trend strip.
function metricSpark(label, arr, opts){
  return `<div class="spark-cell"><div class="spark-k">${label}</div>${sparklineSVG(arr||[], opts)}</div>`;
}
// #7 visualization #1: cadence load gauge — horizontal bar of recent-build load
// vs. sustainable capacity, with the 100% surcharge threshold marked. Visual scale
// runs 0..1.5 so over-capacity overflow is visible without dwarfing normal ops.
function cadenceGaugeSVG(width, height){
  width = width||160; height = height||10;
  const load = Math.max(0, cadenceLoad());
  const surch = cadenceSurcharge();
  const maxScale = 1.5;
  const pad = 1, w = width - pad*2, h = height - pad*2;
  const fillFrac = Math.min(load, maxScale) / maxScale;
  const thresholdX = pad + (1.0/maxScale)*w;
  const color = surch>0?'var(--bad)':(load>0.8?'var(--warn)':(load>0?'var(--ok)':'#3a3a3a'));
  const overFrac = Math.max(0, Math.min(load, maxScale) - 1.0) / maxScale;
  const okW  = Math.min(fillFrac, 1.0/maxScale) * w;
  const overW = overFrac * w;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block" aria-label="Build cadence load gauge">
    <rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="2" fill="#1b1b1b" stroke="#333" stroke-width="0.6"/>
    <rect x="${pad}" y="${pad}" width="${okW.toFixed(1)}" height="${h}" rx="2" fill="${load>0.8&&surch===0?'var(--warn)':'var(--ok)'}" opacity="0.85"/>
    ${overW>0?`<rect x="${thresholdX.toFixed(1)}" y="${pad}" width="${overW.toFixed(1)}" height="${h}" fill="var(--bad)" opacity="0.9"/>`:''}
    <line x1="${thresholdX.toFixed(1)}" x2="${thresholdX.toFixed(1)}" y1="0" y2="${height}" stroke="#e6c14a" stroke-width="1" stroke-dasharray="2 1"/>
  </svg>`;
}
function productionUpkeep(){ let u=0; for(const d of PRODUCTION_DEFS) u+=d.upkeep*(prodLevel(d.key)-1); return round2(u); }
/* ---------- CE4(a): empire operating expense — the cost of HOLDING ambition ----------
   Late game, passive income (facility production, Belt royalties, gov funding, passive
   contracts) stacked against a FLAT overhead, so a sprawling company coasted to victory.
   empireOpex() is a carrying cost that scales with the size of what you've built: every
   off-world facility module, every tonne parked in the LEO depot, the Belt mining
   operation, every vehicle idling in the hangar, and every research division you've stood
   up. It is derived ENTIRELY from existing state — a fresh company owns none of these — so
   it is exactly $0 early and the early-game tuning is untouched. It bends the curve only as
   the empire grows: ambition is no longer free to hold. (add-to, don't-take-away: a NEW
   monthly cost; the old overhead path is unchanged.) No new state, no SAVE bump. */
const EMPIRE_FAC_OPEX_BASE=0.6;    // $M/mo to operate a built off-world facility (life support, comms, staff rotation)
const EMPIRE_FAC_OPEX_MODULE=0.45; // + per additional module — expansion buys income AND carrying cost
const EMPIRE_DEPOT_OPEX=0.02;      // $M/mo per tonne held in the LEO depot (boil-off management, station-keeping)
const EMPIRE_BELT_OPEX=1.5;        // $M/mo to keep the platinum-group Belt claim operating (against its +$4.5M royalty)
const EMPIRE_HANGAR_OPEX=0.15;     // $M/mo to keep each parked vehicle flight-ready
const EMPIRE_DIV_OPEX=0.25;        // $M/mo standing overhead per research division you've actually invested in
function empireOpex(){
  let o=0;
  for(const id in (state.facilities||{})){ // off-world facilities: every module costs to run
    if(!facilityBuilt(id)) continue;
    const mod=Math.max(1, facilityState(id).modules||1);
    o += EMPIRE_FAC_OPEX_BASE + EMPIRE_FAC_OPEX_MODULE*(mod-1);
  }
  o += EMPIRE_DEPOT_OPEX*Math.max(0, state.depot||0);                 // LEO propellant holding
  if((state.pgmRoyalty||0)>0) o += EMPIRE_BELT_OPEX;                  // Belt mining operation
  o += EMPIRE_HANGAR_OPEX*hangarList().length;                       // standing fleet maintenance
  for(const id in (state.divisions||{})){                            // research divisions actually stood up (trained beyond baseline, or with project experience)
    const ds=state.divisions[id];
    if(ds && ((ds.skill>DIV_SKILL0+1e-9) || (ds.exp>0))) o += EMPIRE_DIV_OPEX;
  }
  return round2(o*(1-execOpexCut())); // executives trim monthly overhead (0 when unstaffed; opex is already $0 early)
}
function prodUpgradeCost(key){ const d=prodDef(key); return round2(d.baseCost*prodLevel(key)); } // escalates with level
function canUpgradeProduction(key){
  const d=prodDef(key); if(!d) return {ok:false,why:'Unknown line.'};
  if(prodLevel(key)>=PROD_MAX_LEVEL) return {ok:false,why:'At maximum capacity.'};
  if(state.money<prodUpgradeCost(key)) return {ok:false,why:'Not enough capital.'};
  return {ok:true};
}
function upgradeProduction(key){
  const chk=canUpgradeProduction(key); if(!chk.ok) return;
  const d=prodDef(key), cost=prodUpgradeCost(key);
  state.money-=cost;
  advance(d.months); // construction/installation — capacity comes online after the build
  if(state.over){ render(); return; }
  if(!state.production) state.production={bays:1,foundry:1,pads:1};
  state.production[key]=prodLevel(key)+1;
  log('ok',`${d.icon} ${d.name} expanded to level ${state.production[key]} — +${fM(d.upkeep)}/mo upkeep.`);
  render();
}
/* ---------- M2: LEO propellant market ---------- */
function fuelBuyPrice(){ return round2(state.fuelPrice*(1+FUEL_SPREAD)); }          // what you pay to acquire fuel in LEO
function fuelSellPrice(){ return round2(state.fuelPrice*(1-FUEL_SPREAD)); }         // baseline market rate you receive
function buyFuel(t){
  if(!state.research.orbital_depot) return;
  t=round2(t); if(t<=0) return;
  const cost=round2(t*fuelBuyPrice());
  if(state.money<cost) return;
  state.money-=cost; state.depot=round2(state.depot+t);
  log('note',`Bought ${t.toFixed(1)} t propellant for −${fM(cost)} at ${fM(fuelBuyPrice())}/t — depot now ${state.depot.toFixed(1)} t.`);
  render();
}
function sellFuel(t){
  if(!state.research.orbital_depot) return;
  t=round2(Math.min(t, state.depot)); if(t<=0) return;
  let revenue=0, premiumSold=0;
  if(state.fuelBuyer && state.fuelBuyer.cap>0){ // fill a rival's premium buy order first
    const bt=round2(Math.min(t, state.fuelBuyer.cap));
    revenue+=bt*state.fuelBuyer.price; premiumSold=bt;
    state.fuelBuyer.cap=round2(state.fuelBuyer.cap-bt);
    if(state.fuelBuyer.cap<=0){ log('note',`Market — ${state.fuelBuyer.name}'s buy order is filled.`); }
  }
  const rest=round2(t-premiumSold); if(rest>0) revenue+=rest*fuelSellPrice();
  revenue=round2(revenue);
  state.depot=round2(state.depot-t); state.money+=revenue;
  log('ok',`Sold ${t.toFixed(1)} t propellant for +${fM(revenue)}${premiumSold>0?` (${premiumSold.toFixed(1)} t to ${state.fuelBuyer?state.fuelBuyer.name:'a buyer'} at premium)`:''}.`);
  render();
}

// CE1: apply the effects of a rival claiming a "first" (extracted so both the agent
// loop and any future trigger share one path). Fires once per goal, recorded in
// state.rivalFired so it survives across months and isn't re-logged.
function fireRivalFirst(r, f){
  const key=r.id+'|'+f.name;
  if(state.rivalFired[key]) return;
  state.rivalFired[key]=true;
  state.rivalThreat=state.rivalThreat||{}; state.rivalThreat[r.id]=(state.rivalThreat[r.id]||0)+1;
  log('rival', `${r.flag} ${r.name} claims: ${f.name} (${state.year})`);
  const _taunt=rivalVoiceLine(r,'taunt'); // P4: per-profile communiqué (flavor only)
  if(_taunt) log('rival', `${r.flag} ${r.name}: “${_taunt}”`);
  // #8: national prestige — a rival's first stings the home crowd, but far less if you'd already done it
  addSupport((f.missionId && state.completed[f.missionId]) ? supportDelta('rivalFirstDone') : supportDelta('rivalFirst'));
  if(f.missionId && !state.completed[f.missionId] && !state.scooped[f.missionId]){
    state.scooped[f.missionId]=true;
    const mm=MISSIONS.find(x=>x.id===f.missionId);
    log('bad', `Scooped: ${r.name} beat you to "${mm.name}" — its first-time payout is cut to ${Math.round(SCOOP_PAYOUT_MULT*100)}% (rep reward unaffected).`);
    pushFrontPage('scoop', '📰', `Scooped: ${r.name} claims ${mm.name}`, `Their first-time payout on it is cut to ${Math.round(SCOOP_PAYOUT_MULT*100)}%.`);
  } else pushFrontPage('rival', r.flag, `${r.name} claims: ${f.name}`, `${state.year} — ${r.name} reaches a milestone your own program hasn't.`);
  if(f.marketImpact){ // M5: a rival's cost/reuse breakthrough triggers an industry price war
    state.rivalThreat[r.id]+=1;
    state.econEvents.push({id:'pricewar_'+r.id, label:`${r.name} price pressure`, kind:'bad', payoutMult:f.marketImpact.payoutMult, monthsLeft:f.marketImpact.months});
    log('rival', `${r.flag} ${r.name}: ${f.marketImpact.note} — industry launch payouts ×${f.marketImpact.payoutMult} for ${f.marketImpact.months} mo. Adapt or be undercut.`);
  }
}
// CE1: how many flagship "firsts" the PLAYER has banked — the rival's race yardstick.
function playerFirstsScore(){ return Object.keys(state.completed||{}).length; }
// CE1: seed (or migrate) a rival's agent state. Back-compat: a save with goals already
// fired by the OLD calendar code (state.rivalFired) advances `idx` past them so they're
// never re-fired, and prevYear picks up where the timeline left off.
function seedRivalState(r){
  const rs={ capital:0, momentum:1.0, idx:0, prevYear:null };
  for(let i=0;i<r.firsts.length;i++){ if(state.rivalFired[r.id+'|'+r.firsts[i].name]) rs.idx=i+1; else break; }
  if(rs.idx>0){ const last=r.firsts[rs.idx-1]; rs.prevYear=Math.max(last.year, state.year); }
  return rs;
}
function rivalStateFor(r){
  state.rivalState=state.rivalState||{};
  if(!state.rivalState[r.id]) state.rivalState[r.id]=seedRivalState(r);
  return state.rivalState[r.id];
}
// CE1 slice (a): the rival AGENT turn — replaces the calendar-only checkRivalFirsts.
// Each rival accrues budget·momentum into capital and buys its next goal when capital
// clears the cost; momentum tracks the race (ahead → faster, dominated → rubber-banded).
function tickRivals(){
  const playerScore=playerFirstsScore();
  const crowd=rivalCrowdFactor(); // CE1(b): contract crowding slows every rival's saving
  for(const r of RIVALS){
    const prof=RIVAL_PROFILES[r.id]||{income:1.0};
    const rs=rivalStateFor(r);
    // --- momentum: drift toward a target set by how far ahead/behind the rival is ---
    const lead=rs.idx-playerScore; // >0 rival ahead of player on firsts, <0 player ahead
    let targetMom=clampA(1.0+lead*RIVAL_MOM_SENS, RIVAL_MOM_MIN, RIVAL_MOM_MAX);
    if(lead<0) targetMom=Math.max(targetMom, RIVAL_MOM_RUBBER); // rubber-band: never fully stall
    rs.momentum+=(targetMom-rs.momentum)*RIVAL_MOM_DRIFT;
    if(rs.idx>=r.firsts.length) continue; // rival has claimed all its goals
    const f=r.firsts[rs.idx];
    if(rs.prevYear==null) rs.prevYear=f.year-RIVAL_FIRST_RUNWAY; // debut saving window opens here
    if(state.year<rs.prevYear) continue; // saving window not open yet (keeps early game quiet)
    maybeRivalDisaster(r, rs); // P5: monthly disaster roll — only while actively saving toward a goal (not done, window open)
    const window=Math.max(RIVAL_MIN_WINDOW, f.year-rs.prevYear);
    const cost=prof.income*12*window;
    rs.capital+=prof.income*rs.momentum*crowd; // monthly accrual, sped/slowed by momentum & market crowding
    const earliest=f.year-RIVAL_MAX_PULL_IN; // historical floor — no absurdly early firsts
    if(rs.capital>=cost && state.year>=earliest){
      fireRivalFirst(r,f);
      rs.capital-=cost; rs.prevYear=state.year; rs.idx++;
    }
  }
}
// CE1(b) · Contract crowding — every active passive contract you hold removes income from
// the market the rivals draw on, slowing their saving (cap RIVAL_CROWD_CAP). 1.0 = no squeeze.
function rivalCrowdFactor(){
  const n=(state.passiveContracts||[]).length;
  return 1 - Math.min(RIVAL_CROWD_CAP, n*RIVAL_CROWD_PER);
}
// CE1(b) · Firsts-denial — when you complete a mission, any rival still chasing it as a goal
// loses momentum (and, if it was their *active* target, the capital saved toward it). Beating
// a rival to a first doesn't just cut your scoop penalty — it materially slows their program.
function denyRivalGoal(missionId){
  if(!missionId) return;
  for(const r of RIVALS){
    const rs=rivalStateFor(r);
    let idxOfGoal=-1;
    for(let i=rs.idx;i<r.firsts.length;i++){ if(r.firsts[i].missionId===missionId){ idxOfGoal=i; break; } }
    if(idxOfGoal<0) continue;
    const pending=(idxOfGoal===rs.idx);
    rs.momentum=Math.max(RIVAL_MOM_MIN, rs.momentum-(pending?RIVAL_DENY_MOM:RIVAL_DENY_MOM*0.5));
    if(pending) rs.capital*=RIVAL_DENY_DRAIN;
    log('rival', `${r.flag} ${r.name} loses ground — you reached ${MISSIONS.find(x=>x.id===missionId)?.name||missionId} first, blunting a goal they were chasing.`);
    const _def=rivalVoiceLine(r,'defiant'); // P4: per-profile defiant reply (flavor only)
    if(_def) log('rival', `${r.flag} ${r.name}: “${_def}”`);
  }
}
/* ---------- P5 · Rival disasters + rescue-their-crew ----------
   A rival can now fail publicly while actively saving toward a goal. Two kinds:
   UNCREWED loss (flavor + a small momentum knock) and, once a rival has claimed a
   CREWED first, a CREWED strand — a lightweight rescue-offer decision that resolves
   INSTANTLY on click (mirrors the #20 rescue pipeline's levers/formula shape, but does
   NOT reuse its mission-context machinery). Cadence tuned by Monte Carlo (see below).
   No persisted state: _pendingRivalDisaster is transient like _pendingRescue; the
   momentum/rep/support deltas resolve within the tick. Modal-priority: deferred if a
   setback / mishap / inquiry is already pending (rolled again a later month). */
const RIVAL_DISASTER_BASE_P=0.0055;   // base monthly disaster prob while actively saving — MC-tuned: ~1 per 15.1 active-saving yr at ×1.0 (band 12-18)
const RIVAL_DISASTER_MULT={vostochny:1.0, meridian:0.6, halcyon:1.5}; // per-archetype rate multiplier (→ ~15 / ~25 / ~10 yr mean intervals)
const RIVAL_DISASTER_CREWED_FRAC=0.5; // when a rival has claimed a crewed first, this share of its disasters are crewed strands (else uncrewed)
const RIVAL_DISASTER_MOM_UNCREWED=RIVAL_DENY_MOM*0.5; // 0.15 momentum knock for an uncrewed loss (half a firsts-denial)
const RIVAL_DISASTER_MOM_CREWED=RIVAL_DENY_MOM;       // 0.30 full momentum knock for a crewed loss — applied regardless of any rescue outcome
const RIVAL_STRAND_PAYOUT=25;         // synthetic mission scale for a rival strand (feeds rescueCost's payout·0.6 shape → 15 cost)
const RIVAL_STRAND_DIFFICULTY=0.20;   // fixed synthetic distance/difficulty penalty on rescueChance's 0.55 base (a rival strand is a hard, less-prepared reach)
const RIVAL_RESCUE_REP=6;             // player rep windfall on a successful rival-crew rescue
const RIVAL_RESCUE_SUPPORT=-SUPPORT_DELTA.rivalFirst*2; // +5.0 support windfall = 2× |SUPPORT_DELTA.rivalFirst| (2.5)
const RIVAL_DECLINE_REP=2;            // callousness: rep hit for declining ≈ 1/3 of the +6 windfall
const RIVAL_DECLINE_SUPPORT=1.5;      // callousness: support hit for declining ≈ 1/3 of the +5 windfall
let _pendingRivalDisaster=null;       // a crewed rival strand paused at the rescue-offer decision (transient, NOT persisted — like _pendingRescue)
// Has this rival already claimed a crewed first? (gates crewed strands.) Checks FIRED firsts only.
function rivalHasCrewedFirst(r, rs){
  for(let i=0;i<rs.idx;i++){ const f=r.firsts[i];
    if(/crew/i.test(f.name)) return true;                                   // name flags the crewed milestones ("crewed orbital flight", etc.)
    if(f.missionId){ const mm=MISSIONS.find(x=>x.id===f.missionId); if(mm && (mm.crew||0)>0) return true; } // and the mission's own crew field, belt-and-braces
  }
  return false;
}
// Synthetic rescue cost/chance — mirror the #20 rescueCost/rescueChance formula SHAPE with a fixed
// rival-strand difficulty (no mission object to key off), reusing the same real levers.
function rivalRescueCost(){ return Math.max(3, Math.round(RIVAL_STRAND_PAYOUT*0.6)); }
function rivalRescueChance(){
  let c=0.55 - RIVAL_STRAND_DIFFICULTY;                        // mirror rescueChance's 0.55 base, minus the fixed synthetic strand difficulty
  c += Math.min(0.15, (state.rep||0)/600);                     // a well-funded agency mounts a better effort
  if(state.research&&state.research.auto_rendezvous) c+=0.10;  // rapid automated rendezvous
  if(state.research&&state.research.nuclear_thermal) c+=0.10;  // fast-transit rescue craft
  if((state.facilities||[]).length>0) c+=0.08;                 // standing infrastructure = contingency capability
  c += ctrlRescueScore()*CTRL_RESCUE_BONUS_MAX;                // mission controllers run a tighter rescue (0 when unstaffed)
  return Math.max(0.10, Math.min(0.90, c));
}
// Monthly disaster roll for one rival (called from tickRivals while it is actively saving).
function maybeRivalDisaster(r, rs){
  if(_pendingSetback||_pendingLogiMishap||_pendingInquiry||_pendingRivalDisaster) return; // modal-priority: defer if a decision is already pending (roll again later)
  const mult=RIVAL_DISASTER_MULT[r.id]||1.0;
  if(Math.random() >= RIVAL_DISASTER_BASE_P*mult) return;                  // no disaster this month
  const crewed=rivalHasCrewedFirst(r, rs) && Math.random()<RIVAL_DISASTER_CREWED_FRAC;
  rs.momentum=Math.max(RIVAL_MOM_MIN, rs.momentum-(crewed?RIVAL_DISASTER_MOM_CREWED:RIVAL_DISASTER_MOM_UNCREWED)); // the disaster's own consequence — happens regardless of any rescue
  const distress=rivalVoiceLine(r,'distress'); // P5: per-profile distress line (flavor only)
  if(!crewed){
    log('rival', `${r.flag} ${r.name} suffers a public failure — an uncrewed vehicle is lost, denting its program.`);
    if(distress) log('rival', `${r.flag} ${r.name}: “${distress}”`);
    return;
  }
  log('bad', `${r.flag} ${r.name} DISASTER — a crewed vehicle is stranded in deep space. A decision is needed.`);
  if(distress) log('rival', `${r.flag} ${r.name}: “${distress}”`);
  pushFrontPage('disaster', r.flag, `${r.name} crew stranded in deep space`, 'The world is watching to see if anyone will help.');
  _pendingRivalDisaster={ rivalId:r.id }; // surfaced by maybeShowRivalDisaster() after the advance settles
}
function maybeShowRivalDisaster(){ if(_pendingRivalDisaster && !_pendingSetback && !_pendingLogiMishap && !_pendingInquiry) showRivalDisasterModal(); } // setback/mishap/inquiry take priority
function showRivalDisasterModal(){
  const s=_pendingRivalDisaster; if(!s) return;
  const r=RIVALS.find(x=>x.id===s.rivalId); if(!r){ _pendingRivalDisaster=null; return; }
  const cost=rivalRescueCost(), chance=Math.round(rivalRescueChance()*100), afford=state.money>=cost;
  const mountBtn=afford
    ? `<button class="btn" onclick="mountRivalRescue()">Mount a rescue (${fM(cost)}, ${chance}% chance)</button>`
    : `<div class="dim" style="font-size:12px;margin:8px 0">A rescue would cost ${fM(cost)} — you can't afford one.</div>`;
  showModal(`<h2 style="color:var(--bad)">${r.flag} ${r.name} crew stranded</h2>
    <p><b>${r.name}</b> has lost a crewed vehicle in deep space — their astronauts are stranded but alive. The world is watching to see if anyone will help.</p>
    <p class="muted">You could divert your own contingency assets to reach them. A successful rescue is a global goodwill coup; declining reads as cold. The rival's program already carries the loss either way.</p>
    ${mountBtn}
    <button class="btn ghost" onclick="declineRivalRescue()" style="margin-top:8px">Stand down (not our fight)</button>`);
}
function mountRivalRescue(){
  const s=_pendingRivalDisaster; if(!s) return;
  const r=RIVALS.find(x=>x.id===s.rivalId);
  const cost=rivalRescueCost(), chance=rivalRescueChance();
  if(state.money<cost) return;                     // guarded; the button is hidden when unaffordable
  _pendingRivalDisaster=null; hideModal();
  state.money-=cost;                               // cost is committed whether or not the rescue succeeds
  log('note', `Rescue launched toward ${r?r.name:'the stranded crew'} — ${fM(cost)} committed; your contingency teams scramble.`);
  if(Math.random()<chance){
    state.rep+=RIVAL_RESCUE_REP; addSupport(RIVAL_RESCUE_SUPPORT);
    log('ok', `Your crews reached ${r?r.name+"'s":'the stranded'} astronauts and brought them home alive — a global goodwill coup (+${RIVAL_RESCUE_REP} rep).`);
    const humbled=r&&rivalVoiceLine(r,'humbled'); if(humbled) log('rival', `${r.flag} ${r.name}: “${humbled}”`);
  } else {
    log('bad', `The rescue fell short — ${r?r.name+"'s":'the'} crew could not be reached in time. The cost is sunk; the rival's loss stands.`);
  }
  if(state.money<0) gameOver(); else { render(); if(!state.over) pumpFlightArrivals(); }
}
function declineRivalRescue(){
  const s=_pendingRivalDisaster; if(!s) return;
  const r=RIVALS.find(x=>x.id===s.rivalId);
  _pendingRivalDisaster=null; hideModal();
  state.rep=Math.max(0, state.rep-RIVAL_DECLINE_REP); addSupport(-RIVAL_DECLINE_SUPPORT); // small callousness hit (≈1/3 of the windfall)
  log('note', `You stood down from ${r?r.name+"'s":'the'} crew emergency — commentators call it cold (−${RIVAL_DECLINE_REP} rep).`);
  render(); if(!state.over) pumpFlightArrivals();
}
/* ---------- P6 6.1: era-transition interstitial ----------
   A full-screen retrospective/preview card when the calendar carries the company into a new era.
   No persisted transient (the trigger is derived: currentEra index > state.eraSeen), so it can
   never be "lost" — if a higher-priority decision (setback > mishap > inquiry > rival-disaster)
   is pending, maybeShowEraInterstitial() defers and a later settle-point surfaces it. Balance-neutral:
   purely a notification; state.eraSeen only advances when the player clicks Continue. */
function maybeShowEraInterstitial(){
  if(_pendingSetback||_pendingLogiMishap||_pendingInquiry||_pendingRivalDisaster) return; // lowest priority — any pending decision wins this tick
  if(state.over) return;
  const cur=eraIndex(currentEra());
  const seen=(state.eraSeen==null?0:state.eraSeen);
  if(cur<=seen) return;            // nothing new to acknowledge
  showEraInterstitial(seen+1);     // one boundary at a time (chained on dismiss if several were crossed at once)
}
function eraDelta(v, kind){
  const s=v>=0?'+':'−', a=Math.abs(v);
  if(kind==='money') return `${s}$${a.toFixed(2)}M`;
  if(kind==='rep') return `${s}${Math.round(a)}`;
  return `${s}${a}`;
}
function showEraInterstitial(toIdx){
  const to=ERAS[toIdx], from=ERAS[toIdx-1];
  const snap=state.eraStartSnapshot||eraSnapshot();
  const dF=(state.flights||0)-(snap.flights||0);
  const dPF=Object.keys(state.completed||{}).length-(snap.playerFirsts||0);
  const dRF=Object.keys(state.scooped||{}).length-(snap.rivalFirsts||0);
  const dMoney=round2((state.money||0)-(snap.money||0));
  const dRep=(state.rep||0)-(snap.rep||0);
  const yr=(e)=>`${e.from}–${e.to>=9999?'…':e.to}`;
  const retro=`
    <div style="display:flex;flex-direction:column;gap:4px;font-size:13px">
      <div><span style="color:var(--muted)">Flights flown</span> · <b>${dF}</b></div>
      <div><span style="color:var(--muted)">Firsts claimed</span> · <b>${dPF}</b>${dRF>0?` <span class="dim">(rivals scooped ${dRF})</span>`:''}</div>
      <div><span style="color:var(--muted)">Treasury</span> · <b>${eraDelta(dMoney,'money')}</b></div>
      <div><span style="color:var(--muted)">Reputation</span> · <b>${eraDelta(dRep,'rep')}</b></div>
    </div>`;
  showModal(`<div style="text-align:center">
    <div class="dim" style="font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px">A new era · ${to.from}</div>
    <h2 style="margin:0 0 2px;font-size:26px">${to.name}</h2>
    <p class="muted" style="font-size:12px;margin:0 0 14px">${yr(to)}</p>
    <p style="font-size:14px;line-height:1.5;margin:0 0 16px">${to.blurb}</p>
    <div style="text-align:left;background:var(--panel2);border-radius:8px;padding:12px 14px;margin-bottom:16px">
      <div class="cc-panel-h" style="margin:0 0 8px">◈ The ${from.name} era, in review</div>
      ${retro}
    </div>
    <button class="btn launch" style="width:100%" onclick="dismissEraInterstitial(${toIdx})">Continue ▸</button>
  </div>`, true);
}
function dismissEraInterstitial(toIdx){
  state.eraSeen=toIdx;                     // acknowledged
  state.eraStartSnapshot=eraSnapshot();    // baseline for the era just entered → scopes the NEXT retrospective
  hideModal(); render();
  maybeShowEraInterstitial();              // chain: surface the next boundary if the clock jumped several eras at once
}
// CE1(b) · Counter-poach — spend capital to hire away a rival's engineers: knocks the rival's
// momentum, lifts your own staff's morale (you fight for talent), and earns a little rep.
// Logic lives here; the trigger button arrives with the slice (c) Standings panel.
function counterPoach(rivalId){
  const r=RIVALS.find(x=>x.id===rivalId); if(!r) return false;
  if(state.money<RIVAL_COUNTERPOACH_COST){ log('note','Not enough capital to counter-poach right now.'); return false; }
  const rs=rivalStateFor(r);
  state.money=round2(state.money-RIVAL_COUNTERPOACH_COST);
  rs.momentum=Math.max(RIVAL_MOM_MIN, rs.momentum-RIVAL_COUNTERPOACH_MOM);
  (state.staff||[]).forEach(s=>{ s.morale=clampA((s.morale||50)+RIVAL_COUNTERPOACH_MORALE,0,100); });
  state.rep+=2;
  log('ok', `${r.flag} You hired away ${r.name}'s engineers — their program loses momentum, your team is energised. −${fM(RIVAL_COUNTERPOACH_COST)}, +2 rep.`);
  render();
  if(typeof $==='function' && $('rivalsCard')) renderRivals(); // CE1(c): refresh the open Standings panel
  return true;
}
// CE1(c) — snapshot projection of WHEN a rival will claim its pending goal, from its current
// capital, momentum and the market crowding you're applying. Shifts live as those change;
// the historical floor still applies. Returns null once a rival has claimed everything.
// E1.1 slice B: thin wrapper over rivalFullProjection — the first entry is byte-identical to
// the number this used to compute (guarded by a parity test), so every free player sees the same.
function rivalProjectedYear(r){ return rivalFullProjection(r)[0]||null; }
// E1.1 slice B — the full remaining-firsts timeline, each goal momentum-adjusted the same way
// rivalProjectedYear projects the pending one. The chain reuses today's live momentum/crowd
// snapshot for every future goal (a projection, not a re-simulation), and each subsequent goal
// saves toward its cost from the PREVIOUS goal's projected year (its window opens where the last
// one lands). Powers the paid intel dossier; the pending goal (index 0) is what the free line uses.
function rivalFullProjection(r){
  const rs=rivalStateFor(r);
  const prof=RIVAL_PROFILES[r.id]||{income:1.0};
  const rate=prof.income*Math.max(0.01,rs.momentum)*rivalCrowdFactor(); // capital/month at the current snapshot, held for the whole chain
  const out=[];
  let prevYear=null;
  for(let i=rs.idx;i<r.firsts.length;i++){
    const f=r.firsts[i];
    const first=(i===rs.idx);
    if(first) prevYear=(rs.prevYear==null)?f.year-RIVAL_FIRST_RUNWAY:rs.prevYear;
    const window=Math.max(RIVAL_MIN_WINDOW, f.year-prevYear);
    const cost=prof.income*12*window;
    const capNow=first?((state.year>=prevYear)?(rs.capital||0):0):0; // only the pending goal has capital already saved; future goals start fresh
    const monthsLeft=Math.max(0,(cost-capNow)/rate);
    const proj=Math.max(state.year, prevYear)+monthsLeft/12;
    const year=Math.round(Math.max(proj, f.year-RIVAL_MAX_PULL_IN));
    out.push({goal:f, year:year, nominal:f.year});
    prevYear=year; // next goal's saving window opens where this one is projected to land
  }
  return out;
}
// E1.1 slice B — has the player bought the intel dossier for this rival? (lazy-default, no migrate)
function rivalIntelOwned(id){ return !!(state.rivalIntel && state.rivalIntel[id]); }
// E1.1 slice B — buy the one-time intel dossier: unlocks the full projected remaining-firsts
// timeline (rivalFullProjection) for this rival, permanent for the rest of the playthrough.
function buyRivalIntel(rivalId){
  const r=RIVALS.find(x=>x.id===rivalId); if(!r) return false;
  if(rivalIntelOwned(rivalId)){ log('note',`You already hold an intel dossier on ${r.name}.`); return false; }
  if(state.money<RIVAL_INTEL_COST){ log('note','Not enough capital to buy an intel dossier right now.'); return false; }
  state.money=round2(state.money-RIVAL_INTEL_COST);
  state.rivalIntel=state.rivalIntel||{};
  state.rivalIntel[rivalId]=true;
  log('ok', `${r.flag} Intel dossier acquired on ${r.name} — their full remaining program timeline is now projected. −${fM(RIVAL_INTEL_COST)}.`);
  render();
  if(typeof $==='function' && $('rivalsCard')) renderRivals(); // refresh the open Standings panel
  return true;
}
// M5 + CE1(b): rivals poach your most vulnerable (lowest-morale) staff — morale is your
// defence. The talent war is now reactive: a high-MOMENTUM rival (well-funded, on a roll)
// courts harder, and a successful poach feeds its momentum (it got your people).
const POACH_CHANCE = 0.10; // monthly chance a rival looks at your bench
// E1.1: a fatal crewed loss opens a "poach heat" window — instability rivals notice and press harder on.
const POACH_HEAT_ON_FATAL=6, POACH_HEAT_MULT=2.5;
function tickPoachHeat(){ if((state.poachHeat||0)>0) state.poachHeat--; }
function rivalMomentumOf(r){ return ((state.rivalState||{})[r.id]||{}).momentum||1.0; }
// pick a rival weighted by momentum — the company that's surging is the one knocking on your door
function poachingRival(){
  const w=RIVALS.map(r=>Math.max(0.1, rivalMomentumOf(r)));
  let roll=Math.random()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<RIVALS.length;i++){ roll-=w[i]; if(roll<=0) return RIVALS[i]; }
  return RIVALS[RIVALS.length-1];
}
function checkPoaching(){
  if(!state.staff || !state.staff.length) return;
  const chance=POACH_CHANCE*((state.poachHeat||0)>0?POACH_HEAT_MULT:1); // E1.1: hotter right after a fatal loss
  if(Math.random()>chance) return;
  const target=state.staff.slice().sort((a,b)=>(a.morale||50)-(b.morale||50))[0];
  const p=personById(target.id); if(!p) return;
  const morale=target.morale||50;
  const rival=poachingRival();
  const mom=rivalMomentumOf(rival);
  // a surging rival (momentum>1) presses harder; a stalled one (momentum<1) less so — clamped sane
  const leaveProb=clampA((55-morale)/55,0,0.9)*(0.4+0.6*p.skill)*clampA(mom,0.6,1.4);
  if(Math.random()<leaveProb){
    state.staff=state.staff.filter(s=>s.id!==target.id);
    if(state.assignedAstronaut===target.id) state.assignedAstronaut=null;
    reconcileDeptLeads(); // #19 slice C: a poached lead is succeeded by the best remaining member
    state.rivalThreat=state.rivalThreat||{}; state.rivalThreat[rival.id]=(state.rivalThreat[rival.id]||0)+1;
    const rs=rivalStateFor(rival); rs.momentum=Math.min(RIVAL_MOM_MAX, rs.momentum+RIVAL_POACH_MOM_BUMP); // they gained your talent
    log('bad',`${rival.flag} ${rival.name} poached ${p.name} (${roleLabel(p)}) — low morale made the offer easy to take, and it feeds their momentum. Keep your people happy (or counter-poach).`);
  } else if(morale<45){
    log('rival',`${rival.flag} ${rival.name} is courting ${p.name}. Raise morale (Raise/Commend) or risk losing them.`);
  }
}
function completeResearch(){
  const r=RESEARCH.find(x=>x.id===state.activeResearch.id);
  state.research[r.id]=true; state.activeResearch=null;
  if(state.researchGoal===r.id){ log('ok',`🎯 Goal reached: ${r.name}!`); state.researchGoal=null; } // #14: pinned goal achieved — auto-unpin
  divisionGainExp(r); // #4: the covering division gains experience from completing a project
  if(isLeveledTech(r.id)){ if(!state.techLevel) state.techLevel={}; state.techLevel[r.id]=1; } // #3: leveled techs start at L1
  timeInterrupt(); // smart time: a research completion is a decision point
  reconcileEngineMods(); // engine-stat research (e.g. Megawatt Electric) reflects immediately
  if(r.effect.engines){ r.effect.engines.forEach(id=>state.unlocked[id]=true); log('note',`R&D complete: ${r.name}. New engines available — ${r.effect.engines.map(id=>ENGINES[id].name).join(', ')}.`);}
  else if(r.effect.engine){state.unlocked[r.effect.engine]=true; log('note',`R&D complete: ${r.name}. New engine available — ${ENGINES[r.effect.engine].name}.`);}
  else if(r.effect.sigma){state.sigma=r.effect.sigma; log('note',`R&D complete: ${r.name}. σ is now ${r.effect.sigma}.`);}
  else if(r.effect.reliability){log('note',`R&D complete: ${r.name}. Launch reliability improved.`);}
  else if(r.effect.isp||r.effect.thrust){log('note',`R&D complete: ${r.name}. Engine performance improved${r.effect.isp?` (+${Math.round(r.effect.isp*100)}% Isp)`:''}${r.effect.thrust?`${r.effect.isp?',':''} (+${Math.round(r.effect.thrust*100)}% thrust)`:''}.`);}
  else { log('note',`R&D complete: ${r.name}.`); }
  _lastUnlockedTech=r.id; // #31 Slice 2: flag for tech-tree glow on next renderTechTree()
  queueResearchNotice(r.id); // additive: queue a small completion pop-up (surfaced from stepTime; log above is unchanged)
  tryStartQueuedResearch(); // I5: auto-start the queued "next" pick if it's already affordable/eligible right now
}
// R&D epic slice 2: when the tech tree is re-shaped (nodes added / re-parented),
// an existing save can hold a completed node whose NEW prerequisites it never
// researched — which would soft-lock the tree. Reconcile by transitively granting
// every completed node's prerequisites, then re-applying engine/capability unlocks.
// Idempotent and safe to run on every load (a fresh game is a no-op).
function reconcileResearch(){
  if(!state.research) state.research={};
  if(!state.unlocked) state.unlocked={a4:true};
  let changed=true, guard=0;
  while(changed && guard++<100){
    changed=false;
    for(const r of RESEARCH){
      if(!state.research[r.id]) continue;
      for(const q of (r.req||[])){ if(!state.research[q]){ state.research[q]=true; changed=true; } }
    }
  }
  for(const r of RESEARCH){ if(state.research[r.id] && r.effect){ if(r.effect.engine) state.unlocked[r.effect.engine]=true; if(r.effect.engines) r.effect.engines.forEach(id=>state.unlocked[id]=true); } }
}
// R&D completion notice — a small, dismiss-only pop-up so a finished tech node isn't missed in the ops
// log (the log line below in completeResearch is kept exactly as-is; this is additive). Transient (not
// persisted). It's an ARRAY so a batch of completions inside one time-step collapses to ONE modal
// instead of stacking N. Lowest priority: surfaced from stepTime AFTER every decision modal, and only
// when no decision is pending and nothing is already on screen — so it never stacks on the flight
// overlay, a pending setback/mishap/inquiry/hearing, or a celebration. Reuses the plain compact .modal
// (no 'newspaper'/frontPageHTML), and rides the global ESC handler for free like every other modal.
let _pendingResearchDone=[];
function queueResearchNotice(id){ if(id) _pendingResearchDone.push(id); }
function maybeShowResearchNotice(){
  if(!_pendingResearchDone.length) return;
  if(_pendingSetback||_pendingLogiMishap||_pendingInquiry||_pendingHearing) return; // real decisions come first
  const me=$('modal'); if(me&&me.classList&&!me.classList.contains('hidden')) return; // never clobber an open modal
  const ids=_pendingResearchDone.slice(); _pendingResearchDone.length=0;
  showResearchNoticeModal(ids);
}
function showResearchNoticeModal(ids){
  const nodes=(ids||[]).map(id=>RESEARCH.find(r=>r.id===id)).filter(Boolean);
  if(!nodes.length) return;
  // 🔬 emoji stands in for a per-node icon (RESEARCH nodes have none); r.name/r.desc are injected raw
  // to match renderTechTree exactly — the names/descs already carry HTML entities & the .hist span.
  const eyebrow=`<div style="font-size:12px;letter-spacing:.35em;color:var(--readout);text-transform:uppercase;margin-bottom:6px">🔬 R&amp;D Complete 🔬</div>`;
  const body = nodes.length===1
    ? `<h2 style="margin:0 0 8px">${nodes[0].name}</h2>
       <div class="sub" style="text-align:left;font-size:13px;margin:8px 0 4px">${nodes[0].desc}</div>`
    : `<h2 style="margin:0 0 8px">${nodes.length} technologies completed</h2>
       <div style="text-align:left;font-size:13px;margin:8px 0 4px">${nodes.map(r=>`<div style="margin:9px 0"><b>${r.name}</b><div class="dim" style="font-size:12px">${r.desc}</div></div>`).join('')}</div>`;
  showModal(`<div style="text-align:center">${eyebrow}${body}
    <button class="btn launch" onclick="hideModal()" style="margin-top:6px">Onward ▸</button>
  </div>`);
}

// Time Granularity slice 2: the player's time control. Advance N days, then render + surface any
// pending R&D setback (the one decision the monthly tick can raise). Overhead accrues per day, so
// short steps cost proportionally — there is no free time.
function stepTime(days){ advanceDays(days); if(!state.over){ render(); maybeShowSetback(); maybeShowMishap(); maybeShowRivalDisaster(); maybeShowEraInterstitial(); maybeShowResearchNotice(); maybeShowDiscovery(); } }
function advanceMonth(){ stepTime(DAYS_PER_MONTH); } // #26: one-month step (used by the advisor nudge)
// Header time arrows: ▸ day / ▸▸ week / ▸▸▸ month. First click on an arrow steps once; a second
// click on the same arrow starts auto-advancing that unit at 1 step/sec; a third click (or clicking
// it while it's running) stops. Clicking a different arrow drops back to single-step on the new unit.
const TIME_UNIT_DAYS={day:1,week:7,month:DAYS_PER_MONTH};

/* ---------- Smart time: the clock stops when the game needs you ----------
   timeInterrupt() halts auto-run and flags any run-to-event skip. It fires from every
   decision modal, plus non-modal completions (research done, build done, window open,
   treasury warnings, mandate/special offers). runToNextEvent() is the Stellaris button:
   fast-forward synchronously until the next outliner item lands or an interrupt fires. */
let _timeInterrupted=false;
function timeInterrupt(){ _timeInterrupted=true; try{ stopTimeAuto(); }catch(e){} }
function runToNextEvent(){
  if(state.over) return;
  stopTimeAuto(); _timeInterrupted=false;
  const items=outlinerItems();
  const target=items.length?Math.max(1,Math.ceil(items[0].etaDays)):30;
  const cap=Math.min(target, 365*3);
  let d=0;
  while(d<cap && !_timeInterrupted && !state.over && !_pendingSetback && !_pendingLogiMishap && !_pendingInquiry && !_pendingRivalDisaster){
    advance(1); d++;
    if($('modal') && !$('modal').classList.contains('hidden')) break; // a decision opened
  }
  _timeInterrupted=false;
  render();
}

let timeAuto={unit:null,timer:null}, timePrimed=null;
function stopTimeAuto(){ if(timeAuto.timer) clearInterval(timeAuto.timer); timeAuto={unit:null,timer:null}; updateTimeArrows(); }
function startTimeAuto(unit){ stopTimeAuto(); timeAuto.unit=unit;
  timeAuto.timer=setInterval(()=>{ if(state.over){ stopTimeAuto(); return; } stepTime(TIME_UNIT_DAYS[unit]); }, 1000);
  updateTimeArrows(); }
function clickTimeArrow(unit){
  if(!TIME_UNIT_DAYS[unit]||state.over) return;
  if(timeAuto.unit===unit){ stopTimeAuto(); timePrimed=null; return; }   // running this unit → stop
  if(timeAuto.unit) stopTimeAuto();                                      // running another unit → drop to single-step
  if(timePrimed===unit){ timePrimed=null; startTimeAuto(unit); return; } // 2nd consecutive press → auto-run 1/sec
  stepTime(TIME_UNIT_DAYS[unit]); timePrimed=unit;                       // 1st press → step once + prime
}
function updateTimeArrows(){ for(const u in TIME_UNIT_DAYS){ const b=$('tArrow'+u[0].toUpperCase()+u.slice(1)); if(b) b.classList.toggle('running', timeAuto.unit===u); } }
// E0.5-A: pause game-time auto-advance while the tab is hidden. timeAuto's 1s setInterval (each
// tick runs a full render() into the hidden DOM) is the ONLY thing that keeps burning CPU in a
// backgrounded tab — RAF-driven rendering (all Phaser scenes + the flight canvas loop) is already
// throttled to a stop by the browser when the tab is hidden. We record the running unit ONLY when
// hidden-pause itself stops it, so a run the player had already manually paused stays paused on
// return, and we never auto-start time the player didn't have running.
let _timeAutoHiddenUnit=null;
function handleVisibilityChange(){
  if(document.hidden){
    if(timeAuto.unit){ _timeAutoHiddenUnit=timeAuto.unit; stopTimeAuto(); } // was auto-running → remember + stop
    // (timeAuto.unit falsy → nothing was auto-running; leave state untouched, no-op)
  } else if(_timeAutoHiddenUnit){
    const u=_timeAutoHiddenUnit; _timeAutoHiddenUnit=null;                  // resume ONLY what hidden-pause stopped
    if(!state.over) startTimeAuto(u);
  }
}
try{ document.addEventListener('visibilitychange', handleVisibilityChange); }catch(e){}
function skipResearch(){ if(!state.activeResearch) return;
  let n=state.activeResearch.monthsLeft+1; // each month removes ≥1; +1 guarantees completion absent a setback
  while(n-->0 && state.activeResearch && !_pendingSetback && !_pendingLogiMishap && !_pendingInquiry && !_pendingRivalDisaster && !state.over) advance(1); // #26: stop the skip at a setback (or 2.3 mishap) decision
  if(!state.over){ render(); maybeShowSetback(); maybeShowMishap(); maybeShowRivalDisaster(); maybeShowEraInterstitial(); maybeShowDiscovery(); }
}

/* ---------- E4.1: on-rails Keplerian ephemeris (A1) ----------
   Replaces the old fake synodic model (a fixed 780-day spacing + random jitter +
   RANDOM window "quality") with real orbital mechanics: each planet moves on real
   Keplerian elements, launch windows open at the true Earth→target phase geometry,
   and window quality comes from where the (eccentric-orbit) target actually is at
   the encounter — a perihelic opposition is favorable, an aphelic one marginal.
   That's the real, textbook reason Mars windows differ, so the existing
   quality→payout mechanic now rides on physics instead of Math.random.

   Time base: the game runs a flat 360-day year (DAYS_PER_MONTH=30 × 12). We keep
   the ephemeris in that same game-day unit — no dual calendar — but scale each
   planet's period from the REAL orbital-period ratio (a^1.5 by Kepler's 3rd law).
   Earth = 360 game-days; Mars = 360 × 1.524^1.5 ≈ 677; the Earth–Mars synodic
   period then falls out to ≈769 game-days (~25.6 months), matching the old
   hand-tuned 26 as a sanity check — but now it's derived, not asserted.

   Absolute epoch is J2000-flavored real elements evaluated at absDay 0: the game
   is not a real-history sim, so what matters is real RELATIVE geometry + real
   eccentricity structure, not calendar-accurate 1942 positions. Angles in degrees
   in the data table (readable), radians internally.

   This also gives every planet a real heliocentric position(absDay) — the exact
   thing the E4.3 3D solar-system view will render — so A1 is the shared foundation
   for both "deeper orbital mechanics" and the 3D viewport, not just window math. */
const GAME_YEAR_DAYS = DAYS_PER_MONTH * 12; // 360 — one game-year in game-days
const D2R = Math.PI / 180;
// a: semi-major axis (AU); e: eccentricity; inc: inclination; node: ascending node;
// lop: longitude of perihelion ϖ (all angles degrees); L0: mean longitude at absDay 0.
// Real J2000 mean elements (approx). inc/node are display-only today; window math remains planar.
const ORBITAL_ELEMENTS = {
  mercury: { a: 0.3871, e: 0.2056, inc:7.005, node: 48.33, lop:  77.46, L0: 252.25 },
  venus:   { a: 0.7233, e: 0.0068, inc:3.395, node: 76.68, lop: 131.53, L0: 181.98 },
  earth:   { a: 1.0000, e: 0.0167, inc:0.000, node:  0.00, lop: 102.94, L0: 100.46 },
  mars:    { a: 1.5237, e: 0.0934, inc:1.851, node: 49.58, lop: 336.06, L0: 355.43 },
  belt:    { a: 2.7660, e: 0.0758, inc:10.59, node: 80.31, lop:  73.60, L0:  95.99 }, // Ceres
  jupiter: { a: 5.2026, e: 0.0484, inc:1.304, node:100.56, lop:  14.73, L0:  34.40 },
  saturn:  { a: 9.5549, e: 0.0539, inc:2.485, node:113.72, lop:  92.43, L0:  49.94 },
  uranus:  { a:19.2184, e: 0.0473, inc:0.773, node: 74.01, lop: 170.96, L0: 313.23 },
  neptune: { a:30.1104, e: 0.0086, inc:1.770, node:131.78, lop:  44.97, L0: 304.88 },
};
// Kepler's 3rd law in game-days: T = 360 · a^1.5 (Earth a=1 → exactly one game-year).
function planetPeriodDays(bodyId){
  const el = ORBITAL_ELEMENTS[bodyId]; if(!el) return null;
  return GAME_YEAR_DAYS * Math.pow(el.a, 1.5);
}
// Solve Kepler's equation M = E − e·sinE for the eccentric anomaly E (Newton).
// Converges fast for the modest eccentricities here (max e≈0.21, Mercury).
function solveKepler(M, e){
  M = ((M % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
  let E = e < 0.8 ? M : Math.PI; // good starting guess
  for(let i=0;i<12;i++){
    const dE = (E - e*Math.sin(E) - M) / (1 - e*Math.cos(E));
    E -= dE;
    if(Math.abs(dE) < 1e-10) break;
  }
  return E;
}
// Heliocentric position of a body at an absDay: true-anomaly longitude θ (radians,
// measured from a fixed reference direction) and Sun-distance r (AU). Moons resolve
// to their parent planet's heliocentric position (fine for solar-system-scale
// geometry and window math; a moon shares its planet's transfer window).
function planetHelio(bodyId, absD){
  let el = ORBITAL_ELEMENTS[bodyId];
  if(!el){
    // a moon or sub-body — use its parent planet if we know one
    const b = (typeof BODIES!=='undefined') && BODIES.find(x=>x.id===bodyId);
    if(b && b.around && ORBITAL_ELEMENTS[b.around]){ bodyId = b.around; el = ORBITAL_ELEMENTS[bodyId]; }
    else return null;
  }
  const T = planetPeriodDays(bodyId);
  const n = 2*Math.PI / T; // mean motion (rad/game-day)
  const lop = el.lop * D2R, L0 = el.L0 * D2R;
  const M = (L0 - lop) + n * absD;        // mean anomaly at absD
  const E = solveKepler(M, el.e);
  // true anomaly ν from eccentric anomaly E
  const nu = 2 * Math.atan2(Math.sqrt(1+el.e)*Math.sin(E/2), Math.sqrt(1-el.e)*Math.cos(E/2));
  const r = el.a * (1 - el.e*Math.cos(E)); // heliocentric distance (AU)
  let theta = nu + lop;                     // heliocentric longitude
  theta = ((theta % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
  return { theta, r };
}
// Perihelion / aphelion distances (AU) — endpoints for mapping encounter distance → quality.
function bodyPeriAp(bodyId){
  const el = ORBITAL_ELEMENTS[bodyId]; if(!el) return null;
  return { peri: el.a*(1-el.e), ap: el.a*(1+el.e) };
}
// Ideal Hohmann departure phase angle (target ahead of Earth, radians) for an
// Earth→target transfer, from the semi-major axes. Transfer half-orbit time sets how
// far the target moves during cruise; the target must lead by π minus that sweep.
function hohmannPhaseLead(targetId){
  const eE = ORBITAL_ELEMENTS.earth, eT = ORBITAL_ELEMENTS[targetId];
  if(!eE || !eT) return null;
  const aT = (eE.a + eT.a) / 2;                 // transfer-orbit semi-major axis (AU)
  const tofDays = 0.5 * GAME_YEAR_DAYS * Math.pow(aT, 1.5); // half the transfer period, game-days
  const nT = 2*Math.PI / planetPeriodDays(targetId);        // target mean motion
  const targetSweep = nT * tofDays;             // radians target moves during cruise
  let lead = Math.PI - targetSweep;             // required lead at departure
  lead = ((lead % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
  return { lead, tofDays };
}
// Signed smallest angular difference a−b, in (−π, π].
function angDiff(a, b){
  let d = (a - b) % (2*Math.PI);
  if(d <= -Math.PI) d += 2*Math.PI;
  if(d >   Math.PI) d -= 2*Math.PI;
  return d;
}
// Which body does this window-gated mission target? (all current window missions are
// Mars, but derive it rather than hardcode, so new outer-planet windows just work.)
function missionTargetBody(missionId){
  if(typeof BODIES==='undefined') return 'mars';
  const b = BODIES.find(x=> Array.isArray(x.missions) && x.missions.includes(missionId));
  if(b) return ORBITAL_ELEMENTS[b.id] ? b.id : (b.around || 'mars');
  return 'mars';
}
// E4.5: general mission→body lookup for the 3D ship-marker trajectory, distinct from
// missionTargetBody above (which exists for window math and always falls back to Mars —
// wrong for a marker: an Apollo mission should head to the Moon, not collapse to Mars).
// Returns the body id whose bodyScenePos is a meaningful transfer destination, or null when
// there isn't one (unknown mission, or a schematic non-point body like the Oort shell/cloud —
// 'kind':'cloud' bodies have no single position for a marker to arrive at).
function flightTargetBody(missionId){
  if(typeof BODIES==='undefined') return null;
  const b = BODIES.find(x=> Array.isArray(x.missions) && x.missions.includes(missionId));
  if(!b || b.kind==='cloud') return null;
  return b.id;
}
// Real transfer windows for a target body from a given absDay: scan forward, find each
// crossing of the ideal Hohmann phase lead, and rate quality by the target's Sun-distance
// at that encounter (perihelic = favorable, aphelic = marginal). Returns up to `count`
// upcoming {abs, quality} in the SAME shape the old windowsFor produced.
function computeWindows(targetId, fromAbs, count){
  const H = hohmannPhaseLead(targetId); if(!H) return [];
  const ap = bodyPeriAp(targetId);
  const out = [];
  const step = 2; // game-days; fine enough — synodic drift is slow
  const maxDays = Math.ceil(planetPeriodDays(targetId) * 0 + 20*GAME_YEAR_DAYS); // cap the scan (20 game-years)
  let prev = null, d = fromAbs;
  for(let scanned=0; scanned<=maxDays && out.length<count; scanned+=step, d+=step){
    const pe = planetHelio('earth', d), pt = planetHelio(targetId, d);
    if(!pe || !pt) break;
    const phase = angDiff(pt.theta, pe.theta);       // target lead over Earth now
    const err = angDiff(phase, H.lead);              // distance to the ideal lead
    if(prev !== null && ((prev.err <= 0 && err > 0) || (prev.err >= 0 && err < 0)) && Math.abs(err - prev.err) < Math.PI){
      // sign change → the ideal geometry occurred between prev and now; linear-interpolate the day
      const frac = prev.err / (prev.err - err);
      const wAbs = Math.round(prev.d + frac*step);
      // quality: target Sun-distance at ARRIVAL (departure + transfer time) maps peri→1.15, ap→0.85
      const arr = planetHelio(targetId, wAbs + H.tofDays);
      let q = 1.0;
      if(arr && ap && ap.ap > ap.peri){
        const t = (arr.r - ap.peri) / (ap.ap - ap.peri); // 0 at perihelion, 1 at aphelion
        q = 1.15 - Math.max(0, Math.min(1, t)) * 0.30;   // → [0.85, 1.15]
      }
      out.push({ abs: wAbs, quality: round2(q) });
    }
    prev = { err, d };
  }
  return out;
}

/* ---------- M3b: launch windows ---------- */
function absMonth(){ return (state.year-1942)*12+state.month; }
function windowsFor(missionId){
  if(!state.windows[missionId]){
    // E4.1: real phase-geometry windows for this mission's target body, replacing the
    // old fixed-cadence + random-quality synthesis. Keeps the {abs, quality} shape and
    // the ~4-upcoming-windows count every consumer already expects.
    const target = missionTargetBody(missionId);
    let list = computeWindows(target, absDay(), 4);
    if(!list.length){
      // ultra-defensive fallback (unknown/elementless target): a single far window so the
      // mission never becomes permanently unlaunchable. Should not happen for authored bodies.
      list = [{ abs: absDay()+daysFor(26), quality: 1.0 }];
    }
    state.windows[missionId]=list;
  }
  return state.windows[missionId];
}
function monthToDate(abs){ const y=1942+Math.floor(abs/12), mo=((abs%12)+12)%12; return MONTHS[mo]+' '+y; }
// day-precise date from an absDay (sibling of monthToDate) — "14 Mar 1962"
function dayToDate(absD){ const mo=Math.floor(absD/DAYS_PER_MONTH), dd=(((absD%DAYS_PER_MONTH)+DAYS_PER_MONTH)%DAYS_PER_MONTH)+1, y=1942+Math.floor(mo/12), m=((mo%12)+12)%12; return dd+' '+MONTHS[m]+' '+y; }
function commitWindow(missionId, idx){
  const w=windowsFor(missionId)[idx];
  state.committedWindow={missionId, abs:w.abs, quality:w.quality};
  log('note',`Committed to the ${dayToDate(w.abs)} window for ${MISSIONS.find(x=>x.id===missionId).name}. Build and test before it closes.`);
  render();
}
function cancelWindow(){ state.committedWindow=null; render(); }

/* ---------- #13: map as a planning surface ----------
   Pure planners (no DOM) that turn the selected body into actionable plans:
   the next transfer window, propellant routes (LEO depot / on-site ISRU), and
   per-mission lead time + economics. renderBodyCard() consumes these so the
   solar map becomes a place you plan, not just read. Headless-testable. */
function bodyMissions(bodyId){
  const b=BODIES.find(x=>x.id===bodyId); if(!b) return [];
  return (b.missions||[]).map(id=>MISSIONS.find(m=>m.id===id)).filter(Boolean);
}
function nextWindowFor(missionId){
  const wins=windowsFor(missionId), now=absDay();
  let best=-1;
  for(let i=0;i<wins.length;i++){ if(wins[i].abs>=now && (best<0||wins[i].abs<wins[best].abs)) best=i; }
  if(best<0) return null;
  const w=wins[best];
  const q = w.quality>1.08?'Favorable':(w.quality<0.95?'Marginal':'Average');
  return {idx:best, abs:w.abs, daysAway:w.abs-now, monthsAway:Math.round((w.abs-now)/DAYS_PER_MONTH), quality:w.quality, qLabel:q, date:dayToDate(w.abs)};
}
// propellant routes that serve a body: the LEO depot (top-off) and on-site ISRU (free return leg)
function bodyRoutes(bodyId){
  const depotResearch=!!state.research.orbital_depot;
  let isru=null;
  for(const m of bodyMissions(bodyId)){
    const f=ISRU_FREE_LEG[m.id];
    if(f){ isru={mission:m.id, leg:f.leg, label:f.label, research:f.research, online:!!state.research[f.research]}; break; }
  }
  return {depotResearch, depotTons:round2(state.depot||0), isru};
}
// lead time + economics for a single mission, estimated against the current bench
function missionPlan(m){
  const tl=TEST_LEVELS[state.testLevel]||TEST_LEVELS[0];
  const lead=buildMonths(m)+1+tl.months;
  const win = m.window ? nextWindowFor(m.id) : null;
  const base=m.payout||0;
  return {
    id:m.id, name:m.name, crew:m.crew||0, days:m.days||0,
    available:missionFlyable(m), done:!!state.completed[m.id],
    leadMonths:lead, travelMonths:Math.round((m.days||0)/30),
    window:win, payout:base, adjPayout: win?round2(base*win.quality):base,
    minRep:m.minRep||0, reqResearch:m.reqResearch||null
  };
}
function bodyPlan(bodyId){
  const b=BODIES.find(x=>x.id===bodyId); if(!b) return null;
  const missions=bodyMissions(bodyId).map(missionPlan);
  const transferLeg=(b.legs||[]).find(l=>/Injection|Trans-|transfer/i.test(l.label))||null;
  const totalDv=(b.legs||[]).reduce((s,l)=>s+l.dv,0);
  // soonest window across all window-gated missions to this body
  let nextWin=null;
  for(const mp of missions){ if(mp.window && (!nextWin || mp.window.abs<nextWin.abs)) nextWin=mp.window; }
  return { body:b, transferLeg, totalDv, routes:bodyRoutes(bodyId), missions,
           anyWindows:missions.some(x=>x.window), nextWindow:nextWin };
}

/* ---------- physics ---------- */
function tankStruct(prop, dia){const s=curSigma();return s/(1-s)*prop*geoStructMult(dia);} // BC3: diameter scales tank structure
function stageMasses(st){
  const e=ENGINES[st.eng];
  const dry=e.mass*st.count + tankStruct(st.prop, stageDia(st));
  return {dry, wet:dry+st.prop, eng:e};
}
// Parallel strap-on boosters (a "stage 0"): `count` identical liquid units, each with its
// own engine + `prop` tonnes of propellant. Default count:0 = no boosters (today's behaviour).
function boostersFitted(){ const b=state.boosters; return !!(b && b.count>0 && b.eng && ENGINES[b.eng]); }
function boosterMasses(){
  const b=state.boosters;
  if(!boostersFitted()) return null;
  const e=ENGINES[b.eng];
  const perDry=e.mass + tankStruct(b.prop);
  const dry=perDry*b.count, propTotal=b.prop*b.count;
  return {dry, wet:dry+propTotal, eng:e, count:b.count, propEach:b.prop, propTotal};
}
// #16: boosters are extra failure points (ignition + separation). More boosters → lower
// reliability; a high-reliability engine (solids ignite very reliably) costs less per unit.
// Bounded so boosters stay a cost/thrust trade, never a reliability cliff.
// vehicle-spec booster descriptor (count/prop + solid flag for drawing), or null when none fitted
function boosterSpec(){ return boostersFitted()?{count:state.boosters.count, prop:state.boosters.prop, solid:!!(ENGINES[state.boosters.eng]&&ENGINES[state.boosters.eng].solid)}:null; }
const BOOST_REL_CAP=0.12; // boosters never cost more than 12% reliability
function boosterRelPenalty(){
  if(!boostersFitted()) return 1;
  const e=ENGINES[state.boosters.eng]||ENGINES.a4;
  const perBooster=Math.max(0.005, 0.015*(1+(0.96-e.rel)*8));
  return 1 - Math.min(BOOST_REL_CAP, state.boosters.count*perBooster);
}
/* ---------- M3: in-space modules & multi-leg missions ---------- */
function inSpaceDry(mod){const e=ENGINES[mod.eng]||ENGINES.a4;const s=curSigma();return e.mass + s/(1-s)*mod.prop;}
function inSpaceWet(mod){return inSpaceDry(mod)+mod.prop;}
function lvPayload(m){
  // what the launch vehicle must loft to LEO
  let p;
  if(m && m.tanker) p=inSpaceWet(state.transfer); // the tank itself is the cargo
  else if(m && m.profile){
    p=lifeSupport(m,state.eclss).total; // crew module
    p+=powerSystemMass(m); // Phase 2: power plant (solar/RTG/reactor) is mass you must lift
    p+=(m.cargo||0); // #73 Slice 2: uncrewed cargo (e.g. a station module) carried through the whole profile
    if(m.modules.includes('transfer')) p+=inSpaceWet(state.transfer);
    if(m.modules.includes('lander')){ p+=inSpaceWet(state.descent)+inSpaceWet(state.ascent); }
  }
  else if(m && m.crew>0) p=lifeSupport(m,state.eclss).total;
  else p=m?m.payload:0.05;
  return p + partsExtraMass(m); // BC2: avionics + fairing add lofted mass
}
// Gravity-loss model: a low-TWR burn spends longer fighting gravity, so it delivers less of its
// ideal Δv. Mission reqDv ALREADY budgets a nominal gravity/drag loss (LEO 9400 vs ~7800 m/s
// orbital velocity), so this is a penalty applied ONLY BELOW a nominal TWR — a sensibly-thrusted
// stage (TWR ≥ nominal) is unchanged, and only an anemic stage bleeds Δv. Stage 1 keys off the
// booster-assisted liftoff TWR; upper stages off their own ignition TWR.
const GRAV_NOM_TWR0=1.25, GRAV_NOM_TWR_UP=0.40, GRAV_LOSS_K=0.55, GRAV_LOSS_CAP=0.40;
function gravLossFrac(twr, nom){ return clampA(GRAV_LOSS_K*Math.max(0,(nom-twr)/nom), 0, GRAV_LOSS_CAP); }

/* ---------- Phase 3: pad structural limits ----------
   The pad, hold-downs and flame handling can only take so much rocket. Ground-track research
   raises the ceiling — Cape investment becomes the gate to Saturn-class ambition:
     bare field 350 t → Reinforced Pads 900 t → Flame Trenches 2,000 t → Service Towers unlimited. */
function padMassCap(){
  if(state.research.mobile_service_tower) return Infinity;
  if(state.research.flame_trenches) return 2000;
  if(state.research.concrete_pads) return 900;
  return 350;
}
function padCapNext(){
  if(!state.research.concrete_pads) return 'Reinforced Launch Pads (ground R&D)';
  if(!state.research.flame_trenches) return 'Flame Trenches & Deluge (ground R&D)';
  if(!state.research.mobile_service_tower) return 'Mobile Service Towers (ground R&D)';
  return null;
}

/* ---------- #114: orbital inclination as a Δv cost ----------
   A launch reaches, for free, an orbit inclined at ≈ the launch site's latitude, and can steer to any
   HIGHER inclination for free by changing azimuth — UP TO a range-safety ceiling: the ascent ground
   track can't overfly populated areas, so a real coastal site (Cape Canaveral: azimuth ~35°-120°) can
   only reach inclinations of about latitude..~57° directly. This is exactly why real polar/sun-sync
   missions fly from Vandenberg (ocean to the south), not the Cape. Target inclinations on EITHER side
   of that [floor, ceiling] band cost a burn: below the floor, a plane change; above the ceiling, a
   dogleg (an inefficient ascent-trajectory kink to dodge land) — approximated with the same
   Δv ≈ 2·v·sin(Δi/2) formula on the assumption a dogleg costs roughly what a partial plane change would.
   LAUNCH_SITE_LAT/LAUNCH_SITE_MAX_DIRECT_INCL are consts now; #30 (second launch site) later swaps both
   for per-site values.
   Missions opt in with an optional m.inclination (degrees). Missions without it are completely untouched:
   inclinationDv returns 0, so effectiveReqDv === m.reqDv — an identity the tests pin across every mission.
   IMPORTANT: this feeds the *budget* (effectiveReqDv), NOT the *classification* checks. The reqDv>=9000
   "is this an orbital-class mission" tests (isOrbital / sepEvents / isLeoClassMission / recovery-when)
   must keep reading raw m.reqDv, or a surcharge would spuriously reclassify a mission. */
const LAUNCH_SITE_LAT=28.4;              // Cape Canaveral, °N — #30 seam (per-site latitude later)
const LAUNCH_SITE_MAX_DIRECT_INCL=57;    // range-safety azimuth ceiling — beyond this, a dogleg is needed
const INCLINATION_LEO_V=7800;            // m/s, orbital velocity the plane-change/dogleg is priced against
function inclinationDv(m){
  if(!m || m.inclination==null) return 0;
  const incl=m.inclination;
  let dOff=0;
  if(incl < LAUNCH_SITE_LAT) dOff=LAUNCH_SITE_LAT-incl;              // below the floor → plane change
  else if(incl > LAUNCH_SITE_MAX_DIRECT_INCL) dOff=incl-LAUNCH_SITE_MAX_DIRECT_INCL; // above the ceiling → dogleg
  if(dOff<=0) return 0;                    // inside [floor, ceiling] → free (just change azimuth)
  return Math.round(2*INCLINATION_LEO_V*Math.sin((dOff*Math.PI/180)/2));
}
// the Δv a design must actually beat for mission m: its base reqDv plus any plane-change surcharge.
// Every BUDGET gate/display reads through this; classification (reqDv>=9000) still reads raw m.reqDv.
function effectiveReqDv(m){ return (m&&m.reqDv||0) + inclinationDv(m); }

/* ---------- E4.6 (A2 slice 1): depot rendezvous/phasing as a Δv cost ----------
   The LEO propellant depot (#7/M3b-ii) tops off a mission's transfer stage for free today,
   regardless of orbital plane — a real gap MIGRATION.md flagged ("rendezvous & phasing for
   reuse/refuel" is unmodeled). A depot can hand over propellant once you're alongside it, but it
   can't pay for the plane-change burn YOUR vehicle needs to actually get there: real rendezvous
   phasing is a maneuver the visiting spacecraft's own engine performs, not something the depot
   supplies. This closes that gap using the exact 2·v·sin(Δi/2) physics inclinationDv already
   uses, applied to the mismatch between a mission's own plane and the depot's.

   The depot has no separate orbital-plane field of its own: Tanker Run flights (which fill it)
   carry no .inclination, so by the same "unset ⇒ the free/default plane" convention inclinationDv
   uses, the depot naturally sits at LAUNCH_SITE_LAT — the plane any unmodified launch reaches.

   Unlike inclinationDv (a STATIC per-mission surcharge, always present in effectiveReqDv), this
   is a DYNAMIC cost: it only exists when the player actually chooses to draw from the depot this
   flight (state.depotUse>0). A mission that never touches the depot is completely unaffected.
   Also unlike inclinationDv's floor/ceiling (free to steer to any HIGHER inclination via azimuth,
   since that's a launch-day choice), a rendezvous has no such free band — meeting a specific
   existing depot in a specific existing plane costs a burn in EITHER direction, so this is a
   plain symmetric Δv≈2·v·sin(Δi/2) on the angular mismatch, no direction-dependent asymmetry.

   IDENTITY GUARANTEE (checked in tests): depotPhasingDv requires the mission be .profile-shaped
   (the only category the depot benefits at all) — a flat-reqDv mission like crew_orbit or
   Comsat Block Buy (which DO carry .inclination, for the unrelated launch-azimuth tax above) is
   therefore provably 0 regardless of state.depotUse, since the depot mechanic doesn't apply to
   them at all. And no mission today combines .profile with .inclination, so depotPhasingDv is
   provably 0 for EVERY mission in MISSIONS, regardless of what the player sets state.depotUse to.
   This is mechanism-only, exactly like inclinationDv's slice 1: no existing mission's numbers move. */
const DEPOT_INCLINATION=LAUNCH_SITE_LAT; // no depot vehicle carries its own .inclination — it forms in the launch site's default/free plane
function depotPhasingDv(m){
  if(!m || !m.profile || !(state.depotUse>0)) return 0; // opt-in: only meaningful for depot-eligible (.profile) missions, and only a cost of USING the depot this flight, not a static mission property
  const incl = m.inclination==null ? DEPOT_INCLINATION : m.inclination; // no .inclination ⇒ assumed to already share the depot's plane
  const dOff = Math.abs(incl-DEPOT_INCLINATION);
  if(dOff<=0) return 0;
  return Math.round(2*INCLINATION_LEO_V*Math.sin((dOff*Math.PI/180)/2));
}
// #45: ground-track math for a mission with a known .inclination — the classic sinusoidal lat/lon path
// a satellite traces under it, for a circular orbit (standard argument-of-latitude parametrization).
// LEO_PERIOD_MIN is a flavor approximation for the per-orbit westward drift (Earth rotating under the
// orbit plane) — the game doesn't model altitude/period, so this is illustrative, not precision orbit
// prediction. Returns `passes` arrays of {lon,lat} points; pass 0's ascending node is at ascNodeLon,
// later passes drift west (successive orbits, Earth having rotated further beneath them).
const LEO_PERIOD_MIN=90;
function groundTrackPasses(inclDeg, ascNodeLon, passes){
  const incl=inclDeg*Math.PI/180, driftPerPass=360*(LEO_PERIOD_MIN/1440), out=[];
  for(let p=0;p<passes;p++){
    const nodeLon=ascNodeLon - p*driftPerPass, seg=[];
    for(let u=0;u<=360;u+=4){
      const ur=u*Math.PI/180;
      const lat=Math.asin(Math.sin(incl)*Math.sin(ur))*180/Math.PI;
      let lon=nodeLon + Math.atan2(Math.cos(incl)*Math.sin(ur), Math.cos(ur))*180/Math.PI;
      lon=((lon+180)%360+360)%360-180;
      seg.push({lon,lat});
    }
    out.push(seg);
  }
  return out;
}
/* ---------- Physics-realism #2: one-way communication light-lag ----------
   Distance-from-Sun (AU) is a static per-body constant — real orbital position/ephemeris isn't modeled
   anywhere else in this game (see #114's own note that altitude/period aren't tracked either), so
   Earth-to-body distance is approximated as a min/max RANGE (closest opposition vs. farthest
   conjunction: |bodyAU−1| and bodyAU+1) rather than a single live-simulated figure — same
   "representative, not simulated" spirit as reqDv's flat Δv numbers. Moons share their parent planet's
   AU (the moon-to-planet leg is negligible at interplanetary scale); Earth's own Moon is the one
   exception — its table entry IS already an Earth-distance, not a Sun-distance, handled specially below.
   Feeds display only (mission control flavor) — no gameplay number reads this. */
// NOTE (E4.1): this flat AU table + synodicDays() below are the light-lag / conjunction "flavor"
// model — real-DAY periods, all bodies incl. moons/Pluto/Oort, epoch = opposition-for-all. E4.1 added
// a separate, more precise ORBITAL_ELEMENTS + planetHelio() (real elements w/ eccentricity, game-day
// periods, planets only) for launch windows and the future 3D view. Kept deliberately separate for now
// — unifying would move the shipped conjunction blackout dates. Unification target is E4.3, when the 3D
// scene needs real positions for every body (moons included) and BODY_AU can fold into an extended
// ORBITAL_ELEMENTS. Until then: BODY_AU for light-lag/conjunction, ORBITAL_ELEMENTS for windows/3D.
const BODY_AU={mercury:0.39, venus:0.72, moon:0.00257, mars:1.52, phobos:1.52, belt:2.77,
  jupiter:5.20, io:5.20, europa:5.20, ganymede:5.20, callisto:5.20,
  saturn:9.58, titan:9.58, rhea:9.58, uranus:19.2, titania:19.2, oberon:19.2,
  neptune:30.1, triton:30.1, pluto:39.5, oort:2000};
const C_KM_S=299792.458; // speed of light, km/s
function lightLagMinutes(bodyId, farthest){
  const au=BODY_AU[bodyId]; if(au==null) return null;
  const distAU = bodyId==='moon' ? au : (farthest ? au+1 : Math.abs(au-1));
  return round2(distAU*149597870.7/C_KM_S/60);
}
/* ---------- Physics realism #3: solar conjunction blackout ----------
   When a body passes near-directly behind the Sun as seen from Earth, radio comms degrade or black out
   entirely — real and well-documented (NASA suspends commanding Mars rovers for ~2-3 weeks roughly every
   26 months, at each conjunction). Orbital period derived from BODY_AU via Kepler's third law
   (T_years ≈ AU^1.5 — a flavor approximation, not a precision ephemeris, same spirit as lightLagMinutes);
   synodic period (time between successive conjunctions) follows from that. Anchored to a fixed epoch
   (absDay 0 = opposition/best-geometry for every body — a simplification, not synchronized real
   astronomy) with conjunctions falling at the midpoint of each synodic cycle. Excludes Earth (trivial)
   and the Moon (its BODY_AU entry is an Earth-distance, not a Sun-distance — Kepler doesn't apply, and
   the Moon doesn't have a meaningful solar-conjunction blackout regardless of Earth's position).
   CONJUNCTION_BLACKOUT_HALFDAYS is a flat representative half-window (~Mars' real ballpark), used for
   every body rather than deriving each one's true angular-sweep rate. Display-only, like light-lag. */
const CONJUNCTION_BLACKOUT_HALFDAYS=10; // ±10 days around exact conjunction ≈ 20-day blackout window
function synodicDays(bodyId){
  const au=BODY_AU[bodyId]; if(au==null || bodyId==='moon') return null;
  const tYears=Math.pow(au,1.5);
  const sYears=1/Math.abs(1-1/tYears);
  return Math.round(sYears*365.25);
}
function nextConjunction(bodyId){
  const syn=synodicDays(bodyId); if(syn==null) return null;
  const half=syn/2;
  const phase=((absDay()-half)%syn+syn)%syn; // days since the most recent conjunction epoch, in [0,syn)
  const distToNearest=Math.min(phase, syn-phase);
  const inBlackout=distToNearest<=CONJUNCTION_BLACKOUT_HALFDAYS;
  return { syn, inBlackout,
    daysRemaining: inBlackout ? Math.round(CONJUNCTION_BLACKOUT_HALFDAYS-distToNearest) : 0,
    daysToNext: Math.round(syn-phase) };
}

function stackPerformance(stages, payload){
  const sm=stages.map(stageMasses);
  // strap-on boosters lift the full wet stack then jettison; the liftoff TWR they add reduces the
  // boost-phase gravity loss. Compute liftoff mass + combined liftoff TWR up front so stage 1's
  // gravity loss can use it. Zero boosters == exactly the prior (loss-free-for-good-TWR) numbers.
  const bm=boosterMasses();
  const stackWet=sm.reduce((a,b)=>a+b.wet,0);
  const liftoff=payload+stackWet+(bm?bm.wet:0);
  const engOut=!!state.engineOut && stages[0].count>=3; // Phase 3: reserve margin to survive an engine failure
  const coreThrust=sm[0].eng.thrustSL*stages[0].count*(engOut?(stages[0].count-1)/stages[0].count:1);
  const boostThrust=bm?bm.eng.thrustSL*bm.count:0;
  const twr=((coreThrust+boostThrust)*thrustMult())/(liftoff*G0); // #2b research scales liftoff thrust
  let totalDv=0; const stageDv=[], stageTwr=[], stageGravLoss=[];
  for(let i=0;i<stages.length;i++){
    let above=payload;
    for(let j=i+1;j<stages.length;j++) above+=sm[j].wet;
    const m0=above+sm[i].wet, mf=above+sm[i].dry, e=sm[i].eng;
    const isp=((i===0)?(e.ispSL+e.ispVac)/2:e.ispVac)*ispMult(); // first stage flies through atmosphere; #2b research scales Isp
    const ideal=(mf>0 && m0>mf)? isp*G0*Math.log(m0/mf):0;
    // per-stage ignition TWR (SL thrust for stage 1, vac for uppers)
    const th=((i===0)?e.thrustSL:e.thrustVac)*stages[i].count*thrustMult();
    const ignTwr=m0>0? th/(m0*G0):0;
    stageTwr.push(ignTwr);
    // gravity loss: stage 1 keyed to the booster-assisted liftoff TWR, uppers to ignition TWR
    const lossFrac=gravLossFrac((i===0)?twr:ignTwr, (i===0)?GRAV_NOM_TWR0:GRAV_NOM_TWR_UP);
    const loss=ideal*lossFrac; stageGravLoss.push(loss);
    stageDv.push(ideal-loss); totalDv+=ideal-loss;
  }
  // booster boost segment — shares stage 1's boost-phase gravity loss (same low, vertical phase)
  let boostDv=0, boostGravLoss=0;
  if(bm){
    const e=bm.eng;
    const isp=((e.ispSL+e.ispVac)/2)*ispMult(); // boosters fly through the atmosphere → SL/Vac average
    const m0=payload+stackWet+bm.wet, mf=payload+stackWet+bm.dry;
    const idealB=(mf>0 && m0>mf)? isp*G0*Math.log(m0/mf):0;
    boostGravLoss=idealB*gravLossFrac(twr, GRAV_NOM_TWR0); boostDv=idealB-boostGravLoss;
    totalDv+=boostDv;
  }
  const gravLoss=stageGravLoss.reduce((a,b)=>a+b,0)+boostGravLoss;
  return {sm,stageDv,totalDv,stageTwr,stageGravLoss,gravLoss,liftoff,twr,boostDv,boosters:bm};
}
// Legs that ISRU makes "free" once the relevant tech is researched, keyed by mission id.
const ISRU_FREE_LEG = {
  luna_landing: {leg:'Ascent to Lunar Orbit', research:'lunar_isru', label:'Lunar ISRU'},
  mars_orbit:   {leg:'Trans-Earth Injection', research:'mars_isru',  label:'Mars ISRU'},
  mars_landing: {leg:'Ascent to Mars Orbit', research:'mars_isru',  label:'Mars ISRU'}, // I1: ISRU fuels the ascent vehicle, not just TEI — the classic Mars-architecture application
  belt_mining:  {leg:'Trans-Earth Injection', research:'belt_volatiles', label:'Belt Volatiles ISRU'},
};
// I6: orbital-capture legs at atmosphere-bearing bodies — Mars, Jupiter, Saturn — that Aerocapture
// research cuts by 70% once researched (see legDv() inside simulateMission). Airless-body captures
// (Ceres, the Moon, etc.) are correctly untouched — there's no atmosphere there to skim.
const AEROCAPTURE_LEG_RE=/Mars Orbit Insertion|Jovian Orbit Insertion|Saturn System Capture/;
function missionAerocaptureLeg(m){ const l=(m&&m.profile||[]).find(x=>AEROCAPTURE_LEG_RE.test(x.name||'')); return l?l.name:null; }
// walk a mission profile leg by leg; in-space stages spend propellant while carrying the surviving stack
// #6: orbital-assembly route — pre-position the heavy in-space modules on separate
// launches and dock them in LEO, so the main launch never has to loft them. Trades
// raw lift for extra flights, integration time, and docking risk.
const ASSEMBLY_LAUNCH_COST=0.5;  // $M per extra dedicated assembly flight
const ASSEMBLY_DOCK_REL=0.97;    // reliability factor per docking (halved by auto_rendezvous)
function assemblyAvailable(m){ return !!(state.research.orbital_assembly && m && m.profile && m.modules && m.modules.includes('transfer')); }
function assemblyOn(m){ return !!(state.assembleOrbit && assemblyAvailable(m)); }
function assemblyModules(m){ const mods=[]; if(!assemblyAvailable(m)) return mods; if(m.modules.includes('transfer')) mods.push('transfer'); if(m.modules.includes('lander')) mods.push('lander'); return mods; }
function assemblyFlights(m){ return assemblyOn(m)?assemblyModules(m).length:0; }
function assemblyDockPenalty(m){
  const n=assemblyFlights(m); if(n<=0) return 1;
  const p = state.research.auto_rendezvous ? 1-(1-ASSEMBLY_DOCK_REL)/2 : ASSEMBLY_DOCK_REL;
  return Math.pow(p, n);
}
// #6: the strategic routes to a deep-space destination, with unlocked/in-use status
function marsRoutes(m){
  if(!m || !m.profile) return [];
  const nuclearEng=!!((ENGINES[state.transfer.eng]||{}).transferOnly); // NTR/NEP transfer engine
  return [
    {key:'heavy',    name:'Heavy-lift',        color:trackColor('propulsion'), available:true,
     active:!assemblyOn(m)&&!(state.depotUse>0)&&!nuclearEng,
     note:(state.research.super_heavy||state.research.cryo_upper)?'Brute-force chemical stack lifted from the pad.':'Bigger chemical engines (cryo upper / F-1) make this route practical.'},
    {key:'refuel',   name:'Refueling (depot)', color:trackColor('refueling'),  available:!!state.research.orbital_depot,
     active:state.depotUse>0,
     note:state.research.orbital_depot?'Top off the transfer stage from the LEO depot — launch it nearly dry.':'Needs Orbital Propellant Depot.'},
    {key:'nuclear',  name:'Nuclear (NTR/NEP)', color:trackColor('nuclear'),    available:!!state.research.nuclear_thermal,
     active:nuclearEng,
     note:state.research.nuclear_thermal?'High-Isp nuclear transfer engine — far less propellant mass.':'Needs Nuclear Thermal Propulsion.'},
    {key:'assembly', name:'Orbital Assembly',  color:trackColor('assembly'),   available:!!state.research.orbital_assembly,
     active:assemblyOn(m),
     note:state.research.orbital_assembly?'Assemble the stack in LEO from several launches — no giant booster.':'Needs Orbital Assembly & Docking.'},
  ];
}
function simulateMission(m){
  const crewMass=lifeSupport(m,state.eclss).total;
  const present={};
  if(m.modules.includes('transfer')) present.transfer={eng:state.transfer.eng, dry:inSpaceDry(state.transfer), propLeft:state.transfer.prop};
  if(m.modules.includes('lander')){
    present.descent={eng:state.descent.eng, dry:inSpaceDry(state.descent), propLeft:state.descent.prop};
    present.ascent ={eng:state.ascent.eng,  dry:inSpaceDry(state.ascent),  propLeft:state.ascent.prop};
  }
  const isru=ISRU_FREE_LEG[m.id];
  const isruActive = isru && state.research[isru.research];
  // Cryogenic boil-off: LH₂ (and, at half rate, CH₄) in-space stages lose propellant over the
  // mission's coast time. Cryo Boil-off Control research cuts the rate ~4×. Capped at 30% loss.
  let boiloff=null;
  { const mo=(m.days||0)/30;
    if(mo>0.5){
      const controlled=!!state.research.cryo_boiloff_control;
      const rate=controlled?BOILOFF_RATE_CONTROLLED:BOILOFF_RATE_BASE; // per month, LH₂; CH₄ at half
      let lost=0;
      for(const k in present){
        const prop=(ENGINES[present[k].eng]||{}).prop||'';
        const cryo=/LH₂/.test(prop)?1:(/CH₄|methal/i.test(prop)?0.5:0);
        if(!cryo) continue;
        const frac=Math.min(BOILOFF_CAP, rate*cryo*mo);
        const dl=present[k].propLeft*frac;
        present[k].propLeft-=dl; lost+=dl;
      }
      if(lost>0.01) boiloff={lost:Math.round(lost*100)/100, controlled};
    } }
  const cargoMass=m.cargo||0; // #73 Slice 2: uncrewed cargo carried through every leg, same as crew life support
  const stackMass=()=>{let s=crewMass+cargoMass; for(const k in present) s+=present[k].dry+present[k].propLeft; return s;};
  // #6: orbital assembly — these modules are pre-positioned in LEO, so the main launch doesn't lift them
  const asmSet = assemblyOn(m) ? new Set(assemblyModules(m)) : null;
  const legs=[]; let ok=true, inSpaceLegs=0;
  const gaMult=state.research.gravity_assist_planning?0.92:1; // gravity-assist chains shave the big injection burns
  const aeroMult=state.research.aerocapture?0.3:1; // I6: atmosphere does almost all the braking on a real capture burn — a much steeper cut than gravity-assist's trajectory shave, and a DIFFERENT leg (the insertion/capture itself, not the interplanetary injection), so the two can legitimately stack
  const legDv=(leg)=>{
    let dv=leg.dv;
    if(gaMult<1 && leg.by!=='lv' && /Jupiter|Belt Transfer|Saturn/i.test(leg.name||'')) dv=Math.round(dv*gaMult);
    if(aeroMult<1 && AEROCAPTURE_LEG_RE.test(leg.name||'')) dv=Math.round(dv*aeroMult);
    return dv;
  };
  for(const leg of m.profile){
    if(leg.by==='lv'){
      let upper=stackMass();
      if(asmSet){ // subtract pre-assembled modules from the lift mass (they're already docked in orbit)
        if(asmSet.has('transfer') && present.transfer) upper-=(present.transfer.dry+present.transfer.propLeft);
        if(asmSet.has('lander')){ if(present.descent) upper-=(present.descent.dry+present.descent.propLeft); if(present.ascent) upper-=(present.ascent.dry+present.ascent.propLeft); }
        upper=Math.max(upper, crewMass*0.5);
      }
      const perf=stackPerformance(state.stages, upper);
      // E4.6: a mission drawing from the depot (state.depotUse>0) whose own plane differs from the
      // depot's pays the rendezvous phasing burn HERE, on the same leg that reaches LEO — the depot
      // tops off tanks after this leg passes, but can't supply the plane-change itself. Zero for
      // every mission today (see depotPhasingDv); only non-zero once a future mission combines
      // .profile with .inclination AND the player opts into depotUse>0 for that flight.
      const phasingDv = (leg.name==='Ascent to LEO') ? depotPhasingDv(m) : 0;
      const legDvNeed = leg.dv + phasingDv;
      const pass=perf.totalDv>=legDvNeed && perf.twr>1.0;
      legs.push({name:leg.name, dv:legDvNeed, cap:Math.round(perf.totalDv), by:'lv', mass:upper, twr:perf.twr, pass, phasingDv:phasingDv||undefined});
      if(!pass) ok=false;
      // depot top-off happens once in LEO — added after this leg, not counted in the LV's lift mass
      if(present.transfer && state.depotUse>0 && leg.name==='Ascent to LEO'){ present.transfer.propLeft += state.depotUse; }
    }else if(isruActive && leg.name===isru.leg){
      // ISRU-produced propellant covers this burn entirely — no mass drawn from carried tanks
      inSpaceLegs++;
      legs.push({name:leg.name, dv:legDv(leg), cap:legDv(leg), by:leg.by, mass:stackMass(), pass:true, isru:isru.label});
    }else{
      inSpaceLegs++;
      const mod=present[leg.by];
      if(!mod){ legs.push({name:leg.name,dv:legDv(leg),by:leg.by,cap:0,mass:0,pass:false}); ok=false; }
      else{
        const mBefore=stackMass();
        const isp=(ENGINES[mod.eng]||ENGINES.a4).ispVac;
        const dvNeed=legDv(leg); const ga=dvNeed<leg.dv;
        const burned=mBefore-(mBefore/Math.exp(dvNeed/(isp*G0)));
        const cap=isp*G0*Math.log(mBefore/Math.max(mBefore-mod.propLeft, mBefore*0.001));
        const pass=burned<=mod.propLeft+1e-9;
        legs.push({name:leg.name, dv:dvNeed, cap:Math.round(cap), by:leg.by, mass:mBefore, pass, ga});
        if(pass) mod.propLeft-=burned; else ok=false;
      }
    }
    if(leg.dropAfter) for(const d of leg.dropAfter) if(d!=='lv') delete present[d];
  }
  return {boiloff, legs, ok, crewMass, inSpaceLegs};
}

// #7 manufacturing-visualisation: a step-by-step waterfall of how buildCost is built up.
// Mirrors the buildCost math in computeVehicle exactly — a validation test pins
// breakdown.total to v.buildCost across many state shapes, so the two stay in sync.

/* ---------- Mission net economics: the true margin after everything ----------
   A mission's real profit isn't just payout − build. It ties up capital for the whole
   build + flight campaign, during which the recurring monthly burn keeps running, and
   the direct build/launch/test spend lands up front. This estimates the net so the
   player can see whether a prestige mission actually pays or quietly bleeds the treasury.
   Uses the SAME payout formula as proceedLaunch so the estimate matches the payday. */
function estMissionPayout(m){
  const routine=!!state.completed[m.id];
  const wq=(m.window && state.committedWindow)?state.committedWindow.quality:1;
  let p=(routine?m.payout*0.4:m.payout)*wq*diff().payoutMult*econPayoutMult()*doctrineMult('payout');
  if(m.crew>0){ const ab=astroBonus?astroBonus():{payoutMult:1}; p*=ab.payoutMult||1; }
  if(!routine && state.scooped && state.scooped[m.id]) p*=SCOOP_PAYOUT_MULT;
  return round2(p);
}
function missionNetEconomics(m, v, sim){
  v=v||computeVehicle(); if(!sim && m.profile) sim=simulateMission(m);
  const tl=TEST_LEVELS[state.testLevel];
  const directCost=round2(v.buildCost + v.launchCost + (tl.cost||0));
  const campaignMo=(buildMonths(m)+1+(tl.months||0)) + Math.round((m.days||0)/30); // build+launch+test, then flight duration
  const monthlyNet=(state.lastMonth&&state.lastMonth.net!=null)?state.lastMonth.net:0; // current recurring net (funding, payroll, upkeep…)
  const carryCost=round2(-monthlyNet*campaignMo); // if net is negative, campaign months cost you this much
  const payout=estMissionPayout(m);
  const md=state.mandate;
  const mandateBonus=(md && md.accepted && md.missionId===m.id && absMonth()<=md.deadlineAbs)
    ? round2(md.bonus*(1+SCHEDULE_PRESSURE_MAX*(1-clampA((md.deadlineAbs-absMonth())/Math.max(1,md.deadlineAbs-md.offeredAbs),0,1)))) // P10: match fulfillMandateIfMatch's schedule-pressure premium
    : 0;
  const net=round2(payout + mandateBonus - directCost - carryCost);
  return {payout, mandateBonus, directCost, carryCost, campaignMo, monthlyNet, net, routine:!!state.completed[m.id]};
}
function missionNetHTML(m, v, sim){
  const e=missionNetEconomics(m, v, sim);
  const netColor=e.net>=0?'var(--ok)':'var(--bad)';
  const carryLine = e.carryCost>0.01
    ? `<div class="row" style="justify-content:space-between"><span class="dim">− Carry (${e.campaignMo} mo × ${fM(-e.monthlyNet)}/mo burn)</span><span style="font-family:var(--mono)">−${fM(e.carryCost)}</span></div>`
    : `<div class="row" style="justify-content:space-between"><span class="dim">Recurring cashflow over ${e.campaignMo} mo</span><span style="font-family:var(--mono);color:var(--ok)">covered</span></div>`;
  return `<div class="mission-tag" style="margin-top:8px">Net economics — the real margin</div>
    <div style="font-size:12px;padding:2px 0">
      <div class="row" style="justify-content:space-between"><span class="dim">Payout${e.routine?' (routine ×0.4)':''}</span><span style="font-family:var(--mono);color:var(--ok)">+${fM(e.payout)}</span></div>
      ${e.mandateBonus>0?`<div class="row" style="justify-content:space-between"><span class="dim">+ Mandate bonus</span><span style="font-family:var(--mono);color:var(--ok)">+${fM(e.mandateBonus)}</span></div>`:''}
      <div class="row" style="justify-content:space-between"><span class="dim">− Build + launch + test</span><span style="font-family:var(--mono)">−${fM(e.directCost)}</span></div>
      ${carryLine}
      <div class="row" style="justify-content:space-between;border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><b>Estimated net</b><b style="font-family:var(--mono);color:${netColor}">${e.net>=0?'+':''}${fM(e.net)}</b></div>
    </div>
    ${e.net<0?`<div class="flag warn">△ This mission is projected to lose money after ${e.campaignMo} months of carrying costs. Fine for a prestige/mandate first — but routine reflights at a loss will bleed the treasury.</div>`:''}`;
}


/* ---------- Engine differentiation: heritage, solid simplicity, insertion precision ----------
   Two levers give engines distinct identities beyond raw stats:
   1. HERITAGE — every engine accrues successful flights (state.engineHeritage[id]). A proven
      engine earns a manufacturing discount and a small reliability edge, so old workhorses
      (F-1, kerolox) stay relevant after newer engines unlock. Diminishing, capped.
   2. SOLIDS — dead-simple to build (no turbopumps): a flat build-cost discount. But no
      throttle or shutdown once lit, so using a solid as the FINAL orbital-insertion stage
      carries a small precision reliability tax (you can't trim the burn).
   All multipliers are pure functions of state — safe across save/load. */
const ENG_HERITAGE_MAX_FLIGHTS=20;   // heritage saturates here
const ENG_HERITAGE_COST_MAX=0.20;    // up to −20% build cost when fully proven
const ENG_HERITAGE_REL_MAX=0.03;     // up to +3% reliability contribution
const SOLID_SIMPLICITY_DISCOUNT=0.15;// −15% build cost — no turbopumps or plumbing
const SOLID_INSERTION_REL_TAX=0.04;  // −4% reliability if a solid is the final insertion stage

function engineHeritageFlights(id){ return (state.engineHeritage&&state.engineHeritage[id])||0; }
function engineHeritageFrac(id){ return Math.min(1, engineHeritageFlights(id)/ENG_HERITAGE_MAX_FLIGHTS); }
function engineCostMult(id){
  const e=ENGINES[id]; if(!e) return 1;
  let m=1;
  m -= ENG_HERITAGE_COST_MAX*engineHeritageFrac(id); // proven hardware is cheaper to build
  if(e.solid) m -= SOLID_SIMPLICITY_DISCOUNT;         // solids: no turbopumps, cheap to cast
  return Math.max(0.5, m);
}
function engineHeritageRelBonus(id){ return ENG_HERITAGE_REL_MAX*engineHeritageFrac(id); }
// fleet-wide heritage reliability edge: the best-proven engine on the current LV stack
function fleetHeritageRelBonus(){
  const ids=(state.stages||[]).map(s=>s.eng);
  if(boostersFitted&&boostersFitted()) ids.push(state.boosters.eng);
  if(!ids.length) return 0;
  return Math.max(...ids.map(id=>engineHeritageRelBonus(id)));
}
// effective per-unit engine cost used everywhere build cost is summed
function engCost(id){ const e=ENGINES[id]; return e?e.cost*engineCostMult(id):0; }
// record a successful flight's engines toward heritage (called on mission success)
function creditEngineHeritage(){
  if(!state.engineHeritage) state.engineHeritage={};
  const ids=new Set();
  (state.stages||[]).forEach(s=>ids.add(s.eng));
  if(boostersFitted&&boostersFitted()) ids.add(state.boosters.eng);
  const m=curMission();
  if(m&&m.profile){ if(m.modules.includes('transfer')) ids.add(state.transfer.eng);
    if(m.modules.includes('lander')){ ids.add(state.descent.eng); ids.add(state.ascent.eng); } }
  ids.forEach(id=>{ if(ENGINES[id]) state.engineHeritage[id]=Math.min(ENG_HERITAGE_MAX_FLIGHTS,(state.engineHeritage[id]||0)+1); });
}
// is a solid the final stage doing orbital insertion? (last stage, non-profile orbital-class mission)
function solidInsertionTax(m){
  const last=(state.stages||[])[ (state.stages||[]).length-1 ];
  if(!last||!ENGINES[last.eng]||!ENGINES[last.eng].solid) return 0;
  if(m&&m.profile) return 0; // deep missions insert with the transfer stage, not the LV
  if(m&&(m.reqDv||0)<7000) return 0; // sub-orbital / low-energy: no precise insertion needed
  return SOLID_INSERTION_REL_TAX;
}

function buildCostBreakdown(m){
  if(!m) m=curMission();
  const rows=[];
  let cost=state.stages.reduce((a,s)=>a+engCost(s.eng)*s.count+0.02*s.prop,0.1);
  const bmCost=boosterMasses();
  if(bmCost) cost+=engCost(bmCost.eng.id)*bmCost.count + 0.02*bmCost.propTotal;
  if(m && m.tanker){ cost+=0.02*state.transfer.prop; }
  else if(m && m.profile){
    if(m.modules.includes('transfer')) cost+=engCost(state.transfer.eng)+0.02*state.transfer.prop;
    if(m.modules.includes('lander')){
      cost+=engCost(state.descent.eng)+0.02*state.descent.prop;
      cost+=engCost(state.ascent.eng)+0.02*state.ascent.prop;
    }
  }
  rows.push({label:'Base hardware (engines + props + modules)', kind:'base', factor:null, delta:cost, running:cost});

  function mult(label, factor){
    if(!isFinite(factor) || factor===1) return;
    const prev=cost; cost=cost*factor;
    rows.push({label, kind:'mult', factor, delta:cost-prev, running:cost});
  }
  function add(label, amount){
    if(!isFinite(amount) || amount===0) return;
    const prev=cost; cost=cost+amount;
    rows.push({label, kind:'add', factor:null, delta:cost-prev, running:cost});
  }

  const d=diff().buildCostMult; if(d!==1) mult(`Difficulty (×${d.toFixed(2)})`, d);
  const facDisc=facilityBonus(missionBody(m&&m.id)).buildDiscount;
  if(facDisc>0) mult(`Home-field facility (−${(facDisc*100).toFixed(0)}%)`, 1-facDisc);
  const fam=activeFamily(), famMult=familyBuildMult(fam);
  if(famMult<1) mult(`Family heritage${fam?` "${esc(fam.name)}"`:''} (×${famMult.toFixed(2)})`, famMult);
  const foundry=foundryCostMult();
  if(foundry<1) mult(`Foundry L${prodLevel('foundry')} (×${foundry.toFixed(2)})`, foundry);
  const cad=cadenceSurcharge();
  if(cad>0) mult(`Cadence rush surcharge (+${(cad*100).toFixed(0)}%)`, 1+cad);
  const matMult=materialCostMult();
  if(matMult!==1){
    // Label hints at which side of the blend is moving — most useful when stockpiled.
    const inStock = MATERIAL_DEFS.filter(md=>{const s=materialState(md.key); return s&&s.stock>=1;}).map(md=>md.name);
    const tag = inStock.length>0?` · ${inStock.length===MATERIAL_DEFS.length?'all':inStock.join('+')} from stock`:'';
    mult(`Materials blend (×${matMult.toFixed(2)})${tag}`, matMult);
  }
  const mfg=mfgBuildMult();
  if(mfg<1) mult(`Manufacturing R&D (×${mfg.toFixed(2)})`, mfg);
  if(recoveryActive(m)){
    if(recoveryRefly(m)){
      const r=refurbCostMult();
      const wear=refurbWear();
      mult(`Refly refurbishment${wear>0?` (wear ${wear}/${REFLY_WEAR_MAX})`:''} (×${r.toFixed(2)})`, r);
    }
    add(`Recovery hardware (legs/fins/reserve)`, RECOVERY_HARDWARE);
  }
  return {rows, total: cost};
}
function buildCostBreakdownHTML(m){
  const bd=buildCostBreakdown(m);
  if(!bd.rows.length) return '';
  // Scale mini-bars against the largest |delta| in non-base rows so the smallest step still reads.
  const deltas=bd.rows.slice(1).map(r=>Math.abs(r.delta));
  const maxAbs=Math.max(0.01, ...deltas, Math.abs(bd.rows[0].delta));
  const rowsHTML=bd.rows.map((r,i)=>{
    const isBase=(i===0);
    const sign = r.delta>=0?'+':'';
    const deltaColor = isBase?'var(--ink)':(r.delta>0?'var(--bad)':'var(--ok)');
    const barFrac = Math.min(1, Math.abs(r.delta)/maxAbs);
    const barW = (barFrac*100).toFixed(1)+'%';
    const barColor = isBase?'var(--readout)':(r.delta>0?'var(--bad)':'var(--ok)');
    const side = r.delta>0?'left':(r.delta<0?'right':'left');
    return `<tr>
      <td style="padding:2px 6px;color:${isBase?'var(--ink)':'var(--dim)'};font-size:12px">${r.label}</td>
      <td style="padding:2px 4px;text-align:right;color:${deltaColor};font-size:12px;font-weight:600;white-space:nowrap">${sign}${fM(r.delta)}</td>
      <td style="padding:2px 6px;width:120px">
        <div style="position:relative;height:8px;background:#1a1a1a;border-radius:2px">
          <div style="position:absolute;top:0;${side}:0;width:${barW};height:100%;background:${barColor};border-radius:2px"></div>
        </div>
      </td>
      <td style="padding:2px 6px;text-align:right;color:var(--ink);font-size:12px;font-weight:${isBase?'400':'600'};white-space:nowrap">${fM(r.running)}</td>
    </tr>`;
  }).join('');
  return `<details style="margin:6px 0 10px"><summary style="cursor:pointer;color:var(--dim);font-size:12px;user-select:none;padding:4px 0">▸ Build-cost breakdown — ${bd.rows.length} step${bd.rows.length===1?'':'s'} · final ${fM(bd.total)}</summary>
    <table style="width:100%;margin-top:4px;border-collapse:collapse;background:var(--panel2);border-radius:4px">
      <thead><tr style="color:var(--dim);font-size:11px;text-transform:uppercase">
        <th style="padding:4px 6px;text-align:left;font-weight:500">Step</th>
        <th style="padding:4px 6px;text-align:right;font-weight:500">Δ</th>
        <th style="padding:4px 6px;text-align:left;font-weight:500">Effect</th>
        <th style="padding:4px 6px;text-align:right;font-weight:500">Running</th>
      </tr></thead>
      <tbody>${rowsHTML}</tbody>
    </table>
    <div class="dim" style="font-size:11px;padding:4px 6px;font-style:italic">Green bars are cuts (production R&amp;D, family heritage, inventory). Red bars are adds (difficulty, cadence rush, hot materials, recovery hardware).</div>
  </details>`;
}

function computeVehicle(){
  const m=curMission();
  const crewed=!!(m && m.crew>0);
  const payload=lvPayload(m);
  const perf=stackPerformance(state.stages, payload);
  const totalEng=state.stages.reduce((a,s)=>a+s.count,0);
  let totalProp=state.stages.reduce((a,s)=>a+s.prop,0);
  let buildCost=state.stages.reduce((a,s)=>a+engCost(s.eng)*s.count+0.02*s.prop,0.1);
  const bmCost=boosterMasses();
  if(bmCost){ buildCost+=engCost(bmCost.eng.id)*bmCost.count + 0.02*bmCost.propTotal; totalProp+=bmCost.propTotal; }
  if(m && m.tanker){
    buildCost+=0.02*state.transfer.prop; // cost of the cargo propellant itself, no engine needed
    totalProp+=state.transfer.prop;
  } else if(m && m.profile){
    if(m.modules.includes('transfer')){ buildCost+=engCost(state.transfer.eng)+0.02*state.transfer.prop; totalProp+=state.transfer.prop; }
    if(m.modules.includes('lander')){
      buildCost+=engCost(state.descent.eng)+0.02*state.descent.prop;
      buildCost+=engCost(state.ascent.eng)+0.02*state.ascent.prop;   totalProp+=state.ascent.prop;
    }
  }
  buildCost+=partsBuildCost(crewed); // BC2: avionics + fairing hardware cost
  const enginePenalty=Math.pow(0.975,totalEng-1);
  const testBonus=TEST_LEVELS[state.testLevel].rel;
  buildCost*=tankMaterial().costMult; // BC2: tank material cost factor
  buildCost*=diff().buildCostMult; // difficulty: hardware-cost scaling
  buildCost*=(1-facilityBonus(missionBody(m&&m.id)).buildDiscount); // M17: home-field build discount from a base at the destination
  buildCost*=familyBuildMult(activeFamily()); // #3: a proven lineage gets cheaper to build (manufacturing knowledge)
  buildCost*=foundryCostMult(); // #7: engine-foundry economies of scale cut marginal build cost
  const cadence=cadenceSurcharge(); if(cadence>0) buildCost*=1+cadence; // #7 slice 5: rush surcharge if recent build volume exceeds sustainable cadence
  buildCost*=materialCostMult(); // #7 slice 6: raw-material market price (alloys + electronics, blended with non-material baseline)
  buildCost*=mfgBuildMult(); // #6b: Manufacturing/Reuse research lowers build cost
  buildCost*=doctrineMult('build'); // CE3(a): Heavy-Lift doctrine builds cheaper
  if(recoveryActive(m)){ // M5: reusability — recovery hardware every flight; reflown booster on routine missions
    if(recoveryRefly(m)) buildCost*=refurbCostMult(); // refurbish a recovered booster: 45% of new, rising with wear (each refly chips +8%)
    buildCost+=RECOVERY_HARDWARE; // legs, grid fins, reserved propellant — fitted on every recovery flight
  }
  const reliability=Math.min(diff().relCap,Math.max(diff().relFloor,(curRel()+testBonus+partsRelBonus(crewed)+geoRelBonus()+benchRelBonus(m)+doctrineRelMod()+fleetHeritageRelBonus())*enginePenalty*boosterRelPenalty()*(crewed?(state.research.orbital_eva?0.95:0.92):1)*(1-solidInsertionTax(m))+productionRelMod(m)+((state.engineOut&&state.stages[0].count>=3)?0.025:0))); // Phase 3 engine-out: a stage-1 engine failure becomes survivable; #7: QA bonus − bay-overstretch penalty + bench-tested sub-assembly heritage; #16: booster failure-point penalty; BC2 parts + BC3 geometry reliability; CE3(a) doctrine early-reliability delta
  const launchCost=((0.12+0.01*totalProp)*padLaunchMult()*groundLaunchMult()*doctrineMult('launch')) + assemblyFlights(m)*ASSEMBLY_LAUNCH_COST; // #7: pads + #6b: Ground/Reuse research amortize launch ops; #6: dedicated assembly flights; CE3(a) doctrine launch-cost factor
  return {payload, sm:perf.sm, stageDv:perf.stageDv, stageTwr:perf.stageTwr, stageGravLoss:perf.stageGravLoss, gravLoss:perf.gravLoss, totalDv:perf.totalDv, liftoff:perf.liftoff, twr:perf.twr,
          boostDv:perf.boostDv||0, boosters:perf.boosters||null,
          totalEng, totalProp, reliability, buildCost, launchCost, crewed,
          dryTotal:perf.sm.reduce((a,b)=>a+b.dry,0)};
}

// Freeze the physical launch stack into mission playback. The renderer must not infer flight
// performance from a mission label: it receives the exact engines, propellant, structural mass,
// payload and current research multipliers that were used to approve this vehicle at launch.
function flightPhysicsSpec(m, vehicle){
  const v=vehicle||computeVehicle(), thrustK=thrustMult(), ispK=ispMult();
  const stages=state.stages.map((st,i)=>{
    const e=ENGINES[st.eng]||ENGINES.a4, masses=(v.sm&&v.sm[i])||stageMasses(st), dia=stageDia(st);
    return {engine:e.id,prop:st.prop,dry:masses.dry,wet:masses.wet,count:st.count,diameterM:clampA((.42+.20*Math.cbrt(Math.max(.1,st.prop)))*dia,.35,9),thrustSL:e.thrustSL*st.count*thrustK,thrustVac:e.thrustVac*st.count*thrustK,ispSL:e.ispSL*ispK,ispVac:e.ispVac*ispK,solid:!!e.solid};
  });
  const bm=boosterMasses(), boosters=bm?{count:bm.count,prop:bm.propTotal,dry:bm.dry,wet:bm.wet,diameterM:clampA(.38+.18*Math.cbrt(Math.max(.1,bm.propEach)),.32,6),thrustSL:bm.eng.thrustSL*bm.count*thrustK,thrustVac:bm.eng.thrustVac*bm.count*thrustK,ispSL:bm.eng.ispSL*ispK,ispVac:bm.eng.ispVac*ispK,solid:!!bm.eng.solid}:null;
  return {payload:v.payload,liftoff:v.liftoff,stages,boosters};
}
// #37 Max-Q structural check: the real peak dynamic pressure (kPa) THIS vehicle experiences flying
// THIS mission's ascent, from the same integrated trajectory the 3D flight uses (drag/thrust/gravity-
// turn, per-vehicle diameter and mass) — not the old cosmetic `35 + reqDv*0.003` display approximation.
// Reused for the structural-load fragility term below and surfaced on the bench so the fairing/tank
// choice reads against a real number. Returns 0 if the trajectory can't be built (degenerate vehicle).
function vehicleMaxQ(m, vehicle){
  try{
    const phys=flightPhysicsSpec(m, vehicle||computeVehicle());
    const plan=(typeof cape3dTrajectoryPlan==='function') ? cape3dTrajectoryPlan(phys, {isOrbital:missionReachesOrbit(m), reqDv:(m&&m.reqDv)||0}) : null;
    return plan && isFinite(plan.maxQKpa) ? plan.maxQKpa : 0;
  }catch(e){ return 0; }
}
// #37: the shared structural-load read used by BOTH the outcome model (structures fragility weight)
// and the bench readout, so they can never disagree. Combines the real peak Max-Q (game-scaled; the
// integrator runs ~10x real-world kPa, so MAXQ_REF is the in-game baseline a typical early vehicle
// produces, not 30-40 kPa) with the fairing's tolerance: a no-fairing vehicle is more sensitive to a
// high-Q ascent, an extended fairing less so. Crewed flights carry a capsule (no fairing choice), so
// they use neutral sensitivity. weightMult ∈ [0.6, 2.4] scales the structures failure SHARE only.
const MAXQ_REF=420;
function structuralLoadAssessment(m, v, crewed){
  const maxQ=vehicleMaxQ(m, v), qRatio=maxQ>0?maxQ/MAXQ_REF:1;
  const fairing=(curParts&&curParts().fairing)||'standard';
  const sens = crewed ? 1.0 : ({none:1.6, standard:1.0, heavy:0.65})[fairing] || 1.0;
  const qStress=(qRatio-1)*sens, weightMult=clampA(1+qStress, 0.6, 2.4);
  const band = qStress>=0.7?'Severe' : qStress>=0.3?'High' : qStress>=-0.15?'Nominal' : 'Low';
  return {maxQ, qRatio, sens, qStress, weightMult, band, fairing};
}
// One immutable, player-facing flight card.  It is built from the same mission/vehicle/outcome
// snapshots that resolve the launch, so overlay telemetry and the debrief never invent a number.
function flightReport(m, vehicle, sim, outcome){
  const v=vehicle||computeVehicle(), legs=(sim&&sim.legs)||[];
  const requiredDv=legs.length?legs.reduce((n,l)=>n+(Number(l.dv)||0),0):(m.reqDv||0);
  const payload=v.payload||0, days=Math.round(m.days||0), delivered=m.tanker?tankerDelivery():payload;
  const target=(BODIES.find(b=>b.id===missionBody(m.id))||{}).name||'Earth orbit';
  const kind=(outcome&&outcome.kind)||'planned';
  return {mission:m.name,target,payload,delivered,days,requiredDv,liftoff:v.liftoff||0,totalDv:v.totalDv||0,twr:v.twr||0,
    stages:(v.sm||[]).length,crew:m.crew||0,outcome:kind,failure:(outcome&&outcome.story)||'',subsystem:(outcome&&outcome.subsystem)||'',
    distanceKm: days>0 ? Math.round(days*86400*29.78) : (m.reqDv>=9000?40000:Math.max(5,Math.round((m.reqDv||0)*0.006))) };
}

// M-Complexity: base build time is 2 months for a single-stage vehicle with
// no extra modules. Each additional stage beyond the first, and each extra
// module a mission profile requires (transfer stage, lander — descent+ascent
// counts as one module, crew systems), adds a month of integration/assembly
// time. This is on top of the fixed 1-month launch campaign and any test
// campaign months from TEST_LEVELS.
const BASE_BUILD_MONTHS=2;
// M5: reusability & rapid cadence — first-stage recovery economics
const RECOVERY_HARDWARE=1.2;   // $M of legs/grid-fins/reserve propellant fitted on every recovery flight
const RECOVERY_REFLY_MULT=0.45;// a reflown (routine-mission) booster costs 45% of building new (1st refly)
// #7 slice 4 — refurbishment wear: each refly costs more and chips reliability; bounded so old boosters
// stay flyable but eventually want retirement. Foundry/QA still apply (foundryCostMult discounts
// buildCost unconditionally; the QA→#16 bridge tightens per-subsystem weights every flight).
const REFLY_WEAR_MAX=5;        // counter saturates at 5 reflights
const REFLY_WEAR_COST_PER=0.08;// cost mult rises +0.08/refly (0.45 → 0.85 at full wear)
const REFLY_WEAR_COST_CAP=0.85;
const REFLY_WEAR_REL_PER=0.008;// reliability hit per refly (0 → −4% at full wear)
const REFLY_WEAR_REL_CAP=0.04;
function recoveryAvailable(){ return !!state.research.propulsive_landing; }
function recoveryActive(m){ return recoveryAvailable() && !!state.recovery; } // recovery fitted to this design
function recoveryRefly(m){ return recoveryActive(m) && !!(m && state.completed[m.id]); } // booster already proven on a now-routine mission
// #7 slice 4: wear on the active family's recovered booster — proxy for accumulated micro-damage
function vehicleReflights(){ const f=activeFamily(); return f?(f.reflights||0):0; }
function refurbWear(){ return Math.min(REFLY_WEAR_MAX, vehicleReflights()); }
function refurbCostMult(){ return Math.min(REFLY_WEAR_COST_CAP, RECOVERY_REFLY_MULT + REFLY_WEAR_COST_PER*refurbWear()); }
function refurbRelPenalty(){ return Math.min(REFLY_WEAR_REL_CAP, REFLY_WEAR_REL_PER*refurbWear()); }
function buildMonths(m){
  const extra=vehicleUnits(m)-1; // stages beyond the first + profile modules + assembly flights
  let mo=BASE_BUILD_MONTHS+extra+bayBuildDelta(m); // #7: assembly-bay capacity speeds or stretches the build
  if(recoveryRefly(m)) mo-=1; // M5: reflying a recovered booster shortens turnaround (floored below)
  mo-=Math.round(buildTimeCut()); // #6c: Manufacturing/Ground research shortens build/turnaround time
  return Math.max(1, mo);
}

/* ---------- M16: subsystem-based reliability & story failures ----------
   The single success/fail roll becomes a set of subsystem rolls. Each subsystem's
   reliability is distributed so the PRODUCT equals the same overall mission
   reliability the game already computes (balance preserved) — but WHICH subsystem
   fails, weighted by how fragile your design makes it, determines the outcome:
   guidance faults degrade the orbit (partial), engine/structure/staging faults
   lose the vehicle (abort if a launch-escape system is fitted), and deep-space
   propulsion or life-support faults strand a crew on the way home. */
const PARTIAL_PAYOUT_MULT = 0.45;
const SUBSYS_LABEL = {propulsion:'Propulsion', boosters:'Boosters', structures:'Structures', separation:'Staging', avionics:'Guidance', deep_propulsion:'Deep-space propulsion', life_support:'Life support'};
// Which engineering specialties reduce each vehicle subsystem's fragility. New disciplines fold
// into an existing subsystem: materials strengthens structures, software strengthens avionics.
// A subsystem with only its original specialty behaves exactly as before (byte-identical when the
// new disciplines aren't hired).
const SUBSYS_SPECIALISTS = {propulsion:['propulsion'], structures:['structures','materials'], avionics:['avionics','software']};
// best (morale-scaled) skill among hired engineers who cover a given subsystem, 0..~1
function bestSpecialistSkill(spec){
  const specs=SUBSYS_SPECIALISTS[spec]||[spec];
  let best=0;
  for(const s of (state.staff||[])){ const p=personById(s.id); if(p && specs.includes(p.specialty)){ const tr=traitOf(s.id); best=Math.max(best, effSkill(s.id)*(0.5+0.5*((s.morale||50)/100))*(tr.rel||1)); } }
  return best;
}
function specialistFactor(spec){ return 1 - 0.45*bestSpecialistSkill(spec); } // a strong specialist cuts that subsystem's fragility
// overall mission reliability actually used at launch (vehicle rel + deep-leg penalty + astronaut bonus)
/* ---------- Radiation: dose = environment × duration, impacting equipment
   (avionics) and personnel (life-support + astronaut career dose), bought down by
   shielding/countermeasures/rad-hard avionics. Negligible in LEO/short flights;
   severe on long deep-space missions — so existing early/mid balance is preserved. */
const RAD_ENV = {earth:1, moon:2, venus:3, mars:3, phobos:3, belt:4, jupiter:9};
const RAD_K=6;             // saturation constant (env·years) → severity in [0,1)
const RAD_EQUIP_MAX=2.2;   // max extra avionics fragility from radiation
const RAD_CREW_MAX=2.8;    // max extra life-support fragility from radiation
const RAD_REL_MAX=0.12;    // max overall-reliability penalty from radiation
const DOSE_EXPO_DIVISOR=37, DOSE_PER_MISSION_CAP=60, RAD_CAREER_LIMIT=100, RAD_CAREER_WARN=75;
const RAD_REACTOR_CREW=1.2, REACTOR_DOSE_K=0.04; // onboard reactor/RTG radiation on the crew
function reactorCrewLoad(m){ return RAD_REACTOR_CREW*powerRad(m)*Math.min(1.5,(Math.max(0,(m&&m.days)||0))/365); } // proximity dose, duration-weighted
function radEnvironment(m){ const b=missionBody(m&&m.id); return (b&&RAD_ENV[b]) || (m&&m.profile?3:1); }
function radLoad(m){ return radEnvironment(m)*(Math.max(0,(m&&m.days)||0)/365); } // env·years
function radSeverity(m){ const L=radLoad(m); return L/(L+RAD_K); }                  // 0..1, saturating
function radShieldEquip(){ return (state.research.rad_shielding?0.5:1)*(state.research.redundant_avionics?0.8:1); } // ↓ = better shielded
function radShieldCrew(){ return (state.research.rad_shielding?0.5:1)*(state.research.radiation_countermeasures?0.6:1)*(state.research.closed_ecology?0.85:1); }
function radEquipMult(m){ return 1 + RAD_EQUIP_MAX*radSeverity(m)*radShieldEquip(); } // avionics fragility ×
function radCrewMult(m){ return 1 + (RAD_CREW_MAX*radSeverity(m) + reactorCrewLoad(m))*radShieldCrew(); } // ambient + onboard-reactor radiation on the crew (shielding mitigates both)
function radRelPenalty(m,crewed){ const f = crewed ? (radShieldEquip()+radShieldCrew())/2 : radShieldEquip(); return 1 - RAD_REL_MAX*radSeverity(m)*f; }
/* ---------- Power (Phase 1): solar-electric propulsion needs sunlight. Solar flux
   falls ~1/r² from the Sun, so ion/Hall drives power up fine inner-system but can't
   run their thrusters in the outer system — which forces a nuclear-electric (NEP)
   reactor drive there. Ties the electric and nuclear tracks together. */
const SOLAR_FLUX = {earth:1, moon:1, venus:1.9, mars:0.43, phobos:0.43, belt:0.11, jupiter:0.037};
const SOLAR_MIN_FLUX = 0.2; // below this a solar array can't deploy enough to be practical
function destSolarFlux(m){ const b=missionBody(m&&m.id); return (b!=null && SOLAR_FLUX[b]!=null) ? SOLAR_FLUX[b] : 1; }
function usesTransfer(m){ return !!(m && m.profile && m.modules && m.modules.includes('transfer')); }
function transferEng(){ return ENGINES[state.transfer.eng]||ENGINES.a4; }
// Phase 2 power budget: a chosen source (solar/RTG/reactor) must supply the vehicle's
// demand (baseline comms + ECLSS + electric-propulsion draw). Source mass adds to payload
// (rocket equation). Solar dies with distance; a nuclear-electric (NEP) drive self-powers.
const POWER_SOURCES = {
  solar:   {id:'solar',   name:'Solar Arrays',     kwPerTonne:12,  distScaled:true,  research:null,             rad:0,    blurb:'Light and cheap, but output falls with distance from the Sun.'},
  rtg:     {id:'rtg',     name:'RTGs',             kwPerTonne:0.6, distScaled:false, research:null,             rad:0.15, blurb:'A steady trickle of power anywhere — but very heavy per kilowatt.'},
  reactor: {id:'reactor', name:'Fission Reactor',  kwPerTonne:6,   distScaled:false, research:'nuclear_electric',rad:0.4,  blurb:'High output anywhere — the only practical source for power-hungry electric propulsion in the deep outer system.'},
};
function powerSourceDef(id){ return POWER_SOURCES[id]||POWER_SOURCES.solar; }
// Megawatt Electric Propulsion: +10% Isp on every electric drive. Applied by reconciliation
// against captured base values (safe across newGame / loadGame — never double-applies).
const _ELECTRIC_ENGS=['hall_thruster','ion_xenon','nep_snap'];
const _ELECTRIC_BASE_ISP={}; _ELECTRIC_ENGS.forEach(id=>{ if(ENGINES[id]) _ELECTRIC_BASE_ISP[id]=ENGINES[id].ispVac; });
function reconcileEngineMods(){
  const mult=(state&&state.research&&state.research.megawatt_electric)?1.10:1;
  _ELECTRIC_ENGS.forEach(id=>{ if(ENGINES[id]) ENGINES[id].ispVac=Math.round(_ELECTRIC_BASE_ISP[id]*mult); });
}
function selfPoweredCraft(m){ return usesTransfer(m) && !!transferEng().selfPowered; } // NEP carries its own reactor
// radiation from the onboard power source — a self-powered NEP counts as a full reactor
function powerRad(m){ if(!(m&&m.profile)) return 0; return selfPoweredCraft(m) ? POWER_SOURCES.reactor.rad : powerSourceDef(state.powerSource).rad; }
function eclssPowerPerCrew(){ const r=(ECLSS[state.eclss]||ECLSS.open).recovery; return 0.2 + r*1.4; } // closed-loop is power-hungry
function powerDemand(m){
  if(!(m&&m.profile)) return 0;
  let kw = 1.5 + (radEnvironment(m)>=4?1.5:0);          // avionics/comms baseline (more deep-space)
  if(m.crew>0) kw += m.crew*eclssPowerPerCrew();         // life support
  if(usesTransfer(m) && transferEng().powerDraw) kw += transferEng().powerDraw; // electric thruster draw
  return kw;
}
function powerSpecific(m){ const s=powerSourceDef(state.powerSource); return s.kwPerTonne*(s.distScaled?destSolarFlux(m):1); } // kW per tonne at this destination
function powerSystemMass(m){ if(!(m&&m.profile)||selfPoweredCraft(m)) return 0; const sp=powerSpecific(m); return sp>0? powerDemand(m)/sp : 0; }
function powerViable(m){
  if(!(m&&m.profile) || selfPoweredCraft(m)) return {ok:true};
  const s=powerSourceDef(state.powerSource);
  if(s.research && !state.research[s.research]) return {ok:false, why:`${s.name} needs the ${s.research} research before it can be fitted.`};
  if(s.distScaled && destSolarFlux(m) < SOLAR_MIN_FLUX){ const bn=(BODIES.find(x=>x.id===missionBody(m.id))||{}).name||'the destination';
    return {ok:false, why:`Solar Arrays can't power the spacecraft this far from the Sun (~${Math.round(destSolarFlux(m)*100)}% sunlight at ${bn}). Fit RTGs or a Fission Reactor.`}; }
  return {ok:true};
}
function effectiveReliability(m,v,sim,crewed){
  let rel=v.reliability;
  if(sim) rel=Math.max(0.30, rel*Math.pow(0.985, sim.inSpaceLegs));
  rel*=radRelPenalty(m,crewed); // radiation degrades reliability on long deep missions (bought down by shielding)
  rel*=(1-crisisRelPenalty(m)); // P11/I3: whichever crisis is active taxes reliability (0 unless it's active AND this mission matches its effect — LEO-class or deep-space)
  if(crewed){ const ab=astroBonus(); rel=Math.min(0.99, rel+ab.rel); }
  rel=Math.min(0.995, rel + facilityBonus(missionBody(m&&m.id)).relBump); // M17: home-field operational bonus
  rel=Math.min(0.995, rel + familyRelBonus(activeFamily())); // #3: reliability heritage of a proven lineage
  rel=Math.min(0.995, rel + synergyRelBonus()); // P8: cross-track research synergies (0 unless both/all requires are researched)
  rel=Math.min(0.995, rel + inquiryRelBonus(m,v,sim,crewed)); // P3: a funded failure inquiry's reliability credit, only while its subsystem is in play
  if(state.staticFixBonus) rel=Math.min(0.995, rel + state.staticFixBonus); // Phase 2: fault found & fixed on the test stand
  if(recoveryRefly(m)) rel=Math.max(diff().relFloor, rel - refurbRelPenalty()); // #7 slice 4: refurbishment wear — each refly chips a little reliability (bounded; mitigated by retiring the airframe)
  rel*=assemblyDockPenalty(m); // #6: each orbital docking is a chance to fail (halved by auto-rendezvous)
  if(m && m._arch && m._arch.relMod) rel=clampA(rel + m._arch.relMod, 0.1, 0.995); // M12: architecture reliability modifier
  return rel;
}
// does this mission actually reach orbital velocity (or fly a deep-space profile)? Suborbital/ballistic
// missions (First Flight, Sounding Rocket, Reach Space, High-Altitude Science, Reentry Test, First
// Astronaut) never circularize, so orbit/deep-space framing (wrong-orbit drift, a deep-space strand,
// a long coast home) shouldn't be able to fire on them.
function missionReachesOrbit(m){ return !!(m&&m.profile) || ((m&&m.reqDv)||0)>=9000; }
// relative fragility weights per subsystem (higher = likelier culprit), reflecting the design
function subsystemFragilities(m,v,sim,crewed){
  const stages=state.stages, totalEng=stages.reduce((a,s)=>a+s.count,0);
  let er=0,ec=0; stages.forEach(s=>{ const e=ENGINES[s.eng]||ENGINES.a4; er+=e.rel*s.count; ec+=s.count; });
  const avgEngRel=ec?er/ec:0.95;
  const list=[];
  let wp=(1.0+0.22*(totalEng-1))*(1+(0.96-avgEngRel)*7);
  if(state.research.test_program) wp*=0.7;
  wp*=specialistFactor('propulsion');
  list.push({key:'propulsion', label:SUBSYS_LABEL.propulsion, phase:'ascent', severity:'loss', weight:Math.max(0.05,wp)});
  if(boostersFitted()){ // #16: strap-on boosters are a distinct ascent failure point (ignition + separation)
    const eb=ENGINES[state.boosters.eng]||ENGINES.a4;
    const wb=0.14*state.boosters.count*(1+(0.95-eb.rel)*6)*specialistFactor('propulsion');
    list.push({key:'boosters', label:SUBSYS_LABEL.boosters, phase:'ascent', severity:'loss', weight:Math.max(0.05,wb)});
  }
  let ws=0.5;
  if(state.research.balloon_tanks) ws*=0.6; else if(state.research.alloy_tanks) ws*=0.78;
  ws*=specialistFactor('structures');
  // #37 Max-Q structural check vs. fairing choice: modulate the structures failure SHARE by how hard
  // this specific ascent actually loads the airframe (real peak dynamic pressure) against how well the
  // payload/structure choice tolerates it. Shifts ATTRIBUTION only — subsystemReport renormalizes so
  // ∏rel_i = R, so aggregate difficulty is unchanged; this just makes the fairing choice read against
  // a real number. (The fairing's small flat reliability delta on R still applies via partsRelBonus.)
  ws *= structuralLoadAssessment(m, v, crewed).weightMult;
  list.push({key:'structures', label:SUBSYS_LABEL.structures, phase:'ascent', severity:'loss', weight:Math.max(0.04,ws)});
  const sepEvents=Math.max(0,stages.length-1)+((m.profile&&m.modules.includes('lander'))?2:0)+((m.profile||m.reqDv>=9000)?1:0);
  if(sepEvents>0) list.push({key:'separation', label:SUBSYS_LABEL.separation, phase:'ascent', severity:'loss', weight:0.18*sepEvents});
  let wa=0.6;
  if(state.research.deep_space) wa*=0.7;
  wa*=specialistFactor('avionics');
  wa*=radEquipMult(m); // radiation upsets the electronics on long deep flights (mitigated by shielding / rad-hard avionics)
  list.push({key:'avionics', label:SUBSYS_LABEL.avionics, phase:'ascent', severity:'partial', weight:Math.max(0.05,wa)});
  if(m.profile && sim){
    const te=ENGINES[state.transfer.eng]||ENGINES.a4;
    const wd=0.4*(sim.inSpaceLegs||1)*(1+(0.96-te.rel)*6);
    list.push({key:'deep_propulsion', label:SUBSYS_LABEL.deep_propulsion, phase:'deep', severity:'deep', weight:Math.max(0.05,wd)});
  }
  if(crewed){
    const orbital=missionReachesOrbit(m); // suborbital hops (e.g. First Astronaut) don't get a deep-space "strand" — there's nowhere to be stranded on a 15-minute ballistic arc
    const rec=(ECLSS[state.eclss]||ECLSS.open).recovery;
    const stress=Math.min(3,(m.days||1)/45)*(1-rec*0.6);
    const lsWeight = orbital ? 0.45*Math.max(0.3,stress)*radCrewMult(m) : 0.45*stress*radCrewMult(m); // no floor on a suborbital hop — risk should track its (near-zero) duration
    list.push({key:'life_support', label:SUBSYS_LABEL.life_support, phase: orbital?'deep':'ascent', severity: orbital?'deep':'loss', weight:lsWeight}); // radiation is a crew-health stressor (mitigated by countermeasures/shielding)
  }
  const qm=qaFragMult(); // #7→#16: a QA-heavy line catches manufacturing defects, so mfg-subsystem failures lose share of the residual risk (avionics/life-support/deep-prop unchanged — QA can't fix software or radiation)
  if(qm<1) for(const e of list) if(QA_MFG_SUBSYS.has(e.key)) e.weight*=qm;
  return list;
}
// P3: is a funded failure-inquiry reliability credit in play on THIS flight? (its subsystem is present)
// Short-circuits before touching subsystemFragilities when no credit is active — zero overhead / drift when unfunded.
function inquiryCreditRelevant(m,v,sim,crewed){
  const c=state.inquiryCredit;
  if(!c || !(c.flights>0) || !c.rel) return false;
  return subsystemFragilities(m,v,sim,crewed).some(s=>s.key===c.subsystem);
}
function inquiryRelBonus(m,v,sim,crewed){ return inquiryCreditRelevant(m,v,sim,crewed) ? state.inquiryCredit.rel : 0; }
// distribute the mission failure probability across subsystems so the product of
// their reliabilities equals the overall R (rel_i = R^(weight_i / sum_weights))
function subsystemReport(m,v,sim,crewed,relMult=1){
  const R=effectiveReliability(m,v,sim,crewed)*(relMult||1); // #20: weather/ops penalties scale R for one flight
  const frs=subsystemFragilities(m,v,sim,crewed);
  const W=frs.reduce((a,f)=>a+f.weight,0)||1;
  return {R, subsystems:frs.map(f=>{ const rel=Math.pow(R, f.weight/W); return Object.assign({}, f, {rel, p:1-rel}); })};
}
const SUBSYS_PRIORITY=['propulsion','boosters','structures','separation','avionics','deep_propulsion','life_support'];
// CE5(a): the flight resolves as an ordered sequence of PHASES, each owning a set of subsystems.
// Per-phase reliability = the product of its subsystems' reliabilities, so the product across all
// phases equals the overall R (∏ phaseRel = R) — provably balance-neutral. This is the seam CE5(b)
// hooks a live abort / press-on call into; here the outcome selection is unchanged from the
// single-roll model (same rolls, same governing-priority pick).
const FLIGHT_PHASE_ORDER=['pad','ascent','staging','coast','deep','return'];
const FLIGHT_PHASE_LABEL={pad:'Pad & ignition', ascent:'Ascent', staging:'Staging', coast:'Orbit / coast', deep:'Deep space', return:'Reentry / return'};
const SUBSYS_PHASE={propulsion:'ascent', boosters:'ascent', structures:'ascent', avionics:'ascent', separation:'staging', deep_propulsion:'deep', life_support:'deep'};
function livePhaseOf(key){ return SUBSYS_PHASE[key]||'ascent'; }
// group a subsystemReport into ordered phases, each carrying its product reliability (∏ phaseRel = R)
function flightPhaseBreakdown(rep){
  const byPhase={};
  for(const s of rep.subsystems){ const ph=livePhaseOf(s.key); (byPhase[ph]=byPhase[ph]||[]).push(s); }
  const phases=[];
  for(const ph of FLIGHT_PHASE_ORDER){ const subs=byPhase[ph]; if(!subs||!subs.length) continue;
    const rel=subs.reduce((a,s)=>a*s.rel,1);
    phases.push({phase:ph, label:FLIGHT_PHASE_LABEL[ph], rel, p:1-rel, subsystems:subs}); }
  return phases;
}
// E1.5: render a flightPhaseBreakdown as plain-text lines (one per phase) — e.g.
//   "Ascent 91% — Propulsion 94%, Structures 97%, Separation 99%"
// Plain text only (no HTML): this feeds native title= tooltips and the log's detail field, neither
// of which renders markup. If govKey (the governing/failed subsystem) is supplied and present in a
// phase, that phase and that subsystem are marked unambiguously so a failure reads as a causal chain:
//   "✕ Ascent 91% — Propulsion 94% ✕FAILED, Structures 97%, Separation 99%"
function phaseBreakdownLines(phases, govKey){
  if(!phases || !phases.length) return [];
  return phases.map(ph=>{
    const failedHere = !!govKey && ph.subsystems.some(s=>s.key===govKey);
    const subs = ph.subsystems.map(s=>{
      const pc=Math.round(s.rel*100);
      return s.key===govKey ? `${s.label} ${pc}% ✕FAILED` : `${s.label} ${pc}%`;
    }).join(', ');
    return `${failedHere?'✕ ':''}${ph.label} ${Math.round(ph.rel*100)}% — ${subs}`;
  });
}
// ── DEV/CHEAT hooks (2026-07-11) — single-shot force flags for the dev menu (Ctrl+Shift+D). ──
// All are plain module-level vars (NOT state.*), consumed & reset the moment they're read, so they
// never touch the save file. resolveFlight/liveCallFlag/deepCallFlag/rollWeather each check "their"
// flag at the top; the dev panel (shell.js) sets one and fires a single launch to exercise the flow.
let _devForceOutcome=null; // 'success' | 'partial' | 'loss' | 'strand' — forces the next resolveFlight
let _devForceLiveCall=false;   // forces the next liveCallFlag() to fire (marginal-subsystem live call)
let _devForceReserve=false;    // forces the next deepCallFlag() to fire (deep-space reserve call)
let _devForceWeather=false;    // forces the next rollWeather() to return an adverse (scrub) condition
// Synthesize an outcome of the requested kind, matching resolveFlight's real return shape/fields so
// the whole downstream chain (live/reserve/anomaly hooks, finalizeLaunch, rescue) reads it correctly.
// Reuses the REAL per-phase machinery (subsystemReport/flightPhaseBreakdown) for `phases` so nothing
// that iterates outcome.phases chokes. 'strand' is crewed-deep-failure-shaped, so a forced strand on
// a crewed flight reaches finalizeLaunch's _pendingRescue branch exactly like a natural one.
function devSynthOutcome(kind, m, v, sim, crewed, relPenalty){
  const rep=subsystemReport(m,v,sim,crewed,1-(relPenalty||0));
  const phases=flightPhaseBreakdown(rep);
  let out;
  if(kind==='success') out={kind:'success', rel:Math.max(rep.R,0.98), failPhase:null, subsystem:null};
  else if(kind==='partial') out={kind:'partial', subsystem:'avionics', failPhase:null, rel:rep.R,
      story:'(dev) forced partial — guidance drifted; the payload reached space but off the planned trajectory.'};
  else if(kind==='strand') out={kind:'strand', subsystem:'life_support', failPhase:'deep', rel:rep.R,
      story:'(dev) forced strand — a life-support failure on the long coast home left the crew stranded but alive.'};
  else out={kind:'loss', subsystem:'propulsion', failPhase:'ascent', rel:rep.R,
      story:'(dev) forced loss — an engine failed during powered ascent.'};
  out.phases=phases; out.govPhase=out.subsystem?livePhaseOf(out.subsystem):null;
  return out;
}
function resolveFlight(m,v,sim,crewed,relPenalty=0){
  if(_devForceOutcome){ const k=_devForceOutcome; _devForceOutcome=null; return devSynthOutcome(k,m,v,sim,crewed,relPenalty); } // dev menu: single-shot forced outcome
  const rep=subsystemReport(m,v,sim,crewed,1-(relPenalty||0));
  const phases=flightPhaseBreakdown(rep); // CE5(a): per-phase decomposition (outcome unchanged)
  const failed={};
  for(const s of rep.subsystems){ if(Math.random()>s.rel) failed[s.key]=s; }
  let gov=null; for(const k of SUBSYS_PRIORITY){ if(failed[k]){ gov=failed[k]; break; } }
  let out;
  if(!gov) out={kind:'success', rel:rep.R, failPhase:null, subsystem:null};
  else if(gov.severity==='partial'){
    out={kind:'partial', subsystem:gov.key, failPhase:null, rel:rep.R, story: missionReachesOrbit(m)
      ? 'guidance drifted during ascent — the payload reached space but in the wrong orbit.'
      : 'guidance drifted during ascent — the payload reached space but well off the planned trajectory.'};
  }
  else if(gov.phase==='deep')
    out={kind:crewed?'strand':'loss', subsystem:gov.key, failPhase:'deep', rel:rep.R,
      story: gov.key==='life_support' ? 'a life-support failure on the long coast home.'
           : (crewed ? 'the return burn failed and the crew could not get home.' : 'the deep-space stage failed mid-cruise.') };
  else {
    const solidBoost=boostersFitted() && ENGINES[state.boosters.eng] && ENGINES[state.boosters.eng].solid;
    const storyMap={propulsion:'an engine failed during powered ascent.', structures:'a structural failure under max-q.', separation:'a stage failed to separate cleanly.',
      boosters: solidBoost ? 'a solid strap-on booster burned through its casing — with no way to shut it down, the vehicle was lost.' : 'a strap-on booster failed during the boost phase and took the vehicle with it.',
      life_support:'a cabin environmental-control fault surfaced during the brief flight.'};
    if(crewed && state.research.launch_escape)
      out={kind:'abort', subsystem:gov.key, failPhase:'ascent', rel:rep.R, story:storyMap[gov.key]+' The escape system pulled the crew clear.'};
    else out={kind:'loss', subsystem:gov.key, failPhase:'ascent', rel:rep.R, story:storyMap[gov.key]};
  }
  out.phases=phases; out.govPhase=gov?livePhaseOf(gov.key):null; // CE5(a) seam for the live-call hook
  return out;
}
// CE5(b): the near-miss live call. A loss-severity subsystem on an early phase (pad/ascent/
// staging) sitting in the amber band, on a flight that is still a real gamble, is the marginal
// flag the player can act on mid-launch. Eligibility is DETERMINISTIC (read off the per-phase
// breakdown, no RNG) so the headless / animations-off path never branches here and always
// "presses on" — i.e. finalizes the exact outcome resolveFlight already rolled. That keeps the
// sim provably balance-neutral; the abort is new AGENCY (trade the mission for the hardware/crew),
// available only as a live decision, with a real opportunity cost (amber ≠ doomed — it might hold).
const LIVE_CALL_SUB_HI=0.94;  // a loss-severity early subsystem at/under this reads as "amber"
// E1.2 slice A: routine reflights get a WIDER amber band, not the same one — a proven design
// isn't immune to a bad day, and this is the one lever that fixes decision frequency trending to
// zero as the player's engineering (and habit of reflying the same proven design) matures. Doesn't
// touch the underlying reliability roll at all, only how forgivingly it's read on a reflight.
const LIVE_CALL_SUB_HI_ROUTINE=0.97;
const LIVE_CALL_R_FLOOR=0.40; // ...but only fire when the flight overall is still a real gamble
const LIVE_CALL_PHASES={pad:1, ascent:1, staging:1}; // early phases where an abort can still save the vehicle
// dev menu: synthesize a live-call flag from an early-phase subsystem (or a last-resort fake), so
// "force live call" fires even when nothing is naturally amber. Matches the real {sub, phase} shape.
function devSynthLiveFlag(outcome){
  if(outcome && outcome.phases){
    for(const ph of outcome.phases){ if(!LIVE_CALL_PHASES[ph.phase]) continue;
      for(const s of ph.subsystems){ if(s.severity==='partial') continue; return {sub:s, phase:ph}; } }
    for(const ph of outcome.phases){ if(LIVE_CALL_PHASES[ph.phase] && ph.subsystems[0]) return {sub:ph.subsystems[0], phase:ph}; }
  }
  return {sub:{key:'propulsion', rel:0.9, label:'Propulsion', severity:'loss'}, phase:{phase:'ascent', label:'Ascent'}};
}
function liveCallFlag(outcome, routine){
  if(_devForceLiveCall){ _devForceLiveCall=false; return devSynthLiveFlag(outcome); } // dev menu: single-shot forced live call
  // the weakest loss-severity early-phase subsystem in the amber band, or null
  if(!outcome || !outcome.phases || (outcome.rel||0)<LIVE_CALL_R_FLOOR) return null;
  const subHi=routine?LIVE_CALL_SUB_HI_ROUTINE:LIVE_CALL_SUB_HI;
  let worst=null;
  for(const ph of outcome.phases){
    if(!LIVE_CALL_PHASES[ph.phase]) continue;
    for(const s of ph.subsystems){
      if(s.severity==='partial') continue;          // a partial-severity flag can't lose the vehicle — nothing to abort for
      if(s.rel>subHi) continue;                      // green enough — no call
      if(!worst || s.rel<worst.sub.rel) worst={sub:s, phase:ph};
    }
  }
  return worst;
}
// CE5(c): the deep-leg reserve-margin call. Far from home a deep-phase subsystem (deep propulsion
// or life support) can drift; if the flight was built carrying spare margin on its in-space burns,
// the player can BURN that reserve to nurse it through — salvaging a degraded result instead of
// gambling on the full roll. Like (b) this is deterministic eligibility + a balance-neutral default:
// the headless / animations-off path always BANKS the reserve, finalizing the exact rolled outcome.
const RESERVE_MARGIN_MIN=0.08; // min spare dV fraction on the tightest deep leg to have a reserve worth spending
// the tightest spare-dV fraction across the in-space (deep) legs — the mission's reserve margin
function deepReserveMargin(sim){
  if(!sim || !sim.legs) return 0;
  let worst=Infinity;
  for(const lg of sim.legs){ if(lg.by==='lv' || !lg.dv) continue;
    const frac=(lg.cap-lg.dv)/lg.dv; if(frac<worst) worst=frac; }
  return worst===Infinity ? 0 : Math.max(0, worst);
}
// the weakest drifting deep-phase subsystem on a flight that carries reserve margin, or null
// dev menu: synthesize a deep-phase reserve-call flag (or a last-resort fake), for "force reserve call".
function devSynthDeepFlag(outcome){
  if(outcome && outcome.phases){
    for(const ph of outcome.phases){ if(ph.phase!=='deep') continue; if(ph.subsystems[0]) return {sub:ph.subsystems[0], phase:ph}; }
  }
  return {sub:{key:'life_support', rel:0.9, label:'Life support', severity:'loss'}, phase:{phase:'deep', label:'Deep space'}};
}
function deepCallFlag(outcome, sim, routine){
  if(_devForceReserve){ _devForceReserve=false; return devSynthDeepFlag(outcome); } // dev menu: single-shot forced reserve call
  if(!outcome || !outcome.phases || (outcome.rel||0)<LIVE_CALL_R_FLOOR) return null;
  if(deepReserveMargin(sim) < RESERVE_MARGIN_MIN) return null; // no reserve to burn → no call
  const subHi=routine?LIVE_CALL_SUB_HI_ROUTINE:LIVE_CALL_SUB_HI; // E1.2 slice A: same wider-net-on-a-reflight idiom as liveCallFlag
  let worst=null;
  for(const ph of outcome.phases){
    if(ph.phase!=='deep') continue;
    for(const s of ph.subsystems){
      if(s.rel>subHi) continue;                           // not drifting — holding fine
      if(!worst || s.rel<worst.sub.rel) worst={sub:s, phase:ph};
    }
  }
  return worst;
}
function reserveKindWord(key){ return key==='life_support' ? 'consumables and power' : 'propellant'; }
function loseAssignedCrew(crewId, mission, story){
  crewId = crewId || state.assignedAstronaut; // 1.2b: an arriving deferred flight passes its own snapshotted crew
  if(!crewId) return;
  const p=personById(crewId);
  state.staff=(state.staff||[]).filter(s=>s.id!==crewId);
  if(p){ log('bad',`Astronaut ${p.name} was lost with the vehicle.`); addMemorial(crewId, p.name, mission, story); } // E1.4: memorial wall
  if(state.assignedAstronaut===crewId) state.assignedAstronaut=null; // only clear the live slot if it's this crew (don't clobber a concurrent flight)
}
// E1.4: memorial wall — name snapshotted at death (independent of the static pool, matching how
// front-page headlines snapshot their text) so it displays even if pool data ever changes.
function addMemorial(id, name, mission, story){
  (state.memorial=state.memorial||[]);
  state.memorial.push({id, name, when:dateStr(), mission:mission||'', story:story||''});
}
function memorialRoll(){ return state.memorial||[]; }
// E1.4: per-astronaut flight log — keyed by id so it survives the person leaving state.staff (death/fire/quit)
function logAstronautFlight(id,mission,outcome){
  (state.astronautLog=state.astronautLog||{});
  (state.astronautLog[id]=state.astronautLog[id]||[]).push({when:dateStr(),mission,outcome});
}
function astronautFlights(id){ return (state.astronautLog&&state.astronautLog[id])||[]; }
// the assigned astronaut accumulates radiation dose across their career; reaching the
// limit forces retirement (deep, long, unshielded missions cost the most).
function applyCrewDose(m, crewId){
  crewId = crewId || state.assignedAstronaut; // 1.2b: deferred arrival supplies the crew that actually flew
  if(!(m && m.crew>0) || !crewId) return;
  const sr=staffRecord(crewId); if(!sr) return;
  const days=Math.max(0,(m.days||0));
  const ambient=radEnvironment(m)*days/DOSE_EXPO_DIVISOR;
  const reactor=powerRad(m)*days*REACTOR_DOSE_K; // proximity dose from the onboard reactor/RTG
  const gain=Math.min(DOSE_PER_MISSION_CAP, (ambient+reactor)*radShieldCrew());
  if(gain<=0) return;
  const before=sr.dose||0; sr.dose=before+gain;
  const p=personById(sr.id), nm=p?p.name:'Astronaut';
  if(sr.dose>=RAD_CAREER_LIMIT){
    state.staff=(state.staff||[]).filter(s=>s.id!==sr.id);
    if(state.assignedAstronaut===sr.id) state.assignedAstronaut=null;
    reconcileDeptLeads(); // #19 slice C: a retiring corps lead is succeeded by the best remaining astronaut
    log('bad',`${nm} has reached the career radiation limit (${Math.round(sr.dose)} units) — grounded for good. They retire from the astronaut corps.`);
  } else if(before<RAD_CAREER_WARN && sr.dose>=RAD_CAREER_WARN){
    log('note',`${nm} is nearing the career radiation limit (${Math.round(sr.dose)}/${RAD_CAREER_LIMIT}) — one more deep mission may end their flying career.`);
  } else {
    log('note',`${nm} absorbed ${gain.toFixed(0)} units of radiation (career ${Math.round(sr.dose)}/${RAD_CAREER_LIMIT}).`);
  }
}
function subsystemBreakdownHTML(m,v){
  const sim=m.profile?simulateMission(m):null;
  const rep=subsystemReport(m,v,sim,v.crewed);
  const qaLvl=prodLevel('qa'), qaChip=qaLvl>1?` <span class="pill ok" title="QA L${qaLvl}: catches manufacturing defects on this subsystem before flight">🔬 QA L${qaLvl}</span>`:'';
  const rows=rep.subsystems.map(s=>{
    const pc=Math.round(s.rel*100), col=pc>=97?'var(--ok)':(pc>=92?'var(--warn)':'var(--bad)');
    const sev=s.severity==='partial'?'wrong orbit':(s.phase==='deep'?'lost in deep space':'loss of vehicle');
    const chip=QA_MFG_SUBSYS.has(s.key)?qaChip:'';
    return `<div class="leg"><span class="legname">${s.label}${chip}</span><span class="legdv" style="color:${col}">${pc}%</span><span class="legdetail">fault → ${sev}</span></div>`;
  }).join('');
  const fam=activeFamily();
  const famNote=fam&&familyRelBonus(fam)>0?` <span style="color:var(--ok)">${esc(fam.name)} heritage adds +${(familyRelBonus(fam)*100).toFixed(1)}% from ${fam.successes} proven flight${fam.successes===1?'':'s'}.</span>`:'';
  return `<div class="mission-tag" style="margin-top:12px">Subsystem reliability — the weakest link is where it breaks</div>
    <div class="legs" style="margin-top:6px">${rows}</div>
    <div class="dim" style="font-size:12px;margin-top:6px">Overall ${(rep.R*100)|0}% = the product of all subsystems. Test campaigns, tank/guidance research, and matching engineer specialists each harden a specific link.${famNote}</div>`;
}

/* ---------- #20 launch weather (go / no-go) ---------- */
// Slice 1 of Interactive Mission Control. On launch day the range is clear (GO) or
// hits an adverse condition; adverse weather is a player decision — scrub & wait
// (costs schedule) or launch anyway at a reliability penalty on this flight only.
// The rocket equation is untouched; weather scales reliability and time, nothing else.
let _pendingLaunch=null; // launch held at the weather gate, awaiting the go/no-go call
const WEATHER_CONDITIONS=[
  {id:'go',    weight:62,               label:'GO for launch'},
  {id:'wind',  weight:9, penalty:0.06,  clear:1, label:'High winds aloft',          detail:'Upper-level winds are over the airframe load limit — flying now overstresses the structure.'},
  {id:'storm', weight:8, penalty:0.08,  clear:1, label:'Thunderstorms in the area', detail:'Lightning is within the field. A strike during ascent would be catastrophic.'},
  {id:'cloud', weight:8, penalty:0.035, clear:1, label:'Heavy cloud cover',         detail:'Thick cloud blocks optical tracking and triggers cloud-electrification flight rules.'},
  {id:'shear', weight:7, penalty:0.05,  clear:1, label:'Wind shear aloft',          detail:'A shear layer could push the vehicle off its load-bearing attitude through max-q.'},
  {id:'cold',  weight:6, penalty:0.07,  clear:1, label:'Sub-limit low temperatures',detail:'Temperatures are below qualification — seals and joints stiffen in the cold.'},
];
function rollWeather(m){
  if(_devForceWeather){ _devForceWeather=false; // dev menu: single-shot forced adverse weather (a real WEATHER_CONDITIONS entry)
    const adv=WEATHER_CONDITIONS.find(c=>c.id!=='go')||WEATHER_CONDITIONS[0];
    return {id:adv.id, label:adv.label, adverse:true, penalty:adv.penalty||0.1, clear:adv.clear||1, detail:(adv.detail||'')+' (dev-forced scrub)'};
  }
  const total=WEATHER_CONDITIONS.reduce((a,c)=>a+c.weight,0);
  let r=Math.random()*total, pick=WEATHER_CONDITIONS[0];
  for(const c of WEATHER_CONDITIONS){ r-=c.weight; if(r<0){ pick=c; break; } }
  let penalty=pick.penalty||0, detail=pick.detail||'';
  // Challenger anchor: cold + solid strap-on boosters → field-joint O-ring risk
  const solidBoost=boostersFitted() && ENGINES[state.boosters.eng] && ENGINES[state.boosters.eng].solid;
  if(pick.id==='cold' && solidBoost){ penalty+=0.06; detail+=' The solid boosters’ field-joint O-rings stiffen dangerously in the cold (the Challenger lesson, 1986).'; }
  return {id:pick.id, label:pick.label, adverse:pick.id!=='go', penalty, clear:pick.clear||1, detail};
}
// E1.2 slice C: holds at pad-start (before the countdown even ramps) instead of a page modal
// before the overlay opens at all — the range-weather call is the very first thing about a launch.
function showWeatherModal(m,wx){
  openFlightForDecision({m, crewed:(m.crew||0)>0}, { holdAt:'pad-start', buildPanel:()=>{
    const pen=Math.round(wx.penalty*100);
    // Slice B reskin: frame the existing pad-start weather hold as the built-in T-31s hold (the last
    // hold before terminal count). Additive flavor only — the go/no-go decision + buttons are unchanged.
    return { title:'HOLD AT T-31s — WEATHER GO / NO-GO', color:themeColor('warn'),
      lines:[ `Countdown holding at the built-in T-31s hold for the range poll.`,
              `Range weather: ${wx.label}.`, wx.detail,
              `Scrubbing waits ~${wx.clear} month${wx.clear>1?'s':''}. Flying through it costs −${pen}% reliability, this flight only.` ],
      buttons:[
        {label:`Scrub & wait (${wx.clear} mo)`, ghost:true, action:scrubLaunch},
        {label:`Launch anyway (−${pen}% reliability)`, action:launchAnyway},
      ] };
  }});
}
function launchAnyway(){
  if(!_pendingLaunch) return; const p=_pendingLaunch; _pendingLaunch=null; hideModal();
  log('note',`${p.m.name}: launch director polled GO despite ${p.wx.label.toLowerCase()} — flying with a ${Math.round(p.wx.penalty*100)}% reliability penalty.`);
  proceedLaunch(p.m,p.v,p.sim,p.windowQuality,p.wx.penalty,p.prebuilt,p.hullId);
}
function scrubLaunch(){
  if(!_pendingLaunch) return; const p=_pendingLaunch; _pendingLaunch=null; hideModal();
  dismissAnim(); // E1.2 slice C: scrubbing skips months ahead to retry — that's a new attempt later, not a continuation of this held pad frame, so don't try to resume it across the time-skip
  advance(p.wx.clear);
  log('note',`${p.m.name}: scrubbed for weather (${p.wx.label}). Waited ${p.wx.clear} mo; the front passed.`);
  if(state.money<0){ gameOver(); return; }
  proceedLaunch(p.m,p.v,p.sim,p.windowQuality,0,p.prebuilt,p.hullId);
}

/* ---------- #20 slice 2: in-flight anomaly decisions ---------- */
// Independent in-space incidents on missions that reach their operational phase. The
// player's call modifies the result (payout/rep, or at worst a downgrade to partial —
// or, on a crewed life-support gamble, a strand). The base #16 failure model still
// governs hardware loss; anomalies are an ops-skill layer on top, and the safe option
// is always available. The rocket equation is untouched.
let _pendingOps=null; // a flight paused at an in-flight anomaly modal
let _pendingOrbitOps=null; // Earth-orbit flight paused at orbital insertion for a maneuver call
const ANOMALY_CHANCE_BASE=0.26;
const MISSION_ANOMALIES=[
  { id:'solar_array', title:'Solar array failed to deploy',
    when:c=> (c.m.profile || (!c.m.tanker && (c.m.reqDv||0)>=9000)),
    detail:'One solar wing is stuck half-latched and the power margin is falling — the payload can’t run every system.',
    options:c=>{ const o=[];
      if(c.crewed) o.push({id:'eva', label:'Send the crew on an EVA to free it', resolve:rng=> rng()<opsLuck(0.82)
        ? {repDelta:2, log:'a spacewalk freed the stuck wing — full power restored, mission nominal.'}
        : {payoutMult:0.8, outcomeOverride:'partial', log:'the EVA couldn’t free the array and burned consumables — the mission limps on at reduced output.'} });
      o.push({id:'reboot', label:'Command a deploy-motor reboot', resolve:rng=> rng()<opsLuck(0.55)
        ? {log:'the reboot cycled the motor and the wing latched — power restored.'}
        : {payoutMult:0.8, outcomeOverride:'partial', log:'the motor wouldn’t cycle; the array stays half-deployed and the payload runs degraded.'} });
      o.push({id:'degraded', label:'Accept it and run on reduced power', resolve:()=>
        ({payoutMult:0.82, outcomeOverride:'partial', log:'you fly a reduced-power mission — the objective is only partly met.'}) });
      return o; } },
  { id:'ls_leak', title:'Life-support leak detected',
    when:c=> c.crewed && (c.m.days||0)>=10,
    detail:'A slow cabin leak is bleeding atmosphere. At this rate the margins won’t last the whole flight.',
    options:c=>[
      {id:'reserves', label:'Tap emergency reserves and patch it', resolve:rng=> rng()<opsLuck(0.9)
        ? {repDelta:1, log:'the crew patched the leak and rode the reserves home — shaken but safe.'}
        : {payoutMult:0.7, outcomeOverride:'partial', log:'the patch held but reserves ran thin; the crew cut the mission short.'} },
      {id:'press_on', label:'Press on and hope it holds', resolve:rng=> rng()<opsLuck(0.6)
        ? {log:'the leak stabilized on its own — a lucky break, mission complete.'}
        : {outcomeOverride:'strand', log:'the leak worsened catastrophically far from home — the crew was lost.'} },
      {id:'abort', label:'Abort and bring the crew home now', resolve:()=>
        ({payoutMult:0, outcomeOverride:'partial', log:'you called it early — the crew is safe but the objective is forfeit.'}) },
    ] },
  { id:'guidance', title:'Terminal guidance radar malfunction',
    when:c=> !!c.m.profile,
    detail:'The terminal guidance radar is dropping out at the worst possible moment.',
    options:c=>{ const o=[];
      if(c.crewed) o.push({id:'manual', label:'Crew takes manual control', resolve:rng=> rng()<opsLuck(0.75)
        ? {repDelta:3, log:'steady hands flew it in by hand — a textbook result.'}
        : {payoutMult:0.8, outcomeOverride:'partial', log:'the manual approach drifted off-target — a partial result.'} });
      o.push({id:'retry', label:'Cycle the radar and retry the automated sequence', resolve:rng=> rng()<opsLuck(0.6)
        ? {log:'the radar recovered on the retry — nominal.'}
        : {payoutMult:0.82, outcomeOverride:'partial', log:'the automated system settled for a safe but off-target result.'} });
      return o; } },
];
function rollMissionEvents(ctx, rng){
  rng=rng||Math.random;
  const eligible=MISSION_ANOMALIES.filter(a=>{ try{ return a.when(ctx) && a.options(ctx).length>0; }catch(e){ return false; } });
  if(!eligible.length) return null;
  let chance=ANOMALY_CHANCE_BASE + (ctx.crewed?0.06:0) + (ctx.m.profile?0.06:0);
  if(ctx.rehearsed) chance*=REHEARSAL_ANOMALY_MULT; // #20 slice 4: rehearsal buys down ops risk
  chance*=(1-ctrlAnomScore()*CTRL_ANOMALY_CUT_MAX); // mission controllers prevent anomalies (0 when unstaffed → identical)
  if(rng()>=chance) return null;
  return eligible[Math.min(eligible.length-1, Math.floor(rng()*eligible.length))];
}
function showAnomalyModal(ev, ctx){
  const opts=ev.options(ctx);
  if(_pendingOps){ _pendingOps.ev=ev; _pendingOps.opts=opts; }
  const btns=opts.map((o,i)=>`<button class="btn${i?' ghost':''}"${i?' style="margin-top:8px"':''} onclick="resolveAnomaly(${i})">${o.label}</button>`).join('');
  showModal(`<h2 style="color:var(--warn)">⚠ In-flight anomaly</h2>
    <p><b>${ctx.m.name}</b> — ${ev.title}.</p>
    <p class="muted">${ev.detail}</p>
    <p>Mission Control needs a call.</p>
    ${btns}`);
}
function resolveAnomaly(i){
  if(!_pendingOps||!_pendingOps.opts) return;
  const ctx=_pendingOps, o=ctx.opts[i]; if(!o) return;
  _pendingOps=null; hideModal();
  const eff=o.resolve(Math.random)||{}, prior=ctx._priorOrbitOps||null; ctx._priorOrbitOps=null;
  if(prior){
    if(prior.log) log('note',`${ctx.m.name}: ${prior.log}`);
    eff.payoutMult=(prior.payoutMult==null?1:prior.payoutMult)*(eff.payoutMult==null?1:eff.payoutMult);
    eff.repDelta=(prior.repDelta||0)+(eff.repDelta||0);
    if(prior.outcomeOverride&&!eff.outcomeOverride) eff.outcomeOverride=prior.outcomeOverride;
  }
  finalizeLaunch(ctx, eff);
}

/* ---------- Flight 3D: Earth-orbit maneuver decisions ---------- */
function orbitalManeuverBudget(ctx){
  if(!ctx||!ctx.m||!ctx.v) return 0;
  return Math.max(0,Math.round((Number(ctx.v.totalDv)||0)-effectiveReqDv(ctx.m)));
}
function orbitalManeuverOptions(ctx){
  const budget=orbitalManeuverBudget(ctx), inc=Number(ctx&&ctx.m&&ctx.m.inclination)||LAUNCH_SITE_LAT;
  const make=(id,label,cost,profile,effect)=>({id,label,cost,enabled:budget>=cost,profile:Object.assign({inclination:inc,remainingDv:Math.max(0,budget-cost)},profile),effect:effect||{}});
  const opts=[
    make('circularize','Execute planned circularization',0,{label:'NOMINAL ORBIT',periapsis:200,apoapsis:205},{repDelta:1,log:'Mission Control completed the insertion correction; the spacecraft is stable in its target orbit.'}),
    make('raise','Raise orbit · 120 m/s',120,{label:'ORBIT RAISE',periapsis:205,apoapsis:420},{payoutMult:1.05,repDelta:2,log:'Mission Control used the available margin to raise apogee and expand the mission envelope.'}),
    make('lower','Lower orbit · 70 m/s',70,{label:'LOW ORBIT',periapsis:155,apoapsis:205},{payoutMult:.9,outcomeOverride:'partial',log:'Mission Control lowered the orbit; the payload is safe, but lifetime and coverage are reduced.'}),
    make('deorbit','Deorbit / recover vehicle',0,{label:'DEORBIT',periapsis:35,apoapsis:190},{outcomeOverride:'scrub',log:'Mission Control commanded an early deorbit; the vehicle was recovered and the objective was forfeited.'})
  ];
  return opts;
}
function showOrbitalManeuverDecision(ctx){
  const opts=orbitalManeuverOptions(ctx), budget=orbitalManeuverBudget(ctx);
  _pendingOrbitOps={ctx,opts};
  openFlightForDecision(ctx,{holdAt:'orbit-start',buildPanel:()=>({
    title:'ORBITAL INSERTION · MANEUVER GO/NO-GO',
    lines:[`Tracking confirms insertion. ${budget.toLocaleString()} m/s of maneuver margin remains.`,
      'Select the orbit plan. Mission elapsed time is paused while Mission Control evaluates the burn.'],
    buttons:opts.filter(o=>o.enabled).map(o=>({label:o.label,ghost:o.id!=='circularize',action:()=>resolveOrbitalManeuver(o.id)}))
  })});
}
function resolveOrbitalManeuver(id){
  const pending=_pendingOrbitOps; if(!pending) return false;
  const opt=pending.opts.find(o=>o.id===id&&o.enabled); if(!opt) return false;
  _pendingOrbitOps=null; hideModal();
  pending.ctx.orbitOps=Object.assign({id:opt.id,cost:opt.cost},opt.profile);
  // A commanded deorbit ends orbital operations immediately; do not roll a later payload anomaly
  // after Mission Control has already elected to recover the vehicle and forfeit the objective.
  if(opt.id==='deorbit') finalizeLaunch(pending.ctx,opt.effect);
  else maybeAnomaly(pending.ctx,opt.effect);
  return true;
}

/* ---------- CE5(b): the live abort / press-on call ---------- */
// A marginal early-phase subsystem flags amber mid-launch. The player chooses, BEFORE the
// outcome is revealed, to press on (fly the flight as resolveFlight already rolled it — the
// balance-neutral default the headless path also takes) or abort now: a precautionary `scrub`
// that saves the vehicle and crew but forfeits the mission. Amber ≠ doomed, so the abort trades
// a possibly-successful mission for certainty — genuine agency with a real opportunity cost.
let _pendingLive=null; // a flight paused at the live abort / press-on call
// E1.2 slice C: lives IN the flight overlay (opened early by openFlightForDecision, held at the
// pad→ascent handoff by drawScene) instead of a page-level showModal popping up before the overlay
// even opens. buildPanel() is called once, at hold-time, by drawDecisionPanel — canvas fillText, not
// innerHTML, so no esc() needed (there's no markup parsing to inject into either way).
function showLiveCallModal(ctx, flag){
  openFlightForDecision(ctx, { buildPanel:()=>{
    const m=ctx.m, sub=flag.sub, ph=flag.phase, pc=Math.round(sub.rel*100);
    const subName=SUBSYS_LABEL[sub.key]||sub.label;
    const crewLine=ctx.crewed?' Crew strapped in, awaiting your call.':'';
    const routineLine=ctx.routine?' A proven design isn\'t immune to a bad day.':'';
    return { title:'⚠ MARGINAL SUBSYSTEM — LIVE CALL', color:themeColor('warn'),
      lines:[ `${subName} flagging amber on ${ph.label.toLowerCase()}, holding at just ${pc}%.`,
              `It may hold — or let go and take the vehicle with it.${crewLine}${routineLine}` ],
      buttons:[
        {label:'Press on — fly it', action:()=>resolveLiveCall(true)},
        {label:`Abort now — save the vehicle${ctx.crewed?' & crew':''}`, ghost:true, action:()=>resolveLiveCall(false)},
      ] };
  }});
}
function resolveLiveCall(pressOn){
  const ctx=_pendingLive; if(!ctx) return;
  _pendingLive=null; hideModal();
  if(pressOn){ postResolve(ctx); return; } // fly the outcome resolveFlight already rolled (balance-neutral)
  const flag=ctx.liveFlag, ph=flag?flag.phase:null, subKey=flag?flag.sub.key:null;
  const subName=(SUBSYS_LABEL[subKey]||'systems').toLowerCase();
  ctx.outcome=Object.assign({}, ctx.outcome, { kind:'scrub', subsystem:subKey,
    failPhase:ph?ph.phase:'ascent',
    story:`a precautionary abort on ${(ph?ph.label:'ascent').toLowerCase()} after the ${subName} flagged marginal — the vehicle was brought back intact.` });
  finalizeLaunch(ctx, null);
}

/* ---------- CE5(c): the deep-leg reserve-margin call ---------- */
// Far from home a deep-phase subsystem is drifting. With reserve margin aboard the player can
// BURN it to nurse the system through — guaranteeing a salvaged `partial` instead of gambling on
// the full roll (which could come home a clean success or a deep loss / crew strand). Banking the
// reserve flies the exact outcome resolveFlight already rolled — the balance-neutral default the
// headless path also takes. The trade is real: spend and the system would have held, you've burned
// margin for a degraded result; bank and it lets go, you eat the loss. Carrying reserves (extra
// propellant = more mass, a rocket-equation cost paid at build time) is what buys this option.
let _pendingReserve=null; // a flight paused at the deep-leg reserve call
// E1.2 slice C: holds at cislunar-start (entering the deep cruise) — its own "far from home" moment.
function showReserveModal(ctx, flag){
  openFlightForDecision(ctx, { holdAt:'cislunar-start', buildPanel:()=>{
    const m=ctx.m, sub=flag.sub, ph=flag.phase, pc=Math.round(sub.rel*100);
    const subName=SUBSYS_LABEL[sub.key]||sub.label;
    const word=reserveKindWord(sub.key);
    const marginPct=Math.round(deepReserveMargin(ctx.sim)*100);
    return { title:'⚠ DEEP-SPACE DRIFT — RESERVE CALL', color:themeColor('warn'),
      lines:[ `${subName} drifting far from home, holding at ${pc}%. ~${marginPct}% reserve margin aboard.`,
              `Burn the reserve ${word} to nurse it through for certain, or bank it and fly as built.` ],
      buttons:[
        {label:'Burn the reserve — salvage a partial', action:()=>resolveReserveCall(true)},
        {label:'Bank the reserve — fly it as built', ghost:true, action:()=>resolveReserveCall(false)},
      ] };
  }});
}
function resolveReserveCall(spend){
  const ctx=_pendingReserve; if(!ctx) return;
  _pendingReserve=null; hideModal();
  if(!spend){ maybeAnomaly(ctx); return; } // bank → today's flow (balance-neutral), anomaly may still fire
  const f=ctx.deepFlag, subKey=f?f.sub.key:null;
  const subName=(SUBSYS_LABEL[subKey]||'systems').toLowerCase();
  ctx.outcome=Object.assign({}, ctx.outcome, { kind:'partial', subsystem:subKey, failPhase:null,
    story:`reserve ${reserveKindWord(subKey)} was burned deep in the cruise to nurse the drifting ${subName} through — the objective was salvaged, degraded.` });
  finalizeLaunch(ctx, null); // the deep-space decision was the drama; resolve it directly
}

/* ---------- #20 slice 3: rescue missions & contingency ---------- */
// A strand (deep-space crew that can't get home) is no longer an automatic loss: the
// player can mount a rescue — capital + months + a success chance. The chance is the
// "contingency planning" lever — it rises with rendezvous/propulsion tech, standing
// infrastructure (facilities), and reputation, so a prepared agency saves more crews.
// A successful rescue is the new `rescued` outcome (crew home, vehicle/mission lost).
let _pendingRescue=null; // a strand paused at the rescue decision
function rescueChance(m){
  let c=0.55;
  c -= Math.min(0.35, (m.days||0)/2000*0.35);                  // farther / longer → harder to reach in time
  c += Math.min(0.15, (state.rep||0)/600);                     // a well-funded agency mounts a better effort
  if(state.research&&state.research.auto_rendezvous) c+=0.10;  // rapid automated rendezvous
  if(state.research&&state.research.nuclear_thermal) c+=0.10;  // fast-transit rescue craft
  if((state.facilities||[]).length>0) c+=0.08;                 // standing infrastructure = contingency capability
  c += ctrlRescueScore()*CTRL_RESCUE_BONUS_MAX;                // mission controllers run a tighter rescue (0 when unstaffed)
  return Math.max(0.10, Math.min(0.90, c));
}
function rescueCost(m){ return Math.max(3, Math.round((m.payout||10)*0.6)); }
function rescueMonths(m){ return m.profile?6:3; }
// E1.2 slice C: holds at cislunar-start — same "far from home" moment as the reserve call.
function showRescueModal(ctx, outcome){
  openFlightForDecision(ctx, { holdAt:'cislunar-start', buildPanel:()=>{
    const m=ctx.m, cost=rescueCost(m), months=rescueMonths(m), chance=Math.round(rescueChance(m)*100);
    const afford=state.money>=cost;
    const sub=outcome.subsystem?(SUBSYS_LABEL[outcome.subsystem]||'systems').toLowerCase():'systems';
    const buttons=[];
    if(afford) buttons.push({label:`Mount a rescue (${fM(cost)}, ~${months} mo, ${chance}%)`, action:mountRescue});
    buttons.push({label:'Abandon the mission (crew lost)', ghost:true, action:abandonRescue});
    return { title:'CREW STRANDED IN DEEP SPACE', color:themeColor('bad'),
      lines:[ `A ${sub} failure left the crew stranded but alive — they can't get home alone.`,
              afford ? 'A rescue is a long shot: a fast-tracked launch, a hard rendezvous, the clock against you.'
                     : `A rescue would cost ${fM(cost)} — not affordable right now.` ],
      buttons };
  }});
}
function mountRescue(){
  if(!_pendingRescue) return;
  const {ctx}=_pendingRescue; _pendingRescue=null; hideModal();
  const m=ctx.m, cost=rescueCost(m), months=rescueMonths(m), chance=rescueChance(m);
  state.money-=cost;
  log('note',`${m.name}: emergency rescue launched — ${fM(cost)} committed; crews work around the clock.`);
  advance(months);
  if(Math.random()<chance){
    finalizeLaunch(ctx, {rescueResolved:true, outcomeOverride:'rescued',
      story:`After ${months} tense months a rescue craft reached the stranded crew and brought them home alive.`});
  }else{
    finalizeLaunch(ctx, {rescueResolved:true, outcomeOverride:'strand',
      story:`a rescue launched but couldn't reach the crew in time — they were lost ${months} months into the ordeal.`});
  }
}
function abandonRescue(){
  if(!_pendingRescue) return;
  const {ctx, ops}=_pendingRescue; _pendingRescue=null; hideModal();
  finalizeLaunch(ctx, Object.assign({}, ops||{}, {rescueResolved:true}));
}

/* ---------- #20 slice 4: pre-flight rehearsal & readiness ---------- */
// A test campaign buys down hardware reliability; a rehearsal buys down OPERATIONS risk —
// rehearsing contingencies cuts the in-flight anomaly chance (slice 2) for a cost + a month.
// The readiness readout is the "tools" layer: weather GO odds, anomaly risk, and rescue odds.
const REHEARSAL_ANOMALY_MULT=0.4; // a rehearsed flight runs anomalies at 40% of the base chance
const REHEARSAL_MONTHS=1;
function rehearsalCost(m){ return Math.max(1, Math.round((m.payout||10)*0.15)); }
function toggleRehearsal(){ state.rehearsal=!state.rehearsal; render(); }
function flightReadiness(m){
  const wTotal=WEATHER_CONDITIONS.reduce((a,c)=>a+c.weight,0);
  const goPct=Math.round((WEATHER_CONDITIONS.find(c=>c.id==='go').weight/wTotal)*100);
  const crewed=m.crew>0, ctx={m,crewed};
  const eligible=MISSION_ANOMALIES.some(a=>{ try{ return a.when(ctx)&&a.options(ctx).length>0; }catch(e){ return false; } });
  const anomaly=eligible?Math.min(0.99, (ANOMALY_CHANCE_BASE+(crewed?0.06:0)+(m.profile?0.06:0))*(1-ctrlAnomScore()*CTRL_ANOMALY_CUT_MAX)):0;
  return {goPct, anomaly, anomalyRehearsed:Math.min(0.99, anomaly*REHEARSAL_ANOMALY_MULT),
          crewed, rescue:crewed?rescueChance(m):null};
}
function rehearsalHTML(m){
  const on=!!state.rehearsal, cost=rehearsalCost(m), rd=flightReadiness(m);
  const anomTxt=rd.anomaly>0
    ? `${Math.round(rd.anomaly*100)}%${on?` → <b style="color:var(--ok)">${Math.round(rd.anomalyRehearsed*100)}%</b> (rehearsed)`:''}`
    : 'none likely for this profile';
  return `<div class="mission-tag" style="margin-top:8px">Mission readiness & rehearsal</div>
    <div style="font-size:12px;line-height:1.8;margin:4px 0;color:var(--muted)">
      <div>Weather GO odds: <b style="color:var(--ink)">${rd.goPct}%</b> <span class="dim">(else a launch-day go/no-go call)</span></div>
      <div>In-flight anomaly risk: <b style="color:var(--ink)">${anomTxt}</b></div>
      ${rd.crewed?`<div>Deep-space rescue odds if stranded: <b style="color:var(--ink)">${Math.round(rd.rescue*100)}%</b></div>`:''}
    </div>
    <button class="btn" style="font-size:12px;padding:4px 10px;${on?'border-color:var(--ok);color:var(--ok)':''}" onclick="toggleRehearsal()">${on?'✓ Rehearsal ON':'Rehearsal OFF'}</button>
    <span class="dim" style="font-size:12px;margin-left:8px">Rehearse contingencies — ${fM(cost)} · +${REHEARSAL_MONTHS} mo · anomaly risk × ${REHEARSAL_ANOMALY_MULT}.</span>`;
}

/* ---------- launch ---------- */
function canLaunch(v,m,sim,prebuilt){
  if(m.tanker){
    if(v.totalDv < m.reqDv) return {ok:false,why:'Δv shortfall — this design can\'t reach LEO to deliver propellant.'};
    if(v.twr<=1.0) return {ok:false,why:'Thrust-to-weight ≤ 1 — it will not leave the pad.'};
  }else if(m.profile){
    const pw=powerViable(m); if(!pw.ok) return {ok:false,why:pw.why};
    if(!sim||!sim.ok) return {ok:false,why:'A mission leg falls short — size the launch vehicle and transfer stage for every burn.'};
    if((state.depotUse||0) > state.depot) return {ok:false,why:`Depot only holds ${state.depot.toFixed(1)} t — reduce the depot draw.`};
  }else{
    { const cap=padMassCap();
      if(v.liftoff>cap) return {ok:false,why:`Pad limit — ${v.liftoff.toFixed(0)} t on a ${cap} t pad. The ground can't take this vehicle: research ${padCapNext()} to raise the ceiling.`}; }
    { const need=effectiveReqDv(m);
      if(v.totalDv < need) return {ok:false,why:`Δv shortfall — ${Math.round(v.totalDv).toLocaleString()} of ${need.toLocaleString()} m/s (${Math.round(need-v.totalDv).toLocaleString()} short). Add propellant, engines, or a stage on the bench.`}; }
    if(v.twr<=1.0) return {ok:false,why:'Thrust-to-weight ≤ 1 — it will not leave the pad.'};
  }
  if(m.window){
    const cw=state.committedWindow;
    if(!cw||cw.missionId!==m.id) return {ok:false,why:'No launch window committed — pick one from the Launch Window Planner below.'};
    const tl=TEST_LEVELS[state.testLevel], leadDays=((prebuilt?0:buildMonths(m))+1+tl.months+(state.rehearsal?REHEARSAL_MONTHS:0))*DAYS_PER_MONTH; // build/test/launch lead in days
    if(absDay()+leadDays>cw.abs) return {ok:false,why:'Too late for the committed window — build time would carry you past it. Cancel and pick a later one.'};
    if(absDay()+leadDays<cw.abs-DAYS_PER_MONTH) return {ok:false,why:`Window not yet open — ${dayToDate(cw.abs)}. Advance time (research keeps progressing) or build closer to launch.`};
  }
  const tl=TEST_LEVELS[state.testLevel];
  const total=(prebuilt?0:v.buildCost)+v.launchCost+tl.cost+(state.rehearsal?rehearsalCost(m):0)+0.12*((prebuilt?0:buildMonths(m))+1+tl.months);
  if(state.money<total) return {ok:false,why:'Not enough capital to build, test, and fly this mission.'};
  return {ok:true};
}
function tankerDelivery(){
  // the transfer-stage tank IS the cargo on a tanker run: its propellant is delivered to the depot.
  return state.transfer.prop;
}
function launch(prebuilt,hullId){
  if(_pendingLaunch||_pendingLive||_pendingOrbitOps||_pendingSetback||_pendingRivalDisaster) return; // a decision modal owns the flow — no re-entry
  if(vehPopoutOpen) closeVehPopout(); // launching from the pop-out returns to the normal flight flow
  const m=curMission();
  const v=computeVehicle();
  const sim=m.profile?simulateMission(m):null;
  const chk=canLaunch(v,m,sim,prebuilt); if(!chk.ok){return;}
  // User request: a fresh (non-prebuilt) commit now builds as a tracked, real-time campaign instead
  // of resolving the whole build+test+launch span in one instant jump — reuses the exact same
  // queue/hangar machinery "Queue this build" already has (progress bar, per-day ticking, hangar
  // landing), just flagged `committed` for clearer log text. Flying from the hangar (prebuilt=true,
  // below) is untouched — that's still a deliberate, separate manual click once it's ready.
  // Window missions (m.window) are excluded on purpose: their build/test timing has to land exactly
  // on the committed transfer-window date (see canLaunch's window checks above), which the generic
  // queue has no notion of — those keep today's exact single-jump behavior.
  if(!prebuilt && !m.window){
    if(buildQueueList().length>=QUEUE_MAX){ log('note','Manufacturing queue is full — cancel or wait for a build to finish before committing another launch.'); return; }
    queueBuild(true);
    return;
  }
  _flightResolving=true; // P1 1.2a: hold the arrival pump until this launch fully resolves (released in finish()/on defer)
  const tl=TEST_LEVELS[state.testLevel];
  const rehMo=state.rehearsal?REHEARSAL_MONTHS:0; // #20 slice 4: rehearsal adds cost + a month of prep
  const buildMo=prebuilt?0:buildMonths(m); // #7 final: a hangar vehicle is already built & paid for
  // #7 sub-assemblies: a non-prebuilt build pulls matching engines from the yard — already paid for
  // (credit cuts the build cost to keep it cost-neutral) and already made (shaves assembly days).
  const draw = prebuilt ? {draw:{},total:0,credit:0,saveDays:0} : engineDrawForBuild(m);
  const pdraw = prebuilt ? {draw:{},total:0,credit:0,saveDays:0} : partDrawForBuild(m); // #7 slice 2: tank/habitat sub-assemblies
  const drawCredit = round2(draw.credit + pdraw.credit), drawSaveDays = draw.saveDays + pdraw.saveDays;
  const buildPart = prebuilt ? 0 : Math.max(0.1, v.buildCost - drawCredit);
  state.money-=(buildPart+v.launchCost+tl.cost+(state.rehearsal?rehearsalCost(m):0));
  if(draw.total>0){ consumeEngineStock(draw.draw); log('note',`Assembly — fitted ${draw.total} pre-built engine${draw.total===1?'':'s'} from the yard (${fM(draw.credit)} pre-paid, ~${draw.saveDays} d faster).`); }
  if(pdraw.total>0){ consumePartStock(pdraw.draw); log('note',`Assembly — fitted ${pdraw.total} pre-built structural component${pdraw.total===1?'':'s'} from the yard (${fM(pdraw.credit)} pre-paid, ~${pdraw.saveDays} d faster).`); }
  // CE2(b): an extra pad lets a prebuilt rapid flight share this calendar month (cadence); else the launch costs its usual +1 month
  const launchMo = canParallelLaunch(prebuilt, tl, rehMo, buildMo, m) ? 0 : 1;
  const buildDays = prebuilt ? 0 : Math.max(ENGINE_BUILD_FLOOR_DAYS, daysFor(buildMo)-drawSaveDays); // pre-built engines + structures shorten assembly
  const leadDays = buildDays + daysFor(launchMo+tl.months+rehMo);
  let windowQuality=1;
  if(m.window){
    windowQuality=state.committedWindow.quality;
    const gap=state.committedWindow.abs-absDay(); // days until the committed window (slice 4b)
    advanceDays(Math.max(leadDays, gap)); // wait out the rest of the window if build finishes early
    state.committedWindow=null;
  }else{
    advanceDays(leadDays); // build (complexity-scaled, minus pre-built engines) + launch + test campaign + rehearsal
  }
  recordPadLaunch(); // CE2(b): stamp the pad slot this flight occupied this month
  // Window-bound launches still use the immediate build path (they cannot enter the generic
  // queue without losing their committed date), so create their physical article here rather
  // than leaving them as the one class of launch with no serial identity.
  if(!prebuilt && !hullId){ const builtHull=makeHull(queueSpecSnapshot(),'rollout'); hullId=builtHull.id; markHullLaunched(hullId,m.id); }
  // #20 slice 1: launch-day weather go/no-go — the vehicle is built and rolled out
  const wx=rollWeather(m);
  if(wx.adverse){
    if(animEnabled){ _pendingLaunch={m,v,sim,windowQuality,wx,prebuilt,hullId}; showWeatherModal(m,wx); return; }
    advance(wx.clear); // animations off / headless: take the safe call and wait it out
    log('note',`${m.name}: launch scrubbed for weather (${wx.label}); waited ${wx.clear} mo.`);
  }
  proceedLaunch(m,v,sim,windowQuality,0,prebuilt,hullId);
}
// P1 slice 1.1: persistent in-flight mission entity model (groundwork).
// A flight is registered for the duration of its cruise. In 1.1 this lifecycle is
// SYNCHRONOUS — registered right before the cruise fast-forward and completed right
// after, within proceedLaunch, never spanning a modal or a save — so activeFlights is
// always empty between turns. That adds no persisted state and is provably byte-identical
// (nothing reads the record yet). Slice 1.2 defers arrival across turns and surfaces
// day-by-day progress (and is where the SAVE_VERSION bump + lazy migration land).
let _flightSeq=0;
function registerFlight(m,crewed,missionDays){
  state.activeFlights=state.activeFlights||[];
  const launchAbs=absDay();
  const rec={
    id:'flt'+(++_flightSeq),
    mission:m.id,
    name:m.name,
    launchAbs,
    arriveAbs:launchAbs+Math.max(0,missionDays),
    phase:'cruise',
    crew:crewed?(m.crew||0):0,
    marginSnapshot:null // populated in slice 1.4 (cruise telemetry)
  };
  state.activeFlights.push(rec);
  return rec;
}
function completeFlight(rec){
  if(!rec||!state.activeFlights) return;
  const i=state.activeFlights.indexOf(rec);
  if(i>=0) state.activeFlights.splice(i,1);
}
function isCrewDeployed(id){ return !!id && (state.activeFlights||[]).some(f=>f&&f.crewId===id); } // 1.2b: astronaut is aboard an in-flight deferred mission
// P1 1.2a: deferred-arrival plumbing. A long uncrewed cruise resolves on ARRIVAL, not at launch.
const DEFER_CRUISE_DAYS=60; // ≥ this many cruise days ⇒ the flight goes "live" (interplanetary); shorter stays synchronous
let _flightResolving=false;  // true while a launch OR an arrival resolution is mid-flight — blocks the pump from stacking modals
// The resolution chain from a built ctx onward (live-call → reserve → anomaly → finalize). Shared by the
// synchronous launch path and deferred arrivals so both reproduce the exact same outcome flow.
function beginResolve(ctx){
  // E1.2 slice A: routine uncrewed reflights are now eligible too (previously the only excluded
  // case) — liveCallFlag's routine-aware threshold is what actually controls how often it fires.
  if(animEnabled){
    const flag=liveCallFlag(ctx.outcome, ctx.routine);
    if(flag){ _pendingLive=ctx; ctx.liveFlag=flag; showLiveCallModal(ctx, flag); return; }
  }
  postResolve(ctx);
}
// Resolve one deferred flight that has reached its arrival day. A resolution may open a modal / animation
// (animEnabled) and pause; the chain re-pumps from finish() when it completes, so arrivals sequence one at
// a time. Guards prevent reentrancy (a strand/loss calls advance() → advanceDays → here) and modal stacking.
function pumpFlightArrivals(){
  if(_flightResolving) return;
  if(_pendingLive||_pendingReserve||_pendingOrbitOps||_pendingOps||_pendingRescue||_pendingSetback||_pendingLogiMishap||_pendingInquiry||_pendingLaunch||_pendingRivalDisaster) return;
  try{ if($('modal') && !$('modal').classList.contains('hidden')) return; }catch(e){} // a modal is on screen — wait
  const rec=(state.activeFlights||[]).find(f=>f&&f.deferred&&absDay()>=f.arriveAbs);
  if(!rec) return;
  if(rec.kind==='logistics'){ // 2.1: a resupply shipment reaching its destination — top up provisions, no ctx/modal
    const fs=facilityState(rec.facId), def=facilityById(rec.facId);
    if(fs){
      fs.supply=Math.min(FAC_SUPPLY_MONTHS, (fs.supply!=null?fs.supply:FAC_SUPPLY_MONTHS)+(rec.monthsShipped||0));
      fs.starvedMonths=0;
      log('ok',`${def?def.icon+' '+def.name:'Facility'} resupply shipment arrived — ${facilitySupplyMonths(rec.facId)} months of provisions aboard.`);
    }
    completeFlight(rec); render(); return pumpFlightArrivals();
  }
  if(!rec.ctx){ completeFlight(rec); return pumpFlightArrivals(); } // S1: a corrupt/re-hydrated record without a ctx — drop it, don't crash the arrival
  _flightResolving=true;
  completeFlight(rec);
  beginResolve(rec.ctx);
}
// P1 1.4: cruise telemetry panel — a live read-out of every mission in flight, with an abort verb.
function flightsPanelHTML(){
  const list=(state.activeFlights||[]).filter(f=>f&&f.deferred).sort((a,b)=>(a.arriveAbs||0)-(b.arriveAbs||0));
  if(!list.length) return '<p class="muted" style="font-size:13px">No missions in flight. Long interplanetary cruises appear here while they travel.</p>';
  const now=absDay();
  return list.map(fl=>{
    const eta=(fl.arriveAbs||0)-now, total=(fl.arriveAbs||0)-(fl.launchAbs||0);
    const pct=total>0?Math.min(100,Math.max(0,Math.round((now-(fl.launchAbs||0))/total*100))):0;
    if(fl.kind==='logistics'){ // 2.1: an uncrewed resupply shipment — no crew/Δv telemetry, no recall (a future slice)
      return `<div class="card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <b style="font-size:14px">📦 ${fl.name||'Resupply'}</b>
          <span class="pill">cargo</span>
        </div>
        <div class="dim" style="font-size:12px;margin:5px 0">Progress ${pct}% · arrival in ${outlinerEtaText(eta)} · ${(fl.monthsShipped||0).toFixed(1)} mo of provisions aboard</div>
        <div style="height:6px;background:var(--panel2);border-radius:3px;overflow:hidden;margin:5px 0"><div style="height:100%;width:${pct}%;background:var(--ignite)"></div></div>
      </div>`;
    }
    const ms=fl.marginSnapshot||{};
    const relTxt=ms.rel!=null?`${Math.round(ms.rel*100)}%`:'—';
    const dvTxt=ms.tightDv!=null?`${ms.tightDv} m/s`:'—';
    return `<div class="card" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <b style="font-size:14px">🚀 ${fl.name||'Mission'}</b>
        <span class="pill">${fl.crew>0?`crew ${fl.crew}`:'uncrewed'}</span>
      </div>
      <div class="dim" style="font-size:12px;margin:5px 0">Progress ${pct}% · arrival in ${outlinerEtaText(eta)} · reliability ${relTxt} · tightest Δv margin ${dvTxt}</div>
      <div style="height:6px;background:var(--panel2);border-radius:3px;overflow:hidden;margin:5px 0"><div style="height:100%;width:${pct}%;background:var(--ignite)"></div></div>
      <button class="btn ghost" style="font-size:12px;margin-top:2px" onclick="confirmAbortFlight('${fl.id}')">⦻ Recall / abort mission</button>
    </div>`;
  }).join('');
}
function showFlightsModal(){ showModal(`<h2>🛰 Missions in flight</h2>${flightsPanelHTML()}<div style="text-align:right;margin-top:10px"><button class="btn ghost" onclick="hideModal()">Close</button></div>`, true); }

// #115: icon per passive-contract category (satellites, tourism, licensing, military, doctrine)
function catIcon(cat){ return {sat:'🛰', tour:'👨‍🚀', lic:'📜', mil:'🎖', doct:'⚖'}[cat] || '📡'; }
/* ---------- #115 Fleet Registry: unified asset collector ----------
   Returns a normalized list of every trackable asset, grouped by class, each with a one-line status and
   a rich detail payload. Pure data — no DOM — so it's headless-testable independent of rendering. The
   detail objects are plain field maps; render.js turns them into the accordion. Slice 1 covers the
   classes with real existing state: in-flight vehicles, in-flight logistics, facilities, depot, and the
   space-telescope program. (Standing-ops/"satellites" and the crew roster are slice 2.)
   Status-line design: each class shows its single most decision-relevant stat — the thing that, left
   unattended, ends the asset. Flights: ETA. Facilities: whichever of condition/supply/crew is most at
   risk. Depot: tonnage. Telescope: health or term, whichever is closer to failing. */
function assetRegistryGroups(){
  const now=absDay(), groups=[];
  const flights=(state.activeFlights||[]).filter(f=>f&&f.deferred);

  const activeHulls=hullList().filter(h=>h&&['hangar','recovered','in-flight'].includes(h.status));
  if(activeHulls.length) groups.push({key:'hulls',label:'Launch vehicles',icon:'🚀',items:activeHulls.sort((a,b)=>(b.builtAbs||0)-(a.builtAbs||0)).map(h=>({
    id:h.id,icon:'🚀',name:h.serial+(h.familyName?' · '+h.familyName:''),
    status:h.status==='hangar'?'ready in hangar':h.status==='recovered'?`recovered · ${h.flights||0} flight${(h.flights||0)===1?'':'s'}`:'in flight',
    detail:{'Serial':h.serial,'Family':h.familyName||'untracked','Status':h.status,'Flights':String(h.flights||0),'Reuse count':String(h.reuseCount||0),'Recovery hardware':h.recoveryFitted?'fitted':'none'}
  }))});

  // --- In flight: crewed/uncrewed missions ---
  const missionFlights=flights.filter(f=>f.kind!=='logistics').sort((a,b)=>(a.arriveAbs||0)-(b.arriveAbs||0));
  if(missionFlights.length){
    groups.push({ key:'flights', label:'In flight', icon:'🚀', items:missionFlights.map(fl=>{
      const eta=(fl.arriveAbs||0)-now, total=(fl.arriveAbs||0)-(fl.launchAbs||0);
      const pct=total>0?Math.min(100,Math.max(0,Math.round((now-(fl.launchAbs||0))/total*100))):0;
      const ms=fl.marginSnapshot||{};
      const bodyId=missionBody(fl.mission);
      const detail={
        'Progress': pct+'%',
        'Arrival': outlinerEtaText(eta),
        'Crew': fl.crew>0?String(fl.crew):'uncrewed',
        'Reliability (at launch)': ms.rel!=null?Math.round(ms.rel*100)+'%':'—',
        'Tightest Δv margin': ms.tightDv!=null?ms.tightDv+' m/s':'—',
      };
      if(bodyId && bodyId!=='earth'){
        const lag=lightLagMinutes(bodyId,false);
        if(lag!=null) detail['Signal delay (one-way, closest)']=lag<1?Math.round(lag*60)+' s':(lag<90?lag.toFixed(1)+' min':(lag/60).toFixed(1)+' hr');
        const cj=nextConjunction(bodyId);
        if(cj&&cj.inBlackout) detail['Comms']=`solar conjunction blackout · ~${cj.daysRemaining}d`;
      }
      return { id:fl.id, icon:'🚀', name:fl.name||'Mission',
        status:`${pct}% · ETA ${outlinerEtaText(eta)}${fl.crew>0?` · crew ${fl.crew}`:''}`,
        pct, detail, action:{label:'⦻ Recall / abort', fn:`confirmAbortFlight('${fl.id}')`} };
    })});
  }

  // --- In flight: logistics/resupply ---
  const logi=flights.filter(f=>f.kind==='logistics').sort((a,b)=>(a.arriveAbs||0)-(b.arriveAbs||0));
  if(logi.length){
    groups.push({ key:'logistics', label:'Resupply in transit', icon:'📦', items:logi.map(fl=>{
      const eta=(fl.arriveAbs||0)-now, total=(fl.arriveAbs||0)-(fl.launchAbs||0);
      const pct=total>0?Math.min(100,Math.max(0,Math.round((now-(fl.launchAbs||0))/total*100))):0;
      const destDef=fl.facId?facilityById(fl.facId):null;
      return { id:fl.id, icon:'📦', name:fl.name||'Resupply',
        status:`${pct}% · ETA ${outlinerEtaText(eta)}`,
        pct, detail:{
          'Progress': pct+'%',
          'Arrival': outlinerEtaText(eta),
          'Destination': destDef?destDef.name:(fl.facId||'—'),
          'Provisions aboard': (fl.monthsShipped||0).toFixed(1)+' mo',
        } };
    })});
  }

  // --- Bases & stations ---
  const facIds=Object.keys(state.facilities||{}).filter(id=>facilityBuilt(id));
  if(facIds.length){
    groups.push({ key:'facilities', label:'Bases & stations', icon:'🏗', items:facIds.map(id=>{
      const def=facilityById(id), fs=facilityState(id);
      const pr=facilityProduction(def, fs);
      const cond=Math.round(stationCondition(fs));
      const supply=facilitySupplyMonths(id);
      const crew=pr.crew||{cap:0,req:0};
      const bodyName=(BODIES.find(b=>b.id===def.body)||{}).name||def.body;
      // status line = the most at-risk of the three failure modes, else healthy output
      let status;
      if(supply<=2) status=`⚠ supply ${supply} mo`;
      else if(cond<35) status=`⚠ condition ${cond}%`;
      else if(crew.req>crew.cap) status=`⚠ under-crewed ${crew.cap}/${crew.req}`;
      else status=`${def.modules||fs.modules||1} mod · ${cond}% · +${fM(pr.income)}/mo`;
      return { id, icon:def.icon||'🏗', name:def.name,
        status, detail:{
          'Location': bodyName,
          'Modules': String(pr.modules),
          'Condition': cond+'% ('+(def.decayReason||'wear')+')',
          'Supply remaining': supply+' mo',
          'Crew': crew.req>0?`${crew.cap}/${crew.req}`:'none needed',
          'Income': '+'+fM(pr.income)+'/mo',
          'Fuel': pr.fuel>0?'+'+pr.fuel.toFixed(1)+' t/mo':'—',
          'Science': pr.sci>0?'+'+pr.sci.toFixed(1)+'/mo':'—',
          'Power balance': (pr.powerNet>=0?'+':'')+pr.powerNet+' kW',
        } };
    })});
  }

  // --- LEO propellant depot ---
  if((state.depot||0)>0.05){
    const t=round2(state.depot);
    groups.push({ key:'depot', label:'Propellant depot', icon:'⛽', items:[{
      id:'depot', icon:'⛽', name:'LEO Propellant Depot',
      status:`${t.toFixed(1)} t held`,
      detail:{ 'Location':'Low Earth orbit', 'Propellant held':t.toFixed(1)+' t',
        'Holding cost':fM(round2(EMPIRE_DEPOT_OPEX*t))+'/mo', 'Note':'Boil-off + station-keeping priced into the holding cost.' } }] });
  }

  // --- Science program / space telescope ---
  const sp=state.scienceProgram;
  if(sp){
    const h=Math.round(sp.health);
    groups.push({ key:'programs', label:'Standing programs', icon:'🔭', items:[{
      id:'telescope', icon:'🔭', name:'Orbital Observatory',
      status:`${h}% health · ${sp.monthsLeft} mo left`,
      detail:{ 'Instrument health':h+'%', 'Term remaining':sp.monthsLeft+' mo',
        'Science output':'+'+sp.sciPerMonth+'/mo' } }] });
  }

  // --- Standing operations (passive contracts — "satellites" & other retainers, option A) ---
  const pcs=(state.passiveContracts||[]);
  if(pcs.length){
    groups.push({ key:'standing', label:'Standing operations', icon:'📡', items:pcs.map((cn,i)=>{
      const d=passiveDef(cn.id);
      const disp=d?passiveContractDisplay(d):null;
      const catName=(d&&PASSIVE_CATS[d.cat])||'Operations';
      const near=cn.monthsLeft<=3;
      return { id:'standing_'+cn.id+'_'+i, icon:d?catIcon(d.cat):'📡', name:disp?disp.name:cn.id,
        status:`+${fM(cn.income)}/mo · ${cn.monthsLeft} mo left${near?' ⚠':''}`,
        detail:{ 'Category':catName, 'Income':'+'+fM(cn.income)+'/mo', 'Term remaining':cn.monthsLeft+' mo',
          'Note': (disp&&disp.blurb)? disp.blurb : 'A standing retainer — recurring revenue, no per-object telemetry tracked.' } };
    })});
  }

  // --- Astronaut roster (who is where) ---
  const astros=(state.staff||[]).filter(s=>roleOf(s.id)==='astro');
  if(astros.length){
    groups.push({ key:'crew', label:'Astronaut corps', icon:'🧑‍🚀', items:astros.map(s=>{
      const p=personById(s.id); const nm=(p&&p.name)||s.id;
      let where='available', whereDetail='On the ground, available for assignment.';
      if(isCrewDeployed(s.id)){
        const fl=(state.activeFlights||[]).find(f=>f&&f.crewId===s.id);
        where='in flight'; whereDetail=fl?`Aboard ${fl.name||'a mission'} in cruise.`:'Aboard an active mission.';
      } else {
        const facId=Object.keys(state.facilities||{}).find(fid=>stationCrewIds(facilityState(fid)).includes(s.id));
        if(facId){ const def=facilityById(facId); where='on station'; whereDetail=`Stationed at ${def?def.name:facId}.`; }
      }
      const dose=s.dose;
      const detail={ 'Status':whereDetail, 'Flights flown':String(astronautFlights(s.id).length) };
      if(dose!=null) detail['Career radiation dose']=Math.round(dose)+' units';
      return { id:'crew_'+s.id, icon:'🧑‍🚀', name:nm,
        status:where, detail };
    })});
  }

  return groups;
}
function assetRegistryCount(){ return assetRegistryGroups().reduce((a,g)=>a+g.items.length,0); }

function confirmAbortFlight(id){
  const rec=(state.activeFlights||[]).find(f=>f&&f.id===id); if(!rec) return;
  showModal(`<h2>Recall ${rec.name||'the mission'}?</h2>
    <p class="muted" style="font-size:13px">Abort the mission in cruise. The ${rec.crew>0?'crew and vehicle are':'vehicle is'} recovered safely, but the objective is forfeit and the flight's costs are sunk — a small reputation dent applies.</p>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn" onclick="abortFlight('${id}')" style="flex:1">Recall the mission</button>
      <button class="btn ghost" onclick="showFlightsModal()" style="flex:1">Keep flying</button>
    </div>`);
}
function abortFlight(id){
  const rec=(state.activeFlights||[]).find(f=>f&&f.id===id); if(!rec||!rec.ctx){ hideModal(); return; }
  hideModal();
  completeFlight(rec);
  _flightResolving=true; // hold the pump; finalize's finish() releases it and resolves the next arrival
  finalizeLaunch(rec.ctx, {outcomeOverride:'scrub', log:'mission recalled in cruise — crew and vehicle recovered; the objective is forfeit.'});
}
function proceedLaunch(m,v,sim,windowQuality,weatherPenalty,prebuilt,hullId){
  _liftoffArmed=animEnabled; // arm the iso-view liftoff lead-in for this interactive launch (headless never arms)
  const tl=TEST_LEVELS[state.testLevel];
  state.flights++;
  state.lastFlightAbs=absMonth(); // economy tension: windfall events require recent activity
  if(!prebuilt){ // #7 final: a hangar vehicle already registered its cadence load + materials when it was queued
    // #7 slice 5: log this build into the cadence buffer (units are the assembly load), then prune the window
    state.recentBuilds=state.recentBuilds||[];
    state.recentBuilds.push({at:absMonth(), units:vehicleUnits(m)});
    const _cutoff=absMonth()-CADENCE_WINDOW;
    state.recentBuilds=state.recentBuilds.filter(r=>r&&r.at>_cutoff);
    // #7 slice 7: this build draws one unit from each material's stock if any is on hand
    consumeMaterialsForBuild();
  }
  const flightExpense=(prebuilt?0:v.buildCost)+v.launchCost+tl.cost+(state.rehearsal?rehearsalCost(m):0); // #18: this flight's outlay for the ops ledger
  const routine=!!state.completed[m.id];
  const crewed=m.crew>0;
  // M16: subsystem-based reliability — which subsystem (if any) fails decides the story
  const outcome=resolveFlight(m,v,sim,crewed,weatherPenalty); // outcome locks at launch-time tech (resolve BEFORE the cruise advances time)
  // P3: this real flight commits the funded-inquiry reliability credit if its subsystem is in play — consume one flight here
  // (the single point where the +R bonus is baked into a genuine outcome; preview/sim calls never reach this line).
  if(state.inquiryCredit && state.inquiryCredit.flights>0 && inquiryCreditRelevant(m,v,sim,crewed)){
    const c=state.inquiryCredit; c.flights--;
    if(c.flights<=0){ state.inquiryCredit=null; log('note',`${SUBSYS_LABEL[c.subsystem]||'Subsystem'} inquiry reliability credit applied — now fully spent.`); }
    else log('note',`${SUBSYS_LABEL[c.subsystem]||'Subsystem'} inquiry reliability credit applied — ${c.flights} flight${c.flights===1?'':'s'} remaining.`);
  }
  // Time Granularity slice 4: the flight now occupies its REAL calendar duration — the cruise/ops days.
  // Early/suborbital missions are days:0 (early game provably unchanged); deep missions become major
  // time commitments (overhead, R&D, rivals, facilities all advance during the mission). Intentional
  // payoff of daily time. If the long cruise bankrupts the company, the gameOver modal is already up.
  const missionDays=Math.round(m.days||0);
  const ctx={m,v,sim,windowQuality,flightExpense,routine,crewed,outcome,rehearsed:!!state.rehearsal, famId:(activeFamily()||{}).id||null, hullId:hullId||null,
             crewId:crewed?state.assignedAstronaut:null, ab:crewed?astroBonus():{rel:0,payoutMult:1}}; // 1.2b/S1: snapshot crew + bonus at launch; store famId (not the object) so a mid-cruise save round-trips cleanly
  // P1 1.2a/1.2b: a long interplanetary cruise (crewed or not) becomes a live flight. The outcome is already
  // locked (resolved above at launch-time tech); it is APPLIED on arrival as the player runs the clock, via
  // pumpFlightArrivals() — instead of one fast-forward. Short flights stay fully synchronous (byte-identical).
  // One-flight bench settings are consumed here at launch, since finalize (which normally resets them) is deferred.
  if(missionDays>=DEFER_CRUISE_DAYS){
    const rec=registerFlight(m,crewed,missionDays); rec.deferred=true; rec.ctx=ctx; rec.crewId=ctx.crewId||null;
    rec.marginSnapshot={ rel:(outcome&&outcome.rel!=null)?outcome.rel:null, tightDv:(sim&&sim.legs)?(()=>{let mn=Infinity;for(const l of sim.legs){if(l&&l.cap!=null&&l.dv!=null){const s=l.cap-l.dv;if(s<mn)mn=s;}}return isFinite(mn)?Math.round(mn):null;})():null }; // 1.4: cruise telemetry — reliability + tightest Δv margin, snapshotted at launch
    state.testLevel=0; state.rehearsal=false; state.depotUse=0; state.assembleOrbit=false;
    if(ctx.crewId) state.assignedAstronaut=null; // 1.2b: crew is committed to this flight — free the live slot so another concurrent mission can crew up
    _liftoffArmed=false; // a deferred cruise resolves on arrival (turns later) — no liftoff lead-in when it lands
    log('note',`${m.name}: departed — arrival in ~${Math.round(missionDays/30)} mo (${missionDays} d).${ctx.crewId?` Crew of ${m.crew} aboard.`:''} The cruise plays out as you run the clock; the outcome lands on arrival.`);
    // Slice B: end the launch-day session with a "cruise begins / ETA" outro card in the overlay, then
    // settle. Animation-off / headless takes the byte-identical synchronous settle below (balance-neutral).
    const settle=()=>{ _flightResolving=false; render(); pumpFlightArrivals(); }; // release the launch lock; catch anything that came due during lead time
    if(animEnabled) playMission(buildDepartSpec(m, crewed, missionDays, rec.arriveAbs), settle);
    else settle();
    return;
  }
  // synchronous path — today's behavior, provably byte-identical
  const _flight=registerFlight(m,crewed,missionDays); // the flight is "in cruise" for this span
  if(missionDays>=1){ advanceDays(missionDays); if(state.over){ completeFlight(_flight); _flightResolving=false; render(); return; } }
  completeFlight(_flight);
  beginResolve(ctx);
}
// the post-resolve flow shared by the headless path and the live-call's "press on".
function postResolve(ctx){
  // CE5(c): a drifting deep-phase subsystem on a flight carrying reserve margin → a bank/spend call.
  // E1.2 slice A: routine reflights are now eligible too (see deepCallFlag's routine-aware threshold);
  // never fires headless (animEnabled=false always banks → today's exact rolled outcome).
  if(animEnabled){
    const dflag=deepCallFlag(ctx.outcome, ctx.sim, ctx.routine);
    if(dflag){ _pendingReserve=ctx; ctx.deepFlag=dflag; showReserveModal(ctx, dflag); return; }
    if(!ctx.m.profile && (ctx.m.reqDv||0)>=9000 && (ctx.outcome.kind==='success'||ctx.outcome.kind==='partial')){
      showOrbitalManeuverDecision(ctx); return;
    }
  }
  maybeAnomaly(ctx);
}
// an in-flight anomaly may still fire on a flight that reaches its operational phase, else apply the outcome.
function maybeAnomaly(ctx, priorOps){
  const {outcome}=ctx;
  // #20 slice 2: an in-flight anomaly can occur once the mission reaches its operational phase
  if(animEnabled && (outcome.kind==='success'||outcome.kind==='partial')){
    const ev=rollMissionEvents(ctx);
    if(ev){ ctx._priorOrbitOps=priorOps||null; _pendingOps=ctx; showAnomalyModal(ev,ctx); return; }
  }
  finalizeLaunch(ctx,priorOps||null);
}
// Slice B: build the purely-visual spec for a deferred departure's "cruise begins" outro card. Mirrors the
// finalizeLaunch flight spec (same vehicle geometry / livery / rng shape, so the pad + ascent render exactly
// as a normal launch does) but is ALWAYS shown as a clean successful launch — the real, resolved-at-launch
// outcome is a spoiler that lands on arrival, not here. Carries mode:'depart' + the ETA fields the card reads.
function buildDepartSpec(m, crewed, transitDays, etaAbs){
  const rnd=()=>Math.random();
  return { title:m.name, crewed, crew:crewed?(m.crew||0):0, success:true, failPhase:null,
    mode:'depart', transitDays, etaAbs, destName:m.name,
    stages: state.stages.map(s=>({prop:s.prop,count:s.count,dia:s.dia})),
    boosters: boosterSpec(),
    transferProp: (m.profile&&m.modules&&m.modules.includes('transfer'))?state.transfer.prop:0,
    recovering: recoveryActive(m) && state.stages.length>1,
    hasCapsule: !!(state.research.crew_capsule || crewed),
    isCislunar: !!m.profile, isOrbital: (!m.profile && m.reqDv>=9000),
    reqDv: m.reqDv||9400, physics:flightPhysicsSpec(m),
    night: rnd()<nightLaunchChance(), // #38: era-scaled chance of a night launch (visuals only)
    rng: { wind:(rnd()-0.5)*0.9, windFreq:1.4+rnd()*1.6, windPhase:rnd()*6.283,
           pitchJitter:(rnd()-0.5)*0.16, sep:state.stages.map(()=>(rnd()-0.5)*0.06),
           apogee:0.86+rnd()*0.28, bow:(rnd()-0.5)*0.9 } };
}
// applies the (possibly anomaly-modified) outcome: money/rep/science, logs, family heritage,
// the ops ledger, and the flight animation. `ops` carries the in-flight decision's effect.
function finalizeLaunch(ctx, ops){
  ops=ops||{};
  let {m,v,sim,windowQuality,flightExpense,routine,crewed,outcome}=ctx;
  if(ops.outcomeOverride && ops.outcomeOverride!==outcome.kind)
    outcome=Object.assign({},outcome,{kind:ops.outcomeOverride, story:(ops.story||ops.log||outcome.story)});
  // #20 slice 3: a strand becomes a rescue decision — the crew is alive but can't get home
  if(outcome.kind==='strand' && crewed && ctx.crewId && animEnabled && !ops.rescueResolved){
    _pendingRescue={ctx, ops, outcome}; showRescueModal(ctx, outcome); return;
  }
  if(ops.log) log(/strand|loss|abort/.test(ops.outcomeOverride||'')?'bad':'note', `${m.name}: ${ops.log}`);
  const opsPayoutMult=(ops.payoutMult==null?1:ops.payoutMult);
  const opsRep=ops.repDelta||0;
  const ab=ctx.ab||(crewed?astroBonus():{rel:0,payoutMult:1}); // 1.2b: astronaut bonus snapshotted at launch (deferred crewed flights free the live slot)
  let flightRevenue=0;
  const success=outcome.kind==='success';
  const rel=outcome.rel;
  let pendingCelebration=null, failPhase=outcome.failPhase;
  // E1.5: the per-phase / per-subsystem causal chain for a failed flight, threaded into the failure
  // log lines below as the 4th (detail) arg so hovering the log entry reveals WHY it failed (not just
  // the flavor story). Guarded on .phases — every real resolveFlight AND the dev-forced outcomes carry it.
  const failDetail = outcome.phases ? phaseBreakdownLines(outcome.phases, outcome.subsystem).join('\n') : null;
  if(success){
    personnelMissionEvent(true); // M6: morale boost on success
    state.successes++;
    if(m.crew>0){ state.crewFlown=(state.crewFlown||0)+m.crew; } // chronicle: souls carried
    if(isLeoClassMission(m)) state.leoFlights=(state.leoFlights||0)+1; // P11: the crisis trigger's own counter — the empire's launch history creating its own hazard
    if(m.profile) state.deepFlights=(state.deepFlights||0)+1; // I3: solar-storm crisis's own trigger counter
    creditEngineHeritage(); // engines earn flight heritage toward cost/reliability edge
    state.staticFixBonus=0;  // the static-fire fix flies once

    // M14: missions yield science — more for novel, deep, or first-time flights
    let sciGain=Math.max(1, Math.round(((routine||m.proc)?0.3:1)*((m.rep||5)*0.12 + (m.profile?5:1))*sciYieldMult()*doctrineMult('sci'))); // #6b: Science track multiplies mission science yield; CE3(a) Science doctrine boosts it — E1.3: procedural contracts are perpetual filler, not a first, so they get the routine-tier rate too
    if(m.sciYield && !routine && !m.proc) triggerSampleDecision(m, Math.round(m.sciYield*sciYieldMult()*doctrineMult('sci'))); // #81: prestige science missions now offer a bank/sell decision instead of an automatic sci add (first flight only — not farmable on routine reflights, and not on a regenerating procedural offer either)
    state.science=round2((state.science||0)+sciGain);
    // E1.7: flying the Orbital Observatory also stands up a passive science program (steady monthly
    // drip + occasional discovery events) — one slot; re-flying it while one's already running just
    // banks the normal sciGain above, no stacking a second instrument.
    if(m.id==='space_telescope' && !state.scienceProgram){
      state.scienceProgram={monthsLeft:TELESCOPE_TERM, sciPerMonth:TELESCOPE_SCI_BASE, health:100};
      log('ok','🔭 The Orbital Observatory is operational — a standing science program, returning data every month.');
    }
    let payout=(routine?m.payout*0.4:m.payout)*windowQuality*diff().payoutMult*econPayoutMult()*opsPayoutMult*doctrineMult('payout'); // CE3(a): Commercial +, Statecraft/Science −
    if(crewed) payout*=ab.payoutMult; // M6: astronaut payout bonus
    if(!routine && state.scooped[m.id]) payout*=SCOOP_PAYOUT_MULT;
    // P10: first-flight-of-design prestige — fam.flights is still pre-increment here (bumped later
    // at creditFamilySuccess), so ===0 means this vehicle configuration has never flown before. Flying
    // something new (vs. re-flying the same proven design forever) earns a premium — this is the
    // "reward for risk" lever once reliability alone stops being the interesting choice.
    const firstOfDesign=(()=>{ const f=activeFamily(); return !!f && (f.flights||0)===0; })();
    if(firstOfDesign) payout*=(1+FIRST_DESIGN_PAYOUT_BONUS);
    const rep=Math.max(0,Math.round(((routine?2:m.rep)+opsRep+(firstOfDesign?FIRST_DESIGN_REP_BONUS:0))*doctrineMult('rep'))); // CE3(a): Statecraft lifts reputation gain
    addSupport(routine?supportDelta('routineSuccess'):clampA(2+(m.rep||5)*0.05,2,10)); // #8: a win lifts public mood, scaled by how big a win
    if(m.tanker){
      const delivered=tankerDelivery();
      state.depot+=delivered;
      payout = 0.4*delivered; // tankers earn by the tonne delivered, not a flat contract fee
      state.money+=payout; state.rep+=rep; flightRevenue=payout;
      log('ok',`${m.name}: SUCCESS. Delivered ${delivered.toFixed(1)} t to the LEO depot (now ${state.depot.toFixed(1)} t). +${fM(payout)}, +${rep} rep, +${sciGain} sci.`);
    }else{
      state.money+=payout; state.rep+=rep; flightRevenue=payout;
      fulfillSpecialIfMatch(m.id); // special contract bonus on a matching routine/repeat flight
      const qTxt = m.window?(windowQuality>1.05?' Favorable window geometry boosted the payload value.':windowQuality<0.92?' A marginal window cut into the payload value.':''):'';
      const scoopTxt = (!routine && state.scooped[m.id]) ? ' (scooped — reduced first-time payout)' : '';
      const firstTxt = firstOfDesign ? ` This vehicle's maiden flight — a +${Math.round(FIRST_DESIGN_PAYOUT_BONUS*100)}% prestige premium and +${FIRST_DESIGN_REP_BONUS} rep for flying it new.` : '';
      log('ok',`${m.name}: SUCCESS.${crewed?` Crew of ${m.crew} home safe.`:''} +${fM(payout)}, +${rep} rep, +${sciGain} sci. (reliability ${(rel*100|0)}%)${qTxt}${scoopTxt}${firstTxt}`);
    }
    if(m.profile && state.depotUse>0){ state.depot=Math.max(0,state.depot-state.depotUse);
      if(!state.wonM3bii && !pendingCelebration){ state.wonM3bii=true; pendingCelebration=()=>victoryM3bii('depot'); } }
    if(m.profile && !routine){
      const isru=ISRU_FREE_LEG[m.id];
      if(isru && state.research[isru.research] && !state.wonM3bii && !pendingCelebration){ state.wonM3bii=true; pendingCelebration=()=>victoryM3bii('isru'); }
    }
    if(!routine && !m.proc){ // E1.3: a procedural contract is neither an authored "first" nor a routine reflight — no firsts/milestone tracking, see below
      state.completed[m.id]=true;
      (state.firstDates=state.firstDates||{})[m.id]=absMonth(); // chronicle: when each first happened
      fulfillSpecialIfMatch(m.id); // special contract bonus on a matching first
      fulfillMandateIfMatch(m.id); // mandate bonus if this was the mandated mission, in time
      denyRivalGoal(m.id); // CE1(b): beating a rival to its goal blunts that rival's momentum
      state.history=state.history||{}; state.history[m.id]=state.year; // #18: record the year for the Home timeline
      if(m.pgm && state.pgmRoyalty<4.5){ state.pgmRoyalty=4.5; log('ok','Platinum-group royalties established — the Belt claim now pays +$4.5M/mo in standing income.'); }
      if(m.id==='first_sat' && !state.won){ state.won=true; pendingCelebration=victory; }
      // KSP-style milestone fanfare for every OTHER first (epoch victories keep their own modals)
      if(!pendingCelebration && animEnabled){ const _pm=payout,_pr=rep; pendingCelebration=()=>showMilestoneModal(m,_pm,_pr); }
      if(m.id==='endurance' && !state.wonM2){ state.wonM2=true; pendingCelebration=victoryM2; }
      if(m.id==='luna_orbit' && !state.wonM3a){ state.wonM3a=true; pendingCelebration=victoryM3a; }
      if(m.id==='luna_landing' && !state.wonM3aii){ state.wonM3aii=true; pendingCelebration=victoryM3aii; }
      if(m.id==='mars_orbit' && !state.wonM3b){ state.wonM3b=true; pendingCelebration=victoryM3b; }
      const ambCeleb=checkPrograms(); // program bonuses + ambition capstone + next-objective nudge
      if(ambCeleb && !pendingCelebration) pendingCelebration=ambCeleb;
    }
    if(m.proc) state.contractOffers=(state.contractOffers||[]).filter(o=>o.id!==m.id); // E1.3: one-shot — consumed on success, not reflown
    if(m.deliverModule){ // #73 Slice 1: a "fly it yourself" module delivery docks on successful arrival
      state.money-=m.moduleCost;
      dockModuleNow(m.deliverModule.facId, m.deliverModule.modId, `${fM(m.moduleCost)}, flown`);
    }
    autoAdvanceMission();
  }else if(outcome.kind==='partial'){
    // reached space but off-target — salvage some value, but the objective is not complete
    let payout=(routine?m.payout*0.4:m.payout)*windowQuality*diff().payoutMult*econPayoutMult()*PARTIAL_PAYOUT_MULT*opsPayoutMult*doctrineMult('payout'); // CE3(a): doctrine payout factor
    state.money+=payout; flightRevenue=payout;
    const rep=Math.max(0,Math.round((routine?2:m.rep)*0.25)+opsRep);
    state.rep+=rep;
    addSupport(supportDelta('partial')); // #8: a salvaged flight still reads as progress
    log('note',`${m.name}: PARTIAL SUCCESS — ${outcome.story} Salvaged value +${fM(payout)}, +${rep} rep, but the objective is not complete.`, null, failDetail);
  }else if(outcome.kind==='scrub'){
    // CE5(b): the player called a precautionary in-flight abort — vehicle & crew recovered, mission
    // forfeit. No catastrophe: no crew loss, no stand-down/investigation, a lighter rep dent than a
    // loss. The flight outlay is still sunk; the payoff is avoiding the worse outcome you gambled on.
    personnelMissionEvent(false);
    const rep=Math.min(state.rep, crewed?8:5); state.rep-=rep;
    addSupport(supportDelta('abort')); // a scrubbed flight dents mood, but a saved vehicle limits it
    log('note',`${m.name}: ABORTED IN FLIGHT — ${outcome.story} Crew and vehicle safe; the mission is forfeit, −${rep} rep.`);
  }else if(outcome.kind==='abort'){
    personnelMissionEvent(false);
    const rep=Math.min(state.rep,12); state.rep-=rep;
    addSupport(supportDelta('abort')); // #8: a failure dents mood, but a safe crew limits the damage
    log('bad',`${m.name}: MISSION FAILURE — crew safe. The ${SUBSYS_LABEL[outcome.subsystem].toLowerCase()} gave out — ${outcome.story} Vehicle and mission lost, −${rep} rep.`, null, failDetail);
  }else if(outcome.kind==='strand'){
    personnelMissionEvent(false);
    const rep=Math.min(state.rep,40); state.rep-=rep;
    addSupport(supportDelta('strand')); // #8: a crew stranded in deep space is a national shock
    loseAssignedCrew(ctx.crewId, m.name, outcome.story);
    advance(6); // grounding + investigation
    log('bad',`${m.name}: LOST IN DEEP SPACE — ${outcome.story} A long inquiry follows, −${rep} rep.`, null, failDetail);
    applyEraStakes('loss of the crew'); // CE4(c): era-scaled compounding setback
    state.poachHeat=Math.max(state.poachHeat||0, POACH_HEAT_ON_FATAL); // E1.1: instability rivals press on
    triggerHearing(ctx); // E1.1: the political response to a fatal crewed loss (inquiry above is the engineering one, uncrewed-only)
  }else if(outcome.kind==='rescued'){
    // #20 slice 3: a deep-space rescue brought the crew home — mission & vehicle lost, crew safe
    personnelMissionEvent(false);
    const rep=Math.min(state.rep,10); state.rep-=rep;
    addSupport(supportDelta('abort')); // relief tempered by a lost mission
    log('ok',`${m.name}: CREW RESCUED — ${outcome.story} The mission and vehicle are lost, but the crew is home. −${rep} rep.`);
  }else{ // loss of vehicle on ascent
    personnelMissionEvent(false);
    if(crewed){
      const rep=Math.min(state.rep,40); state.rep-=rep;
      addSupport(supportDelta('lossCrewed')); // #8: losing a crew is the worst political blow
      loseAssignedCrew(ctx.crewId, m.name, outcome.story);
      advance(6); // grounding + investigation
      state.crewLost=(state.crewLost||0)+m.crew; // chronicle: the price paid
      log('bad',`${m.name}: CATASTROPHE. The ${SUBSYS_LABEL[outcome.subsystem].toLowerCase()} failed — ${outcome.story} Vehicle lost with all ${m.crew} aboard. Six-month stand-down, −${rep} rep. Fit a launch-escape system before flying crew again.`, null, failDetail);
      pushFrontPage('disaster', '⚠', `${m.name}: crew lost`, outcome.story);
      applyEraStakes('loss of the crew and vehicle'); // CE4(c): era-scaled compounding setback
      state.poachHeat=Math.max(state.poachHeat||0, POACH_HEAT_ON_FATAL); // E1.1: instability rivals press on
      triggerHearing(ctx); // E1.1: the political response to a fatal crewed loss
    }else{
      const rep=Math.min(state.rep, routine?3:8); state.rep-=rep;
      addSupport(supportDelta('lossUncrewed')); // #8: an uncrewed loss costs some goodwill
      log('bad',`${m.name}: FAILURE. The ${SUBSYS_LABEL[outcome.subsystem].toLowerCase()} failed — ${outcome.story} Vehicle cost forfeit, −${rep} rep.`, null, failDetail);
      if(m.profile) applyEraStakes('loss of a flagship mission'); // CE4(c): a deep-space robotic flagship is a real setback late
    }
  }
  if(crewed && (outcome.kind==='success'||outcome.kind==='partial')) applyCrewDose(m, ctx.crewId); // surviving crew take a radiation dose
  if(crewed && ctx.crewId) logAstronautFlight(ctx.crewId, m.name, outcome.kind); // E1.4: per-astronaut flight log, survives the person leaving state.staff
  settleHullFlight(ctx.hullId, m, outcome.kind);
  // #3: attribute this flight to the active vehicle family and accrue/dent its heritage
  const fam=ctx.famId?familyById(ctx.famId):activeFamily(); // 1.2a/S1: resolve the launched family by id at finalize (save-safe — a deferred flight stores famId, not a detachable object ref, and finalize mutates the live family)
  if(fam){
    fam.flights=(fam.flights||0)+1;
    if(success){
      fam.successes=(fam.successes||0)+1;
      if(recoveryRefly(m)) fam.reflights=(fam.reflights||0)+1; // #7 slice 4: a successful refly adds wear to the recovered booster
      if(FAM_MILESTONES.includes(fam.successes)){
        const brandRep=fam.successes; // 5 / 10 / 20 rep as the lineage becomes a household name
        state.rep+=brandRep;
        log('ok',`${fam.name} reaches ${fam.successes} successful flights — a trusted name now. +${brandRep} rep (brand heritage).`);
      }
    }else if(outcome.kind!=='partial' && outcome.kind!=='scrub'){ // abort / strand / loss — a veteran going down stings more (a scrub saved the airframe, so the lineage is intact)
      const exp=familyExperience(fam); // proven-ness before recording the loss
      fam.losses=(fam.losses||0)+1;
      const extra=Math.round(Math.min(15, 2*exp));
      if(extra>0){
        const hit=Math.min(state.rep, extra); state.rep-=hit;
        log('bad',`Losing ${fam.name} — a ${familySuccessRate(fam)!=null?familySuccessRate(fam)+'%-record':'veteran'} airframe — is a public blow. −${hit} rep beyond the mission penalty.`);
      }
    }
  }
  // P3: after an UNCREWED loss/abort/strand, offer a funded failure inquiry (crewed catastrophes keep their
  // existing grounding narration untouched; abort/strand are crewed-only in practice, guarded here for safety).
  if(!crewed && (outcome.kind==='loss'||outcome.kind==='abort'||outcome.kind==='strand') && outcome.subsystem) triggerInquiry(ctx, outcome);
  recordFlightLedger(flightRevenue, flightExpense); // #18: attribute this flight to the current month's ops summary
  state.testLevel=0; // campaign applies to one flight
  state.rehearsal=false; // #20 slice 4: rehearsal applies to one flight
  state.depotUse=0;
  state.assembleOrbit=false; // #6: assembly choice applies to one flight
  const rnd=()=>Math.random();
  const spec={ title:m.name, crewed, success, failPhase,
    crewEscaped: crewed && outcome.kind==='abort' && failPhase==='ascent', // BACKLOG #40: distinguishes an escape-tower save from a full loss for the failure visual (both set success=false/failPhase='ascent'; only outcome.kind differs)
    stages: state.stages.map(s=>({prop:s.prop,count:s.count,dia:s.dia})),
    boosters: boosterSpec(),
    transferProp: (m.profile&&m.modules.includes('transfer'))?state.transfer.prop:0,
    recovering: recoveryActive(m) && state.stages.length>1 && failPhase!=='ascent', // #graphics: fly the first stage back for a landing instead of tumbling away
    hasCapsule: !!(state.research.crew_capsule || crewed), // recovery: parachutes + heat shield + splashdown (Mercury/Vostok era)
    isCislunar: !!m.profile, isOrbital: (!m.profile && m.reqDv>=9000),
    reqDv: m.reqDv||9400, physics:flightPhysicsSpec(m,v), report:flightReport(m,v,sim,outcome), orbitOps:ctx.orbitOps||null,
    // #38: reuse the earlier roll if a live decision (weather/live-call/rescue) already opened this
    // overlay — resumeFlightForDecision's Object.assign would otherwise clobber A.spec.night mid-flight,
    // flipping the sky partway through a launch already being watched.
    night: (typeof animState!=='undefined' && animState && animState._openedForDecision && animState.spec) ? animState.spec.night : rnd()<nightLaunchChance(),
    rng: { wind:(rnd()-0.5)*0.9, windFreq:1.4+rnd()*1.6, windPhase:rnd()*6.283,
           pitchJitter:(rnd()-0.5)*0.16, sep:state.stages.map(()=>(rnd()-0.5)*0.06),
           apogee:0.86+rnd()*0.28, bow:(rnd()-0.5)*0.9 } };
  // #73 Slice 3: a successful module delivery gets a terminal rendezvous+dock beat in the overlay. The
  // module already docked in state above (dockModuleNow, in the success branch) — this only carries the
  // display info the drawDockCard spectacle reads. One abstraction for LEO/Moon/Mars (backdrop tinted per
  // body); docking doesn't get its own roll — a resolved-success flight simply docks (Slice 2's precedent).
  if(m.deliverModule && success){
    const _fd=facilityById(m.deliverModule.facId), _fs=facilityState(m.deliverModule.facId), _md=stationModuleDef(m.deliverModule.modId);
    spec.dock={ facName:_fd?_fd.name:'Station', facColor:(_fd&&_fd.color)||'#aeb6bd', body:(_fd&&_fd.body)||'earth',
      modName:_md?_md.name:'Module', modShort:(_md&&_md.short)||'MOD', modColor:(_md&&_md.color)||'#b8c0c7',
      moduleCount:_fs?facilityModuleList(_fs).length:1 }; // post-dock count (dockModuleNow already pushed it)
  }
  const finish=()=>{ if(state.money<0){ gameOver(); } else { _missionPulse=success?'ok':(outcome.kind==='loss'||outcome.kind==='strand')?'bad':null; render(); if(pendingCelebration) pendingCelebration(); maybeShowInquiry(); maybeShowHearing(); maybeShowSampleDecision(); } _flightResolving=false; if(!state.over) pumpFlightArrivals(); }; // 1.2a: flight fully done — release the lock, surface a pending failure inquiry, budget hearing, or #81 sample disposition; then resolve the next arrival if any
  if(animEnabled){
    // E1.2 slice C: if a live-flight decision (live call/reserve/weather/rescue) opened this overlay
    // early (openFlightForDecision), resume that SAME animation in place with the now-known outcome
    // instead of opening a second, fresh one. resumeFlightForDecision itself checks _openedForDecision.
    if(!resumeFlightForDecision(spec, finish)){
      _liftoffArmed=false; // Slice A: the pad phase now lives inside the overlay itself (setupFlightState's padDur) —
      playMission(spec, finish); // the old iso-view CC-popout liftoff (playLiftoff) is retired for launches, left defined-but-unused
    }
  } else finish();
}
function autoAdvanceMission(){
  // nudge player toward the next available, uncompleted mission they can actually fly
  const next=MISSIONS.find(m=>!state.completed[m.id] && state.rep>=m.minRep && missionTechMet(m));
  if(next) state.activeMission=next.id;
}

/* ---------- actions ---------- */
// UI Consolidation slice 2: the center-viewport scene registry. These four tabs are full
// "scenes" that own the center stage; the remaining tabs are "panels" headed for the rails /
// modals in later slices. Mission Playback is a contextual center takeover (already an overlay).
// Tab/number-key order follows the natural build→fly flow: Vehicle → Station → Solar System →
// Control Center, with R&D last. (Rail nav order is independent.)
const SCENES = {
  bench:   { tab:'bench',   label:'Design Bench',   icon:'✎' },
  station: { tab:'station', label:'Station Bench',   icon:'⬡' },
  map:     { tab:'map',     label:'Solar System',   icon:'☉' },
  command: { tab:'command', label:'Command Center', icon:'⌂' },
  rnd:     { tab:'rnd',     label:'R&D',            icon:'⚛' },
};
const SCENE_TABS = Object.keys(SCENES);
// Retired tab ids → where they now live, so legacy saves / stray setTab calls resolve.
// slice 4: Planner folded into the left-rail advisor. slice 5: Missions → the Command
// Center "Mission Control" drill. slice 6: Programs/Rivals/Personnel → modals + hub drills.
// All land on Command Center (their new homes hang off the hub).
const RETIRED_TABS = { planner:'command', missions:'command', programs:'command', rivals:'command', personnel:'command', infra:'command', settings:'command' };
function isSceneTab(t){ return SCENE_TABS.indexOf(t)>=0; }
// slice 5/6: a legacy "go to tab X" intent → the onclick expression for X's new home
// (a hub drill or a modal). Used by the advisor, alerts, planner steps and hub buildings.
function tabIntent(t){
  if(t==='missions')  return "openHubPanel('contracts')";
  if(t==='programs')  return "showProgramsModal()";
  if(t==='personnel') return "showPersonnelModal()";
  if(t==='rivals')    return "showRivalsModal()";
  if(t==='infra')     return "showInfrastructureModal()";
  if(t==='settings')  return "showSettingsMenu()";
  return `setTab('${t}')`;
}
// slice 5: which panel the Command Center right rail shows — 'alerts' (default) or
// 'contracts' (the Mission Control hub drill). Transient UI, not persisted.
let hubPanel='alerts';
function openHubPanel(p){ closeLiveModal(); hubPanel=p; state.tab='command'; render(); }
// slice 6: deep views (Programs/Rivals/Personnel) are live modals. activeModal is a thunk
// that rebuilds the open modal's body; render() re-runs it so the modal tracks state changes.
// Navigation (setTab/openHubPanel/flyTo/selectMission) clears it so leaving closes the modal.
let activeModal=null;
function closeLiveModal(){ if(activeModal){ activeModal=null; $('modal').classList.add('hidden'); } } // navigation dismisses an open deep-view modal
function modalClose(){ return `<div style="text-align:right;margin-top:12px"><button class="btn ghost" onclick="hideModal()">Close</button></div>`; }
function showProgramsModal(){ activeModal=()=>{ showModal(`<div id="ambitionCard"></div><div id="programsCard" style="margin-top:14px"></div>${modalClose()}`,true); renderPrograms(); }; activeModal(); }
function showRivalsModal(){ activeModal=()=>{ showModal(`<div id="rivalsCard"></div>${modalClose()}`,true); renderRivals(); }; activeModal(); }
function showPersonnelModal(){ activeModal=()=>{ showModal(`<div id="personnelCard"></div>${modalClose()}`,true); renderPersonnel(); }; activeModal(); }
let _prodModalOpen=false; // true while the Infrastructure/Production drill is the top layer → Enter (as well as Esc) minimizes it
function showInfrastructureModal(){ activeModal=()=>{ showModal(`<div id="infraCard"></div>${modalClose()}`,true); renderInfrastructure(); }; activeModal(); _prodModalOpen=true; } // slice 7: the Infra tab → a hub-building drill modal
// CE3(a): Company Doctrine modal — declare/switch the company's strategic identity
function doctrineModalHTML(){
  const cur=state.doctrine;
  const cards=Object.keys(DOCTRINES).map(id=>{
    const d=DOCTRINES[id], active=cur===id, chk=canSetDoctrine(id);
    const pros=d.pros.map(p=>`<li style="color:var(--ok,#4ade80)">▲ ${p}</li>`).join('');
    const cons=d.cons.map(c=>`<li style="color:var(--bad,#f87171)">▼ ${c}</li>`).join('');
    let btn;
    if(active) btn=`<button class="btn ghost" disabled style="width:100%">✓ Current doctrine</button>`;
    else if(chk.ok && chk.first) btn=`<button class="btn" style="width:100%" onclick="setDoctrine('${id}');showDoctrineModal()">Declare — free</button>`;
    else if(chk.ok) btn=`<button class="btn" style="width:100%" onclick="setDoctrine('${id}');showDoctrineModal()">Switch — ${fM(doctrineSwitchCost())} · ${DOCTRINE_SWITCH_REP} rep · ${DOCTRINE_SWITCH_MONTHS} mo</button>`;
    else btn=`<button class="btn ghost" disabled style="width:100%">Locked — ${chk.why}</button>`;
    return `<div class="card" style="background:var(--panel2);border:1px solid ${active?'var(--readout,#e6c14a)':'#2a2a2a'};margin-bottom:8px">
      <div style="font-weight:700">${d.icon} ${d.name} ${active?'<span class="pill ok">active</span>':''}</div>
      <div class="dim" style="font-size:12px;font-style:italic">${d.tag}</div>
      <p class="muted" style="font-size:12px;margin:4px 0">${d.blurb}</p>
      <ul style="list-style:none;padding:0;margin:4px 0;font-size:12px;line-height:1.5">${pros}${cons}</ul>
      ${btn}</div>`;
  }).join('');
  const head = cur
    ? `<p class="muted" style="font-size:12px">Your company flies as <b>${DOCTRINES[cur].icon} ${DOCTRINES[cur].name}</b>. Switching is a heavy commitment — capital, reputation and ${DOCTRINE_SWITCH_MONTHS} months of upheaval.</p>`
    : `<p class="muted" style="font-size:12px">Declare a doctrine to define what kind of company you are. The first choice is <b>free</b>; changing it later costs dearly. Each doctrine is a real trade — a standing strength bought with a standing weakness.</p>`;
  return `<h2>⚑ Company Doctrine</h2>${head}${cards}`;
}
function showDoctrineModal(){ activeModal=()=>showModal(doctrineModalHTML()+modalClose(),true); activeModal(); }
// slice 8: the HUD ⚙ menu — display toggles + save/load/new + the full Settings panel.
// A live modal: the display toggles call render() to refresh in place; Settings controls
// (difficulty/detail/sliders) refresh via renderSettings() on the same re-run. Save/Load/New
// close the menu first (they open their own dialogs).
function showSettingsMenu(){
  activeModal=()=>{
    const fs=inFullscreen();
    showModal(`<h2 style="text-align:left">⚙ Menu</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px">
        <button class="btn ghost" onclick="toggleAnim();render()">Animation: ${animEnabled?'On':'Off'}</button>
        <button class="btn ghost" onclick="toggleSound();render()">🔊 Sound: ${soundOn?'On':'Off'}</button>
        <button class="btn ghost" onclick="toggleWide();render()">↔ Wide: ${wideOn?'On':'Off'}</button>
        <button class="btn ghost" onclick="toggleFullscreen();render()">${fs?'⛶ Exit full screen':'⛶ Full screen'}</button>
        <button class="btn ghost" onclick="hideModal();saveGame()">💾 Save</button>
        <button class="btn ghost" onclick="hideModal();loadGame()">📂 Load</button>
        <button class="btn ghost" onclick="hideModal();confirmNew()">New Game</button>
      </div>
      <button class="btn ghost" onclick="showHotkeyHelp()" style="width:100%;margin:4px 0 2px" title="Keyboard shortcuts — press ? anywhere outside a dialog">⌨ Keyboard shortcuts <span class="dim">[?]</span></button>
      <div style="margin:10px 0 2px">
        <div class="cc-panel-h" style="margin-bottom:6px">Theme</div>
        <div style="display:flex;gap:6px">
          ${Object.keys(THEMES).map(k=>`<button class="btn ghost" onclick="pickTheme('${k}')" style="flex:1;font-size:12px;${currentTheme===k?'border-color:var(--ignite);color:var(--ignite)':''}">${THEMES[k]}</button>`).join('')}
        </div>
      </div>
      <div id="settingsCard" style="margin-top:12px"></div>
      ${modalClose()}`,true);
    renderSettings();
  };
  activeModal();
}
// 'scene' = owns the center viewport; 'panel' = secondary view (future rail/modal home).
function setTab(t){
  closeLiveModal();
  if(state.tab===t){hubPanel='alerts';render();return;}
  const vp=document.querySelector('.viewport');
  hubPanel='alerts';
  if(vp){vp.style.opacity='0';setTimeout(()=>{state.tab=t;render();vp.style.opacity='1';},150);}
  else{state.tab=t;render();}
} // nav resets the hub drill + closes any live modal (slice 5/6)
function addStage(){
  try{ sfxThunk(); }catch(e){} if(state.stages.length>=3)return; state.stages.push({eng:firstUnlocked(),count:1,prop:2.0}); collapsedStages={}; render(); }
function removeStage(i){
  try{ sfxThunk(); }catch(e){} if(state.stages.length<=1)return; state.stages.splice(i,1); collapsedStages={}; render(); }
// #27: reorder the stage stack (drag-to-reorder). Indices are validated; a no-op move
// just re-renders. Collapse flags are keyed by position, so reset them on a structural change.
function moveStage(from,to){
  const n=state.stages.length;
  if(from==null||to==null||from===to||from<0||to<0||from>=n||to>=n) return;
  const [s]=state.stages.splice(from,1);
  state.stages.splice(to,0,s);
  collapsedStages={};
  render();
}
// #27: transient drag/collapse UI (not persisted, like mapExpanded/cmpA)
let stageDrag=null, collapsedStages={};
function stageDragStart(e,i){ stageDrag=i; if(e&&e.dataTransfer){ e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain',String(i)); }catch(_){} } }
function stageDragOver(e){ if(e){ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='move'; const t=e.currentTarget; if(t&&t.classList) t.classList.add('drag-over'); } }
function stageDragLeave(e){ const t=e&&e.currentTarget; if(t&&t.classList) t.classList.remove('drag-over'); }
function stageDrop(e,i){ if(e){ e.preventDefault(); const t=e.currentTarget; if(t&&t.classList) t.classList.remove('drag-over'); } if(stageDrag!=null) moveStage(stageDrag,i); stageDrag=null; }
function stageDragEnd(){ stageDrag=null; }
function toggleStageCollapse(i){ collapsedStages[i]=!collapsedStages[i]; render(); }
function firstUnlocked(){return Object.keys(ENGINES).find(k=>state.unlocked[k])||'a4';}
function setEngine(i,v){state.stages[i].eng=v;render();}
function setCount(i,d){
  try{ sfxThunk(); }catch(e){}state.stages[i].count=Math.max(1,Math.min(8,state.stages[i].count+d));render();}
function setProp(i,v){state.stages[i].prop=Math.max(0.1,Math.min(1000,parseFloat(v)||0.1));render();}
function setStageDia(i,v){ if(!state.stages[i])return; state.stages[i].dia=clampA(parseFloat(v)||1,GEO_DIA_MIN,GEO_DIA_MAX); render(); } // BC3: per-stage diameter
// Bench customization slice 1: livery controls (cosmetic only)
function ensureLivery(){ if(!state.livery) state.livery=defaultLivery(); return state.livery; }
function setLiveryBody(v){ ensureLivery().body=v; render(); }
function setLiveryAccent(v){ ensureLivery().accent=v; render(); }
function setLiveryNose(v){ ensureLivery().nose=v; render(); }
function setLiveryName(v){ ensureLivery().name=(v||'').slice(0,24); render(); }
// Saved designs (blueprints) card
function renderBlueprints(){
  const el=$('blueprintsCard'); if(!el) return;
  const list=blueprints();
  const rows=list.map(b=>`<div style="display:flex;align-items:center;gap:8px;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)">
      <span style="min-width:0"><b>${esc(b.name)}</b> <span class="dim" style="font-size:12px">${b.summary||''} · ${b.born||''}</span></span>
      <span style="display:flex;gap:5px;flex-shrink:0">
        <button class="btn" style="font-size:12px;padding:3px 9px" onclick="loadBlueprint('${b.id}')">Load</button>
        <button class="btn ghost danger" style="font-size:12px;padding:3px 8px" onclick="deleteBlueprint('${b.id}')" title="Delete">✕</button>
      </span></div>`).join('') || '<div class="dim" style="font-size:12px;margin-top:4px">No saved designs yet — save the current build to reload it later (captures stages, geometry, boosters, livery & parts).</div>';
  el.innerHTML=`<h2>💾 Saved Designs</h2>
    <div class="row"><input type="text" id="bpName" maxlength="28" placeholder="Name this design" style="flex:1"><button class="btn" onclick="saveBlueprint()">Save current</button></div>
    ${rows}`;
}
// BC2: performance-parts controls
function ensureParts(){ if(!state.parts) state.parts=defaultParts(); return state.parts; }
function setPart(slot,value){ ensureParts()[slot]=value; render(); }
function renderParts(){
  const el=$('partsCard'); if(!el) return;
  const p=curParts();
  const crewed=!!(curMission()&&curMission().crew>0);
  const group=(slot, table, sel, opts)=>{
    const btns=Object.keys(table).map(k=>`<button class="btn ${sel===k?'':'ghost'}" style="font-size:12px;padding:4px 8px" onclick="setPart('${slot}','${k}')">${table[k].name}</button>`).join(' ');
    return `<div style="margin-top:8px"><div class="mission-tag" style="text-align:left">${opts.label}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin:4px 0">${btns}</div>
      <div class="dim" style="font-size:12px">${table[sel].desc}</div>${opts.note||''}</div>`;
  };
  el.innerHTML=`<h2>🔧 Performance Parts</h2>
    ${group('tank', TANK_MATERIALS, p.tank, {label:'Tank material (structure σ)'})}
    ${group('avionics', AVIONICS, p.avionics, {label:'Avionics / guidance'})}
    ${group('fairing', FAIRINGS, p.fairing, {label:'Payload fairing', note:crewed?`<div class="dim" style="font-size:12px;color:var(--warn)">Crewed flight — flies a capsule; fairing choice is ignored this mission.</div>`:''})}`;
}
function renderLivery(){
  const el=$('liveryCard'); if(!el) return;
  const l=curLivery();
  const noseBtn=(id,label)=>`<button class="btn ${l.nose===id?'':'ghost'}" style="font-size:12px;padding:4px 9px" onclick="setLiveryNose('${id}')">${label}</button>`;
  el.innerHTML=`<h2>🎨 Livery</h2>
    <div class="row"><label>Name</label><input type="text" maxlength="24" value="${esc(l.name||'')}" placeholder="e.g. Vanguard" onchange="setLiveryName(this.value)" style="flex:1"></div>
    <div class="row"><label>Body</label><input type="color" value="${l.body}" onchange="setLiveryBody(this.value)" style="width:46px;padding:2px"><span class="dim" style="font-size:12px">hull color</span></div>
    <div class="row"><label>Accent</label><input type="color" value="${l.accent}" onchange="setLiveryAccent(this.value)" style="width:46px;padding:2px"><span class="dim" style="font-size:12px">stripe + roundel</span></div>
    <div class="row"><label>Nose</label><div style="display:flex;gap:5px;flex-wrap:wrap">${noseBtn('auto','Ogive')}${noseBtn('cone','Cone')}${noseBtn('blunt','Blunt')}</div></div>
    <div class="dim" style="font-size:12px;margin-top:2px">Nose style applies to uncrewed payload fairings; crewed flights fly a capsule.</div>`;
}
function setTransferEng(v){state.transfer.eng=v;render();}
function setTransferProp(v){state.transfer.prop=Math.max(0.1,Math.min(400,parseFloat(v)||0.1));render();}
function setDepotUse(v){state.depotUse=Math.max(0,Math.min(state.depot,parseFloat(v)||0));render();}
function setAssembleOrbit(on){ state.assembleOrbit=!!on; render(); } // #6: orbital-assembly route toggle
function toggleRecovery(){ if(!recoveryAvailable()) return; state.recovery=!state.recovery; render(); } // M5: fit/remove first-stage recovery
function setDescentEng(v){state.descent.eng=v;render();}
function setDescentProp(v){state.descent.prop=Math.max(0.1,Math.min(60,parseFloat(v)||0.1));render();}
function setAscentEng(v){state.ascent.eng=v;render();}
function setAscentProp(v){state.ascent.prop=Math.max(0.1,Math.min(40,parseFloat(v)||0.1));render();}
function setEclss(id){ const t=ECLSS[id]; if(t.research && !state.research[t.research]) return; state.eclss=id; render(); }
function setTestLevel(n){ state.testLevel=n; render(); }
function selectMission(id){const m=missionById(id); if(!m||state.rep<m.minRep)return; if(!missionTechMet(m))return; state.activeMission=id; closeLiveModal(); state.tab='bench'; render();}
function reqsMet(r){
  return r.req.every(q=>state.research[q]) && (!r.reqMissionDone || state.completed[r.reqMissionDone]);
}
// I5: shared "actually start it" mutation for both the manual buy and the queued auto-start.
function startResearchProject(r, viaQueue){
  const sciNeed=sciGateCost(r);
  state.money=round2(state.money-rdCostOf(r));
  if(sciNeed) state.science=round2((state.science||0)-sciNeed);
  state.activeResearch={id:r.id, monthsLeft:r.months, rushed:0};
  log('note',`R&D started: ${r.name} (${r.months} mo)${sciNeed?` · ${sciNeed} ⚛ science invested`:''}.${viaQueue?' Auto-started from the queue.':' It advances while you build and fly.'}`);
}
function buyResearch(id){
  const r=RESEARCH.find(x=>x.id===id);
  if(state.research[id]||state.activeResearch) return; // one project at a time
  if(!reqsMet(r)) return;
  if(state.money < rdCostOf(r)) return; // CE3(a): doctrine-adjusted R&D price
  if(!sciGateMet(r)) return; // #1: flagship deep-tech also costs banked science to start
  startResearchProject(r, false);
  if(state.money<0) gameOver(); else render();
}
// I5: research queue (depth 1) — "queue this as next" works even on a currently-locked node
// (the common case: you're mid-project and already know the next step in the chain), since the
// real eligibility/affordability check happens for real at start time, not at queue time.
function queueResearchNext(id){
  if(state.research[id] || (state.activeResearch && state.activeResearch.id===id)) return;
  state.researchNext=id; render();
}
function clearResearchNext(){ state.researchNext=null; render(); }
// #14: pin/unpin a (possibly still-locked) node as the standing planning goal. Unlike researchNext
// (a depth-1 auto-start queue), this doesn't buy anything — it's purely a highlight/tracking aid over
// the node's full prereq chain, so it's fine to pin something many steps away that isn't reqsMet yet.
function pinResearchGoal(id){
  const r=RESEARCH.find(x=>x.id===id); if(!r || state.research[id]) return; // no such node, or already researched — nothing to plan toward
  state.researchGoal=(state.researchGoal===id)?null:id; render();
}
function clearResearchGoal(){ if(state.researchGoal){ state.researchGoal=null; render(); } }
// Tried right after a project completes (the common case) AND every monthly tick (the "became
// affordable/unlocked later" case) — idempotent either way since it no-ops once activeResearch
// is set. Leaves the pick queued (retried later) rather than clearing it if reqs/cost aren't met
// yet; only clears it if the node turns out to already be researched (stale pick).
function tryStartQueuedResearch(){
  if(state.activeResearch || !state.researchNext) return;
  const r=RESEARCH.find(x=>x.id===state.researchNext);
  if(!r || state.research[r.id]){ state.researchNext=null; return; }
  if(!reqsMet(r) || !sciGateMet(r) || state.money<rdCostOf(r)) return;
  state.researchNext=null;
  startResearchProject(r, true);
  if(state.money<0) gameOver();
}

// M-Rush: pour extra capital into the active R&D project to shave a month off
// its timeline. Cost scales quadratically with how many months have already
// been rushed off THIS project, so rushing the last month of a long project
// costs much more than the first. Floors at 1 month remaining (can't rush to
// instant completion in the same tick — completeResearch() still needs the
// final advance() to land).
const RUSH_BASE_COST = 0.8; // $M for the 1st month rushed off any project
function rushCost(rushedSoFar){ return RUSH_BASE_COST*Math.pow(rushedSoFar+1,2); }
function rushResearch(){
  const ar=state.activeResearch; if(!ar) return;
  if(ar.monthsLeft<=1) return; // floor: can't rush below 1 month
  const cost=rushCost(ar.rushed||0);
  if(state.money<cost) return;
  state.money-=cost; ar.monthsLeft--; ar.rushed=(ar.rushed||0)+1;
  const r=RESEARCH.find(x=>x.id===ar.id);
  log('note',`R&D rush: spent ${fM(cost)} to shave a month off ${r.name} — ${fmtTimeLeft(ar.monthsLeft)} left.`);
  if(state.money<0) gameOver(); else render();
}
// M14: spend accumulated science (not money) to complete a month of research
const SCI_RUSH_BASE = 6;
function sciRushCost(rushedSoFar){ return Math.round(SCI_RUSH_BASE*(rushedSoFar+1)); } // 6, 12, 18, ...
function applyScience(){
  const ar=state.activeResearch; if(!ar) return;
  if(ar.monthsLeft<=1) return;
  const cost=sciRushCost(ar.sciRushed||0);
  if((state.science||0)<cost) return;
  state.science=round2(state.science-cost); ar.monthsLeft--; ar.sciRushed=(ar.sciRushed||0)+1;
  const r=RESEARCH.find(x=>x.id===ar.id);
  log('note',`Applied ${cost} science to ${r.name} — a month of lab work done, ${fmtTimeLeft(ar.monthsLeft)} left.`);
  render();
}

/* ---------- M6: personnel helpers ---------- */
function personById(id){
  for(const P of STAFF_POOLS){ const p=P.list.find(x=>x.id===id); if(p) return p; }
  return undefined;
}
function staffRecord(id){ return state.staff.find(s=>s.id===id); }
function isHired(id){ return !!staffRecord(id); }

/* #19 slice B: career progression. A hired person's EFFECTIVE skill rises above their fixed
   hire-day base as they accrue experience (capped). xp is 0 until slice B starts accruing it,
   so effSkill()==base for a fresh game / slice-A state (balance-neutral). */
const XP_SKILL_SLOPE = 0.0016;  // effective-skill gain per xp point
const XP_SKILL_MAX   = 0.15;    // most a veteran can add over their hire-day base
const SKILL_HARD_CAP = 0.99;    // no one is perfect
const XP_PER_MONTH    = 3;      // base experience a working staff member banks each month
const TRAIN_ACCEL     = 0.5;    // each department training level adds +50% xp accrual for its members
const TRAIN_MAX_LEVEL = 4;      // cap on a department's training investment
const TRAIN_COST_BASE = 1.5;    // $M for the first training level (scales with level + headcount)
const TRAIN_XP_BUMP   = 40;     // immediate xp granted to each member when a training level is bought
const TRAIN_MORALE_BUMP = 4;    // morale lift from a training investment
function staffXp(id){ const sr=staffRecord(id); return sr?(sr.xp||0):0; }
function effSkill(id){
  const p=personById(id); if(!p) return 0;
  const bonus=Math.min(XP_SKILL_MAX, staffXp(id)*XP_SKILL_SLOPE);
  return Math.min(SKILL_HARD_CAP, p.skill + bonus);
}
// veteran gain (effSkill above hire-day base), 0..XP_SKILL_MAX — surfaced in the UI
function skillGain(id){ const p=personById(id); return p?Math.max(0, effSkill(id)-p.skill):0; }
// #19 slice B: department training investment (persistent level that accelerates its xp accrual)
function trainDepartmentCost(deptId){ const lvl=deptState(deptId).training, n=deptMembers(deptId).length; return round2(TRAIN_COST_BASE*(lvl+1)*(1+0.3*n)); }
function canTrainDepartment(deptId){
  const def=departmentDef(deptId); if(!def) return {ok:false,why:'Unknown department.'};
  const ds=deptState(deptId);
  if(deptMembers(deptId).length===0) return {ok:false,why:'No one to train — hire into this department first.'};
  if(ds.training>=TRAIN_MAX_LEVEL) return {ok:false,why:`Training maxed (L${TRAIN_MAX_LEVEL}).`};
  const cost=trainDepartmentCost(deptId);
  if(state.money<cost) return {ok:false,why:'Not enough capital.'};
  return {ok:true,cost};
}
function trainDepartment(deptId){
  const chk=canTrainDepartment(deptId); if(!chk.ok) return;
  state.departments=state.departments||defaultDepartments();
  state.departments[deptId]=state.departments[deptId]||{lead:null,training:0};
  state.money-=chk.cost;
  state.departments[deptId].training++;
  deptMembers(deptId).forEach(sr=>{ sr.xp=(sr.xp||0)+TRAIN_XP_BUMP; sr.morale=clampA((sr.morale||50)+TRAIN_MORALE_BUMP,0,100); });
  const def=departmentDef(deptId);
  log('ok', `${def.name} training invested — now L${state.departments[deptId].training}/${TRAIN_MAX_LEVEL} (${fM(chk.cost)}). Members gained experience and morale.`);
  render();
}
// monthly experience accrual for all hired staff (scaled by morale × their department's training level)
function accrueStaffXp(){
  (state.staff||[]).forEach(s=>{
    const dep=deptOfPerson(s.id); const tl=dep?deptState(dep).training:0;
    const mf=Math.max(0.2,(s.morale||50)/100);
    s.xp=(s.xp||0)+XP_PER_MONTH*mf*(1+tl*TRAIN_ACCEL);
  });
}

// Available to hire: not already hired, era unlocked
function availablePool(){
  const ei=eraIndex(currentEra());
  return STAFF_POOLS.flatMap(P=>P.list).filter(p=>{
    if(isHired(p.id)) return false;
    if(p.era>ei) return false;
    return true;
  });
}

// Engineer team aggregate — skill weighted by morale (low morale = skill degraded)
function engTeam(){ return (state.staff||[]).filter(s=>ENGINEERS.find(e=>e.id===s.id)); }

/* ---------- #19 departments: derived membership + promotable leads ---------- */
function deptState(id){ const d=(state.departments&&state.departments[id])||{}; return {lead:d.lead!=null?d.lead:null, training:d.training||0}; }
// derived membership: hired staff records belonging to this department
function deptMembers(id){
  const def=departmentDef(id); if(!def) return [];
  return (state.staff||[]).filter(sr=>{
    const p=personById(sr.id); if(!p) return false;
    // engineering departments match by specialty; every other department maps 1:1 to a role.
    if(def.kind==='eng') return roleOf(sr.id)==='eng' && p.specialty===def.specialty;
    return roleOf(sr.id)===def.kind;
  });
}
// which department a hired person belongs to
function deptOfPerson(id){
  const p=personById(id); if(!p) return null;
  const role=roleOf(id);
  if(role==='eng') return p.specialty;
  const def=DEPARTMENTS.find(d=>d.kind===role); // non-eng roles map 1:1 to their department
  return def?def.id:null;
}
// the lead's staff record for a department, or null — self-heals if the lead has left the roster
function deptLeadRecord(id){
  const ds=deptState(id); if(!ds.lead) return null;
  const sr=staffRecord(ds.lead);
  const stillMember = sr && deptMembers(id).some(m=>m.id===ds.lead);
  if(!stillMember){ if(state.departments&&state.departments[id]) state.departments[id].lead=null; return null; }
  return sr;
}
function isDeptLead(personId){ const dep=deptOfPerson(personId); return !!(dep && deptState(dep).lead===personId); }
function canPromoteLead(personId){
  const dep=deptOfPerson(personId); if(!dep) return {ok:false,why:'Not a hired staff member.'};
  if(deptState(dep).lead===personId) return {ok:false,why:'Already leads this department.'};
  return {ok:true, dep};
}
function promoteLead(personId){
  const chk=canPromoteLead(personId); if(!chk.ok) return;
  state.departments=state.departments||defaultDepartments();
  state.departments[chk.dep]=state.departments[chk.dep]||{lead:null,training:0};
  state.departments[chk.dep].lead=personId;
  const p=personById(personId), def=departmentDef(chk.dep);
  log('ok', `${p?p.name:'A lead'} promoted to head of ${def?def.name:chk.dep}.`);
  render();
}
function stepDownLead(deptId){
  if(state.departments&&state.departments[deptId]){ state.departments[deptId].lead=null; render(); }
}
// lead influence factor for a department: 1.0 with no lead (balance-neutral), else scaled by
// the lead's live skill×morale. Used to weight the lead's own contribution and, for the corps,
// to grant a small flat crewed-reliability steadiness.
function deptLeadStrength(id){
  const sr=deptLeadRecord(id); if(!sr) return 0;
  const p=personById(sr.id); if(!p) return 0;
  return effSkill(sr.id)*Math.max(0.2,(sr.morale||50)/100); // 0..~1
}
// Astronaut Corps lead → flat crewed reliability steadiness (0 with no corps lead)
function corpsLeadRelBonus(){ return deptLeadStrength('astronaut')*CORPS_LEAD_REL_BONUS_MAX; }

/* ---------- #19 slice C: succession & workforce planning ---------- */
// When a lead leaves the roster (fired / quit / poached / retired), the strongest remaining
// member of that department automatically steps up. Call at every staff-removal point.
function bestSuccessor(deptId){
  const members=deptMembers(deptId); if(!members.length) return null;
  return members.slice().sort((a,b)=>(effSkill(b.id)*Math.max(0.2,(b.morale||50)/100))-(effSkill(a.id)*Math.max(0.2,(a.morale||50)/100)))[0];
}
function reconcileDeptLeads(){
  if(!state.departments) return;
  DEPARTMENTS.forEach(def=>{
    const ds=state.departments[def.id]; if(!ds||!ds.lead) return;
    if(deptMembers(def.id).some(m=>m.id===ds.lead)) return; // lead still present — nothing to do
    const succ=bestSuccessor(def.id);
    if(succ){ ds.lead=succ.id; const p=personById(succ.id); log('note', `${p?p.name:'Someone'} stepped up to lead ${def.name} after the previous lead departed.`); }
    else ds.lead=null;
  });
}
function deptStaffed(id){ return deptMembers(id).length>0; }
function deptLed(id){ return !!deptLeadRecord(id); }
// Which departments are critical right now: the three core engineering specialties every vehicle
// exercises, plus the Astronaut Corps when the active mission is crewed.
function criticalDepts(){
  const core=['propulsion','structures','avionics'];
  const m=(typeof MISSIONS!=='undefined')?missionById(state.activeMission):null;
  if(m && m.crew>0) core.push('astronaut');
  return core;
}
// Gaps worth surfacing: an unstaffed critical department (a real reliability risk) or a staffed-but-
// leaderless critical department (an advisory nudge).
function workforceGaps(){
  const gaps=[];
  criticalDepts().forEach(id=>{
    if(!deptStaffed(id)) gaps.push({id, kind:'understaffed'});
    else if(!deptLed(id)) gaps.push({id, kind:'leaderless'});
  });
  return gaps;
}
// Era-scaled reliability penalty for leaving a core engineering specialty completely unstaffed.
// 0 in Pioneer (eraStakesFrac=0) → early game provably unchanged.
function deptStaffingRelPenalty(){
  const frac=eraStakesFrac(); if(frac<=0) return 0;
  let pen=0;
  ['propulsion','structures','avionics'].forEach(id=>{ if(!deptStaffed(id)) pen+=DEPT_UNDERSTAFF_REL_PEN; });
  return Math.min(DEPT_UNDERSTAFF_REL_CAP, pen*frac);
}

// M9: two trait-weighted team scores — one for reliability, one for R&D speed.
function engScores(){
  const team=engTeam(); if(!team.length) return {rel:0, rd:0, avg:0};
  let mentor=0; team.forEach(s=>{ const tr=traitOf(s.id); if(tr.team) mentor+=tr.team; });
  const mult=1+Math.min(0.3, mentor); // mentors lift the whole team, capped
  let relSum=0, rdSum=0, avgSum=0, wSum=0;
  team.forEach(s=>{
    const p=personById(s.id), tr=traitOf(s.id);
    const mf=Math.max(0.2,(s.morale||50)/100), base=effSkill(s.id)*mf;
    // #19: a department lead's contribution is weighted more heavily, so promoting your
    // strongest-trait engineer amplifies that trait across the team score. Weight is 1.0
    // for everyone when no leads are declared → identical to the pre-#19 average.
    const w=isDeptLead(s.id)?DEPT_LEAD_WEIGHT:1;
    relSum+=base*(tr.rel||1)*w; rdSum+=base*(tr.rd||1)*w; avgSum+=base*w; wSum+=w;
  });
  const denom=wSum||team.length;
  return {rel:Math.min(1,relSum/denom*mult), rd:Math.min(1,rdSum/denom*mult), avg:Math.min(1,avgSum/denom)};
}
function engTeamScore(){ return engScores().avg; }
function engRelBonus(){ return engScores().rel*ENG_REL_BONUS_MAX; }
function engRdSpeedBonus(){
  // returns fractional extra R&D months per calendar month (0–ENG_RD_SPEED_MAX)
  return engScores().rd*ENG_RD_SPEED_MAX;
}
/* ===== Generic role team score (scientists / executives / controllers) — mirrors the #19
   engineer scoring: a lead-weighted average of effSkill×morale, optionally multiplied by a
   role-specific trait channel (e.g. 'yield'). Returns 0 when nobody of that role is hired, so
   every effect built on it is balance-neutral until the role is staffed. */
function roleTeamScore(role, chan){
  const members=(state.staff||[]).filter(s=>roleOf(s.id)===role);
  if(!members.length) return 0;
  let sum=0, w=0;
  for(const s of members){ const tr=traitOf(s.id); const mf=Math.max(0.2,(s.morale||50)/100); const base=effSkill(s.id)*mf; const ww=isDeptLead(s.id)?DEPT_LEAD_WEIGHT:1; sum+=base*(chan&&tr[chan]?tr[chan]:1)*ww; w+=ww; }
  return Math.min(1, sum/(w||members.length));
}
// Scientists: lift science yield and (modestly) R&D speed. Both 0 when none are hired.
const SCI_STAFF_YIELD_MAX=0.25, SCI_STAFF_RD_MAX=0.10;
function sciStaffYieldBonus(){ return roleTeamScore('sci','yield')*SCI_STAFF_YIELD_MAX; }
function sciStaffRdBonus(){ return roleTeamScore('sci','rd')*SCI_STAFF_RD_MAX; }
// Executives: lift the earned government grant, cut monthly opex, sweeten mandate bonuses. All 0 when none hired.
const EXEC_GOV_FUNDING_MAX=0.20, EXEC_OPEX_CUT_MAX=0.15, EXEC_MANDATE_BONUS_MAX=0.15;
function execGovBonus(){ return roleTeamScore('exec','gov')*EXEC_GOV_FUNDING_MAX; }
function execOpexCut(){ return roleTeamScore('exec','opex')*EXEC_OPEX_CUT_MAX; }
function execMandateBonus(){ return roleTeamScore('exec','mandate')*EXEC_MANDATE_BONUS_MAX; }
// Mission Controllers: prevent anomalies, improve live-call odds, and boost rescue chances. All 0
// when none are hired, so the launch flow is byte-identical unstaffed — and the CE5 invariant holds:
// controllers only shift CHANCE (anomaly rate / call threshold / rescue odds), never how a call resolves.
const CTRL_ANOMALY_CUT_MAX=0.35, CTRL_CALL_BONUS_MAX=0.10, CTRL_RESCUE_BONUS_MAX=0.08;
function ctrlAnomScore(){ return roleTeamScore('controller','anom'); }
function ctrlCallScore(){ return roleTeamScore('controller','call'); }
function ctrlRescueScore(){ return roleTeamScore('controller','rescue'); }
// improves a live-call success threshold; identical to p when no controllers are on the loop
function opsLuck(p){ return Math.min(0.98, p + ctrlCallScore()*CTRL_CALL_BONUS_MAX); }
// Aggregate active specialist-staff effects, for the exec-overview dashboard (empty when none are staffed).
function staffEffectsHTML(){
  const b=[];
  if(sciStaffYieldBonus()>0) b.push('sci yield +'+((sciStaffYieldBonus()*100)|0)+'%');
  if(sciStaffRdBonus()>0) b.push('R&D +'+((sciStaffRdBonus()*100)|0)+'%');
  if(execGovBonus()>0) b.push('funding +'+((execGovBonus()*100)|0)+'%');
  if(execOpexCut()>0) b.push('opex −'+((execOpexCut()*100)|0)+'%');
  if(ctrlAnomScore()>0) b.push('anomaly −'+((ctrlAnomScore()*CTRL_ANOMALY_CUT_MAX*100)|0)+'%');
  return b.length?'<div><span class="dim">Staff bonuses:</span> <b style="color:var(--ok)">'+b.join(' · ')+'</b></div>':'';
}
// Orbital research stations accelerate R&D: total station science output above a threshold
// contributes fractional research speed. Capped so it complements (not replaces) engineers.
const STATION_RD_SPEED_MAX=0.25;
function stationRdSpeedBonus(){
  let sci=0;
  for(const fid in (state.facilities||{})){ if(!facilityBuilt(fid)) continue;
    const pr=facilityProduction(facilityById(fid), facilityState(fid)); sci+=pr.sci*facilitySupplyFactor(fid); }
  // 6 sci/mo of orbital research ≈ full bonus
  return Math.min(STATION_RD_SPEED_MAX, sci/6*STATION_RD_SPEED_MAX);
}

function assignedAstroRecord(){
  if(!state.assignedAstronaut) return null;
  return staffRecord(state.assignedAstronaut);
}

function astroBonus(){
  const sr=assignedAstroRecord(); if(!sr) return {rel:0,payoutMult:1};
  const p=personById(sr.id), tr=traitOf(sr.id);
  const moraleFactor=Math.max(0.2,(sr.morale||50)/100);
  const score=effSkill(sr.id)*moraleFactor;
  return {
    rel: score*ASTRO_REL_BONUS_MAX*(tr.rel||1) + corpsLeadRelBonus(), // #19: corps lead adds flat steadiness (0 with no lead)
    payoutMult: 1+score*ASTRO_PAYOUT_BONUS_MAX*(tr.pay||1),
  };
}

function hirePersonnel(id){
  if(isHired(id)) return;
  state.staff.push({id, morale:70, lowMoraleMonths:0, commendCooldown:0, xp:0});
  const p=personById(id);
  log('note',`Hired ${p.name} (${p.salary.toFixed(2)}M/mo salary).`);
  render();
}

function firePersonnel(id){
  const p=personById(id);
  state.staff=state.staff.filter(s=>s.id!==id);
  if(state.assignedAstronaut===id) state.assignedAstronaut=null;
  reconcileDeptLeads(); // #19 slice C: succession if the fired person was a department lead
  log('note',`${p?p.name:'Staff'} let go. Monthly burn reduced.`);
  render();
}

function giveRaise(id){
  const p=personById(id); const sr=staffRecord(id); if(!p||!sr) return;
  p.salary+=RAISE_SALARY_BUMP;
  sr.morale=Math.min(100,sr.morale+RAISE_MORALE_BUMP);
  state.money-=0.05; // signing cost
  log('note',`Raise given to ${p.name}: salary now ${p.salary.toFixed(2)}M/mo. Morale +${RAISE_MORALE_BUMP}.`);
  render();
}

function commendPersonnel(id){
  const p=personById(id); const sr=staffRecord(id); if(!p||!sr) return;
  if(sr.commendCooldown>0) return;
  sr.morale=Math.min(100,sr.morale+COMMEND_MORALE_BUMP);
  sr.commendCooldown=COMMEND_COOLDOWN_MONTHS;
  log('note',`${p.name} commended. Morale +${COMMEND_MORALE_BUMP}.`);
  render();
}

function assignAstronaut(id){
  if(!isHired(id)) return;
  if(isCrewDeployed(id)){ const dp=personById(id); log('note',`${dp?dp.name:'That astronaut'} is on a mission — they can be assigned again once the flight returns.`); return; } // 1.2b: no double-booking a deployed astronaut
  state.assignedAstronaut=(state.assignedAstronaut===id)?null:id;
  const p=personById(id);
  log('note', state.assignedAstronaut
    ? `${p.name} assigned as mission astronaut.`
    : `${p.name} unassigned.`);
  render();
}

// Called on mission success/failure to affect morale
function personnelMissionEvent(success){
  state.staff.forEach(s=>{
    if(success) s.morale=Math.min(100,s.morale+2);
    else s.morale=Math.max(0,s.morale-5);
  });
}
// M9: personal events — trait-flavoured incidents for a hired staffer, rate-limited
const PERS_EVENT_CHANCE=0.11, PERS_EVENT_GAP=4;
function checkPersonnelEvents(){
  state.persEventCooldown=(state.persEventCooldown||0)-1;
  if(!state.staff || !state.staff.length || state.persEventCooldown>0) return;
  if(Math.random()>PERS_EVENT_CHANCE) return;
  const s=state.staff[Math.floor(Math.random()*state.staff.length)];
  const p=personById(s.id); if(!p) return;
  const tr=traitOf(s.id), trKey=traitKeyOf(s.id);
  const riskish=(trKey==='risk_taker'||trKey==='daredevil');
  const brilliant=(trKey==='visionary'||trKey==='perfectionist'||trKey==='mentor');
  const roll=Math.random();
  let type;
  if(riskish)        type = roll<0.45?'mistake':(roll<0.70?'raise':'breakthrough');
  else if(brilliant) type = roll<0.50?'breakthrough':(roll<0.75?'accolade':'raise');
  else               type = roll<0.34?'breakthrough':(roll<0.67?'raise':'accolade');
  state.persEventCooldown=PERS_EVENT_GAP;
  if(type==='breakthrough'){
    state.rep+=3; s.morale=Math.min(100,s.morale+6);
    if(state.activeResearch && state.activeResearch.monthsLeft>1){ state.activeResearch.monthsLeft=Math.max(1,state.activeResearch.monthsLeft-1);
      log('ok',`${p.name} (${tr.name}) had a breakthrough — a month shaved off ${RESEARCH.find(r=>r.id===state.activeResearch.id).name}, +3 rep.`); }
    else log('ok',`${p.name} (${tr.name}) published a breakthrough — +3 rep, morale up.`);
  } else if(type==='mistake'){
    const loss=round2(0.3+Math.random()*0.9); state.money-=loss; s.morale=Math.max(0,s.morale-6);
    log('bad',`${p.name} (${tr.name}) made a costly mistake — −${fM(loss)}, morale down.`);
  } else if(type==='raise'){
    s.morale=Math.max(0,s.morale-5);
    log('note',`${p.name} is angling for a raise — morale slipping. A Raise in Personnel would keep them happy.`);
  } else {
    state.rep+=2; s.morale=Math.min(100,s.morale+5);
    log('ok',`${p.name} (${tr.name}) earned an industry accolade — +2 rep.`);
  }
}


/* ---------- modals ---------- */
// ── Slice B: epoch victories also file an Agency Wire front page and expose a "Read the front page ▸"
// link that renders it through the SAME shared frontPageHTML path Slice A used for milestones and the
// Chronicle browser. The victory modal keeps its existing copy/behavior — this only adds the link.
// (Epoch victories previously filed NO wire entry at all — they short-circuit showMilestoneModal via
// pendingCelebration — so this also finally records these landmark firsts in the Chronicle wire.)
let _victoryWire=null; // transient: the front-page entry the currently-open victory modal links to
function victoryWireBtn(icon, headline, dek){
  const existing=frontPages().find(x=>x.kind==='milestone' && x.headline===headline); // guard: re-showing a victory must not duplicate its wire entry
  if(existing){ _victoryWire=existing; }
  else { pushFrontPage('milestone', icon, headline, dek); _victoryWire=frontPages()[0]; }
  return `<button class="btn ghost" style="margin-top:8px" onclick="showVictoryWire()">Read the front page ▸</button>`;
}
function showVictoryWire(){
  if(!_victoryWire) return;
  showModal(`${frontPageHTML(_victoryWire, true)}<button class="btn launch" style="width:100%;margin-top:10px" onclick="hideModal()">Keep flying ▸</button>`, 'newspaper');
}
function victory(){
  showModal(`<h2>Orbit achieved.</h2>
    <p>You've flown a payload to orbital velocity — the summit of the Pioneer era. The core loop is proven: the rocket equation, staging, materials, and reliability all bent to your will.</p>
    <p class="muted">Next milestone (M2): <b>crew &amp; life support</b> — keeping people alive becomes a mass &amp; power budget that rides the same rocket equation.</p>
    <button class="btn" onclick="hideModal()">Keep flying</button>
    ${victoryWireBtn('🛰','First payload reaches orbit','Orbital velocity achieved — the summit of the Pioneer era.')}`);
}
function victoryM2(){
  showModal(`<h2>Endurance achieved.</h2>
    <p>Three crew, four months, home alive. You've felt the full weight of the rocket equation: life support is payload, payload is propellant, and closing the loop is the lever that bends the curve back.</p>
    <p class="muted">Next milestone (M3): the <b>Solar System opens</b> — real Δv budgets to the Moon and beyond, in-space refueling, and ISRU to break the tyranny for good.</p>
    <button class="btn" onclick="hideModal()">Keep flying</button>
    ${victoryWireBtn('👩‍🚀','Crew endures the long flight','Three crew, four months, home alive — closed-loop life support proven.')}`);
}
function victoryM3a(){
  showModal(`<h2>The Moon, captured and left.</h2>
    <p>You flew a crew to lunar orbit and brought them home — a journey of stacked burns where the transfer stage spent one tank across three deep-space maneuvers while hauling everything above it. The mass compounded at every leg, and you beat it.</p>
    <p class="muted">Coming next (M3a-ii): the <b>Lunar Lander</b> — a separate vehicle for descent and ascent — then M3b opens Mars, refueling depots, and ISRU.</p>
    <button class="btn" onclick="hideModal()">Keep flying</button>
    ${victoryWireBtn('🌙','Crew rounds the Moon and returns','A journey of stacked burns to lunar orbit and home again.')}`);
}
function victoryM3aii(){
  showModal(`<h2>Boots on the Moon.</h2>
    <p>Two crew rode the descent stage down, walked on another world, and lit the ascent engine to chase the transfer stage back into orbit — leaving the descent stage behind as a monument. Seven legs, three separate vehicles, one rocket equation, compounded all the way from the pad.</p>
    <p class="muted">Next (M3b): <b>Mars</b> — launch windows, in-space refueling depots, and ISRU propellant that finally breaks the tyranny of the equation.</p>
    <button class="btn" onclick="hideModal()">Keep flying</button>
    ${victoryWireBtn('🌙','Boots on the Moon','Two crew walk on another world and fly the ascent stage home.')}`);
}
function victoryM3b(){
  showModal(`<h2>Mars, and back.</h2>
    <p>Three crew spent five hundred and twenty days away from Earth — captured into Mars orbit, held through the long wait for the return window, then burned for home. Closed-loop life support, which never paid for itself on shorter flights, finally did its job: every kilogram it saved was a kilogram of propellant you didn't have to carry across two planets.</p>
    <p class="muted">Next (M3b-ii): <b>refueling depots and ISRU</b> — pre-position propellant in orbit so the next mission doesn't have to launch with a full tank from Earth.</p>
    <button class="btn" onclick="hideModal()">Keep flying</button>
    ${victoryWireBtn('🔴','Mars, reached and returned','Three crew, five hundred and twenty days away, home again.')}`);
}
function victoryM3bii(reason){
  const body = reason==='depot'
    ? `<p>A tanker flew up with nothing but a tank of propellant, topped off the depot, and your next mission's transfer stage launched lighter for it — every tonne drawn from orbit is a tonne the launch vehicle never had to fight gravity to deliver.</p>`
    : `<p>A burn that once meant hauling propellant across millions of kilometers is now made on-site — water or CO₂ from the ground itself, cracked into propellant by a plant you built. The mass that burn used to cost is simply gone from the manifest.</p>`;
  showModal(`<h2>The tyranny, broken.</h2>
    ${body}
    <p class="muted">This is the lever the whole rocket equation has been pointing at: every kilogram you don't have to launch from Earth's surface is a kilogram you never have to multiply through every leg that follows.</p>
    <button class="btn" onclick="hideModal()">Keep flying</button>
    ${victoryWireBtn('⛽','The tyranny of the rocket equation, broken','Propellant staged or made off-Earth — the equation finally bends.')}`);
}
// ── CE4(c): era-scaled failure stakes + bailout retune ────────────────────────────────
// "Stakes rise, they don't shift earlier": every term is keyed to eraStakesFrac(), which is 0 in
// the Pioneer era — so the early game is provably unchanged (add-don't-take-away).
const CE4_LOSS_REP_FRAC=0.22;   // severe loss also bites this fraction of CURRENT rep at the final era
const CE4_LOSS_SUPPORT=8;       // extra public-support collapse on a severe loss (× era frac)
const CE4_LOSS_RIVAL_MOM=0.22;  // rivals capitalize: momentum spike on a severe loss (× era frac)
const BAILOUT_BASE=3.0;         // base bridge-loan principal
const BAILOUT_REP_BASE=12;      // base rep cost (rises with era and each successive loan)
const BAILOUT_INTEREST=0.06;    // permanent monthly debt service added per loan (fraction of principal)
function eraStakesFrac(){ return clampA(eraIndex(currentEra())/Math.max(1,ERAS.length-1), 0, 1); } // 0 = Pioneer, 1 = final era
function loanInterest(){ return Math.max(0, state.loanInterest||0); } // CE4(c): recurring bridge-loan debt service (legacy saves → 0)
// A severe late-game loss reverberates: a proportional rep bite, a support collapse, and a rival
// momentum spike — all × era frac, so a beginner's loss is unchanged but a late catastrophe is a
// genuine, compounding setback rather than forfeit-and-regrind. Returns the extra rep lost.
function applyEraStakes(label){
  const frac=eraStakesFrac(); if(frac<=0) return 0;
  const repBite=Math.round(CE4_LOSS_REP_FRAC*state.rep*frac);
  if(repBite>0) state.rep=Math.max(0,state.rep-repBite);
  addSupport(-CE4_LOSS_SUPPORT*frac);
  let spiked=false;
  for(const r of RIVALS){ const rs=rivalStateFor(r); const b=rs.momentum; rs.momentum=clampA(rs.momentum+CE4_LOSS_RIVAL_MOM*frac, RIVAL_MOM_MIN, RIVAL_MOM_MAX); if(rs.momentum>b+1e-9) spiked=true; }
  if(repBite>0||spiked) log('bad',`The ${label} reverberates through the program — −${repBite} rep beyond the mission penalty${spiked?'; rivals press their advantage':''}.`);
  return repBite;
}
// CE4(c): bridge-loan terms scale with era — bigger principal (you need more to survive late), but a
// steeper rep cost AND a permanent monthly interest drag, so late-game insolvency is truly losable.
function bailoutTerms(){
  const era=eraIndex(currentEra()), uses=state.bailouts||0;
  return { amount:round2(BAILOUT_BASE*(1+era*0.6)), repCost:Math.round(BAILOUT_REP_BASE*(1+era*0.5)*(1+uses*0.5)), interest:round2(BAILOUT_BASE*(1+era*0.6)*BAILOUT_INTEREST) };
}

// ── P11/I3: a generalized late-game crisis roster (P11 shipped one one-time debris crisis; this
// makes crises a recurring feature of a mature empire, drawn from a small rotating set instead of a
// single demo event). Same skeleton throughout — era+threshold-gated trigger, a severity that rises
// unfunded/falls funded, resolves 'mitigated' or 'endured' after CRISIS_ENDURE_MONTHS, never a hard
// lockout — now data-driven across 3 distinct effects instead of one hardcoded LEO-reliability tax.
// Only one crisis is ever active at a time; the SAME crisis type won't immediately repeat itself.
const CRISIS_TRIGGER_CHANCE=0.02;   // monthly chance once eligible (unpredictable, not the instant you cross the threshold)
const CRISIS_SEVERITY_RISE=0.05;    // per month while unfunded
const CRISIS_SEVERITY_FALL=0.12;    // per month while a remediation program is funded and active
const CRISIS_FUND_MONTHS=6;         // one funding term's duration
const CRISIS_ENDURE_MONTHS=36;      // resolves as "endured" after this long if never fully mitigated
const CRISES=[
  { id:'debris_cascade', name:'Debris Cascade', icon:'⚠',
    eraMin:4, thresholdStat:'leoFlights', threshold:40, fundCostBase:6.0, maxPenalty:0.12, effectKey:'leoRel',
    remedyName:'Debris Remediation Program', effectLabel:'LEO reliability tax',
    modalTitle:'Debris Cascade — LEO',
    modalDesc:'A cascading debris field is fouling low Earth orbit. Every LEO-class mission flies at reduced reliability while it\'s active — the fallout of a mature launch industry catching up with itself.',
    triggerMsg:'⚠ Tracking stations report a debris cascade forming in LEO — decades of launch traffic catching up with the industry. Left unfunded, low orbit gets steadily less safe to operate in.',
    mitigatedMsg:'✅ The debris field has been cleared — LEO operations are back to full safety margins. A defining moment for the agency.',
    enduredMsg:'The debris field has settled into a permanent, manageable hazard — the agency adapted and operations continue.' },
  { id:'solar_storm', name:'Solar Storm Season', icon:'☀',
    eraMin:5, thresholdStat:'deepFlights', threshold:15, fundCostBase:7.0, maxPenalty:0.15, effectKey:'deepRel',
    remedyName:'Shielding Surge Program', effectLabel:'Deep-space reliability tax',
    modalTitle:'Solar Storm Season',
    modalDesc:'An extended run of severe space weather is battering every deep-space mission with radiation and charged-particle upsets while it lasts.',
    triggerMsg:'☀ Solar physicists warn of an extended run of severe space weather — years of radiation storms and charged-particle upsets bearing down on every deep-space mission in flight.',
    mitigatedMsg:'✅ The storm season has passed its peak — deep-space operations are back to full safety margins.',
    enduredMsg:'The storm season has become a fact of deep-space life — crews and hardware have adapted, at a permanent cost.' },
  { id:'funding_collapse', name:'Funding Collapse', icon:'📉',
    eraMin:3, thresholdStat:null, threshold:0, fundCostBase:5.0, maxPenalty:0.5, effectKey:'govFunding',
    remedyName:'Emergency Outreach Campaign', effectLabel:'Government funding cut',
    modalTitle:'Funding Collapse',
    modalDesc:'A hostile political shift is squeezing government funding — the earned grant is cut while this lasts.',
    triggerMsg:'📉 A change in government has put your public funding on notice — a hostile legislature is threatening to slash the program\'s budget.',
    mitigatedMsg:'✅ Public confidence has been rebuilt — government funding is restored to its normal level.',
    enduredMsg:'The funding cut has become permanent political reality — the agency has learned to operate leaner.' },
];
function isLeoClassMission(m){ return !!(m && !m.profile && (m.reqDv||0)>=9000); }
function crisisDef(id){ return CRISES.find(c=>c.id===id); }
function activeCrisisDef(){ return state.crisis ? crisisDef(state.crisis.id) : null; }
// The resolved-crisis log. Lazily backfilled from P11's original singular state.crisisDone the first
// time it's touched, so an old save's one already-resolved crisis just becomes history entry #1 —
// no explicit migration function, no SAVE_VERSION bump.
function crisisHistory(){
  const h=state.crisisHistory=state.crisisHistory||[];
  if(state.crisisDone && !h.length){ h.push(state.crisisDone); }
  return h;
}
function crisisFundCost(def){ def=def||activeCrisisDef(); if(!def) return Infinity; return round2(def.fundCostBase*(1+eraStakesFrac()*1.2)); } // scales with era like bailoutTerms
// eligible candidates right now: era-gated, threshold-gated (if any), and not an immediate repeat
// of whichever crisis type just resolved (variety over a full game, not the same one on loop)
function crisisCandidates(){
  if(state.crisis) return [];
  const era=eraIndex(currentEra());
  const hist=crisisHistory(), lastId=hist.length?hist[hist.length-1].id:null;
  return CRISES.filter(c=>{
    if(era<c.eraMin) return false;
    if(c.thresholdStat && (state[c.thresholdStat]||0)<c.threshold) return false;
    if(c.id===lastId) return false;
    return true;
  });
}
function crisisRelPenalty(m){
  const def=activeCrisisDef(); if(!def) return 0;
  if(def.effectKey==='leoRel' && isLeoClassMission(m)) return def.maxPenalty*state.crisis.severity;
  if(def.effectKey==='deepRel' && !!m.profile) return def.maxPenalty*state.crisis.severity;
  return 0;
}
function crisisGovFundingMult(){
  const def=activeCrisisDef(); if(!def || def.effectKey!=='govFunding') return 1;
  return 1-(def.maxPenalty*state.crisis.severity);
}
function tickCrisisTrigger(){
  const cands=crisisCandidates(); if(!cands.length || Math.random()>=CRISIS_TRIGGER_CHANCE) return;
  const def=cands[Math.floor(Math.random()*cands.length)];
  state.crisis={id:def.id, phase:'building', startAbs:absMonth(), severity:0.15, peakSeverity:0.15, fundedUntilAbs:null};
  timeInterrupt();
  log('bad', def.triggerMsg);
  if(animEnabled) showCrisisModal();
}
function resolveCrisis(outcome){
  const c=state.crisis; if(!c) return;
  const def=crisisDef(c.id);
  const record={id:c.id, outcome, peakSeverity:c.peakSeverity||0, months:absMonth()-c.startAbs};
  crisisHistory().push(record);
  state.crisisDone=record; // kept in sync for anything still reading the old singular field
  state.crisis=null;
  if(outcome==='mitigated'){ addSupport(6); state.rep+=8; log('ok', def?def.mitigatedMsg:'Crisis resolved.'); }
  else { addSupport(2); log('note', def?def.enduredMsg:'Crisis endured.'); }
}
function tickCrisis(){
  tickCrisisTrigger();
  const c=state.crisis; if(!c) return;
  if(c.fundedUntilAbs!=null && absMonth()<c.fundedUntilAbs) c.severity=clampA(c.severity-CRISIS_SEVERITY_FALL,0,1);
  else { c.fundedUntilAbs=null; c.severity=clampA(c.severity+CRISIS_SEVERITY_RISE,0,1); }
  c.peakSeverity=Math.max(c.peakSeverity||0, c.severity);
  if(c.severity<=0){ resolveCrisis('mitigated'); return; }
  if(absMonth()-c.startAbs>=CRISIS_ENDURE_MONTHS){ resolveCrisis('endured'); return; }
}
function canFundCrisisRemediation(){ const def=activeCrisisDef(); return !!def && state.money>=crisisFundCost(def); }
function fundCrisisRemediation(){
  const def=activeCrisisDef(); if(!def || !canFundCrisisRemediation()) return;
  const cost=crisisFundCost(def);
  state.money=round2(state.money-cost);
  state.crisis.fundedUntilAbs=absMonth()+CRISIS_FUND_MONTHS;
  log('note',`${def.remedyName} funded — ${fM(cost)}, active for ${CRISIS_FUND_MONTHS} months.`);
  render();
}
function showCrisisModal(){
  const c=state.crisis; if(!c) return;
  const def=crisisDef(c.id); if(!def) return;
  const pct=Math.round(c.severity*100);
  const funded=c.fundedUntilAbs!=null && absMonth()<c.fundedUntilAbs;
  const cost=crisisFundCost(def), afford=state.money>=cost;
  showModal(`<h2 style="color:var(--warn)">${def.icon} ${def.modalTitle}</h2>
    <p class="muted">${def.modalDesc}</p>
    <div class="metrics" style="margin:10px 0">
      <div class="metric"><div class="k">Severity</div><div class="v" style="color:var(--bad)">${pct}%</div></div>
      <div class="metric"><div class="k">${def.effectLabel}</div><div class="v">−${Math.round(def.maxPenalty*c.severity*100)}%</div></div>
    </div>
    ${funded?`<div class="dim" style="font-size:12px;margin-bottom:8px">${def.remedyName} active — severity falling, funded through month ${c.fundedUntilAbs}.</div>`
      :`<button class="btn" onclick="fundCrisisRemediation();showCrisisModal()" ${afford?'':'disabled'}>Fund ${def.remedyName} (${fM(cost)}, ${CRISIS_FUND_MONTHS} mo)</button>`}
    <button class="btn ghost" style="width:100%;margin-top:8px" onclick="hideModal()">Close — keep flying through it</button>`);
}
function gameOver(){
  state.over=true;
  const usesLeft=2-(state.bailouts||0);
  const t=bailoutTerms();
  const loanBtn = usesLeft>0
    ? `<button class="btn" onclick="bailout()">Emergency bridge loan (+${fM(t.amount)}, −${t.repCost} rep, +${fM(t.interest)}/mo interest)</button>`
    : `<div class="dim" style="font-size:12px;margin-top:6px">No further bridge loans available — investors have lost confidence.</div>`;
  showModal(`<h2 style="color:var(--bad)">Out of capital.</h2>
    <p>The company has run dry. Take a bridge loan to keep flying — late loans are larger but carry a steeper reputation hit and a <b>permanent monthly interest drag</b>${loanInterest()>0?` (you already owe ${fM(loanInterest())}/mo)`:''}. Or close the books and start a new company.</p>
    ${loanBtn}
    <button class="btn ghost" onclick="restart()" style="margin-top:8px">Start over</button>`);
}
function bailout(){
  const t=bailoutTerms();
  state.bailouts=(state.bailouts||0)+1;
  state.money+=t.amount; state.rep=Math.max(0,state.rep-t.repCost);
  state.loanInterest=round2(loanInterest()+t.interest); // CE4(c): the loan's interest is forever
  state.over=false;
  log('note',`Emergency bridge loan: +${fM(t.amount)}, −${t.repCost} rep, +${fM(t.interest)}/mo permanent interest. (${2-state.bailouts} remaining)`);
  hideModal(); render();
}
function restart(difficulty){hideModal();newGame(difficulty);render();}
// ── E0.4 Slice B: focus trap for the shared modal system ──
// Standard focus-trap selector (buttons, links, form fields, and anything explicitly tab-stoppable).
const MODAL_FOCUSABLE_SEL='button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
// The control that had focus before the modal opened, so hideModal can hand focus back. We keep both
// the element reference AND (if it has one) its id: render() frequently rebuilds DOM regions, so the
// original reference can go stale/disconnected before the modal closes — the id is a re-lookup fallback.
let _modalReturnFocus=null, _modalReturnFocusId=null;
// Pure, headless-testable: given the saved element + id fallback, pick where hideModal should return
// focus. Prefer the still-connected original element; else re-resolve by id; else the body fallback.
function resolveReturnFocus(savedEl, savedId, getById, body){
  if(savedEl && savedEl.isConnected) return savedEl;
  if(savedId){ const byId=getById && getById(savedId); if(byId && byId.isConnected) return byId; }
  return body||null;
}
// view: true → the wide, left-aligned, scrollable deep-view layout (.modal.view); a non-empty string →
// that literal modal modifier class (e.g. 'newspaper' → .modal.newspaper, the large era-evolving front
// page); anything falsy → the plain centered .modal. Pure + headless-testable (see test-era-visual).
function modalClassName(view){ return 'modal'+(view===true?' view':view?(' '+view):''); }
function showModal(html,view){ try{ timeInterrupt(); }catch(e){}
  const modalEl=$('modal');
  // Only treat a closed→open transition as "opening": while a deep-view modal is open, render() re-invokes
  // activeModal() (which calls showModal again) on every tick — we must NOT re-capture the trigger (it'd now
  // be an in-modal element) nor yank focus back to the first control on each live re-render.
  const wasOpen=!!(modalEl && modalEl.classList && !modalEl.classList.contains('hidden'));
  if(!wasOpen){ try{ const prev=document.activeElement; _modalReturnFocus=prev||null; _modalReturnFocusId=(prev&&prev.id)?prev.id:null; }catch(e){ _modalReturnFocus=null; _modalReturnFocusId=null; } }
  const mb=$('modalBody');mb.className=modalClassName(view);
  // E0.3 Slice 2: while a deep-view modal is open, render() re-invokes activeModal() (→ showModal
  // again) on every tick, so this used to unconditionally rebuild the body AND replay the entrance
  // animation on every single re-render, even when nothing in the modal actually changed (the
  // literal bug this slice targets). setHTML() skips the DOM write when the html is byte-identical
  // to last time, preserving any in-modal focus/scroll; the entrance class + initial-focus grab
  // are now gated on a genuine closed→open transition only, matching the trigger-focus capture
  // above which already made that same distinction.
  setHTML(mb, html);
  modalEl.classList.remove('hidden');
  if(!wasOpen){ mb.classList.add('modal-entering'); mb.addEventListener('animationend',()=>mb.classList.remove('modal-entering'),{once:true}); }
  try{ if(!mb.getAttribute('tabindex')) mb.setAttribute('tabindex','-1'); }catch(e){}
  if(!wasOpen){ try{ const f=mb.querySelectorAll(MODAL_FOCUSABLE_SEL); if(f && f.length){ f[0].focus(); } else { mb.focus(); } }catch(e){} }
} // view=true → wide, left-aligned, scrollable deep-view layout
function hideModal(){activeModal=null;_prodModalOpen=false;$('modal').classList.add('hidden');
  try{ const el=resolveReturnFocus(_modalReturnFocus,_modalReturnFocusId,id=>document.getElementById(id),document.body); if(el && typeof el.focus==='function') el.focus(); }catch(e){}
  _modalReturnFocus=null; _modalReturnFocusId=null;
} // slice 6: closing clears the live-modal thunk; slice B: also returns focus to the modal's trigger
