function setTlFilter(id){ _tlFilter=id; try{ localStorage.setItem('ov_tlFilter', id); }catch(e){} renderLog(); }
function toggleTlCollapse(){ _tlCollapsed=!_tlCollapsed; try{ localStorage.setItem('ov_tlCollapsed', _tlCollapsed?'1':'0'); }catch(e){} renderLog(); }
// Slice 3: objective sparkle tracking
const _prevObjDoneSet=new Set();
let _objSectionOpen=false;

/* ---------- render ---------- */




/* ---------- P7: The Agency Wire — front-page artifacts + Chronicle scrapbook ----------
   Firsts, disasters and scoops already fire their own modal/log at the moment they happen
   (showMilestoneModal, fireRivalFirst, maybeRivalDisaster, the crewed-catastrophe branch) —
   this doesn't touch any of that. It just also files a short "front page" record of the same
   moment, browsable later from the Chronicle. Same lazy-default pattern as blueprints() —
   no SAVE_VERSION bump; a legacy save simply starts with an empty wire. */
const FRONT_PAGE_CAP=100; // E0.5-A fold-in: raised 24→100 so the Chronicle retains a fuller history
function frontPages(){ return state.frontPages=state.frontPages||[]; }
function pushFrontPage(kind, icon, headline, dek){
  frontPages().unshift({abs:absMonth(), kind, icon, headline, dek});
  if(frontPages().length>FRONT_PAGE_CAP) frontPages().pop();
}
const FRONT_PAGE_KIND_LABEL={milestone:'MILESTONE', scoop:'SCOOPED', disaster:'DISASTER', rival:'RIVAL WIRE'};
// Slice C (2026-07-12): the shared newspaper renderer — now a class-driven .frontpage card so its
// size (.modal.newspaper) and era-evolving look (body.era-X .frontpage {...} in shell.html) live in
// CSS. Structure is intentionally era-agnostic: the fp-chrome bar is hidden except in the spacex era,
// where CSS reveals it as a browser-chrome flourish. All four callers (milestone/hearing/victory/
// Chronicle) render through this one function, so they inherit the treatment for free.
// Slice C-filler (2026-07-12): pick 1-2 eligible NEWS_FILLER archetypes by weight (no repeats within
// one edition), state-derived so they read as current. Each build() is guarded so a bad archetype can
// never break the real edition it rides inside. Not persisted — re-picked fresh every render.
function pickNewsFiller(n){
  n=n||1; const st=state, eraIdx=eraIndex(currentEra());
  const avail=(typeof NEWS_FILLER!=='undefined'?NEWS_FILLER:[]).filter(a=>eraIdx>=(a.minEra||0) && (!a.req||a.req(st)));
  const out=[];
  while(out.length<n && avail.length){
    const total=avail.reduce((s,a)=>s+Math.max(0,a.weight?a.weight(st):1),0);
    if(total<=0) break;
    let r=Math.random()*total, idx=0;
    for(;idx<avail.length-1;idx++){ r-=Math.max(0,avail[idx].weight?avail[idx].weight(st):1); if(r<=0) break; }
    const arch=avail.splice(idx,1)[0]; // consume so an edition never repeats an archetype
    try{ const b=arch.build(st, eraIdx); if(b && b.headline && b.blurb) out.push(b); }catch(err){}
  }
  return out;
}
function newsFillerHTML(briefs){
  if(!briefs || !briefs.length) return '';
  return `<div class="fp-fold">${briefs.map(b=>`<div class="fp-brief"><div class="fp-brief-h">${esc(b.headline)}</div><div class="fp-brief-b">${esc(b.blurb)}</div></div>`).join('')}</div>`;
}
// withFiller: the 3 live edition triggers (milestone/hearing/victory) pass true → 1-2 fresh below-the-
// fold briefs are appended. The Chronicle replay (showFrontPage) passes nothing → no filler: a browsed
// archive edition is history, so re-rolling current staff/rivals/mood onto it would be anachronistic.
function frontPageHTML(e, withFiller){
  const kind=FRONT_PAGE_KIND_LABEL[e.kind]||'';
  const filler=withFiller ? newsFillerHTML(pickNewsFiller(1 + (Math.random()<0.5?1:0))) : '';
  return `<div class="frontpage">
    <div class="fp-chrome"><span class="fp-dot"></span><span class="fp-dot"></span><span class="fp-dot"></span><span class="fp-url">agencywire.news/${esc((kind||'wire').toLowerCase())}</span></div>
    <div class="fp-body">
      <div class="fp-masthead">The Agency Wire</div>
      <div class="fp-dateline">${dateOfAbs(e.abs)}</div>
      <div class="fp-kind">${kind}</div>
      <h2 class="fp-headline">${e.icon} ${esc(e.headline)}</h2>
      ${e.dek?`<p class="fp-dek">${esc(e.dek)}</p>`:''}
      ${filler}
    </div>
  </div>`;
}
function showFrontPage(idx){
  const e=frontPages()[idx]; if(!e) return;
  showModal(`${frontPageHTML(e)}<button class="btn" style="width:100%;margin-top:10px" onclick="showChronicle('view')">← Back to the Chronicle</button>`, 'newspaper');
}
function frontPagesHTML(){
  if(!frontPages().length) return '<div class="dim" style="font-size:12px">No wire copy yet — a first, a disaster or a scoop will file the opening edition.</div>';
  return frontPages().map((e,i)=>`<div onclick="showFrontPage(${i})" style="display:flex;gap:8px;align-items:baseline;padding:3px 0;font-size:12px;cursor:pointer" onmouseover="this.style.background='var(--panel2)'" onmouseout="this.style.background=''">
    <span style="flex:0 0 16px">${e.icon}</span>
    <span style="color:var(--ink);flex:1">${esc(e.headline)}</span>
    <span class="dim" style="font-size:11px">${dateOfAbs(e.abs)}</span>
  </div>`).join('');
}

/* ---------- The Agency Chronicle: your century, scored ----------
   A timeline of every first — yours against the rivals' — plus lifetime statistics and a
   legacy grade. Openable anytime from the Command Center; fires as "An Era Closes" at the
   soft scoring date (Jan 1990) with the option to keep playing; and is the retirement
   ceremony when the player chooses to step down. Open-ended play is never taken away. */
const SCORING_YEAR=1990;
const SCORING_YEAR_2=2100; // I2: second scoring bookend — the Speculative era opens; the post-2000 game gets its own arc instead of coasting on the first ceremony
function chronicleEntries(){
  const out=[];
  for(const [mid,abs] of Object.entries(state.firstDates||{})){
    const m=MISSIONS.find(x=>x.id===mid); if(!m||(m.rep||0)<15) continue; // milestones, not routine paperwork
    out.push({abs, who:'you', label:m.name});
  }
  for(const key of Object.keys(state.rivalFired||{})){
    const [rid,fname]=key.split('|'); const r=RIVALS.find(x=>x.id===rid); if(!r) continue;
    const f=(r.firsts||[]).find(x=>x.name===fname);
    out.push({abs:((f&&f.year)||1957)*12-1942*12, who:r.name, color:r.color, label:fname});
  }
  out.sort((a,b)=>a.abs-b.abs);
  return out;
}
function legacyScore(){
  const firsts=Object.keys(state.firstDates||{}).filter(mid=>{const m=MISSIONS.find(x=>x.id===mid); return m&&(m.rep||0)>=15;}).length;
  const scooped=Object.keys(state.scooped||{}).length;
  const worlds=BODIES.filter(b=>b.id!=='earth'&&(b.missions||[]).some(mid=>state.completed[mid])).length;
  const safety=state.flights?state.successes/state.flights:0;
  let facN=0; try{ FACILITY_DEFS.forEach(d=>{ if(facilityBuilt(d.id)) facN++; }); }catch(e){}
  const crewPenalty=(state.crewLost||0)*6;
  // I3: sum across every crisis this game has survived (P11's original one-time crisisDone still
  // reads correctly — crisisHistory() lazily seeds itself from it — but a longer game can now
  // survive more than one, and each one should count).
  const cHist=crisisHistory();
  const crisisBonus=cHist.reduce((a,c)=>a+(c.outcome==='mitigated'?18:8),0);
  const fusionFlown=!!state.completed['oort_precursor']; // I1/I2: the interstellar-precursor capstone
  const fusionBonus=fusionFlown?20:0;
  const score=firsts*10 + worlds*12 + facN*8 + Math.round(safety*20) - scooped*5 - crewPenalty + crisisBonus + fusionBonus;
  const grade= score>=140?'S':score>=100?'A':score>=65?'B':score>=35?'C':'D';
  return {score,grade,firsts,scooped,worlds,facN,safety,crewLost:state.crewLost||0,crisesResolved:cHist,fusionFlown};
}
function showChronicle(mode){ // mode: 'view' | 'era' (1990) | 'era2' (2100) | 'retire'
  const L=legacyScore(); const entries=chronicleEntries();
  const gradeCol={S:'#ffd98a',A:'#58c47a',B:'#4fd1d9',C:'#e8b64c',D:'#e0564f'}[L.grade];
  const rows=entries.map(e=>{ const y=1942+Math.floor(e.abs/12);
    return `<div style="display:flex;gap:10px;align-items:baseline;padding:2px 0;font-size:12px">
      <span style="font-family:var(--mono);color:var(--dim);flex:0 0 42px">${y}</span>
      <span style="flex:0 0 10px;color:${e.who==='you'?'var(--ignite)':(e.color||'var(--muted)')}">${e.who==='you'?'★':'●'}</span>
      <span style="color:${e.who==='you'?'var(--ink)':'var(--muted)'}">${e.label}</span>
      ${e.who!=='you'?`<span class="dim" style="font-size:11px">— ${e.who}</span>`:''}
    </div>`; }).join('') || '<div class="dim" style="font-size:12px">No milestones yet — the chronicle is unwritten.</div>';
  const stat=(k,v)=>`<div class="metric"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  // I2: a second bookend at SCORING_YEAR_2 so the post-2000 game gets its own ceremony instead of
  // coasting on the 1990 one — framed around the "deep-space dimensions" the first ceremony predates
  // (worlds reached, crises survived, whether the fusion-precursor capstone has flown).
  const heading = mode==='retire' ? 'The Chronicle closes' : mode==='era2' ? 'A new age dawns — '+SCORING_YEAR_2 : (mode==='era' ? 'An era closes — '+SCORING_YEAR : 'Agency Chronicle');
  const sub = mode==='retire' ? 'You step down. This is what the history books will say.' :
              mode==='era2' ? 'A century and a half of spaceflight — the deep frontier now within reach. The program may continue; history has taken its second measure.' :
              mode==='era' ? 'Half a century of spaceflight, scored. The program may continue — history has simply taken its first measure.' :
              esc(state.company)+' — the story so far.';
  showModal(`<div>
    <h2 style="margin-bottom:2px">${heading}</h2>
    <p class="muted" style="font-size:12px;margin:0 0 10px">${sub}</p>
    <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px">
      <div style="font-size:44px;font-family:var(--mono);font-weight:700;color:${gradeCol};line-height:1">${L.grade}</div>
      <div class="metrics" style="flex:1">
        ${stat('Firsts', L.firsts)}${stat('Worlds reached', L.worlds)}${stat('Scooped', L.scooped)}
        ${stat('Flights', state.flights+' ('+Math.round(L.safety*100)+'% success)')}
        ${stat('Crew flown', (state.crewFlown||0)+((state.crewLost||0)?' · '+state.crewLost+' lost':''))}
        ${stat('Facilities', L.facN)}
        ${L.crisesResolved.length?stat('Crises survived', L.crisesResolved.length+(L.crisesResolved.some(c=>c.outcome==='mitigated')?' · '+L.crisesResolved.filter(c=>c.outcome==='mitigated').length+' cleared':'')):''}
        ${L.fusionFlown?stat('Interstellar precursor','Flown ✓'):''}
      </div>
    </div>
    <div style="max-height:240px;overflow:auto;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:6px 0;margin-bottom:10px">${rows}</div>
    ${mode==='view'?`<div class="cc-panel-h" style="margin:0 0 4px">📰 The Agency Wire</div>
    <div style="max-height:160px;overflow:auto;border-bottom:1px solid var(--line);padding:2px 0 6px;margin-bottom:10px">${frontPagesHTML()}</div>`:''}
    ${mode==='retire'
      ? `<button class="btn launch" style="width:100%" onclick="hideModal();newGame();render()">Found a new agency ▸</button>
         <button class="btn ghost" style="width:100%;margin-top:6px" onclick="hideModal()">…not yet — back to work</button>`
      : (mode==='era'||mode==='era2')
      ? `<button class="btn launch" style="width:100%" onclick="hideModal()">The program continues ▸</button>
         <button class="btn ghost" style="width:100%;margin-top:6px" onclick="showChronicle('retire')">Retire with this legacy</button>`
      : `<button class="btn" style="width:100%" onclick="hideModal()">Close</button>
         <button class="btn ghost" style="width:100%;margin-top:6px" onclick="showChronicle('retire')">Retire — end the campaign here</button>`}
  </div>`, true);
}
function checkScoringDate(){
  if(state.year>=SCORING_YEAR && !state.eraScored){ state.eraScored=true;
    timeInterrupt();
    if(animEnabled){ showChronicle('era'); }
    log('note',`📖 ${SCORING_YEAR}: history takes its first measure of ${state.company}. Legacy grade so far: ${legacyScore().grade}.`);
  }
  // I2: second bookend — independent flag, fires once state.year reaches SCORING_YEAR_2 regardless
  // of whether the first one already fired (it always will have, by definition, since YEAR_2>YEAR).
  if(state.year>=SCORING_YEAR_2 && !state.eraScored2){ state.eraScored2=true;
    timeInterrupt();
    if(animEnabled){ showChronicle('era2'); }
    log('note',`📖 ${SCORING_YEAR_2}: history takes its second measure of ${state.company}. Legacy grade now: ${legacyScore().grade}.`);
  }
}

/* ---------- THE OUTLINER: overlapping timers made visible ----------
   One compact ETA-sorted strip of everything in flight, on every scene. Research, builds,
   mandates, windows, expiring contracts, special contracts, the rivals' next predicted
   first, and the treasury runway when it's short. Each row jumps to its home. The player
   should never wonder "what's about to happen" — they should be racing it. */
function outlinerItems(){
  const items=[]; const nowD=absDay(), nowM=absMonth();
  const push=(icon,label,etaDays,go,color)=>items.push({icon,label,etaDays,go,color});
  const moTxt=(mo)=> mo<=0?'now' : mo<1?'<1 mo' : (Math.round(mo*10)/10)+' mo';
  // research
  const ar=state.activeResearch;
  if(ar){ const r=RESEARCH.find(x=>x.id===ar.id);
    push('⚗', (r?r.name:ar.id), ar.monthsLeft*30, ()=>setTab('rnd'), 'var(--readout)'); }
  // production queue
  buildQueueList().forEach(o=>{ if(o.started) push('🏭', o.name||'Vehicle build', o.monthsLeft*30, ()=>{ setTab('command'); try{ showInfrastructureModal(); }catch(e){} }); });
  // material dip — the one live decision left in the collapsed market; surfaced at the top (eta 0)
  MATERIAL_DEFS.forEach(d=>{ if(isMaterialDip(d.key) && canBuyMaterialDip(d.key).ok) push('📦', d.name+' on sale', 0, ()=>{ setTab('command'); try{ showInfrastructureModal(); }catch(e){} }, 'var(--ok)'); });
  // #19 slice C: an unstaffed critical department is a standing reliability risk — surface it in the flow
  workforceGaps().filter(g=>g.kind==='understaffed').forEach(g=>push('👥', (departmentDef(g.id)||{}).name+' dept unstaffed', 0, ()=>{ try{ showPersonnelModal(); }catch(e){} }, 'var(--bad)'));
  // station... (module builds advance time inline; nothing queued) — skip
  // mandate deadline
  const md=state.mandate;
  if(md&&md.accepted) push('📜', 'Mandate: '+md.name, (md.deadlineAbs-nowM)*30, ()=>setTab('missions'), (md.deadlineAbs-nowM)<=6?'var(--warn)':null);
  else if(md&&!md.accepted) push('📜', 'Mandate offer: '+md.name, 0, ()=>{ showMandateModal(); }, 'var(--ignite)');
  // special contract (feature 4)
  const sc=state.specialContract;
  if(sc) push('★', sc.title+' ('+fM(sc.bonus)+')', (sc.deadlineAbs-nowM)*30, ()=>setTab('missions'), (sc.deadlineAbs-nowM)<=4?'var(--warn)':'var(--ignite)');
  // P11/I3: whichever crisis is active, always at the top (eta 0) — a standing decision, not a countdown
  if(state.crisis){ const cd=activeCrisisDef(); if(cd) push(cd.icon, `${cd.name} — ${Math.round(state.crisis.severity*100)}% severity`, 0, ()=>showCrisisModal(), 'var(--bad)'); }
  // committed launch window
  if(state.committedWindow){ const m=MISSIONS.find(x=>x.id===state.committedWindow.missionId);
    push('☄', 'Window: '+(m?m.name:'mission'), state.committedWindow.abs-nowD, ()=>setTab('map'), 'var(--readout)'); }
  // P1 1.2c: live in-flight missions — day-by-day cruise progress (% climbs, ETA counts down); the
  // outcome lands on arrival. Being outliner items, arrivals also become "next event" stop points.
  (state.activeFlights||[]).forEach(fl=>{ if(!fl||!fl.deferred) return;
    const eta=(fl.arriveAbs||0)-nowD;
    const total=(fl.arriveAbs||0)-(fl.launchAbs||0);
    const pct=total>0?Math.min(100,Math.max(0,Math.round((nowD-(fl.launchAbs||0))/total*100))):0;
    const crewTxt=fl.crew>0?` · crew ${fl.crew}`:'';
    push('🚀', `${fl.name||'Mission'} en route${crewTxt} · ${pct}%`, eta, ()=>{ try{ showFlightsModal(); }catch(e){ setTab('map'); } }, eta<=30?'var(--warn)':'var(--ignite)'); });
  // expiring passive contracts (only when near)
  (state.passiveContracts||[]).forEach(cn=>{ const d=PASSIVE_CONTRACT_DEFS.find(x=>x.id===cn.id);
    if(cn.monthsLeft<=4) push('📄', (d?passiveContractDisplay(d).name:cn.id)+' expires', cn.monthsLeft*30, ()=>setTab('missions'), cn.monthsLeft<=2?'var(--warn)':null); });
  // rivals' next scheduled first that hasn't fired and the player hasn't claimed
  { let best=null;
    for(const r of RIVALS){ for(const f of (r.firsts||[])){
      if(state.rivalFired[r.id+'|'+f.name]) continue;
      if(f.missionId && state.completed[f.missionId]) continue;
      const eta=(f.year-1942)*12 - nowM; if(eta<=0) continue;
      if(!best || eta<best.eta) best={eta, r, f}; } }
    if(best && best.eta<=48) push('🏁', best.r.name+': '+best.f.name, best.eta*30, ()=>setTab('command'), best.eta<=12?'var(--warn)':'var(--dim)'); }
  // treasury runway when short
  const rw=runwayMonths();
  if(rw<24) push('⚠', 'Treasury runway', rw*30, ()=>setTab('command'), rw<=8?'var(--bad)':'var(--warn)');
  items.sort((a,b)=>a.etaDays-b.etaDays);
  return items;
}
function outlinerEtaText(d){
  if(d<=0) return 'now';
  if(d<30) return Math.max(1,Math.round(d))+'d';
  const mo=d/30; if(mo<12) return (Math.round(mo*10)/10)+'mo';
  return (Math.round(mo/12*10)/10)+'y';
}
function renderOutliner(){
  const el=$('outlinerCard'); if(!el) return;
  const items=outlinerItems();
  if(!items.length){ setHTML(el, `<div class="cc-panel-h" style="margin:0 0 4px">◈ In flight</div><div class="dim" style="font-size:12px">Nothing on the clock — start research, queue a build, or take a contract.</div>`); return; }
  const rows=items.slice(0,8).map((it,i)=>`<div onclick="(outlinerItems()[${i}]||{go:()=>{}}).go()" style="display:flex;align-items:center;gap:7px;padding:3px 4px;margin:0 -4px;border-radius:5px;cursor:pointer;font-size:12px" onmouseover="this.style.background='var(--panel2)'" onmouseout="this.style.background=''">
      <span style="width:16px;text-align:center;flex:0 0 auto">${it.icon}</span>
      <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${it.color||'var(--muted)'}">${it.label}</span>
      <b style="font-family:var(--mono);font-size:11px;color:${it.color||'var(--readout)'};flex:0 0 auto">${outlinerEtaText(it.etaDays)}</b>
    </div>`).join('');
  setHTML(el, `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <div class="cc-panel-h" style="margin:0">◈ In flight</div>
      <button class="btn ghost" style="font-size:11px;padding:1px 8px" onclick="runToNextEvent()" title="Fast-forward until the next item completes or a decision arrives">⏭ next event</button>
    </div>${rows}`);
}

/* ---------- attention badges: what needs the player, per scene ----------
   Cheap checks only — this runs every render. A badge shows a count; hover text names the items. */
function tabAlerts(){
  const a={command:[], bench:[], rnd:[], map:[], station:[]};
  // Command: financial danger, mandate deadline, morale crises, expiring passive contracts
  const rw=runwayMonths();
  if(rw<=12) a.command.push(rw<=6?'Treasury critical':'Treasury warning');
  const md=state.mandate;
  if(md && md.accepted && md.deadlineAbs-absMonth()<=6) a.command.push('Mandate deadline near');
  if(md && !md.accepted) a.command.push('Mandate offer pending');
  (state.staff||[]).forEach(s=>{ if(s.morale<30){ const p=personById(s.id); a.command.push((p?p.name:'Staff')+' morale critical'); } });
  workforceGaps().filter(g=>g.kind==='understaffed').forEach(g=>a.command.push((departmentDef(g.id)||{}).name+' dept unstaffed'));
  (state.passiveContracts||[]).forEach(cn=>{ if(cn.monthsLeft<=3){ const d=passiveDef(cn.id); a.command.push((d?passiveContractDisplay(d).name:cn.id)+' expiring'); } });
  // P9: surface an unsigned doctrine-exclusive contract once it's actually signable
  if(state.doctrine){ const dd=PASSIVE_CONTRACT_DEFS.find(x=>x.cat==='doct'&&x.reqDoctrine===state.doctrine);
    if(dd && passiveStatus(dd.id)==='available') a.command.push(dd.name+' signable'); }
  // P11/I3: whichever crisis is active is always worth a Command-tab flag
  if(state.crisis){ const cd=activeCrisisDef(); if(cd) a.command.push(`${cd.name} — ${Math.round(state.crisis.severity*100)}% severity`); }
  // Bench: active mission blocked by the current design
  const m=missionById(state.activeMission);
  if(m){ try{ const v=computeVehicle(); const chk=canLaunch(v,m,m.profile?simulateMission(m):null);
    if(!chk.ok && /shortfall|TWR|thrust/i.test(chk.why||'')) a.bench.push('Design can\'t fly '+m.name); }catch(e){} }
  // R&D: idle lab with an affordable node
  if(!state.activeResearch){
    const afford=RESEARCH.some(r=>!state.research[r.id] && reqsMet(r) && state.money>=r.cost);
    if(afford) a.rnd.push('Lab idle — research available');
  }
  // Map: committed launch window approaching
  if(state.committedWindow && state.committedWindow.abs-absDay()<=45) a.map.push('Committed window imminent');
  // Station: standing resupply shortfall — any built facility starved or ≤2 months of provisions with
  // no shipment already en route. (Replaces a call to resupplyShortfall(), a function that never
  // existed — the typeof guard meant this badge silently never fired. Audit 2026-07-13, M1.)
  try{ if(FACILITY_DEFS.some(d=>facilityBuilt(d.id) && !resupplyInTransit(d.id) && (facilityStarved(d.id) || facilitySupply(d.id)<=2))) a.station.push('Resupply shortfall'); }catch(e){}
  return a;
}
function renderTabBadges(){
  const a=tabAlerts();
  const map={command:'badgeCommand', bench:'badgeBench', rnd:'badgeRnd', map:'badgeMap', station:'badgeStation'};
  for(const k in map){ const el=$(map[k]); if(!el) continue;
    const n=a[k].length;
    el.classList.toggle('hidden', n===0);
    if(n){ el.textContent=n; el.title=a[k].join(' · '); }
  }
}

// User-directed era-evolving visual identity — swaps a body.era-* class as the campaign advances,
// automatically (eraVisualKey() reads state.year, not a manual pick). Cheap no-op most renders
// (cached against the last-applied key); only touches the DOM on an actual era-visual change.
let _lastEraVisual=null;
function applyEraVisual(){
  const key=eraVisualKey(); if(key===_lastEraVisual) return;
  _lastEraVisual=key;
  const b=document.body; if(!b) return;
  b.classList.remove('era-apollo','era-80s','era-90s2000s','era-spacex');
  b.classList.add('era-'+key);
}
// ---------- E0.3 Slice 2: setHTML() — memoized writes + focus/scroll preservation ----------
// The actual fix for E0.3's two named bugs (focus/scroll loss in re-rendered panels, time-warp DOM
// churn): skip the .innerHTML write entirely when the string is byte-identical to what this exact
// element was last written with, and when a real write does happen, capture/restore whatever had
// focus (+ its text selection) and whatever scrolled inside the element, so a content refresh that
// happens to land on a focused/scrolled panel doesn't yank the user's place. Deliberately not
// applied to every innerHTML site yet — Slice 0's plan calls for an incremental sweep starting with
// always-on regions (log, rail, outliner, objective, modal) plus the bench readout; most of the
// ~97 other sites still write directly and are unaffected by this slice.
let _htmlCache=new Map();
let _htmlCacheStateRef=null; // newGame()/applyLoadedSave() both reassign the top-level `state` var
// to a fresh object; comparing identity here is a free, zero-touch signal that state was replaced
// wholesale (a new game or a load), so stale cached strings from the PREVIOUS game can't cause a
// render to wrongly skip a write just because the new state happens to produce the same string.
function _captureFocusState(el){
  if(!el) return null;
  const active=(typeof document!=='undefined')?document.activeElement:null;
  if(!active || !active.id) return null;
  if(!(typeof el.contains==='function' && el.contains(active))) return null;
  const info={id:active.id};
  if(typeof active.selectionStart==='number'){ info.selStart=active.selectionStart; info.selEnd=active.selectionEnd; }
  return info;
}
function _restoreFocusState(info){
  if(!info) return;
  const el=document.getElementById(info.id);
  if(!el || typeof el.focus!=='function') return;
  el.focus();
  if(info.selStart!=null && typeof el.setSelectionRange==='function'){
    try{ el.setSelectionRange(info.selStart, info.selEnd); }catch(e){}
  }
}
// Captures the container's own scrollTop plus any id-bearing descendant's scrollTop (an existing
// id is already a stable handle to "the same logical element" across a rebuild — no new markup
// convention needed). Restoration looks descendants up by that same id post-rewrite.
function _captureScrollState(el){
  if(!el) return null;
  const map={};
  if(el.scrollTop) map['']=el.scrollTop;
  (function walk(node){
    Array.from(node.children||[]).forEach(c=>{ if(c.id && c.scrollTop) map[c.id]=c.scrollTop; walk(c); });
  })(el);
  return map;
}
function _restoreScrollState(el, map){
  if(!el || !map) return;
  if(map['']!=null) el.scrollTop=map[''];
  for(const id in map){
    if(id==='') continue;
    const c=document.getElementById(id);
    if(c) c.scrollTop=map[id];
  }
}
function setHTML(el, html){
  if(!el) return;
  if(state!==_htmlCacheStateRef){ _htmlCache=new Map(); _htmlCacheStateRef=state; } // new game / load — don't trust any cached string from the previous game
  if(_htmlCache.get(el)===html) return; // unchanged since last write — no DOM touch, nothing to preserve
  _htmlCache.set(el, html);
  const focusInfo=_captureFocusState(el);
  const scrollInfo=_captureScrollState(el);
  el.innerHTML=html;
  _restoreFocusState(focusInfo);
  _restoreScrollState(el, scrollInfo);
}
// ---------- E0.3 Slice 1: named render regions ----------
// Pure code motion — render()'s old body, split into these functions with zero statement
// reordering (RENDER_REGIONS below runs them in the exact original top-to-bottom sequence).
// A region name can tag more than one function (e.g. 'chrome', 'topbar', 'scene' each appear at
// two non-adjacent points in the original flow) — invalidate(name) runs every function tagged
// with that name, in original relative order, so a partial re-render can never observe a
// different execution order than renderAll() would have produced for those same functions.
// syncTopbarH()/updateTimeArrows() (renderTopbarLayout) must stay LAST — they read layout state
// that has to reflect every other region's writes first.
function renderChromeEra(){
  applyEraVisual();
}
function renderBadgesAndOutliner(){
  renderTabBadges(); // attention badges (UX pass)
  renderOutliner();  // the one-more-turn strip: every timer, one place, every scene
}
function renderTopbarStats(){
  $('coName').textContent=state.company;
  const era=currentEra();
  $('eraBadge').innerHTML=`Era ${eraIndex(era)+1}/${ERAS.length} · ${era.name}`;
  $('stDate').textContent=dateStr();
  $('stMoney').textContent=fM(state.money);
  $('stMoney').style.color = state.money<1.5?'var(--bad)':'var(--ink)';
  _statBump('stMoney', state.money, d=>(d>=0?'+':'−')+fM(Math.abs(d)));
  $('stRep').textContent=fI(state.rep);
  _statBump('stRep', state.rep, d=>(d>=0?'+':'−')+fI(Math.abs(d)));
  // #31 Slice 2: consume mission pulse (set by finalizeLaunch finish callback)
  if(_missionPulse){ const el=$('stRep'); if(el){ el.classList.remove('pulse-ok','pulse-bad'); void el.offsetWidth; el.classList.add(_missionPulse==='ok'?'pulse-ok':'pulse-bad'); el.addEventListener('animationend',()=>el.classList.remove('pulse-ok','pulse-bad'),{once:true}); } _missionPulse=null; }
  $('stFlights').textContent=state.flights;
  _statBump('stFlights', state.flights);
  const mood=publicMood();
  $('stSupport').textContent=`${Math.round(publicSupport())}% · ${mood.label}`;
  $('stSupport').style.color=mood.color;
  _statBump('stSupport', Math.round(publicSupport()));
  $('stDepotWrap').classList.toggle('hidden', !state.research.orbital_depot);
  if(state.research.orbital_depot) $('stDepot').textContent=state.depot.toFixed(1)+' t';
  $('stRoyaltyWrap').classList.toggle('hidden', !(state.pgmRoyalty>0));
  if(state.pgmRoyalty>0){ $('stRoyalty').textContent='+'+fM(state.pgmRoyalty)+'/mo'; $('stRoyalty').style.color='var(--ok)'; }
  const passInc=passiveMonthlyIncome();
  $('stPassiveWrap').classList.toggle('hidden', !(passInc>0));
  if(passInc>0){ $('stPassive').textContent='+'+fM(passInc)+'/mo'; $('stPassive').style.color='var(--ok)'; }
  const builtN=Object.keys(state.facilities||{}).filter(facilityBuilt).length;
  $('stInfraWrap').classList.toggle('hidden', builtN===0);
  if(builtN>0){ $('stInfra').textContent=`${builtN} · +${fM(totalFacilityIncome())}/mo`; $('stInfra').style.color='var(--ok)'; }
  const sci=state.science||0;
  $('stSciWrap').classList.toggle('hidden', sci<=0);
  if(sci>0){ $('stSci').textContent=Math.round(sci)+' ⚛'; $('stSci').style.color='var(--readout)'; }
  _statBump('stSci', sci);
  renderMarketStat();
}
function renderChromeShellRail(){
  // slice 2: tag the shell with the active view's kind (scene vs panel) so CSS / later
  // slices (right rail, center takeover) can react without re-deriving it.
  const shell=$('appShell');
  if(shell){
    shell.classList.toggle('viewing-scene', isSceneTab(state.tab));
    shell.classList.toggle('viewing-panel', !isSceneTab(state.tab));
    shell.classList.toggle('command-hero', state.tab==='command');
    // slice 3: show the active scene's contextual right-rail panel; collapse the rail on panels.
    const RAIL={command:'railCommand',bench:'railBench',map:'railMap',rnd:'railRnd',station:'railStation'};
    let activePanel=RAIL[state.tab]||null;
    // command's alerts panel (ccRight) is adv-only, so the rail is empty in Basic → don't reserve it.
    let railAdvOnly=(state.tab==='command');
    // slice 5: on the hub, the Mission Control drill swaps Alerts for the Contracts panel (shown in all layers).
    if(state.tab==='command' && hubPanel==='contracts'){ activePanel='railContracts'; railAdvOnly=false; }
    for(const id of ['railCommand','railBench','railMap','railRnd','railStation','railContracts']){ const p=$(id); if(p) p.classList.toggle('hidden', id!==activePanel); }
    shell.classList.add('has-right'); // the persistent accordion always occupies the right rail, so keep it shown on every scene
  }
  // The header is outside #appShell, so its Command Center grading needs the same
  // tab-derived class rather than inheriting the hero's scoped surface variables.
  if(typeof document!=='undefined' && document.body) document.body.classList.toggle('command-mode', state.tab==='command');
  placeCommandCenterChrome();
}
// Phase 3A: there is still only one scene nav and one operations ticker. On Command Center they
// are moved into the Cape hero; on every other scene they return to their established rail/topbar
// homes. Moving the existing nodes preserves all ids, badges, handlers, focus behavior and filters.
function placeCommandCenterChrome(){
  const command=state.tab==='command';
  const move=(id,targetId)=>{
    const node=$(id), target=$(targetId);
    if(node&&target&&node.parentNode!==target) target.appendChild(node);
  };
  move('sceneNav', command?'ccDock':'railNavHome');
  move('tlControls', command?'ccTicker':'opsTickerHome');
  move('opsTimeline', command?'ccTicker':'opsTickerHome');
}
function renderChromeTabsViews(){
  $('tabCommand').classList.toggle('active',state.tab==='command');
  $('tabBench').classList.toggle('active',state.tab==='bench');
  $('tabRnd').classList.toggle('active',state.tab==='rnd');
  $('tabMap').classList.toggle('active',state.tab==='map');
  $('tabStation').classList.toggle('active',state.tab==='station');
  $('commandView').classList.toggle('hidden',state.tab!=='command');
  $('benchView').classList.toggle('hidden',state.tab!=='bench');
  $('rndView').classList.toggle('hidden',state.tab!=='rnd');
  $('mapView').classList.toggle('hidden',state.tab!=='map');
  $('stationView').classList.toggle('hidden',state.tab!=='station');
  placeOpsbar(); // on the Map view, the ops controls (row 2) ride across the top of the map card; elsewhere they stay pinned in the topbar
  applyDifficultyUI();
}
function renderTopbarStatus(){
  const ar=state.activeResearch;
  const rbar=$('rndStatusBar'); if(rbar) rbar.classList.toggle('hidden', !ar); // only show the bar while R&D is running
  $('rndStatus').innerHTML = ar
    ? `<span style="color:var(--readout)">R&D in progress:</span> ${RESEARCH.find(r=>r.id===ar.id).name} — <span class="num">${fmtTimeLeft(ar.monthsLeft)}</span> left`
    : '';
  $('skipBtn').disabled=!ar;
}
function renderSceneMain(){
  if(state.tab==='command')renderCommandCenter(); else { stopCCScene(); pauseCapeGame(); }
  if(state.tab!=='bench') pauseVehGame();
  if(state.tab!=='map') pauseMapGame();
  if(state.tab!=='station') pauseStationGame();
  if(state.tab==='bench'){renderVehicleFamilies();renderBlueprints();renderLivery();renderParts();renderArchitecture();renderStages();renderBoosters();renderTransfer();renderLander();renderCrew();renderPower();renderWindowPlanner();renderRoutes();renderReadout();renderVehiclePreview();renderBenchLaunch();renderBenchTabs();}
  if(state.tab==='command' && hubPanel==='contracts'){ renderMissions(); renderContractsSubtabs(); } // slice 5: contracts drill content (passiveCard + missionList), split into sub-tabs
}
function renderSceneRndMapStation(){
  if(state.tab==='rnd')renderRnd();
  if(state.tab==='map')renderMap();
  if(state.tab==='station')renderStation();
}
function renderModalRegion(){
  if(activeModal) activeModal(); // slice 6: keep an open deep-view modal (Programs/Rivals/Personnel) in sync with state
}
function renderTopbarLayout(){
  updateTimeArrows(); // keep the header time-arrow auto-run highlight in sync after a re-render
  syncTopbarH(); // keep sticky-panel offsets matched to the pinned topbar's actual height
}
const RENDER_REGIONS=[
  {name:'chrome', fn:renderChromeEra},
  {name:'badges', fn:renderBadgesAndOutliner},
  {name:'topbar', fn:renderTopbarStats},
  {name:'chrome', fn:renderChromeShellRail},
  {name:'chrome', fn:renderChromeTabsViews},
  {name:'topbar', fn:renderTopbarStatus},
  {name:'railLeft', fn:renderCCLeft}, // slice 4: the Basic-only focal guide lives in the left rail — rebuild on every scene
  {name:'railRight', fn:renderRailPersistent}, // persistent right-rail accordion (Mission Control / Flight Plan / Objectives)
  {name:'scene', fn:renderSceneMain},
  {name:'objective', fn:renderNextObjective},
  {name:'scene', fn:renderSceneRndMapStation},
  {name:'log', fn:renderLog},
  {name:'modal', fn:renderModalRegion},
  {name:'topbar', fn:renderTopbarLayout},
];
// render() stays a permanent alias for renderAll() — every existing call site (158 across the
// codebase as of this slice) keeps working untouched, forever if need be. invalidate(...names) is
// a strict subset of what renderAll() does (same functions, filtered by region name and run in
// the same relative order), so the two mechanisms can't drift out of sync or conflict mid-
// migration. No call site outside this file uses invalidate() yet — that starts in a later slice.
function renderAll(){
  if(RETIRED_TABS[state.tab]) state.tab=RETIRED_TABS[state.tab]; // migrate retired tabs (slice 4: planner) on every render, incl. legacy saves
  for(const r of RENDER_REGIONS) r.fn();
}
function invalidate(...names){
  for(const r of RENDER_REGIONS){ if(names.indexOf(r.name)!==-1) r.fn(); }
}
function render(){ renderAll(); }
/* ---------- #18: Agency Command Center (home screen + ground site map) ----------
   The new default landing screen: an at-a-glance dashboard plus a drill-down "site
   map" of the ground facilities that routes into the existing tabs. The data layer
   (commandSummary / siteBuildings) is pure so it can be exercised headlessly.
   Manufacturing & Production tiles are present-but-passive hooks for the unbuilt
   manufacturing system (#7). */
function availableContracts(){
  return MISSIONS.filter(m=> state.rep>=m.minRep && missionTechMet(m) && !state.completed[m.id]).length;
}
// Pure summary for the persistent-rail Contracts section + header badge. Derived only — no new state.
function contractsRailSummary(){
  const openMissions=availableContracts();
  const signable=PASSIVE_CONTRACT_DEFS.filter(d=>passiveStatus(d.id)==='available');
  const signableMo=round2(signable.reduce((a,d)=>a+passiveIncomeNow(d.id),0));
  return {openMissions, signable, signableMo, activeMo:passiveMonthlyIncome(), count:openMissions+signable.length};
}
// Preview body for the persistent-rail Contracts accordion section: standing income, the top
// signable passive contracts (Sign in place, no scene change), a mission-contract count, and a
// footer into the full drill. Reuses signPassiveContract/openHubPanel — no #passiveCard/#missionList
// ids, so it never double-renders with the full drill.
function railContractsHTML(){
  const s=contractsRailSummary();
  let html=`<div class="muted" style="font-size:12px;margin:0 0 8px">Standing income: <b style="color:${s.activeMo>0?'var(--ok)':'var(--dim)'}">+${fM(s.activeMo)}/mo</b>${s.signableMo>0?` · <span style="color:var(--ignite)">+${fM(s.signableMo)}/mo signable now</span>`:''}</div>`;
  const top=s.signable.slice(0,3);
  if(top.length){
    html+=top.map(d=>{
      const inc=passiveIncomeNow(d.id);
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;font-size:12px">
        <div style="min-width:0"><div style="color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${passiveContractDisplay(d).name}</div><div class="dim">+${fM(inc)}/mo · ${fM(d.setup)} setup</div></div>
        <button class="btn" style="font-size:11px;padding:3px 8px;flex-shrink:0" onclick="signPassiveContract('${d.id}')">Sign</button>
      </div>`;
    }).join('');
  } else {
    html+=`<div class="dim" style="font-size:12px;margin-bottom:6px">No passive contracts signable right now.</div>`;
  }
  if(s.openMissions>0) html+=`<div class="muted" style="font-size:12px;margin:6px 0 0">📄 <b style="color:var(--ink)">${s.openMissions}</b> mission contract${s.openMissions===1?'':'s'} available to fly.</div>`;
  html+=`<button class="btn ghost" style="width:100%;margin-top:8px;font-size:12px" onclick="openContractsPopout()">⤢ Open Contracts panel</button>`;
  return html;
}
// Contracts drill sub-tabs — Flight Contracts vs Passive Income, so passive income isn't buried below a
// long mission list. Transient UI state; both panes render, this toggles which is visible + tab counts.
let contractsSubTab='missions';
const contractAccordion={flight:true,sat:true,tour:true,lic:true,mil:true,doct:true};
function setContractsSubTab(t){ contractsSubTab=t; renderContractsSubtabs(); }
function toggleContractAccordion(cat){
  contractAccordion[cat]=contractAccordion[cat]===false;
  const f=$('contractsPopFlight'); if(f) f.innerHTML=renderFlightContractsPopout();
  renderPassiveContracts('contractsPopPassive'); renderPassiveContracts();
}
function renderContractsSubtabs(){
  const showP=contractsSubTab==='passive';
  const mp=$('missionsPane'), pc=$('passiveCard'), tm=$('ctTabMissions'), tp=$('ctTabPassive');
  if(mp) mp.style.display=showP?'none':'';
  if(pc) pc.style.display=showP?'':'none';
  if(tm) tm.classList.toggle('active', !showP);
  if(tp) tp.classList.toggle('active', showP);
  const cs=contractsRailSummary();
  if(tm) tm.innerHTML=`🚀 Flight Contracts${cs.openMissions>0?` <span class="pill">${cs.openMissions}</span>`:''}`;
  if(tp) tp.innerHTML=`📶 Passive Income${cs.activeMo>0?` <span class="pill ok">+${fM(cs.activeMo)}/mo</span>`:(cs.signable.length>0?` <span class="pill">${cs.signable.length}</span>`:'')}`;
}
function commandSummary(){
  const era=currentEra();
  const eOpex=empireOpex(); // CE4(a): empire carrying cost
  const overhead=Math.max(0, diff().overhead+econOverheadAdd()+productionUpkeep()+eOpex+loanInterest()+partnershipUpkeep()); // includes #7 production upkeep + CE4(a) empire opex + CE4(c) bridge-loan interest + #6 research-partnership upkeep
  const govFunding=govMonthlyFunding(); // #8: political funding from public support
  const income=round2(totalFacilityIncome()+(state.pgmRoyalty||0)+govFunding+passiveMonthlyIncome());
  const payroll=monthlyPayroll();
  const mood=publicMood();
  const net=round2(income-overhead-payroll);
  const m=curMission();
  const ar=state.activeResearch;
  const no=nextObjective();
  return {
    capital:state.money, rep:state.rep, flights:state.flights,
    era:era.name, eraIdx:eraIndex(era)+1, eraTotal:ERAS.length,
    successRate: state.flights>0?Math.round(100*state.successes/state.flights):null,
    income, overhead, empireOpex:eOpex, loanInterest:loanInterest(), payroll, net, science:Math.round(state.science||0),
    support:Math.round(publicSupport()), mood:mood.label, moodColor:mood.color, govFunding,
    research: ar?{name:(RESEARCH.find(r=>r.id===ar.id)||{}).name||ar.id, monthsLeft:ar.monthsLeft}:null,
    nextObjective: no?no.mission.name:null,
    activeMission: m?{name:m.name, buildMo:buildMonths(m)+1+TEST_LEVELS[state.testLevel].months}:null,
  };
}
/* ---------- #18 (Home redesign): pure builders for the dashboard panels ----------
   These take no DOM and return plain data, so the Home logic is unit-testable just
   like commandSummary()/siteBuildings(). The render functions below consume them. */
// walk a research prereq chain to the first node the player can start *now* toward targetId
function firstResearchableToward(targetId){
  if(!targetId || state.research[targetId]) return null;
  const r=RESEARCH.find(x=>x.id===targetId); if(!r) return null;
  for(const q of (r.req||[])){ if(!state.research[q]){ const deeper=firstResearchableToward(q); if(deeper) return deeper; } }
  return reqsMet(r) ? r : null; // all research prereqs met (else gated by a mission we can't shortcut)
}
function missionFlyable(mm){ return !!(mm && state.rep>=mm.minRep && missionTechMet(mm)); }
// the single best next move — answers "what should I do next?"
function recommendedAction(){
  const no=nextObjective();
  if(no){
    const mm=no.mission;
    if(mm.reqResearch && !state.research[mm.reqResearch]){
      if(state.activeResearch) return {kind:'wait', title:'R&D in progress', detail:`${(RESEARCH.find(x=>x.id===state.activeResearch.id)||{}).name||''} — ${fmtTimeLeft(state.activeResearch.monthsLeft)} left, on the path to ${mm.name}.`, tab:'rnd'};
      const r=firstResearchableToward(mm.reqResearch);
      if(r) return {kind:'research', title:`Research: ${r.name}`, detail:`Unlocks the path to ${mm.name}.`, tab:'rnd', researchId:r.id};
    }
    if(missionFlyable(mm)) return {kind:'launch', title:`Launch: ${mm.name}`, detail:`Your next objective — ${no.program.name}.`, tab:'bench', missionId:mm.id, reward:{money:mm.payout, rep:mm.rep}};
    if(state.rep<mm.minRep){
      const avail=MISSIONS.find(x=>!state.completed[x.id] && missionFlyable(x) && x.id!==mm.id);
      if(avail) return {kind:'rep', title:`Fly: ${avail.name}`, detail:`Build reputation toward ${mm.name} (needs ${mm.minRep}, you have ${Math.round(state.rep)}).`, tab:'bench', missionId:avail.id, reward:{money:avail.payout, rep:avail.rep}};
      return {kind:'rep', title:'Build reputation', detail:`${mm.name} needs ${mm.minRep} rep — fly available contracts to earn it.`, tab:'missions'};
    }
  }
  if(!state.activeResearch){
    const next=RESEARCH.find(r=>!state.research[r.id] && reqsMet(r) && state.money>=rdCostOf(r));
    if(next) return {kind:'research', title:`Research: ${next.name}`, detail:'Expand your capabilities.', tab:'rnd', researchId:next.id};
  }
  return {kind:'advance', title:'Advance the calendar', detail:'Let R&D and the program move forward a month.', tab:null};
}
// #18 slice 4: Mission Control Advisor — focus goal, requirement ✓/✗ analysis, and ranked actions.
// Pure: reuses nextObjective/missionFlyable/firstResearchableToward/computeVehicle/simulateMission.
function missionAdvisor(){
  const no=nextObjective();
  if(!no) return {goal:null, program:null, reqs:[], actions:[{label:'Set a new ambition',tab:'programs'}], ready:false, summary:'All program objectives achieved — push the frontier or set a new ambition.'};
  const mm=no.mission, reqs=[], actions=[];
  // research gate
  if(mm.reqResearch){ const done=!!state.research[mm.reqResearch], rn=(RESEARCH.find(r=>r.id===mm.reqResearch)||{}).name||mm.reqResearch;
    reqs.push({ok:done, label:'Research: '+rn});
    if(!done){ if(state.activeResearch) actions.push({label:`R&D in progress · ${fmtTimeLeft(state.activeResearch.monthsLeft)}`,tab:'rnd'}); else { const r=firstResearchableToward(mm.reqResearch); if(r) actions.push({label:'Research '+r.name,tab:'rnd',researchId:r.id}); } }
  }
  // CE3(c): lunar architecture fork gate — unlock + commit to a route (LOR/Direct/EOR)
  if(mm.archFork==='luna_landing'){ const any=anyLunarArchUnlocked(), committed=!!committedLunarArch();
    reqs.push({ok:any, label: any?(committed?`Lunar architecture: ${missionArchOf('luna_landing').name}`:'Commit a lunar architecture'):'Unlock a lunar architecture (LOR / Direct / EOR)'});
    if(!any){ const a=(missionArchList('luna_landing')||[]).find(x=>x.reqResearch); const r=a&&firstResearchableToward(a.reqResearch); if(r) actions.push({label:'Research '+r.name,tab:'rnd',researchId:r.id}); }
    else if(!committed) actions.push({label:'Choose a lunar architecture',tab:'bench'});
  }
  // reputation gate
  const repOk=state.rep>=mm.minRep;
  reqs.push({ok:repOk, label:`Reputation ≥ ${mm.minRep} (have ${Math.round(state.rep)})`});
  if(!repOk){ const avail=MISSIONS.find(x=>!state.completed[x.id]&&missionFlyable(x)&&x.id!==mm.id); if(avail) actions.push({label:`Fly ${avail.name} to build rep`,tab:'bench',missionId:avail.id}); }
  // vehicle feasibility — only meaningful when this mission is the one on the bench
  if(state.activeMission===mm.id){
    const v=computeVehicle(), sim=mm.profile?simulateMission(mm):null;
    if(mm.profile){ const fails=sim.legs.filter(l=>!l.pass).length; reqs.push({ok:fails===0, label: fails?`${fails} mission leg${fails>1?'s':''} short on Δv`:'Δv — all legs pass'}); if(fails) actions.push({label:'Boost Δv — Vehicle Design',tab:'bench'}); }
    else { const ok=v.totalDv>=mm.reqDv; reqs.push({ok, label:`Δv ${fI(v.totalDv)} / ${fI(mm.reqDv)} m/s`}); if(!ok) actions.push({label:'Add capability — Vehicle Design',tab:'bench'});
      if(v.twr<=1.0){ reqs.push({ok:false, label:`TWR ${v.twr.toFixed(2)} — won't lift off`}); actions.push({label:'Add engines — Vehicle Design',tab:'bench'}); } }
    const relTarget=mm.crew>0?0.80:0.70, relOk=v.reliability>=relTarget;
    reqs.push({ok:relOk, label:`Reliability ${(v.reliability*100|0)}% (target ${(relTarget*100)|0}%)`});
    if(!relOk){ if(!state.research.test_program) actions.push({label:'Research Static Fire Test',tab:'rnd'}); else actions.push({label:'Run a test campaign / upgrade QA',tab:'bench'}); }
  } else {
    reqs.push({ok:false, label:'Design a vehicle for this mission'});
    actions.push({label:`Select ${mm.name} on the bench`,tab:'bench',missionId:mm.id});
  }
  const ready=reqs.every(r=>r.ok);
  if(ready) actions.unshift({label:`Launch ${mm.name}`,tab:'bench',missionId:mm.id,primary:true});
  return {goal:mm.name, program:no.program.name, reward:{money:mm.payout||0, rep:mm.rep||0}, reqs, actions:actions.slice(0,4), ready};
}
// onclick string for an advisor/action object
function advisorClick(a){ return a.missionId?`selectMission('${a.missionId}')`:(a.researchId?`setTab('rnd')`:(a.tab?tabIntent(a.tab):`advanceMonth()`)); } // slice 5/6: tab intents route to drills/modals via tabIntent
// #18 slice 5: grouped objectives checklist (main / recommended / long-term / completed)
function objectivesList(){
  const groups=[];
  const no=nextObjective();
  if(no){ const mm=no.mission; let sub;
    if(state.rep<mm.minRep) sub=`reputation ${Math.round(state.rep)}/${mm.minRep}`;
    else if(mm.reqResearch && !state.research[mm.reqResearch]) sub=`needs ${(RESEARCH.find(r=>r.id===mm.reqResearch)||{}).name||'research'}`;
    else sub='ready to fly';
    groups.push({title:'Main objective', items:[{label:mm.name, done:false, sub, tab:'bench', missionId:mm.id}]});
  } else groups.push({title:'Main objective', items:[{label:'All objectives complete', done:true}]});
  const rec=[];
  if(!(state.staff||[]).some(s=>ENGINEERS.find(e=>e.id===s.id))) rec.push({label:'Hire an engineer', done:false, tab:'personnel'});
  // contextual nudges for the specialist hire categories — only when the role would help and one is hirable
  const _hasRole=r=>(state.staff||[]).some(s=>roleOf(s.id)===r), _canHire=r=>availablePool().some(p=>roleOf(p.id)===r);
  if(!_hasRole('sci') && _canHire('sci') && (state.activeResearch||RESEARCH.some(r=>!state.research[r.id]&&reqsMet(r)))) rec.push({label:'Hire a scientist', done:false, tab:'personnel'});
  if(!_hasRole('controller') && _canHire('controller') && no && no.mission && (no.mission.crew||0)>0) rec.push({label:'Hire a flight director', done:false, tab:'personnel'});
  if(!_hasRole('exec') && _canHire('exec') && typeof runwayMonths==='function' && runwayMonths()<18) rec.push({label:'Hire an executive', done:false, tab:'personnel'});
  if(!state.activeResearch && RESEARCH.some(r=>!state.research[r.id]&&reqsMet(r))) rec.push({label:'Start a research project', done:false, tab:'rnd'});
  for(const def of FACILITY_DEFS){ if(!facilityBuilt(def.id) && canFound(def.id).ok){ rec.push({label:`Found ${def.name}`, done:false, tab:'infra'}); break; } }
  if(rec.length) groups.push({title:'Recommended', items:rec.slice(0,3)});
  const HEAD=['first_sat','crew_orbit','luna_landing','mars_orbit','jupiter_orbit'];
  const lt=HEAD.map(id=>{ const m=MISSIONS.find(x=>x.id===id); return m?{label:m.name, done:!!state.completed[id]}:null; }).filter(Boolean);
  if(lt.length) groups.push({title:'Long-term', items:lt});
  const recent=Object.keys(state.history||{}).sort((a,b)=>state.history[b]-state.history[a]).slice(0,3)
    .map(id=>{ const m=MISSIONS.find(x=>x.id===id); return m?{label:`${m.name} (${state.history[id]})`, done:true}:null; }).filter(Boolean);
  if(recent.length) groups.push({title:'Completed', items:recent});
  return groups;
}
// red/amber/green operational alerts derived from state
function agencyAlerts(){
  const out=[]; const s=commandSummary();
  if(state.money<1.5) out.push({level:'bad', msg:`Capital low — ${fM(state.money)}`, tab:'missions'});
  if(!state.activeResearch && RESEARCH.some(r=>!state.research[r.id]&&reqsMet(r))) out.push({level:'warn', msg:'No active research', tab:'rnd'});
  if(publicSupport()<25) out.push({level:'warn', msg:`Public support low (${Math.round(publicSupport())}%)`, tab:'command'});
  const lowMorale=(state.staff||[]).filter(x=>(x.morale||50)<35).length;
  if(lowMorale) out.push({level:'warn', msg:`${lowMorale} staff with low morale`, tab:'personnel'});
  const m=curMission(); if(m && bayBuildDelta(m)>0) out.push({level:'warn', msg:`Build over bay capacity (+${bayBuildDelta(m)} mo)`, tab:'infra'});
  for(const fid in (state.facilities||{})){ if(facilityBuilt(fid)){ const pr=facilityProduction(facilityById(fid), facilityState(fid)); if(pr.fuel>0){ out.push({level:'ok', msg:`${facilityById(fid).name} producing fuel`, tab:'infra'}); break; } } }
  if(s.net>0) out.push({level:'ok', msg:`Positive cashflow (+${fM(s.net)}/mo)`, tab:'command'});
  return out.slice(0,6);
}
// this-month operations summary from the ledger + lifetime stats
function ccOpsSummary(){
  const lm=state.lastMonth||{revenue:0,expenses:0,net:0,flights:0};
  const s=commandSummary();
  return {revenue:lm.revenue||0, expenses:lm.expenses||0, net:lm.net||0, flights:lm.flights||0,
          lifetimeFlights:state.flights, successRate:s.successRate, monthlyNet:s.net};
}

/* ---------- Finances: detailed current/past/future cash-flow pop-out ----------
   Reuses the exact same recurring-flow functions commandSummary()/state.lastMonth already call
   (totalFacilityIncome/govMonthlyFunding/passiveMonthlyIncome/diff().overhead/econOverheadAdd/
   productionUpkeep/empireOpex/loanInterest/partnershipUpkeep/monthlyPayroll) — just itemized
   instead of pre-summed, so nothing here can drift out of sync with the numbers shown elsewhere. */
function financesBreakdown(){
  const revenueItems=[
    {label:'Facility income', amount:totalFacilityIncome()},
    {label:'Belt royalty', amount:state.pgmRoyalty>0?state.pgmRoyalty:0},
    {label:'Government funding', amount:govMonthlyFunding()},
    {label:'Passive contracts', amount:passiveMonthlyIncome()},
  ].filter(x=>x.amount>0.001);
  const expenseItems=[
    {label:'Base overhead', amount:diff().overhead},
    {label:'Market/event surcharge', amount:Math.max(0,econOverheadAdd())},
    {label:'Production upkeep', amount:productionUpkeep()},
    {label:'Empire operating cost', amount:empireOpex()},
    {label:'Bridge-loan interest', amount:loanInterest()},
    {label:'Research partnerships', amount:partnershipUpkeep()},
    {label:'Payroll', amount:monthlyPayroll()},
  ].filter(x=>x.amount>0.001);
  const revenue=round2(revenueItems.reduce((a,x)=>a+x.amount,0));
  const expenses=round2(expenseItems.reduce((a,x)=>a+x.amount,0));
  return {revenueItems, expenseItems, revenue, expenses, net:round2(revenue-expenses)};
}
// Best-effort $ amount pulled from a log line's own already-formatted fM() text (e.g. "+$12.00M",
// "−$2.50M") — same heuristic-text-sniffing spirit as logCategory(), not a formal transaction ledger
// (that would mean instrumenting every one of the ~47 state.money call sites across the file).
function tlMoneyAmount(msg){
  const s=tlStripPlain(msg);
  const m=s.match(/([+−-])\s*\$([\d,]+\.?\d*)M/);
  if(!m) return null;
  const val=parseFloat(m[2].replace(/,/g,''));
  if(!isFinite(val)) return null;
  return (m[1]==='+'?1:-1)*val;
}
function recentCashEvents(n){
  const out=[];
  for(const l of state.log){
    const amt=tlMoneyAmount(l.msg); if(amt==null) continue;
    out.push({when:l.when, msg:tlStrip(l.msg), amount:amt});
    if(out.length>=(n||12)) break;
  }
  return out;
}
// Linear projection at the current recurring net rate, plus the known upcoming one-time deltas
// already sitting in state (a mandate bonus on the way, a passive contract about to lapse, a
// special contract still open) — not a full future simulator, just what's already knowable.
function financeProjections(){
  const net=commandSummary().net;
  const horizon = net>=0
    ? [6,12].map(mo=>({label:`In ${mo} months at this rate`, amount:round2(state.money+net*mo)}))
    : (()=>{ const rw=runwayMonths(); return [{label:'Runway at current burn', text: isFinite(rw)?`~${Math.max(1,Math.round(rw))} mo`:'—'}]; })();
  const upcoming=[];
  const md=state.mandate;
  if(md && md.accepted) upcoming.push(`+${fM(md.bonus)} mandate bonus due by ${dateOfAbs(md.deadlineAbs)}`);
  (state.passiveContracts||[]).forEach(cn=>{ if(cn.monthsLeft<=3){ const d=passiveDef(cn.id);
    upcoming.push(`−${fM(cn.income)}/mo lapses in ${fmtTimeLeft(cn.monthsLeft)} — ${d?passiveContractDisplay(d).name:cn.id} expires`); } });
  const sc=state.specialContract;
  if(sc) upcoming.push(`+${fM(sc.bonus)} special contract if flown within ${fmtTimeLeft(sc.deadlineAbs-absMonth())}`);
  return {net, horizon, upcoming};
}
function showFinancesModal(){
  const b=financesBreakdown();
  const row=(x)=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0"><span class="dim">${x.label}</span><span style="color:var(--ok)">+${fM(x.amount)}</span></div>`;
  const erow=(x)=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0"><span class="dim">${x.label}</span><span style="color:var(--bad)">−${fM(x.amount)}</span></div>`;
  const revHTML=b.revenueItems.length?b.revenueItems.map(row).join(''):'<div class="dim" style="font-size:12px">No standing income yet.</div>';
  const expHTML=b.expenseItems.length?b.expenseItems.map(erow).join(''):'<div class="dim" style="font-size:12px">No standing expenses.</div>';
  const events=recentCashEvents(12);
  const evHTML=events.length?events.map(e=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:2px 0">
      <span class="dim" style="flex:0 0 auto">${e.when}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.msg}">${e.msg}</span>
      <span style="flex:0 0 auto;color:${e.amount>=0?'var(--ok)':'var(--bad)'}">${e.amount>=0?'+':'−'}${fM(Math.abs(e.amount))}</span>
    </div>`).join('') : '<div class="dim" style="font-size:12px">No recent transactions logged.</div>';
  const hist=state.metricHist||defaultMetricHist();
  const netChart=netFlowBarsSVG(hist.net||[], {label:'monthly net, last '+METRIC_HISTORY_LEN+' months'});
  const proj=financeProjections();
  const horizonHTML=proj.horizon.map(h=>`<div class="metric"><div class="k">${h.label}</div><div class="v" style="color:${h.amount!=null?(h.amount>=0?'var(--ok)':'var(--bad)'):'var(--warn)'}">${h.amount!=null?fM(h.amount):h.text}</div></div>`).join('');
  const upcomingHTML=proj.upcoming.length?proj.upcoming.map(u=>`<div class="dim" style="font-size:12px;padding:2px 0">• ${u}</div>`).join('') : '<div class="dim" style="font-size:12px">Nothing specific on the horizon — just the recurring flow above.</div>';
  showModal(`<h2 style="margin-bottom:2px">💰 Finances</h2>
    <p class="muted" style="font-size:12px;margin:0 0 10px">${esc(state.company)} — current standing, recent activity, and where the treasury is headed.</p>
    <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px">
      <div style="flex:1;min-width:220px"><div class="cc-panel-h" style="margin:0 0 4px">Revenue — ${fM(b.revenue)}/mo</div>${revHTML}</div>
      <div style="flex:1;min-width:220px"><div class="cc-panel-h" style="margin:0 0 4px">Expenses — ${fM(b.expenses)}/mo</div>${expHTML}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:6px 0;margin-bottom:12px">
      <b>Net</b><b style="font-size:16px;color:${b.net>=0?'var(--ok)':'var(--bad)'}">${b.net>=0?'+':''}${fM(b.net)}/mo</b>
    </div>
    <div class="cc-panel-h" style="margin:0 0 4px">Recent transactions</div>
    <div style="max-height:150px;overflow:auto;margin-bottom:12px">${evHTML}</div>
    <div class="cc-panel-h" style="margin:0 0 4px">Past — monthly net, last ${METRIC_HISTORY_LEN} months</div>
    <div style="margin-bottom:12px">${netChart}</div>
    <div class="cc-panel-h" style="margin:0 0 4px">Future — projection</div>
    <div class="metrics" style="margin-bottom:6px">${horizonHTML}</div>
    ${upcomingHTML}
    <button class="btn" style="width:100%;margin-top:12px" onclick="hideModal()">Close</button>`, true);
}
// era band + claimed-first markers for the bottom timeline
function ccTimeline(){
  const minYear=ERAS[0].from;
  const maxYear=Math.max(2100, state.year);
  const span=Math.max(1, maxYear-minYear);
  const pos=y=>clampA(Math.round((y-minYear)/span*100),0,100);
  const eras=ERAS.map(e=>({name:e.name, from:e.from, to:Math.min(e.to, maxYear), pos:pos(e.from)}));
  const markers=[];
  // player firsts (recorded years)
  for(const id in (state.history||{})){ const mm=MISSIONS.find(x=>x.id===id); if(mm) markers.push({year:state.history[id], label:mm.name, who:'you', pos:pos(state.history[id])}); }
  // rival firsts that have fired
  for(const r of RIVALS){ for(const f of r.firsts){ if(state.rivalFired[r.id+'|'+f.name]) markers.push({year:f.year, label:f.name, who:'rival', flag:r.flag, pos:pos(f.year)}); } }
  // CE1(c): live projection — each rival's PENDING goal at its currently-projected year
  for(const r of RIVALS){ const pj=rivalProjectedYear(r); if(pj && pj.year>=state.year && pj.year<=maxYear) markers.push({year:pj.year, label:pj.goal.name+' (projected)', who:'rival', proj:true, flag:r.flag, pos:pos(pj.year)}); }
  markers.sort((a,b)=>a.year-b.year);
  return {minYear, maxYear, curYear:state.year, curPos:pos(state.year), eras, markers};
}
// recent newsworthy log lines for the right panel
function ccNews(n){ return (state.log||[]).filter(l=>['rival','ok','bad','note'].includes(l.kind)).slice(0, n||7); }

/* ---------- Cape building status glyphs ----------
   Each building on the Cape shows a small state dot so the home screen reads at a glance:
   red = needs you now · amber = working/in progress · green = healthy · grey = idle/nothing.
   Pure functions of live state — no side effects, safe to call every render. */
function buildingGlyph(key){
  // returns {state:'attention'|'active'|'ok'|'idle', label:'…'}
  const ar=state.activeResearch, m=curMission();
  switch(key){
    case 'pad': {
      if(!m) return {state:'idle', label:'No mission selected'};
      try{ const v=computeVehicle(); const chk=canLaunch(v,m,m.profile?simulateMission(m):null);
        if(!chk.ok) return {state:'attention', label:'Design can\'t fly the selected mission'}; }catch(e){}
      return {state:'active', label:'Mission ready to build & fly'};
    }
    case 'rnd':
      if(ar) return {state:'active', label:'Researching · '+fmtTimeLeft(ar.monthsLeft)};
      { const afford=RESEARCH.some(r=>!state.research[r.id] && reqsMet(r) && state.money>=r.cost);
        return afford?{state:'attention', label:'Lab idle — research available'}:{state:'idle', label:'Lab idle'}; }
    case 'mission': {
      const n=availableContracts();
      const md=state.mandate;
      if(md && !md.accepted) return {state:'attention', label:'Government mandate offered'};
      if(md && md.accepted && md.deadlineAbs-absMonth()<=6) return {state:'attention', label:'Mandate deadline near'};
      return n>0?{state:'active', label:n+' contract'+(n===1?'':'s')+' available'}:{state:'idle', label:'No contracts'};
    }
    case 'prod': {
      const load=cadenceLoad();
      if(padSlotsLeft()<=0 && curMonthPadUsed()>0) return {state:'attention', label:'All launch pads used this month'};
      if(load>0.85) return {state:'active', label:'Build cadence '+Math.round(load*100)+'% of sustainable'};
      return {state:'ok', label:'Pads & foundry nominal'};
    }
    case 'mfg': {
      try{
        const mb=materialCostMult(); if(mb>1.15) return {state:'attention', label:'Raw-material market hot (+'+Math.round((mb-1)*100)+'%)'};
        const dipped=MATERIAL_DEFS.find(d=>isMaterialDip(d.key) && canBuyMaterialDip(d.key).ok);
        if(dipped) return {state:'attention', label:dipped.name+' on sale — stock up'};
      }catch(e){}
      return {state:'ok', label:'Bays L'+prodLevel('bays')};
    }
    case 'personnel': {
      const crit=(state.staff||[]).filter(s=>s.morale<30).length;
      if(crit>0) return {state:'attention', label:crit+' staff at critical morale'};
      const gaps=workforceGaps();
      const under=gaps.filter(g=>g.kind==='understaffed');
      if(under.length) return {state:'attention', label:(departmentDef(under[0].id)||{}).name+' department unstaffed'};
      if(gaps.length) return {state:'attention', label:(departmentDef(gaps[0].id)||{}).name+' has no lead'};
      return (state.staff||[]).length?{state:'ok', label:state.staff.length+' hired'}:{state:'idle', label:'Unstaffed'};
    }
    case 'infra': {
      const exp=(state.passiveContracts||[]).filter(cn=>cn.monthsLeft<=3).length;
      if(exp>0) return {state:'attention', label:exp+' contract'+(exp===1?'':'s')+' expiring'};
      const built=Object.keys(state.facilities||{}).filter(facilityBuilt).length;
      return built?{state:'ok', label:built+' facilit'+(built===1?'y':'ies')+' online'}:{state:'idle', label:'No facilities'};
    }
    case 'map': {
      if(state.committedWindow && state.committedWindow.abs-absDay()<=45) return {state:'attention', label:'Committed launch window imminent'};
      const infl=(state.activeFlights||[]).length; // in-flight tracking, if present
      return infl>0?{state:'active', label:infl+' mission'+(infl===1?'':'s')+' in flight'}:{state:'idle', label:'Planning surface'};
    }
    case 'rivals': {
      let top=-1; for(const id in (state.rivalThreat||{})) if(state.rivalThreat[id]>top) top=state.rivalThreat[id];
      return top>=0.66?{state:'attention', label:'Rival threat high'}:top>=0.33?{state:'active', label:'Rivals active'}:{state:'ok', label:'Rivals quiet'};
    }
    case 'doctrine':
      return state.doctrine?{state:'ok', label:DOCTRINES[state.doctrine].name}:{state:'attention', label:'No doctrine declared'};
    default: return {state:'ok', label:''};
  }
}
const GLYPH_COLOR={attention:'#e8604c', active:'#e8b64c', ok:'#5fae62', idle:'#5a6672'};

function siteBuildings(){
  const builtFac=Object.keys(state.facilities||{}).filter(facilityBuilt).length;
  const ar=state.activeResearch;
  const m=curMission();
  let topThreat=null, topScore=-1;
  for(const id in (state.rivalThreat||{})){ if(state.rivalThreat[id]>topScore){ topScore=state.rivalThreat[id]; topThreat=id; } }
  const threatTxt=topThreat?rivalThreatLabel(topScore):'quiet';
  return [
    {key:'pad', icon:'🚀', name:'Launch Pad', tab:'bench', labelDx:-104, // shift label left so it clears the rocket on the pad
     status: m?`${m.name} · ${buildMonths(m)+1+TEST_LEVELS[state.testLevel].months} mo to fly`:'no mission selected', planned:false},
    {key:'mission', icon:'📡', name:'Mission Control', tab:'missions', act:"openHubPanel('contracts')",
     status:`${availableContracts()} contract${availableContracts()===1?'':'s'} available`, planned:false},
    {key:'mfg', icon:'🏭', name:'Manufacturing', tab:'infra', act:"showInfrastructureModal()",
     status:`Bays L${prodLevel('bays')} · capacity ${bayCapacity()}`, planned:false},
    {key:'prod', icon:'⚙', name:'Production', tab:'infra', act:"showInfrastructureModal()",
     status:`Foundry L${prodLevel('foundry')} · Pads L${prodLevel('pads')} (${launchPadCap()}/mo${curMonthPadUsed()>0?`, ${padSlotsLeft()} free`:''})`, planned:false},
    {key:'rnd', icon:'⚗', name:'R&D Lab', tab:'rnd',
     status: ar?`${(RESEARCH.find(r=>r.id===ar.id)||{}).name||ar.id} · ${fmtTimeLeft(ar.monthsLeft)}`:'idle', planned:false},
    {key:'personnel', icon:'👥', name:'Personnel', tab:'personnel', act:"showPersonnelModal()",
     status: (state.staff||[]).length?`${state.staff.length} hired · ${fM(monthlyPayroll())}/mo`:'unstaffed', planned:false},
    {key:'infra', icon:'▣', name:'Orbital Ops', tab:'infra', act:"showInfrastructureModal()",
     status: builtFac?`${builtFac} facilit${builtFac===1?'y':'ies'} · +${fM(totalFacilityIncome())}/mo`:'no facilities', planned:false},
    {key:'map', icon:'🪐', name:'Solar System', tab:'map', status:'plan & track missions', planned:false},
    {key:'rivals', icon:'◆', name:'Rivals', tab:'rivals', act:"showRivalsModal()", status:`threat: ${threatTxt}`, planned:false},
    {key:'doctrine', icon: state.doctrine?DOCTRINES[state.doctrine].icon:'⚑', name:'Doctrine', act:"showDoctrineModal()",
     status: state.doctrine?DOCTRINES[state.doctrine].name:'undeclared — pick an identity', planned:false},
  ];
}
// #18 (scene): each building's footprint on the Cape panorama as percent coords (0–100).
// Shared by the canvas painter and the DOM hotspot overlay so they stay aligned.
function ccHotspots(){ const L=isoLayout(); return siteBuildings().map(b=>Object.assign({}, b, (L[b.key]&&L[b.key].rect)||null)).filter(b=>b&&b.w>0); }
function drawDish(ctx,cx,cy,rad,ang){ ctx.save(); ctx.translate(cx,cy); ctx.rotate(ang);
  ctx.fillStyle='#2b3942'; ctx.beginPath(); ctx.ellipse(0,0,rad,rad*0.66,0,Math.PI*0.1,Math.PI*1.9); ctx.fill();
  ctx.strokeStyle='#485a66'; ctx.lineWidth=1; ctx.stroke();
  ctx.strokeStyle='#6b7c88'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(rad*0.5,-rad*0.4); ctx.stroke(); ctx.restore(); }
// #18 slice 6: the Space Center grows with company scale (pure — headless-testable)
function siteScale(){
  const fb=id=>{ try{ return facilityBuilt(id); }catch(e){ return false; } };
  const era=eraIndex(currentEra());
  return { pads:prodLevel('pads'), vab:prodLevel('bays'), foundry:prodLevel('foundry'),
    era, dishes:2+Math.min(3,era), leoOps:fb('leo_station'), lunarOps:fb('lunar_base'), marsOps:fb('mars_base'),
    flights:state.flights||0 };
}
/* ===================== Isometric Cape scene (Part 2) ===================== */
const ISO_TW=120, ISO_TH=60; // tile screen size
// #18 slice A: grid coords laid out so all 9 buildings PLUS max-growth items (4 extra pads, 3 ops
// facilities) have non-overlapping footprints AND non-overlapping clickable hotspot rects. Grouped:
// assembly/industrial back row (rnd·mfg·prod), admin/command mid (personnel·mission·infra),
// dome + launch pad front, rivals isolated far-right. (fw/fd/h/type/tint unchanged — coords only.)
const ISO_BUILDINGS=[
  {key:'rivals',    gx:6.7, gy:0.4, fw:1.0, fd:1.0, h:52, type:'rivalpad'},
  {key:'mfg',       gx:3.2, gy:0.6, fw:1.9, fd:1.5, h:142, type:'vab',     tint:'#b9c0c6'},
  {key:'rnd',       gx:0.9, gy:0.2, fw:1.2, fd:0.9, h:54, type:'lab',      tint:'#3a4650'},
  {key:'prod',      gx:5.15, gy:0.55, fw:1.6, fd:1.0, h:36, type:'prod',     tint:'#5a626a'},
  {key:'personnel', gx:0.4, gy:1.9, fw:1.0, fd:1.3, h:46, type:'admin',    tint:'#aab2b8'},
  {key:'mission',   gx:2.4, gy:2.4, fw:1.1, fd:1.1, h:70, type:'control',  tint:'#2c3640'},
  {key:'infra',     gx:4.1, gy:3.1, fw:1.2, fd:1.2, h:24, type:'dishes'},
  {key:'map',       gx:1.6, gy:3.7, fw:1.0, fd:1.0, h:48, type:'dome'},
  {key:'pad',       gx:6.2, gy:3.4, fw:1.3, fd:1.3, h:155, type:'pad'},
];
// User-directed era-tied variety (2026-07-11): the Command Center space-center scene reused the
// same building colors/pad materials/gantry every game, every era. Reuses eraVisualKey() (the same
// grouping the DOM-chrome era pass uses) so the two visual identities age up together. 'spacex' has
// no entry here deliberately — the EXISTING colors already read as the modern default, so that era
// is zero-risk (falls through to the unchanged values via the || chains below).
const ERA_BUILDING_TINT={
  apollo:    {vab:'#c9c2b0', lab:'#4a4438', admin:'#d6cdb8', prod:'#8a8272', control:'#3a3428'},
  '80s':     {vab:'#a8b0b8', lab:'#2e3a44', admin:'#9aa4ac', prod:'#4a545c', control:'#22303a'},
  '90s2000s':{vab:'#c4d0dc', lab:'#3a4a5c', admin:'#b8c4d0', prod:'#5a6a7c', control:'#2a3a4c'},
};
function eraBuildingTint(type){
  // Command Center blue is the shared visual language across every campaign era.
  const blue={vab:'#315b7c',lab:'#183b59',admin:'#477898',prod:'#244a68',control:'#0f304d'};
  return blue[type];
}
// Pad concrete + gantry lattice: Apollo's white-steel umbilical tower, the Shuttle era's signature
// rust-orange Fixed Service Structure (todays's default gantry color, unchanged for 80s/spacex), a
// cleaner light-gray 90s/2000s tower.
const ERA_PAD_STYLE={
  apollo:    {concrete:'#3a3a38', gantry:'#c8c8c0', gantryBeam:'rgba(200,200,190,0.4)'},
  '90s2000s':{concrete:'#2e3238', gantry:'#a8b0b8', gantryBeam:'rgba(180,190,200,0.4)'},
};
function eraPadStyle(){ return {concrete:'#1b4668', gantry:'#79b8dc', gantryBeam:'rgba(121,184,220,0.42)'}; }
const ISO_SPREAD=1.7; // gap multiplier between cells (buildings keep their size, just spread apart)
function isoOrigin(){ return {ox:CAPE_W*0.36, oy:CAPE_H*0.13}; }
function isoX(gx,gy){ const o=isoOrigin(); return o.ox+(gx-gy)*ISO_TW/2*ISO_SPREAD; }
function isoY(gx,gy){ const o=isoOrigin(); return o.oy+(gx+gy)*ISO_TH/2*ISO_SPREAD; }
function isoVAB_h(){ return 130*(1+Math.min(0.6,(prodLevel('bays')-1)*0.15)); } // VAB grows with bays
function isoLayout(){
  const out={};
  for(const b of ISO_BUILDINGS){
    const sx=isoX(b.gx,b.gy), sy=isoY(b.gx,b.gy);
    const h=(b.key==='mfg')?isoVAB_h():b.h;
    const halfW=(b.fw+b.fd)*ISO_TW/4+8, topY=sy-h-(b.fw+b.fd)*ISO_TH/4, botY=sy+(b.fw+b.fd)*ISO_TH/4+4;
    out[b.key]={sx,sy,h,def:b, rect:{x:(sx-halfW)/CAPE_W*100, y:topY/CAPE_H*100, w:(2*halfW)/CAPE_W*100, h:(botY-topY)/CAPE_H*100}};
  }
  return out;
}
function isoQuad(ctx, pts, fill, stroke){ ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=0.7;ctx.stroke();} }
const ISO_AV=2.85; // avenue grid-row (shared by the road painter and the vehicle router so traffic stays on the tarmac)
// position along a polyline of grid waypoints at param p∈[0,1]; returns grid pos + travel direction
function gridPath(wps,p){
  let total=0; const segs=[];
  for(let i=0;i<wps.length-1;i++){ const a=wps[i],b=wps[i+1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1e-6; segs.push({a,dx,dy,len}); total+=len; }
  let d=p*total;
  for(let i=0;i<segs.length;i++){ const s=segs[i]; if(d<=s.len||i===segs.length-1){ const f=Math.max(0,Math.min(1,d/s.len)); return {gx:s.a[0]+s.dx*f, gy:s.a[1]+s.dy*f, dgx:s.dx, dgy:s.dy}; } d-=s.len; }
  const e=wps[wps.length-1]; return {gx:e[0],gy:e[1],dgx:0,dgy:0};
}
function pingpong(t,speed,phase){ const u=((t*speed+(phase||0))%2+2)%2; return u>1?2-u:u; } // 0→1→0 triangle, no teleport-jump
// Crawlerway waypoints (grid space) — detours east of Orbital Ops (infra) so the crawler never clips the building.
// Shared by the road painter and the crawler so the tarmac and the tracks always agree.
function crawlerRouteGrid(){
  const mfg=ISO_BUILDINGS.find(b=>b.key==='mfg'), pad=ISO_BUILDINGS.find(b=>b.key==='pad');
  const bx=pad.gx+0.35; // bypass lane to the east of Orbital Ops
  return [[mfg.gx,mfg.gy],[bx,mfg.gy+0.45],[bx,pad.gy-0.5],[pad.gx,pad.gy]];
}
// One-way delivery cycle: crawl VAB→pad, park (dwell) at the pad, then reset OFF-SCREEN (loading the next stack
// back at the VAB) — so it always moves toward the pad and terminates there, never reversing across the scene.
function crawlerCycle(t){ const CRAWL=26, DWELL=11, RESET=7, T=CRAWL+DWELL+RESET, u=((t%T)+T)%T;
  if(u<CRAWL) return {p:u/CRAWL, show:true};        // moving to the pad
  if(u<CRAWL+DWELL) return {p:1, show:true};         // parked at the pad
  return {p:0, show:false}; }                         // resetting at the VAB (hidden)
// a small standing ground-crew figure with a soft shadow
function isoPerson(ctx,x,y,col){ ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x,y+1.5,2.6,1.1,0,0,7); ctx.fill(); ctx.strokeStyle=col; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-4); ctx.stroke(); ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x,y-5.4,1.5,0,7); ctx.fill(); }
// shaded iso box centred at ground (sx,sy), footprint fw×fd tiles, height h px
function isoBox(ctx,sx,sy,fw,fd,h,base){
  const ex=ISO_TW/2, ey=ISO_TH/2, a=fw/2, b=fd/2;
  const Cb=[sx -a*ex +b*ex, sy -a*ey -b*ey]; // back
  const Cr=[sx +a*ex +b*ex, sy +a*ey -b*ey]; // right
  const Cf=[sx +a*ex -b*ex, sy +a*ey +b*ey]; // front
  const Cl=[sx -a*ex -b*ex, sy -a*ey +b*ey]; // left
  const up=p=>[p[0],p[1]-h];
  isoQuad(ctx,[Cl,Cf,up(Cf),up(Cl)], shade(base,-0.35), 'rgba(0,0,0,0.3)'); // left face (dark)
  isoQuad(ctx,[Cf,Cr,up(Cr),up(Cf)], shade(base,-0.12), 'rgba(0,0,0,0.25)'); // right face
  isoQuad(ctx,[up(Cb),up(Cr),up(Cf),up(Cl)], shade(base,0.18), 'rgba(255,255,255,0.12)'); // top (light)
  return {Cb,Cr,Cf,Cl,up};
}
function isoWindows(ctx,p0,p1,h,rows,cols,col){ // grid of lit windows on a face (p0→p1 bottom edge)
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const fx=(c+0.5)/cols, fy=(r+0.6)/rows;
    const x=p0[0]+(p1[0]-p0[0])*fx, y=p0[1]+(p1[1]-p0[1])*fx - h*fy;
    const lit=0.3+0.5*Math.abs(Math.sin(r*3+c*7));
    ctx.fillStyle=`rgba(${col},${lit.toFixed(2)})`; ctx.fillRect(x-1.4,y-1.4,2.8,2.8);
  }
}
function drawIsoBuilding(ctx,L,t){
  if(!L) return; const b=L.def, sx=L.sx, sy=L.sy, h=L.h;
  if(b.type==='pad'){ drawIsoPad(ctx,sx,sy,b,t); return; }
  if(b.type==='dishes'){ drawIsoDishes(ctx,sx,sy,b,t); return; }
  if(b.type==='dome'){ drawIsoDome(ctx,sx,sy,b,t); return; }
  if(b.type==='rivalpad'){ ctx.globalAlpha=0.7; drawIsoPad(ctx,sx,sy,b,t,true); ctx.globalAlpha=1; return; }
  const palette=eraBuildingTint(b.type)||b.tint||{vab:'#2b3a44', lab:'#26323a', admin:'#2a3540', prod:'#222e36', control:'#243038'}[b.type]||'#283139';
  const box=isoBox(ctx,sx,sy,b.fw,b.fd,h,palette);
  // windows on the two visible faces
  isoWindows(ctx,box.Cl,box.Cf,h, Math.max(2,Math.round(h/22)), 3, b.type==='control'?'88,196,122':(b.type==='lab'?'79,209,217':'245,166,35'));
  isoWindows(ctx,box.Cf,box.Cr,h, Math.max(2,Math.round(h/22)), 3, '245,166,35');
  isoGreebles(ctx,box,h,b.key);
  const top=box.up([sx,sy]);
  if(b.type==='vab'){ // VAB: tall bay doors on the front-right face + roof ridge + beacon
    for(let d=-1;d<=1;d++){ const fx=0.5+d*0.27; const px=box.Cf[0]+(box.Cr[0]-box.Cf[0])*fx, py=box.Cf[1]+(box.Cr[1]-box.Cf[1])*fx, dh=h*0.55; ctx.fillStyle='#0e151b'; ctx.fillRect(px-4,py-dh,8,dh); ctx.strokeStyle=themeRgba('ignite',0.35); ctx.lineWidth=0.6; ctx.strokeRect(px-4,py-dh,8,dh); }
    isoQuad(ctx,[box.up(box.Cb),box.up(box.Cr),box.up(box.Cf),box.up(box.Cl)], shade('#2b3a44',0.30), 'rgba(255,255,255,0.1)'); // bright roof ridge
    ctx.fillStyle=`rgba(255,70,50,${0.4+0.6*(Math.sin(t*3)>0?1:0.3)})`; ctx.beginPath(); ctx.arc(top[0],top[1]-4,3,0,7); ctx.fill();
    // manufacturing exhaust stack + darker, sootier smoke (reads heavier than the light pad smoke)
    const bkT=box.up(box.Cb), stkX=bkT[0]+15, stkBot=bkT[1]+9, stkTop=stkBot-22;
    ctx.fillStyle='#363c42'; ctx.fillRect(stkX-2.4, stkTop, 4.8, stkBot-stkTop);
    ctx.fillStyle='#2a2f34'; ctx.fillRect(stkX-2.9, stkTop-2, 5.8, 2.4); // stack cap
    drawIsoSmoke(ctx, stkX, stkTop-2, t, 5, 1.05, '74,70,64', 0.34);
    // flag + agency wordmark band on the front-right face (à la the real VAB)
    const fA=box.Cf, fB=box.Cr, ufx=0.16, flx=fA[0]+(fB[0]-fA[0])*ufx, fly=fA[1]+(fB[1]-fA[1])*ufx, fyT=fly-h*0.78;
    ctx.fillStyle='#c43b32'; for(let s=0;s<7;s+=2) ctx.fillRect(flx-8, fyT+s*1.4, 16, 1.4);
    ctx.fillStyle='#e8edf1'; for(let s=1;s<7;s+=2) ctx.fillRect(flx-8, fyT+s*1.4, 16, 1.4);
    ctx.fillStyle='#28508c'; ctx.fillRect(flx-8, fyT, 7, 4.2);
    const bx=fA[0]+(fB[0]-fA[0])*0.55, by=fA[1]+(fB[1]-fA[1])*0.55; ctx.fillStyle='rgba(232,237,241,0.85)'; ctx.fillRect(bx-12, by-h*0.5, 24, 7); ctx.fillStyle='#3a5a9c'; ctx.fillRect(bx-10, by-h*0.5+1.5, 20, 4);
    isoScaffold(ctx, box.Cl[0]-10, box.Cl[1]+2, h*0.66); // scaffolding beside the VAB
  } else if(b.type==='control'){
    ctx.strokeStyle='#8794a0'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(top[0],top[1]); ctx.lineTo(top[0],top[1]-22); ctx.stroke();
    drawDish(ctx, top[0]+11, top[1]-1, 11, -0.7+0.15*Math.sin(t*0.5)); // rooftop radar
    const bl=(Math.sin(t*4)>0)?1:0.3; ctx.fillStyle=`rgba(255,70,50,${0.4+0.6*bl})`; ctx.beginPath(); ctx.arc(top[0],top[1]-22,2.6,0,7); ctx.fill();
  } else if(b.type==='prod'){ // sawtooth factory roof + a large roll-up bay door
    const lT=box.up(box.Cl), rT=box.up(box.Cr); for(let s=0;s<3;s++){ const fx=0.18+s*0.3; const ax=lT[0]+(rT[0]-lT[0])*fx, ay=lT[1]+(rT[1]-lT[1])*fx; ctx.fillStyle=shade(palette,0.14); ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax+11,ay-9); ctx.lineTo(ax+16,ay-3); ctx.closePath(); ctx.fill(); }
    const dfx=0.5, dx=box.Cf[0]+(box.Cr[0]-box.Cf[0])*dfx, dy=box.Cf[1]+(box.Cr[1]-box.Cf[1])*dfx, dh=h*0.7, dw=18; ctx.fillStyle='#10171c'; ctx.fillRect(dx-dw/2,dy-dh,dw,dh); ctx.strokeStyle='rgba(180,186,194,0.3)'; ctx.lineWidth=0.6; for(let s=1;s<5;s++){ ctx.beginPath(); ctx.moveTo(dx-dw/2,dy-dh*s/5); ctx.lineTo(dx+dw/2,dy-dh*s/5); ctx.stroke(); }
    isoScaffold(ctx, box.Cr[0]+8, box.Cr[1]+2, h*0.8);
  } else if(b.type==='lab'){ ctx.fillStyle='#3a464e'; ctx.fillRect(top[0]-8,top[1]-6,5,6); ctx.fillRect(top[0]+4,top[1]-5,5,5); // roof vents
  } else if(b.type==='admin'){ ctx.fillStyle='#3a464e'; isoQuad(ctx,[[box.Cf[0]-11,box.Cf[1]],[box.Cf[0]+11,box.Cf[1]],[box.Cf[0]+8,box.Cf[1]-7],[box.Cf[0]-8,box.Cf[1]-7]],'#3a464e'); } // entrance canopy
}
// A spherical cryogenic propellant tank on a support skirt (returns its geometry so pipes can attach).
function isoCryoTank(ctx,x,baseY,r,col,frost,t){
  ctx.fillStyle='rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(x,baseY+1.5,r*1.05,r*0.4,0,0,7); ctx.fill(); // ground shadow
  ctx.fillStyle='#3a4047'; ctx.beginPath(); ctx.moveTo(x-r*0.72,baseY); ctx.lineTo(x-r*0.52,baseY-r*0.62); ctx.lineTo(x+r*0.52,baseY-r*0.62); ctx.lineTo(x+r*0.72,baseY); ctx.closePath(); ctx.fill(); // skirt
  const cyc=baseY-r*0.62-r*0.92; // sphere centre
  const g=ctx.createRadialGradient(x-r*0.4,cyc-r*0.4,r*0.2, x,cyc,r*1.15);
  g.addColorStop(0,shade(col,0.42)); g.addColorStop(1,shade(col,-0.32));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,cyc,r,0,7); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=1; ctx.stroke();
  if(frost){ ctx.fillStyle=`rgba(190,222,245,${(0.22+0.06*Math.abs(Math.sin(t))).toFixed(3)})`; ctx.beginPath(); ctx.arc(x,cyc,r*0.95,0.25,Math.PI-0.25); ctx.fill(); } // cryo frost on the underside
  return {x, baseY, cyc, top:cyc-r};
}
function drawIsoPad(ctx,sx,sy,b,t,rival){
  const ex=ISO_TW/2, ey=ISO_TH/2, a=b.fw/2, bb=b.fd/2;
  const padStyle=rival?null:eraPadStyle();
  // concrete pad diamond
  isoQuad(ctx,[[sx-a*ex+bb*ex,sy-a*ey-bb*ey],[sx+a*ex+bb*ex,sy+a*ey-bb*ey],[sx+a*ex-bb*ex,sy+a*ey+bb*ey],[sx-a*ex-bb*ex,sy-a*ey+bb*ey]], rival?'#2a2622':(padStyle?padStyle.concrete:'#2a2e33'), 'rgba(0,0,0,0.4)');
  // lattice gantry (vertical) to one side
  const gx=sx+ex*0.5, gTop=sy-(rival?b.h:b.h), gBot=sy;
  ctx.strokeStyle=rival?'#5a4a44':(padStyle?padStyle.gantry:'#8a6038'); ctx.lineWidth=2; ctx.strokeRect(gx-6, gTop, 12, gBot-gTop);
  ctx.strokeStyle=padStyle&&!rival?padStyle.gantryBeam:'rgba(180,120,70,0.4)'; ctx.lineWidth=1; for(let yy=gTop;yy<gBot;yy+=12){ ctx.beginPath(); ctx.moveTo(gx-6,yy); ctx.lineTo(gx+6,yy+12); ctx.moveTo(gx+6,yy); ctx.lineTo(gx-6,yy+12); ctx.stroke(); }
  const bl=(Math.sin(t*4)>0)?1:0.2; ctx.fillStyle=`rgba(255,60,40,${0.4+0.6*bl})`; ctx.beginPath(); ctx.arc(gx+6,gTop,3,0,7); ctx.fill();
  if(rival){ ctx.fillStyle='#c2b8b2'; ctx.fillRect(sx-1.5,sy-b.h*0.7,3,b.h*0.7); return; }
  // Propellant farm: spherical LOX (oxygen) + RP-1 (fuel) tanks on the open grass to the screen-LEFT of
  // the pad (clear of the gantry on the right and the crawlerway to the east), with feed pipes to the
  // gantry base. Kept short and off to the side so they never occlude the rocket, gantry, or any road.
  const tA=isoCryoTank(ctx, sx-58, sy+10, 9,   '#e8eef4', true,  t);  // LOX / oxygen — white, frosted
  const tB=isoCryoTank(ctx, sx-78, sy+19, 7.5, '#d9cdb0', false, t);  // RP-1 / fuel — tan
  ctx.lineCap='round';
  ctx.strokeStyle='#5f666d'; ctx.lineWidth=2.6;
  [tA,tB].forEach(tk=>{ ctx.beginPath(); ctx.moveTo(tk.x, tk.baseY); ctx.lineTo((tk.x+gx)/2, tk.baseY+2); ctx.lineTo(gx, sy); ctx.stroke(); });
  ctx.strokeStyle='rgba(175,185,195,0.4)'; ctx.lineWidth=0.9;
  [tA,tB].forEach(tk=>{ ctx.beginPath(); ctx.moveTo(tk.x, tk.baseY-1); ctx.lineTo((tk.x+gx)/2, tk.baseY+1); ctx.lineTo(gx, sy-1); ctx.stroke(); });
  ctx.lineCap='butt';
  // liftoff lead-in: during the transient sequence the rocket rises off the pad with a bright
  // ground plume + exhaust column (reusing drawIsoSmoke). rise is driven by playLiftoff's clock.
  const rise=_liftoff?_liftoff.rise:0, loInt=_liftoff?_liftoff.intensity:0;
  if(_liftoff){
    const baseX=sx-ex*0.35, baseY=sy+2, rocketY=baseY-rise;
    ctx.save();
    // billowing ground cloud spreading from the pad base
    for(let i=0;i<5;i++){ drawIsoSmoke(ctx, baseX+(i-2)*11, baseY, t, i*1.7+0.3, 1.7+loInt*1.3, '244,238,228', 0.5*loInt); }
    // exhaust column trailing up from the pad to the rising rocket
    for(let i=0;i<4;i++){ const p=i/4; drawIsoSmoke(ctx, baseX+Math.sin(t*3+i)*3, baseY-rise*p, t, 4+i, 1.0+loInt*0.8, '228,222,212', 0.4*loInt*(1-p*0.6)); }
    // engine flame just below the rising rocket's tail
    if(rise>2){ const fy=rocketY+8, g=ctx.createRadialGradient(baseX,fy,1,baseX,fy,14);
      g.addColorStop(0,`rgba(255,242,205,${0.9*loInt})`); g.addColorStop(0.4,`rgba(255,150,60,${0.7*loInt})`); g.addColorStop(1,'rgba(255,90,30,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(baseX,fy+4,5,11,0,0,7); ctx.fill(); }
    ctx.restore();
  }
  // the player's current vehicle, standing upright on the pad
  let spec=null; try{ const m=curMission(); spec={ stages: state.stages.map(s=>({prop:s.prop,count:s.count,dia:s.dia})), boosters: boosterSpec(), transferProp:(m&&m.profile&&m.modules&&m.modules.includes('transfer'))?state.transfer.prop:0, crewed:!!(m&&m.crew>0) }; }catch(e){}
  if(spec){ let shape=null; try{ shape=buildVehicleShape(spec); }catch(e){}
    if(shape&&shape.segs.length){
      // PHYSICAL scale (fixed px per shape-unit) instead of fit-to-gantry, so a tiny first-launch rocket reads as
      // tiny dwarfed by the gantry and bigger vehicles visibly grow toward (and eventually tower past) it.
      const PAD_ROCKET_K=0.40; let scale=PAD_ROCKET_K;
      const maxDrawH=b.h*1.18, minDrawH=11, maxDrawW=ISO_TW*0.46;
      if(shape.totalH*scale>maxDrawH) scale=maxDrawH/shape.totalH; // a giant booster towers but won't overflow the scene
      if(shape.maxW*scale>maxDrawW) scale=maxDrawW/shape.maxW;     // keep it on the pad footprint
      if(shape.totalH*scale<minDrawH) scale=minDrawH/shape.totalH; // a sounding rocket stays a readable speck
      ctx.save(); ctx.translate(sx-ex*0.35, sy+2-rise); drawVehicle(ctx, shape.segs, shape.nose, scale, 0, 0); ctx.restore(); } }
}
function drawIsoDishes(ctx,sx,sy,b,t){
  isoBox(ctx,sx,sy,b.fw,b.fd,b.h,'#1f2933');
  const n=Math.max(2, 2+Math.min(3, (function(){try{return eraIndex(currentEra());}catch(e){return 0;}})()));
  for(let i=0;i<n;i++){ const cx=sx+ISO_TW*0.12+i*(ISO_TW*0.55/Math.max(1,n-1)), cy=sy-b.h-6; ctx.strokeStyle='#3a4a55'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,sy-b.h+4); ctx.stroke(); drawDish(ctx,cx,cy,18,-0.9+0.18*Math.sin(t*0.6+i)); }
}
function drawIsoDome(ctx,sx,sy,b,t){
  isoBox(ctx,sx,sy,b.fw,b.fd,b.h*0.4,'#1c2730');
  const cy=sy-b.h*0.4, rw=ISO_TW*0.34;
  ctx.fillStyle='#243440'; ctx.beginPath(); ctx.ellipse(sx,cy,rw,rw*0.6,0,Math.PI,0); ctx.fill();
  ctx.strokeStyle='#3c4e5a'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(sx,cy,rw,rw*0.6,0,Math.PI,0); ctx.stroke();
  ctx.fillStyle=`rgba(245,197,66,${0.5+0.5*Math.abs(Math.sin(t*1.5))})`; ctx.beginPath(); ctx.arc(sx,cy-rw*0.5,2,0,7); ctx.fill();
}
function isoDiamond(ctx,g0x,g0y,g1x,g1y){ const p=[[g0x,g0y],[g1x,g0y],[g1x,g1y],[g0x,g1y]].map(c=>[isoX(c[0],c[1]),isoY(c[0],c[1])]); ctx.beginPath(); p.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])); ctx.closePath(); }
// ---- Phase B realism: shadows, roads, vehicles, boat, props ----
function isoShadow(ctx,sx,sy,fw,fd){ const ex=ISO_TW/2,ey=ISO_TH/2,a=fw*0.6,b=fd*0.6,ox=-7,oy=4;
  isoQuad(ctx,[[sx+ox-a*ex+b*ex,sy+oy-a*ey-b*ey],[sx+ox+a*ex+b*ex,sy+oy+a*ey-b*ey],[sx+ox+a*ex-b*ex,sy+oy+a*ey+b*ey],[sx+ox-a*ex-b*ex,sy+oy-a*ey+b*ey]],'rgba(0,0,0,0.22)'); }
function roadSeg(ctx,ax,ay,bx,by,w,col){ ctx.strokeStyle=col; ctx.lineWidth=w; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke(); ctx.lineCap='butt'; }
// rooftop units, antenna, and facade ribs (deterministic per building)
function isoGreebles(ctx,box,h,key){
  const rnd=mulberry(hashStr(key||'x'));
  const A=box.up(box.Cb), B=box.up(box.Cr), Cc=box.up(box.Cf), D=box.up(box.Cl);
  const onTop=(u,v)=>{ const p1=[A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u], p2=[D[0]+(Cc[0]-D[0])*u,D[1]+(Cc[1]-D[1])*u]; return [p1[0]+(p2[0]-p1[0])*v, p1[1]+(p2[1]-p1[1])*v]; };
  // rooftop AC/vent stacks drawn as tiny isometric diamonds so they sit on the surface
  const n=1+Math.floor(rnd()*3);
  for(let i=0;i<n;i++){
    const p=onTop(0.2+rnd()*0.6, 0.2+rnd()*0.6), s=2.5+rnd()*2.5;
    isoQuad(ctx,[[p[0]-s,p[1]],[p[0],p[1]+s*0.5],[p[0],p[1]+s*0.5-s],[p[0]-s,p[1]-s]],'#2e3a42',null);
    isoQuad(ctx,[[p[0],p[1]+s*0.5],[p[0]+s,p[1]],[p[0]+s,p[1]-s],[p[0],p[1]+s*0.5-s]],'#374650',null);
    isoQuad(ctx,[[p[0]-s,p[1]-s],[p[0],p[1]+s*0.5-s],[p[0]+s,p[1]-s],[p[0],p[1]-s*1.5]],'#4a5860',null);
  }
  // antenna array (1–3 masts)
  const masts=1+Math.floor(rnd()*3);
  for(let m=0;m<masts;m++){ const ap=onTop(0.35+rnd()*0.3, 0.35+rnd()*0.3), mh=10+rnd()*14; ctx.strokeStyle='#8794a0'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(ap[0],ap[1]); ctx.lineTo(ap[0],ap[1]-mh); ctx.stroke(); if(rnd()>0.5){ ctx.fillStyle='rgba(255,80,60,0.7)'; ctx.beginPath(); ctx.arc(ap[0],ap[1]-mh,1.6,0,7); ctx.fill(); } }
  ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=1; // facade ribs on the right face
  for(let r=1;r<6;r++){ const fx=r/6, bx=box.Cf[0]+(box.Cr[0]-box.Cf[0])*fx, by=box.Cf[1]+(box.Cr[1]-box.Cf[1])*fx; ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx,by-h); ctx.stroke(); }
}
// lattice scaffolding tower beside a building
function isoScaffold(ctx,x,y,h){ ctx.strokeStyle='rgba(150,158,166,0.8)'; ctx.lineWidth=1; const w=11; ctx.strokeRect(x-w/2,y-h,w,h); for(let yy=y-h;yy<y-2;yy+=9){ ctx.beginPath(); ctx.moveTo(x-w/2,yy); ctx.lineTo(x+w/2,yy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x-w/2,yy); ctx.lineTo(x+w/2,yy+9); ctx.stroke(); } }
// logical road network: a campus avenue along the front with a driveway to each building, plus the crawlerway
function drawIsoRoads(ctx,L){
  const AV=ISO_AV; // avenue grid-row (shared with the vehicle router)
  roadSeg(ctx, isoX(-1.2,AV),isoY(-1.2,AV), isoX(6.8,AV),isoY(6.8,AV), 9, '#33383d'); // main avenue
  ctx.strokeStyle='rgba(220,200,120,0.18)'; ctx.setLineDash([8,10]); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(isoX(-1.2,AV),isoY(-1.2,AV)); ctx.lineTo(isoX(6.8,AV),isoY(6.8,AV)); ctx.stroke(); ctx.setLineDash([]);
  for(const b of ISO_BUILDINGS){ if(b.type==='pad'||b.type==='rivalpad'||b.type==='dishes') continue; // driveway from each building to the avenue
    roadSeg(ctx, isoX(b.gx,b.gy),isoY(b.gx,b.gy), isoX(b.gx,AV),isoY(b.gx,AV), 5, '#2c3137'); }
  if(L.mfg&&L.pad){ // crawlerway VAB→pad — multi-segment so it bends cleanly around Orbital Ops
    const wp=crawlerRouteGrid().map(g=>[isoX(g[0],g[1]),isoY(g[0],g[1])]);
    const poly=()=>{ ctx.beginPath(); wp.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); };
    ctx.strokeStyle='#3a3f44'; ctx.lineWidth=16; ctx.lineJoin='round'; ctx.lineCap='round'; poly(); ctx.stroke();
    ctx.strokeStyle='rgba(220,200,120,0.22)'; ctx.setLineDash([7,9]); ctx.lineWidth=1.4; poly(); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap='butt'; ctx.lineJoin='miter'; }
}
// ---- Detailed space-center vehicles ----
// footprint helper: long axis runs along the travel direction so vehicles look like they're driving down the road
function vfoot(alongGx,len,wid){ return alongGx?{fw:len,fd:wid}:{fw:wid,fd:len}; }
// ---- Flat side-view cartoon vehicles (clean profile silhouettes — a real bus / truck / car shape) ----
// Each is a billboard drawn at the ground point (cx,cy); `face` (+1/−1) flips it to point along travel.
function rrPath(ctx,x,y,w,h,r){ r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function vWheel(ctx,x,gy,r){ ctx.fillStyle='#1b1f24'; ctx.beginPath(); ctx.arc(x,gy-r,r,0,7); ctx.fill();   // tyre seats on ground line gy
  ctx.fillStyle='#c2cad2'; ctx.beginPath(); ctx.arc(x,gy-r,r*0.46,0,7); ctx.fill();                          // hub
  ctx.fillStyle='#5a636b'; ctx.beginPath(); ctx.arc(x,gy-r,r*0.18,0,7); ctx.fill(); }                        // axle cap
function vShadow(ctx,cx,gy,w){ ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(cx,gy+1.5,w*0.55,3,0,0,7); ctx.fill(); }
// rising smoke puffs in the iso scene; colour/alpha parameterised so manufacturing smoke can read darker than pad smoke
function drawIsoSmoke(ctx,x,y,t,seed,sc,col,baseA){ for(let i=0;i<6;i++){ const p=((t*0.28+i/6+seed*0.37)%1); const sy=y-p*40*sc; const sx=x+Math.sin(p*6+seed*3)*7*sc; const rr=(2.2+p*9)*sc; ctx.fillStyle=`rgba(${col},${(baseA*(1-p)).toFixed(3)})`; ctx.beginPath(); ctx.arc(sx,sy,rr,0,7); ctx.fill(); } }
function vehCrawler(ctx,cx,cy,alongGx,t){
  // Crawler-transporter: massive orange tracked platform carrying a rocket to the pad
  const f=vfoot(alongGx,0.70,0.52), box=isoBox(ctx,cx,cy,f.fw,f.fd,10,'#2e3438');
  // Orange tread marks on the two visible faces
  ctx.strokeStyle='#c07828'; ctx.lineWidth=1.6;
  for(let i=0;i<7;i++){ const u=(i+0.3)/7, x=box.Cl[0]+(box.Cf[0]-box.Cl[0])*u, y=box.Cl[1]+(box.Cf[1]-box.Cl[1])*u; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-10); ctx.stroke(); }
  for(let i=0;i<7;i++){ const u=(i+0.3)/7, x=box.Cf[0]+(box.Cr[0]-box.Cf[0])*u, y=box.Cf[1]+(box.Cr[1]-box.Cf[1])*u; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-10); ctx.stroke(); }
  // Platform deck (lighter, separate from box top)
  isoQuad(ctx,[box.up(box.Cb),box.up(box.Cr),box.up(box.Cf),box.up(box.Cl)],'#4a5460','rgba(255,255,255,0.1)');
  // Lattice tower — two orange uprights + cross-members
  const top=box.up([cx,cy]);
  ctx.strokeStyle='#d07828'; ctx.lineWidth=2.2;
  ctx.beginPath(); ctx.moveTo(cx-5,top[1]); ctx.lineTo(cx-5,top[1]-42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+5,top[1]); ctx.lineTo(cx+5,top[1]-42); ctx.stroke();
  ctx.strokeStyle='#e08c38'; ctx.lineWidth=0.9;
  for(let yy=top[1]-42;yy<top[1];yy+=8){ ctx.beginPath(); ctx.moveTo(cx-5,yy); ctx.lineTo(cx+5,yy+4); ctx.stroke(); }
  // Rocket body on the tower
  const rb=top[1]-42;
  ctx.fillStyle='#ccd6e0'; ctx.fillRect(cx-3,rb-26,6,26); // stage body
  ctx.fillStyle='#8a9aaa'; ctx.fillRect(cx-3,rb-18,6,2); // interstage band
  ctx.fillStyle='#dde6f0'; ctx.beginPath(); ctx.moveTo(cx,rb-36); ctx.lineTo(cx-3,rb-26); ctx.lineTo(cx+3,rb-26); ctx.closePath(); ctx.fill(); // nose cone
  ctx.fillStyle='#7a5a34'; ctx.beginPath(); ctx.arc(cx,rb+1,4,Math.PI,0); ctx.fill(); // engine bell
  const bl=Math.sin(t*4)>0?0.9:0.3; ctx.fillStyle=`rgba(255,80,50,${bl})`; ctx.beginPath(); ctx.arc(cx,top[1]-44,2.2,0,7); ctx.fill(); // beacon
}
function vehTanker(ctx,cx,cy,alongGx,face){
  // LOX/RP-1 cryogenic tanker: cab + horizontal cylinder tank, 3 wheels (1 front, 2 rear) — flat side view
  vShadow(ctx,cx,cy,36);
  ctx.save(); ctx.translate(cx,cy); ctx.scale(face||1,1);
  const W=36,wr=3.3, bb=-wr;
  vWheel(ctx,-W*0.30,0,wr); vWheel(ctx,W*0.16,0,wr); vWheel(ctx,W*0.31,0,wr);
  ctx.fillStyle='#8a939c'; ctx.fillRect(-W/2,bb-3,W,3); // chassis
  // cab (front = +x)
  ctx.fillStyle='#21466a'; rrPath(ctx,W*0.20,bb-12,W*0.29,12,3); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle='#bfe0f5'; ctx.fillRect(W*0.30,bb-11,W*0.14,4.6); // windscreen
  ctx.fillStyle='#ffe39a'; ctx.beginPath(); ctx.arc(W/2-1.6,bb-2.4,1.3,0,7); ctx.fill(); // headlight
  // cylindrical cryo tank behind the cab
  const tx0=-W/2+1, tw=W*0.60, th=11, ty=bb-3-th;
  ctx.fillStyle='#eef3f8'; rrPath(ctx,tx0,ty,tw,th,th/2); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1; ctx.stroke();
  ctx.strokeStyle='#1a4a8a'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(tx0+tw*0.5,ty+0.5); ctx.lineTo(tx0+tw*0.5,ty+th-0.5); ctx.stroke(); // blue band
  ctx.fillStyle='rgba(150,200,235,0.55)'; rrPath(ctx,tx0+2.5,ty+1.6,tw-6,2.6,1.3); ctx.fill(); // frost sheen
  ctx.restore();
}
function vehFireTruck(ctx,cx,cy,alongGx,t,face){
  // Fire truck: red body + taller cab, roof ladder, yellow stripe, beacon — flat side view
  vShadow(ctx,cx,cy,34);
  ctx.save(); ctx.translate(cx,cy); ctx.scale(face||1,1);
  const W=34,H=12,wr=3.3, bb=-wr;
  vWheel(ctx,-W*0.30,0,wr); vWheel(ctx,W*0.16,0,wr); vWheel(ctx,W*0.32,0,wr);
  ctx.fillStyle='#cf2330'; rrPath(ctx,-W/2,bb-H,W*0.74,H,3.2); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=1; ctx.stroke(); // body
  ctx.fillStyle='#b81d28'; rrPath(ctx,W*0.18,bb-H-3,W*0.30,H+3,3); ctx.fill(); ctx.stroke(); // cab (front)
  ctx.fillStyle='#bfe0f5'; ctx.fillRect(W*0.235,bb-H-1.5,W*0.18,4.8); // cab window
  ctx.strokeStyle='#9aa3ab'; ctx.lineWidth=1.1; // roof ladder
  ctx.beginPath(); ctx.moveTo(-W*0.46,bb-H-1); ctx.lineTo(W*0.12,bb-H-2.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-W*0.46,bb-H-3); ctx.lineTo(W*0.12,bb-H-4.5); ctx.stroke();
  for(let i=0;i<6;i++){ const u=i/5, x=-W*0.46+u*(W*0.58), y=bb-H-1-u*1.5; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-2); ctx.stroke(); }
  ctx.fillStyle='#f5d23a'; ctx.fillRect(-W/2,bb-5,W*0.7,2.2); // yellow stripe
  const fl=Math.sin(t*7)>0?1:0.25; ctx.fillStyle=`rgba(255,90,50,${fl})`; ctx.beginPath(); ctx.arc(W*0.30,bb-H-4,1.6,0,7); ctx.fill(); // beacon
  ctx.fillStyle='#ffe39a'; ctx.beginPath(); ctx.arc(W/2-1.6,bb-2.2,1.3,0,7); ctx.fill(); // headlight
  ctx.restore();
}
function vehBus(ctx,cx,cy,alongGx,face){
  // Crew transport bus: long blue body, big window band, door + skirt stripe — flat side view
  vShadow(ctx,cx,cy,34);
  ctx.save(); ctx.translate(cx,cy); ctx.scale(face||1,1);
  const W=34,H=14,wr=3.4, bb=-wr;
  vWheel(ctx,-W*0.30,0,wr); vWheel(ctx,W*0.30,0,wr);
  ctx.fillStyle='#3f8fd0'; rrPath(ctx,-W/2,bb-H,W,H,5); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1; ctx.stroke(); // body
  ctx.fillStyle='#d2ecfb'; rrPath(ctx,-W/2+3.5,bb-H+3,W-7,H*0.42,2.2); ctx.fill(); // window band
  ctx.strokeStyle='#3f8fd0'; ctx.lineWidth=1.3; for(let i=1;i<5;i++){ const x=-W/2+3.5+(W-7)*i/5; ctx.beginPath(); ctx.moveTo(x,bb-H+3); ctx.lineTo(x,bb-H+3+H*0.42); ctx.stroke(); } // mullions
  ctx.fillStyle='#2b6fa8'; ctx.fillRect(W*0.16,bb-H*0.52,4.5,H*0.52); // door
  ctx.fillStyle='#c0353a'; ctx.fillRect(-W/2,bb-2,W,2); // skirt stripe
  ctx.fillStyle='#ffe39a'; ctx.beginPath(); ctx.arc(W/2-2,bb-2.4,1.4,0,7); ctx.fill(); // headlight (front)
  ctx.restore();
}
// Build depth-sortable vehicle render items that follow the actual road network in grid space.
function isoVehicleItems(ctx,t,L){
  const items=[], G=k=>L[k]&&L[k].def;
  // place a vehicle at path param pNow; `face` (+1/−1) is derived from screen-x travel vs a slightly
  // earlier sample (pPrev) so flat side-view vehicles point the way they're actually moving.
  const place=(wps,pNow,pPrev,fn)=>{ const s=gridPath(wps,pNow), a=gridPath(wps,pPrev);
    const cx=isoX(s.gx,s.gy), cy=isoY(s.gx,s.gy), alongGx=Math.abs(s.dgx)>=Math.abs(s.dgy);
    const sdx=(s.gx-s.gy)-(a.gx-a.gy), face=sdx>1e-4?1:(sdx<-1e-4?-1:1);
    items.push({d:s.gx+s.gy, draw:()=>fn(cx,cy,alongGx,face)}); };
  const mfg=G('mfg'), pad=G('pad'), prod=G('prod'), mission=G('mission'), personnel=G('personnel'), infra=G('infra');
  // 1. Crawler-transporter — one-way VAB→pad delivery along the bypass crawlerway, terminating (parking) at the pad
  if(mfg&&pad){ const cc=crawlerCycle(t); if(cc.show){ const ccp=crawlerCycle(Math.max(0,t-0.12)); place(crawlerRouteGrid(), cc.p, ccp.show?ccp.p:cc.p-0.01, (cx,cy,a)=>vehCrawler(ctx,cx,cy,a,t)); } }
  // 2. LOX tanker — prod shed → mission control, via its driveway, the avenue, and mission's driveway
  if(prod&&mission){ const w=[[prod.gx,prod.gy],[prod.gx,ISO_AV],[mission.gx,ISO_AV],[mission.gx,mission.gy]]; place(w, pingpong(t,0.05,0.4), pingpong(t-0.08,0.05,0.4), (cx,cy,a,fa)=>vehTanker(ctx,cx,cy,a,fa)); }
  // 3. Crew bus — personnel → VAB, same driveway/avenue routing
  if(personnel&&mfg){ const w=[[personnel.gx,personnel.gy],[personnel.gx,ISO_AV],[mfg.gx,ISO_AV],[mfg.gx,mfg.gy]]; place(w, pingpong(t,0.06,0.9), pingpong(t-0.08,0.06,0.9), (cx,cy,a,fa)=>vehBus(ctx,cx,cy,a,fa)); }
  // 4. Fire truck — fast patrol up and down the eastern avenue (standby near the pad)
  if(mission&&infra){ const w=[[mission.gx,ISO_AV],[infra.gx,ISO_AV]]; place(w, pingpong(t,0.12,0.2), pingpong(t-0.06,0.12,0.2), (cx,cy,a,fa)=>vehFireTruck(ctx,cx,cy,a,t,fa)); }
  // 5. Ground crew — small standing figures just in front of the busiest buildings
  ['pad','mfg','mission'].forEach(k=>{ const e=L[k]; if(!e) return; const b=e.def, wr=mulberry(hashStr('crew'+k)); const pts=[]; for(let i=0;i<4;i++) pts.push([(wr()-0.5)*34,(wr()*0.5)*16+4]);
    items.push({d:b.gx+b.gy+0.06, draw:()=>pts.forEach(o=>isoPerson(ctx,e.sx+o[0],e.sy+o[1],'rgba(208,218,225,0.85)'))}); });
  return items;
}
function drawCapeStars(ctx,W,H,t,atmo){
  if(atmo.starMul<=0.01) return;
  const rnd=mulberry(715221);
  ctx.save();
  for(let i=0;i<112;i++){
    const x=rnd()*W, y=(0.018+rnd()*0.43)*H, size=rnd()>0.91?1.8:0.72+rnd()*0.55;
    const twinkle=0.68+0.32*Math.sin(t*0.32+i*1.71);
    const alpha=(0.10+rnd()*0.30)*atmo.starMul*twinkle;
    ctx.fillStyle=`rgba(${rnd()>0.84?'180,222,255':'231,239,255'},${alpha.toFixed(3)})`;
    ctx.fillRect(x,y,size,size);
  }
  ctx.restore();
}
function drawCapeHorizon(ctx,W,H,atmo){
  // A broad atmospheric band separates the distant waterline from the sky without adding new scene state.
  const hY=H*0.43, glow=0.12+0.18*atmo.sunA+0.13*atmo.starMul;
  const haze=ctx.createLinearGradient(0,hY-H*0.12,0,hY+H*0.16);
  haze.addColorStop(0,'rgba(170,209,231,0)'); haze.addColorStop(0.52,`rgba(198,222,226,${glow.toFixed(3)})`); haze.addColorStop(1,'rgba(84,126,142,0)');
  ctx.fillStyle=haze; ctx.fillRect(0,hY-H*0.12,W,H*0.28);
  ctx.save(); ctx.globalCompositeOperation='screen';
  const rnd=mulberry(851602);
  for(let i=0;i<9;i++){
    const x=(rnd()*1.12-0.06)*W, y=hY+(rnd()-0.5)*H*0.055, r=W*(0.045+rnd()*0.065);
    ctx.fillStyle=`rgba(244,196,137,${(0.018+0.040*atmo.sunA).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(x,y,r,r*0.12,0,0,7); ctx.fill();
  }
  ctx.restore();
}
function drawIsoClouds(ctx,W,H,t,atmo){
  const decks=[{seed:334455,n:5,y:0.10,drift:2.4,alpha:0.035,colour:'170,207,228',flat:0.19},
    {seed:334456,n:6,y:0.23,drift:4.1,alpha:0.050,colour:'130,167,191',flat:0.27},
    {seed:334457,n:5,y:0.40,drift:1.7,alpha:0.030,colour:'246,187,132',flat:0.13}];
  ctx.save(); ctx.globalCompositeOperation='screen';
  decks.forEach(deck=>{ const rnd=mulberry(deck.seed);
    for(let i=0;i<deck.n;i++){
      const baseX=rnd()*W*1.16-W*0.08, cy=(deck.y+(rnd()-0.5)*0.11)*H;
      const x=((baseX+t*(deck.drift+rnd()*1.2))%(W*1.2))-W*0.10;
      const r=34+rnd()*58, alpha=deck.alpha*(0.48+0.52*atmo.sunA)+deck.alpha*0.30;
      ctx.fillStyle=`rgba(${deck.colour},${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(x,cy,r,r*deck.flat,0,0,7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x-r*0.34,cy-r*0.07,r*0.62,r*deck.flat*0.78,0,0,7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+r*0.39,cy-r*0.05,r*0.54,r*deck.flat*0.68,0,0,7); ctx.fill();
    }
  });
  ctx.restore();
}
function drawIsoBoat(ctx,t){ const p=(t*0.025)%1, x=isoX(8.6+p*1.6,1+p*3), y=isoY(8.6+p*1.6,1+p*3);
  ctx.fillStyle='#cdd3d8'; isoQuad(ctx,[[x-9,y],[x+9,y],[x+4,y-5],[x-4,y-5]],'#cdd3d8','rgba(0,0,0,0.3)'); ctx.fillStyle='#8a949d'; ctx.fillRect(x-1,y-11,2,6); }
function drawIsoProps(ctx,t){ const rnd=mulberry(987654);
  for(let i=0;i<50;i++){ const gx=-1.8+rnd()*9, gy=-1.8+rnd()*8; if(gx>7.0) continue; const x=isoX(gx,gy), y=isoY(gx,gy), kind=rnd();
    ctx.fillStyle='rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(x,y,4,2,0,0,7); ctx.fill();
    if(kind<0.42){ // round broadleaf tree
      const s=0.7+rnd()*0.9, col=['#2e4a2e','#356039','#274428','#3a5a34'][Math.floor(rnd()*4)];
      ctx.strokeStyle='#3a2a18'; ctx.lineWidth=1.4*s; ctx.beginPath(); ctx.moveTo(x,y-1); ctx.lineTo(x,y-7*s); ctx.stroke();
      ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(x-1,y-9*s,4*s,6*s,0,0,7); ctx.fill(); ctx.fillStyle=shade(col,0.14); ctx.beginPath(); ctx.ellipse(x-2,y-10*s,2.4*s,4*s,0,0,7); ctx.fill();
    } else if(kind<0.66){ // palm
      const s=0.8+rnd()*0.7; ctx.strokeStyle='#5a4a30'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+3,y-9*s,x+1,y-15*s); ctx.stroke();
      ctx.strokeStyle='#2f5a32'; ctx.lineWidth=1.3; for(let f=0;f<6;f++){ const a=-1.4+f*0.5; ctx.beginPath(); ctx.moveTo(x+1,y-15*s); ctx.quadraticCurveTo(x+1+Math.cos(a)*9, y-15*s+Math.sin(a)*5, x+1+Math.cos(a)*15, y-15*s+Math.sin(a)*10); ctx.stroke(); }
    } else if(kind<0.86){ // shrub clump
      const s=0.6+rnd()*0.6, col=rnd()>0.5?'#2a4326':'#324f2c'; ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(x,y-3*s,5*s,3.4*s,0,0,7); ctx.fill(); ctx.fillStyle=shade(col,0.12); ctx.beginPath(); ctx.ellipse(x-2*s,y-4*s,2.4*s,2*s,0,0,7); ctx.fill();
    } else { ctx.fillStyle='#4a4a40'; ctx.beginPath(); ctx.ellipse(x,y-1,3,2,0,0,7); ctx.fill(); } // scrub/rock
  }
}
// purely decorative props — a couple of idle ground dishes (left) and a lightning rod
function drawIsoDecor(ctx,t){
  [[-1.3,3.0],[-1.5,4.3]].forEach((c,i)=>{ const x=isoX(c[0],c[1]), y=isoY(c[0],c[1]);
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x,y,9,4,0,0,7); ctx.fill();
    ctx.strokeStyle='#3a4a55'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-16); ctx.stroke();
    drawDish(ctx,x,y-16,16,-0.8+0.12*Math.sin(t*0.5+i)); });
  const lx=isoX(-0.4,1.0), ly=isoY(-0.4,1.0), top=ly-92;
  ctx.strokeStyle='rgba(120,130,140,0.30)'; ctx.lineWidth=0.8; // guy wires
  [[-15,7],[15,7],[0,-13]].forEach(g=>{ ctx.beginPath(); ctx.moveTo(lx,top+20); ctx.lineTo(lx+g[0],ly+g[1]); ctx.stroke(); });
  ctx.strokeStyle='#9aa3ab'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx,top); ctx.stroke(); // mast
  ctx.strokeStyle='#cdd3d8'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(lx,top); ctx.lineTo(lx,top-9); ctx.stroke(); // pointed tip
  const bl=(Math.sin(t*5)>0.7)?1:0.3; ctx.fillStyle=`rgba(255,90,70,${0.4+0.6*bl})`; ctx.beginPath(); ctx.arc(lx,top-10,1.8,0,7); ctx.fill();
}
function drawIsoGround(ctx,W,H,t){
  // water on the far side of the coastline — shares the land's gy range so the shore matches
  const wg=ctx.createLinearGradient(isoX(7.5,-2),isoY(7.5,-2),isoX(11,6.5),isoY(11,6.5)); wg.addColorStop(0,'#16435a'); wg.addColorStop(0.48,'#0c3047'); wg.addColorStop(1,'#071a2d');
  ctx.fillStyle=wg; isoDiamond(ctx,7.5,-2,11,6.5); ctx.fill();
  for(let i=0;i<18;i++){ const f=i/18; const x=isoX(7.5+f*3.5,2.25), y=isoY(7.5+f*3.5,2.25)+Math.sin(t*1.2+i)*2; ctx.strokeStyle=`rgba(255,210,150,${0.12*(1-f)})`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x-10,y); ctx.lineTo(x+10,y); ctx.stroke(); }
  // grass landmass — diagonal gradient + mottled terrain + sandy shore
  const gg=ctx.createLinearGradient(isoX(-2,6.5),isoY(-2,6.5),isoX(7.5,-2),isoY(7.5,-2));
  gg.addColorStop(0,'#101b18'); gg.addColorStop(0.42,'#203326'); gg.addColorStop(0.78,'#35462c'); gg.addColorStop(1,'#51603a');
  ctx.fillStyle=gg; isoDiamond(ctx,-2,-2,7.5,6.5); ctx.fill();
  ctx.save(); isoDiamond(ctx,-2,-2,7.5,6.5); ctx.clip();
  const rnd=mulberry(424242);
  for(let i=0;i<46;i++){ const gx=-2+rnd()*9.5, gy=-2+rnd()*8.5, x=isoX(gx,gy), y=isoY(gx,gy), r=22+rnd()*64; ctx.fillStyle=`rgba(${rnd()>0.5?'66,86,52':'26,38,26'},0.13)`; ctx.beginPath(); ctx.ellipse(x,y,r,r*0.5,0,0,7); ctx.fill(); }
  ctx.fillStyle='rgba(150,138,98,0.22)'; for(let gy=-2;gy<6.5;gy+=0.45){ const x=isoX(7.25,gy),y=isoY(7.25,gy); ctx.beginPath(); ctx.ellipse(x,y,20,10,0,0,7); ctx.fill(); } // sandy shore
  ctx.restore();
  ctx.strokeStyle='rgba(120,140,110,0.08)'; ctx.lineWidth=1;
  for(let gx=-1;gx<=8;gx++){ ctx.beginPath(); ctx.moveTo(isoX(gx,-2),isoY(gx,-2)); ctx.lineTo(isoX(gx,6.5),isoY(gx,6.5)); ctx.stroke(); }
  for(let gy=-1;gy<=6;gy++){ ctx.beginPath(); ctx.moveTo(isoX(-2,gy),isoY(-2,gy)); ctx.lineTo(isoX(7.5,gy),isoY(7.5,gy)); ctx.stroke(); }
}
function capeLighting(t){
  const atmo=skyAtmosphere(t);
  // Practicals stay subtle through the day, then become the scene's secondary read at dusk and night.
  return Math.max(0.18,Math.min(1,0.16+atmo.starMul*0.62+(1-atmo.sunA)*0.32));
}
function capeLightPalette(){
  const era=eraVisualKey();
  if(era==='apollo') return {cyan:'132,205,218', amber:'255,193,108'};
  if(era==='80s') return {cyan:'104,185,218', amber:'248,161,76'};
  if(era==='90s2000s') return {cyan:'119,216,238', amber:'255,190,104'};
  return {cyan:'92,221,244', amber:'255,178,78'};
}
function drawCapePracticalLights(ctx,L,t){
  const level=capeLighting(t), col=capeLightPalette(), flicker=0.90+0.10*Math.sin(t*0.7);
  const pool=(x,y,r,rgb,a)=>{ const g=ctx.createRadialGradient(x,y,1,x,y,r); g.addColorStop(0,`rgba(${rgb},${a.toFixed(3)})`); g.addColorStop(0.28,`rgba(${rgb},${(a*0.40).toFixed(3)})`); g.addColorStop(1,`rgba(${rgb},0)`); ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,r,r*0.42,0,0,7); ctx.fill(); };
  ctx.save(); ctx.globalCompositeOperation='screen';
  const pad=L.pad, vab=L.mfg, mission=L.mission, prod=L.prod;
  if(pad){ pool(pad.sx-26,pad.sy+8,82,col.amber,0.18*level*flicker); pool(pad.sx+25,pad.sy+3,60,col.cyan,0.12*level); for(let i=0;i<5;i++){ const x=pad.sx-48+i*21, y=pad.sy+13-i*3; ctx.fillStyle=`rgba(${i%2?col.cyan:col.amber},${(0.45*level).toFixed(3)})`; ctx.fillRect(x-1,y-1,2,2); } }
  if(vab) pool(vab.sx+6,vab.sy+5,68,col.amber,0.10*level);
  if(mission) pool(mission.sx-9,mission.sy+5,44,col.cyan,0.11*level);
  if(prod) pool(prod.sx+5,prod.sy+5,38,col.amber,0.08*level);
  ctx.restore();
}
function drawCapeVignette(ctx,W,H){
  const v=ctx.createRadialGradient(W*0.52,H*0.45,Math.min(W,H)*0.18,W*0.52,H*0.45,Math.max(W,H)*0.76);
  v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(0.66,'rgba(0,5,10,0.02)'); v.addColorStop(1,'rgba(0,4,10,0.38)');
  ctx.fillStyle=v; ctx.fillRect(0,0,W,H);
}
// Depth-sortable growth items (extra pads, ops buildings) so they occlude/are-occluded correctly with traffic.
function isoGrowthItems(ctx,t,L){
  const items=[]; let sc; try{ sc=siteScale(); }catch(e){ return items; }
  // extra launch pads: a coastal launch row alongside the main pad (same gx, spaced fore/aft in gy)
  const pad=ISO_BUILDINGS.find(x=>x.key==='pad');
  for(let i=1;i<sc.pads;i++){ const off=[-2,-1,1,2][i-1]; if(off===undefined) break; const gx=pad.gx, gy=pad.gy+off; const sx=isoX(gx,gy), sy=isoY(gx,gy);
    items.push({d:gx+gy, draw:()=>{ ctx.strokeStyle='#7a5532'; ctx.lineWidth=1.6; ctx.strokeRect(sx-5, sy-70, 10, 70);
      ctx.strokeStyle='rgba(170,115,65,0.4)'; ctx.lineWidth=0.8; for(let yy=sy-70;yy<sy;yy+=10){ ctx.beginPath(); ctx.moveTo(sx-5,yy); ctx.lineTo(sx+5,yy+10); ctx.stroke(); } }}); }
  // ops buildings: a neat front-centre diagonal row as facilities come online
  const ops=[]; if(sc.leoOps) ops.push(['LEO','#5aa9e0']); if(sc.lunarOps) ops.push(['LUNAR','#b9c0c7']); if(sc.marsOps) ops.push(['MARS','#c1532b']);
  ops.forEach((o,i)=>{ const gx=2.8+i*1.1, gy=4.5+i*0.5; const sx=isoX(gx,gy), sy=isoY(gx,gy);
    items.push({d:gx+gy, draw:()=>{ const box=isoBox(ctx,sx,sy,1,1,42,'#1a232a');
      ctx.fillStyle=o[1]; ctx.beginPath(); ctx.arc(box.up([sx,sy])[0],box.up([sx,sy])[1]-3,2.4,0,7); ctx.fill();
      ctx.fillStyle=o[1]; ctx.font='8px ui-monospace,monospace'; ctx.textAlign='center'; ctx.fillText(o[0], sx, sy+14); ctx.textAlign='left'; }}); });
  return items;
}
// Ambient day/night cycle for the Command Center scene (2026-07-11, "atmosphere/realism" follow-up to
// the era-tied variety pass). Purely a function of the scene's own elapsed-seconds clock `t`, same idiom
// as the existing blink-light/idle animations — no new game state. The p=0.50 (dusk) keyframe is an
// EXACT reproduction of the scene's original fixed sky/sun values, so a mid-cycle glance looks identical
// to before this pass; the cycle just breathes around that anchor.
const SKY_CYCLE_SEC=240; // one full day/night lap, real seconds
const SKY_KEYFRAMES=[
  {p:0.00, top:'10,20,40',  mid:'90,55,70',  bot:'201,122,74', sunX:0.15, sunY:0.55, sunA:0.5, sunC:'255,190,120', starMul:0.3}, // dawn
  {p:0.25, top:'58,106,154',mid:'106,160,192',bot:'168,207,224',sunX:0.55, sunY:0.07, sunA:1.0, sunC:'255,217,160', starMul:0},   // day
  {p:0.50, top:'10,20,40',  mid:'29,52,80',  bot:'58,85,112',  sunX:0.92, sunY:0.07, sunA:1.0, sunC:'255,217,160', starMul:1.0}, // dusk (== original)
  {p:0.75, top:'3,6,14',    mid:'6,10,22',   bot:'12,18,34',   sunX:0.50, sunY:0.90, sunA:0.0, sunC:'255,217,160', starMul:1.1}, // night
  {p:1.00, top:'10,20,40',  mid:'90,55,70',  bot:'201,122,74', sunX:0.15, sunY:0.55, sunA:0.5, sunC:'255,190,120', starMul:0.3}, // wrap to dawn
];
function lerpRGB(a,b,f){ const pa=a.split(',').map(Number), pb=b.split(',').map(Number); return pa.map((v,i)=>Math.round(v+(pb[i]-v)*f)).join(','); }
function skyAtmosphere(t){
  const cyc=((t%SKY_CYCLE_SEC)+SKY_CYCLE_SEC)%SKY_CYCLE_SEC/SKY_CYCLE_SEC; // 0..1, safe for negative t
  let a=SKY_KEYFRAMES[0], b=SKY_KEYFRAMES[1];
  for(let i=0;i<SKY_KEYFRAMES.length-1;i++){ if(cyc>=SKY_KEYFRAMES[i].p && cyc<=SKY_KEYFRAMES[i+1].p){ a=SKY_KEYFRAMES[i]; b=SKY_KEYFRAMES[i+1]; break; } }
  const span=b.p-a.p, f=span>0?(cyc-a.p)/span:0;
  return { top:lerpRGB(a.top,b.top,f), mid:lerpRGB(a.mid,b.mid,f), bot:lerpRGB(a.bot,b.bot,f),
    sunX:a.sunX+(b.sunX-a.sunX)*f, sunY:a.sunY+(b.sunY-a.sunY)*f, sunA:a.sunA+(b.sunA-a.sunA)*f,
    sunC:lerpRGB(a.sunC,b.sunC,f), starMul:a.starMul+(b.starMul-a.starMul)*f };
}
function drawCape(cv, t){
  const ctx=cv && cv.getContext && cv.getContext('2d'); if(!ctx) return;
  const W=cv.width, H=cv.height;
  const atmo=skyAtmosphere(t);
  const sky=ctx.createLinearGradient(0,0,0,H*0.7); sky.addColorStop(0,`rgb(${atmo.top})`); sky.addColorStop(0.5,`rgb(${atmo.mid})`); sky.addColorStop(1,`rgb(${atmo.bot})`);
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
  drawCapeStars(ctx,W,H,t,atmo);
  if(atmo.sunA>0.02){
    const sunX=W*atmo.sunX, sunY=H*atmo.sunY;
    const sg=ctx.createRadialGradient(sunX,sunY,2,sunX,sunY,70); sg.addColorStop(0,`rgba(${atmo.sunC},${0.7*atmo.sunA})`); sg.addColorStop(0.4,`rgba(${atmo.sunC},${0.32*atmo.sunA})`); sg.addColorStop(1,`rgba(${atmo.sunC},0)`); ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sunX,sunY,70,0,7); ctx.fill();
    ctx.fillStyle=`rgba(${atmo.sunC},${atmo.sunA})`; ctx.beginPath(); ctx.arc(sunX,sunY,12,0,7); ctx.fill();
  }
  drawCapeHorizon(ctx,W,H,atmo);
  drawIsoClouds(ctx,W,H,t,atmo);
  drawIsoGround(ctx,W,H,t);
  const L=isoLayout();
  drawIsoBoat(ctx,t);
  drawIsoProps(ctx,t);
  drawIsoRoads(ctx,L);
  drawIsoDecor(ctx,t);
  drawCapePracticalLights(ctx,L,t);
  const list=ISO_BUILDINGS.slice().sort((a,b)=>(a.gx+a.gy)-(b.gx+b.gy));
  // shadows are flat on the ground — draw them all first, beneath every standing object
  for(const b of list){ const e=L[b.key]; if(e) isoShadow(ctx,e.sx,e.sy,b.fw,b.fd); }
  // unified painter's-algorithm pass: buildings, growth, and road traffic share one depth (gx+gy) sort,
  // so a vehicle is correctly occluded by anything in front of it and draws over anything behind it.
  const items=[];
  for(const b of list){ const e=L[b.key]; if(e) items.push({d:b.gx+b.gy, draw:()=>drawIsoBuilding(ctx,e,t)}); }
  isoGrowthItems(ctx,t,L).forEach(it=>items.push(it));
  isoVehicleItems(ctx,t,L).forEach(it=>items.push(it));
  items.sort((a,b)=>a.d-b.d);
  items.forEach(it=>it.draw());
  drawCapeVignette(ctx,W,H);
}
let ccAnim=null, ccT0=0, ccPhaserSmoke=false, ccPhaserDetail=false;
function ccNow(){ return (typeof performance!=='undefined'&&performance.now)?performance.now():Date.now(); }
function startCCScene(){ if(ccAnim!=null) return; ccT0=ccNow(); ccAnim=requestAnimationFrame(ccLoop); }
function stopCCScene(){ if(ccAnim!=null){ cancelAnimationFrame(ccAnim); ccAnim=null; } }
function ccLoop(){
  if(!state || state.tab!=='command'){ ccAnim=null; return; }
  const cv=$('ccScene'); if(!cv){ ccAnim=null; return; }
  try{ drawCape(cv, (ccNow()-ccT0)/1000); }catch(e){}
  ccAnim=requestAnimationFrame(ccLoop);
}

/* ---------- Hybrid Phaser layer (Slice 0): CapeScene ----------
   Phaser owns the scene/loop/scale/camera and adds particle smoke + a breathing
   camera, while the proven Cape art is reused verbatim by drawing it onto a Phaser
   CanvasTexture each frame. Everything here is lazily defined and feature-guarded so
   the headless vm harness (no Phaser global) loads the script and tests logic fine. */
function phaserOK(){ return typeof Phaser!=='undefined' && !!Phaser.Scene; }
const CAPE_W=1200, CAPE_H=860; // Cape scene render resolution (taller for the isometric view; CSS scales to the column)
let CapeScene=null, capeGame=null;
function defineCapeScene(){
  if(CapeScene || !phaserOK()) return;
  CapeScene=class extends Phaser.Scene {
    constructor(){ super('cape'); }
    create(){
      const W=CAPE_W, H=CAPE_H;
      this.tex = this.textures.exists('capeTex') ? this.textures.get('capeTex') : this.textures.createCanvas('capeTex',W,H);
      this.add.image(0,0,'capeTex').setOrigin(0,0);
      ccPhaserSmoke=true;   // baked pad smoke replaced by emitters
      ccPhaserDetail=true;  // baked stars+clouds replaced by Phaser sky layers
      this.t0=ccNow();
      try{ this.buildDetail(W,H); }catch(e){ console.warn('cape detail failed (base scene still renders):',e); }
    }
    // generate a texture once from a Graphics draw callback
    mkTex(key,draw,w,h){ if(this.textures.exists(key)) return; const g=this.make.graphics({x:0,y:0,add:false}); draw(g); g.generateTexture(key,w,h); g.destroy(); }
    buildDetail(W,H){
      // The iso drawCape paints sky/stars/sun/ground/buildings; Phaser adds pad smoke + a living camera.
      this.mkTex('smokeDot',g=>{g.fillStyle(0xffffff,1);g.fillCircle(16,16,16);},32,32);
      let pad; try{ pad=isoLayout().pad; }catch(e){}
      const px=pad?pad.sx-ISO_TW*0.35:W*0.5, py=pad?pad.sy:H*0.6;
      this.add.particles(px, py, 'smokeDot', { speedY:{min:-26,max:-58}, speedX:{min:-12,max:12}, scale:{start:0.18,end:0.9}, alpha:{start:0.30,end:0}, lifespan:2600, frequency:90, tint:0xc9d2dc });
      // (no camera breathe — CSS zoom/pan is the interaction now, and breathe would desync the hotspots)
    }
    update(time,delta){
      if(this.tex&&this.tex.canvas){ try{ drawCape(this.tex.canvas, (ccNow()-this.t0)/1000); this.tex.refresh(); }catch(e){} }
    }
  };
}
function startCapeGame(){
  if(!phaserOK()){ return false; }
  defineCapeScene();
  if(capeGame){ resumeCapeGame(); return true; }
  if(!$('ccSceneHost')) return false;
  try{
    capeGame=new Phaser.Game({
      type:Phaser.AUTO, parent:'ccSceneHost', width:CAPE_W, height:CAPE_H,
      backgroundColor:'#05070d', banner:false, audio:{noAudio:true},
      scale:{mode:Phaser.Scale.NONE}, scene:[CapeScene]
    });
    // mirror the old .ccscene canvas sizing (CSS scales the fixed 900x420 canvas)
    const cv=capeGame.canvas; if(cv){ cv.style.width='100%'; cv.style.height='auto'; cv.style.display='block'; cv.style.borderRadius='8px'; }
  }catch(e){ capeGame=null; return false; }
  return true;
}
// CSS-transform zoom/pan over the Cape scene — moves the canvas AND the hotspot overlay
// together (so labels stay aligned), like the solar map's camera. Start slightly wider than
// native scale so the command center reads as a whole place rather than a close-up.
const CAPE_DEFAULT_ZOOM=0.86, CAPE_MIN_ZOOM=0.72, CAPE_MAX_ZOOM=3;
let capeZoom=CAPE_DEFAULT_ZOOM, capePanX=0, capePanY=0;
function applyCapeZoom(){ const z=$('ccZoom'); if(z) z.style.transform=`translate(${capePanX}px,${capePanY}px) scale(${capeZoom})`; }
function capeClampPan(w,h){
  // At zoom-out scales the spare space is on the right/bottom rather than the left/top.
  // Keeping both cases bounded makes dragging useful at the overview default as well as
  // during a close inspection, without ever exposing more than the available margin.
  const clamp=(p,size)=>{ const edge=size*(1-capeZoom); return edge<0?Math.min(0,Math.max(edge,p)):Math.min(edge,Math.max(0,p)); };
  capePanX=clamp(capePanX,w); capePanY=clamp(capePanY,h);
}
function resetCapeZoom(w,h){
  capeZoom=CAPE_DEFAULT_ZOOM;
  // Centre a zoomed-out view; at 1× this naturally produces the old (0,0) reset.
  capePanX=w*(1-capeZoom)/2; capePanY=h*(1-capeZoom)/2;
  capeClampPan(w,h); applyCapeZoom();
}
function initCapeZoom(){
  const wrap=$('ccSceneWrap'); if(!wrap||wrap._zoomInit) return; wrap._zoomInit=true; wrap.style.cursor='grab';
  const rect=()=>wrap.getBoundingClientRect();
  const compactTouch=()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(max-width: 1100px)').matches;
  let down=false, drag=false, pointerId=null, pointerIsCompactTouch=false, lx=0, ly=0, sx=0, sy=0, moved=0;
  wrap.addEventListener('wheel',e=>{ e.preventDefault(); const r=wrap.getBoundingClientRect(); const cx=e.clientX-r.left, cy=e.clientY-r.top, z0=capeZoom;
    capeZoom=Math.min(CAPE_MAX_ZOOM,Math.max(CAPE_MIN_ZOOM, capeZoom*(e.deltaY<0?1.12:0.89)));
    capePanX=cx-(cx-capePanX)*(capeZoom/z0); capePanY=cy-(cy-capePanY)*(capeZoom/z0);
    capeClampPan(r.width,r.height); applyCapeZoom(); },{passive:false});
  // Begin tracking every primary pointer, including at the overview zoom. Pointer capture only
  // begins after the motion threshold, preserving normal clicks on launch/building hotspots.
  wrap.addEventListener('pointerdown',e=>{ if(e.button!==undefined&&e.button!==0) return;
    down=true; drag=false; pointerId=e.pointerId; pointerIsCompactTouch=e.pointerType==='touch'&&compactTouch(); moved=0; lx=sx=e.clientX; ly=sy=e.clientY; });
  wrap.addEventListener('pointermove',e=>{ if(!down||e.pointerId!==pointerId) return;
    const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY;
    moved=Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy);
    if(!drag){
      if(moved<5) return;
      // On the stacked/touch layout, let vertical swipes remain page scrolls. A clear
      // horizontal intent still starts the Cape pan, while desktop keeps free 2-D drag.
      if(pointerIsCompactTouch&&Math.abs(e.clientY-sy)>=Math.abs(e.clientX-sx)) return;
      drag=true; wrap.style.cursor='grabbing'; try{wrap.setPointerCapture(pointerId);}catch(_){}
    }
    const r=rect(); capePanX+=dx; capePanY+=dy; capeClampPan(r.width,r.height); applyCapeZoom(); });
  const end=e=>{ if(!down||(e&&e.pointerId!==pointerId)) return; try{wrap.releasePointerCapture(pointerId);}catch(_){} down=false; drag=false; pointerId=null; pointerIsCompactTouch=false; wrap.style.cursor='grab'; };
  wrap.addEventListener('pointerup',end); wrap.addEventListener('pointercancel',end);
  wrap.addEventListener('click',e=>{ if(moved>=5){ e.stopPropagation(); e.preventDefault(); moved=0; } }, true); // swallow click-through after a drag
  wrap.addEventListener('dblclick',()=>{ const r=rect(); resetCapeZoom(r.width,r.height); });
  const r=rect(); resetCapeZoom(r.width,r.height);
}
// Transient liftoff lead-in on the iso Cape view: the pad rocket rises with a plume while the
// camera zooms in and pans to chase it, then we hand off into the unchanged playMission overlay.
// Click anywhere on the scene to skip straight to the ascent. The player's manual capeZoom/pan is
// saved on entry and restored on exit so their camera control is never left clobbered.
const LIFTOFF_DUR=2400; // ms — a short transition, not a cutscene (iso CC-scene liftoff — retired for launches, Slice A; kept defined for potential reuse)
const LIFTOFF_SEED_P=0.12; // (unused by launches as of Slice A — see PAD_PHASE_MS)
// Slice A: the pad phase now plays INSIDE the flight overlay, ahead of the ascent — one continuous
// container instead of a cut from the Cape popout into the overlay. HOLD_FRAC is the fraction of
// PAD_PHASE_MS spent on a silent countdown hold before the ignition ramp begins.
const PAD_PHASE_MS=3200;
const PAD_HOLD_FRAC=0.55;
// Slice B: a deferred (≥DEFER_CRUISE_DAYS) interplanetary departure ends the launch-day session with a
// "cruise begins / ETA" outro card played on the overlay's own canvas (spec.mode:'depart', the mirror of
// 'arrive'). This is how long that card plays before it settles and holds for the player to dismiss.
const DEPART_CARD_MS=4200;
// #73 Slice 3: a successful "fly it yourself" module delivery (spec.dock) ends its flight overlay with a
// rendezvous + soft-dock spectacle card — the terminal beat after the ascent + orbit/cislunar cruise. This
// is how long the module's approach-and-dock plays before it settles and holds for the player to dismiss.
const DOCK_CARD_MS=4600;
function playLiftoff(spec, next){
  if(!animEnabled){ next(); return; }
  if(state.tab!=='command'){ state.tab='command'; render(); } // auto-switch so the liftoff is actually on screen
  let pad=null; try{ pad=isoLayout().pad; }catch(e){}
  const wrap=(typeof document!=='undefined')?document.getElementById('ccSceneWrap'):null; // Phaser path only (fallback has no zoom wrapper)
  const clickTarget=wrap||(typeof document!=='undefined'?document.getElementById('ccCenter'):null);
  if(!pad){ next(); return; } // no iso scene to animate on — go straight to the ascent
  openCCPopout(); // every animated launch shows the liftoff via the pop-out view (idempotent: no-ops if already open)
  let svNormal=null, svPop=null; // lazily snapshot only the surface we actually drive, so the idle camera is never touched
  const rx=pad.sx-ISO_TW*0.35, ry0=pad.sy+2;
  const RISE=Math.max(150, ry0*0.85); // rise far enough that the rocket clears most of the frame
  _liftoff={start:ccNow(), dur:LIFTOFF_DUR, rise:0, intensity:0};
  let done=false;
  const finishSeq=()=>{
    if(done) return; done=true;
    // Seed the ascent at the altitude the pad rise had actually reached (eased progress, same curve as the
    // rise below) so a natural handoff OR a mid-animation skip both cut in with the rocket already airborne.
    const u=_liftoff?Math.min(1,(ccNow()-_liftoff.start)/_liftoff.dur):0;
    const seedP=(u*u)*LIFTOFF_SEED_P;
    if(_liftoffRAF){ cancelAnimationFrame(_liftoffRAF); _liftoffRAF=0; }
    _liftoff=null;
    if(svNormal){ capeZoom=svNormal.z; capePanX=svNormal.px; capePanY=svNormal.py; applyCapeZoom(); } // restore whichever manual camera we drove (hidden under the ascent overlay)
    if(svPop){ ccPop.z=svPop.z; ccPop.x=svPop.x; ccPop.y=svPop.y; }
    closeCCPopout(); // hand off to the ascent overlay — instant close is fine, the overlay covers the whole screen
    if(clickTarget) clickTarget.removeEventListener('click', onSkip, true);
    detachPopSkip();
    next(seedP);
  };
  const onSkip=(e)=>{ if(e){ e.stopPropagation(); e.preventDefault(); } finishSeq(); };
  if(clickTarget) clickTarget.addEventListener('click', onSkip, true);
  // Also allow skip from the CC pop-out (its own stage), if it's open now or opens mid-sequence. Use
  // pointerdown/up with a 5px threshold (mirroring initCanvasPopZoom) so a genuine tap skips but a
  // drag-to-pan release does not. The listener follows the live #ccPopStage, re-syncing each tick so it
  // attaches/detaches cleanly as the pop-out toggles, and never throws if the node is gone.
  let popSkipEl=null, pdX=0, pdY=0, pdDown=false;
  const onPopDown=(e)=>{ pdDown=true; pdX=e.clientX; pdY=e.clientY; };
  const onPopUp=(e)=>{ if(!pdDown) return; pdDown=false;
    if(Math.abs(e.clientX-pdX)+Math.abs(e.clientY-pdY)<6){ if(e) e.stopPropagation(); finishSeq(); } };
  const detachPopSkip=()=>{ if(popSkipEl){ popSkipEl.removeEventListener('pointerdown',onPopDown); popSkipEl.removeEventListener('pointerup',onPopUp); popSkipEl=null; } };
  const syncPopSkip=()=>{
    const st=(ccPopoutOpen&&typeof document!=='undefined')?document.getElementById('ccPopStage'):null;
    if(st&&popSkipEl!==st){ detachPopSkip(); st.addEventListener('pointerdown',onPopDown); st.addEventListener('pointerup',onPopUp); popSkipEl=st; }
    else if(!st&&popSkipEl){ detachPopSkip(); }
  };
  syncPopSkip();
  const step=()=>{
    if(done) return;
    syncPopSkip();
    const u=Math.min(1,(ccNow()-_liftoff.start)/_liftoff.dur);
    const e=u*u;                                    // easeInQuad — slow start, then accelerating (a rocket lifts from near-zero velocity)
    _liftoff.rise=e*RISE; _liftoff.intensity=Math.min(1,u*3);
    const Z=1+e*1.15;                              // zoom 1 → ~2.15, ramping into the chase on the same accelerating curve
    const fx=rx/CAPE_W, fy=(ry0-_liftoff.rise)/CAPE_H; // rocket's current fraction of the canvas
    if(ccPopoutOpen){
      // Drive the pop-out's CSS-transform camera. Now that #ccPopZoom's transform is measured against the
      // fitted art box (#ccPopFit, size = box), the target math is structurally identical to the normal-view
      // branch below: ccPop.z=Z and pan places the rocket at (0.5, 0.42) of the art box — the letterbox fit is
      // baked into the box size, so no per-blit fit/dw/dh terms survive.
      const box=(typeof document!=='undefined')?ccPopFitBox():null;
      if(box){
        if(!svPop) svPop={z:ccPop.z,x:ccPop.x,y:ccPop.y};
        ccPop.z=Z; ccPop.x=box.w*(0.5-fx*Z); ccPop.y=box.h*(0.42-fy*Z); // rocket → (0.5, 0.42) of the fitted scene
        applyCcPopZoom();
      }
    } else if(wrap){ const r=wrap.getBoundingClientRect();
      if(r.width>0&&r.height>0){
        if(!svNormal) svNormal={z:capeZoom,px:capePanX,py:capePanY};
        capeZoom=Z; capePanX=r.width*(0.5-fx*Z); capePanY=r.height*(0.42-fy*Z); // keep the rocket centred-ish as it climbs
        applyCapeZoom();
      }
    }
    if(u>=1){ finishSeq(); return; }
    _liftoffRAF=requestAnimationFrame(step);
  };
  _liftoffRAF=requestAnimationFrame(step);
}
// E0.5-A: sleep()/wake() (not pause()/resume()) so hidden Phaser scenes stop RENDERING, not
// just updating — pause() leaves the GPU redrawing every frame. isActive() only matches a
// RUNNING scene, so a slept scene is never re-slept; wake() on a running scene is a harmless no-op.
function pauseCapeGame(){ if(capeGame){ try{ if(capeGame.scene.isActive('cape')) capeGame.scene.sleep('cape'); }catch(e){} } }
function resumeCapeGame(){ if(capeGame){ try{ capeGame.scene.wake('cape'); }catch(e){} } }
function renderCommandCenter(){
  if(!$('ccStrip')) return;
  renderCCStrip(); // Phase 4 left summary deck: agency, programs and research
  renderCCSummaryRight(); // Phase 4 right deck: objective, launch readiness and live missions
  // renderCCLeft() now runs unconditionally from render() (slice 4: persistent left rail)
  renderCCCenter();
  renderCCRight();
  renderCCTimeline();
  // renderCCCenter starts the correct renderer (Phaser CapeScene, or the fallback RAF loop)
}
// Compact info strip above the Cape scene — replaced the two stacked execOverview + ccProgress cards
// (~250-350px) with one slim full-width row to reclaim vertical space for #ccCenter. Content: identity
// (company/date/era + folded gov-funding & current-vehicle), key stat chips (reusing the topbar .stat
// pattern), and inline mini progress bars for active R&D / builds / hangar-ready (Fly button preserved).
function renderCCLegacyStrip(){
  const el=$('ccStrip'); if(!el) return;
  const s=commandSummary();
  const netCol=s.net>=0?'var(--ok)':'var(--bad)';
  const fam=activeFamily();
  const vehName=(fam&&fam.name)?fam.name:(curMission()?curMission().name:'—');
  const netTitle=`+${fM(s.income)} in · −${fM(s.overhead)} ovh · −${fM(s.payroll)} pay`;
  const chips=`
    <div class="stat" title="${netTitle}"><span class="k">${domDot('economy')}Net</span><span class="v" style="color:${netCol}">${s.net>=0?'+':''}${fM(s.net)}/mo</span></div>
    <div class="stat"><span class="k">${domDot('economy')}Capital</span><span class="v" style="color:${state.money<1.5?'var(--bad)':'var(--ink)'}">${fM(s.capital)}</span></div>
    <div class="stat"><span class="k">${domDot('exploration')}Rep</span><span class="v">${fI(s.rep)}</span></div>
    <div class="stat"><span class="k">${domDot('research')}Science</span><span class="v" style="color:var(--dom-research)">${s.science}</span></div>
    <div class="stat"><span class="k">${domDot('crew')}Staff</span><span class="v">${(state.staff||[]).length}</span></div>
    <div class="stat"><span class="k">${domDot('engineering')}Flights</span><span class="v">${s.flights}${s.successRate!=null?` · ${s.successRate}%`:''}</span></div>
    <div class="stat"><span class="k">${domDot('warn')}Support</span><span class="v" style="color:${s.moodColor}">${s.support}%</span></div>`;
  const ar=state.activeResearch, rNode=ar&&RESEARCH.find(r=>r.id===ar.id);
  const rPct=(ar&&rNode)?clampA(Math.round(100*(rNode.months-ar.monthsLeft)/Math.max(1,rNode.months)),0,100):0;
  const rRow=(ar&&rNode)
    ? ccStripProg('⚗', rNode.name, fmtTimeLeft(ar.monthsLeft)+' left', rPct, 'var(--dom-research)')
    : `<div class="cc-strip-prow dim">⚗ No active project — <span onclick="setTab('rnd')" style="text-decoration:underline;cursor:pointer">start on the R&amp;D tab</span></div>`;
  const orders=buildQueueList().filter(o=>o.started);
  const orderRows=orders.map(o=>ccStripProg('🏗', o.name, fmtTimeLeft(o.monthsLeft)+' left',
     clampA(Math.round(100*(o.monthsTotal-o.monthsLeft)/Math.max(1,o.monthsTotal)),0,100), 'var(--dom-engineering)')).join('');
  const hangar=hangarList();
  const hangarRows=hangar.map(h=>`<div class="cc-strip-prow"><span class="cc-strip-pname">✓ <b>${h.name}</b> ready</span><button class="btn ghost" style="padding:1px 8px;font-size:12px;margin-left:auto" onclick="launchFromHangar('${h.id}')">Fly ▸</button></div>`).join('');
  const buildEmpty=(!orders.length&&!hangar.length)?`<div class="cc-strip-prow dim">🏗 Nothing building — commit a launch from the Bench.</div>`:'';
  el.innerHTML=`
    <div class="cc-strip-id">
      <b>${esc(state.company)}</b>
      <span class="dim">${dateStr()} · Era ${s.eraIdx}/${s.eraTotal} · ${s.era}</span>
      <span class="dim" style="font-size:10px">Gov +${fM(s.govFunding)}/mo · ${esc(vehName)}</span>
    </div>
    <div class="cc-strip-stats">${chips}</div>
    <div class="cc-strip-prog">${rRow}${orderRows}${hangarRows}${buildEmpty}</div>`;
}
// Phase 4 left deck. Derived only: the cards reuse commandSummary(), the ambition
// builders and research state, then route to the established Finance, Programs and R&D drills.
function renderCCStrip(){
  const el=$('ccStrip'); if(!el) return;
  const s=commandSummary(), amb=currentAmbition(), prog=ambitionProgress();
  const netCol=s.net>=0?'var(--ok)':'var(--bad)';
  const ar=state.activeResearch, node=ar&&RESEARCH.find(r=>r.id===ar.id);
  const pct=(ar&&node)?clampA(Math.round(100*(node.months-ar.monthsLeft)/Math.max(1,node.months)),0,100):0;
  el.innerHTML=`
    <section class="cc-deck-card dombar-economy">
      <div class="cc-deck-head"><div class="cc-panel-h">Agency overview</div><button class="btn ghost cc-deck-link" onclick="showFinancesModal()">Finances &rarr;</button></div>
      <div class="cc-deck-metrics">
        ${ccDeckMetric('Capital',fM(s.capital),state.money<1.5?'var(--bad)':'var(--ink)')}
        ${ccDeckMetric('Net',`${s.net>=0?'+':''}${fM(s.net)}/mo`,netCol)}
        ${ccDeckMetric('Support',`${s.support}%`,s.moodColor)}
        ${ccDeckMetric('Reputation',fI(s.rep),'var(--dom-exploration)')}
      </div>
    </section>
    <section class="cc-deck-card dombar-exploration">
      <div class="cc-deck-head"><div class="cc-panel-h">Programs</div><button class="btn ghost cc-deck-link" onclick="showProgramsModal()">Programs &rarr;</button></div>
      <div class="cc-deck-title">${esc(amb.name)}</div>
      <div class="cc-deck-progress"><span style="width:${prog.pct}%;background:var(--ignite)"></span></div>
      <div class="cc-deck-sub">${prog.done}/${prog.total} ambition milestones &middot; ${prog.pct}% complete</div>
    </section>
    <section class="cc-deck-card dombar-research">
      <div class="cc-deck-head"><div class="cc-panel-h">Tech progress</div><button class="btn ghost cc-deck-link" onclick="setTab('rnd')">R&amp;D &rarr;</button></div>
      ${node?`<div class="cc-deck-title">${esc(node.name)}</div><div class="cc-deck-progress"><span style="width:${pct}%;background:var(--dom-research)"></span></div><div class="cc-deck-sub">Active research &middot; ${fmtTimeLeft(ar.monthsLeft)} remaining</div>`:`<div class="cc-deck-title">No active research</div><div class="cc-deck-sub">Choose the next capability for the program.</div>`}
    </section>
    ${ccSummaryDeckHTML()}`;
}
function ccDeckMetric(label,value,color){
  return `<div class="cc-deck-metric"><span class="k">${label}</span><span class="v" style="color:${color||'var(--ink)'}">${value}</span></div>`;
}
function ccMissionDeckItems(){ return outlinerItems().filter(it=>it.label.indexOf(' en route')!==-1); }
function ccMissionDeckGo(i){ const it=ccMissionDeckItems()[i]; if(it) it.go(); }
// Phase 4 summary deck. The objective/readiness display reuses missionAdvisor(), while active
// flights come from the ETA-sorted unified outliner rather than a parallel mission list. These
// cards live with the agency overview so the Command Center's left deck is one aligned column.
function ccSummaryDeckHTML(){
  const adv=missionAdvisor(), amb=currentAmbition(), prog=ambitionProgress();
  const hangar=hangarList(), orders=buildQueueList().filter(o=>o.started).sort((a,b)=>a.monthsLeft-b.monthsLeft);
  const launch=hangar[0]
    ? {title:hangar[0].missionName||hangar[0].name, sub:'Ready in hangar', action:`launchFromHangar('${hangar[0].id}')`, label:'Fly'}
    : orders[0]
      ? {title:orders[0].name||'Vehicle build', sub:`In build - ${fmtTimeLeft(orders[0].monthsLeft)} remaining`, action:'showInfrastructureModal()', label:'Build status'}
      : {title:adv.goal||'No launch queued', sub:adv.ready?'Vehicle can be prepared on the Bench.':(adv.summary||'Choose the next launch objective.'), action:adv.actions[0]?advisorClick(adv.actions[0]):"setTab('bench')", label:adv.actions[0]?adv.actions[0].label:'Design vehicle'};
  const flights=ccMissionDeckItems().slice(0,4);
  const missionRows=flights.length ? flights.map((it,i)=>`<button type="button" class="cc-deck-row" onclick="ccMissionDeckGo(${i})" aria-label="Open active mission: ${esc(it.label)}. ${esc(outlinerEtaText(it.etaDays))} remaining."><span aria-hidden="true">${it.icon}</span><span class="cc-deck-label">${esc(it.label)}</span><span class="num" style="color:${it.color||'var(--readout)'}">${outlinerEtaText(it.etaDays)}</span></button>`).join('')
    : `<div class="cc-deck-sub">No missions en route.</div>`;
  return `
    <section class="cc-deck-card dombar-exploration">
      <div class="cc-deck-head"><div class="cc-panel-h">Next milestone</div><button class="btn ghost cc-deck-link" onclick="showProgramsModal()">Objectives &rarr;</button></div>
      <div class="cc-deck-title">${esc(adv.goal||amb.name)}</div>
      <div class="cc-deck-sub">${esc(adv.program||amb.name)}</div>
      <div class="cc-deck-progress"><span style="width:${prog.pct}%;background:var(--ignite)"></span></div>
      <div class="cc-deck-sub">${prog.done}/${prog.total} objectives complete &middot; ${prog.pct}%</div>
    </section>
    <section class="cc-deck-card dombar-engineering">
      <div class="cc-deck-head"><div class="cc-panel-h">Next launch</div><button class="btn ghost cc-deck-link" onclick="${launch.action}">${esc(launch.label)}</button></div>
      <div class="cc-deck-title">${esc(launch.title)}</div>
      <div class="cc-deck-sub">${esc(launch.sub)}</div>
      ${adv.reqs.length?`<div class="cc-deck-sub" style="margin-top:6px">${adv.reqs.filter(r=>!r.ok).slice(0,1).map(r=>'Pending: '+esc(r.label)).join('')||'Readiness checks clear'}</div>`:''}
    </section>
    <section class="cc-deck-card cc-active-missions dombar-crew">
      <div class="cc-deck-head"><div class="cc-panel-h">Active missions</div><button class="btn ghost cc-deck-link" onclick="showFlightsModal()">Flight log &rarr;</button></div>
      ${missionRows}
    </section>`;
}
function renderCCSummaryRight(){
  const el=$('ccSummaryRight'); if(el) el.innerHTML='';
}
function ccStripProg(icon,name,eta,pct,col){
  return `<div class="cc-strip-prow"><span class="cc-strip-pname">${icon} <b>${name}</b></span><div class="bar"><div class="fill" style="width:${pct}%;background:${col}"></div></div><span class="dim">${eta}</span></div>`;
}
// LEFT — "what should I do next?"
// ---- Mission Control Advisor body (slice 4) — reused by the persistent right-rail accordion ----
function railMissionHTML(){
  const adv=missionAdvisor();
  const reqRows=adv.reqs.map(r=>`<div class="adv-req"><span class="${r.ok?'adv-ok':'adv-no'}">${r.ok?'✓':'✗'}</span> ${r.label}</div>`).join('');
  const actBtns=adv.actions.map((a,i)=>`<button class="btn ${a.primary?'launch':(i===0?'launch':'ghost')}" style="width:100%;margin-top:6px;font-size:12px" onclick="${advisorClick(a)}">▸ ${a.label}</button>`).join('');
  return `<div class="rec-card">
        ${adv.goal?`<div class="lbl">${adv.ready?'cleared for launch':'goal'}</div><div class="ttl">${adv.goal}</div>${adv.program?`<div class="muted" style="font-size:12px">${adv.program}${adv.reward?` · reward ${fM(adv.reward.money)} / +${adv.reward.rep} rep`:''}</div>`:''}`:`<div class="muted" style="font-size:12px">${adv.summary||''}</div>`}
        ${reqRows?`<div class="adv-reqs">${reqRows}</div>`:''}
        ${actBtns}
      </div>`;
}
// ---- Flight plan (slice 4: folded from the retired Planner tab) ----
function railFlightPlanHTML(){
  const fpM=curMission();
  const fpShowPicker = !fpM || plannerShowMissions;
  const fpStepsHTML = fpM ? plannerSteps().map(s=>{
    const icon = s.skip?'<span class="dim">—</span>':(s.done?'<span style="color:var(--ok)">✓</span>':'<span style="color:var(--warn)">○</span>');
    let actBtn='';
    if(s.launch){ actBtn=`<button class="launch" style="font-size:11px;padding:3px 8px" onclick="launch()" ${s.ready?'':'disabled'} title="${s.ready?'':s.detail.replace(/"/g,'')}">■ Launch</button>`; }
    else if(s.actLabel){ actBtn=`<button class="btn ghost" style="font-size:11px;padding:3px 7px" onclick="${plannerStepClick(s)}">${s.actLabel}</button>`; }
    return `<div class="obj-item" style="${s.skip?'opacity:.55':''}"><span class="obj-label" style="flex:1">${icon} ${s.title}</span>${actBtn}</div>`;
  }).join('') : '';
  const fpFlyable=MISSIONS.filter(x=>!state.completed[x.id]&&missionFlyable(x));
  const fpPicker = fpShowPicker ? `<div class="cc-panel-h" style="margin:8px 0 3px">${fpM?'Switch mission':'Available missions'}</div>`+(fpFlyable.length
      ? fpFlyable.map(x=>`<div class="obj-item clk" onclick="plannerSetMission('${x.id}')"><span class="obj-label" style="flex:1">${x.name}${x.id===(fpM&&fpM.id)?' <span class="pill active">sel</span>':''}</span><span class="obj-sub">${fM(x.payout)}</span></div>`).join('')
      : `<div class="dim" style="font-size:12px;margin-top:4px">No missions flyable yet — build reputation or research prerequisites.</div>`) : '';
  return `${fpM?`<div class="muted" style="font-size:12px;margin:2px 0 4px">${fpM.name}</div>`:''}${fpStepsHTML}${fpPicker}`;
}
// ---- Objectives checklist (slice 5) ----
function railObjectivesHTML(){
  const amb=currentAmbition(), prog=ambitionProgress();
  const bar=`<div style="height:8px;border-radius:4px;background:#0d1418;overflow:hidden;margin:7px 0 5px"><div style="height:100%;width:${prog.pct}%;background:var(--ok)"></div></div>`;
  const objHTML=objectivesList().map(g=>`
    <div class="cc-panel-h" style="margin:10px 0 3px">${g.title}</div>
    ${g.items.map(it=>`<div class="obj-item ${it.tab?'clk':''}" data-obj-id="${it.missionId||'__'+(it.label.replace(/\W/g,'_'))}"${it.tab?` onclick="${it.missionId?`selectMission('${it.missionId}')`:`setTab('${it.tab}')`}"`:''}>
        <span class="${it.done?'obj-done':'obj-todo'}">${it.done?'☑':'☐'}</span>
        <span class="obj-label">${it.label}</span>${it.sub?`<span class="obj-sub">${it.sub}</span>`:''}
      </div>`).join('')}`).join('');
  return `<div class="muted" style="font-size:12px;margin:0 0 2px">${amb.name}</div>
      ${bar}
      <div style="display:flex;justify-content:space-between;font-size:12px"><span class="dim">ambition ${prog.done}/${prog.total}</span><span class="num">${prog.pct}%</span></div>
      ${objHTML}
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn ghost" style="flex:1;font-size:12px" onclick="showProgramsModal()">Programs →</button>
      </div>`;
}
// Left rail keeps only the Basic-only focal "what to do next"; the advisor / flight plan / objectives
// now live in the persistent right-rail accordion (renderRailPersistent).
function renderCCLeft(){
  const rec=recommendedAction();
  let recSuccess='';
  if(rec.kind==='launch' && state.activeMission===rec.missionId){
    try{ const rv=computeVehicle(); if(rv) recSuccess=`<div class="muted" style="font-size:12px;margin-top:4px">Est. success chance: <b style="color:${rv.reliability>=0.7?'var(--ok)':'var(--warn)'}">${(rv.reliability*100)|0}%</b></div>`; }catch(e){}
  }
  const recReward = rec.reward ? `<div class="muted" style="font-size:12px;margin-top:4px">Reward: ${fM(rec.reward.money)} · +${rec.reward.rep} rep</div>` : '';
  $('ccLeft').innerHTML=`<div class="card basic-only" style="border-color:var(--ignite)">
      <div class="cc-panel-h">▶ What to do next</div>
      <div class="rec-card">
        <div class="muted" style="font-size:13px">${rec.detail}</div>
        ${recSuccess}${recReward}
        <button class="btn launch" style="width:100%;margin-top:10px;font-size:14px;padding:10px" onclick="${advisorClick(rec)}">▸ ${rec.title}</button>
      </div>
    </div>`;
}
// Persistent right-rail accordion: one click drops a section down to preview it; a second click on an
// already-open section navigates to its page (others collapse when a new one opens).
let railOpen=null;
const RAIL_ACC=[
  {key:'mission',    label:'Mission Control',    btn:'raccMission', body:'raccMissionBody', html:railMissionHTML,    nav:()=>setTab('command')},
  {key:'flight',     label:'Design Bench',       btn:'raccFlight',  body:'raccFlightBody',  html:railFlightPlanHTML, nav:()=>setTab('bench')},
  {key:'objectives', label:'Programs',           btn:'raccObj',     body:'raccObjBody',     html:railObjectivesHTML, nav:()=>showProgramsModal()},
  {key:'contracts',  label:'Contracts',          btn:'raccContracts', body:'raccContractsBody', html:railContractsHTML, nav:()=>openHubPanel('contracts')},
];
let railClickTimer=null;
// Single click toggles a section open/closed (the +/− sign). We delay it briefly so a double-click can
// pre-empt the toggle and navigate to the section's page instead.
function railAccordClick(key){
  clearTimeout(railClickTimer);
  railClickTimer=setTimeout(()=>{ railClickTimer=null; railOpen=(railOpen===key)?null:key; renderRailPersistent(); }, 220);
}
function railAccordDbl(key){
  clearTimeout(railClickTimer); railClickTimer=null;
  const sec=RAIL_ACC.find(s=>s.key===key); if(sec) sec.nav();
}
function renderRailPersistent(){
  for(const s of RAIL_ACC){ const open=railOpen===s.key, btn=$(s.btn), body=$(s.body);
    if(btn) btn.classList.toggle('open', open);
    if(body){ body.classList.toggle('open', open);
      // #31 Slice 3: close objectives section → reset sparkle state
      if(s.key==='objectives'&&!open&&_objSectionOpen){ _prevObjDoneSet.clear(); _objSectionOpen=false; }
      setHTML(body, open ? s.html()+`<div class="dim rail-acc-hint">⇲ Double-click the header to open ${s.label} →</div>` : '');
      // #31 Slice 3: objective sparkle — seed on first open, diff on subsequent renders
      if(s.key==='objectives'&&open){ _applyObjSparkle(body); }
    }
  }
  // live Contracts badge on the persistent header — "N·+$X/mo" of signable opportunity, hidden at zero
  const _cs=contractsRailSummary(), _cb=$('badgeContracts');
  if(_cb){ const show=_cs.count>0; _cb.classList.toggle('hidden', !show);
    if(show){ _cb.textContent=_cs.signableMo>0 ? _cs.count+'·+'+fM(_cs.signableMo) : String(_cs.count);
      const _bb=$('raccContracts'); if(_bb) _bb.title=`${_cs.openMissions} mission contract(s) to fly · ${_cs.signable.length} passive contract(s) signable (+${fM(_cs.signableMo)}/mo). Double-click to open the full drill.`; } }
}
function _applyObjSparkle(body){
  const allItems=objectivesList().flatMap(g=>g.items);
  const nowDoneIds=new Set(allItems.filter(it=>it.done).map(it=>it.missionId||'__'+(it.label.replace(/\W/g,'_'))));
  if(!_objSectionOpen){ _objSectionOpen=true; nowDoneIds.forEach(id=>_prevObjDoneSet.add(id)); return; } // seed, no sparkle
  const newlyDone=[...nowDoneIds].filter(id=>!_prevObjDoneSet.has(id));
  nowDoneIds.forEach(id=>_prevObjDoneSet.add(id));
  newlyDone.forEach(id=>{ const el=body.querySelector(`[data-obj-id="${id}"]`);
    if(el){ el.classList.add('obj-just-done'); el.addEventListener('animationend',()=>el.classList.remove('obj-just-done'),{once:true}); } });
}
// CENTER — the animated Space Center (scene + clickable hotspots, reused verbatim)
// Single source of the Cape hotspot-overlay HTML, shared by the in-page Command Center
// (renderCCCenter) and the pop-out (openCCPopout / ccPopLoop) so the building list can never
// drift between the two views. Reuses ccHotspots()/buildingGlyph() exactly as before; the
// pop-out re-sequences the click (close-then-act) via event delegation, not by altering this HTML.
function ccSpotsHTML(){
  return ccHotspots().map(b=>{
    const planned=b.planned||!b.tab;
    const onclick=(!planned&&b.tab)?` onclick="${b.act||`setTab('${b.tab}')`}"`:''; // slice 5: a building may define a custom act (e.g. the Mission Control contracts drill)
    const style=`left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%`;
    const lx=b.labelDx?` style="transform:translateX(${b.labelDx}px)"`:''; // nudge a label clear of scene art (e.g. the pad rocket)
    const g=planned?null:buildingGlyph(b.key); // live status dot (attention/active/ok/idle)
    const dot=g?`<span class="ccglyph ccglyph-${g.state}"${b.labelDx?` style="transform:translateX(${b.labelDx}px)"`:''} title="${g.label}"></span>`:'';
    const titleTxt=g?`${b.name} — ${g.label}`:`${b.name} — ${b.status}`;
    const label=esc(`${b.name}. ${g?g.label+'. ':''}${b.status}.`);
    const tag=planned?'div':'button';
    const buttonAttrs=planned?'':` type="button" aria-label="${label}"`;
    return `<${tag} class="ccspot${planned?' planned':''}${g&&g.state==='attention'?' cc-attention':''}" style="${style}"${buttonAttrs}${onclick} title="${esc(titleTxt)}">
      ${b.planned?`<span class="pill lock"${lx}>planned</span>`:''}
      ${dot}
      <span class="nm"${lx}>${esc(b.name)}</span>
      <span class="st"${lx}>${esc(b.status)}</span>
    </${tag}>`;
  }).join('');
}
function renderCCCenter(){
  const spots=ccSpotsHTML();
  if(phaserOK()){
    // persistent Phaser host: build the scaffold once, then only refresh the overlay
    if(!$('ccSceneHost')){
      $('ccCenter').innerHTML=`<div class="card cc-hero-card">
        <div class="cc-hero-head">
          <div class="cc-panel-h" style="margin:0">Cape Canaveral — click a building to drill in</div>
          <button class="btn ghost" onclick="openCCPopout()" title="Pop out — large pan/zoom view + agency summary (Esc/Enter to close)" style="font-size:12px;padding:3px 9px">⤢ Pop out</button>
        </div>
        <div class="ccscene-wrap" id="ccSceneWrap" style="aspect-ratio:1200/860">
          <div id="ccZoom">
            <div id="ccSceneHost" class="ccscene" style="position:absolute;inset:0;padding:0"></div>
            <div id="ccSpots">${spots}</div>
          </div>
          <div class="cc-zoomhint">scroll to zoom · drag to pan · dbl-click reset</div>
        </div>
      </div>`;
      startCapeGame();
      initCapeZoom();
    } else {
      $('ccSpots').innerHTML=spots;
      resumeCapeGame();
    }
    return;
  }
  // fallback (no Phaser): the original 2D canvas + RAF loop
  $('ccCenter').innerHTML=`<div class="card cc-hero-card">
    <div class="cc-hero-head">
      <div class="cc-panel-h" style="margin:0">Cape Canaveral — click a building to drill in</div>
      <button class="btn ghost" onclick="openCCPopout()" title="Pop out — large pan/zoom view + agency summary (Esc/Enter to close)" style="font-size:12px;padding:3px 9px">⤢ Pop out</button>
    </div>
    <div class="ccscene-wrap">
      <canvas id="ccScene" class="ccscene" width="900" height="420"></canvas>
      ${spots}
    </div>
  </div>`;
  startCCScene();
}
// RIGHT — "what's happening right now?" (alerts · this-month · news)
function renderCCRight(){
  // Alerts box removed from the right rail per request — agencyAlerts() still drives advisor/log signals.
  const o=ccOpsSummary();
  const news=ccNews(7);
  const nRows=news.map(l=>`<div class="news-line"><span class="dim">${l.when}</span> <span class="${l.kind}">${tlStrip(l.msg)}</span></div>`).join('') || '<div class="dim" style="font-size:12px">No news yet.</div>';
  // slice 6: rivals mini-leaderboard (top threats) + deep-view modal — the Rivals tab's hub home
  const rivalMini=RIVALS.map(r=>({r,score:(state.rivalThreat&&state.rivalThreat[r.id])||0}))
    .sort((a,b)=>b.score-a.score).slice(0,3)
    .map(({r,score})=>{ const tl=rivalThreatLabel(score); return `<div class="row-item"><span>${r.flag} ${r.name}</span><span class="pill" style="color:${tl.col};border-color:${tl.col}">${tl.txt}</span></div>`; }).join('');
  $('ccRight').innerHTML=`
    <div class="card adv-only">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="cc-panel-h" style="margin:0">Rivals</div>
        <span style="display:flex;gap:5px">
        <button class="btn ghost" style="font-size:11px;padding:3px 8px" onclick="showChronicle('view')" title="Your century, scored — the timeline of firsts and your legacy grade">📖 Chronicle</button>
        <button class="btn ghost" style="font-size:11px;padding:3px 8px" onclick="showRivalsModal()">Deep view →</button></span>
      </div>
      ${rivalMini}
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="cc-panel-h" style="margin:0">This month</div>
        <button class="btn ghost" style="font-size:11px;padding:3px 8px" onclick="showFinancesModal()" title="Detailed current/past/future cash flow">💰 Finances</button>
      </div>
      <div class="row-item"><span class="dim">Flights</span><span class="num">${o.flights}</span></div>
      <div class="row-item"><span class="dim">Revenue</span><span class="num" style="color:var(--ok)">+${fM(o.revenue)}</span></div>
      <div class="row-item"><span class="dim">Expenses</span><span class="num" style="color:var(--bad)">−${fM(o.expenses)}</span></div>
      <div class="row-item"><span class="dim">Net</span><span class="num" style="color:${o.net>=0?'var(--ok)':'var(--bad)'}">${o.net>=0?'+':''}${fM(o.net)}</span></div>
    </div>
    <div class="card">
      <div class="cc-panel-h">Space news</div>
      <div class="news-scroll">${nRows}</div>
    </div>`;
}
// BOTTOM — global program timeline (eras + your firsts + rival firsts + now)
function renderCCTimeline(){
  const tl=ccTimeline();
  const eraBands=tl.eras.map((e,i)=>{
    const right=tl.eras[i+1]?tl.eras[i+1].pos:100;
    return `<div class="tl-era" style="left:${e.pos}%;width:${Math.max(0,right-e.pos)}%">${e.name}</div>`;
  }).join('');
  const marks=tl.markers.map(m=>`<div class="tl-mark ${m.who}${m.proj?' proj':''}" style="left:${m.pos}%" title="${m.year} · ${m.who==='you'?'You':'Rival'}${m.proj?' (projected)':''}: ${m.label.replace(/"/g,'')}"></div>`).join('');
  const axisYears=[tl.minYear,1957,1969,1981,2000,tl.maxYear].filter((y,i,a)=>y>=tl.minYear&&y<=tl.maxYear&&a.indexOf(y)===i);
  const axis=axisYears.map(y=>`<span>${y}</span>`).join('');
  $('ccTimeline').innerHTML=`
    <div class="cc-panel-h">Program timeline — <span style="color:var(--ok)">● you</span> · <span style="color:var(--bad)">● rivals</span> · <span style="color:var(--bad)">⇠ projected</span> · <span style="color:var(--ignite)">▮ now (${tl.curYear})</span></div>
    <div class="tl-track">
      ${eraBands}
      ${marks}
      <div class="tl-now" style="left:${tl.curPos}%"></div>
    </div>
    <div class="tl-axis">${axis}</div>`;
}
function applyDifficultyUI(){
  document.body.classList.toggle('hide-eq', !diff().showEquations);
  const ol=$('overheadLabel'); if(ol) ol.textContent=`(−${fM(diff().overhead)}/mo)`;
  applyUiLayer();
}
// #23: progressive UI complexity — independent of difficulty
const UI_LAYERS=['basic','advanced','expert'];
const UI_LAYER_LABEL={basic:'Basic',advanced:'Advanced',expert:'Expert'};
function uiLayer(){ return UI_LAYERS.includes(state.uiLayer)?state.uiLayer:'advanced'; }
function applyUiLayer(){
  const L=uiLayer();
  document.body.classList.toggle('ui-basic', L==='basic');
  document.body.classList.toggle('ui-advanced', L==='advanced');
  document.body.classList.toggle('ui-expert', L==='expert');
  const b=$('uiLayerBtn'); if(b) b.textContent='View: '+UI_LAYER_LABEL[L];
}
function setUiLayer(L){ if(!UI_LAYERS.includes(L)) return; state.uiLayer=L; render(); }
// #23 Expert-only: per-stage propellant mass fraction (propellant ÷ wet mass)
function massFractionHTML(v){
  if(!v||!Array.isArray(v.sm)||!v.sm.length) return '';
  const rows=v.sm.map((s,i)=>{
    const prop=(state.stages[i]&&state.stages[i].prop)||0, wet=s.dry+prop, mf=wet>0?prop/wet:0;
    return `<div class="leg"><span class="legname">Stage ${i+1}</span><span class="legdv">${mf.toFixed(3)}</span><span class="legdetail">${prop.toFixed(1)}t prop / ${wet.toFixed(1)}t wet · dry ${s.dry.toFixed(1)}t</span></div>`;
  }).join('');
  return `<div class="expert-only"><div class="mission-tag" style="margin-top:12px">Mass fractions (propellant ÷ wet) — Expert</div>
    <div class="legs" style="margin-top:6px">${rows}</div>
    <div class="dim" style="font-size:12px;margin-top:6px">Higher is better — a bigger propellant fraction means a lighter structure for the same Δv (the rocket equation rewards it exponentially).</div></div>`;
}
function setDifficulty(mode){
  if(!DIFFICULTY[mode] || state.difficulty===mode) return;
  if(mode==='custom' && !state.customDifficulty){
    const cur=diff(); // seed Custom from whatever mode is currently active
    const seed={}; CUSTOM_KNOBS.forEach(k=>seed[k.key]=cur[k.key]); seed.showEquations=cur.showEquations;
    state.customDifficulty=seed;
  }
  state.difficulty=mode;
  log('info',`Difficulty set to ${diffLabel(mode)} mode.`);
  render();
}
function setCustomKnob(key,val){
  if(!state.customDifficulty) state.customDifficulty=customDefaults();
  val=parseFloat(val); if(isNaN(val)) return;
  state.customDifficulty[key]=val;
  // keep the reliability floor at or below the cap whichever the player drags
  if(key==='relFloor' && val>state.customDifficulty.relCap) state.customDifficulty.relCap=val;
  if(key==='relCap'   && val<state.customDifficulty.relFloor) state.customDifficulty.relFloor=val;
  render();
}
function setCustomEq(on){
  if(!state.customDifficulty) state.customDifficulty=customDefaults();
  state.customDifficulty.showEquations=!!on;
  render();
}
function diffKnobTable(d){
  return `<div class="diffknobs">
    <span>Starting capital</span><span>${fM(d.startMoney)}</span>
    <span>Monthly overhead</span><span>${fM(d.overhead)}</span>
    <span>Reliability floor / cap</span><span>${(d.relFloor*100)|0}% / ${(d.relCap*100)|0}%</span>
    <span>Reliability bump</span><span>${d.relBonus>0?'+'+((d.relBonus*100)|0)+'%':'—'}</span>
    <span>Mission payouts</span><span>×${(+d.payoutMult).toFixed(2)}</span>
    <span>Build cost</span><span>×${(+d.buildCostMult).toFixed(2)}</span>
    <span>Rocket-equation math</span><span>${d.showEquations?'shown':'under the hood'}</span>
  </div>`;
}
function renderSettings(){
  const cur=state.difficulty;
  const cards=Object.keys(DIFFICULTY).map(k=>{
    const sel=k===cur;
    const d=(k==='custom')?Object.assign({},customDefaults(),state.customDifficulty||{}):DIFFICULTY[k];
    let extra='';
    if(k==='custom' && sel){
      const cd=state.customDifficulty||customDefaults();
      const sliders=CUSTOM_KNOBS.map(kn=>{
        const v=cd[kn.key];
        return `<label class="customrow">
          <span class="cl">${kn.label}</span>
          <input type="range" min="${kn.min}" max="${kn.max}" step="${kn.step}" value="${v}"
                 oninput="setCustomKnob('${kn.key}',this.value)">
          <span class="cv">${kn.fmt(v)}</span>
        </label>`;
      }).join('');
      extra=`<div class="customsliders" onclick="event.stopPropagation()">
        ${sliders}
        <label class="customrow" style="margin-top:4px">
          <span class="cl">Rocket-equation math</span>
          <input type="checkbox" ${cd.showEquations?'checked':''} onchange="setCustomEq(this.checked)">
          <span class="cv">${cd.showEquations?'shown':'hidden'}</span>
        </label>
        <div class="dim" style="font-size:12px;margin-top:8px">Changes apply immediately (starting capital only on a new game).</div>
      </div>`;
    }
    return `<div class="diffcard ${sel?'sel':''} ${k==='custom'?'wide':''}" onclick="setDifficulty('${k}')">
      <div class="tag">${DIFFICULTY[k].tag}${sel?' · active':''}</div>
      <h3>${DIFFICULTY[k].label} mode</h3>
      <p>${DIFFICULTY[k].blurb}</p>
      ${k==='custom'&&sel?extra:diffKnobTable(d)}
    </div>`;
  }).join('');
  const L=uiLayer();
  const layerInfo={basic:'Just the essentials — money, reputation, the active mission, research, success chance, and the recommended next step. Advanced metrics, breakdowns, and equations are hidden.',
    advanced:'The full interface — every metric, subsystem breakdown, and economy stat (the default).',
    expert:'Everything Advanced shows, plus the deepest internals: rocket-equation blocks (even if difficulty would hide them), per-stage mass fractions, subsystem failure percentages, and hidden rival stats.'};
  const layerBtns=UI_LAYERS.map(k=>`<button class="btn ${k===L?'':'ghost'}" style="flex:1" onclick="setUiLayer('${k}')">${UI_LAYER_LABEL[k]}${k===L?' · active':''}</button>`).join('');
  const layerCard=`<div class="card" style="background:var(--panel2);margin-bottom:12px">
    <div class="mission-name" style="font-size:15px">🪟 Interface detail level</div>
    <p class="muted" style="font-size:12px;margin:2px 0 8px">How much the UI shows — independent of difficulty (which controls the economy). Pick the depth that fits you; switch any time.</p>
    <div style="display:flex;gap:8px">${layerBtns}</div>
    <div class="dim" style="font-size:12px;margin-top:8px">${layerInfo[L]}</div>
  </div>`;
  const scaleCard=`<div class="card" style="background:var(--panel2);margin-bottom:12px">
    <div class="mission-name" style="font-size:15px">🔍 UI scale</div>
    <p class="muted" style="font-size:12px;margin:2px 0 8px">Zoom the whole interface (${UI_SCALE_MIN}–${UI_SCALE_MAX}% in ${UI_SCALE_STEP}% steps). Applies instantly; persists on this device, like the theme.</p>
    <label class="customrow">
      <span class="cl">UI scale</span>
      <input type="range" min="${UI_SCALE_MIN}" max="${UI_SCALE_MAX}" step="${UI_SCALE_STEP}" value="${uiScale}"
             oninput="setUiScale(this.value)">
      <span class="cv">${uiScale}%</span>
    </label>
  </div>`;
  $('settingsCard').innerHTML=`<h2>Settings — difficulty &amp; presentation</h2>
    ${layerCard}
    ${scaleCard}
    <p class="muted" style="font-size:12px;margin:-4px 0 6px">The rocket equation is identical in every mode — difficulty only scales the economy, how forgiving hardware reliability is, and how much of the underlying math is exposed. Switching mid-game applies from the next action onward; starting capital only applies to a new game.</p>
    <div class="diffgrid">${cards}</div>
    <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
      <button class="btn ghost" onclick="saveGame()">💾 Save</button>
      <button class="btn ghost" onclick="loadGame()">📂 Load</button>
      <button class="btn ghost" onclick="exportSave()">⬇ Export file</button>
      <button class="btn ghost" onclick="importSave()">⬆ Import file</button>
      <button class="btn ghost" onclick="showRestoreRing()">↻ Restore autosave…</button>
      <button class="btn ghost" onclick="showManageSaves()">🗂 Manage saves…</button>
      <button class="btn ghost" onclick="confirmNew()">New Game</button>
    </div>`;
}

// M5: first-stage recovery toggle + economics, shown on the booster once researched
function recoveryStageHTML(m){
  if(!recoveryAvailable()) return '';
  const on=!!state.recovery;
  const routine=!!(m && state.completed[m.id]);
  let econ;
  if(!on) econ=`<span class="dim">Throwaway booster. Fit recovery to refly it on routine missions.</span>`;
  else if(routine){
    const wear=refurbWear(), mult=refurbCostMult(), pen=refurbRelPenalty();
    const wearNote = wear>0
      ? ` · <span style="color:${wear>=REFLY_WEAR_MAX?'var(--warn)':'var(--ink)'}">wear ${wear}/${REFLY_WEAR_MAX} · −${(pen*100).toFixed(1)}% rel${wear>=REFLY_WEAR_MAX?' (retire & build fresh)':''}</span>`
      : '';
    econ=`<span style="color:var(--ok)">Reflown booster: build ×${mult.toFixed(2)} &amp; turnaround −1 mo</span> · <span class="dim">+${fM(RECOVERY_HARDWARE)} recovery hardware/flight</span>${wearNote}`;
  }
  else econ=`<span style="color:var(--warn)">+${fM(RECOVERY_HARDWARE)} hardware/flight</span> · <span class="dim">first flight proves it — refly discount applies once this mission is routine</span>`;
  return `<div class="flag" style="margin-top:8px;${on?'border-color:#2f6b4e':''}">
      <span style="display:flex;align-items:center;gap:8px">
        <button class="btn" style="font-size:12px;padding:4px 10px;${on?'border-color:var(--ok);color:var(--ok)':''}" onclick="toggleRecovery()">${on?'✓ Recovery ON':'Recovery OFF'}</button>
        <b style="color:${on?'var(--ok)':'var(--ink)'}">Reusable first stage</b>
      </span>
      <span style="font-size:12px;margin-top:4px">${econ}</span>
    </div>`;
}
// #27: stage role by position in the bottom→top stack (≤3 stages)
function stageRole(i, n){ if(i===0) return n>1?'1st stage · booster':'single stage'; if(i===n-1) return 'upper stage'; return 'core stage'; }
function renderStages(){
  const box=$('stages'); box.innerHTML=''; const curM=curMission();
  const n=state.stages.length;
  const cv=computeVehicle();
  // thrust per stage (kN) → relative bar scale across the stack
  const thrusts=state.stages.map(s=>{ const e=ENGINES[s.eng]; return e?e.thrustVac*s.count:0; });
  const maxThrust=Math.max(1, ...thrusts);
  state.stages.forEach((st,i)=>{
    const sm=stageMasses(st);
    const eng=ENGINES[st.eng]||{};
    const collapsed=!!collapsedStages[i];
    const opts=Object.values(ENGINES).filter(e=>state.unlocked[e.id] && !e.transferOnly)
      .map(e=>`<option value="${e.id}" ${e.id===st.eng?'selected':''}>${e.name} · ${e.prop} · Isp ${e.ispVac}s</option>`).join('');
    const dv=(cv&&cv.stageDv&&cv.stageDv[i]!=null)?fI(cv.stageDv[i]):'—';
    const sTwr=(cv&&cv.stageTwr&&cv.stageTwr[i]!=null)?cv.stageTwr[i]:null;
    const sLoss=(cv&&cv.stageGravLoss&&cv.stageGravLoss[i]!=null)?cv.stageGravLoss[i]:0;
    const nomTwr=i===0?GRAV_NOM_TWR0:GRAV_NOM_TWR_UP;
    // colour by gravity-loss bite: green = at/above nominal (no loss), amber/red as the penalty grows
    const twrCol = sTwr==null ? 'var(--muted)' : (sLoss<=0 ? 'var(--ok)' : (sLoss>250?'var(--bad)':'var(--warn)'));
    const thrSL=(eng.thrustSL||0)*st.count, thrVac=(eng.thrustVac||0)*st.count;
    const im=ispMult(), tm=thrustMult();
    const _hf=engineHeritageFrac(st.eng), _hn=engineHeritageFlights(st.eng);
    const _tags=`${eng.solid?` · <span style="color:var(--ok)">solid: −15% build, no restart</span>`:''}${_hf>0?` · <span style="color:var(--readout)">heritage ${_hn} flt: −${Math.round(ENG_HERITAGE_COST_MAX*_hf*100)}% build, +${(engineHeritageRelBonus(st.eng)*100).toFixed(1)}% rel</span>`:''}`;
    const engSpec = eng.name ? `${eng.name} · Isp ${eng.ispSL||0}/${eng.ispVac||0}s · ${fI(eng.thrustSL||0)}/${fI(eng.thrustVac||0)} kN ea${st.count>1?` · ${st.count}× = ${fI(thrVac)} kN vac`:''} · ${(eng.mass||0).toFixed(2)} t ea${(im>1||tm>1)?` · R&D +${Math.round((im-1)*100)}% Isp/+${Math.round((tm-1)*100)}% thr`:''}${_tags}` : '—';
    const thrustPct=Math.round(thrusts[i]/maxThrust*100);
    const div=document.createElement('div'); div.className='stage stage-card'+(collapsed?' collapsed':'')+(benchSelStage===i?' rocket-sel':'');
    div.setAttribute('ondragover','stageDragOver(event)');
    div.setAttribute('ondragleave','stageDragLeave(event)');
    div.setAttribute('ondrop',`stageDrop(event,${i})`);
    div.innerHTML=`
      <div class="stage-head">
        <span class="grip" draggable="true" ondragstart="stageDragStart(event,${i})" ondragend="stageDragEnd()" title="Drag to reorder">⠿</span>
        <button class="stage-toggle" onclick="toggleStageCollapse(${i})" title="${collapsed?'Expand':'Collapse'}">${collapsed?'▸':'▾'}</button>
        <span class="label" style="cursor:pointer" onclick="benchSelectStage(${i})" title="Highlight this stage on the rocket">STAGE ${i+1}</span>
        <span class="stage-role">${stageRole(i,n)}</span>
        <span class="stage-chip" title="${eng.name||''} · ${eng.prop||''}">🚀 ${eng.prop||'—'}</span>
        <span style="flex:1"></span>
        <span class="stage-dv">Δv <b class="num">${dv}</b> m/s</span>
        <button class="btn x danger" onclick="removeStage(${i})" ${n<=1?'disabled':''}>×</button>
      </div>
      <div class="stage-thrust" title="Stage thrust ${fI(thrusts[i])} kN (vac)"><div class="stage-thrust-fill" style="width:${thrustPct}%"></div><span class="stage-thrust-lbl">${fI(thrusts[i])} kN${st.count>1?` · ${st.count}×`:''}</span></div>
      <div class="stage-body">
        <div class="row"><label>Engine</label><select onchange="setEngine(${i},this.value)" style="flex:1">${opts}</select></div>
        <div class="dim" style="font-size:10.5px;margin:-2px 0 4px 0">${engSpec}</div>
        <div class="row"><label>Count</label>
          <div class="stepper"><button onclick="setCount(${i},-1)">−</button><span class="val">${st.count}</span><button onclick="setCount(${i},1)">+</button></div>
          <span class="dim" style="font-size:12px">more engines = more thrust, more failure points</span></div>
        <div class="row"><label>Propellant</label>
          <input type="range" min="0.1" max="800" step="1" value="${st.prop}" oninput="setProp(${i},this.value)">
          <input type="number" min="0.1" max="1000" step="0.1" value="${st.prop.toFixed(1)}" style="width:74px" onchange="setProp(${i},this.value)"><span class="muted" style="font-size:12px">t</span></div>
        <div class="row"><label>Diameter</label>
          <input type="range" min="${GEO_DIA_MIN}" max="${GEO_DIA_MAX}" step="0.05" value="${stageDia(st)}" oninput="setStageDia(${i},this.value)">
          <span class="dim" style="font-size:12px">${Math.round(stageDia(st)*100)}% — ${stageDia(st)>1.02?'stouter (+rel, −Δv)':stageDia(st)<0.98?'slender (−rel, +Δv)':'standard'}</span></div>
        <div class="stage-stats">
          <span class="ss">dry <b>${sm.dry.toFixed(2)} t</b></span>
          <span class="ss">prop <b>${st.prop.toFixed(1)} t</b></span>
          <span class="ss">wet <b>${sm.wet.toFixed(2)} t</b></span>
          <span class="ss">Isp <b>${eng.ispVac||'—'} s</b></span>
          <span class="ss" title="Thrust-to-weight at this stage's ignition (lifting itself + everything above). Below the nominal TWR (${nomTwr.toFixed(2)}) the stage spends longer fighting gravity and loses Δv.${i===0?' Stage 1 must also exceed 1.0 to lift off.':''}">TWR@ign <b style="color:${twrCol}">${sTwr==null?'—':sTwr.toFixed(2)}</b></span>
          ${sLoss>1?`<span class="ss" title="Δv lost to gravity because this stage's TWR is below nominal (${nomTwr.toFixed(2)})">grav <b style="color:var(--warn)">−${fI(sLoss)} m/s</b></span>`:''}
        </div>
        ${i===0&&st.count>=3?`<div class="row" style="margin-top:4px"><label style="cursor:pointer" title="Reserve thrust margin so the vehicle can lose one first-stage engine and press on — the Saturn V and Falcon 9 both flew engine-out missions to success. Costs TWR (thrust computed at ${st.count-1}/${st.count}); +2.5% reliability."><input type="checkbox" ${state.engineOut?'checked':''} onchange="state.engineOut=this.checked;try{sfxThunk()}catch(e){};render()"> Engine-out capability</label><span class="dim" style="font-size:11px">${state.engineOut?`armed · TWR at ${st.count-1}/${st.count} thrust · +2.5% rel`:'off — full thrust, no failure margin'}</span></div>`:''}
        ${i===0?recoveryStageHTML(curM):''}
      </div>`;
    box.appendChild(div);
  });
  $('addStage').disabled = n>=3;
}

function ensureBoosterEng(){
  const b=state.boosters;
  if(!b.eng || !ENGINES[b.eng] || ENGINES[b.eng].transferOnly){
    const e=Object.values(ENGINES).find(x=>state.unlocked[x.id] && !x.transferOnly);
    b.eng = e ? e.id : firstUnlocked();
  }
  if(!b.prop || b.prop<0.1) b.prop=20;
}
function setBoosterCount(d){ state.boosters=state.boosters||{eng:null,count:0,prop:0}; state.boosters.count=Math.max(0,Math.min(8,state.boosters.count+d)); if(state.boosters.count>0) ensureBoosterEng(); render(); }
function setBoosterEng(v){ state.boosters.eng=v; render(); }
function setBoosterProp(v){ state.boosters.prop=Math.max(0.1,Math.min(1000,parseFloat(v)||0.1)); render(); }
function renderBoosters(){
  const card=$('boostersCard'); if(!card) return;
  if(!state.research.strapon_integration){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  const b=state.boosters||{eng:null,count:0,prop:0};
  const opts=Object.values(ENGINES).filter(e=>state.unlocked[e.id] && !e.transferOnly)
    .map(e=>`<option value="${e.id}" ${e.id===b.eng?'selected':''}>${e.name} · ${e.prop} · Isp ${e.ispVac}s</option>`).join('');
  const fitted=boostersFitted(), bm=boosterMasses(), v=computeVehicle();
  card.innerHTML=`<h2>Strap-on Boosters <span class="dim" style="font-size:12px;font-weight:normal">parallel "stage 0"</span></h2>
    <div class="sub" style="margin-bottom:10px">Clamp identical liquid boosters around the core. They light at liftoff for extra thrust and a Δv kick, then jettison — the core stack flies on unchanged.</div>
    <div class="row"><label>Count</label>
      <div class="stepper"><button onclick="setBoosterCount(-1)">−</button><span class="val">${b.count}</span><button onclick="setBoosterCount(1)">+</button></div>
      <span class="dim" style="font-size:12px">${b.count===0?'no boosters — core only (default)':`${b.count} strap-on${b.count>1?'s':''} around the core`}</span></div>
    <div class="row"><label>Engine</label><select onchange="setBoosterEng(this.value)" style="flex:1" ${fitted?'':'disabled'}>${opts}</select></div>
    <div class="row"><label>Propellant</label>
      <input type="range" min="0.1" max="800" step="1" value="${b.prop||0.1}" oninput="setBoosterProp(this.value)" ${fitted?'':'disabled'}>
      <input type="number" min="0.1" max="1000" step="0.1" value="${(b.prop||0).toFixed(1)}" style="width:74px" onchange="setBoosterProp(this.value)" ${fitted?'':'disabled'}><span class="muted" style="font-size:12px">t each</span></div>
    ${fitted&&bm?`<div class="stage-stats">
      <span class="ss">each <b>${(bm.wet/bm.count).toFixed(2)} t</b></span>
      <span class="ss">cluster wet <b>${bm.wet.toFixed(2)} t</b></span>
      <span class="ss">boost Δv <b class="num">+${fI(v.boostDv||0)} m/s</b></span>
      <span class="ss">liftoff TWR <b class="num">${v.twr.toFixed(2)}</b></span>
      <span class="ss">reliability <b class="num">−${Math.round((1-boosterRelPenalty())*100)}%</b></span>
    </div>
    <div class="dim" style="font-size:12px;margin-top:6px">Boosters lift the full wet stack, then drop away; the core's own Δv is unchanged. They add ${b.count} assembly unit${b.count>1?'s':''} (build time/cost) and combined liftoff thrust.</div>`:''}`;
}

function renderCrew(){
  const m=curMission();
  const card=$('crewCard');
  if(!m.crew){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  const ls=lifeSupport(m,state.eclss);
  const durTxt = m.days<1 ? (m.days*24).toFixed(0)+' h' : m.days+' days';
  const tiers=Object.values(ECLSS).map(t=>{
    const locked=t.research && !state.research[t.research];
    const sel=state.eclss===t.id;
    const lt=lifeSupport(m,t.id);
    return `<button class="btn" style="flex:1;${sel?'border-color:var(--ignite);color:var(--ignite)':''}" onclick="setEclss('${t.id}')" ${locked?'disabled':''}>
      ${t.name}${locked?' 🔒':''}<br><span class="dim" style="font-size:11px">${(lt.recovery*100)|0}% recovery · ${lt.total.toFixed(2)} t</span></button>`;
  }).join('');
  const lsBonus=lsRecoveryBonus();
  const recNote = ls.baseRecovery>0 && lsBonus>0
    ? `<div class="dim" style="font-size:12px;margin-top:8px"><span style="color:var(--ok)">Recycling research +${Math.round(lsBonus*100)}%</span> on top of the closed-loop base → <b>${Math.round(ls.recovery*100)}%</b> recovery (capped at ${Math.round(LS_RECOVERY_CAP*100)}%). That much less food, water and air to lift.</div>`
    : (ls.baseRecovery===0
        ? `<div class="dim" style="font-size:12px;margin-top:8px">Open-loop carries every gram of consumables. Recovery tech (and crew-track recycling research) pays off as missions get longer.</div>`
        : `<div class="dim" style="font-size:12px;margin-top:8px">Crew-track research (Long-Duration Habitats, Closed Ecological Life Support) raises recycling further, shrinking consumable mass.</div>`);
  card.innerHTML=`<h2>Crew &amp; Life Support</h2>
    <div class="sub" style="margin-bottom:10px">${m.crew} crew · ${durTxt} aloft. Everything that keeps them alive is payload you have to lift.</div>
    <div class="row" style="gap:6px;align-items:stretch">${tiers}</div>
    <div class="metrics" style="margin-top:12px">
      <div class="metric"><div class="k">Capsule + crew</div><div class="v">${ls.capsule.toFixed(2)} t</div></div>
      <div class="metric"><div class="k">ECLSS system</div><div class="v">${ls.system.toFixed(2)} t</div></div>
      <div class="metric"><div class="k">Consumables</div><div class="v">${ls.consumables.toFixed(2)} t</div></div>
      <div class="metric"><div class="k">Life-support payload</div><div class="v" style="color:var(--ignite)">${ls.total.toFixed(2)} t</div></div>
    </div>
    ${recNote}
    <div class="eq">consumables = ${m.crew} crew × ${m.days} d × 5 kg × (1 − ${(ls.recovery*100)|0}% recovery) = ${(ls.consumables*1000).toFixed(0)} kg<br>
      ${state.research.launch_escape?'<span style="color:var(--ok)">abort tower fitted — crew survive a launch failure</span>':'<span style="color:var(--bad)">no escape system — a launch failure means loss of crew</span>'}</div>`;
}

function setPowerSource(id){ const s=POWER_SOURCES[id]; if(!s) return; if(s.research&&!state.research[s.research]) return; state.powerSource=id; render(); }
function renderPower(){
  const m=curMission(), card=$('powerCard'); if(!card) return;
  if(!(m&&m.profile)){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  if(selfPoweredCraft(m)){
    card.innerHTML=`<h2>Power</h2><div class="flag"><span style="color:var(--ok)">⚛ Nuclear-electric drive — self-powered</span><span class="dim">The NEP reactor powers the whole spacecraft anywhere in the Solar System; no separate power plant is needed.</span></div>`;
    return;
  }
  const demand=powerDemand(m), src=powerSourceDef(state.powerSource), pv=powerViable(m), mass=powerSystemMass(m), flux=destSolarFlux(m);
  const sources=Object.values(POWER_SOURCES).map(s=>{
    const locked=s.research && !state.research[s.research], sel=state.powerSource===s.id;
    const sp=s.kwPerTonne*(s.distScaled?flux:1);
    const note = (s.distScaled && flux<SOLAR_MIN_FLUX) ? 'unusable here' : (sp>0?`${(demand/sp).toFixed(2)} t`:'—');
    return `<button class="btn" style="flex:1;${sel?'border-color:var(--ignite);color:var(--ignite)':''}" onclick="setPowerSource('${s.id}')" ${locked?'disabled':''}>${s.name}${locked?' 🔒':''}<br><span class="dim" style="font-size:11px">${note}</span></button>`;
  }).join('');
  const base=1.5+(radEnvironment(m)>=4?1.5:0), eclss=m.crew>0?m.crew*eclssPowerPerCrew():0, prop=(usesTransfer(m)&&transferEng().powerDraw)?transferEng().powerDraw:0;
  card.innerHTML=`<h2>Power — supply vs demand</h2>
    <div class="sub" style="margin-bottom:8px">The spacecraft needs electrical power for avionics, life support, and any electric drive. The power plant is mass you must lift — pick the source that's viable at the destination for the least mass.</div>
    <div class="row" style="gap:6px;align-items:stretch">${sources}</div>
    <div class="metrics" style="margin-top:12px">
      <div class="metric"><div class="k">Demand</div><div class="v" style="color:var(--ignite)">${demand.toFixed(1)} kW</div></div>
      <div class="metric"><div class="k">Source</div><div class="v">${src.name}</div></div>
      <div class="metric"><div class="k">Specific power here</div><div class="v">${powerSpecific(m).toFixed(1)} kW/t</div></div>
      <div class="metric"><div class="k">Power-plant mass</div><div class="v" style="color:${pv.ok?'var(--ignite)':'var(--bad)'}">${pv.ok?mass.toFixed(2)+' t':'—'}</div></div>
    </div>
    <div class="eq">demand = ${base.toFixed(1)} baseline${eclss>0?` + ${eclss.toFixed(1)} life support`:''}${prop>0?` + ${prop} electric drive`:''} = <b>${demand.toFixed(1)} kW</b> · ${Math.round(flux*100)}% sunlight at the destination${src.rad>0?` · ${src.name} add radiation — keep crews shielded`:''}</div>
    ${pv.ok?'':`<div class="flag warn"><span style="color:var(--warn)">⚠ Power not viable</span><span class="dim">${pv.why}</span></div>`}`;
}
function renderTransfer(){
  const m=curMission();
  const card=$('transferCard');
  if(!(m.tanker || (m.profile && m.modules.includes('transfer')))){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  const opts=moduleOptions(state.transfer.eng, true);
  const dry=inSpaceDry(state.transfer), wet=inSpaceWet(state.transfer);
  if(m.tanker){
    card.innerHTML=`<h2>Cargo Tank — propellant for the depot</h2>
      <div class="sub" style="margin-bottom:8px">No engine fires on this run; the tank itself is the payload. Every tonne of propellant loaded here is a tonne delivered to the LEO depot.</div>
      <div class="row"><label>Propellant</label>
        <input type="range" min="0.1" max="90" step="0.5" value="${state.transfer.prop}" oninput="setTransferProp(this.value)">
        <input type="number" min="0.1" max="120" step="0.1" value="${state.transfer.prop.toFixed(1)}" style="width:74px" onchange="setTransferProp(this.value)"><span class="muted" style="font-size:12px">t</span></div>
      <div class="stage-stats">
        <span class="ss">tank dry <b>${dry.toFixed(2)} t</b></span>
        <span class="ss">propellant cargo <b>${state.transfer.prop.toFixed(1)} t</b></span>
        <span class="ss">total to LEO <b>${wet.toFixed(2)} t</b></span>
      </div>
      <div class="eq">Depot currently holds <b style="color:var(--ignite)">${state.depot.toFixed(1)} t</b>. This run would deliver <b style="color:var(--ignite)">${state.transfer.prop.toFixed(1)} t</b> more.</div>`;
    return;
  }
  card.innerHTML=`<h2>Transfer Stage — in-space propulsion</h2>
    <div class="sub" style="margin-bottom:8px">A separate vehicle, lit in vacuum. One tank must cover every deep-space burn while carrying the crew module.</div>
    <div class="row"><label>Engine</label><select onchange="setTransferEng(this.value)" style="flex:1">${opts}</select></div>
    <div class="row"><label>Propellant</label>
      <input type="range" min="0.1" max="250" step="0.5" value="${state.transfer.prop}" oninput="setTransferProp(this.value)">
      <input type="number" min="0.1" max="400" step="0.1" value="${state.transfer.prop.toFixed(1)}" style="width:74px" onchange="setTransferProp(this.value)"><span class="muted" style="font-size:12px">t</span></div>
    <div class="stage-stats">
      <span class="ss">dry <b>${dry.toFixed(2)} t</b></span>
      <span class="ss">prop <b>${state.transfer.prop.toFixed(1)} t</b></span>
      <span class="ss">wet <b>${wet.toFixed(2)} t</b></span>
    </div>
    ${(ENGINES[state.transfer.eng]||{}).lowThrust?`<div class="flag"><span style="color:var(--readout)">⚠ Low-thrust drive</span><span class="dim">The NEP's thrust is measured in newtons — burns take weeks to months. The Δv budget here is impulsive; treat real transit/burn times as far longer. Best for uncrewed cargo or where mass ratio, not time, is the constraint.</span></div>`:''}
    ${(ENGINES[state.transfer.eng]||{}).powerDraw?`<div class="flag"><span style="color:var(--readout)">⚡ Electric drive — draws ${(ENGINES[state.transfer.eng]||{}).powerDraw} kW</span><span class="dim">Needs a power source sized for it (see the Power card). Solar works inner-system; the outer system needs a reactor.</span></div>`:''}
    ${(ENGINES[state.transfer.eng]||{}).selfPowered?`<div class="flag"><span style="color:var(--ok)">⚛ Self-powered (onboard reactor)</span><span class="dim">A nuclear-electric drive carries its own reactor — it powers the craft anywhere, no separate source needed.</span></div>`:''}
    ${renderDepotDraw()}
    ${renderAssemblyToggle()}`;
}
function renderDepotDraw(){
  if(!state.research.orbital_depot) return '';
  const max=Math.max(0.1, Math.min(state.depot, 60));
  return `<div class="stage-head" style="margin-top:12px"><span class="label">DEPOT TOP-OFF (in LEO)</span></div>
    <div class="sub" style="margin-bottom:6px">Depot holds <b style="color:var(--ignite)">${state.depot.toFixed(1)} t</b>. Propellant drawn here doesn't count toward the launch vehicle's lift — only the carried tank does.</div>
    <div class="row"><label>Draw</label>
      <input type="range" min="0" max="${max}" step="0.5" value="${Math.min(state.depotUse,max)}" oninput="setDepotUse(this.value)">
      <input type="number" min="0" max="${state.depot.toFixed(1)}" step="0.1" value="${state.depotUse.toFixed(1)}" style="width:74px" onchange="setDepotUse(this.value)"><span class="muted" style="font-size:12px">t</span></div>`;
}
// #6: orbital-assembly toggle — sits with the other in-LEO route options on the transfer card
function renderAssemblyToggle(){
  const m=curMission();
  if(!assemblyAvailable(m)) return '';
  const on=assemblyOn(m), n=assemblyModules(m).length, dock=assemblyDockPenalty(m);
  const hit=Math.round((1-dock)*100);
  const mods=assemblyModules(m).map(k=>k==='transfer'?'transfer stage':'lander').join(' + ');
  return `<div class="stage-head" style="margin-top:12px"><span class="label">ORBITAL ASSEMBLY (route)</span>
      <button class="btn ghost" style="font-size:12px;padding:4px 10px;${on?'border-color:var(--ignite);color:var(--ignite)':''}" onclick="setAssembleOrbit(${on?'false':'true'})">${on?'On ✓':'Off'}</button></div>
    <div class="sub">${on
      ? `Assembling <b>${mods}</b> in LEO across <b>${n}</b> extra launch${n>1?'es':''}. The main rocket no longer lifts ${n>1?'them':'it'} — but pays +${n} mo build, +${fM(n*ASSEMBLY_LAUNCH_COST)} launch, and a ${hit}% docking-reliability hit${state.research.auto_rendezvous?' (halved by auto-rendezvous)':''}.`
      : `Launch the heavy in-space modules separately and dock them in orbit, so a smaller rocket can fly the mission. Trades raw lift for extra flights and docking risk.`}</div>`;
}

function moduleOptions(sel, allowTransferOnly){
  // transferOnly (NTR/NEP) engines are available to the transfer stage only — never landers.
  // Solids are launch motors (no restart/throttle for precise in-space burns) — excluded from in-space modules.
  return Object.values(ENGINES).filter(e=>state.unlocked[e.id] && !e.solid && (allowTransferOnly || !e.transferOnly))
    .map(e=>`<option value="${e.id}" ${e.id===sel?'selected':''}>${e.name} · Isp ${e.ispVac}s vac${e.lowThrust?' · low-thrust':''}</option>`).join('');
}
function renderLander(){
  const m=curMission();
  const card=$('landerCard');
  if(!(m.profile && m.modules.includes('lander'))){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  const d=state.descent, a=state.ascent;
  const dDry=inSpaceDry(d), dWet=inSpaceWet(d), aDry=inSpaceDry(a), aWet=inSpaceWet(a);
  card.innerHTML=`<h2>Lunar Lander — two stages, Apollo LM model</h2>
    <div class="sub" style="margin-bottom:8px">The descent stage carries everything down and is left on the surface. The ascent stage carries the crew back up on its own, separate tank.</div>
    <div class="stage-head"><span class="label">DESCENT STAGE</span></div>
    <div class="row"><label>Engine</label><select onchange="setDescentEng(this.value)" style="flex:1">${moduleOptions(d.eng)}</select></div>
    <div class="row"><label>Propellant</label>
      <input type="range" min="0.1" max="50" step="0.5" value="${d.prop}" oninput="setDescentProp(this.value)">
      <input type="number" min="0.1" max="60" step="0.1" value="${d.prop.toFixed(1)}" style="width:74px" onchange="setDescentProp(this.value)"><span class="muted" style="font-size:12px">t</span></div>
    <div class="stage-stats"><span class="ss">dry <b>${dDry.toFixed(2)} t</b></span><span class="ss">prop <b>${d.prop.toFixed(1)} t</b></span><span class="ss">wet <b>${dWet.toFixed(2)} t</b></span></div>

    <div class="stage-head" style="margin-top:12px"><span class="label">ASCENT STAGE</span></div>
    <div class="row"><label>Engine</label><select onchange="setAscentEng(this.value)" style="flex:1">${moduleOptions(a.eng)}</select></div>
    <div class="row"><label>Propellant</label>
      <input type="range" min="0.1" max="30" step="0.25" value="${a.prop}" oninput="setAscentProp(this.value)">
      <input type="number" min="0.1" max="40" step="0.1" value="${a.prop.toFixed(1)}" style="width:74px" onchange="setAscentProp(this.value)"><span class="muted" style="font-size:12px">t</span></div>
    <div class="stage-stats"><span class="ss">dry <b>${aDry.toFixed(2)} t</b></span><span class="ss">prop <b>${a.prop.toFixed(1)} t</b></span><span class="ss">wet <b>${aWet.toFixed(2)} t</b></span></div>
    <div class="eq" style="margin-top:10px">Lander to LEO = descent (${dWet.toFixed(2)} t) + ascent (${aWet.toFixed(2)} t) = ${(dWet+aWet).toFixed(2)} t — all of it lifted from Earth, carried to lunar orbit, and lowered to the surface before any of it does useful work.</div>`;
}

function renderWindowPlanner(){
  const m=curMission();
  const card=$('windowCard');
  if(!m.window){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  const wins=windowsFor(m.id), now=absDay();
  const cw=state.committedWindow&&state.committedWindow.missionId===m.id?state.committedWindow:null;
  const rows=wins.map((w,i)=>{
    const daysAway=w.abs-now;
    const passed=daysAway<0;
    const qLabel = w.quality>1.08?'Favorable':(w.quality<0.95?'Marginal':'Average');
    const qColor = w.quality>1.08?'var(--ok)':(w.quality<0.95?'var(--warn)':'var(--muted)');
    const isCommitted=cw && cw.abs===w.abs;
    let btn;
    if(passed) btn=`<button class="btn" disabled>Closed</button>`;
    else if(isCommitted) btn=`<button class="btn" style="border-color:var(--ignite);color:var(--ignite)" onclick="cancelWindow()">Committed — cancel</button>`;
    else if(cw) btn=`<button class="btn" disabled>—</button>`;
    else btn=`<button class="btn" onclick="commitWindow('${m.id}',${i})">Commit</button>`;
    return `<div class="item" style="${passed?'opacity:.45':''}">
      <div class="body">
        <div class="title">${dayToDate(w.abs)} <span class="pill" style="color:${qColor};border-color:#3a3a3a">${qLabel} geometry</span></div>
        <div class="sub">${daysAway>=0?fmtTimeLeft(daysAway/DAYS_PER_MONTH)+' away':'window has closed'} · payout ×${w.quality.toFixed(2)}</div>
      </div>
      ${btn}</div>`;
  }).join('');
  card.innerHTML=`<h2>Launch Window Planner — Earth/Mars synodic cycle</h2>
    <div class="sub" style="margin-bottom:8px">Transfer windows open roughly every 26 months. Commit to one, then build and test before it closes — being late means waiting for the next.</div>
    ${rows}`;
}

// #3: vehicle families — persistent named lineages and their accumulated heritage
/* ---------- #24: Mission Planner wizard ----------
   A guided, linear on-ramp over the existing systems: choose a mission ->
   architecture -> design vehicle -> assign crew -> review reliability -> launch.
   Each step is a thin wrapper that reuses the same pure helpers the tabs do
   (computeVehicle / simulateMission / canLaunch / missionArch*) and links out to
   the tab that does the real work. The freeform tabs are unchanged. plannerSteps()
   is pure so it can be exercised headlessly. */
let plannerShowMissions=false;
function plannerChoose(){ plannerShowMissions=true; render(); }
function plannerSetMission(id){ const m=missionById(id); if(!m||!missionFlyable(m)) return; state.activeMission=id; plannerShowMissions=false; render(); }
function plannerSteps(){
  const m=curMission();
  if(!m) return [{key:'mission',n:1,title:'Choose a mission',done:false,detail:'Pick your objective to begin.',focus:'mission',actLabel:'Choose'}];
  const steps=[];
  steps.push({key:'mission',n:1,title:'Choose a mission',done:true,
    detail:`${m.name} — ${m.crew>0?m.crew+' crew · '+m.days+'d':'uncrewed'} · payout ${fM(m.payout)}`,focus:'mission',actLabel:'Change'});
  // architecture (only a real choice when the mission offers more than one)
  const archs=missionArchList(m.id);
  if(archs&&archs.length>1){ const a=missionArchOf(m.id); steps.push({key:'arch',n:2,title:'Choose architecture',done:true,detail:`${a?a.name:'—'} — ${archs.length} profiles available`,tab:'bench',actLabel:'Architecture'}); }
  else steps.push({key:'arch',n:2,title:'Architecture',done:true,skip:true,detail:'Standard profile — no architecture choice for this mission.'});
  // design feasibility
  const v=computeVehicle();
  const sim=m.profile?simulateMission(m):null;
  let dOk,dDetail;
  if(m.profile){ const fails=sim.legs.filter(l=>!l.pass).length; dOk=!!sim.ok&&fails===0; dDetail=fails?`${fails} mission leg${fails>1?'s':''} short on Δv · TWR ${v.twr.toFixed(2)}`:`All ${sim.legs.length} legs pass · TWR ${v.twr.toFixed(2)}`; }
  else { dOk=v.totalDv>=m.reqDv&&v.twr>1.0; dDetail=`Δv ${fI(v.totalDv)} / ${fI(m.reqDv)} m/s · TWR ${v.twr.toFixed(2)}`; }
  steps.push({key:'design',n:3,title:'Design the vehicle',done:dOk,detail:dDetail,tab:'bench',actLabel:'Design Bench'});
  // crew
  if(m.crew>0){ const assigned=state.assignedAstronaut&&(state.staff||[]).some(s=>s.id===state.assignedAstronaut); steps.push({key:'crew',n:4,title:'Assign crew',done:!!assigned,detail:assigned?`${(personById(state.assignedAstronaut)||{}).name||'Astronaut'} assigned`:'No astronaut assigned to this crewed flight.',tab:'personnel',actLabel:'Personnel'}); }
  else steps.push({key:'crew',n:4,title:'Crew',done:true,skip:true,detail:'Uncrewed mission — no crew required.'});
  // reliability (advisory, not a hard gate)
  const relTarget=m.crew>0?0.80:0.70, relOk=v.reliability>=relTarget;
  steps.push({key:'reliability',n:5,title:'Review reliability',done:relOk,detail:`${(v.reliability*100|0)}% reliability vs ${(relTarget*100)|0}% recommended${relOk?'':' — consider a test campaign or QA'}`,tab:'bench',actLabel:'Tune'});
  // launch — gated by the same canLaunch the bench uses
  const chk=canLaunch(v,m,sim);
  steps.push({key:'launch',n:6,title:'Integrate & launch',done:chk.ok,ready:chk.ok,detail:chk.ok?'All systems go — build & launch when ready.':chk.why,launch:true});
  return steps;
}
function plannerStepClick(s){ return s.focus==='mission'?'plannerChoose()':(s.tab?tabIntent(s.tab):''); } // slice 6: crew step → personnel modal via tabIntent
// renderPlanner() retired in slice 4 — the Planner tab folded into the left-rail advisor's
// "Flight plan" block (renderCCLeft), which reuses these same plannerSteps()/planner* helpers.
// #25: side-by-side vehicle comparison. Selection is transient UI state (like
// mapExpanded) — not persisted, so no SAVE_VERSION bump. '__bench__' compares the
// live bench config; any other id is a saved family.
let cmpA=null, cmpB=null;
function setCompare(side,id){ if(side==='A') cmpA=id; else cmpB=id; render(); }
// Compute a comparison row's metrics by temporarily applying the design's spec to the
// live state, running the existing computeVehicle/buildMonths, then restoring. The
// active mission (curMission) is the shared yardstick both designs are measured against.
function compareMetrics(id){
  const m=curMission();
  if(id==='__bench__'){ const v=computeVehicle(); return {label:'Current bench', v, months:buildMonths(m)}; }
  const fam=familyById(id); if(!fam) return null;
  const save={stages:state.stages,transfer:state.transfer,descent:state.descent,ascent:state.ascent,eclss:state.eclss,activeVehicle:state.activeVehicle};
  try{
    const s=fam.spec||{};
    if(s.stages) state.stages=JSON.parse(JSON.stringify(s.stages));
    if(s.transfer) state.transfer=JSON.parse(JSON.stringify(s.transfer));
    if(s.descent) state.descent=JSON.parse(JSON.stringify(s.descent));
    if(s.ascent) state.ascent=JSON.parse(JSON.stringify(s.ascent));
    if(s.eclss!=null) state.eclss=s.eclss;
    state.activeVehicle=fam.id;
    const v=computeVehicle(); const months=buildMonths(curMission());
    return {label:fam.name, v, months, fam};
  } finally { Object.assign(state, save); }
}
// the comparison grid HTML — two selectable designs, six metrics, better value in green
function vehicleCompareHTML(){
  const fams=vehicleFamilies();
  const opts=[{id:'__bench__',name:'Current bench'}, ...fams.map(f=>({id:f.id,name:f.name}))];
  if(opts.length<2) return ''; // need at least the bench + one family
  const ids=opts.map(o=>o.id);
  let a=ids.includes(cmpA)?cmpA:opts[0].id;
  let b=ids.includes(cmpB)?cmpB:(opts.find(o=>o.id!==a)||opts[0]).id;
  const sel=(side,cur)=>`<select onchange="setCompare('${side}',this.value)" style="width:100%;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:5px;padding:4px 6px;font-size:12px">${opts.map(o=>`<option value="${o.id}" ${o.id===cur?'selected':''}>${esc(o.name)}</option>`).join('')}</select>`;
  const A=compareMetrics(a), B=compareMetrics(b);
  if(!A||!B) return '';
  const row=(label,av,bv,fmt,better)=>{
    const eq=Math.abs(av-bv)<1e-9;
    const aWin=!eq&&(better==='high'?av>bv:av<bv), bWin=!eq&&(better==='high'?bv>av:bv<av);
    const cell=(val,win)=>`<span style="font-family:var(--mono);font-size:12px;${win?'color:var(--ok);font-weight:600':''}">${fmt(val)}${win?' ▸':''}</span>`;
    return `<span class="dim" style="font-size:12px">${label}</span>${cell(av,aWin)}${cell(bv,bWin)}`;
  };
  const rows=[
    row('Payload', A.v.payload, B.v.payload, t=>t.toFixed(1)+' t','high'),
    row('Δv', A.v.totalDv, B.v.totalDv, t=>fI(t)+' m/s','high'),
    row('TWR', A.v.twr, B.v.twr, t=>t.toFixed(2),'high'),
    row('Reliability', A.v.reliability, B.v.reliability, t=>(t*100|0)+'%','high'),
    row('Build cost', A.v.buildCost, B.v.buildCost, t=>fM(t),'low'),
    row('Build time', A.months, B.months, t=>t+' mo','low'),
  ].join('');
  return `<div class="card adv-only" style="background:var(--panel2);margin-top:10px">
    <div class="mission-tag">⚖ Compare designs</div>
    <div class="dim" style="font-size:12px;margin:2px 0 8px">Measured against <b>${curMission()?curMission().name:'the current mission'}</b> — green ▸ marks the better value (higher payload/Δv/TWR/reliability, lower cost/time).</div>
    <div style="display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:7px 10px;align-items:center">
      <span></span>${sel('A',a)}${sel('B',b)}
      ${rows}
    </div>
  </div>`;
}
function renderVehicleFamilies(){
  const card=$('vehicleFamilyCard'); if(!card) return;
  const fams=vehicleFamilies();
  const active=activeFamily();
  let activeHtml;
  if(active){
    const exp=familyExperience(active);
    const relB=Math.round(familyRelBonus(active)*1000)/10; // % to 0.1
    const buildCut=Math.round((1-familyBuildMult(active))*100);
    const sr=familySuccessRate(active);
    const parent=active.parentId?familyById(active.parentId):null;
    activeHtml=`<div class="card" style="background:var(--panel2);border-color:var(--ignite);margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div class="mission-name" style="margin:0;font-size:15px"><span style="color:var(--ignite)">▲ ${esc(active.name)}</span> <span class="pill active">flying</span></div>
        <div class="dim" style="font-size:12px">since ${active.born}${parent?` · from ${esc(parent.name)}`:''}</div>
      </div>
      <div class="metrics" style="margin:8px 0 0">
        <div class="metric"><div class="k">Flights</div><div class="v">${active.flights||0}${sr!=null?` · ${sr}%`:''}</div></div>
        <div class="metric"><div class="k">Losses</div><div class="v" style="color:${active.losses?'var(--bad)':'var(--ink)'}">${active.losses||0}</div></div>
        <div class="metric"><div class="k">Reliability heritage</div><div class="v" style="color:var(--ok)">+${relB.toFixed(1)}%</div></div>
        <div class="metric"><div class="k">Build discount</div><div class="v" style="color:var(--ok)">−${buildCut}%</div></div>
      </div>
      <div class="dim" style="font-size:12px;margin-top:8px">${exp>=FAM_EXP_CAP?'Heritage maxed — a fully proven airframe.':`Heritage builds with every success (${exp}/${FAM_EXP_CAP}). Losing it would sting.`}</div>
    </div>`;
  }else{
    activeHtml=`<div class="dim" style="font-size:12px;margin-bottom:8px">Flying an <b>untracked one-off</b> — no heritage. Register this design as a family to start accumulating reliability, manufacturing savings, and brand reputation across its flights.</div>`;
  }
  const others=fams.filter(f=>!active||f.id!==active.id);
  const list=others.length?`<div class="mission-tag" style="margin-top:4px">Fleet lineages</div>`+others.map(f=>{
    const sr=familySuccessRate(f);
    return `<div class="item" style="margin-top:8px">
      <div class="body">
        <div class="title" style="font-size:13px">${esc(f.name)} ${f.parentId&&familyById(f.parentId)?`<span class="pill">↳ ${esc(familyById(f.parentId).name)}</span>`:''}</div>
        <div class="sub">${f.flights||0} flights${sr!=null?` · ${sr}% success`:''}${f.losses?` · ${f.losses} lost`:''} · +${(familyRelBonus(f)*100).toFixed(1)}% rel</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <button class="btn" style="font-size:12px;padding:4px 8px" onclick="loadFamily('${f.id}')">Load &amp; fly</button>
        <button class="btn ghost danger" style="font-size:12px;padding:4px 8px" onclick="retireFamily('${f.id}')">Retire</button>
      </div>
    </div>`;
  }).join(''):'';
  card.innerHTML=`<h2>Vehicle Family</h2>
    ${activeHtml}
    <button class="btn" style="width:100%" onclick="saveAsFamily()">+ Register current design${active?` as a new family (derives from ${esc(active.name)})`:' as a family'}</button>
    ${list}
    ${vehicleCompareHTML()}`;
}
// #6: strategic routes to a deep-space destination — makes the branch choice explicit
function renderRoutes(){
  const card=$('routesCard'); if(!card) return;
  const m=curMission();
  if(!m || !m.profile){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  const body=(BODIES.find(b=>(b.missions||[]).includes(m.id))||{}).name||'deep space';
  const rows=marsRoutes(m).map(r=>{
    const pill = r.active?'<span class="pill active">in use</span>':(r.available?'<span class="pill ok">available</span>':'<span class="pill lock">locked</span>');
    return `<div class="item" style="margin-bottom:8px;${r.active?'border-color:'+r.color:''}">
      <div style="width:4px;align-self:stretch;background:${r.color};border-radius:2px"></div>
      <div class="body"><div class="title" style="font-size:13px">${r.name} ${pill}</div>
        <div class="sub">${r.note}</div></div></div>`;
  }).join('');
  card.innerHTML=`<h2>Routes to ${body}</h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 8px">Different tech branches reach the same destination differently — trade raw lift, propellant logistics, nuclear Isp, or in-orbit assembly. Unlock more in R&D; you can combine them.</p>
    ${rows}`;
}
// M12: mission-architecture selector — reshapes the profile/hardware/risk
function renderArchitecture(){
  const card=$('archCard'); if(!card) return;
  const id=state.activeMission;
  const list=missionArchList(id);
  if(!list){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  const aid=activeArchId(id);
  const fork = id==='luna_landing'; // CE3(c): the committed, tech-gated lunar fork
  const committed = fork ? committedLunarArch() : null;
  const opts=list.map(a=>{
    const sel=a.id===aid;
    const locked = fork && !lunarArchUnlocked(a);
    const isCommitted = fork && committed===a.id;
    const tag = locked ? `🔒 needs ${a.needs}` : (fork ? (isCommitted?'committed — flying this way':(committed?`switch · ${fM(lunarSwitchCost())}`:'commit (free)')) : (sel?'flying this way':'choose'));
    const click = locked ? '' : ` onclick="setArchitecture('${id}','${a.id}')"`;
    return `<div class="diffcard ${sel?'sel':''}" style="${locked?'opacity:.55;cursor:not-allowed':'cursor:pointer'}"${click}>
      <div class="tag">${tag}</div>
      <h3 style="font-size:13px">${a.name}</h3>
      <p style="font-size:12px">${a.blurb}</p>
    </div>`;
  }).join('');
  const lead = fork
    ? `Your lunar architecture is a <b>one-way commitment</b> — three routes, each demanding a different technology. ${committed?`You're committed to <b>${missionArchOf(id).name}</b>; re-architecting costs ${fM(lunarSwitchCost())} and ${LUNAR_SWITCH_MONTHS} months.`:'The first commitment is free; switching later is a major capital event.'}`
    : 'How you get there is a strategy in itself — each path reshapes the burns, the hardware it needs, and the risk. Pick one, then size the vehicle for its profile on the right.';
  card.innerHTML=`<h2>Mission Architecture</h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 8px">${lead}</p>
    <div class="diffgrid" style="grid-template-columns:${list.length>2?'1fr 1fr 1fr':'1fr 1fr'}">${opts}</div>`;
}
// M10: static, design-driven silhouette of the current vehicle on the bench —
// reuses the launch animation's buildVehicleShape/drawVehicle with no flame.
function currentVehicleSpec(){
  const m=curMission();
  return { stages: state.stages.map(s=>({prop:s.prop, count:s.count, dia:s.dia})),
    boosters: boosterSpec(),
    transferProp: (m&&m.profile&&m.modules.includes('transfer'))?state.transfer.prop:0,
    crewed: !!(m&&m.crew>0) };
}
// shared 2D draw of the bench silhouette onto any 2D context sized W×H
// One source of truth for how the bench preview lays the rocket out — the drawing AND the
// interactive hit zones both use this, so they can never drift apart.
function vehPreviewLayout(spec, W, H){
  let shape; try{ shape=buildVehicleShape(spec); }catch(e){ return null; }
  if(!shape.segs.length) return null;
  const scale=0.66*Math.min((H-42)/(shape.totalH+16), (W-30)/(shape.maxW*1.9));
  const baseX=W/2, baseY=H-34;
  // per-segment rects in scene/texture coordinates (bottom of stack at baseY, growing upward)
  const zones=[]; let y=baseY;
  shape.segs.forEach((s,i)=>{
    const hh=s.h*scale, ww=Math.max(s.w*scale, 18); // min grab width so slim stages stay touchable
    zones.push({ kind:s.kind, seg:i, x:baseX-ww/2-6, y:y-hh, w:ww+12, h:hh, cx:baseX, top:y-hh, bot:y, halfW:s.w*scale/2 });
    y-=hh;
  });
  const noseH=28*scale;
  zones.push({ kind:'nose', x:baseX-24, y:y-noseH-4, w:48, h:noseH+4, cx:baseX, top:y-noseH, bot:y });
  if(shape.boosters){ const b=shape.boosters, s0=zones[0];
    zones.push({ kind:'boosters', x:s0.x-b.w*scale-8, y:s0.bot-b.h*scale, w:b.w*scale+8, h:b.h*scale, cx:baseX });
    zones.push({ kind:'boosters', x:s0.x+s0.w, y:s0.bot-b.h*scale, w:b.w*scale+8, h:b.h*scale, cx:baseX }); }
  return {shape, scale, baseX, baseY, zones};
}
function drawVehiclePreviewTo(ctx, W, H, spec){
  ctx.clearRect(0,0,W,H);
  const L=vehPreviewLayout(spec,W,H); if(!L) return;
  ctx.save(); ctx.translate(L.baseX, L.baseY); drawVehicle(ctx, L.shape.segs, L.shape.nose, L.scale, 0, 0); ctx.restore();
}
function renderVehiclePreview(){
  const spec=currentVehicleSpec();
  const eng=state.stages.reduce((a,s)=>a+s.count,0);
  const el=$('vehicleLabel');
  const nm=(curLivery().name||'').trim();
  if(el) el.innerHTML=`${nm?`<div style="font-weight:600;color:var(--ink);font-size:13px;margin-bottom:2px">${esc(nm)}</div>`:''}${state.stages.length} stage${state.stages.length>1?'s':''} · ${eng} engine${eng>1?'s':''}${boostersFitted()?` · ${state.boosters.count} booster${state.boosters.count>1?'s':''}`:''}${spec.transferProp>0?' · transfer stage':''} · ${spec.crewed?'crew capsule':'payload fairing'}`;
  // Slice 2: prefer the Phaser-hosted preview scene; fall back to the plain 2D canvas.
  if(phaserOK() && startVehPreview(spec)) return;
  const cv=$('vehiclePreview'); if(!cv || !cv.getContext) return;
  const ctx=cv.getContext('2d'); if(!ctx) return;
  drawVehiclePreviewTo(ctx, cv.width, cv.height, spec);
  // fallback canvas gets click-to-select parity (drag-stretch is Phaser-only)
  if(!cv._benchWired){ cv._benchWired=true;
    cv.addEventListener('click',e=>{
      const r=cv.getBoundingClientRect();
      const x=(e.clientX-r.left)*(cv.width/r.width), y=(e.clientY-r.top)*(cv.height/r.height);
      const L=vehPreviewLayout(currentVehicleSpec(), cv.width, cv.height); if(!L) return;
      const z=L.zones.find(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h);
      if(z) benchSelectStage(z.kind==='stage'?z.seg:z.kind, true);
    }); }
}



/* ---------- Phase 2: static fire — reliability made tangible ----------
   Bolt the first stage to the stand and light it. $0.35M, no calendar time. Two outcomes,
   both worth having (that's real test culture — a found fault is a WIN):
   · Clean burn  → the stage-1 engine banks a heritage flight on the ground (capped at
     STATIC_HERITAGE_CAP static credits per engine — eventually you have to fly it).
   · Anomaly found → engineers trace and fix it: the NEXT launch carries +2% reliability.
   The gauge sweep + rumble make the number feel like hardware. */
const STATIC_FIRE_COST=0.35;
const STATIC_HERITAGE_CAP=5;       // ground testing only takes an engine so far
const STATIC_FIX_BONUS=0.02;       // one-launch reliability bonus after a found-and-fixed fault
function canStaticFire(){
  if(state.money<STATIC_FIRE_COST) return {ok:false, why:'Needs '+fM(STATIC_FIRE_COST)};
  const eng=state.stages[0]&&state.stages[0].eng; if(!eng) return {ok:false, why:'No first stage'};
  return {ok:true, eng};
}
function staticFire(){
  const chk=canStaticFire(); if(!chk.ok) return;
  state.money-=STATIC_FIRE_COST;
  const eng=chk.eng, def=ENGINES[eng]||{};
  const clean=Math.random() < (0.62 + 0.3*engineHeritageFrac(eng)); // greener engines find more faults — as they should
  state._staticFires=(state._staticFires||{}); state._staticFires[eng]=(state._staticFires[eng]||0);
  let verdict;
  if(clean){
    if(state._staticFires[eng]<STATIC_HERITAGE_CAP){
      state._staticFires[eng]++;
      if(!state.engineHeritage) state.engineHeritage={};
      state.engineHeritage[eng]=Math.min(ENG_HERITAGE_MAX_FLIGHTS,(state.engineHeritage[eng]||0)+1);
      verdict={good:true, title:'CLEAN BURN', body:`${def.name||eng} ran the full duration nominally. Heritage +1 (${engineHeritageFlights(eng)}/${ENG_HERITAGE_MAX_FLIGHTS}) — ground credits ${state._staticFires[eng]}/${STATIC_HERITAGE_CAP}.`};
    } else {
      verdict={good:true, title:'CLEAN BURN', body:`${def.name||eng} ran nominally — but the stand has taught this engine all it can (${STATIC_HERITAGE_CAP}/${STATIC_HERITAGE_CAP} ground credits). Further heritage must be earned in flight.`};
    }
    log('ok',`🔥 Static fire: ${def.name||eng} — clean burn.`);
  } else {
    state.staticFixBonus=STATIC_FIX_BONUS; // consumed by the next launch
    verdict={good:false, title:'ANOMALY FOUND', body:`Combustion instability traced to a fuel-rich startup transient — exactly the kind of fault that ends missions. Fixed on the stand: the next launch flies with +${Math.round(STATIC_FIX_BONUS*100)}% reliability.`};
    log('note',`🔥 Static fire: ${def.name||eng} — anomaly found and FIXED on the ground. Next launch +${Math.round(STATIC_FIX_BONUS*100)}% reliability.`);
  }
  if(!animEnabled){ render(); return verdict; }
  showStaticFireModal(def, verdict);
  return verdict;
}
function showStaticFireModal(def, verdict){
  showModal(`<div style="text-align:center">
    <h2 style="margin-bottom:2px">🔥 Static fire — ${def.name||'first stage'}</h2>
    <div class="dim" style="font-family:var(--mono);font-size:12px;margin-bottom:10px">${def.prop||''} · hold-down test, full duration</div>
    <svg id="sfGauge" viewBox="0 0 220 130" width="220" height="130" style="display:block;margin:0 auto">
      <path d="M 20 115 A 90 90 0 0 1 200 115" fill="none" stroke="#22303c" stroke-width="10" stroke-linecap="round"/>
      <path id="sfArc" d="M 20 115 A 90 90 0 0 1 200 115" fill="none" stroke="var(--ignite)" stroke-width="10" stroke-linecap="round" stroke-dasharray="283" stroke-dashoffset="283"/>
      <line id="sfNeedle" x1="110" y1="115" x2="30" y2="112" stroke="#e8e2d6" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="110" cy="115" r="5" fill="#e8e2d6"/>
      <text x="110" y="86" text-anchor="middle" fill="#8b98a5" font-size="11" font-family="ui-monospace,monospace">CHAMBER PRESSURE</text>
    </svg>
    <div id="sfVerdict" style="min-height:64px;font-size:13px;margin:8px 0"></div>
    <button id="sfClose" class="btn launch" onclick="hideModal();render()" style="visibility:hidden">Back to the bench ▸</button>
  </div>`);
  sfxRumbleStart();
  const t0=performance.now(), DUR=2300;
  const needle=$('sfNeedle'), arc=$('sfArc');
  (function sweep(){
    const u=Math.min(1,(performance.now()-t0)/DUR);
    const jitter=u>0.15&&u<0.95 ? (Math.random()-0.5)*0.06 : 0;
    const p=Math.min(1, u*1.12)+jitter;
    const ang=Math.PI*(1-Math.max(0,Math.min(1,p)));           // sweep left→right
    if(needle){ needle.setAttribute('x2',110+Math.cos(ang)*80); needle.setAttribute('y2',115-Math.sin(ang)*80); }
    if(arc) arc.setAttribute('stroke-dashoffset', 283*(1-Math.max(0,Math.min(1,p))));
    if(u<1){ requestAnimationFrame(sweep); return; }
    sfxRumbleStop(); sfxChime(verdict.good);
    const v=$('sfVerdict');
    if(v) v.innerHTML=`<div style="font-family:var(--mono);letter-spacing:.25em;font-size:13px;color:${verdict.good?'var(--ok)':'var(--warn)'};margin-bottom:5px">${verdict.title}</div><div class="muted" style="font-size:12px;line-height:1.5">${verdict.body}</div>`;
    const b=$('sfClose'); if(b) b.style.visibility='visible';
  })();
}

/* ---------- Phase 2: bench SFX (grafted onto the existing flight audio context) ----------
   Small procedural UI sounds for the workshop: tick (drag detents), thunk (part add/remove),
   chime (test verdicts), rumble (static fire). Uses the SAME AudioContext as launch audio
   (sfxCtx via sfxInit) — no second context — but routes straight to destination because
   sfxMaster's gain belongs to the flight mixer. state.sfxMute silences the bench layer. */
function benchAc(){ if(state.sfxMute) return null; try{ sfxInit(); return sfxCtx; }catch(e){ return null; } }
let _lastTick=0;
function sfxTick(){ const ac=benchAc(); if(!ac) return; const t=ac.currentTime; if(t-_lastTick<0.045) return; _lastTick=t;
  const o=ac.createOscillator(), g=ac.createGain();
  o.type='square'; o.frequency.value=1800+Math.random()*300; g.gain.setValueAtTime(0.012,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.03);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t+0.035); }
function sfxThunk(){ const ac=benchAc(); if(!ac) return; const t=ac.currentTime;
  const o=ac.createOscillator(), g=ac.createGain();
  o.type='sine'; o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(52,t+0.10);
  g.gain.setValueAtTime(0.10,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.16);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t+0.18);
  const nb=sfxGetBuf('bench_click',0.05,(d)=>{ for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length); });
  if(nb){ const n=ac.createBufferSource(); n.buffer=nb; const ng=ac.createGain(); ng.gain.value=0.04; n.connect(ng).connect(ac.destination); n.start(t); } }
function sfxChime(good){ const ac=benchAc(); if(!ac) return; const t=ac.currentTime;
  (good?[523,659,784]:[392,330]).forEach((f,i)=>{ const o=ac.createOscillator(), g=ac.createGain();
    o.type='sine'; o.frequency.value=f; const at=t+i*0.09;
    g.gain.setValueAtTime(0.0001,at); g.gain.linearRampToValueAtTime(0.05,at+0.02); g.gain.exponentialRampToValueAtTime(0.0001,at+0.5);
    o.connect(g).connect(ac.destination); o.start(at); o.stop(at+0.55); }); }
let _benchRumble=null;
function sfxRumbleStart(){ const ac=benchAc(); if(!ac||_benchRumble) return;
  const nb=sfxNoiseBuf('brown'); if(!nb) return;
  const n=ac.createBufferSource(); n.buffer=nb; n.loop=true;
  const f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=90; f.Q.value=0.8;
  const g=ac.createGain(); g.gain.setValueAtTime(0.0001,ac.currentTime); g.gain.linearRampToValueAtTime(0.35,ac.currentTime+0.5);
  n.connect(f).connect(g).connect(ac.destination); n.start();
  _benchRumble={n,g}; }
function sfxRumbleStop(){ if(!_benchRumble||!sfxCtx) return; try{ _benchRumble.g.gain.linearRampToValueAtTime(0.0001,sfxCtx.currentTime+0.45); const r=_benchRumble; setTimeout(()=>{ try{r.n.stop();}catch(e){} },600); }catch(e){} _benchRumble=null; }
function toggleSfx(){ state.sfxMute=!state.sfxMute; if(state.sfxMute) sfxRumbleStop(); render(); }

/* ---------- Phase 1: the rocket IS the bench (direct manipulation) ----------
   Click a stage on the rocket → its card opens, scrolls into view and flashes; the segment
   gets a selection ring. Drag a stage vertically → propellant stretches under your cursor
   with a live floating Δv/prop readout. Click the nose → crew card; boosters → booster card;
   transfer segment → transfer card. Selection also flows the other way from the cards. */
let benchSelStage=-1;   // -1 none · 0..2 stage index · 'transfer' | 'nose' | 'boosters'
function benchSelectStage(sel, fromRocket){
  state._benchTouched=true; // affordance hint no longer needed
  benchSelStage = (benchSelStage===sel && !fromRocket) ? -1 : sel;
  if(typeof sel==='number' && collapsedStages[sel]){ collapsedStages[sel]=false; }
  render();
  // scroll + flash the matching card so the eye lands where the hand pointed
  let el=null;
  if(typeof sel==='number') el=document.querySelectorAll('#stages .stage-card')[sel];
  else if(sel==='transfer') el=$('transferCard'); else if(sel==='nose') el=$('crewCard'); else if(sel==='boosters') el=$('boostersCard');
  if(el){ try{ el.scrollIntoView({behavior:'smooth', block:'nearest'}); }catch(e){}
    el.classList.remove('stage-flash'); void el.offsetWidth; el.classList.add('stage-flash'); }
  if(vehScene && vehScene.redraw) vehScene.redraw();
}
// Light-touch prop update during a drag: state + preview only; the full bench re-render
// happens once on pointer-up. Keeps 60fps while the tank stretches under the cursor.
function benchDragProp(i, factor){
  const st=state.stages[i]; if(!st) return null;
  st.prop=Math.round(clampA(st.prop*factor, 0.1, 800)*10)/10;
  let v=null; try{ v=computeVehicle(); }catch(e){}
  if(vehScene){ vehPending=currentVehicleSpec(); vehScene.redraw(); }
  return v;
}

/* ---------- Hybrid Phaser layer (Slice 2): VehiclePreviewScene ----------
   The bench silhouette in a Phaser scene: the proven 2D drawing on a CanvasTexture
   (redrawn live as you tune the vehicle) over ambient stars, with a soft engine-base
   glow and a gentle idle bob. Guarded + lazy; falls back to the 2D canvas. */
const VEH_W=480, VEH_H=720; // 2× internal res (displayed at ~240×360) so fine rocket detail stays crisp
let VehScene=null, vehGame=null, vehScene=null, vehPending=null;
function defineVehScene(){
  if(VehScene || !phaserOK()) return;
  VehScene=class extends Phaser.Scene {
    constructor(){ super('vehprev'); }
    create(){
      const W=VEH_W, H=VEH_H;
      const mk=(key,draw,w,h)=>{ if(!this.textures.exists(key)){ const g=this.make.graphics({x:0,y:0,add:false}); draw(g); g.generateTexture(key,w,h); g.destroy(); } };
      mk('vehStar',g=>{ g.fillStyle(0xffffff,1); g.fillCircle(2,2,2); },4,4);
      mk('vehGlow',g=>{ for(let i=10;i>=1;i--){ g.fillStyle(0xffffff,0.05); g.fillCircle(32,32,i*3); } },64,64);
      // Blueprint background: the Phaser canvas is opaque (transparent:false, below), so it paints
      // over the CSS .bench-rocket blueprint background entirely — draw the same navy + faint white
      // grid IN the scene itself so the "actual background behind the vehicle" matches, not just the
      // card's margins around the canvas. Internal res is 2× display size, so grid spacing is doubled
      // (20px/100px here → 10px/50px once the canvas is CSS-scaled down to its displayed size).
      this.cameras.main.setBackgroundColor('#0b2545');
      const grid=this.add.graphics();
      grid.lineStyle(1, 0xffffff, 0.05); grid.beginPath();
      for(let x=0;x<=VEH_W;x+=20){ grid.moveTo(x,0); grid.lineTo(x,VEH_H); }
      for(let y=0;y<=VEH_H;y+=20){ grid.moveTo(0,y); grid.lineTo(VEH_W,y); }
      grid.strokePath();
      grid.lineStyle(1, 0xffffff, 0.11); grid.beginPath();
      for(let x=0;x<=VEH_W;x+=100){ grid.moveTo(x,0); grid.lineTo(x,VEH_H); }
      for(let y=0;y<=VEH_H;y+=100){ grid.moveTo(0,y); grid.lineTo(VEH_W,y); }
      grid.strokePath();
      for(let i=0;i<46;i++){ const s=this.add.image(Math.random()*W, Math.random()*H, 'vehStar').setAlpha(0.12+Math.random()*0.5).setScale(0.4+Math.random()*0.9);
        this.tweens.add({targets:s, alpha:Math.random()*0.2, duration:900+Math.random()*2200, yoyo:true, repeat:-1, ease:'Sine.easeInOut'}); }
      this.tex=this.textures.exists('vehTex')?this.textures.get('vehTex'):this.textures.createCanvas('vehTex',W,H);
      this.glow=this.add.image(W/2, H-26, 'vehGlow').setTint(0xffb060).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4).setAlpha(0.5);
      this.tweens.add({targets:this.glow, alpha:0.75, scale:1.7, duration:1800, yoyo:true, repeat:-1, ease:'Sine.easeInOut'});
      // NOTE: no idle bob any more — an interactive surface must hold still under the cursor.
      this.img=this.add.image(W/2, H/2, 'vehTex').setOrigin(0.5,0.5);
      this.selG=this.add.graphics();           // selection ring + separation lines
      this.ann=[];                              // per-stage Δv/TWR labels
      this.dragLabel=this.add.text(0,0,'',{fontFamily:'ui-monospace,monospace',fontSize:'15px',color:themeColor('ignite'),backgroundColor:'#0b2545cc',padding:{x:6,y:3}}).setDepth(10).setVisible(false);
      // --- direct manipulation ---
      this._drag=null;
      const zoneAt=(x,y)=>{ if(!this._layout) return null;
        // prefer stage/transfer bodies, then nose, then boosters
        const zs=this._layout.zones;
        return zs.find(z=>z.kind==='stage'&&x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)
            || zs.find(z=>(z.kind==='transfer'||z.kind==='nose'||z.kind==='boosters')&&x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h) || null; };
      this.input.on('pointermove',p=>{
        if(this._drag){
          const dy=p.y-this._drag.ly; this._drag.ly=p.y;
          // 1px of drag ≈ 0.8% propellant; up = stretch, down = shrink
          const v=benchDragProp(this._drag.seg, Math.pow(0.992, dy));
          this._drag.moved=true;
          const st=state.stages[this._drag.seg];
          const dvTot=v?fI(v.totalDv):'—';
          this.dragLabel.setText(`S${this._drag.seg+1} prop ${st.prop.toFixed(1)} t  ·  Δv ${dvTot} m/s`).setPosition(Math.min(p.x+14,VEH_W-190), p.y-10).setVisible(true);
          try{ sfxTick&&sfxTick(); }catch(e){}
          return;
        }
        const z=zoneAt(p.x,p.y);
        this.game.canvas.style.cursor = z ? (z.kind==='stage'?'ns-resize':'pointer') : 'default';
      });
      this.input.on('pointerdown',p=>{
        const z=zoneAt(p.x,p.y); if(!z) return;
        if(z.kind==='stage'){ this._drag={seg:z.seg, ly:p.y, moved:false}; }
        else { benchSelectStage(z.kind, true); }
      });
      const endDrag=()=>{ if(!this._drag) return;
        const wasClick=!this._drag.moved, seg=this._drag.seg;
        this._drag=null; this.dragLabel.setVisible(false);
        if(wasClick) benchSelectStage(seg, true); else render(); };
      this.input.on('pointerup',endDrag);
      this.input.on('pointerupoutside',endDrag);
      vehScene=this;
      this.redraw();
    }
    redraw(){
      if(vehPending) this._spec=vehPending; vehPending=null;
      if(!this._spec || !this.tex) return;
      try{ drawVehiclePreviewTo(this.tex.context, this.tex.canvas.width, this.tex.canvas.height, this._spec); this.tex.refresh(); }catch(e){}
      try{ this._layout=vehPreviewLayout(this._spec, VEH_W, VEH_H); this.drawOverlays(); }catch(e){}
    }
    // Selection ring, staging separation lines, and per-stage Δv/TWR annotations ON the rocket.
    drawOverlays(){
      const g=this.selG; if(!g) return; g.clear();
      this.ann.forEach(t=>t.destroy()); this.ann=[];
      const L=this._layout; if(!L) return;
      let cv=null; try{ cv=computeVehicle(); }catch(e){}
      const stages=L.zones.filter(z=>z.kind==='stage');
      stages.forEach((z,i)=>{
        // separation line between stages: dashed, faint
        if(i>0){ g.lineStyle(1,themeColorNum('dim'),0.55); for(let x=z.cx-z.halfW-14;x<z.cx+z.halfW+8;x+=7){ g.beginPath(); g.moveTo(x,z.bot); g.lineTo(x+4,z.bot); g.strokePath(); } }
        // annotation: Δv + TWR at ignition, tucked to the right of the segment
        const dv=cv&&cv.stageDv&&cv.stageDv[i]!=null?fI(cv.stageDv[i]):'—';
        const twr=cv&&cv.stageTwr&&cv.stageTwr[i]!=null?cv.stageTwr[i].toFixed(2):'—';
        const loss=cv&&cv.stageGravLoss&&cv.stageGravLoss[i]||0;
        const col=loss<=0?themeColor('ok'):(loss>250?themeColor('bad'):themeColor('warn'));
        const t=this.add.text(z.cx+z.halfW+10, (z.top+z.bot)/2, `S${i+1}  Δv ${dv}
     TWR ${twr}`, {fontFamily:'ui-monospace,monospace', fontSize:'13px', color:col, lineSpacing:2}).setOrigin(0,0.5).setAlpha(0.92);
        this.ann.push(t);
      });
      // selection ring
      const sel = typeof benchSelStage==='number' && benchSelStage>=0 ? stages[benchSelStage]
                : benchSelStage==='transfer' ? L.zones.find(z=>z.kind==='transfer')
                : benchSelStage==='nose' ? L.zones.find(z=>z.kind==='nose') : null;
      if(sel){ g.lineStyle(2,themeColorNum('ignite'),0.95); g.strokeRoundedRect(sel.x-2, sel.y-2, sel.w+4, sel.h+4, 5); }
      // affordance hint the first few times (until any selection has happened)
      if(benchSelStage===-1 && !state._benchTouched && stages[0]){
        const t=this.add.text(stages[0].cx, stages[0].bot+16, 'click a stage · drag to stretch tanks', {fontFamily:'ui-monospace,monospace', fontSize:'12px', color:themeColor('muted')}).setOrigin(0.5,0).setAlpha(0.8);
        this.ann.push(t);
      }
    }
  };
}
function ensureVehHost(){
  const host=$('vehHost'); if(!host) return false;
  host.style.display='block';
  const cv=$('vehiclePreview'); if(cv) cv.style.display='none';
  return true;
}
function startVehPreview(spec){
  defineVehScene();
  if(!ensureVehHost()) return false;
  try{
    vehPending=spec;
    if(!vehGame){
      vehGame=new Phaser.Game({ type:Phaser.AUTO, parent:'vehHost', width:VEH_W, height:VEH_H,
        transparent:false, banner:false, audio:{noAudio:true}, scale:{mode:Phaser.Scale.NONE}, scene:[VehScene] });
      const c=vehGame.canvas; if(c){ c.style.width='100%'; c.style.height='auto'; c.style.display='block'; c.style.borderRadius='8px'; }
    } else { resumeVehGame(); if(vehScene && vehScene.redraw) vehScene.redraw(); }
    return true;
  }catch(e){ console.warn('vehicle preview scene failed, using fallback:',e);
    const h=$('vehHost'); if(h) h.style.display='none';
    const cv=$('vehiclePreview'); if(cv) cv.style.display='block';
    return false;
  }
}
function pauseVehGame(){ if(vehGame){ try{ if(vehGame.scene.isActive('vehprev')) vehGame.scene.sleep('vehprev'); }catch(e){} } } // E0.5-A: sleep, not pause (stop render)
function resumeVehGame(){ if(vehGame){ try{ vehGame.scene.wake('vehprev'); }catch(e){} } }
/* ---------- Vehicle pop-out viewer ----------
   Lifts the bench rocket — and its live Build/Launch button — into a full-screen overlay above
   every layer, with grab-to-pan + wheel-to-zoom for a big look at the design. The rocket is
   redrawn vector-crisp at any zoom (canvas transform, not a stretched bitmap). Enter/Esc closes
   it and returns the button to its place on the bench card. */
let vehPopoutOpen=false, vpZoom=1, vpPanX=0, vpPanY=0, _vpLaunchHome=null, _vpEditorHome=null, _vpReadoutHome=null;
function drawVehPopout(){
  const stage=$('vehPopStage'), cv=$('vehPopCanvas'); if(!stage||!cv) return;
  const w=stage.clientWidth, h=stage.clientHeight; if(w<2||h<2) return;
  if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; }
  const ctx=cv.getContext('2d'); if(!ctx) return;
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,w,h);
  ctx.save(); ctx.translate(vpPanX,vpPanY); ctx.scale(vpZoom,vpZoom);
  let spec; try{ spec=currentVehicleSpec(); }catch(e){ ctx.restore(); return; }
  try{ drawVehiclePreviewTo(ctx, w, h, spec); }catch(e){}
  ctx.restore();
}
// User-directed pop-out sizing pass (2026-07-11): every pop-out's default view now fills ~10% more of
// the screen than before. Each pop-out's zoom transform is anchored at its content box's top-left (CSS
// transform-origin, or the canvas-translate order for the canvas-drawn ones) — a naive z>1 default would
// visually drift the content toward the bottom-right corner, so callers pair this with a compensating
// pan offset that keeps the (now-larger) content centered in the same box it used to exactly fill at z=1.
const POPOUT_ZOOM_BOOST=1.1;
function centeredZoomOffset(w,h,z){ return {x:-w*(z-1)/2, y:-h*(z-1)/2}; }
// Shared pop-out fade: every overlay fades in on open and out on close (150ms, matching scene transitions).
function fadeInScrim(ov){ if(!ov) return; ov.style.opacity='0'; requestAnimationFrame(()=>{ if(ov) ov.style.opacity='1'; }); }
function removeScrim(id){ const ov=$(id); if(!ov||!ov.parentNode) return; ov.id=''; ov.style.opacity='0'; setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); },170); }
// only one pop-out is open at a time — opening any closes the rest (they cross-fade)
function closeOtherPopouts(keep){
  if(keep!=='veh' && vehPopoutOpen) closeVehPopout();
  if(keep!=='stn' && stnPopoutOpen) closeStationPopout();
  if(keep!=='map' && mapPopoutOpen) closeMapPopout();
  if(keep!=='earth' && earthPopoutOpen) closeEarthPopout();
  if(keep!=='cc' && ccPopoutOpen) closeCCPopout();
  if(keep!=='contracts' && contractsPopoutOpen) closeContractsPopout();
}
function openVehPopout(){
  if(vehPopoutOpen) return; vehPopoutOpen=true; closeOtherPopouts('veh'); vpZoom=POPOUT_ZOOM_BOOST; vpPanX=0; vpPanY=0;
  let title='Vehicle'; try{ title=(curLivery().name||'').trim() || (curMission()?curMission().name:'Vehicle'); }catch(e){}
  const ov=document.createElement('div'); ov.className='vehpop-scrim'; ov.id='vehPopout';
  ov.innerHTML=`<div class="vehpop-bar">
      <span class="vehpop-title">🚀 ${esc(title)}</span>
      <div class="vehpop-launchhost" id="vehPopLaunchHost"></div>
      <span class="vehpop-hint">drag to pan · scroll to zoom · double-click reset · Esc/Enter to close</span>
      <button class="vehpop-x" onclick="closeVehPopout()">✕ Close</button>
    </div>
    <div class="vehpop-body">
      <aside class="vehpop-stats wide left" id="vehPopEditor"></aside>
      <div class="vehpop-stage" id="vehPopStage"><canvas id="vehPopCanvas"></canvas></div>
      <aside class="vehpop-stats" id="vehPopStats"></aside>
    </div>`;
  document.body.appendChild(ov); fadeInScrim(ov);
  // move the LIVE Build/Launch node into the bar, remembering its home so we can restore it exactly
  const host=$('benchLaunch');
  if(host){ _vpLaunchHome={parent:host.parentNode, next:host.nextSibling}; $('vehPopLaunchHost').appendChild(host); }
  // User-directed (2026-07-11): the pop-out hosts the FULL live Design Bench editor, not a read-only
  // stats summary — move the real editor-tabs subtree LEFT of the rocket and the real readout card
  // RIGHT of it (same ids/handlers, render() keeps populating them wherever they live), so you can
  // manipulate the vehicle on the left and read the mission-fit results on the right while the rocket
  // itself stays visible in the middle. Homes remembered to restore exactly on close.
  const ep=$('benchEditorPanel'); const epHost=$('vehPopEditor');
  if(ep && epHost){ _vpEditorHome={parent:ep.parentNode, next:ep.nextSibling}; epHost.appendChild(ep); }
  const rc=$('readoutCard'); const rcHost=$('vehPopStats');
  if(rc && rcHost){ _vpReadoutHome={parent:rc.parentNode, next:rc.nextSibling}; rcHost.appendChild(rc); }
  initVehPopZoom();
  drawVehPopout();
  window.addEventListener('resize', drawVehPopout);
}
function closeVehPopout(){
  if(!vehPopoutOpen) return; vehPopoutOpen=false;
  window.removeEventListener('resize', drawVehPopout);
  const host=$('benchLaunch');
  if(host && _vpLaunchHome && _vpLaunchHome.parent){ _vpLaunchHome.parent.insertBefore(host, _vpLaunchHome.next); } // back to its bench spot
  _vpLaunchHome=null;
  const rc=$('readoutCard');
  if(rc && _vpReadoutHome && _vpReadoutHome.parent){ _vpReadoutHome.parent.insertBefore(rc, _vpReadoutHome.next); }
  _vpReadoutHome=null;
  const ep=$('benchEditorPanel');
  if(ep && _vpEditorHome && _vpEditorHome.parent){ _vpEditorHome.parent.insertBefore(ep, _vpEditorHome.next); }
  _vpEditorHome=null;
  removeScrim('vehPopout');
}
function initVehPopZoom(){
  const stage=$('vehPopStage'); if(!stage) return;
  let drag=false, lx=0, ly=0;
  stage.addEventListener('wheel',e=>{ e.preventDefault(); const r=stage.getBoundingClientRect(), cx=e.clientX-r.left, cy=e.clientY-r.top, z0=vpZoom;
    vpZoom=Math.min(8,Math.max(0.4, vpZoom*(e.deltaY<0?1.12:0.89)));
    vpPanX=cx-(cx-vpPanX)*(vpZoom/z0); vpPanY=cy-(cy-vpPanY)*(vpZoom/z0); drawVehPopout(); },{passive:false});
  stage.addEventListener('pointerdown',e=>{ drag=true; lx=e.clientX; ly=e.clientY; stage.classList.add('grabbing'); try{stage.setPointerCapture(e.pointerId);}catch(_){}});
  stage.addEventListener('pointermove',e=>{ if(!drag) return; vpPanX+=e.clientX-lx; vpPanY+=e.clientY-ly; lx=e.clientX; ly=e.clientY; drawVehPopout(); });
  const end=()=>{ drag=false; stage.classList.remove('grabbing'); };
  stage.addEventListener('pointerup',end); stage.addEventListener('pointercancel',end);
  const resetCentered=()=>{ vpZoom=POPOUT_ZOOM_BOOST; const r=stage.getBoundingClientRect(), off=centeredZoomOffset(r.width,r.height,vpZoom); vpPanX=off.x; vpPanY=off.y; drawVehPopout(); };
  stage.addEventListener('dblclick', resetCentered);
  resetCentered(); // establishes the boosted, centered default view (called once at open, mirrors initSvgPopZoom)
}
/* ---------- Station pop-out viewer ----------
   Same overlay chrome (reuses the .vehpop-* styles) for the Station Bench: the annotated module
   SVG (vector-crisp at any zoom) with grab-to-pan + wheel-to-zoom via a CSS transform, and the
   module's engineering stats on the right. Enter/Esc closes. */
// Generic SVG pop-out pan/zoom: drag to pan, wheel to zoom toward the cursor, double-click reset.
// Transforms the zoom wrapper (SVG stays vector-crisp). State is a {z,x,y} object owned by the caller.
function initSvgPopZoom(stageId, zoomId, st){
  const stage=$(stageId); if(!stage) return;
  const apply=()=>{ const z=$(zoomId); if(z) z.style.transform=`translate(${st.x}px,${st.y}px) scale(${st.z})`; };
  let down=false, drag=false, lx=0, ly=0, sx=0, sy=0, pid=null;
  stage.addEventListener('wheel',e=>{ e.preventDefault(); const r=stage.getBoundingClientRect(), cx=e.clientX-r.left, cy=e.clientY-r.top, z0=st.z;
    st.z=Math.min(18,Math.max(0.3, st.z*(e.deltaY<0?1.12:0.89)));
    st.x=cx-(cx-st.x)*(st.z/z0); st.y=cy-(cy-st.y)*(st.z/z0); apply(); },{passive:false});
  // Don't capture the pointer on a plain click — only once it's clearly a drag — so clicks reach the SVG
  // bodies' onclick (selectBody). Capturing on pointerdown would redirect the click to the stage.
  stage.addEventListener('pointerdown',e=>{ down=true; drag=false; lx=sx=e.clientX; ly=sy=e.clientY; pid=e.pointerId; });
  stage.addEventListener('pointermove',e=>{ if(!down) return;
    if(!drag){ if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)<5) return; drag=true; stage.classList.add('grabbing'); try{stage.setPointerCapture(pid);}catch(_){} }
    st.x+=e.clientX-lx; st.y+=e.clientY-ly; lx=e.clientX; ly=e.clientY; apply(); });
  const end=()=>{ down=false; drag=false; stage.classList.remove('grabbing'); };
  stage.addEventListener('pointerup',end); stage.addEventListener('pointercancel',end);
  const resetCentered=()=>{ const r=stage.getBoundingClientRect(); st.z=POPOUT_ZOOM_BOOST; const off=centeredZoomOffset(r.width,r.height,st.z); st.x=off.x; st.y=off.y; apply(); };
  stage.addEventListener('dblclick', resetCentered);
  resetCentered(); // establishes the boosted, centered default view (was a bare apply() at z:1)
}
let stnPopoutOpen=false, stnPop={z:1,x:0,y:0};
function stnPopStatsHTML(v){ return v.isDraft ? stationDraftStatsHTML(stationDraftFs()) : renderStationFacilityStats(v.built, v.cur); }
function openStationPopout(){
  if(stnPopoutOpen) return; stnPopoutOpen=true; closeOtherPopouts('stn'); stnPop={z:1,x:0,y:0};
  const v=stationCurrentView();
  const title = v.isDraft ? 'Station — Blueprint' : v.cur.def.name;
  const ov=document.createElement('div'); ov.className='vehpop-scrim'; ov.id='stnPopout';
  ov.innerHTML=`<div class="vehpop-bar">
      <span class="vehpop-title" id="stnPopTitle">⬡ ${esc(title)}</span>
      <span class="vehpop-hint">drag to pan · scroll to zoom · double-click reset · Esc/Enter to close</span>
      <button class="vehpop-x" onclick="closeStationPopout()">✕ Close</button>
    </div>
    <div class="vehpop-body">
      <div class="vehpop-stage" id="stnPopStage"><div id="stnPopZoom" style="position:absolute;inset:0;transform-origin:0 0;display:flex;align-items:center;justify-content:center">${renderStationStackSVG(900,560,v.cur)}</div></div>
      <aside class="vehpop-stats" id="stnPopStats"></aside>
    </div>`;
  document.body.appendChild(ov); fadeInScrim(ov);
  const sp=$('stnPopStats'); if(sp) sp.innerHTML=stnPopStatsHTML(v);
  initSvgPopZoom('stnPopStage','stnPopZoom',stnPop);
}
function closeStationPopout(){ if(!stnPopoutOpen) return; stnPopoutOpen=false; removeScrim('stnPopout'); }
// Keeps the pop-out in sync when the focused facility changes elsewhere (setStationFocus) — a no-op
// if the pop-out isn't open. The stack SVG lives inside #stnPopZoom (the pan/zoom transform target),
// not #stnPopStage itself, so this only replaces the art, never disturbing the current pan/zoom state.
function refreshStationPopout(){
  if(!stnPopoutOpen) return;
  const v=stationCurrentView();
  const t=$('stnPopTitle'); if(t) t.textContent='⬡ '+(v.isDraft?'Station — Blueprint':v.cur.def.name);
  const z=$('stnPopZoom'); if(z) z.innerHTML=renderStationStackSVG(900,560,v.cur);
  const sp=$('stnPopStats'); if(sp) sp.innerHTML=stnPopStatsHTML(v);
}
/* ---------- Solar System pop-out viewer ----------
   Same overlay chrome: the interactive system map (clickable bodies, vector-crisp) on the left with
   grab-to-pan + wheel-to-zoom, and the selected body's Δv profile + mission planning on the right.
   Opens defaulted to Earth. Clicking a body re-selects it (selectBody → refreshMapPopout). */
let mapPopoutOpen=false, mapPop={z:1,x:0,y:0};
function refreshMapPopout(){
  const z=$('mapPopZoom'); if(z) z.innerHTML=renderMapOverview(900,900);
  const inf=$('mapPopInfo'); if(inf) inf.innerHTML=bodyCardHTML();
}
function openMapPopout(){
  if(mapPopoutOpen) return; mapPopoutOpen=true; closeOtherPopouts('map'); mapPop={z:1,x:0,y:0};
  state.selectedBody='earth'; state.mapZoom=null; // default selection on Earth, full-system view
  const ov=document.createElement('div'); ov.className='vehpop-scrim'; ov.id='mapPopout';
  ov.innerHTML=`<div class="vehpop-bar">
      <span class="vehpop-title">🪐 Solar System</span>
      <span class="vehpop-hint">click a body to select · drag to pan · scroll to zoom · double-click reset · Esc/Enter to close</span>
      <button class="vehpop-x" onclick="closeMapPopout()">✕ Close</button>
    </div>
    <div class="vehpop-body">
      <div class="vehpop-stage" id="mapPopStage"><div id="mapPopZoom" style="position:absolute;inset:0;transform-origin:0 0;display:flex;align-items:center;justify-content:center"></div></div>
      <aside class="vehpop-stats" id="mapPopInfo"></aside>
    </div>`;
  document.body.appendChild(ov); fadeInScrim(ov);
  refreshMapPopout();
  initSvgPopZoom('mapPopStage','mapPopZoom',mapPop);
}
function closeMapPopout(){ if(!mapPopoutOpen) return; mapPopoutOpen=false; removeScrim('mapPopout'); }
/* ---------- Live Earth pop-out ----------
   A dedicated, animated globe: a rotating surface (coarse but recognisable continents over ocean) with a
   moving day/night terminator, on its own full-screen overlay with grab-pan/wheel-zoom. drawEarthOrbits()
   is the seam where stations, LEO satellites, and fuel depots will be drawn from game state later. */
const _DEG=Math.PI/180;
// Continent outlines as [lon,lat] rings (degrees) — hand-simplified but recognisable (Florida, Baja,
// the Brazil bulge, the Horn of Africa, the Indian subcontinent, Scandinavia, etc.). Not cartographic.
const EARTH_LANDS=[
  // North America — Alaska, arctic, Hudson Bay notch, east coast, Florida, Gulf, Central America, Pacific
  [[-166,68],[-160,71],[-140,70],[-128,70],[-110,69],[-95,70],[-90,72],[-82,73],[-78,67],[-80,62],[-71,60],[-64,60],[-56,53],[-55,47],[-65,45],[-70,42],[-74,40],[-76,36],[-81,31],[-80,27],[-80,25],[-83,29],[-88,30],[-92,29],[-95,29],[-97,26],[-95,22],[-95,18],[-88,15],[-83,9],[-87,13],[-95,16],[-104,19],[-110,23],[-114,29],[-117,33],[-121,35],[-123,38],[-124,42],[-124,47],[-126,50],[-131,54],[-138,58],[-146,60],[-152,59],[-158,56],[-162,58]],
  // South America — Caribbean, Brazil bulge, Río de la Plata, Patagonia tip, Andes coast
  [[-78,8],[-72,11],[-64,10],[-60,5],[-50,0],[-44,-2],[-38,-6],[-37,-9],[-39,-13],[-41,-18],[-44,-23],[-48,-26],[-54,-34],[-58,-38],[-63,-41],[-66,-45],[-69,-52],[-74,-52],[-73,-45],[-72,-40],[-71,-33],[-71,-24],[-75,-15],[-79,-8],[-81,-4],[-80,2]],
  // Africa — Senegal, Maghreb, Nile, Horn of Africa, Mozambique, Cape, Gulf of Guinea
  [[-16,15],[-17,21],[-13,26],[-9,30],[-5,35],[0,36],[10,37],[16,33],[24,32],[32,31],[34,27],[36,22],[38,18],[40,15],[43,12],[48,12],[51,11],[49,5],[44,2],[41,-4],[40,-11],[35,-18],[33,-25],[27,-33],[20,-35],[16,-29],[13,-22],[12,-17],[10,-5],[9,2],[5,5],[-4,5],[-8,4],[-13,9]],
  // Europe — Iberia, France, Scandinavia, Baltic, Italy boot, Balkans, Greece
  [[-10,37],[-9,43],[-4,44],[0,49],[2,51],[-2,52],[2,54],[8,54],[8,57],[6,58],[5,61],[8,63],[14,67],[20,70],[26,71],[30,67],[28,61],[24,57],[20,55],[14,54],[12,55],[10,50],[13,46],[18,42],[16,40],[19,40],[24,40],[23,37],[15,40],[12,38],[6,40],[0,41],[-4,37]],
  // Asia — Urals, Siberia, Kamchatka, China coast, SE Asia, India, Arabia, Anatolia, Caspian
  [[30,67],[45,66],[60,69],[73,72],[90,76],[105,77],[125,74],[140,73],[155,71],[168,69],[171,66],[162,61],[160,58],[155,56],[145,57],[138,54],[140,51],[135,44],[130,42],[127,39],[122,40],[121,37],[122,31],[118,24],[110,21],[106,16],[108,11],[105,9],[101,7],[100,13],[97,16],[94,18],[92,21],[88,22],[84,19],[80,13],[77,8],[73,16],[71,21],[67,24],[62,25],[57,25],[57,22],[54,18],[52,15],[45,13],[43,16],[40,22],[35,30],[36,36],[40,39],[46,40],[50,44],[48,48],[52,53],[58,55],[56,62],[48,64],[38,66]],
  // Australia
  [[114,-22],[122,-18],[126,-14],[131,-12],[137,-12],[140,-17],[143,-12],[146,-18],[149,-21],[153,-26],[151,-32],[148,-37],[143,-39],[139,-37],[137,-35],[132,-32],[126,-32],[123,-34],[118,-35],[115,-33],[114,-28]],
  // Greenland
  [[-45,60],[-42,64],[-32,68],[-24,71],[-19,74],[-22,77],[-30,81],[-42,83],[-55,82],[-60,77],[-53,72],[-50,68],[-48,64]],
  // Britain & Ireland, Japan, Madagascar, New Zealand, Indonesia (Sumatra/Java/Borneo)
  [[-8,51],[-5,50],[-2,53],[-3,57],[-6,58],[-7,55],[-10,54],[-9,52]],
  [[133,34],[136,35],[138,37],[141,40],[143,43],[141,39],[138,36],[135,34]],
  [[44,-16],[49,-13],[50,-20],[47,-25],[44,-22]],
  [[167,-46],[171,-44],[174,-41],[178,-38],[176,-41],[173,-43],[170,-46]],
  [[95,5],[100,1],[105,-6],[114,-8],[119,-9],[123,-4],[117,-2],[110,-7],[103,0],[98,3]],
];
function drawEarthOrbits(ctx,cx,cy,R,t){
  // SEAM — orbital infrastructure (stations, LEO satellites, fuel depots) will render here from state.
  ctx.save();
  ctx.strokeStyle='rgba(180,210,240,0.16)'; ctx.setLineDash([4,7]); ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(cx,cy,R*1.24,R*0.42,0,0,7); ctx.stroke(); // inclined LEO ring (placeholder)
  ctx.setLineDash([]);
  for(let i=0;i<5;i++){ const a=t*0.35+i*1.2566, x=cx+Math.cos(a)*R*1.24, y=cy+Math.sin(a)*R*0.42;
    ctx.fillStyle='rgba(220,235,250,0.85)'; ctx.fillRect(x-1.4,y-1.4,2.8,2.8); }
  ctx.restore();
}
function drawEarthGlobe(ctx,cx,cy,R,center,sunLon,tilt){
  const T=(tilt==null?0.33:tilt), cosT=Math.cos(T), sinT=Math.sin(T); // axial tilt (oscillates so both poles come into view)
  // Orthographic projection of the hemisphere centred on longitude `center`. East → screen +x (right),
  // north → screen +y (up); a point is front-facing when depth z ≥ 0 (within 90° of the centre meridian).
  const P=(lon,lat)=>{ const la=lat*_DEG, dlo=(lon-center)*_DEG; let x=Math.cos(la)*Math.sin(dlo), y=Math.sin(la), z=Math.cos(la)*Math.cos(dlo);
    const y2=y*cosT - z*sinT, z2=y*sinT + z*cosT; return {x, y:y2, z:z2}; };
  // ocean
  const og=ctx.createRadialGradient(cx-R*0.35,cy-R*0.35,R*0.1,cx,cy,R);
  og.addColorStop(0,'#2f7fc0'); og.addColorStop(0.6,'#1d5a96'); og.addColorStop(1,'#0c2c4e');
  ctx.fillStyle=og; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fill();
  // continents (clipped to the disc; back-facing vertices clamp to the limb)
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.clip();
  for(const poly of EARTH_LANDS){
    const pts=poly.map(([lon,lat])=>P(lon,lat)); if(!pts.some(p=>p.z>=0)) continue;
    ctx.beginPath();
    pts.forEach((p,i)=>{ let sx,sy; if(p.z>=0){ sx=cx+p.x*R; sy=cy-p.y*R; } else { const m=Math.hypot(p.x,p.y)||1e-6; sx=cx+p.x/m*R; sy=cy-p.y/m*R; } i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy); });
    ctx.closePath(); ctx.fillStyle='#3f8a44'; ctx.fill();
  }
  // polar ice caps — true spherical caps (Arctic sea ice; Antarctica), shown when that pole faces us
  const drawCap=(lat,fill)=>{ ctx.beginPath(); for(let i=0;i<=36;i++){ const p=P(i*10, lat+Math.sin(i*0.9)*2.2); let sx,sy; if(p.z>=0){ sx=cx+p.x*R; sy=cy-p.y*R; } else { const m=Math.hypot(p.x,p.y)||1e-6; sx=cx+p.x/m*R; sy=cy-p.y/m*R; } i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy); } ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); };
  if(P(0,90).z>0.12) drawCap(74,'rgba(240,247,255,0.93)');    // Arctic sea ice
  if(P(0,-90).z>0.12) drawCap(-68,'rgba(232,240,250,0.96)');  // Antarctica
  ctx.restore();
  // day/night terminator — radial darkening from the sub-solar point (drifts as the sun longitude advances)
  const su=P(sunLon, 8); const ssx=cx+su.x*R, ssy=cy-su.y*R;
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.clip();
  const ng=ctx.createRadialGradient(ssx,ssy,R*0.1, ssx,ssy,R*2.3);
  ng.addColorStop(0,'rgba(4,8,20,0)'); ng.addColorStop(0.52,'rgba(4,8,20,0)'); ng.addColorStop(0.74,'rgba(3,6,16,0.72)'); ng.addColorStop(1,'rgba(2,4,12,0.9)');
  ctx.fillStyle=ng; ctx.fillRect(cx-R,cy-R,2*R,2*R);
  const hg=ctx.createRadialGradient(ssx,ssy,0, ssx,ssy,R*0.95); hg.addColorStop(0,'rgba(255,250,235,0.16)'); hg.addColorStop(1,'rgba(255,250,235,0)');
  ctx.fillStyle=hg; ctx.fillRect(cx-R,cy-R,2*R,2*R);
  ctx.restore();
  // atmosphere rim
  ctx.lineWidth=Math.max(2,R*0.05); ctx.strokeStyle='rgba(120,180,255,0.35)'; ctx.beginPath(); ctx.arc(cx,cy,R+R*0.012,0,7); ctx.stroke();
  ctx.lineWidth=Math.max(4,R*0.12); ctx.strokeStyle='rgba(90,150,235,0.10)'; ctx.beginPath(); ctx.arc(cx,cy,R+R*0.06,0,7); ctx.stroke();
  // Cape Canaveral marker (28.4°N, 80.6°W) — clickable hot-spot that jumps to Mission Control
  const cape=P(-80.6,28.4);
  if(cape.z>=0.04){
    const mx=cx+cape.x*R, my=cy-cape.y*R, mr=Math.max(3.4,R*0.026);
    const pulse=0.5+0.5*Math.sin((typeof ccNow==='function'?ccNow():Date.now())/280);
    ctx.save();
    ctx.beginPath(); ctx.arc(mx,my,mr*(1.8+pulse*0.9),0,7); ctx.fillStyle=`rgba(255,196,72,${0.20+pulse*0.18})`; ctx.fill();
    ctx.beginPath(); ctx.arc(mx,my,mr,0,7); ctx.fillStyle='#ffcb45'; ctx.fill();
    ctx.lineWidth=Math.max(1,R*0.006); ctx.strokeStyle='#7a4a06'; ctx.stroke();
    ctx.font=`600 ${Math.max(10,R*0.055)}px system-ui,sans-serif`; ctx.textBaseline='middle';
    const lx=mx+mr*2.0; ctx.fillStyle='rgba(8,12,22,0.6)';
    const lbl='Cape Canaveral', tw=ctx.measureText(lbl).width;
    ctx.fillRect(lx-3,my-Math.max(7,R*0.05),tw+6,Math.max(14,R*0.1));
    ctx.fillStyle='#ffe6a6'; ctx.fillText(lbl,lx,my+1);
    ctx.restore();
    _capeLocal={x:mx,y:my,r:mr,visible:true};
  } else _capeLocal={visible:false};
  drawEarthOrbits(ctx,cx,cy,R,center*_DEG);
}
let _capeLocal={visible:false};
function earthPopInfoHTML(){
  return `<h4>Home World</h4>
    <div class="dim" style="font-size:12px;margin-bottom:6px">Live globe — <b>drag to spin</b> it east/west; <b>Auto-spin</b> toggles the idle rotation. The 🟡 marker is <b>Cape Canaveral</b> — click it to jump to Mission Control. Orbital infrastructure (stations, LEO satellites, fuel depots) will be represented in orbit here as it's built. <b>(Preview)</b></div>
    <button class="btn" style="width:100%;margin-bottom:8px" onclick="earthGoToCape()">🟡 Go to Cape Canaveral — Mission Control</button>
    ${bodyCardHTML()}`;
}
let earthPopoutOpen=false, earthAnim=null, earthT0=0, earthPop={z:1,x:0,y:0};
// Manual-spin view: `lon` is the centre meridian (driven by drag, or auto-advanced when `auto`).
let earthView={lon:-80,auto:true}, earthLastT=0, earthCapeHit={visible:false};
function earthLoop(){
  if(!earthPopoutOpen){ earthAnim=null; return; }
  const cv=$('earthPopCanvas'), stage=$('earthPopStage');
  if(cv&&stage){ const w=stage.clientWidth, h=stage.clientHeight;
    if(w>1&&h>1){ if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; }
      const ctx=cv.getContext('2d');
      if(ctx){ const now=ccNow(), t=(now-earthT0)/1000;
        let dt=(now-(earthLastT||now))/1000; earthLastT=now; if(dt>0.1) dt=0.1;
        if(earthView.auto) earthView.lon += dt*9; // ~9°/s auto-spin when enabled
        ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='#05080f'; ctx.fillRect(0,0,w,h);
        const rnd=mulberry(424242); for(let i=0;i<90;i++){ const x=rnd()*w, y=rnd()*h, tw=0.3+0.5*Math.abs(Math.sin(t*1.1+i)); ctx.fillStyle=`rgba(220,230,255,${(tw*0.5).toFixed(2)})`; ctx.fillRect(x,y,1.1,1.1); }
        const R=Math.min(w,h)*0.30;
        ctx.save(); ctx.translate(w/2+earthPop.x, h/2+earthPop.y); ctx.scale(earthPop.z,earthPop.z);
        drawEarthGlobe(ctx,0,0,R, earthView.lon, t*1.5, 0.2); // drag spins `lon`; sun drifts → terminator sweeps; fixed gentle tilt
        ctx.restore();
        // project the Cape marker into stage coords for hit-testing (globe-local → screen)
        if(_capeLocal && _capeLocal.visible){ earthCapeHit={ x:w/2+earthPop.x+_capeLocal.x*earthPop.z, y:h/2+earthPop.y+_capeLocal.y*earthPop.z, r:_capeLocal.r*earthPop.z, visible:true }; }
        else earthCapeHit={visible:false};
      } } }
  earthAnim=requestAnimationFrame(earthLoop);
}
function openEarthPopout(){
  if(earthPopoutOpen) return;
  closeOtherPopouts('earth');
  earthPopoutOpen=true; earthPop={z:POPOUT_ZOOM_BOOST,x:0,y:0}; earthView={lon:-80,auto:true}; earthLastT=0; earthT0=ccNow(); state.selectedBody='earth';
  const ov=document.createElement('div'); ov.className='vehpop-scrim'; ov.id='earthPopout';
  ov.innerHTML=`<div class="vehpop-bar">
      <span class="vehpop-title">🌍 Earth</span>
      <span class="vehpop-hint">drag to spin · scroll to zoom · click 🟡 Cape Canaveral → Mission Control · Esc/Enter to close</span>
      <button class="vehpop-x" id="earthRotBtn" style="margin-right:8px" onclick="toggleEarthRot()"></button>
      <button class="vehpop-x" onclick="closeEarthPopout()">✕ Close</button>
    </div>
    <div class="vehpop-body">
      <div class="vehpop-stage" id="earthPopStage"><canvas id="earthPopCanvas"></canvas></div>
      <aside class="vehpop-stats" id="earthPopInfo"></aside>
    </div>`;
  document.body.appendChild(ov); fadeInScrim(ov);
  const inf=$('earthPopInfo'); if(inf) inf.innerHTML=earthPopInfoHTML();
  initEarthPopZoom(); updateEarthRotBtn();
  earthAnim=requestAnimationFrame(earthLoop);
}
function toggleEarthRot(){ earthView.auto=!earthView.auto; updateEarthRotBtn(); }
function updateEarthRotBtn(){ const b=$('earthRotBtn'); if(b) b.textContent=earthView.auto?'⏸ Auto-spin: On':'🔄 Auto-spin: Off'; }
function earthGoToCape(){ closeEarthPopout(); setTab('command'); }
function closeEarthPopout(){ if(!earthPopoutOpen) return; earthPopoutOpen=false; if(earthAnim){ cancelAnimationFrame(earthAnim); earthAnim=null; } removeScrim('earthPopout'); }
// Generic canvas pop-out pan/zoom (the RAF loop reads the {z,x,y} state each frame; no redraw call needed).
// Drag only begins past a threshold so clicks can still reach future interactive overlays.
function initCanvasPopZoom(stageId, st){
  const stage=$(stageId); if(!stage) return;
  let down=false, drag=false, lx=0, ly=0, sx=0, sy=0, pid=null;
  stage.addEventListener('wheel',e=>{ e.preventDefault(); const r=stage.getBoundingClientRect(), ox=e.clientX-r.left-r.width/2, oy=e.clientY-r.top-r.height/2, z0=st.z;
    st.z=Math.min(8,Math.max(0.5, st.z*(e.deltaY<0?1.12:0.89)));
    st.x=ox-(ox-st.x)*(st.z/z0); st.y=oy-(oy-st.y)*(st.z/z0); },{passive:false});
  stage.addEventListener('pointerdown',e=>{ down=true; drag=false; lx=sx=e.clientX; ly=sy=e.clientY; pid=e.pointerId; });
  stage.addEventListener('pointermove',e=>{ if(!down) return;
    if(!drag){ if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)<5) return; drag=true; stage.classList.add('grabbing'); try{stage.setPointerCapture(pid);}catch(_){} }
    st.x+=e.clientX-lx; st.y+=e.clientY-ly; lx=e.clientX; ly=e.clientY; });
  const end=()=>{ down=false; drag=false; stage.classList.remove('grabbing'); };
  stage.addEventListener('pointerup',end); stage.addEventListener('pointercancel',end);
  stage.addEventListener('dblclick',()=>{ st.z=1; st.x=0; st.y=0; });
}
// Earth gets a bespoke handler: horizontal drag spins the globe (pausing auto-spin), wheel zooms,
// and a click (no drag) on the Cape Canaveral hot-spot jumps to Mission Control.
function earthOverCape(e){ if(!earthCapeHit||!earthCapeHit.visible) return false; const stage=$('earthPopStage'); if(!stage) return false;
  const r=stage.getBoundingClientRect(); return Math.hypot((e.clientX-r.left)-earthCapeHit.x,(e.clientY-r.top)-earthCapeHit.y) <= Math.max(15,earthCapeHit.r+9); }
function initEarthPopZoom(){
  const stage=$('earthPopStage'); if(!stage) return;
  let down=false, drag=false, sx=0, sy=0, lx=0, pid=null;
  stage.addEventListener('wheel',e=>{ e.preventDefault(); earthPop.z=Math.min(8,Math.max(0.6, earthPop.z*(e.deltaY<0?1.12:0.89))); },{passive:false});
  stage.addEventListener('pointerdown',e=>{ down=true; drag=false; sx=lx=e.clientX; sy=e.clientY; pid=e.pointerId; });
  stage.addEventListener('pointermove',e=>{
    if(!down){ stage.style.cursor=earthOverCape(e)?'pointer':'grab'; return; }
    if(!drag){ if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)<5) return; drag=true; earthView.auto=false; updateEarthRotBtn(); stage.classList.add('grabbing'); try{stage.setPointerCapture(pid);}catch(_){} }
    earthView.lon += (e.clientX-lx)*0.4; lx=e.clientX; });
  const end=e=>{ if(down && !drag && earthOverCape(e)){ earthGoToCape(); } down=false; drag=false; stage.classList.remove('grabbing'); };
  stage.addEventListener('pointerup',end); stage.addEventListener('pointercancel',()=>{down=false;drag=false;stage.classList.remove('grabbing');});
  stage.addEventListener('dblclick',()=>{ earthPop.z=POPOUT_ZOOM_BOOST; earthPop.x=0; earthPop.y=0; }); // already centered — draw loop translates to canvas-center first, then scales
}
/* ---------- Command Center pop-out ----------
   The animated Cape Canaveral scene blown up to full screen (drawn off-screen at native res, then
   blitted with grab-pan/wheel-zoom), with the agency summary on the right — same chrome as the others. */
let ccPopoutOpen=false, ccPopAnim=null, ccPopT0=0, ccPop={z:1,x:0,y:0}, ccPopFrame=0;
function ccPopInfoHTML(){
  let s; try{ s=commandSummary(); }catch(e){ return ''; }
  const row=(l,v,c)=>`<div class="vps-row"><span class="lbl">${l}</span><span class="val"${c?` style="color:${c}"`:''}>${v}</span></div>`;
  return `<h4>${esc(state.company)}</h4>
    <div class="dim" style="font-size:12px;margin-bottom:6px">${dateStr()} · Era ${s.eraIdx}/${s.eraTotal} · ${s.era}</div>
    <h4>Finance</h4>
    ${row('Capital', fM(s.capital))}
    ${row('Monthly net', (s.net>=0?'+':'')+fM(s.net)+'/mo', s.net>=0?'var(--ok)':'var(--bad)')}
    ${row('Income', '+'+fM(s.income))}
    ${row('Overhead', '−'+fM(s.overhead))}
    ${row('Payroll', '−'+fM(s.payroll))}
    <h4>Standing</h4>
    ${row('Reputation', fI(s.rep))}
    ${row('Science', s.science)}
    ${row('Public support', s.support+'%', s.moodColor)}
    ${row('Flights', s.flights+(s.successRate!=null?` · ${s.successRate}%`:''))}
    <h4>Status board</h4>
    ${capeStatusBoardHTML()}
    <div class="dim" style="font-size:12px;margin-top:6px">Cape Canaveral. Click a building in the Command Center scene to drill in.</div>`;
}
// A compact status board mirroring the Cape glyphs — attention items first.
function capeStatusBoardHTML(){
  const order={attention:0, active:1, ok:2, idle:3};
  const rows=siteBuildings().filter(b=>b.tab||b.act).map(b=>({b, g:buildingGlyph(b.key)}))
    .sort((a,z)=>order[a.g.state]-order[z.g.state]);
  return rows.map(({b,g})=>`<div class="vps-row" style="align-items:center">
    <span class="lbl" style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${GLYPH_COLOR[g.state]};flex:0 0 auto"></span>${b.name}</span>
    <span class="val" style="font-size:11px;color:${g.state==='attention'?GLYPH_COLOR.attention:'var(--muted)'}">${g.label}</span>
  </div>`).join('');
}
// CSS-transform camera for the pop-out — same model as capeZoom / flightCam (a translate+scale on an
// inner wrapper, transform-origin 0 0). #ccPopZoom holds the art (and, in a later slice, DOM hotspots);
// #ccPopFit is the non-transformed letterbox-fitted art box that the transform is measured against.
function applyCcPopZoom(){ const z=$('ccPopZoom'); if(z) z.style.transform=`translate(${ccPop.x}px,${ccPop.y}px) scale(${ccPop.z})`; }
function ccPopClampPan(w,h){ ccPop.x=Math.min(0,Math.max(w*(1-ccPop.z),ccPop.x)); ccPop.y=Math.min(0,Math.max(h*(1-ccPop.z),ccPop.y)); }
// Size #ccPopFit to the letterbox-fit of CAPE_W×CAPE_H inside the stage (centered by its own CSS), so the
// art box is exactly the fitted scene. Returns {w,h} of that box (the transform's reference rect), or null.
function ccPopFitBox(){
  const stage=$('ccPopStage'), fit=$('ccPopFit'); if(!stage||!fit) return null;
  const w=stage.clientWidth, h=stage.clientHeight; if(w<1||h<1) return null;
  const k=Math.min(w/CAPE_W,h/CAPE_H), fw=CAPE_W*k, fh=CAPE_H*k;
  if(fit.style.width!==fw+'px') fit.style.width=fw+'px';
  if(fit.style.height!==fh+'px') fit.style.height=fh+'px';
  return {w:fw,h:fh};
}
// Interaction: drag-pan, wheel-zoom-toward-cursor, dblclick-reset — mirrors initFlightZoom/initCapeZoom but
// drives ccPop and measures the fitted art box (#ccPopFit). Listeners live on the whole stage so the letterbox
// margins stay interactive, matching the old blit-model pop-out. Range kept wide ([1,8]) for a detail view.
function initCcPopZoom(){
  const stage=$('ccPopStage'); if(!stage||stage._zoomInit) return; stage._zoomInit=true;
  let drag=false, lx=0, ly=0, moved=0;
  const ref=()=>{ const f=$('ccPopFit'); return f?f.getBoundingClientRect():stage.getBoundingClientRect(); };
  stage.addEventListener('wheel',e=>{ e.preventDefault(); const r=ref(); const cx=e.clientX-r.left, cy=e.clientY-r.top, z0=ccPop.z;
    ccPop.z=Math.min(8,Math.max(1, ccPop.z*(e.deltaY<0?1.12:0.89)));
    ccPop.x=cx-(cx-ccPop.x)*(ccPop.z/z0); ccPop.y=cy-(cy-ccPop.y)*(ccPop.z/z0);
    ccPopClampPan(r.width,r.height); applyCcPopZoom(); },{passive:false});
  stage.addEventListener('pointerdown',e=>{ if(ccPop.z<=1) return; drag=true; moved=0; lx=e.clientX; ly=e.clientY; try{stage.setPointerCapture(e.pointerId);}catch(_){}});
  stage.addEventListener('pointermove',e=>{ if(!drag) return; const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY; moved+=Math.abs(dx)+Math.abs(dy); const r=ref(); ccPop.x+=dx; ccPop.y+=dy; ccPopClampPan(r.width,r.height); applyCcPopZoom(); });
  stage.addEventListener('pointerup',()=>{ drag=false; });
  stage.addEventListener('pointercancel',()=>{ drag=false; });
  // Swallow the click-through after a drag-to-pan so panning that starts/ends on a hotspot div doesn't fire
  // its click (mirrors initCapeZoom). Capture-phase on the stage runs before #ccPopSpots' own capture handler.
  stage.addEventListener('click',e=>{ if(moved>6){ e.stopPropagation(); e.preventDefault(); moved=0; } }, true);
  stage.addEventListener('dblclick',()=>{ ccPop.z=POPOUT_ZOOM_BOOST; const fit=ccPopFitBox(), off=centeredZoomOffset(fit?fit.w:0, fit?fit.h:0, ccPop.z); ccPop.x=off.x; ccPop.y=off.y; applyCcPopZoom(); });
}
function ccPopLoop(){
  if(!ccPopoutOpen){ ccPopAnim=null; return; }
  const cv=$('ccPopCanvas');
  ccPopFitBox(); // keep the fitted art box in sync with the stage (handles resize)
  if(cv){ if(cv.width!==CAPE_W) cv.width=CAPE_W; if(cv.height!==CAPE_H) cv.height=CAPE_H;
    try{ drawCape(cv,(ccNow()-ccPopT0)/1000); }catch(e){} } // draw straight onto the visible canvas at native res; CSS scales it, the wrapper transform pans/zooms
  // Refresh the hotspot glyphs ~2x/sec (every 30 frames): the canvas redraws every frame, but the status
  // glyphs only change on game-turn boundaries, so per-frame innerHTML churn would be wasteful. The delegated
  // click listener lives on the persistent #ccPopSpots container, so rebuilding its children here is safe.
  if((++ccPopFrame%30)===0){ const sp=$('ccPopSpots'); if(sp) sp.innerHTML=ccSpotsHTML(); }
  ccPopAnim=requestAnimationFrame(ccPopLoop);
}
function openCCPopout(){
  if(ccPopoutOpen) return;
  closeOtherPopouts('cc');
  ccPopoutOpen=true; ccPop={z:POPOUT_ZOOM_BOOST,x:0,y:0}; ccPopT0=ccNow();
  const ov=document.createElement('div'); ov.className='vehpop-scrim'; ov.id='ccPopout';
  ov.innerHTML=`<div class="vehpop-bar">
      <span class="vehpop-title">⌂ Command Center</span>
      <span class="vehpop-hint">drag to pan · scroll to zoom · double-click reset · Esc/Enter to close</span>
      <button class="vehpop-x" onclick="closeCCPopout()">✕ Close</button>
    </div>
    <div class="vehpop-body">
      <div class="vehpop-stage" id="ccPopStage"><div id="ccPopFit" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"><div id="ccPopZoom" style="position:absolute;inset:0;transform-origin:0 0"><canvas id="ccPopCanvas" width="${CAPE_W}" height="${CAPE_H}"></canvas><div id="ccPopSpots"></div></div></div></div>
      <aside class="vehpop-stats" id="ccPopInfo"></aside>
    </div>`;
  document.body.appendChild(ov); fadeInScrim(ov);
  const inf=$('ccPopInfo'); if(inf) inf.innerHTML=ccPopInfoHTML();
  const sp=$('ccPopSpots');
  if(sp){
    sp.innerHTML=ccSpotsHTML(); // same hotspots as the in-page view; ccPopLoop keeps the glyphs live
    // Close-then-act: the drill-in modals render below the pop-out scrim (z-index), so we must close the
    // pop-out BEFORE the building's action runs — mirroring earthGoToCape()'s close-then-navigate pattern.
    // Done via one delegated CAPTURE-phase listener on the container (which survives the periodic innerHTML
    // refresh) so the shared ccSpotsHTML() output is reused verbatim: the normal view's inline onclick stays
    // untouched, while here we intercept before it, closeCCPopout(), then invoke the original action ourselves.
    sp.addEventListener('click',e=>{
      const el=e.target&&e.target.closest?e.target.closest('.ccspot'):null;
      if(!el||!sp.contains(el)||typeof el.onclick!=='function') return; // planned/non-actionable spots have no onclick
      e.preventDefault(); e.stopPropagation();
      closeCCPopout();
      try{ el.onclick.call(el,e); }catch(_){}
    },true);
  }
  initCcPopZoom();
  const fit=ccPopFitBox(); if(fit){ const off=centeredZoomOffset(fit.w,fit.h,ccPop.z); ccPop.x=off.x; ccPop.y=off.y; }
  applyCcPopZoom();
  ccPopFrame=0;
  ccPopAnim=requestAnimationFrame(ccPopLoop);
}
function closeCCPopout(){ if(!ccPopoutOpen) return; ccPopoutOpen=false; if(ccPopAnim){ cancelAnimationFrame(ccPopAnim); ccPopAnim=null; } removeScrim('ccPopout'); }
// Scene ↔ pop-out parity: the same Vehicle → Station → Solar System → Control Center order works whether
// you're in the normal scenes (Tab via nextScene) OR popped out (Tab here switches pop-out → pop-out).
const POPOUT_OF = { bench:openVehPopout, station:openStationPopout, map:openMapPopout, command:openCCPopout };
const POPOUT_ORDER = ['bench','station','map','command'];
function anyPopoutOpen(){ return vehPopoutOpen||stnPopoutOpen||mapPopoutOpen||earthPopoutOpen||ccPopoutOpen; }
function currentPopoutSceneKey(){ if(vehPopoutOpen)return'bench'; if(stnPopoutOpen)return'station'; if(mapPopoutOpen||earthPopoutOpen)return'map'; if(ccPopoutOpen)return'command'; return null; }
function switchPopoutTo(key){ if(!POPOUT_OF[key]) return; closeOtherPopouts(null); state.tab=key; render(); POPOUT_OF[key](); } // underlying scene follows, so closing lands you here
function tabPopout(dir){ const cur=currentPopoutSceneKey(); let i=POPOUT_ORDER.indexOf(cur); if(i<0)i=0; switchPopoutTo(POPOUT_ORDER[((i+dir)%POPOUT_ORDER.length+POPOUT_ORDER.length)%POPOUT_ORDER.length]); }
// Capture-phase pop-out keys (beat the scene-nav + launch handlers): Esc/Enter close, Tab/Shift-Tab and
// number keys 1–4 hop pop-out → pop-out in the same order as the scenes.
document.addEventListener('keydown',function(e){
  if(!anyPopoutOpen()) return;
  if(e.key==='Escape'||e.key==='Enter'){ e.preventDefault(); e.stopPropagation();
    if(earthPopoutOpen) closeEarthPopout(); if(vehPopoutOpen) closeVehPopout(); if(stnPopoutOpen) closeStationPopout(); if(mapPopoutOpen) closeMapPopout(); if(ccPopoutOpen) closeCCPopout(); if(contractsPopoutOpen) closeContractsPopout(); return; }
  if(e.key==='Tab'){ e.preventDefault(); e.stopPropagation(); tabPopout(e.shiftKey?-1:1); return; }
  if(e.key>='1' && e.key<='4'){ const k=POPOUT_ORDER[+e.key-1]; if(k){ e.preventDefault(); e.stopPropagation(); switchPopoutTo(k); } }
},true);
// Presentation: the primary Build & Launch CTA sits directly under the rocket on the
// bench (in #vehicleCard), not in the right-rail readout. Same gate (canLaunch) + same
// label logic as the readout used to carry.
function launchButtonLabel(m,v){
  if(!m) return '■ Build & Launch';
  // window missions still resolve in one instant jump (their build/test time must land exactly on
  // the committed transfer-window date) — everything else now commits to a tracked build, so the
  // label says so up front rather than implying an immediate flight.
  const trackedNote = (!m.window && buildMonths(m)>0) ? ` — builds ${buildMonths(m)} mo, fly from hangar when ready` : '';
  if(!m.profile) return (m.tanker?'■ Launch Tanker':(v.crewed?'■ Build & Launch (crewed)':'■ Build & Launch'))+trackedNote;
  return '■ Build & Launch mission'+trackedNote;
}
function renderBenchLaunch(){
  const host=$('benchLaunch'); if(!host) return;
  let m,v,sim,chk;
  try{ m=curMission(); if(!m){ host.innerHTML=''; return; } v=computeVehicle(); sim=m.profile?simulateMission(m):null; chk=canLaunch(v,m,sim); }
  catch(e){ host.innerHTML=''; return; }
  const sf=canStaticFire();
  const fired=state._staticFires&&state._staticFires[state.stages[0]&&state.stages[0].eng]||0;
  const cap=padMassCap(), padUse=v&&cap!==Infinity?v.liftoff/cap:0;
  const padBar = padUse>0.6 ? `<div style="margin-top:6px" title="Pad structural limit — ground R&D raises it">
      <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--mono)"><span class="dim">PAD LOAD</span><span style="color:${padUse>1?'var(--bad)':padUse>0.85?'var(--warn)':'var(--muted)'}">${v.liftoff.toFixed(0)} / ${cap} t</span></div>
      <div style="height:4px;background:var(--panel2);border-radius:2px;overflow:hidden"><div style="height:100%;width:${Math.min(100,padUse*100)}%;background:${padUse>1?'var(--bad)':padUse>0.85?'var(--warn)':'var(--readout)'}"></div></div>
    </div>` : '';
  host.innerHTML=`<button class="launch" style="width:100%" onclick="launch()" ${chk.ok?'':'disabled'}>${chk.ok?launchButtonLabel(m,v):'Launch unavailable'}</button>
    ${chk.ok?'<div class="dim" style="font-size:12px;text-align:center;margin-top:4px">or press <b>Space</b></div>':`<div class="flag dim" style="color:var(--dim);margin-top:4px">${chk.why}</div>`}
    ${launchPadCap()>1?`<div class="dim" style="font-size:11px;text-align:center;margin-top:2px">Pads: ${padSlotsLeft()}/${launchPadCap()} free this month</div>`:''}
    <div style="display:flex;gap:6px;margin-top:8px;align-items:center">
      <button class="btn" style="flex:1;font-size:12px" onclick="staticFire()" ${sf.ok?'':'disabled'} title="Bolt the first stage to the stand and light it. Clean burn = heritage credit (${fired}/${STATIC_HERITAGE_CAP} ground). Anomaly = fixed, next launch +${Math.round(STATIC_FIX_BONUS*100)}% rel.">🔥 Static fire ${sf.ok?fM(STATIC_FIRE_COST):('· '+sf.why)}</button>
      <button class="btn ghost" style="font-size:12px;padding:6px 9px" onclick="toggleSfx()" title="${state.sfxMute?'Unmute':'Mute'} workshop sounds">${state.sfxMute?'🔇':'🔊'}</button>
    </div>
    ${state.staticFixBonus?`<div class="flag ok" style="margin-top:5px">🔧 Test-stand fix armed: next launch +${Math.round(state.staticFixBonus*100)}% reliability.</div>`:''}
    ${padBar}`;
}
// Design-bench editor tabs: consolidate the stacked editor cards under a few tabs. The cards keep
// their ids (render functions untouched); this only builds the tab bar, hides tabs whose cards are
// all empty/hidden for the current mission, and shows the active panel.
const BENCH_TABS=[
  {key:'vehicle',   label:'🚀 Vehicle'},
  {key:'modules',   label:'🛰 Modules'},
  {key:'customize', label:'🎨 Customize'},
  {key:'designs',   label:'💾 Saved Designs'},
  {key:'families',  label:'🧬 Families'},
  {key:'mission',   label:'◎ Mission'},
];
let benchTab='vehicle';
function setBenchTab(k){ benchTab=k; renderBenchTabs(); }
function renderBenchTabs(){
  const bar=$('benchTabs'); if(!bar) return;
  const panels=document.querySelectorAll('.bench-panel');
  const hasContent={};
  panels.forEach(p=>{ const k=p.getAttribute('data-benchtab'); let any=false;
    p.querySelectorAll('.card').forEach(c=>{ if(!c.classList.contains('hidden') && (c.innerHTML||'').trim()) any=true; });
    hasContent[k]=any; });
  const avail=BENCH_TABS.filter(t=>hasContent[t.key]);
  if(avail.length && !avail.some(t=>t.key===benchTab)) benchTab=avail[0].key; // active tab emptied → fall back
  bar.innerHTML=avail.map(t=>`<button class="bench-tab ${t.key===benchTab?'active':''}" onclick="setBenchTab('${t.key}')">${t.label}</button>`).join('');
  panels.forEach(p=>{ const k=p.getAttribute('data-benchtab'); p.classList.toggle('active', k===benchTab && !!hasContent[k]); });
}
function renderReadout(){
  const m=curMission();
  if(m.profile){ renderProfileReadout(m); return; }
  const v=computeVehicle();
  const pct=Math.min(100, v.totalDv/m.reqDv*100);
  const meets=v.totalDv>=m.reqDv;
  const fillColor=meets?'var(--ok)':(pct>70?'var(--warn)':'var(--bad)');
  const markerPos=Math.min(100,(m.reqDv/Math.max(v.totalDv,m.reqDv))*100);
  const chk=canLaunch(v,m);
  const e0=v.sm[0].eng;
  const ispEff=(((e0.ispSL+e0.ispVac)/2)*ispMult()).toFixed(0); // #2b: reflect research Isp bonus in the shown equation

  let flags='';
  if(!meets) flags+=`<div class="flag bad">▲ Δv short by ${fI(m.reqDv-v.totalDv)} m/s.</div>`;
  if(v.twr<=1.0) flags+=`<div class="flag bad">▲ Liftoff TWR ${v.twr.toFixed(2)} ≤ 1 — won't leave the pad (add engines or cut mass).</div>`;
  else if(v.twr<1.2) flags+=`<div class="flag warn">△ Liftoff TWR ${v.twr.toFixed(2)} is marginal — leaves the pad sluggishly. (Upper-stage TWR is shown per stage but is advisory: Δv here is the ideal rocket equation, with no gravity-loss penalty.)</div>`;
  if(v.gravLoss>200){ const worst=(v.stageGravLoss||[]).reduce((b,l,i)=>l>(b.l||0)?{l,i}:b,{l:0,i:0}); flags+=`<div class="flag ${v.gravLoss>800?'warn':''}">▾ Gravity losses −${fI(v.gravLoss)} m/s from low thrust-to-weight${(v.stageGravLoss&&v.stageGravLoss.length>1)?` (worst: stage ${worst.i+1})`:''} — add or upsize engines to recover that Δv.</div>`; }
  if(meets && v.twr>1.2) flags+=`<div class="flag ok">✓ Cleared to fly. Reliability ${(v.reliability*100|0)}%.</div>`;
  if(bayBuildDelta(m)>0) flags+=`<div class="flag warn">△ Over assembly-bay capacity (${vehicleUnits(m)}/${bayCapacity()} units) — build runs +${bayBuildDelta(m)} mo and −${(overstretchRelPenalty(m)*100).toFixed(1)}% reliability. Expand Assembly Bays in Orbital Ops.</div>`;
  if(cadenceSurcharge()>0) flags+=`<div class="flag warn">△ Build cadence ${Math.round(cadenceLoad()*100)}% of sustainable — rush surcharge +${Math.round(cadenceSurcharge()*100)}% on this build. Slow down or expand Assembly Bays.</div>`;
  { const _mb=materialCostMult(); if(_mb>1.05) flags+=`<div class="flag warn">△ Raw-material market hot — +${Math.round((_mb-1)*100)}% on this build. Sign a supply contract or stockpile in Manufacturing Capacity.</div>`; else if(_mb<0.95) flags+=`<div class="flag ok">📦 Raw-material market favorable — −${Math.round((1-_mb)*100)}% on this build.</div>`; }
  { const _drew=MATERIAL_DEFS.filter(d=>{const s=materialState(d.key); return s&&s.stock>=1;}); if(_drew.length>0){ const lbls=_drew.map(d=>`${d.name} @ ${materialState(d.key).avgCost.toFixed(2)}×`).join(', '); flags+=`<div class="flag ok">📦 Drawing from inventory: ${lbls}. This build leaves the yard with ${_drew.map(d=>materialState(d.key).stock-1).join('/')} build${_drew.length===1?'':'s'}-worth remaining.</div>`; } }
  if(v.crewed && v.twr>1.2 && meets && !state.research.launch_escape) flags+=`<div class="flag warn">△ No escape system — a failure at ${(100-(v.reliability*100|0))}% odds loses the crew.</div>`;
  if(recoveryActive(m)) flags+=`<div class="flag ok">♻ Reusable booster fitted — ${recoveryRefly(m)?`reflown on this routine mission: build ×${refurbCostMult().toFixed(2)}, turnaround −1 mo${refurbWear()>0?`, wear ${refurbWear()}/${REFLY_WEAR_MAX} (−${(refurbRelPenalty()*100).toFixed(1)}% rel)`:''}`:`first flight proves it (+${fM(RECOVERY_HARDWARE)} hardware; refly discount once routine)`}.</div>`;
  if(ispMult()>1||thrustMult()>1) flags+=`<div class="flag ok">⚙ Propulsion R&D on the launch vehicle: +${Math.round((ispMult()-1)*100)}% Isp · +${Math.round((thrustMult()-1)*100)}% thrust.</div>`;
  { const _fh=fleetHeritageRelBonus(); if(_fh>0){ const _best=(state.stages||[]).map(s=>s.eng).concat(boostersFitted&&boostersFitted()?[state.boosters.eng]:[]).reduce((b,id)=>engineHeritageFrac(id)>engineHeritageFrac(b)?id:b); flags+=`<div class="flag ok">🏅 Flight heritage: ${ENGINES[_best].name} has ${engineHeritageFlights(_best)} proven flights — +${(_fh*100).toFixed(1)}% reliability and a cheaper build. Old workhorses stay valuable.</div>`; } }
  { const _st=solidInsertionTax(m); if(_st>0) flags+=`<div class="flag warn">△ Solid final stage on an orbital insertion — no throttle or shutdown to trim the burn: −${(_st*100).toFixed(0)}% reliability. A restartable liquid upper stage inserts more precisely.</div>`; }
  if(boostersFitted()){ const relCost=Math.round((1-boosterRelPenalty())*100); flags+=`<div class="flag ok">⫶ ${v.boosters.count} strap-on booster${v.boosters.count>1?'s':''} (${v.boosters.eng.name}${v.boosters.eng.solid?', solid':''}) — +${fI(v.boostDv||0)} m/s boost-phase Δv, combined-thrust liftoff${relCost>0?` · −${relCost}% reliability (extra failure points)`:''}.</div>`; }
  if(mfgBuildMult()<1||groundLaunchMult()<1||buildTimeCut()>=0.5) flags+=`<div class="flag ok">🏭 Industrial R&D: −${Math.round((1-mfgBuildMult())*100)}% build cost · −${Math.round((1-groundLaunchMult())*100)}% launch-ops cost${buildTimeCut()>=0.5?` · −${Math.round(buildTimeCut())} mo build time`:''}.</div>`;
  { const _rs=radSeverity(m), _pr=(m.crew>0?powerRad(m):0); if(_rs>=0.12||_pr>0) flags+=`<div class="flag ${_rs>=0.5||_pr>=0.3?'warn':''}">☢ Radiation ${_rs>=0.7?'extreme':_rs>=0.4?'high':_rs>=0.12?'moderate':'low'} (env ${radEnvironment(m)} · ${m.days||0}d)${_pr>0?` + onboard ${selfPoweredCraft(m)?'NEP reactor':powerSourceDef(state.powerSource).name}`:''} — ${state.research.rad_shielding?'shielding fitted':'<b>no shielding</b>'}: equipment ×${radEquipMult(m).toFixed(2)} fragility${m.crew>0?` · crew ×${radCrewMult(m).toFixed(2)}`:''}.</div>`; }
  const testBtns=TEST_LEVELS.map((t,i)=>`<button class="btn" style="flex:1;font-size:12px;${state.testLevel===i?'border-color:var(--readout);color:var(--readout)':''}" onclick="setTestLevel(${i})">${t.name}${t.rel>0?` +${(t.rel*100)|0}%`:''}${t.cost>0?`<br><span class="dim" style="font-size:11px">${fM(t.cost)} · ${t.months} mo</span>`:''}</button>`).join('');
  // E1.5: pre-flight phase-by-phase reliability decomposition for the hover tooltip (informational —
  // no governing subsystem yet, nothing has failed). Reuses the same machinery resolveFlight rolls on.
  const relTip=esc(phaseBreakdownLines(flightPhaseBreakdown(subsystemReport(m,v,null,v.crewed)),null).join('\n'));

  setHTML($('readoutCard'), `
    <div class="mission-tag">Flying against</div>
    <div class="mission-name">${m.name} ${m.crew?`<span class="pill" style="color:var(--ignite);border-color:var(--hud-line)">${m.crew} crew · ${m.days<1?(m.days*24).toFixed(0)+'h':m.days+'d'}</span>`:''} ${state.completed[m.id]?'<span class="pill ok">routine</span>':''}</div>

    <div class="gauge">
      <div class="nums"><span class="achieved" style="color:${meets?'var(--ok)':'var(--ink)'}">${fI(v.totalDv)}<span style="font-size:12px;color:var(--muted)"> m/s Δv</span></span>
        <span class="req">req ${fI(m.reqDv)}</span></div>
      <div class="bar"><div class="fill" style="width:${pct}%;background:${fillColor}"></div><div class="marker" style="left:${markerPos}%"></div></div>
    </div>

    <div class="metrics">
      <div class="metric"><div class="k">Liftoff TWR</div><div class="v" style="color:${v.twr>1.2?'var(--ink)':(v.twr>1?'var(--warn)':'var(--bad)')}">${v.twr.toFixed(2)}</div></div>
      <div class="metric" title="Δv bled by stages whose TWR is below nominal — raise thrust to recover it"><div class="k">Gravity loss</div><div class="v" style="color:${v.gravLoss>800?'var(--bad)':(v.gravLoss>200?'var(--warn)':'var(--ink)')}">${v.gravLoss>1?'−'+fI(v.gravLoss)+' m/s':'—'}</div></div>
      <div class="metric" title="${relTip}"><div class="k">${domDot('engineering')}Reliability</div><div class="v">${(v.reliability*100|0)}%</div></div>
      <div class="metric"><div class="k">Liftoff mass</div><div class="v">${v.liftoff.toFixed(1)} t</div></div>
      <div class="metric"><div class="k">Payload</div><div class="v">${v.payload>=1?v.payload.toFixed(2)+' t':(v.payload*1000).toFixed(0)+' kg'}</div></div>
      <div class="metric"><div class="k">${domDot('economy')}Build cost</div><div class="v">${fM(v.buildCost)}</div></div>
      <div class="metric"><div class="k">${domDot('economy')}Launch cost</div><div class="v">${fM(v.launchCost)}</div></div>
      <div class="metric"><div class="k">Build time</div><div class="v">${buildMonths(m)+1+TEST_LEVELS[state.testLevel].months} mo</div></div>
    </div>

    <div class="adv-only">${buildCostBreakdownHTML(m)}${subsystemBreakdownHTML(m,v)}</div>
    ${missionNetHTML(m,v,null)}
    ${massFractionHTML(v)}

    <div class="eq">Δv = Isp · g₀ · ln(m₀/m_f) − gravity loss<br>
      stage 1: ${ispEff} · 9.81 · ln(${v.liftoff.toFixed(1)}/${(v.liftoff-state.stages[0].prop).toFixed(1)}) = ${fI(v.stageDv[0]+(v.stageGravLoss?v.stageGravLoss[0]:0))} m/s${(v.stageGravLoss&&v.stageGravLoss[0]>1)?` − ${fI(v.stageGravLoss[0])} grav = ${fI(v.stageDv[0])}`:''}<br>
      σ ${curSigma()} · ${v.totalEng} engine${v.totalEng>1?'s':''} · ${state.stages.length} stage${state.stages.length>1?'s':''}</div>

    <div class="mission-tag" style="margin-top:6px">Test campaign — buy down risk before you fly</div>
    <div class="row" style="gap:6px;align-items:stretch;margin:6px 0 4px">${testBtns}</div>
    ${rehearsalHTML(m)}

    ${flags}
    ${benchQueueHTML(m)}
    <div class="dim" style="font-size:12px;text-align:center;margin-top:6px">▸ Build &amp; Launch is under the rocket</div>`);
}

function renderProfileReadout(m){
  const v=computeVehicle();
  const sim=simulateMission(m);
  const chk=canLaunch(v,m,sim);
  const rel=Math.max(0.30, v.reliability*Math.pow(0.985, sim.inSpaceLegs));
  const fails=sim.legs.filter(l=>!l.pass).length;
  const legRows=sim.legs.map(l=>{
    const VEHICLE_LABEL={transfer:'transfer stage',descent:'descent stage',ascent:'ascent stage'};
    let detail;
    if(l.isru) detail=`<span style="color:var(--ok)">${l.isru}</span> covers this burn — no carried propellant spent`;
    else if(l.by==='lv') detail=`LV lofts ${l.mass.toFixed(1)} t · capacity ${fI(l.cap)} m/s${l.twr?` · TWR ${l.twr.toFixed(2)}`:''}`;
    else detail=`${VEHICLE_LABEL[l.by]||l.by} pushes ${l.mass.toFixed(1)} t · tank gives ${fI(l.cap)} m/s${l.ga?` · <span style="color:var(--ok)">gravity assist −8%</span>`:''}`;
    const depotNote = (l.name==='Ascent to LEO' && state.depotUse>0) ? ` · <span style="color:var(--readout)">+${state.depotUse.toFixed(1)} t from depot after this leg</span>` : '';
    return `<div class="leg ${l.pass?'':'bad'}">
      <span class="legname" style="color:${l.pass?'var(--ok)':'var(--bad)'}">${l.pass?'✓':'✕'} ${l.name}</span>
      <span class="legdv">${fI(l.dv)} m/s</span>
      <span class="legdetail">${detail}${depotNote}</span></div>`;
  }).join('');
  const testBtns=TEST_LEVELS.map((t,i)=>`<button class="btn" style="flex:1;font-size:12px;${state.testLevel===i?'border-color:var(--readout);color:var(--readout)':''}" onclick="setTestLevel(${i})">${t.name}${t.rel>0?` +${(t.rel*100)|0}%`:''}${t.cost>0?`<br><span class="dim" style="font-size:11px">${fM(t.cost)} · ${t.months} mo</span>`:''}</button>`).join('');

  let flags='';
  if(fails) flags+=`<div class="flag bad">▲ ${fails} leg${fails>1?'s':''} short — fix the red rows above.</div>`;
  else flags+=`<div class="flag ok">✓ Every leg passes. Mission reliability ${(rel*100|0)}%.</div>`;
  if(sim.boiloff) flags+= sim.boiloff.controlled
    ? `<div class="flag ok">❄ Cryo boil-off (controlled): ~${sim.boiloff.lost} t evaporates over the cruise — already reflected in the legs above.</div>`
    : `<div class="flag warn">❄ Cryo boil-off: ~${sim.boiloff.lost} t of cryogenic propellant evaporates over the cruise (reflected above). Cryogenic Boil-off Control research cuts the rate ~4×.</div>`;
  if(bayBuildDelta(m)>0) flags+=`<div class="flag warn">△ Over assembly-bay capacity (${vehicleUnits(m)}/${bayCapacity()} units) — build runs +${bayBuildDelta(m)} mo and −${(overstretchRelPenalty(m)*100).toFixed(1)}% reliability. Expand Assembly Bays in Orbital Ops.</div>`;
  if(cadenceSurcharge()>0) flags+=`<div class="flag warn">△ Build cadence ${Math.round(cadenceLoad()*100)}% of sustainable — rush surcharge +${Math.round(cadenceSurcharge()*100)}% on this build. Slow down or expand Assembly Bays.</div>`;
  { const _mb=materialCostMult(); if(_mb>1.05) flags+=`<div class="flag warn">△ Raw-material market hot — +${Math.round((_mb-1)*100)}% on this build. Sign a supply contract or stockpile in Manufacturing Capacity.</div>`; else if(_mb<0.95) flags+=`<div class="flag ok">📦 Raw-material market favorable — −${Math.round((1-_mb)*100)}% on this build.</div>`; }
  { const _drew=MATERIAL_DEFS.filter(d=>{const s=materialState(d.key); return s&&s.stock>=1;}); if(_drew.length>0){ const lbls=_drew.map(d=>`${d.name} @ ${materialState(d.key).avgCost.toFixed(2)}×`).join(', '); flags+=`<div class="flag ok">📦 Drawing from inventory: ${lbls}. This build leaves the yard with ${_drew.map(d=>materialState(d.key).stock-1).join('/')} build${_drew.length===1?'':'s'}-worth remaining.</div>`; } }
  if(!state.research.launch_escape) flags+=`<div class="flag warn">△ No escape system — a failure at ${(100-(rel*100|0))}% odds loses the crew.</div>`;
  if(recoveryActive(m)) flags+=`<div class="flag ok">♻ Reusable booster fitted — ${recoveryRefly(m)?`reflown on this routine mission: build ×${refurbCostMult().toFixed(2)}, turnaround −1 mo${refurbWear()>0?`, wear ${refurbWear()}/${REFLY_WEAR_MAX} (−${(refurbRelPenalty()*100).toFixed(1)}% rel)`:''}`:`first flight proves it (+${fM(RECOVERY_HARDWARE)} hardware; refly discount once routine)`}.</div>`;
  if(ispMult()>1||thrustMult()>1) flags+=`<div class="flag ok">⚙ Propulsion R&D on the launch vehicle: +${Math.round((ispMult()-1)*100)}% Isp · +${Math.round((thrustMult()-1)*100)}% thrust.</div>`;
  { const _fh=fleetHeritageRelBonus(); if(_fh>0){ const _best=(state.stages||[]).map(s=>s.eng).concat(boostersFitted&&boostersFitted()?[state.boosters.eng]:[]).reduce((b,id)=>engineHeritageFrac(id)>engineHeritageFrac(b)?id:b); flags+=`<div class="flag ok">🏅 Flight heritage: ${ENGINES[_best].name} has ${engineHeritageFlights(_best)} proven flights — +${(_fh*100).toFixed(1)}% reliability and a cheaper build. Old workhorses stay valuable.</div>`; } }
  { const _st=solidInsertionTax(m); if(_st>0) flags+=`<div class="flag warn">△ Solid final stage on an orbital insertion — no throttle or shutdown to trim the burn: −${(_st*100).toFixed(0)}% reliability. A restartable liquid upper stage inserts more precisely.</div>`; }
  if(boostersFitted()){ const relCost=Math.round((1-boosterRelPenalty())*100); flags+=`<div class="flag ok">⫶ ${v.boosters.count} strap-on booster${v.boosters.count>1?'s':''} (${v.boosters.eng.name}${v.boosters.eng.solid?', solid':''}) — +${fI(v.boostDv||0)} m/s boost-phase Δv, combined-thrust liftoff${relCost>0?` · −${relCost}% reliability (extra failure points)`:''}.</div>`; }
  if(mfgBuildMult()<1||groundLaunchMult()<1||buildTimeCut()>=0.5) flags+=`<div class="flag ok">🏭 Industrial R&D: −${Math.round((1-mfgBuildMult())*100)}% build cost · −${Math.round((1-groundLaunchMult())*100)}% launch-ops cost${buildTimeCut()>=0.5?` · −${Math.round(buildTimeCut())} mo build time`:''}.</div>`;
  { const _rs=radSeverity(m), _pr=(m.crew>0?powerRad(m):0); if(_rs>=0.12||_pr>0) flags+=`<div class="flag ${_rs>=0.5||_pr>=0.3?'warn':''}">☢ Radiation ${_rs>=0.7?'extreme':_rs>=0.4?'high':_rs>=0.12?'moderate':'low'} (env ${radEnvironment(m)} · ${m.days||0}d)${_pr>0?` + onboard ${selfPoweredCraft(m)?'NEP reactor':powerSourceDef(state.powerSource).name}`:''} — ${state.research.rad_shielding?'shielding fitted':'<b>no shielding</b>'}: equipment ×${radEquipMult(m).toFixed(2)} fragility${m.crew>0?` · crew ×${radCrewMult(m).toFixed(2)}`:''}.</div>`; }

  // E1.5: pre-flight phase-by-phase reliability decomposition for the hover tooltip (informational —
  // no governing subsystem yet). sim is already computed above; crewed follows v.crewed as elsewhere.
  const relTip=esc(phaseBreakdownLines(flightPhaseBreakdown(subsystemReport(m,v,sim,v.crewed)),null).join('\n'));

  setHTML($('readoutCard'), `
    <div class="mission-tag">Mission profile — every leg must pass</div>
    <div class="mission-name">${m.name} <span class="pill" style="color:var(--ignite);border-color:var(--hud-line)">${m.crew} crew · ${m.days}d</span> ${state.completed[m.id]?'<span class="pill ok">routine</span>':''}</div>

    <div class="legs">${legRows}</div>

    <div class="metrics">
      <div class="metric" title="${relTip}"><div class="k">${domDot('engineering')}Mission reliability</div><div class="v">${(rel*100|0)}%</div></div>
      <div class="metric"><div class="k">${domDot('crew')}Crew module</div><div class="v">${sim.crewMass.toFixed(2)} t</div></div>
      <div class="metric"><div class="k">LV liftoff mass</div><div class="v">${v.liftoff.toFixed(1)} t</div></div>
      <div class="metric"><div class="k">To LEO</div><div class="v">${v.payload.toFixed(2)} t</div></div>
      <div class="metric"><div class="k">${domDot('economy')}Build cost</div><div class="v">${fM(v.buildCost)}</div></div>
      <div class="metric"><div class="k">${domDot('economy')}Launch cost</div><div class="v">${fM(v.launchCost)}</div></div>
      <div class="metric"><div class="k">Build time</div><div class="v">${buildMonths(m)+1+TEST_LEVELS[state.testLevel].months} mo</div></div>
    </div>

    <div class="adv-only">${buildCostBreakdownHTML(m)}${subsystemBreakdownHTML(m,v)}</div>
    ${missionNetHTML(m,v,sim)}
    ${massFractionHTML(v)}

    <div class="eq">The launch vehicle lofts the whole stack (${v.payload.toFixed(1)} t) to LEO; the transfer stage then spends one tank across ${sim.inSpaceLegs} deep-space burn${sim.inSpaceLegs>1?'s':''}, lighter after each — yet every burn still hauls everything still attached.${m.modules.includes('lander')?' The descent stage is dropped on the surface after landing; the ascent stage returns alone to meet the transfer stage.':''}${state.depotUse>0?` This run draws <b style="color:var(--readout)">${state.depotUse.toFixed(1)} t</b> from the LEO depot — propellant that never had to be launched from Earth.`:''}${ISRU_FREE_LEG[m.id]&&state.research[ISRU_FREE_LEG[m.id].research]?` <b style="color:var(--ok)">${ISRU_FREE_LEG[m.id].label}</b> is online — the ${ISRU_FREE_LEG[m.id].leg} burn is produced on-site.`:''}${missionAerocaptureLeg(m)&&state.research.aerocapture?` <b style="color:var(--ok)">Aerocapture</b> is online — the ${missionAerocaptureLeg(m)} burn costs 70% less, the atmosphere doing the rest.`:''}</div>

    <div class="mission-tag" style="margin-top:6px">Test campaign — buy down risk before you fly</div>
    <div class="row" style="gap:6px;align-items:stretch;margin:6px 0 4px">${testBtns}</div>
    ${rehearsalHTML(m)}

    ${flags}
    ${benchQueueHTML(m)}
    <div class="dim" style="font-size:12px;text-align:center;margin-top:6px">▸ Build &amp; Launch is under the rocket</div>`);
}

/* ---------- Solar System map ---------- */
/* ---------- planet/moon SVG textures (self-contained, no external images) ---------- */
let _texSeq=0;
function bodyTexture(id, cx, cy, r){
  const uid='tex'+id+(_texSeq++);
  switch(id){
    case 'earth': return `
      <defs><radialGradient id="${uid}" cx="35%" cy="32%" r="75%">
        <stop offset="0%" stop-color="#6fb3ef"/><stop offset="45%" stop-color="#2f6fb0"/><stop offset="100%" stop-color="#0e2c4a"/>
      </radialGradient><clipPath id="${uid}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid})"/>
      <g clip-path="url(#${uid}c)" opacity="0.85" fill="#5fae62">
        <ellipse cx="${cx-r*0.35}" cy="${cy-r*0.25}" rx="${r*0.42}" ry="${r*0.28}"/>
        <ellipse cx="${cx+r*0.4}" cy="${cy+r*0.3}" rx="${r*0.3}" ry="${r*0.22}"/>
        <ellipse cx="${cx+r*0.05}" cy="${cy-r*0.5}" rx="${r*0.22}" ry="${r*0.14}"/>
      </g>
      <g clip-path="url(#${uid}c)" opacity="0.5" fill="#fff">
        <ellipse cx="${cx-r*0.1}" cy="${cy+r*0.15}" rx="${r*0.5}" ry="${r*0.12}"/>
        <ellipse cx="${cx+r*0.3}" cy="${cy-r*0.4}" rx="${r*0.3}" ry="${r*0.1}"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(150,200,255,0.35)" stroke-width="${Math.max(1,r*0.06)}"/>`;
    case 'moon': return `
      <defs><radialGradient id="${uid}" cx="38%" cy="35%" r="75%">
        <stop offset="0%" stop-color="#e4e6e8"/><stop offset="55%" stop-color="#aab0b5"/><stop offset="100%" stop-color="#6c7378"/>
      </radialGradient><clipPath id="${uid}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid})"/>
      <g clip-path="url(#${uid}c)" opacity="0.35" fill="#7d8388">
        <circle cx="${cx-r*0.3}" cy="${cy-r*0.2}" r="${r*0.22}"/>
        <circle cx="${cx+r*0.25}" cy="${cy+r*0.1}" r="${r*0.16}"/>
        <circle cx="${cx+r*0.05}" cy="${cy-r*0.45}" r="${r*0.12}"/>
        <circle cx="${cx-r*0.45}" cy="${cy+r*0.35}" r="${r*0.1}"/>
      </g>`;
    case 'venus': return `
      <defs><radialGradient id="${uid}" cx="35%" cy="32%" r="75%">
        <stop offset="0%" stop-color="#f7e3a8"/><stop offset="50%" stop-color="#d8b56a"/><stop offset="100%" stop-color="#8a6a30"/>
      </radialGradient><clipPath id="${uid}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid})"/>
      <g clip-path="url(#${uid}c)" opacity="0.4" fill="#fff8e0">
        <ellipse cx="${cx-r*0.2}" cy="${cy-r*0.3}" rx="${r*0.6}" ry="${r*0.12}"/>
        <ellipse cx="${cx+r*0.1}" cy="${cy+r*0.1}" rx="${r*0.55}" ry="${r*0.1}"/>
        <ellipse cx="${cx-r*0.05}" cy="${cy+r*0.4}" rx="${r*0.5}" ry="${r*0.09}"/>
      </g>`;
    case 'mars': return `
      <defs><radialGradient id="${uid}" cx="35%" cy="32%" r="75%">
        <stop offset="0%" stop-color="#e8865a"/><stop offset="55%" stop-color="#bb5530"/><stop offset="100%" stop-color="#6e2f18"/>
      </radialGradient><clipPath id="${uid}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid})"/>
      <g clip-path="url(#${uid}c)" opacity="0.4" fill="#7a3a20">
        <ellipse cx="${cx-r*0.2}" cy="${cy+r*0.15}" rx="${r*0.4}" ry="${r*0.2}"/>
        <ellipse cx="${cx+r*0.3}" cy="${cy-r*0.1}" rx="${r*0.25}" ry="${r*0.15}"/>
      </g>
      <g clip-path="url(#${uid}c)" fill="#fff" opacity="0.85">
        <circle cx="${cx}" cy="${cy-r*0.82}" r="${r*0.24}"/>
        <circle cx="${cx+r*0.05}" cy="${cy+r*0.85}" r="${r*0.18}"/>
      </g>`;
    case 'phobos': return `
      <defs><radialGradient id="${uid}" cx="38%" cy="35%" r="75%">
        <stop offset="0%" stop-color="#a89e92"/><stop offset="55%" stop-color="#7d7468"/><stop offset="100%" stop-color="#4a423a"/>
      </radialGradient></defs>
      <path d="M ${cx-r} ${cy} q ${r*0.1} -${r*1.05} ${r*1.05} -${r*0.95} q ${r*0.95} ${r*0.15} ${r*0.95} ${r*1.0}
               q -${r*0.1} ${r*1.0} -${r*1.0} ${r*0.95} q -${r*0.95} -${r*0.1} -${r*1.0} -${r*1.0} Z"
        fill="url(#${uid})"/>
      <circle cx="${cx-r*0.25}" cy="${cy-r*0.2}" r="${r*0.2}" fill="#3a332c" opacity="0.5"/>
      <circle cx="${cx+r*0.3}" cy="${cy+r*0.15}" r="${r*0.14}" fill="#3a332c" opacity="0.5"/>`;
    case 'belt': return `
      <defs><radialGradient id="${uid}" cx="40%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#c4c0b8"/><stop offset="100%" stop-color="#7a766e"/>
      </radialGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid})"/>`;
    case 'jupiter': return `
      <defs><radialGradient id="${uid}" cx="35%" cy="32%" r="75%">
        <stop offset="0%" stop-color="#f3d9b1"/><stop offset="55%" stop-color="#d9a572"/><stop offset="100%" stop-color="#8a5c34"/>
      </radialGradient><clipPath id="${uid}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid})"/>
      <g clip-path="url(#${uid}c)">
        <rect x="${cx-r}" y="${cy-r*0.7}" width="${r*2}" height="${r*0.22}" fill="#c98f55" opacity="0.6"/>
        <rect x="${cx-r}" y="${cy-r*0.2}" width="${r*2}" height="${r*0.3}" fill="#b87a45" opacity="0.55"/>
        <rect x="${cx-r}" y="${cy+r*0.25}" width="${r*2}" height="${r*0.18}" fill="#c98f55" opacity="0.5"/>
        <ellipse cx="${cx+r*0.35}" cy="${cy+r*0.05}" rx="${r*0.22}" ry="${r*0.14}" fill="#a8552f" opacity="0.7"/>
      </g>`;
    case 'saturn':
      return `<defs><radialGradient id="${uid}" cx="35%" cy="32%" r="75%">
          <stop offset="0%" stop-color="#f5e6bc"/><stop offset="55%" stop-color="#dcb86e"/><stop offset="100%" stop-color="#8c6a34"/>
        </radialGradient></defs>
        <ellipse cx="${cx}" cy="${cy}" rx="${r*2.05}" ry="${r*0.6}" fill="none" stroke="rgba(225,205,150,0.45)" stroke-width="${Math.max(1.2,r*0.34)}" transform="rotate(-18 ${cx} ${cy})"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid})"/>
        <path d="M ${cx-r*2.05} ${cy} A ${r*2.05} ${r*0.6} 0 0 0 ${cx+r*2.05} ${cy}" fill="none" stroke="rgba(245,228,180,0.8)" stroke-width="${Math.max(1.2,r*0.34)}" transform="rotate(-18 ${cx} ${cy})"/>`;
    default: {
      // generically shaded sphere in the body's own colour, so every world reads as a lit globe
      const bd=BODIES.find(x=>x.id===id)||{}, col=bd.color||'#9aa0a6';
      return `<defs><radialGradient id="${uid}" cx="36%" cy="33%" r="76%">
          <stop offset="0%" stop-color="${shade(col,0.4)}"/><stop offset="60%" stop-color="${col}"/><stop offset="100%" stop-color="${shade(col,-0.45)}"/>
        </radialGradient></defs>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid})"/>`;
    }
  }
}

function selectBody(id){
  state.selectedBody=id;
  if(mapPopoutOpen){ refreshMapPopout(); return; } // in the pop-out: select + refresh info; the overlay owns pan/zoom
  if(!state.mapZoom) state.mapZoom=id; // first click zooms in
  render();
}
function zoomOut(){ state.mapZoom=null; render(); }
/* ---------- M6: Personnel tab ---------- */
function moraleColor(m){ return m>=70?'var(--ok)':m>=40?'var(--warn)':'var(--bad)'; }
// Deterministic generated "roster headshot" — unique per person id, no binary assets.
let _ppSeq=0;
function _phash(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function personPortrait(p, size){
  size=size||56;
  const id=(p&&p.id)||'x';
  let seed=_phash(id)||1;
  const rnd=()=>{ seed=(seed*1103515245+12345)>>>0; return seed/4294967296; };
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const isAstro=!!ASTRONAUTS.find(a=>a.id===id);
  const skin=pick(['#f4cda6','#e7b38a','#cf9d6f','#b07c4f','#8d5a34','#6e4426']);
  const hairc=pick(['#23211f','#4a3526','#6b4a2a','#a8842f','#9aa3ab','#caa55a','#2b2b2b','#7a4a2a']);
  const bgA=pick(['#16222b','#1a2331','#221a2b','#122019','#231d18']);
  const suit=isAstro?pick(['#e08a4f','#d7dde1','#c9532b','#e0e4e8']):pick(['#39434f','#46506a','#4a5a4a','#5a4a3a','#3f4a55']);
  const hairStyle=Math.floor(rnd()*5);
  const glasses=!isAstro && rnd()<0.45;
  const beard=rnd()<0.26, mustache=!beard && rnd()<0.18;
  const eyeY=43, eyeDx=8, browY=37, uid='pp'+(_ppSeq++);
  let hair='';
  if(hairStyle!==4) hair+=`<path d="M30 41 Q30 19 50 18 Q70 19 70 41 Q66 29 50 28 Q34 29 30 41 Z" fill="${hairc}"/>`;
  else hair+=`<path d="M31 42 Q31 25 41 23 L41 33 Q34 34 31 42 Z" fill="${hairc}"/><path d="M69 42 Q69 25 59 23 L59 33 Q66 34 69 42 Z" fill="${hairc}"/>`;
  if(hairStyle===1) hair+=`<path d="M48 19 Q61 19 69 33 L66 23 Q58 18 48 19 Z" fill="${hairc}"/>`;
  if(hairStyle===3) hair+=`<ellipse cx="30" cy="45" rx="6" ry="12" fill="${hairc}"/><ellipse cx="70" cy="45" rx="6" ry="12" fill="${hairc}"/>`;
  const gl=glasses?`<g fill="none" stroke="#1c1c1c" stroke-width="1.6"><circle cx="${50-eyeDx}" cy="${eyeY}" r="5"/><circle cx="${50+eyeDx}" cy="${eyeY}" r="5"/><line x1="${50-eyeDx+5}" y1="${eyeY}" x2="${50+eyeDx-5}" y2="${eyeY}"/></g>`:'';
  const fh=beard?`<path d="M34 49 Q34 67 50 69 Q66 67 66 49 Q60 59 50 59 Q40 59 34 49 Z" fill="${hairc}" opacity="0.92"/>`:(mustache?`<path d="M42 55 Q50 59 58 55 Q50 57 42 55 Z" fill="${hairc}"/>`:'');
  const patch=isAstro?(()=>{ const pc=pick(['#ef6a73','#8de5ff','#65d39a','#58c7ff']); return `<rect x="59" y="85" width="12" height="9" rx="1.5" fill="${pc}" stroke="#0007"/><circle cx="65" cy="89.5" r="2" fill="#ffffffaa"/>`; })():'';
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="display:block;border-radius:8px;flex-shrink:0;background:#0c1318" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="#0c1318"/></linearGradient></defs>
    <rect width="100" height="100" rx="10" fill="url(#${uid})"/>
    <ellipse cx="50" cy="104" rx="40" ry="28" fill="${suit}"/>
    <path d="M38 86 Q50 96 62 86" fill="none" stroke="#00000033" stroke-width="2"/>
    <rect x="44" y="61" width="12" height="17" rx="4" fill="${skin}"/>
    <ellipse cx="30" cy="47" rx="4" ry="6" fill="${skin}"/><ellipse cx="70" cy="47" rx="4" ry="6" fill="${skin}"/>
    <ellipse cx="50" cy="46" rx="19" ry="23" fill="${skin}"/>
    ${hair}
    <line x1="${50-eyeDx-3}" y1="${browY}" x2="${50-eyeDx+3}" y2="${browY-1}" stroke="${hairc}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="${50+eyeDx-3}" y1="${browY-1}" x2="${50+eyeDx+3}" y2="${browY}" stroke="${hairc}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="${50-eyeDx}" cy="${eyeY}" r="2.1" fill="#2a2320"/><circle cx="${50+eyeDx}" cy="${eyeY}" r="2.1" fill="#2a2320"/>
    <path d="M50 47 L48 53 Q50 55 52 53" fill="none" stroke="#00000033" stroke-width="1.4"/>
    <path d="M44 57 Q50 60 56 57" fill="none" stroke="#7a4a44" stroke-width="1.8" stroke-linecap="round"/>
    ${fh}${gl}${patch}
  </svg>`;
}

function renderPersonnelCard(p, sr){
  const isEng = !!ENGINEERS.find(e=>e.id===p.id);
  const isAstro = !!ASTRONAUTS.find(a=>a.id===p.id);
  const morale = sr.morale|0;
  const mColor = moraleColor(morale);
  const canCommend = sr.commendCooldown===0;
  const assigned = state.assignedAstronaut===p.id;
  const ab = isAstro && assigned ? astroBonus() : null;
  const moraleFactor = Math.max(0.2, sr.morale/100);
  const engBonusStr = isEng ? (p.skill*moraleFactor*ENG_REL_BONUS_MAX).toFixed(3) : null;

  return `<div class="card" style="margin-bottom:8px;display:flex;gap:12px;align-items:flex-start">
    ${personPortrait(p,64)}
    <div style="flex:1;min-width:0">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div>
        <span style="font-size:14px;font-weight:600;color:var(--ink)">${p.name}</span>
        <span class="pill" style="margin-left:6px">${roleLabel(p)}</span>
        <span class="pill" style="margin-left:4px;color:var(--ignite);border-color:var(--hud-line)" title="${traitOf(p.id).desc}">${traitOf(p.id).name}</span>
        ${isDeptLead(p.id)?'<span class="pill" style="margin-left:4px;color:var(--readout);border-color:var(--hud-line)" title="Department lead — steers this department\'s output">★ lead</span>':''}
        ${isAstro&&assigned?'<span class="pill active" style="margin-left:4px">assigned</span>':''}
        ${isAstro&&isCrewDeployed(p.id)?'<span class="pill" style="margin-left:4px;color:var(--readout);border-color:var(--hud-line)">🚀 in flight</span>':''}
      </div>
      <span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${p.salary.toFixed(2)}M/mo</span>
    </div>
    <p class="muted" style="font-size:12px;margin:3px 0 4px">${p.bio}</p>
    <p class="dim" style="font-size:12px;margin:0 0 6px"><b style="color:var(--ignite)">${traitOf(p.id).name}:</b> ${traitOf(p.id).desc}</p>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:12px;color:var(--dim);width:50px">Morale</span>
      <div style="flex:1;height:6px;background:var(--panel2);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${morale}%;background:${mColor}"></div>
      </div>
      <span style="font-family:var(--mono);font-size:12px;color:${mColor}">${morale}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:12px;color:var(--dim);width:50px">Skill</span>
      <div style="flex:1;height:6px;background:var(--panel2);border-radius:3px;overflow:hidden;position:relative">
        <div style="height:100%;width:${(p.skill*100)|0}%;background:var(--readout)"></div>
        ${skillGain(p.id)>0.001?`<div style="height:100%;width:${(skillGain(p.id)*100)|0}%;background:var(--ok);position:absolute;top:0;left:${(p.skill*100)|0}%"></div>`:''}
      </div>
      <span style="font-family:var(--mono);font-size:12px;color:var(--readout)">${(effSkill(p.id)*100)|0}${skillGain(p.id)>0.001?`<span style="color:var(--ok)"> +${Math.round(skillGain(p.id)*100)}</span>`:''}</span>
    </div>
    ${isAstro?(()=>{ const dose=Math.round(sr.dose||0); const dc=dose>=RAD_CAREER_WARN?'var(--bad)':dose>=RAD_CAREER_WARN*0.6?'var(--warn)':'var(--ok)';
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px" title="Career radiation dose — at ${RAD_CAREER_LIMIT} the astronaut must retire">
      <span style="font-size:12px;color:var(--dim);width:50px">☢ Dose</span>
      <div style="flex:1;height:6px;background:var(--panel2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.min(100,dose)}%;background:${dc}"></div></div>
      <span style="font-family:var(--mono);font-size:12px;color:${dc}">${dose}/${RAD_CAREER_LIMIT}</span>
    </div>`; })():''}
    <div class="adv-only" style="font-size:12px;color:var(--muted);margin-bottom:8px">
      ${isEng?`Reliability contribution: <span style="color:var(--ok)">+${engBonusStr}</span> (factors into team average)`:''}
      ${isAstro&&assigned&&ab?`<span style="color:var(--ok)">Crewed rel +${(ab.rel*100).toFixed(1)}% · Payout x${ab.payoutMult.toFixed(2)}</span>`:''}
      ${isAstro&&!assigned?`<span class="dim">Not assigned to crewed missions</span>`:''}
      ${isAstro&&astronautFlights(p.id).length?` · <span class="dim">${astronautFlights(p.id).length} flight${astronautFlights(p.id).length===1?'':'s'} flown</span>`:''}
      ${roleOf(p.id)==='sci'?`<span style="color:var(--ok)">Science division: yield +${(sciStaffYieldBonus()*100)|0}% · R&D +${(sciStaffRdBonus()*100)|0}%</span>`:''}
      ${roleOf(p.id)==='exec'?`<span style="color:var(--ok)">Front office: funding +${(execGovBonus()*100)|0}% · opex −${(execOpexCut()*100)|0}% · mandate +${(execMandateBonus()*100)|0}%</span>`:''}
      ${roleOf(p.id)==='controller'?`<span style="color:var(--ok)">Mission control: anomaly −${(ctrlAnomScore()*CTRL_ANOMALY_CUT_MAX*100)|0}% · call +${(ctrlCallScore()*CTRL_CALL_BONUS_MAX*100)|0}% · rescue +${(ctrlRescueScore()*CTRL_RESCUE_BONUS_MAX*100)|0}%</span>`:''}
    </div>
    ${isEng?`<div class="expert-only" style="font-size:12px;color:var(--dim);margin-bottom:8px;font-family:var(--mono)">rel = skill ${p.skill.toFixed(2)} × morale ${moraleFactor.toFixed(2)} × ${ENG_REL_BONUS_MAX} = +${engBonusStr}</div>`:''}
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${isDeptLead(p.id)
        ? `<button class="btn ghost" style="font-size:12px" onclick="stepDownLead('${deptOfPerson(p.id)}')" title="Remove ${p.name} as department lead">★ Step down as lead</button>`
        : `<button class="btn ghost" style="font-size:12px" onclick="promoteLead('${p.id}')" title="Promote ${p.name} to lead ${departmentDef(deptOfPerson(p.id))?departmentDef(deptOfPerson(p.id)).name:'their department'} — their skill, morale and temperament steer the whole department">☆ Make lead</button>`}
      <button class="btn ghost" style="font-size:12px" onclick="giveRaise('${p.id}')">Raise (+${(RAISE_SALARY_BUMP*1000)|0}k/mo, +${RAISE_MORALE_BUMP} morale)</button>
      <button class="btn ghost" style="font-size:12px" onclick="commendPersonnel('${p.id}')" ${canCommend?'':'disabled'}>${sr.commendCooldown>0?`Commend (${sr.commendCooldown}mo)`:`Commend (+${COMMEND_MORALE_BUMP} morale)`}</button>
      ${isAstro?`<button class="btn ghost" style="font-size:12px" onclick="assignAstronaut('${p.id}')">${assigned?'Unassign':'Assign to crew'}</button>`:''}
      <button class="btn ghost danger" style="font-size:12px;margin-left:auto" onclick="firePersonnel('${p.id}')">Let go</button>
    </div>
    </div>
  </div>`;
}

const ASTRO_OUTCOME_LABEL={success:'✓ Success', partial:'◐ Partial', abort:'✗ Aborted', loss:'☠ Lost', strand:'☠ Lost', rescued:'⚑ Rescued', scrub:'⊘ Scrubbed'};
const ASTRO_OUTCOME_COLOR={success:'var(--ok)', partial:'var(--warn)', abort:'var(--bad)', loss:'var(--bad)', strand:'var(--bad)', rescued:'var(--warn)', scrub:'var(--dim)'};
function renderPersonnel(){
  const box=$('personnelCard');
  const hired=state.staff.map(sr=>({p:personById(sr.id),sr})).filter(x=>x.p);
  const available=availablePool();
  const engScore=(engTeamScore()*100)|0;
  const rdBonus=(engRdSpeedBonus()*100)|0;
  const relBonus=engRelBonus().toFixed(3);
  const monthlySalary=state.staff.reduce((a,s)=>{const p=personById(s.id);return a+(p?p.salary:0);},0);

  let html=`<div class="card dombar-crew" style="margin-bottom:10px">
    <h2>${domDot('crew')}Personnel <span class="pill">${hired.length} on staff</span></h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 8px">Engineers boost reliability and R&D speed. Assign an astronaut to crewed missions for reliability and payout bonuses. Morale scales all bonuses and determines attrition.</p>
    <div class="metrics adv-only">
      <div class="metric"><div class="k">Monthly payroll</div><div class="v">${fM(monthlySalary)}</div></div>
      <div class="metric"><div class="k">Eng team score</div><div class="v">${engScore}/100</div></div>
      <div class="metric"><div class="k">R&D speed bonus</div><div class="v">+${rdBonus}%</div></div>
      <div class="metric"><div class="k">Reliability bonus</div><div class="v">+${relBonus}</div></div>
    </div>
  </div>`;

  // #19 slice C: workforce-planning banner — surfaces critical gaps (esp. unstaffed depts, which
  // otherwise have no member cards to render). Understaffed = a real reliability risk; leaderless = a nudge.
  const gaps=workforceGaps();
  if(gaps.length){
    const rows=gaps.map(g=>{
      const def=departmentDef(g.id);
      return g.kind==='understaffed'
        ? `<div style="color:var(--bad);font-size:12px">⚠ <b>${def.icon} ${def.name}</b> is unstaffed — a core department with no engineers${eraStakesFrac()>0?` (reliability −${Math.round(DEPT_UNDERSTAFF_REL_PEN*eraStakesFrac()*100)}% while empty)`:''}. Hire below.</div>`
        : `<div style="color:var(--warn);font-size:12px">○ <b>${def.icon} ${def.name}</b> has no lead — promote one to steer it.</div>`;
    }).join('');
    html+=`<div class="card" style="margin-bottom:10px;border-color:var(--hud-line);background:var(--panel2)">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px">👥 Workforce planning</div>${rows}</div>`;
  }

  if(hired.length){
    html+=`<div style="margin-bottom:6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Departments</div>`;
    // #19: group the on-staff list by department, each with an org header (lead + headcount)
    html+=DEPARTMENTS.map(def=>{
      const members=deptMembers(def.id); if(!members.length) return '';
      const leadRec=deptLeadRecord(def.id);
      const leadName=leadRec?(personById(leadRec.id)||{}).name:null;
      const leadTxt = leadName
        ? `<span style="color:var(--readout)">★ ${leadName}</span>`
        : `<span class="dim">no lead — promote one below</span>`;
      const ds=deptState(def.id);
      const isCritical=criticalDepts().includes(def.id);
      const health = !leadName && members.length ? {c:'var(--warn)', t:isCritical?'Critical department has no lead':'No lead assigned'}
                   : (leadName ? {c:'var(--ok)', t:'Staffed and led'} : {c:'var(--dim)', t:'Staffed'});
      const dot=`<span title="${health.t}" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${health.c};margin-right:2px"></span>`;
      const trainChk=canTrainDepartment(def.id);
      const trainBtn = ds.training>=TRAIN_MAX_LEVEL
        ? `<span class="pill" title="Training maxed">🎓 L${TRAIN_MAX_LEVEL} max</span>`
        : `<button class="btn ghost" style="font-size:12px;padding:3px 8px" onclick="trainDepartment('${def.id}')" ${trainChk.ok?'':'disabled'} title="${trainChk.ok?`Invest in training: accelerates this department's experience growth (${fM(trainChk.cost)})`:trainChk.why}">🎓 Train L${ds.training}→${ds.training+1} · ${fM(trainDepartmentCost(def.id))}</button>`;
      const header=`<div class="card" style="background:var(--panel2);margin-bottom:6px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div><span style="font-weight:700">${dot}${def.icon} ${def.name}</span> <span class="pill" style="margin-left:4px">${members.length}</span>${ds.training>0?` <span class="pill" style="color:var(--ok);border-color:#2f5a2f" title="Training level accelerates experience growth">🎓 L${ds.training}</span>`:''}</div>
        <div style="display:flex;align-items:center;gap:10px;font-size:12px">Lead: ${leadTxt} ${trainBtn}</div>
      </div>`;
      return header + members.map(sr=>renderPersonnelCard(personById(sr.id), sr)).join('');
    }).join('');
  }

  if(available.length){
    html+=`<div style="margin:12px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Available to Hire</div>`;
    html+=available.map(p=>{
      const isEng=!!ENGINEERS.find(e=>e.id===p.id);
      return `<div class="card" style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:10px">
        ${personPortrait(p,48)}
        <div style="flex:1">
          <span style="font-size:13px;font-weight:600;color:var(--ink)">${p.name}</span>
          <span class="pill" style="margin-left:6px">${roleLabel(p)}</span>
          <p class="muted" style="font-size:12px;margin:2px 0 0">${p.bio}</p>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--mono);font-size:12px;color:var(--muted)">${p.salary.toFixed(2)}M/mo</div>
          <div style="font-size:12px;color:var(--dim)">skill ${(p.skill*100)|0}</div>
          <button class="btn" style="margin-top:4px;font-size:12px" onclick="hirePersonnel('${p.id}')">Hire</button>
        </div>
      </div>`;
    }).join('');
  } else if(!hired.length){
    html+=`<p class="dim" style="font-size:12px;margin-top:8px">No personnel available yet — build reputation and advance through eras to unlock the talent pool.</p>`;
  }

  const rosterIds=Object.keys(state.astronautLog||{}).sort((a,b)=>astronautFlights(b).length-astronautFlights(a).length);
  if(rosterIds.length){
    const lostIds=new Set(memorialRoll().map(f=>f.id));
    html+=`<div class="card" style="margin-top:12px">
      <h2>🚀 Astronaut Roster</h2>
      <p class="muted" style="font-size:12px;margin:-2px 0 8px">Every astronaut who has flown for this agency, most-flown first.</p>
      ${rosterIds.map(id=>{
        const p=personById(id); if(!p) return '';
        const flights=astronautFlights(id);
        const status=lostIds.has(id)?`<span style="color:var(--bad)">🕊 Lost</span>`:state.staff.some(s=>s.id===id)?`<span style="color:var(--ok)">Active</span>`:`<span class="dim">Off roster</span>`;
        return `<div style="padding:8px 0;border-top:1px solid var(--line);display:flex;gap:10px">
          ${personPortrait(p,40)}
          <div style="flex:1;min-width:0">
            <div style="font-size:13px"><b>${esc(p.name)}</b> ${status} <span class="pill" style="margin-left:4px" title="${esc(traitOf(id).desc)}">${esc(traitOf(id).name)}</span></div>
            <div class="dim" style="font-size:12px;margin:2px 0 4px">${flights.length} flight${flights.length===1?'':'s'} flown</div>
            ${flights.map(f=>`<div style="font-size:12px"><span class="dim">${f.when}</span> ${esc(f.mission)} <span style="color:${ASTRO_OUTCOME_COLOR[f.outcome]||'var(--dim)'}">${ASTRO_OUTCOME_LABEL[f.outcome]||f.outcome}</span></div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  const fallen=memorialRoll();
  if(fallen.length){
    html+=`<div class="card" style="margin-top:12px;background:var(--panel2);border-color:#5a2f2f">
      <h2 style="margin-bottom:2px">🕊 Memorial Wall</h2>
      <p class="muted" style="font-size:12px;margin:-2px 0 8px">Every astronaut lost flying for this agency.</p>
      ${fallen.map(f=>`<div style="padding:6px 0;border-top:1px solid var(--line)">
        <div style="font-size:13px;color:var(--ink)"><b>${esc(f.name)}</b> <span class="dim">— ${f.when}</span></div>
        <div class="dim" style="font-size:12px">${esc(f.mission)}${f.story?`: ${esc(f.story)}`:''}</div>
      </div>`).join('')}
    </div>`;
  }

  box.innerHTML=html;
}

// M4b: Rivals tab — each rival's profile plus their "firsts" timeline,
// achieved vs upcoming, anchored to the current calendar year.
function rivalThreatLabel(score){
  if(score>=6) return {txt:'Dominant', col:'var(--bad)'};
  if(score>=4) return {txt:'Aggressive', col:'var(--bad)'};
  if(score>=2) return {txt:'Active', col:'var(--warn)'};
  if(score>=1) return {txt:'Emerging', col:'var(--warn)'};
  return {txt:'Dormant', col:'var(--dim)'};
}
function renderRivals(){
  const box=$('rivalsCard');
  let html=`<h2>${domDot('military')}Rival Agencies &amp; Firms</h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 12px">Rivals are active competitors: they claim firsts (scooping your contracts), poach your low-morale staff, and when one commoditises launch the whole industry's payouts fall. Keep morale high and your edge sharp.</p>`;
  for(const r of RIVALS){
    const score=(state.rivalThreat&&state.rivalThreat[r.id])||0;
    const tl=rivalThreatLabel(score);
    const claimed=r.firsts.filter(f=>state.rivalFired[r.id+'|'+f.name]).length;
    const priceWar=(state.econEvents||[]).find(e=>e.id==='pricewar_'+r.id);
    html+=`<div class="card" style="margin-bottom:10px;border-color:${score>=4?'rgba(224,86,79,.4)':'var(--line)'}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <h2 style="margin-bottom:2px">${r.flag} ${r.name} <span class="pill">${r.kind}</span></h2>
        <span class="pill" style="color:${tl.col};border-color:${tl.col}">Threat: ${tl.txt}</span>
      </div>
      <p class="muted" style="font-size:12px;margin:2px 0 6px">${r.blurb}</p>
      <div class="dim" style="font-size:12px;margin-bottom:6px">${claimed}/${r.firsts.length} firsts claimed${priceWar?` · <span style="color:var(--bad)">price war active: payouts ×${priceWar.payoutMult} (${priceWar.monthsLeft} mo left)</span>`:''}</div>
      ${(()=>{ // CE1(c): Standings — momentum, live projection of the next goal, and the counter-poach lever
        const rs=rivalStateFor(r), mom=rs.momentum||1;
        const arrow = mom>1.05?'<span style="color:var(--bad)">▲ surging</span>':(mom<0.95?'<span style="color:var(--ok)">▼ stalling</span>':'<span class="dim">▬ steady</span>');
        const pj=rivalProjectedYear(r);
        const projTxt = !pj ? '<span class="dim">all goals claimed</span>'
          : `next: <b>${pj.goal.name}</b> — projected <b>${pj.year}</b>`
            + (pj.year<pj.nominal?` <span style="color:var(--bad)">(${pj.nominal-pj.year}y ahead of history)</span>`
             : pj.year>pj.nominal?` <span style="color:var(--ok)">(${pj.year-pj.nominal}y behind — you're slowing them)</span>`:'');
        const crowd=rivalCrowdFactor();
        const crowdTxt = crowd<1 ? ` <span class="dim expert-only">· market crowding ×${crowd.toFixed(2)}</span>` : '';
        const canCP=state.money>=RIVAL_COUNTERPOACH_COST;
        const ownIntel=rivalIntelOwned(r.id), canIntel=state.money>=RIVAL_INTEL_COST;
        const intelBtn = ownIntel
          ? `<button class="btn ghost" style="font-size:12px;white-space:nowrap" disabled title="You hold a full intel dossier on this rival — their remaining program timeline is projected below">🕵 Dossier owned</button>`
          : `<button class="btn ghost" style="font-size:12px;white-space:nowrap" ${canIntel?'':'disabled'} onclick="buyRivalIntel('${r.id}')" title="Buy a one-time intel dossier: projects every remaining goal on their roadmap (not just the next), momentum-adjusted">🕵 Buy intel dossier −${fM(RIVAL_INTEL_COST)}</button>`;
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;font-size:12px">
          <span>Momentum ${arrow} <span class="dim expert-only" style="font-family:var(--mono)">${mom.toFixed(2)}×</span> · ${projTxt}${crowdTxt}</span>
          <span style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn ghost" style="font-size:12px;white-space:nowrap" ${canCP?'':'disabled'} onclick="counterPoach('${r.id}')" title="Hire away their engineers: knocks their momentum (−${RIVAL_COUNTERPOACH_MOM}), lifts your staff morale (+${RIVAL_COUNTERPOACH_MORALE}), +2 rep">Counter-poach −${fM(RIVAL_COUNTERPOACH_COST)}</button>
            ${intelBtn}
          </span>
        </div>`;
      })()}
      ${rivalIntelOwned(r.id)?(()=>{ // E1.1 slice B: paid intel dossier — the full remaining roadmap, momentum-adjusted (the paid twin of the static firsts list below)
        const proj=rivalFullProjection(r);
        if(!proj.length) return '';
        let rows='';
        for(const pj of proj){
          const frame = pj.year<pj.nominal?` <span style="color:var(--bad)">(${pj.nominal-pj.year}y ahead of history)</span>`
             : pj.year>pj.nominal?` <span style="color:var(--ok)">(${pj.year-pj.nominal}y behind — you're slowing them)</span>`:'';
          rows+=`<div style="display:flex;justify-content:space-between;gap:10px;padding:2px 0">
            <span>${pj.goal.name}</span>
            <span><b>${pj.year}</b>${frame}</span>
          </div>`;
        }
        return `<div style="background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:12px">
          <div class="dim" style="font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">🕵 Full program projection</div>
          ${rows}
        </div>`;
      })():''}
      <div class="expert-only dim" style="font-size:12px;margin-bottom:6px;font-family:var(--mono)">threat score ${score.toFixed(1)}${priceWar?` · price-war payout ×${priceWar.payoutMult}`:''}</div>
      <div class="adv-only" style="display:flex;flex-direction:column;gap:4px">`;
    for(const f of r.firsts){
      const key=r.id+'|'+f.name;
      const done=!!state.rivalFired[key];
      const cls = done?'ok':(f.year===state.year?'active':'lock');
      const status = done? 'Claimed' : (f.year<=state.year? 'Pending' : f.year-state.year+'y away');
      let linkTxt='';
      if(f.missionId){
        const mm=MISSIONS.find(x=>x.id===f.missionId);
        if(done && state.completed[f.missionId]) linkTxt=` <span class="pill ok">you got there first</span>`;
        else if(done && state.scooped[f.missionId]) linkTxt=` <span class="pill lock">scooped "${mm.name}"</span>`;
        else linkTxt=` <span class="pill">linked: ${mm.name}</span>`;
      }
      html+=`<div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;border-bottom:1px solid var(--line);padding:4px 0">
        <span>${f.name}${linkTxt}</span>
        <span style="display:flex;gap:8px;align-items:center"><span class="dim" style="font-family:var(--mono)">${f.year}</span><span class="pill ${cls}">${status}</span></span>
      </div>`;
    }
    html+=`</div></div>`;
  }
  box.innerHTML=html;
}


let mapExpanded=false;
function toggleMapExpand(){ mapExpanded=!mapExpanded; renderMap(); }
/* ---------- Hybrid Phaser layer (Slice 3): MapScene ----------
   The solar-system overview in Phaser: Sun + orbit rings, planets/moons as
   interactive bodies with labels, slow orbital motion, drag-to-pan + wheel-zoom
   camera, and rival/facility markers. Reuses BODIES/ANGLES/selectBody/rivalsAtBody.
   Guarded + lazy; falls back to the SVG map (overview + click-zoom) when absent. */
const MAP_W=760, MAP_H=480;
let MapScene=null, mapGame=null, mapScene=null;
function defineMapScene(){
  if(MapScene || !phaserOK()) return;
  const hx=h=>{ try{ return Phaser.Display.Color.HexStringToColor(h).color; }catch(e){ return 0xffffff; } };
  MapScene=class extends Phaser.Scene{
    constructor(){ super('solarmap'); }
    create(){
      this.cam=this.cameras.main; this.cam.setBackgroundColor('#05080d');
      for(let i=0;i<70;i++){ this.add.circle((Math.random()-0.5)*MAP_W*3,(Math.random()-0.5)*MAP_H*3, Math.random()*1.2+0.3, 0xffffff, 0.1+Math.random()*0.4).setScrollFactor(0.4); }
      this.rings=this.add.graphics(); this.transfer=this.add.graphics(); this.markers=this.add.graphics(); this.selRing=this.add.graphics();
      // detailed per-body planet textures (generated once)
      const S=448;
      for(const bb of BODIES){ if(bb.kind==='belt'||bb.kind==='cloud') continue; const key='planet_'+bb.id; if(!this.textures.exists(key)){ const tx=this.textures.createCanvas(key,S,S); try{ drawPlanetTex(tx.context,S,bb); }catch(e){} tx.refresh(); } }
      // Epic Sun: pulsing corona glow + radiating flares + a granulated photosphere core
      if(!this.textures.exists('sunGlow')){ const sg=this.textures.createCanvas('sunGlow',256,256); const sc=sg.context; const gg=sc.createRadialGradient(128,128,6,128,128,128); gg.addColorStop(0,'rgba(255,240,180,0.95)'); gg.addColorStop(0.35,'rgba(255,180,70,0.5)'); gg.addColorStop(0.7,'rgba(255,140,40,0.18)'); gg.addColorStop(1,'rgba(255,120,30,0)'); sc.fillStyle=gg; sc.fillRect(0,0,256,256); sg.refresh(); }
      if(!this.textures.exists('sunCore')){ const sd=this.textures.createCanvas('sunCore',64,64); const cc=sd.context; const cg=cc.createRadialGradient(28,26,2,32,32,32); cg.addColorStop(0,'#fff8e0'); cg.addColorStop(0.45,'#ffe28a'); cg.addColorStop(0.78,'#ffb12a'); cg.addColorStop(1,'#ff7a18'); cc.fillStyle=cg; cc.beginPath(); cc.arc(32,32,30,0,7); cc.fill(); cc.fillStyle='rgba(170,70,15,0.45)'; cc.beginPath(); cc.arc(26,36,3,0,7); cc.fill(); cc.beginPath(); cc.arc(38,28,2,0,7); cc.fill(); sd.refresh(); }
      const cr=this.add.graphics(); cr.lineStyle(1.5,0xffc450,0.5); for(let i=0;i<32;i++){ const a=i*Math.PI/16, r1=15, r2=15+((i%2)?9:18); cr.beginPath(); cr.moveTo(Math.cos(a)*r1,Math.sin(a)*r1); cr.lineTo(Math.cos(a)*r2,Math.sin(a)*r2); cr.strokePath(); }
      const sgI=this.add.image(0,0,'sunGlow').setDisplaySize(135,135).setBlendMode(Phaser.BlendModes.ADD);
      const k=sgI.scaleX; this.tweens.add({targets:sgI, scaleX:k*1.08, scaleY:k*1.08, alpha:0.8, duration:2600, yoyo:true, repeat:-1, ease:'Sine.easeInOut'});
      this.add.image(0,0,'sunCore').setDisplaySize(28,28);
      this.bodies=[];
      const planets=BODIES.filter(b=>!b.around);
      for(const b of planets){ if(b.kind==='cloud') continue; this.addBody(b,null,hx); for(const m of BODIES.filter(x=>x.around===b.id)) this.addBody(m,b,hx); }
      // Oort Cloud — speckled spherical shell + a clickable label
      const oc=BODIES.find(b=>b.id==='oort');
      if(oc){ const og=this.add.graphics(); const orn=mulberry(9001);
        for(let i=0;i<260;i++){ const a=orn()*6.2832, rr=oc.r+(orn()-0.5)*58; og.fillStyle(0xbcd4e0, 0.2+orn()*0.4); og.fillCircle(Math.cos(a)*rr, Math.sin(a)*rr, 0.6+orn()*1.0); }
        const ot=this.add.text(0,-oc.r-8,'Oort Cloud',{fontFamily:'ui-monospace,monospace',fontSize:'12px',color:themeColor('muted')}).setOrigin(0.5,1);
        ot.setInteractive({useHandCursor:true}); ot.on('pointerdown',()=>selectBody('oort')); }
      const maxR=Math.max.apply(null, planets.filter(b=>b.kind!=='cloud').map(p=>p.r));
      this.fitZoom=Math.min(MAP_W,MAP_H)/(2*(maxR+60));
      this.cam.centerOn(0,0); this.cam.setZoom(this.fitZoom);
      this.input.on('pointermove',p=>{ if(p.isDown){ this.cam.scrollX-=(p.x-p.prevPosition.x)/this.cam.zoom; this.cam.scrollY-=(p.y-p.prevPosition.y)/this.cam.zoom; } });
      this.input.on('wheel',(p,go,dx,dy)=>{ this.cam.setZoom(Phaser.Math.Clamp(this.cam.zoom*(dy>0?0.88:1.14), this.fitZoom*0.6, this.fitZoom*42)); });
      mapScene=this;
    }
    addBody(b,parent,hx){
      const rad=parent?((b.dotR||4.5)*1.3):(b.kind==='belt'?3:((b.dotR||8)*1.35));
      const ringed=!!RINGED[b.id]; let c, isImg=false;
      if(b.kind==='belt' || !this.textures.exists('planet_'+b.id)){ c=this.add.circle(0,0,rad,hx(b.color)); }
      else { c=this.add.image(0,0,'planet_'+b.id); const frac=ringed?RINGED_TEX_R:PLANET_TEX_R; c.setDisplaySize(rad/frac, rad/frac); isImg=true; }
      c.setInteractive({useHandCursor:true});
      c.on('pointerdown',()=>selectBody(b.id));
      const t=this.add.text(0,0,b.name,{fontFamily:'ui-monospace,monospace',fontSize:parent?'9px':'11px',color:themeColor('muted')}).setOrigin(0.5,1);
      this.bodies.push({b,parentId:parent?parent.id:null,ang:(ANGLES[b.id]!==undefined?ANGLES[b.id]:0),speed:(parent?0.12:0.05)/Math.sqrt(Math.max(10,b.r)),c,t,rad,x:0,y:0,ringed,isImg});
    }
    faceSun(o){ if(o.isImg && !o.ringed) o.c.rotation = Math.atan2(-o.y,-o.x) - BAKED_LIT_ANGLE; } // lit side toward the Sun (map centre)
    update(time,delta){
      const dt=(delta||16)/1000;
      for(const o of this.bodies){ if(o.parentId) continue; o.ang+=o.speed*dt; o.x=Math.cos(o.ang)*o.b.r; o.y=Math.sin(o.ang)*o.b.r; o.c.setPosition(o.x,o.y); o.t.setPosition(o.x,o.y-o.rad-3); this.faceSun(o); }
      for(const o of this.bodies){ if(!o.parentId) continue; const p=this.bodies.find(q=>q.b.id===o.parentId); if(!p) continue; const mr=p.rad+(o.b.moonR||10)*1.3; o.ang+=o.speed*dt; o.x=p.x+Math.cos(o.ang)*mr; o.y=p.y+Math.sin(o.ang)*mr; o.c.setPosition(o.x,o.y); o.t.setPosition(o.x,o.y-o.rad-3); this.faceSun(o); }
      this.drawRings(); this.drawTransfer(time); this.drawMarkers(); this.drawSel();
    }
    // #graphics: live committed-window transfer arc between the moving Earth and destination,
    // drawn as an animated dashed quadratic curve with a travelling marker.
    drawTransfer(time){
      const g=this.transfer; g.clear();
      // Planned (not yet committed) active-mission route — the planning surface promise
      const pr=plannedRoute();
      if(pr && !pr.committed){ const eo=this.bodies.find(o=>o.b.id==='earth'); const to=this.bodies.find(o=>o.b.id===pr.destId);
        if(eo&&to){ const col=pr.ok?themeColorNum('ok'):themeColorNum('bad');
          const mx=(eo.x+to.x)/2, my=(eo.y+to.y)/2, mr=Math.hypot(mx,my)||1;
          const rT=(to.parentId?(this.bodies.find(o=>o.b.id===to.parentId)||{b:{r:eo.b.r}}).b.r:to.b.r);
          const dir=rT>=eo.b.r?1:-1, bow=(Math.abs(rT-eo.b.r)*0.45+18)*dir;
          const cxp=mx/mr*(mr+bow), cyp=my/mr*(mr+bow);
          const N=40; g.lineStyle(1.1,col,0.6);
          for(let i=0;i<N;i+=3){ const u0=i/N,u1=(i+1.4)/N;
            const p=(u)=>{const iu=1-u;return {x:iu*iu*eo.x+2*iu*u*cxp+u*u*to.x, y:iu*iu*eo.y+2*iu*u*cyp+u*u*to.y};};
            const q0=p(u0), q1=p(Math.min(1,u1)); g.beginPath(); g.moveTo(q0.x,q0.y); g.lineTo(q1.x,q1.y); g.strokePath(); } } }
      const cw=state.committedWindow; if(!cw) return;
      const destId=missionBody(cw.missionId); if(!destId) return;
      const eo=this.bodies.find(o=>o.b.id==='earth'); let to=this.bodies.find(o=>o.b.id===destId);
      if(!eo||!to) return;
      const fx=eo.x, fy=eo.y, tx=to.x, ty=to.y;
      const rE=eo.b.r, rT=(to.parentId?(this.bodies.find(o=>o.b.id===to.parentId)||{b:{r:rE}}).b.r:to.b.r);
      const mx=(fx+tx)/2, my=(fy+ty)/2, mr=Math.hypot(mx,my)||1;
      const dir=rT>=rE?1:-1, bow=(Math.abs(rT-rE)*0.45+18)*dir;
      const cxp=mx/mr*(mr+bow), cyp=my/mr*(mr+bow);
      const N=48, pts=[];
      for(let i=0;i<=N;i++){ const u=i/N, iu=1-u; pts.push({x:iu*iu*fx+2*iu*u*cxp+u*u*tx, y:iu*iu*fy+2*iu*u*cyp+u*u*ty}); }
      g.lineStyle(1.4,themeColorNum('ignite'),0.85);
      const ph=Math.floor((time*0.004))%2;
      for(let i=0;i<N;i++){ if(((i+ph)%2)===0) continue; g.beginPath(); g.moveTo(pts[i].x,pts[i].y); g.lineTo(pts[i+1].x,pts[i+1].y); g.strokePath(); }
      const idx=Math.floor(((time*0.00012)%1)*N); const pp=pts[Math.min(N,Math.max(0,idx))];
      g.fillStyle(themeColorNum('warn'),1); g.fillCircle(pp.x,pp.y,2.2);
      g.fillStyle(themeColorNum('ignite'),1); g.fillCircle(fx,fy,2.2);
    }
    drawRings(){ const g=this.rings; g.clear(); g.lineStyle(1,themeColorNum('muted'),0.22);
      for(const o of this.bodies){ if(o.parentId){ const p=this.bodies.find(q=>q.b.id===o.parentId); if(p) g.strokeCircle(p.x,p.y,p.rad+(o.b.moonR||10)*1.3); } else { g.strokeCircle(0,0,o.b.r); } } }
    drawMarkers(){ const g=this.markers; g.clear(); const C=h=>{ try{ return Phaser.Display.Color.HexStringToColor(h).color; }catch(e){ return 0xffffff; } };
      const t=(this.time&&this.time.now)||0, pulse=0.55+0.45*Math.sin(t*0.0024), fast=0.35+0.65*Math.abs(Math.sin(t*0.006));
      const model=mapAssetModel();
      const HEALTH_HEX={ok:themeColorNum('ok'), warn:themeColorNum('warn'), attention:themeColorNum('bad')};
      for(const o of this.bodies){
        const rv=rivalsAtBody(o.b.id)||[]; const seen={}; let i=0;
        for(const h of rv){ if(seen[h.rival.id])continue; seen[h.rival.id]=1; const a=-1.57+(i-0.5)*0.5; g.fillStyle(C(h.rival.color),1); g.fillCircle(o.x+Math.cos(a)*(o.rad+6),o.y+Math.sin(a)*(o.rad+6),2); i++; }
        const am=model[o.b.id]; if(!am) continue;
        // player pennant — the empire flag, softly pulsing
        if(am.firsts.length){ const fx=o.x-5, fy=o.y-o.rad-13;
          g.lineStyle(1,themeColorNum('ignite'),1); g.beginPath(); g.moveTo(fx,fy+8); g.lineTo(fx,fy-2); g.strokePath();
          g.fillStyle(themeColorNum('ignite'), pulse); g.beginPath(); g.moveTo(fx,fy-2); g.lineTo(fx+8,fy+0.5); g.lineTo(fx,fy+3); g.closePath(); g.fillPath(); }
        // facility: health ring (blinks when strained/starved) + module pips
        if(am.facility){ const {def,health,modules}=am.facility; const fx=o.x+o.rad+8, fy=o.y+1;
          const alpha=health==='ok'?1:(health==='warn'?pulse:fast);
          g.fillStyle(themeColorNum('bg'),0.75); g.fillCircle(fx,fy,6.5);
          g.lineStyle(1.4,HEALTH_HEX[health],alpha); g.strokeCircle(fx,fy,6.5);
          g.fillStyle(C(def.color),1); g.fillRect(fx-2,fy-2,4,4);
          const n=Math.min(8,modules); for(let k=0;k<n;k++){ g.fillStyle(HEALTH_HEX[health],1); g.fillCircle(fx-((n-1)*2.6)/2+k*2.6, fy+10, 1); } }
        // ISRU pick
        if(am.isru){ g.fillStyle(themeColorNum('ok'),1); const ix=o.x-o.rad-9, iy=o.y;
          g.fillRect(ix-2.5,iy-0.6,5,1.2); g.fillRect(ix-0.6,iy-0.6,1.2,4); }
        // Belt claim — expanding ring
        if(am.beltClaim){ const bx=o.x+o.rad+7, by=o.y-8, rr=3+Math.abs(Math.sin(t*0.0014))*1.4;
          g.lineStyle(1.2,themeColorNum('ignite'),0.9); g.strokeCircle(bx,by,rr); g.fillStyle(themeColorNum('ignite'),1); g.fillCircle(bx,by,1.2); }
        // LEO depot arc gauge
        if(am.depotT>0){ const cap=Math.max(am.depotT,120), frac=Math.min(1,am.depotT/cap);
          const rr=o.rad+5, a0=-Math.PI*0.75, a1=a0+frac*Math.PI*1.5;
          g.lineStyle(2,themeColorNum('readout'),0.9); g.beginPath(); g.arc(o.x,o.y,rr,a0,a1,false); g.strokePath(); } } }
    drawSel(){ const g=this.selRing; g.clear(); const o=this.bodies.find(q=>q.b.id===state.selectedBody); if(o){ g.lineStyle(1.5,themeColorNum('ignite'),1); g.strokeCircle(o.x,o.y,o.rad+3); } }
  };
}
function ensureMapHost(){ const host=$('mapHost'); if(!host) return false; host.style.display='block'; const c=$('mapCanvas'); if(c) c.style.display='none'; return true; }
function startMapScene(){
  defineMapScene();
  if(!ensureMapHost()) return false;
  try{
    if(!mapGame){
      mapGame=new Phaser.Game({ type:Phaser.AUTO, parent:'mapHost', width:MAP_W, height:MAP_H, backgroundColor:'#05080d', banner:false, audio:{noAudio:true}, scale:{mode:Phaser.Scale.NONE}, scene:[MapScene] });
      const c=mapGame.canvas; if(c){ c.style.maxWidth='100%'; c.style.height='auto'; c.style.display='block'; }
    } else resumeMapGame();
    return true;
  }catch(e){ console.warn('map scene failed, using SVG:',e); const h=$('mapHost'); if(h) h.style.display='none'; const c=$('mapCanvas'); if(c) c.style.display='block'; return false; }
}
function pauseMapGame(){ if(mapGame){ try{ if(mapGame.scene.isActive('solarmap')) mapGame.scene.sleep('solarmap'); }catch(e){} } } // E0.5-A: sleep, not pause (stop render)
function resumeMapGame(){ if(mapGame){ try{ mapGame.scene.wake('solarmap'); }catch(e){} } }
function renderMap(){
  const mv=$('mapView'); if(mv) mv.classList.toggle('expanded', mapExpanded);
  const eb=$('mapExpandBtn'); if(eb) eb.textContent = mapExpanded ? '⛶ Exit full screen' : '⛶ Expand';
  const es=$('empireStripWrap'); if(es) es.innerHTML=empireStripHTML(); // empire ledger — both render paths
  if(phaserOK() && startMapScene()){ renderBodyCard(); renderMapActivity(); return; }
  const W=720,H=460; let svg;
  if(!state.mapZoom){ svg=renderMapOverview(W,H); }
  else { svg=renderMapZoom(W,H,state.mapZoom); }
  $('mapCanvas').innerHTML=svg;
  renderBodyCard();
  renderMapActivity();
}
/* ---------- Station Bench ----------
   STALE COMMENT CORRECTED (#73 Slice 0, 2026-07-11): this used to describe a framework stub — it
   isn't one. Real assembly (module library, per-facility fs.moduleList[], typed production,
   power-starve, port caps, dock palette) shipped 2026-07-02 (commit 5c60c8c) and lives in
   renderStation()/renderStationStackSVG()/renderStationFacilityStats() + sim.js's facility* functions,
   all pure-SVG. What's still genuinely missing (see #73 in ROADMAP.md/BACKLOG.md): docking a module is
   an instant purchase today, not a real launch — that's the actual remaining "launch modules, dock"
   scope, sliced separately.
   The StationScene class below (Phaser pan/zoom of a single sample module) predates that real
   assembly work and is now DEAD CODE — startStationScene() is never called; renderStation() always
   takes the SVG path. Left in place rather than deleted here (Slice 0 is a truth-pass, not a debloat
   pass) — a real candidate for a future cleanup commit. */
const STN_W=760, STN_H=480;
function stationActiveModule(){ return STATION_MODULES[0]; } // only the (dead) StationScene below still calls this
let stationExpanded=false;
let stationPanX=0, stationPanY=0, stationZoom=1;
function stationViewBox(W,H,zoom){
  const vw=W/zoom, vh=H/zoom;
  return `${stationPanX+(W-vw)/2} ${stationPanY+(H-vh)/2} ${vw} ${vh}`;
}
function setStationZoom(z){ stationZoom=Math.max(.65,Math.min(3,Number(z)||1)); renderStation(); }
function zoomStation(f){ setStationZoom(stationZoom*f); }
function resetStationView(){ stationPanX=0; stationPanY=0; stationZoom=1; renderStation(); }
function toggleStationExpand(){ stationExpanded=!stationExpanded; renderStation(); }
let StationScene=null, stationGame=null, stationScene=null;
function defineStationScene(){
  if(StationScene || !phaserOK()) return;
  StationScene=class extends Phaser.Scene{
    constructor(){ super('station'); }
    create(){
      this.cam=this.cameras.main; this.cam.setBackgroundColor('#070b11');
      for(let i=0;i<80;i++){ this.add.circle((Math.random()-0.5)*STN_W*3,(Math.random()-0.5)*STN_H*3, Math.random()*1.1+0.3, 0xffffff, 0.08+Math.random()*0.4).setScrollFactor(0.4); }
      this.g=this.add.graphics(); this.labels=[];
      this.drawModule(stationActiveModule());
      // fit + centre, then drag-to-pan / wheel-to-zoom, exactly like the Solar System scene
      const mod=stationActiveModule(), span=Math.max(mod.len, 360)+220;
      this.fitZoom=Math.min(STN_W/span, STN_H/(mod.dia+360));
      this.cam.centerOn(0,0); this.cam.setZoom(this.fitZoom);
      this.input.on('pointermove',p=>{ if(p.isDown){ this.cam.scrollX-=(p.x-p.prevPosition.x)/this.cam.zoom; this.cam.scrollY-=(p.y-p.prevPosition.y)/this.cam.zoom; } });
      this.input.on('wheel',(p,go,dx,dy)=>{ this.cam.setZoom(Phaser.Math.Clamp(this.cam.zoom*(dy>0?0.88:1.14), this.fitZoom*0.5, this.fitZoom*10)); });
      stationScene=this;
    }
    drawModule(mod){
      const g=this.g; g.clear(); this.labels.forEach(t=>t.destroy()); this.labels=[];
      const L=mod.len, hd=mod.dia/2;
      // solar wings (behind the hull)
      [-1,1].forEach(sgn=>{ const wy=sgn*(hd+24), wh=110, ww=150;
        g.fillStyle(0x12243a,1); g.fillRect(-ww/2, sgn>0?wy:wy-wh, ww, wh);
        g.lineStyle(1,0x2f5a8a,0.9); for(let c=-ww/2;c<=ww/2;c+=16){ g.beginPath(); g.moveTo(c, sgn>0?wy:wy-wh); g.lineTo(c, sgn>0?wy+wh:wy); g.strokePath(); }
        g.lineStyle(2,0x6a7782,1); g.beginPath(); g.moveTo(0,sgn*hd); g.lineTo(0,wy); g.strokePath(); }); // boom
      // radiator (one side)
      g.fillStyle(0x20262c,1); g.fillRect(-95-46, hd+8, 92, 54); g.lineStyle(1,0x3a444d,1); for(let r=hd+8;r<=hd+62;r+=10){ g.beginPath(); g.moveTo(-95-46,r); g.lineTo(-95+46,r); g.strokePath(); }
      // pressurized hull (cylinder side view: body + end domes)
      g.fillStyle(0xb8c0c7,1); g.fillRect(-L/2, -hd, L, mod.dia);
      g.fillStyle(0x9aa3ab,1); g.fillEllipse(L/2, 0, 34, mod.dia); g.fillEllipse(-L/2, 0, 34, mod.dia); // domes
      g.lineStyle(2,0x6c757d,1); g.strokeRect(-L/2,-hd,L,mod.dia);
      g.lineStyle(1,0x8b949c,0.8); for(let x=-L/2+24;x<L/2;x+=28){ g.beginPath(); g.moveTo(x,-hd); g.lineTo(x,hd); g.strokePath(); } // ring frames
      g.fillStyle(0x33424d,1); for(let x=-L/2+44;x<L/2-20;x+=52){ g.fillCircle(x,-hd*0.35,5); } // windows row
      // micrometeoroid blanket hint
      g.lineStyle(1,0xcfd6db,0.5); g.strokeRect(-L/2+6,-hd+6,L-12,mod.dia-12);
      // axial docking node (forward)
      g.fillStyle(0x7e8990,1); g.fillRect(L/2+22, -16, 26, 32); g.lineStyle(2,0x586066,1); g.strokeRect(L/2+22,-16,26,32);
      g.fillStyle(0x2a333a,1); g.fillCircle(L/2+48, 0, 11);
      // radial berthing ports (top + bottom)
      [-1,1].forEach(sgn=>{ g.fillStyle(0x7e8990,1); g.fillRect(-16, sgn>0?hd:-hd-18, 32, 18); g.fillStyle(0x2a333a,1); g.fillEllipse(0, sgn>0?hd+16:-hd-16, 22, 12); });
      // antennas: dish (aft-top) + whip (fwd-top)
      const dx=-70,dy=-hd-30; g.lineStyle(2,0x9aa3ab,1); g.beginPath(); g.moveTo(dx,-hd); g.lineTo(dx,dy); g.strokePath();
      g.lineStyle(2,0xcdd3d8,1); g.beginPath(); g.arc(dx,dy,15,Math.PI*0.15,Math.PI*0.85); g.strokePath(); g.fillStyle(0xcdd3d8,1); g.fillCircle(dx,dy,2);
      const wx=70; g.lineStyle(1.5,0xbfc7cf,1); g.beginPath(); g.moveTo(wx,-hd); g.lineTo(wx,-hd-34); g.strokePath(); g.fillStyle(0xffd07a,1); g.fillCircle(wx,-hd-34,2.5);
      // handrails along the hull
      g.lineStyle(1.4,0xf5c84a,0.85); g.beginPath(); g.moveTo(-L/2+20,-hd+10); g.lineTo(L/2-20,-hd+10); g.strokePath();
      // annotation leader lines + labels
      for(const pr of mod.parts){ g.lineStyle(1,themeColorNum('readout'),0.55); g.beginPath(); g.moveTo(pr.x,pr.y); const lx=pr.x+(pr.x>=0?60:-60), ly=pr.y+(pr.y>=0?40:-40); g.lineTo(lx,ly); g.strokePath();
        g.fillStyle(themeColorNum('readout'),1); g.fillCircle(pr.x,pr.y,2.4);
        const t=this.add.text(lx+(pr.x>=0?4:-4), ly, pr.label, {fontFamily:'ui-monospace,monospace',fontSize:'11px',color:themeColor('readout')}).setOrigin(pr.x>=0?0:1,0.5);
        this.labels.push(t); }
      const title=this.add.text(0,-STN_H*0.5+10, mod.name, {fontFamily:'ui-monospace,monospace',fontSize:'13px',color:themeColor('muted')}).setOrigin(0.5,0); this.labels.push(title);
    }
  };
}
function ensureStationHost(){ const host=$('stationHost'); if(!host) return false; host.style.display='block'; const c=$('stationCanvas'); if(c) c.style.display='none'; return true; }
function startStationScene(){
  defineStationScene();
  if(!ensureStationHost()) return false;
  try{
    if(!stationGame){
      stationGame=new Phaser.Game({ type:Phaser.AUTO, parent:'stationHost', width:STN_W, height:STN_H, backgroundColor:'#070b11', banner:false, audio:{noAudio:true}, scale:{mode:Phaser.Scale.NONE}, scene:[StationScene] });
      const c=stationGame.canvas; if(c){ c.style.maxWidth='100%'; c.style.height='auto'; c.style.display='block'; }
    } else resumeStationGame();
    return true;
  }catch(e){ console.warn('station scene failed, using SVG:',e); const h=$('stationHost'); if(h) h.style.display='none'; const c=$('stationCanvas'); if(c) c.style.display='block'; return false; }
}
function pauseStationGame(){ if(stationGame){ try{ if(stationGame.scene.isActive('station')) stationGame.scene.sleep('station'); }catch(e){} } } // E0.5-A: sleep, not pause (stop render)
function resumeStationGame(){ if(stationGame){ try{ stationGame.scene.wake('station'); }catch(e){} } }
/* ---------- Station blueprint mode (pre-facility drawing board) ----------
   Before any facility exists, the Station Bench is a free design sandbox: assemble a
   blueprint, watch the engineering totals react, and carry the plan (it saves) until
   Crewed Orbit makes the real thing possible. Dreaming is free; hardware is not. */
function stationDraftFs(){ state.stationDraft=state.stationDraft&&state.stationDraft.length?state.stationDraft:['can_std']; return {moduleList:state.stationDraft}; }
function draftAdd(modId){
  const fs=stationDraftFs();
  if(fs.moduleList.length>=facilityPortCap(fs) && modId!=='node_hub'){ log('note','Blueprint: all ports occupied — add a Docking Node for growth room.'); render(); return; }
  fs.moduleList.push(modId); state.stationDraft=fs.moduleList; render();
}
function draftRemove(){ const fs=stationDraftFs(); if(fs.moduleList.length>1) fs.moduleList.pop(); state.stationDraft=fs.moduleList; render(); }
function draftClear(){ state.stationDraft=['can_std']; render(); }
function draftCostAt(defId){
  const def=facilityById(defId); if(!def) return 0;
  const fs={moduleList:[]}; let cost=0;
  stationDraftFs().moduleList.forEach((id,i)=>{ const md=stationModuleDef(id); if(!md) return;
    if(i===0){ fs.moduleList.push(id); return; } // the core comes with founding the facility
    cost+=stationModuleCost(def, fs, md); fs.moduleList.push(id); });
  return round2(cost);
}
// Draft-mode stats panel, extracted so the station pop-out can show the identical blueprint stats
// (Slice 0) instead of duplicating this markup a second time.
function stationDraftStatsHTML(fs){
  const list=fs.moduleList;
  const pw=facilityPower(fs), crew=facilityCrew(fs), cap=facilityPortCap(fs);
  const mass=list.reduce((a,id)=>a+(((stationModuleDef(id)||{}).stats||{}).mass||0),0);
  const gated=[...new Set(list.filter(id=>{ const md=stationModuleDef(id); return md&&md.reqResearch&&!state.research[md.reqResearch]; })
    .map(id=>((RESEARCH.find(r=>r.id===stationModuleDef(id).reqResearch)||{}).name)||''))].filter(Boolean);
  const cell=(k,v,sub)=>`<div class="metric"><div class="k">${k}</div><div class="v">${v}</div>${sub?`<div class="dim" style="font-size:12px">${sub}</div>`:''}</div>`;
  return `<div class="mission-tag">Blueprint — drawing board</div>
      <p class="muted" style="font-size:12px;margin:4px 0 10px">No facilities exist yet — design freely. Found the real thing from <b>Command Center → Infrastructure</b> once <b>Crewed Orbit</b> is flown, then build it out module by module at these prices.</p>
      <div class="metrics">
        ${cell('Modules', list.length+' / '+cap+' ports')}
        ${cell('Mass', mass.toFixed(1)+' t')}
        ${cell('Power', (pw.net>=0?'+':'')+pw.net+' kW', pw.gen+' gen − '+pw.draw+' draw')}
        ${cell('Crew', crew.cap+' berths'+(crew.req?' / '+crew.req+' needed':''))}
        ${cell('Build-out at LEO', fM(draftCostAt('leo_station')), 'beyond the founding cost')}
        ${cell('…on the Moon / Mars', fM(draftCostAt('lunar_base'))+' / '+fM(draftCostAt('mars_base')))}
      </div>
      ${pw.net<0?`<div class="flag warn">△ Power-negative — this design would run at 60% output. Add a Solar Power Truss.</div>`:''}
      ${crew.req>crew.cap?`<div class="flag warn">△ Under-crewed — ${crew.req} crew needed, ${crew.cap} berths. Output would degrade.</div>`:''}
      ${gated.length?`<div class="flag warn">🔒 Blueprint uses research you don't have yet: ${gated.join(', ')}.</div>`:''}`;
}
function renderStationDraft(){
  const c=$('stationCanvas'), st=$('stationStats');
  const fs=stationDraftFs();
  if(c){
    const cards=STATION_MODULES.map(md=>stationModuleCard(md, {def:facilityById('leo_station')||FACILITY_DEFS[0], fs}, false)).join('');
    c.innerHTML=renderStationStackSVG(720,280,{fs},true)
      +`<div style="display:flex;gap:6px;margin:8px 0 4px">
          <button class="btn ghost" style="font-size:12px" onclick="draftRemove()">↶ Remove last</button>
          <button class="btn ghost" style="font-size:12px" onclick="draftClear()">✕ Clear blueprint</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${cards}</div>`;
  }
  wireStationPan(c);
  const zl=$('stationZoomLabel'); if(zl) zl.textContent=Math.round(stationZoom*100)+'%';
  if(st) st.innerHTML=stationDraftStatsHTML(fs);
}

function wireStationPan(el){
  if(!el || el._stationPanWired) return;
  el._stationPanWired=true;
  let dragging=false,lastX=0,lastY=0;
  el.addEventListener('pointerdown',e=>{
    if(!e.target.closest('#stationSvg')) return;
    dragging=true; lastX=e.clientX; lastY=e.clientY; el.setPointerCapture?.(e.pointerId);
    const svg=$('stationSvg'); if(svg) svg.style.cursor='grabbing';
  });
  el.addEventListener('pointermove',e=>{
    if(!dragging) return;
    const svg=$('stationSvg'); const z=Number(svg?.dataset.zoom||1);
    stationPanX-=(e.clientX-lastX)/z; stationPanY-=(e.clientY-lastY)/z; lastX=e.clientX; lastY=e.clientY;
    if(svg) svg.setAttribute('viewBox',stationViewBox(Number(svg.dataset.bw),Number(svg.dataset.bh),z));
  });
  el.addEventListener('wheel',e=>{
    if(!e.target.closest('#stationSvg')) return;
    e.preventDefault(); zoomStation(e.deltaY<0?1.12:1/1.12);
  },{passive:false});
  const stop=e=>{ if(!dragging) return; dragging=false; try{ el.releasePointerCapture?.(e.pointerId); }catch(err){} const svg=$('stationSvg'); if(svg) svg.style.cursor='grab'; };
  el.addEventListener('pointerup',stop); el.addEventListener('pointercancel',stop);
}

// #73 Slice 0 (2026-07-11): single source of truth for "what should the Station Bench show right
// now" — the focused real facility, or the pre-facility blueprint draft. Both renderStation() (main
// view) and the station pop-out read from this, so they can no longer independently drift out of sync
// the way the pop-out did (it was stuck on a hardcoded sample module while the real bench moved on).
function stationCurrentView(){
  const built=Object.keys(state.facilities||{}).map(id=>({def:facilityById(id), fs:state.facilities[id]})).filter(x=>x.def&&facilityBuilt(x.def.id));
  if(!built.length) return {built:null, cur:{fs:stationDraftFs()}, isDraft:true};
  if(!state.stationFocus || !built.some(b=>b.def.id===state.stationFocus)) state.stationFocus=built[0].def.id;
  return {built, cur:built.find(b=>b.def.id===state.stationFocus), isDraft:false};
}
// Facility-tab click handler shared by the main view and the pop-out (renderStationFacilityStats'
// tabs call this) — refreshes whichever is currently showing, so switching facilities never leaves
// one of the two views stale.
function setStationFocus(id){ state.stationFocus=id; renderStation(); refreshStationPopout(); }
function renderStation(){
  const sv=$('stationView'); if(sv) sv.classList.toggle('expanded', stationExpanded);
  const eb=$('stationExpandBtn'); if(eb) eb.textContent = stationExpanded ? '⛶ Exit full screen' : '⛶ Expand';
  const v=stationCurrentView();
  if(v.isDraft){ renderStationDraft(); return; } // pre-facility: free blueprint drawing board
  const c=$('stationCanvas'), st=$('stationStats'), cur=v.cur;
  if(c) c.innerHTML=renderStationStackSVG(720,300,cur,true)+renderStationPalette(cur);
  const zl=$('stationZoomLabel'); if(zl) zl.textContent=Math.round(stationZoom*100)+'%';
  wireStationPan(c);
  if(st) st.innerHTML=renderStationFacilityStats(v.built, cur);
}
// Facility tabs + aggregate stats for the focused facility
function renderStationFacilityStats(built, cur){
  const tabs=built.map(b=>`<button class="btn ${b.def.id===state.stationFocus?'launch':'ghost'}" style="font-size:12px" onclick="setStationFocus('${b.def.id}')">${b.def.icon} ${b.def.name}</button>`).join(' ');
  const fs=cur.fs, def=cur.def, list=facilityModuleList(fs), pw=facilityPower(fs), pr=facilityProduction(def,fs), ops=stationOps(fs);
  const mass=list.reduce((a,id)=>a+((stationModuleDef(id)||{}).stats||{}).mass||0,0);
  const crew=facilityCrew(fs), crewSlots=list.reduce((n,id)=>n+((stationModuleDef(id)?.stats?.crew)||0),0), syn=facilitySynergies(fs);
  const cell=(k,v,sub)=>`<div class="metric"><div class="k">${k}</div><div class="v">${v}</div>${sub?`<div class="dim" style="font-size:12px">${sub}</div>`:''}</div>`;
  const crewColor = crew.factor>=1?'var(--ok)':crew.factor>=0.7?'var(--warn)':'var(--bad)';
  const synHTML = syn.length
    ? `<div style="margin-top:8px"><div class="mission-tag">Synergies active</div>${syn.map(s=>{
        const bits=['income','fuel','rep','sci'].filter(k=>s[k]).map(k=>`+${Math.round(s[k]*100)}% ${k}`).join(' · ');
        return `<div class="flag ok" style="margin:3px 0">✦ ${s.label} — ${bits}</div>`; }).join('')}</div>`
    : `<div class="dim" style="font-size:12px;margin-top:8px">No synergies yet — pair a Lab or Greenhouse with a Habitat, keep power in surplus, or back a Depot with a Power Truss.</div>`;
  const condition=Math.round(stationCondition(fs)), maintCost=stationMaintenanceCost(def.id), maintColor=condition>=70?'var(--ok)':condition>=35?'var(--warn)':'var(--bad)';
  const crewNames=stationCrewIds(fs).map(id=>personById(id)?.name||id);
  const candidates=stationCrewCandidates();
  const crewHTML=ops.crewManaged
    ? `<div class="dim" style="font-size:12px;margin-top:8px">Station crew: ${crewNames.length?crewNames.join(', '):'none assigned'} · rotation ${stationRotationDue(fs)?'<span style="color:var(--warn)">due now</span>':`due in ${Math.max(0,ops.rotationDueAbs-absMonth())} mo`}</div>
       <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px">
         ${candidates.length&&crewNames.length<crewSlots?`<select class="btn ghost" style="font-size:11px" onchange="assignStationCrew('${def.id}',this.value);this.value=''" aria-label="Assign astronaut"><option value="">Assign astronaut…</option>${candidates.map(s=>`<option value="${s.id}">${esc(personById(s.id).name)}</option>`).join('')}</select>`:''}
         ${crewNames.length&&stationRotationDue(fs)?`<button class="btn ghost" style="font-size:11px" onclick="rotateStationCrew('${def.id}')">↻ Rotate crew</button>`:''}
         ${crewNames.map(id=>`<button class="btn ghost" style="font-size:11px" onclick="removeStationCrew('${def.id}','${id}')">Relieve ${esc(personById(id)?.name||id)}</button>`).join('')}
       </div>`
    : `<div class="dim" style="font-size:12px;margin-top:8px">Crew management is off — modules provide legacy crew capacity. Assign an astronaut to begin station rotations.</div>
       ${candidates.length?`<select class="btn ghost" style="font-size:11px;margin-top:5px" onchange="assignStationCrew('${def.id}',this.value);this.value=''" aria-label="Assign astronaut"><option value="">Assign astronaut…</option>${candidates.map(s=>`<option value="${s.id}">${esc(personById(s.id).name)}</option>`).join('')}</select>`:''}`;
  const contract=stationContractActive(fs), contractCost=resupplyContractCost(def.id);
  const contractHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px;font-size:12px"><span class="dim">Resupply contract</span><span>${contract?`active · ${Math.max(0,ops.resupplyContract.untilAbs-absMonth())} mo left`:'none'}</span></div>
    <div style="display:flex;gap:6px;margin-top:5px">${contract?`<button class="btn ghost" style="font-size:11px" onclick="cancelResupplyContract('${def.id}')">Cancel contract</button>`:`<button class="btn ghost" style="font-size:11px" onclick="signResupplyContract('${def.id}')" ${state.money>=contractCost?'':'disabled'}>Sign · ${fM(contractCost)} setup</button>`}<button class="btn ghost" style="font-size:11px" onclick="repairStation('${def.id}')" ${maintCost>0&&state.money>=maintCost?'':'disabled'}>Repair · ${fM(maintCost)}</button></div>`;
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${tabs}</div>
    <div class="mission-tag">${def.name} — ${list.length} module${list.length>1?'s':''} / ${facilityPortCap(fs)} ports</div>
    <div class="metrics">
      ${cell('Mass', mass.toFixed(1)+' t')}
      ${cell('Crew', `<span style="color:${crewColor}">${crew.cap}/${crew.req||0}</span>`, crew.req>0?(crew.factor>=1?'fully crewed':`${Math.round(crew.factor*100)}% output — short ${crew.req-crew.cap} crew`):'no crew needed')}
      ${cell('Power', (pw.net>=0?'+':'')+pw.net+' kW', pw.gen+' gen − '+pw.draw+' draw')}
      ${cell('Income', '+'+fM(pr.income)+'/mo')}
      ${cell('Science', '+'+pr.sci.toFixed(1)+'/mo')}
      ${cell('Resupply', fM(resupplyCostFull(def.id))+'/mo', facilityGreenhouses(fs)?facilityGreenhouses(fs)+' greenhouse':'')}
      ${cell('Condition', `<span style="color:${maintColor}">${condition}%</span>`, `${Math.round(stationMaintenanceFactor(fs)*100)}% output factor`)}
    </div>
    ${pw.net<0?`<div class="flag warn">△ Power-starved — production running at 60%. Dock a Solar Power Truss.</div>`:''}
    ${crew.req>crew.cap?`<div class="flag warn">△ Under-crewed (${crew.cap}/${crew.req}) — output at ${Math.round(crew.factor*100)}%. Dock a Habitat (each adds 3 crew).</div>`:''}
    ${list.length>=facilityPortCap(fs)?`<div class="flag warn">△ All ${facilityPortCap(fs)} ports occupied — a Docking Node adds 3 more.</div>`:''}
    ${synHTML}${crewHTML}${contractHTML}`;
}
// Radial station renderer: the save model remains an ordered module list, but the bench now
// lays modules out across a docking grid instead of flattening them into a left/right chain.
const STATION_LAYOUT_SLOTS=[[0,0],[1,0],[-1,0],[0,-1],[0,1],[2,0],[-2,0],[0,-2],[0,2],[1,-1],[-1,-1],[1,1],[-1,1],[3,0],[-3,0],[0,-3],[0,3]];
function stationModuleSVG(id,d,x,y,scale){
  const L=Math.max(92,(d.len||150)*0.48)*scale, hd=Math.max(18,(d.dia||80)*0.30)*scale, c=d.color||'#b8c0c7';
  const stroke='#81909b', dark='#0a1520', glow=`filter="url(#stnGlow)"`;
  const hull=`<rect x="${-L/2}" y="${-hd}" width="${L}" height="${hd*2}" rx="${Math.min(14,hd*.28)}" fill="url(#g-${id})" stroke="${stroke}" stroke-width="1.5"/>`;
  let g=`<g transform="translate(${x} ${y})">`;
  if(id==='power_truss'){
    g+=`<g ${glow}><path d="M ${-L/2} 0 H ${L/2}" stroke="#bac6d0" stroke-width="6"/><path d="M ${-L/2} -9 L ${L/2} 9 M ${-L/2} 9 L ${L/2} -9" stroke="#e8b64c" stroke-width="1.5"/>`;
    for(const sy of [-1,1]){ const py=sy*(hd+32*scale), ph=34*scale; g+=`<rect x="${-L*.42}" y="${py-(sy<0?ph:0)}" width="${L*.84}" height="${ph}" rx="2" fill="#132d4a" stroke="#4f87b7"/><path d="M ${-L*.42} ${py-(sy<0?ph:0)+ph/2} H ${L*.42}" stroke="#78b9e8" stroke-width=".8"/>`; for(let i=-3;i<=3;i++) g+=`<path d="M ${i*L*.12} ${py-(sy<0?ph:0)} V ${py-(sy<0?ph:0)+ph}" stroke="#3b6790" stroke-width=".7"/>`; } g+=`</g>`;
  } else if(id==='node_hub'){
    const r=Math.max(28,hd*1.25); g+=`<g ${glow}><circle r="${r}" fill="url(#g-node_hub)" stroke="${stroke}" stroke-width="2"/><circle r="${r*.55}" fill="none" stroke="#d3dbe2" stroke-opacity=".45"/>`;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) g+=`<g transform="translate(${dx*r} ${dy*r}) rotate(${dx?90:0})"><rect x="-8" y="-14" width="16" height="28" rx="3" fill="#778793" stroke="#c4d0d8"/><circle cy="-7" r="3" fill="#263743"/><circle cy="7" r="3" fill="#263743"/></g>`; g+=`</g>`;
  } else if(id==='depot_mod'){
    g+=`<g ${glow}>${hull}<ellipse rx="${L*.26}" ry="${hd*.72}" fill="none" stroke="#2d714a" stroke-width="3"/><ellipse rx="${L*.17}" ry="${hd*.52}" fill="none" stroke="#8bd69b" stroke-width="1.3"/><path d="M ${-L*.38} 0 H ${L*.38} M 0 ${-hd*.7} V ${hd*.7}" stroke="#69bd82" stroke-width="1.2"/><circle cx="${L*.4}" r="5" fill="#f0c66a"/><path d="M ${L*.4} 6 v 18 h 18" stroke="#8bd69b" fill="none" stroke-width="2"/></g>`;
  } else if(id==='greenhouse'){
    g+=`<g ${glow}><path d="M ${-L/2} ${hd} V ${-hd*.25} Q 0 ${-hd*1.35} ${L/2} ${-hd*.25} V ${hd} Z" fill="#173a27" fill-opacity=".85" stroke="#8fd27a" stroke-width="1.6"/>`;
    for(let i=-2;i<=2;i++) g+=`<path d="M ${i*L*.15} ${hd*.88} V ${-hd*.18} Q ${i*L*.15} ${-hd*.78} ${i*L*.15} ${-hd*.18}" stroke="#5ba967" stroke-width="1"/><path d="M ${i*L*.15-9} ${hd*.82} q 5 -9 10 0 q -5 7 -10 0 M ${i*L*.15-8} ${hd*.55} q 5 -9 10 0 q -5 7 -10 0" fill="#8ed477"/>`; g+=`<path d="M ${-L*.42} ${hd*.55} H ${L*.42} M ${-L*.42} ${hd*.78} H ${L*.42}" stroke="#c3e98f" stroke-width="1" opacity=".7"/></g>`;
  } else if(id==='lab_mod'){
    g+=`<g ${glow}>${hull}<rect x="${-L*.32}" y="${-hd*.72}" width="${L*.64}" height="${hd*1.44}" rx="4" fill="#183c59" stroke="#8bd3f4"/><path d="M ${-L*.25} ${-hd*.58} H ${L*.25} M ${-L*.25} 0 H ${L*.25} M ${-L*.25} ${hd*.58} H ${L*.25}" stroke="#65b9df"/>`; for(let i=-2;i<=2;i++) g+=`<circle cx="${i*L*.11}" cy="${-hd*.25}" r="3" fill="#d7f2ff"/><circle cx="${i*L*.11}" cy="${hd*.3}" r="3" fill="#f0c66a"/>`; g+=`<path d="M ${-L*.42} ${-hd*.84} h ${L*.84}" stroke="#f2cf72" stroke-width="2"/><circle cx="${L*.38}" cy="${-hd*1.15}" r="7" fill="#bce9ff" stroke="#6aa6c7"/></g>`;
  } else {
    g+=`<g ${glow}>${hull}<path d="M ${-L*.38} ${-hd} V ${hd} M ${-L*.12} ${-hd} V ${hd} M ${L*.14} ${-hd} V ${hd}" stroke="#ffffff" stroke-opacity=".3"/>`;
    for(let i=-2;i<=2;i++) g+=`<circle cx="${i*L*.13}" cy="${-hd*.25}" r="${Math.max(2,3*scale)}" fill="#d7f2ff" stroke="#587789"/>`;
    g+=`<path d="M ${-L*.38} ${hd*.55} H ${L*.38}" stroke="#f0c66a" stroke-width="2"/><path d="M ${-L*.2} ${-hd*.65} H ${L*.2}" stroke="#dbe4ea" stroke-width="1"/></g>`;
  }
  // Common small-scale orbital hardware: CBM rings, handrails, cable runs, antenna booms,
  // radiator fins and external equipment boxes keep the silhouettes from reading as flat cans.
  g+=`<path d="M ${-L*.36} ${-hd*.72} H ${L*.36} M ${-L*.36} ${hd*.72} H ${L*.36}" stroke="#f1c95f" stroke-width="1.4" stroke-dasharray="5 3"/><path d="M ${-L*.22} ${-hd*.98} V ${-hd*.72} M ${L*.22} ${hd*.98} V ${hd*.72}" stroke="#d9e3e9" stroke-width="1"/><rect x="${-L*.28}" y="${hd*.72}" width="${L*.14}" height="${hd*.22}" rx="2" fill="#354955" stroke="#b0c0c9"/><rect x="${L*.12}" y="${-hd*.94}" width="${L*.16}" height="${hd*.2}" rx="2" fill="#354955" stroke="#b0c0c9"/><path d="M ${L*.28} ${-hd} q ${L*.14} -${hd*.8} ${L*.28} -${hd*1.12}" fill="none" stroke="#b9c8d2" stroke-width="1"/><circle cx="${L*.56}" cy="-${hd*1.12}" r="3" fill="#f0c66a"/><path d="M ${-L*.5} ${hd*1.05} h ${L*.18} l 5 6 h ${L*.22}" fill="none" stroke="#9eb1bc" stroke-width="1"/><circle cx="${L/2+8}" r="6" fill="#293b47" stroke="#b9c8d2"/><circle cx="${-L/2-8}" r="6" fill="#293b47" stroke="#b9c8d2"/><circle cx="${L/2+8}" r="3" fill="#dce8ef" opacity=".7"/><circle cx="${-L/2-8}" r="3" fill="#dce8ef" opacity=".7"/><text y="${hd+18}" fill="#c1cfda" font-size="10" font-family="ui-monospace,monospace" text-anchor="middle" letter-spacing="1">${esc(d.short||id)}</text></g>`;
  return g;
}
function renderStationStackSVG(W,H,cur,interactive){
  const list=facilityModuleList(cur.fs), cell=112, slots=list.map((id,i)=>STATION_LAYOUT_SLOTS[i]||[i%5-2,Math.floor(i/5)+1]);
  const minX=Math.min(...slots.map(p=>p[0]))-1,maxX=Math.max(...slots.map(p=>p[0]))+1,minY=Math.min(...slots.map(p=>p[1]))-1,maxY=Math.max(...slots.map(p=>p[1]))+1;
  const scale=Math.min(1.25,(W-28)/((maxX-minX)*cell),(H-28)/((maxY-minY)*cell));
  const ox=W/2-(minX+maxX)*cell*scale/2, oy=H/2-(minY+maxY)*cell*scale/2;
  const viewBox=interactive?stationViewBox(W,H,stationZoom):`0 0 ${W} ${H}`;
  let s=`<svg id="${interactive?'stationSvg':''}" data-bw="${W}" data-bh="${H}" data-zoom="${interactive?stationZoom:1}" viewBox="${viewBox}" width="${W}" height="${H}" style="max-width:100%;height:auto;background:#060d16;border-radius:8px 8px 0 0;cursor:${interactive?'grab':'default'};touch-action:none"><defs><filter id="stnGlow"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><pattern id="stnGrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#6a9ab8" stroke-opacity=".08"/></pattern>${STATION_MODULES.map(d=>`<linearGradient id="g-${d.id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${d.color}" stop-opacity=".95"/><stop offset=".48" stop-color="${d.color}"/><stop offset="1" stop-color="#293743"/></linearGradient>`).join('')}</defs><rect x="${-W*2}" y="${-H*2}" width="${W*5}" height="${H*5}" fill="#060d16"/><rect width="100%" height="100%" fill="url(#stnGrid)"/><text x="14" y="20" fill="#9bb6c8" font-size="10" font-family="ui-monospace,monospace" letter-spacing="1.5">ORBITAL ASSEMBLY PLAN · RADIAL DOCKING GRID</text>`;
  const pts=slots.map(([gx,gy])=>[ox+gx*cell*scale,oy+gy*cell*scale]);
  for(let i=1;i<pts.length;i++){ const parent=i<=4?0:Math.max(0,Math.floor((i-1)/4)); const [x1,y1]=pts[parent],[x2,y2]=pts[i]; s+=`<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="#6e8999" stroke-opacity=".5" stroke-width="3" stroke-dasharray="5 4"/><circle cx="${x2}" cy="${y2}" r="4" fill="#d4b35e"/>`; }
  list.forEach((id,i)=>{ const d=stationModuleDef(id)||stationModuleDef('can_std'),[x,y]=pts[i]; s+=stationModuleSVG(id,d,x,y,scale); });
  s+=`<text x="${W-14}" y="${H-12}" fill="#718898" font-size="9" font-family="ui-monospace,monospace" text-anchor="end">${list.length} MODULE${list.length===1?'':'S'} · ${facilityPortCap(cur.fs)} BERTHS</text></svg>`;
  return s;
}
// Palette of dockable modules with cost/gates
function renderStationPalette(cur){
  const cards=STATION_MODULES.map(md=>stationModuleCard(md, cur, true)).join('');
  return `<div style="margin-top:10px"><div class="mission-tag" style="margin-bottom:6px">Modules — dock to grow ${cur.def.name}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">${cards}</div></div>`;
}
// One rich module spec card. mode: live docking (real facility) when addable=true; blueprint otherwise.
function stationModuleCard(md, cur, addable){
  const st=md.stats||{};
  const netPower=(st.powerGenKw||0)-(st.powerDrawKw||0);
  // production line, in the same currency the stats panel uses
  const prod=md.prod||{};
  const prodBits=[];
  if(prod.income) prodBits.push(`<span style="color:var(--ok)">+${fM(prod.income)}/mo</span>`);
  if(prod.sci)    prodBits.push(`<span style="color:#5aa9e0">+${prod.sci} sci</span>`);
  if(prod.fuel)   prodBits.push(`<span style="color:#67c587">+${prod.fuel} t fuel</span>`);
  if(prod.rep)    prodBits.push(`<span style="color:#c9b06b">+${prod.rep} rep</span>`);
  const specRow=(k,v,color)=>`<div style="display:flex;justify-content:space-between;gap:8px;font-family:var(--mono);font-size:11px;padding:1px 0"><span class="dim">${k}</span><span style="color:${color||'var(--ink)'}">${v}</span></div>`;
  // live context vs THIS station (only when docking to a real facility)
  let context='';
  if(cur && cur.fs){
    const fs=cur.fs, pwNow=facilityPower(fs), crewNow=facilityCrew(fs);
    const pwAfter=pwNow.net+netPower;
    const bits=[];
    if(netPower<0){ bits.push(pwAfter<0
      ? `<span style="color:var(--warn)">⚡ would draw the station to ${pwAfter.toFixed(1)} kW — starves output unless you add power</span>`
      : `<span class="dim">⚡ station power ${pwNow.net.toFixed(1)} → ${pwAfter.toFixed(1)} kW</span>`); }
    else if(netPower>0){ bits.push(`<span style="color:var(--ok)">⚡ +${netPower} kW → station ${pwAfter.toFixed(1)} kW</span>`); }
    if(st.crewReq){ const haveSpare=crewNow.cap-crewNow.req;
      bits.push(haveSpare>=st.crewReq
        ? `<span class="dim">👤 ${st.crewReq} crew available</span>`
        : `<span style="color:var(--warn)">👤 needs ${st.crewReq} crew — ${haveSpare<=0?'none':haveSpare} spare aboard, add a Habitat</span>`); }
    if(bits.length) context=`<div style="margin:6px 0;padding:5px 7px;background:var(--panel2);border-radius:5px;font-size:11px;line-height:1.5">${bits.join('<br>')}</div>`;
  }
  const cost = (cur&&cur.fs) ? stationModuleCost(cur.def, cur.fs, md) : md.cost;
  const chk = addable && cur ? canAddStationModule(cur.def.id, md.id) : {ok:false};
  const gated = md.reqResearch && !state.research[md.reqResearch];
  const gateName = gated ? ((RESEARCH.find(r=>r.id===md.reqResearch)||{}).name||md.reqResearch) : '';
  // #73 (2026-07-11): the first module of a given type on a facility is a real "launch modules, dock"
  // choice — fly it yourself (real vehicle/launch, base cost, no premium — a simple synchronous
  // mission at LEO, Slice 1; a real profile-based cargo cruise at Moon/Mars, Slice 2) or pay a
  // contracted-delivery premium for the instant dock this whole card offered before. Repeats of an
  // already-proven type stay exactly as before: one click, instant, base cost — see
  // stationCurrentView()/#73 scoping notes for why (pacing).
  const first = addable && cur && cur.fs && !facilityModuleList(cur.fs).includes(md.id);
  const pending = first && cur ? pendingModuleDelivery(cur.def.id, md.id) : null;
  return `<div class="card" style="flex:1;min-width:230px;max-width:320px;display:flex;flex-direction:column;gap:2px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px">
      <div><b style="color:${md.color};font-size:14px">${md.name}</b> <span class="dim" style="font-size:11px;font-family:var(--mono)">${md.short}</span></div>
      ${md.role?`<span class="pill" style="font-size:10px;border-color:${md.color};color:${md.color}">${md.role}</span>`:''}
    </div>
    <div class="dim" style="font-size:12px;margin:3px 0 6px;line-height:1.45">${md.blurb}</div>
    ${prodBits.length?`<div style="font-family:var(--mono);font-size:12px;margin-bottom:5px">Output: ${prodBits.join(' · ')}</div>`:`<div class="dim" style="font-size:11px;margin-bottom:5px">No direct output — enabling infrastructure.</div>`}
    <div style="border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:4px 0;margin-bottom:5px">
      ${specRow('Mass', (st.mass||0).toFixed(1)+' t')}
      ${specRow('Power', (netPower>=0?'+':'')+netPower.toFixed(1)+' kW', netPower>=0?'var(--ok)':'var(--warn)')}
      ${st.crew?specRow('Crew berths','+'+st.crew,'var(--ok)'):''}
      ${st.crewReq?specRow('Crew required',st.crewReq,'var(--warn)'):''}
      ${md.ports?specRow('Docking ports','+'+md.ports+' berths','var(--ink)'):''}
      ${md.resupplyCut?specRow('Resupply','−'+Math.round(md.resupplyCut*100)+'% (self-feeding)','var(--ok)'):''}
      ${specRow('Build', fM(cost)+' · '+md.buildMo+' mo')}
    </div>
    ${md.synHint?`<div style="font-size:11px;color:#c9b8e0;line-height:1.45;margin-bottom:5px">◆ ${md.synHint}</div>`:''}
    ${context}
    ${md.hist?`<div class="dim" style="font-size:10.5px;font-style:italic;line-height:1.4;margin-bottom:7px;opacity:.8">${md.hist}</div>`:''}
    <div style="margin-top:auto">
    ${!addable
      ? `<button class="btn" style="width:100%;font-size:12px" onclick="draftAdd('${md.id}')"${gated?` title="Buildable now as a blueprint; needs ${gateName} to actually construct"`:''}>Add to blueprint ▸${gated?' 🔒':''}</button>`
      : pending
        ? `<div class="dim" style="font-size:12px;text-align:center;padding:6px 0">🚀 Delivery flight committed — build &amp; launch it from the bench.</div>`
        : first
          ? (()=>{ const flyChk=canFlyModuleDelivery(cur.def.id, md.id), conChk=canContractStationModule(cur.def.id, md.id);
              return `<div style="display:flex;gap:6px">
                <button class="btn ${flyChk.ok?'launch':''}" style="flex:1;font-size:11px" onclick="flyModuleDelivery('${cur.def.id}','${md.id}')" ${flyChk.ok?'':'disabled'} title="Design and launch a real delivery flight — pays only the base module cost on success, no premium">🚀 Fly it · ${fM(flyChk.cost||flyModuleCost(cur.def,cur.fs,md))}${flyChk.ok?'':' — '+flyChk.why}</button>
                <button class="btn ${conChk.ok?'':'ghost'}" style="flex:1;font-size:11px" onclick="contractStationModule('${cur.def.id}','${md.id}')" ${conChk.ok?'':'disabled'} title="Instant delivery, no flight — costs a premium over flying it yourself">📦 Contract · ${fM(conChk.cost||contractedModuleCost(cur.def,cur.fs,md))}</button>
              </div>`; })()
          : `<button class="btn ${chk.ok?'launch':''}" style="width:100%;font-size:12px" onclick="addStationModule('${cur.def.id}','${md.id}')" ${chk.ok?'':'disabled'}>${chk.ok?'Dock module ▸':chk.why}</button>`}
    </div>
  </div>`;
}
function renderMarketStat(){
  const wrap=$('stMarketWrap'), el=$('stMarket'); if(!wrap||!el) return;
  const ev=state.econEvents||[];
  wrap.classList.toggle('hidden', ev.length===0);
  if(!ev.length) return;
  const pm=econPayoutMult(), oh=econOverheadAdd();
  const parts=[];
  if(Math.abs(pm-1)>1e-6) parts.push(`payouts ${pm>1?'+':''}${Math.round((pm-1)*100)}%`);
  if(Math.abs(oh)>1e-6)   parts.push(`overhead ${oh>0?'+':'−'}${fM(Math.abs(oh))}`);
  el.textContent=parts.join(' · ')||`${ev.length} active`;
  el.style.color = (pm<1||oh>0)?'var(--bad)':'var(--ok)';
}
// rival "flags" arranged around a body for those that have reached it
function rivalMarkersSVG(bodyId,px,py,rad){
  const here=rivalsAtBody(bodyId);
  if(!here.length) return '';
  const seen={}, uniq=[];
  here.forEach(h=>{ if(!seen[h.rival.id]){ seen[h.rival.id]=1; uniq.push(h.rival); } });
  let s='';
  uniq.forEach((r,i)=>{
    const a=-Math.PI/2 + (i-(uniq.length-1)/2)*0.5;
    const dx=px+Math.cos(a)*(rad+11), dy=py+Math.sin(a)*(rad+11);
    s+=`<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="3" fill="${r.color}" stroke="#04060a" stroke-width="0.8">
      <title>${r.name} — reached ${BODIES.find(b=>b.id===bodyId).name}</title></circle>`;
  });
  return s;
}
function facilityMarkerSVG(bodyId,px,py,rad){ return assetMarkersSVG(bodyId,px,py,rad); } // legacy name kept for call sites
const HEALTH_COLOR={ok:'#5fae62', warn:'#e8b64c', attention:'#e8604c'};
function assetMarkersSVG(bodyId,px,py,rad,model){
  const a=(model||mapAssetModel())[bodyId]; if(!a) return '';
  let s='';
  // Player presence flag — pulsing pennant above the body. Rivals get dots; YOU get a flag.
  if(a.firsts.length){
    const fy=py-rad-14;
    s+=`<g><line x1="${(px-6).toFixed(1)}" y1="${(fy+7).toFixed(1)}" x2="${(px-6).toFixed(1)}" y2="${(fy-2).toFixed(1)}" stroke="#f5d78a" stroke-width="1"/>
      <path d="M ${(px-6).toFixed(1)} ${(fy-2).toFixed(1)} L ${(px+2).toFixed(1)} ${(fy+0.5).toFixed(1)} L ${(px-6).toFixed(1)} ${(fy+3).toFixed(1)} Z" fill="var(--ignite)">
        <animate attributeName="opacity" values="1;0.55;1" dur="2.6s" repeatCount="indefinite"/>
      </path>
      <title>Your firsts here: ${a.firsts.join(' · ')}</title></g>`;
  }
  // Facility icon + health ring + module pips
  if(a.facility){
    const {def,health,modules}=a.facility;
    const fx=px+rad+8, fy=py+1;
    s+=`<g><circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="6.5" fill="rgba(6,10,15,0.75)" stroke="${HEALTH_COLOR[health]}" stroke-width="1.4">
        ${health!=='ok'?`<animate attributeName="stroke-opacity" values="1;0.35;1" dur="${health==='attention'?'0.9':'1.8'}s" repeatCount="indefinite"/>`:''}
      </circle>
      <text x="${fx.toFixed(1)}" y="${(fy+3.4).toFixed(1)}" fill="${def.color}" font-size="9" text-anchor="middle" font-family="ui-monospace,monospace">${def.icon}</text>`;
    let pips=''; for(let i=0;i<Math.min(8,modules);i++){ pips+=`<circle cx="${(fx-((Math.min(8,modules)-1)*2.6)/2+i*2.6).toFixed(1)}" cy="${(fy+10).toFixed(1)}" r="1" fill="${HEALTH_COLOR[health]}"/>`; }
    s+=pips+`<title>${def.name} — ${modules} module${modules>1?'s':''} · ${health==='ok'?'nominal':(health==='warn'?'strained (supply/power/crew)':'STARVED — resupply now')}</title></g>`;
  }
  // ISRU pick
  if(a.isru) s+=`<text x="${(px-rad-9).toFixed(1)}" y="${(py+3.5).toFixed(1)}" font-size="9" text-anchor="middle" fill="#7bc46a" font-family="ui-monospace,monospace">⛏<title>ISRU plant online — propellant produced on-site</title></text>`;
  // Belt mining claim (distinct from ISRU: it's the money)
  if(a.beltClaim) s+=`<g><circle cx="${(px+rad+7).toFixed(1)}" cy="${(py-8).toFixed(1)}" r="3" fill="none" stroke="#e8c04c" stroke-width="1.2"><animate attributeName="r" values="3;4;3" dur="2.2s" repeatCount="indefinite"/></circle><circle cx="${(px+rad+7).toFixed(1)}" cy="${(py-8).toFixed(1)}" r="1.2" fill="#e8c04c"/><title>Belt mining claim — ${fM(state.pgmRoyalty)}/mo royalties</title></g>`;
  // LEO depot fill gauge — an arc around Earth
  if(a.depotT>0){
    const cap=Math.max(a.depotT,120), frac=Math.min(1,a.depotT/cap);
    const rr=rad+5, a0=-Math.PI*0.75, a1=a0+frac*Math.PI*1.5;
    const x0=px+Math.cos(a0)*rr, y0=py+Math.sin(a0)*rr, x1=px+Math.cos(a1)*rr, y1=py+Math.sin(a1)*rr;
    const large=(a1-a0)>Math.PI?1:0;
    s+=`<g><path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${rr} ${rr} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="#5fc4d0" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
      <title>LEO propellant depot — ${a.depotT} t banked</title></g>`;
  }
  return s;
}
// Planned-route arc for the ACTIVE mission (cyan = closes, red = Δv short, amber = committed window)
function plannedRouteSVG(cx,cy){
  const pr=plannedRoute(); if(!pr) return '';
  if(pr.committed) return ''; // the committed arc (amber) already draws it
  const arc=transferArc(cx,cy,pr.destId); if(!arc) return '';
  const col=pr.ok?'#5fc4d0':'#e8604c';
  return `<path d="M ${arc.from.x.toFixed(1)} ${arc.from.y.toFixed(1)} Q ${arc.ctrl.x.toFixed(1)} ${arc.ctrl.y.toFixed(1)} ${arc.to.x.toFixed(1)} ${arc.to.y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="1.2" stroke-dasharray="2,4" opacity="0.7">
      <title>Planned: ${pr.name} → ${arc.destName}${pr.ok?' — design closes':' — '+pr.short+' leg(s) short on Δv'}</title></path>
    <text x="${arc.ctrl.x.toFixed(1)}" y="${(arc.ctrl.y+10).toFixed(1)}" fill="${col}" font-size="8.5" font-family="ui-monospace,monospace" text-anchor="middle" opacity="0.85">${pr.ok?'planned':'Δv short'} → ${arc.destName}</text>`;
}
function renderMapActivity(){
  const el=$('mapActivityCard'); if(!el) return;
  const ev=state.econEvents||[];
  const evRows = ev.length
    ? ev.map(e=>{
        const eff=e.payoutMult!=null?`payouts ×${e.payoutMult}`:(e.overheadAdd!=null?`overhead ${e.overheadAdd>=0?'+':'−'}${fM(Math.abs(e.overheadAdd))}/mo`:'');
        return `<div class="leg"><span class="legname" style="color:${e.kind==='good'?'var(--ok)':'var(--bad)'}">${e.label}</span><span class="legdv">${e.monthsLeft} mo</span><span class="legdetail">${eff}</span></div>`;
      }).join('')
    : `<div class="dim" style="font-size:12px;padding:4px 0">No active market events. Grants, downturns, and windfalls arrive as the program matures.</div>`;
  // rival frontier — most recent reach per rival
  const frontier=RIVALS.map(r=>{
    const reached=r.firsts.filter(f=>f.body && state.rivalFired[r.id+'|'+f.name]).sort((a,b)=>b.year-a.year);
    if(!reached.length) return '';
    const latest=reached[0];
    const bname=(BODIES.find(b=>b.id===latest.body)||{}).name||latest.body;
    return `<div class="leg"><span class="legname"><span style="color:${r.color}">${r.flag} ${r.name}</span></span><span class="legdv">${bname}</span><span class="legdetail">${latest.name} (${latest.year})</span></div>`;
  }).filter(Boolean).join('');
  el.innerHTML=`<div class="adv-only"><div class="mission-tag">Market conditions</div>
    <div class="legs" style="margin-top:6px">${evRows}</div>
    <div class="mission-tag" style="margin-top:14px">Rival frontier</div>
    <div class="legs" style="margin-top:6px">${frontier||'<div class="dim" style="font-size:12px;padding:4px 0">No rival has staked a claim beyond Earth yet.</div>'}</div>
    <div class="dim" style="font-size:12px;margin-top:10px">Coloured dots on the map mark where each rival has reached. Beating a rival to a linked mission avoids its scoop penalty.</div></div>`;
}
// #graphics: Hohmann-style transfer arc geometry for a committed launch window. Pure
// (takes the map centre + a destination body id, returns from/ctrl/to points), so both
// the SVG overview and the Phaser MapScene draw the same curve and it's headless-testable.
// A quadratic curve bowed away from (or toward) the Sun reads as the transfer trajectory;
// moons resolve to their parent's orbit (Earth's Moon is a short cislunar hop).

/* ---------- Empire overlay model (map asset layer) ----------
   One shared source of truth for everything the player owns or has achieved, per body —
   consumed identically by the SVG map, the Phaser MapScene, and the empire strip. This is
   the "look at what we built" layer: the map stops being a chart and becomes the theater. */
function bodyFirsts(bodyId){
  const b=BODIES.find(x=>x.id===bodyId); if(!b||!b.missions) return [];
  return b.missions.filter(mid=>state.completed[mid]).map(mid=>(MISSIONS.find(m=>m.id===mid)||{}).name||mid);
}
function facilityHealth(def, fs){
  if(!fs||!fs.built) return null;
  if((fs.starvedMonths||0)>0 || (fs.supply!=null && fs.supply<=0)) return 'attention';
  const pw=facilityPower(fs), cr=facilityCrew(fs);
  if((fs.supply!=null && fs.supply<=2) || pw.net<0 || (cr && cr.factor<1)) return 'warn';
  return 'ok';
}
function mapAssetModel(){
  const perBody={};
  const get=id=>(perBody[id]=perBody[id]||{firsts:[],facility:null,isru:false,depotT:0,beltClaim:false});
  BODIES.forEach(b=>{
    const f=bodyFirsts(b.id);
    if(f.length) get(b.id).firsts=f;
  });
  FACILITY_DEFS.forEach(def=>{
    if(!facilityBuilt(def.id)) return;
    const fs=facilityState(def.id);
    get(def.body).facility={def, fs, health:facilityHealth(def,fs), modules:facilityModuleList(fs).length};
  });
  // ISRU plants come online with their research after reaching the body
  if(state.research.lunar_isru) get('moon').isru=true;
  if(state.research.mars_isru)  get('mars').isru=true;
  if(state.research.belt_volatiles) get('belt').isru=true;
  if((state.depot||0)>0.05) get('earth').depotT=round2(state.depot);
  if((state.pgmRoyalty||0)>0) get('belt').beltClaim=true;
  return perBody;
}
// Planned route for the ACTIVE mission (committed or not): where it goes and whether it closes.
function plannedRoute(){
  const m=missionById(state.activeMission); if(!m) return null;
  const destId=missionBody(m.id); if(!destId||destId==='earth') return null;
  let ok=true, short=0;
  try{
    if(m.profile){ const sim=simulateMission(m); ok=!!sim.ok && sim.legs.every(l=>l.pass);
      if(!ok){ const worst=sim.legs.filter(l=>!l.pass); short=worst.length; } }
    else { const v=computeVehicle(); ok=v.totalDv>=(m.reqDv||0); if(!ok) short=1; }
  }catch(e){}
  const committed=!!(state.committedWindow && state.committedWindow.missionId===m.id);
  return {destId, name:m.name, ok, short, committed};
}
// The one-line ledger a Stellaris player wants above the map.
function empireStripHTML(){
  const model=mapAssetModel();
  const reachable=BODIES.filter(b=>b.missions&&b.missions.length&&b.id!=='earth').length;
  const reached=BODIES.filter(b=>b.id!=='earth'&&(model[b.id]||{}).firsts&&model[b.id].firsts.length).length;
  let facN=0, modN=0;
  FACILITY_DEFS.forEach(def=>{ if(facilityBuilt(def.id)){ facN++; modN+=facilityModuleList(facilityState(def.id)).length; } });
  const spaceIncome=round2(totalFacilityIncome()+(state.pgmRoyalty||0));
  const chip=(icon,txt,title)=>`<span title="${title||''}" style="display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border:1px solid var(--line);border-radius:11px;font-family:var(--mono);font-size:12px;color:var(--muted);white-space:nowrap">${icon} ${txt}</span>`;
  let s=chip('🏁', `${reached}/${reachable} bodies`, 'Worlds where your missions have flown');
  if(facN) s+=' '+chip('⬢', `${facN} facilit${facN>1?'ies':'y'} · ${modN} modules`, 'Stations and bases you operate');
  if((state.depot||0)>0.05) s+=' '+chip('⛽', `${round2(state.depot)} t depot`, 'Propellant banked in LEO');
  if(state.pgmRoyalty>0) s+=' '+chip('⛏', 'Belt claim', 'Platinum-group mining royalties flowing');
  if(spaceIncome>0) s+=' '+chip('💰', `${fM(spaceIncome)}/mo`, 'Monthly income from space assets (facilities + royalties)');
  return `<div id="empireStrip" style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px">${s}</div>`;
}

function transferArc(cx,cy,destId){
  const dest=BODIES.find(b=>b.id===destId); if(!dest) return null;
  const earth=BODIES.find(b=>b.id==='earth'); if(!earth) return null;
  const aE=ANGLES.earth, rE=earth.r;
  const from={x:cx+Math.cos(aE)*rE, y:cy+Math.sin(aE)*rE};
  let tR=dest.r, tx, ty;
  if(dest.around){
    const parent=BODIES.find(b=>b.id===dest.around);
    if(parent){ const pAng=(ANGLES[parent.id]||0), pR=parent.r;
      const pX=cx+Math.cos(pAng)*pR, pY=cy+Math.sin(pAng)*pR;
      const mr=(parent.kind==='belt'?4:8)+10, mAng=(ANGLES[dest.id]||0);
      tx=pX+Math.cos(mAng)*mr; ty=pY+Math.sin(mAng)*mr; tR=pR;
    }
  }
  if(tx===undefined){ const a=(ANGLES[dest.id]!==undefined?ANGLES[dest.id]:0); tx=cx+Math.cos(a)*tR; ty=cy+Math.sin(a)*tR; }
  const to={x:tx,y:ty};
  const mx=(from.x+tx)/2, my=(from.y+ty)/2, mr=Math.hypot(mx-cx,my-cy)||1;
  const dir=tR>=rE?1:-1, bow=(Math.abs(tR-rE)*0.45+18)*dir; // bow outward for higher orbits, inward for Venus
  const ctrl={x:cx+(mx-cx)/mr*(mr+bow), y:cy+(my-cy)/mr*(mr+bow)};
  return {from,to,ctrl,destName:dest.name};
}
function renderMapOverview(W,H){
  const planets=BODIES.filter(b=>!b.around);
  // Centre the Sun and size a square viewBox to fit the outermost orbit (incl. Jupiter)
  // plus padding for labels and rival markers, so the whole system is always on-screen.
  const maxR=Math.max.apply(null, planets.map(b=>b.r));
  const pad=48;
  const S=2*(maxR+pad);
  const cx=S/2, cy=S/2;
  let svg=`<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg" class="mapsvg">`;
  planets.forEach(b=>{
    if(b.kind==='cloud') return; // the Oort shell is drawn separately
    svg+=`<circle cx="${cx}" cy="${cy}" r="${b.r}" fill="none" stroke="rgba(125,144,155,0.25)" stroke-width="1" stroke-dasharray="${b.kind==='belt'?'2,3':'3,4'}"/>`;
  });
  // Oort Cloud — a wide speckled spherical shell at the edge of the system
  { const oc=BODIES.find(b=>b.id==='oort'); if(oc){ const rnd=mulberry(9001);
      svg+=`<circle cx="${cx}" cy="${cy}" r="${oc.r}" fill="none" stroke="rgba(143,179,200,0.16)" stroke-width="${(pad*0.9).toFixed(1)}"/>`;
      let dots=''; for(let i=0;i<240;i++){ const a=rnd()*6.2832, rr=oc.r+(rnd()-0.5)*pad*0.85, dx=cx+Math.cos(a)*rr, dy=cy+Math.sin(a)*rr; dots+=`<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${(0.5+rnd()*1.1).toFixed(2)}" fill="#bcd4e0" opacity="${(0.2+rnd()*0.5).toFixed(2)}"/>`; }
      svg+=dots;
      const osel=state.selectedBody==='oort';
      svg+=`<g style="cursor:pointer" onclick="selectBody('oort')"><circle cx="${cx}" cy="${(cy-oc.r).toFixed(1)}" r="16" fill="transparent"/><text x="${cx}" y="${(cy-oc.r-6).toFixed(1)}" fill="${osel?themeColor('ignite'):themeColor('muted')}" font-size="12" font-family="ui-monospace,monospace" text-anchor="middle">Oort Cloud</text></g>`;
  } }
  // Epic Sun: outer corona glow + radiating flares + granulated photosphere
  { const sid='sun'+(_texSeq++);
    svg+=`<defs>
      <radialGradient id="${sid}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff8e0"/><stop offset="32%" stop-color="#ffe48c"/><stop offset="64%" stop-color="#ffb12a"/><stop offset="100%" stop-color="#ff7a18"/></radialGradient>
      <radialGradient id="${sid}h" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,190,70,0.5)"/><stop offset="55%" stop-color="rgba(255,140,40,0.16)"/><stop offset="100%" stop-color="rgba(255,120,30,0)"/></radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="50" fill="url(#${sid}h)"/>`;
    let rays=''; for(let i=0;i<28;i++){ const a=i*Math.PI/14, r1=15, r2=15+((i%2)?9:17); rays+=`<line x1="${(cx+Math.cos(a)*r1).toFixed(1)}" y1="${(cy+Math.sin(a)*r1).toFixed(1)}" x2="${(cx+Math.cos(a)*r2).toFixed(1)}" y2="${(cy+Math.sin(a)*r2).toFixed(1)}" stroke="rgba(255,196,80,0.55)" stroke-width="${(i%2)?1:1.6}"/>`; }
    svg+=rays;
    svg+=`<circle cx="${cx}" cy="${cy}" r="13.5" fill="url(#${sid})"/><circle cx="${cx}" cy="${cy}" r="13.5" fill="none" stroke="rgba(255,244,210,0.7)" stroke-width="0.8"/>`;
    svg+=`<circle cx="${cx-4}" cy="${cy+3}" r="1.7" fill="rgba(170,70,15,0.5)"/><circle cx="${cx+3.5}" cy="${cy-2}" r="1.2" fill="rgba(170,70,15,0.45)"/><circle cx="${cx-1}" cy="${cy-4}" r="0.9" fill="rgba(170,70,15,0.4)"/>`;
  }
  // #graphics: committed-window transfer trajectory, drawn under the bodies
  const cw=state.committedWindow;
  if(cw){ const arc=transferArc(cx,cy,missionBody(cw.missionId));
    if(arc){ svg+=`<path d="M ${arc.from.x.toFixed(1)} ${arc.from.y.toFixed(1)} Q ${arc.ctrl.x.toFixed(1)} ${arc.ctrl.y.toFixed(1)} ${arc.to.x.toFixed(1)} ${arc.to.y.toFixed(1)}" fill="none" stroke="var(--ignite)" stroke-width="1.6" stroke-dasharray="5,5" opacity="0.85"><title>Committed transfer to ${arc.destName}</title></path>
      <circle cx="${arc.from.x.toFixed(1)}" cy="${arc.from.y.toFixed(1)}" r="2.5" fill="var(--ignite)"/>
      <text x="${arc.ctrl.x.toFixed(1)}" y="${(arc.ctrl.y-4).toFixed(1)}" fill="var(--ignite)" font-size="9" font-family="ui-monospace,monospace" text-anchor="middle">⊕ transfer → ${arc.destName}</text>`; }
  }
  svg+=plannedRouteSVG(cx,cy); // empire layer: active-mission planned route
  const _assetModel=mapAssetModel(); // computed once per render, shared by every marker below
  planets.forEach(b=>{
    const ang = ANGLES[b.id]!==undefined?ANGLES[b.id]:0;
    const px=cx+Math.cos(ang)*b.r, py=cy+Math.sin(ang)*b.r;
    if(b.kind==='cloud') return; // already drawn as the Oort shell
    const sel=state.selectedBody===b.id;
    const rad = b.dotR || (b.kind==='belt'?4:8);
    if(b.kind==='belt'){
      for(let i=0;i<14;i++){ const a=ang+i*0.45, bx=cx+Math.cos(a)*b.r, by=cy+Math.sin(a)*b.r;
        svg+=`<circle cx="${bx}" cy="${by}" r="1.6" fill="${b.color}" opacity="0.5"/>`; }
    }
    svg+=`<g style="cursor:pointer" onclick="selectBody('${b.id}')">
      <circle cx="${px}" cy="${py}" r="${rad+8}" fill="transparent"/>
      ${bodyTexture(b.id,px,py,rad)}
      ${sel?`<circle cx="${px}" cy="${py}" r="${rad+1.5}" fill="none" stroke="var(--ignite)" stroke-width="1.5"/>`:''}
      <text x="${px}" y="${py-rad-6}" fill="${sel?themeColor('ignite'):themeColor('muted')}" font-size="11" font-family="ui-monospace,monospace" text-anchor="middle">${b.name}</text>
    </g>${rivalMarkersSVG(b.id,px,py,rad)}${assetMarkersSVG(b.id,px,py,rad,_assetModel)}`;
    BODIES.filter(m=>m.around===b.id).forEach(m=>{
      const mAng=(ANGLES[m.id]!==undefined?ANGLES[m.id]:0);
      const mr=rad+(m.moonR||10), mRad=m.dotR||4.5;
      const mx=px+Math.cos(mAng)*mr, my=py+Math.sin(mAng)*mr;
      const msel=state.selectedBody===m.id;
      svg+=`<circle cx="${px}" cy="${py}" r="${mr}" fill="none" stroke="rgba(125,144,155,0.2)" stroke-width="1"/>
        <g style="cursor:pointer" onclick="selectBody('${m.id}')">
          <circle cx="${mx}" cy="${my}" r="${mRad+6}" fill="transparent"/>
          ${bodyTexture(m.id,mx,my,mRad)}
          ${msel?`<circle cx="${mx}" cy="${my}" r="${mRad+2}" fill="none" stroke="var(--ignite)" stroke-width="1.5"/>`:''}
          <text x="${mx}" y="${my-mRad-4}" fill="${msel?themeColor('ignite'):themeColor('muted')}" font-size="9" font-family="ui-monospace,monospace" text-anchor="middle">${m.name}</text>
        </g>${rivalMarkersSVG(m.id,mx,my,5)}${assetMarkersSVG(m.id,mx,my,5,_assetModel)}`;
    });
  });
  svg+=`<text x="14" y="20" fill="#56666f" font-size="11" font-family="ui-monospace,monospace">Click a body to zoom in</text>`;
  svg+=`</svg>`;
  return svg;
}
function renderMapZoom(W,H,id){
  const b=BODIES.find(x=>x.id===id);
  const parent=b.around?BODIES.find(x=>x.id===b.around):null;
  const cx=W/2, cy=H/2;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="mapsvg">`;
  // sun direction indicator (everything orbits sunward toward overview center)
  svg+=`<g opacity="0.5"><circle cx="34" cy="${H-34}" r="7" fill="#f5c542"/><text x="50" y="${H-30}" fill="#7d909b" font-size="10" font-family="ui-monospace,monospace">toward Sun</text></g>`;

  if(parent){
    // zoomed on a moon: show parent planet large-ish off-center, moon prominent, orbit path
    const pRad=34, pX=cx-130, pY=cy;
    const mRad=22, mOrbit=150;
    const mAng=(ANGLES[b.id]!==undefined?ANGLES[b.id]:0);
    const mX=pX+Math.cos(mAng)*0+mOrbit, mY=cy; // place moon to the right along its orbit
    svg+=`<circle cx="${pX}" cy="${pY}" r="${mOrbit}" fill="none" stroke="rgba(125,144,155,0.25)" stroke-width="1" stroke-dasharray="3,4"/>`;
    svg+=`<g style="cursor:pointer" onclick="selectBody('${parent.id}')">
      ${bodyTexture(parent.id,pX,pY,pRad)}
      <text x="${pX}" y="${pY+pRad+16}" fill="#9aa7af" font-size="12" font-family="ui-monospace,monospace" text-anchor="middle">${parent.name}</text>
    </g>`;
    svg+=`<g onclick="selectBody('${b.id}')" style="cursor:pointer">
      ${bodyTexture(b.id,mX,mY,mRad)}
      <circle cx="${mX}" cy="${mY}" r="${mRad+1.5}" fill="none" stroke="var(--ignite)" stroke-width="2"/>
      <text x="${mX}" y="${mY-mRad-10}" fill="var(--ignite)" font-size="13" font-family="ui-monospace,monospace" text-anchor="middle">${b.name}</text>
    </g>`;
  } else {
    // zoomed on a planet/belt: show it large and centered, plus any moons around it
    const rad = b.kind==='belt'?40:46;
    if(b.kind==='belt'){
      for(let i=0;i<22;i++){ const a=i*0.29, rr=rad+ (i%3)*10, bx=cx+Math.cos(a)*rr, by=cy+Math.sin(a)*rr;
        svg+=`<circle cx="${bx}" cy="${by}" r="2.4" fill="${b.color}" opacity="0.6"/>`; }
      svg+=`<text x="${cx}" y="${cy-rad-26}" fill="var(--ignite)" font-size="14" font-family="ui-monospace,monospace" text-anchor="middle">${b.name}</text>`;
    } else {
      svg+=`${bodyTexture(b.id,cx,cy,rad)}
        <circle cx="${cx}" cy="${cy}" r="${rad+1.5}" fill="none" stroke="var(--ignite)" stroke-width="2.5"/>
        <text x="${cx}" y="${cy-rad-14}" fill="var(--ignite)" font-size="14" font-family="ui-monospace,monospace" text-anchor="middle">${b.name}</text>`;
    }
    const moons=BODIES.filter(m=>m.around===b.id);
    moons.forEach((m,i)=>{
      const mOrbit=rad+60+i*40, mAng=(ANGLES[m.id]!==undefined?ANGLES[m.id]:0);
      const mx=cx+Math.cos(mAng)*mOrbit, my=cy+Math.sin(mAng)*mOrbit, mRad=14;
      const msel=state.selectedBody===m.id;
      svg+=`<circle cx="${cx}" cy="${cy}" r="${mOrbit}" fill="none" stroke="rgba(125,144,155,0.2)" stroke-width="1" stroke-dasharray="3,4"/>
        <g style="cursor:pointer" onclick="selectBody('${m.id}')">
          ${bodyTexture(m.id,mx,my,mRad)}
          ${msel?`<circle cx="${mx}" cy="${my}" r="${mRad+1.5}" fill="none" stroke="var(--ignite)" stroke-width="2"/>`:''}
          <text x="${mx}" y="${my-mRad-8}" fill="${msel?themeColor('ignite'):themeColor('muted')}" font-size="11" font-family="ui-monospace,monospace" text-anchor="middle">${m.name}</text>
        </g>`;
    });
  }
  svg+=`</svg>`;
  return svg;
}
function bodyCardHTML(){
  const b=BODIES.find(x=>x.id===state.selectedBody)||BODIES[0];
  let cum=0;
  const rows=b.legs.map(leg=>{
    cum+=leg.dv;
    return `<div class="leg">
      <span class="legname">${leg.label}</span>
      <span class="legdv">${fI(leg.dv)} m/s</span>
      ${leg.note?`<span class="legdetail">${leg.note}</span>`:''}
    </div>`;
  }).join('');
  const backBtn = state.mapZoom ? `<button class="btn ghost" onclick="zoomOut()" style="margin-bottom:10px">← Overview</button>` : '';
  // #13: planning surface — transfer windows, propellant routes, lead time + economics
  const plan=bodyPlan(b.id);
  const missionRows=plan.missions.map(mp=>{
    const pill=mp.done?'<span class="pill ok">done</span>':mp.available?'<span class="pill">available</span>':'<span class="pill lock">locked</span>';
    const leadStr=`${mp.leadMonths} mo to fly${mp.travelMonths?` · ${mp.travelMonths} mo transit`:''}`;
    let winLine='';
    if(mp.window){
      const w=mp.window;
      const qColor=w.quality>1.08?'var(--ok)':(w.quality<0.95?'var(--warn)':'var(--muted)');
      winLine=`<div class="sub" style="margin-top:2px">⊕ Next window <b>${w.date}</b> · ${w.monthsAway} mo away · <span style="color:${qColor}">${w.qLabel} geometry</span> · payout ×${w.quality.toFixed(2)} → ${fM(mp.adjPayout)}</div>`;
    }
    let reqLine='';
    if(!mp.available){
      const bits=[];
      if(mp.minRep>state.rep) bits.push(`rep ${mp.minRep} (have ${Math.round(state.rep)})`);
      if(mp.reqResearch && !state.research[mp.reqResearch]) bits.push(`research ${mp.reqResearch}`);
      if(bits.length) reqLine=`<div class="sub" style="color:var(--warn);margin-top:2px">Needs ${bits.join(' · ')}</div>`;
    }
    const commitBtn = (mp.window&&mp.available&&!mp.done)
      ? `<button class="btn ghost" style="font-size:12px;padding:4px 8px" onclick="commitWindow('${mp.id}',${mp.window.idx})">Commit window</button>` : '';
    return `<div class="item">
      <div class="body">
        <div class="title">${mp.name} ${pill}</div>
        <div class="sub">${mp.crew?`${mp.crew} crew · ${mp.days}d`:'uncrewed'} · payout ${fM(mp.payout)} · ${leadStr}</div>
        ${winLine}${reqLine}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:stretch">
        <button class="btn" onclick="flyTo('${mp.id}')" ${mp.available?'':'disabled'}>${mp.available?'Fly this':'Locked'}</button>
        ${commitBtn}
      </div>
    </div>`;
  }).join('');
  // propellant routes + soonest window summary
  const r=plan.routes;
  const routePills=[];
  if(r.depotResearch) routePills.push(`<span class="pill ${r.depotTons>0?'ok':''}">LEO depot · ${r.depotTons>0?r.depotTons.toFixed(1)+' t ready':'empty'}</span>`);
  else routePills.push(`<span class="pill lock">LEO depot · research orbital_depot</span>`);
  if(r.isru) routePills.push(`<span class="pill ${r.isru.online?'ok':'lock'}" title="${r.isru.research}">${r.isru.label} · ${r.isru.online?'online (free '+r.isru.leg+')':'locked'}</span>`);
  const transferLine = plan.transferLeg
    ? `<div class="sub" style="margin-top:6px">Transfer opportunity: <b>${plan.transferLeg.label}</b> — ${fI(plan.transferLeg.dv)} m/s${plan.anyWindows?' · window-dependent':''}.</div>` : '';
  const nextWinLine = plan.nextWindow
    ? `<div class="sub" style="margin-top:4px;color:var(--ignite)">⊕ Soonest transfer window: <b>${plan.nextWindow.date}</b> (${plan.nextWindow.monthsAway} mo away, ${plan.nextWindow.qLabel} geometry).</div>` : '';
  const planningBlock = (b.missions&&b.missions.length)
    ? `<div class="mission-tag" style="margin-top:14px">Mission planning — ${b.name}</div>
       <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${routePills.join('')}</div>
       ${transferLine}${nextWinLine}
       <div style="margin-top:8px">${missionRows}</div>`
    : `<div class="mission-tag" style="margin-top:14px">Mission planning — ${b.name}</div><div class="dim" style="font-size:12px;margin-top:4px">No missions to this body yet — a future milestone.</div>`;
  const missionsBlock = planningBlock;
  return `
    ${backBtn}
    ${b.id==='earth'?`<button class="btn" style="width:100%;margin-bottom:10px" onclick="openEarthPopout()">🌍 Expand Earth — live globe</button>`:''}
    <div class="mission-tag adv-only">Δv profile from Earth's surface</div>
    <div class="mission-name">${b.name}</div>
    <div class="sub" style="margin:6px 0 12px">${b.note}</div>
    <div class="legs adv-only">${rows}</div>
    <div class="metrics adv-only" style="margin-top:10px">
      <div class="metric"><div class="k">Cumulative to final leg</div><div class="v" style="color:var(--ignite)">${fI(cum)} m/s</div></div>
      <div class="metric"><div class="k">Legs</div><div class="v">${b.legs.length}</div></div>
    </div>
    <div class="eq">Each leg is a separate burn — a separate mass ratio. The cumulative figure is <em>not</em> a single Δv requirement; it's the sum of every burn a full round-trip architecture must budget for, in sequence, exactly like the mission profiles on the bench.</div>
    ${missionsBlock}`;
}
function renderBodyCard(){ const el=$('bodyCard'); if(el) el.innerHTML=bodyCardHTML(); }
function flyTo(missionId){
  if(mapPopoutOpen) closeMapPopout(); // flying from the map pop-out returns to the normal flow
  const m=MISSIONS.find(x=>x.id===missionId);
  if(state.rep<m.minRep) return;
  if(!missionTechMet(m)) return;
  state.activeMission=missionId;
  closeLiveModal(); // slice 6: navigating to the bench closes any open deep-view modal
  state.tab='bench';
  render();
}
// #7: describe a production line's effect at a given level (current vs. a hypothetical next)
function prodEffectText(key,lvl){
  if(key==='bays') return `capacity ${BAY_CAP_BASE+BAY_CAP_PER*(lvl-1)} units`;
  if(key==='foundry') return `−${Math.round((1-Math.max(FOUNDRY_FLOOR,1-FOUNDRY_PER*(lvl-1)))*100)}% build cost`;
  if(key==='pads') return `−${Math.round((1-Math.max(PAD_FLOOR,1-PAD_PER*(lvl-1)))*100)}% launch cost`;
  if(key==='qa'){ const rel=Math.min(QA_REL_CAP,QA_REL_PER*(lvl-1))*100, frag=Math.min(QA_FRAG_CAP,QA_FRAG_PER*(lvl-1))*100; return `+${rel.toFixed(1)}% reliability · −${frag.toFixed(0)}% mfg-defect share`; }
  return '';
}
// #7 sub-assemblies: the Engine Yard panel — pre-build engines, see stock + the current build's draw.
function engineYardPanelHTML(){
  const engs=unlockedEngines(), m=curMission(), need=m?vehicleEngineNeeds(m):{};
  const rows=engs.map(id=>{
    const e=ENGINES[id], stk=engineStockCount(id), tst=engineStockTestedCount(id), needN=need[id]||0;
    const needNote = needN>0 ? `<span class="dim" style="font-size:12px"> · build uses ${needN} (${Math.min(needN,stk)} on hand)</span>` : '';
    const c1=canBuildEngineStock(id,1), c5=canBuildEngineStock(id,5), ct=canBuildEngineStock(id,1,true);
    return `<div class="leg" style="align-items:center;gap:8px">
      <span class="legname">${engineIcon(id)} ${e.name} <span class="pill ${stk>0?'ok':''}">×${stk}${tst>0?` · ⛉${tst}`:''}</span>${needNote}</span>
      <span class="legdetail">${fM(engineUnitCost(id))} · ${engineBuildDays()} d ea</span>
      <button class="btn ghost" style="padding:3px 8px;font-size:12px" onclick="buildEngineStock('${id}',1)" ${c1.ok?'':'disabled'} title="${c1.ok?`${fM(c1.cost)} · ${c1.days} d`:c1.why}">Build ×1</button>
      <button class="btn ghost" style="padding:3px 8px;font-size:12px" onclick="buildEngineStock('${id}',5)" ${c5.ok?'':'disabled'} title="${c5.ok?`${fM(c5.cost)} · ${c5.days} d`:c5.why}">×5</button>
      <button class="btn ghost" style="padding:3px 8px;font-size:12px" onclick="buildEngineStock('${id}',1,true)" ${ct.ok?'':'disabled'} title="${ct.ok?`Bench-test: ${fM(ct.cost)} · ${ct.days} d → +${(BENCH_REL_PER*100).toFixed(1)}% reliability when fitted`:ct.why}">⛉ test ×1</button>
    </div>`;
  }).join('');
  const draw=m?engineDrawForBuild(m):{total:0,saveDays:0,credit:0,tested:0};
  const provenNote = draw.tested>0 ? ` · ${draw.tested} bench-tested → +${(benchRelBonus(m)*100).toFixed(1)}% reliability` : '';
  const drawNote = draw.total>0 ? `<div class="flag ok" style="margin-top:6px">⚙ ${draw.total} engine${draw.total===1?'':'s'} on hand for the current build → assembly ~${draw.saveDays} d faster, ${fM(draw.credit)} pre-paid${provenNote}.</div>` : '';
  return `<div class="card adv-only dombar-engineering" style="background:var(--panel2);margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div class="mission-name" style="font-size:14px">⚙ Engine yard</div>
        <div class="dim" style="font-size:12px">pre-build engines in downtime · foundry L${prodLevel('foundry')} builds ${engineParallel()} at once · fitted engines speed assembly (cost-neutral) · ⛉ bench-test for flight-proven reliability</div>
      </div>
      <div class="legs" style="margin-top:6px">${rows||'<div class="dim" style="font-size:12px">No engines unlocked yet.</div>'}</div>
      ${drawNote}
    </div>`;
}
function partYardPanelHTML(){
  const keys=stockablePartKeys(), m=curMission(), need=m?vehiclePartNeeds(m):{};
  const rows=keys.map(key=>{
    const stk=partStockCount(key), tst=partStockTestedCount(key), needN=need[key]||0;
    const needNote = needN>0 ? `<span class="dim" style="font-size:12px"> · build uses ${needN} (${Math.min(needN,stk)} on hand)</span>` : '';
    const c1=canBuildPartStock(key,1), c3=canBuildPartStock(key,3), ct=canBuildPartStock(key,1,true);
    return `<div class="leg" style="align-items:center;gap:8px">
      <span class="legname">${partCompIcon(key)} ${partCompName(key)} <span class="pill ${stk>0?'ok':''}">×${stk}${tst>0?` · ⛉${tst}`:''}</span>${needNote}</span>
      <span class="legdetail">${fM(partCompCost(key))} · ${partBuildDays()} d ea</span>
      <button class="btn ghost" style="padding:3px 8px;font-size:12px" onclick="buildPartStock('${key}',1)" ${c1.ok?'':'disabled'} title="${c1.ok?`${fM(c1.cost)} · ${c1.days} d`:c1.why}">Build ×1</button>
      <button class="btn ghost" style="padding:3px 8px;font-size:12px" onclick="buildPartStock('${key}',3)" ${c3.ok?'':'disabled'} title="${c3.ok?`${fM(c3.cost)} · ${c3.days} d`:c3.why}">×3</button>
      <button class="btn ghost" style="padding:3px 8px;font-size:12px" onclick="buildPartStock('${key}',1,true)" ${ct.ok?'':'disabled'} title="${ct.ok?`Bench-test: ${fM(ct.cost)} · ${ct.days} d → +${(BENCH_REL_PER*100).toFixed(1)}% reliability when fitted`:ct.why}">⛉ test ×1</button>
    </div>`;
  }).join('');
  const draw=m?partDrawForBuild(m):{total:0,saveDays:0,credit:0,tested:0};
  const provenNote = draw.tested>0 ? ` · ${draw.tested} bench-tested → +${(benchRelBonus(m)*100).toFixed(1)}% reliability` : '';
  const drawNote = draw.total>0 ? `<div class="flag ok" style="margin-top:6px">🛠 ${draw.total} structural component${draw.total===1?'':'s'} on hand for the current build → assembly ~${draw.saveDays} d faster, ${fM(draw.credit)} pre-paid${provenNote}.</div>` : '';
  return `<div class="card adv-only dombar-engineering" style="background:var(--panel2);margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div class="mission-name" style="font-size:14px">🛠 Structures &amp; habitats</div>
        <div class="dim" style="font-size:12px">pre-build tank sets &amp; crew modules in downtime · foundry L${prodLevel('foundry')} builds ${partParallel()} at once · fitted parts speed assembly (cost-neutral) · ⛉ bench-test for proven reliability</div>
      </div>
      <div class="legs" style="margin-top:6px">${rows||'<div class="dim" style="font-size:12px">No structural components available yet.</div>'}</div>
      ${drawNote}
    </div>`;
}
function productionPanelHTML(){
  const m=curMission();
  const units=vehicleUnits(m), cap=bayCapacity(), delta=bayBuildDelta(m);
  const osPen=overstretchRelPenalty(m);
  const capNote = delta>0
    ? `<span style="color:var(--warn)">current build needs ${units} units — over capacity by ${units-cap} (+${delta} mo, −${(osPen*100).toFixed(1)}% reliability)</span>`
    : (delta<0 ? `<span style="color:var(--ok)">current build (${units} units) fits with room to spare (${delta} mo)</span>`
               : `<span class="dim">current build needs ${units}/${cap} units</span>`);
  const load=cadenceLoad(), surch=cadenceSurcharge();
  const loadPct=Math.round(load*100);
  const cadenceColor = surch>0?'var(--bad)':(load>0.8?'var(--warn)':(load>0?'var(--ok)':'var(--ink)'));
  const cadenceVal = `${loadPct}%${surch>0?` · +${Math.round(surch*100)}% rush`:''}`;
  const bn=bottleneckLine(m);
  const banner = bn==='bays'
    ? `<div class="flag warn" style="margin-bottom:8px">🏭 Bays bottleneck — recent build load ${loadPct}% of sustainable cadence${surch>0?`; paying a +${Math.round(surch*100)}% rush surcharge on every new build`:''}${delta>0?`; current order is over single-build capacity by ${units-cap} units`:''}. Upgrade Assembly Bays to relieve the pressure.</div>`
    : '';
  const cards=PRODUCTION_DEFS.map(d=>{
    const lvl=prodLevel(d.key), maxed=lvl>=PROD_MAX_LEVEL;
    const chk=canUpgradeProduction(d.key), cost=prodUpgradeCost(d.key);
    const upkeep=round2(d.upkeep*(lvl-1));
    const btn = maxed
      ? `<button class="btn" style="margin-top:10px;width:100%" disabled>At maximum (L${PROD_MAX_LEVEL})</button>`
      : `<button class="btn" style="margin-top:10px;width:100%" onclick="upgradeProduction('${d.key}')" ${chk.ok?'':'disabled'}>${chk.ok?`Upgrade → L${lvl+1} · ${fM(cost)} · ${d.months} mo`:chk.why}</button>`;
    return `<div class="card" style="background:var(--panel2);margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div class="mission-name" style="font-size:15px">${d.icon} ${d.name} <span class="pill ${lvl>1?'ok':''}">L${lvl}${maxed?' · max':''}</span></div>
        <div class="dim" style="font-size:12px">upkeep ${upkeep>0?'−'+fM(upkeep)+'/mo':'none'}</div>
      </div>
      <div class="sub" style="margin:2px 0 8px">${d.blurb}</div>
      <div class="metrics">
        <div class="metric"><div class="k">Now</div><div class="v" style="font-size:13px">${prodEffectText(d.key,lvl)}</div></div>
        ${maxed?'':`<div class="metric"><div class="k">Next level</div><div class="v" style="font-size:13px;color:var(--readout)">${prodEffectText(d.key,lvl+1)}</div></div>`}
        ${maxed?'':`<div class="metric"><div class="k">Added upkeep</div><div class="v" style="font-size:13px">−${fM(d.upkeep)}/mo</div></div>`}
      </div>
      ${btn}
    </div>`;
  }).join('');
  // Collapsed raw-material strip (2026-07-03 prune): one compact row per commodity — price,
  // coverage, and the single remaining decision (bulk-buy when it's on sale). Routine per-unit
  // buying and the 12-mo contract lock were retired as low-pull surface; consumeMaterialsForBuild
  // and the spot-price walk underneath are untouched, so builds still price exactly as before.
  const blend=materialCostMult();
  const blendColor = blend>1.10?'var(--bad)':(blend>1.03?'var(--warn)':(blend<0.97?'var(--ok)':'var(--ink)'));
  const blendDelta = ((blend-1)*100);
  const materialRows = MATERIAL_DEFS.map(d=>{
    const s=materialState(d.key);
    const spotCol = s.spot>1.15?'var(--bad)':(s.spot>1.05?'var(--warn)':(s.spot<0.92?'var(--ok)':'var(--ink)'));
    const trend = s.spot>s.prev?'↑':(s.spot<s.prev?'↓':'·');
    const cov = materialMonthsCoverage(d.key);
    const covTxt = cov===Infinity?'∞':(cov<1?`${(cov*30|0)}d`:`${cov.toFixed(1)}mo`);
    const dip = isMaterialDip(d.key);
    const buy = dip ? canBuyMaterialDip(d.key) : {ok:false};
    const dipBtn = dip
      ? `<button class="btn ${buy.ok?'launch':'ghost'}" style="padding:4px 9px;font-size:12px;font-weight:600" onclick="buyMaterialDip('${d.key}')" ${buy.ok?'':'disabled'} title="${buy.ok?`Bulk-buy ${buy.units} builds-worth at ${materialDipUnitCost(d.key).toFixed(2)}× (yard cap ${MATERIAL_STOCK_CAP})`:'Not enough capital, or yard is full'}">📦 On sale — buy ${buy.units||materialDipUnits(d.key)}× (${fM(materialDipTotal(d.key))})</button>`
      : `<span class="dim" style="font-size:12px">watching for a dip ≤${MATERIAL_DIP_THRESHOLD.toFixed(2)}×</span>`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0;border-top:1px solid #2a2a2a">
      <div style="min-width:150px;font-weight:600">${d.icon} ${d.name} <span class="dim" style="font-size:11px;font-weight:400">· ${Math.round(d.share*100)}%</span></div>
      <div style="opacity:.95">${materialSparklineSVG(d.key, 84, 22)}</div>
      <div style="min-width:120px;text-align:right">
        <span style="color:${spotCol};font-weight:600">${s.spot.toFixed(2)}×</span> <span class="dim" style="font-size:11px">${trend}</span>
        <span class="dim" style="font-size:11px"> · stock ${s.stock} (${covTxt})</span>
      </div>
      <div style="min-width:190px;text-align:right">${dipBtn}</div>
    </div>`;
  }).join('');
  return `<div class="card" style="margin-bottom:12px;border-color:var(--hud-line)">
      <h2 style="margin-bottom:6px">🏭 Manufacturing Capacity</h2>
      <p class="muted" style="font-size:12px;margin:-2px 0 8px">Industry is a resource of its own. Each production line costs capital to expand and adds monthly upkeep — so growing your factory competes with R&amp;D and missions for the budget. ${capNote}.</p>
      ${banner}
      <div class="metrics adv-only" style="margin-bottom:10px">
        <div class="metric"><div class="k">Assembly capacity</div><div class="v">${cap} units</div></div>
        <div class="metric" title="Recent build volume vs. sustainable cadence (last ${CADENCE_WINDOW} mo). Bar fills toward the dashed 100% line — once you cross it you pay a rush surcharge."><div class="k">Build cadence</div><div class="v" style="color:${cadenceColor}">${cadenceVal}</div><div style="margin-top:4px">${cadenceGaugeSVG(160,8)}</div></div>
        <div class="metric"><div class="k">Build-cost economy</div><div class="v">−${Math.round((1-foundryCostMult())*100)}%</div></div>
        <div class="metric"><div class="k">Launch-cost economy</div><div class="v">−${Math.round((1-padLaunchMult())*100)}%</div></div>
        <div class="metric"><div class="k">Build quality</div><div class="v" style="color:${qaRelBonus()>0?'var(--ok)':'var(--ink)'}">+${(qaRelBonus()*100).toFixed(1)}% rel</div></div>
        <div class="metric"><div class="k">Defect catch</div><div class="v" style="color:${(1-qaFragMult())>0?'var(--ok)':'var(--ink)'}">−${Math.round((1-qaFragMult())*100)}% mfg share</div></div>
        <div class="metric" title="Blended raw-material multiplier on every new build: ${Math.round(MATERIAL_BASELINE_SHARE*100)}% baseline + ${MATERIAL_DEFS.map(d=>Math.round(d.share*100)+'% '+d.name.toLowerCase()).join(' + ')}."><div class="k">Materials</div><div class="v" style="color:${blendColor}">${blendDelta>=0?'+':''}${blendDelta.toFixed(0)}%</div></div>
        <div class="metric"><div class="k">Total upkeep</div><div class="v" style="color:${productionUpkeep()>0?'var(--bad)':'var(--ink)'}">${productionUpkeep()>0?'−'+fM(productionUpkeep())+'/mo':'none'}</div></div>
      </div>
      ${buildQueuePanelHTML()}
      <div class="card adv-only dombar-economy" style="background:var(--panel2);margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div class="mission-name" style="font-size:14px">📦 Raw-material supply</div>
          <div class="dim" style="font-size:12px">spot prices wander monthly · stock up when a commodity's on sale</div>
        </div>
        ${materialRows}
      </div>
      ${engineYardPanelHTML()}
      ${partYardPanelHTML()}
      ${cards}
    </div>`;
}
function renderInfrastructure(){
  const built=FACILITY_DEFS.filter(d=>facilityBuilt(d.id));
  const totalIncome=totalFacilityIncome();
  const totalFuel=built.reduce((a,d)=>a+facilityProduction(d,facilityState(d.id)).fuel,0);
  const totalSci=built.reduce((a,d)=>a+facilityProduction(d,facilityState(d.id)).sci,0);
  const cards=FACILITY_DEFS.map(def=>{
    const bodyName=(BODIES.find(b=>b.id===def.body)||{}).name||def.body;
    if(facilityBuilt(def.id)){
      const fs=facilityState(def.id), pr=facilityProduction(def,fs), bonus=facilityBonus(def.body);
      const ec=expandCost(def.id), em=expandMonths(def), canEx=state.money>=ec;
      // CE4(b): standing resupply obligation
      const sup=facilitySupplyMonths(def.id), starved=facilityStarved(def.id), rsC=resupplyCost(def.id), canRs=canResupply(def.id).ok;
      const supFrac=Math.max(0,Math.min(1, facilitySupply(def.id)/FAC_SUPPLY_MONTHS));
      const supCol=starved?'var(--bad)':(sup<=2?'var(--warn,#d9a441)':'var(--ok)');
      const supLabel=starved?'OUT OF SUPPLY — crew on reserves':(sup<=2?`${sup} mo of provisions — resupply soon`:`${sup} mo of provisions`);
      return `<div class="card" style="background:var(--panel2);margin-bottom:12px;border-color:${starved?'var(--bad)':def.color}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div class="mission-name" style="font-size:15px"><span style="color:${def.color}">${def.icon} ${def.name}</span> <span class="pill ok">${fs.modules} module${fs.modules>1?'s':''}</span>${starved?' <span class="pill lock" style="color:var(--bad)">starved</span>':''}</div>
          <div class="dim" style="font-size:12px">at ${bodyName} · since ${fs.since||'—'}</div>
        </div>
        <div class="sub" style="margin:2px 0 8px">${def.blurb}</div>
        <div style="margin:6px 0 8px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span class="dim">Resupply</span><span style="color:${supCol}">${supLabel}</span></div>
          <div style="height:6px;border-radius:3px;background:var(--panel);overflow:hidden"><div style="height:100%;width:${Math.round(supFrac*100)}%;background:${supCol}"></div></div>
        </div>
        <div class="metrics">
          <div class="metric"><div class="k">Income</div><div class="v" style="color:var(--ok)">+${fM(pr.income)}/mo</div></div>
          ${pr.fuel>0?`<div class="metric"><div class="k">Propellant → depot</div><div class="v">+${pr.fuel.toFixed(1)} t/mo</div></div>`:''}
          <div class="metric"><div class="k">Science</div><div class="v" style="color:var(--readout)">+${pr.sci.toFixed(1)} ⚛/mo</div></div>
          <div class="metric"><div class="k">Prestige</div><div class="v">+${pr.rep.toFixed(1)}/mo</div></div>
          <div class="metric"><div class="k">Home-field bonus</div><div class="v">−${Math.round(bonus.buildDiscount*100)}% build · +${(bonus.relBump*100).toFixed(1)}% rel</div></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn" style="flex:1" onclick="resupplyFacility('${def.id}')" ${canRs?'':'disabled'}>${resupplyInTransit(def.id)?'📦 Resupply en route':(facilitySupply(def.id)>=FAC_SUPPLY_MONTHS?'Fully provisioned':`Resupply · ${fM(rsC)}`)}</button>
          <button class="btn" style="flex:1" onclick="expandFacility('${def.id}')" ${canEx?'':'disabled'}>Expand → ${fs.modules+1} · ${fM(ec)} · ${em} mo</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;font-size:12px">
          <span class="dim" title="When on, this base automatically reorders resupply the moment its provisions fall to ${AUTO_RESUPPLY_THRESHOLD} months or below — same cost, market price and en-route gate as clicking Resupply yourself. It can spend during a fuel-price spike, so watch the log.">Auto-resupply</span>
          <button class="btn ghost" style="font-size:12px;padding:4px 10px;${fs.autoResupply?'border-color:var(--ignite);color:var(--ignite)':''}" onclick="toggleAutoResupply('${def.id}')">${fs.autoResupply?'On ✓':'Off'}</button>
        </div>
        ${facilitySupply(def.id)>=FAC_SUPPLY_MONTHS?'':'<div class="dim" style="font-size:11px;margin-top:4px">Resupply cost incl. propellant at market rate.</div>'}
      </div>`;
    }
    const chk=canFound(def.id), reqDone=!def.reqMission||state.completed[def.reqMission];
    const reqName=def.reqMission?MISSIONS.find(m=>m.id===def.reqMission).name:'';
    return `<div class="card" style="margin-bottom:12px;opacity:${reqDone?1:0.7}">
      <div class="mission-name" style="font-size:15px"><span style="color:${def.color}">${def.icon} ${def.name}</span> ${reqDone?'<span class="pill">foundable</span>':`<span class="pill lock">needs ${reqName}</span>`}</div>
      <div class="sub" style="margin:2px 0 8px">${def.blurb}</div>
      <div class="dim" style="font-size:12px;margin-bottom:8px">Found at ${bodyName}: ${fM(def.foundCost)} · ${def.foundMonths} mo. Then expand it module by module — it produces income and propellant, and makes missions to ${bodyName} cheaper and more reliable, forever.</div>
      <button class="btn launch" onclick="foundFacility('${def.id}')" ${chk.ok?'':'disabled'}>${chk.ok?`Establish ${def.name} · ${fM(def.foundCost)}`:chk.why}</button>
    </div>`;
  }).join('');
  const fp=state.fuelPrice;
  const trend = fp>state.fuelPrevPrice+0.001?'<span style="color:var(--bad)">▲</span>':(fp<state.fuelPrevPrice-0.001?'<span style="color:var(--ok)">▼</span>':'<span class="dim">—</span>');
  const buyer=state.fuelBuyer;
  const depotCard = state.research.orbital_depot
    ? `<div class="card" style="margin-bottom:12px;background:var(--panel2)">
        <div class="mission-name" style="font-size:15px">⬢ LEO Propellant Market</div>
        <div class="sub" style="margin:2px 0 8px">Trade propellant through your depot. Sell what your ISRU bases and tanker runs produce, or stockpile cheap fuel to top off a big mission. Prices drift with supply and demand — and a rival short on fuel may pay a premium.</div>
        <div class="metrics">
          <div class="metric"><div class="k">Spot price</div><div class="v">${fM(fp)}/t ${trend}</div></div>
          <div class="metric"><div class="k">In depot</div><div class="v">${state.depot.toFixed(1)} t</div></div>
          <div class="metric"><div class="k">Buy / Sell</div><div class="v">${fM(fuelBuyPrice())} / ${fM(fuelSellPrice())}</div></div>
          <div class="metric"><div class="k">Holdings value</div><div class="v" style="color:var(--ok)">${fM(round2(state.depot*fuelSellPrice()))}</div></div>
        </div>
        ${buyer?`<div class="flag ok" style="margin-top:8px"><span style="color:${buyer.color}">◆ ${buyer.name}</span> is buying at <b>${fM(buyer.price)}/t</b> · up to ${buyer.cap.toFixed(0)} t · ${buyer.monthsLeft} mo left</div>`:''}
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn" onclick="buyFuel(10)" ${state.money>=10*fuelBuyPrice()?'':'disabled'}>Buy 10 t · ${fM(round2(10*fuelBuyPrice()))}</button>
          <button class="btn" onclick="buyFuel(25)" ${state.money>=25*fuelBuyPrice()?'':'disabled'}>Buy 25 t</button>
          <button class="btn" onclick="sellFuel(10)" ${state.depot>=10?'':'disabled'}>Sell 10 t</button>
          <button class="btn" onclick="sellFuel(${state.depot})" ${state.depot>0?'':'disabled'}>Sell all (${state.depot.toFixed(1)} t)</button>
        </div>
       </div>`
    : '';
  $('infraCard').innerHTML=`${productionPanelHTML()}
    <h2>Infrastructure — what you build stays</h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 10px">Found a station or base once you've proven the capability, then invest to grow it. Facilities persist and produce every month for the rest of the game — passive income, propellant to the depot, prestige — and give a home-field advantage to missions at that body. A landing is a moment; a base is a legacy.</p>
    ${built.length?`<div class="metrics adv-only" style="margin-bottom:12px">
      <div class="metric"><div class="k">Facilities</div><div class="v">${built.length}</div></div>
      <div class="metric"><div class="k">Total income</div><div class="v" style="color:var(--ok)">+${fM(totalIncome)}/mo</div></div>
      <div class="metric"><div class="k">Propellant output</div><div class="v">+${totalFuel.toFixed(1)} t/mo</div></div>
      <div class="metric"><div class="k">Science output</div><div class="v" style="color:var(--readout)">+${totalSci.toFixed(1)} ⚛/mo · ${Math.round(state.science||0)} banked</div></div>
    </div>`:''}
    ${cards}
    ${depotCard}`;
}
function renderNextObjective(){
  const el=$('nextObjStatus'); if(!el) return;
  const nx=nextObjective();
  setHTML(el, nx
    ? `<span style="color:var(--readout)">▶ Next:</span> ${nx.mission.name} <span class="dim">· ${nx.program.name}</span>`
    : `<span style="color:var(--ok)">All programs complete — the frontier is yours.</span>`);
}
function renderPrograms(){
  // ---- ambition card ----
  const amb=currentAmbition(), prog=ambitionProgress();
  const ambChips=AMBITIONS.map(a=>{
    const sel=a.id===state.ambition;
    const cap=MISSIONS.find(m=>m.id===a.capstone);
    return `<div class="diffcard ${sel?'sel':''}" style="cursor:pointer" onclick="setAmbition('${a.id}')">
      <div class="tag">${sel?'your ambition':'set as ambition'}</div>
      <h3>${a.name}</h3>
      <p>${a.blurb}</p>
      <div class="dim" style="font-size:12px;margin-top:6px">Capstone: ${cap?cap.name:a.capstone}${state.completed[a.capstone]?' · <span style="color:var(--ok)">achieved</span>':''}</div>
    </div>`;
  }).join('');
  $('ambitionCard').innerHTML=`<h2>Ambition — your company's long game</h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 10px">A personal goal to chase across the decades. Every contract is a step toward it. Change it anytime — there is always a further horizon.</p>
    <div class="mission-tag">Progress toward “${amb.name}”</div>
    <div class="bar" style="margin:6px 0 4px"><div class="fill" style="width:${prog.pct}%;background:${prog.capstoneDone?'var(--ok)':'var(--ignite)'}"></div></div>
    <div class="dim" style="font-size:12px;margin-bottom:12px">${prog.done}/${prog.total} milestones flown · ${prog.pct}%${prog.capstoneDone?' · <span style="color:var(--ok)">ambition fulfilled</span>':''}</div>
    <div class="diffgrid" style="grid-template-columns:1fr 1fr">${ambChips}</div>`;
  // ---- program ladder ----
  const nx=nextObjective();
  const rows=PROGRAMS.map(p=>{
    const done=programComplete(p), awarded=state.programsAwarded[p.id];
    const total=p.missions.length, completed=p.missions.filter(mid=>state.completed[mid]).length;
    const objs=p.missions.map(mid=>{
      const m=MISSIONS.find(x=>x.id===mid); if(!m) return '';
      const isDone=state.completed[mid];
      const repOk=state.rep>=m.minRep, resOk=missionTechMet(m);
      const isNext=nx&&nx.missionId===mid;
      const pill=isDone?'<span class="pill ok">done</span>'
                : (repOk&&resOk)?'<span class="pill">available</span>'
                : `<span class="pill lock">locked</span>`;
      const btn=(!isDone&&repOk&&resOk)?`<button class="btn" onclick="flyTo('${mid}')">Fly this</button>`:'';
      return `<div class="leg" style="${isNext?`background:${themeRgba('ignite',0.08)}`:''}">
        <span class="legname">${isNext?'▶ ':''}${m.name} ${pill}</span>
        <span class="legdv">${m.crew?`${m.crew} crew`:'robotic'}</span>
        <span class="legdetail" style="display:flex;justify-content:space-between;align-items:center"><span>${m.days?`${m.days<1?(m.days*24).toFixed(0)+'h':m.days+'d'}`:'suborbital'}</span>${btn}</span>
      </div>`;
    }).join('');
    const status=done?`<span class="pill ok">complete${awarded?' · bonus paid':''}</span>`:`<span class="pill">${completed}/${total}</span>`;
    return `<div class="card" style="background:var(--panel2);margin-bottom:12px;${done?'border-color:var(--ok)':''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div class="mission-name" style="font-size:15px">${p.name} ${status}</div>
        <div class="dim" style="font-size:12px;white-space:nowrap">Bonus: +${fM(p.reward.money)}, +${p.reward.rep} rep</div>
      </div>
      <div class="sub" style="margin:2px 0 8px">${p.blurb}</div>
      <div class="legs">${objs}</div>
    </div>`;
  }).join('');
  $('programsCard').innerHTML=`<h2>Programs — campaigns, not one-off contracts</h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 12px">Each program groups missions into a goal with a completion bonus. Fly them in any order you can unlock; finishing a program pays out and points you at the next.</p>
    ${rows}`;
}

function renderSpecialBanner(){
  const sc=state.specialContract; if(!sc) return '';
  const left=sc.deadlineAbs-absMonth();
  const m=MISSIONS.find(x=>x.id===sc.missionId);
  return `<div class="card" style="border-color:var(--ignite);margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
      <b style="color:var(--ignite);font-size:13px">★ ${sc.title}</b>
      <span style="font-family:var(--mono);font-size:12px;color:${left<=3?'var(--warn)':'var(--muted)'}">${left} mo left</span>
    </div>
    <p class="muted" style="font-size:12px;margin:4px 0">${sc.flavor}</p>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-family:var(--mono);font-size:13px;color:var(--ok)">+${fM(sc.bonus)} bonus on top of the normal payout</span>
      <button class="btn" style="font-size:12px" onclick="selectMission('${sc.missionId}');setTab('bench')">Fly ${m?m.name:''} ▸</button>
    </div>
  </div>`;
}
// E1.3: procedural filler contracts — a small rotating board of era + capability-gated offers,
// same mount pattern as renderSpecialBanner but for 0-CONTRACT_OFFER_CAP live offers at once.
function renderContractOffers(){
  const offers=state.contractOffers||[]; if(!offers.length) return '';
  return offers.map(o=>{
    const left=o.expiresAbs-absMonth();
    return `<div class="card" style="border-color:var(--readout);margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
        <b style="color:var(--readout);font-size:13px">📋 ${esc(o.name)}</b>
        <span style="font-family:var(--mono);font-size:12px;color:${left<=2?'var(--warn)':'var(--muted)'}">${left} mo left</span>
      </div>
      <p class="muted" style="font-size:12px;margin:4px 0">${esc(o.blurb)}</p>
      ${o.rivalBid?(()=>{ const r=RIVALS.find(x=>x.id===o.rivalBid.rivalId); const left2=o.rivalBid.snatchAbs-absMonth();
        return `<p style="font-size:12px;color:var(--warn);margin:0 0 4px">${r?r.flag:''} ${r?esc(r.name):'A rival'} is bidding on this — commit within ${Math.max(0,left2)} mo or lose it.</p>`; })():''}
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:var(--mono);font-size:13px;color:var(--ok)">+${fM(o.payout)}, +${o.rep} rep</span>
        <button class="btn" style="font-size:12px" onclick="selectMission('${o.id}');setTab('bench')">Fly ▸</button>
      </div>
    </div>`;
  }).join('');
}
function renderPassiveContracts(targetId){
  const box=$(targetId||'passiveCard'); if(!box) return;
  const totMo=passiveMonthlyIncome();
  let html=`<h2>Passive Income${totMo>0?` <span class="pill ok">+${fM(totMo)}/mo</span>`:''}</h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 10px">Standing contracts pay a fixed monthly income for a fixed term, then expire onto a cooldown. Each renewal of the same contract pays a little less.</p>`;
  let any=false;
  for(const cat in PASSIVE_CATS){
    const rows=PASSIVE_CONTRACT_DEFS.filter(d=>d.cat===cat).map(d=>{
      const st=passiveStatus(d.id), ac=passiveActive(d.id);
      if(st==='locked' && !ac) return ''; // hide contracts whose prerequisites aren't met yet
      any=true;
      const signings=passiveSignings(d.id);
      const dimNote = signings>0 ? ` <span class="dim">· renewals pay ${Math.round(passiveDiminish(d.id)*100)}% of base (${signings} prior)</span>` : '';
      let pill='', right='', btn='';
      if(ac){
        const pct=Math.round(100*(d.term-ac.monthsLeft)/d.term);
        pill=' <span class="pill ok">active</span>';
        right=`<div class="reward"><div class="p">+${fM(ac.income)}/mo</div><div class="r">${ac.monthsLeft} mo left</div></div>`;
        btn=`<button class="btn" disabled>Running</button>`;
        right+=`<div style="width:100%;height:4px;background:#1a2230;border-radius:3px;margin-top:6px"><div style="width:${pct}%;height:100%;background:var(--ok);border-radius:3px"></div></div>`;
      } else if(st==='cooldown'){
        pill=' <span class="pill lock">cooldown</span>';
        right=`<div class="reward"><div class="r">renew in ${passiveCooldownLeft(d.id)} mo</div></div>`;
        btn=`<button class="btn" disabled>On cooldown</button>`;
      } else {
        const inc=passiveIncomeNow(d.id), afford=state.money>=d.setup;
        right=`<div class="reward"><div class="p">+${fM(inc)}/mo</div><div class="r">${d.term} mo term</div></div>`;
        btn=`<button class="btn" onclick="signPassiveContract('${d.id}')" ${afford?'':'disabled'}>Sign · ${fM(d.setup)}</button>`;
      }
      const meta=`base +${fM(d.income)}/mo · setup ${fM(d.setup)} · ${(d.cooldown||PASSIVE_COOLDOWN)} mo cooldown${d.support?` · +${d.support} public support`:''}${dimNote}`;
      const disp=passiveContractDisplay(d);
      return `<div class="item"><div class="body"><div class="title">${disp.name}${pill}</div>
        <div class="sub">${disp.blurb}</div>
        <div class="sub num" style="margin-top:4px;color:var(--readout)">${meta}</div></div>${right}${btn}</div>`;
    }).filter(Boolean);
    if(!rows.length) continue;
    const open=contractAccordion[cat]!==false;
    html+=`<button class="rail-acc-btn ${open?'open':''}" style="margin-top:8px" onclick="toggleContractAccordion('${cat}')"><span>${PASSIVE_CATS[cat]}</span><span class="rail-acc-sign"></span></button><div class="rail-acc-body ${open?'open':''}">${rows.join('')}</div>`;
  }
  if(!any) html+=`<p class="dim" style="font-size:12px">No standing contracts available yet — reach orbit, fly crews and license technology to open them up.</p>`;
  box.innerHTML=html;
}

function renderFlightContractsPopout(){
  const rows=MISSIONS.filter(m=>!state.completed[m.id] && state.rep>=m.minRep && missionTechMet(m)).map(m=>`<div class="item"><div class="body"><div class="title">${esc(m.name)}</div><div class="sub">${esc(m.blurb||'')}</div><div class="sub num" style="margin-top:4px;color:var(--readout)">+${fM(m.payout)} · +${m.rep} rep</div></div><button class="btn" onclick="selectMission('${m.id}');closeContractsPopout();setTab('bench')">Fly ▸</button></div>`).join('');
  const offers=renderContractOffers();
  return `<button class="rail-acc-btn ${contractAccordion.flight?'open':''}" onclick="toggleContractAccordion('flight')"><span>Flight Contracts</span><span class="rail-acc-sign"></span></button><div class="rail-acc-body ${contractAccordion.flight?'open':''}">${offers}${rows||'<p class="dim" style="font-size:12px">No flyable contracts available right now.</p>'}</div>`;
}
let contractsPopoutOpen=false;
function openContractsPopout(){
  if(contractsPopoutOpen) return; contractsPopoutOpen=true; closeOtherPopouts('contracts');
  const ov=document.createElement('div'); ov.className='vehpop-scrim'; ov.id='contractsPopout';
  ov.innerHTML=`<div class="vehpop-bar"><span class="vehpop-title">⌁ Contracts</span><span class="vehpop-hint">expand categories · Esc/Enter to close</span><button class="vehpop-x" onclick="closeContractsPopout()">✕ Close</button></div><div class="vehpop-body"><main class="vehpop-stats wide" style="flex:1;max-width:none;border-left:0;padding:18px 22px"><div style="max-width:1100px;margin:0 auto"><div class="metrics"><div class="metric"><div class="k">Standing income</div><div class="v" style="color:var(--ok)">+${fM(passiveMonthlyIncome())}/mo</div></div><div class="metric"><div class="k">Mission contracts</div><div class="v">${availableContracts()}</div></div></div><div id="contractsPopFlight" style="margin-top:12px"></div><div id="contractsPopPassive" style="margin-top:12px"></div></div></main></div>`;
  document.body.appendChild(ov); fadeInScrim(ov);
  const flight=$('contractsPopFlight'); if(flight) flight.innerHTML=renderFlightContractsPopout();
  renderPassiveContracts('contractsPopPassive');
}
function closeContractsPopout(){ if(!contractsPopoutOpen) return; contractsPopoutOpen=false; removeScrim('contractsPopout'); }

function renderMissions(){
  { const el=$('specialBannerMount'); if(el) el.innerHTML=renderSpecialBanner(); }
  { const el=$('contractOffersMount'); if(el) el.innerHTML=renderContractOffers(); }
  renderPassiveContracts();
  const box=$('missionList'); box.innerHTML='';
  MISSIONS.forEach(m=>{
    const done=state.completed[m.id];
    const repOk=state.rep>=m.minRep;
    const resOk=!m.reqResearch||state.research[m.reqResearch];
    const avail=repOk&&resOk;
    const active=state.activeMission===m.id;
    const scooped = !done && state.scooped[m.id];
    let pill = active?'<span class="pill active">selected</span>'
            : done?'<span class="pill ok">done</span>'
            : !resOk?`<span class="pill lock">needs ${m.reqResearch?RESEARCH.find(r=>r.id===m.reqResearch).name:'research'}</span>`
            : !repOk?`<span class="pill lock">needs ${m.minRep} rep</span>`
            : '<span class="pill">open</span>';
    if(scooped && avail) pill += ' <span class="pill lock">scooped</span>';
    const previewPayout = done ? m.payout*0.4 : (scooped ? m.payout*SCOOP_PAYOUT_MULT : m.payout);
    const durTxt = m.days>=1 ? m.days+' days' : (m.days*24).toFixed(0)+' h';
    const detail = m.tanker
      ? `required Δv ${fI(m.reqDv)} m/s · delivers propellant to the LEO depot`
      : m.profile // deep-space missions: total profile Δv (no single reqDv)
      ? `${fI(m.profile.reduce((a,p)=>a+p.dv,0))} m/s total Δv${m.crew?` · ${m.crew} crew`:''} · ${durTxt}`
      : m.crew
      ? `required Δv ${fI(m.reqDv)} m/s · ${m.crew} crew · ${durTxt}`
      : `required Δv ${fI(m.reqDv)} m/s · payload ${(m.payload*1000).toFixed(0)} kg`;
    const sciTag = m.sciMission ? ' <span class="pill" style="color:var(--readout);border-color:var(--readout)">science</span>' : '';
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`
      <div class="body">
        <div class="title">${m.name} ${pill}${sciTag}</div>
        <div class="sub">${m.blurb}</div>
        <div class="sub num" style="margin-top:4px;color:var(--readout)">${detail}</div>
      </div>
      <div class="reward"><div class="p">+${fM(previewPayout)}</div><div class="r">+${done?2:m.rep} rep</div>${m.sciYield?`<div class="r" style="color:var(--readout)">+${m.sciYield} ⚛</div>`:''}</div>
      <button class="btn" onclick="selectMission('${m.id}')" ${avail?'':'disabled'}>${active?'Selected':'Select'}</button>`;
    box.appendChild(div);
  });
}

/* ---------- tech tree (Civ/KSP-style horizontal flow) ---------- */
function missionGateResearch(r){ return r.reqMissionDone ? (MISSIONS.find(m=>m.id===r.reqMissionDone)||{}).reqResearch : null; }
let _tierCache=null;
function researchTier(id){
  if(!_tierCache) _tierCache={};
  if(_tierCache[id]!=null) return _tierCache[id];
  _tierCache[id]=0; // cycle guard
  const r=RESEARCH.find(x=>x.id===id); if(!r){ return 0; }
  let t=0;
  r.req.forEach(q=>{ t=Math.max(t, researchTier(q)+1); });
  const gate=missionGateResearch(r);
  if(gate && RESEARCH.find(x=>x.id===gate)) t=Math.max(t, researchTier(gate)+1);
  _tierCache[id]=t; return t;
}
function researchNodeState(r){
  if(state.research[r.id]) return 'done';
  if(state.activeResearch && state.activeResearch.id===r.id) return 'active';
  if(reqsMet(r)) return 'available';
  return 'locked';
}
// #6: pure swimlane layout — nodes grouped into per-track lanes, x by tier.
// No DOM access, so it can be exercised headlessly.
const TECH_DIMS={COLW:158, ROWH:50, NW:134, NH:42, PADX:118, PADTOP:12, LANEGAP:8};
function techLayout(){
  const D=TECH_DIMS;
  const nodes={}; const lanes=[]; let laneTop=D.PADTOP, maxTier=0;
  RESEARCH.forEach(r=>{ maxTier=Math.max(maxTier, researchTier(r.id)); });
  TRACKS.forEach(tr=>{
    const list=RESEARCH.filter(r=>(r.track||'propulsion')===tr.key).sort((a,b)=>researchTier(a.id)-researchTier(b.id));
    if(!list.length) return;
    // sub-row per node: nodes sharing a tier get distinct rows so none collide on (x,y)
    const tierSeen={}; let subRows=1;
    list.forEach(r=>{ const t=researchTier(r.id); const idx=(tierSeen[t]=(tierSeen[t]||0)); tierSeen[t]++; subRows=Math.max(subRows, idx+1);
      nodes[r.id]={x:D.PADX+t*D.COLW, y:laneTop+idx*D.ROWH, track:tr.key}; });
    const h=subRows*D.ROWH;
    lanes.push({key:tr.key, label:tr.label, color:tr.color, y:laneTop, h});
    laneTop+=h+D.LANEGAP;
  });
  const W=D.PADX+(maxTier+1)*D.COLW+14, H=laneTop-D.LANEGAP+D.PADTOP;
  return {nodes, lanes, W, H, NW:D.NW, NH:D.NH};
}
// Presentation pass: tech-tree zoom. techZoom scales the rendered SVG (the viewBox is
// unchanged, so coordinates/onclick stay correct); the #techTree pane scrolls to reach
// off-screen nodes. Driven by the toolbar buttons, wheel-to-zoom, and the +/-/0 keys.
let techZoom=1, techExpanded=false;
const TECH_ZOOM_MIN=0.5, TECH_ZOOM_MAX=2.4;
function setTechZoom(z){ techZoom=clampA(z, TECH_ZOOM_MIN, TECH_ZOOM_MAX); renderTechTree(); }
function zoomTech(factor){ setTechZoom(techZoom*factor); }
function resetTechZoom(){ setTechZoom(1); }
// pop the tree out to a full-screen overlay (same pane, so zoom/drag/clicks keep working)
function toggleTechExpand(){ techExpanded=!techExpanded; renderTechTree(); const el=$('techTree'); if(el){ try{ el.focus(); }catch(e){} } }

/* ---------- Tech tree interaction layer: filters, prereq-path highlight, progress ---------- */
let techFilter=null;        // track key to solo, or null for all
let techFocus=null;         // node id whose prereq chain is highlighted, or null
let techQuery='';           // searchable tech-tree text
// full transitive prerequisite set of a node (research reqs + mission-gate reqs)
function techPrereqChain(id, seen){
  seen=seen||new Set();
  const r=RESEARCH.find(x=>x.id===id); if(!r) return seen;
  const feed=[...(r.req||[])]; const gate=missionGateResearch(r); if(gate) feed.push(gate);
  feed.forEach(q=>{ if(q && !seen.has(q)){ seen.add(q); techPrereqChain(q, seen); } });
  return seen;
}
// the highlight set = the focused node + its entire prereq chain
function techHighlightSet(){
  if(!techFocus) return null;
  const s=techPrereqChain(techFocus); s.add(techFocus); return s;
}
// per-track progress: {done, total, active}
function trackProgress(key){
  const list=RESEARCH.filter(r=>(r.track||'propulsion')===key);
  const done=list.filter(r=>state.research[r.id]).length;
  const active=state.activeResearch && trackOf(state.activeResearch.id)===key;
  return {done, total:list.length, active, pct: list.length?Math.round(done/list.length*100):0};
}
// Vertical track-filter list for the R&D right rail — compact, no longer eats tree height.
function renderTechFilters(){
  const el=$('techFilters'); if(!el) return;
  const availN=availableTechCount();
  const rows=TRACKS.map(t=>{ const p=trackProgress(t.key); const on=techFilter===t.key; const complete=p.done>=p.total;
    return `<button onclick="setTechFilter('${t.key}')" title="${t.label} — ${p.done}/${p.total} researched. Click to filter the tree." style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:5px 8px;margin:0 0 3px;border-radius:7px;cursor:pointer;font-size:12px;border:1px solid ${on?t.color:'transparent'};background:${on?t.color+'1e':'transparent'};color:${on?t.color:'var(--muted)'}">
      <span style="width:9px;height:9px;border-radius:50%;background:${t.color};flex:0 0 auto;${complete?'':'opacity:.5'}"></span>
      <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.label}</span>
      <b style="font-family:var(--mono);font-size:11px;opacity:${complete?1:0.75};color:${complete?t.color:'inherit'}">${p.done}/${p.total}</b>
    </button>`; }).join('');
  el.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div class="cc-panel-h" style="margin:0">⚛ Tracks</div>
      ${availN>0 && !state.activeResearch?`<span style="font-size:11px;color:var(--ignite);font-family:var(--mono)" title="Nodes you can research right now">● ${availN} ready</span>`:''}
    </div>
    ${rows}
    ${(techFocus||techFilter)?`<button class="btn ghost" style="width:100%;margin-top:8px;font-size:12px;padding:4px" onclick="clearTechView()" title="Clear highlight & filter">✕ Clear filter / highlight</button>`:''}`;
}

function setTechFilter(key){ techFilter=(techFilter===key)?null:key; techFocus=null; renderTechTree(); }
function setTechFocus(id){ techFocus=(techFocus===id)?null:id; renderTechTree(); }
function clearTechFocus(){ if(techFocus){ techFocus=null; renderTechTree(); } }
function clearTechView(){ techFocus=null; techFilter=null; renderTechTree(); }
function setTechSearch(value){
  techQuery=String(value||'').trim().toLowerCase();
  renderTechTree();
  const input=$('techSearch');
  if(input){ input.focus(); input.setSelectionRange(input.value.length,input.value.length); }
}
function techSearchMatch(r){
  if(!r) return false;
  if(!techQuery) return true;
  const track=(TRACKS.find(t=>t.key===r.track)||{}).label||r.track||'';
  return [r.id,r.name,r.desc,r.track,track].some(v=>String(v||'').toLowerCase().includes(techQuery));
}
// how many not-yet-researched nodes are buyable right now
function availableTechCount(){ return RESEARCH.filter(r=>researchNodeState(r)==='available').length; }

function renderTechTree(){
  const el=$('techTree'); if(!el) return;
  const L=techLayout(), NW=L.NW, NH=L.NH;
  const palette={ done:{fill:'#13241b',text:'#cfe8d6'}, active:{fill:'#123653',text:'#bde8ff'},
                  available:{fill:'#16222b',text:'#d0dce4'}, locked:{fill:'#0c1318',text:'#5a6a75'} };
  const hi=techHighlightSet(); // prereq-chain highlight (null = none)
  const inFilter=(key)=> !techFilter || key===techFilter;
  const nodeVisible=(r)=> inFilter(r.track||'propulsion');
  const nodeDim=(r)=> (hi && !hi.has(r.id)) || (techFilter && (r.track||'propulsion')!==techFilter) || !techSearchMatch(r);
  // faint lane bands + left-edge labels
  let bands='';
  L.lanes.forEach(ln=>{
    const dim=techFilter && ln.key!==techFilter;
    const p=trackProgress(ln.key);
    bands+=`<rect x="0" y="${ln.y-4}" width="${L.W}" height="${ln.h}" fill="${ln.color}" opacity="${dim?0.02:(ln.key===techFilter?0.09:0.05)}" rx="6"/>
      <text x="10" y="${ln.y+ln.h/2+3}" fill="${ln.color}" font-size="10" font-family="ui-sans-serif,system-ui" font-weight="600" opacity="${dim?0.3:0.85}">${ln.label} ${p.done}/${p.total}</text>`;
  });
  let edges='', nodes='';
  RESEARCH.forEach(r=>{
    const p=L.nodes[r.id]; if(!p) return; const x1=p.x, y1=p.y+NH/2;
    const drawEdge=(q,dashed)=>{ const pq=L.nodes[q]; if(!pq) return; const x0=pq.x+NW, y0=pq.y+NH/2;
      const done=state.research[q], col=trackColor(trackOf(q));
      const onChain = hi && hi.has(q) && hi.has(r.id);
      const dimmed = (hi && !onChain) || (techFilter && ((trackOf(q)!==techFilter) && ((r.track||'propulsion')!==techFilter))) || !techSearchMatch(RESEARCH.find(x=>x.id===q));
      const op = onChain?0.95 : dimmed?0.06 : (done?0.6:0.25);
      const w = onChain?2.4 : (done?1.7:1.1);
      edges+=`<path d="M ${x0} ${y0} C ${x0+38} ${y0}, ${x1-38} ${y1}, ${x1} ${y1}" fill="none" stroke="${onChain?'#ffd98a':col}" stroke-opacity="${op}" stroke-width="${w}" ${dashed?'stroke-dasharray="3,4"':''}/>`; };
    r.req.forEach(q=>drawEdge(q,false));
    const gate=missionGateResearch(r); if(gate) drawEdge(gate,true);
  });
  RESEARCH.forEach(r=>{
    const p=L.nodes[r.id]; if(!p) return;
    const st=researchNodeState(r), c=palette[st], tcol=trackColor(r.track);
    const sel=state.selectedResearch===r.id, locked=st==='locked';
    const dim=nodeDim(r), onChain=hi&&hi.has(r.id), avail=st==='available';
    const name=r.name.length>20?r.name.slice(0,19)+'…':r.name;
    const sub = st==='active' ? `${fmtTimeLeft(state.activeResearch.monthsLeft)} left` : `${fM(rdCostOf(r))}${sciGateCost(r)?` · ${sciGateCost(r)}⚛`:''} · ${r.months}mo`;
    const opacity = dim?0.18 : (locked?0.72:1);
    // available nodes you can afford right now get an amber 'ready' ring
    const canAfford = avail && state.money>=rdCostOf(r) && (!sciGateCost(r) || (state.science||0)>=sciGateCost(r)) && !state.activeResearch;
    const ring = canAfford && !dim ? `<rect x="${p.x-2.5}" y="${p.y-2.5}" width="${NW+5}" height="${NH+5}" rx="8" fill="none" stroke="var(--ignite)" stroke-width="1.6" stroke-opacity="0.9"><animate attributeName="stroke-opacity" values="0.9;0.35;0.9" dur="2s" repeatCount="indefinite"/></rect>` : '';
    const strokeCol = sel?'#ffffff' : onChain?'#ffd98a' : tcol;
    nodes+=`<g id="tn-${r.id}" style="cursor:pointer" onclick="selectResearch('${r.id}')" onmouseenter="showTechTip(event,'${r.id}')" onmousemove="moveTechTip(event)" onmouseleave="hideTechTip()" opacity="${opacity}">
      ${ring}
      <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="6" fill="${c.fill}" stroke="${strokeCol}" stroke-width="${sel?2.2:onChain?2:1.3}"/>
      <rect x="${p.x}" y="${p.y}" width="4" height="${NH}" rx="2" fill="${tcol}"/>
      ${st==='done'?`<text x="${p.x+NW-7}" y="${p.y+13}" fill="#58c47a" font-size="11" text-anchor="end">✓</text>`:''}
      ${avail&&!dim?`<text x="${p.x+NW-7}" y="${p.y+13}" fill="var(--ignite)" font-size="10" text-anchor="end">●</text>`:''}
      <text x="${p.x+11}" y="${p.y+17}" fill="${c.text}" font-size="10" font-family="ui-sans-serif,system-ui" font-weight="600">${name}</text>
      <text x="${p.x+11}" y="${p.y+32}" fill="${c.text}" font-size="9" font-family="ui-monospace,monospace" opacity="0.8">${sub}</text>
    </g>`;
  });
  // Track filters now live in the right rail (renderTechFilters); the toolbar keeps only
  // the active filter label + view controls, so the tree gets its full vertical height back.
  const availN=availableTechCount();
  const activeTrack = techFilter ? (TRACKS.find(t=>t.key===techFilter)||{}) : null;
  const searchCount = techQuery ? RESEARCH.filter(techSearchMatch).length : RESEARCH.length;
  const filterLabel = activeTrack
    ? `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:${activeTrack.color}"><span style="width:9px;height:9px;border-radius:50%;background:${activeTrack.color}"></span>${activeTrack.label} only <b style="font-family:var(--mono);opacity:.8">${trackProgress(techFilter).done}/${trackProgress(techFilter).total}</b></span>`
    : `<span class="dim" style="font-size:12px">All tracks — filter from the ⚛ Tracks panel →</span>`;
  const zw=(L.W*techZoom).toFixed(0), zh=(L.H*techZoom).toFixed(0);
  el.innerHTML=`<div style="position:sticky;top:0;z-index:2;background:var(--panel);display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 2px 8px">
      <label style="display:flex;align-items:center;gap:6px;flex:1 1 220px;min-width:180px"><span class="dim" style="font-size:12px">⌕</span><input id="techSearch" type="search" value="${esc(techQuery)}" placeholder="Search technology…" aria-label="Search technology tree" oninput="setTechSearch(this.value)" style="width:100%;padding:5px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--ink)"></label>
      ${techQuery?`<span class="dim" style="font-size:11px;white-space:nowrap">${searchCount} match${searchCount===1?'':'es'}</span>`:''}
      <div style="flex:1;min-width:120px;display:flex;align-items:center;gap:10px">
        ${filterLabel}
        ${availN>0 && !state.activeResearch?`<span style="font-size:12px;color:var(--ignite);font-family:var(--mono)" title="Nodes you can research right now">● ${availN} ready</span>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        ${(techFocus||techFilter||techQuery)?`<button class="btn ghost" style="padding:2px 9px;font-size:12px" onclick="techQuery='';clearTechView()" title="Clear search, highlight & filter">✕ Clear</button>`:''}
        <button class="btn ghost" style="padding:2px 9px" onclick="zoomTech(1/1.2)" title="Zoom out (−)">−</button>
        <span class="dim" style="font-size:12px;width:40px;text-align:center">${Math.round(techZoom*100)}%</span>
        <button class="btn ghost" style="padding:2px 9px" onclick="zoomTech(1.2)" title="Zoom in (+)">+</button>
        <button class="btn ghost" style="padding:2px 9px;font-size:12px" onclick="resetTechZoom()" title="Reset (0)">Reset</button>
        <button class="btn ghost" style="padding:2px 9px;font-size:12px" onclick="toggleTechExpand()" title="Pop out to full screen">${techExpanded?'⛶ Close':'⛶ Pop out'}</button>
        <span class="dim" style="font-size:11px;margin-left:4px">drag = pan · scroll = zoom</span>
      </div>
    </div>
    <svg viewBox="0 0 ${L.W} ${L.H}" width="${zw}" height="${zh}" xmlns="http://www.w3.org/2000/svg" style="max-width:none;display:block" onclick="if(event.target.tagName==='svg'||event.target.tagName==='rect'&&!event.target.closest('g'))clearTechFocus()">${bands}${edges}${nodes}</svg>`;
  el.classList.toggle('expanded', techExpanded); // pop-out full-screen state
  // #31 Slice 2: amber glow on the just-unlocked tech node
  if(_lastUnlockedTech){ const tg=el.querySelector('#tn-'+_lastUnlockedTech); if(tg){ tg.classList.add('tech-just-unlocked'); tg.addEventListener('animationend',()=>{ tg.classList.remove('tech-just-unlocked'); _lastUnlockedTech=null; },{once:true}); } else { _lastUnlockedTech=null; } }
  // wire wheel-to-zoom + grab-to-pan once (the pane div persists across re-renders; only innerHTML changes)
  if(!el._zoomWired){
    el._zoomWired=true;
    el.addEventListener('wheel', function(e){ e.preventDefault(); zoomTech(e.deltaY<0?1.12:1/1.12); }, {passive:false});
    // grab-to-pan: press the canvas and drag to move around the tree, like grabbing a map
    let dragging=false, moved=false, sx=0, sy=0, sl=0, st=0;
    el.addEventListener('mousedown', function(e){
      if(e.button!==0 || e.target.closest('button')) return; // left-drag only; let toolbar buttons work
      dragging=true; moved=false; sx=e.clientX; sy=e.clientY; sl=el.scrollLeft; st=el.scrollTop;
      el.classList.add('grabbing');
    });
    window.addEventListener('mousemove', function(e){
      if(!dragging) return;
      const dx=e.clientX-sx, dy=e.clientY-sy;
      if(Math.abs(dx)>3 || Math.abs(dy)>3) moved=true;
      el.scrollLeft=sl-dx; el.scrollTop=st-dy;
    });
    window.addEventListener('mouseup', function(){ if(dragging){ dragging=false; el.classList.remove('grabbing'); } });
    // a drag that actually panned must not also select the node it ended on (capture beats the node's onclick)
    el.addEventListener('click', function(e){ if(moved){ e.preventDefault(); e.stopPropagation(); moved=false; } }, true);
  }
}
function selectResearch(id){ state.selectedResearch=id; techFocus=id; render(); }
// hover tooltip: describe a tech, its benefits/modifiers, and a real-world example
const UNLOCK_LABELS={crew:'crewed missions',les:'launch-escape system',eclss:'advanced life support (ECLSS)',lunar:'cislunar / lunar missions',mars:'Mars missions',depot:'LEO propellant depot',lander:'two-stage lunar lander',assembly:'orbital assembly & docking',auto_dock:'automated rendezvous & docking',recovery:'first-stage recovery (reuse)',rad_shield:'deep-space radiation shielding',isru_moon:'lunar ISRU (in-situ propellant)',isru_mars:'Mars ISRU (Sabatier methalox)',isru_belt:'asteroid-belt ISRU'};
// CE3(b): a one-line readout of the branch-affinity effect on this node's R&D price
function branchAffinityNote(r){
  if(!r||!r.track) return '';
  const mult=branchAffinityMult(r.track), pct=Math.round((mult-1)*100);
  if(pct===0) return '';
  const cheaper=pct<0, aff=trackAffinity(r.track);
  const why=cheaper ? `${aff} node${aff===1?'':'s'} of ${r.track} focus` : `behind your strongest track`;
  return `<div class="dim" style="font-size:12px;margin:-2px 0 10px;color:${cheaper?'var(--ok,#4ade80)':'var(--bad,#f87171)'}">
    ${cheaper?'▼':'▲'} Branch affinity: <b>${cheaper?'':'+'}${pct}%</b> R&D cost — ${why}.</div>`;
}
function techModifierText(r){
  const e=r.effect||{}, bits=[];
  if(e.engine && ENGINES[e.engine]){ const en=ENGINES[e.engine]; bits.push(`Unlocks engine — <b>${en.name}</b> (${en.prop}, Isp ${en.ispVac}s vac, ${en.thrustVac} kN)`); }
  if(e.engines){ e.engines.filter(id=>ENGINES[id]).forEach(id=>{ const en=ENGINES[id]; bits.push(`Unlocks engine — <b>${en.name}</b> (${en.prop}, Isp ${en.ispVac}s vac, ${en.thrustVac} kN)`); }); }
  if(e.isp) bits.push(`<b>+${Math.round(e.isp*100)}% Isp</b> on the launch vehicle (more Δv)`);
  if(e.thrust) bits.push(`<b>+${Math.round(e.thrust*100)}% liftoff thrust</b> (higher TWR)`);
  if(e.reliability) bits.push(`<b>+${Math.round(e.reliability*100)}%</b> launch reliability`);
  if(e.sigma) bits.push(`Structural coefficient σ → <b>${e.sigma}</b> (lighter tanks, better mass ratio)`);
  if(e.buildCostCut) bits.push(`<b>−${Math.round(e.buildCostCut*100)}%</b> vehicle build cost`);
  if(e.launchCostCut) bits.push(`<b>−${Math.round(e.launchCostCut*100)}%</b> launch-ops cost`);
  if(e.buildTimeCut) bits.push(`<b>−${e.buildTimeCut}</b> mo build time (industrial cadence)`);
  if(e.lsRecovery) bits.push(`<b>+${Math.round(e.lsRecovery*100)}%</b> life-support recycling (less consumable mass)`);
  if(e.sciYield) bits.push(`<b>+${Math.round(e.sciYield*100)}%</b> mission science yield`);
  if(e.unlock) bits.push(`Unlocks — <b>${UNLOCK_LABELS[e.unlock]||e.unlock}</b>`);
  if(isLeveledTech(r.id)){ const d=TECH_LEVELS[r.id]; const per=Object.entries(d.per||{}).map(([k,v])=>`+${Math.round(v*100)}% ${k}`).join(', '); bits.push(`Leveled technology — keep investing: <b>${per} per level</b>, up to L${d.max}`); }
  if(!bits.length) bits.push('Capability/maturity prerequisite — gates later technologies and missions.');
  return bits;
}
function techTooltipHTML(r){
  const st=researchNodeState(r), tr=TRACKS.find(t=>t.key===r.track)||{};
  const stTag={done:'researched',active:'in progress',available:'available',locked:'locked'}[st];
  const meta = st==='active' ? `${fmtTimeLeft(state.activeResearch.monthsLeft)} left` : `${fM(rdCostOf(r))}${sciGateCost(r)?` · ${sciGateCost(r)} ⚛`:''} · ${r.months} mo`;
  const mods=techModifierText(r);
  const reqNames=r.req.map(q=>(RESEARCH.find(x=>x.id===q)||{}).name).filter(Boolean).join(', ');
  const gate=r.reqMissionDone?(MISSIONS.find(m=>m.id===r.reqMissionDone)||{}).name:null;
  const levelLine=(st==='done'&&isLeveledTech(r.id))?`<div class="tt-mod" style="color:var(--ignite)">Current level: <b>${techLevel(r.id)} / ${TECH_LEVELS[r.id].max} · ${techLevelName(r.id)}</b></div>`:'';
  return `<div class="tt-head"><span class="tt-name">${r.name}</span><span class="tt-chip" style="color:${tr.color};border-color:${tr.color}">${tr.label||''}</span></div>
    <div class="tt-status">${stTag} · ${meta}</div>
    <div class="tt-mods">${mods.map(m=>`<div class="tt-mod">▸ ${m}</div>`).join('')}${levelLine}</div>
    <div class="tt-desc">${r.desc}</div>
    ${(reqNames||gate)?`<div class="tt-req">Requires: ${[reqNames,gate?`fly <b>${gate}</b>`:null].filter(Boolean).join(' · ')}</div>`:''}`;
}
function showTechTip(e,id){
  const r=RESEARCH.find(x=>x.id===id); const tip=$('techTip'); if(!r||!tip) return;
  tip.innerHTML=techTooltipHTML(r); tip.classList.remove('hidden'); moveTechTip(e);
}
function moveTechTip(e){
  const tip=$('techTip'); if(!tip||tip.classList.contains('hidden')) return;
  const pad=14, w=tip.offsetWidth, h=tip.offsetHeight, vw=window.innerWidth, vh=window.innerHeight;
  let x=e.clientX+pad, y=e.clientY+pad;
  if(x+w>vw-8) x=e.clientX-w-pad;            // flip left near the right edge
  if(y+h>vh-8) y=Math.max(8, vh-h-8);        // clamp above the bottom edge
  tip.style.left=x+'px'; tip.style.top=y+'px';
}
function hideTechTip(){ const tip=$('techTip'); if(tip) tip.classList.add('hidden'); }
function renderResearchDetail(){
  const el=$('researchDetail'); if(!el) return;
  let id=state.selectedResearch;
  if(!id || !RESEARCH.find(x=>x.id===id)){ id=(state.activeResearch&&state.activeResearch.id) || (RESEARCH.find(r=>researchNodeState(r)==='available')||RESEARCH[0]).id; state.selectedResearch=id; }
  const r=RESEARCH.find(x=>x.id===id), st=researchNodeState(r);
  const busy=!!state.activeResearch;
  const reqNames=r.req.map(q=>RESEARCH.find(x=>x.id===q).name).join(', ');
  const gateName=r.reqMissionDone?MISSIONS.find(m=>m.id===r.reqMissionDone).name:null;
  let action;
  if(st==='done' && isLeveledTech(id)){
    const d=TECH_LEVELS[id], lvl=techLevel(id), maxed=lvl>=d.max;
    const chk=canUpgradeTech(id), cost=techUpgradeCost(id);
    const perLine=Object.entries(d.per||{}).map(([k,v])=>`+${Math.round(v*100)}% ${k}`).join(' · ');
    const curBonus=Object.entries(d.per||{}).map(([k,v])=>`+${Math.round(v*(lvl-1)*100)}% ${k}`).join(' · ');
    action=`<div class="metric" style="margin-bottom:8px"><div class="k">Tech level</div><div class="v" style="color:var(--ignite)">${lvl} / ${d.max} · ${techLevelName(id)}</div></div>
      <div class="dim" style="font-size:12px;margin-bottom:8px">A leveled technology — keep investing to advance it. Each level: <b>${perLine}/level</b>${lvl>1?` · current bonus from this tech: <b style="color:var(--ok)">${curBonus}</b>`:''}.</div>
      ${maxed
        ? `<button class="btn" disabled style="width:100%">✓ ${techLevelName(id)} — max level (${d.max})</button>`
        : `<button class="launch" style="width:100%" onclick="upgradeTech('${id}')" ${chk.ok?'':'disabled'}>${chk.ok?`Upgrade → ${(d.names&&d.names[lvl])||('Level '+(lvl+1))} · ${fM(cost)} · ${d.months} mo`:chk.why}</button>`}`;
  }
  else if(st==='done') action=`<button class="btn" disabled style="width:100%">✓ Researched</button>`;
  else if(st==='active'){
    const rc=rushCost(state.activeResearch.rushed||0), canRush=state.activeResearch.monthsLeft>1 && state.money>=rc;
    const sc=sciRushCost(state.activeResearch.sciRushed||0), canSci=state.activeResearch.monthsLeft>1 && (state.science||0)>=sc;
    action=`<button class="btn" disabled style="width:100%;margin-bottom:6px">${fmtTimeLeft(state.activeResearch.monthsLeft)} left</button>
      <button class="btn ghost" style="width:100%;font-size:12px;margin-bottom:5px" onclick="rushResearch()" ${canRush?'':'disabled'}>Rush −1 mo (${fM(rc)})</button>
      <button class="btn ghost" style="width:100%;font-size:12px" onclick="applyScience()" ${canSci?'':'disabled'}>Apply science −1 mo (${sc} ⚛)</button>`;
  } else {
    const afford=state.money>=rdCostOf(r), sciNeed=sciGateCost(r), sciOk=sciGateMet(r), ok=st==='available'&&afford&&sciOk&&!busy;
    const why = busy?'Another project is in progress':(st!=='available'?'Prerequisites not met':(!afford?'Not enough capital':(!sciOk?`Needs ${sciNeed} ⚛ (have ${Math.round(state.science||0)})`:'')));
    const sciTag = sciNeed?` · ${sciNeed} ⚛`:'';
    action=`<button class="launch" style="width:100%" onclick="buyResearch('${r.id}')" ${ok?'':'disabled'}>${ok?`Research · ${fM(rdCostOf(r))}${sciTag} · ${r.months} mo`:why}</button>`;
  }
  const stateTag={done:'<span class="pill ok">researched</span>',active:'<span class="pill active">in progress</span>',available:'<span class="pill">available</span>',locked:'<span class="pill lock">locked</span>'}[st];
  const debtBanner = relDebt()>0 ? `<div class="flag bad" style="margin-bottom:8px">⚠ Cut-corner penalty: −${Math.round(relDebt()*100)}% reliability on every vehicle, from pushing a flawed project through a past setback. It's permanent — weigh the schedule against the risk next time.</div>` : '';
  el.innerHTML=`${debtBanner}<div class="mission-tag">Technology</div>
    <div class="mission-name" style="font-size:16px">${r.name} ${stateTag}</div>
    <div class="tt-mods adv-only" style="margin:8px 0 10px">${techModifierText(r).map(m=>`<div class="tt-mod">▸ ${m}</div>`).join('')}</div>
    <div class="sub" style="margin:8px 0 10px">${r.desc}</div>
    <div class="metrics" style="margin-bottom:10px">
      <div class="metric"><div class="k">Cost</div><div class="v">${fM(rdCostOf(r))}</div></div>
      <div class="metric"><div class="k">Duration</div><div class="v">${r.months} mo</div></div>
      ${sciGateCost(r)?`<div class="metric"><div class="k">Science</div><div class="v" style="color:var(--readout)">${sciGateCost(r)} ⚛</div></div>`:''}
    </div>
    ${branchAffinityNote(r)}
    ${(reqNames||gateName)?`<div class="dim" style="font-size:12px;margin-bottom:10px">Requires: ${[reqNames, gateName?`fly <b>${gateName}</b>`:null].filter(Boolean).join(' · ')}</div>`:''}
    ${action}`;
}
// confirm/Research action bar shown inside the tech-tree card, so it's always in the
// same area as the tree (not only in the right-hand detail panel)
function renderTechAction(){
  const el=$('techAction'); if(!el) return;
  const nextR=state.researchNext?RESEARCH.find(x=>x.id===state.researchNext):null;
  if(state.researchNext && !nextR) state.researchNext=null; // stale id (tech-tree changed under it) — drop silently
  const nextRow=nextR?`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:5px 11px;margin-top:6px;border:1px dashed var(--line);border-radius:6px;font-size:12px">
      <span class="dim">Next up:</span><span style="font-weight:600">${nextR.name}</span><span class="dim">— auto-starts once ${state.activeResearch?'this project finishes and it\'s':'it\'s'} affordable/unlocked</span>
      <span style="flex:1;min-width:8px"></span><button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="clearResearchNext()">✕ Clear</button>
    </div>`:'';
  const r=RESEARCH.find(x=>x.id===state.selectedResearch);
  if(!r){ el.innerHTML=nextRow; return; }
  const st=researchNodeState(r), busy=!!state.activeResearch;
  const isQueued=state.researchNext===r.id;
  let btn;
  if(st==='done') btn=`<button class="btn" disabled>✓ Researched</button>`;
  else if(st==='active') btn=`<button class="btn" disabled>${fmtTimeLeft(state.activeResearch.monthsLeft)} left</button>`;
  else if(busy){
    // I5: a project's already running — offer to queue this one as next instead of a disabled Research button.
    btn=isQueued
      ? `<button class="btn ghost" disabled>📋 Queued next</button>`
      : `<button class="btn ghost" onclick="queueResearchNext('${r.id}')">📋 Queue next</button>`;
  } else{
    const afford=state.money>=rdCostOf(r), sciNeed=sciGateCost(r), sciOk=sciGateMet(r), ok=st==='available'&&afford&&sciOk;
    const why=st!=='available'?'Prerequisites not met':(!afford?'Not enough capital':(!sciOk?`Needs ${sciNeed} ⚛ (have ${Math.round(state.science||0)})`:''));
    const sciTag=sciNeed?` · ${sciNeed} ⚛`:'';
    btn=`<button class="launch" onclick="buyResearch('${r.id}')" ${ok?'':'disabled'}>${ok?`Research · ${fM(rdCostOf(r))}${sciTag} · ${r.months} mo`:why}</button>`;
  }
  const tag={done:'researched',active:'in progress',available:'available',locked:'locked'}[st];
  el.innerHTML=`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 11px;border:1px solid var(--line);border-radius:6px;background:var(--panel2)">
    <span style="font-weight:600">${r.name}</span><span class="dim" style="font-size:12px">${tag}</span>
    <span style="flex:1;min-width:8px"></span>${btn}</div>${nextRow}`;
}
function renderRnd(){
  renderTechTree();
  renderTechFilters();
  renderTechAction();
  renderResearchDetail();
  renderDivisions();
  renderPartnerships();
}
// #4: Research Divisions panel — quality drives per-track research speed
function renderDivisions(){
  const box=$('divisionsCard'); if(!box) return;
  const activeDiv = state.activeResearch ? divisionForResearch(RESEARCH.find(r=>r.id===state.activeResearch.id)) : null;
  const cards=DIVISIONS.map(d=>{
    const s=divisionState(d.id), q=divisionQuality(d.id), bonus=Math.round(q*DIV_SPEED_MAX*100);
    const chk=canTrainDivision(d.id), cost=divisionTrainCost(d.id), maxed=s.skill>=1;
    const isActive=activeDiv===d.id;
    const mColor=s.morale>=70?'var(--ok)':s.morale>=40?'var(--warn)':'var(--bad)';
    const trackChips=d.tracks.map(t=>{const tr=TRACKS.find(x=>x.key===t)||{};return `<span class="pill" style="color:${tr.color};border-color:${tr.color}">${tr.label||t}</span>`;}).join(' ');
    const bar=(label,val,col)=>`<div style="display:flex;align-items:center;gap:8px;margin-top:4px"><span style="font-size:12px;color:var(--dim);width:46px">${label}</span><div style="flex:1;height:5px;background:var(--panel2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(val)}%;background:${col}"></div></div><span style="font-family:var(--mono);font-size:12px;color:${col};width:30px;text-align:right">${Math.round(val)}</span></div>`;
    return `<div class="card" style="background:var(--panel2);margin-bottom:10px;${isActive?'border-color:var(--ignite)':''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div class="mission-name" style="font-size:14px;margin:0">${d.name} ${isActive?'<span class="pill active" style="font-size:11px">researching</span>':''}</div>
        <div style="text-align:right"><div class="dim" style="font-size:11px">R&D speed</div><div style="font-family:var(--mono);color:var(--ok)">+${bonus}%/mo</div></div>
      </div>
      <div style="margin:4px 0 2px">${trackChips}</div>
      <p class="muted" style="font-size:12px;margin:4px 0 2px">${d.blurb}</p>
      <div class="adv-only">
      ${bar('Skill', s.skill*100, 'var(--readout)')}
      ${bar('Experience', divisionExpLevel(d.id)*100, 'var(--ignite)')}
      ${bar('Morale', s.morale, mColor)}
      </div>
      <button class="btn" style="width:100%;margin-top:8px;font-size:12px" onclick="trainDivision('${d.id}')" ${chk.ok?'':'disabled'}>${maxed?'✓ Fully trained':(chk.ok?`Train (+${Math.round(DIV_TRAIN_SKILL*100)}% skill · ${fM(cost)})`:chk.why)}</button>
    </div>`;
  }).join('');
  box.innerHTML=`${synergiesStripHTML()}<h2>Research Divisions <span class="pill">${DIVISIONS.length} teams</span></h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 10px">Each division researches its own tracks. A division's <b>quality</b> — skill + accumulated experience + morale — accelerates projects in those tracks (stacks with your engineers) and makes <b>⚡ breakthroughs</b> (months shaved off the active project) more frequent. Invest capital to train them; experience grows as they ship; morale follows the company's finances.</p>
    ${cards}`;
}

// #6: Research Partnerships panel — outside institutions that accelerate a research track
function renderPartnerships(){
  const box=$('partnershipsCard'); if(!box) return;
  const active=(state.partnerships||[]);
  const activeTrack = state.activeResearch ? (RESEARCH.find(r=>r.id===state.activeResearch.id)||{}).track : null;
  const cards=PARTNERS.map(p=>{
    const on=partnerActive(p.id), chk=canFormPartnership(p.id);
    const boosting = on && activeTrack && p.tracks.indexOf(activeTrack)>=0;
    const trackChips=p.tracks.map(t=>{const tr=TRACKS.find(x=>x.key===t)||{};return `<span class="pill" style="color:${tr.color};border-color:${tr.color};font-size:11px">${tr.label||t}</span>`;}).join(' ');
    const btn = on
      ? `<button class="btn ghost" style="width:100%;margin-top:8px;font-size:12px" onclick="dissolvePartnership('${p.id}')">Dissolve — ends the −${fM(p.upkeep)}/mo upkeep</button>`
      : `<button class="btn" style="width:100%;margin-top:8px;font-size:12px" onclick="formPartnership('${p.id}')" ${chk.ok?'':'disabled'}>${chk.ok?`Partner — ${fM(p.setup)} setup · −${fM(p.upkeep)}/mo`:chk.why}</button>`;
    return `<div class="card" style="background:var(--panel2);margin-bottom:10px;${on?'border-color:var(--dom-research)':''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div class="mission-name" style="font-size:14px;margin:0">${p.name} ${on?'<span class="pill ok" style="font-size:11px">active</span>':''}${boosting?' <span class="pill active" style="font-size:11px">boosting now</span>':''}</div>
        <div style="text-align:right"><div class="dim" style="font-size:11px">R&amp;D speed</div><div style="font-family:var(--mono);color:var(--dom-research)">+${Math.round(p.speed*100)}%</div></div>
      </div>
      <div style="margin:4px 0 2px">${trackChips}</div>
      <p class="muted" style="font-size:12px;margin:4px 0 2px">${p.blurb}</p>
      ${btn}
    </div>`;
  }).join('');
  box.innerHTML=`<h2><span class="dom-dot" style="background:var(--dom-research)"></span>Research Partnerships <span class="pill">${active.length}/${PARTNERSHIP_CAP} active</span>${partnershipUpkeep()>0?` <span class="pill" style="font-size:11px">−${fM(partnershipUpkeep())}/mo</span>`:''}</h2>
    <p class="muted" style="font-size:12px;margin:-4px 0 10px">Partner with outside institutions to accelerate a research <b>track</b> — a setup fee plus ongoing upkeep buys a standing R&amp;D-speed boost on their tracks (stacks with engineers + divisions, capped at +${Math.round(PARTNER_SPEED_CAP*100)}%). Hold up to <b>${PARTNERSHIP_CAP}</b> at once: back the fronts your program needs now, and dissolve them when the work is done.</p>
    ${cards}`;
}
function tlStripPlain(s){ return (s||'').replace(/<[^>]*>/g,''); }
function tlStrip(s){ return esc(tlStripPlain(s)); }
function tlAttr(s){ return tlStrip(s); }
// Forward-looking items derived from state (not stored in state.log): active R&D, in-progress
// builds, and a committed launch window. These ride at the front of the timeline as "UPCOMING".
function upcomingEvents(){
  const out=[];
  const ar=state.activeResearch;
  if(ar){ const r=RESEARCH.find(x=>x.id===ar.id); if(r) out.push({icon:'⚛', msg:`R&D: ${r.name} · ${fmtTimeLeft(ar.monthsLeft)} left`, nav:'rnd', cat:'research'}); }
  (state.buildQueue||[]).forEach(o=>{ out.push({icon:'🔧', msg:(o.started?`Build: ${o.missionName||o.name} · ${fmtTimeLeft(o.monthsLeft)} left`:`Queued: ${o.missionName||o.name}`), nav:'command', cat:'launch'}); });
  const cw=state.committedWindow;
  if(cw){ const m=MISSIONS.find(x=>x.id===cw.missionId); out.push({icon:'🪟', msg:`Window: ${m?m.name:cw.missionId} opens ${dayToDate(cw.abs)}`, nav:'map', cat:'launch'}); }
  return out;
}
// #29: coarse topic buckets for the timeline's category filter + per-entry icon. Heuristic
// text-sniffing, same spirit/precision as logNav below (not meant to be perfectly exhaustive —
// good enough for a filter). Checked most-specific-first so overlapping substrings (e.g. a
// mission "SUCCESS" line that also happens to mention "crew") land in the right bucket.
const TL_CATEGORIES=[
  {id:'all',      label:'All'},
  {id:'launch',   label:'Launches',       icon:svgIcon('launch')},
  {id:'research', label:'Research',       icon:svgIcon('research')},
  {id:'economy',  label:'Economy',        icon:'$'},
  {id:'rivals',   label:'Rivals',         icon:svgIcon('rivals')},
  {id:'crew',     label:'Crew',           icon:svgIcon('crew')},
  {id:'infra',    label:'Infrastructure', icon:svgIcon('infra')},
];
function logCategory(e){
  if(e.kind==='rival') return 'rivals';
  const s=tlStripPlain(e.msg);
  if(/R&D (complete|started|rush|SETBACK)|BREAKTHROUGH|breakthrough|Applied .* science to|Inquiry into|inquiry reliability credit/i.test(s)) return 'research';
  if(/\bhired\b|\bcommended\b|training invested|promoted to head of|quit due to low morale|\bpoached\b|Raise (given|invested)|angling for a raise|let go\. Monthly burn|radiation limit|absorbed .* radiation|is on a mission — they can be assigned|costly mistake.*morale|Astronaut .*(lost|retired)/i.test(s)) return 'crew';
  if(/yard — (manufacturing|fabricating)|expanded to (level|\d+ modules)|resupplied|resupply (shipment|delayed|expedited)|auto-resupply|: \w.* docked|established — your first permanent presence|abandoned — the outpost|evacuated and mothballed|power-starved|Standing production|Blueprint: all ports/i.test(s)) return 'infra';
  if(/SUCCESS|FAILURE|CATASTROPHE|ABORTED IN FLIGHT|LOST IN DEEP SPACE|RESCUED|Scooped|Rescue (launched|fell)|Mandate (accepted|declined|fulfilled|FAILED|offered)|Special contract|Launch committed|Manufacturing — (queued|cancelled|scrapped|rolled out)|static fire|Committed to the .* window|setback|reworked properly|flaw unresolved/i.test(s)) return 'launch';
  if(/Signed |Partnership (formed|dissolved|with)|contract (expired|has run)|royalt|Market —|Supply —|Sold .* propellant|Bought .* propellant|doctrine declared|Doctrine drift|bridge loan|Treasury (critical|warning)/i.test(s)) return 'economy';
  return 'other';
}
// Where clicking a past log entry should jump: explicit entry.nav wins, else infer from the text.
function logNav(e){
  if(e.nav) return e.nav;
  const s=tlStripPlain(e.msg);
  if(/R&D|research|breakthrough|σ|Isp|thrust/i.test(s)) return 'rnd';
  if(e.kind==='rival') return 'command';
  if(/SUCCESS|FAILURE|LOST|RESCUED|CATASTROPHE|reached|achieved|delivered|rolled out|crew/i.test(s)) return 'command';
  if(/facilit|outpost|depot|station|module|royalt/i.test(s)) return 'command';
  return null;
}
function timelineGo(nav){ if(nav) setTab(nav); }
// #29: category-filter pills + collapse toggle, rendered above the timeline strip itself.
function renderTlControls(){
  const box=$('tlControls'); if(!box) return;
  const filters=TL_CATEGORIES.map(c=>`<span class="tl-filter${_tlFilter===c.id?' active':''}" onclick="setTlFilter('${c.id}')" title="Show only ${c.label.toLowerCase()} entries">${c.icon?c.icon+' ':''}${c.label}</span>`).join('');
  box.innerHTML=`${filters}<span class="tl-collapse" onclick="toggleTlCollapse()" title="${_tlCollapsed?'Expand':'Collapse'} the timeline strip">${_tlCollapsed?'▸ Show log':'▾ Hide log'}</span>`;
}
// Always-visible flight & ops timeline: leading date, then UPCOMING items, then the recent log
// (newest first). Each chip jumps to a relevant screen when it has a navigation target.
function renderLog(){
  renderTlControls();
  const box=$('opsTimeline'); if(!box) return;
  // E0.3 Slice 2: box.innerHTML='' below resets scrollTop to 0 in a real browser even when the
  // rebuilt content is identical to what was there — capture/restore across every exit path (both
  // early returns below and the normal fall-through) so scrolling the log during a time-warp tick
  // doesn't get yanked back to the top on the next render. This function builds real DOM nodes via
  // appendChild rather than a single html string, so it can't route through setHTML()'s
  // string-memoize path — this is a scroll-only fix, not a churn-reduction one.
  const _scrollTop=box.scrollTop;
  try{
    box.classList.toggle('collapsed', _tlCollapsed);
    box.innerHTML='';
    // #31 Slice 3: slide in the newest chip when a new entry is added
    const hasNew=state.log.length>_prevLogLength; _prevLogLength=state.log.length;
    if(_tlCollapsed) return; // controls stay interactive; the strip itself is display:none
    const d=document.createElement('div'); d.className='tl-date'; d.innerHTML=`<small>DATE</small>${dateStr()}`; box.appendChild(d);
    const up=upcomingEvents().filter(u=>_tlFilter==='all'||u.cat===_tlFilter);
    up.forEach(u=>{ const c=document.createElement('div'); c.className='tl-chip next'+(u.nav?' clk':'');
      c.innerHTML=`<span class="tl-when">UPCOMING</span><span class="tl-msg" title="${tlAttr(u.msg)}">${u.icon} ${tlStrip(u.msg)}</span>`;
      if(u.nav) c.onclick=()=>timelineGo(u.nav); box.appendChild(c); });
    if(up.length){ const sep=document.createElement('div'); sep.className='tl-sep'; sep.textContent='◂ NOW'; box.appendChild(sep); }
    const entries=state.log.filter(l=>_tlFilter==='all'||logCategory(l)===_tlFilter);
    if(!entries.length){ const e=document.createElement('div'); e.className='tl-empty';
      e.textContent=state.log.length?'No entries in this category yet.':'No flights or events yet — advance time or fly a mission.'; box.appendChild(e); return; }
    let firstLogChip=true;
    entries.forEach(l=>{ const nav=logNav(l); const icon=TL_CAT_ICON[logCategory(l)]||TL_CAT_ICON.other;
      const c=document.createElement('div'); c.className='tl-chip '+(l.kind||'note')+(nav?' clk':'')+(hasNew&&firstLogChip&&l===state.log[0]?' tl-chip-new':'');
      firstLogChip=false;
      c.innerHTML=`<span class="tl-when">${l.when}</span><span class="tl-msg" title="${l.detail?tlAttr(l.msg)+'\n\n'+esc(l.detail):tlAttr(l.msg)}">${icon} ${tlStrip(l.msg)}</span>`; // E1.5: append the failure causal chain (if any) to the existing message tooltip
      if(nav) c.onclick=()=>timelineGo(nav); box.appendChild(c); });
  } finally {
    box.scrollTop=_scrollTop;
  }
}
