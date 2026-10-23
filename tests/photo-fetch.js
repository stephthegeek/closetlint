const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(__dirname+'/../app/scripts/photo-fetch.js','utf8'),html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
assert.equal(html.split('/* BEGIN PHOTO FETCH (source: app/scripts/photo-fetch.js) */\n')[1].split('/* END PHOTO FETCH */')[0],code);
(async()=>{
 let expire,cleared=0,lastOptions,calls=0;
 const blob=new Blob(['synthetic'],{type:'image/png'});
 const c={AbortController,setTimeout:fn=>{expire=fn;return 1},clearTimeout:()=>cleared++,fetch:async(u,o)=>{calls++;lastOptions=o;return {ok:true,blob:async()=>blob}}};vm.createContext(c);vm.runInContext(code,c);
 assert.equal(await c.photoFetchBlob('/photo',{credentials:'omit'},{maxBytes:100}),blob);assert.equal(lastOptions.credentials,'omit');assert.equal(cleared,1);
 await assert.rejects(c.photoFetchBlob('/large',{}, {maxBytes:1}),/too large/);
 c.fetch=(u,o)=>{lastOptions=o;return new Promise(()=>{})};const stuck=c.photoFetchBlob('/stuck');expire();await assert.rejects(stuck,e=>e.code==='PHOTO_TIMEOUT');assert(lastOptions.signal.aborted);
 c.fetch=async(u,o)=>{lastOptions=o;return {ok:true,blob:()=>new Promise(()=>{})}};const body=c.photoFetchBlob('/stuck-body');await Promise.resolve();expire();await assert.rejects(body,e=>e.code==='PHOTO_TIMEOUT');assert(lastOptions.signal.aborted,'deadline covers stalled bodies too');
 const controller=new AbortController();c.fetch=(u,o)=>{lastOptions=o;return new Promise(()=>{})};const stopped=c.photoFetchBlob('/cancel',{}, {signal:controller.signal});controller.abort();await assert.rejects(stopped,e=>e.name==='AbortError');assert(lastOptions.signal.aborted);
 const previous=calls;await assert.rejects(c.photoFetchBlob('/already-cancelled',{}, {signal:controller.signal}),e=>e.name==='AbortError');assert.equal(calls,previous);
 c.fetch=async()=>({ok:false});await assert.rejects(c.photoFetchBlob('/missing'),/could not be downloaded/);
 c.fetch=async()=>({ok:true,blob:async()=>blob});assert.equal(await c.photoFetchBlob('/retry'),blob);assert.equal(cleared,8,'all successful, failed, and cancelled operations release their timer');
 console.log('Photo reads: stalled headers/bodies, abort, pre-abort, size rejection, HTTP errors, retry, and timer cleanup pass.');
})().catch(e=>{console.error(e);process.exit(1)});
