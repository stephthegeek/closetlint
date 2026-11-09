const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
class Node{
 constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs=attrs||{};Object.assign(this,this.attrs);this.children=children.filter(Boolean);this.events={};this.dataset={};this.isConnected=true}
 set textContent(value){this.text=value;this.children=[]}get textContent(){return this.text||''}
 setAttribute(name,value){this.attrs[name]=value}
 append(...nodes){this.children.push(...nodes.filter(Boolean))}appendChild(n){this.children.push(n)}
 addEventListener(name,fn){this.events[name]=fn}showModal(){this.open=true}close(){this.open=false;if(this.events.close)this.events.close()}remove(){this.isConnected=false}
}
const turn=()=>new Promise(setImmediate);
(async()=>{
 let uploads=0,saves=0,fail=false,lastDialog,releaseProcessing,hold=false,requested=[];
 const item={id:'synthetic',photoId:'original',ar:1,photos:[{photoId:'original',kind:'model',ar:1}]};
 const ctx={console,Date,URL:{createObjectURL:()=> 'blob:preview',revokeObjectURL(){}},window:{ClosetLintRuntime:{removeBackground:async(photoId,pieceId,model)=>{requested.push(model?[photoId,pieceId,model]:[photoId,pieceId]);if(hold)return new Promise(resolve=>{releaseProcessing=resolve});if(fail)throw Error('Synthetic failure');return {type:'image/png',processing:model==='u2net'?'rembg-u2net-mask':'rembg-isnet-general-use-mask'}}}},document:{body:{appendChild(d){lastDialog=d}}},el:(t,a,...ch)=>new Node(t,a,ch),toast(){},byId:()=>({synthetic:item}),state:{assets:{upload:async()=>{uploads++;return {id:'cutout'}}}},patchEdit:async(it,patch)=>{saves++;Object.assign(item,patch);return true}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function photoRecord('),source.indexOf('function piecePhotoPanel(')),ctx);
 const photo={photoId:'original',src:'/_blob/original',kind:'model',ar:1};
 ctx.openBackgroundPreview(item,photo,()=>{});await turn();
 assert.deepEqual(requested[0],['original','synthetic']);assert.equal(uploads,0);assert.equal(saves,0,'preview does not save');lastDialog.close();assert.equal(saves,0,'discard does not save');
 let callback;
 ctx.openBackgroundPreview(item,photo,id=>callback=id);await turn();
 const actions=lastDialog.children.at(-1),keep=actions.children[1];assert.equal(keep.disabled,false);
 keep.events.click();await turn();await turn();
 assert.equal(uploads,1);assert.equal(saves,1);assert.equal(item.photoId,'cutout','accepting a cutout makes it the main photo');
 assert.equal(item.photos[1].processing,'rembg-isnet-general-use-mask');assert.equal(item.photos.length,2);assert.equal(item.photos[0].photoId,'original');assert.equal(item.photos[1].sourcePhotoId,'original');assert.equal(item.photos[1].kind,'model','model cutout remains labeled model');assert.equal(item.photos[1].cutout,true);assert.equal(callback,'cutout');
 fail=true;ctx.openBackgroundPreview(item,photo,()=>{});await turn();
 assert.equal(lastDialog.children.at(-1).children[1].disabled,true);assert.equal(uploads,1,'failed processing never uploads');assert.equal(saves,1);
 const failureStage=lastDialog.children[2].children[1];assert.equal(failureStage.attrs['aria-busy'],'false');assert.match(failureStage.children[0].text,/No cutout was created/,'failed result space explains recovery');lastDialog.close();
 hold=true;ctx.openBackgroundPreview(item,photo,()=>{});
 const processingStage=lastDialog.children[2].children[1];assert.equal(processingStage.attrs['aria-busy'],'true');assert.equal(processingStage.children[0].class,'photo-work','single-photo processing has a visible result placeholder');assert.equal(lastDialog.children.at(-1).children[1].disabled,true);
 releaseProcessing({type:'image/png'});await turn();assert.equal(processingStage.attrs['aria-busy'],'false');assert.equal(processingStage.children[0].tag,'img','ready result replaces the loading placeholder');assert.equal(lastDialog.children.at(-1).children[1].disabled,false);
 lastDialog.close();ctx.openBackgroundPreview(item,photo,()=>{});const closedDialog=lastDialog;closedDialog.close();releaseProcessing({type:'image/png'});await turn();assert.equal(closedDialog.isConnected,false,'late result does not reopen a discarded preview');assert.equal(uploads,1);
 // Enabled installations can retry a saved cutout from its original and compare without saving.
 hold=false;fail=false;ctx.window.ClosetLintLocal={alternateBackgroundModel:true};
 ctx.openBackgroundPreview(item,item.photos[1],()=>{},'u2net');await turn();assert.deepEqual(requested.at(-1),['original','synthetic','u2net']);
 const retry=lastDialog.children.find(n=>n.class==='photo-model-retry');assert(retry);assert.equal(retry.disabled,false);retry.onclick();await turn();assert.deepEqual(requested.at(-1),['original','synthetic','isnet-general-use']);assert.equal(uploads,1);assert.equal(saves,1);
 fail=true;retry.onclick();await turn();assert.equal(lastDialog.children.at(-1).children[1].disabled,false,'failed retry keeps previous cutout available');lastDialog.close();
 console.log('Photo review: preview/discard/failure do not save; accepting makes the cutout main and retains the original.');
})().catch(e=>{console.error(e);process.exit(1)});
