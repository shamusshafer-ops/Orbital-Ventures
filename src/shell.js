/* ---------- flight animation (canvas) ---------- */
let animEnabled=true, animState=null;
// Liftoff lead-in (iso-view rocket rise + camera zoom-chase, handed off into playMission).
// _liftoffArmed is set per interactive launch and consumed once at the ascent handoff; deferred
// arrivals never arm it (they resolve turns later, when a different vehicle may sit on the pad).
let _liftoffArmed=false, _liftoff=null, _liftoffRAF=0;
const ANIM_SPEEDS=[{label:'½×  Slow',mult:0.5},{label:'1×  Normal',mult:1},{label:'2×  Fast',mult:2}];
let animSpeedIdx=0;
function toggleAnim(){ animEnabled=!animEnabled; const b=$('animToggle'); if(b) b.textContent='Animation: '+(animEnabled?'On':'Off'); }
// --- screen real estate: browser fullscreen + a persistent full-width "Wide" mode ---
// Default to maximum real estate: Wide (full-width) is ON unless the player turned it
// off, and we enter true browser fullscreen on the first user gesture (browsers block
// auto-fullscreen on load) unless the player has opted out by exiting it.
let wideOn = true;
try{ const v=localStorage.getItem('ov_wide'); if(v!==null) wideOn=(v==='1'); }catch(e){}
// Display-only theme variants — persisted like wideOn (localStorage, NOT in the save), so they
// survive new games and need no SAVE_VERSION bump. Each name maps to a body.theme-* palette class.
const THEMES={ dark:'Mission Dark', green:'Control Room Green', beige:'Apollo Beige' };
let currentTheme='dark';
try{ const v=localStorage.getItem('ov_theme'); if(v && THEMES[v]) currentTheme=v; }catch(e){}
function applyTheme(name){
  if(!THEMES[name]) name='dark'; currentTheme=name;
  try{ localStorage.setItem('ov_theme', name); }catch(e){}
  const b=document.body; if(b){ b.classList.remove('theme-green','theme-beige'); if(name!=='dark') b.classList.add('theme-'+name); }
}
function pickTheme(name){ applyTheme(name); if(typeof activeModal==='function') activeModal(); } // re-render the menu so the active chip updates
// UI scale (E0.4 slice D) — a display-only whole-page zoom, persisted like theme/wide (localStorage,
// NOT the save), so it survives new games and save-slot switches and needs no SAVE_VERSION bump.
// Valid values: 80–130% in 10% steps (80,90,100,110,120,130); default 100%.
const UI_SCALE_MIN=80, UI_SCALE_MAX=130, UI_SCALE_STEP=10, UI_SCALE_DEFAULT=100;
// Snap/clamp an arbitrary input (slider value or a hand-edited/corrupt localStorage string) into the
// valid set; anything non-numeric falls back to the default. Used for both slider input and boot sanitize.
function clampUiScale(v){
  v=parseFloat(v);
  if(isNaN(v)) return UI_SCALE_DEFAULT;
  v=Math.round(v/UI_SCALE_STEP)*UI_SCALE_STEP; // snap to the nearest 10% step
  if(v<UI_SCALE_MIN) v=UI_SCALE_MIN;
  if(v>UI_SCALE_MAX) v=UI_SCALE_MAX;
  return v;
}
// Boot-time decision: absent key -> default; present -> sanitize through clampUiScale (self-heals corruption).
function bootUiScale(raw){ return (raw===null||raw===undefined) ? UI_SCALE_DEFAULT : clampUiScale(raw); }
let uiScale=UI_SCALE_DEFAULT;
try{ uiScale=bootUiScale(localStorage.getItem('ov_uiscale')); }catch(e){}
function applyUiScale(v){
  uiScale=clampUiScale(v);
  try{ localStorage.setItem('ov_uiscale', String(uiScale)); }catch(e){}
  try{ document.documentElement.style.setProperty('--ui-scale', String(uiScale/100)); }catch(e){}
}
// Live-apply from the settings slider: set the zoom + persist, re-sync the sticky-panel offsets against
// the topbar's new rendered height, then re-render the open menu so the % readout tracks the drag.
function setUiScale(v){ applyUiScale(v); syncTopbarH(); if(typeof activeModal==='function') activeModal(); }
let _prevFs=false;
function inFullscreen(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
function fsOptedOut(){ try{ return localStorage.getItem('ov_fs_optout')==='1'; }catch(e){ return false; } }
function setFsOptOut(v){ try{ localStorage.setItem('ov_fs_optout', v?'1':'0'); }catch(e){} }
function applyWide(){
  const fs=inFullscreen();
  document.body.classList.toggle('fullwide', wideOn || fs);
  if(_prevFs && !fs) setFsOptOut(true); // player left fullscreen -> don't auto-enter next load
  _prevFs=fs;
  const wb=$('wideBtn'); if(wb){ wb.textContent=wideOn?'↔ Comfortable':'↔ Wide'; wb.style.borderColor=wideOn?'var(--ignite)':''; wb.style.color=wideOn?'var(--ignite)':''; }
  const fb=$('fullscreenBtn'); if(fb){ fb.textContent=fs?'⛶ Exit full screen':'⛶ Full screen'; fb.style.borderColor=fs?'var(--ignite)':''; fb.style.color=fs?'var(--ignite)':''; }
}
function toggleWide(){ wideOn=!wideOn; try{ localStorage.setItem('ov_wide', wideOn?'1':'0'); }catch(e){} applyWide(); syncTopbarH(); }
// keep --topbar-h in sync with the pinned header+opsbar so sticky panels always clear it
function syncTopbarH(){ const tb=$('topbar'); if(!tb) return; const h=topbarHidden?0:tb.offsetHeight; if(h>0||topbarHidden){ try{ document.documentElement.style.setProperty('--topbar-h', h+'px'); }catch(e){} } }
// Collapse/restore the whole top bar (stats banner + ops controls) so the top of the screen can be
// freed on demand — useful when an overlay would otherwise sit under it. A floating "Show bar" button
// (and the 'h' hotkey) brings it back. Session-only UI state, not saved.
let topbarHidden=false;
function toggleTopbar(force){
  topbarHidden = (force===undefined) ? !topbarHidden : !!force;
  const tb=$('topbar'); if(tb) tb.classList.toggle('collapsed', topbarHidden);
  const sb=$('topbarShow'); if(sb) sb.classList.toggle('hidden', !topbarHidden);
  syncTopbarH();
}
// The ops controls (row 2) are a single shared node: on the Map view they ride across the top of the
// map card; on every other view they sit pinned in the topbar. One node relocated by reference — no
// duplication, and the inline onclick handlers survive the move — so Advance/Menu stay available everywhere.
function placeOpsbar(){
  const ops=$('opsbar'); if(!ops) return;
  if(state.tab==='map'){
    const host=$('mapCard'); if(host && ops.parentNode!==host){ host.insertBefore(ops, host.firstChild); }
    ops.classList.add('in-map');
  } else {
    const tb=$('topbar'); if(tb && ops.parentNode!==tb){ tb.appendChild(ops); } // home position: after <header>
    ops.classList.remove('in-map');
  }
}
try{ window.addEventListener('resize', syncTopbarH); }catch(e){}
function _requestFs(){ const el=document.documentElement; const fn=el.requestFullscreen||el.webkitRequestFullscreen; if(fn){ try{ const p=fn.call(el); if(p&&p.catch)p.catch(()=>{}); }catch(e){} } }
function _exitFs(){ const fn=document.exitFullscreen||document.webkitExitFullscreen; if(fn){ try{ const p=fn.call(document); if(p&&p.catch)p.catch(()=>{}); }catch(e){} } }
function toggleFullscreen(){ if(!inFullscreen()){ setFsOptOut(false); _requestFs(); } else { setFsOptOut(true); _exitFs(); } }
document.addEventListener('fullscreenchange', applyWide);
document.addEventListener('webkitfullscreenchange', applyWide);
// enter fullscreen on the first user gesture (the earliest a browser permits), once
function _firstGestureFs(){ document.removeEventListener('pointerdown',_firstGestureFs); document.removeEventListener('keydown',_firstGestureFs); if(!fsOptedOut() && !inFullscreen()) _requestFs(); }
document.addEventListener('pointerdown',_firstGestureFs);
document.addEventListener('keydown',_firstGestureFs);
function cycleAnimSpeed(){
  animSpeedIdx=(animSpeedIdx+1)%ANIM_SPEEDS.length;
  const b=$('animSpeedBtn'); if(b) b.textContent=ANIM_SPEEDS[animSpeedIdx].label;
}
function animSpeed(){ return ANIM_SPEEDS[animSpeedIdx].mult; }
// ── E0.4 Slice A: shared keyboard helpers ──
// One typing guard for every keydown handler (was repeated inline at each call site): never
// hijack a keystroke aimed at a text field / dropdown.
function isTyping(e){ const tag=(e&&e.target&&e.target.tagName)||''; return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'; }
// Space's pause/launch split as a pure, headless-testable decision: while the clock is auto-running
// Space stops it (pause); otherwise Space keeps its original "launch the current mission" behavior.
function spaceAction(timeAutoRunning){ return timeAutoRunning ? 'pause' : 'launch'; }
// Warp ladder (the +/- time-warp keys) as a pure step function over the day→week→month units.
// dir>0 steps up (a stopped clock starts at day; day→week→month, clamped at month);
// dir<0 steps down (month→week→day, then day→stop, signalled by null). Not running + step-down → null.
function warpStep(unit, dir){
  const ORDER=['day','week','month'], i=ORDER.indexOf(unit);
  if(dir>0) return i<0 ? 'day' : ORDER[Math.min(i+1, ORDER.length-1)];
  return i<=0 ? null : ORDER[i-1];
}
// The warp keys share +/=/-/arrows with the R&D tech-tree pan/zoom, which owns them on that scene;
// everywhere else the warp keys are live. (Pure predicate so the gating is unit-testable.)
function warpKeysActive(scene){ return scene!=='rnd'; }
// E0.4 Slice B: focus-trap cycling as a pure, headless-testable step. Given the live focusable list,
// the index currently focused (or -1 if focus is elsewhere), and whether Shift is held, return the
// index that should receive focus next — wrapping at both ends. Empty list → -1 (caller no-ops).
function nextTrapFocus(focusableEls, currentIndex, shiftKey){
  const n=(focusableEls && focusableEls.length)||0;
  if(n===0) return -1;
  if(currentIndex<0 || currentIndex>=n) return shiftKey ? n-1 : 0; // focus outside the trap → jump to an end
  if(shiftKey) return currentIndex===0 ? n-1 : currentIndex-1;     // Shift+Tab: back, wrapping first→last
  return currentIndex===n-1 ? 0 : currentIndex+1;                  // Tab: forward, wrapping last→first
}
// While a modal is open, keep Tab focus inside it: recompute the focusable list fresh each press (the
// live activeModal re-render can change modal content), find where focus is, and move by nextTrapFocus.
function trapModalTab(e){
  try{
    const mb=$('modalBody'); if(!mb) return;
    const list=mb.querySelectorAll(MODAL_FOCUSABLE_SEL);
    const n=(list && list.length)||0;
    if(n===0){ e.preventDefault(); try{ mb.focus(); }catch(_){} return; } // nothing to land on → keep focus on the body
    let cur=-1; const active=document.activeElement;
    for(let i=0;i<n;i++){ if(list[i]===active){ cur=i; break; } }
    const ni=nextTrapFocus(list, cur, e.shiftKey);
    if(ni>=0 && list[ni]){ e.preventDefault(); list[ni].focus(); }
  }catch(_){}
}
document.addEventListener('keydown',function(e){
  // Space: pause the clock if auto-running, else launch the current mission
  // (or skip/continue the playback if one is running).
  if(e.key===' '||e.code==='Space'){
    if(isTyping(e)) return; // never hijack typing
    e.preventDefault();
    if(animState){ if(animState.held) dismissAnim(); else skipAnim(); return; }
    if(spaceAction(!!timeAuto.unit)==='pause'){ stopTimeAuto(); return; } // auto-run active → pause, don't launch
    tryLaunchHotkey();
    return;
  }
  if(!animState) return;
  if(e.key==='Enter'){ e.preventDefault(); if(animState.held){ dismissAnim(); } else { cycleAnimSpeed(); } }
});
// 'h' toggles the top bar (collapse to free the top of the screen / restore it)
document.addEventListener('keydown',function(e){
  if((e.key!=='h'&&e.key!=='H') || e.metaKey || e.ctrlKey || e.altKey || animState) return;
  if(isTyping(e)) return;
  toggleTopbar(); e.preventDefault();
});
// Presentation pass: tech-tree keyboard navigation — only on the R&D scene, never while typing.
// Arrow keys pan the scroll pane; +/-/0 zoom.
document.addEventListener('keydown',function(e){
  if(!state || state.tab!=='rnd' || animState) return;
  if(isTyping(e)) return;
  const el=$('techTree'); if(!el) return;
  if(techExpanded && (e.key==='Escape'||e.key==='Enter')){ toggleTechExpand(); e.preventDefault(); return; } // close the pop-out
  const STEP=64;
  switch(e.key){
    case 'ArrowLeft':  el.scrollLeft-=STEP; e.preventDefault(); break;
    case 'ArrowRight': el.scrollLeft+=STEP; e.preventDefault(); break;
    case 'ArrowUp':    el.scrollTop-=STEP;  e.preventDefault(); break;
    case 'ArrowDown':  el.scrollTop+=STEP;  e.preventDefault(); break;
    case '+': case '=': zoomTech(1.15); e.preventDefault(); break;
    case '-': case '_': zoomTech(1/1.15); e.preventDefault(); break;
    case '0': resetTechZoom(); e.preventDefault(); break;
  }
});
// #32: keyboard scene navigation — ESC = close modal / back to Command Center,
// TAB = next scene, number keys 1–4 = jump to a scene. Never hijacks typing.
function modalOpen(){ const m=$('modal'); return !!m && m.classList && !m.classList.contains('hidden'); }
function nextScene(dir){
  const i=SCENE_TABS.indexOf(state.tab);
  const base=i<0?0:i;
  const ni=((base+(dir||1))%SCENE_TABS.length+SCENE_TABS.length)%SCENE_TABS.length;
  setTab(SCENE_TABS[ni]);
}
document.addEventListener('keydown',function(e){
  if(!state || animState) return;
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const typing=isTyping(e);
  // ESC works even from a focused control: close an open modal/drill, else step back.
  if(e.key==='Escape'){
    if(modalOpen()){ hideModal(); e.preventDefault(); return; }
    if(hubPanel==='contracts'){ openHubPanel('alerts'); e.preventDefault(); return; }
    if(state.tab!=='command'){ setTab('command'); e.preventDefault(); return; }
    return;
  }
  // Enter also minimizes the Production drill (the boot-time top layer) — but never while typing in a field.
  if(e.key==='Enter' && _prodModalOpen && modalOpen() && !typing){ hideModal(); e.preventDefault(); return; }
  // E0.4 Slice B: while a modal is open, Tab/Shift+Tab cycle focus WITHIN it (even from a focused field)
  // instead of escaping to background page controls. Runs before the "return on modalOpen" guard below.
  if(e.key==='Tab' && modalOpen()){ trapModalTab(e); return; }
  if(typing || modalOpen()) return; // don't grab TAB/numbers while typing or in a modal
  if(e.key==='Tab'){ nextScene(e.shiftKey?-1:1); e.preventDefault(); return; }
  if(e.key>='1' && e.key<='5'){ const idx=+e.key-1; if(idx<SCENE_TABS.length){ setTab(SCENE_TABS[idx]); e.preventDefault(); } }
});
// F1/F2/F3 mirror the ▸/▸▸/▸▸▸ day/week/month time-advance buttons — same clickTimeArrow() as a
// mouse click, so the existing "press once = single step, press again = auto-run 1/sec" behavior
// and the running-arrow highlight both come along for free. Guarded like the scene-nav keys above
// (no modal open, not typing, not mid-animation) so it can never fire a launch's outcome early or
// steal a keystroke from a text field.
document.addEventListener('keydown',function(e){
  if(!state || animState || modalOpen()) return;
  if(e.ctrlKey||e.metaKey||e.altKey||e.shiftKey) return;
  if(isTyping(e)) return;
  if(e.key==='F1'){ clickTimeArrow('day'); e.preventDefault(); }
  else if(e.key==='F2'){ clickTimeArrow('week'); e.preventDefault(); }
  else if(e.key==='F3'){ clickTimeArrow('month'); e.preventDefault(); }
});
// E0.4 Slice A: 'p' is an unconditional pause/resume toggle for the clock — works on every scene
// (unlike the +/- warp keys), guarded like F1-F3 (no modal, no anim, not typing). Running → stop;
// stopped → resume auto-run (defaults to day steps, the finest unit) via the same startTimeAuto machinery.
document.addEventListener('keydown',function(e){
  if(e.key!=='p'&&e.key!=='P') return;
  if(!state || animState || modalOpen()) return;
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(isTyping(e)) return;
  if(timeAuto.unit){ stopTimeAuto(); } else { startTimeAuto('day'); }
  e.preventDefault();
});
// E0.4 Slice A: +/= step the time-warp up, - steps it down (day→week→month ladder), on every scene
// EXCEPT R&D (where those keys pan/zoom the tech tree). Same modal/anim/typing gates as F1-F3.
// Shift is allowed here because '+' is Shift+'='; ctrl/meta/alt are still excluded (browser zoom, etc).
document.addEventListener('keydown',function(e){
  if(e.key!=='+'&&e.key!=='='&&e.key!=='-'&&e.key!=='_') return;
  if(!state || animState || modalOpen()) return;
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(isTyping(e)) return;
  if(!warpKeysActive(state.tab)) return; // R&D owns +/=/- for the tech tree
  const up=(e.key==='+'||e.key==='=');
  const u=warpStep(timeAuto.unit, up?1:-1);
  if(u){ startTimeAuto(u); } else { stopTimeAuto(); } // step down past 'day' → stop the clock
  e.preventDefault();
});
// E0.4 Slice A: '?' (Shift+/) opens the keyboard-shortcut help overlay. Not while typing / in a modal.
document.addEventListener('keydown',function(e){
  if(e.key!=='?') return;
  if(!state || modalOpen()) return;
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(isTyping(e)) return;
  showHotkeyHelp(); e.preventDefault();
});
// Static, self-contained shortcut reference (uses the shared showModal chrome — no new CSS).
function showHotkeyHelp(){
  const row=(k,d)=>`<tr><td style="white-space:nowrap;padding:2px 14px 2px 0;font-family:var(--mono);color:var(--ignite)">${k}</td><td style="padding:2px 0">${d}</td></tr>`;
  showModal(`<h2 style="margin-bottom:2px">⌨ Keyboard Shortcuts</h2>
    <p class="muted" style="font-size:12px;margin:0 0 10px">Most keys are ignored while you're typing in a field.</p>
    <table style="font-size:13px;border-collapse:collapse"><tbody>
      ${row('1 – 5','Jump to a scene (Vehicle · Station · Solar System · Command · R&amp;D)')}
      ${row('Tab / Shift+Tab','Next / previous scene')}
      ${row('Esc','Close a dialog, or step back to Command Center')}
      ${row('Space','Launch the ready mission — or pause the clock when it is auto-running (or skip/continue a playback)')}
      ${row('p','Pause / resume the clock (any scene)')}
      ${row('+ / −','Time-warp up / down (day → week → month), except on R&amp;D')}
      ${row('F1 / F2 / F3','Advance a day / week / month (press again to auto-run)')}
      ${row('h','Show / hide the top bar')}
      ${row('Arrows, + / −, 0','Pan / zoom the tech tree (R&amp;D scene only)')}
      ${row('?','Show this help')}
    </tbody></table>
    <button class="btn" onclick="hideModal()" style="margin-top:12px">OK</button>`);
}
// fire a launch from the keyboard, only when one is actually available (mirrors the Launch button gate)
function tryLaunchHotkey(){
  if(!state || state.over || animState) return;
  try{
    const m=curMission(); if(!m) return;
    const v=computeVehicle(); const sim=m.profile?simulateMission(m):null;
    if(canLaunch(v,m,sim).ok){ if(state.tab!=='bench'){ state.tab='bench'; render(); } launch(); }
  }catch(err){}
}
function clampA(v,a,b){return Math.max(a,Math.min(b,v));}
function smooth(t){return t*t*(3-2*t);}
function hx(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function mix(a,b,t){const A=hx(a),B=hx(b);return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')';}
// shade a #hex toward white (amt>0) or black (amt<0)
function shade(hex,amt){ const c=hx(hex), f=amt<0?0:255, t=Math.abs(amt); return 'rgb('+c.map(v=>Math.round(v+(f-v)*t)).join(',')+')'; }
function hashStr(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function ovBlob(ctx,x,y,r,rnd){ ctx.beginPath(); const n=8; for(let i=0;i<=n;i++){ const a=i/n*6.283, rr=r*(0.7+rnd()*0.5), px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr; i?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.closePath(); ctx.fill(); }
// per-body surface features (drawn inside the disc clip)
function planetFeatures(ctx,cx,cy,R,b){
  const rnd=mulberry(hashStr(b.id));
  if(b.id==='earth'){
    const greens=['rgba(56,116,54,0.95)','rgba(74,104,46,0.9)','rgba(96,84,48,0.7)'];
    for(let i=0;i<9;i++){ ctx.fillStyle=greens[i%3]; ovBlob(ctx,cx+(rnd()-0.5)*R*1.6,cy+(rnd()-0.5)*R*1.6,R*(0.16+rnd()*0.30),rnd); }
    ctx.fillStyle='rgba(150,120,70,0.5)'; for(let i=0;i<3;i++) ovBlob(ctx,cx+(rnd()-0.5)*R*1.3,cy+(rnd()-0.5)*R*1.3,R*0.16,rnd);
    ctx.fillStyle='rgba(244,250,255,0.9)'; ctx.beginPath(); ctx.ellipse(cx,cy-R*0.93,R*0.72,R*0.27,0,0,7); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx,cy+R*0.95,R*0.72,R*0.25,0,0,7); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.42)'; ctx.lineWidth=R*0.045; ctx.beginPath(); for(let a=0;a<6;a+=0.25){ const rr=R*0.05+a*R*0.05, x=cx+R*0.4+Math.cos(a*1.6)*rr, y=cy+R*0.3+Math.sin(a*1.6)*rr; a?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.34)'; for(let i=0;i<11;i++){ ctx.save(); ctx.translate(cx+(rnd()-0.5)*R*1.7,cy+(rnd()-0.5)*R*1.7); ctx.rotate(rnd()*3); ctx.beginPath(); ctx.ellipse(0,0,R*(0.14+rnd()*0.22),R*0.07,0,0,7); ctx.fill(); ctx.restore(); }
  } else if(b.id==='mars'){
    ctx.fillStyle='rgba(122,52,28,0.55)'; for(let i=0;i<7;i++) ovBlob(ctx,cx+(rnd()-0.5)*R*1.5,cy+(rnd()-0.5)*R*1.5,R*(0.14+rnd()*0.3),rnd);
    ctx.fillStyle='rgba(86,38,20,0.45)'; for(let i=0;i<4;i++) ovBlob(ctx,cx+(rnd()-0.5)*R*1.3,cy+(rnd()-0.5)*R*1.3,R*0.12,rnd);
    ctx.strokeStyle='rgba(70,30,16,0.6)'; ctx.lineWidth=R*0.05; ctx.beginPath(); ctx.moveTo(cx-R*0.5,cy+R*0.12); ctx.quadraticCurveTo(cx,cy+R*0.02,cx+R*0.55,cy+R*0.2); ctx.stroke(); // Valles Marineris
    ctx.fillStyle='rgba(172,92,52,0.7)'; ctx.beginPath(); ctx.arc(cx-R*0.35,cy-R*0.25,R*0.12,0,7); ctx.fill(); ctx.fillStyle='rgba(60,26,14,0.55)'; ctx.beginPath(); ctx.arc(cx-R*0.35,cy-R*0.25,R*0.04,0,7); ctx.fill(); // Olympus Mons
    for(let i=0;i<8;i++){ const x=cx+(rnd()-0.5)*R*1.6,y=cy+(rnd()-0.5)*R*1.6,cr=R*(0.03+rnd()*0.06); ctx.fillStyle='rgba(70,30,16,0.4)'; ctx.beginPath(); ctx.arc(x,y,cr,0,7); ctx.fill(); }
    ctx.fillStyle='rgba(246,248,252,0.92)'; ctx.beginPath(); ctx.ellipse(cx,cy-R*0.93,R*0.5,R*0.22,0,0,7); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx,cy+R*0.96,R*0.4,R*0.18,0,0,7); ctx.fill();
  } else if(b.id==='moon'||b.id==='phobos'){
    ctx.fillStyle='rgba(64,68,76,0.5)'; for(let i=0;i<5;i++) ovBlob(ctx,cx+(rnd()-0.5)*R*1.3,cy+(rnd()-0.5)*R*1.3,R*(0.2+rnd()*0.32),rnd);
    for(let k=0;k<2;k++){ const bx=cx+(rnd()-0.5)*R, by=cy+(rnd()-0.5)*R, br=R*(0.1+rnd()*0.05); ctx.strokeStyle='rgba(210,212,218,0.22)'; ctx.lineWidth=R*0.018; for(let a=0;a<6.28;a+=0.5){ ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+Math.cos(a)*br*3,by+Math.sin(a)*br*3); ctx.stroke(); } ctx.fillStyle='rgba(218,220,226,0.5)'; ctx.beginPath(); ctx.arc(bx,by,br,0,7); ctx.fill(); ctx.fillStyle='rgba(40,42,46,0.5)'; ctx.beginPath(); ctx.arc(bx,by,br*0.7,0,7); ctx.fill(); } // ray craters
    for(let i=0;i<22;i++){ const x=cx+(rnd()-0.5)*R*1.8,y=cy+(rnd()-0.5)*R*1.8,cr=R*(0.03+rnd()*0.11); ctx.fillStyle='rgba(38,40,45,0.5)'; ctx.beginPath(); ctx.arc(x,y,cr,0,7); ctx.fill(); ctx.strokeStyle='rgba(216,218,222,0.4)'; ctx.lineWidth=Math.max(0.5,cr*0.22); ctx.beginPath(); ctx.arc(x,y,cr,0,7); ctx.stroke(); }
  } else if(b.id==='jupiter'){
    for(let i=-7;i<=7;i++){ const yy=cy+i*R*0.13, zone=i%2===0; ctx.fillStyle=zone?'rgba(198,168,124,0.6)':'rgba(126,92,60,0.55)'; ctx.fillRect(cx-R*1.1,yy-R*0.07,R*2.2,R*0.14);
      ctx.fillStyle=zone?'rgba(150,110,72,0.28)':'rgba(210,184,140,0.22)'; for(let j=0;j<5;j++){ ctx.beginPath(); ctx.ellipse(cx-R+(j+(i%2?0.5:0))*R*0.45, yy, R*0.16, R*0.035,0,0,7); ctx.fill(); } }
    ctx.fillStyle='rgba(205,82,52,0.8)'; ctx.beginPath(); ctx.ellipse(cx+R*0.32,cy+R*0.28,R*0.22,R*0.12,0,0,7); ctx.fill(); ctx.strokeStyle='rgba(150,50,30,0.5)'; ctx.lineWidth=R*0.02; ctx.beginPath(); ctx.ellipse(cx+R*0.32,cy+R*0.28,R*0.22,R*0.12,0,0,7); ctx.stroke();
    ctx.fillStyle='rgba(240,236,220,0.5)'; ctx.beginPath(); ctx.ellipse(cx-R*0.35,cy-R*0.15,R*0.1,R*0.05,0,0,7); ctx.fill();
  } else if(b.id==='venus'){
    for(let i=0;i<11;i++){ ctx.fillStyle=(i%2)?'rgba(238,224,166,0.42)':'rgba(196,168,112,0.42)'; ctx.save(); ctx.translate(cx,cy-R+ i*R*0.20); ctx.rotate(0.2); ctx.beginPath(); ctx.ellipse(0,0,R*0.98,R*0.1,0,0,7); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle='rgba(255,245,210,0.25)'; ctx.lineWidth=R*0.04; ctx.beginPath(); for(let a=0;a<5;a+=0.3){ const rr=a*R*0.06, x=cx-R*0.2+Math.cos(a*1.5)*rr, y=cy-R*0.2+Math.sin(a*1.5)*rr; a?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.stroke();
  } else {
    ctx.fillStyle='rgba(0,0,0,0.18)'; for(let i=0;i<5;i++) ovBlob(ctx,cx+(rnd()-0.5)*R*1.3,cy+(rnd()-0.5)*R*1.3,R*(0.15+rnd()*0.25),rnd);
  }
}
const RINGED={saturn:1};
const PLANET_TEX_R=0.45, RINGED_TEX_R=0.32; // planet radius as a fraction of the texture half-size
// baked lit direction (upper-left highlight) — used to rotate the sprite so it faces the Sun
const BAKED_LIT_ANGLE=Math.atan2(-0.38,-0.38);
function texGrain(ctx,cx,cy,R,b){ const rn=mulberry(hashStr(b.id+'grain')); ctx.globalAlpha=0.06; for(let i=0;i<340;i++){ ctx.fillStyle=rn()<0.5?'#000':'#fff'; ctx.fillRect(cx+(rn()-0.5)*2*R, cy+(rn()-0.5)*2*R, Math.max(1,R*0.009), Math.max(1,R*0.009)); } ctx.globalAlpha=1; }
function ringBands(ctx,cx,cy,S){
  const tilt=-0.22;
  const bands=[[0.49,0.165,0.44,0.148,'rgba(206,188,150,0.6)'],[0.435,0.146,0.405,0.136,'rgba(150,128,92,0.45)'],[0.40,0.134,0.355,0.119,'rgba(216,202,166,0.55)']];
  for(const bd of bands){ ctx.fillStyle=bd[4]; ctx.beginPath(); ctx.ellipse(cx,cy,bd[0]*S,bd[1]*S,tilt,0,7); ctx.ellipse(cx,cy,bd[2]*S,bd[3]*S,tilt,0,7); ctx.fill('evenodd'); }
}
// draw a detailed, lit, shaded planet sphere onto a 2D context (S×S)
function drawPlanetTex(ctx,S,b){
  const ringed=RINGED[b.id], R=(ringed?RINGED_TEX_R:PLANET_TEX_R)*S, cx=S/2, cy=S/2;
  ctx.clearRect(0,0,S,S);
  if(ringed){ ctx.save(); ctx.beginPath(); ctx.rect(0,0,S,cy); ctx.clip(); ringBands(ctx,cx,cy,S); ctx.restore(); } // far half (behind)
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.clip();
  if(ringed){
    const g=ctx.createRadialGradient(cx,cy,R*0.1,cx,cy,R*1.05); g.addColorStop(0,shade(b.color,0.4)); g.addColorStop(0.6,b.color); g.addColorStop(1,shade(b.color,-0.5));
    ctx.fillStyle=g; ctx.fillRect(0,0,S,S);
    planetFeatures(ctx,cx,cy,R,b); texGrain(ctx,cx,cy,R,b);
    const v=ctx.createRadialGradient(cx,cy,R*0.45,cx,cy,R); v.addColorStop(0,'rgba(0,0,8,0)'); v.addColorStop(1,'rgba(0,0,10,0.42)'); ctx.fillStyle=v; ctx.fillRect(0,0,S,S); // symmetric limb darkening (no fixed terminator → rings can stay upright)
  } else {
    const g=ctx.createRadialGradient(cx-R*0.38,cy-R*0.38,R*0.1, cx,cy,R*1.05); g.addColorStop(0,shade(b.color,0.45)); g.addColorStop(0.55,b.color); g.addColorStop(1,shade(b.color,-0.6));
    ctx.fillStyle=g; ctx.fillRect(0,0,S,S);
    planetFeatures(ctx,cx,cy,R,b); texGrain(ctx,cx,cy,R,b);
    const tg=ctx.createRadialGradient(cx-R*0.45,cy-R*0.45,R*0.15, cx+R*0.55,cy+R*0.55,R*1.5); // directional terminator (sprite is rotated so this faces the Sun)
    tg.addColorStop(0,'rgba(0,0,10,0)'); tg.addColorStop(0.72,'rgba(0,0,10,0.22)'); tg.addColorStop(1,'rgba(0,0,12,0.78)');
    ctx.fillStyle=tg; ctx.fillRect(0,0,S,S);
    ctx.fillStyle='rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(cx-R*0.4,cy-R*0.42,R*0.2,R*0.12,-0.6,0,7); ctx.fill();
  }
  ctx.restore();
  const atm={earth:'120,180,255',venus:'232,212,150',mars:'210,140,100',jupiter:'220,190,150'}[b.id];
  if(atm){ ctx.strokeStyle=`rgba(${atm},0.5)`; ctx.lineWidth=S*0.016; ctx.beginPath(); ctx.arc(cx,cy,R+S*0.011,0,7); ctx.stroke();
    ctx.strokeStyle=`rgba(${atm},0.16)`; ctx.lineWidth=S*0.045; ctx.beginPath(); ctx.arc(cx,cy,R+S*0.028,0,7); ctx.stroke(); }
  if(ringed){ ctx.save(); ctx.beginPath(); ctx.rect(0,cy,S,S-cy); ctx.clip(); ringBands(ctx,cx,cy,S); ctx.restore(); } // near half (in front)
}

/* ── Procedural Audio (Web Audio API) ── */
let sfxCtx=null, sfxMaster=null, sfxEngNodes=[], sfxBufCache={};
function sfxInit(){
  if(!sfxCtx){
    try{ sfxCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
  }
  if(sfxCtx.state==='suspended') sfxCtx.resume();
  if(sfxMaster) sfxMaster.disconnect();
  sfxMaster=sfxCtx.createGain(); sfxMaster.gain.value=0; sfxMaster.connect(sfxCtx.destination);
  sfxMaster._baseVol=0;
}
function sfxGetBuf(key,dur,fill){
  if(sfxBufCache[key]) return sfxBufCache[key];
  if(!sfxCtx) return null;
  const sr=sfxCtx.sampleRate, buf=sfxCtx.createBuffer(1,Math.ceil(sr*dur),sr);
  fill(buf.getChannelData(0),sr);
  sfxBufCache[key]=buf;
  return buf;
}
function sfxNoiseBuf(type){
  return sfxGetBuf('n_'+type, 2, (d)=>{
    let v=0;
    for(let i=0;i<d.length;i++){
      const w=Math.random()*2-1;
      if(type==='brown'){ v=(v+0.02*w)/1.02; d[i]=v*3.5; }
      else if(type==='pink'){ v=0.99886*v+w*0.0555179; d[i]=v*0.11; }
      else d[i]=w;
    }
  });
}
function sfxStop(){
  sfxEngNodes.forEach(n=>{ try{n.stop();}catch(e){} });
  sfxEngNodes=[];
  if(sfxMaster){ sfxMaster.gain.cancelScheduledValues(sfxCtx.currentTime); sfxMaster.gain.value=0; sfxMaster._baseVol=0; }
}
function sfxLoopSrc(buf){ const s=sfxCtx.createBufferSource(); s.buffer=buf; s.loop=true; return s; }
function sfxStartEngine(engineCount, totalProp){
  if(!sfxCtx) return;
  sfxStop();
  const vol=Math.min(1.0, 0.15+0.12*Math.sqrt(engineCount)+0.06*Math.log10(Math.max(1,totalProp)));
  const s1=sfxLoopSrc(sfxNoiseBuf('brown'));
  const lp=sfxCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=80+engineCount*18; lp.Q.value=1.2;
  s1.connect(lp); lp.connect(sfxMaster); s1.start(); sfxEngNodes.push(s1);
  const sub=sfxCtx.createOscillator(); sub.type='sine'; sub.frequency.value=18+engineCount*2;
  const subG=sfxCtx.createGain(); subG.gain.value=vol*0.25;
  sub.connect(subG); subG.connect(sfxMaster); sub.start(); sfxEngNodes.push(sub);
  const rumble=sfxCtx.createOscillator(); rumble.type='sawtooth';
  rumble.frequency.value=22+engineCount*3+Math.cbrt(totalProp)*0.5;
  const rG=sfxCtx.createGain(); rG.gain.value=vol*0.22;
  rumble.connect(rG); rG.connect(sfxMaster); rumble.start(); sfxEngNodes.push(rumble);
  const mid=sfxCtx.createOscillator(); mid.type='triangle'; mid.frequency.value=40+engineCount*5;
  const mG=sfxCtx.createGain(); mG.gain.value=vol*0.10;
  mid.connect(mG); mG.connect(sfxMaster); mid.start(); sfxEngNodes.push(mid);
  const s2=sfxLoopSrc(sfxNoiseBuf('white'));
  const bp=sfxCtx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=600+engineCount*40; bp.Q.value=1.0;
  const cG=sfxCtx.createGain(); cG.gain.value=vol*0.03;
  s2.connect(bp); bp.connect(cG); cG.connect(sfxMaster); s2.start(); sfxEngNodes.push(s2);
  sfxMaster.gain.setValueAtTime(0, sfxCtx.currentTime);
  sfxMaster.gain.linearRampToValueAtTime(vol, sfxCtx.currentTime+0.3);
  sfxMaster._baseVol=vol;
}
function sfxUpdateEngine(throttle, altFrac){
  if(!sfxMaster||!sfxCtx) return;
  const atmoFade=1-Math.pow(clampA(altFrac,0,1),1.8)*0.7;
  const vol=(sfxMaster._baseVol||0.3)*throttle*atmoFade;
  sfxMaster.gain.setTargetAtTime(clampA(vol,0,1), sfxCtx.currentTime, 0.05);
}
function sfxEngineOff(){
  if(!sfxMaster||!sfxCtx) return;
  sfxMaster.gain.setTargetAtTime(0, sfxCtx.currentTime, 0.4);
}
function sfxSep(){
  if(!sfxCtx) return;
  const buf=sfxGetBuf('sep', 0.7, (d,sr)=>{
    for(let i=0;i<d.length;i++){
      const t=i/sr;
      const popEnv=t<0.002?t/0.002:(t<0.018?Math.exp(-(t-0.002)*60):0);
      const pop=Math.sin(t*400*Math.PI)*popEnv*0.55;
      const hissEnv=t<0.005?0:(t<0.025?(t-0.005)/0.02:Math.exp(-(t-0.025)*4.5));
      const hiss=(Math.random()*2-1)*hissEnv*0.4;
      d[i]=pop+hiss;
    }
  });
  const src=sfxCtx.createBufferSource(); src.buffer=buf;
  const lp=sfxCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=7000; lp.Q.value=0.5;
  const g=sfxCtx.createGain(); g.gain.value=0.5;
  src.connect(lp); lp.connect(g); g.connect(sfxCtx.destination); src.start();
}
function sfxBoom(){
  if(!sfxCtx) return;
  const buf=sfxGetBuf('boom', 2.2, (d,sr)=>{
    let v=0;
    for(let i=0;i<d.length;i++){
      const t=i/sr;
      const env=t<0.008?t/0.008:(t<0.2?1:Math.exp(-(t-0.2)*2.2));
      const sub1=Math.sin(t*50*Math.PI)*Math.exp(-t*2.5)*0.8;
      const sub2=Math.sin(t*30*Math.PI)*Math.exp(-t*1.8)*0.5;
      v=(v+0.05*(Math.random()*2-1))/1.05;
      d[i]=(v*6+sub1+sub2+(Math.random()*2-1)*0.25)*env;
    }
  });
  const src=sfxCtx.createBufferSource(); src.buffer=buf;
  const lp=sfxCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=400; lp.Q.value=0.8;
  const g=sfxCtx.createGain(); g.gain.value=0.8;
  src.connect(lp); lp.connect(g); g.connect(sfxCtx.destination); src.start();
}
function sfxSplash(){
  if(!sfxCtx) return;
  const buf=sfxGetBuf('splash', 1.1, (d,sr)=>{ for(let i=0;i<d.length;i++){ const t=i/sr;
    const env=t<0.01?t/0.01:Math.exp(-(t)*4.5); d[i]=(Math.random()*2-1)*env*0.8; } });
  const src=sfxCtx.createBufferSource(); src.buffer=buf;
  const bp=sfxCtx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400; bp.Q.value=0.7;
  const g=sfxCtx.createGain(); g.gain.value=0.5;
  src.connect(bp); bp.connect(g); g.connect(sfxCtx.destination); src.start();
  const th=sfxCtx.createOscillator(); th.type='sine'; th.frequency.setValueAtTime(120,sfxCtx.currentTime); th.frequency.exponentialRampToValueAtTime(45,sfxCtx.currentTime+0.25);
  const tg=sfxCtx.createGain(); tg.gain.setValueAtTime(0.4,sfxCtx.currentTime); tg.gain.exponentialRampToValueAtTime(0.001,sfxCtx.currentTime+0.3);
  th.connect(tg); tg.connect(sfxCtx.destination); th.start(); th.stop(sfxCtx.currentTime+0.32);
}
function sfxBurn(intensity){
  if(!sfxCtx) return;
  const s=sfxLoopSrc(sfxNoiseBuf('brown'));
  const lp=sfxCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=100; lp.Q.value=0.8;
  const g=sfxCtx.createGain(); g.gain.value=clampA(intensity*0.14,0.03,0.18);
  s.connect(lp); lp.connect(g); g.connect(sfxCtx.destination); s.start(); sfxEngNodes.push(s);
  const sub=sfxCtx.createOscillator(); sub.type='sine'; sub.frequency.value=22;
  const sg=sfxCtx.createGain(); sg.gain.value=intensity*0.06;
  sub.connect(sg); sg.connect(sfxCtx.destination); sub.start(); sfxEngNodes.push(sub);
}

