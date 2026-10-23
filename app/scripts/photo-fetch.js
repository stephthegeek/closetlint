/* A deadline covers both response headers and the photo body, even if a fetch
   implementation does not reject promptly after abort. No storage writes here. */
var PHOTO_FETCH_TIMEOUT_MS=30000;
async function photoFetchBlob(url,options,limits){
  options=options||{};limits=limits||{};
  var controller=new AbortController(),external=limits.signal,timer,stop;
  var stopped=new Promise(function(resolve,reject){stop=reject});
  function abort(error){controller.abort();stop(error)}
  function cancelled(){var error=new Error('Photo download cancelled.');error.name='AbortError';abort(error)}
  if(external){if(external.aborted)cancelled();else external.addEventListener('abort',cancelled,{once:true})}
  timer=setTimeout(function(){var error=new Error('Photo download timed out. Please try again.');error.code='PHOTO_TIMEOUT';abort(error)},limits.timeoutMs||PHOTO_FETCH_TIMEOUT_MS);
  async function read(){
    if(controller.signal.aborted)throw new Error('Photo download cancelled.');
    var response=await fetch(url,Object.assign({},options,{signal:controller.signal}));
    if(!response.ok)throw new Error('Photo could not be downloaded.');
    var blob=await response.blob();
    if(limits.maxBytes&&blob.size>limits.maxBytes)throw new Error('Photo is too large.');
    return blob;
  }
  try{return await Promise.race([stopped,read()])}
  finally{clearTimeout(timer);if(external)external.removeEventListener('abort',cancelled)}
}
