/* Shared SVG utilities and owner-selected decorative icons; garment data stays unchanged. */
var ClosetLintIcons=(function(){
 'use strict';
 var choices={"NEW-stashed":{"shared":"🗄️","ribbon":"🗄️","utility":"🗄️","oddments":"🗄️"},"E027":{"shared":"📦","ribbon":"📦","utility":"📦","oddments":"📦"},"E001":{"shared":"👕","ribbon":"👚","utility":"👖","oddments":"👕"},"E002":{"shared":"👟","ribbon":"👠","utility":"👞","oddments":"👟"},"E003":{"shared":"💍","ribbon":"💍","utility":"📿","oddments":"💎"},"E006":{"shared":"👗","ribbon":"👗","utility":"👔","oddments":"🧥"},"E007":{"shared":"🧑‍🔬","ribbon":"👩‍🔬","utility":"👨‍🔬","oddments":"🧪"},"E013":{"shared":"🪄","ribbon":"🪄","utility":"🪄","oddments":"🪄"},"E014":{"shared":"🪄","ribbon":"🪄","utility":"🪄","oddments":"🪄"},"E026":{"shared":"🎁","ribbon":"🎁","utility":"🎁","oddments":"🎁"},"E030":{"shared":"📐","ribbon":"📐","utility":"📐","oddments":"📐"},"E031":{"shared":"🚀","ribbon":"🚀","utility":"🚀","oddments":"🚀"},"E059":{"shared":"🖼️","ribbon":"🖼️","utility":"🖼️","oddments":"🖼️"},"NEW-accessorize":{"shared":"🖌️","ribbon":"🖌️","utility":"🖌️","oddments":"🖌️"},"NEW-setup-wizard":{"shared":"🧙","ribbon":"🧙‍♀️","utility":"🧙‍♂️","oddments":"🧙"},"NEW-trip-fairy":{"shared":"🧚","ribbon":"🧚‍♀️","utility":"🧚‍♂️","oddments":"🧚"},"NEW-wishlist-other":{"shared":"👜","ribbon":"👜","utility":"🎒","oddments":"🧳"}};
 function get(key,pack){var row=choices[key];return row&&(row[{femme:'ribbon',masc:'utility',other:'oddments'}[pack]]||row.shared)||''}
 function key(glyph,label,classes){
  if(['🧑‍🔬','👩‍🔬','👨‍🔬'].indexOf(glyph)>=0)return 'E007';
  if(['🧙','🧙‍♀️','🧙‍♂️'].indexOf(glyph)>=0&&!/trip wizard/i.test(label))return 'NEW-setup-wizard';
  if(['🧚','🧚‍♀️','🧚‍♂️'].indexOf(glyph)>=0)return 'NEW-trip-fairy';
  if(/stashed pieces/i.test(label)&&['📦','🗄️','🧺'].indexOf(glyph)>=0)return 'NEW-stashed';
  if(/storag|pull list|bring back/i.test(label)&&['📦','🗄️','🧺'].indexOf(glyph)>=0)return 'E027';
  if(/donat/i.test(label)&&['📦','🎁'].indexOf(glyph)>=0)return 'E026';
  if(/fits me|sizes & fit/i.test(label)&&['📐','📏'].indexOf(glyph)>=0)return 'E030';
  if(/wear more/i.test(label)&&glyph==='🚀')return 'E031';
  if(/collage/i.test(label)&&['🖼️','🖼'].indexOf(glyph)>=0)return 'E059';
  if(/accessorize/i.test(label)&&['🎨','🖌️','🖌'].indexOf(glyph)>=0)return 'NEW-accessorize';
  if(/fantasy mode/i.test(label)&&['✨','🪄'].indexOf(glyph)>=0)return 'E013';
  if(/wishlist/i.test(label)&&['✨','🪄'].indexOf(glyph)>=0)return 'E014';
  if((/outfits|saved outfit/i.test(label)||/trip-outfit-name/.test(classes||''))&&['👗','👔','🧥'].indexOf(glyph)>=0)return 'E006';
  return '';
 }

 // Shared 24-unit geometry: no font dependencies, external assets, or user-provided markup.
 var paths={
  split:'M12 19v-5c0-4-4-5-8-9 M12 14c0-4 4-5 8-9 M4 10V5h5 M15 5h5v5 M10 21a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  'flip-x':'M3 12h18 M7 8l-4 4 4 4 M17 8l4 4-4 4 M12 3v2 M12 19v2',
  'flip-y':'M12 3v18 M8 7l4-4 4 4 M8 17l4 4 4-4 M3 12h2 M19 12h2',
  refresh:'M20 10a8 8 0 1 0-1 8 M20 4v6h-6',
  undo:'M4 10h10a6 6 0 0 1 0 12 M4 10l5-5 M4 10l5 5',
  'arrow-up':'M12 21V3 M5 10l7-7 7 7',
  'arrow-down':'M12 3v18 M5 14l7 7 7-7',
  'arrow-left':'M21 12H3 M10 5l-7 7 7 7',
  'arrow-right':'M3 12h18 M14 5l7 7-7 7',
  'chevron-up':'M6 15l6-6 6 6',
  'chevron-down':'M6 9l6 6 6-6',
  'chevron-left':'M15 6l-6 6 6 6',
  'chevron-right':'M9 6l6 6-6 6',
  text:'M4 4h16 M12 4v16 M8 20h8',
  image:'M3 3h18v18H3z M3 17l6-6 5 5 3-3 4 4 M15 7h.01',
  arrange:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  clipboard:'M9 3h6v4H9z M9 5H5v16h14V5h-4',
  palette:'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1-4 2 2 0 0 1 1-4h2a3 3 0 0 0 3-3c0-4-4-7-9-7z M7 9h.01 M10 6h.01 M15 7h.01 M6 14h.01',
  square:'M4 4h16v16H4z',story:'M6 2h12v20H6z',
  menu:'M4 6h16 M4 12h16 M4 18h16',
  more:'M5 12h.01 M12 12h.01 M19 12h.01',
  star:'M12 2l3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z',
  select:'M3 3h18v18H3z M7 12l3 3 7-7',
  settings:'M10 3h4l1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3z M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  plus:'M12 5v14 M5 12h14',minus:'M5 12h14',close:'M6 6l12 12 M6 18L18 6',check:'M5 12l4 4L19 6',
  crop:'M7 3v14h14 M3 7h14v14',
  scissors:'M4 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M4 13a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M7 8l14 12 M7 16L21 4',
  save:'M4 3h13l4 4v14H3V3h1 M7 3v6h10V3 M7 21v-8h10v8',
  edit:'M14 5l5 5 M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15z',
  trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  camera:'M3 7h4l2-3h6l2 3h4v14H3z M8 13a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  copy:'M9 9h12v12H9z M15 5V3H3v12h2',
  link:'M10 7l3-3a5 5 0 0 1 7 7l-3 3 M14 17l-3 3a5 5 0 0 1-7-7l3-3 M8 16l8-8',
  download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  upload:'M12 15V3 M7 8l5-5 5 5 M4 16v5h16v-5',
  search:'M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M15 15l6 6',
  print:'M6 8V3h12v5 M6 17H3V8h18v9h-3 M6 14h12v7H6z M17 11h1',
  external:'M9 3h12v12 M21 3L3 21',
  expand:'M9 3H3v6 M15 3h6v6 M3 15v6h6 M21 15v6h-6',
  layers:'M12 3L2 8l10 5 10-5z M2 12l10 5 10-5 M2 16l10 5 10-5',
  sun:'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',
  moon:'M16 3a9 9 0 1 0 5 15A9 9 0 0 1 16 3z',
  rising:'M12 21V4 M6 10l6-6 6 6 M5 21h14 M4 15h4 M16 15h4',
  heart:'M12 21L3 12A5.5 5.5 0 0 1 12 4a5.5 5.5 0 0 1 9 8z',
  diamond:'M12 2l10 10-10 10L2 12z M12 7v10 M7 12h10',
  flower:'M12 22V10 M12 17C5 17 4 12 4 12c6 0 8 5 8 5 M12 14c6 0 8-5 8-5-6 0-8 5-8 5 M9 3a3 3 0 0 1 6 0a3 3 0 0 1 3 5a3 3 0 0 1-6 3a3 3 0 0 1-6-3a3 3 0 0 1 3-5',
  city:'M3 21V3h18v18z M7 7h2 M15 7h2 M7 11h2 M15 11h2 M10 21v-6h4v6'
 };
 var glyphs={'🔤':'text','🖼':'image','🧹':'arrange','🎨':'palette','☰':'menu','★':'star','☆':'star','☑':'select','☐':'select','⚙':'settings','↔':'flip-x','↕':'flip-y','↻':'refresh','↺':'undo','⟳':'refresh','⟲':'undo','🔄':'refresh','🔃':'refresh','🔁':'refresh','↑':'arrow-up','↓':'arrow-down','←':'arrow-left','→':'arrow-right','↗':'external','⬆':'arrow-up','⬇':'arrow-down','➡':'arrow-right','⬅':'arrow-left','↩':'undo','🔽':'chevron-down','🔼':'chevron-up','‹':'chevron-left','›':'chevron-right','▾':'chevron-down','▴':'chevron-up','▸':'chevron-right','◂':'chevron-left','➕':'plus','＋':'plus','+':'plus','➖':'minus','−':'minus','×':'close','✕':'close','✖':'close','✗':'close','✓':'check','✔':'check','✅':'check','✂':'scissors','✏':'edit','📷':'camera','📸':'camera','📋':'copy','🔗':'link','📥':'download','📤':'upload','🔍':'search','🔎':'search','🖨':'print','⛶':'expand','⤢':'expand'};
 function utility(glyph,label){
  var raw=String(glyph).replace(/[\uFE0E\uFE0F]/g,'');
  if(raw==='📷'&&/has photo/i.test(label||'')||raw==='🖼'&&/export image/i.test(label||''))return '';
  if(raw==='🧹'&&/tidy photos/i.test(label||''))return '';
  if(raw==='+'&&!/^\s*\+(?:$|\s*(add|new|plan|create))/i.test(label||''))return '';
  if(raw==='📋'&&/paste/i.test(label||''))return 'clipboard';
  if(raw==='✂'&&/split/i.test(label||''))return 'split';
  if(raw==='✂'&&/crop/i.test(label||''))return 'crop';
  return glyphs[raw]||'';
 }
 function node(name){
  if(!paths[name])return null;
  var span=document.createElement('span'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');
  span.className='control-svg';span.setAttribute('aria-hidden','true');span.setAttribute('data-utility-icon',name);
  [['viewBox','0 0 24 24'],['width','20'],['height','20'],['fill','none'],['stroke','currentColor'],['stroke-width','1.8'],['stroke-linecap','round'],['stroke-linejoin','round'],['focusable','false']].forEach(function(a){svg.setAttribute(a[0],a[1])});
  path.setAttribute('d',paths[name]);svg.appendChild(path);span.appendChild(svg);return span;
 }
 function draw(ctx,name,x,y,size,color){
  ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(new Path2D(paths[name]));ctx.restore();
 }

 function apply(control,pack){
  var label=control.textContent+' '+(control.getAttribute('aria-label')||'');
  var nodes=Array.from(control.querySelectorAll('.button-emoji,.emo,.menu-emoji,.setup-option-icon,.control-emoji'));
  if(control.matches&&control.matches('.control-emoji'))nodes.unshift(control);
  nodes.forEach(function(icon){
   if(icon.querySelector&&icon.querySelector('.control-svg'))return;
   var name=utility(icon.textContent,label);
   if(name&&control.matches&&control.matches('button,a.btn,[role="menuitem"],.rot,.prot')){icon.textContent='';icon.appendChild(node(name));icon.classList.remove('text-symbol');icon.classList.add('utility-icon');return}
   var id=icon.getAttribute('data-control-icon')||key(icon.textContent,label,control.className),value=get(id,pack);
   if(!value)return;icon.setAttribute('data-control-icon',id);if(icon.textContent!==value)icon.textContent=value;
  });
 }
 return {get:get,key:key,apply:apply,utility:utility,node:node,draw:draw,paths:paths};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ClosetLintIcons;
