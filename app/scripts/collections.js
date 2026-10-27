/* Named piece groups. Stored as individual profile documents, included in full backups. */
function collectionIds(ids){return Array.from(new Set((ids||[]).filter(function(id){return typeof id==='string'&&id.length<240})));}
function collectionList(){return Object.keys(state.profile||{}).filter(function(k){return k.indexOf('collection-')===0&&state.profile[k].kind==='piece-collection'&&!state.profile[k].deleted}).map(function(k){return Object.assign({},state.profile[k],{id:k})}).sort(function(a,b){return a.name.localeCompare(b.name)});}
function collectionMatches(id,selected,groups){var chosen=Object.keys(selected||{}).filter(function(k){return selected[k]});return !chosen.length||groups.some(function(c){return chosen.indexOf(c.id)>=0&&(c.ids||[]).indexOf(id)>=0});}
function collectionSave(id,data){
  if(!state.db)return Promise.reject(Error('Connect wardrobe storage first.'));
  var name=String(data.name||'').trim().slice(0,100);if(!name)return Promise.reject(Error('Give your collection a name.'));
  var key=id||'collection-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  var record={kind:'piece-collection',name:name,description:String(data.description||'').trim().slice(0,1000),ids:collectionIds(data.ids),deleted:!!data.deleted};
  return state.db.collection('profile').doc(key).set(record).then(function(){state.profile[key]=record;if(record.deleted&&state.collectionFilter)delete state.collectionFilter[key];renderFilters();if(isClosetTab(state.tab))renderGrid();return key});
}
function collectionFilterGroup(){
  var box=el('section',{class:'collection-filter'},el('h3',{text:'Collections'})),row=el('div',{class:'chips'});state.collectionFilter=state.collectionFilter||{};
  var groups=collectionList();groups.forEach(function(c,i){if(i>=5&&!state.collectionsExpanded&&!state.collectionFilter[c.id])return;row.appendChild(chip(c.name,!!state.collectionFilter[c.id],function(){state.collectionManager=false;state.collectionFilter[c.id]=!state.collectionFilter[c.id];renderFilters();renderGrid()},null,el('span',{class:'n',text:String(c.ids.length)})))});
  if(groups.length>5)row.appendChild(el('button',{class:'btn small',type:'button',text:state.collectionsExpanded?'Show fewer':'Show all ('+groups.length+')',onclick:function(){state.collectionsExpanded=!state.collectionsExpanded;renderFilters()}}));
  box.append(row,el('button',{class:'btn small',type:'button',text:'📚 Manage collections',onclick:function(){openCollections()}}));return box;
}
function collectionBrowse(c){
  $('collections-dialog').close();
  function go(){state.collectionManager=false;setTab('all');resetFilterState();state.collectionFilter={};state.collectionFilter[c.id]=true;state.wishOnly=false;setFantasy(true);renderFilters();renderGrid()}
  if(state.tab==='trip'&&state.trip)tripLeave(go);else go();
}
function collectionToBoard(c){
  var map=byId(),ids=collectionIds(c.ids).filter(function(id){return map[id]&&!onBoard(id)});
  if(state.board.lay&&state.board.pieces.length+ids.length>COLL_MAX){toast('This collage holds '+COLL_MAX+' pieces. Switch the board to free layout first, then add the collection.');return;}
  function go(){state.collRep=null;ids.forEach(function(id){addPiece(map[id])});$('collections-dialog').close();setTab('outfits');toast(ids.length+' pieces added. Existing board pieces stayed put.');}
  if(state.tab==='trip'&&state.trip)tripLeave(go);else go();
}
function collectionTripIds(T,P,V){
  var ids=Object.keys(V.items).concat(V.outer.map(function(p){return p.id}),V.shoes.map(function(s){return s.it.id}),(P.other||[]).map(function(p){return p.id}),T.packedExtras||[]);
  Object.keys(V.basics).forEach(function(k){ids=ids.concat(V.basics[k].items.map(function(p){return p.id}))});return collectionIds(ids);
}
function collectionAddToTrip(c,T){T.packedExtras=collectionIds((T.packedExtras||[]).concat(c.ids));$('collections-dialog').close();tripRender();toast('Added to your packing extras. Save the trip to keep them.');}
function addPieceToCollection(it){
  function done(id,created){var c=collectionList().find(function(c){return c.id===id});$('collections-dialog').close();toast(created?'Created “'+(c?c.name:'collection')+'” with this piece.':'Added to “'+(c?c.name:'collection')+'”.')}
  openCollections(function(c){
    var current=collectionList().find(function(x){return x.id===c.id});if(!current){toast('That collection is no longer available.');return Promise.resolve(false)}
    if(current.ids.indexOf(it.id)>=0){done(c.id,false);return Promise.resolve(true)}
    return collectionSave(c.id,Object.assign({},current,{ids:current.ids.concat(it.id)})).then(function(){done(c.id,false);return true}).catch(function(e){toast(e.message||'Could not add this piece. Try again.');return false});
  },{title:'Add to collection',description:'',initialIds:[it.id],chooseLabel:'Add here',onCreated:function(id){done(id,true)}});
}
function openCollections(pick,options){
  options=options||{};
  if(!pick){$('collections-dialog').close();function go(){setTab('all');state.collectionManager=true;renderGrid()};if(state.tab==='trip'&&state.trip)tripLeave(go);else go();return;}
  var d=$('collections-dialog');d.oncancel=null;d.textContent='';var box=el('div',{class:'collections-shell'});
  box.appendChild(el('header',{class:'collection-head'},el('h2',{text:options.title||(pick?'Choose a collection':'Collections')}),el('button',{class:'btn',type:'button',text:'Close',onclick:function(){d.close()}})));
  var description=options.description===undefined?'Copies the pieces once. Later membership edits stay independent.':options.description;if(description)box.appendChild(el('p',{class:'fine',text:description}));
  box.appendChild(el('button',{class:'btn primary collection-create',type:'button',text:'＋ New collection',onclick:function(){editCollection(null,options.initialIds||[],function(id){if(options.onCreated)options.onCreated(id);else if(pick)pick(collectionList().find(function(c){return c.id===id}));else showCollection(id)})}}));
  var map=byId(),groups=collectionList(),grid=el('div',{class:'collection-list'});
  groups.forEach(function(c){var tile=el('article',{class:'collection-summary'}),thumbs=el('div',{class:'collection-thumbs'});
    c.ids.map(function(id){return map[id]}).filter(Boolean).slice(0,4).forEach(function(it){thumbs.appendChild(el('img',{src:photoThumbnail(it.photo),alt:'',loading:'lazy',decoding:'async'}))});
    tile.append(thumbs,el('h3',{text:c.name}),el('p',{class:'fine',text:c.ids.length+(c.ids.length===1?' piece':' pieces')+(c.description?' · '+c.description:'')}),el('button',{class:'btn',type:'button',text:options.initialIds&&options.initialIds.length&&options.initialIds.every(function(id){return c.ids.indexOf(id)>=0})?'Already added':options.chooseLabel||(pick?'Choose collection':'Open collection'),disabled:!!(options.initialIds&&options.initialIds.length&&options.initialIds.every(function(id){return c.ids.indexOf(id)>=0})),onclick:function(e){var result=pick?pick(c):showCollection(c.id);if(result&&typeof result.then==='function'){var b=e.currentTarget;b.disabled=true;Promise.resolve(result).finally(function(){if(b.isConnected)b.disabled=false})}}}));grid.appendChild(tile);
  });
  if(!groups.length)grid.appendChild(el('p',{text:'No collections yet. Gather a few pieces and give the pile a name.'}));box.appendChild(grid);d.appendChild(box);if(!d.open)d.showModal();
}
function showCollection(id){var c=collectionList().find(function(x){return x.id===id});if(c)collectionBrowse(c);else openCollections();}
function collectionContext(count){
  var top=$('collection-context'),bottom=$('collection-context-bottom');if(!top||!bottom)return;
  top.textContent='';bottom.textContent='';$('grid').hidden=!!state.collectionManager;
  $('view-closet').classList.toggle('collections-overview',!!state.collectionManager);
  if(state.collectionManager){
    var head=el('div',{class:'collection-actions'},el('h2',{text:'Collections'}),el('button',{class:'btn',type:'button',text:'＋ New collection',onclick:function(){editCollection(null,[])}}));top.appendChild(head);
    var list=el('div',{class:'collection-list'}),map=byId();collectionList().forEach(function(c){var row=el('article',{class:'collection-summary'}),thumbs=el('div',{class:'collection-thumbs'});c.ids.slice(0,4).forEach(function(id){if(map[id])thumbs.appendChild(el('img',{src:photoThumbnail(map[id].photo),alt:'',loading:'lazy',decoding:'async'}))});row.append(routeAnchor({type:'collections',id:c.id},{class:'collection-card-link'},function(){collectionBrowse(c)},[thumbs,el('h3',{text:c.name}),el('p',{text:c.description}),el('span',{class:'fine',text:c.ids.length+' pieces'})]));list.appendChild(row)});top.appendChild(list);return;
  }
  var groups=collectionList().filter(function(c){return state.collectionFilter&&state.collectionFilter[c.id]});if(!groups.length)return;
  var merged={name:groups.map(function(c){return c.name}).join(' + '),ids:collectionIds(groups.flatMap(function(c){return c.ids}))};
  top.appendChild(el('h2',{text:merged.name}));if(groups.length===1&&groups[0].description)top.appendChild(el('p',{class:'fine',text:groups[0].description}));
  function actions(){
    var row=el('div',{class:'collection-actions'});
    if(groups.length===1)row.appendChild(el('button',{class:'btn',type:'button',text:'Edit collection',onclick:function(){editCollection(groups[0])}}));
    row.appendChild(el('button',{class:'btn',type:'button',text:'Add all to board',onclick:function(){collectionToBoard(merged)}}));
    row.appendChild(el('button',{class:'btn',type:'button',text:'🔮 Ask questions',onclick:function(){openOracle(groups.length===1?{collection:groups[0].id}:{ids:merged.ids})}}));
    if(state.trip)row.appendChild(el('button',{class:'btn',type:'button',text:'Add to packing extras',onclick:function(){collectionAddToTrip(merged,state.trip)}}));return row;
  }
  top.appendChild(actions());if(count>12)bottom.appendChild(actions());
}
function editCollection(c,initial,onSaved){
  var d=$('collections-dialog'),draft={name:c?c.name:'',description:c?c.description:'',ids:collectionIds(c?c.ids:initial)},box=el('div',{class:'collections-shell collection-editor'}),body=el('div',{class:'collection-editor-body'}),saving=false;
  function cancel(){if(saving)return;if(window.ClosetLintRoutes)window.ClosetLintRoutes.closeTrackedDialog(d);else if(signature()===baseline||window.confirm('Discard the unsaved changes to this collection?'))d.close()}
  d.textContent='';d.oncancel=function(e){e.preventDefault();cancel()};
  box.appendChild(el('header',{class:'collection-head collection-editor-head'},el('h2',{text:c?'Edit collection':'New collection'}),el('button',{class:'btn',type:'button',text:'Close','aria-label':'Close collection editor',onclick:cancel})));
  var name=el('input',{type:'text',maxlength:'100',value:draft.name,'aria-label':'Collection name',placeholder:'Like “StephTheGeek’s faves”'}),description=el('textarea',{rows:'3',maxlength:'1000','aria-label':'Collection description'});description.value=draft.description;
  body.append(setupLabel('Name',name),setupLabel('Description (optional)',description));
  var search=el('input',{type:'search','aria-label':'Find pieces for collection',placeholder:'Find pieces by title, tag or store…'}),only=el('input',{type:'checkbox','aria-label':'Show selected pieces only'}),count=el('p',{class:'fine',role:'status'}),grid=el('div',{class:'collection-pieces'}),limit=80;
  body.append(search,el('label',{class:'collection-check'},only,'Show selected pieces only'),count,grid);
  function draw(){grid.textContent='';var term=search.value.trim().toLowerCase(),items=allItems().filter(function(it){return (!only.checked||draft.ids.indexOf(it.id)>=0)&&(!term||searchHay(it).indexOf(term)>=0)});count.textContent=draft.ids.length+' selected · '+items.length+' matching';
    items.slice(0,limit).forEach(function(it){var input=el('input',{type:'checkbox','aria-label':'Include '+it.name});input.checked=draft.ids.indexOf(it.id)>=0;input.addEventListener('change',function(){draft.ids=input.checked?collectionIds(draft.ids.concat(it.id)):draft.ids.filter(function(id){return id!==it.id});count.textContent=draft.ids.length+' selected · '+items.length+' matching'});grid.appendChild(el('label',{class:'collection-piece'},input,el('img',{src:photoThumbnail(it.photo),alt:'',loading:'lazy',decoding:'async'}),el('span',{text:it.name})))});
    if(items.length>limit)grid.appendChild(el('button',{class:'btn',type:'button',text:'Show more pieces',onclick:function(){limit+=80;draw()}}));
  }
  search.addEventListener('input',function(){limit=80;draw()});only.addEventListener('change',draw);draw();
  var error=el('p',{role:'alert',class:'fine'}),save=el('button',{class:'btn primary',type:'button',text:'Save collection',onclick:function(){if(saving)return;saving=true;save.disabled=true;collectionSave(c&&c.id,{name:name.value,description:description.value,ids:draft.ids}).then(function(id){if(window.ClosetLintRoutes)window.ClosetLintRoutes.cleanDialog(d);if(onSaved){d.close();onSaved(id)}else{showCollection(id);toast('Collection saved. A very good little pile.')}}).catch(function(e){error.textContent=e.message;saving=false;save.disabled=false})}});
  var footer=el('footer',{class:'collection-editor-footer'},error,el('div',{class:'collection-actions'},el('button',{class:'btn',type:'button',text:'Cancel',onclick:cancel}),save));
  if(c)body.appendChild(el('button',{class:'btn',type:'button',text:'Remove collection',onclick:function(){if(saving)return;askConfirm('Remove this collection? The pieces stay in your wardrobe.','Remove collection',function(){collectionSave(c.id,Object.assign({},c,{deleted:true})).then(function(){if(window.ClosetLintRoutes)window.ClosetLintRoutes.cleanDialog(d);openCollections();toastAct('Collection removed.','Undo',function(){collectionSave(c.id,c).then(function(){openCollections()})})}).catch(function(e){error.textContent=e.message})})}}));
  function signature(){return JSON.stringify([name.value,description.value,draft.ids])}var baseline=signature();
  box.append(body,footer);d.appendChild(box);if(!d.open)d.showModal();
  if(window.ClosetLintRoutes)window.ClosetLintRoutes.trackDialog(d,signature,function(){return saving});
}

function collectionTripExtrasEditor(T){
  var box=el('section',{class:'tripcard trip-packing-extras'},el('h3',{text:'Your packing extras'}),el('p',{class:'fine',text:'Bring a whole little pile. These exact pieces stay on the checklist, even if they are not used in a suggested outfit.'})),map=byId(),row=el('div',{class:'chips'});
  (T.packedExtras||[]).forEach(function(id){var it=map[id];row.appendChild(el('span',{class:'chip'},it?it.name:'Unavailable piece',el('button',{class:'viewdel',type:'button',text:'×','aria-label':'Remove packing extra '+(it?it.name:id),onclick:function(){T.packedExtras=T.packedExtras.filter(function(k){return k!==id});tripRender()}})))});
  box.append(row,el('button',{class:'btn',type:'button',text:'📖 Add a collection',onclick:function(){openCollections(function(c){collectionAddToTrip(c,T)})}}));return box;
}
