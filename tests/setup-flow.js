// Synthetic DOM and wardrobe only: exercise the actual setup/import event handlers.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(__dirname+'/../app/scripts/setup.js','utf8');
function fixture({local=true,pub=false,items=[]}={}){
 let document;
 class Node{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.listeners={};this.dataset={};this.style={};this.value='';this.open=false;this.checked=false;this.disabled=false;this.hidden=false;this.scrollTop=0;this.isConnected=true;}
  get id(){return this.attrs.id||''}set id(v){this.attrs.id=v}get className(){return this.attrs.class||''}set className(v){this.attrs.class=v}
  get classList(){return {contains:k=>this.className.split(' ').includes(k),add:k=>{this.className+=' '+k},remove:k=>{this.className=this.className.split(' ').filter(x=>x!==k).join(' ')}}}
  set textContent(v){this.text=String(v);this.children=[]}get textContent(){return (this.text||'')+this.children.map(n=>n.textContent).join('')}
  setAttribute(k,v){this.attrs[k]=String(v);if(k==='value')this.value=String(v);if(['open','checked','disabled','hidden'].includes(k))this[k]=v!==false;if(k==='type')this.type=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;}
  getAttribute(k){return this.attrs[k]??null}hasAttribute(k){return k in this.attrs}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
  append(...nodes){nodes.flat().filter(x=>x!=null).forEach(n=>this.appendChild(n))}
  appendChild(n){if(typeof n==='string'){let t=new Node('text');t.text=n;n=t}n.parentNode=this;this.children.push(n);return n}
  get lastChild(){return this.children.at(-1)}remove(){this.parentNode.children=this.parentNode.children.filter(x=>x!==this)}
  matches(sel){const tag=sel.match(/^[a-z][\w-]*/i),id=sel.match(/#([\w-]+)/),cls=[...sel.matchAll(/\.([\w-]+)/g)].map(x=>x[1]);if(tag&&this.tagName!==tag[0].toUpperCase()||id&&this.id!==id[1]||cls.some(x=>!this.classList.contains(x)))return false;for(const m of sel.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){const actual=this.getAttribute(m[1]);if(m[1]==='open'){if(!this.open)return false}else if(actual===null||m[2]!==undefined&&actual!==m[2])return false;}return true}
  querySelectorAll(sel){const result=[];const visit=n=>{n.children.forEach(x=>{if(sel.split(',').some(s=>x.matches(s.trim())))result.push(x);visit(x)})};visit(this);return result}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null}closest(sel){return this.matches(sel)?this:this.parentNode?.closest(sel)||null}
  focus(){document.activeElement=this}select(){this.selectedText=true}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b}scrollIntoView(){this.scrolled=true}
  showModal(){this.open=true}close(){this.open=false;this.fire('close')}
  async fire(type,event={}){event.preventDefault??=()=>{};event.target??=this;for(const fn of this.listeners[type]||[])await fn(event)}
 }
 const root=new Node('body'),dialog=new Node('dialog');dialog.id='setup-wizard';root.appendChild(dialog);const launcher=new Node('button');root.appendChild(launcher);const main=new Node('main');root.appendChild(main);
 document={documentElement:root,activeElement:launcher,querySelector:s=>root.querySelector(s),querySelectorAll:s=>root.querySelectorAll(s)};
 const el=(tag,attrs={},...kids)=>{const n=new Node(tag);for(const [k,v] of Object.entries(attrs||{})){if(k==='text')n.textContent=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)n.setAttribute(k,v)}n.append(...kids);return n};
 const $=id=>root.querySelector('#'+id),writes=[],patches=[],preferences={};let failId='',reloaded=0,dirty=false,clipboardFails=false;const directInfo={instance:'synthetic',name:'Synthetic wardrobe',computer:'Synthetic laptop',appFolder:'/synthetic/app',dataFolder:'/synthetic/wardrobe',batchId:'synthetic-batch',manifest:'/tmp/synthetic/import.json',shell:'terminal',checkCommand:'python check --expected-instance synthetic',schemaCommand:'python schema',previewCommand:'python preview --expected-instance synthetic',applyCommand:'python apply --expected-instance synthetic',statusCommand:'python status',partPreviewCommand:'python import --request-id synthetic-batch --part 1',partApplyCommand:'python import --request-id synthetic-batch --part 1 --apply',finishCommand:'python import --finish-request complete',pauseCommand:'python import --finish-request needs-input',ready:true,setupVerified:false,saved:false};
 const c={photoThumbnail:src=>src,Blob,TextDecoder,DecompressionStream,URL,Set,TextEncoder,AbortController,setTimeout,clearTimeout,console,Promise,Date,Math,document,el,$,META:['Tops','Bottoms','Jewelry'],SUBS:{Tops:['Tees'],Bottoms:['Pants'],Jewelry:['Earrings']},COLORS:{black:'#000',silver:'#aaa'},SEASONS:['fall'],STYLES:['casual'],LOOKS:['gothic'],deriveKind:m=>m==='Jewelry'?'gauge':'clothing',validateSize:(k,v)=>({ok:true,v}),todayStr:()=> '2026-10-22',localStorage:{getItem:k=>preferences[k]||null,setItem:(k,v)=>{preferences[k]=v}},navigator:{clipboard:{writeText:async()=>{if(clipboardFails)throw Error('denied')}}},state:{pub,profile:{onboarding:{started:true,goals:['outfits']}},fantasy:false,edits:{},assets:{upload:async()=>({id:'synthetic-photo'})},db:{collection:name=>({doc:id=>({set:async value=>{if(id===failId)throw Error('Disk full');writes.push({name,id,value})}})})}},allItems:()=>items,layerDefaults:x=>x,needDb:()=>false,readImage:async()=>({url:'blob:synthetic',blob:{},ar:.8}),fetch:async()=>({ok:true,headers:{get:()=> 'image/png'},blob:async()=>({size:100,type:'image/png'})}),patchEdit:async(it,patch)=>{if(it.id===failId)return false;patches.push(patch);Object.assign(it,patch);return true},setTab(){},resetFilterState(){},setFantasy:v=>{c.state.fantasy=v},renderGrid(){},renderFilters(){},openAdd(){},window:{location:{reload:()=>{reloaded++}},ClosetLintRuntime:{flush:async()=>{},importSetup:async batch=>({...directInfo,batchId:batch}),importStatus:async batch=>({...directInfo,batchId:batch})},ClosetLintRoutes:{hasUnsaved:()=>dirty,prepareReload:()=>{dirty=false},trackDialog(){},cleanDialog(){},markImportDirty(){}}}};
 if(local)c.window.ClosetLintLocal={instance:'synthetic'};vm.createContext(c);const core=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');vm.runInContext(core.slice(core.indexOf('function wardrobeIdentity(){'),core.indexOf('function initBrandLogo(){'))+'\n'+core.slice(core.indexOf('function unitsMetric(){'),core.indexOf('function openMeasurements(){')),c);c.readDisplayPrefs=()=>({icons:'femme'});c.applyDisplayPrefs=()=>{};vm.runInContext(core.slice(core.indexOf('function selectCopyField('),core.indexOf('function storedListText(')),c);vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/photo-fetch.js','utf8'),c);vm.runInContext('var _crcT=null;'+core.slice(core.indexOf('function crc32('),core.indexOf('function zipBlob(')),c);vm.runInContext(script,c);
 const button=(text,scope=dialog)=>{const n=scope.querySelectorAll('button').find(x=>x.textContent.replace(/^📋 /,'')===text);assert(n,'button: '+text);return n};
 return {directInfo,c,dialog,writes,patches,preferences,$,el,button,items,get reloaded(){return reloaded},set failId(v){failId=v},set dirty(v){dirty=v},set clipboardFails(v){clipboardFails=v}};
}
const piece={name:'Synthetic tee',category:'Tops',subcategory:'Tees',status:'owned',size:'M',colors:['black'],url:'https://example.com/tee',photoUrl:'https://images.example.com/tee.jpg',date:'2026-10-10'};
const json=pieces=>JSON.stringify({format:'closet-lint-import/v1',pieces});
(async()=>{
 const photoTools=fixture();photoTools.c.window.ClosetLintLocal.thumbnails=true;
 let photoAvailable=true;photoTools.c.window.ClosetLintRuntime.backgroundStatus=async()=>({available:photoAvailable});
 const photoBox=photoTools.c.setupPhotoTools(),photoCheck=photoTools.button('Check photo tools',photoBox),ready=photoBox.querySelector('.setup-confirmed');
 assert.equal(ready.hidden,true,'readiness is not claimed before checking');
 await photoCheck.fire('click');await new Promise(r=>setImmediate(r));assert.equal(ready.hidden,false);
 photoAvailable=false;await photoCheck.fire('click');await new Promise(r=>setImmediate(r));assert.equal(ready.hidden,true,'a failed readiness check clears the checkmark');
 photoTools.c.window.ClosetLintRuntime.backgroundStatus=async()=>{throw Error('offline')};
 await photoCheck.fire('click');await new Promise(r=>setImmediate(r));assert.equal(ready.hidden,true);assert.equal(photoCheck.disabled,false,'checking remains repeatable after an error');
 const z=fixture(),zipTools=require('./setup-zip');z.c.openImport();z.c.setupGo('load');
 const archive=Object.assign(zipTools.makeZip([['import.json',zipTools.manifest({subcategory:'Tees',photoFile:'photos/top.png'})],['photos/top.png',zipTools.png]]),{name:'import.zip'});
 await z.c.setupLoadFile(archive);assert.equal(z.c.setupSession.loaded,true);assert.equal(z.writes.length,0,'opening ZIP does not save pieces');assert.match(z.c.setupSession.message,/1 matched photo\b/);
 await z.button('Review pieces').fire('click');assert.equal(z.c.setupSession.rows[0].photoDecision,'source');await z.c.setupSaveImport();assert.equal(z.c.setupSession.step,'done');assert.equal(z.dialog.querySelector('.setup-actions').lastChild.textContent,'Review unreviewed pieces','completion primary action follows secondary choices');const record=z.writes.find(w=>w.name==='custom').value;assert.equal(record.photos.length,1);assert.equal(record.photos[0].photoId,'synthetic-photo');assert(!JSON.stringify(record).includes('blob:'),'temporary archive URLs never enter saved piece records');
 z.c.setupCloseNow();assert.equal(z.c.setupSession,null);
 const missing=fixture();missing.c.openImport();missing.c.setupGo('load');await missing.c.setupLoadFile(Object.assign(zipTools.makeZip([['import.json',zipTools.manifest({photoFile:'missing.png'})]]),{name:'missing.zip'}));await missing.button('Review pieces').fire('click');assert.equal(missing.$('setup-save-button').disabled,true,'missing ZIP photos require an explicit review decision');
 console.log('ZIP workflow: load, matched preview, no early writes, normal photo save, cleanup, and missing-photo blocking pass.');
 const existing={id:'existing-owned',name:'My existing tee',meta:'Tops',sub:'Tees',size:'M',wish:false,price:0,photoId:'keep',colors:['black']},reconcile=fixture({items:[existing]});reconcile.c.openImport();reconcile.c.setupGo('load');await reconcile.c.setupLoadFile({name:'reconcile.json',size:100,text:async()=>json([{...piece,name:'Mystery tee'}])});await reconcile.button('Review pieces').fire('click');await reconcile.button('Find existing piece').fire('click');
 const search=reconcile.dialog.querySelector('[data-setup-focus="match-search-0"]');assert.equal(reconcile.dialog.querySelector('select[aria-label="Existing piece for Mystery tee"]').disabled,true,'match dropdown stays disabled until a search is entered');assert.match(reconcile.dialog.textContent,/Type at least 2 characters to enable/);search.value='e';await search.fire('input');assert.equal(reconcile.dialog.querySelector('select[aria-label="Existing piece for Mystery tee"]').disabled,true);search.value='existing tee';await search.fire('input');const matchSelect=reconcile.dialog.querySelector('select[aria-label="Existing piece for Mystery tee"]');assert.equal(matchSelect.disabled,false);matchSelect.value='existing-owned';await matchSelect.fire('change');assert.equal(reconcile.c.setupSession.rows[0].action,'owned');assert.equal(reconcile.c.setupSession.rows[0].selected,true);assert.equal(reconcile.button('Update existing piece').getAttribute('aria-pressed'),'true');assert.equal(reconcile.$('setup-save-button').textContent,'Update 1 existing piece');await reconcile.c.setupSaveImport();assert.equal(reconcile.writes.filter(w=>w.name==='custom').length,0,'manual matching updates the chosen owned piece, without adding a duplicate');assert.equal(existing.photoId,'keep');assert.equal(existing.price,0);
 console.log('Existing-piece search: owned and wishlist pool, explicit match choice, visible comparison, and update without insertion pass.');
 const guidance=fixture();guidance.c.openImport();
 assert.equal(guidance.dialog.querySelector('.setup-source'),null,'choose an import path before choosing its source');assert.equal(guidance.dialog.querySelector('[data-setup-detail="recent-order"]').open,false,'repeat-order shortcut starts collapsed');
 await guidance.button('I already have a file').fire('click');assert.equal(guidance.c.setupSession.step,'load');assert.equal(guidance.c.setupSession.route,'file');guidance.c.setupGo('hub');
 await guidance.button('Prepare a request').fire('click');assert.equal(guidance.c.setupSession.step,'scope');assert.equal(guidance.c.setupSession.route,'file');
 await guidance.button('Orders or a wishlist page').fire('click');const wishlistType=guidance.dialog.querySelector('select[aria-label="Page type"]');wishlistType.value='wishlist';await wishlistType.fire('change');assert.equal(guidance.c.setupSession.ownership,'wishlist');assert.match(guidance.c.setupPrompt(),/wishlist page/);
 await guidance.button('Order emails').fire('click');assert.equal(guidance.c.setupSession.method,'emails');

 assert.equal(guidance.c.setupSession.browserHelp,false,'browser help starts off');assert.match(guidance.c.setupPrompt(),/No browser help has been requested/);
 const browserHelp=guidance.dialog.querySelector('[data-setup-focus="browser-help"]');browserHelp.checked=true;await browserHelp.fire('change');assert.equal(guidance.c.setupSession.browserHelp,true);assert.match(guidance.c.setupPrompt(),/Open product listings/);assert.match(guidance.c.setupPrompt(),/Continue through that scope/);assert.match(guidance.c.setupPrompt(),/only small email thumbnails/);
 await guidance.button('Orders or a wishlist page').fire('click');const pageType=guidance.dialog.querySelector('select[aria-label="Page type"]');pageType.value='wishlist';await pageType.fire('change');assert.equal(guidance.c.setupSession.ownership,'wishlist');assert.match(guidance.c.setupPrompt(),/wishlist page/);assert.match(guidance.dialog.textContent,/usage allowance/);
 await guidance.button('Store data export').fire('click');assert.match(guidance.dialog.textContent,/Add the file you downloaded from the store below/);assert.match(guidance.c.setupPrompt(),/Read the store data export/);assert.match(guidance.c.setupPrompt(),/No browser help has been requested/);assert.equal(guidance.writes.length,0);
 const quality=fixture();quality.c.openImport();quality.c.setupGo('load');await quality.c.setupLoadFile({name:'photos.json',size:100,text:async()=>json([piece])});await quality.button('Review pieces').fire('click');
 const preview=quality.dialog.querySelector('.setup-thumb').querySelector('img');preview.naturalWidth=180;preview.naturalHeight=240;await preview.fire('load');assert.match(quality.$('setup-photo-quality-0').textContent,/Very small photo · 180 × 240 px/);assert.match(quality.$('setup-photo-quality-summary').textContent,/1 selected piece has/);assert.equal(quality.$('setup-save-button').disabled,false,'small photos do not block saving');assert.equal(quality.writes.length,0,'measuring a preview never saves data');
 preview.naturalWidth=400;preview.naturalHeight=599;await preview.fire('load');assert.match(quality.$('setup-photo-quality-0').textContent,/^Small photo/);preview.naturalHeight=600;await preview.fire('load');assert.equal(quality.$('setup-photo-quality-0').hidden,true);assert.equal(quality.$('setup-photo-quality-summary').hidden,true);
 quality.c.setupSession.rows[0].piece.images=[{url:'https://images.example.com/alternate.jpg',kind:'model'}];await quality.button('Details').fire('click');const alternate=quality.dialog.querySelector('.setup-image-option').querySelector('img');quality.c.setupCheckPhotoSize(quality.c.setupSession.rows[0],0,'https://images.example.com/alternate.jpg',{naturalWidth:200,naturalHeight:250},quality.dialog.querySelector('.setup-image-option').querySelector('.setup-photo-quality'));assert.match(quality.dialog.querySelector('.setup-image-option').querySelector('.setup-photo-quality').textContent,/Very small photo/);assert.match(quality.$('setup-photo-quality-summary').textContent,/1 selected piece/);
 console.log('Source guidance and photo quality: explicit browser opt-in, bounded wishlist browsing, store exports, preview dimensions, alternate views, thresholds, and nonblocking notices pass.');
 const f=fixture();f.c.openImport();assert.equal(f.c.setupSession.step,'hub');assert.equal(f.writes.length,0);
 await f.button('Set up direct import').fire('click');await Promise.resolve();assert.equal(f.c.setupSession.route,'direct');assert.equal(f.c.setupSession.step,'direct');assert.match(f.dialog.textContent,/No GitHub repository/);assert(!f.dialog.querySelectorAll('button').some(n=>n.textContent==='Continue'));assert.match(f.c.setupDirectSetupRequest(f.c.setupSession),/Verify setup only/);assert.match(f.c.setupDirectSetupRequest(f.c.setupSession),/expected-instance/);f.directInfo.setupVerified=true;await f.button('Check setup').fire('click');assert.match(f.dialog.textContent,/Setup confirmed/);assert.match(f.dialog.textContent,/ready for direct imports/);assert.equal(f.reloaded,0,'checking setup does not reload the page');assert.equal(f.dialog.querySelector('.setup-body').scrollTop,0,'setup result is brought into view');await f.button('Continue').fire('click');assert.equal(f.c.setupSession.step,'hub');await f.button('Order emails').fire('click');assert.equal(f.c.setupSession.step,'scope');
 const shortcut=fixture();shortcut.c.openImport();
 for(const [label,method,pageKind,ownership] of [['Order emails','emails','orders','decide'],['Order history','orders','orders','decide'],['Store wishlist','orders','wishlist','wishlist'],['Store data export','export','orders','decide'],['Product links','links','orders','decide'],['Photos, screenshots, or a list','files','orders','decide']]){
  await shortcut.button(label).fire('click');assert.equal(shortcut.c.setupSession.step,'scope','source shortcut opens import options immediately');assert.equal(shortcut.c.setupSession.route,'direct');assert.equal(shortcut.c.setupSession.method,method);assert.equal(shortcut.c.setupSession.pageKind,pageKind);assert.equal(shortcut.c.setupSession.ownership,ownership);shortcut.c.setupGo('hub');
 }
 await shortcut.button('Photos, screenshots, or a list').fire('click');const sourceFolder=shortcut.dialog.querySelector('[data-setup-focus="sourcePath"]');sourceFolder.value='"/synthetic/source photos/hats"';await sourceFolder.fire('input');assert.match(shortcut.c.setupPrompt(),/\/synthetic\/source photos\/hats/);await shortcut.button('Prepare request').fire('click');await Promise.resolve();assert.equal(shortcut.c.setupSession.step,'direct','handoff still requires checked setup');assert.equal(shortcut.c.setupSession.method,'files','setup keeps the selected source');shortcut.directInfo.setupVerified=true;await shortcut.button('Check setup').fire('click');await shortcut.button('Continue').fire('click');assert.equal(shortcut.c.setupSession.step,'handoff','setup continues the prepared import');assert.match(shortcut.c.setupPrompt(),/Never search unrelated temporary or clipboard folders/);assert.match(shortcut.c.setupPrompt(),/picture visible in chat may not be readable/);assert.match(shortcut.c.setupPrompt(),/\/synthetic\/source photos\/hats/);shortcut.c.setupGo('hub');await shortcut.button('Order emails').fire('click');await shortcut.button('Prepare request').fire('click');assert.equal(shortcut.c.setupSession.step,'handoff','verified setup is reused');
 const badge=fixture();badge.directInfo.setupVerified=true;badge.c.openImport();await new Promise(setImmediate);assert(badge.dialog.querySelector('.setup-confirmed'),'confirmed setup is checked when opening the hub');assert.match(badge.dialog.textContent,/Connected to Synthetic laptop/);assert.equal(badge.button('Set up direct import').disabled,false,'confirmed setup remains repeatable');badge.c.setupCloseNow();badge.c.openImport();await new Promise(setImmediate);assert(badge.dialog.querySelector('.setup-confirmed'),'confirmation returns after closing and reopening');await badge.button('Set up direct import').fire('click');await Promise.resolve();assert.equal(badge.c.setupSession.step,'direct');
 const notReady=fixture();notReady.directInfo.ready=false;notReady.directInfo.setupVerified=true;notReady.c.openImport();await notReady.button('Set up direct import').fire('click');await Promise.resolve();assert.equal(notReady.c.setupSession.directInfo.setupVerified,false);assert(!notReady.dialog.querySelectorAll('button').some(n=>n.textContent==='Continue'),'missing photo support cannot enable direct import');
 f.c.setupSession.notes='Gmail connector only';f.c.setupSession.count=4;
 await f.button('Prepare request').fire('click');assert.equal(f.c.setupSession.step,'handoff');
 assert.equal(f.dialog.querySelector('.setup-actions').lastChild.textContent,'Check import','direct handoff primary action is last');
 const request=f.c.setupPrompt();assert.match(request,/2026-10-16 through 2026-10-22/);assert.match(request,/following day/);assert.match(request,/database directly/);assert.match(request,/Expected wardrobe identity: synthetic/);assert.match(request,/python import --request-id/);assert(!request.includes('For a browser import'),'direct request excludes browser ZIP instructions');assert.match(request,/Gmail connector only/);assert.match(request,/Refunds and return notices do not prove/);
 f.clipboardFails=true;await f.button('Copy request').fire('click');await f.$('setup-request').fire('click');assert.equal(f.$('setup-request').selectedText,true);assert(!f.dialog.querySelectorAll('button').some(n=>n.textContent==='Select request'));assert.equal(f.$('setup-request').closest('details').open,true);assert.equal(f.writes.length,0);
 const manual=f.$('setup-request');assert.equal(manual.hasAttribute('readonly'),false,'manual copy uses a normal editable text field');manual.value='Edited request for my assistant';f.clipboardFails=false;
 await f.button('Copy request').fire('click');assert.equal(f.$('setup-request'),manual,'copy status must not rebuild the text field');assert.match(f.$('setup-copy-status').textContent,/Copied to clipboard/);
 await f.button('Use an import file instead').fire('click');assert.equal(f.c.setupSession.route,'file');assert.equal(f.c.setupSession.count,4);assert.equal(f.c.setupSession.notes,'Gmail connector only');assert.equal(f.dialog.querySelector('.setup-actions').lastChild.textContent,'Load import file','file handoff primary action is bottom-right in DOM order');
 await f.button('Load import file').fire('click');await f.c.setupLoadFile(Object.assign(require('./setup-zip').makeZip([['backup.json',JSON.stringify({collections:{}})]]),{name:'backup.zip'}));assert.match(f.c.setupSession.loadError,/restore/i);assert.equal(f.$('setup-review-button').disabled,true);
 await f.c.setupLoadFile({name:'batch.json',size:20,text:async()=>json([piece])});assert.equal(f.$('setup-review-button').disabled,false);
 await f.button('Review pieces').fire('click');assert.equal(f.c.setupSession.step,'review');assert.equal(f.$('setup-save-button').disabled,false);assert.equal(f.writes.length,0);
 const name=f.dialog.querySelector('[data-setup-focus="name-0"]');name.value='Edited name';await name.fire('input');
 await f.button('← Back').fire('click');await f.button('Review pieces').fire('click');assert.equal(f.c.setupSession.rows[0].piece.name,'Edited name','Back keeps draft edits');
 await f.button('Close').fire('click');assert(f.c.setupSession.confirm);assert.equal(f.c.document.activeElement.id,'setup-keep-reviewing');await f.dialog.fire('cancel');assert.equal(f.c.setupSession.confirm,null);assert.equal(f.dialog.open,true);
 f.c.setupSession.busy=true;await f.dialog.fire('cancel');assert.equal(f.dialog.open,true,'Escape cannot interrupt a save');f.c.setupSession.busy=false;
 f.c.setupCloseNow();assert.equal(f.dialog.open,false);assert.equal(f.c.setupSession,null);
 console.log('Import flow: route switching, scoped requests, clipboard fallback, file checks, retained edits, and close/save guards pass.');

 const wish={id:'wish',name:'Silver earrings',meta:'Jewelry',sub:'Earrings',wish:true,size:'',price:0,date:'',url:'',photoId:'keep',photos:[{photoId:'keep'}],colors:['silver']};
 const g=fixture({items:[wish]});g.c.openImport();g.c.setupSession.route='file';g.c.setupSession.step='load';g.c.drawSetup();
 await g.c.setupLoadFile({name:'mixed.json',size:200,text:async()=>json([piece,{...piece,name:'Silver earrings',category:'Jewelry',subcategory:'Earrings',size:'',colors:['silver'],url:'https://example.com/silver',price:9},{...piece,name:'Second tee',url:'https://example.com/second'}])});await g.button('Review pieces').fire('click');
 assert.equal(g.c.setupSession.rows[1].selected,true);assert.equal(g.c.setupSession.rows[1].action,'owned');await g.button('Skip').fire('click');const include=g.dialog.querySelector('[data-setup-focus="include-1"]');include.checked=true;await include.fire('change');assert.equal(g.c.setupSession.rows[1].selected,false);assert.equal(g.c.setupSession.rows[1].compare,true);
 await g.button('Mark existing piece as owned').fire('click');assert.equal(g.c.setupSession.rows[1].selected,true);assert.equal(g.$('setup-save-button').textContent,'Add 2 pieces and update 1 existing piece');
 g.failId='wish';await g.$('setup-save-button').fire('click');assert.equal(g.c.setupSession.step,'recovery');assert.equal(g.writes.length,1,'stop at first failed write');assert.equal(g.c.setupSession.rows[2].attempted,false);assert.equal(g.c.setupSession.rows[0].saved,true);
 g.failId='';await g.button('Retry remaining pieces').fire('click');assert.equal(g.c.setupSession.step,'done');assert.equal(g.writes.length,2,'saved first row not repeated');assert.equal(g.patches.length,1);assert.equal(wish.wish,false);assert.equal(wish.price,0,'zero price is not blank');assert.equal(wish.photoId,'keep');assert.equal(wish.date,'2026-10-10');assert.equal(g.writes[0].value.date,'2026-10-10','browser preserves acquisition date');
 assert.equal(g.c.state.fantasy,false);await g.button('Done').fire('click');assert.equal(g.c.setupSession,null);
 console.log('Import saves: explicit match choices, blank-only promotion, acquisition dates, stop-on-error, and retry without repeating saves pass.');

 const h=fixture({local:false,pub:true});h.c.openImport();assert.equal(h.c.setupStorage().direct,false);assert.match(h.dialog.textContent,/do not change the public demo/);assert(!h.dialog.textContent.includes('Needs access to the computer'));
 h.c.setupSession.step='load';h.c.drawSetup();await h.c.setupLoadFile({name:'local.json',size:20,text:async()=>json([{...piece,photoUrl:'',images:[{file:'photos/tee.jpg',kind:'isolated'}]}])});await h.button('Review pieces').fire('click');assert.equal(h.$('setup-save-button').disabled,true);await h.button('Add without a photo').fire('click');assert.equal(h.$('setup-save-button').disabled,false);assert.equal(h.c.setupSession.rows[0].piece.localPhotoFiles.length,0);
 h.c.setupSession.rows[0].piece.meta='';h.c.setupUpdateReview();assert.equal(h.$('setup-save-button').disabled,true);h.c.setupSession.rows[0].selected=false;h.c.setupUpdateReview();assert.equal(h.c.setupCounts(h.c.setupSession.rows).blocked,0,'unselected invalid row never blocks others');
 console.log('Public/file review: accurate destination, local-photo recovery, explicit no-photo choice, and selected-row validation pass.');

 const direct=fixture();direct.c.openImport();await direct.button('Set up direct import').fire('click');await Promise.resolve();const pendingBatch=direct.c.setupSession.batch;
 assert.equal(direct.c.setupPendingBatch(),pendingBatch,'pending batch survives closing and reopening');assert(!direct.dialog.textContent.includes('Local import setup verified'));
 direct.directInfo.setupVerified=true;await direct.button('Check setup').fire('click');await direct.button('Continue').fire('click');await direct.button('Order emails').fire('click');await direct.button('Prepare request').fire('click');assert.equal(direct.c.setupSession.step,'handoff');
 await direct.button('Check import').fire('click');assert.match(direct.dialog.textContent,/Nothing saved/);assert(!direct.dialog.querySelectorAll('button').some(n=>n.textContent==='Load saved additions'));
 direct.c.window.ClosetLintRuntime.importStatus=async()=>{throw Error('Unavailable')};await direct.button('Check import').fire('click');assert.match(direct.dialog.textContent,/Could not verify/);assert.equal(direct.c.setupSession.batch,pendingBatch,'retry keeps batch identity');assert.equal(direct.c.setupSession.directInfo.setupVerified,false);
 direct.c.window.ClosetLintRuntime.importSetup=async batch=>({...direct.directInfo,batchId:batch,instance:'wrong'});await direct.button('Retry installation check').fire('click');assert.match(direct.dialog.textContent,/wardrobe changed/);assert.equal(direct.c.setupSession.directInfo.setupVerified,false);
 direct.c.window.ClosetLintRuntime.importSetup=async batch=>({...direct.directInfo,batchId:batch});await direct.button('Retry installation check').fire('click');
 direct.c.window.ClosetLintRuntime.importStatus=async batch=>({...direct.directInfo,batchId:batch,saved:true,report:{added:2,promoted:1,skipped:3,photosSaved:4,results:[{name:'Synthetic tee',action:'add'}]}});await direct.button('Check import').fire('click');assert.match(direct.dialog.textContent,/2 added · 1 ownership updated · 3 skipped · 4 photos saved/);assert.match(direct.dialog.textContent,/saved batch receipt/);
 direct.c.setupCloseNow();direct.c.openImport();assert.equal(direct.c.setupSession.batch,pendingBatch,'reopening resumes receipt lookup');
 console.log('Direct setup: explicit local guidance, checked identity/readiness, separate contracts, pending-batch recovery, absent receipts, failures, mismatches, and saved results pass.');
 const k=fixture();const originalReload=k.c.window.location.reload;k.c.window.location.reload=function(){assert.equal(k.c.setupSession.busy,false,'reload must not trigger the import busy guard');originalReload()};k.c.openImport();await new Promise(setImmediate);k.c.setupSession.route='direct';k.directInfo.setupVerified=true;k.directInfo.saved=true;k.directInfo.report={added:1,promoted:0,skipped:0,photosSaved:1,results:[]};k.c.setupSession.directInfo=k.directInfo;k.c.setupSession.step='handoff';k.c.drawSetup();k.dirty=true;await k.button('Load saved additions').fire('click');assert.equal(k.reloaded,0);assert.equal(k.c.setupSession.confirm.kind,'refresh');await k.button('Keep editing').fire('click');assert.equal(k.reloaded,0);await k.button('Load saved additions').fire('click');await k.button('Discard edit and refresh').fire('click');assert.equal(k.reloaded,1);assert.equal(k.c.setupSession.busy,false,'a canceled browser reload leaves the import unlocked');assert(!k.dialog.textContent.includes('Refreshing your closet'),'canceled navigation leaves no stuck progress message');assert.equal(k.button('Done').disabled,false);await k.button('Done').fire('click');assert.equal(k.c.setupSession,null,'Done still closes the saved import after canceled navigation');
 const reloadFailure=fixture();reloadFailure.c.openImport();await new Promise(setImmediate);reloadFailure.c.window.ClosetLintRuntime.flush=async()=>{throw Error('Disk full')};await reloadFailure.c.setupReload(false);assert.equal(reloadFailure.c.setupSession.busy,false);assert.equal(reloadFailure.reloaded,0);assert.match(reloadFailure.dialog.textContent,/Could not finish pending saves/);

 const a=fixture();a.c.openSetup();assert.equal(a.c.setupSession.step,'start');assert(!a.dialog.textContent.includes('What brought you here'));await a.button('Your closet').fire('click');await a.button('Skip for now').fire('click');await a.button('Continue').fire('click');await a.button('Browse first').fire('click');assert.equal(a.writes[0].name,'profile');assert.equal(a.writes[0].value.started,true);assert.deepEqual(a.writes[0].value.goals,['outfits']);
 const race=fixture();race.c.openImport();race.c.setupGo('load');let resolveFile;
 const pending=race.c.setupLoadFile({name:'old.json',size:10,text:()=>new Promise(resolve=>{resolveFile=resolve})});
 await race.c.setupLoadFile(Object.assign(new Blob(['broken ZIP']),{name:'new.zip'}));resolveFile(json([piece]));await pending;
 assert.equal(race.c.setupSession.preview,null,'a stale file read cannot replace a newer rejected selection');assert.match(race.c.setupSession.loadError,/ZIP/);
 const paste=race.dialog.querySelector('[data-setup-focus="paste"]');paste.value='{ incomplete';await paste.fire('input');race.c.setupRequestClose();assert(race.c.setupSession.confirm,'closing protects pasted text even before validation');
 const lost={...wish,wish:true,size:'',price:0,url:'',date:'',photoId:'keep'};const retry=fixture({items:[lost]});const retryRow=retry.c.setupParse(json([{...piece,name:lost.name,category:'Jewelry',subcategory:'Earrings',colors:['silver'],size:'',url:'https://example.com/from-import'}]),[lost])[0];retryRow.selected=true;retryRow.action='owned';let first=true;
 retry.c.patchEdit=async(it,patch)=>{Object.assign(it,patch);if(first){first=false;throw Error('Response lost')}return true};
 let lostResult=await retry.c.setupWriteRows([retryRow],retry.c.setupSaveRow,'lost-response');assert.equal(lostResult.failed,1);assert.equal(lost.wish,false);
 lost.url='https://example.com/edited-later';lostResult=await retry.c.setupWriteRows([retryRow],retry.c.setupSaveRow,'lost-response');assert.equal(lostResult.saved,1);assert.equal(lost.url,'https://example.com/edited-later','retry never overwrites a now-populated field');
 console.log('Import recovery: stale file reads, unvalidated text drafts, and ownership retries after a lost response pass.');
 const timeout=fixture();timeout.c.PHOTO_FETCH_TIMEOUT_MS=5;timeout.c.openImport();timeout.c.setupGo('load');await timeout.c.setupLoadFile({name:'timeout.json',size:500,text:async()=>json([0,1,2].map(i=>({...piece,name:'Timeout piece '+i,url:'https://example.com/timeout-'+i,photoUrl:'https://img.example.com/'+i+'.png'})))});await timeout.button('Review pieces').fire('click');let fetched=0;
 timeout.c.fetch=async()=>{if(++fetched===2)return new Promise(()=>{});return {ok:true,blob:async()=>({size:100,type:'image/png'})}};
 await timeout.c.setupSaveImport();assert.equal(timeout.c.setupSession.step,'recovery');assert.equal(timeout.c.setupSession.busy,false);assert.equal(timeout.writes.length,1);assert(timeout.c.setupSession.rows[0].saved);assert.match(timeout.c.setupSession.rows[1].error,/timed out/);assert.equal(fetched,2,'later rows wait for recovery');
 timeout.c.fetch=async()=>({ok:true,blob:async()=>({size:100,type:'image/png'})});await timeout.button('Retry remaining pieces').fire('click');assert.equal(timeout.writes.length,3,'retry skips the saved row and saves each remaining row once');assert.equal(timeout.c.setupSession.step,'done');
 console.log('Import timeout: saved rows stay locked, later rows wait, and retry finishes without duplicates.');
 console.log('Setup/refresh: optional goals removed from the critical path, old goals preserved, and explicit discard required for unsaved edits.');
})().catch(e=>{console.error(e);process.exit(1)});

(async()=>{
 const f=fixture(),c=f.c,r=c.window.ClosetLintRuntime,stored={files:[],draft:{}},blobs=new Map();let failUpload=true,failChoices=false,uploadCalls=0;
 r.importSources=async()=>JSON.parse(JSON.stringify(stored));
 r.importSourceBlob=async(batch,id)=>blobs.get(id);
 r.importSourceUpload=async(batch,id,file)=>{
  uploadCalls++;if(!stored.files.some(x=>x.id===id))stored.files.push({id,name:file.name,mime:file.type,size:file.size,path:'/synthetic/import/sources/'+id+'.png',role:'item',steering:'',isolate:false});blobs.set(id,file);
  if(failUpload){failUpload=false;throw Error('Connection lost after upload')}
  return JSON.parse(JSON.stringify(stored));
 };
 r.importSourceChoices=async(batch,value)=>{if(failChoices)throw Error('Disk full');stored.draft=value.draft;stored.files.forEach(x=>Object.assign(x,value.files.find(y=>x.id===y.id)));return stored};
 r.importSourceRemove=async(batch,id)=>{stored.files=stored.files.filter(x=>x.id!==id);return stored};
 c.openImport();await new Promise(setImmediate);c.setupSession.method='files';c.setupSession.route='direct';c.setupSession.productPhotos=true;c.setupGo('scope');
 const photo=Object.assign(new Blob(['synthetic'],{type:'image/png'}),{name:'navy hat.png'});
 await c.setupAddSources([photo]);let source=c.setupSession.sources[0];const sourceId=source.id,batchId=c.setupSession.batch;
 assert.match(source.error,/Connection lost/);assert.match(c.setupScopeError(c.setupSession),/unfinished/);
 assert.equal(source.isolate,true,'new uploads inherit the requested individual photos');source.steering='Keep the folded brim.';
 await c.setupRetrySource(source);assert.equal(c.setupSession.sources.length,1);assert.equal(stored.files.length,1);assert.equal(uploadCalls,2);assert.equal(source.id,sourceId);
 assert.equal(source.isolate,true,'upload response defaults must not reset the chosen photo work');assert.equal(source.steering,'Keep the folded brim.');
 source.isolate=true;source.steering='Deep navy, folded brim.';c.setupSourcesChanged(c.setupSession);await c.setupSaveSources(c.setupSession);
 let request=c.setupSourceRequest(c.setupSession);assert.match(request,/Deep navy, folded brim/);assert.match(request,/\/synthetic\/import\/sources/);assert.match(request,/actual image-editing tool/);assert.match(request,/including connected editors/);assert.match(request,/wait for their choice/);assert.match(request,/unavailable, declined, or fails/);assert.match(request,/one photo|one piece/);
 c.setupCloseNow();c.openImport();await new Promise(setImmediate);
 assert.equal(c.setupSession.batch,batchId);assert.equal(c.setupSession.sources[0].steering,'Deep navy, folded brim.');assert.equal(c.setupSession.method,'files');
 c.setupSession.route='file';request=c.setupSourceRequest(c.setupSession);assert.match(request,/sourceBatch/);assert.doesNotMatch(request,/\/synthetic\/import\/sources/);
 const original={name:'Navy hat',category:'Tops',subcategory:'Tees',status:'owned',images:[{sourceId,kind:'unclassified'}]};
 const text=JSON.stringify({format:'closet-lint-import/v1',sourceBatch:batchId,pieces:[original]});
 const parsed=c.setupParse(text,[]);assert.equal(parsed[0].piece.images.length,1);assert.equal(parsed[0].piece.localPhotoFiles.length,0);assert(c.setupSourceBlob(parsed[0].piece.images[0].url));assert.equal(parsed[0].productPhotoRequested,true,'an individual upload can request editing with the overall photo option off');c.setupSession.productPhotos=true;c.setupSession.sources[0].isolate=false;assert.equal(c.setupParse(text,[])[0].productPhotoRequested,false,'an upload opt-out overrides the global photo request');c.setupSession.sources[0].isolate=true;
 c.setupSession.text=text;c.setupCheckText();assert(c.setupSession.loaded);assert.equal(f.writes.length,0,'source upload and parsing never save pieces');
 assert.throws(()=>c.setupParse(text.replace(batchId,'different'),[]),/different import/);
 assert.throws(()=>c.setupParse(text.replace(sourceId,'missing'),[]),/original photo is missing/);
 failChoices=true;source=c.setupSession.sources[0];source.steering='Keep this edit';c.setupSourcesChanged(c.setupSession);assert.equal(await c.setupSaveSources(c.setupSession),false);assert.equal(source.steering,'Keep this edit');
 assert.match(c.setupScopeError(c.setupSession),/haven’t saved/);failChoices=false;assert.equal(await c.setupSaveSources(c.setupSession),true);assert.equal(stored.files[0].steering,'Keep this edit');
 await c.setupRemoveSource(source);assert.equal(stored.files.length,0);assert.equal(c.setupSession.sources.length,0);c.setupSession.completed=true;r.importSources=async()=>({files:[],draft:{}});c.setupBeginScope(c.setupSession);assert.notEqual(c.setupSession.batch,batchId,'completed imports must use a fresh batch');await new Promise(setImmediate);assert.equal(c.setupSession.sources.length,0);c.setupCloseNow();
 console.log('Shared source uploads: lost-response retry, resume, per-item editing notes, direct/file handoff, original reuse, wrong-batch blocking, and failed-choice recovery pass.');
})().catch(e=>{console.error(e);process.exitCode=1});

{
 const pathFixture=fixture(),c=pathFixture.c;
 for(const [platform,example] of [['Windows','C:\\Users\\YourName\\Pictures\\Closet'],['Darwin','/Users/yourname/Pictures/Closet'],['Linux','/home/yourname/Pictures/Closet']]){
  c.setupSession=c.setupNewSession('scope');c.setupSession.sourcesReady=true;c.setupSession.route='direct';c.setupSession.directInfo={platform,computer:'Wardrobe laptop'};c.drawSetup();
  const field=pathFixture.dialog.querySelector('[data-setup-focus="sourcePath"]');assert.equal(field.placeholder,example);assert.match(pathFixture.dialog.textContent,/Wardrobe laptop/);assert.match(pathFixture.dialog.textContent,/Copy as path/);assert.match(pathFixture.dialog.textContent,/Copy as Pathname/);
 }
 assert.equal(c.setupLocalSourcePath({sourcePath:' "C:\\Users\\Sam\\Pictures\\hat.jpg" '}),'C:\\Users\\Sam\\Pictures\\hat.jpg');
}

// All sources/routes request the same tagging pass; style judgments differ from unknown facts.
{
 const {c}=fixture();c.setupSession=c.setupNewSession('scope');
 c.setupSession.directInfo={setupVerified:true,computer:'Synthetic',appFolder:'/synthetic/app',schemaCommand:'python schema'};
 for(const route of ['direct','file'])for(const method of ['emails','orders','links','export','files']){
  c.setupSession.route=route;c.setupSession.method=method;const prompt=c.setupPrompt();
  assert(prompt.includes(c.setupTaggingRequest()),route+' / '+method+' includes the common tagging instructions');
  assert.match(prompt,/styles for Occasion/);assert.match(prompt,/looks for Aesthetic/);assert.match(prompt,/Unknown factual values/);
 }
 const vocabulary=JSON.parse(fs.readFileSync(__dirname+'/../runtime/import-vocabulary.json','utf8'));
 c.DIMS=vocabulary.fields.filter(d=>d.key!=='colors').map(d=>({...d,scope:d.categories,subs:d.subcategories}));
 const contract=c.setupFileContract();assert.match(contract,/"label":"Occasion"/);assert.match(contract,/"categories":/);assert.match(contract,/"subcategories":/);
 c.META.push('Hats');c.SUBS.Hats=['Sun hats'];
 const tags={colors:['black'],seasons:['summer'],styles:['casual'],looks:['resort'],material:['crochet'],details:['bows'],statement:'medium'};
 const rows=c.setupParse(json([{name:'Synthetic sun hat',category:'Hats',subcategory:'Sun hats',status:'owned',...tags}]),[]);
 const saved=c.setupRecord(rows[0].piece);for(const [key,value] of Object.entries(tags))assert.equal(JSON.stringify(saved[key]),JSON.stringify(value),'file import retains '+key);
 assert.equal(saved.guess,true,'tagging does not mark an AI import reviewed');
 console.log('Import tagging: common instructions across all sources/routes, labeled/scoped vocabulary, supported tags retained, and Unreviewed status pass.');
}

// Recovery copy must distinguish a stopped first write from a partial save.
{
 const f=fixture(),c=f.c;c.openImport();c.setupSession.step='recovery';
 c.setupSession.rows=c.setupParse(json([piece]),[]);c.drawSetup();
 assert.equal(f.$('setup-title').textContent,'Save paused');assert.match(f.dialog.textContent,/Nothing saved yet/);assert(f.button('Finish without adding'));
 c.setupSession.rows[0].saved=true;c.setupSession.rows[0].selected=false;c.drawSetup();
 assert.equal(f.$('setup-title').textContent,'Some pieces are saved');assert.match(f.dialog.textContent,/1 change saved/);
}

// Scope, continuation, and results are request-level, rather than a ten-piece stop.
(async()=>{
 const f=fixture(),c=f.c;c.openImport();await new Promise(setImmediate);
 assert.equal(c.setupSession.count,'');
 for(const route of ['direct','file']){
  c.setupSession.route=route;c.setupSession.directInfo={...f.directInfo,setupVerified:true};c.setupSession.sourcesReady=true;c.setupGo('scope');
  assert.equal(f.dialog.querySelector('[data-setup-focus="count"]').value,'');
  assert.match(c.setupSummary(c.setupSession),/everything within/);assert.doesNotMatch(c.setupPrompt(),/Start with about 10|Stop after the requested batch/);
  assert.match(c.setupPrompt(),/tag every new piece/);assert.match(c.setupPrompt(),/Keep multipacks as one piece record/);
  c.setupSession.count=0;assert.match(c.setupScopeError(c.setupSession),/whole-number/);c.setupSession.count=75;assert.equal(c.setupScopeError(c.setupSession),'');assert.match(c.setupSummary(c.setupSession),/up to 75/);c.setupSession.count='';
 }
 c.setupSession.route='direct';const batch=c.setupSession.batch;
 c.setupSession.directInfo={...f.directInfo,setupVerified:true,saved:true,report:{added:51,promoted:1,skipped:2,photosSaved:52,results:[]},request:{state:'needs-input',parts:[{part:1},{part:2}],nextPart:3,note:'A source needs access',cursor:'Page 3'}};
 c.setupSession.step='handoff';c.drawSetup();assert.match(f.dialog.textContent,/Import needs your input/);assert.match(f.dialog.textContent,/51 added/);assert.match(f.dialog.textContent,/2 batch receipts/);assert.equal(f.button('Copy continuation request').disabled,false,'partial results retain the continuation request');
 assert.match(c.setupPrompt(),/Do not treat saved=true alone as completion/);assert.match(c.setupPrompt(),/request.nextPart/);
 c.setupGo('hub');await f.button('Continue this request').fire('click');assert.equal(c.setupSession.step,'handoff','saved partial progress must not loop back to setup');assert.equal(c.setupSession.batch,batch);
 c.setupSession.directInfo.request.state='complete';c.drawSetup();assert.match(f.dialog.textContent,/Import complete/);assert(f.button('Start another import'));assert(!f.dialog.querySelectorAll('button').some(b=>b.textContent==='Copy request'));
 c.setupSession.directInfo.request={state:'complete',parts:[],nextPart:1,note:'No purchases in selected dates'};c.setupSession.directInfo.saved=false;c.setupSession.directInfo.report={added:0,promoted:0,skipped:0,photosSaved:0,results:[]};c.drawSetup();assert.match(f.dialog.textContent,/No purchases/);assert(f.button('Start another import'));
 c.setupSession.count=10;c.setupFreshBatch(c.setupSession);assert.equal(c.setupSession.count,'','starting a new request never carries an old piece limit');
 const g=fixture();g.c.openImport();g.c.setupSession.route='file';g.c.setupGo('load');await g.c.setupLoadFile({name:'part-1.json',size:100,text:async()=>json([piece])});await g.button('Review pieces').fire('click');await g.$('setup-save-button').fire('click');assert.equal(g.writes.length,1);
 const requestId=g.c.setupSession.batch;const sources=[{id:'original-photo',role:'item'}];g.c.setupSession.sources=sources;await g.button('Load next file').fire('click');assert.equal(g.c.setupSession.batch,requestId);assert.equal(g.c.setupSession.sources,sources,'next file retains original upload references');assert.equal(g.c.setupSession.step,'load');
 await g.c.setupLoadFile({name:'part-2.json',size:100,text:async()=>json([{...piece,name:'Next file tee',url:'https://example.com/other'}])});await g.button('Review pieces').fire('click');await g.$('setup-save-button').fire('click');assert.equal(g.writes.length,2);assert.notEqual(g.writes[0].id,g.writes[1].id,'separate numbered files cannot overwrite each other');
 console.log('Import requests: optional limits, full-scope prompts, retained tagging/manual crops, partial/zero/complete results, continuing identity, and next-file uploads pass.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Preparation options apply to every source/route, with independent photo choices.
(async()=>{
 const f=fixture(),c=f.c;c.openImport();await new Promise(setImmediate);c.setupSession.sourcesReady=true;c.setupSession.directInfo={...f.directInfo,setupVerified:true};
 assert.equal(c.setupSession.splitPacks,false);assert.equal(c.setupSession.productPhotos,false);
 for(const route of ['direct','file'])for(const method of ['emails','orders','links','export','files']){
  c.setupSession.route=route;c.setupSession.method=method;c.setupGo('scope');
  assert(f.dialog.querySelector('[data-setup-focus="splitPacks"]'));assert(f.dialog.querySelector('[data-setup-focus="productPhotos"]'));
  for(const split of [false,true])for(const photos of [false,true]){
   c.setupSession.splitPacks=split;c.setupSession.productPhotos=photos;const prompt=c.setupPrompt();
   assert.match(prompt,split?/Separate confirmed multipacks/:/Keep multipacks as one/);
   assert.match(prompt,photos?/Create an individual product photo for each piece/:/Keep original photos/);
   if(split){assert.match(prompt,/Keep normal pairs/);assert.match(prompt,/full pack price/);}assert.match(prompt,/productPhotoRequested:true/);assert.match(prompt,/tag every new piece/);
  }
 }
 c.setupSession.route='file';c.setupSession.method='files';c.setupSession.productPhotos=false;c.setupSession.sources=[{id:'upload-pack',role:'item',mime:'image/png',name:'Pack photo',isolate:false}];c.setupGo('scope');
 const input=f.dialog.querySelector('[data-setup-focus="productPhotos"]');input.checked=true;await input.fire('change');assert.equal(c.setupSession.sources[0].isolate,true,'global choice updates uploaded item photos');
 const perPhoto=f.dialog.querySelector('.setup-source-card').querySelector('input[type="checkbox"]');perPhoto.checked=false;await perPhoto.fire('change');assert.equal(c.setupSession.productPhotos,true);assert.equal(c.setupSession.sources[0].isolate,false,'per-photo opt-out stays independent');assert.match(c.setupSourceRequest(c.setupSession),/"createIsolatedPhoto": false/);
 const choices=c.setupSourceDraft(c.setupSession);assert.equal(choices.productPhotos,true);assert.equal(typeof choices.splitPacks,'boolean');
 c.setupSession.sources=[];c.setupSession.splitPacks=true;c.setupSession.productPhotos=true;c.setupSession.step='load';c.drawSetup();
 const original={...piece,variant:'Black',productPhotoRequested:true,photoNote:'The image editor was unavailable.'};
 await c.setupLoadFile({name:'pack.json',size:100,text:async()=>json([original,{...original,name:'Blue tee',variant:'Blue',colors:['blue']},{...original,name:'Red tee',variant:'Red',colors:['red']}])});await f.button('Review pieces').fire('click');
 assert.equal(c.setupSession.rows.filter(r=>r.selected).length,3,'known pack variants sharing a link remain separate');assert.match(f.dialog.textContent,/Individual product photo not created/);assert.match(f.dialog.textContent,/image editor was unavailable/);
 await f.$('setup-save-button').fire('click');assert.equal(f.writes.length,3);assert(f.writes.every(w=>w.value.productPhotoRequested===undefined&&w.value.photoNote===undefined),'photo work notices are not garment tags');assert.match(f.dialog.textContent,/3 pieces kept their/);
 const changedChoice=c.setupParse(json([{...piece,productPhotoRequested:false}]),[])[0];assert.equal(c.setupProductPhotoText(changedChoice),'','an explicit final choice made in the assistant conversation overrides the original UI request');
 const recast=c.setupParse(json([{...piece,productPhotoRequested:true,images:[{url:'https://example.com/edited.jpg',kind:'recast'}]}]),[])[0];assert.equal(c.setupProductPhotoText(recast),'','a returned recast does not show an unavailable-editor warning');
 const direct={...f.directInfo,setupVerified:true,saved:true,request:{state:'complete',parts:[{}],nextPart:2},report:{added:3,promoted:0,skipped:0,photosSaved:1,results:[{name:'Black beanie',action:'add',photoStatus:{created:false,note:'Image editor unavailable.'}}]}};
 c.setupSession.directInfo=direct;c.setupSession.route='direct';c.setupSession.step='handoff';c.drawSetup();assert.match(f.dialog.textContent,/Image editor unavailable/);assert.match(f.dialog.textContent,/Originals were kept/);
 console.log('Preparation options: all source/route combinations, independent record/photo choices, global/per-photo overrides, three variants, fallback notices, and metadata isolation pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
