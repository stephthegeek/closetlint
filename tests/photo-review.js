const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
class Node{
 constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs=attrs||{};Object.assign(this,this.attrs);this.children=children.filter(Boolean);this.events={};this.dataset={};this.isConnected=true}
 append(...nodes){this.children.push(...nodes.filter(Boolean))}appendChild(n){this.children.push(n)}
 addEventListener(name,fn){this.events[name]=fn}showModal(){this.open=true}close(){this.open=false;if(this.events.close)this.events.close()}remove(){this.isConnected=false}
}
const turn=()=>new Promise(setImmediate);
(async()=>{
 let uploads=0,saves=0,fail=false,lastDialog;
 const item={id:'synthetic',photoId:'original',ar:1,photos:[{photoId:'original',kind:'model',ar:1}]};
 const ctx={console,Date,URL:{createObjectURL:()=> 'blob:preview',revokeObjectURL(){}},window:{ClosetLintRuntime:{removeBackground:async()=>{if(fail)throw Error('Synthetic failure');return {type:'image/png'}}}},document:{body:{appendChild(d){lastDialog=d}}},el:(t,a,...ch)=>new Node(t,a,ch),toast(){},byId:()=>({synthetic:item}),state:{assets:{upload:async()=>{uploads++;return {id:'cutout'}}}},patchEdit:async(it,patch)=>{saves++;Object.assign(item,patch);return true}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function photoRecord('),source.indexOf('function piecePhotoPanel(')),ctx);
 const photo={photoId:'original',src:'/_blob/original',kind:'model',ar:1};
 ctx.openBackgroundPreview(item,photo,()=>{});await turn();
 assert.equal(uploads,0);assert.equal(saves,0,'preview does not save');lastDialog.close();assert.equal(saves,0,'discard does not save');
 let callback;
 ctx.openBackgroundPreview(item,photo,id=>callback=id);await turn();
 const actions=lastDialog.children.at(-1),keep=actions.children[1];assert.equal(keep.disabled,false);
 keep.events.click();await turn();await turn();
 assert.equal(uploads,1);assert.equal(saves,1);assert.equal(item.photoId,'cutout','accepting a cutout makes it the main photo');
 assert.equal(item.photos.length,2);assert.equal(item.photos[0].photoId,'original');assert.equal(item.photos[1].sourcePhotoId,'original');assert.equal(item.photos[1].kind,'model','model cutout remains labeled model');assert.equal(item.photos[1].cutout,true);assert.equal(callback,'cutout');
 fail=true;ctx.openBackgroundPreview(item,photo,()=>{});await turn();
 assert.equal(lastDialog.children.at(-1).children[1].disabled,true);assert.equal(uploads,1,'failed processing never uploads');assert.equal(saves,1);
 console.log('Photo review: preview/discard/failure do not save; accepting makes the cutout main and retains the original.');
})().catch(e=>{console.error(e);process.exit(1)});
