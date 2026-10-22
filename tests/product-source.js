const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
const ctx={URL,allItems:()=>[{source:'Temu'},{source:'Local Market'}]};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function normalizeStore('),source.indexOf('function itemForm(')),ctx);
assert.equal(ctx.normalizeStore('  TEMU '),'Temu');assert.equal(ctx.normalizeStore('  Local   Market '),'Local Market');assert.equal(ctx.normalizeStore('New Shop'),'New Shop');assert.equal(ctx.productURL('javascript:alert(1)'), '');assert.equal(ctx.productURL('file:///private'), '');assert.equal(ctx.productURL('https://example.com/item'),'https://example.com/item');
console.log('Store normalization and product-link schemes passed.');
// A renamed piece must still search for its imported listing title.
ctx.el=(tag,attrs,...children)=>({tag,attrs,children});
vm.runInContext(source.slice(source.indexOf('function findRow('),source.indexOf('/* ---------- hover X menu')),ctx);
function searchQuery(piece){return new URL(ctx.findRow(piece).children[0].attrs.href).searchParams.get('q')}
assert.equal(searchQuery({title:'Original & detailed listing',name:'My short nickname'}),'Original & detailed listing');
assert.equal(searchQuery({title:'  ',name:'Offline cardigan'}),'Offline cardigan');
console.log('Original-title search preserves the listing title after a piece is renamed.');
