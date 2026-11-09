/* Seasonal guidance uses recorded clothing and selected seasons, never a location. */
var ClosetLintLabSeasons=(function(){
  function selected(L){return Object.keys(L&&L.seasons||{}).filter(function(s){return L.seasons[s]})}
  function only(L,s){var ss=selected(L);return ss.length===1&&ss[0]===s}
  function text(p){return ((p.name||'')+' '+(p.title||'')+' '+(p.kind||'')).toLowerCase()}
  function knit(p){return ['Sweaters','Sweatshirts','Cardigans'].indexOf(p.sub)>=0||/\b(sweater|cardigan|pullover|hoodie|sweatshirt)\b/.test(text(p))}
  function longSleeves(p){
    if(!p)return false;
    if(p.sleeve)return ['long','long sleeve','long sleeves','full length'].indexOf(p.sleeve)>=0;
    var n=text(p);if(/\b(sleeveless|short.sleeve|cap.sleeve|vest|bralette|cami|camisole|bandeau)\b/.test(n)||p.sub==='Tanks'||p.sub==='Bralettes'||p.kind==='vest')return false;
    return /\b(long.sleeve|full.sleeve)\b/.test(n)||knit(p);
  }
  function parts(o){return [o.top,o.one,o.under,o.layer].filter(Boolean)}
  function clothingOK(p,L,weight){return !only(L,'summer')||!((knit(p)&&weight!=='thin'&&weight!=='sheer')||/\b(thermal|fleece.lined|insulated|sherpa|heavyweight)\b/.test(text(p)))}
  function coreOK(o,L){return !only(L,'winter')||parts(o).some(longSleeves)}
  function light(p){var c=p.colors||[],n=text(p);return c.some(function(x){return ['white','cream','beige','pastel pink','light pink','yellow'].indexOf(x)>=0})||/\b(pastel|ivory|light blue|pale|cream)\b/.test(n)}
  function dark(p){var c=p.colors||[];return c.some(function(x){return ['black','gray','brown','burgundy'].indexOf(x)>=0})||/\b(navy|charcoal|dark)\b/.test(text(p))}
  function palette(p,s){return s==='fall'?(dark(p)?.02:light(p)?-.01:0):s==='spring'?(light(p)?.02:dark(p)?-.01:0):0}
  function clothingBias(p,L,weight){
    var ss=selected(L);if(!ss.length)return 0;
    return ss.reduce(function(v,s){var shape=0;
      if(s==='winter')shape=(knit(p)?weight==='thick'?.24:weight==='regular'?.18:.04:0)+(longSleeves(p)?.08:0);
      if(s==='fall'||s==='spring')shape=knit(p)?weight==='thin'?.06:weight==='thick'?-.06:0:0;
      if(s==='summer')shape=knit(p)?weight==='thin'||weight==='sheer'?-.03:-.25:longSleeves(p)?-.03:.05;
      return v+shape+palette(p,s);
    },0)/ss.length;
  }
  function openToe(p){return (p.shoefeat||[]).indexOf('open toe')>=0||/\b(open[ -]?toe|peep[ -]?toe|flip[ -]?flop|slides?|sandals?)\b/.test(text(p))||p.sub==='Sandals'}
  function openBack(p){return /\b(mules?|slides?|clogs?|slingbacks?|backless)\b/.test(text(p))||(p.shoefeat||[]).indexOf('slingback')>=0}
  function shoeOK(p,L){return !only(L,'winter')||!(openToe(p)||openBack(p)||p.sub==='Slippers')}
  function shoeBias(p,L){
    var ss=selected(L);if(!ss.length)return 0;
    return ss.reduce(function(v,s){var physical=0;
      if(s==='winter')physical=p.sub==='Boots'?.14:.04;
      if(s==='fall'||s==='spring'){
        if(openToe(p))physical-=p.sub==='Sandals'?.12:.04;
        if(p.sub==='Sandals'){
          if(/\b(strappy|barely.there|thin.straps?|tiny.straps?|flip.flop|slides?)\b/.test(text(p)))physical-=.09;
          if((p.shoefeat||[]).indexOf('platform')<0)physical-=.04;
          if(light(p))physical-=.03;
        }
      }
      return v+physical+palette(p,s);
    },0)/ss.length;
  }
  function needsCoverage(o,L){
    var ss=selected(L);if(!ss.length||ss.indexOf('summer')>=0)return false;
    var p=o.bottom||o.one;if(!p)return false;
    var skirt=p.sub==='Skirts'||p.sub==='Skorts'||p.sub==='Dresses',shorts=p.sub==='Shorts'||p.sub==='Jumpsuits & rompers'&&['short','mini','short shorts','mid thigh','bermuda'].indexOf(p.length)>=0;
    if(!skirt&&!shorts)return false;
    if(['maxi','full length','ankle'].indexOf(p.length)>=0)return false;
    return shorts||only(L,'winter')||['mini','short','short shorts','mid thigh'].indexOf(p.length)>=0;
  }
  function coverage(p){return !!p&&((p.meta==='Legwear'&&['Tights','Stockings'].indexOf(p.sub)>=0)||(p.meta==='Bottoms'&&p.sub==='Leggings')||(p.meta==='Legwear'&&p.sub==='Socks'&&['knee high','thigh high'].indexOf(p.sockType)>=0))}
  function extraKind(p){
    var n=text(p),ss=p.seasons||[];
    if(ss.length&&ss.indexOf('winter')<0)return '';
    if(p.meta==='Outerwear'&&p.sub==='Coats')return 'coat';
    if(p.meta==='Other accessories'&&p.sub==='Scarves')return 'scarf';
    if(p.meta==='Other accessories'&&(p.sub==='Gloves'||/\b(mittens?|mitts)\b/.test(n)))return 'gloves';
    if(p.meta==='Hats'&&p.sub!=='Sun hats'&&(p.sub==='Beanies'||ss.indexOf('winter')>=0||/\b(wool|knit|fleece|thermal|winter|beanie)\b/.test(n)))return 'hat';
    return '';
  }
  return {selected:selected,only:only,longSleeves:longSleeves,clothingOK:clothingOK,coreOK:coreOK,clothingBias:clothingBias,shoeOK:shoeOK,shoeBias:shoeBias,needsCoverage:needsCoverage,coverage:coverage,extraKind:extraKind};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ClosetLintLabSeasons;
