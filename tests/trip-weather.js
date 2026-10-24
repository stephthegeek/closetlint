// Synthetic weather: seasonal boundaries, ambiguity, offline recovery, and late replies.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../app/closet-lint.html','utf8');
function fn(name){const a=html.indexOf('function '+name+'(');return html.slice(a,html.indexOf('\n}',a)+2)}
const sample={years:[2023,2025],daily:{time:['2023-12-30','2024-01-01','2025-01-02','2025-07-01'],temperature_2m_min:[30,40,50,99],temperature_2m_max:[50,60,70,110],precipitation_sum:[0,2,0,99]}};
const place={label:'Synthetic city',latitude:48.4,longitude:-123.3};
let requested,rendered=0;
const ctx={Date,AbortController,setTimeout,clearTimeout,encodeURIComponent,window:{ClosetLintLocal:{token:'synthetic-token'}},state:{},toast(){},tripRender:()=>rendered++,tripLookupPlaces:async()=>({places:[place]}),fetch:async(url,options)=>{requested={url,options};return {ok:true,json:async()=>sample}}};
vm.createContext(ctx);vm.runInContext(['tripWeatherPlace','tripWeatherSummary','tripLookupWeather','tripClimate'].map(fn).join('\n'),ctx);
(async()=>{
 let result=ctx.tripWeatherSummary(sample,'2027-01-01','2027-01-01');assert.equal(result.low,40);assert.equal(result.high,60);assert.equal(result.rain,true);assert.match(result.note,/2023–2025/);
 result=ctx.tripWeatherSummary(sample,'2026-12-30','2027-01-02');assert.equal(result.low,40,'cross-year seasonal matching');
 for(const dates of [['2027-02-29','2027-03-01'],['2027-03-01','2027-02-28'],['2027-01-01','2029-01-01']])assert.throws(()=>ctx.tripWeatherSummary(sample,...dates));
 assert.throws(()=>ctx.tripWeatherSummary({daily:{}},'2027-01-01','2027-01-02'),/Not enough/);
 assert.equal(await ctx.tripWeatherPlace(place.label,place),place);
 ctx.tripLookupPlaces=async()=>({places:[place,{...place,label:'Another city'}]});await assert.rejects(()=>ctx.tripWeatherPlace('Ambiguous',null),/Choose a city/);
 assert.equal((await ctx.tripWeatherPlace(place.label,null)).latitude,place.latitude,'exact saved label remains unambiguous');
 await ctx.tripLookupWeather(place,'2027-01-01','2027-01-02');assert.match(requested.url,/^\/api\/weather\?latitude=48.4&longitude=-123.3$/);assert.equal(requested.options.headers['X-ClosetLint-Token'],'synthetic-token');
 delete ctx.window.ClosetLintLocal;await ctx.tripLookupWeather(place,'2027-01-01','2027-01-02');assert.match(requested.url,/^https:\/\/archive-api.open-meteo.com/);assert.equal(requested.options.headers['X-ClosetLint-Token'],undefined,'no app token reaches provider');
 const trip=()=>({dest:place.label,place,start:'2027-01-01',end:'2027-01-02',low:20,high:30,rain:false,note:'Manual'});
 ctx.state.trip=trip();await ctx.tripClimate();assert.equal(ctx.state.trip.low,40);assert.equal(ctx.state.trip.busy,false);
 ctx.state.trip=trip();ctx.tripLookupWeather=async()=>{throw Error('Offline')};await ctx.tripClimate();assert.equal(ctx.state.trip.low,20);assert.match(ctx.state.trip.climateMsg,/enter the temperatures yourself/);
 let resolve;ctx.tripLookupWeather=()=>new Promise(r=>resolve=r);ctx.state.trip=trip();let pending=ctx.tripClimate();await new Promise(setImmediate);ctx.state.trip.dest='Changed';resolve(result);await pending;assert.equal(ctx.state.trip.low,20,'changed destination rejects stale reply');
 ctx.state.trip=trip();pending=ctx.tripClimate();await new Promise(setImmediate);ctx.state.trip.low=25;resolve(result);await pending;assert.equal(ctx.state.trip.low,25,'manual edit wins over late lookup');assert.match(ctx.state.trip.climateMsg,/Kept/);
 console.log('Trips weather: seasonal means, cross-year dates, ambiguous cities, token boundary, failures, and stale/manual-edit recovery pass.');
})().catch(e=>{console.error(e);process.exit(1)});
