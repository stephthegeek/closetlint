const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
function fn(name){let a=s.indexOf('function '+name+'('),b=s.indexOf('\nfunction ',a+1);return s.slice(a,b<0?undefined:b)}
const ctx={state:{tab:'lab',lab:{recent:'repeat'}},wornRecently:(it,days)=>it.recent===true,Math};vm.createContext(ctx);vm.runInContext(fn('labPickWeight'),ctx);
assert.equal(ctx.labPickWeight({recent:true}),2);assert.equal(ctx.labPickWeight({recent:false}),1);ctx.state.lab.recent='any';assert.equal(ctx.labPickWeight({recent:true}),1);ctx.state.tab='trip';ctx.state.lab.recent='repeat';assert.equal(ctx.labPickWeight({recent:true}),1,'Lab preference does not change trip generation');
const view={children:[],classList:{remove(){}},appendChild(x){this.children.push(x)}};
Object.assign(ctx,{$:()=>view,el:(tag,attrs,...children)=>({tag,...attrs,children}),tripHome:()=>{},tripNew:()=>({step:1}),tripRender:()=>{ctx.rendered=true}});ctx.state.trip=null;ctx.state.trips={};vm.runInContext(fn('tripRenderInner'),ctx);ctx.tripRenderInner();assert.equal(ctx.state.trip,null,'opening Trips must not create a draft');const button=view.children[0].children.find(x=>x.tag==='button');button.onclick();assert.equal(ctx.state.trip.step,1);assert.equal(ctx.rendered,true,'explicit Plan action starts wizard');
console.log('Recent-wear weighting and Trips landing/explicit start passed.');
