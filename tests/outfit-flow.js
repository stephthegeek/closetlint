const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/closet-lint.html'),'utf8');
const save=source.slice(source.indexOf('function labDoSave(o,pieces,nm){'),source.indexOf('function labToBoard(o){'));
const route=source.slice(source.indexOf('function labSaveOrPlan(o){'),source.indexOf('function labSaveOutfit(o){'));
(async()=>{
 const calls=[],writes=[],board={name:'An existing board',pieces:[{id:'untouched'}]};let fail=false,afterSave;
 const ctx={state:{outfits:{},board,ratings:{'a+b':{r:1}}},Date,uniqOutfitName:n=>n,labSig:()=> 'a+b',labRender:()=>calls.push('render'),toast:m=>calls.push(m),toastAct:(message,label,action)=>{afterSave=action},planOutfitDialog:id=>calls.push('plan:'+id),labSaveOutfit:()=>calls.push('save'),
  };
 ctx.state.db={collection:col=>({doc:id=>({set:async doc=>{assert.equal(col,'outfits');if(fail)throw Error('Disk full');writes.push({id,doc})}})})};
 vm.createContext(ctx);vm.runInContext(save+'\n'+route,ctx);
 const before=JSON.stringify(board),outfit={sig:'a+b'},pieces=[{id:'a',x:1,y:2,w:30,z:1},{id:'b',x:50,y:20,w:20,z:2}];
 ctx.labSaveOrPlan(outfit);assert.equal(calls.at(-1),'save');
 await ctx.labDoSave(outfit,pieces,'Library look');
 assert.equal(writes.length,1);assert.equal(ctx.state.outfits[outfit.savedId].rating,1);assert.equal(JSON.stringify(board),before,'saving a Lab look preserves the open board');
 assert.equal(writes[0].doc.pieces,pieces,'stable piece IDs and layout are preserved');
 ctx.labSaveOrPlan(outfit);assert.equal(calls.at(-1),'plan:'+outfit.savedId,'saved look routes directly to date planning');
 afterSave();assert.equal(calls.at(-1),'plan:'+outfit.savedId,'confirmation shortcut uses the same saved outfit');
 ctx.labSaveOrPlan({savedId:'deleted'});assert.equal(calls.at(-1),'save','a stale saved ID does not open a missing outfit');
 fail=true;const unsaved={sig:'a+b'};await ctx.labDoSave(unsaved,pieces,'Not saved');assert.equal(unsaved.savedId,undefined);assert.match(calls.at(-1),/Could not save/);assert.equal(JSON.stringify(board),before);
 console.log('Outfit flow: save preserves the board and piece IDs, retains ratings, routes to date planning, and handles failed/stale saves.');
})().catch(error=>{console.error(error);process.exit(1)});

// Exercise the saved-outfit toolbar without browser access or personal data.
{
 class Node{
  constructor(tag,attrs,...children){this.tag=tag;Object.assign(this,attrs||{});this.children=children.flat(Infinity).filter(x=>x!=null)}
  appendChild(n){this.children.push(n);return n}setAttribute(k,v){this[k]=v}
  set textContent(v){this.text=v;this.children=[]}get textContent(){return this.text||''}
  focus(options){this.focused=options}
 }
 const all=(n,p)=>[...(p(n)?[n]:[]),...(n.children||[]).filter(x=>typeof x==='object').flatMap(x=>all(x,p))];
 const view=new Node('main'),find=id=>all(view,n=>n.id===id)[0],buttons=()=>all(view,n=>n.tag==='button');
 const state={outfits:{a:{name:'Blue look',fav:true,updatedAt:2,pieces:[]},b:{name:'Red look',updatedAt:1,pieces:[]}},ratings:{},db:{}};
 const c={state,$:id=>id==='view-saved'?view:find(id),el:(...args)=>new Node(...args),byId:()=>({}),byIdA:()=>({}),
  chip:(text,on,onclick)=>new Node('button',{text,onclick,'aria-pressed':String(!!on)}),wearAny:()=>false,
  ofInfo:()=>({colors:{},sizes:{},items:[],ids:[],last:'',rating:null}),ofMatch:(o,i,S)=>(!S.fav||o.fav)&&(!S.q||o.name.toLowerCase().includes(S.q.toLowerCase())),ofScore:()=>0,
  ofCard:o=>new Node('article',{outfit:o.name}),curSeason:()=> 'fall',histDraw:()=>{c.historyDrawn=true},COLORS:{},SEASONS:[],STYLES:[],LOOKS:[]};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function ofState(){'),source.indexOf('function ofInfo('))+'\n'+source.slice(source.indexOf('function ofDraw(){'),source.indexOf('function loadImg(')),c);
 c.renderSaved();const search=find('ofq');assert(search);assert.equal(all(view,n=>n.text==='Open outfit board').length,0);
 const getSort=()=>all(view,n=>n['aria-label']==='Sort outfits')[0];
 assert.equal(getSort().class,'of-sort');assert.equal(getSort().children[0].text,'Newest');
 search.oninput({target:{value:'Blue'}});assert.equal(find('ofq'),search,'typing redraws results without replacing the focused input');assert.equal(all(view,n=>n.tag==='article').length,1);
 getSort().onchange({target:{value:'worn'}});assert.equal(state.of.sort,'worn');assert.equal(state.of.q,'Blue');
 find('of-filter-toggle').onclick();assert.equal(state.of.open,true);assert.equal(find('of-filter-toggle')['aria-expanded'],'true');assert(find('of-filter-options'));assert(find('of-filter-toggle').focused.preventScroll);
 buttons().find(n=>n.text.startsWith('♡ Favorites')).onclick();assert.equal(state.of.fav,true);
 buttons().find(n=>n.text==='Clear filters').onclick();assert.equal(state.of.q,'');assert.equal(state.of.fav,false);assert.equal(state.of.sort,'worn');assert.equal(state.of.open,true);assert.equal(search.value,'');
 state.ofView='history';c.renderSaved();assert(c.historyDrawn);assert.equal(find('ofq'),undefined,'Calendar does not render outfit search/filter controls');
 console.log('Saved-outfit toolbar: retained search input, sort/filter actions, disclosure focus, safe clear, and Calendar separation pass.');
}
