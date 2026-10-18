import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createPlayerModel} from './player-model.mjs';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
const exported=Buffer.from(await new GLTFExporter().parseAsync(createPlayerModel(),{binary:true,onlyVisible:true}));
const jsonLength=exported.readUInt32LE(12),document=JSON.parse(exported.subarray(20,20+jsonLength));
// Keep original PNG bytes and alpha. Append them as aligned GLB buffer views so
// both PlayCanvas and the Three preview load a single cache-versioned model.
const parts=[exported.subarray(28+jsonLength)];let byteLength=parts[0].length;
document.images=[];document.textures=[];
document.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];
for(const [name,file] of [['Front tag print','front-tag.png'],['Back loading print','back-loading.png']]){
 const png=await readFile(`realtrip/models/player/prints/${file}`),index=document.images.length;
 const view=document.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:png.length})-1;
 document.images.push({name:file,bufferView:view,mimeType:'image/png'});
 document.textures.push({source:index,sampler:0});
 const material=document.materials.find(m=>m.name===name);
 if(!material)throw new Error(`Missing print material: ${name}`);
 material.pbrMetallicRoughness.baseColorTexture={index};material.alphaMode='MASK';material.alphaCutoff=.25;
 const padding=Buffer.alloc((4-png.length%4)%4);parts.push(png,padding);byteLength+=png.length+padding.length;
}
document.buffers[0].byteLength=byteLength;
const json=Buffer.from(JSON.stringify(document)),jsonPadding=Buffer.alloc((4-json.length%4)%4,0x20),binary=Buffer.concat(parts);
const header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+jsonPadding.length+binary.length,8);
header.writeUInt32LE(json.length+jsonPadding.length,12);header.write('JSON',16);
binHeader.writeUInt32LE(binary.length);binHeader.writeUInt32LE(0x004e4942,4);
const glb=Buffer.concat([header,json,jsonPadding,binHeader,binary]);
await mkdir('realtrip/models/player',{recursive:true});
await writeFile('realtrip/models/player/personal-avatar.glb',glb);
console.log(`Personal avatar: ${(glb.byteLength/1024).toFixed(0)} KB`);
