// Smoke test for the code-only build: loads app/closet-lint.html with no data and no Claude runtime,
// clicks through every tab and menu screen, and fails on any page error.
// Run: npm i -D playwright (or use a global install), then: npm run test:browser
// APP=/path/to/other.html node tests/smoke.js tests a different build (for example the private full file).
const path=require('path');const {chromium}=require('playwright');
(async()=>{
  const exe=process.env.CHROMIUM_PATH;const b=await chromium.launch(exe?{executablePath:exe}:{});
  let failed=false;
  for(const [label,vp] of [['desktop',{width:1300,height:900}],['phone',{width:390,height:844}]]){
    const p=await (await b.newContext({viewport:vp})).newPage();const errs=[];
    p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file://'+path.resolve(process.env.APP||path.resolve(__dirname,'../app/closet-lint.html')));await p.waitForTimeout(1500);
    for(const id of ['tab-all','tab-clothing','tab-accessories','tab-jewelry','tab-offduty','go-saved','go-lab','go-trip','go-closet']){await p.click('#'+id).catch(e=>errs.push('click '+id+': '+e.message));await p.waitForTimeout(250)}
    await p.click('#viewprefs');
    await p.selectOption('#appearance','dark');
    if(await p.locator('html').getAttribute('data-theme')!=='dark')errs.push('View theme not applied');
    await p.locator('#displayprefs button').click();
    for(const item of ['All outfits','Outfit Lab','Wishlist ranking','Trip wizard','Measurements']){
      await p.click('#menubtn');await p.waitForTimeout(150);
      await p.locator('#appmenu button',{hasText:item}).first().click().catch(e=>errs.push('menu '+item+': '+e.message));await p.waitForTimeout(300);
      await p.keyboard.press('Escape');
    }
    const notice=await p.locator('#notice').innerText().catch(()=>'');
    console.log(label,errs.length?'ERRORS: '+errs.join(' | '):'no page errors','| notice:',notice.slice(0,90));
    if(errs.length)failed=true;
  }
  await b.close();process.exit(failed?1:0);
})();
