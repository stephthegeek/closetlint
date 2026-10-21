const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../app/closet-lint.html'), 'utf8');
const block = source.slice(source.indexOf('function labBlock(o){'), source.indexOf('function labBlocksBox(v){'));
const dress = {id: 'dress', name: 'Dress'};
const shoes = {id: 'shoes', name: 'Shoes'};
const hat = {id: 'hat', name: 'Hat'};
const writes = [];
const dialog = {open: false, children: [], appendChild(child){this.children.push(child)}, showModal(){this.open = true}};
const state = {
  blocks: {}, ratings: {}, lab: {seen: {}, cur: {}},
  db: {collection(name){return {doc(id){return {set(value){writes.push({name, id, value}); return Promise.resolve()}, delete(){return Promise.resolve()}}}}}}
};
const context = {
  state, Date, needDb: () => false, labParts: () => [dress], labAccParts: () => [shoes],
  labKey: (a, b) => [a.id, b.id].sort().join('+'), labPush: () => {},
  labRender: () => {}, toast: () => {}, $: () => dialog,
  closeDlg: () => {dialog.open = false}, addClose: () => {},
  el(tag, attrs, ...children){return {tag, attrs, children, appendChild(child){this.children.push(child)}}}
};
vm.createContext(context);
vm.runInContext(block, context);
context.labBlock({sig: 'dress', acc: {shoes}});
assert.equal(state.blocks['dress+shoes'].a, 'dress');
assert.equal(state.blocks['dress+shoes'].b, 'shoes');
assert.equal(dialog.open, false, 'two visible pieces can be marked without an empty picker');

context.labAccParts = () => [shoes, hat];
context.labBlock({sig: 'dress2', acc: {shoes, hat}});
assert.equal(dialog.open, true);
assert.equal(dialog.children[0].children.length, 4, 'three visible pieces offer all three pairs');
assert.equal(writes.some(write => write.name === 'blocks' && write.id === 'dress+shoes'), true);
console.log('Lab incompatible pairs include shoes and accessories, with no empty picker.');

// Positive taste summaries precede negative summaries and blocked pairs, even
// before enough ratings exist for a summary.
const taste=source.slice(source.indexOf('function labTasteView(v){'),source.indexOf('function labPickAnchor(){'));
Object.assign(context,{labNRated:()=>8,labStats:()=>({love:{n:3,s:3},pass:{n:3,s:-3}}),labFeatName:f=>f,byId:()=>({dress}),labTile:p=>({piece:p.id}),labBlocksBox:v=>v.appendChild({blockedPairs:true})});
state.ratings={first:{r:1,ids:['dress']},second:{r:1,ids:['dress']}};
vm.runInContext(taste,context);
function view(){return {children:[],appendChild(child){this.children.push(child)}}}
let panel=view();context.labTasteView(panel);
assert.equal(panel.children[0].children[0].attrs.text,'You tend to love');
assert.equal(panel.children[1].children[0].attrs.text,'Pieces in your most loved outfits');
assert.equal(panel.children[2].children[0].attrs.text,'You tend to pass on');
assert.equal(panel.children[3].blockedPairs,true);
context.labNRated=()=>2;panel=view();context.labTasteView(panel);
assert.match(panel.children[0].attrs.text,/Rate a few more/);assert.equal(panel.children[1].blockedPairs,true,'blocked pairs remain accessible before eight ratings');
console.log('My Taste puts positive sections first and blocked pairs last.');
