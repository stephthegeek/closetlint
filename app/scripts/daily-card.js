/* Deterministic, local daily readings. No AI, network, or wardrobe mutations. */
var ClosetLintDaily=(function(){
 'use strict';
 var version=1,DAY=86400000;
 function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
 function rng(seed){return function(){var t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
 function stamp(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||'')?Date.parse(s+'T12:00:00Z'):NaN}
 function daysSince(date,day){var delta=(stamp(day)-stamp(date))/DAY;return Number.isFinite(delta)?Math.max(0,Math.floor(delta)):null}
 function latest(p,day){return (p.wears||[]).filter(function(d){return Number.isFinite(stamp(d))&&d<=day}).sort().pop()||p.date||''}
 function isOffDuty(p){return !!p&&(['Swimwear','Loungewear','Activewear','Costumes','Lingerie'].indexOf(p.meta)>=0||p.section==='offduty'||p.section==='sexy')}
 function isIntimate(p){return !!p&&(['Underwear','Lingerie'].indexOf(p.meta)>=0||['Bras','Panties','Panties & thongs','Shapewear','Slips & crinolines','Intimates','Bralettes','Teddies & bodysuits'].indexOf(p.sub)>=0)}
 function active(p){return !!p&&typeof p.id==='string'&&!p.wish&&!p.hidden&&!p.removed&&!p.gone&&!p.donate&&!isOffDuty(p)&&!isIntimate(p)}
 function speak(p){
  if(typeof p.nickname==='string'&&p.nickname.trim())return p.nickname.trim().slice(0,70);
  var colors=(p.colors||[]).filter(function(c){return c!=='multicolor'&&c!=='clear'}),details=['velvet','lace','botanical','floral','striped','plaid','celestial','animal','graphic','ribbed'];
  var tags=[].concat(p.material||[],p.pattern||[]),motif=details.find(function(t){return tags.indexOf(t)>=0})||'';
  var noun=String(p.sub||p.meta||'piece').toLowerCase().replace(/ & .*/, '').replace(/\btees\b/,'tee').replace(/\bshirts\b/,'shirt').replace(/\bskirts\b/,'skirt').replace(/\bsweaters\b/,'sweater').replace(/\btops\b/,'top').replace(/\bblouses\b/,'blouse').replace(/\bdresses\b/,'dress').replace(/\bnecklaces\b/,'necklace').replace(/\brings\b/,'ring');
  return [colors[0],motif,noun].filter(Boolean).join(' ').slice(0,90);
 }
 function weighted(items,weight,random){var total=items.reduce(function(n,p){return n+weight(p)},0),n=random()*total;for(var i=0;i<items.length;i++){n-=weight(items[i]);if(n<0)return items[i]}return items[items.length-1]}
 function special(day){var d=new Date(day+'T12:00:00Z');return day.slice(5)==='10-31'?'halloween':day.slice(5)==='01-01'?'newyear':d.getUTCDay()===5&&d.getUTCDate()===13?'friday13':null}
 function eligible(s,filtered){return ['all','clothing','accessories','jewelry'].indexOf(s.tab)>=0&&!filtered&&!s.showStored&&!s.showHidden&&!s.showDonate&&!s.wishOnly&&!Object.keys(s.collectionFilter||{}).some(function(k){return s.collectionFilter[k]})&&!s.collectionManager&&!s.selectMode&&!s.editView&&!s.skyFilter&&s.sort==='new'&&!s.sortRev}
 function generate(options){
  var day=options.day;if(!Number.isFinite(stamp(day)))throw new Error('Daily card needs a local calendar date');
  var random=rng(hash(day+'|'+options.instance)),bank=options.lines,history=options.history||[],items=(options.items||[]).filter(active).slice().sort(function(a,b){return a.id.localeCompare(b.id)});
  var tone=random()<.2?'gremlin':'mystic',used=history.map(function(h){return h.hash}),event=special(day);
  var available=items.filter(function(p){return !p.stored&&(!(p.seasons||[]).length||!options.season||p.seasons.indexOf(options.season)>=0)});
  var neglected=items.filter(function(p){var age=daysSince(latest(p,day),day);return p.fav&&age!==null&&age>=30&&!history.some(function(h){return h.pieceId===p.id&&h.type==='neglected'&&daysSince(h.day,day)<14})}).sort(function(a,b){return daysSince(latest(b,day),day)-daysSince(latest(a,day),day)||a.id.localeCompare(b.id)});
  var counts=Object.create(null),worn=Object.create(null),pairs=Object.create(null),seen=Object.create(null);
  items.filter(function(p){return !p.stored}).forEach(function(p){var colors=(p.colors||[]).filter(function(c){return c!=='multicolor'&&c!=='clear'});colors.forEach(function(c){counts[c]=(counts[c]||0)+1;worn[c]=worn[c]||0});(p.wears||[]).filter(function(d){return Number.isFinite(stamp(d))&&d<=day}).forEach(function(d){seen[d]=(seen[d]||[]).concat(colors);if(daysSince(d,day)<=90)colors.forEach(function(c){worn[c]++})})});
  // A saved outfit also counts as an introduction, even before it is logged as worn.
  (options.outfits||[]).forEach(function(ids,i){seen['outfit-'+i]=items.filter(function(p){return ids.indexOf(p.id)>=0}).reduce(function(a,p){return a.concat(p.colors||[])},[])});
  Object.keys(seen).forEach(function(d){var c=Array.from(new Set(seen[d])).sort();c.forEach(function(a,i){c.slice(i+1).forEach(function(b){pairs[a+'|'+b]=true})})});
  var colors=Object.keys(counts).sort(),rare=colors.filter(function(c){return counts[c]>=3&&worn[c]===0}),unmet=[];
  colors.forEach(function(a,i){colors.slice(i+1).forEach(function(b){if(!pairs[a+'|'+b])unmet.push([a,b])})});
  var types=['fortune','do','dont','neglected','color'],start=Math.floor(random()*types.length),type='fortune',piece=null,vars={},lines;
  if(event){type='fortune';lines=bank.almanac[event]}
  else for(var t=0;t<types.length;t++){
   type=types[(start+t)%types.length];
   if(type==='do'&&!available.length||type==='neglected'&&!neglected.length||type==='color'&&!rare.length&&!unmet.length)continue;
   lines=bank[type][tone];
   if(type==='do')piece=weighted(available,function(p){var last=(p.wears||[]).filter(function(d){return Number.isFinite(stamp(d))&&d<=day}).sort().pop(),age=daysSince(last,day);return (p.fav?2:1)*(age!==null&&age<=3?.2:age===null||age>=14?1.5:1)},random);
   if(type==='neglected'){piece=neglected[0];vars.days=daysSince(latest(piece,day),day);if(piece.stored&&piece.where){lines=bank.neglected.stored;vars.bin=String(piece.where).slice(0,80)}}
   if(piece)vars.piece=speak(piece);
   if(type==='color'){if(rare.length){vars.color=rare[Math.floor(random()*rare.length)]}else{var pair=unmet[Math.floor(random()*unmet.length)];vars.colorA=pair[0];vars.colorB=pair[1];lines=bank.color.pair}}
   break;
  }
  var candidates=lines.map(function(line){return line.replace(/#(\w+)#/g,function(_,k){return vars[k]===undefined?'#'+k+'#':vars[k]})}).filter(function(s){return !/#\w+#/.test(s)});
  var fresh=candidates.filter(function(s){return used.indexOf(hash(s))<0});
  if(fresh.length)candidates=fresh;
  else if(!event){var fallback=bank.fortune.mystic.concat(bank.fortune.gremlin).filter(function(s){return used.indexOf(hash(s))<0});if(fallback.length){candidates=fallback;type='fortune';piece=null;vars={}}}
  var text=candidates[Math.floor(random()*candidates.length)]||bank.fortune.mystic[0];
  return {version:version,day:day,type:type,tone:tone,text:text,hash:hash(text),pieceId:piece?piece.id:null,colors:vars.color?[vars.color]:vars.colorA?[vars.colorA,vars.colorB]:[]};
 }
 return {generate:generate,eligible:eligible,hash:hash,speak:speak,daysSince:daysSince,isOffDuty:isOffDuty,isActivePiece:active};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ClosetLintDaily;
