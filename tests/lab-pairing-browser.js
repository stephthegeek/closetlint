const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),{chromium}=require('playwright'),out=process.env.LAB_PAIRING_OUTPUT||fs.mkdtempSync('/tmp/closet-pairing-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-pairing-data-');function add(name,passed,details){checks.push({name,passed,details});if(!passed)throw Error(name+' '+JSON.stringify(details))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
a,b=s.payload['base']['catalog'][:2]
a.update(id='top',name='A very long black cotton everyday top for checking wrapped names and controls',meta='Tops',sub='Tees',colors=['black'],wish=False)
b.update(id='pants',name='Black jeggings',meta='Bottoms',sub='Leggings',colors=['black'],wish=False)
s.payload['base']['catalog']=[a,b]
s.payload['collections']['blocks']={'older':{'kind':'similar','a':'top','b':'pants','rule':{'version':1,'left':{'meta':'Tops','sub':'Tees'},'right':{'meta':'Bottoms','sub':'Leggings'}}}}
s.payload['collections']['ratings']={'historic':{'ids':['top','pants'],'r':0,'t':1}}
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
for(const width of (process.env.LAB_PAIRING_FULL?[390,768,1366]:[390]))for(const skin of (process.env.LAB_PAIRING_FULL?['workshop','fieldnotes','editorial']:['workshop']))for(const theme of (process.env.LAB_PAIRING_FULL?['light','dark']:['dark'])){
 const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:1000},hasTouch:width<821,isMobile:width<821,colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(9000);
 await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});await page.goto(base+'/#/lab');
 const state=()=>page.evaluate(async()=>{const r=await fetch('/api/state',{headers:{'X-ClosetLint-Token':window.ClosetLintLocal.token}});return r.json()});
 const blocks=async()=> (await state()).collections.blocks;
 const reject=page.getByRole('button',{name:/Doesn’t work/});await reject.waitFor();
 add(id+' experimental garment preference does not suppress outfits',await reject.isVisible());
 let failed=false;await page.route('**/api/doc/blocks/**',async route=>{if(!failed&&route.request().method()==='PUT'){failed=true;return route.fulfill({status:503,json:{error:'Synthetic pair save failure'}})}return route.continue()});
 await reject.click();await page.getByRole('heading',{name:'Could not save this pair'}).waitFor();add(id+' direct pair action needs no technical form',await page.getByRole('radio').count()===0&&await page.locator('.pairing-fields').count()===0);add(id+' failed save leaves only the older preference',Object.keys(await blocks()).length===1);
 await page.screenshot({path:path.join(out,id+'-retry.png'),fullPage:true});await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#dlg'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact})));add(id+' retry dialog accessibility',violations.length===0,violations);
 await page.unroute('**/api/doc/blocks/**');await page.getByRole('button',{name:'Try again',exact:true}).click();await page.locator('#dlg').waitFor({state:'hidden'});add(id+' explicit pair saved only after acknowledgement',!!(await blocks())['pants+top']);
 const back=page.getByRole('button',{name:'Back to the previous outfit',exact:true});await back.waitFor();await page.route('**/api/doc/blocks/**',r=>r.request().method()==='DELETE'?r.fulfill({status:503,json:{error:'Synthetic undo failure'}}):r.continue());await back.click();await page.locator('#toast').filter({hasText:'Could not undo'}).waitFor();add(id+' failed Undo retains preference and retry',!!(await blocks())['pants+top']&&await back.isVisible());await page.unroute('**/api/doc/blocks/**');await back.click();await reject.waitFor();add(id+' Undo returns original pair safely',!(await blocks())['pants+top']);
 await reject.click();await page.locator('#dlg').waitFor({state:'hidden'});await page.getByRole('button',{name:/My taste/}).first().click();await page.getByText(/Earlier garment preference \(paused\)/).waitFor();add(id+' earlier rules remain visible but cannot be edited',await page.getByRole('button',{name:'Edit preference',exact:true}).count()===0&&await page.getByRole('button',{name:'Remove old preference',exact:true}).count()===1);
 await page.getByRole('button',{name:'Allow again',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#view-lab').textContent.includes('1–1 of 1')||!document.querySelector('#view-lab').textContent.includes('Allow again'));add(id+' Allow again removes exact exclusion',!(await blocks())['pants+top']);
 const end=await state();add(id+' historical ratings and experimental record unchanged',JSON.stringify(end.collections.ratings)===JSON.stringify({historic:{ids:['top','pants'],r:0,t:1}})&&!!end.collections.blocks.older);
 add(id+' no browser errors',errors.length===0,errors);await ctx.close();console.log(id+' passed');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,failures:0}));
}catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(e)},null,2));throw e}finally{await browser?.close();server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});
