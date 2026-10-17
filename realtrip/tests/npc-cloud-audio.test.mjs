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
 const states=[],complete=[],errors=[],contexts=[],tracks=[];
 const node=()=>({connect(){},disconnect(){}});
 class Context{constructor(){this.sampleRate=48000;this.destination={};contexts.push(this);}resume(){return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}createGain(){return {...node(),gain:{value:0}};}createMediaStreamSource(){return node();}createScriptProcessor(){return this.processor=node();}}
 const microphone={getUserMedia:async()=>{const track={stop(){this.stopped=true;},addEventListener(){}};tracks.push(track);return {getTracks:()=>[track],getAudioTracks:()=>[track]};}};
 const c=createCloudRecognition({getEndpoint:()=> 'https://voice.example',workletUrl:'worklet.js',AudioContext:Context,WorkletNode:null,mediaDevices:mediaDevices||microphone,fetchImpl:fetchImpl||(async()=>Response.json({text:'你好小蓝'})),onState:v=>states.push(v),onTranscript(){},onComplete:t=>complete.push(t),onFallback:e=>errors.push(e)});
 return {c,states,complete,errors,contexts,tracks,frame(value=.2){contexts.at(-1).processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048).fill(value)}});}};
}
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
test('cloud playback cancellation ignores a stale fetch and allows the next answer',async()=>{
 let reply;const started=[],captions=[],sources=[];
 class Context{constructor(){this.sampleRate=48000;this.destination={};}resume(){return Promise.resolve();}close(){return Promise.resolve();}createBuffer(){return {};}createBufferSource(){const n={connect(){},disconnect(){},start(){},stop(){}};sources.push(n);return n;}decodeAudioData(){return Promise.resolve({duration:1});}}
 const c=createCloudSpeech({AudioContext:Context,getEndpoint:()=> 'https://voice.example',fetchImpl:()=>new Promise(r=>reply=r),onQueued(){},onStart:()=>started.push(true),onEnd(){},onCaption:t=>captions.push(t),onComplete(){},onError:assert.fail});
 c.unlock();const first=c.speak('旧回答');c.stop();reply(new Response(new Uint8Array([1])));await first;assert.deepEqual(started,[]);
 const second=c.speak('新回答');reply(new Response(new Uint8Array([1])));for(let i=0;i<10;i++)await new Promise(setImmediate);assert.deepEqual(captions,['新回答']);sources.at(-1).onended();await second;c.destroy();
});
