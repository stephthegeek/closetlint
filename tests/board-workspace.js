const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
function fn(n){const a=source.indexOf('function '+n+'('),b=source.indexOf('\nfunction ',a+1);assert.ok(a>=0,n);return source.slice(a,b)}
(async()=>{
 const draft={id:null,name:'Dinner',pieces:[{id:'a',x:1,y:2,w:30,z:1}]},saved={id:'saved',name:'Other outfit',pieces:[{id:'b',x:5,y:6,w:40,z:1}],wearLog:[{d:'2026-10-01'}]},writes=[],nodes={},messages=[];let confirm,undo,fail=false,release;
 const ctx={paintWorkspaceRecovery(){},state:{board:draft,capsDone:true,outfits:{saved},db:{collection:()=>({doc:id=>({set:async doc=>{if(release)await new Promise(r=>release=r);if(fail)throw Error('Synthetic save failure');writes.push({id,doc:JSON.parse(JSON.stringify(doc))})}})})}},$:id=>nodes[id]||(nodes[id]={setAttribute(k,v){this[k]=v},classList:{toggle(){}},querySelector(){return nodes.badge||(nodes.badge={})},getAttribute(k){return this[k]}}),oMetaFrom:o=>o.notes?{notes:o.notes}:{},boardSig:b=>JSON.stringify(b.pieces),persistBoard(){ctx.persisted=JSON.parse(JSON.stringify(ctx.state.board))},setTab:t=>{ctx.state.tab=t},askConfirm:(m,l,cb)=>{confirm={m,l,cb}},needDb:()=>false,toast:m=>messages.push(m),toastAct:(m,l,cb)=>{messages.push(m);undo=cb},uniqOutfitName:(n,id)=>Object.keys(ctx.state.outfits).some(k=>k!==id&&ctx.state.outfits[k].name===n)?n+' (2)':n,round2:n=>n,Date,localStorage:{getItem(){return JSON.stringify(ctx.persisted)}},window:{},boardHasContent:()=>ctx.state.board.pieces.length>0,addPiece(p){ctx.state.board.pieces.push({id:p.id});ctx.persistBoard();ctx.renderBoard()},renderBoard(){ctx.paintOMeta();ctx.paintBoardContext()}};
 vm.createContext(ctx);vm.runInContext(['setOutfitSave','paintBoardSaveStatus','adoptBoard','copyBoardPieces','boardDocument','mapPiecesForDoc','ofOpen','outfitEditorDirty','saveOutfit','flushBoardCheckpoint','paintOMeta','paintCalendarPlanning','paintBoardContext','freshBoard','startNewOutfit','boardNeedsProtection','restoreBoard','workspaceKey','workspaceSnapshot','restoreWorkspace','workspaceBoardSignature','boardMatchesSaved','pruneWorkspaceDrafts','keepWorkspaceDraft','switchWorkspace','editSavedOutfit','returnWorkspace'].map(fn).join('\n'),ctx);
 assert.equal(await ctx.saveOutfit(),true);const id=draft.id;assert.ok(id);assert.equal(ctx.state.board,draft);assert.equal(writes.length,1);assert.match(messages.at(-1),/Further saves update/);
 draft.pieces[0].x=55;await ctx.saveOutfit();assert.equal(writes.length,2);assert.equal(writes[1].id,id,'second Save updates the same outfit');assert.equal(Object.keys(ctx.state.outfits).length,2);assert.match(messages.at(-1),/Updated outfit/);
 ctx.restoreBoard();assert.equal(ctx.state.board.id,id,'reload retains the linked outfit');await ctx.saveOutfit();assert.equal(writes.at(-1).id,id);
 const original=JSON.stringify(ctx.state.outfits[id]);await ctx.saveOutfit(true);const copyId=ctx.state.board.id;assert.notEqual(copyId,id);assert.equal(JSON.stringify(ctx.state.outfits[id]),original);assert.match(messages.at(-1),/editing the copy/);await ctx.saveOutfit();assert.equal(writes.at(-1).id,copyId);
 ctx.state.board.pieces[0].x=88;fail=true;assert.equal(await ctx.saveOutfit(),false);assert.equal(ctx.state.board.id,copyId);assert.equal(ctx.state.board.pieces[0].x,88);assert.equal(ctx.state.boardSaving,false);fail=false;
 ctx.startNewOutfit();assert.equal(confirm,undefined,'New waits for the failed save to be retried');assert.equal(ctx.state.board.id,copyId);await ctx.saveOutfit();ctx.state.board.notes='Keep these unfinished notes';ctx.persistBoard();
 ctx.startNewOutfit();assert.match(confirm.m,/kept as a draft/);assert.equal(ctx.state.board.id,copyId);confirm.cb();assert.equal(ctx.state.board.id,null);assert.equal(ctx.state.board.pieces.length,0);assert.equal(nodes.osave['aria-label'],'Save outfit');assert.equal(nodes.onew['aria-label'],'New outfit');undo();assert.equal(ctx.state.board.id,copyId);assert.equal(ctx.state.board.pieces[0].x,88,'Undo restores unsaved layout and saved identity');assert.match(messages.at(-1),/Returned to editing/);
 ctx.startNewOutfit();confirm.cb();ctx.state.board.pieces.push({id:'new'});undo();assert.equal(ctx.state.board.id,null,'Undo asks before replacing a changed new draft');assert.match(confirm.m,/Unsaved changes/);confirm.cb();assert.equal(ctx.state.board.id,copyId);
 await ctx.saveOutfit();await ctx.editSavedOutfit(saved.id);assert.equal(ctx.state.board.id,'saved');assert.notEqual(ctx.state.board.pieces[0],saved.pieces[0]);ctx.state.board.name='Revised';await ctx.saveOutfit();assert.equal(writes.at(-1).id,'saved');assert.deepEqual(writes.at(-1).doc.wearLog,[{d:'2026-10-01'}]);assert.equal(ctx.outfitEditorDirty(),false);
 const cleanSaved=ctx.state.board;ctx.startNewOutfit();assert.equal(ctx.state.board,cleanSaved,'New warns even when the saved outfit has no unsaved edits');assert.match(confirm.m,/saved outfit stays unchanged/);confirm.cb();assert(ctx.state.newOutfitUndo,'Undo new remains accessible after the toast');ctx.state.newOutfitUndo.undo();assert.equal(ctx.state.board,cleanSaved);assert.equal(ctx.state.newOutfitUndo,null);
 ctx.state.boardSaving=true;const before=ctx.state.board;ctx.startNewOutfit();assert.equal(ctx.state.board,before);assert.equal(await ctx.saveOutfit(),false);ctx.state.boardSaving=false;
 const badge=nodes.badge;ctx.paintBoardContext();assert.equal(badge.textContent,'1');assert.equal(nodes['go-board']['aria-label'],'Board (1 piece)');
 // Successful writes must not erase a name typed while the save was in flight.
 release=true;const pending=ctx.saveOutfit();assert.equal(await ctx.saveOutfit(),false,'double Save during a pending write cannot create a duplicate');ctx.state.board.name='Typed during save';release();release=null;await pending;assert.equal(ctx.state.board.name,'Typed during save');assert.equal(ctx.outfitEditorDirty(),true);
 console.log('Board: repeat Save updates, copy isolation, linked reload, protected New/Undo, pending and failed saves, wear history, and explicit labels pass.');
})().catch(e=>{console.error(e);process.exit(1)});

// Board defaults stay white independently of theme; explicit outfit colors survive.
{
 const colors={state:{board:{}}};vm.createContext(colors);vm.runInContext(fn('bst')+'\n'+fn('boardBgc'),colors);
 assert.equal(colors.boardBgc(),'#FFFFFF');
 colors.state.board.st={bg:{t:'plain',c:'#F3B5D1'}};assert.equal(colors.boardBgc(),'#F3B5D1');
 colors.state.board.st={bg:{t:'linen'}};assert.equal(colors.boardBgc(),'#FFFFFF','texture without an explicit color uses white');
 colors.state.board={};assert.equal(colors.boardBgc(),'#FFFFFF','a fresh board does not inherit the previous outfit color');
}

// Major board design changes confirm before altering layouts and remain undoable.
{
 const original={id:'saved-board',name:'Keep my title',pieces:[{id:'a',x:7,y:11,w:30,z:1,rot:17,clip:[[0,0],[90,0],[90,90]],zm:2,px:.1,py:.2}],st:{bg:{c:'#ffddcc'}},texts:[{t:'Keep text'}]};
 const clone=x=>JSON.parse(JSON.stringify(x)),state={board:clone(original),sel:0,outfits:{saved:clone(original)}};let confirmation,action;const listeners={},messages=[];
 const c={state,JSON,Object,Math,Set,COLL_MAX:12,clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),collN:()=>state.board.lay.n,collFamOk:()=>true,collCancel:()=>{},renderBoard:()=>{},persistBoard:()=>{c.persisted=clone(state.board)},toast:m=>messages.push(m),toastAct:(m,l,cb)=>{messages.push(m);action=cb},askConfirm:(m,l,cb)=>confirmation={m,l,cb},$:id=>({addEventListener:(event,cb)=>listeners[id]=cb}),csPiece:()=>state.board.pieces[0],selectSlot:()=>{},paintCollBar:()=>{},byIdA:()=>({a:{ar:1}}),boardAR:()=>1,bst:()=>state.board.st||{},decorInset:()=>0,tidyRole:()=> 'up',round2:n=>n};
 vm.createContext(c);vm.runInContext(['boardDesignSnapshot','boardDesignChange','collOn','collOff','setLay','collAdd','collSwap','setSt','tidyBoard'].map(fn).join('\n'),c);
 c.collOn();assert.equal(state.board.lay,undefined,'Collage does not change anything before confirmation');confirmation.cb();assert(state.board.lay);action();assert.deepEqual(state.board,original,'Undo restores the complete prior layout');
 c.collOn(true);c.setLay({k:'bento'});assert.equal(state.board.lay.k,'arches');confirmation.cb();assert.equal(state.board.lay.k,'bento');action();assert.equal(state.board.lay.k,'arches');
 const collage=clone(state.board);c.collOff();assert(state.board.lay);confirmation.cb();assert.equal(state.board.lay,undefined);action();assert.deepEqual(state.board,collage);
 state.board.pieces[0].c=1;c.collOff(true);assert.equal(state.board.lay,undefined);assert.equal(state.board.pieces[0].rot,undefined);action();assert.equal(state.board.lay.k,'arches');assert.equal(state.board.pieces[0].rot,17,'Undo restores the layout before an automatic Freehand rearrangement');
 c.setLay({s:4});const undoDesign=action;state.board.pieces[0].x=99;undoDesign();assert.equal(state.board.pieces[0].x,99,'later changes require confirmation before Undo replaces them');confirmation.cb();assert.equal(state.board.pieces[0].x,7);
 c.setLay({s:5});state.board.name='Title changed later';state.board.id='new-saved-id';action();assert.equal(state.board.name,'Title changed later');assert.equal(state.board.id,'new-saved-id','design Undo never rewrites saved-outfit identity');
 const same=state.board;c.setLay({s:6});state.board={id:null,name:'Different board',pieces:[]};action();assert.equal(state.board.name,'Different board','Undo cannot overwrite another board');state.board=same;
 c.setLay({s:7});state.boardSaving=true;action();assert.equal(state.board.lay.s,7,'Undo waits for pending saves');state.boardSaving=false;
 state.collRep=0;state.cvis=[0];const beforeReplace=clone(state.board.pieces);c.collAdd({id:'replacement'});assert.equal(state.board.pieces[0].id,'replacement');action();assert.deepEqual(state.board.pieces,beforeReplace,'replacement Undo restores crop, cut, rotation, and original piece');
 for(const id of ['creset','scutreset','srotreset']){
  vm.runInContext(source.split('\n').find(line=>line.includes("$('"+id+"').addEventListener('click'")),c);
  state.sel=0;const before=clone(state.board.pieces);listeners[id]();action();assert.deepEqual(state.board.pieces,before,id+' offers a real restoration');
 }
 state.board=clone(original);c.setSt({ar:'1:1',bg:{c:'#ffffff'}});assert.equal(state.board.st.ar,'1:1');action();assert.deepEqual(state.board.st,original.st,'style and aspect-ratio changes can be undone');
 state.board.pieces.push({id:'b',x:9,y:9,w:20,z:2});state.cvis=[0,1];const beforeSwap=clone(state.board.pieces);c.collSwap(0,1);assert.equal(state.board.pieces[0].id,'b');action();assert.deepEqual(state.board.pieces,beforeSwap);
 state.board=clone(original);c.tidyBoard();assert.equal(state.board.pieces[0].rot,17,'Arrange pieces waits for confirmation');confirmation.cb();assert.equal(state.board.pieces[0].rot,undefined);assert.equal(state.tidyUndo.j,JSON.stringify(original.pieces));
 const undoStart=source.indexOf("  $('otidyundo').addEventListener('click'");const undoEnd=source.indexOf("  var fb=$('tfonts');",undoStart);vm.runInContext(source.slice(undoStart,undoEnd),c);
 state.board.pieces[0].x=42;listeners.otidyundo();assert.equal(state.board.pieces[0].x,42);confirmation.cb();assert.deepEqual(state.board.pieces,original.pieces,'Undo arrange warns about later changes, then restores the layout');
 assert.deepEqual(state.outfits.saved,original,'board recovery never changes saved records');
 console.log('Board safety: layout confirmation, complete recovery, later-edit guards, replacements, crops/cuts, saved identity, and arrangement Undo pass.');
}

{
 const design=fs.readFileSync(__dirname+'/../app/scripts/board-design.js','utf8');
 const get=name=>{const start=design.indexOf('function '+name+'('),end=design.indexOf('\n',start);return design.slice(start,design.slice(start,end).endsWith('}')?end:design.indexOf('\n}',start)+2)};
 const saved=['#FFFFFF','#FBFBF8','#F5F1E8','#111111','#D8343A','#2E6FD1'],original=saved.slice(),c={};vm.createContext(c);vm.runInContext(['hex2rgb','cdist','suggestionLab','similarSuggestion','distinctPick'].map(get).join('\n'),c);
 assert(c.similarSuggestion('#FFFFFF','#FBFBF8'));assert(c.similarSuggestion('#FFFFFF','#F5F1E8'));assert(!c.similarSuggestion('#FFFFFF','#D9D9D9'));assert(!c.similarSuggestion('#D8343A','#2E6FD1'));
 const suggestions=Array.from(c.distinctPick(saved,6,85));assert.equal(suggestions.filter(h=>c.similarSuggestion(h,'#FFFFFF')).length,1);assert(suggestions.includes('#D8343A'));assert(suggestions.includes('#2E6FD1'));assert.deepEqual(saved,original);
 console.log('Palette: similar whites consolidate, distinct hues survive, and saved colors stay intact.');
}
