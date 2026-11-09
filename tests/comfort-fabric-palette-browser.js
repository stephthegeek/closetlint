const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.COMFORT_OUTPUT||path.resolve(root,'../browser');fs.mkdirSync(out,{recursive:true});
(async()=>{let browser,server;const checks=[],ok=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name)};try{
 const fixture=fs.mkdtempSync('/tmp/closet-comfort-');const seed=spawnSync('python3',['-c',`import sys\nfrom pathlib import Path\nsys.path[:0]=['tools','runtime']\nfrom create_demo import demo_source\nfrom storage import Store\nStore(Path(${JSON.stringify(fixture)})).restore(demo_source())`],{cwd:root,encoding:'utf8'});if(seed.status)throw Error(seed.stderr);
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:['ignore','ignore','pipe']});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 await page.goto(base+'/#/profile/comfort');await page.getByRole('heading',{name:'My atmosphere',exact:true}).waitFor();ok('deep link and Profile tab',await page.getByRole('tab',{name:'Comfort zone',exact:false}).getAttribute('aria-selected')==='true');

 await page.locator('[data-comfort-topic="fabric"]').getByRole('button',{name:'Start',exact:true}).click();
 ok('single choice waits for a selection',await page.getByRole('button',{name:'Save & next',exact:true}).isDisabled());
 for(const name of ['Lots of room','Crisp and sculpted','A little give']){await page.getByRole('radio',{name,exact:true}).click();ok('selection stays on question: '+name,await page.getByRole('radio',{name,exact:true}).isChecked());await page.getByRole('button',{name:'Save & next',exact:true}).click();}
 ok('fabric has no competing neutral controls',await page.locator('.comfort-visual-neutral').count()===0);ok('fabric starts unanswered',await page.locator('.comfort-fabric-reactions input:checked').count()===0);
 await page.getByRole('group',{name:'Velvet',exact:true}).getByRole('radio',{name:'Love',exact:true}).check();
 await page.getByRole('group',{name:'Lace',exact:true}).getByRole('radio',{name:'Avoid',exact:true}).check();await page.getByRole('group',{name:'Lace',exact:true}).getByRole('radio',{name:'Hard no',exact:true}).check();
 await page.getByRole('button',{name:'Save & next',exact:true}).click();
 ok('pressure has no competing neutral controls',await page.locator('.comfort-visual-neutral').count()===0);ok('no default trouble spots',await page.locator('.comfort-visual-grid input:checked').count()===0);
 await page.getByRole('checkbox',{name:'Around my neck',exact:true}).check();await page.getByRole('checkbox',{name:'At my waist',exact:true}).check();await page.getByRole('radio',{name:'A dealbreaker',exact:true}).check();
 await page.setViewportSize({width:390,height:844});ok('mobile no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Save & finish',exact:true}).click();await page.locator('[data-comfort-topic="fabric"] summary').click();
 let text=await page.locator('[data-comfort-topic="fabric"]').innerText();ok('independent fabric choices saved',text.includes('Velvet: Love it')&&text.includes('Lace: Hard no'));ok('selected trouble spots saved',text.includes('Around my neck: Hard no')&&text.includes('At my waist: Hard no'));
 await page.locator('[data-comfort-topic="color"]').getByRole('button',{name:'Start',exact:true}).click();
 await page.getByRole('checkbox',{name:'Earthy',exact:true}).check();await page.getByRole('checkbox',{name:'Jewel toned',exact:true}).check();
 ok('palette supports multiple choices',await page.locator('.comfort-visual-grid input:checked').count()===2);ok('no palette strength dropdown',await page.getByRole('combobox').count()===0);
 await page.getByRole('button',{name:'Save & next',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();ok('both palettes persisted',await page.getByRole('checkbox',{name:'Earthy',exact:true}).isChecked()&&await page.getByRole('checkbox',{name:'Jewel toned',exact:true}).isChecked());ok('no page errors',errors.length===0);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,out}));
 }finally{await browser?.close();server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});
