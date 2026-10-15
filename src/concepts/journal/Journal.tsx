import type { Itinerary } from '@/data/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useReducedMotion } from '../shared/hooks';
import { summarize } from '../shared/trip';
import { IdeasPage, TocPage } from './BookPages';
import { Cover } from './Cover';
import { DayPage } from './DayPage';
import './journal.css';
import './journal-parts.css';
import './journal-cover.css';

type CoverState = 'closed' | 'opening' | 'open';

/** 方案 C：一本可以翻的旅行手账。邮戳、拍立得、登机牌、行李牌，把行程变成纪念品 */
export function Journal({ itinerary }: { itinerary: Itinerary }) {
  const trip = useMemo(() => summarize(itinerary), [itinerary]);
  const reduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pages = useRef(new Map<string, HTMLElement>());
  const [cover, setCover] = useState<CoverState>('closed');
  const [active, setActive] = useState('toc');

  const pageRef = useCallback((key: string) => (el: HTMLElement | null) => {
    if (el) {
      pages.current.set(key, el);
    } else {
      pages.current.delete(key);
    }
  }, []);

  // 每页第一次进入视口时打上 data-inview，邮戳、显影、描线等动画都挂在这个属性上
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }
    const reveal = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute('data-inview', 'true');
          reveal.unobserve(e.target);
        }
      }
    }, { root, threshold: 0.12 });
    const spy = new IntersectionObserver(entries => {
      const hit = entries.filter(e => e.isIntersecting).at(-1);
      const key = hit?.target.getAttribute('data-page');
      if (key) {
        setActive(key);
      }
    }, { root, rootMargin: '-40% 0px -55% 0px' });
    for (const el of pages.current.values()) {
      reveal.observe(el);
      spy.observe(el);
    }
    return () => {
      reveal.disconnect();
      spy.disconnect();
    };
  }, []);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    scrollRef.current?.scrollTo({ top: (el?.offsetTop ?? 0) - 10, behavior: reduced ? 'auto' : 'smooth' });
  };

  const openCover = () => setCover(c => (c === 'closed' ? (reduced ? 'open' : 'opening') : c));

  const tabs = [
    { key: 'toc', label: '目', target: 'jr-toc' },
    ...trip.days.map(d => ({ key: String(d.no), label: String(d.no), target: `jr-day-${d.no}` })),
    ...(trip.itinerary.toBePlanned.length ? [{ key: 'ideas', label: '灵', target: 'jr-ideas' }] : []),
  ];

  return (
    <div className="jr-root">
      <div
        ref={scrollRef}
        className="jr-scroll"
        inert={cover !== 'open'}
      >
        <main className="jr-book">
          <TocPage
            trip={trip}
            pageRef={pageRef('toc')}
            onJump={jump}
          />
          {trip.days.map(d => (
            <DayPage
              key={d.no}
              summary={d}
              pageRef={pageRef(String(d.no))}
            />
          ))}
          {trip.itinerary.toBePlanned.length > 0 && (
            <IdeasPage
              trip={trip}
              pageRef={pageRef('ideas')}
            />
          )}
        </main>
      </div>

      <nav
        className="jr-tabs"
        aria-label="书签：翻到某一页"
        data-hidden={cover !== 'open'}
      >
        {tabs.map((t, i) => (
          <button
            key={t.key}
            type="button"
            data-tone={i % 4}
            aria-current={active === t.key ? 'page' : undefined}
            onClick={() => jump(t.target)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="jr-cta"
        data-hidden={cover !== 'open'}
        onClick={() => toast('演示页面，暂不支持保存编辑')}
      >
        保存并编辑线路
      </button>

      {cover !== 'open' && (
        <Cover
          trip={trip}
          opening={cover === 'opening'}
          onOpen={openCover}
          onOpened={() => setCover('open')}
        />
      )}
    </div>
  );
}
