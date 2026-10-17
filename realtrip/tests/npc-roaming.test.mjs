import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNpcRoaming} from '../src/npc-roaming.js';
import {createNpcReactions} from '../src/npc-reactions.js';
import {addCapsuleObstacles} from '../src/collision-obstacles.js';
const settings={position:[0,0,0],rotation:90,waypoints:[[1,0],[1,1],[0,1]],random:()=>.5};
test('roaming eases into motion, turns at a bounded rate and stays on its route',()=>{
 const r=createNpcRoaming(settings);let old=r.update(0),moved=0,pauses=0;
 for(let i=0;i<3600;i++){const p=r.update(1/60);assert(p.speed<=.22001);assert(Math.abs(p.turn)<=80.001);assert(Math.abs(p.speed-old.speed)<.017);assert(p.position[0]>=-.01&&p.position[0]<=1.01);assert(p.position[2]>=-.01&&p.position[2]<=1.01);moved+=p.moving?1:0;pauses+=p.moving?0:1;old=p;}
 assert(moved>500);assert(pauses>200);assert(old.travel>3);
});
test('conversation, close visitors, obstacles and reduced motion stop autonomous travel',()=>{
 for(const option of [{busy:true},{player:[.8,.4,0]},{reduced:true}]){const r=createNpcRoaming(settings);for(let i=0;i<500;i++)assert.deepEqual(r.update(.05,option).position,[0,0,0]);}
 const blocked=createNpcRoaming({...settings,canOccupy:([x])=>x<.2});for(let i=0;i<1000;i++)assert(blocked.update(.05).position[0]<.2);
 const r=createNpcRoaming(settings);for(let i=0;i<90;i++)r.update(.05);r.hold(5);for(let i=0;i<100;i++)r.update(.05,{busy:true});assert(r.update(.05).speed<.05);
 const frozen=r.update(.05,{reduced:true});assert.equal(frozen.speed,0);assert.deepEqual(r.update(.05,{reduced:true,near:true,player:[2,.4,0]}),frozen);
});
test('contact reactions vary and require separating plus cooldown; conversation is never interrupted',()=>{
 const r=createNpcReactions({random:()=>.4});assert.match(r.greeting(),/灵感|舞台|点子|代码|想法|脑洞/);const returns=Array.from({length:4},()=>r.greeting());assert.equal(new Set(returns).size,4);assert.notEqual(r.greeting(),returns.at(-1));
 const lines=[];for(let i=0;i<12;i++){const now=i*10;const text=r.contact(now);assert(text);if(i)assert.notEqual(text,lines.at(-1));lines.push(text);assert.equal(r.contact(now+.1),null);r.update(now+1,.7);assert.equal(r.contact(now+2),null);r.update(now+3,.7);}
 assert.equal(new Set(lines.slice(0,6)).size,6);r.update(130,.7);assert.equal(r.contact(131,true),null);
});
test('moving obstacle keeps contact and blocking at the new position',()=>{
 let hits=0;const obstacle={x:0,z:0,radius:.28,bottom:0,top:1,onContact(){hits++;}};
 const c=addCapsuleObstacles({queryCapsule:()=>false},[obstacle]),out={};
 assert(c.queryCapsule(.1,.5,0,.2,.14,out));assert.equal(hits,1);
 obstacle.x=2;assert(!c.queryCapsule(.1,.5,0,.2,.14,out));assert(c.queryCapsule(2.1,.5,0,.2,.14,out));assert.equal(hits,2);
});
