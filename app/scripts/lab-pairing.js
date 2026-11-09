/* Explicit, reversible pairing preferences. A negative rating never creates a rule. */
var ClosetLintPairing=(function(){
  var heights=['ankle','crew','knee high','thigh high'];
  function text(x){return typeof x==='string'&&x.trim().length>0&&x.length<=120}
  function height(p){
    if(heights.indexOf(p.sockType)>=0)return p.sockType;
    var n=p.name||'';return /thigh|over.?the.?knee/i.test(n)?'thigh high':/knee/i.test(n)?'knee high':/crew|calf/i.test(n)?'crew':/ankle|no.?show/i.test(n)?'ankle':'';
  }
  function valid(d){
    return !!d&&typeof d==='object'&&!Array.isArray(d)&&text(d.meta)&&text(d.sub)&&Object.keys(d).every(function(k){return ['meta','sub','kind','sockType','titleCue'].indexOf(k)>=0})&&
      (d.kind===undefined||text(d.kind))&&(d.sockType===undefined||(d.meta==='Legwear'&&d.sub==='Socks'&&heights.indexOf(d.sockType)>=0))&&(d.titleCue===undefined||(d.meta==='Bottoms'&&d.sub==='Leggings'&&d.titleCue==='jeggings'));
  }
  function options(p){
    if(!p||!text(p.meta)||!text(p.sub))return [];
    var broad={meta:p.meta,sub:p.sub},detail=Object.assign({},broad);
    if(text(p.kind))detail.kind=p.kind;
    if(p.meta==='Legwear'&&p.sub==='Socks'&&height(p))detail.sockType=height(p);
    if(p.meta==='Bottoms'&&p.sub==='Leggings'&&/\bjeggings?\b/i.test(p.name||''))detail.titleCue='jeggings';
    return JSON.stringify(broad)===JSON.stringify(detail)?[broad]:[detail,broad];
  }
  function match(p,d){
    return valid(d)&&p&&p.meta===d.meta&&p.sub===d.sub&&(d.kind===undefined||p.kind===d.kind)&&(d.sockType===undefined||height(p)===d.sockType)&&(d.titleCue===undefined||/\bjeggings?\b/i.test(p.name||''));
  }
  function label(d){return (d.meta==='Glasses'?'Eyewear':d.meta)+' / '+d.sub+(d.kind?' · '+d.kind:'')+(d.sockType?' · '+d.sockType:'')+(d.titleCue?' · title mentions jeggings':'')}
  function isRule(r){return !!r&&r.kind==='similar'&&r.rule&&r.rule.version===1&&valid(r.rule.left)&&valid(r.rule.right)}
  function signature(r){if(!isRule(r))return '';function part(d){return ['meta','sub','kind','sockType','titleCue'].map(function(k){return d[k]||''})}return JSON.stringify([part(r.rule.left),part(r.rule.right)].sort(function(a,b){return JSON.stringify(a).localeCompare(JSON.stringify(b))}))}
  function hits(a,b,r){return isRule(r)&&a.id!==b.id&&((match(a,r.rule.left)&&match(b,r.rule.right))||(match(b,r.rule.left)&&match(a,r.rule.right)))}
  function key(a,b){return a.id<b.id?a.id+'+'+b.id:b.id+'+'+a.id}
  function blocked(a,b,blocks,similar){
    if(!a||!b||a.id===b.id)return false;blocks=blocks||{};
    if(blocks[key(a,b)]&&!isRule(blocks[key(a,b)]))return true;
    return !!similar&&Object.keys(blocks).some(function(k){return hits(a,b,blocks[k])});
  }
  return {options:options,valid:valid,match:match,label:label,isRule:isRule,signature:signature,hits:hits,blocked:blocked};
})();
// Keep exact exclusions. Experimental garment rules remain readable, but are inactive.
function labPairBlocked(a,b){return ClosetLintPairing.blocked(a,b,state.blocks,false)}
function labPairingDialog(o){
  if(needDb())return;
  var d=$('dlg'),busy=false,guard,parts=labParts(o).concat(labAccParts(o)).filter(function(p,i,a){return a.findIndex(function(x){return x.id===p.id})===i}),pairs=[];
  function show(box){d.textContent='';d.appendChild(box);addClose(d);if(!guard)guard=guardClosetDialog(d,function(){return ''},function(){return busy});if(!d.open)d.showModal()}
  function choose(pair){
    var A=pair[0],B=pair[1],key=labKey(A,B),previous=state.blocks[key],record={a:A.id,b:B.id,t:Date.now()};
    function save(){
      if(busy)return;busy=true;
      var box=el('div',{class:'dlgwide narrow pairing-editor'},el('h2',{text:'Avoid this pair'}),el('p',{text:A.name+' + '+B.name}),el('p',{role:'status',text:'Saving this pair…'}));show(box);d.querySelectorAll('button').forEach(function(n){n.disabled=true});
      return state.db.collection('blocks').doc(key).set(record).then(function(){
        state.blocks[key]=record;busy=false;guard.close();
        labPush(o,function(){if(JSON.stringify(state.blocks[key])!==JSON.stringify(record))return Promise.reject(new Error('This preference changed. Review it in My taste.'));return (previous?state.db.collection('blocks').doc(key).set(previous):state.db.collection('blocks').doc(key).delete()).then(function(){if(previous)state.blocks[key]=previous;else delete state.blocks[key];delete state.lab.seen[o.sig]})});
        state.lab.seen[o.sig]=1;state.lab.cur=null;toast('These two pieces will not be paired. You can allow them again in My taste.');labRender();
      }).catch(function(e){busy=false;var box=el('div',{class:'dlgwide narrow pairing-editor'},el('h2',{text:'Could not save this pair'}),el('p',{role:'alert',text:String(e&&e.message||e)}),el('div',{class:'dlgactions'},el('button',{class:'btn',type:'button',text:'Cancel',onclick:function(){guard.close()}}),el('button',{class:'btn primary',type:'button',text:'Try again',onclick:save})));show(box)});
    }return save();
  }
  for(var i=0;i<parts.length;i++)for(var j=i+1;j<parts.length;j++)pairs.push([parts[i],parts[j]]);
  if(!pairs.length){toast('Add another piece before marking a pair that does not work.');return}
  if(pairs.length===1)return choose(pairs[0]);
  var box=el('div',{class:'dlgwide narrow pairing-editor'},el('h2',{text:'Which pieces do not work together?'}),el('p',{text:'Choose a pair to avoid. Other pieces and colors are unaffected.'}));
  pairs.forEach(function(pair){box.appendChild(el('button',{class:'labpickrow',type:'button',text:pair[0].name+' + '+pair[1].name,onclick:function(){choose(pair)}}))});show(box);
}
