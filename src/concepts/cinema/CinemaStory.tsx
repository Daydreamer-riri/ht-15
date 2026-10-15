import type { CSSProperties, PointerEvent } from 'react';
import type { TripSummary } from '../shared/trip';
import type { Page } from './pages';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useImageAccent, useReducedMotion } from '../shared/hooks';
import { crop } from '../shared/trip';
import { kenBurns } from './CinemaCover';
import { CinemaTimeline } from './CinemaTimeline';
import { FlapBoard } from './FlapBoard';
import { StoryHead, StoryTitle, TodoGrid } from './StoryParts';

interface StoryProps {
  trip: TripSummary;
  pages: Page[];
  initial: number;
  /** 从哪张卡片展开（用于转场） */
  from?: DOMRect;
  getCardRect: (index: number) => DOMRect | undefined;
  onClosed: () => void;
}

const FULL = 'inset(0px 0px 0px 0px round 0px)';

function insetOf(rect: DOMRect, box: DOMRect) {
  return `inset(${rect.top - box.top}px ${box.right - rect.right}px ${box.bottom - rect.bottom}px ${rect.left - box.left}px round 14px)`;
}

const photosOf = (page: Page) => (page.kind === 'day' ? page.summary.photos : page.cover ? [page.cover] : []);

export function CinemaStory({ trip, pages, initial, from, getCardRect, onClosed }: StoryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(initial);
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const [slide, setSlide] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const page = pages[index];
  const photos = photosOf(page);
  const accent = useImageAccent(photos[0] && crop(photos[0].src, '120x120'), page.kind === 'todo' ? '#ffd36e' : '#8fc8ff');
  const flight = (page.kind === 'day' && !photos.length) ? page.summary.flights[0] : undefined;

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (el && from && !reduced) {
      el.animate([{ clipPath: insetOf(from, el.getBoundingClientRect()) }, { clipPath: FULL }], {
        duration: 640,
        easing: 'cubic-bezier(.2,.8,.2,1)',
      });
    }
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
    // 只在打开时播放一次展开动画
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    const el = rootRef.current;
    const rect = getCardRect(index);
    if (closing.current) {
      return;
    }
    closing.current = true;
    if (!el || !rect || reduced) {
      onClosed();
      return;
    }
    const anim = el.animate([{ clipPath: FULL }, { clipPath: insetOf(rect, el.getBoundingClientRect()) }], {
      duration: 460,
      easing: 'cubic-bezier(.4,0,.2,1)',
      fill: 'forwards',
    });
    anim.onfinish = onClosed;
  }, [getCardRect, index, onClosed, reduced]);

  const go = useCallback((delta: number) => {
    const next = index + delta;
    if (next < 0) {
      return;
    }
    if (next >= pages.length) {
      close();
      return;
    }
    setDir(delta > 0 ? 'next' : 'prev');
    setIndex(next);
    setSlide(0);
    setSheetOpen(false);
  }, [index, pages.length, close]);

  // 同一天有多张照片时自动轮播
  useEffect(() => {
    if (photos.length < 2 || reduced) {
      return;
    }
    const timer = window.setInterval(() => setSlide(s => (s + 1) % photos.length), 4800);
    return () => window.clearInterval(timer);
  }, [index, photos.length, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        go(1);
      } else if (e.key === 'ArrowLeft') {
        go(-1);
      } else if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, close]);

  // 左右滑切换天，上滑展开行程；滑动后吞掉随之而来的 click，避免再翻一页
  const onPointerDown = (e: PointerEvent) => {
    suppressClick.current = false;
    gesture.current = { x: e.clientX, y: e.clientY };
  };
  const finishGesture = (e: PointerEvent, area: 'stage' | 'sheet') => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) {
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    const horizontal = Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2;
    const vertical = Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx);
    if (horizontal && (area === 'stage' || !sheetOpen)) {
      suppressClick.current = true;
      go(dx < 0 ? 1 : -1);
    } else if (vertical && dy < 0) {
      suppressClick.current = true;
      setSheetOpen(true);
    } else if (vertical && (area === 'stage' || (bodyRef.current?.scrollTop ?? 0) <= 0)) {
      suppressClick.current = true;
      setSheetOpen(false);
    }
  };
  const tap = (fn: () => void) => () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    fn();
  };

  return (
    <div
      ref={rootRef}
      className="cn-story"
      style={{ '--accent': accent } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label="逐日行程"
    >
      <div
        className="cn-stage"
        onPointerDown={onPointerDown}
        onPointerUp={e => finishGesture(e, 'stage')}
      >
        {pages.map((p, pi) => photosOf(p).map((ph, si) => (
          <img
            key={`${pi}-${ph.src}`}
            className="cn-shot"
            data-active={ready && pi === index && si === slide}
            src={ph.src}
            alt=""
            referrerPolicy="no-referrer"
            style={kenBurns(pi + si)}
          />
        )))}
        {flight && (
          <FlapBoard
            key={index}
            flight={flight}
            days={trip.days.length}
          />
        )}
        <div className="cn-shade cn-shade--story" />
        <div className="cn-grain" />
        <button
          type="button"
          className="cn-zone cn-zone--prev"
          aria-label="上一天"
          onClick={tap(() => go(-1))}
        />
        <button
          type="button"
          className="cn-zone cn-zone--next"
          aria-label="下一天"
          onClick={tap(() => go(1))}
        />
      </div>

      <StoryHead
        trip={trip}
        pages={pages}
        index={index}
        onClose={close}
      />

      <StoryTitle
        key={index}
        page={page}
        dir={dir}
      />

      <section
        className="cn-sheet"
        data-open={sheetOpen}
        onPointerDown={onPointerDown}
        onPointerUp={e => finishGesture(e, 'sheet')}
      >
        <button
          type="button"
          className="cn-sheet__handle"
          aria-expanded={sheetOpen}
          onClick={tap(() => setSheetOpen(o => !o))}
        >
          {sheetOpen ? '收起' : page.kind === 'day' ? `当日 ${page.summary.day.items.length} 站 · 上滑展开` : '上滑查看全部'}
        </button>
        <div
          key={index}
          ref={bodyRef}
          className="cn-sheet__body"
          onClick={tap(() => setSheetOpen(true))}
        >
          {page.kind === 'day' ? <CinemaTimeline summary={page.summary} /> : <TodoGrid units={page.units} />}
        </div>
      </section>

      <div className="cn-story__cta">
        <button
          type="button"
          className="cn-cta"
          onClick={() => toast('演示页面，暂不支持保存编辑')}
        >
          保存并编辑线路
        </button>
      </div>
    </div>
  );
}
