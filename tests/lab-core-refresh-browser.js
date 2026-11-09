const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.LAB_REFRESH_OUTPUT||fs.mkdtempSync('/tmp/closet-lab-refresh-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-lab-refresh-fixture-');function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
photos=s.payload['base']['catalog']
rows=[]
for i,name in enumerate(['Top A','Top B','Top C','Bottom A','Bottom B']):
 p=dict(photos[i%len(photos)],id='refresh-'+str(i),name=name,meta='Tops' if i<3 else 'Bottoms',sub='Blouses' if i<3 else 'Pants',colors=['black'],styles=['casual'],seasons=['spring','summer','fall','winter'],statement='plain',material=['cotton'],pattern=['solid'],sleeve='long',labAs='top' if i<3 else '',layerNeed='none',wish=False,stored=False,hidden=False)
 rows.append(p)
s.payload['base']['catalog']=rows
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(0,'127.0.0.1',r)});const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
for(const width of [390,768,1366])for(const skin of ['workshop','fieldnotes','editorial'])for(const theme of ['light','dark']){
const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:950},hasTouch:width<821,isMobile:width<821,colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[],writes=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['PUT','POST','DELETE','PATCH'].includes(r.method())&&/\/api\/(doc|board|wear)/.test(r.url()))writes.push(r.url())});
await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});await page.goto(base+'/#/lab');const top=page.locator('[data-core-slot=top]'),bottom=page.locator('[data-core-slot=bottom]');await top.waitFor();
const topName=()=>top.locator('.otile b').innerText(),bottomName=()=>bottom.locator('.otile b').innerText();let beforeTop=await topName(),beforeBottom=await bottomName();
check(id+' one refresh per core piece',await page.locator('.lab-core-piece button').count()===2);check(id+' core has no remove control',await page.locator('.lab-core-piece').getByRole('button',{name:/Leave out/}).count()===0);
await top.getByRole('button',{name:/Refresh top:/}).click();let refreshedTop=await topName();check(id+' top changes while bottom stays',refreshedTop!==beforeTop&&await bottomName()===beforeBottom);check(id+' refresh keeps keyboard focus',await top.getByRole('button',{name:/Refresh top:/}).evaluate(n=>n===document.activeElement));
await page.keyboard.press('Enter');check(id+' keyboard refresh changes only top',await topName()!==refreshedTop&&await bottomName()===beforeBottom);await page.getByRole('button',{name:'Back to the previous outfit',exact:true}).click();check(id+' Back restores refreshed outfit',await topName()===refreshedTop&&await bottomName()===beforeBottom);
await bottom.getByRole('button',{name:/Refresh bottom:/}).click();check(id+' bottom changes while top stays',await bottomName()!==beforeBottom&&await topName()===refreshedTop);
check(id+' page fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));check(id+' controls have touch targets',await page.locator('.lab-core-piece>.accbtns button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44})));
if(width===1366&&skin==='workshop'&&theme==='dark'||width===390&&skin==='editorial'&&theme==='light'||width===768&&skin==='fieldnotes'&&theme==='light')await page.screenshot({path:path.join(out,id+'.png'),fullPage:true});
await top.locator('.otile').press('Enter');check(id+' details keyboard does not refresh',await page.locator('#dlg').isVisible());await page.keyboard.press('Escape');check(id+' current combination survives details',await topName()===refreshedTop);
await page.getByText('Adjust the experiment',{exact:true}).click();await page.getByText('Anchor piece',{exact:false}).click();await page.getByRole('button',{name:'Top A',exact:true}).click();check(id+' selected anchor cannot refresh',await top.getByRole('button',{name:/Refresh top:/}).isDisabled());await bottom.getByRole('button',{name:/Refresh bottom:/}).click();check(id+' companion refresh preserves anchor',await topName()==='Top A');
check(id+' no mutation requests',writes.length===0,writes);check(id+' no browser errors',errors.length===0,errors);await ctx.close();console.log(id+' passed');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,failures:0,output:out}));
}catch(error){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(error)},null,2));throw error}finally{await browser?.close();server?.kill()}})().catch(error=>{console.error(error);process.exit(1)});
