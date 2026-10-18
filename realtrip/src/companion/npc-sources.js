import './npc-search.css';

export function createNpcSources(caption) {
 const details = document.createElement('details');
 details.className = 'npc-sources'; details.hidden = true;
 caption.after(details);
 function clear() { details.replaceChildren(); details.hidden = true; details.open = false; }
 function show({sources, searched, searchedAt}) {
  clear();
  if (!searched || !Array.isArray(sources)) return;
  const links = sources.slice(0, 4).flatMap(source => {
   try {
    const url = new URL(source.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return [];
    const link = document.createElement('a');
    link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = String(source.title || url.hostname).slice(0, 180);
    return [link];
   } catch { return []; }
  });
  if (!links.length) return;
  const summary = document.createElement('summary'); summary.textContent = `已联网 · 查看 ${links.length} 个来源`;
  const list = document.createElement('div'); list.className = 'npc-source-links'; list.append(...links);
  const time = document.createElement('small'), date = new Date(searchedAt);
  time.textContent = searchedAt && Number.isFinite(date.getTime()) ? `检索时间：${new Intl.DateTimeFormat('zh-CN', {timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'}).format(date)}（北京时间）` : '网页信息以来源实际更新时间为准';
  details.append(summary, list, time); details.hidden = false;
 }
 return {show, clear};
}
