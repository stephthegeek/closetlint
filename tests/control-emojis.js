// Exercise the actual normalizer against static markup and later label replacements.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
class N{
  constructor(tag='',data=''){this.nodeType=tag?1:3;this.tagName=tag.toUpperCase();this.data=data;this.children=[];this.className='';this.attrs={};this.parentElement=null;this.classList={add(...names){names.forEach(n=>this.toggle(n,true))},remove(...names){names.forEach(n=>this.toggle(n,false))},toggle:(c,on)=>{const set=new Set(this.className.split(' ').filter(Boolean));on?set.add(c):set.delete(c);this.className=[...set].join(' ')}};}
  appendChild(n){if(n.nodeType===11){[...n.children].forEach(x=>this.appendChild(x));return n}n.parentElement=this;this.children.push(n);return n}
  get textContent(){return this.nodeType===3?this.data:this.children.map(n=>n.textContent).join('')}
  set textContent(s){this.children=[];if(s)this.appendChild(new N('',s))}
  matches(selector){return selector.split(',').some(s=>{s=s.trim();if(s.startsWith('[')){const m=s.match(/^\[([^=]+)(?:="([^"]*)")?\]$/);return !!m&&m[1] in this.attrs&&(m[2]===undefined||this.attrs[m[1]]===m[2])}if(s.startsWith('.'))return this.className.split(' ').includes(s.split(' ').at(-1).slice(1));return this.tagName===s.toUpperCase()})}
  getAttribute(k){return this.attrs[k]??null}
  setAttribute(k,v){this.attrs[k]=String(v)}
  querySelector(s){return this.querySelectorAll(s)[0]||null}
  closest(s){for(let n=this;n;n=n.parentElement)if(n.matches(s))return n;return null}
  querySelectorAll(s){return this.children.flatMap(n=>n.nodeType===1?[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]:[])}
  replaceWith(fragment){const parent=this.parentElement,index=parent.children.indexOf(this),nodes=fragment.nodeType===11?fragment.children:[fragment];parent.children.splice(index,1,...nodes);nodes.forEach(n=>n.parentElement=parent)}
}
const body=new N('body'),make=(tag,text)=>{const n=new N(tag);n.textContent=text;return n};
const save=make('button','💾');const label=make('span',' Save');label.className='bl';save.appendChild(label);body.appendChild(save);
const pencil=make('button','✏️');pencil.id='editbtn';body.appendChild(pencil);
const scientist=make('button','🧑‍🔬 Lab');body.appendChild(scientist);
const heading=make('h2','🧚 Trip fairy');body.appendChild(heading);
let notify;
const document={body,documentElement:new N('html'),createElement:tag=>new N(tag),createElementNS:(ns,tag)=>new N(tag),createDocumentFragment:()=>Object.assign(new N(),{nodeType:11}),createTreeWalker(root){const texts=[];function walk(n){n.children.forEach(c=>c.nodeType===3?texts.push(c):walk(c))}walk(root);let i=0;return{nextNode:()=>texts[i++]||null}}};
const ctx={document,Intl,NodeFilter:{SHOW_TEXT:4},MutationObserver:class{constructor(cb){notify=cb}observe(){}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/control-icons.js','utf8'),ctx);vm.runInContext(source.slice(source.indexOf('function buttonText('),source.indexOf('function el(tag,attrs)')),ctx);
const nativeSettings=make('button','Settings'),nativeGear=make('span','⚙️');nativeGear.setAttribute('data-native-emoji','true');nativeSettings.appendChild(nativeGear);body.appendChild(nativeSettings);
ctx.initControlEmojis();
assert.equal(nativeGear.textContent,'⚙️');assert.equal(nativeSettings.querySelectorAll('.control-svg').length,0,'explicit native emoji survive utility normalization');
assert.equal(save.textContent,'💾 Save');assert.equal(save.querySelectorAll('.button-emoji').length,1);assert.ok(!save.className.includes('icon-only'));
assert.equal(pencil.querySelector('[data-utility-icon]').getAttribute('data-utility-icon'),'edit');assert.equal(pencil.textContent,'');assert.ok(pencil.className.includes('icon-only'));
assert.equal(scientist.querySelectorAll('.button-emoji').length,1,'scientist ZWJ remains one glyph');assert.equal(scientist.textContent,'🧑‍🔬 Lab');
assert.equal(heading.querySelectorAll('.button-emoji').length,1);
save.textContent='🎨 Style';notify([{type:'childList',target:save,addedNodes:[...save.children]}]);
assert.equal(save.textContent,' Style');assert.equal(save.querySelector('[data-utility-icon]').getAttribute('data-utility-icon'),'palette','a later raw label update uses the shared SVG utility');
notify([{type:'childList',target:save,addedNodes:[...save.children]}]);assert.equal(save.querySelectorAll('.control-svg').length,1,'normalization is idempotent');
const later=make('button','📚 Save as collection');body.appendChild(later);notify([{type:'childList',target:body,addedNodes:[later]}]);assert.equal(later.querySelectorAll('.button-emoji').length,1);assert.equal(later.textContent,'📚 Save as collection');
const flip=make('button','↔︎ Flip');body.appendChild(flip);notify([{type:'childList',target:body,addedNodes:[flip]}]);assert.equal(flip.textContent,' Flip');assert.equal(flip.querySelector('[data-utility-icon]').getAttribute('data-utility-icon'),'flip-x','utility arrows use the shared SVG geometry');notify([{type:'childList',target:flip,addedNodes:[...flip.children]}]);assert.equal(flip.querySelectorAll('.control-svg').length,1,'SVG normalization is idempotent');
console.log('Control emojis: static and later controls, updated labels, ZWJ glyphs, standalone actions and idempotence pass.');

const exported=make('button','🖼️ Export image');body.appendChild(exported);notify([{type:'childList',target:body,addedNodes:[exported]}]);
assert.equal(exported.querySelectorAll('.image-export-icon').length,1,'image exports use one shared icon wrapper');assert.equal(exported.querySelectorAll('.button-emoji').length,1,'native picture remains available');assert.equal(exported.querySelectorAll('.control-svg').length,1,'outline picture is retained as a text-only fallback');
notify([{type:'childList',target:exported,addedNodes:[...exported.children]}]);assert.equal(exported.querySelectorAll('.image-export-icon').length,1,'export normalization is idempotent');assert.equal(exported.querySelectorAll('.button-emoji').length,1);
console.log('Image export controls retain one picture emoji and one shared outline fallback across normalization.');

const themed=make('span','🎨 Color me curious');themed.setAttribute('data-ui-emoji','true');body.appendChild(themed);notify([{type:'childList',target:body,addedNodes:[themed]}]);
assert.equal(themed.textContent,'🎨 Color me curious');assert.equal(themed.querySelectorAll('.control-svg').length,0,'themed decorative palette stays an emoji');assert.equal(themed.querySelectorAll('.button-emoji').length,1);
const user=make('h3','🌈 My own collection');user.setAttribute('data-user-content','true');body.appendChild(user);notify([{type:'childList',target:body,addedNodes:[user]}]);assert.equal(user.querySelectorAll('.button-emoji').length,0,'user text remains untouched');
const mixed=make('button','');const ui=make('span','🧳');ui.setAttribute('data-ui-emoji','true');const name=make('span','🌈 My trip');name.setAttribute('data-user-content','true');mixed.appendChild(ui);mixed.appendChild(name);body.appendChild(mixed);notify([{type:'childList',target:body,addedNodes:[mixed]}]);assert.equal(ui.querySelectorAll('.button-emoji').length,1);assert.equal(name.querySelectorAll('.button-emoji').length,0,'only the app prefix is themed inside mixed content');
const pack=make('span','👚 👟 💍');pack.setAttribute('data-native-emoji','true');mixed.appendChild(pack);notify([{type:'childList',target:mixed,addedNodes:[pack]}]);assert.equal(pack.querySelectorAll('.button-emoji').length,0,'pack preview keeps native color');
console.log('Emoji ownership: decorative glyphs preserve identity; user text and native-color previews stay untouched.');

const settings=make('button',' Settings'),gear=make('span','⚙️');gear.setAttribute('data-ui-emoji','true');settings.appendChild(gear);body.appendChild(settings);notify([{type:'childList',target:body,addedNodes:[settings]}]);notify([{type:'childList',target:gear,addedNodes:[...gear.children]}]);assert.equal(gear.textContent,'⚙️');assert.equal(gear.querySelectorAll('.control-svg').length,0,'later utility pass must not convert the standard decorative gear');assert.equal(gear.querySelectorAll('.button-emoji').length,1);
console.log('Settings decorative gear remains a standard emoji through repeated utility passes.');
