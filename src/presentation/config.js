export const EXPERIENCE_URL = 'https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/sky-soho/?view=planet';
export const DEFAULT_VIDEO_URL = 'https://www.bilibili.com/video/BV1ZBpX6iEw6/';

export const STEPS = [
  { generation: 0 },
  { generation: 1 },
  { generation: 1, reaction: '不行' },
  { generation: 2 },
  { generation: 2, reaction: '不行' },
  { generation: 3 },
  { generation: 3, reaction: '好像还差点意思' },
  { generation: 4 },
];

export function parseVideo(value) {
  const text = value.trim();
  if (/^BV[0-9A-Za-z]{10}$/.test(text)) return { bvid: text, page: 1 };
  let url;
  try { url = new URL(text); } catch { return null; }
  if (url.protocol !== 'https:' || !['www.bilibili.com', 'bilibili.com', 'm.bilibili.com', 'player.bilibili.com'].includes(url.hostname)) return null;
  const bvid = url.pathname.match(/^\/video\/(BV[0-9A-Za-z]{10})(?:\/|$)/)?.[1] || url.searchParams.get('bvid');
  if (!bvid || !/^BV[0-9A-Za-z]{10}$/.test(bvid)) return null;
  const requestedPage = Number(url.searchParams.get('p') || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { bvid, page };
}

export function videoUrls(value) {
  const video = parseVideo(value) || parseVideo(DEFAULT_VIDEO_URL);
  return {
    watch: `https://www.bilibili.com/video/${video.bvid}/?p=${video.page}`,
    embed: `https://player.bilibili.com/player.html?bvid=${video.bvid}&p=${video.page}&autoplay=1&high_quality=1`,
  };
}
