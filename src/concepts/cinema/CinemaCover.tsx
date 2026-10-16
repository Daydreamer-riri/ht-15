import type { CSSProperties } from 'react';
import type { TripSummary } from '../shared/trip';
import type { Page } from './pages';
import { Plane, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCountUp } from '../shared/hooks';
import { pageCover, pageTitle } from './pages';
import { RouteGlyph } from './RouteGlyph';

/** 照片缓推方向，按下标轮换 */
export const KEN_BURNS = [[-3, -2], [3, -1], [-2, 2], [2, 2.5]];

export const kenBurns = (i: number) => {
  const [x, y] = KEN_BURNS[i % KEN_BURNS.length];
  return { '--kx': `${x}%`, '--ky': `${y}%` } as CSSProperties;
};

interface CoverProps {
  trip: TripSummary;
  pages: Page[];
  hidden: boolean;
  onOpen: (index: number, rect: DOMRect) => void;
  registerCard: (index: number, el: HTMLButtonElement | null) => void;
}

/** "七天六晚北疆" -> ["七天六晚", "北疆"] */
function splitTitle(name: string): [string, string] {
  const m = /^(.*[天晚])(.{1,4})$/.exec(name);
  return m ? [m[1], m[2]] : ['', name];
}

export function CinemaCover({ trip, pages, hidden, onOpen, registerCard }: CoverProps) {
  const heroes = trip.days.flatMap(d => d.photos.slice(0, 1));
  const [shot, setShot] = useState(0);
  const km = useCountUp(trip.totalKm, 1600, 900);
  const hours = useCountUp(trip.totalMin / 60, 1600, 1000);
  const places = useCountUp(trip.placeCount, 1200, 1100);
  const friends = useCountUp(trip.itinerary.coEditors.length, 1000, 1200);
  const [lead, title] = splitTitle(trip.itinerary.name);
  const editors = trip.itinerary.coEditors;

  useEffect(() => {
    if (hidden || heroes.length < 2) {
      return;
    }
    const timer = window.setInterval(() => setShot(s => (s + 1) % heroes.length), 5200);
    return () => window.clearInterval(timer);
  }, [hidden, heroes.length]);

  return (
    <section
      className="cn-cover"
      data-hidden={hidden}
      aria-hidden={hidden}
    >
      <div
        className="cn-stage"
        aria-hidden
      >
        {heroes.map((p, i) => (
          <img
            key={p.src}
            className="cn-shot"
            data-active={i === shot}
            src={p.src}
            alt=""
            referrerPolicy="no-referrer"
            style={kenBurns(i)}
          />
        ))}
        <div className="cn-shade cn-shade--cover" />
      </div>

      <div className="cn-cover__body">
        <header className="cn-top">
          <span className="cn-badge">{`ROAD TRIP · ${trip.days.length} DAYS`}</span>
          <span
            className="cn-avatars"
            aria-label={`${editors.length}位共同编辑者`}
          >
            {editors.slice(0, 4).map(e => (
              <img
                key={e.avatar}
                src={e.avatar}
                alt={e.nickName}
                referrerPolicy="no-referrer"
              />
            ))}
            {editors.length > 4 && <b>{`+${editors.length - 4}`}</b>}
          </span>
        </header>

        <div className="cn-cover__glyph">
          <RouteGlyph
            trip={trip}
            hero
          />
        </div>

        <p className="cn-kicker">{`自驾环线 · ${trip.dateRange}`}</p>
        <h1
          className="cn-title"
          aria-label={trip.itinerary.name}
        >
          {lead && <small>{lead}</small>}
          <strong style={{ '--title-size': `${Math.min(104, 330 / [...title].length)}px` } as CSSProperties}>
            {[...title].map((ch, i) => (
              <span
                key={i}
                className="cn-char"
                style={{ animationDelay: `${0.35 + i * 0.12}s` }}
              >
                {ch}
              </span>
            ))}
          </strong>
        </h1>

        <dl className="cn-stats">
          <div>
            <dt>公里自驾</dt>
            <dd>{Math.round(km).toLocaleString()}</dd>
          </div>
          <div>
            <dt>小时车程</dt>
            <dd>{hours.toFixed(1)}</dd>
          </div>
          <div>
            <dt>处风景</dt>
            <dd>{Math.round(places)}</dd>
          </div>
          <div>
            <dt>位旅伴</dt>
            <dd>{Math.round(friends)}</dd>
          </div>
        </dl>

        <p className="cn-strip-label">
          <span>逐日放映</span>
          <span>点开任意一天 →</span>
        </p>
        <ol className="cn-strip">
          {pages.map((page, i) => {
            const cover = pageCover(page);
            const summary = page.kind === 'day' ? page.summary : null;
            return (
              <li key={summary ? summary.no : 'todo'}>
                <button
                  ref={el => registerCard(i, el)}
                  type="button"
                  className="cn-card"
                  style={{ animationDelay: `${1.1 + i * 0.07}s` }}
                  onClick={e => onOpen(i, e.currentTarget.getBoundingClientRect())}
                  aria-label={summary ? `第${summary.no}天 ${summary.route}` : `待安排 ${trip.itinerary.toBePlanned.length} 项`}
                >
                  {cover
                    ? (
                        <img
                          src={cover.thumb}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      )
                    : (
                        <span className="cn-card__blank">
                          <Plane aria-hidden />
                        </span>
                      )}
                  <span className="cn-card__no">
                    {summary ? `D${summary.no}` : <Sparkles aria-hidden />}
                  </span>
                  <span className="cn-card__meta">
                    <b>{pageTitle(page)}</b>
                    {summary
                      ? (summary.driveKm >= 50 ? `${Math.round(summary.driveKm)} km` : summary.flights.length ? '飞行日' : '慢游日')
                      : `${trip.itinerary.toBePlanned.length} 个灵感`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          className="cn-cta"
          onClick={() => toast('演示页面，暂不支持保存编辑')}
        >
          保存并编辑线路
        </button>
      </div>
    </section>
  );
}
