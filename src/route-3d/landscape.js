import * as THREE from 'three';
import { MAP, project } from './model.js';

const smooth = (a, b, n) => { const t = THREE.MathUtils.clamp((n - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const noise = (x, z) => Math.sin(x * .093 + Math.sin(z * .08) * 2) * Math.cos(z * .107 + x * .017) * .5 + Math.sin(x * .27 + z * .23) * .22 + Math.sin(x * .62 - z * .41) * .08;
export const lakes = [
  { ...project([44.60759, 81.11595]), rx: 12, rz: 9, level: 5.5, name: '赛里木湖' },
  { ...project([47.24316, 87.4078]), rx: 8.7, rz: 5.5, level: 7.5, name: '乌伦古湖' },
  { ...project([48.58125, 86.97885]), rx: 3.8, rz: 10.2, level: 9, name: '喀纳斯' },
];
lakes[2].z -= 7;
export function lakeRadius(x, z, lake) {
  const angle = Math.atan2((z - lake.z) / lake.rz, (x - lake.x) / lake.rx);
  return Math.hypot((x - lake.x) / lake.rx, (z - lake.z) / lake.rz) / (1 + .07 * Math.sin(angle * 5) + .035 * Math.sin(angle * 9));
}
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const dome = 5.5 * Math.max(0, 1 - (r / MAP.radius) ** 2);
  const northRidge = Math.exp(-(((z + 72 + Math.sin(x * .045) * 11) / 15) ** 2));
  const southRidge = Math.exp(-(((z - 41 + Math.sin(x * .042) * 12) / 12) ** 2));
  let height = 2.4 + dome + 2.2 * noise(x, z) + northRidge * (15 + 12 * noise(x * .75, z * .9)) + southRidge * (14 + 13 * noise(x * .8 + 25, z));
  for (const lake of lakes) {
    const radius = lakeRadius(x, z, lake);
    if (radius < 1.42) height = THREE.MathUtils.lerp(lake.level - 1.3, height, smooth(.85, 1.42, radius));
  }
  return height;
}
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const random = seeded(71210);
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .95, flatShading: true, ...extra });

export function createLandscape(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const rings = 90, sectors = 240;
  const positions = [], colors = [], indices = [];
  const color = new THREE.Color();
  for (let ring = 0; ring <= rings; ring++) {
    for (let sector = 0; sector <= sectors; sector++) {
      const angle = sector / sectors * Math.PI * 2;
      const r = ring / rings * MAP.radius;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      const y = heightAt(x, z);
      positions.push(x, y, z);
      const sand = smooth(-10, 48, x) * smooth(-34, 25, z);
      color.set('#3e694e').lerp(new THREE.Color('#a48856'), sand * .9);
      color.lerp(new THREE.Color('#6d8a5d'), .23 + noise(x * 2, z * 2) * .25);
      if (y > 15) color.lerp(new THREE.Color('#7d8c85'), smooth(15, 24, y));
      if (y > 22) color.lerp(new THREE.Color('#e6ede4'), smooth(22, 29, y));
      for (const lake of lakes) if (lakeRadius(x, z, lake) < 1.12) color.lerp(new THREE.Color('#c8c7a0'), .55);
      colors.push(color.r, color.g, color.b);
      if (ring < rings && sector < sectors) {
        const a = ring * (sectors + 1) + sector, b = a + sectors + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, material('white', { vertexColors: true }));
  terrain.receiveShadow = true;
  root.add(terrain);

  // Rounded, layered cutaway makes the entire itinerary feel like a little world.
  const sidePositions = [], sideColors = [], sideIndices = [];
  for (let layer = 0; layer < 7; layer++) {
    for (let i = 0; i <= sectors; i++) {
      const angle = i / sectors * Math.PI * 2;
      const r = MAP.radius * [1, .995, .96, .86, .66, .35, 0][layer];
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      const y = layer === 0 ? heightAt(x, z) : [-1, -12, -34, -64, -88, -108, -116][layer] + Math.sin(angle * 13) * .5;
      sidePositions.push(x, y, z);
      color.set(['#61715b', '#4d7263', '#537969', '#3f695f', '#38605d', '#325359', '#284953'][layer]);
      sideColors.push(color.r, color.g, color.b);
      if (layer < 6 && i < sectors) {
        const a = layer * (sectors + 1) + i, b = a + sectors + 1;
        sideIndices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const sideGeometry = new THREE.BufferGeometry();
  sideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sidePositions, 3));
  sideGeometry.setAttribute('color', new THREE.Float32BufferAttribute(sideColors, 3));
  sideGeometry.setIndex(sideIndices); sideGeometry.computeVertexNormals();
  root.add(new THREE.Mesh(sideGeometry, material('white', { vertexColors: true, side: THREE.DoubleSide })));

  const water = [];
  for (const lake of lakes) {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 96; i++) {
      const a = i / 96 * Math.PI * 2;
      const r = 1 + .07 * Math.sin(a * 5) + .035 * Math.sin(a * 9);
      const x = Math.cos(a) * lake.rx * r, y = Math.sin(a) * lake.rz * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), new THREE.MeshPhysicalMaterial({ color: '#319b9e', roughness: .27, metalness: .25, clearcoat: 1, transparent: true, opacity: .94, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(lake.x, lake.level, lake.z);
    root.add(mesh); water.push(mesh);
    const shoreline = [];
    for (let i = 0; i <= 96; i++) {
      const a = i / 96 * Math.PI * 2;
      const r = 1 + .07 * Math.sin(a * 5) + .035 * Math.sin(a * 9);
      shoreline.push(new THREE.Vector3(lake.x + Math.cos(a) * lake.rx * r, lake.level + .06, lake.z + Math.sin(a) * lake.rz * r));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(shoreline), new THREE.LineBasicMaterial({ color: '#b0e0cf', transparent: true, opacity: .65 })));
    // Small glints stay on the lake rather than using any remote textures.
    const glintPositions = [];
    for (let i = 0; i < 55; i++) {
      const x = lake.x + (random() * 2 - 1) * lake.rx * .9;
      const z = lake.z + (random() * 2 - 1) * lake.rz * .9;
      if (lakeRadius(x, z, lake) > .88) continue;
      glintPositions.push(x - .2, lake.level + .08, z, x + .2 + random() * .5, lake.level + .08, z);
    }
    root.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(glintPositions, 3)), new THREE.LineBasicMaterial({ color: '#d7f3db', transparent: true, opacity: .45 })));
  }

  const treeLocations = [];
  for (let i = 0; i < 4800; i++) {
    const x = (random() * 2 - 1) * 103, z = (random() * 2 - 1) * 103;
    if (Math.hypot(x, z) > 103 || lakes.some(lake => lakeRadius(x, z, lake) < 1.3)) continue;
    const y = heightAt(x, z);
    const density = z < -35 ? .92 : x < -30 ? .46 : .12;
    if (random() > density || y > 24 || (x > 10 && z > 5)) continue;
    treeLocations.push({ x, y, z, s: .42 + random() * .8 });
  }
  const dummy = new THREE.Object3D();
  const foliage = new THREE.InstancedMesh(new THREE.ConeGeometry(.9, 2.8, 5), material('#638a6c'), treeLocations.length * 2);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .19, 1.8, 4), material('#645443'), treeLocations.length);
  treeLocations.forEach(({ x, y, z, s }, index) => {
    dummy.position.set(x, y + 1.5 * s, z); dummy.scale.setScalar(s); dummy.rotation.set(0, random() * 6, 0); dummy.updateMatrix();
    foliage.setMatrixAt(index * 2, dummy.matrix);
    color.setHSL(.34 + random() * .06, .24 + random() * .17, .23 + random() * .15);
    foliage.setColorAt(index * 2, color);
    dummy.position.y += .8 * s; dummy.scale.setScalar(s * .72); dummy.updateMatrix();
    foliage.setMatrixAt(index * 2 + 1, dummy.matrix); foliage.setColorAt(index * 2 + 1, color);
    dummy.position.y = y + .6 * s; dummy.scale.setScalar(s); dummy.updateMatrix(); trunks.setMatrixAt(index, dummy.matrix);
  });
  foliage.castShadow = true; root.add(foliage, trunks);

  // Yadan silhouettes around the route's World Devil City stop.
  const devil = project([46.12537, 85.74762]);
  const rocks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.65, 1.1, 1, 6, 1), material('#bd8e5e'), 65);
  for (let i = 0; i < 65; i++) {
    const x = devil.x + (random() - .5) * 28, z = devil.z + (random() - .5) * 23;
    const h = 1.5 + random() * 4;
    dummy.position.set(x, heightAt(x, z) + h / 2, z); dummy.scale.set(.8 + random(), h, .8 + random()); dummy.rotation.set(0, random() * 6, 0); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.castShadow = true; root.add(rocks);

  // Tiny warm cabins around Baihaba; schematic landmarks, never photogrammetry.
  const village = project([48.69517, 86.78042]);
  for (let i = 0; i < 13; i++) {
    const x = village.x + (random() - .5) * 12, z = village.z + (random() - .5) * 6 + 5;
    const y = heightAt(x, z);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1, .85), material('#d3bd8c'));
    cabin.position.set(x, y + .5, z); cabin.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(.98, .6, 4), material('#674d38'));
    roof.rotation.y = Math.PI / 4; roof.position.set(x, y + 1.25, z);
    root.add(cabin, roof);
  }
  return { root, water, terrain };
}
