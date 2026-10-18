import {build} from 'esbuild';
import {cp,mkdir,readFile,rm,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {viewerPhysicsPlugin} from './viewer-physics-plugin.mjs';
// This route has its own document and bundles. It never rewrites dist/walk.
// Venue, collision, Xiaolan and voice configuration continue to resolve in ../walk/.
const out='dist/walk-me',hash=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,12);
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const modelFile=`personal-avatar.${hash(await readFile('realtrip/models/player/personal-avatar.glb'))}.glb`;
await cp('realtrip/models/player/personal-avatar.glb',`${out}/${modelFile}`);
await build({entryPoints:['realtrip/src/companion/avatar-preview.js'],bundle:true,minify:true,legalComments:'inline',format:'esm',outfile:`${out}/avatar-preview.bundle.js`});
const previewFile=`avatar-preview.${hash(await readFile(`${out}/avatar-preview.bundle.js`))}.js`;
await rename(`${out}/avatar-preview.bundle.js`,`${out}/${previewFile}`);
await build({entryPoints:['realtrip/src/companion-walker.js'],bundle:true,minify:true,legalComments:'linked',format:'esm',outfile:`${out}/companion.bundle.js`,external:['node:worker_threads'],plugins:[viewerPhysicsPlugin],define:{__PLAYER_MODEL_FILE__:JSON.stringify(modelFile),__PLAYER_PREVIEW_FILE__:JSON.stringify(previewFile)}});
let html=await readFile('realtrip/companion/index.html','utf8');
for(const file of ['companion.bundle.js','companion.bundle.css'])html=html.replace(new RegExp(`(\\./${file})(?:\\?[^"#]*)?`,'g'),`$1?v=${hash(await readFile(`${out}/${file}`))}`);
await writeFile(`${out}/index.html`,html);
console.log('Independent avatar experience → dist/walk-me/');
