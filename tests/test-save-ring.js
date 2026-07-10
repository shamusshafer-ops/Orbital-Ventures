// ============================================================================
// E0.2 Slice B — IndexedDB autosave ring + import-safety net.
//
// Drives the REAL production functions (pickRingSlot, ringCadenceDue,
// writeRingEntry, the idb* adapter, applyLoadedSave, loadSaveFromText) through
// the adapter's in-memory fallback — the harness has no `indexedDB` global, so
// _idbMemMode is true from boot and every ring op runs against the _idbMem Map
// with the exact same Promise API a real IndexedDB would expose. That's the
// whole testability seam: no IDB-specific scaffolding, yet the shipped code path
// (ring logic, eviction, restore, import-safety net) is what actually runs.
//
// NOTE: what this CANNOT prove headlessly (real IDB persistence across a tab
// close/reopen, real requestIdleCallback scheduling, the rendered restore UI) is
// left to the manual browser checklist in the task report — not asserted here.
// ============================================================================
animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// Confirm we really are exercising the in-memory fallback (no real IndexedDB under Node).
check('setup: adapter is in in-memory fallback mode under Node (no indexedDB global)', _idbMemMode===true);

// ---------- 1. pickRingSlot — pure overwrite-oldest eviction policy ----------
{
  check('pickRingSlot: empty ring → first slot auto:0', pickRingSlot([])==='auto:0');
  check('pickRingSlot: undefined arg → auto:0 (no throw)', pickRingSlot(undefined)==='auto:0');
  check('pickRingSlot: one occupied (auto:0) → next free auto:1', pickRingSlot([{id:'auto:0',ts:5}])==='auto:1');
  check('pickRingSlot: fills the FIRST free slot even out of order (auto:1 taken → auto:0)', pickRingSlot([{id:'auto:1',ts:5}])==='auto:0');
  check('pickRingSlot: two occupied (auto:0,auto:1) → auto:2', pickRingSlot([{id:'auto:0',ts:5},{id:'auto:1',ts:9}])==='auto:2');
  // full ring, distinct timestamps → overwrite the oldest (auto:1 here, ts:10)
  check('pickRingSlot: full ring → overwrites the OLDEST ts', pickRingSlot([{id:'auto:0',ts:30},{id:'auto:1',ts:10},{id:'auto:2',ts:20}])==='auto:1');
  // full ring, all timestamps tied → deterministic lowest slot index (auto:0)
  check('pickRingSlot: full ring with TIED ts → deterministic lowest-index slot auto:0', pickRingSlot([{id:'auto:0',ts:10},{id:'auto:1',ts:10},{id:'auto:2',ts:10}])==='auto:0');
  check('pickRingSlot: full ring, oldest is the last slot → auto:2', pickRingSlot([{id:'auto:0',ts:30},{id:'auto:1',ts:20},{id:'auto:2',ts:5}])==='auto:2');
}

// ---------- 2. ringCadenceDue — pure gate: month-change AND ≥3 real minutes ----------
{
  const MIN=RING_MIN_REAL_MS; // 3 real minutes
  check('cadence: no prior write this session → due', ringCadenceDue(null, 100, 0)===true);
  check('cadence: same in-game month blocks even after a long real gap', ringCadenceDue({absMonth:5,wallMs:0}, 5, 60*MIN)===false);
  check('cadence: month advanced but <3 real minutes → not due', ringCadenceDue({absMonth:5,wallMs:0}, 6, MIN-1)===false);
  check('cadence: month advanced AND exactly 3 real minutes → due', ringCadenceDue({absMonth:5,wallMs:0}, 6, MIN)===true);
  check('cadence: month advanced AND well past 3 minutes → due', ringCadenceDue({absMonth:5,wallMs:0}, 7, 5*MIN)===true);
  check('cadence: month regressed (impossible, but guarded) still requires the real-time gap', ringCadenceDue({absMonth:5,wallMs:0}, 4, MIN-1)===false);
}

async function main(){
  // ---------- 3. A full ring write → correct id / kind / meta / payload shape ----------
  {
    _idbMem.clear();
    newGame('engineer'); animState=null;
    _gameStarted=true; state.money=8.5e6; state.flights=3;
    const rec=await writeRingEntry();
    check('write: returned a record', !!rec);
    check('write: id is the first free slot auto:0', rec && rec.id==='auto:0');
    check('write: kind is "auto"', rec && rec.kind==='auto');
    check('write: meta.company matches live state', rec && rec.meta && rec.meta.company===state.company);
    check('write: meta.year matches live state', rec && rec.meta && rec.meta.year===state.year);
    check('write: meta carries the cheap dashboard fields (money/flights/difficulty/era)', !!(rec && rec.meta && rec.meta.money===state.money && rec.meta.flights===3 && rec.meta.difficulty==='engineer' && typeof rec.meta.era==='string'));
    check('write: payload is a string (the already-stringified {v,ts,state} wrapper)', rec && typeof rec.payload==='string');
    const p=JSON.parse(rec.payload);
    check('write: payload re-parses to the SAVE_VERSION wrapper with a real state', p.v===SAVE_VERSION && !!p.state && p.state.company===state.company);
    // and it actually landed in the store under that id
    const got=await idbGet('auto:0');
    check('write: adapter stored the record under auto:0', !!(got && got.id==='auto:0' && got.payload===rec.payload));
  }

  // ---------- 4. Ring eviction in practice: 4 sequential writes → 3 remain, oldest evicted ----------
  {
    _idbMem.clear();
    newGame('engineer'); animState=null; _gameStarted=true;
    const realNow=Date.now; let clk=1000;
    Date.now=()=>clk;
    try{
      for(let i=0;i<4;i++){ clk=1000+i*1000; state.year=1950+i; await writeRingEntry(); } // years 1950,1951,1952,1953 with ts 1000..4000
    } finally { Date.now=realNow; }
    const all=await idbGetAll();
    check('eviction: exactly 3 entries remain after a 4th write', all.length===3);
    const years=all.map(e=>e.meta.year).sort();
    check('eviction: the OLDEST write (year 1950 / ts 1000) was evicted', years.indexOf(1950)===-1);
    check('eviction: the three most-recent writes survived (1951,1952,1953)', years[0]===1951 && years[1]===1952 && years[2]===1953);
    const slot0=await idbGet('auto:0');
    check('eviction: overwrite-oldest reused slot auto:0 (its ts is now the newest, 4000)', !!(slot0 && slot0.ts===4000 && slot0.meta.year===1953));
    check('eviction: no surviving entry still carries the evicted ts 1000', all.every(e=>e.ts!==1000));
  }

  // ---------- 5. Restore path: a ring entry restored through applyLoadedSave rehydrates state ----------
  {
    _idbMem.clear();
    newGame('engineer'); animState=null; _gameStarted=true;
    state.company='RestoreCo'; state.money=7.77e6; state.year=1968; state.rep=55; state.flights=9;
    await writeRingEntry(); // → auto:0
    // Clobber live state so a real restore has to rebuild it.
    state={ company:'WIPED', year:1, activeFlights:[] };
    const rec=await idbGet('auto:0');
    check('restore: entry read back from the ring', !!(rec && rec.payload));
    applyLoadedSave(JSON.parse(rec.payload)); // the SAME unified load path the restore UI uses
    check('restore: company restored', state.company==='RestoreCo');
    check('restore: money restored', state.money===7.77e6);
    check('restore: year restored', state.year===1968);
    check('restore: reputation restored', state.rep===55);
    check('restore: forward-compat defaults applied on restore (activeFlights seeded)', Array.isArray(state.activeFlights));
  }

  // ---------- 6. Import-safety net: pre-import live state is snapshotted into the ring first ----------
  // The footgun this closes: importing a file "just to look" would, seconds later, be clobbered onto the
  // real save by the next fast autosave. loadSaveFromText must snapshot the LIVE game into the ring BEFORE
  // it applies the incoming payload — and that snapshot must capture the pre-import state, not the imported one.
  {
    _idbMem.clear();
    const realRender=render, realRecap=showRecap;
    render=function(){}; showRecap=function(){}; // isolate from post-load UI side effects
    try{
      newGame('engineer'); animState=null; _gameStarted=true;
      state.company='LiveCo'; state.money=9e6; state.year=1972; state.over=false;
      const importRaw=JSON.stringify({v:SAVE_VERSION, ts:1, state:{ company:'ImportCo', year:1999, money:1e6 }});
      loadSaveFromText(importRaw, 'import test'); // snapshotLiveToRing() fires synchronously inside, before applyLoadedSave
      await new Promise(r=>setTimeout(r,0)); // let the async (idle-less, mem-backed) snapshot idbPut settle
      check('import: the incoming save was applied to live state', state.company==='ImportCo' && state.year===1999);
      const all=await idbGetAll();
      const snap=all.find(e=>{ try{ return JSON.parse(e.payload).state.company==='LiveCo'; }catch(_){ return false; } });
      check('import-safety: a ring snapshot of the PRE-import live game (LiveCo) was written', !!snap);
      check('import-safety: the snapshot captured pre-import metrics, not the imported ones', !!(snap && JSON.parse(snap.payload).state.money===9e6 && JSON.parse(snap.payload).state.year===1972));
      check('import-safety: the snapshot is NOT the imported save', !all.some(e=>{ try{ const s=JSON.parse(e.payload).state; return s.company==='LiveCo' && s.year===1999; }catch(_){ return false; } }));
    } finally { render=realRender; showRecap=realRecap; }
  }

  // ---------- 7. Safety-net guard: a snapshot must NOT be taken when there's no live game to protect ----------
  {
    _idbMem.clear();
    const savedStarted=_gameStarted;
    _gameStarted=false; // e.g. importing from the startup screen before any game is live
    const r=await snapshotLiveToRing();
    _gameStarted=savedStarted;
    const all=await idbGetAll();
    check('guard: snapshotLiveToRing is a no-op when _gameStarted is false (nothing written)', r===null && all.length===0);
  }

  // ---------- 8. Degradation: the adapter never throws and reports slot ids sensibly ----------
  {
    _idbMem.clear();
    const id=await idbPut({id:'auto:0', kind:'auto', name:'x', ts:1, meta:{}, payload:'{}'});
    check('adapter: idbPut resolves with the record id', id==='auto:0');
    await idbDelete('auto:0');
    const gone=await idbGet('auto:0');
    check('adapter: idbDelete removes the record', gone===null);
  }

  try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
  console.log(`\n${pass}/${pass+fail} checks passed`);
  process.exit(fail>0 ? 1 : 0);
}
main();
