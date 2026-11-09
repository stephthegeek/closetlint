// Synthetic state only. Exercises the real navigation and preference functions without a browser.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
const part=source.split('/* ---------- Closet Lint shell behavior ---------- */')[1].split('/* ---------- end Closet Lint shell behavior ---------- */')[0];
const setTabSource=source.slice(source.indexOf('function setTab(t){'),source.indexOf('function editFocusInGrid()'));
const nodes=new Map(),calls=[];
function node(id){if(!nodes.has(id)){const attrs={};nodes.set(id,{value:'',textContent:'',attrs,setAttribute(k,v){attrs[k]=v},removeAttribute(k){delete attrs[k]},classList:{toggle(){},add(){}},addEventListener(){}})}return nodes.get(id)}
const ctx={releaseOutfitPreview(){},paintWorkspaceRecovery(){},state:{tab:'all',fantasy:false,wishOnly:false,picked:{}},$:node,localStorage:{getItem:()=>null,setItem(){}},document:{documentElement:node('root'),querySelectorAll:()=>[]},window:{scrollTo(){}},hiddenItems:()=>[],storedItems:()=>[],donateItems:()=>[],inTab:()=>true,resetFilterState(){ctx.state.wishOnly=false;ctx.state.q=''},renderTabs(){},renderFilters(){},renderGrid(){calls.push('closet')},renderTray(){},renderBoard(){calls.push('board')},renderSaved(){calls.push('saved')},tripRender(){calls.push('trip')},wrRender(){calls.push('ranking')},labRender(){calls.push('lab')},toast(){}};
vm.createContext(ctx);vm.runInContext(part+'\n'+setTabSource,ctx);
for(const [route,destination,renderer] of [['all','closet','closet'],['clothing','closet','closet'],['accessories','closet','closet'],['jewelry','closet','closet'],['offduty','closet','closet'],['outfits','board','board'],['saved','saved','saved'],['lab','lab','lab'],['trip','trip','trip'],['wrank',null,'ranking']]){
  ctx.setTab(route);assert.equal(calls.at(-1),renderer,route+' renders the right workflow');
  if(destination)assert.equal(node('go-'+destination).attrs['aria-current'],'page');
  assert.equal(['closet','board','saved','lab','trip'].filter(key=>node('go-'+key).attrs['aria-current']==='page').length,destination?1:0,route+' marks only its own primary destination');
}
ctx.state.tab='all';ctx.state.fantasy=true;ctx.state.wishOnly=true;
ctx.setTab('jewelry');assert.equal(ctx.state.wishOnly,true,'category switching preserves wishlist scope');
ctx.setTab('saved');assert.equal(ctx.state.wishOnly,false,'leaving Closet clears its temporary scope');
ctx.state.tab='all';ctx.state.fantasy=false;ctx.syncNavigation();assert.equal(node('fantbtn').attrs['aria-checked'],'false');
ctx.state.fantasy=true;ctx.syncNavigation();assert.equal(node('fantbtn').attrs['aria-checked'],'true');
ctx.wishCount=()=>1;ctx.renderTabs=()=>ctx.syncNavigation();
vm.runInContext(source.slice(source.indexOf('function setFantasy(v){'),source.indexOf('function hiddenItems()')),ctx);
ctx.state.wishOnly=true;ctx.setFantasy(false);assert.equal(ctx.state.wishOnly,false,'turning fantasy off clears wishlist-only');assert.equal(node('fantbtn').attrs['aria-checked'],'false');
vm.runInContext(source.match(/function ownedItems\(\)\{[^\n]+/)[0],Object.assign(ctx,{allItems:()=>[{id:'owned'},{id:'wish',wish:true},{id:'stored',stored:true},{id:'hidden',hidden:true}]}));
assert.deepEqual(Array.from(ctx.ownedItems(),x=>x.id),['owned']);ctx.setFantasy(true);assert.deepEqual(Array.from(ctx.ownedItems(),x=>x.id),['owned','wish','stored']);
for(const value of [null,'bad',{}, {theme:'sepia',density:999}]){const p=ctx.cleanDisplayPrefs(value);assert.equal(p.theme,'system');assert.equal(p.density,2)}
ctx.applyDisplayPrefs({theme:'dark',density:3});assert.equal(node('root').attrs['data-theme'],'dark');assert.equal(node('thumbsize').attrs['aria-valuetext'],'Large');
ctx.applyDisplayPrefs({theme:'system',density:1});assert.equal(node('root').attrs['data-theme'],undefined,'System follows OS again');
ctx.localStorage.getItem=()=>'{broken';assert.equal(ctx.readDisplayPrefs().theme,'system');
ctx.localStorage.getItem=()=>{throw Error('storage denied')};assert.equal(ctx.readDisplayPrefs().density,2);
// Parse actual elements: JavaScript/SVG template strings are not shell elements.
// Python is already required by this suite; its standard HTML parser handles
// quoted/unquoted attributes, comments, and raw script/style content.
function shellIds(html){
  const parser=`import sys,json
from html.parser import HTMLParser
class Ids(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=[]
 def handle_starttag(self,tag,attrs):
  self.ids.extend(value for name,value in attrs if name=='id')
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs)
p=Ids();p.feed(sys.stdin.read());print(json.dumps(p.ids))`;
  return JSON.parse(require('node:child_process').execFileSync('python3',['-c',parser],{input:html,encoding:'utf8'}));
}
const shellFixture=`<!-- <div id="comment"></div> --><div data-id="metadata" id="real"></div><input ID='second'><span id=third></span><script>const a='<pattern id="dynamic">';const b='<pattern id="dynamic">';</script><style>.x::after{content:'id="css"'}</style>`;
assert.deepEqual(shellIds(shellFixture),['real','second','third'],'shell IDs exclude script, style, comments, and data attributes');
const duplicateIds=shellIds(shellFixture+'<svg><pattern id="real"/></svg>');
assert.notEqual(new Set(duplicateIds).size,duplicateIds.length,'real duplicate IDs remain detectable, including SVG elements');
const ids=shellIds(source);
assert.equal(new Set(ids).size,ids.length,'HTML IDs are unique');
console.log('Navigation, wishlist scope, display preference recovery, and unique DOM IDs passed.');

// Opening a remembered board while capabilities load must not overwrite the imported board.
ctx.paintBoardSaveStatus=()=>{};ctx.workspaceSnapshot=()=>({});ctx.boardUndoRemember=()=>{};
const persisted=[];ctx.state.board={name:'Synthetic board',pieces:[]};ctx.oMetaFrom=()=>({});
ctx.window.ClosetLintRuntime={setBoard:value=>persisted.push(value)};
vm.runInContext(source.slice(source.indexOf('function copyBoardPieces('),source.indexOf('function restoreBoard(){')),ctx);
ctx.state.capsDone=false;ctx.state.db=null;ctx.persistBoard();assert.equal(persisted.length,0);
ctx.state.capsDone=true;ctx.persistBoard();assert.equal(persisted.length,0);
ctx.state.db={};ctx.persistBoard();assert.equal(persisted.length,1);
console.log('Local board startup guard passed.');

ctx.skyRender=()=>calls.push('sky');ctx.setTab('sky');assert.equal(calls.at(-1),'sky');assert.equal(node('go-sky').attrs['aria-current'],'page');assert.ok(!node('go-closet').attrs['aria-current']);console.log('Sky has a distinct destination and renderer.');
