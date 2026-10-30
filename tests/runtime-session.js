// Restart recovery must preserve the pending write and never switch wardrobes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../runtime/browser.js','utf8');
function instance(){
  const state={token:'old',instance:'wardrobe-a',writes:[],refreshes:0,refuse:false,timers:new Map(),serial:0,slow:false};
  const ctx={window:{ClosetLintLocal:{writeProtocol:1,missingVersion:'missing',boardVersion:'board0',token:'old',instance:'wardrobe-a',board:{pieces:[]}},addEventListener(){}},document:{addEventListener(){}},AbortController,setTimeout(fn){const id=++state.serial;state.timers.set(id,fn);return id},clearTimeout(id){state.timers.delete(id)},console,
    fetch:async(url,options)=>{
      assert.equal(options.credentials,'same-origin');
      if(url==='/'){state.refreshes++;return {ok:true,text:async()=>'<script>window.ClosetLintLocal='+JSON.stringify({token:state.token,instance:state.instance})+';</script>'}}
      if(options.headers['X-ClosetLint-Token']!==state.token||state.refuse)return {ok:false,status:403,json:async()=>({error:'Denied'})};
      if(url==='/api/state')return {ok:true,json:async()=>({collections:{custom:{}}})};
      if(url.startsWith('/api/import/')){state.lastImport=url;if(state.missing)return {ok:false,status:404,json:async()=>({error:'Not found'})};if(state.slow)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('Aborted'),{name:'AbortError'}))));return {ok:true,json:async()=>({instance:state.instance,setupVerified:true,saved:false})}}
      state.writes.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true,version:'next'})};
    }};
  vm.createContext(ctx);vm.runInContext(source,ctx);return {state,runtime:ctx.window.ClosetLintRuntime};
}
(async()=>{
  let {state,runtime}=instance(),db=await runtime.use('db');
  state.token='new';await db.collection('custom').doc('sample').set({name:'Unsaved edits'});
  assert.equal(state.refreshes,1);assert.deepEqual(state.writes,[{name:'Unsaved edits'}]);
  await runtime.flush();
  ({state,runtime}=instance());db=await runtime.use('db');state.token='new';state.instance='wardrobe-b';
  await assert.rejects(db.collection('custom').doc('sample').set({name:'Must stay here'}),/wardrobe changed/);
  assert.equal(state.writes.length,0);
  ({state,runtime}=instance());db=await runtime.use('db');state.refuse=true;
  await assert.rejects(db.collection('custom').doc('sample').set({name:'No endless retries'}),/Denied/);
  assert.equal(state.refreshes,1);assert.equal(state.writes.length,0);
  ({state,runtime}=instance());await runtime.use('db');state.token='new';assert.equal((await runtime.importSetup('batch one')).setupVerified,true);assert.equal(state.refreshes,1);assert.equal(state.lastImport,'/api/import/setup?batch=batch%20one');assert.equal(state.timers.size,0,'completed reads clear deadlines');
  await runtime.importStatus('batch one');assert.match(state.lastImport,/instance=wardrobe-a&batch=batch%20one/);assert.equal(state.writes.length,0,'checking setup/results is read-only');
  state.instance='wardrobe-b';await assert.rejects(runtime.importSetup('batch'),/wardrobe changed/);
  state.instance='wardrobe-a';state.slow=true;const waiting=runtime.importStatus('batch');for(const timer of state.timers.values())timer();await assert.rejects(waiting,/timed out/);assert.equal(state.timers.size,0);state.slow=false;await runtime.importStatus('batch');state.missing=true;await assert.rejects(runtime.importSetup('batch'),/Restart the local server/);
  console.log('Direct import transport: token renewal, fixed wardrobe, escaped batch IDs, read-only checks, bounded timeout, and retry pass.');
  console.log('Runtime session: restart retries original write once; different wardrobe and persistent denial never write.');
})().catch(e=>{console.error(e);process.exitCode=1});
