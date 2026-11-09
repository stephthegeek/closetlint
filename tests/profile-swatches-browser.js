const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.PROFILE_SWATCH_OUTPUT||fs.mkdtempSync('/tmp/closet-profile-swatches-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-profile-swatches-fixture-');function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
import hashlib,struct,zlib
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
rows=s.payload['base']['catalog']
for p in rows:p['wears']=[]
rows[0].update(sw=['#8c3567','#c9ad7b'],colors=['blue'],wears=['2026-10-31'])
rows[1].update(sw=[],colors=['green'],wears=['2026-11-01'])
rows[2].update(sw=['#567899'],colors=['red'],wears=['2026-11-02'])
rows[3].update(sw=[],colors=['beige'],wears=['2026-11-02'])
# Exact photo color with a white border, deliberately different from its green tag.
def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
pixels=b''.join(bytes([0])+b''.join(bytes([109,67,90]) if 8<=x<56 and 8<=y<56 else bytes([255,255,255]) for x in range(64)) for y in range(64))
photo=b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>2I5B',64,64,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(pixels))+chunk(b'IEND',b'')
key=hashlib.sha256(photo).hexdigest()[:32];s.assets[key]=photo
for i in [1,4]:rows[i].update(photoId=key,photos=[{'photoId':key,'kind':'isolated','width':64,'height':64}],ar=1,sw=[],colors=['green'])
rows[4]['wears']=['2026-10-30'];rows[4].pop('sw',None)
rows[3].pop('photoId',None);rows[3]['photos']=[]
s.payload['collections']['outfits']['demo-look']['wearLog']=[{'d':'2026-11-02','ids':[rows[2]['id'],rows[3]['id']]}]
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(0,'127.0.0.1',r)});const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
for(const width of [390,768,1366])for(const skin of ['workshop','fieldnotes','editorial'])for(const theme of ['light','dark']){
const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:950},hasTouch:width<821,isMobile:width<821,colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[],writes=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['PUT','POST','DELETE','PATCH'].includes(r.method())&&/\/api\/(doc|board|wear)/.test(r.url()))writes.push(r.url())});
await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});await page.clock.install({time:new Date('2026-11-02T12:00:00-08:00')});await page.goto(base+'/#/profile');await page.locator('.almanac-calendar').waitFor();const bg=day=>page.locator('.almanac-grid [data-day="'+day+'"]').evaluate(n=>n.style.background);
await page.waitForFunction(()=>document.querySelector('.almanac-grid [data-day="2026-11-01"]').style.background==='rgb(109, 67, 90)');check(id+' unsaved automatic photo swatch replaces conflicting tag',await bg('2026-11-01')==='rgb(109, 67, 90)');const today=await bg('2026-11-02');check(id+' mixed day uses actual swatch and other piece fallback',today.includes('rgb(86, 120, 153)')&&today.includes('rgb(217, 199, 168)')&&!today.includes('rgb(200, 49, 43)'),today);
check(id+' duplicate wear still one logged day',await page.locator('.almanac-footer').innerText().then(t=>t.includes('2 of 2 days logged')));await page.locator('#menubtn').click();const menu=page.locator('.almanac-week [data-day="2026-11-02"]');check(id+' auto swatch matches in menu',await page.locator('.almanac-week [data-day="2026-11-01"]').evaluate(n=>n.style.background)==='rgb(109, 67, 90)');check(id+' menu matches calendar',await menu.evaluate(n=>n.style.background)===today);const old=await page.locator('.almanac-week [data-day="2026-10-31"]').evaluate(n=>n.style.background);check(id+' saved swatches replace conflicting tag in menu',old.includes('rgb(140, 53, 103)')&&old.includes('rgb(201, 173, 123)')&&!old.includes('rgb(60, 120, 216)'),old);await page.keyboard.press('Escape');
await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(...args){if(this.width===1000&&this.height===1100){const c=this.getContext('2d');window.__monthPixels=[[100,280],[224,270],[244,290]].map(([x,y])=>Array.from(c.getImageData(x,y,1,1).data))}return original.apply(this,args)}});
const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Save month as an image',exact:true}).click();const download=await downloaded;await download.saveAs(path.join(out,id+'-month.png'));const pixels=await page.evaluate(()=>window.__monthPixels);check(id+' PNG uses auto photo color and both exact swatches',JSON.stringify(pixels)===JSON.stringify([[109,67,90,255],[86,120,153,255],[217,199,168,255]]),pixels);
await page.getByRole('button',{name:'Previous month',exact:true}).click();check(id+' past calendar matches menu swatches',await bg('2026-10-31')===old);await page.waitForFunction(()=>document.querySelector('.almanac-grid [data-day="2026-10-30"]').style.background==='rgb(109, 67, 90)');check(id+' historical wear auto swatch needs no resave',await bg('2026-10-30')==='rgb(109, 67, 90)');check(id+' layout fits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
if(width===1366&&skin==='workshop'&&theme==='dark'||width===390&&skin==='editorial'&&theme==='light')await page.screenshot({path:path.join(out,id+'.png'),fullPage:true});
await page.reload();await page.locator('.almanac-calendar').waitFor();check(id+' exact colors survive reload',await bg('2026-11-02')===today);await page.waitForFunction(()=>document.querySelector('.almanac-grid [data-day="2026-11-01"]').style.background==='rgb(109, 67, 90)');check(id+' automatic swatches survive refresh',await bg('2026-11-01')==='rgb(109, 67, 90)');check(id+' no data writes',writes.length===0,writes);check(id+' no errors',errors.length===0,errors);await ctx.close();console.log(id+' passed');
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,failures:0,output:out}));
}catch(error){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(error)},null,2));throw error}finally{await browser?.close();server?.kill()}})().catch(error=>{console.error(error);process.exit(1)});
