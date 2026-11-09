const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.SCHEDULE_OUTPUT||fs.mkdtempSync('/tmp/closet-schedule-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser,activePage;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-schedule-fixture-');function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))}try{
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
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(0,'127.0.0.1',r)});const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});

for(const [width,skin,theme] of [[390,'fieldnotes','light'],[1280,'workshop','dark']]){
 const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:1000},hasTouch:width<821,isMobile:width<821,colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[],writes=[];activePage=page;page.setDefaultTimeout(12000);
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['PUT','POST','DELETE','PATCH'].includes(r.method())&&/\/api\/(doc|board|wear)/.test(r.url())&&!/\/api\/doc\/profile\/(daily-card|sky-daily)$/.test(r.url()))writes.push(r.url())});
 await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});await page.clock.install({time:new Date('2026-11-03T12:00:00-08:00')});await page.goto(base+'/#/calendar?month=2026-11');await page.locator('.schedule-agenda').waitFor();
 await page.goto(base+'/#/trips');await page.locator('.trips-overview').waitFor();
 check(id+' Trips excludes scheduled events',await page.locator('.trip-plan-card').count()===1&&!(await page.locator('#view-trip').innerText()).includes('birthday celebration'));
 check(id+' Trips has one creation action',await page.getByRole('button',{name:/Add trip/}).count()===1&&await page.getByRole('button',{name:/Add event/}).count()===0);
 await page.screenshot({path:path.join(out,id+'-trips.png'),fullPage:true});
 await page.goto(base+'/#/calendar?month=2026-11');await page.locator('.schedule-agenda').waitFor();
 const agenda=page.getByRole('button',{name:'Agenda view',exact:true}),month=page.getByRole('button',{name:'Month view',exact:true});
 check(id+' agenda default',await agenda.getAttribute('aria-pressed')==='true'&&await page.locator('.hcal').count()===0);
 check(id+' outline icons with labels',await page.locator('.schedule-views button svg').count()===2&&await page.locator('.schedule-views').innerText().then(t=>t.trim()===''));
 check(id+' both same-day plans visible',await page.locator('.schedule-agenda').innerText().then(t=>t.includes('An afternoon appointment')&&t.includes('A rather elaborate birthday celebration')));
 check(id+' unassigned trip days remain unassigned',await page.locator('.schedule-unplanned').count()===2);
 check(id+' each trip date links to its wardrobe',await page.locator('.schedule-trip-link').count()===3);
 check(id+' all seven days shown',await page.locator('.schedule-day').count()===7);
 check(id+' generic event labels replace repeated names',await page.locator('.schedule-context-label').count()===2&&await page.locator('.schedule-context-label').allTextContents().then(xs=>xs.every(x=>x==='Scheduled outfit')));
 check(id+' prominent dates',await page.locator('.schedule-day-label b').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=22));
 await page.getByRole('button',{name:/Plan outfit for Tuesday, November 3, 2026/}).click();check(id+' empty day action opens dated scheduler',await page.locator('#cdlg input[aria-label=Date]').inputValue()==='2026-11-03');await page.keyboard.press('Escape');
 const previews=page.locator('.schedule-preview .mini');await previews.first().scrollIntoViewIfNeeded();await page.locator('.schedule-preview .mini[data-preview-state=ready]').first().waitFor();
 check(id+' no viewport overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 check(id+' no copy overflow',await page.locator('.schedule-entry-copy,.schedule-context,.schedule-views').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)));
 const agendaWidth=await page.locator('#ofbody').evaluate(n=>n.getBoundingClientRect().width);
 await page.screenshot({path:path.join(out,id+'-agenda.png'),fullPage:true});
 await page.getByRole('button',{name:/Evening outfit — .*November 4/}).click();check(id+' existing day details open',await page.locator('#cdlg[open]').count()===1);await page.keyboard.press('Escape');
 await month.click();check(id+' original month retained',await page.locator('.hcal .hday:not(.blank)').count()===30&&await month.getAttribute('aria-pressed')==='true');
 check(id+' month toggle retains focus',await month.evaluate(n=>n===document.activeElement));
 const monthWidth=await page.locator('#ofbody').evaluate(n=>n.getBoundingClientRect().width);check(id+' shared existing calendar width',monthWidth<=640&&Math.abs(monthWidth-agendaWidth)<1);
 check(id+' upcoming duplicate removed',await page.locator('.uplist').count()===0);
 await page.locator('.hcal .hday[aria-label*="November 4, 2026"]').click();check(id+' selected day stays inline',await page.locator('#cdlg[open]').count()===0&&await page.locator('.schedule-selected-day').innerText().then(t=>t.includes('A rather elaborate birthday celebration')&&t.includes('An afternoon appointment')));
 await page.locator('.hcal .hday[aria-label*="November 3, 2026"]').click();check(id+' empty selected day add action',await page.locator('.schedule-selected-day').innerText().then(t=>t.includes('Nothing planned yet.'))&&await page.locator('.schedule-selected-day').getByRole('button',{name:/Plan outfit for/}).count()===1);
 await page.screenshot({path:path.join(out,id+'-month.png'),fullPage:true});await agenda.click();
 check(id+' switch preserves starting date',await page.locator('input[aria-label="Choose schedule date"]').inputValue()==='2026-11-03');
 await page.getByRole('button',{name:'Next week',exact:true}).click();check(id+' empty week keeps seven add actions',await page.locator('.schedule-day.empty').count()===7&&await page.locator('.schedule-empty-day button').count()===7);await page.getByRole('button',{name:'Today',exact:true}).click();
 await page.locator('input[aria-label="Choose schedule date"]').fill('2026-10-30');await page.locator('input[aria-label="Choose schedule date"]').press('Tab');await page.waitForURL(/month=2026-10/);
 check(id+' earlier dates include logged outfits',await page.locator('.schedule-logged').count()===1);
 await page.getByRole('button',{name:'Next week',exact:true}).click();check(id+' week crosses month correctly',await page.locator('input[aria-label="Choose schedule date"]').inputValue()==='2026-11-06');
 await month.click();await page.getByRole('link',{name:'Closet',exact:true}).click();await page.goBack();await page.locator('.schedule-views').waitFor();check(id+' Back restores chosen mode',await month.getAttribute('aria-pressed')==='true');
 await agenda.click();await page.getByRole('button',{name:'Today',exact:true}).click();await page.getByRole('button',{name:'Plan outfit',exact:true}).click();check(id+' existing scheduler opens',await page.getByRole('heading',{name:'Schedule a saved outfit',exact:true}).isVisible());await page.keyboard.press('Escape');
 check(id+' no wardrobe mutations from browsing',writes.length===0,writes);check(id+' no page errors',errors.length===0,errors);await ctx.close();console.log(id+' passed');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,failures:0,output:out}));
}catch(error){if(activePage){await activePage.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error('PAGE',activePage.url(),(await activePage.locator('body').innerText().catch(()=>'' )).slice(0,2200))}fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(error)},null,2));throw error}finally{await browser?.close();server?.kill()}})().catch(error=>{console.error(error);process.exit(1)});
