const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/closet-lint.html'),'utf8');
const save=source.slice(source.indexOf('function labDoSave(o,pieces,nm){'),source.indexOf('function labToBoard(o){'));
const route=source.slice(source.indexOf('function labSaveOrPlan(o){'),source.indexOf('function labSaveOutfit(o){'));
(async()=>{
 const calls=[],writes=[],board={name:'An existing board',pieces:[{id:'untouched'}]};let fail=false,afterSave;
 const ctx={releaseOutfitPreview(){},paintWorkspaceRecovery(){},state:{outfits:{},board,ratings:{'a+b':{r:1}}},Date,uniqOutfitName:n=>n,labSig:()=> 'a+b',labRender:()=>calls.push('render'),toast:m=>calls.push(m),toastAct:(message,label,action)=>{afterSave=action},planOutfitDialog:id=>calls.push('plan:'+id),labSaveOutfit:()=>calls.push('save'),
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
  appendChild(n){if(n.tag==='fragment')this.children.push(...n.children);else this.children.push(n);return n}get isConnected(){return true}setAttribute(k,v){this[k]=v}
  set textContent(v){this.text=v;this.children=[]}get textContent(){return this.text||''}
  focus(options){this.focused=options}
 }
 const all=(n,p)=>[...(p(n)?[n]:[]),...(n.children||[]).filter(x=>typeof x==='object').flatMap(x=>all(x,p))];
 const view=new Node('main'),find=id=>all(view,n=>n.id===id)[0],buttons=()=>all(view,n=>n.tag==='button');
 const state={tab:'saved',outfits:{a:{name:'Blue look',fav:true,updatedAt:2,pieces:[]},b:{name:'Red look',updatedAt:1,pieces:[]}},ratings:{},db:{}};
 let infoCalls=0;
 const c={releaseOutfitPreview(){},photoState:{loaded:0},memoRun:(fn,self,args)=>fn.apply(self,args),document:{createDocumentFragment:()=>new Node('fragment')},state,$:id=>id==='view-saved'?view:find(id),el:(...args)=>new Node(...args),byId:()=>({}),byIdA:()=>({}),
  chip:(text,on,onclick)=>new Node('button',{text,onclick,'aria-pressed':String(!!on)}),wearAny:()=>false,
  ofInfo:o=>{infoCalls++;return ({nWorn:o.name==='Blue look'?3:0,colors:{},sizes:{},items:[],ids:[],last:'',rating:null})},ofMatch:(o,i,S)=>(!S.fav||o.fav)&&(!S.q||o.name.toLowerCase().includes(S.q.toLowerCase())),ofScore:()=>0,
  ofCard:o=>new Node('article',{outfit:o.name}),curSeason:()=> 'fall',histDraw:()=>{c.historyDrawn=true},COLORS:{},SEASONS:[],STYLES:[],LOOKS:[]};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function ofState(){'),source.indexOf('function ofInfo('))+'\n'+source.slice(source.indexOf('var _ofDerived='),source.indexOf('function loadImg(')),c);
 c.renderSaved();assert.equal(find('of-total').textContent,'2');const search=find('ofq');assert(search);assert.equal(all(view,n=>n.text==='Open outfit board').length,0);
 const getSort=()=>all(view,n=>n['aria-label']==='Sort outfits')[0];
 assert.equal(getSort().class,'of-sort');assert.equal(getSort().children[0].text,'↓ Newest');
 search.oninput({target:{value:'Blue'}});assert.equal(find('of-total').textContent,'1 of 2');assert.equal(find('ofq'),search,'typing redraws results without replacing the focused input');assert.equal(all(view,n=>n.tag==='article').length,1);
 getSort().onchange({target:{value:'worn'}});assert.equal(state.of.sort,'worn');assert.equal(state.of.q,'Blue');
 find('of-filter-toggle').onclick();assert.equal(state.of.open,true);assert.equal(find('of-filter-toggle')['aria-expanded'],'true');assert(find('of-filter-options'));assert(find('of-filter-toggle').focused.preventScroll);
 buttons().find(n=>n.text.startsWith('♡ Favorites')).onclick();assert.equal(state.of.fav,true);assert.equal(find('of-filter-toggle')['aria-pressed'],'true','expanded filter panel retains active styling without selected panel filters');
 assert.equal(all(find('of-filter-toggle'),n=>n.class==='of-filter-count').length,0,'quick filters do not count as panel filters');
 find('of-filter-toggle').onclick();assert.equal(find('of-filter-toggle')['aria-pressed'],'false','closing an empty panel clears its active styling');find('of-filter-toggle').onclick();
 buttons().find(n=>n.text==='Needs tags').onclick();assert.equal(state.of.untagged,true);assert.equal(find('of-filter-toggle')['aria-pressed'],'true');assert.equal(all(find('of-filter-toggle'),n=>n.class==='of-filter-count')[0].text,'1');
 buttons().find(n=>n.text==='Clear filters').onclick();assert.equal(state.of.q,'');assert.equal(state.of.fav,false);assert.equal(state.of.sort,'worn');assert.equal(state.of.open,true);assert.equal(search.value,'');
 for(const [sort,expected] of [['old','Red look'],['new','Blue look'],['most','Blue look'],['least','Red look'],['name','Blue look']]){getSort().onchange({target:{value:sort}});assert.equal(all(view,n=>n.tag==='article')[0].outfit,expected,sort+' uses the expected outfit order')}
 let created=false,navigated=false;c.startNewOutfit=(piece,done)=>{assert.equal(piece,null);created=true;done()};c.setTab=tab=>{assert.equal(tab,'outfits');navigated=true};buttons().find(n=>n.text==='＋ New outfit').onclick();assert(created&&navigated,'New outfit uses the protected board action before navigation');
 state.ofView='history';c.renderSaved();assert(c.historyDrawn);assert.equal(find('ofq'),undefined,'Calendar does not render outfit search/filter controls');
 console.log('Saved-outfit toolbar: retained search input, sort/filter actions, disclosure focus, safe clear, and Calendar separation pass.');
 state.ofView='outfits';c.renderSaved();
 assert.equal(infoCalls,2,'search and sorting reuse derived outfit metadata');
 state.outfits.a.name='Changed look';c.ofDraw();assert.equal(infoCalls,4,'in-place outfit edits invalidate the cache');
 state.profile={wear:{tops:['M']}};c.ofDraw();assert.equal(infoCalls,6,'fit changes invalidate the cache');
 state.ratings.changed={r:1};c.ofDraw();assert.equal(infoCalls,8,'rating changes invalidate the cache');
 state.of.q='';state.of.open=false;state.outfits=Object.fromEntries(Array.from({length:105},(_,i)=>['o'+i,{name:'Look '+i,pieces:[],updatedAt:i}]));c.ofDraw();
 assert.equal(all(view,n=>n.tag==='article').length,40,'first draw mounts a bounded batch');
 let more=buttons().find(b=>b.text==='Load more outfits');more.onclick();assert.equal(all(view,n=>n.tag==='article').length,80);more.onclick();assert.equal(all(view,n=>n.tag==='article').length,105);assert.equal(more.hidden,true);
 c.ofState().q='Look 104';c.ofDraw();assert.equal(all(view,n=>n.tag==='article').length,1,'search covers outfits outside previously rendered batches');

}

{
 const c={state:{ratings:{'a+b':{r:1},a:{r:0}}},byId(){throw Error('A supplied piece map must be reused')},labRole:p=>p.role};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function oSig('),source.indexOf('function ratingEmoji(')),c);
 const map={a:{role:'top'},b:{role:null}};
 assert.equal(c.oRating({pieces:[{id:'a'},{id:'b'}]},map),1,'exact outfit ratings retain precedence');
 delete c.state.ratings['a+b'];assert.equal(c.oRating({pieces:[{id:'a'},{id:'b'}]},map),0,'legacy role-only ratings retain their fallback');
 c.state.ratings={};assert.equal(c.oRating({pieces:[{id:'a'}],rating:-1},map),-1,'stored outfit ratings remain available');
}
