const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),script=fs.readFileSync(__dirname+'/../app/scripts/setup.js','utf8');
assert.equal(source.split('/* BEGIN SETUP (source: app/scripts/setup.js) */\n')[1].split('\n/* END SETUP */')[0],script,'embedded setup is synchronized');
const ctx={window:{},URL,Set,TextEncoder,META:['Tops','Bottoms','Jewelry'],SUBS:{Tops:['Tees'],Bottoms:['Pants'],Jewelry:['Rings']},COLORS:{black:'#000'},SEASONS:['fall'],STYLES:['casual'],LOOKS:['gothic'],deriveKind:(m)=>m==='Jewelry'?'ring':'clothing',validateSize:(k,v)=>k==='ring'&&v==='99'?{ok:false,msg:'Bad ring size'}:{ok:true,v},todayStr:()=> '2026-10-18',$:()=>({addEventListener(){}})};
vm.createContext(ctx);vm.runInContext(script,ctx);
function batch(pieces){return JSON.stringify({format:'closet-lint-import/v1',pieces})}
const item={name:'Black tee',category:'Tops',subcategory:'Tees',status:'owned',size:'M',retailer:'Example',price:12.50,colors:['black','imagined'],address:'private',orderId:'private',photoId:'private',photoUrl:'https://images.example.com/tee.jpg',url:'https://example.com/tee'};
assert.equal(ctx.setupShouldOpen({custom:true,profile:true},0,null,false,true),true);
for(const args of [[{},0,null,false,true],[{custom:true,profile:true},1,null,false,true],[{custom:true,profile:true},0,{started:true},false,true],[{custom:true,profile:true},0,null,true,true],[{custom:true,profile:true},0,null,false,false]])assert.equal(ctx.setupShouldOpen(...args),false);
assert.throws(()=>ctx.setupParse('oops',[]),/readable JSON/);
assert.throws(()=>ctx.setupParse('{"pieces":[]}',[]),/format/);
assert.throws(()=>ctx.setupParse(batch([]),[]),/1–50/);
assert.throws(()=>ctx.setupParse(batch(Array(51).fill(item)),[]),/1–50/);
let rows=ctx.setupParse(batch([item,item]),[]);assert.equal(rows[0].selected,true);assert.equal(rows[1].duplicate,true);assert.equal(rows[1].selected,false);
assert.equal(ctx.setupParse(batch([item]),[{name:'BLACK tee!',size:'M'}])[0].duplicate,true);
assert.equal(ctx.setupParse(batch([item]),[{name:'Black tee',size:'L'}])[0].duplicate,false);
assert.equal(ctx.setupParse(batch([{...item,name:'Retailer renamed it',url:'https://www.temu.com/goods.html?goods_id=123&utm_source=x'}]),[{id:'old',name:'Original title',size:'M',url:'https://www.temu.com/something-g-123.html'}])[0].duplicate,true);
assert.equal(ctx.setupParse(batch([{...item,url:'https://example.com/tee',variant:'Blue'}]),[{...item,variant:'Red'}])[0].duplicate,false);
for(const url of ['http://example.com/a.jpg','https://127.0.0.1/a','https://x.local/a','https://user:pass@example.com/a'])assert.throws(()=>ctx.setupPhotoURL(url));
assert.equal(ctx.setupPhotoURL('https://img.example.com/a.jpg'),'https://img.example.com/a.jpg');
const record=ctx.setupRecord(rows[0].piece);assert.equal(record.noPhoto,true);assert.equal(record.guess,true);assert.equal(record.price,12.5);assert.equal(record.address,undefined);assert.equal(record.orderId,undefined);assert.equal(record.photoId,undefined);assert.deepEqual(Array.from(record.colors),['black']);
for(const url of ['javascript:alert(1)','data:text/html,hi','file:///secret','https://user:pass@example.com/'])assert.throws(()=>ctx.setupRecord({...rows[0].piece,url}),/product link/);
for(const price of ['NaN','-1','1e9','1,200','12.345'])assert.throws(()=>ctx.setupRecord({...rows[0].piece,price}),/Price/);
assert.throws(()=>ctx.setupRecord({...rows[0].piece,status:''}),/Owned/);
assert.throws(()=>ctx.setupRecord({...rows[0].piece,meta:''}),/category/);
assert.equal(ctx.setupParse(batch([{...item,size:''}]),[{...item,colors:['black']}])[0].duplicate,true,'unknown incoming size still flags a possible match');
assert.equal(ctx.setupParse('```json\n'+batch([item])+'\n```',[]).length,1);
(async()=>{
 const rows=ctx.setupParse(batch([item,{...item,name:'Second tee',url:'https://example.com/second'}]),[]),writes=[];let fail=true;
 const write=async(id,r)=>{writes.push(id);if(fail&&r.name==='Second tee')throw Error('Disk full')};
 let result=await ctx.setupWriteRows(rows,write,'batch');assert.equal(result.saved,1);assert.equal(result.failed,1);assert.equal(rows[0].saved,true);assert.equal(rows[1].saved,false);
 fail=false;result=await ctx.setupWriteRows(rows,write,'batch');assert.equal(result.saved,1);assert.equal(result.failed,0);assert.deepEqual(writes,['imp-batch-0','imp-batch-1','imp-batch-1'],'retry reuses stable IDs and skips saved rows');
 const invalid=ctx.setupParse(batch([{...item,status:''},item]),[]);let count=0;result=await ctx.setupWriteRows(invalid,async()=>count++,'bad');assert.equal(result.invalid,true);assert.equal(count,0,'validate every selected row before any write');
 const matched=ctx.setupParse(batch([item]),[{...item,id:'wish-1',wish:true,colors:['black']}]);assert.equal(matched[0].selected,true);assert.equal(matched[0].action,'owned');let promotion;await ctx.setupWriteRows(matched,async(id,patch,row)=>{promotion={patch,row}},'promote');assert.equal(promotion.patch.wish,false);assert.equal(promotion.patch.name,undefined,'promotion preserves existing metadata');assert.equal(promotion.row.match.id,'wish-1');
 console.log('Setup/import: first-run guards, strict batch format, duplicate review, allowlisted fields, safe links, validation and partial-failure retry passed.');
})().catch(e=>{console.error(e);process.exit(1)});
// Photo uploads are reused after a failed record write; wishlist reconciliation patches ownership only.
(async()=>{
 let uploads=0,writes=0,fail=true,patch;
 ctx.allItems=()=>[{id:'wish-1',wish:true,name:'Existing',size:'M',price:12.5,url:'https://example.com/tee',date:'2026-10-18',photoId:'keep',colors:['black']}];
 ctx.patchEdit=async(it,value)=>{patch=value;return true};ctx.layerDefaults=x=>x;
 ctx.state={assets:{upload:async()=>{uploads++;return {id:'synthetic-photo'}}},db:{collection:()=>({doc:()=>({set:async record=>{writes++;if(fail)throw Error('Disk full');assert.equal(record.photoId,'synthetic-photo');assert.equal(record.noPhoto,false)}})})}};
 const row={action:'add',piece:{photoUrl:''},photo:{blob:{synthetic:true},ar:0.8}};
 await assert.rejects(()=>ctx.setupSaveRow('test',{name:'Synthetic'},row),/Disk full/);
 fail=false;await ctx.setupSaveRow('test',{name:'Synthetic'},row);assert.equal(uploads,1);assert.equal(writes,2);
 await ctx.setupSaveRow('unused',{wish:false},{action:'owned',match:{id:'wish-1'},piece:{...rows[0].piece}});assert.deepEqual(Object.keys(patch),['wish','acquiredDate','acquiredApproximate','acquisitionSource']);assert.equal(patch.acquisitionSource,'unknown');assert.equal(patch.wish,false);assert.equal(uploads,1);
 console.log('Import photos: cached upload retry and wishlist ownership and unknown acquisition metadata pass.');
})().catch(e=>{console.error(e);process.exit(1)});

assert.equal(source.split('/* BEGIN SETUP STYLES (source: app/styles/setup.css) */\n')[1].split('\n/* END SETUP STYLES */')[0],fs.readFileSync(__dirname+'/../app/styles/setup.css','utf8'),'embedded import styles are synchronized');
