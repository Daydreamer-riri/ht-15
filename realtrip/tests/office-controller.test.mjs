import {strict as assert} from 'node:assert';
import {createOfficeNavigation} from '../src/office-navigation.js';
import {createWalkSurface} from '../src/walk-surface.js';
import {readFileSync} from 'node:fs';

class Events {
  callbacks=new Map();
  addEventListener(type, fn){if(!this.callbacks.has(type))this.callbacks.set(type,new Set());this.callbacks.get(type).add(fn);}
  removeEventListener(type, fn){this.callbacks.get(type)?.delete(fn);}
  send(type, props={}){for(const fn of this.callbacks.get(type)??[])fn({target:{closest(){return null;}},preventDefault(){},...props});}
}
globalThis.window=new Events();window.matchMedia=()=>({matches:false});
globalThis.document=new Events();
const canvas=new Events();canvas.setPointerCapture=()=>{};
let position, update, angles;
const cam={camera:{},setPosition(...p){position=p;},setEulerAngles(...a){angles=a;}};
const app={root:{findComponents(){return [{entity:cam}];}},on(_,fn){update=fn;},off(){}};
const route={points:Array.from({length:60},(_,i)=>[0,i>.1?Math.max(0,i-30)*.05:0,-i*.4]),width:Array(60).fill(.7),speed:Array(60).fill(1.5),eyeHeight:1.6};
const world={querySelector(){return canvas;},dataset:{}};
const nav=createOfficeNavigation({app,state:{}},route,{position:[0,1.6,0],target:[0,1.6,-3]},world);
const tick=(n=60)=>{for(let i=0;i<n;i++)update(1/60);};
assert.equal(position[1],1.6);
window.send('keydown',{code:'KeyW'});tick(120);window.send('keyup',{code:'KeyW'});tick(60);
assert(position[2]<-2.7 && position[2]>-3.3,'W must move about three metres in two seconds');
const floor=position[1];window.send('keydown',{code:'Space',repeat:false});tick(18);
assert(position[1]>floor+.3,'Desktop Space must jump');
window.send('keyup',{code:'Space'});tick(120);assert(Math.abs(position[1]-floor)<.01,'Jump returns to the same floor');
nav.setMoveInput(1,0);tick(180);assert(Math.abs(position[0])<=.481,'Joystick cannot leave capture corridor');
nav.stop();const stopped=[...position];tick();assert(Math.hypot(position[0]-stopped[0],position[2]-stopped[2])<1e-6,'Stop cannot drift');
nav.setEnabled(false);window.send('keydown',{code:'KeyW'});nav.setMoveInput(0,1);tick();assert.equal(position[2],stopped[2],'Help dialog pauses movement');
nav.setEnabled(true);nav.reset();nav.setWalkingMotion(false);nav.setMoveInput(0,1);tick(80);assert.equal(position[1],1.6,'Turning walking motion off removes bobbing');
nav.reset();nav.setMoveInput(0,1);let lastY=position[1];
for(let i=0;i<850;i++){update(1/60);assert(Math.abs(position[1]-lastY)<.02,'Ramp cannot cause abrupt vertical jumps');lastY=position[1];}
assert(position[1]>2.1,'Walking continues up the ramp');
nav.reset();window.send('keydown',{code:'KeyW'});tick(20);document.send('explorer-menu-open');
const menuPosition=[...position];tick(30);assert.equal(position[2],menuPosition[2],'Opening the scene picker stops held movement');
window.send('keydown',{code:'ArrowDown',target:{closest:()=>true}});tick(30);
assert.equal(position[2],menuPosition[2],'Menu keyboard navigation does not move the camera');
nav.destroy();assert.equal(window.callbacks.get('keydown').size,0);
assert.equal(document.callbacks.get('explorer-menu-open').size,0,'Scene picker listener is cleaned up');
world.clientWidth=1600;world.clientHeight=900;
const capped=createOfficeNavigation({app,state:{}},route,{position:[0,1.6,0],target:[0,1.6,-3],fov:58,maxHorizontalFov:70},world);
assert(cam.camera.fov<44 && cam.camera.fov>42,'Portrait scans cap desktop horizontal field of view');
world.clientWidth=390;world.clientHeight=844;tick(1);
assert.equal(cam.camera.fov,58,'Portrait screens retain the configured vertical field of view');
capped.destroy();
world.clientWidth=1600;world.clientHeight=900;
const framed=createOfficeNavigation({app,state:{}},route,{position:[0,1.6,0],target:[0,1.6-3*Math.tan(16*Math.PI/180),-3],fov:62,maxHorizontalFov:50,wideFraming:'horizon'},world);
assert(Math.abs(angles[0])<1e-8,'Desktop crop should face the horizon when the captured field permits it');
assert(angles[0]+cam.camera.fov/2<=-16+62/2,'Desktop framing must not expose uncaptured vertical angles');
world.clientWidth=390;world.clientHeight=844;tick(1);
assert(Math.abs(angles[0]+16)<1e-8,'Portrait view must preserve the captured pitch');
framed.destroy();
const roomView=createOfficeNavigation({app,state:{}},route,{position:[0,1.6,0],target:[0,1.6,-3],fov:68,landscapeFov:84},world);
assert.equal(cam.camera.fov,68,'Portrait room view keeps its original field of view');
world.clientWidth=844;world.clientHeight=390;tick(1);
assert.equal(cam.camera.fov,84,'Landscape room view exposes more of the doorway');
world.clientWidth=390;world.clientHeight=844;tick(1);
assert.equal(cam.camera.fov,68,'Returning to portrait restores framing');
for(const event of ['pointercancel','lostpointercapture']){
 roomView.reset();
 canvas.send('pointerdown',{pointerType:'touch',pointerId:9,clientX:200,clientY:200});
 canvas.send(event,{pointerId:9});
 canvas.send('pointermove',{pointerId:9,clientX:300,clientY:200});
 tick(12);
 assert.equal(position[1],1.6,'Interrupted touch must not cause a jump');
 assert(Math.abs(angles[1])<1e-8,'Interrupted touch must not keep turning');
}
roomView.destroy();
const cafeteria=JSON.parse(readFileSync(new URL('../src/cafeteria.json',import.meta.url)));
const comparison=createOfficeNavigation({app,state:{}},null,cafeteria.waypoints.entrance,world,createWalkSurface(cafeteria.navigation));
comparison.setMoveInput(0,1);tick(60);comparison.stop();
canvas.send('pointerdown',{pointerType:'touch',pointerId:10,clientX:350,clientY:120});
canvas.send('pointermove',{pointerId:10,clientX:80,clientY:150});
canvas.send('pointerup',{pointerId:10});tick(1);
const comparedPose=comparison.getPose();
comparison.reset();assert(position.every((v,i)=>Math.abs(v-cafeteria.waypoints.entrance.position[i])<1e-9));
assert(comparison.restorePose(comparedPose));tick(30);
assert.deepEqual(position,comparedPose.position,'Switching models keeps position without movement drift');
assert(Math.abs(angles[1]-comparedPose.yaw)<1e-8&&Math.abs(angles[0]-comparedPose.pitch)<1e-8,'Switching models keeps viewing direction');
for(const pose of [null,{...comparedPose,position:[999,0,999]},{...comparedPose,yaw:NaN},{...comparedPose,position:['0',0,0]}])assert.equal(comparison.restorePose(pose),false,'Invalid comparison views cannot escape the reviewed floor');
assert.deepEqual(position,comparedPose.position);
assert(comparison.restorePose({...comparedPose,position:[...comparedPose.position.slice(0,1),999,comparedPose.position[2]]}));
assert.equal(position[1],cafeteria.navigation.floorY+cafeteria.navigation.eyeHeight,'Restoring a view cannot change calibrated eye height');
comparison.reset();assert(position.every((v,i)=>Math.abs(v-cafeteria.waypoints.entrance.position[i])<1e-9),'Reset still returns to the entrance after a comparison');
comparison.destroy();
assert.equal(canvas.callbacks.get('lostpointercapture').size,0,'Touch capture listener is cleaned up');
console.log('Office controller: keyboard/touch movement, Space jump, stop, pause, motion toggle, smooth ramp, portrait/desktop framing and cleanup pass.');
