import { DEFAULT_VIDEO_URL, EXPERIENCE_URL, STEPS, parseVideo, videoUrls } from './config.js';
import { name as itineraryName, days as itineraryDays } from './data/itinerary.json';

const $ = selector => document.querySelector(selector);
const storageKey = 'realtrip-presentation-video-v1';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let step = -1;
let videoUrl = DEFAULT_VIDEO_URL;
let toastTimer;
try { const saved = localStorage.getItem(storageKey); if (saved && parseVideo(saved)) videoUrl = saved; } catch { /* Browser storage is optional. */ }

const aiAvatar = '<svg viewBox="0 0 24 24"><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/></svg>';
const userAvatar = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>';

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function dayRoute(day) {
  const destinations = day.items.filter(item => ['poi', 'custom'].includes(item.kind)).map(item => item.name);
  if (day.index === 1) return ['上海', '吐鲁番', ...destinations, '布尔津'];
  if (day.index === 3) return [...destinations, '克拉玛依'];
  if (day.index === 6) return [...destinations, '吐鲁番'];
  if (day.index === 7) return ['吐鲁番', '上海'];
  return destinations;
}

function itineraryRows() {
  const hackathonDay = '<div class="itinerary-row hackathon-day" style="--row:1"><span class="day-number">D01</span><p><strong>携程 Hackathon</strong><span class="route-arrow"> → </span>项目展示<span class="route-arrow"> → </span>实景体验<span class="today-label">今天</span></p></div>';
  return hackathonDay + itineraryDays.map(day => `<div class="itinerary-row" style="--row:${day.index + 1}"><span class="day-number">D${String(day.index + 1).padStart(2, '0')}</span><p>${dayRoute(day).map(escapeHtml).join('<span class="route-arrow"> → </span>')}</p></div>`).join('');
}

function videoCover() {
  return `<button id="play-video" class="video-cover" aria-label="播放演示视频"><span class="video-orbit" aria-hidden="true"></span><span class="play-circle"><svg viewBox="0 0 24 24"><path d="m9 5 11 7-11 7Z"/></svg></span><span>点击播放</span><small>PRESS PLAY. GO SOMEWHERE.</small></button>`;
}

function messageContent(index) {
  if (index === 0) return '<p>我今天参加携程的 Hackathon，明天出发去度假，请给我出一个方案。</p>';
  if (STEPS[index].reaction) return `<p>${STEPS[index].reaction}</p>`;
  if (index === 1) return `<div class="text-plan"><p>今天，先在<strong class="trip-name">携程 Hackathon</strong>让想法落地。<br>明天出发，接上<strong class="trip-name">${escapeHtml(itineraryName)}</strong>的假期。</p><div class="itinerary-list">${itineraryRows()}</div><p class="packing-note">今天参赛，明天出发。1 天 Hackathon + 7 天北疆之旅。</p></div>`;
  if (index === 3) return `<div class="visual-plan"><p>那就从今天的 Hackathon，看到下一程。</p><div class="hackathon-stop"><span class="hackathon-symbol" aria-hidden="true">✦</span><div><span class="event-day">DAY 01 · TODAY</span><strong>携程 Hackathon</strong><p>参加比赛 · 项目展示 · 实景体验</p></div><span class="event-tag">灵感，正在发生。</span></div><figure class="photo-story"><img src="./assets/sayram.jpg" alt="原行程中的赛里木湖风景" width="1500" height="800"><figcaption><span class="photo-eyebrow">DAY 02–08 / NORTH XINJIANG</span><strong>明天，去见更大的世界。</strong><span>赛里木湖 · 第 5–6 天</span></figcaption></figure><div class="destination-pair"><figure><img src="./assets/baihaba.jpg" alt="原行程中的白哈巴景区" width="600" height="300"><figcaption><span>DAY 03</span><strong>白哈巴</strong></figcaption></figure><figure><img src="./assets/kanas.jpg" alt="原行程中的喀纳斯景区" width="600" height="300"><figcaption><span>DAY 04</span><strong>喀纳斯</strong></figcaption></figure></div><p class="photo-summary">从今天的灵感碰撞，到明天的辽阔山河。</p></div>`;
  if (index === 5) return `<div class="video-plan"><p>那就让画面动起来。先看一段旅程。</p><div class="video-frame" id="video-frame">${videoCover()}</div><div class="video-caption"><span>临时演示视频</span><a class="video-link" id="watch-video" href="${videoUrls(videoUrl).watch}" target="_blank" rel="noopener noreferrer">在 B 站打开 ↗</a></div></div>`;
  return `<div class="experience-plan"><h2>这一次，<br>你来走一走。</h2><p>从 Hackathon 一日游出发，<br>走进 5 个真实空间。</p><a class="qr-link" href="${EXPERIENCE_URL}" target="_blank" rel="noopener noreferrer" aria-label="打开携程 Hackathon 一日游沙盘"><img src="${__EXPERIENCE_QR_URL__}" alt="扫码打开携程 Hackathon 一日游沙盘" width="256" height="256"><span>扫码，立即出发 ↗</span></a><a class="experience-link" href="${EXPERIENCE_URL}" target="_blank" rel="noopener noreferrer">RealTrip · 携程 Hackathon 一日游</a></div>`;
}

function createMessage(index) {
  const isUser = index === 0 || !!STEPS[index].reaction;
  const row = document.createElement('article');
  row.className = `message ${isUser ? 'user-message' : 'ai-message'} entering`;
  row.id = `message-${index}`;
  row.dataset.step = index;
  const name = isUser ? '我' : `大模型 · 第 ${STEPS[index].generation} 代`;
  row.innerHTML = `<div class="avatar" aria-hidden="true">${isUser ? userAvatar : aiAvatar}</div><div class="message-main"><span class="speaker-name">${name}</span><div class="bubble ${index === 7 ? 'experience-bubble' : ''}">${messageContent(index)}</div></div>`;
  return row;
}

function stopVideo() {
  if ($('#video-frame iframe')) $('#video-frame').innerHTML = videoCover();
}

function updatePresentation() {
  $('#empty-state').hidden = step >= 0;
  document.querySelectorAll('.message').forEach(message => message.classList.toggle('current-message', Number(message.dataset.step) === step));
  $('.chat-app').classList.toggle('experience-revealed', step === STEPS.length - 1);
}

function scrollToLatest(animate = true) {
  const viewport = $('#conversation');
  const latest = $('#messages').lastElementChild;
  if (!latest) { viewport.scrollTop = 0; return; }
  // Keep the entire new bubble in view; oversized messages start at their top.
  const top = latest.offsetTop;
  const bottom = top + latest.offsetHeight;
  const target = latest.offsetHeight > viewport.clientHeight - 56 ? top - 24 : bottom - viewport.clientHeight + 40;
  viewport.scrollTo({ top: Math.max(0, target), behavior: animate && !reducedMotion.matches ? 'smooth' : 'instant' });
}

function goTo(nextStep) {
  const next = Math.max(-1, Math.min(STEPS.length - 1, nextStep));
  if (next === step) return;
  stopVideo();
  if (next < step) {
    while ($('#messages').children.length > next + 1) $('#messages').lastElementChild.remove();
  } else {
    for (let index = step + 1; index <= next; index++) $('#messages').append(createMessage(index));
  }
  step = next;
  updatePresentation();
  requestAnimationFrame(() => scrollToLatest());
}

function playVideo() {
  const frame = document.createElement('iframe');
  frame.src = videoUrls(videoUrl).embed;
  frame.title = '旅行演示视频';
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

$('#restart').addEventListener('click', () => goTo(-1));
$('#fullscreen-button').addEventListener('click', toggleFullscreen);
$('#conversation').addEventListener('click', event => {
  if (event.target.closest('#play-video')) { playVideo(); return; }
  if (event.target.closest('a, button, iframe, video') || window.getSelection()?.toString()) return;
  goTo(step + 1);
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
  if (['ArrowRight', 'ArrowDown', 'PageDown', 'Space'].includes(event.code)) { event.preventDefault(); goTo(step + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.code)) { event.preventDefault(); goTo(step - 1); }
  else if (event.code === 'Home' || event.key.toLowerCase() === 'r') { event.preventDefault(); goTo(-1); }
  else if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen(); }
});

updatePresentation();
