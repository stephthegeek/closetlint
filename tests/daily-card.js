'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const daily=require('../app/scripts/daily-card'),lines=require('../app/content/linty/daily-lines.json');
const item=(id,more={})=>({id,meta:'Tops',sub:'Sweaters',date:'2025-01-01',colors:['burgundy'],material:['velvet'],fav:true,...more});
const opts={day:'2026-10-22',instance:'synthetic-installation',season:'fall',lines,items:[item('a'),item('b',{wish:true}),item('c',{hidden:true}),item('d',{stored:true,where:'Winter box'})]};
const before=JSON.stringify(opts),a=daily.generate(opts);assert.deepEqual(daily.generate(opts),a);assert.equal(JSON.stringify(opts),before);
assert.equal(daily.speak(item('x',{name:'Store listing, private order 123',title:'XXXL retailer listing'})),'burgundy velvet sweater');
assert.equal(daily.speak(item('x',{nickname:'The bee vest'})),'The bee vest');
assert.equal(daily.daysSince('2026-10-01','2026-10-22'),21);
const seen=new Set();
for(let i=1;i<=400;i++){
 const day='2026-'+String(1+(i%12)).padStart(2,'0')+'-'+String(1+(i%28)).padStart(2,'0');
 const r=daily.generate({...opts,day});seen.add(r.type);assert(!/#\w+#/.test(r.text));
 assert(!['b','c'].includes(r.pieceId));
 if(r.type==='do')assert.equal(r.pieceId,'a');
 if(r.type==='neglected')assert(['a','d'].includes(r.pieceId));
}
assert.deepEqual([...seen].sort(),['do','dont','fortune','neglected']);
const special=daily.generate({...opts,day:'2026-10-31'});assert.equal(special.type,'fortune');assert(special.text.includes('Halloween'));
for(const flags of [{q:'shirt'},{selectMode:true},{editView:true},{showStored:true},{collectionManager:true},{collectionFilter:{synthetic:true}},{showDonate:true},{showHidden:true},{wishOnly:true},{sortRev:true},{sort:'name'},{tab:'sky'}]){
 const s={tab:'clothing',sort:'new',...flags};assert.equal(daily.eligible(s,!!s.q),false);
}
assert(daily.eligible({tab:'clothing',sort:'new'},false));
let colorCard;
for(let i=0;i<60&&!colorCard;i++){
 const r=daily.generate({...opts,instance:'colors'+i,items:[item('1'),item('2'),item('3')]});if(r.type==='color')colorCard=r;
}
assert(colorCard);assert.deepEqual(colorCard.colors,['burgundy']);
for(let i=0;i<40;i++){
 const r=daily.generate({...opts,instance:'repeat'+i,history:[{day:opts.day,type:'neglected',pieceId:'a',hash:0},{day:opts.day,type:'neglected',pieceId:'d',hash:0}]});assert.notEqual(r.type,'neglected');
 const empty=daily.generate({...opts,instance:'empty'+i,items:[]});assert(['fortune','dont'].includes(empty.type));assert.equal(empty.pieceId,null);
}
// Lightweight DOM checks exercise the actual UI, without browser or personal data.
class Node{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.style={setProperty(){}};this.classList={toggle(){}};this.isConnected=true;this.clientWidth=600;this.firstElementChild=null;}
 appendChild(n){this.children.push(n);n.parentNode=this;this.firstElementChild=this.children[0];return n}
 insertBefore(n,b){const i=this.children.indexOf(b);this.children.splice(i<0?this.children.length:i,0,n);n.parentNode=this;return n}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this)}
 setAttribute(k,v){this.attrs[k]=v}
 getAttribute(k){return this.attrs[k]??null}
 querySelector(s){return all(this).find(n=>'.'+n.class===s)||null}
 getBoundingClientRect(){return {height:320,top:200}}
}
const el=(tag,attrs,...children)=>{const n=new Node(tag);Object.assign(n,attrs);n.attrs={...attrs};children.filter(Boolean).forEach(c=>n.appendChild(typeof c==='string'?Object.assign(new Node('text'),{text:c}):c));return n};
const parent=new Node('div'),grid=new Node('ul');parent.appendChild(el('div',null,el('button',{id:'sortdir'})));parent.appendChild(grid);grid.appendChild(el('li',null,el('div',{class:'card'})));
const settings=new Node('div'),restore=el('button',{id:'daily-card-restore'});parent.appendChild(settings);settings.appendChild(restore);
const toolbar=new Node('div'),sortDirection=el('button',{id:'sortdir'});parent.appendChild(toolbar);toolbar.appendChild(sortDirection);
let delayed=[],writes=[],filtered=false,notices=[],clock=opts.day,timers=0,cleared=0;
const state={capsDone:true,tab:'clothing',sort:'new',profile:{},outfits:{},db:{collection:k=>({doc:id=>({set:doc=>{writes.push({k,id,doc});return Promise.resolve()}})})}};
const all=(node)=>[node,...node.children.flatMap(all)];
const root=new Node('html');
const doc={documentElement:root,getElementById:id=>all(parent).find(n=>n.id===id)||null,querySelector:s=>all(parent).find(n=>'.'+n.class===s)||null};
const context={ClosetLintDaily:daily,DAILY_LINES:lines,state,window:{ClosetLintLocal:{instance:opts.instance},innerHeight:844},setupLoaded:{profile:true,custom:true,edits:true,outfits:true},todayStr:()=>clock,allItems:()=>opts.items,byId:()=>Object.fromEntries(opts.items.map(p=>[p.id,p])),realPhoto:()=>false,anyFilter:()=>filtered,gridCols:()=>2,el,document:doc,requestAnimationFrame:fn=>delayed.push(fn),setTimeout:()=>++timers,clearTimeout(){cleared++},toast:t=>notices.push(t),renderGrid(){},isClosetTab:()=>true,Date,console};
vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../app/scripts/daily-card-ui'),'utf8'),context);
root.setAttribute('data-daily-card','off');
context.ClosetLintDailyUI.mount(grid);
assert.equal(state.profile['daily-card'],undefined,'disabled card does not generate or save a reading');
assert.equal(timers,0,'disabled card does not schedule refresh');
assert.equal(delayed.length,0);
root.setAttribute('data-daily-card','on');
context.ClosetLintDailyUI.mount(grid);delayed.splice(0).forEach(fn=>fn());
let slot=grid.children.find(n=>n.class==='daily-card-slot');assert(slot);const nodes=all(slot),flip=nodes.find(n=>n.class==='daily-flip'),dismiss=nodes.find(n=>n.class==='daily-dismiss');
assert.equal(flip.attrs['aria-pressed'],'false');flip.onclick();assert.equal(flip.attrs['aria-pressed'],'true');assert.equal(state.profile['daily-card'].revealed,true);
dismiss.onclick();assert.equal(state.profile['daily-card'].dismissed,true);
slot.remove();context.ClosetLintDailyUI.mount(grid);assert.equal(restore.hidden,false);assert(!doc.getElementById('daily-card-return'),'no toolbar restore control');assert.strictEqual(restore.parentNode,settings,'restore stays in View settings');
const keptRecord=state.profile['daily-card'];
root.setAttribute('data-daily-card','off');context.ClosetLintDailyUI.mount(grid);
assert.equal(restore.hidden,true,'disabled fortune hides the restore link');
assert(cleared>0,'off cancels the midnight refresh');
root.setAttribute('data-daily-card','on');context.ClosetLintDailyUI.mount(grid);
assert.strictEqual(state.profile['daily-card'],keptRecord,'reenabling preserves the current reading and dismissal');
assert.equal(restore.hidden,false);restore.onclick();assert.equal(keptRecord.dismissed,false);assert.equal(restore.hidden,true,'restoring hides the link');notices=[];
keptRecord.dismissed=false;context.ClosetLintDailyUI.mount(grid);
root.setAttribute('data-daily-card','off');delayed.splice(0).forEach(fn=>fn());
assert(!doc.querySelector('.daily-card-slot'),'a pending render cannot insert a card after disabling');
root.setAttribute('data-daily-card','on');context.ClosetLintDailyUI.mount(grid);delayed.splice(0).forEach(fn=>fn());
assert(doc.querySelector('.daily-card-slot'));
root.setAttribute('data-daily-card','off');context.ClosetLintDailyUI.mount(grid);
assert(!doc.querySelector('.daily-card-slot'),'off removes an already mounted card');
filtered=true;context.ClosetLintDailyUI.mount(grid);assert(!doc.getElementById('daily-card-return'));
assert.deepEqual(notices,[]);
keptRecord.dismissed=true;clock='2026-10-23';context.ClosetLintDailyUI.refreshSettings();assert.equal(restore.hidden,true,'yesterday’s dismissal has no restore link');clock=opts.day;keptRecord.dismissed=false;
Promise.resolve().then(()=>context.ClosetLintDailyUI.mount(grid)).then(()=>{assert(writes.every(w=>w.k==='profile'&&w.id==='daily-card'));console.log('Daily card: deterministic readings, exclusions, season rules, fallbacks, colors, no private titles, grid eligibility, flip, dismiss, and isolated persistence pass.');});

// Navigation can happen between rendering pieces and the deferred card insertion.
root.setAttribute('data-daily-card','on');filtered=false;state.tab='clothing';
context.ClosetLintDailyUI.mount(grid);
state.collectionFilter={synthetic:true};delayed.splice(0).forEach(fn=>fn());
assert(!doc.querySelector('.daily-card-slot'),'queued closet card cannot appear after entering a collection');
context.ClosetLintDailyUI.mount(grid);assert.equal(delayed.length,0,'collection never queues a card');
state.collectionFilter={};context.ClosetLintDailyUI.mount(grid);delayed.splice(0).forEach(fn=>fn());
assert(doc.querySelector('.daily-card-slot'));state.collectionFilter={synthetic:true};context.ClosetLintDailyUI.mount(grid);
assert(!doc.querySelector('.daily-card-slot'),'entering a collection removes an existing card');
state.collectionFilter={synthetic:false};context.ClosetLintDailyUI.mount(grid);delayed.splice(0).forEach(fn=>fn());assert(doc.querySelector('.daily-card-slot'),'unselected collection filters do not suppress normal browsing');doc.querySelector('.daily-card-slot').remove();state.collectionFilter={};
for(const tab of ['outfits','saved','lab','buy','trip','wrank','oracle','sky']){
 state.tab='clothing';context.ClosetLintDailyUI.mount(grid);state.tab=tab;delayed.splice(0).forEach(fn=>fn());assert(!doc.querySelector('.daily-card-slot'),'queued card excluded from '+tab);
}
state.tab='clothing';context.ClosetLintDailyUI.mount(grid);grid.hidden=true;delayed.splice(0).forEach(fn=>fn());assert(!doc.querySelector('.daily-card-slot'),'queued card excluded while grid is hidden');grid.hidden=false;
context.ClosetLintDailyUI.mount(grid);context.ClosetLintDailyUI.mount(grid);delayed.splice(0).forEach(fn=>fn());assert(doc.querySelector('.daily-card-slot'),'only the current mount inserts a card');doc.querySelector('.daily-card-slot').remove();

// Persisting a flip must not rebuild the browsing grid or reposition its card.
const watchSource=fs.readFileSync(require.resolve('../app/closet-lint.html'),'utf8');
const watchContext={applyWardrobeIdentity(){},state:{profile:{},db:{collection:()=>({onSnapshot:fn=>{watchContext.snapshot=fn}})}},setupLoaded:{profile:false},onDataSoon:()=>watchContext.redraws++,redraws:0,console};
vm.createContext(watchContext);
vm.runInContext(watchSource.slice(watchSource.indexOf('function dailyCardProfileOnlyChange('),watchSource.indexOf('function showNotice(){')),watchContext);
watchContext.watch('profile','profile');
function profileSnapshot(values){return {docs:Object.entries(values).map(([id,value])=>({id,data:()=>value}))}}
watchContext.snapshot(profileSnapshot({'daily-card':{revealed:false},'collection-test':{name:'Synthetic collection'}}));
assert.equal(watchContext.redraws,1,'initial profile loading still renders');
watchContext.snapshot(profileSnapshot({'daily-card':{revealed:true},'collection-test':{name:'Synthetic collection'}}));
assert.equal(watchContext.state.profile['daily-card'].revealed,true,'saved reveal state still hydrates');
assert.equal(watchContext.redraws,1,'flipping does not redraw the grid');
watchContext.snapshot(profileSnapshot({'daily-card':{revealed:true},'collection-test':{name:'Renamed collection'}}));
assert.equal(watchContext.redraws,2,'other profile changes still redraw');
watchContext.snapshot(profileSnapshot({'daily-card':{revealed:true}}));
assert.equal(watchContext.redraws,3,'removing a collection still redraws');
console.log('Daily-card saves preserve the browse grid; initial loading and collection changes still render.');

// Static public sites hydrate their browser data without local database watch flags.
root.setAttribute('data-daily-card','on');
const publicContext={...context,state:{...state,pub:true,profile:{}},setupLoaded:{},anyFilter:()=>false};
vm.createContext(publicContext);
vm.runInContext(fs.readFileSync(require.resolve('../app/scripts/daily-card-ui'),'utf8'),publicContext);
publicContext.ClosetLintDailyUI.mount(grid);delayed.splice(0).forEach(fn=>fn());
assert(doc.querySelector('.daily-card-slot'),'public site shows the enabled card without local watch flags');
doc.querySelector('.daily-card-slot').remove();
const loadingContext={...context,state:{...state,pub:false,profile:{}},setupLoaded:{},anyFilter:()=>false};
vm.createContext(loadingContext);
vm.runInContext(fs.readFileSync(require.resolve('../app/scripts/daily-card-ui'),'utf8'),loadingContext);
loadingContext.ClosetLintDailyUI.mount(grid);delayed.splice(0).forEach(fn=>fn());
assert(!doc.querySelector('.daily-card-slot'),'local site still waits for its wardrobe data to load');
console.log('Daily fortune: public-site startup and local loading guard passed.');

// Off-duty pieces cannot drive piece reminders or color statistics, including legacy sections.
const offDutyPieces=['Swimwear','Loungewear','Activewear','Costumes','Lingerie'].map((meta,i)=>item('off-'+i,{meta,section:'clothing',colors:['orange']})).concat([
 item('off-explicit',{section:'offduty',colors:['orange']}),
 item('off-legacy',{section:'sexy',colors:['orange']})
]);
for(let i=0;i<100;i++){
 const seed={...opts,instance:'off-duty-check-'+i};
 assert.deepEqual(daily.generate({...seed,items:opts.items.concat(offDutyPieces)}),daily.generate(seed),'off-duty pieces do not affect any reading');
 const onlyOffDuty=daily.generate({...seed,items:offDutyPieces});
 assert(['fortune','dont'].includes(onlyOffDuty.type));
 assert.equal(onlyOffDuty.pieceId,null);
 assert.deepEqual(onlyOffDuty.colors,[]);
}
assert.equal(daily.eligible({tab:'offduty',sort:'new'},false),false);
for(const tab of ['all','clothing','jewelry','accessories'])assert(daily.eligible({tab,sort:'new'},false));
// Intimates are excluded even in Accessories, Tops, or legacy categories.
const intimatePieces=[
 ...['Bras','Panties','Shapewear','Slips & crinolines','Intimates','Other'].map((sub,i)=>item('underwear-'+i,{meta:'Underwear',sub,section:'accessories',colors:['orange']})),
 ...['Sets','Bras','Teddies & bodysuits','Other'].map((sub,i)=>item('lingerie-'+i,{meta:'Lingerie',sub,section:'accessories',colors:['orange']})),
 item('bralette',{meta:'Tops',sub:'Bralettes',colors:['orange']}),
 item('legacy-intimate',{meta:'Other accessories',sub:'Intimates',colors:['orange']}),
 item('legacy-panties',{meta:'Other accessories',sub:'Panties & thongs',colors:['orange']})
];
for(let i=0;i<100;i++){
 const seed={...opts,instance:'intimates-check-'+i};
 assert.deepEqual(daily.generate({...seed,items:opts.items.concat(intimatePieces),outfits:[intimatePieces.map(p=>p.id)]}),daily.generate({...seed,outfits:[]}), 'intimates cannot drive reminders, color counts, or saved-outfit color pairs');
 const onlyIntimates=daily.generate({...seed,items:intimatePieces});
 assert.equal(onlyIntimates.pieceId,null);
 assert.deepEqual(onlyIntimates.colors,[]);
}
assert(daily.isActivePiece(item('socks',{meta:'Legwear',sub:'Socks'})),'ordinary legwear stays eligible');
console.log('Daily fortune: all underwear/lingerie subtypes, bralettes, and legacy intimates excluded.');

// Replace an already saved off-duty suggestion without waiting for tomorrow.
const cachedContext={...context,state:{...state,profile:{'daily-card':{version:1,instance:opts.instance,card:{day:clock,type:'do',text:'Try the swimsuit.',pieceId:'off-0',colors:[]},history:[]}}},allItems:()=>opts.items.concat(offDutyPieces),anyFilter:()=>false};
vm.createContext(cachedContext);
vm.runInContext(fs.readFileSync(require.resolve('../app/scripts/daily-card-ui'),'utf8'),cachedContext);
root.setAttribute('data-daily-card','on');
cachedContext.ClosetLintDailyUI.mount(grid);
assert.notEqual(cachedContext.state.profile['daily-card'].card.pieceId,'off-0','cached swimsuit reading is replaced');
console.log('Daily fortune: off-duty exclusions, color isolation, eligible sections, and cached suggestion replacement passed.');

// A day's cached reminder must stop referring to pieces that leave its eligible pool.
for(const flags of [{meta:'Underwear',sub:'Panties'},{meta:'Lingerie',sub:'Sets'},{meta:'Tops',sub:'Bralettes'},{hidden:true},{removed:true},{gone:true},{donate:true},{wish:true},{stored:true},null]){
 const removed=flags===null,changed=removed?[]:[item('a',flags)];
 const cached={version:1,instance:opts.instance,card:{day:clock,type:'do',text:'Cached reminder for an unavailable piece.',pieceId:'a',colors:[]},revealed:true,dismissed:true,slots:{},history:[]};
 const c={...context,state:{...state,profile:{'daily-card':cached}},allItems:()=>changed,anyFilter:()=>false};
 vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../app/scripts/daily-card-ui'),'utf8'),c);
 c.ClosetLintDailyUI.mount(grid);
 assert.notEqual(c.state.profile['daily-card'].card.pieceId,'a','cached reminder respects '+JSON.stringify(flags));
 assert.equal(c.state.profile['daily-card'].dismissed,true,'refreshing a stale reminder does not undo today’s dismissal');
 assert.equal(c.state.profile['daily-card'].revealed,true,'same-day replacement preserves the revealed state');
}
{
 const reminder={version:1,instance:opts.instance,card:{day:clock,type:'neglected',text:'Stored favorite reminder.',pieceId:'a',colors:[]},dismissed:true,history:[]};
 const c={...context,state:{...state,profile:{'daily-card':reminder}},allItems:()=>[item('a',{stored:true})],anyFilter:()=>false};
 vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../app/scripts/daily-card-ui'),'utf8'),c);c.ClosetLintDailyUI.mount(grid);
 assert.strictEqual(c.state.profile['daily-card'],reminder,'stored favorites remain valid for the existing neglected-item reading');
}
console.log('Daily fortune: stale reminder eligibility and same-day dismissal preservation pass.');

(async()=>{
 const existing=doc.querySelector('.daily-card-slot');if(existing)existing.remove();
 const failureNotices=[],failureState={...state,profile:{},db:{collection:()=>({doc:()=>({set:()=>Promise.reject(Error('Synthetic save failure'))})})}};
 const c={...context,state:failureState,anyFilter:()=>false,requestAnimationFrame:fn=>fn(),toast:message=>failureNotices.push(message)};
 vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../app/scripts/daily-card-ui'),'utf8'),c);
 c.ClosetLintDailyUI.mount(grid);const slot=doc.querySelector('.daily-card-slot');assert(slot);
 slot.querySelector('.daily-flip').onclick();slot.querySelector('.daily-dismiss').onclick();
 await new Promise(setImmediate);
 assert.equal(failureState.profile['daily-card'].revealed,true);assert.equal(failureState.profile['daily-card'].dismissed,true,'failed persistence retains this session’s dismissal');
 assert(failureNotices.some(message=>message.includes('could not be saved')),'failed persistence is not reported as saved');slot.remove();
 console.log('Daily fortune: save failures preserve session state and report the persistence limit.');
})().catch(error=>{console.error(error);process.exitCode=1});
