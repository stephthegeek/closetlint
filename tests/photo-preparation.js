const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/scripts/photo-preparation.js','utf8');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
assert.equal(html.split('/* BEGIN PHOTO PREPARATION (source: app/scripts/photo-preparation.js) */\n')[1].split('/* END PHOTO PREPARATION */')[0],source);
class Node{
 constructor(tag,a={},...children){this.tag=tag;Object.assign(this,a||{});this.children=children.filter(Boolean);this.events={};this.isConnected=true;this.classList={toggle(){}}}
 appendChild(n){this.children.push(n);return n}append(...n){this.children.push(...n.filter(Boolean))}set textContent(v){this.text=v;this.children=[]}get textContent(){return this.text||''}
 addEventListener(k,f){this.events[k]=f}showModal(){this.open=true}close(){this.open=false;if(this.events.close)this.events.close()}remove(){this.isConnected=false}click(){return this.onclick&&this.onclick()}
}
function find(n,p){if(p(n))return n;for(const c of n.children||[]){if(typeof c!=='object')continue;const match=find(c,p);if(match)return match}}
const turn=()=>new Promise(setImmediate);
(async()=>{
 let dialog,calls=[],failCreate=true,failSave=true,notices=[],read=[],discardPrompts=0;
 const request={requestId:'req',instance:'wardrobe',folder:'/private/photo-work',pieces:[{id:'c-blue',name:'Blue socks',colors:['blue'],source:'source.png',note:''},{id:'c-pink',name:'Pink socks',colors:['pink'],source:'source.png',note:''}]};
 const checked={...request,token:'review-token',photos:[{id:'c-blue',photo:{photoId:'blue'}},{id:'c-pink',photo:{photoId:'pink'}}]};
 const runtime={photoPrepare:async(action,data)=>{calls.push({action,data:JSON.parse(JSON.stringify(data))});if(action==='create'){if(failCreate)throw Error('Temporary create failure');return request}if(action==='check')return checked;if(failSave)throw Error('Temporary save failure');return {ids:data.ids,saved:data.ids.length,token:data.token}},photoPrepareRead:async(id,opts)=>{read.push({id,opts});return opts?{}:request}};
 const ctx={console,Date,Math,setTimeout,Promise,window:{confirm:()=>{discardPrompts++;return false},ClosetLintRuntime:runtime,ClosetLintLocal:{instance:'wardrobe'}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},localStorage:{getItem:()=>'',setItem(){},removeItem(){}},document:{body:{appendChild:d=>dialog=d}},el:(...args)=>new Node(...args),byId:()=>({'c-blue':{id:'c-blue',name:'Blue socks',photo:'old-blue'},'c-pink':{id:'c-pink',name:'Pink socks',photo:'old-pink'}}),toast:x=>notices.push(x),photoThumbnail:x=>x,setupLabel:(text,input)=>new Node('label',{},input),copyClipboard:async()=>true};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 for(const route of ['local','file']){
  const text=ctx.photoPreparationPrompt(request,route);assert.match(text,/do not import, split, duplicate, retag/);assert.match(text,/actual image editor/);assert.match(text,/declined, or fails/);assert.match(text,/c-blue/);assert.match(text,/c-pink/);
  if(route==='file'){assert(!text.includes(request.folder),'chat request does not disclose host folder paths');assert.match(text,/Return a ZIP/)}else assert.match(text,/Do not write directly to the wardrobe database/);
 }
 ctx.openPhotoPreparation(['c-blue','c-pink']);
 const input=find(dialog,n=>n['aria-label']==='Photo detail for Blue socks');input.value='Blue pair on the left';input.events.input();
 dialog.events.cancel({preventDefault(){}});assert.equal(discardPrompts,1);assert.equal(dialog.open,true,'unsaved photo notes survive canceled dismissal');
 find(dialog,n=>n.text==='Prepare assistant request').click();dialog.events.cancel({preventDefault(){}});assert.equal(dialog.open,true,'active photo work blocks dismissal');assert.equal(discardPrompts,1,'busy work does not ask to discard');await turn();assert.match(find(dialog,n=>n.role==='status').text,/Temporary create failure/);assert.equal(find(dialog,n=>n['aria-label']==='Photo detail for Blue socks').value,'Blue pair on the left');assert.equal(find(dialog,n=>n.text==='Prepare assistant request').disabled,false);
 failCreate=false;find(dialog,n=>n.text==='Prepare assistant request').click();await turn();assert.equal(calls[0].data.request,calls[1].data.request,'failed request creation reuses its ID');assert.equal(calls[1].data.notes['c-blue'],'Blue pair on the left');
 find(dialog,n=>n.text==='Check photos').click();await turn();assert(find(dialog,n=>n.text==='Save 2 photos as main'));
 const firstCheck=find(dialog,n=>n.tag==='input'&&n.type==='checkbox');firstCheck.checked=false;firstCheck.events.change();assert(find(dialog,n=>n.text==='Save 1 photo as main'));
 find(dialog,n=>n.text==='Save 1 photo as main').click();await turn();assert.match(find(dialog,n=>n.role==='status').text,/Temporary save failure/);assert.equal(find(dialog,n=>n.text==='Save 1 photo as main').disabled,false,'failed save unlocks with selected photo unchanged');
 failSave=false;find(dialog,n=>n.text==='Save 1 photo as main').click();await turn();
 const saves=calls.filter(c=>c.action==='save');assert.deepEqual(saves[0].data,saves[1].data,'retry uses same request, token, and exact selection');assert.deepEqual(saves[1].data.ids,['c-pink']);assert(find(dialog,n=>n.text&&n.text.includes('1 photo saved as main')));
 assert.deepEqual(calls.filter(c=>c.action==='save').flatMap(c=>Object.keys(c.data)).filter(k=>['tags','history','custom'].includes(k)),[]);
 // Exercise actual split completion; the photo link remains until the user dismisses it.
 let splitDialog=new Node('dialog'),linkedIds,closed=0;const records={};
 Object.assign(ctx,{$:()=>splitDialog,needDb:()=>false,COLORS:{blue:'Blue',pink:'Pink'},colLabel:x=>x,cap:x=>x,DIMS:[],PHOTOS:{},chip:()=>new Node('button'),addClose(){},closeDlg(){closed++},state:{edits:{},db:{collection:col=>({doc:id=>({set:async value=>{records[col+'/'+id]=value},delete:async()=>{}})})}},openPhotoPreparation:ids=>linkedIds=Array.from(ids)});
 vm.runInContext(html.slice(html.indexOf('function openSplit('),html.indexOf('function photoRow(')),ctx);
 const beforeCompletion=dialog;ctx.openSplit({id:'c-pack',customId:'pack',name:'Socks pack',colors:['blue','pink'],photoId:'old'});find(splitDialog,n=>n.tag==='button'&&n.text==='Split into separate pieces').click();await turn();await turn();assert.equal(closed,1,JSON.stringify({notices,records}));assert.equal(dialog,beforeCompletion,'wait for the asynchronous piece-close/navigation before opening completion');splitDialog.close();assert.equal(dialog.open,true);find(dialog,n=>n.text==='Prepare individual photos').click();assert.equal(linkedIds.length,2);assert(linkedIds.every(id=>records['custom/'+id.slice(2)]),'photo workflow gets only newly split piece IDs');
 console.log('Photo preparation: local/chat prompts, failed-create preservation, review selection, failed-save retry, and split handoff passed.');
})().catch(e=>{console.error(e);process.exit(1)});
