/* Comfort evidence 3.0.2: seven explicit weights, optional stars, known fields only. */
(function(C){
 function values(p,k){return Array.isArray(p[k])?p[k]:typeof p[k]==='string'?[p[k]]:[]}
 // Eligibility and recorded-field coverage for Wishlist gap counts. Matching itself uses evidence().
 C.gapDomain=function(p,key){
  var q=key.split(':')[0],id=key.slice(q.length+1),meta=p.meta,sub=p.sub,fields={textures:['material'],patterns:['pattern'],colorlimits:['colors'],drape:['fits'],fastenings:['shoefeat'],openings:['shoefeat'],heels:['kind','shoefeat'],toes:['toe'],heel:['heelIn'],jewelrydetails:['jfeat'],jewelrymaterials:['jmetal'],jewelrystatement:['statement'],metaltones:['jmetal','colors','jfeat'],earrings:id==='cartilage'?['eartags']:['kind'],necklacelength:['length'],dressfastenings:['details'],dressdetails:['details'],toplength:['length'],skirtlength:['length'],coveragedetails:['plunging','shoulders'].includes(id)?['neckline']:['details']}[q];
  if(!meta||!fields)return null;
  if(['fastenings','openings','heels','toes','heel'].includes(q)&&meta!=='Footwear')return null;
  if(['jewelrydetails','jewelrymaterials','jewelrystatement','metaltones','earrings','necklacelength'].includes(q)&&meta!=='Jewelry')return null;
  if(q==='earrings'&&sub!=='Earrings'||q==='necklacelength'&&sub!=='Necklaces')return null;
  if(q==='toplength'&&!['Tops','Outerwear'].includes(meta))return null;
  if(q==='skirtlength'&&!(meta==='Bottoms'&&['Skirts','Skorts'].includes(sub)||meta==='One-pieces'&&sub==='Dresses'))return null;
  if(meta==='Jewelry'&&!sub)return null;
  var known=fields.some(function(field){return values(p,field).some(function(v){return v!=null&&String(v).trim()&&!/^(unknown|not set|other|\?)$/i.test(String(v).trim())})});
  if(q==='heel')known=/^\d+(?:\.\d+)?$/.test(String(p.heelIn??'').trim());
  return {scope:meta+(meta==='Jewelry'||q==='skirtlength'?'|'+sub:''),known:known};
 };
 C.evidence=function(profile,p,context){var out=[],garment=['Tops','Bottoms','One-pieces','Outerwear','Underwear','Swimwear','Loungewear','Activewear','Costumes','Lingerie','Workwear & uniforms','Cultural & traditional garments'].includes(p.meta);
 function traitLabel(q,it){
  var id=it.id,label=it.label;
  if(q.id==='toplength')return label+' length';
  if(q.id==='necklacelength')return {choker:'Choker',medium:'Medium necklace',long:'Long necklace'}[id]||label;
  if(q.id==='heel')return id==='0'?'Flats':id==='5'?'5"+ heels':id+'" heels';
  if(q.id==='heels')return {block:'Block heel',stiletto:'Stiletto',kitten:'Kitten heel',wedge:'Wedge',platform:'Platform'}[id]||label;
  if(q.id==='toes')return label.replace(', from above','');
  if(q.id==='openings')return {'open toe':'Open toe','open back':'Open back',slingback:'Slingback','ankle strap':'Ankle strap'}[id]||label;
  if(q.id==='fastenings')return {'slip-on':'Slip-on','lace-up':'Laces',zip:'Side zip',buckle:'Buckle','hook-loop':'Hook and loop'}[id]||label;
  if(q.id==='earrings')return {stud:'Studs',hoop:'Hoops',dangle:'Drops',climber:'Climbers',threader:'Threaders',cuff:'Cuffs',cartilage:'Cartilage'}[id]||label;
  if(q.id==='jewelrystatement')return {plain:'Subtle',medium:'Statement',loud:'Bold'}[id]||label;
  if(q.id==='jewelrymaterials'&&id==='alloy')return 'Other alloy';
  if(q.id==='metaltones')return {silver:'Silver',gold:'Gold','rose gold':'Rose gold','bronze-copper':'Bronze / copper',dark:'Dark metal',mixed:'Mixed metals'}[id]||label;
  return label;
 }
 function add(id,k,known){if(!known)return;var q=C.question(id),d=C.doc(profile,q.topic),a=C.item(d,q,k),it=q.items.find(function(it){return it.id===k});if(!a||a.skip||typeof a.value!=='number'||a.value===0)return;var weight=a.value,outing=C.round(C.doc(profile,'feet'),'occasion').choice,depends=['room','rangeanchor','rangeeveryday','dresspockets'].some(function(id){var qr=C.question(id);return ['depends','piece','day'].includes(C.round(C.doc(profile,qr.topic),id).choice)});if(weight<0&&weight>-3&&context&&((context.short&&outing==='short')||(context.special&&outing==='occasion')||((context.short||context.special)&&depends)))weight*=.5;out.push({key:id+':'+k,confirmed:true,kind:weight>0?'good':'warn',strength:a.value===-3?'hard':Math.abs(a.value)>=2?'strong':'soft',weight:weight,mustHave:d.stars.includes(id+'/'+k),trait:traitLabel(q,it),label:traitLabel(q,it)+' · '+C.labels[a.value+3].toLowerCase()+(d.stars.includes(id+'/'+k)?' 🌟':''),detail:'From your Comfort zone rating and this piece’s recorded details.'})}
 function match(id,field,map,enabled){if(enabled===false)return;Object.keys(map).forEach(function(k){add(id,k,values(p,field).some(function(v){return map[k].includes(v)}))})}
 function same(id){return Object.fromEntries(C.question(id).items.map(function(it){return [it.id,[it.id]]}))}
 match('textures','material',same('textures'));match('patterns','pattern',{stripes:['striped'],checks:['plaid','gingham','checkered'],floral:['floral','botanical'],dots:['polka dot'],animal:['animal','animal print'],geometric:['geometric'],abstract:['tie-dye','ombre','color block'],novelty:['graphic','slogan','skull','cartoon','celestial','hearts','food','novelty print']});match('colorlimits','colors',same('colorlimits'),p.meta!=='Jewelry');
 match('drape','fits',{soft:['flowy'],crisp:['structured']},garment);
 if(p.meta==='Footwear'){
 match('fastenings','shoefeat',{'slip-on':['slip-on'],'lace-up':['lace-up'],zip:['zip'],buckle:['buckle'], 'hook-loop':['hook-and-loop']});match('openings','shoefeat',{'open toe':['open toe'],'open back':['open back'],slingback:['slingback'],'ankle strap':['ankle strap']});match('heels','kind',{block:['block'],stiletto:['stiletto'],kitten:['kitten']});match('heels','shoefeat',{wedge:['wedge'],platform:['platform']});match('toes','toe',same('toes'));
 var height=String(p.heelIn??'').trim();if(/^\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?$/.test(height)){var hs=height.match(/\d+(?:\.\d+)?/g).map(Number),low=Math.min(...hs),high=Math.max(...hs),d=C.doc(profile,'feet'),r=C.round(d,'heel');if(r.none&&low>0)out.push({key:'heel:none',kind:'warn',strength:'strong',weight:-2,confirmed:true,label:'Heels · you don’t wear them'});else if(Math.floor(low)===Math.floor(high))add('heel',String(Math.min(5,Math.floor(low))),true);var tolerated=C.question('heel').items.filter(function(it){var a=C.item(d,C.question('heel'),it.id);return a&&typeof a.value==='number'&&a.value>=-1}).map(function(it){return +it.id});if(tolerated.length&&low>Math.max(...tolerated)&&!out.some(function(x){return x.key.startsWith('heel:')}))out.push({key:'heel:height',kind:'warn',strength:'strong',weight:-2,confirmed:true,label:'Higher than your usual heel'})}
 }
 if(p.meta==='Jewelry'){
 match('jewelrydetails','jfeat',{gemstones:['gemstones'],crystals:['crystals / rhinestones'],pearls:['pearls'],enamel:['enamel'],beads:['beaded'],charms:['charms / dangle']});match('jewelrymaterials','jmetal',Object.assign(same('jewelrymaterials'),{'sterling silver':['sterling silver','silver','silver plated','silver-plated'],'gold-filled / solid gold':['gold-filled / solid gold','gold','gold filled','gold-filled','solid gold','gold plated','gold-plated']}));match('jewelrystatement','statement',same('jewelrystatement'));
 if(values(p,'jfeat').includes('mixed metals'))add('metaltones','mixed',true);else{match('metaltones','colors',{silver:['silver'],gold:['gold']});match('metaltones','jmetal',{'rose gold':['rose gold'],'bronze-copper':['bronze','copper'],dark:['gunmetal','blackened']})}
 if(p.sub==='Earrings'){match('earrings','kind',{stud:['stud'],hoop:['hoop'],dangle:['dangle'],climber:['climber'],threader:['chain / threader']});match('earrings','eartags',{cartilage:['cartilage']})}
 if(p.sub==='Necklaces')match('necklacelength','length',{choker:['choker'],medium:['medium'],long:['long']});
 }
 if(garment){match('dressfastenings','details',{buttons:['button-front'],zips:['zipper'],ties:['tie-front'],buckles:['buckles'],lacing:['corset / lacing']});match('dressdetails','details',{fringe:['fringe'],tassels:['tassels'],chains:['chains']});}
 if(['Tops','Outerwear'].includes(p.meta))match('toplength','length',same('toplength'));
 var skirt=(p.meta==='Bottoms'&&['Skirts','Skorts'].includes(p.sub))||(p.meta==='One-pieces'&&p.sub==='Dresses');if(skirt)match('skirtlength','length',same('skirtlength'));
 if(['Tops','Outerwear','One-pieces'].includes(p.meta)){match('coveragedetails','neckline',{plunging:['plunging'],shoulders:['off-shoulder','one-shoulder','strapless']});match('coveragedetails','details',{backless:['backless'],cutouts:['cutouts'],sheer:['sheer']})}
 var care=p.care||{};add('careeffort','hand',['Hand wash','Hand wash cold'].includes(care.wash));add('careeffort','cleaner',care.wash==='Dry clean only');add('careeffort','gentle',care.wash==='Machine wash gentle');add('careeffort','iron',['Sometimes needs steaming or ironing','Usually needs steaming or ironing'].includes(care.wrinkleUpkeep));add('careeffort','hang',care.dry==='Hang to dry');add('careeffort','flat',care.dry==='Lay flat to dry');
 [['earrings',p.meta==='Jewelry'&&p.sub==='Earrings'],['necklacelength',p.meta==='Jewelry'&&p.sub==='Necklaces'],['skirtlength',skirt]].forEach(function(x){var q=C.question(x[0]);if(x[1]&&C.round(C.doc(profile,q.topic),q.id).none)out.push({key:q.id+':none',kind:'warn',strength:'strong',weight:-2,confirmed:true,label:q.noneLabel})});
 // Unchanged pick-one preferences retain their existing conservative evidence.
 var legacy={};C.questions.filter(function(q){return q.type==='one'}).forEach(function(q){var r=C.round(C.doc(profile,q.topic),q.id);if(r.choice)legacy['comfort-'+q.id]={version:1,status:'answered',value:r.choice}});ClosetLintComfortLegacy.evidence(legacy,p).forEach(function(row){row.weight=row.kind==='good'?1:row.strength==='hard'?-3:-1;out.push(row)});
 return out.filter(function(x,i,a){return a.findIndex(function(y){return y.key===x.key})===i});
 };
 C.guidance=function(profile,p,context){var rows=C.evidence(profile,p,context),score=rows.reduce(function(n,r){return n+r.weight*.04+(r.mustHave?.04:0)},0);return {score:Math.max(-.3,Math.min(.25,score)),blocked:false,reasons:rows,algorithmVersion:'3.0.2'}};
 C.outfitGuidance=function(profile,o,heldId){var score=0,parts=['top','bottom','one','layer','under'].map(function(k){return o[k]}).filter(Boolean),patterns=parts.map(function(p){return values(p,'pattern')}),q=C.question('patternamount'),d=C.doc(profile,q.topic);
 if(patterns.length&&patterns.every(function(a){return a.length})&&!parts.some(function(p){return p.id===heldId})){var n=patterns.filter(function(a){return a.some(function(v){return v!=='solid'})}).length,a=C.item(d,q,n===0?'solid':n===1?'piece':'mixed');if(a&&typeof a.value==='number')score+=a.value*.04}
 function fit(p){var a=values(p||{},'fits'),close=a.some(function(v){return ['fitted','bodycon'].includes(v)}),roomy=a.some(function(v){return ['relaxed','oversized'].includes(v)});return close===roomy?null:close?'close':'roomy'}
 var outer=o.layer,under=o.top||o.one;if(outer&&under&&outer.id!==heldId&&under.id!==heldId){var a=fit(outer),b=fit(under),id=a==='close'&&b==='close'?'streamlined':a==='roomy'&&b==='close'?'roomy':a==='roomy'&&b==='roomy'?'loose':null;if(id){q=C.question('layerfit');var r=C.item(C.doc(profile,q.topic),q,id);if(r&&typeof r.value==='number')score+=r.value*.04}}
 return {score:Math.max(-.25,Math.min(.25,score)),blocked:false}};
 C.exploration=function(profile){var r=C.round(C.doc(profile,'range'),'rangeeveryday'),v=r.choice,trade=C.tradeoffs(profile).experiment||0;return {mix:Math.max(.03,Math.min(.45,(v==='trusted'?.05:v==='twist'?.15:v==='new'?.35:.2)+trade*.05)),variety:v==='trusted'?.5:v==='new'?1.3:1}};
})(ClosetLintComfort);
function comfortAtmosphereModel(profile){var C=ClosetLintComfort;
 function choice(id){var q=C.question(id);return C.round(C.doc(profile,q.topic),id).choice}
 function rated(id){var q=C.question(id),d=C.doc(profile,q.topic);return q.items.map(function(it){return {it:it,a:C.item(d,q,it.id)}}).filter(function(x){return x.a&&typeof x.a.value==='number'})}
 function axis(id,weights,fallback){var a=rated(id).filter(function(x){return weights[x.it.id]!==undefined&&x.a.value>0}),sum=a.reduce(function(n,x){return n+x.a.value},0);return sum?a.reduce(function(n,x){return n+weights[x.it.id]*x.a.value},0)/sum:fallback}
 function accept(ids){var a=ids.flatMap(rated);return a.length?a.reduce(function(n,x){return n+(x.a.value+3)/6},0)/a.length:.5}
 var palettes={muted:['#a66f79','#789084','#938299'],earthy:['#a95335','#686d3d','#c3913c'],clear:['#e44250','#22a27c','#3378d1'],jewel:['#8d294d','#226855','#653d83'],pastel:['#efbacb','#bed9c4','#b8d5eb'],dark:['#353444','#4b2945','#253f3f'],neutral:['#8b8275','#bbc0b5','#6d6e73']},trades=C.tradeoffs(profile),room={close:0,easy:.5,roomy:1}[choice('room')];
 function blended(base,trade){return trade===undefined?base:Math.max(0,Math.min(1,base*.75+(trade+1)/2*.25))}
 return {version:'3.0.0',room:blended(room??axis('layerfit',{streamlined:0,roomy:.65,loose:1,lengths:.65},.5),trades.room),structure:blended(axis('drape',{soft:0,some:.5,crisp:1},.5),trades.structure),stretch:{none:0,some:.5,lots:1}[choice('stretch')]??.5,texture:accept(['textures','jewelrymaterials']),detail:blended(accept(['dressfastenings','dressdetails','fastenings']),trades.ease===undefined?undefined:-trades.ease),care:blended(accept(['careeffort']),trades.care),range:blended({trusted:0,twist:.4,new:1}[choice('rangeeveryday')]??accept(['rangeareas']),trades.experiment),pattern:blended(axis('patternamount',{solid:0,accent:.25,piece:.6,mixed:1},.5),trades.pattern),printSize:blended(axis('printscale',{small:0,medium:.5,large:1},.5),trades['print-size']),colors:rated('palette').filter(function(x){return x.a.value>0}).flatMap(function(x){return palettes[x.it.id]||[]}),rows:function(layer){return C.questions.filter(function(q){return q.layers.includes(layer)||q.items.some(function(it){return (it.layers||[]).includes(layer)})}).map(function(q){var d=C.doc(profile,q.topic),r=C.round(d,q.id),has=q.type==='one'?!!r.choice:q.type==='any'?Array.isArray(r.selected):q.type==='pair'?q.items.some(function(it){var a=C.item(d,q,it.id);return (it.layers||q.layers).includes(layer)&&a&&!a.skip&&!a.auto}):rated(q.id).length||r.none||r.done;return has?{q:q,r:{status:'answered',value:r},d:d,layer:layer}:null}).filter(Boolean)}};
}
function comfortAtmosphereSummary(row){var C=ClosetLintComfort,q=row.q,r=row.r.value,d=row.d;
 if(r.none)return q.noneLabel.replace(/^I don't/,'You don’t').replace(/^I don’t/,'You don’t')+'.';
 if(q.type==='one'){var it=q.items.find(function(x){return x.id===r.choice}),subject={room:'Your usual fit',stretch:'Your preference for stretch',sole:'Underfoot',occasion:'For a quick outing',rangeanchor:'What helps a new look click',rangeeveryday:'On an ordinary day',rangetrends:'When a trend catches your eye',dresspockets:'Pockets',dressonepiece:'All-in-one outfits',caredelicate:'Delicate pieces'}[q.id];return subject+': '+it.label+'.'}
 if(q.type==='any')return 'You’re open to a bigger change for '+q.items.filter(function(it){return (r.selected||[]).includes(it.id)}).map(function(it){return it.label.toLowerCase()}).join(', ')+(r.selected?.length?'.':'none of these occasions.');
 if(q.type==='pair'){var a=q.items.map(function(it){return {it:it,a:C.item(d,q,it.id)}}).find(function(x){return (x.it.layers||q.layers).includes(row.layer)&&x.a&&['L','R'].includes(x.a.value)});return a?'You picked '+(a.a.value==='L'?a.it.left.label:a.it.right.label)+' over '+(a.a.value==='L'?a.it.right.label:a.it.left.label)+'.':'You didn’t favor one side in these comparisons.'}
 var groups={yes:[],no:[],neutral:[]};q.items.forEach(function(it){var a=C.item(d,q,it.id);if(a&&typeof a.value==='number')groups[a.value>0?'yes':a.value<0?'no':'neutral'].push({label:it.label.toLowerCase(),v:a.value})});var parts=[];
 if(groups.yes.length)groups.yes.sort(function(a,b){return b.v-a.v}).slice(0,2).forEach(function(x){parts.push('You '+(x.v>=2?'love':'like')+' '+x.label+'.')});
 if(groups.no.length){var no=groups.no.sort(function(a,b){return a.v-b.v}).slice(0,2);parts.push(no.map(function(x){return x.label}).join(' and ')+' '+(no.every(function(x){return x.v===-3})?'are a hard no for you.':'are things you’d rather skip.'))}
 if(!parts.length)parts.push(q.type==='body'?'None of these pressure points bother you.':q.type==='rack'?'You haven’t ruled out any of these colors.':'You feel neutral about these options.');return parts.join(' ');
}
