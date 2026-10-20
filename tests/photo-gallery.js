const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
class Node{constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs=attrs;this.children=children.filter(Boolean);this.style={};}appendChild(n){this.children.push(n)}setAttribute(k,v){this.attrs[k]=v}}
const changes=[],lightboxes=[];
const ctx={encodeURIComponent,Date,window:{},realPhoto:()=>true,openLightbox:x=>lightboxes.push(x),el:(t,a,...c)=>new Node(t,a,c)};
vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function piecePhotos('),source.indexOf('function openEdit(')),ctx);
const it={name:'Synthetic coat',photoId:'main',photo:'/_blob/main',ar:.7,photos:[{photoId:'main',kind:'model',ar:.7},{photoId:'alt',kind:'isolated',ar:1},{photoId:'alt',kind:'isolated'}]};
const original=JSON.stringify(it),panel=ctx.piecePhotoPanel(it,(view,isMain)=>changes.push({view,isMain}));
const hero=panel.children[0],strip=panel.children[1];assert.equal(strip.children.length,2);
strip.children[1].attrs.onclick();assert.equal(hero.children[0].src,'/_blob/alt');assert.equal(strip.children[1].attrs['aria-pressed'],'true');assert.equal(strip.children[0].attrs['aria-pressed'],'false');assert.equal(changes[0].view.photoId,'alt');assert.equal(changes[0].isMain,false);
hero.attrs.onclick();assert.equal(lightboxes[0].photo,'/_blob/alt');
strip.children[0].attrs.onclick();assert.equal(changes[1].isMain,true);assert.equal(JSON.stringify(it),original,'view switching never mutates the saved main photo or item');
assert.equal(ctx.piecePhotos({photoId:'replacement',photos:it.photos}).length,3,'a replacement main photo is not lost');assert.equal(ctx.piecePhotos({photo:'legacy.jpg'})[0].src,'legacy.jpg');
// Run the actual upload decoder against synthetic dimensions, without image fixtures.
let output,canvas,fillCount=0,outputMime;const decode={URL:{createObjectURL:()=>'',revokeObjectURL(){}},Image:class{constructor(){this.naturalWidth=3200;this.naturalHeight=2400}set src(v){this.onload()}},document:{createElement(){canvas={getContext:()=>({fillRect(){fillCount++},drawImage(){}}),toBlob(cb,mime){outputMime=mime;cb({})},toDataURL:()=>''};return canvas}}};
vm.createContext(decode);vm.runInContext(source.slice(source.indexOf('function readImage('),source.indexOf('function openAdd(')),decode);
(async()=>{await decode.readImage({type:'image/jpeg',size:1000});assert.equal(canvas.width,1600);assert.equal(canvas.height,1200);decode.Image=class{constructor(){this.naturalWidth=400;this.naturalHeight=800}set src(v){this.onload()}};await decode.readImage({type:'image/jpeg',size:1000});assert.equal(canvas.width,400);assert.equal(canvas.height,800);await assert.rejects(decode.readImage({type:'image/svg+xml',size:1000}),/Choose a JPEG/);await assert.rejects(decode.readImage({type:'image/png',size:33*1024*1024}),/under 32 MB/);const previousFills=fillCount;await decode.readImage({type:'image/png',size:1000});assert.equal(outputMime,'image/png');assert.equal(fillCount,previousFills,'transparent uploads are not flattened onto white');console.log('Photo gallery: alternate preview/lightbox, no item mutation, legacy fallbacks; uploads cap at 1600 without upscaling.');})().catch(e=>{console.error(e);process.exit(1)});
