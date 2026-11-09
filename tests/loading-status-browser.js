const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.LOADING_OUTPUT||fs.mkdtempSync('/tmp/closet-loading-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-loading-fixture-');function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(0,'127.0.0.1',r)});const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
for(const [width,skin,theme,motion] of [[390,'workshop','dark','no-preference'],[1000,'fieldnotes','light','no-preference'],[1280,'editorial','dark','reduce']]){
 const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:motion}),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});
 await page.route(base+'/',async route=>{const response=await route.fetch();const body=(await response.text()).replace('/* END LOADING STATUS */','/* END LOADING STATUS */\nwindow.testApp={get state(){return state},setTab:function(t){return setTab(t)},toast:toast,get tidyWorkspace(){return tidyWorkspace},loading:ClosetLintLoading};');const headers=response.headers();const script=Array.from(body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)).find(m=>m[1].includes('window.testApp='))[1];const hash=require('node:crypto').createHash('sha256').update(script).digest('base64');headers['content-security-policy']=headers['content-security-policy'].replace("script-src 'self'","script-src 'self' 'sha256-"+hash+"'");await route.fulfill({response,headers,body})});
 await page.goto(base+'/#/wishlist-ranking');await page.waitForFunction(()=>typeof testApp!=='undefined'&&testApp.state.capsDone);await page.locator('#app-loading').waitFor({state:'hidden'});await page.locator('#view-wrank').waitFor({state:'visible'});
 // Real DOM mutations, preserving controls and their focus while the status changes.
 await page.evaluate(()=>{
 const box=document.createElement('section');box.id='loading-fixture';box.style='max-width:520px;margin:20px auto;padding:20px;border:1px solid var(--line);background:var(--panel)';
 box.innerHTML='<label>Photo choice <input id="retained-choice" value="My selected photo"></label><p id="wait-status" role="status">Saving 1 of 4 photos…</p><button id="busy-test" class="btn" disabled>Checking connection…</button><p id="queue-status" role="status">Waiting for earlier photos…</p><p id="nested" role="status"><span role="status">Preparing a preview…</span></p>';
 document.querySelector('#view-wrank').prepend(box);document.querySelector('#retained-choice').focus();
 });
 await page.waitForFunction(()=>document.querySelector('#wait-status').classList.contains('loading-linty'));
 const style=await page.locator('#wait-status').evaluate(n=>({before:getComputedStyle(n,'::before').backgroundImage,animation:getComputedStyle(n,'::before').animationName,font:getComputedStyle(n).fontSize}));
 check(id+' exact header logo crop',decodeURIComponent(style.before).includes('viewBox="290 420 710 600"')&&decodeURIComponent(style.before).includes(await page.locator('.linty-peek img').getAttribute('src')));
 check(id+' active/reduced motion',motion==='reduce'?style.animation==='none':style.animation==='loading-linty-turn',style.animation);
 check(id+' readable status',style.font==='15px',style.font);
 check(id+' queued still',await page.locator('#queue-status').evaluate(n=>getComputedStyle(n,'::before').animationName)==='none');
 check(id+' no duplicate nested indicator',await page.locator('#nested.loading-linty').count()===0&&await page.locator('#nested>.loading-linty').count()===1);
 check(id+' input focus retained',await page.locator('#retained-choice').evaluate(n=>n===document.activeElement));
 check(id+' disabled button enhanced',await page.locator('#busy-test.loading-linty').count()===1);
 await page.locator('#loading-fixture').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,id+'.png')});
 await page.evaluate(()=>{document.querySelector('#wait-status').textContent='Could not save photos. Your choices are kept; retry.';document.querySelector('#busy-test').disabled=false});
 await page.waitForFunction(()=>!document.querySelector('#wait-status').classList.contains('loading-linty'));
 check(id+' failure and enabled action stop motion',await page.locator('#busy-test.loading-linty').count()===0);
 check(id+' failed work retains input',await page.locator('#retained-choice').inputValue()==='My selected photo');
 await page.evaluate(()=>{document.querySelector('#wait-status').textContent='Saving…'});await page.locator('#wait-status.loading-linty').waitFor();
 await page.evaluate(()=>{document.querySelector('#wait-status').textContent='Saved';testApp.toast('Preparing a full backup…')});await page.waitForFunction(()=>!document.querySelector('#wait-status').classList.contains('loading-linty'));
 check(id+' completion stops motion',await page.locator('#wait-status.loading-linty').count()===0);
 check(id+' toast retains fixed positioning',await page.locator('#toast').evaluate(n=>getComputedStyle(n).position)==='fixed');
 await page.evaluate(()=>{testApp.toast('✓ Backup downloaded');document.querySelector('#loading-fixture').remove()});
 // A real batch queue and rendering cycle, with synthetic service delay and no personal data.
 await page.route('**/api/photos/background-status',r=>r.fulfill({json:{available:true}}));
 await page.evaluate(()=>{window.location.hash='#/tidy-photos'});await page.getByRole('button',{name:/Prepare first/}).waitFor();
 // Override only isolated fixture services: keep real queue, UI, selection, and failure handlers.
 await page.evaluate(()=>{window.testRemove=[];ClosetLintRuntime.removeBackground=()=>new Promise(r=>testRemove.push(r))});
 await page.getByRole('button',{name:/Prepare first/}).click();await page.locator('.photo-work-waiting').first().waitFor();
 check(id+' queued previews use still Linty',await page.locator('.photo-work-waiting .photo-spinner').first().evaluate(n=>getComputedStyle(n).animationName)==='none');
 await page.evaluate(async()=>{while(testApp.tidyWorkspace.queue.running){let resolve=testRemove.shift();if(resolve)resolve(await(await fetch(testApp.tidyWorkspace.queue.page[0].source.src)).blob());await new Promise(r=>setTimeout(r,10))}});
 await page.getByRole('button',{name:/Use all ready cutouts/}).click();
 await page.evaluate(()=>{window.testSaveResolve=null;window.testSaveFail=true;testApp.state.assets.upload=()=>new Promise((resolve,reject)=>{window.testSaveResolve=()=>testSaveFail?reject(Error('Synthetic photo save failure')):resolve({id:'fixture-cutout'})})});
 await page.getByRole('button',{name:'Save and return',exact:true}).click();await page.locator('#tidy-save-count.loading-linty').waitFor();
 check(id+' actual save count beside footer',/Saving cutout 1 of \d+…/.test(await page.locator('#tidy-save-count').innerText()));
 check(id+' only save actions locked',await page.getByRole('button',{name:'Save and return',exact:true}).isDisabled());
 await page.locator('.tidy-bottom').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,id+'-saving.png')});
 // Allow all selected rows to fail, retaining every choice for retry.
 await page.evaluate(async()=>{while(testApp.tidyWorkspace.queue.saving){if(testSaveResolve){let next=testSaveResolve;testSaveResolve=null;next()}await new Promise(r=>setTimeout(r,10))}});
 await page.waitForFunction(()=>!document.querySelector('#tidy-save-count').classList.contains('loading-linty'));
 check(id+' failed batch retains ready choices',await page.evaluate(()=>testApp.tidyWorkspace.queue.page.filter(r=>r.status==='ready').every(r=>r.checked)));
 check(id+' failed batch unlocks retry',await page.getByRole('button',{name:'Save and return',exact:true}).isEnabled());
 check(id+' no browser errors',errors.length===0,errors);
 await ctx.close();
}
fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(checks,null,2));console.log(checks.length+' loading UI checks passed. '+out);
}finally{if(browser)await browser.close();if(server)server.kill('SIGTERM');fs.rmSync(fixture,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exit(1)});
