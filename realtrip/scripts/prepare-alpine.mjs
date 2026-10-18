import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const model=JSON.parse(readFileSync(new URL('./alpine-model.json',import.meta.url)));
const source=new URL('../models/'+model.name,import.meta.url),data=readFileSync(source);
if(data.length!==model.bytes||createHash('sha256').update(data).digest('hex')!==model.sha256)throw Error('Alpine model checksum mismatch');
const target=new URL('../public/alpine-lake/',import.meta.url);mkdirSync(target,{recursive:true});
copyFileSync(source,new URL('scene.sog',target));console.log('Alpine lake model prepared',data.length,'bytes');
