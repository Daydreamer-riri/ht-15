import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createTerrainSurface} from '../src/terrain-surface.js';
import {createOfficeNavigation} from '../src/office-navigation.js';
import {explorerScenes} from '../src/explorer-ui.js';

const scene=JSON.parse(readFileSync(new URL('../src/alpine-lake.json',import.meta.url)));
const data=JSON.parse(readFileSync(new URL('../public/alpine-lake/terrain.json',import.meta.url)));
const surface=createTerrainSurface({...data,...scene.navigation});

test('the independent scene stays out of every public scene menu',()=>{
 assert.deepEqual(explorerScenes.map(([key])=>key),['hackathon','two-floor','building2','terrace','cafeteria']);
 assert(!explorerScenes.some(([key])=>key==='alpine-lake'));
 assert.deepEqual(scene.modelRotation,[0,0,0,1]);
 const [x,,z]=scene.settings.cameras[0].initial.position;
 assert(surface.contains(x,z));
 assert(Number.isFinite(surface.heightAt(x,z)));
});

test('lake shore and grass routes connect in both directions with mesh heights',()=>{
 const route=[[0,1],[-3,1],[-3,2],[0,2],[2,2],[2,3],[0,4]];
 let p={x:0,z:1};let min=Infinity,max=-Infinity;
 for(const [x,z] of [...route,...route.toReversed()]){
  p=surface.move(p.x,p.z,x,z);
  assert(Math.hypot(p.x-x,p.z-z)<1e-6,`cannot reach ${x},${z}`);
  assert(Math.abs(p.y-surface.heightAt(x,z))<1e-8);
  min=Math.min(min,p.y);max=Math.max(max,p.y);
 }
 assert(max-min>.4,'walking must follow the uneven supplied ground');
});

test('water, missing ground and model boundaries block even very long movement',()=>{
 for(const target of [[0,-20],[0,40],[-40,1],[40,1]]){
  const p=surface.move(0,1,...target);
  assert(surface.contains(p.x,p.z));
  assert(Math.hypot(p.x-target[0],p.z-target[1])>1);
 }
 for(const point of [[0,-2],[0,8],[50,50],[NaN,1],[Infinity,1]])assert(!surface.contains(...point));
});

test('sampling respects holes, radius and cliffs without zero-height fallbacks',()=>{
 const heights=Array.from({length:20*20},(_,i)=>(i%20)*.02);
 for(let z=0;z<20;z++)heights[z*20+10]=null;
 const s=createTerrainSurface({origin:[0,0],cellSize:.1,width:20,depth:20,heights,radius:.12});
 assert(s.contains(.5,.8));assert(!s.contains(.95,.8));assert(!s.contains(.05,.8));
 assert(Number.isNaN(s.heightAt(.95,.8)));
 const p=s.move(.5,.8,1.5,.8);
 assert(p.x<.8&&s.contains(p.x,p.z));
 assert(Math.abs(s.heightAt(.55,.8)-.11)<1e-9);
 const cliff=createTerrainSurface({origin:[0,0],cellSize:.1,width:20,depth:20,
  heights:heights.map((v,i)=>i%20>=10?3:(i%20)*.02),radius:.12});
 assert(cliff.move(.5,.8,1.5,.8).x<.9);
});

test('controller resets, walks, jumps and restores on the variable-height terrain',()=>{
 class Events{handlers=new Map();addEventListener(t,f){this.handlers.set(t,[...(this.handlers.get(t)??[]),f]);}removeEventListener(){} }
 globalThis.window=new Events();window.matchMedia=()=>({matches:false});
 globalThis.document=new Events();
 const canvas=new Events();let position,update;
 const camera={camera:{},setPosition(...p){position=p;},setEulerAngles(){}};
 const app={root:{findComponents:()=>[{entity:camera}]},on(t,f){update=f;},off(){}};
 const nav=createOfficeNavigation({app,state:{}},null,scene.settings.cameras[0].initial,{querySelector:()=>canvas,dataset:{},clientWidth:844,clientHeight:390},surface);
 const tick=n=>{for(let i=0;i<n;i++)update(1/60);};
 nav.setWalkingMotion(false);
 assert(Math.abs(position[1]-surface.heightAt(position[0],position[2])-surface.eyeHeight)<1e-8);
 nav.setMoveInput(1,0);tick(90);nav.stop();tick(1);
 assert(Math.hypot(position[0],position[2]-1)>.5);
 assert(Math.abs(position[1]-surface.heightAt(position[0],position[2])-surface.eyeHeight)<1e-8);
 const before=position[1];nav.jump();tick(10);assert(position[1]>before+.2);tick(90);
 assert(Math.abs(position[1]-before)<1e-8);
 assert(nav.restorePose({position:[-3,99,1],yaw:0,pitch:0}));tick(1);
 assert(Math.abs(position[1]-surface.heightAt(-3,1)-surface.eyeHeight)<1e-8);
 nav.reset();assert(Math.abs(position[1]-surface.heightAt(0,1)-surface.eyeHeight)<1e-8);
 nav.destroy();
});
