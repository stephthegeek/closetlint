// Synthetic dates and records: acquisition precision and durable outfit history.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),setup=fs.readFileSync(__dirname+'/../app/scripts/setup.js','utf8');
function fn(name,src=html){const a=src.indexOf('function '+name+'('),b=src.indexOf('\nfunction ',a+1);assert(a>=0);return src.slice(a,b<0?undefined:b)}
const clone=x=>JSON.parse(JSON.stringify(x));
function node(tag,attrs,...children){return {tag,...attrs,children,listeners:{},appendChild(n){this.children.push(n)},addEventListener(t,f){this.listeners[t]=f}}}
const c={Date,Promise,JSON,Object,el:node,state:{edits:{},outfits:{},outfitHistory:{}},needDb:()=>false,toast(){}};
vm.createContext(c);vm.runInContext(['setupValidDate','acquisitionPatch','acquisitionForm'].map(n=>fn(n,setup)).join('\n'),c);
for(const [date,full] of [['2020','2020-01-01'],['2020-02','2020-02-01'],['2020-02-29','2020-02-29']]){const p=c.acquisitionPatch(date,true,'user');assert.equal(p.acquiredDate,date);assert.equal(p.date,full);assert.equal(p.acquiredApproximate,true)}
for(const date of ['0000','2020-13','2021-02-29','2020-02-31','20','2020-1','2020-05-01T00:00:00Z'])assert.throws(()=>c.acquisitionPatch(date,false,'user'));
assert.equal(c.acquisitionPatch('',true,'user').acquisitionSource,'unknown');assert.equal(c.acquisitionPatch('',true,'user').date,undefined);
const legacy=c.acquisitionForm({id:'legacy',date:'2020-01-01'});assert.deepEqual(clone(legacy.read()),{},'unrelated edits never certify or replace legacy dates');
const controls=legacy.node.children,choice=controls[0].children[1],input=controls[1],approx=controls[2].children[0];
choice.value='year';input.value='2020-01-01';choice.listeners.change();assert.equal(input.value,'2020');approx.checked=true;approx.listeners.change();assert.deepEqual(clone(legacy.read()),{acquiredDate:'2020',acquiredApproximate:true,acquisitionSource:'user',date:'2020-01-01'});
choice.value='unknown';choice.listeners.change();assert.equal(legacy.read().acquiredDate,'');
vm.runInContext(['deleteSavedDocument','histWorn','histPieces','wearPieceChange','commitWearAction','unwearOutfit'].map(n=>fn(n)).join('\n'),c);
(async()=>{
 let fail='',undo;const messages=[];c.toast=m=>messages.push(m);c.toastAct=(m,l,f)=>undo=f;
 const piece={id:'p',wears:['2020-01-01']};c.byIdA=()=>({p:piece});c.allItems=()=>[{id:'hidden',hidden:true,wears:['2020-01-01']}];c.archItems=()=>[{id:'deleted',removed:true,wears:['2020-01-01']}];
 c.patchEdit=async(it,p)=>{if(fail==='piece')return false;Object.assign(it,p);return true};
 c.state.db={collection:col=>({doc:id=>({set:async record=>{if(fail===col)throw Error('disk full');c.state[col][id]=clone(record)},delete:async()=>{if(fail==='delete')throw Error('disk full');delete c.state[col][id]}})})};
 c.state.db.commitWear=async changes=>{if(changes.some(r=>(fail==='piece'&&r.collection==='edits')||fail===r.collection))throw Error('disk full');changes.forEach(r=>{c.state[r.collection][r.id]=clone(r.value);if(r.collection==='edits')piece.wears=clone(r.value.wears)})};
 c.state.outfits.one={name:'Old outfit',pieces:[{id:'later-edit'}],wearLog:[{d:'2020-01-01',ids:['p'],added:['p'],pieces:[{id:'p'}]}]};
 const original=clone(c.state.outfits.one);fail='outfitHistory';assert.equal(await c.deleteSavedDocument('outfits','one',original,()=>{}),false);assert.deepEqual(clone(c.state.outfits.one),original,'archive failure prevents deletion');
 fail='delete';assert.equal(await c.deleteSavedDocument('outfits','one',original,()=>{}),false);assert.equal(c.histWorn()['2020-01-01'].length,1,'archive plus live outfit never doubles counts');
 fail='';assert.equal(await c.deleteSavedDocument('outfits','one',original,()=>{}),true);let row=c.histWorn()['2020-01-01'][0];assert.equal(row.archived,true);assert.equal(row.pieces[0].id,'p','actual logged membership survives later edits');assert.deepEqual(piece.wears,['2020-01-01']);
 const restore=undo;await restore();assert.equal(c.histWorn()['2020-01-01'].length,1);assert.equal(c.histWorn()['2020-01-01'][0].archived,false);
 await c.deleteSavedDocument('outfits','one',original,()=>{});fail='piece';assert.equal(await c.unwearOutfit('one','2020-01-01'),false);assert.equal(c.state.outfitHistory.one.wearLog.length,1);
 fail='outfitHistory';assert.equal(await c.unwearOutfit('one','2020-01-01'),false);assert.equal(c.state.outfitHistory.one.wearLog.length,1);fail='';assert.equal(await c.unwearOutfit('one','2020-01-01'),true);assert.equal(c.state.outfitHistory.one.wearLog.length,0);assert.deepEqual(piece.wears,[]);
 c.state.outfitHistory.legacy={pieces:[{id:'wrong'}],wearLog:[{d:'2020-02-01',ids:['p']}]};assert.equal(c.histWorn()['2020-02-01'][0].pieces[0].id,'p','legacy membership uses logged IDs, not later outfit edits');
 const history=c.histPieces()['2020-01-01'];assert.deepEqual(Array.from(history,p=>p.id),['hidden','deleted'],'hiding and deleting pieces do not erase past dates');
 console.log('Data history: exact/month/year/approximate/unknown acquisition dates, untouched legacy dates, archived outfit grouping, failed deletion/removal, retries, Undo, and retained piece history pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
