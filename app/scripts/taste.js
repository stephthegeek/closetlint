function labFeatName(f){
  var p=f.split(':'),k=p[0],x=p.slice(1).join(':');
  if(k==='c')return colLabel(x)+' pieces';
  if(k==='cp')return x.split('+').map(colLabel).join(' with ');
  if(k==='st')return x.split('+').join(' with ')+' statement';
  if(k==='l')return cap(x)+' looks';
  if(k==='lay')return x==='y'?'Layered outfits':'Outfits without a layer';
  if(k==='kind')return x==='one'?'Dresses and jumpsuits':'Top and bottom outfits';
  return '';
}
/* Rebuild from current pieces and ratings. One combination counts once, even
   when older imports contain duplicate rating records or repeated piece IDs. */
function labRatingEntries(map){
  map=map||byId();var unique=new Map(),R=state.ratings||{};
  Object.keys(R).forEach(function(key){
    var record=R[key];
    if(!record||[1,0,-1].indexOf(record.r)<0||!Array.isArray(record.ids)||!record.ids.length)return;
    var ids=Array.from(new Set(record.ids)),outfit=labOutfitFromIds(ids,map);
    if(!outfit||labParts(outfit).length!==ids.length)return;
    var signature=JSON.stringify(ids.slice().sort()),previous=unique.get(signature);
    if(previous&&(Number(previous.record.t)||0)>(Number(record.t)||0))return;
    unique.set(signature,{key:key,record:record,outfit:outfit,features:labFeat(outfit)});
  });
  return Array.from(unique.values()).sort(function(a,b){return (Number(b.record.t)||0)-(Number(a.record.t)||0)||a.key.localeCompare(b.key)});
}
function labRatingSummary(stats){
  var words=[];
  [['loved','loved'],['liked','liked'],['passed','passed']].forEach(function(pair){if(stats[pair[0]])words.push(stats[pair[0]]+' '+pair[1])});
  return words.join(' · ');
}
function labTastePatterns(stats,positive){
  return Object.keys(stats).filter(function(f){
    var x=stats[f],matches=positive?x.loved+x.liked:x.passed;
    return x.n>=3&&f.indexOf('p:')!==0&&labFeatName(f)&&matches/x.n>=2/3;
  }).sort(function(a,b){
    var x=stats[a],y=stats[b],xp=positive?x.loved+x.liked:x.passed,yp=positive?y.loved+y.liked:y.passed;
    return yp/y.n-xp/x.n||y.n-x.n||a.localeCompare(b);
  }).slice(0,6);
}
var _labTasteEvidenceRefresh=null;
function labTasteExamples(feature,launcher){
  var d=el('dialog',{class:'taste-examples','aria-labelledby':'taste-example-title'}),page=0;
  function close(){d.close()}
  d.addEventListener('close',function(){
    if(_labTasteEvidenceRefresh===refresh)_labTasteEvidenceRefresh=null;
    d.remove();if(launcher&&launcher.isConnected)launcher.focus({preventScroll:true});
    else {var heading=$('view-lab').querySelector('h2');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true})}}
  });
  function draw(){
    var map=byId(),entries=labRatingEntries(map).filter(function(e){return e.features.indexOf(feature)>=0});
    page=Math.min(page,Math.max(0,Math.ceil(entries.length/4)-1));d.textContent='';
    var title=feature.indexOf('p:')===0?(map[feature.slice(2)]||{}).name:labFeatName(feature);
    d.appendChild(el('div',{class:'taste-example-head'},el('h2',{id:'taste-example-title',text:title||'Rated outfits'}),el('button',{class:'btn',type:'button',text:'Close',onclick:close})));
    d.appendChild(el('p',{class:'fine',text:'Your ratings for these combinations. Photos and tags reflect your closet now.'}));
    if(!entries.length)d.appendChild(el('p',{text:'No current outfits match this pattern.'}));
    entries.slice(page*4,page*4+4).forEach(function(entry){
      var o=entry.outfit;labAccRestore(o,entry.record,map);
      var row=el('article',{class:'taste-example'}),g=el('div',{class:'taste-outfit-grid'});
      row.appendChild(el('h3',{text:entry.record.r===1?'Loved':entry.record.r===0?'Liked':'Passed'}));
      var ids=new Set();labParts(o).concat(labAccParts(o)).forEach(function(p){if(!ids.has(p.id)){ids.add(p.id);g.appendChild(labTile(p,catLabel(p)))}});row.appendChild(g);
      var available=state.fantasy||!labParts(o).some(function(p){return p.wish||p.stored});
      var open=el('button',{class:'btn',type:'button',text:'Open in Lab',disabled:!available,onclick:function(){
        o.sig=entry.key;try{o.base=labBase(o);o.taste=labTaste(o)}catch(e){}
        state.lab.mode='rate';state.lab.cur=o;close();labRender();window.scrollTo(0,0);
      }});row.appendChild(open);
      if(!available)row.appendChild(el('p',{class:'fine',text:'Turn on Fantasy mode to open outfits with wishlist or stored pieces.'}));
      d.appendChild(row);
    });
    var status=entries.length?'Showing '+(page*4+1)+'–'+Math.min((page+1)*4,entries.length)+' of '+entries.length+' outfits':'0 outfits';
    var count=el('p',{class:'fine',role:'status',tabindex:'-1',text:status});d.appendChild(count);
    function change(delta){page+=delta;draw();d.scrollTop=0;var status=d.querySelector('[role=status]');if(status)status.focus({preventScroll:true})}
    if(entries.length>4)d.appendChild(el('nav',{class:'taste-pagination','aria-label':'Rated outfit pages'},
      el('button',{class:'btn',type:'button',text:'Previous',disabled:page===0,onclick:function(){change(-1)}}),
      el('button',{class:'btn',type:'button',text:'Next',disabled:(page+1)*4>=entries.length,onclick:function(){change(1)}})));
  }
  function refresh(){
    if(!d.open)return;var scroll=d.scrollTop,focused=d.contains(document.activeElement);
    draw();d.scrollTop=scroll;
    if(focused){var title=d.querySelector('h2');title.setAttribute('tabindex','-1');title.focus({preventScroll:true})}
  }
  _labTasteEvidenceRefresh=refresh;document.body.appendChild(d);draw();d.showModal();
}
function labTasteEvidenceButton(feature,count){
  var button=el('button',{class:'btn',type:'button',text:'See '+count+' rated outfits',onclick:function(){labTasteExamples(feature,button)}});
  return button;
}
function labTasteView(v){
  var map=byId(),entries=labRatingEntries(map),stats=labStats(entries),n=entries.length;
  v.appendChild(el('p',{class:'taste-intro fine',text:'Patterns from '+n+' rated outfits, using your pieces’ current tags. Each outfit counts once per pattern. Accessories appear in the examples but do not drive these patterns.'}));
  if(n<8){v.appendChild(el('p',{class:'labempty',text:'Rate a few more outfits to start spotting patterns. Aim for at least 8; so far: '+n+'.'}));labBlocksBox(v);return}
  function patterns(title,positive){
    var section=el('section',{class:'tastebox taste-section'},el('h3',{text:title})),grid=el('div',{class:'taste-patterns'}),features=labTastePatterns(stats,positive);
    if(!positive)section.appendChild(el('p',{class:'fine',text:'A pass is about the whole combination. These patterns do not mean you dislike every piece, color, or style in it.'}));
    if(!features.length)section.appendChild(el('p',{class:'fine',text:'No clear pattern yet. Keep rating a mix of outfits.'}));
    features.forEach(function(f){
      var x=stats[f],card=el('article',{class:'taste-pattern'},el('h4',{text:labFeatName(f)}));
      if(f.indexOf('c:')===0||f.indexOf('cp:')===0){
        var swatches=el('div',{class:'taste-swatches'});
        f.slice(f.indexOf(':')+1).split('+').forEach(function(color){var swatch=el('span',{class:'taste-color',text:colLabel(color)}),dot=el('span',{class:'taste-color-dot','aria-hidden':'true'});dot.style.background=COLORS[color]||color;swatch.prepend(dot);swatches.appendChild(swatch)});card.appendChild(swatches);
      }
      card.appendChild(el('p',{class:'taste-counts',text:labRatingSummary(x)}));
      if(x.n<6)card.appendChild(el('p',{class:'fine',text:'Early pattern · '+x.n+' outfits'}));
      card.appendChild(labTasteEvidenceButton(f,x.n));grid.appendChild(card);
    });
    section.appendChild(grid);v.appendChild(section);
  }
  patterns('What’s working for you',true);
  var pieces=Object.keys(stats).filter(function(f){return f.indexOf('p:')===0&&stats[f].loved>=2}).sort(function(a,b){return stats[b].loved-stats[a].loved||stats[b].n-stats[a].n||a.localeCompare(b)}).slice(0,6);
  if(pieces.length){
    var section=el('section',{class:'tastebox taste-section'},el('h3',{text:'Pieces you keep loving'})),grid=el('div',{class:'taste-pieces'});
    pieces.forEach(function(f){var p=map[f.slice(2)],x=stats[f],card=el('article',{class:'taste-piece'},labTile(p,catLabel(p)),el('p',{class:'taste-counts',text:labRatingSummary(x)}),labTasteEvidenceButton(f,x.n));grid.appendChild(card)});
    section.appendChild(grid);v.appendChild(section);
  }
  patterns('Patterns in outfits you passed on',false);labBlocksBox(v);
}
