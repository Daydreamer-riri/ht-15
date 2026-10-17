import {readFileSync,copyFileSync,mkdirSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
const models=JSON.parse(readFileSync(new URL('./cafeteria-models.json',import.meta.url)));
const target=new URL('../public/cafeteria/',import.meta.url);
mkdirSync(target,{recursive:true});
for(const name of ['original.sog','original-provenance.json','cleanup-report.json'])rmSync(new URL(name,target),{force:true});
for(const model of models){
 const source=new URL('../models/'+model.name,import.meta.url),data=readFileSync(source);
 if(data.length!==model.bytes||createHash('sha256').update(data).digest('hex')!==model.sha256)throw Error('Cafeteria model checksum mismatch: '+model.name);
 copyFileSync(source,new URL(model.target,target));console.log('Cafeteria part prepared',model.name,data.length,'bytes');
}
