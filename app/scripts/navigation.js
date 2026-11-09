function assistantHandoffReturnText(path,label){
  var href=window.location&&window.location.href;
  if(!href||!/^https?:/.test(href))return '';
  return '\n\nIn your final reply, include this clickable return link: ['+label+']('+href.split('#')[0].split('?')[0]+'#/'+path+'). Tell me to open it in the same browser and closet where I prepared the request, to resume the saved workspace. This link opens that workspace, not a specific archived batch. If the draft is missing, do not claim it has been restored.';
}
/* Bookmarkable local routes. No wardrobe data or working board is stored in a URL. */
function parseClosetRoute(hash){
  try{
    var raw=String(hash||'').replace(/^#/,''),parts=raw.split('?'),path=parts[0]||'/closet',segments=path.split('/').filter(Boolean),type=segments[0],id=segments.length===2?decodeURIComponent(segments[1]):null;
    if(segments.length===3&&type==='assistant'&&segments[1]==='photos'){var query=new URLSearchParams(parts[1]||''),request=decodeURIComponent(segments[2]),instance=query.get('instance'),workflow=query.get('workflow');return /^[a-zA-Z0-9_-]{1,128}$/.test(request)&&instance&&/^[a-zA-Z0-9_-]{1,128}$/.test(instance)&&['local','file'].includes(workflow)?{type:'assistant',id:request,instance:instance,workflow:workflow}:null}
    if(segments.length===3&&type==='profile'&&segments[1]==='comfort'){var quiz=decodeURIComponent(segments[2]);return /^[a-z][a-z0-9-]{0,63}$/.test(quiz)?{type:'profile',id:'comfort',quiz:quiz}:null}
    if(segments.length>2||id&&(!id.trim()||id.length>512||/[\x00-\x1f\\/]/.test(id)))return null;
    if(['pieces','outfits','collections','trips'].indexOf(type)>=0){if(type==='pieces'&&!id)return null;return {type:type,id:id}}
    if(type==='closet'&&!id){var params=new URLSearchParams(parts[1]||''),category=params.get('category')||'all',color=params.get('color');if((['all','clothing','accessories','jewelry','offduty'].indexOf(category)<0&&!(typeof closetCategoryTab==='function'&&closetCategoryTab(category)))||color&&(typeof COLORS==='undefined'||!Object.prototype.hasOwnProperty.call(COLORS,color)))return null;var route={type:'closet',category:category};if(color)route.color=color;return route}
    if(type==='calendar'&&!id){var month=new URLSearchParams(parts[1]||'').get('month');if(month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return null;return {type:'calendar',month:month||null}}
    if(type==='profile'&&(!id||['almanac','sizes','comfort','settings'].indexOf(id)>=0))return {type:'profile',id:id||null};
    if(type==='sky'&&id==='catalog')return {type:'sky',id:'catalog'};
    if(['board','lab','wishlist-ranking','buy-check','oracle','sky','import','tidy-photos','tidy-details'].indexOf(type)>=0&&!id)return {type:type};
  }catch(e){}return null;
}
function closetRouteHash(route){
  if(route.type==='assistant')return '#/assistant/photos/'+encodeURIComponent(route.id)+'?instance='+encodeURIComponent(route.instance)+'&workflow='+encodeURIComponent(route.workflow);
  if(route.type==='profile'&&route.id==='comfort'&&route.quiz)return '#/profile/comfort/'+encodeURIComponent(route.quiz);
  if(route.type==='closet'&&route.color)return '#/closet?'+(route.category&&route.category!=='all'?'category='+encodeURIComponent(route.category)+'&':'')+'color='+encodeURIComponent(route.color);
  return '#/'+route.type+(route.id?'/'+encodeURIComponent(route.id):'')+(route.type==='closet'&&route.category&&route.category!=='all'?'?category='+encodeURIComponent(route.category):route.type==='calendar'&&route.month?'?month='+encodeURIComponent(route.month):'');
}

function closetRouteHref(route){
  var hash=closetRouteHash(route);
  return typeof PUB!=='undefined'&&PUB&&PUB.skySharePage==='sky.html'?(route.type==='sky'?'./sky.html':'./')+hash:hash;
}

function createClosetHistory(env){
  var current=null,entries={},bounce=null;
  function copy(x){return x==null?x:JSON.parse(JSON.stringify(x))}
  function store(entry,replace){env.history[replace?'replaceState':'pushState']({closetLintRoute:copy(entry)},'',(env.href||closetRouteHash)(entry.route))}
  function capture(write){if(!current)return;current.context=env.capture();entries[current.index]=copy(current);if(write)store(current,true)}
  function transition(route,options){
    options=options||{};route=env.resolve(route);if(!route)return false;
    if(current&&!options.force&&closetRouteHash(route)===closetRouteHash(current.route)&&!options.action){capture(true);return true}
    if(!options.skipGuard&&!env.guard(route))return false;
    capture(true);var context=options.context||null;
    env.apply(route,options.action,context);
    var entry={index:current?(options.replace?current.index:current.index+1):0,route:route,context:context||env.capture()};
    if(!options.replace)Object.keys(entries).forEach(function(k){if(+k>entry.index)delete entries[k]});current=entry;entries[entry.index]=copy(entry);store(entry,!!options.replace||entry.index===0);if(context)env.restoreScroll(context);return true;
  }
  function pop(event){
    if(bounce!==null){if(event.state&&event.state.closetLintRoute&&event.state.closetLintRoute.index===bounce){bounce=null;return}return}
    var saved=event.state&&event.state.closetLintRoute,known=saved&&Number.isInteger(saved.index)&&saved.index>=0;
    if(known&&current&&saved.index===current.index&&env.location.hash!==closetRouteHash(current.route))known=false;
    var route=env.resolve(parseClosetRoute(env.location.hash));
    if(!route)return;
    capture(false);
    if(!env.guard(route)){
      if(known&&current&&saved.index!==current.index){bounce=current.index;env.history.go(current.index-saved.index)}
      else if(current)store(current,true);
      return;
    }
    var index=known?saved.index:current?current.index+1:0;
    var context=(entries[index]||saved||{}).context||null;
    env.apply(route,null,context);current={index:index,route:route,context:context||env.capture()};entries[index]=copy(current);store(current,true);if(context)env.restoreScroll(context);
  }
  return {start:function(route){return transition(route,{replace:true,force:true})},go:transition,pop:pop,capture:function(){capture(true)},current:function(){return current},previous:function(){return current&&entries[current.index-1]}};
}
function installClosetRoutes(){
  var skip=$('skip-content');if(skip&&skip.addEventListener)skip.addEventListener('click',function(e){e.preventDefault();var main=document.querySelector('main:not(.hide)');if(!main)return;if(typeof closeAppMenu==='function')closeAppMenu();if(typeof closeAddMenu==='function')closeAddMenu();main.tabIndex=-1;main.classList.add('skip-focus-target');var top=$('topbar');main.style.scrollMarginTop=((top?top.getBoundingClientRect().height:0)+12)+'px';main.focus({preventScroll:true});main.scrollIntoView({block:'start',behavior:'instant'})});
  if(!window.history||!window.history.pushState)return;
  window.history.scrollRestoration='manual';
  var applying=false,started=false,formTrack=null,formBase='',closing=false,extraForms=[],scrollRevision=0;
  var original={setTab:setTab,openEdit:openEdit,openAdd:openAdd,ofOpen:ofOpen,collectionBrowse:collectionBrowse,openCollections:openCollections,tripOpen:tripOpen,closeDlg:closeDlg,renderGrid:renderGrid,tripRender:tripRender,openOutfitDetails:openOutfitDetails,openCalendar:openCalendar,renderSaved:renderSaved,openImport:openImport,openTidyPhotos:openTidyPhotos,openTidyDetails:openTidyDetails};
  var browseKeys=['drawn','q','metas','subs','sizes','heelB','fitsMe','wishOnly','photo','where','wearMoreOnly','wearHeat','laundryOnly','review','fav','showHidden','showStored','showDonate','sort','sortRev','collectionFilter','collectionManager','fantasy','collectionsExpanded','of','ofView','histMonth','histDate','histMode','histSelected','skyFilter'].concat(MULTI_KEYS,SET_KEYS);
  function copy(x){return JSON.parse(JSON.stringify(x))}
  function capture(){var values={};browseKeys.forEach(function(k){if(state[k]!==undefined)values[k]=copy(state[k])});return {tab:state.tab,values:values,scroll:window.scrollY||0,filterScroll:$('filters')?$('filters').scrollTop:0}}
  function restoreValues(context){if(!context)return;Object.keys(context.values||{}).forEach(function(k){if(browseKeys.indexOf(k)>=0)state[k]=copy(context.values[k])});if($('qbox'))$('qbox').value=state.q||''}
  function restoreScroll(context){var revision=scrollRevision;requestAnimationFrame(function(){requestAnimationFrame(function(){if(revision!==scrollRevision)return;window.scrollTo(0,context.scroll||0);if($('filters'))$('filters').scrollTop=context.filterScroll||0})})}
  function pageTitle(route){
    var name='Closet';
    if(route.type==='profile'){var quiz=route.quiz&&typeof ClosetLintComfort!=='undefined'&&ClosetLintComfort.topics.find(function(t){return t.id===route.quiz});document.title=(quiz?quiz.name:'Profile')+' · '+((state.profile.wardrobeIdentity||{}).name||'Closet Lint');return}
    if(route.type==='closet')name=({all:'Closet',clothing:'Clothing',accessories:'Accessories',jewelry:'Jewelry',offduty:'Off-duty'})[route.category]||'Closet';
    else if(route.type==='assistant')name='Review product photos';
    else if(route.type==='pieces')name=(byId()[route.id]||{}).name||'Piece';
    else if(route.type==='outfits')name=route.id?(state.outfits[route.id]||{}).name||'Outfit':'Outfits';
    else if(route.type==='collections')name=route.id?(collectionList().find(function(c){return c.id===route.id})||{}).name||'Collection':'Collections';
    else if(route.type==='sky')name=route.id==='catalog'?'All constellations':'My Style Sky';
    else if(route.type==='trips')name=route.id&&route.id!=='new'?(state.trips[route.id]||{}).name||'Trip':route.id==='new'?'Plan a trip':'Trips';
    else name=({board:'Board',calendar:'Schedule',lab:'Outfit Lab','wishlist-ranking':'Wishlist','buy-check':'Buy check',oracle:'Closet Oracle',sky:'Style constellation',import:'Import pieces','tidy-photos':'Tidy photos','tidy-details':'Tidy titles & tags'})[route.type]||'Closet';
    document.title=name+' · '+(state.profile&&state.profile.wardrobeIdentity&&String(state.profile.wardrobeIdentity.name||'').trim().slice(0,100)||'Closet Lint');
  }
  function routeFromState(){
    if(document.querySelector('.photo-preparation[data-return-request][open]')&&history.current()&&history.current().route.type==='assistant')return history.current().route;
    if(formTrack&&formTrack.id&&$('dlg').open)return {type:'pieces',id:formTrack.id};
    if(state.tab==='import'||state.tab==='tidy-photos'||state.tab==='tidy-details')return {type:state.tab};
    if(state.tab==='saved'&&state.ofPreview)return {type:'outfits',id:state.ofPreview};
    if(state.tab==='profile'){var profileRoute={type:'profile',id:state.profileTab==='almanac'?null:state.profileTab};if(state.profileTab==='comfort'&&typeof comfortSession!=='undefined'&&comfortSession)profileRoute.quiz=comfortSession.topic;return profileRoute;}
    if(state.tab==='saved'&&state.ofView==='history')return {type:'calendar',month:state.histMonth||null};
    if(state.tab==='trip')return {type:'trips',id:state.trip?(state.trip.id||'new'):null};
    if(isClosetTab(state.tab)){if(state.collectionManager)return {type:'collections',id:null};var ids=Object.keys(state.collectionFilter||{}).filter(function(k){return state.collectionFilter[k]});if(ids.length===1)return {type:'collections',id:ids[0]};return {type:'closet',category:state.tab}}
    if(state.tab==='sky')return {type:'sky',id:state.skyCatalog?'catalog':null};
    return {type:({outfits:'board',saved:'outfits',lab:'lab',wrank:'wishlist-ranking',buy:'buy-check',oracle:'oracle',sky:'sky'})[state.tab]||'closet'};
  }
  function resolve(route){
    if(!route){toast('That address isn’t a Closet Lint page. Back to the closet.');return {type:'closet',category:'all'}}
    if(route.type==='profile'&&route.quiz&&!(typeof ClosetLintComfort!=='undefined'&&ClosetLintComfort.topics.some(function(t){return t.id===route.quiz}))){toast('That quiz is not available. Back to Comfort zone.');return {type:'profile',id:'comfort'}}
    function has(map,id){return Object.prototype.hasOwnProperty.call(map||{},id)}
    var missing=route.type==='pieces'?!has(byId(),route.id):route.type==='outfits'&&route.id?!has(state.outfits,route.id):route.type==='collections'&&route.id?!collectionList().some(function(c){return c.id===route.id}):route.type==='trips'&&route.id&&route.id!=='new'?!has(state.trips,route.id):false;
    if(missing){toast('That '+({pieces:'piece',outfits:'outfit',collections:'collection',trips:'trip'})[route.type]+' is no longer available in this wardrobe.');return route.type==='pieces'?{type:'closet',category:'all'}:{type:route.type,id:null}}
    return route;
  }
  function signature(){
    var d=$('dlg');if(!d.open)return '';
    return JSON.stringify(Array.from(d.querySelectorAll('input,select,textarea')).filter(function(n){return !/^(button|submit|color|range)$/.test(n.type||'')&&!n.closest('.photo-options,.phtools,.photo-primary-action')&&n.getAttribute('data-care-upload')!=='true'}).map(function(n){return [n.name||n.getAttribute('aria-label')||'',n.type==='file'?Array.from(n.files||[]).map(function(f){return [f.name,f.size,f.lastModified]}):n.type==='checkbox'||n.type==='radio'?n.checked:n.value]}).concat([Array.from(d.querySelectorAll('.form .tagfield .chip[aria-pressed],.form .chips .chip[aria-pressed]')).map(function(n){return [n.textContent,n.getAttribute('aria-pressed')] }),d.querySelector('.titlewrap')?d.querySelector('.titlewrap').textContent:'',formTrack&&!formTrack.id?Array.from(d.querySelectorAll('.ph img')).map(function(n){return n.src}):[]]));
  }
  function track(id){formTrack={id:id||null};formBase=signature()}
  function dirtyForm(){return !!formTrack&&$('dlg').open&&signature()!==formBase&&(!formTrack.id||!!byId()[formTrack.id])}
  function sameOutfit(route){return route.type==='outfits'&&route.id&&state.tab==='outfits'&&state.board.id===route.id}
  function sameTrip(route){return route.type==='trips'&&state.tab==='trip'&&((route.id==='new'&&state.trip&&!state.trip.id)||(route.id&&state.trip&&state.trip.id===route.id))}
  function guard(route){
    if(typeof comfortResetBusy!=='undefined'&&comfortResetBusy){toast('Wait for the quiz reset to finish.');return false}
    if(typeof comfortSession!=='undefined'&&comfortSession&&comfortSession.busy){toast('Wait for your answer to finish saving.');return false}
    if(typeof batchWorkBusy==='function'&&batchWorkBusy()){toast('Wait for the current batch operation to finish before leaving.');return false}
    if(state.workspaceBusy){toast('Keeping your current work. Please wait before leaving.');return false}
    if(state.boardSaving&&state.outfitSave&&state.outfitSave.planning){toast('Wait for Save & schedule to finish before leaving.');return false}
    if(state.tab==='oracle'&&route.type!=='oracle'&&typeof oracleSession!=='undefined'&&oracleSession&&oracleSession.busy&&!oracleSession.photoRequest){oracleMessage('Wait for this download to finish.');return false}
    var tool=document.querySelector('.tidy-photos[open],.background-preview[open]');
    if(tool&&tool.dataset.navigationBusy==='true'){toast('Wait for these photos to finish saving before leaving.');return false}
    extraForms=extraForms.filter(function(f){return f.dialog.open});
    if(extraForms.some(function(f){return f.busy&&f.busy()})){toast('Wait for this save to finish before leaving.');return false}
    if(route.type!=='pieces'&&!sameTrip(route)&&state.tab==='trip'&&state.trip&&state.trip._tripFlight){toast('Wait for this trip save to finish before leaving.');return false}
    var extraDirty=extraForms.some(function(f){return f.read()!==f.base});
    var trip=route.type!=='pieces'&&!sameTrip(route)&&state.tab==='trip'&&tripHasUnsaved(state.trip);
    return !(dirtyForm()||extraDirty||trip||tool)||window.confirm('Leave this view? Unsaved edits and unkept photo results will be discarded. Your board and saved outfits stay safe.');
  }
  function discardFor(route){
    if(typeof comfortPark==='function')comfortPark();
    if(route.type!=='pieces'&&!sameTrip(route)&&state.tab==='trip'&&state.trip)tripLeave(function(){},true);
    formTrack=null;closing=true;document.querySelectorAll('dialog[open]').forEach(function(d){d.close()});closing=false;
  }
  function apply(route,action,context){
    var previousTab=state.tab;
    applying=true;scrollRevision++;state.routeScrollRestore=!!(context&&context.scroll>0);
    try{
      // A piece is a modal above its existing workflow; it must not discard an outfit/trip draft underneath.
      var preservePiece=route.type==='pieces';
      if(!preservePiece)discardFor(route);else{formTrack=null;closing=true;document.querySelectorAll('dialog[open]').forEach(function(d){d.close()});closing=false}
      // Explicit All/Closet/home navigation leaves a collection; history restores its saved context.
      if(!context&&route.type==='closet'&&(!route.category||route.category==='all'))state.collectionFilter={};
      if(!context&&route.type==='closet'&&route.color){resetFilterState();state.showStored=false}
      if(action){action();return}
      if(route.type==='assistant'){original.setTab('all');openPhotoPreparation([],null,{request:route.id,instance:route.instance,workflow:route.workflow});}
      else if(route.type==='import'||route.type==='tidy-photos'||route.type==='tidy-details'){original.setTab(route.type);if(route.type==='import')original.openImport();else if(route.type==='tidy-photos')original.openTidyPhotos();else original.openTidyDetails();if(!context)window.scrollTo(0,0)}
      else if(route.type==='pieces'){
        var tab=state.editingOutfit||state.trip?state.tab:context&&context.tab||state.tab||'all';if(state.tab!==tab)original.setTab(tab);restoreValues(context);if(isClosetTab(tab)){renderFilters();original.renderGrid()}original.openEdit(byId()[route.id]);track(route.id);
      }else if(route.type==='outfits'&&route.id){original.ofOpen(Object.assign({id:route.id},state.outfits[route.id]),byIdA());}
      else if(route.type==='calendar'){state.ofPreview=null;state.ofView='history';state.histMonth=route.month||todayStr().slice(0,7);original.setTab('saved')}
      else if(route.type==='outfits'){state.ofPreview=null;state.ofView='outfits';original.setTab('saved')}
      else if(route.type==='collections'&&route.id)original.collectionBrowse(collectionList().find(function(c){return c.id===route.id}));
      else if(route.type==='collections')original.openCollections();
      else if(route.type==='trips'&&route.id){if(!sameTrip(route)){original.setTab('trip');if(route.id==='new'){state.trip=tripNew();original.tripRender()}else original.tripOpen(route.id)}else original.tripRender()}
      else if(route.type==='profile'){state.profileTab=route.id||'almanac';original.setTab('profile');if(route.quiz)comfortStart(route.quiz,undefined,true);if(!context)window.scrollTo(0,0)}
      else if(route.type==='sky'){state.skyCatalog=route.id==='catalog';original.setTab('sky');if(!context)window.scrollTo(0,0)}
      else{original.setTab(route.type==='closet'?route.category||'all':({board:'outfits',outfits:'saved',trips:'trip',lab:'lab','wishlist-ranking':'wrank','buy-check':'buy',oracle:'oracle',sky:'sky'})[route.type]||'all')}
      if(!context&&route.type==='closet'&&route.color){state.colors={};state.colors[route.color]=true;renderFilters();original.renderGrid()}
      if(context){restoreValues(context);if(isClosetTab(state.tab)){renderFilters();original.renderGrid()}else if(state.tab==='saved')renderSaved()}
    }finally{if(!context&&route.type!=='pieces'&&(state.tab!==previousTab||route.type==='wishlist-ranking'))restoreScroll({scroll:0});pageTitle(route);applying=false;state.routeScrollRestore=false}
  }
  var history=createClosetHistory({history:window.history,location:window.location,href:closetRouteHref,resolve:resolve,guard:guard,capture:capture,apply:apply,restoreScroll:restoreScroll});
  var pendingRoute=null;
  function navigate(route,action){if(!started&&!applying){pendingRoute=route;return true}if(applying)return action? action():false;var same=closetRouteHash(route)===closetRouteHash(history.current().route);return history.go(route,{force:same,replace:same})}
  setTab=function(t){if(t==='saved'&&!applying)state.ofPreview=null;return navigate(t==='profile'?{type:'profile',id:state.profileTab==='almanac'?null:state.profileTab}:{type:({outfits:'board',saved:'outfits',trip:'trips',lab:'lab',wrank:'wishlist-ranking',buy:'buy-check',oracle:'oracle',sky:'sky'})[t]||'closet',category:isClosetTab(t)?t:undefined},function(){if(t==='sky')state.skyCatalog=false;original.setTab(t)})};
  openImport=function(){return navigate({type:'import'},function(){original.setTab('import');original.openImport()})};
  openTidyPhotos=function(){return navigate({type:'tidy-photos'},function(){original.setTab('tidy-photos');original.openTidyPhotos()})};
  openTidyDetails=function(){return navigate({type:'tidy-details'},function(){original.setTab('tidy-details');original.openTidyDetails()})};
  openCalendar=function(month){return navigate({type:'calendar',month:month||state.histMonth||todayStr().slice(0,7)},function(){original.openCalendar(month)})};
  openEdit=function(it){return navigate({type:'pieces',id:it.id},function(){original.openEdit(it);track(it.id)})};
  openAdd=function(){if(started&&!applying&&!guard(routeFromState()))return false;original.openAdd();track(null)};
  openOutfitDetails=function(src,commit){if(started&&!applying&&!guard(routeFromState()))return false;original.openOutfitDetails(src,commit);track(null)};
  ofOpen=function(o,map){return navigate({type:'outfits',id:o.id},function(){original.ofOpen(o,map)})};
  collectionBrowse=function(c){return navigate({type:'collections',id:c.id},function(){original.collectionBrowse(c)})};
  openCollections=function(pick,options){if(pick||applying||!started)return original.openCollections(pick,options);return navigate({type:'collections',id:null},function(){original.openCollections()})};
  tripOpen=function(id){return navigate({type:'trips',id:id},function(){original.setTab('trip');original.tripOpen(id)})};
  closeDlg=function(){
    if(!started||applying||!formTrack)return original.closeDlg();
    var current=history.current(),previous=history.previous();
    if(current&&current.route.type==='pieces'){
      if(previous&&previous.route.type!=='pieces'){window.history.back();return}
      if(state.tab==='saved'&&state.ofView==='history')return history.go({type:'calendar',month:state.histMonth||null},{replace:true});
      return history.go({type:isClosetTab(state.tab)?'closet':({outfits:'board',saved:'outfits',trip:'trips',lab:'lab',sky:'sky'})[state.tab]||'closet',category:isClosetTab(state.tab)?state.tab:undefined},{replace:true});
    }
    if(dirtyForm()&&!window.confirm('Discard the unsaved changes to this form?'))return false;formTrack=null;original.closeDlg();
  };
  $('dlg').addEventListener('cancel',function(e){if(formTrack&&!applying){e.preventDefault();closeDlg()}});
  $('dlg').addEventListener('close',function(){if(closing||applying)return;formTrack=null;if(started&&history.current().route.type==='pieces')history.go(routeFromState(),{replace:true,skipGuard:true})});
  function syncStateRoute(){
    if(!started||applying||formTrack)return;
    var route=routeFromState(),current=history.current();
    if(current&&closetRouteHash(route)!==closetRouteHash(current.route))history.go(route,{replace:current.route.type==='trips'&&current.route.id==='new',skipGuard:true,action:function(){}});else history.capture();
  }
  renderGrid=function(){var result=original.renderGrid.apply(this,arguments);syncStateRoute();return result};
  renderSaved=function(){var result=original.renderSaved.apply(this,arguments);syncStateRoute();return result};
  tripRender=function(){var result=original.tripRender.apply(this,arguments);syncStateRoute();return result};
  var scheduled=false;function captureSoon(){if(!started||applying||scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;if(started&&!applying)history.capture()})}
  document.addEventListener('input',captureSoon);document.addEventListener('change',captureSoon);window.addEventListener('scroll',captureSoon,{passive:true});
  window.addEventListener('popstate',function(e){if(started)history.pop(e)});window.addEventListener('hashchange',function(){if(started&&!applying&&window.location.hash!==closetRouteHash(history.current().route))history.pop({state:window.history.state})});
  window.addEventListener('beforeunload',function(e){if((typeof oracleHasDraft==='function'&&oracleHasDraft())||dirtyForm()||extraForms.some(function(f){return f.dialog.open&&(f.read()!==f.base||f.busy&&f.busy())})){e.preventDefault();e.returnValue=''}});
  function closetHome(){
    if(!started)return navigate({type:'closet',category:'all'});
    return history.go({type:'closet',category:'all'},{force:true,action:function(){
      var fav=state.fav,sort=state.sort,rev=state.sortRev;
      original.setTab('all');resetFilterState();state.showStored=false;state.collectionManager=false;
      state.fav=fav;state.sort=sort;state.sortRev=rev;
      renderTabs();renderFilters();original.renderGrid();window.scrollTo(0,0);
    }});
  }
  window.ClosetLintRoutes={home:closetHome,finishPhotoReturn:function(){if(started&&!applying&&history.current().route.type==='assistant')history.go({type:'closet',category:'all'},{replace:true,skipGuard:true})},comfort:function(topic,index){var route={type:'profile',id:'comfort',quiz:topic};if(!started)return navigate(route);if(applying||history.current()&&closetRouteHash(history.current().route)===closetRouteHash(route))return comfortStart(topic,index,true);return history.go(route,{action:function(){state.profileTab='comfort';original.setTab('profile');comfortStart(topic,index,true);window.scrollTo(0,0)}})},profile:function(tab){return navigate({type:'profile',id:tab==='almanac'?null:tab})},leaveBatch:function(){var previous=history.previous();if(previous&&previous.route.type!=='import'&&previous.route.type!=='tidy-photos'&&previous.route.type!=='tidy-details'){window.history.back();return}return navigate({type:'closet',category:'all'})},sky:function(on){return navigate({type:'sky',id:on?'catalog':null},function(){state.skyCatalog=!!on;original.setTab('sky')})},ready:function(){if(started)return true;if(!state.capsDone)return false;if(state.db&&!state.pub&&!['edits','custom','outfits','profile','trips'].every(function(k){return setupLoaded[k]}))return false;started=true;var requested=window.location.hash;if(history.start(pendingRoute||(requested?parseClosetRoute(requested):typeof PUB!=='undefined'&&PUB&&PUB.skyLanding?{type:'sky'}:routeFromState()))===false)history.start({type:'board'});var loading=$('app-loading');if(loading)loading.classList.toggle('hide',true);return 'started'},cleanForm:function(){formBase=signature()},trackDialog:function(d,read,busy){extraForms=extraForms.filter(function(f){return f.dialog!==d&&f.dialog.open});extraForms.push({dialog:d,read:read,busy:busy,base:read()})},prepareReload:function(){formTrack=null;extraForms=[];},markImportDirty:function(d,dirty){var f=extraForms.find(function(x){return x.dialog===d});if(f&&dirty)f.base='';},hasUnsaved:function(){return dirtyForm()||extraForms.some(function(f){return f.dialog.open&&f.dialog.id!=='setup-wizard'&&(f.read()!==f.base||f.busy&&f.busy())})||!!(state.tab==='trip'&&state.trip&&tripHasUnsaved(state.trip));},cleanDialog:function(d){extraForms=extraForms.filter(function(f){return f.dialog!==d})},closeTrackedDialog:function(d){var f=extraForms.find(function(x){return x.dialog===d});if(f&&f.busy&&f.busy()){toast('Wait for this save to finish before closing.');return false}if(f&&f.read()!==f.base&&!window.confirm('Discard the unsaved changes to this form?'))return false;extraForms=extraForms.filter(function(x){return x.dialog!==d});d.close();return true},capture:captureSoon};
}
