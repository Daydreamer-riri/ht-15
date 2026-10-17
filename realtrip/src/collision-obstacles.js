// Extra stationary characters share the walker's capsule collision pass. The
// venue still supplies floor rays and wall contacts in its original coordinates.
export function addCapsuleObstacles(collision,obstacles=[]){
 if(!obstacles.length)return collision;
 const query=collision.queryCapsule.bind(collision),scratch={x:0,y:0,z:0};
 collision.queryCapsule=(x,y,z,half,radius,out)=>{
  let px=x,py=y,pz=z,hit=false;
  for(let pass=0;pass<4;pass++){
   let changed=false;
   if(query(px,py,pz,half,radius,scratch)){
    px+=scratch.x;py+=scratch.y;pz+=scratch.z;hit=changed=true;
   }
   for(const obstacle of obstacles){
    if(py+half+radius<=obstacle.bottom||py-half-radius>=obstacle.top)continue;
    const dx=px-obstacle.x,dz=pz-obstacle.z,distance=Math.hypot(dx,dz),limit=obstacle.radius+radius;
    if(distance>=limit)continue;
    const nx=distance>1e-8?dx/distance:1,nz=distance>1e-8?dz/distance:0;
    px+=nx*(limit-distance+1e-5);pz+=nz*(limit-distance+1e-5);hit=changed=true;
   }
   if(!changed)break;
  }
  out.x=px-x;out.y=py-y;out.z=pz-z;return hit;
 };
 return collision;
}
