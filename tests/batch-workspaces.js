/* Recovery uses disposable browser storage, photo bytes, and synthetic records only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app/scripts/batch-workspaces.js','utf8');
const portable=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');assert.equal(portable.split('/* BEGIN BATCH WORKSPACES (source: app/scripts/batch-workspaces.js) */\n')[1].split('\n/* END BATCH WORKSPACES */')[0],source,'embedded recovery helper stays synchronized');
const tick=()=>new Promise(setImmediate);
function fixture(){
 const saved=new Map(),listeners={},nodes={},writes=[];let fail=false,hold=false,releases=[];
 const database={transaction(){
   const tx={objectStore:()=>({get(key){const r={};setImmediate(()=>{r.result=structuredClone(saved.get(key));tx.oncomplete?.()});return r},put(value,key){
     const snapshot=structuredClone(value);const finish=()=>{if(fail){tx.error=new Error('Synthetic quota exceeded');tx.onabort?.()}else{saved.set(key,snapshot);writes.push(snapshot);tx.oncomplete?.()}};
     if(hold)releases.push(finish);else setImmediate(finish);
   }})};return tx;
 }};
 const c={Blob,URL,Set,Promise,setTimeout,clearTimeout,document:{getElementById:id=>nodes[id]},window:{ClosetLintLocal:{instance:'synthetic-a'},indexedDB:{open(){const r={};setImmediate(()=>{r.result=database;r.onsuccess()});return r}},addEventListener:(name,fn)=>{listeners[name]=fn}},setupImportSession:null,tidyWorkspace:null};
 vm.createContext(c);vm.runInContext(source,c);
 return {c,saved,writes,nodes,listeners,set fail(v){fail=v},set hold(v){hold=v},release(){releases.splice(0).forEach(f=>f())}};
}
(async()=>{
 const f=fixture(),{c}=f,blob=new Blob(['synthetic original'],{type:'image/png'}),cutout=new Blob(['synthetic cutout'],{type:'image/png'});
 const original=URL.createObjectURL(blob),ready=URL.createObjectURL(cutout);
 const review={text:JSON.stringify({images:[{url:original}]}),reviewText:JSON.stringify({images:[{url:original}]}),step:'recovery',rows:[{id:'imp-request-0',saved:true,piece:{images:[{url:original}]},imageUploads:{[original]:{photoId:'saved-photo'}}},{id:'imp-request-1',selected:true,photo:{url:ready,blob:cutout}}],archivePhotos:{[original]:blob},sources:[{url:original,blob}],launcher:{nodeType:1},sourceSaving:Promise.resolve(),archiveController:{abort(){}}};
 await c.batchDraftCheckpoint('import',()=>review);
 assert.equal(c.batchDrafts.import.pending,false);assert.equal(c.batchDrafts.import.error,'');
 const recovered=c.batchDraftHydrate(await c.batchDraftRead('import'));
 assert.equal(recovered.value.rows[0].saved,true,'saved rows remain locked after reload');
 assert.equal(recovered.value.rows[1].selected,true,'unfinished choices remain selected');
 assert.equal(recovered.value.launcher,undefined);assert.equal(recovered.value.sourceSaving,undefined);
 const remapped=recovered.value.rows[0].piece.images[0].url;
 assert.equal(JSON.parse(recovered.value.text).images[0].url,remapped,'returning to the load step uses restored ZIP URLs');assert.equal(recovered.value.text,recovered.value.reviewText);
 assert.notEqual(remapped,original,'a fresh object URL replaces the URL from the previous page');
 assert.equal(await recovered.value.archivePhotos[remapped].text(),'synthetic original');
 assert.equal(recovered.value.rows[0].imageUploads[remapped].photoId,'saved-photo','upload caches follow the fresh URL too');
 assert.equal(await recovered.value.rows[1].photo.blob.text(),'synthetic cutout');
 c.window.ClosetLintLocal.instance='synthetic-b';assert.equal(await c.batchDraftRead('import'),null,'another wardrobe cannot inherit this draft');c.window.ClosetLintLocal.instance='synthetic-a';
 // A slower earlier write must never replace the most recent edits.
 f.hold=true;const first=c.batchDraftSave('import',()=>({name:'earlier'}),true);await tick();
 const latest=c.batchDraftSave('import',()=>({name:'latest'}),true);f.hold=false;f.release();await Promise.all([first,latest]);
 assert.equal((await c.batchDraftRead('import')).name,'latest');
 // Failed draft writes are visible, warn on reload, and can be retried.
 f.nodes['batch-draft-import']={};f.nodes['batch-retry-import']={};f.fail=true;
 await assert.rejects(c.batchDraftCheckpoint('import',()=>review),/recovery draft/);
 assert.match(f.nodes['batch-draft-import'].textContent,/could not be kept/);assert.equal(f.nodes['batch-retry-import'].hidden,false);
 let warned=false;f.listeners.beforeunload({preventDefault(){warned=true}});assert.equal(warned,true);
 c.batchDraftUseMemory('import');await c.batchDraftCheckpoint('import',()=>review);warned=false;f.listeners.beforeunload({preventDefault(){warned=true}});assert.equal(warned,true,'explicit in-tab fallback still warns on reload');c.batchDrafts.import.memoryOnly=false;
 f.fail=false;await c.batchDraftCheckpoint('import',()=>review);warned=false;f.listeners.beforeunload({preventDefault(){warned=true}});assert.equal(warned,false,'a durable idle review can safely reload');
 c.setupImportSession={busy:true};assert.equal(c.batchWorkBusy(),true);c.setupImportSession=null;
 c.tidyWorkspace={queue:{saving:true}};assert.equal(c.batchWorkBusy(),true);c.tidyWorkspace.queue={running:true};warned=false;f.listeners.beforeunload({preventDefault(){warned=true}});assert.equal(warned,true,'unfinished processing warns before closing the browser');
 [original,ready,...recovered.urls].forEach(URL.revokeObjectURL);
 console.log('Batch recovery: photo bytes and URL caches, saved/unfinished choices, wardrobe isolation, ordered writes, quota failure/retry, and reload protection pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
