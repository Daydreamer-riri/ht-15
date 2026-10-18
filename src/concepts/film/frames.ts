import type { TripSummary } from '../shared/trip';
import { unitShortName } from '@/components/route/utils';
import { crop, formatMinutes, photo, shortDate } from '../shared/trip';

export type FrameKind = 'leader' | 'day' | 'photo' | 'flight';

export interface Frame {
  id: string;
  kind: FrameKind;
  /** 片号，像胶卷边缘的编号 */
  code: string;
  day: number;
  title: string;
  lines: string[];
  image?: string;
  /** 冲印信息：拍摄时间/参数位，这里放里程和车程 */
  exif?: string;
}

const CODE = 'ABCDEFGH';

export function buildFrames(trip: TripSummary): Frame[] {
  const frames: Frame[] = [];
  let n = 0;
  const push = (f: Omit<Frame, 'code'>) => {
    n += 1;
    frames.push({ ...f, code: `${String(n).padStart(2, '0')}${CODE[n % CODE.length]}` });
  };
  push({
    id: 'leader',
    kind: 'leader',
    day: 0,
    title: trip.itinerary.name,
    lines: [`2026.${trip.dateRange}`, `${trip.days.length} 天 ${trip.nights} 晚 · ${Math.round(trip.totalKm).toLocaleString()} km`, formatMinutes(trip.totalMin)],
  });
  for (const d of trip.days) {
    push({
      id: `day-${d.no}`,
      kind: 'day',
      day: d.no,
      title: d.route,
      lines: [`${d.day.label} · ${d.day.weekday}`, d.driveKm >= 1 ? `${d.driveKm.toFixed(1)} km · ${formatMinutes(d.driveMin)}` : '今日不开车', d.hotel ? `夜宿 ${d.hotel.city}` : '当日晚归'],
    });
    for (const u of d.day.items) {
      if (u.kind === 'transport') {
        push({
          id: u.id,
          kind: 'flight',
          day: d.no,
          title: `${u.from.city} → ${u.to.city}`,
          lines: [u.number ?? '', `${u.departTime ?? '--:--'} – ${u.arriveTime ?? '--:--'} · ${u.duration ?? ''}`],
          exif: `${u.from.name} → ${u.to.name}`,
        });
        continue;
      }
      if ((u.kind === 'poi' || u.kind === 'hotel') && u.image) {
        push({
          id: u.id,
          kind: 'photo',
          day: d.no,
          title: unitShortName(u),
          lines: u.kind === 'poi' ? [u.playTime, u.price].filter(Boolean) : [`${'◆'.repeat(u.star)} ${u.score.toFixed(1)}分`, `${u.reviewCount.toLocaleString()}条点评`],
          image: photo(u.image, 640),
          exif: u.leg?.distance ?? undefined,
        });
      }
    }
  }
  return frames;
}

export const thumbOf = (image: string) => crop(image, '300x420');
export const dayOf = (trip: TripSummary, no: number) => trip.days.find(d => d.no === no);
export { shortDate };
