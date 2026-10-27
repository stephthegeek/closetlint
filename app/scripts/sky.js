/* Closet Lint sky scoring. Pure data in, explanations out; no storage or network. */
(function(root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../content/sky/scoring.json'));
  else root.ClosetLintSky = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function(defaultConfig) {
  'use strict';
  var DAY = 86400000;
  var ACCESSORIES = ['Footwear', 'Legwear', 'Hats', 'Bags', 'Hair accessories', 'Glasses', 'Other accessories', 'Jewelry'];
  function norm(v) { return String(v == null ? '' : v).normalize('NFKC').trim().toLowerCase(); }
  function tags(v) { return Array.from(new Set((Array.isArray(v) ? v : typeof v === 'string' ? [v] : []).map(norm).filter(Boolean))); }
  function dateNumber(v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    var n = Date.parse(v + 'T00:00:00Z');
    return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === v ? n : null;
  }
  function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function hasWord(text, word) {
    var escape = norm(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^\\p{L}\\p{N}])' + escape + '(?=$|[^\\p{L}\\p{N}])', 'u').test(norm(text));
  }
  function typeSignals(p) {
    var out = new Set(), meta = norm(p.meta), sub = norm(p.sub), kind = norm(p.kind);
    var names = {'tees':'tee', 'tanks':'tank', 'shirts':'shirt', 'blouses & fashion tops':'blouse',
      'sweaters':'sweater', 'sweatshirts':'sweatshirt', 'blazers':'blazer', 'bralettes':'bralette',
      'skirts':'skirt', 'pants':'pants', 'leggings':'leggings', 'jeans':'jeans', 'shorts':'shorts',
      'dresses':'dress', 'jumpsuits & rompers':'jumpsuit', 'bodysuits':'bodysuit', 'coats':'coat',
      'jackets':'jacket', 'boots':'boots', 'flats':'flats', 'heels':'heels', 'sneakers':'sneakers',
      'sandals':'sandals', 'tights':'tights', 'gloves':'gloves', 'slips & crinolines':'slip', 'leg warmers':'leg warmers'};
    var base = names[sub];
    if (base) out.add(base);
    if (meta === 'tops') out.add('top');
    if (meta === 'hats') out.add('hat');
    if (sub === 'pants') out.add('trousers');
    if (kind === 'cardigan' || sub === 'cardigans') out.add('cardigan');
    if (kind === 'vest') { out.add('vest'); if (sub === 'sweaters') out.add('sweater vest'); }
    if (kind === 'loafer') out.add('loafers');
    if (kind === 'ballet') out.add('ballet flats');
    if (base && p.length) out.add(norm(p.length) + ' ' + base);
    tags(p.material).forEach(function(v) { if (base) out.add(v + ' ' + base); if (meta === 'tops') out.add(v + ' top'); });
    tags(p.fits).forEach(function(v) { if (base) out.add(v + ' ' + base); if (meta === 'tops') out.add(v + ' top'); });
    tags(p.pattern).forEach(function(v) { if (base) out.add(v + ' ' + base); if (meta === 'tops') out.add(v + ' top'); });
    if (tags(p.fits).indexOf('flared') >= 0 && ['pants', 'jeans', 'leggings'].indexOf(base) >= 0) out.add('flares');
    if (tags(p.neckline).indexOf('halter') >= 0 && meta === 'tops') out.add('halter top');
    if (tags(p.details).indexOf('pleated') >= 0 && base === 'skirt') out.add('pleated skirt');
    if (tags(p.details).indexOf('button-front') >= 0 && base === 'shirt') out.add('button-up');
    if (norm(p.length) === 'crop' && meta === 'tops') out.add('crop top');
    return out;
  }
  function bonus(p, c) {
    var b = {}, pt = tags(p.pattern), dt = tags(p.details), col = tags(p.colors), types = typeSignals(p);
    if (col.length >= 4 && col.indexOf('multicolor') < 0) col.push('multicolor');
    b.patterns = tags(c.patterns).filter(function(v) { return pt.indexOf(v) >= 0; }).length * .05;
    b.details = tags(c.details).filter(function(v) { return dt.indexOf(v) >= 0; }).length * .05;
    b.types = tags(c.types).filter(function(v) { return types.has(v); }).length * .04;
    b.colors = tags(c.colors).reduce(function(n, v) { return n + (col.indexOf(v) >= 0 ? (v === 'black' || v === 'white' ? .01 : .03) : 0); }, 0);
    b.statement = tags(c.statement).indexOf(norm(p.statement)) >= 0 ? .03 : 0;
    b.keywords = tags(c.keywords).filter(function(v) { return hasWord(p.name || p.title, v); }).length * .03;
    b.occasion = tags(c.occasion).filter(function(v) { return tags(p.styles).indexOf(v) >= 0; }).length * .03;
    b.fit = tags(c.fit).filter(function(v) { return tags(p.fits).indexOf(v) >= 0; }).length * .02;
    return {total: Math.min(.4, Object.values(b).reduce(function(a, v) { return a + v; }, 0)), signals:b};
  }
  function lovedIds(ratings) {
    var out = new Set();
    Object.values(ratings || {}).forEach(function(r) {
      if (!r || r.r !== 1) return;
      (Array.isArray(r.ids) ? r.ids : []).forEach(function(id) { out.add(id); });
      ['slip','tights','socks','shoes','hair','glasses','jewelry'].map(function(k) { return (r.acc || {})[k]; }).forEach(function(v) {
        (Array.isArray(v) ? v : [v]).forEach(function(id) { if (typeof id === 'string') out.add(id); else if (id && typeof id.id === 'string') out.add(id.id); });
      });
    });
    return out;
  }

  function cueTools(config) {
const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const arr=v=>Array.isArray(v)?v:[];
const has=(s,p)=>(' '+norm(s)+' ').includes(' '+norm(p)+' ');
const families=config.motifs;
function features(p){
 const text=[p.name,p.title,...arr(p.pattern)].join(' '),fit=arr(p.fits).map(norm),details=arr(p.details).map(norm);
 const shapes=[];
 if((['pants','jeans','leggings'].includes(norm(p.sub))&&fit.includes('flared'))||['flare pants','flare leg pants','flared pants','bell bottom','bell bottoms','bell bottom pants'].some(x=>has(text,x)))shapes.push('flares');
 if(['bell sleeve','bell sleeves'].some(x=>has(text,x)))shapes.push('bell-sleeves');
 if((norm(p.sub)==='skirts'&&details.includes('pleated'))||has(text,'pleated skirt'))shapes.push('pleated-skirt');
 if(['waistcoat','sweater vest'].some(x=>has(text,x))||(norm(p.kind)==='vest'&&norm(p.sub)==='sweaters'))shapes.push('waistcoat');
 return {motifs:families.filter(f=>f.words.some(w=>has(text,w))).map(f=>f.id),shapes};
}
const shapePairs=config.silhouettePairs;
function prepare(active){
 const info=new Map(active.map(r=>[r.p.id,features(r.p)])),motifMatches=new Map(),shapeMatches=new Map();
 for(const f of families)for(const star of f.stars){
  const ids=new Set(active.filter(r=>r.stars.includes(star)&&info.get(r.p.id).motifs.includes(f.id)).map(r=>r.p.id));
  if(ids.size>=config.repeatPieces)motifMatches.set(f.id+':'+star,ids);
 }
 for(const pair of shapePairs)for(const star of pair.stars){
  const rows=active.filter(r=>r.stars.includes(star));
  const ids=new Set(rows.filter(r=>info.get(r.p.id).shapes.some(x=>pair.parts.includes(x))).map(r=>r.p.id));
  if(ids.size>=config.repeatPieces&&pair.parts.every(part=>rows.some(r=>info.get(r.p.id).shapes.includes(part))))shapeMatches.set(pair.id+':'+star,ids);
 }
 return {info,motifMatches,shapeMatches};
}
function rates(row,star,key,context,mode='all'){
 const enabled=k=>mode==='all'||mode===k;
 const eyewear=row.p.meta==='Glasses'&&row.p.sub==='Glasses'&&config.eyewearStars.includes(star)?(config.eyewearRates[row.p.statement]??config.eyewearRates.unset):0;
 const motifNames=enabled('motifs')?[...context.motifMatches].filter(([k,ids])=>k.endsWith(':'+star)&&ids.has(row.p.id)).map(([k])=>k.split(':')[0]):[];
 const shapeNames=enabled('silhouettes')?[...context.shapeMatches].filter(([k,ids])=>k.endsWith(':'+star)&&ids.has(row.p.id)).map(([k])=>k.split(':')[0]):[];
 const isAcc=['Footwear','Legwear','Hats','Bags','Hair accessories','Glasses','Other accessories','Jewelry'].includes(row.p.meta)||(row.p.meta==='Costumes'&&['Wigs','Accessories'].includes(row.p.sub));
 const accessory=enabled('accessories')&&key==='rising'&&isAcc&&row.events>0?(config.accessoryRates[row.p.statement]||0):0;
 const total=Math.min(config.totalCap,Math.max(eyewear,accessory)+(motifNames.length?config.motifRate:0)+(shapeNames.length?config.silhouetteRate:0));
 return {total,eyewear,accessory,motifs:motifNames,silhouettes:shapeNames};
}

return {features,prepare,rates};
}
  function harmonic(values) {
    return !values.length || values.some(v=>v<=0) ? 0 : values.length / values.reduce((n,v)=>n+1/v,0);
  }
  function phraseNorm(v) { return String(v??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim(); }
  function phrase(text, term) { return (' '+phraseNorm(text)+' ').includes(' '+phraseNorm(term)+' '); }
  function evidence(p,c) {
    const text=phraseNorm((p.name||'')+' '+(p.title||''));
    const structured={motif:tags(p.pattern).map(phraseNorm),detail:tags(p.details).map(phraseNorm),texture:tags(p.material).map(phraseNorm),shape:[...typeSignals(p)].map(phraseNorm),palette:tags(p.colors).map(phraseNorm),historical:[]};
    const out={},seen=new Set();
    for(const family of ['shape','texture','detail','palette','historical','motif'])for(const raw of (c.signals||{})[family]||[]){
      const term=phraseNorm(raw);if(seen.has(term))continue;
      if(c.id==='geek-chic'&&term==='pencil'&&phrase(text,'pencil skirt'))continue;
      if(c.id==='geek-chic'&&term==='science'&&phrase(text,'science of chic'))continue;
      const lexical=term==='lace'?text.replace(/\blace up\b/g,''):text;
      if(structured[family].includes(term)||phrase(lexical,term)){(out[family]??=[]).push(term);seen.add(term);}
    }
    if(out.texture?.includes('lace')&&out.detail?.includes('lace trim')){
      out.detail=out.detail.filter(x=>x!=='lace trim');if(!out.detail.length)delete out.detail;
    }
    return out;
  }
  function pieceContext(row,c,sig) {
    const g=c.guards||{};
    if(g.pieceAll?.some(x=>!row.stars.includes(x)))return false;
    if(g.pieceAny?.length&&!g.pieceAny.some(x=>row.stars.includes(x)))return false;
    if(g.evidenceAny?.length&&!g.evidenceAny.some(x=>sig[x]?.length))return false;
    switch(g.context){
      case 'scandi': return !!(sig.shape?.length||(row.stars.includes('cozy')&&sig.texture?.length));
      case 'trad': return !!(sig.historical?.length||Object.keys(sig).length>=2);
      case 'pastel': return !!(sig.palette?.length&&(row.stars.includes('gothic')||(sig.motif||[]).some(x=>['skull','bat','skeleton','occult'].includes(x))));
      case 'cyber': return !!(sig.historical?.some(x=>['cyber','cybergoth','rave'].includes(x))||(sig.palette?.length&&sig.texture?.some(x=>['vinyl','pvc','reflective'].includes(x))));
      default: return true;
    }
  }
  function validateCatalog(stars,constellations) {
    const ids=new Set(),cs=new Set();
    stars.forEach(s=>{if(!s?.id||ids.has(s.id))throw new Error('Duplicate or invalid sky star');ids.add(s.id);});
    constellations.forEach(c=>{
      if(!c?.id||cs.has(c.id)||!Array.isArray(c.stars)||!c.stars.length||new Set(c.stars).size!==c.stars.length||c.stars.some(id=>!ids.has(id)))throw new Error('Invalid constellation: '+c?.id);
      if(c.core&&(!c.pending&&!c.core.length||[...c.core,...c.support||[],...c.guards?.pieceAll||[],...c.guards?.pieceAny||[]].some(id=>!ids.has(id))))throw new Error('Invalid essential/supporting star: '+c.id);
      cs.add(c.id);
    });
  }
  function chooseSign(reading,owned,key,config) {
    const stars=reading.stars.filter(s=>s.votes>0),lead=stars[0],winner=reading.constellations.find(c=>c.id===reading.winner);
    const message=(key,name)=>config.messages[key].replace('{name}',name);
    if(winner){
      const emerging=winner.pieceCount<config.emerging.constellationPieces;
      return {name:winner.name,id:winner.id,kind:'constellation',basis:key,emerging,pieceCount:winner.pieceCount,influences:[],note:emerging?message('early',winner.name):null,contributors:winner.contributors};
    }
    if(lead){
      const emerging=!reading.ready||lead.pieceCount<config.emerging.broadPieces;
      return {name:lead.tag,id:lead.id,kind:'broad-style',basis:key,emerging,pieceCount:lead.pieceCount,influences:stars.slice(1,3).map(s=>s.tag),note:emerging?message('early',lead.tag):config.messages.broad,contributors:lead.contributors};
    }
    const own=owned.stars.find(s=>s.votes>0),ownWinner=owned.constellations.find(c=>c.id===owned.winner);
    if(key!=='sun'&&own){
      const name=ownWinner?.name||own.tag;
      return {name,id:ownWinner?.id||own.id,kind:'wardrobe-estimate',basis:'sun',emerging:true,pieceCount:ownWinner?.pieceCount||own.pieceCount,influences:[],note:message(key+'Estimate',name),contributors:ownWinner?.contributors||own.contributors};
    }
    return {name:'Uncharted',id:null,kind:'empty',basis:null,emerging:true,pieceCount:0,influences:[],note:config.messages.empty,contributors:[]};
  }
  function score(items,ratings,catalog,date) {
    const config=catalog.scoring||defaultConfig;
    if(!config?.version)throw new Error('Provide a versioned sky scoring configuration');
    const day=dateNumber(date);if(day===null)throw new Error('Provide a valid scoring date: YYYY-MM-DD');
    const {stars,constellations}=catalog;validateCatalog(stars,constellations);
    const love=lovedIds(ratings),unknown=new Set(),excluded={hidden:0,removed:0,everydayBasic:0,noSkyTags:0},ids=new Set(),rows=[];
    for(const p of items){
      if(!p||typeof p.id!=='string'||ids.has(p.id))throw new Error('Pieces need unique string IDs');ids.add(p.id);
      if(p.removed){excluded.removed++;continue;}if(p.hidden||p.gone){excluded.hidden++;continue;}if(p.functional===true){excluded.everydayBasic++;continue;}
      const looks=tags(p.looks),occasions=tags(p.styles);
      const matches=stars.filter(s=>(s.source?.field==='Occasion'?occasions:looks).includes(norm(s.source?.value||s.tag))).map(s=>s.id);
      looks.forEach(v=>{if(!stars.some(s=>s.source?.field!=='Occasion'&&norm(s.source?.value||s.tag)===v))unknown.add(v);});
      if(!matches.length){excluded.noSkyTags++;continue;}
      const dates=[...new Set(Array.isArray(p.wears)?p.wears:[])].map(dateNumber).filter(n=>n!==null&&n<=day&&day-n<config.wearWindowDays*DAY);
      const wears=dates.reduce((n,d)=>n+2**(-(day-d)/DAY/config.wearHalfLifeDays),0);
      const factor=ACCESSORIES.includes(p.meta)||p.meta==='Costumes'&&['Accessories','Wigs'].includes(p.sub)?config.accessoryWeight:1;
      rows.push({p,stars:matches,events:dates.length,weights:{sun:p.wish?0:factor,moon:factor*((p.fav?config.moonWeights.favorite:0)+(p.wish?config.moonWeights.wishlist:0)+(love.has(p.id)?config.moonWeights.lovedOutfit:0)),rising:p.wish?0:factor*wears}});
    }
    rows.sort((a,b)=>compare(a.p.id,b.p.id));
    const readings={},cue=cueTools(config.cues);
    for(const key of ['sun','moon','rising']){
      const active=rows.filter(r=>r.weights[key]>0),events=active.reduce((n,r)=>n+r.events,0),count=key==='rising'?events:active.length,minimum=config.minimums[key],ready=count>=minimum;
      const raw=new Map(stars.map(s=>[s.id,0])),extra=new Map(stars.map(s=>[s.id,0])),explanations=new Map(stars.map(s=>[s.id,[]])),context=cue.prepare(active);
      for(const r of active)for(const id of r.stars){
        const base=r.weights[key]/r.stars.length,detail=cue.rates(r,id,key,context);
        raw.set(id,raw.get(id)+base);extra.set(id,extra.get(id)+base*detail.total);
        explanations.get(id).push({id:r.p.id,name:r.p.name||r.p.title||r.p.id,baseVotes:base,extraVotes:base*detail.total,contribution:base*(1+detail.total),cues:detail});
      }
      const total=[...raw.values()].reduce((a,b)=>a+b,0),own=readings.sun?.stars||[],ownTotal=own.reduce((n,s)=>n+s.rawVotes,0);
      const adjusted=new Map([...raw].map(([id,v])=>{
        const share=total?v/total:0,owned=ownTotal?own.find(s=>s.id===id).rawVotes/ownTotal:0;
        const factor=config.contrast.enabled&&key!=='sun'&&share+owned?1+config.contrast.maximumAdjustment*(share-owned)/(share+owned):1;
        return [id,(v+extra.get(id))*factor];
      }));
      const max=Math.max(0,...adjusted.values()),strength=id=>max?adjusted.get(id)/max:0;
      const scoredStars=stars.map(s=>({id:s.id,tag:s.tag,house:s.house,sky:s.sky,rawVotes:raw.get(s.id),cueVotes:extra.get(s.id),votes:adjusted.get(s.id),strength:strength(s.id),magnitude:6-7*strength(s.id),pieceCount:explanations.get(s.id).length,contributors:explanations.get(s.id).sort((a,b)=>b.contribution-a.contribution||compare(a.id,b.id))})).sort((a,b)=>b.votes-a.votes||compare(a.id,b.id));
      const scored=constellations.map(c=>{
        const core=c.core||c.stars,support=c.support||[],missing=core.filter(id=>!raw.get(id));
        const coreComplete=c.anyCore?core.some(id=>raw.get(id)>0):missing.length===0;
        const coreStrength=c.anyCore?Math.max(0,...core.map(strength)):harmonic(core.map(strength));
        const contributors=[],families=new Set();let anchorWeight=0,qualifyingWeight=0;
        for(const r of active){
          if(!r.stars.some(id=>core.includes(id)))continue;
          if(c.guards?.anchorAll?.some(id=>!r.stars.includes(id)))continue;
          anchorWeight+=r.weights[key];
          if(c.signals){
            const sig=evidence(r.p,c),fam=Object.keys(sig);
            if(!fam.some(f=>f!=='palette')||!pieceContext(r,c,sig))continue;
            fam.forEach(f=>families.add(f));qualifyingWeight+=r.weights[key];
            contributors.push({id:r.p.id,name:r.p.name||r.p.title||r.p.id,weight:r.weights[key],contribution:r.weights[key],evidence:sig,familyCount:fam.length,stars:r.stars.slice()});
          }else{
            // Small custom catalogs can omit signature definitions; use harmonic star balance.
            const v=r.weights[key]*r.stars.filter(id=>core.includes(id)).length/r.stars.length,b=bonus(r.p,c);
            contributors.push({id:r.p.id,name:r.p.name||r.p.title||r.p.id,votes:v,bonus:b.total,signals:b.signals,contribution:v*(1+b.total)});
          }
        }
        const corroborated=contributors.filter(p=>p.familyCount>=2).length;
        let reason=c.pending||(!coreComplete?'Missing essential aesthetic support':null);
        if(c.signals&&!reason){
          if(contributors.length<config.signature.minimumPieces)reason='Fewer than '+config.signature.minimumPieces+' anchor-linked signature pieces';
          else if(families.size<config.signature.minimumFamilies||corroborated<config.signature.minimumCorroboratedPieces)reason='Insufficient independent signature evidence';
          else if(c.guards?.collectionEvidenceAny?.length&&!c.guards.collectionEvidenceAny.some(f=>families.has(f)))reason='Missing characteristic shape or period evidence';
          else if(c.guards?.collectionEvidenceAll?.some(f=>!families.has(f)))reason='Missing corroborated signature combination';
        }
        const coverage=anchorWeight?qualifyingWeight/anchorWeight:0;
        const weight=contributors.reduce((n,p)=>n+(p.votes||0),0);
        const boost=c.signals?Math.min(config.supportCap,support.reduce((n,id)=>n+strength(id),0)/Math.max(1,support.length)*config.supportCap):weight?contributors.reduce((n,p)=>n+p.votes*p.bonus,0)/weight:0;
        const base=c.signals?harmonic([coreStrength,coverage]):coreStrength,brightness=base*(1+boost),complete=!reason;
        contributors.sort((a,b)=>(b.familyCount||0)-(a.familyCount||0)||b.contribution-a.contribution||compare(a.id,b.id));
        return {id:c.id,name:c.name,house:c.house,stars:c.stars.slice(),core:core.slice(),support:support.slice(),missingStars:missing,complete,eligible:complete,reason:reason||'Qualified',base,coreStrength,coverage,boost,brightness,pieceCount:contributors.length,corroboratedPieces:corroborated,evidenceFamilies:[...families].sort(),contributors};
      }).sort((a,b)=>b.brightness-a.brightness||compare(a.id,b.id));
      scored.forEach((c,i)=>{c.rank=i+1;});
      const winner=ready?scored.find(c=>c.complete):null;
      readings[key]={ready,minimum,qualifyingCount:count,pieceCount:active.length,wearEvents:events,winner:winner?.id||null,stars:scoredStars,constellations:scored};
    }
    for(const key of ['sun','moon','rising'])readings[key].sign=chooseSign(readings[key],readings.sun,key,config);
    return {version:2,scoringVersion:config.version,method:config.method,date,inputPieces:items.length,eligiblePieces:rows.length,excluded,unmappedAesthetics:[...unknown].sort(),readings};
  }
  return {score,bonus,typeSignals,dateNumber,harmonic,evidence};
});
