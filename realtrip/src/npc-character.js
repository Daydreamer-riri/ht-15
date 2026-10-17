import {Entity,Color,Vec3,ShaderChunks} from 'playcanvas';
import {npcMotion,blendNpcMotion} from './npc-motion.js';

export async function createNpcCharacter(viewer,config,base){
  const app=viewer.app;
  const asset=await new Promise((resolve,reject)=>app.assets.loadFromUrl(base+config.modelUrl,'container',(error,asset)=>error?reject(error):resolve(asset)));
  const root=new Entity('Little Blue NPC');app.root.addChild(root);
  root.setPosition(...config.position);root.setLocalScale(config.scale,config.scale,config.scale);
  root.setEulerAngles(0,config.rotation,0);
  const model=asset.resource.instantiateRenderEntity();root.addChild(model);
  // Lights only affect the mascot. Captured splats and screens keep their appearance.
  const materials=new Set();
  for(const render of model.findComponents('render'))for(const instance of render.meshInstances){instance.mask=2;instance.castShadow=false;materials.add(instance.material);}
  for(const material of materials){
    // PlayCanvas still adds constant ambient to unlit glTF's white diffuse base.
    // Keep only its baked emissive color so skin and hair retain their palette.
    if(!material.useLighting){material.diffuse.set(0,0,0);material.useTonemap=false;}
    else if(material.emissive.r+material.emissive.g+material.emissive.b<.01)material.emissive.copy(material.diffuse).mulScalar(.24);
    // SuperSplat's CameraFrame writes gamma-space splats and skips final gamma.
    // Match its skybox correction for conventional mesh materials, on both GPUs.
    for(const language of ['glsl','wgsl']){
      const chunk=ShaderChunks.get(app.graphicsDevice,language).get('endPS');
      const output=language==='glsl'?'gl_FragColor.rgb':'finalRgb';
      const vector=language==='glsl'?'vec3':'vec3f';
      material.getShaderChunks(language).set('endPS',chunk.replace(`gammaCorrectOutput(${output})`,`pow(max(${output}, ${vector}(0.0)) + ${vector}(0.0000001), ${vector}(1.0 / 2.2))`));
    }
    material.update();
  }
  const lights=[];
  for(const [name,color,intensity,rotation] of [['NPC key',[1,.94,.88],.85,[65,180,0]],['NPC fill',[.8,.9,1],.4,[25,95,0]],['NPC rim',[.45,.8,1],.45,[35,0,0]]]){
    const light=new Entity(name);light.addComponent('light',{type:'directional',color:new Color(...color),intensity,castShadows:false,mask:2});light.setEulerAngles(...rotation);app.root.addChild(light);lights.push(light);
  }
  const body=model.findByName('Body'),head=model.findByName('Head'),arm=model.findByName('ArmL'),armR=model.findByName('ArmR'),mouth=model.findByName('Mouth'),eyes=[model.findByName('EyeL'),model.findByName('EyeR')],legs=[model.findByName('LegL'),model.findByName('LegR')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const anchor=new Vec3();
  let redrawClock=0;
  let elapsed=0,near=false,state='idle',waveUntil=0,yaw=config.rotation,pose=npcMotion(0,{reduced:true});
  function wave(){waveUntil=elapsed+3.1;}
  function update(dt){
    if(document.hidden)return;
    elapsed+=Math.min(dt,.05);
    const camera=app.root.findComponents('camera')[0].entity,p=camera.getPosition();
    const target=near?Math.atan2(p.x-config.position[0],p.z-config.position[2])*180/Math.PI:config.rotation;
    const oldYaw=yaw;
    const d=((target-yaw+540)%360)-180;yaw+=d*(reduced.matches?1:1-Math.exp(-dt*3));
    pose=blendNpcMotion(pose,npcMotion(elapsed,{state,greeting:Math.max(0,waveUntil-elapsed),near,reduced:reduced.matches}),dt,reduced.matches);
    root.setPosition(config.position[0],config.position[1]+pose.hover*config.scale,config.position[2]);root.setEulerAngles(0,yaw,pose.roll);
    if(body){body.setLocalPosition(0,pose.bodyY,0);body.setLocalEulerAngles(0,0,pose.bodyZ);}
    head?.setLocalEulerAngles(pose.headX,pose.headY,pose.headZ);
    arm?.setLocalEulerAngles(pose.armLX,0,pose.armLZ);armR?.setLocalEulerAngles(pose.armRX,0,pose.armRZ);
    legs[0]?.setLocalEulerAngles(0,0,pose.legLZ);legs[1]?.setLocalEulerAngles(0,0,pose.legRZ);
    mouth?.setLocalScale(1,pose.mouth,1);
    // Eyelids must close fast enough to be perceived as a blink, not a squint.
    const blink=npcMotion(elapsed,{reduced:reduced.matches}).eyes;
    for(const eye of eyes)eye?.setLocalScale(1,blink,1);
    anchor.copy(root.getPosition());anchor.y+=config.scale*2.65;
    // Idle avatar motion needs at most 30 redraws/s. Walking still requests its
    // own frames; reduced-motion mode does not continuously redraw the venue.
    redrawClock+=Math.min(dt,.05);
    if((!reduced.matches&&redrawClock>=1/30)||Math.abs(yaw-oldYaw)>.01){app.renderNextFrame=true;redrawClock=0;}
  }
  const onReducedChange=()=>{app.renderNextFrame=true;};reduced.addEventListener('change',onReducedChange);
  update(0);app.renderNextFrame=true;app.on('update',update);
  return {root,anchor,setNear(value){near=value;},setState(value){state=value;},wave,destroy(){reduced.removeEventListener('change',onReducedChange);app.off('update',update);root.destroy();lights.forEach(l=>l.destroy());app.assets.remove(asset);asset.unload();}};
}
