import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';

// Reproducible, articulated mesh interpretation of the left mascot in the supplied
// poster. All geometry is local; no image-to-3D service or runtime CDN is required.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); }); }
};
const root = new THREE.Group(); root.name='BlueMascot';
const material = (color, extra={}) => new THREE.MeshStandardMaterial({color, roughness:.86, metalness:0, ...extra});
const m={skin:material('#ffd6b9'),inner:material('#ee9e94'),hair:material('#38232e'),hairLight:material('#533441'),white:material('#f3f8ff'),blue:material('#168aff'),navy:material('#162342'),sole:material('#b4d3ec'),cyan:material('#61ecff',{emissive:'#18bcff',emissiveIntensity:.5}),eye:material('#faffff'),iris:material('#118fe3'),pupil:material('#14385e'),mouth:material('#8c2748'),tongue:material('#ff738f'),glass:material('#5bd7fa',{transparent:true,opacity:.19,depthWrite:false,roughness:.12})};
function group(name,parent=root,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
function mesh(name,geo,mat,pos,scale=[1,1,1],parent=root){const o=new THREE.Mesh(geo,mat);o.name=name;o.position.set(...pos);o.scale.set(...scale);parent.add(o);return o;}
const sphere=new THREE.SphereGeometry(1,40,28);
function ball(name,mat,pos,scale,parent=root){return mesh(name,sphere,mat,pos,scale,parent);}
function box(name,mat,pos,scale,parent=root,r=.12){return mesh(name,new RoundedBoxGeometry(1,1,1,3,r),mat,pos,scale,parent);}
function line(name,points,r,mat,parent=root){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(name,new THREE.TubeGeometry(curve,Math.max(12,points.length*6),r,7,false),mat,[0,0,0],[1,1,1],parent);}
function patch(name,points,mat,depth=.025,parent=root){const s=new THREE.Shape();s.moveTo(...points[0]);points.slice(1).forEach(p=>s.lineTo(...p));s.closePath();return mesh(name,new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,steps:1}),mat,[0,0,0],[1,1,1],parent);}
const board=group('Hoverboard',root,[0,.09,0]);
ball('Board dark underside',m.navy,[0,0,0],[.85,.075,.43],board);
ball('Board luminous rim',m.cyan,[0,.035,0],[.86,.032,.44],board);
ball('Board blue deck',m.blue,[0,.06,0],[.81,.035,.4],board);
for(const x of [-.53,.53])ball('Hover engine',m.cyan,[x,-.04,0],[.15,.025,.22],board);
const body=group('Body',root,[0,.16,0]);
for(const side of [-1,1]){
 const leg=group(side<0?'LegL':'LegR',body,[side*.205,.4,0]);leg.rotation.z=-side*.1;
 ball('Cargo trousers',m.navy,[0,.01,0],[.185,.35,.205],leg);
 box('Blue cargo pocket',m.blue,[side*.13,.1,.09],[.1,.17,.2],leg);
 box('Pocket highlight',m.cyan,[side*.172,.12,.12],[.012,.07,.1],leg);
 ball('White sneaker',m.white,[0,-.23,.11],[.215,.16,.34],leg);
 ball('Sole',m.sole,[0,-.33,.13],[.22,.06,.34],leg);
 ball('Blue heel',m.blue,[0,-.23,-.09],[.21,.115,.13],leg);
 for(let i=0;i<3;i++)box('Navy laces',m.navy,[0,-.13+i*.034,.43-i*.035],[.23,.035,.035],leg);
}
ball('Dark hoodie',m.navy,[0,.94,0],[.29,.42,.22],body);
ball('Hood',m.white,[0,1.17,-.12],[.36,.25,.24],body);
for(const side of [-1,1]){
 const coat=ball('Jacket panel',m.white,[side*.205,.94,.025],[.17,.35,.235],body);coat.rotation.z=-side*.16;
 line('Blue zipper piping',[[side*.09,1.18,.22],[side*.10,.92,.25],[side*.20,.63,.22]],.018,m.blue,body);
 const arm=group(side<0?'ArmL':'ArmR',body,[side*.33,1.14,0]);arm.rotation.z=side*.34;
 ball('Sleeve',m.white,[side*.05,-.19,0],[.15,.28,.15],arm);
 ball('Blue wrist cuff',m.blue,[side*.085,-.4,.02],[.135,.075,.135],arm);
 const hand=group('Hand',arm,[side*.09,-.51,.025]);
 ball('Palm',m.skin,[0,0,0],[.13,.14,.085],hand);
 for(let j=0;j<4;j++)ball('Finger',m.skin,[(j-1.5)*.055,-.1-Math.sin(j/3*Math.PI)*.025,.012],[.032,.09,.034],hand);
 const thumb=ball('Thumb',m.skin,[-side*.12,-.015,.035],[.05,.09,.05],hand);thumb.rotation.z=side*.55;
 box('Shoulder badge',m.blue,[side*.15,-.1,.13],[.13,.15,.04],arm);
 box('Badge light',m.cyan,[side*.15,-.1,.155],[.065,.08,.014],arm);
}
line('Code left',[[ -.075,1.03,.264],[-.13,.97,.27],[-.075,.91,.264]],.014,m.cyan,body);
line('Code slash',[[.02,1.035,.27],[-.015,.905,.27]],.014,m.cyan,body);
line('Code right',[[.075,1.03,.264],[.13,.97,.27],[.075,.91,.264]],.014,m.cyan,body);
// Soft illustrated complexion and hair shading are baked into the mesh. This
// keeps the facial features readable under a scanned room's unrelated lighting.
const flat=(color,extra={})=>new THREE.MeshBasicMaterial({color,...extra});
const facial={skin:flat('#ffe1c9'),ear:flat('#f5b2a7'),earLine:flat('#dc9086'),white:flat('#fffdf7'),ink:flat('#194b7c'),blue:flat('#177ee0'),nose:flat('#e95b76'),mouth:flat('#bd315e'),tongue:flat('#ff8a9e'),shine:flat('#ffffff'),glass:flat('#a7f5ff',{transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide})};
function bakedGeometry(geometry,color,amount=.16){
 const g=geometry.clone();g.computeVertexNormals();const base=new THREE.Color(color),colors=[],normal=new THREE.Vector3(),light=new THREE.Vector3(-.45,.65,.85).normalize();
 for(let i=0;i<g.attributes.position.count;i++){normal.fromBufferAttribute(g.attributes.normal,i);const shade=1-amount+amount*Math.max(0,normal.dot(light));colors.push(base.r*shade,base.g*shade,base.b*shade);}
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
}
const vertexMat=flat('#ffffff',{vertexColors:true});
const head=group('Head',body,[0,1.6,.015]);
function faceZ(x,y){return .055+.435*Math.pow(Math.max(.012,1-(x/.565)**2-(y/.49)**2),.34);}
const faceGeo=new THREE.SphereGeometry(1,64,48);
const fp=faceGeo.attributes.position;
for(let i=0;i<fp.count;i++){
 const nx=fp.getX(i),ny=fp.getY(i),nz=fp.getZ(i),jaw=ny<-.25?1-.12*((-ny-.25)/.75):1;
 const x=nx*.565*jaw,y=ny*.49;
 fp.setXYZ(i,x,y,nz>=0?faceZ(x,y):.055+nz*.395);
}
faceGeo.computeVertexNormals();
mesh('Soft sculpted face',bakedGeometry(faceGeo,'#ffe2cb',.13),vertexMat,[0,0,0],[1,1,1],head);
ball('Hair back',flat('#48303b'),[0,.12,-.15],[.605,.55,.39],head);
// Smooth front-facing patches conform to the cheek instead of floating eyeballs.
function surface(name,shape,mat,parent=head,cx=0,cy=0,offset=.012){
 let g=new THREE.ShapeGeometry(shape,32).toNonIndexed();
 for(let pass=0;pass<2;pass++){
  const a=g.attributes.position.array,v=[];
  for(let i=0;i<a.length;i+=9){const p=Array.from(a.slice(i,i+3)),q=Array.from(a.slice(i+3,i+6)),r=Array.from(a.slice(i+6,i+9));const mid=(a,b)=>a.map((x,k)=>(x+b[k])/2),pq=mid(p,q),qr=mid(q,r),rp=mid(r,p);v.push(...p,...pq,...rp,...pq,...q,...qr,...rp,...qr,...r,...pq,...qr,...rp);}
  g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
 }
 const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,faceZ(p.getX(i)+cx,p.getY(i)+cy)+offset);
 g.computeVertexNormals();const o=mesh(name,g,mat,[0,0,0],[1,1,1],parent);return o;
}
function ellipseShape(rx,ry){const s=new THREE.Shape();s.absellipse(0,0,rx,ry,0,Math.PI*2,false,0);return s;}
function curveShape(start,segments){const s=new THREE.Shape();s.moveTo(...start);for(const q of segments)s.bezierCurveTo(...q);s.closePath();return s;}
for(const side of [-1,1]){
 const ear=group('Ear',head,[side*.565,-.035,-.005]);ear.rotation.z=-side*.16;
 mesh('Soft outer ear',bakedGeometry(sphere,'#ffdac1',.1),vertexMat,[0,0,0],[.205,.247,.125],ear);
 ball('Ear blush',facial.ear,[side*.015,-.006,.109],[.131,.172,.019],ear);
 line('Delicate ear fold',[[side*.06,.1,.137],[-side*.015,.14,.138],[-side*.065,.07,.142],[-side*.02,-.09,.139]],.009,facial.earLine,ear);
 const cx=side*.238,cy=-.047,eye=group(side<0?'EyeL':'EyeR',head,[cx,cy,0]);
 const eyeShape=curveShape([-.172,.078],[[-.075,.16,.075,.164,.174,.11],[.165,-.01,.095,-.155,-.025,-.148],[-.13,-.145,-.18,-.06,-.172,.078]]);
 if(side<0){const transformed=new THREE.Shape();const pts=eyeShape.getPoints(48).reverse();transformed.moveTo(-pts[0].x,pts[0].y);for(const p of pts.slice(1))transformed.lineTo(-p.x,p.y);transformed.closePath();surface('Almond eye white',transformed,facial.white,eye,cx,cy);}
 else surface('Almond eye white',eyeShape,facial.white,eye,cx,cy);
 const iris=surface('Ocean blue iris',ellipseShape(.111,.131),flat('#ffffff',{vertexColors:true}),eye,cx,cy,.019);
 const pos=iris.geometry.attributes.position,colors=[],top=new THREE.Color('#1756b8'),bottom=new THREE.Color('#49dbef');
 for(let i=0;i<pos.count;i++){const t=THREE.MathUtils.clamp((.1-pos.getY(i))/.21,0,1),c=top.clone().lerp(bottom,t);colors.push(c.r,c.g,c.b);}
 iris.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 surface('Small blue pupil',ellipseShape(.045,.072),facial.ink,eye,cx,cy,.023);
 const star=new THREE.Shape();const coords=[[0,.083],[.021,.023],[.079,0],[.022,-.022],[0,-.078],[-.024,-.022],[-.08,0],[-.025,.024]];star.moveTo(...coords[0]);coords.slice(1).forEach(p=>star.lineTo(...p));star.closePath();
 const shine=surface('Four point eye star',star,facial.shine,eye,cx,cy,.03);shine.position.set(-side*.025,-.024,0);
 const dot=surface('Eye glint',ellipseShape(.024,.029),facial.shine,eye,cx,cy,.035);dot.position.set(side*.043,.069,0);
 const rim=[[-.178,.083],[-.08,.15],[.065,.158],[.177,.115]].map(([x,y])=>[cx+side*x,cy+y,faceZ(cx+side*x,cy+y)+.02]);
 line('Sapphire upper lashes',rim,.014,facial.ink,head);
 const brow=curveShape([-.085,.006],[[-.025,.047,.065,.039,.103,.014],[.058,.014,-.02,-.018,-.085,.006]]);
 const eyebrow=group('Eyebrow',head,[side*.235,.203,0]);eyebrow.rotation.z=side*.13;surface('Expressive brow',brow,facial.ink,eyebrow,side*.235,.203,.008);
 const blush=group('Cheek',head,[side*.38,-.211,0]);surface('Peach cheek',ellipseShape(.064,.02),flat('#f5b8b3'),blush,side*.38,-.211,.007);
}
const nose=group('Nose',head,[0,-.145,0]);
surface('Little coral nose',curveShape([-.044,.016],[[-.031,.043,.037,.042,.047,.014],[.027,-.018,.001,-.029,-.019,-.016],[-.033,-.006,-.045,.003,-.044,.016]]),facial.nose,nose,0,-.145,.024);
const ng=surface('Nose glint',ellipseShape(.012,.006),facial.white,nose,0,-.145,.03);ng.position.set(-.012,.02,0);
const mouth=group('Mouth',head,[0,-.29,0]);
surface('Happy smile',curveShape([-.117,.047],[[-.05,.004,.062,.002,.13,.063],[.141,-.008,.062,-.089,-.018,-.084],[-.071,-.077,-.114,-.025,-.117,.047]]),facial.mouth,mouth,0,-.29,.017);
const tongue=surface('Smile tongue',ellipseShape(.064,.026),facial.tongue,mouth,0,-.29,.025);tongue.position.set(-.005,-.052,0);
const tooth=curveShape([.059,.023],[[.077,.029,.095,.038,.105,.044],[.105,.001,.089,-.011,.072,.001],[.066,.007,.061,.016,.059,.023]]);
surface('Little smile fang',tooth,facial.white,mouth,0,-.29,.032);
// Swept volumetric locks: a continuous curved centerline and tapered cross-section,
// rather than intersecting shiny spheres or a flat polygon silhouette.
function lock(name,points,width,depth,color){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),vertices=[],indices=[],segments=40,sides=16;
 for(let i=0;i<=segments;i++){
  const t=i/segments,p=path.getPoint(t),tangent=path.getTangent(t).normalize(),across=new THREE.Vector3(-tangent.y,tangent.x,0).normalize();
  const taper=Math.max(.008,Math.pow(1-t,.6))*(.68+.52*Math.sin(Math.PI*t));
  for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,cos=Math.cos(a),sin=Math.sin(a);vertices.push(p.x+across.x*cos*width*taper,p.y+across.y*cos*width*taper,p.z+sin*depth*taper);if(i<segments&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
 return mesh(name,bakedGeometry(g,color,.4),vertexMat,[0,0,0],[1,1,1],head);
}
lock('Left rising wave',[[-.4,.19,-.06],[-.55,.4,-.04],[-.5,.61,-.06],[-.43,.72,-.09]],.19,.27,'#4b303b');
lock('High swept quiff',[[-.36,.3,0],[-.3,.53,-.005],[-.05,.68,-.02],[.07,.71,-.07]],.24,.29,'#523640');
lock('Right flowing crest',[[-.11,.34,-.02],[.1,.51,-.02],[.36,.6,-.06],[.5,.58,-.1]],.245,.3,'#51353f');
lock('Outer swept tip',[[.28,.25,-.06],[.51,.29,-.07],[.67,.39,-.08],[.7,.49,-.12]],.205,.26,'#4c313c');
lock('Side flick',[[.39,.04,-.11],[.54,.08,-.1],[.68,.15,-.1],[.72,.22,-.13]],.14,.2,'#49303a');
lock('Left temple',[[-.46,.32,.07],[-.51,.15,.08],[-.47,.035,.13],[-.46,-.04,.12]],.105,.14,'#50343e');
lock('Forehead curl',[[.015,.42,.34],[.095,.33,.46],[.065,.205,.505],[.14,.16,.51],[.218,.223,.48]],.105,.065,'#51343e');
// Fine cyan frame and small triangular temples leave the star eyes unobstructed.
const visor=new THREE.CylinderGeometry(.535,.535,.375,48,4,true,-1.07,2.14);
mesh('Clear visor',visor,facial.glass,[0,-.014,.025],[1.02,1,1],head);
for(const y of [-.202,.174]){
 const pts=Array.from({length:20},(_,i)=>{const a=-1.07+i/19*2.14;return [Math.sin(a)*.55,y,Math.cos(a)*.535+.027];});
 line('Fine cyan visor rim',pts,.006,flat('#9beaf2'),head);
}
for(const side of [-1,1]){
 const temple=patch('Triangular visor temple',[[side*.435,.17],[side*.548,.125],[side*.492,-.11]],flat('#197ac4'),.012,head);temple.position.z=.335;
 for(const [dx,dy] of [[0,0],[-.015,.019],[.015,.019],[-.015,-.015],[.015,-.015]])ball('Visor flower badge',flat('#bcf7ff'),[side*(.48+dx),.064+dy,.365],[.012,.012,.006],head);
}
// Relaxed, asymmetric pose and a subtle forward lean feel less like a rigid toy.
body.rotation.z=.025;
root.getObjectByName('ArmR').rotation.z=.48;
root.getObjectByName('LegL').rotation.z=.12;
root.userData={name:'小蓝',source:'User-supplied Hackathon poster, left character',technique:'Hand-authored articulated mesh; stylized interpretation, not a scan',forward:'+Z'};
root.traverse(object=>{const normals=object.geometry?.attributes.normal;if(!normals)return;const n=new THREE.Vector3();for(let i=0;i<normals.count;i++){n.fromBufferAttribute(normals,i);if(n.lengthSq()<1e-12)n.set(0,0,1);else n.normalize();normals.setXYZ(i,n.x,n.y,n.z);}});
const out=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
await mkdir('realtrip/public/npc',{recursive:true});
await writeFile('realtrip/public/npc/blue-mascot.glb',Buffer.from(out));
console.log(`Blue mascot GLB: ${(out.byteLength/1024).toFixed(0)} KiB`);
