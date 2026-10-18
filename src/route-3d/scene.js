import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLandscape, heightAt, lakes, lakeRadius } from './landscape.js';
import { MAP, project } from './model.js';
import { endIntro, introFrame, retargetIntro, startIntro } from '../atlas/intro.js';
import { LabelLayout } from '../atlas/labels.js';

export class RouteScene {
  constructor(container, model, { onSelect, onInteract }) {
    this.container = container;
    this.model = model;
    this.onSelect = onSelect;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2('#0b1f27', .0019);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.domElement.setAttribute('aria-label', '北疆三维路线。拖动旋转，滚轮缩放；也可使用景点列表和视角按钮。');
    this.renderer.domElement.tabIndex = 0;
    container.append(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(42, 1, .2, 1400);
    this.camera.position.set(60, 320, 430);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .07;
    this.controls.minDistance = 125;
    this.controls.maxDistance = 1400;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * .47;
    this.controls.minPolarAngle = .06;
    this.controls.target.set(0, 3, 0);
    this.controls.addEventListener('start', () => { this.cancelFlight(); onInteract(); });
    // 打开页面时先播一次开场全景，之后的视角切换走普通过渡
    this.introPending = !this.reducedMotion;
    this.camera.lookAt(this.controls.target);
    this.scene.add(new THREE.HemisphereLight('#d7e7de', '#25382e', 1.85));
    this.sun = new THREE.DirectionalLight('#ffe3b2', 2.3);
    this.sun.position.set(-70, 120, 65);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -125, right: 125, top: 125, bottom: -125, near: 1, far: 360 });
    this.sun.shadow.bias = -.0007;
    this.sun.shadow.normalBias = .5;
    this.scene.add(this.sun);
    const rim = new THREE.DirectionalLight('#9fdfe1', .95);
    rim.position.set(80, 40, -90); this.scene.add(rim);
    this.landscape = createLandscape(this.scene);
    this.addAtmosphere();
    this.routes = model.legs.map(leg => this.addRoad(leg));
    this.markers = [];
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'map-labels'; container.append(this.labelLayer);
    for (const stop of model.stops) if (stop.kind !== 'hotel') this.addMarker(stop);
    if (model.airport) this.addMarker({ id: 'airport', name: '吐鲁番 · 交河机场', position: model.airport.position, days: [1, 7], kind: 'airport' });
    this.beacon = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 48), new THREE.MeshBasicMaterial({ color: '#e9b44c', side: THREE.DoubleSide, transparent: true, opacity: .8, depthTest: false }));
    this.beacon.rotation.x = -Math.PI / 2; this.beacon.visible = false; this.scene.add(this.beacon);
    this.day = 0;
    this.labels = new LabelLayout({ offsets: [[0, 0], [1.05, 0], [-1.05, 0], [0, -1]] });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.time = 0;
    this.renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.onContextLost?.();
    });
  }

  addAtmosphere() {
    const orbitMaterial = new THREE.LineBasicMaterial({ color: '#5f8b85', transparent: true, opacity: .14 });
    for (const radius of [132]) {
      const points = Array.from({ length: 241 }, (_, i) => new THREE.Vector3(Math.cos(i / 240 * Math.PI * 2) * radius, -37.8, Math.sin(i / 240 * Math.PI * 2) * radius));
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), orbitMaterial));
    }
    // Sparse drifting particles create depth without obscuring the landmarks.
    const positions = [];
    for (let i = 0; i < 160; i++) {
      const n = Math.sin(i * 127.1) * 43758.5453; const t = n - Math.floor(n);
      positions.push(Math.sin(i * 2.4) * (110 + t * 80), 7 + t * 70, Math.cos(i * 1.9) * 150);
    }
    this.dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)), new THREE.PointsMaterial({ color: '#e3d3a4', size: .24, transparent: true, opacity: .48, depthWrite: false }));
    this.scene.add(this.dust);
  }

  surface(position, lift = 1) {
    const { x, z } = project(position);
    let y = heightAt(x, z);
    for (const lake of lakes) if (lakeRadius(x, z, lake) < 1) y = Math.max(y, lake.level);
    return new THREE.Vector3(x, y + lift, z);
  }

  addRoad(leg) {
    const points = [];
    for (let i = 0; i < leg.points.length - 1; i++) {
      const a = project(leg.points[i]), b = project(leg.points[i + 1]);
      const count = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / .55));
      for (let j = 0; j < count; j++) {
        const t = j / count;
        points.push(this.surface(leg.points[i].map((v, k) => v + (leg.points[i + 1][k] - v) * t), .65));
      }
    }
    points.push(this.surface(leg.points.at(-1), .65));
    const path = new THREE.CurvePath();
    for (let i = 1; i < points.length; i++) if (points[i].distanceToSquared(points[i - 1]) > .000001) path.add(new THREE.LineCurve3(points[i - 1], points[i]));
    const geo = new THREE.TubeGeometry(path, Math.max(8, points.length), .25, 5, false);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#f2c566', emissive: '#e9b44c', emissiveIntensity: .55, roughness: .5, transparent: true }));
    // 切换日期时按路线方向“画”出来：用 drawRange 逐步放出三角形
    mesh.userData.indexCount = geo.index.count;
    this.scene.add(mesh);
    return { leg, mesh };
  }

  addMarker(stop) {
    const position = this.surface(stop.position, .8);
    const group = new THREE.Group(); group.position.copy(position);
    const isAirport = stop.kind === 'airport';
    const color = isAirport ? '#9fb4af' : '#e8eee6';
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.78, .12, 6, 32), new THREE.MeshBasicMaterial({ color }));
    ring.rotation.x = Math.PI / 2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 4, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8 }));
    stem.position.y = 2;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 12), new THREE.MeshBasicMaterial({ color })); dot.position.y = 4;
    group.add(ring, stem, dot); this.scene.add(group);
    const label = document.createElement('button'); label.type = 'button'; label.className = 'map-label';
    label.textContent = stop.name.replace('(黄金海岸景区)', ''); label.setAttribute('aria-label', `查看${stop.name}`);
    if (isAirport) label.classList.add('airport-label');
    label.addEventListener('click', () => this.onSelect(stop)); this.labelLayer.append(label);
    const marker = { stop, group, label, dot, position }; this.markers.push(marker);
    return marker;
  }

  setDay(day) {
    const changed = this.day !== day;
    this.day = day;
    for (const { leg, mesh } of this.routes) {
      const active = day === 0 || leg.day === day;
      mesh.material.opacity = active ? 1 : .14;
      mesh.material.emissiveIntensity = active ? .55 : 0;
      mesh.material.color.set(active ? '#f2c566' : '#6f8580');
      mesh.geometry.setDrawRange(0, Infinity);
    }
    // 只给选中的那一天播放描线；全程视图和减少动效时直接显示
    this.drawing = changed && day && !this.reducedMotion ? { start: performance.now(), duration: 900 } : null;
  }

  /** 镜头飞到某个地点上方，保持当前方位，略微拉近 */
  focus(stop) {
    if (!stop || this.flight?.intro) return;
    const target = this.surface(stop.position, 0);
    const offset = this.camera.position.clone().sub(this.controls.target);
    const length = THREE.MathUtils.clamp(offset.length() * .8, 170, 260);
    offset.setLength(length);
    if (offset.y < length * .55) { offset.y = length * .55; offset.setLength(length); }
    this.flyTo(target.clone().add(offset), target, 1100);
  }

  select(stop) {
    this.selectedId = stop?.id;
    for (const marker of this.markers) { marker.label.classList.toggle('selected', marker.stop.id === stop?.id); marker.label.setAttribute('aria-pressed', String(marker.stop.id === stop?.id)); }
    this.beacon.visible = !!stop;
    if (stop) {
      const point = this.surface(stop.position, 1);
      this.beacon.position.copy(point);
    }
  }

  cancelFlight() {
    if (this.flight?.intro) endIntro(this.container, this.controls, this.flight);
    this.flight = null;
  }

  /** 视角切换的统一入口：首次调用播放开场，开场期间只更新落点 */
  travel(position, target, duration) {
    if (this.introPending) { this.introPending = false; this.flight = startIntro(this.container, this.controls, position, target); return; }
    if (this.flight?.intro) { retargetIntro(this.flight, this.controls, position, target); return; }
    this.flyTo(position, target, duration);
  }

  flyTo(position, target, duration = 1900) {
    this.cancelFlight();
    if (this.reducedMotion) duration = 0;
    this.flight = { fromPosition: this.camera.position.clone(), fromTarget: this.controls.target.clone(), position, target, start: performance.now(), duration };
  }

  overview(mode = 'planet') {
    this.view = mode;
    if (this.day) {
      const points = this.model.legs.filter(l => l.day === this.day).flatMap(l => l.points.map(p => this.surface(p)));
      const box = new THREE.Box3().setFromPoints(points);
      const target = box.getCenter(new THREE.Vector3());
      const size = Math.max(box.getSize(new THREE.Vector3()).length() * .65, 28);
      this.travel(target.clone().add(mode === 'top' ? new THREE.Vector3(0, size * 1.8, .1) : new THREE.Vector3(size * .65, size * 1.15, size * 1.3)), target);
      return;
    }
    const halfFov = this.camera.fov * Math.PI / 360;
    const limitingFov = Math.min(halfFov, Math.atan(Math.tan(halfFov) * this.camera.aspect));
    const fitDistance = MAP.radius / Math.sin(limitingFov) * 1.04;
    const offset = mode === 'top' ? new THREE.Vector3(0, 1, .0001) : new THREE.Vector3(122, 162, 195);
    offset.setLength(fitDistance);
    const target = new THREE.Vector3(0, mode === 'top' ? 0 : -23, 0);
    this.travel(offset.add(target), target, 1200);
  }

  orbitPOI(dt) {
    if (this.reducedMotion) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * .08);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  setLight(sunset) {
    this.sun.color.set(sunset ? '#ffb17a' : '#ffe3b2');
    this.sun.intensity = sunset ? 2.8 : 2.3;
    this.sun.position.set(-90, sunset ? 45 : 120, 65);
    this.scene.fog.color.set(sunset ? '#241e22' : '#0b1f27');
  }

  resize() {
    const width = this.container.clientWidth, height = this.container.clientHeight;
    this.labels?.invalidate();
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.view) this.overview(this.view);
  }

  render(dt) {
    this.time += dt;
    if (this.flight?.intro) {
      if (introFrame(this.camera, this.controls, this.flight, performance.now())) this.cancelFlight();
    } else if (this.flight) {
      const f = this.flight;
      const t = f.duration ? Math.min(1, (performance.now() - f.start) / f.duration) : 1;
      const e = t * t * t * (t * (6 * t - 15) + 10);
      this.camera.position.lerpVectors(f.fromPosition, f.position, e);
      this.controls.target.lerpVectors(f.fromTarget, f.target, e);
      if (t === 1) this.flight = null;
    }
    if (this.drawing) {
      const t = Math.min(1, (performance.now() - this.drawing.start) / this.drawing.duration);
      const e = 1 - (1 - t) ** 3;
      for (const { leg, mesh } of this.routes) if (leg.day === this.day) mesh.geometry.setDrawRange(0, Math.ceil(mesh.userData.indexCount * e / 3) * 3);
      if (t === 1) this.drawing = null;
    }
    this.controls.update();
    this.beacon.scale.setScalar(1 + (this.reducedMotion ? 0 : Math.sin(this.time * 2) * .15));
    if (!this.reducedMotion) this.dust.rotation.y = this.time * .006;
    this.camera.updateMatrixWorld();
    const width = this.container.clientWidth, height = this.container.clientHeight;
    const lift = new THREE.Vector3(0, 5, 0);
    this.labels.update(this.markers.map((marker, i) => {
      const active = this.day === 0 || marker.stop.days.includes(this.day) || marker.stop.kind === 'custom-marker';
      marker.group.visible = active;
      const v = marker.position.clone().add(lift).project(this.camera);
      const onScreen = active && v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
      return { key: marker.stop.id, el: marker.label, priority: i, anchor: onScreen ? { x: (v.x + 1) / 2 * width, y: (1 - v.y) / 2 * height } : null };
    }), { width, height, top: 40 });
    this.renderer.domElement.dataset.view = this.view || 'planet';
    this.renderer.domElement.dataset.poi = this.selectedId || '';
    this.renderer.render(this.scene, this.camera);
  }

  zoom(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance));
    this.flyTo(this.controls.target.clone().add(offset), this.controls.target.clone(), 350);
  }

  screenshot() { return this.renderer.domElement.toDataURL('image/png'); }
}
