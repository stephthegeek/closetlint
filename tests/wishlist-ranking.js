const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),start=html.indexOf('/* ---------- Wishlist: evidence,'),script=html.slice(start,html.indexOf('/* ---------- Buy check ---------- */',start));
function fn(name){const at=html.indexOf('function '+name+'('),line=html.indexOf('\n',at);return html.slice(at,html.slice(at,line).endsWith('}')?line:html.indexOf('\n}',at)+2)}
const piece=(id,meta='Tops',extra={})=>({id,name:id,meta,sub:meta==='Tops'?'Tees':meta==='Bottoms'?'Skirts':'Dresses',colors:['black'],styles:['casual'],seasons:['summer'],...extra});
const wish=piece('wish','Tops',{wish:true}),skirt=piece('skirt','Bottoms',{fav:true}),other=piece('other','Tops',{wish:true}),pieces=[wish,skirt,other];
let fail=false,undo,messages=[],writes=[];
const c={console,Date,Math,Promise,Set,Number,state:{wishrank:{main:{v:1,r:{wish:{s:1999,n:6}},t:{a:1600,b:1460},pass:{other:true}}},db:{collection:()=>({doc:()=>({set:async d=>{if(fail)throw Error('Offline');writes.push(JSON.parse(JSON.stringify(d)))}})})}},allItems:()=>pieces,todayStr:()=> '2026-11-02',labRole:p=>p.labAs==='under'?'':p.labAs==='layer'?'layer':p.meta==='Tops'?'top':p.meta==='Bottoms'?'bottom':p.meta==='One-pieces'?'one':'',wearRoleChoices:p=>p.labAs==='under'?['under']:p.labAs==='layer'?['layer']:['top'],labCanCover:()=>true,labUnderFits:(a,b)=>a.labAs==='under'&&a.id!==b.id,labFits:p=>!p.unfit,labPairBlocked:(a,b)=>!!(a.block===b.id||b.block===a.id),labRatingEntries:()=>[],toast:m=>messages.push(m),toastAct:(m,label,f)=>{messages.push(m);undo=f},byIdA:()=>Object.fromEntries(pieces.map(p=>[p.id,p])),localStorage:{getItem:()=>null,setItem(){}},window:{scrollTo(){}},memoRun:f=>f()};
vm.createContext(c);vm.runInContext(script,c);c.wrRender=()=>{};
c.LAB_NEUTRAL={black:1,white:1,gray:1,beige:1,brown:1,silver:1,gold:1,clear:1};vm.runInContext(fn('labPalettePair'),c);
(async()=>{
 const original=JSON.stringify(c.wrDoc());assert.equal(c.wrScore(wish),1999);c.wrState().preview=true;assert(c.wrScore(wish)<100);assert.equal(JSON.stringify(c.wrDoc()),original,'preview never changes the saved ranking');
 await c.wrStartFresh();assert.equal(c.wrDoc().v,2);assert.equal(c.wrPersonal(wish).c,0);assert.equal(c.wrDoc().legacy.document.r.wish.s,1999);assert(c.wrPassed(other));assert.equal(c.wrDoc().legacy.document.r.wish.n,6);assert.equal(c.wrPersonal(wish).n,0);
 await c.wrMove(other,'want');assert(!c.wrPassed(other));c.wrState().cur={a:wish,b:other};const base=c.wrScore(other);await c.wrPick(1);assert.equal(c.wrPersonal(wish).c,2);assert.equal(c.wrPersonal(other).c,0);assert.equal(c.wrScore(other),base,'loser priority unchanged');assert.equal(c.wrPersonal(wish).w,1);
 await c.wrUndo();assert.equal(c.wrPersonal(wish).c,0);assert.equal(c.wrPersonal(wish).w,0);assert.equal(c.wrPersonal(wish).n,0);
 for(let i=0;i<13;i++){c.wrState().cur={a:wish,b:other};await c.wrPick(1)}assert.equal(c.wrPersonal(wish).c,20);assert.equal(c.wrPersonal(wish).w,13);
 const skipped=JSON.stringify(c.wrDoc());c.wrState().cur={a:wish,b:other};c.wrSkip();assert.equal(JSON.stringify(c.wrDoc()),skipped,'Skip changes no saved ranking');
 const saveBefore=JSON.stringify(c.wrDoc()),histBefore=c.wrState().hist.length;fail=true;c.wrState().cur={a:wish,b:other};assert.equal(await c.wrPick(0),false);assert.equal(JSON.stringify(c.wrDoc()),saveBefore);assert.equal(c.wrState().hist.length,histBefore);assert.match(c.wrState().message,/Could not save/);fail=false;
 const loserBefore=JSON.stringify(c.wrDoc().r.other);await c.wrMove(wish,'down');assert.equal(JSON.stringify(c.wrDoc().r.other),loserBefore,'move changes only moved personal record');assert.equal(c.wrSortAll([wish,other])[1].id,'wish');assert(c.wrPersonal(wish).m<0);await undo();assert.equal(c.wrPersonal(wish).m,0);
 await c.wrMove(other,'some');assert.equal(c.wrPersonal(other).intent,'some');await c.wrMove(other,'first');assert.equal(c.wrPersonal(other).intent,'some','rank does not silently change intention');
 const staleUndo=undo;await c.wrMove(wish,'first');const newest=JSON.stringify(c.wrDoc());assert.equal(await staleUndo(),false);assert.equal(JSON.stringify(c.wrDoc()),newest);
 await c.wrMove(wish,'planned');assert.equal(c.wrPersonal(wish).intent,'planned');assert.equal(c.wrSecOf(wish,{[wish.id]:1}),'top');const plannedBefore=JSON.stringify(c.wrDoc());c.state.wishrank.main=JSON.parse(plannedBefore);assert.equal(c.wrPersonal(wish).intent,'planned','Planned survives persistence');
 const beforeReset=JSON.stringify(c.wrDoc().r);await c.wrReset();assert.equal(c.wrPersonal(wish).intent,'planned','reset preserves Planned');assert.equal(c.wrPersonal(other).intent,'some');assert.equal(c.wrPersonal(wish).c,0);assert.equal(c.wrPersonal(wish).m,0);await c.wrRecoverReset();assert.equal(JSON.stringify(c.wrDoc().r),beforeReset,'reset Undo survives stored JSON snapshot');
 await c.wrReset();await c.wrMove(wish,'down');const changed=JSON.stringify(c.wrDoc());assert.equal(await c.wrRecoverReset(),false);assert.equal(JSON.stringify(c.wrDoc()),changed,'stale reset cannot overwrite newer choices');
 // Stable tied neighbors: only the moved item's adjustment/tie changes.
 c.state.wishrank.main=c.wrSeedDoc();pieces.push(piece('third','Tops',{wish:true}));c._wrCtx=null;const [a,b]=c.wrSortAll([wish,other]),d=pieces.at(-1);const doc=c.wrDoc();c.wrPlace(doc,d,a,b);assert.equal(c.wrSortAll([a,b,d]).map(p=>p.id).join(','),[a.id,d.id,b.id].join(','));assert.deepEqual(Object.keys(doc.r),[d.id]);
 // Independent evidence, conservative palettes, usable roles, and bounded calibration.
 c.state.wishrank.main=c.wrSeedDoc();c._wrCtx=null;const fact=c.wrPurchaseFacts(wish);assert.equal(fact.matches.length,1);const originalScore=fact.score;skirt.price=999999;c._wrCtx=null;assert.equal(c.wrPurchaseFacts(wish).score,originalScore,'price is not evidence');
 skirt.wears=['2026-10-01','2026-10-01','2026-09-02','2026-08-03','2026-02-30','2027-01-01'];assert.equal(c.wrRecentWears(skirt,'2026-11-02'),3);c._wrCtx=null;assert.equal(c.wrPurchaseFacts(wish).score,originalScore,'favorite and repeat history do not double count');
 const originalPieces=pieces.slice();for(let i=0;i<400;i++)pieces.push(piece('bottom'+i,'Bottoms'));c._wrCtx=null;const huge=c.wrPurchaseFacts(wish);assert(huge.score<80);assert(huge.score>fact.score);const four=pieces.slice(0,7);pieces.splice(7);c._wrCtx=null;assert.equal(c.wrPurchaseFacts(wish).score,huge.score,'more than four equally useful partners cannot inflate priority');pieces.splice(0,pieces.length,...originalPieces);c._wrCtx=null;
 for(const status of ['stored','hidden','donate','removed','wish','unfit']){skirt[status]=true;c._wrCtx=null;assert(!c.wrPurchaseFacts(wish).matches.length,status+' excluded');delete skirt[status]}
 for(const [x,y]of [['teal','green'],['pink','orange'],['white','cream'],['hot pink','red'],['blue','yellow']])assert.equal(c.wrPartnerOK({...wish,colors:[x]}, {...skirt,colors:[y]}),false,x+'/'+y);
 assert(c.wrPartnerOK({...wish,colors:['blue']},{...skirt,colors:['blue','orange','multicolor'],pattern:['floral']}),'recorded print can bridge an actual shared color');
 assert(!c.wrPartnerOK(wish,{...skirt,block:wish.id}));assert(!c.wrPartnerOK(wish,{...skirt,seasons:['winter']}));assert(!c.wrPartnerOK({...wish,styles:['formal']},{...skirt,styles:['workout']}));
 assert(!c.wrPartnerOK(wish,{...skirt,colors:[]}));assert(c.wrPartnerOK({...wish,styles:[],seasons:[]},skirt),'missing tags are uncertainty, not a ban');
 assert(c.wrPairRoles({...wish,labAs:'layer'},piece('main')));assert(!c.wrPairRoles({...wish,labAs:'layer'},skirt),'layer is not evaluated as a main top');assert(c.wrPairRoles({...wish,labAs:'under'},piece('main')));
 c._wrCtx=null;const requirement={...wish,id:'required',layerNeed:'under'};assert(c.wrPurchaseFacts(requirement).support);pieces.push(piece('under','Tops',{labAs:'under'}));c._wrCtx=null;assert.equal(c.wrPurchaseFacts(requirement).support,null,'recorded support inspected');assert(c.wrPurchaseFacts(requirement).score>=50);
 const sparse=piece('sparse','Tops',{colors:[],wish:true});c._wrCtx=null;assert.equal(c.wrPurchaseFacts(sparse).score,50,'missing data gets neutral baseline');
 // Same role evidence is comparable for dresses and tops, rather than raw closet size.
 const dress=piece('dress','One-pieces',{wish:true});c._wrCtx=null;const standaloneScore=c.wrPurchaseFacts(dress).score;assert(standaloneScore>=50&&standaloneScore<80);pieces.push(piece('shoes','Footwear'));c._wrCtx=null;assert.equal(c.wrPurchaseFacts(dress).score,standaloneScore,'generic shoes do not inflate garment evidence');
 const similar={...wish,id:'similar',material:['lace']};assert(c.wrOverlap({...wish,material:['lace']},similar).length);assert(!c.wrOverlap(wish,similar).length);assert(!c.wrOverlap({...wish,material:['lace']},{...similar,labAs:'layer'}).length);
 // Active top-ten slots refill; Pass is reversible and retained by reset.
 for(let i=0;i<14;i++)pieces.push(piece('extra'+i,'Tops',{wish:true}));c._wrCtx=null;await c.wrMove(wish,'pass');assert(!c.wrTopIds().wish);assert.equal(Object.keys(c.wrTopIds()).length,10);await c.wrReset();assert(c.wrPassed(wish));
 const snapshot=JSON.parse(JSON.stringify(c.wrDoc()));c.state.wishrank.main=snapshot;assert(c.wrPassed(wish),'JSON restore keeps Pass and reset recovery');
 // Failures never mutate confirmed state, including browser-only storage failure.
 delete c.state.db;c.localStorage.setItem=()=>{throw Error('Storage full')};const final=JSON.stringify(c.wrDoc());assert.equal(await c.wrMove(other,'pass'),false);assert.equal(JSON.stringify(c.wrDoc()),final);
 // Reuse expensive evidence for presentation/personal ranking changes, not changed wardrobe facts.
 c.state.wishrank.main=c.wrSeedDoc();c._wrCtx=null;c.wrPrepareContext();let cached=c.wrCtx(),cachedFacts=c.wrPurchaseFacts(other);
 c.wrState().scope='clothing';c.wrState().compact=true;c.wrPrepareContext();assert.equal(c.wrCtx(),cached,'scope and density changes reuse evidence');
 c.state.wishrank.main.r.other={intent:'some',m:2,c:4};c.wrPrepareContext();assert.equal(c.wrCtx(),cached,'personal boosts and intentions do not change partner evidence');assert.equal(c.wrPurchaseFacts(other),cachedFacts);
 const refresh=(change,label)=>{const previous=c.wrCtx();change();c.wrPrepareContext();assert.notEqual(c.wrCtx(),previous,label);cached=c.wrCtx()};
 refresh(()=>skirt.colors=['orange'],'piece colors invalidate');
 refresh(()=>skirt.fav=!skirt.fav,'favorites invalidate');
 refresh(()=>skirt.wears=['2026-11-01'],'wear history invalidates');
 refresh(()=>c.state.profile={wear:{top:['XL']}},'fit/profile changes invalidate');
 refresh(()=>c.state.ratings={example:{r:1,ids:[other.id,skirt.id]}},'Lab ratings invalidate');
 refresh(()=>c.state.blocks={example:{ids:[other.id,skirt.id]}},'pairing preferences invalidate');
 refresh(()=>c.state.outfits={example:{pieces:[{id:other.id}],plans:[{d:'2026-12-01'}]}},'saved outfit plans invalidate');
 refresh(()=>c.state.trips={example:{settings:{start:'2026-12-01',end:'2026-12-02'}}},'trip plans invalidate');
 refresh(()=>c.state.wishrank.main.pass[other.id]=true,'Pass membership invalidates active wishlist evidence');
 const previousDay=c.wrCtx();c.todayStr=()=> '2026-11-03';assert.notEqual(c.wrCtx(),previousDay,'day rollover refreshes even before a redraw');
 console.log('Wishlist ranking: deliberate migration, winner-only bounded boosts, Skip, Undo, moved-only reordering/ties, explicit intentions, reset recovery/conflict guards, conservative evidence, and score calibration pass.');
})().catch(e=>{console.error(e);process.exit(1)});

require('./wishlist-scopes');
