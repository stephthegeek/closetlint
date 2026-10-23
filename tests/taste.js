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
// Every qualifying pattern and favorite piece remains reachable without
// accumulating cards. Page state also clamps safely after ratings are removed.
state.ratings={};
for(let i=0;i<36;i++){
 piece('paged'+i,'one',['black'],Array.from({length:18},(_,n)=>'style'+n));
 for(let j=0;j<2;j++){piece('support'+i+'-'+j,'layer',[],[]);state.ratings['paged'+i+'-'+j]={ids:['paged'+i,'support'+i+'-'+j],r:1,t:i*2+j}}
}
state.lab={mode:'taste'};const paged=el('main');c.labTasteView(paged);
const positive=paged.children.find(n=>n.tag==='section'),favorites=paged.children.find(n=>n.tag==='section'&&n.children[0].text==='Pieces you keep loving');
assert.equal(all(positive,n=>n.class==='taste-pattern').length,6);
let select=all(positive,n=>n.tag==='select')[0];assert(select.children.length>1,'more than six qualifying patterns have pages');
select.onchange({target:{value:String(select.children.length-1)}});assert.equal(button(positive,'Next').disabled,true);assert(all(positive,n=>n.class==='taste-pattern').length<=6);
button(positive,'Previous').onclick();assert.equal(button(positive,'Next').disabled,false);
assert.equal(all(favorites,n=>n.class==='taste-piece').length,6);assert.equal(all(favorites,n=>n.tag==='select')[0].children.length,6);
all(favorites,n=>n.tag==='select')[0].onchange({target:{value:'5'}});assert(all(favorites,n=>n.text==='Showing 31–36 of 36 favorite pieces').length);assert.equal(all(favorites,n=>n.class==='taste-piece').length,6);
state.ratings={};for(let i=0;i<2;i++)state.ratings['remaining'+i]={ids:['top','b'+i],r:1,t:i};
const grid=el('section');c.labTastePagedGrid(grid,['p:top'],'taste-pieces','tastePiecesPage','Favorite pieces',()=>el('article'));
assert.equal(state.lab.tastePiecesPage,0,'shrinking lists clamp remembered pages');
console.log('My taste: distinct counts, live refresh, positive evidence, fixed pattern/piece/outfit pages, page jumps/clamping, Fantasy safety, and unchanged board/wardrobe pass.');
