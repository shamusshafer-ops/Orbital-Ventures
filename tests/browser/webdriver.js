const http=require('http');
const {spawn,spawnSync}=require('child_process');

const REQUEST_TIMEOUT_MS=15000;
const RESPONSE_LIMIT_BYTES=8*1024*1024;

function isLoopback(hostname){
  const host=hostname.replace(/^\[|\]$/g,'').toLowerCase();
  return host==='127.0.0.1'||host==='localhost'||host==='::1';
}

function validateDriverUrl(raw,source){
  let url;
  try{ url=new URL(raw); }catch(error){ throw new Error(`${source} is not a valid URL: ${error.message}`); }
  if(url.protocol!=='http:') throw new Error(`${source} must use http://; the dependency-free client does not support ${url.protocol}`);
  if(url.username||url.password) throw new Error(`${source} must not embed credentials`);
  if(url.search||url.hash) throw new Error(`${source} must not contain a query or fragment`);
  if(!isLoopback(url.hostname)&&process.env.OV_ALLOW_REMOTE_WEBDRIVER!=='1'){
    throw new Error(`${source} targets non-loopback host ${url.hostname}; set OV_ALLOW_REMOTE_WEBDRIVER=1 only for a trusted network endpoint`);
  }
  return url.toString().replace(/\/$/,'');
}

function request(base,method,path,body,{timeoutMs=REQUEST_TIMEOUT_MS,maxBytes=RESPONSE_LIMIT_BYTES}={}){
  const url=new URL(base.replace(/\/$/,'')+path);
  const data=body===undefined?null:Buffer.from(JSON.stringify(body));
  return new Promise((resolve,reject)=>{
    let settled=false;
    const fail=error=>{ if(!settled){ settled=true; reject(error); } };
    const req=http.request({hostname:url.hostname,port:url.port,path:url.pathname+url.search,method,
      headers:data?{'content-type':'application/json; charset=utf-8','content-length':data.length}:{}},res=>{
      const chunks=[]; let bytes=0;
      res.on('data',chunk=>{
        bytes+=chunk.length;
        if(bytes>maxBytes){
          const error=new Error(`${method} ${path}: response exceeded ${maxBytes} bytes`);
          res.destroy(error); req.destroy(error); fail(error); return;
        }
        chunks.push(chunk);
      });
      res.on('error',fail);
      res.on('end',()=>{
        if(settled) return;
        const text=Buffer.concat(chunks).toString('utf8');
        let parsed={};
        if(text){
          try{ parsed=JSON.parse(text); }
          catch(error){ fail(new Error(`${method} ${path}: WebDriver returned invalid JSON`)); return; }
        }
        if(res.statusCode<200||res.statusCode>=300){
          const message=parsed&&parsed.value&&parsed.value.message||text||`HTTP ${res.statusCode}`;
          fail(new Error(`${method} ${path}: ${message}`)); return;
        }
        settled=true; resolve(parsed);
      });
    });
    req.setTimeout(timeoutMs,()=>req.destroy(new Error(`${method} ${path}: request timed out after ${timeoutMs} ms`)));
    req.on('error',fail); if(data) req.write(data); req.end();
  });
}

function findCommand(names){
  for(const name of names){
    const found=spawnSync('which',[name],{encoding:'utf8'});
    if(found.status===0&&found.stdout.trim()) return found.stdout.trim();
  }
  return null;
}

function freePort(){
  return new Promise((resolve,reject)=>{
    const server=http.createServer();
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{ const port=server.address().port; server.close(error=>error?reject(error):resolve(port)); });
  });
}

async function waitUntil(fn,{timeout=20000,interval=150,label='condition'}={}){
  const end=Date.now()+timeout; let last;
  while(Date.now()<end){
    try{ last=await fn(); if(last) return last; }catch(error){ last=error; }
    await new Promise(resolve=>setTimeout(resolve,interval));
  }
  throw new Error(`Timed out waiting for ${label}${last instanceof Error?`: ${last.message}`:''}`);
}

async function startDriver(browser){
  const upper=browser.toUpperCase();
  const external=process.env[`OV_${upper}_WEBDRIVER_URL`];
  if(external){
    const source=`OV_${upper}_WEBDRIVER_URL`;
    return {browser,url:validateDriverUrl(external,source),process:null,source,command:null,driverVersion:null,status:null,external:true};
  }
  const explicitBinary=process.env[`OV_${upper}_WEBDRIVER_BINARY`];
  const command=explicitBinary ? findCommand([explicitBinary]) : (browser==='firefox'
    ? findCommand(['geckodriver'])
    : findCommand(['chromedriver','chromium-driver']));
  if(explicitBinary&&!command) throw new Error(`OV_${upper}_WEBDRIVER_BINARY is not executable: ${explicitBinary}`);
  if(!command) return null;
  const port=await freePort();
  const args=browser==='firefox'?['--port',String(port)]:[`--port=${port}`];
  const versionResult=spawnSync(command,['--version'],{encoding:'utf8',timeout:5000});
  const driverVersion=((versionResult.stdout||versionResult.stderr||'').trim().split(/\r?\n/)[0])||null;
  const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});
  let log=''; child.stdout.on('data',chunk=>{ log+=chunk; }); child.stderr.on('data',chunk=>{ log+=chunk; });
  const url=`http://127.0.0.1:${port}`;
  let status=null;
  try{
    status=await waitUntil(()=>request(url,'GET','/status').then(response=>response.value||response),{timeout:15000,label:`${browser} WebDriver`});
  }catch(error){
    await stopDriver({process:child}); throw new Error(`${error.message}\n${log.slice(-2000)}`);
  }
  return {browser,url,process:child,source:command,command:[command,...args],driverVersion,status,external:false,log:()=>log};
}

class WebDriverSession{
  constructor(service,sessionId,capabilities,requestedCapabilities){
    this.service=service; this.sessionId=sessionId; this.capabilities=capabilities||{};
    this.requestedCapabilities=requestedCapabilities||{};
  }
  command(method,path,body){ return request(this.service.url,method,`/session/${this.sessionId}${path}`,body); }
  async navigate(url){ return this.command('POST','/url',{url}); }
  async execute(script,args=[]){
    const response=await this.command('POST','/execute/sync',{script,args});
    return response.value;
  }
  async close(){ try{ await this.command('DELETE',''); }catch(error){} }
}

async function createSession(service){
  const firefoxBinary=process.env.OV_FIREFOX_BINARY;
  const chromiumBinary=process.env.OV_CHROMIUM_BINARY;
  const chromiumArgs=['--headless=new','--disable-gpu'];
  if(process.env.OV_CHROMIUM_NO_SANDBOX==='1') chromiumArgs.push('--no-sandbox');
  const alwaysMatch=service.browser==='firefox'
    ? {browserName:'firefox','moz:firefoxOptions':{args:['-headless'],...(firefoxBinary?{binary:firefoxBinary}:{})}}
    : {browserName:'chrome','goog:chromeOptions':{args:chromiumArgs,...(chromiumBinary?{binary:chromiumBinary}:{})}};
  const response=await request(service.url,'POST','/session',{capabilities:{alwaysMatch}});
  const value=response.value||response;
  const sessionId=value.sessionId||response.sessionId;
  if(!sessionId) throw new Error(`WebDriver did not return a session id: ${JSON.stringify(response)}`);
  return new WebDriverSession(service,sessionId,value.capabilities||{},alwaysMatch);
}

function waitForExit(child,timeout){
  if(child.exitCode!==null||child.signalCode!==null) return Promise.resolve(true);
  return new Promise(resolve=>{
    let done=false;
    const finish=value=>{ if(done)return; done=true; clearTimeout(timer); child.removeListener('exit',onExit); resolve(value); };
    const onExit=()=>finish(true);
    const timer=setTimeout(()=>finish(false),timeout);
    child.once('exit',onExit);
  });
}

async function stopDriver(service,{termTimeout=2500,killTimeout=1500}={}){
  const child=service&&service.process;
  if(!child) return {managed:false,stopped:true,forced:false};
  if(child.exitCode!==null||child.signalCode!==null) return {managed:true,stopped:true,forced:false};
  child.kill('SIGTERM');
  if(await waitForExit(child,termTimeout)) return {managed:true,stopped:true,forced:false};
  child.kill('SIGKILL');
  return {managed:true,stopped:await waitForExit(child,killTimeout),forced:true};
}

module.exports={createSession,startDriver,stopDriver,waitUntil,validateDriverUrl};
