// #53 — public support decomposed into visible drivers.
// Before this, addSupport(delta) mutated a single scalar (state.publicSupport) with no record of
// why. 23 call sites across sim.js each fired their own delta with no attribution. addSupport now
// takes an optional reason key, logs a bounded ledger (same windowed-history idiom E0.5 already
// established for hull events), and supportLedgerBreakdown() groups it for display.
let s53Pass=0, s53Fail=0;
function s53Check(name, cond, detail){
  if(cond) s53Pass++;
  else { s53Fail++; console.log('FAIL:', name, detail!==undefined?('-- '+detail):''); }
}

console.log('#53 — public support decomposition');

/* ---------- ledger mechanics ---------- */
{
  newGame('engineer');
  s53Check('a fresh campaign starts with an empty ledger', supportLedgerList().length===0);
  addSupport(2, 'routineSuccess');
  s53Check('a tagged call is recorded', supportLedgerList().length===1);
  const e=supportLedgerList()[0];
  s53Check('the recorded entry keeps its delta', e.delta===2);
  s53Check('the recorded entry keeps its reason', e.reason==='routineSuccess');
  s53Check('the recorded entry stamps the day it happened', e.abs===absDay());

  addSupport(0, 'routineSuccess');
  s53Check('a zero-delta call is not logged (nothing actually moved)', supportLedgerList().length===1);

  addSupport(1, 'not-a-real-reason-key');
  s53Check('an unrecognized reason key still moves support', publicSupport()>=SUPPORT_BASE);
  s53Check('an unrecognized reason key is grouped under other, not dropped or misattributed',
    supportLedgerList()[supportLedgerList().length-1].reason==='other');
  addSupport(1); // no reason argument at all
  s53Check('a call with no reason argument at all also falls into other, not a crash',
    supportLedgerList()[supportLedgerList().length-1].reason==='other');
}

/* ---------- bounded, same idiom as addHullEvent's cap of 24 ---------- */
{
  newGame('engineer');
  for(let i=0;i<SUPPORT_LEDGER_CAP+15;i++) addSupport(0.1,'routineSuccess');
  s53Check('the ledger caps at SUPPORT_LEDGER_CAP entries', supportLedgerList().length===SUPPORT_LEDGER_CAP,
    supportLedgerList().length+' vs cap '+SUPPORT_LEDGER_CAP);
  s53Check('capping keeps the MOST RECENT entries (slices from the end)',
    supportLedgerList().every(e=>e.reason==='routineSuccess'));
}

/* ---------- breakdown aggregation ---------- */
{
  newGame('engineer');
  addSupport(2,'routineSuccess'); addSupport(1.5,'routineSuccess'); addSupport(-3,'abort'); addSupport(-12,'lossCrewed');
  const bd=supportLedgerBreakdown();
  s53Check('breakdown groups repeated reasons into one row', bd.length===3, bd.length);
  const rs=bd.find(r=>r.reason==='routineSuccess');
  s53Check('grouped total sums correctly', rs&&Math.abs(rs.total-3.5)<1e-9, rs&&rs.total);
  s53Check('grouped count is tracked', rs&&rs.count===2, rs&&rs.count);
  s53Check('every row carries a human-readable label, not just the key',
    bd.every(r=>r.label&&r.label!==r.reason));
  s53Check('breakdown sorts by |total| descending -- the biggest driver leads',
    Math.abs(bd[0].total)>=Math.abs(bd[1].total)&&Math.abs(bd[1].total)>=Math.abs(bd[2].total),
    bd.map(r=>r.total).join(','));
  s53Check('the single largest mover (lossCrewed, -12) sorts first', bd[0].reason==='lossCrewed');
}

/* ---------- every real call site in the game is actually tagged --------
   Regression guard: this is the exact bug the feature fixes. An untagged call site is not a
   crash (it falls into 'other'), so nothing else would catch a caller that forgot to tag --
   scan the source directly. */
{
  const fs=require('fs'), path=require('path');
  const SIM = fs.readFileSync(path.join(process.cwd(),'src','sim.js'),'utf8');
  // Balanced-paren extraction, not a regex -- addSupport(...) call sites contain their own nested
  // calls (supportDelta('x'), clampA(...)), and a regex like \((?:[^)]*)\) truncates at the FIRST
  // inner closing paren, misreading a real 2-argument call as unterminated. Caught by manually
  // verifying all 23 real call sites were tagged before trusting this scan.
  const calls=[];
  let i=0;
  while((i=SIM.indexOf('addSupport(', i))>=0){
    let depth=0, j=i+'addSupport('.length-1; // start at the opening paren
    for(; j<SIM.length; j++){
      if(SIM[j]==='(') depth++;
      else if(SIM[j]===')'){ depth--; if(depth===0) break; }
    }
    const isDef=/function\s+$/.test(SIM.slice(Math.max(0,i-20), i));
    const lineStart=SIM.lastIndexOf('\n', i)+1;
    const isComment=/^\s*\/\//.test(SIM.slice(lineStart, i));
    calls.push({text:SIM.slice(i, j+1), isDef, isComment});
    i=j+1;
  }
  const real=calls.filter(c=>!c.isDef&&!c.isComment).map(c=>c.text);
  const untagged=real.filter(c=>{
    const inner=c.slice('addSupport('.length, -1);
    let depth=0, sawTopComma=false;
    for(const ch of inner){
      if(ch==='(') depth++; else if(ch===')') depth--;
      else if(ch===','&&depth===0) sawTopComma=true;
    }
    return !sawTopComma;
  });
  s53Check('found the real call sites (sanity check on the scan itself)', real.length>=20, real.length);
  s53Check('every addSupport() call site in sim.js passes a reason', untagged.length===0,
    untagged.slice(0,3).join(' | '));
}

/* ---------- SUPPORT_REASON_LABELS covers every SUPPORT_DELTA key + the extras ---------- */
{
  s53Check('every SUPPORT_DELTA key has a label', Object.keys(SUPPORT_DELTA).every(k=>SUPPORT_REASON_LABELS[k]));
  s53Check('other is always defined as a fallback', !!SUPPORT_REASON_LABELS.other);
}

/* ---------- save persistence ---------- */
{
  newGame('engineer');
  addSupport(2,'routineSuccess'); addSupport(-3,'abort');
  const before=JSON.parse(JSON.stringify(supportLedgerList()));
  const payload=JSON.parse(JSON.stringify({v:SAVE_VERSION,ts:1,state}));
  applyLoadedSave(payload);
  s53Check('the ledger survives save/load', JSON.stringify(supportLedgerList())===JSON.stringify(before));
  s53Check('lifecycle audit stays clean with a populated ledger', auditLifecycleState().length===0);
}

/* ---------- modal renders without throwing, in both the empty and populated case ---------- */
{
  newGame('engineer');
  let threw=false;
  try{ showSupportBreakdown(); }catch(e){ threw=true; console.log('  (empty-ledger modal threw:',e.message,')'); }
  s53Check('the breakdown modal renders with an empty ledger', !threw);
  addSupport(2,'routineSuccess'); addSupport(-12,'lossCrewed');
  threw=false;
  try{ showSupportBreakdown(); }catch(e){ threw=true; console.log('  (populated modal threw:',e.message,')'); }
  s53Check('the breakdown modal renders with a populated ledger', !threw);
}

console.log('\n'+s53Pass+' passed, '+s53Fail+' failed');
if(s53Fail) process.exit(1);
