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
