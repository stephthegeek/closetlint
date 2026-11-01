const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/scripts/photo-preparation.js','utf8');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
assert.equal(html.split('/* BEGIN PHOTO PREPARATION (source: app/scripts/photo-preparation.js) */\n')[1].split('/* END PHOTO PREPARATION */')[0],source);
class Node{
 constructor(tag,a={},...children){this.tag=tag;Object.assign(this,a||{});this.children=children.filter(Boolean);this.events={};this.isConnected=true;this.classList={toggle(){}}}
 appendChild(n){this.children.push(n);return n}append(...n){this.children.push(...n.filter(Boolean))}set textContent(v){this.text=v;this.children=[]}get textContent(){return this.text||''}
 dispatchEvent(e){if(this.events[e.type])this.events[e.type](e);return !e.defaultPrevented}addEventListener(k,f){this.events[k]=f}showModal(){this.open=true}close(){this.open=false;if(this.events.close)this.events.close()}remove(){this.isConnected=false}click(){return this.onclick&&this.onclick()}
}
function find(n,p){if(p(n))return n;for(const c of n.children||[]){if(typeof c!=='object')continue;const match=find(c,p);if(match)return match}}
const turn=()=>new Promise(setImmediate);
(async()=>{
 let dialog,calls=[],failCreate=true,failSave=true,notices=[],read=[],discardPrompts=0;
 const request={requestId:'req',instance:'wardrobe',folder:'/private/photo-work',pieces:[{id:'c-blue',name:'Blue socks',colors:['blue'],source:'source.png',note:''},{id:'c-pink',name:'Pink socks',colors:['pink'],source:'source.png',note:''}]};
 const checked={...request,token:'review-token',photos:[{id:'c-blue',photo:{photoId:'blue'}},{id:'c-pink',photo:{photoId:'pink'}}]};
 const runtime={photoPrepare:async(action,data)=>{calls.push({action,data:JSON.parse(JSON.stringify(data))});if(action==='create'){if(failCreate)throw Error('Temporary create failure');return request}if(action==='check')return checked;if(failSave)throw Error('Temporary save failure');return {ids:data.ids,saved:data.ids.length,token:data.token}},photoPrepareRead:async(id,opts)=>{read.push({id,opts});return opts?{}:request}};
 const ctx={console,Date,Math,setTimeout,Promise,window:{confirm:()=>{discardPrompts++;return false},ClosetLintRuntime:runtime,ClosetLintLocal:{instance:'wardrobe'}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},localStorage:{values:{},getItem(k){return this.values[k]||''},setItem(k,v){this.values[k]=v},removeItem(k){delete this.values[k]}},document:{body:{appendChild:d=>dialog=d}},el:(...args)=>new Node(...args),byId:()=>({'c-blue':{id:'c-blue',name:'Blue socks',photo:'old-blue'},'c-pink':{id:'c-pink',name:'Pink socks',photo:'old-pink'}}),toast:x=>notices.push(x),photoThumbnail:x=>x,setupLabel:(text,input)=>new Node('label',{},input),copyClipboard:async()=>true};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 for(const route of ['local','file']){
  const text=ctx.photoPreparationPrompt(request,route);assert.match(text,/do not import, split, duplicate, retag/);assert.match(text,/actual image editor/);assert.match(text,/declined, or fails/);assert.match(text,/c-blue/);assert.match(text,/c-pink/);
  if(route==='file'){assert(!text.includes(request.folder),'chat request does not disclose host folder paths');assert.match(text,/Return a ZIP/)}else assert.match(text,/Do not write directly to the wardrobe database/);
 }
 ctx.window.ClosetLintLocal.hosted=true;
 const hostedDirect=ctx.photoPreparationPrompt(request,'local');assert.match(hostedDirect,/SSH access must already be configured and approved/);assert.match(hostedDirect,/retain host-key verification/);assert.match(hostedDirect,/Do not guess connection details/);
 const hostedZip=ctx.photoPreparationPrompt(request,'file');assert(!hostedZip.includes(request.folder),'hosted ZIP prompt omits server paths');assert(!hostedZip.includes('SSH access must'),'ZIP route does not require SSH');assert.match(hostedZip,/Return a ZIP/);
 delete ctx.window.ClosetLintLocal.hosted;
 const routeKey=ctx.photoPreparationRouteKey();assert.equal(ctx.photoPreparationRoute(),'local');ctx.localStorage.setItem(routeKey,'file');assert.equal(ctx.photoPreparationRoute(),'file');
 ctx.window.ClosetLintLocal.instance='another';assert.equal(ctx.photoPreparationRoute(),'local','route preferences stay with their wardrobe');ctx.window.ClosetLintLocal.instance='wardrobe';
 ctx.window.ClosetLintLocal.hosted=true;assert.equal(ctx.photoPreparationRoute(),'file','hosted route has a separate safe default');ctx.localStorage.setItem(ctx.photoPreparationRouteKey(),'local');assert.equal(ctx.photoPreparationRoute(),'local');delete ctx.window.ClosetLintLocal.hosted;
 ctx.localStorage.setItem(routeKey,'invalid');assert.equal(ctx.photoPreparationRoute(),'local');ctx.localStorage.removeItem(routeKey);
 ctx.openPhotoPreparation(['c-blue','c-pink']);
 const input=find(dialog,n=>n['aria-label']==='Photo detail for Blue socks');input.value='Blue pair on the left';input.events.input();
 dialog.events.cancel({preventDefault(){}});assert.equal(discardPrompts,1);assert.equal(dialog.open,true,'unsaved photo notes survive canceled dismissal');
 find(dialog,n=>n.text==='Prepare assistant request').click();dialog.events.cancel({preventDefault(){}});assert.equal(dialog.open,true,'active photo work blocks dismissal');assert.equal(discardPrompts,1,'busy work does not ask to discard');await turn();assert.match(find(dialog,n=>n.role==='status').text,/Temporary create failure/);assert.equal(find(dialog,n=>n['aria-label']==='Photo detail for Blue socks').value,'Blue pair on the left');assert.equal(find(dialog,n=>n.text==='Prepare assistant request').disabled,false);
 failCreate=false;find(dialog,n=>n.text==='Prepare assistant request').click();await turn();assert.equal(calls[0].data.request,calls[1].data.request,'failed request creation reuses its ID');assert.equal(calls[1].data.notes['c-blue'],'Blue pair on the left');
 const workflow=find(dialog,n=>n['aria-label']==='Assistant workflow');workflow.value='file';workflow.events.change();assert.equal(ctx.photoPreparationRoute(),'file');
 find(dialog,n=>n.text==='Check photos').click();await turn();assert(find(dialog,n=>n.text==='Save 2 photos as main'));assert(find(dialog,n=>n.text==='Photo results received. Review before saving.'));
 const firstCheck=find(dialog,n=>n.tag==='input'&&n.type==='checkbox');firstCheck.checked=false;firstCheck.events.change();assert(find(dialog,n=>n.text==='Save 1 photo as main'));
 find(dialog,n=>n.text==='Save 1 photo as main').click();await turn();assert.match(find(dialog,n=>n.role==='status').text,/Temporary save failure/);assert.equal(find(dialog,n=>n.text==='Save 1 photo as main').disabled,false,'failed save unlocks with selected photo unchanged');
 failSave=false;find(dialog,n=>n.text==='Save 1 photo as main').click();await turn();
 const saves=calls.filter(c=>c.action==='save');assert.deepEqual(saves[0].data,saves[1].data,'retry uses same request, token, and exact selection');assert.deepEqual(saves[1].data.ids,['c-pink']);assert(find(dialog,n=>n.text&&n.text.includes('1 photo saved as main')));
 assert.deepEqual(calls.filter(c=>c.action==='save').flatMap(c=>Object.keys(c.data)).filter(k=>['tags','history','custom'].includes(k)),[]);
 // Exercise actual split completion; the photo link remains until the user dismisses it.
 let splitDialog=new Node('dialog'),linkedIds,closed=0;const records={};
 Object.assign(ctx,{$:()=>splitDialog,needDb:()=>false,COLORS:{blue:'Blue',pink:'Pink'},colLabel:x=>x,cap:x=>x,DIMS:[],PHOTOS:{},chip:()=>new Node('button'),addClose(){},closeDlg(){closed++},state:{edits:{},db:{collection:col=>({doc:id=>({set:async value=>{records[col+'/'+id]=value},delete:async()=>{}})})}},openPhotoPreparation:ids=>linkedIds=Array.from(ids)});
 vm.runInContext(html.slice(html.indexOf('function openSplit('),html.indexOf('function photoRow(')),ctx);
 const pack={id:'c-pack',customId:'pack',name:'Socks pack',colors:['blue','pink'],photoId:'old'};
 splitDialog.showModal();
 ctx.Event=Event;
 const dismissSource=fs.readFileSync(__dirname+'/../app/scripts/dialogs.js','utf8');
 vm.runInContext(dismissSource.slice(dismissSource.indexOf('function requestClosetDialogClose('),dismissSource.indexOf('function guardClosetDialog(')),ctx);
 for(const way of ['cancel','escape','backdrop','close']){
  ctx.openSplit(pack);const sheet=dialog;
  assert.notEqual(sheet,splitDialog,'Split has its own dialog over the piece');
  if(way==='cancel')find(sheet,n=>n.text==='Cancel').click();
  else if(way==='escape')sheet.dispatchEvent(new Event('cancel',{cancelable:true}));
  else ctx.requestClosetDialogClose(sheet);
  assert.equal(sheet.open,false,way+' dismisses Split');assert.equal(sheet.isConnected,false);
  assert.equal(splitDialog.open,true,way+' keeps the piece open');assert.equal(closed,0,way+' never closes the piece route');
 }
 ctx.openSplit(pack);const sheet=dialog;
 find(sheet,n=>n.tag==='button'&&n.text==='Split into separate pieces').click();
 ctx.requestClosetDialogClose(sheet);assert.equal(sheet.open,true,'cannot dismiss while the split is saving');
 await turn();await turn();assert.equal(sheet.open,false);assert.equal(closed,1,JSON.stringify({notices,records}));
 assert.equal(dialog,sheet,'wait for the asynchronous piece-close/navigation before opening completion');
 splitDialog.close();assert.equal(dialog.open,true);find(dialog,n=>n.text==='Prepare individual photos').click();assert.equal(linkedIds.length,2);assert(linkedIds.every(id=>records['custom/'+id.slice(2)]),'photo workflow gets only newly split piece IDs');
 console.log('Photo preparation: local/chat prompts, failed-create preservation, review selection, failed-save retry, and split handoff passed.');
})().catch(e=>{console.error(e);process.exit(1)});
