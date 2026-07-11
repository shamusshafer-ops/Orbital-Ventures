// User-directed Command Center "atmosphere/realism" follow-up (2026-07-11) — an ambient day/night sky
// cycle purely driven by the scene's own elapsed-seconds clock, no new game state.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- exact-match anchor: p=0.50 (dusk) must reproduce the scene's original fixed values ----------
const dusk=skyAtmosphere(SKY_CYCLE_SEC*0.50);
check('dusk keyframe: sky top matches original #0a1428', dusk.top==='10,20,40');
check('dusk keyframe: sky mid matches original #1d3450', dusk.mid==='29,52,80');
check('dusk keyframe: sky bot matches original #3a5570', dusk.bot==='58,85,112');
check('dusk keyframe: sun position matches original (0.92, 0.07)', dusk.sunX===0.92 && dusk.sunY===0.07);
check('dusk keyframe: sun fully opaque (original had no fade)', dusk.sunA===1);
check('dusk keyframe: stars at original full brightness', dusk.starMul===1);

// ---------- cycle wraps cleanly ----------
const start=skyAtmosphere(0), wrapped=skyAtmosphere(SKY_CYCLE_SEC);
check('cycle wraps: t=0 and t=SKY_CYCLE_SEC give the same sky', start.top===wrapped.top && start.sunX===wrapped.sunX);
const negWrapped=skyAtmosphere(-30);
check('cycle handles negative t safely (no NaN)', !isNaN(negWrapped.sunX) && !isNaN(negWrapped.sunA));

// ---------- day is bright and starless, night is dark and starry ----------
const day=skyAtmosphere(SKY_CYCLE_SEC*0.25);
check('day: sun near-overhead (low sunY)', day.sunY<dusk.sunY+0.01);
check('day: stars hidden', day.starMul===0);
const night=skyAtmosphere(SKY_CYCLE_SEC*0.75);
check('night: sun below horizon (sunA near 0)', night.sunA<0.05);
check('night: stars brighter than dusk', night.starMul>dusk.starMul);

// ---------- interpolation is smooth, not a hard cut ----------
const mid=skyAtmosphere(SKY_CYCLE_SEC*0.375); // halfway between day and dusk keyframes
check('interpolated frame differs from both neighboring keyframes', mid.top!==day.top && mid.top!==dusk.top);

// ---------- drawCape runs end-to-end without throwing across the full cycle ----------
try{
  const cv=makeCanvasStub(800,500);
  newGame('engineer');
  for(let i=0;i<8;i++){ drawCape(cv, SKY_CYCLE_SEC*(i/8)); }
  check('drawCape runs across the full cycle without throwing', true);
}catch(e){ check('drawCape runs across the full cycle without throwing ('+e.message+')', false); }

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
