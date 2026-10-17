import {mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const folder=resolve('target/npc-voice-fc'),zip=resolve('target/npc-voice-fc.zip');
await mkdir(folder,{recursive:true});
// Explicit allowlist: credentials, frontend config and recordings never enter it.
for(const name of ['app.mjs','provider.mjs','fc.mjs'])await copyFile('voice-server/'+name,folder+'/'+name);
await writeFile(folder+'/index.mjs',"export {handler} from './fc.mjs';\n");
await rm(zip,{force:true});execFileSync('zip',['-q',zip,'index.mjs','app.mjs','provider.mjs','fc.mjs'],{cwd:folder});
console.log(zip);
