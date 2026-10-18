import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {createVoiceProvider} from './provider.mjs';
import {createChatProvider} from './chat-provider.mjs';
import {createVoiceHandler} from './app.mjs';
export {validateRecording} from './app.mjs';

export function createVoiceServer(options){
 const handle=createVoiceHandler(options);
 const server=http.createServer(async(req,res)=>{
  const controller=new AbortController(),cancel=()=>controller.abort();req.on('aborted',cancel);res.on('close',cancel);
  try{
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>1024*1024){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'录音太长。'}));return;}chunks.push(chunk);}
   const result=await handle({method:req.method,path:new URL(req.url,'http://localhost').pathname,headers:req.headers,ip:req.socket.remoteAddress,body:Buffer.concat(chunks),signal:controller.signal});
   if(!res.destroyed){res.writeHead(result.statusCode,result.headers);res.end(result.body);}
  }catch{if(!res.destroyed){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'请求中断，请重试。'}));}}finally{req.off('aborted',cancel);res.off('close',cancel);}
 });
 server.requestTimeout=50000;server.headersTimeout=10000;return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const provider=createVoiceProvider({apiKey:process.env.DASHSCOPE_API_KEY,workspaceId:process.env.DASHSCOPE_WORKSPACE_ID,voice:process.env.NPC_VOICE||'Ethan'});
 const origins=process.env.NPC_ALLOWED_ORIGINS?.split(',').map(s=>s.trim()).filter(Boolean);
 const chatProvider=createChatProvider({apiKey:process.env.DASHSCOPE_API_KEY,workspaceId:process.env.DASHSCOPE_WORKSPACE_ID,model:process.env.NPC_CHAT_MODEL||'qwen-plus'});
 const server=createVoiceServer({provider,chatProvider,...(origins?.length?{origins}:{})});
 const port=Number(process.env.PORT||process.env.FC_CUSTOM_LISTEN_PORT||8849);
 server.listen(port,'0.0.0.0',()=>console.log(`NPC voice server listening on ${port}; provider configured: ${provider.ready}`));
}
