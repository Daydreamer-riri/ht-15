import itinerary from './data/itinerary.json';
import { buildExperience, sceneHref } from './experience.js';
import { SkySohoScene } from './scene.js';
import { hydrateIcons } from '../atlas/icons.js';
import './style.css';

hydrateIcons();
const model = buildExperience(itinerary);
const container = document.querySelector('#scene');
const status = document.querySelector('#scene-status');
const viewButtons = [...document.querySelectorAll('[data-view]')];
const resetButton = document.querySelector('#reset');
const hint = document.querySelector('#gesture-hint');
const cards = [...document.querySelectorAll('.scene-card')];
let scene;
const routeSummary = `地铁站出发 · ${(model.distance / 1000).toFixed(1)} 公里步行 · ${Math.round(model.minutes)} 分钟`;
document.querySelector('#route-line').textContent = routeSummary;

// 没有 WebGL 时，入口链接照样可用
function unavailable() {
  status.hidden = false;
  status.textContent = '沙盘暂时无法显示，点击下方场景即可进入实景。';
  container.hidden = true;
  for (const button of [...viewButtons, resetButton]) button.disabled = true;
}

function applyView(mode, write = true) {
  const view = mode === 'top' || mode === 'overview' ? 'top' : 'planet';
  scene.overview(view);
  for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
  if (write) {
    const url = new URL(location.href);
    url.searchParams.set('view', view);
    history.replaceState(null, '', url);
  }
}

/** 列表和门牌互相点亮：悬停或聚焦一行，星球上对应的门牌变为强调色 */
function light(sceneId) {
  const stop = model.stops.find(item => item.sceneId === sceneId);
  scene?.select(stop);
  const line = document.querySelector('#route-line');
  if (line) line.textContent = stop ? `${stop.name} · ${stop.leg.duration}步行 · ${stop.leg.distance}` : routeSummary;
  for (const card of cards) card.classList.toggle('is-lit', card.dataset.scene === sceneId);
}

try {
  scene = new SkySohoScene(container, model, {
    onSelect: () => {}, onInteract: () => hint.classList.add('is-gone'),
    markerHref: stop => sceneHref(stop.sceneId),
  });
  scene.canvas.setAttribute('aria-label', '携程 Hackathon 一日游沙盘。拖动旋转，滚轮或双指缩放；点击场景名称进入实景探索。');
  // 路线按原行程顺序显示：地铁站 → 主会场 → 露台 → 食堂 → 会议室 → 健身房 → 返程
  scene.onContextLost = unavailable;
  const loadQuery = () => {
    const query = new URLSearchParams(location.search);
    applyView(query.get('view'));
    const stop = model.stops.find(item => item.id === query.get('poi') || item.sceneId === query.get('poi'));
    scene.select(stop);
  };
  loadQuery();
  window.addEventListener('popstate', loadQuery);
  for (const button of viewButtons) button.addEventListener('click', () => applyView(button.dataset.view));
  resetButton.addEventListener('click', () => applyView('planet'));
  for (const card of cards) {
    card.addEventListener('pointerenter', () => light(card.dataset.scene));
    card.addEventListener('focus', () => light(card.dataset.scene));
  }
  document.querySelector('.scene-grid').addEventListener('pointerleave', () => light(null));
  for (const pin of container.querySelectorAll('.map-pin')) {
    const sceneId = new URL(pin.href).searchParams.get('scene');
    pin.addEventListener('pointerenter', () => light(sceneId));
    pin.addEventListener('pointerleave', () => light(null));
  }
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (!document.hidden && !container.hidden) scene.render(dt);
  }
  requestAnimationFrame(frame);
  // 先渲染一帧再撤掉加载提示
  scene.render(0);
  status.hidden = true;
} catch (error) {
  console.error('Unable to load the campus', error);
  unavailable();
}
