import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('./imported-scenes.json',import.meta.url)));
for(const file of manifest.files){
 const source=new URL('../'+file.local,import.meta.url),data=readFileSync(source);
 if(data.length!==file.bytes||createHash('sha256').update(data).digest('hex')!==file.sha256)
  throw Error('Imported scene checksum mismatch: '+file.local);
 if(file.local.startsWith('models/')){
  const target=new URL('../public/'+file.local.slice(7,-4)+'/',import.meta.url);
  mkdirSync(target,{recursive:true});copyFileSync(source,new URL('scene.sog',target));
 }
}
console.log('Imported scenes verified against '+manifest.commit.slice(0,8));
