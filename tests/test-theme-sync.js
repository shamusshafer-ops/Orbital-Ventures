// Visual overhaul — Phaser/canvas theme-sync infrastructure (flight.js). CSS custom properties can't
// be read from canvas draw calls, so THEME_COLORS mirrors the body.theme-* and era palettes as a JS table;
// themeColor()/themeRgba() are what the flight overlay's HUD chrome now calls instead of hardcoded hex.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// 2026-11-14: four live themes. dark/green/beige each have a palette; "era" reads the current era's palette.
check('THEME_COLORS covers every fixed theme', ['dark','green','beige'].every(k=>!!THEME_COLORS[k]) && !!THEMES.era);
check('THEME_COLORS covers every era palette', ERA_VISUAL_MAP.every(k=>!!THEME_COLORS['era_'+k]));

// ---------- themeColor tracks currentTheme ----------
currentTheme='dark';
check('themeColor: dark readout matches the Command Center blue value', themeColor('readout')==='#8de5ff');
currentTheme='green';
check('themeColor: green theme returns the green palette', themeColor('readout')===THEME_COLORS.green.readout && themeColor('readout')!=='#8de5ff');
currentTheme='beige';
check('themeColor: beige theme returns the beige palette', themeColor('readout')===THEME_COLORS.beige.readout && themeColor('readout')!=='#8de5ff');
currentTheme='era';
check('themeColor: era theme follows the current era', themeColor('ignite')===THEME_COLORS['era_'+eraVisualKey()].ignite);
currentTheme='dark';

// ---------- applyTheme switches the body class and persists the choice ----------
applyTheme('green');
check('applyTheme(green): body gets theme-green, choice persisted', currentTheme==='green' && document.body.classList.contains('theme-green') && localStorage.getItem('ov_theme')==='green');
applyTheme('era');
check('applyTheme(era): body gets theme-era, previous class removed', document.body.classList.contains('theme-era') && !document.body.classList.contains('theme-green'));
applyTheme('not-a-theme');
check('applyTheme(unknown): falls back to Mission Dark with no theme class', currentTheme==='dark' && !document.body.classList.contains('theme-era'));
applyTheme('dark');

// ---------- the canvas table mirrors the stylesheet's palette blocks (no DOM/canvas drift) ----------
{
  const fs=require('fs'), path=require('path');
  const shellPath=[path.join(process.cwd(),'src','shell.html'), path.join(process.cwd(),'..','src','shell.html')].find(p=>fs.existsSync(p));
  check('src/shell.html located for canvas/CSS parity', !!shellPath);
  if(shellPath){
    const css=fs.readFileSync(shellPath,'utf8');
    const block=sel=>{ const i=css.indexOf(sel+'{'); if(i<0) return null; const j=css.indexOf('}',i); const o={}; for(const m of css.slice(i,j).matchAll(/--([a-z0-9-]+):(#[0-9a-fA-F]{6})/g)) o[m[1]]=m[2]; return o; };
    const sources={dark:'body:not(.theme-green):not(.theme-beige):not(.theme-era)', green:'body.theme-green,body.theme-era.era-80s',
      beige:'body.theme-beige', era_apollo:'body.theme-era.era-apollo', era_80s:'body.theme-green,body.theme-era.era-80s',
      era_90s2000s:'body.theme-era.era-90s2000s', era_spacex:'body.theme-era.era-spacex'};
    for(const [k,sel] of Object.entries(sources)){
      const b=block(sel);
      check(`palette block for ${k} found`, !!b);
      if(b) for(const t of Object.keys(THEME_COLORS[k])) check(`canvas ${k}.${t} == CSS --${t}`, THEME_COLORS[k][t]===b[t]);
    }
  }
}

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
check('themeColorNum: tracks the green theme', themeColorNum('readout')===parseInt(THEME_COLORS.green.readout.slice(1),16));
currentTheme='dark';

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
