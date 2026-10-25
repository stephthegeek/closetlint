// Legacy fallback stays bounded and recovers transient failures without losing photos.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),start=html.indexOf('function loadBundles(){'),code=html.slice(start,html.indexOf('\n}',start)+2);
function fixture(ids,failures){
 let active=0,peak=0;const attempts={};
 const c={BUNDLES:ids,PHOTOS:{},photoState:{total:ids.length,loaded:0,failed:0},showNotice(){},onDataSoon(){},console:{warn(){}},setTimeout:fn=>setImmediate(fn),photoFetchBlob:async url=>{
  const id=url.split('/').at(-1);attempts[id]=(attempts[id]||0)+1;active++;peak=Math.max(peak,active);
  try{await new Promise(setImmediate);if(attempts[id]<=(failures[id]||0))throw Error('temporary network failure');return new Blob([JSON.stringify({[id]:'synthetic photo'})]);}finally{active--}
 }};vm.createContext(c);vm.runInContext(code,c);return {c,attempts,get peak(){return peak}};
}
(async()=>{
 const f=fixture(Array.from({length:14},(_,i)=>'bundle'+i),{bundle2:1,bundle5:2});await f.c.loadBundles();assert.equal(f.peak,2);assert.equal(f.c.photoState.loaded,14);assert.equal(f.c.photoState.failed,0);assert.equal(f.attempts.bundle5,3);assert.equal(Object.keys(f.c.PHOTOS).length,14);
 const failed=fixture(['good','missing'],{missing:10});await failed.c.loadBundles();assert.equal(failed.c.photoState.loaded,1);assert.equal(failed.c.photoState.failed,1);assert.equal(failed.attempts.missing,3);assert.equal(failed.c.PHOTOS.good,'synthetic photo');
 const local=fixture([],{});await local.c.loadBundles();assert.equal(Object.keys(local.attempts).length,0,'individual local photo URLs require no bundle fetches');
 const initial=html.split('\n').find(s=>s.startsWith('var PHOTOS=')),bootstrap={window:{ClosetLintLocal:{catalogPhotos:{legacy:'/_catalog/synthetic'}}}};vm.createContext(bootstrap);vm.runInContext(initial,bootstrap);assert.equal(bootstrap.PHOTOS.legacy,'/_catalog/synthetic');
 console.log('Photo bundles: two concurrent reads, bounded retry, partial failure, and individual-photo bootstrap pass.');
})().catch(e=>{console.error(e);process.exit(1)});
