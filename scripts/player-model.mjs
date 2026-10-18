import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Hand-modelled, stylized likeness from the two user-provided front photographs.
// Units are nominal metres; the walk entry scales to the venue's existing eye height.
export const PLAYER_EYE_HEIGHT=1.64;
export function createPlayerModel(){
 const root=new THREE.Group();root.name='PersonalAvatar';
 root.userData={description:'Stylized personal avatar: parted black hair, metal glasses, black printed tee and left wrist watch',eyeHeight:PLAYER_EYE_HEIGHT,version:2};
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.86,...extra});
 const m={shirt:mat('#111316'),seam:mat('#0d0f12'),fold:mat('#1c1f23'),pants:mat('#171c23'),pantFold:mat('#212730'),sole:mat('#323a45'),shoe:mat('#202732'),metal:mat('#9b9c92',{metalness:.64,roughness:.3}),black:mat('#11151b'),watch:mat('#26333e',{metalness:.25}),stitch:mat('#a6aab3'),eye:new THREE.MeshBasicMaterial({color:'#e6d9c8'}),iris:new THREE.MeshBasicMaterial({color:'#362d2b'}),pupil:new THREE.MeshBasicMaterial({color:'#151b22'}),lip:new THREE.MeshBasicMaterial({color:'#a66e60'}),brow:new THREE.MeshBasicMaterial({color:'#252931'}),skin:new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true}),hair:mat('#171d27',{roughness:.68}),hairRidge:mat('#29303b',{roughness:.73}),lens:new THREE.MeshStandardMaterial({color:'#cadce1',transparent:true,opacity:.045,depthWrite:false,roughness:.15,side:THREE.DoubleSide})};
 const sphere=new THREE.SphereGeometry(1,28,20);
 function group(name,parent=root,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
 function mesh(name,g,material,pos=[0,0,0],scale=[1,1,1],parent=root){const o=new THREE.Mesh(g,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);parent.add(o);return o;}
 function ball(name,material,pos,scale,parent=root){return mesh(name,sphere,material,pos,scale,parent);}
 function box(name,material,pos,scale,parent=root,r=.1){return mesh(name,new RoundedBoxGeometry(1,1,1,3,r),material,pos,scale,parent);}
 function line(name,points,r,material,parent=root,closed=false){return mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),Math.max(16,points.length*5),r,6,closed),material,[0,0,0],[1,1,1],parent);}
 function tint(g,color,shade=.15){g=g.clone();g.computeVertexNormals();const c=new THREE.Color(color),colors=[],v=new THREE.Vector3(),light=new THREE.Vector3(-.35,.6,.9).normalize();for(let i=0;i<g.attributes.normal.count;i++){v.fromBufferAttribute(g.attributes.normal,i);const a=1-shade+shade*Math.max(0,v.dot(light));colors.push(c.r*a,c.g*a,c.b*a);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;}
 function skin(name,pos,scale,parent=root,color='#d9ad91'){return mesh(name,tint(sphere,color),m.skin,pos,scale,parent);}
 const body=group('Body');
 // Softly tapered tee instead of a primitive sphere torso.
 function loft(name,rings,material,parent=body){const a=[],ids=[],n=40;for(const [y,rx,rz,z=0] of rings)for(let j=0;j<=n;j++){const theta=j/n*Math.PI*2;a.push(Math.cos(theta)*rx,y,Math.sin(theta)*rz+z);}for(let i=0;i<rings.length-1;i++)for(let j=0;j<n;j++){const k=i*(n+1)+j;ids.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));if(rings[1][0]>rings[0][0])for(let i=0;i<ids.length;i+=3)[ids[i+1],ids[i+2]]=[ids[i+2],ids[i+1]];g.setIndex(ids);g.computeVertexNormals();return mesh(name,g,material,[0,0,0],[1,1,1],parent);}
 const shirtRings=[[.88,.16,.105],[.91,.19,.12],[1.03,.185,.118],[1.17,.19,.125],[1.32,.224,.12],[1.39,.20,.096],[1.435,.075,.07]];
 loft('Black T-shirt',shirtRings,m.shirt);
 loft('T-shirt hem',[[.885,.161,.106],[.905,.19,.122],[.919,.19,.123]],m.seam);
 const collar=[];for(let i=0;i<32;i++){const a=i/32*Math.PI*2;collar.push([.078*Math.cos(a),1.435+.008*Math.sin(a),.073*Math.sin(a)]);}line('Ribbed crew neck',collar,.012,m.seam,body,true);
 for(const side of [-1,1]){
  line('Side seam',[[side*.186,.93,.002],[side*.183,1.12,.004],[side*.218,1.31,.002]],.0016,m.seam,body);
  for(let i=0;i<3;i++)line('Tee fabric fold',[[side*(.11+i*.022),.94+i*.045,.094],[side*(.12+i*.02),.97+i*.045,.098],[side*(.165+i*.004),1+i*.045,.077]],.002,m.fold,body);
 }
 // Printed ink follows the tee's elliptical surface and the animated Body node.
 // The builder embeds the two PNGs in these named materials without a DOM canvas.
 function print(name,cx,cy,width,height,side){
  const positions=[],uv=[],indices=[],columns=24,rows=30;
  for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
   const u=col/columns,v=row/rows,x=cx+side*(u-.5)*width,y=cy+(v-.5)*height;
   const upper=shirtRings.findIndex(r=>r[0]>=y),a=shirtRings[Math.max(0,upper-1)],b=shirtRings[upper];
   const t=(y-a[0])/(b[0]-a[0]),rx=THREE.MathUtils.lerp(a[1],b[1],t),rz=THREE.MathUtils.lerp(a[2],b[2],t);
   positions.push(x,y,side*(rz*Math.sqrt(1-(x/rx)**2)+.0015));
   // Embedded glTF images use top-left UV origin. Reversing x on the back keeps text readable.
   uv.push(u,1-v);
  }
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const k=row*(columns+1)+col;indices.push(k,k+1,k+columns+1,k+1,k+columns+2,k+columns+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const ink=new THREE.MeshBasicMaterial({color:0xffffff,alphaTest:.25});ink.name=name;
  mesh(name,geometry,ink,[0,0,0],[1,1,1],body);
 }
 print('Front tag print',0,1.263,.25,.25*1305/1205,1);
 // Wearer's right is -X; viewed from behind this is the lower-right shirt corner.
 print('Back loading print',-.10,1.005,.15,.15*1155/1362,-1);
 const neck=group('Neck',body);skin('Neck skin',[0,1.46,0],[.066,.065,.06],neck);
 // Hip and separate knees allow a modest walking stride without stretching meshes.
 box('Trouser waist',m.pants,[0,.855,0],[.327,.15,.21],body,.18);
 for(const side of [-1,1]){
  const name=side>0?'L':'R';
  const leg=group('Leg'+name,body,[side*.088,.855,0]);
  loft('Loose trouser thigh',[[0,.085,.101],[-.14,.088,.097],[-.36,.071,.077],[-.42,.067,.073]],m.pants,leg);
  const knee=group('Knee'+name,leg,[0,-.405,0]);
  loft('Trouser calf',[[.025,.069,.076],[-.12,.071,.077],[-.29,.065,.066],[-.36,.058,.06]],m.pants,knee);
  for(let i=0;i<2;i++)line('Ankle fold',[[ -.05,-.30-i*.023,.038],[0,-.315-i*.023,.067],[.049,-.305-i*.023,.038]],.0025,m.pantFold,knee);
  const shoe=group('Shoe'+name,knee,[0,-.395,.046]);
  box('Shoe sole',m.sole,[0,-.022,.014],[.13,.036,.25],shoe,.15);
  ball('Dark trainer',m.shoe,[0,.011,.011],[.064,.052,.118],shoe);
  for(let j=0;j<3;j++)line('Laces',[[ -.026,.052-j*.002,.012+j*.017],[.026,.052-j*.002,.018+j*.017]],.002,m.sole,shoe);
  const arm=group('Arm'+name,body,[side*.205,1.35,0]);arm.rotation.z=side*.11;
  const sleeve=loft('Relaxed short sleeve',[[.032,.052,.076],[.008,.076,.093],[-.05,.089,.098],[-.145,.083,.091],[-.206,.076,.082]],m.shirt,arm);sleeve.position.x=side*.018;sleeve.rotation.z=side*.09;
  line('Sleeve seam',[[side*-.032,-.191,.072],[side*.033,-.209,.084],[side*.086,-.19,.035]],.002,m.fold,arm);
  skin('Upper arm',[side*.025,-.205,0],[.059,.098,.061],arm);
  const elbow=group('Elbow'+name,arm,[side*.027,-.275,0]);
  skin('Forearm',[0,-.10,.012],[.047,.14,.051],elbow);
  const hand=group('Hand'+name,elbow,[0,-.245,.025]);
  skin('Palm',[0,0,0],[.043,.067,.025],hand);
  for(let j=0;j<4;j++)skin('Finger',[(j-1.5)*.019,-.067-Math.sin(j/3*Math.PI)*.008,.005],[.010,.036,.013],hand);
  const thumb=skin('Thumb',[-side*.045,-.006,.015],[.014,.037,.018],hand);thumb.rotation.z=-side*.44;
  if(side>0){
   const watch=group('LeftWristWatch',elbow,[0,-.205,0]);
   mesh('Watch band',new THREE.TorusGeometry(.044,.008,8,28),m.black,[0,0,.008],[1,1,.74],watch).rotation.x=Math.PI/2;
   mesh('Round watch case',new THREE.CylinderGeometry(.029,.029,.011,32),m.watch,[0,0,.043],[1,1,1],watch).rotation.x=Math.PI/2;
   ball('Watch screen',m.black,[0,0,.051],[.025,.025,.0025],watch);
   line('Watch hour hand',[[0,0,.055],[-.009,.009,.055]],.001,m.stitch,watch);
   line('Watch minute hand',[[0,0,.055],[.013,.004,.055]],.001,m.stitch,watch);
  }
 }
 const head=group('Head',body,[0,1.615,.008]);
 const face=new THREE.SphereGeometry(1,56,40),p=face.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),jaw=y<-.2?1-.065*(-y-.2)/.8:1;p.setXYZ(i,x*.125*jaw,y*.155,z*(z>=0?.102:.106));}
 face.computeVertexNormals();mesh('Sculpted face',tint(face,'#dfb49a',.12),m.skin,[0,0,0],[1,1,1],head);
 function faceZ(x,y){return .102*Math.sqrt(Math.max(.06,1-(x/.128)**2-(y/.156)**2));}
 for(const side of [-1,1]){
  skin('Ear',[side*.119,-.009,-.009],[.023,.041,.018],head,'#d5a38a');
  skin('Ear concha',[side*.124,-.008,.006],[.012,.026,.006],head,'#bc8876');
  const ex=side*.046,ey=.021,ez=faceZ(ex,ey);
  ball('Almond eye',m.eye,[ex,ey,ez+.001],[.025,.0065,.004],head);
  ball('Dark iris',m.iris,[ex,ey,ez+.005],[.007,.0065,.0018],head);
  ball('Pupil',m.pupil,[ex,ey,ez+.007],[.004,.005,.001],head);
  ball('Eye glint',new THREE.MeshBasicMaterial({color:'#eeeeea'}),[ex-.002,ey+.002,ez+.008],[.0018,.0018,.0008],head);
  line('Upper eyelid',[[ex-.024,ey,ez+.006],[ex,ey+.009,ez+.006],[ex+.024,ey+.001,ez+.006]],.0018,m.brow,head);
  line('Soft straight eyebrow',[[ex-.026,.054,faceZ(ex-.026,.054)+.002],[ex,.057,faceZ(ex,.057)+.002],[ex+.027,.052,faceZ(ex+.027,.052)+.003]],.0027,m.brow,head);
 }
 // Integrated bridge and rounded nose tip, with a quiet closed-mouth expression.
 skin('Nose bridge',[0,-.004,.099],[.013,.038,.015],head);
 skin('Nose tip',[0,-.031,.113],[.019,.013,.014],head,'#d4a38b');
 for(const s of [-1,1])skin('Nostril wing',[s*.013,-.034,.107],[.009,.008,.008],head,'#ca987f');
 line('Upper lip',[[ -.033,-.074,.081],[-.015,-.069,.088],[0,-.071,.091],[.015,-.069,.088],[.033,-.074,.081]],.003,m.lip,head);
 line('Lower lip',[[ -.029,-.077,.083],[0,-.081,.09],[.029,-.077,.083]],.0035,m.lip,head);
 // Thin rounded rectangular metal frames, including bridge, hinges and temples.
 for(const s of [-1,1]){
  const cx=s*.05,cy=.02,z=.117,w=.043,h=.025,r=.012,pts=[];
  for(const [x,y,start] of [[w-r,h-r,0],[-w+r,h-r,90],[-w+r,-h+r,180],[w-r,-h+r,270]])for(let i=0;i<=8;i++){const a=(start+i*90/8)*Math.PI/180;pts.push([cx+x+r*Math.cos(a),cy+y+r*Math.sin(a),z]);}
  line('Metal glasses frame',pts,.00165,m.metal,head,true);
  box('Clear lens',m.lens,[cx,cy,z],[.083,.049,.001],head,.2);
  line('Glasses temple',[[s*.093,.027,.117],[s*.121,.026,.05],[s*.125,.009,-.025]],.0019,m.metal,head);
 }
 line('Glasses bridge',[[ -.008,.024,.119],[0,.03,.122],[.008,.024,.119]],.0017,m.metal,head);
 // Tailored scalp cap: hairline is high in the middle and drops at the temples.
 const hp=[],hi=[],rows=22,cols=64;
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const a=j/cols*Math.PI*2,front=Math.max(0,Math.sin(a)),maxTheta=2.4-1.22*front,theta=i/rows*maxTheta;hp.push(.128*Math.sin(theta)*Math.cos(a),.045+.143*Math.cos(theta),-.014+.117*Math.sin(theta)*Math.sin(a));}
 for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const k=i*(cols+1)+j;hi.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
 const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(hp,3));cap.setIndex(hi);cap.computeVertexNormals();mesh('Parted black hair',cap,m.hair,[0,0,0],[1,1,1],head);
 // Broad tapered locks sweep away from a visible centre part. Fine longitudinal
 // ridges give direction without making the hair look like disconnected balls.
 function lock(name,points,width,material){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),v=[],idx=[],sections=24,sides=8;for(let i=0;i<=sections;i++){const t=i/sections,center=c.getPoint(t),tangent=c.getTangent(t),across=new THREE.Vector3(-tangent.y,tangent.x,0).normalize(),normal=new THREE.Vector3().crossVectors(across,tangent).normalize();const radius=width*Math.pow(Math.sin(Math.PI*(.10+t*.90)),.65)+.0003;for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,pos=center.clone().addScaledVector(across,Math.cos(a)*radius).addScaledVector(normal,Math.sin(a)*radius*.3);v.push(pos.x,pos.y,pos.z);}}for(let i=0;i<sections;i++)for(let j=0;j<sides;j++){const k=i*(sides+1)+j;idx.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();mesh(name,g,material,[0,0,0],[1,1,1],head);}
 for(const s of [-1,1])for(let i=0;i<9;i++){
  const offset=i*.007;
  lock('Swept hair lock',[[s*.006,.174-offset*.2,.022+offset*.9],[s*(.045+offset*.5),.166-offset*.28,.084+offset*.35],[s*(.092+offset*.42),.111-offset*.7,.096-offset*.3],[s*(.106+offset*.25),.042-offset*.78,.062-offset*.7]],.018-i*.0008,i%4===0?m.hairRidge:m.hair);
 }
 line('Centre hair part',[[ -.005,.179,.031],[ -.002,.172,.065],[.005,.15,.092]],.002,m.hairRidge,head);
 root.updateMatrixWorld(true);return root;
}
