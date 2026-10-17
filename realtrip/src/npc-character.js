import {Entity,Color,Vec3} from 'playcanvas';

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
  for(const material of materials){if(material.emissive.r+material.emissive.g+material.emissive.b<.01){material.emissive.copy(material.diffuse).mulScalar(.4);material.update();}}
  const lights=[];
  for(const [name,color,intensity,rotation] of [['NPC key',[1,.94,.88],1.1,[65,180,0]],['NPC fill',[.8,.9,1],.65,[25,95,0]],['NPC rim',[.45,.8,1],.8,[35,0,0]]]){
    const light=new Entity(name);light.addComponent('light',{type:'directional',color:new Color(...color),intensity,castShadows:false,mask:2});light.setEulerAngles(...rotation);app.root.addChild(light);lights.push(light);
  }
  const body=model.findByName('Body'),head=model.findByName('Head'),arm=model.findByName('ArmL'),mouth=model.findByName('Mouth');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed=0,near=false,speaking=false,thinking=false,waveUntil=0,yaw=config.rotation;
  function update(dt){
    if(document.hidden)return;
    elapsed+=Math.min(dt,.05);
    const camera=app.root.findComponents('camera')[0].entity,p=camera.getPosition();
    const target=Math.atan2(p.x-config.position[0],p.z-config.position[2])*180/Math.PI;
    if(near){const d=((target-yaw+540)%360)-180;yaw+=d*(1-Math.exp(-dt*3));root.setEulerAngles(0,yaw,0);}
    if(body)body.setLocalPosition(0,.16+(reduced.matches?0:Math.sin(elapsed*2)*.022),0);
    if(head)head.setLocalEulerAngles(thinking?Math.sin(elapsed*2)*4:0,0,reduced.matches?0:Math.sin(elapsed*1.4)*2);
    if(arm)arm.setLocalEulerAngles(0,0,elapsed<waveUntil&&!reduced.matches?-135+Math.sin(elapsed*9)*16:-19.5);
    if(mouth)mouth.setLocalScale(1,speaking&&!reduced.matches ? .65+Math.abs(Math.sin(elapsed*14))*1.6 : 1,1);
    app.renderNextFrame=true;
  }
  app.on('update',update);
  return {root,anchor:new Vec3(...config.position).add(new Vec3(0,config.scale*2.65,0)),setNear(value){if(value&&!near)waveUntil=elapsed+2.6;near=value;},setSpeaking(value){speaking=value;},setThinking(value){thinking=value;},wave(){waveUntil=elapsed+2.6;},destroy(){app.off('update',update);root.destroy();lights.forEach(l=>l.destroy());app.assets.remove(asset);asset.unload();}};
}
