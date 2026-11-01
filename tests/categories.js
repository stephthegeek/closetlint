const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
let items=[],writes=[],reject=false,wardrobeReads=0;
const c={document:{activeElement:null},state:{profile:{},db:{collection:name=>({doc:id=>({set:async record=>{if(reject)throw Error('offline');writes.push({name,id,record:JSON.parse(JSON.stringify(record))})}})})}},allItems:()=>{wardrobeReads++;return items},$:()=>null};vm.createContext(c);
vm.runInContext(html.slice(html.indexOf('var META='),html.indexOf('var DEFAULT_W=')),c);
vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/categories.js','utf8'),c);
assert(c.categoryMetas().includes('Underwear'));assert(!c.categoryMetas().includes('Costumes'));
for(const s of ['Bras','Briefs','Boxers','Boxer briefs'])assert(c.categorySubs('Underwear').includes(s));
for(const s of ['Thermals','Slips & crinolines'])assert(!c.categorySubs('Underwear').includes(s));
assert(!c.categorySubs('Activewear').includes('Dancewear'));assert(!c.categorySubs('Legwear').includes('Leg warmers'));
assert(c.categorySubs('Activewear',null,true).includes('Dancewear'));
const pending={meta:'Activewear',sub:'Dancewear'};
assert(c.categorySubs('Activewear',pending).includes('Dancewear'),'an incoming value stays available for review');
assert(!c.categorySubs('Activewear').includes('Dancewear'),'reviewing an import does not activate it elsewhere');
items=[{id:'saved',...pending,hidden:true,stored:true,wish:true}];
assert(c.categorySubs('Activewear').includes('Dancewear'),'saved hidden, stored, or wishlist pieces activate categories');
c.state.profile.categoryVisibility={choices:{'Activewear|Dancewear':false,'Underwear|Thermals':true,'Tops|Tees':false}};
assert(c.categorySubs('Activewear').includes('Dancewear'),'a preference cannot hide a populated category');
assert(c.categorySubs('Underwear').includes('Thermals'));assert(!c.categorySubs('Tops').includes('Tees'));
assert(c.categorySubs('Tops',{meta:'Tops',sub:'Legacy top'}).includes('Legacy top'));
assert.equal(c.metaLabel('Glasses'),'Eyewear');assert(c.SUBS.Glasses.includes('Glasses'));assert(c.SUBS.Glasses.includes('Sunglasses'));
assert.equal(c.kindVocab('Tops','Sweaters').join(','),'pullover,cardigan,vest');
(async()=>{
 assert(await c.saveCategoryPreferences({'Underwear|Thermals':true}));assert.equal(writes[0].name,'profile');assert.equal(writes[0].id,'categoryVisibility');
 reject=true;assert.equal(await c.saveCategoryPreferences({'Costumes|Wigs':true}),false);assert.equal(c.categorySettingsDraft['Costumes|Wigs'],true);assert.match(c.categorySettingsError,/offline/);
 reject=false;assert(await c.saveCategoryPreferences(c.categorySettingsDraft));assert.equal(c.categorySettingsDraft,null);assert(c.categoryMetas().includes('Costumes'));
 assert(await c.saveCategoryPreferences({}));assert(!c.categorySubs('Underwear').includes('Thermals'));assert(c.categorySubs('Activewear').includes('Dancewear'));
 console.log('Category catalog: concise defaults, populated overrides, pending imports, manual activation, reset, saved profile, and failed-save retry pass.');
})().catch(e=>{console.error(e);process.exit(1)});

// Exercise the editor's real event handlers: native selects emit input before change.
{
 const callbacks=()=>({value:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn}});
 const role=callbacks(),need=callbacks();
 const form={it:{meta:'Tops',sub:'Sweaters'},labAsSel:role,nuBox:need,name:{value:'Test sweater'},meta:{value:'Tops'},sub:{value:'Sweaters'},singleSel:{kind:{value:'vest'},layer:{value:''}},d:{},shoeSockSel:{options:[{}]},labSockRule:()=>null,isUnderCand:()=>false,labRole:()=> 'top',isSheer:()=>false,labTopish:()=>true};
 vm.createContext(form);
 const fn=name=>{const a=html.indexOf('function '+name+'('),b=html.indexOf('\nfunction ',a+1);return html.slice(a,b)};
 vm.runInContext(fn('labEither')+'\n'+fn('layerNeed')+'\n'+html.slice(html.indexOf('  var manualLabRole='),html.indexOf('  function showLabRel(){')),form);
 form.updateAutoLabels();assert.equal(role.value,'either');assert.equal(need.value,'under');
 role.value='top';role.listeners.input();form.updateAutoLabels();role.listeners.change();form.updateAutoLabels();assert.equal(role.value,'top');assert.equal(need.value,'none');
 need.value='under';need.listeners.input();form.updateAutoLabels();need.listeners.change();form.updateAutoLabels();assert.equal(need.value,'under');
 form.singleSel.kind.value='pullover';form.updateAutoLabels();assert.equal(role.value,'top');assert.equal(need.value,'under','changing a type must preserve explicit layering choices');
 console.log('Sweater editor: type defaults and explicit overrides survive native input/change event order.');
}

// A picker must normalize/read the wardrobe once, rather than once per category group.
{
 c.el=(tag,attrs={})=>({tag,...attrs,children:[],set textContent(value){this.children=[]},appendChild(n){this.children.push(n);return n},insertBefore(n){this.children.unshift(n)}});
 const start=html.indexOf('function catSelect(it){'),end=html.indexOf('\nfunction nameInput(',start);
 vm.runInContext(html.slice(start,end),c);wardrobeReads=0;
 const picker=c.catSelect({meta:'Tops',sub:'Sweaters',name:'Test sweater'});
 assert(picker.children.length>5);assert.equal(wardrobeReads,1,'category groups share one snapshot even outside a memoized render');
}

// Explicit legacy eyewear labels migrate without guessing from tint or product names.
{
 const functions=['glType','normSize','validateSize','normMeta','canon'];
 function fn(name){const a=html.indexOf('function '+name+'('),b=html.indexOf('\nfunction ',a+1);return html.slice(a,b)}
 const c={GL_TYPES:['Distance','Intermediate','Readers','Sunglasses'],MULTI_KEYS:[],normTags(){},isTrans:p=>(p.lens||[]).includes('transitions')};vm.createContext(c);vm.runInContext(functions.map(fn).join('\n'),c);
 assert.equal(c.glType('Computer'),'Intermediate');assert.equal(c.validateSize('glasses','Computer').v,'Intermediate');assert.equal(c.validateSize('glasses','Intermediate').ok,true);
 const sunglasses=c.normMeta({meta:'Glasses',sub:'Glasses',size:'Sunglasses'});assert.equal(sunglasses.sub,'Sunglasses');assert.equal(sunglasses.size,'Sunglasses');
 const transitional=c.normMeta({meta:'Glasses',sub:'Glasses',size:'Distance',lens:['transitions']});assert.equal(transitional.sub,'Glasses','transitions stay ordinary eyewear');
 assert.equal(c.normMeta({meta:'Glasses',sub:'Glasses',size:'Computer'}).size,'Intermediate');
 assert.equal(c.canon({sizes:['glasses:Computer']}),c.canon({sizes:['glasses:Intermediate']}),'saved and pinned views retain their meaning');
 console.log('Eyewear compatibility: Intermediate alias, legacy sunglasses category, preserved transitions, and saved-view identity pass.');
}
