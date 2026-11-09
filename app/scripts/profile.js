/* Profile UI reuses the existing wardrobe, wear, trip, measurement and Lab actions. */
var profileMonth=null,profileSkySession={},profileSkySaving={},profileForecast={},profileSettingsMounted=false,profileSkyPreviewIndex=null,profileLayoutMedia=null;
function profileButton(text,fn,primary){return el('button',{class:'btn'+(primary?' primary':''),type:'button',text:text,onclick:fn})}
function profileDays(){if(profileFirstRunPreview())return profilePreviewDays;return ClosetLintAlmanac.loggedDays(allItems().concat(archItems()),state.outfits||{},state.outfitHistory||{})}
function profileStartDay(days){
 var today=todayStr(),dates=Object.keys(days).filter(function(d){return d<=today}).sort(),saved=profileFirstRunPreview()?null:(state.profile||{})['almanac-start'],first=saved&&saved.day;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(first||'')||first>today)first=null;
 return dates.length&&(!first||dates[0]<first)?dates[0]:first;
}
function profileNeedsWear(days,today){var first=profileStartDay(days);return !!first&&((today>=first&&!days[today])||(ClosetLintAlmanac.shift(today,-1)>=first&&!days[ClosetLintAlmanac.shift(today,-1)]))}
function profileDayState(day,days,today){var first=profileStartDay(days);return (days[day]?'logged':day<today&&(!first||day<first)?'before-start':day<today?'missed':day===today?'unlogged':'future')+(day===today?' today':'')}
// Resolve only the pieces in displayed days; share the piece editor/Board photo sampler and cache.
function profilePhotoPalette(row,map){
 var pending=[];
 if(!row||!(row.ids||[]).length||typeof swOf!=='function')return {row:row,pending:pending};
 map=map||byIdA();var pieces=row.ids.map(function(id){return map[id]}).filter(Boolean);
 if(!pieces.length)return {row:row,pending:pending};
 var colors=ClosetLintAlmanac.paletteCounts(pieces,function(p){
  var palette=swOf(p),cached=swCache[p.id+'|'+(p.photo||'')];
  if(!(Array.isArray(p.sw)&&p.sw.length)&&cached&&cached.v===null&&cached.promise)pending.push(cached.promise);
  return palette;
 });
 return {row:colors,pending:pending};
}
function profilePaintSwatch(node,row,max){node.style.background=ClosetLintAlmanac.swatchBackground(profileDayColors(row,max))}
function profileDayColors(row,max){return ClosetLintAlmanac.dayPalette(row,COLORS,max||4)}
// Publish a complete day/month/week once; no temporary tag colors or partial palettes.
function profilePaintSwatches(entries,host){
 function paint(){
  var map=typeof byIdA==='function'?byIdA():null,packets=entries.map(function(e){return profilePhotoPalette(e.row,map)}),pending=Array.from(new Set(packets.flatMap(function(p){return p.pending})));
  if(pending.length){entries.forEach(function(e){e.node.style.visibility='hidden'});if(host)host.setAttribute('aria-busy','true');return Promise.allSettled(pending).then(paint)}
  entries.forEach(function(e,i){profilePaintSwatch(e.node,packets[i].row,e.max);e.node.style.visibility=''});if(host)host.setAttribute('aria-busy','false');return Promise.resolve();
 }
 return paint();
}
function profileSwatch(day,days,today,max,batch){
 var status=profileDayState(day,days,today),node=el('span',{class:'almanac-dot '+status,'data-day':day,'aria-hidden':'true'}),row=days[day];
 if(row){var entry={node:node,row:row,max:max};if(batch)batch.push(entry);else profilePaintSwatches([entry])}
 else if(status.indexOf('before-start')>=0)node.textContent='·';else if(day<=today)node.textContent='+';
 return node;
}

function profileMenuHeader(){
 var today=todayStr(),days=profileDays(),first=profileStartDay(days),start=ClosetLintAlmanac.shift(today,-6),logged=0,elapsed=0,needs=profileNeedsWear(days,today),detail;
 if(!first)detail=el('span',{class:'almanac-invite',text:'Start your week in color'});
 else{var batch=[];detail=el('span',{class:'almanac-week','aria-hidden':'true'});for(var i=0;i<7;i++){var date=ClosetLintAlmanac.shift(start,i);if(date<=today&&date>=first){elapsed++;if(days[date])logged++}detail.appendChild(profileSwatch(date,days,today,2,batch))}profilePaintSwatches(batch,detail)}
 var label='My almanac'+(!first?', Start your week in color':', '+logged+' of '+elapsed+' days logged in the last 7 days'+(needs?', wear log to fill in':''));
 return el('div',{class:'almanac-menu-head'},el(first?'a':'button',{href:first?'#/profile':null,type:first?null:'button',role:'menuitem',class:'almanac-menu-link','aria-label':label,onclick:function(e){if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();closeAppMenu();if(!first)profileOpenDay(today);else openProfile('almanac')}},el('span',{class:'almanac-menu-title'},el('span',{text:'My almanac'}),needs?el('span',{class:'almanac-reminder-dot','aria-hidden':'true'}):null),detail),el('a',{href:'#/profile/settings',role:'menuitem',class:'almanac-gear','aria-label':'Settings',onclick:function(e){if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();closeAppMenu();openProfile('settings')}},el('span',{class:'native-settings-emoji','data-ui-emoji':'true','aria-hidden':'true',text:'⚙️'})));
}
function profileBadge(){var b=$('menubtn');if(!b)return;var days=profileDays(),missing=profileNeedsWear(days,todayStr());b.classList.toggle('almanac-attention',missing);b.setAttribute('aria-label',missing?'Menu, wear log to fill in':'Menu')}
function profileWearCommitted(wasUnstarted){
 if(profileFirstRunPreview())return;
 var days=profileDays(),first=profileStartDay(days);if(!first||!Object.keys(days).some(function(d){return d<=todayStr()}))return;
 var prior=(state.profile||{})['almanac-start'];
 if(!prior||first<prior.day){var marker={day:first};state.profile=state.profile||{};state.profile['almanac-start']=marker;if(state.db)state.db.collection('profile').doc('almanac-start').set(marker).catch(function(){/* A wear remains saved even if its onboarding marker cannot save. */})}
 profileBadge();if(state.tab==='profile'&&(state.profileTab||'almanac')==='almanac')profileRenderAlmanac();
 if(wasUnstarted&&!prior&&!profileFirstWearAnnounced){profileFirstWearAnnounced=true;profileFirstWearToastPending=true;setTimeout(function(){profileFirstWearToastPending=false;toast('Your first day in color.')},0)}
}
var profileFirstWearAnnounced=false,profileFirstWearToastPending=false;
// URL-only review mode; no wardrobe or preference writes.
var profilePreviewDays={},profilePreviewOutfits={},profilePreviewCelebrated=false;
function profileFirstRunPreview(){return typeof window!=='undefined'&&window.location&&new URLSearchParams(window.location.search).get('almanacFirstRun')==='1'}
function profileOpenDay(date){return histDay(date,profileFirstRunPreview())}
function profilePreviewNotice(){return el('div',{class:'almanac-preview-notice',role:'note'},el('span',{text:'First run preview · Almanac logging is simulated. Your saved wears stay unchanged.'}),profileButton('Exit preview',function(){var url=new URL(window.location.href);url.searchParams.delete('almanacFirstRun');window.location.assign(url.href)}))}
function profilePreviewWear(date,ids,outfit){
 if(!profileFirstRunPreview())return Promise.resolve(false);
 if(date>todayStr()){toast('Outfit planned in preview.');return Promise.resolve(true)}
 var map=byIdA(),items=ids.map(function(id){var p=map[id];return p&&Object.assign({},p,{wish:false,wears:[date]})}).filter(Boolean),row=ClosetLintAlmanac.loggedDays(items,{},{});
 if(row[date])profilePreviewDays[date]=row[date];if(outfit)profilePreviewOutfits[date]=[Object.assign({},outfit,{wearLog:[{d:date,ids:ids}]})];
 profileBadge();if(state.tab==='profile'&&(state.profileTab||'almanac')==='almanac')profileRenderAlmanac();
 var first=!profilePreviewCelebrated&&!!row[date];if(first)profilePreviewCelebrated=true;
 setTimeout(function(){toast(first?'Your first day in color.':'Wear logged in preview.')},0);return Promise.resolve(true);
}
function openProfile(tab){tab=tab||'almanac';if(typeof comfortPark==='function')comfortPark();if(window.ClosetLintRoutes&&window.ClosetLintRoutes.profile)return window.ClosetLintRoutes.profile(tab);state.profileTab=tab;return setTab('profile')}
function renderProfile(){
 var host=$('view-profile');if(!host)return;
 if(!host.firstChild){host.appendChild(el('header',{class:'profile-page-head'},el('h2',{text:'Profile'}),el('button',{id:'profile-log-today',class:'btn primary',type:'button','aria-label':'Log today’s wear',onclick:function(){profileOpenDay(todayStr())}},el('span',{class:'almanac-log-long',text:'📅 Log today’s wear'}),el('span',{class:'almanac-log-short',text:'📅 Log today'}))));var tabs=el('div',{class:'profile-tabs',role:'tablist','aria-label':'Profile'});[['almanac','📖 My almanac'],['sizes','📐 Sizes & fit'],['comfort','😶‍🌫️ Comfort zone'],['settings','⚙️ Settings']].forEach(function(p,i){var b=el('button',{type:'button',role:'tab',id:'profile-tab-'+p[0],'aria-controls':'profile-'+p[0],text:p[0]==='settings'?'Settings':p[1],onclick:function(){openProfile(p[0])},onkeydown:function(e){if(['ArrowLeft','ArrowRight','Home','End'].indexOf(e.key)<0)return;e.preventDefault();var index=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowLeft'?-1:1)+4)%4,key=['almanac','sizes','comfort','settings'][index];openProfile(key);$('profile-tab-'+key).focus()}});if(p[0]==='settings')b.prepend(el('span',{class:'native-settings-emoji','data-ui-emoji':'true','aria-hidden':'true',text:'⚙️'}));tabs.appendChild(b)});host.appendChild(tabs);['almanac','sizes','comfort','settings'].forEach(function(key){host.appendChild(el('section',{id:'profile-'+key,role:'tabpanel','aria-labelledby':'profile-tab-'+key,hidden:true}))});profileMountSettings()}
 var tab=state.profileTab||'almanac';$('profile-log-today').hidden=tab!=='almanac';['almanac','sizes','comfort','settings'].forEach(function(key){$('profile-'+key).hidden=key!==tab;$('profile-tab-'+key).setAttribute('aria-selected',String(key===tab));$('profile-tab-'+key).tabIndex=key===tab?0:-1});
 if(tab==='almanac')profileRenderAlmanac();else if(tab==='sizes')profileRenderFit();else if(tab==='comfort')comfortRender();else {$('site-theme').value=document.documentElement.getAttribute('data-skin')||readDisplayPrefs().skin;renderCategorySettings();renderClosetTabSettings();fillWardrobeSettings();laundryFillSettings();if(typeof outfitNamingSettings==='function')outfitNamingSettings();if(typeof ClosetLintDailyUI!=='undefined')ClosetLintDailyUI.refreshSettings()}
}
function profileRenderAlmanac(){
 var host=$('profile-almanac');host.textContent='';if(profileFirstRunPreview())host.appendChild(profilePreviewNotice());
 host.appendChild(el('div',{class:'almanac-layout'},profileCalendar(),profileSkyCard(),profileQuizCard(),profileNextPlans(),profileTaste()));
 if(!profileLayoutMedia){profileLayoutMedia=window.matchMedia('(max-width:900px)');profileLayoutMedia.addEventListener('change',profileArrangeAlmanac)}
 profileArrangeAlmanac();
}
function profileArrangeAlmanac(){
 var host=$('profile-almanac'),grid=host&&host.querySelector('.almanac-layout');if(!grid)return;
 var calendar=grid.querySelector('.almanac-calendar'),sky=grid.querySelector('.almanac-sky'),quiz=grid.querySelector('.almanac-quiz'),plans=grid.querySelector('.almanac-plans'),taste=grid.querySelector('.almanac-taste'),focus=document.activeElement,restore=grid.contains(focus);
 // Keep keyboard and reading order aligned with the single column on small screens.
 if(profileLayoutMedia.matches)grid.replaceChildren(calendar,sky,quiz,plans,taste);
 else grid.replaceChildren(el('div',{class:'almanac-column almanac-calendar-column'},calendar,plans),el('div',{class:'almanac-column almanac-side'},sky,quiz,taste));
 if(restore)focus.focus({preventScroll:true});
}
function profileQuizChoice(date){
 var rows=ClosetLintComfort.topics.map(function(t){var p=ClosetLintComfort.progress(state.profile,t);return {topic:t,progress:p,started:!!(p.started||p.reviewed||comfortPaused[t.id]||comfortBookmark(t.id)!==null)}}),unfinished=rows.filter(function(row){return row.progress.finished===false||row.progress.reviewed<row.progress.total}),started=unfinished.filter(function(row){return row.started}),pool=started.length?started:unfinished;
 if(!pool.length)return null;
 var parts=date.split('-').map(Number),day=Math.floor(Date.UTC(parts[0],parts[1]-1,parts[2])/86400000);
 return pool[day%pool.length];
}
function profileQuizOpen(topic,index){
 var paused=comfortPaused[topic];
 if(paused&&paused.index===index){comfortStart(topic);return}
 if(paused&&JSON.stringify(paused.draft)!==paused.initial&&!window.confirm('Open this question and discard your unfinished answer in this quiz?'))return;
 comfortStart(topic,index);
}
function profileQuizCard(){
 var box=el('section',{class:'almanac-card almanac-quiz','aria-label':'My quizzes'},profileCardHeader('A little about you','All quizzes ↗',function(){openProfile('comfort')}));
 if(state.db&&!state.pub&&typeof setupLoaded!=='undefined'&&!setupLoaded.profile){box.appendChild(el('p',{class:'fine',text:'Reading your quiz progress…'}));return box}
 var choice=profileQuizChoice(todayStr());
 if(!choice){
  box.appendChild(el('p',{class:'almanac-quiz-title',text:ClosetLintComfort.topics.length?'All caught up, nice!':'A little more discovery awaits.'}));
  box.appendChild(el('p',{class:'fine',text:ClosetLintComfort.topics.length?'You’ve reached the end of every quiz. Revisit your answers and skipped questions anytime.':'Explore your atmosphere and available quizzes.'}));
  box.appendChild(el('div',{class:'almanac-quiz-footer'},profileButton('😶‍🌫️ See my atmosphere',function(){openProfile('comfort')})));return box;
 }
 var t=choice.topic,p=choice.progress,index=t.questions.findIndex(function(q){return !ClosetLintComfort.read(state.profile,q.id)});if(index<0)index=t.questions.length-1;var question=t.questions[index],segments=el('div',{class:'comfort-progress-segments','aria-hidden':'true'});
 t.questions.forEach(function(q){var r=ClosetLintComfort.read(state.profile,q.id);segments.appendChild(el('span',{class:r?'comfort-progress-'+r.status:'comfort-progress-unanswered'}))});
 box.appendChild(el('h4',{class:'almanac-quiz-title'},el('span',{'aria-hidden':'true','data-ui-emoji':'true',text:t.emoji}),el('span',{text:t.name})));
 box.appendChild(el('button',{class:'almanac-quiz-question',type:'button',text:question.title,onclick:function(){profileQuizOpen(t.id,index)}}));box.appendChild(segments);
 box.appendChild(el('div',{class:'almanac-quiz-footer'},el('p',{class:'fine',text:choice.started?p.answered+' of '+p.total+' answered'+(p.reviewed>p.answered?' · '+(p.reviewed-p.answered)+' skipped':''):p.total+' quick rounds'}),profileButton(choice.started?'Continue quiz':'Start quiz',function(){profileQuizOpen(t.id,index)},true)));return box;
}
function profileCalendar(){
 var days=profileDays(),today=todayStr(),ym=profileMonth||today.slice(0,7),year=+ym.slice(0,4),month=+ym.slice(5,7)-1,dim=new Date(year,month+1,0).getDate(),lead=new Date(year,month,1).getDay(),first=profileStartDay(days),logged=0,elapsed=0;
 var box=el('section',{class:'almanac-card almanac-calendar'},el('header',{class:'almanac-calendar-head'},el('p',{class:'almanac-eyebrow',text:'MY MONTH IN COLOR'})));
 function move(n){var d=new Date(year,month+n,1);profileMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');profileRenderAlmanac();$('profile-almanac').querySelector('[aria-label="'+(n<0?'Previous month':'Next month')+'"]').focus()}
 box.appendChild(el('div',{class:'almanac-month-head'},el('button',{class:'btn',type:'button','aria-label':'Previous month',text:'‹',onclick:function(){move(-1)}}),el('div',null,el('h3',{text:new Date(year,month,1).toLocaleDateString(undefined,{month:'long'})}),el('span',{text:String(year)})),el('button',{class:'btn',type:'button','aria-label':'Next month',text:'›',onclick:function(){move(1)}})));
 var batch=[],cal=el('div',{class:'almanac-grid'});['S','M','T','W','T','F','S'].forEach(function(s){cal.appendChild(el('span',{class:'almanac-weekday',text:s}))});for(var n=0;n<lead;n++)cal.appendChild(el('span'));
 for(var d=1;d<=dim;d++){(function(d){var date=ym+'-'+String(d).padStart(2,'0');if(first&&date>=first&&date<=today){elapsed++;if(days[date])logged++}cal.appendChild(el('button',{class:'almanac-day',type:'button','aria-label':histNice(date)+', '+(days[date]?'logged':date===today?'today, tap to log':date<today?(first&&date>=first?'missed, tap to log':'before logging began, tap to log'):'future date, plan an outfit'),onclick:function(){profileOpenDay(date)}},profileSwatch(date,days,today,4,batch),el('span',{text:String(d)})))})(d)}profilePaintSwatches(batch,cal);box.appendChild(cal);
 var legend=el('div',{class:'almanac-legend'});[['logged','Logged'],elapsed>logged?['missed','Missed, tap to log']:null,['unlogged today','Today'],['future','Future days']].filter(Boolean).forEach(function(p){legend.appendChild(el('span',null,el('i',{class:'almanac-dot '+p[0],text:p[0]==='before-start'?'·':''}),p[1]))});box.appendChild(el('div',{class:'almanac-calendar-notes'},legend,el('footer',{class:'almanac-footer'},el('span',null,el('b',{text:elapsed?logged+' of '+elapsed+' days logged':first?'No logged days this month':'Start your month in color'}),(elapsed-logged?' · '+(elapsed-logged)+' to fill in':'')),el('button',{class:'btn small',type:'button','aria-label':'Export month as an image',title:'Save this month’s color calendar as a PNG image',onclick:function(){profileExportMonth(ym,days)}},ClosetLintIcons.imageExportIcon(),el('span',{text:'Export'})))));return box;
}
function profileExportDays(ym,days){
 var dates=Object.keys(days).filter(function(d){return d.slice(0,7)===ym}),pending=[],map=typeof byIdA==='function'?byIdA():null;
 dates.forEach(function(d){pending=pending.concat(profilePhotoPalette(days[d],map).pending)});pending=Array.from(new Set(pending));
 // A failed or stalled image must not prevent exporting the calendar.
 return new Promise(function(resolve){
  var timer=setTimeout(finish,5000),done=false;
  function finish(){if(done)return;done=true;clearTimeout(timer);var result=Object.assign({},days),map=typeof byIdA==='function'?byIdA():null;dates.forEach(function(d){result[d]=Object.assign({},days[d],profilePhotoPalette(days[d],map).row)});resolve(result)}
  Promise.all(pending.map(function(p){return p.catch(function(){})})).then(finish);
 });
}
async function profileExportMonth(ym,days){try{days=await profileExportDays(ym,days);var canvas=document.createElement('canvas');var cell=typeof document.querySelector==='function'?document.querySelector('.almanac-calendar .almanac-day'):null,dot=cell&&cell.querySelector('.almanac-dot'),cellWidth=cell?cell.getBoundingClientRect().width:0,dotWidth=dot?dot.getBoundingClientRect().width:0;
 var columnStep=134,radius=columnStep*(cellWidth>0&&dotWidth>0?Math.min(1,dotWidth/cellWidth):.8)/2,rowStep=Math.max(125,radius*2+30),firstY=240+radius,dateOffset=radius+26;
 var year=+ym.slice(0,4),month=+ym.slice(5,7)-1,weeks=Math.ceil((new Date(year,month,1).getDay()+new Date(year,month+1,0).getDate())/7),footerY=Math.max(1060,firstY+(weeks-1)*rowStep+dateOffset+50);
 canvas.width=1000;canvas.height=Math.ceil(footerY+40);var ctx=canvas.getContext('2d'),style=getComputedStyle(document.documentElement),bg=style.getPropertyValue('--bg').trim()||'#222',ink=style.getPropertyValue('--ink').trim()||'#eee';ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=ink;ctx.font='32px serif';var title=String(((state.profile||{}).wardrobeIdentity||{}).name||'My closet').replace(/[\r\n\t]+/g,' ').trim().slice(0,100)||'My closet',words=title.split(/\s+/),titleLines=[''];words.forEach(function(word){var last=titleLines.length-1,line=(titleLines[last]+' '+word).trim();if(ctx.measureText(line).width>890&&titleLines[last]&&last===0)titleLines.push(word);else titleLines[last]=line});titleLines.forEach(function(line,i){ctx.fillText(line,55,60+i*38,890)});var y=+ym.slice(0,4),m=+ym.slice(5,7)-1,lead=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate();ctx.font='24px monospace';ctx.fillText('MY MONTH IN COLOR · '+new Date(y,m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'}),55,155,890);ctx.font='20px monospace';['S','M','T','W','T','F','S'].forEach(function(s,i){ctx.fillText(s,90+i*134,215)});for(var d=1;d<=dim;d++){var date=ym+'-'+String(d).padStart(2,'0'),index=lead+d-1,x=100+(index%7)*134,cy=firstY+Math.floor(index/7)*rowStep,row=days[date],colors=profileDayColors(row);ctx.save();ctx.beginPath();ctx.arc(x,cy,radius,0,Math.PI*2);ctx.clip();ctx.fillStyle=colors.length?colors[0]:bg;ctx.fillRect(x-radius,cy-radius,radius*2,radius*2);if(colors.length===2){ctx.fillStyle=colors[1];ctx.beginPath();ctx.moveTo(x-radius,cy+radius);ctx.lineTo(x+radius,cy-radius);ctx.lineTo(x+radius,cy+radius);ctx.fill()}else if(colors.length>2){colors.forEach(function(color,i){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,cy);ctx.arc(x,cy,radius,-Math.PI/2+i*Math.PI*2/colors.length,-Math.PI/2+(i+1)*Math.PI*2/colors.length);ctx.lineTo(x,cy);ctx.fill()})}ctx.restore();ctx.strokeStyle=date===todayStr()?'#cdb0ef':ink;var beforeStart=!row&&date<todayStr()&&(!profileStartDay(days)||date<profileStartDay(days));ctx.setLineDash(!row&&!beforeStart&&date<todayStr()?[4,5]:[]);ctx.lineWidth=date===todayStr()?3:1;ctx.globalAlpha=row||date<=todayStr()?1:.25;ctx.beginPath();ctx.arc(x,cy,beforeStart?2:radius,0,Math.PI*2);if(beforeStart){ctx.globalAlpha=.3;ctx.fillStyle=ink;ctx.fill()}else ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=ink;ctx.fillText(String(d),x-10,cy+dateOffset)}ctx.setLineDash([]);ctx.font='18px monospace';ctx.fillText('Closet Lint · My almanac',55,footerY);var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/png')});if(!blob)throw Error();if(state.downloads)await state.downloads.save({filename:'my-month-in-color-'+ym+'.png',data:blob});else{var url=URL.createObjectURL(blob),a=el('a',{href:url,download:'my-month-in-color-'+ym+'.png'});a.click();setTimeout(function(){URL.revokeObjectURL(url)},10000)}}catch(e){toast('Could not save the month image. Try again.')}}
function profileCardHeader(title,label,fn){return el('header',{class:'almanac-card-head'},el('h3',{text:title}),profileButton(label,fn))}
function profileNextPlans(){
 var today=todayStr(),rows=tripHomePlans().filter(function(row){return row.start&&row.end>=today}),trip=rows.find(function(row){return row.kind==='trip'}),event=rows.find(function(row){return row.kind==='event'}),box=el('section',{class:'almanac-plans','aria-label':'Upcoming trip and scheduled outfit'});
 box.appendChild(profilePlanCard(trip,false,today));box.appendChild(profilePlanCard(event,true,today));return box;
}
function profilePlanCard(row,event,today){
 var box=el('section',{class:'almanac-card almanac-plan '+(event?'almanac-next-event':'almanac-next-trip')},profileCardHeader(event?'Next scheduled outfit':'Upcoming trip',event?'Open schedule ↗':'All trips ↗',function(){if(event)openCalendar(today.slice(0,7));else tripLeave(function(){setTab('trip')})}));
 if(!row){box.appendChild(el('p',{class:'fine',text:event?'No outfit scheduled yet.':'No upcoming trip yet.'}));box.appendChild(profileButton(event?'🎉 Plan an outfit':'🧳 Plan a trip',function(){if(event)planOutfitDialog(null,null,function(){profileRenderAlmanac()});else tripLeave(function(){state.trip=tripNew();setTab('trip')})}));return box}
 var map=byIdA(),preview=row.plan?row.doc:null,suggested=false,pins=((row.doc.plan||{}).outfits||[]),progress=tripHomeProgress(row),days=progress.days;
 if(!row.plan){var ordered=pins.filter(function(o){return o.pin}).concat(pins.filter(function(o){return !o.pin}));ordered.some(function(outfit){preview=histPlanDoc(outfit,map);if(preview){suggested=!outfit.pin;return true}return false})}
 if(preview&&!(preview.pieces||[]).some(function(p){return !!map[p.id]}))preview=null;
 function nice(date){return new Date(date+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'})}
 var difference=ClosetLintAlmanac.age(today,row.start),timing=difference<0?'Underway':difference===0?'Today':difference===1?'Tomorrow':'In '+difference+' days',dates=nice(row.start)+(row.end!==row.start?' – '+nice(row.end):'')+(!event&&days?' · '+days+' '+(days===1?'day':'days'):''),copy=el('span',{class:'almanac-trip-copy'},el('b',null,el('span',{'data-ui-emoji':'true','aria-hidden':'true',text:event?'🎉':'🧳'}),' ',el('span',{'data-user-content':'true',text:row.name})),el('small',{class:'almanac-countdown',text:timing}),el('span',{text:dates}));
 if(row.dest)copy.appendChild(el('span',{class:'fine',text:row.dest}));
 if(row.plan)copy.appendChild(el('span',{class:'fine',text:row.doc.name||'Outfit planned'}));
 else{var bar=el('span',{class:'almanac-day-bar','aria-hidden':'true'});if(days>0&&days<=31)for(var d=row.start;d<=row.end;d=ClosetLintAlmanac.shift(d,1))bar.appendChild(el('i',{class:progress.assigned[d]?'planned':''}));copy.appendChild(el('span',{class:'almanac-planned'},days<=31?bar:null,el('span',{text:progress.text})));if(suggested)copy.appendChild(el('small',{class:'fine',text:'Suggested outfit'}))}
 var route=row.plan?{type:'calendar',month:row.start.slice(0,7)}:{type:'trips',id:row.id};
 box.appendChild(routeAnchor(route,{class:'almanac-trip'},function(){if(row.plan)returnCalendarDay(row.start);else tripOpen(row.id)},[el('span',{class:'almanac-trip-thumb','aria-hidden':'true'},preview?ofMini(preview,map,true):el('span',{class:'almanac-suitcase','data-ui-emoji':'true',text:event?'🎉':'🧳'})),copy,el('span',{class:'almanac-trip-chevron','aria-hidden':'true',text:'›'})]));return box;
}
function profileOpenLove(ids){var o=labOutfitFromIds(ids,byId());if(!o){toast('Some pieces in this outfit are no longer available.');return}labInit();o.base=labBase(o);o.taste=labTaste(o);state.lab.mode='rate';state.lab.cur=o;setTab('lab')}
function profileTasteDaily(love,cards,date){
 if(!cards.length)return love?{kind:'love',love:love}:null;
 var parts=date.split('-').map(Number),day=Math.floor(Date.UTC(parts[0],parts[1]-1,parts[2])/86400000);
 if(love&&day%2===0)return {kind:'love',love:love};
 return cards[(love?Math.floor(day/2):day)%cards.length];
}
function profileOpenTaste(feature){labInit();state.lab.mode='taste';setTab('lab');labTasteExamples(feature,null)}
function profileTasteInsight(card){
 var f=card.feature,map=byId(),piece=card.kind==='piece'?map[f.slice(2)]:null,title=piece?piece.name:labFeatName(f),kind=card.kind==='positive'?'✨ What’s working for you':card.kind==='piece'?'😍 Pieces you keep loving':'🧩 Patterns in passed outfits',copy=el('span',{class:'almanac-loved-copy'},el('span',{class:'almanac-taste-kind','data-ui-emoji':'true',text:kind}),el('span',{class:'almanac-loved-title',text:title}),el('span',{class:'taste-counts',text:labRatingSummary(card.stats)}));
 if(f.indexOf('c:')===0||f.indexOf('cp:')===0){var swatches=el('span',{class:'taste-swatches'});f.slice(f.indexOf(':')+1).split('+').forEach(function(color){var dot=el('span',{class:'taste-color-dot','aria-hidden':'true'});dot.style.background=colorTagPaint(color);swatches.appendChild(el('span',{class:'taste-color'},dot,colLabel(color)))});copy.appendChild(swatches)}
 if(card.stats.n<6)copy.appendChild(el('span',{class:'fine',text:'Early pattern · '+card.stats.n+' outfits'}));
 if(card.kind==='passed')copy.appendChild(el('span',{class:'fine',text:'A pass is about the whole combination.'}));
 copy.appendChild(el('span',{class:'almanac-loved-action',text:'See rated outfits ↗'}));
 var button=el('button',{type:'button',class:'almanac-loved almanac-taste-insight'+(piece&&realPhoto(piece)?'':' text-only'),'aria-label':'See rated outfits for '+title,onclick:function(){profileOpenTaste(f)}});
 if(piece&&realPhoto(piece))button.appendChild(el('span',{class:'almanac-loved-preview','aria-hidden':'true'},el('img',{src:photoThumbnail(piece.photo),alt:'',loading:'lazy'})));
 button.appendChild(copy);return button;
}
function profileTaste(){
 var box=el('section',{class:'almanac-card almanac-taste'},profileCardHeader('My taste','Explore ↗',function(){labInit();state.lab.mode='taste';setTab('lab')})),entries=labRatingEntries(),love=entries.find(function(e){return e.record.r===1}),cards=entries.length>=8?labTasteCards(entries):[],choice=love||cards.length?profileTasteDaily(love,cards,todayStr()):null;
 box.setAttribute('data-taste-kind',choice?choice.kind:'empty');
 if(choice&&choice.kind!=='love'){box.setAttribute('data-taste-feature',choice.feature);box.appendChild(profileTasteInsight(choice))}
 else if(love){
  var map=byIdA(),mini=histPlanDoc({ids:love.record.ids},map),copy=el('span',{class:'almanac-loved-copy'},el('span',{class:'almanac-eyebrow'},el('span',{'data-ui-emoji':'true','aria-hidden':'true',text:'😍'}),' Recently loved'),el('span',{class:'almanac-loved-title',text:'This one clicked.'}),el('span',{class:'almanac-loved-action',text:'Revisit in the Lab ↗'}));
  box.appendChild(el('button',{type:'button',class:'almanac-loved','aria-label':'Open recently loved outfit',onclick:function(){profileOpenLove(love.record.ids)}},el('span',{class:'almanac-loved-preview','aria-hidden':'true'},ofMini(mini,map,true)),copy));
 }else box.appendChild(el('p',{class:'fine',text:'Rate outfits in the Lab to see what you love here.'}));
 return box;
}
function profileSkyAction(a){var p=a.id&&byIdA()[a.id];if(a.kind==='wish'){if(p&&p.wish)openEdit(p);else toast('This wish is no longer available.')}else if(a.kind==='wish-lab'){if(p&&p.wish)wrTryLab(p);else toast('This wish is no longer available.')}else if(a.kind==='piece'){if(p)commitWearAction('almanac-piece|'+p.id+'|'+todayStr(),function(){var wears=(p.wears||[]).slice();if(wears.indexOf(todayStr())<0)wears.push(todayStr());return [wearPieceChange(p,wears)]},'✓ Logged today');else toast('This piece is no longer available.')}else if(a.kind==='board'){if(p){if(!onBoard(p.id))addPiece(p);toast('Added to your board.')}else toast('This piece is no longer available.')}else if(a.kind==='color'){setTab('all');state.colors={};state.colors[a.color]=true;renderFilters();renderGrid()}else if(a.kind==='trip'){tripOpen(a.id)}else if(a.kind==='love')profileOpenLove(a.ids);else if(a.kind==='pull'){var items=(a.ids||[]).map(function(id){return byId()[id]}).filter(function(p){return p&&p.stored}),d=$('cdlg');d.textContent='';d.appendChild(el('div',{class:'dlgwide narrow'},el('h2',{text:'Pull list'}),el('pre',{class:'almanac-pull',text:storedListText(items)||'These pieces are already out of storage.'}),profileButton('View stored pieces',function(){d.close();openStoredView()}),profileButton('Close',function(){d.close()})));d.showModal()}else if(a.kind==='layers'){setTab('all');state.metas={Outerwear:true,Tops:true};state.subs={Coats:true,Jackets:true,Cardigans:true,Blazers:true};renderFilters();renderGrid()}}
function profileMoon(S){var ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('class','almanac-moon');svg.setAttribute('role','img');svg.setAttribute('aria-label',S.phase);var circle=document.createElementNS(ns,'circle');circle.setAttribute('cx','20');circle.setAttribute('cy','20');circle.setAttribute('r','18');circle.setAttribute('fill','#62666d');svg.appendChild(circle);var path=document.createElementNS(ns,'path'),points=[],wax=S.angle<180;for(var y=-18;y<=18;y+=.25){var x=Math.sqrt(Math.max(0,324-y*y)),edge=(1-2*S.lit)*x;points.push([20+(wax?x:-x),20+y])}for(var y=18;y>=-18;y-=.25){var x=Math.sqrt(Math.max(0,324-y*y)),edge=(1-2*S.lit)*x;points.push([20+(wax?edge:-edge),20+y])}path.setAttribute('d',points.map(function(p,i){return (i?'L':'M')+p[0]+','+p[1]}).join(' ')+'Z');path.setAttribute('fill','#f5ecd6');svg.appendChild(path);return svg}
function profileLocation(){var loc=(state.profile||{})['sky-location'];if(!loc||!Number.isFinite(loc.latitude)||!Number.isFinite(loc.longitude)||Math.abs(loc.latitude)>90||Math.abs(loc.longitude)>180||typeof loc.timezone!=='string')return null;try{ClosetLintAlmanac.dayAt(new Date(),loc.timezone);return loc}catch(e){return null}}
function profileSkyThumbnail(card){
 var action=(card.actions||[]).find(function(a){return (a.kind==='piece'||a.kind==='board'||a.kind==='wish'||a.kind==='wish-lab')&&a.id}),piece=action&&byIdA()[action.id];if(!piece||!realPhoto(piece))return null;
 return el('button',{class:'almanac-piece-thumb',type:'button',title:piece.name,'aria-label':'Open details for '+piece.name,onclick:function(){var current=byIdA()[piece.id];if(current)openEdit(current);else toast('This piece is no longer available.')}},el('img',{src:photoThumbnail(piece.photo),alt:piece.name,loading:'lazy',decoding:'async',style:piece.bg?'background:'+piece.bg:false}));
}
function profileColorInk(hex){
 var rgb=[1,3,5].map(function(i){var c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)}),l=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 return (l+.05)/.05>=1.05/(l+.05)?'#000000':'#FFFFFF';
}
function profilePaletteText(text){
 var host=el('span',{class:'almanac-palette-text'}),names=Object.keys(COLORS).filter(function(c){return /^#[0-9a-f]{6}$/i.test(COLORS[c])}).sort(function(a,b){return b.length-a.length}),pattern=new RegExp('\\b('+names.map(function(c){return c}).join('|')+')\\b','gi'),last=0,match;
 function appendText(value){value.split(/\s+(?=No wears logged\b)/).forEach(function(part,i){if(i)host.appendChild(el('br'));if(part)host.appendChild(el('span',{text:part}))})}
 while((match=pattern.exec(text))){if(match.index>last)appendText(text.slice(last,match.index));var color=match[0].toLowerCase(),bg=COLORS[color];host.appendChild(el('a',{class:'almanac-color-link',href:closetRouteHref({type:'closet',category:'all',color:color}),style:'background:'+colorTagPaint(color)+';color:'+profileColorInk(bg),'aria-label':'Browse '+color+' pieces',text:match[0]}));last=pattern.lastIndex}
 if(last<text.length)appendText(text.slice(last));return host;
}
function profileSkyWishlist(){
 var result={ranks:{},passed:[],lab:{}};
 if(typeof wrDoc!=='function')return result;
 var doc=wrDoc();result.passed=Object.keys(doc.pass||{}).filter(function(id){return doc.pass[id]===true});
 // Reuse the current all-items order without changing personal boosts or old rankings.
 if(doc.v===2){_wrCtx=null;wrSortAll(wrItems(false)).forEach(function(p,i){result.ranks[p.id]=i+1})}
 allItems().filter(function(p){return p.wish}).forEach(function(p){result.lab[p.id]=!!wrLabSlot(p)&&realPhoto(p)});return result;
}
function profileSkyCard(){
 var box=el('section',{class:'almanac-card almanac-sky'},profileCardHeader("Today’s almanac",'Open Sky ↗',function(){setTab('sky')})),loc=profileLocation();if(!loc){box.appendChild(profileButton('Set your city to see the sky over you',function(){openProfile('settings');$('sky-city').focus()}));return box}
 var A=ClosetLintAlmanac,day=A.dayAt(new Date(),loc.timezone),S;try{S=A.sky(Astronomy,loc,day)}catch(e){box.appendChild(el('p',{text:'The sky calculation could not load.'}));return box}
 var badges=el('div',{class:'almanac-badges','data-native-emoji':'true'}),weather=el('span',{class:'almanac-badge',title:loc.label||'Your saved location',text:'Weather loading…'});badges.appendChild(weather);badges.appendChild(el('span',{class:'almanac-badge',title:S.phase},profileMoon(S),el('span',{text:Math.round(S.lit*100)+'% lit'})));badges.appendChild(el('span',{class:'almanac-badge',title:'Sunrise',text:'🌅 '+S.sunriseText}));badges.appendChild(el('span',{class:'almanac-badge',title:'Sunset',text:'🌇 '+S.sunsetText}));box.appendChild(badges);profileWeatherBadge(weather,loc,day);
 if(state.db&&!state.pub&&!['edits','custom','outfits','outfitHistory','ratings','trips','profile','wishrank'].every(function(k){return setupLoaded[k]})){box.appendChild(el('p',{text:'Reading your closet…'}));return box}
 var history=(state.profile||{})['sky-daily']||{},data={items:allItems(),days:profileDays(),trips:state.trips,city:loc,anniversaries:A.anniversaryHistory(history),readings:A.readingHistory(history),wishlist:profileSkyWishlist(),ratings:state.ratings||{},boards:state.outfits||{},loved:labRatingEntries().filter(function(e){return e.record.r===1}).map(function(e){return {ids:e.record.ids}})},key=[day,loc.latitude,loc.longitude,loc.timezone].join('|'),saved=history[day],preview=new URLSearchParams(window.location.search).get('almanacPreview')==='1',chosen=preview?null:saved&&saved.algorithmVersion===A.version&&saved.cityKey===key?saved.card:profileSkySession[key];
 if(chosen&&(!A.validCard(chosen,data,day)||!preview&&!S.events.length&&A.repeatsRecent(chosen,history,day))){chosen=null;delete profileSkySession[key];delete profileSkySaving[key]}
 if(!chosen){
 if(preview){if(profileSkyPreviewIndex===null){var counter=0;try{counter=Number(sessionStorage.getItem('closetlint.almanac-preview.v1'))||0}catch(e){}profileSkyPreviewIndex=counter;try{sessionStorage.setItem('closetlint.almanac-preview.v1',String(counter+1))}catch(e){}}chosen=A.preview(data,S,profileSkyPreviewIndex)}
 else{chosen=A.choose(data,S,Object.fromEntries(Object.keys(history).filter(function(k){return /^\d{4}-\d{2}-\d{2}$/.test(k)}).map(function(k){return [k,history[k].card]})));profileSkySession[key]=chosen}}
 if(!preview&&state.db&&!profileSkySaving[key]&&!profileFirstRunPreview()&&(!saved||saved.algorithmVersion!==A.version||saved.cityKey!==key||saved.card!==chosen)){profileSkySaving[key]=true;var next=A.dailyHistory(history,day,key,chosen);state.db.collection('profile').doc('sky-daily').set(next).catch(function(){delete profileSkySaving[key];toast('Sky is ready for this visit; its daily reading could not be saved.')})}
 if(preview)box.appendChild(el('div',{class:'actions'},el('span',{class:'fine',text:'Preview mode · refresh for the next reading'}),profileButton('Next preview',function(){profileSkyPreviewIndex++;try{sessionStorage.setItem('closetlint.almanac-preview.v1',String(profileSkyPreviewIndex+1))}catch(e){}profileRenderAlmanac()})));
 if(chosen.eyebrow)box.appendChild(el('p',{class:'almanac-eyebrow almanac-sky-event',text:chosen.eyebrow}));var thumbnail=profileSkyThumbnail(chosen),reading=el('div',{class:'almanac-sky-reading'+(thumbnail?' has-piece':'')}),copy=el('div',{class:'almanac-sky-copy'},el('p',{class:'almanac-sky-headline'},!thumbnail&&chosen.wishlist?el('a',{href:closetRouteHref({type:'pieces',id:chosen.wishlist.id}),text:A.headline(chosen)}):A.headline(chosen)),(chosen.actions||[]).some(function(a){return a.kind==='color'})?el('p',null,profilePaletteText(chosen.body)):el('p',{text:chosen.body}));var media=thumbnail?el('div',{class:'almanac-sky-media'},thumbnail):null;if(media)reading.appendChild(media);reading.appendChild(copy);box.appendChild(reading);var source=A.readingSource(chosen);if(source)box.appendChild(el('p',{class:'fine'},el('a',{href:source.url,target:'_blank',rel:'noopener noreferrer',text:source.label+' ↗'})));var actions=el('div',{class:'actions'});(chosen.actions||[]).filter(function(a){return a.kind!=='color'&&a.kind!=='wish'}).slice(0,2).forEach(function(a){(a.kind==='wish-lab'&&media?media:actions).appendChild(profileButton((a.kind==='piece'?'📅 ':a.kind==='board'?'💡 ':a.kind==='love'?'👗 ':a.kind==='wish-lab'?ClosetLintIcons.get('E007',readDisplayPrefs().icons)+' ':'')+a.label,function(){profileSkyAction(a)}))});if(actions.children.length)box.appendChild(actions);return box;
}
function profileUnit(){return ((state.profile||{})['sky-location']||{}).unit||'F'}
function profileTemperature(f){return Math.round(profileUnit()==='C'?(f-32)*5/9:f)+'°'+profileUnit()}
async function profileFetch(path){var local=window.ClosetLintLocal,controller=new AbortController(),timer=setTimeout(function(){controller.abort()},15000);try{var r=await fetch(path,{signal:controller.signal,credentials:'same-origin',headers:local?{'X-ClosetLint-Token':local.token}:{}});if(!r.ok)throw Error('Lookup unavailable. Please retry.');return await r.json()}finally{clearTimeout(timer)}}
async function profileWeatherBadge(node,loc,day){var key=[day,loc.latitude,loc.longitude].join('|');try{if(!profileForecast[key])profileForecast[key]=profileLoadForecast(loc,day).catch(function(e){delete profileForecast[key];throw e});var w=await profileForecast[key];var code=w.code,emoji=code===0?'☀️':code<=3?'⛅':code<=48?'🌫️':code<=67?'🌧️':code<=77?'🌨️':code<=86?'🌦️':'⛈️';node.textContent=emoji+' '+profileTemperature(w.high)+(code>=45&&code<=48?' · fog':code>=51&&code<=67?' · rain':'');node.title=(loc.label||'Your saved location')+' · Today’s high · Open-Meteo'}catch(e){node.textContent='Weather unavailable';node.title=(loc.label||'Your saved location')+' · Check your connection; reopen My almanac to retry.'}}
function profileLookupCities(query,lookup){
 var term=query.trim().replace(/\s+/g,' '),short=term.split(',')[0].trim(),withoutRegion=short.replace(/\s+[A-Z]{2}$/, '');
 var attempts=Array.from(new Set(withoutRegion!==short?[withoutRegion,term,short]:[term,short])).filter(function(q){return q.length>=3});
 return (async function(){
  for(var i=0;i<attempts.length;i++){
   var result=await lookup(attempts[i]),places=(result.places||[]).filter(function(p){return Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)});
   if(places.length){if(!places.some(function(p){return p.timezone}))throw Error('Restart the local Closet Lint app to update city lookup, then try again.');return places.filter(function(p){return p.timezone})}
  }
  return [];
 })();
}
function profileMountSettings(){
 $('site-theme').value=document.documentElement.getAttribute('data-skin')||readDisplayPrefs().skin;
 var section=$('displayprefs');section.classList.add('profile-settings');section.removeAttribute('aria-labelledby');
 var form=section.querySelector('form');form.removeAttribute('method');form.addEventListener('submit',function(e){e.preventDefault()});section.querySelector('.prefs-heading').remove();section.querySelectorAll('button[aria-label="Close view options"]').forEach(function(n){n.remove()});$('profile-settings').appendChild(section);section.hidden=false;
 var city=el('input',{id:'sky-city',type:'text',maxlength:100,autocomplete:'off',placeholder:'For example, San Francisco','aria-describedby':'sky-city-help','aria-controls':'sky-city-choices'}),status=el('p',{role:'status',class:'fine profile-location-status'}),choices=el('div',{id:'sky-city-choices',class:'profile-city-choices',role:'group','aria-label':'City matches'}),loc=(state.profile||{})['sky-location']||{};
 city.value=loc.label||'';
 var unit=el('select',{id:'sky-unit',hidden:true,'aria-label':'Temperature'},el('option',{value:'F',text:'°F'}),el('option',{value:'C',text:'°C'}));unit.value=loc.unit||'F';
 var locationSaving=false,unitButtons=[],lookupTimer=0,lookupSequence=0;
 var unitToggle=el('div',{class:'form-choice form-choice-segments',role:'radiogroup','aria-labelledby':'sky-unit-label'});
 ['F','C'].forEach(function(value){var b=el('button',{type:'button',role:'radio','aria-checked':String(unit.value===value),tabindex:unit.value===value?'0':'-1',text:'°'+value,onclick:function(){unit.value=value;unitButtons.forEach(function(n){n.setAttribute('aria-checked',String(n===b));n.tabIndex=n===b?0:-1});save()}});b.addEventListener('keydown',function(e){if(['ArrowLeft','ArrowRight','Home','End'].indexOf(e.key)<0)return;e.preventDefault();var target=e.key==='Home'?unitButtons[0]:e.key==='End'?unitButtons[1]:unitButtons.find(function(n){return n!==b});target.click();target.focus()});unitButtons.push(b);unitToggle.appendChild(b)});
 async function save(place){
  if(locationSaving)return;if(!state.db){status.textContent='Location settings need a connected wardrobe.';return}
  var focusAfter=document.activeElement;++lookupSequence;clearTimeout(lookupTimer);locationSaving=true;city.disabled=true;unitButtons.forEach(function(b){b.disabled=true});choices.querySelectorAll('button').forEach(function(b){b.disabled=true});status.textContent='Saving…';
  try{var current=(state.profile||{})['sky-location']||{},next=Object.assign({},current,place||{},{unit:unit.value});await state.db.collection('profile').doc('sky-location').set(next);state.profile['sky-location']=next;city.value=next.label||city.value;status.textContent='Saved';choices.textContent='';}
  catch(e){status.textContent='Could not save. Your entry is kept; choose the city again to retry.'}
  finally{locationSaving=false;city.disabled=false;unitButtons.forEach(function(b){b.disabled=false});choices.querySelectorAll('button').forEach(function(b){b.disabled=false});search.disabled=false;if(focusAfter&&focusAfter.isConnected)focusAfter.focus();else if(place)city.focus()}
 }
 async function findCity(){
  clearTimeout(lookupTimer);var term=city.value.trim(),sequence=++lookupSequence;
  choices.textContent='';
  if(term.length<3){status.textContent=term?'Enter at least 3 characters.':'';search.disabled=false;return}
  search.disabled=true;status.textContent='Finding cities…';
  try{var found=await profileLookupCities(term,tripLookupPlaces);if(sequence!==lookupSequence||city.value.trim()!==term)return;
   status.textContent=found.length?'Choose your city:':'No city found. Try just the city name.';
   found.forEach(function(place){choices.appendChild(profileButton(place.label,function(){save(place)}))});
  }catch(e){if(sequence===lookupSequence)status.textContent=e.message||'City lookup is unavailable. Try again.'}
  finally{if(sequence===lookupSequence)search.disabled=false}
 }
 var search=profileButton('Find city',findCity);
 choices.addEventListener('keydown',function(e){var buttons=Array.from(choices.querySelectorAll('button')),index=buttons.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();++lookupSequence;clearTimeout(lookupTimer);choices.textContent='';search.disabled=false;city.focus()}else if(['ArrowDown','ArrowUp','Home','End'].indexOf(e.key)>=0&&buttons.length){e.preventDefault();index=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[index].focus()}});
 city.addEventListener('input',function(){++lookupSequence;clearTimeout(lookupTimer);choices.textContent='';status.textContent='';search.disabled=false;if(city.value.trim().length>=3)lookupTimer=setTimeout(findCity,350)});
 city.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();findCity()}else if(e.key==='ArrowDown'&&choices.firstChild){e.preventDefault();choices.firstChild.focus()}else if(e.key==='Escape'){++lookupSequence;clearTimeout(lookupTimer);choices.textContent='';search.disabled=false}});
 var box=el('fieldset',{class:'prefs-section profile-location'},el('legend',{text:'Where I am'}),
  el('div',{class:'profile-city-field settings-row'},el('div',{class:'settings-copy'},el('label',{for:'sky-city',text:'My city'}),el('p',{id:'sky-city-help',class:'fine',text:'My almanac uses it for weather, sunset, and the moon.'})),el('div',{class:'profile-city-controls'},el('div',{class:'profile-city-row'},city,search),status,choices)),
  el('div',{class:'profile-temperature settings-row'},el('span',{id:'sky-unit-label',text:'Temperature'}),unit,unitToggle));
 form.insertBefore(box,form.querySelector('.prefs-reset'));$('profile-sizes').appendChild($('size-reference-settings'));form.querySelectorAll('select[data-form-choice]').forEach(function(select){var parent=select.parentNode;parent.appendChild(formChoiceControl(select,select.getAttribute('data-form-choice')))});profileSettingsMounted=true;
}

function profileMeasurementCard(){
 var list=Object.keys(state.measurements||{}).map(function(id){return Object.assign({id:id},state.measurements[id])}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')}),box=el('section',{class:'almanac-card profile-measurements'});
 var units=el('select',{'aria-label':'Measurement units',onchange:function(){setUnits(units.value==='met');profileRenderFit();var current=$('profile-sizes').querySelector('.profile-measurements [aria-checked=true]');if(current)current.focus({preventScroll:true})}},el('option',{value:'imp',text:'in / lb'}),el('option',{value:'met',text:'cm / kg'}));units.value=unitsMetric()?'met':'imp';
 box.appendChild(el('header',{class:'almanac-card-head'},el('h3',{text:'Measurements'}),profileButton('+ New entry',openMeasurementEntry)));
 box.appendChild(el('div',{class:'measurement-page-units'},el('span',{text:'Units'}),formChoiceControl(units)));
 if(!list.length){box.appendChild(el('p',{text:'No entries yet. Record only what you want to track.'}));return box}
 box.appendChild(el('p',{class:'fine',text:'Your most recent saved value for each measurement. Dates show when you last recorded it.'}));
 var groups=[{name:'Height',fields:[['height','Height']]}].concat(measurementGroups()),latest=el('div',{class:'measurement-summary'});
 groups.forEach(function(group){var available=group.fields.filter(function(f){return measurementLast(list,f[0])});if(!available.length)return;
  var section=el('section',{class:'measurement-summary-group'},el('h4',{text:group.name})),tiles=el('dl',{class:'measurement-summary-fields'});
  available.forEach(function(f){var record=measurementLast(list,f[0]);tiles.appendChild(el('div',null,el('dt',{text:f[1]}),el('dd',null,el('strong',{text:measurementValue(f[0],record[f[0]])}),el('span',{class:'measurement-last',text:record.date}))))});section.appendChild(tiles);latest.appendChild(section)
 });box.appendChild(latest);
 var history=el('details',{class:'measurement-history'},el('summary',{text:'History · '+list.length+' '+(list.length===1?'entry':'entries')}));
 list.forEach(function(record){var entered=[['height','Height']].concat(measurementGroups().flatMap(function(g){return g.fields})).filter(function(f){return record[f[0]]!=null&&record[f[0]]!==''}),entry=el('details',{class:'measurement-history-entry'},el('summary',null,el('strong',{text:record.date}),el('span',{class:'fine',text:entered.length+' '+(entered.length===1?'measurement':'measurements')}))),values=el('dl',{class:'measurement-history-values'});
  entered.forEach(function(f){values.appendChild(el('div',null,el('dt',{text:f[1]}),el('dd',{text:measurementValue(f[0],record[f[0]])})))});
  entry.append(values,el('button',{class:'linkbtn measurement-delete',type:'button',text:'Delete entry','aria-label':'Delete measurement entry from '+record.date,onclick:function(){askConfirm('Delete the '+record.date+' entry?','Delete entry',function(){state.db.collection('measurements').doc(record.id).delete().catch(function(){toast('Could not delete the entry. Try again.')})})}}));history.appendChild(entry)
 });box.appendChild(history);return box;
}

function profileRenderFit(){
 var host=$('profile-sizes'),sizeReference=$('size-reference-settings'),expanded={},active=document.activeElement,focusGroup=active&&active.closest('.profile-size-group'),focusKey=focusGroup&&focusGroup.getAttribute('data-size-key'),focusValue=active&&active.getAttribute('data-size-value');host.querySelectorAll('.profile-size-group').forEach(function(g){if(g.querySelector('.profile-size-more.expanded'))expanded[g.getAttribute('data-size-key')]=true});host.textContent='';var sizes=el('section',{class:'almanac-card'},el('h3',{text:'Sizes I wear'}),el('p',{class:'fine',text:'Fits me shows pieces in these sizes.'}),el('p',{class:'fine',text:'One-pieces match either list. When a piece has a Fits like size, that counts instead of its label.'})),W=(state.profile||{}).wear||{},sel={tops:(W.tops||W.clothing||[]).slice(),bottoms:(W.bottoms||W.clothing||[]).slice(),shoe:(W.shoe||[]).slice(),bra:(W.bra||[]).slice(),ring:(W.ring||[]).slice()},status=el('p',{role:'status',class:'fine'}),busy=false;
 function row(key,label,values){var wrap=el('div',{class:'profile-size-group','data-size-key':key},el('h4',{text:label})),chips=el('div',{class:'chips'}),more=el('div',{class:'profile-size-more'+(expanded[key]?' expanded':'')},el('button',{class:'linkbtn',type:'button','aria-expanded':String(!!expanded[key]),text:expanded[key]?'Less':'More…',onclick:function(e){var open=more.classList.toggle('expanded');e.currentTarget.setAttribute('aria-expanded',String(open));e.currentTarget.textContent=open?'Less':'More…'}})),extra=el('div',{class:'chips'});values.forEach(function(v,i){var b=chip(v,sel[key].indexOf(v)>=0,async function(){if(busy||!state.db)return;busy=true;var next={tops:sel.tops.slice(),bottoms:sel.bottoms.slice(),shoe:sel.shoe.slice(),bra:sel.bra.slice(),ring:sel.ring.slice()},index=next[key].indexOf(v);if(index>=0)next[key].splice(index,1);else next[key].push(v);status.textContent='Saving…';try{await state.db.collection('profile').doc('wear').set(next);sel=next;b.setAttribute('aria-pressed',String(index<0));status.textContent='Saved'}catch(e){status.textContent='Could not save sizes. Try again.'}finally{busy=false}});b.setAttribute('data-size-value',v);if(i>=10){b.classList.add('profile-size-extra');extra.appendChild(b)}else chips.appendChild(b)});wrap.appendChild(chips);if(extra.childNodes.length){more.appendChild(extra);wrap.appendChild(more)}return wrap}
 var clothing=CLOTHING_ORDER.slice();allItems().forEach(function(p){var size=effSize(p);if(deriveKind(p.meta,p.sub,p.sizeKind)==='clothing'&&size&&clothing.indexOf(size)<0)clothing.push(size)});sel.tops.concat(sel.bottoms).forEach(function(s){if(clothing.indexOf(s)<0)clothing.push(s)});sizes.appendChild(row('tops','Tops, dresses & outerwear',clothing));sizes.appendChild(row('bottoms','Bottoms',clothing));sizes.appendChild(row('ring','Rings',sizeChoices('ring').filter(function(v){return /^\d+(\.\d+)?$/.test(v)})));['shoe','bra'].forEach(function(key){var values=Array.from(new Set(sel[key].concat(allItems().filter(function(p){return key==='shoe'?deriveKind(p.meta,p.sub,p.sizeKind)==='shoe':/^\d{2,3}[A-HJ]{1,3}$/i.test(effSize(p))}).map(effSize).filter(Boolean))));if(values.length)sizes.appendChild(row(key,key==='shoe'?'Shoes':'Bras',values))});sizes.appendChild(status);host.appendChild(sizes);if(sizeReference)host.appendChild(sizeReference);
 host.appendChild(profileMeasurementCard());if(focusKey&&focusValue!=null){var group=Array.from(host.querySelectorAll('.profile-size-group')).find(function(g){return g.getAttribute('data-size-key')===focusKey}),target=group&&Array.from(group.querySelectorAll('[data-size-value]')).find(function(b){return b.getAttribute('data-size-value')===focusValue});if(target)target.focus({preventScroll:true})}
}
var profileLastDay=todayStr();
function profileDayRefresh(){var today=todayStr(),loc=profileLocation(),key=today+(loc&&loc.timezone?ClosetLintAlmanac.dayAt(new Date(),loc.timezone):'');if(profileLastDay===key)return;profileLastDay=key;profileBadge();if(state.tab==='profile'&&(state.profileTab||'almanac')==='almanac')profileRenderAlmanac()}
setInterval(function(){if(document.visibilityState==='visible')profileDayRefresh()},60000);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')profileDayRefresh()});
function profileLogPieces(date,preview){
 if(needDb()||date>todayStr())return;var d=$('cdlg'),selected={},saving=false,items=allItems().filter(function(p){return !p.wish&&!p.hidden}),grid=el('div',{class:'profile-log-pieces'}),status=el('p',{class:'fine',role:'status'}),query=el('input',{type:'search','aria-label':'Search pieces to log',placeholder:'Search pieces',class:'search',oninput:draw}),save=profileButton('Log selected pieces',async function(){if(saving)return;var ids=Object.keys(selected).filter(function(id){return selected[id]});if(!ids.length){status.textContent='Choose at least one piece.';return}if(ids.some(function(id){return !byId()[id]})){status.textContent='Some selected pieces changed. Reopen this picker to review them.';return}saving=true;save.disabled=true;query.disabled=true;var ok=preview?await profilePreviewWear(date,ids):await commitWearAction('almanac|'+date+'|'+ids.sort().join(','),function(){return ids.map(function(id){var p=byId()[id],wears=(p.wears||[]).slice();if(wears.indexOf(date)<0)wears.push(date);return wearPieceChange(p,wears)})},'✓ Logged '+date);saving=false;save.disabled=false;query.disabled=false;if(ok)histDay(date,preview);else status.textContent='Could not confirm the save. Keep this dialog open and retry.'},true);
 function draw(){grid.textContent='';var q=query.value.toLowerCase(),matches=items.filter(function(p){return !q||p.name.toLowerCase().indexOf(q)>=0}).slice(0,100);matches.forEach(function(p){var input=el('input',{type:'checkbox',checked:!!selected[p.id],onchange:function(){if(saving){input.checked=!!selected[p.id];return}selected[p.id]=input.checked;status.textContent=Object.keys(selected).filter(function(id){return selected[id]}).length+' selected'}});grid.appendChild(el('label',null,input,el('img',{src:photoThumbnail(p.photo),alt:'',loading:'lazy'}),el('span',{text:p.name})))});if(!matches.length)grid.appendChild(el('p',{text:'No matching pieces.'}))}
 d.textContent='';d.appendChild(el('div',{class:'dlgwide narrow profile-log-view'},el('header',{class:'histday-heading'},el('div',null,el('h2',{text:'Log pieces'}),el('p',{class:'fine profile-log-date',text:histNice(date)})),el('button',{class:'card-more',type:'button','aria-label':'Close piece picker',text:'×',onclick:function(){if(!saving&&guard)guard.close()}})),el('p',{class:'fine profile-log-help',text:'Choose the pieces you wore on this day.'}),query,grid,status,el('footer',{class:'actions profile-log-footer'},profileButton('Back',function(){if(!saving&&(!guard||guard.close()))histDay(date,preview)}),save)));draw();if(!d.open)d.showModal();
 var guard=guardClosetDialog(d,function(){return JSON.stringify(selected)},function(){return saving});
}

async function profileLoadForecast(loc,day){
 if(window.ClosetLintLocal)return profileFetch('/api/sky-weather?latitude='+loc.latitude+'&longitude='+loc.longitude+'&date='+day);
 var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},15000);
 try{var response=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+loc.latitude+'&longitude='+loc.longitude+'&daily=temperature_2m_max,weather_code&temperature_unit=fahrenheit&timezone=auto&start_date='+day+'&end_date='+day,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error();var data=await response.json(),daily=data.daily||{},high=(daily.temperature_2m_max||[])[0],code=(daily.weather_code||[])[0];if((daily.time||[])[0]!==day||!Number.isFinite(high)||!Number.isInteger(code))throw Error();return {high:high,code:code,date:day}}finally{clearTimeout(timer)}
}
