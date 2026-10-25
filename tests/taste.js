// Synthetic wardrobe only: count distinct outfits, follow edits, and browse evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app/closet-lint.html'),'utf8'),moduleSource=fs.readFileSync(path.join(root,'app/scripts/taste.js'),'utf8');
assert.equal(source.split('/* BEGIN MY TASTE (source: app/scripts/taste.js) */\n')[1].split('/* END MY TASTE */')[0],moduleSource);
assert.equal(source.split('/* BEGIN MY TASTE STYLES (source: app/styles/taste.css) */\n')[1].split('/* END MY TASTE STYLES */')[0],fs.readFileSync(path.join(root,'app/styles/taste.css'),'utf8'));
class Node{
 constructor(tag,attrs,...children){this.tag=tag;this.attrs={...attrs};Object.assign(this,attrs);this.style={};this.children=[];this.classList={add:()=>{}};this.listeners={};this.isConnected=true;this.scrollTop=0;this.append(...children)}
 append(...xs){this.children.push(...xs.flat(Infinity).filter(x=>x!=null))}appendChild(n){this.children.push(n);return n}prepend(n){this.children.unshift(n)}
 set textContent(x){this.text=x;this.children=[]}get textContent(){return this.text||''}
 addEventListener(type,fn){this.listeners[type]=fn}setAttribute(k,v){this.attrs[k]=v}
 querySelector(selector){return all(this,n=>selector==='[role=status]'?n.role==='status':n.tag===selector)[0]||null}
 contains(n){return all(this,x=>x===n).length>0}focus(){document.activeElement=this;this.focused=true}
 showModal(){this.open=true}close(){this.open=false;if(this.listeners.close)this.listeners.close()}remove(){document.body.children=document.body.children.filter(n=>n!==this);this.isConnected=false}
}
const all=(node,p)=>[...(p(node)?[node]:[]),...(node.children||[]).filter(x=>x&&typeof x==='object').flatMap(x=>all(x,p))];
const el=(...args)=>new Node(...args),document={body:el('body'),activeElement:null};
const buttons=(n)=>all(n,x=>x.tag==='button');const button=(n,t)=>buttons(n).find(x=>x.text===t);
const map={},board={pieces:[{id:'keep-board'}]},state={ratings:{},lab:{mode:'taste',cur:{keep:true}},tab:'lab',board};
let renders=0,tiles=0;
const panel=el('main',{},el('h2',{text:'Outfit Lab'})),header=el('span');
const c={state,document,window:{scrollTo(){}},el,byId:()=>map,$:id=>id==='view-lab'?panel:header,COLORS:{black:'#111',red:'#c00',white:'#fff'},colLabel:x=>x,cap:x=>x,catLabel:p=>p.role,labParts:o=>[o.layer,o.one,o.top,o.under,o.bottom].filter(Boolean),labRole:p=>p.role,labEither:()=>false,labTopish:()=>false,isUnderCand:()=>false,labAccParts:o=>o.acc?.shoes?[o.acc.shoes]:[],labAccRestore(o,rec,m){if(rec.acc?.shoes&&m[rec.acc.shoes])o.acc={shoes:m[rec.acc.shoes]}},labTile:p=>{tiles++;return el('div',{class:'tile',piece:p.id})},labBlocksBox:v=>v.appendChild(el('section',{blocked:true})),labRender:()=>renders++,labBase:()=>1};
vm.createContext(c);
vm.runInContext(source.slice(source.indexOf('function labOutfitFromIds('),source.indexOf('/* ---------- accessories in the Outfit Lab')),c);
vm.runInContext(moduleSource,c);
vm.runInContext(source.slice(source.indexOf('function labRefresh(){'),source.indexOf('function labRender(){')),c);
function piece(id,role,colors=['black'],looks=['witchy']){return map[id]={id,name:id,role,colors,looks}}
piece('top','top');piece('bottom','bottom');piece('layer','layer');
state.ratings.a={ids:['top','bottom','layer','top'],r:1,t:1};
let stats=c.labStats();assert.equal(stats['c:black'].n,1,'three black garments count as one outfit');assert.equal(stats['l:witchy'].n,1);assert.equal(stats['p:top'].n,1);
map.top.colors=['black','red'];assert.equal(c.labStats()['c:red'].n,1,'tag edits refresh without changing any rating timestamp');assert(c.labFeat({top:map.top,bottom:map.bottom}).includes('cp:black+red'));
state.ratings.a.r=-1;assert.equal(c.labStats()['c:black'].passed,1,'same-count, same-timestamp rating edits refresh');assert.equal(c.labStats()['c:black'].s,-1);
state.ratings.b={ids:['layer','bottom','top'],r:0,t:2};assert.equal(c.labRatingEntries().length,1,'duplicate combinations retain only their latest rating');assert.equal(c.labStats()['c:black'].liked,1);
state.ratings.missing={ids:['gone','bottom'],r:1};state.ratings.bad={ids:['top','bottom'],r:2};state.ratings.badids={ids:'top',r:1};assert.equal(c.labNRated(),1);
delete map.layer;assert.equal(c.labNRated(),0,'removed pieces invalidate evidence');assert.equal(c.labCountText(),'Nothing rated yet');
state.ratings={};map.top.colors=['black'];
for(let i=0;i<24;i++){piece('b'+i,'bottom',i<8?['red']:['white'],[]);state.ratings['r'+i]={ids:['top','b'+i],r:i<8?-1:i<12?0:1,t:i}}
map.shoes={id:'shoes',name:'Shoes',role:'shoes'};state.ratings.r23.acc={shoes:'shoes'};
stats=c.labStats();assert.equal(stats['c:black'].n,24);assert.equal(stats['c:black'].loved,12);assert.equal(stats['c:black'].liked,4);assert.equal(stats['c:black'].passed,8);
assert(c.labTastePatterns(stats,true).includes('c:black'),'Liked ratings contribute to positive patterns');assert(c.labTastePatterns(stats,false).includes('c:red'));
assert.equal(c.labCountText(),'24 rated, 12 loved');
// The generator calculates the current stats once, not once per candidate.
const actualStats=c.labStats;let builds=0;c.labStats=(...args)=>{builds++;return actualStats(...args)};
c.labDraw=()=>({top:map.top,bottom:map.b0});c.labSig=()=> 'new';c.labGenerate({},null,null,{});assert.equal(builds,1);c.labStats=actualStats;
c.labRefresh();assert.equal(renders,1,'existing current outfit must not prevent refreshing My taste');
state.lab.mode='rate';c.labRefresh();assert.equal(renders,1,'Rate preserves the in-progress outfit');assert.equal(header.textContent,'24 rated, 12 loved');state.lab.mode='taste';
const view=el('main');c.labTasteView(view);const sections=view.children.filter(x=>x.tag==='section');
assert.equal(sections[0].children[0].text,'What’s working for you');assert.equal(sections[1].children[0].text,'Pieces you keep loving');assert.equal(sections[2].children[0].text,'Patterns in outfits you passed on');assert(sections.at(-1).blocked);
assert(all(view,n=>n.text==='12 loved · 4 liked · 8 passed').length);assert(all(view,n=>n.class==='taste-color-dot'&&n.style.background==='#c00').length);
const snapshot=JSON.stringify(state.ratings),originalBoard=JSON.stringify(board),launcher=button(view,'See 24 rated outfits');launcher.onclick();
let dialog=document.body.children.at(-1);assert(dialog.open);assert.equal(all(dialog,n=>n.class==='taste-example').length,4);assert.equal(all(dialog,n=>n.class==='taste-example').length,4,'examples only mount four outfits at a time');assert(all(dialog,n=>n.piece==='shoes').length,'saved accessories are restored in evidence');
button(dialog,'Next').onclick();assert(all(dialog,n=>n.text==='Showing 5–8 of 24 outfits').length);assert(dialog.querySelector('[role=status]').focused);
button(dialog,'Previous').onclick();button(dialog,'Close').onclick();assert.equal(document.body.children.length,0);assert(launcher.focused);
assert.equal(JSON.stringify(state.ratings),snapshot);assert.equal(JSON.stringify(board),originalBoard,'analysis leaves wardrobe and board alone');
launcher.onclick();dialog=document.body.children.at(-1);state.ratings.r23.r=-1;c.labRefresh();assert(all(dialog,n=>n.tag==='h3'&&n.text==='Passed').length,'open evidence follows updated ratings');
state.fantasy=false;map.top.wish=true;c.labRefresh();assert(button(dialog,'Open in Lab').disabled,'evidence cannot silently enable Fantasy');map.top.wish=false;
c.labRefresh();button(dialog,'Open in Lab').onclick();assert.equal(state.lab.mode,'rate');assert.equal(state.lab.cur.sig,'r23');assert.equal(JSON.stringify(board),originalBoard);
state.ratings={one:{ids:['top','b0'],r:0}};const small=el('main');c.labTasteView(small);assert(small.children.at(-1).blocked,'blocked pairs stay accessible before enough ratings exist');
// My Taste is a short summary, not a paginated inventory of qualifying tags.
state.ratings={};
for(let i=0;i<36;i++){
 piece('paged'+i,'one',['black'],Array.from({length:18},(_,n)=>'style'+n));
 for(let j=0;j<2;j++){piece('support'+i+'-'+j,'layer',[],[]);state.ratings['paged'+i+'-'+j]={ids:['paged'+i,'support'+i+'-'+j],r:1,t:i*2+j}}
}
state.lab={mode:'taste'};const paged=el('main');c.labTasteView(paged);
const positive=paged.children.find(n=>n.tag==='section'),favorites=paged.children.find(n=>n.tag==='section'&&n.children[0].text==='Pieces you keep loving');
assert.equal(all(positive,n=>n.class==='taste-pattern').length,1,'tags supported by exactly the same outfits collapse to one observation');
assert.equal(all(favorites,n=>n.class==='taste-piece').length,3,'only three repeat-loved pieces appear even with 36 qualifying pieces');
assert.equal(all(paged,n=>n.tag==='select').length,0,'summary sections do not accumulate additional pages');
const many={};for(let i=0;i<12;i++)many['l:look'+i]={n:12,loved:9,liked:0,passed:3};
assert.equal(c.labTastePatterns(many,true).length,3,'positive takeaways stay bounded as tags accumulate');
for(const x of Object.values(many)){x.loved=0;x.passed=12}
assert.equal(c.labTastePatterns(many,false).length,2,'passed-on takeaways stay bounded');
const supported={'l:tiny':{n:3,loved:3,liked:0,passed:0},'l:consistent':{n:22,loved:20,liked:0,passed:2}};
assert.equal(c.labTastePatterns(supported,true)[0],'l:consistent','a tiny perfect sample does not crowd out a well-supported observation');
state.ratings={};for(let i=0;i<2;i++)state.ratings['remaining'+i]={ids:['top','b'+i],r:1,t:i};
const grid=el('section');c.labTastePagedGrid(grid,['p:top'],'taste-pieces','tastePiecesPage','Favorite pieces',()=>el('article'));
assert.equal(state.lab.tastePiecesPage,0,'shrinking lists clamp remembered pages');
// A single wishlist analysis shares current evidence and stats across all candidates.
const buy={LAB_GOOD:.5,LAB_NEUTRAL:{},SEASONS:[],colLabel:x=>x,labRole:p=>p.role,labRoleName:x=>x,labSim:()=>0,labPair:()=>1};
const buyPool={top:[{role:'top'}],bottom:Array.from({length:12},()=>({role:'bottom'})),one:[],layer:[]};
let entryBuilds=0,statBuilds=0,scores=0;const evidence=Array(10).fill({}),sharedStats={};
buy.labPool=()=>buyPool;buy.labRatingEntries=()=>{entryBuilds++;return evidence};buy.labStats=entries=>{assert.equal(entries,evidence);statBuilds++;return sharedStats};buy.labTaste=(outfit,stats)=>{assert.equal(stats,sharedStats);scores++;return .4};
vm.createContext(buy);vm.runInContext(source.slice(source.indexOf('function buyAnalyze('),source.indexOf('function buyShow(')),buy);
assert(Math.abs(buy.buyAnalyze({role:'top'}).taste-.4)<1e-12);assert.equal(entryBuilds,1);assert.equal(statBuilds,1);assert.equal(scores,8);
buy.buyAnalyze({role:'top'});assert.equal(entryBuilds,2,'a later analysis uses fresh evidence');assert.equal(statBuilds,2);
// A render can pass one evidence snapshot to the count, view, and generator.
const entries=c.labRatingEntries(),originalEntries=c.labRatingEntries;c.labRatingEntries=()=>{throw Error('redundant evidence scan')};
c.labCountText(entries);c.labTasteView(el('main'),entries);c.labGenerate({},null,null,{},entries);c.labRatingEntries=originalEntries;
console.log('My taste: distinct counts, live refresh, positive evidence, bounded observations, evidence deduplication, supported ranking, outfit pages, page jumps/clamping, Fantasy safety, and unchanged board/wardrobe pass.');

// Learned preferences should transfer to other pieces, not memorize one sweater.
vm.runInContext(source.match(/function labSig\(o\)\{[^\n]+/)[0],c);
const patternOutfit={top:{id:'pink-sweater',colors:['pink'],looks:['cozy']},bottom:{id:'pants',colors:['black'],looks:[]}};
assert(c.labTaste(patternOutfit,{'p:pink-sweater':{n:30,s:30}})>0);
assert.equal(c.labTaste(patternOutfit,{'p:pink-sweater':{n:30,s:30}},true),0,'generation ignores direct piece-ID rewards');
assert(c.labTaste(patternOutfit,{'l:cozy':{n:30,s:30}},true)>0,'broader learned preferences remain useful');
const repeated={top:patternOutfit.top,bottom:patternOutfit.bottom};
state.lab.hist=[{o:repeated},{o:repeated}];
const recent=c.labRecentUse([{outfit:repeated}]);assert.equal(recent['pink-sweater'],1,'history and the latest rating do not count the same outfit repeatedly');
assert(c.labRepeatPenalty(repeated,recent,null)>0);
assert.equal(c.labRepeatPenalty({top:patternOutfit.top},recent,'pink-sweater'),0,'an explicit anchor is exempt');
assert.equal(c.labRepeatPenalty({top:{id:'fresh'}},recent,null),0);
state.lab.hist=[];
const maxHistory=Array.from({length:30},(_,i)=>({outfit:{one:{id:'old-'+i}}}));
assert.equal(Object.keys(c.labRecentUse(maxHistory)).length,8,'only a bounded recent window influences variety');
// Exercise the actual generator over a wardrobe with a heavily loved sweater.
const generatorMath=Object.create(Math);let seed=73471;generatorMath.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const diversity={Math:generatorMath,state:{tab:'lab',lab:{hist:[]},ratings:{}},labParts:o=>[o.top,o.bottom,o.one].filter(Boolean),labSig:o=>[o.top,o.bottom,o.one].filter(Boolean).map(p=>p.id).sort().join('+'),labFeat:o=>[o.top,o.bottom,o.one].filter(Boolean).flatMap(p=>['p:'+p.id,...(p.looks||[]).map(l=>'l:'+l)]),labStats:c.labStats,labRatingEntries:()=>[],labBase:o=>o.top?.bad?.5:.9};
const tops=Array.from({length:12},(_,i)=>({id:'top-'+i,looks:[i<4?'cozy':'other']})),bottoms=Array.from({length:20},(_,i)=>({id:'bottom-'+i}));
diversity.labDraw=(pool,anchorId)=>({top:anchorId?tops.find(p=>p.id===anchorId):tops[Math.floor(generatorMath.random()*tops.length)],bottom:bottoms[Math.floor(generatorMath.random()*bottoms.length)]});
vm.createContext(diversity);
vm.runInContext(source.slice(source.indexOf('function labTaste(o,'),source.indexOf('/* ---------- accessories in the Outfit Lab')),diversity);
const learned=Array.from({length:30},(_,i)=>({key:'old-'+i,record:{r:1,t:30-i},features:['p:top-0','l:cozy'],outfit:{top:tops[0],bottom:{id:'previous-'+i}}}));
const counts={};let last=null,consecutive=0;
for(let i=0;i<60;i++){
 const o=diversity.labGenerate({},null,null,{},learned);assert(o);assert.equal(o.algorithmVersion,'2.0.0');
 counts[o.top.id]=(counts[o.top.id]||0)+1;if(last===o.top.id)consecutive++;last=o.top.id;
 diversity.state.lab.hist.push({o});if(diversity.state.lab.hist.length>25)diversity.state.lab.hist.shift();diversity.state.ratings[o.sig]={r:1};
}
assert(Object.keys(counts).length>=10,'a strongly loved sweater does not hide most alternative tops');
assert((counts['top-0']||0)<=12,'the repeatedly loved sweater stays below one fifth of this deterministic sample');
assert(consecutive<=12,'piece rotation limits back-to-back repeats without making small wardrobes impossible');
// A tight wardrobe and an explicit anchor remain usable.
diversity.labDraw=()=>({top:tops[0],bottom:bottoms[0]});diversity.state.ratings={};
assert(diversity.labGenerate({},null,'top-0',{},learned),'recency is a soft penalty, not a dead end');
assert.equal(diversity.labGenerate({},null,'top-0',{[diversity.labSig({top:tops[0],bottom:bottoms[0]})]:1},learned),null,'already shown combinations stay excluded');
diversity.labDraw=()=>({top:{id:'bad',bad:true},bottom:bottoms[0]});
assert.equal(diversity.labGenerate({},null,null,{},learned),null,'exploration cannot bypass minimum compatibility');
assert.equal(c.LAB_TASTE_SUMMARY_VERSION,'2.0.0');
console.log('Lab variety: transferable preferences, bounded recency, diverse synthetic picks, anchors, compatibility, and algorithm versions pass.');

// Persist the generator's version without assigning today's version to old outfits.
const ratingWrites=[],ratingState={ratings:{},lab:{seen:{}}};
ratingState.db={collection:()=>({doc:id=>({set:rec=>{ratingWrites.push({id,rec});return Promise.resolve()},delete:()=>Promise.resolve()})})};
const ratingContext={state:ratingState,needDb:()=>false,labPush:()=>{},labParts:o=>[o.top,o.bottom].filter(Boolean),labAccRec:()=>null,labRender:()=>{},toastAct:()=>{},toast:()=>{},labToBoard:()=>{},Date};
vm.createContext(ratingContext);vm.runInContext(source.slice(source.indexOf('function labRate(o,val){'),source.indexOf('function labBlock(o){')),ratingContext);
ratingContext.labRate({sig:'versioned',top:tops[0],bottom:bottoms[0],algorithmVersion:'2.0.0'},1);
assert.equal(ratingWrites[0].rec.algorithmVersion,'2.0.0');
ratingContext.labRate({sig:'legacy',top:tops[1],bottom:bottoms[1]},0);
assert.equal(ratingWrites[1].rec.algorithmVersion,undefined,'old/manual outfits remain unversioned');
