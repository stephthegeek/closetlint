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
