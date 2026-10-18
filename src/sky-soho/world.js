import * as THREE from 'three';
import { samplePath, clipPathToCampus, CAMPUS_DISPLAY } from './model.js';

const C = { stone: '#e8e4da', concrete: '#b1d0c7', white: '#e2e6e1', glass: '#285669', ink: '#293f43', green: '#647c5b', coral: '#db614d', gold: '#c99459' };
const standard = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .7, ...options });
export function box(parent, w, h, d, x, y, z, material, radius = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof material === 'string' ? standard(material) : material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent, radius, height, x, y, z, color, sides = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, sides), standard(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function sphere(parent, radius, x, y, z, color, scale = [1,1,1]) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), standard(color)); mesh.position.set(x,y,z); mesh.scale.set(...scale);mesh.castShadow=true;parent.add(mesh);return mesh;
}
export function label(parent, text, x, y, z, width = 10, color = C.ink, background = '#f1eee5') {
  const canvas = document.createElement('canvas'); canvas.width=768;canvas.height=192;
  const context=canvas.getContext('2d');context.fillStyle=background;context.fillRect(0,0,768,192);
  context.font='500 78px "PingFang SC", sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillStyle=color;context.fillText(text,384,100,720);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function line(parent, points, color, opacity = 1) {
  const geo=new THREE.BufferGeometry().setFromPoints(points);const mesh=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(mesh);return mesh;
}
function planter(parent,x,z,size=1) {
  cylinder(parent,.36*size,.6*size,x,.3*size,z,'#bdad94');
  cylinder(parent,.045*size,1.3*size,x,1.1*size,z,'#776347');
  for(let i=0;i<5;i++)sphere(parent,.45*size,x+Math.cos(i*2.4)*.22*size,(1.3+i*.1)*size,z+Math.sin(i*2.4)*.22*size,'#6a845b',[.6,1,.8]);
}
function tree(parent,x,z,scale=1) {
  cylinder(parent,.16*scale,3.6*scale,x,1.8*scale,z,'#827562');
  for(let i=0;i<4;i++)sphere(parent,1.6*scale,x+Math.cos(i*2.4)*.65*scale,(4+i*.25)*scale,z+Math.sin(i*2.4)*.65*scale,i%2?'#7a915e':'#607f61',[1,.9,1]);
}
function capsulePoint(t,width,length) {
  if(t===1)t=0;
  const radius=width/2,half=length/2-radius;
  if(t<.25){const a=t*4*Math.PI/2;return {x:Math.cos(a)*radius,z:half+Math.sin(a)*radius};}
  if(t<.5){const a=Math.PI/2+(t-.25)*4*Math.PI/2;return {x:Math.cos(a)*radius,z:half+Math.sin(a)*radius};}
  if(t<.75){const a=Math.PI+(t-.5)*4*Math.PI/2;return {x:Math.cos(a)*radius,z:-half+Math.sin(a)*radius};}
  const a=Math.PI*1.5+(t-.75)*4*Math.PI/2;return {x:Math.cos(a)*radius,z:-half+Math.sin(a)*radius};
}
// Flowing bands and glazed courtyards evoke the campus, without claiming measured architecture.
function ribbonBuilding(parent,x,z,width,length,height,angle=0) {
  const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;parent.add(group);
  const segments=100,floors=Math.round(height/4),glass=standard(C.glass,{metalness:.45,roughness:.24}),band=standard('#dceee6',{metalness:.35,roughness:.32});
  const ring=(y,w)=>Array.from({length:segments+1},(_,i)=>{const p=capsulePoint(i/segments,w,length*(.94+.06*Math.sin(y/height*Math.PI)));return new THREE.Vector3(p.x+Math.sin(p.z/length*4+y/height)*3,y,p.z);});
  function skin(low,high,wLow,wHigh,material) {
    const a=ring(low,wLow),b=ring(high,wHigh),vertices=[],indices=[];
    for(let i=0;i<=segments;i++)vertices.push(...a[i].toArray(),...b[i].toArray());
    for(let i=0;i<segments;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  const mullions=[];
  for(let f=0;f<floors;f++){
    const y=8+f*4,w=width*(1-.14*f/floors);
    skin(y,y+3.6,w,w-.4,glass);skin(y+3.6,y+4,w+1,w+.6,band);
    // Vertical mullions continue over each floor and give the glass a readable scale.
    const points=ring(y,w+.15),top=ring(y+3.6,w-.25);
    for(let k=0;k<segments;k+=2)mullions.push(points[k],top[k]);
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(mullions),new THREE.LineBasicMaterial({color:'#b2c5c3',transparent:true,opacity:.65})));
  const roofY=8+floors*4,outline=ring(roofY,width*.86);
  const shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(p.x,-p.z)));
  const roof=new THREE.Mesh(new THREE.ShapeGeometry(shape),standard('#b6d4ba'));roof.rotation.x=-Math.PI/2;roof.position.y=roofY;roof.receiveShadow=true;group.add(roof);
  for(let p=-length*.35;p<length*.4;p+=24){cylinder(group,1.1,8,-width*.25,4,p,C.concrete);cylinder(group,1.1,8,width*.25,4,p,C.concrete);}
  return group;
}
function skybridge(parent,a,b,y,width=8) {
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),g=new THREE.Group();g.position.set((a.x+b.x)/2,y,(a.z+b.z)/2);g.rotation.y=Math.atan2(dx,dz);parent.add(g);
  box(g,width,.8,length,0,0,0,'#e5e8e4');box(g,width,.5,length,0,4.8,0,'#e5e8e4');
  for(const side of [-1,1])box(g,.2,4.3,length,side*width/2,2.5,0,standard('#84aaac',{transparent:true,opacity:.35,depthWrite:false}));
}
export function pathRibbon(parent,path,color=C.coral,width=.65,y=.13,opacity=1) {
  const vertices=[],indices=[];
  const steps=Math.ceil(path.total/2);
  for(let i=0;i<=steps;i++){
    const d=i/steps*path.total,p=samplePath(path,d),a=samplePath(path,d-1),b=samplePath(path,d+1),length=Math.hypot(b.x-a.x,b.z-a.z)||1;
    for(const side of [-1,1])vertices.push(p.x+(b.z-a.z)/length*width*side,y,p.z-(b.x-a.x)/length*width*side);
    if(i<steps){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity===1}));parent.add(mesh);return mesh;
}
// 路线管线：一根实体管（会被楼体遮挡）+ 一根不做深度测试的半透明管（被遮住的部分也能看见）
const ROUTE = { gold: '#f2c566', glow: '#e9b44c', back: '#9fb4af', radius: 2.2, lift: 4 };
function routeTube(path, isReturn) {
  if (path.total < 1) return null;
  const pts = [];
  const steps = Math.max(2, Math.ceil(path.total / 6));
  for (let i = 0; i <= steps; i++) { const p = samplePath(path, i / steps * path.total); pts.push(new THREE.Vector3(p.x, ROUTE.lift, p.z)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0);
  const geometry = new THREE.TubeGeometry(curve, Math.max(8, steps * 3), ROUTE.radius, 8, false);
  const color = isReturn ? ROUTE.back : ROUTE.gold;
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, emissive: isReturn ? '#5f7470' : ROUTE.glow, emissiveIntensity: .7, roughness: .45, transparent: true }));
  const ghost = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .28, depthTest: false, depthWrite: false }));
  ghost.renderOrder = 2;
  return { mesh, ghost, length: path.total, indexCount: geometry.index.count, isReturn };
}
export function createCampus(model) {
  const root = new THREE.Group(), buildings = new THREE.Group(), routes = [], markers = [];
  root.add(buildings);
  const { x: cx, z: cz, radius } = CAMPUS_DISPLAY;
  // A sculptural planet-shaped base. The flat upper surface preserves the route projection.
  const profile = [[0,-370],[90,-355],[200,-290],[290,-190],[335,-90],[radius,0]].map(p=>new THREE.Vector2(...p));
  const globe = new THREE.Mesh(new THREE.LatheGeometry(profile,96), standard('#326875',{roughness:.85,emissive:'#184451',emissiveIntensity:.4}));
  globe.position.set(cx,0,cz); globe.castShadow=true;globe.receiveShadow=true;root.add(globe);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(radius,96),standard('#789b83',{roughness:.94}));
  surface.rotation.x=-Math.PI/2;surface.position.set(cx,.05,cz);surface.receiveShadow=true;root.add(surface);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius,.8,6,160),new THREE.MeshBasicMaterial({color:'#a0e5cf'}));
  rim.rotation.x=Math.PI/2;rim.position.set(cx,.6,cz);root.add(rim);
  // Pavement and lawns, bounded by the miniature campus.
  box(root,485,.4,305,20,.3,-75,'#c2cfb8');
  for(let i=0;i<5;i++)box(root,22,.6,245,-218+i*111,.7,-75,i%2?'#729a7c':'#668f77');
  for(let x=-240;x<265;x+=22)line(root,[new THREE.Vector3(x,.6,-220),new THREE.Vector3(x,.6,76)],'#9daf9c',.42);
  for(let z=-220;z<80;z+=22)line(root,[new THREE.Vector3(-240,.6,z),new THREE.Vector3(265,.6,z)],'#9daf9c',.42);
  ribbonBuilding(buildings,-43,-57,70,175,42,-.05);
  ribbonBuilding(buildings,84,-112,56,236,54,-.12);
  ribbonBuilding(buildings,-166,-100,55,250,66,-.12);
  ribbonBuilding(buildings,220,-130,56,240,70,-.14);
  skybridge(buildings,{x:-43,z:-85},{x:84,z:-112},31,10);
  skybridge(buildings,{x:84,z:-30},{x:220,z:-60},24,10);
  skybridge(buildings,{x:-166,z:-158},{x:-43,z:-145},38,9);
  // Twin reflecting pools and a low plaza retain the architectural silhouette.
  box(root,170,.7,36,20,.8,113,'#a8c8bc');
  box(root,164,.8,30,20,1,113,standard('#299ba9',{metalness:.45,roughness:.22}));
  for(let x=-50;x<100;x+=14)box(root,.4,.05,27,x,1.45,113,'#70c1ba');
  box(root,92,.7,20,150,.8,-265,'#388e9d');
  for(let i=0;i<12;i++){
    const x=-240+i*43;tree(root,x,156,2.1);box(root,9,.5,5,x,.65,156,'#557e66');
    if(i%2===0)box(root,10,1.5,3,x,1.2,142,'#ddbf91');
  }
  for(let i=0;i<46;i++){
    const a=i/46*Math.PI*2,r=280+(i%4)*9,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
    if(x>265||x<-240||z<-250||z>180)tree(root,x,z,1.9+(i%3)*.25);
  }
  // A compact ring road sits inside the perimeter; the itinerary itself is never re-routed.
  const ringPoints=Array.from({length:129},(_,i)=>new THREE.Vector3(cx+Math.cos(i/128*Math.PI*2)*324,1,cz+Math.sin(i/128*Math.PI*2)*324));
  const ringRoad = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ringPoints),128,3,5,false),standard('#658278'));
  root.add(ringRoad);
  // 原行程的步行路线：每一段是一根发光管线，裁到星球表面以内；返程用暗一档的颜色
  for(const chapter of model.chapters){
    const group=new THREE.Group();root.add(group);
    const tubes=[];
    for(const path of clipPathToCampus(chapter.path)){const tube=routeTube(path,chapter.stop.id==='sky-soho-return');if(tube){group.add(tube.mesh,tube.ghost);tubes.push(tube);}}
    routes.push({stopId:chapter.stop.id,group,tubes,length:tubes.reduce((s,t)=>s+t.length,0)});
  }
  for(const stop of model.stops){
    const anchor=new THREE.Vector3(stop.point.x,78,stop.point.z);
    const stem=line(root,[new THREE.Vector3(stop.point.x,3,stop.point.z),anchor],'#f7d7a3',.65);
    const dot=new THREE.Mesh(new THREE.SphereGeometry(2.4,12,8),new THREE.MeshBasicMaterial({color:'#ffe8bb'}));dot.position.copy(anchor);root.add(dot);
    markers.push({stop,position:anchor,stem,dot});
  }
  // A small directional gate marks the original route as it leaves the model boundary.
  const gate = new THREE.Group();root.add(gate);
  const boundary=clipPathToCampus(model.chapters[0].path)[0]?.points[0];
  if(boundary){
    box(gate,17,1.4,10,boundary.x,1.8,boundary.z,'#e7d6b0');
    cylinder(gate,.6,22,boundary.x,11,boundary.z,'#b7dbce');
    const board=label(gate,'淞虹路地铁站',boundary.x,24,boundary.z,30,'#e8eee6','#14303a');board.rotation.y=-.4;
  }
  const orbit=new THREE.Group();orbit.position.set(cx,-75,cz);root.add(orbit);
  for(const [r,tilt,alpha] of [[406,.14,.16]]){
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,.45,4,160),new THREE.MeshBasicMaterial({color:'#a9c6bd',transparent:true,opacity:alpha}));mesh.rotation.set(Math.PI/2+tilt,0,.13);orbit.add(mesh);
  }
  return { root, markers, routes, buildings, orbit };
}
