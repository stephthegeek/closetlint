/* Freehand items keep their center within the canvas, equally at every edge. */
function boardMoveBounds(p,node,board){
  var w=node&&board&&board.clientWidth?node.offsetWidth/board.clientWidth*100:0;
  var h=node&&board&&board.clientHeight?node.offsetHeight/board.clientHeight*100:0;
  if(!Number.isFinite(w)||w<=0)w=p.w||0;if(!Number.isFinite(h)||h<=0)h=p.w||0;
  return {left:-w/2,right:100-w/2,top:-h/2,bottom:100-h/2};
}
/* Optional controls share the board's document, Undo, and draft save path. */
var boardAdjustSession={owner:null,key:'',open:false},boardOutlineDraft=null;
function boardFocusCapture(){
  var n=document.activeElement,bd=$('board'),style=$('bstyle');if(!n||!bd)return null;
  var within=bd.contains(n),inStyle=style&&style.contains(n);if(!within&&!inStyle)return null;
  var token={owner:state.board,node:n,scope:within?'board':'style',id:n.id};
  if(within){var p=n.closest&&n.closest('.piece[data-i],.piece[data-t],.cslot,.bpal');if(!p&&typeof boardControlPiece==='function')p=boardControlPiece(n,bd);if(!p)return token;
    token.kind=p.dataset.pal?'palette':p.dataset.k!=null?'window':p.dataset.t!=null?'text':'piece';token.index=+(p.dataset.k!=null?p.dataset.k:p.dataset.t!=null?p.dataset.t:p.dataset.i)||0;token.pieceId=p.dataset.pieceId||'';
    token.remove=!!(n.classList&&n.classList.contains('del'));
  }else{token.label=n.getAttribute('aria-label')||'';token.text=n.textContent;token.tag=n.tagName;token.index=Array.prototype.indexOf.call(style.querySelectorAll(n.tagName),n)}
  if(n.tagName==='INPUT'||n.tagName==='TEXTAREA')try{token.start=n.selectionStart;token.end=n.selectionEnd}catch(e){}
  return token;
}
function boardFocusRestore(t){
  if(!t||t.owner!==state.board)return;var active=document.activeElement;
  if(active&&active!==document.body&&active!==t.node&&active.isConnected)return;
  if(t.node.isConnected)return;
  var bd=$('board'),n=t.id&&$(t.id);
  if(!n&&t.scope==='board'){
    var list=bd.querySelectorAll(t.kind==='window'?'.cslot':t.kind==='text'?'.piece[data-t]':t.kind==='palette'?'.bpal':'.piece[data-i]');
    n=t.kind==='piece'&&t.pieceId?Array.prototype.find.call(list,function(x){return x.dataset.pieceId===t.pieceId&&+x.dataset.i===t.index}):null;
    n=n||list[Math.min(t.index,list.length-1)];if(n&&t.remove)n=(bd.querySelector('.board-selection-controls .del')||n.querySelector('.del'))||n;
  }else if(!n&&t.scope==='style'){
    var style=$('bstyle'),list=style?style.querySelectorAll(t.tag):[];
    n=Array.prototype.find.call(list,function(x){return t.label?x.getAttribute('aria-label')===t.label:x.textContent===t.text})||list[t.index];
  }
  if(t.id&&t.id.indexOf('board-outline-point-')===0&&boardOutlineDraft)n=$('board-outline-point-'+boardOutlineDraft.selected)||$('board-outline-select');
  if(n&&n.disabled)n=n.parentNode.querySelector('button:not(:disabled),input:not(:disabled),select:not(:disabled)');
  if(!n||n.hidden||n.closest('.hide'))n=$('otext')||$('oname');
  if(n){n.focus({preventScroll:true});if(t.start!=null&&n.setSelectionRange)try{n.setSelectionRange(t.start,t.end)}catch(e){}}
}
function boardSelectPalette(){
  if(state.selPal){boardAdjustPaint();return}
  selectPiece(-1);state.selPal=true;var n=$('board').querySelector('.bpal');if(n)n.classList.add('psel');boardAdjustPaint();
}
function boardAdjustTarget(){
  var b=state.board;
  if(boardOutlineDraft&&boardOutlineDraft.owner===b&&b.pieces.indexOf(boardOutlineDraft.piece)>=0)return {kind:'outline',p:boardOutlineDraft.piece,index:b.pieces.indexOf(boardOutlineDraft.piece)};
  if(state.selPal&&bst().pal)return {kind:'palette',p:b.st,index:0};
  if(isColl()&&state.cs>=0&&csPiece())return {kind:'window',p:csPiece(),index:state.cs};
  if(state.selT>=0&&(b.texts||[])[state.selT])return {kind:'text',p:b.texts[state.selT],index:state.selT};
  if(!isColl()&&state.sel>=0&&b.pieces[state.sel])return {kind:'piece',p:b.pieces[state.sel],index:state.sel};
  return null;
}
function boardAdjustSay(text){var n=$('board-adjust-status');if(n)n.textContent=text}
function boardAdjustButton(text,label,fn){return el('button',{class:'btn small',type:'button',text:text,'aria-label':label,onclick:fn})}
function boardAdjustInit(){
  var row=$('seltools')&&$('seltools').parentNode;if(!row||$('board-adjust-box'))return;
  ['seltools','txttools','coltools'].forEach(function(id){var bar=$(id);bar.insertBefore(el('button',{class:'btn small',type:'button',text:'Adjust','aria-label':'Adjust selected item',title:'Adjust selected item','data-board-adjust':'1','aria-controls':'board-adjust-box','aria-expanded':'false',onclick:boardAdjustToggle}),bar.querySelector('.danger'))});
  var pal=el('div',{class:'tools hide',id:'paltools'},el('span',{class:'fine ctxl',text:'Color strip'}),el('button',{class:'btn small',type:'button',text:'Adjust','aria-label':'Adjust selected item',title:'Adjust selected item','data-board-adjust':'1','aria-controls':'board-adjust-box','aria-expanded':'false',onclick:boardAdjustToggle}),boardAdjustButton('Reset','Reset color strip position and size',function(){boardAdjustEdit(function(t){if(t.kind==='palette'){['px','py','pk','pr'].forEach(function(k){delete t.p[k]})}},'Color strip reset.')}),boardAdjustButton('Remove','Remove color strip from the board',function(){boardAdjustEdit(function(t){if(t.kind==='palette'){delete t.p.pal;state.selPal=false}},'Color strip removed.');$('ostyle').focus({preventScroll:true})}));
  var palRemove=pal.querySelector('[aria-label="Remove color strip from the board"]');palRemove.classList.add('danger');pal.insertBefore(pal.querySelector('[data-board-adjust]'),palRemove);
  row.appendChild(pal);row.parentNode.insertBefore(el('section',{id:'board-adjust-box',class:'board-adjust-box',hidden:true,'aria-label':'Adjust selected item'}),row.nextSibling);
  var box=$('board-adjust-box'),pad=el('div',{class:'board-adjust-arrows',role:'group','aria-label':'Move selected item'});
  ['up','left','down','right'].forEach(function(dir,i){pad.appendChild(el('button',{class:'btn small',type:'button','data-board-move':dir,'aria-label':'Move '+dir,text:['↑','←','↓','→'][i],onclick:function(){boardAdjustMove(dir)}}))});
  function stepper(id,label,unit,minus,plus){return el('div',{class:'board-adjust-field'},el('label',{for:id,text:label}),el('div',{class:'board-adjust-stepper'},boardAdjustButton('−','Decrease '+label.toLowerCase(),minus),el('input',{id:id,type:'number','aria-label':label,onchange:function(e){boardAdjustValue(id,e.target.value)}}),el('span',{id:id+'-unit',class:'board-adjust-unit',text:unit}),boardAdjustButton('+','Increase '+label.toLowerCase(),plus)))}
  box.appendChild(el('div',{class:'board-adjust-content'},el('div',null,el('div',{id:'board-adjust-move-label',class:'board-adjust-label',text:'Move'}),el('div',{class:'board-adjust-move'},pad,el('button',{id:'board-adjust-center',class:'linkbtn',type:'button',text:'Center',onclick:boardAdjustCenter}))),stepper('board-adjust-size','Size','%',function(){boardAdjustSize(-1)},function(){boardAdjustSize(1)}),stepper('board-adjust-rotation','Rotation','°',function(){boardAdjustRotate(-15)},function(){boardAdjustRotate(15)})));
  var content=box.querySelector('.board-adjust-content'),fields=el('div',{class:'board-adjust-fields'});Array.prototype.slice.call(content.querySelectorAll('.board-adjust-field')).forEach(function(n){fields.appendChild(n)});content.appendChild(fields);
  var rotationButtons=$('board-adjust-rotation').parentNode.querySelectorAll('button');rotationButtons[0].textContent='↺';rotationButtons[0].setAttribute('aria-label','Rotate left 15 degrees');rotationButtons[1].textContent='↻';rotationButtons[1].setAttribute('aria-label','Rotate right 15 degrees');
  var extra=el('div',{class:'board-adjust-extra',id:'board-adjust-extra'});content.appendChild(extra);
  extra.appendChild(boardAdjustButton('Edit outline','Edit outline points',boardOutlineStart));extra.firstChild.id='board-outline-start';
  var controls=el('div',{class:'board-outline-controls',id:'board-outline-controls',hidden:true});
  controls.appendChild(el('label',null,'Point ',el('select',{id:'board-outline-select','aria-label':'Outline point',onchange:function(e){if(!boardOutlineDraft)return;boardOutlineDraft.selected=+e.target.value;renderBoard()}})));
  ['x','y'].forEach(function(k){controls.appendChild(el('label',null,k.toUpperCase()+' (%) ',el('input',{id:'board-outline-'+k,type:'number',min:'0',max:'100',step:'.1','aria-label':'Outline point '+k.toUpperCase()+' percent',onchange:function(e){boardOutlineValue(k,e.target.value)}})))});
  [['Add point',boardOutlineAdd],['Remove point',boardOutlineRemove],['Clear points',boardOutlineClear],['Finish outline',boardOutlineFinish],['Cancel',function(){boardOutlineCancel(true)}]].forEach(function(x){controls.appendChild(boardAdjustButton(x[0],x[0],x[1]))});
  box.appendChild(controls);box.appendChild(el('p',{id:'board-adjust-status',class:'board-adjust-status',role:'status','aria-live':'polite'}));
  $('board').addEventListener('focusin',function(e){var n=e.target;if(n.matches&&n.matches('.cslot')){if(state.swapFrom==null&&!n.dataset.e)selectSlot(+n.dataset.k)}else if(n.matches&&n.matches('.bpal'))boardSelectPalette()});
  $('board').addEventListener('click',function(e){if(e.detail!==0)return;var n=e.target.closest&&e.target.closest('.cslot');if(n){e.preventDefault();boardCollActivate(+n.dataset.k,n.dataset.e==='1')}});
}
function boardAdjustToggle(){
  var t=boardAdjustTarget();if(!t)return;boardAdjustSession.open=!boardAdjustSession.open;boardAdjustSession.owner=state.board;boardAdjustSession.key=t.kind+':'+t.index;boardAdjustPaint();
}
function boardAdjustLimits(t){return t.kind==='window'?{min:1,max:3,step:.05,unit:'×',label:'Zoom'}:t.kind==='palette'?{min:.4,max:4,step:.1,unit:'×',label:'Size'}:t.kind==='text'?{min:1.5,max:30,step:.5,unit:'',label:'Size'}:{min:6,max:95,step:1,unit:'%',label:'Size'}}
function boardAdjustPaint(){
  var box=$('board-adjust-box');if(!box)return;var t=boardAdjustTarget(),key=t?t.kind+':'+t.index:'';
  if(boardAdjustSession.owner!==state.board||boardAdjustSession.key!==key){boardAdjustSession={owner:state.board,key:key,open:t&&t.kind==='outline'};boardAdjustSay('')}
  var pal=$('paltools');if(pal)pal.classList.toggle('hide',!t||t.kind!=='palette');
  var open=!!(t&&boardAdjustSession.open);box.hidden=!open;
  document.querySelectorAll('[data-board-adjust]').forEach(function(n){n.setAttribute('aria-expanded',String(open));n.setAttribute('aria-pressed',String(open));n.classList.toggle('on',open)});box.setAttribute('data-context',t?t.kind:'');
  if(!t)return;var outline=t.kind==='outline',windowed=t.kind==='window',limits=boardAdjustLimits(t),size=$('board-adjust-size'),rot=$('board-adjust-rotation');
  size.parentNode.parentNode.hidden=outline;rot.parentNode.parentNode.hidden=outline||windowed;
  size.min=limits.min;size.max=limits.max;size.step=limits.step;size.setAttribute('aria-label',limits.label);size.parentNode.parentNode.querySelector('label').textContent=limits.label;$('board-adjust-size-unit').textContent=limits.unit;
  var value=windowed?t.p.zm||1:t.kind==='palette'?t.p.pk||1:t.kind==='text'?t.p.s:t.p.w;
  if(document.activeElement!==size)size.value=round2(value);rot.min=-180;rot.max=180;rot.step=1;
  if(document.activeElement!==rot)rot.value=t.kind==='palette'?t.p.pr||0:t.p.rot||0;
  $('board-adjust-move-label').textContent=outline?'Move point':windowed?'Photo position':'Move';$('board-adjust-center').hidden=outline;
  $('board-outline-start').hidden=t.kind!=='piece';$('board-outline-controls').hidden=!outline;
  var axes=windowed?boardWindowOverflow(t):{x:true,y:true};
  box.querySelectorAll('[data-board-move]').forEach(function(n){n.disabled=outline?!boardOutlineDraft.points.length:!axes[/left|right/.test(n.dataset.boardMove)?'x':'y']});
  if(outline){$('board').querySelectorAll('.board-outline-point').forEach(function(n){var on=+n.dataset.point===boardOutlineDraft.selected;n.classList.toggle('on',on);n.setAttribute('aria-pressed',String(on))});var draft=boardOutlineDraft,select=$('board-outline-select'),selected=draft.selected,p=draft.points[selected];
    var options=draft.points.map(function(q,i){return '<option value="'+i+'">'+(i+1)+'</option>'}).join('');if(select.innerHTML!==options)select.innerHTML=options;select.value=String(selected);select.disabled=!p;
    ['x','y'].forEach(function(k,i){var n=$('board-outline-'+k);n.disabled=!p;if(document.activeElement!==n)n.value=p?round2(p[i]):''});
    var buttons=$('board-outline-controls').querySelectorAll('button');buttons[1].disabled=!p;buttons[3].disabled=!boardOutlineValid(draft.points);
  }
}
function boardWindowOverflow(t){
  var node=$('board').querySelector('.cslot[data-k="'+t.index+'"]'),img=node&&node.querySelector('.cimg');
  return {x:!!(img&&img.offsetWidth>node.clientWidth+1),y:!!(img&&img.offsetHeight>node.clientHeight+1)};
}
function boardAdjustEdit(fn,message){
  var t=boardAdjustTarget();if(!t||state.boardSaving||state.workspaceBusy)return false;
  var before=JSON.stringify(boardUndoSnapshot(state.board));fn(t);
  if(JSON.stringify(boardUndoSnapshot(state.board))===before){boardAdjustPaint();return false}
  persistBoard();renderBoard();boardAdjustSay(message);return true;
}
function boardAdjustMove(dir){
  var t=boardAdjustTarget();if(!t)return;var dx=dir==='left'?-1:dir==='right'?1:0,dy=dir==='up'?-1:dir==='down'?1:0;
  if(t.kind==='outline'){boardOutlineChange(function(d){var p=d.points[d.selected];if(p){p[0]=clamp(p[0]+dx,0,100);p[1]=clamp(p[1]+dy,0,100)}});return}
  boardAdjustEdit(function(t){var p=t.p;if(t.kind==='window'){var axes=boardWindowOverflow(t);if(dx&&axes.x)p.px=round2(clamp((p.px==null?.5:p.px)-dx*.05,0,1));if(dy&&axes.y)p.py=round2(clamp((p.py==null?.5:p.py)-dy*.05,0,1))}
    else if(t.kind==='palette'){var pos=palPos();p.px=round2(clamp(pos.x+dx,-4,98));p.py=round2(clamp(pos.y+dy,-4,98))}
    else{var bd=$('board'),node=bd.querySelector(t.kind==='text'?'.piece[data-t="'+t.index+'"]':'.piece[data-i="'+t.index+'"]'),bounds=boardMoveBounds(p,node,bd);p.x=round2(clamp(p.x+dx,bounds.left,bounds.right));p.y=round2(clamp(p.y+dy,bounds.top,bounds.bottom))}
  },'Moved '+dir+'.');
}
function boardAdjustCenter(){boardAdjustEdit(function(t){var p=t.p;if(t.kind==='window'){delete p.px;delete p.py}
  else if(t.kind==='palette'){var n=$('board').querySelector('.bpal'),bd=$('board');p.px=round2((100-(n?n.offsetWidth/bd.clientWidth*100:20))/2);p.py=round2((100-(n?n.offsetHeight/bd.clientHeight*100:5))/2)}
  else{var n=$('board').querySelector(t.kind==='piece'?'.piece[data-i="'+t.index+'"]':'.piece[data-t="'+t.index+'"]'),bd=$('board');if(n){p.x=round2((100-n.offsetWidth/bd.clientWidth*100)/2);p.y=round2((100-n.offsetHeight/bd.clientHeight*100)/2)}}
},'Centered.')}
function boardAdjustSize(direction){var t=boardAdjustTarget();if(!t)return;var p=t.p,v=t.kind==='window'?p.zm||1:t.kind==='palette'?p.pk||1:t.kind==='text'?p.s:p.w;boardAdjustValue('board-adjust-size',v+direction*boardAdjustLimits(t).step)}
function boardAdjustRotate(step){var t=boardAdjustTarget();if(t)boardAdjustValue('board-adjust-rotation',(t.kind==='palette'?t.p.pr||0:t.p.rot||0)+step)}
function boardAdjustValue(id,value){
  var t=boardAdjustTarget(),n=$(id);if(!t)return;if(state.boardSaving||state.workspaceBusy||String(value).trim()===''||!Number.isFinite(+value)){if(n)n.value=id==='board-adjust-rotation'?(t.kind==='palette'?t.p.pr||0:t.p.rot||0):t.kind==='window'?t.p.zm||1:t.kind==='palette'?t.p.pk||1:t.kind==='text'?t.p.s:t.p.w;boardAdjustPaint();return}
  var rotation=id==='board-adjust-rotation',limits=boardAdjustLimits(t),v=rotation?normRot(+value):round2(clamp(+value,limits.min,limits.max));
  if(n)n.value=String(v);
  boardAdjustEdit(function(t){if(t.kind==='outline'||rotation&&t.kind==='window')return;
    var key=rotation?(t.kind==='palette'?'pr':'rot'):t.kind==='window'?'zm':t.kind==='palette'?'pk':t.kind==='text'?'s':'w';
    if(rotation&&!v||key==='zm'&&v===1)delete t.p[key];else t.p[key]=v;
  },rotation?'Rotation '+v+' degrees.':limits.label+' '+v+limits.unit+'.');
}
function boardCollActivate(k,empty){
  if(state.swapFrom!=null){var from=state.swapFrom;state.swapFrom=null;$('board').classList.remove('cswap');if(empty)toast('Choose a window with a piece in it.');else if(from!==k)collSwap(from,k);paintCollBar();return}
  if(empty){selectSlot(-1);toast('Choose a piece from your closet to fill this window.');return}
  selectSlot(k);
}
function boardAdjustKeyboard(e){
  var n=e.target;if(!n||!n.closest)return false;
  if(e.key==='Escape'&&boardOutlineDraft){e.preventDefault();boardOutlineCancel(true);return true}
  var point=n.closest('.board-outline-point');if(point){if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();if(!e.repeat){boardOutlineDraft.selected=+point.dataset.point;boardOutlineRemove()}return true}if(/^Arrow/.test(e.key)){e.preventDefault();boardOutlineDraft.selected=+point.dataset.point;boardAdjustMove(e.key.slice(5).toLowerCase());return true}return false}
  var slot=n.matches&&n.matches('.cslot'),pal=n.matches&&n.matches('.bpal');if(!slot&&!pal)return false;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();if(slot)boardCollActivate(+n.dataset.k,n.dataset.e==='1');else boardSelectPalette();return true}
  if(slot&&state.swapFrom!=null&&/^Arrow/.test(e.key)){var nodes=$('board').querySelectorAll('.cslot:not([data-e])'),index=Array.prototype.indexOf.call(nodes,n),next=clamp(index+(/Left|Up/.test(e.key)?-1:1),0,nodes.length-1);e.preventDefault();nodes[next].focus({preventScroll:true});return true}
  if(slot&&state.swapFrom!=null)return false;
  if(/^Arrow(Left|Right|Up|Down)$/.test(e.key)){e.preventDefault();if(slot)selectSlot(+n.dataset.k);else boardSelectPalette();boardAdjustMove(e.key.slice(5).toLowerCase());return true}
  if(e.key==='+'||e.key==='='||e.key==='-'){e.preventDefault();if(pal)boardSelectPalette();else selectSlot(+n.dataset.k);boardAdjustSize(e.key==='-'?-1:1);return true}
  if(pal&&['[',']','{','}'].indexOf(e.key)>=0){e.preventDefault();boardSelectPalette();boardAdjustRotate(/[\]}]/.test(e.key)?(e.shiftKey?5:1):-(e.shiftKey?5:1));return true}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();if(e.repeat)return true;if(pal){boardSelectPalette();boardAdjustEdit(function(t){delete t.p.pal;state.selPal=false},'Color strip removed.');$('ostyle').focus({preventScroll:true})}else{selectSlot(+n.dataset.k);collRemove();var nodes=$('board').querySelectorAll('.cslot');(nodes[Math.min(+n.dataset.k,nodes.length-1)]||$('board')).focus({preventScroll:true})}return true}
  return false;
}
/* Outline edits stay transient until Finish; the original photo is never rewritten. */
function boardOutlineValid(points){if(!points.every(function(p){return Array.isArray(p)&&p.length===2&&p.every(function(v){return Number.isFinite(v)&&v>=0&&v<=100})}))return false;if(points.length<3||new Set(points.map(function(p){return p.join(',')})).size<3)return false;var area=0;points.forEach(function(p,i){var q=points[(i+1)%points.length];area+=p[0]*q[1]-q[0]*p[1]});return Math.abs(area)>.01}
function boardOutlineStart(){
  var t=boardAdjustTarget();if(!t||t.kind!=='piece')return;if(state.endCut)state.endCut();
  var points=t.p.clip?JSON.parse(JSON.stringify(t.p.clip)):[[5,5],[95,5],[95,95],[5,95]];
  boardOutlineDraft={owner:state.board,piece:t.p,points:points,selected:0,history:[]};boardAdjustSession.open=true;renderBoard();$('board-outline-select').focus({preventScroll:true});boardAdjustSay('Click the photo to add a point, or move a selected point. Finish applies the outline.');
}
function boardOutlineChange(fn){var d=boardOutlineDraft;if(!d||d.owner!==state.board||state.boardSaving||state.workspaceBusy)return;var before=JSON.stringify(d.points),old={points:JSON.parse(before),selected:d.selected};fn(d);if(JSON.stringify(d.points)===before)return;d.history.push(old);if(d.history.length>50)d.history.shift();renderBoard();paintBoardUndo();boardAdjustSay(d.points.length+' outline points.');}
function boardOutlineValue(axis,value){var d=boardOutlineDraft,i=axis==='x'?0:1;if(String(value).trim()!==''&&Number.isFinite(+value))boardOutlineChange(function(d){if(d.points[d.selected])d.points[d.selected][i]=round2(clamp(+value,0,100))});var n=$('board-outline-'+axis);if(n&&d&&d.points[d.selected])n.value=d.points[d.selected][i]}
function boardOutlineAdd(){if(boardOutlineDraft&&boardOutlineDraft.points.length>=70){boardAdjustSay('This outline already has 70 points.');return}boardOutlineChange(function(d){var p=d.points[d.selected]||[20,20],q=d.points[(d.selected+1)%d.points.length]||[80,80];d.points.splice(d.points.length?d.selected+1:0,0,[(p[0]+q[0])/2,(p[1]+q[1])/2]);d.selected=d.points.length===1?0:d.selected+1})}
function boardOutlineRemove(){boardOutlineChange(function(d){if(!d.points.length)return;d.points.splice(d.selected,1);d.selected=Math.max(0,Math.min(d.selected,d.points.length-1))})}
function boardOutlineClear(){boardOutlineChange(function(d){d.points=[];d.selected=0})}
function boardOutlineUndo(){var d=boardOutlineDraft,old=d&&d.history.pop();if(!old)return false;d.points=old.points;d.selected=old.selected;renderBoard();paintBoardUndo();boardAdjustSay('Last outline edit undone.');return true}
function boardOutlineCancel(focus){if(!boardOutlineDraft)return;var index=state.board.pieces.indexOf(boardOutlineDraft.piece);boardOutlineDraft=null;state.sel=index;state.selT=-1;boardAdjustSession={owner:state.board,key:'piece:'+index,open:true};renderBoard();paintBoardUndo();if(focus&&$('board-outline-start'))$('board-outline-start').focus({preventScroll:true})}
function boardOutlineFinish(){var d=boardOutlineDraft;if(state.boardSaving||state.workspaceBusy||!d||d.owner!==state.board||state.board.pieces.indexOf(d.piece)<0||!boardOutlineValid(d.points))return;var points=JSON.parse(JSON.stringify(d.points)),index=state.board.pieces.indexOf(d.piece);boardOutlineDraft=null;state.sel=index;state.selT=-1;boardAdjustSession={owner:state.board,key:'piece:'+index,open:true};boardDesignChange('Outline applied. Original photo unchanged.',function(){d.piece.clip=points});$('board-outline-start').focus({preventScroll:true});paintBoardUndo()}
function boardOutlinePointer(e){
  var d=boardOutlineDraft;if(!d)return false;e.preventDefault();var point=e.target.closest&&e.target.closest('.board-outline-point');if(point){d.selected=+point.dataset.point;boardAdjustPaint();point.focus({preventScroll:true});return true}
  if(d.points.length>=70){boardAdjustSay('This outline already has 70 points.');return true}var pe=e.target.closest&&e.target.closest('.piece[data-i]');if(!pe||state.board.pieces[+pe.dataset.i]!==d.piece){boardAdjustSay('Finish or cancel the outline before selecting another item.');return true}
  var br=pe.getBoundingClientRect(),p=d.piece,rot=-(p.rot||0)*Math.PI/180,dx=e.clientX-br.left-br.width/2,dy=e.clientY-br.top-br.height/2,x=clamp((dx*Math.cos(rot)-dy*Math.sin(rot))/(pe.offsetWidth||1)*100+50,0,100),y=clamp((dx*Math.sin(rot)+dy*Math.cos(rot))/(pe.offsetHeight||1)*100+50,0,100);
  boardOutlineChange(function(d){var at=d.points.length?d.selected+1:0;d.points.splice(at,0,[round2(p.fx?100-x:x),round2(p.fy?100-y:y)]);d.selected=at});return true;
}
function boardOutlinePaint(pe,p){
  var d=boardOutlineDraft;if(!d||d.owner!==state.board||d.piece!==p)return;var svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),line=document.createElementNS('http://www.w3.org/2000/svg','polygon');svg.setAttribute('class','board-outline-preview');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');line.setAttribute('points',d.points.map(function(q){return (p.fx?100-q[0]:q[0])+','+(p.fy?100-q[1]:q[1])}).join(' '));svg.appendChild(line);pe.appendChild(svg);
  d.points.forEach(function(q,i){pe.appendChild(el('button',{class:'board-outline-point'+(i===d.selected?' on':''),id:'board-outline-point-'+i,type:'button','data-point':String(i),'aria-label':'Outline point '+(i+1)+', X '+round2(q[0])+', Y '+round2(q[1]),'aria-pressed':String(i===d.selected),style:'left:'+(p.fx?100-q[0]:q[0])+'%;top:'+(p.fy?100-q[1]:q[1])+'%',text:String(i+1),onclick:function(e){e.stopPropagation();if(!boardOutlineDraft)return;boardOutlineDraft.selected=i;boardAdjustPaint()}}))});
}
/* Existing photo crop dialog supplies its geometry and its original save callback. */
function boardCropGeometry(rect,nw,nh,ratio,key,value){
  var r=Object.assign({},rect),minW=Math.min(24,nw),minH=Math.min(24,nh);if(!Number.isFinite(value))return r;
  if(key==='x'||key==='y')r[key]=clamp(value,0,key==='x'?nw-r.w:nh-r.h);
  else if(ratio){var w=key==='h'?value*ratio:value,maxW=Math.min(nw,nh*ratio),min=Math.min(maxW,Math.max(minW,minH*ratio));r.w=clamp(w,min,maxW);r.h=r.w/ratio;r.x=clamp(r.x,0,nw-r.w);r.y=clamp(r.y,0,nh-r.h)}
  else{r[key]=clamp(value,key==='w'?minW:minH,key==='w'?nw:nh);r.x=clamp(r.x,0,nw-r.w);r.y=clamp(r.y,0,nh-r.h)}
  return r;
}
function boardCropControls(read,write){
  var box=el('div',{class:'board-adjust-box board-crop-adjust',hidden:true}),toggle=el('button',{class:'btn small',type:'button',text:'Adjust crop','aria-expanded':'false',onclick:function(){box.hidden=!box.hidden;toggle.setAttribute('aria-expanded',String(!box.hidden))}}),group=el('div',{class:'board-adjust-content'}),pad=el('div',{class:'board-adjust-arrows',role:'group','aria-label':'Move crop'}),fields={},buttons=[];
  function edit(key,value){var s=read();if(!s.ready||s.saving)return;write(boardCropGeometry(s.rect,s.width,s.height,s.ratio,key,value));sync()}
  ['up','left','down','right'].forEach(function(dir,i){var b=boardAdjustButton(['↑','←','↓','→'][i],'Move crop '+dir,function(){var s=read(),k=/left|right/.test(dir)?'x':'y';edit(k,s.rect[k]+(/left|up/.test(dir)?-1:1)*Math.max(1,Math.round((k==='x'?s.width:s.height)*.01)))});b.dataset.boardMove=dir;pad.appendChild(b);buttons.push(b)});
  group.appendChild(el('div',null,el('div',{class:'board-adjust-label',text:'Move crop'}),pad));
  [['x','Left'],['y','Top'],['w','Width'],['h','Height']].forEach(function(pair){var input=el('input',{type:'number',step:'1','aria-label':'Crop '+pair[1].toLowerCase()+' in pixels',onchange:function(e){if(String(e.target.value).trim()!=='')edit(pair[0],+e.target.value);sync()}});fields[pair[0]]=input;group.appendChild(el('label',{class:'board-adjust-field'},el('span',{class:'board-adjust-label',text:pair[1]+' (px)'}),input))});
  var small=boardAdjustButton('−','Smaller crop',function(){var s=read(),r=s.rect,w=r.w*.9,h=r.h*.9;var next=boardCropGeometry(r,s.width,s.height,s.ratio,'w',w);if(!s.ratio)next=boardCropGeometry(next,s.width,s.height,0,'h',h);next.x=clamp(r.x+(r.w-next.w)/2,0,s.width-next.w);next.y=clamp(r.y+(r.h-next.h)/2,0,s.height-next.h);if(!s.saving&&s.ready)write(next);sync()}),big=boardAdjustButton('+','Larger crop',function(){var s=read(),r=s.rect,next=boardCropGeometry(r,s.width,s.height,s.ratio,'w',r.w*1.1);if(!s.ratio)next=boardCropGeometry(next,s.width,s.height,0,'h',r.h*1.1);next.x=clamp(r.x+(r.w-next.w)/2,0,s.width-next.w);next.y=clamp(r.y+(r.h-next.h)/2,0,s.height-next.h);if(!s.saving&&s.ready)write(next);sync()});buttons.push(small,big);group.appendChild(el('div',null,el('div',{class:'board-adjust-label',text:'Size'}),el('div',{class:'board-adjust-stepper'},small,big)));box.appendChild(group);
  var status=el('p',{class:'board-adjust-status',role:'status','aria-live':'polite'});box.appendChild(status);
  function sync(){var s=read();toggle.disabled=!s.ready||s.saving;Object.keys(fields).forEach(function(k){var n=fields[k];n.disabled=!s.ready||s.saving;n.value=s.ready?round2(s.rect[k]):'';n.min=k==='x'||k==='y'?0:Math.min(24,k==='w'?s.width:s.height);n.max=k==='x'?s.width-s.rect.w:k==='y'?s.height-s.rect.h:k==='w'?s.width:s.height});buttons.forEach(function(n){n.disabled=!s.ready||s.saving});status.textContent=s.ready?'Crop '+Math.round(s.rect.w)+' × '+Math.round(s.rect.h)+' pixels.':''}
  var node=el('div',{class:'board-crop-controls'},toggle,box);return {node:node,sync:sync};
}
