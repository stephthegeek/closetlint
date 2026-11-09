const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
const start=source.indexOf('  function drawSV(){'),end=source.indexOf('  function drawHue(){',start),arcs=[];
let rect={width:350,height:90};const g={fillRect(){},createLinearGradient:()=>({addColorStop(){}}),beginPath(){},arc:(x,y,r)=>arcs.push({x,y,r}),stroke(){}};
const ctx={sv:{width:216,height:140,getBoundingClientRect:()=>rect,getContext:()=>g},hsv:[120,.25,.75],cpHsv2rgb:()=>[],cpRgb2hex:()=> '#000'};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
for(const size of [{width:350,height:90},{width:216,height:140},{width:430,height:90}]){
 rect=size;ctx.drawSV();const circle=arcs.at(-1),scaleX=rect.width/ctx.sv.width,scaleY=rect.height/ctx.sv.height;
 assert.equal(circle.r*scaleX,circle.r*scaleY,'selector stays circular across canvas aspect ratios');assert.equal(circle.x*scaleX,.25*rect.width);assert.equal(circle.y*scaleY,.25*rect.height,'marker remains on the selected color');
}
console.log('Color picker: circular marker and selected-color coordinates survive mobile canvas resizing.');

// Metallic tag finishes are presentation only; the shared numerical palette stays solid.
{
 const paint=source.slice(source.indexOf('function colorTagPaint('),source.indexOf('function clamp(',source.indexOf('function colorTagPaint('))),colors=vm.runInNewContext('('+source.match(/var COLORS=(\{[^\n]+\});/)[1]+')'),c={COLORS:colors},before=JSON.stringify(colors);vm.createContext(c);vm.runInContext(paint,c);
 assert(c.colorTagPaint('gold').startsWith('linear-gradient('));assert(c.colorTagPaint('silver').startsWith('linear-gradient('));assert.equal(c.colorTagPaint('gray'),colors.gray);assert.equal(c.colorTagPaint('beige'),colors.beige);assert.equal(JSON.stringify(colors),before);assert(/^#[0-9a-f]{6}$/i.test(colors.gold)&&/^#[0-9a-f]{6}$/i.test(colors.silver));
 function lum(hex){const c=[1,3,5].map(i=>{const v=parseInt(hex.slice(i,i+2),16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
 for(const metal of ['gold','silver'])for(const stop of c.colorTagPaint(metal).match(/#[0-9a-f]{6}/gi))assert((lum(stop)+.05)/(lum('#151315')+.05)>=4.5,'metal gradient stops retain readable dark tag labels');
 console.log('Color tags: gold/silver metallic finishes, unchanged solid calculation colors, flat gray/beige, and readable gradient stops pass.');
}
