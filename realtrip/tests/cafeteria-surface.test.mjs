import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWalkSurface} from '../src/walk-surface.js';
import {explorerScenes,explorerScenePath} from '../src/explorer-ui.js';
const scene=JSON.parse(readFileSync(new URL('../src/cafeteria.json',import.meta.url)));
const surface=createWalkSurface(scene.navigation);
const assetRoot='../public/cafeteria/';
test('cafeteria preserves the three existing scenes and has a shareable entrance',()=>{
 assert.deepEqual(explorerScenes.map(x=>x[0]),['hackathon','honor-corridor','building2','terrace','cafeteria']);
 assert.equal(explorerScenePath('cafeteria','/walk/'),'/walk/?scene=cafeteria');
 assert(!explorerScenes.some(([,label])=>label.includes('去人')));
});
test('cafeteria starts share the calibrated floor and both source partitions retain people',()=>{
 for(const s of Object.values(scene.waypoints)){
  assert(surface.contains(s.position[0],s.position[2]),JSON.stringify(s.position));
  assert(Math.abs(s.position[1]-surface.floorY-surface.eyeHeight)<1e-6);
  assert.equal(s.landscapeFov,84);
 }
 const report=JSON.parse(readFileSync(new URL(assetRoot+'provenance.json',import.meta.url)));
 assert.equal(report.hiddenHumanSplats,0);assert.equal(report.peopleRetained,true);
 for(const [i,file] of ['scene.sog','dining.sog'].entries()){
  const model=readFileSync(new URL(assetRoot+file,import.meta.url)),part=report.parts[i];
  assert.equal(model.length,part.bytes);
  assert.equal(createHash('sha256').update(model).digest('hex'),part.modelSHA256);
  assert.equal(part.retainedAttributesLossless,true);assert.equal(part.peopleRemoval,false);
 }
 assert.equal(report.parts[0].sourceSHA256,'79930154e6f2306642058935509fbbfd7f59747994eefe80f63faab09afea38f');
 assert.equal(report.parts[1].sourceSHA256,'96afd1a717c17c4827d126338780ca48c2138b8781a5395f2d62ab4fe3c03683');
 assert.equal(scene.supplements.length,1);
 assert(report.gaussians>1000000&&report.gaussians<1500000);
});
test('the previously blocked dining direction connects to the entrance in both directions',()=>{
 const aisle=[[-4.65,.65],[-3,.4],[-2.92,-.65],[-2.92,-1.6],[-3.55,-2.08],[-4,-2.5],[-4,-3.18]];
 for(const path of [aisle,[...aisle].reverse()]){
  let [x,z]=path[0];
  for(const [nx,nz] of path.slice(1)){
   const next=surface.move(x,z,nx,nz);
   assert(Math.hypot(next.x-nx,next.z-nz)<1e-6,`Dining aisle blocked ${x},${z} -> ${nx},${nz}: ${JSON.stringify(next)}`);
   assert.equal(next.y,surface.floorY);({x,z}=next);
  }
 }
});
test('dining tables, occupied benches and the uncaptured far rows remain blocked',()=>{
 for(const [from,to] of [[[ -3,-.9],[-3.7,-.9]],[[-3.6,-2.15],[-4.15,-1.85]],[[-4,-2.7],[-4.7,-2.7]],[[-4,-3.18],[-4,-5]]]){
  assert(surface.contains(...from));const hit=surface.move(...from,...to);
  assert(surface.contains(hit.x,hit.z));assert(Math.hypot(hit.x-to[0],hit.z-to[1])>.2);
 }
});
const route=[[-4.65,.65],[-2.5,.4],[-1.65,-.7],[3.8,-.7],[3.8,-3.2],[.6,-3.2],[-.7,-3.2],[-.7,-5.1],[-1.1,-3],[-1.5,-.7],[-1.72,2.35],[.7,2.35],[3.8,2.4],[4.13,2.35],[4.13,-.7],[3.8,-.7],[-1.65,-.7],[-2.5,.4],[-4.65,.65]];
test('entrance, counter aisle, central aisle and dining edge connect in both directions',()=>{
 for(const points of [route,[...route].reverse()]){
  let [x,z]=points[0];
  for(const [nx,nz] of points.slice(1)){
   const foot=surface.move(x,z,nx,nz);
   assert(Math.hypot(foot.x-nx,foot.z-nz)<1e-6,`blocked ${x},${z} → ${nx},${nz}: ${JSON.stringify(foot)}`);
   assert.equal(foot.y,surface.floorY);({x,z}=foot);
  }
 }
});
test('columns, barriers, counters and scan boundaries block swept movement',()=>{
 for(const [from,to] of [
  [[-1.65,.3],[.5,.3]],[[.7,2.35],[1.8,1.5]],[[3.8,-2.4],[1.9,-2.4]],
  [[-.8,2.35],[-1.1,3.1]],[[3.8,-.7],[8,-.7]],[[-.7,-5.1],[-.7,-8]],
  [[-1.5,-2.5],[-3,-2.5]],[[-4.65,.65],[-4.65,4]]
 ]){
  assert(surface.contains(...from));const hit=surface.move(...from,...to);
  assert(surface.contains(hit.x,hit.z));assert(Math.hypot(hit.x-to[0],hit.z-to[1])>.2);
 }
});
