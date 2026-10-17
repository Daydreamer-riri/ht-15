import {createViewer} from '@playcanvas/supersplat-viewer/viewer';
import '@playcanvas/supersplat-viewer/viewer.css';
import {createOfficeNavigation} from '../../src/office-navigation.js';
import {initExplorerUi,populateSceneMenu,explorerScenes} from '../../src/explorer-ui.js';
import './walk.css';
import '../../src/explorer-ui.css';
const $=id=>document.getElementById(id);
let viewer,nav,route,scene,ready=false,pointer=null;
const read=async name=>{const r=await fetch(name,{cache:'no-store'});if(!r.ok)throw Error(`${name}: HTTP ${r.status}`);return r.json();};
function stop(){pointer=null;nav?.stop();$('knob').style.transform='translate(-50%,-50%)';}
initExplorerUi();
window.addEventListener('resize',stop);
function selectStart(){
 stop();nav?.destroy();
 const initial=scene.starts[$('starts').value];
 nav=createOfficeNavigation(viewer,route,initial,$('world'));
 nav.setWalkingMotion($('motion').checked);
 const url=new URL(location.href);url.searchParams.set('start',$('starts').value);history.replaceState(null,'',url);
}
try{
 const provenance=await read('provenance.json');
 [scene,route]=await Promise.all([read('scene.json'),read('route.json')]);
 if(scene.homeUrl)document.querySelector('.brand').href=scene.homeUrl;
 const current=new URLSearchParams(location.search).get('scene')||location.pathname.split('/').filter(Boolean).at(-1);
 const known=explorerScenes.some(([id])=>id===current);
 populateSceneMenu($('destination'),known?current:'capture',new URL(scene.homeUrl||'./',location.href).pathname,scene.homeUrl?explorerScenes:[['capture',scene.title]]);
 document.title=`${scene.title} · 行前漫游`;$('title').textContent=scene.title;
 Object.keys(scene.starts).forEach((id,i)=>$('starts').add(new Option(scene.starts[id].label||`起点 ${i+1} · ${id}`,id)));
 const initial=new URLSearchParams(location.search).get('start');
 if(initial in scene.starts)$('starts').value=initial;
 const connected=provenance.walk.continuousAcrossAllClips;
 $('connection').textContent=connected?'拍摄路线已连接，可沿有采集覆盖的区域探索。':'有些拍摄路线尚未形成可靠的步行连接；可通过顶部选择起点查看各段。跨段通道仍需补拍或检查。';
 if(provenance.walk.excludedCaptureRanges?.length)$('connection').textContent+=' 少量不稳定的拍摄开头或尾部未开放步行，详情见 walk-report.json。';
 const {starts,title,homeUrl,...options}=scene;
 viewer=await createViewer({container:$('world'),...options,ui:false,lang:'zh-CN',renderer:'webgl',noanim:true});
 viewer.state.inputEnabled=false;viewer.state.gamingControls=true;viewer.state.performanceMode=false;
 const loaded=()=>{if(ready||!viewer.state.loaded)return;ready=true;selectStart();$('loading').hidden=true;$('status').textContent=connected?'步行中 · 实景重建':'步行中 · 部分路线尚未连接';$('world').dataset.mode='walk';};
 viewer.events.on('loaded:changed',loaded);viewer.events.on('progress:changed',n=>$('progress').textContent=`加载场景 ${Math.round(n)}%`);loaded();
}catch(error){$('progress').textContent=`加载失败：${error.message}`;console.error(error);}
function move(e){const r=$('pad').getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,limit=r.width*.3,n=Math.max(1,Math.hypot(dx,dy)/limit),x=dx/n,y=dy/n;$('knob').style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;nav.setMoveInput(x/limit,-y/limit);}
$('pad').onpointerdown=e=>{if(!ready)return;e.preventDefault();pointer=e.pointerId;$('pad').setPointerCapture(pointer);move(e);};
$('pad').onpointermove=e=>{if(e.pointerId===pointer)move(e);};
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('pad').addEventListener(type,stop);
$('reset').onclick=()=>{stop();nav?.reset();};
$('starts').onchange=()=>{if(ready)selectStart();};
$('help').onclick=()=>{stop();nav?.setEnabled(false);document.exitPointerLock?.();$('about').showModal();};
$('close').onclick=()=>$('about').close();$('about').onclose=()=>nav?.setEnabled(true);
$('motion').onchange=()=>nav?.setWalkingMotion($('motion').checked);
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
