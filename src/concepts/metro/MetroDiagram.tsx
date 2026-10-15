import type { DayRow, Diagram, Station } from './diagram';
import { DAY_KM, PAD, VIEW_W } from './diagram';

interface DiagramProps {
  model: Diagram;
  active: number;
  onPick: (s: Station) => void;
  onSelectDay: (no: number) => void;
}

const DOT = 9.5;
/** 停在两端端点上的站点，名字要朝里排，否则会出画 */
const anchorOf = (x: number) => (x <= PAD + 1 ? 'start' : x >= VIEW_W - PAD - 1 ? 'end' : 'middle');

function StationDot({ s, color }: { s: Station; color: string }) {
  const fill = s.kind === 'hotel' ? '#fff3cf' : s.kind === 'flight' ? '#e6efff' : '#fff';
  return (
    <>
      <circle
        cx={s.x}
        cy={s.y}
        r={DOT}
        fill={fill}
        stroke={color}
        strokeWidth={2.6}
        strokeDasharray={s.kind === 'flight' ? '4 3' : undefined}
      />
      <text
        className="mt-dot__mark"
        x={s.x}
        y={s.y + 4}
        textAnchor="middle"
      >
        {s.badge}
      </text>
    </>
  );
}

function StationLabel({ s, color, drop }: { s: Station; color: string; drop: boolean }) {
  const anchor = anchorOf(s.x);
  const x = anchor === 'start' ? s.x - 4 : anchor === 'end' ? s.x + 4 : s.x;
  const top = s.y + 24 + (drop ? 26 : 0);
  return (
    <>
      {s.lines.map((line, i) => (
        <text
          key={i}
          className="mt-station__name"
          x={x}
          y={top + i * 13}
          textAnchor={anchor}
          fill={color}
        >
          {line}
        </text>
      ))}
    </>
  );
}

/** 站点之间的驾车信息，贴在线上方 */
function LegLabel({ from, to }: { from: Station; to: Station }) {
  if (!to.leg) {
    return null;
  }
  const mid = (from.x + to.x) / 2;
  return (
    <text
      className="mt-leg"
      x={mid}
      y={to.y - 13}
      textAnchor="middle"
    >
      {to.leg}
    </text>
  );
}

function Row({ row, active, onPick, onSelectDay }: { row: DayRow; active: boolean; onPick: (s: Station) => void; onSelectDay: (no: number) => void }) {
  return (
    <g
      className="mt-row"
      data-active={active}
    >
      <rect
        className="mt-row__band"
        x={0}
        y={row.y - 74}
        width={VIEW_W}
        height={150}
        fill={row.color}
      />
      <path
        className="mt-line"
        d={row.path}
        stroke={row.color}
      />
      <g
        className="mt-row__head"
        onClick={() => onSelectDay(row.no)}
      >
        <text
          className="mt-row__kicker"
          x={16}
          y={row.y - 60}
          fill={row.color}
        >
          {`LINE ${row.no} · ${row.date} ${row.weekday}`}
        </text>
        <text
          className="mt-row__route"
          x={16}
          y={row.y - 42}
        >
          {row.route}
        </text>
        <text
          className="mt-row__km"
          x={16}
          y={row.y - 26}
        >
          {DAY_KM(row)}
          {row.stay ? ` · 夜宿${row.stay}` : ''}
        </text>
      </g>
      {row.stations.map((s, i) => (
        <g key={s.id}>
          {i > 0 && (
            <LegLabel
              from={row.stations[i - 1]}
              to={s}
            />
          )}
          <g
            className="mt-station"
            onClick={() => onPick(s)}
          >
            <StationDot
              s={s}
              color={row.color}
            />
            <StationLabel
              s={s}
              color={row.color}
              drop={row.stations.length >= 3 && i % 2 === 1}
            />
          </g>
        </g>
      ))}
      <text
        className="mt-row__dir"
        x={row.dir === 1 ? VIEW_W - 14 : 14}
        y={row.y - 26}
        textAnchor={row.dir === 1 ? 'end' : 'start'}
      >
        {row.dir === 1 ? '→' : '←'}
      </text>
    </g>
  );
}

export function MetroDiagram({ model, active, onPick, onSelectDay }: DiagramProps) {
  return (
    <svg
      className="mt-diagram"
      viewBox={`0 0 ${VIEW_W} ${model.height}`}
      role="img"
      aria-label="行程线路图"
    >
      {model.rows.map(row => (
        <Row
          key={row.no}
          row={row}
          active={row.no === active}
          onPick={onPick}
          onSelectDay={onSelectDay}
        />
      ))}
    </svg>
  );
}
