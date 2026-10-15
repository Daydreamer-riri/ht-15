import type { Itinerary } from '@/data/types';
import { Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { unitShortName } from '@/components/route/utils';
import { useReducedMotion } from '../shared/hooks';
import { summarize } from '../shared/trip';
import { driveState, segmentHeadings } from './drive';
import { MiniMap, Odometer } from './Instruments';
import { NavPanel } from './NavPanel';
import { smoothstep } from './palette';
import { Scene } from './Scene';
import { ARRIVE, buildSegments, SEG } from './timeline';
import './road.css';

/** 自动驾驶：每毫秒滚动的像素、每站停留时长 */
const AUTO_SPEED = 0.5;
const AUTO_HOLD = 1100;

/** 方案 B：滚动就是开车。挡风玻璃里路牌迎面而来，仪表盘显示真实里程和位置 */
export function Road({ itinerary }: { itinerary: Itinerary }) {
  const trip = useMemo(() => summarize(itinerary), [itinerary]);
  const segs = useMemo(() => buildSegments(trip), [trip]);
  const headings = useMemo(() => segmentHeadings(segs), [segs]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);

  const state = driveState(pos, segs, headings);
  const maxPos = segs.length - 1 + 0.999;

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      setPos(Math.min(maxPos, el.scrollTop / SEG));
    }
  }, [maxPos]);

  const jumpTo = (target: number) => {
    setPlaying(false);
    scrollRef.current?.scrollTo({ top: target * SEG, behavior: reduced ? 'auto' : 'smooth' });
  };

  // 自动驾驶：匀速滚动，经过每块路牌时停一下；用户一碰屏幕就交还控制
  useEffect(() => {
    const el = scrollRef.current;
    if (!playing || !el) {
      return;
    }
    const stops = segs.map(s => s.index + (s.kind === 'gantry' ? 0.6 : ARRIVE));
    let raf = 0;
    let last = performance.now();
    let hold = 0;
    let y = el.scrollTop;
    const step = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      if (hold > 0) {
        hold -= dt;
      } else {
        const before = y / SEG;
        y += dt * AUTO_SPEED;
        const after = y / SEG;
        if (stops.some(s => before < s && after >= s)) {
          hold = AUTO_HOLD;
        }
        el.scrollTop = y;
      }
      if (y >= el.scrollHeight - el.clientHeight - 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const stop = () => setPlaying(false);
    el.addEventListener('wheel', stop, { passive: true });
    el.addEventListener('touchstart', stop, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchstart', stop);
    };
  }, [playing, segs]);

  const dayStarts = segs.filter(s => s.kind === 'gantry');
  const intro = 1 - smoothstep(0.05, 0.45, pos);

  return (
    <div className="rd-root">
      <div
        ref={scrollRef}
        className="rd-scroll"
        onScroll={onScroll}
        tabIndex={0}
        aria-label="滚动驾驶行程，上下滑动前进或后退"
      >
        <div
          className="rd-track"
          style={{ height: `calc(${segs.length * SEG}px + 100dvh)` }}
        >
          <div className="rd-viewport">
            <div className="rd-windshield">
              <Scene
                pos={pos}
                segs={segs}
                state={state}
              />
              <div
                className="rd-intro"
                style={{ opacity: intro, visibility: intro < 0.02 ? 'hidden' : undefined }}
              >
                <p>{`ROAD TRIP · ${Math.round(trip.totalKm).toLocaleString()} KM`}</p>
                <h1>{trip.itinerary.name}</h1>
                <span>上滑出发</span>
              </div>
            </div>

            <div className="rd-dash">
              <div className="rd-cluster">
                <div className="rd-odo-wrap">
                  <p className="rd-label">
                    <span>ODO</span>
                    <span>{`/ ${Math.round(trip.totalKm).toLocaleString()} km`}</span>
                  </p>
                  <Odometer km={state.km} />
                  <p className="rd-gauge">
                    <span style={{ transform: `scaleX(${state.km / trip.totalKm})` }} />
                  </p>
                </div>
                <MiniMap
                  trip={trip}
                  segs={segs}
                  state={state}
                />
              </div>

              <NavPanel
                trip={trip}
                state={state}
              />

              <div className="rd-controls">
                <ol
                  className="rd-days"
                  aria-label="跳到某一天"
                >
                  {dayStarts.map(s => (
                    <li key={s.index}>
                      <button
                        type="button"
                        aria-current={s.day.no === state.seg.day.no ? 'step' : undefined}
                        data-tone={s.day.intensity}
                        onClick={() => jumpTo(s.index)}
                      >
                        {`D${s.day.no}`}
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  className="rd-auto"
                  aria-pressed={playing}
                  disabled={reduced}
                  onClick={() => setPlaying(p => !p)}
                >
                  {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
                  {playing ? '暂停' : '自动驾驶'}
                </button>
              </div>

              <button
                type="button"
                className="rd-cta"
                onClick={() => toast('演示页面，暂不支持保存编辑')}
              >
                保存并编辑线路
              </button>
            </div>
          </div>
        </div>
      </div>

      <ol className="sr-only">
        {trip.days.map(d => (
          <li key={d.no}>
            {`第${d.no}天 ${d.day.label} ${d.route}：${d.day.items.map(unitShortName).join('、')}`}
          </li>
        ))}
      </ol>
    </div>
  );
}
