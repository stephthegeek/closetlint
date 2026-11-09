const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app/scripts/profile.js','utf8'),a=source.indexOf('function profileLookupCities('),b=source.indexOf('\nfunction profileMountSettings(',a),ctx={};vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
const match={label:'San Francisco, California, United States',latitude:37.77,longitude:-122.42,timezone:'America/Los_Angeles'};
(async()=>{
 let calls=[];const lookup=async q=>{calls.push(q);return {places:q==='San Francisco'?[match]:[]}};
 assert.equal((await ctx.profileLookupCities('San Francisco, CA',lookup))[0].timezone,match.timezone);assert.deepEqual(calls,['San Francisco, CA','San Francisco']);
 calls=[];assert.equal((await ctx.profileLookupCities('San Francisco CA',lookup))[0].label,match.label);assert.deepEqual(calls,['San Francisco']);
 await assert.rejects(ctx.profileLookupCities('San Francisco',async()=>({places:[{...match,timezone:undefined}]})),/Restart the local/,'an old server must not falsely report no city');
 assert.equal((await ctx.profileLookupCities('Nowhere',async()=>({places:[{label:'Invalid',latitude:'x',longitude:0}]}))).length,0);
 await assert.rejects(ctx.profileLookupCities('City',async()=>{throw Error('offline')}),/offline/);
 console.log('Profile city lookup: comma/state fallback, time-zone retention, outdated-service diagnosis, malformed coordinates, and offline recovery pass.');
})().catch(e=>{console.error(e);process.exit(1)});
