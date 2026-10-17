import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCampus } from './world.js';
import { CAMPUS_DISPLAY } from './model.js';
import { placeLabel } from './experience.js';

export class SkySohoScene {
  constructor(container, model, {onSelect,onInteract,markerHref}) {
    this.container=container;this.model=model;this.onSelect=onSelect;
    this.namedLinks=Boolean(markerHref);
    this.reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
    this.scene=new THREE.Scene();
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:760px)').matches?1.4:1.8));
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.canvas=this.renderer.domElement;this.canvas.tabIndex=0;
    this.canvas.setAttribute('aria-label','凌空星球沙盘。拖动旋转，双指或滚轮缩放；点击景点查看行程。');container.append(this.canvas);
    this.camera=new THREE.PerspectiveCamera(38,1,1,5000);this.camera.position.set(700,700,900);
    this.controls=new OrbitControls(this.camera,this.canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.07;
    this.controls.enablePan=false;this.controls.minPolarAngle=.05;this.controls.maxPolarAngle=Math.PI*.47;
    this.controls.minDistance=650;this.controls.maxDistance=2500;this.controls.target.set(10,-30,-65);
    this.controls.addEventListener('start',()=>{this.flight=null;onInteract();});
    this.scene.add(new THREE.HemisphereLight('#c6eef5','#223f38',2.5));
    this.sun=new THREE.DirectionalLight('#ffedd2',3.3);this.sun.position.set(-350,700,450);this.sun.castShadow=true;
    Object.assign(this.sun.shadow.camera,{left:-450,right:450,top:450,bottom:-450,near:1,far:1600});
    this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.bias=-.0002;this.sun.shadow.normalBias=.6;this.scene.add(this.sun);
    const rim=new THREE.DirectionalLight('#66ccde',2);rim.position.set(400,200,-450);this.scene.add(rim);
    this.campus=createCampus(model);this.scene.add(this.campus.root);
    this.labelLayer=document.createElement('div');this.labelLayer.className='map-labels';container.append(this.labelLayer);
    for(const marker of this.campus.markers){
      const label=document.createElement(markerHref?'a':'button');label.className='map-pin';
      if(markerHref){label.href=markerHref(marker.stop);label.setAttribute('aria-label',`进入${marker.stop.name}实景探索`);}
      else{label.type='button';label.setAttribute('aria-label',`查看${marker.stop.name}`);label.addEventListener('click',()=>onSelect(marker.stop));}
      const number=document.createElement('span');number.textContent=String(marker.stop.index+1).padStart(2,'0');
      const name=document.createElement('strong');name.textContent=marker.stop.name;label.append(number,name);
      marker.label=label;this.labelLayer.append(label);
    }
    this.selectedId=null;this.time=0;this.view='planet';
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
    this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.onContextLost?.();});
  }
  setDay(){}
  overview(mode='planet'){
    this.view=mode==='top'?'top':'planet';
    const half=this.camera.fov*Math.PI/360,limiting=Math.min(half,Math.atan(Math.tan(half)*this.camera.aspect));
    const distance=CAMPUS_DISPLAY.radius/Math.sin(limiting)*1.1;
    this.controls.maxDistance=Math.max(2500,distance*1.7);
    const target=new THREE.Vector3(10,-75,-65),offset=this.view==='top'?new THREE.Vector3(0,1,.002):new THREE.Vector3(620,670,920);
    offset.setLength(distance);this.flyTo(target.clone().add(offset),target);
  }
  flyTo(position,target,duration=1000){this.flight={from:this.camera.position.clone(),fromTarget:this.controls.target.clone(),position,target,start:performance.now(),duration:this.reducedMotion?0:duration};}
  select(stop){
    this.selectedId=stop?.id||null;
    for(const marker of this.campus.markers){const active=marker.stop.id===this.selectedId;marker.label.classList.toggle('selected',active);if(!this.namedLinks)marker.label.setAttribute('aria-pressed',String(active));marker.dot.scale.setScalar(active?1.6:1);}
    for(const route of this.campus.routes)route.group.traverse(mesh=>{if(mesh.material){mesh.material.color.set(route.stopId===this.selectedId?'#fff4bd':route.stopId==='sky-soho-return'?'#65d5d3':'#eab678');mesh.material.opacity=this.selectedId&&route.stopId!==this.selectedId?.45:1;mesh.material.transparent=true;}});
  }
  zoom(factor){this.flight=null;const offset=this.camera.position.clone().sub(this.controls.target);offset.setLength(Math.max(this.controls.minDistance,Math.min(this.controls.maxDistance,offset.length()*factor)));this.camera.position.copy(this.controls.target).add(offset);}
  orbitPOI(dt){if(!this.reducedMotion&&!this.flight){const offset=this.camera.position.clone().sub(this.controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),dt*.09);this.camera.position.copy(this.controls.target).add(offset);}}
  setLight(sunset){this.sun.color.set(sunset?'#ffab70':'#ffedd2');this.sun.intensity=sunset?4:3.3;this.sun.position.y=sunset?260:700;}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.view)this.overview(this.view);}
  render(dt){
    this.time+=dt;
    if(this.flight){const f=this.flight,t=f.duration?Math.min(1,(performance.now()-f.start)/f.duration):1,e=t*t*(3-2*t);this.camera.position.lerpVectors(f.from,f.position,e);this.controls.target.lerpVectors(f.fromTarget,f.target,e);if(t===1)this.flight=null;}
    this.controls.update();this.renderer.render(this.scene,this.camera);
    const w=this.container.clientWidth,h=this.container.clientHeight,placed=[];
    for(const marker of [...this.campus.markers].sort((a,b)=>(b.stop.id===this.selectedId)-(a.stop.id===this.selectedId))){
      const p=marker.position.clone().project(this.camera);let x=(p.x+1)*w/2,y=(1-p.y)*h/2;
      const visible=p.z<1&&p.z>-1&&Math.abs(p.x)<1&&Math.abs(p.y)<1;
      marker.label.hidden=!visible;if(!visible)continue;
      if(this.namedLinks){
        const box=placeLabel({x,y},{width:marker.label.offsetWidth,height:marker.label.offsetHeight},{width:w,height:h},placed);
        placed.push(box);marker.label.style.transform=`translate(${box.x}px,${box.y}px)`;continue;
      }
      let shift=0;while(placed.some(q=>Math.abs(q.x-x)<(q.selected||marker.stop.id===this.selectedId?78:31)&&Math.abs(q.y-y)<29)){shift++;x=(p.x+1)*w/2+(shift%2?1:-1)*Math.ceil(shift/2)*32;if(shift>5){y-=32;shift=0;}}
      placed.push({x,y,selected:marker.stop.id===this.selectedId});marker.label.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;
    }
    this.canvas.dataset.view=this.view;this.canvas.dataset.poi=this.selectedId||'';
  }
  screenshot(){return this.canvas.toDataURL('image/png');}
}
