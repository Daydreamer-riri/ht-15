import type { ReactNode } from 'react';
import type { TripSummary } from '../shared/trip';
import type { DriveState } from './drive';
import { formatMinutes, INTENSITY_LABEL } from '../shared/trip';

interface PanelContent {
  kicker: string;
  title: string;
  lines: ReactNode[];
  tone?: 'warn' | 'calm' | 'hotel';
}

const dayName = (s: DriveState) => `DAY ${String(s.seg.day.no).padStart(2, '0')} · ${s.seg.day.day.label} ${s.seg.day.day.weekday}`;

function content(trip: TripSummary, s: DriveState): PanelContent {
  const { seg } = s;
  const u = seg.unit;
  if (seg.kind === 'finish') {
    return {
      kicker: '旅程完成 · TRIP COMPLETE',
      title: `${Math.round(trip.totalKm).toLocaleString()} km 北疆环线`,
      lines: [`驾驶 ${formatMinutes(trip.totalMin)} · ${trip.nights} 晚 · ${trip.placeCount} 处风景`, `${trip.itinerary.coEditors.length} 位旅伴一起编辑了这条线路`],
      tone: 'calm',
    };
  }
  if (seg.kind === 'gantry') {
    const d = seg.day;
    const tone = d.intensity === 'hard' ? 'warn' : d.intensity === 'rest' ? 'calm' : undefined;
    return {
      kicker: dayName(s),
      title: d.route,
      lines: [
        d.driveKm >= 1 ? `今日驾驶 ${d.driveKm.toFixed(1)} km · ${formatMinutes(d.driveMin)}` : '今日无需驾车',
        `${d.places.length} 处风景${d.hotel ? ` · 夜宿${d.hotel.city}` : ''} · ${(d.flights.length > 0 && d.driveKm < 50) ? '飞行日' : INTENSITY_LABEL[d.intensity]}`,
      ],
      tone,
    };
  }
  if (!s.arrived) {
    const name = u?.kind === 'transport' ? u.from.name : seg.title;
    return {
      kicker: `${dayName(s)} · 行驶中`,
      title: `前往 ${name}`,
      lines: [`剩余 ${s.remainKm.toFixed(1)} km · 约 ${formatMinutes(Math.max(1, s.remainMin))}`, `本段 ${seg.km} km${seg.km >= 400 ? ' · 长途，记得轮换驾驶' : ''}`],
      tone: seg.km >= 400 ? 'warn' : undefined,
    };
  }
  switch (u?.kind) {
    case 'transport':
      return {
        kicker: seg.leg ? `${dayName(s)} · 返程` : `${dayName(s)} · 落地`,
        title: `${u.number ?? ''} ${u.from.city} → ${u.to.city}`,
        lines: [`${u.departTime ?? '--:--'} 起飞 · ${u.arriveTime ?? '--:--'} 到达 · 飞行 ${u.duration ?? ''}`, `${u.from.name}${u.from.terminal ? ` ${u.from.terminal}` : ''} → ${u.to.name}`],
      };
    case 'poi':
      return {
        kicker: `${dayName(s)} · 已到达`,
        title: u.name,
        lines: [
          [u.playTime, u.price || undefined, u.openStatus].filter(Boolean).join(' · '),
          ...(u.remark
            ? [
                <span
                  key="remark"
                  className="rd-nav__remark"
                >
                  {u.remark}
                </span>,
              ]
            : []),
        ],
      };
    case 'hotel':
      return {
        kicker: `${dayName(s)} · 今晚入住`,
        title: u.name,
        lines: [`${'◆'.repeat(u.star)} ${u.score.toFixed(1)}分 · ${u.reviewCount.toLocaleString()}条点评`, ...(u.rank ? [u.rank] : [])],
        tone: 'hotel',
      };
    case 'custom':
      return { kicker: `${dayName(s)} · 已到达`, title: u.name, lines: ['自定义地点'] };
    default:
      return { kicker: `${dayName(s)} · 返回住处`, title: seg.title, lines: [`今天的风景收工，回去休息`], tone: 'hotel' };
  }
}

export function NavPanel({ trip, state }: { trip: TripSummary; state: DriveState }) {
  const c = content(trip, state);
  const key = `${state.seg.index}-${state.arrived}`;
  return (
    <section
      className="rd-nav"
      data-tone={c.tone}
      aria-live="polite"
    >
      <div
        key={key}
        className="rd-nav__body"
      >
        <p className="rd-nav__kicker">{c.kicker}</p>
        <h2 className="rd-nav__title">{c.title}</h2>
        {c.lines.map((l, i) => (
          <p
            key={i}
            className="rd-nav__line"
          >
            {l}
          </p>
        ))}
      </div>
      {!state.arrived && state.seg.leg && (
        <span
          className="rd-nav__bar"
          style={{ transform: `scaleX(${state.frac})` }}
        />
      )}
    </section>
  );
}
