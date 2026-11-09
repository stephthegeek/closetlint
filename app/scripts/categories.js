/* Category visibility affects empty picker choices only. IDs remain stable for saved records and filters. */
var CATEGORY_OPTIONAL_METAS=['Costumes','Lingerie','Workwear & uniforms','Cultural & traditional garments'];
var CATEGORY_OPTIONAL_SUBS=['Bags|Bags','Other accessories|Watch bands','Activewear|Dancewear','Activewear|Leotards & unitards','Activewear|Cycling clothing','Activewear|Snow clothing','Activewear|Martial arts clothing','Underwear|Slips & crinolines','Underwear|Intimates','Underwear|Thermals','Legwear|Leg warmers','Footwear|Dance shoes','Footwear|Hiking shoes','Footwear|Work shoes','Swimwear|Wetsuits'];
var categoryUsedSource=null,categoryUsedCache=null;
var categorySettingsDraft=null,categorySettingsBusy=false,categorySettingsError='',categorySettingsFocus='',categorySettingsFocusHost='category-settings';
function categoryDefaults(meta,sub){return CATEGORY_OPTIONAL_METAS.indexOf(meta)<0&&CATEGORY_OPTIONAL_SUBS.indexOf(meta+'|'+sub)<0}
function categoryPreferences(){return state.profile&&state.profile.categoryVisibility&&state.profile.categoryVisibility.choices||{}}
function categoryUsed(items){
  var source=items||allItems(),memo=typeof _mD!=='undefined'&&_mD>0;
  if(memo&&source===categoryUsedSource)return categoryUsedCache;
  var used={};source.forEach(function(it){if(it.removed)return;used[it.meta+'|'+(it.sub||'')]=true});if(memo){categoryUsedSource=source;categoryUsedCache=used}return used;
}
function categoryVisible(meta,sub,current,showAll,used,choices){
  var key=meta+'|'+sub;used=used||categoryUsed();choices=choices||categoryPreferences();
  return !!showAll||!!used[key]||!!(current&&current.meta===meta&&current.sub===sub)||(Object.prototype.hasOwnProperty.call(choices,key)?choices[key]===true:categoryDefaults(meta,sub));
}
function categorySubs(meta,current,showAll,used){
  used=used||categoryUsed();var list=(SUBS[meta]||[]).filter(function(sub){return categoryVisible(meta,sub,current,showAll,used)});
  // Unknown legacy values stay editable, but are never offered as new vocabulary.
  if(current&&current.meta===meta&&current.sub&&list.indexOf(current.sub)<0)list.unshift(current.sub);
  return list;
}
function categoryMetas(current,showAll,used){
  used=used||categoryUsed();var list=META.filter(function(meta){return meta===(current&&current.meta)||Object.keys(used).some(function(k){return k.split('|')[0]===meta})||(SUBS[meta]||[]).some(function(sub){return categoryVisible(meta,sub,current,showAll,used)})});
  if(current&&current.meta&&list.indexOf(current.meta)<0)list.push(current.meta);return list;
}
function saveCategoryPreferences(choices){
  if(categorySettingsBusy)return Promise.resolve(false);
  var active=document.activeElement;if(active&&active.closest){var parent=active.closest('#category-settings,#setup-category-settings');if(parent){categorySettingsFocus=active.getAttribute('aria-label')||'';categorySettingsFocusHost=parent.id;}}
  categorySettingsDraft=Object.assign({},choices);categorySettingsBusy=true;categorySettingsError='';
  renderCategorySettings(true);
  return Promise.resolve().then(function(){if(!state.db)throw Error('Connect your closet before saving categories.');return state.db.collection('profile').doc('categoryVisibility').set({version:1,choices:categorySettingsDraft})}).then(function(){
    state.profile=state.profile||{};state.profile.categoryVisibility={version:1,choices:categorySettingsDraft};categorySettingsDraft=null;return true;
  }).catch(function(e){categorySettingsError='Could not save categories: '+(e&&e.message||e)+'. Your choices are kept here. Retry when ready.';return false}).finally(function(){categorySettingsBusy=false;renderCategorySettings(true);var host=$(categorySettingsFocusHost);if(host&&categorySettingsFocus){var control=Array.prototype.find.call(host.querySelectorAll('[aria-label]'),function(n){return n.getAttribute('aria-label')===categorySettingsFocus});if(control&&!control.disabled)control.focus({preventScroll:true})}categorySettingsFocus=''});
}
function renderCategorySettings(keep){
  ['category-settings','setup-category-settings'].forEach(function(id){var host=$(id);if(host)renderCategorySettingsHost(host,keep)});
  var next=$('setup-categories-continue');if(next)next.disabled=categorySettingsBusy||!!categorySettingsError;
}
function renderCategorySettingsHost(host,keep){
  var previous=host.querySelector('details.category-chooser'),search=host.querySelector('input[type="search"]'),query=keep&&search?search.value:'',expanded=[];
  if(previous)Array.prototype.forEach.call(host.querySelectorAll('details[data-category]'),function(n){if(n.open)expanded.push(n.getAttribute('data-category'))});
  else expanded=META.slice();
  var used=categoryUsed(),choices=categorySettingsDraft||categoryPreferences();
  function counts(meta){var totals={used:0,shown:0,hidden:0};(meta?[meta]:META).forEach(function(m){(SUBS[m]||[]).forEach(function(sub){if(used[m+'|'+sub])totals.used++;else if(categoryVisible(m,sub,null,false,used,choices))totals.shown++;else totals.hidden++})});return totals}
  function countText(c){return c.used+' in use · '+c.shown+' empty shown · '+c.hidden+' hidden'}
  host.textContent='';host.appendChild(el('legend',{text:'Categories to show'}));
  host.appendChild(el('p',{class:'fine',text:'Choose which empty categories appear when adding pieces. Categories in use always show.'}));
  var chooser=el('details',{class:'category-chooser'});chooser.open=previous?previous.open:host.id==='setup-category-settings';
  chooser.appendChild(el('summary',null,el('span',{text:'All categories'}),el('span',{class:'category-count',text:countText(counts())})));
  var body=el('div',{class:'category-chooser-body'}),input=el('input',{type:'search',value:query,placeholder:'Search categories','aria-label':'Search categories'}),tree=el('div',{class:'category-tree'});
  function draw(){
    tree.textContent='';var q=input.value.trim().toLowerCase(),n=0;
    META.forEach(function(meta){
      var subs=(SUBS[meta]||[]).filter(function(sub){return !q||(metaLabel(meta)+' '+sub).toLowerCase().indexOf(q)>=0});if(!subs.length)return;n++;
      var group=el('details',{class:'category-group','data-category':meta});group.open=!!q||expanded.indexOf(meta)>=0;group.appendChild(el('summary',null,el('span',{text:metaLabel(meta)}),el('span',{class:'category-count',text:countText(counts(meta))})));
      var rows=el('div',{class:'category-rows'});
      subs.forEach(function(sub){var key=meta+'|'+sub;
        if(used[key]){rows.appendChild(el('div',{class:'category-choice category-locked'},el('span',{class:'category-in-use-dot','aria-hidden':'true',text:'·'}),el('span',{text:sub}),el('span',{class:'fine category-used',text:'in use'})));return}
        var check=el('input',{type:'checkbox','aria-label':metaLabel(meta)+': '+sub,checked:categoryVisible(meta,sub,null,false,used,choices),disabled:categorySettingsBusy});
        check.addEventListener('change',function(){var next=Object.assign({},categorySettingsDraft||categoryPreferences());next[key]=check.checked;saveCategoryPreferences(next)});
        rows.appendChild(el('label',{class:'category-choice'},check,el('span',{text:sub})));
      });
      group.addEventListener('toggle',function(){if(input.value.trim())return;var i=expanded.indexOf(meta);if(group.open&&i<0)expanded.push(meta);else if(!group.open&&i>=0)expanded.splice(i,1)});group.appendChild(rows);tree.appendChild(group);
    });if(!n)tree.appendChild(el('p',{class:'fine',text:'No matching categories.'}));
  }
  function all(open){expanded=open?META.slice():[];tree.querySelectorAll('details[data-category]').forEach(function(g){g.open=open})}
  input.addEventListener('input',draw);
  body.append(el('div',{class:'category-tools'},input,el('button',{class:'linkbtn',type:'button',text:'Expand all',onclick:function(){all(true)}}),el('button',{class:'linkbtn',type:'button',text:'Collapse all',onclick:function(){all(false)}})),tree);
  var reset=el('button',{class:'linkbtn',type:'button',text:'Reset empty categories to defaults',disabled:categorySettingsBusy,onclick:function(){saveCategoryPreferences({})}});
  var retry=el('button',{class:'linkbtn',type:'button',text:'Retry',hidden:!categorySettingsError,disabled:categorySettingsBusy,onclick:function(){saveCategoryPreferences(categorySettingsDraft||{})}});
  body.append(el('div',{class:'category-settings-actions'},reset,retry),el('p',{class:'fine',role:'status',text:categorySettingsBusy?'Saving categories…':categorySettingsError||'Saved with your closet, including in backups.'}));
  chooser.appendChild(body);host.appendChild(chooser);draw();
}
