import itinerary from './data/itinerary.json';
import { buildExperience, sceneHref } from './experience.js';
import { SkySohoScene } from './scene.js';
import './style.css';

const model = buildExperience(itinerary);
const container = document.querySelector('#scene');
const status = document.querySelector('#scene-status');
const viewButton = document.querySelector('#view');
const resetButton = document.querySelector('#reset');
let scene;

// The five links remain available even if WebGL cannot initialize.
function unavailable() {
  status.hidden = false;
  status.textContent = '沙盘暂时无法显示，点击下方场景即可进入实景。';
  container.hidden = true;
  viewButton.disabled = resetButton.disabled = true;
}

function applyView(mode, write = true) {
  const view = mode === 'top' || mode === 'overview' ? 'top' : 'planet';
  scene.overview(view);
  viewButton.setAttribute('aria-pressed', String(view === 'top'));
  viewButton.textContent = view === 'top' ? '星球视角' : '俯瞰视角';
  if (write) {
    const url = new URL(location.href);
    url.searchParams.set('view', view);
    history.replaceState(null, '', url);
  }
}

try {
  scene = new SkySohoScene(container, model, {
    onSelect: () => {}, onInteract: () => {},
    markerHref: stop => sceneHref(stop.sceneId),
  });
  scene.canvas.setAttribute('aria-label', '携程 Hackathon 一日游沙盘。拖动旋转，滚轮或双指缩放；点击场景名称进入实景探索。');
  // These are scene entrances on an illustrative campus, not a walking route.
  for (const route of scene.campus.routes) route.group.visible = false;
  scene.onContextLost = unavailable;
  const loadQuery = () => {
    const query = new URLSearchParams(location.search);
    applyView(query.get('view'));
    const stop = model.stops.find(item => item.id === query.get('poi') || item.sceneId === query.get('poi'));
    scene.select(stop);
  };
  loadQuery();
  window.addEventListener('popstate', loadQuery);
  viewButton.addEventListener('click', () => applyView(scene.view === 'top' ? 'planet' : 'top'));
  resetButton.addEventListener('click', () => applyView('planet'));
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (!document.hidden && !container.hidden) scene.render(dt);
  }
  requestAnimationFrame(frame);
  // Render once before removing the initial loading message.
  scene.render(0);
  status.hidden = true;
} catch (error) {
  console.error('Unable to load the campus', error);
  unavailable();
}
