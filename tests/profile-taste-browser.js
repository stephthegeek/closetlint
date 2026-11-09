const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.PROFILE_TASTE_OUTPUT||fs.mkdtempSync('/tmp/closet-profile-taste-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-profile-taste-fixture-');function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source();rows=s.payload['base']['catalog'];ratings={}
rows.append(dict(rows[0],id='demo-extra-top',name='Another black tee'))
for i,top in enumerate([0,1,len(rows)-1]):
 for j,bottom in enumerate([2,3,4]):
  n=i*3+j;ratings['r'+str(n)]={'ids':[rows[top]['id'],rows[bottom]['id']],'r':1 if n<5 else -1,'t':1793635200000+n}
s.payload['collections']['ratings']=ratings
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(0,'127.0.0.1',r)});const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
for(const skin of ['workshop','fieldnotes','editorial'])for(const theme of ['light','dark']){
const width=theme==='light'?390:1366,id=skin+'-'+theme,ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[],writes=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['PUT','POST','DELETE','PATCH'].includes(r.method())&&/\/api\/(doc|board|wear)/.test(r.url()))writes.push(r.url())});await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});await page.clock.install({time:new Date('2026-11-02T12:00:00-08:00')});
const kinds=new Set(),features=new Set();let lastKind;
for(let day=2;day<=(skin==='workshop'&&theme==='dark'?17:4);day++){
await page.clock.setSystemTime(new Date('2026-11-'+String(day).padStart(2,'0')+'T12:00:00-08:00'));await page.goto(base+'/#/profile');const card=page.locator('.almanac-taste');await card.waitFor();await page.waitForFunction(()=>document.querySelector('.almanac-taste')?.dataset.tasteKind!=='empty');const kind=await card.getAttribute('data-taste-kind'),feature=await card.getAttribute('data-taste-feature');kinds.add(kind);if(feature)features.add(feature);check(id+' alternating day '+day,!lastKind||(kind==='love')!==(lastKind==='love'),{kind,lastKind});lastKind=kind;
const content=await card.innerText();await page.reload();await card.waitFor();check(id+' refresh stable '+day,await card.innerText()===content);check(id+' card fits '+day,await card.evaluate(n=>n.scrollWidth<=n.clientWidth+1));check(id+' viewport fits '+day,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
if(kind!=='love'){
 check(id+' insight has existing counts '+day,await card.locator('.taste-counts').count()===1);await card.getByRole('button',{name:/See rated outfits for/}).click();await page.waitForURL('**/#/lab');const dialog=page.locator('dialog.taste-examples[open]');await dialog.waitFor();check(id+' opens matching evidence '+day,await dialog.getByRole('heading',{level:2}).innerText().then(t=>t.length>0));await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.goto(base+'/#/profile');await card.waitFor();if(day===2||skin==='workshop'&&theme==='dark'){await card.scrollIntoViewIfNeeded();await card.screenshot({path:path.join(out,id+'-'+day+'-'+kind+'.png')})}
}else{check(id+' latest Love stays available '+day,content.toLowerCase().includes('recently loved'));}
}
check(id+' both daily variants',kinds.has('love')&&kinds.size>=2);if(skin==='workshop'&&theme==='dark'){check('all existing insight types rotate',kinds.has('positive')&&kinds.has('piece')&&kinds.has('passed'),[...kinds]);check('different insights rotate',features.size>=3,[...features])}check(id+' no writes',writes.length===0,writes);check(id+' no errors',errors.length===0,errors);await ctx.close();console.log(id+' passed');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,failures:0,output:out}));
}catch(error){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(error)},null,2));throw error}finally{await browser?.close();server?.kill()}})().catch(error=>{console.error(error);process.exit(1)});
