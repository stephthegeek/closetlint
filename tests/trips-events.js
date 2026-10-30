const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.env.APP||require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
function fn(name){const a=html.indexOf('function '+name+'(');assert(a>=0,name);return html.slice(a,html.indexOf('\n}',a)+2)}
const calls=[];
function el(tag,attrs={},...children){return {tag,...attrs,children:children.filter(Boolean),appendChild(c){this.children.push(c);return c}}}
function all(node){return [node,...(node.children||[]).filter(x=>typeof x==='object').flatMap(all)]}
const state={trips:{ongoing:{name:'Long weekend',settings:{start:'2026-10-27',end:'2026-10-30',dest:'Portland'},plan:{outfits:[{pin:true},{}]}},undated:{name:'Someday',settings:{}},old:{name:'Last year',settings:{start:'2025-01-01'}}},outfits:{look:{name:'Velvet dress',pieces:[{id:'dress'}],plans:[{k:'same',d:'2026-10-28',name:'Birthday'},{k:'second',d:'2026-10-28',name:'Dinner'},{k:'old',d:'2026-09-01',name:'Old event'}]},other:{name:'Other outfit',plans:[{k:'same',d:'2026-10-29',name:'Concert'},null,{}]}}};
const c={state,el,document:{querySelectorAll:()=>[]},planOutfitDialog:(...args)=>calls.push(['edit',...args]),todayStr:()=> '2026-10-28',byIdA:()=>({dress:{id:'dress'}}),ofMini:o=>el('preview',{outfit:o}),HIST_BIG:{},labAutoLayout:items=>items.map(x=>({id:x.it.id})),routeAnchor:(route,attrs,action,child)=>el('a',{route,...attrs,action},child),returnCalendarDay:d=>calls.push(['calendar',d]),tripOpen:id=>{calls.push(['trip',id]);state.trip={}},askConfirm:(m,l,yes)=>yes(),planRemove:(id,key)=>{calls.push(['remove',id,key]);return Promise.resolve(true)},deleteSavedDocument:(kind,id)=>calls.push(['delete',kind,id]),tripRender:()=>calls.push(['render'])};
vm.createContext(c);vm.runInContext(['histPlanDoc','tripHomePlans','tripHomeDates','tripHomeTiming','tripHomeProgress','tripHomeCloseMenus','tripHomeCard','tripHome'].map(fn).join('\n'),c);
const before=JSON.stringify(state),rows=c.tripHomePlans();
assert.equal(rows.length,7,'trip records and valid individual scheduled plans appear exactly once');
assert.equal(rows.filter(r=>r.plan&&r.plan.d==='2026-10-28').length,2,'two looks on one day stay separate');
assert.equal(rows.filter(r=>r.plan&&r.plan.k==='same').length,2,'outfit-local plan keys do not collapse different outfits');
const view=el('div',{classList:{add(){}}});c.tripHome(view);
assert.equal(all(view).filter(n=>n.tag==='article').length,7);
assert.equal(all(view).filter(n=>(n.class||'').split(' ').includes('trip-plan-next')).length,1,'exactly one next-up plan');
const archive=all(view).find(x=>x.tag==='details'&&x.class==='trip-home-past');assert(archive);assert(!archive.open,'past plans start collapsed');
assert.equal(archive.children[0].text,'Past trips & events (2)');
const pinnedRow={id:'pinned',kind:'trip',name:'Pinned trip',start:'2026-11-01',end:'2026-11-04',doc:{plan:{outfits:[{ids:['dress'],pin:false},{ids:['missing'],pin:true},{ids:['dress'],pin:true,name:'First wearable pinned outfit',fors:'d:2026-11-02'},{ids:['dress'],pin:true,fors:'d:2026-11-02'},{pin:true,fors:'d:2026-12-01'}]}}};
const pinnedTrip=c.tripHomeCard(pinnedRow,c.byIdA(),'2026-10-28');
assert.equal(all(pinnedTrip).find(x=>x.tag==='preview').outfit.name,'First wearable pinned outfit');
assert.equal(c.tripHomeProgress(pinnedRow).text,'1 of 4 days planned','day coverage counts unique dates within trip, not all pins');
const suggested=c.tripHomeCard({...pinnedRow,doc:{plan:{outfits:[{ids:['dress']}]}}},c.byIdA(),'2026-10-28');
assert(all(suggested).some(n=>n.text==='Suggested'),'existing unpinned suggestion is visibly distinguished');
assert(all(suggested).some(n=>n.text==='No outfits planned yet'),'previewing a suggestion does not count it as planned');
assert.equal(c.tripHomeTiming({start:'2026-10-29',end:'2026-10-29'},'2026-10-28'),'Tomorrow');
assert.equal(c.tripHomeTiming({start:'2026-03-09',end:'2026-03-09'},'2026-03-08'),'Tomorrow','relative dates survive daylight-saving boundaries');
assert.equal(c.tripHomeTiming(rows.find(r=>r.id==='ongoing'),'2026-10-28'),'In progress');
const birthday=rows.find(r=>r.name==='Birthday'),card=c.tripHomeCard(birthday,c.byIdA(),'2026-10-28');
const link=all(card).find(n=>n.class==='trip-plan-link'),date=all(card).find(n=>n.class==='trip-plan-date');
link.action();assert.deepEqual(calls.pop(),['calendar','2026-10-28']);date.action();assert.deepEqual(calls.pop(),['calendar','2026-10-28']);
assert.equal(all(card).find(n=>n.tag==='preview').outfit.name,'Velvet dress');
assert.match(c.tripHomeDates(rows.find(r=>r.name==='Last year')),/2025/);
assert.equal(JSON.stringify(state),before,'rendering previews, progress, and links never logs wears or changes data');
async function main(){
 all(card).find(n=>n.text==='Edit details').onclick();const edit=calls.pop();assert.equal(edit[0],'edit');assert.equal(edit[1],'look');assert.equal(edit[4].k,'same','edit targets only the selected schedule');
 await all(card).find(n=>n.text==='🗑️ Delete').onclick();await Promise.resolve();assert(calls.some(x=>x[0]==='remove'&&x[1]==='look'&&x[2]==='same'));
 assert(!calls.some(x=>x[0]==='delete'),'removing an event never deletes its saved outfit');
 const trip=c.tripHomeCard(rows.find(r=>r.id==='ongoing'),{},'2026-10-28');all(trip).find(n=>n.class==='trip-plan-link').action();assert.deepEqual(calls.pop(),['trip','ongoing']);
 all(trip).find(n=>n.text==='Edit details').onclick();assert.equal(state.trip.step,1,'edit opens existing settings');
 all(trip).find(n=>n.text==='🗑️ Delete').onclick();assert(calls.some(x=>x[0]==='delete'&&x[1]==='trips'&&x[2]==='ongoing'));
 state.trips={};state.outfits={};const empty=el('div',{classList:{add(){}}});c.tripHome(empty);assert.match(empty.children[0].text,/No trips or events yet/);
 console.log('Trips overview: date groups, unique assigned days, honest previews, independent calendar/edit/delete actions, and no record mutations.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
