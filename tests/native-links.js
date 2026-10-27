// Native link semantics without a browser, personal data, or storage.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),navigation=fs.readFileSync(__dirname+'/../app/scripts/navigation.js','utf8');
const helper=html.slice(html.indexOf('function routeClick('),html.indexOf('function el(tag,attrs){'));
const c={URLSearchParams,el:(tag,attrs,children)=>({tag,attrs,children})};vm.createContext(c);vm.runInContext(navigation.slice(0,navigation.indexOf('function createClosetHistory('))+helper,c);
let calls=0,prevented=0;function event(extra={}){return {button:0,preventDefault(){prevented++},...extra}}
for(const modifier of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}])c.routeClick(event(modifier),()=>calls++);
assert.equal(calls,0);assert.equal(prevented,0,'modified and middle clicks keep native behavior');
c.routeClick(event(),()=>calls++);assert.equal(calls,1);assert.equal(prevented,1);
const link=c.routeAnchor({type:'pieces',id:'piece with space'},{class:'cardbtn'},()=>calls++,['photo']);assert.equal(link.tag,'a');assert.equal(link.attrs.href,'#/pieces/piece%20with%20space');link.attrs.onclick(event({ctrlKey:true}));assert.equal(calls,1);link.attrs.onclick(event());assert.equal(calls,2);
c.PUB={skySharePage:'sky.html'};assert.equal(c.closetRouteHref({type:'sky'}),'./sky.html#/sky');assert.equal(c.closetRouteHref({type:'sky',id:'catalog'}),'./sky.html#/sky/catalog');assert.equal(c.closetRouteHref({type:'outfits',id:'o1'}),'./#/outfits/o1');
const nav=html.split('<nav class="primary-nav"')[1].split('</nav>')[0];assert.equal((nav.match(/<a href=/g)||[]).length,5,'all primary destinations are real links');
console.log('Native links: normal clicks keep guarded actions; Ctrl/Command/Shift/Alt/middle clicks retain browser defaults; Sky uses its social page only on public builds.');
