// Camera-relative walking inside an approximate capture corridor from video.
// Progress continuity disambiguates overlapping stair flights; heights are approximate.
export function routeProject(route, x, z, progress = null) {
 const p=route.points,w=route.width;
 let best=null;
 const count=route.segments?.length??(p.length-1);
 const current=progress===null?null:Math.min(count-1,Math.floor(progress));
 const allowed=route.neighbors&&current!==null?new Map(route.neighbors[current]):null;
 for(let i=0;i<count;i++){
  if(allowed?!allowed.has(i):(progress!==null&&Math.abs(i-progress)>7))continue;
  const [a,b]=route.segments?.[i]??[i,i+1];
  const dx=p[b][0]-p[a][0],dz=p[b][2]-p[a][2],l2=dx*dx+dz*dz;
  const t=Math.max(0,Math.min(1,((x-p[a][0])*dx+(z-p[a][2])*dz)/(l2||1)));
  const px=p[a][0]+t*dx,pz=p[a][2]+t*dz,d=Math.hypot(x-px,z-pz);
  // At a hairpin, retain the current flight instead of cutting across to a later one.
  // On a verified single level, overlapping forward/backward capture passes
  // are the same walkable aisle. A large chronology penalty can trap the
  // walker at an earlier pass endpoint even while the next segment is nearby.
  // Keep only a small tie-break there; stair routes keep strict continuity.
  const continuityWeight=route.floorMode==='reviewed-level' ? .0001 : .0025;
  const score=d*d+(progress===null?0:Math.pow(allowed?(allowed.get(i)+(i===current?t-(progress-current):0)):((i+t)-progress),2)*continuityWeight);
  if(!best||score<best.score)best={i,t,progress:i+Math.min(t,.999999),x:px,z:pz,y:p[a][1]+t*(p[b][1]-p[a][1]),distance:d,width:w[a]+t*(w[b]-w[a]),score};
 }
 return best;
}
export function createOfficeNavigation(viewer, route, initial, world, surface = null) {
 const cam=viewer.app.root.findComponents('camera')[0].entity;
 const physics=surface?.physics;
 let x,z,y,yaw,pitch=0,capturePitch=0,progress,jumpY=0,jumpV=0,moveX=0,moveZ=0,enabled=true,look=null;
 const eye=surface?.eyeHeight??route?.eyeHeight??1.6;
 let velocityX=0,velocityZ=0,stride=0,bob=0,walkingMotion=true;
 const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const keys=new Set(),canvas=world.querySelector('canvas');
 function reset(){
  [x,y,z]=initial.position;const dx=initial.target[0]-x,dy=initial.target[1]-y,dz=initial.target[2]-z;
  yaw=Math.atan2(-dx,-dz)*180/Math.PI;pitch=Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI;capturePitch=pitch;jumpY=jumpV=bob=stride=0;keys.clear();moveX=moveZ=velocityX=velocityZ=0;
  if(physics){const foot=physics.reset([x,y-eye,z]);x=foot.x;y=foot.y+eye;z=foot.z;render();return;}
  if(surface){if(!surface.contains(x,z))throw new Error('起点不在可行走地面内');y=(surface.heightAt?.(x,z)??surface.floorY)+eye;progress=0;render();return;}
  // Position and height together choose the right flight for quick-start locations.
  let nearest=0,score=Infinity;
  route.points.forEach((p,i)=>{const d=(p[0]-x)**2+(p[2]-z)**2+4*(p[1]+eye-y)**2;if(d<score){score=d;nearest=i;}});
  if(route.segments)nearest=route.segments.findIndex(([a,b])=>a===nearest||b===nearest);
  const hit=routeProject(route,x,z,nearest);progress=hit.progress;y=hit.y+eye;render();
 }
 function stop(){keys.clear();moveX=moveZ=velocityX=velocityZ=0;bob=0;look=null;physics?.stop?.();}
 // Restore only a reviewed-floor viewpoint; reset still returns to the entrance.
 function getPose(){return {position:[x,y,z],yaw,pitch};}
 function restorePose(pose){
  if(physics||!surface||!Array.isArray(pose?.position)||pose.position.length!==3||!pose.position.every(Number.isFinite)||!Number.isFinite(pose.yaw)||!Number.isFinite(pose.pitch)||!surface.contains(pose.position[0],pose.position[2]))return false;
  stop();[x,,z]=pose.position;y=(surface.heightAt?.(x,z)??surface.floorY)+eye;
  yaw=pose.yaw%360;pitch=Math.max(-75,Math.min(75,pose.pitch));
  jumpY=jumpV=stride=0;render();return true;
 }
 function jump(){if(!enabled)return;if(physics)physics.jump();else if(jumpY===0)jumpV=surface?.jumpSpeed??3.6;}
 function keydown(e){
  if(!enabled||e.target.closest?.('input,select,textarea,dialog,button,a,[data-explorer-ui]'))return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)){
   e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)jump();
  }
 }
 function keyup(e){keys.delete(e.code);}
 function turn(dx,dy){yaw-=dx*.16;pitch=Math.max(-75,Math.min(75,pitch-dy*.16));}
 function pointerdown(e){
  if(!enabled)return;
  if(e.pointerType==='mouse'&&viewer.state.gamingControls&&canvas.requestPointerLock){canvas.requestPointerLock()?.catch?.(()=>{});}
  look={id:e.pointerId,x:e.clientX,y:e.clientY,start:performance.now(),travel:0,touch:e.pointerType!=='mouse'};
  if(e.pointerType!=='mouse')canvas.setPointerCapture(e.pointerId);
 }
 function pointermove(e){
  if(!enabled)return;
  if(document.pointerLockElement===canvas){turn(e.movementX,e.movementY);return;}
  if(look?.id===e.pointerId){const dx=e.clientX-look.x,dy=e.clientY-look.y;turn(dx,dy);look.travel+=Math.hypot(dx,dy);look.x=e.clientX;look.y=e.clientY;}
 }
 function pointerup(e){if(look?.id===e.pointerId){if(look.touch&&look.travel<8&&performance.now()-look.start<320)jump();look=null;}}
 function pointercancel(e){if(look?.id===e.pointerId)look=null;}
 let lastRender=[];
 function render(){
  // Full room scans can show more of the doorway on a wide screen. The viewer
  // uses horizontal FOV in landscape and vertical FOV in portrait.
  if(initial.landscapeFov)cam.camera.fov=world.clientWidth>world.clientHeight?initial.landscapeFov:initial.fov;
  // Portrait footage has a narrow horizontal capture. An optional cap avoids
  // expanding it into an extreme wide-angle view on desktop displays.
  if(initial.maxHorizontalFov){const aspect=Math.max(.1,world.clientWidth/world.clientHeight);cam.camera.fov=Math.min(initial.fov??65,2*Math.atan(Math.tan(initial.maxHorizontalFov*Math.PI/360)/aspect)*180/Math.PI);}
  // A wide viewport crops the portrait view vertically. Optional horizon framing
  // moves that crop within the captured vertical field, instead of staring at the
  // floor. It does not expand the field or alter the portrait capture direction.
  const margin=initial.wideFraming==='horizon'?Math.max(0,((initial.fov??65)-cam.camera.fov)/2):0;
  const offset=Math.max(-margin,Math.min(margin,-capturePitch));
  const viewPitch=Math.max(-75,Math.min(75,pitch+offset));
  const next=[x,y+jumpY+bob,z,viewPitch,yaw,cam.camera.fov];cam.setPosition(x,y+jumpY+bob,z);cam.setEulerAngles(viewPitch,yaw,0);cam.camera.nearClip=.03;cam.camera.farClip=250;if(next.some((v,i)=>Math.abs(v-(lastRender[i]??Infinity))>1e-5))viewer.app.renderNextFrame=true;lastRender=next;world.dataset.position=next.slice(0,3).map(v=>v.toFixed(3)).join(',');}
 function update(dt){
  dt=Math.max(0,Math.min(dt,.05));
  if(enabled){
   let sx=moveX+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
   let sz=moveZ+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
   const n=Math.max(1,Math.hypot(sx,sz));sx/=n;sz/=n;
   const rad=yaw*Math.PI/180;
   let speed=surface?.speed??1.65;
   if(!surface){const i=Math.min(Math.floor(progress),(route.segments?.length??(route.points.length-1))-1),fraction=progress-i;const [a,b]=route.segments?.[i]??[i,i+1];speed=route.speed?route.speed[a]+fraction*(route.speed[b]-route.speed[a]):1.65;}
   const easing=1-Math.exp(-dt*14);
   velocityX+=(sx-velocityX)*easing;velocityZ+=(sz-velocityZ)*easing;
   const oldX=x,oldZ=z;
   const vx=(Math.cos(rad)*velocityX-Math.sin(rad)*velocityZ)*speed;
   const vz=(-Math.sin(rad)*velocityX-Math.cos(rad)*velocityZ)*speed;
   const nx=x+vx*dt,nz=z+vz*dt;
   let grounded=jumpY===0;
   if(physics){
    const foot=physics.update(dt,vx,vz);x=foot.x;z=foot.z;y=foot.y+eye;grounded=foot.grounded;
    if(![x,y,z].every(Number.isFinite)||y<(surface.resetBelow??-8)){reset();return;}
   }
   else if(surface){const foot=surface.move(x,z,nx,nz);x=foot.x;z=foot.z;y=foot.y+eye;}
   else{
    const hit=routeProject(route,nx,nz,progress),radius=Math.max(.18,hit.width-.22);
    if(hit.distance>radius){x=hit.x+(nx-hit.x)*radius/hit.distance;z=hit.z+(nz-hit.z)*radius/hit.distance;}else{x=nx;z=nz;}
    // Re-project after lateral clamping so height and progress match the final foot position.
    const foot=routeProject(route,x,z,progress);progress=foot.progress;
    y+=(foot.y+eye-y)*(1-Math.exp(-dt*18));
   }
   const distance=Math.hypot(x-oldX,z-oldZ);stride+=distance*2*Math.PI/.72;
   const targetBob=walkingMotion&&!reducedMotion?.matches&&grounded
    ?Math.sin(stride)*.009*Math.min(1,distance/(Math.max(dt,.001)*.6)):0;
   bob+=(targetBob-bob)*(1-Math.exp(-dt*18));
   if(jumpV!==0||jumpY>0){jumpV-=9.8*dt;jumpY+=jumpV*dt;if(jumpY<=0){jumpY=0;jumpV=0;}}
  }
  render();if(!surface)world.dataset.routeProgress=progress.toFixed(2);
 }
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',stop);
 const visibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',visibility);
 document.addEventListener('explorer-menu-open',stop);
 canvas.addEventListener('pointerdown',pointerdown);canvas.addEventListener('pointermove',pointermove);canvas.addEventListener('pointerup',pointerup);canvas.addEventListener('pointercancel',pointercancel);canvas.addEventListener('lostpointercapture',pointercancel);
 viewer.app.on('update',update);reset();
 return {getPose,restorePose,setWalkingMotion(v){walkingMotion=Boolean(v);if(!v)bob=0;},setMoveInput(a,b){moveX=a;moveZ=b;},reset,stop,jump,setEnabled(v){enabled=v;if(!v)stop();},destroy(){viewer.app.off('update',update);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('explorer-menu-open',stop);canvas.removeEventListener('pointerdown',pointerdown);canvas.removeEventListener('pointermove',pointermove);canvas.removeEventListener('pointerup',pointerup);canvas.removeEventListener('pointercancel',pointercancel);canvas.removeEventListener('lostpointercapture',pointercancel);}};
}
