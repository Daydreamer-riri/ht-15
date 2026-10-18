// A reviewed, level floor plan. Coordinates are in the scan's world units,
// not metres. This deliberately keeps reconstruction floaters out of physics.
export function pointInPolygon(x, z, polygon) {
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [ax,az]=polygon[i],[bx,bz]=polygon[j];
  if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
 }
 return inside;
}

export function edgeDistance(x,z,polygon){
 let distance=Infinity;
 for(let i=0;i<polygon.length;i++){
  const [ax,az]=polygon[i],[bx,bz]=polygon[(i+1)%polygon.length];
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
  distance=Math.min(distance,Math.hypot(x-ax-t*dx,z-az-t*dz));
 }
 return distance;
}

export function createWalkSurface(config){
 const {boundary,obstacles=[],radius=.13,floorY,eyeHeight,speed}=config;
 const contains=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&pointInPolygon(x,z,boundary)&&edgeDistance(x,z,boundary)>=radius-1e-7&&obstacles.every(p=>!pointInPolygon(x,z,p)&&edgeDistance(x,z,p)>=radius-1e-7);
 function move(x,z,nx,nz){
  // Short swept steps stop a fast frame from tunnelling across a thin wall.
  const count=Math.max(1,Math.ceil(Math.hypot(nx-x,nz-z)/(radius*.4)));
  const dx=(nx-x)/count,dz=(nz-z)/count;
  for(let i=0;i<count;i++){
   if(contains(x+dx,z+dz)){x+=dx;z+=dz;}
   else{
    // Slide along walls, without snapping to a capture trajectory.
    if(contains(x+dx,z))x+=dx;
    if(contains(x,z+dz))z+=dz;
   }
  }
  return {x,z,y:floorY};
 }
 return {contains,move,floorY,eyeHeight,speed,jumpSpeed:config.jumpSpeed??2.6};
}
