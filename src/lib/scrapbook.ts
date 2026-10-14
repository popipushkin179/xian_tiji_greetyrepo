import type { PetalField } from './petals';
import type { HeartCircleApi } from './heartcircles';
import { cakeSvg } from './heartcircles';

const root = document.documentElement;

function store(key: string, val?: string): string | null {
  try {
    if (val !== undefined) localStorage.setItem(key, val);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Dock buttons: petals, hearts (circles + random sparkle), stickers. State lives on <html data-*> and in localStorage. */
export function initToggles(petals: PetalField | null, hc: HeartCircleApi, reduced: boolean): void {
  const apply = (name: string, on: boolean): void => {
    root.dataset[name] = on ? 'on' : 'off';
    if (name === 'petals') petals?.setEnabled(on && !reduced);
    if (name === 'hearts') hc.setEnabled(on);
  };
  document.querySelectorAll<HTMLButtonElement>('.dock button[data-toggle]').forEach((btn) => {
    const name = btn.dataset.toggle!;
    const saved = store(`bw1:${name}`);
    const on = saved ? saved === 'on' : !(reduced && name !== 'stickers');
    btn.setAttribute('aria-pressed', String(on));
    apply(name, on);
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(next));
      apply(name, next);
      store(`bw1:${name}`, next ? 'on' : 'off');
    });
  });
}

export function initReveal(): void {
  const els = document.querySelectorAll<HTMLElement>('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );
  els.forEach((e) => io.observe(e));
}

export function initLightbox(): void {
  const dlg = document.getElementById('lb') as HTMLDialogElement | null;
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const img = dlg.querySelector('img') as HTMLImageElement;
  const open = (fig: HTMLElement) => {
    const src = fig.querySelector('img')?.currentSrc || fig.querySelector('img')?.src;
    if (!src) return;
    img.src = src;
    img.alt = fig.querySelector('img')?.alt ?? '';
    dlg.showModal();
  };
  document.querySelectorAll<HTMLElement>('.pola').forEach((fig) => {
    fig.tabIndex = 0;
    fig.addEventListener('click', () => open(fig));
    fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(fig);
      }
    });
  });
  dlg.addEventListener('click', () => dlg.close());
}

export function initVideo(): void {
  const phone = document.querySelector<HTMLElement>('.phone');
  const video = phone?.querySelector('video');
  const play = phone?.querySelector<HTMLButtonElement>('.play');
  if (!phone || !video || !play) return;
  play.addEventListener('click', () => {
    video.muted = false;
    video.controls = true;
    void video.play().then(() => phone.classList.add('playing')).catch(() => {
      video.muted = true;
      void video.play().then(() => phone.classList.add('playing'));
    });
  });
  video.addEventListener('ended', () => {
    video.controls = false;
    phone.classList.remove('playing');
  });
}

/** Cat stickers: drag them around, tap one for a burst of hearts. */
export function initCats(petals: PetalField | null): void {
  document.querySelectorAll<HTMLElement>('.cat').forEach((cat) => {
    let sx = 0, sy = 0, ox = 0, oy = 0, moved = 0;
    const getT = () => [parseFloat(cat.style.getPropertyValue('--tx')) || 0, parseFloat(cat.style.getPropertyValue('--ty')) || 0];
    cat.style.transform = 'translate(var(--tx, 0px), var(--ty, 0px)) rotate(var(--rot, 0deg))';
    cat.addEventListener('pointerdown', (e) => {
      cat.setPointerCapture(e.pointerId);
      cat.classList.add('drag');
      sx = e.clientX; sy = e.clientY;
      [ox, oy] = getT();
      moved = 0;
    });
    cat.addEventListener('pointermove', (e) => {
      if (!cat.classList.contains('drag')) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      moved = Math.max(moved, Math.hypot(dx, dy));
      cat.style.setProperty('--tx', `${ox + dx}px`);
      cat.style.setProperty('--ty', `${oy + dy}px`);
    });
    const end = (e: PointerEvent) => {
      if (!cat.classList.contains('drag')) return;
      cat.classList.remove('drag');
      if (moved < 6) {
        cat.classList.remove('pop');
        void cat.offsetWidth;
        cat.classList.add('pop');
        const r = cat.getBoundingClientRect();
        petals?.burst(r.left + r.width / 2, r.top + r.height / 2, 0.8);
      }
      void e;
    };
    cat.addEventListener('pointerup', end);
    cat.addEventListener('pointercancel', end);
  });
}

/** The page cake: blow the candles with the microphone, or tap the flames. Audio is analysed locally and never stored. */
export function initCake(petals: PetalField | null): void {
  const stage = document.getElementById('cake-stage');
  const note = document.getElementById('blow-note');
  const wish = document.getElementById('wish');
  const micBtn = document.getElementById('blow-mic') as HTMLButtonElement | null;
  const relight = document.getElementById('relight') as HTMLButtonElement | null;
  if (!stage || !note || !wish || !micBtn || !relight) return;
  stage.innerHTML = cakeSvg();
  const flames = Array.from(stage.querySelectorAll<SVGGElement>('.hc-flame'));
  const lit = () => flames.filter((f) => !f.classList.contains('out'));
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let raf = 0;

  const stopMic = () => {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    void ctx?.close();
    stream = null;
    ctx = null;
    micBtn.disabled = false;
  };
  const finish = () => {
    stopMic();
    note.textContent = note.dataset.done ?? '';
    wish.textContent = wish.dataset.text ?? '';
    wish.classList.add('on');
    const r = stage.getBoundingClientRect();
    petals?.burst(r.left + r.width / 2, r.top + r.height * 0.35, 1.2);
    setTimeout(() => petals?.burst(r.left + r.width * 0.3, r.top + r.height * 0.4, 0.9), 220);
    setTimeout(() => petals?.burst(r.left + r.width * 0.7, r.top + r.height * 0.4, 0.9), 420);
  };
  const out = (f: SVGGElement) => {
    f.classList.add('out');
    if (lit().length === 0) finish();
  };
  flames.forEach((f) => f.addEventListener('click', () => out(f)));
  stage.addEventListener('click', () => {
    const l = lit();
    if (l.length) out(l[0]);
  });

  relight.addEventListener('click', () => {
    stopMic();
    flames.forEach((f) => f.classList.remove('out'));
    wish.classList.remove('on');
    note.textContent = note.dataset.initial ?? '';
  });

  micBtn.addEventListener('click', async () => {
    if (lit().length === 0) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      note.textContent = 'no microphone here. tap the flames instead.';
      return;
    }
    micBtn.disabled = true;
    note.textContent = 'asking for the microphone...';
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch {
      note.textContent = 'no problem. tap the flames instead.';
      micBtn.disabled = false;
      return;
    }
    ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    note.textContent = 'shh, listening to the room...';
    const t0 = performance.now();
    let last = t0;
    let ambient = 0;
    let n = 0;
    let loud = 0;
    let cooldown = 0;
    const deadline = t0 + 25000;
    const loop = (now: number) => {
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      const rms = Math.sqrt(s / buf.length);
      const dt = now - last;
      last = now;
      if (now - t0 < 700) {
        ambient += rms;
        n++;
      } else {
        if (note.textContent?.startsWith('shh')) note.textContent = 'now blow, gently, at the screen.';
        const thr = Math.max(0.05, (ambient / Math.max(1, n)) * 3.2);
        loud = rms > thr ? loud + dt : Math.max(0, loud - dt * 2);
        cooldown -= dt;
        if (loud > 180 && cooldown <= 0) {
          const l = lit();
          if (l.length) out(l[0]);
          cooldown = 150;
        }
      }
      if (lit().length === 0) return;
      if (now > deadline) {
        note.textContent = 'could not hear you. tap the flames instead.';
        stopMic();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  });
}

/** Now and then, a small shower of petals and hearts from somewhere on screen. */
export function initSurprises(petals: PetalField | null): void {
  if (!petals) return;
  const next = () => {
    setTimeout(() => {
      if (document.visibilityState === 'visible' && root.dataset.hearts !== 'off' && root.dataset.petals !== 'off') {
        petals.burst(Math.random() * window.innerWidth, window.innerHeight * (0.12 + Math.random() * 0.25), 0.65);
      }
      next();
    }, 14000 + Math.random() * 12000);
  };
  next();
}
