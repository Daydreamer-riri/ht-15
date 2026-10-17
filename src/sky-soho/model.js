import { haversine, validPosition } from '../route-3d/model.js';

export const CAMPUS_ORIGIN = [31.22354, 121.34640];
export function project(position, origin = CAMPUS_ORIGIN) {
  return { x: (position[1] - origin[1]) * Math.cos(origin[0] * Math.PI / 180) * 111195,
    z: (origin[0] - position[0]) * 111195 };
}
export function distanceMeters(label) {
  const amount = parseFloat(label);
  return Number.isFinite(amount) ? amount * (/公里|km/i.test(label) ? 1000 : 1) : 0;
}
export function makePath(points) {
  let total = 0;
  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 1e-6) continue;
    segments.push({ a, b, start: total, length }); total += length;
  }
  return { points, segments, total };
}
export function samplePath(path, distance) {
  const d = Math.max(0, Math.min(path.total, distance));
  if (d === 0) return { ...path.points[0] };
  if (d === path.total) return { ...path.points.at(-1) };
  const segment = path.segments.find(s => d <= s.start + s.length);
  const t = (d - segment.start) / segment.length;
  return { x: segment.a.x + (segment.b.x - segment.a.x) * t, z: segment.a.z + (segment.b.z - segment.a.z) * t };
}
export function distanceToPath(path, x, z) {
  return Math.min(...path.segments.map(({ a, b, length }) => {
    const t = Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / length ** 2));
    return Math.hypot(x - a.x - (b.x - a.x) * t, z - a.z - (b.z - a.z) * t);
  }));
}
export function buildDayTrip(data) {
  const day = data.days[0];
  const stops = day.items.map((item, index) => {
    if (!validPosition(item.position) || !item.leg.points.every(validPosition)) throw new Error('Invalid itinerary coordinate');
    return { ...item, index, point: project(item.position), room: index > 0 ? item.id.replace('sky-soho-', '') : null };
  });
  const returnStop = { id: 'sky-soho-return', name: day.returnLeg.target, index: 5, position: day.returnLeg.points.at(-1),
    point: project(day.returnLeg.points.at(-1)), leg: day.returnLeg, room: null, remark: '沿金钟路返回淞虹路地铁站，结束这一天。', playTime: '返程', openStatus: '行程最后一段' };
  const chapters = [...stops, returnStop].map(stop => ({ stop, points: stop.leg.points, path: makePath(stop.leg.points.map(p => project(p))),
    roomPath: makePath(stop.leg.points.map(p => project(p, stop.position))) }));
  return { data, day, stops, chapters, returnStop,
    distance: chapters.reduce((sum, chapter) => sum + distanceMeters(chapter.stop.leg.distance), 0),
    minutes: chapters.reduce((sum, chapter) => sum + parseFloat(chapter.stop.leg.duration), 0),
    pointCount: chapters.reduce((sum, chapter) => sum + chapter.points.length, 0),
    measuredDistance: chapters.reduce((sum, chapter) => sum + chapter.points.slice(1).reduce((d, p, i) => d + haversine(chapter.points[i], p) * 1000, 0), 0),
  };
}
export function resolveSelection(model, id) { return model.chapters.find(c => c.stop.id === id) || model.chapters[0]; }
export function pageUrl(href, id, view) {
  const url = new URL(href); url.searchParams.set('poi', id); url.searchParams.set('view', view === 'top' || view === 'overview' ? 'top' : 'planet');
  return url;
}

// The immersive room is an excerpt of the source connection, never a made-up corridor.
export function tailPath(path, meters = 24) {
  const start = Math.max(0, path.total - meters);
  return makePath([samplePath(path, start), ...path.segments.filter(segment => segment.start + segment.length > start).map(segment => segment.b)]);
}

export const CAMPUS_DISPLAY = { x: 10, z: -65, radius: 350 };
// Clip each segment independently; never join paths through the exterior of the display.
export function clipPathToCampus(path, circle = CAMPUS_DISPLAY) {
  const result = []; let active = null;
  for (const {a,b} of path.segments) {
    const dx=b.x-a.x,dz=b.z-a.z,ox=a.x-circle.x,oz=a.z-circle.z;
    const aa=dx*dx+dz*dz,bb=2*(ox*dx+oz*dz),cc=ox*ox+oz*oz-circle.radius**2;
    const disc=bb*bb-4*aa*cc;
    if(disc<0){active=null;continue;}
    const lo=Math.max(0,(-bb-Math.sqrt(disc))/(2*aa)),hi=Math.min(1,(-bb+Math.sqrt(disc))/(2*aa));
    if(hi<=lo){active=null;continue;}
    const start={x:a.x+dx*lo,z:a.z+dz*lo},end={x:a.x+dx*hi,z:a.z+dz*hi};
    if(!active||Math.hypot(active.at(-1).x-start.x,active.at(-1).z-start.z)>1e-5){active=[start];result.push(active);}
    active.push(end);
    if(hi<1)active=null;
  }
  return result.map(makePath);
}
