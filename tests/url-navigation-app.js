const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),routes=fs.readFileSync(__dirname+'/../app/scripts/navigation.js','utf8');
function fn(n){const a=html.indexOf('function '+n+'('),b=html.indexOf('\nfunction ',a+1);assert(a>=0,n);return html.slice(a,b)}
function fixture(hash=''){
 const nodes={},listeners={},stack=[{state:null,url:hash}],writes=[],prompts=[],notices=[];let pos=0,allow=true;
 function node(id){return nodes[id]||(nodes[id]={value:'',open:false,scrollTop:0,fields:[],images:[],pressed:[],dataset:{},events:{},classList:{toggle(){}},setAttribute(){},getAttribute(){return ''},querySelectorAll(sel){return sel==='.ph img'?this.images:sel.includes('.form .tagfield')?this.pressed:this.fields},querySelector(){return null},addEventListener(k,f){(this.events[k]??=[]).push(f)},close(){if(!this.open)return;this.open=false;(this.events.close||[]).forEach(f=>f({}))},showModal(){this.open=true}})}
 const location={hash},win={location,scrollY:0,addEventListener(k,f){(listeners[k]??=[]).push(f)},scrollTo(x,y){this.scrollY=y},confirm(m){prompts.push(m);return allow},ClosetLintRuntime:{setBoard(b){writes.push(JSON.parse(JSON.stringify(b)))}}};
 const hist=win.history={pushState(state,x,url){stack.splice(pos+1);stack.push({state,url});pos++;location.hash=url.includes('#')?url.slice(url.indexOf('#')):''},replaceState(state,x,url){stack[pos]={state,url};location.hash=url.includes('#')?url.slice(url.indexOf('#')):''},go(delta){pos+=delta;assert(pos>=0&&pos<stack.length);location.hash=stack[pos].url.includes('#')?stack[pos].url.slice(stack[pos].url.indexOf('#')):'';this.state=stack[pos].state;(listeners.popstate||[]).forEach(f=>f({state:this.state}));(listeners.hashchange||[]).forEach(f=>f({}))},back(){this.go(-1)},forward(){this.go(1)}};
 const scratch={id:null,name:'My working pile',pieces:[{id:'a',x:1,y:2,w:30,z:1}]},saved={id:'o1',name:'Dinner',pieces:[{id:'b',x:5,y:6,w:40,z:1}]};
 const state={tab:'all',capsDone:false,db:{},pub:false,board:scratch,outfits:{o1:saved},trips:{t1:{name:'Weekend',settings:{dest:'Home'},plan:{}}},q:'',collectionFilter:{},of:{},fantasy:false};
 const ctx={window:win,document:{querySelector:()=>null,querySelectorAll:()=>Object.values(nodes).filter(n=>n.open),addEventListener(){}},URLSearchParams,requestAnimationFrame:f=>f(),state,setupLoaded:{},MULTI_KEYS:[],SET_KEYS:[],$:node,localStorage:{setItem(){}},oMetaFrom:()=>({}),boardSig:b=>JSON.stringify(b.pieces),askConfirm(){throw Error('legacy asynchronous guard should not run during routing')},isClosetTab:t=>['all','clothing','accessories','jewelry','offduty'].includes(t),byId:()=>({a:{id:'a'},b:{id:'b'}}),byIdA:()=>({a:{id:'a'},b:{id:'b'}}),collectionList:()=>[{id:'c1',name:'Faves'}],setFantasy:v=>state.fantasy=v,toast:m=>notices.push(m),todayStr:()=> '2026-10-19',tripPlanOut:p=>p,tripPlanIn:p=>p,wearAny:()=>false,resetFilterState(){state.q='';state.collectionFilter={};state.collectionManager=false},syncNavigation(){},renderTabs(){},renderFilters(){},renderGrid(){},renderTray(){},renderBoard(){},renderSaved(){},tripRender(){},wrRender(){},labRender(){},hiddenItems:()=>[],storedItems:()=>[],donateItems:()=>[],inTab:()=>true,
 openEdit(it){const d=node('dlg');d.fields=[{name:'name',type:'text',value:it.id,getAttribute(){return ''},closest(){return null}}];d.showModal()},openAdd(){const d=node('dlg');d.fields=[];d.images=[];d.showModal()},openOutfitDetails(){node('dlg').showModal()}};
 vm.createContext(ctx);
 vm.runInContext(['setTab','persistBoard','ofOpen','outfitEditorDirty','leaveOutfitEditor','tripNew','tripSettings','tripHasUnsaved','tripLeave','tripOpen','closeDlg','collectionBrowse','openCalendar'].map(fn).join('\n')+'\nfunction openCollections(){setTab("all");state.collectionManager=true;renderGrid()}\n'+routes,ctx);
 ctx.installClosetRoutes();
 return {ctx,state,scratch,saved,writes,prompts,notices,win,hist,stack,node,setAllow:v=>allow=v,ready(){state.capsDone=true;['edits','custom','outfits','profile','trips'].forEach(k=>ctx.setupLoaded[k]=true);win.ClosetLintRoutes.ready()}};
}
{
 const f=fixture('#/outfits/o1'),{ctx,state,scratch,saved,win,hist}=f;
 win.ClosetLintRoutes.ready();assert.equal(state.editingOutfit,undefined,'deep link waits for storage');f.ready();
 assert.equal(ctx.document.title,'Dinner · Closet Lint');
 assert.equal(state.editingOutfit,true);assert.equal(state.scratchBoard,scratch);assert.equal(state.board.id,'o1');assert.notEqual(state.board.pieces[0],saved.pieces[0]);assert.equal(f.writes.length,1);assert.equal(f.writes[0].pieces[0].id,'a');
 state.board.pieces[0].x=99;const edited=state.board;ctx.openEdit({id:'b'});assert.equal(win.location.hash,'#/pieces/b');assert.equal(f.prompts.length,0,'piece can open over unsaved outfit');
 assert.equal(ctx.document.title,'Piece · Closet Lint');
 hist.back();assert.equal(win.location.hash,'#/outfits/o1');assert.equal(state.board,edited);assert.equal(state.board.pieces[0].x,99,'Back closes piece without discarding outfit edits');assert.equal(f.prompts.length,0);
 assert.equal(ctx.document.title,'Dinner · Closet Lint');
 hist.forward();f.node('dlg').fields[0].value='Edited piece';f.setAllow(false);hist.back();assert.equal(win.location.hash,'#/pieces/b');assert.equal(f.node('dlg').open,true);assert.equal(state.board,edited);
 f.setAllow(true);hist.back();assert.equal(state.board,edited);f.setAllow(false);const n=f.stack.length;assert.equal(ctx.setTab('outfits'),false);assert.equal(f.stack.length,n);assert.equal(state.board,edited);
 f.setAllow(true);ctx.setTab('outfits');assert.equal(win.location.hash,'#/board');assert.equal(state.board,scratch);assert.equal(saved.pieces[0].x,5);assert.equal(f.writes.length,1,'routing never persists saved-editor changes as working board');
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
console.log('URL app integration: deep links, board isolation, unsaved fields and chips, trips, collections, calendar, and browser history pass.');
