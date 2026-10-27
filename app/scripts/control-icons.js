/* Owner-selected control icons; category/garment data stays unchanged. */
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
 function apply(control,pack){
  var label=control.textContent+' '+(control.getAttribute('aria-label')||'');
  var nodes=Array.from(control.querySelectorAll('.button-emoji,.emo,.menu-emoji,.setup-option-icon,.control-emoji'));
  if(control.matches&&control.matches('.control-emoji'))nodes.unshift(control);
  nodes.forEach(function(icon){
   var id=icon.getAttribute('data-control-icon')||key(icon.textContent,label,control.className),value=get(id,pack);
   if(!value)return;icon.setAttribute('data-control-icon',id);if(icon.textContent!==value)icon.textContent=value;
  });
 }
 return {get:get,key:key,apply:apply};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ClosetLintIcons;
