/* ---------- flight animation (canvas) ---------- */
let animEnabled=true, animState=null;
// Liftoff lead-in (iso-view rocket rise + camera zoom-chase, handed off into playMission).
// _liftoffArmed is set per interactive launch and consumed once at the ascent handoff; deferred
// arrivals never arm it (they resolve turns later, when a different vehicle may sit on the pad).
let _liftoffArmed=false, _liftoff=null, _liftoffRAF=0;
const ANIM_SPEEDS=[{label:'0.1×  Slow-mo',mult:0.1},{label:'¼×  Slow-mo',mult:0.25},{label:'1×  Normal',mult:1},{label:'2×  Fast',mult:2},{label:'5×  Fast',mult:5},{label:'10×  Fast',mult:10},{label:'25×  Fast',mult:25},{label:'50×  Fast',mult:50}];
let animSpeedIdx=0; // default to deliberate launch viewing; players can still cycle to 50× for long coasts
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
  // The Command Center blue HUD is the current product baseline. Keep the picker API
  // intact for the later theme pass, but do not let persisted theme choices recolor the UI.
  name='dark'; currentTheme=name;
  try{ localStorage.setItem('ov_theme', 'dark'); }catch(e){}
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
// Sound on/off — a display-like preference persisted in localStorage (NOT the save), mirroring
// ov_theme/ov_wide; default ON. Gates the single top-level SFX master bus (sfxBus) so one toggle
// silences ALL audio — engine rumble, staging/explosion/splashdown one-shots, and countdown tones.
let soundOn=true;
try{ const v=localStorage.getItem('ov_sound'); if(v!==null) soundOn=(v==='1'); }catch(e){}
function applySoundSetting(){ if(sfxBus&&sfxCtx){ try{ sfxBus.gain.setValueAtTime(soundOn?1:0, sfxCtx.currentTime); }catch(e){} } }
function toggleSound(){ soundOn=!soundOn; try{ localStorage.setItem('ov_sound', soundOn?'1':'0'); }catch(e){} applySoundSetting(); }
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
    if(devPanelOpen){ closeDevPanel(); e.preventDefault(); return; } // dev menu closes first (its own overlay, layered ahead of the modal/scene-back checks)
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
/* ============================================================================
   DEV / CHEAT MENU (Ctrl+Shift+D) — dev-only manual-testing tool. NEVER shown to
   real players. Fast-forwards time and manipulates state so late-timeline features
   (station docking, Mars ops, late-era content) can be tested without a real grind.
   Open state is a plain module-level bool (like techExpanded/hubPanel) — NOT in
   `state`, so it never lands in a save. Every mutation drives the REAL sim functions
   (advance/advanceDays/foundFacility/addStationModule/…) so all side effects fire.
   ========================================================================== */
let devPanelOpen=false;
function toggleDevPanel(){ devPanelOpen?closeDevPanel():openDevPanel(); }
function openDevPanel(){ const p=$('devPanel'); if(!p) return; devPanelOpen=true; p.innerHTML=devPanelHtml(); p.classList.remove('hidden'); }
function closeDevPanel(){ const p=$('devPanel'); if(p) p.classList.add('hidden'); devPanelOpen=false; }
// re-render the whole page (so mutations show) AND refresh the panel's own live readouts. The panel is
// a fixed element OUTSIDE #app, so render() never wipes it — we just re-fill its innerHTML for the readout.
function devRefresh(){ try{ render(); }catch(e){} if(devPanelOpen){ const p=$('devPanel'); if(p) p.innerHTML=devPanelHtml(); } }
function devReadInput(id){ const el=$(id); if(!el) return NaN; return parseFloat(el.value); }
// ---- time: always through the REAL tick functions, never a raw state.year write ----
function devAdvanceDays(d){ if(!state||state.over) return; advanceDays(d); devRefresh(); }
function devAdvanceMonths(mo){ if(!state||state.over) return; advance(mo); devRefresh(); }
// Advance in 12-month batches until state.year >= targetYear (per-batch so a long jump — pioneer→
// speculative is ~160 yr — isn't a single 57k-day tight loop, and side effects settle periodically).
// A pure time-skip earns no income, so decades of overhead would bankrupt an early company and trip
// gameOver mid-jump — defeating the whole point (reliably reaching later content). We top the treasury
// back to a floor before each batch so the skip always completes; the real tick path is otherwise
// untouched. (Documented state side effect: an era/late-game jump leaves the company solvent.)
function devAdvanceToYear(targetYear){
  let guard=0;
  while(state.year<targetYear && !state.over && guard++<5000){
    if(state.money<DEV_SKIP_MONEY_FLOOR) state.money=DEV_SKIP_MONEY_FLOOR; // keep solvent through the skip
    const monthsLeft=(targetYear-state.year)*12 - (state.month||0);
    advance(Math.min(Math.max(1,monthsLeft), 12));
  }
}
const DEV_SKIP_MONEY_FLOOR=1000; // $1B floor kept during a time-skip so overhead can't bankrupt the jump
function devJumpEra(eraId){ const era=ERAS.find(e=>e.id===eraId); if(!era||!state||state.over) return; if(state.year<era.from) devAdvanceToYear(era.from); devRefresh(); }
// ---- money / rep / science: number-input Add / Set-to ----
function devAddMoney(){ const v=devReadInput('devMoneyInput'); if(!isNaN(v)){ state.money+=v; devRefresh(); } }
function devSetMoney(){ const v=devReadInput('devMoneyInput'); if(!isNaN(v)){ state.money=v; devRefresh(); } }
function devAddRep(){ const v=devReadInput('devRepInput'); if(!isNaN(v)){ state.rep=Math.max(0,(state.rep||0)+v); devRefresh(); } } // floor at 0, matching the codebase convention (no ceiling)
function devSetRep(){ const v=devReadInput('devRepInput'); if(!isNaN(v)){ state.rep=Math.max(0,v); devRefresh(); } }
function devAddScience(){ const v=devReadInput('devSciInput'); if(!isNaN(v)){ state.science=(state.science||0)+v; devRefresh(); } }
function devSetScience(){ const v=devReadInput('devSciInput'); if(!isNaN(v)){ state.science=v; devRefresh(); } }
// ---- unlock everything: removes GATES only (research/tech-level/rep). It does NOT found facilities,
// design vehicles, or complete missions — "unlock" opens doors, it doesn't play the game for you. ----
function devUnlockAllResearch(){
  state.research=state.research||{};
  for(const r of RESEARCH) state.research[r.id]=true;
  state.techLevel=state.techLevel||{};
  for(const id in TECH_LEVELS) state.techLevel[id]=TECH_LEVELS[id].max; // max the leveled techs too (real cap read from TECH_LEVELS)
  try{ reconcileResearch(); }catch(e){} // re-apply engine/capability unlocks the boolean flags imply
}
function devUnlockAll(){ devUnlockAllResearch(); devRefresh(); }
function devMaxRep(){ state.rep=100; devRefresh(); } // 100 clears every partnerUnlocked() rep gate; no hard ceiling exists so we don't invent one
// ---- force flight outcome / decision event (single-shot; the sim vars self-clear on first use) ----
function devForceOutcome(kind){ _devForceOutcome=kind; devToast('Next launch outcome forced: '+kind); }
function devForceLiveCall(){ _devForceLiveCall=true; devToast('Next launch will fire a live-call decision.'); }
function devForceReserve(){ _devForceReserve=true; devToast('Next launch will fire a reserve-call decision.'); }
function devForceWeather(){ _devForceWeather=true; devToast('Next launch will hit an adverse-weather scrub.'); }
function devToast(msg){ try{ log('note','DEV: '+msg); }catch(e){} if(devPanelOpen){ const el=$('devStatus'); if(el) el.textContent=msg; } }
// ---- presets ----
// "Fast-forward to late game": advance to the Expansion era (2030) via the REAL advance(), then unlock
// all research, grant a large treasury, and max rep. (money is in $M — 2000 renders as $2,000.00M ≈ $2B.)
function devPresetLateGame(){
  if(!state||state.over) return;
  if(state.year<2030) devAdvanceToYear(2030);
  devUnlockAllResearch();
  state.money=2000; // $2B in the game's $M units
  state.rep=100;
  devToast('Fast-forwarded to late game (≥2030), all research unlocked, treasury + rep maxed.');
  devRefresh();
}
// "LEO station, pre-stocked": ensure a real LEO facility exists (foundFacility) and dock 3 distinct
// module types onto it via the REAL docking path (addStationModule → dockModuleNow). Grants money and
// removes the founding gate (the reqMission) up front — gate removal, same spirit as "unlock all".
function devPresetStation(){
  if(!state||state.over) return;
  const def=facilityById('leo_station');
  if(def.reqMission && !state.completed[def.reqMission]) state.completed[def.reqMission]=true; // remove the founding gate (can't "fly" crew_orbit from here)
  if(state.money<600) state.money=600; // ensure founding + modules are affordable (real functions charge real cost)
  if(!facilityBuilt('leo_station')) foundFacility('leo_station'); // real founding: charges cost, advances construction months
  if(!state.over){
    for(const mid of ['lab_mod','power_truss','node_hub']){ // 3 distinct types (none gated by research); core is already a Habitat
      const fs=facilityState('leo_station');
      if(fs && facilityModuleList(fs).includes(mid)) continue;
      if(state.money<200) state.money=200;
      addStationModule('leo_station', mid); // real dock: charges cost, advances build months, calls dockModuleNow
    }
  }
  devToast('LEO Station founded and pre-stocked with Lab, Power Truss, and Docking Node modules.');
  devRefresh();
}
// ---- panel markup (built fresh on open / after each mutation for live readouts) ----
function devPanelHtml(){
  const btn=(label,onclick,extra)=>`<button onclick="${onclick}" style="cursor:pointer;background:#102c43;color:#bde8ff;border:1px solid #2d5c7a;border-radius:4px;padding:4px 7px;font:inherit;margin:2px 3px 2px 0;${extra||''}">${label}</button>`;
  const num=(id,val,ph)=>`<input id="${id}" type="number" value="${val}" placeholder="${ph||''}" style="width:88px;background:#071523;color:#d9efff;border:1px solid #2d5c7a;border-radius:4px;padding:3px 5px;font:inherit">`;
  const sect=(title,body)=>`<div style="border-top:1px solid #2d5c7a;padding:9px 12px">
    <div style="color:#58c7ff;font-weight:bold;letter-spacing:0.5px;font-size:11px;margin-bottom:5px">${title}</div>${body}</div>`;
  const eraBtns=ERAS.map(e=>btn(e.name+' <span style="opacity:0.6">'+e.from+'</span>',`devJumpEra('${e.id}')`)).join('');
  const yr=state?`${(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][state.month]||'')} ${state.year}`:'—';
  const readout=state?`money <b style="color:#7fe3a0">$${(state.money||0).toFixed(1)}M</b> · rep <b style="color:#8fc4ff">${Math.round(state.rep||0)}</b> · sci <b style="color:#c9a8ff">${Math.round(state.science||0)}</b>`:'';
  return `<div style="position:sticky;top:0;background:#0b2033;border-bottom:2px solid #58c7ff;padding:9px 12px;display:flex;align-items:center;justify-content:space-between">
      <div><span style="color:#58c7ff;font-weight:bold;letter-spacing:1px">⚠ DEV MODE</span>
        <div style="opacity:0.6;font-size:10px;margin-top:2px">manual testing · not shown to players</div></div>
      <button onclick="closeDevPanel()" title="Close (Esc)" style="cursor:pointer;background:transparent;color:#8de5ff;border:1px solid #2d5c7a;border-radius:4px;padding:2px 8px;font:inherit;font-size:14px">✕</button>
    </div>
    <div style="padding:7px 12px;background:#071523;color:#bde8ff;font-size:11px">${yr} · ${readout}</div>
    ${sect('TIME  (real tick path)',
      btn('+1 day',"devAdvanceDays(1)")+btn('+1 week',"devAdvanceDays(7)")+btn('+1 month',"devAdvanceMonths(1)")+btn('+1 year',"devAdvanceMonths(12)")+btn('+5 years',"devAdvanceMonths(60)")+
      `<div style="margin-top:6px;opacity:0.7;font-size:10px">Jump to era (no-op if already past):</div>`+eraBtns)}
    ${sect('MONEY / REP / SCIENCE',
      `<div style="margin-bottom:4px">Money ($M): ${num('devMoneyInput',100)} ${btn('Add',"devAddMoney()")}${btn('Set to',"devSetMoney()")}</div>
       <div style="margin-bottom:4px">Rep: ${num('devRepInput',10)} ${btn('Add',"devAddRep()")}${btn('Set to',"devSetRep()")}</div>
       <div>Science: ${num('devSciInput',10)} ${btn('Add',"devAddScience()")}${btn('Set to',"devSetScience()")}</div>`)}
    ${sect('UNLOCKS  (gates only)',
      btn('Unlock all research',"devUnlockAll()")+btn('Max reputation',"devMaxRep()"))}
    ${sect('FORCE OUTCOME  (single-shot, next launch)',
      btn('Success',"devForceOutcome('success')")+btn('Partial',"devForceOutcome('partial')")+btn('Fail (loss)',"devForceOutcome('loss')")+btn('Strand',"devForceOutcome('strand')")+
      `<div style="margin-top:5px">`+btn('Live call',"devForceLiveCall()")+btn('Reserve call',"devForceReserve()")+btn('Weather scrub',"devForceWeather()")+`</div>`)}
    ${sect('PRESETS',
      btn('⏩ Fast-forward to late game',"devPresetLateGame()",'display:block;width:100%;text-align:left')+
      btn('🛰 LEO station, pre-stocked',"devPresetStation()",'display:block;width:100%;text-align:left'))}
    <div id="devStatus" style="padding:8px 12px;border-top:1px solid #2d5c7a;color:#9fd8a0;font-size:10px;min-height:14px"></div>`;
}
// Ctrl+Shift+D toggles the dev panel. Guarded exactly like the 'p' / F1-F3 handlers (no modal open, no
// mid-animation, not typing). This combo is otherwise unbound (audited: nothing uses ctrl/meta/shift today).
document.addEventListener('keydown',function(e){
  if(!(e.ctrlKey && e.shiftKey && (e.key==='D'||e.key==='d'))) return;
  if(e.altKey||e.metaKey) return;
  if(!state || animState || modalOpen()) return;
  if(isTyping(e)) return;
  toggleDevPanel(); e.preventDefault();
});
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
let sfxCtx=null, sfxBus=null, sfxMaster=null, sfxEngNodes=[], sfxBufCache={};
// Engine-sound redesign (2026-07-12): per-layer gain nodes kept here so sfxUpdateEngine can crossfade the
// MIX (not just overall volume) across flight phases; the quiet pre-ignition countdown bed; and the next
// scheduled crackle-burst time. All transient (nulled by sfxStop), never persisted.
let sfxEngLayers=null, sfxCountdown=null, sfxCrackleNext=0;
function sfxInit(){
  if(!sfxCtx){
    try{ sfxCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
  }
  if(sfxCtx.state==='suspended') sfxCtx.resume();
  // sfxBus is the ONE real top-level master everything routes through (engine envelope + one-shots +
  // countdown tones), gated by the ov_sound preference so a single toggle silences all audio. Created
  // once; sfxMaster below is only the engine-rumble volume envelope and now feeds the bus, not destination.
  if(!sfxBus){ sfxBus=sfxCtx.createGain(); sfxBus.connect(sfxCtx.destination); }
  sfxBus.gain.value=(typeof soundOn==='undefined'||soundOn)?1:0; // reflect the persisted mute on every (re)init
  if(sfxMaster) sfxMaster.disconnect();
  sfxMaster=sfxCtx.createGain(); sfxMaster.gain.value=0; sfxMaster.connect(sfxBus);
  sfxMaster._baseVol=0;
}
// Countdown/liftoff tone — a clean short beep (quindar-flavor). Procedural oscillator like the rest of
// the system; routed through the master bus (mute silences it) and tracked in sfxEngNodes so a skip/
// dismiss sfxStop() cancels any still-scheduled blip (no dangling tones). Connects to the bus, not the
// engine envelope, so it isn't scaled by throttle/altitude fades.
function sfxBlip(freq, dur, vol){
  if(!sfxCtx||!sfxBus) return;
  const t=sfxCtx.currentTime; dur=dur||0.12; vol=vol||0.16;
  const o=sfxCtx.createOscillator(); o.type='sine'; o.frequency.value=freq;
  const g=sfxCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t+0.008);
  g.gain.setValueAtTime(vol, t+Math.max(0.02,dur-0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t+dur+0.02);
  sfxEngNodes.push(o);
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
  sfxEngLayers=null; sfxCountdown=null; // drop per-layer/countdown refs so a stale flight's nodes aren't touched
  if(sfxMaster){ sfxMaster.gain.cancelScheduledValues(sfxCtx.currentTime); sfxMaster.gain.value=0; sfxMaster._baseVol=0; }
}
function sfxLoopSrc(buf){ const s=sfxCtx.createBufferSource(); s.buffer=buf; s.loop=true; return s; }
// Engine-sound redesign (2026-07-12, user's 5-layer procedural spec). Each layer has its OWN fixed
// mix-ratio gain node (0-1); the overall vol/throttle/altitude scaling lives ONLY in sfxMaster's envelope
// (set per frame by sfxUpdateEngine) so nothing is scaled by vol twice (the vol² near-silence trap fixed
// earlier today). sfxUpdateEngine crossfades those per-layer ratios across flight phases via qNorm/altFrac.
// Frequencies stay above the ~30-35Hz floor most laptop speakers can't reproduce; noise layers meant as
// "rumble" (brown, sawtooth) are lowpassed so their raw grain reads as smooth rumble, not buzz.
function sfxStartEngine(engineCount, totalProp){
  if(!sfxCtx) return;
  sfxStop();
  const vol=Math.min(1.0, 0.22+0.14*Math.sqrt(engineCount)+0.07*Math.log10(Math.max(1,totalProp)));
  const ec=engineCount||1, tp=Math.max(1,totalProp||0);
  // Layer 1 — brown noise, lowpass ~200Hz: the deep rumble bed.
  const s1=sfxLoopSrc(sfxNoiseBuf('brown'));
  const s1lp=sfxCtx.createBiquadFilter(); s1lp.type='lowpass'; s1lp.frequency.value=190+ec*6; s1lp.Q.value=0.7;
  const brownG=sfxCtx.createGain(); brownG.gain.value=0.42;
  s1.connect(s1lp); s1lp.connect(brownG); brownG.connect(sfxMaster); s1.start(); sfxEngNodes.push(s1);
  // Layer 2 — pink noise, bandpass ~100-500Hz: the engine roar. (sfxNoiseBuf('pink') already existed, unused.)
  const s2=sfxLoopSrc(sfxNoiseBuf('pink'));
  const s2bp=sfxCtx.createBiquadFilter(); s2bp.type='bandpass'; s2bp.frequency.value=250; s2bp.Q.value=0.55;
  const pinkG=sfxCtx.createGain(); pinkG.gain.value=0.35;
  s2.connect(s2bp); s2bp.connect(pinkG); pinkG.connect(sfxMaster); s2.start(); sfxEngNodes.push(s2);
  // Layer 3 — sawtooth ~55-70Hz ("shifted up for laptops"), lowpassed to tame harmonic buzz: fake bass.
  const saw=sfxCtx.createOscillator(); saw.type='sawtooth'; saw.frequency.value=55+ec*2+Math.cbrt(tp)*0.7;
  const sawLp=sfxCtx.createBiquadFilter(); sawLp.type='lowpass'; sawLp.frequency.value=140; sawLp.Q.value=0.7;
  const sawG=sfxCtx.createGain(); sawG.gain.value=0.30;
  saw.connect(sawLp); sawLp.connect(sawG); sawG.connect(sfxMaster); saw.start(); sfxEngNodes.push(saw);
  // Layer 4 — white noise, bandpass ~500-3000Hz: combustion hiss. Near-silent floor; qNorm drives it up.
  const s4=sfxLoopSrc(sfxNoiseBuf('white'));
  const s4bp=sfxCtx.createBiquadFilter(); s4bp.type='bandpass'; s4bp.frequency.value=1200; s4bp.Q.value=0.5;
  const whiteG=sfxCtx.createGain(); whiteG.gain.value=0.05;
  s4.connect(s4bp); s4bp.connect(whiteG); whiteG.connect(sfxMaster); s4.start(); sfxEngNodes.push(s4);
  // Layer 5 (crackle, 3-8kHz shock-diamond/instability transients) is NOT a sustained source — it's
  // scheduled as short bursts in sfxUpdateEngine, its rate rising with qNorm.
  sfxEngLayers={ brown:{g:brownG,base:0.42}, pink:{g:pinkG,base:0.35}, saw:{g:sawG,base:0.30}, white:{g:whiteG,base:0.14} };
  sfxCrackleNext=0;
  sfxIgnitionBurst(vol); // sharp ignition transient layered under the sustained loop just starting
  // sfxUpdateEngine's per-frame setTargetAtTime (called the same/next frame via drawPad's drawAscent(0,false))
  // owns the ramp-up; a competing linearRampToValueAtTime here would race it with no cancelScheduledValues.
  sfxMaster.gain.cancelScheduledValues(sfxCtx.currentTime);
  sfxMaster.gain.value=0;
  sfxMaster._baseVol=vol;
}
// Per-frame engine mix. sfxMaster's gain = overall vol×throttle×altitude (unchanged idiom). On top of that,
// crossfade the per-layer RATIOS by phase: deep/low-biased at rest (hold-down: q=0,af=0), high-end (white +
// scheduled crackle) up during Max-Q for turbulence/buffeting, and leaner/more-tonal at altitude (thinner
// air): brown recedes, saw is boosted, white/crackle fall away. qNorm defaults to 0 (pad hold-down / any
// caller that doesn't pass it) — the deep baseline voice.
function sfxUpdateEngine(throttle, altFrac, qNorm){
  if(!sfxMaster||!sfxCtx) return;
  const t=sfxCtx.currentTime, af=clampA(altFrac,0,1), q=clampA(qNorm||0,0,1);
  const atmoFade=1-Math.pow(af,1.8)*0.7;
  const baseVol=(sfxMaster._baseVol!=null)?sfxMaster._baseVol:0.3; // 0 is a valid pre-ignition value, not "unset"
  const vol=baseVol*throttle*atmoFade;
  sfxMaster.gain.setTargetAtTime(clampA(vol,0,1), t, 0.05);
  const L=sfxEngLayers; if(!L) return;
  const buffet=1 + q*0.28*(Math.random()*2-1); // fast per-frame gain jitter during Max-Q reads as buffeting
  L.brown.g.gain.setTargetAtTime(L.brown.base*(1-0.35*af), t, 0.08);          // deep bed recedes a little at altitude
  L.pink.g.gain.setTargetAtTime(clampA(L.pink.base*(1-0.15*af)*buffet,0,1), t, 0.06); // roar mostly persists
  L.saw.g.gain.setTargetAtTime(L.saw.base*(1+0.30*af), t, 0.08);              // tonal focus grows at altitude
  L.white.g.gain.setTargetAtTime(clampA(L.white.base*(0.35+q*1.25)*(1-0.55*af)*buffet,0,1), t, q>0.3?0.02:0.06); // hiss up at Max-Q, gone at altitude
  // Crackle bursts — scheduled on the audio clock (frame-rate independent); silent in the deep hold-down
  // (q≈0), faster during Max-Q. Routed through sfxMaster (so vol/throttle/altitude apply once, no double-scale).
  if(t>=sfxCrackleNext && q>0.04){
    sfxCrackle(0.3+q*0.8);
    sfxCrackleNext = t + 0.05 + Math.random()*(0.45 - q*0.35);
  }
}
function sfxEngineOff(){
  if(!sfxMaster||!sfxCtx) return;
  sfxMaster.gain.setTargetAtTime(0, sfxCtx.currentTime, 0.4);
}
// Countdown presence + pre-swell. A subtle low filtered-noise bed under the T-4→T-1 blips (not a literal
// hydraulics sim), routed straight to the bus (NOT sfxMaster, whose envelope is still 0 pre-ignition), with
// a slow ~0.8Hz LFO wobble = "spooling up" anticipation. `frac` is countdown progress 0→1 (padU/PAD_HOLD_FRAC);
// the bed swells toward ignition. sfxStop (called by sfxStartEngine at ignition, and on skip/dismiss) cuts it.
function sfxCountdownBed(frac){
  if(!sfxCtx||!sfxBus) return;
  if(sfxMaster && sfxMaster._baseVol>0) return; // engine already ignited — no countdown bed
  if(!sfxCountdown){
    const s=sfxLoopSrc(sfxNoiseBuf('brown'));
    const lp=sfxCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=130; lp.Q.value=0.7;
    const g=sfxCtx.createGain(); g.gain.value=0.0001;
    s.connect(lp); lp.connect(g); g.connect(sfxBus); s.start();
    const lfo=sfxCtx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.8; // slow spool wobble
    const lfoG=sfxCtx.createGain(); lfoG.gain.value=0.010;
    lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start(); // LFO ADDS to g.gain's intrinsic (set below) — no ramp/setTarget race
    sfxCountdown={g}; sfxEngNodes.push(s, lfo);
  }
  const u=clampA(frac,0,1);
  sfxCountdown.g.gain.setTargetAtTime(0.012 + 0.05*u*u, sfxCtx.currentTime, 0.1); // quiet → pre-swell toward ignition
}
// Ignition transient — one sharp, short burst layered UNDER the sustained loop. Adapted from the sfxBoom
// noise-burst shape (shorter/punchier) plus a quick low thump. Routed straight to the bus so it hits at full
// punch, independent of sfxMaster's envelope (which starts at 0 and ramps up across the hold-down).
function sfxIgnitionBurst(vol){
  if(!sfxCtx||!sfxBus) return;
  const t=sfxCtx.currentTime;
  const buf=sfxGetBuf('ign', 0.55, (d,sr)=>{ let v=0; for(let i=0;i<d.length;i++){ const tt=i/sr;
    const env=tt<0.006?tt/0.006:Math.exp(-(tt-0.006)*7);
    v=(v+0.05*(Math.random()*2-1))/1.05; d[i]=(v*4+(Math.random()*2-1)*0.5)*env; } });
  const src=sfxCtx.createBufferSource(); src.buffer=buf;
  const lp=sfxCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900; lp.Q.value=0.7;
  const g=sfxCtx.createGain(); g.gain.value=clampA(0.45+vol*0.5,0,1);
  src.connect(lp); lp.connect(g); g.connect(sfxBus); src.start(t); src.stop(t+0.58); sfxEngNodes.push(src);
  const o=sfxCtx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(55,t+0.22);
  const og=sfxCtx.createGain(); og.gain.setValueAtTime(0.0001,t); og.gain.linearRampToValueAtTime(clampA(0.4+vol*0.4,0,1),t+0.01); og.gain.exponentialRampToValueAtTime(0.0001,t+0.3);
  o.connect(og); og.connect(sfxBus); o.start(t); o.stop(t+0.32); sfxEngNodes.push(o);
}
// Crackle burst — a short 3-8kHz noise transient (shock diamonds / combustion instability). Routed through
// sfxMaster so overall vol/throttle/altitude apply once (no pre-scaling by vol → no double-scale). Self-stops.
function sfxCrackle(level){
  if(!sfxCtx||!sfxMaster||level<=0.001) return;
  const t=sfxCtx.currentTime, dur=0.03+Math.random()*0.05;
  const buf=sfxGetBuf('crackle', 0.1, (d,sr)=>{ for(let i=0;i<d.length;i++){ d[i]=(Math.random()*2-1)*Math.exp(-(i/sr)*40); } });
  const src=sfxCtx.createBufferSource(); src.buffer=buf;
  const bp=sfxCtx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=3000+Math.random()*4500; bp.Q.value=0.8;
  const g=sfxCtx.createGain(); g.gain.value=clampA(level*0.5,0,0.6);
  src.connect(bp); bp.connect(g); g.connect(sfxMaster); src.start(t); src.stop(t+dur+0.02);
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
  src.connect(lp); lp.connect(g); g.connect(sfxBus||sfxCtx.destination); src.start();
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
  src.connect(lp); lp.connect(g); g.connect(sfxBus||sfxCtx.destination); src.start();
}
function sfxSplash(){
  if(!sfxCtx) return;
  const buf=sfxGetBuf('splash', 1.1, (d,sr)=>{ for(let i=0;i<d.length;i++){ const t=i/sr;
    const env=t<0.01?t/0.01:Math.exp(-(t)*4.5); d[i]=(Math.random()*2-1)*env*0.8; } });
  const src=sfxCtx.createBufferSource(); src.buffer=buf;
  const bp=sfxCtx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400; bp.Q.value=0.7;
  const g=sfxCtx.createGain(); g.gain.value=0.5;
  src.connect(bp); bp.connect(g); g.connect(sfxBus||sfxCtx.destination); src.start();
  const th=sfxCtx.createOscillator(); th.type='sine'; th.frequency.setValueAtTime(120,sfxCtx.currentTime); th.frequency.exponentialRampToValueAtTime(45,sfxCtx.currentTime+0.25);
  const tg=sfxCtx.createGain(); tg.gain.setValueAtTime(0.4,sfxCtx.currentTime); tg.gain.exponentialRampToValueAtTime(0.001,sfxCtx.currentTime+0.3);
  th.connect(tg); tg.connect(sfxBus||sfxCtx.destination); th.start(); th.stop(sfxCtx.currentTime+0.32);
}
function sfxBurn(intensity){
  if(!sfxCtx) return;
  const s=sfxLoopSrc(sfxNoiseBuf('brown'));
  const lp=sfxCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=100; lp.Q.value=0.8;
  const g=sfxCtx.createGain(); g.gain.value=clampA(intensity*0.14,0.03,0.18);
  s.connect(lp); lp.connect(g); g.connect(sfxBus||sfxCtx.destination); s.start(); sfxEngNodes.push(s);
  const sub=sfxCtx.createOscillator(); sub.type='sine'; sub.frequency.value=22;
  const sg=sfxCtx.createGain(); sg.gain.value=intensity*0.06;
  sub.connect(sg); sg.connect(sfxBus||sfxCtx.destination); sub.start(); sfxEngNodes.push(sub);
}
