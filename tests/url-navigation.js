const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/scripts/navigation.js','utf8');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');assert.equal(html.split('/* BEGIN NAVIGATION (source: app/scripts/navigation.js) */\n')[1].split('\n/* END NAVIGATION */')[0],source);
const c={URLSearchParams,encodeURIComponent,decodeURIComponent,JSON,Number};vm.createContext(c);vm.runInContext(source.slice(0,source.indexOf('function installClosetRoutes(')),c);
for(const hash of ['#/pieces/c-abc','#/outfits/o1','#/collections/collection-a','#/trips/t1','#/board','#/sky','#/sky/catalog','#/calendar','#/calendar?month=2026-11','#/lab','#/outfits','#/collections','#/trips','#/closet?category=jewelry'])assert.equal(c.closetRouteHash(c.parseClosetRoute(hash)),hash);
for(const hash of ['#/pieces','#/pieces/a/b','#/pieces/%00','#/pieces/%2F','#/pieces/%ZZ','#/nope','#/calendar?month=2026-13','#/calendar/a','#/closet?category=bad'])assert.equal(c.parseClosetRoute(hash),null,hash);
assert.equal(c.parseClosetRoute('#/pieces/a%20b').id,'a b');
const location={hash:''},stack=[],renders=[];let position=-1,allowed=true,context={scroll:0,values:{q:''}},restored=[];
const history={pushState(state,x,url){stack.splice(position+1);stack.push({state,url});position++;location.hash=url},replaceState(state,x,url){if(position<0){stack.push({state,url});position=0}else stack[position]={state,url};location.hash=url},go(delta){position+=delta;assert(position>=0&&position<stack.length);location.hash=stack[position].url;router.pop({state:stack[position].state})}};
const router=c.createClosetHistory({history,location,resolve:r=>r||({type:'closet',category:'all'}),guard:()=>allowed,capture:()=>JSON.parse(JSON.stringify(context)),apply:(r,a,ctx)=>{renders.push(r);if(a)a();if(ctx)context=JSON.parse(JSON.stringify(ctx))},restoreScroll:ctx=>restored.push(ctx.scroll)});
router.start({type:'closet',category:'all'});context={scroll:720,values:{q:'blue',collectionFilter:{a:true}}};router.capture();
router.go({type:'pieces',id:'p1'},{action(){}});assert.equal(stack.length,2);assert.equal(location.hash,'#/pieces/p1');
allowed=false;history.go(-1);assert.equal(position,1);assert.equal(location.hash,'#/pieces/p1','cancelled Back returns to exact history entry');assert.equal(renders.length,2,'cancelled Back never applies destination');
allowed=true;history.go(-1);assert.equal(location.hash,'#/closet');assert.equal(context.values.q,'blue');assert.equal(restored.at(-1),720,'Back restores browse scroll and filters');
allowed=false;history.go(1);assert.equal(position,0,'cancelled Forward returns to its exact history entry');assert.equal(location.hash,'#/closet');allowed=true;history.go(1);assert.equal(location.hash,'#/pieces/p1');
router.go({type:'outfits',id:'o1'},{action(){}});allowed=false;const before=stack.length;assert.equal(router.go({type:'board'}),false);assert.equal(stack.length,before,'cancelled menu navigation adds no entry');
allowed=true;history.go(-1);router.go({type:'collections',id:'collection-a'},{action(){}});assert.equal(stack.length,3,'new branch truncates forward entries');assert.equal(location.hash,'#/collections/collection-a');
// Unknown/deleted routes resolve to a safe page without changing any board object.
const workingBoard={pieces:[{id:'untouched'}]};const missingLocation={hash:'#/outfits/missing'},otherHistory={replaceState(s,x,url){missingLocation.hash=url},pushState(){throw Error('initial deep link must replace')},go(){}};
const missing=c.createClosetHistory({history:otherHistory,location:missingLocation,resolve:r=>({type:'outfits',id:null}),guard:()=>true,capture:()=>({}),apply:()=>{},restoreScroll:()=>{}});missing.start(c.parseClosetRoute(missingLocation.hash));assert.equal(missingLocation.hash,'#/outfits');assert.equal(workingBoard.pieces[0].id,'untouched');
console.log('URL history: parser, deep links, cancel/restore Back, Forward, filters/scroll, branching, safe missing routes, and no history writes on rejected navigation pass.');

assert.equal(c.parseClosetRoute('#/sky/extra'),null,'Sky is a page, not an arbitrary record route');
