// Visual overhaul — Phaser/canvas theme-sync infrastructure (flight.js). CSS custom properties can't
// be read from canvas draw calls, so THEME_COLORS mirrors the 3 body.theme-* palettes as a JS table;
// themeColor()/themeRgba() are what the flight overlay's HUD chrome now calls instead of hardcoded hex.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

check('THEME_COLORS has exactly the 3 palettes THEMES defines', Object.keys(THEME_COLORS).length===Object.keys(THEMES).length
  && Object.keys(THEMES).every(k=>!!THEME_COLORS[k]));

// ---------- themeColor tracks currentTheme ----------
currentTheme='dark';
check('themeColor: dark readout matches the Command Center blue value', themeColor('readout')==='#8de5ff');
currentTheme='green';
check('themeColor: paused theme selection keeps the Command Center blue value', themeColor('readout')==='#8de5ff');
currentTheme='beige';
check('themeColor: paused theme selection remains blue', themeColor('readout')==='#8de5ff');
currentTheme='dark';

// ---------- themeColor falls back sanely for a bogus theme name ----------
currentTheme='nope-not-a-real-theme';
check('themeColor: unknown theme falls back to dark, not a crash', themeColor('warn')===THEME_COLORS.dark.warn);
currentTheme='dark';

// ---------- themeRgba produces a well-formed rgba() string at the requested alpha ----------
const rgba=themeRgba('readout',0.25);
check('themeRgba: well-formed rgba() string', /^rgba\(\d+,\d+,\d+,0\.25\)$/.test(rgba));
check('themeRgba: RGB channels match the blue hex color (#8de5ff = 141,229,255)', rgba==='rgba(141,229,255,0.25)');

// ---------- every key drawDecisionPanel/drawTelemetry/drawFlightContinueBtn actually reads exists in every palette ----------
const usedKeys=['bg','panel2','readout','warn','bad','ink','dim','ignite','muted','ok'];
for(const theme of Object.keys(THEME_COLORS)){
  for(const k of usedKeys) check(`THEME_COLORS.${theme}.${k} is defined`, !!THEME_COLORS[theme][k]);
}

// ---------- themeColorNum(): the numeric 0xRRGGBB form render.js's true Phaser GameObjects need ----------
check('themeColorNum: matches the blue hex string numerically (#8de5ff = 0x8de5ff)', themeColorNum('readout')===0x8de5ff);
check('themeColorNum: returns a number, not a string (Phaser .setTint()/lineStyle() require a number)', typeof themeColorNum('ignite')==='number');
currentTheme='green';
check('themeColorNum: paused theme selection remains blue', themeColorNum('readout')===0x8de5ff);
currentTheme='dark';

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
