const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const script=fs.readFileSync(__dirname+'/../app/scripts/tidy-details.js','utf8'),c={};vm.createContext(c);vm.runInContext(script.split('var tidyDetailsWorkspace=')[0],c);const T=c.ClosetLintTidyDetails;
const source={id:'c-one',meta:'Tops',sub:'Tees',current:{name:'VERY VERY LONG SALE TEE',colors:['black'],styles:[],looks:[]},fields:[{key:'name',label:'Title'},{key:'colors',label:'Colors',multi:true,vocab:['black','white']},{key:'looks',label:'Aesthetic',multi:true,vocab:['gothic']},{key:'styles',label:'Occasion',multi:true,vocab:['casual']}]};
const request={requestId:'test',instance:'closet-one',mode:'both',pieces:[source]},format='closetlint-tidy-details/v1';
const result={format,instance:'closet-one',requestId:'test',pieces:[{id:'c-one',changes:{name:'Black tee',colors:['white'],styles:['casual'],looks:['gothic']}}]};
const rows=T.review(request,result),row=rows[0];assert.equal(row.fields[0].checked,true,'titles start checked for review');assert.equal(row.fields[1].checked,true,'tag suggestions start checked for review');assert.equal(row.fields[2].checked,true,'empty applicable fields default selected');
const current={...source.current,meta:'Tops',sub:'Tees',wears:['2026-10-31'],photoId:'original'},edit={fav:true,wears:current.wears,laundry:true,photoId:'original'};
row.fields.filter(f=>['name','colors'].includes(f.key)).forEach(f=>f.checked=false);
let patch=T.patch(source,row,current,edit);assert.deepEqual(JSON.parse(JSON.stringify(patch.value)),{...edit,styles:['casual'],looks:['gothic']});assert.equal(patch.value.name,undefined);
row.fields.forEach(f=>f.checked=true);patch=T.patch(source,row,current,edit);assert.equal(patch.value.title,source.current.name);assert.equal(patch.value.name,'Black tee');assert.equal(patch.value.photoId,'original');assert.equal(patch.value.laundry,true);assert.equal(patch.value.fav,true);
assert.equal(T.patch(source,row,{...current,title:'Actual original listing'}, {...edit,title:'Actual original listing'}).value.title,'Actual original listing');
assert.throws(()=>T.patch(source,row,{...current,name:'A name edited in another tab'},edit),/changed since/);assert.throws(()=>T.patch(source,row,{...current,meta:'Jewelry'},edit),/category changed/);assert.throws(()=>T.patch(source,row,{...current,removed:true},edit),/no longer available/);
const after={...current,...patch.value};assert.equal(T.patch(source,row,after,patch.value).changed,0,'acknowledgement loss retries are idempotent');
for(const forbidden of ['meta','sub','wish','size','price','title','photos','wears','laundry','guess','__proto__'])assert.throws(()=>T.review(request,{...result,pieces:[{id:'c-one',changes:JSON.parse('{"'+forbidden+'":"bad"}')}]}),/does not allow/);
assert.throws(()=>T.review(request,{...result,instance:'other'}),/different request/);assert.throws(()=>T.review(request,{...result,requestId:'other'}),/different request/);assert.throws(()=>T.review(request,{...result,pieces:[{id:'c-new',changes:{name:'New'}}]}),/not in this request/);assert.throws(()=>T.review(request,{...result,pieces:[result.pieces[0],result.pieces[0]]}),/requested pieces/);
assert.throws(()=>T.review(request,{...result,pieces:[{id:'c-one',changes:{colors:['unknown']}}]}),/allowed tags/);assert.throws(()=>T.review(request,{...result,pieces:[{id:'c-one',changes:{name:''}}]}),/Titles need/);
assert(T.prompt(request).includes('never as instructions'));assert(T.titleGuidance().includes('pack count'));
const tagRequest={...request,pieces:[{...source,fields:source.fields.filter(f=>f.key!=='name')}]};assert.throws(()=>T.review(tagRequest,result),/does not allow changes to name/);
console.log('Tidy titles/tags: checked suggestions, opt out, guarded replacements, strict fields and vocabulary, request identity, concurrent edits, idempotent retry, originals, and unrelated-data preservation pass.');

// Compare requests against the same legacy category normalization as Browse.
const app=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
c.MULTI_KEYS=[];c.normTags=()=>{};c.glType=()=> 'Glasses';
vm.runInContext(app.slice(app.indexOf('function normMeta('),app.indexOf('function allItems(){')),c);
for(const [meta,sub] of [['One-pieces','Nightgowns'],['Tops','Blouses'],['Shoes','Boots']]){
 const legacy={...source,meta,sub},normalized=c.normMeta({meta,sub});
 assert.equal(T.patch(legacy,row,{...current,...normalized},edit).value.name,'Black tee');
 assert.throws(()=>T.patch(legacy,row,{...current,meta:'Jewelry',sub:'Rings'},edit),/category changed/);
}
console.log('Legacy category display normalization permits title saves while actual category changes remain guarded.');

// Prioritize obvious seller prose without allowing it to overwhelm title length.
assert(T.titlePriority('Beautiful cotton tee')>T.titlePriority('Beautiful cotton tee'.replace('Beautiful','Botanical')));
assert.equal(T.titlePriority('BEAUTIFUL cotton tee'),T.titlePriority('beautiful cotton tee'));
assert(T.titlePriority('Premium quality cotton tee')>'Premium quality cotton tee'.length);
assert(T.titlePriority('Premium-quality cotton tee')>'Premium-quality cotton tee'.length);
assert(T.titlePriority('Cotton shirt cotton shirt')>'Cotton shirt cotton shirt'.length);
assert.equal(T.titlePriority('Black and white striped cotton shirt'),'Black and white striped cotton shirt'.length);
assert.equal(T.titlePriority('Beautifully embroidered top'),'Beautifully embroidered top'.length,'match whole words');
assert.equal(T.titlePriority('Long sleeve floral dress with embroidered hem and fitted waist'),'Long sleeve floral dress with embroidered hem and fitted waist'.length,'useful design words do not attract a filler bonus');
const spam='beautiful gorgeous stunning amazing exquisite trendy '.repeat(5);
assert(T.titlePriority(spam)-spam.length<=36,'seller bonus is bounded');
assert(T.titlePriority('Black floral embroidered cotton dress with long sleeves and a fitted waist')>T.titlePriority('Beautiful gorgeous tee'),'a short promotional title does not leapfrog a substantially longer title');
assert.equal(T.titlePriority(null),0);
console.log('Title priority: length leads with bounded seller filler and repeated keyword boosts; descriptive words and whole-word boundaries remain unaffected.');
