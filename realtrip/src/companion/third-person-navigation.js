import {Entity,Vec3} from 'playcanvas';
import {VoxelCollision} from '@playcanvas/supersplat-viewer/viewer';
import {createVoxelBody} from '../dynamic-navigation.js';
import {createOfficeNavigation} from '../office-navigation.js';
import {cameraOrbit,cameraClearance} from './follow-camera.js';

export async function loadCompanionSurface(scene,base){
 const responses=await Promise.all([fetch(base+scene.navigation.url),fetch(base+scene.navigation.url.replace(/\.json$/,'.bin'))]);
 if(responses.some(r=>!r.ok))throw Error('Venue collision unavailable');
 const [metadata,binary]=await Promise.all([responses[0].json(),responses[1].arrayBuffer()]);
 const surface=createVoxelBody(metadata,binary,scene.settings.realtripWalk,scene.navigation,scene.characterObstacles);
 const words=new Uint32Array(binary),collision=new VoxelCollision(metadata,words.slice(0,metadata.nodeCount),words.slice(metadata.nodeCount));
 surface.cameraCast=(from,direction,distance)=>collision.queryRay(...from,...direction,distance);
 surface.characters.project=point=>{
  const hit=collision.queryRay(point[0],point[1]+.4,point[2],0,-1,0,.95);
  if(!hit)return null;
  const grounded=[point[0],hit.y+.16,point[2]];
  return surface.characters.canOccupy(grounded)?grounded:null;
 };
 return surface;
}
export function createThirdPersonNavigation(viewer,_route,initial,world,surface){
 const app=viewer.app,camera=app.root.findComponents('camera')[0].entity;
 // Navigation owns a non-rendering eye-height anchor; the real camera follows
 // separately. NPC proximity must use getPose(), never the trailing camera.
 const driver=new Entity('Player navigation anchor');driver.camera={fov:initial.fov};
 const navigationViewer={state:viewer.state,app:{root:{findComponents:()=>[{entity:driver}]},on:app.on.bind(app),off:app.off.bind(app)}};
 const navigation=createOfficeNavigation(navigationViewer,null,initial,world,surface);
 const smooth=new Vec3();let initialized=false,lastRender=[],perspective='third',photo=null,interactionLocked=false,externalEnabled=true;
 const applyEnabled=()=>navigation.setEnabled(externalEnabled&&!interactionLocked);
 function update(dt){
  const pose=navigation.getPose();
  if(perspective==='first'&&!photo){
   camera.setPosition(driver.getPosition());camera.setEulerAngles(pose.pitch,pose.yaw,0);camera.camera.horizontalFov=false;camera.camera.fov=68;camera.camera.nearClip=.035;
   world.dataset.cameraPosition=pose.position.map(v=>v.toFixed(3)).join(',');world.dataset.playerPosition=world.dataset.cameraPosition;world.dataset.cameraDistance='0';world.dataset.perspective='first';
   const current=[...pose.position,pose.yaw,pose.pitch];if(current.some((v,i)=>v!==lastRender[i]))app.renderNextFrame=true;lastRender=current;return;
  }
  const orbit=photo??cameraOrbit(pose,{eyeHeight:surface.eyeHeight,aspect:world.clientWidth/world.clientHeight});
  const position=cameraClearance(orbit.target,orbit.position,surface.cameraCast),desired=new Vec3(...position);
  if(!initialized||smooth.distance(desired)>2){smooth.copy(desired);initialized=true;}
  else{
   // Pull in immediately at an obstruction; gently settle back after it clears.
   const target=new Vec3(...orbit.target),a=smooth.distance(target),b=desired.distance(target);
   smooth.lerp(smooth,desired,b<a?1:1-Math.exp(-Math.min(dt,.05)*12));
  }
  camera.setPosition(smooth);camera.lookAt(...orbit.target);camera.camera.horizontalFov=false;camera.camera.fov=photo?58:Math.max(58,Math.min(88,2*Math.atan((surface.eyeHeight*1.1)/(2*.55*Math.max(.2,smooth.distance(new Vec3(...orbit.target)))))*180/Math.PI));camera.camera.nearClip=.035;camera.camera.farClip=250;
  world.dataset.perspective=photo?'photo':perspective;
  world.dataset.cameraPosition=[smooth.x,smooth.y,smooth.z].map(v=>v.toFixed(3)).join(',');
  world.dataset.playerPosition=pose.position.map(v=>v.toFixed(3)).join(',');
  world.dataset.cameraDistance=smooth.distance(new Vec3(...orbit.target)).toFixed(3);
  const current=[...position,...orbit.target,camera.camera.fov];if(current.some((v,i)=>Math.abs(v-(lastRender[i]??Infinity))>1e-5))app.renderNextFrame=true;lastRender=current;
 }
 app.on('update',update);update(0);
 return {...navigation,getPerspective:()=>perspective,isPhotoView:()=>Boolean(photo),
  setPerspective(mode){if(!['first','third'].includes(mode)||interactionLocked)return;perspective=mode;initialized=false;lastRender=[];navigation.stop();update(0);app.renderNextFrame=true;},
  setEnabled(value){externalEnabled=value;applyEnabled();},
  setMoveInput(x,z){if(externalEnabled&&!interactionLocked)navigation.setMoveInput(x,z);},
  setInteractionLocked(value){interactionLocked=value;applyEnabled();},
  setPhotoView(view){photo=view;initialized=false;lastRender=[];update(0);app.renderNextFrame=true;},
  reset(){navigation.reset();initialized=false;update(0);},destroy(){app.off('update',update);navigation.destroy();driver.destroy();}};
}
