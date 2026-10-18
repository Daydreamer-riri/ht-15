import {approachCandidates} from './commands.js';
import {photoView,createSouvenirPoster} from './photo-composition.js';

export function createCompanionActions({viewer,navigation,character,surface,companion,say,onChange=()=>{}}){
 let state='idle',generation=0,timer=null,url=null,captured=null,disposed=false;
 const hud=document.createElement('section');hud.className='photo-hud';hud.dataset.explorerUi='';hud.hidden=true;
 hud.innerHTML='<p role="status"></p><strong aria-live="polite"></strong><button type="button">取消合照</button>';document.body.append(hud);
 const dialog=document.createElement('dialog');dialog.className='photo-result';dialog.setAttribute('aria-label','我和小蓝的纪念合照');dialog.dataset.explorerUi='';
 dialog.innerHTML='<div class="photo-result-title"><div><small>MEMORY SAVED</small><h2>这一刻，值得留念。</h2></div><button class="photo-close" aria-label="关闭纪念合照">×</button></div><img alt="你和小蓝的 Hackathon 纪念合照，含拍摄日期与时间"><p class="photo-save-note" role="status">长按图片可保存；也可以下载或分享。</p><div class="photo-result-actions"><button class="photo-save">保存图片</button><button class="photo-share" hidden>分享图片</button><button class="photo-retake">再拍一张</button></div><button class="photo-return">回到漫游</button>';document.body.append(dialog);
 const status=hud.querySelector('p'),count=hud.querySelector('strong'),image=dialog.querySelector('img'),note=dialog.querySelector('.photo-save-note');
 function transition(next){state=next;companion.action=next;companion.photoActive=['approaching-photo','countdown','capturing','result'].includes(next);document.body.dataset.companionAction=next;onChange();}
 function clearPhoto(){navigation.setPhotoView(null);navigation.setInteractionLocked(false);companion.player?.setPhotoPose(null);character.setPhotoPose(null);hud.hidden=true;}
 function cancel(){generation++;clearTimeout(timer);timer=null;character.cancelMove();clearPhoto();transition('idle');if(dialog.open)dialog.close();if(url)URL.revokeObjectURL(url);url=null;captured=null;image.removeAttribute('src');}
 function fail(message){cancel();say(message);}
 function composition(aspect){return photoView(navigation.getPose().position,character.position,{eyeHeight:surface.eyeHeight,aspect,cast:surface.cameraCast});}
 async function capture(run){
  if(run!==generation||disposed)return;
  transition('capturing');status.textContent='正在制作你的纪念合照…';count.textContent='';
  try{
   // Use the poster's portrait aspect for the exported frame. On-screen framing
   // is checked separately, so both phone and desktop can see both people.
   const framing=composition(992/1102);if(!framing)throw Error('这里镜头有点挤，换个开阔的位置再合照吧。');
   navigation.setPhotoView(framing);character.setPhotoPose(framing.yaw);companion.player?.setPhotoPose(framing.yaw);
   const capturedAt=new Date(),frame=await viewer.captureFrame({width:992,height:1102,supersample:1});
   if(run!==generation||disposed)return;
   const poster=await createSouvenirPoster(frame,capturedAt);if(run!==generation||disposed)return;
   captured=poster;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(poster.blob);image.src=url;
   note.textContent=`拍摄于 ${poster.stamp.date} ${poster.stamp.time}（北京时间）· 长按图片可保存`;
   const file=new File([poster.blob],poster.filename,{type:'image/png'});dialog.querySelector('.photo-share').hidden=!navigator.canShare?.({files:[file]});
   transition('result');hud.hidden=true;dialog.showModal();
  }catch(error){if(run===generation&&!disposed)fail(error.message||'这张照片没生成成功，再试一次吧。');}
 }
 function countdown(run){
  if(run!==generation)return;
  const frame=composition(document.getElementById('world').clientWidth/document.getElementById('world').clientHeight);
  if(!frame){fail('这里镜头有点挤，换个开阔的位置再合照吧。');return;}
  navigation.setPhotoView(frame);character.setPhotoPose(frame.yaw);companion.player?.setPhotoPose(frame.yaw);
  transition('countdown');hud.hidden=false;status.textContent='看镜头，留下这一刻';let left=3;count.textContent=String(left);
  const step=()=>{if(run!==generation)return;if(--left>0){count.textContent=String(left);timer=setTimeout(step,1000);}else capture(run);};timer=setTimeout(step,1000);
 }
 function perform(action){
  if(disposed)return;
  cancel();const run=generation;
  if(action==='cancel'){say('好，先停在这里，想继续时再叫我。');return;}
  if(action==='wave'){companion.player?.wave();character.wave();say('嘿！我在这儿，见到你真开心。');return;}
  const photo=action==='photo';
  if(surface.physics?.getState().grounded===false){say('先站稳，我们再互动吧。');return;}
  if(photo&&!companion.player){say('你的形象还在准备，等一下再合照吧。');return;}
  const player=navigation.getPose(),candidates=approachCandidates(player.position,character.position,player.yaw,{photo});
  if(photo){navigation.stop();navigation.setInteractionLocked(true);if(document.pointerLockElement)document.exitPointerLock();hud.hidden=false;status.textContent='小蓝正在找你身边的位置…';count.textContent='';}
  transition(photo?'approaching-photo':'approaching');
  const started=character.moveTo(candidates,success=>{
   if(run!==generation||disposed)return;
   if(!success){fail('前面被挡住了，我们到开阔一点的地方再试试吧。');return;}
   if(photo)countdown(run);else{transition('idle');character.wave();say('来啦！我就在你身边，聊聊，还是一起拍张照？');}
  });
  if(!started){fail('这里暂时没有能走到你身边的路，往舞台前的空地走一点，再叫我吧。');return;}
  say(photo?'好呀！我来你旁边，看镜头，一起留个纪念。':'听到啦！我这就过来。');
 }
 hud.querySelector('button').onclick=()=>{cancel();say('好，合照先取消，随时再叫我。');};
 dialog.querySelector('.photo-close').onclick=()=>dialog.close();dialog.querySelector('.photo-return').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{if(state==='result')cancel();});
 dialog.querySelector('.photo-retake').onclick=()=>{transition('countdown');dialog.close();countdown(generation);};
 dialog.querySelector('.photo-save').onclick=()=>{
  if(!url||!captured)return;const link=document.createElement('a');link.href=url;link.download=captured.filename;link.click();note.textContent='已发起保存。如果微信或飞书没有下载提示，请长按上方图片保存到相册。';
 };
 dialog.querySelector('.photo-share').onclick=async()=>{
  if(!captured)return;try{await navigator.share({files:[new File([captured.blob],captured.filename,{type:'image/png'})],title:'我和小蓝的 Hackathon 合照'});}catch(error){if(error.name!=='AbortError')note.textContent='当前应用暂不支持分享，请长按图片保存后发朋友圈。';}
 };
 return {perform,cancel,get active(){return state!=='idle';},get state(){return state;},destroy(){disposed=true;cancel();hud.remove();dialog.remove();}};
}
