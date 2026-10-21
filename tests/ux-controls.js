const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
function fn(name){let a=s.indexOf('function '+name+'('),b=s.indexOf('\nfunction ',a+1);return s.slice(a,b<0?undefined:b)}
const ctx={state:{tab:'lab',lab:{recent:'repeat'}},wornRecently:(it,days)=>it.recent===true,Math};vm.createContext(ctx);vm.runInContext(fn('labPickWeight'),ctx);
vm.runInContext(fn('newestPieceCompare'),ctx);
assert.deepEqual([{name:'A older',newestOrder:1},{name:'Z newer',newestOrder:0}].sort(ctx.newestPieceCompare).map(x=>x.name),['Z newer','A older'],'public browse order does not fall back to titles');
assert.deepEqual([{name:'A older',date:'2026-10-01'},{name:'Z newer',date:'2026-10-20'}].sort(ctx.newestPieceCompare).map(x=>x.name),['Z newer','A older'],'local acquisition dates still determine newest order');
assert.deepEqual([{name:'Exported',newestOrder:0},{name:'Added here',date:'2026-10-21'}].sort(ctx.newestPieceCompare).map(x=>x.name),['Added here','Exported'],'a piece added on the public site appears first');
assert.equal(ctx.labPickWeight({recent:true}),2);assert.equal(ctx.labPickWeight({recent:false}),1);ctx.state.lab.recent='any';assert.equal(ctx.labPickWeight({recent:true}),1);ctx.state.tab='trip';ctx.state.lab.recent='repeat';assert.equal(ctx.labPickWeight({recent:true}),1,'Lab preference does not change trip generation');
const view={children:[],classList:{remove(){}},appendChild(x){this.children.push(x)}};
Object.assign(ctx,{$:()=>view,el:(tag,attrs,...children)=>({tag,...attrs,children}),tripHome:()=>{},tripNew:()=>({step:1}),tripRender:()=>{ctx.rendered=true}});ctx.state.trip=null;ctx.state.trips={};vm.runInContext(fn('tripRenderInner'),ctx);ctx.tripRenderInner();assert.equal(ctx.state.trip,null,'opening Trips must not create a draft');const button=view.children[0].children.find(x=>x.tag==='button');button.onclick();assert.equal(ctx.state.trip.step,1);assert.equal(ctx.rendered,true,'explicit Plan action starts wizard');
console.log('Recent-wear weighting and Trips landing/explicit start passed.');
{
  const dialog={open:false,children:[],appendChild(x){this.children.push(x)},showModal(){this.open=true},close(){this.open=false}};
  const nodes=[];let calls=[];
  const el=(tag,attrs={},...children)=>{const n={tag,...attrs,children,listeners:{},value:'',appendChild(x){this.children.push(x)},addEventListener(k,fn){this.listeners[k]=fn}};nodes.push(n);return n};
  const c={el,$:()=>dialog,wearsOf:x=>(x.wears||[]).slice(),todayStr:()=> '2026-10-20',toast(){},Promise};
  vm.createContext(c);vm.runInContext(fn('openWearDates'),c);
  c.openWearDates({wears:['2026-10-18']},(dates)=>{calls.push(Array.from(dates));return Promise.resolve(true)});
  const picker=nodes.find(x=>x.tag==='input'&&x.type==='date');assert(picker&&dialog.open);
  picker.value='2026-10-19';picker.listeners.change();picker.listeners.change();
  assert.deepEqual(calls,[['2026-10-18','2026-10-19']],'choosing a past day saves it once without an Add step');
}
