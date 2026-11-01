// Independent browser adapters against one synthetic conditional-write server.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(__dirname+'/../runtime/browser.js','utf8'),copy=v=>JSON.parse(JSON.stringify(v));
const version=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const message='This changed in another tab or device. Your edits are still here. Keep this tab open, and open a new tab to review the latest version.';
function server(){
 const s={collections:{edits:{piece:{note:'original'},other:{note:'independent'}},custom:{},profile:{}},board:{name:'Original',pieces:[]},writes:0};
 s.versions=()=>({collections:Object.fromEntries(Object.entries(s.collections).map(([c,r])=>[c,Object.fromEntries(Object.entries(r).map(([id,v])=>[id,version(v)]))])),board:version(s.board)});
 s.client=function(legacy=false){
  const events={},timers=new Map();let serial=0;const notices=[];
  const context={console,window:{ClosetLintLocal:{token:'fixture',instance:'synthetic',board:copy(s.board),boardVersion:version(s.board),writeProtocol:legacy?undefined:1,missingVersion:version(null)},addEventListener:(k,fn)=>events[k]=fn},
   document:{addEventListener(){},getElementById:()=>({classList:{remove(){}},set textContent(v){notices.push(v)}})},setTimeout(fn){const id=++serial;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),
   fetch:async(path,options)=>{
    if(path==='/api/state')return {ok:true,json:async()=>({instance:'synthetic',collections:copy(s.collections),writeVersions:s.versions()})};
    const match=path.match(/^\/api\/doc\/([^/]+)\/(.*)$/),board=path==='/api/board';
    assert(match||board,path);
    const col=match&&decodeURIComponent(match[1]),id=match&&decodeURIComponent(match[2]);
    const current=board?s.board:s.collections[col][id]??null,intended=options.method==='DELETE'?null:JSON.parse(options.body);
    if(options.headers['If-Match']!=='"'+version(current)+'"'&&JSON.stringify(current)!==JSON.stringify(intended))return {ok:false,status:409,json:async()=>({error:message,code:'stale-edit'})};
    if(board)s.board=intended;else if(intended===null)delete s.collections[col][id];else s.collections[col][id]=intended;s.writes++;
    if(s.loseResponse){s.loseResponse=false;throw new TypeError('Connection lost after commit')}
    return {ok:true,json:async()=>({ok:true,version:version(intended)})};
   }};
  vm.createContext(context);vm.runInContext(source,context);
  const runtime=context.window.ClosetLintRuntime;
  return {runtime,db:runtime.use('db'),events,timers,notices,tick:async()=>{const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn());for(let i=0;i<35;i++)await Promise.resolve()}};
 };
 return s;
}
(async()=>{
 let s=server(),a=s.client(),b=s.client(),adb=await a.db,bdb=await b.db;
 let seen;bdb.collection('edits').onSnapshot(snapshot=>{seen=snapshot.docs.find(d=>d.id==='piece').data()});
 await adb.collection('edits').doc('piece').set({note:'saved on phone'});
 const pending={note:'unsaved laptop change'};
 await assert.rejects(bdb.collection('edits').doc('piece').set(pending),e=>e.status===409&&/another tab/.test(e.message));
 assert.equal(s.collections.edits.piece.note,'saved on phone');assert.equal(seen.note,'original');assert.equal(pending.note,'unsaved laptop change');
 let warned=false;b.events.beforeunload({preventDefault(){warned=true}});assert(warned,'conflicted edits warn before closing');
 await assert.rejects(bdb.collection('edits').doc('piece').set(pending),e=>e.status===409,'retry must not silently advance its stale baseline');
 await assert.rejects(bdb.collection('edits').doc('piece').delete(),e=>e.status===409);
 await bdb.collection('edits').doc('other').set({note:'unrelated piece still saves'});
 assert.equal(s.collections.edits.other.note,'unrelated piece still saves');
 const fresh=s.client(),freshDb=await fresh.db;
 await freshDb.collection('edits').doc('piece').set({note:'reviewed latest version'});
 assert.equal(s.collections.edits.piece.note,'reviewed latest version');
 // Two queued writes based on the same old snapshot must not erase one another.
 s=server();a=s.client();adb=await a.db;
 const first=adb.collection('edits').doc('piece').set({note:'first queued change'});
 const second=adb.collection('edits').doc('piece').set({note:'second stale queued change'});
 await first;await assert.rejects(second,e=>e.status===409);assert.equal(s.collections.edits.piece.note,'first queued change');
 // A lost acknowledgement is safe to retry with the identical payload.
 s=server();a=s.client();adb=await a.db;s.loseResponse=true;
 await assert.rejects(adb.collection('custom').doc('new').set({name:'New synthetic piece'}),/Connection lost/);
 await adb.collection('custom').doc('new').set({name:'New synthetic piece'});await a.runtime.flush();
 assert.equal(Object.keys(s.collections.custom).length,1);
 // Board conflicts retain the pending layout, never retry automatically, and keep the server's layout.
 s=server();a=s.client();b=s.client();await a.db;await b.db;
 a.runtime.setBoard({name:'Phone layout',pieces:[{id:'a',x:10}]});await a.tick();await a.runtime.flush();
 b.runtime.setBoard({name:'Unsaved laptop layout',pieces:[{id:'a',x:90}]});await b.tick();
 assert.equal(b.runtime.board.name,'Unsaved laptop layout');assert.equal(b.runtime.boardSaveStatus().phase,'error');assert.match(b.runtime.boardSaveStatus().error,/another tab/);assert.equal(b.timers.size,0);
 assert.equal(s.board.name,'Phone layout');await assert.rejects(b.runtime.flush(),e=>e.status===409);assert.equal(s.board.name,'Phone layout');
 // A convenience fortune-card conflict must not poison unrelated wardrobe saves/backups.
 s=server();a=s.client();b=s.client();adb=await a.db;bdb=await b.db;
 await adb.collection('profile').doc('daily-card').set({revealed:true});
 await assert.rejects(bdb.collection('profile').doc('daily-card').set({revealed:false}),e=>e.status===409);
 await bdb.collection('edits').doc('piece').set({note:'safe piece edit'});await b.runtime.flush();
 // New browser code cannot pretend to save against an old backend.
 s=server();a=s.client(true);adb=await a.db;
 await assert.rejects(adb.collection('edits').doc('piece').set({note:'must remain unsaved'}),e=>e.status===428);assert.equal(s.writes,0);
 console.log('Stale writes: two clients, independent records, deletes, retained edits/board, closing guard, exact retries, queued edits, and old-server protection pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
