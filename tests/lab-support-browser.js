const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),{chromium}=require('playwright'),out=process.env.LAB_SUPPORT_OUTPUT||fs.mkdtempSync('/tmp/closet-wear-role-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-sort-price-');function add(name,passed,details){checks.push({name,passed,details});if(!passed)throw Error(name+' '+JSON.stringify(details))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
rows=s.payload['base']['catalog']
dress=next(p for p in rows if p['meta']=='One-pieces')
shoe=next(p for p in rows if p['meta']=='Footwear' and p['sub']=='Boots')
dress.update(statement='loud',length='maxi',colors=['burgundy'],wish=False)
shoe.update(socksRequired=True,socksOk='any',wish=False)
basic=dict(rows[0],id='support-basic',name='Basic socks',meta='Legwear',sub='Socks',colors=['black'],statement='plain',functional=True,sockType='crew',sockWeight='regular',weight='regular',wish=False)
fancy=dict(basic,id='support-fancy',name='Statement socks',functional=False,statement='loud',pattern=['lace'])
s.payload['base']['catalog']=[dress,shoe,basic,fancy]
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);

const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
for(const width of [390,1366])for(const [skin,theme] of [['workshop','dark'],['editorial','light']]){
 const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:950},hasTouch:width<821,isMobile:width<821,colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});await page.goto(base+'/#/lab');
 const remove=page.getByRole('button',{name:'Leave out socks',exact:true});await remove.waitFor();const group=page.locator('.accgroup').filter({has:remove});
 add(id+' required socks prefer quiet basic',await group.innerText().then(t=>t.includes('Basic socks')));
 const node=await remove.elementHandle();await remove.click();add(id+' required removal explains shoe setting',await page.locator('#toast').innerText().then(t=>t.includes('These shoes require socks or footed hosiery')&&t.includes('change the shoes')));
 add(id+' blocked removal keeps existing UI',await node.evaluate(n=>n.isConnected));add(id+' required socks stay selected',await group.innerText().then(t=>t.includes('Basic socks')));
 await remove.focus();await page.keyboard.press('Enter');add(id+' keyboard removal also explains requirement',await node.evaluate(n=>n.isConnected)&&await page.locator('#toast').isVisible());
 await page.getByRole('button',{name:'Pick other socks',exact:true}).click();add(id+' explicit reroll can select other compatible support',await group.innerText().then(t=>t.includes('Statement socks')));
 await page.getByRole('button',{name:'Leave out shoes',exact:true}).click();
 add(id+' optional shoes stay removed after render',await page.getByRole('button',{name:'Leave out shoes',exact:true}).count()===0);
 add(id+' dependent sock removal explained',await remove.count()===0&&await page.locator('#toast').innerText().then(t=>t.includes('left out too')));
 add(id+' message fits viewport',await page.locator('#toast').evaluate(n=>n.getBoundingClientRect().width<=innerWidth&&n.scrollWidth<=n.clientWidth+1));add(id+' no browser errors',errors.length===0,errors);
 await ctx.close();console.log(id+' passed');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,failures:0}));
}catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(e)},null,2));throw e}finally{await browser?.close();server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});
