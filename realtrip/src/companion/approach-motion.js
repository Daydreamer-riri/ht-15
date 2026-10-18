const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const angle=(a,b)=>(b-a+540)%360-180;

// A bounded local A* search samples the existing capsule and ground, including
// every diagonal edge. No teleporting, crossing furniture, or walking off ledges.
export function planApproach(start,goal,{project,player,maxDistance=7,cell=.22}={}){
 if(distance(start,goal)>maxDistance)return null;
 const clear=p=>{
  const q=project(p);if(!q||Math.abs(q[1]-start[1])>.32)return null;
  if(player&&distance(q,player)<.57)return null;
  return q;
 };
 const end=clear(goal);if(!end)return null;
 function edge(a,b){let previous=a;const steps=Math.max(1,Math.ceil(distance(a,b)/.025));for(let i=1;i<=steps;i++){const p=clear(a.map((v,k)=>v+(b[k]-v)*i/steps));if(!p||Math.abs(p[1]-previous[1])>.18)return false;previous=p;}return true;}
 if(edge(start,end))return [end];
 const origin={point:start,x:0,z:0,g:0,f:distance(start,end),parent:null},open=[origin],seen=new Map([['0,0',origin]]),closed=new Set();
 for(let count=0;open.length&&count<2200;count++){
  let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
  const node=open.splice(best,1)[0],key=`${node.x},${node.z}`;if(closed.has(key))continue;closed.add(key);
  if(distance(node.point,end)<cell*1.5&&edge(node.point,end)){
   const path=[end];for(let n=node;n.parent;n=n.parent)path.unshift(n.point);
   const smooth=[];let from=start,i=0;
   while(i<path.length){let j=path.length-1;while(j>i&&!edge(from,path[j]))j--;smooth.push(path[j]);from=path[j];i=j+1;}
   return smooth;
  }
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=node.x+dx,z=node.z+dz,k=`${x},${z}`;if(closed.has(k))continue;
   const p=clear([start[0]+x*cell,node.point[1],start[2]+z*cell]);
   if(!p||distance(start,p)>maxDistance||!edge(node.point,p))continue;
   const g=node.g+distance(node.point,p),existing=seen.get(k);if(existing&&existing.g<=g)continue;
   const next={point:p,x,z,g,f:g+distance(p,end),parent:node};seen.set(k,next);open.push(next);
  }
 }
 return null;
}

export function createApproachMotion(start,rotation,path,project){
 let position=[...start],yaw=rotation,speed=0,index=0,blocked=0,elapsed=0;
 return {update(dt,{player,paused=false}={}){
  dt=Math.max(0,Math.min(dt,.05));if(paused)return {position:[...position],yaw,speed:0,turn:0,moving:false};elapsed+=dt;
  let target=path[index],d=distance(position,target);
  if(d<.035&&index<path.length-1){target=path[++index];d=distance(position,target);}
  const desired=d>.012?Math.atan2(target[0]-position[0],target[2]-position[2])*180/Math.PI:yaw;
  const turn=Math.max(-125*dt,Math.min(125*dt,angle(yaw,desired)));yaw+=turn;
  const targetSpeed=Math.min(.42,d*1.8)*Math.max(0,Math.cos(angle(yaw,desired)*Math.PI/180));
  speed+=(targetSpeed-speed)*(1-Math.exp(-dt*5));
  const step=Math.min(d,speed*dt),next=d>.001?position.map((v,k)=>v+(target[k]-v)*step/d):position;
  const safe=project(next),visitorClear=!player||distance(next,player)>=.56;
  if(safe&&visitorClear&&Math.abs(safe[1]-position[1])<.18){position=safe;blocked=0;}else{speed=0;blocked+=dt;}
  const arrived=index===path.length-1&&d<.04;
  return {position:[...position],yaw,speed:arrived?0:speed,turn:dt?turn/dt:0,moving:!arrived&&speed>.02,arrived,failed:blocked>1.3||elapsed>35};
 }};
}
