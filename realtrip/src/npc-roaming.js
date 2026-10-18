const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b)=>((b-a+540)%360)-180;

// Slow, bounded hoverboard wandering. Each step is checked against the original
// venue and the visitor, so a moving character never pushes the visitor aside.
export function createNpcRoaming({position,rotation=180,waypoints,canOccupy=()=>true,random=Math.random}){
 const point=[...position];let yaw=rotation,vx=0,vz=0,target=null,pause=3,index=-1,hold=0,travel=0;
 function pick(){
  for(let tries=0;tries<waypoints.length;tries++){
   index=(index+1)%waypoints.length;const p=waypoints[index];
   if(Math.hypot(p[0]-point[0],p[1]-point[2])>.18&&canOccupy([p[0],point[1],p[1]])){target=p;return;}
  }
  pause=3;
 }
 return {
  hold(seconds=3){hold=Math.max(hold,seconds);},
  update(dt,{player,busy=false,near=false,reduced=false}={}){
   dt=clamp(dt,0,.05);if(reduced){vx=vz=0;return {position:[...point],yaw,speed:0,turn:0,travel,moving:false};}hold=Math.max(0,hold-dt);pause=Math.max(0,pause-dt);
   const distance=player?Math.hypot(player[0]-point[0],player[2]-point[2]):Infinity;
   const sameFloor=player&&Math.abs(player[1]-(point[1]+.4))<1.1;
   const stopped=busy||reduced||hold>0||(sameFloor&&distance<1.05);
   if(!stopped&&!target&&pause===0)pick();
   let sx=0,sz=0,desired=yaw;
   if(!stopped&&target){
    const dx=target[0]-point[0],dz=target[1]-point[2],d=Math.hypot(dx,dz);
    if(d<.045){target=null;pause=2.5+random()*3;}
    else{
     desired=Math.atan2(dx,dz)*180/Math.PI;
     const speed=Math.min(.22,d*1.1)*clamp((Math.cos(angle(yaw,desired)*Math.PI/180)-.1)/.9,0,1);
     sx=dx/d*speed;sz=dz/d*speed;
    }
   }else if(near&&player)desired=Math.atan2(player[0]-point[0],player[2]-point[2])*180/Math.PI;
   const turn=clamp(angle(yaw,desired),-80*dt,80*dt);yaw+=turn;
   const ease=1-Math.exp(-dt*4.5);vx+=(sx-vx)*ease;vz+=(sz-vz)*ease;
   const next=[point[0]+vx*dt,point[1],point[2]+vz*dt];
   const visitorClear=!sameFloor||Math.hypot(next[0]-player[0],next[2]-player[2])>=.56;
   if(visitorClear&&canOccupy(next)){travel+=Math.hypot(next[0]-point[0],next[2]-point[2]);point[0]=next[0];point[2]=next[2];}
   else{vx=vz=0;target=null;pause=1.5;}
   return {position:[...point],yaw,speed:Math.hypot(vx,vz),turn:dt?turn/dt:0,travel,moving:Math.hypot(vx,vz)>.025};
  },
 };
}
