import {strict as assert} from 'node:assert';
import {routeProject} from '../src/office-navigation.js';

const route={
 points:[[0,0,0],[0,0,-1],[0,0,-2], [.1,0,-2],[.1,0,-3],[.1,0,-4], [0,3,0],[0,3,-1]],
 segments:[[0,1],[1,2],[3,4],[4,5],[6,7]],
 width:Array(8).fill(.65),
 neighbors:[[[0,0],[1,1],[2,2],[3,3]],[[1,0],[0,1],[2,1],[3,2]],[[2,0],[3,1],[1,1],[0,2]],[[3,0],[2,1],[1,2],[0,3]],[[4,0]]]
};
let progress=0;
for(let z=0;z>=-4;z-=.025){
 const hit=routeProject(route,.05,z,progress);
 assert.equal(hit.y,0,'Never snap to an overlapping upper floor');
 progress=hit.progress;
}
assert(progress>3.8,'Can walk across an evidenced junction into the next clip');
for(let z=-4;z<=0;z+=.025)progress=routeProject(route,.05,z,progress).progress;
assert(progress<.2,'Can return through the same junction');
const upper=routeProject(route,0,-.5,4);
assert.equal(upper.y,3,'Starting on an upper floor keeps that component');
const disconnected={...route,neighbors:[[[0,0],[1,1]],[[1,0],[0,1]],[[2,0],[3,1]],[[3,0],[2,1]],[[4,0]]]};
const blocked=routeProject(disconnected,.1,-4,0);
assert.equal(blocked.i,1,'Disconnected clips never connect by their file order');
assert.equal(blocked.z,-2,'Projection stops at the real endpoint');
const far={points:[[0,0,0],[0,0,-1],[50,0,-1],[50,0,-2]],width:[1,1,1,1],segments:[[0,1],[2,3]]};
assert(routeProject(far,25,-1).distance>=25,'No implicit segment bridges independent clips');
// A real flat-aisle capture walks forward, briefly doubles back, then continues.
// The walker must be able to leave the earlier endpoint without being pinned
// by the capture chronology. This fixture previously stopped near z=-3.4.
const loopPoints=[[.201,0,-1.55],[.283,0,-1.785],[.298,0,-2.034],[.365,0,-2.262],[.331,0,-2.509],[.260,0,-2.749],[.189,0,-2.988],[.115,0,-3.227],[.155,0,-3.201],[.279,0,-2.984],[.403,0,-2.767],[.520,0,-2.546],[.444,0,-2.647],[.366,0,-2.880],[.294,0,-3.115],[.282,0,-3.364],[.241,0,-3.607],[.285,0,-3.851],[.336,0,-4.076],[.478,0,-4.258]];
const loop={points:loopPoints,width:loopPoints.map(()=>.35),floorMode:'reviewed-level'};
let px=.3,pz=-2,pp=1;
for(let tick=0;tick<250;tick++){
 const nx=px,nz=pz-.02,h=routeProject(loop,nx,nz,pp),radius=.18;
 if(h.distance>radius){px=h.x+(nx-h.x)*radius/h.distance;pz=h.z+(nz-h.z)*radius/h.distance;}else{px=nx;pz=nz;}
 pp=routeProject(loop,px,pz,pp).progress;
}
assert(pz<-4.1,'Reviewed flat aisle remains walkable past a backtracking capture loop');
assert(pp>17,'Progress reaches the later forward pass');
console.log('Walk network: bidirectional junctions, separate floors, disconnected endpoints and explicit segments pass.');
