const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),A=require('../app/scripts/almanac');
const city={latitude:37.77,longitude:-122.42,timezone:'America/Los_Angeles'},day='2026-10-30';
const wish={id:'wish',name:'Fox cardigan',meta:'Tops',sub:'Cardigans',wish:true},a={id:'a',name:'Skirt',meta:'Bottoms'},b={id:'b',name:'Jeans',meta:'Bottoms'},c={id:'c',name:'Coat',meta:'Outerwear'};
const base={city,items:[wish,a,b,c],days:{},wishlist:{ranks:{wish:2},passed:[],lab:{wish:true}},ratings:{one:{ids:['wish','a'],r:1,t:1},two:{ids:['wish','b'],r:1,t:2}},boards:{one:{pieces:[{id:'wish'},{id:'a'}]},two:{pieces:[{id:'wish'},{id:'b'}]}},trips:{}};
const S={date:day,events:[],angle:45,lit:.1,daylight:10,sunsetMinutes:19*60,sunsetText:'7:00 PM'};
const pick=(data=base,date=day)=>A.wishlistSignals(data,date)[0];
let card=pick();assert.equal(card.wishlist.kind,'converging');assert.match(card.body,/top three/);assert.match(card.body,/2 distinct Lab combinations/);assert.match(card.body,/2 saved outfit boards/);assert.equal(card.actions[0].kind,'wish-lab');assert.equal(A.choose(base,S,{}).type,'wishlist');
const original=JSON.stringify(base);assert.deepEqual(pick(),card);assert.equal(JSON.stringify(base),original,'readings never change ranking, ratings, boards, or pieces');
assert.equal(pick({...base,wishlist:{...base.wishlist,ranks:{}}}).wishlist.kind,'converging','Lab and board evidence can converge without a ranking');
assert.equal(pick({...base,boards:{},wishlist:{...base.wishlist,ranks:{}}}).wishlist.kind,'love');
assert.equal(pick({...base,ratings:{},wishlist:{...base.wishlist,ranks:{}}}).wishlist.kind,'boards');
assert.equal(pick({...base,ratings:{},boards:{}}),undefined,'rank alone does not foretell a purchase');
assert.equal(pick({...base,boards:{},ratings:{one:base.ratings.one,copy:{...base.ratings.one,ids:['a','wish','wish']}}}),undefined,'repeated copies of one Lab combination count once');
assert.equal(pick({...base,ratings:{},boards:{one:base.boards.one,copy:base.boards.one}}),undefined,'identical board copies count once');
assert.equal(pick({...base,boards:{},ratings:{...base.ratings,newer:{ids:['a','wish'],r:-1,t:10}}}),undefined,'latest rating replaces an older Love');
assert.equal(pick({...base,boards:{},ratings:{...base.ratings,future:{ids:['wish','c'],r:1,t:Date.parse('2027-01-01')}}}).wishlist.loved,2,'future ratings do not create evidence');
assert.equal(pick({...base,boards:{},ratings:{...base.ratings,tomorrow:{ids:['wish','c'],r:1,t:Date.parse('2026-10-31T07:00:00Z')}}}).wishlist.loved,2,'rating dates use the city timezone');
for(const tags of [{meta:'Underwear'},{sub:'Bras'},{meta:'Lingerie'},{section:'offduty'},{section:'sexy'},{meta:'Swimwear'},{stored:true},{hidden:true},{removed:true},{gone:true},{donate:true},{wish:false}])assert.equal(pick({...base,items:[{...wish,...tags},a,b,c]}),undefined);
assert.equal(pick({...base,wishlist:{...base.wishlist,passed:['wish']}}),undefined,'Pass excludes a wish');
assert.equal(pick({...base,items:[wish,{...a,removed:true},b,c],boards:{}}),undefined,'deleted/removed partners do not manufacture Lab interest');
assert.equal(pick({...base,wishlist:{...base.wishlist,lab:{}}}).actions[0].kind,'wish','unsupported/no-photo wishes still open details without an unusable Lab action');
const aged={...base,ratings:{},boards:{},items:[{...wish,source:'Wishlist',addedAt:A.shift(day,-90)+'T12:00:00Z'}]};
assert.equal(pick(aged).wishlist.kind,'milestone');assert.match(pick(aged).headline,/Three months later/);
assert.equal(pick({...aged,items:[{...aged.items[0],source:'Added by hand'}]}),undefined,'ordinary addedAt is not a wishlist-entry date');
assert.equal(pick({...aged,items:[{...wish,wishlistAddedAt:A.shift(day,-180)}]}).wishlist.milestone,180);
assert.equal(pick({...aged,items:[{...wish,wishlistAddedAt:A.shift(day,-365)}]}).wishlist.milestone,365);
assert.equal(pick({...aged,items:[{...wish,wishlistAddedAt:A.shift(day,-97)}]}),undefined,'a milestone has a bounded seven-day opportunity');
assert.equal(pick({...aged,items:[{...wish,wishlistAddedAt:'2026-02-30'}]}),undefined,'invalid dates cannot support age claims');
assert.equal(pick({...aged,wishlist:{...aged.wishlist,ranks:{wish:4}}}),undefined,'age alone is insufficient');
const seasonalWish={...aged,items:[{...wish,seasons:['Winter']}]};assert.equal(pick(seasonalWish,'2026-11-20').wishlist.kind,'season');assert.equal(pick({...seasonalWish,city:{...city,latitude:-33}},'2026-11-20'),undefined,'season anticipates the correct hemisphere');assert.equal(pick({...seasonalWish,city:{...city,latitude:0}},'2026-11-20'),undefined,'temperate season assumptions are suppressed near the equator');
assert.equal(A.validCard({...card,actions:card.actions.map(a=>Object.fromEntries(Object.entries(a).reverse())),wishlist:Object.fromEntries(Object.entries(card.wishlist).reverse())},base,day),true,'database field ordering cannot invalidate a saved reading');
const history=A.dailyHistory({},day,'city',card),readings=A.readingHistory(history);assert.equal(readings.wishlist.wish,day);assert.equal(A.validCard(card,{...base,readings},day),true,'same-day reloading keeps the reading');assert.equal(pick({...base,readings},A.shift(day,1)),undefined);assert(pick({...base,readings},A.shift(day,30)),'wish can return after thirty days');assert.equal(A.validCard(card,{...base,wishlist:{...base.wishlist,lab:{}}},day),false,'a cached Lab action needs a supported piece and photo');assert.equal(A.validCard(card,{...base,boards:{},ratings:{},readings},day),false,'cached evidence must remain true');assert.equal(A.validCard(card,{...base,wishlist:{...base.wishlist,passed:['wish']}},day),false,'cached wishlist readings respect Pass');
const big={...card,type:'big-full',headline:'A full moon.'};assert.equal(A.dailyHistory({},day,'city',big)._readings.wishlist.wish,day,'special sky headlines preserve wishlist cooldowns');
console.log('Wishlist Almanac: real rank/Lab/board evidence, deduplication, latest ratings, timezone, supported actions, exclusions, age provenance, milestones, hemispheres, cooldowns, cached validity, deterministic selection, and no source mutations pass.');

const scarf={id:'scarf',name:'Favorite scarf',meta:'Accessories',sub:'Scarves',fav:true},boots={id:'boots',name:'Velvet boots',meta:'Footwear',sub:'Boots'},layer={id:'layer',name:'Light jacket',meta:'Outerwear',sub:'Jackets'},purple={id:'purple',name:'Purple skirt',meta:'Bottoms',colors:['purple']};
const lore={city,items:[scarf,boots,layer,purple],days:{}};
for(const [id,date] of [['brigids-eve','2026-01-31'],['may-layers','2026-05-01'],['womens-sunday','2026-06-21'],['st-swithin','2026-07-15']]){
 const today={...S,date},story=A.folkloreSignals(lore,today)[0];assert.equal(story.folklore.id,id);assert(A.readingSource(story).url.startsWith('https://'));assert.equal(A.choose(lore,today,{}).folklore.id,id);
 const ledger=A.dailyHistory({},date,'city',story),memory=A.readingHistory(ledger);assert.equal(A.folkloreSignals({...lore,readings:memory},today)[0].folklore.id,id,'same-day refresh stays valid');assert.equal(A.folkloreSignals({...lore,readings:memory},{...today,date:A.shift(date,1)}).length,0,'story cannot repeat the next day in its date window');assert.equal(A.folkloreSignals({...lore,readings:memory},{...today,date:'2027'+date.slice(4)}).length,0,'skip next year');assert.equal(A.folkloreSignals({...lore,readings:memory},{...today,date:'2028'+date.slice(4)})[0].folklore.id,id,'return after two years');
 const rolled=A.dailyHistory(ledger,'2027-12-31','city',{type:'ambient',actions:[]});assert.equal(A.readingHistory(rolled).folklore[id],date,'annual memory survives daily pruning');assert.equal(A.validCard(story,{...lore,readings:memory},date),true);assert.equal(A.validCard(story,{...lore,items:[]},date),false,'cached lore still needs its wardrobe connection');assert.equal(A.folkloreSignals(lore,{...today,date:A.shift(date,3)}).length,0,'story window is bounded');
 assert.equal(A.folkloreSignals(lore,{...today,events:[{kind:'full'}]}).length,0,'real sky headlines keep priority');assert(A.folkloreSignals(lore,{...today,date:A.shift(date,1)}).length,'the story can appear after a sky event');
}
assert.equal(A.folkloreSignals({...lore,city:{...city,latitude:-33}},{...S,date:'2026-05-01'}).length,0,'May spring lore is not presented as southern spring');
assert.equal(A.folkloreSignals({...lore,items:[]},{...S,date:'2026-07-15'}).length,0);
const previews=Array.from({length:12},(_,i)=>A.preview(lore,S,i));assert.equal(new Set(previews.filter(c=>c.folklore).map(c=>c.folklore.id)).size,4,'debug previews expose all matching lore without waiting for its date');assert.equal(A.choose(lore,S,{}).folklore,undefined,'debug availability never leaks into normal dates');assert.equal(A.readingSource({folklore:{id:'untrusted'}}),null,'only curated source links render');
console.log('Folklore Almanac: four sourced dates, owned-piece connection, climate context, three-day opportunities, big-sky priority, every-other-year memory, same-day stability, cache eligibility, source allowlist, and debug-only off-date previews pass.');

const wears=['2024-10-25','2024-10-28','2024-11-02','2025-10-25','2025-10-28','2025-11-02'];
const wornBoots={...boots,wears},linen={id:'linen',name:'Linen shirt',meta:'Tops',material:['linen'],wears},color={...purple,wears},items=[wornBoots,linen,color],seasonal={city,items,days:A.loggedDays(items,{},{}),trips:{}};
const seasons=A.seasonalSignals(seasonal,S);assert.equal(seasons.length,3);assert(seasons.some(c=>c.seasonal.id==='boots'));assert(seasons.some(c=>c.seasonal.id==='linen'));assert(seasons.some(c=>c.seasonal.id==='color:purple'));
const first=seasons[0];assert.match(first.body,/2024 and 2025/);assert.match(first.body,/3 and 3 days/);
const oneYear={...boots,wears:wears.filter(d=>d.startsWith('2025'))};assert.equal(A.seasonalSignals({...seasonal,items:[oneYear],days:A.loggedDays([oneYear],{},{})},S).length,0,'one year cannot establish a recurring season');
const returned={...boots,wears:[...wears,day]};assert.equal(A.seasonalSignals({...seasonal,items:[returned],days:A.loggedDays([returned],{},{})},S).length,0,'already-returned pieces are not described as waiting to return');
const duplicate={...boots,wears:['2024-10-25','2024-10-25','2024-10-25','2025-10-25','2025-10-25','2025-10-25']};assert.equal(A.seasonalSignals({...seasonal,items:[duplicate],days:A.loggedDays([duplicate],{},{})},S).length,0,'distinct logged days establish the pattern');
const seasonHistory=A.readingHistory(A.dailyHistory({},day,'city',first));assert.equal(A.seasonalSignals({...seasonal,readings:seasonHistory},{...S,date:A.shift(day,1)}).some(c=>c.seasonal.id==='boots'),false);assert(A.validCard(first,{...seasonal,readings:seasonHistory},day));assert.equal(A.validCard(first,{...seasonal,items:[linen,color]},day),false);
console.log('Personal seasons: two prior years, distinct wear dates, boots/linen/colors, no recent returns, durable cooldowns, and cached evidence pass.');

// UI uses the wishlist's real order, current piece records, and existing Lab action.
const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'('),tail=source.slice(start),end=tail.slice(1).search(/\n(?:async )?function /);return end<0?tail:tail.slice(0,end+1)}
let current={...wish,photo:'photo'},opened,experiment,writes=0;const ui={state:{},_wrCtx:{old:true},wrDoc:()=>({v:2,pass:{skip:true,no:false}}),wrSortAll:rows=>rows.slice().reverse(),wrItems:()=>[a,current],wrLabSlot:()=> 'layer',realPhoto:p=>!!p.photo,allItems:()=>[current],byIdA:()=>({wish:current}),el:(tag,attrs,...children)=>({tag,...attrs,children}),photoThumbnail:s=>'thumb:'+s,openEdit:p=>opened=p,wrTryLab:p=>experiment=p,toast:()=>{},window:{},Date};vm.createContext(ui);vm.runInContext(['profileSkyWishlist','profileSkyThumbnail','profileSkyAction'].map(fn).join('\n'),ui);
let data=ui.profileSkyWishlist();assert.equal(data.ranks.wish,1);assert.equal(data.lab.wish,true);assert.deepEqual(Array.from(data.passed),['skip']);assert.equal(ui._wrCtx,null);const thumb=ui.profileSkyThumbnail(card);assert.equal(thumb.children[0].src,'thumb:photo');current={...current,name:'Current name'};thumb.onclick();assert.equal(opened,current);ui.profileSkyAction({kind:'wish-lab',id:'wish'});assert.equal(experiment,current);ui.profileSkyAction({kind:'wish',id:'wish'});assert.equal(opened,current);
ui.wrDoc=()=>({v:1,pass:{}});ui.wrSortAll=()=>assert.fail('legacy scores must not imply a new top-three rank');assert.equal(Object.keys(ui.profileSkyWishlist().ranks).length,0);assert.equal(writes,0);
console.log('Almanac UI: all-items ranking adapter, no legacy rank inference, Pass/slot/photo evidence, current wishlist thumbnail/details, existing Try in Lab action, and no ranking writes pass.');

// A rehydrated card stays stable; changing the live evidence replaces it once.
{
 const savedCard=JSON.parse(JSON.stringify(card));savedCard.wishlist=Object.fromEntries(Object.entries(savedCard.wishlist).reverse());
 const key=[day,city.latitude,city.longitude,city.timezone].join('|'),saved=A.dailyHistory({},day,key,savedCard),savedWrites=[],state={profile:{'sky-daily':saved},trips:{},ratings:base.ratings,outfits:base.boards};
 state.db={collection:()=>({doc:()=>({set(next){savedWrites.push(next);state.profile['sky-daily']=next;return Promise.resolve()}})})};
 const el=(tag,attrs,...children)=>({tag,...attrs,children,appendChild(child){this.children.push(child)}}),ctx={Date,URLSearchParams,window:{location:{search:''}},state,ClosetLintAlmanac:{...A,sky:()=>S,dayAt:()=>day},Astronomy:{},el,setupLoaded:Object.fromEntries(['edits','custom','outfits','outfitHistory','ratings','trips','profile','wishrank'].map(k=>[k,true])),profileSkySession:{},profileSkySaving:{},profileSkyPreviewIndex:null,profileLocation:()=>city,profileCardHeader:()=>({}),profileButton:(text,onclick)=>el('button',{text,onclick}),closetRouteHref:route=>'#/pieces/'+route.id,profileMoon:()=>({}),profileWeatherBadge:()=>{},profileFirstRunPreview:()=>false,allItems:()=>base.items,profileDays:()=>({}),byIdA:()=>Object.fromEntries(base.items.map(p=>[p.id,p])),realPhoto:()=>false,labRatingEntries:()=>[],wrDoc:()=>({v:2,pass:{}}),wrSortAll:()=>[a,wish],wrItems:()=>[wish],wrLabSlot:()=>'',_wrCtx:null};
 // Existing saved Lab action availability also needs to match current capabilities.
 savedCard.actions=[{kind:'wish',id:'wish',label:'View wish'}];
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function profileSkyThumbnail('),source.indexOf('\nfunction profileUnit()')),ctx);
 let result=ctx.profileSkyCard();assert.equal(savedWrites.length,0,'database field ordering cannot cause a save/render loop');assert(result.children.some(n=>n&&n.class==='almanac-sky-reading'),'saved wishlist card renders on first load');
 const flat=n=>[n,...(n.children||[]).filter(c=>c&&typeof c==='object').flatMap(flat)];
 assert(!flat(result).some(n=>n.tag==='button'&&n.text==='View wish'),'wish details have no extra button');
 assert(flat(result).some(n=>n.tag==='a'&&n.href==='#/pieces/wish'),'the headline opens a wish without a photo');
 const pack={femme:'👩‍🔬',masc:'👨‍🔬',other:'🧑‍🔬'};
 ctx.photoThumbnail=s=>'thumb:'+s;ctx.ClosetLintIcons={get:(key,choice)=>{assert.equal(key,'E007');return pack[choice]}};
 ctx.realPhoto=p=>p.id==='wish';ctx.wrLabSlot=()=> 'layer';state.profile['sky-daily'][day].card=card;
 for(const choice of Object.keys(pack)){ctx.readDisplayPrefs=()=>({icons:choice});const view=ctx.profileSkyCard();assert(flat(view).some(n=>n.tag==='button'&&n.text===pack[choice]+' Try in Lab'),'Lab action shares the chosen scientist icon');assert(!flat(view).some(n=>n.tag==='button'&&n.text==='View wish'));assert(flat(view).some(n=>n.class==='almanac-piece-thumb'),'wish photo stays linked')}
 ctx.realPhoto=()=>false;ctx.wrLabSlot=()=>'';savedWrites.length=0;state.profile['sky-daily'][day].card=savedCard;
 
 state.ratings={};state.outfits={};ctx.profileSkyCard();assert.equal(savedWrites.length,1,'changed live evidence replaces the saved reading');assert.equal(state.profile['sky-daily'][day].card.type,'ambient');ctx.profileSkyCard();assert.equal(savedWrites.length,1,'replacement settles without repeated writes');assert.equal(state.profile['sky-daily']._readings.wishlist.wish,day,'invalidating evidence preserves feature memory');
 ctx.setupLoaded.wishrank=false;ctx.wrDoc=()=>assert.fail('wait for the actual ranking snapshot');result=ctx.profileSkyCard();assert(result.children.some(n=>n&&n.text==='Reading your closet…'));
}
console.log('Saved Sky UI: rehydrated wishlist rendering, stable database field order, current-evidence invalidation, retained feature history, settled save loop, and ranking-load guard pass.');
