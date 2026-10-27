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
