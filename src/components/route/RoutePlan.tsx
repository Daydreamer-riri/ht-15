import type { TabKey } from './utils';
import type { Itinerary } from '@/data/types';
import { Map as MapIcon, PencilLine, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Backlog, Chapter, Colophon, Contents, Cover, Marquee } from './RouteCards';
import { RouteMap } from './RouteMap';
import { dayCities, dayNo, dayTheme, INK_THEME, themeVars, TODO_THEME, tripStats } from './utils';

/** 顶部章节条高度 */
const BAR_HEIGHT = 52;

/** 进入视口时淡入上移；只观察一次 */
function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) {
      return;
    }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute('data-in', '');
          io.unobserve(e.target);
        }
      }
    }, { root: el, rootMargin: '0px 0px -8% 0px' });
    el.querySelectorAll('[data-reveal]').forEach(n => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}

interface ChapterBarProps {
  itinerary: Itinerary;
  current: TabKey;
  progress: number;
  visible: boolean;
  onJump: (key: string) => void;
}

/** 滚过封面后出现：显示当前章节，颜色跟随章节主题 */
function ChapterBar({ itinerary, current, progress, visible, onJump }: ChapterBarProps) {
  const day = typeof current === 'number' ? itinerary.days.find(d => d.index === current) : undefined;
  const theme = day ? dayTheme(day.index) : current === 'todo' ? TODO_THEME : INK_THEME;
  const title = day ? dayCities(day) : current === 'todo' ? '待安排' : itinerary.name;
  return (
    <nav
      aria-label="章节导航"
      className={`absolute inset-x-0 top-0 z-30 border-b-2 border-ink transition-[transform,background-color,color] duration-300 ease-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{ background: theme.color, color: theme.on, height: BAR_HEIGHT }}
      inert={!visible}
    >
      <div className="flex h-full items-center gap-[10px] px-[14px]">
        <span className="font-display text-[26px] leading-none tabular-nums">{day ? dayNo(day) : current === 'todo' ? '+' : '00'}</span>
        <span className="min-w-0 flex-1 truncate font-serif text-[15px] font-black">{title}</span>
        <div className="flex gap-[4px]">
          {itinerary.days.map(d => (
            <button
              key={d.index}
              type="button"
              onClick={() => onJump(String(d.index))}
              aria-label={`跳到第${d.index}天`}
              aria-current={d.index === current ? 'step' : undefined}
              className="group flex h-[28px] w-[14px] items-center justify-center focus-visible:outline-2 focus-visible:outline-current"
            >
              <span
                className={`block border-[1.5px] border-current transition-all duration-200 ${d.index === current ? 'h-[18px] w-[8px] bg-current' : 'size-[8px] group-hover:bg-current/40'}`}
              />
            </button>
          ))}
        </div>
      </div>
      <div
        aria-hidden
        className="absolute bottom-[-2px] left-0 h-[3px] bg-ink"
        style={{ width: `${progress * 100}%` }}
      />
    </nav>
  );
}

interface MapSheetProps {
  itinerary: Itinerary;
  open: boolean;
  tab: TabKey;
  onTab: (tab: TabKey) => void;
  onClose: () => void;
}

/** 全屏地图：从底部滑入，底部可切换日期 */
function MapSheet({ itinerary, open, tab, onTab, onClose }: MapSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const day = typeof tab === 'number' ? itinerary.days.find(d => d.index === tab) : undefined;
  const theme = day ? dayTheme(day.index) : tab === 'todo' ? TODO_THEME : INK_THEME;
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: '全程' },
    ...itinerary.days.map(d => ({ key: d.index as TabKey, label: dayNo(d) })),
    ...(itinerary.toBePlanned.length ? [{ key: 'todo' as TabKey, label: '待定' }] : []),
  ];

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="行程地图"
      inert={!open}
      className={`absolute inset-0 z-50 flex flex-col bg-paper transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'translate-y-0' : 'translate-y-full'}`}
      style={themeVars(theme)}
    >
      <div
        className="flex shrink-0 items-center gap-[10px] border-b-2 border-ink px-[14px] pt-[max(10px,env(safe-area-inset-top))] pb-[10px] transition-colors duration-300"
        style={{ background: theme.color, color: theme.on }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-bold tracking-[0.16em] uppercase opacity-75">{day ? `Day ${dayNo(day)} · Route` : tab === 'todo' ? 'Maybe next' : 'The whole loop'}</div>
          <div className="truncate font-serif text-[18px] leading-[24px] font-black">{day ? dayCities(day) : tab === 'todo' ? '待安排地点' : itinerary.name}</div>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="关闭地图"
          className="flex size-[40px] shrink-0 items-center justify-center border-2 border-ink bg-paper text-ink shadow-[3px_3px_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <X className="size-[20px]" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {open && (
          <RouteMap
            itinerary={itinerary}
            tab={tab}
            bottomInset={80}
          />
        )}
      </div>
      <div
        role="tablist"
        aria-label="选择日期"
        className="absolute inset-x-[12px] bottom-[max(18px,env(safe-area-inset-bottom))] z-10 flex gap-[6px] overflow-x-auto border-2 border-ink bg-paper p-[6px] shadow-[4px_4px_0_var(--color-ink)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map(t => {
          const active = t.key === tab;
          const th = typeof t.key === 'number' ? dayTheme(t.key) : t.key === 'todo' ? TODO_THEME : INK_THEME;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTab(t.key)}
              className={`h-[38px] min-w-[44px] shrink-0 border-2 px-[8px] font-display text-[18px] transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink ${active ? 'border-ink' : 'border-transparent hover:border-ink/30'}`}
              style={active ? { background: th.color, color: th.on } : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RoutePlan({ itinerary }: { itinerary: Itinerary }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const stats = tripStats(itinerary);

  const [current, setCurrent] = useState<TabKey>('overview');
  const [progress, setProgress] = useState(0);
  const [barVisible, setBarVisible] = useState(false);
  /** 滚到深色封底时，底部按钮加亮色描边 */
  const [atEnd, setAtEnd] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapTab, setMapTab] = useState<TabKey>('overview');
  const mapTrigger = useRef<HTMLElement | null>(null);

  useReveal(scrollRef);

  const sectionRef = (key: string) => (el: HTMLElement | null) => {
    if (el) {
      sectionRefs.current.set(key, el);
    } else {
      sectionRefs.current.delete(key);
    }
  };

  const jump = useCallback((key: string) => {
    const el = sectionRefs.current.get(key);
    if (el) {
      scrollRef.current?.scrollTo({ top: el.offsetTop - BAR_HEIGHT + 2, behavior: 'smooth' });
    }
  }, []);

  const onScroll = () => {
    const list = scrollRef.current!;
    const max = list.scrollHeight - list.clientHeight;
    setProgress(max > 0 ? list.scrollTop / max : 0);
    setAtEnd(max - list.scrollTop < 260);
    setBarVisible(list.scrollTop > (coverRef.current?.offsetHeight ?? 600) - BAR_HEIGHT);
    const anchor = list.scrollTop + BAR_HEIGHT + 40;
    let next: TabKey = 'overview';
    for (const [key, el] of sectionRefs.current) {
      if (el.offsetTop <= anchor) {
        next = key === 'todo' ? 'todo' : Number(key);
      }
    }
    setCurrent(c => (c === next ? c : next));
  };

  const openMap = (tab: TabKey) => {
    mapTrigger.current = document.activeElement as HTMLElement;
    setMapTab(tab);
    setMapOpen(true);
  };
  const closeMap = useCallback(() => {
    setMapOpen(false);
    mapTrigger.current?.focus();
  }, []);

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[430px] overflow-hidden bg-paper text-ink shadow-[0_0_80px_-10px_rgb(0_0_0/0.5)]">
      <ChapterBar
        itinerary={itinerary}
        current={current}
        progress={progress}
        visible={barVisible && !mapOpen}
        onJump={jump}
      />

      <main
        ref={scrollRef}
        onScroll={onScroll}
        inert={mapOpen}
        className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={coverRef}>
          <Cover
            itinerary={itinerary}
            stats={stats}
          />
          <Marquee
            theme={{ color: '#ffc21a', on: '#14110f' }}
            items={itinerary.days.flatMap(d => d.cities.map(c => c.name)).filter((c, i, a) => a.indexOf(c) === i)}
          />
        </div>

        {/* 全程路线图：静态展示，点按打开全屏地图 */}
        <section
          aria-label="全程路线"
          className="bg-paper px-[18px] pt-[26px]"
        >
          <div className="flex items-end justify-between pb-[10px]">
            <h2 className="font-display text-[46px] leading-[40px] uppercase">The loop</h2>
            <span className="pb-[3px] text-right text-[11.5px] leading-[15px] font-semibold text-ink/60">
              每种颜色
              <br />
              代表一天
            </span>
          </div>
          <button
            type="button"
            onClick={() => openMap('overview')}
            aria-label="打开全程地图"
            className="group relative block aspect-[4/3] w-full overflow-hidden border-2 border-ink shadow-[4px_4px_0_var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <RouteMap
              itinerary={itinerary}
              tab="overview"
              interactive={false}
            />
            <span className="absolute right-[10px] bottom-[10px] z-[500] flex items-center gap-[6px] border-2 border-ink bg-paper px-[10px] py-[6px] text-[12px] font-bold transition-transform duration-200 group-hover:-translate-y-[2px]">
              <MapIcon className="size-[14px]" />
              展开地图
            </span>
          </button>
        </section>

        <Contents
          itinerary={itinerary}
          onJump={jump}
        />

        {itinerary.days.map(d => (
          <Chapter
            key={d.index}
            day={d}
            sectionRef={sectionRef(String(d.index))}
            onShowMap={() => openMap(d.index)}
          />
        ))}

        {itinerary.toBePlanned.length > 0 && (
          <Backlog
            itinerary={itinerary}
            sectionRef={sectionRef('todo')}
            onShowMap={() => openMap('todo')}
          />
        )}

        <Colophon itinerary={itinerary} />
      </main>

      {/* 底部操作坞 */}
      <div
        inert={mapOpen}
        className={`absolute inset-x-[14px] bottom-[max(18px,env(safe-area-inset-bottom))] z-40 flex gap-[10px] ${atEnd ? 'dock-on-dark' : ''}`}
        style={themeVars(typeof current === 'number' ? dayTheme(current) : TODO_THEME)}
      >
        <button
          type="button"
          onClick={() => openMap(current)}
          aria-label="打开当前章节地图"
          className="flex size-[54px] shrink-0 items-center justify-center border-2 border-ink bg-(--accent) text-(--on) shadow-[4px_4px_0_var(--color-ink)] transition-[background-color,color,transform,box-shadow] duration-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <MapIcon className="size-[22px]" />
        </button>
        <button
          type="button"
          onClick={() => toast('演示页面，暂不支持保存编辑')}
          className="flex h-[54px] flex-1 items-center justify-center gap-[8px] border-2 border-ink bg-ink text-[15.5px] font-bold text-paper shadow-[4px_4px_0_var(--accent)] transition-[transform,box-shadow] duration-150 in-[.dock-on-dark]:border-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <PencilLine className="size-[17px]" />
          保存并编辑线路
        </button>
      </div>

      <MapSheet
        itinerary={itinerary}
        open={mapOpen}
        tab={mapTab}
        onTab={setMapTab}
        onClose={closeMap}
      />
    </div>
  );
}
