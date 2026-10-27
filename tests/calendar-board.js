// Real board/session functions, synthetic storage, and injected response failures.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const moduleSource=fs.readFileSync(__dirname+'/../app/scripts/board-session.js','utf8');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
const start=html.indexOf('function paintOMeta('),end=html.indexOf('\nfunction ',start+1);
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const nodes={},server={},attempts=[],messages=[],visits=[];
 let snapshot,flushCount=0,failFlush=0,failWrite=false,lost=false,onWrite,failedRecord=false;
 const original={id:null,name:'My active board',pieces:[{id:'old',x:13,y:7,w:20,z:1}],texts:[{t:'Keep this'}],st:{bg:{c:'#abcdef'}}};
 const state={board:clone(original),outfits:{},capsDone:true,tab:'saved'};
 const c={state,console,needDb:()=>false,$:id=>nodes[id]||(nodes[id]={setAttribute(k,v){this[k]=v},classList:{toggle(){}}}),toast:m=>messages.push(m),toastAct:m=>messages.push(m),renderBoard(){c.paintOMeta()},setTab:t=>state.tab=t,paintBoardContext(){c.paintCalendarPlanning()},openCalendar:m=>{state.tab='saved';visits.push(m)},histDay:d=>visits.push(d),histNice:d=>d,window:{ClosetLintRuntime:{setBoard:b=>snapshot=clone(b),flush:async()=>{flushCount++;if(flushCount===failFlush)throw Error('Autosave unavailable');if(failedRecord)throw Error('An outfit write needs retry')}}}};
 state.db={collection:()=>({doc:id=>({set:async doc=>{attempts.push({id,doc:clone(doc)});if(onWrite)onWrite();if(!failWrite||lost)server[id]=clone(doc);if(failWrite){failedRecord=true;throw Error('Response unavailable')}failedRecord=false}})})};
 vm.createContext(c);vm.runInContext(moduleSource+'\n'+html.slice(start,end),c);
 return {c,state,original,nodes,server,attempts,messages,visits,resetFailures(){failedRecord=false},get snapshot(){return snapshot},get flushCount(){return flushCount},set failFlush(n){failFlush=n},set failWrite(v){failWrite=v},set lost(v){lost=v},set onWrite(v){onWrite=v}};
}
(async()=>{
 {const f=fixture();f.failFlush=1;const b=f.state.board;assert.equal(await f.c.createCalendarOutfit('2026-11-02'),false);assert.equal(f.state.board,b);assert.equal(f.state.tab,'saved');assert.equal(f.attempts.length,0,'failed protection checkpoint cannot replace current board');}
 {
  const f=fixture(),{c,state}=f;assert.equal(await c.createCalendarOutfit('2026-11-02'),true);
  assert.equal(state.board.pieces.length,0);assert.equal(state.board.calendarPlan.d,'2026-11-02');assert.equal(f.nodes.osave['aria-label'],'Save & schedule');
  assert.deepEqual(clone(state.boardDrafts[0].board),f.original,'current board includes its complete text and design');
  state.board.pieces=[{id:'new',x:1,y:2,w:40,z:1}];state.board.name='New plan';c.persistBoard();
  const planKey=state.board.calendarPlan.k;
  // Leave without scheduling, resume the previous board, and recover this dated draft.
  assert.equal(await c.leaveCalendarBoard(),true);assert.equal(Object.keys(f.server).length,0);
  const plannedKey=c.workspaceKey();await c.returnWorkspace(state.previousBoardKey);assert.deepEqual(clone(state.board),f.original);
  await c.returnWorkspace(plannedKey);assert.equal(state.board.calendarPlan.k,planKey);
  f.failWrite=true;f.lost=true;assert.equal(await c.saveOutfit(),false);assert.equal(state.tab,'outfits');assert.equal(state.board.name,'New plan');assert.equal(state.board.calendarPlan.k,planKey);
  const id=f.attempts[0].id;assert.equal(f.snapshot.calendarPlan.outfitId,id,'retry identity is part of the autosaved draft');assert.equal(f.visits.length,2,'failed write does not return to calendar');
  // Reload loses the in-memory operation but preserves its outfit and plan identity.
  const recovered=clone(f.snapshot);f.resetFailures();state.outfitSave=null;state.outfitSaves=null;c.restoreWorkspace(recovered.workspace);c.adoptBoard(c.boardDocument(recovered));
  f.failWrite=false;assert.equal(await c.saveOutfit(),true);assert.equal(f.attempts[1].id,id);assert.equal(Object.keys(f.server).length,1);assert.equal(f.server[id].plans.length,1);assert.equal(f.server[id].plans[0].k,planKey);assert.equal(f.server[id].plans[0].d,'2026-11-02');assert.equal(f.server[id].calendarPlan,undefined,'workspace context never enters saved outfit metadata');
  assert.equal(f.state.board.calendarPlan,undefined);assert.equal(f.snapshot.calendarPlan,undefined);assert.equal(f.state.tab,'saved');assert.equal(f.visits.at(-1),'2026-11-02');assert.deepEqual(clone(state.boardDrafts[0].board),f.original);
 }
 {
  const f=fixture();await f.c.createCalendarOutfit('2026-11-02');f.state.board.pieces=[{id:'new',x:1,y:2,w:30,z:1}];f.failWrite=true;
  assert.equal(await f.c.saveOutfit(),false);f.failWrite=false;assert.equal(await f.c.saveOutfit(),true,'retry repairs its failed record before asking the global flush to pass');assert.equal(f.attempts.length,2);assert.equal(Object.keys(f.server).length,1);
 }
 {
  const f=fixture();await f.c.createCalendarOutfit('2026-11-03');f.state.board.pieces=[{id:'new',x:1,y:2,w:30,z:1}];
  f.failFlush=f.flushCount+1;assert.equal(await f.c.saveOutfit(),false);assert.equal(f.attempts.length,0,'outfit is not written until its retry target is recoverable');assert(f.state.board.calendarPlan);
  f.failFlush=0;assert.equal(await f.c.saveOutfit(),true);
 }
 {
  const f=fixture();await f.c.createCalendarOutfit('2026-11-04');f.state.board.pieces=[{id:'new',x:1,y:2,w:30,z:1}];
  f.failFlush=f.flushCount+2;assert.equal(await f.c.saveOutfit(),false);assert.equal(f.state.tab,'outfits');assert.equal(Object.keys(f.server).length,1);assert(f.state.board.calendarPlan);assert.match(f.nodes['board-outfit-status'].textContent,/Outfit saved; finishing/);
  f.failFlush=0;assert.equal(await f.c.saveOutfit(),true);assert.equal(Object.keys(f.server).length,1);assert.equal(Object.values(f.server)[0].plans.length,1);
 }
 {
  const f=fixture();await f.c.createCalendarOutfit('2026-11-05');f.state.board.pieces=[{id:'new',x:1,y:2,w:30,z:1}];f.onWrite=()=>{f.state.board.name='Typed during save'};
  assert.equal(await f.c.saveOutfit(),false);assert.equal(f.state.tab,'outfits');assert.equal(f.state.board.name,'Typed during save');assert(f.state.board.calendarPlan);f.onWrite=null;assert.equal(await f.c.saveOutfit(),true);assert.equal(Object.values(f.server)[0].name,'Typed during save');assert.equal(Object.values(f.server)[0].plans.length,1);
 }
 {
  const f=fixture();await f.c.createCalendarOutfit('2026-11-06');f.state.board.pieces=[{id:'new',x:1,y:2,w:30,z:1}];f.failFlush=f.flushCount+1;assert.equal(await f.c.leaveCalendarBoard(),false);assert.equal(f.state.tab,'outfits');assert(f.state.board.calendarPlan);assert.equal(f.state.workspaceBusy,false);
 }
 console.log('Calendar board: protected current work, dated draft recovery, atomic outfit/plan saves, lost response plus reload, autosave failures, newer edits, and stable retries pass.');
})().catch(e=>{console.error(e);process.exitCode=1});

// The saved-outfit scheduler changes only the date/name and links to the saved day.
(async()=>{
 const nodes=[],messages=[],visits=[],writes=[];let fail=true;
 function el(tag,attrs,...children){const n={tag,...attrs,children:children.filter(Boolean),appendChild(x){this.children.push(x)},showModal(){this.open=true},close(){this.open=false}};nodes.push(n);return n}
 const dialog=el('dialog',{}),legacy={k:'old',d:'2026-11-02',name:'Dinner',loc:'Home',lo:50,hi:70,dress:'casual',rain:true};
 const c={el,$:()=>dialog,needDb:()=>false,state:{outfits:{one:{name:'Favorite outfit',plans:[legacy]}}},todayStr:()=> '2026-10-27',histNice:d=>d,addClose(){},toast:m=>messages.push(m),toastAct:(m,label,action)=>messages.push({m,label,action}),returnCalendarDay:d=>visits.push(d),ofSave:async(id,value)=>{writes.push(JSON.parse(JSON.stringify(value)));if(fail)return false;c.state.outfits[id].plans=value.plans;return true}};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function planOutfitDialog('),html.indexOf('function openWearOutfit(')),c);
 c.planOutfitDialog('one',null,null,legacy);
 const date=nodes.find(n=>n.type==='date'),name=nodes.find(n=>n['aria-label']==='Event name (optional)'),save=nodes.find(n=>n.text==='Save changes');
 assert.equal(nodes.filter(n=>n.tag==='input').length,2,'scheduling needs only date and optional name');
 date.value='2026-11-04';name.value='';await save.onclick();assert.equal(dialog.open,true);assert.equal(messages.length,0);assert.equal(save.disabled,false,'failed save remains retryable');
 fail=false;await save.onclick();assert.equal(dialog.open,false);assert.equal(c.state.outfits.one.plans.length,1);const plan=c.state.outfits.one.plans[0];assert.equal(plan.d,'2026-11-04');assert.equal(plan.name,undefined);for(const key of ['loc','lo','hi','dress','rain'])assert.equal(plan[key],legacy[key],'legacy '+key+' is retained');
 assert.equal(messages[0].label,'View calendar');messages[0].action();assert.deepEqual(visits,['2026-11-04']);
 nodes.length=0;c.planOutfitDialog('one','2026-11-05');await nodes.find(n=>n.text==='Schedule outfit').onclick();assert.equal(c.state.outfits.one.plans.length,2);const fresh=c.state.outfits.one.plans[1];assert.equal(fresh.loc,undefined,'new schedules do not silently inherit location/weather');
 console.log('Outfit scheduling: compact fields, retained legacy details, failed-save retry, and calendar toast pass.');
})().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
 const pieces={a:{id:'a',wears:[]},b:{id:'b',wears:[]},manual:{id:'manual',wears:['2026-10-27']}},saved=[],messages=[];let failedPiece='b',failOutfit=false;
 const c={state:{outfits:{one:{pieces:[{id:'a'},{id:'b'},{id:'manual'}]}}},needDb:()=>false,byId:()=>pieces,toast:m=>messages.push(m),patchEdit:async(it,patch)=>{if(it.id===failedPiece)return false;Object.assign(it,patch);return true},ofSave:async(id,patch)=>{saved.push(patch);if(failOutfit)return false;Object.assign(c.state.outfits[id],patch);return true},Promise};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function wearOutfit('),html.indexOf('/* ---- scheduling an outfit;')),c);
 assert.equal(await c.wearOutfit('one','2026-10-27'),false);assert.equal(saved.length,0,'a failed piece write cannot produce a successful outfit log');assert.match(messages.at(-1),/not finished/);
 failedPiece='';failOutfit=true;assert.equal(await c.wearOutfit('one','2026-10-27'),false);failOutfit=false;
 const first=c.wearOutfit('one','2026-10-27'),second=c.wearOutfit('one','2026-10-27');assert.equal(first,second,'duplicate taps share the pending save');assert.equal(await first,true);
 assert.deepEqual(Array.from(c.state.outfits.one.wearLog[0].added).sort(),['a','b'],'retry retains provenance, including dates saved by an earlier attempt');
 failedPiece='b';assert.equal(await c.unwearOutfit('one','2026-10-27'),false);assert.equal(c.state.outfits.one.wearLog.length,1,'failed removal retains the outfit log for retry');failedPiece='';assert.equal(await c.unwearOutfit('one','2026-10-27'),true);
 assert.deepEqual(pieces.a.wears,[]);assert.deepEqual(pieces.b.wears,[]);assert.deepEqual(pieces.manual.wears,['2026-10-27'],'independently logged dates are preserved');
 console.log('Calendar wear saves: partial piece failure, outfit failure, duplicate tap, retry provenance, and removal recovery pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
