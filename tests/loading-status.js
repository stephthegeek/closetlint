const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/scripts/loading-status.js','utf8'),html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
const start=html.indexOf('/* BEGIN LOADING STATUS (source: app/scripts/loading-status.js) */\n')+'/* BEGIN LOADING STATUS (source: app/scripts/loading-status.js) */\n'.length;
assert.equal(html.slice(start,html.indexOf('/* END LOADING STATUS */',start)),source);
const context={};vm.createContext(context);vm.runInContext(source.slice(source.indexOf('  function mode('),source.indexOf('  function refresh(')),context);
function status(text,extra={}){return {textContent:text,tagName:'P',hidden:false,getAttribute(){return null},closest(){return null},querySelector(){return null},...extra}}
for(const verb of ['Loading','Deleting','Saving','Preparing','Checking','Uploading','Downloading','Restoring','Finding','Exporting','Working','Autosaving'])assert.equal(context.mode(status(verb+' photos…')),'active',verb);
assert.equal(context.mode(status('Waiting for earlier photos…')),'queued');
for(const text of ['Saved','✓ Photo results received. Review before saving.','Saving stopped. Retry below.','Saving failed…','Checking timed out…','Could not save photos…','Preparing saves a snapshot in your wardrobe.','Save…','Loading photos is optional.'])assert.equal(context.mode(status(text)),'',text);
assert.equal(context.mode(status('Saving…',{hidden:true})), '');
assert.equal(context.mode(status('Saving…',{querySelector:()=>({})})), '', 'nested live status owns its own indicator');
assert.equal(context.mode(status('Saving…',{closest:()=>({})})), '', 'photo preview owns its existing indicator');
assert.equal(context.mode(status('Saving…',{tagName:'BUTTON',disabled:false})), '');
assert.equal(context.mode(status('Saving…',{tagName:'BUTTON',disabled:true})), 'active');
assert.equal(context.mode(status('Pending',{getAttribute:k=>k==='data-loading'?'queued':null})), 'queued');
assert.equal(context.mode(status('Saving…',{getAttribute:k=>k==='data-loading'?'':null})), '');
// Parse every executable inline script; this includes the portable application, not only the new module.
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!/\b(?:src|type)\s*=/.test(m[1]))new vm.Script(m[2]);}
console.log('Loading status: ongoing/queued messages, errors, completed states, nested status ownership, button states, and portable syntax pass.');
