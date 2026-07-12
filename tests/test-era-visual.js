// User-directed era-evolving visual identity (2026-07-11) — the console ages up automatically with
// state.year via eraVisualKey()/applyEraVisual(), independent of the manual theme picker. All 4
// visual eras (apollo/80s/90s2000s/spacex) have real distinct CSS in shell.html.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- eraVisualKey(): correct era groupings ----------
newGame('engineer');
state.year=1945; // Pioneer
check('1945 (Pioneer): apollo', eraVisualKey()==='apollo');
state.year=1965; // Crewed & Lunar
check('1965 (Crewed & Lunar): apollo', eraVisualKey()==='apollo');
state.year=1980; // Station & Shuttle
check('1980 (Station & Shuttle): 80s', eraVisualKey()==='80s');
state.year=2010; // Commercial
check('2010 (Commercial): 90s2000s', eraVisualKey()==='90s2000s');
state.year=2040; // Expansion
check('2040 (Expansion): spacex', eraVisualKey()==='spacex');
state.year=2090; // Interplanetary
check('2090 (Interplanetary): spacex', eraVisualKey()==='spacex');
state.year=2150; // Speculative
check('2150 (Speculative): spacex', eraVisualKey()==='spacex');

// ---------- applyEraVisual(): toggles the right body class, only when the key actually changes ----------
newGame('engineer');
state.year=1945;
_lastEraVisual=null; // force a fresh apply regardless of any earlier test's cached state
applyEraVisual();
check('applyEraVisual: adds era-apollo for an early year', document.body.classList.contains('era-apollo'));
check('applyEraVisual: does not add other era classes', !document.body.classList.contains('era-80s') && !document.body.classList.contains('era-90s2000s') && !document.body.classList.contains('era-spacex'));

state.year=1980;
applyEraVisual();
check('applyEraVisual: switches to era-80s when the year advances into Station & Shuttle', document.body.classList.contains('era-80s'));
check('applyEraVisual: removes the stale era-apollo class', !document.body.classList.contains('era-apollo'));

const classesBefore=document.body.classList.contains('era-80s');
applyEraVisual(); // same year, same key — should be a cheap no-op, not toggle anything
check('applyEraVisual: re-applying with no era change is a stable no-op', document.body.classList.contains('era-80s')===classesBefore);

// ---------- the built HTML actually contains real CSS for all 4 eras, not just the apollo slice ----------
try{
  const fs=require('fs'), path=require('path');
  const html=fs.readFileSync(path.join(__dirname,'..','orbital-ventures.html'),'utf8');
  for(const key of ['era-apollo','era-80s','era-90s2000s','era-spacex']){
    check(`built HTML: body.${key} has real CSS rules (not just detected/unstyled)`, (html.match(new RegExp('body\\.'+key.replace('-','\\-'),'g'))||[]).length>=2); // >=2: the palette block + at least one shape rule
  }
  // ---- Slice C: newspaper front page — size class + per-era .frontpage CSS present in the build ----
  check('built HTML: .modal.newspaper size class exists', /\.modal\.newspaper\{/.test(html));
  check('built HTML: .frontpage base rule exists', /\.frontpage\{/.test(html));
  for(const key of ['era-apollo','era-80s','era-90s2000s','era-spacex']){
    check(`built HTML: body.${key} .frontpage CSS present`, new RegExp('body\\.'+key.replace('-','\\-')+' \\.frontpage').test(html));
  }
  // per-era direction is really in the CSS (not just palette inheritance):
  check('built HTML: apollo newspaper has halftone grain (radial-gradient)', /body\.era-apollo \.frontpage\{[^}]*radial-gradient/.test(html));
  check('built HTML: 80s newspaper keeps a lighter grain (radial-gradient)', /body\.era-80s \.frontpage\{[^}]*radial-gradient/.test(html));
  check('built HTML: 90s2000s newspaper is glossy, no grain (gradient, no radial-gradient)', /body\.era-90s2000s \.frontpage\{[^}]*linear-gradient/.test(html) && !/body\.era-90s2000s \.frontpage\{[^}]*radial-gradient/.test(html));
  check('built HTML: spacex newspaper overrides to sans font-family', /body\.era-spacex \.frontpage\{[^}]*font-family/.test(html));
  check('built HTML: spacex newspaper reveals the browser-chrome bar', /body\.era-spacex \.frontpage \.fp-chrome\{[^}]*display:flex/.test(html));
  // ---- Slice C-filler: below-the-fold brief CSS present in the build ----
  check('built HTML: .fp-fold below-the-fold CSS present', /\.fp-fold\{/.test(html));
  check('built HTML: .fp-brief brief CSS present', /\.fp-brief/.test(html));
}catch(e){ console.log('(skipped built-HTML check — orbital-ventures.html not found relative to tests/:', e.message, ')'); }

// ---------- Slice C-filler: procedural below-the-fold briefs (state-derived, not persisted) ----------
{
  newGame('engineer'); state.year=1970; // apollo era, rival/market/morale always eligible
  const f=pickNewsFiller(2);
  check('pickNewsFiller returns 1-2 briefs', f.length>=1 && f.length<=2);
  check('every brief has headline + blurb', f.every(b=>b.headline && b.blurb));
  const f2=pickNewsFiller(2);
  check('briefs are distinct within one edition (no repeat archetype)', f2.length<2 || f2[0].headline!==f2[1].headline);
  // req() gating: the staff/facility briefs must gate OUT when there is nothing to draw from
  const staffArch=NEWS_FILLER.find(a=>a.kind==='staff'), facArch=NEWS_FILLER.find(a=>a.kind==='facility');
  state.staff=[]; state.facilities={};
  check('staff brief req() false with no named staff', !staffArch.req(state));
  check('facility brief req() false with no built facility', !facArch.req(state));
  check('rival brief stays eligible (always has a rival to reference)', (()=>{const a=NEWS_FILLER.find(x=>x.kind==='rival'); return !a.req || a.req(state);})());
  // no archetype build() throws across a spread of eras/states
  let threw=false;
  for(const yr of [1945,1970,1995,2015,2045,2090]){ state.year=yr; const idx=eraIndex(currentEra());
    for(const a of NEWS_FILLER){ if(!a.req || a.req(state)){ try{ const b=a.build(state, idx); if(!b||!b.headline||!b.blurb) threw=true; }catch(e){ threw=true; } } } }
  check('no NEWS_FILLER.build() throws or returns empty across eras', !threw);
  // frontPageHTML wiring: filler only when withFiller=true; Chronicle replay (no arg) stays static
  pushFrontPage('milestone','✦','A Real First','the dek');
  check('frontPageHTML(e,true) appends the below-the-fold section', frontPageHTML(frontPages()[0], true).includes('fp-fold'));
  check('frontPageHTML(e) (Chronicle replay) omits filler — static history', !frontPageHTML(frontPages()[0]).includes('fp-fold'));
}

// ---------- Slice C: modalClassName() maps the view arg to the right modal class (pure/headless) ----------
check('modalClassName(undefined) → plain modal', modalClassName()==='modal');
check('modalClassName(true) → wide deep-view (legacy)', modalClassName(true)==='modal view');
check("modalClassName('view') → wide deep-view", modalClassName('view')==='modal view');
check("modalClassName('newspaper') → newspaper size class", modalClassName('newspaper')==='modal newspaper');

// ---------- Slice C: all newspaper call sites request the 'newspaper' view (no special-casing) ----------
{
  newGame('engineer'); state.year=1965;
  const _orig=showModal; let lastView;
  showModal=(html,view)=>{ lastView=view; };
  try{
    pushFrontPage('milestone','✦','Chronicle Entry','a dek');
    showFrontPage(0);
    check('Chronicle browser opens as newspaper', lastView==='newspaper');
    lastView='__unset';
    // milestone modal, significant first (rep>=15) → newspaper
    showMilestoneModal({id:'zzz_test',name:'Big First',rep:20,blurb:''}, 5, 20);
    check('milestone modal (rep>=15) opens as newspaper', lastView==='newspaper');
    lastView='__unset';
    // compact milestone (rep<15) must NOT be newspaper
    showMilestoneModal({id:'zzz_small',name:'Small First',rep:5,blurb:''}, 1, 5);
    check('compact milestone (rep<15) is NOT newspaper', lastView!=='newspaper');
    lastView='__unset';
    victory();
    showVictoryWire();
    check('victory wire opens as newspaper', lastView==='newspaper');
    lastView='__unset';
    // disaster hearing with a captured front page → newspaper; a bare (strand) hearing → not
    _pendingHearing=null;
    pushFrontPage('disaster','⚠','Test Mission: crew lost','A booster failed.');
    triggerHearing({m:{name:'Test Mission'}});
    showHearingModal();
    check('disaster hearing (has front page) opens as newspaper', lastView==='newspaper');
    lastView='__unset';
    _pendingHearing=null;
    triggerHearing({m:{name:'Unrelated Strand'}}); // no matching disaster filed → no front page
    showHearingModal();
    check('bare/strand hearing (no front page) is NOT newspaper', lastView!=='newspaper');
  } finally { showModal=_orig; }
}

// ---------- Command Center scene: era-tied building/pad tinting (2026-07-11) ----------
state.year=1945; // apollo
check('eraBuildingTint: apollo vab distinct from default', eraBuildingTint('vab')==='#c9c2b0');
check('eraPadStyle: apollo pad style present', eraPadStyle() && eraPadStyle().concrete==='#3a3a38');
state.year=1980; // 80s
check('eraBuildingTint: 80s vab distinct from apollo', eraBuildingTint('vab')==='#a8b0b8');
check('eraPadStyle: 80s has no override (falls through to default)', eraPadStyle()===null);
state.year=2010; // 90s2000s
check('eraBuildingTint: 90s2000s vab distinct', eraBuildingTint('vab')==='#c4d0dc');
check('eraPadStyle: 90s2000s pad style present', eraPadStyle() && eraPadStyle().gantry==='#a8b0b8');
state.year=2040; // spacex — deliberately no override, falls through to caller's default
check('eraBuildingTint: spacex has no override (falls through)', eraBuildingTint('vab')===undefined);
check('eraPadStyle: spacex has no override (falls through)', eraPadStyle()===null);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
