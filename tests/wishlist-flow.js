const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
const fn=source.slice(source.indexOf('function wishBanner(it){'),source.indexOf('function reopenSoon(id)'));
(async()=>{
 let action,closed=0,celebrations=0,ok=true;const writes=[],messages=[];
 const ctx={celebratePurchase:()=>celebrations++,el:(tag,props,...children)=>({tag,...props,children}),todayStr:()=> '2026-10-18',closeDlg:()=>closed++,toast:m=>messages.push(m),toastAct:(m,label,fn)=>{assert.equal(m,'🎉 I got it!');assert.equal(label,'Undo');action=fn},patchEdit:async(it,patch)=>{writes.push({...patch});return ok}};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 const item={id:'a',wish:true,source:'Wishlist',date:'2025-11-02'};
 ctx.wishBanner(item).children[1].onclick();await new Promise(setImmediate);
 assert.equal(closed,1);assert.equal(celebrations,1);assert.deepEqual(writes[0],{wish:false,source:'Added by hand',date:'2026-10-18'});
 action();await new Promise(setImmediate);
 assert.deepEqual(writes[1],{wish:true,source:'Wishlist',date:'2025-11-02'},'Undo restores previous wishlist/source/date');
 assert.equal(messages.at(-1),'Back on your wishlist');
 ok=false;action=null;ctx.wishBanner(item).children[1].onclick();await new Promise(setImmediate);
 assert.equal(celebrations,1,'failed purchase does not celebrate');assert.equal(closed,1,'failed move leaves dialog open');assert.equal(action,null,'failed move offers no misleading Undo');
 console.log('Wishlist move: Undo restores original status/source/date; failed saves leave the dialog open.');
})().catch(e=>{console.error(e);process.exit(1)});
