import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source=new URL('../models/building2-doorway-20261017.sog',import.meta.url);
const target=new URL('../public/building2/scene.sog',import.meta.url);
const data=readFileSync(source);
if(data.length!==16265345||createHash('sha256').update(data).digest('hex')!=='3218e14007b451c85fc74f0327378d1a5d8b845a486055a7c5ad1c0515d1ceed')throw Error('Building 2 model checksum mismatch');
mkdirSync(new URL('../public/building2/',import.meta.url),{recursive:true});copyFileSync(source,target);
console.log('Building 2 model prepared',data.length,'bytes');
