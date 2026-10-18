// All positions are WGS84 [latitude, longitude]. Heights are artistic, not DEM data.
export const MAP = { latitude: 45.9, longitude: 85.3, scale: 23, radius: 108 };
export const project = ([lat, lng]) => ({ x: (lng - MAP.longitude) * MAP.scale * Math.cos(MAP.latitude * Math.PI / 180), z: (MAP.latitude - lat) * MAP.scale });
export const unproject = ({ x, z }) => [MAP.latitude - z / MAP.scale, MAP.longitude + x / (MAP.scale * Math.cos(MAP.latitude * Math.PI / 180))];

export function validPosition(position) {
  return Array.isArray(position) && position.length === 2 && position.every(Number.isFinite) && Math.abs(position[0]) <= 90 && Math.abs(position[1]) <= 180;
}

export function buildRouteModel(itinerary) {
  const stops = [];
  const legs = [];
  const seen = new Map();
  for (const day of itinerary.days) {
    for (const item of day.items) {
      if (item.kind !== 'transport' && validPosition(item.position)) {
        const key = `${item.name}:${item.position.map(n => n.toFixed(4)).join(',')}`;
        let stop = seen.get(key);
        if (!stop) {
          stop = { ...item, days: [], day: day.index, point: project(item.position) };
          seen.set(key, stop);
          stops.push(stop);
        }
        stop.days.push(day.index);
      }
      if (item.leg?.points.length > 1) {
        legs.push({ ...item.leg, id: `${day.index}:${item.id}`, day: day.index, destination: item.name || item.leg.target || item.from.name, stopId: item.id });
      }
    }
    if (day.returnLeg?.points.length > 1) legs.push({ ...day.returnLeg, id: `${day.index}:return`, day: day.index, destination: day.returnLeg.target });
  }
  // The Shanghai flight is deliberately outside the regional driving scene.
  const airport = itinerary.days[0].items.find(item => item.kind === 'transport')?.to;
  return { name: itinerary.name, days: itinerary.days, stops, legs, airport,
    distance: Math.round(legs.reduce((sum, leg) => sum + (parseFloat(leg.distance) || 0), 0)),
    pointCount: legs.reduce((sum, leg) => sum + leg.points.length, 0),
  };
}

export function haversine(a, b) {
  const rad = Math.PI / 180;
  const h = Math.sin((b[0] - a[0]) * rad / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin((b[1] - a[1]) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// A sampled route never invents a line between separate road legs.
export function createJourney(legs) {
  let total = 0;
  const segments = [];
  for (const leg of legs) {
    for (let i = 1; i < leg.points.length; i++) {
      const a = leg.points[i - 1], b = leg.points[i];
      const length = haversine(a, b);
      if (length < 1e-7) continue;
      segments.push({ a, b, leg, start: total, end: total + length });
      total += length;
    }
  }
  return { total, segments };
}

export function sampleJourney(journey, progress) {
  if (!journey.segments.length) return null;
  const distance = Math.max(0, Math.min(1, progress)) * journey.total;
  let lo = 0, hi = journey.segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (journey.segments[mid].end < distance) lo = mid + 1; else hi = mid;
  }
  const segment = journey.segments[lo];
  const t = Math.max(0, Math.min(1, (distance - segment.start) / (segment.end - segment.start)));
  return { position: segment.a.map((v, i) => v + (segment.b[i] - v) * t), leg: segment.leg, distance };
}

export function stopsForDay(model, day) { return model.stops.filter(stop => day === 0 || stop.days.includes(day)); }
export function legsForDay(model, day) { return model.legs.filter(leg => day === 0 || leg.day === day); }
