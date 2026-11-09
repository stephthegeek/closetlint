/* Recoverable deletion stays unchanged; permanent deletion is an explicit server review. */
function openDeleted(){
  var d=$('cdlg'),q='',selected={},selecting=false,busy=false,reasons=null,plan=null,request='',message='',alive=true;
  var runtime=window.ClosetLintRuntime,canDelete=!!(!state.pub&&runtime&&runtime.deletedPieces);
  d.textContent='';
  var shell=el('div',{class:'dlgwide delbox'});d.appendChild(shell);
  if(typeof guardClosetDialog==='function')guardClosetDialog(d,function(){return ''},function(){return busy});
  d.addEventListener('close',function(){alive=false},{once:true});
  function chosen(){return Object.keys(selected).filter(function(id){return selected[id]}).sort()}
  function rows(){return archItems().slice().sort(function(a,b){return ((state.edits[b.id]||{}).removedAt||0)-((state.edits[a.id]||{}).removedAt||0)})}
  function bytes(n){return n<1000000?(n/1000).toFixed(1)+' KB':(n/1000000).toFixed(2)+' MB'}
  function button(text,fn,danger){return el('button',{class:'btn'+(danger?' danger':''),type:'button',text:text,disabled:busy,onclick:fn})}
  function close(){if(!busy)d.close()}
  async function check(){
    if(busy)return;busy=true;message='Checking saved uses…';draw();
    try{var result=await runtime.deletedPieces('inventory');reasons={};result.pieces.forEach(function(p){reasons[p.id]=p.reasons});message=''}
    catch(e){reasons=null;message=e.message||'Could not check saved uses. Try again.'}
    finally{busy=false;if(alive)draw()}
  }
  async function review(){
    if(busy||!chosen().length)return;busy=true;message='Checking photos and saved uses…';draw();
    try{plan=await runtime.deletedPieces('preview',{ids:chosen()});request='delete-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);message=''}
    catch(e){message=e.message||'Could not prepare the deletion review. Your selection is kept.'}
    finally{busy=false;if(alive)draw()}
  }
  async function erase(){
    if(busy||!plan)return;busy=true;message='Deleting selected pieces…';draw();
    try{
      var result=await runtime.deletedPieces('delete',{ids:chosen(),token:plan.token,request:request,confirm:'delete-permanently'});
      var n=result.pieceCount;plan=null;selected={};selecting=false;reasons=null;message='';
      toast(n+' piece'+(n===1?'':'s')+' permanently deleted.');renderGrid();
    }catch(e){
      message=e.message||'Could not confirm deletion. Retry to check the same request.';
      if(e.status===409||e.status===400){plan=null;reasons=null}
    }finally{busy=false;if(alive)draw()}
  }
  function draw(){
    var scroll=shell.querySelector('.dellist'),top=scroll?scroll.scrollTop:0,active=document.activeElement,focus=active&&active.getAttribute&&active.getAttribute('aria-label'),pos=active&&active.selectionStart;
    shell.textContent='';var all=rows(),list=all.filter(function(it){return !q||searchHay(it).indexOf(q)>=0}),ids=chosen();
    shell.appendChild(el('h2',{text:plan?'Delete permanently?':'Deleted pieces ('+all.length+')'}));
    var status=el('p',{class:'fine deleted-status',role:'status',hidden:!message,text:message});
    if(plan){
      shell.appendChild(el('p',{text:'Permanently delete '+plan.pieceCount+' piece'+(plan.pieceCount===1?'':'s')+' and '+plan.photoCount+' photo'+(plan.photoCount===1?'':'s')+'? This cannot be undone.'}));
      var names=el('ul',{class:'deleted-review-list'}),map={};all.forEach(function(it){map[it.id]=it});ids.forEach(function(id){names.appendChild(el('li',{text:map[id]?map[id].name:'Selected deleted piece'}))});shell.appendChild(names);
      if(plan.photoBytes)shell.appendChild(el('p',{class:'fine',text:'About '+bytes(plan.photoBytes)+' becomes reusable in the database. Its file size may stay the same.'}));
      if(plan.sharedPhotoCount)shell.appendChild(el('p',{class:'fine',text:plan.sharedPhotoCount+' shared photo'+(plan.sharedPhotoCount===1?' is':'s are')+' kept.'}));
      shell.append(el('p',{class:'fine',text:'Existing backups and photo request files are unchanged.'}),status,el('div',{class:'actions'},button('Back to selection',function(){plan=null;message='';draw()}),button('Delete permanently',erase,true)));
    }else{
      shell.appendChild(el('p',{class:'fine',text:selecting?'Pieces used in saved work or wear history are protected. Shared photos stay while another piece needs them.':'Deleted pieces and their photos stay saved. Restore puts a piece back in your closet.'}));
      var search=el('input',{type:'search',class:'search',placeholder:'Search','aria-label':'Search deleted pieces',value:q,oninput:function(e){q=e.target.value.trim().toLowerCase();draw()}});search.disabled=busy;shell.appendChild(search);
      if(selecting){
        var options=el('div',{class:'deleted-selection-actions'},button('Cancel selection',function(){selecting=false;selected={};message='';draw()}));
        if(reasons){
          var available=list.slice(0,200).filter(function(it){return !selected[it.id]&&reasons[it.id]&&reasons[it.id].length===0}).slice(0,Math.max(0,200-ids.length));
          options.appendChild(button('Select available ('+available.length+')',function(){available.forEach(function(it){selected[it.id]=true});draw()}));
          if(ids.length)options.appendChild(button('Clear selection',function(){selected={};draw()}));
        }else if(!busy)options.appendChild(button('Check saved uses',check));
        shell.appendChild(options);
      }
      shell.appendChild(status);
      var ul=el('div',{class:'dellist'+(selecting?' deleted-selecting':'')});
      list.slice(0,200).forEach(function(it){
        var why=reasons&&reasons[it.id],blocked=selecting&&(!why||why.length>0),nO=outfitsUsing(it.id).length;
        var copy=el('div',{class:'delinfo'},el('b',{text:it.name})),bits=[it.meta+(it.sub?' › '+it.sub:''),sizeLabel(it),it.source].filter(Boolean);
        copy.appendChild(el('div',{class:'fine',text:bits.join(' · ')}));
        if(selecting&&why&&why.length)copy.appendChild(el('div',{class:'fine deleted-protected',text:'Kept: '+why.join(', ')}));
        else if(nO)copy.appendChild(el('div',{class:'fine',text:'In '+nO+' saved outfit'+(nO===1?'':'s')}));
        var restore=button('Restore',async function(){
          if(busy)return;busy=true;message='Restoring piece…';draw();
          var edit=Object.assign({},state.edits[it.id]||{});delete edit.removed;delete edit.removedAt;
          try{await state.db.collection('edits').doc(it.id).set(edit);delete selected[it.id];toast('Restored');message=''}
          catch(e){message=e.message||'Could not restore. Try again.'}
          finally{busy=false;if(alive)draw()}
        });restore.classList.add('small');restore.setAttribute('aria-label','Restore '+it.name);
        var row=el('div',{class:'delrow'});
        if(selecting)row.appendChild(el('input',{type:'checkbox',class:'deleted-select','aria-label':'Select '+it.name,checked:!!selected[it.id],disabled:busy||blocked||(!selected[it.id]&&ids.length>=200),onchange:function(e){selected[it.id]=e.target.checked;draw()}}));
        row.append(el('div',{class:'delph',style:it.bg?'background:'+it.bg:false},el('img',{src:photoThumbnail(it.photo),alt:'',loading:'lazy',decoding:'async'})),copy,restore);ul.appendChild(row);
      });
      if(!list.length)ul.appendChild(el('p',{class:'fine',text:all.length?'No matches.':'Nothing deleted yet.'}));
      if(list.length>200)ul.appendChild(el('p',{class:'fine',text:'Showing the newest 200. Search to find others.'}));
      shell.appendChild(ul);
      var actions=el('div',{class:'actions deleted-actions'},button('Close',close));
      if(canDelete&&all.length){
        var action=selecting?button('Review deletion'+(ids.length?' ('+ids.length+')':''),review,true):button('Select for permanent deletion',function(){selecting=true;check()},true);
        action.disabled=busy||selecting&&(!reasons||!ids.length||ids.some(function(id){return !reasons[id]||reasons[id].length}));actions.appendChild(action);
      }
      shell.appendChild(actions);var next=shell.querySelector('.dellist');if(next)next.scrollTop=top;
    }
    addClose(d);
    if(focus&&!busy){var target=Array.from(shell.querySelectorAll('[aria-label]')).find(function(n){return n.getAttribute('aria-label')===focus});if(target&&!target.disabled){target.focus({preventScroll:true});if(typeof pos==='number'&&target.type==='search')try{target.setSelectionRange(pos,pos)}catch(e){}}}
  }
  draw();if(!d.open)d.showModal();
}
