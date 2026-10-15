import type { Itinerary } from '@/data/types';
import { ExternalLink } from 'lucide-react';
import './lab.css';

const VARIANTS = [
  {
    key: '',
    tag: '现状',
    name: '地图 + 抽屉',
    desc: '信息完整，但七天长得一模一样，看不出这是一趟什么样的旅行。',
  },
  {
    key: 'cinema',
    tag: 'A',
    name: '电影感 · 沉浸故事',
    desc: '每天一支短片：全屏大图缓推、故事式左右翻页、强调色从当天照片里取；归程日变成机场翻牌。',
  },
  {
    key: 'road',
    tag: 'B',
    name: '夜行公路 · 里程表',
    desc: '滚动就是开车：小车沿真实道路前进，里程表跟着滚动，路牌被车灯照亮，长途日直接标红。',
  },
  {
    key: 'journal',
    tag: 'C',
    name: '旅行手账 · 拼贴',
    desc: '拍立得、邮戳、登机牌、行李牌、便利贴：把行程做成一本能翻、能和同伴一起写的手账。',
  },
];

export function Lab({ itinerary }: { itinerary: Itinerary }) {
  const base = import.meta.env.BASE_URL;
  const href = (key: string) => (key ? `${base}?v=${key}` : base);
  return (
    <main className="lab">
      <header className="lab-head">
        <p className="lab-kicker">
          Visual Exploration ·
          {' '}
          {itinerary.name}
        </p>
        <h1>同一份行程，三种讲法</h1>
        <p>数据完全来自现有页面，每个原型都能直接上手操作（建议点开单独页面，用手机尺寸体验）。</p>
      </header>
      <ul className="lab-grid">
        {VARIANTS.map(v => (
          <li
            key={v.key || 'classic'}
            className="lab-item"
          >
            <div className="lab-phone">
              {/* eslint-disable-next-line react-dom/no-missing-iframe-sandbox -- 嵌入的是本站页面，模块脚本必须同源加载，sandbox 起不到隔离作用 */}
              <iframe
                title={v.name}
                src={href(v.key)}
                loading="lazy"
              />
            </div>
            <div className="lab-meta">
              <span className="lab-tag">{v.tag}</span>
              <h2>{v.name}</h2>
              <p>{v.desc}</p>
              <a
                href={href(v.key)}
                target="_blank"
                rel="noreferrer"
              >
                单独打开
                <ExternalLink aria-hidden />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
