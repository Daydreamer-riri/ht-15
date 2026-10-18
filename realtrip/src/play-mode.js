import {setIconButton} from './explorer-ui.js';
// Fullscreen/orientation APIs vary by mobile browser. The walking view remains
// usable when either request is unavailable or rejected.
export function createPlayMode({button, onStop, onJump, jumpButton=null, doc=document, win=window}) {
 const root=doc.documentElement,body=doc.body;
 const mobile=()=>win.matchMedia('(any-pointer: coarse)').matches||Math.min(win.innerWidth,win.innerHeight)<=600;
 const hint=doc.createElement('section');
 hint.id='rotate-hint';hint.hidden=true;hint.setAttribute('aria-label','横屏游玩提示');
 hint.innerHTML='<span class="rotate-phone" aria-hidden="true">▯ ↻</span><strong>横过手机</strong><button type="button">继续竖屏</button>';
 body.append(hint);
 const jump=jumpButton??doc.createElement('button');jump.id='jump';jump.type='button';jump.disabled=true;jump.hidden=true;
 setIconButton(jump,'jump','跳跃','跳跃');
 doc.querySelector('.walk-actions').append(jump);
 let active=false,nativeStarted=false,busy=false,revision=0;
 const unlock=()=>{try{win.screen.orientation?.unlock?.();}catch{}};
 function sync(){
  body.classList.toggle('immersive',active);
  const landscape=win.innerWidth>win.innerHeight;
  setIconButton(button,active?'collapse':mobile()&&!landscape?'rotate':'expand',`当前${landscape?'横屏':'竖屏'}，${active?'退出全屏':mobile()?'横屏游玩':'进入全屏'}`,active?'退出':mobile()&&!landscape?'横屏':'全屏');
  button.setAttribute('aria-pressed',String(active));
  hint.hidden=!(active&&mobile()&&win.innerHeight>win.innerWidth);
 }
 function leave(){revision++;active=false;nativeStarted=false;unlock();onStop();sync();}
 async function exit(){
  leave();
  if(doc.fullscreenElement){try{await doc.exitFullscreen();}catch{active=true;nativeStarted=true;sync();}}
 }
 async function toggle(){
  if(busy)return;
  if(active){await exit();return;}
  busy=true;active=true;onStop();sync();const request=++revision;
  try{
   if(!doc.fullscreenElement&&root.requestFullscreen){
    try{await root.requestFullscreen({navigationUI:'hide'});nativeStarted=Boolean(doc.fullscreenElement);}catch{}
   }
   if(request!==revision||!active)return;
   if(mobile()&&win.screen.orientation?.lock){
    try{await win.screen.orientation.lock('landscape');}catch{}
    if(request!==revision||!active)unlock();
   }
  }finally{busy=false;sync();}
 }
 function fullscreenChange(){
  if(doc.fullscreenElement===root){nativeStarted=true;active=true;sync();}
  else if(nativeStarted)leave();
 }
 function resize(){onStop();sync();}
 function keydown(e){if(e.key==='Escape'&&active&&!doc.fullscreenElement)leave();}
 button.addEventListener('click',toggle);
 hint.querySelector('button').addEventListener('click',exit);
 jump.addEventListener('pointerdown',e=>e.stopPropagation());
 jump.addEventListener('click',()=>{if(!jump.disabled)onJump();});
 doc.addEventListener('fullscreenchange',fullscreenChange);
 win.addEventListener('resize',resize);win.addEventListener('keydown',keydown);
 sync();
 return {setJumpEnabled(enabled){jump.hidden=!enabled;jump.disabled=!enabled;}};
}
