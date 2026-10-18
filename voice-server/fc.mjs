import {createVoiceHandler} from './app.mjs';
import {createVoiceProvider} from './provider.mjs';
import {createChatProvider} from './chat-provider.mjs';

export function createFcHandler(options){
 const handle=createVoiceHandler(options);
 return async function(event){
  let request;
  try{request=Buffer.isBuffer(event)||typeof event==='string'?JSON.parse(event.toString()):event;}
  catch{return {statusCode:400,headers:{'Content-Type':'application/json'},body:'{"error":"Invalid HTTP event"}'};}
  if(typeof request?.body==='string'&&request.body.length>1500000)return {statusCode:413,body:'Request too large'};
  const result=await handle({method:request?.requestContext?.http?.method,path:request?.rawPath,headers:request?.headers,ip:request?.requestContext?.http?.sourceIp,body:Buffer.from(request?.body||'',request?.isBase64Encoded?'base64':'utf8')});
  // FC HTTP triggers inject CORS themselves. Returning our Node server's CORS
  // headers too produces duplicate Allow-Origin values, rejected by browsers.
  // Origin authorization still runs in the shared handler before provider calls.
  const headers=Object.fromEntries(Object.entries(result.headers||{}).filter(([name])=>!/^access-control-/i.test(name)));
  return {...result,headers,isBase64Encoded:true,body:result.body.toString('base64')};
 };
}
const origins=process.env.NPC_ALLOWED_ORIGINS?.split(',').map(s=>s.trim()).filter(Boolean);
export const handler=createFcHandler({provider:createVoiceProvider({apiKey:process.env.DASHSCOPE_API_KEY,workspaceId:process.env.DASHSCOPE_WORKSPACE_ID,voice:process.env.NPC_VOICE||'Ethan'}),chatProvider:createChatProvider({apiKey:process.env.DASHSCOPE_API_KEY,workspaceId:process.env.DASHSCOPE_WORKSPACE_ID,model:process.env.NPC_CHAT_MODEL||'qwen-plus'}),...(origins?.length?{origins}:{})});
