import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWalkSurface} from '../src/walk-surface.js';

const scene=JSON.parse(readFileSync(new URL('../src/terrace.json',import.meta.url)));
const surface=createWalkSurface(scene.navigation);

test('terrace starts stand on the calibrated floor and the exported asset is intact',()=>{
 for(const start of Object.values(scene.waypoints)){
  assert(surface.contains(start.position[0],start.position[2]));
  assert(Math.abs(start.position[1]-surface.floorY-surface.eyeHeight)<1e-6);
 }
 const model=readFileSync(new URL('../public/terrace/scene.sog',import.meta.url));
 assert.equal(createHash('sha256').update(model).digest('hex'),'b2fcad5b76f236a8a39d19dd0c2fa7896409857b37ae3f4cb07a5a06fa50b647');
});

test('floor leveling puts the original tilted floor normal upright',()=>{
 const [x,y,z,w]=scene.modelRotation;
 assert(Math.abs(Math.hypot(x,y,z,w)-1)<1e-8);
 // Raw SOG normal, before the renderer default X/Y flip and the leveling rotation.
 const v=[-.0927900053,-1,-.1042001866];
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const t=cross([x,y,z],v).map(n=>2*n),u=cross([x,y,z],t);
 const normal=v.map((n,i)=>n+w*t[i]+u[i]);
 assert(Math.abs(normal[0])<1e-7&&Math.abs(normal[2])<1e-7);
 assert(normal[1]>1);
});

test('entrance, central terrace, both ends and return share continuous open ground',()=>{
 const path=[[-2.029,2.016],[-1.1,1.65],[.75,.1],[.75,-4.8],[1.7,-5.7],[.75,-4.8],[.75,.1],[.75,5.2],[-.5,5.5],[-.5,2.15],[-1.1,1.65],[-2.029,2.016]];
 let [x,z]=path[0];
 for(const [nx,nz] of path.slice(1)){
  const foot=surface.move(x,z,nx,nz);
  assert(Math.hypot(foot.x-nx,foot.z-nz)<1e-6,`blocked at ${nx},${nz}: ${JSON.stringify(foot)}`);
  assert.equal(foot.y,surface.floorY);({x,z}=foot);
 }
});

test('tables, planters, glass sides and railings block even large movement steps',()=>{
 for(const [from,to] of [
  [[.75,.18],[-1.38,.18]],[[.75,-1.52],[-1.28,-1.52]],
  [[.75,3.15],[-1.55,3.15]],[[.75,-3.48],[2.35,-3.48]],
  [[.75,-.6],[5,-.6]],[[.75,5.2],[.75,9]],
  [[1.7,-5.7],[1.7,-10]],[[.75,-4],[-4,-4]]
 ]){
  assert(surface.contains(...from));
  const hit=surface.move(...from,...to);
  assert(surface.contains(hit.x,hit.z));
  assert(Math.hypot(hit.x-to[0],hit.z-to[1])>.25);
 }
});
