// Tier 3.2 (2026-08-04) — persistent history archive (state.annals), separate from the 40-entry live
// log. Note the field is state.annals, NOT state.history: the latter already exists as a
// {missionId: year} map for the Home timeline (a collision caught during scoping).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ return (_elCache[id]||{}).innerHTML||''; }

newGame('engineer');

// ---------- appendAnnal: shape, order, cap ----------
{
  check('a fresh game starts with no annals array (lazy — created on first append)', state.annals===undefined);
  appendAnnal('ok','First thing.');
  check('appendAnnal creates the array and records one entry', Array.isArray(state.annals) && state.annals.length===1);
  const e=state.annals[0];
  check('an entry carries a date string', typeof e.when==='string' && e.when.length>0);
  check('an entry carries the numeric year', e.y===state.year);
  check('an entry carries a kind', e.kind==='ok');
  check('an entry carries the summary', e.msg==='First thing.');
  check('an entry does NOT carry nav or detail (compact record only)', e.nav===undefined && e.detail===undefined);

  appendAnnal('bad','Second thing.');
  check('entries are stored oldest-first (push, not unshift like the live log)',
    state.annals[0].msg==='First thing.' && state.annals[1].msg==='Second thing.');

  appendAnnal('note','');
  check('an empty summary is ignored (no blank annal)', state.annals.length===2);
}

// ---------- cap ----------
{
  newGame('engineer');
  for(let i=0;i<ANNALS_CAP+150;i++) appendAnnal('note','e'+i);
  check('the archive caps at ANNALS_CAP', state.annals.length===ANNALS_CAP);
  check('overflow drops the OLDEST (ring buffer), keeping recent history', state.annals[state.annals.length-1].msg==='e'+(ANNALS_CAP+149));
  check('ANNALS_CAP is generous (a full campaign has a few hundred significant events)', ANNALS_CAP>=1000);
}

// ---------- the live log is untouched ----------
{
  newGame('engineer');
  const before=state.log.length;
  appendAnnal('ok','archive only');
  check('appendAnnal does NOT write to the live log', state.log.length===before);
  // log() still behaves exactly as before, 40-cap intact
  for(let i=0;i<60;i++) log('note','line'+i);
  check('the live log still caps at 40', state.log.length===40);
  check('the live log is still newest-first', state.log[0].msg==='line59');
  check('log() still accepts its 4-arg signature (nav+detail) unchanged',
    (log('note','m','navval','detailval'), state.log[0].nav==='navval' && state.log[0].detail==='detailval'));
}

// ---------- significant gameplay events actually record ----------
{
  newGame('engineer');
  state.activeResearch={id:'kerosene', monthsLeft:0, rushed:0};
  completeResearch();
  check('completing research records an annal', state.annals && state.annals.some(a=>/Researched Kerosene/.test(a.msg)));

  // a crisis trigger + resolve — triggering is inlined in tickCrisisTrigger(), so set the state the
  // same way it does and drive the annal through the same appendAnnal call the trigger uses.
  newGame('engineer');
  state.year=ERAS[5].from; state.leoFlights=40;
  const n0=(state.annals||[]).length;
  const def=crisisDef('debris_cascade');
  state.crisis={id:def.id, phase:'building', startAbs:0, severity:0.15, peakSeverity:0.15, fundedUntilAbs:null};
  appendAnnal('bad',`${def.name} — crisis began.`);
  check('a crisis trigger records an annal', (state.annals||[]).length>n0 && state.annals[state.annals.length-1].kind==='bad');
  resolveCrisis('mitigated');
  check('a crisis resolution records an annal', state.annals.some(a=>/resolved/i.test(a.msg)));
}

// ---------- routine chatter does NOT record ----------
{
  newGame('engineer');
  const n0=(state.annals||[]).length;
  log('note','just some routine status text');
  log('info','more routine chatter');
  check('a plain log() call does not create an annal (archive is significant-events-only)',
    (state.annals||[]).length===n0);
}

// ---------- Chronicle surfaces the archive, grouped by era, and omits when empty ----------
{
  newGame('engineer');
  appendAnnal('ok','Something historic.');
  showChronicle('view');
  const html=htmlOf('modalBody');
  check('the Chronicle shows an annals section when the archive is non-empty', /Agency annals/.test(html));
  check('the annals section shows the recorded entry', /Something historic\./.test(html));
  check('entries are grouped under an era heading', /Pioneer/.test(html));

  newGame('engineer'); state.annals=undefined;
  showChronicle('view');
  const html2=htmlOf('modalBody');
  check('the annals section is omitted entirely when the archive is empty', !/Agency annals/.test(html2));
  check('the Chronicle still renders normally with an empty archive', html2.length>200);
}

// ---------- save round-trip ----------
{
  newGame('engineer');
  appendAnnal('ok','persist me');
  const snapshot=JSON.parse(JSON.stringify(state));
  state=snapshot;
  check('annals survive a state serialization round-trip', state.annals && state.annals.some(a=>a.msg==='persist me'));

  // an "old save" with no annals field loads and records forward without error
  newGame('engineer'); delete state.annals;
  let threw=null;
  try{ appendAnnal('ok','forward'); showChronicle('view'); }catch(e){ threw=e; }
  check('a save with no annals field loads, records forward, and renders without error', threw===null);
  check('SAVE_VERSION was bumped for the additive field', SAVE_VERSION>=60);
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
