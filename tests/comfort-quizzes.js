const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const root=require('path').resolve(__dirname,'..');let ctx={};vm.createContext(ctx);for(const f of ['comfort-zone','comfort-quizzes-catalog','comfort-quizzes-model','comfort-quizzes-integration'])vm.runInContext(fs.readFileSync(root+'/app/scripts/'+f+'.js','utf8'),ctx);const C=ctx.ClosetLintComfort;
assert.equal(C.topics.length,8);assert.equal(C.questions.length,48);
for(const t of C.topics){let d=C.empty();for(const q of t.questions){if(q.type==='one')d=C.apply(d,q,'choice',null,q.items[0].id);else if(q.type==='any')d=C.apply(d,q,'any',null,[]);else if(['body','rack'].includes(q.type))d=C.apply(d,q,'done');else for(const it of q.items)d=C.apply(d,q,'rate',it.id,q.type==='pair'?'B':2);assert(C.status(d,q).complete,q.id)}d.finished=true;assert(C.progress({[C.key(t.id)]:d},t).finished);assert(C.code(d,t).startsWith(t.code));}
let d=C.empty(),q=C.question('heel');d=C.apply(d,q,'rate','0',2);d=C.apply(d,q,'rate','2',-3);assert.equal(C.item(d,q,'5').value,-3);assert.equal(C.item(d,q,'5').auto,'ladder');d=C.apply(d,q,'rate','4',1);assert.equal(C.item(d,q,'5'),null);assert.equal(C.item(d,q,'2').value,-3);
d=C.apply(d,q,'none',null,true);assert.equal(C.item(d,q,'0').value,2);assert.equal(C.item(d,C.question('heels'),'block').value,'!');assert.equal(C.item(d,C.question('feet-pairs'),'1').value,'!');d=C.apply(d,q,'none',null,false);assert.equal(C.item(d,C.question('heels'),'block'),null);
q=C.question('earrings');d=C.apply(C.empty(),C.question('jewelry-pairs'),'rate','3','L');d=C.apply(d,q,'none',null,true);d=C.apply(d,q,'none',null,false);assert.equal(C.item(d,C.question('jewelry-pairs'),'3'),null,'dependent old pair cleared');
q=C.question('textures');d=C.apply(C.empty(),q,'skip','velvet');assert(C.item(d,q,'velvet').skip);assert.equal(C.code(d,C.topics[0]),'');d=C.apply(d,q,'rate','velvet',0);assert.match(C.code(d,C.topics[0]),/Ve/);d=C.apply(d,q,'clear','velvet');assert.equal(C.item(d,q,'velvet'),null);
for(const it of q.items.slice(0,4))d=C.apply(d,q,'rate',it.id,3);for(const it of q.items.slice(0,4))d=C.star(d,C.topics[0],q.id+'/'+it.id);assert.equal(d.stars.length,3);d=C.apply(d,q,'rate',q.items[0].id,-1);assert.equal(d.stars.length,2);
let profile={[C.key('fabric')]:C.apply(C.empty(),q,'rate','velvet',3)};assert.equal(C.evidence(profile,{material:['velvet']})[0].weight,3);assert.equal(C.evidence(profile,{}).length,0);assert(C.guidance(profile,{material:['velvet']}).score>0);assert(!C.guidance(profile,{material:['velvet']}).blocked);
let care=C.apply(C.empty(),C.question('careeffort'),'rate','cleaner',-3);assert.equal(C.evidence({[C.key('care')]:care},{care:{wash:'Dry clean only'}})[0].weight,-3);assert.equal(C.evidence({[C.key('care')]:care},{material:['silk']}).length,0);
for(const t of C.topics){let d=C.empty();for(const q of t.questions)d=C.apply(d,q,'skip-round');d.finished=true;assert.equal(C.code(d,t),'');assert.equal(C.progress({[C.key(t.id)]:d},t).answered,0)}
console.log('48 rounds: completion, skips vs neutral, star cap, ladder edit, dependency clearing, code, and known-field evidence pass.');

// Trouble spots use one selected level; legacy severities remain readable without rewriting saved records.
q=C.question('pressure');const oldTrouble={version:2,rounds:{pressure:{done:true,items:{neck:{value:-3},waist:{value:-1}}}},stars:[],finished:true};
assert.equal(C.doc({[C.key('fabric')]:oldTrouble},'fabric'),oldTrouble);
assert.equal(C.item(oldTrouble,q,'neck').value,-1);assert.equal(C.item(oldTrouble,q,'waist').value,-1);
assert.equal(oldTrouble.rounds.pressure.items.neck.value,-3);assert.equal(C.empty().version,2);
d=C.apply(oldTrouble,q,'rate','ankles',-1);assert.equal(C.item(d,q,'ankles').value,-1);d=C.apply(d,q,'clear','ankles');assert.equal(C.item(d,q,'ankles'),null);

// Combined precious-metal choices match explicitly recorded plated and solid materials.
q=C.question('jewelrymaterials');assert(!q.items.some(it=>it.id==='plated'));
let metals=C.apply(C.empty(),q,'rate','sterling silver',2);metals=C.apply(metals,q,'rate','gold-filled / solid gold',1);
for(const tag of ['silver','sterling silver','silver plated','silver-plated','gold','solid gold','gold plated','gold-plated']){const evidence=C.evidence({[C.key('jewelry')]:metals},{meta:'Jewelry',jmetal:[tag]});assert.equal(evidence.filter(x=>x.key.startsWith('jewelrymaterials:')).length,1,tag)}
assert.equal(C.evidence({[C.key('jewelry')]:metals},{meta:'Jewelry',jmetal:['plated']}).length,0,'unspecified plating does not imply a gold or silver answer');

// General color exclusions do not apply to jewelry; metal-specific preferences still do.
let colorLimits=C.apply(C.empty(),C.question('colorlimits'),'rate','white',-3);colorLimits=C.apply(colorLimits,C.question('colorlimits'),'done');
let tones=C.apply(colorLimits,C.question('metaltones'),'rate','gold',-3);
const jewelProfile={[C.key('color')]:colorLimits,[C.key('jewelry')]:tones};
assert(!C.evidence(jewelProfile,{meta:'Jewelry',colors:['white','gold']}).some(x=>x.key.startsWith('colorlimits:')));
assert(C.evidence(jewelProfile,{meta:'Jewelry',colors:['gold']}).some(x=>x.key==='metaltones:gold'));
assert(C.evidence(jewelProfile,{meta:'Tops',colors:['white']}).some(x=>x.key==='colorlimits:white'));

// Evidence remains comprehensible outside its original quiz question.
function ratedTrait(qid,id,piece){const q=C.question(qid),d=C.apply(C.empty(),q,'rate',id,2);return C.evidence({[C.key(q.topic)]:d},piece).find(x=>x.key===qid+':'+id).trait}
assert.equal(ratedTrait('toplength','regular',{meta:'Tops',length:'regular'}),'Regular length');
assert.equal(ratedTrait('skirtlength','midi',{meta:'One-pieces',sub:'Dresses',length:'midi'}),'Midi');
assert.equal(ratedTrait('necklacelength','long',{meta:'Jewelry',sub:'Necklaces',length:'long'}),'Long necklace');
assert.equal(ratedTrait('heel','2',{meta:'Footwear',heelIn:'2'}),'2" heels');
assert.equal(ratedTrait('earrings','hoop',{meta:'Jewelry',sub:'Earrings',kind:['hoop']}),'Hoops');
assert.equal(ratedTrait('dressfastenings','zips',{meta:'Tops',details:['zipper']}),'Zips');
