/* Outfit naming: curated grammar, recorded garment cues, and bounded recent history. */
var ClosetLintNaming=(function(){
 'use strict';
 var styles=['Surprise me','Descriptive','Goblin mode','Twee Much','Nerdy','Editorial','Poetic'];
 function words(s){return s.split('|')}
 var banks={
 creature:words('Goblin|Gremlin|Library Witch|Moth Regent|Pocket Dragon|Tiny Menace|Trinket Collector|Garden Cryptid|Attic Oracle|Bog Diplomat|Midnight Magpie|Errand Goblin|Cupboard Spirit|Tea Witch|Velvet Imp|Local Mystery'),
 errand:words('Minor Mischief|Questionable Errands|Collecting Shiny Things|Borrowing the Moon|A Very Small Heist|Unscheduled Wandering|Tea with the Crows|Suspiciously Good Plans|Pocket-Sized Ambitions|An Important Detour|The Mushroom Council|Late Library Returns|Secret Snacks|Polite Trespassing|Finding the Weird Shop|Absolutely No Quest'),
 place:words('the Lost and Found|the Night Market|the Library Steps|the Greenhouse|the Back Garden|the Old Arcade|the Thrift Shop|the Tea Cupboard|the Secret Passage|the Corner Shop|the Attic|the Last Bus|the Mossy Gate|the Bookshop|the Costume Drawer|the Side Street'),
 ambition:words('Excellent Pockets|Unreasonable Confidence|Dubious Intentions|Very Good Taste|Tiny Responsibilities|No Fixed Agenda|Several Trinkets|A Secret Map|Grand Plans|A Spare Biscuit|Impeccable Timing|Unfinished Business|A Mild Grudge|A New Disguise|An Elaborate Alibi|Unexpected Charm'),
 literary:words('A Most Particular|A Rather Splendid|An Entirely Unnecessary|A Slightly Dramatic|A Delightfully Improbable|A Very Grand|A Quietly Scandalous|A Thoroughly Charming|An Excessively Lovely|A Curiously Elegant|A Perfectly Peculiar|A Remarkably Civilized|A Recklessly Romantic|A Modestly Magnificent|A Terribly Pretty|A Wonderfully Wayward'),
 occasion:words('Promenade|Tea Appointment|Garden Interlude|Bookshop Rendezvous|Sunday Adventure|Drawing Room Debut|Village Fête|Afternoon Escape|Midweek Romance|Little Triumph|Breakfast Engagement|Balcony Scene|Picnic Proposal|Matinée Appearance|Moonlit Appointment|Grand Entrance'),
 flourish:words('with a Plot Twist|in Three Acts|and Other Delights|with Excellent Manners|for the Epilogue|with a Flourish|and a Cup of Tea|with Romantic Intentions|for the Leading Role|and a Happy Ending|with a Secret Agenda|for a Grand Entrance|and Quite the Reputation|with an Unexpected Guest|for the Curtain Call|and a Little Applause'),
 tech:words('Production Ready|Formal Exception|Merge Conflict|Dress Code Override|Runtime Elegance|Main Character Branch|Well-Formed Chaos|Low-Latency Entrance|Peer Reviewed|Aesthetic Hypothesis|Outfit as a Service|Release Candidate|Closet Compiler|Optional Side Quest|Critical Style Check|Experimental Build|Stable Enough|Graceful Degradation|Dress Rehearsal Protocol|The Working Prototype'),
 concept:words('Protocol|Algorithm|Hypothesis|Experiment|Expansion Pack|Side Quest|Source Code|Architecture|Interface|Iteration|Proof|Exception|Patch Notes|Field Study|Control Group|Release'),
 operation:words('Compiling|Deploying|Debugging|Rendering|Refactoring|Testing|Indexing|Versioning|Calibrating|Mapping|Querying|Optimizing|Branching|Sampling|Documenting|Unlocking'),
 outcome:words('Elegance|Possibilities|the Dress Code|Personal Style|a Better Entrance|the Main Quest|Everyday Magic|the Unexpected|a New Silhouette|Good Decisions|the Next Chapter|the Outfit Equation|a Small Victory|the Social Interface|the Daily Build|the Style Guide'),
 edit:words('Study|Edit|Composition|Perspective|Silhouette|Interlude|Notation|Sequence|Contrast|Balance|Gesture|Outline|Variation|Rhythm|Accent|Arrangement|Movement|Impression|Statement|Focus'),
 editorial:words('After Hours|in Focus|at Ease|in Motion|by Design|in Balance|Reconsidered|Reframed|Understated|Up Close|Off Duty|in Profile|in Passing|at Noon|in Detail|After Dark'),
 pairing:words('Quiet Confidence|Soft Structure|Everyday Ceremony|Considered Contrast|An Easy Rhythm|Modern Romance|A Clear Intention|The Long View|Measured Drama|Simple Pleasures|A Different Tempo|Small Distinctions|A Private Occasion|Casual Precision|A Certain Presence|Between Appointments|A New Proportion|A Deliberate Pause|Light and Shade|Daily Ritual|Gentle Geometry|A Fresh Perspective|The Essential Gesture|A Subtle Shift'),
 time:words('the Evening|the First Light|the Blue Hour|the Last of Summer|a Quiet Morning|the Turning Year|the Late Afternoon|the Small Hours|a Rainy Sunday|the Winter Light|the End of the Day|the Coming Spring|the Long Twilight|the Waking Garden|the Fading Season|the Moment Before Dawn'),
 image:words('a Letter Never Sent|a Garden After Rain|the Moon’s Reflection|a Slow River|a Window Left Open|the Shape of a Memory|a Distant Bell|a Secret Kept Kindly|the Hush Between Songs|a Handful of Starlight|the Tide Coming Home|a Door into Summer|a Bird Returning|the Echo of Footsteps|a Candle Still Burning|the Promise of Rain'),
 verb:words('Holds|Remembers|Welcomes|Borrows|Carries|Keeps|Gathers|Follows|Finds|Dreams of|Waits for|Listens to|Returns to|Reaches for|Shelters|Makes Room for'),
 form:words('A Letter|A Small Ode|A Love Song|A Quiet Promise|An Unfinished Sonnet|A Reverie|A Gentle Spell|A Lullaby|A Postscript|A Whisper|A Memory|An Invitation|A Little Elegy|A Daydream|A Tender Argument|A Story')
 };
 var templates={
 'Goblin mode':words('{creature} on an Errand|Dressed for {errand}|{creature} at {place}|{creature} with {ambition}|{cue}, but Make It Suspicious|The {cue} Goblin Has Plans|{errand}, Excellent Outfit|Official Uniform for {errand}|{ambition} in {cue}|{creature} Off Duty|Local {creature} Makes an Entrance|{cue} for the Mushroom Council|A {creature} of Some Importance|Reporting for {errand}|{creature} Takes the Scenic Route|{cue} and Dubious Little Plans'),
 'Twee Much':words('{literary} {occasion}|{cue} {flourish}|The {cue} Chronicles|A {occasion} in {cue}|{cue} and Sensibility|The Importance of Being {cue}|A Little {cue} Goes a Long Way|Much Ado About {cue}|{cue}, with Love and Footnotes|The Secret Life of {cue}|{literary} Entrance|Once Upon a {occasion}|{cue} for the Leading Role|The {occasion} Society|{cue} Takes a Bow|A Tale of {cue}'),
 'Nerdy':words('{tech}|The {cue} {concept}|{operation} {outcome}|{cue}: Release Candidate|{cue} in the Control Group|{concept} of {cue}|{cue}, Fully Documented|{operation} in {cue}|{cue} with Extra Bandwidth|{cue} Passes the Vibe Check|{tech}: {cue} Edition|The {cue} Expansion Pack|{outcome}, Version Two|{cue} Enters the Chat|{cue} Under Peer Review|{cue}: All Systems Go'),
 'Editorial':words('{cue} {edit}|{cue} {editorial}|A Study in {cue}|The {cue} Edit|{pairing}|{cue}, Considered|An Exercise in {cue}|{cue} in a New Light|The Shape of {cue}|{cue} and Restraint|Notes on {cue}|The {cue} Perspective|A Moment in {cue}|{cue}, Simply|{cue} with Intention|The Art of {cue}'),
 'Poetic':words('Where {cue} {verb} {time}|{form} in {cue}|{cue}, Like {image}|In {cue}, I Remember {time}|{cue} for {time}|Let {cue} Carry {image}|Between {cue} and {image}|{form} to {time}|{cue} at the Edge of {time}|The World Wore {cue} for a Moment|{cue} and the Memory of {image}|All the {cue} the Evening Could Hold|As Though {cue} Were {image}|{cue}, Until the Light Returns|{form} Written in {cue}|May {cue} Find You in {time}')
 };
 var rules=[
 {test:/\bpleat(?:s|ed)?\b/,twee:['Pleats to Meet You','A Pleat of One’s Own'],nerd:['Pleated Logic','Accordion to the Data']},
 {test:/\bcardigan\b/,twee:['Cardigan of Eden','The Importance of Being Cardigan'],nerd:['Cardigan Protocol','Open Source Cardigan']},
 {test:/\bknit(?:ted)?\b|\bsweater\b/,twee:['A Tale of Two Knits','Knit Me at the Bookshop'],nerd:['Closely Knit Network','Knit Integration']},
 {test:/\bbutton(?:s|ed)?\b/,twee:['Much Ado About Buttoning','Buttoning Up Appearances'],nerd:['Button Event Handler','Push-Button Deployment']},
 {test:/\bskirt\b/,twee:['Skirting the Social Calendar','A Skirt of Some Importance'],nerd:['Skirting the Edge Cases','Circular Reasoning']},
 {test:/\bvelvet\b/,twee:['Velvet with a Plot Twist','A Velvet Affair'],nerd:['Velvet Exception','Velvet Runtime']},
 {test:/\blace\b/,twee:['Lace Expectations','A Place for Lace'],nerd:['Lace Condition','Lace to the Finish']},
 {test:/\bdenim\b|\bjeans\b/,twee:['Denim and Devotion','Jeans of a Certain Age'],nerd:['Denim Deployment','Blue Jean Blueprint']},
 {test:/\bbow(?:s)?\b/,twee:['Take a Bow and a Biscuit','Bow and Behold'],nerd:['Bow Operator','Bow-Level Access']},
 {test:/\bstripe(?:s|d)?\b/,twee:['Stripes and Circumstance','A Stripe of Good Fortune'],nerd:['Parallel Processing','Read Between the Stripes']},
 {test:/\bboot(?:s)?\b/,twee:['Boots and Best Intentions','A Most Bootiful Afternoon'],nerd:['Boot Sequence','Clean Boot']},
 {test:/\bpocket(?:s)?\b/,twee:['A Pocketful of Plot Twists','Pocket-Sized Grandeur'],nerd:['Pocket Universe','Local Storage']},
 {test:/\bpearl(?:s)?\b/,twee:['Pearls Before Breakfast','Pearls of Great Importance'],nerd:['Pearl Scripting','Pearl Exception']},
 {test:/\bfloral\b|\bflower(?:s)?\b/,twee:['Florals and Footnotes','The Bloom Service'],nerd:['Bloom Filter','Botanical Branch']},
 {test:/\bmesh\b/,twee:['A Fine Mesh Indeed','Mesh Ado About Nothing'],nerd:['Mesh Network','Mesh Topology']},
 {test:/\bdress\b/,twee:['A Dress for the Epilogue','Dress Rehearsal for Tea'],nerd:['Dress Code Override','Dress Rehearsal Protocol']}
 ];
 var recent=[],lastShape={};
 function valid(style){return styles.indexOf(style)>=0?style:'Surprise me'}
 function rng(seed){var h=2166136261;for(var i=0;i<seed.length;i++)h=Math.imul(h^seed.charCodeAt(i),16777619);return function(){h+=0x6D2B79F5;var t=Math.imul(h^h>>>15,1|h);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296}}
 function pick(r,a){return a[Math.floor(r()*a.length)]}
 function facts(parts,noun){
  var core=parts.filter(function(p){return ['Jewelry','Glasses','Eyewear','Footwear','Bags','Hats','Hair accessories','Watches','Other accessories'].indexOf(p.meta)<0});if(!core.length)core=parts;if(core.length>2)core=core.slice().sort(function(a,b){return Number(a.meta==='Outerwear'||a.kind==='cardigan')-Number(b.meta==='Outerwear'||b.kind==='cardigan')});
  var names=core.slice(0,3).map(function(p){return [(p.colors||[])[0],noun(p).toLowerCase()].filter(Boolean).join(' ')}),cues=[];
  parts.forEach(function(p){['colors','material','pattern'].forEach(function(k){var values=p[k];if(Array.isArray(values))values.forEach(function(v){if(typeof v==='string'&&v&&v!=='other'&&v!=='unknown')cues.push(({striped:'stripes',floral:'flowers',ribbed:'ribbing',pleated:'pleats',checked:'checks',polka:'polka dots',solid:'color',printed:'print',crocheted:'crochet',knitted:'knit'})[v]||v.replace(/-/g,' '))})})});
  if(!cues.length)cues=core.map(noun).filter(Boolean);if(!cues.length)cues=['Possibility'];
  var text=parts.map(function(p){return [p.name,noun(p)].concat(p.material||[],p.pattern||[],p.details||[]).join(' ')}).join(' ').toLowerCase();
  return {names:names,cues:Array.from(new Set(cues)),text:text,layers:core.filter(function(p){return p.meta==='Outerwear'||p.kind==='cardigan'||p.kind==='vest'}).length>0&&core.length>1};
 }
 function clean(s){return s.replace(/\s+/g,' ').trim().replace(/^./,function(c){return c.toUpperCase()})}
 function generate(parts,style,seed,noun,legacy){
  style=valid(style);var r=rng(String(seed)+'|'+style),f=facts(parts,noun);
  if(!parts.length)return {name:'Outfit',style:style};
  if(style==='Descriptive')return {name:clean(f.names.slice(0,2).join(' with ')||'Outfit'),style:style};
  var actual=style==='Surprise me'?pick(r,styles.slice(1).concat(['Legacy'])):style;
  if(actual==='Descriptive')return generate(parts,actual,seed,noun,legacy);
  var name='',shape='',conditional=[];
  rules.forEach(function(rule){if(rule.test.test(f.text))conditional=conditional.concat(actual==='Twee Much'?rule.twee:actual==='Nerdy'?rule.nerd:[])});
  if(f.layers&&actual==='Nerdy')conditional.push('Unsupervised Layers','Layers of Abstraction','The Layered Architecture');
  for(var attempt=0;attempt<40;attempt++){
   if(actual==='Legacy'){shape='legacy';name=legacy(pick(r,['Playful','Punchy','Vintage','Pun','Persona']),seed+'|'+attempt)||''}
   else if(conditional.length&&r()<.4){shape='conditional';name=pick(r,conditional)}
   else {var ts=templates[actual];shape=String(Math.floor(r()*ts.length));var values={cue:pick(r,f.cues)};name=ts[+shape].replace(/\{(\w+)\}/g,function(_,k){return values[k]||(values[k]=pick(r,banks[k]))})}
   name=clean(name);if(actual!=='Descriptive')name=name.toLowerCase().replace(/\b\p{L}/gu,function(c){return c.toUpperCase()}).replace(/\b(A|An|The|And|Or|But|For|With|In|Of|On|To|At|As|By)\b/g,function(c){return c.toLowerCase()}).replace(/^./,function(c){return c.toUpperCase()});
   if(name&&name.length<=80&&recent.indexOf(name.toLowerCase())<0&&(shape!==lastShape[actual]||attempt>8))break;
  }
  if(!name||name.length>80)name=clean(f.names.slice(0,2).join(' with ')||'Outfit');
  recent.push(name.toLowerCase());if(recent.length>80)recent.shift();lastShape[actual]=shape;
  return {name:name,style:actual};
 }
 return {styles:styles,valid:valid,generate:generate,banks:banks,templates:templates,rules:rules};
})();
function outfitNamingStyle(){return ClosetLintNaming.valid(((state.profile||{})['outfit-naming']||{}).style)}
var outfitNamingSaving=false;
function outfitNamingSettings(){
 var select=$('outfit-naming-style'),status=$('outfit-naming-status');if(!select)return;
 if(!select.options.length)ClosetLintNaming.styles.forEach(function(style){select.appendChild(el('option',{value:style,text:style}))});
 if(!outfitNamingSaving)select.value=outfitNamingStyle();
 select.onchange=async function(){
  var requested=select.value;select.disabled=true;outfitNamingSaving=true;status.textContent='Saving…';
  try{if(!state.db)throw Error('Your closet is unavailable.');await state.db.collection('profile').doc('outfit-naming').set({style:requested});state.profile=state.profile||{};state.profile['outfit-naming']={style:requested};status.textContent='Naming style saved.'}
  catch(e){select.value=outfitNamingStyle();status.textContent='Could not save your naming style. Choose it again to retry.'}
  finally{select.disabled=false;outfitNamingSaving=false}
 };
}
function ltTitle(o,style){
 style=style||outfitNamingStyle();
 if(ClosetLintNaming.styles.indexOf(style)<0)return ltTitleLegacy(o,style);
 var parts=labParts(o).slice(),acc=o.acc||{};Object.keys(acc).forEach(function(k){[].concat(acc[k]||[]).forEach(function(p){if(p&&typeof p==='object'&&!parts.some(function(x){return x.id===p.id}))parts.push(p)})});var signature=JSON.stringify(parts.map(function(p){return [p.id,p.name,p.meta,p.sub,p.kind,p.colors,p.material,p.pattern,p.details]}))+'|'+(o.tn||0)+'|'+style;
 if(o._naming&&o._naming.key===signature)return o._naming.name;
 var result=ClosetLintNaming.generate(parts,style,signature,ltNoun,function(st,seed){return ltTitleGen(o,st,seed,0)});
 o._naming={key:signature,name:result.name,style:result.style};return result.name;
}
