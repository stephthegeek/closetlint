const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=process.env.COMFORT_OUTPUT||fs.mkdtempSync('/tmp/closet-quiz-review-'),{chromium}=require(root+'/node_modules/playwright');
(async()=>{let browser,server,page;const errors=[];try{
const fixture=fs.mkdtempSync('/tmp/closet-quizzes-');const seed=spawnSync('python3',['-c',`import sys\nfrom pathlib import Path\nsys.path[:0]=['tools','runtime']\nfrom create_demo import demo_source\nfrom storage import Store\nStore(Path(${JSON.stringify(fixture)})).restore(demo_source())`],{cwd:root,encoding:'utf8'});if(seed.status)throw Error(seed.stderr);
const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore'});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});page=await browser.newPage({viewport:{width:1280,height:1050},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.stack));page.setDefaultTimeout(8000);
await page.route(base+'/',async route=>{const response=await route.fetch();let html=await response.text();const hook="window.state=state;window.ClosetLintComfort=ClosetLintComfort;window.comfortStart=comfortStart;window.comfortRender=comfortRender;Object.defineProperty(window,'comfortSession',{get:function(){return comfortSession},set:function(v){comfortSession=v}});Object.defineProperty(window,'comfortPaused',{get:function(){return comfortPaused},set:function(v){comfortPaused=v}});";html=html.replace('Promise.all([useCap',hook+'Promise.all([useCap');const headers={...response.headers()};delete headers['content-security-policy'];await route.fulfill({response,headers,body:html})});
await page.goto(base+'/#/profile/comfort');await page.getByRole('heading',{name:'My atmosphere',exact:true}).waitFor();assert.equal(await page.locator('.comfort-topic').count(),8);
await page.locator('[data-comfort-topic=fabric]').getByRole('button',{name:'Start',exact:true}).click();await page.getByRole('button',{name:'Let’s go'}).click();await page.getByRole('button',{name:'Lots of room',exact:true}).click();await page.getByRole('button',{name:'Next round',exact:true}).click();await page.getByRole('button',{name:'Love',exact:true}).click();
await page.reload();await page.getByRole('heading',{name:'What kind of shape feels like you?',exact:true}).waitFor();assert.equal(await page.locator('.cq-card-caption strong').innerText(),'A little structure');
await page.getByRole('button',{name:'Hard no',exact:true}).click();await page.getByRole('button',{name:'Neutral',exact:true}).click();await page.getByRole('button',{name:'Next round',exact:true}).click();await page.getByRole('button',{name:'Skip this round',exact:true}).click();
// Capture a complete rating round layout, then check every renderer for errors.
for(const [skin,theme,width] of [['workshop','dark',1280],['workshop','light',390],['editorial','light',768]]){await page.setViewportSize({width,height:1000});await page.evaluate(({skin,theme})=>{document.documentElement.dataset.skin=skin;document.documentElement.dataset.theme=theme},{skin,theme});await page.screenshot({path:path.join(out,`ratings-${skin}-${theme}-${width}.png`),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width)}
await page.evaluate(()=>{comfortSession=null;comfortPaused={};comfortStart('jewelry',2,true)});await page.getByRole('button',{name:'Both!',exact:true}).waitFor();await page.screenshot({path:path.join(out,'pairs-mobile.png'),fullPage:true});await page.getByRole('button',{name:'Both!',exact:true}).click();
// Failed write keeps the selected mark and retry, and does not advance.
await page.evaluate(()=>{comfortSession=null;comfortStart('care',0,true);window.originalQuizDB=state.db;state.db={collection:()=>({doc:()=>({set:()=>Promise.reject(Error('offline'))})})}});await page.getByRole('button',{name:'Love',exact:true}).click();await page.getByRole('button',{name:'Retry save',exact:true}).waitFor();assert.equal(await page.locator('.cq-card-caption strong').innerText(),'Hand washing');await page.evaluate(()=>{state.db=window.originalQuizDB});await page.getByRole('button',{name:'Retry save',exact:true}).click();await page.waitForFunction(()=>!comfortSession.busy&&!comfortSession.error);assert.equal(await page.locator('.cq-card-caption strong').innerText(),'Dry cleaning');
assert.equal(await page.locator('.cq-undo').count(),0,'quiz answers are changed directly, without Undo');await page.locator('.cq-thumb').first().click();assert.equal(await page.locator('.cq-card-caption strong').innerText(),'Hand washing');await page.getByRole('button',{name:'Neutral',exact:true}).click();await page.waitForFunction(()=>!comfortSession.busy);assert.equal(await page.evaluate(()=>ClosetLintComfort.item(comfortSession.draft,ClosetLintComfort.question('careeffort'),'hand').value),0,'earlier answers remain directly editable');
// All skipped finishes with no invented code or answers.
await page.evaluate(()=>{comfortSession=null;comfortStart('range',0,true)});for(let i=0;i<6;i++)await page.getByRole('button',{name:'Skip this round',exact:true}).click();await page.getByRole('button',{name:'Save & finish',exact:true}).click();await page.getByRole('heading',{name:'Plot twists, mapped.',exact:true}).waitFor();assert.equal(await page.locator('.cq-code').count(),0);
// No heels bypasses heel shapes; keyboard ratings save and advance.
await page.evaluate(()=>{comfortSession=null;comfortStart('feet',0,true)});
await page.getByRole('button',{name:'Love',exact:true}).click();
const noHeels=await page.evaluate(()=>ClosetLintComfort.question('heel').noneLabel);
await page.getByRole('button',{name:noHeels,exact:true}).click();await page.getByRole('button',{name:'Next round',exact:true}).click();
assert.equal(await page.evaluate(()=>comfortSession.index),2);
await page.locator('.cq-run h3').focus();await page.keyboard.press('7');await page.waitForFunction(()=>!comfortSession.busy);
assert.equal(await page.evaluate(()=>ClosetLintComfort.item(comfortSession.draft,ClosetLintComfort.question('toes'),ClosetLintComfort.question('toes').items[0].id).value),3);
await page.setViewportSize({width:390,height:1000});
// Synthetic completed quiz exercises stars, recap, reveal, and every control format.
await page.evaluate(async()=>{const C=ClosetLintComfort,t=C.topics[0];let d=C.empty();for(const q of t.questions){if(q.type==='one')d=C.apply(d,q,'choice',null,q.items[0].id);else if(q.type==='body')d=C.apply(d,q,'done');else for(const it of q.items)d=C.apply(d,q,'rate',it.id,q.type==='pair'?'L':it.id==='lace'?-3:2)}await state.db.collection('profile').doc(C.key(t.id)).set(d);state.profile[C.key(t.id)]=d;comfortSession=null;comfortStart(t.id,0,true);comfortSession.view='recap';comfortRender(true)});await page.screenshot({path:path.join(out,'recap-mobile.png'),fullPage:true});await page.locator('.cq-recap-grid').first().getByRole('button').first().click();await page.getByRole('button',{name:'Save & finish',exact:true}).click();await page.getByRole('heading',{name:'Noted, texture by texture.',exact:true}).waitFor();await page.screenshot({path:path.join(out,'reveal-mobile.png'),fullPage:true});assert.equal(await page.locator('.cq-code,.cq-code-key,.cq-code-disclosure').count(),0,'closet code stays out of the interface');assert(await page.evaluate(()=>ClosetLintComfort.fullCode(state.profile,false).includes('*')),'closet code remains available from saved answers');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'reveal overflow');
await page.evaluate(()=>{comfortSession=null;comfortStart('color',6,true)});await page.locator('.cq-rack').waitFor();await page.evaluate(()=>{comfortSession=null;comfortStart('fabric',5,true)});await page.locator('.cq-body').waitFor();await page.screenshot({path:path.join(out,'body-mobile.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
// The shared design must fit every catalog round, not just the representative mockup.
const layoutChecks=[];
for(const width of [390,1280]){
 await page.setViewportSize({width,height:1000});
 for(const skin of ['workshop','fieldnotes','editorial'])for(const theme of ['light','dark']){
  const result=await page.evaluate(({skin,theme})=>{
   document.documentElement.dataset.skin=skin;document.documentElement.dataset.theme=theme;
   const C=ClosetLintComfort,checked=[];
   for(const t of C.topics)for(let index=0;index<t.questions.length;index++){
    delete state.profile[C.key(t.id)];comfortSession=null;comfortPaused={};comfortStart(t.id,index,true);comfortSession.end=false;comfortRender(true);
    const q=t.questions[index],host=document.querySelector('.cq-run');
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Overflow '+skin+' '+theme+' '+innerWidth+' '+q.id);
    if(q.type==='rate'){
     const help=host.querySelector('#cq-keyboard-help'),bounds=help.getBoundingClientRect();
     if(bounds.width>1||bounds.height>1||!help.textContent.includes('1–7'))throw Error('Shortcut hint must remain available and visually hidden');
     if(host.querySelectorAll('.cq-rating').length!==7)throw Error('Rating scale lost choices');
    }
    if(['one','any'].includes(q.type)&&q.items.length===4){
     const tiles=host.querySelectorAll('.cq-pick');
     if(Math.abs(tiles[0].getBoundingClientRect().top-tiles[1].getBoundingClientRect().top)>1||tiles[2].getBoundingClientRect().top<=tiles[0].getBoundingClientRect().top)throw Error('Four choices must be 2 by 2');
    }
    checked.push(q.id);
   }
   return checked;
  },{skin,theme});
  layoutChecks.push({width,skin,theme,rounds:result.length});
 }
}
await page.setViewportSize({width:1280,height:1000});
// Resolve each format from the catalog so content reordering cannot invalidate coverage.
for(const type of ['rate','pair','one','any','rack','body']){
 for(const [skin,theme,width] of [['workshop','dark',1280],['fieldnotes','light',390]]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(({type,skin,theme})=>{document.documentElement.dataset.skin=skin;document.documentElement.dataset.theme=theme;const q=ClosetLintComfort.questions.find(q=>q.type===type),t=ClosetLintComfort.topics.find(t=>t.id===q.topic);comfortSession=null;comfortPaused={};comfortStart(t.id,t.questions.indexOf(q),true);comfortSession.end=false;comfortRender(true);window.scrollTo(0,0)},{type,skin,theme});
  await page.locator('.cq-run').screenshot({path:path.join(out,`design-${type}-${skin}-${width}.png`)});
 }
}
await page.evaluate(()=>{const C=ClosetLintComfort,q=C.question('heels'),t=C.topics.find(t=>t.id===q.topic);comfortSession=null;comfortPaused={};comfortStart(t.id,t.questions.indexOf(q),true);let d=C.empty();q.items.forEach((it,i)=>{d=C.apply(d,q,'rate',it.id,[2,-3,1,0,3][i%5])});comfortSession.draft=d;comfortSession.end=true;comfortRender(true)});
assert.equal(await page.locator('.cq-answer-mark').first().textContent(),'💜💜');
assert.equal(await page.locator('.cq-answer-mark').nth(1).textContent(),'✖️✖️✖️');
await page.locator('.cq-run').screenshot({path:path.join(out,'design-completed-mobile.png')});
await page.locator('.cq-thumb').first().click();assert(await page.locator('.cq-rate-card').isVisible(),'completed card can be reopened');
for(const view of ['intro','review','recap','reveal']){
 await page.evaluate(view=>{comfortSession.view=view;comfortRender(true);window.scrollTo(0,0)},view);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view+' overflow');
 await page.locator('.cq-run').screenshot({path:path.join(out,`design-${view}-mobile.png`)});
}
fs.writeFileSync(path.join(out,'layout-report.json'),JSON.stringify({passed:true,layoutChecks,roundsRendered:layoutChecks.reduce((n,x)=>n+x.rounds,0),supportingScreens:['intro','review','recap','reveal'],screenReaderShortcutHint:true,repeatedAnswerStrength:true},null,2));

assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({passed:true,checks:'eight cards, persisted resume, all renderers, failure/retry, all-skipped, recap stars, reveal, 390/768/1280 overflow',errors},null,2));console.log('Revised quizzes browser checks passed.');
}catch(e){console.error(e);console.error(errors);if(page){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});console.error((await page.locator('#profile-comfort').innerText()).slice(0,1800));console.error(errors)}console.error(e);throw e}finally{await browser?.close();server?.kill()}})().catch(()=>process.exitCode=1);
