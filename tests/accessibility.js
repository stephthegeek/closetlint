// Real-browser accessibility regression check. Uses a disposable synthetic wardrobe only.
// npm run test:a11y; --report-only reports all debt without the regression gate.
// CHROMIUM_PATH may select an installed Chrome; otherwise use Playwright Chromium.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const crypto=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.A11Y_OUTPUT||path.join(os.tmpdir(),process.argv.includes('--preferences')?'closetlint-accessibility-preferences.json':process.argv.includes('--interactions')||process.env.A11Y_INTERACTIONS_ONLY?'closetlint-accessibility-interactions.json':'closetlint-accessibility-report.json'));
const appHash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'app/closet-lint.html'))).digest('hex');
const initialHash=appHash();
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'closetlint-a11y-'));
const python=process.env.PYTHON||'python3';
const scenarios=[
 ['closet','/closet'],['piece','/pieces/demo-01'],['outfits','/outfits'],['outfit-preview','/outfits/demo-look'],
 ['calendar','/calendar?month=2026-10'],['board','/board'],['lab','/lab'],['wishlist','/wishlist-ranking'],
 ['trips','/trips'],['trip-wizard','/trips/a11y-trip'],['sky','/sky'],['sky-catalog','/sky/catalog'],
 ['measurements','/closet',async p=>{await p.locator('#menubtn').click();await p.locator('#appmenu button').filter({hasText:'Sizes & fit'}).click()}],['settings','/closet',async p=>{await p.locator('#menubtn').click();await p.locator('#appmenu button').filter({hasText:'View settings'}).click()}],
 ['import','/import'],['tidy-photos','/tidy-photos'],['oracle','/oracle'],
 ['day-dialog','/calendar?month=2026-10',p=>p.locator('button.hday').nth(27).click()],
 
 ['add-piece','/closet',async p=>{await p.locator('#addbtn').click();await p.locator('#addmenu button').first().click()}],['setup','/closet',async p=>{await p.locator('#menubtn').click();await p.locator('#appmenu button').filter({hasText:'Utilities'}).click();await p.locator('#appmenu button').filter({hasText:'Getting started'}).click()}],
 ['collections','/collections'],['menu','/closet',p=>p.locator('#menubtn').click()]
];
async function freePort(){const server=net.createServer();await new Promise((yes,no)=>server.once('error',no).listen(0,'127.0.0.1',yes));const n=server.address().port;await new Promise(r=>server.close(r));return n}
function runPython(code){const p=spawnSync(python,['-c',code],{cwd:root,encoding:'utf8'});if(p.status!==0)throw Error(p.stderr||p.stdout)}
function key(row){return JSON.stringify([row.skin,row.appearance,row.viewport,row.scenario,row.rule,row.target])}
(async()=>{let server,browser;const results=[],errors=[],manual=[];
 try{
  runPython(`import sys\nfrom pathlib import Path\nsys.path[:0]=['tools','runtime']\nfrom create_demo import demo_source\nfrom storage import Store\ns=demo_source()\ns.payload['base']['catalog'][0]['wears']=['2026-10-28']\ns.payload['collections']['trips']['a11y-trip']={'name':'Sample weekend','settings':{'start':'2026-11-05','end':'2026-11-07','dest':'Sample city'},'step':2}\nStore(Path(${JSON.stringify(fixture)})).restore(s)`);
  const port=await freePort(),base='http://127.0.0.1:'+port;
  server=spawn(python,['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let log='';server.stderr.on('data',d=>log+=d);server.stdout.on('data',d=>log+=d);
  let ready=false;for(let i=0;i<100;i++){try{const r=await fetch(base);if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}if(!ready)throw Error('Synthetic server did not start: '+log);
  browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
  if(process.argv.includes('--preferences')){const checks=await require('./accessibility-extras').checkPreferences(browser,base,out);if(checks.some(x=>!x.passed))process.exitCode=1;console.log(JSON.stringify({checks:checks.length,failures:checks.filter(x=>!x.passed)},null,2));return}
  if(process.argv.includes('--contrast-review')){await require('./accessibility-extras').reviewContrast(browser,base,out);console.log('Review sheet: '+path.join(out,'index.html'));return}
  if(process.argv.includes('--target-details')){
   const context=await browser.newContext({viewport:{width:390,height:900},colorScheme:'light'}),page=await context.newPage();await page.goto(base+'/#/closet');await page.waitForSelector('.cardbtn');await page.evaluate(()=>{document.documentElement.dataset.skin='workshop';document.documentElement.dataset.theme='light'});await scenarios.find(s=>s[0]==='add-piece')[2](page);
   const data=await page.locator('dialog[open] button[data-focus-key="Orange"]').evaluate(n=>{const r=n.getBoundingClientRect(),parents=[];for(let p=n.parentElement;p;p=p.parentElement){const c=getComputedStyle(p);if(/auto|scroll|hidden/.test(c.overflowY)){const b=p.getBoundingClientRect();parents.push({tag:p.tagName,id:p.id,className:p.className,overflowY:c.overflowY,top:b.top,bottom:b.bottom,scrollTop:p.scrollTop})}}return {height:r.height,top:r.top,bottom:r.bottom,parents}});await page.screenshot({path:out.replace(/\.json$/,'.png')});data.afterScrolling=await page.locator('dialog[open] button[data-focus-key="Orange"]').evaluate(n=>{n.scrollIntoView({block:'center',behavior:'instant'});const r=n.getBoundingClientRect();return {height:r.height,top:r.top,bottom:r.bottom,centerReceivesPointer:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===n}});fs.writeFileSync(out,JSON.stringify(data,null,2));console.log(JSON.stringify(data));await context.close();return;
  }
  if(process.env.A11Y_INTERACTIONS_ONLY||process.argv.includes('--interactions')){
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
   await page.goto(base+'/#/closet');await page.waitForSelector('.cardbtn');
   const checks=[];for(const width of [390,1366]){await page.setViewportSize({width,height:900});await page.goto(base+'/#/closet');await page.waitForSelector('.cardbtn');await page.locator('#menubtn').focus();await page.keyboard.press('Enter');await page.waitForSelector('#appmenu:not(.hide)');await page.keyboard.press('Escape');
   checks.push({name:'Menu opens with Enter; Escape closes it and returns focus at '+width+'px',passed:await page.locator('#menubtn').evaluate(n=>document.activeElement===n)&&await page.locator('#appmenu').evaluate(n=>n.classList.contains('hide'))});
   await page.goto(base+'/#/calendar?month=2026-10');await page.locator('button.hday').nth(27).focus();await page.keyboard.press('Enter');await page.waitForSelector('#cdlg[open]');await page.keyboard.press('Escape');
   checks.push({name:'Day details opens with Enter; Escape closes it and returns focus at '+width+'px',passed:await page.locator('button.hday').nth(27).evaluate(n=>document.activeElement===n)&&await page.locator('#cdlg').evaluate(n=>!n.open)});
   await page.goto(base+'/#/board');await page.waitForSelector('#board .piece');
   const piece=page.locator('#board .piece').first();let keyboardMoves=false;if(await piece.evaluate(n=>n.tabIndex>=0)){const before=await piece.evaluate(n=>[n.style.left,n.style.top]);await piece.focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');keyboardMoves=await piece.evaluate((n,before)=>n.style.left!==before[0]||n.style.top!==before[1],before)}
   checks.push({name:'Board pieces can be selected and moved with the keyboard at '+width+'px',passed:keyboardMoves});
   const geometry=await piece.evaluate(n=>({left:n.style.left,width:n.style.width,transform:n.style.transform}));await piece.press('+');await piece.press(']');const changed=await piece.evaluate(n=>({left:n.style.left,width:n.style.width,transform:n.style.transform}));checks.push({name:'Board piece keyboard resize and rotate at '+width+'px',passed:changed.width!==geometry.width&&changed.transform!==geometry.transform});await page.evaluate(()=>window.ClosetLintRuntime.flush());await page.reload();await page.waitForSelector('#board .piece');await page.waitForTimeout(300);checks.push({name:'Keyboard board changes survive reload at '+width+'px',passed:await page.locator('#board .piece').first().evaluate((n,v)=>n.style.left===v.left&&n.style.width===v.width&&n.style.transform===v.transform,changed)});
   const before=await page.locator('#board .piece').count();await page.locator('#board .piece').first().focus();await page.keyboard.press('Tab');checks.push({name:'Tab reaches the selected piece Remove button at '+width+'px',passed:await page.locator('#board .piece .del').first().evaluate(n=>document.activeElement===n)});await page.keyboard.press('Enter');await page.waitForTimeout(150);checks.push({name:'Board Remove button works with Enter at '+width+'px',passed:await page.locator('#board .piece').count()===before-1});}
   for(const width of [320,390,1366]){await page.setViewportSize({width,height:900});for(const route of ['/closet','/outfits','/trips']){await page.goto(base+'/#'+route);await page.waitForTimeout(300);checks.push({name:'Page reflow '+route+' at '+width+'px',passed:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)})}
   await page.locator('#menubtn').click();await page.locator('#appmenu button').filter({hasText:'View settings'}).click();checks.push({name:'Settings dialog reflow at '+width+'px',passed:await page.locator('#displayprefs').evaluate(n=>n.open&&n.getBoundingClientRect().right<=innerWidth+1&&n.getBoundingClientRect().left>=0)});await page.keyboard.press('Escape');}
   await context.close();fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({checks},null,2));console.log(JSON.stringify(checks,null,2));if(!process.argv.includes('--report-only')&&checks.some(c=>!c.passed))process.exitCode=1;return;
  }
  const skins=process.env.A11Y_SKINS?process.env.A11Y_SKINS.split(','):['workshop','fieldnotes','editorial'];
  for(const skin of skins)for(const appearance of ['light','dark'])for(const width of [390,1366]){
   const context=await browser.newContext({viewport:{width,height:900},colorScheme:appearance,timezoneId:'America/Los_Angeles',reducedMotion:'reduce'});
   await context.addInitScript(()=>{let seed=0x51a7;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}});
   const page=await context.newPage();page.setDefaultTimeout(5000);await page.clock.setFixedTime(new Date('2026-10-31T19:00:00Z'));
   await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   for(const [name,route,open] of scenarios.filter(x=>!process.env.A11Y_SCENARIOS||process.env.A11Y_SCENARIOS.split(',').includes(x[0]))){
    const meta={skin,appearance,viewport:width,scenario:name};
    try{
     await page.goto(base+'/#'+route);await page.waitForFunction(()=>window.ClosetLintRoutes&&document.querySelector('main:not(.hide)'),{},{timeout:15000});await page.waitForTimeout(300);
     await page.evaluate(({skin,appearance})=>{document.documentElement.dataset.skin=skin;document.documentElement.dataset.theme=appearance},{skin,appearance});
     if(open)await open(page);await page.waitForTimeout(100);
     await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
     const scan=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});return {violations:r.violations.map(v=>({rule:v.id,impact:v.impact,help:v.help,helpUrl:v.helpUrl,tags:v.tags,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary,data:n.any.map(x=>({id:x.id,data:x.data}))}))})),incomplete:r.incomplete.map(v=>({rule:v.id,count:v.nodes.length}))}});
     for(const v of scan.violations)for(const n of v.nodes)results.push({...meta,rule:v.rule,impact:v.impact,help:v.help,helpUrl:v.helpUrl,tags:v.tags,...n});
     manual.push({...meta,incomplete:scan.incomplete});
     console.log([skin,appearance,width,name,scan.violations.reduce((n,v)=>n+v.nodes.length,0)].join(' · '));
    }catch(e){errors.push({...meta,error:e.message});console.error(name+': '+e.message.split('\n')[0]);}
   }
   await context.close();
  }
  const baselineFile=path.join(__dirname,'accessibility-baseline.js'),baseline=fs.existsSync(baselineFile)?require(baselineFile):[];
  const known=new Map(baseline.map(r=>[r.key,r])),ratio=r=>r.data?.find(d=>d.id==='color-contrast')?.data?.contrastRatio;
  const fresh=results.filter(r=>!known.has(key(r))||(ratio(r)!=null&&ratio(r)+.01<known.get(key(r)).contrastRatio)),present=new Map(results.map(r=>[key(r),{key:key(r),contrastRatio:ratio(r)}])),resolved=baseline.filter(r=>!present.has(r.key));
  if(!manual.length)errors.push({error:'No accessibility scenarios were scanned.'});
  if(appHash()!==initialHash)errors.push({error:'Application source changed during the audit; rerun against a stable candidate.'});
  const report={appSha256:initialHash,createdAt:new Date().toISOString(),source:'current development source; disposable synthetic wardrobe, not the deployed personal closet',axeVersion:require('axe-core/package.json').version,scenarios:scenarios.map(x=>x[0]),skins,viewports:[390,1366],appearances:['light','dark'],results,errors,manualReview:manual,scansCompleted:manual.length,newFailures:fresh.length,resolvedBaselineEntries:resolved.length};
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
  for(const row of fresh.slice(0,20))console.error('NEW: '+key(row)+' '+row.summary);
  console.log(`Accessibility: ${results.length} known/current occurrences, ${fresh.length} new, ${errors.length} scan errors. Report: ${out}`);
  if(process.argv.includes('--record-baseline')){if(process.env.A11Y_SKINS||process.env.A11Y_SCENARIOS)throw Error('Only a complete matrix can record the baseline');if(errors.length)throw Error('Cannot baseline an incomplete run');fs.writeFileSync(baselineFile,'// Known accessibility debt, not a WCAG pass. See CONTRIBUTING.md#accessibility.\nmodule.exports='+JSON.stringify([...present.values()].sort((a,b)=>a.key.localeCompare(b.key)),null,2)+';\n')}
  else if(!process.argv.includes('--report-only')&&((process.argv.includes('--strict')?results.length:fresh.length)||errors.length))process.exitCode=1;
 }finally{if(browser)await browser.close();if(server){server.kill('SIGTERM');await new Promise(r=>{if(server.exitCode!==null)return r();server.once('exit',r);setTimeout(()=>{server.kill('SIGKILL');r()},2000).unref()})}fs.rmSync(fixture,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
