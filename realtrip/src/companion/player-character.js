import {Entity,Color,ShaderChunks,StandardMaterial,Texture,BLEND_NORMAL} from 'playcanvas';
import {playerPlacement,createPlayerMotion} from './player-motion.js';
import './player.css';

export async function initPlayer({viewer,navigation,surface,modelUrl,stop,companion}){
 const app=viewer.app;
 const asset=await new Promise((resolve,reject)=>app.assets.loadFromUrl(modelUrl,'container',(error,asset)=>error?reject(error):resolve(asset)));
 const root=new Entity('My third-person character'),model=asset.resource.instantiateRenderEntity();root.addChild(model);app.root.addChild(root);
 const materials=new Set();
 for(const render of model.findComponents('render'))for(const instance of render.meshInstances){instance.mask=4;instance.castShadow=false;materials.add(instance.material);}
 for(const material of materials){
  if(!material.useLighting){material.diffuse.set(0,0,0);material.useTonemap=false;}
  else if(material.emissive.r+material.emissive.g+material.emissive.b<.01)material.emissive.copy(material.diffuse).mulScalar(.28);
  for(const language of ['glsl','wgsl']){
   const chunk=ShaderChunks.get(app.graphicsDevice,language).get('endPS'),out=language==='glsl'?'gl_FragColor.rgb':'finalRgb',v=language==='glsl'?'vec3':'vec3f';
   material.getShaderChunks(language).set('endPS',chunk.replace(`gammaCorrectOutput(${out})`,`pow(max(${out}, ${v}(0.0)) + ${v}(0.0000001), ${v}(1.0 / 2.2))`));
  }
  material.update();
 }
 const lights=[];
 for(const [color,intensity,rotation] of [[[1,.94,.87],.9,[55,160,0]],[[.78,.87,1],.6,[35,0,0]]]){const light=new Entity('Avatar light');light.addComponent('light',{type:'directional',color:new Color(...color),intensity,castShadows:false,mask:4});light.setEulerAngles(...rotation);app.root.addChild(light);lights.push(light);}
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
 const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'rgba(0,0,0,.6)');gradient.addColorStop(1,'rgba(0,0,0,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);
 const shadowTexture=new Texture(app.graphicsDevice,{mipmaps:false});shadowTexture.setSource(shadowCanvas);
 const shadowMaterial=new StandardMaterial();shadowMaterial.useLighting=false;shadowMaterial.diffuse.set(0,0,0);shadowMaterial.emissive.set(0,0,0);shadowMaterial.opacityMap=shadowTexture;shadowMaterial.opacityMapChannel='a';shadowMaterial.blendType=BLEND_NORMAL;shadowMaterial.depthWrite=false;shadowMaterial.update();
 const shadow=new Entity('Soft foot contact');shadow.addComponent('render',{type:'plane',material:shadowMaterial,castShadows:false});shadow.setLocalScale(.65,1,.48);shadow.setLocalPosition(0,.006,0);root.addChild(shadow);
 const joints=Object.fromEntries(['Body','LegL','LegR','KneeL','KneeR','ArmL','ArmR','ElbowL','ElbowR','HandR'].map(n=>[n,model.findByName(n)]));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),motion=createPlayerMotion();
 const controls=document.createElement('div');controls.className='player-tools';controls.dataset.explorerUi='';
 controls.innerHTML='<button class="player-inspect" aria-label="看看我的人物模型"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="7" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></svg><span>看看自己</span></button><button class="player-wave" aria-label="向小蓝挥手打招呼">挥手</button>';
 const perspectiveButton=document.createElement('button');perspectiveButton.className='player-perspective';controls.prepend(perspectiveButton);
 const photoButton=document.createElement('button');photoButton.className='player-photo';photoButton.textContent='合照';photoButton.setAttribute('aria-label','和小蓝拍纪念合照');controls.append(photoButton);
 function syncPerspective(){const first=navigation.getPerspective()==='first';perspectiveButton.textContent=first?'第一人称':'第三人称';perspectiveButton.setAttribute('aria-label',first?'切换到第三人称视角':'切换到第一人称视角');perspectiveButton.title=first?'切换到第三人称':'切换到第一人称';}
 perspectiveButton.onclick=()=>{navigation.setPerspective(navigation.getPerspective()==='first'?'third':'first');syncPerspective();perspectiveButton.blur();};syncPerspective();
 photoButton.onclick=()=>{companion.npc?.perform('photo');photoButton.blur();};
 document.body.append(controls);
 const hint=document.createElement('p');hint.className='player-hint';hint.textContent='WASD / 摇杆移动 · 右上角切换视角 · 点麦克风叫小蓝过来';hint.setAttribute('role','status');document.body.append(hint);
 const hintTimer=setTimeout(()=>hint.remove(),11000);
 const dialog=document.getElementById('about'),closeButton=document.getElementById('close-about');dialog.classList.add('avatar-view');
 const panel=document.createElement('section');panel.className='avatar-panel';
 panel.innerHTML='<div class="avatar-heading"><small>YOUR AVATAR</small><h2>在这里，也做自己。</h2><p>眼镜、黑色印花 T 恤，还有左手的手表。</p></div><div class="avatar-canvas" aria-label="你的三维人物模型，拖动旋转"><p class="avatar-load" role="status">正在准备你的形象…</p></div><div class="avatar-view-controls"><button data-view="full" aria-pressed="true">全身</button><button data-view="back" aria-pressed="false">背面</button><button data-view="face" aria-pressed="false">看脸</button><button data-view="wave">挥挥手</button></div><p class="avatar-footnote">拖动旋转 · 双指缩放</p><button class="avatar-return">回到漫游</button>';
 dialog.append(panel);
 const viewContainer=panel.querySelector('.avatar-canvas'),wave=controls.querySelector('.player-wave');
 let preview=null,opening=0,disposed=false;
 async function openPreview(){
  if(dialog.open||companion.photoActive)return;document.dispatchEvent(new Event('explorer-menu-open'));stop();if(document.pointerLockElement)document.exitPointerLock();navigation.setEnabled(false);dialog.showModal();
  const run=++opening;viewContainer.replaceChildren();const loading=document.createElement('p');loading.className='avatar-load';loading.textContent='正在准备你的形象…';viewContainer.append(loading);
  try{
   const module=await import(/* @vite-ignore */ new URL(__PLAYER_PREVIEW_FILE__,new URL('.',location.href)).href);
   if(run!==opening||!dialog.open||disposed)return;
   const next=await module.createAvatarPreview(viewContainer,modelUrl,{reduced:reduced.matches});
   if(run!==opening||!dialog.open||disposed){next.destroy();return;}preview=next;loading.remove();
  }catch(error){if(run===opening&&dialog.open){loading.textContent='模型预览加载失败，请关闭后重试。';console.error(error);}}
 }
 controls.querySelector('.player-inspect').onclick=openPreview;
 panel.querySelector('.avatar-return').onclick=()=>dialog.close();
 closeButton.setAttribute('aria-label','关闭人物预览');
 panel.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{const view=button.dataset.view;if(view==='wave')preview?.wave();else{preview?.frame(view);panel.querySelectorAll('[aria-pressed]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}});
 function onClose(){opening++;preview?.destroy();preview=null;viewContainer.replaceChildren();panel.querySelectorAll('[aria-pressed]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='full')));navigation.setEnabled(true);controls.querySelector('.player-inspect').blur();}
 dialog.addEventListener('close',onClose);
 wave.onclick=()=>{const label=document.querySelector('.npc-world-label');if(label&&!label.disabled){const npcPosition=document.getElementById('npc-ui')?.dataset.npcPosition?.split(',').map(Number);if(npcPosition?.length===3){const p=navigation.getPose().position;bodyYaw=Math.atan2(npcPosition[0]-p[0],npcPosition[2]-p[2])*180/Math.PI;}motion.wave();label.click();}wave.blur();};
 let frameClock=0,lastPosition=null,bodyYaw=navigation.getPose().yaw+180,photoYaw=null;
 function update(dt){
  if(document.hidden)return;const pose=navigation.getPose(),placement=playerPlacement(pose,surface.eyeHeight);
  root.setPosition(...placement.position);
  if(lastPosition){const dx=pose.position[0]-lastPosition[0],dz=pose.position[2]-lastPosition[2];if(Math.hypot(dx,dz)>.0002&&Math.hypot(dx,dz)<.2){const desired=Math.atan2(dx,dz)*180/Math.PI;bodyYaw+=((desired-bodyYaw+540)%360-180)*(1-Math.exp(-Math.min(dt,.05)*14));}else if(Math.hypot(dx,dz)>=.2)bodyYaw=pose.yaw+180;}
  if(photoYaw!==null)bodyYaw=photoYaw;
  lastPosition=[...pose.position];root.setEulerAngles(0,bodyYaw,0);root.setLocalScale(placement.scale,placement.scale,placement.scale);root.enabled=navigation.getPerspective()!=='first'||navigation.isPhotoView();
  const grounded=surface.physics?.getState().grounded??true;shadow.enabled=grounded;
  const state=motion.update(dt,pose.position,{reduced:reduced.matches,grounded});
  if(photoYaw!==null)Object.assign(state,{armR:-42,elbowR:-82,rollR:-34,handR:12});
  for(const side of ['L','R']){joints['Leg'+side]?.setLocalEulerAngles(state['leg'+side],0,0);joints['Knee'+side]?.setLocalEulerAngles(state['knee'+side],0,0);joints['Arm'+side]?.setLocalEulerAngles(state['arm'+side],0,state['roll'+side]);joints['Elbow'+side]?.setLocalEulerAngles(state['elbow'+side],0,0);}
  joints.HandR?.setLocalEulerAngles(0,0,state.handR);joints.Body?.setLocalScale(1,state.breath,1);
  const npc=document.getElementById('npc-ui');wave.disabled=npc?.dataset.near!=='true'||Boolean(document.querySelector('.npc-world-label')?.disabled);
  photoButton.disabled=!companion.npc||npc?.dataset.callable!=='true';
  controls.hidden=companion.photoActive||Boolean(dialog.open)||npc?.dataset.keyboard==='true'||['listening','starting','transcribing','ending'].includes(npc?.dataset.phase);
  document.body.dataset.avatarReady='true';document.body.dataset.avatarMotion=state.waving?'waving':state.weight>.1?'walking':'idle';
  frameClock+=Math.min(dt,.05);if(!reduced.matches&&frameClock>=1/30){app.renderNextFrame=true;frameClock=0;}
 }
 app.on('update',update);update(0);app.renderNextFrame=true;
 function destroy(){if(disposed)return;disposed=true;opening++;clearTimeout(hintTimer);app.off('update',update);preview?.destroy();dialog.removeEventListener('close',onClose);controls.remove();hint.remove();panel.remove();root.destroy();shadowMaterial.destroy();shadowTexture.destroy();lights.forEach(l=>l.destroy());app.assets.remove(asset);asset.unload();}
 window.addEventListener('pagehide',event=>{if(!event.persisted)destroy();else if(dialog.open)dialog.close();});
 return {destroy,wave:()=>motion.wave(),setPhotoPose(yaw){photoYaw=yaw;app.renderNextFrame=true;}};
}
