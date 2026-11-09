const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),{chromium}=require('playwright'),out=process.env.CLOSET_TABS_OUTPUT||fs.mkdtempSync('/tmp/closet-wear-role-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-sort-price-');function add(name,passed,details){checks.push({name,passed,details});if(!passed)throw Error(name+' '+JSON.stringify(details))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
s.payload['base']['catalog'][1]['styles']=['formal']
s.payload['board']={'name':'Tape review','pieces':[{'id':'demo-01','x':20,'y':25,'w':35,'z':1}],'st':{'ps':'tape'}}
s.payload['base']['catalog'][0].update(wearMore=True,wears=['2026-10-26','2026-10-27','2026-10-28'])
s.payload['collections']['trips']['review-trip']={'name':'Review trip','settings':{'start':'2026-11-30','end':'2026-12-02','dest':'Sample city'}}
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);

const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
for(const width of (process.env.CLOSET_TABS_FULL?[390,768,1366]:[390]))for(const skin of (process.env.CLOSET_TABS_FULL?['workshop','fieldnotes','editorial']:['workshop']))for(const theme of (process.env.CLOSET_TABS_FULL?['light','dark']:['dark'])){
 const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:1000},hasTouch:width<821,isMobile:width<821,colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 await ctx.addInitScript(p=>{if(!localStorage.getItem('closetlint.display.v1'))localStorage.setItem('closetlint.display.v1',JSON.stringify(p))},{skin,theme});
 await page.goto(base+'/#/profile/settings');await page.locator('#closet-add-tab').waitFor();
 add(id+' Jewelry is default extra',await page.locator('.closet-tab-picked').innerText().then(t=>t.includes('Jewelry')));
 await page.getByRole('button',{name:'Remove Jewelry tab',exact:true}).click();
 await page.locator('#closet-add-tab').selectOption('Tops');await page.locator('#closet-add-tab').selectOption('Glasses');await page.locator('#closet-add-tab').selectOption('Bottoms');
 if(width===390)await page.screenshot({path:path.join(out,id+'-settings.png'),fullPage:true});
 add(id+' three chips replace empty slots',await page.locator('.closet-tab-picked').count()===3&&await page.locator('#closet-add-tab').isDisabled());
 add(id+' selected categories stay ordered',await page.locator('.closet-tab-picked').allTextContents().then(xs=>/Tops/.test(xs[0])&&/Eyewear/.test(xs[1])&&/Bottoms/.test(xs[2])));
 add(id+' valid settings save',await page.locator('#closet-tabs-status').textContent()==='Tabs saved in this browser.');
 await page.goto(base+'/#/closet');await page.locator('[data-category-tab=Tops]').click();
 add(id+' custom category filters results',await page.locator('.card').count()>0&&await page.locator('.capcat').allTextContents().then(xs=>xs.every(x=>/top|tee|cardigan|blouse|sweater/i.test(x))));
 add(id+' all four fixed tabs stay visible',await page.locator('#tab-all').isVisible()&&await page.locator('#tab-clothing').isVisible()&&await page.locator('#tab-accessories').isVisible()&&await page.locator('#tab-offduty').isVisible());
 add(id+' Jewelry not duplicated or fixed',!await page.locator('#tab-jewelry').isVisible());
 await page.reload();await page.locator('[data-category-tab=Tops][aria-selected=true]').waitFor();
 add(id+' custom route and settings survive reload',await page.locator('[data-category-tab]').count()===3);
 await page.locator('[data-category-tab=Tops]').focus();await page.keyboard.press('End');add(id+' keyboard reaches last visible tab',await page.locator('[data-category-tab=Bottoms]').evaluate(n=>n===document.activeElement&&n.getAttribute('aria-selected')==='true'));
 await page.goto(base+'/#/profile/settings');await page.getByRole('radiogroup',{name:'Menu labels',exact:true}).getByRole('radio',{name:'Text only',exact:true}).click();await page.goto(base+'/#/closet?category=cat%3ATops');
 add(id+' text only retains custom tab names',await page.locator('[data-category-tab=Tops]').innerText().then(s=>s.includes('Tops')));
 await page.goto(base+'/#/lab');await page.getByText('Adjust the experiment',{exact:true}).click();await page.getByRole('combobox',{name:'Occasion',exact:true}).selectOption('formal');
 add(id+' selected occasion visible',await page.getByRole('combobox',{name:'Occasion',exact:true}).inputValue()==='formal');
 add(id+' focused suggestions include occasion evidence',await page.locator('.labtitle').count()>0&&await page.locator('#view-lab .outfit').first().innerText().then(t=>t.includes('Burgundy cotton top')));
 await page.getByRole('combobox',{name:'Occasion',exact:true}).selectOption('costume');add(id+' no silent occasion fallback',await page.locator('.labempty').innerText().then(t=>t.includes('No complete outfits matched costume')));
 await page.goto(base+'/#/wishlist-ranking');await page.locator('.wrrow[data-id]').first().waitFor();
 add(id+' wishlist evidence stays directly visible',await page.locator('.wrbody .wrchips').first().isVisible());
 const partners=page.locator('.wr-partners-toggle').first();
 add(id+' partner previews start collapsed',await partners.getAttribute('aria-expanded')==='false'&&!await page.locator('.wr-purchase').first().isVisible());
 await partners.click();await page.locator('.wr-purchase').first().waitFor({state:'visible'});
 if(width<701)add(id+' purchase context uses full row width',await page.locator('.wr-purchase').first().evaluate(n=>{const row=n.closest('.wrrow'),s=getComputedStyle(row),content=row.getBoundingClientRect().width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth);return Math.abs(n.getBoundingClientRect().width-content)<2}));
 add(id+' compact partner previews use two columns without pagination',await page.locator('.wr-purchase').first().evaluate(n=>{const previews=n.querySelector('.wr-partners');return previews&&previews.children.length>0&&previews.children.length<=4&&getComputedStyle(previews).gridTemplateColumns.split(' ').length===2&&!n.querySelector('details,.pagination')}));
 if(width===390)await page.screenshot({path:path.join(out,id+'-wishlist.png'),fullPage:true});
 const first=page.locator('.wr-purchase a').first();await first.click();await page.locator('#dlg[open] .piece-editor').waitFor();add(id+' named partner opens piece',true);await page.goto(base+'/#/board');
 await page.locator('#board>.piece').first().focus();
 const del=page.locator('#board>.board-selection-controls .del');await del.waitFor({state:'visible'});
 add(id+' tape stays behind controls',await del.evaluate(n=>Number(getComputedStyle(n.parentElement).zIndex)>Number(getComputedStyle(document.querySelector('#board>.piece')).zIndex)));
 if(width===390)await page.screenshot({path:path.join(out,id+'-tape.png'),fullPage:true});
 await del.click();add(id+' tape does not obstruct delete',await page.locator('#board>.piece').count()===0);await page.keyboard.press('Control+z');add(id+' deletion remains undoable',await page.locator('#board>.piece').count()===1);
 add(id+' no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));add(id+' no browser exceptions',errors.length===0,errors);
 await page.goto(base+'/#/profile/settings');await page.getByRole('button',{name:'Restore default tabs',exact:true}).click();add(id+' default restores Jewelry only',await page.locator('.closet-tab-picked').count()===1&&await page.locator('.closet-tab-picked').innerText().then(t=>t.includes('Jewelry')));await page.goto(base+'/#/closet');add(id+' Jewelry renders once beside four fixed tabs',await page.locator('#tab-jewelry').isVisible()&&await page.locator('#view-closet nav.tabs button:visible').count()===5);
 if(width===390)await page.screenshot({path:path.join(out,id+'.png'),fullPage:true});await ctx.close();console.log(id+' passed');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,failures:0}));
}catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(e)},null,2));throw e}finally{await browser?.close();server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});
