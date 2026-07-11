// ============================================================================
// E0.4 Slice D — UI-scale setting (whole-page CSS `zoom`).
//
// The harness has no real CSS engine or DOM layout, so — exactly as slices A/B
// were honest about — these are UNIT tests on the pure decision functions the
// setting was built around, NOT on rendered zoom or live slider dragging:
//   clampUiScale(v)   — snap/clamp an arbitrary input to the 80–130-by-10 set
//   bootUiScale(raw)  — the boot-time "what value to use" decision given the
//                       localStorage string (present / absent / corrupt)
// plus the localStorage read/write round-trip through applyUiScale().
//
// NOT proven here (left to the manual Firefox file:// checklist in the report):
// the actual `zoom` scaling, the slider rendering/dragging, live % feedback,
// and — the highest-risk item — Phaser/canvas click-accuracy at a non-100%
// scale (getBoundingClientRect-based pointer mapping).
// ============================================================================
animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- 1. clampUiScale: snap + clamp into {80,90,100,110,120,130} ----------
// Exact valid values pass through untouched.
check('clampUiScale: 80 → 80 (min)', clampUiScale(80)===80);
check('clampUiScale: 90 → 90', clampUiScale(90)===90);
check('clampUiScale: 100 → 100 (default)', clampUiScale(100)===100);
check('clampUiScale: 110 → 110', clampUiScale(110)===110);
check('clampUiScale: 120 → 120', clampUiScale(120)===120);
check('clampUiScale: 130 → 130 (max)', clampUiScale(130)===130);
// Off-step values snap to the nearest 10.
check('clampUiScale: 94 → 90 (snap down)', clampUiScale(94)===90);
check('clampUiScale: 95 → 100 (snap to nearest, .5 rounds up)', clampUiScale(95)===100);
check('clampUiScale: 96 → 100 (snap up)', clampUiScale(96)===100);
check('clampUiScale: 104 → 100', clampUiScale(104)===100);
check('clampUiScale: 116 → 120', clampUiScale(116)===120);
// Out-of-range clamps to the ends.
check('clampUiScale: 0 → 80 (below min clamps)', clampUiScale(0)===80);
check('clampUiScale: 50 → 80 (below min clamps)', clampUiScale(50)===80);
check('clampUiScale: 200 → 130 (above max clamps)', clampUiScale(200)===130);
check('clampUiScale: 1000 → 130 (above max clamps)', clampUiScale(1000)===130);
check('clampUiScale: -40 → 80 (negative clamps to min)', clampUiScale(-40)===80);
// String inputs (the slider hands `this.value` as a string) parse the same.
check('clampUiScale: "110" (string) → 110', clampUiScale("110")===110);
check('clampUiScale: "115" (string) → 120', clampUiScale("115")===120);
// Corrupt / non-numeric input falls back to the default, never NaN.
check('clampUiScale: NaN → default 100', clampUiScale(NaN)===100);
check('clampUiScale: "abc" → default 100', clampUiScale("abc")===100);
check('clampUiScale: "" → default 100', clampUiScale("")===100);
check('clampUiScale: null → default 100', clampUiScale(null)===100);
check('clampUiScale: undefined → default 100', clampUiScale(undefined)===100);
check('clampUiScale: never returns NaN for junk', !isNaN(clampUiScale("junk")) && !isNaN(clampUiScale({})));
// Idempotence: clamping an already-valid value is stable.
check('clampUiScale: idempotent on valid values', [80,90,100,110,120,130].every(v=>clampUiScale(clampUiScale(v))===v));

// ---------- 2. bootUiScale: the boot-time value decision ----------
// Absent key (getItem returns null) → the 100% default, WITHOUT touching clamp semantics.
check('bootUiScale: null (key absent) → default 100', bootUiScale(null)===100);
check('bootUiScale: undefined → default 100', bootUiScale(undefined)===100);
// Present & valid → that value.
check('bootUiScale: "120" → 120', bootUiScale("120")===120);
check('bootUiScale: "80" → 80', bootUiScale("80")===80);
// Present but off-step or out-of-range → sanitized (self-heals a hand-edited value).
check('bootUiScale: "117" (off-step) → 120', bootUiScale("117")===120);
check('bootUiScale: "500" (out of range) → 130', bootUiScale("500")===130);
check('bootUiScale: "10" (out of range) → 80', bootUiScale("10")===80);
// Present but corrupt → default 100.
check('bootUiScale: "garbage" → default 100', bootUiScale("garbage")===100);
check('bootUiScale: "" (empty stored) → default 100', bootUiScale("")===100);

// ---------- 3. localStorage round-trip through applyUiScale ----------
// applyUiScale sanitizes, persists the sanitized value, and updates the live `uiScale`.
localStorage.removeItem('ov_uiscale');
applyUiScale(120);
check('applyUiScale: 120 persisted to ov_uiscale', localStorage.getItem('ov_uiscale')==='120');
check('applyUiScale: uiScale global updated to 120', uiScale===120);
check('applyUiScale: round-trips through bootUiScale', bootUiScale(localStorage.getItem('ov_uiscale'))===120);
// An off-step value is snapped BEFORE it is stored (never persist a junk value).
applyUiScale(117);
check('applyUiScale: off-step 117 snapped to 120 on write', localStorage.getItem('ov_uiscale')==='120');
applyUiScale(84);
check('applyUiScale: off-step 84 snapped to 80 on write', localStorage.getItem('ov_uiscale')==='80');
check('applyUiScale: uiScale updated to 80', uiScale===80);
// Out-of-range is clamped before storage.
applyUiScale(999);
check('applyUiScale: 999 clamped to 130 on write', localStorage.getItem('ov_uiscale')==='130');
// Corrupt input persists the default rather than a bad value.
applyUiScale('nonsense');
check('applyUiScale: corrupt input stores default 100', localStorage.getItem('ov_uiscale')==='100');
check('applyUiScale: corrupt input leaves uiScale at 100', uiScale===100);

// A stored corrupt value read back on the NEXT boot resolves to the default (end-to-end sanitize).
localStorage.setItem('ov_uiscale', 'ZZZ');
check('boot after corrupt store: resolves to default 100', bootUiScale(localStorage.getItem('ov_uiscale'))===100);
localStorage.setItem('ov_uiscale', '130');
check('boot after valid store: resolves to 130', bootUiScale(localStorage.getItem('ov_uiscale'))===130);

// ---------- 4. constants sanity ----------
check('range constants: 80..130 step 10, default 100', UI_SCALE_MIN===80 && UI_SCALE_MAX===130 && UI_SCALE_STEP===10 && UI_SCALE_DEFAULT===100);
// The full valid ladder is exactly the six 10%-steps between min and max.
const ladder=[]; for(let v=UI_SCALE_MIN; v<=UI_SCALE_MAX; v+=UI_SCALE_STEP) ladder.push(v);
check('valid ladder is [80,90,100,110,120,130]', ladder.join(',')==='80,90,100,110,120,130');
check('every ladder value is a clamp fixed-point', ladder.every(v=>clampUiScale(v)===v));

console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
