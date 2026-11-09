const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync(__dirname+'/../app/scripts/navigation.js','utf8'),ctx={URLSearchParams};vm.createContext(ctx);vm.runInContext(source.slice(0,source.indexOf('function installClosetRoutes(')),ctx);
for(const quiz of ['fabric','feet','color','jewelry','range']){const hash='#/profile/comfort/'+quiz,r=ctx.parseClosetRoute(hash);assert.equal(r.type,'profile');assert.equal(r.id,'comfort');assert.equal(r.quiz,quiz);assert.equal(ctx.closetRouteHash(r),hash)}
for(const bad of ['#/profile/settings/range','#/profile/comfort/range/extra','#/profile/comfort/%2F','#/profile/comfort/%00','#/profile/comfort/%ZZ'])assert.equal(ctx.parseClosetRoute(bad),null);
assert.equal(ctx.closetRouteHash(ctx.parseClosetRoute('#/profile/comfort')),'#/profile/comfort');console.log('Quiz URL parser and hash round trips pass.');
