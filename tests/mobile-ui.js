// The real mobile helper functions, with synthetic DOM/viewport fixtures.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../app/closet-lint.html'),'utf8');
const helpers=source.split('/* ---------- mobile filter sheet ---------- */')[1].split('/* ---------- end mobile filter sheet ---------- */')[0];
function node(id){const attrs={},classes=new Set();return {id,attrs,isConnected:true,tagName:'BUTTON',style:{},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,v){if(v)classes.add(k);else classes.delete(k)},contains:k=>classes.has(k)},setAttribute(k,v){attrs[k]=v},getAttribute:k=>attrs[k]||null,focus(){context.document.activeElement=this;this.focused=true},addEventListener(name,fn){this.events[name]=fn},events:{}}}
let width=390;
const ids={filters:node('filters'),'filter-dialog':node('filter-dialog'),togglefilters:node('togglefilters')};
const home={insertBefore(element,next){assert.equal(next,'section');element.parentNode=this;this.restored=true}};
const done=node('filter-done'),root=node('html'),trigger=ids.togglefilters;
const filter=ids.filters,sheet=ids['filter-dialog'];filter.parentNode=home;filter.nextSibling='section';filter.scrollTop=125;filter.classList.add('collapsed');
filter.querySelector=()=>done;filter.contains=n=>n===done||n?.filterControl;
const group=node('colors');group.attrs['data-filter-group']='colors';
let currentChip=node('green');currentChip.attrs['data-focus-key']='Green';currentChip.filterControl=true;currentChip.closest=()=>group;
filter.querySelectorAll=selector=>selector==='[data-filter-group]'?[group]:[currentChip,done];group.querySelectorAll=()=>[currentChip];
sheet.appendChild=n=>{n.parentNode=sheet};sheet.showModal=()=>{sheet.open=true};sheet.close=()=>{sheet.open=false;sheet.events.close()};
const handlers={},documentHandlers={},viewportHandlers={};
const viewport={height:800,offsetTop:0,addEventListener:(key,fn)=>{viewportHandlers[key]=fn}};
const context={window:{innerHeight:800,matchMedia:()=>({matches:width<=820}),visualViewport:viewport,addEventListener:(key,fn)=>{handlers[key]=fn}},document:{activeElement:trigger,documentElement:root,addEventListener:(key,fn)=>{documentHandlers[key]=fn}},$:id=>ids[id],setTimeout:fn=>fn()};
vm.createContext(context);vm.runInContext(helpers,context);context.initMobileUI();
root.style.overflow='auto';context.openFilterSheet();
assert.equal(sheet.open,true);assert.equal(filter.parentNode,sheet);assert.equal(root.style.overflow,'hidden');assert.equal(done.focused,true);assert.equal(trigger.attrs['aria-expanded'],'true');
context.openFilterSheet();context.closeFilterSheet();
assert.equal(filter.parentNode,home);assert.equal(root.style.overflow,'auto');assert.equal(trigger.focused,true);assert.equal(trigger.attrs['aria-expanded'],'false');assert.ok(filter.classList.contains('collapsed'));
context.document.activeElement=currentChip;
const mark=context.filterBookmark();assert.equal(mark.group,'colors');assert.equal(mark.key,'Green');
currentChip=node('new-green');currentChip.attrs['data-focus-key']='Green';
filter.scrollTop=0;context.restoreFilterBookmark(mark);assert.equal(currentChip.focused,true);assert.equal(filter.scrollTop,125);
width=1200;context.openFilterSheet();assert.equal(sheet.open,false,'desktop filters do not become a modal');
width=390;context.document.activeElement=trigger;context.openFilterSheet();width=1200;handlers.resize();assert.equal(sheet.open,false);assert.equal(filter.parentNode,home);
width=390;context.document.activeElement={tagName:'INPUT'};viewport.height=480;viewportHandlers.resize();assert.ok(root.classList.contains('keyboard-open'));
context.document.activeElement=trigger;documentHandlers.focusin();assert.equal(root.classList.contains('keyboard-open'),false,'viewport shrink alone does not hide navigation');
console.log('Mobile helpers: modal mount/return, scroll lock, focus restoration, filter bookmarks, resize cleanup and keyboard state passed.');

width=1200;filter.classList.remove('collapsed');width=390;handlers.resize();assert.ok(filter.classList.contains('collapsed'),'desktop sidebar must not become an unrequested fixed overlay after resizing to mobile');assert.equal(sheet.open,false);context.openFilterSheet();handlers.resize();assert.equal(sheet.open,true,'resizing an intentionally open mobile sheet keeps it open');context.closeFilterSheet();
console.log('Breakpoint transition: desktop sidebar collapses on mobile without opening a phantom sheet.');
