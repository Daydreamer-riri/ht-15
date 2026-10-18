import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {createPlayerModel} from './player-model.mjs';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
const glb=await new GLTFExporter().parseAsync(createPlayerModel(),{binary:true,onlyVisible:true});
await mkdir('realtrip/models/player',{recursive:true});
await writeFile('realtrip/models/player/personal-avatar.glb',Buffer.from(glb));
console.log(`Personal avatar: ${(glb.byteLength/1024).toFixed(0)} KB`);
