import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {createTerrainSurface} from '../src/terrain-surface.js';
import {explorerScenes} from '../src/explorer-ui.js';
const scene=JSON.parse(readFileSync(new URL('../src/hackathon.json',import.meta.url)));
const terrain=JSON.parse(readFileSync(new URL('../public/hackathon/terrain.json',import.meta.url)));
const surface=createTerrainSurface({...terrain,...scene.navigation});
test('original Hackathon terrain remains available while the shared scenes lead the menu',()=>{
 assert.deepEqual(explorerScenes.map(([id])=>id),['insta360-5bfe','two-floor','building2','terrace','cafeteria']);
 const [x,,z]=scene.settings.cameras[0].initial.position;assert(surface.contains(x,z));
 assert.match(readFileSync(new URL('../src/walker.js',import.meta.url),'utf8'), /\?requested:'insta360-5bfe'/);
});
test('front passage and both stair aisles are continuously walkable in both directions',()=>{
 for(const x of [-2.22,-1.12,2.08,3.19,-5.38,6.18]){
  const route=[[-3,.2],[x,.2],[x,-1.3],[x,-2.6]];
  let p={x:-3,z:.2};let low=Infinity,high=-Infinity;
  for(const [x,z] of [...route,...route.toReversed()]){p=surface.move(p.x,p.z,x,z);assert(Math.hypot(p.x-x,p.z-z)<1e-6,`cannot reach ${x}, ${z}: ${JSON.stringify(p)}`);low=Math.min(low,p.y);high=Math.max(high,p.y);}
  assert(high-low>.65);
 }
});
test('seats, columns, stage edge and missing exterior cannot be crossed',()=>{
 for(const p of [[0,-.4],[-3,-1],[4,-1.5],[-1.6,-.5],[2.6,-.5],[0,1.3],[-8,0],[0,-8]])assert(!surface.contains(...p),p.join(','));
 const p=surface.move(0,0,0,-3);assert(p.z>-.23);assert(surface.contains(p.x,p.z));
});
test('real captured content occupies three fixed physical screens',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../public/hackathon/provenance.json',import.meta.url)));
 assert.equal(scene.screens.panels.length,3);assert.equal(provenance.screenMethod.sourceCapture,2);assert.equal(provenance.peopleRemoval,false);assert.equal(provenance.retainedAttributesLossless,true);
 assert(scene.screens.panels.every(p=>p.bounds[0]<p.bounds[1]&&p.bounds[2]<p.bounds[3]&&p.z>1.8));
 assert(!scene.supplements?.length);
});
