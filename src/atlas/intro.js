import * as THREE from 'three';

/*
 * 开场全景：镜头从高空远处绕星球大半圈，一边下降一边拉近，最后落在全景机位。
 * 只在打开页面时播放一次；拖动、缩放或切换视角会立即接管镜头。
 */
export const INTRO = {
  duration: 4200,
  /** 绕行角度（弧度），约 245° */
  sweep: Math.PI * 1.36,
  /** 起始距离是终点距离的倍数 */
  zoom: 2.2,
  /** 起始俯角（与正上方的夹角），越小越接近俯视 */
  phi: 0.3,
};

const smoother = t => t * t * t * (t * (6 * t - 15) + 10);
const easeOut = t => 1 - (1 - t) ** 3;
const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();

/** 开始开场动画。拉远时临时解除最大距离，结束后由 endIntro 恢复。 */
export function startIntro(container, controls, position, target) {
  container.classList.add('is-intro');
  const flight = { intro: true, start: performance.now(), duration: INTRO.duration, position, target, maxDistance: controls.maxDistance };
  controls.maxDistance = Infinity;
  return flight;
}

/** 窗口尺寸或视角在开场期间变化时，只更新终点，不重新开始。 */
export function retargetIntro(flight, controls, position, target) {
  flight.position = position;
  flight.target = target;
  flight.maxDistance = controls.maxDistance === Infinity ? flight.maxDistance : controls.maxDistance;
  controls.maxDistance = Infinity;
}

export function endIntro(container, controls, flight) {
  controls.maxDistance = flight.maxDistance;
  container.classList.remove('is-intro');
}

/** 按时间放置镜头；返回 true 表示开场结束。 */
export function introFrame(camera, controls, flight, now) {
  const t = Math.min(1, Math.max(0, (now - flight.start) / flight.duration));
  spherical.setFromVector3(offset.copy(flight.position).sub(flight.target));
  const approach = smoother(t);
  spherical.theta -= INTRO.sweep * (1 - approach);
  spherical.radius *= THREE.MathUtils.lerp(INTRO.zoom, 1, approach);
  spherical.phi = THREE.MathUtils.lerp(Math.min(INTRO.phi, spherical.phi), spherical.phi, easeOut(t));
  camera.position.setFromSpherical(spherical).add(flight.target);
  controls.target.copy(flight.target);
  return t === 1;
}
