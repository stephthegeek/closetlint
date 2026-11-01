/* A backdrop click follows the dialog's Cancel path, including save guards. */
function requestClosetDialogClose(d){
  var cancel=new Event('cancel',{cancelable:true});
  if(!d.dispatchEvent(cancel)||!d.open)return;
  if(d.id==='dlg'&&typeof closeDlg==='function')closeDlg();
  else if(window.ClosetLintRoutes&&window.ClosetLintRoutes.closeTrackedDialog)window.ClosetLintRoutes.closeTrackedDialog(d);
  else d.close();
}
function guardClosetDialog(d,read,busy,message){
  var baseline=read();
  function clean(){baseline=read();if(window.ClosetLintRoutes&&window.ClosetLintRoutes.trackDialog)window.ClosetLintRoutes.trackDialog(d,read,busy)}
  function close(){
    if(busy&&busy()){toast('Wait for this save to finish before closing.');return false}
    if(read()!==baseline&&!window.confirm(message||'Discard the unsaved changes to this form?'))return false;
    if(window.ClosetLintRoutes&&window.ClosetLintRoutes.cleanDialog)window.ClosetLintRoutes.cleanDialog(d);
    d.close();return true;
  }
  var cancel=function(e){e.preventDefault();close()};d.oncancel=cancel;
  d.addEventListener('close',function(){if(d.oncancel===cancel){d.oncancel=null;if(window.ClosetLintRoutes&&window.ClosetLintRoutes.cleanDialog)window.ClosetLintRoutes.cleanDialog(d)}},{once:true});
  clean();return {close:close,clean:clean};
}
(function(){
  var press=null;
  function outside(d,e){var r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom}
  document.addEventListener('pointerdown',function(e){var target=e.target,d=target&&(target.tagName==='DIALOG'?target:target.closest&&target.closest('dialog'));press=d&&d.open?{dialog:d,outside:outside(d,e)}:null},true);
  document.addEventListener('click',function(e){
    var d=e.target;if(!d||d.tagName!=='DIALOG'||!d.open||!outside(d,e))return;
    if(press&&(press.dialog!==d||!press.outside)){press=null;return}press=null;
    e.preventDefault();e.stopPropagation();
    // Dispatch synchronously so each dialog can cancel closing or show its own
    // unsaved-work prompt before the default close happens.
    requestClosetDialogClose(d);
  },true);
})();
