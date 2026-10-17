import {Vec3} from 'playcanvas';
import {WalkController,VoxelCollision} from '@playcanvas/supersplat-viewer/viewer';
import {createSolidPhysics} from './solid-physics.js';

// Both adapters expose foot coordinates. All keys, touch look, joystick, easing,
// pause, reset and camera framing remain in our shared office-navigation module.
export function createSolidBody(config, navigation) {
 return {...navigation,physics:createSolidPhysics(config)};
}

export function createVoxelBody(metadata, buffer, config, navigation) {
 if(metadata.version!=='1.1'||buffer.byteLength!==4*(metadata.nodeCount+metadata.leafDataCount))
  throw Error('Invalid world-space voxel collision');
 const words=new Uint32Array(buffer);
 const collision=new VoxelCollision(metadata,words.slice(0,metadata.nodeCount),words.slice(metadata.nodeCount));
 const walker=new WalkController();
 for(const key of ['eyeHeight','hoverHeight','capsuleHeight','capsuleRadius','jumpSpeed']) {
  if(Number.isFinite(config[key])&&config[key]>0)walker[key]=config[key];
 }
 // Our controller already smooths camera-relative velocity. A factor of one in
 // this viewer means no extra horizontal damping; retain its gravity/contact.
 walker.velocityDampingGround=walker.velocityDampingAir=1;
 const eyeHeight=walker.eyeHeight+walker.hoverHeight;
 let jumping=false;
 function state(){const p=walker._position;return {x:p.x,y:p.y-eyeHeight,z:p.z,grounded:walker._grounded};}
 const physics={
  reset(foot){
   jumping=false;walker.collision=collision;
   walker.onEnter({position:new Vec3(foot[0],foot[1]+eyeHeight,foot[2]),angles:new Vec3(),distance:1,fov:90});
   if(walker.collision!==collision)throw Error('The spawn has no clear voxel collision capsule');
   return state();
  },
  jump(){jumping=true;},
  stop(){jumping=false;walker._velocity.x=walker._velocity.z=0;},
  update(dt,vx,vz){
   dt=Math.max(0,Math.min(.05,dt));
   if(dt===0)return state();
   const steps=Math.ceil(dt/(1/120)),h=dt/steps;
   for(let i=0;i<steps;i++){
    walker._velocity.x=vx;walker._velocity.z=vz;
    walker._step(h,[0,jumping?1:0,0]);jumping=false;
   }
   return state();
  },
  getState:state
 };
 return {...navigation,eyeHeight,physics};
}

export async function loadDynamicNavigation(scene,base) {
 const nav=scene.navigation;
 async function fetchAsset(url,format){
  const response=await fetch(url);
  if(!response.ok)throw Error(`Collision asset: HTTP ${response.status}`);
  return response[format]();
 }
 const metadata=await fetchAsset(base+nav.url,'json');
 if(nav.kind==='solid-body')return createSolidBody(metadata,nav);
 const binary=await fetchAsset(base+nav.url.replace(/\.json$/,'.bin'),'arrayBuffer');
 return createVoxelBody(metadata,binary,scene.settings.realtripWalk,nav);
}
