/* ---------- collage mode: framed layouts with windows, instead of freehand placement ---------- */
var COLL_MAX=12;
var COLL_FAMS=[['arches','Arches'],['hero','Hero arch'],['panes','Window'],['rainbow','Rainbow'],['bento','Bento'],['film','Film strip']];
var PANE_ROWS={1:[1],2:[1,1],3:[1,2],4:[2,2],5:[1,2,2],6:[2,2,2],7:[1,3,3],8:[2,3,3],9:[3,3,3],10:[1,3,3,3],11:[2,3,3,3],12:[3,3,3,3]};
function isColl(){return !!state.board.lay}
function collFamOk(k,n){return k==='hero'?n>=3:true}
/* n items in rows of at most `per`, as evenly as possible: balCounts(7,3) -> [3,2,2] */
function balCounts(n,per){var rows=Math.ceil(n/per),out=[],left=n,r;for(r=0;r<rows;r++){var c=Math.ceil(left/(rows-r));out.push(c);left-=c}return out}
function collGrid(box,rows,g){
  var R=rows.length,rh=(box.h-(R-1)*g)/R,out=[];
  rows.forEach(function(c,r){var cw=(box.w-(c-1)*g)/c;for(var i=0;i<c;i++)out.push({sh:'rr',r:0,inWin:true,x:box.x+i*(cw+g),y:box.y+r*(rh+g),w:cw,h:rh})});
  return out;
}
/* bento: split the board into n tiles, always cutting the longer side; the seed changes which side is bigger */
function bentoSplit(box,n,g,seed,depth,out){
  if(n<=1){out.push({sh:'rr',x:box.x,y:box.y,w:box.w,h:box.h});return}
  var n1=Math.ceil(n/2),n2=n-n1,flip=((seed+depth)&1)===1,c1=flip?n2:n1,c2=flip?n1:n2;
  var wob=(((seed*5+depth*3+n*2)%5)-2)*.05,ratio=clamp(c1/n+wob,.28,.72);
  var side=box.w/box.h>=1+(((seed+depth*2)%3)-1)*.18,a,b;
  if(side){var w1=(box.w-g)*ratio;a={x:box.x,y:box.y,w:w1,h:box.h};b={x:box.x+w1+g,y:box.y,w:box.w-g-w1,h:box.h}}
  else{var h1=(box.h-g)*ratio;a={x:box.x,y:box.y,w:box.w,h:h1};b={x:box.x,y:box.y+h1+g,w:box.w,h:box.h-g-h1}}
  bentoSplit(a,c1,g,seed,depth+1,out);bentoSplit(b,c2,g,seed,depth+1,out);
}
/* geometry in "board units": the board is 100 wide and 100/ar tall */
function collLayout(lay,n,ar,bd,ars){
  var W=100,H=W/ar,g=lay.g!=null?lay.g:2.2,pad=Math.max(g,decorInsetFor(bd)+.9),x0=pad,y0=pad,Wa=W-2*pad,Ha=H-2*pad,k=lay.k,out={slots:[],deco:[],win:null},i;
  n=clamp(n||1,1,COLL_MAX);
  function arch(x,y,w,h){return {sh:'arch',x:x,y:y,w:w,h:h}}
  if(k==='arches'){
    var per=n<=4?n:n<=8?Math.ceil(n/2):Math.ceil(n/3),cnt=balCounts(n,per),rh=(Ha-(cnt.length-1)*g)/cnt.length;
    cnt.forEach(function(c,ri){
      var w=Math.min((Wa-(c-1)*g)/c,rh/(cnt.length===1?1.15:1.05)),tot=c*w+(c-1)*g,sx=x0+(Wa-tot)/2;
      for(i=0;i<c;i++){var st=(cnt.length===1&&c>1)?1-.14*Math.abs(i-(c-1)/2):1,h=rh*st;out.slots.push(arch(sx+i*(w+g),y0+ri*(rh+g)+(rh-h),w,h))}
    });
  }else if(k==='hero'){
    var bw=Wa*(ar>=1?.42:.5),m=Math.max(1,n-1),rc=balCounts(m,m<=2?1:m<=6?2:3),rx=x0+bw+g,rw=Wa-bw-g,rh2=(Ha-(rc.length-1)*g)/rc.length;
    out.slots.push(arch(x0,y0,bw,Ha));
    rc.forEach(function(c,ri){var cw=(rw-(c-1)*g)/c;for(i=0;i<c;i++){var cx=rx+i*(cw+g),cy=y0+ri*(rh2+g);out.slots.push(cw*.95<=rh2?arch(cx,cy,cw,rh2):{sh:'pill',x:cx,y:cy,w:cw,h:rh2})}});
  }else if(k==='panes'||k==='rainbow'){
    var rb=k==='rainbow',th=rb?Math.max(1.4,g*.9):0,ww=Math.min(Wa,Ha/1.3),ox=x0+(Wa-ww)/2;
    if(rb)for(i=0;i<3;i++)out.deco.push({k:'arch',sh:'arch',x:ox+i*th,y:y0+i*th,w:ww-2*i*th,h:Ha-i*th,ci:i});
    var win={sh:'arch',x:ox+(rb?3*th:0),y:y0+(rb?3*th:0),w:ww-(rb?6*th:0),h:Ha-(rb?3*th:0)};
    out.win=win;out.slots=collGrid(win,PANE_ROWS[n],g);
  }else if(k==='bento'){
    bentoSplit({x:x0,y:y0,w:Wa,h:Ha},n,g,lay.s||0,0,out.slots);
  }else if(k==='film'){
    /* masonry strips: each frame has its photo's own proportions, so nothing is cropped */
    var A=function(i){var a=ars&&ars[i]>0?ars[i]:[.8,1,1.25,.9,1.1,.75,1.3,1][i%8];return clamp(a,.45,2.2)};
    var cols=Math.ceil(n/3),colItems=[],colU=[],q,c;
    for(q=0;q<cols;q++){colItems.push([]);colU.push(0)}
    for(i=0;i<n;i++){c=0;for(q=1;q<cols;q++)if(colU[q]<colU[c]-1e-6)c=q;colItems[c].push(i);colU[c]+=1/A(i)}
    var fg=Math.max(g*.7,.8),fw=((Wa-(cols-1)*g)/cols)*.78;
    colItems.forEach(function(it,ci){fw=Math.min(fw,(Ha-(it.length-1)*fg)/colU[ci])});
    var fbw=fw/.78,sp=fbw*.11,tot2=cols*fbw+(cols-1)*g,sx2=x0+(Wa-tot2)/2,pos=[];
    colItems.forEach(function(it,ci){
      var bx=sx2+ci*(fbw+g),colH=colU[ci]*fw+(it.length-1)*fg,y=y0+(Ha-colH)/2,pitch=sp*1.8,hh=sp*.8,hw=sp*.55,hy;
      out.deco.push({k:'band',sh:'rr',r:0,x:bx,y:0,w:fbw,h:H});
      for(hy=pitch*.4;hy<H-hh;hy+=pitch){out.deco.push({k:'hole',sh:'rr',r:.3,x:bx+sp*.22,y:hy,w:hw,h:hh});out.deco.push({k:'hole',sh:'rr',r:.3,x:bx+fbw-sp*.22-hw,y:hy,w:hw,h:hh})}
      it.forEach(function(idx){var h=fw/A(idx);pos[idx]={sh:'rr',r:.5,x:bx+sp,y:y,w:fw,h:h};y+=h+fg});
    });
    pos.forEach(function(q2){out.slots.push(q2)});
  }
  return out;
}
function collRadius(s){
  if(s.sh==='arch'){var ry=Math.min(s.w/2,s.h*.55),py=(ry/s.h*100).toFixed(3)+'%';return '50% 50% 0 0/'+py+' '+py+' 0 0'}
  var r=s.sh==='pill'?Math.min(s.w,s.h)/2:(s.r!=null?s.r:Math.min(2.4,Math.min(s.w,s.h)*.12));
  return (r/s.w*100).toFixed(3)+'%/'+(r/s.h*100).toFixed(3)+'%';
}
/* the same outline as an SVG path string, used for thumbnails and for the saved image */
function collPathD(s,ex){
  var x=s.x-ex,y=s.y-ex,w=s.w+2*ex,h=s.h+2*ex,X=x+w,Y=y+h,f=function(v){return v.toFixed(3)};
  if(s.sh==='arch'){var ry=Math.min(w/2,h*.55);return 'M'+f(x)+' '+f(Y)+'V'+f(y+ry)+'A'+f(w/2)+' '+f(ry)+' 0 0 1 '+f(X)+' '+f(y+ry)+'V'+f(Y)+'Z'}
  var r=s.sh==='pill'?Math.min(w,h)/2:(s.r!=null?s.r:Math.min(2.4,Math.min(w,h)*.12));r=Math.min(r,w/2,h/2);
  if(r<=.01)return 'M'+f(x)+' '+f(y)+'H'+f(X)+'V'+f(Y)+'H'+f(x)+'Z';
  var R=f(r);
  return 'M'+f(x+r)+' '+f(y)+'H'+f(X-r)+'A'+R+' '+R+' 0 0 1 '+f(X)+' '+f(y+r)+'V'+f(Y-r)+'A'+R+' '+R+' 0 0 1 '+f(X-r)+' '+f(Y)+'H'+f(x+r)+'A'+R+' '+R+' 0 0 1 '+f(x)+' '+f(Y-r)+'V'+f(y+r)+'A'+R+' '+R+' 0 0 1 '+f(x+r)+' '+f(y)+'Z';
}
/* where the photo sits inside its window: cover-fit, then zoom, then pan (px, py are 0 to 1 across the spare room) */
function collImgGeom(it,p,sw,sh){
  var a=it&&it.ar>0?it.ar:1,zm=p.zm||1,iw,ih;
  if(a>sw/sh){ih=sh*zm;iw=ih*a}else{iw=sw*zm;ih=iw/a}
  var px=p.px!=null?p.px:.5,py=p.py!=null?p.py:.5;
  return {l:-(iw-sw)*px,t:-(ih-sh)*py,w:iw,h:ih};
}
function collImgStyle(it,p,sw,sh){
  var G=collImgGeom(it,p,sw,sh);
  return 'left:'+(G.l/sw*100).toFixed(3)+'%;top:'+(G.t/sh*100).toFixed(3)+'%;width:'+(G.w/sw*100).toFixed(3)+'%;height:'+(G.h/sh*100).toFixed(3)+'%'+((p.fx||p.fy)?';transform:scale('+(p.fx?-1:1)+','+(p.fy?-1:1)+')':'');
}
function collFrameDims(lay){var g=lay.g!=null?lay.g:2.2;return {t:Math.min(1.2,g*.45),off:Math.min(.9,g*.35),lw:.22}}
function wfColor(board){
  var s=bst(board);if(s.wc)return s.wc;
  var bgc=boardBgc(board),best=null,bs=-1;
  boardPal(board).forEach(function(h){var d=cdist(h,bgc);if(d>bs){bs=d;best=h}});
  return bs>=70?best:inkFor(bgc);
}
function collFrameCss(lay,st){
  if(!st.wf)return '';
  var d=collFrameDims(lay),c=wfColor();
  return st.wf==='mat'?';box-shadow:0 0 0 '+d.t+'cqw '+c:';outline:'+d.lw+'cqw solid '+c+';outline-offset:'+d.off+'cqw';
}
function collPalFor(st){var cp=null;PALETTES.forEach(function(q){if(q[0]===st.pn)cp=q[2]});return cp||TAPE_DEF.concat(['#8FB8E8'])}
/* builds the windows into a board or a small preview; returns the indexes (into pieces) of the pieces it showed */
function collBuild(host,pieces,map,lay,ar,bd,o){
  var H=100/ar,vis=[],pc=function(v,t){return (v/t*100).toFixed(3)+'%'};
  pieces.forEach(function(p,i){var it=map[p.id];if(!it||((it.wish||it.stored)&&!state.fantasy))return;vis.push(i)});
  vis=vis.slice(0,COLL_MAX);
  var n=clamp(Math.max(lay.n||1,vis.length),1,COLL_MAX),ars=vis.map(function(i){var it=map[pieces[i].id];return it&&it.ar>0?it.ar:1}),L=collLayout(lay,n,ar,bd,ars),pal=o.pal;
  L.deco.forEach(function(d){
    var st='left:'+pc(d.x,100)+';top:'+pc(d.y,H)+';width:'+pc(d.w,100)+';height:'+pc(d.h,H)+';border-radius:'+collRadius(d);
    if(d.k==='arch')st+=';background:'+visCol(pal[d.ci%pal.length],o.bgc);
    else if(d.k==='band')st+=';background:#16111C';
    else st+=';background:'+o.bgc;
    host.appendChild(el('div',{class:'cdeco',style:st}));
  });
  var win=null,Wn=L.win;
  if(Wn){win=el('div',{class:'cwin',style:'left:'+pc(Wn.x,100)+';top:'+pc(Wn.y,H)+';width:'+pc(Wn.w,100)+';height:'+pc(Wn.h,H)+';border-radius:'+collRadius(Wn)+(o.frame?collFrameCss(lay,o.frame):'')});host.appendChild(win)}
  L.slots.forEach(function(s,k){
    var inW=!!(Wn&&s.inWin),par=inW?win:host,bx=inW?Wn:{x:0,y:0,w:100,h:H};
    var st='left:'+pc(s.x-bx.x,bx.w)+';top:'+pc(s.y-bx.y,bx.h)+';width:'+pc(s.w,bx.w)+';height:'+pc(s.h,bx.h)+(inW?'':';border-radius:'+collRadius(s)+(o.frame?collFrameCss(lay,o.frame):''));
    var pi=k<vis.length?vis[k]:-1;
    if(pi>=0){
      var p=pieces[pi],it=map[p.id];
      par.appendChild(el('div',{class:'cslot'+(inW?' inw':'')+(o.live&&k===state.cs?' csel':''),'data-k':String(k),'data-i':String(pi),'data-sw':s.w.toFixed(4),'data-sh':s.h.toFixed(4),style:st+(it.bg?';background:'+it.bg:'')},
        el('img',{class:'cimg',src:o.preview?photoThumbnail(it.photo):it.photo,alt:it.name,loading:o.preview?'lazy':'eager',decoding:'async',style:collImgStyle(it,p,s.w,s.h)})));
    }else if(o.empty){
      par.appendChild(el('div',{class:'cslot cempty'+(inW?' inw':''),'data-k':String(k),'data-e':'1',style:st},el('span',{text:'+'})));
    }
  });
  return vis;
}
function collN(){var b=state.board;return clamp(Math.max(b.lay&&b.lay.n||1,b.pieces.length),1,COLL_MAX)}
function csPiece(){var i=(state.cvis||[])[state.cs];return i==null||state.cs<0?null:(state.board.pieces[i]||null)}
function selectSlot(k){
  state.cs=k;state.sel=-1;state.selT=-1;state.selPal=false;
  var bd=$('board'),pl=bd.querySelector('.bpal');if(pl)pl.classList.remove('psel');
  bd.querySelectorAll('.piece').forEach(function(n){n.classList.remove('sel')});
  bd.querySelectorAll('.cslot').forEach(function(n){n.classList.toggle('csel',+n.dataset.k===k&&!n.dataset.e)});
  paintSel();
}
function collCancel(){state.swapFrom=null;state.collRep=null;var bd=$('board');if(bd)bd.classList.remove('cswap');paintCollBar()}
function paintCollBar(){
  var m=$('collmsg');if(!m)return;m.textContent='';
  var t=state.swapFrom!=null?'Swapping window '+(state.swapFrom+1)+': tap the window you want to swap it with.':state.collRep!=null?'Replacing window '+(state.collRep+1)+': pick a piece from the list.':'';
  m.classList.toggle('hide',!t||!isColl());
  if(t){m.appendChild(document.createTextNode(t+' '));m.appendChild(el('button',{class:'linkbtn',type:'button',text:'Cancel',onclick:collCancel}))}
}
function collSwap(k1,k2){
  var v=state.cvis||[],i1=v[k1],i2=v[k2],P=state.board.pieces;
  if(i1==null||i2==null||i1===i2)return;
  boardDesignChange('Windows swapped.',function(){var t=P[i1];P[i1]=P[i2];P[i2]=t;state.cs=k2});
}
function collRemove(){var i=(state.cvis||[])[state.cs];if(i==null)return;boardDel('p',i)}
function collAdd(it){
  var b=state.board,k=state.collRep,vis=state.cvis||[];state.collRep=null;
  if(k!=null&&vis[k]!=null){
    var oi=vis[k],old=b.pieces[oi];
    boardDesignChange('Replaced the piece in this window.',function(){b.pieces[oi]={id:it.id,x:old.x,y:old.y,w:old.w,z:old.z,c:1}});
    selectSlot(k);paintCollBar();return;
  }
  if(b.pieces.length>=COLL_MAX){toast('Collages hold up to '+COLL_MAX+' pieces');paintCollBar();return}
  b.pieces.push({id:it.id,x:30,y:14,w:24,z:nextZ(),c:1});
  persistBoard();renderBoard();selectSlot((state.cvis||[]).length-1);
}
function boardDesignSnapshot(b){
  var out={};['pieces','lay','texts','st'].forEach(function(k){if(k in b)out[k]=b[k]});return JSON.parse(JSON.stringify(out));
}
function boardDesignChange(message,change){
  var b=state.board,before=boardDesignSnapshot(b);change();
  var after=JSON.stringify(boardDesignSnapshot(b));if(after===JSON.stringify(before)){renderBoard();return}
  var entry={b:b};
  function restore(){
    ['pieces','lay','texts','st'].forEach(function(k){delete b[k]});Object.assign(b,JSON.parse(JSON.stringify(before)));
    if(state.designUndo===entry)state.designUndo=null;
    state.sel=-1;state.selT=-1;state.cs=-1;state.cutIdx=-1;state.tidyUndo=null;collCancel();persistBoard();renderBoard();toast('Design change undone.');
  }
  entry.undo=function(){
    if(state.board!==b){toast('Return to the same board before undoing this design change.');return}
    if(state.boardSaving){toast('Wait for the outfit to finish saving.');return}
    if(JSON.stringify(boardDesignSnapshot(b))!==after)askConfirm('Undo this design change? Later board design edits will also be replaced. The outfit name, saved outfits, and wardrobe pieces stay unchanged.','Undo design change',restore);else restore();
  };
  state.designUndo=entry;persistBoard();renderBoard();after=JSON.stringify(boardDesignSnapshot(b));toastAct(message,'Undo',entry.undo);
}
function collOn(approved){
  var b=state.board;
  if(b.pieces.length>COLL_MAX){toast('Collages hold up to '+COLL_MAX+' pieces. Remove a few first.');return}
  if(approved!==true){askConfirm('Switch to Collage? The pieces will be displayed in fitted windows instead of your freehand arrangement. Your original photos are unchanged. Undo design restores this board.','Switch to Collage',function(){collOn(true)});return}
  boardDesignChange('Switched to Collage.',function(){var n=Math.max(1,b.pieces.length);b.lay={k:n>=6?'bento':'arches',n:n,g:2.2,s:0};state.sel=-1;state.cs=-1;state.selT=-1});
}
function collOff(approved){
  var b=state.board;
  if(approved!==true){askConfirm('Switch to Freehand? The collage windows will be removed. Pieces added in Collage may be rearranged automatically. Original photos stay unchanged; Undo design restores the collage.','Switch to Freehand',function(){collOff(true)});return}
  boardDesignChange('Switched to Freehand.',function(){
    var fresh=b.pieces.some(function(p){return p.c});delete b.lay;state.cs=-1;collCancel();
    if(fresh){tidyBoard(true);b.pieces.forEach(function(p){delete p.c});state.tidyUndo=null}
  });
}
function setLay(patch,approved){
  var b=state.board;if(!b.lay)return;
  if(patch.k&&patch.k!==b.lay.k&&approved!==true){askConfirm('Change collage layout? This rearranges the windows and can change how photos are cropped in them. Original photos are unchanged. Undo design restores the current layout.','Change layout',function(){setLay(patch,true)});return}
  boardDesignChange('Collage layout updated.',function(){
    b.lay=Object.assign({},b.lay,patch);
    if('n' in patch)b.lay.n=clamp(b.lay.n,Math.max(1,b.pieces.length),COLL_MAX);
    if(!collFamOk(b.lay.k,collN()))b.lay.k='arches';
  });
}
function collThumb(k,n){
  var b=state.board,ar=boardAR(),H=100/ar,lay=Object.assign({},b.lay,{k:k,g:2.6}),L=collLayout(lay,n,ar,null),h='',id='tc'+k;
  L.deco.forEach(function(d){if(d.k==='hole')return;h+='<path d="'+collPathD(d,0)+'" fill="'+(d.k==='band'?'#16111C':'currentColor')+'" opacity="'+(d.k==='arch'?[.25,.4,.55][d.ci%3]:1)+'"/>'});
  if(L.win)h+='<clipPath id="'+id+'"><path d="'+collPathD(L.win,0)+'"/></clipPath><g clip-path="url(#'+id+')">';
  L.slots.forEach(function(s){h+='<path d="'+collPathD(s,0)+'" fill="'+(L.deco.length&&k==='film'?'#F4F1F6':'currentColor')+'" opacity="'+(k==='film'?1:.75)+'"/>'});
  if(L.win)h+='</g>';
  var w=ar>=1?36:Math.round(36*ar*1.1),hh=Math.round(w/ar);
  return '<svg viewBox="0 0 100 '+H.toFixed(2)+'" width="'+w+'" height="'+hh+'" aria-hidden="true">'+h+'</svg>';
}
/* Layout section at the top of the Style panel: Freehand or Collage, and the collage controls */
function collPanel(p){
  var b=state.board,on=!!b.lay;
  p.appendChild(el('h3',{text:'Layout'}));
  var r0=el('div',{class:'chips'});
  r0.appendChild(chip('🖐️ Freehand',!on,function(){if(on)collOff()}));
  r0.appendChild(chip('\uD83E\uDDE9 Collage',on,function(){if(!on)collOn()}));
  p.appendChild(r0);
  if(!on)return;
  var n=collN(),minN=Math.max(1,b.pieces.length);
  var fams=el('div',{class:'collfams'});
  COLL_FAMS.forEach(function(f){
    var ok=collFamOk(f[0],n),btn=el('button',{class:'chip cfam',type:'button','aria-pressed':b.lay.k===f[0]?'true':'false',title:f[1]+(ok?'':' (needs 3 or more windows)'),disabled:ok?false:'disabled',onclick:function(){setLay({k:f[0]})}});
    btn.innerHTML=collThumb(f[0],n)+'<span>'+f[1]+'</span>';
    fams.appendChild(btn);
  });
  p.appendChild(fams);
  p.appendChild(el('div',{class:'collstep'},
    el('button',{class:'btn small',type:'button','aria-label':'Fewer windows',title:'Fewer windows',text:'\u2212',disabled:n<=minN?'disabled':false,onclick:function(){setLay({n:n-1})}}),
    el('span',{class:'fine',text:n+(n===1?' window':' windows')}),
    el('button',{class:'btn small',type:'button','aria-label':'More windows',title:'More windows',text:'+',disabled:n>=COLL_MAX?'disabled':false,onclick:function(){setLay({n:n+1})}}),
    b.lay.k==='bento'?el('button',{class:'btn small',type:'button',title:'Try a different bento arrangement',text:'\uD83D\uDD00 Shuffle',onclick:function(){setLay({s:(b.lay.s||0)+1})}}):null));
  var gv=b.lay.g!=null?b.lay.g:2.2;
  p.appendChild(el('label',{class:'srow'},el('span',{text:'Gutter'}),el('input',{type:'range',id:'cgut',min:'0.4',max:'6',step:'0.1',value:String(gv),'aria-label':'Gutter between windows',oninput:function(e){b.lay.g=+e.target.value;state.keepPanel=true;persistBoard(b);renderBoard()}})));
}
function collPointer(e,cs,bd){
  var owner=state.board;
  var k=+cs.dataset.k,empty=cs.dataset.e==='1';
  if(state.swapFrom!=null){
    var from=state.swapFrom;state.swapFrom=null;bd.classList.remove('cswap');
    if(empty)toast('Pick a window that has a piece in it');else if(from!==k)collSwap(from,k);
    paintCollBar();e.preventDefault();return;
  }
  if(empty){selectSlot(-1);toast('Pick a piece from the list to fill this window');e.preventDefault();return}
  selectSlot(k);
  var i=+cs.dataset.i,p=state.board.pieces[i],it=byIdA()[p&&p.id],img=cs.querySelector('.cimg');
  if(!p||!it||!img)return;
  var before=JSON.stringify(p);
  var sx=e.clientX,sy=e.clientY,px0=p.px!=null?p.px:.5,py0=p.py!=null?p.py:.5,sw=+cs.dataset.sw,sh=+cs.dataset.sh;
  var ovW=img.offsetWidth-cs.clientWidth,ovH=img.offsetHeight-cs.clientHeight;
  var mode='wait',ghost=null,over=null,lastEv=e;
  function moveGhost(ev){if(ghost){ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px'}}
  var timer=setTimeout(function(){
    if(state.board!==owner||owner.pieces[i]!==p)return;
    mode='swap';cs.classList.add('clift');
    ghost=el('div',{class:'cghost'},el('img',{src:it.photo,alt:''}));document.body.appendChild(ghost);moveGhost(lastEv);
  },380);
  try{cs.setPointerCapture(e.pointerId)}catch(err){}
  function move(ev){
    if(state.board!==owner||owner.pieces[i]!==p||ev.pointerId!==e.pointerId)return;
    lastEv=ev;var dx=ev.clientX-sx,dy=ev.clientY-sy;
    if(mode==='wait'&&Math.hypot(dx,dy)>6){clearTimeout(timer);mode='pan'}
    if(mode==='pan'){
      if(ovW>1)p.px=clamp(px0-dx/ovW,0,1);
      if(ovH>1)p.py=clamp(py0-dy/ovH,0,1);
      img.style.cssText=collImgStyle(it,p,sw,sh);
    }else if(mode==='swap'){
      moveGhost(ev);
      var t=document.elementFromPoint(ev.clientX,ev.clientY),ts=t&&t.closest?t.closest('.cslot'):null;
      if(over&&over!==ts)over.classList.remove('cdrop');
      over=ts&&ts!==cs&&!ts.dataset.e?ts:null;
      if(over)over.classList.add('cdrop');
    }
  }
  function end(ev,cancel){
    if(ev&&ev.pointerId!==e.pointerId)return;
    clearTimeout(timer);
    cs.removeEventListener('pointermove',move);cs.removeEventListener('pointerup',up);cs.removeEventListener('pointercancel',cn);cs.removeEventListener('lostpointercapture',cn);
    if(ghost&&ghost.parentNode)ghost.parentNode.removeChild(ghost);
    cs.classList.remove('clift');if(over)over.classList.remove('cdrop');
    if(state.board!==owner||owner.pieces[i]!==p)return;
    if(mode==='swap'&&over&&!cancel)collSwap(k,+over.dataset.k);
    else if(mode==='pan'&&owner.pieces[i]===p&&JSON.stringify(p)!==before)persistBoard(owner);
  }
  function up(ev){end(ev,false)}
  function cn(ev){end(ev,true)}
  cs.addEventListener('pointermove',move);cs.addEventListener('pointerup',up);cs.addEventListener('pointercancel',cn);cs.addEventListener('lostpointercapture',cn);
  e.preventDefault();
}
function wireColl(){
  state.cs=-1;state.swapFrom=null;state.collRep=null;
  $('cswap').addEventListener('click',function(){
    if(state.swapFrom!=null){collCancel();return}
    if(state.cs<0)return;
    if((state.cvis||[]).length<2){toast('Add another piece to swap with');return}
    state.swapFrom=state.cs;state.collRep=null;$('board').classList.add('cswap');paintCollBar();
  });
  $('crep').addEventListener('click',function(){
    if(state.cs<0)return;
    state.collRep=state.cs;state.swapFrom=null;$('board').classList.remove('cswap');paintCollBar();toast('Pick a piece from the list to put in this window.');
  });
  $('cflipx').addEventListener('click',function(){var p=csPiece();if(!p)return;if(p.fx)delete p.fx;else p.fx=1;persistBoard();renderBoard()});
  $('cflipy').addEventListener('click',function(){var p=csPiece();if(!p)return;if(p.fy)delete p.fy;else p.fy=1;persistBoard();renderBoard()});
  $('czoom').addEventListener('input',function(e){
    var p=csPiece();if(!p)return;var v=+e.target.value;if(v<=1.001)delete p.zm;else p.zm=Math.round(v*100)/100;
    var sl=$('board').querySelector('.cslot[data-k="'+state.cs+'"]'),it=byIdA()[p.id];
    if(sl&&it){var im=sl.querySelector('.cimg');if(im)im.style.cssText=collImgStyle(it,p,+sl.dataset.sw,+sl.dataset.sh)}
    persistBoard();
  });
  $('creset').addEventListener('click',function(){var p=csPiece();if(!p)return;boardDesignChange('Window crop reset.',function(){delete p.zm;delete p.px;delete p.py})});
  $('cedit').addEventListener('click',function(){var p=csPiece();if(!p)return;var it=byIdA()[p.id];if(it)openEdit(it);else toast('That piece is no longer in your closet')});
  $('cremove').addEventListener('click',collRemove);
  $('board').addEventListener('dblclick',function(e){var n=e.target.closest&&e.target.closest('.cslot');if(n&&n.dataset.i!==undefined){var p=state.board.pieces[+n.dataset.i],it=p&&byIdA()[p.id];if(it)openEdit(it)}});
}
/* saved image of a collage: same geometry as the board */
function collDraw(g,W,H,map,board){
  var b=board||state.board,lay=b.lay,s=bst(b),ar=boardAR(b),pal=boardPal(b),bgc=boardBgc(b),vis=[];
  b.pieces.forEach(function(p,i){var it=map[p.id];if(it&&!((it.wish||it.stored)&&!state.fantasy))vis.push(i)});
  vis=vis.slice(0,COLL_MAX);
  var n=clamp(Math.max(lay.n||1,vis.length),1,COLL_MAX),ars=vis.map(function(i){var it=map[b.pieces[i].id];return it&&it.ar>0?it.ar:1}),L=collLayout(lay,n,ar,s.bd,ars),fd=collFrameDims(lay),fc=wfColor(b),sc=W/100,chain=Promise.resolve();
  function frame(sh){
    if(!s.wf)return;
    g.save();g.strokeStyle=fc;
    if(s.wf==='mat'){g.lineWidth=2*fd.t;g.stroke(new Path2D(collPathD(sh,0)))}
    else{g.lineWidth=fd.lw;g.stroke(new Path2D(collPathD(sh,fd.off)))}
    g.restore();
  }
  g.save();g.scale(sc,sc);
  L.deco.forEach(function(d){g.fillStyle=d.k==='arch'?visCol(pal[d.ci%pal.length],bgc):d.k==='band'?'#16111C':bgc;g.fill(new Path2D(collPathD(d,0)))});
  if(L.win)frame(L.win);
  g.restore();
  L.slots.forEach(function(sl,k){
    if(k>=vis.length)return;
    var p=b.pieces[vis[k]],it=map[p.id];
    chain=chain.then(function(){return loadImg(it.photo)}).then(function(im){
      var G=collImgGeom(it,p,sl.w,sl.h);
      g.save();g.scale(sc,sc);
      if(!sl.inWin)frame(sl);
      if(L.win&&sl.inWin)g.clip(new Path2D(collPathD(L.win,0)));
      g.clip(new Path2D(collPathD(sl,0)));
      g.fillStyle=it.bg||'#F1F3F3';g.fillRect(sl.x,sl.y,sl.w,sl.h);
      g.translate(sl.x+G.l+G.w/2,sl.y+G.t+G.h/2);g.scale(p.fx?-1:1,p.fy?-1:1);
      g.drawImage(im,-G.w/2,-G.h/2,G.w,G.h);
      g.restore();
    });
  });
  return chain;
}
