export function validateRecording(bytes){
 if(bytes.length<44||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Object.assign(Error('请上传 WAV 录音。'),{status:400});
 // The browser encoder emits a fixed 16-bit mono PCM header. Reject arbitrary
 // containers/durations before forwarding a visitor-controlled request.
 if(bytes.toString('ascii',12,16)!=='fmt '||bytes.readUInt32LE(16)!==16||bytes.readUInt16LE(20)!==1||bytes.readUInt16LE(22)!==1||bytes.readUInt32LE(24)!==16000||bytes.readUInt32LE(28)!==32000||bytes.readUInt16LE(32)!==2||bytes.readUInt32LE(4)!==bytes.length-8||bytes.readUInt16LE(34)!==16||bytes.toString('ascii',36,40)!=='data'||bytes.readUInt32LE(40)!==bytes.length-44)throw Object.assign(Error('录音格式不正确，请重新录音。'),{status:400});
 const duration=(bytes.length-44)/32000;
 if(duration<.25||duration>31)throw Object.assign(Error('录音需要在 0.25 到 30 秒之间。'),{status:400});
 return duration;
}

// Shared by a normal Node HTTP server and Alibaba FC's HTTP event adapter.
export function createVoiceHandler({provider,origins=['https://pages.release.ctripcorp.com','http://127.0.0.1:8848','http://localhost:8848'],limit=60,maxConcurrent=4}={}){
 const rates=new Map();let active=0;
 return async function handle({method,path,headers={},ip='unknown',body=Buffer.alloc(0),signal}){
  headers=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v]));
  const origin=headers.origin,out={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const json=(statusCode,data)=>({statusCode,headers:{...out,'Content-Type':'application/json; charset=utf-8'},body:Buffer.from(JSON.stringify(data))});
  if(origin&&!origins.includes(origin))return json(403,{error:'来源未被语音服务允许。'});
  if(origin){out['Access-Control-Allow-Origin']=origin;out.Vary='Origin';}
  out['Access-Control-Allow-Headers']='Content-Type';out['Access-Control-Allow-Methods']='GET, POST, OPTIONS';
  if(method==='OPTIONS')return {statusCode:204,headers:out,body:Buffer.alloc(0)};
  if(path==='/health'&&method==='GET')return json(200,{ready:provider.ready,asr:'qwen3-asr-flash',tts:'qwen3-tts-flash'});
  if(method!=='POST'||!['/api/npc/transcribe','/api/npc/speak'].includes(path))return json(404,{error:'接口不存在。'});
  if(!provider.ready)return json(503,{error:'语音服务还未配置。'});
  const maximum=path.endsWith('transcribe')?1024*1024:8192;
  if(body.length>maximum)return json(413,{error:'录音或文字太长，请缩短后重试。'});
  const now=Date.now();
  for(const [key,value] of rates)if(value.until<now)rates.delete(key);
  const rate=rates.get(ip)||{count:0,until:now+60000};rates.set(ip,rate);
  if(rate.count++>=limit||active>=maxConcurrent){out['Retry-After']='10';return json(429,{error:'语音请求较多，请稍等再试。'});}
  active++;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000),cancel=()=>controller.abort();
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
  try{
   if(controller.signal.aborted)throw Error('Cancelled');
   if(path.endsWith('transcribe')){
    validateRecording(body);const text=await provider.transcribe(body,controller.signal);return json(200,{text});
   }
   let data;try{data=JSON.parse(body);}catch{throw Object.assign(Error('请求格式不正确。'),{status:400});}
   const text=typeof data?.text==='string'?data.text.trim():'';
   if(!text||text.length>600)throw Object.assign(Error('语音文本需要在 1 到 600 字之间。'),{status:400});
   const audio=await provider.synthesize(text,controller.signal);
   return {statusCode:200,headers:{...out,'Content-Type':audio.type},body:audio.bytes};
  }catch(error){return json(controller.signal.aborted?504:(error.status||500),{error:controller.signal.aborted?'语音处理超时，请再试一次。':error.status?error.message:'语音处理失败，请稍后重试。'});}
  finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);active--;}
 };
}
