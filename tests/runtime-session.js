// Restart recovery must preserve the pending write and never switch wardrobes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../runtime/browser.js','utf8');
function instance(){
  const state={token:'old',instance:'wardrobe-a',writes:[],refreshes:0,refuse:false};
  const ctx={window:{ClosetLintLocal:{token:'old',instance:'wardrobe-a',board:{pieces:[]}},addEventListener(){}},document:{addEventListener(){}},setTimeout(){},clearTimeout(){},console,
    fetch:async(url,options)=>{
      assert.equal(options.credentials,'same-origin');
      if(url==='/'){state.refreshes++;return {ok:true,text:async()=>'<script>window.ClosetLintLocal='+JSON.stringify({token:state.token,instance:state.instance})+';</script>'}}
      if(options.headers['X-ClosetLint-Token']!==state.token||state.refuse)return {ok:false,status:403,json:async()=>({error:'Denied'})};
      if(url==='/api/state')return {ok:true,json:async()=>({collections:{custom:{}}})};
      state.writes.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true})};
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
  console.log('Runtime session: restart retries original write once; different wardrobe and persistent denial never write.');
})().catch(e=>{console.error(e);process.exitCode=1});
