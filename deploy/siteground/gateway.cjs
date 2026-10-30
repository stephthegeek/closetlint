'use strict';
// SiteGround owns the public listener. The unchanged Python HTTP handler uses
// private process pipes, so it does not need a second listening port.
const http=require('node:http'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..'),MAX_BODY=512*1024*1024,MAX_PENDING=256;
function configuration(env=process.env){
 const origin=new URL(env.CLOSETLINT_ORIGIN||'');
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Set CLOSETLINT_ORIGIN to the exact HTTPS site origin.');
 const cwd=process.cwd(),split=cwd.indexOf('/public_html/');
 const data=env.CLOSETLINT_DATA||(split>=0?cwd.slice(0,split)+'/closetlint-data':'');
 if(!path.isAbsolute(data)||path.resolve(data).split(path.sep).includes('public_html')||path.resolve(data)===ROOT||path.resolve(data).startsWith(ROOT+path.sep))throw Error('Set a private CLOSETLINT_DATA folder outside public_html and the source.');
 return {origin:origin.origin,authority:origin.host,data,python:env.CLOSETLINT_PYTHON||'python3',port:Number(env.PORT)||3000};
}
function permitted(req,config){
 for(const field of ['host','origin','content-length','transfer-encoding'])if(req.rawHeaders.filter((_,i)=>i%2===0&&req.rawHeaders[i].toLowerCase()===field).length>1)return false;
 return req.headers.host===config.authority&&req.url.startsWith('/')&&!req.url.startsWith('//')&&(req.headers.origin===undefined||req.headers.origin===config.origin);
}
function reject(res,status,message){if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({error:message}));}
function main(){
 let config;try{config=configuration();}catch(e){console.error(e.message);process.exitCode=1;return;}
 fs.mkdirSync(config.data,{recursive:true,mode:0o700});
 const logFile=path.join(config.data,'startup.log');fs.writeFileSync(logFile,'Starting hosted wardrobe (private pipe transport).\n',{mode:0o600});
 let logBytes=0;function privateLog(text){if(logBytes>16384)return;const value=String(text).slice(0,4096);logBytes+=value.length;fs.appendFileSync(logFile,value+'\n');}
 let ready=false,stopping=false,failed=false,queue=[],active=null,buffer=Buffer.alloc(0),remaining=null,draining=false;
 let child=null,startupTimeout=null,restartTimer=null;
 function fail(message){
  if(failed||stopping)return;failed=true;ready=false;clearTimeout(startupTimeout);privateLog(message);
  const previous=child;child=null;
  if(active){clearTimeout(active.timer);if(previous)active.req.unpipe(previous.stdin);if(active.res.headersSent)active.res.destroy();else reject(active.res,503,'Your wardrobe is temporarily unavailable. Please retry.');}
  queue.forEach(j=>reject(j.res,503,'Your wardrobe is temporarily unavailable. Please retry.'));
  queue=[];active=null;buffer=Buffer.alloc(0);remaining=null;draining=false;
  if(previous)previous.kill();
  // Never replay an uncertain write. A fresh backend serves a new request token;
  // callers reconcile committed state before explicitly retrying their operation.
  restartTimer=setTimeout(startBackend,250);
 }
 function finish(){if(!active||!active.uploadDone||!active.responseDone)return;clearTimeout(active.timer);active=null;remaining=null;pump();}
 function pump(){
  if(active||!ready||failed||!queue.length)return;
  active=queue.shift();if(active.req.aborted||active.res.destroyed){active=null;pump();return;}
  const job=active,headers={...job.req.headers,host:'127.0.0.1:6684',connection:'close','content-length':String(job.length)};
  for(const key of Object.keys(headers))if(key==='forwarded'||key.startsWith('x-forwarded-')||['authorization','expect','transfer-encoding','upgrade'].includes(key))delete headers[key];
  if(headers.origin!==undefined)headers.origin='http://127.0.0.1:6684';
  for(const key of Object.keys(headers))headers[key]=Array.isArray(headers[key])?headers[key].join(', '):String(headers[key]);
  job.timer=setTimeout(()=>fail('Backend request timed out.'),300000);
  child.stdin.write(JSON.stringify({method:job.req.method,path:job.req.url,headers,length:job.length})+'\n');
  job.req.on('end',()=>{job.uploadDone=true;if(active===job)finish()});
  job.req.on('aborted',()=>{if(active===job)fail('Upload interrupted; restarting the backend.')});
  job.req.pipe(child.stdin,{end:false});
 }
 function consume(){
  while(buffer.length&&!failed){
   if(remaining===null){
    const end=buffer.indexOf(10);if(end<0){if(buffer.length>65536)fail('Invalid backend response headers.');return;}
    let message;try{message=JSON.parse(buffer.subarray(0,end).toString())}catch{fail('Invalid backend response.');return;}buffer=buffer.subarray(end+1);
    if(message.type==='ready'&&!ready){ready=true;clearTimeout(startupTimeout);privateLog('Backend ready.');pump();continue;}
    if(message.type!=='response'||!active||!Number.isInteger(message.length)||message.length<0||message.length>MAX_BODY||!Number.isInteger(message.status)||message.status<200||message.status>599){fail('Unexpected backend response.');return;}
    remaining=active.req.method==='HEAD'?0:message.length;
    const headers={...message.headers,'Cache-Control':'private, no-store','Strict-Transport-Security':'max-age=31536000'};
    for(const key of Object.keys(headers))if(['connection','transfer-encoding'].includes(key.toLowerCase()))delete headers[key];
    if(!active.res.destroyed)active.res.writeHead(message.status,headers);
    if(!remaining){if(!active.res.destroyed)active.res.end();active.responseDone=true;finish();continue;}
   }
   if(remaining!==null&&remaining>0){
    const size=Math.min(remaining,buffer.length),data=buffer.subarray(0,size);buffer=buffer.subarray(size);remaining-=size;
    if(!active.res.destroyed&&!active.res.write(data)){
     child.stdout.pause();draining=true;const res=active.res,outputChild=child;let resumed=false;
     function resume(){res.removeListener('drain',resume);res.removeListener('close',resume);if(resumed||child!==outputChild)return;resumed=true;draining=false;outputChild.stdout.resume();consume();}
     res.once('drain',resume);res.once('close',resume);
    }
    if(!remaining){if(!active.res.destroyed)active.res.end();active.responseDone=true;finish();}
    if(draining)return;
   }
  }
 }
 const server=http.createServer((req,res)=>{
  if(!permitted(req,config)){reject(res,403,'This wardrobe only accepts requests from its own site.');return;}
  const raw=req.headers['content-length'];
  if(req.headers['transfer-encoding']!==undefined||raw!==undefined&&!/^\d+$/.test(raw)){reject(res,400,'Use one explicit upload length.');return;}
  const length=Number(raw||0);if(!Number.isSafeInteger(length)||length>MAX_BODY){reject(res,413,'Upload is too large.');return;}
  // A month of calendar photos can exceed 32 concurrent HTTP/2 requests.
  // Paused requests retain no uploaded bodies here; keep the queue bounded.
  if(failed||queue.length>=MAX_PENDING){reject(res,503,'Your wardrobe is busy. Please retry.');return;}
  req.pause();queue.push({req,res,length,uploadDone:false,responseDone:false});pump();
 });
 server.requestTimeout=300000;server.headersTimeout=30000;
 server.listen(config.port,'0.0.0.0',()=>privateLog('Gateway listening.'));
 server.on('error',error=>fail('Gateway listen error: '+error.code));
 function startBackend(){
  if(stopping)return;failed=false;ready=false;
  const processChild=spawn(config.python,[path.join(__dirname,'start.py'),'--data',config.data],{cwd:ROOT,stdio:['pipe','pipe','pipe']});child=processChild;
  if(processChild.pid)fs.writeFileSync(path.join(config.data,'backend.pid'),String(processChild.pid),{mode:0o600});
  startupTimeout=setTimeout(()=>{if(child===processChild)fail('Backend did not start.')},30000);
  processChild.stdout.on('data',data=>{if(child!==processChild)return;buffer=buffer.length?Buffer.concat([buffer,data]):data;consume()});
  processChild.stderr.on('data',data=>{if(child===processChild)privateLog(data)});
  processChild.stdin.on('error',error=>{if(child===processChild)fail('Backend input closed: '+error.code)});
  processChild.on('error',error=>{if(child===processChild)fail('Backend could not launch: '+error.code)});
  processChild.on('exit',(code,signal)=>{if(child===processChild&&!stopping)fail('Backend stopped (exit '+code+', signal '+signal+'). Restarting.');});
 }
 function stop(){
  if(stopping)return;stopping=true;clearTimeout(startupTimeout);clearTimeout(restartTimer);if(active)clearTimeout(active.timer);
  server.close(()=>process.exit(0));server.closeAllConnections();if(child)child.kill('SIGTERM');
  // A hosting supervisor may keep extra IPC handles open after our sockets close.
  // A handled SIGTERM must still exit, so a deployment can replace this process.
  setTimeout(()=>process.exit(0),1000).unref();
 }
 startBackend();
 process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
module.exports={configuration,permitted,main};
if(require.main===module)main();
