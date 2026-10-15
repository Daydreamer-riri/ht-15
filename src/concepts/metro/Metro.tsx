import type { Station } from './diagram';
import type { Itinerary } from '@/data/types';
import { Car, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { fitProjector, toPath } from '../shared/geo';
import { useReducedMotion } from '../shared/hooks';
import { formatMinutes, photo, summarize } from '../shared/trip';
import { buildDiagram } from './diagram';
import { MetroDiagram } from './MetroDiagram';
import './metro.css';

const THUMB_W = 86;
const THUMB_H = 62;

/** 右上角的小图：真实走向，说明这张线路图不是随手画的 */
function RouteThumb({ trip }: { trip: ReturnType<typeof summarize> }) {
  const d = useMemo(() => {
    const project = fitProjector(trip.drivePoints, THUMB_W, THUMB_H, 8);
    return {
      path: toPath(trip.drivePoints, project, 0.8),
      start: project(trip.drivePoints[0]),
      end: project(trip.drivePoints.at(-1)!),
    };
  }, [trip]);
  return (
    <svg
      className="mt-thumb"
      viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
      aria-label="实际行驶走向"
      role="img"
    >
      <path d={d.path} />
      <circle
        cx={d.start[0]}
        cy={d.start[1]}
        r={2.6}
        className="mt-thumb__end"
      />
      <circle
        cx={d.end[0]}
        cy={d.end[1]}
        r={2.6}
        className="mt-thumb__end"
      />
    </svg>
  );
}

/** 方案：行程线路图。把七天画成一张地铁图，滚动看线路，点站点看详情 */
export function Metro({ itinerary }: { itinerary: Itinerary }) {
  const trip = useMemo(() => summarize(itinerary), [itinerary]);
  const model = useMemo(() => buildDiagram(trip), [trip]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(1);
  const [picked, setPicked] = useState<Station | null>(null);

  /** viewBox 里的 y → 页面上真正的滚动位置；SVG 按宽度等比缩放，必须按实测比例换算 */
  const metrics = useCallback(() => {
    const sc = scrollRef.current;
    const wrap = wrapRef.current;
    if (!sc || !wrap) {
      return null;
    }
    const box = wrap.getBoundingClientRect();
    const scale = box.height / model.height;
    return { scale, svgTop: box.top - sc.getBoundingClientRect().top, sc };
  }, [model.height]);

  const jump = (no: number) => {
    const row = model.rows.find(r => r.no === no);
    const m = metrics();
    if (!row || !m) {
      return;
    }
    m.sc.scrollTo({ top: m.svgTop + (row.y - 78) * m.scale, behavior: reduced ? 'auto' : 'smooth' });
  };

  const onScroll = () => {
    const m = metrics();
    if (!m) {
      return;
    }
    const probe = (m.sc.scrollTop - m.svgTop + m.sc.clientHeight * 0.32) / m.scale;
    const row = [...model.rows].reverse().find(r => r.y - 78 <= probe);
    if (row && row.no !== active) {
      setActive(row.no);
    }
  };

  return (
    <div className="mt-root">
      <header className="mt-head">
        <div className="mt-head__top">
          <p className="mt-kicker">
            <span className="mt-kicker__chip">线路图</span>
            ROUTE MAP
          </p>
          <RouteThumb trip={trip} />
        </div>
        <h1 className="mt-title">{trip.itinerary.name}</h1>
        <dl className="mt-facts">
          <div>
            <dt>总里程</dt>
            <dd>{`${Math.round(trip.totalKm).toLocaleString()} km`}</dd>
          </div>
          <div>
            <dt>总车程</dt>
            <dd>{formatMinutes(trip.totalMin)}</dd>
          </div>
          <div>
            <dt>宿</dt>
            <dd>{`${trip.nights} 晚`}</dd>
          </div>
          <div>
            <dt>站</dt>
            <dd>{`${trip.placeCount} 处风景`}</dd>
          </div>
        </dl>
        <ul className="mt-legend">
          {model.legend.map(l => (
            <li
              key={l.kind}
              data-kind={l.kind}
            >
              <span aria-hidden />
              {l.label}
            </li>
          ))}
        </ul>
      </header>

      <nav
        className="mt-days"
        aria-label="跳到某一段线路"
      >
        {model.rows.map(r => (
          <button
            key={r.no}
            type="button"
            style={{ '--c': r.color } as React.CSSProperties}
            aria-current={r.no === active ? 'true' : undefined}
            onClick={() => jump(r.no)}
          >
            {`L${r.no}`}
          </button>
        ))}
      </nav>

      <div
        ref={scrollRef}
        className="mt-scroll"
        onScroll={onScroll}
      >
        <p className="mt-days__hint">换个方向继续走 —— 线路在两端回折</p>
        <div ref={wrapRef}>
          <MetroDiagram
            model={model}
            active={active}
            onPick={setPicked}
            onSelectDay={jump}
          />
        </div>
        <p className="mt-end">{`${trip.dateRange} · 全程 ${Math.round(trip.totalKm).toLocaleString()} km`}</p>
      </div>

      <div className="mt-cta-wrap">
        <button
          type="button"
          className="mt-cta"
          onClick={() => toast('演示页面，暂不支持保存编辑')}
        >
          保存并编辑线路
        </button>
      </div>

      {picked && (
        <div
          className="mt-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={picked.name}
        >
          <button
            type="button"
            className="mt-sheet__scrim"
            aria-label="关闭"
            onClick={() => setPicked(null)}
          />
          <div className="mt-sheet__panel">
            <button
              type="button"
              className="mt-sheet__close"
              onClick={() => setPicked(null)}
            >
              <X aria-hidden />
            </button>
            {picked.photo && (
              <img
                src={photo(picked.photo, 640)}
                alt=""
                referrerPolicy="no-referrer"
              />
            )}
            <p className="mt-sheet__kicker">{`LINE ${active} · ${picked.kind === 'hotel' ? '住宿' : picked.kind === 'flight' ? '航班' : '站点'}`}</p>
            <h2>{picked.name}</h2>
            {picked.meta && <p className="mt-sheet__meta">{picked.meta}</p>}
            {picked.leg && (
              <p className="mt-sheet__leg">
                <Car aria-hidden />
                {`从上一站开过来 ${picked.leg}`}
              </p>
            )}
            {picked.remark && <p className="mt-sheet__remark">{picked.remark}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
