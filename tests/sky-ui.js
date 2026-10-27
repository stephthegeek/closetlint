'use strict';
// DOM-only interaction checks: no browser, network, personal wardrobe, or storage.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sky=require('../app/scripts/sky');
const catalog={stars:require('../app/content/sky/stars.json').stars,constellations:require('../app/content/sky/constellations.json').constellations,scoring:require('../app/content/sky/scoring.json'),shareCopy:require('../app/content/sky/share-copy.json')};
class Node {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.events={};this.parentNode=null;this.open=false;this._text='';this.className='';this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:c=>{if(!this.classList.contains(c))this.className+=' '+c},remove:c=>{this.className=this.className.split(/\s+/).filter(x=>x!==c).join(' ')},toggle:(c,v)=>{const on=v===undefined?!this.classList.contains(c):v;this.classList[on?'add':'remove'](c);return on}};}
 set textContent(v){this.children.forEach(c=>c.parentNode=null);this.children=[];this._text=String(v)}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('')}
 get firstChild(){return this.children[0]}
 get isConnected(){return this===doc.body||!!this.parentNode?.isConnected}
 appendChild(n){if(n.parentNode)n.remove();this.children.push(n);n.parentNode=this;return n}
 replaceChildren(...nodes){this.textContent='';nodes.forEach(n=>this.appendChild(n))}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.className=String(v)}
 getAttribute(k){return this.attrs[k]??null}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn)}
 click(){(this.events.click||[]).forEach(fn=>fn.call(this,{target:this,preventDefault(){}}))}
 focus(){doc.activeElement=this}
 showModal(){this.open=true}
 close(){this.open=false;(this.events.close||[]).forEach(fn=>fn.call(this))}
 querySelectorAll(selector){let found=[];for(const n of this.children){if(matches(n,selector))found.push(n);found.push(...n.querySelectorAll(selector))}return found}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 getBoundingClientRect(){return {left:500,right:1000,top:0,bottom:900}}
 getContext(){const context={font:'',fillStyle:'',strokeStyle:'',fillRect(x,y,w,h){canvasDraws.push({kind:'rect',color:this.fillStyle,x,y,w,h})},save(){},restore(){},translate(){},scale(){},setLineDash(){},beginPath(){},arc(){canvasDraws.push({kind:'arc'})},stroke(){canvasDraws.push({kind:'stroke'})},moveTo(x,y){canvasDraws.push({kind:'move',x,y})},lineTo(x,y){canvasDraws.push({kind:'line',x,y})},closePath(){},rect(){},roundRect(){},fill(){canvasDraws.push({kind:'fill'})},measureText:s=>({width:Array.from(s).length*(parseFloat((context.font.match(/([\d.]+)px/)||[])[1])||20)*.6}),fillText(text,x,y){canvasText.push(text);canvasDraws.push({kind:'text',text,x,y,color:this.fillStyle,font:this.font})}};return context}
}
function matches(n,s){if(s.startsWith('.'))return s.slice(1).split('.').every(c=>n.classList.contains(c));if(s.startsWith('#'))return n.attrs.id===s.slice(1);if(s.startsWith('[')){const m=s.match(/^\[([^=]+)="([^"]+)"\]$/);return !!m&&n.attrs[m[1]]===m[2]}return n.tagName===s.toUpperCase()}
const doc={body:null,activeElement:null,createElement:t=>new Node(t),createElementNS:(ns,t)=>new Node(t)};doc.body=new Node('body');
const $=id=>doc.body.querySelector('#'+id);
function el(tag,attrs,...children){const n=new Node(tag);for(const [k,v] of Object.entries(attrs||{})){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)n.setAttribute(k,v)}
 function add(c){if(c==null)return;if(Array.isArray(c))return c.forEach(add);if(typeof c==='string'){const t=new Node('text');t.textContent=c;c=t}n.appendChild(c)}children.forEach(add);return n}
const host=el('main',{id:'view-sky'});doc.body.appendChild(host);doc.body.appendChild(el('div',{id:'sky-filter-note'}));
let items=Array.from({length:15},(_,i)=>({id:'synthetic-'+i,name:'Synthetic velvet rose skirt '+i,meta:'Bottoms',sub:'Skirts',looks:['gothic','romantic'],fav:true,wears:['2026-10-20'],photo:'synthetic-photo'}));
const state={tab:'sky',profile:{},ratings:{},board:{name:'Working board',pieces:[{id:'synthetic-0',x:10,y:20}]}};
const boardBefore=JSON.stringify(state.board),calls=[],canvasText=[],canvasDraws=[];let allowed=true;
let activeTheme={'--bg':'#f4efdf','--ink':'#343e36','--ink2':'#647166','--line':'#b9bdae','--sel':'#68557f','--display':'sans-serif','--body':'sans-serif','--mono':'monospace'};
const context={getComputedStyle:()=>({getPropertyValue:key=>activeTheme[key]||''}),document:doc,$,el,state,SKY_CATALOG:catalog,ClosetLintSky:sky,todayStr:()=> '2026-10-20',cap:s=>s[0].toUpperCase()+s.slice(1),allItems:()=>items,byIdA:()=>Object.fromEntries(items.map(p=>[p.id,p])),piecePhotos:p=>[{src:p.photo}],navigator:{},window:{scrollTo(){}},openEdit:p=>{calls.push(['piece',p.id]);return true},setTab:t=>{if(!allowed)return false;state.tab=t;state.skyFilter=null;doc.body.querySelectorAll('dialog').forEach(d=>d.close());calls.push(['tab',t]);return true},renderGrid(){context.ClosetLintSkyUI.notice()},renderFilters(){},renderTray(){calls.push(['tray'])},URL,setTimeout};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/sky-ui.js','utf8'),context);
const ui=context.ClosetLintSkyUI;catalog.searchLinks=require('../app/content/sky/search-links.json');
const findButton=(root,text)=>root.querySelectorAll('button').find(n=>n.textContent===text||(['Sun','Moon','Rising'].includes(text)&&n.textContent.endsWith(' '+text)));
ui.render();assert.ok(host.textContent.includes('Your Style Sky'));assert.ok(host.textContent.includes('Romantic goth'));assert.equal(host.querySelectorAll('.sky-sign').length,3);
assert.equal(host.querySelectorAll('svg').length,1);assert.equal(JSON.stringify(state.board),boardBefore);
host.querySelector('[data-constellation="romantic-goth"]').click();assert.ok(doc.body.querySelector('.sky-detail').textContent.includes('Romantic goth'));findButton(doc.body.querySelector('.sky-detail'),'×').click();
host.querySelector('[data-star="retro"]').click();assert.ok(doc.body.querySelector('.sky-detail').textContent.includes('Retro'),'overview stars open the same detail tray');let away=doc.body.querySelector('.sky-detail');away.events.click[0]({target:away,clientX:20,clientY:20});assert.equal(doc.body.querySelector('.sky-detail'),null,'clicking outside the tray dismisses it');
ui.openFull();let full=doc.body.querySelector('.sky-full');assert.equal(full.open,true);assert.equal(full.querySelectorAll('[data-star="retro"]').length,1);
full.querySelector('[data-star="retro"]').click();assert.ok($('sky-readout').textContent.includes('Retro'));assert.ok(doc.body.querySelector('.sky-detail').textContent.includes('Retro'),'full-chart stars also open the tray');findButton(doc.body.querySelector('.sky-detail'),'×').click();assert.equal(full.querySelectorAll('.sky-footer-symbol').length,3);
findButton(full.querySelector('.sky-modes'),'Moon').click();assert.ok($('sky-readout').textContent.includes('moon'));
findButton(full.querySelector('.sky-modes'),'Sun').click();let constellationName=full.querySelector('[data-constellation="romantic-goth"]');assert.equal(constellationName.attrs.role,'button');constellationName.click();assert.ok(doc.body.querySelector('.sky-detail').textContent.includes('Romantic goth'));findButton(doc.body.querySelector('.sky-detail'),'×').click();let prevented=false;constellationName.events.keydown[0]({key:'Enter',preventDefault(){prevented=true}});assert.ok(prevented);assert.ok(doc.body.querySelector('.sky-detail').open);findButton(doc.body.querySelector('.sky-detail'),'×').click();
ui.openDetail('constellation','romantic-goth');let detail=doc.body.querySelector('.sky-detail');assert.ok(detail.open);assert.equal(detail.querySelectorAll('.sky-piece').length,3,'collapsed contributor list builds only the three previews');var disclosure=detail.querySelector('details');disclosure.open=true;disclosure.events.toggle[0]();assert.equal(detail.querySelectorAll('.sky-piece').length,15);disclosure.open=false;disclosure.events.toggle[0]();disclosure.open=true;disclosure.events.toggle[0]();assert.equal(detail.querySelectorAll('.sky-piece').length,15,'reopening does not duplicate contributors');assert.ok(!detail.textContent.includes('Why this match?'));assert.ok(detail.querySelectorAll('.sky-piece').every(p=>p.querySelectorAll('small').length===0),'contributing pieces show photos and names without scoring prose');
assert.ok(detail.textContent.includes('Stars in it'));assert.ok(detail.textContent.includes('Leads your Sun'));assert.equal(detail.querySelectorAll('.sky-related-links').length,1);detail.querySelector('.sky-piece').click();assert.equal(calls.at(-1)[0],'piece');assert.equal(doc.body.querySelector('.sky-detail'),null);assert.equal(doc.body.querySelector('.sky-full'),null);
ui.openDetail('star','gothic');detail=doc.body.querySelector('.sky-detail');allowed=false;findButton(detail,'Choose pieces for board').click();assert.equal(state.tab,'sky');assert.equal(state.skyTrayIds,undefined);assert.ok(detail.open,'cancelled navigation retains the detail');
allowed=true;findButton(detail,'Choose pieces for board').click();assert.equal(state.tab,'outfits');assert.equal(state.skyTrayIds.length,15);assert.equal(JSON.stringify(state.board),boardBefore,'Build filters tray without changing the board');
ui.openDetail('star','romantic');findButton(doc.body.querySelector('.sky-detail'),'Show these pieces').click();assert.equal(state.tab,'all');assert.equal(state.skyFilter.ids.length,15);assert.equal($('sky-filter-note').hidden,false);findButton($('sky-filter-note'),'Clear Sky selection').click();assert.equal(state.skyFilter,null);
// Share preview contains only signs and fixed branding, never garment names or URLs.
ui.render();findButton(host,'Share my sky').click();let share=doc.body.querySelector('.sky-share');assert.ok(share.open);assert.ok(canvasText.includes('Romantic goth'));assert.ok(canvasText.some(text=>text.includes('SUN'))&&canvasText.some(text=>text.includes('MOON')),'all three signs retain separate rows');assert.ok(canvasDraws.some(x=>x.kind==='line'),'share image plots real constellation edges');assert.ok(canvasDraws.filter(x=>x.kind==='arc').length>=3,'export retains chart rings');assert.ok(canvasText.some(text=>text.includes('Romantic goth')),'chart badge identifies the actual sign');assert.equal(ui.shareGraph(ui.model()).edges.length,1,'same constellation across readings is drawn once');assert.ok(!canvasText.some(t=>t.includes('Synthetic')));findButton(share.querySelector('.sky-modes'),'Story').click();assert.equal(share.querySelector('canvas').height,1920);findButton(share,'Close').click();
items=[];state.profile={};ui.invalidate();ui.render();assert.equal(ui.model().readings.sun.sign.name,'Uncharted');assert.equal(host.querySelectorAll('.sky-sign').length,3);ui.openFull();assert.ok(doc.body.querySelector('.sky-full').open);findButton(doc.body.querySelector('.sky-full'),'×').click();
items=[{id:'unsafe',name:'<img src=x onerror=alert(1)>',meta:'Tops',looks:['retro'],photo:'synthetic-photo'}];ui.invalidate();ui.render();findButton(host.querySelector('.sky-modes'),'Sun').click();ui.openDetail('star','retro');detail=doc.body.querySelector('.sky-detail');assert.ok(detail.textContent.includes('<img src=x'));assert.equal(detail.querySelectorAll('img').length,1,'imported names stay text, not HTML elements');findButton(detail,'×').click();
state.profile={'collection-linty-imaginary-review':{kind:'piece-collection',ids:['unsafe']}};ui.invalidate();assert.equal(ui.model().readings.sun.sign.name,'Uncharted','practice collection omitted by UI without mutating items');assert.equal(items.length,1);
console.log('Sky interface: overview/map/readout, detail and piece links, guarded browse/tray navigation, board preservation, share privacy, empty/sparse states, and hostile text pass (synthetic DOM only).');

// Presentation preserves both result type and evidence source without changing scores.
const savedReadings=JSON.stringify(ui.model().readings);
const signFixture=(kind,id,name,extra={})=>({kind,id,name,basis:'sun',emerging:false,influences:[],note:null,...extra});
assert.equal(ui.signInfo(signFixture('constellation','romantic-goth','Romantic goth')).label,'Constellation');
assert.equal(ui.signInfo(signFixture('broad-style','retro','Retro')).label,'Style star');
assert.equal(ui.signInfo(signFixture('empty',null,'Uncharted')).label,'Uncharted');
assert.equal(ui.signInfo(signFixture('wardrobe-estimate','retro','Retro')).label,'Style star · provisional estimate');
assert.equal(ui.signInfo(signFixture('broad-style','retro','Retro',{emerging:true})).source,'Early reading');
const presentationModel=ui.model();
presentationModel.readings.sun.sign=signFixture('constellation','romantic-goth','Romantic goth');
presentationModel.readings.moon.sign=signFixture('wardrobe-estimate','romantic-goth','Romantic goth',{emerging:true,note:'Heart a few pieces to reveal your Moon.'});
presentationModel.readings.rising.sign=signFixture('broad-style','retro','Retro',{basis:'rising'});
ui.render();
const signCards=host.querySelectorAll('.sky-sign');
assert(signCards[0].textContent.includes('Constellation'));
assert(signCards[1].textContent.includes('Constellation · provisional estimate'));
assert(signCards[2].textContent.includes('Style star'));
signCards[1].click();let estimateTray=doc.body.querySelector('.sky-detail');
assert(estimateTray.textContent.includes('Moon · provisional estimate based on what you own'));
findButton(estimateTray,'×').click();
ui.openFull();let labelledFull=doc.body.querySelector('.sky-full');
assert(labelledFull.querySelector('.sky-full-footer').textContent.includes('Style star'));
assert(labelledFull.querySelector('.sky-full-footer').textContent.includes('provisional estimate'));
findButton(labelledFull,'×').click();
canvasText.length=0;findButton(host,'Share my sky').click();let labelledShare=doc.body.querySelector('.sky-share');
assert(canvasText.some(text=>text.includes('CONSTELLATION')));assert(canvasText.some(text=>text.includes('STAR')));
assert(canvasText.includes('PROVISIONAL'));
assert(canvasText.join(' ').includes('Estimated from what you own'));
assert(!canvasText.includes('SUN & MOON'),'a measured sign and an estimated sign stay distinct');
canvasText.length=0;findButton(labelledShare.querySelector('.sky-modes'),'Story').click();
assert(canvasText.includes('PROVISIONAL'));assert(canvasText.join(' ').includes('Estimated from what you own'));
findButton(labelledShare,'Close').click();
Object.assign(ui.model().readings,JSON.parse(savedReadings));ui.render();
assert.equal(JSON.stringify(state.board),boardBefore);
console.log('Sky sign presentation: star/constellation, early evidence versus owned-wardrobe estimates, trays, full-map controls, and both export layouts pass.');


// The share revamp is deterministic presentation; estimates never gain chart authority.
const shareCopy=catalog.shareCopy;
assert(catalog.stars.every(s=>shareCopy.essences.stars[s.id]));
assert(catalog.constellations.every(s=>shareCopy.essences.constellations[s.id]));
const shareSign=(id,kind='constellation')=>({id,kind,name:(kind==='constellation'?catalog.constellations.find(s=>s.id===id)?.name:catalog.stars.find(s=>s.id===id)?.tag)||'Uncharted',basis:'sun',emerging:false,influences:[],note:null});
const shareFixture=(a,b,c)=>({readings:{sun:{sign:a,stars:[],constellations:[]},moon:{sign:b,stars:[],constellations:[]},rising:{sign:c,stars:[],constellations:[]}}});
const romantic=shareSign('romantic-goth'),bookish=shareSign('vintage-librarian'),witchy=shareSign('whimsigoth'),retro=shareSign('retro','broad-style');
assert.equal(ui.shareSentence(shareFixture(romantic,romantic,romantic)),'Romantic, through and through.');
assert.equal(ui.shareSentence(shareFixture(romantic,romantic,retro)),'Romantic at heart. Retro in practice.');
assert.equal(ui.shareSentence(shareFixture(bookish,witchy,witchy)),'Bookish closet. Witchy everywhere else.');
assert.equal(ui.shareSentence(shareFixture(bookish,witchy,bookish)),'Bookish in practice. Dreaming Witchy.');
assert.equal(ui.shareSentence(shareFixture(bookish,romantic,witchy)),'Bookish closet. Romantic dreams. Witchy in practice.');
assert.equal(ui.shareSentence(shareFixture(romantic,shareSign('regencycore'),retro)),'Romantic closet. Romantic dreams. Retro in practice.','equal essence words do not merge different signs');
const provisional={...retro,kind:'wardrobe-estimate',emerging:true},uncharted=shareSign(null,'empty');
const sparseShare=shareFixture(romantic,uncharted,provisional);
assert.equal(ui.shareSentence(sparseShare),'Romantic at heart. The rest is still gathering.');
assert.equal(ui.shareSentence(shareFixture(uncharted,provisional,uncharted)),'Your sky is still gathering.');
assert(!ui.shareGraph(sparseShare).groups.some(g=>g.id==='retro'));
assert.equal(ui.shareGraph(shareFixture(provisional,uncharted,uncharted)).stars.length,0);
const graphSnapshot=shareFixture(romantic,romantic,retro);graphSnapshot.readings.sun.stars=[{id:'elegant',votes:1}];const graph=ui.shareGraph(graphSnapshot);
assert.equal(graph.groups.length,2);assert.equal(graph.groups[0].keys.join(','),'sun,moon');
assert.equal(graph.edges.length,1);assert(graph.supportEdges.length>0,'nearby supports have their own dashed-edge set');
// A background definition touching the broad result is not allowed to imply a constellation.
catalog.constellations.push({id:'synthetic-crossing',core:['retro','romantic'],stars:['retro','romantic']});
graphSnapshot.readings.sun.constellations=[{id:'synthetic-crossing',complete:true}];
assert(!ui.shareGraph(graphSnapshot).backgroundEdges.some(edge=>edge.includes('retro')));
catalog.constellations.pop();
const drawingReadings=JSON.stringify(ui.model().readings),drawingProfile=state.profile;
const cases=[shareFixture(romantic,romantic,retro),shareFixture(bookish,romantic,witchy),sparseShare,shareFixture(provisional,provisional,provisional),shareFixture(uncharted,uncharted,uncharted)];
for(const fixture of cases){
 for(const key of ['sun','moon','rising'])ui.model().readings[key].sign=fixture.readings[key].sign;
 state.profile={wardrobeIdentity:{name:'The Velvet Archive',showLogo:true}};
 for(const shape of ['square','story']){
  canvasDraws.length=0;canvasText.length=0;const preview=el('canvas');const first=ui.drawShare(preview,shape);
  assert(canvasText.includes('The Velvet Archive'));assert(canvasText.includes('My Style Sky'));
  assert(!canvasText.includes('SUN & MOON'),'repeat signs keep three separate result rows');
  const footer=canvasDraws.filter(d=>d.kind==='text'&&d.text==='closetlint.com').at(-1);
  assert(footer.y<preview.height-40,'attribution stays inside the image frame');
  const chartDate=canvasDraws.find(d=>d.kind==='text'&&d.text.startsWith('CHARTED · ')),heading=canvasDraws.find(d=>d.text==='My Style Sky');assert.ok(chartDate.y-heading.y>=60,'date has breathing room below the title');
  for(const word of ['OWN','WANT','WEAR']){const d=canvasDraws.find(d=>d.text===word);assert.ok(d&&d.font.startsWith('700 '),'footer emphasis: '+word);assert.ok(footer.y-d.y>=70,'website is separated from the footer phrases')}
  for(const key of ['SUN','MOON','RISING']){const label=canvasDraws.find(d=>d.kind==='text'&&(d.text===key||d.text.startsWith(key+' · '))),name=canvasDraws.find(d=>d.kind==='text'&&d.x===label.x&&d.y>label.y);const size=Number(name.font.match(/([\d.]+)px/)[1]);assert.ok(name.y-label.y>=size+10,'sign name does not crowd its label')}

  for(const d of canvasDraws.filter(d=>d.kind==='text'))assert(d.y>=40&&d.y<preview.height-28,'text stays vertically inside safe image bounds: '+d.text);
  assert.equal(first.sentence,ui.drawShare(preview,shape).sentence,'same signs give the same interpretation');
 }
}
Object.assign(ui.model().readings,JSON.parse(drawingReadings));state.profile=drawingProfile;ui.render();
console.log('Sky share: six interpretation patterns, essence collisions, omitted estimates, actual geometry, separate sign rows, custom text identity, and Square/Story safe bounds pass.');

(async function themeExports(){
 const fonts={workshop:["'Pixelify Sans',monospace","'IBM Plex Sans',sans-serif"],fieldnotes:["'Fraunces',serif","'DM Sans',sans-serif"],editorial:["'Newsreader',serif","'DM Sans',sans-serif"]};
 for(const [skin,families] of Object.entries(fonts))for(const appearance of ['light','dark']){
  activeTheme={'--bg':appearance==='dark'?'#152025':'#faf5e8','--ink':appearance==='dark'?'#eeeeee':'#222222','--ink2':'#708080','--line':'#839080','--sel':skin==='workshop'?'#a077bb':skin==='fieldnotes'?'#556644':'#886688','--display':families[0],'--body':families[1],'--mono':"'IBM Plex Mono',monospace"};
  const loaded=[];doc.fonts={load:font=>{loaded.push(font);return Promise.resolve([])}};
  canvasDraws.length=0;findButton(host,'Share my sky').click();const d=doc.body.querySelector('.sky-share');
  assert.ok(d.querySelector('.sky-detail-actions').children.every(b=>b.disabled),'export waits for theme fonts');
  await new Promise(setImmediate);
  assert.ok(d.querySelector('.sky-detail-actions').children.every(b=>!b.disabled));
  assert.ok(loaded.some(font=>font.includes(families[0])));
  for(const layout of ['Square','Story']){
   findButton(d.querySelector('.sky-modes'),layout).click();
   const rect=canvasDraws.find(x=>x.kind==='rect');assert.equal(rect.color,activeTheme['--bg']);
   const title=canvasDraws.filter(x=>x.kind==='text'&&x.text==='Uncharted').at(-1);assert.equal(title.color,activeTheme['--ink2']);assert.ok(title.font.includes(families[0]));
   assert.ok(!canvasDraws.some(x=>x.text&&x.text.includes('onerror')),'theme exports still omit garment names');
  }
  findButton(d,'Close').click();
 }
 doc.fonts={load:()=>Promise.reject(new Error('offline'))};findButton(host,'Share my sky').click();const d=doc.body.querySelector('.sky-share');await new Promise(setImmediate);assert.ok(d.querySelector('.sky-detail-actions').children.every(b=>!b.disabled),'offline fonts do not prevent saving');findButton(d,'Close').click();
 // Async export failure, duplicate clicks, and layout changes must leave a usable sheet.
 doc.fonts=null;const savedNavigator=context.navigator,savedURL=context.URL,savedClick=Node.prototype.click,savedTimeout=context.setTimeout;
 const downloads=[];context.URL={createObjectURL:()=> 'blob:synthetic-sky',revokeObjectURL(){}};context.setTimeout=fn=>fn();
 Node.prototype.click=function(){if(this.tagName==='A')downloads.push(this.attrs.download);return savedClick.call(this)};
 context.File=class {constructor(parts,name,options){this.name=name;this.type=options.type}};
 let shareMode='unsupported',shares=0;
 context.navigator={canShare(){if(shareMode==='throw')throw Error('Unavailable');return shareMode!=='unsupported'},share(){shares++;return shareMode==='abort'?Promise.reject({name:'AbortError'}):shareMode==='reject'?Promise.reject(Error('Blocked')):Promise.resolve()}};
 findButton(host,'Share my sky').click();const sheet=doc.body.querySelector('.sky-share'),canvas=sheet.querySelector('canvas'),save=findButton(sheet,'Save image'),shareButton=findButton(sheet,'Share'),status=sheet.querySelector('.fine');
 let encode,encodes=0;canvas.toBlob=fn=>{encodes++;encode=fn};
 save.click();save.click();assert.equal(encodes,1,'pending export cannot start twice');assert(save.disabled&&shareButton.disabled);
 findButton(sheet.querySelector('.sky-modes'),'Story').click();encode({});await new Promise(setImmediate);
 assert.equal(downloads.at(-1),'closet-lint-my-sky-square.png','filename describes the encoded layout, even after switching');assert(!save.disabled);
 shareButton.click();encode(null);await new Promise(setImmediate);assert(status.textContent.includes('could not be created'),'null blobs have visible failure feedback');assert(!shareButton.disabled);
 shareButton.click();encode({});await new Promise(setImmediate);assert(status.textContent.includes('Use Save image'));assert.equal(shares,0);
 shareMode='throw';shareButton.click();encode({});await new Promise(setImmediate);assert(status.textContent.includes('Sharing did not finish'));assert(!shareButton.disabled);
 shareMode='reject';shareButton.click();encode({});await new Promise(setImmediate);assert(status.textContent.includes('Sharing did not finish'));assert(!save.disabled);
 shareMode='abort';shareButton.click();encode({});await new Promise(setImmediate);assert.equal(status.textContent,'','cancelling the native sheet is not an error');assert(!shareButton.disabled);
 canvas.toBlob=()=>{throw Error('Encoder failed')};save.click();assert(status.textContent.includes('could not be created'));assert(!save.disabled);
 findButton(sheet,'Close').click();
 findButton(host,'Share my sky').click();const closed=doc.body.querySelector('.sky-share');closed.querySelector('canvas').toBlob=fn=>{encode=fn};findButton(closed,'Save image').click();findButton(closed,'Close').click();const count=downloads.length;encode({});await new Promise(setImmediate);assert.equal(downloads.length,count,'closing cancels a pending export');
 context.navigator=savedNavigator;context.URL=savedURL;Node.prototype.click=savedClick;context.setTimeout=savedTimeout;
 console.log('Sky export recovery: duplicate taps, layout/filename consistency, encode/share errors, cancellation, and closed sheets pass.');
 console.log('Sky exports: active colors/type across three theme styles and light/dark, Square/Story consistency, font readiness, offline fallback, and privacy pass.');
})().catch(error=>{console.error(error);process.exitCode=1});

const positions=ui.layoutLabels(catalog.stars,ui.points());const allLabels=Object.values(positions);for(let i=0;i<allLabels.length;i++)for(let j=i+1;j<allLabels.length;j++){const a=allLabels[i],b=allLabels[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'chart label rectangles do not overlap')}console.log('Sky polish: overview/full star trays, outside dismissal, Style Sky copy, footer icons, real share graph, and collision-free label placement pass.');

const broadSnapshot=JSON.parse(JSON.stringify(ui.model()));for(const key of ['sun','moon','rising'])broadSnapshot.readings[key].sign={name:'Retro',kind:'broad-style',id:'retro'};assert.equal(ui.shareGraph(broadSnapshot).stars.length,1);assert.equal(ui.shareGraph(broadSnapshot).edges.length,0,'broad signs export one real star, without invented constellation edges');

// The full catalog is read-only, and every definition remains discoverable.
state.skyCatalog=true;ui.render();assert.equal(host.querySelectorAll('.sky-house-card').length,6);
assert.equal(host.querySelectorAll('.sky-catalog-row').length+host.querySelectorAll('.sky-dim-chip').length,catalog.constellations.length);
findButton(host,'← Back to your sky').click();assert.equal(state.skyCatalog,false);
ui.openDetail('constellation','romantic-goth');let searches=doc.body.querySelector('.sky-detail');findButton(searches,'black lace corset top').click();let search=doc.body.querySelector('.sky-search');assert.ok(search.open);
assert.equal(search.querySelectorAll('a').length,5);for(const link of search.querySelectorAll('a')){assert.equal(link.attrs.target,'_blank');assert.equal(link.attrs.rel,'noopener noreferrer');assert.ok(link.attrs.href.startsWith('https://'))}
findButton(search,'×').click();assert.equal(doc.body.querySelector('.sky-search'),null);
catalog.searchLinks.shops.push({label:'Unsafe fixture',url:'javascript:alert(1)'});findButton(searches,'black lace corset top').click();search=doc.body.querySelector('.sky-search');assert.equal(search.querySelectorAll('a').length,5,'non-HTTPS search templates are rejected');findButton(search,'×').click();catalog.searchLinks.shops.pop();findButton(searches,'×').click();
ui.openFull();full=doc.body.querySelector('.sky-full');assert.ok(full.querySelector('.sky-minimap'));assert.ok(full.querySelector('.sky-home-star'));assert.ok(full.querySelector('.sky-shooting-star'));assert.equal(full.querySelectorAll('.sky-footer-symbol').length,3);full.querySelector('.sky-home-star').click();assert.ok(doc.body.querySelector('.sky-detail').textContent.includes('Goblincore'));findButton(doc.body.querySelector('.sky-detail'),'×').click();findButton(full,'×').click();
assert.equal(JSON.stringify(state.board),boardBefore);console.log('Sky refresh: complete house catalog, search-link encoding/protocol safety, home star, minimap, retained footer tabs, and unchanged board pass.');


// Large contributor lists are deferred, incremental, and isolated from old detail panels.
{
 const prior=items;items=Array.from({length:120},(_,i)=>({id:'batch-'+i,name:'Batch piece '+i,meta:'Tops',looks:['gothic'],photo:'synthetic-photo'}));
 const observers=[];context.IntersectionObserver=function(callback){this.callback=callback;this.disconnect=()=>this.disconnected=true;this.observe=n=>this.target=n;observers.push(this)};
 ui.invalidate();ui.render();ui.openDetail('star','gothic');let panel=doc.body.querySelector('.sky-detail'),more=panel.querySelector('details');assert.equal(panel.querySelectorAll('.sky-piece').length,3);assert.equal(observers.length,0,'collapsed lists create no observer or thumbnails');
 more.open=true;more.events.toggle[0]();assert.equal(panel.querySelectorAll('.sky-piece').length,27);let old=observers.at(-1);old.callback([{isIntersecting:true}]);assert.equal(panel.querySelectorAll('.sky-piece').length,51);
 more.open=false;more.events.toggle[0]();assert(old.disconnected);old.callback([{isIntersecting:true}]);assert.equal(panel.querySelectorAll('.sky-piece').length,51,'collapsed lists stop loading');
 more.open=true;more.events.toggle[0]();assert.equal(panel.querySelectorAll('.sky-piece').length,51);const load=findButton(panel,'Load more pieces');while(!load.hidden)load.click();assert.equal(panel.querySelectorAll('.sky-piece').length,120);assert(observers.at(-1).disconnected);assert.equal(new Set(panel.querySelectorAll('.sky-piece').map(n=>n.textContent)).size,120);
 ui.openDetail('star','romantic');old.callback([{isIntersecting:true}]);assert.equal(panel.querySelectorAll('.sky-piece').length,0,'old callbacks cannot modify another detail');findButton(panel,'×').click();delete context.IntersectionObserver;items=prior;ui.invalidate();
}
console.log('Sky contributor lists: deferred expansion, 24-piece batches, manual fallback, collapse/reopen, and stale-detail cleanup pass.');
