import type { Itinerary } from '@/data/types';
import { ChevronDown, Gauge, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useReducedMotion } from '../shared/hooks';
import { formatMinutes, summarize } from '../shared/trip';
import { drawScene, PX_H, PX_W } from './draw';
import { buildModel, stateAt } from './model';
import './pixel.css';

/** 每毫秒滚动的像素 */
const AUTO_SPEED = 0.42;
const AUTO_HOLD = 900;

/** 方案：像素公路。低分辨率画布放大，做成 16-bit 公路游戏，滚动就是往前开 */
export function Pixel({ itinerary }: { itinerary: Itinerary }) {
  const trip = useMemo(() => summarize(itinerary), [itinerary]);
  const model = useMemo(() => buildModel(trip), [trip]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [km, setKm] = useState(0);
  const [playing, setPlaying] = useState(false);

  const state = stateAt(model, km);
  /** 整趟行程摊到滚动条上：一公里对应多少像素 */
  const perKm = 2.2;
  const trackHeight = model.totalKm * perKm;

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      setKm(Math.min(model.totalKm, el.scrollTop / perKm));
    }
  }, [model.totalKm, perKm]);

  // 画布：每帧重绘一次，滚动和动画都走同一处
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      // 30fps 重绘足够，省一点电
      if (now - last > 32) {
        last = now;
        drawScene(ctx, { state: stateAt(model, km), km, t: now });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [model, km]);

  // 自动驾驶：像游戏一样自己往前走，快到站时停一下
  useEffect(() => {
    const el = scrollRef.current;
    if (!playing || !el) {
      return;
    }
    let raf = 0;
    let last = performance.now();
    let hold = 0;
    let y = el.scrollTop;
    let prev = km;
    const step = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (hold > 0) {
        hold -= dt;
      } else {
        y += dt * AUTO_SPEED;
        el.scrollTop = y;
        const cur = y / perKm;
        if (model.stops.some(s => prev < s.km && cur >= s.km)) {
          hold = AUTO_HOLD;
        }
        prev = cur;
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
  }, [playing, model.stops, perKm, km]);

  const jumpTo = (kmTarget: number) => {
    setPlaying(false);
    scrollRef.current?.scrollTo({ top: kmTarget * perKm, behavior: reduced ? 'auto' : 'smooth' });
  };

  const places = model.stops.filter(s => s.kind === 'place' || s.kind === 'custom');
  const percent = Math.round((state.km / model.totalKm) * 100);

  return (
    <div className="px-root">
      <div
        ref={scrollRef}
        className="px-scroll"
        onScroll={onScroll}
        tabIndex={0}
        aria-label="滚动前进，像在公路上开车"
      >
        <div style={{ height: `calc(${trackHeight}px + 100dvh)` }}>
          <div className="px-stage">
            <div className="px-screen">
              <canvas
                ref={canvasRef}
                width={PX_W}
                height={PX_H}
                aria-hidden
              />
              <div
                className="px-scanlines"
                aria-hidden
              />
              {state.atStop && state.stop?.kind === 'place' && (
                <div
                  key={state.stop.name}
                  className="px-sign"
                >
                  <span aria-hidden>!</span>
                  {state.stop.name}
                </div>
              )}
              {km < 6 && (
                <div className="px-title">
                  <p>{`ROAD TRIP · ${Math.round(model.totalKm).toLocaleString()} KM`}</p>
                  <h1>{model.name}</h1>
                  <span>
                    上滑开始
                    <ChevronDown aria-hidden />
                  </span>
                </div>
              )}
            </div>

            <div className="px-hud">
              <div className="px-hud__row">
                <p className="px-hud__kicker">{`DAY ${String(state.day.no).padStart(2, '0')} · ${state.day.route}`}</p>
                <span className="px-hud__biome">
                  {{ desert: '荒漠', mountain: '雪山', lake: '湖泊' }[state.day.biome]}
                </span>
              </div>

              <p className="px-hud__place">
                {state.stop ? state.stop.name : '准备出发'}
                {state.atStop
                  ? <em>已到达</em>
                  : <em>{`距下一站 ${state.toNext.toFixed(1)} km`}</em>}
              </p>

              <div className="px-hud__meters">
                <div>
                  <p className="px-meter__label">
                    <Gauge aria-hidden />
                    ODO
                  </p>
                  <p className="px-meter__value">
                    {Math.round(state.km).toLocaleString()}
                    <small>{`/${Math.round(model.totalKm).toLocaleString()}`}</small>
                  </p>
                </div>
                <div>
                  <p className="px-meter__label">行程</p>
                  <p className="px-meter__value">
                    {percent}
                    <small>%</small>
                  </p>
                </div>
                <div>
                  <p className="px-meter__label">今日</p>
                  <p className="px-meter__value">
                    {Math.round(state.km - state.day.start)}
                    <small>{`/${Math.round(state.day.end - state.day.start)}`}</small>
                  </p>
                </div>
              </div>

              <div className="px-bar">
                <span style={{ width: `${percent}%` }} />
                {model.days.map(d => (
                  <i
                    key={d.no}
                    style={{ left: `${(d.start / model.totalKm) * 100}%` }}
                  />
                ))}
              </div>

              <div className="px-hud__controls">
                <ol
                  className="px-days"
                  aria-label="跳到某一天"
                >
                  {model.days.map(d => (
                    <li key={d.no}>
                      <button
                        type="button"
                        aria-current={d.no === state.day.no ? 'step' : undefined}
                        onClick={() => jumpTo(d.start)}
                      >
                        {d.no}
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  className="px-play"
                  aria-pressed={playing}
                  disabled={reduced}
                  onClick={() => setPlaying(p => !p)}
                >
                  {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
                  {playing ? '暂停' : '自动开'}
                </button>
              </div>

              <button
                type="button"
                className="px-cta"
                onClick={() => toast('演示页面，暂不支持保存编辑')}
              >
                保存并编辑线路
              </button>
            </div>
          </div>
        </div>
      </div>

      <ol className="sr-only">
        {model.stops.map(s => (
          <li key={`${s.day}-${s.km}`}>
            {`第${s.day}天 ${s.route}，${s.name}${s.meta ? `，${s.meta}` : ''}`}
          </li>
        ))}
        <li>{`全程 ${Math.round(model.totalKm).toLocaleString()} km，${formatMinutes(trip.totalMin)}`}</li>
        <li>{`途经 ${places.length} 处风景`}</li>
      </ol>
    </div>
  );
}
