const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.SPLIT_OUTPUT||fs.mkdtempSync('/tmp/closet-split-review-');fs.mkdirSync(out,{recursive:true});
(async()=>{let server,browser,activePage;const checks=[],fixture=fs.mkdtempSync('/tmp/closet-split-fixture-');function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+' '+JSON.stringify(detail))}try{
const seed=spawnSync('python3',['-c',`import sys
from pathlib import Path
sys.path[:0]=['tools','runtime']
from create_demo import demo_source
from storage import Store
s=demo_source()
cols=s.payload['collections']
o=cols['outfits']['demo-look']
o['name']='Evening outfit'
o['plans']=[{'k':'event-old','d':'2026-10-31','name':'Past party'},{'k':'event-next','d':'2026-11-04','name':'A rather elaborate birthday celebration','loc':'The botanical garden'},{'k':'event-later','d':'2026-11-20','name':'Later event'}]
ids=[p['id'] for p in o['pieces']]
cols['ratings']['test-love']={'ids':ids,'r':1,'t':1793635200000}
cols['trips']={'upcoming':{'name':'A weekend away in the city','settings':{'kind':'trip','start':'2026-11-06','end':'2026-11-08','dest':'Portland'},'plan':{'outfits':[{'ids':ids,'pin':True,'fors':'d:2026-11-06'}]}}}
import copy
second=copy.deepcopy(o);second['name']='Afternoon outfit';second['plans']=[{'k':'same-day','d':'2026-11-04','name':'An afternoon appointment'},{'k':'blank-title','d':'2026-11-05','name':''},{'k':'same-title','d':'2026-11-09','name':'Afternoon outfit'}];cols['outfits']['second-look']=second
o['wearLog']=[{'d':'2026-11-01','ids':ids}]
cols['trips']['upcoming']['plan']['outfits'].append({'ids':ids,'pin':True,'fors':'any'})
import copy
for width in (390,768,1280):
 p=copy.deepcopy(s.payload['base']['catalog'][0])
 p.update({'name':'5pcs ribbed tees','title':'5pcs ribbed tees','meta':'Tops','sub':'Tees','colors':['black','blue'],'wish':True,'care':{'wash':'Gentle'}})
 cols['custom']['split-'+str(width)]=p
Store(Path(${JSON.stringify(fixture)})).restore(s)`],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(seed.status)throw Error(seed.stderr);
const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(0,'127.0.0.1',r)});const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn('python3',['runtime/server.py','--data',fixture,'--port',String(port)],{cwd:root,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});const base='http://127.0.0.1:'+port;for(let i=0;i<90;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});


for(const [width,skin,theme] of [[390,'fieldnotes','light'],[768,'editorial','dark'],[1280,'workshop','dark']]){
 const id=[width,skin,theme].join('-'),ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];activePage=page;page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await ctx.addInitScript(p=>localStorage.setItem('closetlint.display.v1',JSON.stringify(p)),{skin,theme});
 await page.goto(base+'/#/pieces/c-split-'+width);await page.locator('#dlg[open]').waitFor();
 await page.getByRole('button',{name:/Split 5 pieces/}).click();const split=page.getByRole('dialog',{name:'Split into separate pieces',exact:true});await split.waitFor();
 check(id+' explicit count offered',await split.getByRole('spinbutton',{name:'How many pieces',exact:true}).inputValue()==='5');
 check(id+' five editable variants',await split.locator('.split-variant').count()===5);
 check(id+' no guessed colors',await split.getByRole('combobox',{name:'Color for piece 1',exact:true}).inputValue()==='');
 check(id+' integrated photo choice',await split.getByRole('radio').count()===3);
 await split.getByRole('textbox',{name:'Name detail for piece 1',exact:true}).fill('Black striped');
 await split.getByRole('spinbutton',{name:'How many pieces',exact:true}).fill('3');await split.getByRole('spinbutton',{name:'How many pieces',exact:true}).fill('5');
 check(id+' count change retains variant details',await split.getByRole('textbox',{name:'Name detail for piece 1',exact:true}).inputValue()==='Black striped');
 check(id+' dialog reflows',await split.evaluate(n=>n.scrollWidth<=n.clientWidth+1));
 await split.getByRole('radio',{name:'Crop the photos myself',exact:true}).check();await split.screenshot({path:path.join(out,id+'-photos.png')});await split.evaluate(n=>{n.scrollTop=0;n.querySelector('.split-body').scrollTop=0});await split.screenshot({path:path.join(out,id+'-review.png')});
 await split.getByRole('button',{name:'Split into 5 pieces',exact:true}).click();const done=page.getByRole('dialog',{name:'Pieces split',exact:true});await done.waitFor();
 check(id+' directly continues to crop list',await done.getByRole('button',{name:/Crop photo for/}).count()===5);
 await done.getByRole('button',{name:/Crop photo for/}).first().click();const crop=page.getByRole('dialog',{name:'Crop photo',exact:true});await crop.waitFor();await crop.locator('.cropstage img').waitFor();
 check(id+' reuses crop editor',await crop.getByRole('button',{name:'Apply crop',exact:true}).count()===1);
 await crop.getByRole('button',{name:'Free',exact:true}).click();await crop.getByRole('button',{name:'Apply crop',exact:true}).click();await crop.waitFor({state:'detached'});
 check(id+' crop saved within flow',await done.getByText('✓ Crop saved',{exact:true}).count()===1);
 await done.getByRole('button',{name:'Prepare individual photos',exact:true}).click();const prep=page.getByRole('dialog',{name:'Prepare product photos',exact:true});await prep.waitFor();
 check(id+' assistant gets same five variants',await prep.locator('.photo-preparation-item').count()===5);
 await prep.getByRole('button',{name:'Prepare assistant request',exact:true}).click();await prep.getByRole('button',{name:'Copy photo request',exact:true}).waitFor();
 await prep.getByText('Read the request',{exact:true}).click();
 const prompt=await prep.getByRole('textbox',{name:'Photo preparation request',exact:true}).inputValue();
 check(id+' prompt identifies named variant',prompt.includes('Black striped')&&prompt.includes('photo-only request')&&prompt.includes('Piece numbers are labels, not positions')&&!prompt.includes('Numbered pack item'));
 check(id+' no page errors',errors.length===0,errors);
 await ctx.close();console.log(id+' passed');
}
const saved=spawnSync('python3',['-c',`import sys,json
from pathlib import Path
sys.path.insert(0,'runtime')
from storage import Store
c=Store(Path(${JSON.stringify(fixture)})).state()['collections']
rows=[p for p in c['custom'].values() if p.get('variantOf','').startswith('c-split-')]
assert len(rows)==15
assert all(p['wish'] and p['care']['wash']=='Gentle' for p in rows)
assert all('split-'+str(w) not in c['custom'] for w in (390,768,1280))
edits=[v for k,v in c['edits'].items() if k.startswith('c-s') and v.get('photos')]
assert len(edits)==3
assert all(len(e['photos'])>=2 for e in edits)
print('All 15 variants saved once; ownership/care and original photos retained.')`],{cwd:root,encoding:'utf8'});check('saved records and originals',saved.status===0,saved.stderr);console.log(saved.stdout.trim());
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,failures:0,output:out}));
}catch(error){if(activePage){await activePage.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error('PAGE',activePage.url(),(await activePage.locator('body').innerText().catch(()=>'' )).slice(0,2200))}fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,error:String(error)},null,2));throw error}finally{await browser?.close();server?.kill()}})().catch(error=>{console.error(error);process.exit(1)});
