import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodePcmWav,createCloudRecognition} from '../src/npc-audio.js';
import {createCloudSpeech} from '../src/npc-cloud-speech.js';
import {validateRecording} from '../../voice-server/app.mjs';

test('microphone PCM becomes a valid mono 16 kHz WAV at common device rates',async()=>{
 for(const rate of [16000,44100,48000]){
  const samples=new Float32Array(rate).fill(.25),blob=encodePcmWav([samples.subarray(0,101),samples.subarray(101)],rate),b=Buffer.from(await blob.arrayBuffer());
  assert.equal(validateRecording(b),1);assert.equal(b.length,32044);assert(Math.abs(b.readInt16LE(44)-8191)<=1);
 }
});
function recognitionHarness({fetchImpl,mediaDevices}={}){
 const states=[],complete=[],errors=[],contexts=[],tracks=[],transcripts=[];
 const node=()=>({connect(){},disconnect(){}});
 class Context{constructor(){this.sampleRate=48000;this.destination={};contexts.push(this);}resume(){return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}createGain(){return {...node(),gain:{value:0}};}createMediaStreamSource(){return node();}createScriptProcessor(){return this.processor=node();}}
 const microphone={getUserMedia:async()=>{const track={stop(){this.stopped=true;},addEventListener(){}};tracks.push(track);return {getTracks:()=>[track],getAudioTracks:()=>[track]};}};
 const c=createCloudRecognition({getEndpoint:()=> 'https://voice.example',workletUrl:'worklet.js',AudioContext:Context,WorkletNode:null,mediaDevices:mediaDevices||microphone,fetchImpl:fetchImpl||(async()=>Response.json({text:'你好小蓝'})),onState:v=>states.push(v),onTranscript:(text,meta)=>transcripts.push({text,...meta}),onComplete:t=>complete.push(t),onFallback:e=>errors.push(e)});
 return {c,states,complete,errors,contexts,tracks,transcripts,frame(value=.2){contexts.at(-1).processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048).fill(value)}});}};
}
const settle=()=>new Promise(setImmediate);
test('recording previews are visible before stopping but only the final transcript is submitted',async()=>{
 const calls=[];const h=recognitionHarness({fetchImpl:async(_,options)=>{calls.push(options);return Response.json({text:h.tracks[0].stopped?'你好小蓝，介绍一下会场':'你好小兰'});}});
 await h.c.start();for(let i=0;i<40;i++)h.frame();await settle();
 assert.deepEqual(h.transcripts,[{text:'你好小兰',final:false}]);assert.deepEqual(h.complete,[]);assert.equal(h.tracks[0].stopped,undefined);assert.equal(calls.length,1);
 for(let i=0;i<40;i++)h.frame();await settle();assert.equal(calls.length,1,'preview uploads are throttled');
 await h.c.end();assert.deepEqual(h.complete,['你好小蓝，介绍一下会场']);assert.deepEqual(h.transcripts.at(-1),{text:'你好小蓝，介绍一下会场',final:true});assert.equal(calls.length,2);
});
test('late preview cannot overwrite final recognition, and cancelled previews never submit',async()=>{
 let oldReply,previewSignal;let calls=0;const h=recognitionHarness({fetchImpl:async(_,options)=>{calls++;if(calls===1){previewSignal=options.signal;return new Promise(r=>oldReply=r);}return Response.json({text:'最终内容'});}});
 await h.c.start();for(let i=0;i<140;i++)h.frame();assert.equal(calls,1,'only one preview may be in flight');
 await h.c.end();assert(previewSignal.aborted);oldReply(Response.json({text:'迟到预览'}));await settle();
 assert.deepEqual(h.transcripts,[{text:'最终内容',final:true}]);assert.deepEqual(h.complete,['最终内容']);
 let cancelledReply;const cancelled=recognitionHarness({fetchImpl:()=>new Promise(r=>cancelledReply=r)});
 await cancelled.c.start();for(let i=0;i<40;i++)cancelled.frame();cancelled.c.cancel();cancelledReply(Response.json({text:'取消后内容'}));await settle();assert.deepEqual(cancelled.transcripts,[]);assert.deepEqual(cancelled.complete,[]);
});
test('preview service errors leave recording active and final recognition available',async()=>{
 let calls=0;const h=recognitionHarness({fetchImpl:async()=>++calls===1?new Response('',{status:503}):Response.json({text:'完整问题'})});
 await h.c.start();for(let i=0;i<40;i++)h.frame();await settle();assert.equal(h.states.at(-1),'listening');assert.deepEqual(h.errors,[]);
 await h.c.end();assert.deepEqual(h.complete,['完整问题']);assert.equal(h.states.at(-1),'idle');
});
test('cloud recognition records, releases microphone before upload and submits confirmed text once',async()=>{
 let uploaded;const h=recognitionHarness({fetchImpl:async(_,{body,signal})=>{assert(h.tracks[0].stopped);assert.equal(signal.aborted,false);uploaded=Buffer.from(await body.arrayBuffer());return Response.json({text:'你好小蓝'});}});
 await h.c.start();assert.equal(h.states.at(-1),'listening');for(let i=0;i<20;i++)h.frame();await h.c.end();
 assert(validateRecording(uploaded)>.8);assert.deepEqual(h.complete,['你好小蓝']);assert.equal(h.states.at(-1),'idle');assert(h.contexts[0].closed);h.c.cancel();
});
test('cancelling during permission or transcription stops tracks and ignores late results',async()=>{
 let grant;const track={stop(){this.stopped=true;}};const waiting=recognitionHarness({mediaDevices:{getUserMedia:()=>new Promise(r=>grant=r)}});
 const start=waiting.c.start();waiting.c.cancel();grant({getTracks:()=>[track]});await start;assert(track.stopped);assert.deepEqual(waiting.complete,[]);
 let reply,signal;const h=recognitionHarness({fetchImpl:async(_,o)=>{signal=o.signal;return new Promise(r=>reply=r);}});await h.c.start();for(let i=0;i<20;i++)h.frame();const end=h.c.end();h.c.cancel();assert(signal.aborted);reply(Response.json({text:'迟到回答'}));await end;assert.deepEqual(h.complete,[]);assert.deepEqual(h.errors,[]);
});
test('permission rejection and silence leave an actionable error without sending audio',async()=>{
 const rejected=recognitionHarness({mediaDevices:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError');}}});await rejected.c.start();assert.deepEqual(rejected.errors,['not-allowed']);assert.equal(rejected.states.at(-1),'idle');
 const quiet=recognitionHarness({fetchImpl:()=>assert.fail('silent recording must not be uploaded')});await quiet.c.start();for(let i=0;i<20;i++)quiet.frame(0);await quiet.c.end();assert.deepEqual(quiet.errors,['no-speech']);assert(quiet.tracks[0].stopped);
});
function speechHarness({fetchImpl}={}){
 const events=[],instances=[],revoked=[];let requests=0,urls=0;
 class Media{constructor(){this.currentTime=0;this.paused=true;this.calls=0;instances.push(this);}play(){this.calls++;this.paused=false;return this.blocked?Promise.reject(new DOMException('blocked','NotAllowedError')):Promise.resolve();}pause(){this.paused=true;}}
 const c=createCloudSpeech({Audio:Media,URLApi:{createObjectURL:()=>`blob:test-${++urls}`,revokeObjectURL:u=>revoked.push(u)},getEndpoint:()=> 'https://voice.example',fetchImpl:async(...args)=>{requests++;return fetchImpl?fetchImpl(...args):new Response(new Uint8Array([1,2]));},onQueued:()=>events.push('queued'),onStart:()=>events.push('playing'),onEnd:()=>events.push('idle'),onCaption:t=>events.push({caption:t}),onComplete:()=>events.push('complete'),onError:e=>events.push({error:e})});
 c.unlock();return {c,events,instances,revoked,get requests(){return requests;},advance(time=.2){instances[0].currentTime=time;instances[0].onplaying?.();},end(){instances[0].currentTime=1;instances[0].onended?.();}};
}
test('cloud playback cancellation ignores stale audio and waits for actual playback progress',async()=>{
 let reply;const h=speechHarness({fetchImpl:()=>new Promise(r=>reply=r)});
 const first=h.c.speak('旧回答');h.c.stop();reply(new Response(new Uint8Array([1])));await first;assert(!h.events.includes('playing'));
 const second=h.c.speak('新回答');reply(new Response(new Uint8Array([1])));await settle();
 h.advance(0);assert(!h.events.includes('playing'),'queued and play() alone do not prove playback');
 h.advance();assert(h.events.includes('playing'));assert.deepEqual(h.events.find(e=>e.caption),{caption:'新回答'});h.end();await second;h.c.destroy();
});
test('blocked autoplay exposes retry and cached replay starts synchronously in the tap',async()=>{
 const h=speechHarness();h.instances[0].blocked=true;await h.c.speak('可重播的回复');
 assert(h.events.some(e=>e.error?.includes('重播')));assert(!h.events.includes('playing'));assert.equal(h.requests,1);
 h.instances[0].blocked=false;const before=h.instances[0].calls;const replay=h.c.speak('可重播的回复');
 assert.equal(h.instances[0].calls,before+1,'cache hit plays before an asynchronous boundary');assert.equal(h.requests,1,'retry reuses downloaded voice');
 h.advance();h.end();await replay;assert(h.events.includes('complete'));h.c.destroy();assert.equal(h.revoked.length,2);
});
test('stalled media resets the speaking indicator and offers an actionable retry',async t=>{
 let time=0;t.mock.method(Date,'now',()=>time);t.mock.timers.enable({apis:['setInterval']});
 const h=speechHarness();const pending=h.c.speak('播放停住');await settle();h.advance();assert(h.events.includes('playing'));
 time=4000;t.mock.timers.tick(4000);await pending;
 assert(h.events.at(-1).error.includes('重播'));assert.equal(h.events.at(-3),'idle');assert(h.instances[0].paused);h.c.destroy();
});
test('a resolved play promise with a frozen clock cannot leave the UI preparing forever',async t=>{
 let time=0;t.mock.method(Date,'now',()=>time);t.mock.timers.enable({apis:['setInterval']});
 const h=speechHarness();const pending=h.c.speak('声音没有启动');await settle();
 time=6500;t.mock.timers.tick(6500);await pending;
 assert(!h.events.includes('playing'));assert(h.events.at(-1).error.includes('重播'));h.c.destroy();
});
test('service errors preserve text and never animate a silent speaking state',async()=>{
 const h=speechHarness({fetchImpl:async()=>new Response('',{status:429})});await h.c.speak('保留这段文字');
 assert(!h.events.includes('playing'));assert(h.events.some(e=>e.error?.includes('语音服务正忙')));assert(h.events.some(e=>e.caption==='保留这段文字'));h.c.destroy();
});
test('cancelling active playback removes callbacks and cannot complete an old answer',async()=>{
 const h=speechHarness();const pending=h.c.speak('停止播放');await settle();h.advance();h.c.stop();await pending;
 assert(!h.events.includes('complete'));assert.equal(h.instances[0].onended,null);assert(h.instances[0].paused);h.c.destroy();
});
