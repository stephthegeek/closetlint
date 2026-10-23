const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(__dirname+'/../app/scripts/setup.js','utf8');
function fn(n){const a=script.indexOf('function '+n+'('),start=script.slice(Math.max(0,a-6),a)==='async '?a-6:a,b=script.indexOf('\nfunction ',a+1),c=script.indexOf('\nasync function ',a+1),end=Math.min(...[b,c].filter(x=>x>=0));return script.slice(start,end)}
(async()=>{
 let uploads=0,writes=0,fail=true;const records=[];
 const ctx={URL,Set,fetch:async()=>({ok:true,headers:{get:()=> 'image/png'},blob:async()=>({size:100})}),readImage:async()=>({blob:{},ar:.75}),setupText:(x,n)=>typeof x==='string'?x.slice(0,n):'',layerDefaults:x=>x};
 ctx.state={assets:{upload:async()=>({id:'photo-'+(++uploads)})},db:{collection(){return {doc(){return {set:async record=>{writes++;if(fail)throw Error('Retry');records.push(JSON.parse(JSON.stringify(record)))}}}}}}};
 vm.createContext(ctx);vm.runInContext(['setupPhotoURL','setupImageList','setupSaveImages','setupSaveRow'].map(fn).join('\n'),ctx);
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
 console.log('Import images: gallery metadata, primary selection, duplicate URLs, retries, and twelve-photo intake limit pass.');
})().catch(e=>{console.error(e);process.exit(1)});
