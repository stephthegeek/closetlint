const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),{chromium}=require('playwright'),out=process.env.WEAR_ROLES_OUTPUT||fs.mkdtempSync('/tmp/closet-wear-role-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-sort-price-');function add(name,passed,details){checks.push({name,passed,details});if(!passed)throw Error(name+' '+JSON.stringify(details))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
for p in s.payload['base']['catalog']:p['wish']=False
s.payload['base']['catalog'][0].update(wearMore=True,wears=['2026-10-26','2026-10-27','2026-10-28'])
s.payload['collections']['trips']['review-trip']={'name':'Review trip','settings':{'start':'2026-11-30','end':'2026-12-02','dest':'Sample city'}}
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);

const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
for(const width of (process.env.WEAR_ROLES_REVIEW_FULL?[320,390,1366]:[390]))for(const skin of (process.env.WEAR_ROLES_REVIEW_FULL?['workshop','fieldnotes','editorial']:['workshop']))for(const theme of (process.env.WEAR_ROLES_REVIEW_FULL?['light','dark']:['dark'])){
 const id=`${width}-${skin}-${theme}`,ctx=await browser.newContext({viewport:{width,height:1000},isMobile:width<821,hasTouch:width<821,colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6000);
 await ctx.addInitScript(({skin,theme})=>localStorage.setItem('closetlint.display.v1',JSON.stringify({skin,theme})),{skin,theme});
 await page.clock.install({time:new Date('2026-10-28T12:00:00')});await page.route('**/api/sky-weather?**',r=>r.fulfill({json:{high:68,code:0,date:'2026-10-28'}}));
 await page.goto(base+'/#/closet');await page.locator('.cardbtn').first().waitFor();
 const item={id:'demo-01'};
 for(const [code,roles] of Object.entries({top:['Main top'],under:['Under another top'],layer:['Over another top'],either:['Main top','Over another top'],topunder:['Main top','Under another top'],underlayer:['Under another top','Over another top'],all:['Main top','Under another top','Over another top']})){
  if(!(width===390&&skin==='workshop'&&theme==='dark')&&!['topunder','underlayer','all'].includes(code))continue;
  await page.goto(base+'/?review='+Date.now()+'#/pieces/'+encodeURIComponent(item.id));const group=page.getByRole('group',{name:'Wear this as a…',exact:true});await group.waitFor();
  // Check desired choices first, so the one-choice minimum never blocks switching roles.
  for(const name of roles){const choice=group.getByRole('button',{name,exact:true});if(await choice.getAttribute('aria-pressed')!=='true')await choice.click();}
  for(const name of ['Main top','Under another top','Over another top'])if(!roles.includes(name)){const choice=group.getByRole('button',{name,exact:true});if(await choice.getAttribute('aria-pressed')==='true')await choice.click();}
  if(code==='topunder'&&width===390&&skin==='workshop'&&theme==='dark')await page.screenshot({path:path.join(out,'wear-roles-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.locator('#dlg[open]').waitFor({state:'hidden'});
  await page.goto(base+'/?review='+Date.now()+'#/pieces/'+encodeURIComponent(item.id));await group.waitFor();
  const checked=await group.getByRole('button').evaluateAll(ns=>ns.filter(n=>n.getAttribute('aria-pressed')==='true').map(n=>n.innerText.trim()).sort());
  add(id+' '+code+' persists after reload',JSON.stringify(checked)===JSON.stringify(roles.slice().sort()),checked);
 }
 const activeGroup=page.getByRole('group',{name:'Wear this as a…',exact:true});for(const name of ['Under another top','Over another top']){const choice=activeGroup.getByRole('button',{name,exact:true});if(await choice.getAttribute('aria-pressed')==='true')await choice.click();}const main=activeGroup.getByRole('button',{name:'Main top',exact:true});await main.focus();await page.keyboard.press('Space');add(id+' keyboard cannot leave wear positions empty',await main.getAttribute('aria-pressed')==='true');
 add(id+' supporting disclosure edges align',await page.locator('.photo-options').evaluate(n=>{const other=document.querySelector('.piece-supporting>.origin:last-child');if(!other)return false;const a=n.getBoundingClientRect(),b=other.getBoundingClientRect();return Math.abs(a.left-b.left)<1.1&&Math.abs(a.width-b.width)<1.1}));
 await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wear-role-options'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations);add(id+' role controls accessible',violations.length===0,violations);await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.locator('#dlg[open]').waitFor({state:'hidden'});
 await page.goto(base+'/#/closet');await page.locator('.cardbtn').first().waitFor();
 if(await page.locator('#fantbtn').getAttribute('aria-checked')!=='true')await page.locator('#fantbtn').click();
 await page.locator('#addbtn').click();await page.locator('#addmenu button').first().click();await page.getByRole('checkbox',{name:'Wishlist piece',exact:true}).waitFor();add(id+' adding defaults to owned even in Fantasy mode',!(await page.getByRole('checkbox',{name:'Wishlist piece',exact:true}).isChecked()));
 await page.goto(base+'/#/closet');await page.locator('.cardbtn').first().waitFor();
 add(id+' duplicate status shortcuts removed',await page.locator('#filters button').filter({hasText:/Wear more|Very hot|Hot\s*\d+$/}).count()===0);
 if(await page.locator('#togglefilters').isVisible())await page.locator('#togglefilters').click();const collection=page.locator('#filters>.collection-filter');await collection.waitFor();add(id+' collections expanded by default',await collection.evaluate(n=>n.open));await collection.locator('summary').click();await page.locator('#filters button').filter({hasText:/^No photo/}).click();add(id+' collection collapse survives filter refresh',await collection.evaluate(n=>!n.open));await page.locator('#filters button').filter({hasText:/^No photo/}).click();
 await page.goto(base+'/#/profile/sizes');const rings=page.locator('[data-size-key=ring]');await rings.waitFor();const seven=rings.getByRole('button',{name:'7',exact:true});const ringSaved=expected=>page.waitForFunction(async expected=>{const r=await fetch('/api/state',{headers:{'X-ClosetLint-Token':window.ClosetLintLocal.token}}),v=await r.json();return ((v.collections.profile.wear||{}).ring||[]).includes('7')===expected},expected);if(await seven.getAttribute('aria-pressed')==='true'){await seven.click();await ringSaved(false)}await seven.click();await ringSaved(true);await page.reload();await rings.waitFor();add(id+' ring preferences survive reload',await seven.getAttribute('aria-pressed')==='true');
 await page.evaluate(async()=>{const db=await window.ClosetLintRuntime.use('db');await db.collection('custom').doc('ring-six').set({name:'Review ring six',meta:'Jewelry',sub:'Rings',sizeKind:'ring',size:'6',colors:['silver']});await db.collection('custom').doc('ring-seven').set({name:'Review ring seven',meta:'Jewelry',sub:'Rings',sizeKind:'ring',size:'7',colors:['silver']});const r=await fetch('/api/state',{headers:{'X-ClosetLint-Token':window.ClosetLintLocal.token}}),state=await r.json();await db.collection('outfits').doc('demo-look').set({...state.collections.outfits['demo-look'],styles:['casual','party','date night','festival']})});
 await page.goto(base+'/#/closet');await page.locator('.cardbtn').first().waitFor();if(await page.locator('#togglefilters').isVisible())await page.locator('#togglefilters').click();const fits=page.locator('#filters button').filter({hasText:'Fits me'});await fits.click();add(id+' Fits me keeps chosen ring and excludes other fixed size',await page.locator('.card').filter({hasText:'Review ring seven'}).count()===1&&await page.locator('.card').filter({hasText:'Review ring six'}).count()===0);
 await page.goto(base+'/#/outfits');await page.locator('#of-filter-toggle').click();await page.locator('#of-filter-options').waitFor();add(id+' redundant outfit size filter removed',!(await page.locator('#of-filter-options').innerText()).includes('Has a piece in size'));if(width>600)add(id+' season uses intrinsic width',await page.locator('.of-filter-season').evaluate(n=>{const a=n.getBoundingClientRect(),b=document.querySelector('.of-filter-occasion').getBoundingClientRect();return Math.abs(a.top-b.top)<1&&b.left-a.right<=25&&b.width>a.width}));
 await page.goto(base+'/#/profile');const trip=page.locator('.almanac-trip');await trip.waitFor();await trip.hover();add(id+' larger trip title without hover underline',await trip.evaluate(n=>{const title=n.querySelector('.almanac-trip-copy>b');return parseFloat(getComputedStyle(title).fontSize)>=18&&getComputedStyle(title).textDecorationLine==='none'&&getComputedStyle(n).textDecorationLine==='none'}));
 add(id+' page reflows',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 add(id+' no browser errors',errors.length===0,errors);await ctx.close();console.log(id+' passed');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,source:'Disposable synthetic wardrobe'},null,2));console.log(JSON.stringify({checks:checks.length,failures:checks.filter(x=>!x.passed).length,out}));
}catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(e)},null,2));throw e}finally{await browser?.close();server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});
