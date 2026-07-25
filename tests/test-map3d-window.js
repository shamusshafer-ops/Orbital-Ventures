// Solar Map D4 (2026-07-25) — time-scrubber promotion. The −1Y/−1M/Now/+1M/+1Y HUD was the best
// planning idea on the screen with nothing tied to it. This slice adds a jump-to-next-window control,
// a window readout, and a preview transfer arc, so scrubbing becomes a planning action rather than a
// camera curiosity.
//
// THE DESIGN QUESTION this slice had to settle (flagged in the D2 write-up): the map and the body card
// were two surfaces telling the same story independently. Resolution — they answer DIFFERENT questions
// and are anchored differently on purpose:
//   • body card  → nextWindowFor(missionId), anchored to absDay() (the LIVE date). "When is my next
//     window?" must not drift just because the map is being previewed. UNTOUCHED by this slice.
//   • map        → nextWindowFromDay(bodyId, viewDay), anchored to the PREVIEWED date, so repeated
//     jumps step forward through successive windows.
// Both derive from the same computeWindows() geometry, so they cannot disagree about WHERE windows
// are — only about which one is "next", which is exactly the intended difference. Asserted below.
//
// Deliberately NOT the state.windows cache: that's keyed per-mission and anchored at absDay(), so it
// structurally cannot answer "what comes after the date I'm previewing."
//
// THREE-dependent pieces (the preview arc's Line object, HUD DOM writes) are NOT covered — no WebGL
// here. NOT browser-verified.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- nextWindowFromDay: real geometry, arbitrary anchor ----------
{
  newGame('engineer');
  const d0=absDay();
  const w=nextWindowFromDay('mars', d0);
  check('a window is found for mars from today', w!==null);
  check('the window is strictly in the future (never returns the reference day itself)', w.abs>d0);
  check('it carries a rendered date string', typeof w.date==='string' && w.date.length>0);
  check('quality label is one of the three the game uses', ['Favorable','Average','Marginal'].indexOf(w.qLabel)>=0);
  check('daysFromRef is consistent with abs', w.daysFromRef===w.abs-d0);
  check('earth never yields a window (you are already there)', nextWindowFromDay('earth', d0)===null);
  check('a null/unknown body is handled without throwing', nextWindowFromDay(null,d0)===null && nextWindowFromDay('nonexistent_xyz',d0)===null);
}

// ---------- stepping: repeated jumps must advance, not stall ----------
{
  newGame('engineer');
  let ref=absDay(); const seen=[];
  for(let i=0;i<4;i++){ const w=nextWindowFromDay('mars', ref); if(!w) break; seen.push(w.abs); ref=w.abs; }
  check('four successive windows are found by re-anchoring to the previous one', seen.length===4);
  check('each successive window is strictly later (the control can never stall on one date)',
    seen.every((a,i)=>i===0||a>seen[i-1]));
  // Mars' real synodic period is ~25.6 months; consecutive windows must reflect that, not a made-up cadence
  const gaps=seen.slice(1).map((a,i)=>Math.round((a-seen[i])/DAYS_PER_MONTH));
  check('consecutive gaps match Mars\' real ~26-month synodic period: '+gaps.join(','),
    gaps.every(g=>g>=24 && g<=28));
}

// ---------- map anchoring vs card anchoring: the agreement question ----------
{
  newGame('engineer');
  const d0=absDay();
  const first=nextWindowFromDay('mars', d0);
  const later=nextWindowFromDay('mars', first.abs);
  check('re-anchoring past a window yields a DIFFERENT, later window (map steps forward)', later.abs>first.abs);

  // the card's own view must NOT move when the map is previewed
  const cardBefore=bodyPlan('mars').nextWindow;
  mapPreviewAbsDay=d0+3000;
  const cardAfter=bodyPlan('mars').nextWindow;
  check('previewing the map does NOT shift the body card\'s "next window" (card stays anchored to today)',
    cardBefore && cardAfter && cardBefore.abs===cardAfter.abs);
  // ...but the map's readout DOES follow the preview
  const mapAtPreview=nextWindowFromDay('mars', mapViewAbsDay());
  check('the map\'s own search DOES follow the previewed date', mapAtPreview.abs>cardAfter.abs);
  // and they never disagree about where windows actually are
  const fromCardAnchor=nextWindowFromDay('mars', d0);
  check('map and card agree on the soonest window when anchored to the same day (same underlying geometry)',
    fromCardAnchor.abs===cardAfter.abs);
  mapPreviewAbsDay=null;
}

// ---------- bodyHasWindows: gates the control honestly ----------
{
  newGame('engineer');
  check('mars has window-gated missions', bodyHasWindows('mars')===true);
  check('earth does not', bodyHasWindows('earth')===false);
  check('a body with no missions at all does not', bodyHasWindows('mercury')===false);
  check('an unknown body is handled without throwing', bodyHasWindows('nonexistent_xyz')===false);
  // Documents the current content reality: window:true exists on exactly 4 missions, all targeting
  // Mars. The control is therefore Mars-only TODAY, but is data-driven — any future body whose
  // missions declare window:true lights it up with no code change. This assertion is a canary: if it
  // starts failing, new window content was authored and D4's reach widened automatically.
  const withWindows=BODIES.filter(b=>bodyHasWindows(b.id)).map(b=>b.id);
  check('exactly one body currently has window-gated missions (mars) — canary for new window content: '+withWindows.join(','),
    withWindows.length===1 && withWindows[0]==='mars');
}

// ---------- mapWindowReadoutHTML ----------
{
  newGame('engineer');
  const d0=absDay();
  const html=mapWindowReadoutHTML('mars', d0);
  check('mars readout names the body', html.indexOf('Mars')>=0);
  check('mars readout shows the window date', html.indexOf('Next')>=0);
  check('mars readout shows the geometry quality', html.indexOf('Geometry')>=0);
  check('mars readout offers the jump control', html.indexOf('mapJumpNextWindow()')>=0);
  check('mars readout renders no NaN/undefined', html.indexOf('NaN')<0 && html.indexOf('undefined')<0);

  check('earth renders nothing at all (no window concept applies)', mapWindowReadoutHTML('earth', d0)==='');
  const merc=mapWindowReadoutHTML('mercury', d0);
  check('a body with no window missions explains itself rather than showing a dead button',
    merc.indexOf('No window-gated missions')>=0 && merc.indexOf('mapJumpNextWindow()')<0);

  // the readout must name which date it is measuring FROM, so a previewed figure is never mistaken
  // for the live one
  check('anchored to today, the readout says so', mapWindowReadoutHTML('mars', d0).indexOf('From today')>=0);
  mapPreviewAbsDay=d0+900;
  check('while previewing, the readout says so instead', mapWindowReadoutHTML('mars', mapViewAbsDay()).indexOf('From preview')>=0);
  mapPreviewAbsDay=null;

  // every body must render safely — the readout is selection-driven
  let bad=[];
  for(const b of BODIES){ const h=mapWindowReadoutHTML(b.id, d0); if(h.indexOf('NaN')>=0||h.indexOf('undefined')>=0) bad.push(b.id); }
  check('no body renders NaN/undefined in the window readout: '+bad.join(','), bad.length===0);
}

// ---------- mapJumpNextWindow: mutates only the preview, never the simulation ----------
{
  newGame('engineer');
  const liveBefore=absDay(), moneyBefore=state.money;
  state.selectedBody='mars'; mapPreviewAbsDay=null;
  mapJumpNextWindow();
  check('jumping sets a preview date', mapPreviewAbsDay!==null);
  check('the preview lands exactly on the window', mapPreviewAbsDay===nextWindowFromDay('mars', liveBefore).abs);
  check('the LIVE simulation day is untouched (visual-only, never mutates the save)', absDay()===liveBefore);
  check('no economic state was touched', state.money===moneyBefore);

  const firstJump=mapPreviewAbsDay;
  mapJumpNextWindow();
  check('a second press steps to the NEXT window rather than re-selecting the same one', mapPreviewAbsDay>firstJump);

  // a body with no windows must be a no-op, not a crash or a bogus date
  mapPreviewAbsDay=null; state.selectedBody='mercury';
  mapJumpNextWindow();
  check('jumping with no window available is a safe no-op', mapPreviewAbsDay===null);
  state.selectedBody='earth';
  mapJumpNextWindow();
  check('jumping while Earth is selected is a safe no-op', mapPreviewAbsDay===null);
}

console.log(`map3d-window: ${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
