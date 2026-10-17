import {Vec3} from 'playcanvas';
import {npcConfig,isNearNpc} from './npc-scene.js';
import {createNpcCharacter} from './npc-character.js';
import {askNpc} from './npc-client.js';
import {createNpcSession,createNpcSpeech} from './npc-session.js';
import './npc.css';

const icons={
 mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
 keyboard:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M5 9h2m2 0h2m2 0h2m2 0h2M5 12h2m2 0h2m2 0h2m2 0h2M7 16h10"/>',
 audio:'<path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
 send:'<path d="M12 20V4m-6 6 6-6 6 6"/>',
};
const svg=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

export async function initNpc({viewer,navigation,base,stop}){
 const character=await createNpcCharacter(viewer,npcConfig,base);
 const host=document.createElement('div');host.id='npc-ui';host.dataset.explorerUi='';
 host.innerHTML=`<div class="npc-experience"><span></span> NPC 独立体验</div>
  <button class="npc-world-label" aria-label="让小蓝挥手打招呼"><span>小蓝 <i>AI</i></span><small>点我打招呼</small></button>
  <div class="npc-bottom">
   <div class="npc-caption" role="status" aria-live="polite" hidden><span class="npc-caption-name">小蓝</span><p></p></div>
   <div class="npc-status" role="status" aria-live="polite">正在准备小蓝…</div>
   <form class="npc-form" hidden><label class="npc-sr" for="npc-input">对小蓝说点什么</label><input id="npc-input" maxlength="1200" autocomplete="off" placeholder="对小蓝说点什么…"><button class="npc-send" type="submit" aria-label="发送给小蓝">${svg('send')}</button><button class="npc-fold" type="button" aria-label="收起输入框">×</button></form>
   <div class="npc-controls" aria-label="与小蓝交流">
    <button class="npc-mic" aria-label="点击和小蓝说话" title="语音 · E">${svg('mic')}<span>说话</span></button>
    <button class="npc-keyboard" aria-label="打开键盘输入" aria-expanded="false" title="打字 · T">${svg('keyboard')}<span>打字</span></button>
    <div class="npc-extra"><button class="npc-audio" aria-label="重播小蓝的回答" title="重播回答" disabled>${svg('audio')}</button>
    <button class="npc-stop" aria-label="打断小蓝" title="停止回答" hidden>${svg('stop')}</button></div>
   </div>
  </div>`;
 document.body.append(host);
 const $=s=>host.querySelector(s),label=$('.npc-world-label'),mic=$('.npc-mic'),keyboard=$('.npc-keyboard'),form=$('.npc-form'),input=$('#npc-input'),status=$('.npc-status'),caption=$('.npc-caption'),speaker=$('.npc-audio'),stopButton=$('.npc-stop');
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition,synth=window.speechSynthesis;
 let config={},near=false,keyboardOpen=false,listening=false,thinking=false,speaking=false,playbackPending=false,disposed=false,recognition=null,lastReply='',note='',configError='',captionTimer,noteTimer;
 function setCaption(text){clearTimeout(captionTimer);caption.querySelector('p').textContent=text;caption.hidden=!text;}
 function scheduleCaptionDismiss(){clearTimeout(captionTimer);captionTimer=setTimeout(()=>setCaption(''),8000);}
 function showNote(text){note=text;sync();}
 function pauseMovement(){navigation.setEnabled(!keyboardOpen&&!listening&&!document.getElementById('about')?.open);stop();}
 function releasePointer(){stop();if(document.pointerLockElement)document.exitPointerLock();}
 function blurControls(){if(host.contains(document.activeElement))document.activeElement.blur();}
 function sync(){
  const available=near&&Boolean(config.apiKey);
  mic.disabled=!available||!SpeechRecognition;keyboard.disabled=!available;label.disabled=!near||listening||thinking||speaking;
  $('.npc-send').disabled=!available;input.disabled=!available;
  mic.classList.toggle('listening',listening);mic.querySelector('span').textContent=listening?'说完了':speaking?'接着说':'说话';mic.setAttribute('aria-label',listening?'结束录音':'点击和小蓝说话');
  keyboard.setAttribute('aria-expanded',String(keyboardOpen));keyboard.classList.toggle('active',keyboardOpen);form.hidden=!keyboardOpen;
  stopButton.hidden=!(listening||thinking||speaking||playbackPending);speaker.hidden=!stopButton.hidden||!lastReply;speaker.disabled=!near;
  host.dataset.keyboard=String(keyboardOpen);host.dataset.near=String(near);
  character.setState(listening?'listening':thinking?'thinking':speaking?'speaking':'idle');
  status.textContent=configError||(!near?'走近舞台上的小蓝':note||(listening?'我在听 · 说完自动发送，也可点「说完了」':thinking?'小蓝正在想…':speaking||playbackPending?'小蓝正在回答':!config.apiKey?'正在连接 DeepSeek…':SpeechRecognition?'点小蓝打招呼，点麦克风聊聊':'点小蓝打招呼，点键盘聊聊'));
  label.querySelector('small').textContent=listening?'我在听':thinking?'让我想想':speaking?'正在回答':near?'点我打招呼':'走近聊聊';
  host.dataset.phase=listening?'listening':thinking?'thinking':speaking||playbackPending?'speaking':'idle';
 }
 const speech=createNpcSpeech({synth,Utterance:window.SpeechSynthesisUtterance,
  onQueued(){playbackPending=true;sync();},
  onStart(){playbackPending=false;speaking=true;sync();},
  onEnd(){playbackPending=false;speaking=false;sync();},
  onCaption:setCaption,onComplete:scheduleCaptionDismiss,onError:showNote});
 function playReply(text){speech.speak(text);}
 const session=createNpcSession({request:(history,text,signal)=>askNpc(config,history,text,{signal}),
  onThinking(value){thinking=value;sync();},
  onReply(reply){if(disposed||!near)return;lastReply=reply;setCaption(reply);note='';playReply(reply);},
  onError(error,text){input.value=text;showNote(error.message);}});
 function stopRecognition(){const rec=recognition;recognition=null;if(rec){rec.onend=null;rec.abort();}listening=false;pauseMovement();sync();}
 function interrupt({clear=false}={}){clearTimeout(noteTimer);clearTimeout(captionTimer);session.cancel();stopRecognition();speech.stop();if(clear)setCaption('');note='';sync();}
 function setKeyboard(open){
  if(open&&!near)return;
  keyboardOpen=open;releasePointer();pauseMovement();sync();updateViewport();
  if(open){stopRecognition();input.focus();}else{blurControls();if(!caption.hidden&&!speaking&&!thinking)scheduleCaptionDismiss();}
 }
 function submit(text){
  text=text.trim();if(!text||!near||!config.apiKey)return;
  interrupt();setKeyboard(false);input.value='';setCaption('');
  synth?.resume();session.submit(text);
 }
 function listen(){
  if(!near||!config.apiKey)return;
  if(listening){recognition?.stop();return;}
  if(!SpeechRecognition){setKeyboard(true);showNote('当前浏览器不支持语音识别，可以打字交流。');return;}
  interrupt();setKeyboard(false);releasePointer();setCaption('');synth?.resume();
  const rec=new SpeechRecognition();recognition=rec;rec.lang='zh-CN';rec.interimResults=true;rec.continuous=false;
  let transcript='',failed=false;listening=true;pauseMovement();sync();
  rec.onresult=event=>{
   if(rec!==recognition)return;
   let interim='';for(let i=0;i<event.results.length;i++)interim+=event.results[i][0].transcript;
   note=interim?`听到：${interim.slice(-46)}`:'';input.value=interim;
   transcript=Array.from(event.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join('');sync();
  };
  rec.onerror=event=>{
   if(rec!==recognition)return;failed=true;
   const errors={'not-allowed':'没有麦克风权限，点键盘也能聊天。','audio-capture':'没有找到麦克风，点键盘试试。','no-speech':'没有听清，再说一次吧。','network':'语音服务暂时连不上，可以打字交流。','service-not-allowed':'浏览器未开放语音识别，可以打字交流。'};
   showNote(errors[event.error]||'录音中断了，请再试一次。');
  };
  rec.onend=()=>{
   if(rec!==recognition)return;recognition=null;listening=false;pauseMovement();sync();
   if(!failed&&transcript&&near)submit(transcript);else if(!failed)showNote('没有听清，再说一次吧。');
  };
  try{rec.start();}catch{stopRecognition();showNote('无法开始录音，可以打字交流。');}
 }
 mic.onclick=()=>{listen();blurControls();};
 label.onclick=()=>{character.wave();showNote('嗨！想聊什么，点下面的麦克风或键盘');clearTimeout(noteTimer);noteTimer=setTimeout(()=>{note='';sync();},4000);blurControls();};
 keyboard.onclick=()=>{if(!keyboardOpen)interrupt();setKeyboard(!keyboardOpen);};
 $('.npc-fold').onclick=()=>setKeyboard(false);
 form.onsubmit=event=>{event.preventDefault();if(!event.isComposing)submit(input.value);};
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.isComposing)event.preventDefault();});
 speaker.onclick=()=>{if(near&&lastReply){interrupt();playReply(lastReply);blurControls();}};
 stopButton.onclick=()=>{interrupt();scheduleCaptionDismiss();blurControls();};
 if(!SpeechRecognition)mic.title='当前浏览器不支持语音识别，请使用键盘';
 function leave(){interrupt({clear:true});setKeyboard(false);}
 const viewport=window.visualViewport;
 function updateViewport(){const inset=keyboardOpen&&viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0;host.style.setProperty('--npc-keyboard-inset',`${inset}px`);host.dataset.softKeyboard=String(inset>80);}
 viewport?.addEventListener('resize',updateViewport);viewport?.addEventListener('scroll',updateViewport);
 const onKey=event=>{
  if(event.key==='Escape'){leave();return;}
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target.closest?.('input,textarea,dialog,button,select'))return;
  if(event.code==='KeyE'){event.preventDefault();listen();}
  if(event.code==='KeyT'){event.preventDefault();interrupt();setKeyboard(!keyboardOpen);}
 };
 window.addEventListener('keydown',onKey);
 const visibility=()=>{if(document.hidden)leave();};document.addEventListener('visibilitychange',visibility);
 const menuOpen=()=>leave();document.addEventListener('explorer-menu-open',menuOpen);
 const projected=new Vec3(),direction=new Vec3();
 function update(){
  const camera=viewer.app.root.findComponents('camera')[0],p=camera.entity.getPosition(),wasNear=near;
  near=isNearNpc([p.x,p.y,p.z],near);character.setNear(near);
  if(wasNear&&!near)leave();if(wasNear!==near)sync();
  const rect=document.getElementById('world').getBoundingClientRect();camera.worldToScreen(character.anchor,projected);direction.copy(character.anchor).sub(p);
  label.hidden=direction.dot(camera.entity.forward)<0||projected.x<30||projected.x>rect.width-30||projected.y<80||projected.y>rect.height-60;
  label.style.transform=`translate(${projected.x}px,${Math.max(155,projected.y)}px) translate(-50%,-100%)`;host.dataset.near=String(near);
 }
 viewer.app.on('update',update);
 try{const response=await fetch(base+npcConfig.configUrl,{cache:'no-store'});if(!response.ok)throw Error();config=await response.json();if(!config.apiKey)configError='DeepSeek 还未配置。';}
 catch{configError='对话配置加载失败，请刷新重试。';}
 sync();
 function destroy(){disposed=true;leave();viewport?.removeEventListener('resize',updateViewport);viewport?.removeEventListener('scroll',updateViewport);viewer.app.off('update',update);window.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('explorer-menu-open',menuOpen);character.destroy();host.remove();}
 window.addEventListener('pagehide',event=>event.persisted?leave():destroy());
 return {destroy};
}
