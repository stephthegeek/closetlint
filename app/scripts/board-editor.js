/* ---------- outfit board ---------- */
function nextZ(){var m=0;state.board.pieces.forEach(function(p){if(p.z>m)m=p.z});return m+1}
var procCache={};
function needProc(p){return !!(hideW()||(p.clip&&p.clip.length>=3))}
function procKey(it,p){return it.id+'|'+(it.photo||'').length+'|'+(p.clip?p.clip.map(function(q){return q[0]+','+q[1]}).join(';'):'')+'|'+(hideW()?1:0)}
function makeProc(it,p){
  return new Promise(function(res){
    var im=new Image();
    im.onload=function(){
      try{
        var big=Math.max(im.naturalWidth,im.naturalHeight)||1,s=Math.min(1,520/big),w=Math.max(1,Math.round(im.naturalWidth*s)),h=Math.max(1,Math.round(im.naturalHeight*s));
        var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');
        if(!g){res(null);return}
        g.drawImage(im,0,0,w,h);
        if(p.clip&&p.clip.length>=3){
          g.save();g.beginPath();g.rect(0,0,w,h);
          p.clip.forEach(function(q,k){var px=q[0]/100*w,py=q[1]/100*h;if(k)g.lineTo(px,py);else g.moveTo(px,py)});
          g.closePath();g.fillStyle='#ffffff';g.fill('evenodd');g.restore();
        }
        if(hideW()){
          var d=g.getImageData(0,0,w,h),px=d.data,seen=new Uint8Array(w*h),stack=[];
          var bgc=null;
          (function(){
            var xs=[],sx=Math.max(1,Math.floor(w/60)),sy=Math.max(1,Math.floor(h/60));
            for(var xx=0;xx<w;xx+=sx){xs.push(xx);xs.push((h-1)*w+xx)}
            for(var yy=0;yy<h;yy+=sy){xs.push(yy*w);xs.push(yy*w+w-1)}
            var rs=[],gs=[],bs=[];
            xs.forEach(function(i){rs.push(px[i*4]);gs.push(px[i*4+1]);bs.push(px[i*4+2])});
            var med=function(a){a.sort(function(p,q){return p-q});return a[a.length>>1]};
            var mr=med(rs.slice()),mg=med(gs.slice()),mb=med(bs.slice()),near=0;
            xs.forEach(function(i){if(Math.abs(px[i*4]-mr)+Math.abs(px[i*4+1]-mg)+Math.abs(px[i*4+2]-mb)<=36)near++});
            var lo=Math.min(mr,mg,mb),hi=Math.max(mr,mg,mb);
            if(near/xs.length>=0.6&&lo>=190&&hi-lo<=45)bgc=[mr,mg,mb];
          })();
          var dist=function(i){return bgc?Math.abs(px[i*4]-bgc[0])+Math.abs(px[i*4+1]-bgc[1])+Math.abs(px[i*4+2]-bgc[2]):999};
          var isW=function(i){var r=px[i*4],gg=px[i*4+1],b=px[i*4+2],mn=Math.min(r,gg,b),mx=Math.max(r,gg,b);return (mn>=236&&mx-mn<=18)||dist(i)<=54};
          var push=function(x,y){var i=y*w+x;if(!seen[i]&&isW(i)){seen[i]=1;stack.push(i)}};
          for(var x=0;x<w;x++){push(x,0);push(x,h-1)}
          for(var y=0;y<h;y++){push(0,y);push(w-1,y)}
          while(stack.length){var i=stack.pop(),x0=i%w,y0=(i-x0)/w;if(x0>0)push(x0-1,y0);if(x0<w-1)push(x0+1,y0);if(y0>0)push(x0,y0-1);if(y0<h-1)push(x0,y0+1)}
          var fringe=[];
          for(var k=0;k<seen.length;k++){
            if(seen[k])continue;
            var kx=k%w,ky=(k-kx)/w;
            if((kx>0&&seen[k-1])||(kx<w-1&&seen[k+1])||(ky>0&&seen[k-w])||(ky<h-1&&seen[k+w])){
              var mn=Math.min(px[k*4],px[k*4+1],px[k*4+2]);if(mn>=215||dist(k)<=96)fringe.push(k);
            }
          }
          for(var k2=0;k2<seen.length;k2++)if(seen[k2])px[k2*4+3]=0;
          fringe.forEach(function(k3){px[k3*4+3]=0});
          g.putImageData(d,0,0);
        }
        res(c);
      }catch(e){res(null)}
    };
    im.onerror=function(){res(null)};
    im.src=it.photo;
  });
}
function procCanvas(it,p){
  var k=procKey(it,p);
  if(procCache[k])return Promise.resolve(procCache[k]);
  return makeProc(it,p).then(function(c){if(c)procCache[k]=c;return c});
}
function boardImg(it,p){
  var img=el('img',{src:it.photo,alt:it.name});
  if(p.fx||p.fy)img.style.transform='scale('+(p.fx?-1:1)+','+(p.fy?-1:1)+')';
  if(needProc(p)){
    var k=procKey(it,p);
    if(procCache[k])img.src=procCache[k].toDataURL('image/png');
    else procCanvas(it,p).then(function(c){if(c&&img.parentNode)img.src=c.toDataURL('image/png')});
  }
  return img;
}
function pieceStyle(p,it){
  var ar=it&&it.ar?it.ar:1;
  var sr=Math.sqrt(ar>0?ar:1);
  return 'left:'+p.x+'%;top:'+p.y+'%;width:'+p.w+'%;z-index:'+p.z+';aspect-ratio:'+ar+';--sr:'+sr.toFixed(4)+';--sq:'+(1/sr).toFixed(4)+(p.rot?';transform:rotate('+p.rot+'deg)':'');
}
function miniTf(p){var t=(p.rot?'rotate('+p.rot+'deg)':'')+((p.fx||p.fy)?(p.rot?' ':'')+'scale('+(p.fx?-1:1)+','+(p.fy?-1:1)+')':'');return t?';transform:'+t:''}
function clipCss(p){return (p.clip&&p.clip.length>=3)?'clip-path:polygon('+p.clip.map(function(q){return q[0]+'% '+q[1]+'%'}).join(',')+')':false}
/* light magnet at 0/45/90/... only within 2 degrees; hold Shift (or Alt) for none */
function snapRot(a,ev){if(ev&&(ev.shiftKey||ev.altKey))return a;var sn=Math.round(a/45)*45;return Math.abs(a-sn)<2?sn:a}
function normRot(a){a=((Math.round(a)%360)+360)%360;return a>180?a-360:a}
function renderTray(){
  var t=$('tray'),items=ownedItems();
  t.textContent='';
  t.appendChild(el('h3',{text:'Add pieces to board',style:'margin-top:0'}));
  if(state.skyTrayIds)t.appendChild(el('div',{class:'sky-filter-note'},el('span',{text:'From your sky: '+state.skyTrayLabel}),el('button',{class:'btn small',type:'button',text:'Clear Sky selection',onclick:function(){state.skyTrayIds=null;renderTray()}})));
  var cm=el('div',{class:'chips'});
  cm.appendChild(chip('\u2665 Faves',state.trayFav,function(){state.trayFav=!state.trayFav;renderTray()}));

  ['All'].concat(META).forEach(function(m){
    if(m!=='All'&&!items.some(function(x){return x.meta===m}))return;
    cm.appendChild(chip(m,state.trayMeta===m,function(){state.trayMeta=m;state.traySub='';state.trayQ='';renderTray()}));
    if(m!=='All'&&state.trayMeta===m){
      var subsHere={};items.forEach(function(x){if(x.meta===m&&x.sub)subsHere[x.sub]=1});
      var sl=Object.keys(subsHere).sort();
      if(sl.length){var sr=el('div',{class:'subrow'});sl.forEach(function(s2){var sc=chip(s2,state.traySub===s2,function(){state.traySub=state.traySub===s2?'':s2;state.trayQ='';renderTray()});sc.classList.add('sub');sr.appendChild(sc)});cm.appendChild(sr)}
    }
  });
  if(typeof laundryEnabled==='function'&&laundryEnabled())cm.appendChild(chip('🧺 Ready to wear',state.trayReady!==false,function(){state.trayReady=state.trayReady===false;renderTray()}));
  t.appendChild(cm);
  t.appendChild(el('input',{class:'search',type:'search',placeholder:'Search','aria-label':'Search pieces to add',value:state.trayQ,oninput:function(e){state.trayQ=e.target.value;renderTrayGrid()}}));
  t.appendChild(el('div',{class:'tgrid',id:'tgrid'}));
  renderTrayGrid();
}
var trayGridObserver=null,trayGridRevision=0;
function renderTrayGrid(){
  if(trayGridObserver){trayGridObserver.disconnect();trayGridObserver=null}
  var revision=++trayGridRevision;
  var g=$('tgrid');if(!g)return;g.textContent='';
  var q=state.trayQ.trim().toLowerCase();
  var items=ownedItems().filter(function(it){
    return (typeof laundryEnabled!=='function'||!laundryEnabled()||state.trayReady===false||!needsLaundry(it))&&(!state.skyTrayIds||state.skyTrayIds.indexOf(it.id)>=0)&&(!state.trayFav||it.fav)&&(state.trayMeta==='All'||it.meta===state.trayMeta)&&(!state.traySub||it.sub===state.traySub)&&(!q||q.split(/\s+/).every(function(w){return !w||searchHay(it).indexOf(w)>=0}));
  }).sort(function(a,b){return tailRank(a)-tailRank(b)||(b.date||'').localeCompare(a.date||'')});
  var drawn=0,observer=null,more=el('button',{class:'btn small tray-more',type:'button',text:'Load more pieces',onclick:appendBatch});
  g.appendChild(more);g.scrollTop=0;
  function appendBatch(){
    if(revision!==trayGridRevision||!g.isConnected)return;
    var end=Math.min(drawn+60,items.length),fragment=document.createDocumentFragment();
    for(;drawn<end;drawn++){
      (function(it){fragment.appendChild(el('button',{class:'tcell',style:it.bg?'background:'+it.bg:false,type:'button',title:'Add '+it.name,'aria-label':'Add '+it.name+' to the board',onclick:function(){addPiece(it)}},el('img',{src:photoThumbnail(it.photo),alt:'',loading:'lazy',decoding:'async'}),typeof laundryMark==='function'?laundryMark(it):null))})(items[drawn]);
    }
    g.insertBefore(fragment,more);more.hidden=drawn>=items.length;
    if(more.hidden&&observer){observer.disconnect();if(trayGridObserver===observer)trayGridObserver=null}
  }
  appendBatch();
  if(!more.hidden&&typeof IntersectionObserver!=='undefined'){
    observer=trayGridObserver=new IntersectionObserver(function(entries){
      if(revision!==trayGridRevision||!g.isConnected){observer.disconnect();if(trayGridObserver===observer)trayGridObserver=null;return}
      if(entries.some(function(e){return e.isIntersecting}))appendBatch();
    },{rootMargin:'200px'});
    observer.observe(more);
  }
}

function addPiece(it){
  if(state.board.lay){collAdd(it);return}
  var b=state.board,w=Math.min(60,Math.round((DEFAULT_W[it.meta]||24)*1.4)),n=b.pieces.length;
  var hpct=w*boardAR()/(it.ar||1);
  var x=clamp(34+(n%6)*3,0,100-w),y=clamp(14+(n%6)*4,0,Math.max(0,100-hpct));
  if(n>0){
    /* spread out: try a bunch of spots and keep the one with the most clear space around it */
    var map=byIdA(),AR=boardAR(),mx=Math.max(0,100-w),my=Math.max(0,100-hpct),best=-1;
    for(var k=0;k<40;k++){
      var cx=Math.random()*mx,cy=Math.random()*my,sc=1e9;
      for(var j=0;j<n;j++){
        var q=b.pieces[j],qi=map[q.id],qh=q.w*AR/((qi&&qi.ar)||1);
        var dx=(cx+w/2)-(q.x+q.w/2),dy=(cy+hpct/2)-(q.y+qh/2);
        var d=Math.pow(dx/((w+q.w)/2),2)+Math.pow(dy/((hpct+qh)/2),2);
        if(d<sc)sc=d;
      }
      if(sc>best){best=sc;x=Math.round(cx*10)/10;y=Math.round(cy*10)/10}
    }
  }
  b.pieces.push({id:it.id,x:x,y:y,w:w,z:nextZ()});
  persistBoard();renderBoard();selectPiece(b.pieces.length-1);
}
var boardBackgroundPending=false;
function boardBackgroundItem(collage){
  var p=collage?csPiece():state.board.pieces[state.sel];return p&&byIdA()[p.id];
}
function paintBoardPhotoActions(){
  [false,true].forEach(function(collage){var b=$(collage?'cremovebg':'sremovebg');if(!b)return;var it=boardBackgroundItem(collage),runtime=window.ClosetLintRuntime,photo=it&&piecePhotos(it)[0];b.hidden=!(runtime&&runtime.removeBackground&&state.assets&&photo&&photo.photoId&&!photo.cutout);b.disabled=boardBackgroundPending});
}
function removeBoardBackground(collage){
  if(boardBackgroundPending)return Promise.resolve(false);
  var owner=state.board,it=boardBackgroundItem(collage),runtime=window.ClosetLintRuntime,source=it&&piecePhotos(it)[0];
  if(!it||!source||!source.photoId||source.cutout||!state.assets||!runtime||!runtime.removeBackground)return Promise.resolve(false);
  if(piecePhotos(it).filter(function(p){return p.photoId}).length>=12){toast('This piece already has 12 photos. Manage its photos from the piece page.');return Promise.resolve(false)}
  boardBackgroundPending=true;paintBoardPhotoActions();
  return Promise.resolve().then(function(){return runtime.backgroundStatus()}).then(function(status){
    if(state.board!==owner||state.tab!=='outfits')return false;
    var selected=boardBackgroundItem(collage);if(!selected||selected.id!==it.id||piecePhotos(selected)[0].photoId!==source.photoId)return false;
    if(!status.available){toast('Background removal is not set up yet. Check photo tools in Utilities → Getting started.');return false}
    if(state.endCut)state.endCut();
    openBackgroundPreview(it,Object.assign({},source),function(){procCache={};bgCache.k='';if(state.tab==='outfits'){renderTray();renderBoard()}});return true;
  }).catch(function(e){toast(e.message||'Photo tools are unavailable. Try again.');return false}).finally(function(){boardBackgroundPending=false;paintBoardPhotoActions()});
}
function paintSel(){paintBoardPhotoActions();var t=$('seltools');if(!t)return;var pOn=state.sel>=0,tOn=state.selT>=0;t.classList.toggle('hide',!pOn||isColl());var ct=$('coltools');if(ct){var cOn=isColl()&&state.cs>=0&&!!csPiece();ct.classList.toggle('hide',!cOn);if(cOn)$('czoom').value=csPiece().zm||1}$('txttools').classList.toggle('hide',!tOn);var sp0=state.board.pieces[state.sel],fb=$('sframe');if(fb){fb.classList.toggle('hide',!bst().ps);fb.innerHTML=sp0&&sp0.nf?'🎨<span class="bl"> Style on</span>':'🎨<span class="bl"> Style off</span>'}if(tOn)syncTxtTools()}
function selectPiece(i){
  state.sel=i;state.selT=-1;state.selPal=false;state.cs=-1;var pl1=$('board').querySelector('.bpal');if(pl1)pl1.classList.remove('psel');$('board').querySelectorAll('.cslot.csel').forEach(function(n){n.classList.remove('csel')});
  var nodes=$('board').querySelectorAll('.piece');
  nodes.forEach(function(n){n.classList.toggle('sel',+n.dataset.i===i)});
  paintSel();
}
/* Repaint only: draft writes belong to the edit/Undo handlers. */
function renderBoard(){renderPullBtn();paintOMeta();if(typeof laundryBoardNotice==='function')laundryBoardNotice();
  var ob=$('otidy');if(ob)ob.classList.toggle('hide',isColl());
  var bd=$('board'),map=byIdA();
  bd.textContent='';
  var shown=0,tpal=bst().ps==='tape'?boardPal():null,lpal=bst().ps==='line'?boardPal():null;
  if(isColl()){
    var lay0=Object.assign({},state.board.lay,{n:collN()});
    state.cvis=collBuild(bd,state.board.pieces,map,lay0,boardAR(),bst().bd,{live:true,empty:true,pal:boardPal(),bgc:boardBgc(),frame:bst()});
    if(state.cs>=state.cvis.length)state.cs=-1;
    shown=state.cvis.length;
  }else state.board.pieces.forEach(function(p,i){
    var it=map[p.id];if(!it||((it.wish||it.stored)&&!state.fantasy))return;shown++;
    var tsp=tpal?tapeSpec(i,tpal):null;
    var pe=el('div',{class:'piece'+(i===state.sel?' sel':'')+(p.nf?' nf':'')+(tsp?' tp'+tsp.pat:''),'data-i':String(i),style:pieceStyle(p,it)+(tsp?';--tp:'+tsp.c+';--tp2:'+tsp.c2:'')+(lpal?';--lc:'+lineSpec(i,lpal):'')+';--pin:'+PINS[(i*5+3)%PINS.length]+';--pind:'+mixHex(PINS[(i*5+3)%PINS.length],'#000000',.45)},
      boardImg(it,p),
      el('button',{class:'del',type:'button','aria-label':'Remove '+it.name,text:'x'}),
      el('span',{class:'rot','aria-hidden':'true',title:'Drag to rotate',text:'\u21BB'}),
      el('span',{class:'handle','aria-hidden':'true'}));
    bd.appendChild(pe);
  });
  if(!shown&&!isColl()&&!(state.board.texts||[]).length)bd.appendChild(el('div',{class:'boardempty'},el('div',null,el('div',{class:'bigmirror',text:'\uD83E\uDE9E'}),el('div',{text:'Add pieces from your closet. Mischief starts here.'}))));
  if(!(state.selT<(state.board.texts||[]).length))state.selT=-1;
  applyBoardLook(bd);
  paintSel();
  renderTabs();
}
function initBoardTools(){
  var tools=$('board-more'),mq=window.matchMedia('(max-width:820px), (max-width:1100px) and (hover:none) and (pointer:coarse)');
  function sync(){tools.open=!mq.matches}sync();
  if(mq.addEventListener)mq.addEventListener('change',sync);
}
function wireBoard(){
  initBoardTools();
  var runtime=window.ClosetLintRuntime;
  if(runtime&&runtime.watchBoardSave)runtime.watchBoardSave(paintBoardSaveStatus);
  $('board-draft-retry').addEventListener('click',function(){if(runtime&&runtime.retryBoardSave)runtime.retryBoardSave();else if(!runtime)persistBoard()});
  $('board-outfit-retry').addEventListener('click',function(){saveOutfit()});
  var bd=$('board');
  bd.addEventListener('pointerdown',function(e){
    var owner=state.board;
    if(state.cutIdx>=0){startLasso(e);return}
    var pl0=e.target.closest('.bpal');if(pl0){palPointer(e,pl0,bd);return}
    var cs0=e.target.closest('.cslot');if(cs0){collPointer(e,cs0,bd);return}
    if(state.swapFrom!=null)collCancel();
    var pe=e.target.closest('.piece');
    if(!pe){selectPiece(-1);return}
    if(pe.dataset.t!=null){textPointer(e,pe,bd);return}
    var i=+pe.dataset.i,p=state.board.pieces[i];if(!p)return;
    if(e.target.classList.contains('del')){boardDel('p',i);e.preventDefault();return}
    selectPiece(i);
    var before=JSON.stringify(p);
    var rect=bd.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,o={x:p.x,y:p.y,w:p.w};
    var br=pe.getBoundingClientRect(),cx=br.left+br.width/2,cy=br.top+br.height/2,d0=Math.max(12,Math.hypot(sx-cx,sy-cy));
    var resize=e.target.classList.contains('handle'),rotate=e.target.classList.contains('rot'),a0=Math.atan2(sy-cy,sx-cx)*180/Math.PI,r0=p.rot||0;
    try{pe.setPointerCapture(e.pointerId)}catch(err){}
    function move(ev){
      if(state.board!==owner||owner.pieces[i]!==p||ev.pointerId!==e.pointerId)return;
      if(rotate){
        var a=r0+(Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI-a0);
        a=snapRot(a,ev);
        p.rot=normRot(a);pe.style.transform='rotate('+p.rot+'deg)';return;
      }
      if(resize){var dd=Math.hypot(ev.clientX-cx,ev.clientY-cy);p.w=clamp(o.w*dd/d0,6,95);pe.style.width=p.w+'%';return}
      var dx=(ev.clientX-sx)/rect.width*100,dy=(ev.clientY-sy)/rect.height*100;
      p.x=clamp(o.x+dx,-o.w/2,100-o.w/2);p.y=clamp(o.y+dy,-5,98);pe.style.left=p.x+'%';pe.style.top=p.y+'%';
    }
    function up(ev){if(ev&&ev.pointerId!==e.pointerId)return;pe.removeEventListener('pointermove',move);pe.removeEventListener('pointerup',up);pe.removeEventListener('pointercancel',up);pe.removeEventListener('lostpointercapture',up);if(state.board===owner&&owner.pieces[i]===p&&JSON.stringify(p)!==before)persistBoard(owner)}
    pe.addEventListener('pointermove',move);pe.addEventListener('pointerup',up);pe.addEventListener('pointercancel',up);pe.addEventListener('lostpointercapture',up);
    e.preventDefault();
  });
  function paintCutBtn(){var on=state.cutIdx>=0;$('scut').innerHTML=on?'\u2716\uFE0E<span class="bl"> Cancel cut</span>':'\u2702\uFE0E<span class="bl"> Cut out</span>';$('scut').title=on?'Cancel the cut-out':'Cut out: draw an outline around the item';$('scut').setAttribute('aria-label',on?'Cancel cut':'Cut out');$('scut').classList.toggle('on',on);$('board').classList.toggle('cutting',on)}
  function endCut(){state.cutIdx=-1;paintCutBtn()}
  state.endCut=endCut;
  function startLasso(e){
    var owner=state.board;
    var pe=bd.querySelector('.piece[data-i="'+state.cutIdx+'"]'),p=state.board.pieces[state.cutIdx];
    if(!pe||!p){endCut();return}
    e.preventDefault();
    var br=pe.getBoundingClientRect(),cx=br.left+br.width/2,cy=br.top+br.height/2,w=pe.offsetWidth||1,h=pe.offsetHeight||1,rot=-(p.rot||0)*Math.PI/180,co=Math.cos(rot),si=Math.sin(rot);
    function local(ev){var vx=ev.clientX-cx,vy=ev.clientY-cy,lx=vx*co-vy*si,ly=vx*si+vy*co,X=clamp((lx+w/2)/w*100,0,100),Y=clamp((ly+h/2)/h*100,0,100);return [p.fx?100-X:X,p.fy?100-Y:Y]}
    var pts=[local(e)],NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg'),pl=document.createElementNS(NS,'polyline');
    svg.setAttribute('class','lasso');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');
    pl.setAttribute('fill','rgba(47,84,235,.14)');pl.setAttribute('stroke','#2F54EB');pl.setAttribute('stroke-width','2');pl.setAttribute('stroke-dasharray','5 4');pl.setAttribute('vector-effect','non-scaling-stroke');
    svg.appendChild(pl);pe.appendChild(svg);
    function draw(){pl.setAttribute('points',pts.map(function(q){return q[0]+','+q[1]}).join(' '))}
    draw();
    try{bd.setPointerCapture(e.pointerId)}catch(err){}
    function mv(ev){if(state.board!==owner||owner.pieces.indexOf(p)<0||ev.pointerId!==e.pointerId)return;pts.push(local(ev));draw()}
    function fin(ev){
      if(ev&&ev.pointerId!==e.pointerId)return;
      bd.removeEventListener('pointermove',mv);bd.removeEventListener('pointerup',fin);bd.removeEventListener('pointercancel',fin);bd.removeEventListener('lostpointercapture',fin);
      if(svg.parentNode)svg.parentNode.removeChild(svg);
      if(state.board!==owner||owner.pieces.indexOf(p)<0)return;
      if(ev&&(ev.type==='pointercancel'||ev.type==='lostpointercapture')){endCut();renderBoard();return}
      if(pts.length>=6){
        var step=Math.max(1,Math.floor(pts.length/70)),out=[];
        for(var k=0;k<pts.length;k+=step)out.push([round2(pts[k][0]),round2(pts[k][1])]);
        if(out.length>=3)boardDesignChange('Cut-out applied. Original photo unchanged.',function(){p.clip=out});
      }
      endCut();renderBoard();
    }
    bd.addEventListener('pointermove',mv);bd.addEventListener('pointerup',fin);bd.addEventListener('pointercancel',fin);bd.addEventListener('lostpointercapture',fin);
  }
  function editBoardPiece(i){var p=state.board.pieces[i];if(!p)return;var it=byIdA()[p.id];if(it)openEdit(it);else toast('That piece is no longer in your closet')}
  $('sedit').addEventListener('click',function(){editBoardPiece(state.sel)});
  $('sremovebg').addEventListener('click',function(){removeBoardBackground(false)});
  $('cremovebg').addEventListener('click',function(){removeBoardBackground(true)});
  $('board').addEventListener('dblclick',function(e){if(state.cutIdx>=0)return;var tn=e.target.closest&&e.target.closest('.piece.btxt');if(tn&&tn.dataset.t!=null){selectText(+tn.dataset.t);var ti=$('ttext');if(ti){ti.focus();ti.select()}return}var n=e.target.closest&&e.target.closest('.piece');if(n&&n.dataset.i!==undefined){selectPiece(+n.dataset.i);editBoardPiece(+n.dataset.i)}});
  $('sflipx').addEventListener('click',function(){var p=state.board.pieces[state.sel];if(!p)return;if(p.fx)delete p.fx;else p.fx=1;persistBoard();renderBoard()});
  $('sframe').addEventListener('click',function(){var p=state.board.pieces[state.sel];if(!p)return;if(p.nf)delete p.nf;else p.nf=1;persistBoard();renderBoard()});
  $('sflipy').addEventListener('click',function(){var p=state.board.pieces[state.sel];if(!p)return;if(p.fy)delete p.fy;else p.fy=1;persistBoard();renderBoard()});
  $('srotreset').addEventListener('click',function(){var p=state.board.pieces[state.sel];if(!p)return;boardDesignChange('Piece straightened.',function(){delete p.rot})});
  $('scut').addEventListener('click',function(){
    if(state.cutIdx>=0){endCut();return}
    if(state.sel<0)return;
    state.cutIdx=state.sel;paintCutBtn();toast('Draw around the item with your mouse or finger. Release to finish.');
  });
  $('scutreset').addEventListener('click',function(){var p=state.board.pieces[state.sel];if(!p)return;boardDesignChange('Cut-out reset to the original photo shape.',function(){delete p.clip})});
  bd.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&state.cutIdx>=0){state.endCut();return}
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&(state.swapFrom!=null||state.collRep!=null)){collCancel();return}
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&(e.key==='z'||e.key==='Z')){
      var a0=document.activeElement,t0=a0&&a0.tagName;if(t0==='INPUT'||t0==='TEXTAREA'||t0==='SELECT'||(a0&&a0.isContentEditable))return;
      if(!bd.offsetParent||document.querySelector('dialog[open]'))return;
      if(boardUndoDel())e.preventDefault();return;
    }
    if(e.key!=='Delete'&&e.key!=='Backspace')return;
    var a=document.activeElement,tg=a&&a.tagName;
    if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||(a&&a.isContentEditable))return;
    if(!bd.offsetParent||document.querySelector('dialog[open]'))return;
    if(state.selT>=0)boardDel('t',state.selT);
    else if(isColl()&&state.cs>=0)collRemove();
    else if(state.sel>=0)boardDel('p',state.sel);
    else return;
    e.preventDefault();
  });
  $('sfront').addEventListener('click',function(){var p=state.board.pieces[state.sel];if(!p)return;p.z=nextZ();persistBoard();renderBoard()});
  $('sback').addEventListener('click',function(){
    var p=state.board.pieces[state.sel];if(!p)return;
    var m=1e9;state.board.pieces.forEach(function(q){if(q.z<m)m=q.z});p.z=m-1;persistBoard();renderBoard();
  });
  $('sremove').addEventListener('click',function(){if(state.sel<0)return;boardDel('p',state.sel)});
  $('onew').addEventListener('click',function(){startNewOutfit()});
  $('onewundo').addEventListener('click',function(){if(state.newOutfitUndo)state.newOutfitUndo.undo()});
  $('ocopy').addEventListener('click',function(){saveOutfit(true)});
  $('oname').addEventListener('input',function(e){state.board.name=e.target.value;persistBoard();paintBoardContext()});
  $('osave').addEventListener('click',saveOutfit);
  $('ofav').addEventListener('click',function(){
    var b=state.board,op=state.outfitSave;
    var linked=b.id&&!state.boardSaving&&!(op&&op.b===b&&op.phase==='error');
    b.fav=!b.fav;if(!b.fav)delete b.fav;persistBoard();paintOMeta();
    if(linked)return ofSave(b.id,{fav:!!b.fav}).then(function(ok){
      if(!ok&&state.board===b&&!state.boardSaving){
        if(!(state.outfitSave&&state.outfitSave.b===b&&state.outfitSave.phase==='error'))setOutfitSave({b:b,id:b.id,asCopy:false,editing:true},'error','Favorite change could not be saved.');
        paintOMeta();paintBoardSaveStatus();
      }
    });
    if(b.fav)toast('Hearted. It is kept when you save the outfit.');
  });
  $('odetail').addEventListener('click',function(){
    var b=state.board;
    openOutfitDetails(Object.assign({},b),function(D){
      if(state.board!==b){toast('Return to the same board before changing its details.');return false}
      b.name=D.name||b.name;$('oname').value=b.name;
      var m=oMetaFrom({fav:D.fav,seasons:D.seasons,styles:D.styles,looks:D.looks,notes:D.notes});
      ['fav','seasons','styles','looks','notes'].forEach(function(k){if(k in m)b[k]=m[k];else delete b[k]});
      persistBoard();paintOMeta();
      if(b.pieces.length)return saveOutfit();
      toast('Kept on the board. Add pieces and save the outfit.');
    });
  });
  $('owear').addEventListener('click',function(){
    if(needDb())return;
    if(!state.board.pieces.length){toast('Add a few pieces first');return}
    saveOutfit().then(function(ok){if(ok&&state.lastSavedOutfit)openWearOutfit(state.lastSavedOutfit)});
  });
  $('oexport').addEventListener('click',exportImage);
  wireColl();
  wireBoardStyle();
}
