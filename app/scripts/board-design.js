/* ---------- board styling: shape, background, border, piece style, text, color strip, tidy ---------- */
var SHAPES={'4:3':4/3,'1:1':1,'4:5':4/5,'9:16':9/16};
var SHAPE_LBL={'4:3':'4:3 wide','1:1':'Square','4:5':'4:5 portrait','9:16':'9:16 tall'};
var TEXTURES=[['plain','Plain'],['dots','Dots'],['grain','Paper grain'],['linen','Linen'],['wash','Watercolor'],['graph','Graph paper'],['cork','Cork'],['grit','Gritty gradient']];
/* outline = ink-colored halo around each letter; shadow = soft drop shadow; both scale with the font size */
function textFx(t){
  var r='.055em',m='-.055em',L=[];
  if(t.o){var k=inkFor(t.c||'#14272F');[[r,0],[m,0],[0,r],[0,m],[r,r],[m,m],[r,m],[m,r]].forEach(function(d){L.push(d[0]+' '+d[1]+' 0 '+k)})}
  if(t.sh)L.push('.07em .09em .12em rgba(0,0,0,.5)');
  return L.length?L.join(','):'';
}
/* k evens out the apparent size of the four faces (measured from their x-heights and widths), so switching fonts keeps the text about the same size */
var BFONTS={
  elite:{n:'Type',fam:'"Special Elite",ui-monospace,monospace',w:400,k:1.04},
  bric:{n:'Bold',fam:'"Bricolage Grotesque",system-ui,sans-serif',w:700,k:1},
  inst:{n:'Serif',fam:'"Instrument Serif",Georgia,serif',w:400,k:1.1},
  reenie:{n:'Hand',fam:'"Reenie Beanie","Comic Sans MS",cursive',w:400,k:1.32,bs:'19px'}
};
function txWt(t){var f=BFONTS[t.f]||BFONTS.elite;return {w:f.w,st:0}}
function txFs(t){return t.s*((BFONTS[t.f]||BFONTS.elite).k||1)}
function bst(board){var s=(board||state.board).st||{};return s.bd==='zig'?Object.assign({},s,{bd:'wave'}):s}
function isFX(bd){return bd==='wave'||bd==='check'||bd==='diamond'}
function boardAR(board){return SHAPES[bst(board).ar]||BOARD_AR}
function hideW(){return !!state.hideWhite&&bst().ps!=='polaroid'}
function setSt(patch){
  boardDesignChange('Board style updated.',function(){
    var b=state.board,s=Object.assign({},b.st||{});
    Object.keys(patch).forEach(function(k){if(patch[k]===null||patch[k]===''||patch[k]===false)delete s[k];else s[k]=patch[k]});
    if(Object.keys(s).length)b.st=s;else delete b.st;
  });
}
function hex2rgb(h){h=String(h||'').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var n=parseInt(h,16);if(isNaN(n))n=0xFBFBF8;return [(n>>16)&255,(n>>8)&255,n&255]}
function rgb2hex(r,g,b){function p(v){v=Math.max(0,Math.min(255,Math.round(v)));return (v<16?'0':'')+v.toString(16)}return '#'+p(r)+p(g)+p(b)}
function mixHex(a,b,t){var x=hex2rgb(a),y=hex2rgb(b);return rgb2hex(x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t)}
function rgbaHex(h,a){var c=hex2rgb(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
function lumHex(h){var c=hex2rgb(h);return (c[0]*.299+c[1]*.587+c[2]*.114)/255}
function cdist(a,b){var x=hex2rgb(a),y=hex2rgb(b),rm=(x[0]+y[0])/2,dr=x[0]-y[0],dg=x[1]-y[1],db=x[2]-y[2];return Math.sqrt((2+rm/256)*dr*dr+4*dg*dg+(2+(255-rm)/256)*db*db)}
/* Compare suggestions in OKLab; light neutrals use a wider grouping range. Saved colors are never rewritten. */
function suggestionLab(h){
  var c=hex2rgb(h).map(function(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}),r=c[0],g=c[1],b=c[2];
  var l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
function similarSuggestion(a,b){
  var x=suggestionLab(a),y=suggestionLab(b),d=Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]);
  var lightNeutral=x[0]>.87&&y[0]>.87&&Math.hypot(x[1],x[2])<.045&&Math.hypot(y[1],y[2])<.045;
  return d<(lightNeutral?.085:.045);
}
/* keep the most different colors: start with the first, then keep adding whichever is farthest from those already kept */
function distinctPick(c,max,thr){var out=[];if(!c.length)return out;out.push(c[0]);while(out.length<max){var best=null,bd=0;c.forEach(function(h){var d=Math.min.apply(null,out.map(function(o){return cdist(o,h)}));if(d>bd){bd=d;best=h}});if(!best||bd<thr)break;c=c.filter(function(h){return !similarSuggestion(best,h)});if(!out.some(function(h){return similarSuggestion(h,best)}))out.push(best)}return out}
var PINS=['#D8343A','#2E6FD1','#F2B632','#2E9E5B','#8A4FC7','#F07F2E','#E85C9C','#1FA3A3'];
function inkFor(bg){return lumHex(bg||'#FFFFFF')<.45?'#FFFFFF':'#14272F'}

/* colors of a piece: the ones saved on it, else sampled from its photo */
var swCache={},_swT=0;
function swSoon(){if(_swT)return;_swT=setTimeout(function(){_swT=0;if(state.tab==='outfits'){bgCache.k='';renderBoard()}},150)}
function swOf(it){
  if(Array.isArray(it.sw)&&it.sw.length)return it.sw;
  var k=it.id+'|'+(it.photo||'').length,c=swCache[k];
  if(c)return c.v||[];
  swCache[k]={v:null};
  sampleSw(it).then(function(v){swCache[k].v=v;if(v.length)swSoon()});
  return [];
}
function sampleSw(it){
  return new Promise(function(res){
    var ph=it.photo||'';
    if(!ph||ph===BLANK||ph.indexOf('data:image/svg')===0){res([]);return}
    var im=new Image();
    im.onload=function(){
      try{
        var w=64,h=Math.max(8,Math.min(160,Math.round(64*im.naturalHeight/Math.max(1,im.naturalWidth))));
        var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');g.drawImage(im,0,0,w,h);
        var d=g.getImageData(0,0,w,h).data,i,x,y,br=[];
        for(x=0;x<w;x++){br.push(x);br.push((h-1)*w+x)}
        for(y=0;y<h;y++){br.push(y*w);br.push(y*w+w-1)}
        var med=function(o){var a=br.map(function(j){return d[j*4+o]}).sort(function(p,q){return p-q});return a[a.length>>1]};
        var m=[med(0),med(1),med(2)],near=0,bgc=null;
        br.forEach(function(j){if(Math.abs(d[j*4]-m[0])+Math.abs(d[j*4+1]-m[1])+Math.abs(d[j*4+2]-m[2])<=40)near++});
        if(near/br.length>=.6)bgc=m;
        var bk={},tot=0;
        for(y=Math.round(h*.08);y<h*.92;y++)for(x=Math.round(w*.14);x<w*.86;x++){
          i=(y*w+x)*4;if(d[i+3]<200)continue;
          var r=d[i],gg=d[i+1],b=d[i+2],mn=Math.min(r,gg,b),mx=Math.max(r,gg,b);
          if(mn>=232&&mx-mn<=20)continue;
          if(bgc&&Math.abs(r-bgc[0])+Math.abs(gg-bgc[1])+Math.abs(b-bgc[2])<=48)continue;
          var key=(r>>5)+','+(gg>>5)+','+(b>>5),o=bk[key]||(bk[key]=[0,0,0,0]);
          o[0]+=r;o[1]+=gg;o[2]+=b;o[3]++;tot++;
        }
        var list=Object.keys(bk).map(function(k2){var o2=bk[k2];return {n:o2[3],h:rgb2hex(o2[0]/o2[3],o2[1]/o2[3],o2[2]/o2[3])}}).sort(function(a,b2){return b2.n-a.n});
        var out=[];
        list.forEach(function(e){if(out.length<3&&(!out.length||e.n/tot>=.12)&&!out.some(function(q){return cdist(q,e.h)<110}))out.push(e.h)});
        res(out);
      }catch(e){res([])}
    };
    im.onerror=function(){res([])};
    im.src=ph;
  });
}
function boardItems(board){var map=byIdA(),seen={},out=[];(board||state.board).pieces.forEach(function(p){var it=map[p.id];if(it&&!seen[it.id]){seen[it.id]=1;out.push(it)}});return out}
/* removing a piece or text from the board keeps it, so Undo (button, toast or Ctrl/Cmd+Z) puts it back where it was */
function boardDel(kind,i){
  var b=state.board,arr=kind==='t'?(b.texts||[]):b.pieces,item=arr.splice(i,1)[0];
  if(!item)return;
  // Undo must also recover empty windows, unless the layout was changed afterward.
  var entry={b:b,k:kind,i:i,item:item,layout:kind==='p'?b.lay:null,windows:b.lay&&b.lay.n};
  (state.delUndo=state.delUndo||[]).push(entry);if(state.delUndo.length>30)state.delUndo.shift();
  if(kind==='t')state.selT=-1;else state.sel=-1;
  state.cs=-1;if(kind==='p'&&b.lay)b.lay.n=Math.max(1,b.pieces.length);
  if(entry.layout)entry.afterWindows=entry.layout.n;
  persistBoard();renderBoard();
  toastAct(kind==='t'?'Text removed.':'Removed from the board.','Undo',boardUndoDel);
}
function boardUndoDel(){
  var u=state.delUndo||[];
  for(var k=u.length-1;k>=0;k--){
    if(u[k].b!==state.board)continue;
    var x=u.splice(k,1)[0],arr=x.k==='t'?(state.board.texts=state.board.texts||[]):state.board.pieces;
    arr.splice(Math.min(x.i,arr.length),0,x.item);
    if(x.layout&&state.board.lay===x.layout&&x.layout.n===x.afterWindows){if(x.windows===undefined)delete x.layout.n;else x.layout.n=x.windows}
    if(x.k==='t'){state.selT=-1}else{state.sel=-1}
    persistBoard();renderBoard();return true;
  }
  return false;
}
var PALETTES=[
  ['berry','Berry & blush',['#FBEFE9','#F4C9D3','#E58FA6','#B5446E','#6B1F45']],
  ['jewel','Moody jewels',['#EFE5D0','#C99A3B','#7B2D54','#3E5C76','#1F3A3D']],
  ['meadow','Cottage meadow',['#F8F1E4','#F2D6A2','#DDE7C7','#A9C48A','#6E9150']],
  ['academia','Dark academia',['#E8DFCB','#B9A27C','#8C6A43','#5A3E2B','#2B2118']],
  ['plum','Gothic plum',['#E9E2EE','#B8A0C9','#7A3E6E','#3B2A52','#14101C']],
  ['diner','Retro diner',['#FFF4E0','#F1C453','#E63946','#2A9D8F','#264653']],
  ['candy','Candy pop',['#FFF8F0','#FFD166','#FF8FB1','#B28DFF','#7BDFF2']],
  ['sunset','Sunset',['#FFF1DE','#FFB36B','#F2705F','#C2456B','#5B3A74']],
  ['lagoon','Teal lagoon',['#E6F2EF','#7FD1C7','#1B7F8C','#0B3C49','#F0B96B']],
  ['earth','Earthy neutrals',['#F7F1E7','#E8DAC6','#C8AE92','#8B6F55','#3B3028']],
  ['mono','Black & white',['#FFFFFF','#D9D9D9','#9A9A9A','#555555','#111111']]
];
function curPalette(board){var pn=bst(board).pn,i;if(!pn)return null;for(i=0;i<PALETTES.length;i++)if(PALETTES[i][0]===pn)return PALETTES[i];return null}
function palLabel(){return curPalette()?'Palette color':'Outfit color'}
function boardPal(board){
  var cp=curPalette(board);if(cp)return cp[2].slice();
  var c=[];
  boardItems(board).forEach(function(it){swOf(it).slice(0,3).forEach(function(h){c.push(h)})});
  return distinctPick(c,6,85);
}

/* background: painted once at export size, then reused for the board and the saved image so they match */
var bgCache={k:'',c:null,url:''};
function exportSize(board){var ar=boardAR(board);return ar>=1?[1600,Math.round(1600/ar)]:[Math.round(1920*ar),1920]}
function bgKey(){var s=bst(),bg=s.bg;if(!bg)return '';return [bg.c,bg.t,s.ar||'4:3',bg.t==='grit'?boardPal().slice(0,3).join(','):''].join('|')}
function bgCanvas(board){
  if(board){var size=exportSize(board),bg=bst(board).bg;if(!bg)return null;var detached=document.createElement('canvas');detached.width=size[0];detached.height=size[1];drawBg(detached.getContext('2d'),size[0],size[1],bg,boardPal(board));return detached}
  var k=bgKey();if(!k)return null;
  if(bgCache.k===k&&bgCache.c)return bgCache.c;
  var sz=exportSize(),c=document.createElement('canvas');c.width=sz[0];c.height=sz[1];
  drawBg(c.getContext('2d'),sz[0],sz[1],bst().bg,boardPal());
  bgCache={k:k,c:c,url:''};return c;
}
function bgUrl(){var c=bgCanvas();if(!c)return '';if(!bgCache.url)bgCache.url=c.toDataURL('image/jpeg',.88);return bgCache.url}
function drawBg(g,W,H,bg,pal){
  var col=bg.c||'#FFFFFF',t=bg.t||'plain',u=W/1000,R=Math.random,i,x,y;
  if(t==='cork')col=mixHex('#C39A6B',col,.2);
  var dark=lumHex(col)<.45,ink=dark?'255,255,255':'20,39,47';
  g.fillStyle=t==='wash'?mixHex(col,'#FFFFFF',.62):col;g.fillRect(0,0,W,H);
  if(t==='dots'){g.fillStyle='rgba('+ink+',.3)';var sp=W/34;for(y=sp/2;y<H;y+=sp)for(x=sp/2;x<W;x+=sp){g.beginPath();g.arc(x,y,1.8*u,0,6.3);g.fill()}}
  if(t==='graph'){
    var s2=W/40,lw=Math.max(1,u);
    for(i=0,x=0;x<=W;x+=s2,i++){g.fillStyle='rgba('+ink+','+(i%5?.1:.24)+')';g.fillRect(Math.round(x),0,lw,H)}
    for(i=0,y=0;y<=H;y+=s2,i++){g.fillStyle='rgba('+ink+','+(i%5?.1:.24)+')';g.fillRect(0,Math.round(y),W,lw)}
  }
  if(t==='linen'){
    var st=Math.max(2,Math.round(2.8*u)),th=Math.max(1,Math.round(st/2));
    for(y=0;y<H;y+=st){g.fillStyle='rgba('+ink+','+(R()*.085).toFixed(3)+')';g.fillRect(0,y,W,th)}
    for(x=0;x<W;x+=st){g.fillStyle='rgba('+ink+','+(R()*.085).toFixed(3)+')';g.fillRect(x,0,th,H)}
  }
  if(t==='grain'){
    for(i=0;i<60;i++){
      var mx=R()*W,my=R()*H,mr=(.06+R()*.2)*W,mg=g.createRadialGradient(mx,my,0,mx,my,mr),ma=.035+R()*.05;
      mg.addColorStop(0,'rgba('+(R()<.55?ink:(dark?'0,0,0':'255,255,255'))+','+ma.toFixed(3)+')');mg.addColorStop(1,'rgba('+ink+',0)');
      g.fillStyle=mg;g.fillRect(0,0,W,H);
    }
    g.lineWidth=Math.max(1,.7*u);
    for(i=0;i<Math.round(700*H/W);i++){
      var gx=R()*W,gy=R()*H,gl=(3+R()*9)*u,ga=R()*6.3;
      g.strokeStyle='rgba('+ink+','+(.05+R()*.1).toFixed(3)+')';
      g.beginPath();g.moveTo(gx,gy);g.lineTo(gx+Math.cos(ga)*gl,gy+Math.sin(ga)*gl);g.stroke();
    }
  }
  if(t==='wash'){
    for(i=0;i<60;i++){
      var cx=R()*W,cy=R()*H,r=(.08+R()*.28)*W,gr=g.createRadialGradient(cx,cy,0,cx,cy,r),pick=R();
      var cc=pick<.5?col:pick<.72?mixHex(col,'#FFFFFF',.9):mixHex(col,'#000000',.38),a=.1+R()*.26;
      gr.addColorStop(0,rgbaHex(cc,a));gr.addColorStop(.74,rgbaHex(cc,a*.7));gr.addColorStop(1,rgbaHex(cc,0));
      g.fillStyle=gr;g.fillRect(0,0,W,H);
    }
  }
  if(t==='grit'){
    var c0=pal[0]||col,c1=pal[1]||mixHex(col,'#FFFFFF',.55),c2=pal[2]||mixHex(col,'#000000',.2);
    var cs=[mixHex(c0,'#000000',.45),c1,mixHex(c2,'#FFFFFF',.55),c0,mixHex(c1,'#000000',.55)];
    [[.1,.15],[.92,.22],[.5,1.02],[.98,.95],[.02,.85]].forEach(function(p,j){
      var c3=cs[j%cs.length],rr=Math.max(W,H)*.58,g2=g.createRadialGradient(p[0]*W,p[1]*H,0,p[0]*W,p[1]*H,rr);
      g2.addColorStop(0,rgbaHex(c3,1));g2.addColorStop(.35,rgbaHex(c3,.8));g2.addColorStop(1,rgbaHex(c3,0));g.fillStyle=g2;g.fillRect(0,0,W,H);
    });
  }
  if(t==='cork'){
    for(i=0;i<Math.round(6200*H/W);i++){
      g.fillStyle=R()<.62?'rgba(74,43,16,'+(.1+R()*.3).toFixed(3)+')':'rgba(255,236,202,'+(.12+R()*.25).toFixed(3)+')';
      g.beginPath();g.ellipse(R()*W,R()*H,(.8+R()*2.6)*u,(.6+R()*1.8)*u,R()*3.1,0,6.3);g.fill();
    }
  }
  var amt={graph:3,grain:24,linen:6,wash:9,cork:12,grit:40}[t]||0;
  if(amt){
    var im=g.getImageData(0,0,W,H),px=im.data,n;
    for(i=0;i<px.length;i+=4){n=(R()-.5)*2*amt;px[i]+=n;px[i+1]+=n;px[i+2]+=n}
    g.putImageData(im,0,0);
  }
}
function decorInsetFor(bd){return bd==='mat'?5.36:bd==='line'?4.2:bd==='wave'?5.2:(bd==='check'||bd==='diamond')?5.6:2.4}
function decorInset(board){return decorInsetFor(bst(board).bd)}
/* wavy and zig-zag frames: two interlaced lines, colors taken from the outfit so they suit whatever background is chosen */
function framePath(W,H,ins,amp,wlT,type,ph){
  var x0=ins,y0=ins,x1=W-ins,y1=H-ins,a=x1-x0,b2=y1-y0,P=2*(a+b2),n=Math.max(8,Math.round(P/wlT)),wl=P/n,step=wl/8,N=Math.round(P/step),pts=[],i;
  for(i=0;i<N;i++){
    var d=i*step,t=d/wl+ph,q=t-Math.floor(t),f=type==='zig'?amp*(q<.5?(q*4-1):(3-q*4)):amp*Math.sin(t*2*Math.PI),x,y,nx,ny,dc=Math.min(d,Math.abs(d-a),Math.abs(d-a-b2),Math.abs(d-2*a-b2),P-d);f*=Math.min(1,dc/(wl*.7));
    if(d<=a){x=x0+d;y=y0;nx=0;ny=1}else if(d<=a+b2){x=x1;y=y0+(d-a);nx=-1;ny=0}else if(d<=2*a+b2){x=x1-(d-a-b2);y=y1;nx=0;ny=-1}else{x=x0;y=y1-(d-2*a-b2);nx=1;ny=0}
    pts.push((x+nx*f).toFixed(2)+' '+(y+ny*f).toFixed(2));
  }
  return 'M'+pts.join('L')+'Z';
}
function frameCols(board){
  var s=bst(board),bgc=(s.bg&&s.bg.c)||'#FFFFFF',pal=boardPal(board),c1=s.bdc,c2;
  function pickFar(avoid){var best=null,bs=-1;pal.forEach(function(h){var m=Math.min.apply(null,avoid.map(function(o){return cdist(h,o)}));if(m>bs){bs=m;best=h}});return bs>=70?best:null}
  if(!c1)c1=pickFar([bgc])||inkFor(bgc);
  c2=pickFar([bgc,c1])||mixHex(c1,lumHex(bgc)<.45?'#FFFFFF':'#FFFFFF',.55);
  return [c1,c2];
}
/* checkerboard and diamond frames: little tiles around the edge, in two colors from the palette */
function frameCells(W,H,ins,type){
  var x0=ins,y0=ins,x1=W-ins,y1=H-ins,a=x1-x0,b=y1-y0,out=[],i,j,r;
  function sq(x,y,w,h,c){out.push({d:'M'+x.toFixed(2)+' '+y.toFixed(2)+'h'+w.toFixed(2)+'v'+h.toFixed(2)+'h'+(-w).toFixed(2)+'z',c:c})}
  if(type==='check'){
    var z=1.7,nx=Math.max(4,Math.round(a/z)),cw=a/nx,ny=Math.max(2,Math.round((b-4*z)/z)),ch=(b-4*z)/ny;
    for(r=0;r<2;r++){
      for(i=0;i<nx;i++){sq(x0+i*cw,y0+r*z,cw,z,(i+r)%2);sq(x0+i*cw,y1-(r+1)*z,cw,z,(i+ny+3-r)%2)}
      for(j=0;j<ny;j++){sq(x0+r*z,y0+2*z+j*ch,z,ch,(r+j+2)%2);sq(x1-(r+1)*z,y0+2*z+j*ch,z,ch,(nx-1-r+j+2)%2)}
    }
  }else{
    var hd=1.35,st=3,nx2=Math.max(4,Math.round((a-2*hd)/st)),ny2=Math.max(3,Math.round((b-2*hd)/st)),ax=a-2*hd,by=b-2*hd,pts=[];
    for(i=0;i<nx2;i++)pts.push([x0+hd+i*ax/nx2,y0+hd]);
    for(j=0;j<ny2;j++)pts.push([x1-hd,y0+hd+j*by/ny2]);
    for(i=0;i<nx2;i++)pts.push([x1-hd-i*ax/nx2,y1-hd]);
    for(j=0;j<ny2;j++)pts.push([x0+hd,y1-hd-j*by/ny2]);
    pts.forEach(function(q,k){out.push({d:'M'+q[0].toFixed(2)+' '+(q[1]-hd).toFixed(2)+'L'+(q[0]+hd).toFixed(2)+' '+q[1].toFixed(2)+'L'+q[0].toFixed(2)+' '+(q[1]+hd).toFixed(2)+'L'+(q[0]-hd).toFixed(2)+' '+q[1].toFixed(2)+'Z',c:k%2})});
  }
  return out;
}
function safeSvgColor(value){return typeof value==='string'&&/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)?value:'#443E4D'}
function frameSvg(){
  var s0=bst();
  if(s0.bd==='check'||s0.bd==='diamond'){
    var H0=100/boardAR(),c0=frameCols(),cells=frameCells(100,H0,1.4,s0.bd);
    return '<svg viewBox="0 0 100 '+H0.toFixed(3)+'" aria-hidden="true" stroke="none">'+cells.map(function(q){return '<path fill="'+safeSvgColor(c0[q.c])+'" d="'+q.d+'"/>'}).join('')+'</svg>';
  }
  var s=bst(),H=100/boardAR(),cl=frameCols(),ty=s.bd,amp=.9,wl=6;
  return '<svg viewBox="0 0 100 '+H.toFixed(3)+'" aria-hidden="true" fill="none" stroke-width=".75" stroke-linejoin="round" stroke-linecap="round"><path stroke="'+safeSvgColor(cl[0])+'" d="'+framePath(100,H,2.6,amp,wl,ty,0)+'"/><path stroke="'+safeSvgColor(cl[1])+'" d="'+framePath(100,H,2.6,amp,wl,ty,.5)+'"/></svg>';
}
/* washi tape: a color from the outfit, in one of three patterns, cycling by piece */
var TAPE_DEF=['#F2A7B8','#8FD3C7','#F5D36B','#B7A6E8'];
/* a color that still shows up against the board background (no white tape on a white board) */
function visCol(c,bgc){
  if(cdist(c,bgc)>=70)return c;
  var t=lumHex(bgc)<.5?'#FFFFFF':'#000000';
  for(var a=.35;a<=.9;a+=.15){var m=mixHex(c,t,a);if(cdist(m,bgc)>=70)return m}
  return inkFor(bgc);
}
function boardBgc(board){var s=bst(board);return (s.bg&&s.bg.c)||'#FFFFFF'}
function tapeSpec(i,pal,board){var c=pal&&pal.length?pal[(i+1)%pal.length]:TAPE_DEF[i%TAPE_DEF.length];c=visCol(c,boardBgc(board));return {c:c,c2:mixHex(c,'#FFFFFF',.5),pat:i%3}}
/* plain outline around each piece: one chosen color in small shade variations, or the palette colors in turn */
var LINE_W={thin:.3,med:.65,thick:1.1};
function lineSpec(i,pal,board){
  var s=bst(board),base=s.lc,c;
  if(base){var v=i%4;c=v===0?base:v===1?mixHex(base,'#FFFFFF',.3):v===2?mixHex(base,'#000000',.22):mixHex(base,'#FFFFFF',.55)}
  else c=pal&&pal.length?pal[(i+1)%pal.length]:TAPE_DEF[i%TAPE_DEF.length];
  return visCol(c,boardBgc(board));
}
/* the color strip is a movable, resizable, rotatable object once it is on the board */
function palPos(board){
  var s=bst(board),pk=s.pk||1,bk=Math.sqrt(4/3/boardAR(board));
  if(s.px!=null&&s.py!=null)return {x:s.px,y:s.py};
  return {x:decorInset(board),y:100-(decorInset(board)+3.4*bk*pk)*boardAR(board)};
}
function palPointer(e,pl,bd){
  var owner=state.board;
  var st=state.board.st;if(!st)return;
  selectPiece(-1);state.selPal=true;pl.classList.add('psel');
  var before=JSON.stringify(st);
  var rect=bd.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,pos=palPos(),o={x:pos.x,y:pos.y,k:st.pk||1};
  var br=pl.getBoundingClientRect(),cx=br.left+br.width/2,cy=br.top+br.height/2,d0=Math.max(12,Math.hypot(sx-cx,sy-cy));
  var resize=e.target.classList.contains('pres'),rotate=e.target.classList.contains('prot'),a0=Math.atan2(sy-cy,sx-cx)*180/Math.PI,r0=st.pr||0;
  try{pl.setPointerCapture(e.pointerId)}catch(err){}
  function tf(){pl.style.transform=st.pr?'rotate('+st.pr+'deg)':''}
  function move(ev){
    if(state.board!==owner||owner.st!==st||ev.pointerId!==e.pointerId)return;
    if(rotate){var a=r0+(Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI-a0);a=snapRot(a,ev);st.pr=normRot(a);if(!st.pr)delete st.pr;tf();return}
    if(resize){st.pk=round2(clamp(o.k*Math.hypot(ev.clientX-cx,ev.clientY-cy)/d0,.4,4));pl.style.setProperty('--pk',String(st.pk));return}
    st.px=round2(clamp(o.x+(ev.clientX-sx)/rect.width*100,-4,98));st.py=round2(clamp(o.y+(ev.clientY-sy)/rect.height*100,-4,98));
    pl.style.left=st.px+'%';pl.style.top=st.py+'%';
  }
  function up(ev){if(ev&&ev.pointerId!==e.pointerId)return;pl.removeEventListener('pointermove',move);pl.removeEventListener('pointerup',up);pl.removeEventListener('pointercancel',up);pl.removeEventListener('lostpointercapture',up);if(state.board===owner&&owner.st===st&&JSON.stringify(st)!==before)persistBoard(owner)}
  pl.addEventListener('pointermove',move);pl.addEventListener('pointerup',up);pl.addEventListener('pointercancel',up);pl.addEventListener('lostpointercapture',up);
  e.preventDefault();
}
function drawTape(g,cx,cy,u,sp,ang){
  var tw=8*u,th=2.7*u;
  g.save();g.translate(cx,cy);g.rotate(ang*Math.PI/180);
  g.beginPath();var pts=[[0,0],[.07,.25],[0,.5],[.07,.75],[0,1],[1,1],[.93,.75],[1,.5],[.93,.25],[1,0]];
  pts.forEach(function(q,k){var x=-tw/2+q[0]*tw,y=-th/2+q[1]*th;if(k)g.lineTo(x,y);else g.moveTo(x,y)});g.closePath();
  g.globalAlpha=.92;g.fillStyle=sp.c;g.fill();g.clip();g.fillStyle=sp.c2;
  if(sp.pat===1){for(var x=-tw/2+.9*u;x<tw/2;x+=1.8*u)g.fillRect(x,-th/2,.9*u,th)}
  else if(sp.pat===2){for(var y=-th/2+.75*u;y<th/2+u;y+=1.5*u)for(var x2=-tw/2+.75*u;x2<tw/2+u;x2+=1.5*u){g.beginPath();g.arc(x2,y,.42*u,0,6.3);g.fill()}}
  g.restore();
}
function frameColor(board){var s=bst(board);return s.bdc||(s.bd==='mat'?'#FFFFFF':inkFor(s.bg&&s.bg.c))}

/* called at the end of renderBoard: applies shape and look, then adds the frame, color strip and text */
function applyBoardLook(bd){
  var s=bst(),url=bgUrl();
  bd.style.setProperty('--bar',String(boardAR()));
  bd.style.setProperty('--bk',Math.sqrt(4/3/boardAR()).toFixed(3));
  bd.style.backgroundImage=url?'url('+url+')':'';
  bd.style.backgroundSize=url?'100% 100%':'';
  bd.style.backgroundColor=boardBgc();
  bd.classList.toggle('ps-shadow',s.ps==='shadow');
  bd.classList.toggle('ps-polaroid',s.ps==='polaroid');
  bd.classList.toggle('ps-tape',s.ps==='tape');
  bd.classList.toggle('ps-line',s.ps==='line');
  bd.style.setProperty('--lw',String(LINE_W[s.lw||'med']||.65));
  if(s.ps==='line'&&s.lc)bd.style.setProperty('--lc0',s.lc);
  bd.classList.toggle('pins',!!s.bg&&s.bg.t==='cork');
  (state.board.texts||[]).forEach(function(t,i){
    var f=BFONTS[t.f]||BFONTS.elite;
    bd.appendChild(el('div',{class:'piece btxt'+(i===state.selT?' sel':''),'data-t':String(i),
      style:'left:'+t.x+'%;top:'+t.y+'%;z-index:'+(5000+i)+';font-size:'+txFs(t)+'cqw;color:'+(t.c||'#14272F')+';font-family:'+f.fam+';font-weight:'+txWt(t).w+(txWt(t).st?';-webkit-text-stroke:'+txWt(t).st+'em':'')+(t.a?';text-align:'+(t.a==='c'?'center':'right'):'')+(textFx(t)?';text-shadow:'+textFx(t):'')+(t.rot?';transform:rotate('+t.rot+'deg)':'')},
      el('span',{class:'tx',text:t.t||' '}),
      el('button',{class:'del',type:'button','aria-label':'Remove text',text:'x'}),
      el('span',{class:'rot','aria-hidden':'true',title:'Drag to rotate',text:'↻'}),
      el('span',{class:'handle','aria-hidden':'true'})));
  });
  if(s.pal){
    var pal=boardPal();
    if(pal.length){
      var pos=palPos(),strip=el('div',{class:'bpal'+(state.selPal?' psel':''),'data-pal':'1',title:'Drag to move. Use the handles to rotate and resize.',style:'left:'+pos.x+'%;top:'+pos.y+'%;--pk:'+(s.pk||1)+(s.pr?';transform:rotate('+s.pr+'deg)':'')});
      pal.forEach(function(h){strip.appendChild(el('i',{style:'background:'+h}))});
      strip.appendChild(el('span',{class:'prot','aria-hidden':'true',title:'Drag to rotate',text:'\u21BB'}));strip.appendChild(el('span',{class:'pres','aria-hidden':'true',title:'Drag to resize'}));
      bd.appendChild(strip);
    }
  }
  if(s.bd==='mat'||s.bd==='line')bd.appendChild(el('div',{class:'bframe '+s.bd,style:'border-color:'+frameColor()}));
  else if(isFX(s.bd)){var fx=el('div',{class:'bframe fx'});fx.innerHTML=frameSvg();bd.appendChild(fx)}
  var nu=$('onewundo');if(nu)nu.classList.toggle('hide',!(state.newOutfitUndo&&state.newOutfitUndo.b===state.board));
  var bu=$('oboardundo');if(bu)bu.classList.toggle('hide',!(state.designUndo&&state.designUndo.b===state.board));
  var tu=$('otidyundo');if(tu)tu.classList.toggle('hide',!(state.tidyUndo&&state.tidyUndo.b===state.board));
  var du=$('odelundo');if(du)du.classList.toggle('hide',!(state.delUndo||[]).some(function(x){return x.b===state.board}));
  renderStylePanel();
}

/* text boxes */
function selectText(i){
  state.sel=-1;state.selT=i;state.selPal=false;state.cs=-1;var pl2=$('board').querySelector('.bpal');if(pl2)pl2.classList.remove('psel');$('board').querySelectorAll('.cslot.csel').forEach(function(n){n.classList.remove('csel')});
  $('board').querySelectorAll('.piece').forEach(function(n){n.classList.toggle('sel',n.dataset.t!=null&&+n.dataset.t===i)});
  paintSel();
}
function addText(){
  var b=state.board;if(!b.texts)b.texts=[];
  var bg=bst().bg;
  b.texts.push({t:'Your text',x:30,y:6+(b.texts.length%5)*9,s:6,f:state.lastFont||'elite',c:inkFor(bg&&bg.c)});
  state.sel=-1;state.selT=b.texts.length-1;persistBoard();renderBoard();
  var inp=$('ttext');if(inp){inp.focus();inp.select()}
}
function syncTxtTools(){
  var t=(state.board.texts||[])[state.selT];if(!t)return;
  var inp=$('ttext');if(inp.value!==t.t)inp.value=t.t;
  $('tcolor').value=/^#[0-9a-f]{6}$/i.test(t.c||'')?t.c:'#14272f';
  $('tfonts').querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.f===(t.f||'elite')?'true':'false')});
  $('toutline').setAttribute('aria-pressed',t.o?'true':'false');$('tshadow').setAttribute('aria-pressed',t.sh?'true':'false');
  $('talign').querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.a===(t.a||'l')?'true':'false')});
}
function textPointer(e,pe,bd){
  var owner=state.board;
  var i=+pe.dataset.t,t=(state.board.texts||[])[i];if(!t)return;
  if(e.target.classList.contains('del')){boardDel('t',i);e.preventDefault();return}
  selectText(i);
  var before=JSON.stringify(t);
  var rect=bd.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,o={x:t.x,y:t.y,s:t.s};
  var br=pe.getBoundingClientRect(),cx=br.left+br.width/2,cy=br.top+br.height/2,d0=Math.max(12,Math.hypot(sx-cx,sy-cy));
  var resize=e.target.classList.contains('handle'),rotate=e.target.classList.contains('rot'),a0=Math.atan2(sy-cy,sx-cx)*180/Math.PI,r0=t.rot||0;
  try{pe.setPointerCapture(e.pointerId)}catch(err){}
  function move(ev){
    if(state.board!==owner||(owner.texts||[])[i]!==t||ev.pointerId!==e.pointerId)return;
    if(rotate){var a=r0+(Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI-a0);a=snapRot(a,ev);t.rot=normRot(a);if(!t.rot)delete t.rot;pe.style.transform=t.rot?'rotate('+t.rot+'deg)':'';return}
    if(resize){t.s=round2(clamp(o.s*Math.hypot(ev.clientX-cx,ev.clientY-cy)/d0,1.5,30));pe.style.fontSize=txFs(t)+'cqw';return}
    t.x=round2(clamp(o.x+(ev.clientX-sx)/rect.width*100,-10,96));t.y=round2(clamp(o.y+(ev.clientY-sy)/rect.height*100,-4,97));
    pe.style.left=t.x+'%';pe.style.top=t.y+'%';
  }
  function up(ev){if(ev&&ev.pointerId!==e.pointerId)return;pe.removeEventListener('pointermove',move);pe.removeEventListener('pointerup',up);pe.removeEventListener('pointercancel',up);pe.removeEventListener('lostpointercapture',up);if(state.board===owner&&(owner.texts||[])[i]===t&&JSON.stringify(t)!==before)persistBoard(owner)}
  pe.addEventListener('pointermove',move);pe.addEventListener('pointerup',up);pe.addEventListener('pointercancel',up);pe.addEventListener('lostpointercapture',up);
  e.preventDefault();
}
function wireBoardStyle(){
  state.selT=-1;
  try{state.styleOpen=localStorage.getItem('closetlint.styleopen.v1')==='1'}catch(e){state.styleOpen=false}
  try{state.hideWhite=localStorage.getItem('closetlint.hidewhite.v1')==='1'}catch(e){state.hideWhite=false}
  $('ostyle').addEventListener('click',function(){state.styleOpen=!state.styleOpen;try{localStorage.setItem('closetlint.styleopen.v1',state.styleOpen?'1':'0')}catch(e){}renderStylePanel()});
  $('otext').addEventListener('click',addText);
  $('otidy').addEventListener('click',tidyBoard);
  $('oboardundo').addEventListener('click',function(){if(state.designUndo)state.designUndo.undo()});
  $('otitle').addEventListener('click',function(){
    var b=state.board,map=byIdA(),items=[];
    b.pieces.forEach(function(p){var it=map[p.id];if(it)items.push(it)});
    if(!items.length){toast('Add a few pieces first');return}
    var ACC=['Jewelry','Hair accessories','Footwear','Bags','Hats','Glasses','Other accessories'];
    var core=items.filter(function(it){return ACC.indexOf(it.meta)<0});
    var o=labOutfitFromIds(core.map(function(x){return x.id}),map);
    if(!o){
      o={};
      core.forEach(function(it){var r=labRole(it);if((r==='one'||r==='top'||r==='bottom'||r==='layer')&&!o[r])o[r]=it});
      if(!o.one&&!o.top&&!o.bottom)o.top=core[0]||items[0];
    }
    o.acc={jewelry:items.filter(function(x){return x.meta==='Jewelry'}),hair:items.filter(function(x){return x.meta==='Hair accessories'})[0],shoes:items.filter(function(x){return x.meta==='Footwear'})[0]};
    state.btn=(state.btn||0)+1;o.tn=state.btn;
    var t=ltTitle(o,'Surprise me');
    if(!t)return;
    var previous=b.name||'';b.name=t;$('oname').value=t;persistBoard();
    toastAct('Outfit title suggested.','Undo',function(){
      if(state.board!==b||b.name!==t){toast('The title has changed since this suggestion.');return}
      if(state.boardSaving){toast('Wait for the outfit to finish saving.');return}
      b.name=previous;$('oname').value=previous;persistBoard();toast('Previous outfit title restored.');
    });
  });
  $('otidyundo').addEventListener('click',function(){
    var u=state.tidyUndo;if(!u||u.b!==state.board)return;
    function restore(){try{state.board.pieces=JSON.parse(u.j)}catch(e){}state.tidyUndo=null;state.sel=-1;persistBoard();renderBoard();toast('Previous piece arrangement restored.')}
    if(u.after&&JSON.stringify(state.board.pieces)!==u.after)askConfirm('Undo the arrangement? Later piece changes will also be replaced. Text and saved outfits stay unchanged.','Undo arrangement',restore);else restore();
  });
  var fb=$('tfonts');
  Object.keys(BFONTS).forEach(function(k){
    var f=BFONTS[k];
    fb.appendChild(el('button',{class:'chip',type:'button','data-f':k,'aria-pressed':'false',title:f.n,style:'font-family:'+f.fam+';font-weight:'+f.w+(f.bs?';font-size:'+f.bs:''),text:f.n,onclick:function(){
      var t=(state.board.texts||[])[state.selT];if(!t)return;t.f=k;state.lastFont=k;persistBoard();renderBoard();
    }}));
  });
  [['l','Align left',[12,8,12,6]],['c','Align center',[12,8,12,6]],['r','Align right',[12,8,12,6]]].forEach(function(al){
    var rects='';al[2].forEach(function(w,i){var x=al[0]==='l'?2:al[0]==='c'?(16-w)/2:14-w;rects+='<rect x="'+x+'" y="'+(2.6+i*3.4)+'" width="'+w+'" height="1.7" rx=".8"/>'});
    var bt=el('button',{class:'chip alignbtn',type:'button','data-a':al[0],'aria-pressed':'false','aria-label':al[1],title:al[1],onclick:function(){
      var t=(state.board.texts||[])[state.selT];if(!t)return;
      if(al[0]==='l')delete t.a;else t.a=al[0];persistBoard();renderBoard();
    }});
    bt.innerHTML='<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">'+rects+'</svg>';
    $('talign').appendChild(bt);
  });
  $('ttext').addEventListener('keydown',function(e){if(e.key==='Escape')e.target.blur();e.stopPropagation()});
  $('ttext').addEventListener('input',function(e){
    var t=(state.board.texts||[])[state.selT];if(!t)return;t.t=e.target.value;
    var n=$('board').querySelector('.piece.btxt[data-t="'+state.selT+'"] .tx');if(n)n.textContent=t.t||' ';
    persistBoard();
  });
  $('tcolor').addEventListener('input',function(e){
    var t=(state.board.texts||[])[state.selT];if(!t)return;t.c=e.target.value;
    var n=$('board').querySelector('.piece.btxt[data-t="'+state.selT+'"]');if(n)n.style.color=t.c;
    persistBoard();
  });
  [['toutline','o'],['tshadow','sh']].forEach(function(x){
    $(x[0]).addEventListener('click',function(){
      var t=(state.board.texts||[])[state.selT];if(!t)return;
      if(t[x[1]])delete t[x[1]];else t[x[1]]=1;
      persistBoard();renderBoard();
    });
  });
  $('tremove').addEventListener('click',function(){if(state.selT<0)return;boardDel('t',state.selT)});
  $('odelundo').addEventListener('click',boardUndoDel);
}

/* tidy: tops upper left, bottoms and shoes below, accessories down the right */
function tidyRole(it){
  var m=it.meta;
  if(m==='Bottoms')return 'low';
  if(m==='Footwear')return 'shoe';
  if(['Tops','Outerwear','One-pieces','Loungewear','Activewear','Swimwear','Costumes','Lingerie','Underwear'].indexOf(m)>=0)return 'up';
  return 'acc';
}
function tidyBoard(approved){
  var b=state.board,map=byIdA(),ar=boardAR(),s=bst();
  var ps=b.pieces.filter(function(p){return map[p.id]});
  if(!ps.length){toast('Add a few pieces first');return}
  if(approved!==true){askConfirm('Arrange all pieces? This replaces their current positions, sizes, rotations, and stacking order. Text stays in place, and Undo arrange brings the previous piece layout back.','Arrange pieces',function(){tidyBoard(true)});return}
  state.tidyUndo={b:b,j:JSON.stringify(b.pieces)};
  var m=decorInset()+.6,x0=m,x1=100-m,y0=m*ar,y1=100-m*ar-(s.pal?5*ar*Math.sqrt(4/3/ar):0),g={up:[],low:[],shoe:[],acc:[]},z=1;
  ps.forEach(function(p){g[tidyRole(map[p.id])].push(p)});
  function place(list,X0,Y0,X1,Y1,maxCols){
    var n=list.length;if(!n)return;
    var rows=Math.ceil(n/maxCols),cols=Math.ceil(n/rows),cw=(X1-X0)/cols,ch=(Y1-Y0)/rows;
    list.forEach(function(p,i){
      var pol=s.ps==='polaroid',iar=map[p.id].ar||1,k33=.33/Math.sqrt(iar),w=pol?Math.min(cw*.8,Math.max(4,ch*.94/(ar*(1/iar+k33)))):Math.min(cw*.9,Math.max(4,ch*.94)*iar/ar),h=w*ar/iar,c=i%cols,r=Math.floor(i/cols);
      var padT=pol?.06*w/Math.sqrt(iar)*ar:0,padB=pol?.27*w/Math.sqrt(iar)*ar:0;
      p.w=round2(w);p.x=round2(X0+c*cw+(cw-w)/2);p.y=round2(Y0+r*ch+(ch-h-padT-padB)/2+padT);delete p.rot;p.z=z++;
    });
  }
  var hasMain=g.up.length+g.low.length+g.shoe.length,mx1=g.acc.length&&hasMain?x0+(x1-x0)*.68:x1;
  var lower=g.low.concat(g.shoe),split=!g.up.length?y0:!lower.length?y1:!g.low.length?y0+(y1-y0)*.68:y0+(y1-y0)*.5;
  place(g.up,x0,y0,mx1,split,4);
  place(lower,x0,split,mx1,y1,4);
  if(hasMain)place(g.acc,mx1,y0,x1,y1,g.acc.length>4?2:1);else place(g.acc,x0,y0,x1,y1,4);
  state.tidyUndo.after=JSON.stringify(b.pieces);state.sel=-1;persistBoard();renderBoard();toast('Arranged pieces. Use Undo arrange to go back.');
}

/* the Style panel beside the board */
function renderStylePanel(){
  if(state.keepPanel){state.keepPanel=false;return}
  var p=$('bstyle');if(!p)return;
  var open=!!state.styleOpen;
  p.classList.toggle('hide',!open);
  var ob=$('ostyle');ob.classList.toggle('on',open);ob.setAttribute('aria-pressed',open?'true':'false');
  if(!open){p.textContent='';return}
  var s=bst(),bg=s.bg||null,pal=boardPal(),keepScroll=p.scrollTop;
  p.textContent='';
  function sec(t){p.appendChild(el('h3',{text:t}))}
  function row(){var r=el('div',{class:'chips'});p.appendChild(r);return r}
  function sw(hex,on,fn,title){return el('button',{class:'swb'+(on?' on':''),type:'button',title:title||hex,'aria-label':title||hex,'aria-pressed':on?'true':'false',style:'background:'+hex,onclick:fn})}
  function custom(lbl,val,fn){return el('label',{class:'swb pickc',title:lbl},'＋',el('input',{type:'color','aria-label':lbl,value:val||'#888888',onchange:function(e){fn(e.target.value)}}))}
  function pickRow(lbl,opts,cur,fn){
    var sl=el('select',{class:'sel','aria-label':lbl,onchange:function(e){fn(e.target.value)}});
    opts.forEach(function(o){sl.appendChild(el('option',{value:o[0],text:o[1],selected:o[0]===cur?'selected':false}))});
    p.appendChild(el('label',{class:'srow'},el('span',{text:lbl}),sl));
  }
  function checkRow(lbl,on,fn,off){p.appendChild(el('label',{class:'crow'+(off?' off':'')},el('input',{type:'checkbox',checked:on?'checked':false,disabled:off?'disabled':false,onchange:fn}),el('span',{text:lbl})))}
  collPanel(p);
  sec('Shape');
  var r1=row();
  Object.keys(SHAPES).forEach(function(k){
    var a=SHAPES[k],ic=el('span',{class:'shp',style:'width:'+Math.round(a>=1?18:16*a)+'px;height:'+Math.round(a>=1?18/a:16)+'px'});
    var c=chip(k,(s.ar||'4:3')===k,function(){bgCache.k='';setSt({ar:k==='4:3'?null:k})},ic);c.title=SHAPE_LBL[k];r1.appendChild(c);
  });
  sec('Background color');
  var r2=el('div',{class:'swrow'});p.appendChild(r2);
  function setBg(c,extra){setSt(Object.assign({bg:{c:c,t:(bg&&bg.t)||'plain'}},extra||{}))}
  r2.appendChild(el('button',{class:'chip',type:'button','aria-pressed':bg?'false':'true',text:'Default',onclick:function(){setSt({bg:null})}}));
  var cols=[['#FFFFFF','White'],['#22292E','Charcoal']];
  function addCol(h,t,thr){if(!cols.some(function(c){return similarSuggestion(c[0],h)||cdist(c[0],h)<thr}))cols.push([h,t])}
  pal.forEach(function(h){addCol(h,palLabel(),40)});
  pal.forEach(function(h){addCol(mixHex(h,'#FFFFFF',.72),'Soft tint',60)});
  if(s.cc&&!cols.some(function(c){return c[0].toLowerCase()===s.cc.toLowerCase()}))cols.push([s.cc,'Your color']);
  if(bg&&bg.c&&!cols.some(function(c){return c[0].toLowerCase()===bg.c.toLowerCase()}))cols.push([bg.c,'Current background']);
  cols.forEach(function(c){r2.appendChild(sw(c[0],!!bg&&bg.c.toLowerCase()===c[0].toLowerCase(),function(){setBg(c[0])},c[1]))});
  r2.appendChild(custom('Pick any color',s.cc||(bg&&bg.c),function(v){setBg(v,{cc:v})}));
  pickRow('Texture',TEXTURES,(bg&&bg.t)||'plain',function(v){setSt({bg:{c:(bg&&bg.c)||'#FFFFFF',t:v}})});
  pickRow('Frame',[['','None'],['line','Thin line'],['mat','Mat'],['wave','Wavy'],['check','Checkerboard'],['diamond','Diamonds']],s.bd||'',function(v){setSt({bd:v||null})});
  if(isFX(s.bd)){
    var r6=el('div',{class:'swrow'});p.appendChild(r6);
    r6.appendChild(el('button',{class:'chip',type:'button','aria-pressed':s.bdc?'false':'true',text:'Auto',title:'Picks the outfit colors that stand out most against the background',onclick:function(){setSt({bdc:null,bcc:null})}}));
    var fc2=frameCols(),opts=[];pal.forEach(function(h){opts.push([h,palLabel()])});
    opts.forEach(function(c){r6.appendChild(sw(c[0],!!s.bdc&&s.bdc.toLowerCase()===c[0].toLowerCase(),function(){setSt({bdc:c[0]})},c[1]))});
    r6.appendChild(custom('Pick any color',s.bcc||fc2[0],function(v){setSt({bdc:v,bcc:v})}));
    p.appendChild(el('p',{class:'fine',text:'Two colors from the palette. Pick one and the other is chosen to go with it.'}));
  }else if(s.bd){
    var r5=el('div',{class:'swrow'});p.appendChild(r5);
    var fc=frameColor(),fcs=[['#FFFFFF','White'],['#14272F','Ink']];
    pal.forEach(function(h){if(!fcs.some(function(c){return similarSuggestion(c[0],h)||cdist(c[0],h)<40}))fcs.push([h,palLabel()])});
    if(s.bcc&&!fcs.some(function(c){return c[0].toLowerCase()===s.bcc.toLowerCase()}))fcs.push([s.bcc,'Your color']);
    fcs.forEach(function(c){r5.appendChild(sw(c[0],fc.toLowerCase()===c[0].toLowerCase(),function(){setSt({bdc:c[0]})},c[1]))});
    r5.appendChild(custom('Pick any color',s.bcc||fc,function(v){setSt({bdc:v,bcc:v})}));
  }
  if(isColl()){
    pickRow('Windows',[['','Plain'],['ring','Thin ring'],['mat','Mat']],s.wf||'',function(v){setSt({wf:v||null})});
    if(s.wf){
      var r9=el('div',{class:'swrow'});p.appendChild(r9);
      var wcur=wfColor(),wcs=[['#FFFFFF','White'],['#14272F','Ink']];
      pal.forEach(function(h){if(!wcs.some(function(c){return similarSuggestion(c[0],h)||cdist(c[0],h)<40}))wcs.push([h,palLabel()])});
      r9.appendChild(el('button',{class:'chip',type:'button','aria-pressed':s.wc?'false':'true',text:'Auto',title:'Picks a color that stands out from the background',onclick:function(){setSt({wc:null})}}));
      wcs.forEach(function(c){r9.appendChild(sw(c[0],!!s.wc&&s.wc.toLowerCase()===c[0].toLowerCase(),function(){setSt({wc:c[0]})},c[1]))});
      r9.appendChild(custom('Pick any color',s.wc||wcur,function(v){setSt({wc:v})}));
    }
  }else{
  pickRow('Borders',[['','Flat'],['shadow','Soft shadow'],['polaroid','Polaroid'],['tape','Washi tape'],['line','Outline']],s.ps||'',function(v){setSt({ps:v||null})});
  if(s.ps==='line'){
    pickRow('Outline',[['thin','Thin'],['med','Medium'],['thick','Thick']],s.lw||'med',function(v){setSt({lw:v})});
    var r8=el('div',{class:'swrow'});p.appendChild(r8);
    r8.appendChild(el('button',{class:'chip',type:'button','aria-pressed':s.lc?'false':'true',text:'Palette',title:'Each piece gets the next color of the palette',onclick:function(){setSt({lc:null})}}));
    pal.forEach(function(h){r8.appendChild(sw(h,!!s.lc&&s.lc.toLowerCase()===h.toLowerCase(),function(){setSt({lc:h})},palLabel()))});
    r8.appendChild(custom('Pick any color',s.lc||'#14272F',function(v){setSt({lc:v})}));
    p.appendChild(el('p',{class:'fine',text:s.lc?'Each piece gets a slightly lighter or darker shade of this color.':'Each piece gets the next color from the palette.'}));
  }
  var polOn=s.ps==='polaroid';
  checkRow('Hide white backgrounds',!!state.hideWhite&&!polOn,function(){state.hideWhite=!state.hideWhite;try{localStorage.setItem('closetlint.hidewhite.v1',state.hideWhite?'1':'0')}catch(e){}renderBoard()},polOn);
  }
  sec('Colors');
  (function(){
    var cp=curPalette(),prev=el('div',{class:'bpalprev',style:'display:flex;gap:4px;margin:6px 0 2px'});
    pickRow('Palette',[['','From the outfit']].concat(PALETTES.map(function(q){return [q[0],q[1]]})),s.pn||'',function(v){setSt({pn:v||null,bdc:null,bcc:null})});
    (cp?cp[2]:boardPal()).forEach(function(h){prev.appendChild(el('i',{style:'display:block;width:26px;height:18px;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);background:'+h}))});
    p.appendChild(prev);
    if(cp)p.appendChild(el('p',{class:'fine',text:'Backgrounds, frames, washi tape and the color strip all draw from this palette.'}));
  })();
  checkRow('Show color strip',!!s.pal,function(){setSt({pal:s.pal?null:true,px:null,py:null,pk:null,pr:null})});
  if(s.pal&&(s.px!=null||s.pk||s.pr))p.appendChild(el('button',{class:'linkbtn',type:'button',text:'Reset strip position and size',onclick:function(){setSt({px:null,py:null,pk:null,pr:null})}}));
  var items=boardItems();
  if(!items.length)p.appendChild(el('p',{class:'fine',text:'Add pieces to see their colors.'}));
  else p.appendChild(el('p',{class:'fine',text:'These colors are saved on the wardrobe piece, wherever it appears. Changes offer Undo.'}));
  items.forEach(function(it){
    var cur=swOf(it).slice(),saved=Array.isArray(it.sw)&&it.sw.length>0;
    function save(v){pieceAction(it,{sw:v},'Piece colors updated.').then(function(ok){if(ok)renderBoard()})}
    var line=el('div',{class:'swline'},el('img',{src:photoThumbnail(it.photo),alt:'',title:it.name,loading:'lazy',decoding:'async'}));
    cur.forEach(function(h,i){
      line.appendChild(el('label',{class:'swb',style:'background:'+h,title:'Change this color'},el('input',{type:'color','aria-label':'Color '+(i+1)+' of '+it.name,value:h,onchange:function(e){var v=cur.slice();v[i]=e.target.value;save(v)}})));
      line.appendChild(el('button',{class:'viewdel',type:'button','aria-label':'Remove this color',title:'Remove this color',text:'×',onclick:function(){var v=cur.slice();v.splice(i,1);save(v)}}));
    });
    if(cur.length<3)line.appendChild(custom('Add a color for '+it.name,'#888888',function(v){save(cur.concat([v]))}));
    if(saved)line.appendChild(el('button',{class:'linkbtn',type:'button',text:'auto',title:'Go back to the colors read from the photo',onclick:function(){save([])}}));
    p.appendChild(line);
  });
  p.scrollTop=keepScroll;
}

/* saved image: same background canvas, frame, shadows, text and color strip as the board */
function outfitImage(source){
  var b=boardDocument(source||state.board);
  if(!b.pieces.length&&!(b.texts||[]).length)return Promise.reject(new Error('This outfit is empty.'));
  var map=byIdA(),s=bst(b),sz=exportSize(b),W=sz[0],H=sz[1],c=document.createElement('canvas');c.width=W;c.height=H;
  var g=c.getContext('2d'),bgc=bgCanvas(b),u=W/100,tpalX=s.ps==='tape'?boardPal(b):null,lpalX=s.ps==='line'?boardPal(b):null;
  if(bgc)g.drawImage(bgc,0,0,W,H);else{g.fillStyle='#FFFFFF';g.fillRect(0,0,W,H)}
  var coll=!!b.lay,ps=coll?[]:b.pieces.slice().sort(function(a,b2){return a.z-b2.z}).filter(function(p){return map[p.id]});
  var chain=Promise.resolve();
  if(coll)chain=chain.then(function(){return collDraw(g,W,H,map,b)});
  ps.forEach(function(p){
    var it=map[p.id];
    chain=chain.then(function(){return needProc(p)?procCanvas(it,p).then(function(c2){return c2||loadImg(it.photo)}):loadImg(it.photo)}).then(function(im){
      var iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
      var w=p.w/100*W,h=w*ih/iw,x=p.x/100*W,y=p.y/100*H;
      var ps=p.nf?'':s.ps;
      g.save();
      g.translate(x+w/2,y+h/2);g.rotate((p.rot||0)*Math.PI/180);
      if(ps==='polaroid'){
        g.save();g.shadowColor='rgba(0,0,0,.3)';g.shadowBlur=1.4*u;g.shadowOffsetY=.4*u;
        var pgs=.06*Math.sqrt(w*h),pgb=.27*Math.sqrt(w*h);
        var pg=g.createLinearGradient(0,-h/2,0,h/2+pgb);pg.addColorStop(0,'#FFFFFF');pg.addColorStop(1,'#F4F2EC');g.fillStyle=pg;
        g.fillRect(-w/2-pgs,-h/2-pgs,w+2*pgs,h+pgs+pgb);g.restore();
      }
      g.save();
      if(ps==='shadow'){g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=2*u;g.shadowOffsetY=.75*u}
      if(ps==='polaroid'){g.shadowColor='rgba(0,0,0,.22)';g.shadowBlur=.5*u}
      if(p.fx||p.fy)g.scale(p.fx?-1:1,p.fy?-1:1);
      g.translate(-w/2,-h/2);
      g.drawImage(im,0,0,w,h);g.restore();
      if(ps==='polaroid'){g.strokeStyle='rgba(0,0,0,.16)';g.lineWidth=Math.max(1.5,.12*u);g.strokeRect(-w/2,-h/2,w,h)}
      if(ps==='line'){var lwx=(LINE_W[s.lw||'med']||.65)*u;g.strokeStyle=lineSpec(b.pieces.indexOf(p),lpalX,b);g.lineWidth=lwx;g.strokeRect(-w/2-lwx/2,-h/2-lwx/2,w+lwx,h+lwx)}
      if(ps==='tape'){var tsp=tapeSpec(b.pieces.indexOf(p),tpalX,b);drawTape(g,-w/2+1.2*u,-h/2+.25*u,u,tsp,-38);drawTape(g,w/2-1.2*u,-h/2+.25*u,u,tsp,38)}
      if(s.bg&&s.bg.t==='cork'){
        var pi=b.pieces.indexOf(p),pc=PINS[(pi*5+3)%PINS.length],pr=.9*u,pcx=0,pcy=-h/2+(ps==='polaroid'?-1.1:.4)*u+pr;
        g.save();g.shadowColor='rgba(0,0,0,.42)';g.shadowBlur=.5*u;g.shadowOffsetX=.25*u;g.shadowOffsetY=.45*u;
        var rg=g.createRadialGradient(pcx-pr*.28,pcy-pr*.4,0,pcx-pr*.28,pcy-pr*.4,pr*1.5);
        rg.addColorStop(0,'rgba(255,255,255,.9)');rg.addColorStop(.1,'rgba(255,255,255,.9)');rg.addColorStop(.34,pc);rg.addColorStop(1,mixHex(pc,'#000000',.45));
        g.fillStyle=rg;g.beginPath();g.arc(pcx,pcy,pr,0,6.3);g.fill();g.restore();
      }
      g.restore();
    });
  });
  var texts=b.texts||[];
  return chain.then(function(){
    if(!texts.length||!document.fonts||!document.fonts.load)return null;
    return Promise.all(texts.map(function(t){var f=BFONTS[t.f]||BFONTS.elite;return document.fonts.load(txWt(t).w+' 40px '+f.fam,t.t||'a').catch(function(){})}));
  }).then(function(){
    texts.forEach(function(t){
      var f=BFONTS[t.f]||BFONTS.elite,W0=txWt(t),fs=txFs(t)*u,lh=fs*1.15,lines=String(t.t||'').split('\n');
      g.save();g.font=W0.w+' '+fs+'px '+f.fam;g.fillStyle=t.c||'#14272F';g.textBaseline='middle';g.textAlign='left';
      var ws=lines.map(function(l){return g.measureText(l).width}),tw=Math.max.apply(null,ws.concat([1])),th=lines.length*lh;
      g.translate(t.x/100*W+tw/2,t.y/100*H+th/2);g.rotate((t.rot||0)*Math.PI/180);
      function fxShadow(on){g.shadowColor=on?'rgba(0,0,0,.5)':'rgba(0,0,0,0)';g.shadowOffsetX=on?.07*fs:0;g.shadowOffsetY=on?.09*fs:0;g.shadowBlur=on?.12*fs:0}
      lines.forEach(function(l,i){
        var ly=(i-(lines.length-1)/2)*lh,lx=t.a==='c'?-ws[i]/2:t.a==='r'?tw/2-ws[i]:-tw/2;
        if(t.o){g.lineJoin='round';g.lineWidth=.11*fs+W0.st*fs;g.strokeStyle=inkFor(t.c||'#14272F');fxShadow(!!t.sh);g.strokeText(l,lx,ly);fxShadow(false)}
        else if(t.sh)fxShadow(true);
        if(W0.st){g.lineJoin='round';g.lineWidth=W0.st*fs;g.strokeStyle=t.c||'#14272F';g.strokeText(l,lx,ly)}
        g.fillText(l,lx,ly);
        fxShadow(false);
      });
      g.restore();
    });
    if(s.pal){
      var pal=boardPal(b),bk=Math.sqrt(4/3/boardAR(b)),pk=s.pk||1,sq=3.4*u*bk*pk,gap=.6*u*bk*pk,wS=pal.length*sq+Math.max(0,pal.length-1)*gap,pp=palPos(b);
      g.save();g.translate(pp.x/100*W+wS/2,pp.y/100*H+sq/2);if(s.pr)g.rotate(s.pr*Math.PI/180);
      pal.forEach(function(h,i){
        var px=-wS/2+i*(sq+gap),py=-sq/2;
        g.fillStyle='rgba(255,255,255,.75)';g.fillRect(px-.12*u*pk,py-.12*u*pk,sq+.24*u*pk,sq+.24*u*pk);
        g.fillStyle=h;g.fillRect(px,py,sq,sq);
      });
      g.restore();
    }
    if(s.bd==='mat'){var mw=3.36*u;g.fillStyle=frameColor(b);g.fillRect(0,0,W,mw);g.fillRect(0,H-mw,W,mw);g.fillRect(0,0,mw,H);g.fillRect(W-mw,0,mw,H)}
    if(s.bd==='wave'){var Hh=100/boardAR(b),cl2=frameCols(b);g.save();g.scale(W/100,W/100);g.lineWidth=.75;g.lineJoin='round';g.lineCap='round';
      [[cl2[0],0],[cl2[1],.5]].forEach(function(z){g.strokeStyle=z[0];g.stroke(new Path2D(framePath(100,Hh,2.6,.9,6,s.bd,z[1])))});g.restore()}
    if(s.bd==='check'||s.bd==='diamond'){var Hh2=100/boardAR(b),cl3=frameCols(b);g.save();g.scale(W/100,W/100);frameCells(100,Hh2,1.4,s.bd).forEach(function(q){g.fillStyle=cl3[q.c];g.fill(new Path2D(q.d))});g.restore()}
    if(s.bd==='line'){var li=2.2*u,lw=Math.max(2,.22*u);g.strokeStyle=frameColor(b);g.lineWidth=lw;g.strokeRect(li+lw/2,li+lw/2,W-2*li-lw,H-2*li-lw)}
    return new Promise(function(resolve,reject){c.toBlob(function(blob){if(blob)resolve(blob);else reject(new Error('Image rendering failed.'))},'image/png')});
  });
}
function exportImage(source){
  var b=boardDocument(source&&Array.isArray(source.pieces)?source:state.board);
  if(!state.downloads){toast('Saving files is not available in this view.');return Promise.resolve(false)}
  return outfitImage(b).then(function(blob){
    var fn=((b.name||'outfit').replace(/[^A-Za-z0-9 _-]+/g,'').trim().replace(/\s+/g,'-')||'outfit')+'.png';
    return state.downloads.save({filename:fn,data:blob});
  }).then(function(){toast('Image saved. A little wardrobe artifact.');return true}).catch(function(e){if(e&&e.code==='declined')return false;toast('Could not export: '+(e&&e.message||e));return false});
}
