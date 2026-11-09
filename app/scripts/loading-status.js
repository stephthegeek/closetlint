/* One visual for existing work messages. Text and control behavior stay owned by each task. */
var ClosetLintLoading=(function(){
  var selector='[role="status"],[aria-live="polite"],[aria-live="assertive"],button[disabled],[data-loading],#empty-message,#notice',pending=new Set(),scheduled=false;
  function mode(node){
    var explicit=node.getAttribute('data-loading');
    if(explicit!==null)return explicit==='active'||explicit==='queued'?explicit:'';
    if(node.hidden||node.getAttribute('role')==='alert'||node.closest('.photo-work'))return '';
    if(node.tagName==='BUTTON'&&!node.disabled)return '';
    if(node.querySelector('[role="status"],[aria-live],.setup-confirmed,.photo-spinner'))return '';
    var text=(node.textContent||'').trim();
    // Only ongoing messages, never instructions ("Preparing saves a snapshot…") or failures.
    if(!/(?:…|\.{3})$/.test(text)||/\b(?:stopped|failed|error|timed out|could not|cannot|unavailable)\b/i.test(text))return '';
    if(/^Waiting (?:for|to)\b/i.test(text))return 'queued';
    return /^(?:Loading|Deleting|Saving|Autosaving|Preparing|Checking|Uploading|Downloading|Restoring|Refreshing|Connecting|Generating|Searching|Finding|Fetching|Exporting|Reading|Applying|Processing|Removing|Creating|Finishing|Working|Rendering|Updating|Importing|Resolving|Keeping)\b/i.test(text)?'active':'';
  }
  function refresh(node){
    if(!node||node.nodeType!==1)return;
    var value=node.matches(selector)?mode(node):'';
    node.classList.toggle('loading-linty',!!value);
    node.classList.toggle('loading-linty-queued',value==='queued');
  }
  function scan(root){
    if(!root||root.nodeType!==1)return;
    refresh(root);root.querySelectorAll(selector+',.loading-linty').forEach(refresh);
  }
  function queue(root){
    if(root&&root.nodeType!==1)root=root.parentElement;
    if(!root)return;pending.add(root);
    if(scheduled)return;scheduled=true;
    queueMicrotask(function(){scheduled=false;var roots=Array.from(pending);pending.clear();roots.forEach(function(n){if(n.isConnected){scan(n);var parent=n.parentElement&&n.parentElement.closest(selector);if(parent)refresh(parent)}})});
  }
  function set(node,value){if(node){node.setAttribute('data-loading',value||'');refresh(node)}}
  function init(){
    // Reuse the exact header artwork and its crop, including in the portable file.
    var art=document.querySelector('.brand-mark'),source=document.querySelector('.linty-peek img');
    if(art&&source){
      var svg=art.cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.removeAttribute('class');
      svg.querySelectorAll('[id]').forEach(function(n){n.removeAttribute('id')});
      svg.querySelector('image').setAttribute('href',source.getAttribute('src'));
      document.documentElement.style.setProperty('--loading-linty','url("data:image/svg+xml,'+encodeURIComponent(new XMLSerializer().serializeToString(svg))+'")');
    }
    scan(document.body);
    new MutationObserver(function(records){records.forEach(function(r){queue(r.target)})}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','hidden','data-loading','aria-live','role']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  return {set:set};
})();
