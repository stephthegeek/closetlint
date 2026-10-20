const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/closet-lint.html'),'utf8');
const save=source.slice(source.indexOf('function labDoSave(o,pieces,nm){'),source.indexOf('function labToBoard(o){'));
const route=source.slice(source.indexOf('function labSaveOrPlan(o){'),source.indexOf('function labSaveOutfit(o){'));
(async()=>{
 const calls=[],writes=[],board={name:'An existing board',pieces:[{id:'untouched'}]};let fail=false,afterSave;
 const ctx={state:{outfits:{},board,ratings:{'a+b':{r:1}}},Date,uniqOutfitName:n=>n,labSig:()=> 'a+b',labRender:()=>calls.push('render'),toast:m=>calls.push(m),toastAct:(message,label,action)=>{afterSave=action},planOutfitDialog:id=>calls.push('plan:'+id),labSaveOutfit:()=>calls.push('save'),
  };
 ctx.state.db={collection:col=>({doc:id=>({set:async doc=>{assert.equal(col,'outfits');if(fail)throw Error('Disk full');writes.push({id,doc})}})})};
 vm.createContext(ctx);vm.runInContext(save+'\n'+route,ctx);
 const before=JSON.stringify(board),outfit={sig:'a+b'},pieces=[{id:'a',x:1,y:2,w:30,z:1},{id:'b',x:50,y:20,w:20,z:2}];
 ctx.labSaveOrPlan(outfit);assert.equal(calls.at(-1),'save');
 await ctx.labDoSave(outfit,pieces,'Library look');
 assert.equal(writes.length,1);assert.equal(ctx.state.outfits[outfit.savedId].rating,1);assert.equal(JSON.stringify(board),before,'saving a Lab look preserves the open board');
 assert.equal(writes[0].doc.pieces,pieces,'stable piece IDs and layout are preserved');
 ctx.labSaveOrPlan(outfit);assert.equal(calls.at(-1),'plan:'+outfit.savedId,'saved look routes directly to date planning');
 afterSave();assert.equal(calls.at(-1),'plan:'+outfit.savedId,'confirmation shortcut uses the same saved outfit');
 ctx.labSaveOrPlan({savedId:'deleted'});assert.equal(calls.at(-1),'save','a stale saved ID does not open a missing outfit');
 fail=true;const unsaved={sig:'a+b'};await ctx.labDoSave(unsaved,pieces,'Not saved');assert.equal(unsaved.savedId,undefined);assert.match(calls.at(-1),/Could not save/);assert.equal(JSON.stringify(board),before);
 console.log('Outfit flow: save preserves the board and piece IDs, retains ratings, routes to date planning, and handles failed/stale saves.');
})().catch(error=>{console.error(error);process.exit(1)});
