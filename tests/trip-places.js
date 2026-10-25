// City lookup works without an assistant, and stale/offline results stay harmless.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const a=html.indexOf('function '+name+'(');return html.slice(a,html.indexOf('\n}',a)+2)}
class Node{
 constructor(){this.children=[];this.isConnected=true;this.classList={toggle(){},remove(){}}}
 set textContent(s){this.children=[];this.text=s}get childNodes(){return this.children}
 appendChild(n){this.children.push(n);n.parent=this;return n}remove(){this.parent.children=this.parent.children.filter(n=>n!==this)}
}
let resolve,requested,rendered=0;
const ctx={window:{ClosetLintLocal:{token:'synthetic-token'}},AbortController,setTimeout,clearTimeout,encodeURIComponent,state:{trips:{}},_plSeq:0,el:(tag,attrs)=>Object.assign(new Node(),attrs),tripRender:()=>rendered++,fetch:async(url,options)=>{requested={url,options};return {ok:true,json:async()=>({places:[{label:'Victoria, British Columbia, Canada'}]})}}};
vm.createContext(ctx);vm.runInContext(fn('tripLookupPlaces')+'\n'+fn('tripPlaces'),ctx);
(async()=>{
 const data=await ctx.tripLookupPlaces('Victoria, BC');assert.equal(data.places.length,1);assert.match(requested.url,/^\/api\/places\?name=Victoria%2C%20BC$/);assert.equal(requested.options.headers['X-ClosetLint-Token'],'synthetic-token');
 const box=new Node(),trip={};ctx.tripPlaces('Victoria',box,trip);await new Promise(setImmediate);const match=box.children.find(n=>n.class==='plrow');assert(match);match.onclick();assert.equal(trip.dest,'Victoria, British Columbia, Canada');assert.equal(rendered,1);
 ctx.tripLookupPlaces=()=>Promise.reject(Error('offline'));const offline=new Node();ctx.tripPlaces('Anywhere',offline,trip);await new Promise(setImmediate);assert(offline.children.some(n=>n.text?.includes('unavailable')));offline.children.find(n=>n.class==='plrow').onclick();assert.equal(trip.dest,'Anywhere');
 ctx.tripLookupPlaces=()=>new Promise(r=>resolve=r);const old=new Node();ctx.tripPlaces('Old city',old,trip);ctx._plSeq++;resolve({places:[{label:'Stale city'}]});await new Promise(setImmediate);assert(!old.children.some(n=>n.class==='plrow'),'late responses cannot replace newer input');
 console.log('Trips: real city lookup, local token boundary, manual offline recovery, and stale-response protection pass.');
})().catch(e=>{console.error(e);process.exit(1)});
