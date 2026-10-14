/*
  GPU petals, hearts and sparkles. Raw WebGL2, no library.

  One instanced draw call for the ambient fall (every particle's position is a pure function of a few
  per-instance random numbers and two uniforms, so the CPU does no per-particle work), plus up to three
  burst slots drawn the same way. Shapes (petal, heart, four-point sparkle) are signed-distance functions
  in the fragment shader, so they stay razor sharp at any size and device pixel ratio.
*/

const SHAPES = /* glsl */ `
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) {
    vec2 d = p - vec2(0.25, 0.75);
    return sqrt(dot(d, d)) - sqrt(2.0) / 4.0;
  }
  vec2 a = p - vec2(0.0, 1.0);
  vec2 b = p - 0.5 * max(p.x + p.y, 0.0);
  return sqrt(min(dot(a, a), dot(b, b))) * sign(p.x - p.y);
}

// returns rgb in .rgb, coverage in .a, for a unit quad uv in [-1,1]
vec4 shade(vec2 uv, float kind, float tint) {
  vec3 petalCols[4] = vec3[4](vec3(0.949, 0.710, 0.812), vec3(0.976, 0.827, 0.878), vec3(0.890, 0.560, 0.700), vec3(0.980, 0.920, 0.950));
  vec3 heartCols[3] = vec3[3](vec3(0.910, 0.420, 0.600), vec3(0.949, 0.640, 0.760), vec3(0.760, 0.680, 0.930));
  vec3 sparkCols[2] = vec3[2](vec3(1.000, 0.930, 0.690), vec3(1.000, 0.980, 0.960));
  float aa = 0.06;
  if (kind < 0.5) {
    // petal: a teardrop that narrows toward its base, with a small notch at the tip
    vec2 p = uv;
    float taper = 0.50 + 0.50 * (p.y * 0.5 + 0.5);
    p.x /= taper;
    float d = length(p / vec2(0.62, 0.96)) - 1.0;
    d = max(d, -(length(p - vec2(0.0, 1.0)) - 0.17));
    float a = 1.0 - smoothstep(-aa, aa, d);
    vec3 base = petalCols[int(tint * 4.0) % 4];
    float vein = 1.0 - smoothstep(0.0, 0.18, abs(p.x));
    vec3 col = mix(base, base * vec3(0.93, 0.80, 0.88), vein * 0.5 + (1.0 - p.y) * 0.12);
    return vec4(col, a);
  } else if (kind < 1.5) {
    vec2 p = vec2(uv.x * 1.18, uv.y * -1.18 + 0.52);
    float d = sdHeart(p);
    float a = 1.0 - smoothstep(-aa, aa, d);
    vec3 base = heartCols[int(tint * 3.0) % 3];
    float hi = smoothstep(0.55, 0.0, length(uv - vec2(-0.32, -0.35)));
    return vec4(mix(base, vec3(1.0), hi * 0.35), a);
  }
  // four-point sparkle with a soft core
  float s = pow(abs(uv.x), 0.55) + pow(abs(uv.y), 0.55) - 0.95;
  float a = (1.0 - smoothstep(-0.05, 0.18, s)) + exp(-length(uv) * 4.0) * 0.6;
  return vec4(sparkCols[int(tint * 2.0) % 2], clamp(a, 0.0, 1.0));
}
`;

const FALL_VS = /* glsl */ `#version 300 es
in vec2 a_corner;
in vec4 a_seed;   // x0, y0, speed, size
in vec4 a_seed2;  // phase, spin, kindRoll, density threshold
uniform float u_time;
uniform float u_fall;
uniform float u_wind;
uniform float u_density;
uniform vec2 u_res;
uniform float u_dpr;
out vec2 v_uv;
out float v_kind;
out float v_tint;
out float v_alpha;
void main() {
  if (a_seed2.w > u_density) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float kind = a_seed2.z < 0.70 ? 0.0 : (a_seed2.z < 0.94 ? 1.0 : 2.0);
  float y01 = fract(a_seed.y - u_fall * (0.45 + a_seed.z));
  float x = a_seed.x * 2.0 - 1.0;
  x += sin(u_time * (0.5 + a_seed2.x) + a_seed2.x * 6.2831) * 0.05 * (0.4 + a_seed.w);
  x += u_wind * 0.22 * (0.5 + a_seed.z) * sin(y01 * 3.0 + a_seed2.x * 6.0);
  float y = 1.15 - y01 * 2.3;
  float size = mix(7.0, 20.0, a_seed.w * a_seed.w) * u_dpr * (kind > 0.5 ? 1.05 : 1.0);
  float flutter = kind < 0.5 ? 0.4 + 0.6 * abs(cos(u_time * (1.2 + a_seed.z) + a_seed2.x * 9.0)) : 1.0;
  float ang = a_seed2.y * 6.2831 + u_time * (kind < 0.5 ? (0.6 + a_seed2.y) : 0.35) * (a_seed2.y > 0.5 ? 1.0 : -1.0);
  float c = cos(ang), s = sin(ang);
  vec2 off = vec2(a_corner.x * flutter, a_corner.y) * size;
  off = vec2(c * off.x - s * off.y, s * off.x + c * off.y);
  gl_Position = vec4(x + off.x / (u_res.x * 0.5), y + off.y / (u_res.y * 0.5), 0.0, 1.0);
  v_uv = a_corner;
  v_kind = kind;
  v_tint = a_seed.w;
  v_alpha = smoothstep(0.0, 0.07, y01) * smoothstep(1.0, 0.93, y01) * mix(0.4, 0.8, a_seed.w);
}`;

const BURST_VS = /* glsl */ `#version 300 es
in vec2 a_corner;
uniform float u_t;
uniform vec2 u_origin;   // clip space
uniform vec2 u_res;
uniform float u_dpr;
uniform float u_scale;
out vec2 v_uv;
out float v_kind;
out float v_tint;
out float v_alpha;
float h(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
void main() {
  float id = float(gl_InstanceID);
  float r1 = h(id + 1.0), r2 = h(id + 2.0), r3 = h(id + 3.0), r4 = h(id + 4.0);
  float kind = r1 < 0.45 ? 0.0 : (r1 < 0.8 ? 1.0 : 2.0);
  float ang = r2 * 6.2831;
  float speed = mix(0.35, 1.25, r3);
  vec2 dir = vec2(cos(ang), sin(ang));
  float t = u_t;
  float drag = (1.0 - exp(-2.6 * t)) / 2.6;
  vec2 pos = u_origin + dir * speed * drag * vec2(u_res.y / u_res.x, 1.0);
  pos.y += 0.10 * t - 0.30 * t * t;
  float life = mix(1.3, 2.3, r4);
  float k = clamp(t / life, 0.0, 1.0);
  float size = mix(8.0, 22.0, r3) * u_dpr * u_scale * (1.0 - 0.55 * k);
  float a2 = (r2 * 6.2831) + t * (r4 - 0.5) * 7.0;
  float c = cos(a2), s = sin(a2);
  vec2 off = a_corner * size;
  off = vec2(c * off.x - s * off.y, s * off.x + c * off.y);
  gl_Position = vec4(pos.x + off.x / (u_res.x * 0.5), pos.y + off.y / (u_res.y * 0.5), 0.0, 1.0);
  v_uv = a_corner;
  v_kind = kind;
  v_tint = r4;
  v_alpha = (t < 0.0 || k >= 1.0) ? 0.0 : (1.0 - smoothstep(0.55, 1.0, k)) * smoothstep(0.0, 0.04, t);
}`;

const FS = /* glsl */ `#version 300 es
precision mediump float;
in vec2 v_uv;
in float v_kind;
in float v_tint;
in float v_alpha;
out vec4 outColor;
${SHAPES}
void main() {
  vec4 c = shade(v_uv, v_kind, v_tint);
  float a = c.a * v_alpha;
  if (a < 0.003) discard;
  outColor = vec4(c.rgb * a, a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader: ${log}`);
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string, attribs: string[]): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  attribs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(p)}`);
  return p;
}

interface BurstSlot {
  active: boolean;
  start: number;
  x: number;
  y: number;
  scale: number;
}

export interface PetalOptions {
  count: number;
  maxDpr: number;
}

export class PetalField {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private fallProg: WebGLProgram;
  private burstProg: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private burstVao: WebGLVertexArrayObject;
  private count: number;
  private maxDpr: number;
  private dpr = 1;
  private raf = 0;
  private running = false;
  private last = 0;
  private time = 0;
  private fall = 0;
  private wind = 0;
  private windTarget = 0;
  private density = 1;
  private densityTarget = 1;
  private slots: BurstSlot[] = [
    { active: false, start: 0, x: 0, y: 0, scale: 1 },
    { active: false, start: 0, x: 0, y: 0, scale: 1 },
    { active: false, start: 0, x: 0, y: 0, scale: 1 },
  ];
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private bloc: Record<string, WebGLUniformLocation | null> = {};
  private static BURST_COUNT = 150;
  enabled = true;
  lastFrameCount = 0;

  constructor(canvas: HTMLCanvasElement, opts: PetalOptions) {
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('no webgl2');
    this.gl = gl;
    this.canvas = canvas;
    this.count = opts.count;
    this.maxDpr = opts.maxDpr;
    this.fallProg = program(gl, FALL_VS, FS, ['a_corner', 'a_seed', 'a_seed2']);
    this.burstProg = program(gl, BURST_VS, FS, ['a_corner']);
    for (const n of ['u_time', 'u_fall', 'u_wind', 'u_density', 'u_res', 'u_dpr']) this.loc[n] = gl.getUniformLocation(this.fallProg, n);
    for (const n of ['u_t', 'u_origin', 'u_res', 'u_dpr', 'u_scale']) this.bloc[n] = gl.getUniformLocation(this.burstProg, n);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    // fall instances
    const seed = new Float32Array(this.count * 4);
    const seed2 = new Float32Array(this.count * 4);
    for (let i = 0; i < this.count; i++) {
      seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      // density threshold is spread evenly so lowering density thins the field uniformly
      seed2.set([Math.random(), Math.random(), Math.random(), (i + 0.5) / this.count], i * 4);
    }
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const [loc, data] of [[1, seed], [2, seed2]] as [number, Float32Array][]) {
      const b = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(loc, 1);
    }

    this.burstVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.burstVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const w = Math.max(1, Math.round(window.innerWidth * this.dpr));
    const h = Math.max(1, Math.round(window.innerHeight * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  setDensity(d: number): void {
    this.densityTarget = Math.max(0, Math.min(1, d));
  }

  setWind(w: number): void {
    this.windTarget = Math.max(-2, Math.min(2, w));
  }

  /** Burst at CSS pixel coordinates. scale grows the particles. */
  burst(x: number, y: number, scale = 1): void {
    if (!this.enabled) return;
    let slot = this.slots.find((s) => !s.active);
    if (!slot) slot = this.slots.reduce((a, b) => (a.start < b.start ? a : b));
    slot.active = true;
    slot.start = this.time;
    slot.x = x;
    slot.y = y;
    slot.scale = scale;
    this.start();
  }

  start(): void {
    if (this.running || !this.enabled) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.canvas.style.display = on ? '' : 'none';
    if (on) this.start();
    else {
      this.stop();
      for (const s of this.slots) s.active = false;
    }
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    if (document.visibilityState === 'hidden') {
      this.last = now;
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.wind += (this.windTarget - this.wind) * Math.min(1, dt * 3);
    this.density += (this.densityTarget - this.density) * Math.min(1, dt * 1.5);
    this.fall += dt * (0.035 + Math.abs(this.wind) * 0.05);

    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const w = this.canvas.width;
    const h = this.canvas.height;

    gl.useProgram(this.fallProg);
    gl.bindVertexArray(this.vao);
    gl.uniform1f(this.loc.u_time, this.time);
    gl.uniform1f(this.loc.u_fall, this.fall);
    gl.uniform1f(this.loc.u_wind, this.wind);
    gl.uniform1f(this.loc.u_density, this.density);
    gl.uniform2f(this.loc.u_res, w, h);
    gl.uniform1f(this.loc.u_dpr, this.dpr);
    if (this.density > 0.002) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);

    gl.useProgram(this.burstProg);
    gl.bindVertexArray(this.burstVao);
    gl.uniform2f(this.bloc.u_res, w, h);
    gl.uniform1f(this.bloc.u_dpr, this.dpr);
    for (const s of this.slots) {
      if (!s.active) continue;
      const t = this.time - s.start;
      if (t > 2.4) {
        s.active = false;
        continue;
      }
      gl.uniform1f(this.bloc.u_t, t);
      gl.uniform1f(this.bloc.u_scale, s.scale);
      gl.uniform2f(this.bloc.u_origin, (s.x / window.innerWidth) * 2 - 1, 1 - (s.y / window.innerHeight) * 2);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, PetalField.BURST_COUNT);
    }
    this.lastFrameCount++;
    this.raf = requestAnimationFrame(this.frame);
  };
}
