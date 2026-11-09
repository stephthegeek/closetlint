// Synthetic wardrobe only. Exercise the shared controls, persistence, and responsive settings.
const fs=require('fs'),path=require('path'),net=require('net'),{spawn,spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),{chromium}=require('playwright'),out=process.env.SETTINGS_OUTPUT||fs.mkdtempSync('/tmp/closet-settings-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let browser,server,lastPage;const checks=[],errors=[];function check(name,ok){checks.push({name,passed:!!ok});if(!ok)throw Error(name)}
try{
 const data=fs.mkdtempSync('/tmp/closet-settings-synthetic-');
 const seed=spawnSync('python3',['-c',`import sys\nfrom pathlib import Path\nsys.path[:0]=['tools','runtime']\nfrom create_demo import demo_source\nfrom storage import Store\ns=demo_source()\ns.payload['collections']['profile']['onboarding']={'started': True}\nStore(Path(${JSON.stringify(data)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 server=spawn('python3',['runtime/server.py','--data',data,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;
 for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,80))}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
 for(const width of (process.env.SETTINGS_REVIEW_FOCUSED?[390]:[320,390,768,1366]))for(const skin of (process.env.SETTINGS_REVIEW_FOCUSED?['workshop']:['workshop','fieldnotes','editorial']))for(const theme of (process.env.SETTINGS_REVIEW_FOCUSED?['dark']:['light','dark'])){
  const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:950},colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage();lastPage=page;page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(id+': '+e.message));
  await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});
  await page.goto(base+'/#/profile/settings');await page.locator('#profile-settings .form-choice').first().waitFor();
  check(id+' all real visual options mounted',await page.locator('#site-theme').evaluate(s=>s.hidden&&s.formChoice.querySelectorAll('[role=radio]').length===3));
  check(id+' settings have no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(id+' primary choice text readable',await page.locator('#profile-settings .form-choice button').evaluateAll(bs=>bs.every(b=>parseFloat(getComputedStyle(b).fontSize)>=15)));
  check(id+' switches have consistent dimensions',await page.locator('#profile-settings input[role=switch]').evaluateAll(bs=>bs.every(b=>b.getBoundingClientRect().width===44&&b.getBoundingClientRect().height===26)));
  check(id+' on switch has a distinct track',await page.locator('#wardrobe-logo').evaluate(n=>!n.checked||getComputedStyle(n).backgroundColor!==getComputedStyle(document.getElementById('laundry-enabled')).backgroundColor));
  if(width===1366){await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));const violations=await page.evaluate(async()=> (await axe.run('#profile-settings',{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-allowed-attr','aria-required-attr','aria-valid-attr-value']}})).violations);check(id+' settings accessibility checks',violations.length===0);}
  check(id+' categories initially collapsed',!(await page.locator('#category-settings .category-chooser').getAttribute('open'))&&await page.locator('#category-settings .category-chooser').evaluate(n=>!n.open));
  if((theme==='dark'&&(width===390||width===1366))||(width===1366&&skin==='fieldnotes'&&theme==='light'))await page.screenshot({path:path.join(out,id+'.png'),fullPage:true});
  if(width===390&&skin==='workshop'&&theme==='dark'){
   const chooser=page.locator('#category-settings .category-chooser');await chooser.locator('>summary').click();
   check('category tree uses page scrolling',await page.locator('#category-settings .category-tree').evaluate(n=>getComputedStyle(n).maxHeight==='none'&&getComputedStyle(n).overflowY==='visible'));
   check('in-use categories have no disabled boxes',await page.locator('#category-settings .category-locked').count()>0&&await page.locator('#category-settings .category-locked input').count()===0);
   await page.getByRole('button',{name:'Collapse all',exact:true}).click();check('collapse all closes category groups',await chooser.locator('details[open]').count()===0);
   await page.getByRole('button',{name:'Expand all',exact:true}).click();check('expand all opens category groups',await chooser.locator('details:not([open])').count()===0);
   await page.getByRole('searchbox',{name:'Search categories',exact:true}).fill('not-a-real-category');check('search has empty state',await chooser.getByText('No matching categories.',{exact:true}).isVisible());await page.getByRole('searchbox',{name:'Search categories',exact:true}).fill('');
   await page.screenshot({path:path.join(out,'categories-expanded.png'),fullPage:true});
   const empty=chooser.locator('input[type=checkbox]').first(),emptyLabel=await empty.getAttribute('aria-label'),before=await empty.isChecked();await empty.setChecked(!before);
   await page.waitForFunction(label=>{const n=Array.from(document.querySelectorAll('#category-settings input[type=checkbox]')).find(n=>n.getAttribute('aria-label')===label);return n&&!n.disabled},emptyLabel);
   check('saving category choice retains open disclosure',await chooser.evaluate(n=>n.open)&&await chooser.getByRole('checkbox',{name:emptyLabel,exact:true}).isChecked()===!before);
   await chooser.getByRole('checkbox',{name:emptyLabel,exact:true}).setChecked(before);await page.waitForFunction(label=>{const n=Array.from(document.querySelectorAll('#category-settings input[type=checkbox]')).find(n=>n.getAttribute('aria-label')===label);return n&&!n.disabled},emptyLabel);
   await chooser.locator('>summary').click();
   await page.locator('#closet-add-tab').selectOption('Tops');await page.locator('#closet-add-tab').selectOption('Bottoms');check('extra tabs cap at three',await page.locator('#closet-add-tab').isDisabled()&&await page.locator('.closet-tab-picked').count()===3);
   await page.getByRole('button',{name:'Remove Tops tab',exact:true}).click();check('removing a tab leaves ordered chips',await page.locator('.closet-tab-picked').count()===2&&!await page.locator('#closet-add-tab').isDisabled());
   check('chosen tabs excluded from add picker',await page.locator('#closet-add-tab option[value="Bottoms"]').count()===0);
   await page.getByRole('button',{name:'Restore default tabs',exact:true}).click();check('default tabs restored',await page.locator('.closet-tab-picked').count()===1&&await page.locator('.closet-tab-picked').innerText().then(x=>x.includes('Jewelry')));
   const appearance=page.getByRole('radiogroup',{name:'Light or dark',exact:true});await appearance.getByRole('radio',{name:'Light',exact:true}).click();check('segmented choice stores actual preference',await page.evaluate(()=>JSON.parse(localStorage.getItem('closetlint.display.v1')).theme==='light'));
   await appearance.getByRole('radio',{name:'Light',exact:true}).press('ArrowRight');check('radio arrow key selects next option',await appearance.getByRole('radio',{name:'Dark',exact:true}).getAttribute('aria-checked')==='true');
   await page.getByRole('radiogroup',{name:'Site theme',exact:true}).getByRole('radio',{name:'Field Notes',exact:true}).click();check('theme preview applies and reflects selection',await page.locator('html').getAttribute('data-skin')==='fieldnotes');
   await page.getByRole('button',{name:'Reset display preferences',exact:true}).click();check('reset resynchronizes visible selections',await page.getByRole('radiogroup',{name:'Site theme',exact:true}).getByRole('radio',{name:'Soft Hardware',exact:true}).getAttribute('aria-checked')==='true');
   await page.goto(base+'/#/profile/sizes');const group=page.getByRole('radiogroup',{name:'Measurement units',exact:true});await group.waitFor();await group.getByRole('radio',{name:'cm / kg',exact:true}).click();check('sizes units persist',await page.evaluate(()=>localStorage.getItem('closetlint.units.v1')==='met'));
   await page.locator('.profile-measurements').getByRole('button',{name:/New entry/}).click();await page.getByRole('textbox',{name:'Waist',exact:true}).fill('76.2');
   const entry=page.locator('#dlg').getByRole('radiogroup',{name:'Measurement units',exact:true});await entry.getByRole('radio',{name:'in / lb',exact:true}).click();check('entry units convert without clearing',await page.getByRole('textbox',{name:'Waist',exact:true}).inputValue()==='30');
   await entry.getByRole('radio',{name:'cm / kg',exact:true}).click();check('entry conversion round trip',await page.getByRole('textbox',{name:'Waist',exact:true}).inputValue()==='76.2');
   await page.screenshot({path:path.join(out,'measurement-entry.png'),fullPage:true});page.once('dialog',d=>d.accept());await page.locator('#dlg').getByRole('button',{name:'Cancel',exact:true}).click();
   await page.locator('#menubtn').click();await page.getByRole('menuitem',{name:/Utilities/}).click();await page.getByRole('menuitem',{name:/Getting started/}).click();await page.getByRole('button',{name:'2. Preferences',exact:true}).click();check('onboarding uses shared visual pickers',await page.locator('#setup-wizard .form-choice-themes').count()===1&&await page.locator('#setup-wizard .form-choice-packs').count()===1);
   await page.locator('#setup-wizard').getByRole('radiogroup',{name:'Emoji pack',exact:true}).getByRole('radio',{name:'Masc',exact:true}).click();check('onboarding picker saves same preference',await page.evaluate(()=>JSON.parse(localStorage.getItem('closetlint.display.v1')).icons==='masc'));
   await page.screenshot({path:path.join(out,'onboarding-preferences.png'),fullPage:true});
  }
  check(id+' no browser exceptions',errors.length===0);await ctx.close();
 }
 check('no browser exceptions',errors.length===0);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,failures:0,output:out}));
}catch(e){if(lastPage)await lastPage.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors,error:String(e)},null,2));throw e}finally{await browser?.close();server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});
