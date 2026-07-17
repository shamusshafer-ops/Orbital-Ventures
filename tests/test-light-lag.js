// Physics realism #2 — one-way communication light-lag. Verifies the math against well-known real
// figures (Moon ~1.3s, Mars ~4-24min, Jupiter ~35-52min), Earth/unknown-body null handling, moons
// sharing their parent planet's distance, the fmtLag unit-switching formatter, and body-card rendering
// (present for other bodies, absent for Earth). Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');

// ---------- lightLagMinutes: known real-world figures ----------
{
  check('moon: ~1.3s one-way', Math.abs(lightLagMinutes('moon',false)*60-1.28)<0.3);
  check('moon: near===far (its Earth-distance barely varies)', lightLagMinutes('moon',false)===lightLagMinutes('moon',true));
  const marsNear=lightLagMinutes('mars',false), marsFar=lightLagMinutes('mars',true);
  check('mars: closest ≈ 3-5 min (real ~4min)', marsNear>3 && marsNear<5);
  check('mars: farthest ≈ 20-24 min (real ~21-24min)', marsFar>19 && marsFar<25);
  check('mars: farthest > closest', marsFar>marsNear);
  const jNear=lightLagMinutes('jupiter',false), jFar=lightLagMinutes('jupiter',true);
  check('jupiter: closest ≈ 33-37 min (real ~35min)', jNear>33 && jNear<37);
  check('jupiter: farthest ≈ 50-53 min (real ~52min)', jFar>50 && jFar<53);
}

// ---------- edge cases: Earth and unknown bodies return null ----------
{
  check('earth: no lag to itself (null)', lightLagMinutes('earth',false)===null);
  check('unknown body id: null', lightLagMinutes('not_a_body',false)===null);
}

// ---------- moons share their parent planet's AU (negligible moon-to-planet leg) ----------
{
  check('europa (Jupiter moon) matches Jupiter', lightLagMinutes('europa',false)===lightLagMinutes('jupiter',false));
  check('titan (Saturn moon) matches Saturn', lightLagMinutes('titan',false)===lightLagMinutes('saturn',false));
  check('triton (Neptune moon) matches Neptune', lightLagMinutes('triton',false)===lightLagMinutes('neptune',false));
}

// ---------- fmtLag: unit switching (s / min / hr) ----------
{
  check('fmtLag: sub-minute renders in seconds', /s$/.test(fmtLag(0.5)));
  check('fmtLag: minutes range renders in minutes', /min$/.test(fmtLag(20)));
  check('fmtLag: long delay renders in hours', /hr$/.test(fmtLag(200)));
}

// ---------- lightLagHTML / bodyCardHTML: present for real bodies, absent for Earth ----------
{
  check('lightLagHTML: empty for earth', lightLagHTML('earth')===''); 
  check('lightLagHTML: empty for unknown body', lightLagHTML('not_a_body')===''); 
  check('lightLagHTML: non-empty for mars', lightLagHTML('mars').length>0);
  check('lightLagHTML: mars shows a range (en dash)', /–/.test(lightLagHTML('mars')));
  check('lightLagHTML: moon shows a single figure, no range dash', !/–/.test(lightLagHTML('moon')));

  state.selectedBody='mars';
  check('bodyCardHTML: mentions Signal delay for Mars', /Signal delay/.test(bodyCardHTML()));
  state.selectedBody='earth';
  check('bodyCardHTML: no Signal delay row for Earth', !/Signal delay/.test(bodyCardHTML()));
  state.selectedBody=null;
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
