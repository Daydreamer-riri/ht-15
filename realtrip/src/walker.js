import {createOfficeNavigation} from './office-navigation.js';
import {createWalkSurface} from './walk-surface.js';
import {createTerrainSurface} from './terrain-surface.js';
import {loadDynamicNavigation} from './dynamic-navigation.js';
import {applyModelTransform,loadSceneSupplements} from './scene-models.js';
import {initExplorerUi,populateSceneMenu,explorerScenePath,addPlanetLink} from './explorer-ui.js';
import './explorer-ui.css';
import {createViewer} from '@playcanvas/supersplat-viewer/viewer';
import '@playcanvas/supersplat-viewer/viewer.css';
import building2 from './building2.json';
import terrace from './terrace.json';
import cafeteria from './cafeteria.json';
import alpineLake from './alpine-lake.json';
import hackathon from './hackathon.json';
import twoFloor from './two-floor.json';
import auditorium from './venue.json';
import {npcScene} from './npc-scene.js';
import {loadSceneScreens,loadCapturedSurfaces} from './scene-screens.js';
// The site runs both at a domain root and under a sub-path (such as GitLab Pages), so
// asset URLs are resolved against the directory of the current document.
const base=new URL('.',location.href).pathname;
const buildingBase={data:building2,destination:'building2',label:'会议室',source:null,credit:'会议室实拍 · Remy 重建',scope:'从会议室穿过门口，可以直接走到连廊，也能原路走回来。视点对齐原拍摄眼高。地面、墙面、护栏和会议桌采用按扫描轮廓校准的简化碰撞；椅子、门扇和细小物体尚未逐一建模。已结合补拍画面校正会议室细节，横屏视野更开阔；玻璃反射、细椅脚及未充分拍摄的角落仍可能有重建瑕疵。'};
const terraceBase={data:terrace,destination:'terrace',label:'露台 · 实景探索',source:null,credit:'露台实拍 · Remy 重建',scope:'在露台入口、中央空地和观景端之间连续自由走动。按拍摄轨迹和地板点云校正模型倾斜、地面及视点高度；玻璃幕墙、花箱、护栏与桌椅采用简化阻挡。远处楼宇为背景扫描，未开放行走。'};
const cafeteriaBase={data:cafeteria,destination:'cafeteria',label:'食堂',source:null,credit:'食堂实拍',scope:'保留人物，结合原始取餐区与补拍用餐区。入口、取餐通道和餐桌旁的过道可以连续往返，地面、柜台、立柱和桌椅采用校准后的简化碰撞。玻璃反射、人物运动残影与远处未充分拍摄的区域仍有重建瑕疵。'};
const scenes={
 'hackathon-npc':{data:npcScene,destination:'hackathon-npc',hidden:true,label:'Hackathon · NPC',title:'来和小蓝聊聊天。',area:'舞台前',credit:'Remy · junhaoqin 团队',source:null,scope:'独立 NPC 体验，复用主会场实景和碰撞。小蓝是根据活动海报左侧角色制作的立体卡通模型；靠近后可文字或语音交流，回答由 DeepSeek 生成。'},
 'hackathon':{data:auditorium,destination:'hackathon',label:'Hackathon主会场',title:'走进Hackathon主会场。',area:'主会场起点',credit:'Remy · junhaoqin 团队',source:null,scope:'来自 realtrip-walk-hackathon26 的Hackathon主会场，保留原始模型、体素碰撞、行人眼高及三块 Hackathon 屏幕。使用本站统一的移动、转头与重置操作。尺度未经现场测量，薄物体和缺失扫描处的碰撞可能不完整。'},
 'two-floor':{data:twoFloor,destination:'two-floor',label:'健身房',title:'走进健身房。',area:'健身房一层',credit:'junhaoqin 团队原模型 · 用户补拍优化',source:'https://git.dev.sh.ctripcorp.com/junhaoqin/realtrip-walk-hackathon26',scope:'来自 realtrip-walk-hackathon26 的健身房实拍模型。一层、折返楼梯和二层可以连续行走；保留楼层、台阶、护栏及家具碰撞。使用本站统一操作，结合实拍画面细化二层器械区与墙面细节，保留此前下段台阶的颜色与纹理优化。器械细杆、玻璃反射及未充分拍摄的区域仍可能模糊。'},
 'hackathon-original':{data:hackathon,destination:'hackathon-original',hidden:true,label:'Hackathon 主会场（原版）',title:'Hackathon 主会场',area:'主会场',credit:'主会场实拍',source:null,scope:'原版会场模型与校准后的地形碰撞。'},
 'alpine-lake':{data:alpineLake,destination:'alpine-lake',label:'山湖漫游',title:'沿着湖岸，走走看看。',area:'湖岸草地',hidden:true,credit:'用户提供的山湖模型',scope:'使用提供的 SPZ 场景和 PLY 碰撞网格。可以沿湖岸草地自由行走，随地形起伏；水面、陡坡和模型边缘限制通行。远景和局部水面存在源模型的重建瑕疵。',source:null},
 cafeteria:{...cafeteriaBase,title:'食堂',area:'食堂入口',waypoint:'entrance'},
 terrace:{...terraceBase,title:'到露台，走走看看。',area:'露台入口',waypoint:'entrance'},
 'terrace-open':{...terraceBase,title:'在露台上，自由走走。',area:'中央空地',waypoint:'open'},
 'terrace-view':{...terraceBase,title:'换个角度，看看园区。',area:'观景端',waypoint:'view'},
 building2:{...buildingBase,title:'回到会议室，继续探索。',area:'会议室内',waypoint:'room'},
 'building2-door':{...buildingBase,title:'门内门外，都能走。',area:'会议室门口',waypoint:'door'},
 'building2-aisle':{...buildingBase,title:'沿着连廊，自由走走。',area:'连廊入口',waypoint:'aisle'},
 'building2-far':{...buildingBase,title:'换个方向，看看。',area:'连廊另一侧',waypoint:'far'},
};
const requestedScene=new URLSearchParams(location.search).get('scene');
// Keep existing shared links working while new links use the building name.
const legacyScenes={'honor-corridor':'two-floor','building2-room':'building2','cafeteria-original':'cafeteria'};
const requested=legacyScenes[requestedScene]??requestedScene;
const standaloneScenes={'sky-soho':'凌空一日'};
if(Object.hasOwn(standaloneScenes,requested)){
 const target=new URL(explorerScenePath(requested,base),location.origin);
 for(const [name,value] of new URLSearchParams(location.search))if(name!=='scene')target.searchParams.set(name,value);
 location.replace(target.href);
}else{
const key=Object.hasOwn(scenes,requested)?requested:'hackathon';
const current=scenes[key];let scene=structuredClone(current.data);
const $=id=>document.getElementById(id);
const sceneUrl=id=>{
 if(Object.hasOwn(standaloneScenes,id))return explorerScenePath(id,base);
 const url=new URL(location.href);
 url.pathname=base;
 url.searchParams.set('scene',id);
 return url.pathname+url.search+url.hash;
};
// Make default and legacy entrances shareable with the resolved scene too.
history.replaceState(history.state,'',sceneUrl(key));
initExplorerUi();
populateSceneMenu($('destination'),current.destination,base);
addPlanetLink(document.querySelector('header'),key,base);
if(current.hidden){
 document.querySelector('.scene-title').textContent=current.label;
 document.querySelector('.scene-trigger').setAttribute('aria-label',`切换场景，当前${current.label}`);
}
$('destination').onchange=e=>{stop();location.href=sceneUrl(e.target.value);};
document.title='行前漫游 · '+current.label;
document.querySelector('.place h1').textContent=current.title;
$('world').setAttribute('aria-label',current.label+' · '+current.area+'，可自由步行的实景');
document.querySelector('#loading h2').textContent='正在走进'+current.area;
$('credit').textContent='实景：'+current.credit;
$('source').href=current.source??'#';
$('source').hidden=!current.source;$('about-source').hidden=!current.source;
$('scene-scope').textContent=current.scope;
if(current.destination==='alpine-lake'){$('attribution').textContent='素材由用户提供。原 SPZ 保留全部 1,189,993 个点并转换为网页 SOG；碰撞来自配套 PLY 的 278,025 个三角面，采样为地形高度并限制湖面、陡坡及缺失区域。尺寸沿用模型单位。渲染器：SuperSplat Viewer / PlayCanvas（MIT）。';$('area-help').hidden=true;}
if(['two-floor','hackathon'].includes(current.destination))$('attribution').textContent=current.scope+' 渲染器：SuperSplat Viewer / PlayCanvas（MIT）。';
if(current.destination==='building2')$('attribution').textContent='素材来自用户提供的会议室实景分享页。使用其 100 万点 SOG 模型，结合拍摄轨迹与模型轮廓校准站立眼高、地面和简化障碍。原始体素在门口和桌椅处存在碎块，本场景使用校准后的平面碰撞，不代表实测建筑尺寸。渲染器：SuperSplat Viewer / PlayCanvas（MIT）。';
$('about-source').href=$('source').href;
if(current.destination==='terrace')$('attribution').textContent='素材来自用户提供的露台实景分享页，使用其 100 万点 SOG 模型。本站校正模型倾斜并增加自由步行、地面和简化障碍。尺度按原拍摄视点估算，未做现场测量；桌椅、花箱采用整体轮廓阻挡，未建立每根椅腿的精细物理。渲染器：SuperSplat Viewer / PlayCanvas（MIT）。';
const area=$('area');
for(const [id,item] of Object.entries(scenes)){if(item.destination===current.destination){const option=new Option(item.area,id);area.add(option);}}
area.value=key;
area.onchange=()=>{location.href=sceneUrl(area.value);};
$('area-picker').hidden=area.options.length<2;
if(current.destination==='building2'){$('coverage').textContent='会议室 ↔ 门口 ↔ 连廊 · 连续步行';$('area-label').textContent='选择起点';$('area-help').textContent='直接穿过门口即可往返会议室与连廊，无需切换场景。起点菜单只用于快速定位。已更新会议室、门口与连廊的清晰模型；玻璃反射和少量细小物体仍有重建瑕疵。';}
if(current.destination==='terrace'){$('coverage').textContent='入口 ↔ 中央空地 ↔ 观景端 · 连续步行';$('area-label').textContent='选择起点';$('area-help').textContent='三个起点都在同一片露台，可以直接走过去并原路返回。桌椅和花箱附近请绕行；护栏外、玻璃后的室内及远处楼宇没有开放通行。';}
const status=$('loadingText');let viewer,ready=false,officeNav,walkSurface;
let supplementsReady=!scene.supplements?.length;let screensReady=!scene.screens&&!scene.screensUrl;let supplementEntities=new Set();
let walkingMotion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const saved=localStorage.getItem('walkingMotion');if(saved!==null)walkingMotion=saved==='true';}catch{}
const motion=$('walking-motion');
if(motion){
 $('motion-setting').hidden=false;motion.checked=walkingMotion;
 motion.onchange=()=>{walkingMotion=motion.checked;officeNav?.setWalkingMotion(walkingMotion);try{localStorage.setItem('walkingMotion',String(walkingMotion));}catch{}};
}
let joyPointer=null;
function stop(){officeNav?.stop();joyPointer=null;$('knob').style.transform='translate(-50%,-50%)';}
window.addEventListener('resize',stop);
// Refresh detail sooner during walking and looking around. This does not fill scan gaps.
function tuneWalkingDetail(){
 if(!viewer?.state.loaded)return;
 const gsplat=viewer.app.scene.gsplat,fast=viewer.state.performanceMode;
 gsplat.lodUpdateAngle=fast?45:20;
 gsplat.lodUpdateDistance=fast?0.75:0.35;
 gsplat.lodBehindPenalty=fast?5:2;
 viewer.app.renderNextFrame=true;
}
function setReady(){
 if(!viewer.state.loaded||!supplementsReady||!screensReady)return;
 if(ready)return;
 for(const splat of viewer.app.root.findComponents('gsplat'))if(!supplementEntities.has(splat.entity))applyModelTransform(splat.entity,scene);
 ready=true;viewer.state.cameraMode='fly';viewer.state.gamingControls=true;viewer.state.inputEnabled=false;
 officeNav=createOfficeNavigation(viewer,null,scene.settings.cameras[0].initial,$('world'),walkSurface);
 officeNav?.setWalkingMotion(walkingMotion);
 if(key==='hackathon-npc')import('./npc-interaction.js').then(({initNpc})=>initNpc({viewer,navigation:officeNav,base,stop,space:walkSurface.characters})).catch(error=>{console.error('NPC initialization failed',error);const notice=document.createElement('p');notice.textContent='小蓝加载失败，请刷新页面重试。';notice.style.cssText='position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#132d3f;color:white;padding:14px;border-radius:12px;z-index:30';document.body.append(notice);});

 queueMicrotask(tuneWalkingDetail);
 $('loading').hidden=true;$('pad').disabled=false;$('mode').textContent='步行中';
}
function failed(message){status.textContent=message;$('retry').hidden=false;}
try{
 if(['solid-body','voxel-body'].includes(scene.navigation.kind))walkSurface=await loadDynamicNavigation(scene,base);
 else if(['mesh-heightfield','reviewed-heightfield'].includes(scene.navigation.kind)){
  const response=await fetch(base+scene.navigation.url);
  if(!response.ok)throw new Error('Collision surface unavailable');
  walkSurface=createTerrainSurface({...await response.json(),...scene.navigation});
 }else walkSurface=createWalkSurface(scene.navigation);
 if(current.waypoint&&scene.waypoints?.[current.waypoint])scene.settings.cameras[0].initial=scene.waypoints[current.waypoint];
 scene.contentUrl=base+scene.contentUrl;
 scene.settings.animTracks=[];scene.settings.startMode='default';
 viewer=await createViewer({container:$('world'),...scene,ui:false,lang:'zh-CN',renderer:'webgl',noanim:true});
 viewer.state.inputEnabled=false;viewer.state.performanceMode=false;
 viewer.events.on('progress:changed',p=>{status.textContent=`正在加载实景 ${Math.round(p)}%`;});
 viewer.events.on('loaded:changed',()=>{status.textContent='正在准备可行走地面…';setReady();});
 viewer.events.on('performanceMode:changed',()=>queueMicrotask(tuneWalkingDetail));
 viewer.events.on('cameraMode:changed',mode=>{if(ready&&mode!=='fly')viewer.state.cameraMode='fly';});
 if(scene.supplements?.length){
  status.textContent='正在加载补拍区域…';
  supplementEntities=new Set(await loadSceneSupplements(viewer,scene.supplements,base));
  supplementsReady=true;
 }
 if(scene.screens){await loadSceneScreens(viewer,scene.screens,base);screensReady=true;}
 if(scene.screensUrl){await loadCapturedSurfaces(viewer,base+scene.screensUrl);screensReady=true;}
 setReady();
 setTimeout(()=>{if(!ready)failed('加载较慢，请稍候，或点击重试。');},45000);
}catch(e){console.error(e);failed('实景加载失败，请检查网络后重试。');}
$('retry').onclick=()=>location.reload();
const pad=$('pad');
function move(e){
 const r=pad.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
 const radius=r.width*.32,dist=Math.hypot(dx,dy),scale=Math.min(1,radius/(dist||1));
 const x=dx*scale,y=dy*scale;
 $('knob').style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
 officeNav?.setMoveInput(x/radius,-y/radius);
}
pad.addEventListener('pointerdown',e=>{if(!ready)return;e.preventDefault();joyPointer=e.pointerId;pad.setPointerCapture(joyPointer);move(e);});
pad.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)move(e);});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(ev,e=>{if(e.pointerId===joyPointer)stop();});
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
// Keep movement keys from changing the scene into an orbit or fly viewer.
window.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body)e.preventDefault();if(['1','2','3','f','F'].includes(e.key)&&e.target===document.body){e.preventDefault();e.stopImmediatePropagation();}},true);
$('reset').onclick=()=>{if(ready){stop();officeNav?.reset();}};
const about=$('about');
$('help').onclick=()=>{stop();if(document.pointerLockElement)document.exitPointerLock();if(viewer)viewer.state.inputEnabled=false;officeNav?.setEnabled(false);about.showModal();};
$('close-about').onclick=()=>about.close();about.addEventListener('close',()=>{if(ready){officeNav?.setEnabled(true);}});
// Readable runtime status supports checking actual camera movement, not merely an active button.
setInterval(()=>{if(!ready)return;const camera=viewer.app.root.findComponents('camera')[0];if(camera){const p=camera.entity.getPosition();$('mode').title=`步行位置 ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`;$('world').dataset.position=[p.x,p.y,p.z].map(v=>v.toFixed(3)).join(',');const angles=camera.entity.getEulerAngles();$('world').dataset.angles=[angles.x,angles.y,angles.z].map(v=>v.toFixed(1)).join(',');if(current.destination==='building2'&&(p.y< -3||p.y>5||Math.abs(p.x)>18||Math.abs(p.z)>12)){stop();officeNav?.reset();}}},500);

}
