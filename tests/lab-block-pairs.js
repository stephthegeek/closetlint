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

(async()=>{
 class Node{
  constructor(tag,attrs,...children){this.tag=tag;Object.assign(this,attrs||{});this.children=[];this.append(...children)}
  set textContent(v){this.text=v;this.children=[]}get textContent(){return this.text||''}
  append(...children){this.children.push(...children.flat(Infinity).filter(x=>x!=null))}appendChild(child){this.children.push(child);return child}
  focus(options){this.focused=options}
 }
 const all=(node,p)=>[...(p(node)?[node]:[]),...(node.children||[]).filter(x=>typeof x==='object').flatMap(x=>all(x,p))];
 const byText=(node,text)=>all(node,n=>n.tag==='button'&&n.text===text)[0];
 const el=(...args)=>new Node(...args),map={dress:{id:'dress',name:'Dress'},shoes:{id:'shoes',name:'Shoes'},wish:{id:'wish',name:'Wish dress',wish:true}},board={pieces:[{id:'keep-board'}]};
 let fail=false,tiles=0;const notices=[];
 const state={lab:{},fantasy:false,board,blocks:Object.fromEntries(Array.from({length:250},(_,i)=>['pair'+i,{a:'dress',b:'shoes'}])),ratings:Object.fromEntries(Array.from({length:120},(_,i)=>['love'+i,{r:1,t:i,ids:['dress']}]))};
 state.blocks.missing={a:'missing',b:'shoes'};state.ratings.wish={r:1,ids:['wish']};state.ratings.missing={r:1,ids:['missing']};
 state.db={collection:()=>({doc:()=>({delete:async()=>{if(fail)throw Error('Synthetic delete failure')}})})};
 const c={state,window:{scrollY:640,scrollTo(x,y){this.scrollY=y}},byId:()=>map,el,toast:msg=>notices.push(msg),ltTitle:()=> 'Synthetic outfit',labOutfitFromIds:ids=>map[ids[0]]?{parts:[map[ids[0]]]}:null,labAccRestore(){},labParts:o=>o.parts,labAccParts:()=>[map.shoes],labTile:p=>{tiles++;return el('img',{piece:p.id})}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function labBlocksBox(v){'),source.indexOf('function labFeatName(')),c);
 const pairs=el('section');c.labBlocksBox(pairs);assert.equal(all(pairs,n=>n.class==='tasterow').length,20,'hundreds of pairs initially mount only 20 rows');assert(all(pairs,n=>n.text==='Showing 20 of 250 pairs').length);
 byText(pairs,'Show 20 more').onclick();assert.equal(all(pairs,n=>n.class==='tasterow').length,40);assert.equal(state.lab.blockLimit,40);
 await byText(pairs,'Allow again').onclick();assert.equal(all(pairs,n=>n.class==='tasterow').length,40,'allowing a pair fills the visible batch without resetting it');assert.equal(state.blocks.pair0,undefined);assert.equal(c.window.scrollY,640);assert(all(pairs,n=>n.text==='Showing 40 of 249 pairs').length);assert(all(pairs,n=>n.focused?.preventScroll).length);
 fail=true;await byText(pairs,'Allow again').onclick();assert(state.blocks.pair1);assert.equal(byText(pairs,'Allow again').disabled,false,'failed removal remains retryable');fail=false;
 const favorites=el('section');c.labFavs(favorites);assert.equal(all(favorites,n=>n.class==='favrow').length,20);assert.equal(tiles,40,'initial favorites photo rendering is bounded');assert(all(favorites,n=>n.text==='Showing 20 of 120 loved outfits').length,'missing and fantasy-only outfits are excluded from totals');
 byText(favorites,'Show 20 more').onclick();assert.equal(all(favorites,n=>n.class==='favrow').length,40);assert.equal(state.lab.favLimit,40);
 await byText(favorites,'Remove rating').onclick();assert.equal(all(favorites,n=>n.class==='favrow').length,40);assert(all(favorites,n=>n.text==='Showing 40 of 119 loved outfits').length);assert.equal(c.window.scrollY,640);assert.equal(state.board,board);
 assert(notices.some(x=>/Could not allow/.test(x)));
 console.log('Lab lists: 20-entry batches, valid totals, Show more, stable removal position/focus, retry safety, and board preservation pass.');
})().catch(error=>{console.error(error);process.exit(1)});
