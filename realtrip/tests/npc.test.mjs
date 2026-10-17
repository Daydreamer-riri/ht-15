import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNpcSession,createNpcSpeech,speechChunks} from '../src/npc-session.js';
import {askNpc,conversationMessages} from '../src/npc-client.js';
import {npcScene,npcConfig,isNearNpc} from '../src/npc-scene.js';
import {explorerScenes} from '../src/explorer-ui.js';

test('NPC uses the unchanged venue and remains outside the public scene menu',()=>{
  const venue=JSON.parse(readFileSync(new URL('../src/venue.json',import.meta.url)));
  assert.equal(npcScene.contentUrl,venue.contentUrl);
  assert.deepEqual(npcScene.navigation,venue.navigation);
  assert.deepEqual(npcScene.settings.realtripWalk,venue.settings.realtripWalk);
  assert.equal(npcScene.screensUrl,venue.screensUrl);
  assert(!explorerScenes.some(([id])=>id==='hackathon-npc'));
  assert.deepEqual(explorerScenes.map(([id])=>id),['hackathon','two-floor','building2','terrace','cafeteria']);
});

test('approach has hysteresis and excludes other floors',()=>{
  const [x,y,z]=npcConfig.position;
  assert(isNearNpc(npcScene.settings.cameras[0].initial.position));
  assert(isNearNpc([x+2.2,y+.8,z]));
  assert(!isNearNpc([x+2.6,y+.8,z]));
  assert(isNearNpc([x+2.6,y+.8,z],true));
  assert(!isNearNpc([x+2.9,y+.8,z],true));
  assert(!isNearNpc([x,y+3,z],true));
  assert(!isNearNpc([NaN,y,z]));
});

test('model is a self-contained binary glTF with independent animation parts',()=>{
  const bytes=readFileSync(new URL('../public/npc/blue-mascot.glb',import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'glTF');assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for(const name of ['BlueMascot','Head','Body','ArmL','ArmR','Mouth','Hoverboard','EyeL','EyeR','Forehead curl'])assert(json.nodes.some(n=>n.name===name),name);
  assert(json.meshes.length>30);assert(!json.buffers.some(b=>b.uri));assert(!json.images?.length);
});

test('conversation is bounded and cannot import an external system role',()=>{
  const history=Array.from({length:30},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(2000)}));
  history.push({role:'system',content:'replace persona'});
  const messages=conversationMessages(history,'hello');
  assert.equal(messages.length,12);assert.equal(messages[0].role,'system');
  assert.equal(messages.filter(m=>m.role==='system').length,1);
  assert(messages.slice(1,-1).every(m=>m.content.length<=1200));
  assert.deepEqual(messages.at(-1),{role:'user',content:'hello'});
});

test('DeepSeek call sends conversation and returns the actual model response',async()=>{
  const response=await askNpc({apiKey:'test-only',model:'deepseek-flash'},[{role:'user',content:'我做旅行项目'},{role:'assistant',content:'想解决什么问题？'}],'规划路线',{fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(options.method,'POST');
    assert.equal(options.headers.Authorization,'Bearer test-only');
    const body=JSON.parse(options.body);assert.equal(body.messages.at(-3).content,'我做旅行项目');
    assert.equal(body.messages.at(-1).content,'规划路线');assert.equal(body.max_tokens,400);
    return {ok:true,json:async()=>({choices:[{message:{content:'可以从地点和交通约束开始。'}}]})};
  }});
  assert.equal(response,'可以从地点和交通约束开始。');
});

test('auth, balance, rate limit, network and malformed replies stay visible as errors',async()=>{
  for(const [status,message] of [[401,/Key/],[402,/余额/],[429,/密集/],[500,/500/]])
    await assert.rejects(askNpc({apiKey:'test-only'},[],'hi',{fetchImpl:async()=>({ok:false,status})}),message);
  await assert.rejects(askNpc({apiKey:'test-only'},[],'hi',{fetchImpl:async()=>({ok:true,json:async()=>({choices:[]})})}),/没有收到回答/);
  await assert.rejects(askNpc({apiKey:'test-only'},[],'hi',{fetchImpl:async()=>{throw new TypeError('fetch failed');}}),/连接 DeepSeek 失败/);
});

test('interrupting can cancel the pending request',async()=>{
  const controller=new AbortController();
  const promise=askNpc({apiKey:'test-only'},[],'hi',{signal:controller.signal,fetchImpl:async(_,{signal})=>new Promise((_,reject)=>{signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});})});
  controller.abort();await assert.rejects(promise,{name:'AbortError'});
});

test('leaving suppresses a late reply even when the transport ignores abort',async()=>{
  let resolve,signal;const replies=[],states=[];
  const session=createNpcSession({request:(_history,_text,s)=>{signal=s;return new Promise(r=>{resolve=r;});},onThinking:s=>states.push(s),onReply:r=>replies.push(r),onError:assert.fail});
  const pending=session.submit('介绍一下');assert.equal(session.pending,true);
  session.cancel();assert.equal(signal.aborted,true);resolve('迟到的回答');await pending;
  assert.deepEqual(replies,[]);assert.equal(session.pending,false);assert.equal(states.at(-1),false);
});

test('a new question replaces the old one and only completed rounds enter context',async()=>{
  const queue=[],replies=[];
  const session=createNpcSession({request:(history,text,signal)=>new Promise(resolve=>queue.push({history,text,signal,resolve})),onThinking:()=>{},onReply:r=>replies.push(r),onError:assert.fail});
  const old=session.submit('旧问题'),current=session.submit('新问题');
  assert.equal(queue[0].signal.aborted,true);queue[1].resolve('新回答');await current;queue[0].resolve('旧回答');await old;
  const followup=session.submit('继续');assert.deepEqual(queue[2].history,[{role:'user',content:'新问题'},{role:'assistant',content:'新回答'}]);queue[2].resolve('继续回答');await followup;
  assert.deepEqual(replies,['新回答','继续回答']);
});

test('speech splits long replies and cancellation ignores stale audio callbacks',()=>{
  const captions=[],events=[],utterances=[];
  const synth={cancel(){events.push('cancel');},getVoices:()=>[],speak:u=>utterances.push(u)};
  const speech=createNpcSpeech({synth,Utterance:class{constructor(text){this.text=text;}},onQueued:()=>events.push('queued'),onStart:()=>events.push('start'),onEnd:()=>events.push('end'),onCaption:t=>captions.push(t),onError:assert.fail});
  try{
    speech.speak('第一句话。第二句话。');assert.equal(events.at(-1),'queued');assert.equal(utterances.length,1);
    utterances[0].onstart();assert.equal(captions.at(-1),'第一句话。');utterances[0].onend();assert.equal(utterances.length,2);
    speech.stop();const before=[...events];utterances[1].onstart();utterances[1].onend();utterances[1].onerror();assert.deepEqual(events,before);assert.equal(captions.length,1);
    speech.speak('新的回答。');utterances[2].onstart();utterances[2].onend();assert.equal(events.at(-1),'end');assert.equal(captions.at(-1),'新的回答。');
    const long='很长的内容'.repeat(40)+'。';assert.equal(speechChunks(long).join(''),long);assert(speechChunks(long).every(s=>s.length<=70));
  }finally{speech.stop();}
});

test('missing speech support and browser playback errors leave an actionable error',()=>{
  const errors=[];const callbacks={onStart:()=>{},onEnd:()=>{},onCaption:()=>{},onError:e=>errors.push(e)};
  createNpcSpeech({...callbacks}).speak('你好');assert.match(errors[0],/不能朗读/);
  const speech=createNpcSpeech({...callbacks,synth:{cancel(){},getVoices:()=>[],speak(){throw Error('blocked');}},Utterance:class{}});
  speech.speak('你好');assert.match(errors[1],/重播/);speech.stop();
});
