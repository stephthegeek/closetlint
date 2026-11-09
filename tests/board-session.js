// Exercise the real session module: no personal data, runtime, or DOM needed.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const nodes={},writes=[],messages=[],state={board:{id:null,name:'Draft',pieces:[]},outfits:{},capsDone:true,db:{}};
 const ctx={state,window:{ClosetLintRuntime:{setBoard:value=>writes.push(value)}},$:id=>nodes[id]||(nodes[id]={value:''}),toast:m=>messages.push(m),console};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/board-session.js','utf8'),ctx);
 return {ctx,state,nodes,writes,messages};
}
{
 const {ctx,state,writes}=fixture();const board={id:'saved',name:'Test',pieces:[{id:'a',x:1.234,y:2,w:30,z:1,clip:[[1,2],[3,4],[5,6]]}],st:{bg:{c:'#abcdef'}},texts:[{text:'Hello'}],notes:'Keep'};
 state.outfits.saved=JSON.parse(JSON.stringify(board));ctx.adoptBoard(board);
 state.sel=3;state.selT=2;state.cs=4;state.cutIdx=1;state.collRep=2;state.swapFrom=1;state.tidyUndo={};
 const before=JSON.stringify(state.outfits);ctx.persistBoard();const persisted=writes[0];board.pieces[0].clip[0][0]=99;board.st.bg.c='#000000';board.texts[0].text='Changed';
 assert.equal(persisted.pieces[0].clip[0][0],1);assert.equal(persisted.st.bg.c,'#abcdef');assert.equal(persisted.texts[0].text,'Hello');assert.equal(JSON.stringify(state.outfits),before,'draft edits never modify a saved outfit');
 const next={id:null,name:'Next',pieces:[]};assert.equal(ctx.adoptBoard(next),true);assert.equal(state.editingOutfit,false);for(const key of ['sel','selT','cs','cutIdx'])assert.equal(state[key],-1);for(const key of ['collRep','swapFrom','tidyUndo','designUndo'])assert.equal(state[key],null);
 state.boardSaving=true;assert.equal(ctx.adoptBoard(board),false);assert.equal(state.board,next,'pending saves block every whole-board replacement');state.boardSaving=false;
 ctx.window.ClosetLintRuntime.board=persisted;ctx.restoreBoard();assert.equal(state.editingOutfit,true);assert.equal(state.board.id,'saved');state.board.pieces[0].clip[0][0]=77;assert.equal(persisted.pieces[0].clip[0][0],1,'recovery creates an editor copy');
 const prepared=ctx.mapPiecesForDoc(state.board.pieces);state.board.pieces[0].clip[0][0]=88;assert.equal(prepared[0].clip[0][0],77,'a pending save snapshot owns its cutout points');assert.equal(prepared[0].x,1.23);
}
console.log('Board session: detached draft/save/recovery copies, saved-record isolation, transient reset, and pending-save transition guard pass.');
// Late pointer events must neither edit nor persist a replacement board.
{
 const source=fs.readFileSync(__dirname+'/../app/scripts/board-design.js','utf8');
 const a=source.indexOf('function palPointer('),b=source.indexOf('\nfunction ',a+1),events={},style={setProperty(){}},classes={add(){},contains:()=>false};
 const old={pieces:[],st:{px:10,py:20}},state={board:old};let persists=0;
 const pl={style,classList:classes,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture(){},addEventListener:(k,f)=>events[k]=f,removeEventListener:k=>delete events[k]};
 const ctx={state,selectPiece(){},palPos:()=>({x:10,y:20}),round2:n=>n,clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),persistBoard:()=>persists++};vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
 ctx.palPointer({pointerId:1,clientX:0,clientY:0,target:{classList:classes},preventDefault(){}},pl,{getBoundingClientRect:()=>({width:100,height:100})});
 events.pointermove({pointerId:2,clientX:30,clientY:30});assert.equal(old.st.px,10,'another pointer is ignored');
 events.pointermove({pointerId:1,clientX:5,clientY:5});assert.equal(old.st.px,15,'the owning pointer still works');
 state.board={pieces:[],st:{px:1}};events.pointermove({pointerId:1,clientX:40,clientY:40});assert.equal(old.st.px,15);events.pointerup({pointerId:1});assert.equal(persists,0,'a stale gesture does not persist a different board');assert.equal(Object.keys(events).length,0);
}
{
 const source=fs.readFileSync(__dirname+'/../app/scripts/board-collage.js','utf8');const a=source.indexOf('function collPointer('),b=source.indexOf('\nfunction ',a+1);
 const events={},classes={add(){},remove(){}},image={offsetWidth:150,offsetHeight:150,style:{}},old={pieces:[{id:'a'}]},state={board:old};let timer,ghosts=0,persists=0;
 const ctx={state,selectSlot(){},byIdA:()=>({a:{photo:'synthetic'}}),setTimeout:f=>{timer=f;return 1},clearTimeout(){},el(){ghosts++;return {}},document:{body:{appendChild(){}}},persistBoard:()=>persists++,collImgStyle:()=>'',clamp:(n,a,b)=>Math.max(a,Math.min(n,b))};
 const slot={dataset:{k:'0',i:'0',sw:'100',sh:'100'},clientWidth:100,clientHeight:100,classList:classes,querySelector:()=>image,setPointerCapture(){},addEventListener:(k,f)=>events[k]=f,removeEventListener:k=>delete events[k]};
 vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);ctx.collPointer({pointerId:1,clientX:0,clientY:0,preventDefault(){}},slot,{});
 state.board={pieces:[{id:'b'}]};timer();assert.equal(ghosts,0,'an expired long-press cannot create a ghost on the next board');events.pointermove({pointerId:1,clientX:20,clientY:20});assert.equal(old.pieces[0].px,undefined);events.pointerup({pointerId:1});assert.equal(persists,0);
}
console.log('Board gestures: owning-pointer edits, stale-board isolation, delayed collage callbacks, and listener cleanup pass.');
// Whole-outfit deletion uses the actual session module and saved-record Undo helper.
(async()=>{
 const clone=v=>JSON.parse(JSON.stringify(v));
 function deletionFixture(saved){
  const board={id:saved?'look':null,name:'Review outfit',pieces:[{id:'a',x:1,y:2,w:30,z:1}],notes:'Unsaved note'};
  const state={board,boardKey:saved?'outfit:look':'draft:review',boardDrafts:[],capsDone:true,outfits:{},outfitHistory:{}};
  const records={outfits:{},outfitHistory:{}};if(saved){records.outfits.look={...clone(board),notes:'Saved note',wearLog:[{d:'2026-11-01',ids:['a']}]};state.outfits=clone(records.outfits)}
  const actions=[],writes=[],messages=[];let confirmation,fail='',blocked;
  state.db={collection:col=>({doc:id=>({set:async value=>{writes.push(['set',col,id]);if(fail===col+'.set')throw Error('Synthetic disk full');records[col][id]=clone(value)},delete:async()=>{writes.push(['delete',col,id]);if(blocked)await blocked;if(fail===col+'.delete')throw Error('Synthetic offline');delete records[col][id]}})})};
  const ctx={state,window:{ClosetLintRuntime:{setBoard:value=>records.board=clone(value)}},$:()=>null,toast:m=>messages.push(m),toastAct:(m,l,callback)=>actions.push({m,l,callback}),askConfirm:(m,l,callback)=>confirmation=callback,renderBoard(){},paintOMeta(){},console};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/board-session.js','utf8'),ctx);
  const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),start=html.indexOf('function deleteSavedDocument(');vm.runInContext(html.slice(start,html.indexOf('\nfunction ',start+1)),ctx);ctx.paintBoardSaveStatus=()=>{};
  return {ctx,state,records,actions,writes,messages,confirm:()=>confirmation(),hasConfirmation:()=>!!confirmation,setFail:v=>fail=v,setBlock:v=>blocked=v};
 }
 for(const saved of [false,true]){
  const f=deletionFixture(saved),{ctx,state}=f,original=clone(state.board),key=state.boardKey;
  state.boardDrafts=[{key,board:clone(original)},{key:'draft:other',board:{name:'Keep',pieces:[]}}];
  ctx.deleteBoardOutfit();assert(f.hasConfirmation());assert.equal(state.board.name,original.name,'opening confirmation does not delete');assert.equal(f.writes.length,0);
  await f.confirm();assert.equal(state.board.pieces.length,0);assert.equal(state.boardDrafts.length,1);assert.equal(state.boardDrafts[0].key,'draft:other');assert.equal(f.records.board.pieces.length,0,'empty board is persisted');
  if(saved){assert.equal(f.records.outfits.look,undefined);assert.equal(f.records.outfitHistory.look.wearLog.length,1,'recorded wear survives outfit deletion');assert.deepEqual(f.writes.slice(0,2),[['set','outfitHistory','look'],['delete','outfits','look']]);f.setFail('outfits.set');await f.actions.at(-1).callback();assert.equal(f.actions.at(-1).l,'Retry');assert.equal(state.board.pieces.length,0);f.setFail('')}
  await f.actions.at(-1).callback();assert.equal(JSON.stringify(state.board),JSON.stringify(original),'Undo restores unsaved board edits as well as the saved record');assert(state.boardDrafts.some(d=>d.key===key));assert.equal(f.records.board.name,original.name);
  if(saved){assert.equal(f.records.outfits.look.notes,'Saved note');assert.equal(state.board.notes,'Unsaved note')}
 }
 for(const fail of ['outfitHistory.set','outfits.delete']){
  const f=deletionFixture(true),before=JSON.stringify(f.state.board);f.setFail(fail);f.ctx.deleteBoardOutfit();await f.confirm();assert.equal(JSON.stringify(f.state.board),before);assert(f.records.outfits.look,'failure preserves saved outfit');assert.equal(f.state.boardSaving,false);assert.equal(f.actions.length,0);
 }
 for(const saved of [false,true]){
  const f=deletionFixture(saved);f.ctx.deleteBoardOutfit();f.state.board.notes='New edit';await f.confirm();assert.equal(f.writes.length,0,'stale confirmation cannot delete newer edits');
  f.ctx.deleteBoardOutfit();await f.confirm();f.state.board.name='Newer work';f.state.board.pieces.push({id:'b',x:2,y:3,w:40,z:1});await f.actions.at(-1).callback();assert.equal(f.state.board.name,'Newer work','Undo never replaces newer board work');
  assert(saved?f.records.outfits.look:f.state.boardDrafts.some(d=>d.board.name==='Review outfit'),'restored outfit remains reachable');
 }
 {
  const f=deletionFixture(true);let release;f.setBlock(new Promise(r=>release=r));f.ctx.deleteBoardOutfit();const deleting=f.confirm();await Promise.resolve();await Promise.resolve();assert.equal(f.state.boardSaving,true);assert.equal(f.ctx.freshBoard(),false,'a pending delete blocks switching boards');release();await deleting;assert.equal(f.state.boardSaving,false);
 }
 console.log('Whole-outfit deletion: confirmation, stale edits, draft/saved Undo, preserved wear history, failed deletion/restore retry, newer work and pending-write guards pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
