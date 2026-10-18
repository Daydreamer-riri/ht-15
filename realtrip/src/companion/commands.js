// Voice transcripts and typed requests enter the same action path. Questions,
// quoted examples and negated requests must remain ordinary conversation.
export function companionCommand(text){
 const t=String(text).trim().replace(/[，。！？、,.!?\s]/g,'');
 if(/^(取消|停止|算了|不拍了|别过来|不要过来|不用过来|别拍|不要拍|不用拍)/.test(t.replace(/^(小蓝|小兰|小懒)/,'')))return 'cancel';
 if(/怎么|如何|能不能教|是什么意思|为什么|如果|假如|[“”「」"']/.test(t)||/(不要|不用|别|不想|不需要).*(过来|拍|合影)/.test(t))return null;
 if(/合(个|张|一张)?(影|照)|一起.{0,6}拍.{0,3}(照|照片)|拍.{0,3}(合照|合影)|^(小蓝|小兰|小懒)?(来|咱们|我们|帮我|给我|可以|能不能|请)?.{0,3}拍(个|一张|张)?照(吧|片|好吗|可以吗)?$/.test(t))return 'photo';
 if(/过来|来我(这|身边|旁边)|到我(这|身边|旁边)|来这边|靠近我/.test(t))return 'come';
 if(/挥(个|一挥)?手|打个招呼/.test(t))return 'wave';
 return null;
}

export function approachCandidates(player,npc,yaw,{photo=false}={}){
 const angle=yaw*Math.PI/180,right=[Math.cos(angle),-Math.sin(angle)];
 const toward=Math.atan2(npc[0]-player[0],npc[2]-player[2]);
 const directions=photo?[Math.atan2(right[0],right[1]),Math.atan2(-right[0],-right[1]),toward,toward+.6,toward-.6,toward+1.2,toward-1.2]:[toward,toward+.6,toward-.6,toward+1.2,toward-1.2,toward+Math.PI];
 return directions.flatMap(a=>(photo?[.72,.85]:[.83,1.0]).map(r=>[player[0]+Math.sin(a)*r,npc[1],player[2]+Math.cos(a)*r]));
}
