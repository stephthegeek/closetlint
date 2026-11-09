const assert=require('assert'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync(__dirname+'/../app/scripts/board-adjust.js','utf8');
function fixture(){const p={id:'shirt',x:10,y:12,w:22,z:1},state={board:{pieces:[p],texts:[{t:'Sample',x:12,y:20,s:6}],st:{pal:true}},sel:0,selT:-1,cs:-1,selPal:false};const fields={},writes=[],nodes={board:{querySelector:()=>({clientWidth:100,clientHeight:100,querySelector:()=>({offsetWidth:200,offsetHeight:100})})}};
 const c={state,console,Math,Number,Set,JSON,$:id=>nodes[id]||fields[id]||(fields[id]={value:''}),document:{activeElement:null},bst:()=>state.board.st,csPiece:()=>state.board.pieces[state.cs],isColl:()=>!!state.board.lay,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),round2:v=>Math.round(v*100)/100,normRot:v=>((Math.round(v)+540)%360)-180,boardUndoSnapshot:b=>JSON.parse(JSON.stringify(b)),persistBoard:()=>writes.push(JSON.stringify(state.board)),renderBoard:()=>{},palPos:()=>({x:12,y:85})};vm.createContext(c);vm.runInContext(source,c);c.boardAdjustPaint=()=>{};c.boardAdjustSay=()=>{};return {c,state,writes,p};}
{
 const {c,state,writes,p}=fixture();c.boardAdjustToggle();assert(c.boardAdjustSession.open);assert.equal(writes.length,0,'opening controls never writes');c.boardAdjustMove('right');assert.equal(p.x,11);assert.equal(writes.length,1);c.boardAdjustValue('board-adjust-size',500);assert.equal(p.w,95);c.boardAdjustValue('board-adjust-rotation',390);assert.equal(p.rot,30);const n=writes.length;c.boardAdjustValue('board-adjust-size','NaN');c.boardAdjustValue('board-adjust-size','');assert.equal(writes.length,n);p.x=-p.w/2;c.boardAdjustMove('left');assert.equal(writes.length,n,'bounded no-op does not save');
 state.sel=-1;state.selT=0;c.boardAdjustValue('board-adjust-size',2);assert.equal(state.board.texts[0].s,2);c.boardAdjustMove('up');assert.equal(state.board.texts[0].y,19);
 state.selT=-1;state.selPal=true;c.boardAdjustValue('board-adjust-size',1.5);assert.equal(state.board.st.pk,1.5);c.boardAdjustRotate(15);assert.equal(state.board.st.pr,15);c.boardAdjustMove('left');assert.equal(state.board.st.px,11);assert.equal(state.board.st.py,85);
 state.selPal=false;state.board.lay={k:'arches'};state.cs=0;c.boardAdjustValue('board-adjust-size',2);assert.equal(p.zm,2);c.boardAdjustMove('left');assert.equal(p.px,.55,'move left increases crop fraction so visible photo moves left');const y=p.py;c.boardAdjustMove('up');assert.equal(p.py,y,'no movement on an axis with no overflow');c.boardAdjustValue('board-adjust-size',1);assert.equal(p.zm,undefined);c.boardAdjustValue('board-adjust-rotation',50);assert.equal(p.rot,30,'fitted window has no freehand rotation edit');state.boardSaving=true;const before=JSON.stringify(state.board);c.boardAdjustMove('right');assert.equal(JSON.stringify(state.board),before,'blocked save leaves state intact');
}
{
 const {c,state}=fixture();assert(c.boardOutlineValid([[0,0],[80,0],[80,80],[0,80]]));for(const points of [[],[[0,0],[2,2]],[[0,0],[0,0],[0,0]],[[0,0],[1,1],[2,2]],[[0,0],[NaN,1],[2,2]]])assert(!c.boardOutlineValid(points));c.boardOutlineDraft={owner:state.board,piece:state.board.pieces[0],points:[[0,0],[90,0],[90,90]],selected:0,history:[]};c.paintBoardUndo=()=>{};c.boardOutlineValue('x',12);assert.equal(c.boardOutlineDraft.points[0][0],12);assert.equal(state.board.pieces[0].clip,undefined,'preview does not alter document');assert(c.boardOutlineUndo());assert.equal(c.boardOutlineDraft.points[0][0],0);c.boardOutlineAdd();assert.equal(c.boardOutlineDraft.points.length,4);c.boardOutlineRemove();assert.equal(c.boardOutlineDraft.points.length,3);
}
{
 const {c}=fixture();let cases=0;
 for(const width of [1,8,24,80,1920])for(const height of [1,8,24,100,1080])for(const ratio of [0,.25,.8,1,4])for(const key of ['x','y','w','h'])for(const value of [-100,0,1,17,100,1e8]){
 let w=width*.6,h=height*.6;if(ratio){w=Math.min(w,h*ratio);h=w/ratio}const r=c.boardCropGeometry({x:(width-w)/2,y:(height-h)/2,w,h},width,height,ratio,key,value),eps=1e-7;
 assert(r.x>=-eps&&r.y>=-eps&&r.w>0&&r.h>0&&r.x+r.w<=width+eps&&r.y+r.h<=height+eps,JSON.stringify({width,height,ratio,key,value,r}));if(ratio)assert(Math.abs(r.w/r.h-ratio)<eps);cases++;
 }
 console.log('Crop geometry: '+cases+' bounded positions/dimensions, tiny images, ratio locking and extreme values pass.');
}
console.log('Board Adjust: read-only controls, contextual transforms, bounds, no-op saves, photo position direction, outline preview/Undo, invalid values and blocked saves pass.');

// Portrait, landscape and resized items retain the same fraction at opposing edges.
{
 const {c}=fixture();
 for(const [width,height,bw,bh] of [[80,240,360,270],[240,80,360,270],[500,200,1000,750],[30,300,320,400]]){
  const b=c.boardMoveBounds({w:20},{offsetWidth:width,offsetHeight:height},{clientWidth:bw,clientHeight:bh});
  assert(Math.abs((b.right-b.left)-100)<1e-8);assert(Math.abs((b.bottom-b.top)-100)<1e-8);
  assert(Math.abs(b.top+height/bh*50)<1e-8);assert(Math.abs(b.bottom+height/bh*50-100)<1e-8);
 }
}
