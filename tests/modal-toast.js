// Undo/Retry must remain interactive in native modal dialogs and recover on close/rebuild.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),start=html.indexOf('function toastHost('),end=html.indexOf('\nfunction ',start+1);
function host(id,open=false){return {id,open,listeners:[],appendChild(n){n.parentNode=this},addEventListener(type,fn){this.listeners.push(fn)},closest(){return this.open?this:null}}}
const body=host('body'),a=host('piece',true),b=host('preview'),root={parentNode:body};let active=a;
const c={toastRoot:root,toastDialogs:new WeakSet(),document:{body,get activeElement(){return active},querySelectorAll:()=>[a,b].filter(n=>n.open)},$:()=>root};vm.createContext(c);vm.runInContext(html.slice(start,end),c);
assert.equal(c.toastHost().parentNode,a);c.toastHost();assert.equal(a.listeners.length,1);
b.open=true;active=b;assert.equal(c.toastHost().parentNode,b);b.open=false;active=a;b.listeners[0]();assert.equal(root.parentNode,a,'closing an inner modal keeps Undo in the remaining modal');
a.open=false;active=body;a.listeners[0]();assert.equal(root.parentNode,body);
a.open=true;active=a;c.toastHost();a.listeners[0]();assert.equal(root.parentNode,a,'a queued close event cannot detach a toast from a reopened dialog');
root.parentNode=null;c.toastHost();assert.equal(root.parentNode,a,'rebuilding a dialog cannot lose the reusable toast');
console.log('Modal toasts: active-dialog hosting, nested close, reopen race, and detached-node recovery pass.');
