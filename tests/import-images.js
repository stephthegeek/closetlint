const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(__dirname+'/../app/scripts/setup.js','utf8');
function fn(n){const a=script.indexOf('function '+n+'('),start=script.slice(Math.max(0,a-6),a)==='async '?a-6:a,b=script.indexOf('\nfunction ',a+1),c=script.indexOf('\nasync function ',a+1),end=Math.min(...[b,c].filter(x=>x>=0));return script.slice(start,end)}
(async()=>{
 let uploads=0,writes=0,fail=true;const records=[];
 const ctx={URL,Set,AbortController,setTimeout,clearTimeout,fetch:async()=>({ok:true,headers:{get:()=> 'image/png'},blob:async()=>({size:100,type:'image/png'})}),readImage:async()=>({blob:{},ar:.75}),setupText:(x,n)=>typeof x==='string'?x.slice(0,n):'',layerDefaults:x=>x};
 ctx.state={assets:{upload:async()=>({id:'photo-'+(++uploads)})},db:{collection(){return {doc(){return {set:async record=>{writes++;if(fail)throw Error('Retry');records.push(JSON.parse(JSON.stringify(record)))}}}}}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/photo-fetch.js','utf8'),ctx);vm.runInContext(['setupPhotoURL','setupImageList','setupSaveImages','setupSaveRow'].map(fn).join('\n'),ctx);
 const row={piece:{images:[{url:'https://img.example.com/isolated.jpg',kind:'isolated'},{url:'https://img.example.com/model.jpg',kind:'model'}]}};
 await assert.rejects(()=>ctx.setupSaveRow('synthetic',{},row),/Retry/);assert.equal(uploads,2);
 fail=false;await ctx.setupSaveRow('synthetic',{},row);assert.equal(uploads,2,'retry retains both already uploaded photos');assert.equal(writes,2);
 assert.equal(records[0].photos.length,2);assert.equal(records[0].photos[0].kind,'isolated');assert.equal(records[0].photos[1].kind,'model');assert.equal(records[0].photoId,'photo-1');assert.equal(records[0].noPhoto,false);
 assert.equal(ctx.setupImageList([{url:'https://x.example/a',kind:'model'},{url:'https://x.example/a',kind:'isolated'}]).length,1);
 const before=uploads;
 await assert.rejects(()=>ctx.setupSaveRow('too-many',{},{
   piece:{images:Array.from({length:13},(_,i)=>({url:'https://img.example.com/'+i+'.jpg',kind:'model'}))}
 }),/at most 12/);
 await assert.rejects(()=>ctx.setupSaveRow('primary-counts',{},{
   photo:{blob:{}},piece:{images:Array.from({length:12},(_,i)=>({url:'https://img.example.com/'+i+'.jpg',kind:'model'}))}
 }),/at most 12/);
 assert.equal(uploads,before,'over-limit batches stop before uploading images');
 await ctx.setupSaveRow('twelve',{}, {piece:{images:Array.from({length:12},(_,i)=>({url:'https://img.example.com/view'+i+'.jpg',kind:'isolated'}))}});
 assert.equal(records.at(-1).photos.length,12,'all twelve views are saved, not silently truncated');
 ctx.PHOTO_FETCH_TIMEOUT_MS=5;let fetches=0;ctx.fetch=async()=>{if(++fetches===2)return new Promise(()=>{});return {ok:true,blob:async()=>({size:100,type:'image/png'})}};
 const stalled={piece:{images:[{url:'https://img.example.com/first.png',kind:'isolated'},{url:'https://img.example.com/second.png',kind:'model'}]}};const priorUploads=uploads;
 await assert.rejects(()=>ctx.setupSaveRow('stalled',{},stalled),/timed out/);assert.equal(uploads,priorUploads+1);assert.equal(Object.keys(stalled.photoErrors||{}).length,0,'a timeout does not permanently reject the source');
 ctx.fetch=async()=>({ok:true,blob:async()=>({size:100,type:'image/png'})});await ctx.setupSaveRow('stalled',{},stalled);assert.equal(uploads,priorUploads+2,'timeout retry retains the first saved view');assert.equal(records.at(-1).photos.length,2);
 console.log('Import images: gallery metadata, primary selection, duplicate URLs, retries, and twelve-photo intake limit pass.');
})().catch(e=>{console.error(e);process.exit(1)});
