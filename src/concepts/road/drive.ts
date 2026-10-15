import type { Biome, Segment } from './timeline';
import type { LatLng } from '@/data/types';
import { smoothstep } from './palette';
import { angleDiff, ARRIVE, driveFrac, headingAt, positionAt } from './timeline';

export interface DriveState {
  seg: Segment;
  /** 段内进度 0 → 1 */
  t: number;
  /** 当前路段已行驶比例 */
  frac: number;
  arrived: boolean;
  /** 里程表读数 */
  km: number;
  remainKm: number;
  remainMin: number;
  clock: number;
  biome: Biome;
  heading: number;
  /** 前方弯道曲率，驱动路面弯曲 */
  curve: number;
  car?: LatLng;
}

interface Headings {
  start: number;
  end: number;
}

/** 每段的起止行驶方向；没有路段的段沿用上一段的结束方向 */
export function segmentHeadings(segs: Segment[]): Headings[] {
  const out: Headings[] = [];
  let carry = -Math.PI / 2;
  for (const s of segs) {
    if (s.leg) {
      const start = headingAt(s.leg, 0, 0.06);
      carry = headingAt(s.leg, 1 - 0.06, 0.06);
      out.push({ start, end: carry });
    } else {
      out.push({ start: carry, end: carry });
    }
  }
  return out;
}

function lastCar(segs: Segment[], index: number): LatLng | undefined {
  for (let i = index; i >= 0; i--) {
    const leg = segs[i].leg;
    if (leg) {
      return leg.points.at(-1);
    }
  }
  return undefined;
}

export function driveState(pos: number, segs: Segment[], headings: Headings[]): DriveState {
  const index = Math.min(segs.length - 1, Math.max(0, Math.floor(pos)));
  const seg = segs[index];
  const t = Math.min(1, Math.max(0, pos - index));
  const leg = seg.leg;
  const frac = leg ? driveFrac(t) : 1;
  const arrived = !leg || t >= ARRIVE;

  // 段尾空档期把方向平滑过渡到下一段的起始方向，避免远山突然跳动
  const next = headings[index + 1] ?? headings[index];
  const idle = leg ? smoothstep(ARRIVE, 1, t) : smoothstep(0, 1, t);
  const base = (leg && t < ARRIVE) ? headingAt(leg, frac) : headings[index].end;
  const heading = base + angleDiff(next.start, base) * idle;

  let curve = 0;
  if (leg && t < ARRIVE) {
    const turn = angleDiff(headingAt(leg, Math.min(1, frac + 0.1), 0.05), headingAt(leg, frac, 0.05));
    curve = Math.max(-0.0028, Math.min(0.0028, turn * 0.0032)) * (1 - smoothstep(0.6, ARRIVE, t));
  }

  return {
    seg,
    t,
    frac,
    arrived,
    km: seg.kmBefore + seg.km * frac,
    remainKm: seg.km * (1 - frac),
    remainMin: Math.round(seg.minutes * (1 - frac)),
    clock: seg.clock[0] + (seg.clock[1] - seg.clock[0]) * t,
    biome: seg.biome,
    heading,
    curve,
    car: leg ? positionAt(leg, frac) : lastCar(segs, index),
  };
}
