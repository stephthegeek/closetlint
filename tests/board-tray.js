// Large synthetic closets: full-library filtering with incremental thumbnail mounting.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app/scripts/board-editor.js','utf8');
const a=source.indexOf('var trayGridObserver='),b=source.indexOf('\nfunction addPiece(',a);
function fixture(observe=true){
 function node(tag,attrs={},...children){return {tag,...attrs,children,isConnected:true,scrollTop:300,
  set textContent(v){this.children=[]},appendChild(n){this.children.push(n);return n},
  insertBefore(n,before){this.children.splice(this.children.indexOf(before),0,...n.children)}}}
 const grid=node('div'),items=Array.from({length:1000},(_,i)=>({id:'p'+i,name:i===0?'Unique needle':'Piece '+i,meta:i%2?'Tops':'Bottoms',sub:'Basic',fav:i%3===0,photo:'photo-'+i,date:String(i).padStart(4,'0')})),observers=[],added=[];
 const state={laundryOn:false,trayQ:'',trayMeta:'All',traySub:'',trayFav:false};
 const ctx={state,laundryEnabled:()=>state.laundryOn,needsLaundry:it=>!!it.laundry,$:()=>grid,ownedItems:()=>items,searchHay:it=>it.name.toLowerCase(),tailRank:()=>0,photoThumbnail:x=>x,addPiece:it=>added.push(it.id),el:node,document:{createDocumentFragment:()=>node('fragment')}};
 if(observe)ctx.IntersectionObserver=function(callback){this.callback=callback;this.disconnect=()=>this.disconnected=true;this.observe=n=>this.target=n;observers.push(this)};
 vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
 const cells=()=>grid.children.filter(n=>n.class==='tcell'),more=()=>grid.children.find(n=>n.class==='btn small tray-more');
 return {ctx,state,grid,items,observers,added,cells,more};
}
{
 const f=fixture();f.ctx.renderTrayGrid();assert.equal(f.cells().length,60);assert.equal(f.grid.scrollTop,0);
 const old=f.observers[0];old.callback([{isIntersecting:true}]);assert.equal(f.cells().length,120);
 f.cells()[0].onclick();assert.deepEqual(f.added,['p999'],'batched cards retain the correct item action');
 f.state.trayQ='Piece 1';f.ctx.renderTrayGrid();assert(old.disconnected);assert.equal(f.cells().length,60);
 old.callback([{isIntersecting:true}]);assert.equal(f.cells().length,60,'queued callbacks from old filters cannot append');
 while(!f.more().hidden)f.more().onclick();assert.equal(f.cells().length,f.items.filter(it=>it.name.toLowerCase().includes('1')).length,'search includes matches beyond the initial 60 pieces');assert(f.more().hidden);
 f.state.trayQ='Unique needle';f.ctx.renderTrayGrid();assert.equal(f.cells().length,1);assert(f.more().hidden);
 f.state.trayQ='absent';f.ctx.renderTrayGrid();assert.equal(f.cells().length,0);assert(f.more().hidden);
 f.state.trayQ='';f.state.trayMeta='Tops';f.state.trayFav=true;f.ctx.renderTrayGrid();
 while(!f.more().hidden)f.more().onclick();assert.equal(f.cells().length,167,'category and favorite filters cover the whole closet');
 f.state.trayFav=false;f.state.trayMeta='All';f.state.skyTrayIds=['p0','p999'];f.ctx.renderTrayGrid();assert.equal(f.cells().length,2,'Sky selection remains scoped');
}
{
 const f=fixture(false);f.ctx.renderTrayGrid();while(!f.more().hidden)f.more().onclick();
 assert.equal(f.cells().length,1000);assert.equal(new Set(f.cells().map(n=>n['aria-label'])).size,1000,'manual fallback reaches every piece exactly once');
}
{
 const f=fixture();f.ctx.renderTrayGrid();f.grid.isConnected=false;f.observers[0].callback([{isIntersecting:true}]);assert(f.observers[0].disconnected);assert.equal(f.cells().length,60,'detached pickers stop loading');
}
{
 const f=fixture(false);f.items[999].laundry=true;f.state.laundryOn=true;f.ctx.renderTrayGrid();
 assert(!f.cells().some(n=>n['aria-label']==='Add '+f.items[999].name+' to the board'),'ready-only tray omits a piece needing cleaning');
 f.items[999].laundry=false;f.ctx.renderTrayGrid();assert.equal(f.cells()[0]['aria-label'],'Add '+f.items[999].name+' to the board','cleaning or Undo restores eligibility');
 f.items[999].laundry=true;f.state.trayReady=false;f.ctx.renderTrayGrid();assert.equal(f.cells()[0]['aria-label'],'Add '+f.items[999].name+' to the board','board can explicitly include laundry');
 f.state.trayReady=true;f.state.laundryOn=false;f.ctx.renderTrayGrid();assert.equal(f.cells()[0]['aria-label'],'Add '+f.items[999].name+' to the board');assert.equal(f.items[999].laundry,true,'disabling tracking keeps status');
}
console.log('Board tray: bounded initial mount, complete search/filtering, stable item actions, incremental/manual loading, and stale-observer cleanup pass.');

// Initial placement must leave tall/wide pieces and resize handles inside every board shape.
for(const ar of [4/3,1,4/5,9/16])for(const width of [260,390,800])for(const photoAR of [.05,.25,.5,1,4,20,0,-1,NaN])for(const populated of [false,true]){
 const existing={id:'existing',x:12,y:18,w:25,z:1},state={board:{pieces:populated?[{...existing}]:[]}},saved=[];
 const ctx={state,DEFAULT_W:{Bottoms:26},Number,Math,$:()=>({clientWidth:width}),boardAR:()=>ar,clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),byIdA:()=>({existing:{ar:.5}}),nextZ:()=>2,persistBoard:()=>saved.push(JSON.stringify(state.board)),renderBoard(){},selectPiece:i=>{ctx.selected=i},collAdd(){throw Error('Unexpected collage path')}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function addPiece('),source.indexOf('var boardBackgroundPending=')),ctx);ctx.addPiece({id:'pants',meta:'Bottoms',ar:photoAR});
 const p=state.board.pieces.at(-1),ratio=Number.isFinite(photoAR)&&photoAR>0?photoAR:1,h=p.w*ar/ratio;
 assert(p.w>0&&Number.isFinite(p.w));assert(p.x*width/100>=15.9);assert(p.y*width/ar/100>=15.9);
 assert((100-p.x-p.w)*width/100>=15.9,'right resize handle stays inside');assert((100-p.y-h)*width/ar/100>=15.9,'bottom resize handle stays inside');
 assert.equal(saved.length,1);assert.equal(ctx.selected,state.board.pieces.length-1);if(populated)assert.deepEqual(state.board.pieces[0],existing,'adding does not move existing pieces');
}
console.log('Board initial placement: tall/wide photos, every shape, narrow/wide boards, populated boards, and invalid aspect fallback stay within bounds with reachable resize handles.');
