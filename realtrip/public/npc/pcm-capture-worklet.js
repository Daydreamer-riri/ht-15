class NpcPcmCapture extends AudioWorkletProcessor {
 constructor(){super();this.pending=new Float32Array(2048);this.offset=0;}
 process(inputs){
  const mono=inputs[0]?.[0];if(!mono)return true;
  for(let i=0;i<mono.length;i++){
   this.pending[this.offset++]=mono[i];
   if(this.offset===this.pending.length){this.port.postMessage(this.pending,[this.pending.buffer]);this.pending=new Float32Array(2048);this.offset=0;}
  }
  return true;
 }
}
registerProcessor('npc-pcm-capture',NpcPcmCapture);
