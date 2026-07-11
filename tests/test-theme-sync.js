// Visual overhaul — Phaser/canvas theme-sync infrastructure (flight.js). CSS custom properties can't
// be read from canvas draw calls, so THEME_COLORS mirrors the 3 body.theme-* palettes as a JS table;
// themeColor()/themeRgba() are what the flight overlay's HUD chrome now calls instead of hardcoded hex.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

check('THEME_COLORS has exactly the 3 palettes THEMES defines', Object.keys(THEME_COLORS).length===Object.keys(THEMES).length
  && Object.keys(THEMES).every(k=>!!THEME_COLORS[k]));

// ---------- themeColor tracks currentTheme ----------
currentTheme='dark';
check('themeColor: dark readout matches the CSS value', themeColor('readout')==='#4fd1d9');
currentTheme='green';
check('themeColor: switching theme actually changes the color', themeColor('readout')==='#5fe0a0');
currentTheme='beige';
check('themeColor: beige readout matches the CSS value', themeColor('readout')==='#5bb9c4');
currentTheme='dark';

// ---------- themeColor falls back sanely for a bogus theme name ----------
currentTheme='nope-not-a-real-theme';
check('themeColor: unknown theme falls back to dark, not a crash', themeColor('warn')===THEME_COLORS.dark.warn);
currentTheme='dark';

// ---------- themeRgba produces a well-formed rgba() string at the requested alpha ----------
const rgba=themeRgba('readout',0.25);
check('themeRgba: well-formed rgba() string', /^rgba\(\d+,\d+,\d+,0\.25\)$/.test(rgba));
check('themeRgba: RGB channels match the hex color (#4fd1d9 = 79,209,217)', rgba==='rgba(79,209,217,0.25)');

// ---------- every key drawDecisionPanel/drawTelemetry/drawFlightContinueBtn actually reads exists in every palette ----------
const usedKeys=['bg','panel2','readout','warn','bad','ink','dim','ignite'];
for(const theme of Object.keys(THEME_COLORS)){
  for(const k of usedKeys) check(`THEME_COLORS.${theme}.${k} is defined`, !!THEME_COLORS[theme][k]);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
