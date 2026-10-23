const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),c={Set,Error};vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('function photoFraming('),src.indexOf('function photoRecord(')),c);
vm.runInContext(src.slice(src.indexOf('function piecePhotos('),src.indexOf('function piecePhotoPanel(')),c);
vm.runInContext(src.slice(src.indexOf('function tidyPhotoCandidates('),src.indexOf('function openTidyPhotos(')),c);
c.sectionOf=it=>({Jewelry:'jewelry',Footwear:'accessories',Tops:'clothing'})[it.meta]||'clothing';
const tick=()=>new Promise(setImmediate);
(async()=>{
 const items=Array.from({length:25},(_,i)=>({id:'p'+i,name:'Synthetic '+i,photoId:'photo'+i,photos:[{photoId:'photo'+i,kind:'model'}]}));
 const input=JSON.stringify(items);let prepared=0,writes=0,attempts=0,failSave=true;const skipped=[];
 const candidates=c.tidyPhotoCandidates(items,null,true);
 const q=c.createTidyQueue(candidates,{change(){},remove:async()=>{prepared++;return {size:10}},save:async(row,main)=>{attempts++;if(row.itemId==='p1'&&failSave)throw Error('Synthetic save failure');writes++;assert.equal(main,true,'chosen cutouts become the main photo')},skip:async row=>{skipped.push(row.itemId)}});
 await q.next();assert.equal(prepared,12);assert.equal(writes,0,'preparing a batch never writes');assert.equal(q.page.length,12);
 q.selectReady();assert.equal(q.page.filter(x=>x.checked).length,12,'bulk selection chooses every ready cutout without saving');assert.equal(writes,0);
 q.page.forEach(x=>{x.checked=false});
 q.page[0].checked=q.page[1].checked=true;let result=await q.keep();assert.equal(result.failed,1);
 assert.equal(writes,1);assert.equal(q.page[0].status,'kept');assert.equal(q.page[1].status,'ready','failed save stays reviewable');
 failSave=false;result=await q.keep();assert.equal(result.failed,0);assert.equal(writes,2);assert.equal(q.savedTotal,2);assert.equal(attempts,3,'already kept rows are not saved again');
 result=await q.skip();assert.equal(result.skipped,10);assert.equal(skipped.length,10);assert.ok(!skipped.includes('p0')&&!skipped.includes('p1'),'chosen cutouts are not marked as rejected');
 await q.next();assert.equal(prepared,24);assert.equal(writes,2,'moving past unchecked results never saves them');await q.next();assert.equal(prepared,25);assert.equal(q.page.length,1);
 assert.equal(JSON.stringify(items),input,'candidate selection and preparation leave source records unchanged');
 const withCutout={...items[0],photos:[...items[0].photos,{photoId:'cutout',sourcePhotoId:'photo0',cutout:true}]};
 assert.equal(c.tidyPhotoCandidates([withCutout],null,true).length,0);assert.equal(c.tidyPhotoCandidates([withCutout],null,false).length,1);
 assert.equal(c.tidyPhotoCandidates([{...items[0],tidySkippedSourcePhotoId:'photo0'}],null,true).length,0,'reviewed original is not proposed again');
 assert.equal(c.tidyPhotoCandidates([{...items[0],tidySkippedSourcePhotoId:'older-photo'}],null,true).length,1,'a changed source photo can be reviewed');
 const oldRejected={...items[0],tidySkippedSourcePhotoId:'photo0',photos:[{photoId:'photo0',tidySkipped:true},{photoId:'new-upload'}]};
 assert.equal(c.tidyPhotoCandidates([oldRejected],null,true)[0].source.photoId,'new-upload','a new gallery upload is eligible even while the old original stays main');
 const oldCutout={...withCutout,photoId:'cutout',photos:[...withCutout.photos,{photoId:'new-upload'}]};
 assert.equal(c.tidyPhotoCandidates([oldCutout],null,true)[0].source.photoId,'new-upload','an old accepted cutout does not hide a new source photo');
 const twiceSkipped={...oldRejected,tidySkippedSourcePhotoId:'new-upload',photos:oldRejected.photos.map(p=>({...p,tidySkipped:true}))};
 assert.equal(c.tidyPhotoCandidates([twiceSkipped],null,true).length,0,'earlier rejected originals do not reappear after reviewing a second photo');
 assert.equal(c.tidyPhotoCandidates([{...twiceSkipped,photoId:'new-main'}],null,true)[0].source.photoId,'new-main','a replacement main missing from legacy gallery metadata remains eligible');
 assert.equal(c.tidyPhotoCandidates([{...items[0],photos:[{photoId:'photo0'},{photoId:'older-alt'},{photoId:'latest-alt'}]}],null,true)[0].source.photoId,'latest-alt','the most recently added original is prioritized');
 assert.equal(c.tidyPhotoCandidates(items,['p4'],true)[0].itemId,'p4');
 assert.equal(c.tidyPhotoCandidates([items[0],{...items[0],id:'other-variant'}],null,true).length,2,'separate pieces sharing a source are not lost');
 const scopes=[{...items[0],meta:'Jewelry',sub:'Necklaces'},{...items[1],meta:'Footwear',sub:'Heels'}];
 assert.equal(c.tidyPhotoScopeIds(scopes,'category:Jewelry',[],[]).join(','),'p0');
 assert.equal(c.tidyPhotoScopeIds(scopes,'section:accessories',[],[]).join(','),'p1');
 assert.equal(c.tidyPhotoScopeIds(scopes,'type:Footwear|Heels',[],[]).join(','),'p1');
 assert.equal(c.tidyPhotoScopeIds(scopes,'collection:favorite',[{id:'favorite',ids:['p0']}],[]).join(','),'p0');
 let release;
 const cancelled=c.createTidyQueue(candidates,{change(){},remove:()=>new Promise(r=>release=r),save:async()=>{throw Error('must not save')}});
 const running=cancelled.next();cancelled.cancel();release({size:10});await running;assert.equal(cancelled.page.filter(x=>x.status==='ready').length,0);assert.equal(cancelled.running,false);
 let n=0;const failed=c.createTidyQueue(candidates.slice(0,2),{change(){},remove:async()=>{if(!n++)throw Error('Synthetic mask failure');return {size:10}},save:async()=>{}});await failed.next();assert.equal(failed.page[0].status,'error');assert.equal(failed.page[1].status,'ready');
 failed.selectReady();assert.equal(failed.page[0].checked,false,'failed results keep their originals');assert.equal(failed.page[1].checked,true);
 let failSkip=true;const review=c.createTidyQueue(candidates.slice(0,1),{change(){},remove:async()=>({size:10}),save:async()=>{},skip:async()=>{if(failSkip)throw Error('Synthetic storage failure')}});
 await review.next();result=await review.skip();assert.equal(result.failed,1);assert.equal(review.page[0].status,'ready','failed skip remains reviewable');
 failSkip=false;result=await review.skip();assert.equal(result.skipped,1);assert.equal(review.page[0].status,'skipped');
 assert.equal(c.photoFraming({kind:'model'}),'cover');assert.equal(c.photoFraming({kind:'model',cutout:true}),'contain');assert.equal(c.photoFraming({kind:'model',framing:'contain'}),'contain');assert.equal(c.photoFraming({kind:'unclassified'}),'contain');
 await checkDialogFlow();
 console.log('Tidy photos: 12-result pages, chosen cutouts, remembered skips, variant retention, cancellation, failures, retries, and framing defaults pass.');
})().catch(e=>{console.error(e);process.exit(1)});

// Exercise the real dialog handlers with synthetic pieces and photo services.
async function checkDialogFlow(){
 class Node{
  constructor(tag,attrs,...children){this.tag=tag;Object.assign(this,attrs||{});this.children=[];this.events={};this.dataset={};this.scrollTop=0;this.append(...children)}
  set textContent(value){this.text=value;this.children=[]}get textContent(){return this.text||''}
  append(...children){children.flat().filter(x=>x!=null).forEach(x=>this.appendChild(x))}
  appendChild(child){this.children.push(child);if(this.tag==='select'&&this.value===undefined&&child.tag==='option')this.value=child.value;return child}
  addEventListener(name,fn){this.events[name]=fn}showModal(){this.open=true}close(){this.open=false;this.events.close?.()}remove(){this.removed=true}
 }
 function find(node,predicate){if(node&&predicate(node))return node;for(const child of node.children||[]){if(typeof child==='object'){const match=find(child,predicate);if(match)return match}}}
 function click(node){assert(node,'control exists');assert(!node.disabled,'control is enabled');return (node.onclick||node.events.click)()}
 let dialog,prepared=0,saved=0,skipped=0,failSave=false,failSkip=false,confirms=0;const processed=[];
 const pieces=Array.from({length:25},(_,i)=>({id:'test'+i,name:'Test '+i,meta:'Tops',sub:'Tees',photoId:'original'+i,photos:[{photoId:'original'+i,kind:'isolated',src:'/_blob/original'+i}]}));
 const ctx={Set,Error,console,SECTIONS:[['clothing','Clothing'],['accessories','Accessories'],['jewelry','Jewelry']],sectionOf:p=>p.meta==='Tops'?'clothing':'accessories',URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},
  Image:class{constructor(){this.naturalWidth=this.naturalHeight=100}set src(value){Promise.resolve().then(()=>this.onload())}},
  el:(...args)=>new Node(...args),toast(){},allItems:()=>pieces,collectionList:()=>[],byId:()=>Object.fromEntries(pieces.map(p=>[p.id,p])),piecePhotos:p=>p.photos,photoRecord:p=>({...p}),
  state:{db:{},picked:{},assets:{upload:async()=>({id:'cutout'+saved})}},
  savePhotoViews:async(item,photos,main)=>{if(failSave)return false;saved++;item.photos=photos;item.photoId=main.photoId;return true},
  patchEdit:async(item,patch)=>{if(failSkip)return false;skipped++;Object.assign(item,patch);return true},
  document:{body:{appendChild(d){dialog=d}}},window:{addEventListener(){},removeEventListener(){},confirm(){confirms++;return true},ClosetLintRuntime:{backgroundStatus:async()=>({available:true}),removeBackground:async id=>{processed.push(id);prepared++;return {size:10}}}}};
 vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('function tidyPhotoCandidates('),src.indexOf('\nfunction openEdit(',src.indexOf('function openTidyPhotos('))),ctx);
 const button=text=>find(dialog,n=>n.tag==='button'&&n.text===text);
 const begin=async()=>{ctx.openTidyPhotos();await tick();assert(find(dialog,n=>n.tag==='option'&&n.value==='category:Tops'&&n.text==='All Tops'),'whole-category option is selectable');assert(find(dialog,n=>n.tag==='option'&&n.value==='section:clothing'),'broad closet section is selectable');assert(find(dialog,n=>n.tag==='option'&&n.value==='type:Tops|Tees'),'narrower type remains available');dialog.scrollTop=700;click(button('Prepare first 12'));await tick();assert.equal(dialog.scrollTop,0,'first review starts at the top')};
 await begin();assert.equal(prepared,12);dialog.scrollTop=700;
 click(find(dialog,n=>n['aria-label']==='Save cutout as main photo for Test 0'));
 assert.equal(dialog.scrollTop,700,'selecting a photo preserves review position');
 failSave=true;await click(button('Save and close'));
 assert.equal(dialog.open,true,'save failure keeps the review open');assert.equal(saved,0);assert.equal(skipped,0,'failed saves do not discard the remaining review');assert.equal(dialog.scrollTop,0,'save failure exposes its status message');
 failSave=false;failSkip=true;await click(button('Save and close'));assert.equal(saved,1);assert.equal(dialog.open,true,'failure remembering original choices also keeps review open');
 failSkip=false;await click(button('Save and close'));
 assert.equal(dialog.open,false);assert.equal(saved,1,'retry does not save an accepted cutout twice');assert.equal(skipped,11);assert.equal(prepared,12,'save and close never prepares a later batch');assert.equal(confirms,0,'saving and closing needs no discard confirmation');
 assert.equal(pieces[0].photos[0].photoId,'original0','original photo is retained');assert.equal(pieces[12].tidySkippedSourcePhotoId,undefined,'unreviewed photos remain eligible');
 // A separate run advances through the untouched photos, resetting only on batch changes.
 await begin();assert.equal(prepared,24);dialog.scrollTop=900;
 await click(button('Keep originals and continue'));await tick();assert.equal(prepared,25);assert.equal(dialog.scrollTop,0,'next batch opens at the top');
 assert.equal(button('Keep originals and continue'),undefined,'last batch offers only save and close');await click(button('Save and close'));assert.equal(dialog.open,false);
 assert.equal(pieces[1].photos.find(p=>p.photoId==='original1').tidySkipped,true,'an original choice is remembered on its photo');
 delete pieces[1].photos.find(p=>p.photoId==='original1').tidySkipped; // Legacy record: only the piece-level skip ID exists.
 pieces[1].photos.push({photoId:'new-gallery-photo',kind:'unclassified'});
 await begin();assert.equal(prepared,26);assert.equal(processed.at(-1),'new-gallery-photo');
 await click(button('Save and close'));assert.equal(pieces[1].photos.find(p=>p.photoId==='original1').tidySkipped,true);assert.equal(pieces[1].photos.find(p=>p.photoId==='new-gallery-photo').tidySkipped,true,'both rejected originals retain separate review history');
 assert.equal(ctx.tidyPhotoCandidates(pieces,null,true).length,0,'saving the new photo choice does not resurrect legacy or current rejected photos');
 ctx.openTidyPhotos();await tick();assert(find(dialog,n=>n.tag==='option'&&n.value==='category:Tops'),'whole category remains discoverable when all photos were reviewed');assert.equal(button('Prepare first 12').disabled,true,'reviewed-only scope reports no eligible photos');click(button('Close'));
 console.log('Tidy dialog: batch scroll reset, stable selection scroll, save-and-close, retry safety, and untouched later photos pass.');
}
