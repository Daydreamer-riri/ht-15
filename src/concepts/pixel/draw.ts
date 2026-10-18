import type { Biome } from '../shared/trip';
import type { DriveState } from './model';

/** 画布内部像素尺寸：用 3 倍放大显示，所有绘制都取整，保证硬边像素 */
export const PX_W = 132;
export const PX_H = 286;

type RGB = [number, number, number];

const hex = (h: string): RGB => [1, 3, 5].map(i => Number.parseInt(h.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * t) as RGB;
const css = (c: RGB) => `rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0})`;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

interface Palette {
  sky: [RGB, RGB, RGB];
  sun: RGB;
  far: RGB;
  farSnow?: RGB;
  near: RGB;
  lake?: RGB;
  ground: RGB;
  groundDark: RGB;
  road: RGB;
  dash: RGB;
  post: RGB;
  night: number;
}

const SKY: { at: number; top: string; mid: string; low: string }[] = [
  { at: 0, top: '#1d1f52', mid: '#7a5590', low: '#ffab7a' },
  { at: 0.16, top: '#4aa3e8', mid: '#a6d3f5', low: '#d5ebfc' },
  { at: 0.72, top: '#3f9ee8', mid: '#96cdf7', low: '#d5ebfc' },
  { at: 0.86, top: '#3b3a8f', mid: '#c9648a', low: '#ffa457' },
  { at: 0.95, top: '#141a45', mid: '#332a63', low: '#8d4460' },
  { at: 1, top: '#04061a', mid: '#0a0f30', low: '#18244c' },
];

const BIOME: Record<Biome, { near: string; ground: string; snow?: boolean; lake?: boolean }> = {
  desert: { near: '#c08a4a', ground: '#e0c084' },
  mountain: { near: '#2f5d3a', ground: '#6f9a58', snow: true },
  lake: { near: '#2c6a55', ground: '#8fb36a', lake: true },
};

function paletteOf(clock: number, biome: Biome): Palette {
  const c = clamp01(clock);
  let i = 1;
  while (i < SKY.length - 1 && SKY[i].at < c) {
    i++;
  }
  const a = SKY[i - 1];
  const b = SKY[i];
  const t = (c - a.at) / (b.at - a.at || 1);
  const top = mix(hex(a.top), hex(b.top), t);
  const mid = mix(hex(a.mid), hex(b.mid), t);
  const low = mix(hex(a.low), hex(b.low), t);
  const night = Math.max(smooth(0.8, 0.97, c), (1 - smooth(0, 0.14, c)) * 0.6);
  const style = BIOME[biome];
  const dim = (x: RGB, k: number) => mix(x, [6, 8, 16], night * k);
  return {
    sky: [dim(top, 0.92), dim(mid, 0.9), dim(low, 0.7)],
    sun: mix(hex('#fff6d8'), hex('#ff9a52'), smooth(0.52, 0.8, c) + 1 - smooth(0, 0.22, c)),
    far: dim(mix(hex('#7b8ba8'), low, 0.16), 0.94),
    farSnow: style.snow ? dim(hex('#f2f7ff'), 0.86) : undefined,
    near: dim(hex(style.near), 0.86),
    lake: style.lake ? dim(mix(hex('#2b7fc4'), mid, 0.25), 0.8) : undefined,
    ground: dim(hex(style.ground), 0.88),
    groundDark: dim(mix(hex(style.ground), [0, 0, 0], 0.25), 0.88),
    road: dim(hex('#6d6f78'), 0.9),
    dash: dim(hex('#ffe9a8'), 0.6),
    post: dim(hex('#e8e8e8'), 0.7),
    night,
  };
}

const HORIZON = 152;
const ROAD_TOP = 196;
const ROAD_H = 30;
const CAR_X = 42;

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: RGB | string) {
  ctx.fillStyle = typeof color === 'string' ? color : css(color);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** 锯齿山脊：把每个采样点的 y 量化到 2px 形成像素台阶，返回每列的高度供雪线使用 */
function ridge(ctx: CanvasRenderingContext2D, seed: number, base: number, amp: number, color: RGB, step: number) {
  const heights: number[] = [];
  for (let x = 0; x < PX_W; x += step) {
    const v = Math.sin(x * 0.06 + seed) * 0.5 + Math.sin(x * 0.13 + seed * 2) * 0.3 + Math.sin(x * 0.29 + seed * 3) * 0.2;
    const h = Math.round((amp * (0.45 + 0.55 * v)) / 2) * 2;
    heights.push(h);
    rect(ctx, x, base - h, step, h, color);
  }
  return heights;
}

/** 只在山峰上部叠几行浅色，做出雪线，而不是整条山脊变白 */
function snowCap(ctx: CanvasRenderingContext2D, base: number, heights: number[], step: number, color: RGB, cut: number) {
  heights.forEach((h, i) => {
    if (h > cut) {
      rect(ctx, i * step, base - h, step, 3, color);
    }
  });
}

function clouds(ctx: CanvasRenderingContext2D, p: Palette, offset: number) {
  const tint = mix([255, 255, 255], p.sky[1], p.night * 0.7);
  for (let i = 0; i < 4; i++) {
    const x = ((i * 61 - offset * 0.12) % (PX_W + 40) + PX_W + 40) % (PX_W + 40) - 20;
    const y = 34 + i * 17;
    rect(ctx, x, y, 18, 4, tint);
    rect(ctx, x + 4, y - 4, 10, 4, tint);
    rect(ctx, x + 16, y + 2, 8, 3, tint);
  }
}

function sun(ctx: CanvasRenderingContext2D, p: Palette, clock: number) {
  const t = clock / 0.86;
  const cx = Math.round(18 + 96 * t);
  const cy = Math.round(HORIZON - 34 - Math.sin(Math.PI * Math.min(1, t)) * 62);
  const r = 7;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    rect(ctx, cx - w, cy + dy, w * 2 + 1, 1, p.sun);
  }
}

function stars(ctx: CanvasRenderingContext2D, p: Palette, seed: number) {
  if (p.night < 0.35) {
    return;
  }
  for (let i = 0; i < 40; i++) {
    const v = Math.sin(i * 91.7 + seed) * 43758.5453;
    const x = Math.floor(((v - Math.floor(v)) * PX_W));
    const y = Math.floor((Math.abs(Math.sin(i * 31.3)) * (HORIZON - 50)));
    rect(ctx, x, y, 1, 1, mix([20, 24, 40], [255, 255, 255], p.night));
  }
}

/** 车用基本图形拼：车身、驾驶舱玻璃、保险杠、两个轮子，前灯夜里点亮 */
function car(ctx: CanvasRenderingContext2D, p: Palette, bob: boolean) {
  const body = mix([214, 62, 48], [46, 42, 62], p.night * 0.55);
  const dark = mix([120, 26, 20], [24, 24, 38], p.night * 0.55);
  const glass = mix([150, 214, 255], [34, 54, 96], p.night);
  const tyre = [26, 26, 30] as RGB;
  const x = CAR_X;
  const y = ROAD_TOP + 11 + (bob ? 1 : 0);

  rect(ctx, x - 1, y + 12, 24, 2, mix(p.road, [0, 0, 0], 0.35));
  rect(ctx, x + 1, y + 1, 20, 10, dark);
  rect(ctx, x + 2, y + 2, 18, 8, body);
  rect(ctx, x + 3, y - 4, 14, 6, dark);
  rect(ctx, x + 4, y - 3, 12, 5, body);
  rect(ctx, x + 5, y - 2, 10, 4, glass);
  rect(ctx, x + 20, y + 4, 1, 4, mix([255, 240, 190], [90, 90, 110], p.night * 0.4));
  for (const wx of [x + 5, x + 15]) {
    rect(ctx, wx, y + 11, 5, 3, tyre);
    rect(ctx, wx + 1, y + 12, 2, 1, mix(tyre, [190, 190, 200], 0.6));
  }
  if (p.night > 0.4) {
    const beam = mix(p.sky[0], [255, 236, 170], 0.85);
    for (let i = 0; i < 3; i++) {
      rect(ctx, x + 22 + i * 5, y + 5 - i, 5, 2, beam);
    }
  }
}

/** 路边小物：仙人掌、树、石头、房子，按地貌和公里数摆放 */
function props(ctx: CanvasRenderingContext2D, p: Palette, biome: Biome, offset: number) {
  const near = p.night > 0.5 ? mix(p.groundDark, [0, 0, 0], 0.2) : p.groundDark;
  for (let i = 0; i < 14; i++) {
    const worldX = i * 34 - offset * 0.55;
    const x = ((worldX % 480) + 480) % 480 - 40;
    if (x < -20 || x > PX_W + 20) {
      continue;
    }
    const y = ROAD_TOP - 8;
    if (biome === 'desert' && i % 2 === 0) {
      rect(ctx, x, y - 12, 3, 14, near);
      rect(ctx, x - 4, y - 8, 4, 3, near);
      rect(ctx, x + 3, y - 10, 4, 3, near);
    } else if (biome === 'mountain') {
      rect(ctx, x, y - 6, 3, 8, mix(near, [40, 26, 16], 0.6));
      rect(ctx, x - 5, y - 14, 13, 10, near);
      rect(ctx, x - 3, y - 18, 9, 5, near);
    } else {
      rect(ctx, x, y - 5, 9, 7, mix(near, [90, 84, 70], 0.45));
      rect(ctx, x + 2, y - 8, 5, 3, mix(near, [90, 84, 70], 0.45));
    }
  }
}

export interface SceneInput {
  state: DriveState;
  /** 已行驶里程，用来滚动世界 */
  km: number;
  /** 时间（毫秒），做细微动画 */
  t: number;
}

export function drawScene(ctx: CanvasRenderingContext2D, { state, km, t }: SceneInput) {
  const p = paletteOf(state.clock, state.day.biome);
  const offset = km * 1.6;

  rect(ctx, 0, 0, PX_W, HORIZON, p.sky[0]);
  rect(ctx, 0, 44, PX_W, 54, p.sky[1]);
  rect(ctx, 0, 98, PX_W, HORIZON - 98, p.sky[2]);
  stars(ctx, p, offset);
  if (state.clock < 0.86) {
    sun(ctx, p, state.clock);
  } else {
    rect(ctx, 96, 30, 8, 8, mix(p.sky[0], [246, 241, 222], 0.9));
    rect(ctx, 98, 28, 8, 8, p.sky[0]);
  }
  clouds(ctx, p, offset);

  const farBase = HORIZON - 4;
  if (state.day.biome === 'mountain') {
    const far = ridge(ctx, 1.2, farBase, 46, p.far, 3);
    if (p.farSnow) {
      snowCap(ctx, farBase, far, 3, p.farSnow, 34);
    }
    const near = ridge(ctx, 3.4, HORIZON + 2, 20, mix(p.far, [0, 0, 0], 0.3), 4);
    if (p.farSnow) {
      snowCap(ctx, HORIZON + 2, near, 4, mix(p.farSnow, p.far, 0.35), 12);
    }
  } else {
    ridge(ctx, 2.1, farBase, 22, p.far, 4);
  }
  if (p.lake) {
    rect(ctx, 0, HORIZON, PX_W, 12, p.lake);
  }
  ridge(ctx, 4.7, HORIZON + 8, 14, p.near, 4);

  rect(ctx, 0, HORIZON + 12, PX_W, PX_H, biomeGround(p, state));

  // 公路
  rect(ctx, 0, ROAD_TOP, PX_W, ROAD_H, p.road);
  rect(ctx, 0, ROAD_TOP, PX_W, 2, mix(p.road, [255, 255, 255], 0.35));
  rect(ctx, 0, ROAD_TOP + ROAD_H - 2, PX_W, 2, mix(p.road, [0, 0, 0], 0.4));
  const dashGap = 22;
  const shift = ((offset % dashGap) + dashGap) % dashGap;
  for (let i = -1; i < 7; i++) {
    rect(ctx, i * dashGap - shift, ROAD_TOP + 14, 12, 3, p.dash);
  }

  // 里程碑：每 100 公里一根柱子
  for (let i = 0; i < 4; i++) {
    const mark = Math.ceil(km / 100) * 100 + i * 100;
    const dx = (mark - km) * 1.6 + CAR_X;
    if (dx > CAR_X + 10 && dx < PX_W) {
      rect(ctx, dx, ROAD_TOP - 10, 2, 10, p.post);
      rect(ctx, dx - 1, ROAD_TOP - 14, 4, 4, p.post);
    }
  }

  props(ctx, p, state.day.biome, offset);
  car(ctx, p, Math.sin(t / 90) > 0.6);
  if (state.atStop) {
    // 到站时在车后面扬一点土
    rect(ctx, CAR_X - 10, ROAD_TOP + 24, 6, 2, mix(p.ground, [255, 255, 255], 0.2));
  }

  // 画布四周压一圈暗角
  ctx.fillStyle = `rgb(0 0 0 / ${0.06 + p.night * 0.16})`;
  ctx.fillRect(0, 0, PX_W, 2);
  ctx.fillRect(0, PX_H - 2, PX_W, 2);
  ctx.fillRect(0, 0, 2, PX_H);
  ctx.fillRect(PX_W - 2, 0, 2, PX_H);
}

function biomeGround(p: Palette, state: DriveState): RGB {
  const w = smooth(0, 4, state.toNext);
  return mix(p.ground, p.groundDark, 0.15 + w * 0.2);
}
