import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWalkSurface} from '../src/walk-surface.js';
import {createOfficeNavigation} from '../src/office-navigation.js';

const scene=JSON.parse(readFileSync(new URL('../src/insta360.json',import.meta.url)));
const surface=createWalkSurface(scene.navigation);

test('all starts share the captured eye level and fit the reviewed floor',()=>{
 for(const start of Object.values(scene.waypoints)){
  assert(surface.contains(start.position[0],start.position[2]));
  assert(Math.abs(start.position[1]-surface.floorY-surface.eyeHeight)<1e-6);
 }
});

test('a person can walk through the doorway in both directions without a height step',()=>{
 const path=[[0,.22],[2.2,.22],[2.2,-2.2],[-3,-2.2],[2.2,-2.2],[2.2,.22],[0,.22]];
 let [x,z]=path[0];
 for(const [nx,nz] of path.slice(1)){
  const result=surface.move(x,z,nx,nz);
  assert(Math.hypot(result.x-nx,result.z-nz)<1e-6,`blocked before ${nx},${nz}`);
  assert.equal(result.y,surface.floorY);({x,z}=result);
 }
});

test('table, glass wall, railing and thin jamb block a swept movement',()=>{
 for(const [start,end] of [
  [[0,.22],[0,2]], // conference table
  [[-3,-2.2],[-3,.5]], // wall outside doorway
  [[-3,-2.2],[-3,-4]], // railing
  [[2.2,-.8],[1.2,-.8]] // doorway jamb
 ]){
  const hit=surface.move(...start,...end);
  assert(surface.contains(hit.x,hit.z));
  assert(Math.hypot(hit.x-end[0],hit.z-end[1])>.2);
 }
 // Both aisles are freely walkable, without following capture order.
 for(const x of [-1.25,1.35])assert(surface.move(x,.3,x,2.4).z>2.39);
});

test('slightly oblique approaches pass through both sides of the doorway',()=>{
 for(const [start,end] of [
  [[1.98,-1.8],[2.35,.2]],[[2.45,-1.8],[2.05,.2]],
  [[2.35,.2],[1.98,-1.8]],[[2.05,.2],[2.45,-1.8]]
 ]){
  const foot=surface.move(...start,...end);
  assert(Math.hypot(foot.x-end[0],foot.z-end[1])<1e-6,'An oblique joystick approach must clear the opening');
 }
});

test('controller preserves calibrated height, jump, stop and help pause with the floor surface',()=>{
 class Events{
  callbacks=new Map();
  addEventListener(t,f){if(!this.callbacks.has(t))this.callbacks.set(t,new Set());this.callbacks.get(t).add(f);}
  removeEventListener(t,f){this.callbacks.get(t)?.delete(f);}
  send(t,p){for(const f of this.callbacks.get(t)??[])f({target:{closest:()=>null},preventDefault(){},...p});}
 }
 globalThis.window=new Events();window.matchMedia=()=>({matches:false});globalThis.document=new Events();
 const canvas=new Events();let position,update;
 const camera={camera:{fov:68},setPosition(...p){position=p;},setEulerAngles(){}};
 const app={root:{findComponents:()=>[{entity:camera}]},on(_,fn){update=fn;},off(){}};
 const nav=createOfficeNavigation({app,state:{}},null,scene.waypoints.door,{querySelector:()=>canvas,dataset:{}},surface);
 nav.setWalkingMotion(false);nav.setMoveInput(0,1);
 for(let i=0;i<115;i++)update(1/60);
 assert(position[2]>.25,'controller must actually cross the door');
 assert(Math.abs(position[1]-(surface.floorY+surface.eyeHeight))<1e-6);
 nav.stop();const stopped=[...position];for(let i=0;i<60;i++)update(1/60);assert.deepEqual(position,stopped);
 nav.jump();for(let i=0;i<12;i++)update(1/60);assert(position[1]>.2);
 for(let i=0;i<60;i++)update(1/60);assert(Math.abs(position[1]-(surface.floorY+surface.eyeHeight))<1e-6);
 nav.setEnabled(false);nav.setMoveInput(0,1);for(let i=0;i<60;i++)update(1/60);assert.deepEqual(position,stopped);
 nav.reset();assert(Math.abs(position[1]-(surface.floorY+surface.eyeHeight))<1e-6);nav.destroy();assert.equal(window.callbacks.get('keydown').size,0);
});
