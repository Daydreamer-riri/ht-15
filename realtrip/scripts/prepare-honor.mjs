import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url)), manifest=JSON.parse(readFileSync(path.join(here,'honor-model.json'),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const buffers=manifest.parts.map(p=>{const b=readFileSync(path.resolve(here,'../models',p.name));if(b.length!==p.bytes||sha(b)!==p.sha256)throw Error('Honor model part checksum mismatch: '+p.name);return b;});
const data=Buffer.concat(buffers);if(data.length!==manifest.bytes||sha(data)!==manifest.sha256)throw Error('Honor model checksum mismatch');
const out=path.resolve(here,'../public/honor-corridor');mkdirSync(out,{recursive:true});writeFileSync(path.join(out,'scene.sog'),data);console.log('Honor model prepared',data.length,'bytes');
