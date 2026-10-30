const assert=require('node:assert/strict'),fs=require('node:fs'),icons=require('../app/scripts/control-icons');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),moduleSource=fs.readFileSync(__dirname+'/../app/scripts/control-icons.js','utf8');
assert.equal(icons.utility('🧹','Tidy photos'),'','the photo-tidy menu keeps its broom emoji');
assert.equal(icons.utility('🧹','Arrange all pieces'),'arrange','board arrangement retains its subtle utility icon');
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

// Browse tabs must resolve their pack on every count/data redraw, not only at preference changes.
{
 const vm=require('node:vm'),tabs={};let pack='masc';
 const c={ClosetLintIcons:icons,document:{documentElement:{getAttribute:()=>pack}},$:id=>tabs[id]||(tabs[id]={children:[],set textContent(v){this.children=[]},appendChild(n){this.children.push(n)},setAttribute(k,v){this[k]=v}}),el:(tag,attrs)=>({tag,...attrs})};
 vm.createContext(c);const a=source.indexOf('function paintTab('),b=source.indexOf('\nfunction ',a+1);vm.runInContext(source.slice(a,b),c);
 const categories=[['clothing','E001','👚','Clothing'],['accessories','E002','👠','Accessories'],['jewelry','E003','💍','Jewelry']];
 for(pack of ['masc','femme','other','masc'])for(const [id,key,glyph,label] of categories){
  c.paintTab(id,glyph,label,12);const tab=tabs['tab-'+id];assert.equal(tab.children[0].text,icons.get(key,pack));assert.equal(tab.children[0]['data-control-icon'],key);assert.equal(tab['aria-label'],label+' (12)');
  c.paintTab(id,glyph,label,13);assert.equal(tab.children[0].text,icons.get(key,pack),'data/count redraw retains the selected pack');
 }
 console.log('Browse category tabs: Masc/Femme/Other choices survive initial rendering, count redraws, and repeated pack switches.');
}
