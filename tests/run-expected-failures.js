#!/usr/bin/env node
// Quarantined Gate 0 reproductions. These files deliberately assert the future
// invariants and therefore exit 42 while their linked defects remain. This runner
// inverts only a recognized [EXPECTED-FAIL <issue>] result; crashes and unexpected
// passes fail the runner so quarantine cannot conceal a broken fixture or fixed bug.
//
//   node tests/run-expected-failures.js
//   node tests/run-expected-failures.js --issue G0-B01
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');
const {createBuildArtifacts}=require('../build.js');

const root=path.resolve(__dirname,'..');
const fixtureDir=path.join(__dirname,'expected-failures');
const requested=process.argv.includes('--issue')?process.argv[process.argv.indexOf('--issue')+1]:null;
if(process.argv.includes('--help')){
  console.log('Usage: node tests/run-expected-failures.js [--issue G0-BNN]');
  process.exit(0);
}

const harness=fs.readFileSync(path.join(__dirname,'harness.js'));
const gameArtifact=createBuildArtifacts(root).find(artifact=>artifact.name==='build/game.js');
if(!gameArtifact) throw new Error('build.js did not produce the deterministic build/game.js fixture');
const game=gameArtifact.contents;
const helpers=fs.readFileSync(path.join(fixtureDir,'_helpers.js'));
let manifest=JSON.parse(fs.readFileSync(path.join(fixtureDir,'manifest.json'),'utf8'));
if(requested) manifest=manifest.filter(entry=>entry.issue===requested);
if(!manifest.length){
  if(requested){ console.error(`Unknown or missing issue: ${requested}`); process.exit(2); }
  console.log('Gate 0 quarantine: 0 reproduced, 0 unexpected');
  process.exit(0);
}

const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'ov-gate0-xfail-'));
let reproduced=0, unexpected=0;
function exactXfail(result,entry){
  if(!result||typeof result!=='object'||Array.isArray(result)) return false;
  const keys=Object.keys(result).sort().join(',');
  const expectedKeys=['checks','exitCode','failures','issueId','kind','marker','schema','title'].sort().join(',');
  if(keys!==expectedKeys||result.schema!==1||result.kind!=='xfail'||result.exitCode!==42) return false;
  if(result.issueId!==entry.issue||typeof result.title!=='string'||!result.title) return false;
  if(!Number.isInteger(result.checks)||result.checks<1||!Array.isArray(result.failures)||!result.failures.length||result.failures.length>result.checks) return false;
  if(result.failures.some(failure=>!failure||Object.keys(failure).sort().join(',')!=='detail,name'||typeof failure.name!=='string'||!failure.name||typeof failure.detail!=='string')) return false;
  const marker=`[EXPECTED-FAIL ${entry.issue}] ${result.title} (${result.failures.length}/${result.checks} invariant checks failing)`;
  return result.marker===marker;
}
try{
  for(const entry of manifest){
    const test=fs.readFileSync(path.join(fixtureDir,entry.file));
    const bundle=path.join(tempDir,`${entry.issue}.js`);
    const resultPath=path.join(tempDir,`${entry.issue}.json`);
    fs.writeFileSync(bundle,Buffer.concat([harness,Buffer.from('\n'),game,Buffer.from('\n'),helpers,Buffer.from('\n'),test]));
    const result=spawnSync(process.execPath,[bundle],{cwd:root,encoding:'utf8',timeout:120000,
      env:Object.assign({},process.env,{OV_XFAIL_RESULT_PATH:resultPath})});
    const output=(result.stdout||'')+(result.stderr||'');
    let fixtureResult=null;
    try{ fixtureResult=JSON.parse(fs.readFileSync(resultPath,'utf8')); }catch(error){}
    if(result.status===42 && !result.signal && exactXfail(fixtureResult,entry)){
      reproduced++;
      const detail=fixtureResult.failures.map(failure=>`XFAIL ${entry.issue}: ${failure.name}${failure.detail?` -- ${failure.detail}`:''}`).join(' | ');
      console.log(`XFAIL ${entry.issue} ${entry.title}${detail?` :: ${detail}`:''}`);
    }else{
      unexpected++;
      const kind=result.status===0?'XPASS':'ERROR';
      console.error(`${kind} ${entry.issue} ${entry.title} (exit ${result.status}, signal ${result.signal||'none'})`);
      if(fixtureResult) console.error(`Structured result: ${JSON.stringify(fixtureResult)}`);
      if(output.trim()) console.error(output.trim());
    }
  }
}finally{
  fs.rmSync(tempDir,{recursive:true,force:true});
}
console.log(`Gate 0 quarantine: ${reproduced} reproduced, ${unexpected} unexpected`);
process.exit(unexpected?1:0);
