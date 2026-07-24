// Solar System map improvement pass, Slice B (2026-07-24) — WASD/arrow-key navigation across all
// three render paths (3D orbit camera, Phaser pan/zoom, SVG click-to-zoom fallback) plus the shared
// SVG popout (map + station, since they share initSvgPopZoom's pan/zoom state). Each renderer gets a
// keyboard scheme matched to its OWN existing interaction model (free camera vs. click-to-zoom) —
// same principle Slice A used for angle-vs-radius. A real bug was caught mid-implementation: the
// existing selectBody() auto-zooms on its first call, which would have made the very first
// left/right press in the overview zoom in immediately instead of just browsing — this suite locks
// in the fixed browse-then-confirm behavior, not just the original (broken) design intent.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- svgMapKeyNav: overview mode browses without committing to a zoom ----------
{
  newGame('engineer');
  state.selectedBody='earth'; state.mapZoom=null;
  check('right arrow moves the cursor to the next top-level body', (svgMapKeyNav('ArrowRight'), state.selectedBody==='mars'));
  check('...but does NOT auto-zoom (this was the real bug caught while building this)', state.mapZoom===null);
  check('left arrow moves back', (svgMapKeyNav('ArrowLeft'), state.selectedBody==='earth'));
  check('still not zoomed after browsing back and forth', state.mapZoom===null);
  check('cycling wraps at the end of the list', (()=>{ state.selectedBody='oort'; svgMapKeyNav('ArrowRight'); return state.selectedBody==='mercury'; })());
  check('cycling wraps at the start of the list', (()=>{ state.selectedBody='mercury'; svgMapKeyNav('ArrowLeft'); return state.selectedBody==='oort'; })());
}

// ---------- svgMapKeyNav: up/enter commits to a zoom, down/escape backs out ----------
{
  newGame('engineer');
  state.selectedBody='mars'; state.mapZoom=null;
  check('up arrow commits to zooming the current selection', (svgMapKeyNav('ArrowUp'), state.mapZoom==='mars'));
  check('escape zooms back out to the overview', (svgMapKeyNav('Escape'), state.mapZoom===null));
  state.selectedBody='venus';
  check('Enter also commits to zoom (not just w/ArrowUp)', (svgMapKeyNav('Enter'), state.mapZoom==='venus'));
  check('Backspace also zooms out (not just Escape/s/ArrowDown)', (svgMapKeyNav('Backspace'), state.mapZoom===null));
}

// ---------- svgMapKeyNav: once already zoomed, arrows flip directly between bodies ----------
{
  newGame('engineer');
  state.selectedBody='earth'; state.mapZoom='earth';
  svgMapKeyNav('ArrowRight');
  check('while zoomed, right arrow flips the ZOOM to the next body (no extra confirm needed)', state.mapZoom==='mars' && state.selectedBody==='mars');
  svgMapKeyNav('ArrowLeft');
  check('while zoomed, left arrow flips back', state.mapZoom==='earth' && state.selectedBody==='earth');
}

// ---------- svgMapKeyNav: unhandled keys return false (so the caller doesn't preventDefault) ----------
{
  newGame('engineer');
  check('an unrelated key is not handled', svgMapKeyNav('x')===false);
  check('Tab is not handled (reserved for popout cycling elsewhere)', svgMapKeyNav('Tab')===false);
}

// ---------- map3dKeyNav / phaserMapKeyNav: safe no-ops when nothing is mounted ----------
{
  check('map3dKeyNav returns false when map3d is not mounted (no throw)', map3dKeyNav('w')===false);
  check('phaserMapKeyNav returns false when no Phaser scene is mounted (no throw)', phaserMapKeyNav('w')===false);
}

// ---------- svgPopKeyNav: shared by map + station popouts, correct pan-sign inversion ----------
{
  // st.x/st.y are a CONTENT offset; a keyboard "d" (move the view right) must shift content LEFT —
  // the inverse of what a rightward drag does — verified against a mock so the actual sign is locked
  // in without needing a real DOM/pointermove sequence.
  let calls=[];
  const mockSt={keyPan:(dx,dy)=>calls.push(['pan',dx,dy]), keyZoom:(m)=>calls.push(['zoom',m])};
  svgPopKeyNav(mockSt,'d');
  check('"d" pans content LEFT (negative dx) — inverse of a rightward drag', calls[0][0]==='pan' && calls[0][1]<0 && calls[0][2]===0);
  calls=[];
  svgPopKeyNav(mockSt,'a');
  check('"a" pans content RIGHT (positive dx)', calls[0][1]>0);
  calls=[];
  svgPopKeyNav(mockSt,'w');
  check('"w" pans content DOWN (positive dy) — inverse of an upward camera move', calls[0][2]>0);
  calls=[];
  svgPopKeyNav(mockSt,'s');
  check('"s" pans content UP (negative dy)', calls[0][2]<0);
  calls=[];
  svgPopKeyNav(mockSt,'e');
  check('"e" zooms in (multiplier > 1)', calls[0][0]==='zoom' && calls[0][1]>1);
  calls=[];
  svgPopKeyNav(mockSt,'q');
  check('"q" zooms out (multiplier < 1)', calls[0][1]<1);
  check('an unhandled key returns false', svgPopKeyNav(mockSt,'z')===false);
  check('a null/missing st returns false, never throws', (()=>{ try{ return svgPopKeyNav(null,'d')===false; }catch(e){ return false; } })());
  check('an st without keyPan (not yet initialized) returns false, never throws', (()=>{ try{ return svgPopKeyNav({},'d')===false; }catch(e){ return false; } })());
}

console.log(`\n${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
