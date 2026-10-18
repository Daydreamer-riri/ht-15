/*
 * 星球门牌的稳定布局。
 *
 * 旧做法每帧从零排一遍：镜头因阻尼哪怕只动一点，最优位置就可能换一格，门牌整格跳；
 * 北疆则在重叠时直接显隐，两个门牌轮流闪。这里改为：
 * - 优先级固定（选中的最先排，其余按原顺序），悬停不改变顺序；
 * - 门牌优先留在上一帧的位置，只有真的撞上才换位；
 * - 屏幕位置平滑追随锚点，不瞬移；
 * - 显隐带滞后：持续遮挡一段时间才隐藏，分开一段时间才重新出现，并用透明度过渡；
 * - 尺寸只在内容变化时测量一次，坐标取整像素。
 */
const GAP = 6;
const PAD = 8;
const HIDE_AFTER = 260;
const SHOW_AFTER = 160;

const overlaps = (a, b) => a.x < b.x + b.width + GAP && a.x + a.width + GAP > b.x && a.y < b.y + b.height + GAP && a.y + a.height + GAP > b.y;

export class LabelLayout {
  constructor({ follow = 18, offsets = defaultOffsets } = {}) {
    this.state = new Map();
    this.follow = follow;
    this.offsets = offsets;
    this.last = performance.now();
  }

  /** 内容或字号变化后调用，下一帧重新测量尺寸 */
  invalidate() { for (const s of this.state.values()) s.size = null; }

  /**
   * items: [{ key, el, anchor: {x, y} | null, priority }]，anchor 为门牌底边中点的屏幕坐标；null 表示不可见。
   * viewport: { width, height, top?, bottom? }
   */
  update(items, viewport, now = performance.now()) {
    const dt = Math.min(.1, (now - this.last) / 1000);
    this.last = now;
    const k = 1 - Math.exp(-this.follow * dt);
    const placed = [];
    const ordered = [...items].sort((a, b) => a.priority - b.priority);
    for (const item of ordered) {
      let s = this.state.get(item.key);
      if (!s) { s = { size: null, slot: 0, pos: null, shown: false, since: now, blockedSince: 0, freeSince: 0 }; this.state.set(item.key, s); }
      if (!s.size) s.size = { width: item.el.offsetWidth, height: item.el.offsetHeight };
      if (!item.anchor) { this.hide(item.el, s, now, true); continue; }

      // 先试上一帧用过的位置，再按顺序试其余候选
      const tries = [s.slot, ...this.offsets.keys()].filter((v, i, a) => a.indexOf(v) === i);
      let box = null;
      for (const slot of tries) {
        const candidate = this.box(item.anchor, s.size, this.offsets[slot], viewport);
        if (!placed.some(p => overlaps(candidate, p))) { box = candidate; s.slot = slot; break; }
      }

      if (box) {
        s.blockedSince = 0;
        s.freeSince ||= now;
        if (!s.shown && now - s.freeSince < SHOW_AFTER && s.pos) { this.hide(item.el, s, now); continue; }
        // 首次出现直接到位，之后平滑追随
        s.pos = s.pos && s.shown ? { x: s.pos.x + (box.x - s.pos.x) * k, y: s.pos.y + (box.y - s.pos.y) * k } : { x: box.x, y: box.y };
        placed.push({ ...box, x: s.pos.x, y: s.pos.y });
        this.show(item.el, s);
      } else {
        s.freeSince = 0;
        s.blockedSince ||= now;
        // 暂时被挡：短时间内留在原位，避免两个门牌轮流闪
        if (s.shown && now - s.blockedSince < HIDE_AFTER && s.pos) {
          placed.push({ x: s.pos.x, y: s.pos.y, ...s.size });
          this.place(item.el, s.pos);
          continue;
        }
        this.hide(item.el, s, now);
      }
    }
  }

  box(anchor, size, [dx, dy], viewport) {
    const top = viewport.top ?? PAD, bottom = viewport.bottom ?? PAD;
    const x = anchor.x - size.width / 2 + dx * (size.width / 2 + GAP);
    const y = anchor.y - size.height + dy * (size.height + GAP);
    return {
      x: Math.max(PAD, Math.min(viewport.width - size.width - PAD, x)),
      y: Math.max(top, Math.min(viewport.height - size.height - bottom, y)),
      ...size,
    };
  }

  place(el, pos) { el.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0)`; }

  show(el, s) {
    this.place(el, s.pos);
    if (!s.shown) { s.shown = true; el.classList.remove('is-hidden'); el.removeAttribute('tabindex'); el.removeAttribute('aria-hidden'); }
  }

  hide(el, s, now, offscreen = false) {
    if (s.shown || offscreen) {
      s.shown = false;
      el.classList.add('is-hidden');
      el.setAttribute('tabindex', '-1');
      el.setAttribute('aria-hidden', 'true');
    }
    if (offscreen) s.pos = null;
  }
}

/** 候选位置：正上方，然后左右、上下错开。单位是半个宽度和一个高度。 */
export const defaultOffsets = [[0, 0], [1.05, 0], [-1.05, 0], [0, -1], [1.05, -1], [-1.05, -1], [0, 1], [2.1, 0], [-2.1, 0], [0, -2]];
