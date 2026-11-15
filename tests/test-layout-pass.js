// 2026-11-14 layout pass: compact header, one-line log, scalable + collapsible rails, full-bleed Cape,
// full-screen flight, and themed scrollbars. Behaviour is checked through the game's own functions; layout
// rules that only a browser can apply are checked in the stylesheet source (and were verified in Firefox).
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
const fs=require('fs'), path=require('path');
const srcPath=f=>[path.join(process.cwd(),'src',f), path.join(process.cwd(),'..','src',f)].find(p=>fs.existsSync(p));
const CSS=(()=>{ const p=srcPath('shell.html'); return p?fs.readFileSync(p,'utf8'):''; })();
const RENDER=(()=>{ const p=srcPath('render.js'); return p?fs.readFileSync(p,'utf8'):''; })();
check('sources located', CSS.length>0 && RENDER.length>0);

// cached DOM stubs so rendered HTML can be read back
const _el={};
const _gebi=document.getElementById.bind(document);
document.getElementById=id=>{
  if(['tlControls','opsTimeline','railToggleL','railToggleR','flightCanvasWrap','flightCanvas','flightTextCanvas'].includes(id))
    return _el[id]||(_el[id]=Object.assign(_gebi(id)||{}, {id, innerHTML:'', textContent:'', attrs:{}, setAttribute(k,v){ this.attrs[k]=String(v); }}));
  return _gebi(id);
};

// ---------- 1. rails scale with the window and collapse ----------
{
  check('rails: width scales with the window, 260–380px', /--cc-rail-width:clamp\(260px,20vw,380px\)/.test(CSS));
  check('rails: the old fixed 1200px step is gone', !/@media\(max-width:1200px\)\{\s*:root\{ --cc-rail-width:300px; \}/.test(CSS));
  check('rails: both toggles exist in the page', /id="railToggleL"[^>]*onclick="toggleRail\('l'\)"/.test(CSS) && /id="railToggleR"[^>]*onclick="toggleRail\('r'\)"/.test(CSS));
  railCollapsed.l=false; railCollapsed.r=false; applyRails();
  toggleRail('l');
  check('rails: collapsing left sets the body class', document.body.classList.contains('rail-l-collapsed') && !document.body.classList.contains('rail-r-collapsed'));
  check('rails: the choice persists', localStorage.getItem('ov_rail_l')==='1');
  check('rails: the toggle reports its state', _el.railToggleL.attrs['aria-expanded']==='false' && /Expand the left panel/.test(_el.railToggleL.title||''));
  toggleRail('r'); toggleRail('l');
  check('rails: sides toggle independently', !document.body.classList.contains('rail-l-collapsed') && document.body.classList.contains('rail-r-collapsed') && localStorage.getItem('ov_rail_r')==='1');
  toggleRail('r');
  check('rails: collapse only applies on wide screens (toggles hidden ≤880px)', /@media\(min-width:881px\)\{\s*body\.rail-l-collapsed \.scene-shell\{--rail-l:10px\}/.test(CSS) && /@media\(max-width:880px\)\{ \.rail-toggle\{display:none\} \}/.test(CSS));
  check('rails: Command Center hides its floating deck / rail when collapsed', /body\.rail-l-collapsed \.command-hero #ccStrip\{display:none!important\}/.test(CSS) && /body\.rail-r-collapsed \.command-hero \.rail-right\{display:none!important\}/.test(CSS));
  check('rails: [ and ] are documented in the hotkey help', (()=>{ let h=''; const o=showModal; showModal=x=>{h=x;}; try{ showHotkeyHelp(); }finally{ showModal=o; } return h.includes('[ / ]'); })());
}

// ---------- 2. compact header + one-line log ----------
{
  check('header: compact block present', /Layout pass \(2026-11-14\): compact header/.test(CSS) && /\.scene-dock nav\.rail-nav button\{min-height:28px/.test(CSS));
  newGame('engineer');
  log('note','Static fire complete: chamber pressure nominal.');
  _tlCollapsed=true; renderLog();
  const line=_el.tlControls.innerHTML;
  check('log: collapsed shows ONE line with the newest entry', line.includes('tl-latest') && line.includes('Static fire complete') && !line.includes('tl-filter'));
  check('log: the line leads with today\'s date and offers expand', line.includes(dateStr()) && line.includes('▸ Show log'));
  _tlCollapsed=false; renderLog();
  check('log: expanded shows the category filters again', _el.tlControls.innerHTML.includes('tl-filter') && !_el.tlControls.innerHTML.includes('tl-latest'));
  check('log: collapsed is the default when nothing is saved', /_tlCollapsed = v===null \? true : v==='1'/.test(fs.readFileSync(srcPath('flight.js'),'utf8')));
}

// ---------- 3. Cape full-bleed ----------
{
  check('cape: no hard-coded aspect ratio on the scene wrapper', !/id="ccSceneWrap" style="aspect-ratio/.test(RENDER));
  check('cape: hero fills the area (no rail-width side margins, aspect auto)', /\.command-hero #ccCenter\{height:100%;margin-left:0;margin-right:0\}/.test(CSS) && /\.command-hero \.ccscene-wrap\{[^}]*aspect-ratio:auto/.test(CSS));
  check('cape: every mount follows its host size', typeof observeCape3DHost==='function' && /observeCape3DHost\(host\);/.test(RENDER));
  // 2D zoom layer must not transform the 3D canvas when 3D mounted into a host the 2D path built
  const z={id:'ccZoom', style:{transform:'translate(5px,5px) scale(0.86)'}, classList:{contains:c=>c==='cape3d-zoom'}};
  const o=document.getElementById; document.getElementById=id=>id==='ccZoom'?z:o(id);
  try{ applyCapeZoom(); } finally { document.getElementById=o; }
  check('cape: 2D CSS zoom is cleared once the 3D scene owns the host', z.style.transform==='');
}

// ---------- 4. full-screen flight ----------
{
  ['flightCanvasWrap','flightCanvas','flightTextCanvas'].forEach(id=>document.getElementById(id));
  _el.flightCanvasWrap.clientWidth=1894; _el.flightCanvasWrap.clientHeight=904;
  _el.flightCanvas.width=900; _el.flightCanvas.height=520; _el.flightTextCanvas.width=900; _el.flightTextCanvas.height=520;
  const sz=sizeFlightCanvas();
  check('flight: drawing size follows the full-screen wrap', sz.w===1894 && sz.h===904 && _el.flightCanvas.width===1894 && _el.flightTextCanvas.height===904);
  _el.flightCanvasWrap.clientWidth=0; _el.flightCanvasWrap.clientHeight=0;
  const fb=flightViewSize();
  check('flight: no layout (headless / hidden) keeps the 900×520 default', fb.w===900 && fb.h===520);
  check('flight: the overlay CSS fills the screen', /\.animwrap #flightCanvasWrap\{width:calc\(100vw - 24px\);height:calc\(100vh - 88px\)/.test(CSS));
  check('flight: no hard-coded 900×520 for the 3D scene', !/startCape3D\('flight3dHost',900,520\)/.test(fs.readFileSync(srcPath('flight.js'),'utf8')));
}

// ---------- 5. themed scrollbars ----------
check('scrollbars: themed instead of the browser default light bar', /body\{scrollbar-color:color-mix\(in srgb,var\(--ignite\)/.test(CSS));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
