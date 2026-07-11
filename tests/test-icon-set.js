// User-directed icon set (2026-07-11) — timeline-category icons moved from emoji (renders
// differently per OS, can't theme-sync) to inline SVG line icons (stroke=currentColor, theme-syncs
// for free via CSS). Covers the icon-generator function and its two consumers (TL_CAT_ICON,
// TL_CATEGORIES filter pills), plus a real render to confirm the SVG actually lands in the DOM.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- svgIcon() ----------
check('svgIcon: known name returns a well-formed inline svg', /^<svg[^>]*>.*<\/svg>$/.test(svgIcon('launch')));
check('svgIcon: uses currentColor, not a hardcoded hex, so it inherits ink color', svgIcon('research').includes('currentColor') && !/#[0-9a-fA-F]{6}/.test(svgIcon('research')));
check('svgIcon: default size is 1em (inline with surrounding text)', svgIcon('crew').includes('width="1em"'));
check('svgIcon: custom size honored', svgIcon('crew','20px').includes('width="20px"'));
check('svgIcon: unknown name returns empty string, not a crash', svgIcon('not-a-real-icon')==='');

// ---------- every ICON_PATHS entry produces a valid, non-empty svg ----------
for(const name of Object.keys(ICON_PATHS)){
  check(`svgIcon('${name}'): non-empty`, svgIcon(name).length>20);
}

// ---------- TL_CAT_ICON: no more emoji, economy stays plain "$" (never was an emoji problem) ----------
const EMOJI_RE=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
check('TL_CAT_ICON.launch: no emoji, real svg', !EMOJI_RE.test(TL_CAT_ICON.launch) && TL_CAT_ICON.launch.includes('<svg'));
check('TL_CAT_ICON.research: no emoji, real svg', !EMOJI_RE.test(TL_CAT_ICON.research) && TL_CAT_ICON.research.includes('<svg'));
check('TL_CAT_ICON.rivals: no emoji, real svg', !EMOJI_RE.test(TL_CAT_ICON.rivals) && TL_CAT_ICON.rivals.includes('<svg'));
check('TL_CAT_ICON.crew: no emoji, real svg', !EMOJI_RE.test(TL_CAT_ICON.crew) && TL_CAT_ICON.crew.includes('<svg'));
check('TL_CAT_ICON.infra: no emoji, real svg', !EMOJI_RE.test(TL_CAT_ICON.infra) && TL_CAT_ICON.infra.includes('<svg'));
check('TL_CAT_ICON.other: no emoji, real svg', !EMOJI_RE.test(TL_CAT_ICON.other) && TL_CAT_ICON.other.includes('<svg'));
check('TL_CAT_ICON.economy: still the plain "$" glyph (never an emoji-inconsistency problem)', TL_CAT_ICON.economy==='$');

// ---------- TL_CATEGORIES filter pills match TL_CAT_ICON ----------
for(const c of TL_CATEGORIES){
  if(c.id==='all') continue;
  check(`TL_CATEGORIES.${c.id}: icon matches TL_CAT_ICON`, c.icon===TL_CAT_ICON[c.id]);
}

// ---------- Rendered: the timeline strip actually contains real <svg>, not emoji, for a log entry ----------
const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }
// renderLog builds via createElement+appendChild, not a single innerHTML= assignment, so the
// harness's DOM stub (innerHTML is a plain string property, not a live tree) never reflects
// appended children on the PARENT — read the child chips' own innerHTML instead.
function childrenHtml(id){ const el=_elCache[id]; return el?(el.children||[]).map(c=>c.innerHTML||'').join(''):''; }
newGame('engineer');
state.log.unshift({when:dateStr(), kind:'info', msg:'R&D complete: test breakthrough.'}); // categorizes as 'research'
renderLog();
const html=childrenHtml('opsTimeline');
check('rendered timeline: contains a real <svg> icon', html.includes('<svg'));
check('rendered timeline: no leftover research/launch emoji', !EMOJI_RE.test(html.replace(/<[^>]*>/g,''))); // strip tags first — chevron/arrow-ish glyphs in prose text are fine, only checking the icon slot
renderTlControls();
const controlsHtml=htmlOf('tlControls');
check('rendered filter pills: contains real <svg> icons', controlsHtml.includes('<svg'));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
