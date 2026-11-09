const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const at=html.indexOf('function '+name+'('),line=html.indexOf('\n',at);return html.slice(at,html.slice(at,line).endsWith('}')?line:html.indexOf('\n}',at)+2)}
const piece=(id,meta,more={})=>({id,name:id,meta,sub:meta==='Tops'?'Sweaters':'Skirts',colors:['black'],styles:['casual'],seasons:['summer'],...more});const candidate=piece('candidate','Tops',{wish:true,labAs:'layer'}),top=piece('top','Tops'),bottom=piece('bottom','Bottoms');const pieces=[candidate,top,bottom];const state={wishrank:{main:{v:2,r:{candidate:{c:2,m:-1,w:1}},pass:{},recent:[],revision:1}}};
const c={state,console,Date,Math,Promise,Set,allItems:()=>pieces,todayStr:()=> '2026-11-02',catMetas:m=>[m],labCanCover:()=>true,labUnderFits:()=>false,labFits:p=>!p.unfit,labPairBlocked:(a,b)=>b.block===a.id,labRatingEntries:()=>[],LAB_NEUTRAL:{black:1,white:1,gray:1,beige:1,brown:1,gold:1,silver:1,clear:1}};
vm.createContext(c);vm.runInContext(html.slice(html.indexOf('/* ---------- Wishlist: evidence,'),html.indexOf('/* ---------- Buy check ---------- */')),c);vm.runInContext(['labRole','labEither','labTopish','wearRoleChoices','labPalettePair'].map(fn).join('\n'),c);c.isUnderCand=()=>false;
const before=JSON.stringify({state,pieces});let f=c.wrPurchaseFacts(candidate);assert.deepEqual(Array.from(f.matches,p=>p.id),['top'],'layer uses a main top, not a bottom');assert.equal(JSON.stringify({state,pieces}),before,'analysis does not modify pieces, scores, notes, or ratings');
candidate.labAs='under';c._wrCtx=null;assert(!c.wrPurchaseFacts(candidate).matches.length,'an underlayer without validated coverage is not called a partner');candidate.labAs='top';c._wrCtx=null;assert.deepEqual(Array.from(c.wrPurchaseFacts(candidate).matches,p=>p.id),['bottom']);
const score=c.wrScore(candidate);bottom.colors=['teal'];candidate.colors=['green'];c._wrCtx=null;assert.equal(c.wrPurchaseFacts(candidate).matches.length,0);assert.equal(c.wrPersonal(candidate).c,2);assert.equal(c.wrPersonal(candidate).m,-1,'evidence changes preserve personal components');assert(c.wrScore(candidate)<score);
for(const [a,b]of [['white','cream'],['pink','orange'],['purple','yellow']])assert(!c.wrPartnerOK({...candidate,colors:[a]},{...bottom,colors:[b]}));
const unknown={...candidate,id:'unknown',colors:[],styles:[],seasons:[]};c._wrCtx=null;assert.equal(c.wrPurchaseFacts(unknown).score,50);assert.equal(c.wrChips(unknown).length,0,'missing information does not manufacture evidence pills');
console.log('Wishlist analysis 3.2.0: actual recorded Lab roles, conservative palettes, coverage checks, neutral missing evidence, live recomputation, and preserved personal boosts pass.');

// New evidence changes presentation only; personal scores and the prior formula are retained.
vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/recent-wears.js','utf8'),c);
candidate.colors=['black'];candidate.seasons=['summer'];candidate.styles=['casual'];bottom.colors=['black'];bottom.wears=['2026-11-01','2026-11-01','2026-10-26','2026-10-20','2027-01-01'];c._wrCtx=null;
assert.equal(c.wrPurchaseFacts(candidate).hot,1);assert(c.wrChips(candidate).some(x=>x.t==='goes with 1 🔥'));
bottom.wears=['2026-08-01','2026-07-01','2026-06-01'];c._wrCtx=null;assert.equal(c.wrPurchaseFacts(candidate).hot,0,'old repeated wear is not hot wear');
const oldScore=c.wrPurchaseFacts(candidate).score;
state.outfits={scheduled:{pieces:[{id:candidate.id}],plans:[{d:'2026-11-03'},{d:'2026-11-03'},{d:'2026-10-01'},{d:'2026-13-42'}]}};
state.trips={future:{settings:{start:'2026-11-03',end:'2026-11-06'},plan:{outfits:[{ids:[candidate.id],pin:1,fors:'d:2026-11-03'}]}},suggested:{settings:{start:'2026-11-03'},plan:{outfits:[{ids:[candidate.id]}]}},event:{settings:{start:'2026-11-04',kind:'event',mustOutfits:['scheduled']}},old:{settings:{start:'2026-10-01',must:[candidate.id]}}};
c._wrCtx=null;assert.equal(JSON.stringify(c.wrScheduled(candidate)),JSON.stringify({outfits:1,trips:1,events:1}));assert.equal(c.wrPurchaseFacts(candidate).score,oldScore,'schedule pills do not introduce new score weights');
state.profile={'sky-location':{latitude:49}};assert(c.wrOffSeason(candidate));assert(!c.wrOffSeason({...candidate,functional:true}));assert(!c.wrOffSeason({...candidate,seasons:['summer','winter']}));state.profile['sky-location'].latitude=-34;assert(!c.wrOffSeason(candidate));state.profile['sky-location'].latitude=0;assert(!c.wrOffSeason(candidate),'equatorial climate is not guessed from month');delete state.profile;
for(let i=0;i<5;i++)pieces.push(piece('incompatible'+i,'Bottoms',{colors:['blue']}));candidate.colors=['red'];c._wrCtx=null;assert(c.wrPurchaseFacts(candidate).low);assert(c.wrChips(candidate).some(x=>x.t==='only 1 likely pairing'));
candidate.colors=[];c._wrCtx=null;assert(!c.wrPurchaseFacts(candidate).low,'unknown candidate palette never becomes a low pairing penalty');
candidate.colors=['black'];candidate.material=['lace'];pieces.push({...candidate,id:'similar-low',wish:false,material:['lace']},{...candidate,id:'similar-high',wish:false,material:['lace'],neckline:['scoop']});candidate.neckline=['scoop'];c._wrCtx=null;assert.equal(c.wrPurchaseFacts(candidate).owned[0].id,'similar-high','most overlap is linked, not arbitrary first item');
const stableScore=c.wrPurchaseFacts(candidate).score;
c.window={ClosetLintPreferenceEvidence:{forPiece:()=>[{key:'stretch',kind:'warn',label:'you prefer some stretch',confirmed:false},{key:'wool',kind:'warn',label:'you avoid wool against your skin',confirmed:true,strength:'hard'},{key:'wool',kind:'warn',label:'duplicate',confirmed:true}]}};
const badges=c.wrBalanced(candidate);assert(badges.some(x=>x.id==='preference:wool'));assert(!badges.some(x=>x.id==='preference:stretch'));assert(badges.length<=5);assert(badges.some(x=>x.k==='good')&&badges.some(x=>x.k==='warn'));assert.equal(c.wrPurchaseFacts(candidate).score,stableScore,'future explicit quiz signals do not silently change ranking');
c.window.ClosetLintPreferenceEvidence.forPiece=()=>{throw Error('Unavailable')};assert.equal(c.wrPreferenceEvidence(candidate).length,0);delete c.window;
console.log('Wishlist pills: shared 30-day heat, distinct scheduled use, missing-data neutrality, conservative seasons, closest similarity, five-pill limit, and confirmed future preference seam pass.');

// Generic accessories are suggestions, not positive quantity evidence for either side.
const wardrobe=pieces.slice();pieces.splice(0,pieces.length,candidate,bottom);delete state.outfits;delete state.trips;candidate.colors=['black'];bottom.colors=['black'];bottom.fav=true;c._wrCtx=null;
const garmentScore=c.wrPurchaseFacts(candidate).score,garmentCount=c.wrPurchaseFacts(candidate).matches.length;
for(let i=0;i<25;i++)pieces.push(piece('neutral-jewel-'+i,'Jewelry',{fav:true}));
c._wrCtx=null;assert.equal(c.wrPurchaseFacts(candidate).score,garmentScore);assert.equal(c.wrPurchaseFacts(candidate).matches.length,garmentCount,'jewelry cannot inflate a garment pairing count');
const shoe=piece('shoe-candidate','Footwear',{wish:true}),jewel=piece('jewel-candidate','Jewelry',{wish:true});pieces.push(shoe,jewel);
for(const p of [shoe,jewel]){c._wrCtx=null;const facts=c.wrPurchaseFacts(p);assert(facts.matches.length>0,'ordinary accessory suggestions remain inspectable');assert.equal(facts.score,50,'broad compatibility alone is neutral');assert.equal(facts.evidencePartners.length,0);assert(!c.wrChips(p).some(x=>['pairings','favorites','heat'].includes(x.id)),'no generic accessory goes-with pills');assert(!facts.low,'few ordinary accessory matches are not a caution')}
c.labRatingEntries=()=>[{record:{r:1,ids:[shoe.id,bottom.id]}},{record:{r:1,ids:[bottom.id,shoe.id]}},{record:{r:-1,ids:[jewel.id,bottom.id]}},{record:{r:1,ids:['unrelated',candidate.id]}}];
c._wrCtx=null;const confirmed=c.wrPurchaseFacts(shoe);assert.equal(confirmed.rated,1,'duplicate combination counts once');assert.equal(confirmed.evidencePartners.length,1);assert(confirmed.score>50,'explicit positive outfit evidence can support an accessory');assert(c.wrChips(shoe).some(x=>x.t==='in 1 loved Lab outfit'));assert.equal(c.wrPurchaseFacts(jewel).score,50,'a passed combination is not support');
assert.equal(c.wrPersonal(candidate).c,2);assert.equal(c.wrPersonal(candidate).m,-1,'accessory recalculation preserves saved personal choices');
console.log('Wishlist accessory evidence: neutral broad compatibility, garment-only counts, inspectable suggestions, explicit deduplicated positive Lab combinations, and retained personal boosts pass.');

// Preview order favors the missing half of an outfit without changing evidence order.
{
 const anchor=piece('preview-top','Tops',{looks:['Romantic Goth']});
 const bottoms=Array.from({length:5},(_,i)=>piece('preview-bottom'+i,'Bottoms'));
 const otherTops=Array.from({length:4},(_,i)=>piece('preview-top'+i,'Tops',{fav:true}));
 const special=piece('preview-shoe','Footwear',{looks:['Romantic Goth']});
 const generic=piece('generic-shoe','Footwear',{fav:true});
 const context={owned:[...otherTops,...bottoms,generic,special],repeatWorn:new Set()};
 const matches=[...otherTops,...bottoms];const unchanged=JSON.stringify(matches);
 let previews=c.wrPreviewPartners(anchor,matches,context,new Set());
 assert.deepEqual(Array.from(previews,p=>p.meta),['Bottoms','Bottoms','Bottoms','Footwear']);
 assert.equal(previews[3].id,special.id,'specific matching shoe gets one supporting place');
 assert.equal(JSON.stringify(matches),unchanged,'preview ordering leaves evidence order unchanged');
 context.owned=[...otherTops,...bottoms,generic];
 previews=c.wrPreviewPartners(anchor,matches,context,new Set());
 assert.deepEqual(Array.from(previews,p=>p.meta),['Bottoms','Bottoms','Bottoms','Bottoms'],'generic accessories and interchangeable tops do not fill previews');
 previews=c.wrPreviewPartners(bottoms[0],[...bottoms,...otherTops],context,new Set());
 assert(previews.length===4&&previews.every(p=>p.meta==='Tops'),'bottoms prioritize tops');
 context.owned=[generic];
 assert.equal(c.wrPreviewPartners(anchor,[],context,new Set()).length,0,'no generic filler when complementary garments are missing');
 assert.equal(c.wrPreviewPartners(anchor,[],context,new Set([generic.id]))[0].id,generic.id,'confirmed positive outfit can support an accessory');
 console.log('Wishlist partner previews: complementary garments first, one specific supporting match, no generic filler, and unchanged evidence order pass.');
}

// Comfort preferences filter previews without changing the ranking evidence pool.
const comfortSnapshot=JSON.stringify(state.wishrank),comfortScore=c.wrPurchaseFacts(candidate).score;
c.ClosetLintComfort={guidance:(_profile,p)=>({blocked:p.id===bottom.id,score:0})};c._wrCtx=null;
assert(!c.wrPurchaseFacts(candidate).previews.some(p=>p.id===bottom.id),'confirmed hard no excluded from previews');
assert.equal(c.wrPurchaseFacts(candidate).score,comfortScore,'preview exclusion does not change ranking score');
assert.equal(JSON.stringify(state.wishrank),comfortSnapshot,'personal decisions preserved');
delete c.ClosetLintComfort;c._wrCtx=null;
console.log('Wishlist Comfort zone: preview exclusions preserve ranking evidence and personal decisions.');

// Sorting and compact/scoring paths must not repeat full preference analysis.
{
 const ctx={state:{profile:{}},wrLabSlot:p=>p.role,wrPartnerOK:()=>true,wrShare:()=>1,wrCols:()=>['black']};
 let calls=0,pairs=0;ctx.ClosetLintComfort={guidance:()=>{calls++;return {blocked:false,score:0}}};ctx.wrEvidence=()=>{pairs++;return {aesthetics:1}};
 vm.createContext(ctx);vm.runInContext(fn('wrPreviewPartners'),ctx);
 const owned=Array.from({length:200},(_,i)=>({id:'owned-'+String(i).padStart(3,'0'),role:'bottom'})),context={owned,repeatWorn:new Set()};
 const picks=ctx.wrPreviewPartners({id:'first',role:'top'},owned,context,new Set());
 assert.deepEqual(Array.from(picks,p=>p.id),owned.slice(0,4).map(p=>p.id));
 assert.equal(calls,200,'each owned piece is evaluated once across filtering and sorting');
 assert(pairs<=200,'pair sort keys are computed once per candidate/piece');
 ctx.wrPreviewPartners({id:'second',role:'top'},owned,context,new Set());
 assert.equal(calls,200,'other wishlist candidates share the render context guidance');
 ctx.wrPreviewPartners({id:'second',role:'top'},owned,{owned,repeatWorn:new Set()},new Set());
 assert.equal(calls,400,'a fresh context recomputes changed preferences');
}
{
 const preview=c.wrPreviewPartners;let calls=0;
 c.wrPreviewPartners=function(...args){calls++;return preview(...args)};c._wrCtx=null;
 const facts=c.wrPurchaseFacts(candidate),score=c.wrScore(candidate);
 assert.equal(calls,0,'score and compact facts do not compute display-only previews');
 const first=facts.previews;assert.equal(calls,1);assert.equal(facts.previews,first);assert.equal(calls,1,'repeated disclosure access reuses previews');
 assert.equal(c.wrScore(candidate),score,'opening previews never changes scores');
 c._wrCtx=null;void c.wrPurchaseFacts(candidate).previews;assert.equal(calls,2,'data refresh creates fresh preview results');
 c.wrPreviewPartners=preview;c._wrCtx=null;
}
console.log('Wishlist performance: preference/key reuse, unchanged partner order, lazy previews, fresh contexts, and stable scoring pass.');

// Quiz chip presentation separates XXX from lesser cautions; all candidates share one priority order.
c.window={ClosetLintPreferenceEvidence:{forPiece:()=>[
 {key:'hard',kind:'warn',label:'Hard no',confirmed:true,strength:'hard',weight:-3},
 {key:'less',kind:'warn',label:'Nah',confirmed:true,strength:'strong',weight:-2},
 {key:'like',kind:'good',label:'Like',confirmed:true,strength:'soft',weight:1},
 {key:'love',kind:'good',label:'Love',confirmed:true,strength:'strong',weight:2}]}};
let prefs=c.wrPreferenceEvidence(candidate);assert(prefs.find(x=>x.id==='preference:hard').quizHard);assert(!prefs.find(x=>x.id==='preference:less').quizHard);assert(prefs.find(x=>x.id==='preference:like').softLike);assert(!prefs.find(x=>x.id==='preference:love').softLike);
const realChips=c.wrChips;c.wrChips=()=>[{id:'a',k:'good',priority:90},{id:'b',k:'warn',priority:80},{id:'c',k:'good',priority:70},{id:'d',k:'good',priority:60},{id:'like',k:'good',source:'quiz',rating:1,priority:45,softLike:true}];assert(!c.wrBalanced(candidate).some(x=>x.id==='like'));
c.wrChips=()=>[{id:'a',k:'warn',priority:90},{id:'like',k:'good',priority:65,softLike:true}];assert(c.wrBalanced(candidate).some(x=>x.id==='like'));c.wrChips=realChips;delete c.window;
console.log('Wishlist quiz chips: XXX severity, ordinary X/XX cautions, Love/Obsessed priority, and sparse Like fallback pass.');

// Group each rating separately; a trait that is both Obsessed and top-three still counts once.
const quizRow=(key,weight,top=false)=>({key,weight,mustHave:top,trait:key,label:key+' · '+({1:'like',2:'love',3:'obsessed','-1':'not really','-2':'nah','-3':'hard no'}[weight])+(top?' 🌟':''),kind:weight>0?'good':'warn',confirmed:true,strength:weight===-3?'hard':Math.abs(weight)>=2?'strong':'soft'});
c.window={ClosetLintPreferenceEvidence:{forPiece:()=>[quizRow('gold',3,true),quizRow('gold',3,true)]}};
assert(!c.wrPreferenceEvidence(candidate).some(x=>x.quizLove),'one distinct trait cannot make a combined highlight');
c.window.ClosetLintPreferenceEvidence.forPiece=()=>[quizRow('gold',3,true),quizRow('pearls',2,true),quizRow('floral',2),quizRow('lace',2),quizRow('red',-3),quizRow('orange',-3),quizRow('zips',-2),quizRow('ties',-1)];
prefs=c.wrPreferenceEvidence(candidate);const heart=prefs.filter(x=>x.quizLove);assert.equal(heart.length,1);assert.equal(heart[0].traits,2);assert.equal(heart[0].t,'💜 gold · pearls');assert(prefs.some(x=>x.t==='Love: floral · lace'));assert(prefs.some(x=>x.t==='Hard no: red · orange'&&x.quizHard));assert(prefs.some(x=>x.t==='Nah: zips'&&!x.quizHard));assert(prefs.some(x=>x.t==='Not really: ties'&&!x.quizHard));assert(prefs.every(x=>!/[⭐🌟]/u.test(x.t)));delete c.window;
console.log('Wishlist grouped ratings: one heart for multiple distinct high matches, no duplicate counting, same-rating groups, separate negative levels, and no quiz stars in chips pass.');

// Linked names end at a word boundary at both the character cap and actual available width.
assert.equal(c.wrWordTitle('Black embroidered floral ankle boots',32),'Black embroidered floral ankle…');
assert.equal(c.wrWordTitle('Short name',32),'Short name');
assert.equal(c.wrWordTitle('Supercalifragilisticexpialidocious',12),'…');
const titleNode={clientWidth:24,textContent:'',getAttribute:()=> 'Black embroidered floral ankle boots',get scrollWidth(){return this.textContent.length}};
c.wrFitChipTitle(titleNode);assert.equal(titleNode.textContent,'Black embroidered…');
titleNode.clientWidth=100;c.wrFitChipTitle(titleNode);assert.equal(titleNode.textContent,'Black embroidered floral ankle boots','widening restores the full name');
console.log('Wishlist linked titles: whole words, actual width, long tokens, and full-name restoration pass.');

// Interestingness is a display concern; utility positives stay low but negatives do not.
const priority=c.wrChipPriority,qr=(rating,utilityOnly,more={})=>({id:'preference:test',source:'quiz',k:rating<0?'warn':'good',rating,utilityOnly,traits:1,...more});
assert(priority(qr(1,true))<priority(qr(2,true))&&priority(qr(2,true))<priority(qr(3,true)));
for(const value of [1,2,3])assert(priority(qr(value,true))<priority(qr(value,false)));
for(const value of [-1,-2,-3])assert.equal(priority(qr(value,true)),priority(qr(value,false)),'negative utility traits retain their warning priority');
assert(priority(qr(1,true,{traits:2}))>priority(qr(1,true)),'combined utility positives have more information');
assert(priority(qr(1,false,{traits:2}))>priority({id:'pairings',k:'good'}),'combined aesthetic likes can beat generic counts');
assert(priority(qr(1,true,{gap:true}))<priority({id:'style-expansion'}),'a utility-only gap is not automatically top priority');
assert(priority(qr(3,true,{topPick:true}))>=75,'explicit top-three selections remain meaningful');
assert(!c.wrUtilityTrait('dresspockets'));
for(const key of ['toplength:regular','skirtlength:midi','stretch','room','careeffort:iron','dressfastenings:buttons','fastenings:zip'])assert(c.wrUtilityTrait(key));
for(const key of ['heel:3','heels:block','necklacelength:choker','textures:velvet','dressfastenings:lacing'])assert(!c.wrUtilityTrait(key));
assert.equal(priority(qr(1,false)),45,'pockets use the ordinary quiz tier, not a dedicated boost');
c.window={ClosetLintPreferenceEvidence:{forPiece:()=>[quizRow('toplength:regular',2),quizRow('textures:velvet',2)]}};
let combined=c.wrPreferenceEvidence(candidate)[0];assert.equal(combined.t,'Love: textures:velvet · toplength:regular');assert.equal(combined.priority,85,'a mixed group inherits its interesting trait');
c.window.ClosetLintPreferenceEvidence.forPiece=()=>[{...quizRow('dresspockets',1),trait:'has pockets',strength:'strong'}];assert.equal(c.wrPreferenceEvidence(candidate)[0].priority,45);
delete c.window;
const keepChips=c.wrChips;c.wrChips=()=>[qr(1,true),{id:'pairings',k:'good'},qr(-3,true,{id:'hard',quizHard:true}),{id:'style-expansion',k:'good'},{id:'rated',k:'good'}];
let chosen=c.wrBalanced(candidate);assert.equal(chosen[0].id,'hard','selection and visual order follow the same priority, without a forced positive slot');assert(!chosen.some(x=>x.utilityOnly&&x.k==='good'));
c.wrChips=()=>[qr(1,true),{id:'pairings',k:'good'}];assert.equal(c.wrBalanced(candidate).length,2,'utility likes can fill a sparse row');c.wrChips=keepChips;
console.log('Wishlist interestingness: unified selection/display order, utility Like/Love/Obsessed levels, mixed groups, preserved cautions, explicit top picks, and ordinary pocket preference priority pass.');

// Preserve loved vs liked evidence while counting the same combination only once.
c.labRatingEntries=()=>[{record:{r:0,ids:[shoe.id,bottom.id]}},{record:{r:1,ids:[bottom.id,shoe.id]}},{record:{r:0,ids:[shoe.id,candidate.id]}}];
c._wrCtx=null;let labFacts=c.wrPurchaseFacts(shoe);assert.equal(labFacts.rated,2);assert.equal(labFacts.loved,1);assert.equal(labFacts.liked,1);
let labChip=c.wrChips(shoe).find(x=>x.id==='rated');assert.equal(labChip.t,'in 1 loved · 1 liked Lab outfits');assert.equal(labChip.priority,88);
c.labRatingEntries=()=>[{record:{r:0,ids:[shoe.id,bottom.id]}}];c._wrCtx=null;labChip=c.wrChips(shoe).find(x=>x.id==='rated');assert.equal(labChip.t,'in 1 liked Lab outfit');assert.equal(labChip.priority,86);
assert.equal(c.wrPersonal(candidate).c,2);assert.equal(c.wrPersonal(candidate).m,-1);
console.log('Wishlist Lab chips: loved ranks above liked, mixed counts share one chip, duplicate combinations count once at their strongest positive rating, and personal adjustments are preserved.');
