import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNpcRecognition,embeddedBrowser,recognitionHint} from '../src/npc-recognition.js';
import {createNpcGreeting} from '../src/npc-greeting.js';
import {addCapsuleObstacles} from '../src/collision-obstacles.js';

function recognitionHarness(t){
 t.mock.timers.enable({apis:['setTimeout']});
 const instances=[],states=[],complete=[],fallback=[],transcripts=[];
 class Recognition{constructor(){instances.push(this);}start(){}stop(){this.stopped=true;}abort(){this.aborted=true;}}
 const controller=createNpcRecognition({Recognition,onState:s=>states.push(s),onTranscript:s=>transcripts.push(s),onComplete:s=>complete.push(s),onFallback:(error,draft)=>fallback.push({error,draft})});
 t.after(()=>controller.cancel());
 return {controller,instances,states,complete,fallback,transcripts,result(text,final){const result=[{transcript:text}];result.isFinal=final;instances.at(-1).onresult({results:[result]});}};
}

test('recognition waits for actual recording and final text before submitting once',t=>{
 const h=recognitionHarness(t);h.controller.start();const rec=h.instances[0];assert.equal(h.states.at(-1),'starting');
 rec.onstart();assert.equal(h.states.at(-1),'listening');h.result('你好',false);assert.deepEqual(h.complete,[]);
 h.result('你好小蓝',true);const staleEnd=rec.onend;rec.onend();staleEnd();
 assert.deepEqual(h.complete,['你好小蓝']);assert.equal(h.states.at(-1),'idle');assert(rec.aborted);
});

test('no start, missing end, and error without end cannot leave recording stuck',t=>{
 const h=recognitionHarness(t);h.controller.start();const staleStart=h.instances[0].onstart;
 t.mock.timers.tick(8000);assert.equal(h.fallback.at(-1).error,'timeout');staleStart();assert.equal(h.states.at(-1),'idle');
 h.controller.start();h.instances[1].onstart();h.result('保留草稿',false);h.instances[1].onerror({error:'network'});
 assert.deepEqual(h.fallback.at(-1),{error:'network',draft:'保留草稿'});assert.equal(h.states.at(-1),'idle');
 h.controller.start();h.instances[2].onstart();h.result('尚未确认',false);h.controller.end();t.mock.timers.tick(2500);
 assert.deepEqual(h.complete,[]);assert.deepEqual(h.fallback.at(-1),{error:'incomplete',draft:'尚未确认'});
});

test('cancelled recording suppresses late events and max recording time settles',t=>{
 const h=recognitionHarness(t);h.controller.start();h.instances[0].onstart();h.result('不要发送',true);
 const late=h.instances[0].onend;h.controller.cancel();late();assert.deepEqual(h.complete,[]);assert.deepEqual(h.fallback,[]);
 h.controller.start();h.instances[1].onstart();t.mock.timers.tick(30000);assert(h.instances[1].stopped);t.mock.timers.tick(2500);
 assert.equal(h.states.at(-1),'idle');assert.equal(h.fallback.at(-1).error,'no-speech');
});

test('unsupported engines offer keyboard fallback and embedded browser advice',()=>{
 const events=[];createNpcRecognition({onState(){},onFallback:e=>events.push(e)}).start();assert.deepEqual(events,['unsupported']);
 for(const [ua,name] of [['MicroMessenger/8.0','微信'],['MicroMessenger wxwork/4.0','企业微信'],['Lark/7.0','飞书'],['Feishu/7.0','飞书'],['Safari/605','']])assert.equal(embeddedBrowser(ua),name);
 assert.match(recognitionHint('network','飞书'),/键盘.*系统浏览器/);assert.match(recognitionHint('not-allowed'),/权限/);
});

test('greeting requires dwell, avoids edge repeats, and does not interrupt conversations',()=>{
 const g=createNpcGreeting();assert(!g.update(true,false,0));assert(g.update(true,false,.7));assert(!g.update(true,false,10));
 g.update(false,false,11);g.update(true,false,12);assert(!g.update(true,false,13));assert(!g.update(true,false,40));
 g.update(false,false,41);g.update(true,false,42);assert(g.update(true,false,43));
 g.update(false,false,80);g.update(true,true,81);assert(!g.update(true,false,82));
 g.update(false,false,90);g.update(true,false,91);g.dismiss();assert(!g.update(true,false,92));
});

test('capsule obstacles allow sliding, handle overlap, preserve floor rays and ignore other floors',()=>{
 const floor={queryCapsule(x,y,z,half,r,out){if(y-half-r<0){out.x=out.z=0;out.y=half+r-y;return true;}return false;},queryRay:()=>({y:0})};
 const collision=addCapsuleObstacles(floor,[{x:0,z:0,radius:.28,bottom:0,top:1}]),out={};
 assert.equal(collision.queryRay().y,0);
 collision.queryCapsule(.2,.4,0,.3,.14,out);assert(Math.abs(out.x-.22001)<1e-5);assert(out.y>.039);
 collision.queryCapsule(0,.5,0,.3,.14,out);assert(Object.values(out).every(Number.isFinite));
 assert(!collision.queryCapsule(0,3,0,.3,.14,out));
 let x=.42001,z=0;
 for(let i=0;i<100;i++){x-=.001;z+=.005;collision.queryCapsule(x,.5,z,.3,.14,out);x+=out.x;z+=out.z;assert(Math.hypot(x,z)>=.41999);}
 assert(z>.45,'tangential movement slides past the body');
});
