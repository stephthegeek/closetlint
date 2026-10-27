// Preference migration and independent theme/icon rendering, using real app functions.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../app/closet-lint.html'),'utf8');
const shell=source.split('/* ---------- Closet Lint shell behavior ---------- */')[1].split('/* ---------- end Closet Lint shell behavior ---------- */')[0];
const icons=source.slice(source.indexOf('function applyThemeIcons('),source.indexOf('function initWardrobeMounts('));
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},querySelector(){return node(id+'-icon')}});return nodes.get(id)}
const writes=[],ctx={$:node,document:{documentElement:node('root'),querySelector:()=>node('owned-icon')},localStorage:{getItem:()=>JSON.stringify({theme:'light',density:3}),setItem:(key,value)=>writes.push([key,JSON.parse(value)])},toast(){throw Error('Unexpected storage failure')}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/scripts/control-icons.js'),'utf8')+'\n'+shell+'\n'+icons,ctx);
let prefs=ctx.readDisplayPrefs();assert.equal(prefs.theme,'light');assert.equal(prefs.density,3);assert.equal(prefs.skin,'workshop','existing view choices migrate to default Soft Hardware');
ctx.applyDisplayPrefs({...prefs,skin:'fieldnotes',icons:'other',emoji:'grayscale',edge:'outline'});
assert.equal(node('root').attrs['data-skin'],'fieldnotes');assert.equal(node('root').attrs['data-theme'],'light');assert.equal(node('root').attrs['data-density'],'3');assert.equal(node('go-lab-icon').textContent,'🧪');assert.equal(node('go-closet-icon').textContent,'👕');assert.equal(node('owned-icon').textContent,'👕');
node('site-theme').value='editorial';node('icon-pack').value='masc';node('emoji-treatment').value='lilac';node('emoji-edge').value='glow';node('photo-finish').value='warm';ctx.storeDisplayPrefs();
assert.equal(writes.length,1);assert.equal(writes[0][0],'closetlint.display.v1');assert.equal(writes[0][1].skin,'editorial');assert.equal(writes[0][1].icons,'masc');assert.equal(writes[0][1].theme,'light');assert.equal(writes[0][1].density,3);assert.equal(node('go-closet-icon').textContent,'👖');assert.equal(node('go-lab-icon').textContent,'👨‍🔬');
const clean=ctx.cleanDisplayPrefs({skin:'bad',icons:'bad',emoji:'bad',edge:'bad',photo:'bad'});assert.equal(clean.skin,'workshop');assert.equal(clean.icons,'femme');assert.equal(clean.photo,'original');assert.equal(ctx.cleanDisplayPrefs({photo:'warm'}).photo,'original','retired tint never alters garment colors');
assert.equal(ctx.cleanDisplayPrefs({photo:'light'}).photo,'light','the light photo backdrop remains a view preference');
ctx.applyDisplayPrefs({photo:'light'});assert.equal(node('root').attrs['data-photo'],'light');
vm.runInContext(source.match(/function ratingEmoji\(r\)\{[^\n]+/)[0]+'\n'+source.match(/function ratingWord\(r\)\{[^\n]+/)[0],ctx);assert.equal(ctx.ratingEmoji(0),'😏');assert.equal(ctx.ratingWord(0),'Liked in the Lab');assert.ok(!source.includes("[0,'😐','Meh']"));
assert.ok(source.includes('role="switch" aria-checked="false" aria-label="Fantasy mode"'));
const embedded=source.split('/* BEGIN LIVE THEMES (source: app/styles/themes.css) */\n')[1].split('\n/* END LIVE THEMES */')[0];assert.equal(embedded,fs.readFileSync(path.join(__dirname,'../app/styles/themes.css'),'utf8'));
console.log('Themes: legacy preference migration, independent appearance/density/packs, persistence, scientist icon, Like label and synchronized styles passed.');

// Actual prelaunch key migration: preserve existing destination values and never delete on failure.
const migration=source.match(/\/\* Prelaunch browser-preference move;[^]*?<\/script>/)[0].replace(/<\/script>$/,'');
function movePrefs(entries,fail=false){const values=new Map(entries);const localStorage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>{if(fail)throw Error('quota');values.set(k,v)},removeItem:k=>values.delete(k)};vm.runInNewContext(migration,{localStorage});return values;}
let moved=movePrefs([['lintgoblin.display.v1','{"skin":"fieldnotes"}'],['closet_board','{"pieces":[{"id":"demo"}]}']]);
assert.equal(moved.get('closetlint.display.v1'),'{"skin":"fieldnotes"}');assert.equal(moved.get('closetlint.board.v1'),'{"pieces":[{"id":"demo"}]}');assert.ok(!moved.has('closet_board'));
moved=movePrefs([['lintgoblin.display.v1','old'],['closetlint.display.v1','new']]);assert.equal(moved.get('closetlint.display.v1'),'new');assert.ok(!moved.has('lintgoblin.display.v1'));
moved=movePrefs([['closet_board','keep me']],true);assert.equal(moved.get('closet_board'),'keep me');assert.ok(!moved.has('closetlint.board.v1'));
console.log('Prelaunch rename: preferences/board move safely, destination wins, blocked storage retains source.');

const headerPrefs=ctx.cleanDisplayPrefs({logo:false,title:false});
assert.equal(headerPrefs.logo,true);assert.equal(headerPrefs.title,true);
ctx.applyDisplayPrefs(headerPrefs);assert.equal(node('root').attrs['data-brand-logo'],'true');assert.equal(node('root').attrs['data-brand-title'],'true');
assert.ok(!source.includes('id="show-brand-logo"'));assert.ok(!source.includes('id="show-brand-title"'));
const neutral=ctx.cleanDisplayPrefs({});assert.equal(neutral.menuEmoji,true);assert.equal(neutral.sizeReferenceName,'US standard adult');
assert.equal(ctx.cleanDisplayPrefs({sizeReference:'shein'}).sizeReferenceName,'Temu/Shein size');
assert.equal(ctx.cleanDisplayPrefs({sizeReference:'custom',sizeReferenceName:' My usual UK size '}).sizeReferenceName,'My usual UK size');
assert.equal(ctx.cleanDisplayPrefs({sizeReferenceName:'   '}).sizeReferenceName,'US standard adult');
ctx.applyDisplayPrefs({menuEmoji:false,sizeReferenceName:'My usual UK size'});assert.equal(node('root').attrs['data-menu-emoji'],'off');assert.equal(node('size-reference-name').value,'My usual UK size');
node('menu-emoji').value='off';node('size-reference-name').value='Temu/Shein size';ctx.storeDisplayPrefs();assert.equal(writes.at(-1)[1].menuEmoji,false);assert.equal(writes.at(-1)[1].sizeReferenceName,'Temu/Shein size');
console.log('Launch identity stays fixed; fit-reference labels migrate, trim and persist independently of size choices.');

// Daily-card visibility is opt-out, survives reload, and does not reset other preferences.
assert.equal(ctx.cleanDisplayPrefs({}).dailyCard,true);
node('daily-card-enabled').checked=false;ctx.storeDisplayPrefs();
const hiddenDaily=writes.at(-1)[1];
assert.equal(hiddenDaily.dailyCard,false);
assert.equal(hiddenDaily.sizeReferenceName,'Temu/Shein size');
ctx.localStorage.getItem=()=>JSON.stringify(hiddenDaily);
ctx.applyDisplayPrefs(ctx.readDisplayPrefs());
assert.equal(node('daily-card-enabled').checked,false);
assert.equal(node('root').attrs['data-daily-card'],'off');
node('daily-card-enabled').checked=true;ctx.storeDisplayPrefs();
assert.equal(writes.at(-1)[1].dailyCard,true);
console.log('Daily-card display preference persists and restores.');

// Reset only the display preference record; keep fit labels and unrelated browser data.
const browserData=new Map([
  ['closetlint.board.v1','synthetic-board'],
  ['closetlint.pub_overlay.v1','synthetic-wardrobe-changes'],
  ['closetlint.units','in'],
  ['closetlint.filtersCollapsed','1'],
  ['unrelated-setting','keep']
]);
const unrelatedBefore=[...browserData];
ctx.localStorage={getItem:key=>browserData.get(key)||null,setItem:(key,value)=>browserData.set(key,value)};
ctx.applyDisplayPrefs({theme:'dark',skin:'editorial',density:3,photo:'light',menuEmoji:false,emoji:'grayscale',edge:'outline',icons:'other',dailyCard:false,sizeReferenceName:'My usual UK size'});
ctx.storeDisplayPrefs();
ctx.resetDisplayPrefs();
const resetPrefs=ctx.readDisplayPrefs();
assert.equal(JSON.stringify(resetPrefs),JSON.stringify(ctx.cleanDisplayPrefs({sizeReferenceName:'My usual UK size'})));
assert.deepEqual([...browserData].filter(([key])=>key!=='closetlint.display.v1'),unrelatedBefore);
assert.equal(node('size-reference-name').value,'My usual UK size');
assert.equal(node('root').attrs['data-theme'],undefined,'reset returns to system appearance');
assert.equal(node('thumbsize-label').textContent,'Medium');
assert.match(node('display-prefs-status').textContent,/reset/);
ctx.applyDisplayPrefs(ctx.readDisplayPrefs());
assert.equal(node('site-theme').value,'workshop','defaults survive reloading');
// Storage refusal still applies defaults for the visit, with honest feedback.
ctx.applyDisplayPrefs({theme:'dark',sizeReferenceName:'My usual UK size'});
ctx.storeDisplayPrefs();
const storedBeforeFailure=browserData.get('closetlint.display.v1'),resetNotices=[];
ctx.localStorage.setItem=()=>{throw Error('storage denied')};
ctx.toast=message=>resetNotices.push(message);
ctx.resetDisplayPrefs();
assert.equal(node('root').attrs['data-theme'],undefined);
assert.equal(browserData.get('closetlint.display.v1'),storedBeforeFailure);
assert.match(node('display-prefs-status').textContent,/for this visit/);
assert.equal(resetNotices.length,1);
console.log('Display reset: defaults, preserved fit reference and unrelated data, reload, and storage-failure feedback passed.');
