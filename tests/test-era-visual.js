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
}catch(e){ console.log('(skipped built-HTML check — orbital-ventures.html not found relative to tests/:', e.message, ')'); }

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
