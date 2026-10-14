import { PetalField } from '../lib/petals';
import { initHeartCircles } from '../lib/heartcircles';
import { initCinema } from '../lib/cinema';
import { initCake, initCats, initLightbox, initReveal, initSurprises, initToggles, initVideo } from '../lib/scrapbook';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const preloader = document.getElementById('preloader')!;
const pr = document.getElementById('pcr');
const pct = document.getElementById('pct')!;

function setProgress(v: number): void {
  const n = Math.round(v * 100);
  pct.textContent = String(n);
  pr?.setAttribute('y', String(24 - 24 * v));
}

const lowMem = window.innerWidth < 700 || ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) <= 4;

let petals: PetalField | null = null;
try {
  petals = new PetalField(document.getElementById('petals') as HTMLCanvasElement, { count: lowMem ? 150 : 340, maxDpr: 1 });
  if (!reduced) petals.start();
  window.addEventListener('resize', () => petals?.resize());
} catch (err) {
  console.warn('petals disabled:', err);
  document.getElementById('petals')?.remove();
}

const hc = initHeartCircles({ layer: document.getElementById('hc-layer')!, petals, reduced });
initToggles(petals, hc, reduced);
initReveal();
initLightbox();
initVideo();
initCats(petals);
initCake(petals);
initSurprises(petals);

// ambient density: calmer inside the paper act
const scrap = document.getElementById('scrapbook');
if (scrap && petals && 'IntersectionObserver' in window) {
  new IntersectionObserver(
    (es) => {
      for (const e of es) if (e.isIntersecting) petals!.setDensity(0.34);
    },
    { threshold: 0.05 },
  ).observe(scrap);
}

async function boot(): Promise<void> {
  try {
    await initCinema({ root: document.getElementById('cinema')!, petals, reduced, onProgress: setProgress });
  } catch (err) {
    console.error('cinema failed:', err);
    root.classList.add('no-film');
  }
  setProgress(1);
  root.classList.remove('is-loading');
  preloader.classList.add('done');
  const hint = document.getElementById('hint');
  if (hint) {
    hint.textContent = (window.matchMedia('(pointer: coarse)').matches ? hint.dataset.phone : hint.dataset.desktop) ?? '';
    setTimeout(() => hint.classList.add('show'), 1400);
    setTimeout(() => hint.classList.remove('show'), 8200);
  }
}

void boot();
