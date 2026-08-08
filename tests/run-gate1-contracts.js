#!/usr/bin/env node
// Fast Gate 1 contract lane. The full sweep remains run-gate0-evidence.js;
// this runner isolates the new truth/state/quote/interaction regressions.
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawn}=require('child_process');
const {createBuildArtifacts}=require('../build.js');

const root=path.resolve(__dirname,'..');
const files=[
  'test-gate1-truth-contract.js',
  'test-gate1-state-contract.js',
  'test-gate1-quote-contract.js',
  'test-gate1-interaction-contract.js',
  'test-gate1-lifecycle-regressions.js',
];
const harness=fs.readFileSync(path.join(__dirname,'harness.js'));
const game=createBuildArtifacts(root).find(a=>a.name==='build/game.js').contents;
const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'ov-gate1-contracts-'));
function run(target){
  return new Promise(resolve=>{
    const stdoutPath=target+'.out', stderrPath=target+'.err';
    const stdoutFd=fs.openSync(stdoutPath,'w'), stderrFd=fs.openSync(stderrPath,'w');
    const child=spawn(process.execPath,[target],{cwd:root,stdio:['ignore',stdoutFd,stderrFd]});
    fs.closeSync(stdoutFd); fs.closeSync(stderrFd);
    let timedOut=false, spawnError=null;
    child.on('error',error=>{ spawnError=error; });
    const timer=setTimeout(()=>{ timedOut=true; child.kill('SIGKILL'); },120000);
    child.on('close',(status,signal)=>{
      clearTimeout(timer);
      const output=fs.readFileSync(stdoutPath,'utf8')+fs.readFileSync(stderrPath,'utf8');
      fs.rmSync(stdoutPath,{force:true}); fs.rmSync(stderrPath,{force:true});
      resolve({status,signal,output,error:spawnError||(timedOut?new Error('timed out'):null)});
    });
  });
}
async function main(){
  let failed=0, checks=0;
  try{
    for(const file of files){
      const target=path.join(tempDir,file);
      fs.writeFileSync(target,Buffer.concat([harness,Buffer.from('\n'),game,Buffer.from('\n'),fs.readFileSync(path.join(__dirname,file))]));
      const result=await run(target), output=(result.output||'').trim();
      const match=output.match(/(\d+)\/(\d+) checks passed/); if(match) checks+=Number(match[2]);
      if(result.status===0&&!result.signal&&!result.error&&match&&match[1]===match[2]) console.log(`PASS ${file} :: ${match[0]}`);
      else { failed++; console.error(`FAIL ${file} (exit ${result.status}, signal ${result.signal||'none'})`); if(result.error) console.error(result.error.message); if(output) console.error(output); }
    }
  }finally{ fs.rmSync(tempDir,{recursive:true,force:true}); }
  console.log(`Gate 1 contracts: ${files.length-failed}/${files.length} suites pass; ${checks} checks observed`);
  process.exitCode=failed?1:0;
}
main().catch(error=>{ console.error(error.stack||error); process.exitCode=1; });
