import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createPlayerMotion} from './player-motion.js';

export async function createAvatarPreview(container,url,{reduced=false}={}){
 const model=(await new GLTFLoader().loadAsync(url)).scene;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.01,20);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 renderer.domElement.setAttribute('aria-label','你的三维模型');container.append(renderer.domElement);
 scene.add(model);scene.add(new THREE.HemisphereLight('#e9f6ff','#5c6c75',2));
 for(const [color,intensity,xyz] of [['#fff0db',2.2,[-2,3,4]],['#a1ccff',1.4,[2,2,-2]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...xyz);scene.add(light);}
 const disc=new THREE.Mesh(new THREE.CircleGeometry(.4,64),new THREE.MeshBasicMaterial({color:'#1e353e',transparent:true,opacity:.55,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.y=.005;scene.add(disc);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.39,.393,64),new THREE.MeshBasicMaterial({color:'#98d7da',transparent:true,opacity:.38,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.006;scene.add(ring);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=!reduced;controls.dampingFactor=.09;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.67;controls.minDistance=.42;controls.maxDistance=5;controls.rotateSpeed=.6;controls.zoomSpeed=.7;
 let mode='full';
 function frame(view){mode=view;const portrait=container.clientWidth/container.clientHeight<.8;if(view==='face'){controls.target.set(0,1.60,0);camera.position.set(.025,1.625,.72);controls.minDistance=.42;controls.maxDistance=1.3;}else{controls.target.set(0,.92,0);camera.position.set(view==='back'?0:.23,1.14,(view==='back'?-1:1)*(portrait?3.6:3.1));controls.minDistance=1.6;controls.maxDistance=5;}controls.update();}
 function resize(){const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();frame(mode);
 const motion=createPlayerMotion(),joints=Object.fromEntries(['ArmL','ArmR','ElbowL','ElbowR','HandR','Body'].map(n=>[n,model.getObjectByName(n)]));
 let last=0,handle,disposed=false;
 function tick(time){if(disposed)return;handle=requestAnimationFrame(tick);if(document.hidden)return;const dt=Math.min(.05,(time-last)/1000||0);last=time;const pose=motion.update(dt,[0,0,0],{reduced});for(const side of ['L','R']){joints['Arm'+side]?.rotation.set(THREE.MathUtils.degToRad(pose['arm'+side]),0,THREE.MathUtils.degToRad(pose['roll'+side]));joints['Elbow'+side]?.rotation.set(THREE.MathUtils.degToRad(pose['elbow'+side]),0,0);}joints.HandR.rotation.z=THREE.MathUtils.degToRad(pose.handR);joints.Body.scale.y=pose.breath;controls.update();renderer.render(scene,camera);}
 handle=requestAnimationFrame(tick);
 return {frame,wave:()=>motion.wave(),destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(handle);observer.disconnect();controls.dispose();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});const textures=new Set();materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);});textures.forEach(t=>{t.dispose();t.source?.data?.close?.();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
