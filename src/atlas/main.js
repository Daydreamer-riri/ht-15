import xinjiangData from '../route-3d/data/north-xinjiang.json';
import xinjiangPhotos from '../route-3d/data/photos.json';
import sohoData from '../sky-soho/data/itinerary.json';
import { buildRouteModel, stopsForDay } from '../route-3d/model.js';
import { buildDayTrip } from '../sky-soho/model.js';
import { RouteScene } from '../route-3d/scene.js';
import { SkySohoScene } from '../sky-soho/scene.js';
import { hydrateIcons } from './icons.js';
import { walkHrefFor } from './walk-links.js';
import './style.css';

const $ = s => document.querySelector(s);
const schedule = ['到达 · 刷工牌进入', '09:30 · 专注 3 小时', '休息 · 停留 15 分钟', '14:00 · 预约会议', '18:30 · 运动 1 小时'];
const dayNames = ['全程', '向北出发', '边境村落', '喀纳斯', '戈壁与湖', '湖边慢游', '公路远行', '带风回家'];
const cleanName = name => name.replace('(黄金海岸景区)', '');
/** 原行程的景点照片（携程 CDN），按尺寸裁切 */
const photo = (stop, size) => xinjiangPhotos.photos[stop?.id] && `${xinjiangPhotos.photos[stop.id]}_C_${size}.jpg`;
const mobile = matchMedia('(max-width: 899px)');

export function startAtlas(kind) {
  hydrateIcons();
  const city = kind === 'soho', data = city ? sohoData : xinjiangData, model = city ? buildDayTrip(data) : buildRouteModel(data);
  const stops = city ? model.stops : model.stops.filter(s => s.kind !== 'hotel');
  const legs = city ? model.chapters.map(c => ({ id: c.stop.id, stopId: c.stop.id, points: c.points, distance: c.stop.leg.distance, duration: c.stop.leg.duration, day: 1 })) : model.legs;
  let selected = null, day = 0, view = 'planet', rotating = false, sunset = false, scene, last = performance.now(), toastTimer;
  document.body.dataset.trip = kind;

  const distance = city ? `${(model.distance / 1000).toFixed(1)} 公里步行` : `${model.distance.toLocaleString('zh-CN')} 公里`;
  $('#hero-title').textContent = city ? '一日游星球' : '北疆星球';
  $('#hero-copy').textContent = city ? `1 天 · ${distance} · ${stops.length} 个地点` : `7 天 · ${distance} · ${stops.length} 个地点`;
  $('#rail-caption').textContent = city ? '一天的节奏' : '七天的远方';
  $('#route-meta').textContent = city ? '地铁站往返 · 36 分钟步行' : '全程道路 · 7 天 6 晚 · 上海往返航段未画出';
  $('#source-copy').textContent = city ? '路线来自凌空一日游，包含 5 个地点、6 段连接与 26 个坐标。室内和楼栋点位为示意，建筑、绿地和水景均为艺术化模型。' : '路线来自北疆七日行程，保留 18 段道路、1,517 个坐标及返程。山脉、湖泊轮廓、植被和建筑为艺术化模型，不代表真实高程或景区覆盖。地点照片来自原行程。';
  $('#source-link').href = city ? sohoData.provenance.page : 'https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/?v=cinema';
  $('#extras').hidden = !city;
  $('#day-tabs').hidden = city;
  for (const link of document.querySelectorAll('[data-trip-link]')) if (link.dataset.tripLink === kind) link.setAttribute('aria-current', 'page');

  function toast(text) { $('#toast').textContent = text; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500); }
  function updateURL() {
    const u = new URL(location.href);
    u.searchParams.set('view', view);
    if (selected) u.searchParams.set('poi', selected.id); else u.searchParams.delete('poi');
    if (day) u.searchParams.set('day', day); else u.searchParams.delete('day');
    history.replaceState(null, '', u);
  }
  function setRotation(value) {
    rotating = value && !scene.reducedMotion;
    $('#rotate').setAttribute('aria-pressed', String(rotating));
    $('#rotate').setAttribute('aria-label', rotating ? '暂停旋转' : '自动旋转');
    if (value && scene.reducedMotion) toast('系统已启用减少动态效果，可以拖动旋转。');
  }

  /* ---------- 面板（手机为底部抽屉，桌面为右侧栏） ---------- */
  function setSheet(open) {
    $('#sheet').classList.toggle('is-open', open);
    $('#sheet-handle').setAttribute('aria-expanded', String(open));
    $('#sheet-handle .sr-only').textContent = open ? '收起行程面板' : '展开行程面板';
  }
  $('#peek-detail').addEventListener('click', () => setSheet(true));
  $('#sheet-handle').addEventListener('click', () => setSheet(!$('#sheet').classList.contains('is-open')));
  // 抽屉把手支持上下滑动
  let dragY = null;
  $('#sheet-handle').addEventListener('pointerdown', e => { dragY = e.clientY; });
  window.addEventListener('pointerup', e => {
    if (dragY === null) return;
    const delta = e.clientY - dragY; dragY = null;
    if (Math.abs(delta) > 24) { setSheet(delta < 0); e.preventDefault(); }
  });

  const visibleStops = () => (city ? stops : stopsForDay(model, day).filter(s => s.kind !== 'hotel'));

  function renderInfo() {
    const index = stops.findIndex(s => s.id === selected?.id);
    $('#detail').classList.toggle('has-selection', !!selected);
    $('#place-details').hidden = !selected;
    $('#peek-detail').hidden = !selected;
    if (selected) $('#peek-detail').textContent = `查看${cleanName(selected.name)}`;
    const list = visibleStops(), at = list.findIndex(s => s.id === selected?.id);
    $('#prev-stop').disabled = !list.length || at === 0;
    $('#next-stop').disabled = !list.length || at === list.length - 1;
    const dayLabel = d => (d ? `第 ${d} 天 · ${dayNames[d]}` : '七天六晚 · 按原行程日期');
    $('#detail-meta').textContent = selected
      ? (city ? schedule[selected.index] || '步行返程 · 15 分钟' : `第 ${selected.days.join('、')} 天 · ${selected.city || '北疆'}${selected.playTime ? ` · ${selected.playTime.replace('建议玩', '建议停留 ')}` : ''}`)
      : (city ? '10 月 16 日 · 周五' : dayLabel(day));
    $('#detail-title').textContent = selected ? cleanName(selected.name) : (day ? dayNames[day] : (city ? '日常，也有风景' : '山河，尽收眼底'));
    $('#detail-copy').textContent = selected
      ? (selected.remark || '在沙盘中查看这个地点，以及它与行程路线的位置关系。')
      : (city ? '四座流线楼群、空中连廊与一日的轨迹。点亮一个地点，看看今天如何展开。' : '雪山、湖泊、森林与戈壁，在同一片微缩山河相遇。选一个地点，镜头会飞过去。');
    const cover = selected ?? (day ? list[0] : stops.find(s => s.name.includes('赛里木')) ?? list[0]);
    const img = $('#detail-photo'), src = photo(cover, '960_640');
    img.hidden = !src; $('#detail-credit').hidden = !src;
    if (src && img.dataset.src !== src) {
      img.dataset.src = src; img.classList.remove('is-loaded');
      img.onload = () => img.classList.add('is-loaded');
      img.src = src; img.alt = `${cleanName(cover.name)}，原行程照片`;
      img.referrerPolicy = 'no-referrer';
    }
    // 有实景的地点（赛里木湖），照片可点击进入 /walk/ 对应场景
    const walk = $('#detail-walk'), href = city ? null : walkHrefFor(cover);
    if (href) { walk.href = href; walk.setAttribute('aria-label', `走进${cleanName(cover.name)}实景漫游`); }
    else { walk.removeAttribute('href'); walk.removeAttribute('aria-label'); }
    walk.querySelector('.detail-walk-tag').hidden = !href;
    document.title = `${city ? '一日游' : '北疆'}星球${selected ? ` · ${cleanName(selected.name)}` : ''} · RealTrip`;
    for (const b of document.querySelectorAll('[data-stop]')) b.setAttribute('aria-pressed', String(b.dataset.stop === selected?.id));
    $('#route-selected').textContent = selected ? `已点亮 · ${cleanName(selected.name)}` : day ? `第 ${day} 天 · ${dayNames[day]}` : '全部路线';
    drawRoute();
    void index;
  }

  function select(stop, write = true) {
    selected = stop;
    scene.select(stop);
    if (stop) scene.focus?.(stop);
    renderInfo();
    if (write) updateURL();
  }

  function step(direction) {
    const list = visibleStops();
    if (!list.length) return;
    const at = list.findIndex(s => s.id === selected?.id);
    const next = list[Math.max(0, Math.min(list.length - 1, at < 0 ? 0 : at + direction))];
    select(next);
    document.querySelector(`[data-stop="${next.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: scene.reducedMotion ? 'instant' : 'smooth' });
  }
  $('#prev-stop').addEventListener('click', () => step(-1));
  $('#next-stop').addEventListener('click', () => step(1));

  function renderStops() {
    const visible = visibleStops();
    $('#stops').replaceChildren();
    for (const stop of visible) {
      const i = stops.indexOf(stop), b = document.createElement('button');
      b.className = 'stop-row'; b.dataset.stop = stop.id; b.setAttribute('aria-pressed', String(selected?.id === stop.id));
      const src = photo(stop, '160_160');
      const thumb = document.createElement(src ? 'img' : 'span');
      thumb.className = 'stop-thumb';
      if (src) Object.assign(thumb, { src, alt: '', width: 56, height: 56, loading: 'lazy', decoding: 'async', referrerPolicy: 'no-referrer' });
      else { thumb.textContent = cleanName(stop.name).slice(0, 1); thumb.setAttribute('aria-hidden', 'true'); }
      const copy = document.createElement('span'); copy.className = 'stop-copy';
      const name = document.createElement('strong'); name.textContent = cleanName(stop.name);
      const sub = document.createElement('small'); sub.textContent = city ? schedule[i] : `第 ${stop.days.join('、')} 天 · ${stop.city || '北疆'}`;
      copy.append(name, sub); b.append(thumb, copy);
      b.addEventListener('click', () => { if (selected?.id === stop.id && mobile.matches) setSheet(true); else select(stop); });
      $('#stops').append(b);
    }
    if (!visible.length) { const p = document.createElement('p'); p.className = 'small empty'; p.textContent = '今日返程，道路已在沙盘与路线图中点亮。'; $('#stops').append(p); }
  }

  const ns = 'http://www.w3.org/2000/svg', allPoints = legs.flatMap(l => l.points);
  const minLat = Math.min(...allPoints.map(p => p[0])), maxLat = Math.max(...allPoints.map(p => p[0])), minLng = Math.min(...allPoints.map(p => p[1])), maxLng = Math.max(...allPoints.map(p => p[1]));
  const cos = Math.cos((minLat + maxLat) / 2 * Math.PI / 180), scale = Math.min(214 / ((maxLng - minLng) * cos), 124 / (maxLat - minLat));
  const map = p => ({ x: 125 + (p[1] - (minLng + maxLng) / 2) * cos * scale, y: 76 - (p[0] - (minLat + maxLat) / 2) * scale });
  function drawRoute() {
    const svg = $('#route-map'); svg.replaceChildren();
    for (const leg of legs) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', leg.points.map((v, i) => { const q = map(v); return `${i ? 'L' : 'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`; }).join(' '));
      p.setAttribute('class', `${day && leg.day !== day ? 'muted ' : ''}${selected && (leg.stopId === selected.id || leg.destination === selected.name) ? 'selected ' : ''}${city && leg.id === 'sky-soho-return' ? 'return' : ''}`);
      svg.append(p);
    }
    for (const stop of stops) {
      const p = map(stop.position), circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y); circle.setAttribute('r', selected?.id === stop.id ? 4 : 2.4);
      circle.setAttribute('class', selected?.id === stop.id ? 'selected' : '');
      svg.append(circle);
    }
  }

  function setView(next, write = true) {
    view = next === 'top' || next === 'overview' ? 'top' : 'planet';
    scene.overview(view);
    if (selected) { scene.select(selected); scene.focus?.(selected); }
    for (const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
    if (write) updateURL();
  }
  function setDay(next, write = true) {
    day = next; selected = null;
    scene.setDay(day); scene.select(null);
    renderStops(); renderInfo(); setView(view, false);
    for (const b of document.querySelectorAll('[data-day]')) b.setAttribute('aria-pressed', String(Number(b.dataset.day) === day));
    if (write) updateURL();
  }
  if (!city) for (let i = 0; i <= 7; i++) {
    const b = document.createElement('button');
    b.dataset.day = i; b.textContent = i ? `D${i}` : '全程'; b.title = dayNames[i];
    b.setAttribute('aria-label', i ? `第${i}天 ${dayNames[i]}` : '全程路线');
    b.addEventListener('click', () => setDay(i));
    $('#day-tabs').append(b);
  }

  $('#reset').addEventListener('click', () => { selected = null; setRotation(false); scene.select(null); setDay(0); });
  for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => setView(b.dataset.view));
  $('#rotate').addEventListener('click', () => setRotation(!rotating));
  $('#zoom-in').addEventListener('click', () => scene.zoom(.85));
  $('#zoom-out').addEventListener('click', () => scene.zoom(1.18));
  $('#light').addEventListener('click', () => { sunset = !sunset; scene.setLight(sunset); document.body.classList.toggle('sunset', sunset); $('#light').setAttribute('aria-pressed', String(sunset)); });
  $('#fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('可通过浏览器菜单进入全屏。'); } });
  $('#snapshot').addEventListener('click', () => { scene.render(0); const a = document.createElement('a'); a.download = `RealTrip-${city ? '一日游' : '北疆'}星球.png`; a.href = scene.screenshot(); a.click(); });
  $('#place-details').addEventListener('click', () => {
    if (mobile.matches && !$('#sheet').classList.contains('is-open')) { setSheet(true); return; }
    $('#place-dialog-title').textContent = $('#detail-title').textContent;
    $('#place-dialog-copy').textContent = $('#detail-copy').textContent;
    $('#place-dialog-meta').textContent = $('#detail-meta').textContent;
    $('#place-dialog-coords').textContent = selected ? `${selected.position[0].toFixed(4)}° N / ${selected.position[1].toFixed(4)}° E` : '';
    $('#place-dialog').showModal();
  });
  $('#about').addEventListener('click', () => $('#about-dialog').showModal());
  $('#source').addEventListener('click', () => $('#about-dialog').showModal());
  $('#extras').addEventListener('click', () => $('#extras-dialog').showModal());
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => b.closest('dialog').close());
  $('#return-stop').addEventListener('click', () => select(model.returnStop));
  $('#route-toggle').addEventListener('click', () => { const value = $('#route-panel').classList.toggle('mobile-open'); $('#route-toggle').setAttribute('aria-expanded', String(value)); });

  try {
    const onInteract = () => { setRotation(false); $('#gesture-hint').classList.add('is-gone'); };
    scene = city ? new SkySohoScene($('#scene'), model, { onSelect: stop => select(stop), onInteract }) : new RouteScene($('#scene'), model, { onSelect: stop => select(stop), onInteract });
    scene.onContextLost = () => { setRotation(false); toast('3D 渲染连接中断，请刷新重试。'); };
    function loadQuery() {
      const q = new URLSearchParams(location.search), d = Number(q.get('day'));
      view = q.get('view') === 'top' || q.get('view') === 'overview' ? 'top' : 'planet';
      setDay(!city && Number.isInteger(d) && d >= 0 && d <= 7 ? d : 0, false);
      const stop = [...stops, ...(city ? [model.returnStop] : [])].find(s => s.id === q.get('poi'));
      if (stop) { if (day && !stop.days.includes(day)) setDay(0, false); select(stop, false); }
      updateURL();
    }
    loadQuery();
    window.addEventListener('popstate', loadQuery);
    $('#loading').hidden = true;
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (document.hidden) return;
      if (rotating && !scene.flight) scene.orbitPOI(dt);
      scene.render(dt);
    }
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => { if (document.hidden) setRotation(false); last = performance.now(); });
  } catch (error) {
    console.error(error);
    $('#loading').textContent = '3D 沙盘暂未加载成功，请开启浏览器硬件加速后刷新。行程列表仍可浏览。';
    $('#loading').classList.add('is-error');
  }
}
