#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sky = require('../app/scripts/sky.js');
const root = path.join(__dirname, '..');

// Reuse the app's exact tag migration and piece merge, without booting its UI.
function itemsFromSnapshot(snapshot) {
  const source = fs.readFileSync(path.join(root, 'app/closet-lint.html'), 'utf8');
  const collections = snapshot.collections || {};
  const context = {
    CATALOG:snapshot.base.catalog, TAGS:snapshot.base.tags,
    state:{custom:collections.custom || {}, edits:collections.edits || {}, profile:collections.profile || {}},
    MULTI_KEYS:['colors','seasons','styles','looks','fits','stretch','neckline','pattern','material','details','lens','eartags','shoefeat','jfeat','jmetal'],
    PHOTOS:{}, PLACEHOLDER:'', BLANK:'', _archLast:[], _photoViews:{},
    phFix:p => p, glType:v => v // Only the unused photo and glasses-size display paths are omitted.
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('var OLD_LOOK='), source.indexOf('function allItems(){')), context);
  vm.runInContext(source.slice(source.indexOf('function allItemsBuild(){'), source.indexOf('/* everything a text search')), context);
  const items = context.allItemsBuild();
  return JSON.parse(JSON.stringify(items.concat(context._archLast)));
}

function escape(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function render(result) {
  const readings = result.readings;
  const labels = {sun:'Sun · what you own', moon:'Moon · what you want', rising:'Rising · what you wear'};
  const cards = Object.keys(labels).map(key => {
    const r = readings[key], sign = r.sign;
    const candidates = r.constellations.filter(c=>c.complete).concat(r.constellations.filter(c=>!c.complete)).slice(0,15);
    const detail = p => p.evidence ? Object.entries(p.evidence).map(([k,v])=>k+': '+v.join(', ')).join('; ') : p.cues ? [p.cues.motifs?.length ? 'repeated motifs: '+p.cues.motifs.join(', ') : '', p.cues.silhouettes?.length ? 'related silhouettes: '+p.cues.silhouettes.join(', ') : '', p.cues.eyewear ? 'glasses cue' : '', p.cues.accessory>p.cues.eyewear ? 'worn statement accessory' : ''].filter(Boolean).join('; ') : '';
    const contributors = sign.contributors || [];
    return `<section><p class="kicker">${labels[key]}</p><h2>${escape(sign.name)}${sign.emerging && sign.kind!=='empty' ? ' <small>· emerging</small>' : ''}</h2>${sign.note ? `<p>${escape(sign.note)}</p>` : ''}${sign.influences.length ? `<p>With ${escape(sign.influences.join(' and '))} influences.</p>` : ''}<p class="small">${r.qualifyingCount} ${key==='rising'?'piece/date wear events':'qualifying pieces'}.${sign.kind==='wardrobe-estimate'?' This estimate uses the owned wardrobe.':''}</p>${contributors.length ? `<p>Contributing pieces</p><ol>${contributors.slice(0,5).map(p=>`<li>${escape(p.name)}</li>`).join('')}</ol><details><summary>All ${contributors.length} contributing pieces</summary><ul>${contributors.map(p=>`<li>${escape(p.name)}${detail(p)?' — '+escape(detail(p)):''}</li>`).join('')}</ul></details>` : ''}<details><summary>Constellation rankings and evidence</summary><p class="small">Eligible candidates first. Scores are overlapping affinities, not percentages or confidence probabilities.</p><table><thead><tr><th>Constellation</th><th>Score</th><th>Evidence</th></tr></thead><tbody>${candidates.map(c=>`<tr><td>${escape(c.name)}</td><td>${c.brightness.toFixed(3)}</td><td>${escape(c.reason)}</td></tr>`).join('')}</tbody></table></details><details><summary>Stars and supporting cues</summary>${r.stars.filter(s=>s.votes>0).slice(0,12).map(s=>`<details><summary>${escape(s.tag)} · ${s.votes.toFixed(2)} votes · ${s.pieceCount} pieces</summary><p>${s.rawVotes.toFixed(2)} base votes, plus ${s.cueVotes.toFixed(3)} from cues.</p><ul>${s.contributors.map(p=>`<li>${escape(p.name)}${detail(p)?' — '+escape(detail(p)):''}</li>`).join('')}</ul></details>`).join('')}</details></section>`;
  }).join('');
  const maps = Object.keys(labels).map(key => {
    const r = readings[key], winner = r.constellations.find(c => c.id === r.winner);
    const points = new Map(r.stars.map(s => [s.id, [50 + s.sky.x * 1100, 45 + s.sky.y * 650]]));
    const lines = winner ? `<polyline points="${winner.stars.map(id => points.get(id).join(',')).join(' ')}" fill="none" stroke="#c8b7e7" stroke-width="2"/>` : '';
    return `<figure><figcaption>${labels[key]}${r.sign.emerging ? ' · still gathering' : ''}</figcaption><svg viewBox="0 0 1280 760" role="img" aria-label="${labels[key]}: ${escape(r.sign.name)}">${lines}${r.stars.map(s => { const [x,y] = points.get(s.id), radius = 2 + s.strength * 8; return `<g opacity="${s.votes ? .35 + .65 * s.strength : .16}"><circle cx="${x}" cy="${y}" r="${radius}" fill="#ecdfb9"/><text x="${x + radius + 5}" y="${y + 4}" fill="#eee9de" font-size="14">${escape(s.tag)}</text></g>`; }).join('')}</svg></figure>`;
  }).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Your sky · scoring checkpoint</title><style>body{background:#161d19;color:#eee9de;font:16px/1.6 system-ui,sans-serif;margin:0;padding:clamp(18px,4vw,56px)}main{max-width:1500px;margin:auto}h1,h2{color:#c8b7e7;line-height:1.2}h1{font-size:2.5rem}.intro{max-width:850px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}section,figure{border:1px solid #515d50;border-radius:14px;padding:22px;background:#202a23}section h2{font-size:1.8rem}.kicker{color:#b8d6bc}.small,summary{color:#c7cbbb}details{margin-top:20px}summary{cursor:pointer}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:8px 4px;border-bottom:1px solid #515d50}figure{margin:24px 0}svg{width:100%;height:auto}figcaption{color:#c8b7e7}li{margin-bottom:6px}@media(max-width:1000px){.cards{grid-template-columns:1fr}svg text{font-size:18px}}</style><main><h1>Your sky</h1><p class="intro">Private scoring checkpoint · ${escape(result.date)} · formula ${escape(result.scoringVersion)}. These are your actual tags and wear records. This is an explanatory report, not the finished sky interface. Nothing was changed in your wardrobe.</p><div class="cards">${cards}</div>${maps}<p class="intro">${result.inputPieces} total records; ${result.eligiblePieces} eligible pieces across readings. Excluded: ${result.excluded.everydayBasic} Everyday basics, ${result.excluded.hidden} hidden, ${result.excluded.removed} removed, and ${result.excluded.noSkyTags} without mapped sky tags. ${result.unmappedAesthetics.length ? 'Unmapped aesthetics: ' + escape(result.unmappedAesthetics.join(', ')) + '.' : ''}</p></main></html>`;
}

if (require.main === module) {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const catalog = {stars:require('../app/content/sky/stars.json').stars, constellations:require('../app/content/sky/constellations.json').constellations, scoring:require('../app/content/sky/scoring.json')};
  const all = itemsFromSnapshot(input.snapshot), excludedIds = new Set(input.excludeIds || []);
  const items = all.filter(p => !excludedIds.has(p.id));
  const result = sky.score(items, input.snapshot.collections.ratings, catalog, input.date);
  result.omittedCollectionPieces = all.length - items.length;
  process.stdout.write(JSON.stringify({result, html:render(result)}));
}
module.exports = {itemsFromSnapshot, render};
