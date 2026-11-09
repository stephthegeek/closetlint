const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
const shell=html.split('/* ---------- Closet Lint shell behavior ---------- */')[1].split('/* ---------- end Closet Lint shell behavior ---------- */')[0];
const data={};const c={URLSearchParams,META:['Tops','Bottoms','Jewelry','Glasses'],localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v}};vm.createContext(c);vm.runInContext(shell,c);
assert.deepEqual(JSON.parse(JSON.stringify(c.cleanClosetTabs(null))),{version:2,custom:['Jewelry','','']});
const cleaned=c.cleanClosetTabs({hidden:['all','jewelry','evil'],custom:['Tops','Tops','Glasses','Bottoms','Jewelry','evil']});
assert.equal(cleaned.version,2);assert.deepEqual(Array.from(cleaned.custom),['Tops','Glasses','Bottoms']);
c.renderClosetTabSettings=()=>{};c.renderTabs=()=>{};c.$=()=>null;c.saveClosetTabs(cleaned);
assert.equal(c.closetTabVisible('all'),true);assert.equal(c.closetTabVisible('jewelry'),false);assert.equal(c.closetTabVisible('cat:Tops'),true);assert.equal(c.isClosetTab('cat:Tops'),true);assert.equal(c.mainDestination('cat:Tops'),'closet');assert.equal(c.closetCategoryTab('cat:No such category'),'');
c.closetTabSession=null;assert.equal(c.closetTabVisible('cat:Glasses'),true,'category preferences survive reload');
vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/navigation.js','utf8').split('function installClosetRoutes')[0],c);
const route=c.parseClosetRoute('#/closet?category=cat%3AGlasses');assert.equal(route.category,'cat:Glasses');assert.equal(c.closetRouteHash(route),'#/closet?category=cat%3AGlasses');assert.equal(c.parseClosetRoute('#/closet?category=cat%3AFake'),null);
c.localStorage.getItem=()=>{throw Error('denied')};assert.equal(c.readDisplayPrefs().closetTabs.custom[0],'Jewelry');
console.log('Closet tabs: fixed All, sanitized settings, category routes, persistence, and inaccessible storage pass.');

const fixed=c.cleanClosetTabs({hidden:['all','clothing','accessories','offduty'],custom:[]});assert.equal(fixed.custom[0],'Jewelry');
for(const tab of ['all','clothing','accessories','offduty'])assert.equal(c.closetTabVisible(tab),true,tab+' is fixed');
assert.deepEqual(Array.from(c.cleanClosetTabs({version:2,custom:['','Tops','']}).custom),['','Tops',''],'None does not shift the remaining slots');
assert.deepEqual(Array.from(c.cleanClosetTabs({version:2,custom:['Tops','Tops','Glasses']}).custom),['Tops','','Glasses']);
assert.deepEqual(Array.from(c.cleanClosetTabs({version:2,custom:[]}).custom),['','',''],'users can omit every extra');
assert.deepEqual(Array.from(c.cleanClosetTabs({custom:['Tops','Glasses']}).custom),['Jewelry','Tops','Glasses'],'earlier visible Jewelry is preserved within the three extra slots');

for(const tab of ['import','tidy-photos','tidy-details'])assert.notEqual(c.mainDestination(tab),'closet','batch pages do not highlight Closet');
