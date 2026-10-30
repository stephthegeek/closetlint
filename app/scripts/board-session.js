/* Board session boundary: owns document copies, whole-board transitions, draft persistence,
   and saved-outfit writes. Rendering and pointer handlers edit the active board only.
   Keep this in the app closure; storage adapters never own the live editor object. */
var OMETA=['fav','seasons','styles','looks','notes','rating','from','st','texts','lay'];
function adoptBoard(board){
  if(state.boardSaving||state.workspaceBusy){toast('Wait for the outfit to finish saving.');return false}
  state.board=board;state.boardKey=null;
  state.outfitSave=state.outfitSaves&&state.outfitSaves.get(board)||null;
  state.editingOutfit=!!board.id;state.scratchBoard=null;
  state.sel=-1;state.selT=-1;state.selPal=false;state.cs=-1;state.cutIdx=-1;
  state.collRep=null;state.swapFrom=null;state.cvis=[];state.tidyUndo=null;state.designUndo=null;
  if(state.endCut)state.endCut();
  var name=$('oname');if(name)name.value=board.name||'';
  return true;
}
function copyBoardPieces(pieces,map){
  return (pieces||[]).filter(function(p){return p&&p.id&&(!map||map[p.id])}).map(function(p){
    var q={id:p.id,x:p.x,y:p.y,w:p.w,z:p.z};
    if(p.rot)q.rot=p.rot;if(p.clip)q.clip=JSON.parse(JSON.stringify(p.clip));
    if(p.fx)q.fx=1;if(p.fy)q.fy=1;if(p.nf)q.nf=1;if(p.zm)q.zm=p.zm;
    if(p.px!=null)q.px=p.px;if(p.py!=null)q.py=p.py;if(p.c)q.c=1;return q;
  });
}
function boardDocument(board){
  var doc=Object.assign({id:board.id||null,name:board.name||'',pieces:copyBoardPieces(board.pieces)},oMetaFrom(board));
  if(board.calendarPlan)doc.calendarPlan=JSON.parse(JSON.stringify(board.calendarPlan));
  return doc;
}
/* Commit a detached draft snapshot after a document edit, never from painting.
   The runtime owns debouncing, retries, and flush; recovery is read-only. */
function persistBoard(owner){
  if(owner&&owner!==state.board)return;
  var board=boardDocument(state.board);
  board.workspace=workspaceSnapshot();
  if(window.ClosetLintRuntime){if(state.capsDone&&state.db)window.ClosetLintRuntime.setBoard(board);paintBoardSaveStatus();return}
  try{localStorage.setItem('closetlint.board.v1',JSON.stringify(board));state.draftSave={phase:'saved',error:''}}catch(e){state.draftSave={phase:'error',error:'Browser storage is unavailable or full.'}}
  paintBoardSaveStatus();
}
function restoreBoard(){
  try{
    var v=window.ClosetLintRuntime?window.ClosetLintRuntime.board:JSON.parse(localStorage.getItem('closetlint.board.v1')||'null');
    if(v&&Array.isArray(v.pieces)){restoreWorkspace(v.workspace);var recoveredKey=state.boardKey;adoptBoard(boardDocument(v));state.boardKey=recoveredKey}
  }catch(e){}
}
function mapPiecesForDoc(ps){return ps.map(function(p){var o={id:p.id,x:round2(p.x),y:round2(p.y),w:round2(p.w),z:p.z};if(p.rot)o.rot=p.rot;if(p.clip)o.clip=JSON.parse(JSON.stringify(p.clip));if(p.fx)o.fx=1;if(p.fy)o.fy=1;if(p.nf)o.nf=1;if(p.zm)o.zm=round2(p.zm);if(p.px!=null&&p.px!==.5)o.px=round2(p.px);if(p.py!=null&&p.py!==.5)o.py=round2(p.py);if(p.c)o.c=1;return o})}
function boardSig(o){return JSON.stringify([mapPiecesForDoc(o.pieces||[]),o.texts||[],o.st||null,o.lay||null])}
function boardHasContent(){var b=state.board;return b.pieces.length>0||(b.texts||[]).length>0}
function freshBoard(){return adoptBoard({id:null,name:'',pieces:[]})}
function startNewOutfit(piece,onStarted){
  if(state.boardSaving||state.workspaceBusy){toast('Wait for the outfit to finish saving.');return}
  if(state.outfitSave&&state.outfitSave.b===state.board&&state.outfitSave.phase==='error'){toast('Retry the failed outfit save before starting a new outfit. Your edits are still here.');return}
  function start(){
    var old=state.board,oldKey=workspaceKey();
    keepWorkspaceDraft(oldKey,old);
    if(!freshBoard())return;
    state.boardKey=null;workspaceKey();state.previousBoardKey=(state.boardDrafts||[]).some(function(d){return d.key===oldKey})?oldKey:null;
    if(piece)addPiece(piece);else{persistBoard();renderBoard()}
    var created=state.board,signature=JSON.stringify(created);
    var undoNew=function(){
      if(state.boardSaving){toast('Wait for the outfit to finish saving.');return}
      if(state.outfitSave&&state.outfitSave.b===state.board&&state.outfitSave.phase==='error'){toast('Retry the failed outfit save before restoring previous work. Your edits are still here.');return}
      function restore(){if(!adoptBoard(old))return;state.newOutfitUndo=null;state.boardKey=oldKey;state.boardDrafts=(state.boardDrafts||[]).filter(function(d){return d.key!==oldKey});persistBoard();renderBoard();toast(old.id?'Returned to editing "'+(old.name||'Untitled outfit')+'".':'Previous draft restored.')}
      if((state.board!==created||JSON.stringify(state.board)!==signature)&&boardNeedsProtection())askConfirm('Restore the previous board? Unsaved changes on this board will be discarded. Saved outfits stay unchanged.','Restore previous board',restore);else restore();
    };
    state.newOutfitUndo={b:created,undo:undoNew};renderBoard();if(onStarted)onStarted();toastAct('New outfit started. Your saved outfits are unchanged.','Undo',undoNew);
  }
  if(boardHasContent()||state.board.name||state.board.id||state.board.st||state.board.lay)askConfirm('Start a new outfit? '+(boardNeedsProtection()?(state.board.id?'Your latest changes will be kept as a draft.':'Your current board will be kept in Other drafts.'):'The board will be cleared; your saved outfit stays unchanged.')+' Use Undo to bring the previous board back.','New outfit',start);else start();
}
function boardNeedsProtection(){return state.board.id?outfitEditorDirty():boardHasContent()||!!state.board.name}
function newBoardWith(it,fromAdded){startNewOutfit(it)}
function oMetaFrom(o){
  var m={};
  OMETA.forEach(function(k){var v=o&&o[k];if(v===undefined||v===null||v===''||v===false)return;if(Array.isArray(v)&&!v.length)return;m[k]=(k==='st'||k==='texts'||k==='lay')?JSON.parse(JSON.stringify(v)):Array.isArray(v)?v.slice():v});
  return m;
}
function uniqOutfitName(name,exceptId){
  var nm=String(name||'').trim();if(!nm)return nm;
  var low={};Object.keys(state.outfits||{}).forEach(function(k){if(k!==exceptId)low[String((state.outfits[k]||{}).name||'').trim().toLowerCase()]=1});
  if(!low[nm.toLowerCase()])return nm;
  var base=nm.replace(/\s*\(\d+\)$/,''),n=2;
  while(low[(base+' ('+n+')').toLowerCase()])n++;
  return base+' ('+n+')';
}
function setOutfitSave(operation,phase,error){
  operation.phase=phase;operation.error=error||'';state.outfitSave=operation;
  if(!state.outfitSaves)state.outfitSaves=new WeakMap();state.outfitSaves.set(operation.b,operation);
  state.boardSaving=phase==='saving'; // Compatibility guard used by navigation and destructive actions.
}
function saveOutfit(asCopy){
  asCopy=asCopy===true;
  if(state.boardSaving||state.workspaceBusy)return Promise.resolve(false);
  if(needDb())return Promise.resolve(false);
  var b=state.board,previous=state.outfitSave;
  var retry=previous&&previous.b===b&&previous.phase==='error';
  if(retry)asCopy=previous.asCopy;
  var planning=b.calendarPlan,target=planning&&planning.outfitId;
  var editing=retry?previous.editing:!asCopy&&!!state.outfits[b.id||target];
  if(!b.pieces.length){toast('Add a few pieces first');return Promise.resolve(false)}
  var enteredName=(b.name||'').trim(),name0=enteredName||'Untitled outfit';
  var id=retry?previous.id:(!asCopy&&((editing&&b.id)||target))||'o'+Date.now().toString(36);
  if(!editing&&!retry&&(!target||asCopy)){var base=id,n=2;while(state.outfits[id])id=base+'-'+n++;}
  var name=uniqOutfitName(name0,id),renamed=name!==name0;
  var doc=Object.assign({name:name,pieces:mapPiecesForDoc(b.pieces),updatedAt:Date.now()},oMetaFrom(b));
  var old=state.outfits[id];if(old&&old.wearLog)doc.wearLog=old.wearLog;if(old&&old.plans)doc.plans=old.plans;
  if(planning)doc.plans=(doc.plans||[]).filter(function(p){return p.k!==planning.k}).concat([{k:planning.k,d:planning.d}]).sort(function(a,b){return a.d.localeCompare(b.d)});
  // Retry the same record with the newest editor snapshot, including an uncertain first response.
  var operation={b:b,id:id,asCopy:asCopy,editing:editing,planning:!!planning,checkpoint:!!(retry&&previous.checkpoint),phase:'saving',error:''};
  setOutfitSave(operation,'saving');paintOMeta();paintBoardSaveStatus();
  var writing;
  function write(){return state.db.collection('outfits').doc(id).set(doc)}
  if(planning){
    // Preserve the target before writing, so a lost response and reload can retry it too.
    planning.outfitId=id;persistBoard(b);
    // The failed outfit write itself blocks a global flush until that record is retried.
    // Its target was already checkpointed, so retry that write before the final flush.
    writing=Promise.resolve().then(function(){if(!operation.checkpoint)return flushBoardCheckpoint()}).then(function(){operation.checkpoint=true;return write()});
  }else try{writing=write()}catch(e){writing=Promise.reject(e)}
  return Promise.resolve(writing).then(async function(){
    b.id=id;state.lastSavedOutfit=id;
    if((b.name||'').trim()===enteredName)b.name=name;
    if(state.board===b){state.editingOutfit=true;$('oname').value=b.name}
    operation.committed=true;state.outfits[id]=doc;if(state.board===b)state.boardKey='outfit:'+id;
    if(planning){
      // The outfit and date share one write. Never leave newer editor changes behind.
      if(workspaceBoardSignature(b)!==workspaceBoardSignature(doc))throw new Error('Newer edits are still here. Save & schedule again to include them.');
      delete b.calendarPlan;persistBoard(b);
      try{await flushBoardCheckpoint()}
      catch(e){b.calendarPlan=planning;persistBoard(b);throw new Error('The outfit is saved, but board recovery could not finish saving. Retry Save & schedule. '+(e.message||e))}
      if(workspaceBoardSignature(b)!==workspaceBoardSignature(doc)){b.calendarPlan=planning;persistBoard(b);throw new Error('Newer edits are still here. Save & schedule again to include them.')}
    }
    pruneWorkspaceDrafts();setOutfitSave(operation,'saved');persistBoard(b);paintBoardContext();
    if(planning){returnCalendarDay(planning.d);toast('Scheduled for '+histNice(planning.d));return true}
    toast((asCopy?'Saved a copy as "'+name+'". You’re editing the copy.':editing?'Updated outfit "'+name+'".':'Saved outfit "'+name+'". Further saves update this outfit.')+(renamed?' A unique name was added.':''));return true;
  }).catch(function(e){
    setOutfitSave(operation,'error',String(e&&e.message||e));
    toast((operation.committed?'Your outfit is saved, but finishing the save needs a retry.':'Outfit save failed.')+' Your edits are still here. Keep this tab open and use '+(planning?'Retry Save & schedule.':'Retry outfit save.'));return false;
  }).finally(function(){paintOMeta();paintBoardSaveStatus()});
}
function paintBoardSaveStatus(){
  var draft=$('board-draft-status'),outfit=$('board-outfit-status');if(!draft||!outfit)return;
  var runtime=window.ClosetLintRuntime,status=runtime&&runtime.boardSaveStatus?runtime.boardSaveStatus():state.draftSave;
  var phase=status&&status.phase;
  var linked=!!(state.board.id&&state.outfits[state.board.id]),hasWork=linked||boardHasContent()||!!state.board.name;
  var op=state.outfitSave,active=op&&op.b===state.board;
  var outfitBusy=active&&(op.phase==='saving'||op.phase==='error');
  draft.textContent=phase==='error'?(status.conflict?status.error:'Autosave failed. Keep this tab open. '+status.error):phase==='retrying'?'Retrying autosave… Keep this tab open.':!hasWork||outfitBusy?'':phase==='saving'||phase==='pending'?'Autosaving…':phase==='saved'?(linked?'':'Autosaved'):'Autosave status unavailable.';
  var dr=$('board-draft-retry');if(dr){dr.hidden=phase!=='error'||!!status.conflict;dr.disabled=phase==='saving'||phase==='retrying'}
  outfit.textContent=active&&op.phase==='error'?(op.committed?'Outfit saved; finishing needs a retry.':op.asCopy?'Outfit copy not saved.':'Outfit not saved.')+' Your edits are still here. Keep this tab open and retry. '+op.error:active&&op.phase==='saving'?'Saving outfit…':linked&&phase!=='saving'&&phase!=='pending'&&phase!=='error'&&phase!=='retrying'?(outfitEditorDirty()?'Unsaved outfit changes':'Saved'):'';
  var compact=$('board-save-inline');
  if(compact){
    var quiet=phase==='saved'&&!outfitBusy?(draft.textContent==='Autosaved'?'Autosaved':outfit.textContent==='Saved'?'Saved':''):'';
    compact.textContent=quiet;draft.hidden=quiet==='Autosaved';outfit.hidden=quiet==='Saved';
    var summary=$('board-save-summary');if(summary)summary.textContent=quiet;
  }
  var retry=$('board-outfit-retry');if(retry){retry.hidden=!(active&&op.phase==='error');retry.disabled=!!state.boardSaving;retry.textContent=state.board.calendarPlan?'Retry Save & schedule':'Retry outfit save'}
}

function round2(v){return Math.round(v*100)/100}
function outfitEditorDirty(){var saved=state.outfits[state.board.id];return !saved||boardSig(state.board)!==boardSig(saved)||(state.board.name||'')!==(saved.name||'')||JSON.stringify(oMetaFrom(state.board))!==JSON.stringify(oMetaFrom(saved))}
/* Viewing is separate from editing. Workspace drafts travel with board autosave/backups. */
function ofOpen(o,map){
  state.ofPreview=o.id;setTab('saved');
}
function workspaceKey(){return state.boardKey||(state.boardKey=state.board.id?'outfit:'+state.board.id:'draft:'+Date.now().toString(36)+Math.random().toString(36).slice(2))}
function workspaceSnapshot(){
  return {version:1,activeKey:workspaceKey(),previousKey:state.previousBoardKey||null,drafts:(state.boardDrafts||[]).map(function(d){return {key:d.key,updatedAt:d.updatedAt,board:boardDocument(d.board)}})};
}
function restoreWorkspace(w){
  state.boardDrafts=[];state.previousBoardKey=null;state.boardKey=null;
  if(!w||w.version!==1||!Array.isArray(w.drafts))return;
  state.boardKey=typeof w.activeKey==='string'?w.activeKey:null;
  w.drafts.forEach(function(d){if(d&&typeof d.key==='string'&&d.board&&Array.isArray(d.board.pieces)&&d.board.pieces.every(function(p){return p&&typeof p.id==='string'}))state.boardDrafts.push({key:d.key,updatedAt:d.updatedAt,board:boardDocument(d.board)})});
  if(state.boardDrafts.some(function(d){return d.key===w.previousKey}))state.previousBoardKey=w.previousKey;
}
/* Compare the editable content only: timestamps, wear logs, and saved IDs are not edits.
   Sort object keys so older snapshots with a different property order can still be resolved. */
function workspaceBoardSignature(board){
  function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){var o=Object.create(null);Object.keys(v).sort().forEach(function(k){o[k]=stable(v[k])});return o}return v}
  return JSON.stringify(stable(Object.assign({name:board.name||'',pieces:mapPiecesForDoc(board.pieces||[])},oMetaFrom(board))));
}
function boardMatchesSaved(board){
  var signature=workspaceBoardSignature(board);
  return Object.keys(state.outfits||{}).some(function(id){var saved=state.outfits[id];return (!board.calendarPlan||(saved.plans||[]).some(function(p){return p.k===board.calendarPlan.k&&p.d===board.calendarPlan.d}))&&(saved.name||'')===(board.name||'')&&workspaceBoardSignature(saved)===signature});
}
function pruneWorkspaceDrafts(){
  var old=state.boardDrafts||[];
  state.boardDrafts=old.filter(function(d){return !boardMatchesSaved(d.board)});
  if(!state.boardDrafts.some(function(d){return d.key===state.previousBoardKey}))state.previousBoardKey=null;
  return state.boardDrafts.length!==old.length;
}
function keepWorkspaceDraft(key,board){
  state.boardDrafts=(state.boardDrafts||[]).filter(function(d){return d.key!==key});
  if(boardMatchesSaved(board))return;
  if(!(board.pieces||[]).length&&!(board.texts||[]).length&&!board.name&&!board.st&&!board.lay)return;
  state.boardDrafts.push({key:key,updatedAt:Date.now(),board:boardDocument(board)});
}
function switchWorkspace(key,target){
  if(state.boardSaving||state.workspaceBusy){toast('Wait for the current save to finish.');return Promise.resolve(false)}
  if(state.outfitSave&&state.outfitSave.phase==='error'){toast('Retry the failed outfit save before switching work. Your edits are still here.');return Promise.resolve(false)}
  var old=state.board,oldKey=workspaceKey();
  if(oldKey===key){setTab('outfits');return Promise.resolve(true)}
  keepWorkspaceDraft(oldKey,old);persistBoard();state.workspaceBusy=true;toast('Keeping your current work…');
  var runtime=window.ClosetLintRuntime,checkpoint=runtime&&runtime.flush?runtime.flush():state.draftSave&&state.draftSave.phase==='error'?Promise.reject(new Error(state.draftSave.error)):Promise.resolve();
  return checkpoint.then(function(){
    if(state.board!==old)return false;
    // Edits made while the checkpoint saved belong to the preserved draft too.
    keepWorkspaceDraft(oldKey,old);state.workspaceBusy=false;
    if(!adoptBoard(boardDocument(target)))return false;
    state.boardKey=key;state.previousBoardKey=(state.boardDrafts||[]).some(function(d){return d.key===oldKey})?oldKey:null;
    state.boardDrafts=state.boardDrafts.filter(function(d){return d.key!==key});
    persistBoard();setTab('outfits');renderBoard();
    if(state.previousBoardKey)toastAct('Editing "'+(state.board.name||'Untitled draft')+'". Previous work kept.','Return to previous work',function(){returnWorkspace(oldKey)});else toast('Editing "'+(state.board.name||'Untitled outfit')+'".');return true;
  }).catch(function(e){toast('Could not keep your current work. Still on the same board. Retry autosave, then try again. '+(e.message||e));return false}).finally(function(){state.workspaceBusy=false});
}
function createCalendarOutfit(date){
  if(needDb())return Promise.resolve(false);
  var key='calendar:'+Date.now().toString(36)+Math.random().toString(36).slice(2);
  return switchWorkspace(key,{id:null,name:'',pieces:[],calendarPlan:{d:date,k:'p'+key}});
}
function flushBoardCheckpoint(){
  if(window.ClosetLintRuntime&&window.ClosetLintRuntime.flush)return window.ClosetLintRuntime.flush();
  if(state.draftSave&&state.draftSave.phase==='error')return Promise.reject(new Error(state.draftSave.error));
  return Promise.resolve();
}
function returnCalendarDay(date){
  if(state.boardSaving||state.workspaceBusy){toast('Wait for the current save to finish.');return false}
  if(openCalendar(date.slice(0,7))===false)return false;
  histDay(date);return true;
}
function leaveCalendarBoard(){
  if(state.boardSaving||state.workspaceBusy)return Promise.resolve(false);
  var plan=state.board.calendarPlan;if(!plan)return Promise.resolve(false);
  persistBoard();state.workspaceBusy=true;paintCalendarPlanning();
  return Promise.resolve().then(flushBoardCheckpoint).then(function(){state.workspaceBusy=false;return returnCalendarDay(plan.d)}).catch(function(e){toast('Could not keep this draft. Your edits are still here. Retry autosave before leaving. '+(e.message||e));return false}).finally(function(){state.workspaceBusy=false;paintCalendarPlanning()});
}
function paintCalendarPlanning(){
  var box=$('board-calendar');if(!box)return;
  var plan=state.board.calendarPlan;box.hidden=!plan;
  $('view-outfits').classList.toggle('calendar-planning',!!plan);
  if(!plan)return;
  $('board-calendar-date').textContent='Planning for '+histNice(plan.d);
  $('board-calendar-back').disabled=!!(state.boardSaving||state.workspaceBusy);
  $('board-calendar-back').onclick=leaveCalendarBoard;
}
function editSavedOutfit(id){
  var o=state.outfits[id];if(!o){toast('That outfit is no longer available.');return Promise.resolve(false)}
  if(state.board.id===id){setTab('outfits');return Promise.resolve(true)}
  var draft=(state.boardDrafts||[]).find(function(d){return d.board.id===id}),key=draft?draft.key:'outfit:'+id;
  return switchWorkspace(key,draft?draft.board:Object.assign({id:id},boardDocument(o),{id:id}));
}
function returnWorkspace(key){
  var d=(state.boardDrafts||[]).find(function(d){return d.key===(key||state.previousBoardKey)});
  if(!d){toast('That previous draft is no longer available.');return Promise.resolve(false)}
  return switchWorkspace(d.key,d.board);
}
function paintWorkspaceRecovery(){
  var box=$('board-recovery');if(!box)return;box.textContent='';
  if(pruneWorkspaceDrafts())persistBoard();
  var drafts=(state.boardDrafts||[]).filter(function(d){return d.key!==workspaceKey()});
  if(!drafts.length)return;
  var more=el('details',null,el('summary',{text:'Other drafts ('+drafts.length+')','aria-label':'Other drafts ('+drafts.length+')'}));
  drafts.slice().reverse().forEach(function(d){more.appendChild(el('button',{class:'btn small',type:'button',text:'Resume '+(d.board.name||'Untitled draft'),onclick:function(){returnWorkspace(d.key)}}))});box.appendChild(more);
}
