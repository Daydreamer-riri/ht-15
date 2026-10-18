// A finite-height character against reviewed oriented solid boxes, in metres.
// Visual infill and physics are separate: hiding inferred surfaces keeps collision.
const EPS=1e-5;
export function createSolidPhysics(config) {
 const radius=config.radius??.21,height=config.height??1.75,stepHeight=config.stepHeight??.22;
 const boxes=config.boxes.map(b=>{
  if(!b.center?.every(Number.isFinite)||b.center.length!==3||!b.size?.every(v=>Number.isFinite(v)&&v>0)||b.size.length!==3||!Number.isFinite(b.yaw??0))throw Error('Invalid solid box');
  const angle=(b.yaw??0)*Math.PI/180;
  return {...b,c:Math.cos(angle),s:Math.sin(angle),hx:b.size[0]/2,hz:b.size[2]/2,bottom:b.center[1]-b.size[1]/2,top:b.center[1]+b.size[1]/2};
 });
 function local(b,x,z){const dx=x-b.center[0],dz=z-b.center[2];return [dx*b.c-dz*b.s,dx*b.s+dz*b.c];}
 function overlap(b,x,z){const [u,v]=local(b,x,z);return Math.hypot(Math.max(0,Math.abs(u)-b.hx),Math.max(0,Math.abs(v)-b.hz))<radius-EPS;}
 function clear(x,y,z){return !boxes.some(b=>b.bottom<y+height-EPS&&b.top>y+EPS&&overlap(b,x,z));}
 function support(x,z,ceiling,bottom=-Infinity){
  let best=null;
  for(const b of boxes)if(b.walkable!==false&&b.top<=ceiling+EPS&&b.top>=bottom-EPS&&overlap(b,x,z)&&(!best||b.top>best.top))best=b;
  return best;
 }
 function slide(x,y,z){
  for(let iteration=0;iteration<6;iteration++){
   let changed=false;
   for(const b of boxes){
    if(b.bottom>=y+height-EPS||b.top<=y+EPS)continue;
    const [u,v]=local(b,x,z),qu=Math.max(-b.hx,Math.min(b.hx,u)),qv=Math.max(-b.hz,Math.min(b.hz,v));
    const du=u-qu,dv=v-qv,dist=Math.hypot(du,dv);if(dist>=radius-EPS)continue;
    let pu,pv;
    if(dist>EPS){pu=du/dist*(radius-dist+EPS);pv=dv/dist*(radius-dist+EPS);}
    else if(b.hx-Math.abs(u)<b.hz-Math.abs(v)){pu=(u<0?-1:1)*(b.hx-Math.abs(u)+radius+EPS);pv=0;}
    else{pu=0;pv=(v<0?-1:1)*(b.hz-Math.abs(v)+radius+EPS);}
    x+=pu*b.c+pv*b.s;z+=-pu*b.s+pv*b.c;changed=true;
   }
   if(!changed)break;
  }
  return {x,z};
 }
 let state={x:0,y:0,z:0,vy:0,grounded:false,support:null};
 function reset(position){
  state={x:position[0],y:position[1],z:position[2],vy:0,grounded:false,support:null};
  const floor=support(state.x,state.z,state.y+.05,state.y-.25);
  if(floor&&clear(state.x,floor.top,state.z)){state.y=floor.top;state.grounded=true;state.support=floor.id??null;}
  return {...state};
 }
 function jump(){if(state.grounded){state.vy=config.jumpSpeed??4.2;state.grounded=false;state.support=null;}}
 function update(dt,vx,vz){
  dt=Math.min(.1,Math.max(0,dt));
  const count=Math.max(1,Math.ceil(dt/Math.min(1/120,radius/(2*Math.max(1,Math.hypot(vx,vz))))));
  const h=dt/count;
  for(let i=0;i<count;i++){
   let nx=state.x+vx*h,nz=state.z+vz*h,foot=state.y;
   if(state.grounded){
    const step=support(nx,nz,foot+stepHeight,foot+EPS*2);
    if(step&&clear(nx,step.top,nz))foot=step.top;
   }
   const slid=slide(nx,foot,nz);nx=slid.x;nz=slid.z;
   if(foot>state.y&&!support(nx,nz,foot+EPS,foot-EPS))foot=state.y;
   state.x=nx;state.z=nz;state.y=foot;
   // Keep contact with gently descending steps; walking off a chair still falls.
   if(state.grounded){
    const floor=support(nx,nz,foot+.001,foot-stepHeight);
    if(floor&&clear(nx,floor.top,nz)){state.y=floor.top;state.vy=0;state.support=floor.id??null;continue;}
   }
   state.grounded=false;state.support=null;state.vy-=(config.gravity??9.8)*h;
   let next=state.y+state.vy*h;
   if(state.vy<=0){
    const floor=support(nx,nz,state.y+.001,next);
    if(floor){next=floor.top;state.vy=0;state.grounded=true;state.support=floor.id??null;}
   }else{
    let ceiling=Infinity;
    for(const b of boxes)if(b.bottom>=state.y+height-EPS&&b.bottom<=next+height&&overlap(b,nx,nz))ceiling=Math.min(ceiling,b.bottom);
    if(Number.isFinite(ceiling)){next=ceiling-height;state.vy=0;}
   }
   state.y=next;
  }
  return {...state};
 }
 return {reset,jump,update,getState:()=>({...state})};
}
