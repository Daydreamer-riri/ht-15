export async function askSearchNpc({gatewayUrl}, history, text, {signal, fetchImpl = fetch, onSources = () => {}} = {}) {
 if (!gatewayUrl) throw Error('联网对话还没有配置，请刷新重试。');
 const controller = new AbortController(), cancel = () => controller.abort(signal?.reason);
 if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, {once: true});
 const timeout = setTimeout(() => controller.abort(), 50000);
 try {
  if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const response = await fetchImpl(gatewayUrl.replace(/\/$/, '') + '/api/npc/chat', {
   method: 'POST', headers: {'Content-Type': 'application/json'}, signal: controller.signal,
   body: JSON.stringify({text: text.slice(0, 1200), history: history.filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').slice(-10).map(m => ({role: m.role, content: m.content.slice(0, 1200)}))}),
  });
  if (!response.ok) {
   const messages = {429: '联网查询有点密集，请稍等再试。', 503: '联网对话还未就绪，请稍后重试。', 504: '联网查询超时，请再试一次。'};
   throw Error(messages[response.status] || `小蓝暂时无法回答（${response.status}），请重试。`);
  }
  const data = await response.json();
  if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
  if (typeof data.reply !== 'string' || !data.reply.trim()) throw Error('这次没有收到回答，请重试。');
  onSources(data);
  return data.reply.trim().slice(0, 580);
 } catch (error) {
  if (controller.signal.aborted && !signal?.aborted) throw Error('联网查询超时，请再试一次。');
  if (error instanceof TypeError) throw Error('连接小蓝失败，请检查网络后重试。');
  throw error;
 } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); }
}
