const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.COMFORT_OUTPUT||path.resolve(root,'../atmosphere-browser');fs.mkdirSync(out,{recursive:true});
(async()=>{let browser,server;const checks=[],ok=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name)};try{
 const fixture=fs.mkdtempSync('/tmp/closet-weather-');const seed=spawnSync('python3',['-c',`import sys\nfrom pathlib import Path\nsys.path[:0]=['tools','runtime']\nfrom create_demo import demo_source\nfrom storage import Store\nStore(Path(${JSON.stringify(fixture)})).restore(demo_source())`],{cwd:root,encoding:'utf8'});if(seed.status)throw Error(seed.stderr);
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:['ignore','ignore','pipe']});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 await page.goto(base+'/#/profile/comfort');await page.getByRole('heading',{name:'My atmosphere',exact:true}).waitFor();
 ok('one atmosphere heading',await page.locator('#profile-comfort h2').count()===1&&await page.locator('#profile-comfort h3').count()===8);
 ok('all five layers visible in legend',await page.locator('.comfort-layer-controls input').count()===5);
 ok('no invented layers before answering',await page.locator('.comfort-layer-controls input:disabled').count()===5&&await page.locator('[data-layer]:visible').count()===0);
 ok('empty sky copy',await page.getByText('Clear skies so far. Each quiz adds to your atmosphere.',{exact:true}).isVisible());
 ok('no empty chart grid',await page.locator('.comfort-weather-grid').evaluate(e=>getComputedStyle(e).opacity==='0'));
 ok('unstarted question counts',await page.locator('[data-comfort-topic="fabric"] .comfort-topic-progress').innerText()==='5 questions');
 await page.evaluate(()=>{document.documentElement.dataset.skin='workshop';document.documentElement.dataset.theme='dark'});await page.screenshot({path:path.join(out,'empty-dark-desktop.png'),fullPage:true});
 await page.locator('[data-comfort-topic="fabric"]').getByRole('button',{name:'Start',exact:true}).click();for(let i=0;i<5;i++)await page.getByRole('button',{name:'Skip',exact:true}).click();await page.getByRole('heading',{name:'My atmosphere',exact:true}).waitFor();
 ok('all-skipped quiz is Done',await page.locator('[data-comfort-topic="fabric"] .comfort-complete').count()===1);
 ok('all-skipped quiz stays answerless',await page.locator('[data-comfort-topic="fabric"] .comfort-topic-progress').innerText()==='0 of 5 answered · 5 skipped');
 ok('all-skipped quiz does not invent an atmosphere',await page.locator('[data-layer]:visible').count()===0&&await page.locator('.comfort-weather-empty').isVisible());
 ok('all-skipped progress uses hatching',await page.locator('[data-comfort-topic="fabric"] .comfort-progress-skipped').count()===5);
 const values={room:'easy',drape:'soft',textures:{velvet:'love',lace:'hard'},pressure:'any',heel:2,fastenings:'any',palette:['earthy','jewel']};const answers=Object.fromEntries(Object.entries(values).map(([k,value])=>['comfort-'+k,{version:1,status:'answered',value}]));answers['comfort-stretch']={version:1,status:'skipped'};
 const filled=spawnSync('python3',['-c',`import sys,json\nfrom pathlib import Path\nsys.path[:0]=['runtime']\nfrom storage import Store\ns=Store(Path(${JSON.stringify(fixture)}))\nfor k,v in json.loads(${JSON.stringify(JSON.stringify(answers))}).items(): s.set_record('profile',k,v)`],{cwd:root,encoding:'utf8'});if(filled.status)throw Error(filled.stderr);await page.reload();await page.getByRole('checkbox',{name:'Presence',exact:true}).isEnabled();
 ok('skips allow Done',(await page.locator('[data-comfort-topic="fabric"] .comfort-complete').textContent()).replace(/\s/g,'')==='✓Done');
 ok('skips not counted as answers',await page.locator('[data-comfort-topic="fabric"] .comfort-topic-progress').innerText()==='4 of 5 answered · 1 skipped');
 ok('incomplete has Continue',await page.locator('[data-comfort-topic="feet"]').getByRole('button',{name:'Continue',exact:true}).isVisible());
 ok('progress strip separates answers and skips',await page.locator('[data-comfort-topic="fabric"] .comfort-progress-answered').count()===4&&await page.locator('[data-comfort-topic="fabric"] .comfort-progress-skipped').count()===1);
 ok('faint sky details present',await page.locator('.comfort-weather-stars circle').count()===18);
 ok('answers initially collapsed',await page.locator('.comfort-answer-disclosure[open]').count()===0);
 ok('Presence formed and Range unformed',await page.getByRole('checkbox',{name:'Presence',exact:true}).isEnabled()&&await page.getByRole('checkbox',{name:'Range',exact:true}).isDisabled());
 const before=await page.evaluate(async()=>JSON.stringify((await (await fetch('/api/state',{headers:{'X-ClosetLint-Token':window.ClosetLintLocal.token}})).json()).collections)),drawing=await page.locator('[data-layer="presence"]').innerHTML();
 for(const layer of ['Feel','Shape','Ease','Presence'])await page.getByRole('checkbox',{name:layer,exact:true}).uncheck();
 ok('toggles hide all artwork',await page.locator('[data-layer]:visible').count()===0);
 ok('toggles preserve answers',before===await page.evaluate(async()=>JSON.stringify((await (await fetch('/api/state',{headers:{'X-ClosetLint-Token':window.ClosetLintLocal.token}})).json()).collections)));
 for(const layer of ['Feel','Shape','Ease','Presence'])await page.getByRole('checkbox',{name:layer,exact:true}).check();
 ok('toggles preserve portrait composition',drawing===await page.locator('[data-layer="presence"]').innerHTML());
 ok('reduced motion stops ambient drift',await page.locator('.comfort-weather-drift').first().evaluate(e=>getComputedStyle(e).animationName==='none'));

 const partial=Number(await page.locator('[data-layer="presence"] .comfort-weather-drift').evaluate(e=>e.style.opacity));ok('partial answers form a lighter layer',partial>0&&partial<1);
 await page.locator('[data-comfort-topic="color"]').getByRole('button',{name:'Continue',exact:true}).click();
 for(const name of ['Matching sets','Florals','Small & subtle','A patterned accent']){await page.getByRole('checkbox',{name,exact:true}).check();await page.getByRole('button',{name:'Save & next',exact:true}).click()}
 await page.getByRole('button',{name:'Save & finish',exact:true}).click();await page.getByRole('heading',{name:'My atmosphere',exact:true}).waitFor();
 ok('finished answers add to the shared layer',Number(await page.locator('[data-layer="presence"] .comfort-weather-drift').evaluate(e=>e.style.opacity))>partial);
 ok('one color quiz feeds multiple concepts',await page.locator('[data-layer="shape"].comfort-weather-arrive').count()===1&&await page.locator('[data-layer="presence"].comfort-weather-arrive').count()===1);
 ok('finished answers remain collapsed',await page.locator('.comfort-answer-disclosure[open]').count()===0);
 await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
 for(const skin of ['workshop','editorial'])for(const theme of ['light','dark'])for(const width of [390,1280]){
  await page.setViewportSize({width,height:width===390?844:1100});await page.evaluate(({skin,theme})=>{document.documentElement.dataset.skin=skin;document.documentElement.dataset.theme=theme;scrollTo(0,0)},{skin,theme});
  ok(`${skin} ${theme} ${width} no overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  ok(`${skin} ${theme} ${width} quiz grid`,await page.locator('.comfort-topics').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)===(width===390?1:3));
  const layout=await page.locator('.comfort-map-layout').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);ok(`${skin} ${theme} ${width} legend placement`,layout===(width===390?1:2));
  const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#profile-comfort'),{runOnly:{type:'rule',values:['color-contrast','label','button-name','aria-valid-attr-value']}})).violations);ok(`${skin} ${theme} ${width} accessibility: ${JSON.stringify(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))}`,violations.length===0);
  await page.screenshot({path:path.join(out,`${skin}-${theme}-${width}.png`),fullPage:true});
 }
 await page.locator('[data-comfort-topic="fabric"] summary').click();await page.locator('[data-comfort-topic="fabric"] .comfort-answer').filter({hasText:'Which textures'}).click();
 for(const width of [360,390,1280]){await page.setViewportSize({width,height:950});await page.evaluate(()=>scrollTo(0,0));ok(`fabric ${width} no overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));ok(`fabric ${width} four ratings per row`,await page.locator('.comfort-fabric-reactions input[type=radio]').count()===40);ok(`fabric ${width} targets`,await page.locator('.comfort-reaction-options label').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44)));await page.screenshot({path:path.join(out,`fabric-${width}.png`),fullPage:true})}
 ok('no page errors: '+errors.join(' | '),errors.length===0);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,out}));
}catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(e)},null,2));throw e}finally{await browser?.close();server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});
