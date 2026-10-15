import type { LatLng } from '@/data/types';

type XY = [number, number];

/** Web Mercator 投影到单位平面，y 轴向下 */
export function mercator([lat, lng]: LatLng): XY {
  const s = Math.sin((lat * Math.PI) / 180);
  return [(lng + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)];
}

export type Projector = (p: LatLng) => XY;

/** 把一组坐标等比缩放进 width × height 的画布，居中留白 */
export function fitProjector(points: LatLng[], width: number, height: number, padding = 16): Projector {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const [x, y] = mercator(p);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return p => {
    const [x, y] = mercator(p);
    return [offX + (x - minX) * scale, offY + (y - minY) * scale];
  };
}

/** 投影并丢掉与上一点相距不足 minGap 像素的点，首尾点始终保留 */
function decimate(points: LatLng[], project: Projector, minGap: number) {
  const out: XY[] = [];
  for (let i = 0; i < points.length; i++) {
    const xy = project(points[i]);
    const prev = out.at(-1);
    if (prev && i < points.length - 1 && Math.hypot(xy[0] - prev[0], xy[1] - prev[1]) < minGap) {
      continue;
    }
    out.push(xy);
  }
  return out;
}

const fmt = (xy: XY) => `${xy[0].toFixed(1)} ${xy[1].toFixed(1)}`;

/** 折线转 SVG path */
export function toPath(points: LatLng[], project: Projector, minGap = 0.6) {
  return decimate(points, project, minGap).map((xy, i) => `${i ? 'L' : 'M'}${fmt(xy)}`).join('');
}

/** 抽稀后用二次贝塞尔过中点连接，得到“手绘感”的圆润曲线 */
export function toSmoothPath(points: LatLng[], project: Projector, minGap = 4) {
  const pts = decimate(points, project, minGap);
  if (pts.length < 3) {
    return pts.map((xy, i) => `${i ? 'L' : 'M'}${fmt(xy)}`).join('');
  }
  let d = `M${fmt(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mid: XY = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += `Q${fmt(pts[i])} ${fmt(mid)}`;
  }
  return `${d}L${fmt(pts[pts.length - 1])}`;
}

/** 球面距离（公里） */
export function distanceKm(a: LatLng, b: LatLng) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
