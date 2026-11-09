/* Calculated almanac. Astronomy Engine 2.1.19 supplies the real sky; no remote AI. */
(function(root){
'use strict';
var daily=typeof module==='object'&&module.exports?require('./daily-card'):ClosetLintDaily;
var VERSION='1.3.2',DAY=86400000, limits={tide:.4,droughtPieces:3,droughtDays:14,risingDays:30,neverDays:60,aheadDays:14,earlyDarkMinutes:18*60,daylightHours:10,anniversaryHotDays:3,anniversaryWears:10,anniversaryYears:2};
function shift(day,n){return new Date(Date.parse(day+'T12:00:00Z')+n*DAY).toISOString().slice(0,10)}
function age(a,b){return /^\d{4}-\d{2}-\d{2}$/.test(a||'')?Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/DAY):null}
function dayAt(date,zone){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
function start(day,zone){var d=new Date(day+'T00:00:00Z');for(var i=0;i<3;i++){var p={};new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).forEach(function(x){p[x.type]=x.value});var asUTC=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);d=new Date(d.getTime()+Date.parse(day+'T00:00:00Z')-asUTC)}return d}
function minutes(d,z){var p={};new Intl.DateTimeFormat('en-US',{timeZone:z,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).forEach(function(x){p[x.type]=x.value});return +p.hour*60 + +p.minute}
function clock(d,z){return d?new Intl.DateTimeFormat(undefined,{timeZone:z,hour:'numeric',minute:'2-digit'}).format(d):'No sunset today'}
function phaseName(angle){return angle<22.5||angle>=337.5?'New moon':angle<67.5?'Waxing crescent':angle<112.5?'First quarter':angle<157.5?'Waxing gibbous':angle<202.5?'Full moon':angle<247.5?'Waning gibbous':angle<292.5?'Last quarter':'Waning crescent'}
var annual={};
function yearEvents(A,year,zone,lat,lon){
 var key=[year,zone,lat,lon].join('|');if(annual[key])return annual[key];
 var obs=new A.Observer(lat,lon,0),seasons=A.Seasons(year),southern=lat<0,ev=[];
 [['mar_equinox',southern?'Fall equinox':'Spring equinox',southern?'Fall':'Spring'],['jun_solstice',southern?'Winter solstice':'Summer solstice',southern?'Winter':'Summer'],['sep_equinox',southern?'Spring equinox':'Fall equinox',southern?'Spring':'Fall'],['dec_solstice',southern?'Summer solstice':'Winter solstice',southern?'Summer':'Winter']].forEach(function(p){ev.push({date:dayAt(seasons[p[0]].date,zone),time:seasons[p[0]].date.toISOString(),kind:'season',name:p[1],season:p[2]})});
 var q=A.SearchMoonQuarter(new Date((year-1)+'-12-01T00:00:00Z')),full=[],all=[];
 while(q.time.date.getUTCFullYear()<=year+1){if(q.time.date>new Date((year+1)+'-02-01'))break;if(q.quarter===0||q.quarter===2)all.push({date:dayAt(q.time.date,zone),time:q.time.date.toISOString(),kind:q.quarter===2?'full':'new'});if(q.quarter===2)full.push(all[all.length-1]);q=A.NextMoonQuarter(q)}
 var autumn=seasons[lat<0?'mar_equinox':'sep_equinox'].date,harvest=full.reduce(function(best,e){return !best||Math.abs(Date.parse(e.time)-autumn)<Math.abs(Date.parse(best.time)-autumn)?e:best},null),hunter=full[full.indexOf(harvest)+1];
 var names=['Wolf','Snow','Worm','Pink','Flower','Strawberry','Buck','Sturgeon','Corn',"Hunter’s",'Beaver','Cold'];
 all.forEach(function(e){if(e.kind==='full'){var m=+e.date.slice(5,7),prior=full.some(function(f){return f!==e&&f.date.slice(0,7)===e.date.slice(0,7)&&f.time<e.time});e.name=(prior?'Blue':e===harvest?'Harvest':e===hunter?'Hunter’s':names[m-1])+' Moon'}else e.name='New moon';if(e.date.slice(0,4)===String(year))ev.push(e)});
 // Solar searches are observer-specific. Lunar events also need the Moon above the horizon.
 var solar=A.SearchLocalSolarEclipse(new Date(year+'-01-01T00:00:00Z'),obs);
 while(solar.peak.time.date.getUTCFullYear()<=year){if(solar.peak.altitude>0||solar.partial_begin.altitude>0||solar.partial_end.altitude>0)ev.push({date:dayAt(solar.peak.time.date,zone),time:solar.peak.time.date.toISOString(),kind:'eclipse',name:'Solar eclipse'});solar=A.NextLocalSolarEclipse(solar.peak.time,obs)}
 var lunar=A.SearchLunarEclipse(new Date(year+'-01-01T00:00:00Z'));
 while(lunar.peak.date.getUTCFullYear()<=year){var duration=lunar.sd_penum*60000,begin=new Date(lunar.peak.date.getTime()-duration),end=new Date(lunar.peak.date.getTime()+duration);function above(d){var eq=A.Equator('Moon',d,obs,true,true);return A.Horizon(d,obs,eq.ra,eq.dec,'normal').altitude>0}if(above(begin)||above(end)||above(lunar.peak.date)||A.SearchRiseSet('Moon',obs,1,begin,2*duration/DAY))ev.push({date:dayAt(lunar.peak.date,zone),time:lunar.peak.date.toISOString(),kind:'eclipse',name:'Lunar eclipse'});lunar=A.NextLunarEclipse(lunar.peak)}
 // Earliest-sunset stretch: first day of the winter minimum rounded to a minute.
 var winter=ev.find(function(e){return e.kind==='season'&&e.season==='Winter'}),candidates=[];
 for(var n=-40;n<=10;n++){var date=shift(winter.date,n),sun=A.SearchRiseSet('Sun',obs,-1,start(date,zone),1);if(sun)candidates.push({date:date,min:minutes(sun.date,zone)})}
 if(candidates.length){var min=Math.min.apply(null,candidates.map(function(e){return e.min})),first=candidates.find(function(e){return e.min===min});ev.push({date:first.date,kind:'earliest',name:'Earliest sunsets'})}
 annual[key]=ev;return ev;
}
function sky(A,city,day){
 var zone=city.timezone,begin=start(day,zone),end=start(shift(day,1),zone),noon=new Date((begin.getTime()+end.getTime())/2),obs=new A.Observer(city.latitude,city.longitude,0);
 function sun(d){var b=start(d,zone),rise=A.SearchRiseSet('Sun',obs,1,b,1),set=A.SearchRiseSet('Sun',obs,-1,b,1);return {rise:rise&&rise.date,set:set&&set.date,hours:rise&&set?(set.date-rise.date)/3600000:null}}
 var today=sun(day),prev=sun(shift(day,-1)),angle=A.MoonPhase(noon),events=yearEvents(A,+day.slice(0,4),zone,city.latitude,city.longitude).filter(function(e){return e.date===day});
 if(end-begin!==DAY)events.push({date:day,kind:'clock',name:end-begin>DAY?'Clocks fell back':'Clocks spring forward'});
 events.sort(function(a,b){return ['eclipse','season','clock','full','new','earliest'].indexOf(a.kind)-['eclipse','season','clock','full','new','earliest'].indexOf(b.kind)});
 return {date:day,angle:angle,lit:A.Illumination('Moon',noon).phase_fraction,phase:phaseName(angle),sunrise:today.rise&&today.rise.toISOString(),sunriseText:today.rise?clock(today.rise,zone):'No sunrise today',sunset:today.set&&today.set.toISOString(),sunsetText:clock(today.set,zone),sunsetMinutes:today.set?minutes(today.set,zone):null,daylight:today.hours,change:today.hours!=null&&prev.hours!=null?(today.hours-prev.hours)*60:null,crossing:today.hours!=null&&prev.hours!=null&&((today.hours<limits.daylightHours&&prev.hours>=limits.daylightHours)||(today.hours>=limits.daylightHours&&prev.hours<limits.daylightHours)),events:events};
}
// Shared palette counting keeps saved and automatic photo swatches ahead of tag fallback.
function addPalette(row,p,source){
 var palette=Array.from(new Set((Array.isArray(source)?source:[]).filter(function(c){return typeof c==='string'&&/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)}).map(function(c){c=c.toLowerCase();return c.length===4?'#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3]:c})));
 palette.forEach(function(c){row.swatches[c]=(row.swatches[c]||0)+1});
 (row.palettes||(row.palettes=[])).push({id:p.id,priority:palettePriority(p),jewelry:paletteJewelry(p),colorTags:(p.colors||[]).slice(),swatches:palette,tags:palette.length?[]:(p.colors||[]).filter(function(c){return c!=='?'&&c!=='multicolor'})});
 if(!palette.length)(p.colors||[]).forEach(function(c){if(c!=='?'&&c!=='multicolor')row.fallbackColors[c]=(row.fallbackColors[c]||0)+1});
}
// Presentation palette v3: group nearby shades, retain actual swatches, and rank shared groups.
function paletteLab(hex){
 var c=[1,3,5].map(function(i){var v=parseInt(hex.slice(i,i+2),16)/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}),r=c[0],g=c[1],b=c[2];
 var l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
function paletteNear(a,b){
 var neutral=a[0]>.87&&b[0]>.87&&Math.hypot(a[1],a[2])<.045&&Math.hypot(b[1],b[2])<.045;
 return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<(neutral?.085:.045);
}
function palettePriority(p){
 var meta=p.meta||'',top=meta==='Tops'||meta==='One-pieces'||meta==='Workwear & uniforms'||meta==='Cultural & traditional garments';
 if(meta==='Outerwear'||top&&(p.labAs==='layer'||p.labAs==='underlayer'||!p.labAs&&(p.kind==='cardigan'||p.sub==='Cardigans'||p.sub==='Blazers'||p.layer==='mid'||p.layer==='outer')))return 1;
 if(meta==='Footwear'||meta==='Shoes')return 2;
 if(!meta||top||meta==='Bottoms')return 0;
 return 3;
}
function paletteJewelry(p){return p.meta==='Jewelry'||p.meta==='Watches'||p.section==='jewelry'}
function paletteEntries(piece,tags){
 var valid=function(hex){return typeof hex==='string'&&/^#[0-9a-f]{6}$/i.test(hex)},metal=function(c){return c==='gold'||c==='silver'},labels=piece.colorTags||piece.tags||[],metalLabels=labels.filter(metal),labelColors=labels.filter(function(c){return valid(tags[c])});
 function metallic(hex){
  if(!metalLabels.length)return false;
  if(!labelColors.some(function(c){return !metal(c)}))return true;
  // Use recorded color labels to identify metal portions; gray/beige alone never imply metal.
  var lab=paletteLab(hex),best=Infinity,result=false;
  labelColors.forEach(function(c){var other=paletteLab(tags[c]),d=Math.hypot(lab[0]-other[0],lab[1]-other[1],lab[2]-other[2]);if(d<best||(d===best&&!metal(c))){best=d;result=metal(c)}});return result;
 }
 if((piece.swatches||[]).length)return piece.swatches.filter(valid).map(function(hex){hex=hex.toLowerCase();return {hex:hex,metal:metallic(hex),weight:1}});
 return (piece.tags||[]).filter(function(c){return valid(tags[c])}).map(function(c){return {hex:tags[c].toLowerCase(),metal:metal(c),weight:1}});
}
function paletteSupportOrder(a,b){for(var i=0;i<4;i++)if(a[i]!==b[i])return b[i]-a[i];return 0}

function dayPalette(row,tags,max){
 if(!row)return [];
 max=Math.min(4,Math.max(1,max||4));tags=tags||{};
 var pieces=[],provenance=Array.isArray(row.palettes)&&row.palettes.length,valid=function(hex){return typeof hex==='string'&&/^#[0-9a-f]{6}$/i.test(hex)};
 if(provenance){var seen=Object.create(null);row.palettes.forEach(function(p){if(seen[p.id])return;seen[p.id]=true;pieces.push({tier:p.priority==null?0:p.priority,jewelry:!!p.jewelry,entries:paletteEntries(p,tags)})})}
 else{
  // Retain support for older in-memory rows that only have aggregate evidence.
  Object.keys(row.swatches||{}).forEach(function(hex){var n=row.swatches[hex];if(valid(hex)&&Number.isFinite(n)&&n>0)pieces.push({tier:0,jewelry:false,entries:[{hex:hex.toLowerCase(),metal:false,weight:n}]})});
  var fallback=row.fallbackColors===undefined?row.colors:row.fallbackColors;
  Object.keys(fallback||{}).forEach(function(c){var n=fallback[c];if(valid(tags[c])&&Number.isFinite(n)&&n>0)pieces.push({tier:0,jewelry:false,entries:[{hex:tags[c].toLowerCase(),metal:c==='gold'||c==='silver',weight:n}]})});
 }
 var jewelryOnly=pieces.length>0&&pieces.every(function(p){return p.jewelry}),colors=Object.create(null),labs={},groups=[];
 pieces.forEach(function(piece){var used={};piece.entries=piece.entries.filter(function(entry){return jewelryOnly||!entry.metal});piece.entries.forEach(function(entry){var key=entry.hex+'|'+(entry.metal?'metal':'color');entry.key=key;if(used[key])return;used[key]=true;if(!colors[key])colors[key]={hex:entry.hex,metal:entry.metal,support:[0,0,0,0]};colors[key].support[piece.tier]+=entry.weight})});
 Object.keys(colors).sort(function(a,b){return Number(colors[a].metal)-Number(colors[b].metal)||paletteSupportOrder(colors[a].support,colors[b].support)||a.localeCompare(b)}).forEach(function(key){
  var entry=colors[key],hex=entry.hex,lab=labs[hex]||(labs[hex]=paletteLab(hex)),best=null,distance=Infinity;
  groups.forEach(function(group){
   if(group.metal!==entry.metal||!group.members.every(function(member){return paletteNear(lab,labs[colors[member].hex])}))return;
   var other=labs[group.color],d=Math.hypot(lab[0]-other[0],lab[1]-other[1],lab[2]-other[2]);if(d<distance){best=group;distance=d}
  });
  if(!best){best={color:hex,metal:entry.metal,members:[],support:[0,0,0,0]};groups.push(best)}best.members.push(key);
 });
 groups.forEach(function(group){pieces.forEach(function(piece){var weight=0;piece.entries.forEach(function(entry){if(group.members.indexOf(entry.key)>=0)weight=Math.max(weight,entry.weight)});group.support[piece.tier]+=weight})});
 var out=[];groups.sort(function(a,b){return Number(a.metal)-Number(b.metal)||paletteSupportOrder(a.support,b.support)||a.color.localeCompare(b.color)}).forEach(function(g){if(g.support.some(function(n){return n>0})&&out.indexOf(g.color)<0&&out.length<max)out.push(g.color)});return out;
}
function swatchBackground(colors){
 if(!colors.length)return 'var(--ink2)';if(colors.length===1)return colors[0];
 if(colors.length===2)return 'linear-gradient(135deg,'+colors[0]+' 50%,'+colors[1]+' 50%)';
 return 'conic-gradient('+colors.map(function(c,i){return c+' '+i*360/colors.length+'deg '+(i+1)*360/colors.length+'deg'}).join(',')+')';
}

function paletteCounts(items,paletteOf){
 var row={swatches:{},fallbackColors:{}},seen={};
 items.forEach(function(p){if(seen[p.id])return;seen[p.id]=true;addPalette(row,p,paletteOf?paletteOf(p):p.sw)});return row;
}
function loggedDays(items,outfits,archive){
 var days={};
 function add(day,p){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))return;
  var row=days[day]||(days[day]={ids:[],colors:{},swatches:{},fallbackColors:{},logged:true});
  if(!p||row.ids.indexOf(p.id)>=0)return;row.ids.push(p.id);
  addPalette(row,p,p.sw);
  (p.colors||[]).forEach(function(c){if(c!=='?'&&c!=='multicolor')row.colors[c]=(row.colors[c]||0)+1});
 }
 var map={};items.forEach(function(p){map[p.id]=p;if(!p.wish)(p.wears||[]).forEach(function(d){add(d,p)})});
 Object.keys(Object.assign({},archive,outfits)).forEach(function(id){var o=(outfits[id]||archive[id]);(o.wearLog||[]).forEach(function(e){add(e.d);(e.ids||(e.pieces||o.pieces||[]).map(function(p){return p.id})).forEach(function(id){add(e.d,map[id])})})});return days;
}
function tripRows(trips,today){return Object.keys(trips||{}).map(function(id){var t=trips[id],s=t.settings||{},end=s.end||s.start,days=[];if(!s.start||!end||end<today)return null;for(var d=s.start;d<=end&&days.length<366;d=shift(d,1)){var pinned=((t.plan||{}).outfits||[]).some(function(o){return o.pin&&o.fors==='d:'+d});days.push({date:d,pinned:pinned})}return {id:id,name:t.name||'Trip',start:s.start,end:end,days:days,planned:days.filter(function(d){return d.pinned}).length,trip:t}}).filter(Boolean).sort(function(a,b){return a.start.localeCompare(b.start)||a.id.localeCompare(b.id)})}
function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
function eligibleDays(source,items){var map={},days={};items.forEach(function(p){map[p.id]=p});Object.keys(source||{}).forEach(function(date){var ids=(source[date].ids||[]).filter(function(id){return !!map[id]});if(!ids.length)return;var colors={};ids.forEach(function(id){(map[id].colors||[]).forEach(function(c){if(c!=='?'&&c!=='multicolor')colors[c]=(colors[c]||0)+1})});days[date]={ids:ids,colors:colors,logged:true}});return days}
function validDay(day){var t=/^\d{4}-\d{2}-\d{2}$/.test(day||'')&&Date.parse(day+'T12:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===day}
function acquisition(p){return Object.prototype.hasOwnProperty.call(p,'acquiredDate')?p.acquiredDate:p.date}
function anniversaryReason(p,wears,day){
 if(!daily.isActivePiece(p)||p.stored)return null;
 if(p.fav)return 'favorite';
 var dates=Array.from(new Set((wears||[]).concat(p.wears||[]).filter(function(d){return validDay(d)&&d<=day}))).sort();
 if(dates.length>=limits.anniversaryWears)return 'well-worn';
 for(var i=limits.anniversaryHotDays-1;i<dates.length;i++)if(age(dates[i-limits.anniversaryHotDays+1],dates[i])<30)return 'past-hot';
 return null;
}
function anniversaryEligible(p,wears,day,history){
 var date=acquisition(p),years=+day.slice(0,4)-+String(date||'').slice(0,4);
 if(!validDay(date)||p.acquiredApproximate||years<1||date.slice(5)!==day.slice(5)||!anniversaryReason(p,wears,day))return false;
 var prior=(history||{})[p.id];
 // Refreshing the same reading is fine; a later feature needs a two-year gap.
 return !prior||prior.acquiredDate!==date||prior.day===day||+day.slice(0,4)-+prior.day.slice(0,4)>=limits.anniversaryYears;
}
function anniversaryFeature(card){
 if(!card)return null;var feature=card.anniversary;
 if(feature&&typeof feature.pieceId==='string'&&validDay(feature.acquiredDate))return {pieceId:feature.pieceId,acquiredDate:feature.acquiredDate};
 // Retain anniversary evidence from earlier versions, including a sky event with birthday body copy.
 var match=/It arrived on (\d{4}-\d{2}-\d{2})\. Take it out for its birthday\./.exec(card.body||''),action=(card.actions||[]).find(function(a){return a.kind==='piece'&&typeof a.id==='string'});
 return match&&validDay(match[1])&&action?{pieceId:action.id,acquiredDate:match[1]}:null;
}
function anniversaryHistory(history){
 var out=Object.create(null),saved=(history||{})._anniversaries||{};
 Object.keys(saved).forEach(function(id){var entry=saved[id];if(entry&&validDay(entry.day)&&validDay(entry.acquiredDate))out[id]={day:entry.day,acquiredDate:entry.acquiredDate}});
 Object.keys(history||{}).filter(validDay).sort().forEach(function(day){var row=history[day],feature=anniversaryFeature(row&&row.card);if(feature&&(!out[feature.pieceId]||out[feature.pieceId].day<day))out[feature.pieceId]={day:day,acquiredDate:feature.acquiredDate}});
 return out;
}
// These compact feature dates outlive the short daily-reading cache.
function readingFeature(card){
 if(!card)return null;
 for(var kind of ['folklore','wishlist','seasonal'])if(card[kind]&&typeof card[kind].id==='string')return {kind:kind,id:card[kind].id};
 return null;
}
function readingHistory(history){
 var out={folklore:Object.create(null),wishlist:Object.create(null),seasonal:Object.create(null)},saved=(history||{})._readings||{};
 Object.keys(out).forEach(function(kind){Object.keys(saved[kind]||{}).forEach(function(id){if(validDay(saved[kind][id]))out[kind][id]=saved[kind][id]})});
 Object.keys(history||{}).filter(validDay).sort().forEach(function(day){var f=readingFeature(history[day]&&history[day].card);if(f&&(!out[f.kind][f.id]||out[f.kind][f.id]<day))out[f.kind][f.id]=day});return out;
}
function readingDue(history,kind,id,day,gap,years){
 var last=((history||{})[kind]||{})[id];
 return !validDay(last)||last===day||(years?+day.slice(0,4)-+last.slice(0,4)>=years:age(last,day)>=gap);
}
function wearableWish(p){return !!p&&p.wish&&!p.stored&&daily.isActivePiece(Object.assign({},p,{wish:false}))}
function seasonAt(day,latitude){
 var names=latitude<0?['Summer','Summer','Fall','Fall','Fall','Winter','Winter','Winter','Spring','Spring','Spring','Summer']:['Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer','Fall','Fall','Fall','Winter'];return names[+day.slice(5,7)-1];
}
function approachingSeason(day,latitude){
 if(Math.abs(latitude)<15)return null;
 for(var n=0;n<=21;n++){var date=shift(day,n);if(seasonAt(shift(date,-1),latitude)!==seasonAt(date,latitude))return seasonAt(date,latitude)}
 // Include the opening fortnight after a season has turned.
 for(var n=0;n<14;n++){var date=shift(day,-n);if(seasonAt(shift(date,-1),latitude)!==seasonAt(date,latitude))return seasonAt(date,latitude)}return null;
}
function wishlistSignals(data,day){
 var map=Object.create(null),out=[],ranks=(data.wishlist||{}).ranks||{},passed=new Set((data.wishlist||{}).passed||[]),ratings=new Map(),boards=new Set(),season=approachingSeason(day,data.city.latitude);
 (data.items||[]).forEach(function(p){map[p.id]=p});
 function usable(ids){return ids.length>0&&ids.every(function(id){var p=map[id];return p&&!passed.has(id)&&(daily.isActivePiece(p)&&!p.stored||wearableWish(p))})}
 Object.keys(data.ratings||{}).sort().forEach(function(key){var r=data.ratings[key];if(!r||!Array.isArray(r.ids)||[1,0,-1].indexOf(r.r)<0)return;var ids=Array.from(new Set(r.ids)).sort();if(!usable(ids))return;var stamp=Number(r.t)||0;if(stamp&&stamp>=start(shift(day,1),data.city.timezone).getTime())return;var sig=JSON.stringify(ids),prior=ratings.get(sig);if(!prior||prior.t<=stamp)ratings.set(sig,{ids:ids,r:r.r,t:stamp})});
 Object.keys(data.boards||{}).forEach(function(id){var b=data.boards[id],ids=Array.from(new Set((b.pieces||[]).map(function(p){return p.id}))).sort();if(usable(ids))boards.add(JSON.stringify(ids))});
 (data.items||[]).filter(function(p){return wearableWish(p)&&!passed.has(p.id)}).forEach(function(p){
  if(!readingDue(data.readings,'wishlist',p.id,day,30))return;
  var rank=Number.isSafeInteger(ranks[p.id])&&ranks[p.id]>0?ranks[p.id]:null,top=rank!==null&&rank<=3,loves=0,boardCount=0;
  ratings.forEach(function(r){if(r.r===1&&r.ids.indexOf(p.id)>=0)loves++});boards.forEach(function(sig){if(JSON.parse(sig).indexOf(p.id)>=0)boardCount++});
  // Only a known wishlist-entry date can support an age claim. An ordinary
  // addedAt on a piece later moved to the wishlist is deliberately insufficient.
  var added=p.wishlistAddedAt||(p.source==='Wishlist'?p.addedAt:null),addedDay=typeof added==='string'?added.slice(0,10):'',days=validDay(addedDay)?age(addedDay,day):null,milestone=null;
  if(top&&days!==null)[90,180,365].forEach(function(n){if(days>=n&&days<n+7)milestone=n});
  var inSeason=top&&season&&(p.seasons||[]).some(function(s){return s.toLowerCase()===season.toLowerCase()}),strength=Number(top)+Number(loves>=2)+Number(boardCount>=2),kind=strength>=2&&(loves>=2||boardCount>=2)?'converging':loves>=2?'love':boardCount>=2?'boards':milestone?'milestone':inSeason?'season':null;
  if(!kind)return;
  var name=p.name||'This piece',head,detail=[];
  if(kind==='converging')head='If something joins your closet next, '+name+' might be it.';
  else if(kind==='love')head=name+' keeps finding its way into outfits you love.';
  else if(kind==='boards')head='You’ve already imagined a few lives for '+name+'.';
  else if(kind==='milestone')head=(milestone===90?'Three months':milestone===180?'Six months':'A year')+' later, '+name+' still has your attention.';
  else head=name+'’s season is coming around.';
  if(top)detail.push('Among your top three wishes.');
  if(loves)detail.push('You loved '+loves+' distinct Lab '+(loves===1?'combination':'combinations')+' featuring it.');
  if(boardCount)detail.push('It appears on '+boardCount+' saved outfit '+(boardCount===1?'board':'boards')+'.');
  if(milestone&&kind!=='milestone')detail.push('On your wishlist for '+milestone+' days.');
  if(kind==='season')detail.push('Tagged for '+season.toLowerCase()+', as the season comes around.');
  out.push({type:'wishlist',score:kind==='converging'?83:kind==='love'?76:kind==='boards'?73:kind==='milestone'?72:74,headline:head,body:detail.join(' '),actions:((data.wishlist||{}).lab||{})[p.id]?[{kind:'wish-lab',id:p.id,label:'Try in Lab'},{kind:'wish',id:p.id,label:'View wish'}]:[{kind:'wish',id:p.id,label:'View wish'}],wishlist:{id:p.id,kind:kind,rank:rank,loved:loves,boards:boardCount,milestone:milestone,season:kind==='season'?season:null}});
 });return out;
}
var FOLKLORE=[
 {id:'brigids-eve',date:'01-31',label:'Irish folklore · January 31',headline:'A little cloth, a little luck.',body:'On St Brigid’s Eve, an Irish tradition leaves cloth or ribbon outside for Brigid’s blessing. A small story of hope to carry with a favorite scarf.',source:{label:'The tradition of St Brigid’s Eve',url:'https://www.fingal.ie/ga/node/4943'},match:function(p){return /scarves|scarfs|shawls|ribbons/i.test((p.sub||'')+' '+(p.kind||''))}},
 {id:'may-layers',date:'05-01',north:true,label:'English folklore · May',headline:'Spring has made promises before.',body:'An old English proverb cautions against putting away warm clothes too soon in May. Whether it means the month or the hawthorn blossom is debated. A favorite light layer can have another turn.',source:{label:'The May clothing proverb',url:'https://www.phrases.org.uk/meanings/till-may-is-out.html'},match:function(p){return p.sub==='Cardigans'||p.sub==='Blazers'||p.sub==='Jackets'||p.labAs==='layer'}},
 {id:'womens-sunday',date:'06-21',label:'A date in dress · June 21, 1908',headline:'Three colors with something to say.',body:'At Women’s Sunday in 1908, suffragette regalia brought purple, white, and green together. Your closet has a little of that palette, too.',source:{label:'London Museum: suffragette regalia',url:'https://artsandculture.google.com/asset/regalia-of-the-women-s-social-political-union/0gGKdbHPMOBPQg?hl=en'},colors:['purple','white','green']},
 {id:'st-swithin',date:'07-15',label:'English folklore · July 15',headline:'Forty days of rain? The boots are unconvinced.',body:'English folklore says rain on St Swithin’s Day foretells forty more rainy days. The weather does not keep that promise, but your boots can still have their moment.',source:{label:'The weather behind St Swithin’s Day',url:'https://www.rmets.org/metmatters/behind-folklore-st-swithins-day-does-rain-today-really-mean-ruined-summer'},match:function(p){return (p.meta==='Footwear'||p.meta==='Shoes')&&/boots/i.test(p.sub||'')}}
];
function folkloreSignals(data,S,preview){
 var owned=(data.items||[]).filter(function(p){return daily.isActivePiece(p)&&!p.stored}),day=S.date;
 return FOLKLORE.map(function(story){
  var since=age(day.slice(0,4)+'-'+story.date,day);
  // A three-day window lets a major sky event keep its headline first.
  if(!preview&&(since<0||since>2||S.events.length))return null;
  if(story.north&&data.city.latitude<15)return null;
  if(!readingDue(data.readings,'folklore',story.id,day,0,2))return null;
  var pieces=owned.filter(function(p){return story.match?story.match(p):(p.colors||[]).some(function(c){return story.colors.indexOf(c)>=0})}).sort(function(a,b){return Number(!!b.fav)-Number(!!a.fav)||a.id.localeCompare(b.id)});
  if(!pieces.length)return null;
  var actions=story.colors?story.colors.filter(function(c){return pieces.some(function(p){return (p.colors||[]).indexOf(c)>=0})}).slice(0,2).map(function(c){return {kind:'color',color:c,label:'Show '+c}}):[{kind:'piece',id:pieces[0].id,label:'Wear it today'},{kind:'board',id:pieces[0].id,label:'Add to board'}];
  return {type:'folklore',score:95,eyebrow:story.label,headline:story.headline,body:story.body,actions:actions,folklore:{id:story.id}};
 }).filter(Boolean);
}
function readingSource(card){var story=card&&card.folklore&&FOLKLORE.find(function(s){return s.id===card.folklore.id});return story?story.source:null}
function seasonalSignals(data,S){
 var day=S.date,year=+day.slice(0,4),owned=(data.items||[]).filter(function(p){return daily.isActivePiece(p)&&!p.stored}),days=eligibleDays(data.days,owned),out=[],map=Object.create(null);owned.forEach(function(p){map[p.id]=p});
 // Require distinct evidence in both prior years; a single autumn is not a habit.
 function priorCounts(test){return [1,2].map(function(back){var target=(year-back)+day.slice(4);if(!validDay(target))return 0;return Object.keys(days).filter(function(d){return d.slice(0,4)===String(year-back)&&Math.abs(age(d,target))<=14&&days[d].ids.some(function(id){return map[id]&&test(map[id])})}).length})}
 function recent(test){return Object.keys(days).some(function(d){var n=age(d,day);return n>=0&&n<30&&days[d].ids.some(function(id){return map[id]&&test(map[id])})})}
 [
  {id:'boots',test:function(p){return (p.meta==='Footwear'||p.meta==='Shoes')&&/boots/i.test(p.sub||'')},head:'Boot season is stirring.',noun:'boots'},
  {id:'linen',test:function(p){return (p.material||[]).some(function(m){return m.toLowerCase()==='linen'})},head:'The linen is beginning to wake up.',noun:'linen'}
 ].forEach(function(group){
  var counts=priorCounts(group.test),p=owned.filter(group.test).sort(function(a,b){return Number(!!b.fav)-Number(!!a.fav)||a.id.localeCompare(b.id)})[0];
  if(!p||counts.some(function(n){return n<3})||recent(group.test)||!readingDue(data.readings,'seasonal',group.id,day,60))return;
  out.push({type:'seasonal',score:77,headline:group.head,body:'Around this time in '+(year-2)+' and '+(year-1)+', you logged '+group.noun+' on '+counts[1]+' and '+counts[0]+' days. '+p.name+' could start this year’s chapter.',actions:[{kind:'piece',id:p.id,label:'Wear it today'},{kind:'board',id:p.id,label:'Add to board'}],seasonal:{id:group.id,pieceId:p.id,counts:counts}});
 });
 var colors=Array.from(new Set(owned.flatMap(function(p){return p.colors||[]}))).filter(function(c){return ['?','multicolor','clear','gold','silver'].indexOf(c)<0}).sort();
 colors.forEach(function(color){var test=function(p){return (p.colors||[]).indexOf(color)>=0},counts=priorCounts(test);if(counts.some(function(n){return n<3})||recent(test)||!readingDue(data.readings,'seasonal','color:'+color,day,60))return;
 out.push({type:'seasonal',score:71,headline:'This time of year has had a little '+color+' in it.',body:'Around these dates in each of the past two years, '+color+' appeared on at least '+Math.min.apply(null,counts)+' logged days. A familiar color for a new chapter.',actions:[{kind:'color',color:color,label:'Show '+color}],seasonal:{id:'color:'+color,counts:counts}})});
 return out;
}

function dailyHistory(history,day,key,card){
 var next={},ledger=anniversaryHistory(history),feature=anniversaryFeature(card),readings=readingHistory(history),reading=readingFeature(card);
 Object.keys(history||{}).filter(validDay).sort().slice(-31).forEach(function(d){next[d]=history[d]});
 next[day]={algorithmVersion:VERSION,cityKey:key,card:card};
 if(feature)ledger[feature.pieceId]={day:day,acquiredDate:feature.acquiredDate};
 if(Object.keys(ledger).length)next._anniversaries=ledger;
 if(reading)readings[reading.kind][reading.id]=day;
 if(Object.keys(readings).some(function(kind){return Object.keys(readings[kind]).length}))next._readings=readings;
 return next;
}
function validCard(card,data,day){
 var map=Object.create(null);(data.items||[]).forEach(function(p){map[p.id]=p});
 if(!(card.actions||[]).every(function(a){var ids=['piece','board','love','pull'].indexOf(a.kind)<0?[]:a.id?[a.id]:a.ids||[];return ids.every(function(id){var p=map[id];return daily.isActivePiece(p)&&(a.kind==='pull'||!p.stored)})}))return false;
 var reading=readingFeature(card);
 if(reading){var S={date:day,events:[]},candidates=reading.kind==='wishlist'?wishlistSignals(data,day):reading.kind==='folklore'?folkloreSignals(data,S,false):seasonalSignals(data,S);return candidates.some(function(c){var a=c[reading.kind],b=card[reading.kind];return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(function(key){return Object.prototype.hasOwnProperty.call(b,key)&&JSON.stringify(a[key])===JSON.stringify(b[key])})&&c.actions.length===(card.actions||[]).length&&c.actions.every(function(action,i){var saved=card.actions[i];return Object.keys(action).length===Object.keys(saved).length&&Object.keys(action).every(function(key){return action[key]===saved[key]})})})}
 if((card.actions||[]).some(function(a){return a.kind==='wish'||a.kind==='wish-lab'}))return false;
 var feature=anniversaryFeature(card);if(!feature)return ['anniversary','wishlist','folklore','seasonal'].indexOf(card.type)<0;
 var p=map[feature.pieceId],wears=Object.keys(data.days||{}).filter(function(d){return d<=day&&(data.days[d].ids||[]).indexOf(feature.pieceId)>=0});
 return !!p&&anniversaryEligible(p,wears,day,data.anniversaries);
}

// Different color stories still feel like the same subject to the reader.
function cardFamily(card){
 if(!card)return null;card=card.card||card;
 var type=card.readingType||card.type;
 // Older special-date cards did not retain their underlying reading type.
 if(type&&type.indexOf('big-')===0){
  if(card.anniversary)type='anniversary';else if(card.wishlist)type='wishlist';else if(card.folklore)type='folklore';else if(card.seasonal)type='seasonal';else if((card.actions||[]).some(function(a){return a.kind==='color'}))type='color';
 }
 return type==='color'||type==='drought'||type==='seasonal'&&card.seasonal&&String(card.seasonal.id).indexOf('color:')===0?'color':type||null;
}
// Remember the observation, rather than its headline wording or changing counts.
function cardSubject(card){
 if(!card)return null;card=card.card||card;
 var type=card.readingType||card.type,actions=card.actions||[],match;
 if(type==='color'||String(type).indexOf('big-')===0){match=/In the past 30 days, (.+?) appeared on /.exec(card.body||'');if(match)return 'color:dominant:'+match[1]}
 if(type==='drought'){var color=actions.find(function(a){return a.kind==='color'});return color?'color:drought:'+color.color:null}
 if(type==='rising'||type==='never'){var piece=actions.find(function(a){return a.kind==='piece'});return piece?'piece:'+piece.id:null}
 if(type==='taste'){var love=actions.find(function(a){return a.kind==='love'});return love?'taste:'+(love.ids||[]).slice().sort().join('|'):null}
 if(type==='ahead'){var trip=actions.find(function(a){return a.kind==='trip'});return trip?'trip:'+trip.id:null}
 if(type==='swap'){var pull=actions.find(function(a){return a.kind==='pull'});return pull?'swap:'+(pull.ids||[]).slice().sort().join('|'):null}
 if(type==='dark')return 'dark';
 return null;
}
// Keep dominant-color and color-drought readings from alternating every other day.
function repeatsRecent(card,previous,day){
 var family=cardFamily(card),subject=cardSubject(card);if(!family)return false;
 return Object.keys(previous||{}).some(function(d){var gap=age(d,day);return validDay(d)&&gap>0&&((gap===1||family==='color'&&gap<7)&&cardFamily(previous[d])===family||subject&&gap<30&&cardSubject(previous[d])===subject)});
}
function choose(data,S,previous,previewIndex){
 var day=S.date,items=data.items.filter(daily.isActivePiece),days=eligibleDays(data.days,items),owned=items.filter(function(p){return !p.stored}),signals=[],month=+day.slice(5,7),season=S.events.find(function(e){return e.season}),currentSeason=data.city.latitude<0?['Summer','Summer','Fall','Fall','Fall','Winter','Winter','Winter','Spring','Spring','Spring','Summer'][month-1]:['Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer','Fall','Fall','Fall','Winter'][month-1];
 function inSeason(p,which){return !(p.seasons||[]).length||(p.seasons||[]).some(function(s){return s.toLowerCase()===which.toLowerCase()||s==='All season'||s==='All seasons'})}
 function signal(type,score,heads,body,actions){var card={type:type,score:score,headline:heads[hash(day+type)%heads.length],body:body,actions:actions||[]};signals.push(card);return card}
 function pieceAction(p){return [{label:'Wear it today',kind:'piece',id:p.id},{label:'Add to board',kind:'board',id:p.id}]}
 var lore=S.angle<180?'The moon is growing. Try something out.':'The moon is waning. Make room for a different mood.';
 items.forEach(function(p){var wears=Object.keys(days).filter(function(d){return d<=day&&days[d].ids.indexOf(p.id)>=0}).sort(),last=wears[wears.length-1],date=Object.prototype.hasOwnProperty.call(p,'acquiredDate')?p.acquiredDate:p.date,years=date?+day.slice(0,4)-+date.slice(0,4):0;
 if(!p.stored&&p.fav&&inSeason(p,currentSeason)&&(!last||age(last,day)>=limits.risingDays))signal('rising',65,[p.name+' is rising.','A little daylight for '+p.name+'.'],'A favorite, '+(last?'last worn '+last:'still waiting for its first outing')+'. '+lore,pieceAction(p));
 if(!p.stored&&!last&&age(date,day)>=limits.neverDays)signal('never',45,['A first outing for '+p.name+'?','Let '+p.name+' meet the daylight.'],'It has been yours for at least '+limits.neverDays+' days. Give it a try.',pieceAction(p));
 if(anniversaryEligible(p,wears,day,data.anniversaries)){var birthday=signal('anniversary',80+(p.fav?5:0)+Math.min(wears.length,5),[years+' years with '+p.name+'.',p.name+' has a birthday.'],'It arrived on '+date+'. Take it out for its birthday.',pieceAction(p));birthday.anniversary={pieceId:p.id,acquiredDate:date,reason:anniversaryReason(p,wears,day)}}
 });
 var recent=Object.keys(days).filter(function(d){var n=age(d,day);return n>=0&&n<30}),counts={},families={};recent.forEach(function(d){Object.keys(days[d].colors).filter(function(c){return c!=='clear'}).forEach(function(c){counts[c]=(counts[c]||0)+1})});owned.forEach(function(p){(p.colors||[]).forEach(function(c){if(c!=='?'&&c!=='multicolor'&&c!=='clear')(families[c]||(families[c]=[])).push(p)})});
 var dry=Object.keys(families).filter(function(c){return families[c].length>=limits.droughtPieces&&!Object.keys(days).some(function(d){var n=age(d,day);return n>=0&&n<limits.droughtDays&&days[d].colors[c]})}).sort();
 Object.keys(counts).sort().forEach(function(c){if(recent.length&&counts[c]/recent.length>=limits.tide&&dry.length){var alternatives=dry.filter(function(x){return x!==c}).slice(0,2);if(alternatives.length)signal('color',70,['Colors in rotation.','Colors in recent wear logs.'],'In the past 30 days, '+c+' appeared on '+counts[c]+' of '+recent.length+' logged '+(recent.length===1?'day':'days')+'. No wears logged in the past '+limits.droughtDays+' days: '+alternatives.join(' and ')+'.',alternatives.map(function(x){return {kind:'color',color:x,label:'Show '+x}}))}});
 if(dry.length)signal('drought',50,['A little '+dry[0]+' on the horizon.','Let '+dry[0]+' have a turn.'],families[dry[0]].length+' pieces, with no '+dry[0]+' logged in the last '+limits.droughtDays+' days. '+lore,[{kind:'color',color:dry[0],label:'Show '+dry[0]}]);
 (data.loved||[]).forEach(function(o){if(!o.ids.every(function(id){return owned.some(function(p){return p.id===id})}))return;var worn=Object.keys(days).some(function(d){return d<=day&&o.ids.every(function(id){return days[d].ids.indexOf(id)>=0})});if(!worn)signal('taste',60,['A love from the Lab has never seen daylight.','Something you loved is ready to go out.'],'You rated this combination Love. '+lore,[{kind:'love',ids:o.ids,label:'Open the outfit'}])});
 tripRows(data.trips,day).forEach(function(t){var n=age(day,t.start),unplanned=t.days.find(function(d){return d.date>=day&&!d.pinned});if(n<=limits.aheadDays&&unplanned)signal('ahead',75,['An outfit to plan under '+(S.lit<.25?'a thin':'tonight’s')+' moon.','A little planning for '+t.name+'.'],t.name+(n===1?' starts tomorrow.':n>1?' starts in '+n+' days.':n===0?' starts today.':' is underway.')+' '+new Date(unplanned.date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'})+' still needs an outfit.',[{kind:'trip',id:t.id,label:'Plan '+new Date(unplanned.date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'})}])});
 var stored=items.filter(function(p){return p.stored&&inSeason(p,season?season.season:currentSeason)});
 if((season||S.crossing)&&stored.length)signal('swap',90,['A season is waiting in storage.','The light turns. Your layers can, too.'],stored.length+' '+(season?season.season:currentSeason).toLowerCase()+' pieces are still in storage. See what wants to come back.',[{kind:'pull',ids:stored.map(function(p){return p.id}),label:'Pull list'}]);
 if(S.sunsetMinutes!=null&&S.sunsetMinutes<limits.earlyDarkMinutes&&owned.some(function(p){return p.meta==='Outerwear'||p.sub==='Cardigans'}))signal('dark',35,['Dusk comes at '+S.sunsetText+'. Bring a layer.','An early sunset, a good evening for layers.'],'The light goes early. Bring the layer you’ll want on the way home.',[{kind:'layers',label:'Show coats & layers'}]);
 signals=signals.concat(wishlistSignals(data,day),seasonalSignals(data,S),folkloreSignals(data,S,Number.isFinite(previewIndex)));
 signals.sort(function(a,b){return b.score-a.score||a.headline.localeCompare(b.headline)});
 var avoid=cardFamily(previous&&previous[shift(day,-1)]);
 var chosen=signals.find(function(s){return !repeatsRecent(s,previous,day)&&s.actions.length})||(avoid==='ambient'?{type:'daylight',headline:'The light over your closet.',body:S.sunsetText?'Sunset today is '+S.sunsetText+'.':S.daylight==null?'Daylight follows the season where you are.':Math.floor(S.daylight)+' h '+Math.round(S.daylight%1*60)+' m of daylight today.',actions:[]}:{type:'ambient',headline:S.angle<180?'A growing moon, a little room to try.':'A quieter moon. Let the day find its shape.',body:(S.daylight==null?'The light takes its own course here.':Math.floor(S.daylight)+' h '+Math.round(S.daylight%1*60)+' m of daylight today.')+' '+lore,actions:[]});
 if(S.events.length){var e=S.events[0],head=e.kind==='full'?'Tonight belongs to the '+e.name+'.':e.kind==='new'?'A dark moon. A clean slate.':e.kind==='clock'?'Dusk comes at '+S.sunsetText+' now.':e.kind==='season'?(e.name==='Winter solstice'?'The longest night. From here the light comes back.':e.name==='Summer solstice'?'The longest light. Let the evening linger.':'The light turns toward '+e.season.toLowerCase()+'.'):e.kind==='eclipse'?e.name+' in the sky over your city.':'The earliest sunsets start here.';chosen=Object.assign({},chosen,{type:'big-'+e.kind,readingType:chosen.type,eyebrow:e.name.toUpperCase()+(e.time?' · '+clock(new Date(e.time),data.city.timezone):''),headline:head,body:e.kind==='full'?'Full at '+clock(new Date(e.time),data.city.timezone)+'. '+chosen.body:chosen.body,actions:chosen.actions});if(anniversaryFeature(chosen))chosen.anniversary=anniversaryFeature(chosen)}
 if(Number.isFinite(previewIndex)){var cards=[chosen].concat(signals),seen={};cards=cards.filter(function(card){var key=JSON.stringify([card.headline,card.body,card.actions]);if(seen[key])return false;seen[key]=true;return true});return cards[((Math.floor(previewIndex)%cards.length)+cards.length)%cards.length]}
 return chosen;
}
// Refresh editorial headings at display time, including already saved daily readings.
// Selection, saved evidence, body copy, and actions remain unchanged.
function headline(card){
 var head=card.headline||'',body=card.body||'',match;
 function capital(text){return text.charAt(0).toUpperCase()+text.slice(1)}
 if(card.type==='color'&&(head==='Colors in rotation.'||head==='Colors in recent wear logs.')){
  match=/^In the past 30 days, (.+?) appeared on (\d+) of /.exec(body);
  if(match&&Number(match[2])===1)return 'A little '+match[1]+' in the mix.';
  if(match)return capital(match[1])+(head==='Colors in rotation.'?' has been setting the pace.':' keeps finding its way into your days.');
 }
 if(card.type==='ahead'){
  match=/^A little planning for (.+)\.$/.exec(head);
  if(match)return match[1]+' is on the horizon.';
 }
 if(card.type==='swap'&&head==='A season is waiting in storage.'){
  match=/^\d+ (.+?) pieces are still in storage\./.exec(body);
  if(match)return capital(match[1])+' is waiting in the wings.';
 }
 if(card.type==='dark'&&head==='An early sunset, a good evening for layers.')return 'An early dusk. A layer worth bringing.';
 if(card.type==='daylight'&&head==='The light over your closet.'){
  match=/^Sunset today is (.+)\.$/.exec(body);
  return match&&!/^No sunset/i.test(match[1])?'The last light comes at '+match[1]+'.':'The light is keeping its own hours.';
 }
 return head;
}
var api={version:VERSION,cardFamily:cardFamily,repeatsRecent:repeatsRecent,readingHistory:readingHistory,readingSource:readingSource,wishlistSignals:wishlistSignals,seasonalSignals:seasonalSignals,folkloreSignals:folkloreSignals,paletteVersion:3,headline:headline,dayPalette:dayPalette,swatchBackground:swatchBackground,anniversaryReason:anniversaryReason,anniversaryEligible:anniversaryEligible,anniversaryHistory:anniversaryHistory,dailyHistory:dailyHistory,validCard:validCard,limits:limits,shift:shift,age:age,dayAt:dayAt,start:start,sky:sky,choose:choose,preview:function(data,S,index){return choose(data,S,{},index)},loggedDays:loggedDays,paletteCounts:paletteCounts,tripRows:tripRows,phaseName:phaseName};if(typeof module==='object'&&module.exports)module.exports=api;else root.ClosetLintAlmanac=api;
})(typeof globalThis!=='undefined'?globalThis:this);
