const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fixture(){
 const nodes=[],prefs={},writes=[];let fail=false;
 const el=(tag,attrs={},...children)=>{const n={tag,...attrs,children:children.flat().filter(Boolean),value:attrs?.value||'',textContent:attrs?.text||'',setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]??null},removeAttribute(k){delete this[k]},addEventListener(){},appendChild(x){this.children.push(x)},showModal(){this.open=true}};nodes.push(n);return n};
 const dialog=el('dialog'),root=el('html'),label=el('span'),home=el('a');
 const c={state:{profile:{},measurements:{old:{date:'2026-10-01',waist:30}},db:{collection:name=>({doc:id=>({set:async value=>{if(fail)throw Error('offline');writes.push({name,id,value})}})})}},document:{documentElement:root,querySelector:()=>label,title:'Closet · Closet Lint'},$:id=>id==='home'?home:dialog,el,needDb:()=>false,localStorage:{getItem:k=>prefs[k],setItem:(k,v)=>prefs[k]=v},todayStr:()=> '2026-10-25',toast:m=>c.message=m,setTimeout(){},clearTimeout(){},allItems:()=>[],CLOTHING_ORDER:[],chip:()=>el('button'),addClose(){},closeDlg(){}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function wardrobeIdentity(){'),source.indexOf('function initBrandLogo(){'))+'\n'+source.slice(source.indexOf('function unitsMetric(){'),source.indexOf('function menuLabel(')),c);
 return {c,nodes,prefs,writes,root,label,home,set fail(v){fail=v}};
}
(async()=>{
 const f=fixture(),{c}=f;c.applyWardrobeIdentity();assert.equal(f.label.textContent,'closet lint');
 await c.saveWardrobeIdentity({name:'  My closet  ',showLogo:false});assert.equal(f.label.textContent,'My closet');assert.equal(f.root['data-brand-logo'],'false');assert.equal(c.document.title,'Closet · My closet');assert.equal(f.writes[0].name,'profile');
 f.fail=true;await assert.rejects(c.saveWardrobeIdentity({name:'Not saved',showLogo:true}));assert.equal(c.wardrobeIdentity().name,'My closet');assert.equal(f.root['data-brand-logo'],'false');f.fail=false;
 await c.saveWardrobeIdentity({name:'',showLogo:true});assert.equal(c.wardrobeIdentity().name,'');assert.equal(f.label.textContent,'closet lint');
 c.openMeasurementEntry();const field=name=>f.nodes.find(n=>n['aria-label']===name),units=field('Measurement units');
 field('Chest/bust').value='40';field('Inseam').value='32';field('Weight').value='150';field('Bra size').value='40DD';
 units.onchange({target:{value:'met'}});assert.equal(field('Chest/bust').value,'101.6');assert.equal(field('Inseam').value,'81.3');assert.equal(field('Chest/bust').placeholder,'—');assert.equal(f.nodes.find(n=>n.id==='measurement-unit-waist').textContent,'cm');assert.equal(f.nodes.find(n=>n.id==='measurement-unit-weight').textContent,'kg');assert.equal(field('Bra size').value,'40DD');
 field('Chest/bust').value='100';field('Inseam').value='80';field('Neck').value='38';
 f.nodes.find(n=>n.text==='Save entry').onclick();await new Promise(setImmediate);const record=f.writes.at(-1).value;
 assert.equal(record.chest,39.4);assert.equal(record.inseam,31.5);assert.equal(record.neck,15);assert.equal(record.bra,'40DD');assert.equal(record.height,undefined);assert.equal(c.state.measurements.old.waist,30,'historical records are not rewritten');
 const count=f.writes.length;field('Inseam').value='-1';f.nodes.find(n=>n.text==='Save entry').onclick();assert.equal(f.writes.length,count);assert.match(c.message,/positive/);
 units.onchange({target:{value:'imp'}});assert.equal(f.nodes.find(n=>n.id==='measurement-unit-waist').textContent,'in');assert.equal(field('Bra size').value,'40DD');
 const h=fixture();h.c.openMeasurementEntry();const input=name=>h.nodes.find(n=>n['aria-label']===name),saveHeight=async()=>{h.nodes.find(n=>n.text==='Save entry').onclick();await new Promise(setImmediate);return h.writes.at(-1).value},changeUnits=value=>input('Measurement units').onchange({target:{value}});
 assert.equal(input('Height feet').type,'text');assert.equal(input('Height centimeters').inputmode,'decimal');
 input('Height feet').value='5';input('Height inches').value='7.5';assert.equal((await saveHeight()).height,67.5);
 changeUnits('met');assert.equal(input('Height centimeters').value,'171.5');changeUnits('imp');assert.equal(input('Height inches').value,'7.5');assert.equal((await saveHeight()).height,67.5,'unit switches preserve the original height');
 changeUnits('met');input('Height centimeters').value='170';assert.ok(Math.abs((await saveHeight()).height-170/2.54)<.000001);changeUnits('imp');assert.equal(input('Height feet').value,'5');assert.equal(input('Height inches').value,'6.9');changeUnits('met');assert.ok(Math.abs((await saveHeight()).height-170/2.54)<.000001,'converted display does not round stored height');
 input('Height centimeters').value='';input('Waist').value='80';assert.equal((await saveHeight()).height,undefined,'cleared height is omitted');changeUnits('imp');assert.equal(input('Height feet').value,'');
 const prior=fixture();prior.c.state.measurements.old.height=67.5;prior.c.openMeasurementEntry();assert.equal(prior.nodes.find(n=>n['aria-label']==='Height feet').value,'5');assert.equal(prior.nodes.find(n=>n['aria-label']==='Height inches').value,'7.5');assert(prior.nodes.some(n=>n.class==='measurement-last'&&n.textContent.includes('Last: 30 in')));
 assert.equal(h.c.fmtHeight(67.5,false),'5 ft 7.5 in');assert.equal(h.c.fmtHeight(1.7/.0254,true),'1.70 m');
 const retry=fixture();retry.c.openMeasurementEntry();const retryField=retry.nodes.find(n=>n['aria-label']==='Waist'),retrySave=retry.nodes.find(n=>n.text==='Save entry');retryField.value='33';retry.fail=true;await retrySave.onclick();assert.equal(retryField.value,'33');assert.equal(retrySave.disabled,false);assert.match(retry.c.message,/Could not save/);retry.fail=false;await retrySave.onclick();assert.equal(retry.writes.at(-1).value.waist,33,'retry saves retained measurement values');
 const autosave=fixture(),settings={'wardrobe-name':{value:''},'wardrobe-logo':{checked:true},'wardrobe-identity-status':{textContent:''},'retry-wardrobe-identity':{hidden:true}};autosave.c.$=id=>settings[id];autosave.c.fillWardrobeSettings();
 settings['wardrobe-name'].value='Autosaved closet';autosave.c.scheduleWardrobeSettings(false);assert.equal(autosave.writes.length,0,'typing waits for the debounce or blur');await autosave.c.storeWardrobeSettings();assert.equal(autosave.c.wardrobeIdentity().name,'Autosaved closet');assert.equal(settings['wardrobe-identity-status'].textContent,'Saved');
 autosave.fail=true;settings['wardrobe-logo'].checked=false;await autosave.c.scheduleWardrobeSettings(true);assert.equal(settings['retry-wardrobe-identity'].hidden,false);assert.equal(settings['wardrobe-name'].value,'Autosaved closet');autosave.c.fillWardrobeSettings();assert.equal(settings['wardrobe-logo'].checked,false,'reopening preserves failed edits');autosave.fail=false;await autosave.c.storeWardrobeSettings();assert.equal(autosave.c.wardrobeIdentity().showLogo,false);assert.equal(settings['retry-wardrobe-identity'].hidden,true);
 const sent=[];let release;autosave.c.saveWardrobeIdentity=value=>{sent.push(value);return sent.length===1?new Promise(resolve=>{release=resolve}):Promise.resolve(value)};
 settings['wardrobe-name'].value='First';autosave.c.scheduleWardrobeSettings(false);const saving=autosave.c.storeWardrobeSettings();settings['wardrobe-name'].value='Latest';autosave.c.scheduleWardrobeSettings(true);assert.equal(sent.length,1,'saves do not overlap');release();await saving;assert.equal(sent.length,2);assert.equal(sent[1].name,'Latest');assert.equal(settings['wardrobe-identity-status'].textContent,'Saved');
 console.log('Closet settings and measurements: shared profile writes, failed-save retention, default reset, unit conversion without clearing fields, optional fields, and positive values pass.');
})().catch(e=>{console.error(e);process.exit(1)});

// Ring preferences filter fixed-size rings; adjustable and unrelated jewelry remain available.
{
 const c={state:{profile:{wear:{ring:['7','8']}}},effSize:p=>p.fitsLike||p.size||''};vm.createContext(c);
 const a=source.indexOf('function fitsMeItem('),b=source.indexOf('\nfunction ',a+1);vm.runInContext(source.slice(a,b),c);
 assert(c.fitsMeItem({meta:'Jewelry',sub:'Rings',sizeKind:'ring',size:'7'}));
 assert(!c.fitsMeItem({meta:'Jewelry',sub:'Rings',sizeKind:'ring',size:'6'}));
 assert(c.fitsMeItem({sizeKind:'ring',size:'6',fitsLike:'8'}));
 for(const size of ['','open','adjustable','o/s'])assert(c.fitsMeItem({sizeKind:'ring',size}));
 assert(c.fitsMeItem({meta:'Jewelry',sub:'Necklaces',sizeKind:'none'}));c.state.profile.wear.ring=[];assert(c.fitsMeItem({sizeKind:'ring',size:'6'}));
 console.log('Ring fit: selected sizes, Fits like override, adjustable/unknown sizes, and unrelated jewelry pass.');
}
