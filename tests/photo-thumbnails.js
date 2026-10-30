const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),line=html.split('\n').find(s=>s.startsWith('function photoThumbnail(')),ctx={window:{}};
vm.createContext(ctx);vm.runInContext(line,ctx);
const original='/_blob/'+'a'.repeat(32);
assert.equal(ctx.photoThumbnail(original),original,'ordinary installs use original photos');
ctx.window.ClosetLintLocal={thumbnails:true};assert.equal(ctx.photoThumbnail(original),'/_thumb/'+'a'.repeat(32));
assert.equal(ctx.photoThumbnail('/_catalog/'+'b'.repeat(32)),'/_catalog_thumb/'+'b'.repeat(32),'older bundled photos also use previews');
for(const src of [original+'.webp',original+'?other=1','https://other.example/'+original,'data:image/png;base64,test',''])assert.equal(ctx.photoThumbnail(src),src,'do not rewrite static demos, remote URLs, or placeholders');
ctx.window.ClosetLintLocal.thumbnails=false;assert.equal(ctx.photoThumbnail(original),original,'disabled image tools preserve normal browsing');
console.log('Browse thumbnails: local-only preview URLs, original fallback, and static/remote photos pass.');
vm.runInContext(html.split('\n').find(s=>s.startsWith('function photoPreviewError(')),ctx);
for(const [preview,full] of [['/_thumb/', '/_blob/'], ['/_catalog_thumb/', '/_catalog/']]){
 const image={tagName:'IMG',src:preview+'a'.repeat(32),getAttribute(){return this.src}};
 ctx.photoPreviewError({target:image});assert.equal(image.src,full+'a'.repeat(32));
 ctx.photoPreviewError({target:image});assert.equal(image.src,full+'a'.repeat(32),'a failed original must not enter a retry loop');
}
for(const src of ['https://other.example/_thumb/'+'a'.repeat(32),original+'.webp','data:image/png;base64,test','']){
 const image={tagName:'IMG',src,getAttribute(){return this.src}};ctx.photoPreviewError({target:image});assert.equal(image.src,src);
}
ctx.photoPreviewError({target:{tagName:'SCRIPT'}});
assert(html.includes("document.addEventListener('error',photoPreviewError,true)"),'image errors require a capture listener');
console.log('Failed thumbnail requests fall back once to originals, without rewriting external images.');

ctx.el=(tag,props)=>({tag,...props});vm.runInContext(html.split('\n').find(s=>s.startsWith('function browsePhoto(')),ctx);ctx.window.ClosetLintLocal.thumbnails=true;
for(let i=0;i<10;i++){const photo=ctx.browsePhoto({photo:original,name:'Synthetic piece'},i);assert.equal(photo.src,'/_thumb/'+'a'.repeat(32));assert.equal(photo.loading,i<6?'eager':'lazy');assert.equal(photo.fetchpriority,i<6?'high':'auto');}
assert.equal(ctx.browsePhoto({photo:original,name:'New category'},0).loading,'eager','priority restarts for each newly drawn category');
console.log('Browse loading: the first six thumbnails load eagerly at high priority; offscreen photos remain lazy.');

// Render real collection covers to verify their requests use previews, including legacy catalogs.
class PreviewNode{
 constructor(tag,props,...children){this.tag=tag;Object.assign(this,props||{});this.children=[];this.classList={toggle(){}};this.append(...children)}
 append(...children){this.children.push(...children.flat().filter(x=>x!=null))}appendChild(child){this.append(child);return child}
}
const nodes={};ctx.el=(...args)=>new PreviewNode(...args);ctx.$=id=>nodes[id]||(nodes[id]=new PreviewNode('div'));ctx.state={collectionManager:true};ctx.routeAnchor=(route,props,action,children)=>new PreviewNode('a',props,children);
vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/collections.js','utf8'),ctx);
ctx.cardMenuButton=()=>new PreviewNode('button');
ctx.collectionList=()=>[{id:'test',name:'Synthetic collection',ids:['upload','legacy']}];ctx.byId=()=>({upload:{photo:original},legacy:{photo:'/_catalog/'+'b'.repeat(32)}});ctx.collectionContext(2);
const images=[];function visit(n){if(n.tag==='img')images.push(n);(n.children||[]).forEach(visit)}visit(nodes['collection-context']);
assert.deepEqual(images.map(n=>n.src),['/_thumb/'+'a'.repeat(32),'/_catalog_thumb/'+'b'.repeat(32)]);assert(images.every(n=>n.loading==='lazy'&&n.decoding==='async'));
console.log('Collection covers: uploaded and legacy photos use lazy, asynchronously decoded WebP previews.');

function appFn(name){const a=html.indexOf('function '+name+'('),b=html.indexOf('\nfunction ',a+1);assert(a>=0);return html.slice(a,b)}
Object.assign(ctx,{COLL_MAX:12,BOARD_AR:1,SHAPES:{},clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),collLayout:()=>({deco:[],slots:[{x:0,y:0,w:100,h:100}]}),collRadius:()=>0,collImgStyle:()=>'',collPalFor:()=>[],miniTf:()=>'',clipCss:()=>'',labRole:()=>null,catLabel:()=> 'Top'});
vm.runInContext(['collBuild','ofMini','labTile'].map(appFn).join('\n'),ctx);
const map={p:{id:'p',name:'Synthetic top',photo:original}},outfit={pieces:[{id:'p',x:0,y:0,w:100,z:0}],st:{}};
function firstImage(node){if(node.tag==='img')return node;for(const child of node.children||[]){if(typeof child!=='object')continue;const found=firstImage(child);if(found)return found}}
assert.equal(firstImage(ctx.ofMini(outfit,map)).src,'/_thumb/'+'a'.repeat(32));
assert.equal(firstImage(ctx.ofMini({...outfit,lay:{n:1}},map)).src,'/_thumb/'+'a'.repeat(32),'collage-style saved outfits use previews too');
const board=new PreviewNode('div');ctx.collBuild(board,outfit.pieces,map,{n:1},1,0,{pal:[],bgc:'#fff',live:true});assert.equal(firstImage(board).src,original,'the working board retains full-resolution photos');
assert.equal(firstImage(ctx.labTile(map.p)).src,'/_thumb/'+'a'.repeat(32),'Lab and taste tiles use previews');
console.log('Saved outfits and Lab: miniature collages and tiles use previews; working boards retain originals.');
