import type { DaySummary, TripSummary } from '../shared/trip';
import type { LatLng, Leg, Unit } from '@/data/types';
import { distanceKm, mercator } from '../shared/geo';
import { parseKm, parseMinutes } from '../shared/trip';

export type SignKind = 'gantry' | 'poi' | 'hotel' | 'flight' | 'return' | 'custom' | 'finish';
export type Biome = 'desert' | 'mountain' | 'lake';

export interface LegGeo {
  points: LatLng[];
  /** 每个点距起点的累计公里数（按坐标算，只用于插值） */
  cum: number[];
  total: number;
}

export interface Segment {
  index: number;
  day: DaySummary;
  kind: SignKind;
  /** 驶向本站的路段；每日开头的龙门架、无需驾车的航班没有 */
  leg?: LegGeo;
  unit?: Unit;
  title: string;
  /** 本段开始前累计的驾驶公里数 */
  kmBefore: number;
  km: number;
  minutes: number;
  biome: Biome;
  /** 本段在当天的时间进度区间（0 黎明 → 1 深夜） */
  clock: [number, number];
}

/** 每段占用的滚动距离（px） */
export const SEG = 520;
/** 段内进度到这里算“到达”，之后路牌掠过 */
export const ARRIVE = 0.78;

function legGeo(leg: Leg): LegGeo {
  const cum = [0];
  for (let i = 1; i < leg.points.length; i++) {
    cum.push(cum[i - 1] + distanceKm(leg.points[i - 1], leg.points[i]));
  }
  return { points: leg.points, cum, total: cum.at(-1) || 1 };
}

const BIOME_RULES: [RegExp, Biome][] = [
  [/湖|海|河/, 'lake'],
  [/沙漠|魔鬼城|吐鲁番|戈壁|机场/, 'desert'],
  [/喀纳斯|白哈巴|观鱼台|独库|村|山/, 'mountain'],
];

function biomeOf(name: string): Biome | undefined {
  return BIOME_RULES.find(([re]) => re.test(name))?.[1];
}

function unitName(u: Unit) {
  return u.kind === 'transport' ? u.to.name : u.name;
}

function kindOf(u: Unit): SignKind {
  switch (u.kind) {
    case 'transport':
      return 'flight';
    case 'hotel':
      return 'hotel';
    case 'custom':
      return 'custom';
    default:
      return 'poi';
  }
}

/** 落地日从中午开始、返程日在中午结束，其余每天从黎明开到深夜 */
function dayClock(d: DaySummary): [number, number] {
  const items = d.day.items;
  const start = (items[0]?.kind === 'transport' && !items[0].leg) ? 0.32 : 0.04;
  const end = items.at(-1)?.kind === 'transport' ? 0.48 : 1;
  return [start, end];
}

export function buildSegments(trip: TripSummary): Segment[] {
  const segs: Segment[] = [];
  let km = 0;
  let biome: Biome = 'desert';
  for (const d of trip.days) {
    const rows: Omit<Segment, 'index' | 'kmBefore' | 'clock'>[] = [];
    for (const u of d.day.items) {
      rows.push({
        day: d,
        kind: kindOf(u),
        unit: u,
        leg: u.leg && legGeo(u.leg),
        title: unitName(u),
        km: parseKm(u.leg?.distance),
        minutes: parseMinutes(u.leg?.duration),
        biome: (biome = biomeOf(unitName(u)) ?? biome),
      });
    }
    if (d.day.returnLeg) {
      rows.push({
        day: d,
        kind: 'return',
        leg: legGeo(d.day.returnLeg),
        title: d.day.returnLeg.target,
        km: parseKm(d.day.returnLeg.distance),
        minutes: parseMinutes(d.day.returnLeg.duration),
        biome,
      });
    }
    // 每天开头先驶过一块龙门架，地貌沿用当天第一站
    rows.unshift({ day: d, kind: 'gantry', title: d.route, km: 0, minutes: 0, biome: rows[0]?.biome ?? biome });
    const [c0, c1] = dayClock(d);
    rows.forEach((r, i) => {
      segs.push({ ...r, index: segs.length, kmBefore: km, clock: [c0 + ((c1 - c0) * i) / rows.length, c0 + ((c1 - c0) * (i + 1)) / rows.length] });
      km += r.km;
    });
  }
  const last = trip.days.at(-1)!;
  segs.push({ index: segs.length, day: last, kind: 'finish', title: '旅程完成', kmBefore: km, km: 0, minutes: 0, biome, clock: [0.5, 0.62] });
  return segs;
}

/** 段内驾驶进度：到达前缓入缓出，到达后为 1 */
export function driveFrac(t: number) {
  const u = Math.min(1, t / ARRIVE);
  return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
}

function locate(g: LegGeo, frac: number) {
  const target = Math.min(1, Math.max(0, frac)) * g.total;
  let i = 1;
  while (i < g.cum.length - 1 && g.cum[i] < target) {
    i++;
  }
  const span = g.cum[i] - g.cum[i - 1] || 1;
  return { i, k: Math.min(1, Math.max(0, (target - g.cum[i - 1]) / span)) };
}

export function positionAt(g: LegGeo, frac: number): LatLng {
  const { i, k } = locate(g, frac);
  const a = g.points[i - 1] ?? g.points[0];
  const b = g.points[i] ?? a;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

/** 行驶方向（弧度，0 = 正东，屏幕坐标系） */
export function headingAt(g: LegGeo, frac: number, look = 0.04) {
  const [x0, y0] = mercator(positionAt(g, frac));
  const [x1, y1] = mercator(positionAt(g, Math.min(1, frac + look)));
  if (Math.hypot(x1 - x0, y1 - y0) < 1e-12) {
    const [px, py] = mercator(positionAt(g, Math.max(0, frac - look)));
    return Math.atan2(y0 - py, x0 - px);
  }
  return Math.atan2(y1 - y0, x1 - x0);
}

/** 两个方向角之差，落在 (-π, π] */
export function angleDiff(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
