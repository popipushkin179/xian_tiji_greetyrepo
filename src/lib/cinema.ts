import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Sequence, drawCover } from './sequence';
import type { PetalField } from './petals';

gsap.registerPlugin(ScrollTrigger);

interface SceneDef {
  key: string;
  start: number;
  end: number;
  gate: number;
}

// Progress windows over the 0..1 scroll of #cinema. Scenes overlap so they crossfade.
const DEFS: SceneDef[] = [
  { key: 'road', start: 0.0, end: 0.37, gate: 24 },
  { key: 'wild', start: 0.33, end: 0.66, gate: 8 },
  { key: 'bloom', start: 0.62, end: 0.91, gate: 8 },
];
const FADE = 0.045;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

class Scene {
  seq: Sequence;
  el: HTMLElement;
  frame: HTMLElement;
  main: HTMLCanvasElement;
  amb: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D;
  actx: CanvasRenderingContext2D | null;
  fit: 'tall' | 'wide';
  frameF = 0;
  opacity = 0;
  drawnKey = '';
  cssW = 0;
  cssH = 0;
  mode: 'frame' | 'cover' = 'cover';

  constructor(public def: SceneDef, root: HTMLElement, radius: number, stride: number) {
    this.el = root.querySelector(`[data-scene="${def.key}"]`) as HTMLElement;
    this.frame = this.el.querySelector('.frame') as HTMLElement;
    this.main = this.el.querySelector('canvas.main') as HTMLCanvasElement;
    this.amb = this.el.querySelector('canvas.amb');
    this.ctx = this.main.getContext('2d', { alpha: false })!;
    this.actx = this.amb ? this.amb.getContext('2d', { alpha: false }) : null;
    this.fit = (this.el.dataset.fit as 'tall' | 'wide') ?? 'wide';
    this.seq = new Sequence(def.key, radius, stride);
  }

  layout(dpr: number): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const landscape = vw / vh > 0.78;
    this.mode = this.fit === 'tall' && landscape ? 'frame' : 'cover';
    this.el.dataset.mode = this.mode;
    const r = this.frame.getBoundingClientRect();
    this.cssW = r.width;
    this.cssH = r.height;
    const srcW = this.seq.manifest?.width ?? 1080;
    const w = Math.min(Math.round(this.cssW * dpr), Math.round(srcW * 1.25));
    const h = Math.round((w * this.cssH) / Math.max(1, this.cssW));
    if (this.main.width !== w || this.main.height !== h) {
      this.main.width = w;
      this.main.height = h;
    }
    if (this.amb && this.amb.width !== 48) {
      this.amb.width = 48;
      this.amb.height = 84;
    }
    this.drawnKey = '';
  }

  render(): void {
    const n = this.seq.frames;
    if (!n || this.opacity < 0.004) return;
    const f = Math.min(n - 1, Math.max(0, this.frameF));
    const i0 = Math.floor(f);
    const i1 = Math.min(n - 1, i0 + 1);
    const a = f - i0;
    this.seq.focus(Math.round(f));
    const key = `${f.toFixed(3)}|${this.main.width}|${this.seq.has(i0)}|${this.seq.has(i1)}`;
    if (key === this.drawnKey) return;
    const A = this.seq.nearest(i0);
    if (!A) return;
    this.drawnKey = key;
    const cw = this.main.width;
    const ch = this.main.height;
    drawCover(this.ctx, A.bm, cw, ch, 1);
    if (a > 0.02 && i1 !== i0 && this.seq.has(i1) && A.index === i0) {
      const B = this.seq.nearest(i1);
      if (B && B.index === i1) drawCover(this.ctx, B.bm, cw, ch, a);
    }
    if (this.actx && this.mode === 'frame') drawCover(this.actx, A.bm, this.amb!.width, this.amb!.height, 1);
  }
}

export interface CinemaApi {
  progress(): number;
  ready: Promise<void>;
}

export async function initCinema(opts: {
  root: HTMLElement;
  petals: PetalField | null;
  reduced: boolean;
  onProgress: (pct: number) => void;
}): Promise<CinemaApi> {
  const { root, petals, reduced, onProgress } = opts;
  const lowMem = window.innerWidth < 700 || ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  const radius = lowMem ? 5 : 8;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const saver = !!conn?.saveData || /^(slow-2g|2g|3g)$/.test(conn?.effectiveType ?? '');
  const scenes = DEFS.map((d) => new Scene(d, root, radius, saver ? 2 : 1));
  await Promise.all(scenes.map((s) => s.seq.init()));

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  const layoutAll = () => scenes.forEach((s) => s.layout(dpr()));

  // ---- loading: road first (it is what the visitor sees), the rest behind it ----
  const gates = DEFS.map((d) => d.gate);
  const totalGate = gates.reduce((a, b) => a + b, 0);
  const report = () => {
    const got = scenes.reduce((acc, s, i) => acc + Math.min(s.seq.loadedCount, gates[i]), 0);
    onProgress(Math.min(1, got / totalGate));
  };
  const roadLoad = scenes[0].seq.load(gates[0], 8, report);
  await roadLoad.gate;
  if (!(await scenes[0].seq.canDecode())) throw new Error('avif-unsupported');
  const others = scenes.slice(1).map((s, i) => s.seq.load(gates[i + 1], 4, report));
  await Promise.all(others.map((o) => o.gate));
  report();

  layoutAll();
  const textLines = Array.from(root.querySelectorAll<HTMLElement>('.line'));
  const wash = root.querySelector('.wash') as HTMLElement;
  const bed = root.querySelector('.bed') as HTMLElement;
  const cue = root.querySelector('.cue') as HTMLElement;
  const bar = root.querySelector('.bar') as HTMLElement;

  // ---- smooth scroll ----
  let lenis: Lenis | null = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, syncTouch: false, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis!.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', (l: { velocity: number }) => {
      petals?.setWind(Math.max(-1.6, Math.min(1.6, l.velocity * 0.12)));
    });
  }

  let target = 0;
  let p = 0;
  ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      target = self.progress;
    },
  });
  target = ScrollTrigger.getAll()[0]?.progress ?? 0;

  const api: CinemaApi = { progress: () => p, ready: Promise.resolve() };
  const debug = { p: 0, scenes: [] as { key: string; frame: number; opacity: number; mode: string }[] };
  (window as unknown as { __cine: typeof debug }).__cine = debug;

  const tick = () => {
    p += (target - p) * (reduced ? 1 : 0.2);
    if (Math.abs(target - p) < 0.00005) p = target;
    for (const s of scenes) {
      const { start, end } = s.def;
      const t = Math.min(1, Math.max(0, (p - start) / (end - start)));
      s.frameF = t * (s.seq.frames - 1);
      const first = s.def.key === 'road';
      const fin = first ? 1 : smooth(start - FADE, start, p);
      const fout = 1 - smooth(end, end + FADE, p);
      const washFade = 1 - smooth(0.9, 0.985, p);
      s.opacity = fin * (s.def.key === 'bloom' ? 1 : fout) * washFade;
      s.el.style.opacity = s.opacity.toFixed(3);
      s.el.style.visibility = s.opacity < 0.004 ? 'hidden' : 'visible';
      s.render();
    }
    for (const el of textLines) {
      const a = parseFloat(el.dataset.in!);
      const b = parseFloat(el.dataset.out!);
      const vin = smooth(a, a + 0.035, p);
      const vout = smooth(b - 0.035, b, p);
      const op = vin * (1 - vout);
      el.style.opacity = op.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - vin) * 16 - vout * 16).toFixed(1)}px, 0)`;
      el.style.visibility = op < 0.004 ? 'hidden' : 'visible';
    }
    bed.style.opacity = smooth(0.84, 0.9, p).toFixed(3);
    wash.style.opacity = smooth(0.9, 0.985, p).toFixed(3);
    cue.style.opacity = (1 - smooth(0.0, 0.03, p)).toFixed(3);
    bar.style.transform = `scaleY(${Math.min(1, p / 0.9).toFixed(4)})`;
    if (petals && (p < 0.999 || target < 0.999)) petals.setDensity(p < 0.05 ? 0.3 : p > 0.82 ? 0.8 : 0.45 + 0.3 * smooth(0.05, 0.82, p));
    debug.p = p;
    debug.scenes = scenes.map((s) => ({ key: s.def.key, frame: +s.frameF.toFixed(2), opacity: +s.opacity.toFixed(3), mode: s.mode }));
  };
  gsap.ticker.add(tick);

  let rz = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => {
      layoutAll();
      ScrollTrigger.refresh();
    });
  });

  // finish loading the rest of the frames in the background
  void Promise.all([roadLoad.all, ...others.map((o) => o.all)]).then(() => {
    scenes.forEach((s) => (s.drawnKey = ''));
  });
  ScrollTrigger.refresh();
  return api;
}
