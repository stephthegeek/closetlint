const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const a=html.indexOf('function '+name+'('),line=html.indexOf('\n',a);return html.slice(a,html.slice(a,line).endsWith('}')?line:html.indexOf('\n}',a)+2)}
class Node{constructor(tag,attrs={},children=[]){Object.assign(this,{tag,attrs:{...attrs},children,classes:new Set((attrs.class||'').split(' '))},attrs);this.classList={add:(...c)=>c.forEach(x=>this.classes.add(x)),remove:(...c)=>c.forEach(x=>this.classes.delete(x))}}setAttribute(k,v){this.attrs[k]=v}appendChild(n){this.children.push(n);return n}}
const ctx={window:{ClosetLintLocal:{thumbnails:true}},el:(tag,attrs,...children)=>new Node(tag,attrs,children)};vm.createContext(ctx);vm.runInContext(fn('photoThumbnail')+'\n'+fn('wrPhoto'),ctx);
const item={name:'Synthetic top',photo:'/_blob/'+'a'.repeat(32)};
const list=ctx.wrPhoto(item,false),image=list.children[0],status=list.children[1];assert.equal(image.src,'/_thumb/'+'a'.repeat(32));assert.equal(image.loading,'lazy');assert.equal(image.fetchpriority,'auto');assert.equal(status.text,'Loading photo…');assert.equal(list.attrs['aria-busy'],'true');image.onload();assert.equal(status.hidden,true);assert.equal(list.attrs['aria-busy'],'false');
const battle=ctx.wrPhoto(item,true),hero=battle.children[0],message=battle.children[1];assert.equal(hero.loading,'eager');assert.equal(hero.fetchpriority,'high');assert.equal(message.attrs.role,'status');hero.onerror();assert(battle.classes.has('failed'));assert.equal(message.hidden,false);assert.match(message.textContent,/could not load/);hero.onload();assert(!battle.classes.has('failed'));assert.equal(message.hidden,true);
console.log('Wishlist photos: preview URLs, lazy ranking images, high-priority comparisons, loading/error states, and completion recovery pass.');

// Detail controls nested inside a pick card must not submit an accidental preference.
let picks=[],opened=[];
Object.assign(ctx,{wrNote:()=>'',wrChips:()=>[],catLabel:()=> 'Top',wrPick:r=>picks.push(r),openEdit:x=>opened.push(x)});
vm.runInContext(fn('wrCard'),ctx);
const card=ctx.wrCard({...item,id:'a'},1),info=card.children.at(-1);
const event=target=>({key:'Enter',target,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}});
card.onkeydown.call(card,event(info));assert.equal(picks.length,0,'Enter on Open details must not rate the comparison');
card.onkeydown.call(card,{...event(info),key:' '});assert.equal(picks.length,0,'Space on Open details must not rate the comparison');
info.onclick(event(info));assert.equal(opened.length,1);
card.onkeydown.call(card,event(card));assert.deepEqual(picks,[1],'card itself remains keyboard-selectable');
// Incoming data refreshes evidence without replacing a valid displayed pair.
let current={mode:'battle',cur:{a:{id:'a',name:'Old'},b:{id:'b'}},hist:[],battles:0},fresh=[{id:'a',name:'Updated'},{id:'b',name:'Other'}],drawn=[],pairs=0,renders=0;
Object.assign(ctx,{wrState:()=>current,wrPassed:()=>false,wrCard:x=>{drawn.push(x);return new Node('card')},wrPair:xs=>{pairs++;return {a:xs[0],b:xs[1]}},wrUndo(){},wrSkip(){},wrRender:()=>{renders++;ctx.wrBattle(new Node('div'),fresh)}});
vm.runInContext(fn('wrBattle')+'\n'+fn('wrData'),ctx);
ctx.wrData();assert.equal(renders,1);assert.equal(pairs,0,'data changes retain the comparison IDs');assert.equal(drawn[0],fresh[0],'updated piece details replace stale references');assert.equal(drawn[1],fresh[1]);
current._drag=true;ctx.wrData();assert.equal(renders,1,'incoming data does not interrupt drag reordering');current._drag=false;
fresh=[{id:'c'},{id:'d'}];ctx.wrData();assert.equal(pairs,1,'a removed pair member is replaced through the existing selection path');
console.log('Wishlist comparisons: keyboard details do not rate, data refresh retains valid pair IDs and uses current records, and unavailable pairs are replaced.');
