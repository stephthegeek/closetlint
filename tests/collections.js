const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/scripts/collections.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../app/closet-lint.html'),'utf8');
assert.equal(html.split('/* BEGIN COLLECTIONS (source: app/scripts/collections.js) */\n')[1].split('\n/* END COLLECTIONS */')[0],source);
let fail=false,writes=[];const ctx={state:{profile:{},tab:'all',db:{collection:()=>({doc:id=>({set:async r=>{if(fail)throw Error('storage failed');writes.push({id,r})}})})}},renderFilters(){},renderGrid(){},isClosetTab:()=>true};vm.createContext(ctx);vm.runInContext(source,ctx);
(async()=>{
 const a=await ctx.collectionSave(null,{name:'First',ids:['owned','wish','owned']}),b=await ctx.collectionSave(null,{name:'Second',ids:['wish','third']});
 assert.equal(ctx.state.profile[a].ids.length,2);
 assert.equal(ctx.collectionMatches('owned',{[a]:true,[b]:true},ctx.collectionList()),true);
 assert.equal(ctx.collectionMatches('third',{[a]:true,[b]:true},ctx.collectionList()),true);
 assert.equal(ctx.collectionMatches('other',{[a]:true},ctx.collectionList()),false);
 assert.equal(ctx.collectionMatches('other',{},ctx.collectionList()),true);
 const copied=ctx.collectionIds(ctx.state.profile[a].ids);await ctx.collectionSave(a,{name:'First renamed',ids:['new']});assert.deepEqual(Array.from(copied),['owned','wish'],'snapshot membership independent');
 fail=true;await assert.rejects(ctx.collectionSave(a,{name:'Unsaved',ids:[]}));assert.equal(ctx.state.profile[a].name,'First renamed');fail=false;
 const old=ctx.state.profile[b];await ctx.collectionSave(b,{...old,deleted:true});assert.equal(ctx.collectionList().length,1);await ctx.collectionSave(b,old);assert.equal(ctx.collectionList().length,2);
 const ids=ctx.collectionTripIds({packedExtras:['extra','top']},{other:[{id:'jewelry'}]},{items:{top:{}},outer:[{id:'coat'}],shoes:[{it:{id:'shoe'}}],basics:{socks:{items:[{id:'sock'}]}}});assert.deepEqual(Array.from(ids),['top','coat','shoe','jewelry','extra','sock']);
 // Piece-level membership actions preserve the current form/view and preselect new collections.
 let picker,options,closed=0,notices=[];ctx.openCollections=(pick,opts)=>{picker=pick;options=opts};ctx.$=()=>({close(){closed++}});ctx.toast=m=>notices.push(m);
 const piece={id:'piece-from-modal',name:'Piece with unfinished form edits'};const tab=ctx.state.tab;
 ctx.addPieceToCollection(piece);assert.deepEqual(Array.from(options.initialIds),[piece.id]);assert.equal(options.title,'Add to collection');
 const target=ctx.collectionList().find(c=>c.id===b),beforeIds=target.ids.slice();fail=true;assert.equal(await picker(target),false);assert.equal(closed,0,'failed membership saves leave the chooser open');assert.deepEqual(Array.from(ctx.state.profile[b].ids),Array.from(beforeIds));
 fail=false;assert.equal(await picker(target),true);assert(ctx.state.profile[b].ids.includes(piece.id));assert.equal(ctx.state.tab,tab,'adding membership does not navigate away from the piece form');assert.equal(closed,1);const count=writes.length;await picker(ctx.collectionList().find(c=>c.id===b));assert.equal(writes.length,count,'already-added pieces do not write duplicates');
 ctx.addPieceToCollection(piece);const newId=await ctx.collectionSave(null,{name:'Created from piece',ids:options.initialIds});options.onCreated(newId);assert.deepEqual(Array.from(ctx.state.profile[newId].ids),[piece.id]);assert.match(notices.at(-1),/Created.*with this piece/);
 // Run the real collection editor completion path, including failure and retry.
 function node(tag,attrs={},...children){return {tag,value:'',...attrs,children:children.filter(Boolean),events:{},open:false,appendChild(n){this.children.push(n);return n},append(...ns){this.children.push(...ns.filter(Boolean))},set textContent(v){this.children=[];this.text=v},addEventListener(k,f){this.events[k]=f},showModal(){this.open=true},close(){this.open=false}}}
 const dialog=node('dialog'),seed={id:'seeded-piece',name:'Seeded piece',photo:'photo'};let createdId,redirects=0;
 Object.assign(ctx,{$:()=>dialog,el:node,setupLabel:(label,input)=>node('label',{},input),allItems:()=>[seed],searchHay:it=>it.name,photoThumbnail:x=>x,showCollection:()=>redirects++,window:{ClosetLintRoutes:{trackDialog(){},cleanDialog(){}}}});
 function find(root,predicate){if(predicate(root))return root;for(const child of root.children||[]){const match=find(child,predicate);if(match)return match}}
 ctx.editCollection(null,[seed.id],id=>createdId=id);find(dialog,n=>n['aria-label']==='Collection name').value='Seeded editor';assert.equal(find(dialog,n=>n['aria-label']==='Include Seeded piece').checked,true);
 const submit=find(dialog,n=>n.text==='Save collection');fail=true;submit.onclick();await new Promise(setImmediate);assert.equal(createdId,undefined);assert.equal(dialog.open,true);assert.equal(submit.disabled,false,'failed creation is retryable with entered name/selection intact');
 fail=false;submit.onclick();await new Promise(setImmediate);assert(createdId);assert.equal(dialog.open,false);assert.equal(redirects,0,'custom completion keeps the piece page instead of opening the collection');assert.deepEqual(Array.from(ctx.state.profile[createdId].ids),[seed.id]);
 // The card and editor share removal, including failed saves and failed Undo recovery.
 let confirmRemoval,undoAction,removedError='',returned=0;
 ctx.askConfirm=(message,label,fn)=>confirmRemoval=fn;ctx.toast=()=>{};ctx.toastAct=(message,label,fn)=>undoAction={label,fn};ctx.openCollections=()=>returned++;
 const saved=ctx.collectionList().find(c=>c.id===createdId),savedIds=Array.from(saved.ids);
 ctx.collectionRemove(saved,null,e=>removedError=e.message);assert.equal(ctx.state.profile[createdId].deleted,false,'opening confirmation leaves collection intact');
 fail=true;confirmRemoval();await new Promise(setImmediate);assert.match(removedError,/storage failed/);assert.equal(ctx.state.profile[createdId].deleted,false);assert.equal(undoAction,undefined);
 fail=false;confirmRemoval();await new Promise(setImmediate);assert.equal(ctx.state.profile[createdId].deleted,true);assert.equal(undoAction.label,'Undo');assert.deepEqual(Array.from(ctx.state.profile[createdId].ids),savedIds);
 fail=true;await undoAction.fn();assert.equal(undoAction.label,'Retry');assert.equal(ctx.state.profile[createdId].deleted,true);
 fail=false;await undoAction.fn();assert.equal(ctx.state.profile[createdId].deleted,false);assert.deepEqual(Array.from(ctx.state.profile[createdId].ids),savedIds);assert.equal(returned,2);
 console.log('Collections: overlapping membership, OR filters, independent copies, reversible removal, failed-save preservation, and packing export passed.');
})().catch(e=>{console.error(e);process.exit(1)});
