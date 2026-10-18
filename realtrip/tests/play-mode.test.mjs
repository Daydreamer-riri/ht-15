import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlayMode} from '../src/play-mode.js';

function fixture({native=false,lock=false}={}){
 class Element{
  events=new Map();hidden=false;disabled=false;children=[];attributes={};
  classList={toggle:(name,value)=>{this.attributes[name]=value;}};
  addEventListener(event,handler){this.events.set(event,handler);}
  async fire(event,data={}){await this.events.get(event)?.(data);}
  setAttribute(name,value){this.attributes[name]=value;}
  append(node){this.children.push(node);}
  querySelector(){return this.child??=new Element();}
 }
 const root=new Element(),body=new Element(),controls=new Element(),button=new Element();
 const doc=new Element();Object.assign(doc,{body,documentElement:root,fullscreenElement:null,createElement:()=>new Element(),querySelector:()=>controls});
 const calls=[];const win=new Element();Object.assign(win,{innerWidth:390,innerHeight:844,matchMedia:()=>({matches:true}),screen:{orientation:{unlock(){calls.push('unlock');},async lock(value){calls.push(value);if(!lock)throw Error('unsupported');}}}});
 if(native)root.requestFullscreen=async()=>{calls.push('fullscreen');doc.fullscreenElement=root;await doc.fire('fullscreenchange');};
 doc.exitFullscreen=async()=>{doc.fullscreenElement=null;await doc.fire('fullscreenchange');};
 const mode=createPlayMode({button,doc,win,onStop:()=>calls.push('stop'),onJump:()=>calls.push('jump')});
 return {doc,win,root,body,button,calls,mode,hint:body.children[0],jump:controls.children[0]};
}

test('unsupported fullscreen and orientation still allow rotate guidance and exit',async()=>{
 const f=fixture();assert.equal(f.button.attributes['data-icon'],'rotate');await f.button.fire('click');
 assert.equal(f.body.attributes.immersive,true);assert.equal(f.hint.hidden,false);
 f.win.innerWidth=844;f.win.innerHeight=390;await f.win.fire('resize');
 assert.equal(f.hint.hidden,true);assert.equal(f.button.attributes['data-icon'],'collapse');
 assert.equal(f.button.attributes['aria-label'],'当前横屏，退出全屏');
 await f.button.fire('click');assert.equal(f.body.attributes.immersive,false);assert.equal(f.button.attributes['data-icon'],'expand');
 f.win.innerWidth=390;f.win.innerHeight=844;await f.win.fire('resize');
 assert.equal(f.button.attributes['data-icon'],'rotate');assert.equal(f.button.attributes['aria-label'],'当前竖屏，横屏游玩');
});

test('native fullscreen precedes orientation lock and external exit restores controls',async()=>{
 const f=fixture({native:true,lock:true});await f.button.fire('click');
 assert(f.calls.indexOf('fullscreen')<f.calls.indexOf('landscape'));
 f.doc.fullscreenElement=null;await f.doc.fire('fullscreenchange');
 assert.equal(f.body.attributes.immersive,false);assert.equal(f.hint.hidden,true);assert.equal(f.button.attributes['aria-pressed'],'false');
 assert(f.calls.includes('unlock'));
});

test('portrait continuation and Escape leave fallback mode; jump is gated on readiness',async()=>{
 const f=fixture();await f.button.fire('click');await f.hint.querySelector('button').fire('click');
 assert.equal(f.body.attributes.immersive,false);
 await f.button.fire('click');await f.win.fire('keydown',{key:'Escape'});assert.equal(f.body.attributes.immersive,false);
 await f.jump.fire('click');assert(!f.calls.includes('jump'));
 f.mode.setJumpEnabled(true);await f.jump.fire('click');assert(f.calls.includes('jump'));assert.equal(f.jump.hidden,false);
});

test('a late lock result cannot leave orientation locked after fullscreen exit',async()=>{
 const f=fixture({native:true,lock:true});let resolveLock,started;
 const entered=new Promise(resolve=>{started=resolve;});
 f.win.screen.orientation.lock=()=>{started();return new Promise(resolve=>{resolveLock=resolve;});};
 const pending=f.button.fire('click');await entered;
 f.doc.fullscreenElement=null;await f.doc.fire('fullscreenchange');resolveLock();await pending;
 assert.equal(f.body.attributes.immersive,false);assert.equal(f.calls.at(-1),'unlock');
});
