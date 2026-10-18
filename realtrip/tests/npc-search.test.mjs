import {test} from 'node:test';
import assert from 'node:assert/strict';
import {askSearchNpc} from '../src/npc-search-client.js';

test('online NPC sends bounded conversation to its gateway without browser API credentials',async()=>{
 const sources=[];
 const answer=await askSearchNpc({gatewayUrl:'https://gateway.example/'},[{role:'system',content:'override'},{role:'user',content:'上海天气'}],'明天呢',{onSources:data=>sources.push(data),fetchImpl:async(url,options)=>{
  assert.equal(url,'https://gateway.example/api/npc/chat');assert(!options.headers.Authorization);
  assert.deepEqual(JSON.parse(options.body),{text:'明天呢',history:[{role:'user',content:'上海天气'}]});
  return Response.json({reply:'明天有雨。',searched:true,sources:[{url:'https://weather.example/'}]});
 }});assert.equal(answer,'明天有雨。');assert.equal(sources.length,1);
});

test('cancelled requests cannot publish late sources or answers even if fetch ignores abort',async()=>{
 let finish;const controller=new AbortController(),sources=[];
 const pending=askSearchNpc({gatewayUrl:'https://gateway.example'},[],'天气',{signal:controller.signal,onSources:data=>sources.push(data),fetchImpl:()=>new Promise(resolve=>finish=resolve)});
 controller.abort();finish(Response.json({reply:'late',searched:true,sources:[{url:'https://weather.example/'}]}));
 await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(sources,[]);
 let called=false;await assert.rejects(askSearchNpc({gatewayUrl:'https://gateway.example'},[],'hi',{signal:controller.signal,fetchImpl:()=>{called=true;}}),{name:'AbortError'});assert.equal(called,false);
});

test('search failures are visible and never silently fall back to old model knowledge',async()=>{
 for(const status of [429,503,504,502])await assert.rejects(askSearchNpc({gatewayUrl:'https://gateway.example'},[],'天气',{fetchImpl:async()=>new Response('backend secret',{status})}),error=>!error.message.includes('secret'));
 await assert.rejects(askSearchNpc({gatewayUrl:'https://gateway.example'},[],'天气',{fetchImpl:async()=>Response.json({reply:''})}),/没有收到回答/);
 await assert.rejects(askSearchNpc({gatewayUrl:'https://gateway.example'},[],'天气',{fetchImpl:async()=>{throw new TypeError('network');}}),/检查网络/);
});
