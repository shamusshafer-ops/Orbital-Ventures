// Gate 1A — public truth, premise, mission, and vocabulary authority.
let g1TruthPass=0, g1TruthFail=0;
function g1TruthCheck(name,cond){ if(cond) g1TruthPass++; else { g1TruthFail++; console.log('FAIL:',name); } }

const g1TruthFs=require('fs');
const g1TruthShell=g1TruthFs.readFileSync('src/shell.html','utf8');
const g1TruthSave=g1TruthFs.readFileSync('src/save.js','utf8');
const g1TruthData=g1TruthFs.readFileSync('src/data.js','utf8');

g1TruthCheck('truth taxonomy names five distinct claim kinds',
  ['history','fiction','schematic','simulation','speculative'].every(k=>TRUTH_KINDS[k]&&TRUTH_KINDS[k].badge));
g1TruthCheck('premise explicitly says public-private alternate history',
  /public-private/i.test(GAME_TRUTH.premise.text)&&/alternate history/i.test(GAME_TRUTH.premise.text)&&GAME_TRUTH.premise.kind==='fiction');
g1TruthCheck('simulation contract distinguishes modeled decision inputs from sourced measurements',
  GAME_TRUTH.physics.kind==='simulation'&&/abstraction/i.test(GAME_TRUTH.physics.text));
g1TruthCheck('map contract explicitly declares non-literal scale and timing',
  GAME_TRUTH.maps.kind==='schematic'&&/schematic/i.test(GAME_TRUTH.maps.text));
g1TruthCheck('money, mass, velocity, duration, and reliability units have one authority',
  ['money','mass','velocity','duration','reliability'].every(k=>GAME_TRUTH.units[k])&&
  DAYS_PER_MONTH===GAME_TRUTH.calendar.daysPerMonth&&fM(1.25)===`${GAME_TRUTH.currency.symbol}1.25${GAME_TRUTH.currency.suffix}`&&
  /no inflation model/.test(truthModelNote()));
g1TruthCheck('source registry uses stable NASA/NASA ADS records',
  CONTENT_SOURCES.voyager_heliopause.url.includes('science.nasa.gov')&&
  CONTENT_SOURCES.oort_cloud.url.includes('science.nasa.gov')&&
  CONTENT_SOURCES.daedalus_study.url.includes('ui.adsabs.harvard.edu'));
g1TruthCheck('truth badges render semantic, visibly distinct labels',
  truthBadge('history').includes('HISTORY')&&truthBadge('fiction').includes('ALT-HISTORY')&&truthBadge('schematic').includes('SCHEMATIC'));

const g1TruthMission=MISSIONS.find(m=>m.id==='oort_precursor');
g1TruthCheck('internal mission id is retained while public name is Interstellar Precursor',
  g1TruthMission&&g1TruthMission.name==='Interstellar Precursor');
g1TruthCheck('public objective is a heliopause crossing, not an Oort Cloud transit',
  /pass the heliopause/i.test(g1TruthMission.blurb)&&/not a flight.*through the distant Oort Cloud/i.test(g1TruthMission.blurb));
g1TruthCheck('interstellar mission is labeled speculative and cites Voyager plus Daedalus',
  g1TruthMission.truth==='speculative'&&g1TruthMission.sources.includes('voyager_heliopause')&&g1TruthMission.sources.includes('daedalus_study'));
g1TruthCheck('interstellar mission owns an explicit heliopause boundary rather than a body destination',
  g1TruthMission.destination&&g1TruthMission.destination.id==='heliopause'&&g1TruthMission.destination.kind==='boundary');
const g1TruthDestination=missionDestination(g1TruthMission);
g1TruthCheck('non-body destination authority drives the heliopause label and deep-space environment',
  g1TruthDestination.name==='Heliopause / Interstellar Boundary'&&g1TruthDestination.bodyId===null&&
  g1TruthDestination.environment.solarFlux===0&&g1TruthDestination.environment.radiation===4&&
  flightReport(g1TruthMission,computeVehicle(),null,null).target===g1TruthDestination.name&&
  destSolarFlux(g1TruthMission)===0&&radEnvironment(g1TruthMission)===4);
const g1TruthLegacyProfile={id:'legacy_profile',name:'Legacy Profile',profile:[{name:'Test injection',dv:1,by:'transfer'}]};
const g1TruthLegacyDestination=missionDestination(g1TruthLegacyProfile);
g1TruthCheck('unmapped profile missions retain legacy deep-space radiation with the Earth-orbit label and solar fallback',
  g1TruthLegacyDestination.id==='earth_orbit'&&g1TruthLegacyDestination.name==='Earth orbit'&&
  destSolarFlux(g1TruthLegacyProfile)===1&&radEnvironment(g1TruthLegacyProfile)===3);
state.activeMission='oort_precursor'; state.powerSource='solar'; renderPower();
const g1TruthPowerHTML=$('powerCard').innerHTML, g1TruthPowerGate=powerViable(curMission());
g1TruthCheck('heliopause Power card rejects solar and names its zero-sunlight boundary',
  !g1TruthPowerGate.ok&&g1TruthPowerGate.why.includes('Heliopause / Interstellar Boundary')&&
  g1TruthPowerHTML.includes('0% sunlight at Heliopause / Interstellar Boundary')&&
  g1TruthPowerHTML.includes('Power not viable'));
g1TruthCheck('legacy public mission name is absent from authored data', !/Oort Cloud Precursor/.test(g1TruthData));
const g1TruthOort=BODIES.find(b=>b.id==='oort');
g1TruthCheck('Oort Cloud remains a sourced schematic reference with no operational mission',
  g1TruthOort&&g1TruthOort.truth==='schematic'&&g1TruthOort.sources.includes('oort_cloud')&&
  !(g1TruthOort.missions||[]).length&&/2,000–100,000 AU/.test(g1TruthOort.note));
newGame('engineer'); state.selectedBody='oort';
const g1TruthOortCard=bodyCardHTML();
g1TruthCheck('mission lookup, planning, completion, and body UI never route the precursor to Oort',
  missionBody('oort_precursor')===null&&bodyMissions('oort').length===0&&bodyFirsts('oort').length===0&&
  !/Fly this/.test(g1TruthOortCard)&&/No missions to this body yet/.test(g1TruthOortCard));
g1TruthCheck('Daedalus program language stops at a heliopause precursor',
  /heliopause/i.test(PROGRAMS.find(p=>p.id==='daedalus').blurb));

const g1TruthCallouts=[...g1TruthData.matchAll(/<span class="hist([^"]*)"([^>]*)>/g)];
const g1TruthKinds=new Set(Object.keys(TRUTH_KINDS));
g1TruthCheck('every inherited unclassified callout is explicitly neutral CONTEXT, never implicit HISTORY',
  g1TruthCallouts.length>100&&g1TruthCallouts.filter(m=>!m[1].trim()).every(m=>
    g1TruthData.slice(m.index+m[0].length,m.index+m[0].length+70).startsWith('<span class="context-label">CONTEXT</span>'))&&
  !/\.hist::before\{content:"HISTORY"/.test(g1TruthShell));
g1TruthCheck('every classified callout has a valid explicit kind and real in-DOM badge',
  g1TruthCallouts.filter(m=>m[1].trim()).every(m=>{
    const found=(m[1].match(/truth-([a-z]+)/)||[])[1];
    const after=g1TruthData.slice(m.index+m[0].length,m.index+m[0].length+100);
    return g1TruthKinds.has(found)&&after.startsWith(`<span class="truth-badge truth-${found}">${TRUTH_KINDS[found].badge}</span>`);
  }));
g1TruthCheck('every HISTORY callout resolves compatible source ids',
  g1TruthCallouts.filter(m=>/truth-history/.test(m[1])).length===2&&
  g1TruthCallouts.filter(m=>/truth-history/.test(m[1])).every(m=>{
    const ids=((m[2].match(/data-sources="([^"]+)"/)||[])[1]||'').split(/\s+/).filter(Boolean);
    return ids.length>0&&ids.every(id=>CONTENT_SOURCES[id]&&CONTENT_SOURCES[id].kind==='history');
  }));
const g1TruthFusion=ENGINES.fusion_torch;
state.unlocked.fusion_torch=true;
const g1TruthFusionOption=moduleOptions('fusion_torch',true);
const g1TruthFusionModifier=techModifierText(RESEARCH.find(r=>r.id==='fusion_propulsion_research'));
g1TruthCheck('fusion engine is an explicitly sourced concept with modeled specifications',
  g1TruthFusion.truth==='speculative'&&g1TruthFusion.modeledSpec&&g1TruthFusion.sources.includes('daedalus_study')&&
  g1TruthFusionOption.includes('[CONCEPT · MODELED]')&&
  g1TruthFusionModifier.some(line=>line.includes('Modeled game specification')));
if(g1TruthFail&&(!g1TruthFusionOption.includes('[CONCEPT · MODELED]')||!g1TruthFusionModifier.some(line=>line.includes('Modeled game specification')))){
  console.log('fusion truth render detail:',JSON.stringify({option:g1TruthFusionOption,modifier:g1TruthFusionModifier}));
}
g1TruthCheck('Solar System surface carries an explicit SCHEMATIC badge',
  /truth-schematic">SCHEMATIC/.test(g1TruthShell)&&/not to scale/.test(g1TruthShell));
g1TruthCheck('startup and new-game surfaces carry the alternate-history label',
  /truthBadge\('fiction'\)/.test(g1TruthSave)&&/government-enabled public-private/.test(g1TruthSave)&&/truthModelNote\(\)/.test(g1TruthSave));
g1TruthCheck('player-facing masthead uses Orbital Wire, not Agency Wire',
  /The Orbital Wire/.test(g1TruthFs.readFileSync('src/render.js','utf8'))&&!/The Agency Wire/.test(g1TruthShell));

console.log(`${g1TruthPass}/${g1TruthPass+g1TruthFail} checks passed`);
process.exitCode=g1TruthFail?1:0;
