import type { BoardKind, BoardText } from './SignBoard';
import type { Segment } from './timeline';
import { formatMinutes, shortDate } from '../shared/trip';
import { splitName } from './SignBoard';
import { ARRIVE } from './timeline';

export interface SignSpec {
  key: string;
  kind: BoardKind;
  text: BoardText;
  /** 车行到这个位置（段序号 + 段内进度）时路牌最近 */
  at: number;
  /** 世界坐标：横向位置、牌底高度、最近时的距离 */
  x: number;
  bottom: number;
  near: number;
  width: number;
}

const ROADSIDE = { x: 2.55, bottom: 2.1, near: 6.6, width: 4.6 };

export function signsOf(seg: Segment): SignSpec[] {
  const at = seg.index + ARRIVE;
  const key = String(seg.index);
  const { day } = seg;
  switch (seg.kind) {
    case 'gantry': {
      const flight = day.flights[0];
      const sub = day.driveKm >= 50
        ? `${Math.round(day.driveKm)} km · ${formatMinutes(day.driveMin)}`
        : flight ? `飞行日 · ${flight.number ?? ''}` : '慢游日 · 不赶路';
      return [{
        key,
        kind: 'gantry',
        text: { kicker: `DAY ${String(day.no).padStart(2, '0')} · ${shortDate(day.day.label)} ${day.day.weekday}`, title: day.route, sub },
        at: seg.index + 0.6,
        x: 0,
        bottom: 4.7,
        near: 9.6,
        width: 9,
      }];
    }
    case 'finish':
      return [];
    case 'flight': {
      const u = seg.unit?.kind === 'transport' ? seg.unit : undefined;
      const depart = Boolean(seg.leg);
      const end = depart ? u?.from : u?.to;
      const [city, airport] = (end?.name ?? '').split(' ');
      return [{
        key,
        kind: 'flight',
        text: {
          kicker: depart ? `${u?.number ?? ''} · ${u?.departTime ?? ''} 起飞` : `${u?.number ?? ''} · ${u?.arriveTime ?? ''} 落地`,
          title: airport ?? city,
          sub: [city, end?.terminal].filter(Boolean).join(' '),
        },
        at,
        ...ROADSIDE,
      }];
    }
    default: {
      const signs: SignSpec[] = [];
      const u = seg.unit;
      if (seg.km >= 400) {
        signs.push({
          key: `${key}-warn`,
          kind: 'warning',
          text: { title: '长途驾驶', sub: `${Math.round(seg.km)} km` },
          at: seg.index + 0.36,
          x: -2.9,
          bottom: 1.5,
          near: 7.4,
          width: 2.6,
        });
      }
      const [main, extra] = splitName(seg.title);
      if (seg.kind === 'hotel' && u?.kind === 'hotel') {
        signs.push({ key, kind: 'hotel', text: { kicker: '今晚入住', title: main, sub: `${'◆'.repeat(u.star)} ${u.score.toFixed(1)}分` }, at, ...ROADSIDE });
      } else if (seg.kind === 'return') {
        signs.push({ key, kind: 'return', text: { kicker: '返回住处', title: main, sub: extra }, at, ...ROADSIDE });
      } else {
        const sub = extra ?? (u?.kind === 'poi' ? u.playTime : '自定义地点');
        signs.push({ key, kind: 'poi', text: { title: main, sub }, at, ...ROADSIDE });
      }
      return signs;
    }
  }
}
