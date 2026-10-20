const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
function fn(name){const start=html.indexOf('function '+name+'(');return html.slice(start,html.indexOf('\n}',start)+2);}
// tripSettings is one line; the others are block functions.
const settings=html.split('\n').find(x=>x.startsWith('function tripSettings('));
let confirm,exits=0;
const ctx={state:{trips:{}},wearAny:()=>false,tripPlanOut:p=>p,askConfirm:(message,label,accept)=>{confirm={message,label,accept}}};
vm.createContext(ctx);vm.runInContext(fn('tripNew')+'\n'+settings+'\n'+fn('tripHasUnsaved')+'\n'+fn('tripLeave'),ctx);
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
