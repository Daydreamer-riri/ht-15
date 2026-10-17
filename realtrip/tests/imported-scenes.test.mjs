import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {createOfficeNavigation} from '../src/office-navigation.js';
import {explorerScenes,explorerScenePath} from '../src/explorer-ui.js';
import {npcScene,npcConfig} from '../src/npc-scene.js';
import {viewerPhysicsPlugin,exposeViewerPhysics} from '../../scripts/viewer-physics-plugin.mjs';

const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const hall=json('../src/venue.json'),floors=json('../src/two-floor.json');
const solids=json('../public/two-floor/solids.json'),checks=json('../public/two-floor/navigation-checks.json');
const metadata=json('../public/venue/scene.voxel.json');
const bytes=readFileSync(new URL('../public/venue/scene.voxel.bin',import.meta.url));
const binary=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
// Test the same pinned native physics exports as the browser bundle.
const output=await build({entryPoints:['realtrip/src/dynamic-navigation.js'],plugins:[viewerPhysicsPlugin],bundle:true,write:false,format:'esm',platform:'node',external:['node:worker_threads'],logLevel:'silent'});
const {createVoxelBody,createSolidBody}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].contents).toString('base64'));

test('NPC capsule blocks forward motion on the real venue floor at several frame rates and permits backing away',()=>{
 for(const dt of [1/120,1/60,1/20]){
  const body=createVoxelBody(metadata,binary,hall.settings.realtripWalk,hall.navigation,npcScene.characterObstacles);
  const start=npcScene.settings.cameras[0].initial.position;
  body.physics.reset([start[0],start[1]-body.eyeHeight,start[2]]);
  let closest=Infinity;
  for(let frame=0;frame<6/dt;frame++){
   const p=body.physics.getState(),dx=npcConfig.position[0]-p.x,dz=npcConfig.position[2]-p.z,d=Math.hypot(dx,dz);
   const next=body.physics.update(dt,1.65*dx/d,1.65*dz/d);
   closest=Math.min(closest,Math.hypot(next.x-npcConfig.position[0],next.z-npcConfig.position[2]));
   assert(next.y>-1.4&&next.y<-.5,'standing on original floor');
  }
  assert(closest>=.4199&&closest<.44,'stops at NPC radius + walker radius');
  const contact=body.physics.getState(),dx=contact.x-npcConfig.position[0],dz=contact.z-npcConfig.position[2],d=Math.hypot(dx,dz);
  for(let frame=0;frame<.3/dt;frame++)body.physics.update(dt,dx/d,dz/d);
  const end=body.physics.getState();assert(Math.hypot(end.x-contact.x,end.z-contact.z)>.2);
 }
});

class Events {
 callbacks=new Map();
 addEventListener(type,fn){if(!this.callbacks.has(type))this.callbacks.set(type,new Set());this.callbacks.get(type).add(fn);}
 removeEventListener(type,fn){this.callbacks.get(type)?.delete(fn);}
 send(type,data={}){for(const fn of this.callbacks.get(type)??[])fn({target:{closest:()=>false},preventDefault(){},...data});}
}
function controller(body,initial){
 globalThis.window=new Events();window.matchMedia=()=>({matches:false});globalThis.document=new Events();
 const canvas=new Events();canvas.setPointerCapture=()=>{};
 const world={dataset:{},querySelector:()=>canvas};
 let tick;
 const camera={camera:{fov:initial.fov},setPosition(){},setEulerAngles(){}};
 const app={root:{findComponents:()=>[{entity:camera}]},on(_,fn){tick=fn;},off(){}};
 const nav=createOfficeNavigation({app,state:{}},null,initial,world,body);nav.setWalkingMotion(false);
 return {nav,canvas,tick:()=>tick(1/60),step(n){for(let i=0;i<n;i++)tick(1/60);}};
}

test('five scenes and old aliases stay within the same Pages entrance',()=>{
 assert.deepEqual(explorerScenes.map(([id])=>id),['hackathon','two-floor','building2','terrace','cafeteria']);
 const base='/haojiaxu/hackathon-15/walk/';
 assert.equal(explorerScenePath('hackathon',base),base+'?scene=hackathon');
 assert.equal(explorerScenePath('honor-corridor',base),base+'?scene=two-floor');
 assert.throws(()=>exposeViewerPhysics('changed upstream'),/hook changed/);
});

test('shared joystick controller walks both stair flights up/down and both floors without jumping',()=>{
 for(const route of checks.walks){
  const start=route.points[0],initial={position:[start[0],start[1]+1.6,start[2]],target:[start[0],start[1]+1.6,start[2]-1],fov:85};
  const f=controller(createSolidBody(solids,floors.navigation),initial);
  try{
   for(const target of route.points.slice(1)){
    let reached=false;
    for(let frame=0;frame<2400;frame++){
     const p=f.nav.getPose().position,dx=target[0]-p[0],dz=target[2]-p[2],distance=Math.hypot(dx,dz);
     if(distance<.065){reached=true;break;}
     f.nav.setMoveInput(dx/Math.max(.25,distance),-dz/Math.max(.25,distance));f.tick();
     assert(p[1]>1.4&&p[1]<5.2,'No falling through floors or jumping onto a different flight');
    }
    assert(reached,route.name+': cannot reach '+target);
    f.nav.stop();f.step(30);
    assert(Math.abs(f.nav.getPose().position[1]-target[1]-1.6)<.23,'Correct floor height at '+target);
   }
  }finally{f.nav.destroy();}
 }
});

test('solid furniture blocks walking but allows jumping onto a chair',()=>{
 const {physics}=createSolidBody(solids,floors.navigation);
 const {start,velocity,moveFrames,seatId}=checks.chair;
 physics.reset(start);
 for(let i=0;i<120;i++)physics.update(1/60,...velocity);
 assert.notEqual(physics.getState().support,seatId,'Walking does not climb a chair');
 physics.reset(start);physics.jump();
 for(let i=0;i<moveFrames;i++)physics.update(1/60,...velocity);
 for(let i=0;i<120;i++)physics.update(1/60,0,0);
 assert.equal(physics.getState().support,seatId);
});

test('voxel physics preserves every auditorium spawn, eye height, jump, landing and reset',()=>{
 for(const initial of Object.values(hall.waypoints)){
  const body=createVoxelBody(metadata,binary,hall.settings.realtripWalk,hall.navigation);
  assert(Math.abs(body.eyeHeight-.8)<1e-10);
  const f=controller(body,initial);
  try{
   f.step(180);const standing=f.nav.getPose().position;
   assert(Math.abs(standing[1]-initial.position[1])<.2);
   window.send('keydown',{code:'Space',repeat:false});f.step(12);
   assert(f.nav.getPose().position[1]>standing[1]+.1,'Space jumps using the native collision');
   window.send('keyup',{code:'Space'});f.step(180);
   assert(Math.abs(f.nav.getPose().position[1]-standing[1])<.05);
   f.nav.setMoveInput(0,1);f.step(60);f.nav.reset();f.step(120);
   const reset=f.nav.getPose().position;
   assert(Math.hypot(...reset.map((v,i)=>v-standing[i]))<.05);
  }finally{f.nav.destroy();}
 }
});

test('both imported scenes share keyboard/joystick speed, touch look, menu-stop and dialog-pause',()=>{
 for(const [body,initial] of [[createSolidBody(solids,floors.navigation),floors.settings.cameras[0].initial],[createVoxelBody(metadata,binary,hall.settings.realtripWalk,hall.navigation),hall.settings.cameras[0].initial]]){
  const f=controller(body,initial);
  try{
   const start=f.nav.getPose();window.send('keydown',{code:'KeyW'});f.step(30);window.send('keyup',{code:'KeyW'});f.nav.stop();
   const keyboard=f.nav.getPose();assert(Math.hypot(keyboard.position[0]-start.position[0],keyboard.position[2]-start.position[2])>.4);
   f.nav.reset();f.nav.setMoveInput(0,1);f.step(30);f.nav.stop();
   assert.deepEqual(f.nav.getPose(),keyboard,'Same joystick and keyboard trajectory');
   f.nav.setMoveInput(0,1);document.send('explorer-menu-open');f.step(60);
   assert.deepEqual(f.nav.getPose().position.filter((_,i)=>i!==1),keyboard.position.filter((_,i)=>i!==1),'Menu stops horizontal drift');
   f.nav.setEnabled(false);const paused=f.nav.getPose();window.send('keydown',{code:'KeyW'});f.step(30);assert.deepEqual(f.nav.getPose(),paused);
   f.nav.setEnabled(true);f.canvas.send('pointerdown',{pointerType:'touch',pointerId:1,clientX:300,clientY:200});
   f.canvas.send('pointermove',{pointerId:1,clientX:200,clientY:250});f.canvas.send('pointerup',{pointerId:1});
   assert.equal(f.nav.getPose().yaw,paused.yaw+16);assert.equal(f.nav.getPose().pitch,paused.pitch-8);
   assert.equal(f.nav.restorePose(paused),false,'Do not flatten multi-level physics when restoring a static-floor pose');
  }finally{f.nav.destroy();}
 }
});
