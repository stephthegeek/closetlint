// Text copying must work from a modal on local HTTP as well as secure origins.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
const source=html.slice(html.indexOf('function selectCopyField('),html.indexOf('function storedListText('));
function fixture({api,allowed=true,modal=true}={}){
 let selected,copied='',restored=0,attempts=0;
 const host={children:[],appendChild(n){this.children.push(n);n.parent=this}};
 const active={isConnected:true,focus(options){assert.equal(options.preventScroll,true);restored++}};
 const c={Promise,navigator:api?{clipboard:{writeText:api}}:{},document:{activeElement:active,body:modal?{appendChild(){throw Error('Modal copy must not use the inert body')}}:host,querySelectorAll:()=>modal?[host]:[],execCommand(command){attempts++;assert.equal(command,'copy');assert.equal(host.children.length,1);assert.equal(selected.selectionEnd,selected.value.length);copied=selected.value;return allowed}},el(tag,props){return {tag,...props,focus(){selected=this},select(){},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end},remove(){this.parent.children.splice(this.parent.children.indexOf(this),1)}}},toast(){}};
 vm.createContext(c);vm.runInContext(source,c);
 return {c,host,get copied(){return copied},get restored(){return restored},get attempts(){return attempts}};
}
(async()=>{
 const text='A full prompt\nwith multiple lines, emoji 🧥, and “quotes”.';
 const http=fixture();const pending=http.c.copyClipboard(text);assert.equal(http.attempts,1,'HTTP fallback executes within the click gesture, before awaiting');assert.equal(await pending,true);assert.equal(http.copied,text);assert.equal(http.host.children.length,0);assert.equal(http.restored,1);
 let secureText;const secure=fixture({api:async text=>{secureText=text}});assert.equal(await secure.c.copyClipboard(text),true);assert.equal(secureText,text);assert.equal(secure.attempts,0);
 const denied=fixture({api:async()=>{throw Error('Denied')}});assert.equal(await denied.c.copyClipboard(text),true,'denied Clipboard API tries the modal fallback');
 const blocked=fixture({allowed:false});assert.equal(await blocked.c.copyClipboard(text),false,'never report success when the browser refuses copying');assert.equal(blocked.host.children.length,0);
 const body=fixture({modal:false});assert.equal(await body.c.copyClipboard(text),true,'non-modal lists share the fallback');
 const events={};let selections=0;const field={value:text,scrollTop:140,scrollLeft:0,addEventListener:(type,fn)=>events[type]=fn,focus(){},select(){selections++;this.scrollTop=999},setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b}};
 http.c.promptSelectOnTap(field);events.pointerdown({clientX:10,clientY:10,timeStamp:0});events.click({timeStamp:100});assert.equal(selections,1);assert.equal(field.selectionEnd,text.length);assert.equal(field.scrollTop,140,'selecting does not move the prompt scroll position');
 events.pointerdown({clientX:10,clientY:10,timeStamp:200});events.pointermove({clientX:10,clientY:80});events.click({timeStamp:300});assert.equal(selections,1,'swiping through a prompt does not select it');
 events.pointerdown({clientX:10,clientY:10,timeStamp:400});events.click({timeStamp:1100});assert.equal(selections,1,'long press remains available to the native copy menu');
 events.pointerdown({clientX:10,clientY:10,timeStamp:1200});events.pointercancel();events.click({timeStamp:1300});assert.equal(selections,1,'a cancelled scrolling gesture cannot select');
 console.log('Clipboard: local HTTP, secure API, denied API, modal focus, exact multiline text, cleanup, and honest failure status pass.');
})().catch(e=>{console.error(e);process.exit(1)});
