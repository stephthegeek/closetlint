/* Browser-local recovery for batch reviews, including their temporary photo bytes.
   This is not a wardrobe backup and never adds or edits pieces. */
var batchDrafts={},batchDraftDB=null;
function batchDraftKey(kind){return ((window.ClosetLintLocal||{}).instance||'browser')+':'+kind}
function batchDraftDatabase(){
  if(!batchDraftDB)batchDraftDB=new Promise(function(resolve,reject){
    if(!window.indexedDB){reject(new Error('Browser draft storage is unavailable.'));return}
    var request=window.indexedDB.open('closetlint.batch-drafts.v1',1);
    request.onupgradeneeded=function(){request.result.createObjectStore('drafts')};
    request.onsuccess=function(){resolve(request.result)};request.onerror=function(){reject(request.error)};
    request.onblocked=function(){reject(new Error('Close older Closet Lint tabs to enable draft storage.'))};
  }).catch(function(e){batchDraftDB=null;throw e});return batchDraftDB;
}
async function batchDraftRead(kind){
  var db=await batchDraftDatabase();return new Promise(function(resolve,reject){
    var tx=db.transaction('drafts','readonly'),r=tx.objectStore('drafts').get(batchDraftKey(kind));
    tx.oncomplete=function(){resolve(r.result||null)};tx.onerror=tx.onabort=function(){reject(tx.error||r.error)};
  });
}
function batchDraftCopy(value){
  var ignored=new Set(['launcher','archiveController','sourceTimer','sourceSaving','directInfo','directHubChecked','directBusy','sourcesLoading','sourcesRequested']);
  function copy(v,ancestors){
    if(v==null||typeof v!=='object')return typeof v==='function'?undefined:v;
    if(v instanceof Blob)return v;
    if(v.nodeType||typeof v.then==='function'||ancestors.indexOf(v)>=0)return undefined;
    var path=ancestors.concat([v]),out=Array.isArray(v)?[]:{};
    Object.keys(v).forEach(function(k){if(!ignored.has(k)){var x=copy(v[k],path);if(x!==undefined)out[k]=x}});return out;
  }return copy(value,[]);
}
function batchDraftHydrate(value){
  var urls={},created=[];
  function photo(old,blob){if(old&&blob instanceof Blob&&!urls[old]){urls[old]=URL.createObjectURL(blob);created.push(urls[old])}}
  Object.keys(value.archivePhotos||{}).forEach(function(url){photo(url,value.archivePhotos[url])});
  (value.sources||[]).forEach(function(f){photo(f.url,f.blob)});
  (value.rows||[]).forEach(function(r){if(r.photo)photo(r.photo.url,r.photo.blob)});
  if(value.queue)(value.queue.page||[]).forEach(function(r){photo(r.url,r.blob)});
  function replace(v){
    if(typeof v==='string'){
      if(urls[v])return urls[v];
      // ZIP reviews also keep their prepared JSON for returning to the load step.
      if(/^\s*[\[{]/.test(v)&&v.indexOf('blob:')>=0)try{return JSON.stringify(replace(JSON.parse(v)))}catch(e){}
      return v;
    }
    if(!v||typeof v!=='object'||v instanceof Blob)return v;
    var out=Array.isArray(v)?[]:{};Object.keys(v).forEach(function(k){out[urls[k]||k]=replace(v[k])});return out;
  }
  return {value:replace(value),urls:created};
}
function batchDraftSave(kind,read,immediate){
  var entry=batchDrafts[kind]||(batchDrafts[kind]={tail:Promise.resolve(),revision:0}),revision=++entry.revision;
  if(entry.memoryOnly){entry.read=read;entry.pending=false;batchDraftStatus(kind);return Promise.resolve()}
  entry.pending=true;entry.read=read;clearTimeout(entry.timer);batchDraftStatus(kind);
  function write(){
    var value=batchDraftCopy(read());
    entry.tail=entry.tail.catch(function(){}).then(async function(){
      var db=await batchDraftDatabase();await new Promise(function(resolve,reject){
        var tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(value,batchDraftKey(kind));
        tx.oncomplete=resolve;tx.onerror=tx.onabort=function(){reject(tx.error||new Error('Could not keep the draft.'))};
      });
    }).then(function(){if(entry.revision===revision){entry.pending=false;entry.error='';batchDraftStatus(kind)}}).catch(function(e){if(entry.revision===revision){entry.pending=false;entry.error=e.message||'Could not keep the draft.';batchDraftStatus(kind)}});
    return entry.tail;
  }
  if(immediate)return write();entry.timer=setTimeout(write,250);return entry.tail;
}
function batchDraftStatus(kind){
  var entry=batchDrafts[kind],n=document.getElementById('batch-draft-'+kind);if(!entry||!n)return;
  n.textContent=entry.memoryOnly?'Kept only in this tab. Keep the tab open; reloading will lose unfinished work.':entry.pending?'Keeping your draft…':entry.error?'Draft could not be kept. Keep this tab open, and try again.':'Draft kept in this browser. You can leave this page and return.';
  var retry=document.getElementById('batch-retry-'+kind);if(retry)retry.hidden=!(entry.error||entry.memoryOnly);
  var memory=document.getElementById('batch-memory-'+kind);if(memory)memory.hidden=!entry.error||!!entry.memoryOnly;
}
function batchDraftUseMemory(kind){
  var e=batchDrafts[kind]||(batchDrafts[kind]={tail:Promise.resolve(),revision:0});clearTimeout(e.timer);e.memoryOnly=true;e.pending=false;batchDraftStatus(kind);
}
function batchDraftNotice(kind){
  var box=el('div',{class:'batch-draft-notice'},el('p',{id:'batch-draft-'+kind,class:'fine',role:'status'}),el('button',{id:'batch-retry-'+kind,class:'btn small',type:'button',text:'Retry keeping draft',hidden:true,onclick:function(){var e=batchDrafts[kind];if(e&&e.read){e.memoryOnly=false;batchDraftSave(kind,e.read,true)}}}),el('button',{id:'batch-memory-'+kind,class:'btn small',type:'button',text:'Continue without reload recovery',hidden:true,onclick:function(){batchDraftUseMemory(kind)}}));return box;
}
async function batchDraftCheckpoint(kind,read){
  await batchDraftSave(kind,read,true);
  if(batchDrafts[kind].error&&!batchDrafts[kind].memoryOnly)throw new Error('Could not keep the recovery draft. Retry keeping it, or explicitly continue without reload recovery.');
}
function batchWorkBusy(){return !!(typeof setupImportSession!=='undefined'&&setupImportSession&&(setupImportSession.busy||setupImportSession.sourceBusy||setupImportSession.sourcesLoading)||typeof tidyWorkspace!=='undefined'&&tidyWorkspace&&tidyWorkspace.queue&&tidyWorkspace.queue.saving)}
function batchWorkspaceReturn(){
  if(window.ClosetLintRoutes&&window.ClosetLintRoutes.leaveBatch)return window.ClosetLintRoutes.leaveBatch();
  setTab('all');
}
window.addEventListener('beforeunload',function(e){
  var preparing=typeof tidyWorkspace!=='undefined'&&tidyWorkspace&&tidyWorkspace.queue&&tidyWorkspace.queue.running;
  if(batchWorkBusy()||preparing||Object.keys(batchDrafts).some(function(k){return batchDrafts[k].pending||batchDrafts[k].error||batchDrafts[k].memoryOnly})){e.preventDefault();e.returnValue=''}
});
