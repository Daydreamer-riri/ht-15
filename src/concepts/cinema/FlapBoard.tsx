import type { TransportUnit } from '@/data/types';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../shared/hooks';

const LATIN = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
const HANZI = '上海吐鲁番乌木齐喀纳斯赛里湖布尔津克拉玛依博乐奎屯';

/** 机场翻牌：每个字符先乱翻几轮，再从左到右依次停在目标字符上 */
function FlapText({ text, delay }: { text: string; delay: number }) {
  const reduced = useReducedMotion();
  const chars = [...text];
  const settleAt = (i: number) => 8 + i * 2;
  const total = settleAt(chars.length);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) {
      return;
    }
    let n = 0;
    let timer = 0;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        n += 1;
        setTick(n);
        if (n >= total) {
          window.clearInterval(timer);
        }
      }, 55);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [delay, total, reduced]);

  return (
    <span className="cn-flap">
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const pool = /[\u4E00-\u9FA5]/.test(ch) ? HANZI : LATIN;
        const settled = reduced || ch === ' ' || tick >= settleAt(i);
        const shown = settled ? ch : pool[(tick * 7 + i * 13) % pool.length];
        return (
          <span
            key={i}
            className="cn-flap__cell"
            aria-hidden
          >
            <span
              key={shown}
              className="cn-flap__char"
            >
              {shown}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** 没有景点照片的归程日：用出发航显牌代替大图 */
export function FlapBoard({ flight, days }: { flight: TransportUnit; days: number }) {
  const rows: [string, string][] = [
    ['航班 FLIGHT', flight.number ?? '--'],
    ['目的地 TO', flight.to.city],
    ['起飞 DEP', flight.departTime ?? '--:--'],
    ['到达 ARR', flight.arriveTime ?? '--:--'],
  ];
  return (
    <div className="cn-sky">
      <div className="cn-board">
        <p className="cn-board__title">
          <span>DEPARTURES</span>
          <span>{`${flight.from.name}${flight.from.terminal ? ` ${flight.from.terminal}` : ''}`}</span>
        </p>
        <dl className="cn-board__rows">
          {rows.map(([label, value], i) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <FlapText
                  text={value}
                  delay={250 + i * 180}
                />
              </dd>
            </div>
          ))}
        </dl>
        <p className="cn-board__foot">{`飞行 ${flight.duration ?? '--'} · 带着 ${days} 天的风景回家`}</p>
      </div>
    </div>
  );
}
