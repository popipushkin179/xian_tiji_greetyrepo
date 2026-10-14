import { u } from './paths';

export interface Manifest {
  frames: number;
  width: number;
  height: number;
  ext: string;
  bytes: number;
}

/**
 * A scroll-scrub frame sequence.
 *
 * Encoded files are fetched into memory as Blobs (small), but only a sliding window of frames around the
 * playhead is decoded to ImageBitmap (large: width * height * 4 bytes each). Bitmaps outside the window are
 * closed, so memory stays bounded on phones whatever the clip length.
 */
export class Sequence {
  readonly dir: string;
  manifest!: Manifest;
  private blobs: (Blob | null)[] = [];
  private bitmaps = new Map<number, ImageBitmap>();
  private pending = new Set<number>();
  private radius: number;
  private stride: number;
  loadedBytes = 0;
  loadedCount = 0;

  constructor(dir: string, radius: number, stride = 1) {
    this.dir = dir;
    this.radius = radius;
    this.stride = stride;
  }

  get frames(): number {
    return this.manifest?.frames ?? 0;
  }

  async init(): Promise<void> {
    const res = await fetch(u(`frames/${this.dir}/manifest.json`));
    if (!res.ok) throw new Error(`manifest ${this.dir}: ${res.status}`);
    this.manifest = await res.json();
    this.blobs = new Array(this.manifest.frames).fill(null);
  }

  private url(i: number): string {
    return u(`frames/${this.dir}/f${String(i + 1).padStart(4, '0')}.${this.manifest.ext}`);
  }

  /** Coarse-to-fine order, so any scroll position has a nearby frame early. */
  priorityOrder(): number[] {
    const n = this.frames;
    const seen = new Set<number>();
    const out: number[] = [];
    const add = (i: number) => {
      if (i >= 0 && i < n && !seen.has(i) && (i % this.stride === 0 || i === n - 1)) {
        seen.add(i);
        out.push(i);
      }
    };
    add(0);
    add(n - 1);
    for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < n; i += step) add(i);
    return out;
  }

  async fetchFrame(i: number): Promise<void> {
    if (this.blobs[i]) return;
    const res = await fetch(this.url(i));
    if (!res.ok) throw new Error(`frame ${this.dir} ${i}: ${res.status}`);
    const blob = await res.blob();
    this.blobs[i] = blob;
    this.loadedBytes += blob.size;
    this.loadedCount += 1;
  }

  /** Fetch frames with a small concurrency; `gate` resolves once the first `gateCount` of the order are in. */
  load(gateCount: number, concurrency: number, onProgress: () => void): { gate: Promise<void>; all: Promise<void> } {
    const order = this.priorityOrder();
    let next = 0;
    let gated = 0;
    let resolveGate!: () => void;
    const gate = new Promise<void>((r) => (resolveGate = r));
    const worker = async () => {
      while (next < order.length) {
        const idx = order[next++];
        try {
          await this.fetchFrame(idx);
        } catch {
          /* a missing frame is skipped; nearest-frame drawing covers it */
        }
        if (++gated === Math.min(gateCount, order.length)) resolveGate();
        onProgress();
      }
    };
    const all = Promise.all(Array.from({ length: concurrency }, worker)).then(() => resolveGate());
    return { gate, all };
  }

  /** Decode the window around `center`, close bitmaps outside it. */
  focus(center: number): void {
    const lo = Math.max(0, center - this.radius);
    const hi = Math.min(this.frames - 1, center + this.radius);
    for (const [i, bm] of this.bitmaps) {
      if (i < lo || i > hi) {
        bm.close();
        this.bitmaps.delete(i);
      }
    }
    for (let i = lo; i <= hi; i++) {
      const blob = this.blobs[i];
      if (!blob || this.bitmaps.has(i) || this.pending.has(i)) continue;
      this.pending.add(i);
      createImageBitmap(blob)
        .then((bm) => {
          this.pending.delete(i);
          if (i < center - this.radius - 2 || i > center + this.radius + 2) bm.close();
          else this.bitmaps.set(i, bm);
        })
        .catch(() => this.pending.delete(i));
    }
  }

  /** Bitmap for frame i, or the nearest decoded one. */
  nearest(i: number): { bm: ImageBitmap; index: number } | null {
    if (this.bitmaps.size === 0) return null;
    let best = -1;
    let bestD = Infinity;
    for (const k of this.bitmaps.keys()) {
      const d = Math.abs(k - i);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    return { bm: this.bitmaps.get(best)!, index: best };
  }

  /** True if this browser can decode the first frame (AVIF support check). */
  async canDecode(): Promise<boolean> {
    const blob = this.blobs[0];
    if (!blob) return false;
    try {
      const bm = await createImageBitmap(blob);
      bm.close();
      return true;
    } catch {
      return false;
    }
  }

  has(i: number): boolean {
    return this.bitmaps.has(i);
  }
}

/** Draw `bm` into `ctx` covering the canvas, centred, like CSS object-fit: cover. */
export function drawCover(ctx: CanvasRenderingContext2D, bm: ImageBitmap, cw: number, ch: number, alpha = 1): void {
  const s = Math.max(cw / bm.width, ch / bm.height);
  const w = bm.width * s;
  const h = bm.height * s;
  ctx.globalAlpha = alpha;
  ctx.drawImage(bm, (cw - w) / 2, (ch - h) / 2, w, h);
  ctx.globalAlpha = 1;
}
