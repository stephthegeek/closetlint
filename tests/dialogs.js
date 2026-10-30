const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const events={},context={Event,document:{addEventListener:(name,fn)=>events[name]=fn},window:{},closeDlg:()=>{closedMain++}};
let closedMain=0;vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../app/scripts/dialogs.js','utf8'),context);
function dialog(id='calendar'){
 return {tagName:'DIALOG',id,open:true,closed:0,handlers:[],events:{},getBoundingClientRect:()=>({left:10,top:10,right:90,bottom:90}),
 addEventListener(name,fn){this.events[name]=fn},dispatchEvent(e){if(this.oncancel)this.oncancel(e);this.handlers.forEach(fn=>fn(e));return !e.defaultPrevented},close(){this.closed++;this.open=false;if(this.events.close)this.events.close()}};
}
function event(d,x=1,y=1){return {target:d,clientX:x,clientY:y,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}}}
let d=dialog(),e=event(d);events.pointerdown(e);events.click(e);assert.equal(d.closed,1);assert(e.stopped);
d=dialog();e=event(d,20,20);events.pointerdown(e);events.click(e);assert.equal(d.closed,0,'dialog padding is not the backdrop');
d=dialog();events.pointerdown(event(d,20,20));events.click(event(d));assert.equal(d.closed,0,'dragging out of the dialog cannot discard it');
d=dialog();events.pointerdown(event({tagName:'INPUT',closest:()=>d},20,20));events.click(event(d));assert.equal(d.closed,0,'a drag starting in a form field cannot discard the dialog');
d=dialog();let prompts=0;d.handlers.push(e=>{prompts++;e.preventDefault()});events.pointerdown(event(d));events.click(event(d));assert.equal(d.closed,0);assert.equal(prompts,1,'existing unsaved-work guard runs once');
d=dialog();let saving=true;d.handlers.push(e=>{if(saving)e.preventDefault()});events.pointerdown(event(d));events.click(event(d));assert(d.open,'save in progress blocks closing');saving=false;events.pointerdown(event(d));events.click(event(d));assert(!d.open);
d=dialog('dlg');events.pointerdown(event(d));events.click(event(d));assert.equal(closedMain,1,'piece dialog uses its route-aware close');
d=dialog();context.window.ClosetLintRoutes={closeTrackedDialog:dlg=>{prompts++;dlg.close()}};events.pointerdown(event(d));events.click(event(d));assert.equal(d.closed,1,'tracked forms keep their fallback close guard');
let value='',busy=false,confirmed=false,discardCalls=0,notices=[];context.window.confirm=()=>{discardCalls++;return confirmed};context.toast=x=>notices.push(x);
d=dialog();context.guardClosetDialog(d,()=>value,()=>busy);value='Unsaved draft';context.requestClosetDialogClose(d);assert(d.open);assert.equal(discardCalls,1);assert.equal(value,'Unsaved draft');
busy=true;context.requestClosetDialogClose(d);assert(d.open);assert.equal(discardCalls,1);assert.match(notices[0],/save to finish/);
busy=false;confirmed=true;context.requestClosetDialogClose(d);assert(!d.open);assert.equal(d.oncancel,null,'closed shared dialogs lose their old guard');
d=dialog();context.guardClosetDialog(d,()=>value);const before=discardCalls;context.requestClosetDialogClose(d);assert(!d.open);assert.equal(discardCalls,before,'unchanged forms close without a warning');
console.log('Dialog backdrops: read-only close, padding, drag-out, unsaved edits, busy saves, and route-aware closing pass.');
