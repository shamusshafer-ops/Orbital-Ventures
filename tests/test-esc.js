// E0.6 — esc() hardening: escape helper, the tlStrip unclosed-tag bypass fix, and every wrapped call site.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// Persistent-element shim (see test-progress-unify.js) — getElementById normally returns a fresh stub each call.
const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }

newGame('engineer');

// ---------- 1. esc() itself ----------
check('esc: escapes &', esc('&')==='&amp;');
check('esc: escapes <', esc('<')==='&lt;');
check('esc: escapes >', esc('>')==='&gt;');
check('esc: escapes double quote', esc('"')==='&quot;');
check('esc: escapes single quote', esc("'")==='&#39;');
check('esc: full tag payload', esc('<img src=x onerror=alert(1)>')==='&lt;img src=x onerror=alert(1)&gt;');
check('esc: null-safe', esc(null)==='');
check('esc: undefined-safe', esc(undefined)==='');
check('esc: number-safe', esc(42)==='42');
check('esc: not idempotent (single pass only)', esc('&lt;')==='&amp;lt;');

// ---------- 2. tlStrip bypass fix ----------
const UNCLOSED='<img src=x onerror=window.__pwn=1'; // no closing '>'
check('tlStripPlain: unclosed tag survives strip-only (the original bypass)', tlStripPlain(UNCLOSED).includes('<img'));
const stripped=tlStrip(UNCLOSED);
check('tlStrip: unclosed-tag payload has no raw "<" after strip+escape', !stripped.includes('<'));
check('tlStrip: unclosed-tag payload is HTML-escaped', stripped.includes('&lt;img'));
check('tlStripPlain: closed tag still fully stripped', tlStripPlain('<b>bold</b> plain')==='bold plain');
check('tlStrip: closed-tag payload plain text unaffected by escaping', tlStrip('<b>bold</b> plain')==='bold plain');

// ---------- 3. logCategory/logNav regex must match raw "R&D", not "R&amp;D" ----------
check('logCategory: raw "R&D" text still categorizes as research',
  logCategory({msg:'R&D complete: Kerosene engine breakthrough.'})==='research');
check('logNav: raw "R&D" text still routes to rnd tab', logNav({msg:'R&D started on Hypergolic fuels.'})==='rnd');

// ---------- 4. recentCashEvents: single-escape only (double-escape regression guard) ----------
state.log.unshift({when:dateStr(), kind:'info', msg:'Royalty payment: +$12.00M from "Vanguard" & co.'});
const cashEvents=recentCashEvents(5);
check('recentCashEvents: found the seeded cash event', cashEvents.length>0 && cashEvents[0].amount===12);
if(cashEvents.length){
  const m=cashEvents[0].msg;
  check('recentCashEvents: msg escaped once (no raw & survives)', !m.includes(' & co') && m.includes('&amp; co'));
  check('recentCashEvents: msg NOT double-escaped', !m.includes('&amp;amp;') && !m.includes('&amp;quot;'));
}

// ---------- 5. Blueprint name (sim.js renderBlueprints) ----------
blueprints().push({id:'bp_xss', name:'<img src=x onerror=window.__pwnBp=1>', born:dateStr(), summary:'test'});
renderBlueprints();
const bpHtml=htmlOf('blueprintsCard');
check('renderBlueprints: no raw <img in blueprint name', !bpHtml.includes('<img src=x onerror'));
check('renderBlueprints: blueprint name escaped', bpHtml.includes('&lt;img src=x onerror=window.__pwnBp=1&gt;'));

// ---------- 6. Livery name (sim.js renderLivery) ----------
state.livery={name:'"><svg onload=window.__pwnLiv=1>', body:'#ffffff', accent:'#000000', nose:'auto'};
renderLivery();
const livHtml=htmlOf('liveryCard');
check('renderLivery: no raw "> breakout in the value attribute', !livHtml.includes('"><svg onload'));
check('renderLivery: livery name escaped', livHtml.includes('&quot;&gt;&lt;svg onload=window.__pwnLiv=1&gt;'));

// ---------- 7. Company name (save.js showModal-based Finances view) ----------
state.company='<script>window.__pwnCo=1</script>"Rocket & Co\'';
showFinancesModal();
const finHtml=htmlOf('modalBody');
check('showFinancesModal: no raw <script> from company name', !finHtml.includes('<script>window.__pwnCo'));
check('showFinancesModal: company name escaped', finHtml.includes('&lt;script&gt;window.__pwnCo=1&lt;/script&gt;'));

// ---------- 8. Vehicle family names (render.js renderVehicleFamilies — active + list + parent-pill) ----------
state.vehicles=[
  {id:'veh_parent', name:'<b>Parent</b> Family', born:dateStr(), parentId:null, inherited:0, flights:3, successes:3, losses:0, spec:{}},
  {id:'veh_active', name:'"><img src=x onerror=window.__pwnFam=1>', born:dateStr(), parentId:'veh_parent', inherited:1, flights:2, successes:2, losses:0, spec:{}},
];
state.activeVehicle='veh_active';
renderVehicleFamilies();
const famHtml=htmlOf('vehicleFamilyCard');
check('renderVehicleFamilies: no raw breakout from active family name', !famHtml.includes('"><img src=x onerror=window.__pwnFam'));
check('renderVehicleFamilies: active family name escaped', famHtml.includes('&quot;&gt;&lt;img src=x onerror=window.__pwnFam=1&gt;'));
check('renderVehicleFamilies: parent family name escaped (no raw <b>Parent</b>)', !famHtml.includes('<b>Parent</b> Family') && famHtml.includes('&lt;b&gt;Parent&lt;/b&gt; Family'));

// ---------- 9. Front-page headline/dek (persisted, replayed from a save) ----------
const fpEvil={abs:absMonth(), kind:'milestone', icon:'🚀', headline:'<img src=x onerror=window.__pwnFp=1>', dek:'"quoted" & <b>bold</b> dek'};
const fpHtml=frontPageHTML(fpEvil);
check('frontPageHTML: headline has no raw <img', !fpHtml.includes('<img src=x onerror'));
check('frontPageHTML: headline escaped', fpHtml.includes('&lt;img src=x onerror=window.__pwnFp=1&gt;'));
check('frontPageHTML: dek has no raw <b>bold</b>', !fpHtml.includes('<b>bold</b>'));
check('frontPageHTML: dek escaped', fpHtml.includes('&quot;quoted&quot; &amp; &lt;b&gt;bold&lt;/b&gt; dek'));

frontPages().unshift(fpEvil);
const listHtml=frontPagesHTML();
check('frontPagesHTML (list row): headline has no raw <img', !listHtml.includes('<img src=x onerror'));
check('frontPagesHTML (list row): headline escaped', listHtml.includes('&lt;img src=x onerror=window.__pwnFp=1&gt;'));

// ---------- 10. No injected payload actually executed ----------
check('no injected payload flipped a __pwn* flag', !window.__pwnBp && !window.__pwnLiv && !window.__pwnCo && !window.__pwnFam && !window.__pwnFp);

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
