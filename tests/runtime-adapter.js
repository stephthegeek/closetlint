// Browser adapter contract, executed with a synthetic transport rather than a real browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const clone=value=>JSON.parse(JSON.stringify(value));
(async()=>{
  let saved={custom:{},profile:{},ratings:{}},board=null,fail=false;
  const requests=[],events={},files=[],timers=[];
  const node=()=>({classList:{remove(){}},appendChild(){},remove(){},click(){files.push(this.download)}});
  const ctx={window:{ClosetLintLocal:{token:'fixture-token',board:{pieces:[],name:'Starting board'}},addEventListener:(name,fn)=>{events[name]=fn}},document:{addEventListener(){},getElementById:()=>node(),body:{appendChild(){}},createElement:node},URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},console,
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
      return {ok:true,json:async()=>url==='/api/assets'?{id:'a'.repeat(32)}:{ok:true}};
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
  const failingContext={...ctx,window:{ClosetLintLocal:{token:'fixture-token',board:{pieces:[]}},addEventListener(){}},fetch:async()=>{throw new Error('Offline')}};
  vm.createContext(failingContext);vm.runInContext(fs.readFileSync(path.join(__dirname,'../runtime/browser.js'),'utf8'),failingContext);
  await assert.rejects(failingContext.window.ClosetLintRuntime.use('db'),/Offline/);
  assert.match(failingContext.window.ClosetLintRuntime.error,/not being saved/);
  await assert.rejects(failingContext.window.ClosetLintRuntime.fullBackup(),/Offline/);
  console.log('Runtime adapter: snapshot isolation, serialized writes, board-before-backup, deletion, optional AI, and failure handling passed.');
})().catch(error=>{console.error(error);process.exit(1)});
