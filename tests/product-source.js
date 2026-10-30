const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
const ctx={URL,allItems:()=>[{source:'Temu'},{source:'Local Market'}]};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function normalizeStore('),source.indexOf('function itemForm(')),ctx);
assert.equal(ctx.normalizeStore('  TEMU '),'Temu');assert.equal(ctx.normalizeStore('  Local   Market '),'Local Market');assert.equal(ctx.normalizeStore('New Shop'),'New Shop');assert.equal(ctx.productURL('javascript:alert(1)'), '');assert.equal(ctx.productURL('file:///private'), '');assert.equal(ctx.productURL('https://example.com/item'),'https://example.com/item');
console.log('Store normalization and product-link schemes passed.');
// A renamed piece must still search for its imported listing title.
ctx.el=(tag,attrs,...children)=>({tag,attrs,children});
vm.runInContext(source.slice(source.indexOf('function findRow('),source.indexOf('\n}',source.indexOf('function findRow('))+2),ctx);
function searchQuery(piece){return new URL(ctx.findRow(piece).children[0].attrs.href).searchParams.get('q')}
assert.equal(searchQuery({title:'Original & detailed listing',name:'My short nickname'}),'Original & detailed listing');
assert.equal(searchQuery({title:'  ',name:'Offline cardigan'}),'Offline cardigan');
console.log('Original-title search preserves the listing title after a piece is renamed.');

// Store suggestions remain usable with a populated field and arbitrary new names.
class Field {
 constructor(tag,attrs={},...children){Object.assign(this,attrs);this.tag=tag;this.children=children.filter(Boolean);this.events={};this.value=attrs.value||'';this.classList={toggle(){}}}
 appendChild(n){this.children.push(n)} set textContent(v){this.children=[];this.text=v} get textContent(){return this.text||''}
 setAttribute(k,v){this[k]=v} removeAttribute(k){delete this[k]} addEventListener(k,f){this.events[k]=f}
 dispatchEvent(e){this.events[e.type]?.(e)} focus(){if(activeField===this)return;activeField=this;this.events.focus?.()}
 scrollIntoView(){} contains(n){return this===n||this.children.some(c=>c.contains?.(n))}
}
let activeField;
const stores={allItems:()=>[{source:'  Local   Market '},{source:'local market'},{source:'Temu'},{source:''},{source:'constructor'}],el:(...args)=>new Field(...args),Event:class{constructor(type){this.type=type}}};
vm.createContext(stores);vm.runInContext(source.slice(source.indexOf('function storeOptions('),source.indexOf('function itemForm(')),stores);
assert.deepEqual(Array.from(stores.storeOptions()),['constructor','Local Market','Temu']);
const picker=stores.storePicker('Temu'),input=picker.input,toggle=picker.node.children[0].children[1],list=picker.node.children[1];
input.focus();assert.equal(list.children.length,3,'focus shows previous sources even when a value is filled');
input.value='market';input.events.input();assert.equal(list.children.length,1);
const key=k=>({key:k,preventDefault(){},stopPropagation(){}});input.events.keydown(key('ArrowDown'));input.events.keydown(key('Enter'));assert.equal(input.value,'Local Market');assert.equal(list.hidden,true);
toggle.events.click();assert.equal(list.children.length,3,'arrow explicitly opens all sources');list.children[2].onclick();assert.equal(input.value,'Temu');assert.equal(list.hidden,true);
input.value='New independent shop';input.events.input();assert.equal(input.value,'New independent shop');assert.equal(list.children[0].role,'status');input.events.keydown(key('Escape'));assert.equal(list.hidden,true);
stores.allItems=()=>[];const fresh=stores.storePicker('');assert.equal(fresh.node.children[0].children[1].hidden,true,'no dead arrow when no sources exist');
console.log('Store picker: normalized suggestions, filled-field opening, filtering, keyboard/pointer choice, new sources, and empty-source state pass.');

vm.runInContext(source.slice(source.indexOf('function pieceManagementActions('),source.indexOf('function openEdit(')),ctx);
function buttons(n){return (n.tag==='button'?[n]:[]).concat((n.children||[]).filter(x=>typeof x==='object').flatMap(buttons))}
const actions=[];Object.assign(ctx,{openStoreDialog:ids=>actions.push(['store',...ids]),pieceAction:(it,patch)=>{actions.push(['patch',it.id,patch]);return Promise.resolve(true)},closeDlg(){},setHidden:(it,v)=>actions.push(['hide',it.id,v]),removeForGood:it=>actions.push(['delete',it.id])});
for(const meta of ['Tops','Bottoms','Outerwear','Underwear','Jewelry','Footwear','Glasses','Bags','Hats','Other accessories']){
 const piece={id:meta,meta},controls=buttons(ctx.pieceManagementActions(piece));assert.deepEqual(controls.map(b=>b.attrs.text),['📦 To storage','🎁 Donate?','🙈 Hide','🗑️ Delete']);controls[0].attrs.onclick();controls[3].attrs.onclick();
 const stored=buttons(ctx.pieceManagementActions({...piece,stored:true,hidden:true,donate:true}));assert.deepEqual(stored.map(b=>b.attrs.text),['📦 Bring back','Keep (unflag)','🙉 Unhide','🗑️ Delete']);stored[0].attrs.onclick();
}
assert.equal(actions.filter(a=>a[0]==='store').length,10);assert.equal(actions.filter(a=>a[0]==='delete').length,10);assert.equal(actions.filter(a=>a[0]==='patch'&&a[2].stored===false).length,10);
console.log('Piece management: consistent storage, return, donation, visibility, and Delete commands across clothing, jewelry, and accessory categories.');
