const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.SHELF_OUTPUT||fs.mkdtempSync('/tmp/closet-measurements-');fs.mkdirSync(out,{recursive:true});
(async()=>{let browser,server,page;const checks=[],errors=[];function check(name,ok){checks.push({name,passed:!!ok});if(!ok)throw Error(name)}try{
 const data=fs.mkdtempSync('/tmp/closet-measurement-data-'),seed=spawnSync('python3',['-c',`import sys\nfrom pathlib import Path\nsys.path[:0]=['tools','runtime']\nfrom create_demo import demo_source\nfrom storage import Store\ns=demo_source()\ns.payload['collections']['profile']['onboarding']={'started':True}\ns.payload['collections']['measurements']={'older':{'date':'2026-10-10','height':67.5,'waist':30,'underbust':38,'bra':'40C','weight':174},'recent':{'date':'2026-11-01','waist':31,'hips':44,'chest':40,'neck':15}}\nStore(Path(${JSON.stringify(data)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',data,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,80))}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext();page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 await page.goto(base+'/#/closet');await page.waitForFunction(()=>window.ClosetLintRuntime&&window.ClosetLintLocal);
 await page.goto(base+'/#/import');await page.waitForFunction(()=>{const n=document.querySelector('.assistant-request-shelf');return n&&n.hidden});check('no empty section when there are no requests',true);
 await page.evaluate(async()=>{await ClosetLintRuntime.photoPrepare('create',{request:'older-batch',ids:['demo-01'],notes:{}});await ClosetLintRuntime.photoPrepare('create',{request:'latest-batch',ids:['demo-02','demo-03'],notes:{}})});
 await ctx.close();
 for(const width of [390,1366])for(const theme of ['light','dark']){
 const fresh=await browser.newContext({viewport:{width,height:900},colorScheme:theme});await fresh.addInitScript(t=>localStorage.setItem('closetlint.display.v1',JSON.stringify({skin:'workshop',theme:t})),theme);
 page=await fresh.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/#/import');const shelf=page.getByRole('region',{name:'Continue your AI request'});await shelf.getByText('Previous AI requests (2)',{exact:true}).waitFor();
 check(width+' '+theme+' newest request first',await shelf.locator('article').first().textContent().then(t=>t.includes('2 pieces')));
 check(width+' '+theme+' earlier requests collapsed',await shelf.locator('details').evaluate(n=>!n.open));
 check(width+' '+theme+' no horizontal overflow',await shelf.evaluate(n=>n.scrollWidth<=n.clientWidth+1));
 await page.screenshot({path:path.join(out,width+'-'+theme+'.png'),fullPage:true});
 await shelf.locator('summary').click();check('earlier batch available',await shelf.getByText('Product photos · 1 piece',{exact:true}).isVisible());
 await shelf.getByRole('link',{name:'Upload results',exact:true}).first().click();await page.getByRole('dialog',{name:'Prepare product photos'}).getByLabel('Photo result ZIP').waitFor();check('action resumes exact request',page.url().includes('/latest-batch?'));
 await fresh.close();
 }
 const last=await browser.newContext();page=await last.newPage();await page.goto(base+'/#/tidy-details');await page.getByRole('region',{name:'Continue your AI request'}).getByText('Product photos · 2 pieces',{exact:true}).waitFor();check('same return section on title/tag start',true);
 await page.route('**/api/photos/prepare?**list=1',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporary failure'})}));await page.reload();const shelf=page.getByRole('region',{name:'Continue your AI request'});await shelf.getByRole('button',{name:'Retry saved requests'}).waitFor();check('load failure is visible with retry',true);await page.unroute('**/api/photos/prepare?**list=1');await shelf.getByRole('button',{name:'Retry saved requests'}).click();await shelf.getByText('Product photos · 2 pieces',{exact:true}).waitFor();check('retry recovers existing requests',true);
 check('no page errors' ,errors.length===0);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,passed:true}));
 }finally{if(browser)await browser.close();if(server)server.kill()}})().catch(e=>{console.error(e);process.exit(1)});
