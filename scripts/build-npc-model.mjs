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
const material = (color, extra={}) => new THREE.MeshStandardMaterial({color, roughness:.48, metalness:.05, ...extra});
const m={skin:material('#ffd6b9'),inner:material('#ee9e94'),hair:material('#38232e'),hairLight:material('#533441'),white:material('#f3f8ff'),blue:material('#168aff'),navy:material('#162342'),sole:material('#b4d3ec'),cyan:material('#61ecff',{emissive:'#18bcff',emissiveIntensity:.5}),eye:material('#faffff'),iris:material('#118fe3'),pupil:material('#14385e'),mouth:material('#8c2748'),tongue:material('#ff738f'),glass:material('#5bd7fa',{transparent:true,opacity:.19,depthWrite:false,roughness:.12})};
function group(name,parent=root,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
function mesh(name,geo,mat,pos,scale=[1,1,1],parent=root){const o=new THREE.Mesh(geo,mat);o.name=name;o.position.set(...pos);o.scale.set(...scale);parent.add(o);return o;}
const sphere=new THREE.SphereGeometry(1,28,18);
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
 const leg=group(side<0?'LegL':'LegR',body,[side*.24,.4,0]);leg.rotation.z=-side*.1;
 ball('Cargo trousers',m.navy,[0,.01,0],[.23,.35,.24],leg);
 box('Blue cargo pocket',m.blue,[side*.16,.1,.1],[.1,.17,.2],leg);
 box('Pocket highlight',m.cyan,[side*.202,.12,.13],[.012,.07,.1],leg);
 ball('White sneaker',m.white,[0,-.23,.11],[.245,.16,.36],leg);
 ball('Sole',m.sole,[0,-.33,.13],[.25,.06,.36],leg);
 ball('Blue heel',m.blue,[0,-.23,-.09],[.24,.115,.13],leg);
 for(let i=0;i<3;i++)box('Navy laces',m.navy,[0,-.16+i*.03,.35-i*.045],[.26,.035,.035],leg);
}
ball('Dark hoodie',m.navy,[0,.94,0],[.36,.42,.25],body);
ball('Hood',m.white,[0,1.17,-.12],[.43,.25,.27],body);
for(const side of [-1,1]){
 const coat=ball('Jacket panel',m.white,[side*.25,.94,.035],[.22,.35,.27],body);coat.rotation.z=-side*.16;
 line('Blue zipper piping',[[side*.11,1.18,.25],[side*.12,.92,.285],[side*.25,.63,.25]],.018,m.blue,body);
 const arm=group(side<0?'ArmL':'ArmR',body,[side*.4,1.14,0]);arm.rotation.z=side*.34;
 ball('Sleeve',m.white,[side*.05,-.19,0],[.185,.28,.18],arm);
 ball('Blue wrist cuff',m.blue,[side*.085,-.4,.02],[.16,.075,.155],arm);
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
const head=group('Head',body,[0,1.58,0]);
ball('Hair back',m.hair,[0,.1,-.13],[.64,.59,.42],head);
ball('Face',m.skin,[0,0,.055],[.54,.49,.43],head);
for(const side of [-1,1]){
 ball('Large ear',m.skin,[side*.565,-.015,.015],[.23,.27,.13],head);
 ball('Inner ear',m.inner,[side*.585,-.012,.115],[.135,.18,.025],head);
 line('Ear fold',[[side*.55,.1,.14],[side*.62,.05,.145],[side*.58,-.045,.145]],.013,m.skin,head);
 ball('Eye white',m.eye,[side*.22,-.025,.425],[.16,.185,.032],head);
 ball('Blue iris',m.iris,[side*.215,-.03,.455],[.105,.142,.018],head);
 ball('Pupil',m.pupil,[side*.208,-.03,.47],[.055,.103,.012],head);
 ball('Eye sparkle',m.eye,[side*.22-.033,.035,.484],[.031,.044,.01],head);
 ball('Eye small sparkle',m.eye,[side*.22+.037,-.082,.484],[.018,.022,.009],head);
 line('Upper eyelid',[[side*.08,.05,.44],[side*.2,.15,.43],[side*.35,.09,.39]],.022,m.hair,head);
 line('Eyebrow',[[side*.11,.23,.42],[side*.22,.25,.40],[side*.32,.21,.37]],.023,m.hair,head);
 ball('Blush',m.inner,[side*.36,-.18,.38],[.075,.028,.01],head);
}
ball('Coral nose',m.inner,[0,-.12,.487],[.055,.036,.036],head);
const mouth=group('Mouth',head,[0,-.25,.445]);
ball('Smile',m.mouth,[0,0,0],[.115,.071,.015],mouth);
ball('Tongue',m.tongue,[.015,-.03,.013],[.062,.026,.009],mouth);
box('Little tooth',m.eye,[-.023,.042,.014],[.06,.026,.012],mouth);
// Oversized swept hair tufts, with a curved lock over the forehead.
for(const [x,y,z,sx,sy,sz,rz] of [[-.4,.36,-.02,.29,.32,.28,.45],[-.22,.5,-.02,.3,.29,.3,-.35],[.1,.49,-.06,.38,.28,.34,-.15],[.4,.34,-.1,.27,.31,.29,-.6],[.51,.13,-.15,.2,.29,.22,-.5]]){
 const o=ball('Swept hair',m.hair,[x,y,z],[sx,sy,sz],head);o.rotation.z=rz;
}
const tuft=patch('Hair silhouette',[[-.57,.22],[-.66,.5],[-.53,.45],[-.36,.73],[-.12,.64],[.11,.77],[.36,.66],[.24,.55],[.65,.5],[.64,.34],[.75,.41],[.63,.13],[.42,.18],[.2,.4],[-.18,.38]],m.hair,.13,head);tuft.position.z=-.13;
line('Forehead curl',[[.22,.43,.22],[.14,.35,.36],[.14,.23,.43],[.21,.19,.44],[.26,.25,.42]],.075,m.hair,head);
line('Hair sheen',[[-.43,.51,.17],[-.26,.59,.2],[-.06,.55,.24]],.014,m.hairLight,head);
// Curved visor follows the face; the eyes remain legible through it.
const visor=new THREE.CylinderGeometry(.5,.5,.37,36,1,true,-1.05,2.1);
mesh('Transparent blue visor',visor,m.glass,[0,.005,.02],[1.08,1,1],head);
for(const y of [-.18,.19]){
 const pts=Array.from({length:13},(_,i)=>{const a=-1.05+i/12*2.1;return [Math.sin(a)*.54,y,Math.cos(a)*.5+.025];});
 line('Visor cyan edge',pts,.012,m.cyan,head);
}
for(const side of [-1,1]){
 box('Visor temple',m.blue,[side*.49,.02,.26],[.08,.24,.09],head);
 box('Visor temple light',m.cyan,[side*.49,.04,.31],[.04,.075,.012],head);
}
root.userData={name:'小蓝',source:'User-supplied Hackathon poster, left character',technique:'Hand-authored articulated mesh; stylized interpretation, not a scan',forward:'+Z'};
const out=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
await mkdir('realtrip/public/npc',{recursive:true});
await writeFile('realtrip/public/npc/blue-mascot.glb',Buffer.from(out));
console.log(`Blue mascot GLB: ${(out.byteLength/1024).toFixed(0)} KiB`);
