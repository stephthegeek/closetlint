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
 console.log('Collections: overlapping membership, OR filters, independent copies, reversible removal, failed-save preservation, and packing export passed.');
})().catch(e=>{console.error(e);process.exit(1)});
