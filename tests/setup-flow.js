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
 document={activeElement:launcher,querySelector:s=>root.querySelector(s),querySelectorAll:s=>root.querySelectorAll(s)};
 const el=(tag,attrs={},...kids)=>{const n=new Node(tag);for(const [k,v] of Object.entries(attrs||{})){if(k==='text')n.textContent=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)n.setAttribute(k,v)}n.append(...kids);return n};
 const $=id=>root.querySelector('#'+id),writes=[],patches=[],preferences={};let failId='',reloaded=0,dirty=false,clipboardFails=false;
 const c={URL,Set,TextEncoder,console,Promise,Date,Math,document,el,$,META:['Tops','Bottoms','Jewelry'],SUBS:{Tops:['Tees'],Bottoms:['Pants'],Jewelry:['Earrings']},COLORS:{black:'#000',silver:'#aaa'},SEASONS:['fall'],STYLES:['casual'],LOOKS:['gothic'],deriveKind:m=>m==='Jewelry'?'gauge':'clothing',validateSize:(k,v)=>({ok:true,v}),todayStr:()=> '2026-10-22',localStorage:{getItem:k=>preferences[k]||null,setItem:(k,v)=>{preferences[k]=v}},navigator:{clipboard:{writeText:async()=>{if(clipboardFails)throw Error('denied')}}},state:{pub,profile:{onboarding:{started:true,goals:['outfits']}},fantasy:false,edits:{},assets:{upload:async()=>({id:'synthetic-photo'})},db:{collection:name=>({doc:id=>({set:async value=>{if(id===failId)throw Error('Disk full');writes.push({name,id,value})}})})}},allItems:()=>items,layerDefaults:x=>x,needDb:()=>false,readImage:async()=>({url:'blob:synthetic',blob:{},ar:.8}),fetch:async()=>({ok:true,headers:{get:()=> 'image/png'},blob:async()=>({size:100})}),patchEdit:async(it,patch)=>{if(it.id===failId)return false;patches.push(patch);Object.assign(it,patch);return true},setTab(){},resetFilterState(){},setFantasy:v=>{c.state.fantasy=v},renderGrid(){},renderFilters(){},openAdd(){},window:{location:{reload:()=>{reloaded++}},ClosetLintRuntime:{flush:async()=>{}},ClosetLintRoutes:{hasUnsaved:()=>dirty,prepareReload:()=>{dirty=false},trackDialog(){},cleanDialog(){},markImportDirty(){}}}};
 if(local)c.window.ClosetLintLocal={instance:'synthetic'};vm.createContext(c);vm.runInContext(script,c);
 const button=(text,scope=dialog)=>{const n=scope.querySelectorAll('button').find(x=>x.textContent===text);assert(n,'button: '+text);return n};
 return {c,dialog,writes,patches,preferences,$,el,button,items,get reloaded(){return reloaded},set failId(v){failId=v},set dirty(v){dirty=v},set clipboardFails(v){clipboardFails=v}};
}
const piece={name:'Synthetic tee',category:'Tops',subcategory:'Tees',status:'owned',size:'M',colors:['black'],url:'https://example.com/tee',photoUrl:'https://images.example.com/tee.jpg',date:'2026-10-10'};
const json=pieces=>JSON.stringify({format:'closet-lint-import/v1',pieces});
(async()=>{
 const f=fixture();f.c.openImport();assert.equal(f.c.setupSession.step,'hub');assert.equal(f.writes.length,0);
 await f.button('Prepare a request').fire('click');assert.equal(f.c.setupSession.route,'direct');assert.equal(f.c.setupSession.step,'scope');
 f.c.setupSession.notes='Gmail connector only';f.c.setupSession.count=4;
 await f.button('Prepare request').fire('click');assert.equal(f.c.setupSession.step,'handoff');
 const request=f.c.setupPrompt();assert.match(request,/2026-10-16 through 2026-10-22/);assert.match(request,/following day/);assert.match(request,/Never edit the database directly/);assert.match(request,/Gmail connector only/);assert.match(request,/Refunds and return notices do not prove/);
 f.clipboardFails=true;await f.button('Copy request').fire('click');assert.equal(f.$('setup-request').selectedText,true);assert.equal(f.$('setup-request').closest('details').open,true);assert.equal(f.writes.length,0);
 await f.button('Use an import file instead').fire('click');assert.equal(f.c.setupSession.route,'file');assert.equal(f.c.setupSession.count,4);assert.equal(f.c.setupSession.notes,'Gmail connector only');
 await f.button('Load import file').fire('click');await f.c.setupLoadFile({name:'backup.zip',size:20,text:async()=>''});assert.match(f.c.setupSession.loadError,/restore/i);assert.equal(f.$('setup-review-button').disabled,true);
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
 assert.equal(g.c.setupSession.rows[1].selected,false);const include=g.dialog.querySelector('[data-setup-focus="include-1"]');include.checked=true;await include.fire('change');assert.equal(g.c.setupSession.rows[1].selected,false);assert.equal(g.c.setupSession.rows[1].compare,true);
 await g.button('Mark existing piece as owned').fire('click');assert.equal(g.c.setupSession.rows[1].selected,true);assert.equal(g.$('setup-save-button').textContent,'Add 2 pieces and mark 1 owned');
 g.failId='wish';await g.$('setup-save-button').fire('click');assert.equal(g.c.setupSession.step,'recovery');assert.equal(g.writes.length,1,'stop at first failed write');assert.equal(g.c.setupSession.rows[2].attempted,false);assert.equal(g.c.setupSession.rows[0].saved,true);
 g.failId='';await g.button('Retry remaining pieces').fire('click');assert.equal(g.c.setupSession.step,'done');assert.equal(g.writes.length,2,'saved first row not repeated');assert.equal(g.patches.length,1);assert.equal(wish.wish,false);assert.equal(wish.price,0,'zero price is not blank');assert.equal(wish.photoId,'keep');assert.equal(wish.date,'2026-10-10');assert.equal(g.writes[0].value.date,'2026-10-10','browser preserves acquisition date');
 assert.equal(g.c.state.fantasy,false);await g.button('Done').fire('click');assert.equal(g.c.setupSession,null);
 console.log('Import saves: explicit match choices, blank-only promotion, acquisition dates, stop-on-error, and retry without repeating saves pass.');

 const h=fixture({local:false,pub:true});h.c.openImport();assert.equal(h.c.setupStorage().direct,false);assert.match(h.dialog.textContent,/do not change the public demo/);assert(!h.dialog.textContent.includes('Needs access to the computer'));
 h.c.setupSession.step='load';h.c.drawSetup();await h.c.setupLoadFile({name:'local.json',size:20,text:async()=>json([{...piece,photoUrl:'',images:[{file:'photos/tee.jpg',kind:'isolated'}]}])});await h.button('Review pieces').fire('click');assert.equal(h.$('setup-save-button').disabled,true);await h.button('Add without a photo').fire('click');assert.equal(h.$('setup-save-button').disabled,false);assert.equal(h.c.setupSession.rows[0].piece.localPhotoFiles.length,0);
 h.c.setupSession.rows[0].piece.meta='';h.c.setupUpdateReview();assert.equal(h.$('setup-save-button').disabled,true);h.c.setupSession.rows[0].selected=false;h.c.setupUpdateReview();assert.equal(h.c.setupCounts(h.c.setupSession.rows).blocked,0,'unselected invalid row never blocks others');
 console.log('Public/file review: accurate destination, local-photo recovery, explicit no-photo choice, and selected-row validation pass.');

 const k=fixture();k.c.openImport();k.c.setupSession.route='direct';k.c.setupGo('handoff');k.dirty=true;await k.button('Refresh closet').fire('click');assert.equal(k.reloaded,0);assert.equal(k.c.setupSession.confirm.kind,'refresh');await k.button('Keep editing').fire('click');assert.equal(k.reloaded,0);await k.button('Refresh closet').fire('click');await k.button('Discard edit and refresh').fire('click');assert.equal(k.reloaded,1);
 const a=fixture();a.c.openSetup();assert.equal(a.c.setupSession.step,'start');assert(!a.dialog.textContent.includes('What brought you here'));await a.button('Browse first').fire('click');assert.equal(a.writes[0].name,'profile');assert.equal(a.writes[0].value.started,true);assert.deepEqual(a.writes[0].value.goals,['outfits']);
 const race=fixture();race.c.openImport();race.c.setupGo('load');let resolveFile;
 const pending=race.c.setupLoadFile({name:'old.json',size:10,text:()=>new Promise(resolve=>{resolveFile=resolve})});
 await race.c.setupLoadFile({name:'new.zip',size:10,text:async()=>''});resolveFile(json([piece]));await pending;
 assert.equal(race.c.setupSession.preview,null,'a stale file read cannot replace a newer rejected selection');assert.match(race.c.setupSession.loadError,/ZIP/);
 const paste=race.dialog.querySelector('[data-setup-focus="paste"]');paste.value='{ incomplete';await paste.fire('input');race.c.setupRequestClose();assert(race.c.setupSession.confirm,'closing protects pasted text even before validation');
 const lost={...wish,wish:true,size:'',price:0,url:'',date:'',photoId:'keep'};const retry=fixture({items:[lost]});const retryRow=retry.c.setupParse(json([{...piece,name:lost.name,category:'Jewelry',subcategory:'Earrings',colors:['silver'],size:'',url:'https://example.com/from-import'}]),[lost])[0];retryRow.selected=true;retryRow.action='owned';let first=true;
 retry.c.patchEdit=async(it,patch)=>{Object.assign(it,patch);if(first){first=false;throw Error('Response lost')}return true};
 let lostResult=await retry.c.setupWriteRows([retryRow],retry.c.setupSaveRow,'lost-response');assert.equal(lostResult.failed,1);assert.equal(lost.wish,false);
 lost.url='https://example.com/edited-later';lostResult=await retry.c.setupWriteRows([retryRow],retry.c.setupSaveRow,'lost-response');assert.equal(lostResult.saved,1);assert.equal(lost.url,'https://example.com/edited-later','retry never overwrites a now-populated field');
 console.log('Import recovery: stale file reads, unvalidated text drafts, and ownership retries after a lost response pass.');
 console.log('Setup/refresh: optional goals removed from the critical path, old goals preserved, and explicit discard required for unsaved edits.');
})().catch(e=>{console.error(e);process.exit(1)});
