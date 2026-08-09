#!/usr/bin/env node
// Fast Gate 3 lane: opening economy truth, persisted owners, and the complete
// Standard/Ironman Program Reorganization lifecycle.
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawn}=require('child_process');
const {createBuildArtifacts}=require('../build.js');

const root=path.resolve(__dirname,'..');
const files=[
  'test-gate3-opening-economy.js',
  'test-gate3-state-contract.js',
  'test-gate3-reorganization-contract.js',
];
const harness=fs.readFileSync(path.join(__dirname,'harness.js'));
const game=createBuildArtifacts(root).find(a=>a.name==='build/game.js').contents;
const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'ov-gate3-contracts-'));
function run(target){
  return new Promise(resolve=>{
    const out=target+'.out',err=target+'.err',ofd=fs.openSync(out,'w'),efd=fs.openSync(err,'w');
    const child=spawn(process.execPath,[target],{cwd:root,stdio:['ignore',ofd,efd]});
    fs.closeSync(ofd); fs.closeSync(efd);
    let timedOut=false,spawnError=null;
    child.on('error',e=>{spawnError=e;});
    const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},120000);
    child.on('close',(status,signal)=>{ clearTimeout(timer); const output=fs.readFileSync(out,'utf8')+fs.readFileSync(err,'utf8');
      fs.rmSync(out,{force:true}); fs.rmSync(err,{force:true}); resolve({status,signal,output,error:spawnError||(timedOut?new Error('timed out'):null)}); });
  });
}
async function main(){
  let failed=0,checks=0;
  try{ for(const file of files){
    const target=path.join(tempDir,file);
    fs.writeFileSync(target,Buffer.concat([harness,Buffer.from('\n'),game,Buffer.from('\n'),fs.readFileSync(path.join(__dirname,file))]));
    const result=await run(target),output=(result.output||'').trim(),match=output.match(/(\d+)\/(\d+) checks passed/);
    if(match) checks+=Number(match[2]);
    if(result.status===0&&!result.signal&&!result.error&&match&&match[1]===match[2]) console.log(`PASS ${file} :: ${match[0]}`);
    else { failed++; console.error(`FAIL ${file} (exit ${result.status}, signal ${result.signal||'none'})`); if(result.error) console.error(result.error.message); if(output) console.error(output); }
  } }finally{ fs.rmSync(tempDir,{recursive:true,force:true}); }
  console.log(`Gate 3 contracts: ${files.length-failed}/${files.length} suites pass; ${checks} checks observed`);
  process.exitCode=failed?1:0;
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
