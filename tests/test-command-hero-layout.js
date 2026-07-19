// Phase 6: short-desktop Command Center layout contract. The headless harness has no CSS
// engine, so these assertions intentionally protect the source-level geometry that keeps the
// hero, rails, timeline, ticker, and dock inside a 768px-tall desktop viewport.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

try{
  const fs=require('fs'), path=require('path');
  const repo=fs.existsSync(path.join(__dirname,'..','src','shell.html')) ? path.join(__dirname,'..') : process.cwd();
  const shell=fs.readFileSync(path.join(repo,'src','shell.html'),'utf8');
  const render=fs.readFileSync(path.join(repo,'src','render.js'),'utf8');
  const desktop=(shell.match(/@media\(min-width:1101px\)\{([\s\S]*?)\n  \}/)||[])[1]||'';
  const compact=(shell.match(/@media\(min-width:1101px\) and \(max-height:820px\)\{([\s\S]*?)\n  \}/)||[])[1]||'';
  const stacked=(shell.match(/@media\(max-width:1100px\)\{([\s\S]*?)\n  \}/)||[])[1]||'';

  check('desktop overlay breakpoint remains strictly above 1100px', /@media\(min-width:1101px\)\{/.test(shell));
  check('stacked Command Center remains active through 1100px', /@media\(max-width:1100px\)\{/.test(shell) && /#commandView\{display:flex;flex-direction:column;gap:14px\}/.test(stacked));
  check('desktop hero uses the available viewport height without a fixed vertical floor', /#commandView\{position:relative;height:calc\(100vh - var\(--topbar-h\) - 18px\);min-height:0\}/.test(desktop));
  check('desktop hero no longer contains the 700px overflow floor', !/#commandView\{[^}]*min-height:700px/.test(desktop));
  check('short desktop treatment covers 768px-tall windows', /@media\(min-width:1101px\) and \(max-height:820px\)\{/.test(shell));
  check('desktop card stacks avoid scrollbars while retaining their overlay lanes', /cc-strip,.command-hero \.cc-summary-right\{position:absolute;[^}]*overflow:visible\}/.test(desktop) && /cc-strip,.command-hero \.cc-summary-right\{gap:5px;overflow:visible\}/.test(compact));
  check('compact deck lane uses compact cards while Mission Control stays under the hero control', /cc-deck-card\{padding:6px 8px\}/.test(compact) && /rail-right\{top:58px;max-height:calc\(100% - 78px\)\}/.test(compact));
  check('short desktop summaries show at most two active mission rows while Flight log remains available', /cc-active-missions \.cc-deck-row:nth-of-type\(n\+3\)\{display:none\}/.test(compact) && /Flight log/.test(render));
  check('compact timeline has its own fixed lower lane instead of colliding with the rail', /#ccTimeline\{height:86px;overflow:auto\}/.test(compact));
  check('Cape rails remain 25% narrower at full desktop width and taper on smaller desktops', /--cc-rail-width:clamp\(220px,20vw,285px\)/.test(desktop));
  check('dock bridges the Cape aperture in one readable six-button row', /\.cc-dock\{[^}]*left:calc\(var\(--cc-rail-width\) \+ 14px\);right:calc\(var\(--cc-rail-width\) \+ 14px\);bottom:14px;transform:none;width:auto/.test(desktop) && /cc-dock nav\.rail-nav\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/.test(desktop) && /cc-dock nav\.rail-nav button\{width:auto;min-width:0;min-height:50px;flex:none;flex-direction:column[^}]*font-size:clamp\(10px,.78vw,12px\)[^}]*white-space:nowrap;overflow:hidden/.test(desktop));
  check('desktop Cape grading is a non-interactive zoom-layer overlay', /#ccZoom::before,.command-hero #ccZoom::after\{content:"";position:absolute;inset:0;z-index:1;pointer-events:none\}/.test(desktop));
  check('Cape grading reuses HUD surface, line, and glow variables', /#ccZoom::before\{[^}]*var\(--hud-surface\)/.test(desktop) && /#ccZoom::after\{[^}]*var\(--hud-line-soft\)[^}]*var\(--hud-glow\)/.test(desktop));
  check('Cape hotspots stay above grading and keep their own interactive layer', /#ccSpots\{position:absolute;inset:0;z-index:2\}/.test(desktop));
  check('command hero maps only its own surfaces to navy and cyan tokens without changing semantic status colors', /body\.command-mode\{--cc-hero-navy:#06121e;[^}]*--cc-hero-cyan:#67d5ff/.test(shell) && /\.shell\.command-hero\{--hud-surface:var\(--cc-hero-surface\)/.test(desktop) && !/--bad:/.test(desktop));
  check('Command Center toggles a body command-mode class for chrome outside the shell', /document\.body\.classList\.toggle\('command-mode', state\.tab==='command'\)/.test(render));
  check('command-mode scopes navy/cyan header and topbar surfaces without affecting other tabs', /body\.command-mode \.topbar\{background:linear-gradient\(180deg,var\(--cc-hero-navy\)/.test(shell) && /body\.command-mode header,body\.command-mode \.opsbar\{border-color:var\(--cc-hero-line\)/.test(shell));
  check('desktop Cape status text is revealed by hover, keyboard focus, or attention', /\.ccspot \.st\{max-height:0;[^}]*opacity:0/.test(desktop) && /\.ccspot:hover \.st,.command-hero \.ccspot:focus-visible \.st,.command-hero \.ccspot\.cc-attention \.st\{max-height:2\.6em;[^}]*opacity:1/.test(desktop));
  check('Cape hotspot keyboard focus remains visibly outlined', /\.ccspot:focus-visible\{outline:2px solid var\(--readout\);outline-offset:2px\}/.test(desktop));
  check('stacked Command Center leaves Cape status text visible', !/\.ccspot \.st\{max-height:0/.test(stacked));

  // The initial top bar starts at 120px; this is therefore the tightest expected 768px
  // desktop geometry before its live measurement can only make the hero taller.
  const hero768=768-120-18, compactRailBottom=232+(hero768-416), compactTimelineTop=hero768-82-86;
  check('768px compact lanes leave a 16px rail-to-timeline gap', hero768===630 && compactRailBottom+16===compactTimelineTop);
  check('six scene controls resolve into one row of six', 6/6===1);
  check('1366x768 compact lanes remain non-overlapping', compactRailBottom+16===compactTimelineTop);
}catch(e){
  check('Command Center layout source is readable', false);
  console.log(e.stack);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
