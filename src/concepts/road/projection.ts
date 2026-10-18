/** 挡风玻璃视角的透视投影：世界坐标 X 横向、Y 高度、z 前方距离（单位约等于米） */
export const VIEW_W = 390;
export const VIEW_H = 480;
export const CX = VIEW_W / 2;
/** 地平线高度 */
export const HY = 196;
const FOCAL = 260;
const CAM_H = 1.25;

export const Z_NEAR = 1.15;
export const Z_FAR = 180;
export const ROAD_HALF = 3.6;

export type Pt = [number, number];

export function makeProjector(curve: number) {
  const project = (x: number, y: number, z: number): Pt => [
    CX + ((x + curve * z * z) * FOCAL) / z,
    HY + ((CAM_H - y) * FOCAL) / z,
  ];
  /** 世界宽度在深度 z 处对应的屏幕像素 */
  const scaleAt = (z: number) => FOCAL / z;
  return { project, scaleAt };
}

/** 按 1/z 均匀采样，近处密、远处疏 */
export function depthSamples(n: number, near = Z_NEAR, far = 320) {
  return Array.from({ length: n + 1 }, (_, k) => 1 / (1 / near + (1 / far - 1 / near) * (k / n)));
}

export const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

const PERIOD = VIEW_W * 2;

/** 首尾可无缝拼接的山脊线（宽 2 个周期），jag 越大山峰越尖 */
export function ridgePath(seed: number, amp: number, jag: number, lift = 0) {
  const base = HY + 1;
  const f = (x: number) => {
    const w = (2 * Math.PI * x) / PERIOD;
    const soft = 0.55 * Math.sin(w * 2 + seed) + 0.3 * Math.sin(w * 5 + seed * 2.3) + 0.15 * Math.sin(w * 9 + seed * 0.7);
    const sharp = 1 - 2 * Math.abs(Math.sin(w * 4 + seed * 1.7)) * 0.6 - Math.abs(Math.sin(w * 11 + seed)) * 0.4;
    const v = (1 - jag) * soft + jag * sharp;
    return base - lift - amp * (0.5 + 0.5 * v);
  };
  const line: string[] = [];
  for (let x = 0; x <= PERIOD * 2; x += 6) {
    line.push(`${x} ${f(x).toFixed(1)}`);
  }
  return `M0 ${base + 30}L${line.join('L')}L${PERIOD * 2} ${base + 30}Z`;
}

export function wrapPan(px: number) {
  return -(((px % PERIOD) + PERIOD) % PERIOD);
}
