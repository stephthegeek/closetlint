// Pass is reversible, independent of ranking scores, and excluded from active picks.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const a=html.indexOf('function '+name+'('),line=html.indexOf('\n',a);return html.slice(a,html.slice(a,line).endsWith('}')?line:html.indexOf('\n}',a)+2)}
class Node{
 constructor(tag,props={},children=[]){Object.assign(this,{tag,children:[]},props);this.classList={add(){}};children.flat().filter(Boolean).forEach(c=>this.appendChild(c))}
 appendChild(n){this.children.push(n);return n}
 querySelector(selector){const cls=selector.slice(1);for(const c of this.children){if(c&&typeof c==='object'){if((c.class||'').split(' ').includes(cls))return c;const match=c.querySelector?.(selector);if(match)return match}}return null}
 scrollIntoView(){}
}
const pieces=Array.from({length:14},(_,i)=>({id:'p'+i,name:'Synthetic '+i,wish:true,meta:'Bottoms',sub:'Skirts',date:'2026-01-01'}));
const ranking={r:Object.fromEntries(pieces.map((p,i)=>[p.id,{s:1800-i*30,n:2}])),t:{a:1600,b:1460},v:1};
let undo,ok=true,deleted=null,chips=0;const messages=[],writes=[];
const ctx={Promise,Date,Math,console,state:{wishrank:{main:ranking},db:{collection:()=>({doc:()=>({set:async d=>{if(!ok)throw Error('Offline');writes.push(JSON.parse(JSON.stringify(d)))}})})}},WR_T:{a:1600,b:1460},WR_TOPN:10,WR_SECS:[['top','⭐ Top ten'],['want','💫 Want'],['some','🌙 Someday'],['pass','👋 Pass']],allItems:()=>pieces,wrSeedDoc:()=>({r:{},t:{a:1600,b:1460},v:1}),wrRender(){},toast:m=>messages.push(m),toastAct:(m,l,f)=>{messages.push(m);undo=f},document:{querySelector:()=>null},el:(t,p,...c)=>new Node(t,p,c),chip:(label,on,click)=>new Node('button',{text:label,onclick:click}),wrJump(){},wrGrip:()=>new Node('grip'),wrNote:()=>'',wrChipEl:c=>new Node('span',c),wrChips:()=>{chips++;return []},catLabel:()=> 'Skirt',openEdit(){},removeForGood:p=>deleted=p.id,byIdA:()=>Object.fromEntries(pieces.map(p=>[p.id,p]))};
vm.createContext(ctx);vm.runInContext(['wrGroup','wrPassed','wrItems','wrNorm','wrDoc','wrClone','wrCommit','wrScore','wrN','wrState','wrSortAll','wrTopIds','wrSecOf','wrMove','wrPair','wrList','wrRow','wrK','wrKey','wrPick','wrUndo'].map(fn).join('\n'),ctx);
(async()=>{
 assert.equal(ctx.wrItems().length,14,'legacy records need no migration');
 const previous=JSON.stringify(ranking.r.p0);await ctx.wrMove(pieces[0],'pass');assert.equal(ctx.wrPassed(pieces[0]),true);assert.equal(JSON.stringify(ctx.wrDoc().r.p0),previous,'Pass preserves score and battle count');assert.equal(ctx.wrItems().length,13);assert.equal(ctx.wrItems(true).length,14);assert.equal(ctx.wrTopIds().p0,undefined);assert.equal(ctx.wrTopIds().p10,1,'next active item fills top-ten slot');
 for(let i=0;i<30;i++){const pair=ctx.wrPair(pieces);assert.notEqual(pair.a.id,'p0');assert.notEqual(pair.b.id,'p0')}
 const row=ctx.wrRow(pieces[0],null);assert.match(row.class,/wrpass/);assert.equal(chips,0,'Pass omits purchase-analysis clutter');assert(!row.children.some(c=>c.tag==='grip'));row.querySelector('.wrdelete').onclick();assert.equal(deleted,'p0','wastebasket delegates to existing confirmation flow');
 const view=new Node('div');ctx.wrList(view,pieces);const holding=view.querySelector('.wrpasslist');assert.equal(holding.children.length,1);assert.equal(holding.children[0].children[1].text,'','Pass has no rank number');const active=view.children.find(n=>n.class==='wrlist');assert(!active.children.some(n=>n['data-id']==='p0'),'Pass is outside the draggable ranked list');
 await undo();assert.equal(ctx.wrPassed(pieces[0]),false);assert.equal(JSON.stringify(ctx.wrDoc().r.p0),previous);
 await ctx.wrMove(pieces[0],'pass');await ctx.wrMove(pieces[0],'first');assert.equal(ctx.wrPassed(pieces[0]),false);assert.equal(ctx.wrTopIds().p0,1);await undo();assert.equal(ctx.wrPassed(pieces[0]),true,'Undo restoring a pass item preserves Pass');
 const before=ctx.wrDoc(),oldUndo=undo;ok=false;assert.equal(await ctx.wrMove(pieces[1],'pass'),false);assert.equal(ctx.wrDoc(),before);assert.equal(ctx.wrPassed(pieces[1]),false);assert.equal(undo,oldUndo,'failed save offers no successful-move Undo');assert.match(messages.at(-1),/Could not save/);ok=true;
 const W=ctx.wrState();W.cur={a:pieces[1],b:pieces[2]};ctx.wrPick(1);await new Promise(setImmediate);ctx.wrUndo();assert.equal(ctx.wrPassed(pieces[0]),true,'battle Undo cannot restore a passed item into the active list');
 const snapshot=JSON.parse(JSON.stringify(ctx.wrDoc()));ctx.state.wishrank.main=snapshot;assert.equal(ctx.wrPassed(pieces[0]),true,'Pass survives a JSON backup/reload');
 delete ctx.state.db;ctx.localStorage={setItem(){throw Error('Storage full')}};assert.equal(await ctx.wrMove(pieces[3],'pass'),false);assert.equal(ctx.wrPassed(pieces[3]),false,'browser storage failures roll back too');
 console.log('Wishlist Pass: persistence, score preservation, top-ten refill, battle exclusion, separate list, delete delegation, Undo, and failed-save recovery pass.');
})().catch(e=>{console.error(e);process.exit(1)});
