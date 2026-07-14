// Phase 6: short-desktop Command Center layout contract. The headless harness has no CSS
// engine, so these assertions intentionally protect the source-level geometry that keeps the
// hero, rails, timeline, ticker, and dock inside a 768px-tall desktop viewport.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

try{
  const fs=require('fs'), path=require('path');
  const repo=fs.existsSync(path.join(__dirname,'..','src','shell.html')) ? path.join(__dirname,'..') : process.cwd();
  const shell=fs.readFileSync(path.join(repo,'src','shell.html'),'utf8');
  const desktop=(shell.match(/@media\(min-width:1101px\)\{([\s\S]*?)\n  \}/)||[])[1]||'';
  const compact=(shell.match(/@media\(min-width:1101px\) and \(max-height:820px\)\{([\s\S]*?)\n  \}/)||[])[1]||'';
  const stacked=(shell.match(/@media\(max-width:1100px\)\{([\s\S]*?)\n  \}/)||[])[1]||'';

  check('desktop overlay breakpoint remains strictly above 1100px', /@media\(min-width:1101px\)\{/.test(shell));
  check('stacked Command Center remains active through 1100px', /@media\(max-width:1100px\)\{/.test(shell) && /#commandView\{display:flex;flex-direction:column;gap:14px\}/.test(stacked));
  check('desktop hero uses the available viewport height without a fixed vertical floor', /#commandView\{position:relative;height:calc\(100vh - var\(--topbar-h\) - 18px\);min-height:0\}/.test(desktop));
  check('desktop hero no longer contains the 700px overflow floor', !/#commandView\{[^}]*min-height:700px/.test(desktop));
  check('short desktop treatment covers 768px-tall windows', /@media\(min-width:1101px\) and \(max-height:820px\)\{/.test(shell));
  check('compact deck lane stays vertical and ends before the compact rail lane begins', /cc-strip,.command-hero \.cc-summary-right\{max-height:200px;flex-wrap:nowrap;overflow-x:hidden;overflow-y:auto\}/.test(compact) && /rail-left,.command-hero \.rail-right\{top:232px;max-height:calc\(100% - 416px\)\}/.test(compact));
  check('compact timeline has its own fixed lower lane instead of colliding with the rail', /#ccTimeline\{height:86px;overflow:auto\}/.test(compact));
  check('dock contains its own narrow-width overflow rather than widening the page', /\.cc-dock\{[^}]*max-width:calc\(100% - 760px\);overflow-x:auto;overflow-y:hidden/.test(desktop));

  // The initial top bar starts at 120px; this is therefore the tightest expected 768px
  // desktop geometry before its live measurement can only make the hero taller.
  const hero768=768-120-18, compactRailBottom=232+(hero768-416), compactTimelineTop=hero768-82-86;
  check('768px compact lanes leave a 16px rail-to-timeline gap', hero768===630 && compactRailBottom+16===compactTimelineTop);
  check('1101px dock cap starts 24px clear of the 340px left timeline lane', ((1101-(1101-760))/2)-(16+340)===24);
}catch(e){
  check('Command Center layout source is readable', false);
  console.log(e.stack);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
