/* Opt-in choice controls. The original select remains the value/event owner. */
function formChoiceControl(select,kind){
  if(select.formChoice)return select.formChoice;
  kind=kind||'segments';
  var box=el('div',{class:'form-choice form-choice-'+kind,role:'radiogroup','aria-label':select.getAttribute('aria-label')||'Choose an option'}),buttons=[];
  select.hidden=true;box.appendChild(select);
  function refresh(){
    buttons.forEach(function(b){var on=b.value===select.value;b.setAttribute('aria-checked',String(on));b.tabIndex=on?0:-1;b.disabled=select.disabled});
    if(!buttons.some(function(b){return b.tabIndex===0})&&buttons[0])buttons[0].tabIndex=0;
  }
  function choose(b,focus){
    if(select.disabled||b.disabled)return;
    if(select.value!==b.value){select.value=b.value;select.dispatchEvent(new Event('change',{bubbles:true}))}
    refresh();if(focus&&b.isConnected)b.focus({preventScroll:true});
  }
  Array.from(select.options).forEach(function(option,i){
    var b=el('button',{type:'button',role:'radio',value:option.value,'aria-label':option.textContent,'data-choice-value':option.value,onclick:function(){choose(b,false)},onkeydown:function(e){
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].indexOf(e.key)<0)return;e.preventDefault();
      var target=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(['ArrowLeft','ArrowUp'].indexOf(e.key)>=0?-1:1)+buttons.length)%buttons.length;choose(buttons[target],true);
    }});
    if(kind==='themes')b.appendChild(el('span',{class:'form-theme-sample','aria-hidden':'true'},el('b',{text:'A'}),el('i')));
    b.appendChild(el('span',{text:option.textContent}));
    if(kind==='packs')b.appendChild(el('span',{class:'form-pack-sample','data-native-emoji':'true','aria-hidden':'true',text:['Tops','Footwear','Jewelry'].map(function(meta){return ClosetLintIcons.category(meta,option.value)}).join(' ')}));
    if(select.id==='photo-finish'&&option.value==='light')b.prepend(el('span',{class:'form-color-dot','aria-hidden':'true'}));
    buttons.push(b);box.appendChild(b);
  });
  select.addEventListener('change',refresh);box.refresh=refresh;select.formChoice=box;refresh();return box;
}
function formChoiceRefresh(){document.querySelectorAll('.form-choice').forEach(function(box){if(box.refresh)box.refresh()})}
