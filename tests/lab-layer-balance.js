const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8');
function fn(name){const start=html.indexOf('function '+name+'('),end=html.indexOf('\nfunction ',start+1);assert(start>=0,name);return html.slice(start,end<0?undefined:end)}
let pieces=[];
const ctx={state:{tab:'lab',lab:{seasons:{spring:true}}},Math:Object.assign(Object.create(Math),{random:()=>.3}),
 labTopish:p=>p.meta==='Tops',itemWeight:p=>p.weight||'regular',labParts:o=>[o.top,o.one,o.bottom,o.layer,o.under].filter(Boolean),
 labAccParts:o=>Object.values(o.acc||{}).flat().filter(Boolean),LAB_NEUTRAL:{black:1,white:1,gray:1,beige:1},labPatterned:p=>(p.pattern||[]).some(x=>x!=='solid'),
 labPairBlocked:(a,b)=>!!a.blocked||!!b.blocked,labPalettePair:(a,b)=>a.compatible!==false&&b.compatible!==false,labOccasionPieceOK:p=>p.available!==false,
 labPick:p=>p[0]||null,labUnder:p=>p.under[0]||null,labSelSeasons:L=>Object.keys(L.seasons||{}).filter(k=>L.seasons[k]),
 allItems:()=>pieces,labAccOK:p=>p.available!==false,labAccCandidate:p=>p.compatible!==false,labSockOK:p=>p.fits!==false,
 isBasicSock:p=>!!p.functional,labWPick:p=>p[0]||null,labColor:()=>1,labLook:()=>1};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app/scripts/lab-seasons.js'),'utf8'),ctx);vm.runInContext(['isSheer','labBareTop','labPullover','labCompactBase','layerNeed','needsLayer','labThinTop','labCanCover','labOrdinaryShirt','isUnderCand','labRequiredUnder','labFoundationUnder','labSmallCoverage','labUnderFits','labQuietSupport','labSupportPool','labCompleteLayers','labDraw','labPickSlip','labSockP','labPickSocks'].map(fn).join('\n'),ctx);
const mesh={id:'mesh',name:'Eye print mesh crop top',meta:'Tops',sub:'Tanks',material:['sheer'],length:'crop',weight:'thin',layerNeed:'under'},
 tunic={id:'tunic',name:'Sleeveless asymmetric tunic',meta:'Tops',sub:'Tanks',sleeve:'sleeveless',length:'longline',labAs:'topunder',weight:'thin'},
 shirt={id:'shirt',name:'Striped button shirt',meta:'Tops',sub:'Blouses',sleeve:'long',labAs:'either'},
 cami={id:'cami',name:'Cropped cami',meta:'Tops',sub:'Tanks',sleeve:'sleeveless',length:'crop',labAs:'topunder',weight:'thin'},
 tank={...cami,id:'tank',name:'Regular tank',length:'regular'},pants={id:'pants',meta:'Bottoms',sub:'Pants'};
let o={top:mesh,under:tunic,layer:shirt};assert(ctx.labCompleteLayers(o,{under:[tunic,cami],top:[]}));assert.equal(o.under.id,'cami','screenshot combination replaces longline tunic with a compact base');
assert.equal(ctx.labCompleteLayers({top:mesh,under:tunic,layer:shirt},{under:[tunic],top:[]}),false,'no unsupported triple when a compact base is unavailable');
assert.equal(ctx.labCompleteLayers({top:mesh,under:tank,layer:shirt},{under:[tank],top:[]}),false,'sleeveless alone is not a compact base');
assert(ctx.labCompleteLayers({top:mesh,under:tank},{under:[tank],top:[]}), 'regular opaque tank can still cover sheer clothing in a two-piece combination');
assert.equal(ctx.labUnderFits(tunic,mesh,true),false,'longline tops do not hide under cropped sheer tops');
for(const bad of [{...cami,length:'longline'},{...cami,fits:['oversized']},{...cami,weight:'thick'},{...cami,material:['sheer']}])assert.equal(ctx.labCompactBase(bad),false);
for(const base of [cami,{...cami,sub:'Bralettes',length:'regular',name:'Bralette'}])assert(ctx.labCompactBase(base));
const sweater={id:'sweater',meta:'Tops',sub:'Sweaters',kind:'pullover',weight:'regular'},vest={...sweater,id:'vest',kind:'vest'};
const undershirt={...shirt,labAs:'all'};
o={top:sweater,under:undershirt};assert(ctx.labCompleteLayers(o,{under:[undershirt],top:[]}));assert.equal(o.under.id,'shirt','shirt under sweater remains valid');
o={top:vest,under:undershirt};assert(ctx.labCompleteLayers(o,{under:[undershirt],top:[]}));assert.equal(o.under.id,'shirt','shirt under sweater vest remains valid');
assert(ctx.labCompleteLayers({top:mesh,under:cami,layer:shirt},{under:[cami],top:[]}), 'cami + sheer top + open shirt remains available');
assert.equal(ctx.labCompleteLayers({top:mesh,layer:shirt},{under:[{...cami,compatible:false}],top:[]}),false,'compact bases cannot bypass palette constraints');
assert.equal(ctx.labCompleteLayers({top:mesh,layer:shirt},{under:[{...cami,blocked:true}],top:[]}),false,'compact bases cannot bypass blocked pairs');
assert.equal(ctx.labCompleteLayers({top:mesh,layer:shirt},{under:[{...cami,available:false}],top:[]}),false,'compact bases cannot bypass occasion/availability checks');
const pool={top:[mesh],bottom:[pants],one:[],layer:[shirt],under:[cami]};
o=ctx.labDraw(pool,null,{});assert(o);assert.equal(o.under.id,'cami');assert.equal(o.layer,undefined,'required underlayer no longer routinely attracts an outer shirt at random .3');
ctx.Math.random=()=>.1;o=ctx.labDraw(pool,null,{});assert(o);assert.equal(o.under.id,'cami');assert.equal(o.layer.id,'shirt','small-base triple is still possible');
ctx.Math.random=()=>.4;const ordinary={...shirt,id:'main-shirt',labAs:'top'},separates={...pool,top:[ordinary],under:[]};o=ctx.labDraw(separates,null,{});assert.equal(o.layer,undefined,'ordinary optional layers occur less often');
const outerRequired={...ordinary,layerNeed:'over'};o=ctx.labDraw({...pool,top:[outerRequired],under:[]},null,{});assert.equal(o.layer.id,'shirt','required outer coverage remains enforced');
ctx.state.lab.seasons={winter:true};o=ctx.labDraw({...pool,top:[cami],under:[]},null,{});assert.equal(o.layer.id,'shirt','cold-season bare tops still receive a layer');
ctx.state.tab='trip';ctx.Math.random=()=>.4;o=ctx.labDraw(separates,null,{},{});assert.equal(o.layer.id,'shirt','Trip retains its existing layer probability');ctx.state.tab='lab';
// Optional hosiery embellishment is occasional; required shoe support remains available.
const tights={id:'tights',meta:'Legwear',sub:'Tights',statement:'plain'},shoe={id:'shoe',socksRequired:true},fancy={id:'fancy',meta:'Legwear',sub:'Socks',statement:'loud',pattern:['lace'],colors:['black']},basic={...fancy,id:'basic',functional:true,statement:'plain',pattern:['solid']};
ctx.labBareLegs=()=>({id:'skirt'});
assert.equal(ctx.labSockP({acc:{tights}},{seasons:{winter:true}}),.12);
assert.equal(ctx.labSockP({acc:{tights}},{seasons:{summer:true}}),.06);
assert.equal(ctx.labSockP({acc:{tights:{...tights,statement:'loud'}}},{seasons:{winter:true}}),.12);
pieces=[fancy,basic];o={bottom:pants,acc:{shoes:shoe,tights}};assert.equal(ctx.labPickSocks(o,{}).id,'fancy','hosiery does not suppress colorful socks when they are selected');
assert.equal(ctx.labPickSocks(o,{},'basic').id,'fancy','manual reroll can explore statement socks');
basic.compatible=false;assert.equal(ctx.labPickSocks(o,{}).id,'fancy','compatibility wins over a quiet appearance');delete basic.compatible;
pieces=[fancy];assert.equal(ctx.labPickSocks(o,{}).id,'fancy','required socks remain supplied when no quiet pair is available');
pieces=[fancy,basic];o={bottom:{...pants,sub:'Leggings'},acc:{shoes:shoe}};assert.equal(ctx.labPickSocks(o,{}).id,'fancy','leggings do not suppress colorful socks when they are selected');
ctx.state.tab='trip';assert.equal(ctx.labSockP({acc:{tights}},{seasons:{winter:true}}),.65);assert.equal(ctx.labPickSocks({...o,acc:{shoes:shoe,tights}},{}).id,'fancy','Trip accessory selection is unchanged');
console.log('Lab layer balance: compact three-top bases, full-top rejection, required coverage and compatibility, lower optional layers, hosiery frequency, colorful socks, explicit rerolls, and Trip isolation pass.');

// Required coverage under the pictured pullover uses a base, not a second full-size tunic top.
const requiredSweater={...sweater,id:'charcoal',labAs:'top',layerNeed:'under'},heartTop={id:'heart',name:'Heather gray top',meta:'Tops',sub:'Tees',sleeve:'long',length:'longline',labAs:'topunder'},babyTee={id:'baby',name:'Baby tee',meta:'Tops',sub:'Tees',sleeve:'short',fits:['fitted'],length:'crop',weight:'thin',labAs:'topunder'};
ctx.state.tab='lab';assert(!ctx.labUnderFits(heartTop,requiredSweater,true));
for(const base of [tank,cami,babyTee,{...cami,sub:'Bralettes',name:'Bralette'}])assert(ctx.labUnderFits(base,requiredSweater,true));
o={top:requiredSweater,under:heartTop};assert(ctx.labCompleteLayers(o,{under:[heartTop,tank],top:[]}));assert.equal(o.under.id,tank.id);
assert(!ctx.labCompleteLayers({top:requiredSweater,under:heartTop},{under:[heartTop],top:[]}),'reject an unsupported outfit rather than dropping required coverage');
assert(!ctx.labUnderFits({...babyTee,fits:['oversized']},requiredSweater,true));
ctx.state.tab='trip';assert(ctx.labUnderFits(heartTop,requiredSweater,true),'Trip selection unchanged');
console.log('Required main-top coverage: tank/cami/bralette/baby tee accepted, oversized/longline full tops rejected, alternative base selected, and requirement never silently dropped.');

// Sheer dresses and skirts use small opaque coverage, not long/bulky garments.
const sheerDress={id:'sheer-dress',meta:'One-pieces',sub:'Dresses',material:['sheer'],length:'midi',layerNeed:'under'},sheerSkirt={id:'sheer-skirt',meta:'Bottoms',sub:'Skirts',material:['sheer'],length:'mini'},slip={id:'slip',meta:'Underwear',sub:'Slips & crinolines',length:'mini',weight:'thin'},half={...slip,id:'half',name:'Half slip'},bike={id:'bike',name:'Bike shorts',meta:'Bottoms',sub:'Shorts',length:'short',fits:['fitted']};
ctx.state.tab='lab';assert.equal(ctx.layerNeed(sheerSkirt),'under');assert(ctx.labSmallCoverage(slip,sheerDress,true));assert(!ctx.labSmallCoverage(half,sheerDress,true));assert(ctx.labSmallCoverage(half,sheerSkirt,false));assert(ctx.labSmallCoverage(bike,sheerSkirt,false));
for(const bad of [{...slip,length:'maxi'},{...slip,name:'Crinoline petticoat'},{...slip,material:['sheer']},{...bike,name:'Cargo shorts',fits:['loose']}])assert(!ctx.labSmallCoverage(bad,sheerSkirt,false));
assert(ctx.labUnderFits(slip,sheerDress,true));assert(!ctx.labUnderFits({...tunic,length:'longline'},sheerDress,true));
console.log('Small sheer coverage: slips, half slips and fitted bike shorts; no longer/bulky/sheer coverage; full slip can support a dress.');

pieces=[{...slip,id:'too-long',length:'maxi'}, {...slip,id:'bulky',name:'Crinoline petticoat'},half,bike];assert.equal(ctx.labPickSlip({bottom:sheerSkirt}).id,half.id);pieces=[{...slip,length:'maxi'}];assert.equal(ctx.labPickSlip({bottom:sheerSkirt}),null);
