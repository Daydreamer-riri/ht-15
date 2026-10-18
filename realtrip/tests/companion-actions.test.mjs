import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {companionCommand,approachCandidates} from '../src/companion/commands.js';
import {planApproach,createApproachMotion} from '../src/companion/approach-motion.js';
import {photoView,captureTimestamp} from '../src/companion/photo-composition.js';
import {npcConfig,npcScene} from '../src/npc-scene.js';
import {viewerPhysicsPlugin} from '../../scripts/viewer-physics-plugin.mjs';
import {conversationMessages,NPC_SYSTEM_PROMPT} from '../src/npc-client.js';

test('spoken and typed action phrases are explicit; questions and negations do not trigger photos or movement',()=>{
 for(const t of ['小蓝，过来一下','来我旁边吧','小兰到我身边来','你可以过来互动吗'])assert.equal(companionCommand(t),'come',t);
 for(const t of ['一起拍个合照吧','我们合个影','咱们合个照吧','帮我拍张照','可以和我一起拍照吗'])assert.equal(companionCommand(t),'photo',t);
 for(const t of ['你好','今天的天气怎么样','怎么让小蓝过来','不要拍合照','如果我说过来会怎样','“过来”是什么意思'])assert([null,'cancel'].includes(companionCommand(t)),t);
 for(const t of ['取消拍照','别过来','小蓝不要拍照'])assert.equal(companionCommand(t),'cancel',t);
 assert.equal(conversationMessages([],'你好')[0].content,NPC_SYSTEM_PROMPT,'original NPC keeps its capabilities');
 assert.equal(conversationMessages([{role:'system',content:'untrusted'}],'你好','Companion capabilities')[0].content,'Companion capabilities');
 assert.equal(conversationMessages([{role:'system',content:'untrusted'}],'你好','Companion capabilities').length,2);
});
test('approach plans around walls, checks diagonal gaps, rejects cliffs and unreachable goals',()=>{
 const project=p=>(Math.abs(p[0])<.15&&Math.abs(p[2])<.6)?null:[p[0],0,p[2]];
 const path=planApproach([-1,0,0],[1,0,0],{project});assert(path&&path.some(p=>Math.abs(p[2])>.6));
 const motion=createApproachMotion([-1,0,0],90,path,project);let last=[-1,0,0],result;
 for(let i=0;i<1600;i++){result=motion.update(.025);assert(project(result.position));assert(Math.hypot(result.position[0]-last[0],result.position[2]-last[2])<=.42*.025+.00001);last=result.position;if(result.arrived||result.failed)break;}
 assert(result.arrived&&!result.failed);
 assert.equal(planApproach([-1,0,0],[1,0,0],{project:p=>Math.abs(p[0])<.25?null:[p[0],0,p[2]],maxDistance:2}),null);
 assert.equal(planApproach([0,0,0],[1,0,0],{project:p=>[p[0],p[0]>.5?1:0,p[2]]}),null);
});
test('approaching slows smoothly, pauses, and stops for a visitor entering its route',()=>{
 const project=p=>[p[0],0,p[2]],motion=createApproachMotion([0,0,0],90,[[2,0,0]],project);
 let result;for(let i=0;i<40;i++)result=motion.update(.025);
 const paused=motion.update(.05,{paused:true});assert.deepEqual(paused.position,result.position);
 const visitor=[result.position[0]+.56,.8,0];
 for(let i=0;i<60;i++){result=motion.update(.025,{player:visitor});assert(Math.hypot(result.position[0]-visitor[0],result.position[2]-visitor[2])>=.55999);}
 assert(result.failed);
});
test('portrait photo fits both people and declines a fully obstructed camera instead of clipping',()=>{
 for(const aspect of [.46,.9,1.8]){const view=photoView([0,.8,0],[.72,.16,0],{aspect});assert(view);assert(view.distance>1);assert(view.position.every(Number.isFinite));}
 assert.equal(photoView([0,.8,0],[.72,.16,0],{cast:(from)=>({x:from[0],y:from[1],z:from[2]})}),null);
 const date=new Date('2026-10-18T03:12:34Z');assert.deepEqual(captureTimestamp(date),{date:'2026.10.18',time:'11:12:34',filename:'xiaolan-20261018-111234.png'});
});

const bundle=await build({entryPoints:['realtrip/src/companion/third-person-navigation.js'],plugins:[viewerPhysicsPlugin],bundle:true,write:false,format:'esm',platform:'node',external:['node:worker_threads'],logLevel:'silent'});
const {loadCompanionSurface,createThirdPersonNavigation}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
test('perspective changes keep the player anchored; photo lock survives speech state changes and restores first person',()=>{
 const originalWindow=globalThis.window,originalDocument=globalThis.document;
 class Events{addEventListener(){}removeEventListener(){}}
 globalThis.window=new Events();window.matchMedia=()=>({matches:false});globalThis.document=new Events();
 const canvas=new Events(),world={querySelector:()=>canvas,clientWidth:390,clientHeight:844,dataset:{}},callbacks=new Set();
 const camera={camera:{},setPosition(p){this.position=[p.x,p.y,p.z];},setEulerAngles(){},lookAt(){}};
 const app={root:{findComponents:()=>[{entity:camera}]},on:(_,fn)=>callbacks.add(fn),off:(_,fn)=>callbacks.delete(fn)};
 const surface={eyeHeight:.8,floorY:0,speed:.65,contains:()=>true,move:(_x,_z,x,z)=>({x,z,y:0})};
 const navigation=createThirdPersonNavigation({app,state:{}},null,{position:[0,.8,0],target:[0,.8,-1],fov:75},world,surface);
 const tick=()=>{for(const fn of callbacks)fn(1/60);};
 try{
  const before=navigation.getPose();navigation.setPerspective('first');tick();assert.deepEqual(navigation.getPose(),before);assert(camera.position.every((v,i)=>Math.abs(v-before.position[i])<1e-6));
  navigation.setInteractionLocked(true);navigation.setEnabled(true);navigation.setMoveInput(1,0);for(let i=0;i<60;i++)tick();assert.deepEqual(navigation.getPose(),before);
  navigation.setPhotoView({target:[0,.4,0],position:[0,.6,2]});tick();assert.equal(world.dataset.perspective,'photo');
  navigation.setPhotoView(null);navigation.setInteractionLocked(false);tick();assert.equal(navigation.getPerspective(),'first');assert(camera.position.every((v,i)=>Math.abs(v-before.position[i])<1e-6));
  navigation.setPerspective('third');tick();assert.deepEqual(navigation.getPose(),before);assert(Number(world.dataset.cameraDistance)>1);
 }finally{navigation.destroy();globalThis.window=originalWindow;globalThis.document=originalDocument;}
});
test('come and photo destinations are reachable from Xiaolan on the actual venue collision map',async()=>{
 const fetchOriginal=globalThis.fetch;
 try{
  globalThis.fetch=async path=>{const bytes=readFileSync(new URL('../public/'+String(path).replace(/^\//,''),import.meta.url));return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
  const surface=await loadCompanionSurface(npcScene,'');
  const player=npcScene.settings.cameras[0].initial.position,yaw=Math.atan2(-(npcConfig.position[0]-player[0]),-(npcConfig.position[2]-player[2]))*180/Math.PI;
  for(const photo of [false,true]){
   const goals=approachCandidates(player,npcConfig.position,yaw,{photo});let route;
   for(const goal of goals){route=planApproach(npcConfig.position,goal,{project:surface.characters.project,player});if(route)break;}
   assert(route,photo?'photo spot reachable':'come spot reachable');
   const motion=createApproachMotion(npcConfig.position,npcConfig.rotation,route,surface.characters.project);let result;
   for(let i=0;i<1400;i++){result=motion.update(.025,{player});assert(surface.characters.canOccupy(result.position));if(result.arrived||result.failed)break;}
   assert(result.arrived&&!result.failed,JSON.stringify({photo,route,result}));
  }
 }finally{globalThis.fetch=fetchOriginal;}
});
