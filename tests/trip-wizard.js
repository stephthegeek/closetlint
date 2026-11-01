'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const a=html.indexOf('function '+name+'(');assert(a>=0,name);return html.slice(a,html.indexOf('\n}',a)+2)}
const settings=html.split('\n').find(l=>l.startsWith('function tripSettings('));
const state={outfits:{event:{name:'Dinner look',pieces:[{id:'top'}],plans:[{k:'dinner',d:'2026-11-02',name:'Dinner'}]}}};
const c={state,wearAny:()=>false,tripHasUnsaved:()=>true,Date,TRIP_BAGS:[['carry','Carry-on']],document:{querySelectorAll:()=>[]}};
vm.createContext(c);vm.runInContext(['tripActivityPart','tripIsSleepwear','tripNew','tripDays','tripEff','tripCalendarEvents','tripDayList','tripDayChoices','tripSlots','tripPlanningSettings','tripBringIds','tripWizardSummary','tripBasicCount','tripBasics'].map(fn).join('\n')+'\n'+settings,c);
const T=c.tripNew();Object.assign(T,{start:'2026-11-01',end:'2026-11-04',name:'Test trip'});
let days=c.tripDayChoices(T);assert.equal(days.length,4);assert.equal(days.filter(d=>d.travel).length,2);assert.equal(days[1].events[0].name,'Dinner');
assert.equal(c.tripSlots(T).length,4);T.dayPlans={'2026-11-02':{style:'pro',night:true,travel:false}};
assert.equal(c.tripSlots(T).length,5,'a night out is additional to daytime outfits');assert(c.tripSlots(T).some(s=>s.occ==='pro'&&s.fors==='d:2026-11-02'));
assert(c.tripSlots(T).some(s=>s.night&&s.occ==='dressy'));
T.laundry=true;assert.equal(c.tripSlots(T).length,4,'laundry reduces ordinary daytime combinations, preserving the night out and scheduled event');
T.dayPlans['2027-01-01']={style:'dressy',night:true};assert.equal(c.tripSlots(T).length,4,'out-of-range choices stay stored without affecting this trip');
T.must=['top','missing'];T.packedExtras=['top','socks'];T.mustOutfits=['event'];assert.deepEqual(Array.from(c.tripBringIds(T)),['top','missing','socks'],'one unified list deduplicates pieces without dropping unavailable references');
const snapshot=JSON.stringify(T);c.tripDayChoices(T);c.tripSlots(T);c.tripPlanningSettings(T);assert.equal(JSON.stringify(T),snapshot,'deriving days and slots never changes saved choices');
const saved=c.tripSettings(T);assert.equal(saved.dayPlans['2026-11-02'].night,true);assert.equal(saved.packBasics,true);assert.equal(saved.wearBulky,true);
Object.assign(c,{allItems:()=>[],tripOK:()=>true,tripBand:()=> 'mild'});T.packBasics=false;const basic=c.tripBasics(T,'mild',[],[],[]);assert.equal(Object.keys(basic.B).length,0,'opting out removes automatically counted basics');
T.packBasics=true;assert.equal(c.tripBasics(T,'mild',[],[],[]).B.underwear,undefined,'absent underwear does not create an automatic shortage');c.allItems=()=>[{id:'briefs',name:'Briefs',meta:'Underwear',sub:'Briefs'}];assert.equal(c.tripBasics(T,'mild',[],[],[]).B.underwear.n,4);
const legacy=c.tripNew();Object.assign(legacy,{start:'2026-11-01',end:'2026-11-04',need:{pro:1,dressy:1,active:2,swim:1}});assert.equal(c.tripDayChoices(legacy)[0].style,'pro');assert.equal(c.tripDayChoices(legacy)[1].style,'dressy');assert.equal(c.tripPlanningSettings(legacy).need.swim,1,'legacy activity requests remain available');
// Autosave serializes through the existing stable-ID writer, never overlapping it or retrying errors silently.
let timer,cleared=0,saves=0;Object.assign(c,{setTimeout:f=>(timer=f,1),clearTimeout(){cleared++},tripSave:()=>saves++});vm.runInContext(fn('tripQueueSetup')+'\n'+fn('tripCancelPending'),c);
T._autoSetup=true;state.trip=T;c.tripQueueSetup(T);assert(timer);timer();assert.equal(saves,1);
for(const blocked of [{_tripFlight:{}},{_tripSaveError:'offline'},{name:''},{_autoSetup:false}]){timer=null;const copy={...T,...blocked};state.trip=copy;c.tripQueueSetup(copy);assert.equal(timer,null)}
state.trip=T;c.tripQueueSetup(T);c.tripCancelPending(T);assert.equal(T._setupTimer,null);assert(cleared>0,'discard clears delayed writes');
console.log('Trip wizard: dated choices, extra nights, calendar events, laundry, legacy requests, explicit basics, unified bring IDs, and safe setup autosave pass.');

// Night-out assignments survive save/reopen without changing older plans' shape.
Object.assign(c,{byId:()=>({top:{id:'top'}}),labParts:o=>o.top?[o.top]:[],labOutfitFromIds:ids=>ids.length?{top:{id:ids[0]}}:null,labSig:()=> 'top'});
vm.runInContext(fn('tripPlanOut')+'\n'+fn('tripPlanIn'),c);
const plan={outfits:[{top:{id:'top'},fors:'d:2026-11-01',night:true}],extras:[],counts:{},outer:[],shoes:[],basics:{},other:[],travel:[],also:[],flags:[],bulk:{},band:'mild'};
const wire=c.tripPlanOut(plan);assert.equal(wire.outfits[0].night,true);assert.equal(c.tripPlanIn(wire).outfits[0].night,true);
delete plan.outfits[0].night;assert(!Object.hasOwn(c.tripPlanOut(plan).outfits[0],'night'));

const formal=c.tripNew();Object.assign(formal,{style:'pro',start:'2026-11-01',end:'2026-11-04',dayPlans:{'2026-11-01':{style:'casual'}}});assert.equal(c.tripSlots(c.tripPlanningSettings(formal)).filter(s=>s.occ==='pro').length,3,'an individual casual override does not change another professional day');
// Room estimates include explicit extras once, and exclude purchases until owned.
const roomMap={top:{id:'top',bulk:1},coat:{id:'coat',bulk:6},shoe:{id:'shoe',bulk:4},extra:{id:'extra',bulk:2},charm:{id:'charm',bulk:.5},wish:{id:'wish',bulk:100,wish:true}};
Object.assign(c,{byId:()=>roomMap,tripBulk:p=>p.bulk,collectionTripIds:(t,p,v)=>Object.keys(v.items).concat(v.outer.map(p=>p.id),v.shoes.map(s=>s.it.id),p.other.map(p=>p.id))});
vm.runInContext(fn('tripBasicsBulk')+'\n'+fn('tripView'),c);
const roomPlan={outfits:[{top:roomMap.top,acc:{shoes:roomMap.shoe}}],outer:[roomMap.coat],shoes:[{it:roomMap.shoe}],other:[roomMap.charm],basics:{}};
assert.equal(c.tripView({must:['extra','wish'],wearBulky:false},roomPlan).used,13.5);
assert.equal(c.tripView({must:['extra','wish'],wearBulky:true},roomPlan).used,3.5);

// Jumping straight to Days & bag without dates offers recovery instead of an empty grid.
function node(tag,attrs,...children){return {tag,attrs:attrs||{},children:children.filter(Boolean),appendChild(child){this.children.push(child)}}}
let renders=0;
Object.assign(c,{el:node,chip:(label,on,action)=>node('button',{text:label,onclick:action}),tripCheck:()=>node('label'),tripWizardFooter:()=>node('footer'),tripRender:()=>renders++,tripDayEditor:(t,day)=>node('button',{'data-date':day.date})});
vm.runInContext(fn('tripStep2'),c);
function nodes(root){return [root,...root.children.flatMap(child=>typeof child==='object'?nodes(child):[])]}
for(const dates of [{},{start:'2026-11-01'},{start:'2026-11-04',end:'2026-11-01'}]){
  const undated=Object.assign(c.tripNew(),dates,{step:2,name:'Unfinished trip',must:['top']}),view=node('main');
  c.tripStep2(view,undated);
  const prompt=nodes(view).find(n=>n.attrs.text==='Choose trip dates');assert(prompt,'missing or invalid dates must have an actionable explanation');
  prompt.attrs.onclick();assert.equal(undated.step,1);assert.equal(undated.name,'Unfinished trip');assert.equal(undated.must[0],'top');
}
const dated=Object.assign(c.tripNew(),{start:'2026-11-01',end:'2026-11-04'}),datedView=node('main');c.tripStep2(datedView,dated);
assert.equal(nodes(datedView).filter(n=>n.attrs['data-date']).length,4,'valid dates render every day below the style choices');
assert(!nodes(datedView).some(n=>n.attrs.text==='Choose trip dates'));
assert.equal(renders,3);

const sleepwear=[
 {id:'lounge-top',meta:'Loungewear',sub:'Tops',name:'Soft cotton top'},
 {id:'lounge-pants',meta:'Loungewear',sub:'Bottoms',name:'Weekend trousers'},
 {id:'robe',meta:'Loungewear',sub:'Robes',name:'Velour robe'},
 {id:'pajamas',meta:'Loungewear',sub:'Pajama sets',name:'Striped set'},
 {id:'gown',meta:'Loungewear',sub:'Nightgowns',name:'Cotton nightdress'},
 {id:'named',meta:'Loungewear',sub:'Tops',name:'Cotton pyjama shirt'},
 {id:'sleep-shirt',meta:'Loungewear',sub:'Tops',name:'Long sleep shirt'},
 {id:'wish',meta:'Loungewear',sub:'Pajama sets',name:'Wishlist pajamas',wish:true}
];
assert.deepEqual(sleepwear.map(p=>c.tripIsSleepwear(p)),[false,false,false,true,true,true,true,false]);
Object.assign(c,{allItems:()=>sleepwear});const sleepTrip=Object.assign(c.tripNew(),{start:'2026-11-01',end:'2026-11-04'});
const sleepBasics=c.tripBasics(sleepTrip,'mild',[],[],[]).B.lounge;
assert.equal(sleepBasics.label,'Sleepwear');assert(sleepBasics.items.length>0);assert(sleepBasics.items.every(p=>c.tripIsSleepwear(p)),'ordinary loungewear never fills the automatic sleepwear choices');
Object.assign(c,{allItems:()=>sleepwear.slice(0,3)});assert.equal(c.tripBasics(sleepTrip,'mild',[],[],[]).B.lounge,undefined,'a lounge-only wardrobe does not imply ownership or need of separate sleepwear');
console.log('Trip sleepwear: explicit sleepwear categories/names count; generic loungewear, robes, and wishlist pieces do not.');

// Wardrobe-aware optional basics distinguish an absent category from excluded,
// stored, or currently ill-fitting records, without using gender preferences.
let wardrobe=[];c.allItems=()=>wardrobe;c.tripOK=p=>!p.hidden&&!p.stored;
const bounded=Object.assign(c.tripNew(),{start:'2026-11-01',end:'2026-11-04',need:{active:1,swim:1}});
const item=(id,meta,sub,extra={})=>({id,name:id,meta,sub,...extra});
wardrobe=[item('briefs','Underwear','Briefs')];assert.equal(c.tripBasics(bounded,'mild',[],[],[]).B.bras,undefined);
wardrobe.push(item('wish-bra','Underwear','Bras',{wish:true}));assert.equal(c.tripBasics(bounded,'mild',[],[],[]).B.bras,undefined);
wardrobe.push(item('stored-bra','Underwear','Bras',{stored:true}));let result=c.tripBasics(bounded,'mild',[],[],[]);assert(result.B.bras);assert.equal(result.B.bras.items.length,0,'owned-but-filtered bras retain a truthful reminder');
wardrobe=[];bounded.basicChoices={bras:{n:0,ids:[]}};assert(c.tripBasics(bounded,'mild',[],[],[]).B.bras,'explicit choices remain recoverable even with no cataloged bras');bounded.basicChoices={};
wardrobe=[item('cover','Swimwear','Cover-ups'),item('exercise-top','Activewear','Tops')];result=c.tripBasics(bounded,'mild',[],[],[]);assert.equal(result.B.swim,undefined);assert.equal(result.B.swimBottoms.items.length,0);assert.equal(result.B.activeTops.items[0].id,'exercise-top');assert.equal(result.B.activeBottoms.items.length,0,'a top does not cover an entire exercise outfit');assert(result.flags.every(x=>!x.startsWith('You have')));
wardrobe=[item('trunks','Swimwear','Trunks & shorts')];result=c.tripBasics(bounded,'hot',[],[],[]);assert.equal(result.B.swimBottoms.items[0].id,'trunks');assert.equal(result.B.swimTops,undefined,'a trunks-only wardrobe does not imply a swim-top requirement');
wardrobe=[item('bikini-top','Swimwear','Tops')];result=c.tripBasics(bounded,'hot',[],[],[]);assert.equal(result.B.swimTops.items[0].id,'bikini-top');assert.equal(result.B.swimBottoms.items.length,0,'a bikini top alone does not cover swimming');
wardrobe.push(item('bikini-bottom','Swimwear','Bottoms'));result=c.tripBasics(bounded,'hot',[],[],[]);assert.equal(result.B.swimBottoms.items[0].id,'bikini-bottom');
wardrobe=[item('swimsuit','Swimwear','One-pieces'),item('active-set','Activewear','Sets')];result=c.tripBasics(bounded,'mild',[],[],[]);assert.equal(result.B.swim.items[0].id,'swimsuit');assert.equal(result.B.active.items[0].id,'active-set');assert.equal(result.B.swimTops,undefined);assert.equal(result.B.activeBottoms,undefined);
bounded.need.swim=4;wardrobe.push(item('swim-top','Swimwear','Tops'),item('swim-bottom','Swimwear','Bottoms'));result=c.tripBasics(bounded,'mild',[],[],[]);assert.equal(result.B.swim.n,1);assert.equal(result.B.swimTops.n,1);assert.equal(result.B.swimBottoms.n,1,'one complete suit only satisfies one of two suggested swimming changes');
bounded.basicChoices={swim:{n:1,ids:['cover']}};wardrobe=[item('cover','Swimwear','Cover-ups')];result=c.tripBasics(bounded,'mild',[],[],[]);assert.equal(result.B.swim.label,'Swimwear pieces','an explicit older choice is retained without a claim of complete outfits');assert.equal(result.B.swimBottoms,undefined);
console.log('Trip defaults: wardrobe-aware bras, filtered inventory, separate activity parts, trunks-only swimming, complete sets, partial coverage, and explicit-choice compatibility pass.');

Object.assign(c,{tripOK:()=>true,tripSeasonOK:()=>true,tripBulk:()=>1,tripStyleHas:(p,styles)=>(p.styles||[]).some(s=>styles.includes(s)),itemWeight:()=> 'regular',labShoeSeasons:()=>['summer','winter'],labAccScore:()=>.5,LAB_NEUTRAL:{black:1},TRIP_SEAS:{mild:['summer','winter']}});
vm.runInContext(['tripOuter','tripShoes','tripAssignShoes','tripTights'].map(fn).join('\n'),c);
for(const sub of ['Capes & ponchos','Vests']){wardrobe=[item('outer','Outerwear',sub)];assert.equal(c.tripOuter({rain:true,bag:'carry'},'mild')[0].id,'outer')}
wardrobe=[item('flat','Footwear','Flats',{styles:['professional']}),item('heel','Footwear','Heels')];const shoeTrip={need:{pro:1},bag:'carry'};let shoes=c.tripShoes(shoeTrip,'mild',[],[]);assert.equal(shoes.list[0].it.id,'flat','tagged formal flats take precedence over untagged heels');assert(shoes.list.some(s=>s.why==='Everyday option'));assert(!shoes.note);
wardrobe=[item('heel','Footwear','Heels')];shoes=c.tripShoes(shoeTrip,'mild',[],[]);assert.match(shoes.note,/No shoes tagged/,'heel shape alone is not evidence of formal suitability');assert(shoes.list.every(s=>!s.why.includes('walking')));
Object.assign(c,{labBareLegs:()=>true});wardrobe=[];assert.equal(c.tripTights({},'cold',[{}]).flag,'','an absent tights category is not treated as a missing personal requirement');
wardrobe=[item('tights','Legwear','Tights')];assert.match(c.tripTights({},'cold',[{}]).flag,/No matching tights found/,'existing but unmatched tights produce a catalog-scoped note');
console.log('Trip alternatives: ponchos/vests, tagged formal flats, factual shoe wording, and wardrobe-aware tights reminders pass.');

// The same inventory-presence rule applies to every automatic basics group.
bounded.need={};bounded.basicChoices={};wardrobe=[];
assert.deepEqual(Object.keys(c.tripBasics(bounded,'mild',[],[],[]).B),[]);
for(const sub of ['Boxers','Briefs','Panties','Boxer briefs']){
 wardrobe=[item('only-'+sub,'Underwear',sub)];result=c.tripBasics(bounded,'mild',[],[],[]);
 assert.deepEqual(Object.keys(result.B),['underwear'],'no other underwear type, bras, socks, or sleepwear is required');
 assert.equal(result.B.underwear.items[0].sub,sub);assert.equal(result.B.underwear.n,5,'the shared quantity is not multiplied by underwear subtype');
}
wardrobe=[item('boxers','Underwear','Boxers'),item('panties','Underwear','Panties')];result=c.tripBasics(bounded,'mild',[],[],[]);assert.equal(result.B.underwear.items.length,2);assert.equal(result.B.underwear.n,5,'mixed underwear types share one quantity');
for(const [key,ownedItem] of [['underwear',item('briefs','Underwear','Briefs')],['bras',item('bra','Underwear','Bras')],['socks',item('socks','Legwear','Socks')],['lounge',item('pajamas','Loungewear','Pajama sets')]]){
 wardrobe=[{...ownedItem,wish:true}];assert.equal(c.tripBasics(bounded,'mild',[],[],[]).B[key],undefined,'wishlist-only '+key+' does not activate a requirement');
 wardrobe=[{...ownedItem,stored:true}];c.tripOK=p=>!p.stored;result=c.tripBasics(bounded,'mild',[],[],[]);assert(result.B[key]);assert.equal(result.B[key].items.length,0,'owned but excluded '+key+' remains a catalog-scoped reminder');
 wardrobe=[];bounded.basicChoices={[key]:{n:0,ids:[]}};assert(c.tripBasics(bounded,'mild',[],[],[]).B[key],'an explicit '+key+' choice remains recoverable');bounded.basicChoices={};
}
console.log('All automatic basics: shared underwear types, mixed wardrobes, category absence, wishlist-only records, filtered ownership, and explicit choices pass.');
