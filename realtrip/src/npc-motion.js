// Joint targets are independent from the renderer so transitions and reduced
// motion behavior can be verified without running a GPU or a speech service.
export function npcMotion(t,{state='idle',greeting=0,near=false,reduced=false,speed=0,turn=0,reaction=0}={}){
 const rest={hover:0,roll:0,bodyY:.16,bodyX:0,bodyZ:1.4,headX:0,headY:0,headZ:2,armLX:0,armLZ:-20,armRX:0,armRZ:27,legLZ:6.8,legRZ:-5.7,mouth:1,eyes:1};
 if(reduced)return rest;
 const pose={...rest,hover:.027*Math.sin(t*1.7),roll:1.3*Math.sin(t*.9),bodyY:.16+.012*Math.sin(t*2),bodyZ:1.4+1.8*Math.sin(t*1.2),headY:near?2*Math.sin(t*.65):10*Math.sin(t*.55),headZ:2+3*Math.sin(t*1.1),armLZ:-20+5*Math.sin(t*1.6),armRZ:27+4*Math.sin(t*1.6+.8),legLZ:6.8+1.4*Math.sin(t*1.2),legRZ:-5.7-1.4*Math.sin(t*1.2)};
 const blink=t%4.7;pose.eyes=blink<.18?Math.max(.08,Math.abs(blink-.09)/.09):1;
 const glide=Math.min(1,speed/.22);pose.bodyX=-7*glide;pose.bodyZ+=Math.max(-4,Math.min(4,turn*.06))*glide;pose.roll-=Math.max(-3,Math.min(3,turn*.045))*glide;pose.armLZ-=8*glide;pose.armRZ+=8*glide;
 if(state==='listening'){pose.headZ=-10;pose.headX=3*Math.sin(t*2.2);pose.armLZ=-112;pose.armLX=-22;}
 if(state==='thinking'){pose.headZ=8;pose.headY=-8;pose.headX=-5+2*Math.sin(t*1.6);pose.armRZ=66;pose.armRX=-35;}
 if(state==='speaking'){pose.headX=3*Math.sin(t*3.2);pose.headZ=3*Math.sin(t*1.8);pose.armLZ=-40+13*Math.sin(t*2.4);pose.armLX=-12;pose.armRZ=46+15*Math.sin(t*2.2+.8);pose.armRX=-15+12*Math.sin(t*2.4);pose.mouth=.65+Math.abs(Math.sin(t*12))*.7;}
 if(greeting>0&&state==='idle'){pose.armLZ=-134+19*Math.sin(t*9);pose.armLX=-8;pose.headZ=-4;pose.headX=4*Math.sin(t*3);pose.bodyZ=3;}
 if(reaction>0){const bump=Math.sin(Math.min(1,reaction/1.25)*Math.PI);pose.bodyX+=10*bump;pose.bodyZ-=7*bump;pose.headZ+=8*bump;pose.armLZ-=24*bump;pose.armRZ+=20*bump;}
 return pose;
}

export function blendNpcMotion(current,target,dt,reduced=false){
 const amount=reduced?1:1-Math.exp(-Math.max(0,Math.min(dt,.1))*12);
 return Object.fromEntries(Object.entries(target).map(([key,value])=>[key,current[key]+(value-current[key])*amount]));
}
