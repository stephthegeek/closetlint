const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
function fn(name){let a=s.indexOf('function '+name+'('),b=s.indexOf('\nfunction ',a+1);return s.slice(a,b<0?undefined:b)}
const ctx={state:{tab:'lab',lab:{recent:'repeat'}},wornRecently:(it,days)=>it.recent===true,Math};vm.createContext(ctx);vm.runInContext(fn('labComfortPiece'),ctx);vm.runInContext(fn('labPickWeight'),ctx);
vm.runInContext(fn('newestPieceCompare'),ctx);
assert.deepEqual([{name:'A older',newestOrder:1},{name:'Z newer',newestOrder:0}].sort(ctx.newestPieceCompare).map(x=>x.name),['Z newer','A older'],'public browse order does not fall back to titles');
assert.deepEqual([{name:'A older',date:'2026-10-01'},{name:'Z newer',date:'2026-10-20'}].sort(ctx.newestPieceCompare).map(x=>x.name),['Z newer','A older'],'local acquisition dates still determine newest order');
assert.deepEqual([{name:'Exported',newestOrder:0},{name:'Added here',date:'2026-10-21'}].sort(ctx.newestPieceCompare).map(x=>x.name),['Added here','Exported'],'a piece added on the public site appears first');
assert.equal(ctx.labPickWeight({recent:true}),2);assert.equal(ctx.labPickWeight({recent:false}),1);ctx.state.lab.recent='any';assert.equal(ctx.labPickWeight({recent:true}),1);ctx.state.tab='trip';ctx.state.lab.recent='repeat';assert.equal(ctx.labPickWeight({recent:true}),1,'Lab preference does not change trip generation');
const view={children:[],classList:{remove(){}},appendChild(x){this.children.push(x)}};
Object.assign(ctx,{$:()=>view,el:(tag,attrs,...children)=>({tag,...attrs,children}),routeAnchor:()=>({tag:'a'}),todayStr:()=> '2026-10-28',tripHome:()=>{},tripNew:()=>({step:1}),tripRender:()=>{ctx.rendered=true}});ctx.state.trip=null;ctx.state.trips={};vm.runInContext(fn('tripRenderInner'),ctx);ctx.tripRenderInner();assert.equal(ctx.state.trip,null,'opening Trips must not create a draft');const descendants=n=>[n,...(n.children||[]).flat(Infinity).filter(x=>x&&typeof x==='object').flatMap(descendants)];const landing=descendants(view);const button=landing.find(x=>x.tag==='button'&&x.text==='＋ Add trip');assert(button,'the landing page offers an explicit Add trip action');button.onclick();assert.equal(ctx.state.trip.step,1);assert.equal(ctx.rendered,true,'explicit Plan action starts wizard');
console.log('Recent-wear weighting and Trips landing/explicit start passed.');
{
  const dialog={open:false,children:[],appendChild(x){this.children.push(x)},showModal(){this.open=true},close(){this.open=false}};
  const nodes=[];let calls=[];
  const el=(tag,attrs={},...children)=>{const n={tag,...attrs,children,listeners:{},value:'',appendChild(x){this.children.push(x)},addEventListener(k,fn){this.listeners[k]=fn}};nodes.push(n);return n};
  const c={el,$:()=>dialog,wearsOf:x=>(x.wears||[]).slice(),todayStr:()=> '2026-10-20',state:{},Date,toast(){},Promise};
  vm.createContext(c);vm.runInContext(['wearDayNumber','pieceWearOutfitLinked','openWearDates'].map(fn).join('\n'),c);
  c.openWearDates({wears:['2026-10-18']},(dates)=>{calls.push(Array.from(dates));return Promise.resolve(true)});
  const picker=nodes.find(x=>x.tag==='input'&&x.type==='date');assert(picker&&dialog.open);
  picker.value='2026-10-19';picker.listeners.change();picker.listeners.change();
  assert.deepEqual(calls,[['2026-10-18','2026-10-19']],'choosing a past day saves it once without an Add step');
}

(async()=>{
 class Node{
  constructor(tag,attrs,...children){this.tag=tag;this.value='';this.checked=false;Object.assign(this,attrs||{});this.children=[];this.events={};const classes=new Set();this.classList={add(...names){names.forEach(n=>classes.add(n))},remove(...names){names.forEach(n=>classes.delete(n))},contains(name){return classes.has(name)},toggle(name,force){const on=force===undefined?!classes.has(name):!!force;if(on)classes.add(name);else classes.delete(name);return on}};this.append(...children)}
  set textContent(v){this.text=v;this.children=[]}get textContent(){return this.text||''}
  append(...children){children.flat(Infinity).filter(x=>x!=null).forEach(x=>this.appendChild(x))}appendChild(child){this.children.push(child);return child}
  setAttribute(k,v){this[k]=v}addEventListener(k,fn){this.events[k]=fn}showModal(){this.open=true}
 }
 const find=(node,p)=>p(node)?node:(node.children||[]).filter(x=>typeof x==='object').map(x=>find(x,p)).find(Boolean);
 const nodes={},el=(...args)=>new Node(...args),items={a:{id:'a',name:'A',meta:'Tops',size:'M'},b:{id:'b',name:'B',meta:'Tops',size:'M'}},messages=[];let fail=false,closed=0;
 const c={Set,Promise,state:{tab:'all',selectMode:true,picked:{a:true,b:true,missing:true},edits:{},db:{collection:()=>({doc:id=>({set:async patch=>{if(fail&&id==='b')throw Error('Synthetic failure');Object.assign(items[id],patch)}})})}},
  $:id=>nodes[id]||(nodes[id]=el('div')),el,keys:o=>Object.keys(o).filter(k=>o[k]),byId:()=>items,filtered:()=>[items.a],collectionList:()=>[],isClosetTab:t=>t==='all',needDb:()=>false,flashIds(){},toast:msg=>messages.push(msg),renderGrid(){},closeDlg(){closed++},addClose(){},
  categoryMetas:()=>['Tops'],categorySubs:()=>[],metaLabel:m=>m,META:['Tops'],SUBS:{Tops:[]},SECTIONS:[],KINDS:[],DIMS:[],STRETCH:[],SECTION:{Tops:'clothing'},kindVocab:()=>[]};
 vm.createContext(c);vm.runInContext(['pieceShoeDetailAliases','normalizePieceFields','pieceFieldPatch','pieceChoiceDimension','bulkPieceTagKey','renderSelBar','applyBulk','openBulk'].map(fn).join('\n'),c);
 c.renderSelBar();assert.equal(find(nodes.selbar,n=>n.class==='selcount').text,'2 selected (1 not shown)');assert.equal(c.state.picked.missing,undefined,'only no-longer-available selections are pruned');
 const wear=find(nodes.selbar,n=>n.tag==='button'&&/Wear more/.test(n.text||''));await wear.onclick();
 assert.deepEqual(Object.keys(c.state.picked),['a','b'],'bulk actions preserve selection across filters');assert.equal(items.a.wearMore,true);assert.equal(items.b.wearMore,true);
 // Form interaction is exercised in piece-forms-browser.js; keep storage retry checks here.
 fail=true;const first=await c.applyBulk(['a','b'],()=>({size:'L'}),'Updated pieces');
 assert.equal(first.failed,1);assert.equal(items.a.size,'L');assert.equal(items.b.size,'M');assert.deepEqual(Object.keys(c.state.picked),['b'],'failed pieces stay selected for retry');
 fail=false;const retry=await c.applyBulk(c.state.bulkRetry.ids,c.state.bulkRetry.patchFn,c.state.bulkRetry.message);assert.equal(retry.failed,0);assert.equal(items.b.size,'L');assert.deepEqual(Object.keys(c.state.picked),['b'],'retry retains the failed selection for another edit');
 c.renderSelBar();find(nodes.selbar,n=>n.tag==='button'&&n['aria-label']==='Deselect all').onclick();assert.equal(Object.keys(c.state.picked).length,0);assert.equal(c.state.selectMode,true);
 c.state.picked={a:true};c.renderSelBar();find(nodes.selbar,n=>n.tag==='button'&&n['aria-label']==='Done selecting').onclick();assert.equal(c.state.selectMode,false);assert.equal(Object.keys(c.state.picked).length,0);
 const selection={'slight stretch':true};c.cap=x=>x;c.chip=(label,on,onclick)=>el('button',{text:label,'aria-pressed':String(on),onclick});vm.runInContext(fn('selectedPieceTagLabel')+'\n'+fn('tagField'),c);
 const stretch=c.tagField({key:'stretch',label:'Stretch',vocab:['non-stretch','slight stretch','high stretch']},selection);assert.equal(stretch.tag,'details');
 find(stretch,n=>n.tag==='button'&&n.text==='high stretch').onclick();assert.equal(selection['slight stretch'],undefined);assert.equal(selection['high stretch'],true);assert.equal(find(stretch,n=>n.tag==='button'&&n.text==='slight stretch')['aria-pressed'],'false');
 find(stretch,n=>n.tag==='button'&&n.text==='high stretch').onclick();assert.equal(Object.keys(selection).filter(k=>selection[k]).length,0,'clicking the chosen Stretch chip clears it');
 // Metal appearance stays separate from the universal color palette and preserves saved material tags.
 const vocabulary={};vm.createContext(vocabulary);vm.runInContext(s.slice(s.indexOf('var META='),s.indexOf('var DEFAULT_W=')),vocabulary);
 const metalDim=vocabulary.DIMS.find(d=>d.key==='jmetal'),metalSelection={'sterling silver':true,'legacy metal':true};
 assert.equal(metalDim.label,'Metal & finish');assert.deepEqual(Array.from(metalDim.scope),['Jewelry','Watches','Bags']);
 for(const tone of ['rose gold','bronze','copper','gunmetal'])assert(!Object.hasOwn(vocabulary.COLORS,tone),'metal tones must not expand every piece’s color palette');
 const metalField=c.tagField(metalDim,metalSelection);
 for(const label of ['Material','Metal tone','Finish','Other saved tags'])assert(find(metalField,n=>n.role==='group'&&n['aria-label']===label));
 for(const value of ['rose gold','antiqued'])find(metalField,n=>n.tag==='button'&&n.text===value).onclick();
 assert.equal(metalSelection['sterling silver'],true);assert.equal(metalSelection['legacy metal'],true);assert.equal(metalSelection['rose gold'],true);assert.equal(metalSelection.antiqued,true);assert.equal(metalSelection.gold,undefined,'no duplicate Gold selection is required');
 find(metalField,n=>n.tag==='button'&&n.text==='rose gold').onclick();assert.equal(metalSelection['rose gold'],false);assert.equal(metalSelection.antiqued,true);
 console.log('Metal & finish: scoped groups, optional independent choices, legacy tags, and unchanged universal colors pass.');
 // Weight stays optional; opening the editor must not turn an inferred weight into a saved fact.
 const weightSetup=s.slice(s.indexOf('  var weightStore='),s.indexOf('  var shoeSockSel='));
 c.it={name:'Chunky knit sweater'};c.itemWeight=()=>{throw Error('Do not preselect an inferred weight')};vm.runInContext(weightSetup,c);
 assert.equal(Object.keys(c.weightStore).filter(k=>c.weightStore[k]).length,0);
 assert.equal(find(c.knitNode,n=>n.class==='tf-none').text,'Not set');
 const chooseWeight=label=>find(c.knitNode,n=>n.tag==='button'&&n.text===label).onclick();
 chooseWeight('thin / lightweight');chooseWeight('thick / heavy');assert.deepEqual(Object.keys(c.weightStore).filter(k=>c.weightStore[k]),['thick']);
 assert.equal(find(c.knitNode,n=>n.class==='tf-chip').text,'thick / heavy');
 chooseWeight('thick / heavy');assert.equal(Object.keys(c.weightStore).filter(k=>c.weightStore[k]).length,0,'the selected weight can be cleared');
 for(const [record,expected] of [[{weight:'regular'},'regular'],[{knitWeight:'chunky'},'thick'],[{sockWeight:'sheer'},'thin']]){
  c.it=record;vm.runInContext(weightSetup,c);assert.deepEqual(Object.keys(c.weightStore).filter(k=>c.weightStore[k]),[expected],'explicit and legacy weights remain selected');
 }
 console.log('Fabric weight: optional collapsed single choice, clearable selection, readable labels, and preserved legacy values pass.');
 const timers=[],toastNode=el('div');Object.assign(c,{$:()=>toastNode,toastTimer:null,setTimeout:(fn,ms)=>{timers.push(ms);return timers.length},clearTimeout(){}});vm.runInContext(fn('toast')+'\n'+fn('toastAct'),c);
 c.toast('Saved');assert.equal(timers.at(-1),2200);c.toast('Could not save this outfit');assert.equal(timers.at(-1),6000);c.toastAct('Hidden','Undo',()=>{});assert.equal(timers.at(-1),8000);c.toastAct('Saved','Plan it for a day',()=>{},5000);assert.equal(timers.at(-1),5000);
 console.log('Tweaks: retained bulk selection, offscreen counts, retries, explicit deselection, single Stretch chips, and readable toast timing pass.');
})().catch(e=>{console.error(e);process.exit(1)});

// Random order survives redraws, filtering, and incremental additions.
{
 const c={state:{randomSeed:1234,sort:'random',q:'',metas:{},subs:{},sizes:{},source:{},where:{},colors:{},collectionFilter:{},heelB:{}},collectionList:()=>[],collectionMatches:()=>true,setHas:s=>Object.values(s||{}).some(Boolean),DIMS:[],searchHay:x=>x.name.toLowerCase(),uwLast:a=>a};
 const items=Array.from({length:80},(_,i)=>({id:'piece-'+i,name:i%2?'Blue':'Red'}));c.sectionItems=()=>items;
 vm.createContext(c);vm.runInContext(fn('shuffleCloset')+'\n'+fn('randomPieceRank')+'\n'+fn('filtered'),c);
 const ids=()=>Array.from(c.filtered(),p=>p.id),first=ids();assert.deepEqual(ids(),first);assert.notDeepEqual(first,items.map(p=>p.id));
 c.state.q='Blue';assert.deepEqual(ids(),first.filter(id=>Number(id.split('-')[1])%2));c.state.q='';items.push({id:'new-piece',name:'New'});assert.deepEqual(ids().filter(id=>id!=='new-piece'),first);
 c.state.randomSeed=5678;assert.notDeepEqual(ids().filter(id=>id!=='new-piece'),first);assert.equal(new Set(ids()).size,items.length);
 console.log('Random sort: stable redraws, filtered subsets, added pieces, and reshuffling pass.');
}

// Empty sizes, explicit non-sized pieces, and one-size pieces are distinct filters.
{
 const c={state:{sort:'name',q:'',metas:{},subs:{},sizes:{},source:{},where:{},colors:{},collectionFilter:{},heelB:{}},collectionList:()=>[],collectionMatches:()=>true,setHas:x=>Object.values(x||{}).some(Boolean),DIMS:[],searchHay:x=>x.name.toLowerCase(),uwLast:x=>x};
 const items=[
  {id:'missing',name:'A tee',meta:'Tops',sizeKind:'clothing',size:''},
  {id:'gauge',name:'B earring',meta:'Jewelry',sub:'Earrings',sizeKind:'gauge',size:''},
  {id:'ring',name:'C ring',meta:'Jewelry',sub:'Rings',sizeKind:'ring',size:''},
  {id:'na',name:'D earring',meta:'Jewelry',sub:'Earrings',sizeKind:'none',size:''},
  {id:'bag',name:'E bag',meta:'Bags',sizeKind:'none',size:''},
  {id:'one',name:'F hat',meta:'Hats',sizeKind:'onesize',size:''},
  {id:'os',name:'G tee',meta:'Tops',sizeKind:'clothing',size:'One size'},
  {id:'adjustable',name:'H ring',meta:'Jewelry',sub:'Rings',sizeKind:'ring',size:'adjustable'},
  {id:'sized',name:'I tee',meta:'Tops',sizeKind:'clothing',size:'M'},
  {id:'fit',name:'J tee',meta:'Tops',sizeKind:'clothing',size:'',fitsLike:'L'}
 ];
 c.sectionItems=()=>items;vm.createContext(c);
 vm.runInContext(['normSize','effSize','deriveKind','sizeRelevant','sizeKey','sizeFilterGroup','needsSize','filtered'].map(fn).join('\n'),c);
 const ids=()=>Array.from(c.filtered(),x=>x.id);
 c.state.sizes={__missing:true};assert.deepEqual(ids(),['missing','gauge','ring']);
 c.state.sizes={__nosize:true};assert.deepEqual(ids(),['na','bag'],'not applicable includes all non-sized kinds, not every earring');
 c.state.sizes={__onesize:true};assert.deepEqual(ids(),['one','os','adjustable'],'explicit one size, aliases, and adjustable rings share one group');
 c.state.sizes={'clothing:M':true};assert.deepEqual(ids(),['sized']);
 c.state.sizes={'clothing:L':true};assert.deepEqual(ids(),['fit'],'a recorded fits-like size is not missing');
 c.state.sizes={'ring:o/s':true};assert.deepEqual(ids(),['adjustable'],'older specific one-size filter URLs still match');
 c.state.sizes={__missing:true,__onesize:true};assert.deepEqual(ids(),['missing','gauge','ring','one','os','adjustable'],'size choices combine as OR');
 console.log('Size filters: missing, not applicable, and one size have consistent, distinct results across clothing, jewelry, and accessories.');
}

// Browse ordering persists independently from temporary browsing context.
{
 const storage=new Map(),writes=[];let blocked=false;
 const c={state:{sort:'random',sortRev:false,q:'keep private',fav:true,collectionFilter:{one:true},randomSeed:123},localStorage:{getItem:k=>{if(blocked)throw Error('Unavailable');return storage.get(k)||null},setItem:(k,v)=>{if(blocked)throw Error('Unavailable');writes.push([k,v]);storage.set(k,v)}}};
 vm.createContext(c);vm.runInContext(fn('loadBrowseSort')+'\n'+fn('saveBrowseSort'),c);
 assert.deepEqual(JSON.parse(JSON.stringify(c.loadBrowseSort())),{sort:'new',reverse:false});c.saveBrowseSort();
 assert.deepEqual(JSON.parse(writes.at(-1)[1]),{sort:'random',reverse:false},'no search, filters, collection, or random seed is saved');
 assert.equal(c.loadBrowseSort().sort,'random');c.state.sort='name';c.state.sortRev=true;c.saveBrowseSort();assert.equal(c.loadBrowseSort().reverse,true);
 for(const invalid of ['{',JSON.stringify({sort:'injected'}),JSON.stringify(null),JSON.stringify([])]){storage.set('closetlint.browse-sort.v1',invalid);assert.equal(c.loadBrowseSort().sort,'new')}
 storage.set('closetlint.browse-sort.v1',JSON.stringify({sort:'name',reverse:'true'}));assert.equal(c.loadBrowseSort().reverse,false,'direction must be a real boolean');
 blocked=true;assert.doesNotThrow(()=>c.saveBrowseSort());assert.equal(c.loadBrowseSort().sort,'new','blocked storage has a safe default');
 console.log('Browse sort: remembered mode/direction, private temporary context omitted, invalid data and blocked storage handled.');
}
