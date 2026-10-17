import {speechChunks} from './npc-session.js';
export function createCloudSpeech({getEndpoint,onQueued,onStart,onEnd,onCaption,onComplete,onError,AudioContext=window.AudioContext||window.webkitAudioContext,fetchImpl=fetch}){
 let context=null,generation=0,controller=null,source=null,timer;
 function unlock(){
  if(!AudioContext)return;
  context??=new AudioContext();context.resume().catch(()=>{});
  // Prime playback in the user's tap, before network responses arrive.
  const silent=context.createBufferSource();silent.buffer=context.createBuffer(1,1,context.sampleRate);silent.connect(context.destination);silent.start();
 }
 function stop(){generation++;clearTimeout(timer);controller?.abort();controller=null;if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();source=null;}onEnd();}
 async function speak(text){
  stop();const id=generation;controller=new AbortController();const signal=controller.signal;
  if(!context){onCaption(text);onError('点扬声器，即可听小蓝开口。');return;}
  onQueued();
  const fail=()=>{if(id!==generation)return;stop();onCaption(text);onError('声音暂时没有播出来，点扬声器重试。');};
  try{
   for(const chunk of speechChunks(text)){
    timer=setTimeout(fail,45000);
    const response=await fetchImpl(getEndpoint()+'/api/npc/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:chunk}),signal});
    if(!response.ok)throw Error('Speech service failed');
    const buffer=await context.decodeAudioData(await response.arrayBuffer());if(id!==generation)return;
    await context.resume();if(id!==generation)return;
    clearTimeout(timer);timer=setTimeout(fail,Math.max(15000,(buffer.duration+5)*1000));
    await new Promise(resolve=>{
     const playing=context.createBufferSource();source=playing;playing.buffer=buffer;playing.connect(context.destination);
     const done=()=>{signal.removeEventListener('abort',done);playing.disconnect();if(source===playing)source=null;resolve();};
     playing.onended=done;signal.addEventListener('abort',done,{once:true});playing.start();onStart();onCaption(chunk);
    });
    if(id!==generation)return;clearTimeout(timer);
   }
   controller=null;onEnd();onComplete(text);
  }catch{fail();}
 }
 function destroy(){stop();context?.close().catch(()=>{});context=null;}
 return {unlock,speak,stop,destroy};
}
