/* Comfort quizzes 2.0.1. Explicit answers only; no inferred ratings or silent migrations. */
var ClosetLintComfortLegacy=ClosetLintComfort;
var ClosetLintComfort=(function(){
 'use strict';
 var topics=ClosetLintQuizCatalog,questions=topics.flatMap(function(t){return t.questions}),labels=['Hard no','Nah','Not really','Neutral','Like','Love','Obsessed'],words=['Nope!','Nah','Not really','Meh','Like','Love','Obsessed!'];
 if(typeof COLORS!=='undefined'){var rack=questions.find(function(q){return q.id==='colorlimits'});rack.items=Object.keys(COLORS).filter(function(k){return !['gold','silver','clear','multicolor'].includes(k)}).map(function(k){return rack.items.find(function(it){return it.id===k})||{id:k,label:k.charAt(0).toUpperCase()+k.slice(1),code:'r'+k.replace(/[^a-z]/gi,'')}});rack.options=rack.items.map(function(it){return [it.id,it.label]})}
 function question(id){return questions.find(function(q){return q.id===id})}
 function key(topic){return 'comfort-v2-'+topic}
 function empty(){return {version:2,rounds:{},stars:[],finished:false}}
 function doc(profile,topic){var d=(profile||{})[key(topic)];return d&&d.version===2&&d.rounds&&typeof d.rounds==='object'&&Array.isArray(d.stars)?d:empty()}
 function round(d,id){return d.rounds[id]||{items:{}}}
 function dependencies(q,id){if(q.id==='heels'||q.id==='feet-pairs'&&id==='1')return 'heel';if(q.id==='jewelry-pairs'&&id==='3')return 'earrings';if(q.id==='jewelry-pairs'&&['1','5'].includes(id))return 'necklacelength';if(q.id==='layering-pairs'&&id==='2')return 'skirtlength';return null}
 function item(d,q,id){var r=round(d,q.id),dep=dependencies(q,id);if(dep&&round(d,dep).none)return {value:'!',auto:dep};
  if(r.none&&(q.id!=='heel'||id!=='0'))return {value:'!',auto:q.id};
  if(q.id==='heel'&&r.ladder!==undefined&&+id>+r.ladder)return {value:-3,auto:'ladder'};
  var it=(r.items||{})[id];if(!it)return null;if(it.skip===true)return {skip:true};
  var v=it.value,valid=q.type==='pair'?['L','R','B','N'].includes(v):['rate','rack','body'].includes(q.type)?Number.isInteger(v)&&v>=-3&&v<=3&&(q.type!=='rack'||v<0)&&(q.type!=='body'||[-1,-3].includes(v)):false;
  return valid?{value:q.type==='body'?-1:v}:null;
 }
 function status(d,q){var r=round(d,q.id);if(r.skip)return {complete:true,answered:false};if(['one','any','body','rack'].includes(q.type)){
   var valid=q.type==='one'?q.items.some(function(it){return it.id===r.choice}):q.type==='any'?Array.isArray(r.selected)&&r.selected.every(function(id){return q.items.some(function(it){return it.id===id})}):!!r.done;
   return {complete:valid,answered:valid};
  }
  var a=q.items.map(function(it){return item(d,q,it.id)});return {complete:a.every(Boolean),answered:a.some(function(it){return it&&!it.skip&&!it.auto||it&&it.value==='!'})};
 }
 function read(profile,id){var q=question(id);if(!q)return null;var d=doc(profile,q.topic),s=status(d,q);if(!s.complete)return null;return {version:2,status:s.answered?'answered':'skipped',value:round(d,id)}}
 function progress(profile,t){var d=doc(profile,t.id),ss=t.questions.map(function(q){return status(d,q)});return {started:Object.keys(d.rounds).length>0,total:ss.length,reviewed:ss.filter(function(s){return s.complete}).length,answered:ss.filter(function(s){return s.answered}).length,finished:d.finished&&ss.every(function(s){return s.complete})}}
 function clone(d){return JSON.parse(JSON.stringify(d))}
 function apply(d,q,action,id,value){if(['rate','skip','clear'].includes(action)&&!q.items.some(function(it){return it.id===id}))throw Error('Unknown quiz card');if(action==='rate'&&(q.type==='pair'?!['L','R','B','N'].includes(value):!Number.isInteger(value)||value < -3||value > 3||q.type==='body'&&![-1,-3].includes(value)||q.type==='rack'&&value>=0))throw Error('Invalid quiz rating');d=clone(d);d.finished=false;var r=d.rounds[q.id]||(d.rounds[q.id]={items:{}});r.items=r.items||{};
  if(action==='none'){
   r.none=value;delete r.skip;delete r.ladder;
   q.items.forEach(function(it){if(q.id!=='heel'||it.id!=='0')delete r.items[it.id]});
   questions.filter(function(x){return x.topic===q.topic}).forEach(function(x){x.items.forEach(function(it){if(dependencies(x,it.id)===q.id){var other=d.rounds[x.id];if(other){delete (other.items||{})[it.id];delete other.skip}}})});
  }else if(action==='skip-round'){
   q.items.forEach(function(it){if(!item(d,q,it.id))r.items[it.id]={skip:true}});if(['one','any','rack','body'].includes(q.type)){delete r.choice;delete r.selected;delete r.done;r.skip=true}
  }else if(action==='choice'){r.choice=value;delete r.skip}
  else if(action==='any'){r.selected=value;delete r.skip}
  else if(action==='done'){r.done=true;delete r.skip}
  else{
   var prior=item(d,q,id);if(prior&&prior.auto){if(prior.auto==='ladder')delete r.ladder;else{d=apply(d,question(prior.auto),'none',null,false);r=d.rounds[q.id]||(d.rounds[q.id]={items:{}})}}
   delete r.skip;if(q.id==='heel'&&r.ladder===id)delete r.ladder;
   if(action==='clear'){delete r.items[id];delete r.done}else r.items[id]=action==='skip'?{skip:true}:{value:value};
   if(action==='rate'&&q.id==='heel'&&value===-3)r.ladder=id;
  }
  d.stars=d.stars.filter(function(ref){var parts=ref.split('/'),qr=question(parts[0]),v=qr&&item(d,qr,parts[1]);return v&&v.value>=2});
  return d;
 }
 function extremes(d,t){var yes=[],no=[];t.questions.filter(function(q){return ['rate','rack','body'].includes(q.type)}).forEach(function(q){q.items.forEach(function(it){var a=item(d,q,it.id);if(!a||a.skip||typeof a.value!=='number'||a.auto==='ladder')return;var row={q:q,item:it,value:a.value,ref:q.id+'/'+it.id};if(a.value>=2)yes.push(row);if(a.value===-3)no.push(row)})});return {yes:yes,no:no}}
 function star(d,t,ref){var next=clone(d),at=next.stars.indexOf(ref);if(at>=0)next.stars.splice(at,1);else if(next.stars.length<3&&extremes(d,t).yes.some(function(x){return x.ref===ref}))next.stars.push(ref);return next}
 function mark(v){return typeof v==='number'?(v<0?'✖️':v>0?'💜':'●'):v==='!'?'!':v||'—'}
 function sign(v){return v>0?'+'.repeat(v):v<0?'-'.repeat(-v):''}
 function heelLine(d,metric){var q=question('heel'),r=round(d,'heel');if(r.none)return "Heels: I don’t wear heels.";var happy=[],stretch=[],no=[];q.items.forEach(function(it){var a=item(d,q,it.id);if(a&&typeof a.value==='number'){if(a.value>0)happy.push(+it.id);if([0,-1].includes(a.value))stretch.push(+it.id);if(a.value===-3)no.push(+it.id)}});function height(n){return metric?(n*2.5)+' cm':n+' in'}return 'Heels: '+[happy.length?'happy up to '+height(Math.max(...happy)):null,stretch.length?'a stretch at '+height(Math.max(...stretch)):null,no.length?'nope from '+height(Math.min(...no))+' up':null].filter(Boolean).join(', ')+'.'}
 function code(d,t,metric){var parts=[];t.questions.forEach(function(q){var r=round(d,q.id),s=status(d,q);if(r.skip)return;
  if(r.none){parts.push({heel:'h!',earrings:'e!',necklacelength:'n!',skirtlength:'s!'}[q.id]);return}
  if(q.id==='heel'){var heights=q.items.map(function(it){return {n:+it.id,a:item(d,q,it.id)}}),happy=heights.filter(function(x){return x.a&&x.a.value>0}),stretch=heights.filter(function(x){return x.a&&[0,-1].includes(x.a.value)}),h=happy.length?Math.max(...happy.map(function(x){return x.n})):null,z=stretch.length?Math.max(...stretch.map(function(x){return x.n})):null;if(h!==null)parts.push('h'+(metric?h*2.5:h)+(z!==null?'>'+(metric?z*2.5:z):'')+(metric?'cm':''))}
  if(q.type==='pair'){var vs=q.items.map(function(it){var a=item(d,q,it.id);return a&&!a.skip&&a.value!=='!'?a.value:'_'}).join('');if(/[LRBN]/.test(vs))parts.push('vs:'+vs);return}
  if(q.type==='one'){var it=q.items.find(function(it){return it.id===r.choice});if(it)parts.push(it.code);return}
  if(q.type==='any'){q.items.filter(function(it){return (r.selected||[]).includes(it.id)}).forEach(function(it){parts.push(it.code)});return}
  if(q.type==='body'&&r.done&&!Object.keys(r.items||{}).length){parts.push('n0');return}
  q.items.forEach(function(it){var a=item(d,q,it.id);if(!a||a.skip||a.value==='!')return;parts.push(it.code+sign(a.value)+(d.stars.includes(q.id+'/'+it.id)?'*':''))});
 });return parts.length?t.code+' '+parts.join(' '):''}
 function fullCode(profile,metric){var sections=topics.filter(function(t){return progress(profile,t).finished}).map(function(t){return code(doc(profile,t.id),t,metric)}).filter(Boolean);return sections.length?'-----BEGIN CLOSET CODE BLOCK-----\nVersion: 1.0\n'+sections.join('\n')+'\n------END CLOSET CODE BLOCK------':''}
 function label(q,r){if(!r||r.status==='skipped')return '(skipped)';var v=r.value;if(v.none)return q.noneLabel;if(q.type==='one')return (q.items.find(function(it){return it.id===v.choice})||{}).label||'(unanswered)';if(q.type==='any')return q.items.filter(function(it){return (v.selected||[]).includes(it.id)}).map(function(it){return it.label}).join(', ')||'None';return q.items.map(function(it){var a=(v.items||{})[it.id];return a?(a.skip?'(skipped)':q.type==='pair'?a.value:mark(a.value))+' '+(it.label||it.left.label+' / '+it.right.label):null}).filter(Boolean).join(' · ')}
 function tradeoffs(profile){var out={};topics.forEach(function(t){var d=doc(profile,t.id);t.questions.filter(function(q){return q.type==='pair'}).forEach(function(q){q.items.forEach(function(it){var a=item(d,q,it.id);if(a&&['L','R'].includes(a.value)){var xs=out[it.trade]||(out[it.trade]=[]);xs.push(it.leftDirection*(a.value==='L'?1:-1))}})})});Object.keys(out).forEach(function(k){out[k]=out[k].reduce(function(a,b){return a+b},0)/out[k].length});return out}
 return {topics:topics,questions:questions,question:question,key:key,empty:empty,doc:doc,round:round,item:item,status:status,read:read,progress:progress,apply:apply,extremes:extremes,star:star,labels:labels,words:words,mark:mark,sign:sign,heelLine:heelLine,code:code,fullCode:fullCode,label:label,tradeoffs:tradeoffs,version:'2.0.1'};
})();
