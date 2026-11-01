/* Recent wear frequency uses distinct local calendar dates, never consecutive-day streaks. */
function wearDayNumber(day){
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;
  var time=Date.parse(day+'T12:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===day?Math.floor(time/86400000):null;
}
function recentWearStats(it,today){
  today=today||todayStr();var end=wearDayNumber(today),seen={};
  (it.wears||[]).forEach(function(day){var n=wearDayNumber(day);if(n!==null&&n<=end)seen[day]=n});
  var days=Object.keys(seen).sort(),recent=days.filter(function(day){return seen[day]>=end-29});
  return {days:days,total:days.length,last:days[days.length-1]||'',recent:recent,count:recent.length,level:it.wish?0:recent.length>=8?2:recent.length>=3?1:0,today:!!seen[today]};
}
function pieceWearOutfitLinked(it,day){
  var outfits=Object.assign({},state.outfitHistory||{},state.outfits||{});
  return Object.keys(outfits).some(function(id){var outfit=outfits[id];return (outfit.wearLog||[]).some(function(entry){return entry.d===day&&(Array.isArray(entry.ids)?entry.ids:(entry.pieces||outfit.pieces||[]).map(function(p){return p.id})).indexOf(it.id)>=0})});
}
function wearHeatIcon(level){return level===2?'❤️‍🔥':'🔥'}
function wearHeatDescription(stats){return (stats.level===2?'Very hot':'Hot')+': '+stats.count+' logged wear days in the last 30 days'}
function wearBox(it){
  var cur=Object.assign({},it),busy=false,box=el('div',{class:'wearbox wear-strip'}),info=el('div',{class:'wear-strip-info'}),top=el('div',{class:'wear-strip-top'}),line=el('span'),heat=el('span',{class:'wear-heat-chip'}),last=el('span',{class:'wear-strip-last fine'}),bars=el('div',{class:'wear-days',role:'img',title:'Last 10 days, with today on the right'});
  var todayBtn=el('button',{class:'btn small',type:'button'}),other=el('button',{class:'btn small wear-other',type:'button',text:'🗓️','aria-label':'Log another day or manage wear dates',title:'Log another day or manage wear dates'});
  function paint(refresh){
    if(refresh&&typeof byId==='function')cur=Object.assign({},cur,byId()[it.id]||{});
    var td=todayStr(),stats=recentWearStats(cur,td),end=wearDayNumber(td);box.className='wearbox wear-strip'+(stats.level?' wear-heat-'+stats.level:'')+(stats.today?' wear-logged-today':'');
    line.textContent=stats.total?'Worn '+stats.total+'×':'No wears logged';heat.hidden=!stats.level;heat.textContent=stats.level?wearHeatIcon(stats.level)+' '+stats.count+' in 30d':'';
    heat.title=stats.level?wearHeatDescription(stats):'';heat.setAttribute('aria-label',heat.title);
    last.textContent=stats.last?'Last logged '+(stats.last===td?'today':stats.last):'Log the first wear';
    bars.textContent='';bars.hidden=!stats.total;bars.setAttribute('aria-label',stats.recent.filter(function(day){return wearDayNumber(day)>=end-9}).length+' logged wear days in the last 10 days, ending '+td);
    for(var i=0;i<10;i++){var day=new Date((end-9+i)*86400000).toISOString().slice(0,10),worn=stats.recent.indexOf(day)>=0;bars.appendChild(el('i',{class:(worn?'wear-day-logged ':'')+(i===9?'wear-day-today':''),title:day+(worn?': wear logged':': no wear logged'),'aria-hidden':'true'}))}
    todayBtn.textContent=stats.today?'✅ Today':'📅 Today';todayBtn.setAttribute('aria-pressed',stats.today?'true':'false');todayBtn.title=stats.today?(pieceWearOutfitLinked(cur,td)?'View today’s outfit wear details':'Remove today from this piece’s wear log'):'Log that you wore this today';todayBtn.disabled=busy;other.disabled=busy;
  }
  function save(arr,msg){
    if(busy)return Promise.resolve(false);busy=true;paint();
    return patchEdit(cur,{wears:arr},true).then(function(ok){if(ok){cur.wears=arr;if(msg)toast(msg)}return ok}).finally(function(){busy=false;paint()});
  }
  todayBtn.addEventListener('click',function(){
    if(busy)return;paint(true);var stats=recentWearStats(cur),td=todayStr();
    if(stats.today&&pieceWearOutfitLinked(cur,td)){histDay(td);return}
    var w=(cur.wears||[]).slice(),i=w.indexOf(td);if(i>=0)w=w.filter(function(day){return day!==td});else w.push(td);
    save(w,i>=0?'Took today off the wear log':'Logged: you wore this today');
  });
  other.addEventListener('click',function(){if(!busy){paint(true);openWearDates(cur,save)}});
  top.appendChild(line);top.appendChild(heat);info.appendChild(top);info.appendChild(last);info.appendChild(bars);box.appendChild(info);box.appendChild(el('div',{class:'wear-strip-actions'},todayBtn,other));
  box.refreshWear=function(){paint(true)};paint();return box;
}
function refreshPieceWears(){document.querySelectorAll('.wearbox').forEach(function(box){if(box.refreshWear)box.refreshWear()})}
function openWearDates(cur,save){
  var d=$('cdlg');d.textContent='';
  var di=el('input',{type:'date',max:todayStr(),'aria-label':'Date worn'}),busy=false;
  function current(){return typeof byId==='function'&&cur.id?Object.assign({},cur,byId()[cur.id]||{}):cur}
  di.addEventListener('change',function(){
    var day=di.value;if(!day||busy)return;
    if(wearDayNumber(day)===null||day>todayStr()){toast('Choose today or an earlier date.');return}
    if((current().wears||[]).indexOf(day)>=0){toast('That day is already in your wear log.');d.close();return}
    busy=true;save((current().wears||[]).concat(day),'✓ Logged '+day).then(function(ok){busy=false;if(ok)d.close()});
  });
  var days=wearsOf(cur).slice().reverse(),row=el('div',{class:'chips'}),linked=false;
  days.forEach(function(day){var fromOutfit=pieceWearOutfitLinked(cur,day);linked=linked||fromOutfit;row.appendChild(el('span',{class:'chip wearchip'},day+' ',el('button',{type:'button','aria-label':(fromOutfit?'View outfit wear details for ':'Remove ')+day,title:fromOutfit?'Manage this date with its logged outfit':'Remove this date',text:fromOutfit?'📅':'×',onclick:function(){if(busy)return;if(pieceWearOutfitLinked(current(),day)){histDay(day);return}busy=true;save((current().wears||[]).filter(function(x){return x!==day}),'Removed '+day+' from your wear log').then(function(ok){busy=false;if(ok)d.close()})}})))});
  d.appendChild(el('div',{class:'dlgwide narrow'},el('h2',{text:'When did you wear it?'}),
    el('label',null,'Choose a date',di),
    days.length?el('details',null,el('summary',{text:'Manage logged days'}),linked?el('p',{class:'fine',text:'Outfit-linked dates open the day’s details so you can manage the outfit and its pieces together.'}):null,row):null,
    el('div',{class:'actions',style:'margin-top:12px'},el('button',{class:'btn',type:'button',text:'Cancel',onclick:function(){d.close()}}))));
  if(!d.open)d.showModal();try{if(di.showPicker)di.showPicker();else if(di.focus)di.focus()}catch(e){if(di.focus)di.focus()}
}

function wireRecentWearDay(){
  var shown=todayStr();
  function refresh(){var now=todayStr();if(now===shown)return;shown=now;if(!state.capsDone)return;refreshPieceWears();if(isClosetTab(state.tab)){renderFilters();renderGrid()}}
  function arm(){var next=new Date();next.setHours(24,0,0,100);setTimeout(function(){refresh();arm()},Math.max(1000,next.getTime()-Date.now()))}
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh()});arm();
}
