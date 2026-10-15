import type { LatLng } from '@/data/types';
import { useId, useMemo } from 'react';
import { fitProjector, toSmoothPath } from '../shared/geo';

export interface SketchMark {
  position: LatLng;
  /** 圆圈里的字：序号、“宿”、“✈” 等 */
  badge: string;
  name?: string;
  kind?: 'place' | 'stay' | 'start' | 'air';
}

interface RouteSketchProps {
  paths: LatLng[][];
  marks: SketchMark[];
  width?: number;
  height?: number;
  label: string;
}

/** 手绘路线：抽稀平滑后再用噪声位移出铅笔抖动感，进入视口时一笔画出 */
export function RouteSketch({ paths, marks, width = 320, height = 170, label }: RouteSketchProps) {
  const pencil = useId();
  const geo = useMemo(() => {
    const project = fitProjector([...paths.flat(), ...marks.map(m => m.position)], width, height, 24);
    return {
      lines: paths.map(p => toSmoothPath(p, project, 3.5)),
      marks: marks.map(m => ({ ...m, xy: project(m.position) })),
    };
  }, [paths, marks, width, height]);

  return (
    <svg
      className="jr-sketch"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <defs>
        <filter id={pencil}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            seed="7"
          />
          <feDisplacementMap
            in="SourceGraphic"
            scale="2.4"
          />
        </filter>
      </defs>
      <g filter={`url(#${pencil})`}>
        {geo.lines.map((d, i) => (
          <g key={i}>
            <path
              d={d}
              pathLength={1}
              className="jr-sketch__shadow"
            />
            <path
              d={d}
              pathLength={1}
              className="jr-sketch__line"
              style={{ animationDelay: `${0.25 + i * 0.18}s` }}
            />
          </g>
        ))}
      </g>
      {geo.marks.map((m, i) => {
        const right = m.xy[0] < width * 0.68;
        // 位移放在外层 g 的属性上，动画只改内层的 CSS transform，两者互不覆盖
        return (
          <g
            key={i}
            transform={`translate(${m.xy[0].toFixed(1)} ${m.xy[1].toFixed(1)})`}
          >
            <g
              className="jr-sketch__mark"
              data-kind={m.kind ?? 'place'}
              style={{ animationDelay: `${0.6 + i * 0.12}s` }}
            >
              <circle r={8.5} />
              <text
                y={3.6}
                textAnchor="middle"
              >
                {m.badge}
              </text>
              {m.name && (
                <text
                  className="jr-sketch__name"
                  x={right ? 12 : -12}
                  y={4}
                  textAnchor={right ? 'start' : 'end'}
                >
                  {m.name}
                </text>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
