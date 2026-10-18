import type { CSSProperties, ReactNode } from 'react';
import type { HotelUnit, PoiUnit, TransportUnit } from '@/data/types';
import { BedDouble, Plane } from 'lucide-react';
import { useState } from 'react';
import { photo } from '../shared/trip';

const vars = (v: Record<string, string | number>) => v as CSSProperties;

/** 和纸胶带：tone 选配色，angle 为倾斜角 */
export function Tape({ tone = 'mint', angle = -6, className = '' }: { tone?: 'mint' | 'pink' | 'yellow' | 'blue'; angle?: number; className?: string }) {
  return (
    <span
      className={`jr-tape ${className}`}
      data-tone={tone}
      style={vars({ '--r': `${angle}deg` })}
      aria-hidden
    />
  );
}

/** 圆形邮戳：外圈文字绕排，中间是日期 */
export function Postmark({ top, date, weekday, id }: { top: string; date: string; weekday: string; id: string }) {
  return (
    <svg
      className="jr-postmark jr-stamp"
      viewBox="0 0 120 96"
      style={vars({ '--r': '-12deg' })}
      aria-hidden
    >
      <defs>
        <path
          id={id}
          d="M60 82a34 34 0 1 1 0.1 0"
        />
      </defs>
      <g
        fill="none"
        stroke="currentColor"
      >
        <path
          d="M0 34q8-5 16 0t16 0M0 48q8-5 16 0t16 0M0 62q8-5 16 0t16 0"
          strokeWidth="2"
        />
        <circle
          cx="60"
          cy="48"
          r="44"
          strokeWidth="2.6"
        />
        <circle
          cx="60"
          cy="48"
          r="27"
          strokeWidth="1.4"
        />
      </g>
      <text
        className="jr-postmark__ring"
        fill="currentColor"
      >
        <textPath
          href={`#${id}`}
          startOffset="50%"
          textAnchor="middle"
        >
          {top}
        </textPath>
      </text>
      <text
        x="60"
        y="50"
        textAnchor="middle"
        fill="currentColor"
        className="jr-postmark__date"
      >
        {date}
      </text>
      <text
        x="60"
        y="64"
        textAnchor="middle"
        fill="currentColor"
        className="jr-postmark__week"
      >
        {weekday}
      </text>
    </svg>
  );
}

/** 橡皮章 */
export function RubberStamp({ children, tone = 'red', angle = -10 }: { children: ReactNode; tone?: 'red' | 'green' | 'blue'; angle?: number }) {
  return (
    <span
      className="jr-rubber jr-stamp"
      data-tone={tone}
      style={vars({ '--r': `${angle}deg` })}
    >
      {children}
    </span>
  );
}

/** 拍立得：进入视口时像相纸一样慢慢显影，点击翻到背面看笔记 */
export function Polaroid({ unit, angle, delay = 0 }: { unit: PoiUnit; angle: number; delay?: number }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      className="jr-polaroid"
      data-flipped={flipped}
      style={vars({ '--r': `${angle}deg`, '--d': `${delay}ms` })}
      onClick={() => setFlipped(f => !f)}
      aria-pressed={flipped}
      aria-label={`${unit.name}，点击翻面`}
    >
      <span className="jr-polaroid__face jr-polaroid__front">
        <span className="jr-polaroid__photo">
          <img
            src={photo(unit.image, 640)}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </span>
        <span className="jr-polaroid__caption">{unit.name}</span>
      </span>
      <span className="jr-polaroid__face jr-polaroid__back">
        <b>{unit.name}</b>
        <span>{unit.playTime}</span>
        {unit.price && <span>{unit.price}</span>}
        {unit.openStatus && <span>{unit.openStatus}</span>}
        <em>— 翻回去 ↺</em>
      </span>
      <Tape
        tone={angle > 0 ? 'pink' : 'yellow'}
        angle={-angle * 2}
        className="jr-polaroid__tape"
      />
    </button>
  );
}

const PINYIN_CITY: Record<string, string> = { 上海: 'SHANGHAI', 吐鲁番: 'TURPAN' };

export function BoardingPass({ flight, date }: { flight: TransportUnit; date: string }) {
  return (
    <div className="jr-pass">
      <div className="jr-pass__main">
        <p className="jr-pass__head">
          <Plane aria-hidden />
          BOARDING PASS · 登机牌
        </p>
        <div className="jr-pass__route">
          <span>
            <b>{flight.from.city}</b>
            <small>{PINYIN_CITY[flight.from.city] ?? ''}</small>
          </span>
          <i aria-hidden>✈</i>
          <span>
            <b>{flight.to.city}</b>
            <small>{PINYIN_CITY[flight.to.city] ?? ''}</small>
          </span>
        </div>
        <dl className="jr-pass__grid">
          <div>
            <dt>航班</dt>
            <dd>{flight.number}</dd>
          </div>
          <div>
            <dt>日期</dt>
            <dd>{date}</dd>
          </div>
          <div>
            <dt>起飞</dt>
            <dd>{flight.departTime}</dd>
          </div>
          <div>
            <dt>到达</dt>
            <dd>{flight.arriveTime}</dd>
          </div>
        </dl>
        <p className="jr-pass__foot">{`${flight.from.name}${flight.from.terminal ? ` ${flight.from.terminal}` : ''} → ${flight.to.name} · ${flight.duration ?? ''}`}</p>
      </div>
      <div
        className="jr-pass__stub"
        aria-hidden
      >
        <span className="jr-pass__barcode" />
        <b>{flight.number}</b>
      </div>
    </div>
  );
}

export function LuggageTag({ hotel, angle = 4 }: { hotel: HotelUnit; angle?: number }) {
  return (
    <div
      className="jr-tag"
      style={vars({ '--r': `${angle}deg` })}
    >
      <svg
        className="jr-tag__string"
        viewBox="0 0 60 40"
        aria-hidden
      >
        <path d="M6 34C14 4 40 -2 56 12" />
      </svg>
      <span
        className="jr-tag__hole"
        aria-hidden
      />
      <p className="jr-tag__kicker">
        <BedDouble aria-hidden />
        今晚住这儿
      </p>
      <p className="jr-tag__name">{hotel.name}</p>
      <p className="jr-tag__meta">{`${'◆'.repeat(hotel.star)} ${hotel.score.toFixed(1)}分 · ${hotel.reviewCount.toLocaleString()}条点评`}</p>
      {hotel.rank && <p className="jr-tag__rank">{hotel.rank}</p>}
    </div>
  );
}

/** 备注做成便利贴，链接单独成行，免得长网址撑破 */
export function StickyNote({ text, title }: { text: string; title: string }) {
  const url = /https?:\/\/\S+/.exec(text)?.[0];
  const body = url ? text.replace(url, '').trim() : text;
  return (
    <aside className="jr-sticky">
      <Tape
        tone="blue"
        angle={3}
        className="jr-sticky__tape"
      />
      <p className="jr-sticky__title">{`备注 · ${title}`}</p>
      <p className="jr-sticky__body">{body}</p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
        >
          打开链接 ↗
        </a>
      )}
    </aside>
  );
}
