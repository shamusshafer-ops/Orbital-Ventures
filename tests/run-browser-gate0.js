#!/usr/bin/env node
// Real-browser quarantine for the launch → future decision → Skip → reload boundary.
// No browser automation package is required; this speaks the W3C WebDriver protocol.
const fs=require('fs');
const http=require('http');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');
const {createSession,startDriver,stopDriver}=require('./browser/webdriver');
const {runGate0LaunchFlow}=require('./browser/gate0-launch-flow');
const {runGate0DuplicateControlFlow}=require('./browser/gate0-duplicate-control');
const {createBuildArtifacts}=require('../build.js');

const root=path.resolve(__dirname,'..');
const requested=process.argv.includes('--browser')?process.argv[process.argv.indexOf('--browser')+1]:'all';
const allowMissing=process.argv.includes('--allow-missing');
const jsonOutput=process.argv.includes('--json');
const jsonOutputIndex=process.argv.indexOf('--json-output');
const jsonOutputPath=jsonOutputIndex>=0?process.argv[jsonOutputIndex+1]:null;
if(jsonOutputIndex>=0&&(!jsonOutputPath||jsonOutputPath.startsWith('--'))){
  console.error('--json-output requires a file path');
  process.exit(2);
}
if(process.argv.includes('--help')){
  console.log('Usage: node tests/run-browser-gate0.js [--browser firefox|chromium|all] [--allow-missing] [--json] [--json-output PATH]');
  process.exit(0);
}
if(!['firefox','chromium','all'].includes(requested)){
  console.error(`Unknown browser: ${requested}`); process.exit(2);
}

const artifacts=createBuildArtifacts(root);
const indexArtifact=artifacts.find(artifact=>artifact.name==='index.html');
if(!indexArtifact) throw new Error('build.js did not produce the deterministic index.html browser fixture');

function gitValue(args){
  const result=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:10000});
  return {ok:result.status===0,value:(result.stdout||'').trim(),error:result.status===0?null:(result.stderr||`git exited ${result.status}`).trim()};
}

function provenance(){
  const head=gitValue(['rev-parse','HEAD']);
  const status=gitValue(['status','--short']);
  const browserEnvironment={};
  for(const key of ['OV_FIREFOX_BINARY','OV_CHROMIUM_BINARY','OV_FIREFOX_WEBDRIVER_URL','OV_CHROMIUM_WEBDRIVER_URL',
    'OV_ALLOW_REMOTE_WEBDRIVER','OV_CHROMIUM_NO_SANDBOX']){
    let value=process.env[key]||null;
    if(value&&key.endsWith('_WEBDRIVER_URL')){
      try{ const url=new URL(value); if(url.username||url.password) value='[set; credentials redacted]'; }
      catch(error){ value='[set; invalid URL redacted]'; }
    }
    browserEnvironment[key]=value;
  }
  return {
    repository:{baseCommit:head.ok?head.value:null,baseCommitError:head.error,
      worktreeStatus:status.ok?status.value:null,worktreeClean:status.ok&&!status.value,worktreeStatusError:status.error},
    runtime:{nodeVersion:process.version,nodeExecutable:process.execPath,platform:process.platform,arch:process.arch,
      osType:os.type(),osRelease:os.release()},
    browserEnvironment
  };
}

function serializeReport(report){ return JSON.stringify(report,null,2)+'\n'; }

function writeReportAtomically(file,serialized){
  const target=path.resolve(process.cwd(),file);
  const temporary=path.join(path.dirname(target),`.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  try{
    fs.writeFileSync(temporary,serialized,{encoding:'utf8',flag:'wx',mode:0o600});
    fs.renameSync(temporary,target);
  }catch(error){
    try{ fs.unlinkSync(temporary); }catch(cleanupError){ if(cleanupError.code!=='ENOENT') error.cleanupError=cleanupError.message; }
    throw error;
  }
  return target;
}

function emitStructuredReport(report){
  if(jsonOutputPath) report.evidenceOutputPath=path.resolve(process.cwd(),jsonOutputPath);
  const serialized=serializeReport(report);
  if(jsonOutputPath) writeReportAtomically(jsonOutputPath,serialized);
  if(jsonOutput) process.stdout.write(serialized);
  return serialized;
}

function testHtml(){
  let html=indexArtifact.contents.toString('utf8');
  // The game is intentionally CDN-tolerant. Removing the optional visual-engine
  // requests keeps this local regression deterministic on offline CI machines.
  html=html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/phaser[^>]*><\/script>/,'');
  html=html.replace(/<script type="module">[\s\S]*?three\.module\.js[\s\S]*?<\/script>/,'');
  return html;
}

function mime(file){
  if(file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if(file.endsWith('.css')) return 'text/css; charset=utf-8';
  if(file.endsWith('.svg')) return 'image/svg+xml';
  if(file.endsWith('.png')) return 'image/png';
  if(file.endsWith('.jpg')||file.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function startServer(){
  const server=http.createServer((req,res)=>{
    let pathname;
    try{ pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); }
    catch(error){ res.writeHead(400); res.end('bad request'); return; }
    if(pathname==='/'||pathname==='/__gate0__.html'){
      const body=Buffer.from(testHtml());
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':body.length,'cache-control':'no-store'});
      res.end(body); return;
    }
    const match=pathname.match(/^\/(src|assets)\/(.+)$/);
    if(!match){
      res.writeHead(403); res.end('forbidden'); return;
    }
    const segments=match[2].split('/');
    if(segments.some(segment=>!segment||segment==='.'||segment==='..'||segment.startsWith('.'))){
      res.writeHead(403); res.end('forbidden'); return;
    }
    const base=path.join(root,match[1]);
    const target=path.resolve(base,...segments);
    if(!target.startsWith(base+path.sep)){
      res.writeHead(403); res.end('forbidden'); return;
    }
    fs.lstat(target,(statError,stat)=>{
      if(statError){ res.writeHead(statError.code==='ENOENT'?404:500); res.end('not found'); return; }
      if(stat.isSymbolicLink()||!stat.isFile()){ res.writeHead(403); res.end('forbidden'); return; }
      fs.realpath(base,(baseError,realBase)=>{
        if(baseError){ res.writeHead(500); res.end('root error'); return; }
        fs.realpath(target,(realError,realTarget)=>{
          if(realError){ res.writeHead(realError.code==='ENOENT'?404:500); res.end('not found'); return; }
          if(!realTarget.startsWith(realBase+path.sep)){
            res.writeHead(403); res.end('forbidden'); return;
          }
          fs.readFile(realTarget,(error,body)=>{
            if(error){ res.writeHead(error.code==='ENOENT'?404:500); res.end('read error'); return; }
            res.writeHead(200,{'content-type':mime(realTarget),'content-length':body.length,'cache-control':'no-store'}); res.end(body);
          });
        });
      });
    });
  });
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/__gate0__.html`}));
  });
}

async function run(){
  const browsers=requested==='all'?['firefox','chromium']:[requested];
  const local=await startServer();
  let reproduced=0,unexpected=0,unavailable=0;
  const report={schema:'orbital-ventures.gate0-browser.v1',startedAt:new Date().toISOString(),
    commands:{runner:[process.execPath,...process.argv.slice(1)]},requestedBrowsers:browsers,
    provenance:provenance(),
    fixture:{generator:'build.js#createBuildArtifacts',name:indexArtifact.name,bytes:indexArtifact.contents.length,
      persistedToWorktree:false,servedPaths:['/__gate0__.html','/src/**','/assets/**']},results:[]};
  const human=(method,message)=>{ if(!jsonOutput) console[method](message); };
  try{
    for(const browser of browsers){
      let service=null,session=null;
      const browserResult={browser,flows:[]};
      report.results.push(browserResult);
      try{
        service=await startDriver(browser);
        if(!service){
          unavailable++;
          browserResult.status='unavailable';
          browserResult.error=`no WebDriver binary and OV_${browser.toUpperCase()}_WEBDRIVER_URL is unset`;
          human('error',`UNAVAILABLE ${browser}: ${browserResult.error}`);
          continue;
        }
        browserResult.driver={source:service.source,command:service.command,driverVersion:service.driverVersion,
          external:service.external,status:service.status};
        session=await createSession(service);
        browserResult.requestedCapabilities=session.requestedCapabilities;
        browserResult.capabilities=session.capabilities;
        browserResult.status='completed';

        try{
          const result=await runGate0LaunchFlow(session,local.url);
          const flow={issue:'G0-B01',status:result.recoverable?'xpass':'xfail',result};
          browserResult.flows.push(flow);
          if(result.recoverable){
            unexpected++;
            human('error',`XPASS G0-B01 ${browser}: exact launched hull remained recoverable ${JSON.stringify(result)}`);
          }else{
            reproduced++;
            human('log',`XFAIL G0-B01 ${browser}: exact launched hull lost ownership after Skip/reload ${JSON.stringify(result)}`);
          }
        }catch(error){
          unexpected++;
          const detail=error.stack||error.message||String(error);
          browserResult.flows.push({issue:'G0-B01',status:'error',error:detail});
          human('error',`ERROR G0-B01 ${browser}: ${detail}`);
        }

        try{
          const result=await runGate0DuplicateControlFlow(session,local.url);
          const flow={issue:'G0-B08',status:result.reproduced?'xfail':'xpass',result};
          browserResult.flows.push(flow);
          if(result.reproduced){
            reproduced++;
            human('log',`XFAIL G0-B08 ${browser}: rapid activation of one DOM control duplicated commitment ${JSON.stringify(result)}`);
          }else{
            unexpected++;
            human('error',`XPASS G0-B08 ${browser}: rapid activation of one DOM control was idempotent ${JSON.stringify(result)}`);
          }
        }catch(error){
          unexpected++;
          const detail=error.stack||error.message||String(error);
          browserResult.flows.push({issue:'G0-B08',status:'error',error:detail});
          human('error',`ERROR G0-B08 ${browser}: ${detail}`);
        }
      }catch(error){
        unexpected++;
        browserResult.status='error';
        browserResult.error=error.stack||error.message||String(error);
        human('error',`ERROR browser setup ${browser}: ${browserResult.error}`);
      }finally{
        if(session) await session.close();
        browserResult.shutdown=await stopDriver(service);
        if(browserResult.shutdown.managed&&!browserResult.shutdown.stopped){
          unexpected++;
          browserResult.status='error';
          browserResult.shutdownError='managed WebDriver did not exit after bounded SIGTERM/SIGKILL shutdown';
          human('error',`ERROR browser shutdown ${browser}: ${browserResult.shutdownError}`);
        }
      }
    }
  }finally{
    await new Promise(resolve=>local.server.close(resolve));
  }
  report.finishedAt=new Date().toISOString();
  report.summary={reproduced,unexpected,unavailable};
  emitStructuredReport(report);
  if(!jsonOutput){
    console.log(`Gate 0 browser quarantine: ${reproduced} reproduced, ${unexpected} unexpected, ${unavailable} unavailable`);
    if(jsonOutputPath) console.log(`Browser evidence: ${report.evidenceOutputPath}`);
  }
  if(unexpected) process.exitCode=1;
  else if(unavailable&&!allowMissing) process.exitCode=2;
  else if(!reproduced) process.exitCode=2;
  return report;
}

run().catch(error=>{
  const detail=error.stack||error.message||String(error);
  const failure={schema:'orbital-ventures.gate0-browser.v1',commands:{runner:[process.execPath,...process.argv.slice(1)]},
    provenance:provenance(),fatalError:detail};
  try{ emitStructuredReport(failure); }
  catch(writeError){ console.error(`Failed to write browser evidence: ${writeError.stack||writeError}`); }
  if(!jsonOutput) console.error(detail);
  process.exitCode=1;
});
