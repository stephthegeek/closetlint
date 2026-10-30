'use strict';
// Synthetic packing snapshots, output escaping, print cleanup, and clipboard recovery.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const match=new RegExp('^(?:async )?function '+name+'\\(','m').exec(html);assert(match,name);const a=match.index,rest=html.slice(a+1),next=/\n(?:async )?function /.exec(rest);return html.slice(a,next?a+1+next.index:undefined)}
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);Object.values(x).forEach(freeze)}return x}
const top={id:'top',name:'Old name'},bottom={id:'bottom',name:'Skirt'},coat={id:'coat',name:'Coat'},shoe={id:'shoe',name:'Boots'},sock={id:'sock',name:'Socks'},sock2={id:'sock2',name:'Other socks'};
const o={name:'First outfit',top,bottom,layer:coat,acc:{shoes:shoe},fors:'d:2026-11-01'},o2={name:'Second outfit',top,bottom,acc:{shoes:shoe}};
const T={name:'Synthetic weekend',dest:'Review town',start:'2026-11-01',end:'2026-11-03',checked:{top:1,tvcoat:1,'b:socks':1,a0:1},packedExtras:['sock','coat','wish','missing'],secret:'never export this'};
const P={outfits:[o,o2,{name:'Unselected outfit',top:{id:'excluded',name:'Do not pack'}}],other:[coat],also:['Umbrella']};
const V={S:[o,o2],outer:[coat],travel:['coat','shoe'],shoes:[{it:shoe}],basics:{socks:{label:'Socks',n:3,items:[sock,sock2]},bras:{label:'Bras',n:1,items:[]}}};
const map={top:{...top,name:'Fresh tee <script>',laundry:true},bottom,coat:{...coat,stored:true},shoe,sock:{...sock,laundry:true},sock2:{...sock2,stored:true},wish:{id:'wish',name:'Wishlist belt',wish:true,stored:true}};
freeze(T);freeze(P);freeze(V);freeze(map);
const c={state:{outfits:{}},byId:()=>map,laundryEnabled:()=>true,needsLaundry:p=>!!p.laundry,tripForLabel:()=> 'Nov 1'};
vm.createContext(c);vm.runInContext(['tripBringIds','labParts','tripBasicCount','tripPackingCategory','tripExportData','tripExportText','tripExportMarkdown','tripExportFilename','tripPrint','tripExportUI'].map(fn).join('\n'),c);
const data=c.tripExportData(T,P,V,false),rows=data.groups.flatMap(g=>g.rows),tee=rows.find(r=>r.name.startsWith('Fresh tee'));
assert.equal(tee.checked,true);assert.equal(tee.note,'Needs cleaning','status uses the current piece, not its saved outfit snapshot');
assert.equal(rows.filter(r=>r.name==='Coat').length,1,'travel layers and extras do not duplicate the same piece');
const pull=data.groups.find(g=>g.name==='Pull list');assert(pull.rows.find(r=>r.name==='Coat').checked);assert.equal(pull.rows.find(r=>r.name==='Coat').note,'In storage');assert(data.groups.find(g=>g.name==='To buy').rows.some(r=>r.name==='Wishlist belt'));
assert.equal(rows.filter(r=>r.name.startsWith('Fresh tee')).length,1,'outfit reuse is not a packing quantity');
const socks=rows.find(r=>r.name==='3 pairs of socks');assert(socks.checked);assert.match(socks.note,/needs cleaning/);assert.match(socks.note,/in storage/);assert.match(socks.note,/1 not found/);
assert.equal(rows.find(r=>r.name==='Wishlist belt').note,'Wishlist');assert.equal(data.outfits.length,0);
assert(!JSON.stringify(data).includes('Do not pack'));assert(!JSON.stringify(data).includes(T.secret));
const withOutfits=c.tripExportData(T,P,V,true);assert.equal(withOutfits.outfits.length,2,'appendix includes the selected outfits only');assert.equal(withOutfits.outfits[0].pieces.length,4);
const md=c.tripExportMarkdown(withOutfits);assert.match(md,/- \[x\] Fresh tee \\<script\\> — Needs cleaning/);assert.match(md,/## Outfit combinations/);assert(!c.tripExportMarkdown(data).includes('## Outfit combinations'));
assert.equal(c.tripExportData(T,P,{...V,basics:{socks:{label:'Socks',n:1,items:[top]}}},false).groups.some(g=>g.name==='Basics'),false,'a basic already in an outfit is not listed twice');
c.laundryEnabled=()=>false;assert(!JSON.stringify(c.tripExportData(T,P,V,false)).includes('cleaning'),'disabled laundry tracking stays absent');c.laundryEnabled=()=>true;
const escaped=c.tripExportMarkdown({...data,name:'# Heading\n<img src=x>',groups:[{name:'[group]',rows:[{name:'[link](url) *bold*\n# extra',note:'',checked:false}]}]});
assert(escaped.startsWith('# \\# Heading \\<img src=x\\>'));assert(!escaped.includes('\n# extra'));assert.match(escaped,/\\\[link\\\]/);
assert(!/[\\/:*?"<>|\x00-\x1f]/.test(c.tripExportFilename({name:'Bad / \\ : * ? " < > |\nname'})));

class Node{
 constructor(tag,attrs,...children){this.tag=tag;Object.assign(this,attrs||{});this.children=children.flat().filter(x=>x!==null&&x!==undefined);this.classList={values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)},contains(x){return this.values.has(x)}}}
 appendChild(n){n.parent=this;this.children.push(n);return n}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this)}click(){if(this.onclick)return this.onclick();if(this.tag==='a')downloads.push(this)}
}
function find(n,p){if(n&&typeof n==='object'){if(p(n))return n;for(const x of n.children||[]){const r=find(x,p);if(r)return r}}}
const body=new Node('body'),events={},notices=[],downloads=[],blobs=[],revoked=[],timers=[];
let prints=0,copyOK=true;
Object.assign(c,{el:(...args)=>new Node(...args),document:{body},$:id=>find(body,n=>n.id===id),window:{addEventListener:(k,f)=>events[k]=f,removeEventListener:k=>delete events[k],print(){prints++}},toast:s=>notices.push(s),copyClipboard:async()=>{if(!copyOK)throw Error('denied');return true},tripView:()=>V,Blob,URL:{createObjectURL:b=>{blobs.push(b);return 'blob:'+blobs.length},revokeObjectURL:u=>revoked.push(u)},setTimeout:f=>timers.push(f)});
(async()=>{
 assert.equal(await c.tripPrint(withOutfits),true);assert.equal(prints,1);assert(body.classList.contains('printing-trip'));assert(find(body,n=>n.id==='trip-print-sheet'));events.afterprint();assert(!find(body,n=>n.id==='trip-print-sheet'));assert(!body.classList.contains('printing-trip'));
 c.window.print=()=>{throw Error('unavailable')};assert.equal(await c.tripPrint(data),false);assert.equal(body.children.length,0,'failed printing removes its sheet and restores the app');
 delete c.window.print;assert.equal(await c.tripPrint(data),false);assert.equal(body.children.length,0);
 const ui=c.tripExportUI({...T,plan:P}),copy=find(ui,n=>n.text==='Copy Markdown text'),status=find(ui,n=>n.role==='status'),download=find(ui,n=>n.text==='Download Markdown text');
 await copy.onclick();assert.equal(status.textContent,'Copied.');assert.equal(copy.disabled,false);copyOK=false;await copy.onclick();assert.match(status.textContent,/Download Markdown/);assert.equal(copy.disabled,false,'clipboard failure leaves a usable retry');
 find(ui,n=>n.type==='checkbox').checked=true;download.onclick();assert.equal(downloads.length,1);assert.equal(downloads[0].download,'packing-Synthetic-weekend.md');assert((await blobs[0].text()).includes('## Outfit combinations'));
 timers.forEach(f=>f());assert.deepEqual(revoked,['blob:1']);
 console.log('Trip exports: selected outfits, unique pieces, quantities, current laundry/storage/wishlist reminders, packed state, optional appendix, escaped text, print cancel/failure cleanup, and Markdown copy/download recovery pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
