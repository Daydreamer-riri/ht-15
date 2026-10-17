import {Entity,Color,Vec3,ShaderChunks} from 'playcanvas';
import {npcMotion,blendNpcMotion} from './npc-motion.js';
import {createNpcRoaming} from './npc-roaming.js';

export async function createNpcCharacter(viewer,config,base,space){
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
  let redrawClock=0,engaged=false,reactionUntil=0;
  const roaming=createNpcRoaming({...config,canOccupy:space?.canOccupy});
  const obstacle=space?.obstacles[0];
  let location=[...config.position],moving=false;
  let elapsed=0,near=false,state='idle',waveUntil=0,yaw=config.rotation,pose=npcMotion(0,{reduced:true});
  function wave(){waveUntil=elapsed+3.1;roaming.hold(3.6);}
  function react(){reactionUntil=elapsed+1.25;roaming.hold(4);}
  function update(dt){
    if(document.hidden)return;
    elapsed+=Math.min(dt,.05);
    const camera=app.root.findComponents('camera')[0].entity,p=camera.getPosition();
    const oldYaw=yaw;
    const menuOpen=document.querySelector('.scene-trigger')?.getAttribute('aria-expanded')==='true';
    const journey=roaming.update(dt,{player:[p.x,p.y,p.z],busy:engaged||state!=='idle'||menuOpen||Boolean(document.getElementById('about')?.open),near,reduced:reduced.matches});
    location=journey.position;yaw=journey.yaw;moving=journey.moving;
    pose=blendNpcMotion(pose,npcMotion(elapsed,{state,greeting:Math.max(0,waveUntil-elapsed),reaction:Math.max(0,reactionUntil-elapsed),speed:journey.speed,turn:journey.turn,near,reduced:reduced.matches}),dt,reduced.matches);
    root.setPosition(location[0],location[1]+pose.hover*config.scale,location[2]);root.setEulerAngles(0,yaw,pose.roll);
    if(obstacle){obstacle.x=location[0];obstacle.z=location[2];obstacle.bottom=location[1]-.04;obstacle.top=location[1]+.87;}
    if(body){body.setLocalPosition(0,pose.bodyY,0);body.setLocalEulerAngles(pose.bodyX,0,pose.bodyZ);}
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
  return {root,anchor,get position(){return [...location];},get moving(){return moving;},setEngaged(value){engaged=value;},react,setNear(value){near=value;},setState(value){state=value;},wave,destroy(){reduced.removeEventListener('change',onReducedChange);app.off('update',update);root.destroy();lights.forEach(l=>l.destroy());app.assets.remove(asset);asset.unload();}};
}
