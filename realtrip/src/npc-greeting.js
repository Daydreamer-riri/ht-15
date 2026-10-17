// Dwell + a cooldown prevent repeated greetings at the edge of the approach
// radius. Starting a conversation consumes this visit's greeting as well.
export function createNpcGreeting({dwell=.6,cooldown=30}={}){
 let entered=null,used=false,last=-Infinity;
 return {
  update(near,busy,now){
   if(!near){entered=null;used=false;return false;}
   if(entered===null)entered=now;
   if(busy)used=true;
   if(used||now-entered<dwell)return false;
   used=true;
   if(now-last<cooldown)return false;
   last=now;return true;
  },
  dismiss(){used=true;},
 };
}
