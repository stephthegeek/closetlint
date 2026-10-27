'use strict';
const assert = require('node:assert/strict');
const sky = require('../app/scripts/sky.js');
const {itemsFromSnapshot, render} = require('../tools/sky_report.js');
const catalog = {
  stars:[
    {id:'gothic', tag:'Gothic', sky:{x:.1,y:.2}, source:{field:'Style',value:'Gothic'}},
    {id:'romantic', tag:'Romantic', sky:{x:.4,y:.2}, source:{field:'Style',value:'Romantic'}},
    {id:'professional', tag:'Professional', sky:{x:.7,y:.2}, source:{field:'Occasion',value:'Professional'}}
  ],
  constellations:[
    {id:'goth-romance',name:'Goth romance',stars:['gothic','romantic'],patterns:['Floral'],details:['Lace trim'],colors:['multicolor'],keywords:['velvet'],types:['maxi skirt']},
    {id:'office',name:'Office',stars:['gothic','professional']}
  ]
};
const date = '2026-10-20';
const piece = (id, extra = {}) => ({id, name:id, meta:'Tops', looks:['gothic','romantic'], ...extra});
const fixtures = Array.from({length:15}, (_,i) => piece('p'+i));
const run = (items, ratings = {}, day = date, data = catalog) => sky.score(items, ratings, data, day);
const vote = (r, reading, id) => r.readings[reading].stars.find(s => s.id === id).votes;

const before = JSON.stringify(fixtures);
const basic = run(fixtures);
assert.equal(JSON.stringify(fixtures), before, 'scoring never mutates pieces');
assert.equal(basic.readings.sun.winner, 'goth-romance');
assert.equal(vote(basic,'sun','gothic'), 7.5);
assert.equal(basic.readings.moon.ready, false);
assert.deepEqual(run(fixtures), basic, 'same input and date have the same output');
assert.deepEqual(run(fixtures.slice().reverse()), basic, 'piece ordering does not affect scoring or evidence order');
assert.deepEqual(run(fixtures.map(p=>({...p,price:999,size:'XXL',url:'https://example.com/?affiliate=yes',source:'Different shop'}))), basic, 'price, size, and shopping links never affect the sky');

const excluded = run(fixtures.concat([
  piece('functional', {functional:true, fav:true, wish:true, wears:[date]}),
  piece('hidden', {hidden:true}), piece('removed',{removed:true}),
  piece('color-only',{looks:[],colors:['black'],pattern:['floral']}),
  piece('offduty',{meta:'Lingerie'}), piece('stored',{stored:true}), piece('accessory',{meta:'Jewelry'})
]));
assert.equal(vote(excluded,'sun','gothic'), 8.75, 'Off-duty and stored pieces count; jewelry has half weight');
assert.deepEqual(excluded.excluded, {hidden:1,removed:1,everydayBasic:1,noSkyTags:1});
assert.equal(excluded.readings.moon.pieceCount, 0, 'Everyday basics are excluded from every reading');

const split = run([piece('a',{looks:['Gothic','gothic','romantic'],styles:['Professional']})]);
assert.equal(vote(split,'sun','gothic'), 1/3, 'Professional participates in the same vote, and duplicate tags do not dilute it');
assert.equal(vote(split,'sun','professional'), 1/3);
const partial = run(Array.from({length:15},(_,i) => piece('x'+i,{looks:['gothic'],pattern:['floral'],details:['lace trim']})));
assert.equal(partial.readings.sun.winner, null, 'boosts cannot supply missing defining stars');
assert.equal(partial.readings.sun.constellations[0].complete, false);
assert.equal(vote(partial,'sun','romantic'), 0);

const ratings = {a:{r:1,ids:['a'],acc:{jewelry:['b']}},b:{r:1,ids:['a']},c:{r:0,ids:['c']}};
const moon = run([piece('a',{fav:true,wish:true}),piece('b',{meta:'Jewelry'}),piece('c')],ratings);
assert.equal(vote(moon,'moon','gothic'), 1.625, 'Moon signals add; repeated loved outfit membership counts once; accessories count');
assert.equal(moon.readings.moon.pieceCount, 2, 'Like does not count as Love');
assert.equal(moon.readings.sun.pieceCount, 2, 'wishlist pieces are absent from Sun');
assert.equal(run([piece('not-an-accessory')],{a:{r:1,ids:[],acc:{st:'not-an-accessory'}}}).readings.moon.pieceCount,0,'accessory helper text is not a piece ID');

const past = new Date(Date.parse(date+'T00:00:00Z') - 90*86400000).toISOString().slice(0,10);
const edge = new Date(Date.parse(date+'T00:00:00Z') - 365*86400000).toISOString().slice(0,10);
const wears = run([piece('a',{wears:[date,date,past,edge,'2026-10-21','2026-02-30','bad']}),piece('wish',{wish:true,wears:[date]})]);
assert.equal(wears.readings.rising.wearEvents, 2);
assert.equal(vote(wears,'rising','gothic'), .75, 'recent wears decay with a 90-day half-life; invalid/future/old dates and wishlist wears do not count');
assert.equal(run(Array.from({length:10},(_,i)=>piece('w'+i,{wears:[date]}))).readings.rising.ready, true);
assert.equal(run(Array.from({length:5},(_,i)=>piece('m'+i,{fav:true}))).readings.moon.ready, true);
assert.equal(run(fixtures.slice(1)).readings.sun.ready, false);
assert.throws(()=>run(fixtures,{},'2026-02-30'),/valid scoring date/);
assert.throws(()=>run([piece('same'),piece('same')]),/unique/);

const colorful = {colors:['red','blue','green']};
assert.equal(sky.bonus(colorful,{colors:['multicolor']}).total, 0);
assert.equal(sky.bonus({colors:['red','blue','green','yellow']},{colors:['multicolor']}).total, .03);
assert.equal(sky.bonus({colors:['red','blue','green','green']},{colors:['multicolor']}).total, 0, 'four distinct colors required');
assert.equal(sky.bonus({colors:['black','white']},{colors:['black','white']}).total, .02);
assert.equal(sky.bonus({name:'Velveteen cardigan'},{keywords:['velvet']}).total,0,'title keywords use whole words');
assert.equal(sky.bonus({name:'BLACK VELVET skirt'},{keywords:['velvet']}).total,.03);
assert.equal(sky.bonus({sub:'Skirts',length:'maxi'},{types:['maxi skirt']}).total,.04);
assert.equal(sky.bonus({sub:'Skirts',length:'mini'},{types:['maxi skirt']}).total,0);
const boosted = fixtures.map(p=>({...p,pattern:['floral'],details:['lace trim']}));
const twice = boosted.concat(boosted.map(p=>({...p,id:'copy-'+p.id})));
const a = run(boosted).readings.sun.constellations.find(c=>c.id==='goth-romance');
const b = run(twice).readings.sun.constellations.find(c=>c.id==='goth-romance');
assert.ok(Math.abs(a.boost-.1)<1e-12);
assert.ok(Math.abs(a.brightness-b.brightness)<1e-12, 'a larger duplicate closet does not inflate the boost');
assert.ok(sky.bonus({colors:['red','blue','yellow','green'],pattern:['floral'],details:['lace trim'],name:'velvet',statement:'loud',styles:['party'],fits:['oversized']},{colors:['red','blue','yellow','green','multicolor'],patterns:['floral'],details:['lace trim'],keywords:['velvet'],statement:'loud',occasion:'party',fit:'oversized'}).total<=.4);

const snapshot = {base:{catalog:[piece('base',{looks:['kawaii']})],tags:{base:{functional:false}}},collections:{
  edits:{base:{functional:true},'c-custom':{fav:true}},custom:{custom:{name:'Custom',meta:'Tops',looks:['whimsical']}},
  profile:{cleanup:{map:{base:{name:'Cleaned'}}}}
}};
const merged = itemsFromSnapshot(snapshot);
assert.equal(merged.find(p=>p.id==='base').functional,true,'edits override imported tags');
assert.equal(merged.find(p=>p.id==='base').name,'Cleaned');
assert.deepEqual(merged.find(p=>p.id==='base').looks,['cute'],'actual app tag migration is reused');
assert.deepEqual(merged.find(p=>p.id==='c-custom').looks,['quirky']);
assert.equal(merged.find(p=>p.id==='c-custom').fav,true);
const hostile = run(fixtures.map(p=>({...p,name:'<img src=x onerror=alert(1)>'})));
assert.ok(!render(hostile).includes('<img src=x'), 'private HTML reports escape imported text');
const actualCatalog = {stars:require('../app/content/sky/stars.json').stars,constellations:require('../app/content/sky/constellations.json').constellations};
const actual = run([],{},date,actualCatalog);
assert.equal(actual.readings.sun.stars.length,37);
assert.equal(actual.readings.sun.constellations.length,64);
assert.equal(actual.readings.sun.winner,null);
assert.deepEqual(run(boosted.slice().reverse()),run(boosted),'fractional vote and bonus accumulation is stable across input order');
console.log('Sky scoring: eligibility, vote splitting, completeness, scale-independent bonuses, four-color threshold, Moon, wear decay, app merging, deterministic results, and escaped reports passed.');

// Real catalog mappings: Festival uses Occasion; Utility uses Aesthetic.
const realStars = require('../app/content/sky/stars.json').stars;
const mappingCatalog = {stars:realStars,constellations:[{id:'mapping-check',name:'Mapping check',stars:['festival','utility']}]};
const mappingPieces = Array.from({length:15},(_,i)=>piece('mapping-'+i,{looks:['utility'],styles:['festival']}));
const mappingResult = sky.score(mappingPieces,{},mappingCatalog,date);
assert.equal(vote(mappingResult,'sun','festival'),7.5,'Festival Occasion contributes without any Festival aesthetic');
assert.equal(vote(mappingResult,'sun','utility'),7.5,'Utility aesthetic contributes');
assert.equal(mappingResult.readings.sun.winner,'mapping-check');
const wrongField = sky.score([piece('wrong-field',{looks:['festival'],styles:[]})],{},mappingCatalog,date);
assert.equal(vote(wrongField,'sun','festival'),0,'Festival in the retired wrong field is not treated as Occasion');
console.log('Catalog mapping: Festival Occasion and Utility Aesthetic pass.');

// Version 2 synthetic wardrobe regression fixtures. No personal wardrobes or images.
const scoring = require('../app/content/sky/scoring.json');
const v2Catalog = {...actualCatalog,scoring};
const v2 = (pieces, data=v2Catalog) => sky.score(pieces,{},data,date);
const target = (result,id,key='sun') => result.readings[key].constellations.find(c=>c.id===id);
const fill = ps => ps.concat(Array.from({length:15},(_,i)=>piece('filler-'+i,{looks:['classic']})));
const repeat = extra => Array.from({length:3},(_,i)=>piece('signal-'+i,extra));
assert.ok(sky.harmonic([1,.02])<sky.harmonic([.4,.4]),'weak essential tags cannot be carried by a dominant tag');
assert.equal(sky.harmonic([1,0]),0);
assert.equal(v2([]).scoringVersion,scoring.version);
for(const key of ['sun','moon','rising'])assert.equal(v2([]).readings[key].sign.kind,'empty');
const sparse=v2([piece('retro',{looks:['retro']})]);
assert.equal(sparse.readings.sun.sign.kind,'broad-style');
assert.equal(sparse.readings.sun.sign.emerging,true);
assert.match(sparse.readings.sun.sign.note,/Still gathering/);
for(const key of ['moon','rising']){
 assert.equal(sparse.readings[key].sign.kind,'wardrobe-estimate');
 assert.equal(sparse.readings[key].sign.basis,'sun');
}
const worn=v2(Array.from({length:10},(_,i)=>piece('worn-'+i,{looks:['retro'],wears:[date]})));
assert.equal(worn.readings.rising.sign.name,'Retro');
assert.equal(worn.readings.rising.sign.kind,'broad-style');
assert.equal(worn.readings.rising.sign.emerging,false);
assert.equal(worn.readings.rising.sign.contributors.length,10);
const scarceWears=v2([piece('worn',{looks:['retro'],wears:[date]})]);
assert.equal(scarceWears.readings.rising.sign.basis,'rising','one wear uses actual wear evidence, not a wardrobe estimate');
assert.equal(scarceWears.readings.rising.sign.emerging,true);

assert.equal(target(v2(fill(repeat({name:'Cartoon rainbow robot shirt',looks:['cute','quirky'],pattern:['cartoon'],colors:['yellow','blue']}))),'kidcore').complete,false);
const child=target(v2(fill(repeat({name:'Teddy bear and building blocks pinafore',looks:['cute','quirky'],colors:['yellow','blue']}))),'kidcore');
assert.equal(child.complete,true,'explicit repeated play motifs can qualify Kidcore');
const knits=extra=>fill(repeat({name:'Oversized sweater knit',...extra}));
assert.equal(target(v2(knits({looks:['cozy','quirky']})),'scandi-minimal').complete,false);
assert.equal(target(v2(knits({looks:['minimalist','cozy']})),'scandi-minimal').complete,true);
assert.equal(target(v2(fill(repeat({name:'Mesh skull top',looks:['gothic','edgy']}))),'trad-goth').complete,false);
assert.equal(target(v2(fill(repeat({name:'Fishnet top with spikes',looks:['gothic','edgy']}))),'trad-goth').complete,true);
assert.equal(target(v2(fill(repeat({name:'Floral vest',looks:['boho','retro'],pattern:['floral']}))),'70s-boho').complete,false);
const mod=actualCatalog.constellations.find(c=>c.id==='60s-mod');
assert.deepEqual(sky.evidence({name:'Galaxy leggings model shot',pattern:['celestial']},mod),{},'model and Quirky motifs do not mean Mod');
const goth=actualCatalog.constellations.find(c=>c.id==='romantic-goth');
assert.ok(!sky.evidence({name:'Lace-up belt'},goth).texture,'lace-up is not lace fabric');
const lace=sky.evidence({name:'Lace lace trim',material:['lace'],details:['lace trim']},goth);
assert.equal(Object.keys(lace).length,1,'correlated lace labels do not supply independent evidence');

const bloom=repeat({name:'Floral floral flower shirt',pattern:['floral','botanical'],looks:['cottagecore']});
assert.equal(v2(bloom.slice(0,2)).readings.sun.stars.find(s=>s.id==='cottagecore').cueVotes,0);
const blooms=v2(bloom).readings.sun.stars.find(s=>s.id==='cottagecore');
assert.ok(Math.abs(blooms.cueVotes-.15)<1e-12,'repeated title/tag evidence yields one 5% motif bonus per piece');
const pair=[piece('shape-a',{looks:['boho'],name:'Flare pants',sub:'Pants',fits:['flared']}),piece('shape-b',{looks:['boho'],name:'Bell sleeve top'}),piece('shape-c',{looks:['boho'],name:'Bell sleeves blouse'})];
assert.ok(Math.abs(v2(pair).readings.sun.stars.find(s=>s.id==='boho').cueVotes-.15)<1e-12);
const oneShape=pair.map((p,i)=>({...p,name:'Flare pants',sub:'Pants',fits:['flared']}));
assert.equal(v2(oneShape).readings.sun.stars.find(s=>s.id==='boho').cueVotes,0,'one silhouette repeated is not a related pair');
const frames=piece('frames',{name:'Frames',meta:'Glasses',sub:'Glasses',looks:['geeky'],statement:'loud',wears:[date]});
const framed=v2([frames]);
assert.ok(Math.abs(framed.readings.rising.stars.find(s=>s.id==='geeky').cueVotes-.1)<1e-12,'loud eyewear and accessory cues use max, not sum; half weight retained');
const accessory=piece('ring',{meta:'Jewelry',looks:['quirky'],statement:'loud',wears:[date]});
const ring=v2([accessory]);
assert.equal(ring.readings.sun.stars.find(s=>s.id==='quirky').cueVotes,0);
assert.ok(Math.abs(ring.readings.rising.stars.find(s=>s.id==='quirky').cueVotes-.05)<1e-12);
const evidenceFixture=fill(repeat({name:'Velvet rose skirt',looks:['gothic','romantic'],fav:true}));
const evidenced=v2(evidenceFixture);
assert.equal(evidenced.readings.sun.sign.name,'Romantic goth');
assert.equal(evidenced.readings.sun.sign.emerging,true,'three-piece narrow constellation has an emerging note');
assert.deepEqual(v2(evidenceFixture.slice().reverse()),evidenced);
assert.equal(evidenced.readings.sun.sign.contributors.length,3);
const hostileSign=v2([piece('hostile',{looks:['retro'],name:'<script>alert(1)</script>'})]);
assert.ok(!render(hostileSign).includes('<script>'),'fallback contributors are escaped too');
assert.ok(render(hostileSign).includes('&lt;script&gt;'));

// The same pure module is usable by a future browser screen with explicit catalog config.
const fs=require('node:fs'),vm=require('node:vm');
const browserContext={};vm.runInNewContext(fs.readFileSync(require.resolve('../app/scripts/sky.js'),'utf8'),browserContext);
assert.equal(JSON.stringify(browserContext.ClosetLintSky.score(evidenceFixture,{},v2Catalog,date)),JSON.stringify(evidenced));
console.log('Sky v2: tighter definitions, harmonic balance, evidence, bounded cues, all three fallback states, versioning, determinism, and Node/browser-module parity passed.');
