import type { TripSummary } from '../shared/trip';
import type { SketchMark } from './RouteSketch';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { unitShortName } from '@/components/route/utils';
import { formatMinutes, photo, shortDate } from '../shared/trip';
import { Tape } from './Paper';
import { RouteSketch } from './RouteSketch';

type PageRef = (el: HTMLElement | null) => void;

/** 目录页：全程手绘环线 + 每天一行，点击翻到当天 */
export function TocPage({ trip, pageRef, onJump }: { trip: TripSummary; pageRef: PageRef; onJump: (id: string) => void }) {
  const sketch = useMemo(() => {
    const stays = new Map<string, SketchMark & { days: number[] }>();
    for (const d of trip.days) {
      if (d.hotel) {
        const s = stays.get(d.hotel.name) ?? { position: d.hotel.position, badge: '', name: d.hotel.city, kind: 'stay' as const, days: [] };
        s.days.push(d.no);
        stays.set(d.hotel.name, s);
      }
    }
    const marks: SketchMark[] = [...stays.values()].map(s => ({ ...s, badge: s.days.length > 1 ? `${s.days[0]}-${s.days.at(-1)}` : String(s.days[0]) }));
    const air = trip.flights[0];
    if (air) {
      marks.unshift({ position: air.to.position, badge: '✈', kind: 'air' });
    }
    return { paths: trip.days.flatMap(d => d.legs.map(l => l.points)), marks };
  }, [trip]);

  return (
    <section
      ref={pageRef}
      id="jr-toc"
      className="jr-page jr-toc"
      data-page="toc"
      aria-label="目录"
    >
      <p className="jr-kicker">CONTENTS · 目录</p>
      <h2 className="jr-toc__title">{trip.itinerary.name}</h2>
      <figure className="jr-mapcard jr-mapcard--big">
        <Tape
          tone="pink"
          angle={-10}
          className="jr-mapcard__tape jr-mapcard__tape--l"
        />
        <Tape
          tone="mint"
          angle={8}
          className="jr-mapcard__tape jr-mapcard__tape--r"
        />
        <RouteSketch
          paths={sketch.paths}
          marks={sketch.marks}
          height={210}
          label="全程路线草图，数字是第几天住在那里"
        />
      </figure>
      <ul className="jr-toc__stats">
        <li>
          <b>{Math.round(trip.totalKm).toLocaleString()}</b>
          公里自驾
        </li>
        <li>
          <b>{formatMinutes(trip.totalMin)}</b>
          握方向盘
        </li>
        <li>
          <b>{trip.placeCount}</b>
          处风景
        </li>
        <li>
          <b>{trip.nights}</b>
          晚住宿
        </li>
      </ul>
      <ol className="jr-toc__list">
        {trip.days.map(d => (
          <li key={d.no}>
            <button
              type="button"
              onClick={() => onJump(`jr-day-${d.no}`)}
            >
              <span className="jr-toc__day">{`Day ${d.no}`}</span>
              <span className="jr-toc__route">{d.route}</span>
              <span className="jr-toc__dots" />
              <span className="jr-toc__km">{d.driveKm >= 50 ? `${Math.round(d.driveKm)}km` : shortDate(d.day.label)}</span>
            </button>
          </li>
        ))}
        {trip.itinerary.toBePlanned.length > 0 && (
          <li>
            <button
              type="button"
              onClick={() => onJump('jr-ideas')}
            >
              <span className="jr-toc__day">Ideas</span>
              <span className="jr-toc__route">灵感收集</span>
              <span className="jr-toc__dots" />
              <span className="jr-toc__km">{`${trip.itinerary.toBePlanned.length}个`}</span>
            </button>
          </li>
        )}
      </ol>
    </section>
  );
}

/** 待安排：剪下来的纸片，等着被贴进某一天 */
export function IdeasPage({ trip, pageRef }: { trip: TripSummary; pageRef: PageRef }) {
  const units = trip.itinerary.toBePlanned;
  return (
    <section
      ref={pageRef}
      id="jr-ideas"
      className="jr-page jr-ideas"
      data-page="ideas"
      aria-label="灵感收集"
    >
      <p className="jr-kicker">IDEAS · 还没排进日程</p>
      <h2 className="jr-toc__title">灵感收集</h2>
      <ul className="jr-scraps">
        {units.map((u, i) => (
          <li
            key={u.id}
            style={{ '--r': `${[-3, 2.5, -1.5, 3, -2.5, 1.5][i % 6]}deg` } as React.CSSProperties}
          >
            {((u.kind === 'poi' || u.kind === 'hotel') && u.image)
              ? (
                  <img
                    src={photo(u.image, 400)}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )
              : <span className="jr-scraps__ticket">{u.kind === 'transport' ? `${u.from.name} → ${u.to.name}` : unitShortName(u)}</span>}
            <b>{unitShortName(u)}</b>
            <small>{u.kind === 'poi' ? u.playTime : u.kind === 'hotel' ? `备选酒店 · ${u.score.toFixed(1)}分` : '交通'}</small>
            <button
              type="button"
              onClick={() => toast(`演示页面：把「${unitShortName(u)}」贴进某一天`)}
            >
              <Plus aria-hidden />
              贴进日程
            </button>
          </li>
        ))}
      </ul>
      <p className="jr-ideas__end">— THE END · 下一本见 —</p>
    </section>
  );
}
