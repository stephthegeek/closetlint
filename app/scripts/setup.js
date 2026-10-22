/* Setup and small DIY imports. Embedded into the portable HTML by tools/sync_setup.py. */
var setupSession=null,setupAutoChecked=false,setupLoaded={};
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
  var seen=new Set();return value.slice(0,12).filter(function(x){return x&&typeof x==='object'&&typeof x.url==='string'}).map(function(x){return {url:setupText(x.url,2000),kind:['isolated','model','scene','flatlay','display','detail','unclassified','recast'].indexOf(x.kind)>=0?x.kind:'unclassified'}}).filter(function(x){if(!x.url||seen.has(x.url))return false;seen.add(x.url);return true});
}
function setupParse(text,existing){
  if(typeof text!=='string'||text.length>1024*1024)throw Error('Use a small JSON file (under 1 MB). Start with around ten pieces.');
  text=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  var data;try{data=JSON.parse(text)}catch(e){throw Error('That is not readable JSON yet. Ask your assistant for just the JSON export, then paste it here.');}
  if(!data||data.format!=='closet-lint-import/v1'||!Array.isArray(data.pieces))throw Error('Use the Closet Lint format from the prompt: {"format":"closet-lint-import/v1","pieces":[…]}.');
  if(!data.pieces.length||data.pieces.length>50)throw Error('Import 1–50 pieces at a time. Around ten is a good first batch.');
  var seen=(existing||[]).filter(function(it){return !it.removed}).slice();
  return data.pieces.map(function(raw,i){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Piece '+(i+1)+' must be an object with a name, category and status.');
    var p={name:setupText(raw.name,180),meta:META.indexOf(raw.category)>=0?raw.category:'',sub:setupText(raw.subcategory,80),size:setupText(raw.size,60),source:setupText(raw.retailer,120),url:setupText(raw.url,2000),status:['owned','wishlist'].indexOf(raw.status)>=0?raw.status:'',variant:setupText(raw.variant,180),photoUrl:setupText(raw.photoUrl,2000),photoFile:setupText(raw.photoFile,180),price:raw.price===null||raw.price===undefined?'':String(raw.price),colors:[],seasons:[],styles:[],looks:[]};
    if((SUBS[p.meta]||[]).indexOf(p.sub)<0)p.sub='';
    Object.assign(p,setupTags(raw));p.images=setupImageList(raw.images);p.imageSources=setupImageList(raw.imageSources);p.priceNote=setupText(raw.priceNote,300);p.originalTitle=setupText(raw.originalTitle,600);p.listingDetails=setupText(raw.listingDetails,6000);
    [['labAs',['top','layer','either','under']],['layerNeed',['none','under','over','either']],['weight',['thin','regular','thick']]].forEach(function(pair){if(pair[1].indexOf(raw[pair[0]])>=0)p[pair[0]]=raw[pair[0]]});
    var match=seen.find(function(it){return setupMatches(p,it)}),duplicate=!!match;seen.push(p);
    return {piece:p,selected:!duplicate,duplicate:duplicate,match:match&&match.id?match:null,action:'add',saved:false,id:null,error:''};
  });
}
function setupRecord(p){
  if(!p.name.trim())throw Error('Give this piece a name.');
  if(META.indexOf(p.meta)<0)throw Error('Choose a category.');
  if(['owned','wishlist'].indexOf(p.status)<0)throw Error('Choose Owned or Wishlist.');
  var kind=deriveKind(p.meta,p.sub,'clothing'),size=validateSize(kind,p.size);if(!size.ok)throw Error(size.msg);
  var record={name:p.name.trim(),meta:p.meta,sub:(SUBS[p.meta]||[]).indexOf(p.sub)>=0?p.sub:'',size:size.v,sizeKind:kind,source:p.source.trim()||'DIY import',url:setupURL(p.url),wish:p.status==='wishlist',noPhoto:true,guess:true,ar:1,date:todayStr(),colors:p.colors.slice(),seasons:p.seasons.slice(),styles:p.styles.slice(),looks:p.looks.slice()};
  if(p.price!==''){var price=Number(p.price);if(!/^\d+(?:\.\d{1,2})?$/.test(p.price)||!Number.isFinite(price)||price<0)throw Error('Price should be a USD amount like 12.50, or blank.');record.price=price;}
  Object.assign(record,setupTags(p));if(p.variant)record.variant=p.variant;if(p.priceNote)record.priceNote=p.priceNote;if(p.originalTitle)record.title=p.originalTitle;if(p.listingDetails)record.listingDetails=p.listingDetails;if(p.imageSources&&p.imageSources.length)record.imageSources=p.imageSources.map(function(x){return {url:setupPhotoURL(x.url),kind:x.kind}});
  [['labAs',['top','layer','either','under']],['layerNeed',['none','under','over','either']],['weight',['thin','regular','thick']]].forEach(function(pair){if(pair[1].indexOf(p[pair[0]])>=0)record[pair[0]]=p[pair[0]]});
  return record;
}
async function setupWriteRows(rows,write,batch,progress){
  var selected=rows.filter(function(r){return r.selected&&!r.saved}),prepared=[];
  selected.forEach(function(r){r.error='';try{if(r.action==='owned'){if(!r.match||!r.match.id||!r.match.wish)throw Error('Choose an existing wishlist match first.');prepared.push([r,{wish:false}])}else{if(r.piece.photoUrl)setupPhotoURL(r.piece.photoUrl);(r.piece.images||[]).forEach(function(x){setupPhotoURL(x.url)});prepared.push([r,setupRecord(r.piece)])}}catch(e){r.error=e.message}});
  if(selected.some(function(r){return r.error}))return {saved:0,failed:0,invalid:true};
  var saved=0,failed=0;
  for(var i=0;i<prepared.length;i++){
    var row=prepared[i][0],record=prepared[i][1];if(!row.id)row.id='imp-'+batch+'-'+rows.indexOf(row);
    record.importBatch=batch;
    try{await write(row.id,record,row);row.saved=true;row.selected=false;saved++;}catch(e){row.error=(e&&e.message?e.message+' ':'')+'Retry this piece; successful rows will not be added again.';failed++;}
    if(progress)progress(saved,failed,i+1,prepared.length);
  }
  return {saved:saved,failed:failed,invalid:false};
}
function setupPrompt(method){
  var source={emails:'Help me turn selected clothing order emails into a small wardrobe import. Use only the emails or files I explicitly select. Use your email connector if available; first show me the matching orders and let me choose a batch. Otherwise work from the screenshots or exports I supply.',orders:'Help me turn selected items from my order-history pages or wishlist into a small wardrobe import. I will open the pages for your browser extension, or provide screenshots as a fallback. Work only with the pages and items I select.',files:'Help me turn my clothing photos, screenshots or spreadsheet into a small wardrobe import. Work only with the files and items I select.'}[method];
  return source+'\n\nStart with about 10 pieces. Confirm whether I still own each piece or whether it is on my wishlist. Exclude cancelled/returned items unless I say I own them. Separate distinct variants; do not turn an order quantity into guessed separate pieces. Never invent a size, price, URL, ownership or feature. Use empty strings or empty arrays for unknown values. Use price only for a clearly known USD item price, without guessing discounts or converting currencies.\n\nReturn JSON only, using this shape:\n'+JSON.stringify({format:'closet-lint-import/v1',pieces:[{name:'Short descriptive piece name',category:'Tops',subcategory:'Tees',status:'owned',size:'',retailer:'',url:'',price:null,colors:[],seasons:[],styles:[],looks:[],pattern:[],material:[],kind:'',variant:'',photoUrl:'',photoFile:'',images:[],imageSources:[],labAs:'',layerNeed:'',weight:''}]},null,2)+'\n\nAllowed categories and subcategories:\n'+JSON.stringify(SUBS)+'\nColors: '+Object.keys(COLORS).join(', ')+'. Seasons: '+SEASONS.join(', ')+'. Occasions (styles): '+STYLES.join(', ')+'. Aesthetics (looks): '+LOOKS.join(', ')+'. Use these exact values only when supported by the source; leave uncertain tags empty.\n\nNo account credentials, names, addresses, payment details, order numbers, email headers or full emails in the export. Optional photoUrl must be a public https product image, never a tracking URL or account/order link. Alternatively photoFile can name a local image I will attach during review. Leave both blank if unavailable. If both isolated and on-model photos are available, images can contain up to 12 objects {url,kind} where kind is isolated, model, scene, flatlay, display, detail or unclassified. Prefer both a full-size model/scene view and a full-size isolated view when available. Do not substitute gallery thumbnails when a larger version exists. Verify downloaded pixel dimensions; preserve aspect ratio and cap the longest edge at 1600px without upscaling. Put the preferred main photo first. imageSources can preserve other gallery URLs for later. Never claim a model size that the listing does not state; generated recast images must be explicitly labeled recast. I will review every row inside Closet Lint before saving.';
}
function openSetup(){
  if(!setupSession){var saved=state.profile.onboarding||{};setupSession={step:0,goals:Array.isArray(saved.goals)?saved.goals.slice():[],method:'emails',text:'',rows:[],busy:false,batch:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)};}
  var d=$('setup-wizard');if(!d.open)d.showModal();drawSetup();
}
function openImport(){
  if(setupSession&&setupSession.busy){openSetup();return}
  if(!setupSession||setupSession.step===0||setupSession.step===4){var saved=state.profile.onboarding||{};setupSession={step:2,goals:Array.isArray(saved.goals)?saved.goals.slice():[],method:'emails',text:'',rows:[],busy:false,batch:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}}
  else if(setupSession.step<2)setupSession.step=2;
  openSetup();
}
function setupFinish(route,then){
  if(needDb())return;
  var session=setupSession;session.busy=true;drawSetup();
  state.db.collection('profile').doc('onboarding').set({version:1,started:true,goals:session.goals.slice(),route:route}).then(function(){session.busy=false;$('setup-wizard').close();if(then)then()}).catch(function(e){session.busy=false;session.message='Your starting point could not be saved. Please try again.';drawSetup()});
}
function setupLabel(text,input){return el('label',{class:'setup-field'},el('span',{text:text}),input);}
function setupSelect(label,values,value,onchange){
  var s=el('select',{'aria-label':label,onchange:function(){onchange(s.value)}});values.forEach(function(pair){s.appendChild(el('option',{value:pair[0],text:pair[1],selected:pair[0]===value}))});return s;
}
function drawSetup(){
  var d=$('setup-wizard'),s=setupSession;d.textContent='';
  var shell=el('div',{class:'setup-shell'}),body=el('div',{class:'setup-body'}),actions=el('div',{class:'setup-actions'});
  var title=s.step===0?'What brought you here?':s.step===1?'Let’s fill your closet.':s.step===2?'A little help with the rummaging.':s.step===3?'Check what’s coming in.':'Your first batch is here.';
  shell.appendChild(el('header',{class:'setup-head'},el('div',null,el('p',{class:'setup-eyebrow',text:'🧙 SETUP WIZARD / '+(s.step<2?'0'+(s.step+1):s.step===5?'YOUR FIRST PIECES':s.step===4?'NEXT UP':'DIY IMPORT')}),el('h2',{id:'setup-title',text:title})),el('button',{class:'btn',type:'button','aria-label':'Close setup',text:'✕',disabled:s.busy,onclick:function(){d.close()}})));
  if(s.message)body.appendChild(el('p',{class:'setup-message',role:'status',text:s.message}));
  if(s.step===0){
    body.appendChild(el('p',{text:'Your clothes already have potential. What would you like a hand with? Pick as many as you like.'}));
    var goals=el('div',{class:'setup-options'});SETUP_GOALS.forEach(function(g){var on=s.goals.indexOf(g[0])>=0;goals.appendChild(el('button',{class:'setup-option',type:'button','aria-pressed':String(on),'data-setup-goal':g[0],onclick:function(){s.goals=on?s.goals.filter(function(k){return k!==g[0]}):s.goals.concat(g[0]);drawSetup();d.querySelector('[data-setup-goal="'+g[0]+'"]').focus()}},el('span',{class:'setup-option-icon','aria-hidden':'true',text:g[1]}),el('strong',{text:g[2]}),el('span',{text:g[3]})))});body.appendChild(goals);
    body.appendChild(el('p',{class:'fine',text:'This gives you a starting point. Every feature stays available, and you can change direction whenever you like.'}));
    actions.append(el('button',{class:'btn',type:'button',text:'Just let me browse',disabled:s.busy,onclick:function(){setupFinish('browse',function(){setTab('all')})}}),el('button',{class:'btn primary',type:'button',text:'Next →',disabled:s.busy,onclick:function(){s.step=1;s.message='';drawSetup()}}));
  }else if(s.step===1){
    body.appendChild(el('p',{text:'Start with a handful of favorites. Ten pieces is enough to make this feel like yours; the rest can follow.'}));
    var routes=el('div',{class:'setup-routes'});
    routes.appendChild(el('button',{class:'setup-option',type:'button',disabled:s.busy,onclick:function(){s.step=5;s.message='';drawSetup()}},el('strong',{class:'setup-route-title'},el('span',{class:'menu-emoji','aria-hidden':'true',text:'📷'}),el('span',{text:'Add a few pieces myself'})),el('span',{text:'Take a photo, upload one, or paste a product shot. Add the clothes you reach for most.'})));
    routes.appendChild(el('button',{class:'setup-option',type:'button',disabled:s.busy,onclick:function(){s.step=2;s.message='';drawSetup()}},el('strong',{class:'setup-route-title'},el('span',{class:'menu-emoji','aria-hidden':'true',text:'📬'}),el('span',{text:'Bring in emails, orders or a list'})),el('span',{text:'Use your own AI assistant to prepare a batch, then check it here before adding anything.'})));
    if(window.ClosetLintRuntime&&window.ClosetLintRuntime.openRestore)routes.appendChild(el('button',{class:'setup-option',type:'button',disabled:s.busy,onclick:function(){d.close();window.ClosetLintRuntime.openRestore()}},el('strong',{class:'setup-route-title'},el('span',{class:'menu-emoji','aria-hidden':'true',text:'📦'}),el('span',{text:'Restore my Closet Lint backup'})),el('span',{text:'Already have a full backup ZIP? Review it in the restore tool. Restoring replaces this closet and keeps a recovery copy.'})));
    body.appendChild(routes);body.appendChild(el('aside',{class:'setup-note'},el('strong',{text:'A little practice closet'}),el('p',{text:'Linty’s imaginary closet has twelve fictional pieces and simple generated illustrations. The installation guide explains how to try it in a separate sample wardrobe. StephTheGeek’s faves will be a separate collection.'})));
    actions.appendChild(el('button',{class:'btn',type:'button',text:'← Back',disabled:s.busy,onclick:function(){s.step=0;drawSetup()}}));
  }else if(s.step===5){
    title='Start with the good stuff.';shell.querySelector('h2').textContent=title;
    body.appendChild(el('p',{text:'Pick a few pieces you actually wear: two or three tops, a couple of bottoms, a layer and shoes. A phone photo is plenty. This is your closet, not a product-photography audition.'}));
    body.appendChild(el('p',{class:'setup-note',text:setupNextTip(s.goals)}));
    body.appendChild(el('p',{class:'fine',text:'Category and color make the first combinations useful. Sizes, tags and better photos can come later. Use Add piece whenever you want to bring in more.'}));
    actions.append(el('button',{class:'btn',type:'button',text:'← Back',disabled:s.busy,onclick:function(){s.step=1;drawSetup()}}),el('button',{class:'btn primary',type:'button',text:'Add my first piece',disabled:s.busy,onclick:function(){setupFinish('manual',openAdd)}}));
  }else if(s.step===2){
    body.appendChild(el('p',{text:'Your assistant does the digging; you get the final say. There’s no account connection or AI key to set up in Closet Lint for this.'}));
    var methods=el('div',{class:'chips'});[['emails','Email connector'],['orders','Browser extension'],['files','Screenshots / files']].forEach(function(m){methods.appendChild(el('button',{class:'chip',type:'button','aria-pressed':String(s.method===m[0]),'data-setup-method':m[0],onclick:function(){s.method=m[0];drawSetup();d.querySelector('[data-setup-method="'+m[0]+'"]').focus()},text:m[1]}))});body.appendChild(methods);
    var guide=s.method==='emails'?['Use the email connector in your own AI assistant to find order emails. Ask it to show the matches first, then choose a small batch. No connector? Selected screenshots or email exports work too.','Copy the prompt below. Ask for about ten pieces you still own, and check sizes and variants against the order.']:s.method==='orders'?['Open the retailer’s order history or wishlist yourself, then use your AI assistant’s browser extension to read the selected items. If you do not use an extension, give it screenshots instead.','Copy the prompt below. Choose owned or wishlist for each item; expired listings can be left without a link.']:['Give your assistant a few clothing photos, order screenshots or a spreadsheet.','Copy the prompt below. Keep unknown details blank instead of guessing.'];
    var steps=el('ol',{class:'setup-guide'});guide.concat(['Save the resulting JSON file, or copy its JSON text. Bring it back below.']).forEach(function(t){steps.appendChild(el('li',{text:t}))});body.appendChild(steps);
    var prompt=el('textarea',{'aria-label':'AI import prompt',readonly:true,rows:'7',class:'setup-code'});prompt.value=setupPrompt(s.method);
    body.appendChild(el('details',{class:'setup-prompt'},el('summary',{text:'Read the prompt'}),prompt));
    body.appendChild(el('button',{class:'btn',type:'button',text:'Copy prompt for my AI',onclick:function(){copyText(setupPrompt(s.method))}}));
    body.appendChild(el('p',{class:'fine',text:'Send only the order details you choose to your assistant. Keep addresses, payment details and order numbers out of the export. You can attach photos while reviewing the batch.'}));
    var input=el('textarea',{'aria-label':'Prepared import JSON',placeholder:'Paste the JSON your assistant prepared…',rows:'6',class:'setup-code',oninput:function(){s.text=input.value}});input.value=s.text;body.appendChild(setupLabel('Bring back your batch',input));
    var file=el('input',{type:'file',accept:'.json,application/json','aria-label':'Choose prepared JSON file',onchange:function(){var f=file.files[0];if(!f)return;if(f.size>1024*1024){s.message='That file is too large. Use a JSON batch under 1 MB.';drawSetup();return}f.text().then(function(t){s.text=t;s.message='File loaded. Review it below.';drawSetup()}).catch(function(){s.message='Could not read that file. You can paste the JSON instead.';drawSetup()})}});body.appendChild(file);
    actions.append(el('button',{class:'btn',type:'button',text:'← Back',onclick:function(){s.step=1;s.message='';drawSetup()}}),el('button',{class:'btn primary',type:'button',text:'Review batch →',onclick:function(){try{s.rows=setupParse(s.text,allItems());s.batch=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);s.step=3;s.message='';drawSetup()}catch(e){s.message=e.message;drawSetup()}}}));
  }else if(s.step===3){
    body.appendChild(el('p',{text:'Only checked pieces will be processed. Possible matches start unchecked; you choose whether to add another piece or mark a wishlist match as owned.'}));
    var count=el('p',{class:'setup-review-count',role:'status'}),save=el('button',{class:'btn primary',type:'button',disabled:s.busy,text:'Import selected pieces',onclick:setupSaveImport});
    function updateCount(){var n=s.rows.filter(function(r){return r.selected&&!r.saved}).length;count.textContent=n+' selected · '+s.rows.filter(function(r){return r.saved}).length+' already added';save.disabled=s.busy||!n||s.rows.some(function(r){return r.loadingPhoto});save.textContent=s.busy?'Saving…':'Import '+n+' selected piece'+(n===1?'':'s');}
    body.appendChild(count);
    s.rows.forEach(function(r,i){
      var p=r.piece,card=el('fieldset',{class:'setup-review-row','data-import-index':String(i),disabled:s.busy||r.saved});card.appendChild(el('legend',{text:r.saved?'✓ Added':'Piece '+(i+1)}));
      var checked=el('input',{type:'checkbox','aria-label':'Include piece '+(i+1),onchange:function(){r.selected=checked.checked;updateCount()}});checked.checked=r.selected;
      var name=el('input',{type:'text',value:p.name,maxlength:'180','aria-label':'Name for piece '+(i+1),oninput:function(){p.name=name.value}});
      card.appendChild(el('div',{class:'setup-review-name'},checked,name));
      if(r.duplicate)card.appendChild(el('p',{class:'setup-warning',text:'Possible match by product link or name, size and variant. Check it before adding another copy.'}));
      if(r.match&&r.match.wish&&p.status==='owned'){
        card.appendChild(setupLabel('What should happen?',setupSelect('Import action for piece '+(i+1),[['add','Add a separate piece'],['owned','Mark existing wishlist piece as owned']],r.action,function(v){r.action=v;r.selected=true;checked.checked=true;updateCount()})));
        card.appendChild(el('p',{class:'fine',text:'Wishlist match: '+r.match.name+'. Marking it owned keeps its existing photo and tags.'}));
      }
      var preview=el('div',{class:'setup-photo-preview'}),photo=el('input',{type:'file',accept:'image/*','aria-label':'Photo for piece '+(i+1),onchange:function(){var f=photo.files[0];if(!f)return;if(f.size>10*1024*1024){r.error='Use an image under 10 MB.';drawSetup();return}r.loadingPhoto=true;save.disabled=true;readImage(f).then(function(pic){r.photo=pic;r.photoUpload=null;r.loadingPhoto=false;r.error='';drawSetup()}).catch(function(e){r.loadingPhoto=false;r.error=e.message;drawSetup()})}});
      if((r.photo||p.photoUrl)&&!(p.images||[]).some(function(x){return x.url===p.photoUrl}) ){try{var src=r.photo?r.photo.url:setupPhotoURL(p.photoUrl);preview.appendChild(el('img',{src:src,alt:'Photo for '+p.name,referrerpolicy:'no-referrer',loading:'lazy'}))}catch(e){preview.appendChild(el('span',{text:e.message}))}}
      (p.images||[]).forEach(function(image,index){var tile=el('div',{class:'setup-image-option'},el('img',{src:(function(){try{return setupPhotoURL(image.url)}catch(e){return ''}})(),alt:image.kind+' photo for '+p.name,referrerpolicy:'no-referrer',loading:'lazy'}),el('span',{class:'fine',text:image.kind+(index===0?' · main':'')}),el('button',{class:'btn small',type:'button',text:'Remove this view',onclick:function(){p.images.splice(index,1);if(p.photoUrl===image.url)p.photoUrl='';r.photoUpload=null;drawSetup()}}));preview.appendChild(tile)});
      if(p.photoFile)preview.appendChild(el('span',{class:'fine',text:'Attach: '+p.photoFile}));
      if(r.photo||p.photoUrl||(p.images||[]).length)preview.appendChild(el('button',{class:'btn small',type:'button',text:'Remove photo',onclick:function(){r.photo=null;r.photoUpload=null;p.photoUrl='';p.photoFile='';p.images=[];drawSetup()}}));
      preview.appendChild(photo);card.appendChild(preview);
      if(r.error)card.appendChild(el('p',{class:'setup-warning',role:'alert',text:r.error}));
      var sub=setupSelect('Subcategory for piece '+(i+1),[['','Not set']].concat((SUBS[p.meta]||[]).map(function(v){return [v,v]})),p.sub,function(v){p.sub=v});
      var cat=setupSelect('Category for piece '+(i+1),[['','Choose category']].concat(META.map(function(v){return [v,v]})),p.meta,function(v){p.meta=v;p.sub='';sub.textContent='';[['','Not set']].concat((SUBS[v]||[]).map(function(x){return [x,x]})).forEach(function(x){sub.appendChild(el('option',{value:x[0],text:x[1]}))})});
      var status=setupSelect('Ownership for piece '+(i+1),[['','Choose status'],['owned','Owned'],['wishlist','Wishlist']],p.status,function(v){p.status=v;if(v!=='owned')r.action='add';drawSetup()});
      card.appendChild(el('div',{class:'setup-field-grid'},setupLabel('Category',cat),setupLabel('Owned or wishlist?',status)));
      var fields=el('div',{class:'setup-field-grid'},setupLabel('Subcategory',sub));
      [['size','Size'],['variant','Variant / color option'],['source','Store / source'],['price','Item price (USD)'],['url','Product link'],['photoUrl','Product-photo URL']].forEach(function(pair){var field=el('input',{type:'text',value:p[pair[0]],'aria-label':pair[1]+' for piece '+(i+1),oninput:function(){p[pair[0]]=field.value}});fields.appendChild(setupLabel(pair[1],field))});
      var tags=el('details',null,el('summary',{text:'Tags & styling'}));
      setupTagFields().forEach(function(d){if(d.multi){var input=el('input',{type:'text',value:(p[d.key]||[]).join(', '),'aria-label':d.label+' for piece '+(i+1),onchange:function(){var vals=input.value.split(',').map(function(v){return v.trim()}).filter(Boolean),bad=vals.filter(function(v){return d.vocab.indexOf(v)<0});input.setCustomValidity(bad.length?'Unknown tags: '+bad.join(', '):'');if(bad.length){input.reportValidity();return}p[d.key]=vals.filter(function(v,i,a){return a.indexOf(v)===i})}});tags.appendChild(setupLabel(d.label,input))}
        else tags.appendChild(setupLabel(d.label,setupSelect(d.label+' for piece '+(i+1),[['','Not set']].concat(d.vocab.map(function(v){return [v,v]})),p[d.key]||'',function(v){p[d.key]=v})))
      });
      [['labAs','Wear this…',[['','Infer from tags'],['top','As a main top'],['layer','Over another top'],['either','As a main top or over another top'],['under','Under another piece only']]],['layerNeed','Sheer / needs a styling layer',[['','Infer from tags'],['none','Not required'],['under','Required underneath'],['over','Required over it'],['either','Required — underneath or over']]],['weight','Fabric weight',[['','Infer from tags'],['thin','Thin / lightweight'],['regular','Medium / regular'],['thick','Thick / heavy']]]].forEach(function(row){tags.appendChild(setupLabel(row[1],setupSelect(row[1]+' for piece '+(i+1),row[2],p[row[0]]||'',function(v){p[row[0]]=v}))) });
      card.appendChild(el('details',null,el('summary',{text:'Size, variant & source'}),fields));if(p.listingDetails)card.appendChild(el('details',null,el('summary',{text:'Original listing attributes'}),el('pre',{class:'setup-listing-details',text:p.listingDetails})));if(p.priceNote)card.appendChild(el('p',{class:'fine',text:p.priceNote}));card.appendChild(tags);body.appendChild(card);
    });updateCount();
    body.appendChild(el('p',{class:'fine',text:'New pieces stay Unreviewed. Attached photos are saved with them; pieces without photos get a placeholder. Wishlist matches keep their existing details.'}));
    actions.append(el('button',{class:'btn',type:'button',disabled:s.busy,text:s.rows.some(function(r){return r.saved})?'Done for now':'← Back',onclick:function(){s.message='';s.step=s.rows.some(function(r){return r.saved})?4:2;drawSetup()}}),save);
  }else if(s.step===4){
    var added=s.rows.filter(function(r){return r.saved}).length;
    body.appendChild(el('p',{text:added+' piece'+(added===1?' is':'s are')+' saved. Open a card to check the details and make it yours.'}));
    body.appendChild(el('p',{class:'setup-note',text:setupNextTip(s.goals)}));
    body.appendChild(el('p',{class:'fine',text:'Your next batch is waiting under ☰ → Utilities → Import pieces. Outfit suggestions and packing do not require an AI subscription.'}));
    actions.appendChild(el('button',{class:'btn primary',type:'button',text:'See my pieces →',disabled:s.busy,onclick:function(){setupFinish('diy',function(){s.step=1;s.rows=[];s.text='';setTab('all');state.review=true;state.photo='';state.wishOnly=false;setFantasy(true);renderFilters();renderGrid()})}}));
  }
  if(s.busy){shell.setAttribute('aria-busy','true');body.appendChild(el('p',{role:'status',text:'Saving to your closet…'}));}
  shell.append(body,actions);d.appendChild(shell);
  var heading=shell.querySelector('h2');heading.tabIndex=-1;heading.focus();
}
function setupNextTip(goals){
  if(goals.indexOf('wishlist')>=0)return 'Once a few owned pieces are in, add one thing you’re considering buying. Turn on Fantasy mode to see wishlist pieces beside your clothes.';
  if(goals.indexOf('trips')>=0)return 'Start with pieces you would pack together. Once they have photos and useful tags, the Trip Wizard can build looks around them.';
  if(goals.indexOf('outfits')>=0)return 'Add a couple of tops and bottoms, or a dress, then open the Outfit Lab. Photos and color tags help the first suggestions feel like your clothes.';
  return 'Browse what you already own. Favorite the keepers and mark a forgotten piece “Wear more” to bring it back into rotation.';
}
async function setupSaveImages(row){
  var photos=[];row.imageUploads=row.imageUploads||{};
  for(var i=0;i<(row.piece.images||[]).length;i++){
    var image=row.piece.images[i],url=setupPhotoURL(image.url),cached=row.imageUploads[url];
    if(!cached){var response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok||!/^image\//i.test(response.headers.get('content-type')||''))throw Error('An alternate photo could not be downloaded. Remove that view or attach a local image.');
      var blob=await response.blob();if(blob.size>10*1024*1024)throw Error('An alternate photo is over 10 MB.');
      var pic=await readImage(blob),up=await state.assets.upload(pic.blob);cached={photoId:up.id,ar:pic.ar};row.imageUploads[url]=cached;
    }
    photos.push({photoId:cached.photoId,ar:cached.ar,kind:image.kind,sourceUrl:url});
  }
  return photos;
}
async function setupSaveRow(id,record,row){
  if(row.action==='owned'){
    var current=allItems().find(function(it){return it.id===row.match.id});
    if(!current||current.removed)throw Error('That wishlist piece is no longer available.');
    if(!await patchEdit(current,{wish:false},true))throw Error('Could not update the wishlist piece.');
    return;
  }
  if((row.piece.images||[]).length+((row.photo||row.piece.photoUrl)?1:0)>10)throw Error('Use at most 10 photos per piece, including the main photo.');
  if((row.piece.images||[]).length){record.photos=await setupSaveImages(row);if(!row.photo&&!row.photoUpload){var primary=record.photos[0];row.photoUpload={photoId:primary.photoId,ar:primary.ar};}}
  if((row.photo||row.piece.photoUrl)&&!row.photoUpload){
    if(!row.photo){var response=await fetch(setupPhotoURL(row.piece.photoUrl),{credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok||!/^image\//i.test(response.headers.get('content-type')||''))throw Error('Photo could not be downloaded. Attach an image file or remove its URL.');
      var blob=await response.blob();if(blob.size>10*1024*1024)throw Error('Photo is over 10 MB. Attach a smaller image.');row.photo=await readImage(blob);
    }
    var up=await state.assets.upload(row.photo.blob);row.photoUpload={photoId:up.id,ar:row.photo.ar};
  }
  if(row.photoUpload){Object.assign(record,row.photoUpload);record.noPhoto=false;if(record.photos&&!record.photos.some(function(x){return x.photoId===record.photoId}))record.photos.unshift({photoId:record.photoId,ar:record.ar,kind:'unclassified'});}
  await state.db.collection('custom').doc(id).set(layerDefaults(record));
}
async function setupSaveImport(){
  var s=setupSession;if(s.busy||needDb()||s.rows.some(function(r){return r.loadingPhoto}))return;
  var invalid=[].find.call(document.querySelectorAll('#setup-wizard input'),function(input){var fieldset=input.closest('[data-import-index]');return (!fieldset||s.rows[+fieldset.dataset.importIndex].selected)&&!input.disabled&&!input.checkValidity()});if(invalid){invalid.reportValidity();return}
  s.busy=true;s.message='';drawSetup();
  try{var result=await setupWriteRows(s.rows,setupSaveRow,s.batch);
    if(result.invalid)s.message='A few selected pieces need attention. Fix the marked fields or uncheck those pieces.';
    else if(result.failed)s.message=result.saved+' saved; '+result.failed+' need attention. Successful rows are locked. Retry the rest.';
    else{s.step=4;s.text='';}
  }catch(e){s.message='Import paused: '+(e.message||e)}
  s.busy=false;drawSetup();
}
$('setup-wizard').addEventListener('cancel',function(e){if(setupSession&&setupSession.busy)e.preventDefault()});
