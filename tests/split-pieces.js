const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
const code=html.slice(html.indexOf('function splitPackCount('),html.indexOf('function photoRow('));
class Node{
 constructor(tag,a={},...children){this.tag=tag;Object.assign(this,a||{});this.children=children.filter(Boolean);this.events={}}
 setAttribute(k,v){this[k]=v}appendChild(n){this.children.push(n);return n}set textContent(v){this.text=v;this.children=[]}get textContent(){return this.text||''}addEventListener(k,f){this.events[k]=f}showModal(){this.open=true}close(){this.open=false;this.events.close?.()}remove(){this.removed=true}
}
function all(n){return [n,...(n.children||[]).filter(x=>typeof x==='object').flatMap(all)]}
const values={},writes=[],records={},removed=[],handoffs=[];let dialog,fail=true,failRetire=false;
const c={window:{ClosetLintRuntime:{},ClosetLintLocal:{instance:'test'}},localStorage:{getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v,removeItem:k=>delete values[k]},document:{body:{appendChild:d=>dialog=d}},el:(...args)=>new Node(...args),needDb:()=>false,COLORS:{black:'#000',blue:'#00f'},colLabel:x=>x,PHOTOS:{},DIMS:[{key:'pattern',multi:true}],splitAutoTags:()=>({}),addClose(){},toast(){},photoPreparationSplitDone:(ids,choice,notes)=>handoffs.push({ids:Array.from(ids),choice,notes}),state:{assets:{},edits:{},db:{collection:col=>({doc:key=>({set:async value=>{writes.push({col,key,value:JSON.parse(JSON.stringify(value))});if(fail&&col==='custom'){fail=false;throw Error('Synthetic offline')}records[col+'/'+key]=value},delete:async()=>{if(failRetire){failRetire=false;throw Error('Synthetic retirement failure')}removed.push(key)}})})}}};
vm.createContext(c);vm.runInContext(code,c);
for(const [name,n] of [['5pcs ribbed tees',5],['12-piece bracelet pack',12],['Pack of 10 hair clips',10],['3-pack socks',3],['5 pairs of socks',5],['4 colors in one top',null],['2pcs earrings',null],['1 pair of gloves',null],['1.5pcs item',null],['60pcs hair ties',null]])assert.equal(c.splitPackCount({name}).count,n,name);
assert.equal(c.splitPackCount({name:'5pcs tees',title:'3-pack tees'}).count,null,'conflicting listing counts stay uncertain');assert.equal(c.splitPackCount({name:'5pcs tees',variantOf:'parent'}).count,null,'split variants do not offer the pack split again');
assert.equal(c.splitPackCount({name:'Tee',colors:['black','blue']}).count,null,'colors never supply the count');
const pack={id:'c-pack',customId:'pack',name:'5pcs ribbed tees',title:'5pcs ribbed tees',meta:'Tops',colors:['black','blue'],wish:true,care:{wash:'Gentle'},photos:[{photoId:'source'}],photoId:'source'};
const next=()=>new Promise(setImmediate);
(async()=>{
 c.openSplit(pack);assert.equal(all(dialog).filter(n=>n.class==='split-variant').length,5);assert.equal(removed.length,0,'opening review creates/deletes nothing');
 assert.equal(all(dialog).find(n=>n['aria-label']==='Color for piece 1').value,'','different colors are not distributed by guess');
 const name=all(dialog).find(n=>n['aria-label']==='Name detail for piece 1');name.value='Black striped';name.events.input();
 const count=all(dialog).find(n=>n['aria-label']==='How many pieces');count.value='3';count.events.input();assert.equal(all(dialog).find(n=>n['aria-label']==='Name detail for piece 1').value,'Black striped','count edits retain name details');count.value='5';count.events.input();
 const crop=all(dialog).find(n=>n.type==='radio'&&n.value==='crop');crop.events.change();
 await all(dialog).find(n=>n.text==='Split into 5 pieces').onclick();await next();assert.equal(removed.length,0,'a partial create failure never retires the original');assert.match(all(dialog).find(n=>n.role==='status').text,/Retry/);
 const recoveryKey=Object.keys(values)[0],legacy=JSON.parse(values[recoveryKey]);legacy.batch.forEach((row,i)=>row.note='Numbered pack item '+(i+1)+' of 5. Select in left-to-right order.');values[recoveryKey]=JSON.stringify(legacy);
 const firstIds=writes.map(w=>w.key);all(dialog).find(n=>n.text==='Cancel').onclick();c.openSplit(pack);assert(all(dialog).some(n=>n.text==='Retry split'),'closing and reopening resumes the same split');
 failRetire=true;await all(dialog).find(n=>n.text==='Retry split').onclick();await next();assert.equal(removed.length,0,'failure retiring the original leaves it available');assert(Object.keys(values).length,'recovery remains until original retirement succeeds');
 all(dialog).find(n=>n.text==='Cancel').onclick();c.openSplit(pack);await all(dialog).find(n=>n.text==='Retry split').onclick();await next();assert.deepEqual(writes.slice(5,10).map(w=>w.key),firstIds,'first retry keeps piece IDs');assert.deepEqual(writes.slice(10).map(w=>w.key),firstIds,'retry after retirement failure never duplicates pieces');assert.deepEqual(removed,['pack']);assert.equal(handoffs[0].ids.length,5);assert.equal(handoffs[0].choice,'crop');assert.equal(handoffs[0].notes[handoffs[0].ids[0]],'Black striped');assert(!Object.values(handoffs[0].notes).some(note=>/Numbered pack item/.test(note)),'recovered splits discard obsolete position hints');assert.equal(Object.keys(values).length,0,'successful split clears recovery');
 const saved=Object.values(records);assert(saved.every(p=>p.wish&&p.care.wash==='Gentle'&&p.photos[0].photoId==='source'),'ownership, care, and source photos preserved');assert(saved.some(p=>p.name.includes('Black striped')));assert(saved.every(p=>p.variantOf==='c-pack'));
 c.openSplit({id:'plain',name:'Multicolor tee',colors:['black','blue']});assert.equal(all(dialog).find(n=>n['aria-label']==='How many pieces').value,'');assert.equal(all(dialog).find(n=>n.text==='Split into separate pieces'&&n.tag==='button').disabled,true);
 all(dialog).find(n=>n.text==='Cancel').onclick();
 c.COLORS={black:'#000',blue:'#00f',gray:'#888',pink:'#fcc',yellow:'#ff0'};
 c.openSplit({id:'c-scrunchies',customId:'scrunchies',name:'6pcs Solid Elastic Scrunchie',meta:'Hair accessories',colors:['black'],photoId:'source'});
 const shades=[['black',''],['gray','light grey'],['blue','navy'],['pink',''],['yellow',''],['blue','light blue']];
 shades.forEach(([color,detail],i)=>{const nodes=all(dialog),picker=nodes.find(n=>n['aria-label']==='Color for piece '+(i+1)),input=nodes.find(n=>n['aria-label']==='Name detail for piece '+(i+1));picker.value=color;picker.events.change();input.value=detail;input.events.input()});
 await all(dialog).find(n=>n.text==='Split into 6 pieces').onclick();await next();
 const last=handoffs.at(-1),expected=['black','light grey','navy','pink','yellow','light blue'];
 assert.equal(last.choice,'assistant');
 last.ids.forEach((id,i)=>{assert.equal(records['custom/'+id.slice(2)].name,'Solid Elastic Scrunchie ('+expected[i]+')');assert.equal(last.notes[id],expected[i],'precise typed details or selected colors reach photo preparation unchanged')});
 assert(!Object.values(last.notes).some(note=>/Numbered pack item|left-to-right|top-to-bottom/.test(note)),'split order never invents a photo position');
 c.openSplit({id:'c-identical',name:'2pcs black ties',colors:['black'],photoId:'source'});
 await all(dialog).find(n=>n.text==='Split into 2 pieces').onclick();await next();
 const identical=handoffs.at(-1);assert.equal(identical.notes[identical.ids[0]],'black');assert.equal(identical.notes[identical.ids[1]],'black');assert.notEqual(records['custom/'+identical.ids[0].slice(2)].name,records['custom/'+identical.ids[1].slice(2)].name,'duplicate labels stay distinguishable without assigning image positions');
 console.log('Split review: explicit counts, ambiguous pairs, editable variants, no color guessing, safe retry after reopening, original retirement order, retained details, and photo handoff pass.');
})().catch(e=>{console.error(e);process.exit(1)});
