const CHINA_BASE='https://dashscope.aliyuncs.com';
export function createVoiceProvider({apiKey,workspaceId='',asrModel='qwen3-asr-flash',ttsModel='qwen3-tts-flash',voice='Ethan',fetchImpl=fetch}){
 const base=workspaceId?`https://${workspaceId}.cn-beijing.maas.aliyuncs.com`:CHINA_BASE;
 async function request(path,body,signal){
  if(!apiKey)throw Object.assign(Error('语音服务还未配置。'),{status:503});
  const response=await fetchImpl(base+path,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal});
  if(!response.ok){
   const messages={401:'语音服务凭据无效，请更新服务端配置。',403:'语音服务未开通或模型没有访问权限。',429:'语音服务繁忙，请稍后重试。',402:'语音服务余额不足。'};
   throw Object.assign(Error(messages[response.status]||'语音服务暂时不可用，请稍后重试。'),{status:response.status===429?429:502});
  }
  return response.json();
 }
 return {
  ready:Boolean(apiKey),
  async transcribe(bytes,signal){
   const data=await request('/compatible-mode/v1/chat/completions',{model:asrModel,messages:[{role:'user',content:[{type:'input_audio',input_audio:{data:`data:audio/wav;base64,${bytes.toString('base64')}`}}]}],stream:false,asr_options:{language:'zh',enable_itn:true}},signal);
   const text=data.choices?.[0]?.message?.content;
   if(typeof text!=='string')throw Object.assign(Error('没有收到有效识别结果，请再说一次。'),{status:502});
   return text.trim().slice(0,1200);
  },
  async synthesize(text,signal){
   const data=await request('/api/v1/services/aigc/multimodal-generation/generation',{model:ttsModel,input:{text,voice,language_type:'Chinese'}},signal);
   const address=data.output?.audio?.url;
   if(!address)throw Object.assign(Error('小蓝的声音暂时没有生成，请重试。'),{status:502});
   const url=new URL(address);
   if(url.protocol==='http:'&&url.hostname.endsWith('.aliyuncs.com'))url.protocol='https:';
   if(url.protocol!=='https:'||!url.hostname.endsWith('.aliyuncs.com'))throw Object.assign(Error('语音服务返回了无效音频地址。'),{status:502});
   const response=await fetchImpl(url,{signal,redirect:'error'});
   if(!response.ok)throw Object.assign(Error('语音文件加载失败，请重试。'),{status:502});
   const chunks=[];let total=0;
   for await(const chunk of response.body){total+=chunk.length;if(total>12*1024*1024)throw Object.assign(Error('语音文件过大。'),{status:502});chunks.push(chunk);}
   return {bytes:Buffer.concat(chunks),type:response.headers.get('content-type')||'audio/wav'};
  },
 };
}
