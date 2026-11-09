const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.PHOTO_OPTIONS_OUTPUT||fs.mkdtempSync('/tmp/closet-photo-options-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser,activePage;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-photo-options-fixture-');function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
cols=s.payload['collections']
o=cols['outfits']['demo-look']
o['name']='Evening outfit'
o['plans']=[{'k':'event-old','d':'2026-10-31','name':'Past party'},{'k':'event-next','d':'2026-11-04','name':'A rather elaborate birthday celebration','loc':'The botanical garden'},{'k':'event-later','d':'2026-11-20','name':'Later event'}]
ids=[p['id'] for p in o['pieces']]
cols['ratings']['test-love']={'ids':ids,'r':1,'t':1793635200000}
cols['trips']={'upcoming':{'name':'A weekend away in the city','settings':{'kind':'trip','start':'2026-11-06','end':'2026-11-08','dest':'Portland'},'plan':{'outfits':[{'ids':ids,'pin':True,'fors':'d:2026-11-06'}]}}}
import copy
second=copy.deepcopy(o);second['name']='Afternoon outfit';second['plans']=[{'k':'same-day','d':'2026-11-04','name':'An afternoon appointment'},{'k':'blank-title','d':'2026-11-05','name':''},{'k':'same-title','d':'2026-11-09','name':'Afternoon outfit'}];cols['outfits']['second-look']=second
o['wearLog']=[{'d':'2026-11-01','ids':ids}]
cols['trips']['upcoming']['plan']['outfits'].append({'ids':ids,'pin':True,'fors':'any'})
p=s.payload['base']['catalog'][0]
alt=s.payload['base']['catalog'][1]
p['photos'].append(dict(alt['photos'][0]))
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(0,'127.0.0.1',r)});const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});


for(const [width,skin,theme] of [[390,'workshop','dark'],[1280,'fieldnotes','light']]){
 const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];activePage=page;page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});
 await page.goto(base+'/#/pieces/demo-01');await page.locator('#dlg[open]').waitFor();await page.locator('.photo-options>summary').click();
 await page.locator('.piece-photo-thumb').nth(1).click();
 const selected=await page.locator('.piece-photo-thumb[aria-pressed=true]').getAttribute('data-photo-key');
 await page.getByText('Original listing',{exact:true}).click();
 for(const [label,value] of [['Thumbnail framing','cover'],['Photo type','detail']]){
  const field=page.getByRole('combobox',{name:label,exact:true});await field.focus();const scroll=await page.locator('#dlg>.dlg').evaluate(n=>n.scrollTop);
  const response=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/api/doc/edits/demo-01'));
  await field.selectOption(value);await response;
  // Exercise the delayed subscription refresh as well as the save callback.
  await page.waitForTimeout(200);
  check(id+' '+label+' keeps Photo options open',await page.locator('.photo-options').evaluate(n=>n.open));
  check(id+' '+label+' keeps selected photo',await page.locator('.piece-photo-thumb[aria-pressed=true]').getAttribute('data-photo-key')===selected);
  check(id+' '+label+' keeps focus',await field.evaluate(n=>n===document.activeElement));
  check(id+' '+label+' keeps scroll',await page.locator('#dlg>.dlg').evaluate((n,y)=>Math.abs(n.scrollTop-y)<3,scroll));
  check(id+' '+label+' keeps other disclosures open',await page.locator('.piece-supporting>.origin').last().evaluate(n=>n.open));
  check(id+' '+label+' keeps saved value',await field.inputValue()===value);
 }
 for(const [label,value,saved] of [['Thumbnail framing','contain','cover'],['Photo type','model','detail']]){
  await page.route('**/api/doc/edits/demo-01',r=>r.fulfill({status:503,json:{error:'Synthetic photo save failure'}}),{times:1});
  const field=page.getByRole('combobox',{name:label,exact:true});await field.focus();await field.selectOption(value);await page.waitForTimeout(200);
  check(id+' failed '+label+' keeps section and focus',await page.locator('.photo-options').evaluate(n=>n.open)&&await field.evaluate(n=>n===document.activeElement));
  check(id+' failed '+label+' shows saved value',await field.inputValue()===saved);
 }
 check(id+' no browser errors',errors.length===0,errors);await ctx.close();console.log(id+' passed');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,failures:0,output:out}));
}catch(error){if(activePage){await activePage.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error('PAGE',activePage.url(),(await activePage.locator('body').innerText().catch(()=>'' )).slice(-2200))}fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(error)},null,2));throw error}finally{await browser?.close();server?.kill()}})().catch(error=>{console.error(error);process.exit(1)});
