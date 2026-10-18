import type { DriveState } from './drive';
import type { Pt } from './projection';
import type { SignSpec } from './signSpecs';
import type { Biome, Segment } from './timeline';
import { memo } from 'react';
import { palette, smoothstep } from './palette';
import { CX, depthSamples, HY, makeProjector, pts, ridgePath, ROAD_HALF, VIEW_H, VIEW_W, wrapPan, Z_FAR, Z_NEAR } from './projection';
import { BOARD_SIZE, SignBoard } from './SignBoard';
import { signsOf } from './signSpecs';
import { ARRIVE } from './timeline';

const RIDGES: Record<Biome, { far: string; near?: string; farAmp: number }> = {
  desert: { far: ridgePath(1.3, 34, 0), near: ridgePath(4.1, 15, 0), farAmp: 34 },
  mountain: { far: ridgePath(2.2, 118, 0.85), near: ridgePath(5.3, 56, 0.45), farAmp: 118 },
  lake: { far: ridgePath(3.7, 92, 0.7, 8), near: ridgePath(0.9, 12, 0.2), farAmp: 100 },
};

const STARS = Array.from({ length: 48 }, (_, i) => {
  const r = (n: number) => {
    const v = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  return { x: r(1) * VIEW_W, y: r(2) * (HY - 30), r: 0.5 + r(3) * 1.1, d: r(4) * 4 };
});

const DEPTHS = depthSamples(36);
const PLANE = 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z';

/** 段内位移 d（到最近点还差多少段）换算成世界距离：接近时按指数拉近，掠过时线性贴脸 */
function signDepth(d: number, near: number) {
  if (d >= 0) {
    return near * (Z_FAR / near) ** (d / ARRIVE);
  }
  return near + (d * (near - 0.7)) / (1 - ARRIVE);
}

interface SceneProps {
  pos: number;
  segs: Segment[];
  state: DriveState;
}

function Plane({ from, to, t, size }: { from: Pt; to: Pt; t: number; size: [number, number] }) {
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t;
  const s = size[0] + (size[1] - size[0]) * t;
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI + 90;
  return (
    <g opacity={smoothstep(0, 0.08, t) * (1 - smoothstep(0.92, 1, t))}>
      <line
        x1={from[0] + (x - from[0]) * 0.35}
        y1={from[1] + (y - from[1]) * 0.35}
        x2={x}
        y2={y}
        stroke="#fff"
        strokeOpacity={0.45}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <path
        d={PLANE}
        fill="#fff"
        transform={`translate(${x} ${y}) rotate(${angle}) scale(${s}) translate(-12 -12)`}
      />
    </g>
  );
}

function SceneImpl({ pos, segs, state }: SceneProps) {
  const p = palette(state.clock, state.biome);
  const { project, scaleAt } = makeProjector(state.curve);
  const travel = pos * 64;

  const edge = (x: number) => DEPTHS.map(z => project(x, 0, z));
  const strip = (x0: number, x1: number) => pts([...edge(x0), ...edge(x1).reverse()]);

  const dashes: string[] = [];
  for (let k = 0; k < 22; k++) {
    const z0 = k * 9 - (travel % 9) + Z_NEAR;
    const z1 = z0 + 3.2;
    if (z1 > Z_NEAR && z0 < 160) {
      const a = Math.max(Z_NEAR, z0);
      dashes.push(pts([project(-0.07, 0, a), project(0.07, 0, a), project(0.07, 0, z1), project(-0.07, 0, z1)]));
    }
  }

  const posts: { key: string; base: Pt; top: Pt; w: number }[] = [];
  for (let k = 1; k < 16; k++) {
    const z = k * 14 - (travel % 14);
    if (z > 1.3 && z < 150) {
      for (const side of [-1, 1]) {
        const x = side * (ROAD_HALF + 0.9);
        posts.push({ key: `${k}${side}`, base: project(x, 0, z), top: project(x, 0.9, z), w: Math.max(0.6, 0.12 * scaleAt(z)) });
      }
    }
  }

  const index = state.seg.index;
  const signs = segs
    .slice(Math.max(0, index - 1), index + 3)
    .flatMap(signsOf)
    .map((spec: SignSpec) => ({ spec, z: signDepth(spec.at - pos, spec.near) }))
    .filter(({ z }) => z > 0.75 && z < 260)
    .sort((a, b) => b.z - a.z);

  const sunT = state.clock / 0.86;
  const sun: Pt = [40 + 310 * sunT, HY + 12 - Math.sin(Math.PI * Math.min(1, sunT)) * 168];
  const pan = state.heading * (VIEW_W * 2 / (2 * Math.PI));
  const isFinish = state.seg.kind === 'finish';
  const landing = state.seg.kind === 'flight' && !state.seg.leg;

  return (
    <svg
      className="rd-scene"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="rd-sky"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0"
            stopColor={p.skyTop}
          />
          <stop
            offset="0.62"
            stopColor={p.skyMid}
          />
          <stop
            offset="1"
            stopColor={p.skyLow}
          />
        </linearGradient>
        <linearGradient
          id="rd-snow"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={HY - RIDGES.mountain.farAmp}
          x2="0"
          y2={HY}
        >
          <stop
            offset="0"
            stopColor={p.snow}
          />
          <stop
            offset="0.34"
            stopColor={p.farRidge}
          />
        </linearGradient>
        <linearGradient
          id="rd-haze"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0"
            stopColor={p.groundHaze}
          />
          <stop
            offset="1"
            stopColor={p.groundHaze}
            stopOpacity="0"
          />
        </linearGradient>
        <radialGradient id="rd-sunglow">
          <stop
            offset="0"
            stopColor={p.sun}
            stopOpacity="0.85"
          />
          <stop
            offset="1"
            stopColor={p.sun}
            stopOpacity="0"
          />
        </radialGradient>
        <radialGradient
          id="rd-beam"
          cx="0.5"
          cy="1"
          r="0.9"
        >
          <stop
            offset="0"
            stopColor="#ffe9b8"
            stopOpacity="0.55"
          />
          <stop
            offset="0.55"
            stopColor="#ffd98a"
            stopOpacity="0.12"
          />
          <stop
            offset="1"
            stopColor="#ffd98a"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>

      <rect
        width={VIEW_W}
        height={HY + 4}
        fill="url(#rd-sky)"
      />
      <g opacity={p.night}>
        {STARS.map((s, i) => (
          <circle
            key={i}
            className="rd-star"
            cx={s.x}
            cy={s.y}
            r={s.r}
            style={{ animationDelay: `${s.d}s` }}
          />
        ))}
        <g transform="translate(318 58)">
          <circle
            r={34}
            fill="url(#rd-sunglow)"
            opacity={0.35}
          />
          <circle
            r={12}
            fill="#f6f1de"
          />
          <circle
            r={11}
            cx={5}
            cy={-3}
            fill={p.skyTop}
          />
        </g>
      </g>
      {sunT < 1 && (
        <g transform={`translate(${sun[0]} ${sun[1]})`}>
          <circle
            r={64}
            fill="url(#rd-sunglow)"
            opacity={0.7}
          />
          <circle
            r={15}
            fill={p.sun}
          />
        </g>
      )}

      {(Object.keys(RIDGES) as Biome[]).map(b => (
        <g
          key={b}
          className="rd-biome"
          style={{ opacity: b === state.biome ? 1 : 0 }}
        >
          <path
            d={RIDGES[b].far}
            fill={b === 'mountain' ? 'url(#rd-snow)' : p.farRidge}
            transform={`translate(${wrapPan(pan * 0.5)} 0)`}
          />
          {RIDGES[b].near && (
            <path
              d={RIDGES[b].near}
              fill={p.nearRidge}
              transform={`translate(${wrapPan(pan)} 0)`}
            />
          )}
          {b === 'lake' && (
            <rect
              y={HY - 1}
              width={VIEW_W}
              height={15}
              fill={p.lake}
            />
          )}
        </g>
      ))}

      <rect
        className="rd-ground"
        y={HY + (state.biome === 'lake' ? 13 : 0)}
        width={VIEW_W}
        height={VIEW_H}
        style={{ fill: p.ground }}
      />
      <rect
        y={HY}
        width={VIEW_W}
        height={70}
        fill="url(#rd-haze)"
      />

      <polygon
        points={strip(-ROAD_HALF, ROAD_HALF)}
        fill={p.asphalt}
      />
      <polygon
        points={strip(-ROAD_HALF + 0.18, -ROAD_HALF + 0.32)}
        fill="#e9e6dc"
        opacity={0.8}
      />
      <polygon
        points={strip(ROAD_HALF - 0.32, ROAD_HALF - 0.18)}
        fill="#e9e6dc"
        opacity={0.8}
      />
      <g fill="#f2c230">
        {dashes.map((d, i) => (
          <polygon
            key={i}
            points={d}
          />
        ))}
      </g>
      {posts.map(o => (
        <g key={o.key}>
          <line
            x1={o.base[0]}
            y1={o.base[1]}
            x2={o.top[0]}
            y2={o.top[1]}
            stroke="#e8e8e8"
            strokeOpacity={0.85 - p.night * 0.5}
            strokeWidth={o.w}
          />
          <line
            x1={o.top[0]}
            y1={o.top[1]}
            x2={o.top[0]}
            y2={o.top[1] + (o.base[1] - o.top[1]) * 0.22}
            stroke="#ff9b2f"
            strokeWidth={o.w * (1 + p.night * 0.8)}
            strokeOpacity={0.6 + p.night * 0.4}
          />
        </g>
      ))}

      {signs.map(({ spec, z }) => {
        const [bw] = BOARD_SIZE[spec.kind];
        const s = (scaleAt(z) * spec.width) / bw;
        const [x, y] = project(spec.x, spec.bottom, z);
        const fade = 1 - smoothstep(150, 240, z);
        const poles = spec.kind === 'gantry'
          ? [-1, 1].map(side => [project(side * (ROAD_HALF + 0.8), 0, z), project(side * (ROAD_HALF + 0.8), spec.bottom + 2.4, z)])
          : [[project(spec.x, 0, z), [x, y] as Pt]];
        return (
          <g
            key={spec.key}
            opacity={fade}
          >
            {poles.map(([a, b], i) => (
              <line
                key={i}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={p.night > 0.5 ? '#3a3f4a' : '#9aa0a8'}
                strokeWidth={Math.max(0.8, 0.16 * scaleAt(z))}
              />
            ))}
            <g transform={`translate(${x} ${y}) scale(${s})`}>
              <SignBoard
                kind={spec.kind}
                text={spec.text}
              />
            </g>
          </g>
        );
      })}

      {landing && (
        <Plane
          from={[30, 40]}
          to={[CX - 30, HY - 6]}
          t={Math.min(1, state.t / ARRIVE)}
          size={[1.5, 0.3]}
        />
      )}
      {isFinish && (
        <Plane
          from={[CX + 24, HY - 6]}
          to={[372, 26]}
          t={state.t}
          size={[0.3, 1.5]}
        />
      )}

      <rect
        x={-60}
        y={HY + 40}
        width={VIEW_W + 120}
        height={VIEW_H - HY}
        fill="url(#rd-beam)"
        opacity={p.night}
        style={{ mixBlendMode: 'screen' }}
      />
    </svg>
  );
}

export const Scene = memo(SceneImpl);
