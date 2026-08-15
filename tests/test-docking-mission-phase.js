// Docking D1 — LOR/EOR mission operations, frozen reliability, phase/debrief and anomaly gating.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }
function near(a,b){ return Math.abs(a-b)<1e-10; }

newGame('engineer');
const opening=curMission(), openingVehicle=computeVehicle(), openingR=effectiveReliability(opening,openingVehicle,null,false);
const openingDock=dockingMissionCapability(opening,dockingBuildCapability(opening));
check('ordinary First Flight has no docking operation',openingDock.operations.length===0);
check('ordinary First Flight has no docking subsystem',!subsystemFragilities(opening,openingVehicle,null,false,openingDock).some(s=>s.key==='docking'));
check('non-docking reliability remains unchanged by empty capability',near(openingR,effectiveReliability(opening,openingVehicle,null,false,openingDock)));

state.research.lunar_lander=true; state.activeMission='luna_landing'; state.lunarArch='lor';
let mission=curMission(), build=dockingBuildCapability(mission), capability=dockingMissionCapability(mission,build), vehicle=computeVehicle(), sim=simulateMission(mission);
check('LOR owns one real lunar rendezvous operation',capability.operations.length===1&&capability.operations[0].purpose==='Lunar-orbit crew rendezvous');
check('LOR operation owns both reserved ports',dockingReservationErrors(capability).length===0&&capability.operations[0].status==='reserved');
check('LOR exposes a generalized capsule/craft presentation',capability.presentation.length===1&&capability.presentation[0].actor.id==='lunar_ascent'&&capability.presentation[0].target.id==='command_capsule');
check('LOR presentation is lunar and JSON-safe',capability.presentation[0].body==='moon'&&recordIsJsonSafe(capability.presentation[0]));
const lorReport=subsystemReport(mission,vehicle,sim,true,1,capability), lorPhases=flightPhaseBreakdown(lorReport);
check('LOR reliability report names docking subsystem',lorReport.subsystems.some(s=>s.key==='docking'&&s.label==='Rendezvous & docking'));
check('LOR phase breakdown names Rendezvous & docking',lorPhases.some(p=>p.phase==='docking'&&p.label==='Rendezvous & docking'));
check('phase reliability product still equals overall reliability',near(lorPhases.reduce((n,p)=>n*p.rel,1),lorReport.R));
check('debrief report carries docking operation count and guidance',flightReport(mission,vehicle,sim,{kind:'success'},capability).docking.count===1&&flightReport(mission,vehicle,sim,{kind:'success'},capability).docking.guidance===capability.guidance);
const realRandom=Math.random, dockingRolls=lorReport.subsystems.map(s=>s.key==='docking'?1:0); let dockingRollIndex=0;
let dockingFailure;
try{ Math.random=()=>dockingRolls[dockingRollIndex++]||0; dockingFailure=resolveFlight(mission,vehicle,sim,true,0,capability); }
finally{ Math.random=realRandom; }
check('a docking subsystem failure resolves once through the existing partial outcome',dockingFailure.kind==='partial'&&dockingFailure.subsystem==='docking'&&dockingFailure.failPhase==='docking'&&/hard dock/.test(dockingFailure.story));

const latch=MISSION_ANOMALIES.find(a=>a.id==='dock_latch');
const genericCtx={m:mission,crewed:true,docking:{operations:[]}};
check('dock_latch is gated off without a real operation',latch.when(genericCtx)===false);
check('dock_latch is eligible from the frozen real operation',latch.when({m:mission,crewed:true,docking:capability})===true);
state.research.orbital_eva=false;
check('EVA latch response still requires orbital EVA',!latch.options({m:mission,crewed:true,docking:capability}).some(o=>o.id==='eva_latch'));
state.research.orbital_eva=true;
check('EVA latch response appears with orbital EVA',latch.options({m:mission,crewed:true,docking:capability}).some(o=>o.id==='eva_latch'));

state.research.orbital_assembly=true; state.lunarArch='eor';
mission=curMission(); build=dockingBuildCapability(mission); capability=dockingMissionCapability(mission,build); vehicle=computeVehicle(); sim=simulateMission(mission);
check('EOR owns transfer, lander, and lunar rendezvous operations',capability.operations.length===3&&capability.operations.some(op=>op.id.endsWith('eor-transfer'))&&capability.operations.some(op=>op.id.endsWith('eor-lander'))&&capability.operations.some(op=>op.id.endsWith('lunar-rendezvous')));
check('EOR reservations are unique across all six port ends',dockingReservationErrors(capability).length===0&&capability.actors.flatMap(a=>a.interfaces).filter(p=>p.occupiedBy).length===6);
check('EOR established architecture penalty is owned by docking authority',capability.reliability.additive===-0.02);
const noEorPenalty=plainRecord(capability); noEorPenalty.reliability.additive=0;
check('EOR effective reliability applies its established two-point docking modifier',near(effectiveReliability(mission,vehicle,sim,true,capability),clampA(effectiveReliability(mission,vehicle,sim,true,noEorPenalty)-0.02,0.1,0.995)));
check('EOR presentation is generic across Earth and lunar operations',capability.presentation.some(p=>p.body==='earth')&&capability.presentation.some(p=>p.body==='moon'));
state.assembleOrbit=true;
const eorNoDuplicate=dockingMissionCapability(mission,build);
check('EOR inherent assembly cannot be double-selected as the optional route',!assemblyAvailable(mission)&&eorNoDuplicate.operations.length===3&&eorNoDuplicate.rejections.length===0);
state.assembleOrbit=false;

state.activeMission='mars_orbit'; state.architectures.mars_orbit='conjunction'; state.assembleOrbit=true;
mission=curMission();
const manualBuild=dockingBuildCapability(mission), manualCapability=dockingMissionCapability(mission,manualBuild);
check('optional orbital assembly is represented by an exact operation',manualCapability.operations.length===1&&manualCapability.operations[0].source==='orbital_assembly_route');
check('shared reliability helper preserves manual assembly penalty',near(assemblyDockPenalty(mission,manualCapability),ASSEMBLY_DOCK_REL));
state.research.auto_rendezvous=true;
const frozenManual=dockingMissionCapability(mission,manualBuild), automated=dockingMissionCapability(mission,dockingBuildCapability(mission));
check('built guidance stays frozen after later research',frozenManual.guidance==='assisted'&&near(frozenManual.reliability.factor,ASSEMBLY_DOCK_REL));
check('new automated fitment halves docking failure probability',automated.guidance==='automated'&&near(automated.reliability.factor,1-(1-ASSEMBLY_DOCK_REL)/2));
const assemblyVehicle=computeVehicle(), assemblySim=simulateMission(mission), frozenQuote=launchCommitmentQuote(mission,assemblyVehicle,assemblySim,false,manualBuild);
check('launch quote uses frozen docking guidance and reliability',near(frozenQuote.successProbability,effectiveReliability(mission,assemblyVehicle,assemblySim,!!mission.crew,frozenManual)));

state.research.auto_rendezvous=false; state.research.orbital_assembly=false;
const unfitted=dockingBuildCapability(mission);
state.research.orbital_assembly=true; state.assembleOrbit=true;
const rejected=dockingMissionCapability(mission,unfitted);
check('old unfitted hull cannot gain docking hardware retroactively',rejected.operations.length===0&&rejected.rejections.some(r=>r.reasons.includes('interface-not-found')));
check('incompatible frozen hull gets a plain-language launch rejection',/lacks a required docking interface/.test(dockingRejectionText(rejected)));
state.money=1e6;
const launchGate=canLaunch(computeVehicle(),mission,{ok:true},true,unfitted);
check('launch gate rejects the exact unfitted hull before commitment',launchGate.ok===false&&launchGate.reason==='DOCKING_INCOMPATIBLE');

const forcedDockFailure={key:'docking',label:SUBSYS_LABEL.docking,phase:'docking',severity:'partial'};
check('docking failure vocabulary is phase-addressable',livePhaseOf(forcedDockFailure.key)==='docking'&&FLIGHT_PHASE_ORDER.indexOf('docking')>FLIGHT_PHASE_ORDER.indexOf('deep'));

console.log(`${pass}/${pass+fail} checks passed`);
process.exit(fail?1:0);
