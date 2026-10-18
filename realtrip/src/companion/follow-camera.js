const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cameraOrbit(pose,{eyeHeight=.8,aspect=1}={}){
 const yaw=pose.yaw*Math.PI/180,elevation=clamp(14-pose.pitch*.65,8,62)*Math.PI/180;
 const portrait=aspect<.8,distance=portrait?1.65:1.5,aimOffset=portrait?.08:.18,shoulderOffset=portrait?.24:.32,target=[pose.position[0]+Math.cos(yaw)*aimOffset,pose.position[1]-eyeHeight*.45,pose.position[2]-Math.sin(yaw)*aimOffset];
 const offset=[Math.sin(yaw)*Math.cos(elevation)*distance+Math.cos(yaw)*shoulderOffset,Math.sin(elevation)*distance,Math.cos(yaw)*Math.cos(elevation)*distance-Math.sin(yaw)*shoulderOffset];
 return {target,position:target.map((v,i)=>v+offset[i]),distance};
}
export function cameraClearance(target,desired,cast){
 const d=desired.map((v,i)=>v-target[i]),length=Math.hypot(...d);if(!length)return target;
 const direction=d.map(v=>v/length);let travel=length;
 // A small camera volume rather than a single centre ray keeps the near plane
 // out of walls, stage edges and columns from the original collision scan.
 for(const offset of [[0,0,0],[.06,0,0],[-.06,0,0],[0,.06,0],[0,-.06,0]]){
  const start=target.map((v,i)=>v+offset[i]),hit=cast?.(start,direction,length+.08);
  if(hit){const distance=Math.max(0,(hit.x-start[0])*direction[0]+(hit.y-start[1])*direction[1]+(hit.z-start[2])*direction[2]-.09);travel=Math.min(travel,distance);}
 }
 return target.map((v,i)=>v+direction[i]*Math.max(.12,travel));
}
