// ============================================================================
// E0.2 Slice C — 5 manual save slots (slot:1..slot:5).
//
// Drives the REAL production functions (writeSlotEntry, slotLoad, slotDelete,
// slotExport, plus the shared writeRingEntry / applyLoadedSave / loadSaveFromText
// paths) through Slice B's in-memory adapter fallback — the harness has no
// `indexedDB` global, so _idbMemMode is true from boot and every slot op runs
// against the _idbMem Map with the same Promise API a real IndexedDB exposes.
// Slots and the autosave ring share ONE object store, distinguished only by
// kind:'slot' vs kind:'auto', so several checks below assert that distinction.
//
// NOTE: what this CANNOT prove headlessly (real IDB persistence across a tab
// close/reopen, the rendered slot-picker modal at either entry point, the
// overwrite/delete confirmation UX, a real downloaded export file) is left to
// the manual browser checklist in the task report — not asserted here.
// ============================================================================
animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// Confirm we really are exercising the in-memory fallback (no real IndexedDB under Node).
check('setup: adapter is in in-memory fallback mode under Node (no indexedDB global)', _idbMemMode===true);
check('setup: SLOT_IDS is exactly slot:1..slot:5', SLOT_IDS.length===5 && SLOT_IDS.join(',')==='slot:1,slot:2,slot:3,slot:4,slot:5');
check('setup: slotNum strips the prefix', slotNum('slot:4')==='4');

async function main(){
  // ---------- 1. writeSlotEntry → correct id / kind / meta / payload shape for EACH of the 5 slots ----------
  {
    _idbMem.clear();
    newGame('engineer'); animState=null; _gameStarted=true;
    state.money=6.25e6; state.flights=7;
    for(let i=0;i<SLOT_IDS.length;i++){
      const id=SLOT_IDS[i];
      const rec=await writeSlotEntry(id);
      check(`write ${id}: returned a record`, !!rec);
      check(`write ${id}: id matches the requested slot id`, rec && rec.id===id);
      check(`write ${id}: kind is "slot" (not "auto")`, rec && rec.kind==='slot');
      check(`write ${id}: meta carries company/year/money/flights/difficulty/era`, !!(rec && rec.meta && rec.meta.company===state.company && rec.meta.year===state.year && rec.meta.money===state.money && rec.meta.flights===7 && rec.meta.difficulty==='engineer' && typeof rec.meta.era==='string'));
      check(`write ${id}: payload is a string`, rec && typeof rec.payload==='string');
      const p=JSON.parse(rec.payload);
      check(`write ${id}: payload re-parses to the SAVE_VERSION {v,ts,state} wrapper`, p.v===SAVE_VERSION && !!p.state && p.state.company===state.company);
      const got=await idbGet(id);
      check(`write ${id}: adapter stored the record under that id`, !!(got && got.id===id && got.payload===rec.payload));
    }
    const all=await idbGetAll();
    check('write: exactly 5 slot entries exist after writing all 5', all.filter(e=>e.kind==='slot').length===5);
  }

  // ---------- 2. Overwrite: writing an occupied slot REPLACES its content (no append/corrupt) ----------
  {
    _idbMem.clear();
    newGame('engineer'); animState=null; _gameStarted=true;
    state.company='FirstCo'; state.year=1955; state.money=1e6;
    await writeSlotEntry('slot:2');
    state.company='SecondCo'; state.year=1988; state.money=4e6;
    await writeSlotEntry('slot:2'); // same id → overwrite
    const all=await idbGetAll();
    check('overwrite: still exactly ONE entry under slot:2 (replaced, not appended)', all.filter(e=>e.id==='slot:2').length===1);
    const got=await idbGet('slot:2');
    check('overwrite: slot:2 now holds the SECOND save', !!(got && got.meta.company==='SecondCo' && got.meta.year===1988));
    check('overwrite: the first save is gone from slot:2', JSON.parse(got.payload).state.company==='SecondCo');
  }

  // ---------- 3. Load-from-slot round-trips through applyLoadedSave: state fields match what was saved ----------
  {
    _idbMem.clear();
    newGame('engineer'); animState=null; _gameStarted=true;
    state.company='RoundTripCo'; state.money=8.88e6; state.year=1969; state.rep=61; state.flights=12;
    await writeSlotEntry('slot:5');
    // Clobber live state so a real load has to rebuild it.
    state={ company:'WIPED', year:1, activeFlights:[] };
    const rec=await idbGet('slot:5');
    check('load: slot read back from the store', !!(rec && rec.payload));
    applyLoadedSave(JSON.parse(rec.payload)); // the SAME unified transform slotLoad → loadSaveFromText uses
    check('load: company round-tripped', state.company==='RoundTripCo');
    check('load: money round-tripped', state.money===8.88e6);
    check('load: year round-tripped', state.year===1969);
    check('load: reputation round-tripped', state.rep===61);
    check('load: forward-compat defaults applied on load (activeFlights seeded)', Array.isArray(state.activeFlights));
  }

  // ---------- 4. Pre-load ring snapshot: slotLoad snapshots the PREVIOUS live state into the ring first ----------
  // Mirrors Slice B's import-safety-net test: before a slot-load overwrites live state, the current game
  // must be snapshotted into the autosave ring (kind:'auto') — and that snapshot must capture the OLD
  // company's data, not the slot's. Same footgun-prevention as a file import / ring restore.
  {
    _idbMem.clear();
    const realRender=render, realRecap=showRecap;
    render=function(){}; showRecap=function(){}; // isolate from post-load UI side effects
    try{
      newGame('engineer'); animState=null; _gameStarted=true;
      // Stash a DIFFERENT game into slot:1…
      state.company='SlotCo'; state.year=1980; state.money=5e6; state.over=false;
      await writeSlotEntry('slot:1');
      // …then make the LIVE game something else, and load slot:1 over it.
      state.company='LiveCo'; state.year=1972; state.money=9e6; state.over=false;
      await slotLoad('slot:1');
      await new Promise(r=>setTimeout(r,0)); // let the async snapshot idbPut settle
      check('load: the slot save was applied to live state', state.company==='SlotCo' && state.year===1980);
      const all=await idbGetAll();
      const snap=all.find(e=>e.kind==='auto' && (()=>{ try{ return JSON.parse(e.payload).state.company==='LiveCo'; }catch(_){ return false; } })());
      check('pre-load snapshot: a ring (kind:auto) snapshot of the PRE-load live game (LiveCo) was written', !!snap);
      check('pre-load snapshot: it captured the OLD company\'s metrics, not the slot\'s', !!(snap && JSON.parse(snap.payload).state.money===9e6 && JSON.parse(snap.payload).state.year===1972));
      check('pre-load snapshot: the snapshot is a ring entry, not a slot entry', !!(snap && snap.kind==='auto' && String(snap.id).indexOf('auto:')===0));
      check('pre-load snapshot: slot:1 itself is untouched (still SlotCo)', !!(await idbGet('slot:1') && JSON.parse((await idbGet('slot:1')).payload).state.company==='SlotCo'));
    } finally { render=realRender; showRecap=realRecap; }
  }

  // ---------- 5. Delete clears EXACTLY the targeted slot; other slots + ring entries untouched ----------
  {
    _idbMem.clear();
    newGame('engineer'); animState=null; _gameStarted=true;
    const realMS=showManageSaves; showManageSaves=function(){}; // slotDelete re-renders the picker; isolate that
    try{
      state.company='DelCo';
      await writeSlotEntry('slot:1');
      await writeSlotEntry('slot:2');
      await writeSlotEntry('slot:3');
      await writeRingEntry(); // a real autosave-ring entry sharing the store (kind:'auto')
      const before=await idbGetAll();
      check('delete setup: 3 slot entries + 1 ring entry present', before.filter(e=>e.kind==='slot').length===3 && before.filter(e=>e.kind==='auto').length===1);
      await slotDelete('slot:2');
      const after=await idbGetAll();
      check('delete: targeted slot:2 is gone', !after.some(e=>e.id==='slot:2'));
      check('delete: slot:1 untouched', after.some(e=>e.id==='slot:1'));
      check('delete: slot:3 untouched', after.some(e=>e.id==='slot:3'));
      check('delete: exactly 2 slot entries remain', after.filter(e=>e.kind==='slot').length===2);
      check('delete: the separate autosave-ring entry is untouched', after.filter(e=>e.kind==='auto').length===1);
    } finally { showManageSaves=realMS; }
  }

  // ---------- 6. Export-slot: same {v,ts,state} wrapper as exportSave, sourced from the SLOT's payload ----------
  {
    _idbMem.clear();
    newGame('engineer'); animState=null; _gameStarted=true;
    state.company='Export Co'; state.year=1995; state.money=3e6;
    await writeSlotEntry('slot:3');
    // Capture the Blob contents + the download filename without a real browser.
    const realBlob=global.Blob, realURL=global.URL, realCreate=document.createElement;
    let captured=null, lastAnchor=null;
    global.Blob=function(parts){ this.parts=parts; };
    global.URL={ createObjectURL:(b)=>{ captured=b&&b.parts&&b.parts[0]; return 'blob:test'; }, revokeObjectURL(){} };
    document.createElement=function(t){ const el=realCreate.call(document,t); lastAnchor=el; return el; };
    try{
      await slotExport('slot:3');
    } finally {
      global.Blob=realBlob; global.URL=realURL; document.createElement=realCreate;
    }
    check('export: the blob was sourced from the slot payload (a string)', typeof captured==='string');
    let ep=null; try{ ep=JSON.parse(captured); }catch(_){}
    check('export: exported blob parses to the {v,ts,state} wrapper', !!(ep && ep.v===SAVE_VERSION && ep.state));
    check('export: exported state is the SLOT\'s state, not live state', !!(ep && ep.state.company==='Export Co' && ep.state.year===1995));
    check('export: filename follows the orbital-ventures-<company>-y<year>.json convention (from slot meta)', !!(lastAnchor && lastAnchor.download==='orbital-ventures-export-co-y1995.json'));
  }

  // ---------- 7. Enumeration: kind filter cleanly separates slot entries from ring entries in the shared store ----------
  {
    _idbMem.clear();
    newGame('engineer'); animState=null; _gameStarted=true;
    state.company='MixCo';
    await writeSlotEntry('slot:1');
    await writeSlotEntry('slot:4');
    // Two ring writes (distinct ts so both survive eviction — ring holds up to 3).
    const realNow=Date.now; let clk=2000; Date.now=()=>clk;
    try{ clk=2000; await writeRingEntry(); clk=3000; await writeRingEntry(); } finally { Date.now=realNow; }
    const all=await idbGetAll();
    const slots=all.filter(e=>e.kind==='slot'), ring=all.filter(e=>e.kind==='auto');
    check('enum: exactly 2 slot entries listed', slots.length===2);
    check('enum: exactly 2 ring entries listed', ring.length===2);
    check('enum: every slot entry has a slot: id', slots.every(e=>String(e.id).indexOf('slot:')===0));
    check('enum: every ring entry has an auto: id', ring.every(e=>String(e.id).indexOf('auto:')===0));
    check('enum: no ring entry leaks into the slot listing', !slots.some(e=>e.kind==='auto'));
    check('enum: no slot entry leaks into the ring listing', !ring.some(e=>e.kind==='slot'));
  }

  try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
  console.log(`\n${pass}/${pass+fail} checks passed`);
  process.exit(fail>0 ? 1 : 0);
}
main();
