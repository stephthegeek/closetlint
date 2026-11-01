'use strict';
// Isolated trip records and controlled writes; no browser or personal wardrobe.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),clone=x=>JSON.parse(JSON.stringify(x));
function fn(name){const a=source.indexOf('function '+name+'('),b=source.indexOf('\nfunction ',a+1);assert(a>=0,name);return source.slice(a,b)}
function fixture(){
 const jobs=[],timers=new Map(),messages=[];let nextTimer=0,action,confirmation;
 const state={trips:{one:{name:'Synthetic trip',settings:{dest:'Review town',need:{dressy:1},must:['piece-a']},plan:{outfits:[]},checked:{}}}};
 const c={state,window:{addEventListener(){}},Promise,JSON,Object,Date,wearAny:()=>false,needDb:()=>false,tripPlanOut:clone,tripPlanIn:clone,tripRender(){},toast:m=>messages.push(m),toastAct:(message,label,callback)=>{messages.push(message);action={label,callback}},askConfirm:(message,label,callback)=>{confirmation=callback},setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer},clearTimeout:id=>timers.delete(id)};
 state.db={collection:()=>({doc:id=>({set:record=>new Promise((resolve,reject)=>jobs.push({id,record:clone(record),ok(){state.trips[id]=clone(record);resolve()},fail(){reject(Error('Synthetic offline'))}})),delete:()=>new Promise((resolve,reject)=>jobs.push({id,remove:true,ok(){delete state.trips[id];resolve()},fail(){reject(Error('Synthetic offline'))}}))})})};
 vm.createContext(c);vm.runInContext(['tripNew','tripSettings','tripHasUnsaved','tripLeave','tripOpen','deleteSavedDocument'].map(fn).join('\n')+'\n'+source.slice(source.indexOf('function tripSave('),source.indexOf('function tripOpen(')),c);
 c.tripOpen('one');return {c,state,jobs,timers,messages,get action(){return action},get confirmation(){return confirmation},runTimers(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn())}};
}
const settle=()=>new Promise(setImmediate);
(async()=>{
 {
  const f=fixture(),T=f.state.trip;T.packingVersion=2;T.basicChoices={socks:{n:2,ids:['piece-a']}};T.excluded=['piece-b'];
  const save=f.c.tripPersist(T,true);assert.equal(f.jobs[0].record.settings.basicChoices.socks.n,2);assert.equal(f.jobs[0].record.settings.excluded[0],'piece-b');f.jobs[0].ok();await save;
 }
 {
  const f=fixture(),T=f.state.trip;T._autoSetup=true;T.dayPlans={'2026-11-01':{style:'dressy',night:true,travel:true}};
  f.c.tripRefreshSave(T);f.runTimers();assert.equal(f.jobs.length,1,'day edits queue one setup save');
  T.packBasics=false;T.wearBulky=false;f.jobs[0].ok();await settle();f.runTimers();
  assert.equal(f.jobs.length,2,'edits made during a save queue a second snapshot');assert.equal(f.jobs[1].id,'one');
  assert.equal(f.jobs[1].record.settings.packBasics,false);assert.equal(f.jobs[1].record.settings.dayPlans['2026-11-01'].night,true);
  f.jobs[1].fail();await settle();assert.match(T._tripSaveError,/Synthetic offline/,'show the storage failure reason rather than hiding it behind a generic retry');assert.equal(f.timers.size,0,'a failed autosave waits for an explicit retry');
  const retry=f.c.tripSave();assert.equal(f.jobs[2].id,'one');f.jobs[2].ok();await retry;assert.equal(f.c.tripHasUnsaved(T),false);
 }
 {
  const f=fixture();f.state.trip=f.c.tripNew();f.state.trip.name='   ';
  assert.equal(await f.c.tripSave(),false);assert.equal(f.jobs.length,0,'an early save needs a nonblank name');
 }
 for(const step of [1,2,3]){
  const f=fixture();f.state.trip=f.c.tripNew();const T=f.state.trip;T.name='  Later planning  ';T.step=step;T.must=['piece-a'];
  const saving=f.c.tripSave();assert.equal(f.jobs[0].record.plan,null,'saving setup never builds or invents a packing list');assert.equal(f.jobs[0].record.settings.start,'');assert.equal(f.jobs[0].record.settings.dest,'');
  f.jobs[0].ok();await saving;const id=T.id;assert.equal(T.name,'Later planning');assert.equal(f.c.tripHasUnsaved(T),false);
  f.state.trip=null;f.c.tripOpen(id);assert.equal(f.state.trip.plan,null);assert.equal(f.state.trip.step,step,'unfinished trip resumes its saved setup step');assert.equal(f.c.tripHasUnsaved(f.state.trip),false);
  f.state.trip.must.push('piece-b');assert.deepEqual(f.state.trips[id].settings.must,['piece-a'],'reopening unfinished setup detaches arrays');
  assert.equal(await f.c.tripPersist(f.state.trip,true),false,'unfinished setup has no packing autosave');assert.equal(f.jobs.length,1);
 }
 {
  const f=fixture();f.state.trip=f.c.tripNew();const T=f.state.trip;T.name='First setup';T.step=2;
  const saving=f.c.tripSave();assert.equal(f.c.tripSave(),saving,'double-clicking early Save shares the pending write');
  const id=f.jobs[0].id;f.state.trips[id]=clone(f.jobs[0].record);f.jobs[0].fail();await saving;
  assert.equal(T.id,null);assert(T._tripSaveError);T.name='Revised setup';T.step=3;T.need.active=2;
  const retry=f.c.tripSave();assert.equal(f.jobs[1].id,id,'a lost early-save response cannot create another trip');
  T.need.active=3;T.name='Newer edit';f.jobs[1].ok();await retry;
  assert.equal(T.name,'Newer edit');assert.equal(f.state.trips[id].settings.need.active,2);assert(f.c.tripHasUnsaved(T),'newer edits remain unsaved after retry');
  T.name='Revised setup';T.need.active=2;T.start='2026-11-01';T.end='2026-11-03';T.plan={outfits:[]};T.step=4;
  T.checked.socks=1;await f.c.tripPersist(T,true);assert.equal(f.jobs.length,2,'packing cannot autosave a first list without its still-unsaved dates');assert.equal(f.state.trips[id].plan,null);assert(T._packingPending);
  const complete=f.c.tripSave();assert.equal(f.jobs[2].id,id,'building and saving continues the same trip');f.jobs[2].ok();await complete;
  assert.equal(f.state.trips[id].settings.start,'2026-11-01');assert.equal(f.state.trips[id].checked.socks,1);assert(!T._packingPending);
  f.state.trip=null;f.c.tripOpen(id);assert.equal(f.state.trip.step,4);assert.deepEqual(f.state.trip.plan,{outfits:[]});assert.equal(Object.keys(f.state.trips).length,2,'only the original fixture and one continued trip exist');
 }
 {
  const f=fixture();f.state.trips.partial={name:'Partial setup',settings:{},plan:null,step:3,checked:{}};
  f.c.tripOpen('partial');assert.equal(f.state.trip.step,3);
  const deleting=f.c.deleteSavedDocument('trips','partial',f.state.trips.partial,()=>{});f.jobs[0].ok();await deleting;
  const undo=f.action.callback();f.jobs[1].ok();await undo;
  f.state.trip=null;f.c.tripOpen('partial');assert.equal(f.state.trip.step,3);assert.equal(f.state.trip.plan,null,'delete/Undo preserves an unfinished trip');
  f.state.trips.partial.step=99;f.state.trip=null;f.c.tripOpen('partial');assert.equal(f.state.trip.step,1,'unknown saved step safely falls back to setup');
 }
 {
  const f=fixture(),T=f.state.trip;T.checked.a=1;T.must.push('piece-b');
  assert.deepEqual(f.state.trips.one.checked,{},'open packing state must not alias the saved record');assert.deepEqual(f.state.trips.one.settings.must,['piece-a']);assert(f.c.tripHasUnsaved(T));
 }
 {
  const f=fixture(),T=f.state.trip;T.checked.a=1;f.c.tripPersist(T);f.runTimers();assert.equal(f.jobs.length,1);f.jobs[0].fail();await settle();
  assert.deepEqual(f.state.trips.one.checked,{});assert.equal(T.checked.a,1);assert(f.c.tripHasUnsaved(T));assert(T._packingError,'packing errors remain visible until recovered');
  const retry=f.c.tripPersist(T,true);f.jobs[1].ok();await retry;assert.equal(f.state.trips.one.checked.a,1);assert(!T._packingError);assert.equal(f.c.tripHasUnsaved(T),false);
 }
 {
  const f=fixture(),T=f.state.trip;T.checked.a=1;f.c.tripPersist(T);f.runTimers();T.checked.b=1;f.c.tripPersist(T);f.runTimers();assert.equal(f.jobs.length,1,'writes for one trip are serialized');
  f.jobs[0].ok();await settle();f.runTimers();assert.equal(f.jobs.length,2);f.jobs[1].ok();await settle();assert.deepEqual(f.state.trips.one.checked,{a:1,b:1});
 }
 {
  const f=fixture(),T=f.state.trip;T.name='First name';const saving=f.c.tripSave();const again=f.c.tripSave();assert.equal(f.jobs.length,1,'repeat Save does not enqueue duplicate writes');
  T.name='';T.need.dressy=2;T.checked.a=1;f.c.tripPersist(T);assert.equal(f.jobs[0].record.settings.need.dressy,1,'manual Save takes a detached snapshot');
  f.jobs[0].ok();await saving;await again;assert.equal(T.name,'','clearing a title while Save runs remains a newer edit');assert.equal(f.state.trips.one.settings.need.dressy,1);
  f.runTimers();assert.equal(f.jobs.length,2);f.jobs[1].ok();await settle();assert.equal(f.state.trips.one.checked.a,1);assert.equal(f.state.trips.one.settings.need.dressy,1,'packing autosave never commits unsaved trip settings');assert(f.c.tripHasUnsaved(T));
 }
 {
  const f=fixture();f.state.trip=f.c.tripNew();const T=f.state.trip;T.plan={outfits:[]};T.name='New trip';const first=f.c.tripSave(),id=f.jobs[0].id;f.jobs[0].fail();await first;assert.equal(T.id,null);assert(T._tripSaveError);
  const retry=f.c.tripSave();assert.equal(f.jobs[1].id,id,'retry after a lost response reuses the original trip id');f.jobs[1].ok();await retry;assert.equal(T.id,id);
 }
 {
  const f=fixture(),T=f.state.trip;T.checked.a=1;f.c.tripPersist(T);let left=false;f.c.tripLeave(()=>left=true);assert(!left);f.confirmation();assert(left);f.runTimers();assert.equal(f.jobs.length,0,'discarding pending packing changes cancels their delayed write');
 }
 {
  const f=fixture(),T=f.state.trip;const pending=f.c.tripSave();let left=false;f.c.tripLeave(()=>left=true,true);assert(!left,'navigation waits for in-flight saves');f.jobs[0].ok();await pending;
  const stale=clone(f.state.trips.one);f.state.trips.one.checked={latest:1};const deleting=f.c.deleteSavedDocument('trips','one',stale,()=>{});f.jobs[1].ok();await deleting;assert(!f.state.trips.one);const undo=f.action.callback();f.jobs[2].fail();await undo;assert.equal(f.action.label,'Retry');const retry=f.action.callback();f.jobs[3].ok();await retry;assert.deepEqual(f.state.trips.one.checked,{latest:1},'delete Undo restores the latest saved packing record');
 }
 {
  const f=fixture();f.state.trip=f.c.tripNew();const T=f.state.trip;T.plan={outfits:[]};T.name='First save';const saving=f.c.tripSave();T.checked.late=1;f.c.tripPersist(T);f.jobs[0].ok();await saving;f.runTimers();assert.equal(f.jobs.length,2,'packing changes during first Save are autosaved after creation');f.jobs[1].ok();await settle();assert.equal(f.state.trips[T.id].checked.late,1);
 }
 {
  const f=fixture(),one=f.state.trip;f.state.trips.two=clone(f.state.trips.one);f.c.tripOpen('two');const two=f.state.trip;one.checked.a=1;two.checked.b=1;f.c.tripPersist(one);f.c.tripPersist(two);f.runTimers();assert.equal(f.jobs.length,2,'separate trip timers do not cancel each other');f.jobs.forEach(job=>job.ok());await settle();assert.equal(f.state.trips.one.checked.a,1);assert.equal(f.state.trips.two.checked.b,1);
 }
 console.log('Trips saves: name-only setup at every step, resume, lost-response retry, newer edits, completion without duplicates, partial delete/Undo, and existing packing/navigation recovery pass.');
})().catch(error=>{console.error(error);process.exitCode=1});
