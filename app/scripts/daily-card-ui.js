/* Browse-grid presentation. Only its own profile record is written. */
var ClosetLintDailyUI=(function(){
 'use strict';
 var key='daily-card',memory=null,saveChain=Promise.resolve(),timer=null,mountRevision=0;
 var names={fortune:'Fortune',do:'Do',dont:"Don’t",neglected:'The neglected one',color:'Color omen'};
 function swatchInk(hex){
  var value=hex.slice(1);if(value.length===3)value=value.split('').map(function(c){return c+c}).join('');
  var channels=[0,2,4].map(function(i){var c=parseInt(value.slice(i,i+2),16)/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)});
  var luminance=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];
  return (luminance+.05)/(.0056+.05)>=1.05/(luminance+.05)?'#111111':'#ffffff';
 }
 function identity(){return window.ClosetLintLocal&&window.ClosetLintLocal.instance||'closet-lint-public-demo'}
 function persist(record){
  memory=record;state.profile[key]=record;refreshSettings();
  if(!state.db)return;
  var snapshot=JSON.parse(JSON.stringify(record));
  saveChain=saveChain.then(function(){return state.db.collection('profile').doc(key).set(snapshot)}).catch(function(){toast('Linty’s card will stay for this session, but could not be saved.')});
 }
 function record(){
  var day=todayStr(),old=memory||state.profile[key],instance=identity();
  var sameDay=old&&old.instance===instance&&old.card&&old.card.day===day,cachedPiece=old&&old.card&&old.card.pieceId&&allItems().find(function(p){return p.id===old.card.pieceId});
  var stalePiece=old&&old.card&&old.card.pieceId&&(!ClosetLintDaily.isActivePiece(cachedPiece)||old.card.type==='do'&&cachedPiece.stored);
  if(old&&old.version===1&&old.instance===instance&&old.card&&old.card.day===day&&typeof old.card.text==='string'&&Object.prototype.hasOwnProperty.call(names,old.card.type)&&Array.isArray(old.card.colors)&&!stalePiece)return old;
  var history=old&&old.instance===instance&&Array.isArray(old.history)?old.history.filter(function(h){var age=ClosetLintDaily.daysSince(h.day,day);return age!==null&&age<=30}).slice(-30):[];
  var month=Number(day.slice(5,7)),season=month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'fall':'winter';
  var card=ClosetLintDaily.generate({day:day,instance:instance,items:allItems(),season:season,history:state.pub?[]:history,lines:DAILY_LINES,outfits:Object.keys(state.outfits||{}).map(function(id){var o=state.outfits[id];return Array.isArray(o.pieces)?o.pieces.map(function(p){return typeof p==='string'?p:p.id}):[]})});
  var next={version:1,instance:instance,card:card,revealed:!!(sameDay&&old.revealed),dismissed:!!(sameDay&&old.dismissed),slots:{},history:history.concat({day:day,type:card.type,hash:card.hash,pieceId:card.pieceId}).slice(-30)};
  persist(next);return next;
 }
 function enabled(){return document.documentElement.getAttribute('data-daily-card')!=='off'}
 function refreshSettings(){
  var link=document.getElementById('daily-card-restore'),r=memory||state.profile[key];if(!link)return;
  link.hidden=!(enabled()&&r&&r.instance===identity()&&r.card&&r.card.day===todayStr()&&r.dismissed);
  link.onclick=function(){
   var current=memory||state.profile[key];if(!enabled()||!current||!current.card||current.card.day!==todayStr()||!current.dismissed){refreshSettings();return}
   current.dismissed=false;persist(current);if(isClosetTab(state.tab))renderGrid();toast('Today’s fortune is back in your closet.');
  };
 }
 function mount(grid){
  var revision=++mountRevision;
  refreshSettings();
  if(timer){clearTimeout(timer);timer=null}
  var existing=grid.querySelector('.daily-card-slot');
  if(!enabled()||grid.hidden||!ClosetLintDaily.eligible(state,anyFilter())){if(existing)existing.remove();return}
  if(!state.capsDone||state.db&&!state.pub&&typeof setupLoaded!=='undefined'&&!['profile','custom','edits','outfits'].every(function(k){return setupLoaded[k]})||!ClosetLintDaily.eligible(state,anyFilter())||!grid.children.length)return;
  var r=record(),day=r.card.day;
  // Check the calendar again after midnight without changing anyone's wardrobe.
  var midnight=new Date();midnight.setHours(24,0,1,0);timer=setTimeout(function(){memory=null;if(enabled()&&isClosetTab(state.tab))renderGrid()},Math.min(2147483647,Math.max(1000,midnight-Date.now())));
  refreshSettings();if(r.dismissed)return;
  var card=r.card,li=el('li',{class:'daily-card-slot'}),frame=el('div',{class:'daily-card'+(r.revealed?' revealed':'')});
  var dateText=new Date(day+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
  var backFace=el('span',{class:'daily-face daily-back'},el('span',{class:'daily-inset','aria-hidden':'true'}),el('span',{class:'daily-date',text:dateText}),el('span',{class:'daily-orb','aria-hidden':'true',text:'🪬'}),el('span',{class:'daily-prompt',text:'Tap to reveal'}));
  var frontFace=el('span',{class:'daily-face daily-front'});
  var item=card.pieceId&&byId()[card.pieceId];
  if(item&&!item.wish&&!item.hidden&&!item.removed&&!item.donate&&realPhoto(item))frontFace.appendChild(el('img',{src:item.photo,alt:'',class:'daily-photo',loading:'lazy'}));
  if(card.colors&&card.colors.length){var swatches=el('span',{class:'daily-swatches'});card.colors.forEach(function(c){var swatch=el('span',{class:'daily-swatch',text:typeof colLabel==='function'?colLabel(c):c});var hex=typeof COLORS!=='undefined'&&COLORS[c];if(hex&&/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)){swatch.style.setProperty('--daily-color',hex);swatch.style.setProperty('--daily-ink',swatchInk(hex))}swatches.appendChild(swatch)});frontFace.appendChild(swatches)}
  frontFace.appendChild(el('span',{class:'daily-line',text:card.text}));frontFace.appendChild(el('span',{class:'daily-signature',text:'— Linty'}));
  var flip=el('button',{type:'button',class:'daily-flip',onclick:function(){r.revealed=!r.revealed;persist(r);paint()}},el('span',{class:'daily-turn'},backFace,frontFace));
  var dismiss=el('button',{type:'button',class:'daily-dismiss','aria-label':'Dismiss Linty’s fortune until tomorrow',text:'×',onclick:function(){r.dismissed=true;persist(r);renderGrid()}});
  function paint(){frame.classList.toggle('revealed',r.revealed);flip.setAttribute('aria-pressed',r.revealed?'true':'false');flip.setAttribute('aria-label',r.revealed?names[card.type]+': '+card.text+' — Linty. Turn card over.':'Linty’s daily fortune for '+dateText+'. Tap to reveal.');frontFace.setAttribute('aria-hidden',r.revealed?'false':'true');backFace.setAttribute('aria-hidden',r.revealed?'true':'false');dismiss.hidden=!r.revealed}
  frame.appendChild(flip);frame.appendChild(dismiss);li.appendChild(frame);paint();
  // Measure real cards once, then preserve this day's position for that screen size.
  (typeof requestAnimationFrame==='function'?requestAnimationFrame:function(fn){fn()})(function(){
   if(revision!==mountRevision||!enabled()||grid.hidden||!ClosetLintDaily.eligible(state,anyFilter())||!grid.isConnected||todayStr()!==day||document.querySelector('.daily-card-slot'))return;
   var columns=gridCols(grid),first=grid.firstElementChild,rect=first&&first.getBoundingClientRect(),top=grid.getBoundingClientRect().top;
   var rows=rect&&rect.height?Math.max(1,Math.floor((window.innerHeight-top)/(rect.height+16))):1;
   var bucket=columns+'x'+Math.round(window.innerHeight/200),slots=r.slots||{};
   var capacity=Math.max(1,Math.min(columns*rows,grid.children.length));
   if(!Object.prototype.hasOwnProperty.call(slots,bucket)){slots[bucket]=ClosetLintDaily.hash(day+'|'+identity()+'|'+bucket)%capacity;r.slots=slots;persist(r)}
   var index=Math.min(slots[bucket],capacity-1);grid.insertBefore(li,grid.children[index]||null);
  });
 }
 return {mount:mount,refreshSettings:refreshSettings};
})();
