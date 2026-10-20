// Exercise the actual normalizer against static markup and later label replacements.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
class N{
  constructor(tag='',data=''){this.nodeType=tag?1:3;this.tagName=tag.toUpperCase();this.data=data;this.children=[];this.className='';this.parentElement=null;this.classList={toggle:(c,on)=>{const set=new Set(this.className.split(' ').filter(Boolean));on?set.add(c):set.delete(c);this.className=[...set].join(' ')}};}
  appendChild(n){if(n.nodeType===11){[...n.children].forEach(x=>this.appendChild(x));return n}n.parentElement=this;this.children.push(n);return n}
  get textContent(){return this.nodeType===3?this.data:this.children.map(n=>n.textContent).join('')}
  set textContent(s){this.children=[];if(s)this.appendChild(new N('',s))}
  matches(selector){return selector.split(',').some(s=>{s=s.trim();if(s.startsWith('.'))return this.className.split(' ').includes(s.split(' ').at(-1).slice(1));return this.tagName===s.toUpperCase()})}
  closest(s){for(let n=this;n;n=n.parentElement)if(n.matches(s))return n;return null}
  querySelectorAll(s){return this.children.flatMap(n=>n.nodeType===1?[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]:[])}
  replaceWith(fragment){const parent=this.parentElement,index=parent.children.indexOf(this),nodes=fragment.nodeType===11?fragment.children:[fragment];parent.children.splice(index,1,...nodes);nodes.forEach(n=>n.parentElement=parent)}
}
const body=new N('body'),make=(tag,text)=>{const n=new N(tag);n.textContent=text;return n};
const save=make('button','💾');const label=make('span',' Save');label.className='bl';save.appendChild(label);body.appendChild(save);
const pencil=make('button','✏️');body.appendChild(pencil);
const scientist=make('button','🧑‍🔬 Lab');body.appendChild(scientist);
const heading=make('h2','🧚 Trip fairy');body.appendChild(heading);
let notify;
const document={body,createElement:tag=>new N(tag),createDocumentFragment:()=>Object.assign(new N(),{nodeType:11}),createTreeWalker(root){const texts=[];function walk(n){n.children.forEach(c=>c.nodeType===3?texts.push(c):walk(c))}walk(root);let i=0;return{nextNode:()=>texts[i++]||null}}};
const ctx={document,Intl,NodeFilter:{SHOW_TEXT:4},MutationObserver:class{constructor(cb){notify=cb}observe(){}}};
vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function buttonText('),source.indexOf('function el(tag,attrs)')),ctx);
ctx.initControlEmojis();
assert.equal(save.textContent,'💾 Save');assert.equal(save.querySelectorAll('.button-emoji').length,1);assert.ok(!save.className.includes('icon-only'));
assert.equal(pencil.textContent,'✏️');assert.ok(pencil.className.includes('icon-only'));
assert.equal(scientist.querySelectorAll('.button-emoji').length,1,'scientist ZWJ remains one glyph');assert.equal(scientist.textContent,'🧑‍🔬 Lab');
assert.equal(heading.querySelectorAll('.button-emoji').length,1);
save.textContent='🎨 Style';notify([{type:'childList',target:save,addedNodes:[...save.children]}]);
assert.equal(save.textContent,'🎨 Style');assert.equal(save.querySelectorAll('.button-emoji').length,1,'a later raw label update is normalized too');
notify([{type:'childList',target:save,addedNodes:[...save.children]}]);assert.equal(save.querySelectorAll('.button-emoji').length,1,'normalization is idempotent');
const later=make('button','📚 Save as collection');body.appendChild(later);notify([{type:'childList',target:body,addedNodes:[later]}]);assert.equal(later.querySelectorAll('.button-emoji').length,1);assert.equal(later.textContent,'📚 Save as collection');
console.log('Control emojis: static and later controls, updated labels, ZWJ glyphs, standalone actions and idempotence pass.');
