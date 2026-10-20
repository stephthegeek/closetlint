const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync(require('node:path').join(__dirname,'../app/closet-lint.html'),'utf8'),ctx={};vm.createContext(ctx);vm.runInContext(s.slice(s.indexOf('function bindPhotoDrag('),s.indexOf('function openColorPop(')),ctx);
const handlers={},samples=[],preview=[],photo={addEventListener:(k,v)=>handlers[k]=v,removeEventListener:k=>delete handlers[k],setPointerCapture(){},releasePointerCapture(){}};
const clear=ctx.bindPhotoDrag(photo,e=>samples.push(e.clientX),e=>preview.push(e.clientX));
function fire(type,x,id=1){handlers[type]({type,pointerId:id,button:0,clientX:x,preventDefault(){}})}
fire('pointermove',5);assert.equal(samples.length,0);fire('pointerdown',10);fire('pointermove',20);fire('pointermove',99,2);fire('pointerup',30);fire('pointermove',40);assert.deepEqual(samples,[10,20,30]);assert.deepEqual(preview,samples);fire('pointerdown',50);fire('pointercancel',60);fire('pointermove',70);assert.deepEqual(samples,[10,20,30,50]);clear();assert.equal(Object.keys(handlers).length,0);
console.log('Photo drag samples start, movement and release; ignores other pointers; cleans up on close/cancel.');
