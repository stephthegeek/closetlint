const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.DELETED_OUTPUT||fs.mkdtempSync('/tmp/closet-deleted-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser;const fixtures=[],checks=[];function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))}try{
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
for(const [width,skin,theme] of [[390,'workshop','dark'],[768,'fieldnotes','light'],[1280,'editorial','dark']]){
 const fixture=fs.mkdtempSync('/tmp/closet-deleted-fixture-');fixtures.push(fixture);
 const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
s.payload['collections']['profile'].pop('collection-imaginary',None)
s.payload['collections']['edits'].update({'demo-01':{'removed':True,'removedAt':1},'demo-02':{'removed':True,'removedAt':2},'demo-03':{'removed':True,'removedAt':3}})
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
 const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(0,'127.0.0.1',r)});const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});
 await page.goto(base+'/#/closet');await page.locator('#app-loading').waitFor({state:'hidden'});await page.locator('#deletedlink').click();const dialog=page.locator('#cdlg');await dialog.getByRole('heading',{name:'Deleted pieces (3)',exact:true}).waitFor();
 check(id+' Restore remains available',await dialog.getByRole('button',{name:'Restore Burgundy cotton top',exact:true}).count()===1);
 check(id+' permanent action has an explicit selection step',await dialog.getByRole('button',{name:'Select for permanent deletion',exact:true}).isVisible());
 await dialog.getByRole('button',{name:'Select for permanent deletion',exact:true}).click();await dialog.getByRole('button',{name:'Select available (2)',exact:true}).waitFor();
 check(id+' saved outfit checkbox protected',await dialog.getByRole('checkbox',{name:'Select Black everyday tee',exact:true}).isDisabled());
 check(id+' protected reason visible',await dialog.getByText(/Kept: Saved outfit/).isVisible());
 check(id+' standalone checkbox retains the accepted site size',await dialog.getByRole('checkbox',{name:'Select Burgundy cotton top',exact:true}).evaluate(n=>n.getBoundingClientRect().width>=18));
 await dialog.getByRole('checkbox',{name:'Select Burgundy cotton top',exact:true}).check();
 check(id+' selection retained while searching',await dialog.getByRole('button',{name:'Review deletion (1)',exact:true}).isEnabled());
 await dialog.getByRole('searchbox',{name:'Search deleted pieces'}).fill('burgundy');check(id+' searching does not discard selection',await dialog.getByRole('checkbox',{name:'Select Burgundy cotton top',exact:true}).isChecked());
 await dialog.getByRole('searchbox',{name:'Search deleted pieces'}).fill('');
 const overflow=await dialog.evaluate(n=>n.scrollWidth>n.clientWidth+2);check(id+' dialog stays within viewport',!overflow&&await dialog.evaluate(n=>n.getBoundingClientRect().width<=innerWidth));
 await dialog.screenshot({path:path.join(out,id+'-select.png')});
 await dialog.getByRole('button',{name:'Review deletion (1)',exact:true}).click();await dialog.getByRole('heading',{name:'Delete permanently?',exact:true}).waitFor();
 check(id+' confirmation shows actual photo count',/1 piece and 1 photo/.test(await dialog.innerText()));
 check(id+' confirmation names selected piece',await dialog.getByRole('listitem').innerText()==='Burgundy cotton top');
 check(id+' confirmation explains actual storage behavior',await dialog.getByText(/becomes reusable in the database/).isVisible());
 await dialog.getByRole('button',{name:'Back to selection',exact:true}).click();check(id+' backing out preserves selection',await dialog.getByRole('checkbox',{name:'Select Burgundy cotton top',exact:true}).isChecked());
 await dialog.getByRole('button',{name:'Review deletion (1)',exact:true}).click();await dialog.getByRole('heading',{name:'Delete permanently?',exact:true}).waitFor();
 await dialog.screenshot({path:path.join(out,id+'-confirm.png')});
 // Fail before committing: retain the exact reviewed selection and permit a safe retry.
 let failOnce=true;await page.route('**/api/deleted-pieces',async route=>{let body=route.request().postDataJSON();if(body.action==='delete'&&failOnce){failOnce=false;await route.fulfill({status:503,json:{error:'Synthetic save failure. Retry the same selection.'}})}else await route.continue()});
 await dialog.getByRole('button',{name:'Delete permanently',exact:true}).click();await dialog.getByText('Synthetic save failure. Retry the same selection.',{exact:true}).waitFor();
 check(id+' failed deletion retains confirmation',await dialog.getByRole('heading',{name:'Delete permanently?',exact:true}).isVisible());
 await dialog.getByRole('button',{name:'Delete permanently',exact:true}).click();await dialog.getByRole('heading',{name:'Deleted pieces (2)',exact:true}).waitFor();
 check(id+' successful deletion leaves protected and other deleted pieces',await dialog.getByRole('button',{name:'Restore Black everyday tee',exact:true}).count()===1&&await dialog.getByRole('button',{name:'Restore Black straight trousers',exact:true}).count()===1);
 check(id+' purged piece cannot be restored',await dialog.getByRole('button',{name:'Restore Burgundy cotton top',exact:true}).count()===0);
 await page.reload();await page.locator('#app-loading').waitFor({state:'hidden'});await page.locator('#deletedlink').click();await dialog.getByRole('heading',{name:'Deleted pieces (2)',exact:true}).waitFor();
 check(id+' permanent deletion survives reload',await dialog.getByRole('button',{name:'Restore Burgundy cotton top',exact:true}).count()===0);
 await dialog.getByRole('button',{name:'Restore Black straight trousers',exact:true}).click();await dialog.getByRole('heading',{name:'Deleted pieces (1)',exact:true}).waitFor();check(id+' normal Restore still works',await dialog.getByRole('button',{name:'Restore Black straight trousers',exact:true}).count()===0);
 check(id+' no browser errors',errors.length===0,errors);await ctx.close();server.kill('SIGTERM');server=null;
}
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(checks,null,2));console.log(checks.length+' permanent deletion browser checks passed. '+out);
}finally{if(browser)await browser.close();if(server)server.kill('SIGTERM');for(const fixture of fixtures)fs.rmSync(fixture,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exit(1)});
