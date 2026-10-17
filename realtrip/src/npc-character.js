import {Entity,Color,Vec3,ShaderChunks} from 'playcanvas';

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
  const body=model.findByName('Body'),head=model.findByName('Head'),arm=model.findByName('ArmL'),armR=model.findByName('ArmR'),mouth=model.findByName('Mouth'),eyes=[model.findByName('EyeL'),model.findByName('EyeR')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed=0,near=false,speaking=false,thinking=false,waveUntil=0,yaw=config.rotation;
  function update(dt){
    if(document.hidden)return;
    elapsed+=Math.min(dt,.05);
    const camera=app.root.findComponents('camera')[0].entity,p=camera.getPosition();
    const target=Math.atan2(p.x-config.position[0],p.z-config.position[2])*180/Math.PI;
    if(near){const d=((target-yaw+540)%360)-180;yaw+=d*(1-Math.exp(-dt*3));root.setEulerAngles(0,yaw,0);}
    if(body)body.setLocalPosition(0,.16+(reduced.matches?0:Math.sin(elapsed*2)*.022),0);
    if(head)head.setLocalEulerAngles(reduced.matches?0:thinking?Math.sin(elapsed*2)*4:speaking?Math.sin(elapsed*3.2)*2:0,0,reduced.matches?0:2+Math.sin(elapsed*1.4)*2);
    if(arm)arm.setLocalEulerAngles(0,0,elapsed<waveUntil&&!reduced.matches?-135+Math.sin(elapsed*9)*16:-19.5);
    if(armR)armR.setLocalEulerAngles(speaking&&!reduced.matches?Math.sin(elapsed*2.8)*9:0,0,27+(speaking&&!reduced.matches?Math.sin(elapsed*3)*6:0));
    if(mouth)mouth.setLocalScale(1,speaking&&!reduced.matches ? .55+Math.abs(Math.sin(elapsed*12))*.85 : 1,1);
    const blink=elapsed%4.7,blinkScale=reduced.matches?1:blink<.18?Math.max(.06,Math.abs(blink-.09)/.09):1;
    for(const eye of eyes)eye?.setLocalScale(1,blinkScale,1);
    app.renderNextFrame=true;
  }
  app.on('update',update);
  return {root,anchor:new Vec3(...config.position).add(new Vec3(0,config.scale*2.65,0)),setNear(value){if(value&&!near)waveUntil=elapsed+2.6;near=value;},setSpeaking(value){speaking=value;},setThinking(value){thinking=value;},wave(){waveUntil=elapsed+2.6;},destroy(){app.off('update',update);root.destroy();lights.forEach(l=>l.destroy());app.assets.remove(asset);asset.unload();}};
}
