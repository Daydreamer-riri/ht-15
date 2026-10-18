// Companion adapter: interactions measure the player body, not its follow camera.
import {Vec3} from 'playcanvas';
import {npcConfig,isNearNpc} from '../npc-scene.js';
import {createNpcCharacter} from './npc-character.js';
import {askNpc} from '../npc-client.js';
import {createNpcSession,createNpcSpeech} from '../npc-session.js';
import {createNpcRecognition,embeddedBrowser,recognitionHint} from '../npc-recognition.js';
import {createNpcGreeting} from '../npc-greeting.js';
import {createNpcReactions} from '../npc-reactions.js';
import {createCloudRecognition} from '../npc-audio.js';
import {createCloudSpeech} from '../npc-cloud-speech.js';
import '../npc.css';

const icons={
 mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
 keyboard:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M5 9h2m2 0h2m2 0h2m2 0h2M5 12h2m2 0h2m2 0h2m2 0h2M7 16h10"/>',
 audio:'<path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
 fold:'<path d="m6 9 6 6 6-6"/>',
 send:'<path d="M12 20V4m-6 6 6-6 6 6"/>',
};
const svg=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

export async function initNpc({viewer,navigation,base,stop,space}){
 const character=await createNpcCharacter(viewer,npcConfig,base,space,()=>navigation.getPose().position);
 const host=document.createElement('div');host.id='npc-ui';host.dataset.explorerUi='';
 host.innerHTML=`<div class="npc-experience"><span></span> NPC 独立体验</div>
  <button class="npc-world-label" aria-label="让小蓝挥手打招呼"><span>小蓝 <i>AI</i></span><small>点我打招呼</small></button>
  <div class="npc-bottom">
   <div class="npc-transcript" role="status" aria-live="polite" hidden><span>正在听</span><p></p></div>
   <div class="npc-caption" role="status" aria-live="polite" hidden><span class="npc-caption-name">小蓝</span><p></p></div>
   <div class="npc-status" role="status" aria-live="polite">正在准备小蓝…</div>
   <div class="npc-voice-help" role="status" hidden></div>
   <form class="npc-form" hidden><button class="npc-fold" type="button" aria-label="收起输入框">${svg('fold')}</button><label class="npc-sr" for="npc-input">对小蓝说点什么</label><input id="npc-input" maxlength="1200" autocomplete="off" enterkeyhint="send" placeholder="对小蓝说点什么…"><button class="npc-send" type="submit" aria-label="发送给小蓝">${svg('send')}</button></form>
   <div class="npc-controls" aria-label="与小蓝交流">
    <button class="npc-mic" aria-label="点击和小蓝说话" title="语音 · E">${svg('mic')}<span>说话</span></button>
    <button class="npc-keyboard" aria-label="打开键盘输入" aria-expanded="false" title="打字 · T">${svg('keyboard')}<span>打字</span></button>
    <div class="npc-extra"><button class="npc-audio" aria-label="重播小蓝的回答" title="没听到？点此重播" disabled>${svg('audio')}<span>重播</span></button>
    <button class="npc-stop" aria-label="打断小蓝" title="停止回答" hidden>${svg('stop')}</button></div>
   </div>
  </div>`;
 document.body.append(host);
 const $=s=>host.querySelector(s),label=$('.npc-world-label'),mic=$('.npc-mic'),keyboard=$('.npc-keyboard'),form=$('.npc-form'),input=$('#npc-input'),status=$('.npc-status'),caption=$('.npc-caption'),speaker=$('.npc-audio'),stopButton=$('.npc-stop');
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition,synth=window.speechSynthesis,container=embeddedBrowser(navigator.userAgent);
 const greeting=createNpcGreeting(),reactions=createNpcReactions();
 let recognitionPhase='idle',audioUnlocked=false,pendingGreeting=false,voiceGateway='';
 let config={},near=false,keyboardOpen=false,listening=false,thinking=false,speaking=false,playbackPending=false,disposed=false,lastReply='',note='',configError='',captionTimer,noteTimer;
 function setCaption(text){clearTimeout(captionTimer);caption.querySelector('p').textContent=text;caption.hidden=!text;}
 function setTranscript(text,confirmed=false){const element=$('.npc-transcript'),content=element.querySelector('p');element.querySelector('span').textContent=confirmed?'你说':'正在听';content.textContent=text;element.hidden=!text;content.scrollTop=confirmed?0:content.scrollHeight;}
 function scheduleCaptionDismiss(){clearTimeout(captionTimer);captionTimer=setTimeout(()=>{setCaption('');setTranscript('');},8000);}
 function showNote(text){note=text;sync();}
 function pauseMovement(){navigation.setEnabled(!keyboardOpen&&!listening&&!document.getElementById('about')?.open);stop();}
 function releasePointer(){stop();if(document.pointerLockElement)document.exitPointerLock();}
 function blurControls(){if(host.contains(document.activeElement))document.activeElement.blur();}
 function sync(){
  const available=near&&Boolean(config.apiKey);
  mic.disabled=!available;keyboard.disabled=!available;label.disabled=!near||listening||thinking||speaking;
  $('.npc-send').disabled=!available||!input.value.trim();input.disabled=!available;
  mic.classList.toggle('listening',listening);mic.querySelector('span').textContent=recognitionPhase==='starting'?'取消':['ending','transcribing'].includes(recognitionPhase)?'识别中':listening?'说完了':speaking?'接着说':'说话';mic.setAttribute('aria-label',recognitionPhase==='starting'?'取消启动语音':recognitionPhase==='transcribing'?'取消语音识别':listening?'结束录音':'点击和小蓝说话');
  keyboard.setAttribute('aria-expanded',String(keyboardOpen));keyboard.classList.toggle('active',keyboardOpen);form.hidden=!keyboardOpen;
  stopButton.hidden=!(listening||thinking||speaking||playbackPending);speaker.hidden=!stopButton.hidden||!lastReply;speaker.disabled=!near;
  host.dataset.keyboard=String(keyboardOpen);host.dataset.near=String(near);
  character.setEngaged(keyboardOpen||listening||thinking||speaking||playbackPending);
  character.setState(recognitionPhase==='listening'?'listening':thinking?'thinking':speaking?'speaking':'idle');
  status.textContent=configError||(!near?'走近舞台上的小蓝':note||(recognitionPhase==='starting'?'正在启动麦克风…':recognitionPhase==='transcribing'?'正在识别你说的话…':recognitionPhase==='ending'?'正在确认识别结果…':listening?'我在听 · 说完自动发送':thinking?'小蓝正在想…':playbackPending?'文字已回复 · 正在准备语音…':speaking?'小蓝正在说话':!config.apiKey?'正在连接 DeepSeek…':keyboardOpen?'输入后发送，小蓝会直接回答':voiceGateway||container?'点麦克风或键盘，与小蓝聊聊':SpeechRecognition?'点麦克风说话，或用键盘输入':'可用手机键盘的语音输入'));
  label.querySelector('small').textContent=listening?'我在听':thinking?'让我想想':playbackPending?'准备语音':speaking?'正在说话':near?'点我打招呼':'走近聊聊';
  host.dataset.phase=listening?recognitionPhase:thinking?'thinking':playbackPending?'preparing':speaking?'speaking':'idle';
 }
 const speechEvents={
  onQueued(){playbackPending=true;speaking=false;sync();},
  onStart(){playbackPending=false;speaking=true;sync();},
  onEnd(){playbackPending=false;speaking=false;sync();},
  onCaption:setCaption,onComplete:scheduleCaptionDismiss,onError:showNote};
 const speech=createNpcSpeech({...speechEvents,synth,Utterance:window.SpeechSynthesisUtterance});
 const cloudSpeech=createCloudSpeech({...speechEvents,getEndpoint:()=>voiceGateway});
 function unlockAudio(){audioUnlocked=true;if(voiceGateway)cloudSpeech.unlock();}
 function playReply(text){speech.stop();cloudSpeech.stop();if(voiceGateway)cloudSpeech.speak(text);else speech.speak(text);}
 const session=createNpcSession({request:(history,text,signal)=>askNpc(config,history,text,{signal}),
  onThinking(value){thinking=value;sync();},
  onReply(reply){if(disposed||!near)return;lastReply=reply;setCaption(reply);note='';playReply(reply);},
  onError(error,text){input.value=text;showNote(error.message);}});
 const recognitionEvents={
  onState(value){recognitionPhase=value;listening=value!=='idle';pauseMovement();sync();},
  onTranscript(text,{final=false}={}){setTranscript(text,final);input.value=text;sync();},
  onComplete(text){submit(text,{voice:true});},
  onFallback(error,draft){
   if(disposed||!near)return;if(draft)input.value=draft;note='';setTranscript('');
   if(!voiceGateway){setKeyboard(true);$('.npc-voice-help').textContent=recognitionHint(error,container);}
   else{$('.npc-voice-help').textContent=({'not-allowed':'请在系统设置中允许微信或飞书访问麦克风，然后重新点击说话。','audio-capture':'没有找到可用麦克风，请检查手机的麦克风权限。','no-speech':'没听清，再点一次麦克风告诉我吧。',timeout:'语音识别超时了，请重新说一次。'})[error]||error;}
   $('.npc-voice-help').hidden=false;
  },
 };
 const browserRecognition=createNpcRecognition({...recognitionEvents,Recognition:SpeechRecognition});
 const cloudRecognition=createCloudRecognition({...recognitionEvents,getEndpoint:()=>voiceGateway,workletUrl:base+'npc/pcm-capture-worklet.js',onLevel:level=>mic.style.setProperty('--voice-level',String(level))});
 function stopRecognition(){browserRecognition.cancel();cloudRecognition.cancel();}
 function interrupt({clear=false}={}){const unfinished=listening;pendingGreeting=false;clearTimeout(noteTimer);clearTimeout(captionTimer);session.cancel();stopRecognition();speech.stop();cloudSpeech.stop();if(clear)setCaption('');if(clear||unfinished)setTranscript('');note='';sync();}
 function setKeyboard(open){
  if(open&&!near)return;
  if(open)setTranscript('');
  keyboardOpen=open;if(!open)$('.npc-voice-help').hidden=true;releasePointer();pauseMovement();sync();updateViewport();
  if(open){stopRecognition();input.focus();}else{blurControls();if(!caption.hidden&&!speaking&&!thinking)scheduleCaptionDismiss();}
 }
 function submit(text,{voice=false}={}){
  text=text.trim();if(!text||!near||!config.apiKey)return;unlockAudio();
  greeting.dismiss();interrupt();setKeyboard(false);input.value='';setCaption('');setTranscript(voice?text:'',true);
  synth?.resume();session.submit(text);
 }
 function listen(){
  if(!near||!config.apiKey)return;
  greeting.dismiss();
  if(['starting','transcribing'].includes(recognitionPhase)){stopRecognition();setTranscript('');return;}
  if(listening){(voiceGateway?cloudRecognition:browserRecognition).end();return;}
  interrupt({clear:true});setKeyboard(false);releasePointer();synth?.resume();
  (voiceGateway?cloudRecognition:browserRecognition).start();
 }
 function greet(manual=false){
  if(manual){greeting.dismiss();interrupt({clear:true});}
  character.wave();note='';lastReply=reactions.greeting();setCaption(lastReply);
  pendingGreeting=!audioUnlocked&&!manual;
  if(!pendingGreeting)playReply(lastReply);else scheduleCaptionDismiss();
  sync();
 }
 mic.onclick=()=>{unlockAudio();listen();if(!keyboardOpen)blurControls();};
 label.onclick=()=>{unlockAudio();greet(true);blurControls();};
 input.addEventListener('input',sync);
 const onGesture=event=>{
  if(!event.isTrusted)return;unlockAudio();
  if(pendingGreeting&&near&&!caption.hidden&&!event.target.closest?.('button,input,dialog,[data-explorer-ui]')){pendingGreeting=false;playReply(lastReply);}
 };
 window.addEventListener('pointerdown',onGesture);
 keyboard.onclick=()=>{greeting.dismiss();if(!keyboardOpen)interrupt({clear:true});setKeyboard(!keyboardOpen);};
 $('.npc-fold').onclick=()=>setKeyboard(false);
 form.onsubmit=event=>{event.preventDefault();if(!event.isComposing)submit(input.value);};
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.isComposing)event.preventDefault();});
 speaker.onclick=()=>{if(near&&lastReply){unlockAudio();interrupt();playReply(lastReply);blurControls();}};
 stopButton.onclick=()=>{interrupt();scheduleCaptionDismiss();blurControls();};
 if(!SpeechRecognition)mic.title='使用手机键盘的语音输入';
 function leave(){interrupt({clear:true});setKeyboard(false);}
 const viewport=window.visualViewport;
 function updateViewport(){const inset=keyboardOpen&&viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0;host.style.setProperty('--npc-keyboard-inset',`${inset}px`);host.dataset.softKeyboard=String(inset>80);}
 viewport?.addEventListener('resize',updateViewport);viewport?.addEventListener('scroll',updateViewport);
 const onKey=event=>{
  if(event.key==='Escape'){leave();return;}
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target.closest?.('input,textarea,dialog,button,select'))return;
  if(event.code==='KeyE'){event.preventDefault();unlockAudio();listen();}
  if(event.code==='KeyT'){event.preventDefault();interrupt();setKeyboard(!keyboardOpen);}
 };
 window.addEventListener('keydown',onKey);
 const visibility=()=>{if(document.hidden)leave();};document.addEventListener('visibilitychange',visibility);
 const menuOpen=()=>leave();document.addEventListener('explorer-menu-open',menuOpen);
 const projected=new Vec3(),direction=new Vec3();
 function update(){
  const camera=viewer.app.root.findComponents('camera')[0],player=navigation.getPose().position,p={x:player[0],y:player[1],z:player[2]},wasNear=near;
  near=isNearNpc([p.x,p.y,p.z],near,{...npcConfig,position:character.position});character.setNear(near);
  if(wasNear&&!near)leave();if(wasNear!==near)sync();
  if(greeting.update(near,keyboardOpen||listening||thinking||speaking||playbackPending||document.hidden||Boolean(document.getElementById('about')?.open),performance.now()/1000))greet();
  const cp=character.position;reactions.update(performance.now()/1000,Math.hypot(cp[0]-p.x,cp[2]-p.z));host.dataset.npcPosition=cp.map(v=>v.toFixed(3)).join(',');host.dataset.moving=String(character.moving);
  const rect=document.getElementById('world').getBoundingClientRect();camera.worldToScreen(character.anchor,projected);direction.copy(character.anchor).sub(camera.entity.getPosition());
  label.hidden=direction.dot(camera.entity.forward)<0||projected.x<30||projected.x>rect.width-30||projected.y<80||projected.y>rect.height-60;
  label.style.transform=`translate(${projected.x}px,${Math.max(155,projected.y)}px) translate(-50%,-100%)`;host.dataset.near=String(near);
 }
 const obstacle=space?.obstacles[0];
 if(obstacle)obstacle.onContact=()=>{
  const busy=keyboardOpen||listening||thinking||speaking||playbackPending||document.hidden||Boolean(document.getElementById('about')?.open);
  const text=reactions.contact(performance.now()/1000,busy);
  if(!text)return;character.react();greeting.dismiss();note='';lastReply=text;setCaption(text);
  if(audioUnlocked)playReply(text);else scheduleCaptionDismiss();sync();
 };
 viewer.app.on('update',update);
 try{const response=await fetch(base+npcConfig.configUrl,{cache:'no-store'});if(!response.ok)throw Error();config=await response.json();if(!config.apiKey)configError='DeepSeek 还未配置。';}
 catch{configError='对话配置加载失败，请刷新重试。';}
 try{const voice=await (await fetch(base+'npc/voice.json',{cache:'no-store'})).json();if(voice.gatewayUrl){const url=new URL(voice.gatewayUrl);if(url.protocol==='https:'||(['127.0.0.1','localhost'].includes(location.hostname)&&url.protocol==='http:'))voiceGateway=url.href.replace(/\/$/,'');}}catch{}
 if(voiceGateway)mic.title='点击录音，再点结束 · E';
 sync();
 function destroy(){disposed=true;if(obstacle)obstacle.onContact=null;leave();viewport?.removeEventListener('resize',updateViewport);viewport?.removeEventListener('scroll',updateViewport);viewer.app.off('update',update);window.removeEventListener('keydown',onKey);window.removeEventListener('pointerdown',onGesture);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('explorer-menu-open',menuOpen);cloudSpeech.destroy();character.destroy();host.remove();}
 window.addEventListener('pagehide',event=>event.persisted?leave():destroy());
 return {destroy};
}
