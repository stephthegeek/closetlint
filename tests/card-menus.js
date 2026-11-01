// Test shared menu behavior and action dispatch using disposable records.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
let focused;const listeners={},events={},calls=[];
function node(tag,attrs={},...children){
 const n={tag,...attrs,children:[],style:{},isConnected:true,offsetWidth:220,offsetHeight:250,
  closest(selector){for(let n=this.parent;n;n=n.parent)if(n.tag===selector)return n;return null},removeEventListener(k,f){if(this.events?.[k]===f)delete this.events[k]},setAttribute(k,v){this[k]=v},addEventListener(k,f){(this.events||(this.events={}))[k]=f},
  appendChild(c){if(c.parent)c.parent.children=c.parent.children.filter(x=>x!==c);this.children.push(c);c.parent=this;return c},append(...cs){cs.flat(Infinity).filter(Boolean).forEach(c=>this.appendChild(c))},
  querySelectorAll(selector){return this.children.flatMap(c=>[(selector===c.tag?c:null),...(c.querySelectorAll?c.querySelectorAll(selector):[])].filter(Boolean))},querySelector(s){return this.querySelectorAll(s)[0]},
  contains(t){return t===this||this.children.some(c=>c.contains&&c.contains(t))},focus(){focused=this;document.activeElement=this},click(){return this.onclick({stopPropagation(){},currentTarget:this})},
  getBoundingClientRect(){return{left:350,top:700,bottom:744}},get textContent(){return this.text||''},set textContent(v){this.text=v;this.children=[]}};
 const classes=new Set((attrs.class||'').split(' '));n.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)};n.append(...children);return n;
}
const menu=node('div',{class:'hide'}),document={body:node('body'),activeElement:null,addEventListener:(k,f)=>listeners[k]=f};
const piece={id:'piece',name:'Test piece'},current={...piece,stored:true,donate:true,hidden:true};
const ctx={document,window:{innerWidth:390,innerHeight:844,addEventListener:(k,f)=>events[k]=f},el:node,$:()=>menu,ClosetLintIcons:{node:()=>node('svg')},closeAppMenu(){},closeAddMenu(){},byId:()=>({piece:current}),addPieceToCollection:p=>calls.push(['collection',p]),pieceAction:(p,patch)=>calls.push(['patch',patch]),openStoreDialog:ids=>calls.push(['store',ids]),setHidden:(p,v)=>calls.push(['hidden',v]),removeForGood:p=>calls.push(['delete',p])};
vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('var openX=null;'),html.indexOf('/* ---------- rename in place ---------- */')),ctx);
const trigger=ctx.xBtn(piece);trigger.click();assert.equal(trigger['aria-expanded'],'true');assert.equal(focused,menu.children[0]);assert.equal(calls.length,0,'opening does not mutate records');assert.equal(menu.style.left,'162px');assert.equal(menu.style.top,'444px','menu opens above a trigger near the viewport bottom');
assert(menu.children.some(b=>b.text==='📦 Bring back'));assert(menu.children.some(b=>b.text==='🎁 Keep (unflag)'),'actions use current values, not an old card snapshot');
const key=k=>ctx.cardMenuKey({key:k,target:document.activeElement,preventDefault(){}});
key('End');assert.equal(focused,menu.children.at(-1));key('ArrowDown');assert.equal(focused,menu.children[0]);key('ArrowUp');assert.equal(focused,menu.children.at(-1));key('Home');assert.equal(focused,menu.children[0]);key('Escape');assert.equal(focused,trigger);assert.equal(trigger['aria-expanded'],'false');assert(menu.classList.contains('hide'));
trigger.click();menu.children.find(b=>b.text==='📦 Bring back').click();assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))),['patch',{stored:false}]);assert(menu.classList.contains('hide'),'action closes the menu before continuing');
trigger.click();const other=ctx.cardMenuButton('Other',()=>[{label:'Inspect',action(){calls.push(['inspect'])}}]);other.click();assert.equal(trigger['aria-expanded'],'false');assert.equal(other['aria-expanded'],'true');assert.equal(menu.children.length,1,'opening another card replaces its menu');
key('Tab');assert.equal(focused,other);assert(menu.classList.contains('hide'));other.click();listeners.click({target:{closest:()=>null}});assert.equal(other['aria-expanded'],'false');
other.click();events.hashchange();assert(menu.classList.contains('hide'));other.click();events.resize();assert(menu.classList.contains('hide'));
console.log('Card menus: fresh values, no writes on open, viewport placement, one open menu, action dispatch, keyboard cycling, dismissal, and focus return pass.');

// Native modal dialogs make body-level menus inert: the shared menu must join
// the dialog while open, then return before that dialog's content is replaced.
const modal=node('dialog'),inModal=ctx.cardMenuButton('Calendar piece',()=>[{label:'Open',action(){calls.push(['modal-open'])}},{label:'Remove this day',danger:true,action(){calls.push(['remove-date'])}}]);
modal.appendChild(inModal);inModal.click();assert.equal(menu.parent,modal);assert.equal(focused,menu.children[0]);
key('Escape');assert.equal(menu.parent,document.body);assert.equal(focused,inModal);
inModal.click();menu.children[1].click();assert.equal(menu.parent,document.body);assert.deepEqual(calls.at(-1),['remove-date']);
inModal.click();modal.events.close();assert.equal(menu.parent,document.body);assert.equal(inModal['aria-expanded'],'false');
trigger.click();assert.equal(menu.parent,document.body,'browse menu still works after closing a modal');ctx.closeXMenu();
console.log('Dialog menus: top-layer hosting, Escape focus, action dispatch, dialog-close cleanup, and later browse reuse pass.');
