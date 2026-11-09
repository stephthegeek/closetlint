// Real native popup gestures against the maintained renderer; no personal wardrobe or server.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.DROPDOWN_OUTPUT||fs.mkdtempSync('/tmp/closet-dropdown-');fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(process.env.DROPDOWN_SOURCE_HTML||path.join(root,'app/closet-lint.html'),'utf8'),start=html.indexOf('function renderClosetTabSettings(){'),source=html.slice(start,html.indexOf('function renderClosetCategoryTabs(',start));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined}),page=await browser.newPage({viewport:{width:1000,height:800}}),checks=[];
try{
 await page.setContent('<style>select{width:260px;height:44px}button{min-height:40px}.closet-tab-picks{display:flex;gap:8px}</style><fieldset id="closet-tab-settings"></fieldset>');
 await page.evaluate(source=>{
  const host=document.getElementById('closet-tab-settings');let custom=['Jewelry'],pack='';window.saved=[];
  const el=(tag,attrs={},...children)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else if(k.startsWith('on'))n[k]=v;else if(k==='disabled')n.disabled=!!v;else n.setAttribute(k,v)}children.filter(Boolean).forEach(c=>n.append(c));return n};
  const $=id=>document.getElementById(id),prefs=()=>({version:2,custom:custom.slice()});let render;
  const save=next=>{custom=next.custom?next.custom.filter(Boolean):['Jewelry'];window.saved.push(custom.slice());render()};
  render=Function('$','el','closetTabPrefs','closetCategoryOptionLabel','metaLabel','META','saveClosetTabs',source+';return renderClosetTabSettings')($,el,prefs,m=>pack+m,m=>m,['Jewelry','Tops','Bottoms','Glasses'],save);
  window.redraw=render;window.changeLabels=()=>{pack='Updated ';render()};render();window.original=document.getElementById('closet-add-tab');window.originalOptions=Array.from(original.options);
 },source);
 for(const delay of [0,75,200]){
  const select=page.locator('#closet-add-tab'),r=await select.boundingBox();await page.mouse.move(r.x+r.width-15,r.y+r.height/2);await page.mouse.down();if(delay)await page.waitForTimeout(delay);await page.mouse.up();
  assert(await select.evaluate(n=>n.matches(':open')),'opening click keeps the native menu open');
  await page.evaluate(()=>{redraw();redraw();redraw()});
  assert(await select.evaluate(n=>n===original&&n.matches(':open')),'refresh retains the same open select');
  assert(await select.evaluate(n=>Array.from(n.options).every((o,i)=>o===originalOptions[i])),'unchanged refresh does not rewrite option nodes');
  assert.equal(await page.evaluate(()=>saved.length),0,'opening or refreshing never commits a choice');
  await page.keyboard.press('Escape');assert.equal(await select.inputValue(),'','Escape keeps the add placeholder');checks.push('pointer '+delay+'ms: open, refresh, cancel, no accidental choice');
 }
 await page.locator('#closet-add-tab').click();await page.evaluate(()=>changeLabels());assert(await page.locator('#closet-add-tab').evaluate(n=>n.matches(':open')&&n===original),'changed labels are deferred while the popup is open');
 await page.keyboard.press('Escape');await page.locator('legend').click();assert.equal(await page.locator('#closet-add-tab option[value=Tops]').textContent(),'Updated Tops','deferred updates apply after leaving the picker');checks.push('pending label changes leave the open menu untouched');
 await page.locator('#closet-add-tab').selectOption('Tops');assert(await page.locator('#closet-add-tab').evaluate(n=>n===original),'selection never replaces the select');assert.equal(await page.locator('#closet-add-tab').inputValue(),'','confirmed addition returns to the placeholder');assert.equal(await page.locator('.closet-tab-picked').count(),2);assert.equal(await page.locator('#closet-add-tab option[value=Tops]').count(),0);checks.push('addition is saved once with a stable picker and updated choices');
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,passed:true},null,2));console.log(JSON.stringify({checks:checks.length,passed:true}));
}catch(e){await page.screenshot({path:path.join(out,'failure.png')});throw e}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
