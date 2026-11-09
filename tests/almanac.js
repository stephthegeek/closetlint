const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),A=require('../app/scripts/almanac');
const c={Date};vm.runInNewContext(fs.readFileSync(__dirname+'/../app/vendor/astronomy-2.1.19.js','utf8'),c);const Astro=c.Astronomy,city={latitude:37.7749,longitude:-122.4194,timezone:'America/Los_Angeles'};
assert.equal(A.version,'1.3.2');
const sky=day=>A.sky(Astro,city,day);
assert.equal(A.dayAt(new Date('2026-11-01T06:00:00Z'),city.timezone),'2026-10-31');
assert.equal(A.start('2026-11-01',city.timezone).toISOString(),'2026-11-01T07:00:00.000Z');
assert.equal(A.start('2026-11-02',city.timezone)-A.start('2026-11-01',city.timezone),25*3600000);
assert.equal(sky('2026-11-24').events[0].name,'Beaver Moon');assert.ok(sky('2026-11-24').lit>.99);
assert.equal(sky('2026-11-01').events[0].name,'Clocks fell back');assert.ok(sky('2026-11-01').sunsetMinutes<18*60);
assert.equal(sky('2026-12-21').events[0].name,'Winter solstice');assert.ok(sky('2026-12-21').daylight<9.6);
assert.equal(sky('2026-09-26').events[0].name,'Harvest Moon');
assert.equal(sky('2026-05-31').events[0].name,'Blue Moon');
assert.equal(A.sky(Astro,{...city,latitude:-33.86,longitude:151.2,timezone:'Australia/Sydney'},'2026-12-22').events.find(e=>e.kind==='season').name,'Summer solstice');
assert.ok(!sky('2026-08-12').events.some(e=>e.kind==='eclipse'&&e.name==='Solar eclipse'),'invisible solar eclipse excluded');
assert.ok(A.sky(Astro,{latitude:64.15,longitude:-21.94,timezone:'Atlantic/Reykjavik'},'2026-08-12').events.some(e=>e.name==='Solar eclipse'));
const polar=A.sky(Astro,{latitude:78.22,longitude:15.65,timezone:'Arctic/Longyearbyen'},'2026-12-21');assert.equal(polar.sunset,null);
assert.equal(polar.sunrise,null);assert.equal(polar.sunriseText,'No sunrise today');
for(const day of ['2026-10-31','2026-11-01','2026-11-02']){const s=sky(day),rise=Astro.SearchRiseSet('Sun',new Astro.Observer(city.latitude,city.longitude,0),1,A.start(day,city.timezone),1).date;assert.equal(s.sunrise,rise.toISOString());assert.equal(s.sunriseText,new Intl.DateTimeFormat(undefined,{timeZone:city.timezone,hour:'numeric',minute:'2-digit'}).format(rise));assert(s.sunrise<s.sunset)}
const days=A.loggedDays([{id:'a',colors:['purple'],wears:['2026-10-30']}],{o:{pieces:[{id:'a'}],wearLog:[{d:'2026-10-30',ids:['a']},{d:'2026-10-29',ids:['deleted']}]}},{});assert.equal(days['2026-10-30'].colors.purple,1);assert.ok(days['2026-10-29'].logged);
const t=A.tripRows({t:{settings:{start:'2026-11-01',end:'2026-11-03'},plan:{outfits:[{pin:1,fors:'d:2026-11-01'},{pin:0,fors:'d:2026-11-02'}]}}},'2026-10-31')[0];assert.equal(t.planned,1);assert.equal(t.days.length,3);
const base={city,items:[{id:'coat',name:'Favorite coat',fav:true,meta:'Outerwear',seasons:['Fall']}],days:{},trips:{},loved:[]},S=sky('2026-10-30');
const selected=A.choose(base,S,{});assert.equal(selected.type,'rising');assert.equal(selected.actions[0].kind,'piece');assert.deepEqual(A.choose(base,S,{}),selected);
const history={'2026-10-29':{type:'rising'},'2026-10-28':{type:'rising'}};assert.notEqual(A.choose(base,S,history).type,'rising');
assert.equal(A.choose(base,sky('2026-11-24'),{}).type,'big-full');
const unknown=A.choose({...base,items:[{id:'x',name:'Unknown age',date:'2020-10-30',acquiredDate:'',fav:false}]},S,{});assert.notEqual(unknown.type,'anniversary');assert.notEqual(unknown.type,'never');
const src=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');for(const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
console.log('Almanac: real lunar/solar dates, local DST, hemispheres, polar nights, eclipse visibility, wear deduplication, trip pins, deterministic selection, rotation and unknown acquisition dates pass.');
// Preview enumerates eligible readings without altering normal daily selection.
const previewData={...base,items:[{...base.items[0],acquiredDate:'2020-01-01'}]};
const previews=Array.from({length:8},(_,i)=>A.preview(previewData,S,i));
assert.notEqual(previews[0].headline,previews[1].headline);
assert.equal(new Set(previews.map(c=>c.headline)).size,2);
assert.deepEqual(A.choose(base,S,{}),selected);
const storage=new Map(),pctx={ClosetLintAlmanac:A,Astronomy:Astro,Date,URLSearchParams,Number,Object,JSON,Math,window:{location:{search:'?almanacPreview=1'}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},state:{profile:{},trips:{},db:{collection(){assert.fail('preview must not write daily history')}}},setupLoaded:Object.fromEntries(['edits','custom','outfits','outfitHistory','ratings','trips','profile','wishrank'].map(k=>[k,true])),profileSkySession:{},profileSkySaving:{},profileSkyPreviewIndex:null,profileLocation:()=>city,profileCardHeader:()=>({}),profileButton:()=>({}),profileMoon:()=>({}),profileWeatherBadge:()=>{},labRatingEntries:()=>[],allItems:()=>base.items,profileDays:()=>({}),byId:()=>({}),byIdA:()=>({}),realPhoto:()=>false,el:(tag,attrs,...children)=>({tag,attrs,children,appendChild(child){this.children.push(child);return child}})};
vm.createContext(pctx);const psrc=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8');vm.runInContext(psrc.slice(psrc.indexOf('function profileSkyThumbnail('),psrc.indexOf('\nfunction profileUnit()')),pctx);
const previewCard=pctx.profileSkyCard(),previewActions=previewCard.children.find(n=>n&&n.attrs&&n.attrs.class==='actions'),expectedActions=previews[0].actions.filter(a=>a.kind!=='color'&&a.kind!=='wish').slice(0,2).length;assert.equal(previewActions?previewActions.children.length:0,expectedActions,'preview retains real action children rather than an empty action wrapper');assert.equal(pctx.profileSkyPreviewIndex,0);pctx.profileSkyCard();assert.equal(pctx.profileSkyPreviewIndex,0,'redraw stays on same preview');pctx.profileSkyPreviewIndex=null;pctx.profileSkyCard();assert.equal(pctx.profileSkyPreviewIndex,1,'reload advances preview');assert.equal(Object.keys(pctx.profileSkySession).length,0);
console.log('Almanac preview: eligible-card cycling, unchanged daily selection, reload advance, stable redraw, and no daily-history writes pass.');

const Daily=require('../app/scripts/daily-card');
const offDuty=[{meta:'Underwear'},{meta:'Lingerie'},{meta:'Swimwear'},{meta:'Loungewear'},{meta:'Activewear'},{meta:'Costumes'},{section:'offduty'},{section:'sexy'},...['Bras','Panties','Panties & thongs','Shapewear','Slips & crinolines','Intimates','Bralettes','Teddies & bodysuits'].map(sub=>({meta:'Tops',sub}))];
for(const [i,tags] of offDuty.entries()){const piece={id:'excluded'+i,name:'Excluded piece',fav:true,acquiredDate:'2020-10-30',...tags};assert.equal(Daily.isActivePiece(piece),false);const data={...base,items:[piece],loved:[{ids:[piece.id]}]};assert.equal(A.choose(data,S,{}).type,'ambient');assert.equal(A.preview(data,S,4).type,'ambient')}
const eligible={id:'shirt',name:'Shirt',colors:['blue'],meta:'Tops'};const excluded=offDuty.slice(0,3).map((p,i)=>({...p,id:'x'+i,colors:['purple']}));const excludedDays={'2026-10-29':{ids:excluded.map(p=>p.id),colors:{purple:3}}};assert.equal(A.choose({...base,items:[eligible,...excluded],days:excludedDays},S,{}).type,'ambient','excluded colors cannot create a color signal');
console.log('Today’s Sky uses daily-card exclusions for pieces, loved outfits, storage candidates, and color evidence.');

// Portable app modules share a closure; the daily module is not a window property.
const browserScope={};vm.runInNewContext('(function(){'+fs.readFileSync(__dirname+'/../app/scripts/daily-card.js','utf8')+'\n'+fs.readFileSync(__dirname+'/../app/scripts/almanac.js','utf8')+'\n})();',browserScope);
assert.equal(browserScope.ClosetLintDaily,undefined,'daily module stays inside the app closure');
assert.equal(browserScope.ClosetLintAlmanac.choose(base,S,{}).type,selected.type);
assert.equal(browserScope.ClosetLintAlmanac.preview(previewData,S,1).type,previews[1].type);
console.log('Portable browser closure: Today’s Sky and previews resolve the shared daily-card eligibility rule.');
const pictured={id:'coat',name:'Favorite coat',photo:'/_blob/123',bg:'#f5f1ed'};pctx.byIdA=()=>({coat:pictured});pctx.realPhoto=p=>!!p.photo;pctx.photoThumbnail=src=>'thumb:'+src;pctx.el=(tag,attrs,...children)=>({tag,attrs,children});let opened;pctx.openEdit=p=>{opened=p};const thumb=pctx.profileSkyThumbnail({actions:[{kind:'piece',id:'coat'},{kind:'board',id:'coat'}]});assert.equal(thumb.children[0].attrs.src,'thumb:'+pictured.photo);assert.equal(thumb.attrs['aria-label'],'Open details for Favorite coat');thumb.attrs.onclick();assert.equal(opened,pictured);assert.equal(pctx.profileSkyThumbnail({actions:[{kind:'color',color:'blue'}]}),null);pctx.byIdA=()=>({});assert.equal(pctx.profileSkyThumbnail({actions:[{kind:'piece',id:'deleted'}]}),null);
console.log('Sky piece thumbnails use thumbnail photos, open current piece details, and omit missing or non-piece suggestions.');

// First-wear onboarding shares one start rule across menu, calendar and reminder badges.
{
 const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8'),ctx={state:{profile:{},tab:'all'},todayStr:()=> '2026-11-05',ClosetLintAlmanac:A,COLORS:{red:'#ff0000',blue:'#0000ff'},setInterval(){},document:{addEventListener(){}},window:{},setTimeout:f=>timers.push(f),toast:m=>messages.push(m)},timers=[],messages=[],writes=[];
 const node=(tag,attrs,...children)=>({tag,...attrs,style:{},children:children.filter(Boolean),setAttribute(k,v){this[k]=v},appendChild(n){this.children.push(n)}});
 ctx.el=node;let badge=false;ctx.$=()=>({classList:{toggle(k,v){badge=v}},setAttribute(){}});let days={};ctx.profileDays=()=>days;ctx.state.db={collection:()=>({doc:()=>({set:async value=>writes.push(value)})})};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function profileStartDay'),source.indexOf('function openProfile')),ctx);
 assert.equal(ctx.profileStartDay(days),null);ctx.profileBadge();assert.equal(badge,false);
 let header=ctx.profileMenuHeader(),left=header.children[0];assert.equal(left.tag,'button');assert.equal(left.children[1].class,'almanac-invite');let opened;ctx.closeAppMenu=()=>{};ctx.histDay=d=>opened=d;left.onclick({preventDefault(){}});assert.equal(opened,'2026-11-05');
 assert.equal(ctx.profileDayState('2026-11-02',days,'2026-11-05'),'before-start');assert.equal(ctx.profileSwatch('2026-11-02',days,'2026-11-05').textContent,'·');
 days={'2026-11-05':{colors:{red:1,blue:1}}};ctx.profileWearCommitted(true);timers.splice(0).forEach(f=>f());assert.deepEqual(messages,['Your first day in color.']);assert.equal(writes.length,1);assert.equal(ctx.state.profile['almanac-start'].day,'2026-11-05');ctx.profileBadge();assert.equal(badge,false,'yesterday before the first log does not need filling');
 header=ctx.profileMenuHeader();left=header.children[0];assert.equal(left.tag,'a');assert.match(left['aria-label'],/1 of 1 days/);assert.equal(left.children[1].children.filter(n=>n.class.includes('before-start')).length,6);
 assert.equal(ctx.profileSwatch('2026-11-05',days,'2026-11-05').style.background,'linear-gradient(135deg,#0000ff 50%,#ff0000 50%)');
 ctx.profileWearCommitted(true);assert.equal(timers.length,0,'repeated/retried saves do not celebrate twice');
 ctx.todayStr=()=> '2026-11-06';ctx.profileBadge();assert.equal(badge,true);header=ctx.profileMenuHeader();assert.equal(header.children[0].children[0].children[1].class,'almanac-reminder-dot');assert.match(header.children[0]['aria-label'],/wear log to fill in/);
 ctx.todayStr=()=> '2026-11-08';header=ctx.profileMenuHeader();const rolling=header.children[0].children[1].children;assert.equal(rolling.length,7);assert.equal(rolling[0]['data-day'],'2026-11-02');assert.equal(rolling[6]['data-day'],'2026-11-08');assert(rolling[6].class.includes('today'));assert(header.children[0]['aria-label'].includes('last 7 days'));
 days={};ctx.profileFirstWearAnnounced=false;assert.equal(ctx.profileStartDay(days),'2026-11-05','saved start survives removing every wear');ctx.profileWearCommitted(true);assert.equal(timers.length,0,'removing all wears cannot produce a celebration');
 ctx.state.profile={};days={'2026-10-31':{colors:{}}};ctx.profileWearCommitted(true);assert.equal(ctx.state.profile['almanac-start'].day,'2026-10-31','backdated first wear anchors its own date');
 assert.equal(ctx.profileDayState('2026-10-30',days,'2026-11-06'),'before-start');assert.equal(ctx.profileDayState('2026-11-01',days,'2026-11-06'),'missed');
 console.log('Almanac onboarding: invitation, first-log counts, specks, matching reminders, real colors, first toast once, backdating and deletion retention pass.');
}

(async()=>{
 const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');function fn(n){const a=html.indexOf('function '+n+'('),b=html.indexOf('\nfunction ',a+1);return html.slice(a,b)}
 let fail=true,announced=[],prepared=0;const c={Promise,console,state:{edits:{},flash:{},db:{collection:()=>({doc:()=>({set:async()=>{if(fail)throw Error('save failed')}})}),commitWear:async()=>{if(fail)throw Error('response lost')}}},needDb:()=>false,flashIds(){},toast(){},profileStartDay:()=>null,profileDays:()=>({}),profileWearCommitted:wasEmpty=>announced.push(wasEmpty)};
 vm.createContext(c);vm.runInContext(fn('patchEdit')+'\n'+fn('commitWearAction'),c);
 assert.equal(await c.patchEdit({id:'a'},{wears:['2026-10-28']},true),false);assert.equal(announced.length,0,'a failed piece save cannot celebrate');fail=false;assert.equal(await c.patchEdit({id:'a'},{wears:['2026-10-28']},true),true);assert.deepEqual(announced,[true]);
 announced=[];fail=true;const prepare=()=>{prepared++;return [{collection:'edits',id:'a',value:{wears:['2026-10-28']}}]};assert.equal(await c.commitWearAction('first',prepare,'Logged'),false);assert.equal(announced.length,0,'a failed outfit acknowledgement cannot celebrate');fail=false;assert.equal(await c.commitWearAction('first',prepare,'Logged'),true);assert.equal(prepared,1,'retry preserves the original action and first-wear state');assert.deepEqual(announced,[true]);
 console.log('Almanac first toast waits for successful piece/outfit acknowledgement and retained retries.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Transparent details are not a palette suggestion or a dominant color reading.
{
 const items=[{id:'black',meta:'Tops',colors:['black']},...['a','b','c'].map(id=>({id,meta:'Tops',colors:['clear','hot pink']}))];
 const days={'2026-10-29':{ids:['black'],colors:{black:1}}};const reading=A.choose({...base,items,days},S,{});
 assert.equal(reading.type,'color');assert.match(reading.body,/In the past 30 days, black appeared on 1 of 1 logged day/);assert(!reading.body.includes('clear'));assert(reading.body.includes('No wears logged in the past 14 days: hot pink.'));
 const transparentOnly=A.choose({...base,items:items.map(p=>({...p,colors:['clear']})),days:{'2026-10-29':{ids:items.map(p=>p.id),colors:{clear:4}}}},S,{});assert(!['color','drought'].includes(transparentOnly.type));
 console.log('Almanac palette wording names logged days plainly and never suggests clear as a color.');
}

(async()=>{
 const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8');function fn(n){const a=source.indexOf('function '+n+'('),b=source.indexOf('\nfunction ',a+1);return source.slice(a,b)}
 const timers=[],messages=[],real={profile:{'almanac-start':{day:'2020-01-01'}},outfits:{},tab:'all',db:{collection(){throw Error('Preview must never write')}}},before=JSON.stringify(real);
 const c={state:real,window:{location:{search:'?almanacFirstRun=1'}},URLSearchParams,ClosetLintAlmanac:A,profilePreviewDays:{},profilePreviewOutfits:{},profilePreviewCelebrated:false,todayStr:()=> '2026-11-01',byIdA:()=>({a:{id:'a',colors:['blue'],wish:false}}),profileBadge(){},setTimeout:f=>timers.push(f),toast:m=>messages.push(m),Promise};
 vm.createContext(c);vm.runInContext(['profileFirstRunPreview','profileDays','profileStartDay','profilePreviewWear','profileWearCommitted'].map(fn).join('\n'),c);
 assert.equal(c.profileFirstRunPreview(),true);assert.equal(Object.keys(c.profileDays()).length,0);assert.equal(c.profileStartDay(c.profileDays()),null,'real start marker is hidden only in preview');await c.profilePreviewWear('2026-11-01',['a'],{id:'look',pieces:[{id:'a'}]});timers.splice(0).forEach(f=>f());assert.equal(c.profileDays()['2026-11-01'].colors.blue,1);assert.equal(messages[0],'Your first day in color.');c.profileWearCommitted(true);assert.equal(JSON.stringify(real),before,'preview and its success hook leave all real state unchanged');await c.profilePreviewWear('2026-11-02',['a']);assert(!c.profileDays()['2026-11-02'],'future previews do not log a wear');assert.equal(JSON.stringify(real),before);
 console.log('Almanac first-run preview: URL scope, isolated colors, first toast and no real wardrobe/profile writes pass.');
})().catch(e=>{console.error(e);process.exitCode=1});

{
 const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8');function fn(n){const a=source.indexOf('function '+n+'('),b=source.indexOf('\nfunction ',a+1);return source.slice(a,b)}
 const colors=vm.runInNewContext(fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8').match(/var COLORS=(\{[^\n]+\});/)[1].replace(/^/,'(')+')');
 const c={COLORS:colors,closetRouteHref:r=>'#/closet?color='+encodeURIComponent(r.color),el:(tag,attrs)=>({tag,...attrs,children:[],appendChild(n){this.children.push(n)}})};vm.createContext(c);const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');vm.runInContext(html.slice(html.indexOf('function colorTagPaint('),html.indexOf('function clamp(',html.indexOf('function colorTagPaint(')))+fn('profileColorInk')+'\n'+fn('profilePaletteText'),c);
 const body=c.profilePaletteText('You wore black. Try hot pink or purple for a change.'),links=body.children.filter(n=>n.tag==='a');assert.equal(links.length,3);assert.equal(links[1].text,'hot pink');assert.equal(links[1].href,'#/closet?color=hot%20pink');assert.equal(c.profilePaletteText('<img src=x> blackberry').children.filter(n=>n.tag==='a').length,0,'whole color names only; text is not HTML');
 const separated=c.profilePaletteText('In the past 30 days, black appeared on 12 of 20 logged days. No wears logged in the past 14 days: beige and purple.');
 const breakAt=separated.children.findIndex(n=>n.tag==='br');assert(breakAt>0);assert.equal(separated.children.filter(n=>n.tag==='br').length,1);assert(separated.children[breakAt+1].text.startsWith('No wears logged'));assert.equal(separated.children.filter(n=>n.tag==='a').length,3,'line break preserves color links');assert(!body.children.some(n=>n.tag==='br'),'other sentences remain inline');
 function lum(hex){const c=[1,3,5].map(i=>{const s=parseInt(hex.slice(i,i+2),16)/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722}
 for(const hex of Object.values(colors).filter(x=>/^#[0-9a-f]{6}$/i.test(x))){const l=lum(hex),ink=lum(c.profileColorInk(hex));assert((Math.max(l,ink)+.05)/(Math.min(l,ink)+.05)>=4.5,'solid color pill must meet contrast')}
 console.log('Almanac color links: whole names, native filtered URLs, safe text and measured contrast for every solid palette color pass.');
}

for(let i=0;i<30;i++){const previousDay=A.shift(S.date,-1),first=A.choose(base,S,{});const next=A.choose(base,S,{[previousDay]:first});assert.notEqual(next.type,first.type,'Almanac avoids yesterday’s type');}
const emptyBase={...base,items:[],days:{},loved:[],trips:{}};
assert.notEqual(A.choose(emptyBase,S,{[A.shift(S.date,-1)]:{type:'ambient'}}).type,'ambient');
// A color trend, a neglected color, and a seasonal color return share one subject.
{
 const date='2026-11-03',sky={date,events:[],angle:80,lit:.4,daylight:11,sunsetMinutes:19*60,sunsetText:'7 PM'},yesterday=A.shift(date,-1);
 const pieces=[{id:'black',name:'Black top',meta:'Tops',colors:['black'],acquiredDate:'2020-01-01'},...Array.from({length:3},(_,i)=>({id:'beige'+i,name:'Beige piece '+i,meta:'Bottoms',colors:['beige'],acquiredDate:'2020-01-01'}))];
 const data={city,items:pieces,days:{'2026-11-01':{ids:['black'],colors:{black:1}}},trips:{},loved:[]},before=JSON.stringify(data);
 assert.equal(A.choose(data,sky,{}).type,'color');
 for(const prior of [{type:'color'},{type:'drought'},{type:'seasonal',seasonal:{id:'color:black'}},{type:'big-full',actions:[{kind:'color',color:'black'}]},{type:'big-clock',readingType:'drought'},{card:{type:'drought'}}]){
  const chosen=A.choose(data,sky,{[yesterday]:prior});assert.equal(chosen.type,'never','choose a different subject rather than another color story');
 }
 const dry={...data,days:{}};assert.equal(A.choose(dry,sky,{}).type,'drought');assert.equal(A.choose(dry,sky,{[yesterday]:{type:'color'}}).type,'never','the reverse color-to-drought order is excluded too');
 const onlyColors={...data,items:pieces.map(p=>({...p,acquiredDate:undefined}))};assert.equal(A.choose(onlyColors,sky,{[yesterday]:{type:'drought'}}).type,'ambient','use the sky fallback when no different wardrobe topic is available');
 assert.equal(A.cardFamily({type:'seasonal',seasonal:{id:'boots'}}),'seasonal','seasonal garments retain their separate subject');
 assert.equal(A.cardFamily({type:'big-full',readingType:'rising'}),'rising');assert.equal(A.cardFamily(null),null);
 const special=A.choose(data,{...sky,events:[{kind:'clock',name:'Clocks fell back'}]},{[yesterday]:{type:'color'}});assert.equal(special.type,'big-clock');assert.equal(special.readingType,'never','real sky headlines retain the underlying subject for tomorrow');
 let history={},last=null;for(let i=0;i<25;i++){const day=A.shift(date,i),card=A.choose(data,{...sky,date:day},history);assert.notEqual(A.cardFamily(card),last,'consecutive days vary subjects');history[day]=card;last=A.cardFamily(card)}
 assert.equal(JSON.stringify(data),before,'selection does not rewrite wardrobe evidence');
 // Recheck both database and in-memory choices, then settle after one replacement.
 const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8'),key=[date,city.latitude,city.longitude,city.timezone].join('|'),repeated={type:'drought',headline:'Let beige have a turn.',body:'Three pieces without a logged wear.',actions:[{kind:'color',color:'beige',label:'Show beige'}]},writes=[];
 const state={profile:{'sky-daily':{[yesterday]:{card:{type:'color'}},[date]:{algorithmVersion:A.version,cityKey:key,card:repeated}}},trips:{},db:{collection:()=>({doc:()=>({set:next=>{writes.push(next);state.profile['sky-daily']=next;return Promise.resolve()}})})}};
 const ctx={Date,URLSearchParams,window:{location:{search:''}},state,ClosetLintAlmanac:{...A,dayAt:()=>date,sky:()=>sky},Astronomy:{},el:(tag,attrs,...children)=>({tag,...attrs,children,appendChild(n){this.children.push(n)}}),setupLoaded:Object.fromEntries(['edits','custom','outfits','outfitHistory','ratings','trips','profile','wishrank'].map(k=>[k,true])),profileSkySession:{},profileSkySaving:{},profileSkyPreviewIndex:null,profileLocation:()=>city,profileCardHeader:()=>({}),profileButton:()=>({}),profileMoon:()=>({}),profileWeatherBadge:()=>{},profileFirstRunPreview:()=>false,allItems:()=>pieces,profileDays:()=>data.days,labRatingEntries:()=>[],byIdA:()=>Object.fromEntries(pieces.map(p=>[p.id,p])),realPhoto:()=>false};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function profileSkyThumbnail('),source.indexOf('\nfunction profileUnit()')),ctx);ctx.profileSkyWishlist=()=>({});
 ctx.profileSkyCard();assert.equal(writes.length,1,'replace a current-version cached reading that repeats yesterday’s subject');assert.equal(state.profile['sky-daily'][date].card.type,'never');assert.equal(state.profile['sky-daily'][yesterday].card.type,'color','retain yesterday unchanged');ctx.profileSkyCard();assert.equal(writes.length,1,'replacement stays stable on redraw');
 delete state.profile['sky-daily'][date];ctx.profileSkySession[key]=repeated;ctx.profileSkyCard();assert.equal(writes.length,2,'a repeated session choice is also replaced');assert.equal(state.profile['sky-daily'][date].card.type,'never');
 // A saved card must also be refreshed when the last color story was two days ago.
 state.profile['sky-daily'][A.shift(date,-2)]={card:{type:'color'}};
 state.profile['sky-daily'][yesterday]={card:{type:'rising'}};
 state.profile['sky-daily'][date]={algorithmVersion:A.version,cityKey:key,card:repeated};
 ctx.profileSkySaving={};ctx.profileSkySession={};ctx.profileSkyCard();assert.equal(writes.length,3,'cached alternate-day color story is replaced');assert.equal(state.profile['sky-daily'][date].card.type,'never');ctx.profileSkyCard();assert.equal(writes.length,3,'replacement settles without a write loop');

}
console.log('Almanac daily variety: shared color subject, yesterday exclusion, special-date reading history, consecutive days, and empty-closet fallback pass.');

// Calendar/menu/export colors use saved swatches, with per-piece tag fallback.
{
 const pieces=[{id:'swatched',colors:['red'],sw:['#123456','#AbCdEf','#123456'],wears:['2026-11-02']},{id:'fallback',colors:['blue'],wears:['2026-11-02']},{id:'invalid',colors:['green'],sw:['not-a-color','url(bad)']},{id:'short',colors:['red'],sw:['#AbC']}];
 const before=JSON.stringify(pieces),rows=A.loggedDays(pieces,{look:{pieces:[{id:'swatched'},{id:'fallback'}],wearLog:[{d:'2026-11-02'}]}},{old:{pieces:[{id:'short'},{id:'invalid'},{id:'missing'}],wearLog:[{d:'2026-11-01'}]}});
 assert.equal(rows['2026-11-02'].swatches['#123456'],1,'a saved swatch and piece/date each count once');assert.equal(rows['2026-11-02'].swatches['#abcdef'],1);assert.equal(rows['2026-11-02'].fallbackColors.red,undefined,'tag colors do not join a swatched piece');assert.equal(rows['2026-11-02'].fallbackColors.blue,1,'unswatched piece contributes tag fallback');assert.equal(rows['2026-11-02'].colors.red,1,'Sky tag evidence remains available independently');assert.equal(rows['2026-11-01'].swatches['#aabbcc'],1);assert.equal(rows['2026-11-01'].fallbackColors.green,1);assert.equal(JSON.stringify(pieces),before);
 const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8'),start=source.indexOf('function profileDayColors('),end=source.indexOf('\nfunction profileSwatch(',start),ctx={ClosetLintAlmanac:A,COLORS:{red:'#ff0000',blue:'#0000ff',green:'#00ff00'}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const saved={swatches:{'#123456':2,'#abcdef':1},fallbackColors:{},colors:{red:20}};assert.deepEqual(Array.from(ctx.profileDayColors(saved)),['#123456','#abcdef']);assert.deepEqual(Array.from(ctx.profileDayColors(rows['2026-11-02'])),['#0000ff','#123456','#abcdef']);assert.deepEqual(Array.from(ctx.profileDayColors({swatches:{},fallbackColors:{blue:1},colors:{red:2}})),['#0000ff']);assert.deepEqual(Array.from(ctx.profileDayColors({swatches:{},fallbackColors:{},colors:{red:2}})),[],'no usable palette remains a neutral logged marker');
 console.log('Almanac swatches: exact saved hex colors, tag fallback only for unswatched pieces, valid hex normalization, wear deduplication, archives, and unchanged Sky tag evidence pass.');
}
(async()=>{
 const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8');function fn(name){const a=source.indexOf('function '+name+'('),b=source.indexOf('\nfunction ',a+1);return source.slice(a,b)}
 const fills=[],downloads=[],draw={measureText:s=>({width:s.length*10}),fillText(){},fillRect(){fills.push(this.fillStyle)},save(){},restore(){},beginPath(){},arc(){},clip(){},moveTo(){},lineTo(){},fill(){fills.push(this.fillStyle)},stroke(){},setLineDash(){}},canvas={getContext:()=>draw,toBlob:fn=>fn({type:'image/png'})},c={ClosetLintAlmanac:A,COLORS:{red:'#ff0000'},state:{profile:{},downloads:{save:async p=>downloads.push(p)}},document:{createElement:()=>canvas,documentElement:{}},getComputedStyle:()=>({getPropertyValue:k=>k==='--bg'?'#222222':'#eeeeee'}),todayStr:()=> '2026-11-02',profileStartDay:()=> '2026-11-02',toast:m=>assert.fail(m),Promise,Date,Math,setTimeout,clearTimeout,profilePhotoPalette:row=>({row,pending:[]})};
 vm.createContext(c);vm.runInContext(fn('profileDayColors')+'\n'+source.slice(source.indexOf('function profileExportDays('),source.indexOf('async function profileExportMonth('))+'\nasync '+fn('profileExportMonth'),c);await c.profileExportMonth('2026-11',{'2026-11-02':{swatches:{'#123456':1,'#abcdef':1},fallbackColors:{},colors:{red:1}}});assert(fills.includes('#123456')&&fills.includes('#abcdef'));assert(!fills.includes('#ff0000'),'export cannot use the tag color of a swatched piece');assert.equal(downloads[0].filename,'my-month-in-color-2026-11.png');
 console.log('Almanac month PNG and UI share the exact same swatch selection.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Automatic swatches resolve existing rows in place, without rewriting wear or piece records.
(async()=>{
 const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8');function fn(n){const a=source.indexOf('function '+n+'('),tail=source.slice(a),next=tail.slice(1).search(/\n(?:async )?function /);return next<0?tail:tail.slice(0,next+1)}
 let finish;const pending=new Promise(r=>finish=r),pieces={saved:{id:'saved',sw:['#123456'],colors:['red']},auto:{id:'auto',photo:'photo',colors:['green']},empty:{id:'empty',photo:'bad',colors:['blue']}};
 const row={ids:['saved','auto','empty'],colors:{red:1,green:1,blue:1}},before=JSON.stringify(pieces),cache={'auto|photo':{v:null,promise:pending},'empty|bad':{v:[]}};
 const c={ClosetLintAlmanac:A,COLORS:{red:'#ff0000',green:'#00ff00',blue:'#0000ff'},byIdA:()=>pieces,swCache:cache,swOf:p=>p.sw||cache[p.id+'|'+p.photo].v||[],el:(tag,attrs)=>({...attrs,style:{}}),profileDayState:()=> 'logged',Promise,setTimeout,clearTimeout};vm.createContext(c);
 vm.runInContext(['profilePhotoPalette','profilePaintSwatch','profileDayColors','profilePaintSwatches','profileSwatch','profileExportDays'].map(fn).join('\n'),c);
 const node=c.profileSwatch('2020-01-01',{'2020-01-01':row},'2026-11-02');assert.equal(node.style.visibility,'hidden','pending photos never expose temporary tag colors');assert.equal(node.style.background,undefined);let done=false;const exported=c.profileExportDays('2020-01',{'2020-01-01':row}).then(v=>{done=true;return v});await Promise.resolve();assert.equal(done,false,'export waits for automatic swatches');
 cache['auto|photo'].v=['#987654'];finish();const ready=await exported;await Promise.resolve();assert(!node.style.background.includes('#00ff00'),'the first visible paint uses photo swatches');assert.equal(node.style.visibility,'');assert.equal(ready['2020-01-01'].swatches['#987654'],1);assert.equal(ready['2020-01-01'].fallbackColors.green,undefined);assert.equal(ready['2020-01-01'].fallbackColors.blue,1,'failed photo keeps tag fallback');assert.equal(ready['2020-01-01'].colors.green,1,'Sky evidence remains tagged');assert.equal(JSON.stringify(pieces),before,'automatic sampling never writes piece swatches');
 const counts=A.paletteCounts([pieces.auto,pieces.auto,pieces.empty],p=>c.swOf(p));assert.equal(counts.swatches['#987654'],1,'piece palette is counted once');assert.equal(counts.fallbackColors.blue,1);
 let deadline;const stalled={...c,setTimeout:f=>{deadline=f;return 1},clearTimeout(){},profilePhotoPalette:row=>({row,pending:[new Promise(()=>{})]})};vm.createContext(stalled);vm.runInContext(fn('profileExportDays'),stalled);const fallback=stalled.profileExportDays('2020-01',{'2020-01-01':row});deadline();assert.equal((await fallback)['2020-01-01'].colors.green,1,'stalled photo cannot block export');
 console.log('Automatic photo swatches: historical days repaint, export waits with bounded fallback, failed photos retain tags, shared cache resolves, deduplication and no piece writes pass.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Editorial headings refresh old saved readings without changing their evidence.
{
 const cases=[
  [{type:'color',headline:'Colors in recent wear logs.',body:'In the past 30 days, purple appeared on 10 of 22 logged days. No wears logged in the past 14 days: green.'},'Purple keeps finding its way into your days.'],
  [{type:'color',headline:'Colors in rotation.',body:'In the past 30 days, hot pink appeared on 1 of 1 logged day. No wears logged in the past 14 days: blue.'},'A little hot pink in the mix.'],
  [{type:'ahead',headline:'A little planning for A weekend away.',body:'A weekend away starts in 10 days. Saturday still needs an outfit.'},'A weekend away is on the horizon.'],
  [{type:'swap',headline:'A season is waiting in storage.',body:'14 winter pieces are still in storage. See what wants to come back.'},'Winter is waiting in the wings.'],
  [{type:'dark',headline:'An early sunset, a good evening for layers.',body:'The light goes early. Bring the layer you’ll want on the way home.'},'An early dusk. A layer worth bringing.'],
  [{type:'daylight',headline:'The light over your closet.',body:'Sunset today is 5:10 PM.'},'The last light comes at 5:10 PM.'],
  [{type:'daylight',headline:'The light over your closet.',body:'Sunset today is No sunset today.'},'The light is keeping its own hours.']
 ];
 for(const [record,expected] of cases){record.actions=[{kind:'color',color:'green'}];const before=JSON.stringify(record);Object.freeze(record);assert.equal(A.headline(record),expected);assert.equal(JSON.stringify(record),before,'display copy leaves saved body, actions, and selection untouched')}
 for(const type of ['rising','never','anniversary','drought','taste','ambient','big-full','big-new','big-clock','big-season','big-eclipse','big-earliest']){const card={type,headline:'A specific reading.',body:'Original detail.'};assert.equal(A.headline(card),card.headline)}
 assert.equal(A.headline({type:'color',headline:'Colors in rotation.',body:'Unknown older format.'}),'Colors in rotation.','unrecognized saved evidence keeps its original title');
 console.log('Almanac editorial headings: personal color, trip, storage, dusk, and daylight readings refresh saved titles; body copy, actions, selection, and specific sky/piece titles stay intact.');
}

// Anniversary candidates need real significance and a durable alternate-year feature gap.
{
 const day='2026-10-30',favorite={id:'birthday',name:'Velvet skirt',meta:'Bottoms',fav:true,acquiredDate:'2020-10-30'},data=p=>({...base,items:[p],days:A.loggedDays([p],{},{}),anniversaries:{}}),pick=p=>A.choose(data(p),S,{});
 assert.equal(pick(favorite).type,'anniversary');assert.equal(pick({...favorite,fav:false}).type,'never','random old purchases are not birthday candidates');
 const hot={...favorite,fav:false,wears:['2022-03-01','2022-03-12','2022-03-30']};assert.equal(pick(hot).type,'anniversary');assert.equal(pick(hot).anniversary.reason,'past-hot','historical hot badge qualifies without consecutive days');
 const sparse={...hot,wears:['2022-03-01','2022-04-01','2022-05-01']};assert.notEqual(pick(sparse).type,'anniversary');
 const worn={...favorite,fav:false,wears:Array.from({length:10},(_,i)=>A.shift('2020-11-01',i*60))};assert.equal(pick(worn).anniversary.reason,'well-worn');
 assert.equal(A.anniversaryReason({...favorite,fav:false,wears:['2026-10-30','2026-10-30','2026-11-01','invalid']},[],day),null,'duplicate, future, and malformed dates do not manufacture significance');
 for(const tags of offDuty)assert.notEqual(pick({...favorite,...tags}).type,'anniversary','daily card exclusions apply to every significance reason');
 const prior={'birthday':{day:'2025-10-30',acquiredDate:favorite.acquiredDate}};
 assert.notEqual(A.choose({...data(favorite),anniversaries:prior},S,{}).type,'anniversary','skip a piece featured last year');prior.birthday.day='2024-10-30';assert.equal(A.choose({...data(favorite),anniversaries:prior},S,{}).type,'anniversary','two years is enough, without five-year milestones');
 const card=pick(favorite),history=A.dailyHistory({},day,'city',card),before=JSON.stringify(history);assert.equal(history[day].algorithmVersion,A.version);assert.equal(history._anniversaries.birthday.day,day);assert.equal(A.validCard(card,{...data(favorite),anniversaries:A.anniversaryHistory(history)},day),true,'same-day refresh retains its qualified reading');
 const rolling=A.dailyHistory(history,'2027-12-01','city',{type:'ambient',actions:[]});assert.equal(rolling._anniversaries.birthday.day,day);assert.equal(JSON.stringify(history),before,'building history does not mutate loaded profile records');
 let older={};for(let i=0;i<40;i++)older=A.dailyHistory(older,A.shift('2027-01-01',i),'city',{type:'ambient',actions:[]});older._anniversaries=history._anniversaries;const pruned=A.dailyHistory(older,'2027-03-01','city',{type:'ambient',actions:[]});assert(Object.keys(pruned).filter(k=>/^\d/.test(k)).length<=32);assert.equal(pruned._anniversaries.birthday.day,day,'anniversary memory survives short daily-history pruning');
 const legacy={'2024-10-30':{card:{type:'anniversary',body:'It arrived on 2020-10-30. Take it out for its birthday.',actions:[{kind:'piece',id:'birthday'}]}}};assert.equal(A.anniversaryHistory(legacy).birthday.day,'2024-10-30','retained older birthday cards seed durable history');
 const moon=sky('2026-11-24'),fullPiece={...favorite,acquiredDate:'2020-11-24'},special=A.choose({...data(fullPiece),city},moon,{});assert.equal(special.type,'big-full');assert.equal(A.dailyHistory({},moon.date,'city',special)._anniversaries.birthday.day,moon.date,'special sky headlines retain the inherited anniversary feature');
 assert.equal(A.validCard(card,data({...favorite,meta:'Underwear'}),day),false,'cached birthdays cannot bypass exclusions');assert.equal(A.validCard(card,data({...favorite,fav:false}),day),false,'cached birthdays need current significance');assert.equal(A.validCard({type:'ahead',actions:[{kind:'trip',id:'trip-id'}]},data(favorite),day),true,'trip IDs are not mistaken for garment IDs');
 console.log('Anniversary 1.2.0: favorite, historical hot, lifetime wears, shared exclusions, alternate-year gap, legacy history, durable pruning, special sky inheritance, and cached-card validation pass.');
}

// One grouped daily palette supplies four calendar sectors and the menu's two-color prefix.
{
 const pieces=[{id:'one',sw:['#315b9a','#325c9b','#335d9c']},{id:'two',sw:['#cf252b']},{id:'three',sw:['#cf252b']},{id:'four',sw:['#f5f1e8']},{id:'five',sw:['#17191c']}],row=A.paletteCounts(pieces),before=JSON.stringify(row),palette=A.dayPalette(row,{},4);
 assert.equal(palette.length,4);assert.equal(palette[0],'#cf252b','a group receives one vote per piece, not per similar swatch');assert.equal(palette.filter(c=>['#315b9a','#325c9b','#335d9c'].includes(c)).length,1,'nearby blues share one slot');assert.deepEqual(A.dayPalette(row,{},2),palette.slice(0,2),'menu always uses the same leading groups');assert.equal(JSON.stringify(row),before,'palette grouping never rewrites saved swatches or evidence');assert.deepEqual(A.dayPalette(A.paletteCounts(pieces.slice().reverse()),{},4),palette,'piece order cannot change representatives or group order');
 assert.equal(A.dayPalette({swatches:{'#f5f1e8':1,'#f8f4eb':1},fallbackColors:{}},{},4).length,1,'nearby light neutrals group');assert.equal(A.dayPalette({swatches:{'#777777':1,'#818181':1,'#8b8b8b':1}}, {},4).length,2,'similarity chains cannot merge visibly different ends');
 const fallback=A.paletteCounts([{id:'auto',sw:['#315b9a'],colors:['red']},{id:'tag',colors:['blue']},{id:'dark',sw:['#17191c']}]);assert.equal(A.dayPalette(fallback,{blue:'#325c9b',red:'#cf252b'},4).length,2,'tag fallback can join a nearby photo swatch group');assert(!A.dayPalette(fallback,{blue:'#325c9b',red:'#cf252b'},4).includes('#cf252b'),'swatched piece tags stay out of its palette');
 assert.deepEqual(A.dayPalette({swatches:{'url(bad)':4,'#ffffff':0},fallbackColors:{unknown:4}},{}),[]);assert.equal(A.swatchBackground(palette.slice(0,1)),palette[0]);assert(A.swatchBackground(palette.slice(0,2)).startsWith('linear-gradient(135deg,'));assert(A.swatchBackground(palette.slice(0,3)).includes('120deg'));assert(A.swatchBackground(palette).includes('270deg 360deg'));assert.equal(A.paletteVersion,3);
 console.log('Daily palette v2: perceptual grouping, no shade chaining, per-piece votes, exact representatives, four sectors, two-color menu prefix, tag fallback, and immutable swatches pass.');
}

// A failed history save can retry on redraw without losing the anniversary memory.
(async()=>{
 const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8'),piece={id:'special',name:'Special skirt',meta:'Bottoms',fav:true,acquiredDate:'2020-10-30'},writes=[],messages=[];let fail=true;
 const ctx={ClosetLintAlmanac:A,Astronomy:Astro,Date,URLSearchParams,Number,Object,JSON,Math,window:{location:{search:''}},state:{profile:{},trips:{},db:{collection:()=>({doc:()=>({set:async next=>{writes.push(JSON.parse(JSON.stringify(next)));if(fail)throw Error('offline');ctx.state.profile['sky-daily']=JSON.parse(JSON.stringify(next))}})})}},setupLoaded:Object.fromEntries(['edits','custom','outfits','outfitHistory','ratings','trips','profile','wishrank'].map(k=>[k,true])),profileSkySession:{},profileSkySaving:{},profileSkyPreviewIndex:null,profileLocation:()=>city,profileCardHeader:()=>({}),profileButton:()=>({}),profileMoon:()=>({}),profileWeatherBadge:()=>{},profileFirstRunPreview:()=>false,labRatingEntries:()=>[],allItems:()=>[piece],profileDays:()=>A.loggedDays([piece],{},{}),byId:()=>({}),byIdA:()=>({}),realPhoto:()=>false,toast:t=>messages.push(t),el:(tag,attrs,...children)=>({tag,attrs,children,appendChild(child){this.children.push(child);return child}})};
 const FixedDate=class extends Date{constructor(...args){super(...(args.length?args:['2026-10-30T12:00:00-07:00']))}};ctx.Date=FixedDate;
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function profileSkyThumbnail('),source.indexOf('\nfunction profileUnit()')),ctx);
 ctx.profileSkyCard();await Promise.resolve();await Promise.resolve();assert.equal(writes.length,1);assert.equal(ctx.state.profile['sky-daily'],undefined,'failed writes do not pretend durable history is saved');assert.equal(messages.length,1);
 fail=false;ctx.profileSkyCard();await Promise.resolve();assert.equal(writes.length,2,'redraw retries a failed history save even when the selected card is in session');assert.equal(ctx.state.profile['sky-daily']._anniversaries.special.day,'2026-10-30');
 ctx.profileSkyCard();await Promise.resolve();assert.equal(writes.length,2,'a valid saved reading does not write repeatedly');piece.meta='Underwear';ctx.profileSkyCard();await Promise.resolve();assert.equal(writes.length,3,'newly excluded cached piece is replaced');assert.notEqual(writes.at(-1)['2026-10-30'].card.type,'anniversary');assert.equal(writes.at(-1)._anniversaries.special.day,'2026-10-30','reroll retains prior feature history');
 console.log('Sky history persistence: failed-save retry, successful reload data, no duplicate save, cached exclusions, and retained anniversary memory pass.');
})().catch(e=>{console.error(e);process.exitCode=1});

// The PNG uses the same ranked colors and equal sectors as the large calendar.
(async()=>{
 const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8');function fn(name){const a=source.indexOf('function '+name+'('),b=source.slice(a+1).search(/\n(?:async )?function /);return source.slice(a,b<0?undefined:a+b+1)}
 const sectors=[],downloads=[],draw={measureText:s=>({width:s.length*10}),fillText(){},fillRect(){},save(){},restore(){},beginPath(){},arc(...a){if(a[4]-a[3]<Math.PI*2-1e-9)sectors.push({color:this.fillStyle,start:a[3],end:a[4]})},clip(){},moveTo(){},lineTo(){},fill(){},stroke(){},setLineDash(){}},canvas={getContext:()=>draw,toBlob:f=>f({type:'image/png'})};
 const ctx={ClosetLintAlmanac:A,COLORS:{},state:{profile:{},downloads:{save:async p=>downloads.push(p)}},document:{createElement:()=>canvas,documentElement:{}},getComputedStyle:()=>({getPropertyValue:k=>k==='--bg'?'#222222':'#eeeeee'}),todayStr:()=> '2026-11-02',profileStartDay:()=> '2026-11-02',toast:m=>assert.fail(m),Promise,Date,Math,setTimeout,clearTimeout,profilePhotoPalette:row=>({row,pending:[]})};
 vm.createContext(ctx);vm.runInContext(['profileDayColors','profileExportDays','profileExportMonth'].map(n=>(n==='profileExportMonth'?'async ':'')+fn(n)).join('\n'),ctx);
 const row={swatches:{'#17191c':1,'#315b9a':1,'#cf252b':1,'#f5f1e8':1},fallbackColors:{}};await ctx.profileExportMonth('2026-11',{'2026-11-02':row});assert.equal(sectors.length,4);assert.deepEqual(sectors.map(s=>s.color),A.dayPalette(row,{},4));sectors.forEach(s=>assert(Math.abs(s.end-s.start-Math.PI/2)<1e-9));assert.equal(downloads.length,1);
 console.log('Calendar PNG: all four shared palette colors render in equal, clockwise quarter sectors.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Garment importance outranks accessory volume, and metals need jewelry-only evidence.
{
 const tags={teal:'#1e9c9c',burgundy:'#7a1f3d',orange:'#ee8a2e',blue:'#3c78d8',gold:'#cfa93c',silver:'#bfc5cc',gray:'#8a9096',beige:'#d9c7a8'},core={id:'top',meta:'Tops',colors:['teal'],sw:[tags.teal]},coat={id:'coat',meta:'Outerwear',colors:['burgundy'],sw:[tags.burgundy]},shoes={id:'shoes',meta:'Footwear',colors:['orange'],sw:[tags.orange]},accessories=Array.from({length:8},(_,i)=>({id:'accessory'+i,meta:'Jewelry',colors:['blue'],sw:[tags.blue]}));
 const pieces=[...accessories,shoes,coat,core],palette=A.dayPalette(A.paletteCounts(pieces),tags,4);assert.deepEqual(palette,[tags.teal,tags.burgundy,tags.orange,tags.blue],'main pieces, outer layer, shoes, then accessories, even with eight blue accessories');assert.deepEqual(A.dayPalette(A.paletteCounts(pieces),tags,2),palette.slice(0,2));
 const cardigan={...coat,meta:'Tops',sub:'Sweaters',kind:'cardigan'},mainCardigan={...cardigan,id:'main-cardigan',labAs:'top'};assert.deepEqual(A.paletteCounts([cardigan,mainCardigan,shoes]).palettes.map(p=>p.priority),[1,0,2],'upper layer defaults respect an explicit main-top role');
 const greyCore={id:'grey-top',meta:'Tops',colors:['gray'],sw:[tags.gray]},nearAccessories=accessories.map(p=>({...p,colors:['gray'],sw:['#8b9197']}));assert.equal(A.dayPalette(A.paletteCounts([greyCore,...nearAccessories]),tags,4)[0],tags.gray,'a grouped shade is represented by its main garment, not the accessory majority');
 const gold={id:'gold',meta:'Jewelry',colors:['gold'],sw:['#ba963a']},silver={id:'silver',meta:'Jewelry',colors:['silver'],sw:['#aab1ba']};assert.deepEqual(A.dayPalette(A.paletteCounts([core,gold,silver]),tags,4),[tags.teal],'metal photo swatches are excluded on mixed clothing/jewelry days');
 const gem={id:'gem',meta:'Jewelry',colors:['gold','blue'],sw:[tags.gold,tags.blue]};assert.deepEqual(A.dayPalette(A.paletteCounts([core,gem]),tags,4),[tags.teal,tags.blue],'a nonmetal gem survives while its gold portion is excluded');
 const jewelry=[gem,...Array.from({length:8},(_,i)=>({...gold,id:'gold'+i})),silver],jewels=A.dayPalette(A.paletteCounts(jewelry),tags,4);assert.equal(jewels[0],tags.blue,'nonmetal jewelry colors outrank abundant gold');assert(jewels.includes('#ba963a')&&jewels.includes('#aab1ba'),'jewelry-only days may fill remaining slots with metals');
 assert.deepEqual(A.dayPalette(A.paletteCounts([gold]),tags,4),gold.sw,'all-metal jewelry can still make a logged dot');assert.deepEqual(A.dayPalette(A.paletteCounts([{...gold,meta:'Bags'}]),tags,4),[],'metal-only non-jewelry does not become beige');
 assert.deepEqual(A.dayPalette(A.paletteCounts([{...core,colors:['gray'],sw:[tags.silver]}]),tags,4),[tags.silver],'a gray garment is not metallic merely because its exact swatch matches the silver tag');assert.deepEqual(A.dayPalette(A.paletteCounts([{...core,colors:['beige'],sw:[tags.gold]}]),tags,4),[tags.gold],'a beige garment is not metallic merely because its exact swatch matches the gold tag');
 assert.deepEqual(A.dayPalette(A.paletteCounts([{...core,sw:[],colors:[]},gold]),tags,4),[],'missing clothing colors do not turn a mixed day into jewelry-only');assert.deepEqual(A.dayPalette(A.paletteCounts([{id:'tag-gold',meta:'Jewelry',colors:['gold']},core]),tags,4),[tags.teal],'metal tag fallback follows the same exclusion');
 console.log('Daily palette v3: core/layer/shoe/accessory priority, meaningful representatives, metal exclusion before grouping, gem colors, jewelry-only fallback, and preserved gray/beige pass.');
}

// Keep the added reading families in the ordinary Almanac regression entry point.
require('./almanac-readings');

require('./profile-quiz');

// A different subject yesterday must not let the same color story return today.
{
 const date='2026-11-05',color={type:'color'},history={'2026-11-03':{card:color},'2026-11-04':{card:{type:'rising'}}};
 assert(A.repeatsRecent(color,history,date),'two-day-old color reading remains on cooldown');
 assert(A.repeatsRecent({type:'drought'},history,date),'color drought shares the color cooldown');
 assert(A.repeatsRecent({type:'big-full',readingType:'color'},history,date),'special-date color readings retain their subject');
 assert(A.repeatsRecent(color,{'2026-10-30':color},date),'six-day-old color reading remains on cooldown');
 assert(!A.repeatsRecent(color,{'2026-10-29':color},date),'color returns after seven days');
 assert(!A.repeatsRecent(color,{[date]:color,'2026-11-06':color},date),'same-day and future entries never invalidate a reading');
 assert(!A.repeatsRecent({type:'rising'},{'2026-11-03':{type:'rising'}},date),'other subjects keep their existing rotation');
}

// Repeat suppression follows the actual observation across wording/count changes.
{
 const day='2026-11-20',ago=A.shift(day,-8),story=(type,body,actions)=>({type,body,actions});
 const beige=story('color','In the past 30 days, beige appeared on 12 of 19 logged days.',[]),blue=story('color','In the past 30 days, blue appeared on 12 of 19 logged days.',[]);
 assert(A.repeatsRecent({...beige,headline:'Changed headline',body:'In the past 30 days, beige appeared on 14 of 21 logged days.'},{[ago]:beige},day),'same dominant color is not made new by counts or wording');
 assert(!A.repeatsRecent(blue,{[ago]:beige},day),'a different supported dominant color remains eligible after the family gap');
 assert(!A.repeatsRecent(beige,{[A.shift(day,-30)]:beige},day),'same observation can return after thirty days');
 const oldPiece=story('rising','Old copy',[{kind:'piece',id:'a'}]),otherPiece=story('rising','New copy',[{kind:'piece',id:'b'}]);
 assert(A.repeatsRecent({...oldPiece,type:'never'},{[ago]:oldPiece},day),'changing the nudge does not refeature the same piece');assert(!A.repeatsRecent(otherPiece,{[ago]:oldPiece},day),'different eligible piece can be featured');
 const love=story('taste','',[{kind:'love',ids:['a','b']}]);assert(A.repeatsRecent({...love,actions:[{kind:'love',ids:['b','a']}]},{[ago]:love},day),'loved outfit identity ignores piece order');
 for(const [type,action] of [['ahead',{kind:'trip',id:'weekend'}],['swap',{kind:'pull',ids:['a','b']}],['dark',{}]]){const card=story(type,'', [action]);assert(A.repeatsRecent(card,{[ago]:card},day),type+' same subject has a thirty-day gap')}
}

{
 const date='2026-11-20',S={date,events:[],angle:80,daylight:11,sunsetMinutes:19*60,sunsetText:'7 PM'};
 const pieces=['beige','blue','pink'].flatMap(color=>Array.from({length:3},(_,i)=>({id:color+i,name:color+i,meta:'Tops',colors:[color]})));
 const data={city,items:pieces,days:{'2026-11-19':{ids:['beige0','blue0'],colors:{beige:1,blue:1}}},trips:{},loved:[]};
 const first=A.choose(data,S,{});assert.match(first.body,/beige appeared/);
 const rotated=A.choose(data,S,{'2026-11-12':first});assert.equal(rotated.type,'color');assert.match(rotated.body,/blue appeared/,'selection chooses a different supported color observation instead of the same highest-ranked one');
}
