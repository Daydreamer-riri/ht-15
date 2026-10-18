import {cameraClearance} from './follow-camera.js';

export function photoView(player,npc,{eyeHeight=.8,aspect=.9,cast}={}){
 const dx=npc[0]-player[0],dz=npc[2]-player[2],gap=Math.hypot(dx,dz),normal=[dz/(gap||1),-dx/(gap||1)];
 const target=[(player[0]+npc[0])/2,((player[1]-eyeHeight+.47)+(npc[1]+.43))/2,(player[2]+npc[2])/2];
 const distance=Math.max(1.35,(gap+.58)/(2*Math.tan(29*Math.PI/180)*Math.max(.35,aspect))*1.12);
 for(const sign of [1,-1])for(const rotation of [0,.3,-.3]){
  const direction=[(normal[0]*Math.cos(rotation)-normal[1]*Math.sin(rotation))*sign,(normal[0]*Math.sin(rotation)+normal[1]*Math.cos(rotation))*sign];
  const desired=[target[0]+direction[0]*distance,target[1]+.12,target[2]+direction[1]*distance],position=cameraClearance(target,desired,cast);
  if(Math.hypot(...position.map((v,i)=>v-target[i]))<distance*.90)continue;
  return {position,target,distance,yaw:Math.atan2(direction[0],direction[1])*180/Math.PI};
 }
 return null;
}

export function captureTimestamp(date){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 return {date:`${parts.year}.${parts.month}.${parts.day}`,time:`${parts.hour}:${parts.minute}:${parts.second}`,filename:`xiaolan-${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}.png`};
}

// Compose the actual rendered scene locally: no photo upload or AI replacement.
// The timestamp belongs to the captured frame, including after save or share.
export async function createSouvenirPoster(frame,capturedAt){
 const shot=document.createElement('canvas');shot.width=frame.width;shot.height=frame.height;
 const bytes=Uint8ClampedArray.from(atob(frame.data),c=>c.charCodeAt(0));
 shot.getContext('2d').putImageData(new ImageData(bytes,frame.width,frame.height),0,0);
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const c=canvas.getContext('2d'),stamp=captureTimestamp(capturedAt);
 const background=c.createLinearGradient(0,0,1080,1440);background.addColorStop(0,'#071b30');background.addColorStop(.55,'#112137');background.addColorStop(1,'#130f28');c.fillStyle=background;c.fillRect(0,0,1080,1440);
 for(const [x,y,color] of [[950,150,'#19d4ff'],[80,1320,'#795cff']]){c.save();c.globalAlpha=.23;const glow=c.createRadialGradient(x,y,0,x,y,560);glow.addColorStop(0,color);glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(0,0,1080,1440);c.restore();}
 c.strokeStyle='#73dff318';c.lineWidth=1;for(let i=28;i<1080;i+=44){c.beginPath();c.moveTo(i,0);c.lineTo(i,1440);c.stroke();}
 c.fillStyle='#8ff2ef';c.font='600 20px -apple-system, sans-serif';c.fillText('HACKATHON  /  MEMORY CAPTURE',46,57);
 c.fillStyle='#f4fbff';c.font='700 58px -apple-system, "PingFang SC", sans-serif';c.fillText('我和小蓝，一起入镜。',44,130);
 c.font='500 19px -apple-system, sans-serif';c.fillStyle='#bdcbdc';c.fillText('A LITTLE MOMENT. A BIG IDEA.',48,170);
 const x=44,y=208,w=992,h=1102;
 c.save();c.beginPath();c.roundRect(x,y,w,h,28);c.clip();c.drawImage(shot,x,y,w,h);c.restore();
 const border=c.createLinearGradient(x,y,x+w,y+h);border.addColorStop(0,'#75ffe7');border.addColorStop(.5,'#ffffff55');border.addColorStop(1,'#9678ff');c.strokeStyle=border;c.lineWidth=3;c.beginPath();c.roundRect(x,y,w,h,28);c.stroke();
 c.fillStyle='#0a142ad9';c.beginPath();c.roundRect(65,1234,950,55,14);c.fill();
 c.fillStyle='#ddf8ff';c.font='500 20px -apple-system, "PingFang SC", sans-serif';c.fillText('在同一个会场，留下这一次相遇。',85,1269);
 c.fillStyle='#b3c9db';c.font='500 17px -apple-system, sans-serif';c.fillText('CAPTURED  /  北京时间',47,1352);
 c.fillStyle='#fff';c.font='600 29px ui-monospace, "SFMono-Regular", monospace';c.fillText(`${stamp.date}  ${stamp.time}`,46,1397);
 c.textAlign='right';c.fillStyle='#a8e9eb';c.font='600 17px -apple-system, sans-serif';c.fillText('ME × XIAOLAN',1035,1397);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('图片生成失败，请再试一次。');
 return {blob,filename:stamp.filename,stamp};
}
