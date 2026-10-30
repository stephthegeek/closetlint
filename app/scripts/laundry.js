/* Manual laundry availability and care references. Historical style evidence is untouched. */
function laundryEnabled(){return !!(state.profile&&state.profile['laundry-settings']&&state.profile['laundry-settings'].enabled)}
function needsLaundry(it){return !!(it&&it.laundry===true)}
function laundryEmptyMessage(items){return (items||[]).some(needsLaundry)?'Nothing needs cleaning with these filters.':'Nothing needs cleaning. The hamper is appeased.'}
function laundryPlanningOnly(){return laundryEnabled()&&(!state.lab||state.lab.readyOnly!==false)}
function laundryMark(it){return laundryEnabled()&&laundryClothing(it)&&needsLaundry(it)?el('span',{class:'laundry-mark',role:'img','aria-label':'Needs cleaning',title:'Needs cleaning',text:'🧺'}):null}
function laundryIds(pieces,map){var seen={};return (pieces||[]).map(function(p){return typeof p==='string'?p:p.id}).filter(function(id){if(seen[id]||!needsLaundry(map[id]))return false;seen[id]=true;return true})}
var laundryPieceRefresh=null,piecePhotoRefresh=null,laundrySettingsBusy=false,laundryPending={};
function laundryFillSettings(){
  var control=$('laundry-enabled');if(!control)return;
  if(!laundrySettingsBusy)control.checked=laundryEnabled();control.disabled=laundrySettingsBusy;
}
function laundrySaveSettings(enabled){
  if(laundrySettingsBusy||needDb())return Promise.resolve(false);
  laundrySettingsBusy=true;laundryFillSettings();
  var status=$('laundry-settings-status');if(status)status.textContent='Saving…';
  return state.db.collection('profile').doc('laundry-settings').set({enabled:!!enabled}).then(function(){
    state.profile['laundry-settings']={enabled:!!enabled};if(!enabled)state.laundryOnly=false;
    if(state.lab)state.lab.cur=null;if(status)status.textContent='Saved';onDataSoon();return true;
  }).catch(function(){if(status){status.textContent='Could not save. ';status.appendChild(el('button',{class:'linkbtn',type:'button',text:'Retry',onclick:function(){laundrySaveSettings(enabled)}}))}return false}).finally(function(){laundrySettingsBusy=false;laundryFillSettings()});
}
function laundrySet(it,value,button){
  if(laundryPending[it.id])return Promise.resolve(false);laundryPending[it.id]=true;
  if(button)button.disabled=true;if(laundryPieceRefresh)laundryPieceRefresh();
  return pieceAction(it,{laundry:!!value},value?'Needs cleaning. Banished to the hamper.':'Set as clean. Released from hamper jail.').then(function(ok){
    if(ok){it.laundry=!!value;if(laundryPieceRefresh)laundryPieceRefresh();if(state.lab)state.lab.cur=null;onDataSoon()}
    else toastAct('Cleaning status not saved.','Retry',function(){return laundrySet(it,value,button)});
    return ok;
  }).finally(function(){delete laundryPending[it.id];if(button)button.disabled=false;if(laundryPieceRefresh)laundryPieceRefresh()});
}
function laundryClothing(it){return !!it&&['Tops','Bottoms','One-pieces','Outerwear','Underwear','Swimwear','Loungewear','Activewear','Costumes','Legwear','Lingerie','Workwear & uniforms','Cultural & traditional garments'].indexOf(it.meta)>=0}
function laundryPieceUI(it){
  if(!laundryClothing(it))return null;
  var box=el('div',{class:'laundry-piece-status'}),button=el('button',{class:'btn laundry-piece-action',type:'button',onclick:function(){var fresh=byId()[it.id]||it;return laundrySet(fresh,!needsLaundry(fresh),button)}});
  function paint(){var fresh=byId()[it.id]||it,on=needsLaundry(fresh),enabled=laundryEnabled();button.hidden=!enabled;button.disabled=!!laundryPending[it.id];var label=on?'🧺 Set as clean':'🧺 Needs cleaning';button.textContent='';button.appendChild(buttonText(label));button.setAttribute('aria-label',label);box.textContent='';if(enabled&&on)box.append(el('span',{text:'🧺 Needs cleaning'}),el('button',{class:'btn small',type:'button',disabled:!!laundryPending[it.id],text:'Set as clean',onclick:function(e){laundrySet(fresh,false,e.currentTarget)}}));box.hidden=!(enabled&&on)}
  laundryPieceRefresh=function(){if(button.isConnected)paint()};paint();return {node:box,button:button};
}
function laundryBulkMenu(ids){
  var map=byId();ids=ids.filter(function(id){return laundryClothing(map[id])});if(!ids.length){toast('Select clothing to update its cleaning status.');return}
  var d=$('cdlg');d.textContent='';var pending=false;
  function act(value){if(pending)return;pending=true;d.querySelectorAll('button').forEach(function(b){b.disabled=true});
    applyBulk(ids,function(it){return needsLaundry(it)===value?null:{laundry:value}},value?'Needs cleaning. Banished to the hamper.':'Set as clean. Released from hamper jail.').then(function(){d.close()}).finally(function(){pending=false});
  }
  d.appendChild(el('div',{class:'dlgwide narrow'},el('h2',{text:'Laundry · '+ids.length+' selected'}),el('div',{class:'laundry-choices'},el('button',{class:'btn',type:'button',text:'🧺 Needs cleaning',onclick:function(){act(true)}}),el('button',{class:'btn',type:'button',text:'✓ Set as clean',onclick:function(){act(false)}}),el('button',{class:'btn',type:'button',text:'Cancel',onclick:function(){d.close()}}))));addClose(d);if(!d.open)d.showModal();
}
function laundryCareForm(it,onPhotos){
  if(!laundryClothing(it))return null;
  var care=it.care||{},body=el('div',{class:'origbody care-body'}),summary=el('summary',{text:'Care'}),node=el('details',{class:'origin care-section'},summary,body);
  function field(label,values,value){var select=el('select',{'aria-label':label});[['','Not set']].concat(values.map(function(v){return [v,v]})).forEach(function(v){select.appendChild(el('option',{value:v[0],text:v[1]}))});if(value&&values.indexOf(value)<0)select.appendChild(el('option',{value:value,text:value}));select.value=value||'';body.appendChild(el('label',null,label,select));return select}
  var wash=field('Washing',['Machine wash cold','Machine wash warm','Machine wash hot','Hand wash cold','Hand wash','Dry clean only','Do not wash'],care.wash),dry=field('Drying',['Tumble dry low','Tumble dry medium','Tumble dry','Hang to dry','Lay flat to dry','Do not tumble dry'],care.dry),note=el('textarea',{'aria-label':'Care note',rows:'2',maxlength:'1000',value:care.note||''});
  note.value=care.note||'';body.appendChild(el('label',null,'Care note',note));
  var uploading=false,photos=el('div',{class:'care-label-links'}),file=el('input',{type:'file',accept:'image/*',class:'hide','data-care-upload':'true','aria-label':'Add care label photo'}),status=el('p',{class:'fine',role:'status'}),add=el('button',{class:'btn small',type:'button',text:'📷 Add care label photo',onclick:function(){file.click()}});
  function paint(){photos.textContent='';piecePhotos(it).filter(function(p){return p.kind==='carelabel'}).forEach(function(p,i){photos.appendChild(el('button',{class:'care-label-thumb',type:'button','aria-label':'View care label '+(i+1),onclick:function(){openLightbox(Object.assign({},it,{photo:p.src}))}},el('img',{src:photoThumbnail(p.src),alt:'Care label '+(i+1),loading:'lazy',decoding:'async'})))});var atLimit=piecePhotos(it).filter(function(p){return p.photoId}).length>=12;add.disabled=uploading||!state.assets||atLimit;add.title=atLimit?'12-photo limit reached. Remove a photo first.':!state.assets?'Photo storage unavailable.':'';summary.textContent='Care'}
  wash.addEventListener('change',paint);dry.addEventListener('change',paint);
  file.addEventListener('change',function(){var f=file.files&&file.files[0];if(!f||uploading)return;uploading=true;paint();status.textContent='Saving photo…';
    return laundryUploadLabel(it,f).then(function(ok){if(ok){status.textContent='Care label saved';toast('Care label saved. Tiny scroll acquired.');paint();if(onPhotos)onPhotos()}else status.textContent='Photo not saved. Try again.'}).catch(function(e){status.textContent=e.message||'Photo not saved. Try again.'}).finally(function(){uploading=false;file.value='';paint()});
  });
  body.append(photos,add,file,status);paint();return {node:node,refreshPhotos:paint,read:function(){return {wash:wash.value,dry:dry.value,note:note.value.trim().slice(0,1000)}}};
}
function laundryUploadLabel(it,file){
  if(needDb()||!state.assets)return Promise.resolve(false);
  var list=piecePhotos(it).filter(function(p){return p.photoId}).map(photoRecord);if(list.length>=12)return Promise.reject(new Error('This piece already has 12 photos.'));
  return readImage(file).then(function(r){return state.assets.upload(r.blob).then(function(up){var existing=list.find(function(p){return p.photoId===up.id});if(existing){if(existing.kind==='carelabel')return true;throw new Error('Photo already added. Change its type in Photo options.')}list.push({photoId:up.id,ar:r.ar,kind:'carelabel'});return savePhotoViews(it,list,null)})});
}
/* This also covers imported label-only pieces and changing the main photo's kind. */
function laundryPhotoPatch(it,photos,main){
  var selected=photos.find(function(p){return p.photoId===(main?main.photoId:it.photoId)});
  if(selected&&selected.kind!=='carelabel')return {photoId:selected.photoId,ar:selected.ar||it.ar,noPhoto:false};
  var garment=photos.find(function(p){return p.kind!=='carelabel'});
  if(!it.photoId&&!it.noPhoto&&typeof realPhoto==='function'&&realPhoto(it))return {};
  if(garment)return {photoId:garment.photoId,ar:garment.ar||1,noPhoto:false};
  return {photoId:'',noPhoto:true,photo:PLACEHOLDER,ar:1};
}
function laundryBoardNotice(){
  var old=$('board-laundry-notice');if(old)old.remove();if(!laundryEnabled()||!state.board)return;
  var map=byId(),ids=laundryIds(state.board.pieces,map);if(!ids.length)return;
  var list=el('div',{class:'laundry-board-list',hidden:true});ids.forEach(function(id){list.appendChild(el('button',{class:'linkbtn',type:'button',text:map[id].name,onclick:function(){openEdit(map[id])}}))});
  var toggle=el('button',{class:'btn small',type:'button',text:'Show pieces','aria-expanded':'false',onclick:function(){list.hidden=!list.hidden;toggle.setAttribute('aria-expanded',String(!list.hidden));toggle.textContent=list.hidden?'Show pieces':'Hide pieces'}}),notice=el('div',{id:'board-laundry-notice',class:'laundry-board-notice'},el('div',{class:'laundry-notice-heading'},el('span',{text:'🧺 '+ids.length+(ids.length===1?' piece needs cleaning':' pieces need cleaning')}),toggle),list);
  var tools=$('oboardtools');var title=$('oname');var target=title&&title.closest('.board-title-row');if(target)target.parentNode.insertBefore(notice,target.nextSibling);
}
function laundryLabControls(ctl,L){
  if(!laundryEnabled())return;
  ctl.appendChild(chip('🧺 Ready to wear only',L.readyOnly!==false,function(){L.readyOnly=L.readyOnly===false;try{localStorage.setItem('closetlint.labready.v1',L.readyOnly?'1':'0')}catch(e){}L.cur=null;labRender()}));
}
function laundryLabSkipped(ctl,L){
  if(!laundryEnabled()||L.readyOnly===false)return;
  var pool=labPool({seasons:L.seasons,fits:L.fits,photo:true,fresh:L.fresh,includeLaundry:true}),ids={};Object.keys(pool).forEach(function(k){pool[k].forEach(function(p){if(needsLaundry(p))ids[p.id]=true})});var n=Object.keys(ids).length;
  if(n)ctl.appendChild(el('p',{class:'fine laundry-skipped'},el('span',{text:'🧺 Skipping '+n+' clothing piece'+(n===1?'':'s')+'. '}),el('button',{class:'linkbtn',type:'button',text:'View laundry',onclick:function(){setTab('all');resetFilterState();state.laundryOnly=true;renderFilters();renderGrid()}})));
}
function laundryLabInvalidate(){
  var L=state.lab;if(!L||!L.cur||!laundryPlanningOnly())return;
  var accessories=Object.keys(L.cur.acc||{}).reduce(function(list,k){return list.concat(L.cur.acc[k]||[])},[]);
  if(labParts(L.cur).concat(accessories).some(function(p){return p&&needsLaundry(byId()[p.id])}))L.cur=null;
}
