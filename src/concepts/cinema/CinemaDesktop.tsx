import type { CSSProperties } from 'react';
import type { DaySummary, TripSummary } from '../shared/trip';
import type { Page } from './pages';
import { BedDouble, Car, ChevronLeft, ChevronRight, Gauge, Pause, Play, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useImageAccent, useReducedMotion } from '../shared/hooks';
import { crop, formatMinutes, INTENSITY_LABEL } from '../shared/trip';
import { kenBurns } from './CinemaCover';
import { CinemaTimeline } from './CinemaTimeline';
import { FlapBoard } from './FlapBoard';
import { pageCover, pageTitle } from './pages';
import { RouteGlyph } from './RouteGlyph';
import { TodoGrid } from './StoryParts';

const photosOf = (page: Page) => (page.kind === 'day' ? page.summary.photos : page.cover ? [page.cover] : []);
const keyOf = (page: Page) => (page.kind === 'day' ? `day-${page.summary.no}` : 'todo');

function dayTag(summary: DaySummary) {
  return (summary.flights.length > 0 && summary.driveKm < 50) ? '飞行日' : INTENSITY_LABEL[summary.intensity];
}

/** PC 版：左侧片单、中间主舞台、右侧当日行程、底部整趟时间轴 */
export function CinemaDesktop({ trip, pages }: { trip: TripSummary; pages: Page[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [shot, setShot] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  /** 最长的一天，用来给底部时间轴的条形归一化，让各天横向可比 */
  const heaviest = useMemo(() => Math.max(1, ...trip.days.map(d => d.driveKm)), [trip.days]);

  const page = pages[index];
  const summary = page.kind === 'day' ? page.summary : null;
  const photos = photosOf(page);
  const accent = useImageAccent(photos[0] && crop(photos[0].src, '120x120'), page.kind === 'todo' ? '#ffd36e' : '#8fc8ff');
  const flight = (summary && !photos.length) ? summary.flights[0] : undefined;

  const go = useCallback((delta: number) => {
    setIndex(i => Math.min(pages.length - 1, Math.max(0, i + delta)));
    setShot(0);
  }, [pages.length]);

  const jump = useCallback((i: number) => {
    setIndex(i);
    setShot(0);
  }, []);

  // 同一天有多张照片时轮流上屏
  useEffect(() => {
    setShot(0);
  }, [index]);

  useEffect(() => {
    if (photos.length < 2 || reduced) {
      return;
    }
    const timer = window.setInterval(() => setShot(s => (s + 1) % photos.length), 5200);
    return () => window.clearInterval(timer);
  }, [index, photos.length, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        go(1);
      } else if (e.key === 'ArrowLeft') {
        go(-1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // 放映：每 6 秒推进一天，走到头停下
  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (index >= pages.length - 1) {
        setPlaying(false);
        return;
      }
      go(1);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [playing, index, pages.length, go]);

  useEffect(() => {
    timelineRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [index]);

  const dayStats = useMemo(() => {
    if (!summary) {
      return null;
    }
    return (
      <ul className="cd-chips">
        {summary.driveKm > 0 && (
          <li>
            <Car aria-hidden />
            {`${summary.driveKm.toFixed(1)} km · ${formatMinutes(summary.driveMin)}`}
          </li>
        )}
        <li data-tone={summary.intensity}>
          <Gauge aria-hidden />
          {dayTag(summary)}
        </li>
      </ul>
    );
  }, [summary]);

  return (
    <div
      className="cd-root"
      style={{ '--accent': accent } as CSSProperties}
    >
      <header className="cd-top">
        <div className="cd-brand">
          <span className="cd-badge">ROAD TRIP · {trip.days.length} DAYS</span>
          <div>
            <h1>
              <small>{trip.itinerary.name.slice(0, 4)}</small>
              {trip.itinerary.name.slice(4)}
            </h1>
            <p>{`自驾环线 · ${trip.dateRange} · ${trip.itinerary.coEditors.length} 位旅伴一起编辑`}</p>
          </div>
        </div>

        <dl className="cd-stats">
          <div>
            <dt>公里自驾</dt>
            <dd>{Math.round(trip.totalKm).toLocaleString()}</dd>
          </div>
          <div>
            <dt>小时车程</dt>
            <dd>{(trip.totalMin / 60).toFixed(1)}</dd>
          </div>
          <div>
            <dt>处风景</dt>
            <dd>{trip.placeCount}</dd>
          </div>
          <div>
            <dt>晚住宿</dt>
            <dd>{trip.nights}</dd>
          </div>
        </dl>

        <div className="cd-top__right">
          <span className="cd-avatars">
            {trip.itinerary.coEditors.slice(0, 5).map(e => (
              <img
                key={e.avatar}
                src={e.avatar}
                alt={e.nickName}
                referrerPolicy="no-referrer"
              />
            ))}
          </span>
          <button
            type="button"
            className="cd-play"
            aria-pressed={playing}
            disabled={reduced}
            onClick={() => setPlaying(p => !p)}
          >
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
            {playing ? '暂停放映' : '放映全程'}
          </button>
          <button
            type="button"
            className="cd-cta"
            onClick={() => toast('演示页面，暂不支持保存编辑')}
          >
            保存并编辑线路
          </button>
        </div>
      </header>

      <main className="cd-main">
        <aside className="cd-rail">
          <p className="cd-rail__label">逐日放映</p>
          <ol className="cd-days">
            {pages.map((p, i) => {
              const cover = pageCover(p);
              const s = p.kind === 'day' ? p.summary : null;
              return (
                <li key={keyOf(p)}>
                  <button
                    type="button"
                    aria-current={i === index ? 'true' : undefined}
                    onClick={() => jump(i)}
                  >
                    {cover
                      ? (
                          <img
                            src={cover.thumb}
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        )
                      : (
                          <span className="cd-days__blank">
                            <Sparkles aria-hidden />
                          </span>
                        )}
                    <span className="cd-days__no">{s ? `D${s.no}` : '✦'}</span>
                    <span className="cd-days__text">
                      <b>{pageTitle(p)}</b>
                      <small>
                        {s
                          ? `${s.day.label} ${s.day.weekday} · ${s.driveKm >= 50 ? `${Math.round(s.driveKm)} km` : s.flights.length ? '飞行日' : '慢游日'}`
                          : `${trip.itinerary.toBePlanned.length} 个灵感待排`}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="cd-hint">← → 切换 · 空格 放映</p>
        </aside>

        <section className="cd-stage">
          <div className="cd-stage__media">
            {photos.map((p, i) => (
              <img
                key={p.src}
                className="cd-shot"
                data-active={i === shot}
                src={p.src}
                alt=""
                referrerPolicy="no-referrer"
                style={kenBurns(i)}
              />
            ))}
            {flight && (
              <FlapBoard
                key={index}
                flight={flight}
                days={trip.days.length}
              />
            )}
            {!photos.length && !flight && <span className="cd-stage__void" />}
            <div className="cn-shade cn-shade--story" />
            <div className="cn-grain" />

            <div className="cd-progress">
              <ol>
                {pages.map((p, i) => (
                  <li
                    key={keyOf(p)}
                    data-state={i < index ? 'done' : i === index ? 'active' : 'todo'}
                  >
                    <span />
                  </li>
                ))}
              </ol>
              <span className="cd-counter">
                {summary ? `DAY ${String(summary.no).padStart(2, '0')} / ${String(trip.days.length).padStart(2, '0')}` : 'WISHLIST'}
              </span>
            </div>

            <RouteGlyph
              trip={trip}
              highlight={summary ? index : undefined}
              hero
              className="cd-stage__glyph"
            />

            <div className="cd-title-block">
              <span className="cd-day-no">{summary ? String(summary.no).padStart(2, '0') : `+${trip.itinerary.toBePlanned.length}`}</span>
              <div>
                <p className="cd-day-date">{summary ? `${summary.day.label} · ${summary.day.weekday}` : '还没排进日程的灵感'}</p>
                <h2>{summary ? summary.route : '待安排'}</h2>
                {dayStats}
                {summary?.hotel && (
                  <p className="cd-hotel">
                    <BedDouble aria-hidden />
                    {`今晚住 ${summary.hotel.name}`}
                  </p>
                )}
              </div>
            </div>

            <div className="cd-stage__nav">
              <button
                type="button"
                aria-label="上一天"
                disabled={index === 0}
                onClick={() => go(-1)}
              >
                <ChevronLeft aria-hidden />
              </button>
              <span>{`${index + 1} / ${pages.length}`}</span>
              <button
                type="button"
                aria-label="下一天"
                disabled={index === pages.length - 1}
                onClick={() => go(1)}
              >
                <ChevronRight aria-hidden />
              </button>
            </div>

            {photos.length > 1 && (
              <div className="cd-shots">
                {photos.map((p, i) => (
                  <button
                    key={p.src}
                    type="button"
                    aria-label={p.name}
                    aria-current={i === shot ? 'true' : undefined}
                    onClick={() => setShot(i)}
                  >
                    <img
                      src={p.thumb}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="cd-panel">
          <header className="cd-panel__head">
            <p>当日行程</p>
            <span>
              {summary
                ? `${summary.day.items.length} 站${summary.driveKm >= 1 ? ` · ${formatMinutes(summary.driveMin)} 车程` : ''}`
                : `${trip.itinerary.toBePlanned.length} 个待排灵感`}
            </span>
          </header>
          <div
            key={keyOf(page)}
            className="cd-panel__body"
          >
            {page.kind === 'day' ? <CinemaTimeline summary={page.summary} /> : <TodoGrid units={page.units} />}
          </div>
        </section>
      </main>

      <footer
        ref={timelineRef}
        className="cd-timeline"
        aria-label="整趟行程时间轴"
      >
        <ol>
          {pages.map((p, i) => {
            const s = p.kind === 'day' ? p.summary : null;
            return (
              <li key={keyOf(p)}>
                <button
                  type="button"
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => jump(i)}
                >
                  <span className="cd-timeline__bar">
                    <i style={{ width: `${s ? (s.driveKm / heaviest) * 100 : 0}%` }} />
                  </span>
                  <b>{s ? `DAY ${String(s.no).padStart(2, '0')}` : 'IDEAS'}</b>
                  <small>{s ? `${s.route} · ${s.driveKm >= 1 ? `${Math.round(s.driveKm)} km` : '不驾车'}` : '灵感收集'}</small>
                </button>
              </li>
            );
          })}
        </ol>
      </footer>
    </div>
  );
}
