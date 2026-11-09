/* Explicit comfort answers. Catalog edits, imports and wear never write these records. */
var ClosetLintComfort=(function(){
 'use strict';
 var neutral=[['any','No preference'],['depends','It depends'],['unsure','Not sure yet']];
 var ratings=[['love','Love it'],['fine','Fine with it'],['occasion','Worth it occasionally'],['any','No preference'],['avoid','Usually avoid'],['hard','Hard no'],['depends','It depends'],['unsure','Not sure']];
 var topics=[
  {id:'fabric',name:'How it feels',eyebrow:'Fabric & fit',emoji:'🧶',intro:'How you like clothes to fit, stretch, and feel against your skin.',questions:[
   {id:'room',layer:'shape',title:'How close do you like your clothes?',hint:'Think of the fit you reach for most often.',type:'scale',options:[['close','Close to me'],['easy','A little breathing room'],['roomy','Lots of room']]},
   {id:'drape',layer:'shape',title:'What kind of shape feels like you?',type:'scale',options:[['soft','Soft and drapey'],['some','A little structure'],['crisp','Crisp and sculpted']]},
   {id:'stretch',layer:'feel',title:'How much stretch makes you happy?',type:'scale',options:[['none','None needed'],['some','A little give'],['lots','Plenty of stretch']]},
   {id:'textures',layer:'feel',title:'Which textures pull you in—or put you off?',hint:'Choose how you feel about each texture. Leave any you are unsure about unanswered.',type:'ratings',interaction:'fabric',visual:'textures',options:[['denim','Denim'],['velvet','Velvet'],['lace','Lace'],['mesh','Mesh'],['satin','Satin'],['corduroy','Corduroy'],['fleece','Fleece'],['leather','Leather'],['faux leather','Faux leather'],['sequin','Sequins']]},
   {id:'pressure',layer:'feel',title:'Where do clothes tend to get on your nerves?',hint:'Tap any trouble spots. If none bother you, save with none selected.',type:'ratings',interaction:'pressure',visual:'pressure',options:[['neck','Around my neck'],['waist','At my waist'],['cuffs','At my wrists'],['arms','Around my arms'],['thighs','Around my thighs']]}
  ]},
  {id:'feet',name:'On my feet',eyebrow:'Footwear',emoji:'👟',intro:'Shoe shapes, heel heights, and the details that make them comfortable.',questions:[
   {id:'heel',layer:'shape',title:'How high do you happily go?',hint:'Choose the heel height you usually feel good up to.',type:'heel',allowNone:true,noneLabel:'I don’t wear heels'},
   {id:'heels',layer:'shape',title:'Which heel shapes would you wear?',allowNone:true,noneLabel:'I don’t wear heels',type:'ratings',interaction:'rank',visual:'heels',options:[['block','Block heels'],['stiletto','Slim heels'],['wedge','Wedges'],['platform','Platforms']]},
   {id:'toes',layer:'shape',title:'What shape keeps your toes happy?',hint:'Shape is only part of the story. A roomy fit still depends on the shoe.',type:'ratings',interaction:'set',visual:'toes',options:[['round','Round'],['almond','Almond'],['square','Square'],['pointed','Pointed']]},
   {id:'sole',layer:'feel',title:'What feels better underfoot?',type:'scale',options:[['flexible','Bends with me'],['middle','Somewhere in between'],['firm','Firm and structured']]},
   {id:'openings',layer:'shape',title:'How do you like your shoes to stay put?',type:'ratings',interaction:'set',visual:'openings',options:[['open toe','Open toes'],['open back','Open backs'],['slingback','Slingbacks'],['ankle strap','Ankle straps']]},
   {id:'fastenings',layer:'ease',title:'Which fastenings work for you?',hint:'Easy, occasionally worth the fuss, or a firm no?',type:'ratings',interaction:'set',visual:'fastenings',options:[['slip-on','Slip-ons'],['lace-up','Laces'],['zip','Zips'],['buckle','Buckles'],['hook-loop','Hook-and-loop straps']]},
   {id:'occasion',layer:'ease',title:'Does a quick outing change your answer?',type:'choice',options:[['same','Comfort comes first, every time'],['short','A little fuss is fine for a short outing'],['occasion','For the right occasion, I’ll make an exception']]}
  ]}
  ,{id:'color',name:'Color me curious',eyebrow:'Color & pattern',emoji:'🎨',intro:'The colors, patterns, and combinations you like to wear.',questions:[
   {id:'palette',layer:'presence',title:'Which palettes feel like you?',hint:'Pick as many as you like. You can be both earthy and jewel toned.',type:'visual',interaction:'multi',visual:'palette',options:[['muted','Soft & muted'],['earthy','Earthy'],['clear','Clear & bright'],['jewel','Jewel toned'],['pastel','Pastel']]},
   {id:'matching',layer:'presence',title:'How do you feel about a matching moment?',hint:'Pick any combinations that feel like you. Imagine the same simple outfit in each.',type:'visual',visual:'matching',options:[['coordinated','Coordinated colors'],['sets','Matching sets'],['clash','A deliberate clash'],['loose','A loose connection']]},
   {id:'patterns',layer:'presence',title:'Which patterns would you happily wear?',hint:'Pick any that catch your eye. These are examples of each family.',type:'visual',visual:'pattern',options:[['stripes','Stripes'],['checks','Checks'],['floral','Florals'],['dots','Dots'],['animal','Animal prints'],['geometric','Geometric'],['abstract','Abstract'],['novelty','Novelty prints']]},
   {id:'printscale',layer:'presence',layers:['presence','shape'],title:'How big do you like your prints?',hint:'Same print, same piece, three sizes. Pick more than one if it depends on the day.',type:'visual',visual:'scale',options:[['small','Small & subtle'],['medium','Somewhere in between'],['large','Big & bold']]},
   {id:'patternamount',layer:'presence',layers:['presence','shape'],title:'How much pattern feels like you?',hint:'Choose any looks you would reach for. The outfit stays the same; the pattern moves around.',type:'visual',visual:'amount',options:[['solid','Mostly solids'],['accent','A patterned accent'],['piece','One statement piece'],['mixed','Mixed prints']]},
   {id:'colorlimits',layer:'presence',title:'Anything you would rather leave on the rack?',hint:'Everything starts included. Uncheck any colors or prints you would rather skip.',type:'limits',options:[['black','Black'],['white','White'],['gray','Gray'],['brown','Brown'],['beige','Beige'],['red','Red'],['orange','Orange'],['yellow','Yellow'],['green','Green'],['blue','Blue'],['purple','Purple'],['pink','Pink'],['stripes','Stripes'],['checks','Checks'],['floral','Florals'],['dots','Dots'],['animal','Animal prints'],['geometric','Geometric'],['abstract','Abstract'],['novelty','Novelty prints']]}
  ]}
  ,{id:'jewelry',name:'Finishing touches',eyebrow:'Jewelry',emoji:'💍',intro:'Jewelry sizes, shapes, and how much you like to wear at once.',questions:[
   {id:'jewelrydetails',layer:'presence',title:'What’s your kind of sparkle?',hint:'Everything starts included. Uncheck any details you would rather skip.',type:'visual',visual:'jewelrydetails',defaultIncluded:true,options:[['gemstones','Gemstones'],['crystals','Crystals'],['pearls','Pearls'],['enamel','Enamel'],['beads','Beads'],['charms','Charms'],['plain','Plain metal']]},
   {id:'earrings',layer:'shape',title:'Which earrings catch your eye?',hint:'Uncheck any styles you would rather skip.',type:'visual',visual:'earrings',defaultIncluded:true,allowNone:true,options:[['stud','Studs'],['hoop','Hoops'],['dangle','Drops'],['climber','Climbers'],['threader','Threaders'],['cuff','Cuffs'],['cartilage','Cartilage']]},
   {id:'necklacelength',layer:'shape',title:'Which necklace lengths work for you?',allowNone:true,noneLabel:'I don’t wear necklaces',hint:'Everything starts included. Uncheck any lengths you would rather skip.',type:'visual',visual:'necklacelength',defaultIncluded:true,options:[['choker','Close to the neck'],['medium','Around the collarbone or chest'],['long','Long']]},
   {id:'metaltones',layer:'presence',title:'Which metal tones come first for you?',type:'ratings',interaction:'rank',visual:'metaltones',rankWithoutStrength:true,options:[['silver','Silver'],['gold','Gold'],['rose gold','Rose gold'],['bronze-copper','Bronze / copper'],['dark','Dark metal'],['mixed','Mixed metals']]},
   {id:'jewelrymaterials',layer:'feel',title:'Any materials you’re particular about?',hint:'Rate the materials you know. Leave the rest unanswered. Metal color and material are different things.',type:'ratings',interaction:'fabric',visual:'jewelrymaterials',options:[['titanium','Titanium'],['stainless steel','Stainless steel'],['sterling silver','Silver / silver plated'],['gold-filled / solid gold','Gold / gold plated'],['copper','Copper'],['brass','Brass'],['alloy','Other / unspecified alloy'],['acrylic / resin','Acrylic / resin'],['glass / ceramic','Glass / ceramic']]},
   {id:'jewelrystatement',layer:'presence',title:'How much attention should your jewelry get?',hint:'Everything starts included. Uncheck any looks you would rather skip.',type:'visual',visual:'jewelrystatement',defaultIncluded:true,options:[['plain','A little glimmer'],['medium','A noticeable detail'],['loud','The main event']]}
  ]}
  ,{id:'range',name:'Room to roam',eyebrow:'Range',emoji:'🧭',intro:'When you prefer familiar outfits and when you want to try something new.',questions:[
   {id:'rangeanchor',layer:'range',title:'When you try something different, what helps it click?',type:'choice',neutralOptions:[],options:[['details','Familiar shape, different details'],['shape','Familiar colors, different shape'],['one','One new thing with my usual favorites'],['whole','I’m happy to change the whole picture'],['piece','It depends on the piece']]},
   {id:'rangeeveryday',layer:'range',title:'How much experimenting fits an ordinary day?',hint:'Think about combining what you already own.',type:'choice',neutralOptions:[],options:[['trusted','Give me a combination I already trust'],['twist','A small twist is welcome'],['new','Let’s try something I haven’t worn together'],['day','Depends on what the day holds']]},
   {id:'rangeareas',layer:'range',title:'Where are you happy to shake things up?',hint:'Everything starts included. Uncheck any areas you would rather keep familiar.',type:'visual',visual:'rangeareas',defaultIncluded:true,allowEmpty:true,suggestionOnly:true,options:[['color','Color'],['pattern','Pattern'],['shape','Shape'],['texture','Texture'],['shoes','Shoes'],['accessories','Accessories']]},
   {id:'rangetrends',layer:'range',title:'A trend catches your eye. What happens next?',type:'choice',neutralOptions:[],options:[['pass','I’d rather let it pass'],['detail','I’ll borrow a little detail'],['fits','I’ll try it if it fits what I already love'],['unfamiliar','Trying the unfamiliar is part of the fun']]},
   {id:'rangeoccasions',layer:'range',title:'When is a bigger departure worth it?',hint:'Everything starts included. Uncheck any occasions where you would rather stay with your usual favorites.',type:'visual',interaction:'multi',visual:'rangeoccasions',defaultIncluded:true,allowEmpty:true,options:[['everyday','An ordinary day, if the mood hits'],['night','A night out'],['event','A celebration or special event'],['trip','A trip'],['fun','Dressing up just for fun']]}
  ]}
  ,{id:'dressing',name:'Getting dressed',eyebrow:'Everyday ease',emoji:'👖',intro:'Fastenings, pockets, and other details that affect getting dressed.',questions:[
   {id:'dressfastenings',layer:'ease',title:'Which fastenings are worth the fiddling?',hint:'Rate the ones you know. Leave anything you are unsure about unanswered.',type:'ratings',interaction:'fabric',visual:'dressdetails',reactionOptions:[['fine','Fine'],['avoid','Avoid'],['hard','Hard no']],options:[['buttons','Buttons'],['zips','Zips'],['ties','Ties'],['buckles','Buckles'],['lacing','Lacing (e.g. corset lacing)']]},
   {id:'dressdetails',layer:'ease',title:'Do loose details get in your way?',hint:'Think about wearing them through your day. Rate each detail, or leave it unanswered.',type:'ratings',interaction:'fabric',visual:'dressdetails',reactionOptions:[['fine','Fine'],['avoid','Avoid'],['hard','Hard no']],options:[['fringe','Fringe'],['tassels','Tassels'],['chains','Decorative chains']]},
   {id:'dresspockets',layer:'ease',title:'How important are proper pockets?',type:'choice',neutralOptions:[],options:[['bonus','A lovely bonus'],['prefer','I strongly prefer them'],['essential','Essential for everyday clothes'],['depends','Depends on the outfit']]},
   {id:'dressonepiece',layer:'ease',layers:['ease','shape'],title:'How do you feel about an all-in-one?',hint:'Think boilersuits, jumpsuits, or rompers.',type:'choice',neutralOptions:[],illustration:'onepiece',options:[['in','Easy outfit, I’m in'],['occasion','Worth it occasionally'],['avoid','Usually more trouble than it’s worth'],['hard','A firm no for me']]}
  ]}
  ,{id:'layering',name:'Layer by layer',eyebrow:'Coverage & layering',emoji:'🧥',intro:'Your preferences for lengths, coverage, and combining layers.',questions:[
   {id:'visiblelayers',layer:'shape',title:'How do you feel about showing a layer underneath?',hint:'Everything starts included. Uncheck any looks you would rather skip.',type:'visual',visual:'visiblelayers',defaultIncluded:true,allowEmpty:true,options:[['neckline','A base layer showing at the neckline (e.g. a tee or cami)'],['shirt','A shirt beneath a sweater'],['hem','A longer hem peeking out'],['underwear','An intentionally visible underwear layer (e.g. a bralette)']]},
   {id:'layerfit',layer:'shape',title:'How do you like your layers to fit together?',hint:'Everything starts included. Uncheck any combinations you would rather skip.',type:'visual',visual:'layerfit',defaultIncluded:true,allowEmpty:true,options:[['streamlined','Close and streamlined'],['roomy','Roomy over fitted'],['loose','Loose over loose'],['lengths','Different lengths showing']]},
   {id:'toplength',layer:'shape',title:'Where do you like your tops to land?',hint:'Everything starts included. Uncheck any lengths you would rather skip.',type:'visual',visual:'toplength',defaultIncluded:true,allowEmpty:true,options:[['crop','Cropped'],['regular','Regular'],['longline','Longline']]},
   {id:'skirtlength',layer:'shape',title:'If you wear skirts or dresses, which lengths work for you?',hint:'Everything starts included. Uncheck any lengths you would rather skip.',type:'visual',visual:'skirtlength',defaultIncluded:true,allowEmpty:true,allowNone:true,noneLabel:'I don’t wear these',options:[['mini','Mini'],['knee','Knee length'],['midi','Midi'],['maxi','Maxi']]},
   {id:'coveragedetails',layer:'shape',layers:['shape','feel'],title:'Which details are you open to?',hint:'Everything starts included. Uncheck any details you would rather skip.',type:'visual',visual:'coveragedetails',defaultIncluded:true,allowEmpty:true,options:[['plunging','Plunging necklines'],['shoulders','Open shoulders'],['backless','Backless pieces'],['cutouts','Cutouts']]}
  ]}
  ,{id:'care',name:'Worth the upkeep?',eyebrow:'Care & laundry',emoji:'🧺',intro:'The washing, drying, and other care you’re willing to do.',questions:[
   {id:'careeffort',layer:'ease',title:'Which care extras are you up for?',hint:'Rate each extra, or leave it unanswered if you are not sure.',type:'ratings',interaction:'fabric',visual:'care',reactionOptions:[['fine','Fine'],['occasion','Sometimes'],['avoid','Avoid'],['hard','Hard no']],options:[['hand','Hand washing'],['cleaner','Dry cleaning'],['gentle','A separate gentle wash'],['iron','Ironing or steaming']]},
   {id:'caredrying',layer:'ease',title:'How do you feel about clothes that skip the dryer?',hint:'Rate each option, or leave it unanswered if you are not sure.',type:'ratings',interaction:'fabric',visual:'care',reactionOptions:[['fine','Fine'],['occasion','Sometimes'],['avoid','Avoid'],['hard','Hard no']],options:[['hang','Hanging to dry'],['flat','Laying flat to dry']]},
   {id:'caredelicate',layer:'ease',title:'Would you baby a delicate piece?',type:'choice',neutralOptions:[],options:[['happy','Happily'],['special','For something special'],['easy','I prefer clothes that can take a little life'],['no','Not for me']]}
  ]}
 ];
 var questions=topics.reduce(function(a,t){return a.concat(t.questions)},[]);
 function question(id){return questions.find(function(q){return q.id===id})}
 function read(profile,id){var q=question(id),r=(profile||{})['comfort-'+id];if(!q||!r||r.version!==1)return null;if(r.status==='skipped')return {version:1,status:'skipped'};if(r.status!=='answered')return null;var v=r.value;
  if(q.allowNone&&v==='none')return {version:1,status:'answered',value:v};
  if(typeof v==='string'&&neutral.some(function(o){return o[0]===v}))return {version:1,status:'answered',value:v};
  if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.prototype.hasOwnProperty.call(v,'selected')){
   if(!Array.isArray(v.selected)||v.selected.some(function(x){return !q.options.some(function(o){return o[0]===x})})||new Set(v.selected).size!==v.selected.length||['prefer','strong','only'].indexOf(v.importance)<0)return null;
   var clean={selected:v.selected.slice(),importance:v.importance};
   if(q.interaction==='rank'){if(!Array.isArray(v.order)||v.order.length!==v.selected.length||new Set(v.order).size!==v.order.length||v.order.some(function(x){return v.selected.indexOf(x)<0})||typeof v.ranked!=='boolean')return null;clean.order=v.order.slice();clean.ranked=v.ranked;}
   return {version:1,status:'answered',value:clean};
  }
  if(q.type==='visual'){if(!Array.isArray(v)||(!v.length&&!q.allowEmpty)||v.some(function(x){return !q.options.some(function(o){return o[0]===x})}))return null;return {version:1,status:'answered',value:Array.from(new Set(v))};}
  if(q.type==='limits'){if(v==='none')return {version:1,status:'answered',value:v};if(!v||typeof v!=='object'||Array.isArray(v))return null;var limits={};q.options.forEach(function(o){if(['avoid','hard'].indexOf(v[o[0]])>=0)limits[o[0]]=v[o[0]]});return Object.keys(limits).length?{version:1,status:'answered',value:limits}:null;}
  if(q.type==='ratings'){if(!v||typeof v!=='object'||Array.isArray(v))return null;var clean={};q.options.forEach(function(o){if((q.reactionOptions||ratings).some(function(x){return x[0]===v[o[0]]}))clean[o[0]]=v[o[0]]});return Object.keys(clean).length?{version:1,status:'answered',value:clean}:null;}
  if(q.type==='heel'){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>5||v*2!==Math.round(v*2))return null;}
  else if(!q.options.some(function(o){return o[0]===v}))return null;
  return {version:1,status:'answered',value:v};
 }
 function progress(profile,t){var rows=t.questions.map(function(q){return read(profile,q.id)});return {answered:rows.filter(function(r){return r&&r.status==='answered'}).length,reviewed:rows.filter(Boolean).length,total:rows.length};}
 function label(q,r,metric){if(!r)return 'Not answered';if(r.status==='skipped')return 'Skipped';var v=r.value;if(q.allowNone&&v==='none')return q.noneLabel||'I don’t wear earrings';var n=neutral.find(function(x){return x[0]===v});if(n)return n[1];if(v&&Array.isArray(v.selected)){var names=function(keys){return keys.map(function(k){return q.options.find(function(o){return o[0]===k})[1]}).join(', ')};if(q.rankWithoutStrength)return (v.ranked?'Most to least: '+names(v.order):'No preference between included tones')+(q.options.some(function(o){return v.selected.indexOf(o[0])<0})?' · Wouldn’t wear: '+names(q.options.map(function(o){return o[0]}).filter(function(k){return v.selected.indexOf(k)<0})): '');return (v.ranked?'Most to least: '+names(v.order):'Open to: '+(v.selected.length?names(v.selected):'none of these'))+' · '+({prefer:'Flexible — it depends',strong:'A strong preference',only:q.suggestionOnly?'Only experiment with these':'Only these work for me'}[v.importance]);}if(q.type==='visual'&&q.allowEmpty&&!v.length)return 'None of these';if(q.type==='visual')return q.options.filter(function(o){return v.indexOf(o[0])>=0}).map(function(o){return o[1]}).join(' · ');if(q.type==='limits')return v==='none'?'Nothing to rule out':q.options.filter(function(o){return v[o[0]]}).map(function(o){return o[1]+': '+(v[o[0]]==='hard'?'Hard no':'Usually avoid')}).join(' · ');if(q.type==='ratings')return q.options.filter(function(o){return v[o[0]]}).map(function(o){return o[1]+': '+ratings.find(function(x){return x[0]===v[o[0]]})[1]}).join(' · ');if(q.type==='heel')return 'Usually up to '+(metric?Math.round(v*25.4)/10+' cm':v+' in');return q.options.find(function(o){return o[0]===v})[1];}
 function evidence(profile,p){var out=[];function match(id,field,values){var r=read(profile,id);if(!r||r.status!=='answered'||typeof r.value!=='object')return;var actual=Array.isArray(p[field])?p[field]:typeof p[field]==='string'?[p[field]]:[];Object.keys(values).forEach(function(v){var pref=Array.isArray(r.value.selected)?(r.value.selected.indexOf(v)<0?(r.value.importance==='only'?'hard':r.value.importance==='strong'?'avoid':null):null):r.value[v];if(['avoid','hard','love'].indexOf(pref)<0||!values[v].some(function(x){return actual.indexOf(x)>=0}))return;var name=question(id).options.find(function(o){return o[0]===v})[1].toLowerCase();out.push({key:id+':'+v,dedupe:field+':'+values[v].slice().sort().join('|'),confirmed:true,kind:pref==='love'?'good':'warn',strength:pref==='hard'?'hard':'strong',label:pref==='love'?'a texture you love: '+name:name+' · '+(pref==='hard'?'a hard no for you':'you usually avoid'),detail:'From Comfort zone. Edit your answer in Profile.'})})}
  match('textures','material',Object.fromEntries(question('textures').options.map(function(o){return [o[0],[o[0]]]})));
  var prints={stripes:['striped'],checks:['plaid','gingham','checkered'],floral:['floral','botanical'],dots:['polka dot'],animal:['animal','animal print'],geometric:['geometric'],abstract:['tie-dye','ombre','color block'],novelty:['graphic','slogan','skull','cartoon','celestial','hearts','food','novelty print']};
  match('patterns','pattern',prints);
  match('colorlimits','pattern',prints);
  match('colorlimits','colors',{black:['black'],white:['white'],gray:['gray'],brown:['brown'],beige:['beige'],red:['red'],orange:['orange'],yellow:['yellow'],green:['green'],blue:['blue'],purple:['purple'],pink:['pastel pink','hot pink']});
  if(p.meta==='Footwear'){
   match('fastenings','shoefeat',{'slip-on':['slip-on'],'lace-up':['lace-up'],zip:['zip']});
   match('openings','shoefeat',{'open toe':['open toe'],slingback:['slingback'],'ankle strap':['ankle strap']});
   match('heels','kind',{block:['block'],stiletto:['stiletto']});match('heels','shoefeat',{wedge:['wedge'],platform:['platform']});
  }
  if(p.meta==='Jewelry'){
   match('jewelrydetails','jfeat',{gemstones:['gemstones'],crystals:['crystals / rhinestones'],pearls:['pearls'],enamel:['enamel'],beads:['beaded'],charms:['charms / dangle']});
   match('jewelrymaterials','jmetal',Object.fromEntries(question('jewelrymaterials').options.map(function(o){return [o[0],[o[0]]]})));
   match('jewelrystatement','statement',{plain:['plain'],medium:['medium'],loud:['loud']});
   if(p.sub==='Necklaces'){
    match('necklacelength','length',{choker:['choker'],medium:['medium'],long:['long']});
    var necklaces=read(profile,'necklacelength');if(necklaces&&necklaces.value==='none')out.push({key:'necklacelength:none',confirmed:true,kind:'warn',strength:'strong',label:'necklaces · you don’t wear them'});
   }
   function values(field){return Array.isArray(p[field])?p[field]:typeof p[field]==='string'?[p[field]]:[]}
   // Placement and style can overlap: a cartilage stud can satisfy either selected option.
   var earrings=read(profile,'earrings');
   if(p.sub==='Earrings'&&earrings&&earrings.status==='answered'){
    if(earrings.value==='none')out.push({key:'earrings:none',confirmed:true,kind:'warn',strength:'strong',label:'earrings · you don’t wear them'});
    else if(earrings.value&&Array.isArray(earrings.value.selected)){
     var kinds={'stud':'stud','hoop':'hoop','dangle':'dangle','climber':'climber','chain / threader':'threader'},known=values('kind').map(function(k){return kinds[k]}).filter(Boolean);if(values('eartags').includes('cartilage'))known.push('cartilage');
     // The existing cuff / clip-on tag does not distinguish those two constructions.
     if(known.length&&!known.some(function(k){return earrings.value.selected.includes(k)})&&earrings.value.importance!=='prefer')out.push({key:'earrings:style',confirmed:true,kind:'warn',strength:earrings.value.importance==='only'?'hard':'strong',label:'outside your preferred earring styles'});
    }
   }
   var tones=read(profile,'metaltones');
   if(tones&&tones.value&&Array.isArray(tones.value.selected)){
    var actual=[];if(values('jfeat').includes('mixed metals'))actual=['mixed'];else{['silver','gold'].forEach(function(k){if(values('colors').includes(k))actual.push(k)});values('jmetal').forEach(function(k){var tone={'rose gold':'rose gold',bronze:'bronze-copper',copper:'bronze-copper',gunmetal:'dark',blackened:'dark'}[k];if(tone)actual.push(tone)})}
    var rejected=actual.find(function(k){return !tones.value.selected.includes(k)}),favorite=tones.value.ranked&&tones.value.order[0];
    if(rejected)out.push({key:'metaltones:excluded',confirmed:true,kind:'warn',strength:'hard',label:question('metaltones').options.find(function(o){return o[0]===rejected})[1].toLowerCase()+' · a metal tone you wouldn’t wear'});
    else if(favorite&&actual.includes(favorite))out.push({key:'metaltones:favorite',confirmed:true,kind:'good',strength:'strong',label:'your top metal tone: '+question('metaltones').options.find(function(o){return o[0]===favorite})[1].toLowerCase()});
   }
  }
  if(['Tops','Bottoms','One-pieces','Outerwear','Underwear','Swimwear','Loungewear','Activewear','Costumes','Lingerie','Workwear & uniforms','Cultural & traditional garments'].indexOf(p.meta)>=0){
   match('dressfastenings','details',{buttons:['button-front'],zips:['zipper'],ties:['tie-front'],buckles:['buckles'],lacing:['corset / lacing']});
   match('dressdetails','details',{fringe:['fringe'],tassels:['tassels'],chains:['chains']});
   var pockets=read(profile,'dresspockets');if(pockets&&pockets.status==='answered'&&['prefer','essential'].indexOf(pockets.value)>=0&&Array.isArray(p.details)&&p.details.includes('pockets'))out.push({key:'dresspockets',confirmed:true,kind:'good',strength:'strong',label:'has pockets · a detail you look for'});
   var onepiece=read(profile,'dressonepiece');if(onepiece&&onepiece.status==='answered'&&['avoid','hard'].indexOf(onepiece.value)>=0&&p.meta==='One-pieces'&&p.sub==='Jumpsuits & rompers')out.push({key:'dressonepiece',confirmed:true,kind:'warn',strength:onepiece.value==='hard'?'hard':'strong',label:onepiece.value==='hard'?'jumpsuits and rompers · a hard no for you':'an all-in-one · you usually avoid'});
  }
  // Coverage evidence uses explicit garment fields only; outfit layering needs combination context.
  if(p.meta==='Tops'||p.meta==='Outerwear')match('toplength','length',{crop:['crop'],regular:['regular'],longline:['longline']});
  var skirtOrDress=(p.meta==='Bottoms'&&['Skirts','Skorts'].includes(p.sub))||(p.meta==='One-pieces'&&p.sub==='Dresses');
  if(skirtOrDress){
   match('skirtlength','length',{mini:['mini'],knee:['knee'],midi:['midi'],maxi:['maxi']});
   var lengths=read(profile,'skirtlength');if(lengths&&lengths.value==='none')out.push({key:'skirtlength:none',confirmed:true,kind:'warn',strength:'strong',label:'skirts and dresses · you don’t wear them'});
  }
  if(['Tops','Outerwear','One-pieces'].includes(p.meta)){
   match('coveragedetails','neckline',{plunging:['plunging'],shoulders:['off-shoulder','one-shoulder','strapless']});
   match('coveragedetails','details',{backless:['backless'],cutouts:['cutouts']});
  }
  function scalarMatch(id,field,mapping,label){var r=read(profile,id);if(!r||r.status!=='answered'||!mapping[r.value])return;var actual=Array.isArray(p[field])?p[field]:typeof p[field]==='string'?[p[field]]:[],known=Object.values(mapping).reduce(function(a,b){return a.concat(b)},[]);var relevant=actual.filter(function(x){return known.includes(x)});if(!relevant.length)return;var yes=relevant.some(function(x){return mapping[r.value].includes(x)});if(yes&&relevant.some(function(x){return !mapping[r.value].includes(x)}))return;out.push({key:id+':preference',confirmed:true,kind:yes?'good':'warn',strength:'soft',label:yes?label:'outside your usual '+(id==='room'?'fit':'drape')+' preference'});}
  if(['Tops','Bottoms','One-pieces','Outerwear'].includes(p.meta)){
   scalarMatch('room','fits',{close:['fitted','bodycon'],easy:['relaxed'],roomy:['oversized']},'a fit you reach for');
   scalarMatch('drape','fits',{soft:['flowy'],crisp:['structured']},'matches your preferred drape');
  }
  var st=read(profile,'stretch');
  if(st&&st.status==='answered'&&['some','lots'].indexOf(st.value)>=0&&Array.isArray(p.stretch)&&p.stretch.length===1&&p.stretch[0]==='non-stretch')out.push({key:'stretch',confirmed:true,kind:'warn',strength:'strong',label:'non-stretch · you prefer some give'});
  if(st&&st.status==='answered'&&Array.isArray(p.stretch)&&p.stretch.length===1&&((st.value==='lots'&&p.stretch[0]==='high stretch')||(st.value==='some'&&['slight stretch','high stretch'].includes(p.stretch[0]))))out.push({key:'stretch:positive',confirmed:true,kind:'good',strength:'soft',label:'has the stretch you like'});
  var heel=read(profile,'heel'),heelShapes=read(profile,'heels'),height=String(p.heelIn==null?'':p.heelIn).trim();
  if(p.meta==='Footwear'&&((heel&&heel.value==='none')||(heelShapes&&heelShapes.value==='none'))&&/^\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?$/.test(height)&&Math.min.apply(null,height.match(/\d+(?:\.\d+)?/g).map(Number))>0)out.push({key:'heels:none',confirmed:true,kind:'warn',strength:'strong',label:'heels · you don’t wear them'});
  if(p.meta==='Footwear'&&heel&&typeof heel.value==='number'&&/^\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?$/.test(height)){
   var numbers=height.match(/\d+(?:\.\d+)?/g).map(Number);if(Math.min.apply(null,numbers)>heel.value)out.push({key:'heel',confirmed:true,kind:'warn',strength:'strong',label:'above your usual heel height'});
  }
  var care=p.care&&typeof p.care==='object'?p.care:{};
  function careReminder(id,key,known,label){var r=read(profile,id),rating=r&&r.status==='answered'&&r.value&&r.value[key];if(known&&['avoid','hard'].includes(rating))out.push({key:id+':'+key,confirmed:true,kind:'warn',strength:rating==='hard'?'hard':'strong',label:label+' · '+(rating==='hard'?'a hard no for you':'you usually avoid'),detail:'From your Comfort zone answer and this piece’s recorded care instructions.'})}
  careReminder('careeffort','hand',['Hand wash','Hand wash cold'].includes(care.wash),'hand wash');
  careReminder('careeffort','cleaner',care.wash==='Dry clean only','dry clean only');
  careReminder('caredrying','hang',care.dry==='Hang to dry','hang to dry');
  careReminder('caredrying','flat',care.dry==='Lay flat to dry','lay flat to dry');
  careReminder('careeffort','gentle',care.wash==='Machine wash gentle','gentle wash');
  careReminder('careeffort','iron',['Sometimes needs steaming or ironing','Usually needs steaming or ironing'].includes(care.wrinkleUpkeep),care.wrinkleUpkeep==='Usually needs steaming or ironing'?'usually needs steaming or ironing':'sometimes needs steaming or ironing');
  var delicate=read(profile,'caredelicate'),extraWash=['Hand wash','Hand wash cold','Machine wash gentle'].includes(care.wash);
  if(extraWash&&delicate&&delicate.status==='answered'&&['easy','no'].includes(delicate.value)&&!out.some(function(r){return ['careeffort:hand','careeffort:gentle'].includes(r.key)}))out.push({key:'caredelicate',confirmed:true,kind:'warn',strength:'strong',label:'extra wash care · you prefer less upkeep',detail:'This piece is recorded as hand wash or gentle wash. This does not assess its durability.'});
  // Free-text notes, fiber names, and price never establish wrinkles or durability.
  // Positive wording for non-texture matches describes the recorded feature, never comfort or safety.
  out.forEach(function(r){if(r.kind==='good'&&!r.key.startsWith('textures:'))r.label=r.label.replace('a texture you love: ','a detail you love: ')});
  var unique=[],indices={};out.forEach(function(r){var key=r.dedupe||r.key;if(key==='heel'||key==='heels:none')key='heel-limit';var index=indices[key];if(index===undefined){indices[key]=unique.length;unique.push(r)}else if(r.strength==='hard'&&unique[index].strength!=='hard'||r.key==='heels:none'&&unique[index].key==='heel')unique[index]=r});
  return unique;
 }
 function guidance(profile,p){
  var rows=evidence(profile,p),score=0;rows.forEach(function(r){score+=r.kind==='good'?.08:r.strength==='hard'?-.25:r.strength==='strong'?-.14:-.06});
  var heels=read(profile,'heels');if(p.meta==='Footwear'&&heels&&heels.value&&heels.value.ranked&&heels.value.order){var first=heels.value.order[0],features=Array.isArray(p.shoefeat)?p.shoefeat:[];if((first==='block'&&p.kind==='block')||(first==='stiletto'&&p.kind==='stiletto')||features.includes(first))score+=.06}
  return {blocked:rows.some(function(r){return r.kind==='warn'&&r.strength==='hard'}),score:Math.max(-.3,Math.min(.2,score)),reasons:rows};
 }
 function outfitGuidance(profile,o,heldId){
  var score=0,blocked=false,parts=['top','bottom','one','layer','under'].map(function(k){return o[k]}).filter(Boolean),patterned=parts.map(function(p){var a=Array.isArray(p.pattern)?p.pattern:[];return a.length?a.some(function(x){return x!=='solid'}):null});
  function choice(id,actual){var r=read(profile,id);if(actual===null||!r||!r.value||!Array.isArray(r.value.selected))return;if(r.value.selected.includes(actual))return;var importance=r.value.importance;if(importance==='only')blocked=true;else if(importance==='strong')score-=.12;}
  var amount=read(profile,'patternamount'),amountSelected=amount&&amount.value&&amount.value.selected;
  if(!parts.some(function(p){return p.id===heldId})&&!(Array.isArray(amountSelected)&&amountSelected.includes('accent'))&&patterned.length&&patterned.every(function(x){return x!==null})){var n=patterned.filter(Boolean).length;choice('patternamount',n===0?'solid':n===1?'piece':'mixed')}
  var top=o.layer,under=o.top||o.one;
  function fit(p){var f=p&&p.fits||[];if(!Array.isArray(f))return null;var close=f.some(function(v){return ['fitted','bodycon'].includes(v)}),roomy=f.some(function(v){return ['relaxed','oversized'].includes(v)});return close===roomy?null:close?'close':'roomy'}
  if(top&&under&&top.id!==heldId&&under.id!==heldId){var a=fit(top),b=fit(under),r=read(profile,'layerfit'),selected=r&&r.value&&r.value.selected;if(a&&b&&Array.isArray(selected)){
   var matches=[];if(a==='close'&&b==='close')matches.push('streamlined');if(a==='roomy'&&b==='close')matches.push('roomy');if(a==='roomy'&&b==='roomy')matches.push('loose');
   // Lengths and visibility cannot be established from two independently tagged garments.
   if(matches.length&&!selected.includes('lengths')&&!matches.some(function(x){return selected.includes(x)}))choice('layerfit',matches[0]);
  }}
  return {score:score,blocked:blocked};
 }
 function exploration(profile){var r=read(profile,'rangeeveryday'),v=r&&r.value;return {mix:v==='trusted'?.05:v==='twist'?.15:v==='new'?.35:.2,variety:v==='trusted'?.5:v==='new'?1.3:1};}
 return {topics:topics,questions:questions,question:question,neutral:neutral,ratings:ratings,read:read,progress:progress,label:label,evidence:evidence,guidance:guidance,outfitGuidance:outfitGuidance,exploration:exploration};
})();

var comfortResetBusy=null,comfortPaused={},comfortCompletion=null,comfortArrival=null,comfortSession=null,comfortLayers={feel:true,shape:true,ease:true,presence:true,range:true},comfortNotice='';
function comfortRaw(id){return JSON.stringify((state.profile||{})['comfort-'+id]||null)}
function comfortDraftDirty(){return !!comfortResetBusy||[comfortSession].concat(Object.keys(comfortPaused).map(function(k){return comfortPaused[k]})).some(function(s){return s&&(s.busy||JSON.stringify(s.draft)!==s.initial)})}
function comfortBookmark(topic,index){
 try{
  // A browser-storage namespace, not an authentication credential.
  var slot=['closetlint','comfort-place','v1',(window.ClosetLintLocal||{}).instance||'browser',topic].join('.');
  if(index===null)sessionStorage.removeItem(slot);
  else if(index!==undefined)sessionStorage.setItem(slot,String(index));
  else{var value=sessionStorage.getItem(slot);return value===null?null:Number(value)}
 }catch(e){}return null;
}
function comfortPark(){if(comfortSession&&!comfortSession.busy){comfortPaused[comfortSession.topic]=comfortSession;comfortBookmark(comfortSession.topic,comfortSession.index);comfortSession=null}comfortCompletion=null;comfortNotice=''}
function comfortButton(text,fn,primary){return el('button',{type:'button',class:'btn'+(primary?' primary':''),text:text,onclick:fn})}
function comfortStart(topic,index,fromRoute){
 if(comfortResetBusy){toast('Wait for the quiz reset to finish.');return}
 if(comfortSession&&comfortSession.busy){toast('Wait for your answer to finish saving.');return}
 if(comfortSession&&comfortSession.topic!==topic)comfortPark();
 var t=ClosetLintComfort.topics.find(function(t){return t.id===topic});if(!t)return;
 if(!fromRoute&&typeof window!=='undefined'&&window.ClosetLintRoutes&&window.ClosetLintRoutes.comfort)return window.ClosetLintRoutes.comfort(topic,index);
 if(index==null&&comfortPaused[topic]){var resumed=comfortPaused[topic];delete comfortPaused[topic];if(!fromRoute)openProfile('comfort');comfortSession=resumed;comfortCompletion=null;comfortRender(true);comfortFocus();return}
 if(index==null){var saved=comfortBookmark(topic);if(Number.isInteger(saved)&&saved>=0&&saved<t.questions.length)index=saved;}
 if(index==null){index=t.questions.findIndex(function(q){return !ClosetLintComfort.read(state.profile,q.id)});if(index<0)index=0;}
 var q=t.questions[index],r=ClosetLintComfort.read(state.profile,q.id),draft=r&&r.status==='answered'?JSON.parse(JSON.stringify(r.value)):null;
 if(q.type==='ratings'&&!q.interaction&&typeof draft==='string'&&ClosetLintComfort.neutral.some(function(o){return o[0]===draft})){var prior=draft;draft={};q.options.forEach(function(o){draft[o[0]]=prior})}
 if(!fromRoute)openProfile('comfort');delete comfortPaused[topic];comfortBookmark(topic,index);comfortCompletion=null;comfortSession={topic:t.id,index:index,draft:draft,initial:JSON.stringify(draft),base:comfortRaw(q.id),busy:false,error:''};
 comfortRender(true);comfortFocus();
}
function comfortFocus(keepScroll){
 var host=$('profile-comfort'),h=host&&(host.querySelector('[data-comfort-finish]')||host.querySelector('.comfort-question h3')||host.querySelector('[data-comfort-focus]'));if(!h)return;
 h.focus({preventScroll:true});
 if(keepScroll||state.routeScrollRestore)return;
 var bar=$('topbar'),position=bar&&getComputedStyle(bar).position,offset=bar&&['fixed','sticky'].indexOf(position)>=0?bar.getBoundingClientRect().height:0;
 h.style.scrollMarginTop=(offset+16)+'px';h.scrollIntoView({block:'start',behavior:'instant'});
}
function comfortShowOverview(){if(typeof window!=='undefined'&&window.ClosetLintRoutes&&window.ClosetLintRoutes.profile)window.ClosetLintRoutes.profile('comfort');comfortRender(true);comfortFocus()}
function comfortOverview(){if(comfortResetBusy)return;if(comfortSession&&comfortSession.busy)return;comfortPark();comfortShowOverview()}
async function comfortSave(action){
 var s=comfortSession;if(!s||s.busy)return;var t=ClosetLintComfort.topics.find(function(t){return t.id===s.topic}),q=t.questions[s.index];
 if(!state.db||state.pub){s.error='Connect to your wardrobe to save your answers.';comfortRender(true);return}
 if(s.base!==comfortRaw(q.id)){s.error='This answer changed elsewhere. Your draft is still here. Load the saved answer before editing it again.';s.conflict=true;comfortRender(true);return}
 var record=action==='skip'?{version:1,status:'skipped'}:{version:1,status:'answered',value:s.draft};
 if(action!=='clear'&&!ClosetLintComfort.read({['comfort-'+q.id]:record},q.id)){s.error='Choose an answer, or skip this question.';comfortRender(true);return}
 s.busy=true;s.error='';comfortRender(true);
 try{
  var doc=state.db.collection('profile').doc('comfort-'+q.id);if(action==='clear')await doc.delete();else await doc.set(record);
  state.profile=state.profile||{};if(action==='clear')delete state.profile['comfort-'+q.id];else state.profile['comfort-'+q.id]=record;
  s.busy=false;s.initial=JSON.stringify(s.draft);comfortNotice=action==='clear'?'Answer cleared.':action==='skip'?'Skipped. You can come back whenever you like.':'Answer saved.';
  if(action==='clear'){delete comfortPaused[t.id];comfortBookmark(t.id,null);comfortSession=null;toast('Answer cleared.');comfortShowOverview()}
  else if(s.index<t.questions.length-1){comfortStart(s.topic,s.index+1)}
  else{delete comfortPaused[t.id];comfortBookmark(t.id,null);comfortSession=null;comfortCompletion=t;comfortArrival={layers:Array.from(new Set(t.questions.reduce(function(all,q){return all.concat(q.layers||[q.layer])},[]))),until:Date.now()+2200};comfortNotice='';toast(ClosetLintComfort.progress(state.profile,t).answered?'Quiz complete. Your answers are saved.':'Quiz complete. You can revisit your skipped questions.');comfortShowOverview();var heading=$('profile-comfort').querySelector('[data-comfort-focus]');if(heading)heading.scrollIntoView({block:'start',behavior:'auto'})}
 }catch(e){s.busy=false;s.error='Could not save. Your answer is still here—try again.';comfortRender(true)}
}
async function comfortReset(topic){
 if(comfortResetBusy||comfortSession&&comfortSession.busy)return;
 var t=ClosetLintComfort.topics.find(function(t){return t.id===topic});if(!t)return;
 if(!state.db||state.pub){toast('Connect to your wardrobe to reset answers.');return}
 if(!window.confirm('Reset all answers for “'+t.name+'”? This also clears its saved place and any paused draft.'))return;
 var opened=Array.from($('profile-comfort').querySelectorAll('.comfort-answer-disclosure[open]')).map(function(d){return d.closest('[data-comfort-topic]').dataset.comfortTopic});
 comfortResetBusy=t.id;comfortNotice='Resetting answers…';comfortRender(true);var cleared=0;
 try{
  for(var q of t.questions){var key='comfort-'+q.id;if(!Object.prototype.hasOwnProperty.call(state.profile||{},key))continue;await state.db.collection('profile').doc(key).delete();delete state.profile[key];cleared++}
  delete comfortPaused[t.id];comfortBookmark(t.id,null);if(comfortSession&&comfortSession.topic===t.id)comfortSession=null;comfortArrival=null;comfortNotice='';toast(t.name+' answers reset.');
 }catch(e){comfortNotice=cleared?'Could not finish the reset. Some answers were cleared. Try Reset answers again.':'Could not reset answers. Please try again.'}
 finally{comfortResetBusy=null;comfortRender(true);opened.forEach(function(id){var d=$('profile-comfort').querySelector('[data-comfort-topic="'+id+'"] .comfort-answer-disclosure');if(d)d.open=true});var card=$('profile-comfort').querySelector('[data-comfort-topic="'+t.id+'"]'),target=card&&(card.querySelector('.comfort-reset')||card.querySelector('.comfort-topic-actions>.btn'));if(target)target.focus({preventScroll:true})}
}
function comfortRender(force){
 var host=$('profile-comfort');if(!host)return;if(!force&&comfortSession&&host.querySelector('.comfort-question'))return;
 var expanded=!comfortSession?Array.from(host.querySelectorAll('.comfort-answer-disclosure[open]')).map(function(d){return d.closest('[data-comfort-topic]').dataset.comfortTopic}):[];
 host.textContent='';
 if(!comfortSession)host.appendChild(el('header',{class:'comfort-heading'},el('div',null,el('h2',{tabindex:'-1','data-comfort-focus':'true',text:'My atmosphere'}),el('p',{text:'Explore what feels like you. Your answers help shape wishlist rankings and outfit lab ideas.'}))));
 var status=el('p',{class:'comfort-status',hidden:!comfortSession&&!comfortNotice,role:'status','aria-live':'polite',text:comfortSession?(comfortSession.busy?'Saving…':comfortSession.error||comfortNotice):comfortNotice});host.appendChild(status);
 if(comfortSession){host.appendChild(comfortQuestion());return}
 var topics=el('div',{class:'comfort-topics'});
 ClosetLintComfort.topics.forEach(function(t){
  var p=ClosetLintComfort.progress(state.profile,t),started=p.reviewed||comfortPaused[t.id]||comfortBookmark(t.id)!==null,done=p.reviewed===p.total;
  var segments=el('div',{class:'comfort-progress-segments','aria-hidden':'true'});t.questions.forEach(function(q){var r=ClosetLintComfort.read(state.profile,q.id);segments.appendChild(el('span',{class:r?'comfort-progress-'+r.status:'comfort-progress-unanswered'}))});
  var actions=el('div',{class:'comfort-topic-actions'}),card=el('section',{class:'almanac-card comfort-topic','data-comfort-topic':t.id},el('div',{class:'comfort-topic-header'},el('h3',null,el('span',{'aria-hidden':'true','data-ui-emoji':'true',text:t.emoji}),el('span',{text:t.name})),done?el('span',{class:'comfort-complete'},el('span',{class:'setup-confirmed','aria-hidden':'true',text:'✓'}),el('span',{text:'Done'})):null),el('p',{class:'comfort-topic-description',text:t.intro}),segments,el('p',{class:'fine comfort-topic-progress',text:started?p.answered+' of '+p.total+' answered'+(p.reviewed>p.answered?' · '+(p.reviewed-p.answered)+' skipped':''):p.total+' questions'}),actions);
  if(!done)actions.appendChild(comfortButton(started?'Continue':'Start',function(){comfortStart(t.id)},true));
  if(p.reviewed){var disclosure=el('details',{class:'comfort-answer-disclosure'},el('summary',{text:'Review answers'})),rows=el('div',{class:'comfort-answers'});t.questions.forEach(function(q,i){var r=ClosetLintComfort.read(state.profile,q.id);if(!r)return;rows.appendChild(el('button',{type:'button',class:'comfort-answer',onclick:function(){comfortStart(t.id,i)}},el('span',{text:q.title}),el('strong',{text:ClosetLintComfort.label(q,r,unitsMetric())}),el('span',{class:'comfort-edit',text:'Edit'})))});disclosure.appendChild(rows);var reset=comfortButton(comfortResetBusy===t.id?'Resetting…':'Reset answers',function(){comfortReset(t.id)});reset.classList.add('comfort-reset');reset.setAttribute('aria-label','Reset answers for '+t.name);disclosure.appendChild(reset);actions.appendChild(disclosure)}topics.appendChild(card)
 });
 host.appendChild(comfortAtmosphere());host.appendChild(topics);expanded.forEach(function(id){var d=host.querySelector('[data-comfort-topic="'+id+'"] .comfort-answer-disclosure');if(d)d.open=true});if(comfortResetBusy)host.querySelectorAll('button,input').forEach(function(n){n.disabled=true});comfortCompletion=null;
}
function comfortQuestion(){
 var s=comfortSession,t=ClosetLintComfort.topics.find(function(t){return t.id===s.topic}),q=t.questions[s.index],box=el('section',{class:'comfort-question'}),form=el('fieldset',{disabled:s.busy});
 box.appendChild(comfortButton('← All topics',comfortOverview));box.appendChild(el('p',{class:'comfort-kicker',text:t.eyebrow+' · '+(s.index+1)+' / '+t.questions.length+(s.index===t.questions.length-1?' · Last question':'')}));
 box.appendChild(el('h3',{tabindex:'-1',text:q.title}));if(q.hint)box.appendChild(el('p',{class:'fine',text:q.hint}));if(q.illustration)box.appendChild(el('div',{class:'comfort-question-illustration'},comfortSample('dressdetails',q.illustration)));
 form.appendChild(el('legend',{class:'sr-only',text:q.title}));
 function changed(value){s.draft=value;if(saveButton)saveButton.disabled=value===null;comfortNotice='';s.error='';var status=$('profile-comfort').querySelector('.comfort-status');if(status)status.textContent='';var prior=form.querySelector('.comfort-prior-answer');if(prior)prior.remove();}
 if((q.interaction||['visual','limits','heel'].indexOf(q.type)>=0)&&typeof s.draft==='string')form.appendChild(el('p',{class:'fine comfort-prior-answer',text:'Saved answer: '+ClosetLintComfort.label(q,{status:'answered',value:s.draft},unitsMetric())}));
 if(['fabric','pressure','multi'].indexOf(q.interaction)>=0){comfortPersonalQuestion(form,q,s,changed)}else if(q.interaction||q.type==='visual'||q.type==='limits'){comfortSetQuestion(form,q,s,changed)}else if(q.type==='ratings'){
  var grid=el('div',{class:'comfort-rating-grid'});q.options.forEach(function(o){var select=el('select',{'aria-label':o[1],onchange:function(){var next=s.draft&&typeof s.draft==='object'?Object.assign({},s.draft):{};if(select.value)next[o[0]]=select.value;else delete next[o[0]];changed(Object.keys(next).length?next:null)}});select.appendChild(el('option',{value:'',text:'Choose…'}));ClosetLintComfort.ratings.forEach(function(r){select.appendChild(el('option',{value:r[0],text:r[1]}))});select.value=s.draft&&s.draft[o[0]]||'';grid.appendChild(el('label',null,el('span',{text:o[1]}),select))});form.appendChild(grid);
 }else if(q.type==='heel'){comfortHeelSlider(form,s,changed);
 }else {
  form.appendChild(el('p',{class:'fine',text:'Choose one, then save to continue.'}));var opts=el('div',{class:'comfort-single-choice'});
  q.options.concat(q.neutralOptions||ClosetLintComfort.neutral).forEach(function(o){var input=el('input',{type:'radio',name:'comfort-answer-'+q.id,value:o[0],checked:s.draft===o[0],onchange:function(){if(input.checked)changed(o[0])}});opts.appendChild(el('label',null,input,el('span',{text:o[1]})))});form.appendChild(opts);
 }
 var actions=el('div',{class:'comfort-actions'});if(s.index)actions.appendChild(comfortButton('Back',function(){comfortStart(t.id,s.index-1)}));actions.appendChild(comfortButton('Skip',function(){comfortSave('skip')}));var saveButton=comfortButton(s.error?'Retry save':s.index===t.questions.length-1?'Save & finish':'Save & next',function(){if(s.draft===null&&s.choiceDefault)changed(JSON.parse(JSON.stringify(s.choiceDefault)));comfortSave('save')},true);saveButton.disabled=s.draft===null&&!s.choiceDefault;actions.appendChild(saveButton);form.appendChild(actions);
 if(ClosetLintComfort.read(state.profile,q.id))form.appendChild(comfortButton('Clear saved answer',function(){if(window.confirm('Clear this saved answer?'))comfortSave('clear')}));
 if(s.conflict)form.appendChild(comfortButton('Load saved answer',function(){if(window.confirm('Replace your draft with the saved answer?')){s.initial=JSON.stringify(s.draft);comfortStart(t.id,s.index)}}));box.appendChild(form);return box;
}
/* Atmosphere mapping 2.0.0: explicit answers drive geometry; no personality types. */
function comfortAtmosphereModel(profile){
 var C=ClosetLintComfort;
 function value(id){var r=C.read(profile,id);return r&&r.status==='answered'?r.value:null}
 function selected(id){var v=value(id);return Array.isArray(v)?v:v&&Array.isArray(v.selected)?v.selected:[]}
 function mean(xs,fallback){xs=xs.filter(function(x){return typeof x==='number'});return xs.length?xs.reduce(function(a,b){return a+b},0)/xs.length:fallback}
 function score(id,weights){var v=value(id);if(typeof v==='string')return weights[v];return mean(selected(id).map(function(k){return weights[k]}),null)}
 function acceptance(ids){return mean(ids.reduce(function(xs,id){var v=value(id);if(v&&typeof v==='object'&&!Array.isArray(v)&&!v.selected)Object.keys(v).forEach(function(k){var n={love:1,fine:.8,occasion:.4,avoid:.1,hard:0}[v[k]];if(n!==undefined)xs.push(n)});return xs},[]),.5)}
 var palettes={muted:['#a66f79','#789084','#938299'],earthy:['#a95335','#686d3d','#c3913c'],clear:['#e44250','#22a27c','#3378d1'],jewel:['#8d294d','#226855','#653d83'],pastel:['#efbacb','#bed9c4','#b8d5eb']};
 var colors=selected('palette').reduce(function(a,k){return a.concat(palettes[k]||[])},[]);
 return {version:'2.0.0',room:mean([score('room',{close:0,easy:.5,roomy:1}),score('layerfit',{streamlined:0,roomy:.65,loose:1,lengths:.65})],.5),structure:score('drape',{soft:0,some:.5,crisp:1})??.5,
 stretch:score('stretch',{none:0,some:.5,lots:1})??.5,texture:acceptance(['textures']),
 detail:acceptance(['dressfastenings','dressdetails','fastenings']),care:acceptance(['careeffort','caredrying']),
 range:mean([score('rangeanchor',{details:.2,shape:.5,one:.3,whole:1}),score('rangeeveryday',{trusted:0,twist:.4,new:1}),score('rangetrends',{pass:0,detail:.3,fits:.5,unfamiliar:1})],.5),
 pattern:score('patternamount',{solid:0,accent:.25,piece:.6,mixed:1})??.5,printSize:score('printscale',{small:0,medium:.5,large:1})??.5,colors:colors,
 rows:function(layer){return C.questions.filter(function(q){return (q.layers||[q.layer]).indexOf(layer)>=0}).map(function(q){return {q:q,r:C.read(profile,q.id)}}).filter(function(row){return row.r&&row.r.status==='answered'})}};
}
function comfortAtmosphereSummary(row,metric){
 var q=row.q,v=row.r.value;
 var sentences={room:{close:'You like clothes close to your body.',easy:'You like a little breathing room in your clothes.',roomy:'You like plenty of room in your clothes.'},drape:{soft:'You lean toward soft, draping shapes.',some:'You like a little structure.',crisp:'You lean toward crisp, sculpted shapes.'},stretch:{none:'You don’t need stretch in your clothes.',some:'You like a little give in your clothes.',lots:'You like plenty of stretch.'},rangeeveryday:{trusted:'On an ordinary day, you prefer combinations you already trust.',twist:'On an ordinary day, a small twist is welcome.',new:'You like trying combinations you haven’t worn together.',day:'How much you want to experiment depends on the day.'},rangetrends:{pass:'You would rather let trends pass.',detail:'You’re open to borrowing a detail from a trend.',fits:'You’ll try a trend if it fits what you already love.',unfamiliar:'Trying an unfamiliar trend is part of the fun for you.'}};
 if(sentences[q.id]&&sentences[q.id][v])return sentences[q.id][v];
 var subjects={room:'fit',drape:'structure',stretch:'stretch',textures:'textures',pressure:'pressure points',heel:'heel height',heels:'heel shapes',toes:'toe shapes',sole:'soles',openings:'shoe openings',fastenings:'shoe fastenings',occasion:'short outings',palette:'palettes',matching:'matching',patterns:'patterns',printscale:'print size',patternamount:'amount of pattern',colorlimits:'colors and prints to avoid',jewelrydetails:'jewelry details',earrings:'earrings',necklacelength:'necklace lengths',metaltones:'metal tones',jewelrymaterials:'jewelry materials',jewelrystatement:'jewelry presence',rangeanchor:'trying something different',rangeeveryday:'everyday experimentation',rangeareas:'areas to experiment with',rangetrends:'trends',rangeoccasions:'occasions to experiment',dressfastenings:'clothing fastenings',dressdetails:'loose details',dresspockets:'pockets',dressonepiece:'all-in-one outfits',visiblelayers:'visible layers',layerfit:'layer fit',toplength:'top lengths',skirtlength:'skirt and dress lengths',coveragedetails:'coverage',careeffort:'care extras',caredrying:'drying',caredelicate:'delicate pieces'};
 if(['any','depends','unsure'].indexOf(v)>=0)return 'For '+subjects[q.id]+', '+({any:'you have no preference.',depends:'it depends for you.',unsure:'you’re not sure yet.'}[v]);
 if(q.type==='ratings'&&v&&typeof v==='object'&&!v.selected){
  var groups={love:[],fine:[],occasion:[],avoid:[],hard:[],any:[],depends:[],unsure:[]};q.options.forEach(function(o){if(groups[v[o[0]]])groups[v[o[0]]].push(o[1].toLowerCase())});
  return Object.keys(groups).filter(function(k){return groups[k].length}).map(function(k){return {love:'You love ',fine:'You’re fine with ',occasion:'You find these worth it occasionally: ',avoid:'You usually avoid ',hard:'These are a hard no for you: ',any:'You have no preference about ',depends:'It depends when it comes to ',unsure:'You’re not sure about '}[k]+groups[k].join(', ')+'.'}).join(' ');
 }
 return 'Your choices for '+subjects[q.id]+': '+ClosetLintComfort.label(q,row.r,metric)+'.';
}

function comfortAtmosphere(){
 var portrait=comfortAtmosphereModel(state.profile);
 var wrap=el('section',{class:'comfort-atmosphere','aria-label':'My atmosphere picture'}),layout=el('div',{class:'comfort-map-layout'}),map=el('div',{class:'comfort-map'}),controls=el('div',{class:'comfort-layer-controls',role:'group','aria-label':'Picture layers'}),ns='http://www.w3.org/2000/svg';
 function svg(tag,a){var n=document.createElementNS(ns,tag);Object.keys(a||{}).forEach(function(k){n.setAttribute(k,a[k])});return n}
 function add(parent,tag,a){var n=svg(tag,a);parent.appendChild(n);return n}
 var chart=svg('svg',{viewBox:'0 0 960 540',preserveAspectRatio:'xMidYMid slice',role:'img','aria-label':'An abstract weather portrait made of overlapping lines, wisps, and color fields.'}),defs=add(chart,'defs');
 function gradient(id,attrs,stops){var n=add(defs,attrs.radial?'radialGradient':'linearGradient',Object.assign({id:id},attrs));n.removeAttribute('radial');stops.forEach(function(stop){add(n,'stop',{offset:stop[0],'stop-color':stop[1],'stop-opacity':stop[2]})})}
 gradient('comfort-weather-sky',{x1:0,y1:0,x2:0,y2:1},[['0','var(--weather-top)',1],['1','var(--weather-bottom)',1]]);
 gradient('comfort-weather-horizon',{radial:true,cx:'.5',cy:'1',r:'.8'},[['0','var(--weather-horizon)',.22],['1','var(--weather-horizon)',0]]);
 gradient('comfort-weather-wash',{radial:true},[['0','var(--weather-sea)',.3],['1','var(--weather-sea)',0]]);
 gradient('comfort-weather-blue',{radial:true},[['0','var(--weather-blue)',.23],['1','var(--weather-blue)',0]]);
 gradient('comfort-weather-warm',{radial:true},[['0','var(--weather-amber)',.27],['1','var(--weather-amber)',0]]);
 add(chart,'rect',{width:960,height:540,fill:'url(#comfort-weather-sky)'});add(chart,'rect',{width:960,height:540,fill:'url(#comfort-weather-horizon)'});
 var grid=add(chart,'g',{class:'comfort-weather-grid',fill:'none'});for(var x=60;x<960;x+=60)add(grid,'path',{d:'M'+x+' 30V510'});for(var y=60;y<540;y+=60)add(grid,'path',{d:'M30 '+y+'H930'});
 var ticks=add(chart,'g',{class:'comfort-weather-ticks',fill:'none'});for(var x=60;x<=900;x+=30)add(ticks,'path',{d:'M'+x+' 22v'+(x%120?4:8)+' M'+x+' 518v'+(x%120?-4:-8)});
 var stars=add(chart,'g',{class:'comfort-weather-stars',fill:'var(--weather-chalk)'});for(var i=0;i<18;i++)add(stars,'circle',{cx:48+(i*173)%860,cy:43+(i*67)%190,r:i%4===0?1.1:.65,opacity:i%3===0?.3:.16});
 // Keep composition stable across visits, including when layers are toggled.
 function randomFor(rows){var seed=2166136261,text=JSON.stringify(rows.map(function(row){return [row.q.id,row.r.value]}));for(var i=0;i<text.length;i++){seed^=text.charCodeAt(i);seed=Math.imul(seed,16777619)}return function(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
 function contour(cx,cy,rx,ry,phase){var pts=[];for(var i=0;i<=96;i++){var a=i/96*Math.PI*2,r=1+.15*Math.sin(3*a+phase)+.065*Math.cos(5*a-phase),x=rx*Math.cos(a)*r,y=ry*Math.sin(a)*r;pts.push((cx+x*.94-y*.34).toFixed(1)+','+(cy+x*.18+y*.98).toFixed(1))}return 'M'+pts.join(' L')+' Z'}
 var layers=[['presence','Presence','Color, pattern, and visual expression','Color me curious and Finishing touches'],['shape','Shape','Fit, room, structure, and silhouettes','How it feels, On my feet, Color me curious, Finishing touches, Getting dressed, and Layer by layer'],['feel','Feel','Texture, stretch, and physical comfort','How it feels, On my feet, Finishing touches, and Layer by layer'],['ease','Ease','Getting dressed, fastenings, care, and everyday practicality','On my feet, Getting dressed, and Worth the upkeep?'],['range','Range','Familiarity, experimentation, and openness to trends','Room to roam']],entries={},formed=0;
 layers.forEach(function(layer){
  var rows=portrait.rows(layer[0]),rand=randomFor(rows),g=add(chart,'g',{'data-layer':layer[0],class:'comfort-chart-layer comfort-chart-'+layer[0]+(comfortArrival&&comfortArrival.until>Date.now()&&comfortArrival.layers.indexOf(layer[0])>=0&&rows.length?' comfort-weather-arrive':'')}),art=add(g,'g',{class:'comfort-weather-drift'});
  if(rows.length)formed++;
  var capacity=ClosetLintComfort.questions.filter(function(q){return (q.layers||[q.layer]).indexOf(layer[0])>=0}).length;art.style.opacity=String(.68+.32*(capacity?rows.length/capacity:0));
  if(rows.length&&layer[0]==='presence'){
   var shift=(rand()-.5)*150,blueX=590+rand()*150,blueY=120+rand()*70;
   if(portrait.colors.length){['sea','amber','blue'].forEach(function(t,i){g.style.setProperty('--weather-'+t,portrait.colors[Math.floor(i*portrait.colors.length/3)])})}
   add(art,'ellipse',{cx:365+shift,cy:250,rx:350,ry:190,fill:'url(#comfort-weather-wash)'});add(art,'ellipse',{cx:685-shift,cy:320,rx:235,ry:130,fill:'url(#comfort-weather-warm)'});add(art,'ellipse',{cx:blueX,cy:blueY,rx:200,ry:120,fill:'url(#comfort-weather-blue)'});
   [[340+shift,260,270+rand()*90,110+rand()*35,.8,'sea'],[675-shift,330,160+rand()*65,80+rand()*20,2,'amber'],[blueX,blueY,110+rand()*50,60+rand()*25,1.3,'blue']].forEach(function(bank){var phase=bank[4]+(rand()-.5)*1.4;[1,.85,.69,.54,.39].forEach(function(scale,i){add(art,'path',{d:contour(bank[0],bank[1],bank[2]*scale,bank[3]*scale,phase),fill:'var(--weather-'+bank[5]+')','fill-opacity':.035+i*.017,stroke:'var(--weather-'+bank[5]+')','stroke-opacity':.23+i*.07,'stroke-width':i%2?1:1.3})})});
   for(var i=0;i<Math.round(portrait.pattern*120);i++){var a=i*2.39996,r=.72+(i%17)/48;add(art,'circle',{cx:370+shift+275*Math.cos(a)*r,cy:250+104*Math.sin(a)*r,r:1+portrait.printSize*4,fill:'var(--weather-sea)',opacity:.24})}
  }
  if(rows.length&&layer[0]==='feel'){var bend=8+portrait.stretch*95,phase=portrait.texture*35;for(var i=0;i<3+Math.round(portrait.texture*5);i++){var y=65+i*53;add(art,'path',{fill:'none','stroke-width':1+portrait.texture*2,'stroke-opacity':.85,d:'M-20 '+y+' C150 '+(y-bend)+',285 '+(y+bend+phase)+',455 '+y+' S750 '+(y-bend)+',980 '+(y+phase*.5)})}}
  if(rows.length&&layer[0]==='shape'){var cx=480,cy=270;for(var i=0;i<5;i++){
   var rx=45+portrait.room*90+i*(18+portrait.room*25),ry=35+i*24;
   if(portrait.structure>.65)add(art,'rect',{x:cx-rx,y:cy-ry,width:rx*2,height:ry*2,rx:3,transform:'rotate(-12 '+cx+' '+cy+')',fill:'none','stroke-dasharray':'none'});
   else add(art,'ellipse',{cx:cx,cy:cy,rx:rx,ry:ry,transform:'rotate(-12 '+cx+' '+cy+')','stroke-dasharray':portrait.structure>.3?'13 6':'none',fill:'none'});
  }}
  if(rows.length&&layer[0]==='ease'){var count=3+Math.round(portrait.detail*9);for(var i=0;i<count;i++){var x=60+(i%6)*155,y=105+Math.floor(i/6)*220;
   add(art,'path',{fill:'none','stroke-dasharray':'none',d:portrait.detail>.55?'M'+x+' '+y+' q25 -30 58 -21 c35 12 15 -50 -5 -28 l-12 40 30 18':'M'+x+' '+y+' q30 -10 70 0'});
   for(var j=0;j<Math.round(portrait.care*3);j++)add(art,'path',{fill:'var(--weather-amber)',stroke:'none',opacity:.85,d:'M'+(x+8+j*17)+' '+(y+23)+' l3 4 -3 4 -3 -4Z'});
  }}
  if(rows.length&&layer[0]==='range'){
   var driftX=(rand()-.5)*55,driftY=(rand()-.5)*35;
   [[[80,425],[255,335],[470,95],[860,145]],[[100,205],[330,315],[650,490],[880,330]],[[400,55],[480,85],[640,95],[790,50]]].forEach(function(points,index){
    points=points.map(function(p){var spread=.25+portrait.range*.75;return [480+(p[0]-480)*spread+driftX,270+(p[1]-270)*spread+driftY]});
    function point(t){return [0,1].map(function(k){return Math.pow(1-t,3)*points[0][k]+3*Math.pow(1-t,2)*t*points[1][k]+3*(1-t)*t*t*points[2][k]+Math.pow(t,3)*points[3][k]})}
    var front=add(art,'g',{'data-range-front':index,fill:'var(--weather-front)'});add(front,'path',{d:'M'+points[0].join(' ')+' C'+points.slice(1).map(function(p){return p.join(' ')}).join(' '),fill:'none',stroke:'var(--weather-front)','stroke-width':2.2});
    for(var i=0;i<9;i++){var t=.1+.8*i/8,p=point(t),next=point(t+.002),angle=Math.atan2(next[1]-p[1],next[0]-p[0])*180/Math.PI;add(front,'path',{d:i%2?'M-7 0A7 7 0 0 1 7 0Z':'M-7 0L0 -10 7 0Z',transform:'translate('+p[0].toFixed(1)+' '+p[1].toFixed(1)+') rotate('+angle.toFixed(1)+')'})}
   });
  }
  g.style.display=rows.length&&comfortLayers[layer[0]]?'':'none';
  var input=el('input',{type:'checkbox',checked:!!rows.length&&comfortLayers[layer[0]],disabled:!rows.length,'aria-label':layer[1],onfocus:function(){showLayer(layer,true)},onblur:queueFade,onchange:function(){comfortLayers[layer[0]]=input.checked;g.style.display=input.checked?'':'none';updateEmpty();showLayer(layer)}});
  var attrs={class:'comfort-layer-option'+(rows.length?'':' comfort-layer-unformed'),'data-tone':layer[0]};
  // Unformed layers can explain themselves, but cannot turn on invented artwork.
  if(!rows.length){attrs.tabindex=0;attrs.role='button';attrs['aria-label']='About '+layer[1];attrs.onclick=function(){showLayer(layer)};attrs.onfocus=function(){showLayer(layer,true)};attrs.onblur=queueFade;attrs.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();showLayer(layer,true)}}}
  var label=el('label',attrs,input,el('span',null,el('strong',{text:layer[1]}),el('small',{text:rows.length?rows.length+' '+(rows.length===1?'answer':'answers'):'Not formed yet'})));entries[layer[0]]=label;
 });
 ['feel','shape','ease','presence','range'].forEach(function(id){controls.appendChild(entries[id])});
 map.classList.toggle('comfort-weather-unanswered',!formed);
 var empty=el('p',{class:'comfort-weather-empty',text:formed?'':'Clear skies so far. Each quiz adds to your atmosphere.'});
 function updateEmpty(){var visible=Array.from(chart.querySelectorAll('[data-layer]')).some(function(g){return g.style.display!=='none'});map.classList.toggle('comfort-weather-clear',!visible);empty.hidden=!!formed;chart.setAttribute('aria-label',!visible?'A nearly clear weather sky.':'An abstract weather portrait made of overlapping lines, wisps, and color fields.')}
 var fadeTimer,fadeWhenIdle=false,calloutHovered=false,callout=el('div',{class:'comfort-layer-callout','aria-hidden':'true'}),copy=el('div',{role:'status','aria-live':'polite','aria-atomic':'true'}),close=el('button',{type:'button',class:'comfort-callout-close','aria-label':'Dismiss layer description',text:'×',onclick:function(){returnToLayer();hideLayer()}});
 callout.appendChild(copy);callout.appendChild(close);close.tabIndex=-1;
 function returnToLayer(){var active=controls.querySelector('.is-explaining');if(active)(active.querySelector('input:not(:disabled)')||active).focus()}
 function hideLayer(){clearTimeout(fadeTimer);callout.classList.remove('is-visible');callout.setAttribute('aria-hidden','true');close.tabIndex=-1;map.classList.remove('comfort-showing-callout');controls.querySelectorAll('.is-explaining').forEach(function(n){n.classList.remove('is-explaining')})}
 function queueFade(){clearTimeout(fadeTimer);if(fadeWhenIdle&&!calloutHovered&&!callout.contains(document.activeElement))fadeTimer=setTimeout(hideLayer,3000)}
 function showLayer(layer,hold){clearTimeout(fadeTimer);callout.dataset.tone=layer[0];var personal=portrait.rows(layer[0]);fadeWhenIdle=personal.length>0&&!comfortLayers[layer[0]];copy.replaceChildren(el('strong',{text:layer[1]}));
 if(personal.length){personal.slice(0,3).forEach(function(row){copy.appendChild(el('p',{text:comfortAtmosphereSummary(row,unitsMetric())}))})}
 else copy.appendChild(el('p',{text:'Your answers about '+layer[2].toLowerCase()+' will appear here.'}));
 callout.setAttribute('aria-hidden','false');callout.classList.add('is-visible');close.tabIndex=0;map.classList.add('comfort-showing-callout');controls.querySelectorAll('.is-explaining').forEach(function(n){n.classList.remove('is-explaining')});entries[layer[0]].classList.add('is-explaining');if(!hold)queueFade()}
 callout.onmouseenter=function(){calloutHovered=true;clearTimeout(fadeTimer)};callout.onmouseleave=function(){calloutHovered=false;queueFade()};callout.onfocusin=function(){clearTimeout(fadeTimer)};callout.onfocusout=queueFade;
 wrap.addEventListener('keydown',function(e){if(e.key==='Escape'){if(document.activeElement===close)returnToLayer();hideLayer()}});
 map.appendChild(chart);map.appendChild(empty);map.appendChild(callout);updateEmpty();layout.appendChild(map);layout.appendChild(controls);wrap.appendChild(layout);return wrap;
}
if(typeof window!=='undefined'){
 window.ClosetLintPreferenceEvidence={forPiece:function(p){return ClosetLintComfort.evidence(state.profile,p)}};
 window.addEventListener('beforeunload',function(e){if(comfortDraftDirty()){e.preventDefault();e.returnValue=''}});
}
// Small, self-contained SVG samples keep every comparison on the same silhouette.
var comfortSampleSerial=0;
function comfortSample(kind,key){
 var palettes={muted:['#a66f79','#a79e6c','#789084','#73869f','#938299'],earthy:['#a95335','#c3913c','#686d3d','#526c73','#755945'],clear:['#e44250','#edc63f','#22a27c','#3378d1','#9c4bc0'],jewel:['#8d294d','#aa7b22','#226855','#254581','#653d83'],pastel:['#efbacb','#eee2a8','#bed9c4','#b8d5eb','#d1bee5']};
 var colors={black:'#292a2c',white:'#f8f7ee',gray:'#8b8c93',brown:'#795039',beige:'#d9c4a1',red:'#bc4051',orange:'#da7e40',yellow:'#e5c04c',green:'#50806a',blue:'#5078a3',purple:'#825d98',pink:'#d68ba4'};
 var id='comfort-sample-'+(++comfortSampleSerial),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 240 150');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 var bg='#ede8df',ink='#6d526e',accent='#b8887a',patternKeys=['stripes','checks','floral','dots','animal','geometric','abstract','novelty'];
 function motif(type){
  if(type==='stripes')return '<path d="M0 5H30 M0 20H30" stroke="'+ink+'" stroke-width="5"/>';
  if(type==='checks')return '<path d="M8 0V30 M23 0V30 M0 8H30 M0 23H30" stroke="'+ink+'" stroke-width="6" opacity=".7"/>';
  if(type==='dots')return '<circle cx="8" cy="8" r="3.5" fill="'+ink+'"/><circle cx="23" cy="23" r="3.5" fill="'+ink+'"/>';
  if(type==='floral')return '<g fill="'+ink+'"><ellipse cx="15" cy="10" rx="3" ry="6"/><ellipse cx="15" cy="20" rx="3" ry="6"/><ellipse cx="10" cy="15" rx="6" ry="3"/><ellipse cx="20" cy="15" rx="6" ry="3"/></g><circle cx="15" cy="15" r="3" fill="'+accent+'"/>';
  if(type==='animal')return '<path d="M5 3Q16 0 15 8L10 12 3 9Z M22 16Q32 12 29 24L23 28 18 23Z" fill="'+accent+'" stroke="'+ink+'" stroke-width="3"/>';
  if(type==='geometric')return '<path d="M15 3L27 15 15 27 3 15Z" fill="none" stroke="'+ink+'" stroke-width="3"/>';
  if(type==='abstract')return '<path d="M-5 15Q3 -2 13 10T35 12 M0 29Q10 13 20 27" fill="none" stroke="'+ink+'" stroke-width="5"/>';
  return '<path d="M15 3L18 11 27 12 20 18 22 27 15 22 8 27 10 18 3 12 12 11Z" fill="'+ink+'"/>';
 }
 var size=kind==='scale'?({small:13,medium:27,large:50}[key]):30,pattern=kind==='scale'?'floral':patternKeys.indexOf(key)>=0?key:'stripes';
 var defs='<defs><pattern id="'+id+'" width="'+size+'" height="'+size+'" patternUnits="userSpaceOnUse" viewBox="0 0 30 30"><rect width="30" height="30" fill="'+bg+'"/>'+motif(pattern)+'</pattern><pattern id="'+id+'-dots" width="15" height="15" patternUnits="userSpaceOnUse"><rect width="15" height="15" fill="'+ink+'"/><circle cx="7" cy="7" r="3" fill="'+bg+'"/></pattern></defs>';
 var content='';
 if(['visiblelayers','layerfit','toplength','skirtlength','coveragedetails'].includes(kind))content=comfortLayeringDrawing(kind,key);
 else if(kind==='care')content=comfortCareDrawing(key);
 else if(kind==='dressdetails')content=comfortDressingDrawing(key);
 else if(kind==='rangeareas')content=comfortRangeDrawing(key);
 else if(kind==='rangeoccasions')content=comfortRangeOccasionDrawing(key);
 else if(['jewelrydetails','earrings','necklacelength','metaltones','jewelrymaterials','jewelrystatement'].indexOf(kind)>=0)content=comfortJewelryDrawing(kind,key);
 else if(['textures','pressure'].indexOf(kind)>=0)content=comfortFabricDrawing(kind,key);
 else if(['heels','toes','openings','fastenings'].indexOf(kind)>=0)content=comfortShoeDrawing(kind,key);
 else if(kind==='palette')content=palettes[key].map(function(c,i){return '<rect x="'+(15+i*43)+'" y="28" width="40" height="94" rx="18" fill="'+c+'"/>'}).join('');
 else if(kind==='color')content='<rect x="20" y="20" width="200" height="110" rx="22" fill="'+colors[key]+'" stroke="#888" stroke-opacity=".25"/>';
 else if(kind==='pattern')content='<rect x="18" y="15" width="204" height="120" rx="18" fill="url(#'+id+')"/>';
 else{
  var top=ink,bottom='#525761',bag=accent;
  if(kind==='scale')top='url(#'+id+')';
  if(kind==='matching'){var combos={coordinated:['#805c83','#b99cbb','#d3b679'],sets:['#638779','#638779','#cbbfa8'],clash:['#c15b38','#82569a','#95ad3f'],loose:['#557e94','#675f59','#c49e65']};top=combos[key][0];bottom=combos[key][1];bag=combos[key][2]}
  if(kind==='amount'){if(key==='accent')bag='url(#'+id+')';if(key==='piece'||key==='mixed')top='url(#'+id+')';if(key==='mixed')bottom='url(#'+id+'-dots)'}
  content='<path d="M83 19L103 12Q120 27 137 12L157 19 177 46 158 58 146 43 146 77H94V43L82 58 63 46Z" fill="'+top+'" stroke="#363b40" stroke-opacity=".3"/><path d="M95 81H145L153 137H125L120 101 115 137H87Z" fill="'+bottom+'" stroke="#363b40" stroke-opacity=".3"/><rect x="179" y="91" width="34" height="36" rx="7" fill="'+bag+'" stroke="#363b40" stroke-opacity=".3"/><path d="M187 92V87a9 9 0 0 1 18 0v5" fill="none" stroke="#6d6262" stroke-width="3"/>';
 }
 svg.innerHTML=defs+content;return svg;
}
function comfortShoeDrawing(kind,key){
 var upper='#937497',sole='#494851',detail='#e4c48b',line='stroke="'+sole+'" stroke-width="2" stroke-linejoin="round"';
 function path(d,fill){return '<path d="'+d+'" fill="'+(fill||upper)+'" '+line+'/>'}
 if(kind==='toes'){
  var tips={round:'Q120 12 145 37',almond:'Q120 5 145 37',square:'L101 22H139L145 37',pointed:'L120 9 145 37'};
  return path('M95 37'+tips[key]+' Q161 64 149 118Q120 137 91 118Q79 64 95 37Z')+'<ellipse cx="120" cy="94" rx="20" ry="29" fill="#e8e1d5" '+line+'/>';
 }
 if(kind==='heels'){
  var heels={block:path('M153 88H177L172 132H154Z',sole),stiletto:path('M164 88H175L170 132H166Z',sole),wedge:path('M42 105L173 88 173 132 49 115Z',sole),platform:path('M35 100H99L104 117H35Z',sole)+path('M151 88H178V132H155Z',sole)};
  return heels[key]+path('M30 96Q45 89 63 91L97 72 126 34Q136 65 156 63L177 46 183 88Q152 107 120 95L94 108H35Z')+path('M39 106H94L120 94Q154 107 183 88L183 96Q153 113 120 102L96 115H35Z',sole);
 }
 if(kind==='openings'){
  var opening=key==='open toe'?path('M34 96Q53 84 72 87L78 105H36Z','#e8e1d5'):'';
  var back=key==='open back'?'M30 98Q50 89 68 92L100 75 129 40Q140 69 154 64L169 82Q141 106 120 95L95 109H35Z':'M30 98Q50 89 68 92L100 75 129 40Q140 69 154 64L178 48 184 91Q152 108 120 95L95 109H35Z';
  return path('M156 90H178L172 128H160Z',sole)+path(back)+opening+(key==='slingback'?path('M145 66L179 48 183 62 153 81Z',detail):'')+(key==='ankle strap'?'<rect x="148" y="32" width="41" height="12" rx="5" fill="'+detail+'" '+line+'/>'+path('M173 44V64',detail):'');
 }
 var boot=path('M111 27H173L177 86 199 103Q211 121 184 124H45Q25 119 38 105L92 85Z')+path('M35 120H198V129H35Z',sole);
 if(key==='slip-on')return path('M30 100L69 89 106 62Q119 83 149 78L177 66 184 111Q120 132 34 119Z')+path('M34 118Q115 132 184 111V122Q112 140 34 128Z',sole)+'<ellipse cx="143" cy="85" rx="25" ry="13" fill="#e8e1d5" '+line+'/>';
 if(key==='lace-up')return boot+'<path d="M111 43l35 9 -40 6 35 9 -40 6 35 9" fill="none" stroke="'+detail+'" stroke-width="4" stroke-linejoin="round"/>';
 if(key==='zip')return boot+'<path d="M151 38V98" stroke="'+detail+'" stroke-width="5" stroke-dasharray="3 2"/><rect x="146" y="38" width="10" height="15" rx="2" fill="'+sole+'"/>';
 if(key==='buckle')return boot+'<path d="M103 58H176 M96 77H177" stroke="'+detail+'" stroke-width="11"/><rect x="142" y="49" width="21" height="18" rx="3" fill="none" '+line+'/>';
 return boot+'<path d="M105 54H174 M99 76H176" stroke="'+detail+'" stroke-width="13" stroke-linecap="round"/>';
}
function comfortPersonalQuestion(form,q,s,changed){
 var prior=s.draft,keys=q.options.map(function(o){return o[0]}),isMulti=q.interaction==='multi',value=isMulti?(Array.isArray(prior)?prior.slice():prior&&Array.isArray(prior.selected)?prior.selected.slice():q.defaultIncluded?keys.slice():[]):{},strength='avoid';
 if(!isMulti&&prior&&typeof prior==='object'){
  if(Array.isArray(prior.selected)){keys.forEach(function(k){if(prior.selected.indexOf(k)<0&&prior.importance!=='prefer')value[k]=prior.importance==='only'?'hard':'avoid';else if(q.interaction==='fabric'&&prior.selected.indexOf(k)>=0)value[k]='fine'});}
  else value=Object.assign({},prior);
 }
 if(q.interaction==='pressure')Object.keys(value).forEach(function(k){if(['avoid','hard'].indexOf(value[k])<0)delete value[k]});
 if(Object.keys(value).some(function(k){return value[k]==='hard'}))strength='hard';
 if(prior&&Array.isArray(prior.selected))form.appendChild(el('p',{class:'fine',text:'Your saved answer stays unchanged until you save these new choices.'}));
 var panel=el('div',{class:q.interaction==='fabric'?'comfort-fabric-reactions':'comfort-visual-grid'}),importance=el('div',{class:'comfort-pressure-strength'});
 if(q.interaction==='pressure')s.choiceDefault='any';if(isMulti&&q.defaultIncluded&&prior===null)s.choiceDefault=keys.slice();
 function commit(){changed(isMulti?(value.length||q.allowEmpty?value.slice():null):(Object.keys(value).length?Object.assign({},value):q.interaction==='pressure'?'any':null));importance.hidden=!Object.keys(value).length;}
 q.options.forEach(function(o){
  if(q.interaction==='fabric'){
   var row=el('div',{class:'comfort-fabric-reaction'+(q.visual==='care'?' comfort-care-reaction':'')}),group=el('div',{class:'comfort-reaction-options',role:'group','aria-label':o[1]});
   row.appendChild(el('div',{class:'comfort-fabric-swatch'},comfortSample(q.visual||'textures',o[0]),el('strong',{text:o[1]})));
   group.style.gridTemplateColumns='repeat('+(q.reactionOptions?q.reactionOptions.length:4)+',minmax(0,1fr))';
   (q.reactionOptions||[['love','Love'],['fine','Fine'],['avoid','Avoid'],['hard','Hard no']]).forEach(function(a){var input=el('input',{type:'radio',name:'comfort-texture-'+o[0],value:a[0],checked:value[o[0]]===a[0],onchange:function(){if(!input.checked)return;value[o[0]]=a[0];commit()}});group.appendChild(el('label',null,input,el('span',{text:a[1]})))});
   row.appendChild(group);panel.appendChild(row);
  }else{
   var input=el('input',{type:'checkbox',checked:isMulti?value.indexOf(o[0])>=0:['avoid','hard'].indexOf(value[o[0]])>=0,'aria-label':o[1],onchange:function(){if(isMulti){value=value.filter(function(k){return k!==o[0]});if(input.checked)value.push(o[0])}else if(input.checked)value[o[0]]=strength;else delete value[o[0]];commit()}});
   panel.appendChild(el('label',{class:'comfort-visual-tile'},input,comfortSample(q.visual,o[0]),el('span',{text:o[1]})));
  }
 });
 if(q.interaction==='pressure'){
  importance.appendChild(el('p',{text:'How much does it bother you?'}));
  [['avoid','A little annoying'],['hard','A dealbreaker']].forEach(function(a){var input=el('input',{type:'radio',name:'comfort-pressure-strength',checked:strength===a[0],onchange:function(){if(input.checked){strength=a[0];Object.keys(value).forEach(function(k){value[k]=strength});commit()}}});importance.appendChild(el('label',null,input,el('span',{text:a[1]})))});
 }
 importance.hidden=q.interaction!=='pressure'||!Object.keys(value).length;
 // Each tile can be changed independently; only Save advances these questions.
 form.appendChild(panel);if(q.interaction==='pressure')form.appendChild(importance);

}
function comfortSetQuestion(form,q,s,changed){
 var keys=q.options.map(function(o){return o[0]}),prior=s.draft,legacy=prior&&typeof prior==='object'&&!Array.isArray(prior)&&!Array.isArray(prior.selected),value;
 if(prior&&Array.isArray(prior.selected))value=JSON.parse(JSON.stringify(prior));
 else{var selected=Array.isArray(prior)?prior.slice():legacy?keys.filter(function(k){return ['avoid','hard'].indexOf(prior[k])<0}):q.type==='visual'&&!q.defaultIncluded?[]:keys.slice();value={selected:selected,importance:q.rankWithoutStrength?'only':legacy&&keys.some(function(k){return prior[k]==='hard'})?'only':legacy&&keys.some(function(k){return prior[k]==='avoid'})?'strong':'prefer'};if(q.interaction==='rank'){value.order=selected.slice();value.ranked=false}}
 s.choiceDefault=q.type==='visual'&&!q.allowEmpty&&!value.selected.length?null:JSON.parse(JSON.stringify(value));
 if(legacy)form.appendChild(el('p',{class:'fine',text:'Your earlier per-item answers are kept until you save this shared preference.'}));
 var noneLabel=q.noneLabel||'I don’t wear earrings';
 var noWear=q.allowNone?el('input',{type:'checkbox',checked:prior==='none','aria-label':noneLabel,onchange:function(){panel.hidden=noWear.checked;summary.hidden=noWear.checked;if(noWear.checked){importance.hidden=true;changed('none')}else commit()}}):null;
 if(noWear)form.appendChild(el('label',{class:'comfort-standalone-choice'},noWear,el('span',{text:noneLabel})));
 var panel=el('div',{class:'comfort-set-panel'}),summary=el('p',{class:'comfort-selection-status',role:'status','aria-live':'polite'}),importance=el('div',{class:'comfort-importance'}),strength=el('select',{'aria-label':'How firm are these choices?',onchange:function(){value.importance=strength.value;commit()}});
 [['prefer','Flexible — it depends'],['strong','A strong preference'],['only',q.suggestionOnly?'Only experiment with these':'Only these work for me']].forEach(function(o){strength.appendChild(el('option',{value:o[0],text:o[1]}))});strength.value=value.importance;
 importance.appendChild(el('label',null,el('span',{text:'How firm are these choices?'}),strength));importance.appendChild(el('p',{class:'fine comfort-strength-help'}));
 function commit(){changed(q.type==='visual'&&!q.allowEmpty&&!value.selected.length?null:JSON.parse(JSON.stringify(value)));refresh()}
 function refresh(){var excluded=keys.length-value.selected.length;summary.textContent=value.selected.length+' of '+keys.length+' included'+(q.interaction==='rank'?(value.ranked?' · Favorites ordered':' · No favorite order set'):'');importance.hidden=q.rankWithoutStrength||!excluded||(q.type==='visual'&&!q.allowEmpty&&!value.selected.length);importance.querySelector('p').textContent=q.suggestionOnly?'This guides where outfit ideas can experiment. Your other comfort choices still apply.':value.importance==='only'?'Unselected options are ruled out. Wishlist reminders use recorded details when available.':value.importance==='strong'?'Unselected options are ones you would usually avoid.':'Your choices stay selected. Other options remain possibilities.';strength.value=value.importance;}
 var renderRank;
 function toggle(k,checked){if(checked){if(value.selected.indexOf(k)<0)value.selected.push(k);if(value.order)value.order.push(k)}else{value.selected=value.selected.filter(function(x){return x!==k});if(value.order)value.order=value.order.filter(function(x){return x!==k})}commit();if(q.interaction==='rank')renderRank()}
 function sample(o,i){var kind=q.type==='limits'?(i<12?'color':'pattern'):q.visual;return comfortSample(kind,o[0])}
 if(q.interaction==='rank'){
  form.appendChild(el('p',{class:'fine',text:q.rankWithoutStrength?'Drag the swatches from most to least favorite, or use the arrows. Nothing is ranked until you move it. Uncheck anything you wouldn’t wear.':'Drag your favorites into order, most to least. Uncheck any you would rather skip. You can also use the arrow buttons.'}));
  var announce=el('p',{class:'sr-only',role:'status','aria-live':'polite'});panel.appendChild(announce);
  function move(k,target){var from=value.order.indexOf(k),to=value.order.indexOf(target);if(from<0||to<0||from===to)return;value.order.splice(from,1);value.order.splice(to,0,k);value.ranked=true;if(unordered)unordered.checked=false;commit();renderRank();announce.textContent=q.options.find(function(o){return o[0]===k})[1]+' moved to position '+(to+1);var h=panel.querySelector('[data-rank-key="'+k+'"] .comfort-rank-handle');if(h)h.focus()}
  renderRank=function(){panel.querySelectorAll('.comfort-rank-row,.comfort-rank-heading').forEach(function(n){n.remove()});var display=value.order.concat(keys.filter(function(k){return value.selected.indexOf(k)<0}));display.forEach(function(k,index){var o=q.options.find(function(o){return o[0]===k}),included=value.selected.indexOf(k)>=0;if(index===value.order.length)panel.appendChild(el('p',{class:'comfort-rank-heading',text:q.rankWithoutStrength?'Wouldn’t wear':'Rather skip'}));var row=el('div',{class:'comfort-rank-row'+(included?'':' comfort-rank-excluded'),'data-rank-key':k}),handle=el('button',{type:'button',class:'comfort-rank-handle',text:'⠿','aria-label':'Drag '+o[1],disabled:!included,onpointerdown:function(e){e.preventDefault();handle.setPointerCapture(e.pointerId);handle.classList.add('dragging')},onpointerup:function(e){handle.classList.remove('dragging');var target=document.elementFromPoint(e.clientX,e.clientY),other=target&&target.closest('[data-rank-key]');if(other)move(k,other.dataset.rankKey)},onpointercancel:function(){handle.classList.remove('dragging')},onkeydown:function(e){if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();var to=value.order.indexOf(k)+(e.key==='ArrowUp'?-1:1);if(value.order[to])move(k,value.order[to])}}}),check=el('input',{type:'checkbox',checked:included,'aria-label':'Include '+o[1],onchange:function(){toggle(k,check.checked)}});
   row.appendChild(handle);row.appendChild(el('span',{class:'comfort-rank-number',text:included&&(!q.rankWithoutStrength||value.ranked)?String(index+1):'—'}));row.appendChild(comfortSample(q.visual||'heels',k));row.appendChild(el('label',null,check,el('span',{text:o[1]})));var arrows=el('div',{class:'comfort-rank-arrows'});[['Up',-1],['Down',1]].forEach(function(a){arrows.appendChild(el('button',{type:'button',class:'btn','aria-label':a[0]+' '+o[1],text:a[1]<0?'↑':'↓',disabled:!included||!value.order[index+a[1]],onclick:function(){move(k,value.order[index+a[1]])}}))});row.appendChild(arrows);panel.appendChild(row)})}
  renderRank();
  if(q.rankWithoutStrength){var unordered=el('input',{type:'checkbox',checked:!value.ranked,'aria-label':'No preference between included tones',onchange:function(){value.ranked=!unordered.checked;commit();renderRank()}});form.appendChild(el('label',{class:'comfort-standalone-choice'},unordered,el('span',{text:'No preference between included tones'})));}
 }else{
  if(q.interaction==='set')form.appendChild(el('p',{class:'fine',text:'Everything starts included. Uncheck the options you do not usually favor.'}));
  panel.classList.add('comfort-visual-grid');if(q.options.length===4)panel.classList.add('comfort-visual-pairs');
  q.options.forEach(function(o,i){if(q.type==='limits'&&(i===0||i===12))panel.appendChild(el('h4',{class:'comfort-grid-label',text:i===0?'Colors':'Patterns'}));var input=el('input',{type:'checkbox',checked:value.selected.indexOf(o[0])>=0,'aria-label':o[1],onchange:function(){toggle(o[0],input.checked)}});panel.appendChild(el('label',{class:'comfort-visual-tile'},input,sample(o,i),el('span',{text:o[1]})))})
 }
 form.appendChild(panel);form.appendChild(summary);if(!q.rankWithoutStrength)form.appendChild(importance);refresh();if(noWear&&noWear.checked){panel.hidden=true;summary.hidden=true;importance.hidden=true}
}
function comfortHeelSlider(form,s,changed){
 var remembered=typeof s.draft==='number'?s.draft:null,none=el('input',{type:'checkbox',checked:s.draft==='none','aria-label':'I don’t wear heels',onchange:function(){if(none.checked){remembered=typeof s.draft==='number'?s.draft:remembered;changed('none')}else changed(remembered);wrap.hidden=none.checked;update()}});
 form.appendChild(el('label',{class:'comfort-standalone-choice'},none,el('span',{text:'I don’t wear heels'})));
 var wrap=el('div',{class:'comfort-heel-playground'}),output=el('output',{class:'comfort-heel-value','aria-live':'polite'}),picture=el('div',{class:'comfort-heel-picture'},comfortSample('heels','block')),range=el('input',{type:'range',min:0,max:5,step:.5,value:typeof s.draft==='number'?s.draft:0,'aria-label':'Usual maximum heel height',oninput:function(){changed(Number(range.value));update()},onpointerup:function(){changed(Number(range.value));update()},onkeyup:function(e){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].indexOf(e.key)>=0){changed(Number(range.value));update()}}});
 function update(){var value=typeof s.draft==='number'?s.draft:null,label=value===null?'Pick your happy height':value===0?'Flat is where it’s at':unitsMetric()?Math.round(value*25.4)/10+' cm':value+' in';output.textContent=label;range.setAttribute('aria-valuetext',value===null?'Not answered yet':label);picture.style.setProperty('--heel-lift',String(value===null?0:value)+'px')}
 wrap.appendChild(picture);wrap.appendChild(output);wrap.appendChild(el('label',{class:'comfort-heel-control'},el('span',{class:'sr-only',text:'Usual maximum heel height'}),range));wrap.appendChild(el('div',{class:'comfort-heel-ends'},el('span',{text:'Flat'}),el('span',{text:unitsMetric()?'12.7 cm':'5 in'})));wrap.appendChild(el('p',{class:'fine',text:'Slide to your usual limit. Save when it feels right.'}));form.appendChild(wrap);wrap.hidden=none.checked;update()
}
function comfortFabricDrawing(kind,key){
 if(kind==='pressure'){var points={neck:[120,30],waist:[120,83],cuffs:[66,102],arms:[80,62],thighs:[105,123]},p=points[key];return '<path d="M100 20Q120 37 140 20L158 32 175 93 155 102 143 65 146 100 155 142H126L120 110 114 142H85L94 100 97 65 85 102 65 93 82 32Z" fill="#d7c8db" stroke="#65526c" stroke-width="2"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="14" fill="#b57f9d" stroke="#65526c" stroke-width="2"/>'}
 var colors={denim:'#587a96',velvet:'#80536c',lace:'#d5c2da',mesh:'#c4b7be',satin:'#cdb5a7',corduroy:'#aa7d48',fleece:'#b5bba2',leather:'#73514c','faux leather':'#926b65',sequin:'#a49bb6'},id='fabric-'+(++comfortSampleSerial),mark=key==='sequin'?'<circle cx="7" cy="7" r="5" fill="#e9dcae" stroke="#7d6d91"/>':key==='lace'?'<path d="M0 7Q7 -5 14 7Q7 19 0 7Z" fill="none" stroke="#78617f"/>':key==='mesh'?'<path d="M0 0L14 14M14 0L0 14" stroke="#665e67"/>':key==='corduroy'?'<path d="M3 0V14M10 0V14" stroke="#72532f" stroke-width="3"/>':key==='denim'?'<path d="M0 14L14 0M-7 14L7 0M7 14L21 0" stroke="#b1c7d0" stroke-width="2"/>':key==='fleece'?'<circle cx="4" cy="5" r="4" fill="#d8dbca"/><circle cx="11" cy="12" r="4" fill="#d8dbca"/>':'<path d="M0 12Q7 0 14 6" fill="none" stroke="#fff" opacity=".25" stroke-width="3"/>';
 return '<defs><pattern id="'+id+'" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="'+colors[key]+'"/>'+mark+'</pattern></defs><rect x="22" y="16" width="196" height="118" rx="22" fill="url(#'+id+')"/><path d="M35 124Q120 103 205 124" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>'
}

function comfortJewelryDrawing(kind,key){
 var gold='#b28a37',silver='#aeb9c1',edge='#535966',skin='#dcc5b5',line=' stroke="'+edge+'" stroke-width="2" stroke-linejoin="round"',tones={silver:silver,gold:gold,'rose gold':'#c38d83','bronze-copper':'#ad744e',dark:'#535662',mixed:silver};
 function circle(x,y,r,c){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'"'+line+'/>'}
 function necklace(y,color,width){return '<path d="M85 25Q81 '+y+' 120 '+y+'Q159 '+y+' 155 25" fill="none" stroke="'+color+'" stroke-width="'+(width||5)+'"/>'}
 function torso(){return '<path d="M99 9V35Q89 48 49 61L27 146H213L191 61Q151 48 141 35V9" fill="'+skin+'"'+line+'/><path d="M49 61Q120 109 191 61L213 146H27Z" fill="#536d77"'+line+'/>'}
 if(kind==='metaltones'||kind==='jewelrymaterials'){
  var c=tones[key]||({'titanium':'#929aa3','stainless steel':'#b4bcc0','sterling silver':silver,'gold-filled / solid gold':gold,plated:'#c9af69','copper / brass / alloy':'#ad744e',copper:'#b66e48',brass:'#b49a50',alloy:'#999a98','acrylic / resin':'#b57b96','glass / ceramic':'#72a9a8'}[key]);
  return '<ellipse cx="112" cy="76" rx="43" ry="47" fill="none" stroke="'+edge+'" stroke-width="18"/><ellipse cx="112" cy="76" rx="43" ry="47" fill="none" stroke="'+c+'" stroke-width="14"/><path d="M84 50Q95 32 114 33" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="3"/>'+(key==='mixed'?'<ellipse cx="142" cy="85" rx="36" ry="39" fill="none" stroke="'+gold+'" stroke-width="12"/>':'');
 }
 if(kind==='earrings'){
  var ear='<path d="M143 124Q111 148 99 113L81 63Q74 24 108 15Q148 8 159 42Q167 66 144 84Q132 96 143 124Z" fill="'+skin+'"'+line+'/><path d="M105 98Q100 78 117 69Q143 66 142 43Q130 20 107 36Q96 46 103 59" fill="none"'+line+'/>';
  if(key==='stud')return ear+circle(124,116,6,gold);
  if(key==='hoop')return ear+'<ellipse cx="126" cy="125" rx="18" ry="21" fill="none" stroke="'+gold+'" stroke-width="5"/>';
  if(key==='dangle')return ear+circle(124,111,4,gold)+'<path d="M124 115V126" stroke="'+gold+'" stroke-width="3"/>'+circle(124,135,9,'#618a85');
  if(key==='climber')return ear+[0,1,2,3].map(function(i){return circle(124+i*4,115-i*9,4,gold)}).join('');
  if(key==='threader')return ear+'<path d="M122 141V115Q126 107 131 115V133" fill="none" stroke="'+gold+'" stroke-width="3"/>';
  if(key==='cartilage')return ear+circle(105,30,5,gold)+circle(119,25,4,gold)+'<path d="M91 40Q73 43 83 58Q91 64 98 55" fill="none" stroke="'+gold+'" stroke-width="4"/>';
  return ear+'<path d="M86 63Q69 62 75 78Q81 88 99 79M89 69Q76 71 81 78" fill="none" stroke="'+gold+'" stroke-width="5"/>';
 }
 if(kind==='necklacelength')return torso()+necklace({choker:48,medium:89,long:133}[key],gold,4)+circle(120,{choker:52,medium:93,long:137}[key],4,gold);
 if(kind==='jewelrystatement')return torso()+necklace(88,key==='loud'?gold:silver,{plain:2,medium:5,loud:9}[key])+(key==='loud'?[-2,-1,0,1,2].map(function(i){return circle(120+i*15,96-Math.abs(i)*6,10,'#598b8b')}).join(''):'<path d="M85 25Q81 88 120 88Q159 88 155 25" fill="none" stroke="'+edge+'" stroke-width="1" stroke-dasharray="4 5"/>');
 var chain=necklace(60,gold,3);
 if(key==='plain')return '<path d="M85 25Q81 90 120 90Q159 90 155 25" fill="none" stroke="'+silver+'" stroke-width="6" stroke-dasharray="8 3"/>';
 if(key==='pearls'||key==='beads')return '<path d="M84 45L96 70 108 85 120 90 132 85 144 70 156 45" fill="none" stroke="'+gold+'" stroke-width="2"/>'+[-3,-2,-1,0,1,2,3].map(function(i){return circle(120+i*12,90-i*i*5,7,key==='pearls'?'#f7eed9':['#587b82','#ad7291','#879b6d'][Math.abs(i)%3])}).join('');
 if(key==='charms')return chain+'<path d="M105 57V70M136 55V74" stroke="'+gold+'" stroke-width="2"/>'+circle(105,78,8,gold)+'<path d="M136 74l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" fill="'+gold+'"'+line+'/>';
 if(key==='enamel')return chain+'<path d="M120 61Q94 43 96 69Q99 80 120 94Q141 80 144 69Q146 43 120 61Z" fill="#518a82"'+line+'/>';
 return chain+'<path d="M120 60L135 73 120 96 105 73Z" fill="'+(key==='crystals'?'#c4dce6':'#467c76')+'"'+line+'/><path d="M120 60V96M105 73H135" stroke="#fff" stroke-opacity=".55"/>';
}

function comfortRangeDrawing(key){
 var ink='#566976',a='#a97583',b='#73958b';
 if(key==='texture')return comfortFabricDrawing('textures','corduroy');
 if(key==='shoes')return comfortShoeDrawing('heels','block');
 if(key==='accessories')return '<rect x="76" y="58" width="88" height="72" rx="12" fill="'+a+'" stroke="'+ink+'" stroke-width="3"/><path d="M96 58V43a24 24 0 0 1 48 0v15" fill="none" stroke="'+ink+'" stroke-width="5"/><circle cx="171" cy="44" r="13" fill="none" stroke="#b28a37" stroke-width="6"/>';
 if(key==='color')return ['#aa6381','#c58c49','#587e93','#6c916a'].map(function(c,i){return '<rect x="'+(28+i*48)+'" y="30" width="40" height="90" rx="18" fill="'+c+'"/>'}).join('');
 if(key==='pattern')return '<rect x="28" y="24" width="184" height="102" rx="12" fill="#e4d9c5"/>'+[0,1,2,3,4,5].map(function(i){return '<path d="M'+(38+i*32)+' 24v102" stroke="'+a+'" stroke-width="12"/>'}).join('');
 return '<path d="M35 24H78L72 126H30Z" fill="'+a+'" stroke="'+ink+'" stroke-width="2"/><path d="M100 24H140L158 126H82Z" fill="'+b+'" stroke="'+ink+'" stroke-width="2"/><path d="M177 24H211L219 126H169Z" fill="#b8a773" stroke="'+ink+'" stroke-width="2"/>';
}
function comfortRangeOccasionDrawing(key){
 var ink='#566976',gold='#b28a37',a='#a97583',b='#73958b';
 if(key==='everyday')return '<circle cx="120" cy="74" r="29" fill="#d1b568"/>'+[0,1,2,3,4,5,6,7].map(function(i){var r=i*Math.PI/4;return '<path d="M'+(120+42*Math.cos(r))+' '+(74+42*Math.sin(r))+'L'+(120+55*Math.cos(r))+' '+(74+55*Math.sin(r))+'" stroke="'+gold+'" stroke-width="5" stroke-linecap="round"/>'}).join('');
 if(key==='night')return '<path d="M148 22A54 54 0 1 0 170 112A49 49 0 0 1 148 22Z" fill="#8099b4"/><path d="M175 30l4 10 11 1-9 7 3 11-9-7-10 7 3-11-8-7 11-1Z" fill="'+gold+'"/>';
 if(key==='trip')return '<rect x="61" y="46" width="118" height="82" rx="12" fill="'+b+'" stroke="'+ink+'" stroke-width="3"/><path d="M100 46V28H140V46M86 47V128M154 47V128" fill="none" stroke="'+ink+'" stroke-width="5"/>';
 if(key==='event')return '<path d="M78 41H120L114 75Q99 96 84 75ZM141 43H183L177 77Q162 98 147 77Z" fill="#e3c795" stroke="'+ink+'" stroke-width="2"/><path d="M99 88V119M83 120H114M162 90V121M146 122H178" stroke="'+ink+'" stroke-width="3"/><path d="M123 20l5 10M143 19l-4 11M133 9v11" stroke="'+gold+'" stroke-width="3"/>';
 return '<path d="M52 49Q120 25 188 49L180 91Q151 120 120 81Q89 120 60 91Z" fill="'+a+'" stroke="'+ink+'" stroke-width="3"/><path d="M74 62Q88 53 103 66Q90 84 74 62ZM137 66Q152 53 166 62Q151 84 137 66Z" fill="#ede4d7"/><path d="M61 98L40 139" stroke="'+gold+'" stroke-width="6"/>';
}

function comfortDressingDrawing(key){
 var ink='#566976',cloth='#8aa09b',metal='#b79556',base='<rect x="38" y="15" width="164" height="120" rx="10" fill="'+cloth+'"/>';
 if(key==='onepiece')return '<path d="M88 14L108 8Q120 20 132 8L152 14 171 40 152 52 143 36 142 77 154 141H125L120 98 115 141H86L98 77 97 36 88 52 69 40Z" fill="'+cloth+'" stroke="'+ink+'" stroke-width="3"/><path d="M99 76H141M120 25V75M103 86l-7 12M137 86l7 12" fill="none" stroke="'+ink+'" stroke-width="2"/>';
 if(key==='buttons')return base+'<path d="M120 15V135" stroke="'+ink+'" stroke-width="2"/>'+[35,75,115].map(function(y){return '<circle cx="120" cy="'+y+'" r="9" fill="'+metal+'" stroke="'+ink+'" stroke-width="2"/><path d="M117 '+y+'h6" stroke="'+ink+'" stroke-width="2"/>'}).join('');
 if(key==='zips')return base+'<path d="M120 20V130" stroke="'+ink+'" stroke-width="10"/><path d="M120 20V130" stroke="'+metal+'" stroke-width="6" stroke-dasharray="4 3"/><rect x="111" y="27" width="18" height="25" rx="4" fill="'+metal+'" stroke="'+ink+'" stroke-width="2"/>';
 if(key==='buckles')return base+'<path d="M38 75H202" stroke="'+ink+'" stroke-width="22"/><rect x="100" y="56" width="40" height="38" rx="5" fill="none" stroke="'+metal+'" stroke-width="7"/><path d="M120 75H142" stroke="'+metal+'" stroke-width="4"/>';
 if(key==='lacing')return base+'<path d="M92 22V128M148 22V128" stroke="'+ink+'" stroke-width="3"/><path d="M92 30l56 20-56 20 56 20-56 20 56 16" fill="none" stroke="'+metal+'" stroke-width="5"/>';
 if(key==='ties')return base+'<path d="M40 73H200M120 73Q67 25 73 68Q79 89 120 73Q173 25 167 68Q161 89 120 73L94 123M120 73L145 124" fill="none" stroke="'+ink+'" stroke-width="7" stroke-linejoin="round"/>';
 if(key==='fringe')return '<path d="M32 30H208V53H32Z" fill="'+cloth+'"/>'+Array.from({length:17},function(_,i){return '<path d="M'+(40+i*10)+' 51l'+((i%3)-1)*7+' '+(65+(i%4)*5)+'" stroke="'+ink+'" stroke-width="5" stroke-linecap="round"/>'}).join('');
 if(key==='tassels')return '<path d="M78 20Q120 50 162 20M78 20V69M162 20V69" fill="none" stroke="'+ink+'" stroke-width="4"/>'+[78,162].map(function(x){return '<circle cx="'+x+'" cy="72" r="9" fill="'+metal+'"/>'+[-2,-1,0,1,2].map(function(i){return '<path d="M'+x+' 80l'+i*5+' 48" stroke="'+ink+'" stroke-width="4"/>'}).join('')}).join('');
 return Array.from({length:7},function(_,i){return '<ellipse cx="'+(50+i*23)+'" cy="'+(55+22*Math.sin(i/6*Math.PI))+'" rx="19" ry="11" transform="rotate('+((i-3)*8)+' '+(50+i*23)+' '+(55+22*Math.sin(i/6*Math.PI))+')" fill="none" stroke="'+metal+'" stroke-width="5"/>'}).join('');
}

function comfortLayeringDrawing(kind,key){
 var ink='#536573',outer='#78988d',inner='#c69981',pale='#e8dfd2';
 function path(d,fill){return '<path d="'+d+'" fill="'+(fill||outer)+'" stroke="'+ink+'" stroke-width="2" stroke-linejoin="round"/>'}
 function shirt(width,hem,color,neck){var l=120-width/2,r=120+width/2;return path('M'+l+' 33L104 24Q120 '+(neck||42)+' 136 24L'+r+' 33 '+(r+22)+' 64 '+(r+7)+' 76 '+r+' 58V'+hem+'H'+l+'V58L'+(l-7)+' 76 '+(l-22)+' 64Z',color)}
 function legs(width){var l=120-width/2,r=120+width/2;return path('M'+l+' 78H'+r+'L'+(r+4)+' 143H125L120 104 115 143H'+(l-4)+'Z',pale)}
 if(kind==='toplength')return legs(48)+shirt(62,{crop:69,regular:96,longline:125}[key]);
 if(kind==='skirtlength')return '<path d="M108 65V143M132 65V143" stroke="'+ink+'" stroke-width="5"/>'+path('M94 25H146L'+({mini:155,knee:163,midi:171,maxi:178}[key])+' '+({mini:61,knee:88,midi:115,maxi:140}[key])+'H'+({mini:85,knee:77,midi:69,maxi:62}[key])+'Z')+'<path d="M94 33H146" stroke="'+ink+'" stroke-width="2"/>';
 if(kind==='layerfit'){
  var roomy=key==='roomy'||key==='loose',long=key==='lengths';
  return legs(key==='loose'?76:44)+shirt(roomy?74:56,long?123:103,inner)+shirt(roomy?90:64,long?83:94)+ '<path d="M110 36L120 48 130 36" fill="none" stroke="'+ink+'" stroke-width="2"/>';
 }
 if(kind==='visiblelayers'){
  var base=shirt(58,key==='hem'?128:108,inner);
  if(key==='shirt')return base+shirt(74,102)+path('M104 24L120 38 109 50 98 30Z',pale)+path('M136 24L120 38 131 50 142 30Z',pale)+'<path d="M120 38V60" stroke="'+ink+'" stroke-width="2"/>';
  if(key==='underwear')return path('M92 27H101V55Q110 46 120 57Q130 46 139 55V27H148V91H92Z',inner)+path('M76 35L91 27 120 93 149 27 164 35 182 71 161 81 154 64V127H86V64L79 81 58 71Z');
  return base+shirt(74,key==='hem'?98:113,outer,78);
 }
 // Garment-only front/back studies keep focus on the coverage detail.
 var garment=shirt(76,129);
 if(key==='plunging')return shirt(76,129,outer,130);
 if(key==='shoulders')return path('M82 49Q120 65 158 49L179 77 162 89 155 75V129H85V75L78 89 61 77Z');
 if(key==='backless')return garment+path('M101 37Q120 45 139 37L144 89Q120 118 96 89Z',pale)+'<path d="M103 42L137 96M137 42L103 96" stroke="'+inner+'" stroke-width="3"/>';
 return garment+path('M87 87Q107 91 101 111H87Z',pale)+path('M153 87Q133 91 139 111H153Z',pale);
}

function comfortCareDrawing(key){
 var ink='#536573',cloth='#78988d',warm='#c69981';
 function path(d,fill){return '<path d="'+d+'" fill="'+(fill||'none')+'" stroke="'+ink+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'}
 function shirt(){return path('M85 44L104 36Q120 50 136 36L155 44 174 68 157 81 148 68V120H92V68L83 81 66 68Z',cloth)}
 if(key==='hand')return path('M40 84H200L184 131H56Z',cloth)+path('M50 95Q70 85 90 95T130 95T170 95T192 95')+path('M89 23L106 60 125 69 142 61 157 68 137 92 107 86 76 46',warm);
 if(key==='gentle')return path('M65 17H175V135H65Z',cloth)+path('M65 42H175')+'<circle cx="120" cy="88" r="34" fill="#e8dfd2" stroke="'+ink+'" stroke-width="3"/>'+path('M95 92Q108 80 121 92T145 92')+'<circle cx="153" cy="30" r="4" fill="'+ink+'"/>';
 if(key==='iron')return path('M55 105Q74 67 114 66H170L187 110H55Z',cloth)+path('M103 65V44H154L163 65M51 117H191M75 43q-9 -9 0 -18M92 36q-9 -9 0 -18');
 if(key==='cleaner')return path('M114 28q0 -15 13 -15q19 2 0 21V44L191 99H49L127 44')+path('M49 112H191');
 if(key==='hang')return path('M32 24H208M58 23V43M182 23V43')+shirt();
 return path('M44 124H196L215 140H25Z','#e8dfd2')+shirt()+path('M62 139V146M178 139V146');
}
