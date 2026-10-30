'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const a=html.indexOf('function '+name+'(');assert(a>=0,name);return html.slice(a,html.indexOf('\n}',a)+2)}
const map={top:{id:'top',bulk:1},other:{id:'other',bulk:2},shoe:{id:'shoe',bulk:3}};
let undo;const c={state:{outfits:{}},wearAny:()=>false,byId:()=>map,labParts:o=>o.top?[o.top]:[],labSig:o=>o.top.id,tripBulk:p=>p.bulk,collectionTripIds:(t,p,v)=>Object.keys(v.items),tripChanged(){},toast(){},toastAct:(m,l,f)=>undo=f,askConfirm:(m,l,f)=>f()};
vm.createContext(c);vm.runInContext(['tripNew','tripDays','tripDayList','tripCalendarEvents','tripDayChoices','tripResultSlots','tripOutfitIds','tripIdeaValid','tripPrepareResults','tripSelectIdea','tripBringIds','tripBasicsBulk','tripView','tripResetChecks'].map(fn).join('\n'),c);
function trip(version){const t=c.tripNew();Object.assign(t,{packingVersion:version,start:'2026-11-01',end:'2026-11-04',dayPlans:{'2026-11-02':{style:'dressy',night:true}},plan:{outfits:[{top:map.top}],extras:[],outer:[],other:[],shoes:[],basics:{}}});return t}
const old=trip(1);assert.equal(c.tripPrepareResults(old).length,5);assert.equal(old.plan.outfits[0].pin,true,'older all-packed selections stay confirmed');assert.equal(old.packingVersion,2);
const fresh=trip(2);c.tripPrepareResults(fresh);assert(!fresh.plan.outfits[0].pin,'new suggestions are not silently pinned');assert.equal(c.tripView(fresh,fresh.plan).S.length,0,'zero pins means zero packed outfits');
fresh.must=['other'];assert.equal(c.tripView(fresh,fresh.plan).used,2,'explicit extras stay packed without pins');
const slots=c.tripResultSlots(fresh),idea={top:map.top};c.tripSelectIdea(fresh,slots[0],idea,true);c.tripSelectIdea(fresh,slots[1],idea,false);
assert.equal(fresh.plan.outfits.length,2);assert.equal(fresh.plan.outfits[0].slotKey,slots[0].key);assert.notEqual(fresh.plan.outfits[0],fresh.plan.outfits[1],'reusing an idea cannot change the other day');
assert.equal(c.tripView(fresh,fresh.plan).S.length,1);c.tripSelectIdea(fresh,slots[1],fresh.plan.outfits[1],true);assert.equal(c.tripView(fresh,fresh.plan).S.length,2);
fresh.checked={a:1,b:1};c.tripResetChecks(fresh);assert.deepEqual(Object.keys(fresh.checked),[]);fresh.checked.c=1;undo();assert.deepEqual(Object.keys(fresh.checked).sort(),['a','b','c'],'reset Undo keeps newer checkmarks');
console.log('Trip results: dated/night slots, legacy confirmation, pinned-only packing, mandatory extras, independent idea selection, and reset Undo pass.');
const basics=trip(2);basics.plan.basics={socks:{label:'Socks',n:4,items:[map.other,map.shoe],bulk:.3}};basics.basicChoices={socks:{n:1,ids:['shoe']}};
let chosen=c.tripView(basics,basics.plan).basics.socks;assert.equal(chosen.n,1);assert.equal(chosen.items[0].id,'shoe','a basic choice controls which piece is packed');
basics.excluded=['shoe'];assert.equal(c.tripView(basics,basics.plan).basics.socks.items.length,0,'an excluded piece cannot return through a saved basic choice');
basics.basicChoices.socks.n=0;assert.equal(c.tripView(basics,basics.plan).basics.socks,undefined,'zero quantities do not become packed rows');assert(basics.plan.basics.socks,'the original group remains available to choose again');
