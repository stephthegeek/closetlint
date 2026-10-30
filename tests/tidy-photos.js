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
 assert.equal(c.tidyPhotoCandidates([oldRejected],null,true).length,0,'an alternate upload does not override a reviewed main photo');
 assert.equal(c.tidyPhotoCandidates([{...oldRejected,photoId:'new-upload'}],null,true)[0].source.photoId,'new-upload','a new main photo can be reviewed');
 const oldCutout={...withCutout,photoId:'cutout',photos:[...withCutout.photos,{photoId:'new-upload'}]};
 assert.equal(c.tidyPhotoCandidates([oldCutout],null,true).length,0,'an accepted main cutout does not fall back to another gallery photo');
 assert.equal(c.tidyPhotoCandidates([oldCutout],null,false).length,0,'including processed sources still never falls back from the main cutout');
 const twiceSkipped={...oldRejected,tidySkippedSourcePhotoId:'new-upload',photos:oldRejected.photos.map(p=>({...p,tidySkipped:true}))};
 assert.equal(c.tidyPhotoCandidates([twiceSkipped],null,true).length,0,'earlier rejected originals do not reappear after reviewing a second photo');
 assert.equal(c.tidyPhotoCandidates([{...twiceSkipped,photoId:'new-main'}],null,true)[0].source.photoId,'new-main','a replacement main missing from legacy gallery metadata remains eligible');
 assert.equal(c.tidyPhotoCandidates([{...items[0],photos:[{photoId:'photo0'},{photoId:'older-alt'},{photoId:'latest-alt'}]}],null,true)[0].source.photoId,'photo0','the current main photo wins over newer alternate views');
 const recastMain={...items[0],photoId:'isolated-main',photos:[{photoId:'isolated-main',kind:'recast'},{photoId:'camera-original',kind:'model'}]};
 assert.equal(c.tidyPhotoCandidates([recastMain],null,true)[0].source.photoId,'isolated-main','imported isolated/recast main is used instead of the retained original');
 assert.equal(c.tidyPhotoCandidates([{...recastMain,photos:recastMain.photos.slice().reverse()}],null,true)[0].source.photoId,'isolated-main','gallery order cannot change the selected source');
 assert.equal(c.tidyPhotoCandidates([{...recastMain,photoId:undefined,photo:'catalog.jpg'}],null,true).length,0,'a catalog main without a saved ID cannot silently select an alternate');
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
  get options(){const out=[];function visit(n){if(n.tag==='option')out.push(n);(n.children||[]).forEach(x=>{if(typeof x==='object')visit(x)})}visit(this);return out}
  append(...children){children.flat().filter(x=>x!=null).forEach(x=>this.appendChild(x))}
  appendChild(child){this.children.push(child);if(this.tag==='select'&&this.value===undefined&&child.tag==='option')this.value=child.value;return child}
  addEventListener(name,fn){this.events[name]=fn}showModal(){this.open=true}close(){this.open=false;this.events.close?.()}remove(){this.removed=true}
 }
 function find(node,predicate){if(node&&predicate(node))return node;for(const child of node.children||[]){if(typeof child==='object'){const match=find(child,predicate);if(match)return match}}}
 function click(node){assert(node,'control exists');assert(!node.disabled,'control is enabled');return (node.onclick||node.events.click)()}
 let draft=null;let dialog,prepared=0,saved=0,skipped=0,failSave=false,failSkip=false,confirms=0;const processed=[];
 const pieces=Array.from({length:25},(_,i)=>({id:'test'+i,name:'Test '+i,meta:'Tops',sub:'Tees',photoId:'original'+i,photos:[{photoId:'original'+i,kind:'isolated',src:'/_blob/original'+i}]}));
 const ctx={Blob,Set,Error,console,SECTIONS:[['clothing','Clothing'],['accessories','Accessories'],['jewelry','Jewelry']],sectionOf:p=>p.meta==='Tops'?'clothing':'accessories',URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},
  Image:class{constructor(){this.naturalWidth=this.naturalHeight=100}set src(value){Promise.resolve().then(()=>this.onload())}},
  el:(...args)=>new Node(...args),toast(){},allItems:()=>pieces,collectionList:()=>[],byId:()=>Object.fromEntries(pieces.map(p=>[p.id,p])),piecePhotos:p=>p.photos,photoRecord:p=>({...p}),
  state:{db:{},picked:{},assets:{upload:async()=>({id:'cutout'+saved})}},
  savePhotoViews:async(item,photos,main)=>{if(failSave)return false;saved++;item.photos=photos;item.photoId=main.photoId;return true},
  patchEdit:async(item,patch)=>{if(failSkip)return false;skipped++;Object.assign(item,patch);return true},
  $:()=>({set textContent(v){},appendChild(d){dialog=d}}),batchDraftSave(kind,read){draft=ctx.batchDraftCopy(read())},batchDraftCheckpoint:async(kind,read)=>{draft=ctx.batchDraftCopy(read())},batchDraftRead:async()=>structuredClone(draft),batchDraftNotice:()=>new Node('div'),batchWorkspaceReturn(){dialog.open=false},
  document:{body:{appendChild(d){dialog=d}}},window:{scrollTo(){},addEventListener(){},removeEventListener(){},confirm(){confirms++;return true},ClosetLintRuntime:{backgroundStatus:async()=>({available:true}),removeBackground:async id=>{processed.push(id);prepared++;return {size:10}}}}};
 vm.createContext(ctx);const helper=fs.readFileSync(__dirname+'/../app/scripts/batch-workspaces.js','utf8');vm.runInContext(helper.slice(helper.indexOf('function batchDraftCopy('),helper.indexOf('function batchDraftSave(')),ctx);vm.runInContext(src.slice(src.indexOf('function photoWorkIndicator('),src.indexOf('function openBackgroundPreview(')),ctx);vm.runInContext(src.slice(src.indexOf('function tidyPhotoCandidates('),src.indexOf('\nfunction openEdit(',src.indexOf('function openTidyPhotos('))),ctx);
 const button=text=>find(dialog,n=>n.tag==='button'&&n.text===text);
 const begin=async()=>{ctx.openTidyPhotos();await tick();dialog.open=true;assert(find(dialog,n=>n.tag==='option'&&n.value==='category:Tops'&&n.text==='All Tops'),'whole-category option is selectable');assert(find(dialog,n=>n.tag==='option'&&n.value==='section:clothing'),'broad closet section is selectable');assert(find(dialog,n=>n.tag==='option'&&n.value==='type:Tops|Tees'),'narrower type remains available');dialog.scrollTop=700;click(button('Prepare first 12'));await tick();assert.equal(dialog.scrollTop,0,'first review starts at the top')};
 await begin();assert.equal(prepared,12);dialog.scrollTop=700;
 click(find(dialog,n=>n['aria-label']==='Save cutout as main photo for Test 0'));
 assert.equal(dialog.scrollTop,700,'selecting a photo preserves review position');
 const parked=ctx.tidyWorkspace;click(button('← Back'));assert.equal(ctx.tidyWorkspace,parked,'Back keeps ready results in memory');
 ctx.openTidyPhotos();assert.equal(ctx.tidyWorkspace,parked);assert.equal(prepared,12,'returning does not prepare the same photos again');
 ctx.tidyWorkspace=null;ctx.openTidyPhotos();await tick();dialog.open=true;
 assert.equal(prepared,12,'restoring after reload does not regenerate ready cutouts');assert.equal(ctx.tidyWorkspace.queue.page[0].checked,true,'restored review retains selected cutouts');

 const footer=find(dialog,n=>n.class==='tidy-bottom');assert.equal(footer.children.filter(n=>n.tag==='button').map(n=>n.text).join('|'),'Save and return|Save and continue','close precedes continue in keyboard and visual order');assert.equal(find(dialog,n=>n.id==='tidy-save-count').text,'1 cutout to save','shared count describes both actions');
 failSave=true;await click(button('Save and return'));
 assert.equal(dialog.open,true,'save failure keeps the review open');assert.equal(saved,0);assert.equal(skipped,0,'failed saves do not discard the remaining review');assert.equal(dialog.scrollTop,0,'save failure exposes its status message');
 failSave=false;failSkip=true;await click(button('Save and return'));assert.equal(saved,1);assert.equal(dialog.open,true,'failure remembering original choices also keeps review open');
 failSkip=false;await click(button('Save and return'));
 assert.equal(dialog.open,false);assert.equal(saved,1,'retry does not save an accepted cutout twice');assert.equal(skipped,11);assert.equal(prepared,12,'save and close never prepares a later batch');assert.equal(confirms,0,'saving and closing needs no discard confirmation');
 assert.equal(pieces[0].photos[0].photoId,'original0','original photo is retained');assert.equal(pieces[12].tidySkippedSourcePhotoId,undefined,'unreviewed photos remain eligible');
 // A separate run advances through the untouched photos, resetting only on batch changes.
 await begin();assert.equal(prepared,24);dialog.scrollTop=900;
 click(find(dialog,n=>n['aria-label']==='Save cutout as main photo for Test 12'));await click(button('Save and continue'));await tick();assert.equal(saved,2,'continue saves selected cutouts just like close');assert.equal(prepared,25);assert.equal(dialog.scrollTop,0,'next batch opens at the top');
 assert.equal(button('Save and continue'),undefined,'last batch offers only save and close');assert.equal(find(dialog,n=>n.id==='tidy-save-count').text,'0 cutouts to save');await click(button('Save and return'));assert.equal(dialog.open,false);
 assert.equal(pieces[1].photos.find(p=>p.photoId==='original1').tidySkipped,true,'an original choice is remembered on its photo');
 delete pieces[1].photos.find(p=>p.photoId==='original1').tidySkipped; // Legacy record: only the piece-level skip ID exists.
 pieces[1].photos.push({photoId:'new-gallery-photo',kind:'unclassified'});pieces[1].photoId='new-gallery-photo';
 await begin();assert.equal(prepared,26);assert.equal(processed.at(-1),'new-gallery-photo');
 await click(button('Save and return'));assert.equal(pieces[1].photos.find(p=>p.photoId==='original1').tidySkipped,true);assert.equal(pieces[1].photos.find(p=>p.photoId==='new-gallery-photo').tidySkipped,true,'both rejected originals retain separate review history');
 assert.equal(ctx.tidyPhotoCandidates(pieces,null,true).length,0,'saving the new photo choice does not resurrect legacy or current rejected photos');
 ctx.openTidyPhotos();await tick();assert(find(dialog,n=>n.tag==='option'&&n.value==='category:Tops'),'whole category remains discoverable when all photos were reviewed');assert.equal(button('Prepare first 12').disabled,true,'reviewed-only scope reports no eligible photos');click(button('← Back'));
 // Ready choices must stay usable while later photos are still processing.
 ctx.tidyWorkspace=null;draft=null;const gates=[];ctx.window.ClosetLintRuntime.removeBackground=()=>new Promise(resolve=>gates.push(resolve));
 for(let i=0;i<2;i++)pieces.push({id:'slow'+i,name:'Slow '+i,meta:'Tops',sub:'Tees',photoId:'slow-original'+i,photos:[{photoId:'slow-original'+i,src:'/_blob/slow-original'+i}]});
 await begin();assert(find(dialog,n=>n.class==='tidy-sticky'),'batch progress stays in the sticky header');
 assert(find(dialog,n=>n.class==='photo-work photo-work-waiting'),'queued result has a visible waiting indicator');
 assert.equal(button('Save and return').disabled,true);const savedBefore=saved;
 gates.shift()({size:10});await tick();
 const firstCutout=find(dialog,n=>n['aria-label']==='Save cutout as main photo for Slow 0');assert.equal(firstCutout.disabled,false,'finished photo is selectable while another processes');click(firstCutout);
 assert.equal(find(dialog,n=>n['aria-label']==='Keep current main photo for Slow 1').disabled,true,'unfinished photo stays locked');
 assert.equal(button('Save and return').disabled,true,'saving still waits for the batch');assert.equal(saved,savedBefore,'selection never saves automatically');
 // A reload stops in-flight work. Restore only the unfinished preparation.
 const oldQueue=ctx.tidyWorkspace.queue;oldQueue.cancel();ctx.tidyWorkspace=null;ctx.openTidyPhotos();await tick();dialog.open=true;
 assert.equal(ctx.tidyWorkspace.queue.page[0].checked,true);assert.equal(ctx.tidyWorkspace.queue.running,false);
 assert(button('Resume preparation'),'interrupted work has an explicit recovery action');
 gates.shift()({size:10});await tick();click(button('Resume preparation'));await tick();
 assert.equal(ctx.tidyWorkspace.queue.page[0].status,'ready','already prepared cutout stays ready during resumed processing');

 const progress=find(dialog,n=>n.tag==='progress');assert.equal(progress.value,1);assert.equal(progress.max,2);assert.equal(progress.hidden,false);
 gates.shift()({size:10});await tick();assert.equal(find(dialog,n=>n['aria-label']==='Save cutout as main photo for Slow 0')['aria-pressed'],'true','selection survives later photo completion');
 assert.equal(find(dialog,n=>n.tag==='progress').hidden,true);assert.equal(button('Save and return').disabled,false);await click(button('Save and return'));assert.equal(saved,savedBefore+1);assert.equal(pieces.at(-1).tidySkippedSourcePhotoId,'slow-original1');
 const changed={id:'changed-main',name:'Changed main',meta:'Tops',sub:'Tees',photoId:'first-main',photos:[{photoId:'first-main',src:'/_blob/first-main'}]};pieces.push(changed);
 ctx.window.ClosetLintRuntime.removeBackground=async()=>({size:10});await begin();
 click(find(dialog,n=>n['aria-label']==='Save cutout as main photo for Changed main'));
 const beforeChanged=saved;changed.photos.push({photoId:'replacement-main',src:'/_blob/replacement-main'});changed.photoId='replacement-main';await click(button('Save and return'));
 assert.equal(saved,beforeChanged,'a queued cutout cannot overwrite a new main photo');assert.equal(changed.photoId,'replacement-main');assert.equal(dialog.open,true);assert(find(dialog,n=>typeof n.text==='string'&&n.text.includes('The main photo changed')));click(button('← Back'));
 console.log('Tidy dialog: batch scroll reset, stable selection scroll, save-and-close, retry safety, and untouched later photos pass.');
}
