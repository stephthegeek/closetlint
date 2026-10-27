// The board reuses the global photo preview; opening it never saves a board or photo.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/scripts/board-editor.js','utf8');
const code=source.slice(source.indexOf('var boardBackgroundPending='),source.indexOf('function paintSel('));
function fixture(){
 const items={a:{id:'a',photoId:'original-a'},b:{id:'b',photoId:'original-b'}},nodes={},previews=[],messages=[];
 const state={tab:'outfits',board:{pieces:[{id:'a'}]},sel:0,assets:{}},ctx={state,window:{ClosetLintRuntime:{removeBackground(){},backgroundStatus:async()=>({available:true})}},$:id=>nodes[id]||(nodes[id]={}),byIdA:()=>items,csPiece:()=>({id:'b'}),piecePhotos:it=>[{photoId:it.photoId,src:'/_blob/'+it.photoId,cutout:it.cutout}],toast:m=>messages.push(m),openBackgroundPreview:(...args)=>previews.push(args),procCache:{old:true},bgCache:{k:'old'},renderTray(){ctx.trayRenders=(ctx.trayRenders||0)+1},renderBoard(){ctx.boardRenders=(ctx.boardRenders||0)+1}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,state,items,nodes,previews,messages};
}
(async()=>{
 const f=fixture();f.ctx.paintBoardPhotoActions();assert.equal(f.nodes.sremovebg.hidden,false);assert.equal(f.nodes.cremovebg.hidden,false);
 const before=JSON.stringify(f.state.board);assert.equal(await f.ctx.removeBoardBackground(false),true);assert.equal(f.previews[0][0].id,'a');assert.equal(f.previews[0][1].photoId,'original-a');assert.equal(JSON.stringify(f.state.board),before);assert.equal(f.ctx.boardRenders,undefined,'preview alone does not alter the board');
 f.previews[0][2]('cutout');assert.equal(f.ctx.boardRenders,1);assert.equal(f.ctx.trayRenders,1);assert.equal(f.ctx.bgCache.k,'');assert.equal(Object.keys(f.ctx.procCache).length,0);
 assert.equal(await f.ctx.removeBoardBackground(true),true);assert.equal(f.previews[1][0].id,'b','collage uses its selected window');
 f.items.a.cutout=true;f.ctx.paintBoardPhotoActions();assert(f.nodes.sremovebg.hidden);assert.equal(await f.ctx.removeBoardBackground(false),false);delete f.items.a.cutout;
 f.ctx.window.ClosetLintRuntime.backgroundStatus=async()=>({available:false});assert.equal(await f.ctx.removeBoardBackground(false),false);assert.match(f.messages.at(-1),/not set up/);assert.equal(f.previews.length,2);
 let release;f.ctx.window.ClosetLintRuntime.backgroundStatus=()=>new Promise(r=>release=r);const checking=f.ctx.removeBoardBackground(false);await Promise.resolve();assert(f.nodes.sremovebg.disabled);assert.equal(await f.ctx.removeBoardBackground(false),false,'double click cannot start another preview');f.state.board={pieces:[]};release({available:true});assert.equal(await checking,false,'a delayed capability response cannot open the old board selection');assert.equal(f.nodes.sremovebg.disabled,false);
 console.log('Board photo tools: selected freehand/collage source, preview-only behavior, accepted-photo repaint, unavailable/cutout states, and stale selection guards pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
