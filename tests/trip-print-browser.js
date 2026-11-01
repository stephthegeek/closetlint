// Chrome pagination regression: anonymous text outside a packing sheet must not add pages.
// Uses synthetic images and data, and never opens or changes a wardrobe.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const source=fs.readFileSync(process.env.APP||path.join(__dirname,'../app/closet-lint.html'),'utf8');
const printFunction=source.slice(source.indexOf('async function tripPrint(data){'),source.indexOf('function tripExportUI(T){'));
const markup=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link[^>]*>/gi,'');
const pages=pdf=>(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
(async()=>{
 const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
 let checks=0;
 try{
  const page=await browser.newPage();
  for(const skin of ['workshop','fieldnotes','editorial'])for(const format of ['Letter','A4'])for(const appendix of [false,true])for(const scale of [0.9,1]){
   await page.setContent(markup);
   await page.evaluate(async({skin,appendix,fn})=>{
    document.documentElement.dataset.skin=skin;
    window.$=id=>document.getElementById(id);window.toast=()=>{};window.print=()=>{};
    window.holdPrint=e=>e.stopImmediatePropagation();window.addEventListener('afterprint',window.holdPrint,true);
    window.el=(tag,attrs,...children)=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs||{})){if(k==='text')n.textContent=v;else n.setAttribute(k,v)}children.flat().filter(x=>x!=null).forEach(x=>n.append(x));return n};
    window.tripExportText=value=>String(value||'');eval(fn);
    const photo='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#568075"/></svg>');
    await tripPrint({name:'Packing regression',details:'Four days',groups:[2,1,1,1,3,2].map((count,g)=>({name:'Category '+g,rows:Array.from({length:count},(_,i)=>({name:'Example clothing item '+g+' '+i,checked:false,photos:Array.from({length:g===4?[4,2,4][i]:1},()=>photo)}))})),outfits:appendix?[{name:'Evening outfit',when:'Saturday',pieces:['Top','Trousers','Shoes']}]:[]});
   },{skin,appendix,fn:printFunction});
   const options={format,scale,displayHeaderFooter:true,headerTemplate:'<span style="font-size:9px">Packing regression</span>',footerTemplate:'<span style="font-size:9px">Page <span class="pageNumber"></span></span>'};
   const expected=pages(await page.pdf(options));assert(expected>0);
   for(const where of ['body','documentElement']){
    await page.evaluate(where=>document[where].appendChild(document.createTextNode('\u200b')),where);
    assert.equal(pages(await page.pdf(options)),expected,JSON.stringify({skin,format,appendix,scale,where}));
    checks++;
   }
   await page.evaluate(()=>{window.removeEventListener('afterprint',window.holdPrint,true);window.dispatchEvent(new Event('afterprint'))});
   assert.equal(await page.locator('#trip-print-sheet').count(),0,'printing cleanup removes the sheet');
  }
  console.log('Packing PDF pagination: '+checks+' stray-text checks across themes, Letter/A4, scales, photos, and outfit appendices pass.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
