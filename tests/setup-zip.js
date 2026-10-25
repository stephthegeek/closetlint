const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8'),setup=fs.readFileSync(__dirname+'/../app/scripts/setup.js','utf8');
const core=html.slice(html.indexOf('function crc32('),html.indexOf('function zipBlob('));
const crcContext={};vm.createContext(crcContext);vm.runInContext('var _crcT=null;'+core,crcContext);
function makeZip(files,{method=8,corrupt=false}={}){
 const locals=[],central=[];let offset=0;
 for(const [name,value] of files){const nm=Buffer.from(name),data=Buffer.from(value),packed=method===8?zlib.deflateRawSync(data):data,crc=crcContext.crc32(data),local=Buffer.alloc(30),entry=Buffer.alloc(46);
 local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(method,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(nm.length,26);
 entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x800,8);entry.writeUInt16LE(method,10);entry.writeUInt32LE(corrupt?crc^1:crc,16);entry.writeUInt32LE(packed.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(nm.length,28);entry.writeUInt32LE(offset,42);
 locals.push(local,nm,packed);central.push(entry,nm);offset+=local.length+nm.length+packed.length;
 }
 const c=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(c.length,12);end.writeUInt32LE(offset,16);return new Blob([...locals,c,end]);
}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const manifest=(extra={})=>JSON.stringify({format:'closet-lint-import/v1',pieces:[{name:'Synthetic tee',category:'Tops',status:'owned',...extra}]});
async function run(){
 const issued=[],revoked=[],c={setTimeout,clearTimeout,Blob,TextDecoder,DecompressionStream,URL:{createObjectURL(blob){const url='blob:synthetic-'+issued.length;issued.push({url,blob});return url},revokeObjectURL:url=>revoked.push(url)},setupParse(text){const d=JSON.parse(text);if(d.format!=='closet-lint-import/v1')throw Error('Use Restore backup');},crc32:crcContext.crc32};
 vm.createContext(c);vm.runInContext(setup.slice(setup.indexOf('/* Browser-only ZIP import:'),setup.indexOf('/* End browser ZIP import. */')),c);
 for(const method of [0,8]){const result=await c.setupReadZip(makeZip([['package/import.json',manifest({photoFile:'photos/top.png'})],['package/photos/top.png',png]],{method}));const p=JSON.parse(result.text).pieces[0];assert.equal(p.photoFile,'');assert.match(p.images[0].url,/^blob:/);assert.equal(Object.keys(result.photos).length,1);c.setupReleaseArchive({archivePhotos:result.photos});}
 const gallery=await c.setupReadZip(makeZip([['import.json',manifest({images:[{file:'a.png',kind:'isolated'},{file:'b.png',kind:'detail'}]})],['a.png',png],['b.png',png]]));assert.equal(JSON.parse(gallery.text).pieces[0].images[1].kind,'detail');c.setupReleaseArchive({archivePhotos:gallery.photos});
 const missing=await c.setupReadZip(makeZip([['import.json',manifest({photoFile:'missing.png'})]]));assert.equal(missing.missing[0],'missing.png');assert.equal(JSON.parse(missing.text).pieces[0].photoFile,'missing.png','missing photos remain unresolved for review');
 for(const files of [ [['../import.json',manifest()]], [['import.json',manifest()],['import.json',manifest()]], [['one.json',manifest()],['two.json',manifest()]], [['import.json',manifest({photoFile:'a.png'})],['one/a.png',png],['two/a.png',png]], [['import.json',manifest({photoFile:'a.svg'})],['a.svg','<svg/>']] ])await assert.rejects(c.setupReadZip(makeZip(files)));
 await assert.rejects(c.setupReadZip(makeZip([['import.json',manifest()]],{corrupt:true})),/damaged|checksums disagree/);
 await assert.rejects(c.setupReadZip(new Blob(['not a ZIP'])),/unreadable/);
 await assert.rejects(c.setupReadZip({size:51*1024*1024}),/50 MB/);
 const tooLarge=Buffer.from(await makeZip([['import.json',manifest()]]).arrayBuffer()),at=tooLarge.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));tooLarge.writeUInt32LE(1024*1024+1,at+24);await assert.rejects(c.setupReadZip(new Blob([tooLarge])),/too large/);
 const encrypted=Buffer.from(await makeZip([['import.json',manifest()]]).arrayBuffer());const cd=encrypted.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));encrypted.writeUInt16LE(0x801,cd+8);await assert.rejects(c.setupReadZip(new Blob([encrypted])),/password/);
 const abort=new AbortController();abort.abort();await assert.rejects(c.setupReadZip(makeZip([['import.json',manifest()]]),{signal:abort.signal}),/cancelled/);
 await assert.rejects(c.setupReadZip({size:1,arrayBuffer:()=>new Promise(()=>{})},{timeoutMs:10}),/timed out/);
 const waiting=new AbortController(),pending=c.setupReadZip({size:1,arrayBuffer:()=>new Promise(()=>{})},{signal:waiting.signal});waiting.abort();await assert.rejects(pending,/cancelled/);
 const bytes=async files=>Buffer.from(await makeZip(files,{method:0}).arrayBuffer());
 const disagree=await bytes([['import.json',manifest()]]);disagree.writeUInt32LE(1,18);await assert.rejects(c.setupReadZip(new Blob([disagree])),/sizes or checksums/);
 const linked=await bytes([['import.json',manifest()]]),linkedCD=linked.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));linked.writeUInt32LE(0xa1ff0000,linkedCD+38);await assert.rejects(c.setupReadZip(new Blob([linked])),/links/);
 const overlap=await bytes([['padding.bin','padding'],['import.json',manifest()]]),firstCD=overlap.indexOf(Buffer.from([0x50,0x4b,0x01,0x02])),firstData=30+Buffer.byteLength('padding.bin'),span=firstCD-firstData,overlapCRC=crcContext.crc32(overlap.subarray(firstData,firstCD));
 overlap.writeUInt32LE(span,18);overlap.writeUInt32LE(span,22);overlap.writeUInt32LE(overlapCRC,14);overlap.writeUInt32LE(span,firstCD+20);overlap.writeUInt32LE(span,firstCD+24);overlap.writeUInt32LE(overlapCRC,firstCD+16);await assert.rejects(c.setupReadZip(new Blob([overlap])),/overlapping/);
 const descriptorBase=await bytes([['import.json',manifest()]]),descriptorCD=descriptorBase.indexOf(Buffer.from([0x50,0x4b,0x01,0x02])),descriptor=Buffer.alloc(16);descriptor.writeUInt32LE(0x08074b50);descriptorBase.copy(descriptor,4,14,26);const descriptorZip=Buffer.concat([descriptorBase.subarray(0,descriptorCD),descriptor,descriptorBase.subarray(descriptorCD)]);descriptorZip.writeUInt16LE(0x808,6);descriptorZip.writeUInt16LE(0x808,descriptorCD+16+8);descriptorZip.writeUInt32LE(descriptorCD+16,descriptorZip.length-6);await c.setupReadZip(new Blob([descriptorZip]));descriptorZip[descriptorCD+4]^=1;await assert.rejects(c.setupReadZip(new Blob([descriptorZip])),/descriptor/);
 const bomb=Buffer.from(await makeZip([['import.json','x'.repeat(2*1024*1024)]]).arrayBuffer()),bombCD=bomb.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));bomb.writeUInt32LE(10,22);bomb.writeUInt32LE(10,bombCD+24);await assert.rejects(c.setupReadZip(new Blob([bomb])),/expands beyond/);
 const noDecompression=c.DecompressionStream;c.DecompressionStream=undefined;await assert.rejects(c.setupReadZip(makeZip([['import.json',manifest()]])),/cannot unpack/);c.DecompressionStream=noDecompression;
 const old=issued.length;await assert.rejects(c.setupReadZip(makeZip([['import.json',manifest({images:[{file:'a.png'},{file:'bad.svg'}]})],['a.png',png],['bad.svg','bad']])));assert(revoked.includes(issued[old].url),'failure revokes photos already prepared');
 console.log('ZIP import: stored/deflated archives, relative paths, ordered galleries, missing-photo review, cleanup, corrupt data, duplicate/unsafe/ambiguous paths, image types, encryption, and size limits pass.');
}
module.exports={makeZip,png,manifest};if(require.main===module)run().catch(e=>{console.error(e);process.exit(1)});
