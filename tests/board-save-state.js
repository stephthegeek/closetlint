const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const a=html.indexOf('function '+name+'('),b=html.indexOf('\nfunction ',a+1);return html.slice(a,b)}
function fixture(){
 const nodes={},attempts=[],drafts=[],server={},state={board:{id:null,name:'Original',pieces:[{id:'a',x:1,y:2,w:20,z:1}]},outfits:{},capsDone:true};let fail=false,lost=false,finish;
 const ctx={state,window:{ClosetLintRuntime:{setBoard:b=>drafts.push(JSON.parse(JSON.stringify(b))),boardSaveStatus:()=>({phase:'saved'})}},$:id=>nodes[id]||(nodes[id]={addEventListener(k,f){this[k]=f},classList:{toggle(){}},setAttribute(k,v){this[k]=v}}),needDb:()=>false,toast(){},paintBoardContext(){},console};
 state.db={collection:()=>({doc:id=>({set:doc=>{attempts.push({id,doc:JSON.parse(JSON.stringify(doc))});return new Promise((resolve,reject)=>{finish=()=>{if(!fail||lost)server[id]=JSON.parse(JSON.stringify(doc));if(fail)reject(Error('Synthetic connection failure'));else resolve()}})}})})};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/board-session.js','utf8')+'\n'+fn('paintOMeta'),ctx);
 return {ctx,state,nodes,attempts,drafts,server,setFailure:(value,ack=false)=>{fail=value;lost=ack},finish:()=>finish()};
}
(async()=>{
 // A failed save must retain its target until retried, including through New/Undo New.
 for(const copy of [false,true]){
  const f=fixture(),{ctx,state}=f;let confirmation;
  ctx.askConfirm=(m,l,cb)=>confirmation=cb;ctx.renderBoard=()=>{};ctx.toastAct=()=>{};
  if(copy){state.board.id='source';state.outfits.source=JSON.parse(JSON.stringify(state.board))}
  f.setFailure(true,true);const saving=ctx.saveOutfit(copy);f.finish();await saving;
  const owner=state.board,target=state.outfitSave.id;ctx.startNewOutfit();
  assert.equal(confirmation,undefined,'New cannot strand an unresolved save in a cloned recovery draft');
  assert.equal(state.board,owner);assert.equal(state.outfitSave.id,target);
  f.setFailure(false);const retry=ctx.saveOutfit();f.finish();await retry;assert.equal(f.attempts[1].id,target);
 }
 {
  const f=fixture(),{ctx,state}=f;let confirmation,undo;
  ctx.askConfirm=(m,l,cb)=>confirmation=cb;ctx.renderBoard=()=>{};ctx.toastAct=(m,l,cb)=>undo=cb;
  ctx.startNewOutfit();confirmation();state.board.name='New draft';state.board.pieces=[{id:'b',x:1,y:2,w:20,z:1}];
  f.setFailure(true,true);const saving=ctx.saveOutfit();f.finish();await saving;
  const owner=state.board,target=state.outfitSave.id;confirmation=null;undo();
  assert.equal(confirmation,null,'Undo New cannot replace a board with an unresolved save');assert.equal(state.board,owner);assert.equal(state.outfitSave.id,target);
  f.setFailure(false);const retry=ctx.saveOutfit();f.finish();await retry;undo();
  assert.equal(state.board.name,'Original','Undo New works again after the pending save is recovered');assert.equal(f.server[target].name,'New draft','Undo New leaves the recovered saved outfit intact');
 }
 {
  const f=fixture(),{ctx,state}=f;const saving=ctx.saveOutfit();state.board.name='';ctx.persistBoard();f.finish();await saving;
  assert.equal(state.board.name,'','clearing a title while saving is still a newer edit');assert(ctx.outfitEditorDirty());assert.equal(f.drafts.at(-1).name,'');
 }
 for(const copy of [false,true]){
  const f=fixture(),{ctx,state,nodes,attempts,server}=f;
  if(copy){state.board.id='existing';state.outfits.existing=JSON.parse(JSON.stringify(state.board));server.existing=JSON.parse(JSON.stringify(state.board))}
  f.setFailure(true,true);let promise=ctx.saveOutfit(copy);assert.equal(nodes.osave.disabled,true);assert.match(nodes.osave['aria-label'],/Saving/);assert.match(nodes['board-outfit-status'].textContent,/Saving outfit/);
  state.board.name='Latest edits';state.board.pieces[0].x=77;ctx.persistBoard();f.finish();assert.equal(await promise,false);
  assert.equal(state.board.name,'Latest edits');assert.equal(state.board.pieces[0].x,77);assert.equal(nodes.osave.disabled,false);assert.equal(nodes['board-outfit-retry'].hidden,false);assert.match(nodes['board-outfit-status'].textContent,/edits are still here/);
  const id=attempts[0].id,failedBoard=state.board;ctx.adoptBoard({name:'Another draft',pieces:[]});ctx.paintBoardSaveStatus();assert.equal(nodes['board-outfit-retry'].hidden,true);ctx.adoptBoard(failedBoard);ctx.paintBoardSaveStatus();assert.equal(nodes['board-outfit-retry'].hidden,false,'returning through Undo restores the failed save target');f.setFailure(false);promise=ctx.saveOutfit();assert.equal(await ctx.saveOutfit(),false,'double-click does not issue a second write');f.finish();assert.equal(await promise,true);
  assert.equal(attempts[1].id,id,'uncertain response retry reuses the target identity');assert.equal(server[id].name,'Latest edits');assert.equal(server[id].pieces[0].x,77);assert.equal(Object.keys(server).length,copy?2:1,'retry cannot duplicate an outfit or copy');assert.equal(state.board.id,id);assert.equal(nodes['board-outfit-retry'].hidden,true);assert.match(nodes['board-outfit-status'].textContent,/^Saved$/);
  promise=ctx.saveOutfit();state.board.name='Even newer';ctx.persistBoard();f.finish();await promise;assert.equal(state.board.name,'Even newer');assert.match(nodes['board-outfit-status'].textContent,/Unsaved outfit changes/);
  if(copy)assert.equal(server.existing.name,'Original','copy never overwrites its source');
 }
 {
  const f=fixture(),{ctx,state,nodes}=f;state.board.id='linked';state.outfits.linked=JSON.parse(JSON.stringify(state.board));ctx.ofSave=()=>Promise.resolve(false);
  const editor=fs.readFileSync(__dirname+'/../app/scripts/board-editor.js','utf8'),a=editor.indexOf("  $('ofav').addEventListener"),b=editor.indexOf("  $('odetail').addEventListener",a);vm.runInContext(editor.slice(a,b),ctx);
  await nodes.ofav.click();assert.equal(state.board.fav,true,'failed favorite write retains intended edit');assert.equal(f.drafts.at(-1).fav,true);assert.equal(nodes['board-outfit-retry'].hidden,false);
  const pending=ctx.saveOutfit();f.finish();await pending;assert.equal(f.server.linked.fav,true);
 }
 // A successful outfit save resolves matching recovery snapshots, never different edits.
 {
  const f=fixture(),{ctx,state,nodes}=f,copy=value=>JSON.parse(JSON.stringify(value));
  state.boardDrafts=[{key:'draft:matching',board:copy(state.board)},{key:'draft:notes',board:{...copy(state.board),notes:'Keep these different notes'}},{key:'draft:layout',board:{...copy(state.board),pieces:[{id:'a',x:9,y:2,w:20,z:1}]}},{key:'draft:crop',board:{...copy(state.board),pieces:[{id:'a',x:1,y:2,w:20,z:1,clip:[[0,0],[10,0],[10,10]]}]}},{key:'draft:text',board:{...copy(state.board),texts:[{t:'Keep this text'}]}}];state.previousBoardKey='draft:matching';state.boardKey='draft:matching';
  f.setFailure(true);let saving=ctx.saveOutfit();f.finish();assert.equal(await saving,false);assert.equal(state.boardDrafts.length,5,'failed saves do not resolve recovery work');
  f.setFailure(false);saving=ctx.saveOutfit();f.finish();assert.equal(await saving,true);assert.equal(state.boardDrafts.length,4);assert.equal(state.previousBoardKey,null);assert.equal(state.boardKey,'outfit:'+state.board.id);assert.equal(nodes['board-draft-status'].textContent,'','saved outfits do not also say Draft saved');assert.match(nodes['board-outfit-status'].textContent,/^Saved$/);
  ctx.keepWorkspaceDraft(state.boardKey,state.board);assert.equal(state.boardDrafts.length,4,'leaving an unchanged saved outfit does not recreate its draft');
  state.board.name='Changed after saving';ctx.keepWorkspaceDraft(state.boardKey,state.board);assert.equal(state.boardDrafts.length,5);state.board.notes='Latest notes';ctx.keepWorkspaceDraft(state.boardKey,state.board);assert.equal(state.boardDrafts.length,5,'later edits replace the same recovery entry');assert.equal(state.boardDrafts.at(-1).board.notes,'Latest notes');
  const envelope=ctx.workspaceSnapshot();ctx.restoreWorkspace(envelope);assert.equal(state.boardDrafts.length,5,'reload keeps different recovery edits');
  state.boardDrafts.push({key:'old-draft',board:{pieces:copy(state.outfits[state.board.id].pieces),name:state.outfits[state.board.id].name}});assert.equal(ctx.pruneWorkspaceDrafts(),true,'legacy snapshots can match saved outfits without an ID or identical property order');assert.equal(state.boardDrafts.length,5);assert.equal(ctx.pruneWorkspaceDrafts(),false,'cleanup is idempotent');
  // Changes made during a successful save still need their own recovery snapshot.
  saving=ctx.saveOutfit();state.board.name='Typed during save';f.finish();await saving;assert.equal(state.board.name,'Typed during save');assert(ctx.outfitEditorDirty());ctx.keepWorkspaceDraft(state.boardKey,state.board);assert.equal(state.boardDrafts.at(-1).board.name,'Typed during save');
 }
 const compact=fixture();compact.ctx.paintBoardSaveStatus();assert.equal(compact.nodes['board-outfit-status'].textContent,'');assert.equal(compact.nodes['board-draft-status'].textContent,'Autosaved','routine draft help occupies one short line');
 assert.equal(compact.nodes['board-save-inline'].textContent,'Autosaved');assert.equal(compact.nodes['board-save-summary'].textContent,'Autosaved');assert.equal(compact.nodes['board-draft-status'].hidden,true,'routine status no longer needs a separate row');
 const empty=fixture();empty.state.board={name:'',pieces:[]};empty.ctx.paintBoardSaveStatus();assert.equal(empty.nodes['board-draft-status'].textContent,'','an empty board has no autosave chatter');
 const f=fixture(),{ctx,nodes,state}=f;for(const phase of ['pending','saving','retrying','error','saved']){ctx.window.ClosetLintRuntime.boardSaveStatus=()=>({phase,error:'Disk full'});ctx.paintBoardSaveStatus();assert.equal(nodes['board-draft-retry'].hidden,phase!=='error');if(phase==='error'){assert.match(nodes['board-draft-status'].textContent,/Keep this tab open.*Disk full/);assert.equal(nodes['board-draft-status'].hidden,false);assert.equal(nodes['board-save-inline'].textContent,'','failed saves never retain a stale Autosaved label')}}
 state.db.collection=()=>{throw Error('Synchronous storage failure')};assert.equal(await ctx.saveOutfit(),false);assert.equal(state.boardSaving,false);assert.equal(nodes.osave.disabled,false,'synchronous failures also release the UI');
 console.log('Board save state: uncertain-response retries, stable copy identity, latest edits, duplicate-click protection, persistent failure UI, and synchronous failures pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
