import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDayTrip, distanceMeters, project, samplePath, tailPath, resolveSelection, pageUrl, makePath, clipPathToCampus } from '../src/sky-soho/model.js';
const data=JSON.parse(readFileSync(new URL('../src/sky-soho/data/itinerary.json',import.meta.url)));
const model=buildDayTrip(data);

test('Sky SOHO preserves five stops, all six original connections, return and unscheduled places',()=>{
 assert.deepEqual(model.stops.map(s=>s.name),['8号楼','工区','茶水间','会议室','健身房']);
 const sourceLegs=[...data.days[0].items.map(item=>item.leg),data.days[0].returnLeg];
 assert.deepEqual(model.chapters.map(chapter=>chapter.points),sourceLegs.map(leg=>leg.points));
 assert.equal(model.pointCount,26);assert.equal(model.chapters.length,6);assert.equal(model.minutes,36);assert.equal(model.distance,2640);
 assert.deepEqual(model.chapters[0].points[0],[31.21998,121.35582]);assert.deepEqual(model.chapters.at(-1).points.at(-1),model.chapters[0].points[0]);
 for(let i=1;i<model.chapters.length;i++)assert.deepEqual(model.chapters[i].points[0],model.chapters[i-1].points.at(-1));
 assert.deepEqual(data.toBePlanned.map(p=>p.name),['携程旅行 Café','虹桥体育公园']);
 assert.ok(!JSON.stringify(data).match(/coEditors|avatar|nickName|skySohoImage/));
 assert.ok(data.provenance.accuracy.includes('illustrative'));assert.equal(data.provenance.revision,'3dc124b8f3ba9938b657bc56dbb8c5c1a74a5706');
});

test('meters and kilometers use their actual units, and geographic projection retains east/north direction',()=>{
 assert.equal(distanceMeters('40米'),40);assert.equal(distanceMeters('1.2公里'),1200);assert.equal(distanceMeters('120米'),120);
 assert.deepEqual(project([31.22354,121.34640]),{x:0,z:0});
 assert.ok(project([31.22454,121.34640]).z<0);assert.ok(project([31.22354,121.34740]).x>0);
 assert.ok(model.measuredDistance>2500&&model.measuredDistance<2700);
});

test('room excerpt retains the source bends and endpoint without adding a corridor',()=>{
 for(const chapter of model.chapters.filter(c=>c.stop.room)){
  const tail=tailPath(chapter.roomPath,24);
  assert.ok(Math.abs(tail.total-24)<1e-8);
  assert.deepEqual(tail.points.at(-1),{x:0,z:0});
  assert.deepEqual(tail.points[0],samplePath(chapter.roomPath,chapter.roomPath.total-24));
  const originalIndex=chapter.roomPath.points.indexOf(tail.points[1]);
  assert.deepEqual(tail.points.slice(1),chapter.roomPath.points.slice(originalIndex));
  assert.deepEqual(samplePath(tail,-10),tail.points[0]);assert.deepEqual(samplePath(tail,999),tail.points.at(-1));
 }
});

test('direct links and view switches retain the selected location under a GitLab Pages subpath',()=>{
 const selected=resolveSelection(model,'sky-soho-pantry');assert.equal(selected.stop.name,'茶水间');
 assert.equal(resolveSelection(model,'missing').stop.name,'8号楼');
 const url=pageUrl('https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/sky-soho/?unrelated=1',selected.stop.id,'overview');
 assert.equal(url.pathname,'/haojiaxu/hackathon-15/sky-soho/');assert.equal(url.searchParams.get('poi'),'sky-soho-pantry');assert.equal(url.searchParams.get('view'),'top');assert.equal(url.searchParams.get('unrelated'),'1');
});


test('planet clips exterior route segments without inventing connections or changing source data',()=>{
 const circle={x:0,z:0,radius:10};
 const path=makePath([{x:-20,z:0},{x:20,z:0},{x:20,z:20},{x:0,z:20},{x:0,z:-20}]);
 const before=JSON.stringify(path),clipped=clipPathToCampus(path,circle);
 assert.equal(clipped.length,2);
 assert.deepEqual(clipped[0].points,[{x:-10,z:0},{x:10,z:0}]);
 assert.deepEqual(clipped[1].points,[{x:0,z:10},{x:0,z:-10}]);
 assert.equal(JSON.stringify(path),before);
 for(const chapter of model.chapters)for(const p of clipPathToCampus(chapter.path).flatMap(p=>p.points))assert.ok(Math.hypot(p.x-10,p.z+65)<=350+1e-7);
});
test('old immersive and unknown modes normalize to planet while preserving the deep-linked stop',()=>{
 for(const view of ['immersive','planet','bad']){
  const url=pageUrl('https://host/project/sky-soho/?day=1','sky-soho-gym',view);
  assert.equal(url.searchParams.get('view'),'planet');assert.equal(url.searchParams.get('poi'),'sky-soho-gym');
 }
});
