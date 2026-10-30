const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),routes=fs.readFileSync(__dirname+'/../app/scripts/navigation.js','utf8');
function fn(n){const a=html.indexOf('function '+n+'('),b=html.indexOf('\nfunction ',a+1);assert(a>=0,n);return html.slice(a,b)}
function fixture(hash='',install=true){
 const nodes={},listeners={},stack=[{state:null,url:hash}],writes=[],prompts=[],notices=[];let pos=0,allow=true;
 function node(id){if(nodes[id])return nodes[id];const classes=new Set();return nodes[id]={value:'',open:false,scrollTop:0,fields:[],images:[],pressed:[],dataset:{},events:{},classList:{toggle(k,v){if(v)classes.add(k);else classes.delete(k)},contains:k=>classes.has(k)},setAttribute(){},getAttribute(){return ''},querySelectorAll(sel){return sel==='.ph img'?this.images:sel.includes('.form .tagfield')?this.pressed:this.fields},querySelector(){return null},addEventListener(k,f){(this.events[k]??=[]).push(f)},close(){if(!this.open)return;this.open=false;(this.events.close||[]).forEach(f=>f({}))},showModal(){this.open=true}}}
 const location={hash},win={location,scrollY:0,addEventListener(k,f){(listeners[k]??=[]).push(f)},scrollTo(x,y){this.scrollY=y},confirm(m){prompts.push(m);return allow},ClosetLintRuntime:{setBoard(b){writes.push(JSON.parse(JSON.stringify(b)))}}};
 const hist=win.history={pushState(state,x,url){stack.splice(pos+1);stack.push({state,url});pos++;location.hash=url.includes('#')?url.slice(url.indexOf('#')):''},replaceState(state,x,url){stack[pos]={state,url};location.hash=url.includes('#')?url.slice(url.indexOf('#')):''},go(delta){pos+=delta;assert(pos>=0&&pos<stack.length);location.hash=stack[pos].url.includes('#')?stack[pos].url.slice(stack[pos].url.indexOf('#')):'';this.state=stack[pos].state;(listeners.popstate||[]).forEach(f=>f({state:this.state}));(listeners.hashchange||[]).forEach(f=>f({}))},back(){this.go(-1)},forward(){this.go(1)}};
 const scratch={id:null,name:'My working pile',pieces:[{id:'a',x:1,y:2,w:30,z:1}]},saved={id:'o1',name:'Dinner',pieces:[{id:'b',x:5,y:6,w:40,z:1}]};
 const state={tab:'all',capsDone:false,db:{},pub:false,board:scratch,outfits:{o1:saved},trips:{t1:{name:'Weekend',settings:{dest:'Home'},plan:{}}},q:'',collectionFilter:{},of:{},fantasy:false};
 const ctx={openImport(){state.importOpened=(state.importOpened||0)+1},openTidyPhotos(){state.tidyOpened=(state.tidyOpened||0)+1},releaseOutfitPreview(){},paintWorkspaceRecovery(){},skyRender(){},window:win,document:{querySelector:()=>null,querySelectorAll:()=>Object.values(nodes).filter(n=>n.open),addEventListener(){}},URLSearchParams,requestAnimationFrame:f=>f(),state,setupLoaded:{},MULTI_KEYS:[],SET_KEYS:[],$:node,localStorage:{setItem(){}},oMetaFrom:()=>({}),boardSig:b=>JSON.stringify(b.pieces),askConfirm(){throw Error('legacy asynchronous guard should not run during routing')},isClosetTab:t=>['all','clothing','accessories','jewelry','offduty'].includes(t),byId:()=>({a:{id:'a'},b:{id:'b'}}),byIdA:()=>({a:{id:'a'},b:{id:'b'}}),collectionList:()=>[{id:'c1',name:'Faves'}],setFantasy:v=>state.fantasy=v,toast:m=>notices.push(m),todayStr:()=> '2026-10-19',tripPlanOut:p=>p,tripPlanIn:p=>p,wearAny:()=>false,resetFilterState(){state.q='';state.collectionFilter={};state.collectionManager=false},syncNavigation(){},renderTabs(){},renderFilters(){},renderGrid(){},renderTray(){},renderBoard(){},renderSaved(){},tripRender(){},wrRender(){},renderOracle(){ctx.oracleSession=ctx.oracleSession||{question:''}},oracleLeave(){},oracleSession:null,labRender(){},hiddenItems:()=>[],storedItems:()=>[],donateItems:()=>[],inTab:()=>true,
 openEdit(it){const d=node('dlg');d.fields=[{name:'name',type:'text',value:it.id,getAttribute(){return ''},closest(){return null}}];d.showModal()},openAdd(){const d=node('dlg');d.fields=[];d.images=[];d.showModal()},openOutfitDetails(){node('dlg').showModal()}};
 vm.createContext(ctx);
 vm.runInContext(['paintBoardSaveStatus','adoptBoard','copyBoardPieces','boardDocument','setTab','persistBoard','workspaceKey','workspaceSnapshot','ofOpen','outfitEditorDirty','boardNeedsProtection','boardHasContent','tripNew','tripSettings','tripHasUnsaved','tripCancelPending','tripLeave','tripOpen','closeDlg','collectionBrowse','openCollections','openCalendar'].map(fn).join('\n')+'\n'+routes,ctx);
 if(install)ctx.installClosetRoutes();
 return {ctx,state,scratch,saved,writes,prompts,notices,win,hist,stack,node,setAllow:v=>allow=v,ready(){state.capsDone=true;['edits','custom','outfits','profile','trips'].forEach(k=>ctx.setupLoaded[k]=true);win.ClosetLintRoutes.ready()}};
}
{
 const f=fixture('#/outfits/o1'),{ctx,state,scratch,saved,win,hist}=f;
 win.ClosetLintRoutes.ready();assert.equal(state.editingOutfit,undefined,'deep link waits for storage');f.ready();
 assert.equal(ctx.document.title,'Dinner · Closet Lint');
 assert.equal(state.tab,'saved');assert.equal(state.ofPreview,'o1');assert.equal(state.board,scratch);assert.equal(f.writes.length,0,'preview never writes the board');assert.equal(f.prompts.length,0,'preview does not ask to discard work');
 state.board.pieces[0].x=99;const edited=state.board;ctx.openEdit({id:'b'});assert.equal(win.location.hash,'#/pieces/b');assert.equal(f.prompts.length,0,'piece can open over unsaved outfit');
 assert.equal(ctx.document.title,'Piece · Closet Lint');
 hist.back();assert.equal(win.location.hash,'#/outfits/o1');assert.equal(state.board,edited);assert.equal(state.board.pieces[0].x,99,'Back closes piece without discarding outfit edits');assert.equal(f.prompts.length,0);
 assert.equal(ctx.document.title,'Dinner · Closet Lint');
 hist.forward();f.node('dlg').fields[0].value='Edited piece';f.setAllow(false);hist.back();assert.equal(win.location.hash,'#/pieces/b');assert.equal(f.node('dlg').open,true);assert.equal(state.board,edited);
 f.setAllow(true);hist.back();assert.equal(state.board,edited);f.setAllow(false);ctx.setTab('all');assert.equal(state.board,edited,'ordinary navigation preserves the current outfit draft');
 f.setAllow(true);ctx.setTab('outfits');assert.equal(win.location.hash,'#/board');assert.equal(state.board,edited);assert.equal(saved.pieces[0].x,5);assert.equal(f.writes.length,0,'navigation and modal close only repaint');ctx.persistBoard();assert.equal(f.writes.at(-1).id,null,'autosave preserves the original draft while viewing saved outfits');
 ctx.ofOpen(saved,ctx.byIdA());state.board.name='Changed';const current=state.board;ctx.ofOpen(saved,ctx.byIdA());assert.equal(state.board,current,'same-outfit navigation never reloads unsaved editor');
}
{
 const f=fixture(),{ctx,state,win,hist}=f;f.ready();state.q='blue';state.drawn=180;win.scrollY=880;win.ClosetLintRoutes.capture();ctx.openEdit({id:'a'});f.node('dlg').fields[0].value='changed';f.setAllow(false);ctx.closeDlg();assert.equal(win.location.hash,'#/pieces/a');assert.equal(f.node('dlg').open,true);
 // A successful save clears only the current form guard, then closes through history.
 win.ClosetLintRoutes.cleanForm();ctx.closeDlg();assert.equal(win.location.hash,'#/closet');assert.equal(state.q,'blue');assert.equal(win.scrollY,880);assert.equal(state.drawn,180,'Back restores the infinite-scroll draw count');
 ctx.openAdd();f.node('dlg').images=[{src:'blob:pasted-image'}];f.setAllow(false);assert.equal(ctx.setTab('lab'),false,'pasted-photo-only Add draft is protected');assert.equal(f.node('dlg').open,true);f.setAllow(true);ctx.setTab('lab');assert.equal(f.node('dlg').open,false);
 ctx.collectionBrowse({id:'c1'});assert.equal(win.location.hash,'#/collections/c1');assert.equal(state.collectionFilter.c1,true);hist.back();assert.equal(win.location.hash,'#/lab');hist.forward();assert.equal(state.collectionFilter.c1,true);
}
{
 const f=fixture('#/pieces/a');f.ready();f.ctx.closeDlg();assert.equal(f.win.location.hash,'#/closet','closing a direct piece link stays within the app');assert.equal(f.stack.length,1);
 const missing=fixture('#/outfits/missing');missing.ready();assert.equal(missing.win.location.hash,'#/outfits');assert.equal(missing.state.board,missing.scratch);assert.equal(missing.writes.length,0);assert.equal(missing.notices.length,1);const inherited=fixture('#/outfits/__proto__');inherited.ready();assert.equal(inherited.win.location.hash,'#/outfits','inherited object keys are not outfit records');
}
{
 const f=fixture(),chip={textContent:'Floral',pressed:'false',getAttribute(){return this.pressed}};
 f.node('dlg').pressed=[chip];f.ready();f.ctx.openEdit({id:'a'});chip.pressed='true';f.setAllow(false);
 f.ctx.closeDlg();assert.equal(f.node('dlg').open,true,'clicking outside cannot discard unsaved tag choices');
 assert.equal(f.prompts.length,1);f.setAllow(true);f.ctx.closeDlg();assert.equal(f.node('dlg').open,false);
}
{
 const f=fixture('#/trips/t1'),{ctx,state,win,hist}=f;f.ready();assert.equal(state.trip.id,'t1');state.trip.dest='Changed';const trip=state.trip;ctx.openEdit({id:'a'});hist.back();assert.equal(state.trip,trip);assert.equal(state.trip.dest,'Changed');f.setAllow(false);assert.equal(ctx.setTab('all'),false);assert.equal(win.location.hash,'#/trips/t1');assert.equal(state.trip,trip);f.setAllow(true);ctx.setTab('all');assert.equal(state.trip,null);assert.equal(state.trips.t1.settings.dest,'Home');
}
{
 const f=fixture('#/collections/c1');f.ready();const d=f.node('collections-dialog');d.showModal();let name='Before',saving=false;
 f.win.ClosetLintRoutes.trackDialog(d,()=>name,()=>saving);name='Edited';f.setAllow(false);assert.equal(f.ctx.setTab('lab'),false);assert.equal(d.open,true);assert.equal(f.win.location.hash,'#/collections/c1');
 f.setAllow(true);saving=true;assert.equal(f.ctx.setTab('lab'),false,'pending collection save cannot be navigated away from');saving=false;
 f.win.ClosetLintRoutes.cleanDialog(d);f.ctx.collectionBrowse({id:'c1'});assert.equal(d.open,false,'saving a collection closes its editor even when its URL is unchanged');assert.equal(f.stack.length,1,'same-route refresh does not add duplicate history');f.ctx.setTab('lab');assert.equal(d.open,false);assert.equal(f.win.location.hash,'#/lab');
}
{
 const f=fixture('#/calendar?month=2026-11'),{ctx,state,win,hist}=f;f.ready();assert.equal(state.tab,'saved');assert.equal(state.ofView,'history');assert.equal(state.histMonth,'2026-11');
 ctx.openCalendar('2026-12');assert.equal(win.location.hash,'#/calendar?month=2026-12');hist.back();assert.equal(state.histMonth,'2026-11');hist.forward();assert.equal(state.histMonth,'2026-12');
 ctx.openEdit({id:'a'});ctx.closeDlg();assert.equal(win.location.hash,'#/calendar?month=2026-12');assert.equal(state.ofView,'history');
 ctx.setTab('saved');assert.equal(win.location.hash,'#/outfits');assert.equal(state.ofView,'outfits');hist.back();assert.equal(state.ofView,'history');assert.equal(state.histMonth,'2026-12');assert.equal(state.board,f.scratch);
 const d=f.node('collections-dialog');d.showModal();let name='Original',busy=false;win.ClosetLintRoutes.trackDialog(d,()=>name,()=>busy);name='Edit';f.setAllow(false);assert.equal(win.ClosetLintRoutes.closeTrackedDialog(d),false);assert.equal(d.open,true);f.setAllow(true);busy=true;assert.equal(win.ClosetLintRoutes.closeTrackedDialog(d),false);busy=false;assert.equal(win.ClosetLintRoutes.closeTrackedDialog(d),true);assert.equal(d.open,false);assert.equal(win.location.hash,'#/calendar?month=2026-12','closing collection editor preserves underlying workflow');
}
{
 const f=fixture('#/sky'),{ctx,state,win,hist}=f;f.ready();assert.equal(state.tab,'sky','Sky deep link opens its own view');
 const working=state.board;ctx.openEdit({id:'a'});ctx.closeDlg();assert.equal(win.location.hash,'#/sky');assert.equal(state.tab,'sky');assert.equal(state.board,working);
 ctx.setTab('all');hist.back();assert.equal(win.location.hash,'#/sky');hist.forward();assert.equal(state.tab,'all');assert.equal(state.board,working);
 ctx.ofOpen(f.saved,ctx.byIdA());state.board.name='Unsaved';f.setAllow(false);assert.equal(ctx.setTab('sky'),true,'Sky navigation retains the autosaved board without discarding outfit changes');assert.equal(state.board,working);assert.equal(state.board.name,'Unsaved');
}
console.log('URL app integration: hydrated deep links, real board isolation, dirty forms/photos/outfits/trips, cancelled Back/menu navigation, direct-link close, missing records, collections, and browse context pass.');

{
 const f=fixture('#/sky/catalog'),{ctx,state,win,hist}=f;f.ready();assert.equal(state.tab,'sky');assert.equal(state.skyCatalog,true,'catalog deep link opens catalog');const board=state.board;
 win.ClosetLintRoutes.sky(false);assert.equal(win.location.hash,'#/sky');assert.equal(state.skyCatalog,false);hist.back();assert.equal(win.location.hash,'#/sky/catalog');assert.equal(state.skyCatalog,true);hist.forward();assert.equal(state.skyCatalog,false);
 win.ClosetLintRoutes.sky(true);ctx.openEdit({id:'a'});ctx.closeDlg();assert.equal(win.location.hash,'#/sky/catalog');assert.equal(state.skyCatalog,true,'returning from a piece retains the catalog');assert.equal(state.board,board);
 ctx.setTab('sky');assert.equal(win.location.hash,'#/sky');assert.equal(state.skyCatalog,false,'main Sky entry returns to overview');
}
console.log('Sky catalog: deep links, overview navigation, Back/Forward, piece return, and board preservation pass.');

{
 const f=fixture('#/sky'),{win,hist,state}=f;f.ready();const board=state.board;win.scrollY=760;
 win.ClosetLintRoutes.sky(true);assert.equal(win.scrollY,0,'explicit catalog navigation starts at its heading');win.scrollY=430;
 hist.back();assert.equal(win.location.hash,'#/sky');assert.equal(win.scrollY,760,'Back retains the overview scroll position');hist.forward();assert.equal(win.scrollY,430,'Forward retains the catalog scroll position');
 win.ClosetLintRoutes.sky(false);assert.equal(win.scrollY,0,'explicit return to overview starts at the top');assert.equal(state.board,board);
}
console.log('Sky catalog scroll: new navigation starts at top; Back/Forward restores each view without changing the board.');

{
 const f=fixture(),{ctx,state,win,hist,stack}=f;ctx.PUB={skySharePage:'sky.html',skyLanding:true};f.ready();assert.equal(state.tab,'sky');assert.equal(stack.at(-1).url,'./sky.html#/sky');const board=state.board;
 ctx.setTab('all');assert.equal(stack.at(-1).url,'./#/closet');hist.back();assert.equal(state.tab,'sky');hist.forward();assert.equal(state.tab,'all');ctx.setTab('sky');ctx.openEdit({id:'a'});assert.equal(stack.at(-1).url,'./#/pieces/a');ctx.closeDlg();assert.equal(state.tab,'sky');assert.equal(state.board,board);
}
console.log('Public Sky alias: default landing, normal-view URLs, Back/Forward, piece return, and board preservation pass.');

{
 const f=fixture('#/closet'),{ctx,state,scratch,node}=f;f.ready();
 state.selectMode=true;state.picked={a:true,b:true};
 ctx.setTab('outfits');assert.equal(node('selbar').classList.contains('hide'),true,'selection toolbar is hidden on the board');assert.equal(state.board,scratch,'selection navigation does not replace the working board');
 ctx.setTab('lab');assert.equal(node('selbar').classList.contains('hide'),true,'selection toolbar is hidden in Lab');
 ctx.setTab('clothing');assert.equal(state.selectMode,true);assert.deepEqual(Object.keys(state.picked),['a','b'],'leaving browsing and changing categories retains explicit selections');assert.equal(node('selbar').classList.contains('hide'),false);
 console.log('Bulk selection survives board/Lab/category navigation without leaking its toolbar into other views.');
}

{
 const f=fixture();f.ready();const d=f.node('setup-wizard');d.id='setup-wizard';d.showModal();let loaded=true,busy=false;
 f.win.ClosetLintRoutes.trackDialog(d,()=>loaded?'loaded-review':'',()=>busy);
 f.win.ClosetLintRoutes.markImportDirty(d,true);f.setAllow(false);
 assert.equal(f.ctx.setTab('lab'),false,'redrawing a loaded import must not clear its navigation guard');
 assert.equal(d.open,true);assert.equal(f.win.ClosetLintRoutes.hasUnsaved(),false,'the handoff refresh guard excludes the import dialog itself');
 busy=true;f.setAllow(true);assert.equal(f.ctx.setTab('lab'),false,'navigation cannot interrupt an active import');busy=false;
 f.win.ClosetLintRoutes.prepareReload();assert.equal(f.ctx.setTab('lab'),true,'explicit discard permits reloading/navigation');
 console.log('Import navigation: loaded review and active-save guards survive redraws; explicit discard clears them.');
}

{
 const f=fixture('#/closet'),{ctx,state,win,hist}=f;f.ready();
 ctx.openCollections();assert.equal(state.collectionManager,true);assert.equal(win.location.hash,'#/collections');
 ctx.setTab('all');assert.equal(state.collectionManager,false,'logo/Closet exits Collections even when the underlying tab is already all');assert.equal(win.location.hash,'#/closet');
 hist.back();assert.equal(state.collectionManager,true,'Back restores Collections');hist.forward();assert.equal(state.collectionManager,false,'Forward restores piece browsing');
 ctx.openCollections();ctx.setTab('clothing');assert.equal(state.collectionManager,false,'category navigation exits Collections');
 ctx.openCollections();ctx.setTab('outfits');ctx.setTab('all');assert.equal(state.collectionManager,false,'returning from the board opens pieces');
 ctx.collectionBrowse({id:'c1'});assert.equal(state.collectionManager,false);assert.equal(state.collectionFilter.c1,true,'Browse collection still filters pieces');
 console.log('Collections exit through logo/Closet, category, and board navigation; browser history restores the overview.');
}

{
 const f=fixture('#/oracle'),{ctx,state,win,hist}=f;f.ready();assert.equal(state.tab,'oracle');assert.equal(ctx.document.title,'Closet Oracle · Closet Lint');assert.equal(f.node('view-closet').classList.contains('hide'),true);assert.equal(f.node('view-oracle').classList.contains('hide'),false);
 ctx.oracleSession.question='Synthetic question';ctx.setTab('all');assert.equal(win.location.hash,'#/closet');assert.equal(f.node('view-oracle').classList.contains('hide'),true);hist.back();assert.equal(state.tab,'oracle');assert.equal(ctx.oracleSession.question,'Synthetic question');hist.forward();assert.equal(state.tab,'all');
 ctx.setTab('oracle');ctx.oracleSession.busy=true;ctx.oracleMessage=()=>{};assert.equal(ctx.setTab('lab'),false,'non-cancellable summary download protects navigation');assert.equal(state.tab,'oracle');ctx.oracleSession.busy=false;ctx.setTab('lab');assert.equal(state.tab,'lab');
 console.log('Oracle page routing: direct link, title, primary views, Back/Forward, retained question, and active-download navigation guard pass.');
}

{const f=fixture('#/outfits/o1');f.setAllow(false);f.ready();assert.equal(f.win.location.hash,'#/outfits/o1');assert.equal(f.state.ofPreview,'o1');assert.equal(f.state.board,f.scratch);assert.equal(f.writes.length,0);}

// Real startup waits for storage and resolves the requested destination before rendering.
{
 const f=fixture('#/oracle',false),{ctx,state,node}=f,renders=[];
 Object.assign(ctx,{photoPreviewError(){},maybeStartSetup(){},labRefresh(){},tripData(){},wrData(){},oracleUpdateScope(){},editFocusInGrid:()=>false,initShell(){},wireBoard(){},restoreBoard(){},loadBundles(){}});
 ctx.localStorage.getItem=()=> 'clothing';
 ctx.renderGrid=()=>renders.push('closet');ctx.renderOracle=()=>renders.push('oracle');
 vm.runInContext(fn('initialTab')+'\n'+fn('onDataInner'),ctx);
 const boot=html.match(/\ninitShell\(\);\n[\s\S]*?\ninstallClosetRoutes\(\);/);assert(boot);vm.runInContext(boot[0],ctx);
 assert.equal(state.tab,'clothing');assert.deepEqual(renders,[],'remembered tab does not render before route hydration');
 assert.equal(ctx.window.ClosetLintRoutes.ready(),false);ctx.onDataInner();assert.deepEqual(renders,[]);
 state.capsDone=true;ctx.setupLoaded.edits=true;ctx.onDataInner();assert.deepEqual(renders,[],'partial initial snapshots do not render a fallback closet');
 f.ready();assert.deepEqual(renders,['oracle']);assert.equal(state.tab,'oracle');assert.equal(node('app-loading').classList.contains('hide'),true);
 assert.equal(ctx.window.ClosetLintRoutes.ready(),true,'later data refreshes remain enabled');
}
{
 const f=fixture('#/oracle'),{ctx,state}=f,renders=[];
 ctx.labRender=()=>renders.push('lab'); // The route installer captures render entry points through setTab.
 ctx.setTab('lab');assert.equal(state.tab,'all','navigation while loading queues the destination');f.ready();assert.equal(state.tab,'lab');assert.deepEqual(renders,['lab']);
}
{
 const f=fixture('#/oracle'),{ctx,state,node}=f;state.capsDone=true;state.db=null;
 assert.equal(ctx.window.ClosetLintRoutes.ready(),'started','no-database fallback can finish startup');assert.equal(state.tab,'oracle');assert.equal(node('app-loading').classList.contains('hide'),true);
}
{
 const f=fixture('#/outfits'),{ctx}=f;f.ready();let draws=0;ctx.ofDraw=()=>draws++;
 Object.assign(ctx,{photoPreviewError(){},maybeStartSetup(){},labRefresh(){},tripData(){},wrData(){},oracleUpdateScope(){},editFocusInGrid:()=>false});
 vm.runInContext(fn('onDataInner'),ctx);ctx.onDataInner();assert.equal(draws,1,'one saved-outfit data update performs one draw');
}
{
 const f=fixture(),{ctx,state,node}=f;let failed;
 ctx.console={warn(){}};state.db={collection:()=>({onSnapshot:(ok,error)=>failed=error})};
 vm.runInContext(fn('watch'),ctx);ctx.watch('custom','custom');failed(new Error('Synthetic startup failure'));
 assert.match(node('app-loading').textContent,/Could not load your wardrobe/);assert.equal(ctx.setupLoaded.custom,undefined,'failed snapshots are not mistaken for an empty wardrobe');
}
console.log('Startup: no provisional page, hydration gating, queued navigation, no-database fallback, visible load errors, and one saved-outfit redraw pass.');

{
 const f=fixture('#/outfits'),{ctx,state}=f;let draws=0;
 ctx.renderSaved=()=>draws++;ctx.ofDraw=()=>draws++;
 Object.assign(ctx,{photoPreviewError(){},maybeStartSetup(){},labRefresh(){},tripData(){},wrData(){},oracleUpdateScope(){},editFocusInGrid:()=>false});
 state.capsDone=true;['edits','custom','outfits','profile','trips'].forEach(k=>ctx.setupLoaded[k]=true);
 vm.runInContext(fn('onDataInner'),ctx);ctx.onDataInner();assert.equal(draws,1,'initial hydration renders saved outfits once');ctx.onDataInner();assert.equal(draws,2,'later updates still redraw saved outfits');
}

(async()=>{
 const f=fixture('#/trips/new');f.ready();const c=f.ctx,T=f.state.trip;
 T.plan={outfits:[]};T.name='Synthetic created trip';c.needDb=()=>false;
 f.state.db={collection:()=>({doc:id=>({set:record=>{f.state.trips[id]=JSON.parse(JSON.stringify(record));return Promise.resolve()}})})};
 vm.runInContext(html.slice(html.indexOf('function tripSave('),html.indexOf('function tripOpen(')),c);
 await c.tripSave();assert(T.id);assert.equal(f.win.location.hash,'#/trips/'+T.id,'first Save replaces the new-trip route with its saved identity');
 T._tripFlight=Promise.resolve();const before=f.win.location.hash;c.setTab('saved');assert.equal(f.win.location.hash,before,'URL navigation cannot abandon a trip write');assert(f.notices.some(message=>message.includes('Wait for this trip save')));
 console.log('Trips routing: first Save adopts its saved URL, and in-flight navigation stays put.');
})().catch(error=>{console.error(error);process.exitCode=1});

{
 const f=fixture('#/board');f.ready();f.ctx.openCalendar('2026-11');f.ctx.setTab('outfits');
 f.state.boardSaving=true;f.state.outfitSave={planning:true};
 assert.equal(f.ctx.openCalendar('2026-11'),false,'calendar navigation waits for atomic Save & schedule');assert.equal(f.win.location.hash,'#/board');
 f.hist.back();assert.equal(f.win.location.hash,'#/board','browser Back also waits for Save & schedule');assert.equal(f.state.board,f.scratch);
 f.state.boardSaving=false;assert.equal(f.ctx.openCalendar('2026-11'),true);
 console.log('Calendar planning: menu navigation and browser Back wait for the in-flight outfit/date save.');
}

{
 const f=fixture(),{ctx,state,win,hist}=f;f.ready();state.q='beanie';win.scrollY=460;win.ClosetLintRoutes.capture();const board=JSON.stringify(state.board);
 ctx.openImport();assert.equal(win.location.hash,'#/import');assert.equal(state.tab,'import');assert.match(ctx.document.title,/Import pieces/);assert.equal(state.importOpened,1);
 hist.back();assert.equal(state.q,'beanie');assert.equal(win.scrollY,460);hist.forward();assert.equal(state.tab,'import');assert.equal(state.importOpened,2);
 ctx.openEdit({id:'a'});ctx.renderGrid();assert.equal(win.location.hash,'#/pieces/a','a piece opened above a batch page keeps its own route');hist.back();assert.equal(state.tab,'import');
 ctx.openTidyPhotos();assert.equal(win.location.hash,'#/tidy-photos');assert.equal(state.tab,'tidy-photos');assert.equal(state.tidyOpened,1);assert.match(ctx.document.title,/Tidy photos/);
 let saving=true;ctx.batchWorkBusy=()=>saving;assert.equal(ctx.setTab('lab'),false,'an active batch write blocks navigation');assert.equal(win.location.hash,'#/tidy-photos');
 saving=false;hist.back();assert.equal(state.tab,'import');hist.back();assert.equal(state.q,'beanie');assert.equal(JSON.stringify(state.board),board,'batch pages never touch the working board');assert.equal(f.prompts.length,0,'returning through batch pages does not discard their in-memory drafts');
 console.log('Batch pages: deep-link routing, titles, retained closet context, Back/Forward, active-save protection, and untouched board pass.');
}

{
 const f=fixture(),{ctx,win,hist}=f;f.ready();win.scrollY=880;ctx.setTab('wrank');assert.equal(win.scrollY,0,'new Wishlist navigation starts at the heading');win.scrollY=320;hist.back();assert.equal(win.scrollY,880);hist.forward();assert.equal(win.scrollY,320,'Wishlist Back/Forward preserves reading position');
}

{
 const f=fixture('#/collections/c1'),{ctx,state,hist,win}=f;f.ready();state.q='blue';state.fav=true;
 ctx.openEdit({id:'a'});ctx.closeDlg();assert.equal(state.collectionFilter.c1,true,'piece return keeps its collection');
 ctx.setTab('all');assert.equal(Object.keys(state.collectionFilter).length,0,'All, Closet, and home leave the collection');assert.equal(state.q,'blue');assert.equal(state.fav,true);assert.equal(win.location.hash,'#/closet');
 hist.back();assert.equal(state.collectionFilter.c1,true,'browser Back restores the visited collection');hist.forward();assert.equal(Object.keys(state.collectionFilter).length,0);
}
