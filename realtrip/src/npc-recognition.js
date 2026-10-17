export function embeddedBrowser(ua=''){
 if(/wxwork/i.test(ua))return '企业微信';
 if(/MicroMessenger/i.test(ua))return '微信';
 if(/Lark|Feishu/i.test(ua))return '飞书';
 return '';
}

export function recognitionHint(error,container=''){
 if(container)return `${container}内语音识别受限，可用手机键盘的语音输入，或在系统浏览器打开。`;
 const messages={
  unsupported:'当前浏览器不支持语音识别，可用手机键盘的语音输入。',
  'not-allowed':'麦克风未获授权，请检查浏览器权限，也可用键盘输入。',
  'audio-capture':'无法使用麦克风，请检查权限或用键盘输入。',
  'no-speech':'没有听清，请重试，或点输入框继续。',
  network:'语音识别服务连接失败，可用键盘语音输入或打字。',
  'service-not-allowed':'浏览器未开放语音识别，可用键盘语音输入或换系统浏览器。',
  timeout:'语音识别没有响应，可用键盘语音输入或打字。',
  incomplete:'已保留听到的内容，请确认后发送。',
 };
 return messages[error]||'语音识别中断，请重试，或用键盘输入。';
}

// Some mobile WebViews expose SpeechRecognition but never start it, or report
// an error without an end event. Every path settles and invalidates stale events.
export function createNpcRecognition({Recognition,onState,onTranscript,onComplete,onFallback}){
 let active=null;
 function cancel(){
  const current=active;active=null;
  if(current){if(current.timer!==null)clearTimeout(current.timer);current.rec.onstart=current.rec.onend=current.rec.onerror=current.rec.onresult=null;try{current.rec.abort();}catch{}}
  onState('idle');
 }
 function start(){
  cancel();
  if(!Recognition){onFallback('unsupported','');return;}
  let rec;try{rec=new Recognition();}catch{onFallback('unsupported','');return;}
  const current={rec,final:'',draft:'',timer:null};active=current;
  rec.lang='zh-CN';rec.interimResults=true;rec.continuous=false;
  const fallback=error=>{if(active!==current)return;const draft=current.draft;cancel();onFallback(error,draft);};
  const finish=()=>{
   if(active!==current)return;
   const {final,draft}=current;cancel();
   if(final&&final===draft)onComplete(final);
   else onFallback(draft?'incomplete':'no-speech',draft);
  };
  function end(){
   if(active!==current||current.ending)return;current.ending=true;
   if(current.timer!==null)clearTimeout(current.timer);onState('ending');
   current.timer=setTimeout(finish,2500);
   try{rec.stop();}catch{finish();}
  }
  current.end=end;
  rec.onstart=()=>{
   if(active!==current||current.ending)return;
   if(current.timer!==null)clearTimeout(current.timer);onState('listening');current.timer=setTimeout(()=>{current.timer=null;end();},30000);
  };
  rec.onresult=event=>{
   if(active!==current)return;
   const results=Array.from(event.results);
   current.draft=results.map(r=>r[0].transcript).join('').trim().slice(0,1200);
   current.final=results.filter(r=>r.isFinal).map(r=>r[0].transcript).join('').trim().slice(0,1200);
   onTranscript(current.draft);
  };
  rec.onerror=event=>fallback(event.error);
  rec.onend=finish;
  onState('starting');current.timer=setTimeout(()=>fallback('timeout'),8000);
  try{rec.start();}catch{fallback('service-not-allowed');}
 }
 return {start,end(){active?.end();},cancel};
}
