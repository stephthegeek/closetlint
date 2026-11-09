const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.RETURN_OUTPUT||fs.mkdtempSync('/tmp/closet-measurements-');fs.mkdirSync(out,{recursive:true});
(async()=>{let browser,server,page;const checks=[],errors=[];function check(name,ok){checks.push({name,passed:!!ok});if(!ok)throw Error(name)}try{
 const data=fs.mkdtempSync('/tmp/closet-measurement-data-'),seed=spawnSync('python3',['-c',`import sys\nfrom pathlib import Path\nsys.path[:0]=['tools','runtime']\nfrom create_demo import demo_source\nfrom storage import Store\ns=demo_source()\ns.payload['collections']['profile']['onboarding']={'started':True}\ns.payload['collections']['measurements']={'older':{'date':'2026-10-10','height':67.5,'waist':30,'underbust':38,'bra':'40C','weight':174},'recent':{'date':'2026-11-01','waist':31,'hips':44,'chest':40,'neck':15}}\nStore(Path(${JSON.stringify(data)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',data,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,80))}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
 const ctx=await browser.newContext({viewport:{width:390,height:844}});page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto(base+'/#/closet');await page.waitForFunction(()=>window.ClosetLintRoutes&&window.ClosetLintRuntime&&window.ClosetLintLocal);
 const link=await page.evaluate(async()=>{const r=await ClosetLintRuntime.photoPrepare('create',{request:'return-test',ids:['demo-01'],notes:{}});return location.origin+'/#/assistant/photos/'+r.requestId+'?instance='+r.instance+'&workflow=file'});
 await ctx.close();const fresh=await browser.newContext({viewport:{width:390,height:844}});page=await fresh.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(link);const dlg=page.getByRole('dialog',{name:'Prepare product photos'});await dlg.getByRole('button',{name:'Show assistant request and workflow'}).waitFor();
 check('fresh browser opens exact request at upload',await dlg.getByLabel('Photo result ZIP').count()===1);
 check('no piece selection or preparation needed',await dlg.getByRole('button',{name:'Prepare assistant request',exact:true}).count()===0);
 check('URL survives hydration and redraw',page.url()===link);await page.reload();await dlg.getByLabel('Photo result ZIP').waitFor();check('reload resumes request',true);
 await page.screenshot({path:path.join(out,'photo-return-mobile.png'),fullPage:true});
 await dlg.getByRole('button',{name:'Close',exact:true}).click();await page.waitForURL('**/#/closet');check('closing returns to closet',true);
 await page.goto(link.replace('return-test','missing-request'));await dlg.getByText(/no longer available/).waitFor();check('missing request has retry',await dlg.getByRole('button',{name:'Retry loading request'}).count()===1);
 await page.goto(link.replace(/instance=[^&]+/,'instance=another'));await dlg.getByText(/another closet/).waitFor();check('wrong closet blocked',true);
 check('no browser exceptions',errors.length===0);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,passed:true}));
 }finally{if(browser)await browser.close();if(server)server.kill()}})().catch(e=>{console.error(e);process.exit(1)});
