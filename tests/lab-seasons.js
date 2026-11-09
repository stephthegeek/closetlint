const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),S=require(path.join(root,'app/scripts/lab-seasons.js')),html=fs.readFileSync(path.join(root,'app/closet-lint.html'),'utf8');
const winter={seasons:{winter:true}},spring={seasons:{spring:true}},fall={seasons:{fall:true}},summer={seasons:{summer:true}};
const p=(id,meta='Tops',more={})=>({id,name:id,meta,sub:meta==='Bottoms'?'Pants':meta==='Footwear'?'Flats':'Tees',photo:'photo:'+id,colors:['black'],styles:['casual'],statement:'medium',material:[],seasons:[],...more});
const whiteSweater=p('white sweater','Tops',{sub:'Sweaters',kind:'pullover',colors:['white','yellow'],sleeve:'long',weight:'regular'}),darkTank=p('tank','Tops',{sub:'Tanks',colors:['black'],sleeve:'sleeveless',weight:'thin'});
assert(S.coreOK({top:whiteSweater},winter));assert(!S.coreOK({top:darkTank},winter));assert(S.coreOK({top:darkTank,under:p('long tee','Tops',{sleeve:'long'})},winter));
assert(!S.clothingOK(whiteSweater,summer,'regular'));assert(S.clothingOK({...whiteSweater,weight:'thin'},summer,'thin'));
assert(S.clothingBias(whiteSweater,winter,'regular')>S.clothingBias(darkTank,winter,'thin')+.2,'garment type and sleeves outweigh palette');
assert(S.clothingBias(p('light','Tops',{colors:['white']}),spring,'regular')>S.clothingBias(p('dark','Tops',{colors:['black']}),spring,'regular'));
assert(S.clothingBias(p('dark'),fall,'regular')>S.clothingBias(p('light','Tops',{colors:['white']}),fall,'regular'));
for(const shoe of [p('open','Footwear',{shoefeat:['open toe']}),p('tiny strap sandal','Footwear',{sub:'Sandals'}),p('mules','Footwear'),p('slides','Footwear'),p('peep toe boot','Footwear',{sub:'Boots'})])assert(!S.shoeOK(shoe,winter),shoe.name);
const boots=p('boots','Footwear',{sub:'Boots'}),closed=p('closed lace-up shoes','Footwear',{sub:'Lace-up dress shoes'});
assert(S.shoeOK(boots,winter));assert(S.shoeOK(closed,winter));assert(S.shoeBias(boots,winter)>S.shoeBias(closed,winter));
const peep=p('peep toe shoe','Footwear',{sub:'Heels'}),strappy=p('white tiny strap sandal','Footwear',{sub:'Sandals',colors:['white']}),platform={...strappy,shoefeat:['platform']};
assert(S.shoeBias(strappy,fall)<S.shoeBias(platform,fall));assert(S.shoeBias(strappy,spring)<S.shoeBias(peep,spring));assert(S.shoeOK(strappy,spring),'transitional sandals are disfavored, not banned');
const mini=p('mini','Bottoms',{sub:'Skirts',length:'mini'}),midi={...mini,length:'midi'},maxi={...mini,length:'maxi'},shorts={...mini,sub:'Shorts',length:'bermuda'};
for(const L of [spring,fall,winter]){assert(S.needsCoverage({bottom:mini},L));assert(S.needsCoverage({bottom:shorts},L));assert(!S.needsCoverage({bottom:maxi},L))}
assert(!S.needsCoverage({bottom:midi},spring));assert(S.needsCoverage({bottom:midi},winter));assert(!S.needsCoverage({bottom:mini},summer));
assert(!S.needsCoverage({bottom:mini},{seasons:{summer:true,fall:true}}),'mixed seasons include warm-weather versions');
assert(S.coverage(p('tall','Legwear',{sub:'Socks',sockType:'knee high'})));assert(!S.coverage(p('ankle','Legwear',{sub:'Socks',sockType:'ankle'})));
let pieces=[],messages=[];
const state={tab:'lab',fantasy:false},math=Object.assign(Object.create(Math),{random:()=>.1}),c={state,Math:math,Date,Set,document:{addEventListener(){}},BLANK:'blank',PLACEHOLDER:'placeholder',SEASONS:['spring','summer','fall','winter'],catMetas:m=>[m],allItems:()=>pieces,wrFam:()=>({c:true,d:true}),labPairBlocked:()=>false,laundryPlanningOnly:()=>true,needsLaundry:x=>!!x.laundry,toast:m=>messages.push(m),labRender:()=>{},curSeason:()=> 'winter',isBasicSock:x=>!!x.functional,glType:x=>x,isSpecs:()=>false,isTrans:()=>false};
vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'app/scripts/lab-seasons.js'),'utf8'),c);vm.runInContext(html.slice(html.indexOf('var LAB_NEUTRAL='),html.indexOf('/* ---------- Lab outfit titles:')),c);c.labFits=x=>x.fit!==false;
function reset(items,L= winter){pieces=items;state.lab={...L,fits:true,fresh:false,occasion:'any',accAuto:false};state.ratings={};state.tab='lab';state.fantasy=false;messages=[]}
const pants=p('pants','Bottoms'),shirt=p('long shirt','Tops',{sleeve:'long'}),shortLayer=p('short layer','Tops',{labAs:'layer',sleeve:'short'}),cardi=p('light cardigan','Tops',{sub:'Sweaters',kind:'cardigan',labAs:'layer',sleeve:'long',weight:'thin'}),shoe={...closed,socksOk:'any'};
reset([darkTank,pants,shortLayer,cardi,shoe]);let o=c.labDraw({top:[darkTank],bottom:[pants],one:[],layer:[shortLayer,cardi],under:[]},null,{});assert(o);assert.equal(o.layer.id,cardi.id,'winter chooses a long sleeve layer, not merely any layer');assert(c.labSuggestionOK(o));
assert.equal(c.labDraw({top:[darkTank],bottom:[pants],one:[],layer:[shortLayer],under:[]},null,{}),null,'winter cannot invent sleeve coverage');
for(const L of [spring,fall]){reset([darkTank,pants,cardi,shoe],L);c.Math.random=()=>.5;o=c.labDraw({top:[darkTank],bottom:[pants],one:[],layer:[cardi],under:[]},null,{});assert(o);assert(!o.layer,'transitional season does not force sweaters')}
reset([whiteSweater,{...cardi,id:'thin summer cardigan'},darkTank,pants],summer);let pool=c.labPool({seasons:summer.seasons,photo:true});assert(!pool.top.some(x=>x.id===whiteSweater.id));assert(pool.layer.some(x=>x.id==='thin summer cardigan'));
const tights=p('blue tights','Legwear',{sub:'Tights',colors:['black'],weight:'regular'}),thermal={...tights,id:'thermal',name:'Thermal fleece-lined tights'},ankle=p('statement ankle socks','Legwear',{sub:'Socks',sockType:'ankle',sockWeight:'thin',statement:'loud'}),tall={...ankle,id:'knee',name:'Statement knee socks',sockType:'knee high'};
for(const L of [spring,fall]){
 reset([shirt,mini,shoe,ankle],L);o={top:shirt,bottom:mini};assert(!c.labSuggestionOK(o),'ankle socks do not supply short-skirt coverage');
 pieces.push(tights);assert(c.labSuggestionOK(o),'available tights make a covered version possible');c.labEnsureAcc(o,state.lab);assert.equal(o.acc.tights.id,tights.id);assert(!o.acc.socks,'coverage is not automatically stacked');
 assert.equal(c.labLeaveOut(o,'tights'),false,'cannot remove the last required covering layer');
 reset([shirt,mini,shoe,tall],L);o={top:shirt,bottom:mini};assert(c.labSuggestionOK(o),'tall socks can supply the coverage');c.labEnsureAcc(o,state.lab);assert.equal(o.acc.socks.id,tall.id);assert(!o.acc.tights,'tall socks and tights are alternatives');
 assert.equal(c.labPickSocks(o,state.lab).id,tall.id,'reroll retains tall coverage when needed');
}
reset([shirt,mini,shoe,thermal],winter);o={top:shirt,bottom:mini};assert(c.labSuggestionOK(o),'thermal hosiery is available in winter');c.labEnsureAcc(o,state.lab);assert.equal(o.acc.tights.id,'thermal');
reset([shirt,mini,shoe,thermal],fall);assert(c.labSuggestionOK({top:shirt,bottom:mini}),'thermal hosiery is not banned in fall by a personal mild-climate rule');
thermal.seasons=['winter'];assert(!c.labSuggestionOK({top:shirt,bottom:mini}),'explicit winter-only hosiery tags are respected in fall');thermal.seasons=[];
reset([shirt,pants,boots,closed,...[strappy,peep,p('mule','Footwear',{name:'Mules'})]],winter);o={top:shirt,bottom:pants};for(let i=0;i<10;i++){const pick=c.labPickShoes(o,state.lab);assert(pick);assert(c.ClosetLintLabSeasons.shoeOK(pick,state.lab))}
// The only change to colorful sock combinations is frequency.
assert.equal(c.labSockP({acc:{tights:{...tights,statement:'loud'}}},winter),.12);
const basic={...ankle,id:'basic',name:'Plain basic socks',statement:'plain',functional:true};reset([ankle,basic,shirt,pants,shoe],winter);o={top:shirt,bottom:pants,acc:{shoes:{...shoe,socksRequired:true},tights}};c.labWPick=xs=>xs[0]||null;assert.equal(c.labPickSocks(o,state.lab).id,ankle.id,'layered legwear does not force quiet socks');
// Winter extras are explicit, bounded, compatible, removable, and fully serializable.
const coat=p('coat','Outerwear',{sub:'Coats',seasons:['winter']}),scarf=p('scarf','Other accessories',{sub:'Scarves',seasons:['winter']}),hat=p('beanie','Hats',{sub:'Beanies',seasons:['winter']}),mittens=p('mittens','Other accessories',{sub:'Gloves',seasons:['winter']}),sunhat=p('sunhat','Hats',{sub:'Sun hats',seasons:['summer']});
reset([shirt,pants,shoe,coat,scarf,hat,mittens,sunhat],winter);c.Math.random=()=>.1;o={top:shirt,bottom:pants};c.labEnsureAcc(o,state.lab);const keys=['scarf','hat','gloves','coat'];assert(keys.every(k=>!o.acc[k]),'default outfit generation adds no winter extras');
c.labAccessorize(o,state.lab);assert(keys.every(k=>!o.acc[k]),'automatic Accessorize adds no winter extras');c.labAccessorize(o,state.lab,true);assert.equal(keys.filter(k=>o.acc[k]).length,2,'explicit Accessorize offers a subset');
const rec={acc:c.labAccRec(o)},restored={};c.labAccRestore(restored,rec,Object.fromEntries(pieces.map(x=>[x.id,x])));for(const key of keys)assert.equal(restored.acc[key]?.id,o.acc[key]?.id,'winter extra persists '+key);
assert(c.labAccParts(o).some(x=>keys.some(k=>o.acc[k]===x)),'board/save integration includes the extras');const removeKey=keys.find(k=>o.acc[k]);assert(c.labLeaveOut(o,removeKey));assert(!o.acc[removeKey]);
reset([shirt,pants,shoe,coat,scarf,hat,mittens],summer);o={top:shirt,bottom:pants};c.labAccessorize(o,state.lab,true);assert(keys.every(k=>!o.acc[k]),'summer Accessorize adds no winter extras');
reset([shirt,pants,shoe,{...coat,hidden:true},{...scarf,laundry:true},{...hat,fit:false},{...mittens,wish:true}],winter);o={top:shirt,bottom:pants};c.labAccessorize(o,state.lab,true);assert(keys.every(k=>!o.acc[k]),'winter extras respect availability and palette/occasion');
state.tab='trip';assert.equal(c.labSockP({acc:{tights}},winter),.65,'Trip socks retain their policy');
console.log('Lab seasons: garment-first seasons, winter sleeves/footwear, transitional coverage alternatives, summer layers, thermal hosiery, colorful socks, manual winter extras, persistence, removal, and availability pass.');

// Required shoe coverage accepts footed hosiery without forcing an additional sock layer.
state.tab='lab';const requiredBoot={...boots,id:'required-boot',socksRequired:true},footed=p('footed tights','Legwear',{sub:'Tights',weight:'thin'}),footless={...footed,id:'footless',name:'Footless tights'},requiredSock=p('boot socks','Legwear',{sub:'Socks',sockType:'crew',weight:'regular'});
reset([shirt,maxi,requiredBoot,footed,requiredSock],winter);o={top:shirt,bottom:maxi,acc:{shoes:requiredBoot,tights:footed,socks:requiredSock}};
assert(c.labHosieryMeetsShoe(footed,requiredBoot));assert(!c.labHosieryMeetsShoe(footless,requiredBoot));assert(!c.labHosieryMeetsShoe(p('leggings','Bottoms',{sub:'Leggings'}),requiredBoot));
assert.equal(c.labLeaveOut(o,'socks'),true);assert(!o.acc.socks);c.labEnsureSocks(o,state.lab);assert(!o.acc.socks,'ensure does not reinsert redundant socks');assert.equal(o.socksText,'');
assert.equal(c.labLeaveOut(o,'tights'),false,'cannot remove the last foot covering required by the shoes');
o.acc.tights=footless;o.acc.socks=requiredSock;assert.equal(c.labLeaveOut(o,'socks'),false,'footless hosiery does not satisfy shoe coverage');
o.acc.tights=footed;assert(!c.labHosieryMeetsShoe({...footed,weight:'thick'},{...requiredBoot,socksOk:'thin'}));assert(c.labHosieryMeetsShoe({...footed,sub:'Stockings'},requiredBoot));
console.log('Required socks/hosiery: redundant socks removable, no reinsertion, last-layer protection, footless/leggings exclusion, stockings, and explicit thin-weight setting pass.');

// An overall's required undershirt must not trigger lower-body modesty layers.
const overall=p('overalls','One-pieces',{sub:'Jumpsuits & rompers',length:'full length',layerNeed:'under'}),fashionShorts=p('fashion shorts','Bottoms',{sub:'Shorts',length:'short',fits:['fitted'],details:['pockets']}),coverageShorts={...fashionShorts,id:'bike-shorts',name:'Bike shorts',functional:true};
reset([shirt,overall,requiredBoot,fashionShorts,coverageShorts],winter);o={one:overall,under:shirt,acc:{shoes:requiredBoot},shoesDone:true};c.labEnsureAcc(o,state.lab);assert(!o.acc.slip&&!o.acc.tights&&!o.slipText,'full-length overalls do not get shorts or hosiery coverage');
assert(!c.labSmallCoverage(fashionShorts,{...mini,length:'mini'},false));assert(c.labSmallCoverage(coverageShorts,{...mini,length:'mini'},false));assert.equal(c.labAccName(fashionShorts),'shorts');assert.equal(c.labAccName({...fashionShorts,sub:'Leggings'}),'leggings');
console.log('Overalls: upper underlayer does not trigger lower coverage; ordinary fashion shorts excluded; accessory category names remain accurate.');
