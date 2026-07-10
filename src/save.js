/* ---------- save / load ---------- */
const SAVE_KEY='orbital_ventures_save';
const SAVE_VERSION=45; // v45: P11 — one late-game crisis (Kessler debris cascade). state.crisis ({phase,startAbs,severity,peakSeverity,fundedUntilAbs} or null), state.crisisDone ({outcome:'mitigated'|'endured',peakSeverity,months} or null once resolved — a ONE-TIME arc, not recurring), state.leoFlights (cumulative successful LEO-class flights, the trigger's own counter). Eligible from Commercial era (index 4) + leoFlights≥40; a small monthly chance then starts it. Active: LEO-class missions (isLeoClassMission — no profile, reqDv≥9000) fly at up to −12% reliability, scaling with severity; funding a Debris Remediation Program (cost scales with eraStakesFrac(), like the bailout mechanic) brings severity down, letting it go unfunded lets it rise. Resolves 'mitigated' (severity hits 0, bigger legacyScore bonus) or 'endured' (36 months elapse regardless, smaller bonus) — never a hard lockout, just a rising tax. No explicit migrate function needed: all three fields are read through `||`/falsy guards everywhere (state.crisis falsy on a legacy load = inactive; leoFlights||0 = 0), so behavior is unchanged until a save's own play crosses the era+flight-count threshold. v44: P6 6.1 era-transition interstitial — state.eraSeen (index of the last era acknowledged via the full-screen card) + state.eraStartSnapshot ({flights,playerFirsts,rivalFirsts,money,rep} baseline captured when that era began, diffed for the retrospective). Both persisted. Trigger is DERIVED (eraIndex(currentEra())>state.eraSeen), gated behind the setback>mishap>inquiry>rival-disaster _pending chain (era is lowest priority; deferred to a later settle-point if any decision is pending, never lost since the condition is stateful). eraSeen advances only on Continue; balance-neutral (pure notification). Lazy migration: pre-v44 saves lack both — migrateEraSeen() backfills eraSeen to the save's CURRENT era index (from its own year, NOT 0, so a late-game load fires ZERO stale interstitials) and seeds eraStartSnapshot from current metrics; newGame seeds eraSeen:0 + a Pioneer baseline. v43: P3 failure investigation loop — state.inquiryCredit ({subsystem,rel,flights} or null): a funded uncrewed-loss inquiry into an ascent/staging subsystem grants a +2% additive-R credit (like familyRelBonus) gated to that subsystem, consumed over 3 flights at launch; a deep-phase failure grants a flat +10⚛ science instead (no persisted credit). Transient _pendingInquiry (fund/decline modal, precedence setback>mishap>inquiry) is NOT persisted. Lazy migration: pre-v43 saves lack inquiryCredit — loadDefaults() seeds it null on both load paths (undefined is already falsy, so behavior is unchanged either way). v42: P2 slice 2.4 — per-facility auto-resupply toggle (fs.autoResupply boolean; opt-in per facility). On the monthly tick a facility with the toggle ON auto-fires resupplyFacility() once supply falls to/below AUTO_RESUPPLY_THRESHOLD(6) and canResupply().ok — same cost/gate/lifecycle as a manual order (the resupplyInTransit + money gates prevent double-ordering and unaffordable fires). Pure automation, balance-neutral otherwise; each auto-order logs a 'note' line. Lazy migration: pre-v42 facilities carry no autoResupply — migrateFacilityAutoResupply() defaults it false on load (undefined is already falsy, so behavior is unchanged either way); foundFacility seeds autoResupply:false on fresh bases. v41: P1 persistent in-flight missions — state.activeFlights[] (deferred interplanetary flights carry a resolved-at-launch ctx applied on arrival; ctx stores famId + crewId, not object refs, so a mid-cruise save round-trips; legacy saves default [] via loadDefaults; rehydrateFlights() re-links ctx.m + restores _flightSeq on load). v40: #19 slice B — career progression (staff.xp accrues monthly ×morale ×dept-training, raising effSkill above hire-day base up to +0.15; dept.training level bought with capital; legacy staff default xp 0 via staffXp guard, effSkill==base at xp 0 so no balance migration). #19 slice C (succession + workforce planning) adds no persisted state — reconcileDeptLeads mutates existing dept.lead, gaps + the era-scaled unstaffed-department reliability penalty (0 in Pioneer) are derived — so it needs no bump. v39: #19 slice A — organizational departments (state.departments {deptId:{lead,training}}; legacy saves default via loadDefaults/defaultDepartments; membership is derived from hired staff, leads are balance-neutral when unset); v38: #6 research partnerships — bench-tested / flight-proven components (state.engineStockTested + state.partStockTested, the bench-tested subset of each yard; legacy saves default {}); a fitted bench-tested component adds +1.5% reliability (cap +6%, benchRelBonus), built at +60% cost / +50% time; v36: #7 sub-assemblies slice 2 — structures & habitats yard (state.partStock {"kind:sub":count}, e.g. "tank:steel"/"hab:closed"; legacy saves default {}); same cost-neutral cadence pattern as the Engine Yard; v35: #7 sub-assemblies — Engine Yard (state.engineStock {engId:count}; legacy saves default {}); v34: Time Granularity slice 4b — launch windows day-scheduled (window/committedWindow .abs moved from absMonth to absDay; migrateWindowsToDays ×30 on pre-v34 load + clears the regenerable windows cache); v33: Time Granularity slice 1 — day-iterating advance() funnel (state.day 0..29 + absDay(); legacy saves default day:0 via load defaults; whole-month advances stay bit-identical so no balance migration needed); v32: CE4(c) era-scaled failure stakes + bailout retune (state.loanInterest — permanent bridge-loan debt service; legacy saves default to 0 via load defaults + loanInterest() guard); v31: CE4(b) standing resupply obligations (per-facility supply/starvedMonths; legacy facilities default to fully provisioned via facilitySupply()); v30: CE3(c) lunar architecture fork (state.lunarArch, null=uncommitted; luna_landing reqResearch moved to per-arch gates); v29: CE3(a) company doctrine (state.doctrine, null=undeclared/neutral); v28: CE2(c) juggernaut capstone (state.standingProd/juggernautReached); v27: CE2(b) launch cadence (state.padMonthAbs/padMonthUsed) — load defaults seed all of these; v26: CE1 rival agents (state.rivalState), seedRivalState migrates old rivalFired
function writeSave(){ localStorage.setItem(SAVE_KEY, JSON.stringify({v:SAVE_VERSION, ts:Date.now(), state:JSON.parse(JSON.stringify(state))})); }
// S1: silent throttled autosave so "Continue last game" always resumes the most recent session.
// Skips a transient mid-flight-resolution snapshot; forced on page close.
let _lastAutosaveT=0, _gameStarted=false; const AUTOSAVE_MIN_MS=4000;
function autosave(force){
  try{
    if(!_gameStarted) return; // S2: never autosave the boot placeholder before the player picks Continue/Open/New (would clobber the real save)
    if(!state||!state.company||state.over) return;
    if(_flightResolving && !force) return;
    const now=Date.now();
    if(!force && now-_lastAutosaveT<AUTOSAVE_MIN_MS) return;
    _lastAutosaveT=now; writeSave();
  }catch(e){}
}
try{ window.addEventListener('beforeunload', ()=>autosave(true)); }catch(e){}
// S1: on load, re-link in-flight records to canonical mission defs, restore the flight-id counter, and
// drop any corrupt/incomplete in-flight record so an arrival can't crash.
function rehydrateFlights(){
  if(!Array.isArray(state.activeFlights)){ state.activeFlights=[]; return; }
  let maxSeq=0;
  state.activeFlights=state.activeFlights.filter(rec=>{
    if(!rec||!rec.deferred) return false;
    if(rec.kind==='logistics'){ if(!facilityById(rec.facId)) return false; } // 2.1: keep resupply shipments; drop ones whose facility no longer exists
    else if(!rec.ctx) return false; // a crewed/uncrewed mission must carry its resolved ctx
    else if(rec.ctx.m && rec.ctx.m.id){ const cm=MISSIONS.find(x=>x.id===rec.ctx.m.id); if(cm) rec.ctx.m=cm; }
    const n=parseInt(String(rec.id||'').replace(/\D/g,''),10); if(!isNaN(n)&&n>maxSeq) maxSeq=n;
    return true;
  });
  if(_flightSeq<maxSeq) _flightSeq=maxSeq;
}
function saveGame(){
  try{
    _gameStarted=true;
    writeSave();
    log('info','Game saved.');
    render();
    showModal(`<h2>Game Saved</h2><p class="muted">${dateStr()} — ${state.company}</p>
      <p class="dim" style="font-size:12px">Saved to browser local storage. Clearing browser data will erase it.</p>
      <button class="btn" onclick="hideModal()" style="margin-top:8px">OK</button>`);
  }catch(e){
    showModal(`<h2>Save Failed</h2><p class="muted">${e.message}</p>
      <button class="btn" onclick="hideModal()" style="margin-top:8px">OK</button>`);
  }
}
// Time Granularity 4b: launch windows moved from absMonth to absDay. Pre-v34 saves stored
// window/committedWindow .abs in months — scale to days, and drop the (regenerable) windows cache.
function migrateWindowsToDays(saved, ver){
  if((ver||0) >= 34) return;
  if(saved.committedWindow && saved.committedWindow.abs!=null) saved.committedWindow.abs*=DAYS_PER_MONTH;
  saved.windows={};
}
// 2.4 (v42): lazy per-facility field default. loadDefaults only seeds top-level state keys, so a
// pre-v42 facility carries no autoResupply — default it OFF (undefined is already falsy, this just
// makes it an explicit boolean so the toggle/UI reads cleanly). Idempotent; no-op on newer saves.
function migrateFacilityAutoResupply(saved){ const f=saved.facilities; if(!f) return; for(const id in f){ if(f[id] && f[id].autoResupply===undefined) f[id].autoResupply=false; } }
// P6 6.1 (v44): era-transition interstitial. Pre-v44 saves lack eraSeen/eraStartSnapshot. CRITICAL:
// backfill eraSeen to the save's CURRENT era index (from its own year), NOT 0 — otherwise loading a
// late-game save fires a backlog of stale interstitials for eras already lived through. Seed the
// snapshot from the save's current metrics as this era's baseline (historical values are unrecoverable).
function migrateEraSeen(saved){
  if(saved.eraSeen===undefined) saved.eraSeen=eraIndexForYear(saved.year);
  if(saved.eraStartSnapshot===undefined) saved.eraStartSnapshot={
    flights: saved.flights||0,
    playerFirsts: Object.keys(saved.completed||{}).length,
    rivalFirsts: Object.keys(saved.scooped||{}).length,
    money: saved.money||0,
    rep: saved.rep||0
  };
}
// forward-compat load defaults: applied to any save missing newer fields (shared by loadGame + autoLoad)
function loadDefaults(){ return {
      research:{}, unlocked:{a4:true}, completed:{}, stages:[{eng:'a4',count:1,prop:2.0}],
      boosters:{eng:null,count:0,prop:0},
      transfer:{eng:'hyper_storable',prop:10.0}, descent:{eng:'hyper_storable',prop:6.0},
      ascent:{eng:'hyper_storable',prop:2.5}, eclss:'open', testLevel:0,
      windows:{}, committedWindow:null, selectedBody:'moon', mapZoom:null,
      depot:0, depotUse:0, tab:'command', log:[], rivalFired:{}, scooped:{}, rivalThreat:{}, rivalState:{}, bailouts:0,
      difficulty:'engineer', customDifficulty:customDefaults(),
      econEvents:[], eventCooldown:6, pgmRoyalty:0, publicSupport:SUPPORT_BASE,
      passiveContracts:[], contractCooldown:{}, contractSignings:{}, engineHeritage:{},
      production:{bays:1,foundry:1,pads:1,qa:1}, lastMonth:{revenue:0,expenses:0,net:0,flights:0}, history:{},
      ambition:'flag', programsAwarded:{}, ambitionFulfilled:false,
      facilities:{}, fuelPrice:FUEL_BASE, fuelPrevPrice:FUEL_BASE, fuelBuyer:null,
      architectures:{}, science:0, persEventCooldown:5,
      staff:[], assignedAstronaut:null, departments:defaultDepartments(),
      vehicles:[], activeVehicle:null, assembleOrbit:false, recovery:false, rehearsal:false, techLevel:{}, divisions:{}, partnerships:[], breakthroughCooldown:3, relDebt:0, powerSource:'solar',
      recentBuilds:[], materials:defaultMaterialsState(),
      buildQueue:[], hangar:[], orderSeq:0, padMonthAbs:-1, padMonthUsed:0, standingProd:null, juggernautReached:false, doctrine:null, lunarArch:null, uiLayer:'advanced', loanInterest:0, metricHist:defaultMetricHist(), livery:defaultLivery(), parts:defaultParts(), blueprints:[], frontPages:[], crisis:null, crisisDone:null, leoFlights:0, deepFlights:0, crisisHistory:[], researchNext:null, day:0, engineStock:{}, engineStockTested:{}, partStock:{}, partStockTested:{}, activeFlights:[], inquiryCredit:null
}; }

/* ---------- Session bookend: "where you left off" ----------
   On load, 30 seconds of re-orientation: date/treasury, the top of the Outliner (what's
   about to land), and the advisor's current recommendation — so the player is back in the
   loop instead of re-reading five tabs. */
function showRecap(){
  const items=outlinerItems().slice(0,3);
  const rows=items.length?items.map(it=>`<div style="display:flex;align-items:center;gap:8px;padding:2px 0;font-size:12px">
      <span style="width:16px;text-align:center">${it.icon}</span>
      <span style="flex:1;color:${it.color||'var(--muted)'}">${it.label}</span>
      <b style="font-family:var(--mono);font-size:11px;color:var(--readout)">${outlinerEtaText(it.etaDays)}</b>
    </div>`).join('') : '<div class="dim" style="font-size:12px">Nothing on the clock yet.</div>';
  let recHtml='';
  try{ const rec=recommendedAction(); if(rec&&rec.title) recHtml=`<div style="margin-top:10px;padding:8px 10px;background:var(--panel2);border-radius:6px;border-left:2px solid var(--ignite)">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:2px">Advisor</div>
      <div style="font-size:13px;color:var(--ink)">▸ ${rec.title}</div>
      ${rec.detail?`<div class="dim" style="font-size:12px;margin-top:2px">${rec.detail}</div>`:''}</div>`; }catch(e){}
  const grade=(()=>{ try{ return legacyScore().grade; }catch(e){ return null; } })();
  showModal(`<div>
    <h2 style="margin-bottom:2px">Where you left off</h2>
    <p class="muted" style="font-size:12px;margin:0 0 10px">${dateStr()} · ${state.company}${grade?` · legacy ${grade}`:''}</p>
    <div class="metrics" style="margin-bottom:10px">
      <div class="metric"><div class="k">Treasury</div><div class="v">${fM(state.money)}</div></div>
      <div class="metric"><div class="k">Reputation</div><div class="v">${Math.round(state.rep)}</div></div>
      <div class="metric"><div class="k">Flights</div><div class="v">${state.flights}</div></div>
    </div>
    <div class="cc-panel-h" style="margin:0 0 4px">◈ About to land</div>
    ${rows}
    ${recHtml}
    <button class="btn launch" style="width:100%;margin-top:12px" onclick="hideModal()">Back to it ▸</button>
  </div>`, true);
}

function loadSaveFromText(raw, srcLabel){
  try{
    const payload=JSON.parse(raw);
    const saved=payload.state||payload;
    if(!saved.year||!saved.company){ throw new Error('Not a valid Orbital Ventures save (missing company/year).'); }
    migrateWindowsToDays(saved, payload.v); // 4b: month→day window abs
    migrateFacilityAutoResupply(saved); // 2.4 (v42): default per-facility autoResupply OFF on pre-v42 saves
    migrateEraSeen(saved); // P6 6.1 (v44): backfill eraSeen to the save's CURRENT era + seed era baseline snapshot
    const defaults=loadDefaults();
    for(const k in defaults){ if(saved[k]===undefined) saved[k]=defaults[k]; }
    state=saved;
    reconcileResearch(); // close any prerequisite gaps opened by tech-tree changes
    rehydrateFlights(); // S1: re-link in-flight records after load
    _gameStarted=true;
    log('info', srcLabel||'Game loaded.');
    render();
    showRecap(); // session bookend: where you left off
  }catch(e){
    showModal(`<h2>Load Failed</h2><p class="muted">${e.message}</p>
      <button class="btn" onclick="hideModal()" style="margin-top:8px">OK</button>`);
  }
}
function loadGame(){
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw){ showModal(`<h2>No Save Found</h2><p class="muted">No saved game in this browser.</p>
    <button class="btn" onclick="hideModal()" style="margin-top:8px">OK</button>`); return; }
  loadSaveFromText(raw, 'Game loaded.');
}
// S2: startup screen — the game ALWAYS asks on launch (Continue last game / Open a save file / New game).
function savedGameMeta(){
  try{ const raw=localStorage.getItem(SAVE_KEY); if(!raw) return null; const p=JSON.parse(raw); const s=p.state||p;
    if(!s.year||!s.company) return null; return {company:s.company, ts:p.ts||0, year:s.year}; }catch(e){ return null; }
}
function showStartup(){
  const meta=savedGameMeta();
  const when=meta&&meta.ts?new Date(meta.ts).toLocaleString():'';
  const cont = meta ? `<button class="btn launch" style="width:100%;margin-bottom:8px" onclick="startupContinue()">▸ Continue last game<br><span class="dim" style="font-size:11px">${meta.company} · year ${meta.year}${when?` · saved ${when}`:''}</span></button>` : '';
  showModal(`<div style="text-align:center">
    <h2 style="margin-bottom:2px">Orbital Ventures</h2>
    <p class="muted" style="font-size:12px;margin:0 0 14px">Found a space agency and reach the planets before your rivals.</p>
    ${cont}
    <button class="btn ghost" style="width:100%;margin-bottom:8px" onclick="importSave()">📂 Open a save file…</button>
    <button class="btn ghost" style="width:100%" onclick="startupNew()">✦ New game</button>
    ${meta?'':'<p class="dim" style="font-size:11px;margin-top:12px">No saved game found in this browser yet.</p>'}
  </div>`);
}
function startupContinue(){ if(autoLoad()){ _gameStarted=true; hideModal(); render(); showRecap(); } else { showStartup(); } }
function startupNew(){
  showModal(`<h2>New Game</h2>
    <p class="muted" style="font-size:12px">Start a fresh company from 1942. Choose a difficulty (changeable later in Settings):</p>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn ghost" onclick="startupBegin('napkin')" style="flex:1">Napkin<br><span class="dim" style="font-size:11px">forgiving · ${fM(DIFFICULTY.napkin.startMoney)} start</span></button>
      <button class="btn" onclick="startupBegin('engineer')" style="flex:1">Engineer<br><span class="dim" style="font-size:11px">realistic · ${fM(DIFFICULTY.engineer.startMoney)} start</span></button>
      <button class="btn ghost" onclick="startupBegin('custom')" style="flex:1">Custom<br><span class="dim" style="font-size:11px">your rules · tune in Settings</span></button>
    </div>
    <button class="btn ghost" onclick="showStartup()" style="width:100%;margin-top:10px">← Back</button>`);
}
function startupBegin(diff){ hideModal(); newGame(diff); _gameStarted=true; render(); showInfrastructureModal(); }
function exportSave(){
  try{
    const payload=JSON.stringify({v:SAVE_VERSION, ts:Date.now(), state:JSON.parse(JSON.stringify(state))});
    const blob=new Blob([payload], {type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const stamp=(state.company||'orbital').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    a.href=url; a.download=`orbital-ventures-${stamp}-y${state.year||''}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
    log('info','Save exported to a file.');
  }catch(e){ showModal(`<h2>Export Failed</h2><p class="muted">${e.message}</p><button class="btn" onclick="hideModal()" style="margin-top:8px">OK</button>`); }
}
function importSave(){
  try{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json,.json';
    inp.onchange=()=>{ const file=inp.files&&inp.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=()=>loadSaveFromText(String(reader.result), 'Save loaded from file.');
      reader.onerror=()=>showModal('<h2>Import Failed</h2><p class="muted">Could not read that file.</p><button class="btn" onclick="hideModal()" style="margin-top:8px">OK</button>');
      reader.readAsText(file);
    };
    inp.click();
  }catch(e){ showModal(`<h2>Import Failed</h2><p class="muted">${e.message}</p><button class="btn" onclick="hideModal()" style="margin-top:8px">OK</button>`); }
}
function confirmNew(){
  const hasSave=!!localStorage.getItem(SAVE_KEY);
  const cur=(state&&state.difficulty)||'engineer';
  showModal(`<h2>New Game</h2>
    <p class="muted">Start a fresh company from 1942. Current progress will be lost unless you save first.</p>
    ${hasSave?'<p class="dim" style="font-size:12px">A saved game exists in this browser and will not be overwritten.</p>':''}
    <p class="dim" style="font-size:12px;margin-top:10px">Choose a difficulty (changeable later in Settings):</p>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn ${cur==='napkin'?'':'ghost'}" onclick="restart('napkin')" style="flex:1">Napkin<br><span class="dim" style="font-size:11px">forgiving · ${fM(DIFFICULTY.napkin.startMoney)} start</span></button>
      <button class="btn ${cur==='engineer'?'':'ghost'}" onclick="restart('engineer')" style="flex:1">Engineer<br><span class="dim" style="font-size:11px">realistic · ${fM(DIFFICULTY.engineer.startMoney)} start</span></button>
      <button class="btn ${cur==='custom'?'':'ghost'}" onclick="restart('custom')" style="flex:1">Custom<br><span class="dim" style="font-size:11px">your rules · tune in Settings</span></button>
    </div>
    <button class="btn ghost" onclick="hideModal()" style="width:100%;margin-top:8px">Cancel</button>`);
}
function autoLoad(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const payload=JSON.parse(raw);
    const saved=payload.state||payload;
    if(!saved.year||!saved.company) return false;
    migrateWindowsToDays(saved, payload.v); // 4b: month→day window abs
    migrateFacilityAutoResupply(saved); // 2.4 (v42): default per-facility autoResupply OFF on pre-v42 saves
    migrateEraSeen(saved); // P6 6.1 (v44): backfill eraSeen to the save's CURRENT era + seed era baseline snapshot
    const defaults=loadDefaults();
    for(const k in defaults){ if(saved[k]===undefined) saved[k]=defaults[k]; }
    state=saved;
    reconcileResearch(); // close any prerequisite gaps opened by tech-tree changes
    rehydrateFlights(); // S1: re-link in-flight records after load
    return true;
  }catch(e){ return false; }
}

