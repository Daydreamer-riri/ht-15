import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3} from 'three';
import {createPlayerModel,PLAYER_EYE_HEIGHT as modelEye} from '../../scripts/player-model.mjs';
import {playerPlacement,createPlayerMotion,PLAYER_EYE_HEIGHT} from '../src/companion/player-motion.js';

test('embodied avatar aligns its eyes with the existing venue camera without changing physics',()=>{
 assert.equal(modelEye,PLAYER_EYE_HEIGHT);
 for(const yaw of [0,90,180,-270]){
  const placed=playerPlacement({position:[1,-.27,2],yaw},.8);
  assert(Math.abs(placed.position[1]+PLAYER_EYE_HEIGHT*placed.scale+.27)<1e-10);
  assert.equal(placed.yaw,yaw+180);
  assert.equal(placed.scale,.8/1.64);
 }
});
test('walking is driven by displacement; stopping, teleporting and reduced motion settle safely',()=>{
 const motion=createPlayerMotion();let p;
 for(let i=0;i<100;i++)p=motion.update(1/60,[i*.01,0,0]);
 assert(p.weight>.7);assert(Math.abs(p.legL)>1);
 p=motion.update(1/60,[99,0,99]);assert(Math.abs(p.legL)<=17);
 for(let i=0;i<120;i++)p=motion.update(1/60,[99,0,99]);
 assert(p.weight<1e-7);assert(Math.abs(p.legL)<.0001);
 motion.wave();p=motion.update(.05,[99,0,99],{reduced:true});
 assert.equal(p.legL,0);assert.equal(p.armR,0);assert.equal(p.breath,1);
});
test('wave bends the elbow, finishes, and leaves the camera/body root unmoved',()=>{
 const motion=createPlayerMotion();motion.wave();let p;
 for(let i=0;i<20;i++)p=motion.update(.05,[0,0,0]);
 assert(p.waving);assert(p.elbowR<-70);assert(p.armR<-30);
 for(let i=0;i<60;i++)p=motion.update(.05,[0,0,0]);
 assert(!p.waving);assert.equal(p.elbowR,-8);assert.equal(p.weight,0);
});
test('model is articulated, human-scale, finite and self-contained with glasses and left watch',()=>{
 const model=createPlayerModel(),bounds=new Box3().setFromObject(model);
 assert(bounds.max.y>1.75&&bounds.max.y<1.86);
 assert(bounds.min.y>-.02&&bounds.min.y<.04);
 for(const name of ['Head','Neck','LegL','LegR','KneeL','KneeR','ArmL','ArmR','ElbowL','ElbowR','LeftWristWatch','Metal glasses frame','Parted black hair'])assert(model.getObjectByName(name),name);
 model.traverse(o=>{if(o.geometry){const a=o.geometry.attributes.position.array;assert(a.every(Number.isFinite),o.name);}});
 const glb=readFileSync(new URL('../models/player/personal-avatar.glb',import.meta.url));
 assert.equal(glb.subarray(0,4).toString(),'glTF');assert(glb.length<5*1024*1024);
 assert.equal(glb.readUInt32LE(8),glb.length);
 const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)));
 assert(!json.buffers.some(b=>b.uri));assert.equal(json.images.length,2);
 const binary=glb.subarray(28+glb.readUInt32LE(12));
 for(const image of json.images){
  assert(!image.uri);assert.equal(image.mimeType,'image/png');
  const view=json.bufferViews[image.bufferView];assert.equal(view.byteOffset%4,0);
  assert(view.byteOffset+view.byteLength<=binary.length);
  const embedded=binary.subarray(view.byteOffset,view.byteOffset+view.byteLength);
  assert.equal(embedded.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.deepEqual(embedded,readFileSync(new URL(`../models/player/prints/${image.name}`,import.meta.url)));
 }
 for(const [name,side] of [['Front tag print',1],['Back loading print',-1]]){
  const print=model.getObjectByName(name);assert.equal(print.parent.name,'Body');
  const positions=print.geometry.attributes.position,uv=print.geometry.attributes.uv;
  assert.equal(uv.count,positions.count);
  assert(positions.getZ(0)*side>0);assert((positions.getX(1)-positions.getX(0))*side>0,'text is readable from its side');
  if(side<0)assert(new Box3().setFromObject(print).max.x<0,'back print stays on wearer’s right');
  assert(json.materials.find(m=>m.name===name)?.pbrMetallicRoughness.baseColorTexture);
 }
});

test('third-person camera stays behind and above the complete avatar, with wall clearance',async()=>{
 const {cameraOrbit,cameraClearance}=await import('../src/companion/follow-camera.js');
 const pose={position:[0,.8,0],yaw:0,pitch:0};
 const orbit=cameraOrbit(pose,{eyeHeight:.8,aspect:390/844});
 assert(orbit.position[2]>1.5);assert(orbit.position[1]>.8);
 assert(orbit.target[1]>.4&&orbit.target[1]<.6);
 assert.deepEqual(cameraClearance(orbit.target,orbit.position,()=>null),orbit.position);
 const desired=[0,.5,2],target=[0,.5,0];
 const constrained=cameraClearance(target,desired,()=>({x:0,y:.5,z:.8}));
 assert(Math.abs(constrained[2]-.71)<1e-9);
 for(const yaw of [-180,0,90,180,360])for(const pitch of [-75,0,75])assert(cameraOrbit({...pose,yaw,pitch}).position.every(Number.isFinite));
});
