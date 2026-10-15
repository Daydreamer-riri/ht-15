import type { Frame } from './frames';
import type { Itinerary } from '@/data/types';
import { Pause, Plane, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useReducedMotion } from '../shared/hooks';
import { summarize } from '../shared/trip';
import { buildFrames } from './frames';
import './film.css';

function FrameBody({ f }: { f: Frame }) {
  if (f.kind === 'leader') {
    return (
      <div className="fl-frame__leader">
        <span
          className="fl-leader__ring"
          aria-hidden
        />
        <p className="fl-leader__kicker">KODAK · 2026</p>
        <h2>{f.title}</h2>
        {f.lines.map(l => <p key={l}>{l}</p>)}
      </div>
    );
  }
  if (f.kind === 'day') {
    return (
      <div className="fl-frame__card">
        <p className="fl-yard__no">{`DAY ${String(f.day).padStart(2, '0')}`}</p>
        <h2>{f.title}</h2>
        {f.lines.map(l => <p key={l}>{l}</p>)}
      </div>
    );
  }
  if (f.kind === 'flight') {
    return (
      <div className="fl-frame__flight">
        <Plane aria-hidden />
        <h2>{f.title}</h2>
        {f.lines.map(l => <p key={l}>{l}</p>)}
        <span className="fl-frame__stamp">BOARDING</span>
      </div>
    );
  }
  return (
    <img
      src={f.image}
      alt=""
      referrerPolicy="no-referrer"
    />
  );
}

/** 方案：胶卷。全程装进一卷 35mm，横向过片，看片头倒计时、漏光和冲印信息 */
export function Film({ itinerary }: { itinerary: Itinerary }) {
  const trip = useMemo(() => summarize(itinerary), [itinerary]);
  const frames = useMemo(() => buildFrames(trip), [trip]);
  const stripRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLElement | null)[]>([]);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [leaderDone, setLeaderDone] = useState(reduced);

  const onScroll = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    let best = 0;
    let bestGap = Infinity;
    frameRefs.current.forEach((el, i) => {
      if (!el) {
        return;
      }
      const center = el.offsetLeft + el.offsetWidth / 2;
      const gap = Math.abs(center - mid);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    });
    if (best !== active) {
      setActive(best);
    }
  }, [active]);

  const scrollToFrame = useCallback((i: number) => {
    const el = frameRefs.current[Math.min(frames.length - 1, Math.max(0, i))];
    const strip = stripRef.current;
    if (!el || !strip) {
      return;
    }
    strip.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - strip.clientWidth / 2, behavior: 'smooth' });
  }, [frames.length]);

  // 放映：依次过片，像放幻灯片
  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (active >= frames.length - 1) {
        setPlaying(false);
        return;
      }
      scrollToFrame(active + 1);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [playing, active, frames.length, scrollToFrame]);

  useEffect(() => {
    if (leaderDone) {
      return;
    }
    const timer = window.setTimeout(() => setLeaderDone(true), 2600);
    return () => window.clearTimeout(timer);
  }, [leaderDone]);

  const f = frames[active];
  const dayStart = (no: number) => frames.findIndex(x => x.kind === 'day' && x.day === no);

  return (
    <div className="fl-root">
      <header className="fl-head">
        <p className="fl-kicker">
          <span>35mm</span>
          疆北行车胶片
        </p>
        <h1>{trip.itinerary.name}</h1>
        <p className="fl-head__meta">{`${trip.dateRange} · ${Math.round(trip.totalKm).toLocaleString()} km · ${frames.length} 格`}</p>
      </header>

      <div className="fl-stage">
        <div className="fl-band">
          <div
            ref={stripRef}
            className="fl-strip"
            onScroll={onScroll}
            aria-label="胶卷：左右滑动看过片"
          >
            {frames.map((frame, i) => (
              <figure
                key={frame.id}
                ref={el => {
                  frameRefs.current[i] = el;
                }}
                className="fl-frame"
                data-kind={frame.kind}
                data-active={i === active}
                data-day={frame.day}
              >
                <span
                  className="fl-perf fl-perf--top"
                  aria-hidden
                />
                <div className="fl-frame__window">
                  <FrameBody f={frame} />
                </div>
                <span
                  className="fl-perf fl-perf--bottom"
                  aria-hidden
                />
                <figcaption className="fl-frame__no">{frame.code}</figcaption>
              </figure>
            ))}
          </div>
          <span
            className="fl-leak"
            aria-hidden
          />
          <span
            className="fl-scratch"
            aria-hidden
          />
        </div>

        <div className="fl-caption">
          <p className="fl-caption__code">{`${f.code} · ${f.kind === 'flight' ? '航段' : f.kind === 'day' ? '日期卡' : f.kind === 'photo' ? `第 ${f.day} 天` : '片头'}`}</p>
          <h2>{f.title}</h2>
          <p className="fl-caption__lines">{f.lines.join('　')}</p>
        </div>
      </div>

      <div className="fl-bar">
        <ol
          className="fl-days"
          aria-label="跳到某一天"
        >
          {trip.days.map(d => (
            <li key={d.no}>
              <button
                type="button"
                aria-current={d.no === f.day ? 'step' : undefined}
                onClick={() => scrollToFrame(Math.max(0, dayStart(d.no)))}
              >
                {d.no}
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="fl-play"
          aria-pressed={playing}
          disabled={reduced}
          onClick={() => setPlaying(p => !p)}
        >
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
          {playing ? '停' : '放映'}
        </button>
      </div>

      <button
        type="button"
        className="fl-cta"
        onClick={() => toast('演示页面，暂不支持保存编辑')}
      >
        保存并编辑线路
      </button>

      {!leaderDone && (
        <div
          className="fl-leader"
          onClick={() => setLeaderDone(true)}
        >
          <span
            className="fl-leader__sweep"
            aria-hidden
          />
          <p
            className="fl-leader__count"
            aria-hidden
          >
            <span>3</span>
            <span>2</span>
            <span>1</span>
          </p>
          <p className="fl-leader__text">{trip.itinerary.name}</p>
        </div>
      )}
    </div>
  );
}
