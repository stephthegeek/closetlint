const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.NAMING_ROOT||path.resolve(__dirname,'..');
const html=fs.readFileSync(root+'/app/closet-lint.html','utf8');
const nodes={};const ctx={state:{profile:{}},Set,console,hashStr:s=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,0),cap:s=>s[0].toUpperCase()+s.slice(1),LABEL:{Tees:'Tee',Pants:'Trousers',Dresses:'Dress',Necklaces:'Necklace'},labParts:o=>[o.layer,o.one,o.top,o.under,o.bottom].filter(Boolean),$:id=>nodes[id],el:(tag,attrs)=>({tag,...attrs})};
vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('var LT_STYLES='),html.indexOf('/* ---------- Outfit Lab view ---------- */')),ctx);
const N=ctx.ClosetLintNaming;
const outfits=[
 {label:'Burgundy cardigan, black trousers',o:{layer:{id:'c',name:'Burgundy cardigan',kind:'cardigan',meta:'Outerwear',colors:['burgundy'],material:['knit']},bottom:{id:'p',name:'Black trousers',meta:'Bottoms',sub:'Pants',colors:['black']}}},
 {label:'Blue striped tee, denim jeans',o:{top:{id:'t',name:'Striped tee',meta:'Tops',colors:['blue'],pattern:['striped']},bottom:{id:'j',name:'Jeans',meta:'Bottoms',colors:['blue'],material:['denim']}}},
 {label:'Black velvet dress, silver moon necklace',o:{one:{id:'d',name:'Velvet dress',sub:'Dresses',meta:'One-pieces',colors:['black'],material:['velvet']},acc:{jewelry:[{id:'n',name:'Moon necklace',meta:'Jewelry',sub:'Necklaces',colors:['silver']}]}}},
 {label:'Green floral blouse, pleated skirt',o:{top:{id:'b',name:'Floral blouse',meta:'Tops',colors:['green'],pattern:['floral']},bottom:{id:'s',name:'Pleated skirt',meta:'Bottoms',colors:['beige'],details:['pleated']}}},
 {label:'Sparse record: dress only',o:{one:{id:'sparse',meta:'One-pieces',sub:'Dresses'}}}
];
assert.equal(ctx.outfitNamingStyle(),'Surprise me');assert.equal(N.valid('bogus'),'Surprise me');
const plain=outfits[1].o;let a=ctx.ltTitle(plain,'Descriptive');assert(!/Vibes|Glam|Charm|Energy/.test(a));assert.match(a,/blue.*Tee.*blue.*Jeans/i);
for(const style of N.styles){let o=structuredClone(outfits[2].o);let name=ctx.ltTitle(o,style);assert.equal(ctx.ltTitle(o,style),name,'render is stable');for(let i=0;i<100;i++){o.tn=i;name=ctx.ltTitle(o,style);assert(name.length>0&&name.length<=80);assert(!/undefined|\{/.test(name))}}
let o=structuredClone(outfits[0].o);const names=[];for(let i=0;i<40;i++){o.tn=i;names.push(ctx.ltTitle(o,'Poetic'))}assert.equal(new Set(names).size,names.length);
const counts={};for(let i=0;i<1400;i++){const r=N.generate([outfits[1].o.top],'Surprise me','distribution'+i,ctx.ltNoun,()=> 'Legacy sample');counts[r.style]=(counts[r.style]||0)+1}assert.equal(Object.keys(counts).length,7);Object.values(counts).forEach(n=>assert(n>130&&n<270));
let sparse=outfits[4].o;for(let i=0;i<100;i++){sparse.tn=i;assert(!/pleat|velvet|denim|lace|button|boot sequence|unsupervised layers/i.test(ctx.ltTitle(sparse,'Nerdy')))}
let cached={...outfits[1].o,tn:90};const old=ctx.ltTitle(cached,'Descriptive');cached.top={...cached.top,colors:['red']};assert.notEqual(ctx.ltTitle(cached,'Descriptive'),old);
for(const expr of ["ltTitle(o,'Surprise me')","ltTitle(o,L.tstyle)"])assert(!html.includes(expr),'all suggestion callers follow preference');
const sample=outfits.map(({label,o})=>({label,styles:N.styles.map(style=>({style,names:Array.from({length:5},(_,i)=>{o.tn=1000+i;return ctx.ltTitle(o,style)})}))}));
(async()=>{
 let fail=false,release;nodes['outfit-naming-style']={options:[],appendChild(v){this.options.push(v)}};nodes['outfit-naming-status']={};
 ctx.state.db={collection:name=>{assert.equal(name,'profile');return {doc:key=>{assert.equal(key,'outfit-naming');return {set:value=>new Promise((resolve,reject)=>{release=()=>fail?reject(Error('offline')):resolve()})}}}}};
 ctx.outfitNamingSettings();const select=nodes['outfit-naming-style'];assert.equal(select.options.length,7);select.value='Nerdy';const saving=select.onchange();assert(select.disabled);assert.equal(ctx.outfitNamingStyle(),'Surprise me');release();await saving;assert.equal(ctx.outfitNamingStyle(),'Nerdy');
 fail=true;select.value='Poetic';const failed=select.onchange();release();await failed;assert.equal(ctx.outfitNamingStyle(),'Nerdy');assert.equal(select.value,'Nerdy');assert.match(nodes['outfit-naming-status'].textContent,/Could not save/);
 ctx.state.profile={'outfit-naming':{style:'Descriptive'}};ctx.outfitNamingSettings();assert.equal(select.value,'Descriptive');assert.equal(ctx.ltTitle(outfits[1].o),ctx.ltTitle(outfits[1].o,'Descriptive'));
 if(process.env.NAMING_SAMPLER)fs.writeFileSync(process.env.NAMING_SAMPLER,JSON.stringify(sample,null,2));
 console.log('Naming: seven styles, plain descriptions, conditional cues, stable render, rerolls, balanced mix, metadata refresh, shared callers, preference save/failure/reload passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
