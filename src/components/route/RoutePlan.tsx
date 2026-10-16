import type { TabKey } from './utils';
import type { Itinerary } from '@/data/types';
import { Maximize2, Minimize2, PencilLine } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DaySection, OverviewCard, OverviewFooter, OverviewTodoCard, TodoSection } from './RouteCards';
import { RouteMap } from './RouteMap';
import { tripStats } from './utils';

/** 抽屉展开时顶部露出的地图高度 */
const OPEN_TOP = 161;
/** 抽屉收起时露出的高度（拖拽条 + 标题 + tab） */
const PEEK_HEIGHT = 270;
/** sticky tab 栏高度 */
const TABS_HEIGHT = 56;

type DrawerState = 'open' | 'peek';

function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(() => window.innerHeight);
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  return [ref, height] as const;
}

function CoEditors({ editors }: { editors: Itinerary['coEditors'] }) {
  const shown = editors.slice(0, 2);
  const rest = editors.length - shown.length;
  return (
    <div
      className="flex justify-end"
      aria-label={`${editors.length}位共同编辑者`}
    >
      {shown.map(e => (
        <span
          key={e.avatar}
          className="-ml-[8px] size-[28px] overflow-hidden rounded-[9px] border-2 border-paper bg-paper-deep first:ml-0"
        >
          <img
            src={e.avatar}
            alt={e.nickName}
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        </span>
      ))}
      {rest > 0 && (
        <span className="-ml-[8px] flex size-[28px] items-center justify-center rounded-[9px] border-2 border-paper bg-paper-deep text-[11px] font-medium text-ink-2 tabular-nums">
          +
          {rest}
        </span>
      )}
    </div>
  );
}

interface TabBarProps {
  itinerary: Itinerary;
  tab: TabKey;
  onChange: (tab: TabKey) => void;
}

function TabBar({ itinerary, tab, onChange }: TabBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const tabs: { key: TabKey; label: string; sub?: string }[] = [
    { key: 'overview', label: '总览' },
    ...itinerary.days.map(d => ({ key: d.index as TabKey, label: `D${d.index}`, sub: d.label.replace(/^\d+月/, '') })),
    ...(itinerary.toBePlanned.length ? [{ key: 'todo' as TabKey, label: '待安排' }] : []),
  ];

  // 让选中的 tab 滚动到可视区域中间
  useEffect(() => {
    const bar = barRef.current;
    const active = bar?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!bar || !active) {
      return;
    }
    bar.scrollTo({ left: active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' });
  }, [tab]);

  return (
    <div
      ref={barRef}
      role="tablist"
      aria-label="行程日期"
      className="paper-grain sticky top-0 z-10 flex h-[56px] items-center gap-[6px] overflow-x-auto px-[20px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map(t => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`flex h-[34px] shrink-0 items-baseline gap-[4px] rounded-[10px] px-[11px] pt-[7px] text-[14px] whitespace-nowrap transition duration-200 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
              active ? 'bg-ink font-semibold text-paper shadow-[0_4px_12px_-4px_rgb(29_27_24/0.5)]' : 'text-ink-2 hover:bg-paper-deep hover:text-ink'
            }`}
          >
            {t.label}
            {t.sub && <span className={`text-[11px] tabular-nums ${active ? 'text-paper/60' : 'text-ink-3'}`}>{t.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function RoutePlan({ itinerary }: { itinerary: Itinerary }) {
  const [rootRef, rootHeight] = useElementHeight<HTMLDivElement>();
  const listRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  /** 程序滚动期间暂停滚动联动，避免 tab 来回跳 */
  const scrollLockUntil = useRef(0);
  /** 切换 tab 后待滚动定位的分区 */
  const pendingScroll = useRef<string | null>(null);

  const [tab, setTab] = useState<TabKey>('overview');
  const [drawer, setDrawer] = useState<DrawerState>('open');
  const [dragTop, setDragTop] = useState<number | null>(null);
  const dragStart = useRef<{ y: number; top: number } | null>(null);

  const openTop = Math.min(OPEN_TOP, rootHeight * 0.3);
  const peekTop = Math.max(openTop, rootHeight - PEEK_HEIGHT);
  const snapTop = drawer === 'open' ? openTop : peekTop;
  const drawerTop = dragTop ?? snapTop;
  const detailMode = tab !== 'overview';
  const stats = tripStats(itinerary);

  const scrollToSection = useCallback((key: string) => {
    const list = listRef.current;
    const el = sectionRefs.current.get(key);
    if (!list || !el) {
      return;
    }
    scrollLockUntil.current = Date.now() + 800;
    list.scrollTo({ top: el.offsetTop - TABS_HEIGHT, behavior: 'smooth' });
  }, []);

  const selectTab = (next: TabKey) => {
    setDrawer('open');
    setTab(next);
    if (next === 'overview') {
      pendingScroll.current = null;
      listRef.current?.scrollTo({ top: 0 });
      return;
    }
    if (detailMode) {
      scrollToSection(String(next));
    } else {
      // 从总览切换到详情：等详情列表渲染完成后再定位
      pendingScroll.current = String(next);
    }
  };

  useLayoutEffect(() => {
    const key = pendingScroll.current;
    if (!detailMode || !key) {
      return;
    }
    pendingScroll.current = null;
    const list = listRef.current!;
    const el = sectionRefs.current.get(key);
    scrollLockUntil.current = Date.now() + 300;
    if (el) {
      list.scrollTop = el.offsetTop - TABS_HEIGHT;
    }
  }, [detailMode, tab]);

  // 详情模式下，滚动列表时同步选中的 tab（同时驱动地图切换）
  const onListScroll = () => {
    if (!detailMode || Date.now() < scrollLockUntil.current) {
      return;
    }
    const list = listRef.current!;
    const anchor = list.scrollTop + TABS_HEIGHT + 12;
    let current: string | null = null;
    for (const [key, el] of sectionRefs.current) {
      if (el.offsetTop <= anchor) {
        current = key;
      }
    }
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 2) {
      current = [...sectionRefs.current.keys()].at(-1) ?? current;
    }
    if (!current) {
      return;
    }
    const next: TabKey = current === 'todo' ? 'todo' : Number(current);
    if (next !== tab) {
      setTab(next);
    }
  };

  const sectionRef = (key: string) => (el: HTMLElement | null) => {
    if (el) {
      sectionRefs.current.set(key, el);
    } else {
      sectionRefs.current.delete(key);
    }
  };

  // ---- 抽屉拖拽 ----
  const onDragStart = (e: React.PointerEvent) => {
    dragStart.current = { y: e.clientY, top: snapTop };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragStart.current) {
      return;
    }
    const top = dragStart.current.top + e.clientY - dragStart.current.y;
    setDragTop(Math.min(peekTop, Math.max(openTop, top)));
  };
  const onDragEnd = (e: React.PointerEvent) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) {
      return;
    }
    const delta = e.clientY - start.y;
    if (Math.abs(delta) < 5) {
      setDrawer(d => (d === 'open' ? 'peek' : 'open'));
    } else {
      const top = start.top + delta;
      setDrawer(top - openTop < (peekTop - openTop) / 2 ? 'open' : 'peek');
    }
    setDragTop(null);
  };

  return (
    <div
      ref={rootRef}
      className="relative mx-auto h-[100dvh] w-full max-w-[430px] overflow-hidden bg-paper text-ink shadow-[0_0_60px_-10px_rgb(60_45_25/0.35)]"
    >
      <RouteMap
        itinerary={itinerary}
        tab={tab}
        bottomInset={rootHeight - drawerTop}
      />

      <button
        type="button"
        aria-label={drawer === 'open' ? '展开地图' : '收起地图'}
        onClick={() => setDrawer(d => (d === 'open' ? 'peek' : 'open'))}
        className="absolute right-[12px] z-20 flex size-[36px] items-center justify-center rounded-[11px] bg-ink/70 text-paper shadow-[0_4px_12px_-4px_rgb(0_0_0/0.4)] backdrop-blur-md transition-colors hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        style={{ top: drawerTop - 48, transition: dragTop === null ? 'top 380ms cubic-bezier(0.32, 0.72, 0, 1)' : undefined }}
      >
        {drawer === 'open' ? <Maximize2 className="size-[16px]" /> : <Minimize2 className="size-[16px]" />}
      </button>

      <div
        className="paper-grain absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-[22px] shadow-[0_-8px_30px_-6px_rgb(60_45_25/0.22)]"
        style={{ top: drawerTop, transition: dragTop === null ? 'top 380ms cubic-bezier(0.32, 0.72, 0, 1)' : undefined }}
      >
        <div
          className="flex h-[24px] shrink-0 cursor-grab touch-none justify-center pt-[10px] focus-visible:outline-none [&:focus-visible>span]:bg-brand"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          role="button"
          tabIndex={0}
          aria-label={drawer === 'open' ? '收起行程列表' : '展开行程列表'}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setDrawer(d => (d === 'open' ? 'peek' : 'open'));
            }
          }}
        >
          <span className="h-[4px] w-[38px] rounded-full bg-ink-3/40 transition-colors" />
        </div>

        <div
          ref={listRef}
          onScroll={onListScroll}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {!detailMode && (
            <header className="px-[20px] pt-[4px] pb-[4px]">
              <div className="flex items-center justify-between gap-[12px]">
                <span className="text-[11.5px] font-medium tracking-[0.08em] text-ink-3 tabular-nums">{stats.range}</span>
                <CoEditors editors={itinerary.coEditors} />
              </div>
              <h1 className="mt-[4px] font-serif text-[30px] leading-[36px] font-bold tracking-[-0.01em] text-balance">{itinerary.name}</h1>
              <dl className="mt-[12px] flex items-center gap-[18px] text-ink-2">
                {[
                  [stats.days, '天'],
                  [stats.nights, '晚'],
                  [stats.cities, '座城市'],
                  [stats.places, '个地点'],
                ].map(([n, unit]) => (
                  <div
                    key={unit}
                    className="flex items-baseline gap-[3px]"
                  >
                    <dt className="sr-only">{unit}</dt>
                    <dd className="flex items-baseline gap-[3px]">
                      <span className="text-[20px] leading-[24px] font-semibold text-ink tabular-nums">{n}</span>
                      <span className="text-[12px]">{unit}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </header>
          )}

          <TabBar
            itinerary={itinerary}
            tab={tab}
            onChange={selectTab}
          />

          <div className="px-[20px] pb-[120px]">
            {detailMode
              ? (
                  <>
                    {itinerary.days.map((d, i) => (
                      <DaySection
                        key={d.index}
                        day={d}
                        first={i === 0}
                        sectionRef={sectionRef(String(d.index))}
                      />
                    ))}
                    {itinerary.toBePlanned.length > 0 && (
                      <TodoSection
                        itinerary={itinerary}
                        sectionRef={sectionRef('todo')}
                      />
                    )}
                  </>
                )
              : (
                  <div className="flex flex-col gap-[10px] pt-[4px]">
                    {itinerary.days.map(d => (
                      <OverviewCard
                        key={d.index}
                        day={d}
                        onClick={() => selectTab(d.index)}
                      />
                    ))}
                    {itinerary.toBePlanned.length > 0 && (
                      <OverviewTodoCard
                        units={itinerary.toBePlanned}
                        onClick={() => selectTab('todo')}
                      />
                    )}
                    <OverviewFooter onClick={() => selectTab(itinerary.days[0].index)} />
                  </div>
                )}
          </div>
        </div>
      </div>

      {/* 底部渐隐，让列表内容不生硬地撞到按钮 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[110px] bg-gradient-to-t from-paper via-paper/85 to-transparent"
      />

      <button
        type="button"
        onClick={() => toast('演示页面，暂不支持保存编辑')}
        className="absolute inset-x-[16px] bottom-[max(24px,env(safe-area-inset-bottom))] z-30 flex h-[52px] items-center justify-center gap-[8px] rounded-[16px] bg-ink text-[15.5px] font-semibold text-paper shadow-[0_10px_24px_-8px_rgb(29_27_24/0.55)] transition duration-200 ease-out hover:bg-[#2e2b26] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <PencilLine className="size-[17px]" />
        保存并编辑线路
      </button>
    </div>
  );
}
