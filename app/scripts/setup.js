/* Setup and small DIY imports. Embedded into the portable HTML by tools/sync_setup.py. */
var setupSession=null,setupAutoChecked=false,setupLoaded={};
var SETUP_MAX_PHOTOS=12;
var SETUP_GOALS=[['rediscover','🧺','Wear more of what I own','Browse your own little shop. Find the things you forgot you loved.'],['outfits','🧑‍🔬','Play with outfit ideas','Try combinations for an event, a mood, or a regular Tuesday.'],['wishlist','✨','Figure out what to buy','Keep your wishlist beside your clothes and see what earns its place.'],['trips','🧳','Pack with less guesswork','Build looks for a trip and turn them into a packing list.']];
function setupShouldOpen(loaded,hasPieces,profile,isPublic,hasStorage){return !!(loaded.custom&&loaded.profile&&hasStorage&&!isPublic&&!hasPieces&&!(profile&&profile.started));}
function maybeStartSetup(){
  if(setupAutoChecked||!setupLoaded.custom||!setupLoaded.profile||!state.capsDone)return;
  setupAutoChecked=true;
  if(setupShouldOpen(setupLoaded,CATALOG.length+Object.keys(state.custom).length,state.profile.onboarding,state.pub,!!state.db)&&!document.querySelector('dialog[open]'))openSetup();
}
function setupText(value,max){return typeof value==='string'?value.trim().slice(0,max||180):'';}
function setupURL(value){
  var raw=setupText(value,2000);if(!raw)return '';
  try{var u=new URL(raw);if(!/^https?:$/.test(u.protocol)||u.username||u.password)throw Error();return u.href;}catch(e){throw Error('Use a full http or https product link, or leave it blank.');}
}
function setupNormal(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function setupIdentity(piece){return setupNormal(piece.name)+'|'+setupNormal(piece.size)}
function setupProductKey(value){
  if(!value)return '';try{var u=new URL(setupURL(value)),host=u.hostname.toLowerCase().replace(/^www\./,'');
    if(/(^|\.)temu\.com$/.test(host)){var id=u.searchParams.get('goods_id')||(u.pathname.match(/-g-(\d+)\.html/)||[])[1];if(id)return 'temu:'+id;}
    if(/(^|\.)amazon\.com$/.test(host)){var asin=(u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)||[])[1];if(asin)return 'amazon:'+asin.toUpperCase();}
    return host+u.pathname.replace(/\/$/,'');
  }catch(e){return '';}
}
function setupMatches(a,b){
  var as=setupNormal(a.size),bs=setupNormal(b.size);if(as&&bs&&as!==bs)return false;
  if(a.variant&&b.variant&&setupNormal(a.variant)!==setupNormal(b.variant))return false;
  if(a.colors&&a.colors.length&&b.colors&&b.colors.length&&a.colors.slice().sort().join('|')!==b.colors.slice().sort().join('|'))return false;
  var ak=setupProductKey(a.url),bk=setupProductKey(b.url);
  return (ak&&bk&&ak===bk)||setupNormal(a.name)===setupNormal(b.name);
}
function setupTagFields(){return [{key:'colors',label:'Colors',multi:true,vocab:Object.keys(COLORS)}].concat(typeof DIMS==='undefined'?[
  {key:'seasons',label:'Season',multi:true,vocab:SEASONS},{key:'styles',label:'Occasion',multi:true,vocab:STYLES},{key:'looks',label:'Aesthetic',multi:true,vocab:LOOKS}
]:DIMS.filter(function(d){return d.key!=='layer'}))}
function setupTags(raw){var out={};setupTagFields().forEach(function(d){out[d.key]=d.multi?(Array.isArray(raw[d.key])?raw[d.key].filter(function(v,i,a){return d.vocab.indexOf(v)>=0&&a.indexOf(v)===i}):[]):(d.vocab.indexOf(raw[d.key])>=0?raw[d.key]:'')});return out}
function setupPhotoURL(value){
  var raw=setupText(value,2000);if(!raw)return '';var u;
  try{u=new URL(raw)}catch(e){throw Error('Use a full https product-photo URL, or attach an image file.');}
  if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':')||/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname))throw Error('Use a public https product-photo URL, or attach an image file.');
  return u.href;
}
function setupImageList(value){
  if(!Array.isArray(value))return [];
  var seen=new Set();return value.filter(function(x){return x&&typeof x==='object'&&typeof x.url==='string'}).map(function(x){return {url:setupText(x.url,2000),kind:['isolated','model','scene','flatlay','display','detail','unclassified','recast'].indexOf(x.kind)>=0?x.kind:'unclassified'}}).filter(function(x){if(!x.url||seen.has(x.url))return false;seen.add(x.url);return true});
}
function setupParse(text,existing){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>1024*1024)throw Error('Use a small JSON file (under 1 MB). Start with around ten pieces.');
  text=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  var data;try{data=JSON.parse(text)}catch(e){throw Error('That is not readable JSON yet. It may be incomplete. Copy the whole prepared block, or ask your assistant for a downloadable .json file.');}
  if(data&&(!data.format&&(data.collections||data.documents||data.backup))){throw Error('This is a backup, not a piece import. Use the separate restore tool to restore a whole wardrobe.');}
  if(!data||data.format!=='closet-lint-import/v1'||!Array.isArray(data.pieces))throw Error('Use the Closet Lint format from the prompt: {"format":"closet-lint-import/v1","pieces":[…]}.');
  if(!data.pieces.length||data.pieces.length>50)throw Error('Import 1–50 pieces at a time. This file has '+data.pieces.length+' pieces. Nothing was loaded or cut.');
  var seen=(existing||[]).filter(function(it){return !it.removed}).slice();
  return data.pieces.map(function(raw,i){
    if(raw&&Array.isArray(raw.imageSources)&&raw.imageSources.length>12)throw Error('Piece '+(i+1)+': use at most 12 alternate photo sources.');
    if(raw&&Array.isArray(raw.images)&&raw.images.length>SETUP_MAX_PHOTOS)throw Error('Piece '+(i+1)+': use at most 12 saved photos. Nothing was cut.');
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Piece '+(i+1)+' must be an object with a name, category and status.');
    var p={name:setupText(raw.name,180),meta:META.indexOf(raw.category)>=0?raw.category:'',sub:setupText(raw.subcategory,80),size:setupText(raw.size,60),source:setupText(raw.retailer,120),url:setupText(raw.url,2000),status:['owned','wishlist'].indexOf(raw.status)>=0?raw.status:'',variant:setupText(raw.variant,180),photoUrl:setupText(raw.photoUrl,2000),photoFile:setupText(raw.photoFile,180),price:raw.price===null||raw.price===undefined?'':String(raw.price),colors:[],seasons:[],styles:[],looks:[]};
    if((SUBS[p.meta]||[]).indexOf(p.sub)<0)p.sub='';
    Object.assign(p,setupTags(raw));p.images=setupImageList(raw.images);p.imageSources=setupImageList(raw.imageSources);p.priceNote=setupText(raw.priceNote,300);p.date=setupText(raw.date,40);p.currency=setupText(raw.currency,8);p.fitsLike=setupText(raw.fitsLike,60);
    p.localPhotoFiles=(Array.isArray(raw.images)?raw.images:[]).filter(function(x){return x&&typeof x.file==='string'}).map(function(x){return x.file});if(p.photoFile)p.localPhotoFiles.unshift(p.photoFile);p.originalTitle=setupText(raw.originalTitle,600);p.listingDetails=setupText(raw.listingDetails,6000);
    [['labAs',['top','layer','either','under']],['layerNeed',['none','under','over','either']],['weight',['thin','regular','thick']]].forEach(function(pair){if(pair[1].indexOf(raw[pair[0]])>=0)p[pair[0]]=raw[pair[0]]});
    var match=seen.find(function(it){return setupMatches(p,it)}),duplicate=!!match;seen.push(p);
    return {piece:p,selected:!duplicate,duplicate:duplicate,match:match&&match.id?match:null,action:duplicate?'skip':'add',saved:false,id:null,error:'',attempted:false,compare:false,photoDecision:(p.localPhotoFiles.length||(!p.photoUrl&&!p.images.length))?'needed':'source',photoErrors:{}};
  });
}
function setupRecord(p){
  if(!p.name.trim())throw Error('Give this piece a name.');
  if(META.indexOf(p.meta)<0)throw Error('Choose a category.');
  if(['owned','wishlist'].indexOf(p.status)<0)throw Error('Choose Owned or Wishlist.');
  var kind=deriveKind(p.meta,p.sub,'clothing'),size=validateSize(kind,p.size);if(!size.ok)throw Error(size.msg);
  var record={name:p.name.trim(),meta:p.meta,sub:(SUBS[p.meta]||[]).indexOf(p.sub)>=0?p.sub:'',size:size.v,sizeKind:kind,source:p.source.trim()||'DIY import',url:setupURL(p.url),wish:p.status==='wishlist',noPhoto:true,guess:true,ar:1,date:p.date||todayStr(),colors:p.colors.slice(),seasons:p.seasons.slice(),styles:p.styles.slice(),looks:p.looks.slice()};
  if(p.date&&!setupValidDate(p.date))throw Error('Use a valid date in YYYY-MM-DD format, or leave it blank.');
  if(p.price!==''&&p.currency&&p.currency!=='USD')throw Error('Only confirmed USD prices are supported. Leave this price blank rather than converting it.');
  if(p.fitsLike)record.fitsLike=p.fitsLike;
  if(p.price!==''){var price=Number(p.price);if(!/^\d+(?:\.\d{1,2})?$/.test(p.price)||!Number.isFinite(price)||price<0)throw Error('Price should be a USD amount like 12.50, or blank.');record.price=price;}
  Object.assign(record,setupTags(p));if(p.variant)record.variant=p.variant;if(p.priceNote)record.priceNote=p.priceNote;if(p.originalTitle)record.title=p.originalTitle;if(p.listingDetails)record.listingDetails=p.listingDetails;if(p.imageSources&&p.imageSources.length)record.imageSources=p.imageSources.map(function(x){return {url:setupPhotoURL(x.url),kind:x.kind}});
  [['labAs',['top','layer','either','under']],['layerNeed',['none','under','over','either']],['weight',['thin','regular','thick']]].forEach(function(pair){if(pair[1].indexOf(p[pair[0]])>=0)record[pair[0]]=p[pair[0]]});
  return record;
}
async function setupWriteRows(rows,write,batch,progress){
  var selected=rows.filter(function(r){return r.selected&&!r.saved}),prepared=[];
  selected.forEach(function(r){r.error='';try{
    var issue=setupRowIssue(r);if(issue)throw Error(issue);
    prepared.push([r,r.action==='owned'?(r.promotionPatch&&r.match&&!r.match.wish?{wish:false}:setupPromotion(r.match,r.piece)):setupRecord(r.piece)]);
  }catch(e){r.error=e.message}});
  if(selected.some(function(r){return r.error}))return {saved:0,failed:0,invalid:true};
  var saved=0,failed=0;
  for(var i=0;i<prepared.length;i++){
    var row=prepared[i][0],record=prepared[i][1];if(!row.id)row.id='imp-'+batch+'-'+rows.indexOf(row);
    if(row.action!=='owned')record.importBatch=batch;
    row.attempted=true;
    try{await write(row.id,record,row);row.saved=true;row.selected=false;saved++;}catch(e){row.error=(e&&e.message?e.message+' ':'')+'Successful pieces stay saved. Retry the remaining pieces while this window is open.';failed++;}
    if(progress)progress(saved,failed,i+1,prepared.length);
    if(failed)break;
  }
  return {saved:saved,failed:failed,invalid:false};
}
function setupValidDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function setupPromotion(current,piece){
  if(!current||!current.id||!current.wish||current.removed)throw Error('Choose an existing wishlist match first.');
  var incoming=setupRecord(piece),patch={wish:false};
  ['size','price','url','date'].forEach(function(k){if((current[k]===undefined||current[k]===null||current[k]==='')&&incoming[k]!==undefined&&incoming[k]!==''&&(k!=='date'||piece.date))patch[k]=incoming[k]});
  if(patch.size)patch.sizeKind=incoming.sizeKind;
  return patch;
}
function setupRowIssue(row){
  if(row.saved||!row.selected)return '';
  var tagError=Object.values(row.tagErrors||{}).find(Boolean);if(tagError)return tagError;
  if(row.loadingPhoto)return 'Wait for this photo to finish processing.';
  try{
    if(row.action==='owned'){if(row.promotionPatch&&row.match&&!row.match.wish)return '';setupPromotion(row.match,row.piece);return '';}
    if(row.duplicate&&row.action!=='add')return 'Compare this piece and choose what to do.';
    setupRecord(row.piece);
    if(row.photoDecision==='needed')return 'Choose a photo, add without a photo, or skip this piece.';
    if(Object.keys(row.photoErrors||{}).some(function(k){return row.photoErrors[k]}))return 'A photo is unavailable. Attach one, add without a photo, or remove that view.';
    if(row.piece.photoUrl)setupPhotoURL(row.piece.photoUrl);
    (row.piece.images||[]).forEach(function(x){setupPhotoURL(x.url)});
    var urls=new Set((row.piece.images||[]).map(function(x){return x.url}));
    if(row.photo||(row.piece.photoUrl&&!urls.has(row.piece.photoUrl)))urls.add('__primary');
    if(urls.size>SETUP_MAX_PHOTOS)return 'Use at most 12 saved photos per piece.';
  }catch(e){return e.message;}
  return '';
}
function setupCounts(rows){
  var c={added:0,owned:0,add:0,promote:0,skipped:0,remaining:0,blocked:0,matches:0,ready:0};
  rows.forEach(function(r){if(r.duplicate)c.matches++;if(r.saved){c[r.action==='owned'?'owned':'added']++;return}if(!r.selected){c.skipped++;return}c.remaining++;if(setupRowIssue(r))c.blocked++;else c.ready++;c[r.action==='owned'?'promote':'add']++});return c;
}
function setupSaveLabel(c){return [c.add?'Add '+c.add+' piece'+(c.add===1?'':'s'):'',c.promote?'mark '+c.promote+' owned':''].filter(Boolean).join(' and ').replace(/^mark/,'Mark')||'Add pieces';}
function setupStorage(){
  if(state.pub)return {direct:false,label:'this browser, for this site address',note:'Imported pieces stay in this browser on this site. They do not change the public demo.'};
  var runtime=typeof window!=='undefined'&&window.ClosetLintLocal;
  return runtime?{direct:true,label:'the wardrobe used by this installation',note:''}:{direct:false,label:'this browser, for this site address',note:'Pieces will be saved in this browser for this site address.'};
}
function setupRemember(s){try{localStorage.setItem('closetlint.import-preferences.v1',JSON.stringify({store:s.store.slice(0,120),route:s.route}))}catch(e){}}
function setupNewSession(step){
  var prefs={};try{prefs=JSON.parse(localStorage.getItem('closetlint.import-preferences.v1')||'{}')||{}}catch(e){}
  var end=todayStr(),start=new Date(end+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-6);
  return {step:step||'hub',route:setupStorage().direct&&prefs.route==='direct'?'direct':'file',method:'emails',store:setupText(prefs.store,120),from:start.toISOString().slice(0,10),through:end,count:10,links:'',page:'',pageKind:'orders',ownership:'decide',notes:'',text:'',rows:[],busy:false,filter:'all',fileName:'',loaded:false,message:'',loadError:'',copyMessage:'',batch:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)};
}
function setupScopeError(s){
  if(!Number.isInteger(Number(s.count))||Number(s.count)<1||Number(s.count)>50)return 'Choose a batch size from 1 to 50.';
  if(s.method==='emails'&&(!setupValidDate(s.from)||!setupValidDate(s.through)||s.from>s.through))return 'Choose valid From and Through dates, with From no later than Through.';
  if(s.method==='links'&&!s.links.trim())return 'Add at least one product link.';
  if(s.method==='links'){try{s.links.split('\n').filter(function(x){return x.trim()}).forEach(setupURL)}catch(e){return e.message}}
  if(s.method==='orders'&&s.page){try{setupURL(s.page)}catch(e){return e.message}}
  return '';
}
function setupSummary(s){
  var source=s.method==='emails'?'Check '+(s.store||'my selected stores')+' order emails from '+s.from+' through '+s.through+' (both dates, all day).':s.method==='orders'?'Read my selected '+(s.pageKind==='wishlist'?'wishlist':'order-history')+' page'+(s.page?' at '+s.page:'')+'.':s.method==='links'?'Work from the product links I selected.':'Work from the photos, screenshots, or list I attach in this conversation.';
  return source+' Start with about '+s.count+' pieces. '+(s.route==='direct'?'Add verified new pieces to the wardrobe used by this Closet Lint installation, and report anything you cannot finish.':'Prepare an import file for me to review in Closet Lint.');
}
function setupPrompt(method){
  var s=setupSession||setupNewSession('scope');if(method&&method!==s.method)s=Object.assign({},s,{method:method});
  var common=setupSummary(s)+'\n\n'+(typeof window!=='undefined'&&window.location&&window.location.origin?'Closet Lint installation address: '+window.location.origin+(window.location.pathname||'/')+'. This address identifies the installation; it is not a wardrobe-folder path.\n\n':'')+(s.method==='links'?s.links+'\n\n':'')+(s.method==='emails'?'Use your email connector if available. The date range is inclusive; translate the end into the following day if your search uses an exclusive upper boundary. Choose the email account in our conversation. ':'')+
    'Use only sources and tools I authorize. My notes below can restrict tools further (for example, Gmail connector only). If a source or tool is unavailable, report it and ask before substituting another. Do not modify emails, purchases, orders, or store wishlists. Separate actual purchases from ads and recommendations.\n\n'+
    'These pieces are '+(s.ownership==='decide'?'to be classified as owned or wishlist from evidence; ask me when unclear':s.ownership)+'. Ask about uncertain ownership, sizes, prices, and variants together. Refunds and return notices do not prove that I no longer own a piece: I may keep, repair, or use it. Never remove, hide, stash, or change ownership automatically from a refund. Do not add cancelled purchases as owned without evidence I have them. Keep distinct variants separate; do not infer pieces from order quantity alone. Unknown values stay blank. Use only confirmed USD item prices, with no guessed discounts or conversions.\n\n'+
    'Check for existing matches where you have wardrobe access; otherwise let Closet Lint review matches when I load the file. Prefer full-size photos of the exact variant, with model and isolated views where useful. A source link is not a saved photo. Keep originals; label AI-generated views recast. Save at most 12 photos per piece. Do not invent appearance, measurements, or listing details. Keep a concise name and the original listing title separately.\n\n'+
    'Keep addresses, payment details, order numbers, raw email content, and private account/order URLs out of the import. Public product links are appropriate.\n\n';
  if(s.notes.trim())common+='My additional instructions (including any source-tool restrictions):\n'+s.notes.trim()+'\n\n';
  if(s.route==='direct')return common+
    'Verify the existing Closet Lint app folder and actual wardrobe data folder on the computer running this installation. A browser address is not a data-folder path. Read docs/ASSISTANT-IMPORT.md in that app folder, use tools/import_pieces.py --schema for current fields, check the photo setup, and preview before applying. Never edit the database directly. Save clear, authorized additions with the supported importer; ask about unresolved choices. Keep the same batch ID, manifest, files, and options for a retry. Pause if the destination is unclear. If you cannot access this wardrobe, prepare the browser-compatible import file described below instead and say nothing was saved directly.\n\n'+setupFileContract()+
    '\n\nReport actual committed additions, ownership changes, saved photos, existing matches, non-wardrobe items skipped, order updates only, and unresolved items separately. Do not claim shipping or refund updates were saved in Closet Lint; it does not have order tracking. Tell me when to refresh.';
  return common+setupFileContract()+'\n\nReturn a downloadable .json file if possible, with a short readable summary outside the file. If files are unavailable, put the valid JSON in one clearly separated block. Supply separate photo files with clear piece labels when remote image links are unavailable. Do not claim the pieces have been added to Closet Lint. Report missing photos, non-wardrobe items skipped, order updates only, and unresolved items separately.';
}
function setupFileContract(){
  return 'For a browser import, use closet-lint-import/v1 with a pieces array. Example:\n'+JSON.stringify({format:'closet-lint-import/v1',pieces:[{name:'Black ribbed tee',category:'Tops',subcategory:'Tees',status:'owned',size:'',retailer:'',url:'',price:null,currency:'USD',date:'',variant:'',originalTitle:'',colors:[],seasons:[],styles:[],looks:[],images:[{url:'https://example.com/photo.jpg',kind:'isolated'}],photoFile:''}]},null,2)+
    '\nDo not use that example photo URL. Use real public HTTPS image URLs the browser can download, or leave images empty and name a separate attachment in photoFile. Browser imports do not unpack local images[].file paths or ZIP photo bundles. The first view becomes the main photo. Use up to 12 views: isolated, model, scene, flatlay, display, detail, unclassified, or recast. Keep aspect ratios; do not upscale. Use 1–50 pieces and a JSON file under 1 MB.\n\nAllowed categories and subcategories:\n'+JSON.stringify(SUBS)+'\nAllowed field values:\n'+JSON.stringify(setupTagFields().map(function(d){return {field:d.key,values:d.vocab,multiple:d.multi}}))+'\nOptional layering fields: labAs = top/layer/either/under; layerNeed = none/under/over/either; weight = thin/regular/thick. Use supported values only when evidenced.';
}
function setupLabel(text,input){return el('label',{class:'setup-field'},el('span',{text:text}),input);}
function setupSelect(label,values,value,onchange){var s=el('select',{'aria-label':label,onchange:function(){onchange(s.value)}});values.forEach(function(pair){s.appendChild(el('option',{value:pair[0],text:pair[1],selected:pair[0]===value}))});return s;}
function setupButton(text,click,primary){return el('button',{class:'btn'+(primary?' primary':''),type:'button',text:text,onclick:click,disabled:!!setupSession.busy});}
function setupInput(s,key,label,type){var n=el('input',{type:type||'text',value:s[key],maxlength:type==='date'?null:'2000','aria-label':label,'data-setup-focus':key,oninput:function(){s[key]=n.value;setupScopePreview()}});return setupLabel(label,n);}
function setupGo(step){setupSession.confirm=null;setupSession.message='';setupSession.step=step;drawSetup();}
function setupScopePreview(){var n=$('setup-scope-preview');if(n)n.textContent=setupSummary(setupSession);}
function setupFinish(route,then){
  if(needDb())return;var s=setupSession;s.busy=true;drawSetup({keep:true});
  state.db.collection('profile').doc('onboarding').set(Object.assign({},state.profile.onboarding||{},{version:1,started:true,route:route})).then(function(){s.busy=false;setupCloseNow();if(then)then()}).catch(function(){s.busy=false;s.message='Your starting point could not be saved. Please try again.';drawSetup({keep:true})});
}
function openSetup(){
  if(!setupSession)setupSession=setupNewSession('start');
  var d=$('setup-wizard');if(!d.open){setupSession.launcher=document.activeElement;d.showModal()}drawSetup();
}
function openImport(){if(!setupSession)setupSession=setupNewSession('hub');else if(setupSession.step==='start')setupSession.step='hub';openSetup();}
function setupCloseNow(){
  var s=setupSession,d=$('setup-wizard'),launcher=s&&s.launcher;
  if(window.ClosetLintRoutes&&window.ClosetLintRoutes.cleanDialog)window.ClosetLintRoutes.cleanDialog(d);
  d.close();setupSession=null;if(launcher&&launcher.isConnected)launcher.focus();
}
function setupHasDraft(s){return !!(s&&(s.loaded||(s.text||'').trim()));}
function setupRequestClose(){
  var s=setupSession;if(!s||s.busy)return;
  var c=setupCounts(s.rows);
  if(s.step!=='done'&&setupHasDraft(s)){s.confirm={kind:'close',partial:!!(c.added+c.owned)};drawSetup({keep:true});return;}
  if(s.step==='start'||s.firstUse){setupFinish(s.step==='start'?'browse':'assistant');return}setupCloseNow();
}
function setupConfirm(body,actions){
  var s=setupSession,c=setupCounts(s.rows),partial=s.confirm.partial;
  if(s.confirm.kind==='refresh'){body.append(el('h3',{text:'You have unsaved edits'}),el('p',{text:'Refreshing reloads your closet from storage. Unsaved edits will be discarded.'}));var keep=setupButton('Keep editing',function(){s.confirm=null;drawSetup({keep:true})});keep.id='setup-keep-reviewing';actions.append(keep,setupButton('Discard edit and refresh',function(){return setupReload(true)}));return;}
  body.appendChild(el('h3',{text:partial?'Close with '+c.remaining+' changes unsaved?':'Discard this review?'}));
  body.appendChild(el('p',{text:partial?(c.added+c.owned)+' saved changes stay in your closet. To finish the rest later, load the file again; saved pieces will be checked as possible matches.':(s.rows.length||(s.preview||[]).length?'You loaded '+(s.rows.length||(s.preview||[]).length)+' pieces. ':'Your prepared text is still here. ')+'Nothing has been saved. Closing discards this review, but does not change your import file.'}));
  var keep=setupButton('Keep reviewing',function(){s.confirm=null;drawSetup({keep:true})});keep.id='setup-keep-reviewing';actions.append(keep,setupButton(partial?'Close anyway':'Discard draft',setupCloseNow));
}
function drawSetup(options){
  options=options||{};var d=$('setup-wizard'),s=setupSession;if(!s)return;
  var oldBody=d.querySelector('.setup-body'),scroll=oldBody?oldBody.scrollTop:0,active=document.activeElement,key=active&&active.getAttribute('data-setup-focus'),selection=active&&typeof active.selectionStart==='number'?[active.selectionStart,active.selectionEnd]:null;
  var opened=[];if(options.keep)d.querySelectorAll('details[open][data-setup-detail]').forEach(function(n){opened.push(n.dataset.setupDetail)});
  var titles={start:'Let’s add your first pieces',hub:'Import pieces',scope:'What are you bringing in?',handoff:s.route==='direct'?'Ask your assistant to add these pieces':'Ask your assistant for an import file',load:'Bring in your prepared batch',review:'Review your pieces',saving:'Review your pieces',recovery:'Some pieces are saved',done:'Your pieces are saved'};
  if(s.step==='done'){var c=setupCounts(s.rows);titles.done=c.remaining?'Some pieces are saved':c.added+c.owned?'Your pieces are saved':'Nothing new to add';}
  d.textContent='';var shell=el('div',{class:'setup-shell'}),body=el('div',{class:'setup-body'}),actions=el('footer',{class:'setup-actions'});
  shell.appendChild(el('header',{class:'setup-head'},el('div',null,el('p',{class:'setup-eyebrow',text:s.step==='start'?'GET STARTED':'IMPORT PIECES'}),el('h2',{id:'setup-title',text:titles[s.step]})),el('button',{class:'btn',type:'button','aria-label':'Close import',text:'✕',disabled:s.busy,onclick:setupRequestClose})));
  if(setupStorage().note)body.appendChild(el('p',{class:'setup-note',text:setupStorage().note}));
  if(!['start','hub'].includes(s.step)){
    var counts=setupCounts(s.rows);body.appendChild(el('div',{class:'setup-status'},el('span',{text:(s.step==='done'?'Saved to: ':'Saves to: ')+setupStorage().label}),el('span',{id:'setup-saved-count',text:s.route==='direct'?'Saved from this screen: nothing':'Saved so far: '+(counts.added+counts.owned?counts.added+' added · '+counts.owned+' marked owned':'nothing')})));
  }
  var status=el('p',{id:'setup-live',class:'setup-live',role:'status','aria-live':'polite',text:s.message||''});body.appendChild(status);
  if(s.confirm)setupConfirm(body,actions);
  else if(s.step==='start')setupDrawStart(body,actions);
  else if(s.step==='hub')setupDrawHub(body,actions);
  else if(s.step==='scope')setupDrawScope(body,actions);
  else if(s.step==='handoff')setupDrawHandoff(body,actions);
  else if(s.step==='load')setupDrawLoad(body,actions);
  else if(s.step==='review')setupDrawReview(body,actions);
  else if(s.step==='saving'||s.step==='recovery')setupDrawRecovery(body,actions);
  else if(s.step==='done')setupDrawDone(body,actions);
  shell.append(body,actions);d.appendChild(shell);setupFitViewport();d.setAttribute('aria-busy',String(s.busy));
  if(window.ClosetLintRoutes&&window.ClosetLintRoutes.trackDialog)window.ClosetLintRoutes.trackDialog(d,function(){return setupSession&&setupHasDraft(setupSession)&&setupSession.step!=='done'?'loaded-review':''},function(){return !!(setupSession&&setupSession.busy)});
  // Registration's baseline must precede a loaded draft, so route changes guard it too.
  if(window.ClosetLintRoutes&&window.ClosetLintRoutes.markImportDirty)window.ClosetLintRoutes.markImportDirty(d,!!(setupHasDraft(s)&&s.step!=='done'));
  if(options.keep){body.scrollTop=scroll;opened.forEach(function(v){var n=d.querySelector('[data-setup-detail="'+v+'"]');if(n)n.open=true});}
  var focus=s.confirm?$('setup-keep-reviewing'):options.keep&&key?d.querySelector('[data-setup-focus="'+key+'"]'):null;
  if(focus){focus.focus({preventScroll:true});if(selection&&focus.setSelectionRange&&focus.type!=='number')try{focus.setSelectionRange(selection[0],selection[1])}catch(e){}}
  else if(!options.keep){var h=$('setup-title');h.tabIndex=-1;h.focus({preventScroll:true});body.scrollTop=0;}
}
function setupDrawStart(body,actions){
  body.appendChild(el('p',{text:'Start with a few favorites. You can bring in the rest whenever you’re ready.'}));
  var routes=el('div',{class:'setup-routes'});
  [['📷','Add a piece myself','Take a photo, upload one, or add the details you know.',function(){setupFinish('manual',openAdd)}],['📬','Get help from my assistant','Use order emails, links, photos, or a list to prepare a small batch.',function(){setupSession.firstUse=true;setupGo('hub')}]].forEach(function(r){routes.appendChild(el('button',{class:'setup-option',type:'button',onclick:r[3]},el('strong',{class:'setup-route-title'},el('span',{class:'menu-emoji','aria-hidden':'true',text:r[0]}),r[1]),el('span',{text:r[2]})))});
  if(window.ClosetLintRuntime&&window.ClosetLintRuntime.openRestore)routes.appendChild(el('button',{class:'setup-option',type:'button',onclick:function(){setupCloseNow();window.ClosetLintRuntime.openRestore()}},el('strong',{text:'📥 Restore full backup'}),el('span',{text:'Bring back a wardrobe you already saved. The restore tool explains what will be replaced.'})));
  body.append(routes,el('p',{class:'fine',text:'Import pieces stays in ☰ → Utilities whenever you want it.'}));actions.appendChild(setupButton('Browse first',function(){setupFinish('browse')}));
}
function setupDrawHub(body,actions){
  var s=setupSession,storage=setupStorage();body.appendChild(el('p',{text:'Your assistant can add pieces directly if it can access your wardrobe folder. Otherwise, bring back a file and review it here.'}));
  var recent=el('section',{class:'setup-note'},el('h3',{text:'Prepare a recent-order check'}),el('p',{text:'Prepares a request for your assistant. It doesn’t search your email.'}));
  recent.appendChild(el('div',{class:'setup-field-grid'},setupInput(s,'store','Store (or leave blank for Any store)'),setupInput(s,'from','From','date'),setupInput(s,'through','Through','date'),setupLabel('Route',setupSelect('Recent-order route',(storage.direct?[['direct','Assistant adds directly']]:[]).concat([['file','Import file, review here']]),s.route,function(v){s.route=v}))));
  recent.append(setupButton('Prepare check',function(){s.method='emails';if(setupScopeError(s)){s.message=setupScopeError(s);drawSetup({keep:true});return}setupRemember(s);setupGo('handoff')}),el('p',{class:'fine',text:'Store and route are remembered as a convenience, not a record of completed imports. A little overlap with your last range is fine; review catches possible matches.'}));
  if(!s.firstUse)body.appendChild(recent);var routes=el('div',{class:'setup-options'});
  var direct=el('section',{class:'setup-option'},el('p',{class:'setup-eyebrow',text:'YOUR ASSISTANT SAVES DIRECTLY'}),el('h3',{text:'Have my assistant add pieces'}),el('p',{text:'For a local assistant such as Codex or Claude Code, with permission to open your wardrobe folder and run the importer on the computer running Closet Lint.'}));
  if(storage.direct)direct.append(setupButton('Prepare a request',function(){s.route='direct';setupGo('scope')}),el('p',{class:'fine',text:'Needs access to the computer running Closet Lint. A phone chat on its own doesn’t have it.'}));
  else direct.appendChild(el('p',{class:'fine',text:'Direct file imports cannot reach this browser’s storage. Use an import file to add pieces here. An importer on another computer saves to a different wardrobe.'}));
  var file=el('section',{class:'setup-option'},el('p',{class:'setup-eyebrow',text:'YOU REVIEW HERE FIRST'}),el('h3',{text:'Bring back an import file'}),el('p',{text:'Ask your assistant to prepare a batch, then load it here, check the pieces, and save them.'}),setupButton('Prepare a request',function(){s.route='file';setupGo('scope')}),setupButton('I already have a file',function(){s.route='file';s.loadBack='hub';setupGo('load')}),el('p',{class:'fine',text:'Use a ChatGPT or Claude chat that can return JSON text or a file, including on your phone. Copying text works even if file downloads aren’t available.'}));
  routes.append(direct,file);body.append(routes,el('details',null,el('summary',{text:'Which should I choose?'}),el('p',{text:'For direct imports, use Codex in a local workspace or Claude Code on the computer running Closet Lint, and grant access to the wardrobe folder. A paid chat subscription, an uploaded file, or an email connection does not by itself grant access to that folder. For an ordinary ChatGPT or Claude conversation, choose an import file or pasted JSON instead. Closet Lint can’t check the assistant’s permissions. A phone can control a local assistant through its own remote-access feature, if one is already set up.'})));
  if(s.firstUse)actions.appendChild(setupButton('← Back',function(){setupGo('start')}));actions.appendChild(setupButton('Close',setupRequestClose));
}
function setupDrawScope(body,actions){
  var s=setupSession;
  body.appendChild(setupLabel('Route',setupSelect('Import route',(setupStorage().direct?[['direct','Have my assistant add pieces']]:[]).concat([['file','Bring back an import file']]),s.route,function(v){s.route=v;setupScopePreview()})));
  var methods=el('fieldset',{class:'setup-source'},el('legend',{text:'Your assistant will work from'}));
  [['emails','Order emails'],['orders','Orders or a wishlist page'],['links','Product links'],['files','Photos, screenshots, or a list']].forEach(function(m){methods.appendChild(el('button',{class:'chip',type:'button','aria-pressed':String(s.method===m[0]),'data-setup-focus':'method-'+m[0],onclick:function(){s.method=m[0];drawSetup({keep:true})},text:m[1]}))});body.appendChild(methods);
  if(s.method==='emails'){
    body.appendChild(el('div',{class:'setup-field-grid'},setupInput(s,'store','Store (or leave blank for Any store)'),setupInput(s,'from','From','date'),setupInput(s,'through','Through','date')));
    var ranges=el('div',{class:'setup-inline'});[7,30].forEach(function(days){ranges.appendChild(setupButton('Past '+days+' days',function(){s.through=todayStr();var start=new Date(s.through+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-days+1);s.from=start.toISOString().slice(0,10);drawSetup({keep:true})}))});
    body.append(ranges,el('p',{class:'fine',text:'Includes both dates, all day. Your assistant uses its own email connection. Choose the account there.'}));
  }else if(s.method==='orders')body.append(setupLabel('Page type',setupSelect('Page type',[['orders','Orders'],['wishlist','Wishlist']],s.pageKind,function(v){s.pageKind=v;if(v==='wishlist')s.ownership='wishlist';setupScopePreview()})),setupInput(s,'page','Page link (optional)'),el('p',{class:'fine',text:'Open the page with your assistant, or give it screenshots.'}));
  else if(s.method==='links'){var links=el('textarea',{rows:'5','aria-label':'Links, one per line','data-setup-focus':'links',oninput:function(){s.links=links.value;setupScopePreview()}});links.value=s.links;body.appendChild(setupLabel('Links, one per line',links));}
  else body.appendChild(el('p',{text:'Attach your source files in the assistant conversation.'}));
  if(s.method!=='emails')body.appendChild(setupLabel('These pieces are',setupSelect('Ownership',[['decide','Let me decide'],['owned','Owned'],['wishlist','Wishlist']],s.ownership,function(v){s.ownership=v;setupScopePreview()})));
  var count=setupInput(s,'count','Start with about this many pieces','number');count.querySelector('input').min='1';count.querySelector('input').max='50';body.append(count,el('p',{class:'fine',text:'Up to 50 pieces per file. Start with about 10.'}));
  var notes=el('textarea',{rows:'3','aria-label':'Anything else to tell your assistant?','data-setup-focus':'notes',placeholder:'Clothes and accessories only. I sometimes keep refunded items. Gmail connector only.',oninput:function(){s.notes=notes.value}});notes.value=s.notes;
  body.append(el('details',{'data-setup-detail':'notes'},el('summary',{text:'Anything else to tell your assistant?'}),setupLabel('Additional instructions',notes)),el('aside',{class:'setup-request-preview'},el('strong',{text:'Your request will say…'}),el('p',{id:'setup-scope-preview',text:setupSummary(s)})),el('p',{class:'fine',text:'Nothing is saved on this screen. Next: copy the request for your assistant.'}));
  actions.append(setupButton('← Back',function(){setupGo('hub')}),setupButton('Prepare request',function(){s.message=setupScopeError(s);if(s.message){drawSetup({keep:true});var bad=$('setup-live');bad.tabIndex=-1;bad.focus();return}setupRemember(s);s.copyMessage='';setupGo('handoff')},true));
}
async function setupCopyRequest(){
  var s=setupSession;
  try{await navigator.clipboard.writeText(setupPrompt());if(setupSession!==s)return;s.copyMessage='Copied. Paste this into your assistant conversation.';s.copyFailed=false;drawSetup({keep:true});}
  catch(e){if(setupSession!==s)return;s.copyFailed=true;s.copyMessage='Couldn’t copy automatically. Select the request below, then copy it.';drawSetup({keep:true});var field=$('setup-request');field.closest('details').open=true;field.focus();field.select();}
}
function setupDrawHandoff(body,actions){
  var s=setupSession,direct=s.route==='direct';body.appendChild(el('p',{class:'setup-note',text:setupSummary(s)}));
  var copy=setupButton('Copy request',setupCopyRequest,true);copy.setAttribute('data-setup-focus','copy-request');body.appendChild(copy);
  body.appendChild(el('p',{class:'setup-live',role:'status',text:s.copyMessage||''}));
  var request=el('textarea',{id:'setup-request',class:'setup-code',rows:'8',readonly:true,'aria-label':'Full request for your assistant'});request.value=setupPrompt();
  body.appendChild(el('details',{class:'setup-prompt',open:!!s.copyFailed,'data-setup-detail':'request'},el('summary',{text:'Read the full request'}),request));
  if(s.copyFailed)body.appendChild(setupButton('Select request',function(){request.focus();request.select()}));
  var guide=direct?['Paste the request into your assistant conversation, and provide the selected links or files.','Let it verify the wardrobe folder, check for matches, and preview the import.','When it confirms the save, refresh Closet Lint to see the additions.']:['Paste the request into your assistant conversation, and provide the source material.','Download the prepared import file and any separate photos it provides.','Return here and choose Load import file.'];
  var list=el('ol',{class:'setup-guide'});guide.forEach(function(x){list.appendChild(el('li',{text:x}))});body.appendChild(list);
  if(direct)body.appendChild(el('p',{class:'fine',text:'Pause edits in this wardrobe while the assistant saves. Closet Lint can’t see your assistant’s progress.'}));
  else body.append(el('details',null,el('summary',{text:'What if my assistant can’t make files?'}),el('p',{text:'Copy its prepared text, then choose Paste prepared text instead on the next screen.'})),el('p',{class:'fine',text:'Using another device? Move the downloaded file to this device. Closet Lint doesn’t sync requests or files between devices.'}));
  actions.append(setupButton('← Back',function(){setupGo('scope')}),setupButton(direct?'Use an import file instead':'Use direct import instead',function(){if(!direct&&!setupStorage().direct){s.message='Direct import is unavailable for this browser’s wardrobe.';drawSetup({keep:true});return}s.route=direct?'file':'direct';setupRemember(s);s.copyMessage='';s.copyFailed=false;setupGo('handoff')}));
  if(!direct&&!setupStorage().direct)actions.lastChild.remove();
  actions.appendChild(setupButton(direct?'Refresh closet':'Load import file',function(){if(direct)return setupRefresh();else{s.loadBack='handoff';setupGo('load')}},true));actions.appendChild(setupButton('Done for now',setupRequestClose));
}
function setupRefresh(){
  var dirty=setupHasDraft(setupSession)||!!(window.ClosetLintRoutes&&window.ClosetLintRoutes.hasUnsaved&&window.ClosetLintRoutes.hasUnsaved());
  if(dirty){setupSession.confirm={kind:'refresh'};drawSetup({keep:true});return;}return setupReload(false);
}
async function setupReload(discard){
  var s=setupSession;s.busy=true;s.message='Refreshing your closet…';drawSetup({keep:true});
  try{if(window.ClosetLintRuntime&&window.ClosetLintRuntime.flush)await window.ClosetLintRuntime.flush();if(discard&&window.ClosetLintRoutes&&window.ClosetLintRoutes.prepareReload)window.ClosetLintRoutes.prepareReload();window.location.reload();}
  catch(e){s.busy=false;s.confirm=null;s.message='Could not finish pending saves. Keep this tab open and check the local service before refreshing.';drawSetup({keep:true});}
}
function setupCheckText(){
  var s=setupSession;
  if(s.reviewText&&s.reviewText!==s.text){s.rows=[];s.reviewText=null;}
  try{s.preview=setupParse(s.text,allItems());s.loadError='';s.loaded=true;s.message='Format checked · '+s.preview.length+' pieces · Ready to review';}
  catch(e){s.preview=null;s.loaded=false;s.loadError=e.message;s.message='';}
}
async function setupLoadFile(file){
  if(!file)return;var s=setupSession;var generation=(s.loadGeneration||0)+1;s.loadGeneration=generation;s.fileName=file.name;s.loadError='';s.message='';s.preview=null;
  if(/\.zip$/i.test(file.name)){s.loaded=false;s.loadError='This is a ZIP, not a piece import file. To restore a whole wardrobe, use the separate Restore backup tool. Choose the .json import file to add pieces.';drawSetup({keep:true});return;}
  if(file.size>1024*1024){s.loaded=false;s.loadError='Use an import file up to 1 MB. Nothing was loaded or cut.';drawSetup({keep:true});return;}
  try{var text=await file.text();if(setupSession!==s||s.loadGeneration!==generation)return;s.text=text;setupCheckText();}
  catch(e){if(setupSession!==s)return;s.loaded=false;s.loadError='Could not read that file. Try it again, or paste the prepared text.';}
  drawSetup({keep:true});
}
function setupDrawLoad(body,actions){
  var s=setupSession;body.appendChild(el('p',{text:'Choose the .json file your assistant prepared. Up to 50 pieces and 1 MB per file.'}));
  var picker=el('input',{id:'setup-file',class:'hide',type:'file',accept:'.json,application/json','aria-label':'Choose import file',onchange:function(){setupLoadFile(picker.files[0])}}),drop=el('div',{class:'setup-drop',ondragover:function(e){e.preventDefault()},ondrop:function(e){e.preventDefault();setupLoadFile(e.dataTransfer.files[0])}},setupButton('Choose import file',function(){picker.click()}),picker,el('p',{class:'fine',text:'Or drop a prepared .json file here.'}));body.appendChild(drop);
  if(s.fileName)body.appendChild(el('p',{text:'From: '+s.fileName}));
  if(s.loadError)body.appendChild(el('p',{class:'setup-warning',role:'alert',text:s.loadError}));
  var paste=el('textarea',{class:'setup-code',rows:'6','aria-label':'Prepared import text','data-setup-focus':'paste',oninput:function(){s.loadGeneration=(s.loadGeneration||0)+1;s.text=paste.value;s.fileName='Pasted text';s.loaded=false;s.preview=null;var review=$('setup-review-button');if(review)review.disabled=true;}});paste.value=s.text;
  body.appendChild(el('details',{open:!!s.text&&!s.fileName,'data-setup-detail':'paste'},el('summary',{text:'Paste prepared text instead'}),paste,setupButton('Check text',function(){setupCheckText();drawSetup({keep:true})})));
  if(s.preview&&s.preview.some(function(r){return r.piece.localPhotoFiles.length}))body.appendChild(el('p',{class:'setup-warning',text:'This batch refers to photo files that haven’t been attached. Attach the photos during review, or ask your assistant for a browser import file.'}));
  body.appendChild(el('p',{class:'fine',text:'Reading a file only checks it. Nothing is added until you choose pieces and save on the next screen.'}));
  var review=setupButton('Review pieces',function(){if(s.reviewText!==s.text){s.rows=setupParse(s.text,allItems());s.reviewText=s.text;s.batch=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}s.filter='all';s.loaded=true;setupGo('review')},true);review.id='setup-review-button';review.disabled=!s.preview;
  actions.append(setupButton('← Back',function(){setupGo(s.loadBack||'hub')}),review);
}
function setupChooseAction(row,action){row.action=action;row.selected=action!=='skip';row.error='';row.compare=action!=='skip';}
function setupClearPhotos(row){
  row.photo=null;row.photoUpload=null;row.imageUploads={};row.piece.photoUrl='';row.piece.photoFile='';row.piece.images=[];row.piece.localPhotoFiles=[];row.photoErrors={};row.photoDecision='none';row.error='';
}
function setupUpdateReview(){
  var s=setupSession;if(!s||s.step!=='review')return;var c=setupCounts(s.rows),save=$('setup-save-button'),first=s.rows.find(function(r){return r.selected&&!r.saved&&setupRowIssue(r)});
  var summary=$('setup-review-count');if(summary)summary.textContent=c.add+' to add · '+c.promote+' to mark owned · '+c.skipped+' skipped';
  if(save){save.textContent=setupSaveLabel(c);save.setAttribute('aria-label',setupSaveLabel(c));save.disabled=s.busy||!c.remaining||!!c.blocked;}
  var hint=$('setup-blocked');if(hint)hint.textContent=first?first.piece.name+': '+setupRowIssue(first)+' You can also unselect it.':'';
  var jump=$('setup-go-blocked');if(jump)jump.hidden=!first;
  s.rows.forEach(function(r,i){var stateNode=$('setup-row-state-'+i);if(stateNode)stateNode.textContent=r.saved?'Saved':!r.selected?'Skipped':r.error?'Not saved yet':setupRowIssue(r)||(r.duplicate?'Possible match':'Ready');});
}
function setupReviewField(row,index,key,label,type){
  var n=el(type==='textarea'?'textarea':'input',{type:type==='textarea'?null:type||'text',value:row.piece[key]||'',rows:type==='textarea'?'3':null,'aria-label':label+' for piece '+(index+1),'data-setup-focus':'row-'+index+'-'+key,oninput:function(){row.piece[key]=n.value;row.error='';setupUpdateReview()}});if(type==='textarea')n.value=row.piece[key]||'';return setupLabel(label,n);
}
function setupRowPhoto(row,index,large){
  var p=row.piece,src=row.photo?row.photo.url:p.images&&p.images.length?p.images[0].url:p.photoUrl;
  if(!src)return el('div',{class:'setup-no-photo',text:'No photo'});
  var image;try{src=row.photo?src:setupPhotoURL(src);}catch(e){row.photoErrors[src]=true;return el('div',{class:'setup-no-photo',text:'Photo unavailable'});}
  image=el('img',{src:src,alt:'Photo for '+p.name,loading:'lazy',referrerpolicy:'no-referrer',onerror:function(){if(setupSession&&setupSession.rows[index]===row&&!row.saved){row.photoErrors[src]=true;image.hidden=true;setupUpdateReview();var recovery=$('setup-photo-recovery-'+index);if(recovery)recovery.hidden=false;}}});
  return el('div',{class:large?'setup-photo-large':'setup-thumb'},image);
}
function setupPhotoRecovery(row,index){
  var issue=row.photoDecision==='needed'||Object.keys(row.photoErrors||{}).some(function(k){return row.photoErrors[k]}),box=el('div',{id:'setup-photo-recovery-'+index,class:'setup-photo-recovery',hidden:!issue});
  box.appendChild(el('p',{text:row.piece.localPhotoFiles.length?'Photo file not attached: '+row.piece.localPhotoFiles.join(', '):'A photo is missing or unavailable. Choose what to do before saving this piece.'}));
  box.append(setupAttachPhoto(row,index),setupButton('Add without a photo',function(){setupClearPhotos(row);drawSetup({keep:true})}),setupButton('Skip this piece',function(){setupChooseAction(row,'skip');drawSetup({keep:true})}));return box;
}
function setupAttachPhoto(row,index){
  var input=el('input',{type:'file',class:'hide',accept:'image/*','aria-label':'Attach a photo for piece '+(index+1),'data-setup-focus':'attach-'+index,onchange:async function(){
    var file=input.files[0];if(!file)return;if(file.size>10*1024*1024){row.error='Use an image under 10 MB.';drawSetup({keep:true});return}
    var session=setupSession;row.loadingPhoto=true;setupUpdateReview();
    try{var pic=await readImage(file);if(setupSession!==session)return;setupClearPhotos(row);row.photo=pic;row.photoDecision='attached';}
    catch(e){row.error='Could not read this photo. '+(e.message||'Try another image.');}
    finally{row.loadingPhoto=false;if(setupSession===session)drawSetup({keep:true});}
  }});
  return el('div',{class:'setup-attach'},setupButton('Attach a photo',function(){input.click()}),input);
}
function setupCompare(row,index){
  var incoming=row.piece,match=row.match,box=el('div',{class:'setup-compare'});
  box.appendChild(el('div',{class:'setup-compare-pair'},el('div',null,el('strong',{text:'From this file'}),el('p',{text:incoming.name+' · '+[incoming.variant,incoming.size].filter(Boolean).join(' · ')})),el('div',null,el('strong',{text:match?'In your closet'+(match.wish?' · Wishlist':''):'Earlier in this batch'}),match&&match.photo?el('img',{class:'setup-existing-photo',src:match.photo,alt:match.name,loading:'lazy'}):null,el('p',{text:match?match.name+' · '+[match.variant,match.size||'size not recorded'].filter(Boolean).join(' · '):'A piece with the same product or name is already listed in this batch.'}))));
  box.appendChild(el('p',{text:'Is this the same piece?'}));var choices=el('div',{class:'setup-inline'});
  [['skip','Skip'],['add','Add as a separate piece']].concat(match&&match.wish&&incoming.status==='owned'?[['owned','Mark existing piece as owned']]:[]).forEach(function(choice){choices.appendChild(el('button',{class:'btn',type:'button','aria-pressed':String(row.action===choice[0]),'data-setup-focus':'choice-'+index+'-'+choice[0],text:choice[1],onclick:function(){setupChooseAction(row,choice[0]);drawSetup({keep:true})}}))});box.appendChild(choices);
  if(match&&match.wish&&incoming.status==='owned'){
    var fields=[];try{fields=Object.keys(setupPromotion(match,incoming)).filter(function(k){return k!=='wish'&&k!=='sizeKind'})}catch(e){}
    box.appendChild(el('p',{class:'fine',text:'Marking owned keeps its photos and tags.'+(fields.length?' Fills in its blank '+fields.join(', ')+'.':'')+' Nothing new is added.'}));
  }
  return box;
}
function setupDrawRowDetails(row,index){
  var p=row.piece,box=el('div',{class:'setup-row-details'}),fields=el('div',{class:'setup-field-grid'});
  [['size','Size'],['variant','Variant / color option'],['source','Store / source'],['price','Item price (USD)'],['url','Product link'],['date','Date'],['fitsLike','Fits like']].forEach(function(pair){fields.appendChild(setupReviewField(row,index,pair[0],pair[1],pair[0]==='date'?'date':'text'))});
  fields.appendChild(setupReviewField(row,index,'originalTitle','Original listing title','textarea'));box.appendChild(fields);
  if(p.currency&&p.currency!=='USD')box.appendChild(el('p',{class:'setup-warning',text:'This file specifies '+p.currency+'. Clear the price to leave it unknown; Closet Lint supports confirmed USD prices only.'}));
  if(p.listingDetails)box.appendChild(el('details',null,el('summary',{text:'Original listing attributes'}),el('pre',{class:'setup-listing-details',text:p.listingDetails})));
  if(p.priceNote)box.appendChild(el('p',{class:'fine',text:p.priceNote}));
  var photos=el('div',{class:'setup-photo-preview'});
  (p.images||[]).forEach(function(view,i){photos.appendChild(el('div',{class:'setup-image-option'},el('img',{src:(function(){try{return setupPhotoURL(view.url)}catch(e){return ''}})(),alt:view.kind+' photo for '+p.name,loading:'lazy',referrerpolicy:'no-referrer',onerror:function(){row.photoErrors[view.url]=true;setupUpdateReview();var recovery=$('setup-photo-recovery-'+index);if(recovery)recovery.hidden=false;}}),el('span',{text:view.kind+(i===0?' · Main, first view':'')}),setupButton('Remove this view',function(){p.images.splice(i,1);delete row.photoErrors[view.url];delete (row.imageUploads||{})[view.url];row.photoUpload=null;if(p.photoUrl===view.url)p.photoUrl='';if(!p.images.length&&!p.photoUrl&&!row.photo)row.photoDecision='needed';drawSetup({keep:true})})))});
  if(row.photo||p.photoUrl||p.images.length)photos.appendChild(setupButton('Remove photos',function(){setupClearPhotos(row);row.photoDecision='needed';drawSetup({keep:true})}));
  photos.appendChild(setupAttachPhoto(row,index));box.append(photos,el('p',{class:'fine',text:'The first view becomes the main photo. Remove views you don’t want. Up to 12 photos per piece.'}));
  var tags=el('details',{'data-setup-detail':'tags-'+index},el('summary',{text:'Tags and styling'}));
  setupTagFields().forEach(function(d){
    if(d.multi){var input=el('input',{type:'text',value:(p[d.key]||[]).join(', '),'aria-label':d.label+' for piece '+(index+1),'data-setup-focus':'tags-'+index+'-'+d.key,oninput:function(){var vals=input.value.split(',').map(function(v){return v.trim()}).filter(Boolean),bad=vals.filter(function(v){return d.vocab.indexOf(v)<0});row.tagErrors=row.tagErrors||{};row.tagErrors[d.key]=bad.length?'Unknown '+d.label+' tags: '+bad.join(', '):'';if(!bad.length)p[d.key]=vals.filter(function(v,i,a){return a.indexOf(v)===i});setupUpdateReview()}});tags.appendChild(setupLabel(d.label,input));}
    else tags.appendChild(setupLabel(d.label,setupSelect(d.label+' for piece '+(index+1),[['','Not set']].concat(d.vocab.map(function(v){return [v,v]})),p[d.key]||'',function(v){p[d.key]=v;setupUpdateReview()})));
  });
  [['labAs','Wear this…',[['','Infer from tags'],['top','As a main top'],['layer','Over another top'],['either','As a main top or over another top'],['under','Under another piece only']]],['layerNeed','Needs a styling layer',[['','Infer from tags'],['none','Not required'],['under','Required underneath'],['over','Required over it'],['either','Required underneath or over']]],['weight','Fabric weight',[['','Infer from tags'],['thin','Thin / lightweight'],['regular','Medium / regular'],['thick','Thick / heavy']]]].forEach(function(d){tags.appendChild(setupLabel(d[1],setupSelect(d[1]+' for piece '+(index+1),d[2],p[d[0]]||'',function(v){p[d[0]]=v})))});box.appendChild(tags);return box;
}
function setupDrawReview(body,actions){
  var s=setupSession;body.appendChild(el('p',{text:'Choose what to add. Nothing is saved until you select Add pieces.'}));if(s.fileName)body.appendChild(el('p',{class:'fine',text:'From: '+s.fileName}));
  var c=setupCounts(s.rows);body.appendChild(el('p',{id:'setup-review-count',class:'setup-review-count',text:c.ready+' ready · '+c.matches+' possible matches · '+c.blocked+' need attention'}));
  if(c.matches)body.appendChild(el('p',{class:'fine',text:c.matches+' of these '+s.rows.length+' look like pieces already in your closet or this batch. Matches are checked each time; this browser doesn’t keep receipts for these files.'}));
  var filters=el('div',{class:'setup-inline'});[['all','All '+s.rows.length],['attention','Needs attention'],['matches','Possible matches'],['unsaved','Unsaved']].forEach(function(f){filters.appendChild(el('button',{class:'chip',type:'button','aria-pressed':String(s.filter===f[0]),'data-setup-focus':'filter-'+f[0],text:f[1],onclick:function(){s.filter=f[0];drawSetup({keep:true})}}))});body.appendChild(filters);
  var list=el('div',{class:'setup-review-list'}),shown=0;
  s.rows.forEach(function(row,index){
    if(s.filter==='attention'&&!setupRowIssue(row)&&!row.error||s.filter==='matches'&&!row.duplicate||s.filter==='unsaved'&&(row.saved||!row.selected))return;shown++;
    var p=row.piece,card=el('section',{class:'setup-review-row'+(row.saved?' setup-saved':''),id:'setup-row-'+index,'aria-label':p.name||'Piece '+(index+1)}),main=el('div',{class:'setup-review-main'});
    var check=el('input',{type:'checkbox',checked:row.selected,disabled:row.saved,'aria-label':'Include '+(p.name||'piece '+(index+1)),'data-setup-focus':'include-'+index,onchange:function(){
      if(!check.checked){if(row.duplicate)setupChooseAction(row,'skip');else row.selected=false;}
      else if(row.duplicate&&row.action==='skip'){row.compare=true;row.selected=false;}
      else {row.selected=true;row.action='add';}drawSetup({keep:true});
    }});
    var name=el('input',{type:'text',value:p.name,maxlength:'180',disabled:row.saved,'aria-label':'Name for piece '+(index+1),'data-setup-focus':'name-'+index,oninput:function(){p.name=name.value;row.error='';setupUpdateReview()}});
    main.append(el('label',{class:'setup-include'},check),setupRowPhoto(row,index),el('div',{class:'setup-review-name'},name,el('span',{class:'fine',text:[p.variant,p.size].filter(Boolean).join(' · ')||'Size and variant not recorded'})));
    var category=setupSelect('Category for piece '+(index+1),[['','Choose category']].concat(META.map(function(v){return [v,v]})),p.meta,function(v){p.meta=v;p.sub='';row.error='';drawSetup({keep:true})});category.disabled=row.saved;category.setAttribute('data-setup-focus','category-'+index);
    var sub=setupSelect('Subcategory for piece '+(index+1),[['','Not set']].concat((SUBS[p.meta]||[]).map(function(v){return [v,v]})),p.sub,function(v){p.sub=v;row.error='';setupUpdateReview()});sub.disabled=row.saved;
    var owned=setupSelect('Ownership for piece '+(index+1),[['','Choose ownership'],['owned','Owned'],['wishlist','Wishlist']],p.status,function(v){p.status=v;if(v!=='owned'&&row.action==='owned')setupChooseAction(row,'skip');row.error='';drawSetup({keep:true})});owned.disabled=row.saved;owned.setAttribute('data-setup-focus','ownership-'+index);
    main.append(el('div',{class:'setup-review-category'},setupLabel('Category',category),setupLabel('Subcategory',sub),setupLabel('Ownership',owned)),el('div',{class:'setup-row-status'},el('strong',{id:'setup-row-state-'+index,text:row.saved?'Saved':!row.selected?'Skipped':setupRowIssue(row)||(row.duplicate?'Possible match':'Ready')})));
    if(!row.saved)main.appendChild(el('button',{class:'btn small',type:'button',text:row.details?'Hide details':'Details','aria-expanded':String(!!row.details),'data-setup-focus':'details-'+index,onclick:function(){row.details=!row.details;drawSetup({keep:true})}}));else main.appendChild(el('span',{text:'Locked'}));card.appendChild(main);
    if(row.error)card.appendChild(el('p',{class:'setup-warning',role:'alert',text:row.error}));
    if(row.duplicate&&!row.saved){card.appendChild(el('button',{class:'btn small',type:'button',text:row.compare?'Hide comparison':'Compare','aria-expanded':String(row.compare),'data-setup-focus':'compare-'+index,onclick:function(){row.compare=!row.compare;drawSetup({keep:true})}}));if(row.compare)card.appendChild(setupCompare(row,index));}
    if(!row.saved&&row.action!=='owned')card.appendChild(setupPhotoRecovery(row,index));
    if(row.details&&!row.saved)card.appendChild(setupDrawRowDetails(row,index));list.appendChild(card);
  });if(!shown)list.appendChild(el('p',{text:'No pieces in this view.'}));body.appendChild(list);
  var hint=el('p',{id:'setup-blocked',class:'fine'}),go=setupButton('Go to it',function(){var i=s.rows.findIndex(function(r){return r.selected&&!r.saved&&setupRowIssue(r)}),row=$('setup-row-'+i);if(!row){s.filter='all';drawSetup({keep:true});row=$('setup-row-'+i)}if(row){row.scrollIntoView({block:'center',behavior:'smooth'});var input=row.querySelector('input,select,button');if(input)input.focus({preventScroll:true})}});go.id='setup-go-blocked';
  var save=setupButton(setupSaveLabel(c),setupSaveImport,true);save.id='setup-save-button';save.disabled=!c.remaining||!!c.blocked;
  actions.append(el('div',{class:'setup-footer-hint'},hint,go),setupButton('← Back',function(){s.preview=s.rows;s.loadBack='hub';setupGo('load')}),setupButton('Close',setupRequestClose),save);
  if(!c.remaining)actions.appendChild(setupButton(c.added+c.owned?'Finish for now':'Finish without adding',function(){setupGo('done')}));
  // Nodes are not mounted until drawSetup returns, so initialize the hint directly.
  var blocked=s.rows.find(function(r){return r.selected&&!r.saved&&setupRowIssue(r)});hint.textContent=blocked?blocked.piece.name+': '+setupRowIssue(blocked)+' You can also unselect it.':'';go.hidden=!blocked;
}
function setupDrawRecovery(body,actions){
  var s=setupSession,c=setupCounts(s.rows),saved=c.added+c.owned;
  body.appendChild(el('p',{text:s.busy?'Finishing the current save.':saved+' changes saved. '+c.remaining+' still need attention. The saved changes stay in your closet whatever you do next.'}));
  s.rows.forEach(function(r){body.appendChild(el('div',{class:'setup-result-row'},el('strong',{text:r.piece.name}),el('span',{text:r.saved?(r.action==='owned'?'Marked owned · locked':'Added · locked'):!r.selected?'Skipped':r.error?'Not saved yet: '+r.error:r.attempted?'Not saved yet':'Not attempted after the stop.'})))});
  if(s.busy)return;
  body.appendChild(el('p',{class:'fine',text:'Retry works while this window is open. After a reload, load the file again and matches will be rechecked.'}));
  actions.append(setupButton(c.owned?'Finish for now':'Finish with '+c.added+' saved',function(){setupGo('done')}),setupButton('Back to unsaved pieces',function(){s.filter='unsaved';setupGo('review')}),setupButton('Retry remaining pieces',setupSaveImport,true));
}
function setupDrawDone(body,actions){
  var s=setupSession,c=setupCounts(s.rows);body.appendChild(el('p',{class:'setup-review-count',text:c.added+' added · '+c.owned+' marked owned · '+c.skipped+' skipped'+(c.remaining?' · '+c.remaining+' not saved':'')}));
  s.rows.forEach(function(r){body.appendChild(el('div',{class:'setup-result-row'},el('strong',{text:r.piece.name}),el('span',{text:r.saved?r.action==='owned'?'Moved from Wishlist to Owned. Existing photos and tags kept.':'Added'+(r.photoDecision==='none'?' · No photo yet':''):r.selected?'Not saved':'Skipped'})))});
  body.appendChild(el('p',{text:'You can refine names, tags, and photos later.'}));
  var saved=s.rows.filter(function(r){return r.saved});if(saved.length&&saved.every(function(r){return r.action==='add'&&r.piece.status==='wishlist'})){
    body.appendChild(el('p',{text:'Wishlist pieces show when Fantasy mode is on.'}));
    if(!state.fantasy)actions.appendChild(setupButton('Turn on Fantasy mode',function(){setFantasy(true);s.message='Fantasy mode is on.';drawSetup({keep:true})}));
  }
  if(saved.length){actions.appendChild(setupButton('Review unreviewed pieces',function(){setupCloseNow();setTab('all');resetFilterState();state.review=true;renderFilters();renderGrid();setupFocusCloset()},true));body.appendChild(el('p',{class:'fine',text:'Opens Unreviewed. It can include pieces from earlier imports too.'}));}
  if(c.remaining)actions.appendChild(setupButton('Back to unsaved pieces',function(){s.filter='unsaved';setupGo('review')}));
  actions.append(setupButton('Import another batch',function(){var launcher=s.launcher;setupSession=setupNewSession('hub');setupSession.launcher=launcher;drawSetup()}),setupButton('Done',setupCloseNow));
}
function setupFocusCloset(){var main=document.querySelector('main')||$('main');if(main){main.tabIndex=-1;main.focus({preventScroll:true})}}
async function setupSaveImages(row){
  var photos=[];row.imageUploads=row.imageUploads||{};
  for(var i=0;i<(row.piece.images||[]).length;i++){
    var image=row.piece.images[i],url=setupPhotoURL(image.url),cached=row.imageUploads[url];
    if(!cached){
      try{var response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok||!/^image\//i.test(response.headers.get('content-type')||''))throw Error();var blob=await response.blob();if(blob.size>10*1024*1024)throw Error();var pic=await readImage(blob),up=await state.assets.upload(pic.blob);cached={photoId:up.id,ar:pic.ar};row.imageUploads[url]=cached;}
      catch(e){row.photoErrors=row.photoErrors||{};row.photoErrors[url]=true;throw Error('An alternate photo could not be saved. Attach a photo, remove that view, or choose Add without a photo.');}
    }
    photos.push({photoId:cached.photoId,ar:cached.ar,kind:image.kind,sourceUrl:url});
  }
  return photos;
}
async function setupSaveRow(id,record,row){
  if(row.action==='owned'){
    var current=allItems().find(function(it){return it.id===row.match.id});
    if(current&&!current.wish&&!current.removed&&row.promotionPatch){
      // A write may commit before its response is lost. Reapplying the original patch is safe.
      var retryPatch={wish:false};Object.keys(row.promotionPatch).forEach(function(k){if(k!=='wish'&&k!=='sizeKind'&&(current[k]===undefined||current[k]===null||current[k]===''))retryPatch[k]=row.promotionPatch[k]});if(retryPatch.size)retryPatch.sizeKind=row.promotionPatch.sizeKind;
      if(!await patchEdit(current,retryPatch,true))throw Error('Could not confirm this ownership change.');return;
    }
    var patch=setupPromotion(current,row.piece||{});row.promotionPatch=patch;
    if(!await patchEdit(current,patch,true))throw Error('Could not update the wishlist piece.');return;
  }
  var images=row.piece.images||[],unique=new Set(images.map(function(x){return x.url}));
  if(row.photo||(row.piece.photoUrl&&!unique.has(row.piece.photoUrl)))unique.add('__primary');
  if(unique.size>12)throw Error('Use at most 12 saved photos per piece, including the main photo.');
  if(images.length){record.photos=await setupSaveImages(row);if(!row.photo&&!row.photoUpload){var primary=record.photos[0];row.photoUpload={photoId:primary.photoId,ar:primary.ar};}}
  if((row.photo||row.piece.photoUrl)&&!row.photoUpload){
    if(!row.photo){var url=setupPhotoURL(row.piece.photoUrl);
      try{var response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok||!/^image\//i.test(response.headers.get('content-type')||''))throw Error();var blob=await response.blob();if(blob.size>10*1024*1024)throw Error();row.photo=await readImage(blob);}
      catch(e){row.photoErrors=row.photoErrors||{};row.photoErrors[url]=true;throw Error('Photo could not be downloaded. Attach a photo, choose Add without a photo, or skip this piece.');}
    }
    var up=await state.assets.upload(row.photo.blob);row.photoUpload={photoId:up.id,ar:row.photo.ar};
  }
  if(row.photoUpload){Object.assign(record,row.photoUpload);record.noPhoto=false;if(record.photos&&!record.photos.some(function(x){return x.photoId===record.photoId}))record.photos.unshift({photoId:record.photoId,ar:record.ar,kind:'unclassified'});}
  await state.db.collection('custom').doc(id).set(layerDefaults(record));
}
async function setupSaveImport(){
  var s=setupSession;if(!s||s.busy||needDb())return;
  var blocked=s.rows.find(function(r){return r.selected&&!r.saved&&setupRowIssue(r)});
  if(blocked){s.message=blocked.piece.name+': '+setupRowIssue(blocked);s.step='review';s.filter='attention';drawSetup();return;}
  s.busy=true;s.step='saving';s.message='Saving to your closet…';drawSetup();
  try{var result=await setupWriteRows(s.rows,setupSaveRow,s.batch,function(saved,failed,index,total){s.message='Saving change '+index+' of '+total+'…';drawSetup({keep:true})});
    if(result.invalid){s.step='review';s.filter='attention';s.message='Fix the marked pieces, or unselect them. Nothing was saved in this attempt.';}
    else if(result.failed){s.step='recovery';s.message='Saving stopped. Successful pieces stay saved.';}
    else{s.step='done';s.text='';s.message='';}
  }catch(e){s.step='recovery';s.message='Import paused: '+(e.message||e);}
  s.busy=false;drawSetup();
}
$('setup-wizard').addEventListener('cancel',function(e){e.preventDefault();if(setupSession&&setupSession.confirm){setupSession.confirm=null;drawSetup({keep:true})}else setupRequestClose()});
$('setup-wizard').addEventListener('close',function(){if(setupSession&&!$('setup-wizard').open){var launcher=setupSession.launcher;setupSession=null;if(launcher&&launcher.isConnected)launcher.focus()}});

function setupFitViewport(){
  var d=$('setup-wizard'),v=window.visualViewport;if(!d.open||!v)return;
  var covered=window.innerHeight-v.height-v.offsetTop;
  if(covered>120){d.style.height=Math.max(120,v.height-12)+'px';d.style.maxHeight=Math.max(120,v.height-12)+'px';d.style.marginTop=(v.offsetTop+6)+'px';d.style.marginBottom='auto';}
  else{d.style.height='';d.style.maxHeight='';d.style.marginTop='';d.style.marginBottom='';}
}
if(window.visualViewport){window.visualViewport.addEventListener('resize',setupFitViewport);window.visualViewport.addEventListener('scroll',setupFitViewport);}
