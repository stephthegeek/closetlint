const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.CLOSET_SOURCE||path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/app/closet-lint.html','utf8');
const state={profile:{},wishrank:{main:{v:2,r:{wish:{c:4,m:2,intent:'planned'}},pass:{},recent:[],revision:7}}};let pieces=[];
const c={state,console,Date,Math,Set,Map,allItems:()=>pieces,todayStr:()=> '2026-11-08',labRatingEntries:()=>[],labRole:p=>p.meta==='Tops'?'top':p.meta==='Bottoms'?'bottom':'accessory',wearRoleChoices:()=>['top'],labFits:p=>!p.unfit,labPairBlocked:()=>false,labPalettePair:()=>true,LAB_NEUTRAL:{black:1},labCanCover:()=>true,labUnderFits:()=>false};
vm.createContext(c);for(const f of ['comfort-zone','comfort-quizzes-catalog','comfort-quizzes-model','comfort-quizzes-integration','sky'])vm.runInContext(fs.readFileSync(root+'/app/scripts/'+f+'.js','utf8'),c);
vm.runInContext(html.slice(html.indexOf('/* ---------- Wishlist: evidence,'),html.indexOf('/* ---------- Buy check ---------- */')),c);
const C=c.ClosetLintComfort;c.window={ClosetLintPreferenceEvidence:{forPiece:p=>C.evidence(state.profile,p)}};
function rate(qid,id,value){const q=C.question(qid),key=C.key(q.topic);state.profile[key]=C.apply(state.profile[key]||C.empty(),q,'rate',id,value)}
function use(items){pieces=items;c._wrCtx=null;return c.wrCtx()}
function gaps(p){return c.wrQuizGaps(p,C.evidence(state.profile,p),c.wrCtx())}
function necklace(id,length='long',more={}){return {id,meta:'Jewelry',sub:'Necklaces',length,...more}}
rate('necklacelength','choker',2);
const wish=necklace('wish','choker',{wish:true});
use([wish]);assert.equal(gaps(wish)[0].count,0);assert.equal(gaps(wish)[0].bonus,3);
use([wish,necklace('one','choker',{stored:true})]);assert.equal(gaps(wish)[0].count,1,'stored pieces count');assert.equal(gaps(wish)[0].bonus,2);
use([wish,necklace('one','choker',{stored:true}),necklace('two','choker',{hidden:true})]);assert.equal(gaps(wish).length,0,'hidden owned pieces also prevent false absence');
let many=Array.from({length:50},(_,i)=>necklace('n'+i,i<3?'choker':'long'));use([wish,...many]);assert.equal(gaps(wish)[0].level,'relative');assert.equal(gaps(wish)[0].bonus,1);
let facts=c.wrPurchaseFacts(wish);assert.equal(facts.gapBonus,1);assert(c.wrChips(wish).some(x=>x.t==='Fills a gap: Choker'));assert(!c.wrChips(wish).some(x=>x.t==='Love: Choker'));
assert.equal(c.wrPersonal(wish).c,4);assert.equal(c.wrPersonal(wish).m,2);assert.equal(state.wishrank.main.revision,7,'analysis does not save or reset ranking');
for(const [matches,total,expected] of [[0,0,'absolute'],[1,4,'absolute'],[2,19,null],[2,20,null],[2,21,'relative'],[5,50,null],[5,51,'relative'],[6,100,null],[8,100,null]])assert.equal(c.wrGapLevel(matches,total),expected,`${matches}/${total}`);
use([wish,...many.slice(0,10),...Array.from({length:1000},(_,i)=>({id:'shoe'+i,meta:'Footwear',heelIn:'3'}))]);assert.equal(gaps(wish).length,0,'unrelated categories cannot inflate the denominator');
use([wish,...Array.from({length:10},(_,i)=>necklace('missing'+i,''))]);assert.equal(gaps(wish).length,0,'missing fields are not absence');
use([wish,...Array.from({length:20},(_,i)=>necklace('uncertain'+i,i<2?'':'long'))]);assert.equal(gaps(wish).length,0,'even mostly tagged pieces cannot prove a gap if unknowns could fill it');
use([wish,...many.map((p,i)=>i===49?{...p,length:''}:p)]);assert.equal(gaps(wish)[0].unknown,1,'relative gap remains robust to an unknown');
use([wish,necklace('deleted','choker',{removed:true}),necklace('gone','choker',{gone:true}),necklace('donate','choker',{donate:true})]);assert.equal(gaps(wish)[0].count,0);
state.profile.samples={kind:'piece-collection',synthetic:true,ids:['sample']};use([wish,necklace('sample','choker')]);assert.equal(gaps(wish)[0].count,0,'synthetic collections do not fill gaps');delete state.profile.samples;
use([wish,necklace('duplicate','choker'),necklace('duplicate','choker')]);assert.equal(gaps(wish)[0].count,1,'duplicate IDs count once');
rate('necklacelength','choker',1);use([wish]);assert.equal(gaps(wish)[0].bonus,1.5,'likes get a smaller bonus');rate('necklacelength','choker',-2);use([wish]);assert.equal(gaps(wish).length,0,'negative traits never receive gap bonuses');rate('necklacelength','choker',0);use([wish]);assert.equal(gaps(wish).length,0,'neutral is not a wanted gap');rate('necklacelength','choker',3);
rate('jewelrydetails','pearls',3);const pearl={...wish,jfeat:['pearls']};use([pearl]);facts=c.wrPurchaseFacts(pearl);assert.equal(facts.gaps.length,2);assert.equal(facts.gapBonus,3,'multiple gaps do not stack beyond the cap');assert(c.wrChips(pearl).some(x=>x.quizLove&&x.t.includes('Fills a gap:')&&x.t.includes('Choker')&&x.t.includes('Pearls')));assert(!c.wrChips(pearl).some(x=>/^Obsessed:/.test(x.t)));
rate('jewelrymaterials','sterling silver',-1);const cautioned={...pearl,jmetal:['silver']};use([cautioned]);assert.equal(c.wrPurchaseFacts(cautioned).gapBonus,0,'gap boost cannot soften a negative quiz signal');assert(c.wrChips(cautioned).some(x=>x.k==='warn'));
use([{...pearl,unfit:true}]);assert.equal(c.wrPurchaseFacts(pieces[0]).gapBonus,0,'outside saved sizes gets no purchase boost');
rate('heel','3',2);const shoe={id:'shoe-wish',meta:'Footwear',heelIn:'3',wish:true};use([shoe]);assert.equal(gaps(shoe)[0].trait,'3" heels');
// A small closet can establish a style; sparse styles alone are never a recommendation.
c.SKY_CATALOG={stars:JSON.parse(fs.readFileSync(root+'/app/content/sky/stars.json')).stars,constellations:JSON.parse(fs.readFileSync(root+'/app/content/sky/constellations.json')).constellations,scoring:JSON.parse(fs.readFileSync(root+'/app/content/sky/scoring.json'))};
c.ClosetLintSkyUI={model:()=>c.ClosetLintSky.score(pieces,{},c.SKY_CATALOG,'2026-11-08')};
const styleWish={id:'style-wish',name:'Celestial velvet maxi skirt',wish:true,meta:'Bottoms',sub:'Skirts',looks:['Witchy','Boho'],pattern:['celestial'],material:['velvet'],length:'maxi'};
const styleOwned=Array.from({length:20},(_,i)=>({id:'style'+i,meta:'Bottoms',sub:'Skirts',looks:['Witchy'],material:['cotton'],pattern:['solid'],length:'midi'}));
use([styleWish,...styleOwned]);facts=c.wrPurchaseFacts(styleWish);assert.equal(facts.expansion.name,'Boho');assert.equal(facts.expansion.bonus,.75);assert(c.wrChips(styleWish).some(x=>x.t==='Expands your style: Boho'));assert(facts.gapBonus<=3);
use([{...styleWish,looks:[]},...styleOwned]);assert.equal(c.wrPurchaseFacts(pieces[0]).expansion,null,'name alone never establishes the target style');
use([{...styleWish,name:'Plain skirt',pattern:['solid'],material:['cotton'],length:'midi'},...styleOwned]);assert.equal(c.wrPurchaseFacts(pieces[0]).expansion,null,'a tag alone lacks corroborating signature details');
use([styleWish,...styleOwned.slice(0,2)]);assert.equal(c.wrPurchaseFacts(styleWish).expansion,null,'an emerging owned Sky is not a confident anchor');
use([styleWish,...styleOwned.map(p=>({...p,looks:['Sporty']}))]);assert.equal(c.wrPurchaseFacts(styleWish).expansion,null,'unconnected sparsity is not style expansion');
use([styleWish,...styleOwned,...Array.from({length:6},(_,i)=>({id:'boho-top'+i,meta:'Tops',looks:['Boho']}))]);assert.equal(c.wrPurchaseFacts(styleWish).expansion,null,'a style represented elsewhere is not an expansion gap');
use([styleWish,...styleOwned,...Array.from({length:10},(_,i)=>({id:'untagged'+i,meta:'Bottoms',sub:'Skirts'}))]);assert.equal(c.wrPurchaseFacts(styleWish).expansion,null,'low tag coverage cannot assert a style gap');
// Shared cache: even many candidates evaluate each owned piece only once per render context.
delete c.ClosetLintSkyUI;const actualEvidence=C.evidence;let calls=0;C.evidence=(...args)=>{calls++;return actualEvidence(...args)};
use([wish,...many]);for(let i=0;i<30;i++)gaps({...wish,id:'candidate'+i});assert(calls<=many.length+30,'owned preference evidence is reused across candidates');C.evidence=actualEvidence;
console.log('Wishlist gaps: category-relative thresholds, conservative unknowns, stored/hidden ownership, synthetic exclusions, grouped replacement chips, capped bonuses, preserved personal rankings, high-confidence connected Sky expansion, and cache reuse pass.');

// Keep one piece-level heart when high matches are split between gap and ordinary chips.
const split=[{key:'a',confirmed:true,kind:'good',weight:3},{key:'b',confirmed:true,kind:'good',weight:2,mustHave:true}];
assert(c.wrGapHighlight(split,[{key:'a'}]));assert(!c.wrGapHighlight([split[0],split[0]],[{key:'a'}]));
assert(!c.wrGapHighlight(split,[{key:'low'}]));
c.window.ClosetLintPreferenceEvidence.forPiece=()=>[...split,{key:'c',confirmed:true,kind:'good',weight:3}].map(r=>({...r,trait:r.key,label:r.key+' · obsessed'}));
const splitChips=c.wrPreferenceEvidence(wish,[{key:'a'}]);assert(!splitChips.some(x=>x.quizLove),'gap already carries the one combined highlight');
assert(splitChips.some(x=>x.t.includes('b'))&&splitChips.some(x=>x.t.includes('c')),'other high matches still appear in ordinary rating groups');
