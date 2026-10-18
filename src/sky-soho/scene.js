import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCampus } from './world.js';
import { CAMPUS_DISPLAY } from './model.js';
import { LabelLayout } from '../atlas/labels.js';
import { endIntro, introFrame, retargetIntro, startIntro } from '../atlas/intro.js';

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
    this.controls.addEventListener('start',()=>{this.cancelFlight();onInteract();});
    // 打开页面时先播一次开场全景，之后的视角切换走普通过渡
    this.introPending=!this.reducedMotion;
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
      const name=document.createElement('strong');name.textContent=marker.stop.name;label.append(name);
      marker.label=label;this.labelLayer.append(label);
    }
    this.labels=new LabelLayout();
    this.selectedId=null;this.highlightId=null;this.time=0;this.view='planet';
    this.routeOrder=this.campus.routes.map(r=>r.stopId);
    this.setRouteProgress(this.reducedMotion?1:0);
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
    offset.setLength(distance);this.travel(target.clone().add(offset),target);
  }
  cancelFlight(){if(this.flight?.intro)endIntro(this.container,this.controls,this.flight);this.flight=null;}
  /** 视角切换的统一入口：首次调用播放开场，开场期间只更新落点 */
  travel(position,target,duration){
    if(this.introPending){this.introPending=false;this.flight=startIntro(this.container,this.controls,position,target);return;}
    if(this.flight?.intro){retargetIntro(this.flight,this.controls,position,target);return;}
    this.flyTo(position,target,duration);
  }
  flyTo(position,target,duration=1000){this.cancelFlight();this.flight={from:this.camera.position.clone(),fromTarget:this.controls.target.clone(),position,target,start:performance.now(),duration:this.reducedMotion?0:duration};}
  select(stop){
    this.selectedId=stop?.id||null;
    for(const marker of this.campus.markers){const active=marker.stop.id===this.selectedId;marker.label.classList.toggle('selected',active);if(!this.namedLinks)marker.label.setAttribute('aria-pressed',String(active));marker.dot.scale.setScalar(active?1.6:1);}
    this.highlightRoute(this.selectedId);
  }
  /** 点亮通往某一站的那一段路线，其余变暗；id 为空时整条路线正常显示 */
  highlightRoute(id){
    this.highlightId=id||null;
    for(const route of this.campus.routes){
      const on=!this.highlightId||route.stopId===this.highlightId;
      for(const t of route.tubes){
        t.mesh.material.opacity=on?1:.22;t.mesh.material.emissiveIntensity=route.stopId===this.highlightId?1.15:on?.7:.1;
        t.ghost.material.opacity=on?.28:.06;
      }
    }
  }
  /** 0–1：按行程顺序把路线一笔画出来 */
  setRouteProgress(progress){
    const total=this.campus.routes.reduce((s,r)=>s+r.length,0);let left=progress*total;
    for(const route of this.campus.routes)for(const t of route.tubes){
      const part=Math.max(0,Math.min(1,left/t.length));left-=t.length;
      const count=part>=1?Infinity:Math.floor(t.indexCount*part/3)*3;
      t.mesh.geometry.setDrawRange(0,count);
    }
  }
  /** 开场镜头落定后开始描线，约 2.5 秒 */
  startRouteDraw(){if(this.reducedMotion){this.setRouteProgress(1);return;}this.drawing={start:performance.now(),duration:2500};}
  zoom(factor){this.cancelFlight();const offset=this.camera.position.clone().sub(this.controls.target);offset.setLength(Math.max(this.controls.minDistance,Math.min(this.controls.maxDistance,offset.length()*factor)));this.camera.position.copy(this.controls.target).add(offset);}
  orbitPOI(dt){if(!this.reducedMotion&&!this.flight){const offset=this.camera.position.clone().sub(this.controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),dt*.09);this.camera.position.copy(this.controls.target).add(offset);}}
  setLight(sunset){this.sun.color.set(sunset?'#ffab70':'#ffedd2');this.sun.intensity=sunset?4:3.3;this.sun.position.y=sunset?260:700;}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.labels?.invalidate();this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.view)this.overview(this.view);}
  render(dt){
    this.time+=dt;
    if(this.flight?.intro){if(introFrame(this.camera,this.controls,this.flight,performance.now())){this.cancelFlight();this.startRouteDraw();}}
    else if(this.flight){const f=this.flight,t=f.duration?Math.min(1,(performance.now()-f.start)/f.duration):1,e=t*t*(3-2*t);this.camera.position.lerpVectors(f.from,f.position,e);this.controls.target.lerpVectors(f.fromTarget,f.target,e);if(t===1)this.flight=null;}
    if(this.drawing){const t=Math.min(1,(performance.now()-this.drawing.start)/this.drawing.duration);this.setRouteProgress(1-(1-t)**2.2);if(t===1)this.drawing=null;}
    this.controls.update();this.renderer.render(this.scene,this.camera);
    const w=this.container.clientWidth,h=this.container.clientHeight;
    // 门牌按固定顺序排布；只有选中的门牌优先，悬停不改变顺序
    this.labels.update(this.campus.markers.map((marker,i)=>{
      const p=marker.position.clone().project(this.camera);
      const visible=p.z<1&&p.z>-1&&Math.abs(p.x)<1.05&&Math.abs(p.y)<1.05;
      return {key:marker.stop.id,el:marker.label,priority:i,anchor:visible?{x:(p.x+1)*w/2,y:(1-p.y)*h/2}:null};
    }),{width:w,height:h});
    this.canvas.dataset.view=this.view;this.canvas.dataset.poi=this.selectedId||'';
  }
  screenshot(){return this.canvas.toDataURL('image/png');}
}
