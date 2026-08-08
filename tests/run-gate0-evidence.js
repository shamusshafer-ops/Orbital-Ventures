#!/usr/bin/env node
// Gate 0 durable build/headless evidence. This runner rebuilds ignored generated
// artifacts, executes every headless suite with its correct loading convention,
// runs the blocker quarantine, and writes raw structured results for audit.
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawn,spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const outputArg=process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:null;
if(process.argv.includes('--help')){
  console.log('Usage: node tests/run-gate0-evidence.js [--output PATH]');
  process.exit(0);
}
const outputPath=path.resolve(root,outputArg||'docs/evidence/gate0-headless-results.json');
const knownRed=new Set(['test-flight3d-trajectory.js']);
const standalone=new Set(['test-build-parity.js','test-map-sm1-sm5-source.js']);
const expectedTrajectoryOutput=`FAIL: nose tracks the velocity vector through the whole gravity turn (<2.5° worst error)
FAIL: altitude climb rate flattens toward insertion (S-curve, not steepest-at-the-end)
FAIL: orbital insertion is near-horizontal (flight path >77° from vertical)
FAIL: at insertion the motion is mostly downrange, not up (horizontal flight into orbit)
FAIL: apogee lands ~42% into the coast (0.1500 vs 0.4200 ±0.03)
FAIL: coast apogee matches the profile apogee (71.4842 vs NaN ±1)
FAIL: the vehicle is horizontal at apogee (arcing over) (1.1076 vs 1.5708 ±0.1)
FAIL: past apogee the nose drops below the horizon (coming down)
FAIL: the arc reaches the water at the end of the coast
FAIL: splash is flagged only at the very end
FAIL: a high-energy lob pitches farther over than a sounding rocket
FAIL: a high-energy lob flies farther downrange relative to its altitude
FAIL: the engine is off during the ballistic coast (old code burned it the whole way)
FAIL: a brief shutdown fade is allowed right at burnout
FAIL: smoke is a dense-atmosphere effect (gone above ~13 km)
FAIL: vacuum shading is altitude-based (none low, full high)
FAIL: a metre-scale hop never shows vacuum effects
FAIL: a metre-scale hop still clears its pad visibly
13/31 checks passed`;

let runSequence=0;
function run(command,args,options={}){
  const started=Date.now();
  const maxBytes=options.maxBytes||32*1024*1024;
  const timeoutMs=options.timeoutMs||180000;
  return new Promise(resolve=>{
    const token=`ov-gate0-capture-${process.pid}-${++runSequence}`;
    const stdoutPath=path.join(os.tmpdir(),`${token}.out`);
    const stderrPath=path.join(os.tmpdir(),`${token}.err`);
    const stdoutFd=fs.openSync(stdoutPath,'wx',0o600);
    const stderrFd=fs.openSync(stderrPath,'wx',0o600);
    let child,spawnError=null,timedOut=false,finished=false,timer=null;
    const cleanup=()=>{
      for(const target of [stdoutPath,stderrPath]){ try{fs.unlinkSync(target);}catch(error){if(error.code!=='ENOENT'&&!spawnError)spawnError=error.message;} }
    };
    const finish=(exitCode,signal)=>{
      if(finished) return;
      finished=true; if(timer) clearTimeout(timer);
      let stdout=Buffer.alloc(0),stderr=Buffer.alloc(0);
      try{ stdout=fs.readFileSync(stdoutPath); stderr=fs.readFileSync(stderrPath); }
      catch(error){ if(!spawnError) spawnError=String(error.message||error); }
      if(stdout.length+stderr.length>maxBytes){
        spawnError=`combined output exceeded ${maxBytes} bytes`;
        stdout=Buffer.alloc(0); stderr=Buffer.alloc(0);
      }
      cleanup();
      resolve({command:[command,...args],exitCode,signal:signal||null,
        elapsedMs:Date.now()-started,stdout:stdout.toString('utf8'),
        stderr:stderr.toString('utf8'),spawnError,timedOut});
    };
    try{ child=spawn(command,args,{cwd:root,env:options.env||process.env,stdio:['ignore',stdoutFd,stderrFd]}); }
    catch(error){ fs.closeSync(stdoutFd); fs.closeSync(stderrFd); spawnError=String(error.message||error); finish(null,null); return; }
    fs.closeSync(stdoutFd); fs.closeSync(stderrFd);
    child.once('error',error=>{ spawnError=String(error.message||error); });
    child.once('close',finish);
    timer=setTimeout(()=>{
      timedOut=true; spawnError=`timed out after ${timeoutMs} ms`; child.kill('SIGKILL');
    },timeoutMs);
  });
}

function gitText(args){
  const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});
  return {exitCode:result.status,stdout:(result.stdout||'').trim(),stderr:(result.stderr||'').trim()};
}

function trackedBytes(dir){
  const result=spawnSync('git',['ls-files','-z',dir],{cwd:root,encoding:'buffer'});
  if(result.status!==0) return null;
  let total=0;
  for(const entry of result.stdout.toString('utf8').split('\0').filter(Boolean)){
    try{ total+=fs.statSync(path.join(root,entry)).size; }catch(error){}
  }
  return total;
}

function worktreeBytes(dir){
  let total=0;
  const visit=current=>{
    for(const entry of fs.readdirSync(current,{withFileTypes:true})){
      const target=path.join(current,entry.name);
      if(entry.isDirectory()) visit(target);
      else if(entry.isFile()) total+=fs.statSync(target).size;
    }
  };
  visit(path.join(root,dir));
  return total;
}

function suiteSummary(output){
  return output.split(/\r?\n/).filter(Boolean).slice(-30);
}

async function main(){
  const evidence={schemaVersion:1,capturedAt:new Date().toISOString(),baseCommit:gitText(['rev-parse','HEAD']),
    worktree:gitText(['status','-sb']),environment:{platform:process.platform,arch:process.arch,
      node:process.version,release:os.release(),hostname:os.hostname()},commands:{},suites:[],artifacts:{},overall:null};

  evidence.commands.build=await run(process.execPath,['build.js']);
  evidence.commands.buildCheck=await run(process.execPath,['build.js','--check']);
  evidence.commands.buildParity=await run(process.execPath,['tests/test-build-parity.js']);

  const harness=fs.readFileSync(path.join(root,'tests','harness.js'));
  const game=fs.readFileSync(path.join(root,'build','game.js'));
  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'ov-gate0-sweep-'));
  try{
    const files=fs.readdirSync(path.join(root,'tests')).filter(name=>/^test-.*\.js$/.test(name)).sort();
    for(const name of files){
      let result;
      if(standalone.has(name)){
        result=await run(process.execPath,[path.join('tests',name)]);
      }else{
        const bundle=path.join(tempDir,name);
        fs.writeFileSync(bundle,Buffer.concat([harness,Buffer.from('\n'),game,Buffer.from('\n'),
          fs.readFileSync(path.join(root,'tests',name))]));
        result=await run(process.execPath,[bundle]);
      }
      const expectedRed=knownRed.has(name);
      const combined=(result.stdout+result.stderr).trim();
      let classification;
      if(expectedRed){
        classification=result.exitCode===1&&!result.signal&&!result.spawnError&&combined===expectedTrajectoryOutput
          ?'known-red':(result.exitCode===0?'unexpected-pass':'unexpected-failure');
    }else if(name==='test-progress-unify.js'){
      classification=result.exitCode===0&&!result.signal&&!result.spawnError&&
        combined==='SKIP: F4 forward test (unfinished feature — set RUN_F4=1 to run)\n0/0 checks passed'
          ?'known-skip':(result.exitCode===0?'unexpected-pass':'unexpected-failure');
      }else{
        classification=result.exitCode===0&&!result.signal&&!result.spawnError?'pass':'unexpected-failure';
      }
      evidence.suites.push({name,classification,exitCode:result.exitCode,signal:result.signal,
        command:result.command,elapsedMs:result.elapsedMs,summary:suiteSummary(result.stdout+result.stderr),
        stdout:result.stdout,stderr:result.stderr,spawnError:result.spawnError,timedOut:result.timedOut});
    }
  }finally{
    fs.rmSync(tempDir,{recursive:true,force:true});
  }

  evidence.commands.expectedFailures=await run(process.execPath,['tests/run-expected-failures.js'],{timeoutMs:240000});
  for(const name of ['orbital-ventures.html','index.html','build/game.js']){
    const target=path.join(root,name);
    evidence.artifacts[name]=fs.existsSync(target)?fs.statSync(target).size:null;
  }
  evidence.artifacts.trackedBytes={src:trackedBytes('src'),tests:trackedBytes('tests'),assets:trackedBytes('assets')};
  evidence.artifacts.worktreeBytes={src:worktreeBytes('src'),tests:worktreeBytes('tests'),assets:worktreeBytes('assets')};
  evidence.artifacts.godotPathsPresent=['godot-base-bench','godot-base-bench-src'].filter(name=>fs.existsSync(path.join(root,name)));

  const badSuites=evidence.suites.filter(s=>!['pass','known-red','known-skip'].includes(s.classification));
  const commandMarkers={
    build:output=>output.trim().length>0,
    buildCheck:output=>output.includes('build parity ok'),
    buildParity:output=>output.includes('3/3 build parity checks passed')&&output.includes('2/2 texture-embed split checks passed'),
    expectedFailures:output=>output.includes('Gate 0 quarantine: 8 reproduced, 0 unexpected')
  };
  const commandFailures=['build','buildCheck','buildParity','expectedFailures'].filter(name=>{
    const result=evidence.commands[name], output=result.stdout+result.stderr;
    return result.exitCode!==0||result.signal||result.spawnError||!commandMarkers[name](output);
  });
  evidence.overall={ok:badSuites.length===0&&commandFailures.length===0&&evidence.artifacts.godotPathsPresent.length===0,
    totalSuites:evidence.suites.length,passedSuites:evidence.suites.filter(s=>s.classification==='pass').length,
    knownRedSuites:evidence.suites.filter(s=>s.classification==='known-red').map(s=>s.name),
    knownSkippedSuites:evidence.suites.filter(s=>s.classification==='known-skip').map(s=>s.name),
    badSuites:badSuites.map(s=>s.name),commandFailures};

  fs.mkdirSync(path.dirname(outputPath),{recursive:true});
  fs.writeFileSync(outputPath,JSON.stringify(evidence,null,2)+'\n');
  console.log(`Gate 0 evidence: ${evidence.overall.passedSuites}/${evidence.overall.totalSuites} suites pass; known red ${evidence.overall.knownRedSuites.length}; known skip ${evidence.overall.knownSkippedSuites.length}; unexpected ${badSuites.length}`);
  console.log(`Evidence: ${path.relative(root,outputPath)}`);
  process.exitCode=evidence.overall.ok?0:1;
}

main().catch(error=>{ console.error(error.stack||error); process.exitCode=1; });
