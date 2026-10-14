/*
  Heart and flower "magic circles" on double-click or double-tap.

  Geometry:
    heart   x = 16 sin^3 t,  y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t        (MathWorld, fifth heart curve)
    rose    r = a cos(n theta): n petals when n is odd, 2n petals when n is even (MathWorld, rose curve)

  Lifecycle: each cast spawns divs into #hc-layer (fixed, pointer-events none), animated only by CSS keyframes
  on transform and opacity, and each removes itself on `animationend` by animation NAME. Adding or renaming a
  one-shot keyframe without updating CLEANUP leaves nodes behind silently.

  Every 6th to 8th cast is the rare birthday cake (a countdown, not a dice roll, so gaps are exactly 6, 7 or 8).
*/

import type { PetalField } from './petals';

const C = 60;
const f = (n: number): string => n.toFixed(2);

/** Closed heart outline centred on (cx, cy), half-width ~r, tip pointing down, optionally rotated (degrees). */
export function heartPath(r: number, cx = C, cy = C, rot = 0): string {
  const k = r / 16;
  const a = (rot * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  let d = '';
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const px = x * k;
    const py = -(y - -2.5) * k; // -2.5 is the vertical midpoint of the curve, so the heart is centred
    const rx = px * ca - py * sa;
    const ry = px * sa + py * ca;
    d += `${i ? 'L' : 'M'}${f(cx + rx)} ${f(cy + ry)}`;
  }
  return d + 'Z';
}

/** Rose curve r = a cos(n theta) about (cx, cy). */
export function rosePath(n: number, a: number, cx = C, cy = C, rot = 0): string {
  const o = (rot * Math.PI) / 180;
  const steps = 240;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const r = a * Math.cos(n * th);
    const x = r * Math.cos(th + o);
    const y = r * Math.sin(th + o);
    d += `${i ? 'L' : 'M'}${f(cx + x)} ${f(cy + y)}`;
  }
  return d + 'Z';
}

const SW = 1.5; // stroke multiplier: thin pastel hairlines vanish on a pale page
const ring = (r: number, w = 1, dash = '', op = 1): string =>
  `<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="currentColor" stroke-width="${(w * SW).toFixed(2)}" opacity="${op}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const path = (d: string, w = 1.1, extra = ''): string =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${(w * SW).toFixed(2)}" stroke-linejoin="round" ${extra}/>`;
const fillPath = (d: string, op = 0.9): string => `<path d="${d}" fill="currentColor" opacity="${op}"/>`;
const rot = (deg: number, inner: string): string => `<g transform="rotate(${f(deg)} ${C} ${C})">${inner}</g>`;
const dots = (n: number, r: number, size: number, off = 0): string => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = ((i / n) * 360 + off) * (Math.PI / 180);
    s += `<circle cx="${f(C + r * Math.cos(a))}" cy="${f(C + r * Math.sin(a))}" r="${size}" fill="currentColor"/>`;
  }
  return s;
};
const ticks = (n: number, r1: number, r2: number): string => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    s += `M${f(C + r1 * Math.cos(a))} ${f(C + r1 * Math.sin(a))}L${f(C + r2 * Math.cos(a))} ${f(C + r2 * Math.sin(a))}`;
  }
  return path(s, 0.9);
};
/** Small solid hearts placed on a circle, tips pointing at the centre. */
const ringHearts = (n: number, r: number, size: number, off = 0): string => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360 + off;
    const rad = (a * Math.PI) / 180;
    // tip toward centre: tip is "down" in local space, so rotate by angle + 90 degrees
    s += fillPath(heartPath(size, C + r * Math.cos(rad), C + r * Math.sin(rad), a - 90), 0.85);
  }
  return s;
};

const SAKURA_PETAL = 'M60 60C46 52 44 32 55 25L60 29L65 25C76 32 74 52 60 60Z';

type Figure = () => string;

const FIGURES: Record<string, Figure> = {
  heartBloom: () =>
    ring(53, 0.8, '1.5 3.5', 0.8) +
    `<g class="hc-spin-slow">${[0, 72, 144, 216, 288].map((a) => rot(a, path(heartPath(14, C, C - 24, 0), 1.2))).join('')}</g>` +
    `<g class="hc-spin-rev">${path(heartPath(8))}${dots(5, 15, 1.3, 36)}</g>` +
    ticks(30, 49, 52),
  roseWindow: () =>
    ring(51, 0.9) +
    `<g class="hc-spin">${path(rosePath(3, 38), 1.1)}</g>` +
    `<g class="hc-spin-rev">${path(rosePath(5, 26, C, C, 18), 1)}</g>` +
    `<g class="hc-spin-slow">${ringHearts(12, 46, 3.3)}</g>` +
    fillPath(heartPath(5.2), 0.9),
  sakura: () =>
    ring(54, 0.8, '0.8 3', 0.9) +
    `<g class="hc-spin-slow">${[0, 72, 144, 216, 288].map((a) => rot(a, path(SAKURA_PETAL, 1.25))).join('')}</g>` +
    `<g class="hc-spin-rev">${[0, 72, 144, 216, 288].map((a) => rot(a + 36, path(SAKURA_PETAL, 0.8, 'transform="translate(60 60) scale(0.52) translate(-60 -60)" opacity="0.8"'))).join('')}</g>` +
    dots(8, 7, 1.4) + ring(5, 0.9),
  heartLace: () =>
    ring(55, 0.8, '4 3') +
    `<g class="hc-spin">${[0, 120, 240].map((a) => rot(a, path(heartPath(21, C, C - 11), 1.2))).join('')}</g>` +
    `<g class="hc-spin-rev">${[60, 180, 300].map((a) => rot(a, path(heartPath(10, C, C - 25), 1))).join('')}</g>` +
    dots(6, 40, 1.5, 30) + fillPath(heartPath(4.5), 0.85),
  lotus: () =>
    ring(52, 0.9) +
    `<g class="hc-spin-slow">${path(rosePath(4, 40), 1.1)}</g>` +
    `<g class="hc-spin-rev">${path(rosePath(4, 18, C, C, 22.5), 1)}</g>` +
    `<g class="hc-spin">${ringHearts(8, 47, 3.4, 22.5)}</g>` + ticks(24, 12, 15),
  orbitHearts: () =>
    ring(20, 0.8) + ring(32, 0.8, '2 3') + ring(44, 0.8) +
    `<g class="hc-spin">${ringHearts(5, 20, 3.4)}</g>` +
    `<g class="hc-spin-rev">${ringHearts(8, 32, 3.8)}</g>` +
    `<g class="hc-spin-slow">${ringHearts(11, 44, 3.2)}</g>` + fillPath(heartPath(6.5), 0.9),
};

const FIGURE_NAMES = Object.keys(FIGURES);

/** The rare cast. Fixed palette on purpose: the narrowness is what makes it read as "the one special spell". */
export function cakeSvg(): string {
  const st = '#9C3F6B';
  const scallops = (x0: number, x1: number, y: number, n: number, col: string): string => {
    const w = (x1 - x0) / n;
    let d = `M${x0} ${y}`;
    for (let i = 0; i < n; i++) d += `a${f(w / 2)} ${f(w / 2.6)} 0 0 0 ${f(w)} 0`;
    return `<path d="${d}V${y - 5}H${x0}Z" fill="${col}" stroke="${st}" stroke-width="1.1" stroke-linejoin="round"/>`;
  };
  const candle = (x: number, i: number): string =>
    `<rect x="${x - 1.6}" y="30" width="3.2" height="15" rx="1.2" fill="#FBF1E1" stroke="${st}" stroke-width="0.9"/>` +
    `<g class="hc-flame" style="animation-delay:${(i * 137) % 400}ms"><path d="M${x} 17C${x - 4.4} 22 ${x - 3} 28 ${x} 29.6C${x + 3} 28 ${x + 4.4} 22 ${x} 17Z" fill="#F7E7B0" stroke="#E9A93C" stroke-width="0.8"/></g>`;
  return `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="80" cy="141" rx="64" ry="7" fill="#F9D3E0" stroke="${st}" stroke-width="1.1"/>
    <g class="hc-tier hc-t1"><rect x="22" y="104" width="116" height="34" rx="6" fill="#CDB8EE" stroke="${st}" stroke-width="1.2"/>${scallops(22, 138, 104, 8, '#F2B5CF')}</g>
    <g class="hc-tier hc-t2"><rect x="36" y="76" width="88" height="29" rx="6" fill="#F2B5CF" stroke="${st}" stroke-width="1.2"/>${scallops(36, 124, 76, 6, '#FBF1E1')}</g>
    <g class="hc-tier hc-t3"><rect x="52" y="52" width="56" height="25" rx="6" fill="#FBF1E1" stroke="${st}" stroke-width="1.2"/>${scallops(52, 108, 52, 4, '#CDB8EE')}</g>
    <g fill="#B04F7A" opacity="0.8"><circle cx="42" cy="124" r="1.6"/><circle cx="62" cy="128" r="1.6"/><circle cx="86" cy="123" r="1.6"/><circle cx="108" cy="128" r="1.6"/><circle cx="126" cy="122" r="1.6"/><circle cx="52" cy="92" r="1.4"/><circle cx="76" cy="96" r="1.4"/><circle cx="98" cy="91" r="1.4"/><circle cx="68" cy="68" r="1.3"/><circle cx="90" cy="66" r="1.3"/></g>
    <g class="hc-candles">${[64, 72, 80, 88, 96].map((x, i) => candle(x, i)).join('')}</g>
    <path d="${heartPath(6, 80, 12)}" fill="#E0568F" opacity="0.9" class="hc-topheart"/>
  </svg>`;
}

const HUES = ['#D13F82', '#8E63D6', '#E5579A', '#C94F8D', '#2FA37F', '#D9941C'];
const CLEANUP = new Set(['hc-glyph', 'hc-ring', 'hc-flash', 'hc-mote', 'hc-cake']);
const MAX_NODES = 80;

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];

export interface HeartCircleApi {
  cast(x: number, y: number, force?: string): void;
  nodes(): number;
  countdown(): number;
  rareGaps(): number[];
  setEnabled(on: boolean): void;
}

export function initHeartCircles(opts: { layer: HTMLElement; petals: PetalField | null; reduced: boolean }): HeartCircleApi {
  const { layer, petals, reduced } = opts;
  let enabled = !reduced;
  let castIndex = 0;
  let sealCountdown = 6 + ((Math.random() * 3) | 0);
  let lastFigure = '';
  const rareAt: number[] = [];

  const mk = (cls: string, x: number, y: number, size: number, html = ''): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = cls;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.innerHTML = html;
    layer.appendChild(el);
    return el;
  };

  const heartRing = (): string =>
    `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="${heartPath(50)}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
  const moteHeart = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.4l-1.5-1.4C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.5 11.5L12 21.4z" fill="currentColor"/></svg>`;

  function cast(x: number, y: number, force?: string): void {
    if (!enabled) return;
    if (layer.childElementCount > MAX_NODES) return;
    castIndex++;
    const small = window.innerWidth < 520;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || HUES[0];

    const rare = force === 'cake' || (!force && --sealCountdown <= 0);
    if (rare) {
      sealCountdown = 6 + ((Math.random() * 3) | 0);
      rareAt.push(castIndex);
      const size = small ? 250 : 320;
      const flash = mk('hc-flash', x, y, 260);
      flash.style.color = '#F2A6C6';
      const cake = mk('hc-cake', x, y, size, cakeSvg());
      cake.style.color = '#E0568F';
      for (let i = 0; i < 6; i++) {
        const r = mk('hc-ring', x, y, 240 + i * 70, heartRing());
        r.style.color = i % 2 ? '#B58BEA' : '#E0568F';
        r.style.animationDelay = `${i * 110}ms`;
      }
      petals?.burst(x, y, 1.15);
      return;
    }

    let name = force && FIGURES[force] ? force : pick(FIGURE_NAMES);
    if (!force && name === lastFigure) name = pick(FIGURE_NAMES.filter((n) => n !== lastFigure));
    lastFigure = name;
    const hueA = pick(HUES);
    let hueB = pick(HUES);
    if (hueB === hueA) hueB = accent;

    const size = rnd(small ? 124 : 150, small ? 156 : 190);
    const flash = mk('hc-flash', x, y, 190);
    flash.style.color = hueA;
    const g = mk('hc-glyph', x, y, size, `<svg viewBox="0 0 120 120" aria-hidden="true">${FIGURES[name]()}</svg>`);
    g.style.color = hueA;
    g.style.setProperty('--r0', `${rnd(-25, 25)}deg`);
    g.style.setProperty('--r1', `${rnd(-70, 70)}deg`);

    if (Math.random() < 0.34) {
      let inner = pick(FIGURE_NAMES);
      if (inner === name) inner = pick(FIGURE_NAMES.filter((n) => n !== name));
      const ig = mk('hc-glyph hc-inner', x, y, size * rnd(0.4, 0.5), `<svg viewBox="0 0 120 120" aria-hidden="true">${FIGURES[inner]()}</svg>`);
      ig.style.color = hueB;
      ig.style.animationDelay = '130ms';
      ig.style.setProperty('--r0', `${rnd(-25, 25)}deg`);
      ig.style.setProperty('--r1', `${rnd(70, -70)}deg`);
    }

    const rings = 4 + ((Math.random() * 2) | 0);
    for (let i = 0; i < rings; i++) {
      const r = mk('hc-ring', x, y, 200 + i * 56, heartRing());
      r.style.color = i % 2 ? hueB : hueA;
      r.style.animationDelay = `${i * 100}ms`;
    }

    const motes = small ? 5 : 8;
    for (let i = 0; i < motes; i++) {
      const m = mk('hc-mote', x + rnd(-34, 34), y + rnd(-12, 24), rnd(11, 19), moteHeart);
      m.style.color = i % 3 === 0 ? hueB : hueA;
      m.style.setProperty('--dx', `${rnd(-34, 34)}px`);
      m.style.setProperty('--dy', `${-rnd(50, 110)}px`);
      m.style.setProperty('--tilt', `${rnd(-40, 40)}deg`);
      m.style.animationDuration = `${rnd(1000, 1700)}ms`;
      m.style.animationDelay = `${rnd(0, 260)}ms`;
    }
    if (Math.random() < 0.4) petals?.burst(x, y, 0.7);
  }

  layer.addEventListener('animationend', (e: AnimationEvent) => {
    if (CLEANUP.has(e.animationName)) (e.target as HTMLElement).remove();
  });

  const blocked = (t: EventTarget | null): boolean =>
    !!(t as Element | null)?.closest?.('a, button, input, textarea, video, dialog, [data-no-cast]');

  // Both handlers stay registered and the conflict is resolved per gesture: a phone fires touchend twice and
  // then synthesizes a dblclick, and a laptop with a touchscreen is both. See the earlier click-seal notes.
  let lastTap = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let lastTouchCast = 0;
  document.addEventListener('dblclick', (e) => {
    if (performance.now() - lastTouchCast < 1000) return;
    if (blocked(e.target)) return;
    window.getSelection()?.removeAllRanges();
    cast(e.clientX, e.clientY);
  });
  document.addEventListener(
    'touchend',
    (e) => {
      if (!(e.changedTouches.length === 1 && e.touches.length === 0)) return;
      if (blocked(e.target)) return;
      const t = e.changedTouches[0];
      const now = performance.now();
      if (now - lastTap < 320 && Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < 44) {
        lastTap = 0;
        lastTouchCast = now;
        cast(t.clientX, t.clientY);
      } else {
        lastTap = now;
        lastTapX = t.clientX;
        lastTapY = t.clientY;
      }
    },
    { passive: true },
  );

  const api: HeartCircleApi = {
    cast,
    nodes: () => layer.childElementCount,
    countdown: () => sealCountdown,
    rareGaps: () => rareAt.slice(1).map((v, i) => v - rareAt[i]),
    setEnabled: (on) => {
      enabled = on && !reduced;
      layer.style.display = enabled ? '' : 'none';
    },
  };
  (window as unknown as { __hc: HeartCircleApi }).__hc = api;
  return api;
}
