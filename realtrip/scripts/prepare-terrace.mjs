import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source=new URL('../models/terrace-20261017.sog',import.meta.url);
const target=new URL('../public/terrace/scene.sog',import.meta.url);
const data=readFileSync(source);
if(data.length!==16222873||createHash('sha256').update(data).digest('hex')!=='b2fcad5b76f236a8a39d19dd0c2fa7896409857b37ae3f4cb07a5a06fa50b647')throw Error('Terrace model checksum mismatch');
mkdirSync(new URL('../public/terrace/',import.meta.url),{recursive:true});copyFileSync(source,target);
console.log('Terrace model prepared',data.length,'bytes');
