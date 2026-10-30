// Synthetic render/interaction checks for the Include-step crash and responsive disclosure.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),collections=fs.readFileSync(__dirname+'/../app/scripts/collections.js','utf8');
function fn(name){const start=html.indexOf('function '+name+'('),end=html.indexOf('\nfunction ',start+1);assert(start>=0,name);return html.slice(start,end)}
class Node{
 constructor(tag,attrs,...children){this.tag=tag;Object.assign(this,attrs||{});this.children=[];this.events={};this.append(...children)}
 append(...children){this.children.push(...children.flat(Infinity).filter(x=>x!==null&&x!==false&&x!==undefined))}appendChild(x){this.append(x);return x}
 addEventListener(name,f){this.events[name]=f}
}
function find(node,predicate){if(node&&predicate(node))return node;for(const c of node.children||[]){if(typeof c!=='object')continue;const n=find(c,predicate);if(n)return n}}
let rendered=0,picker;
const ctx={el:(...args)=>new Node(...args),state:{outfits:{}},byId:()=>({p:{id:'p',name:'Synthetic tee'}}),wearAny:()=>false,TRIP_BAGS:[['carry','Carry-on']],todayStr:()=> '2026-10-29',tripRefreshSave(){},tripRender:()=>rendered++,tripBuild:(t,pinned)=>({outfits:pinned,synthetic:true}),openCollections:cb=>picker=cb,$:()=>({close(){}}),toast(){}};
vm.createContext(ctx);vm.runInContext(collections+'\n'+['tripCheck','tripCalendarEvents','tripDayChoices','tripDayList','tripSlots','tripEff','tripBringIds','tripWizardSummary','tripWizardFooter','tripBringEditor','tripStep3','tripNav','tripSingle','tripSettings','tripRebuild','tripDays'].map(fn).join('\n'),ctx);
ctx.openCollections=cb=>picker=cb;
ctx.photoThumbnail=x=>x;
for(const extras of [[],['p','missing']]){
 const T={start:'2026-11-01',end:'2026-11-03',packedExtras:[...extras],must:[],mustOutfits:[],need:{},plan:{outfits:[{pin:true,id:'pinned'},{pin:false,id:'unpacked'}]}};
 const view=new Node('main');ctx.tripStep3(view,T);
 assert(find(view,n=>n.tag==='h3'&&n.text==='Bringing for sure'),'Include renders the extras section');
 assert(find(view,n=>n.text==='＋ Collection'),'collection picker remains available with no extras');
 const build=find(view,n=>n.text==='Build my packing list →');assert(build);build.onclick();assert.equal(T.step,4);assert.equal(T.plan.synthetic,true);assert.equal(T.plan.outfits.length,1);assert.equal(T.plan.outfits[0].id,'pinned');assert.equal(Object.keys(T.checked).length,0);
 const add=find(view,n=>n.text==='＋ Collection');add.onclick();picker({ids:['p'],name:'Sample'});assert.equal(T.must.includes('p'),true,'collection copied into unified bring list');
 const section=ctx.tripBringEditor(T),remove=find(section,n=>n['aria-label']==='Remove Synthetic tee');remove.onclick();assert.equal(T.packedExtras.includes('p'),false);assert.equal(T.must.includes('p'),false);
}
{
 const T={packedExtras:[],must:[],mustOutfits:[],need:{},plan:null},view=new Node('main');ctx.tripStep3(view,T);
 find(view,n=>n.text==='Build my packing list →').onclick();assert.equal(T.step,1);assert.equal(T.plan,null,'unfinished dates return to setup without generating a packing list');
}
let change;const tools={open:true},mq={matches:true,addEventListener:(event,fn)=>change=fn};Object.assign(ctx,{$:()=>tools,window:{matchMedia:()=>mq}});vm.runInContext(fn('initBoardTools'),ctx);ctx.initBoardTools();assert.equal(tools.open,false,'secondary tools collapse on mobile');tools.open=true;mq.matches=false;change();assert.equal(tools.open,true,'desktop always exposes all tools');mq.matches=true;change();assert.equal(tools.open,false,'returning to mobile restores compact disclosure');
console.log('Cleanup flow: Include renders with empty/missing extras, collection copying/removal, pinned-plan transition, and responsive board tools pass.');
