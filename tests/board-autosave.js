// Synthetic action-level persistence audit. Painting deliberately cannot save here.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=__dirname+'/../',html=fs.readFileSync(root+'app/closet-lint.html','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function fn(name){const a=html.indexOf('function '+name+'('),b=html.indexOf('\nfunction ',a+1);assert(a>=0,name);return html.slice(a,b)}
function fixture(){
 const nodes={},writes=[],messages=[],timers=[],map={a:{id:'a',name:'Top',meta:'Tops',ar:1},b:{id:'b',name:'Skirt',meta:'Bottoms',ar:1}};
 function node(attrs={}){
  const events={},n={...attrs,events,children:[],dataset:{},value:attrs.value||'',style:{setProperty(){}},offsetParent:true,offsetWidth:100,offsetHeight:100,clientWidth:100,clientHeight:100,
   classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]},appendChild(c){this.children.push(c);if(c&&typeof c==='object')c.parentNode=this;return c},append(...cs){cs.forEach(c=>this.appendChild(c))},removeChild(c){this.children=this.children.filter(x=>x!==c);c.parentNode=null},
   querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),focus(){},select(){},blur(){},setPointerCapture(){},
   addEventListener(k,f){(events[k]||(events[k]=[])).push(f)},removeEventListener(k,f){events[k]=(events[k]||[]).filter(x=>x!==f)},fire(k,e={}){(events[k]||[]).slice().forEach(f=>f({type:k,target:n,preventDefault(){},stopPropagation(){},...e}));if(n['on'+k])return n['on'+k]({type:k,target:n,preventDefault(){},stopPropagation(){},...e})}};
  if(attrs.id)nodes[attrs.id]=n;return n;
 }
 const state={board:{id:null,name:'Draft',pieces:[]},outfits:{},capsDone:true,db:{},sel:-1,selT:-1,cs:-1,cutIdx:-1,collRep:null,swapFrom:null,delUndo:[]};
 const ctx={state,console,window:{ClosetLintRuntime:{setBoard:b=>writes.push(clone(b))},matchMedia:()=>({matches:false,addEventListener(){}})},localStorage:{getItem:()=>null,setItem(){}},
  $:id=>nodes[id]||(nodes[id]=node()),el:(tag,attrs,...cs)=>{const n=node(attrs||{});cs.filter(Boolean).forEach(c=>n.appendChild(c));return n},chip:(label,on,click)=>node({text:label,onclick:click}),
  document:{activeElement:null,querySelector:()=>null,createElementNS:()=>node(),addEventListener(k,f){nodeDoc.addEventListener(k,f)}},
  setTimeout:f=>{timers.push(f);return timers.length},clearTimeout(){},toast:m=>messages.push(m),toastAct:(m,l,f)=>{messages.push(m);ctx.undo=f},askConfirm:(m,l,f)=>{ctx.confirm=f},
  byIdA:()=>map,byId:()=>map,DEFAULT_W:{Tops:24,Bottoms:24},BOARD_AR:4/3,clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),needDb:()=>false,
  paintOMeta(){},paintBoardContext(){},renderTabs(){},renderPullBtn(){},setTab:t=>state.tab=t,exportImage(){},openOutfitDetails:(b,f)=>ctx.details=f};
 const nodeDoc=node();vm.createContext(ctx);
 for(const name of ['session','editor','collage','design'])vm.runInContext(fs.readFileSync(root+'app/scripts/board-'+name+'.js','utf8'),ctx);
 const realRender=ctx.renderBoard;
 ctx.renderBoard=()=>{state.cvis=state.board.pieces.map((_,i)=>i)}; // No incidental write allowed.
 ctx.paintSel=()=>{};ctx.selectPiece=i=>state.sel=i;ctx.selectSlot=i=>state.cs=i;ctx.selectText=i=>state.selT=i;
 ctx.renderStylePanel=()=>{};ctx.paintCollBar=()=>{};
 ctx.wireBoard();
 return {ctx,state,nodes,writes,messages,timers,map,node,nodeDoc,realRender};
}
function saved(f,label,action,check){const count=f.writes.length;action();assert(f.writes.length>count,label+' must save without a repaint side effect');assert.deepEqual(f.writes.at(-1),clone(Object.assign(f.ctx.boardDocument(f.state.board),{workspace:f.ctx.workspaceSnapshot()})),label+' persists the current document');if(check)check(f.writes.at(-1));}
{
 const f=fixture(),{ctx,state,writes}=f;
 state.board={id:'saved',name:'Paint',pieces:[{id:'a',x:1,y:2,w:30,z:1}],lay:{k:'arches',n:1},st:{bd:'zig'}};
 state.board.pieces.push({id:'b',x:2,y:3,w:20,z:2});const before=clone(state.board);
 ctx.collBuild=(bd,ps,map,lay)=>{assert.equal(lay.n,2);return [0,1]};ctx.boardPal=()=>[];ctx.applyBoardLook=()=>{};
 f.realRender();f.realRender();assert.equal(writes.length,0,'repainting must not autosave');assert.deepEqual(state.board,before,'painting must not mutate the document');assert.equal(ctx.bst().bd,'wave');assert.equal(state.board.st.bd,'zig');
 ctx.window.ClosetLintRuntime.board=clone(before);ctx.restoreBoard();assert.equal(writes.length,0,'recovery is read-only');
 state.tab='outfits';ctx.renderBoard=f.realRender;ctx.swSoon();f.timers.at(-1)();assert.equal(writes.length,0,'async palette refresh must not autosave');
 ctx.persistBoard(before);assert.equal(writes.length,0,'a stale owner cannot persist a replacement board');
 delete ctx.window.ClosetLintRuntime;let local;ctx.localStorage.setItem=(key,value)=>local=JSON.parse(value);ctx.persistBoard();assert.deepEqual(local,clone(Object.assign(ctx.boardDocument(state.board),{workspace:ctx.workspaceSnapshot()})),'standalone fallback retains edited draft');
}
{
 const f=fixture(),{ctx,state,nodes,map}=f;
 saved(f,'add piece',()=>ctx.addPiece(map.a));state.sel=0;
 for(const id of ['sflipx','sflipy','sframe','sfront','sback'])saved(f,id,()=>nodes[id].fire('click'));
 saved(f,'name',()=>nodes.oname.fire('input',{target:{value:'Changed'}}),b=>assert.equal(b.name,'Changed'));
 saved(f,'favorite',()=>nodes.ofav.fire('click'),b=>assert.equal(b.fav,true));
 for(const id of ['srotreset','scutreset']){const p=state.board.pieces[0];p.rot=20;p.clip=[[0,0],[80,0],[80,80]];saved(f,id,()=>nodes[id].fire('click'));saved(f,id+' Undo',()=>ctx.undo());state.sel=0;}
 saved(f,'delete toolbar',()=>nodes.sremove.fire('click'),b=>assert.equal(b.pieces.length,0));
 saved(f,'delete keyboard Undo',()=>f.nodeDoc.fire('keydown',{ctrlKey:true,key:'z'}),b=>assert.equal(b.pieces.length,1));state.sel=0;
 saved(f,'keyboard delete',()=>f.nodeDoc.fire('keydown',{key:'Delete'}));saved(f,'delete toast Undo',()=>ctx.undo());
 saved(f,'add text',()=>ctx.addText());state.selT=0;
 saved(f,'text content',()=>nodes.ttext.fire('input',{target:{value:'Hello'}}));
 saved(f,'text color',()=>nodes.tcolor.fire('input',{target:{value:'#123456'}}));
 saved(f,'font',()=>nodes.tfonts.children[1].fire('click'));
 saved(f,'alignment',()=>nodes.talign.children[1].fire('click'));
 for(const id of ['toutline','tshadow'])saved(f,id,()=>nodes[id].fire('click'));
 saved(f,'delete text',()=>nodes.tremove.fire('click'));saved(f,'text Undo',()=>nodes.odelundo.fire('click'));
 saved(f,'style',()=>ctx.setSt({bg:{c:'#abcdef'},pal:true}));saved(f,'style Undo',()=>ctx.undo());
 const count=f.writes.length;ctx.boardDesignChange('No change',()=>{});assert.equal(f.writes.length,count,'no-op design does not save');
 saved(f,'arrange',()=>ctx.tidyBoard(true));saved(f,'arrange Undo',()=>nodes.otidyundo.fire('click'));
 ctx.labOutfitFromIds=()=>({});ctx.labRole=()=> 'top';ctx.ltTitle=()=> 'Suggested';
 saved(f,'suggest title',()=>nodes.otitle.fire('click'));saved(f,'title Undo',()=>ctx.undo());
 state.board.pieces=[];nodes.odetail.fire('click');saved(f,'draft details',()=>ctx.details({name:'Details',notes:'Test',seasons:['summer']}));
 const old=clone(state.board);ctx.startNewOutfit();saved(f,'New',()=>ctx.confirm());saved(f,'New Undo',()=>ctx.undo(),b=>assert.deepEqual(clone(ctx.boardDocument(b)),old));
 saved(f,'New with piece',()=>ctx.startNewOutfit(map.a)||ctx.confirm());
 const other={id:'other',name:'Saved outfit',pieces:[{id:'b',x:1,y:1,w:20,z:1}]};const beforePreview=f.writes.length;ctx.ofOpen(other,map);assert.equal(f.writes.length,beforePreview,'viewing an outfit never commits the board');
 const n=f.writes.length;ctx.ofOpen(other,map,true);assert.equal(f.writes.length,n,'revisiting active outfit does not save');
}
{
 const f=fixture(),{ctx,state,nodes,map}=f;ctx.addPiece(map.a);ctx.addPiece(map.b);
 saved(f,'collage switch',()=>ctx.collOn(true));saved(f,'collage switch Undo',()=>ctx.undo());ctx.collOn(true);
 saved(f,'collage layout',()=>ctx.setLay({k:'bento'},true));saved(f,'layout Undo',()=>ctx.undo());
 saved(f,'extra window',()=>ctx.setLay({n:3}));
 const panel=f.node();ctx.collPanel(panel);saved(f,'gutter',()=>nodes.cgut.fire('input',{target:{value:'3.1'}}));
 state.cs=0;for(const id of ['cflipx','cflipy'])saved(f,id,()=>nodes[id].fire('click'));
 saved(f,'zoom',()=>nodes.czoom.fire('input',{target:{value:'1.8'}}));saved(f,'crop reset',()=>nodes.creset.fire('click'));saved(f,'crop Undo',()=>ctx.undo());
 saved(f,'swap',()=>ctx.collSwap(0,1));saved(f,'swap Undo',()=>ctx.undo());
 state.collRep=0;saved(f,'replace',()=>ctx.collAdd(map.b));saved(f,'replace Undo',()=>ctx.undo());
 saved(f,'collage add',()=>ctx.collAdd(map.a));state.cs=0;saved(f,'collage remove',()=>ctx.collRemove());saved(f,'collage remove Undo',()=>ctx.boardUndoDel());
 saved(f,'freehand switch and automatic arrangement',()=>ctx.collOff(true));saved(f,'freehand Undo',()=>ctx.undo());
}
// Deletion Undo restores empty collage windows without overwriting a later layout choice.
{
 const f=fixture(),{ctx,state,map}=f;ctx.addPiece(map.a);ctx.addPiece(map.b);state.board.lay={k:'arches',n:5,g:2};
 const before=clone(state.board);saved(f,'collage delete with empty windows',()=>ctx.boardDel('p',0));
 saved(f,'collage delete Undo restores window count',()=>ctx.boardUndoDel(),b=>assert.deepEqual(clone(ctx.boardDocument(b)),before));
 ctx.boardDel('p',0);state.board.lay.n=7;ctx.boardUndoDel();assert.equal(state.board.lay.n,7,'later window-count edits survive deletion Undo');
 ctx.boardDel('p',0);state.board.lay={k:'bento',n:3,g:4};ctx.boardUndoDel();assert.equal(state.board.lay.n,3,'a later layout is not replaced by deletion Undo');
}
// Real event wiring for drag/resize/rotation, cancel, clicks, and stale callbacks.
for(const kind of ['piece','text','palette','collage'])for(const handle of kind==='collage'?['move']:['move','resize','rotate']){
 const f=fixture(),{ctx,state,nodes,node,map}=f;ctx.addPiece(map.a);state.board.texts=[{t:'Test',x:10,y:10,s:6}];state.board.st={pal:true,px:10,py:20};
 if(kind==='collage')state.board.lay={k:'arches',n:1};
 const pe=node();pe.dataset={i:'0',t:'0',k:'0',sw:'100',sh:'100'};if(kind==='piece')delete pe.dataset.t;
 const image=node();image.offsetWidth=200;image.offsetHeight=200;pe.querySelector=()=>image;
 const classes={contains:c=>handle==='resize'&&(c==='handle'||c==='pres')||handle==='rotate'&&(c==='rot'||c==='prot')};
 const event={pointerId:7,clientX:90,clientY:40,target:{classList:classes,closest:s=>s==='.piece'?pe:null},preventDefault(){}};
 function start(){if(kind==='piece')nodes.board.fire('pointerdown',event);else if(kind==='text')ctx.textPointer(event,pe,nodes.board);else if(kind==='palette')ctx.palPointer(event,pe,nodes.board);else ctx.collPointer(event,pe,nodes.board)}
 start();let count=f.writes.length;pe.fire('pointerup',{pointerId:7});assert.equal(f.writes.length,count,kind+' selection alone does not save');
 start();pe.fire('pointermove',{pointerId:7,clientX:110,clientY:80});assert.equal(f.writes.length,count,'pointer motion is not a network write');saved(f,kind+' '+handle,()=>pe.fire('pointerup',{pointerId:7}));
 start();pe.fire('pointermove',{pointerId:7,clientX:70,clientY:30});saved(f,kind+' cancel keeps visible final position',()=>pe.fire('pointercancel',{pointerId:7}));
 start();pe.fire('pointermove',{pointerId:7,clientX:115,clientY:85});saved(f,kind+' lost capture',()=>pe.fire('lostpointercapture',{pointerId:7}));count=f.writes.length;pe.fire('pointerup',{pointerId:7});assert.equal(f.writes.length,count,'capture loss and up cannot save twice');
 start();const old=state.board;ctx.adoptBoard({id:null,name:'Replacement',pieces:[]});count=f.writes.length;const before=clone(old);pe.fire('pointermove',{pointerId:7,clientX:120,clientY:120});pe.fire('pointerup',{pointerId:7});assert.equal(f.writes.length,count);assert.deepEqual(clone(old),before,'stale gesture never edits old document');
}
{
 const f=fixture(),{ctx,state,nodes,node,map}=f;ctx.addPiece(map.a);state.sel=0;
 const pe=node();pe.dataset={i:'0'};nodes.board.querySelector=()=>pe;
 nodes.scut.fire('click');nodes.board.fire('pointerdown',{pointerId:1,clientX:10,clientY:10});
 for(let i=0;i<7;i++)nodes.board.fire('pointermove',{pointerId:1,clientX:10+i*10,clientY:10+i*5});
 saved(f,'lasso cut',()=>nodes.board.fire('pointerup',{pointerId:1,type:'pointerup'}),b=>assert(b.pieces[0].clip.length>=3));saved(f,'lasso Undo',()=>ctx.undo());
 state.sel=0;nodes.scut.fire('click');nodes.board.fire('pointerdown',{pointerId:1,clientX:10,clientY:10});let count=f.writes.length;nodes.board.fire('pointercancel',{pointerId:1,type:'pointercancel'});assert.equal(f.writes.length,count,'cancelled cutout only repaints');
}
// Entry points outside the board modules must persist too.
{
 const f=fixture(),{ctx,state,map}=f;vm.runInContext(fn('onBoard')+'\n'+fn('plusBtn')+'\n'+fn('labToBoard'),ctx);ctx.paintPlus=()=>{};
 let button=ctx.plusBtn(map.a);saved(f,'closet add',()=>button.fire('click'));saved(f,'closet remove',()=>button.fire('click'));
 ctx.ltTitle=()=> 'Lab draft';ctx.labParts=()=>[map.a];ctx.labAccParts=()=>[map.b];state.ratings={};ctx.labSig=()=> 'sig';
 const old=clone(state.board);ctx.labToBoard({});saved(f,'Lab handoff',()=>ctx.confirm());saved(f,'Lab Undo',()=>ctx.undo(),b=>assert.deepEqual(clone(ctx.boardDocument(b)),old));
}
console.log('Board autosave: paint/recovery isolation; edit, toolbar, keyboard, gesture, collage, text, style, New/Open, Lab, and Undo persistence pass.');
(async()=>{
 const f=fixture(),{ctx,state,nodes,map}=f;let finish,fail=false;const records=[];
 state.db={collection:()=>({doc:id=>({set:doc=>new Promise((resolve,reject)=>{finish=()=>{if(fail)reject(Error('Synthetic failure'));else{records.push({id,doc:clone(doc)});resolve()}}})})})};
 ctx.addPiece(map.a);const pending=ctx.saveOutfit();nodes.oname.fire('input',{target:{value:'Typed while saving'}});nodes.sflipx.fire('click');finish();await pending;
 assert.equal(f.writes.at(-1).name,'Typed while saving');assert.equal(f.writes.at(-1).id,state.board.id,'autosave keeps newly saved identity with newer edits');
 assert.equal(records[0].doc.name,'Draft','explicit outfit save retains its snapshot');
 const count=f.writes.length;fail=true;const failed=ctx.saveOutfit();finish();assert.equal(await failed,false);assert.equal(f.writes.length,count,'failed explicit save does not overwrite the draft');fail=false;
 vm.runInContext(fn('ofSave'),ctx);ctx.ofDraw=()=>{};
 const metadata=ctx.ofSave(state.board.id,{fav:true,notes:'Saved details'});finish();await metadata;assert.equal(f.writes.at(-1).fav,true);assert.equal(f.writes.at(-1).notes,'Saved details');
 const snapshot=clone(f.writes.at(-1));ctx.window.ClosetLintRuntime.board=snapshot;ctx.restoreBoard();assert.deepEqual(clone(ctx.boardDocument(state.board)),clone(ctx.boardDocument(snapshot)),'reload recovers latest committed edits');
 // All non-paint writers run before rendering, so even a failed paint cannot lose an edit.
 ctx.renderBoard=()=>{throw Error('Synthetic paint failure')};assert.throws(()=>ctx.addText(),/paint failure/);assert.equal(f.writes.at(-1).texts.length,1);
 console.log('Board autosave: in-flight Save, failed Save, linked metadata, reload, and persistence before paint pass.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Background touches must leave native page scrolling available; editing gestures retain control.
{
 const f=fixture();let prevented=false;
 f.state.sel=0;
 f.nodes.board.fire('pointerdown',{pointerType:'touch',target:{closest:()=>null},preventDefault(){prevented=true}});
 assert.equal(prevented,false,'touching empty canvas must not cancel page scrolling');
 assert.equal(f.state.sel,-1,'background touch still clears the selection');
 const css=fs.readFileSync(root+'app/styles/board.css','utf8');
 assert.match(css,/\.board\{[^}]*touch-action:pan-y pinch-zoom/,'background allows vertical scrolling and zoom');
 for(const selector of ['.piece','.cslot','.bpal','.board.cutting']){
  const rule=css.split('\n').find(line=>line.startsWith(selector+'{'));
  assert.match(rule,/touch-action:none/,selector+' retains editing gestures');
 }
}
