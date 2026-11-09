const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),c={};
vm.createContext(c);vm.runInContext(source.slice(source.indexOf('var SEASONS='),source.indexOf('function inScope(')),c);
const start=source.indexOf('function pieceShoeDetailAliases('),end=source.indexOf('function itemForm(',start);vm.runInContext(source.slice(start,end),c);
const clone=x=>JSON.parse(JSON.stringify(x));
const shoe={id:'shoe',meta:'Footwear',sub:'Flats',kind:'slip-on',details:['zipper','lace-up','studs'],shoefeat:['zip','platform'],photos:[{photoId:'keep'}],wish:true,wishlistRank:7,wears:['2026-10-01'],care:{wash:'Hand wash'}};
const original=clone(shoe),next=clone(c.normalizePieceFields(shoe));
assert.deepEqual(shoe,original,'normalizing a form draft does not mutate saved data');
assert.deepEqual(next.shoefeat,['zip','platform','lace-up','slip-on']);assert.deepEqual(next.details,['studs']);assert.equal(next.kind,'');
for(const key of ['id','photos','wish','wishlistRank','wears','care'])assert.deepEqual(next[key],shoe[key]);
assert.deepEqual(clone(c.normalizePieceFields(next)),next,'migration is idempotent');
const strapless=clone(c.normalizePieceFields({meta:'Tops',sleeve:'strapless',neckline:['sweetheart'],details:['lace trim']}));assert.equal(strapless.sleeve,'sleeveless');assert.deepEqual(strapless.neckline,['sweetheart','strapless']);
const jewelry={meta:'Jewelry',details:['rhinestones','bows'],jfeat:['pearls']},j=clone(c.normalizePieceFields(jewelry));assert.deepEqual(j.details,['bows']);assert.deepEqual(j.jfeat,['pearls','crystals / rhinestones']);
assert.deepEqual(clone(c.normalizePieceFields({meta:'Tops',details:['rhinestones','zipper']})),{meta:'Tops',details:['rhinestones','zipper']});
const dim=key=>c.DIMS.find(d=>d.key===key),view=(key,metas,bulk=false)=>c.pieceChoiceDimension(dim(key),metas,bulk);
assert(!view('details',['Footwear']).vocab.includes('zipper'));assert(!view('details',['Footwear']).vocab.includes('lace-up'));assert(view('shoefeat',['Footwear']).vocab.includes('zip'));
assert(!view('details',['Jewelry']).vocab.includes('rhinestones'));assert(view('details',['Tops']).vocab.includes('rhinestones'));assert(view('jfeat',['Jewelry']).vocab.includes('crystals / rhinestones'));
const mixed=['Footwear','Jewelry','Tops'];assert(view('details',mixed,true).vocab.includes('zipper'));assert(!view('shoefeat',mixed,true).vocab.includes('zip'));assert(view('details',mixed,true).vocab.includes('rhinestones'));assert(!view('jfeat',mixed,true).vocab.includes('crystals / rhinestones'));
assert.equal(c.bulkPieceTagKey('shoefeat','zip',mixed),'details|zipper');assert.equal(c.bulkPieceTagKey('jfeat','crystals / rhinestones',mixed),'details|rhinestones');
assert(!c.SLEEVES.includes('strapless'));assert(!c.kindVocab('Footwear','Flats').includes('slip-on'));assert(c.PATTERNS.includes('animal')&&c.PATTERNS.includes('animal print'));assert.equal(dim('pattern').label,'Pattern / subject');
const patch=clone(c.pieceFieldPatch(shoe,next));assert.deepEqual(Object.keys(patch).sort(),['details','kind','shoefeat']);assert(!Object.hasOwn(patch,'wishlistRank'));
console.log('Piece fields: canonical shoe fastenings, slip-on, strapless, contextual rhinestones, mixed bulk add/remove keys, idempotency, nonmutation, and unrelated data preservation pass.');

vm.runInContext(source.slice(source.indexOf('function selectedPieceTagLabel('),source.indexOf('function tagField(')),c);
for(const d of c.DIMS){for(const value of d.vocab||[]){const label=c.selectedPieceTagLabel(d,value);assert.equal(label,d.key==='shoefeat'&&value==='mary jane'?'Mary Janes':label.toLowerCase(),d.key+': '+value)}}
assert.equal(c.selectedPieceTagLabel(dim('shoefeat'),'zip'),'zipper');assert.equal(dim('shoefeat').labels['mary jane'],'Mary Janes');assert.equal(c.selectedPieceTagLabel({key:'weight',labels:{thin:'Thin / Lightweight'}},'thin'),'thin / lightweight');
console.log('Selected tag labels: lowercase across the vocabulary and label overrides, with Mary Janes preserved.');
