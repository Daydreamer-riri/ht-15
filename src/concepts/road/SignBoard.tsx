import type { ReactNode } from 'react';

export type BoardKind = 'gantry' | 'poi' | 'hotel' | 'flight' | 'return' | 'warning';

export interface BoardText {
  kicker?: string;
  title: string;
  sub?: string;
}

/** 国标配色：景区棕底、酒店/城市蓝底、高速与机场绿底、警告黄底 */
const FILL: Record<BoardKind, string> = {
  gantry: '#0d7a43',
  poi: '#7b4320',
  hotel: '#1c4f9e',
  return: '#1c4f9e',
  flight: '#0d7a43',
  warning: '#f5c400',
};

/** 路牌原始尺寸（像素，scale = 1 时） */
export const BOARD_SIZE: Record<BoardKind, [number, number]> = {
  gantry: [330, 128],
  poi: [220, 118],
  hotel: [220, 118],
  return: [220, 118],
  flight: [220, 118],
  warning: [120, 120],
};

/** "乌伦古湖(黄金海岸景区)" -> ["乌伦古湖", "黄金海岸景区"] */
export function splitName(name: string): [string, string | undefined] {
  const m = /^(.+?)[(（](.+)[)）]$/.exec(name);
  return m ? [m[1], m[2]] : [name, undefined];
}

function wrap(text: string, max: number) {
  const chars = [...text];
  if (chars.length <= max) {
    return [text];
  }
  const half = Math.ceil(chars.length / 2);
  return [chars.slice(0, half).join(''), chars.slice(half).join('')];
}

const ICONS: Partial<Record<BoardKind, ReactNode>> = {
  poi: (
    <>
      <path d="M2 32 13 12l6 9 5-6 10 17z" />
      <path
        d="M13 12l3.4 5.2-2 1.6-1.4-2-1.6 2.2-1.6-1.2z"
        fill="#7b4320"
      />
    </>
  ),
  hotel: (
    <path d="M3 30V10h4v12h12v-7h9a5 5 0 0 1 5 5v10h-4v-4H7v4zM13 20a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4" />
  ),
  return: (
    <path d="M14 8 4 17l10 9v-6h8a6 6 0 0 1 0 12h-4v4h4a10 10 0 0 0 0-20h-8z" />
  ),
  flight: (
    <path
      d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"
      transform="translate(1 2) scale(1.45) rotate(45 12 12)"
    />
  ),
};

function RoadsideBoard({ kind, text }: { kind: BoardKind; text: BoardText }) {
  const [w, h] = BOARD_SIZE[kind];
  const title = wrap(text.title, 7);
  const size = Math.min(29, 148 / Math.max(...title.map(l => [...l].length)));
  const top = -h + (text.kicker ? 40 : 32) + (title.length > 1 ? 0 : 8);
  return (
    <>
      <rect
        x={-w / 2}
        y={-h}
        width={w}
        height={h}
        rx={10}
        fill={FILL[kind]}
      />
      <rect
        x={-w / 2 + 6}
        y={-h + 6}
        width={w - 12}
        height={h - 12}
        rx={6}
        fill="none"
        stroke="#fff"
        strokeWidth={3}
      />
      <g
        transform={`translate(${-w / 2 + 16} ${-h / 2 - 18})`}
        fill="#fff"
      >
        {ICONS[kind]}
      </g>
      <g
        fill="#fff"
        fontWeight={700}
      >
        {text.kicker && (
          <text
            x={-52}
            y={-h + 28}
            fontSize={15}
            fontWeight={500}
            opacity={0.9}
          >
            {text.kicker}
          </text>
        )}
        {title.map((line, i) => (
          <text
            key={i}
            x={-52}
            y={top + i * (size + 3) + size * 0.5}
            fontSize={size}
          >
            {line}
          </text>
        ))}
        {text.sub && (
          <text
            x={-52}
            y={-16}
            fontSize={14}
            fontWeight={500}
            opacity={0.88}
          >
            {text.sub}
          </text>
        )}
      </g>
    </>
  );
}

function GantryBoard({ text }: { text: BoardText }) {
  const [w, h] = BOARD_SIZE.gantry;
  const size = Math.min(34, 290 / [...text.title].length);
  return (
    <>
      <rect
        x={-w / 2}
        y={-h}
        width={w}
        height={h}
        rx={8}
        fill={FILL.gantry}
      />
      <rect
        x={-w / 2 + 6}
        y={-h + 6}
        width={w - 12}
        height={h - 12}
        rx={5}
        fill="none"
        stroke="#fff"
        strokeWidth={3}
      />
      <g
        fill="#fff"
        textAnchor="middle"
        fontWeight={700}
      >
        <text
          y={-h + 34}
          fontSize={17}
          fontWeight={500}
          letterSpacing={2}
        >
          {text.kicker}
        </text>
        <text
          y={-h + 72}
          fontSize={size}
        >
          {text.title}
        </text>
        <text
          y={-18}
          fontSize={16}
          fontWeight={500}
          opacity={0.9}
        >
          {text.sub}
        </text>
      </g>
    </>
  );
}

function WarningBoard({ text }: { text: BoardText }) {
  return (
    <>
      <path
        d="M0 -120 60 -60 0 0 -60 -60z"
        fill={FILL.warning}
        stroke="#111"
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <g
        textAnchor="middle"
        fill="#111"
        fontWeight={800}
      >
        <text
          y={-62}
          fontSize={21}
        >
          {text.title}
        </text>
        <text
          y={-38}
          fontSize={15}
          fontWeight={700}
        >
          {text.sub}
        </text>
      </g>
    </>
  );
}

export function SignBoard({ kind, text }: { kind: BoardKind; text: BoardText }) {
  if (kind === 'gantry') {
    return <GantryBoard text={text} />;
  }
  if (kind === 'warning') {
    return <WarningBoard text={text} />;
  }
  return (
    <RoadsideBoard
      kind={kind}
      text={text}
    />
  );
}
