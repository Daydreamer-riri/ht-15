export const PLAYER_EYE_HEIGHT=1.64;
export function playerPlacement(pose,eyeHeight){
 const scale=eyeHeight/PLAYER_EYE_HEIGHT;
 // The model faces +Z; the navigation camera looks down -Z at yaw zero.
 return {scale,yaw:pose.yaw+180,position:[pose.position[0],pose.position[1]-eyeHeight,pose.position[2]]};
}
export function createPlayerMotion(){
 let last=null,stride=0,weight=0,clock=0,waveEnd=0;
 return {wave(){waveEnd=clock+2.1;},update(dt,position,{reduced=false,grounded=true}={}){
  dt=Math.max(0,Math.min(dt,.05));clock+=dt;
  const distance=last?Math.hypot(position[0]-last[0],position[2]-last[2]):0;last=[...position];
  // A reset/teleport must not create a fast kick. Actual displacement, not key
  // presses, drives the feet so they stop when the collision body hits a wall.
  const speed=distance>.18?0:Math.min(1,distance/Math.max(dt,.001)/.72);
  weight+=((grounded?speed:0)-weight)*(1-Math.exp(-dt*12));
  stride+=Math.min(distance,.05)*18;
  const swing=reduced?0:Math.sin(stride)*weight;
  const remaining=Math.max(0,waveEnd-clock),wave=reduced?0:Math.min(1,remaining/.3,(2.1-remaining)/.3);
  return {legL:swing*17,legR:-swing*17,kneeL:Math.max(0,-swing)*15,kneeR:Math.max(0,swing)*15,armL:-swing*12,armR:swing*12-42*wave,elbowL:-8,elbowR:-8-74*wave,rollL:6,rollR:-6-30*wave,handR:wave*Math.sin(clock*15)*16,breath:reduced?1:1+Math.sin(clock*1.7)*.002,waving:wave>0,weight};
 }};
}
