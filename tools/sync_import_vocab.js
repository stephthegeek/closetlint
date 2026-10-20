// Export the app's current import vocabulary; development tool, not a runtime dependency.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'app/closet-lint.html'),'utf8');
const context={};vm.createContext(context);
vm.runInContext(html.slice(html.indexOf('var META='),html.indexOf('var DEFAULT_W=')),context);
const data={categories:context.META,subcategories:context.SUBS,fields:[{key:'colors',multi:true,vocab:Object.keys(context.COLORS)},...context.DIMS.filter(d=>d.key!=='layer').map(({key,multi,vocab})=>({key,multi:!!multi,vocab}))],glassesTypes:context.GL_TYPES};
const output=JSON.stringify(data,null,2)+'\n',target=path.join(root,'runtime/import-vocabulary.json');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Run node tools/sync_import_vocab.js after changing import vocabulary.')}else fs.writeFileSync(target,output);
