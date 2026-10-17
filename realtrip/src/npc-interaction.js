import {Vec3} from 'playcanvas';
import {npcConfig,isNearNpc} from './npc-scene.js';
import {createNpcCharacter} from './npc-character.js';
import {askNpc} from './npc-client.js';
import './npc.css';

const micIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
export async function initNpc({viewer,navigation,base,stop}){
  const character=await createNpcCharacter(viewer,npcConfig,base);
  const host=document.createElement('div');host.id='npc-ui';host.dataset.explorerUi='';
  host.innerHTML=`<div class="npc-experience"><span class="npc-dot"></span> NPC 独立体验</div>
    <button class="npc-world-label" aria-label="与舞台上的小蓝对话"><span>小蓝 <i>AI</i></span><small>走近打个招呼</small></button>
    <button class="npc-invite" aria-label="与小蓝对话"><span class="npc-orb">✦</span><span><strong>小蓝在舞台等你</strong><small>走近后可以语音聊天</small></span><kbd>E</kbd></button>
    <dialog class="npc-dialog" aria-labelledby="npc-title">
      <header class="npc-header"><span class="npc-orb">✦</span><div><h2 id="npc-title">小蓝 <span>AI 向导</span></h2><p class="npc-connection">正在连接 DeepSeek…</p></div><button class="npc-close" aria-label="结束对话">×</button></header>
      <div class="npc-messages" role="log" aria-live="polite" aria-label="与小蓝的聊天记录"></div>
      <div class="npc-suggestions"><button>介绍一下你自己</button><button>帮我想个 Hackathon 点子</button><button>这里还能去哪儿？</button></div>
      <div class="npc-status" role="status"></div>
      <form class="npc-form"><label class="npc-sr" for="npc-input">对小蓝说点什么</label><textarea id="npc-input" rows="1" maxlength="1200" placeholder="对小蓝说点什么…"></textarea><button class="npc-send" type="submit" aria-label="发送消息">↑</button></form>
      <div class="npc-voice"><button class="npc-mic">${micIcon}<span>点击说话</span></button><button class="npc-audio" aria-pressed="true">朗读：开</button></div>
      <p class="npc-note">DeepSeek 生成回答 · 语音由浏览器处理</p>
    </dialog>`;
  document.body.append(host);
  const $=s=>host.querySelector(s),dialog=$('.npc-dialog'),invite=$('.npc-invite'),label=$('.npc-world-label'),input=$('#npc-input'),send=$('.npc-send'),mic=$('.npc-mic'),status=$('.npc-status'),log=$('.npc-messages'),audioButton=$('.npc-audio');
  let config={},near=false,active=null,history=[],disposed=false,recognition=null,listening=false,audioEnabled=true,speechSerial=0;
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const synth=window.speechSynthesis;
  function message(role,text){const item=document.createElement('div');item.className=`npc-message ${role}`;const name=document.createElement('small');name.textContent=role==='user'?'你':'小蓝';const p=document.createElement('p');p.textContent=text;item.append(name,p);log.append(item);while(log.childElementCount>40)log.firstElementChild.remove();log.scrollTop=log.scrollHeight;}
  message('assistant','嗨，我是小蓝！从海报里溜出来，正在舞台上等你。想聊聊创意，还是一起探索会场？');
  function stopSpeech(){speechSerial++;synth?.cancel();character.setSpeaking(false);}
  function speak(text){
    stopSpeech();if(!audioEnabled||!synth||!dialog.open)return;
    const id=speechSerial,utterance=new SpeechSynthesisUtterance(text.replace(/[*#`]/g,''));utterance.lang='zh-CN';utterance.rate=1.06;
    const voices=synth.getVoices();utterance.voice=voices.find(v=>v.lang==='zh-CN')||voices.find(v=>v.lang.startsWith('zh'))||null;
    utterance.onstart=()=>{if(id===speechSerial)character.setSpeaking(true);};
    utterance.onend=()=>{if(id===speechSerial)character.setSpeaking(false);};
    utterance.onerror=()=>{if(id===speechSerial){character.setSpeaking(false);status.textContent='朗读未能播放，回答仍可阅读。';}};
    synth.speak(utterance);
  }
  function sync(){send.disabled=Boolean(active)||listening||!config.apiKey;mic.disabled=Boolean(active)||!SpeechRecognition||!config.apiKey;input.disabled=Boolean(active);$('.npc-suggestions').querySelectorAll('button').forEach(b=>b.disabled=Boolean(active)||listening||!config.apiKey);}
  function stopRecognition(){if(recognition){recognition.onend=null;recognition.abort();recognition=null;}listening=false;mic.classList.remove('listening');mic.querySelector('span').textContent=SpeechRecognition?'点击说话':'请用文字交流';sync();}
  function close(){active?.abort();active=null;stopRecognition();stopSpeech();character.setThinking(false);status.textContent='';navigation.setEnabled(!document.getElementById('about').open);stop();}
  function open(){
    if(!near||dialog.open)return;
    stop();if(document.pointerLockElement)document.exitPointerLock();navigation.setEnabled(false);dialog.showModal();character.wave();
    if(matchMedia('(pointer:fine)').matches)input.focus();
    else $('.npc-close').focus();
  }
  invite.onclick=label.onclick=open;$('.npc-close').onclick=()=>dialog.close();dialog.addEventListener('close',close);
  dialog.addEventListener('cancel',()=>{stopRecognition();stopSpeech();active?.abort();});
  async function submit(text){
    text=text.trim();if(!text||active||!config.apiKey)return;
    stopRecognition();stopSpeech();input.value='';message('user',text);status.textContent='小蓝正在想…';character.setThinking(true);
    const request=new AbortController();active=request;sync();
    try{
      const reply=await askNpc(config,history,text,{signal:request.signal});
      if(request.signal.aborted||disposed)return;
      history=[...history,{role:'user',content:text},{role:'assistant',content:reply}].slice(-10);
      message('assistant',reply);status.textContent='';speak(reply);
    }catch(error){if(!request.signal.aborted&&!disposed){status.textContent=error.message;input.value=text;}}
    finally{if(active===request){active=null;character.setThinking(false);sync();}}
  }
  $('.npc-form').onsubmit=e=>{e.preventDefault();submit(input.value);};
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit(input.value);}});
  $('.npc-suggestions').querySelectorAll('button').forEach(b=>b.onclick=()=>submit(b.textContent));
  audioButton.onclick=()=>{audioEnabled=!audioEnabled;audioButton.setAttribute('aria-pressed',String(audioEnabled));audioButton.textContent=`朗读：${audioEnabled?'开':'关'}`;if(!audioEnabled)stopSpeech();};
  if(!synth){audioEnabled=false;audioButton.disabled=true;audioButton.textContent='当前浏览器不支持朗读';}
  if(!SpeechRecognition){mic.disabled=true;mic.title='当前浏览器不支持语音识别，请打字交流';mic.querySelector('span').textContent='请用文字交流';}
  mic.onclick=()=>{
    if(listening){recognition?.stop();return;}
    if(!SpeechRecognition||active)return;
    stopSpeech();const rec=new SpeechRecognition();recognition=rec;rec.lang='zh-CN';rec.interimResults=true;rec.continuous=false;
    let transcript='',failed=false;listening=true;status.textContent='正在听… 说完后会自动发送';mic.classList.add('listening');mic.querySelector('span').textContent='结束录音';sync();
    rec.onresult=event=>{if(rec!==recognition)return;let interim='';for(let i=0;i<event.results.length;i++)interim+=event.results[i][0].transcript;input.value=interim;transcript=Array.from(event.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join('');};
    rec.onerror=event=>{if(rec!==recognition)return;failed=true;const errors={'not-allowed':'没有获得麦克风权限，可以打字交流。','audio-capture':'未找到可用麦克风，可以打字交流。','no-speech':'没有听清，再试一次吧。','network':'浏览器语音服务暂不可用，请打字交流。','service-not-allowed':'浏览器未开放语音识别，请打字交流。'};status.textContent=errors[event.error]||'语音识别中断，请重试或打字交流。';};
    rec.onend=()=>{if(rec!==recognition)return;recognition=null;listening=false;mic.classList.remove('listening');mic.querySelector('span').textContent='点击说话';sync();if(!failed&&transcript&&dialog.open)submit(transcript);else if(!failed)status.textContent='没有听清，再试一次吧。';};
    try{rec.start();}catch{stopRecognition();status.textContent='无法开始录音，请打字交流。';}
  };
  const onKey=e=>{if(e.code==='KeyE'&&!e.repeat&&!e.target.closest?.('input,textarea,dialog,button,select')){e.preventDefault();open();}};
  window.addEventListener('keydown',onKey);
  const visibility=()=>{if(document.hidden){stopRecognition();stopSpeech();active?.abort();}};
  document.addEventListener('visibilitychange',visibility);
  const projected=new Vec3();
  function update(){
    const camera=viewer.app.root.findComponents('camera')[0],p=camera.entity.getPosition();
    near=isNearNpc([p.x,p.y,p.z],near);character.setNear(near);
    invite.disabled=label.disabled=!near;invite.querySelector('strong').textContent=near?'和小蓝聊一聊':'小蓝在舞台等你';invite.querySelector('small').textContent=near?'点击或按 E · 支持语音对话':'走近舞台上的蓝白小伙伴';label.querySelector('small').textContent=near?'点击聊天':'走近打个招呼';
    const rect=document.getElementById('world').getBoundingClientRect();
    camera.worldToScreen(character.anchor,projected);const direction=character.anchor.clone().sub(p);
    label.hidden=dialog.open||direction.dot(camera.entity.forward)<0||projected.x<30||projected.x>rect.width-30||projected.y<80||projected.y>rect.height-60;
    label.style.transform=`translate(${projected.x}px,${Math.max(160,projected.y)}px) translate(-50%,-100%)`;invite.hidden=dialog.open;
    host.dataset.near=String(near);
  }
  viewer.app.on('update',update);
  try{const response=await fetch(base+npcConfig.configUrl,{cache:'no-store'});if(!response.ok)throw Error();config=await response.json();$('.npc-connection').textContent=config.apiKey?'DeepSeek · 可以开始聊天':'DeepSeek 尚未配置';}
  catch{$('.npc-connection').textContent='对话配置加载失败';status.textContent='请刷新页面重试。';}
  sync();
  const destroy=()=>{disposed=true;active?.abort();stopRecognition();stopSpeech();viewer.app.off('update',update);window.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',visibility);character.destroy();host.remove();};
  window.addEventListener('pagehide',event=>{if(event.persisted){if(dialog.open)dialog.close();visibility();}else destroy();});
  return {destroy};
}
