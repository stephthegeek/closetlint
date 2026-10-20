const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
function fn(n){const a=source.indexOf('function '+n+'('),b=source.indexOf('\nfunction ',a+1);return source.slice(a,b)}
(async()=>{
 const scratch={id:null,name:'Working pile',pieces:[{id:'a',x:1,y:2,w:30,z:1}]},saved={id:'saved',name:'Dinner',pieces:[{id:'b',x:5,y:6,w:40,z:1}]},writes=[],nodes={};let confirm;
 const ctx={state:{board:scratch,outfits:{saved},db:{collection:()=>({doc:id=>({set:async doc=>writes.push({id,doc})})})}},$:id=>nodes[id]||(nodes[id]={}),oMetaFrom:()=>({}),boardSig:b=>JSON.stringify(b.pieces),persistBoard:()=>{},setTab:t=>{ctx.state.tab=t},askConfirm:(m,l,cb)=>{confirm=cb},needDb:()=>false,toast:()=>{},uniqOutfitName:n=>n,round2:n=>n,Date};
 vm.createContext(ctx);vm.runInContext(['ofOpen','outfitEditorDirty','leaveOutfitEditor','saveOutfit'].map(fn).join('\n'),ctx);
 ctx.ofOpen(saved,{b:{}});assert.equal(ctx.state.scratchBoard,scratch);assert.equal(ctx.state.editingOutfit,true);assert.notEqual(ctx.state.board.pieces[0],saved.pieces[0]);
 ctx.state.board.pieces[0].x=99;assert.equal(saved.pieces[0].x,5);let left=false;ctx.leaveOutfitEditor(()=>left=true);assert.equal(left,false);assert.ok(confirm);confirm();assert.equal(left,true);assert.equal(ctx.state.board,scratch);
 await ctx.saveOutfit();assert.equal(ctx.state.board,scratch);assert.equal(scratch.id,null,'save makes an independent outfit, not a linked working board');assert.equal(writes.length,1);
 ctx.ofOpen(saved,{b:{}});ctx.state.board.name='Dinner revised';await ctx.saveOutfit();assert.equal(writes[1].id,'saved');assert.equal(ctx.outfitEditorDirty(),false);ctx.leaveOutfitEditor(()=>{});assert.equal(ctx.state.board,scratch);assert.equal(scratch.pieces[0].id,'a');
 const badge={hidden:true,textContent:''},nav={querySelector:()=>badge,setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]}},label={textContent:''};
 ctx.$=id=>id==='go-board'?nav:label;vm.runInContext(fn('paintBoardContext'),ctx);
 ctx.paintBoardContext();assert.equal(badge.textContent,'1');assert.equal(nav['aria-label'],'Working board (1 piece)');assert.equal(label.textContent,'Working board');
 ctx.state.editingOutfit=true;ctx.state.scratchBoard=scratch;ctx.state.board=saved;ctx.paintBoardContext();assert.equal(badge.textContent,'1','navigation counts the working board, not the open saved outfit');assert.equal(label.textContent,'Editing saved outfit');
 console.log('Board: scratchpad isolation, saved-edit cloning, discard guard, independent saves and return to scratchpad pass.');
})().catch(e=>{console.error(e);process.exit(1)});
