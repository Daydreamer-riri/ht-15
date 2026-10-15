import type { Biome, TripSummary } from '../shared/trip';
import type { HotelUnit, PoiUnit, Unit } from '@/data/types';
import { biomeOf, parseKm } from '../shared/trip';

export type StopKind = 'place' | 'hotel' | 'flight' | 'custom';

export interface Stop {
  /** 到达本站时的累计里程 */
  km: number;
  day: number;
  route: string;
  biome: Biome;
  name: string;
  kind: StopKind;
  meta: string;
  image?: string;
  remark?: string;
}

export interface DaySpan {
  no: number;
  route: string;
  biome: Biome;
  start: number;
  end: number;
  /** 当天从早到晚的时间进度区间（0 黎明 → 1 深夜） */
  clock: [number, number];
}

export interface TripModel {
  stops: Stop[];
  days: DaySpan[];
  totalKm: number;
  name: string;
}

/** 落地日在中午出发、返程日在中午结束，其余每天从清晨开到夜里 */
function clockRange(first: Unit | undefined, last: Unit | undefined): [number, number] {
  const start = (first?.kind === 'transport' && !first.leg) ? 0.28 : 0.12;
  const end = last?.kind === 'transport' ? 0.5 : 0.95;
  return [start, end];
}

/** 当天沿途地貌：先看景点，再看当天经过的城市，最后看住宿地 */
function dayBiome(items: Unit[], cities: string[], fallback: Biome): Biome {
  const candidates: string[] = [
    ...items.filter(u => u.kind === 'poi' || u.kind === 'custom').map(u => u.name),
    ...cities,
    ...items.filter(u => u.kind === 'hotel').map(u => u.name),
  ];
  for (const name of candidates) {
    const b = biomeOf(name);
    if (b) {
      return b;
    }
  }
  return fallback;
}

function stopOf(u: Unit, km: number, day: DaySpan): Stop {
  const common = { km, day: day.no, route: day.route, biome: day.biome, remark: u.remark };
  if (u.kind === 'hotel') {
    const h = u as HotelUnit;
    return { ...common, kind: 'hotel', name: h.name, meta: `${'◆'.repeat(h.star)} ${h.score.toFixed(1)}分`, image: h.image };
  }
  if (u.kind === 'transport') {
    return { ...common, kind: 'flight', name: `${u.from.city} → ${u.to.city}`, meta: [u.number, u.departTime].filter(Boolean).join(' ') };
  }
  if (u.kind === 'poi') {
    const p = u as PoiUnit;
    return { ...common, kind: 'place', name: p.name, meta: [p.playTime, p.price].filter(Boolean).join(' · '), image: p.image };
  }
  return { ...common, kind: 'custom', name: u.name, meta: '自定义地点' };
}

export function buildModel(trip: TripSummary): TripModel {
  const stops: Stop[] = [];
  const days: DaySpan[] = [];
  let km = 0;
  let biome: Biome = 'desert';
  for (const d of trip.days) {
    const items = d.day.items;
    const span: DaySpan = {
      no: d.no,
      route: d.route,
      biome: dayBiome(items, d.day.cities.map(c => c.name), biome),
      start: km,
      end: km + d.driveKm,
      clock: clockRange(items[0], items.at(-1)),
    };
    biome = span.biome;
    days.push(span);
    for (const u of items) {
      km += parseKm(u.leg?.distance);
      stops.push(stopOf(u, km, span));
    }
    km += parseKm(d.day.returnLeg?.distance);
    span.end = km;
  }
  return { stops, days, totalKm: km, name: trip.itinerary.name };
}

export interface DriveState {
  km: number;
  day: DaySpan;
  /** 刚经过的站点 */
  stop?: Stop;
  /** 距离下一站还有多少公里 */
  toNext: number;
  /** 停在站点门口 */
  atStop: boolean;
  /** 0 白天 → 1 夜里 */
  clock: number;
}

export function stateAt(model: TripModel, km: number): DriveState {
  const clamped = Math.min(model.totalKm, Math.max(0, km));
  const day = model.days.find(d => clamped <= d.end) ?? model.days.at(-1)!;
  const inDay = day.end - day.start || 1;
  const f = Math.min(1, Math.max(0, (clamped - day.start) / inDay));
  const next = model.stops.find(s => s.day === day.no && s.km > clamped);
  const stop = [...model.stops].reverse().find(s => s.km <= clamped);
  const toNext = next ? next.km - clamped : 0;
  return {
    km: clamped,
    day,
    stop,
    toNext,
    atStop: toNext < 2.5,
    clock: day.clock[0] + (day.clock[1] - day.clock[0]) * f,
  };
}
