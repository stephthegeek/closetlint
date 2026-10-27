const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
function fn(name){const start=html.indexOf('function '+name+'(');return html.slice(start,html.indexOf('\n}',start)+2);}
// tripSettings is one line; the others are block functions.
const settings=html.split('\n').find(x=>x.startsWith('function tripSettings('));
let confirm,exits=0;
const ctx={state:{trips:{}},toast(){},wearAny:()=>false,tripPlanOut:p=>p,askConfirm:(message,label,accept)=>{confirm={message,label,accept}}};
vm.createContext(ctx);vm.runInContext(fn('tripNew')+'\n'+settings+'\n'+fn('tripHasUnsaved')+'\n'+fn('tripCancelPending')+'\n'+fn('tripLeave'),ctx);
const fresh=()=>ctx.tripNew();
assert.equal(ctx.tripHasUnsaved(fresh()),false);
ctx.state.trip=fresh();ctx.state.trip.name='Weekend';
ctx.tripLeave(()=>exits++);assert.equal(exits,0);assert.equal(ctx.state.trip.name,'Weekend','stay keeps draft');
confirm.accept();assert.equal(exits,1);assert.equal(ctx.state.trip,null);
for(const change of [t=>t.dest='Paris',t=>t.bag='pack',t=>t.need.dressy=1,t=>t.must.push('piece'),t=>t.plan={}]){
 const t=fresh();change(t);assert.equal(ctx.tripHasUnsaved(t),true);
}
const saved=fresh();saved.id='saved';saved.name='A saved trip';saved.plan={};
ctx.state.trips.saved={name:saved.name,settings:ctx.tripSettings(saved),plan:{}};
assert.equal(ctx.tripHasUnsaved(saved),false);
saved.plan={changed:true};assert.equal(ctx.tripHasUnsaved(saved),true,'unsaved reshuffle warns');saved.plan={};
saved.dest='Changed';assert.equal(ctx.tripHasUnsaved(saved),true);
ctx.state.trip=saved;ctx.tripLeave(()=>exits++);confirm.accept();
assert.equal(ctx.state.trips.saved.name,'A saved trip','discard never deletes stored trip');
ctx.state.trip=fresh();ctx.tripLeave(()=>exits++);assert.equal(ctx.state.trip,null,'untouched draft exits without warning');
assert.ok(html.includes("if(state.tab==='trip'&&t!=='trip'&&state.trip){tripLeave("));
console.log('Trip navigation: unchanged exits, edited drafts warn, stay preserves draft, discard preserves saved trips.');

const scrolls=[];ctx.window={scrollTo:p=>scrolls.push(p)};ctx.memoRun=()=>{};ctx.tripRenderInner=()=>{};ctx.tripRenderedDraft=null;ctx.tripRenderedStep=null;vm.runInContext(fn('tripRender'),ctx);
ctx.state.trip=fresh();ctx.state.trip.step=1;ctx.tripRender();assert.equal(scrolls.length,1);ctx.tripRender();assert.equal(scrolls.length,1,'same-step edits preserve scroll');ctx.state.trip.step=2;ctx.tripRender();assert.equal(scrolls.length,2);assert.equal(scrolls[1].top,0,'step navigation starts at page top');ctx.state.trip=null;ctx.tripRender();assert.equal(scrolls.length,3,'back to trip list starts at top');

{
 const nodes=[];let opened=null,deleted=null;
 const c={state:{trips:{one:{name:'Weekend',settings:{start:'2026-11-01',transport:'train',bag:'carry'}}}},todayStr:()=> '2026-10-25',TRIP_BAGS:[['carry','Carry-on']],tripOpen:id=>opened=id,askConfirm:(m,l,go)=>go(),deleteSavedDocument:(kind,id)=>deleted=id,tripRender(){},el:(tag,attrs,...children)=>{const n={tag,...attrs,children,appendChild(x){this.children.push(x)}};nodes.push(n);return n},routeAnchor:(route,attrs,action,child)=>({tag:'a',route,...attrs,action,children:[child]})};
 vm.createContext(c);vm.runInContext(fn('tripHome'),c);c.tripHome(c.el('div',{}));
 const card=nodes.find(n=>n.class==='tripcard trip-plan-card'),link=card.children.find(n=>n.tag==='a');assert.equal(link.route.id,'one');link.action();assert.equal(opened,'one');opened=null;card.children.find(n=>n.text==='Delete').onclick();assert.equal(deleted,'one');assert.equal(opened,null);
 console.log('Trips: full-card link and independent delete action pass.');
}
