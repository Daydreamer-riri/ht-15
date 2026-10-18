import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceProvider} from '../provider.mjs';
import {createVoiceServer} from '../server.mjs';
import {createVoiceHandler,validateRecording} from '../app.mjs';
import {createFcHandler} from '../fc.mjs';
import {encodePcmWav} from '../../realtrip/src/npc-audio.js';
const wav=Buffer.from(await encodePcmWav([new Float32Array(16000).fill(.1)],16000).arrayBuffer());
const provider={ready:true,async transcribe(bytes){assert.deepEqual(bytes,wav);return '你好小蓝';},async synthesize(text){assert.equal(text,'你好');return {type:'audio/wav',bytes:wav};}};
test('HTTP service serves binary speech and ASR with exact CORS, rejecting invalid or oversized audio',async t=>{
 const server=createVoiceServer({provider});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port;
 const pre=await fetch(base+'/api/npc/transcribe',{method:'OPTIONS',headers:{Origin:'https://pages.release.ctripcorp.com'}});assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),'https://pages.release.ctripcorp.com');
 assert.equal((await fetch(base+'/health',{headers:{Origin:'https://evil.example'}})).status,403);
 const asr=await fetch(base+'/api/npc/transcribe',{method:'POST',body:wav});assert.deepEqual(await asr.json(),{text:'你好小蓝'});
 const speech=await fetch(base+'/api/npc/speak',{method:'POST',body:JSON.stringify({text:'你好'})});assert.deepEqual(Buffer.from(await speech.arrayBuffer()),wav);
 for(const body of [Buffer.from('not audio'),Buffer.alloc(1100000)]){const res=await fetch(base+'/api/npc/transcribe',{method:'POST',body});assert([400,413].includes(res.status));}
 const damaged=Buffer.from(wav);damaged.writeUInt32LE(2,28);assert.throws(()=>validateRecording(damaged));
});
test('FC event adapter handles capitalized headers, base64 recordings and binary responses',async()=>{
 const handler=createFcHandler({provider});const event={rawPath:'/api/npc/transcribe',requestContext:{http:{method:'POST',sourceIp:'test'}},headers:{Origin:'https://pages.release.ctripcorp.com'},body:wav.toString('base64'),isBase64Encoded:true};
 const result=await handler(Buffer.from(JSON.stringify(event)));assert.equal(result.statusCode,200);assert(!Object.keys(result.headers).some(name=>/^access-control-/i.test(name)));assert.deepEqual(JSON.parse(Buffer.from(result.body,'base64')),{text:'你好小蓝'});
 const preflight=await handler({...event,requestContext:{http:{method:'OPTIONS'}},body:''});assert.equal(preflight.statusCode,204);assert(!Object.keys(preflight.headers).some(name=>/^access-control-/i.test(name)));
 const forbidden=await handler({...event,headers:{Origin:'https://evil.example'}});assert.equal(forbidden.statusCode,403);
 const audio=await handler({...event,rawPath:'/api/npc/speak',body:JSON.stringify({text:'你好'}),isBase64Encoded:false});assert.equal(audio.statusCode,200);assert.deepEqual(Buffer.from(audio.body,'base64'),wav);
});
test('rate limits, concurrency and provider errors do not expose credentials',async()=>{
 const app=createVoiceHandler({provider,limit:1});const req={method:'POST',path:'/api/npc/speak',body:Buffer.from('{"text":"你好"}')};assert.equal((await app(req)).statusCode,200);assert.equal((await app(req)).statusCode,429);
 let complete;const concurrent=createVoiceHandler({provider:{...provider,synthesize:()=>new Promise(r=>complete=r)},maxConcurrent:1});const pending=concurrent(req);assert.equal((await concurrent({...req,ip:'other'})).statusCode,429);complete({bytes:wav,type:'audio/wav'});await pending;
 const failed=createVoiceHandler({provider:{...provider,synthesize:async()=>{throw Error('secret backend details');}}});const result=await failed(req);assert.equal(result.statusCode,500);assert(!result.body.toString().includes('secret'));
});
test('provider sends verified Qwen formats with cancellation and fetches only permitted audio URLs',async()=>{
 let n=0;const c=new AbortController();const p=createVoiceProvider({apiKey:'test-only',fetchImpl:async(url,options)=>{
  assert.equal(options.signal,c.signal);if(n++===2){assert.equal(new URL(url).protocol,'https:');return new Response(wav,{headers:{'Content-Type':'audio/wav'}});}
  assert.equal(options.headers.Authorization,'Bearer test-only');const body=JSON.parse(options.body);
  if(body.model==='qwen3-asr-flash'){assert.match(body.messages[0].content[0].input_audio.data,/^data:audio\/wav;base64,/);return Response.json({choices:[{message:{content:'你好小蓝'}}]});}
  assert.equal(body.input.voice,'Ethan');return Response.json({output:{audio:{url:'http://output.oss.aliyuncs.com/voice.wav'}}});
 }});assert.equal(await p.transcribe(wav,c.signal),'你好小蓝');assert.deepEqual((await p.synthesize('你好',c.signal)).bytes,wav);
 const unsafe=createVoiceProvider({apiKey:'test-only',fetchImpl:async()=>Response.json({output:{audio:{url:'http://127.0.0.1/internal'}}})});await assert.rejects(unsafe.synthesize('你好'),/无效音频/);
 const denied=createVoiceProvider({apiKey:'test-only',fetchImpl:async()=>new Response('private details',{status:401})});await assert.rejects(denied.transcribe(wav),/凭据无效/);
});
