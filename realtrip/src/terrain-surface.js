// Height samples come from a supplied collision mesh or a reviewed scan surface.
// Missing samples are barriers, never a synthetic flat floor.
export function createTerrainSurface(config) {
 const {origin,cellSize:cell,width,depth,heights,radius=.22,eyeHeight=1.55,speed=1.35,maxSlope=.85}=config;
 if(!Array.isArray(origin)||origin.length!==2||!origin.every(Number.isFinite)||!(cell>0)||!Number.isInteger(width)||!Number.isInteger(depth)||width<2||depth<2||heights.length!==width*depth||!(radius>0))throw new Error('Invalid terrain surface');
 const samples=heights.map(v=>v===null?NaN:v);
 function heightAt(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return NaN;
  const gx=(x-origin[0])/cell,gz=(z-origin[1])/cell,ix=Math.floor(gx),iz=Math.floor(gz);
  if(ix<0||iz<0||ix>=width-1||iz>=depth-1)return NaN;
  const tx=gx-ix,tz=gz-iz,i=iz*width+ix;
  const a=samples[i],b=samples[i+1],c=samples[i+width],d=samples[i+width+1];
  return (a*(1-tx)+b*tx)*(1-tz)+(c*(1-tx)+d*tx)*tz;
 }
 const ring=Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/6)*radius,Math.sin(i*Math.PI/6)*radius]);
 function contains(x,z){
  const y=heightAt(x,z);
  return Number.isFinite(y)&&ring.every(([dx,dz])=>{
   const h=heightAt(x+dx,z+dz);
   return Number.isFinite(h)&&Math.abs(h-y)<=radius*maxSlope+.04;
  });
 }
 function move(x,z,nx,nz){
  if(![x,z,nx,nz].every(Number.isFinite)||!contains(x,z))return {x,z,y:heightAt(x,z)};
  // Sweep in sub-cell increments so frame stalls cannot tunnel over gaps/cliffs.
  const count=Math.max(1,Math.ceil(Math.hypot(nx-x,nz-z)/Math.min(cell*.35,radius*.3)));
  if(count>20000)return {x,z,y:heightAt(x,z)};
  const dx=(nx-x)/count,dz=(nz-z)/count;
  const canStep=(a,b)=>contains(a,b)&&Math.abs(heightAt(a,b)-heightAt(x,z))<=Math.hypot(a-x,b-z)*maxSlope+.012;
  for(let i=0;i<count;i++){
   if(canStep(x+dx,z+dz)){x+=dx;z+=dz;}
   else{
    if(canStep(x+dx,z))x+=dx;
    if(canStep(x,z+dz))z+=dz;
   }
  }
  return {x,z,y:heightAt(x,z)};
 }
 return {contains,move,heightAt,eyeHeight,speed,jumpSpeed:config.jumpSpeed??2.6};
}
