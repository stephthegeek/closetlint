const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const start=html.indexOf('function '+name+'('),end=html.indexOf('\nfunction ',start+1);assert(start>=0);return html.slice(start,end)}
function fixture(){
 const nodes=[],messages=[],pieces={a:{id:'a',wears:[]},manual:{id:'manual',wears:['2026-11-02']}},plans=[{k:'plan',d:'2026-11-02'}];let fail=false,writes=0,draws=0;
 function el(tag,attrs,...children){const node={tag,...attrs,children:children.filter(Boolean),isConnected:true,appendChild(n){this.children.push(n);return n},set textContent(s){this.children=[];this.text=s}};nodes.push(node);return node}
 const c={el,Promise,todayStr:()=> '2026-11-03',histNice:d=>d,document:{querySelectorAll:()=>nodes.filter(n=>n.class==='schedule-wear-actions')},state:{tab:'saved',ofView:'history',edits:{},outfits:{look:{name:'Look',pieces:[{id:'a'},{id:'manual'}],plans}}},needDb:()=>false,byId:()=>pieces,byIdA:()=>pieces,toast:m=>messages.push(m),histDraw(){draws++}};
 c.state.db={commitWear:async changes=>{writes++;if(fail)throw Error('offline');changes.forEach(r=>{if(r.collection==='edits')pieces[r.id].wears=JSON.parse(JSON.stringify(r.value.wears))})}};
 vm.createContext(c);vm.runInContext(['wearPieceChange','commitWearAction','wearOutfit','unwearOutfit','histPlanWear'].map(fn).join('\n'),c);
 return {c,nodes,pieces,messages,plans,get writes(){return writes},get draws(){return draws},set fail(v){fail=v}};
}
function button(host){return host.children.find(n=>n.tag==='button')}
(async()=>{
 const f=fixture(),{c}=f;let popupRefresh=0;
 assert.equal(c.histPlanWear('look','2026-11-04'),null,'future plans cannot log wears');assert.equal(c.histPlanWear('missing','2026-11-02'),null);
 c.state.pub=true;assert.equal(c.histPlanWear('look','2026-11-02'),null);c.state.pub=false;
 const row=c.histPlanWear('look','2026-11-02'),popup=c.histPlanWear('look','2026-11-02',()=>popupRefresh++);
 assert.equal(button(row).text,'📅 I wore this');f.fail=true;assert.equal(await button(row).onclick(),false);assert.equal(button(row).text,'📅 I wore this');assert.equal(c.state.outfits.look.wearLog,undefined);assert.equal(f.draws,0);
 f.fail=false;const save=button(popup).onclick();assert.equal(button(row).disabled,true,'all copies are disabled during save');const duplicate=button(row).onclick();assert.equal(await duplicate,false);assert.equal(await save,true);assert.equal(f.writes,2,'failed request plus one successful retry only');
 for(const host of [row,popup]){assert.equal(button(host).text,'Undo');assert.equal(host.children[0].children[0].class,'setup-confirmed');assert.equal(host.children[0].children[1],'Worn')}
 assert.equal(popupRefresh,1);assert.equal(c.state.outfits.look.wearLog[0].d,'2026-11-02','logs the scheduled date, not today');assert.deepEqual(f.pieces.a.wears,['2026-11-02']);assert.deepEqual(JSON.parse(JSON.stringify(c.state.outfits.look.plans)),f.plans,'the plan is retained');
 const reloaded=c.histPlanWear('look','2026-11-02');assert.equal(button(reloaded).text,'Undo','persisted wears render as Worn on reopening');
 f.fail=true;assert.equal(await button(row).onclick(),false);assert.equal(button(row).text,'Undo','failed undo retains Worn');
 f.fail=false;assert.equal(await button(row).onclick(),true);assert.equal(button(row).text,'📅 I wore this');assert.deepEqual(f.pieces.a.wears,[]);assert.deepEqual(f.pieces.manual.wears,['2026-11-02'],'undo preserves independently logged pieces');assert.deepEqual(JSON.parse(JSON.stringify(c.state.outfits.look.plans)),f.plans);
 // The same rendered controls are present in the actual agenda's saved-plan branch.
 Object.assign(c,{ofMini:()=>c.el('img',{}),ClosetLintIcons:{node:()=>null},evMeta:()=>'',histNice:d=>d,histDateLabel:d=>d,histAddButton:()=>null,cardMenuButton:(name,items)=>c.el('button',{class:'test-menu',items})});vm.runInContext(fn('histAgendaDay'),c);
 const tree=c.histAgendaDay('2026-11-02',{'2026-11-02':[{oplan:true,id:'look',ev:{},name:'Look',outfits:[{...c.state.outfits.look,id:'look'}]}]},{},{},{},'2026-11-03',false);
 const walk=n=>typeof n==='object'&&n?[n,...(n.children||[]).flatMap(walk)]:[];
 assert.equal(walk(tree).filter(n=>n.class==='schedule-wear-actions').length,1);assert(!walk(tree).some(n=>n.tag==='button'&&walk(n).slice(1).some(child=>child.tag==='button')),'wear action is not nested in the outfit-opening button');
 const menu=walk(tree).find(n=>n.class==='test-menu');assert(menu,'scheduled outfit exposes its menu in the agenda');
 let editArgs,removed,confirmed=false;c.planOutfitDialog=(...args)=>{editArgs=args};c.askConfirm=(message,label,yes)=>{confirmed=true;return yes()};c.planRemove=async(id,pid)=>{removed=id;return true};
 const items=menu.items();assert.deepEqual(Array.from(items,x=>x.label),['Open outfit','Edit event','Delete event']);items.find(x=>x.label==='Edit event').action();assert.equal(editArgs[0],'look');assert.equal(editArgs[1],'2026-11-02');assert.equal(typeof editArgs[2],'function');assert.deepEqual(Object.keys(editArgs[3]),[]);
 items.find(x=>x.label==='Delete event').action();await Promise.resolve();assert(confirmed);assert.equal(removed,'look');
 const message={histNice:d=>d,Math:Object.create(Math)};vm.createContext(message);vm.runInContext(fn('outfitScheduledMessage'),message);
 message.Math.random=()=>.9;assert.equal(message.outfitScheduledMessage('2026-11-04',true),'Scheduled for 2026-11-04.');
 message.Math.random=()=>0;assert.equal(message.outfitScheduledMessage('2026-11-04',true),'Scheduled for 2026-11-04. A look to look forward to.');assert.equal(message.outfitScheduledMessage('2026-11-04',false),'Scheduled for 2026-11-04.','editing does not trigger a compliment');
 console.log('Schedule wear actions: date scope, public/future guards, pending and failed saves, duplicate clicks, shared controls, persisted Worn, safe Undo, plan retention, and occasional success copy pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
