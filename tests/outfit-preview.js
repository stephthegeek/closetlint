// Synthetic workspace switches and detached exports; no personal data or browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const session=fs.readFileSync(__dirname+'/../app/scripts/board-session.js','utf8');
const clone=o=>JSON.parse(JSON.stringify(o));
function fixture(){
 let persisted,fail=false,flushCount=0;
 const nodes={},state={board:{id:null,name:'Working draft',pieces:[{id:'a',x:1,y:2,w:30,z:1}],st:{bg:{c:'#abcdef'}},texts:[{t:'Keep me'}]},outfits:{one:{name:'One',pieces:[{id:'b',x:3,y:4,w:40,z:1}]},two:{name:'Two',pieces:[{id:'a',x:5,y:6,w:20,z:1}]}},db:{},capsDone:true};
 const ctx={state,console,window:{ClosetLintRuntime:{setBoard:b=>persisted=clone(b),flush:async()=>{flushCount++;if(fail)throw Error('offline')}}},$:id=>nodes[id]||(nodes[id]={value:''}),toast:m=>ctx.message=m,toastAct:(m,l,cb)=>{ctx.message=m;ctx.undo=cb},renderBoard(){},renderSaved(){},paintBoardContext(){},setTab:t=>state.tab=t};
 vm.createContext(ctx);vm.runInContext(session,ctx);
 return {ctx,state,get persisted(){return persisted},get flushCount(){return flushCount},set fail(v){fail=v}};
}
(async()=>{
 const f=fixture(),{ctx:c,state:s}=f,before=clone(s.board),saved=clone(s.outfits);
 c.ofOpen({id:'one'});assert.deepEqual(s.board,before);assert.equal(f.persisted,undefined);assert.equal(s.ofPreview,'one');assert.equal(s.tab,'saved');
 assert.equal(await c.editSavedOutfit('one'),true);assert.equal(s.board.id,'one');assert.deepEqual(clone(s.boardDrafts[0].board),before);assert.equal(f.flushCount,1);
 s.board.pieces[0].x=99;s.board.name='One in progress';c.persistBoard();await c.editSavedOutfit('two');await c.editSavedOutfit('one');assert.equal(s.board.pieces[0].x,99);assert.equal(s.board.name,'One in progress');assert.deepEqual(s.outfits,saved,'switches do not update saved outfits');
 const snapshot=clone(f.persisted),g=fixture();g.ctx.window.ClosetLintRuntime.board=snapshot;g.ctx.restoreBoard();assert.equal(g.state.board.id,'one');assert.equal(g.state.previousBoardKey,null,'unchanged saved outfits do not become recovery drafts');assert(!g.state.boardDrafts.some(d=>d.board.id==='two'));
 const original=g.state.boardDrafts.find(d=>d.board.name==='Working draft');assert(original);await g.ctx.returnWorkspace(original.key);assert.deepEqual(clone(g.state.board),before,'original draft includes its design/text after repeated switching and reload');
 const active=g.state.board;g.fail=true;assert.equal(await g.ctx.editSavedOutfit('one'),false);assert.equal(g.state.board,active);assert.match(g.ctx.message,/Still on the same board/);g.fail=false;assert.equal(await g.ctx.editSavedOutfit('one'),true);
 c.state.outfitSave={phase:'error'};const board=c.state.board;assert.equal(await c.editSavedOutfit('two'),false);assert.equal(c.state.board,board,'failed explicit saves require recovery before a switch');
 // Export captures a detached board and keeps using it if the editor changes mid-render.
 const d=fixture();let release;const drawn=[],canvases=[];
 Object.assign(d.ctx,{BOARD_AR:4/3,byIdA:()=>({b:{id:'b',photo:'synthetic'}}),needProc:()=>false,loadImg:()=>new Promise(r=>release=()=>r({width:100,height:100})),document:{createElement(){const g=new Proxy({fillRect(){},drawImage(...args){drawn.push(args)},createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});const c={getContext:()=>g,toBlob:f=>f({type:'image/png'})};canvases.push(c);return c}},Path2D:function(){}});
 vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/board-design.js','utf8'),d.ctx);
 const owner=d.state.board;const rendering=d.ctx.outfitImage({name:'Snapshot',pieces:[{id:'b',x:2,y:3,w:40,z:1}],st:{ar:'1:1'}});await Promise.resolve();d.state.board={name:'Other board',pieces:[]};release();await rendering;assert.equal(canvases[0].width,1600);assert.equal(canvases[0].height,1600);assert.equal(drawn.at(-1)[3],640);assert.equal(owner.name,'Working draft');
 console.log('Outfit previews/recovery: view isolation, repeated switches, reload, original text/design, failed checkpoint, explicit-save guard, and detached image export pass.');
})().catch(e=>{console.error(e);process.exit(1)});

// One recovery control, with each draft reachable by name and no duplicate back button.
{
 const f=fixture(),nodes={};
 function el(tag,attrs={},...children){return {tag,...attrs,children,appendChild(n){this.children.push(n)},set textContent(v){this.children=[]}}}
 f.ctx.el=el;f.ctx.$=id=>nodes[id]||(nodes[id]=el('div'));
 f.state.boardKey='active';f.state.previousBoardKey='older';f.state.boardDrafts=[{key:'older',board:{name:'Weekend',pieces:[]}},{key:'recent',board:{name:'Dinner',pieces:[]}}];
 let opened;f.ctx.returnWorkspace=key=>opened=key;f.ctx.paintWorkspaceRecovery();
 const recovery=nodes['board-recovery'];assert.equal(recovery.children.length,1);const menu=recovery.children[0];assert.equal(menu.tag,'details');assert.equal(menu.children[0].text,'Other drafts (2)');
 menu.children[1].onclick();assert.equal(opened,'recent');menu.children[2].onclick();assert.equal(opened,'older');
 f.state.boardDrafts=[];f.ctx.paintWorkspaceRecovery();assert.equal(recovery.children.length,0,'no draft control when there is nothing to resume');
}
