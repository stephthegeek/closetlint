const assert=require('node:assert/strict'),fs=require('node:fs'),icons=require('../app/scripts/control-icons');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),moduleSource=fs.readFileSync(__dirname+'/../app/scripts/control-icons.js','utf8');
assert.equal(source.split('/* BEGIN CONTROL ICONS (source: app/scripts/control-icons.js) */\n')[1].split('\n/* END CONTROL ICONS */')[0],moduleSource,'embedded icon choices match source');
for(const [pack,scientist,wizard,fairy] of [['femme','👩‍🔬','🧙‍♀️','🧚‍♀️'],['masc','👨‍🔬','🧙‍♂️','🧚‍♂️'],['other','🧪','🧙','🧚']]){
 assert.equal(icons.get('E007',pack),scientist);assert.equal(icons.get('NEW-setup-wizard',pack),wizard);assert.equal(icons.get('NEW-trip-fairy',pack),fairy);
}
assert.equal(icons.get('E026','femme'),'🎁');assert.equal(icons.get('E003','masc'),'📿');assert.equal(icons.get('E003','other'),'💎');
assert.equal(icons.key('👗','Dresses',''),'','literal garment categories retain garment icons');assert.equal(icons.key('🧪','Rate outfits',''),'','rating tab keeps its test tube');
assert.equal(icons.key('👗','A saved name','trip-outfit-name'),'E006');assert.equal(icons.key('🎨','Accessorize',''),'NEW-accessorize');
const icon={textContent:'🧑‍🔬',attrs:{},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v}},control={textContent:'🧑‍🔬 Lab',className:'btn',getAttribute:()=>'',querySelectorAll:()=>[icon]};
icons.apply(control,'femme');assert.equal(icon.textContent,'👩‍🔬');icons.apply(control,'masc');assert.equal(icon.textContent,'👨‍🔬');icons.apply(control,'other');assert.equal(icon.textContent,'🧪');icons.apply(control,'femme');assert.equal(icon.textContent,'👩‍🔬','stable semantic identity survives pack switches');
console.log('Control icon packs: owner choices, gendered people, dynamic controls, repeat switching, literal categories, and embedded sync pass.');

// Wishlist category controls retain semantic pack identities on repeated changes.
{
 const vm=require('node:vm'),c={};vm.createContext(c);vm.runInContext(source.split('\n').find(l=>l.startsWith('function wrScopeIconKey(')),c);
 for(const group of ['clothing','shoes','jewelry','other']){
  const icon={textContent:'',attrs:{'data-control-icon':c.wrScopeIconKey(group)},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v}};
  const control={textContent:group,className:'chip',getAttribute:()=>group,querySelectorAll:()=>[icon]};
  for(const pack of ['femme','masc','other','femme']){icons.apply(control,pack);assert.equal(icon.textContent,icons.get(c.wrScopeIconKey(group),pack));assert(icon.textContent)}
 }
 assert.equal(c.wrScopeIconKey('legwear'),'','literal socks remain a shared garment symbol');
 assert.equal(icons.get(c.wrScopeIconKey('shoes'),'masc'),'👞');assert.equal(icons.get(c.wrScopeIconKey('other'),'masc'),'🎒');
 console.log('Wishlist filters: selected emoji packs and repeated switches preserve all category identities.');
}
