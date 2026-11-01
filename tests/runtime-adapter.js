// Browser adapter contract, executed with a synthetic transport rather than a real browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const clone=value=>JSON.parse(JSON.stringify(value));
(async()=>{
  let saved={custom:{},profile:{},ratings:{}},board=null,fail=false;
  const requests=[],events={},files=[],timers=[];
  const node=()=>({classList:{remove(){}},appendChild(){},remove(){},click(){files.push(this.download)}});
  const ctx={window:{ClosetLintLocal:{writeProtocol:1,missingVersion:'missing',boardVersion:'board0',token:'fixture-token',board:{pieces:[],name:'Starting board'}},addEventListener:(name,fn)=>{events[name]=fn}},document:{addEventListener(){},getElementById:()=>node(),body:{appendChild(){}},createElement:node},URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},console,
    fetch:async(url,options)=>{
      requests.push([url,options]);
      assert.equal(options.headers['X-ClosetLint-Token'],'fixture-token');assert.equal(options.credentials,'same-origin');
      assert.ok(url.startsWith('/api/'));
      if(url==='/api/state')return {ok:true,json:async()=>({collections:clone(saved)})};
      if(fail)return {ok:false,json:async()=>({error:'Simulated disk full'})};
      if(url==='/api/board')board=JSON.parse(options.body);
      if(url==='/api/backup')return {ok:true,blob:async()=>({size:1})};
      const match=url.match(/^\/api\/doc\/([^/]+)\/(.+)$/);
      if(match){const col=decodeURIComponent(match[1]),id=decodeURIComponent(match[2]);if(options.method==='DELETE')delete saved[col][id];else saved[col][id]=JSON.parse(options.body)}
      return {ok:true,json:async()=>url==='/api/assets'?{id:'a'.repeat(32)}:{ok:true,version:'next'}};
    }};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../runtime/browser.js'),'utf8'),ctx);
  const runtime=ctx.window.ClosetLintRuntime,db=await runtime.use('db');
  let current;const stop=db.collection('custom').onSnapshot(s=>{current=s.docs.map(d=>({id:d.id,data:d.data()}))});
  assert.equal(current.length,0);
  const value={name:'Synthetic tee',size:'XXL'};
  const first=db.collection('custom').doc('stable+id').set(value);value.name='Changed caller object';await first;
  assert.equal(current[0].data.name,'Synthetic tee','set snapshots caller data before queued write');
  current[0].data.name='Changed listener copy';
  let second;db.collection('custom').onSnapshot(s=>{second=s.docs[0]?.data()});assert.equal(second.name,'Synthetic tee','listeners receive independent copies');
  assert.equal(saved.custom['stable+id'].size,'XXL');
  runtime.setBoard({pieces:[{id:'c-stable+id'}],name:'Latest board'});
  await runtime.fullBackup();
  assert.equal(board.name,'Latest board','board is flushed before backup request');
  assert.equal(files[0].endsWith('.zip'),true);
  assert.ok(requests.findIndex(r=>r[0]==='/api/board')<requests.findIndex(r=>r[0]==='/api/backup'));
  await db.collection('custom').doc('stable+id').delete();assert.equal(current.length,0);
  stop();
  assert.equal(await runtime.use('sample'),null,'core works without an AI provider');
  const assets=await runtime.use('assets');assert.equal((await assets.upload({})).id,'a'.repeat(32));
  fail=true;
  await assert.rejects(db.collection('custom').doc('unsaved').set({name:'Unsaved'}),/disk full/);
  assert.equal(saved.custom.unsaved,undefined,'failed writes are not emitted as committed records');
  await assert.rejects(runtime.flush(),/could not be saved/);
  let blocked=false;events.beforeunload({preventDefault(){blocked=true}});assert.equal(blocked,true,'unsaved changes warn before closing');
  fail=false;
  await db.collection('custom').doc('unsaved').set({name:'Recovered'});await runtime.flush();
  blocked=false;events.beforeunload({preventDefault(){blocked=true}});assert.equal(blocked,false,'successful retry clears only the recovered record failure');
  fail=true;for(const id of ['one','two'])await assert.rejects(db.collection('custom').doc(id).set({name:id}));
  fail=false;await db.collection('custom').doc('one').set({name:'Recovered one'});await assert.rejects(runtime.flush(),/could not be saved/);
  await db.collection('custom').doc('two').set({name:'Recovered two'});await runtime.flush();
  const failingContext={...ctx,window:{ClosetLintLocal:{writeProtocol:1,missingVersion:'missing',boardVersion:'board0',token:'fixture-token',board:{pieces:[]}},addEventListener(){}},fetch:async()=>{throw new Error('Offline')}};
  vm.createContext(failingContext);vm.runInContext(fs.readFileSync(path.join(__dirname,'../runtime/browser.js'),'utf8'),failingContext);
  await assert.rejects(failingContext.window.ClosetLintRuntime.use('db'),/Offline/);
  assert.match(failingContext.window.ClosetLintRuntime.error,/not being saved/);
  await assert.rejects(failingContext.window.ClosetLintRuntime.fullBackup(),/Offline/);
  // A temporary autosave failure must recover without leaving flush permanently blocked.
  function boardFixture(){
    const state={failures:0,status:0,writes:[],notices:[],timers:new Map(),events:{},serial:0};
    const toast={classList:{remove(){}},set textContent(value){state.notices.push(value)}};
    const context={console,window:{ClosetLintLocal:{writeProtocol:1,missingVersion:'missing',boardVersion:'board0',token:'fixture',board:{pieces:[]}},addEventListener:(name,fn)=>{state.events[name]=fn}},
      document:{addEventListener(){},getElementById:()=>toast},
      setTimeout(fn){const id=++state.serial;state.timers.set(id,fn);return id},clearTimeout(id){state.timers.delete(id)},
      fetch:async(url,options)=>{
        if(url==='/api/state')return {ok:true,json:async()=>({collections:{custom:{}}})};
        if(state.hold)await new Promise(resolve=>{state.release=resolve});
        if(state.failures){state.failures--;if(!state.status)throw new TypeError('Failed to fetch');return {ok:false,status:state.status,json:async()=>({error:'Synthetic save rejection'})}}
        state.writes.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true,version:'next'})};
      }};
    vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../runtime/browser.js'),'utf8'),context);
    state.runtime=context.window.ClosetLintRuntime;
    state.tick=async()=>{const pending=[...state.timers.values()];state.timers.clear();pending.forEach(fn=>fn());for(let i=0;i<20;i++)await Promise.resolve()};
    return state;
  }
  let recovery=boardFixture();await recovery.runtime.use('db');recovery.failures=1;
  recovery.runtime.setBoard({pieces:[{id:'synthetic-a',x:10}]});await recovery.tick();
  assert.equal(recovery.timers.size,1,'connection failure schedules a retry');
  let warned=false;recovery.events.beforeunload({preventDefault(){warned=true}});assert.ok(warned);
  recovery.runtime.setBoard({pieces:[{id:'synthetic-a',x:30}]});await recovery.tick();await recovery.runtime.flush();
  assert.equal(recovery.writes.at(-1).pieces[0].x,30,'retry saves the newest layout');
  assert.equal(recovery.notices.at(-1),'Board autosave recovered.');
  warned=false;recovery.events.beforeunload({preventDefault(){warned=true}});assert.equal(warned,false,'successful retry clears unsaved warning and flush failure');
  recovery=boardFixture();await recovery.runtime.use('db');recovery.failures=10;recovery.status=503;
  recovery.runtime.setBoard({pieces:[]});await recovery.tick();await recovery.tick();await recovery.tick();
  assert.equal(recovery.timers.size,0,'server failures have only two automatic retries');
  recovery.failures=0;recovery.events.online();await recovery.tick();await recovery.runtime.flush();
  assert.equal(recovery.notices.at(-1),'Board autosave recovered.','reconnecting retries pending board');
  recovery=boardFixture();await recovery.runtime.use('db');recovery.failures=1;recovery.status=400;
  recovery.runtime.setBoard({pieces:[]});await recovery.tick();
  assert.equal(recovery.timers.size,0,'invalid payloads are not automatically retried');
  assert.match(recovery.notices.at(-1),/Synthetic save rejection/,'autosave exposes the server reason');
  assert.equal(recovery.runtime.boardSaveStatus().phase,'error');
  const statuses=[];const stopStatus=recovery.runtime.watchBoardSave(s=>statuses.push(s.phase));
  recovery.runtime.retryBoardSave();assert.equal(recovery.runtime.boardSaveStatus().phase,'retrying');await recovery.tick();
  await recovery.runtime.flush();assert.equal(recovery.runtime.boardSaveStatus().phase,'saved');assert(statuses.includes('saving'));stopStatus();
  recovery=boardFixture();await recovery.runtime.use('db');recovery.hold=true;
  recovery.runtime.watchBoardSave(()=>{throw Error('Synthetic UI subscriber failure')});
  recovery.runtime.setBoard({pieces:[{id:'a',x:1}]});await recovery.tick();
  recovery.runtime.setBoard({pieces:[{id:'a',x:2}]});await recovery.tick();assert.equal(recovery.runtime.boardSaveStatus().phase,'saving');
  recovery.hold=false;recovery.release();for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(recovery.runtime.boardSaveStatus().phase,'pending','older acknowledgement cannot mark newer edits saved');
  await recovery.tick();await recovery.runtime.flush();assert.equal(recovery.writes.at(-1).pieces[0].x,2);assert.equal(recovery.runtime.boardSaveStatus().phase,'saved');
  console.log('Runtime adapter: snapshot isolation, serialized writes, board-before-backup, deletion, optional AI, and failure handling passed.');
})().catch(error=>{console.error(error);process.exit(1)});
