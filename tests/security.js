// Exercise real SVG rendering with a malicious color from a restored board.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
const attack='\"><image href="x" onerror="alert(1)"/><path fill="';
const c={bst:()=>({bd:'check'}),boardAR:()=>1,frameCols:()=>[attack,'#abcdef'],frameCells:()=>[{c:0,d:'M0 0Z'}]};
vm.createContext(c);
vm.runInContext(source.slice(source.indexOf('function safeSvgColor('),source.indexOf('/* washi tape:')),c);
assert(!c.frameSvg().includes('<image'),'color cannot introduce SVG elements');
assert(!c.frameSvg().includes('onerror'),'color cannot introduce event handlers');
assert(c.frameSvg().includes('#443E4D'),'unsafe colors fall back');
assert.equal(c.safeSvgColor('#abcdef'),'#abcdef');
c.bst=()=>({bd:'wave'});c.framePath=()=> 'M0 0Z';
assert(!c.frameSvg().includes(attack),'wave frames validate colors too');
vm.runInContext(source.match(/function productURL\(value\)\{[^\n]+/)[0],Object.assign(c,{URL}));
assert.equal(c.productURL('javascript:alert(1)'),'');
assert.equal(c.productURL('https://username:secret@example.com/product'),'');
assert.equal(c.productURL('https://example.com/product'),'https://example.com/product');
console.log('Security: hostile restored SVG colors and unsafe product links rejected.');
