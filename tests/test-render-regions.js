// ============================================================================
// E0.3 Slice 0 — dirty-flag rendering snapshot harness.
//
// Purpose: a safety net for the E0.3 refactor (render() → named regions +
// invalidate()/renderAll()). This file snapshots a fixed set of container ids
// per named region across a scripted playthrough and asserts render() is
// idempotent (calling it twice in a row with no state change between produces
// byte-identical output for every inspected id). Slice 1 will extract
// render()'s body into these same named regions as pure code motion — this
// suite is what proves that extraction didn't change behavior.
//
// REGION_IDS below is authoritative for Slice 1's region boundaries. It is a
// REPRESENTATIVE sample per region, not exhaustive — extend it as needed
// rather than re-deriving region names from scratch.
//
// Known scope limits (acceptable for a Slice 0 safety net, not for Slice 2's
// actual bug fix): this only compares .innerHTML/.textContent-derived content,
// not classList/style — so it won't catch the classList-driven "modal-entering"
// re-trigger or stat-color churn E0.3's motivating bugs are actually about.
// Those need real-browser verification; this suite's job is regression-proofing
// the refactor's *content* output, not diagnosing the original bugs.
// ============================================================================
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const REGION_IDS = {
  topbar: ['coName','eraBadge','stDate','stMoney','stRep','stFlights','stSupport','stDepot','stRoyalty','stPassive','stInfra','stSci','stMarket','rndStatus'],
  badges: ['badgeCommand','badgeBench','badgeRnd','badgeMap','badgeStation','outlinerCard'],
  railLeft: ['ccLeft'],
  railRight: ['raccMissionBody','raccFlightBody','raccObjBody','raccContractsBody'],
  objective: ['nextObjStatus'],
  log: ['opsTimeline'],
  scene: {
    command: ['ccCenter','ccStrip','ccSummaryRight','ccRight','ccTimeline'],
    bench: ['vehicleFamilyCard','readoutCard'],
    rnd: ['techTree'],
    map: ['mapCanvas','empireStripWrap'],
    station: ['stationCanvas','stationStats'],
  },
  modal: ['modalBody','infraCard'],
};
const _allIds = [].concat(
  REGION_IDS.topbar, REGION_IDS.badges, REGION_IDS.railLeft, REGION_IDS.railRight,
  REGION_IDS.objective, REGION_IDS.log, REGION_IDS.modal,
  ...Object.values(REGION_IDS.scene)
);

// harness.js's document.getElementById returns a fresh, memory-less stub per call by design
// (the game only ever writes to the DOM in production; no prior suite needed to read it back).
// This suite needs to read back what render() actually wrote, so memoize just the ids above —
// every other id keeps the harness's original fresh-stub-per-call behavior untouched.
const _elCache = new Map();
const _origGetById = document.getElementById.bind(document);
document.getElementById = function(id){
  if(_allIds.indexOf(id)===-1) return _origGetById(id);
  if(_elCache.has(id)) return _elCache.get(id);
  const el = _origGetById(id);
  // Real DOM semantics: setting .innerHTML replaces all child nodes. The stub tracks _html and
  // .children independently and never reconciles them, so an appendChild-based renderer (e.g.
  // renderLog, which does `box.innerHTML=''` then appendChild's real rows) would accumulate
  // children forever across repeated render() calls on a memoized element. Patch this one
  // instance's setter to match real DOM behavior — only needed because this suite is the first
  // to read an element back after multiple renders; production code never does.
  Object.defineProperty(el, 'innerHTML', {
    get(){ return this._html; },
    set(v){ this._html=v; this.children.length=0; },
  });
  _elCache.set(id, el);
  return el;
};

// Deterministic PRNG so a render's own random-driven content (e.g. pickNewsFiller, which is
// intentionally re-picked fresh every render per its own header comment) can be pinned to an
// identical sequence across two back-to-back render() calls — otherwise a real idempotence
// check would false-fail on that *intentional* re-randomization. Also makes the whole scripted
// run byte-reproducible across repeat runs.
function makeLCG(seed){
  let s=seed>>>0;
  return function(){ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; };
}
const SEED=20260712;
const _origRandom=Math.random;
Math.random=makeLCG(SEED);

// Serializes a stub element's actual rendered content regardless of whether the renderer wrote
// via `.innerHTML = templateString` (content lands in el._html) or via
// `document.createElement`+`appendChild` (content lands in real child stub nodes, and the
// parent's own el._html getter would otherwise just return whatever literal string it was last
// set to — e.g. renderLog's `box.innerHTML=''` reset — which is NOT what was actually rendered).
// render.js's module-level `_texSeq` counter mints a fresh numeric suffix on every call for SVG
// gradient/texture ids (`sun0`, `texmars3`, ...) specifically so a re-render never reuses a stale
// cached gradient in a live browser — it's expected to differ between any two render() calls, not
// a bug. Normalize those sequence numbers out before comparing, or every map-tab idempotence check
// would false-fail on this one intentional side effect.
function normalizeVolatileIds(s){
  // `sun<N>` and its derived `sun<N>h` (halo) both need normalizing, hence [a-zA-Z]* after the digits.
  return s.replace(/\bsun\d+[a-zA-Z]*\b/g, 'sunN').replace(/\btex[a-zA-Z]*\d+[a-zA-Z]*\b/g, 'texN');
}
function serializeEl(el, depth){
  depth=depth||0;
  if(!el || depth>6) return '';
  // .textContent= is sometimes assigned a raw number (e.g. `$('stFlights').textContent=state.flights`)
  // with no toString — the stub stores it as-is, so _text/_html aren't reliably strings here.
  let s=String(el._html!=null?el._html:'');
  if(el.children && el.children.length) s+='['+el.children.map(c=>serializeEl(c,depth+1)).join('|')+']';
  if(!s) s=String(el._text!=null?el._text:'');
  return normalizeVolatileIds(s);
}
function captureRegions(tab, includeModal){
  const snap={};
  ['topbar','badges','railLeft','railRight','objective','log'].forEach(r=>{
    snap[r]={}; REGION_IDS[r].forEach(id=>{ snap[r][id]=serializeEl($(id)); });
  });
  snap.scene={};
  (REGION_IDS.scene[tab]||[]).forEach(id=>{ snap.scene[id]=serializeEl($(id)); });
  if(includeModal){ snap.modal={}; REGION_IDS.modal.forEach(id=>{ snap.modal[id]=serializeEl($(id)); }); }
  return snap;
}
function renderTwiceAndCompare(label, tab, includeModal){
  Math.random=makeLCG(SEED);
  render();
  const snap1=captureRegions(tab, includeModal);
  Math.random=makeLCG(SEED);
  render();
  const snap2=captureRegions(tab, includeModal);
  check(label+': double-render idempotent', JSON.stringify(snap1)===JSON.stringify(snap2));
  return snap1;
}

// setTab() defers the actual `state.tab=t; render();` behind `setTimeout(...,150)` when it finds
// a `.viewport` element (for the fade transition) — the harness's `document.querySelector` always
// returns a truthy stub, so setTab() always takes that async branch and a synchronous render()
// right after would still be rendering the OLD tab. Go straight to the state change + render, the
// same synchronous path setTab() itself takes when `.viewport` is absent — this suite cares about
// render()'s region output, not the transition animation.
function gotoTab(t){ state.tab=t; render(); }

// ---------- scripted playthrough ----------
newGame('engineer');
const snapBoot=renderTwiceAndCompare('boot (command tab)', 'command', false);
check('boot: topbar money field actually has content', !!snapBoot.topbar.stMoney);
check('boot: command scene strip actually has content', !!snapBoot.scene.ccStrip);

// Cape controls are rendered markup: actionable hotspots and in-flight rows must be native buttons,
// while a planned hotspot remains non-focusable markup with no onclick handler.
const _oldHotspots=ccHotspots;
ccHotspots=()=>[
  {key:'pad',name:'Launch Pad',status:'ready to fly',tab:'bench',x:1,y:2,w:3,h:4},
  {key:'future',name:'Future Site',status:'not built',planned:true,x:5,y:6,w:3,h:4},
];
const capeMarkup=ccSpotsHTML();
ccHotspots=_oldHotspots;
check('Cape action hotspot is a named native button', /<button class="ccspot[^>]*type="button"[^>]*aria-label="Launch Pad\. [^"]+"[^>]*onclick=/.test(capeMarkup));
check('Cape planned hotspot stays out of tab order', /<div class="ccspot planned"[^>]*>/.test(capeMarkup) && !/Future Site[^]*onclick=/.test(capeMarkup));
const _oldMissionItems=ccMissionDeckItems;
ccMissionDeckItems=()=>[{icon:'✈',label:'Surveyor en route',etaDays:12,color:'var(--readout)',go:()=>{}}];
renderCCSummaryRight();
const activeMissionMarkup=serializeEl($('ccSummaryRight'));
ccMissionDeckItems=_oldMissionItems;
check('active mission row is a named native button', /<button type="button" class="cc-deck-row"[^>]*aria-label="Open active mission: Surveyor en route\. 12d remaining\."/.test(activeMissionMarkup));

['command','bench','rnd','map','station'].forEach(t=>{
  gotoTab(t);
  const snap=renderTwiceAndCompare('tab '+t, t, false);
  const ids=REGION_IDS.scene[t];
  check('tab '+t+': scene region has content', ids.some(id=>!!snap.scene[id]));
});

gotoTab('command');
const before=renderTwiceAndCompare('before time advance', 'command', false);
for(let i=0;i<12;i++) advanceDays(30);
const after=renderTwiceAndCompare('after 12mo advance', 'command', false);
check('time advance actually changed the topbar date', before.topbar.stDate!==after.topbar.stDate);

// ---------- modal region ----------
showInfrastructureModal();
const modalSnap=renderTwiceAndCompare('infra modal open', 'command', true);
check('modal region actually has content while open', !!modalSnap.modal.modalBody || !!modalSnap.modal.infraCard);
hideModal();
renderTwiceAndCompare('after modal close', 'command', false);

// ---------- idempotence holds after a long run too (catches renderers that accumulate state) ----------
for(let i=0;i<24;i++) advanceDays(30);
gotoTab('map');
renderTwiceAndCompare('after 24 more months, map tab', 'map', false);
gotoTab('station');
renderTwiceAndCompare('after 24 more months, station tab', 'station', false);

console.log(pass+'/'+(pass+fail)+' checks passed');
Math.random=_origRandom;
process.exit(fail>0 ? 1 : 0);
