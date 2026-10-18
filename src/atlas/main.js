import xinjiangData from '../route-3d/data/north-xinjiang.json';
import sohoData from '../sky-soho/data/itinerary.json';
import { buildRouteModel, stopsForDay, legsForDay } from '../route-3d/model.js';
import { buildDayTrip } from '../sky-soho/model.js';
import { RouteScene } from '../route-3d/scene.js';
import { SkySohoScene } from '../sky-soho/scene.js';
import './style.css';

const $=s=>document.querySelector(s);
const schedule=['到达 · 刷工牌进入','09:30 · 专注 3 小时','休息 · 停留 15 分钟','14:00 · 预约会议','18:30 · 运动 1 小时'];
const glyphs=['⌂','▤','☕','▧','↗'];
const dayNames=['全部','向北出发','边境村落','喀纳斯','戈壁与湖','湖边慢游','公路远行','带风回家'];
export function startAtlas(kind){
  const city=kind==='soho',data=city?sohoData:xinjiangData,model=city?buildDayTrip(data):buildRouteModel(data);
  const stops=city?model.stops:model.stops.filter(s=>s.kind!=='hotel');
  const legs=city?model.chapters.map(c=>({id:c.stop.id,stopId:c.stop.id,points:c.points,distance:c.stop.leg.distance,duration:c.stop.leg.duration,day:1})):model.legs;
  let selected=null,day=0,view='planet',rotating=false,sunset=false,scene,last=performance.now(),toastTimer;
  document.body.dataset.trip=kind;
  $('#hero-title').innerHTML=city?'凌空<span>星球。</span>':'北疆<span>星球。</span>';
  $('#hero-kicker').textContent=city?'02 / THE CITY IN MINIATURE':'01 / THE WILD IN MINIATURE';
  $('#hero-copy').textContent=city?'把日常装进一座小小星球。':'把七天的山河，收藏在眼前。';
  $('#coordinate').textContent=city?'31°13′ N · 121°20′ E':'44°–49° N · 80°–90° E';
  $('#metric-days').textContent=city?'01':'07';$('#metric-distance').textContent=city?(model.distance/1000).toFixed(1):model.distance.toLocaleString();$('#metric-stops').textContent=String(stops.length).padStart(2,'0');
  $('#distance-label').textContent=city?'KM · 步行':'KM · 驾车';
  $('#rail-caption').textContent=city?'一天的节奏':'七天的远方';$('#stop-count').textContent=`${stops.length} 个地点`;
  $('#route-meta').textContent=city?'地铁站往返 · 36 分钟步行':'全程道路 · 7 天 6 晚';
  $('#scene-footnote').textContent=city?'星球展示园区 · 地铁往返见全程线路':'原行程路线 · 艺术化地形';
  $('#source-copy').textContent=city?'路线来自 ding.zhao/hackathon-15 的凌空一日游，包含 5 个地点、6 段连接与 26 个坐标。源数据已注明室内和楼栋点位为示意。星球只展示园区范围，全程小地图保留地铁往返全部折线；建筑、绿地和水景均为艺术化模型。':'路线来自 hackathon-15 的北疆七日行程，保留 18 段道路、1,517 个坐标及返程。山脉、湖泊轮廓、植被和建筑为艺术化模型，不代表真实高程或景区覆盖。上海往返航段不在此区域场景中展示。';
  $('#source-link').href=city?sohoData.provenance.page:'https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/?v=cinema';
  $('#extras').hidden=!city;$('#day-tabs').hidden=city;
  for(const link of document.querySelectorAll('[data-trip-link]'))if(link.dataset.tripLink===kind)link.setAttribute('aria-current','page');
  function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);}
  function updateURL(){const u=new URL(location.href);u.searchParams.set('view',view);if(selected)u.searchParams.set('poi',selected.id);else u.searchParams.delete('poi');if(day)u.searchParams.set('day',day);else u.searchParams.delete('day');history.replaceState(null,'',u);}
  function setRotation(value){rotating=value;$('#rotate').setAttribute('aria-pressed',String(value));$('#rotate-label').textContent=value?'暂停旋转':'自动旋转';if(value&&scene.reducedMotion){rotating=false;$('#rotate').setAttribute('aria-pressed','false');$('#rotate-label').textContent='自动旋转';toast('系统已启用减少动态效果，可以拖动旋转。');}}
  function renderInfo(){
    $('#detail').classList.toggle('has-selection',!!selected);$('#place-details').hidden=!selected;
    $('#detail-index').textContent=selected?(stops.findIndex(s=>s.id===selected.id)<0?'M':String(stops.findIndex(s=>s.id===selected.id)+1).padStart(2,'0')):'↗';
    $('#detail-kicker').textContent=selected?'SELECTED PLACE / 行程地点':'YOUR LITTLE WORLD';
    $('#detail-title').textContent=selected?selected.name.replace('(黄金海岸景区)',''):city?'日常，也有风景':'山河，尽收眼底';
    $('#detail-copy').textContent=selected?(selected.remark||'在沙盘中查看这个地点，以及它与行程路线的位置关系。'):city?'四座流线楼群、空中连廊与一日的轨迹。点亮一个地点，看看今天如何展开。':'雪山、湖泊、森林与戈壁，在同一片微缩山河相遇。选择地点，收藏沿途的风景。';
    $('#detail-meta').textContent=selected?city?schedule[selected.index]||'步行返程 · 15 分钟':`DAY ${selected.days.join(' / ')} · ${selected.playTime?.replace('建议玩','')||'沿途停留'}`:city?'10 月 16 日 · 周五':'七天六晚 · 按原行程日期';
    $('#detail-coords').textContent=selected?`${selected.position[0].toFixed(4)}° N / ${selected.position[1].toFixed(4)}° E`:'点击模型标记或下方行程卡片';
    document.title=`${city?'凌空':'北疆'}星球${selected?' · '+selected.name:''} | RealTrip`;
    for(const b of document.querySelectorAll('[data-stop]'))b.setAttribute('aria-pressed',String(b.dataset.stop===selected?.id));
    drawRoute();
  }
  function select(stop,write=true){selected=stop;scene.select(stop);renderInfo();if(write)updateURL();}
  function renderStops(){
    const visible=city?stops:stopsForDay(model,day).filter(s=>s.kind!=='hotel');$('#stops').replaceChildren();
    for(const stop of visible){
      const i=stops.indexOf(stop),b=document.createElement('button');b.className='stop-card';b.dataset.stop=stop.id;b.setAttribute('aria-label',`查看${stop.name}`);b.setAttribute('aria-pressed',String(selected?.id===stop.id));
      const n=document.createElement('span');n.className='stop-number';n.textContent=String(i+1).padStart(2,'0');
      const g=document.createElement('span');g.className='stop-glyph';g.textContent=city?glyphs[i]:/湖|喀纳斯/.test(stop.name)?'≈':/村/.test(stop.name)?'⌂':'△';
      const copy=document.createElement('span');copy.className='stop-copy';const name=document.createElement('strong');name.textContent=stop.name.replace('(黄金海岸景区)','');const sub=document.createElement('small');sub.textContent=city?schedule[i]:`DAY ${stop.days.join(' / ')} · ${stop.city||'北疆'}`;copy.append(name,sub);
      b.append(n,g,copy);b.addEventListener('click',()=>select(stop));$('#stops').append(b);
    }
    if(!visible.length){const p=document.createElement('p');p.className='empty';p.textContent='今日返程 · 道路已在沙盘与路线图中点亮。';$('#stops').append(p);}
    $('#stop-count').textContent=`${visible.length} 个地点`;
  }
  const ns='http://www.w3.org/2000/svg',allPoints=legs.flatMap(l=>l.points),minLat=Math.min(...allPoints.map(p=>p[0])),maxLat=Math.max(...allPoints.map(p=>p[0])),minLng=Math.min(...allPoints.map(p=>p[1])),maxLng=Math.max(...allPoints.map(p=>p[1]));
  const cos=Math.cos((minLat+maxLat)/2*Math.PI/180),scale=Math.min(214/((maxLng-minLng)*cos),124/(maxLat-minLat));
  const map=p=>({x:125+(p[1]-(minLng+maxLng)/2)*cos*scale,y:76-(p[0]-(minLat+maxLat)/2)*scale});
  function drawRoute(){
    const svg=$('#route-map');svg.replaceChildren();
    for(const leg of legs){const p=document.createElementNS(ns,'path');p.setAttribute('d',leg.points.map((v,i)=>{const q=map(v);return `${i?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`;}).join(' '));p.setAttribute('class',`${day&&leg.day!==day?'muted ':''}${selected&&(leg.stopId===selected.id||leg.destination===selected.name)?'selected ':''}${city&&leg.id==='sky-soho-return'?'return':''}`);svg.append(p);}
    for(const stop of stops){const p=map(stop.position),g=document.createElementNS(ns,'g'),circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('r',selected?.id===stop.id?4:2.4);circle.setAttribute('class',selected?.id===stop.id?'selected':'');g.append(circle);svg.append(g);}
    $('#route-selected').textContent=selected?`已点亮 · ${selected.name}`:day?`第 ${day} 天 · ${dayNames[day]}`:'全部路线';
  }
  function setView(next,write=true){view=next==='top'||next==='overview'?'top':'planet';scene.overview(view);if(selected)scene.select(selected);for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===view));if(write)updateURL();}
  function setDay(next,write=true){day=next;selected=null;scene.setDay(day);scene.select(null);renderStops();renderInfo();setView(view,false);for(const b of document.querySelectorAll('[data-day]'))b.setAttribute('aria-pressed',String(Number(b.dataset.day)===day));if(write)updateURL();}
  if(!city)for(let i=0;i<=7;i++){const b=document.createElement('button');b.dataset.day=i;b.textContent=i?`D${i}`:'全程';b.title=dayNames[i];b.setAttribute('aria-label',i?`第${i}天 ${dayNames[i]}`:'全程路线');b.addEventListener('click',()=>setDay(i));$('#day-tabs').append(b);}
  $('#reset').addEventListener('click',()=>{selected=null;setRotation(false);scene.select(null);setDay(0);});
  for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>setView(b.dataset.view));
  $('#rotate').addEventListener('click',()=>setRotation(!rotating));$('#zoom-in').addEventListener('click',()=>scene.zoom(.85));$('#zoom-out').addEventListener('click',()=>scene.zoom(1.18));
  $('#light').addEventListener('click',()=>{sunset=!sunset;scene.setLight(sunset);document.body.classList.toggle('sunset',sunset);$('#light').setAttribute('aria-pressed',String(sunset));});
  $('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('可通过浏览器菜单进入全屏。');}});
  $('#snapshot').addEventListener('click',()=>{scene.render(0);const a=document.createElement('a');a.download=`RealTrip-${city?'凌空':'北疆'}星球.png`;a.href=scene.screenshot();a.click();});
  $('#place-details').addEventListener('click',()=>{for(const key of ['title','copy','meta','coords'])$('#place-dialog-'+key).textContent=$('#detail-'+key).textContent;$('#place-dialog').showModal();});
  $('#about').addEventListener('click',()=>$('#about-dialog').showModal());$('#source').addEventListener('click',()=>$('#about-dialog').showModal());
  $('#extras').addEventListener('click',()=>$('#extras-dialog').showModal());
  for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
  $('#return-stop').addEventListener('click',()=>select(model.returnStop));
  $('#route-toggle').addEventListener('click',()=>{const value=$('#route-panel').classList.toggle('mobile-open');$('#route-toggle').setAttribute('aria-expanded',String(value));});
  try{
    scene=city?new SkySohoScene($('#scene'),model,{onSelect:stop=>select(stop),onInteract:()=>setRotation(false)}):new RouteScene($('#scene'),model,{onSelect:stop=>select(stop),onInteract:()=>setRotation(false)});
    scene.onContextLost=()=>{setRotation(false);toast('3D 渲染连接中断，请刷新重试。');};
    function loadQuery(){const q=new URLSearchParams(location.search),d=Number(q.get('day'));view=q.get('view')==='top'||q.get('view')==='overview'?'top':'planet';setDay(!city&&Number.isInteger(d)&&d>=0&&d<=7?d:0,false);const stop=[...stops,...(city?[model.returnStop]:[])].find(s=>s.id===q.get('poi'));if(stop){if(day&&!stop.days.includes(day))setDay(0,false);select(stop,false);}updateURL();}
    loadQuery();window.addEventListener('popstate',loadQuery);
    $('#loading').hidden=true;
    function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;if(rotating&&!scene.flight)scene.orbitPOI(dt);scene.render(dt);}requestAnimationFrame(frame);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)setRotation(false);last=performance.now();});
  }catch(error){console.error(error);$('#loading').textContent='3D 场景暂未加载成功，请开启浏览器硬件加速后刷新。';}
}
