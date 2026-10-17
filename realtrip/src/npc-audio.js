export function encodePcmWav(chunks,sampleRate){
 const length=chunks.reduce((n,c)=>n+c.length,0),input=new Float32Array(length);let offset=0;
 for(const c of chunks){input.set(c,offset);offset+=c.length;}
 const rate=16000,count=Math.floor(length*rate/sampleRate),buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
 const ascii=(at,s)=>[...s].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
 ascii(0,'RIFF');view.setUint32(4,36+count*2,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,count*2,true);
 for(let i=0;i<count;i++){
  const start=Math.floor(i*sampleRate/rate),end=Math.max(start+1,Math.floor((i+1)*sampleRate/rate));let value=0;
  for(let j=start;j<Math.min(end,length);j++)value+=input[j];value=Math.max(-1,Math.min(1,value/(end-start)));
  view.setInt16(44+i*2,value<0?value*32768:value*32767,true);
 }
 return new Blob([buffer],{type:'audio/wav'});
}

// Uses microphone capture, not SpeechRecognition. The PCM path works with
// WebViews that have microphone access but no browser-hosted ASR service.
export function createCloudRecognition({getEndpoint,workletUrl,onState,onTranscript,onComplete,onFallback,onLevel=()=>{},mediaDevices=navigator.mediaDevices,AudioContext=window.AudioContext||window.webkitAudioContext,WorkletNode=window.AudioWorkletNode,fetchImpl=fetch}){
 let active=null;
 function release(s){
  clearTimeout(s.timer);clearTimeout(s.previewTimer);s.previewController?.abort();s.stream?.getTracks().forEach(t=>t.stop());
  for(const node of [s.source,s.processor,s.gain])try{node?.disconnect();}catch{}
  if(s.context){s.context.close().catch(()=>{});s.context=null;}
  onLevel(0);
 }
 function cancel(){const s=active;active=null;if(s){s.controller.abort();release(s);}onState('idle');}
 function fail(s,message){if(s!==active)return;cancel();onFallback(message,'');}
 async function preview(s){
  if(s!==active||s.ending||s.previewBusy||!s.heard||s.samples/s.rate<s.nextPreview)return;
  // The HTTP ASR endpoint accepts complete WAVs. Send bounded, sequential
  // snapshots for a provisional caption; only end() can submit a conversation.
  s.previewBusy=true;s.nextPreview=s.samples/s.rate+3;
  const controller=new AbortController();s.previewController=controller;
  s.previewTimer=setTimeout(()=>controller.abort(),4500);
  try{
   const response=await fetchImpl(getEndpoint()+'/api/npc/transcribe',{method:'POST',headers:{'Content-Type':'audio/wav'},body:encodePcmWav(s.chunks,s.rate),signal:controller.signal});
   if(!response.ok)return;
   const data=await response.json();if(s!==active||s.ending||controller.signal.aborted)return;
   const text=typeof data.text==='string'?data.text.trim():'';
   if(text)onTranscript(text,{final:false});
  }catch{/* A missed preview must not interrupt recording or final recognition. */}
  finally{clearTimeout(s.previewTimer);s.previewBusy=false;if(s.previewController===controller)s.previewController=null;}
 }
 async function end(){
  const s=active;if(!s||s.ending)return;s.ending=true;
  if(!s.rate||s.samples/s.rate<.3||!s.heard){fail(s,'no-speech');return;}
  const blob=encodePcmWav(s.chunks,s.rate);release(s);onState('transcribing');
  s.timer=setTimeout(()=>fail(s,'timeout'),45000);
  try{
   const response=await fetchImpl(getEndpoint()+'/api/npc/transcribe',{method:'POST',headers:{'Content-Type':'audio/wav'},body:blob,signal:s.controller.signal});
   const data=await response.json();if(s!==active)return;
   if(!response.ok)throw Error(data.error||'语音识别失败，请重试。');
   const text=typeof data.text==='string'?data.text.trim():'';
   cancel();if(text){onTranscript(text,{final:true});onComplete(text);}else onFallback('no-speech','');
  }catch(error){if(s===active)fail(s,error.name==='AbortError'?'timeout':error instanceof TypeError?'语音服务连接失败，请检查网络后重试。':error.message||'network');}
 }
 async function start(){
  cancel();
  if(!getEndpoint()){onFallback('语音服务尚未连接，请完成服务地址配置。','');return;}
  if(!mediaDevices?.getUserMedia||!AudioContext){onFallback('当前应用未开放网页麦克风，请检查微信或飞书的麦克风权限与版本。','');return;}
  const s={controller:new AbortController(),chunks:[],samples:0,heard:false,voiceTime:0,silence:0,ending:false,nextPreview:1.4,previewBusy:false};active=s;onState('starting');
  s.timer=setTimeout(()=>fail(s,'麦克风没有启动，请允许微信或飞书访问麦克风后重试。'),15000);
  try{
   // Create/resume in the tap event, before awaiting the permission dialog.
   s.context=new AudioContext();const resume=s.context.resume().then(()=>true,()=>false);
   const stream=await mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(s!==active){stream.getTracks().forEach(t=>t.stop());return;}s.stream=stream;if(!await resume)throw Error('Audio context unavailable');
   if(s!==active)return;s.rate=s.context.sampleRate;
   const collect=samples=>{
    if(s!==active||s.ending)return;
    s.chunks.push(samples);s.samples+=samples.length;
    const energy=Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length),dt=samples.length/s.rate;
    onLevel(Math.min(1,energy*12));
    if(energy>.012){s.voiceTime+=dt;s.silence=0;if(s.voiceTime>.16)s.heard=true;}else s.silence+=dt;
    if(s.samples/s.rate>=30||(s.heard&&s.silence>1.35))end();
    else if(!s.heard&&s.samples/s.rate>10)fail(s,'no-speech');
    else void preview(s);
   };
   s.source=s.context.createMediaStreamSource(stream);s.gain=s.context.createGain();s.gain.gain.value=0;
   if(s.context.audioWorklet&&WorkletNode){
    try{await s.context.audioWorklet.addModule(workletUrl);if(s!==active)return;
     s.processor=new WorkletNode(s.context,'npc-pcm-capture');s.processor.port.onmessage=e=>collect(e.data);
    }catch{if(s!==active)return;}
   }
   if(!s.processor){
    s.processor=s.context.createScriptProcessor(2048,1,1);
    s.processor.onaudioprocess=e=>collect(new Float32Array(e.inputBuffer.getChannelData(0)));
   }
   s.source.connect(s.processor);s.processor.connect(s.gain);s.gain.connect(s.context.destination);
   stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(s===active&&!s.ending)fail(s,'麦克风已中断，请重新点击说话。');},{once:true}));
   clearTimeout(s.timer);s.timer=setTimeout(end,30000);onState('listening');
  }catch(error){
   if(s!==active)return;
   const message=error.name==='NotAllowedError'?'not-allowed':error.name==='NotFoundError'?'audio-capture':'无法启动录音，请检查当前应用的麦克风权限。';
   fail(s,message);
  }
 }
 return {start,end,cancel};
}
