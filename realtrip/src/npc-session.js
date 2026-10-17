// A reply belongs to one nearby interaction. Leaving, interrupting or hiding the
// page invalidates it even if the upstream request ignores its AbortSignal.
export function createNpcSession({request,onThinking,onReply,onError}){
  let generation=0,pending=null,history=[];
  function cancel(){generation++;pending?.abort();pending=null;onThinking(false);}
  async function submit(text){
    text=text.trim().slice(0,1200);if(!text)return;
    cancel();const id=generation,controller=new AbortController();pending=controller;onThinking(true);
    try{
      const reply=await request(history,text,controller.signal);
      if(id!==generation||controller.signal.aborted)return;
      history=[...history,{role:'user',content:text},{role:'assistant',content:reply}].slice(-10);
      pending=null;onThinking(false);onReply(reply);
    }catch(error){if(id===generation&&!controller.signal.aborted){pending=null;onThinking(false);onError(error,text);}}
  }
  return {submit,cancel,get pending(){return pending!==null;}};
}

export function speechChunks(text){
  const sentences=String(text).replace(/[*#`]/g,'').match(/[^。！？!?；;\n]+[。！？!?；;\n]?/g)||[];
  return sentences.flatMap(sentence=>{const out=[];while(sentence.length>70){let cut=sentence.lastIndexOf('，',65)+1;if(cut<20)cut=60;out.push(sentence.slice(0,cut));sentence=sentence.slice(cut);}if(sentence.trim())out.push(sentence.trim());return out;});
}

export function createNpcSpeech({synth,Utterance,onQueued=()=>{},onStart,onEnd,onCaption,onError}){
  let generation=0,timer;
  function stop(){generation++;clearTimeout(timer);synth?.cancel();onEnd();}
  function speak(text){
    stop();if(!synth||!Utterance){onError('当前浏览器不能朗读，可以阅读角色字幕。');return;}
    const id=generation,chunks=speechChunks(text);let index=0;onQueued();
    function next(){
      if(id!==generation)return;
      if(index>=chunks.length){onCaption(text);onEnd();return;}
      const part=chunks[index++],utterance=new Utterance(part);utterance.lang='zh-CN';utterance.rate=1.03;utterance.pitch=1.13;
      const voices=synth.getVoices();utterance.voice=voices.find(v=>v.lang==='zh-CN'&&/Ting|晓|Xiao|婷婷/.test(v.name))||voices.find(v=>v.lang==='zh-CN')||voices.find(v=>v.lang.startsWith('zh'))||null;
      const failure=()=>{if(id!==generation)return;stop();onCaption(text);onError('声音没有播放出来，点扬声器可以重播。');};
      // A blocked autoplay must not leave an endlessly animated talking face.
      timer=setTimeout(failure,12000);
      utterance.onstart=()=>{if(id===generation){clearTimeout(timer);timer=setTimeout(failure,45000);onStart();onCaption(part);}};
      utterance.onend=()=>{if(id===generation){clearTimeout(timer);next();}};
      utterance.onerror=failure;
      try{synth.speak(utterance);}catch{failure();}
    }
    next();
  }
  return {speak,stop};
}
