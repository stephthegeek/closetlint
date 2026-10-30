/* Your Sky interface. The scorer owns all calculations; this module only presents them. */
var ClosetLintSkyUI=(function(){
  'use strict';
  var reading='sun',selected=null,cache=null,cacheDay='',dirty=true,full=null,detail=null,previousFocus=null,detailPiecesCleanup=null;
  var labels={sun:'What you own',moon:'What you want',rising:'What you wear'},symbols={sun:'sun',moon:'moon',rising:'rising'};
  var houses={dark:'Dark',romantic:'Romantic',scholar:'Scholar',earth:'Earth',bright:'Bright',city:'City'};
  function button(text,action,cls){return el('button',{type:'button',class:cls||'btn',text:text,onclick:action})}
  function catalog(){return SKY_CATALOG}
  function model(){
    var day=todayStr();
    if(!cache||dirty||day!==cacheDay){
      var omit=new Set();Object.keys(state.profile||{}).forEach(function(id){var p=state.profile[id];if(p&&p.kind==='piece-collection'&&(p.synthetic===true||id==='collection-linty-imaginary-review'))(p.ids||[]).forEach(function(k){omit.add(k)})});
      var items=allItems().filter(function(p){return !omit.has(p.id)});
      cache=ClosetLintSky.score(items,state.ratings||{},catalog(),day);cache.omittedSamples=omit.size;cacheDay=day;dirty=false;
    }
    return cache;
  }
  function invalidate(){dirty=true}
  function current(){return model().readings[reading]}
  function dataFor(id){return current().constellations.find(function(c){return c.id===id})}
  function starFor(id){return current().stars.find(function(s){return s.id===id})}
  function definition(id){return catalog().constellations.find(function(c){return c.id===id})}
  // Presentation only: result type and evidence source do not change scoring.
  function signInfo(sign){
    var estimate=sign.kind==='wardrobe-estimate',constellation=sign.kind==='constellation'||estimate&&!!definition(sign.id);
    var type=sign.kind==='empty'?'Uncharted':constellation?'Constellation':'Style star';
    return {type:type,estimate:estimate,label:type+(estimate?' · provisional estimate':''),source:estimate?'Based on what you own':sign.emerging&&sign.kind!=='empty'?'Early reading':''};
  }
  function points(){var out={};catalog().stars.forEach(function(s){out[s.id]={x:65+s.sky.x*1040,y:45+s.sky.y*640}});return out}
  function lineChoices(result,key,star){
    var r=result.readings[key],defs=catalog().constellations,chosen=[];
    function add(id){var d=defs.find(function(c){return c.id===id});if(d&&!chosen.some(function(c){return c.id===id}))chosen.push(d)}
    ['sun','moon','rising'].forEach(function(k){add(result.readings[k].winner)});
    var p=points();r.constellations.filter(function(c){return c.complete}).forEach(function(c){
      var ids=(definition(c.id).core||c.stars);if(ids.every(function(a){return ids.every(function(b){return Math.hypot(p[a].x-p[b].x,p[a].y-p[b].y)<330})}))add(c.id);
    });
    if(star)defs.filter(function(c){return c.stars.indexOf(star)>=0}).forEach(function(c){add(c.id)});
    return chosen;
  }
  function svgNode(tag,attrs,text){var n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.keys(attrs||{}).forEach(function(k){n.setAttribute(k,attrs[k])});if(text!=null)n.textContent=text;return n}
  function layoutLabels(stars,map,options){
    options=options||{};var size=options.size||16.5,minX=options.minX||12,minY=options.minY||20,maxX=options.maxX||1180,maxY=options.maxY||760;
    var boxes=(options.reserved||[]).slice(),out={},pointsList=stars.map(function(s){return map[s.id]});
    function overlap(a,b){return Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y))}
    stars.slice().sort(function(a,b){return (b.strength||0)-(a.strength||0)||a.id.localeCompare(b.id)}).forEach(function(star){
      var at=map[star.id],width=star.tag.length*size*.63,height=size+7,best=null;
      [0,24,-24,48,-48,76,-76,108,-108,145,-145].forEach(function(dy){[1,-1].forEach(function(side){
        var x=Math.max(minX,Math.min(maxX-width,side===1?at.x+22:at.x-22-width));
        var y=Math.max(minY,Math.min(maxY-height,at.y-size*.7+dy));var box={x:x,y:y,w:width,h:height};
        var penalty=boxes.reduce(function(n,b){return n+overlap(box,b)*100},0)+pointsList.reduce(function(n,point){return n+overlap(box,{x:point.x-11,y:point.y-11,w:22,h:22})*50},0)+Math.abs(dy)+(side===1?0:8);
        if(!best||penalty<best.penalty)best={box:box,penalty:penalty};
      })});
      boxes.push(best.box);out[star.id]={x:best.box.x,y:best.box.y+size,w:width,h:height};
    });return out;
  }
  function chart(interactive){
    var result=model(),r=current(),p=points(),svg=svgNode('svg',{viewBox:'0 0 1200 780',class:'sky-chart',role:'group','aria-label':reading+' style star chart. Choose a star to see its details.'});
    [340,326,170].forEach(function(radius,i){svg.appendChild(svgNode('circle',{cx:590,cy:390,r:radius,class:'sky-ring','stroke-dasharray':i===1?'3 5':'none'}))});
    for(var tick=0;tick<72;tick++){var a=tick*Math.PI/36;svg.appendChild(svgNode('line',{x1:590+Math.cos(a)*340,y1:390+Math.sin(a)*340,x2:590+Math.cos(a)*(tick%6?346:355),y2:390+Math.sin(a)*(tick%6?346:355),class:'sky-ring'}))}
    for(var i=0;i<65;i++)svg.appendChild(svgNode('circle',{cx:22+(i*137)%1150,cy:32+(i*193)%710,r:i%4?1:1.7,class:'sky-bg-star',style:'animation-delay:-'+(i%9)+'s'}));
    [['dark',35,105],['romantic',480,55],['bright',900,115],['earth',40,720],['scholar',440,750],['city',940,725]].forEach(function(h){svg.appendChild(svgNode('text',{x:h[1],y:h[2],class:'sky-house-name'},houses[h[0]].toUpperCase()+' HOUSE'))});
    svg.appendChild(svgNode('path',{d:'M190 120 l-80 -32',class:'sky-shooting-star','aria-hidden':'true'}));
    var constellationLabels=[],reserved=[{x:566,y:366,w:48,h:48}];lineChoices(result,reading,selected).forEach(function(c){
      var ids=c.core&&c.core.length?c.core:c.stars,active=c.id===r.winner,scored=dataFor(c.id),pairs=ids.slice(1).map(function(id,i){return [ids[i],id]});
      if(ids.length>2)pairs.push([ids[ids.length-1],ids[0]]);
      pairs.forEach(function(pair){svg.appendChild(svgNode('line',{x1:p[pair[0]].x,y1:p[pair[0]].y,x2:p[pair[1]].x,y2:p[pair[1]].y,class:'sky-line'+(active?' active':'')+(scored&&!scored.complete?' unlit':'')}))});
      if(active){var center=ids.reduce(function(s,id){return {x:s.x+p[id].x/ids.length,y:s.y+p[id].y/ids.length}},{x:0,y:0});var name=svgNode('text',{x:Math.min(1000,center.x+10),y:center.y+28,class:'sky-cons-label',role:'button',tabindex:'0','data-constellation':c.id,'aria-label':'View '+c.name},c.name.toUpperCase());name.addEventListener('click',function(){openDetail('constellation',c.id)});name.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail('constellation',c.id)}});constellationLabels.push(name);reserved.push({x:Math.min(1000,center.x+10),y:center.y+10,w:c.name.length*11,h:24})}
    });
    var labelPositions=layoutLabels(r.stars,p,{reserved:reserved});
    r.stars.forEach(function(s){
      var pos=p[s.id],size=4+s.strength*11,group=svgNode('g',{transform:'translate('+pos.x+' '+pos.y+')',class:'sky-star-target'+(selected===s.id?' selected':''),'data-star':s.id});
      {group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label',s.tag+', '+s.pieceCount+' contributing pieces');group.setAttribute('aria-pressed',selected===s.id?'true':'false');var pick=function(){selectStar(s.id)};group.addEventListener('click',pick);group.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}})}
      group.appendChild(svgNode('circle',{r:36,class:'sky-hit'}));group.appendChild(svgNode('circle',{r:21,class:'sky-focus'}));
      if(s.strength>.2)group.appendChild(svgNode('path',{d:'M0 '+(-size)+' L'+(size*.16)+' '+(-size*.16)+' L'+size+' 0 L'+(size*.16)+' '+(size*.16)+' L0 '+size+' L'+(-size*.16)+' '+(size*.16)+' L'+(-size)+' 0 L'+(-size*.16)+' '+(-size*.16)+' Z',class:'sky-glint',opacity:.4+s.strength*.6}));
      else group.appendChild(svgNode('circle',{r:Math.max(1.7,size*.3),class:'sky-glint',opacity:s.votes?.5:.2}));
      var label=labelPositions[s.id];if(Math.abs(label.y-pos.y)>24)group.appendChild(svgNode('line',{x1:0,y1:0,x2:(label.x>pos.x?label.x:label.x+label.w)-pos.x,y2:label.y-pos.y-6,class:'sky-label-guide'}));group.appendChild(svgNode('text',{x:label.x-pos.x,y:label.y-pos.y,class:'sky-star-label',opacity:s.pieceCount===0?.45:s.pieceCount<=10?.72:1},s.tag));svg.appendChild(group);
    });
    constellationLabels.forEach(function(name){svg.appendChild(name)});
    var goblin=dataFor('goblincore'),home=svgNode('g',{class:'sky-home-star'+(goblin&&goblin.complete?' lit':''),transform:'translate(590 390)',role:'button',tabindex:'0','aria-label':"Goblincore · Linty’s home star"});
    home.appendChild(svgNode('title',{},"GOBLINCORE · LINTY’S HOME STAR · "+(goblin&&goblin.complete?'lit':'still gathering')));home.appendChild(svgNode('circle',{r:22,class:'sky-hit'}));home.appendChild(svgNode('path',{class:'sky-home-glint',d:'M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z'}));
    var homeLabel=svgNode('g',{class:'sky-home-label','aria-hidden':'true'});homeLabel.appendChild(svgNode('rect',{x:-134,y:26,width:268,height:60,rx:10}));homeLabel.appendChild(svgNode('text',{x:0,y:50,'text-anchor':'middle'},'GOBLINCORE'));homeLabel.appendChild(svgNode('text',{x:0,y:71,'text-anchor':'middle'},'Linty’s home star'));home.appendChild(homeLabel);
    home.addEventListener('click',function(){openDetail('constellation','goblincore')});home.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail('constellation','goblincore')}});svg.appendChild(home);
    return svg;
  }
  function mark(){var source=$('linty-logo-image'),href=source&&source.getAttribute('href');return href?el('img',{class:'sky-mark',src:href,alt:''}):el('span',{class:'sky-mark','aria-hidden':'true',text:'✦'})}
  function heading(title){return el('div',{class:'sky-heading-copy'},el('div',{class:'sky-kicker',text:'Constellations · Observatory'}),el('h2',{text:title}))}
  function modes(redraw){var n=el('div',{class:'sky-modes',role:'group','aria-label':'Sky reading'});Object.keys(labels).forEach(function(k){n.appendChild(el('button',{type:'button','aria-pressed':reading===k?'true':'false',onclick:function(){reading=k;selected=null;redraw()}},el('span',{class:'sky-mode-symbol','aria-hidden':'true'},ClosetLintIcons.node(symbols[k])),el('span',{text:' '+cap(k)})))});return n}
  function signCard(key){var sign=model().readings[key].sign;return el('button',{type:'button',class:'sky-sign',onclick:function(){reading=sign.basis||key;if(sign.id)openDetail(sign.kind==='constellation'||sign.kind==='wardrobe-estimate'&&definition(sign.id)?'constellation':'star',sign.id);else openFull()}},el('span',{class:'sky-sign-icon','aria-hidden':'true'},ClosetLintIcons.node(symbols[key])),el('span',null,el('span',{class:'sky-label',text:key+' · '+labels[key]}),el('strong',{text:sign.name}),el('small',{class:'sky-sign-kind',text:signInfo(sign).label}),sign.note?el('small',{text:sign.note}):null,sign.influences.length?el('small',{text:'With '+sign.influences.join(' and ')+' influences.'}):null))}
  function render(){
    var host=$('view-sky');if(!host)return;var result=model();host.textContent='';if(state.skyCatalog){renderCatalog(host);return}
    host.appendChild(el('div',{class:'sky-heading page-heading'},mark(),heading('Your Style Sky'),button('Share my sky',openShare,'btn sky-share-heading')));
    var previewMap=el('div',{class:'sky-preview-map'},chart(false));
    var preview=el('div',{class:'sky-preview'},el('span',{class:'sky-label',text:'Tonight’s sky · '+reading}),button('Share',openShare,'btn small sky-share-map'),previewMap,el('button',{type:'button',class:'btn sky-look','aria-label':'Open the full sky',onclick:openFull},el('span',{'aria-hidden':'true',text:'⛶'})));
    var side=el('aside',null,el('div',{class:'sky-label sky-big-three-label',text:'Your Big Three'}),el('div',{class:'sky-signs'},signCard('sun'),signCard('moon'),signCard('rising')),el('div',{class:'sky-note'},el('p',{text:'Your closet has layers. So does its sky.'})),el('div',{class:'sky-help'},el('div',{class:'sky-label',text:'How to read your sky'}),el('p',{text:'Stars are your style tags. Constellations connect them when your pieces tell a more specific story. Your Sun reads what you own, your Moon what you love or wish for, and your Rising what you wear.'}),el('p',{text:'A sign can be a constellation or a broader style star. Early readings have limited evidence; provisional estimates use what you own until there’s enough evidence for that sign.'})));
    host.appendChild(el('div',{class:'sky-overview'},preview,side,catalogTree()));
    if(result.omittedSamples)host.appendChild(el('p',{class:'sky-omitted',text:'Practice collection omitted from this sky.'}));
    host.appendChild(el('p',{class:'sky-meta',text:catalog().stars.length+' stars · '+catalog().constellations.length+' constellations · formula '+result.scoringVersion}));
    (typeof requestAnimationFrame==='function'?requestAnimationFrame:function(fn){fn()})(function(){previewMap.scrollLeft=Math.max(0,(previewMap.scrollWidth-previewMap.clientWidth)/2)});
    if(full&&full.open)drawFull();
  }
  function dots(strength){var count=Math.max(0,Math.min(5,Math.round(strength*5)));return '●'.repeat(count)+'○'.repeat(5-count)}
  function ranked(){return current().constellations.slice().sort(function(a,b){return Number(b.complete)-Number(a.complete)||b.brightness-a.brightness||a.name.localeCompare(b.name)})}
  function signBadges(id){var n=el('span',{class:'sky-sign-badges'});Object.keys(labels).forEach(function(k){if(model().readings[k].sign.id===id)n.appendChild(el('span',{class:'sky-sign-badge',role:'img','aria-label':cap(k)+' · '+signInfo(model().readings[k].sign).label,title:cap(k)+' · '+signInfo(model().readings[k].sign).label},ClosetLintIcons.node(symbols[k])))});return n}
  function showCatalog(on){if(window.ClosetLintRoutes&&window.ClosetLintRoutes.sky)return window.ClosetLintRoutes.sky(on);state.skyCatalog=on;render();window.scrollTo(0,0)}
  function catalogTree(){
    var rows=ranked().slice(0,6),tree=el('div',{class:'sky-tree sky-tree-preview'});
    rows.forEach(function(c,i){var d=definition(c.id),line=el('div',{class:'sky-tree-entry'},el('div',{class:'sky-tree-row'},button((i===rows.length-1?'└ ':'├ ')+c.name,function(){openDetail('constellation',c.id)},'sky-link'),signBadges(c.id)));
      if(i<2){var stars=el('div',{class:'sky-tree-stars'});d.core.forEach(function(id){var star=starFor(id);stars.appendChild(button(star.tag+' '+dots(star.strength),function(){openDetail('star',id)},'sky-link'))});line.appendChild(stars)}tree.appendChild(line)});
    return el('section',{class:'sky-catalog'},el('div',{class:'sky-catalog-head'},el('span',{class:'sky-label',text:'Observatory catalog'}),el('div',{class:'sky-perspective'},el('span',{class:'sky-perspective-hint',text:'Shift your perspective →'}),modes(render))),tree,button('All '+catalog().constellations.length+' constellations · '+catalog().stars.length+' stars →',function(){showCatalog(true)},'sky-link sky-catalog-more'));
  }
  function renderCatalog(host){
    host.appendChild(el('div',{class:'sky-heading page-heading'},heading('All constellations'),el('div',{class:'page-actions'},button('← Back to your sky',function(){showCatalog(false)}),modes(render))));
    var jump=el('nav',{class:'sky-house-jumps','aria-label':'Jump to a house'}),grid=el('div',{class:'sky-house-grid'}),glyphs={dark:'moon',romantic:'heart',scholar:'diamond',earth:'flower',bright:'sun',city:'city'};
    Object.keys(houses).forEach(function(house){
      var entries=ranked().filter(function(c){return definition(c.id).house===house}),lit=entries.filter(function(c){return c.complete}),dim=entries.filter(function(c){return !c.complete}),id='sky-house-'+house;
      jump.appendChild(button(houses[house],function(){var target=$(id);if(target&&target.scrollIntoView)target.scrollIntoView({block:'start'})},'btn small'));
      var card=el('section',{class:'sky-house-card',id:id},el('div',{class:'sky-house-head'},el('h3',null,ClosetLintIcons.node(glyphs[house]),' '+houses[house]+' house'),el('span',{class:'fine',text:lit.length+' lit / '+entries.length})));
      lit.forEach(function(c){card.appendChild(el('div',{class:'sky-catalog-row'},button('✦ '+c.name,function(){openDetail('constellation',c.id)},'sky-link'),signBadges(c.id),el('span',{class:'sky-dots','aria-label':'Relative brightness',text:dots(Math.max(0,Math.min(1,c.brightness)))})))});
      if(!lit.length)card.appendChild(el('div',{class:'sky-house-empty'},mark(),el('p',{text:'Nothing lit yet. Linty is watching this corner.'})));
      if(dim.length){card.appendChild(el('p',{class:'sky-label',text:'Still gathering · '+dim.length}));var chips=el('div',{class:'sky-dim-chips'});dim.forEach(function(c){chips.appendChild(button(c.name,function(){openDetail('constellation',c.id)},'sky-dim-chip'))});card.appendChild(chips)}grid.appendChild(card);
    });host.appendChild(jump);host.appendChild(grid);
  }
  function openFull(){
    previousFocus=document.activeElement;full=el('dialog',{class:'sky-full','aria-label':'Your full sky'});document.body.appendChild(full);
    full.addEventListener('close',function(){full.remove();full=null;if(state.tab==='sky')render();if(previousFocus&&previousFocus.isConnected)previousFocus.focus()});
    drawFull();full.showModal();
  }
  function closeFull(){if(full)full.close()}
  function drawFull(){
    if(!full)return;var zoom=full.querySelector('.sky-viewport.zoomed');full.textContent='';
    var view=el('div',{class:'sky-viewport'+(zoom?' zoomed':''),tabindex:'0','aria-label':'Scrollable sky map'},chart(true));
    var tools=el('div',{class:'sky-map-tools'},button(zoom?'Fit chart':'Zoom chart',function(){view.classList.toggle('zoomed');this&&this.blur&&this.blur();tools.firstChild.textContent=view.classList.contains('zoomed')?'Fit chart':'Zoom chart'}));
    var readout=el('aside',{class:'sky-readout',id:'sky-readout','aria-live':'polite'});
    var footer=el('div',{class:'sky-full-footer'});Object.keys(labels).forEach(function(k){footer.appendChild(el('button',{type:'button',onclick:function(){reading=k;selected=null;drawFull()}},el('small',{text:k+' · '+labels[k]}),el('small',{class:'sky-sign-kind',text:signInfo(model().readings[k].sign).label}),el('span',{class:'sky-footer-symbol','aria-hidden':'true'},ClosetLintIcons.node(symbols[k])),el('span',{text:model().readings[k].sign.name})))});
    full.appendChild(el('div',{class:'sky-full-head'},mark(),heading('Your Style Sky'),modes(drawFull),button('×',closeFull,'btn sky-close')));full.querySelector('.sky-close').setAttribute('aria-label','Close full sky');
    full.appendChild(el('div',{class:'sky-full-body'},el('div',null,tools,view),readout));full.appendChild(footer);drawReadout();attachMap(view);
  }
  function attachMap(view){
    var mini=svgNode('svg',{viewBox:'0 0 1200 780',class:'sky-minimap',role:'img','aria-label':'Your position in the full sky'}),map=points();
    catalog().stars.forEach(function(s){mini.appendChild(svgNode('circle',{cx:map[s.id].x,cy:map[s.id].y,r:5}))});var frame=svgNode('rect',{class:'sky-minimap-frame',x:0,y:0,width:1200,height:780,rx:12});mini.appendChild(frame);
    var parent=view.parentNode;var hint=el('span',{class:'sky-pan-hint',text:'Drag to explore · pinch to zoom'}),wrap=el('div',{class:'sky-map-frame'},view,el('span',{class:'sky-pan-edge sky-pan-left','aria-hidden':'true',text:'‹'}),el('span',{class:'sky-pan-edge sky-pan-right','aria-hidden':'true',text:'›'}),hint);
    parent.appendChild(wrap);parent.appendChild(mini);
    function update(){var sw=view.scrollWidth||view.clientWidth||1,sh=view.scrollHeight||view.clientHeight||1,w=view.clientWidth||sw,h=view.clientHeight||sh;frame.setAttribute('x',(view.scrollLeft||0)/sw*1200);frame.setAttribute('y',(view.scrollTop||0)/sh*780);frame.setAttribute('width',Math.min(1200,w/sw*1200));frame.setAttribute('height',Math.min(780,h/sh*780));wrap.classList.toggle('can-pan-left',(view.scrollLeft||0)>3);wrap.classList.toggle('can-pan-right',(view.scrollLeft||0)+w<sw-3)}
    view.addEventListener('scroll',function(){hint.hidden=true;update()},{passive:true});
    var drag=null;view.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'||e.button!==0)return;drag={x:e.clientX,start:view.scrollLeft||0,moved:false}});
    view.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.x;if(Math.abs(dx)>6){drag.moved=true;view.scrollLeft=drag.start-dx;hint.hidden=true;update();if(view.setPointerCapture)view.setPointerCapture(e.pointerId)}});
    view.addEventListener('click',function(e){if(drag&&drag.moved){e.preventDefault();e.stopPropagation()}},true);view.addEventListener('pointerup',function(){if(drag&&!drag.moved)drag=null;else setTimeout(function(){drag=null},0)});view.addEventListener('pointercancel',function(){drag=null});
    function center(){var winner=definition(model().readings.sun.sign.id),ids=winner?winner.core:[],x=ids.length?ids.reduce(function(sum,id){return sum+map[id].x},0)/ids.length:590;view.scrollLeft=Math.max(0,x/1200*(view.scrollWidth||0)-(view.clientWidth||0)/2);update()}
    (typeof requestAnimationFrame==='function'?requestAnimationFrame:function(fn){fn()})(center);
    if(typeof ResizeObserver!=='undefined'){if(full.skyObserver)full.skyObserver.disconnect();var observer=new ResizeObserver(update);full.skyObserver=observer;observer.observe(view);full.addEventListener('close',function(){observer.disconnect()},{once:true})}
    var tools=parent.querySelector('.sky-map-tools'),zoomButton=tools&&tools.firstChild;if(zoomButton)zoomButton.addEventListener('click',function(){(typeof requestAnimationFrame==='function'?requestAnimationFrame:function(fn){fn()})(update)});
  }
  function selectStar(id){selected=id;if(full){full.querySelector('.sky-viewport').replaceChildren(chart(true));drawReadout();var target=full.querySelector('[data-star="'+id+'"]');if(target)target.focus()}openDetail('star',id)}
  function drawReadout(){
    var box=$('sky-readout');if(!box)return;var star=starFor(selected)||current().stars[0],members=catalog().constellations.filter(function(c){return c.stars.indexOf(star.id)>=0});
    box.textContent='';box.appendChild(el('div',{class:'sky-readout-title',text:'Readout ▮ · '+reading}));
    var dl=el('dl');[['Magnitude',star.magnitude.toFixed(1)],['Pieces',String(star.pieceCount)],['In',members.length+' constellations']].forEach(function(pair){dl.appendChild(el('div',null,el('dt',{text:pair[0]}),el('dd',{text:pair[1]})))});
    var links=el('div',{class:'sky-star-chips'});links.appendChild(button('View '+star.tag,function(){openDetail('star',star.id)},'sky-link'));members.slice(0,5).forEach(function(c){links.appendChild(button(c.name,function(){openDetail('constellation',c.id)},'sky-link'))});
    box.appendChild(el('div',{class:'sky-readout-body'},el('span',{class:'sky-label',text:'Style star · '+houses[star.house]+' house'}),el('h3',{text:star.tag}),dl,el('span',{class:'fine',text:'Lower magnitude = brighter'}),links));
  }
  function pieceCard(row,map){
    var item=map[row.id];if(!item)return null;var photo=piecePhotos(item)[0];
    return el('button',{type:'button',class:'sky-piece',onclick:function(){if(openEdit(item)!==false){if(detail&&detail.open)detail.close();if(full&&full.open)full.close()}}},el('img',{src:photo.src,alt:'',loading:'lazy',decoding:'async',style:'object-fit:'+(typeof photoFraming==='function'?photoFraming(photo):'contain')}),el('span',null,el('strong',{text:item.name})));
  }
  function pieceList(rows,limit){var list=el('div',{class:'sky-pieces'}),map=byIdA();rows.slice(0,limit||rows.length).forEach(function(row){var card=pieceCard(row,map);if(card)list.appendChild(card)});return list}
  function morePieces(rows){
    var owner=detail,all=el('details',null,el('summary',{text:'See all '+rows.length+' pieces'})),list=null,more=null,drawn=3,observer=null,disposed=false;
    function stop(){if(observer){observer.disconnect();observer=null}}
    detailPiecesCleanup=function(){disposed=true;stop()};
    function live(){return !disposed&&detail===owner&&owner.open&&all.open&&all.isConnected}
    function appendBatch(){
      if(!live())return;var map=byIdA(),end=Math.min(drawn+24,rows.length);
      for(;drawn<end;drawn++){var card=pieceCard(rows[drawn],map);if(card)list.appendChild(card)}
      more.hidden=drawn>=rows.length;if(more.hidden)stop();
    }
    function observe(){
      if(more.hidden||typeof IntersectionObserver==='undefined')return;
      var active=new IntersectionObserver(function(entries){if(observer!==active||!live()){active.disconnect();return}if(entries.some(function(e){return e.isIntersecting}))appendBatch()},{root:owner,rootMargin:'160px'});
      observer=active;active.observe(more);
    }
    all.addEventListener('toggle',function(){
      if(!all.open){stop();return}if(!live())return;
      if(!list){list=el('div',{class:'sky-pieces'});more=button('Load more pieces',appendBatch,'btn sky-pieces-more');all.appendChild(list);all.appendChild(more);appendBatch()}
      stop();observe();
    });
    return all;
  }
  function openDetail(kind,id){
    var c=kind==='constellation'?dataFor(id):starFor(id);if(!c)return;
    if(!detail){detail=el('dialog',{class:'sky-detail','aria-label':'Sky detail'});document.body.appendChild(detail);detail.addEventListener('close',function(){if(detailPiecesCleanup){detailPiecesCleanup();detailPiecesCleanup=null}detail.remove();detail=null});detail.addEventListener('click',function(e){if(e.target!==detail)return;var r=detail.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)detail.close()})}
    if(detailPiecesCleanup){detailPiecesCleanup();detailPiecesCleanup=null}
    var d=detail;d.textContent='';var def=kind==='constellation'?definition(id):null,title=kind==='constellation'?c.name:c.tag;
    var close=button('×',function(){d.close()});close.setAttribute('aria-label','Close sky detail');d.appendChild(el('div',{class:'sky-detail-header'},el('div',null,el('div',{class:'sky-label',text:reading+' · '+labels[reading]}),el('div',{class:'sky-label',text:kind==='constellation'?'Constellation':'Style star'}),el('h2',{text:title})),close));
    var body=el('div',{class:'sky-detail-body'}),rows=c.contributors||[];
    Object.keys(labels).forEach(function(key){var sign=model().readings[key].sign;if(sign.id===id&&(sign.basis||key)===reading&&signInfo(sign).estimate)body.appendChild(el('p',{class:'sky-sign-estimate',text:cap(key)+' · provisional estimate based on what you own. '+(sign.note||'') }));});
    if(def){
      var leads=Object.keys(labels).filter(function(k){return model().readings[k].winner===id});if(leads.length)body.appendChild(el('p',{text:'Leads your '+leads.map(cap).join(' and ')+'.'}));
      body.appendChild(el('p',{text:c.complete?c.pieceCount+' signature pieces support this constellation.':c.reason==='Qualified'?'Still gathering.':'Still gathering: '+c.reason.toLowerCase()+'.'}));
      if(def.blurb)body.appendChild(el('p',{text:def.blurb}));
      body.appendChild(el('h3',{text:'Stars in it'}));var chips=el('div',{class:'sky-star-chips'});def.stars.forEach(function(sid){var s=starFor(sid);chips.appendChild(button(s.tag+' '+dots(s.strength),function(){openDetail('star',sid)}))});body.appendChild(chips);
      if(def.signature)body.appendChild(el('p',{text:def.signature}));
      var neighbors=catalog().constellations.filter(function(x){return x.id!==id&&x.stars.some(function(s){return def.core.indexOf(s)>=0})}).slice(0,5);
      if(neighbors.length){body.appendChild(el('h3',{text:'Nearby constellations'}));var nearby=el('div',{class:'sky-related-links'});neighbors.forEach(function(n){nearby.appendChild(button(n.name,function(){openDetail('constellation',n.id)},'sky-link'))});body.appendChild(nearby)}
    }else{
      body.appendChild(el('p',{text:c.pieceCount+' pieces light this star in your '+reading+'.'}));if(!rows.length)body.appendChild(el('p',{text:'Still gathering. No matching pieces in this reading yet.'}));
      var matches=catalog().constellations.filter(function(x){return x.stars.indexOf(id)>=0});body.appendChild(el('h3',{text:'Constellations it connects'}));var connected=el('div',{class:'sky-related-links'});matches.forEach(function(n){connected.appendChild(button(n.name,function(){openDetail('constellation',n.id)},'sky-link'))});body.appendChild(connected);
    }
    body.appendChild(el('h3',{text:'Pieces that light it'}));body.appendChild(pieceList(rows,3));
    if(rows.length>3){body.appendChild(morePieces(rows))}
    var ids=rows.map(function(x){return x.id});if(ids.length)body.appendChild(el('div',{class:'sky-detail-actions'},button('Show these pieces',function(){browsePieces(ids,title)}),button('Choose pieces for board',function(){buildFrom(ids,title)})));
    if(def){body.appendChild(el('h3',{text:'Words to search'}));var searches=el('div',{class:'sky-star-chips'});(def.searchTerms&&def.searchTerms.length?def.searchTerms:[def.name+' outfits']).forEach(function(t){searches.appendChild(button(t,function(){openSearch(t)}))});body.appendChild(searches)}
    d.appendChild(body);if(!d.open)d.showModal();
  }
  function openSearch(term){
    var d=el('dialog',{class:'sky-search','aria-label':'Search for '+term}),body=el('div',{class:'sky-detail-body'});
    d.appendChild(el('div',{class:'sky-detail-header'},el('h2',{text:term}),button('×',function(){d.close()})));
    ['inspiration','shops'].forEach(function(key){var links=(catalog().searchLinks||{})[key]||[];if(!links.length)return;body.appendChild(el('h3',{text:cap(key)}));var list=el('div',{class:'sky-search-links'});links.slice().sort(function(a,b){return a.label.localeCompare(b.label)}).forEach(function(link){try{var url=new URL(link.url.replace('{q}',encodeURIComponent(term)));if(url.protocol!=='https:')return;list.appendChild(el('a',{class:'btn',href:url.href,target:'_blank',rel:'noopener noreferrer',text:link.label+' ↗'}))}catch(e){}});body.appendChild(list)});
    d.appendChild(body);d.addEventListener('close',function(){d.remove()});d.addEventListener('click',function(e){if(e.target===d){var r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});document.body.appendChild(d);d.showModal();
  }
  function browsePieces(ids,label){
    if(setTab('all')===false)return;state.skyFilter={ids:ids.slice(),label:label};renderFilters();renderGrid();notice();window.scrollTo(0,0);
  }
  function buildFrom(ids,label){
    if(setTab('outfits')===false)return;state.skyTrayIds=ids.slice();state.skyTrayLabel=label;state.trayMeta='All';state.traySub='';state.trayQ='';state.trayFav=false;renderTray();
  }
  function notice(){var n=$('sky-filter-note');if(!n)return;n.textContent='';n.hidden=!state.skyFilter;if(state.skyFilter){n.appendChild(el('span',{text:'From your sky: '+state.skyFilter.label}));n.appendChild(button('Clear Sky selection',function(){state.skyFilter=null;renderGrid()}))}}
  function shareEligible(sign){return !!sign&&!!sign.id&&sign.kind!=='wardrobe-estimate'&&sign.kind!=='empty'}
  function shareSentence(result){
    var signs=['sun','moon','rising'].map(function(k){return result.readings[k].sign}),copy=catalog().shareCopy||{},essences=copy.essences||{};
    function word(i){var s=signs[i],bank=essences[s.kind==='constellation'?'constellations':'stars']||{};return bank[s.id]||s.name}
    function same(a,b){return signs[a].kind===signs[b].kind&&signs[a].id===signs[b].id}
    var known=signs.map(shareEligible),a=known[0]?word(0):'',b=known[1]?word(1):'',c=known[2]?word(2):'';
    if(known.every(Boolean)){
      if(same(0,1)&&same(1,2))return a+', through and through.';
      if(same(0,1))return a+' at heart. '+c+' in practice.';
      if(same(1,2))return a+' closet. '+b+' everywhere else.';
      if(same(0,2))return a+' in practice. Dreaming '+b+'.';
      return a+' closet. '+b+' dreams. '+c+' in practice.';
    }
    var parts=[];
    if(known[0]&&known[1]&&same(0,1))parts.push(a+' at heart.');
    else if(known[0]&&known[2]&&same(0,2))parts.push(a+' in practice.');
    else if(known[1]&&known[2]&&same(1,2))parts.push(b+' in dreams and practice.');
    else{if(a)parts.push(a+(known.filter(Boolean).length===1?' at heart.':' closet.'));if(b)parts.push(b+' dreams.');if(c)parts.push(c+' in practice.')}
    return parts.length?parts.join(' ')+' The rest is still gathering.':'Your sky is still gathering.';
  }
  function shareGraph(result){
    var map=points(),ids=new Set(),edges=[],supportEdges=[],backgroundEdges=[],seen=new Set(),groups=[],broad=[];
    function distance(a,b){return Math.hypot(map[a].x-map[b].x,map[a].y-map[b].y)}
    function pairs(members){var out=members.slice(1).map(function(id,i){return [members[i],id]});if(members.length>2)out.push([members[members.length-1],members[0]]);return out}
    function addEdge(pair,list){var key=pair.slice().sort().join('|');if(!seen.has(key)){seen.add(key);list.push(pair);pair.forEach(function(id){ids.add(id)})}}
    ['sun','moon','rising'].forEach(function(key){
      var sign=result.readings[key].sign;if(!shareEligible(sign))return;
      var def=sign.kind==='constellation'?definition(sign.id):null;
      var members=def?(def.core&&def.core.length?def.core:def.stars):map[sign.id]?[sign.id]:[];
      if(!members.length)return;
      var group=groups.find(function(g){return g.id===sign.id&&g.kind===sign.kind});
      if(group){group.keys.push(key);return}
      group={id:sign.id,kind:sign.kind,name:sign.name,keys:[key],members:members.slice()};groups.push(group);
      members.forEach(function(id){ids.add(id)});pairs(members).forEach(function(pair){addEdge(pair,edges)});
      if(!def){broad.push(sign.id);return}
      (def.support||[]).forEach(function(id){if(!result.readings[key].stars.some(function(s){return s.id===id&&s.votes>0}))return;var nearest=members.slice().sort(function(a,b){return distance(id,a)-distance(id,b)})[0];if(nearest&&distance(id,nearest)<=230)addEdge([nearest,id],supportEdges)});
    });
    // Remove edges near broad-star results only from background decoration.
    function crossesBroad(pair){return broad.some(function(id){var p=map[id],a=map[pair[0]],b=map[pair[1]],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<45})}
    var candidates=[];
    ['sun','moon','rising'].forEach(function(key){if(!shareEligible(result.readings[key].sign))return;result.readings[key].constellations.forEach(function(c){if(c.complete&&!groups.some(function(g){return g.kind==='constellation'&&g.id===c.id})&&!candidates.some(function(x){return x.id===c.id}))candidates.push(c)})});
    var count=0;candidates.forEach(function(c){if(count>=2)return;var def=definition(c.id),members=def.core&&def.core.length?def.core:def.stars;if(members.some(function(a){return members.some(function(b){return distance(a,b)>330})}))return;var lines=pairs(members).filter(function(pair){return !crossesBroad(pair)});if(lines.length){count++;lines.forEach(function(pair){addEdge(pair,backgroundEdges)})}});
    return {stars:catalog().stars.filter(function(s){return ids.has(s.id)}),edges:edges,supportEdges:supportEdges,backgroundEdges:backgroundEdges,groups:groups,broad:broad};
  }
  function drawShare(canvas,shape){
    var styles=getComputedStyle(document.documentElement);
    function value(key,fallback){return styles.getPropertyValue(key).trim()||fallback}
    var theme={background:value('--bg','#101611'),ink:value('--ink','#e8e7d9'),muted:value('--ink2','#a0ad9f'),line:value('--line','#435548'),accent:value('--sel','#c7acee'),mint:value('--mint',value('--ink2','#a0ad9f')),display:value('--display','sans-serif'),body:value('--body','sans-serif'),mono:value('--mono','monospace')};
    var tall=shape==='story',W=1080,H=tall?1920:1080;canvas.width=W;canvas.height=H;
    var ctx=canvas.getContext('2d'),result=model(),graph=shareGraph(result),original=points();
    var identity=state.profile&&state.profile.wardrobeIdentity,site=String(identity&&identity.name||'').replace(/[\r\n\t]+/g,' ').trim().slice(0,100)||'Closet Lint';
    function font(size,family,weight){ctx.font=(weight?weight+' ':'')+size+'px '+family}
    function wrap(text,size,family,width,weight){font(size,family,weight);var lines=[''];Array.from(String(text)).forEach(function(char){var i=lines.length-1,next=lines[i]+char;if(ctx.measureText(next).width>width&&lines[i]){var split=lines[i].lastIndexOf(' ');if(split>0){var rest=lines[i].slice(split+1);lines[i]=lines[i].slice(0,split);lines.push(rest+char)}else lines.push(char)}else lines[i]=next});return lines.map(function(line){return line.trim()}).filter(Boolean)}
    function fit(text,size,min,family,width,maxLines,weight){var lines=wrap(text,size,family,width,weight);while(lines.length>maxLines&&size>min){size-=1;lines=wrap(text,size,family,width,weight)}return {lines:lines,size:size}}
    function text(text,x,y,size,family,color,align,weight){font(size,family,weight);ctx.textAlign=align||'left';ctx.fillStyle=color;ctx.fillText(text,x,y)}
    function line(x1,y1,x2,y2,color,alpha,width,dash){ctx.strokeStyle=color;ctx.globalAlpha=alpha==null?1:alpha;ctx.lineWidth=width||1;ctx.setLineDash(dash||[]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=1;ctx.setLineDash([])}
    function circle(x,y,r,color,alpha,dash){ctx.strokeStyle=color;ctx.globalAlpha=alpha==null?1:alpha;ctx.setLineDash(dash||[]);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.setLineDash([])}
    function sparkle(x,y,size,color,glow){ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=glow||0;ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size*.17,y-size*.17);ctx.lineTo(x+size,y);ctx.lineTo(x+size*.17,y+size*.17);ctx.lineTo(x,y+size);ctx.lineTo(x-size*.17,y+size*.17);ctx.lineTo(x-size,y);ctx.lineTo(x-size*.17,y-size*.17);ctx.closePath();ctx.fill();ctx.shadowBlur=0}
    ctx.fillStyle=theme.background;ctx.fillRect(0,0,W,H);
    for(var n=0;n<140;n++){ctx.globalAlpha=.2+(n%4)*.1;ctx.fillStyle=theme.muted;ctx.fillRect(24+(n*137)%1032,20+(n*191)%(H-40),n%7?1:2,n%7?1:2)}ctx.globalAlpha=1;
    [28,39].forEach(function(inset,i){var alpha=i?.24:.5;line(inset,inset,W-inset,inset,theme.line,alpha);line(W-inset,inset,W-inset,H-inset,theme.line,alpha);line(W-inset,H-inset,inset,H-inset,theme.line,alpha);line(inset,H-inset,inset,inset,theme.line,alpha)});
    [[28,28],[W-28,28],[28,H-28],[W-28,H-28]].forEach(function(p){sparkle(p[0],p[1],11,theme.accent)});
    var titleX=tall?540:72,align=tall?'center':'left',siteFit=fit(site,26,14,theme.mono,tall?900:936,1),siteY=tall?125:90;
    var siteLabel=site;while(wrap(siteLabel,siteFit.size,theme.mono,tall?900:936).length>1&&siteLabel.length>1)siteLabel=siteLabel.slice(0,-2).trimEnd()+'…';text(siteLabel,titleX,siteY,siteFit.size,theme.mono,theme.mint,align);
    var titleY=tall?220:166;text('My Style Sky',titleX,titleY,tall?68:58,theme.display,theme.accent,align,'500');
    var day=cacheDay||todayStr(),date=new Date(day+'T12:00:00Z'),dateText=date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
    text('CHARTED · '+dateText,titleX,tall?300:232,26,theme.mono,theme.muted,align);
    var center={x:tall?540:340,y:tall?720:542},radius=tall?350:270;
    if(ctx.createRadialGradient){var glow=ctx.createRadialGradient(center.x,center.y,0,center.x,center.y,radius);glow.addColorStop(0,theme.accent);glow.addColorStop(1,theme.background);ctx.globalAlpha=.07;ctx.fillStyle=glow;ctx.beginPath();ctx.arc(center.x,center.y,radius,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
    [1,.975,.58].forEach(function(k,i){circle(center.x,center.y,radius*k,theme.line,i===2?.4:.65,i===2?[2,5]:[])});
    for(var tick=0;tick<72;tick++){var a=tick*Math.PI/36,outer=radius-4,inner=radius-(tick%6?10:19);line(center.x+Math.cos(a)*inner,center.y+Math.sin(a)*inner,center.x+Math.cos(a)*outer,center.y+Math.sin(a)*outer,theme.muted,.55)}
    [[0,-1],[1,0],[0,1],[-1,0]].forEach(function(d){var x=center.x+d[0]*radius,y=center.y+d[1]*radius;ctx.fillStyle=theme.accent;ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x+8,y);ctx.lineTo(x,y+8);ctx.lineTo(x-8,y);ctx.closePath();ctx.fill()});
    var extent=Math.max(300,...graph.stars.map(function(s){return Math.hypot(original[s.id].x-590,original[s.id].y-390)})),scale=radius*.78/extent,map={};
    catalog().stars.forEach(function(s){map[s.id]={x:center.x+(original[s.id].x-590)*scale,y:center.y+(original[s.id].y-390)*scale}});
    graph.backgroundEdges.forEach(function(pair){var a=map[pair[0]],b=map[pair[1]];line(a.x,a.y,b.x,b.y,theme.muted,.3,1)});
    graph.supportEdges.forEach(function(pair){var a=map[pair[0]],b=map[pair[1]];line(a.x,a.y,b.x,b.y,theme.accent,.5,1,[3,4])});
    graph.edges.forEach(function(pair){var a=map[pair[0]],b=map[pair[1]];line(a.x,a.y,b.x,b.y,theme.accent,.95,2.3)});
    var primary=new Set();graph.groups.forEach(function(g){g.members.forEach(function(id){primary.add(id)})});
    graph.stars.forEach(function(s){var p=map[s.id],main=primary.has(s.id);sparkle(p.x,p.y,main?(tall?15:12):5,theme.ink,main?15:3)});
    // Name badges use real chart anchors, with measured collision avoidance.
    var boxes=[],starBoxes=graph.stars.map(function(s){return {x:map[s.id].x-15,y:map[s.id].y-15,w:30,h:30}});
    function overlap(a,b){return Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y))}
    graph.groups.forEach(function(g){
      var size=30,label=g.name,iconWidth=g.keys.length*34;
      var fitted=fit(label,size,24,theme.mono,radius*1.55-iconWidth,1);size=fitted.size;font(size,theme.mono);var width=ctx.measureText(label).width+26+iconWidth,height=size+23;
      var anchor=g.members.reduce(function(a,id){return {x:a.x+map[id].x/g.members.length,y:a.y+map[id].y/g.members.length}},{x:0,y:0}),best=null;
      [30,-45,62,-78,100,-116,140,-150,180,-190].forEach(function(dy){[-.5,0,-1].forEach(function(side){var x=Math.max(center.x-radius+14,Math.min(center.x+radius-width-14,anchor.x+side*width)),y=Math.max(center.y-radius+35,Math.min(center.y+radius-height-35,anchor.y+dy));var b={x:x,y:y,w:width,h:height},penalty=boxes.concat(starBoxes).reduce(function(sum,p){return sum+overlap(b,p)*100},0)+Math.abs(dy);var corners=[[x,y],[x+width,y],[x,y+height],[x+width,y+height]];corners.forEach(function(p){penalty+=Math.max(0,Math.hypot(p[0]-center.x,p[1]-center.y)-(radius-10))*10000});if(!best||penalty<best.penalty)best={box:b,penalty:penalty}})});
      var b=best.box;boxes.push(b);ctx.fillStyle=theme.background;ctx.strokeStyle=theme.accent;ctx.globalAlpha=.88;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(b.x,b.y,b.w,b.h,b.h/2);else ctx.rect(b.x,b.y,b.w,b.h);ctx.fill();ctx.lineWidth=.7;ctx.stroke();ctx.globalAlpha=1;g.keys.forEach(function(k,i){ClosetLintIcons.draw(ctx,symbols[k],b.x+13+i*34,b.y+(height-26)/2,26,theme.ink)});text(label,b.x+13+iconWidth,b.y+size+4,size,theme.mono,theme.ink);
    });
    var x=tall?130:664,width=tall?820:346,top=tall?1110:258,rowLimit=tall?510:505;
    function rowsAt(factor){return ['sun','moon','rising'].map(function(key){
      var sign=result.readings[key].sign,info=signInfo(sign),available=width-(tall?100:70),name=fit(sign.name,(tall?43:30)*factor,18,theme.display,available,2,'500');
      var label=key.toUpperCase()+(sign.kind==='empty'?'':' · '+(info.type==='Style star'?'STAR':'CONSTELLATION')),labelSize=fit(label,(tall?27:24)*factor,14,theme.mono,available,1).size;
      var note=info.estimate?'Estimated from what you own':sign.kind==='empty'?'Nothing to chart yet':sign.emerging?'Early reading':'',noteSize=Math.max(22,(tall?26:24)*factor),noteLines=note?wrap(note,noteSize,theme.body,available):[];
      var nameTop=labelSize+18*factor,nameHeight=name.lines.length*(name.size+8*factor),notesTop=nameTop+nameHeight+10*factor;
      return {key:key,sign:sign,info:info,label:label,labelSize:labelSize,name:name,nameTop:nameTop,notesTop:notesTop,note:noteLines,noteSize:noteSize,height:notesTop+(info.estimate?36*factor:0)+noteLines.length*(noteSize+8*factor)+28*factor,factor:factor};
    })}
    var factor=1,rows=rowsAt(factor);while(rows.reduce(function(n,r){return n+r.height},0)>rowLimit&&factor>.65){factor-=.025;rows=rowsAt(factor)}
    var y=top;rows.forEach(function(row,i){var f=row.factor,labelX=x+(tall?100:70),iconX=x+(tall?32:26),iconY=y+(row.labelSize+row.nameTop+row.name.size)/2,r=(tall?30:25)*f;
      circle(iconX,iconY,r,theme.accent,1,row.info.estimate?[2,3]:[]);ClosetLintIcons.draw(ctx,symbols[row.key],iconX-16*f,iconY-16*f,32*f,theme.accent);
      text(row.label,labelX,y+row.labelSize,row.labelSize,theme.mono,theme.muted);
      var next=y+row.nameTop+row.name.size;row.name.lines.forEach(function(s){text(s,labelX,next,row.name.size,theme.display,row.sign.kind==='empty'?theme.muted:theme.accent,'left','500');next+=row.name.size+8*f});
      next=y+row.notesTop;
      if(row.info.estimate){text('PROVISIONAL',labelX,next+24*f,24*f,theme.mono,theme.mint);next+=36*f}
      row.note.forEach(function(s){text(s,labelX,next+row.noteSize,row.noteSize,theme.body,theme.muted);next+=row.noteSize+8*f});
      y+=row.height;if(i<2)line(x,y-14*f,x+width,y-14*f,theme.line,.45);
    });
    var summaryY=tall?Math.max(1570,y+64):Math.max(695,y+48),summaryWidth=tall?910:346,summaryX=tall?540:664;
    var maxSummaryHeight=(tall?1770:914)-summaryY,summary=fit(shareSentence(result),tall?43:33,20,theme.body,summaryWidth,Math.max(2,Math.floor(maxSummaryHeight/(tall?49:39))));
    line(tall?404:664,summaryY-36,tall?500:724,summaryY-36,theme.line,.6);line(tall?580:766,summaryY-36,tall?676:826,summaryY-36,theme.line,.6);sparkle(tall?540:745,summaryY-36,6,theme.accent);
    summary.lines.forEach(function(s,i){font(summary.size,theme.body);ctx.font='italic '+ctx.font;ctx.textAlign=tall?'center':'left';ctx.fillStyle=theme.ink;ctx.fillText(s,summaryX,summaryY+i*(summary.size+7))});
    var footerParts=[['WHAT YOU ','OWN','sun'],['WHAT YOU ','WANT','moon'],['WHAT YOU ','WEAR','rising']],footerSize=tall?28:26,footerGap=32;
    function footerWidth(){return footerParts.reduce(function(sum,part){font(footerSize,theme.mono);var prefix=ctx.measureText(part[0]).width;font(footerSize,theme.mono,'700');return sum+footerSize+10+prefix+ctx.measureText(part[1]).width},footerGap*2)}
    while(footerWidth()>940&&footerSize>18)footerSize--;
    var footerX=(W-footerWidth())/2,footerY=tall?1780:944;
    footerParts.forEach(function(part){ClosetLintIcons.draw(ctx,part[2],footerX,footerY-footerSize*.85,footerSize,theme.muted);footerX+=footerSize+10;text(part[0],footerX,footerY,footerSize,theme.mono,theme.muted);font(footerSize,theme.mono);footerX+=ctx.measureText(part[0]).width;text(part[1],footerX,footerY,footerSize,theme.mono,theme.muted,'left','700');font(footerSize,theme.mono,'700');footerX+=ctx.measureText(part[1]).width+footerGap});
    text('closetlint.com',540,H-55,tall?32:29,theme.mono,theme.accent,'center');
    canvas.setAttribute('aria-label',site+' · My Style Sky. '+['sun','moon','rising'].map(function(k){var s=result.readings[k].sign;return cap(k)+': '+s.name+', '+signInfo(s).label}).join('. '));
    return {theme:theme,site:site,sentence:shareSentence(result),graph:graph};
  }
  function openShare(){
    var d=el('dialog',{class:'sky-share','aria-label':'Share my sky'}),shape='square',canvas=el('canvas',{'aria-label':'Preview of your three sky signs'}),status=el('p',{class:'fine','aria-live':'polite'}),exporting=false,fontsReady=!(document.fonts&&document.fonts.load);
    function shareTheme(){
      var styles=getComputedStyle(document.documentElement);
      function value(key,fallback){return styles.getPropertyValue(key).trim()||fallback}
      return {background:value('--bg','#f4efdf'),ink:value('--ink','#343e36'),muted:value('--ink2','#647166'),line:value('--line','#b9bdae'),accent:value('--sel','#68557f'),display:value('--display','sans-serif'),body:value('--body','sans-serif'),mono:value('--mono',"'IBM Plex Mono',monospace")};
    }
    function draw(){return drawShare(canvas,shape)}
    var modesBox=el('div',{class:'sky-modes sky-share-modes',role:'group','aria-label':'Share image layout'});['square','story'].forEach(function(k){var b=button(cap(k),function(){shape=k;Array.from(modesBox.children).forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});draw()});b.textContent='';b.appendChild(ClosetLintIcons.node(k));b.appendChild(el('span',{text:cap(k)}));b.setAttribute('aria-pressed',k===shape?'true':'false');modesBox.appendChild(b)});
    d.appendChild(el('div',{class:'sky-heading'},heading('Share my sky'),button('Close',function(){d.close()})));d.appendChild(el('p',{text:'Your closet name and three signs, with a simplified chart of your sky.'}));d.appendChild(modesBox);d.appendChild(canvas);d.appendChild(status);
    function updateActions(){Array.from(d.querySelector('.sky-detail-actions').children).forEach(function(b){b.disabled=exporting||!fontsReady})}
    function exportImage(action,failure){
      if(exporting||!fontsReady)return;exporting=true;status.textContent='';updateActions();var exportShape=shape;
      function finish(){exporting=false;updateActions()}
      function failed(error){if(!error||error.name!=='AbortError')status.textContent=failure;finish()}
      try{canvas.toBlob(function(blob){
        if(!d.open){finish();return}
        if(!blob){status.textContent='The image could not be created. Please try again.';finish();return}
        try{Promise.resolve(action(blob,exportShape)).then(finish,failed)}catch(error){failed(error)}
      },'image/png')}catch(error){status.textContent='The image could not be created. Please try again.';finish()}
    }
    d.appendChild(el('div',{class:'sky-detail-actions'},button('Save image',function(){exportImage(function(blob,exportShape){
      var url=URL.createObjectURL(blob),a=el('a',{href:url,download:'closet-lint-my-sky-'+exportShape+'.png'});
      try{document.body.appendChild(a);a.click()}finally{a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000)}
    },'The image could not be saved. Please try again.')})));
    if(navigator.share&&navigator.canShare)d.querySelector('.sky-detail-actions').appendChild(button('Share',function(){exportImage(function(blob){
      var file=new File([blob],'closet-lint-my-sky.png',{type:'image/png'});
      if(!navigator.canShare({files:[file]})){status.textContent='Use Save image to share this snapshot.';return}
      return navigator.share({files:[file],title:'My Style Sky'});
    },'Sharing did not finish. You can save the image instead.')}));
    d.addEventListener('close',function(){d.remove()});document.body.appendChild(d);d.showModal();draw();
    // Render once more with the actual theme fonts before enabling image export.
    if(document.fonts&&document.fonts.load){
      var theme=shareTheme();updateActions();
      Promise.all(['500 46px '+theme.display,'22px '+theme.mono,'20px '+theme.body].map(function(font){return document.fonts.load(font)})).catch(function(){/* The browser's fallback fonts remain usable offline. */}).then(function(){fontsReady=true;if(d.open){draw();updateActions()}});
    }
  }
  return {render:render,invalidate:invalidate,model:model,openFull:openFull,openDetail:openDetail,notice:notice,lineChoices:lineChoices,points:points,shareGraph:shareGraph,shareSentence:shareSentence,drawShare:drawShare,signInfo:signInfo,layoutLabels:layoutLabels};
})();
function skyRender(){ClosetLintSkyUI.render()}
