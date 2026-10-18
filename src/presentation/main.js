import { DEFAULT_VIDEO_URL, EXPERIENCE_URL, STEPS, parseVideo, videoUrls } from './config.js';
import { days as dayTrip } from '../sky-soho/data/itinerary.json';

const $ = selector => document.querySelector(selector);
const storageKey = 'realtrip-presentation-video-v1';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let step = -1;
let videoUrl = DEFAULT_VIDEO_URL;
let toastTimer;
try { const saved = localStorage.getItem(storageKey); if (saved && parseVideo(saved)) videoUrl = saved; } catch { /* Browser storage is optional. */ }

const aiAvatar = '<svg viewBox="0 0 24 24"><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/></svg>';
const icons = {
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M7 11v9H4.5a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5H7Zm0 0 4-7.5a2 2 0 0 1 3.7 1.3L14 9h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M17 13V4h2.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5H17Zm0 0-4 7.5a2 2 0 0 1-3.7-1.3L10 15H5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.2 4H17"/></svg>',
  retry: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></svg>',
};

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const isUserStep = index => index === 0 || !!STEPS[index].reaction;
const userText = index => (index === 0 ? '我今天在凌空 SOHO 参加携程 Hackathon，帮我安排一下这一天。' : STEPS[index].reaction);

/* ---------------- 可跳过的计时：演讲者连按时直接完成当前动画 ---------------- */

/** 每次推进/回退都会递增；异步动画发现编号变了就停止 */
let run = 0;
let busy = false;
let skipping = false;
const pending = new Set();

function wait(ms) {
  if (skipping || reducedMotion.matches) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => { clearTimeout(timer); pending.delete(done); resolve(); };
    const timer = setTimeout(done, ms);
    pending.add(done);
  });
}

function skipAnimations() {
  skipping = true;
  [...pending].forEach(done => done());
}

/* ---------------- 内容 ---------------- */

// 凌空 SOHO 一日游：路线顺序与一日游星球一致，步行时长和距离取自原行程（sky-soho/data/itinerary.json）
const [trip] = dayTrip;
const legs = Object.fromEntries(trip.items.map(item => [item.id, item.leg]));
const walk = leg => `步行 ${leg.duration.replace('分钟', ' 分钟')} · ${leg.distance.replace(/(\d)([公米])/, '$1 $2')}`;
const schedule = [
  ['09:00', '淞虹路地铁站出发', walk(legs['sky-soho-building-8'])],
  ['09:30', 'Hackathon 主会场', '开幕、组队，开始动手', true],
  ['11:30', '露台', '到户外透口气，理一理思路'],
  ['12:00', '食堂', '一起吃午饭，补充能量'],
  ['14:00', '会议室', '方案评审，提前五分钟连好投屏'],
  ['18:30', '健身房', '跑步三十分钟，拉伸结束一天'],
  ['19:30', '返回淞虹路地铁站', walk(trip.returnLeg)],
];

const arrow = '<span class="route-arrow"> → </span>';

function itineraryRows() {
  return schedule.map(([time, place, detail, today]) => `<tr${today ? ' class="hackathon-day"' : ''}><td>${time}</td><td><strong>${escapeHtml(place)}</strong>${arrow}${escapeHtml(detail)}${today ? '<span class="today-label">重点</span>' : ''}</td></tr>`).join('');
}

function videoCover() {
  return '<button id="play-video" class="video-cover" aria-label="播放演示视频"><span class="play-circle"><svg viewBox="0 0 24 24"><path d="m9 5 11 7-11 7Z"/></svg></span><span>点击播放</span></button>';
}

function messageContent(index) {
  if (index === 1) {
    return '<p>好的！这是你在<strong>凌空 SOHO</strong> 的一天：从地铁站出发，在主会场让想法落地，中间去露台、食堂和会议室，晚上在健身房收尾。</p>'
      + '<h3>行程安排</h3>'
      + `<div class="table-wrap"><table class="itinerary-table"><thead><tr><th>时间</th><th>安排</th></tr></thead><tbody>${itineraryRows()}</tbody></table></div>`
      + '<p class="note">共 5 个地点，全程步行约 2.6 公里。需要我补充每个地点的注意事项吗？</p>';
  }
  if (index === 3) {
    return '<p>明白，文字不够直观。这是配图版本：</p>'
      + '<div class="hackathon-stop"><span class="hackathon-symbol" aria-hidden="true">✦</span><div><span class="event-day">TODAY · 凌空 SOHO</span><strong>携程 Hackathon 一日游</strong><p>地铁站出发 · 5 个地点 · 步行约 2.6 公里</p></div></div>'
      + '<figure class="photo-story"><img src="./assets/hackathon.jpg" alt="Hackathon 主会场实景" width="960" height="720"><figcaption><span>09:30 · 主会场</span><strong>今天，让想法落地。</strong><small>开幕 · 组队 · 开始动手</small></figcaption></figure>'
      + '<div class="destination-pair"><figure><img src="./assets/terrace.jpg" alt="露台实景" width="960" height="720"><figcaption><span>11:30</span><strong>露台</strong></figcaption></figure><figure><img src="./assets/cafeteria.jpg" alt="食堂实景" width="960" height="720"><figcaption><span>12:00</span><strong>食堂</strong></figcaption></figure></div>'
      + '<div class="destination-pair"><figure><img src="./assets/building2.jpg" alt="会议室实景" width="960" height="720"><figcaption><span>14:00</span><strong>会议室</strong></figcaption></figure><figure><img src="./assets/two-floor.jpg" alt="健身房实景" width="960" height="720"><figcaption><span>18:30</span><strong>健身房</strong></figcaption></figure></div>'
      + '<p class="note">从早上的灵感碰撞，到傍晚的一身轻松。</p>';
  }
  if (index === 5) {
    return '<p>那就让画面动起来。先看看这一天：</p>'
      + `<div class="video-frame" id="video-frame">${videoCover()}</div>`
      + `<div class="video-caption"><span>临时演示视频</span><a class="video-link" id="watch-video" href="${videoUrls(videoUrl).watch}" target="_blank" rel="noopener noreferrer">在 B 站打开 ↗</a></div>`;
  }
  return '<p>说再多，不如亲自去一趟。</p>'
    + `<div class="experience-card"><div class="experience-copy"><span class="event-day">REALTRIP · 实景体验</span><h2>这一次，<br>你来走一走。</h2><p>从淞虹路地铁站出发，走进凌空 SOHO 的 5 个真实空间。</p><a class="experience-link" href="${EXPERIENCE_URL}" target="_blank" rel="noopener noreferrer">打开凌空 SOHO 一日游 ↗</a></div>`
    + `<a class="qr-link" href="${EXPERIENCE_URL}" target="_blank" rel="noopener noreferrer" aria-label="打开凌空 SOHO 一日游星球"><img src="${__EXPERIENCE_QR_URL__}" alt="扫码打开凌空 SOHO 一日游星球" width="256" height="256"><span>扫码，立即出发</span></a></div>`;
}

/* ---------------- 消息 ---------------- */

function userMessage(index) {
  const row = document.createElement('article');
  row.className = 'message user-message entering';
  row.dataset.step = index;
  row.innerHTML = `<h2 class="sr-only">我说</h2><div class="bubble"><p>${escapeHtml(userText(index))}</p></div>`;
  return row;
}

function aiMessage(index) {
  const gen = STEPS[index].generation;
  const row = document.createElement('article');
  row.className = `message ai-message entering is-thinking${index === STEPS.length - 1 ? ' is-finale' : ''}`;
  row.dataset.step = index;
  row.innerHTML = `<div class="avatar" aria-hidden="true">${aiAvatar}</div><div class="message-main">`
    + `<h2 class="speaker-name">大模型 · 第 ${gen} 代</h2>`
    + '<p class="thought"><span class="thought-label">正在思考</span></p>'
    + '<div class="content"></div>'
    + `<div class="message-actions" aria-hidden="true">${icons.copy}${icons.up}${icons.down}${icons.retry}</div></div>`;
  return row;
}

/** 生成内容逐块出现，像模型在流式输出 */
function revealContent(row, index) {
  const content = row.querySelector('.content');
  content.innerHTML = messageContent(index);
  const blocks = content.querySelectorAll(':scope > :not(.table-wrap):not(.destination-pair), .itinerary-table tr, .destination-pair > figure');
  blocks.forEach((block, i) => {
    block.classList.add('stream');
    block.style.setProperty('--i', i);
  });
  return blocks.length;
}

/* ---------------- 输入框 ---------------- */

function setComposer(text) {
  $('#composer-text').textContent = text;
  $('#composer').classList.toggle('has-text', text.length > 0);
}

async function typeIntoComposer(text, id) {
  $('#composer').classList.add('is-typing');
  const chars = [...text];
  const perChar = Math.min(55, 1100 / chars.length);
  for (let i = 1; i <= chars.length && !skipping; i++) {
    setComposer(chars.slice(0, i).join(''));
    await wait(perChar);
    if (id !== run) return false;
  }
  setComposer(text);
  await wait(260);
  if (id !== run) return false;
  $('#composer').classList.remove('is-typing');
  $('#send-button').classList.add('is-sent');
  setTimeout(() => $('#send-button').classList.remove('is-sent'), 400);
  setComposer('');
  return true;
}

/* ---------------- 模型代际 ---------------- */

let shownGen = 1;

function generationAt(index) {
  let gen = 1;
  for (let i = 0; i <= index; i++) if (!isUserStep(i)) gen = STEPS[i].generation;
  return gen;
}

function showGeneration(gen, animate) {
  const chip = $('#model-chip');
  $('#model-gen').textContent = `第 ${gen} 代`;
  if (animate && gen !== shownGen && !reducedMotion.matches) {
    chip.classList.remove('is-upgrading');
    void chip.offsetWidth; // 重新触发动画
    chip.classList.add('is-upgrading');
  } else if (!animate) {
    chip.classList.remove('is-upgrading');
  }
  shownGen = gen;
}

/* ---------------- 推进 ---------------- */

function scrollToLatest(animate = true) {
  const viewport = $('#conversation');
  const latest = $('#messages').lastElementChild;
  if (!latest) { viewport.scrollTop = 0; return; }
  // 新消息尽量完整可见；比视口还高的消息从顶部开始
  const top = latest.offsetTop;
  const bottom = top + latest.offsetHeight;
  const target = latest.offsetHeight > viewport.clientHeight - 48 ? top - 24 : bottom - viewport.clientHeight + 32;
  viewport.scrollTo({ top: Math.max(0, target), behavior: animate && !reducedMotion.matches ? 'smooth' : 'instant' });
}

function updateChrome() {
  const empty = $('#messages').children.length === 0;
  $('.chat-app').classList.toggle('is-empty', empty);
  $('.composer-placeholder').textContent = empty ? '点击，开始对话' : step >= STEPS.length - 1 ? '扫码，亲自走一走' : '点击，继续追问';
  $('.chat-app').classList.toggle('experience-revealed', step === STEPS.length - 1 && !busy);
}

async function playStep(index, id) {
  if (isUserStep(index)) {
    if (!(await typeIntoComposer(userText(index), id))) return;
    $('#messages').append(userMessage(index));
    updateChrome();
    requestAnimationFrame(() => scrollToLatest());
    return;
  }

  const row = aiMessage(index);
  $('#messages').append(row);
  updateChrome();
  showGeneration(STEPS[index].generation, true);
  requestAnimationFrame(() => scrollToLatest());

  const started = performance.now();
  await wait(900 + STEPS[index].generation * 220);
  if (id !== run) return;
  const seconds = Math.max(1, Math.round((performance.now() - started) / 1000));
  row.querySelector('.thought-label').textContent = `已思考 ${seconds} 秒`;
  row.classList.remove('is-thinking');

  const blocks = revealContent(row, index);
  if (skipping) row.classList.add('stream-instant');
  requestAnimationFrame(() => scrollToLatest());
  await wait(blocks * 90 + 450);
  if (id !== run) return;
  row.classList.add('is-done');
}

/** 点击/↓：动画进行中时先完成当前消息，否则新增下一条 */
async function advance() {
  if (busy) { skipAnimations(); return; }
  if (step >= STEPS.length - 1) return;
  stopVideo();
  step += 1;
  busy = true;
  skipping = false;
  const id = ++run;
  updateChrome();
  await playStep(step, id);
  if (id !== run) return;
  busy = false;
  skipping = false;
  document.querySelectorAll('.ai-message:not(.is-done)').forEach(row => row.classList.add('is-done'));
  updateChrome();
  requestAnimationFrame(() => scrollToLatest());
}

/** ↑ / 重来：取消进行中的动画，删掉多余消息 */
function goBack(target) {
  const next = Math.max(-1, Math.min(step, target));
  if (next === step && !busy) return;
  run += 1;
  skipAnimations();
  busy = false;
  skipping = false;
  stopVideo();
  setComposer('');
  $('#composer').classList.remove('is-typing');
  // 回退到一条正在生成的消息时，连同它一起撤回
  step = next;
  while ($('#messages').children.length > step + 1) $('#messages').lastElementChild.remove();
  document.querySelectorAll('.ai-message').forEach(row => {
    row.classList.remove('is-thinking');
    row.classList.add('is-done', 'stream-instant');
  });
  showGeneration(generationAt(step), false);
  updateChrome();
  requestAnimationFrame(() => scrollToLatest(false));
}

function stopVideo() {
  if ($('#video-frame iframe')) $('#video-frame').innerHTML = videoCover();
}

function playVideo() {
  const frame = document.createElement('iframe');
  frame.src = videoUrls(videoUrl).embed;
  frame.title = '一日游演示视频';
  frame.allow = 'autoplay; fullscreen; picture-in-picture';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  $('#video-frame').replaceChildren(frame);
}

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3000);
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else toast('请使用浏览器的全屏功能。');
  } catch { toast('请使用浏览器的全屏功能。'); }
}

/* ---------------- 事件 ---------------- */

$('#restart').addEventListener('click', () => goBack(-1));
$('#fullscreen-button').addEventListener('click', toggleFullscreen);
$('.chat-app').addEventListener('click', event => {
  if (event.target.closest('#play-video')) { playVideo(); return; }
  if (event.target.closest('a, button, iframe, video') || window.getSelection()?.toString()) return;
  advance();
});
window.addEventListener('resize', () => scrollToLatest(false));
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? '退出全屏' : '全屏';
  $('#fullscreen-button').setAttribute('aria-label', label);
  $('#fullscreen-button').title = `${label}（F）`;
});

$('#settings-button').addEventListener('click', () => {
  $('#video-url').value = videoUrl;
  $('#settings-error').textContent = '';
  $('#settings-dialog').showModal();
});
$('#close-settings').addEventListener('click', () => $('#settings-dialog').close());
$('#reset-video').addEventListener('click', () => { $('#video-url').value = DEFAULT_VIDEO_URL; });
$('#settings-form').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('#video-url').value.trim();
  if (!parseVideo(value)) {
    $('#settings-error').textContent = '请输入完整的 bilibili.com/video/BV… 链接或 BV 号。';
    $('#video-url').focus();
    return;
  }
  videoUrl = value;
  let saved = true;
  try { localStorage.setItem(storageKey, videoUrl); } catch { saved = false; }
  stopVideo();
  if ($('#watch-video')) $('#watch-video').href = videoUrls(videoUrl).watch;
  $('#settings-dialog').close();
  toast(saved ? '视频已更新。' : '视频已更新，本次打开有效。');
});

document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || $('#settings-dialog').open || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (event.code === 'Space' && event.target.closest('button, a')) return;
  if (event.repeat) { if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space'].includes(event.code)) event.preventDefault(); return; }
  if (['ArrowRight', 'ArrowDown', 'PageDown', 'Space'].includes(event.code)) { event.preventDefault(); advance(); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.code)) { event.preventDefault(); goBack(step - 1); }
  else if (event.code === 'Home' || event.key.toLowerCase() === 'r') { event.preventDefault(); goBack(-1); }
  else if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen(); }
});

updateChrome();
