import {speechChunks} from './npc-session.js';
import {encodePcmWav} from './npc-audio.js';

// Keep one media element across replies. Mobile WebViews grant playback access
// per element; a cached replay must call play() directly inside the user's tap.
export function createCloudSpeech({getEndpoint,onQueued,onStart,onEnd,onCaption,onComplete,onError,Audio=globalThis.Audio,URLApi=globalThis.URL,fetchImpl=fetch}){
 let audio=null,primeUrl='',generation=0,controller=null,timer,answer='';
 const cache=new Map();
 function unlock(){
  if(audio||!Audio)return;
  audio=new Audio();audio.preload='auto';audio.playsInline=true;
  primeUrl=URLApi.createObjectURL(encodePcmWav([new Float32Array(160)],16000));audio.src=primeUrl;
  try{audio.play()?.catch(()=>{});}catch{}
 }
 function stop(){generation++;clearTimeout(timer);controller?.abort();controller=null;audio?.pause();onEnd();}
 function clearCache(){for(const file of cache.values())URLApi.revokeObjectURL(file.url);cache.clear();}
 function play(file,chunk,signal){
  return new Promise((resolve,reject)=>{
   let finished=false,announced=false,lastTime=0,lastAdvance=Date.now(),watchdog;
   function finish(error){
    if(finished)return;finished=true;clearInterval(watchdog);signal.removeEventListener('abort',cancel);
    audio.onplaying=audio.onwaiting=audio.onended=audio.onerror=audio.onpause=null;
    if(error){audio.pause();reject(error);}else resolve();
   }
   const cancel=()=>finish(new DOMException('Cancelled','AbortError'));
   function progress(){
    if(audio.currentTime>lastTime+.005){
     lastTime=audio.currentTime;lastAdvance=Date.now();
     if(!announced){announced=true;onStart();onCaption(chunk);}
    }else if(Date.now()-lastAdvance>(announced?3000:6000))finish(Error('声音没有正常播放，点右侧“重播”再听一次。'));
   }
   audio.onplaying=progress;
   audio.onwaiting=()=>{announced=false;onQueued();};
   audio.onended=()=>{progress();finish();};
   audio.onerror=()=>finish(Error('音频加载失败，点右侧“重播”重试。'));
   signal.addEventListener('abort',cancel,{once:true});
   if(signal.aborted){cancel();return;}
   audio.src=file.url;try{audio.currentTime=0;}catch{}audio.muted=false;audio.volume=1;
   watchdog=setInterval(progress,200);
   try{audio.play()?.catch(error=>finish(Error(error.name==='NotAllowedError'?'声音已准备好，点右侧“重播”即可播放。':'声音没有播出来，点右侧“重播”重试。')));}catch{finish(Error('当前应用未能播放声音，点右侧“重播”重试。'));}
  });
 }
 async function speak(text){
  stop();const id=generation;controller=new AbortController();const signal=controller.signal;
  if(!audio){onCaption(text);onError('点右侧“重播”，即可听小蓝开口。');controller=null;return;}
  if(answer!==text){clearCache();answer=text;}
  try{
   for(const chunk of speechChunks(text)){
    onQueued();let file=cache.get(chunk);
    if(!file){
     timer=setTimeout(()=>controller?.abort(),30000);
     const response=await fetchImpl(getEndpoint()+'/api/npc/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:chunk}),signal});
     if(!response.ok)throw Error(response.status===429?'语音服务正忙，文字已保留，点“重播”再试。':'语音生成失败，文字已保留，点“重播”再试。');
     const blob=await response.blob();if(id!==generation)return;if(signal.aborted)throw new DOMException('Timed out','AbortError');
     if(!blob.size)throw Error('没有收到语音，点右侧“重播”重试。');
     file={url:URLApi.createObjectURL(blob)};cache.set(chunk,file);clearTimeout(timer);
    }
    // No await before play() on cache hits: a retry keeps the tap's activation.
    await play(file,chunk,signal);if(id!==generation)return;
   }
   controller=null;onEnd();onComplete(text);
  }catch(error){
   if(id!==generation)return;
   stop();onCaption(text);onError(error.name==='AbortError'?'语音准备超时，文字已保留，点“重播”再试。':error.message);
  }
 }
 function destroy(){stop();clearCache();if(primeUrl)URLApi.revokeObjectURL(primeUrl);if(audio)audio.src='';audio=null;}
 return {unlock,speak,stop,destroy};
}
