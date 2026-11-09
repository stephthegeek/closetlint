const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app/scripts/recent-wears.js','utf8');
class Node{
 constructor(tag,attrs,...children){this.tag=tag;Object.assign(this,attrs||{});this.children=children.filter(Boolean);this.events={};this.value=''}
 appendChild(n){this.children.push(n);return n}setAttribute(k,v){this[k]=v}addEventListener(k,f){this.events[k]=f}
 set textContent(v){this.text=v;this.children=[]}get textContent(){return this.text||''}showModal(){this.open=true}close(){this.open=false}
}
const days=(n,end='2026-10-30')=>Array.from({length:n},(_,i)=>new Date(Date.parse(end+'T12:00Z')-i*86400000).toISOString().slice(0,10));
let succeed=true,hold=null;const writes=[],details=[],messages=[],dialog=new Node('dialog'),piece={id:'p',wears:[]};
const c={Date,Number,Promise,state:{outfits:{},outfitHistory:{}},el:(...a)=>new Node(...a),$:()=>dialog,byId:()=>({p:piece}),todayStr:()=> '2026-10-30',wearsOf:p=>(p.wears||[]).slice().sort(),toast:m=>messages.push(m),histDay:d=>details.push(d),patchEdit:async(p,v)=>{writes.push(v);if(hold)await hold;if(succeed)piece.wears=v.wears;return succeed},document:{querySelectorAll:()=>[]}};
vm.createContext(c);vm.runInContext(source,c);
for(const [n,level] of [[0,0],[2,0],[3,1],[7,1],[8,2]])assert.equal(c.recentWearStats({wears:days(n)}).level,level);
assert.equal(c.recentWearStats({wears:['2026-10-01','2026-09-30','2026-10-30','2026-10-30','2026-10-31','invalid','2026-02-30']}).count,2,'inclusive window, deduplicated, excludes future and invalid dates');
assert.equal(c.recentWearStats({wears:days(8),wish:true}).level,0,'wishlist gets no heat badge');
assert.equal(c.recentWearStats({wears:['2026-03-07','2026-03-08','2026-03-09']},'2026-03-09').count,3,'DST does not change calendar-day counts');
assert.equal(c.recentWearStats({wears:['2024-02-29']},'2024-03-29').count,1,'leap day is included at day 30');
c.state.outfitHistory.old={pieces:[{id:'p'}],wearLog:[{d:'2026-10-30',ids:['p']}]};assert(c.pieceWearOutfitLinked(piece,'2026-10-30'));
c.state.outfits.old={pieces:[{id:'p'}],wearLog:[]};assert(!c.pieceWearOutfitLinked(piece,'2026-10-30'),'restored live outfit overrides archived copy');
const descend=n=>[n,...n.children.filter(x=>x&&typeof x==='object').flatMap(descend)];
(async()=>{
 let box=c.wearBox(piece),buttons=descend(box).filter(n=>n.tag==='button'),today=buttons[0];
 assert.equal(descend(box).find(n=>n.class==='wear-days').children.length,10);assert.equal(today['aria-pressed'],'false');
 assert(!box.className.includes('wear-logged-today'));
 succeed=false;await today.events.click();await new Promise(r=>setImmediate(r));assert.equal(piece.wears.length,0);assert.equal(today['aria-pressed'],'false','failed save never paints success');
 assert(!box.className.includes('wear-logged-today'),'failed save must not show the green Today edge');
 succeed=true;let resolve;hold=new Promise(r=>resolve=r);today.events.click();today.events.click();assert.equal(writes.length,2,'rapid second click ignored during save');resolve();hold=null;await new Promise(r=>setImmediate(r));assert.equal(today['aria-pressed'],'true');
 assert(box.className.includes('wear-logged-today'),'the green edge follows the saved Today log');
 c.state.outfits.one={wearLog:[{d:'2026-10-30',ids:['p']}]};box.refreshWear();const before=writes.length;today.events.click();assert.equal(details.at(-1),'2026-10-30');assert.equal(writes.length,before,'outfit-linked Today opens details without a piece-only removal');
 c.openWearDates(piece,()=>{throw Error('linked wear must not be directly removed')});const manage=descend(dialog).find(n=>n['aria-label']==='View outfit wear details for 2026-10-30');manage.onclick();assert.equal(details.length,2);
 c.state.outfits={};c.state.outfitHistory={};today.events.click();await new Promise(r=>setImmediate(r));assert.equal(piece.wears.length,0);assert.equal(today['aria-pressed'],'false');
 assert(!box.className.includes('wear-logged-today'),'removing Today clears the green edge');
 piece.wears=['2026-10-31','legacy-value'];box.refreshWear();today.events.click();await new Promise(r=>setImmediate(r));assert(piece.wears.includes('2026-10-31')&&piece.wears.includes('legacy-value'),'logging Today preserves unrelated legacy values');
 const events={};let refreshed=0;c.window={addEventListener:(k,f)=>events[k]=f};c.document.addEventListener=(k,f)=>events[k]=f;c.setTimeout=(f,ms)=>{assert(ms>0);events.midnight=f};c.state.capsDone=true;c.isClosetTab=()=>true;c.renderFilters=()=>refreshed++;c.renderGrid=()=>{};c.wireRecentWearDay();events.focus();assert.equal(refreshed,0,'same-day focus does not redraw browsing');c.todayStr=()=> '2026-10-31';events.focus();assert.equal(refreshed,1,'returning after midnight refreshes the rolling window');events.focus();assert.equal(refreshed,1);
 console.log('Recent wears: 3/8 thresholds, rolling boundaries, DST/leap dates, deduplication, invalid/future dates, wishlist exclusion, safe Today toggle, rapid clicks, failed saves, and outfit-linked date protection pass.');
})().catch(e=>{console.error(e);process.exitCode=1});

// First outings happen only after acknowledgement, with one splash per action.
(async()=>{
 const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
 function fn(n){const a=html.indexOf('function '+n+'('),b=html.indexOf('\nfunction ',a+1);return html.slice(a,b)}
 const timers=[],messages=[],splashes=[],dialog={};let fail=false;
 const state={edits:{},flash:{},outfits:{old:{wearLog:[{d:'2026-10-01'}]},fresh:{wearLog:[]}}};
 const pieces={a:{id:'a',wears:[]},b:{id:'b',wears:['2026-10-01']}};
 state.db={collection:()=>({doc:id=>({set:async v=>{if(fail)throw Error('failed');state.edits[id]=v}})}),commitWear:async()=>{if(fail)throw Error('lost acknowledgement')}};
 const ctx={state,Promise,byIdA:()=>pieces,needDb:()=>false,flashIds(){},toast:m=>messages.push(m),setTimeout:f=>(timers.push(f),timers.length),celebratePurchase:host=>splashes.push(host),toastHost:()=>({parentNode:dialog})};
 vm.createContext(ctx);vm.runInContext(source+'\n'+fn('patchEdit')+'\n'+fn('commitWearAction'),ctx);
 const flush=()=>{timers.splice(0).forEach(f=>f())};
 fail=true;assert.equal(await ctx.patchEdit(pieces.a,{wears:['2026-11-05']},true),false);flush();assert.equal(splashes.length,0);
 fail=false;await ctx.patchEdit(pieces.a,{wears:['2026-11-05']},true);flush();assert.equal(splashes.length,1);assert.equal(messages.at(-1),'🎉 First outing!');assert.equal(splashes[0],dialog,'splash uses the current modal toast host');
 await ctx.patchEdit(pieces.a,{wears:['2026-11-05','2026-11-06']},true);await ctx.patchEdit(pieces.a,{wears:[]},true);await ctx.patchEdit(pieces.a,{notes:'hello'},true);flush();assert.equal(splashes.length,1,'later wears, removal and ordinary edits do not celebrate');
 let prepared=0;const changes=()=>{prepared++;return [{collection:'outfits',id:'fresh',value:{wearLog:[{d:'2026-11-05'}]}},{collection:'edits',id:'b',value:{wears:['2026-10-01','2026-11-05']}}]};
 fail=true;assert.equal(await ctx.commitWearAction('outfit',changes,'Logged'),false);flush();assert.equal(splashes.length,1);
 fail=false;assert.equal(await ctx.commitWearAction('outfit',changes,'Logged'),true);flush();assert.equal(prepared,1);assert.equal(splashes.length,2,'first outfit celebrates even when pieces have prior wears; retry celebrates once');
 await ctx.commitWearAction('later',()=>[{collection:'outfits',id:'fresh',value:{wearLog:[{d:'2026-11-05'},{d:'2026-11-06'}]}}],'Logged');flush();assert.equal(splashes.length,2);
 const firsts=[{collection:'edits',id:'c',value:{wears:['2026-10-20']}},{collection:'edits',id:'d',value:{wears:['2026-10-20']}}];await ctx.commitWearAction('batch',()=>firsts,'Logged');flush();assert.equal(splashes.length,3,'batch first wears and backdating use a single splash');
 ctx.profileFirstWearToastPending=true;ctx.celebrateFirstOuting();flush();assert.equal(splashes.length,3,'first-ever Almanac day keeps its own celebration');ctx.profileFirstWearToastPending=false;ctx.celebrateFirstOuting();flush();assert.equal(splashes.length,4,'a later piece debut still celebrates');
 console.log('First outing: piece/outfit first saves, modal hosting, batch coalescing, backdating, failures, retained retries, later wears, removals and first Almanac day priority pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
