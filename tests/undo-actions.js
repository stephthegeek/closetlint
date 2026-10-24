// Synthetic records only: verify reversible actions, partial failures, and subsequent edits.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const a=html.indexOf('function '+name+'('),b=html.indexOf('\nfunction ',a+1);assert(a>=0);return html.slice(a,b)}
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 let action,confirm,fail='',closed=0,drawn=0;const messages=[],writes=[],pieces={a:{id:'a',customId:'a'},b:{id:'b'}};
 const state={edits:{a:{name:'Original',fav:true,notes:'Before',photos:[{photoId:'keep'}]},b:{hidden:true}},custom:{a:{photoId:'original'}},outfits:{o:{name:'Outfit',pieces:[{id:'a'}]}},trips:{t:{name:'Trip',settings:{start:'2026-10-24'},plan:{outfits:[]}}},trip:{id:'t'}};
 const c={Promise,Date,JSON,Object,state,needDb:()=>false,byId:()=>pieces,flashIds(){},outfitsUsing:()=>[],closeDlg:()=>closed++,renderGrid:()=>drawn++,toast:m=>messages.push(m),toastAct:(m,label,callback)=>{messages.push(m);action={label,callback}},askConfirm:(m,label,callback)=>confirm=callback};
 state.db={collection:collection=>({doc:id=>({set:async doc=>{if(fail===id)throw Error('Offline');state[collection][id]=clone(doc);writes.push({collection,id,doc:clone(doc)})},delete:async()=>{if(fail===id)throw Error('Offline');delete state[collection][id];writes.push({collection,id,deleted:true})}})})};
 vm.createContext(c);vm.runInContext(['pieceActionUndo','pieceAction','deleteSavedDocument','setHidden','removeForGood','applyBulk'].map(fn).join('\n'),c);
 return {c,state,pieces,messages,writes,get action(){return action},get confirm(){return confirm},set fail(v){fail=v},get closed(){return closed}};
}
(async()=>{
 const f=fixture(),original=clone(f.state.edits.a);f.c.removeForGood(f.pieces.a);f.confirm();await new Promise(setImmediate);assert.equal(f.state.edits.a.removed,true);assert.equal(f.action.label,'Undo');assert.equal(f.closed,1);f.state.edits.a.notes='Later edit';await f.action.callback();assert.equal(f.state.edits.a.removed,undefined);assert.equal(f.state.edits.a.removedAt,undefined);assert.equal(f.state.edits.a.notes,'Later edit');assert.deepEqual(f.state.edits.a.photos,original.photos);assert.deepEqual(f.state.custom.a,{photoId:'original'});
 await f.c.setHidden(f.pieces.a,true);assert.equal(f.state.edits.a.hidden,true);await f.action.callback();assert.equal(f.state.edits.a.hidden,undefined);assert.equal(f.state.edits.a.gone,undefined);
 await f.c.pieceAction(f.pieces.a,{donate:true},'Flagged');f.state.edits.a.donate=false;await f.action.callback();assert.equal(f.state.edits.a.donate,false,'Undo must not override a later change to the same field');
 await f.c.pieceAction(f.pieces.a,{stored:true,where:'Box 1'},'Stored');f.fail='a';await f.action.callback();assert.equal(f.action.label,'Retry');f.fail='';await f.action.callback();assert.equal(f.state.edits.a.stored,undefined);assert.equal(f.state.edits.a.where,undefined);
 const bulk=fixture();bulk.fail='b';const result=await bulk.c.applyBulk(['a','b'],()=>({removed:true,removedAt:1}),'Removed');assert.equal(result.updated,1);assert.equal(result.failed,1);assert.equal(bulk.action.label,'Undo');bulk.fail='';await bulk.action.callback();assert.equal(bulk.state.edits.a.removed,undefined);assert.deepEqual(bulk.state.edits.b,{hidden:true},'only successfully changed pieces are undone');
 for(const collection of ['outfits','trips']){const saved=fixture(),id=collection==='outfits'?'o':'t',snapshot=clone(saved.state[collection][id]);await saved.c.deleteSavedDocument(collection,id,saved.state[collection][id],()=>{});assert.equal(saved.state[collection][id],undefined);assert.equal(saved.action.label,'Undo');saved.fail=id;await saved.action.callback();assert.equal(saved.action.label,'Retry');saved.fail='';await saved.action.callback();assert.deepEqual(saved.state[collection][id],snapshot);}
 const failure=fixture();failure.fail='a';assert.equal(await failure.c.pieceAction(failure.pieces.a,{removed:true},'Deleted'),false);assert.equal(failure.action,undefined,'failed deletion must not offer a false Undo');assert.equal(failure.state.edits.a.removed,undefined);
 console.log('Undo actions: piece deletion/hiding/storage/donation, preserved photos and later edits, partial bulk failures, outfit/trip restoration, and retry after failed Undo pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
