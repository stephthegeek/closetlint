// Synthetic browser transport: one request, atomic cache publication, safe retries.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(__dirname+'/../runtime/browser.js','utf8'),html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
const clone=v=>JSON.parse(JSON.stringify(v)),version=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fixture(){
 const data={edits:{},outfits:{one:{pieces:[{id:'a'},{id:'b'}]}},outfitHistory:{}};
 const f={data,events:{},requests:[],fail:false,lose:false,commits:0};
 const versions=()=>({collections:Object.fromEntries(Object.entries(data).map(([c,rows])=>[c,Object.fromEntries(Object.entries(rows).map(([id,v])=>[id,version(v)]))]))});
 const c={window:{ClosetLintLocal:{token:'fixture',instance:'synthetic',writeProtocol:1,atomicWear:true,missingVersion:version(null)},addEventListener:(k,fn)=>f.events[k]=fn},document:{addEventListener(){},getElementById:()=>null},console,setTimeout,clearTimeout,
  fetch:async(path,options)=>{
   if(path==='/api/state')return {ok:true,json:async()=>({collections:clone(data),writeVersions:versions()})};
   f.requests.push({path,body:options.body});assert.equal(options.headers['X-ClosetLint-Token'],'fixture');assert.equal(path,'/api/wear');
   if(f.fail)return {ok:false,status:500,json:async()=>({error:'disk full'})};
   const changes=JSON.parse(options.body);
   if(changes.some(r=>r.expected!==version(data[r.collection][r.id]??null)&&JSON.stringify(data[r.collection][r.id])!==JSON.stringify(r.value)))return {ok:false,status:409,json:async()=>({error:'Changed in another tab'})};
   changes.forEach(r=>data[r.collection][r.id]=clone(r.value));f.commits++;
   if(f.lose){f.lose=false;throw Error('Connection lost after commit')}
   return {ok:true,json:async()=>({versions:changes.map(r=>({collection:r.collection,id:r.id,version:version(r.value)}))})};
  }};
 vm.createContext(c);vm.runInContext(source,c);f.runtime=c.window.ClosetLintRuntime;f.config=c.window.ClosetLintLocal;return f;
}
function changes(){return [{collection:'edits',id:'a',value:{wears:['2026-10-29']}},{collection:'edits',id:'b',value:{wears:['2026-10-29']}},{collection:'outfits',id:'one',value:{pieces:[{id:'a'},{id:'b'}],wearLog:[{d:'2026-10-29'}]}}]}
(async()=>{
 const f=fixture(),db=await f.runtime.use('db'),seen={};
 for(const col of ['edits','outfits'])db.collection(col).onSnapshot(s=>{seen[col]=Object.fromEntries(s.docs.map(d=>[d.id,d.data()]))});
 f.fail=true;const action=changes();await assert.rejects(db.commitWear(action),/disk full/);assert.deepEqual(seen.edits,{});assert.equal(seen.outfits.one.wearLog,undefined);
 f.fail=false;await db.commitWear(action);assert.equal(f.requests.length,2);assert.equal(seen.edits.a.wears.length,1);assert.equal(seen.outfits.one.wearLog.length,1);await f.runtime.flush();
 // A stale final record rejects every piece before publishing snapshots.
 const g=fixture(),gdb=await g.runtime.use('db');g.data.outfits.one.name='Phone edit';let updates=0;gdb.collection('edits').onSnapshot(()=>updates++);
 await assert.rejects(gdb.commitWear(changes()),e=>e.status===409);assert.deepEqual(g.data.edits,{});assert.equal(updates,1);
 // Same payload and original versions survive a lost acknowledgement.
 const h=fixture(),hdb=await h.runtime.use('db'),retry=changes();h.lose=true;
 await assert.rejects(hdb.commitWear(retry),/Connection lost/);await hdb.commitWear(retry);assert.equal(h.requests[0].body,h.requests[1].body);await h.runtime.flush();
 // Retrying the old action must not adopt a newer baseline and erase later edits.
 const i=fixture(),idb=await i.runtime.use('db'),old=changes();i.lose=true;await assert.rejects(idb.commitWear(old));
 i.data.edits.a.note='newer change';await assert.rejects(idb.commitWear(old),e=>e.status===409);assert.equal(i.data.edits.a.note,'newer change');
 const legacy=fixture(),ldb=await legacy.runtime.use('db');legacy.config.atomicWear=false;await assert.rejects(ldb.commitWear(changes()),/Refresh/);assert.equal(legacy.requests.length,0);
 // Public demos persist the entire action with one browser-storage write.
 function fn(n){const a=html.indexOf('function '+n+'('),b=html.indexOf('\nfunction ',a+1);return html.slice(a,b<0?undefined:b)}
 let overlay={},quota=true,writes=0;const c={PUB:{},state:{},pubOverlay:()=>clone(overlay),pubSaveOverlay(){throw Error('must not use swallowing helper')},onDataSoon(){},Promise,localStorage:{setItem(k,v){if(quota)throw Error('quota exceeded');writes++;overlay=JSON.parse(v)}}};
 vm.createContext(c);vm.runInContext(fn('startPublic'),c);c.startPublic();const before=clone(c.state.edits);
 await assert.rejects(c.state.db.commitWear(changes()),/quota/);assert.deepEqual(clone(c.state.edits),before);assert.deepEqual(overlay,{});
 quota=false;await c.state.db.commitWear(changes());assert.equal(writes,1);assert.equal(overlay.edits.a.wears.length,1);assert.equal(c.state.outfits.one.wearLog.length,1);
 // A single-piece action reports success only after its one save succeeds.
 let ok=false;const messages=[],single={todayStr:()=> '2026-10-29',patchEdit:async()=>ok,toast:m=>messages.push(m),Promise};vm.createContext(single);vm.runInContext(fn('toggleWornToday'),single);
 assert.equal(await single.toggleWornToday({wears:[]}),false);assert.equal(messages.length,0);ok=true;assert.equal(await single.toggleWornToday({wears:[]}),true);assert.match(messages[0],/Logged/);
 console.log('Atomic wear adapter: failures, stale tabs, lost responses, retained preconditions, demo quota failure, and independent piece logging pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
