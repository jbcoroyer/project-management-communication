/** Palette douce (moins arcade). */
const COLORS = ["#5b8def", "#7eb8f7", "#f0a05a", "#e8c56b", "#6bc4a6", "#c4a5e8", "#8ecae6"];

const THROTTLE_MS = 750;
/** Sans nouvelle célébration, le tas disparaît. */
const IDLE_CLEAR_MS = 10_000;
const FLOOR_PAD = 3;
const PILE_COL_W = 5;
/** Contribution verticale d’une pièce au tas (compression visuelle). */
const PILE_GROW = 0.42;
const PILE_MAX_H = 120;

type CelebrateMode = "local" | "fullscreen";

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  spin: number;
  /** Phase pour le flutter 3D (échelle X). */
  flutter: number;
  flutterSpeed: number;
  windPhase: number;
  windAmp: number;
  color: string;
  shape: "rect" | "streamer" | "dot";
  bornAt: number;
  /** Opacité 0–1. */
  alpha: number;
  lifeMs: number;
  /** Posée au sol / sur le tas. */
  settled: boolean;
  /** Peut s’empiler (plein écran uniquement). */
  canPile: boolean;
};

type Engine = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pieces: Piece[];
  /** Hauteur du tas par colonne (px depuis le bas). */
  pile: Float32Array;
  pileCols: number;
  width: number;
  height: number;
  dpr: number;
  rafId: number | null;
  running: boolean;
  startedAt: number;
  mode: CelebrateMode;
  /** Zone de clip pour mode local (null = plein écran). */
  clip: { x: number; y: number; w: number; h: number } | null;
  rainUntil: number;
  /** Dernière activité (lancement confettis). */
  lastActivityAt: number;
  /** Début du fade d’inactivité (0 = pas encore). */
  idleFadeAt: number;
};

export type CelebrateOrigin = { x: number; y: number };

export type CelebrateOptions = {
  taskId?: string;
  origin?: CelebrateOrigin;
};

let lastCelebrateAt = 0;
let celebrateAudioCtx: AudioContext | null = null;
let engine: Engine | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  } catch {
    return false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCelebrateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!celebrateAudioCtx) celebrateAudioCtx = new Ctor();
  return celebrateAudioCtx;
}

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    // Bruit blanc un peu atténué vers la fin pour un souffle de canon
    const fall = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * fall;
  }
  return buffer;
}

/** Boom de canon (bruit + thump basse) + léger chime. */
function playCelebrateSound(intensity = 1): void {
  if (prefersReducedMotion()) return;
  const ctx = getCelebrateAudioContext();
  if (!ctx) return;

  void ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const cannon = intensity >= 1;
  const master = ctx.createGain();
  master.gain.value = clamp(cannon ? 0.55 * intensity : 0.22 * intensity, 0.12, 0.7);
  master.connect(ctx.destination);

  const fireCannon = (t0: number, power: number) => {
    // 1) Détonation : bruit filtré bas
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.45);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(900 * power, t0);
    noiseFilter.frequency.exponentialRampToValueAtTime(120, t0 + 0.28);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(1.1 * power, t0 + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t0);
    noise.stop(t0 + 0.45);

    // 2) Thump grave (bouche du canon)
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(95 * power, t0);
    thump.frequency.exponentialRampToValueAtTime(38, t0 + 0.32);
    thumpGain.gain.setValueAtTime(0.001, t0);
    thumpGain.gain.exponentialRampToValueAtTime(1.35 * power, t0 + 0.018);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    thump.start(t0);
    thump.stop(t0 + 0.45);

    // 3) Attaque sèche (claquement)
    const crack = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crack.type = "triangle";
    crack.frequency.setValueAtTime(220, t0);
    crack.frequency.exponentialRampToValueAtTime(70, t0 + 0.08);
    crackGain.gain.setValueAtTime(0.001, t0);
    crackGain.gain.exponentialRampToValueAtTime(0.55 * power, t0 + 0.005);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
    crack.connect(crackGain);
    crackGain.connect(master);
    crack.start(t0);
    crack.stop(t0 + 0.12);
  };

  if (cannon) {
    // Deux canons : gauche puis droite
    fireCannon(now, 1);
    fireCannon(now + 0.09, 0.88);
  } else {
    fireCannon(now, 0.55);
  }

  // Petit chime après le boom (fête)
  const chimeNotes = [523.25, 659.25, 783.99];
  chimeNotes.forEach((freq, i) => {
    const t = now + (cannon ? 0.14 : 0.05) + i * 0.055;
    const osc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    chimeGain.gain.setValueAtTime(0, t);
    chimeGain.gain.linearRampToValueAtTime(cannon ? 0.1 : 0.14, t + 0.01);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(chimeGain);
    chimeGain.connect(master);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

function ensurePile(e: Engine, width: number) {
  const cols = Math.max(1, Math.ceil(width / PILE_COL_W));
  if (e.pileCols === cols && e.pile.length === cols) return;
  const next = new Float32Array(cols);
  if (e.pile.length > 0) {
    const scale = e.pileCols / cols;
    for (let i = 0; i < cols; i += 1) {
      const src = Math.min(e.pileCols - 1, Math.floor(i * scale));
      next[i] = e.pile[src] ?? 0;
    }
  }
  e.pile = next;
  e.pileCols = cols;
}

function pileIndex(e: Engine, x: number): number {
  return clamp(Math.floor(x / PILE_COL_W), 0, e.pileCols - 1);
}

function pileHeightAt(e: Engine, x: number): number {
  const i = pileIndex(e, x);
  const a = e.pile[i] ?? 0;
  const b = e.pile[clamp(i - 1, 0, e.pileCols - 1)] ?? 0;
  const c = e.pile[clamp(i + 1, 0, e.pileCols - 1)] ?? 0;
  return Math.max(a, (a + b + c) / 3);
}

function growPile(e: Engine, x: number, amount: number) {
  const i = pileIndex(e, x);
  const add = Math.min(amount, 4.5);
  e.pile[i] = Math.min(PILE_MAX_H, (e.pile[i] ?? 0) + add);
  const soft = add * 0.45;
  const iL = clamp(i - 1, 0, e.pileCols - 1);
  const iR = clamp(i + 1, 0, e.pileCols - 1);
  e.pile[iL] = Math.min(PILE_MAX_H, (e.pile[iL] ?? 0) + soft);
  e.pile[iR] = Math.min(PILE_MAX_H, (e.pile[iR] ?? 0) + soft);
}

function clearPile(e: Engine) {
  e.pile.fill(0);
}

function ensureEngine(): Engine | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (engine) return engine;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "420";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  engine = {
    canvas,
    ctx,
    pieces: [],
    pile: new Float32Array(0),
    pileCols: 0,
    width: 0,
    height: 0,
    dpr: 1,
    rafId: null,
    running: false,
    startedAt: 0,
    mode: "fullscreen",
    clip: null,
    rainUntil: 0,
    lastActivityAt: 0,
    idleFadeAt: 0,
  };

  resizeEngine();
  window.addEventListener("resize", resizeEngine, { passive: true });
  return engine;
}

function resizeEngine() {
  if (!engine) return;
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  engine.width = w;
  engine.height = h;
  engine.dpr = dpr;
  engine.canvas.width = Math.floor(w * dpr);
  engine.canvas.height = Math.floor(h * dpr);
  engine.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ensurePile(engine, w);
}

function resolveOrigin(options?: CelebrateOptions): CelebrateOrigin | null {
  if (options?.origin) return options.origin;
  if (options?.taskId && typeof document !== "undefined") {
    const safeId = options.taskId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const el = document.querySelector<HTMLElement>(`[data-task-id="${safeId}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    }
  }
  return null;
}

function pickColor(): string {
  return COLORS[(Math.random() * COLORS.length) | 0];
}

function makePiece(
  partial: Omit<
    Piece,
    "alpha" | "flutter" | "flutterSpeed" | "windPhase" | "windAmp" | "bornAt" | "lifeMs" | "settled" | "canPile"
  > &
    Partial<Piece>,
): Piece {
  const now = performance.now();
  return {
    flutter: Math.random() * Math.PI * 2,
    flutterSpeed: 0.04 + Math.random() * 0.08,
    windPhase: Math.random() * Math.PI * 2,
    windAmp: 0.15 + Math.random() * 0.45,
    bornAt: now,
    alpha: 1,
    lifeMs: 2200 + Math.random() * 1800,
    settled: false,
    canPile: true,
    ...partial,
  };
}

/** Flash initial : jets locaux ou canons centre → extérieur. */
function spawnFlashBurst(e: Engine, origin: CelebrateOrigin | null, mode: CelebrateMode) {
  const now = performance.now();

  if (mode === "local" && origin) {
    const count = 48;
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const speed = 2.2 + Math.random() * 4.5;
      const isDot = Math.random() < 0.35;
      e.pieces.push(
        makePiece({
          x: origin.x + (Math.random() - 0.5) * 28,
          y: origin.y + (Math.random() - 0.5) * 18,
          vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random()),
          vy: Math.sin(angle) * speed - 1.5,
          w: isDot ? 2.5 + Math.random() * 2 : 3 + Math.random() * 4,
          h: isDot ? 2.5 + Math.random() * 2 : 5 + Math.random() * 8,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.22,
          color: pickColor(),
          shape: isDot ? "dot" : Math.random() < 0.4 ? "streamer" : "rect",
          bornAt: now,
          lifeMs: 1400 + Math.random() * 900,
          canPile: false,
        }),
      );
    }
    return;
  }

  // Canons milieu-bas, tir vers le haut + extérieur
  const cy = e.height * 0.92;
  const cannons = [
    { x: e.width * 0.5, y: cy, dir: -1 as const },
    { x: e.width * 0.5, y: cy, dir: 1 as const },
  ];
  for (const cannon of cannons) {
    const count = 58;
    for (let i = 0; i < count; i += 1) {
      // Vers le haut + extérieur depuis le bas
      const base = cannon.dir > 0 ? -Math.PI * 0.32 : -Math.PI * 0.68;
      const angle = base + (Math.random() - 0.5) * 0.48;
      const speed = 10 + Math.random() * 12;
      const isStreamer = Math.random() < 0.32;
      e.pieces.push(
        makePiece({
          x: cannon.x + cannon.dir * (4 + Math.random() * 10) + (Math.random() - 0.5) * 8,
          y: cannon.y + (Math.random() - 0.5) * 14,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: isStreamer ? 2.5 + Math.random() * 2 : 4 + Math.random() * 5,
          h: isStreamer ? 12 + Math.random() * 16 : 3.5 + Math.random() * 5,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.28,
          color: pickColor(),
          shape: isStreamer ? "streamer" : Math.random() < 0.2 ? "dot" : "rect",
          bornAt: now,
          lifeMs: 12_000,
          canPile: true,
        }),
      );
    }
  }
}

/** Pluie douce continue (pièces fines qui flottent). */
function spawnRainDrop(e: Engine, origin: CelebrateOrigin | null, mode: CelebrateMode) {
  const now = performance.now();
  const isLocal = mode === "local" && origin;

  let x: number;
  let y: number;
  if (isLocal && origin) {
    x = origin.x + (Math.random() - 0.5) * 120;
    y = origin.y - 40 - Math.random() * 80;
  } else {
    x = Math.random() * e.width;
    y = -10 - Math.random() * 40;
  }

  const isStreamer = Math.random() < 0.45;
  e.pieces.push(
    makePiece({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 0.6 + Math.random() * 1.4,
      w: isStreamer ? 2 + Math.random() * 1.5 : 3 + Math.random() * 3.5,
      h: isStreamer ? 10 + Math.random() * 14 : 3 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.12,
      color: pickColor(),
      shape: isStreamer ? "streamer" : Math.random() < 0.25 ? "dot" : "rect",
      bornAt: now,
      lifeMs: isLocal ? 1600 + Math.random() * 1000 : 12_000,
      flutterSpeed: 0.05 + Math.random() * 0.1,
      windAmp: 0.25 + Math.random() * 0.55,
      canPile: !isLocal,
    }),
  );
}

let shakeRafId: number | null = null;
let shakePrev: {
  overflow: string;
  bodyOverflow: string;
  transition: string;
  transformOrigin: string;
} | null = null;

function endShake(root: HTMLElement, body: HTMLElement) {
  root.style.transform = "";
  if (shakePrev) {
    root.style.overflow = shakePrev.overflow;
    root.style.transition = shakePrev.transition;
    root.style.transformOrigin = shakePrev.transformOrigin;
    body.style.overflow = shakePrev.bodyOverflow;
    shakePrev = null;
  } else {
    root.style.overflow = "";
    root.style.transition = "";
    root.style.transformOrigin = "";
    body.style.overflow = "";
  }
  shakeRafId = null;
}

/** Recul du canon : pulse en zoom (pas de translate → pas de scrollbars). */
function shakeViewport(intensity = 1): void {
  if (typeof document === "undefined" || prefersReducedMotion()) return;

  try {
    navigator.vibrate?.([28, 35, 22]);
  } catch {
    /* ignore */
  }

  const root = document.documentElement;
  const body = document.body;
  if (shakeRafId != null) {
    window.cancelAnimationFrame(shakeRafId);
    endShake(root, body);
  }

  shakePrev = {
    overflow: root.style.overflow,
    bodyOverflow: body.style.overflow,
    transition: root.style.transition,
    transformOrigin: root.style.transformOrigin,
  };

  // Coupe le débordement pendant le scale (>1)
  root.style.overflow = "hidden";
  body.style.overflow = "hidden";
  root.style.transition = "none";
  root.style.transformOrigin = "50% 50%";

  const start = performance.now();
  const duration = intensity >= 1 ? 400 : 260;
  const peak = 0.012 + 0.006 * intensity; // ~1.2–2% max, jamais un débordement latéral visible

  const tick = (t: number) => {
    const p = clamp((t - start) / duration, 0, 1);
    if (p >= 1) {
      endShake(root, body);
      return;
    }
    // Impulse nette puis décroissance (zoom in/out rapide)
    const envelope = Math.sin(p * Math.PI);
    const jitter = (Math.random() - 0.5) * peak * 0.35 * (1 - p);
    const kick = Math.sin(p * Math.PI * 7) * peak * 0.45 * Math.pow(1 - p, 1.2);
    const scale = 1 + envelope * peak + kick + jitter;
    root.style.transform = `scale(${scale.toFixed(4)})`;
    shakeRafId = window.requestAnimationFrame(tick);
  };

  shakeRafId = window.requestAnimationFrame(tick);
}

function startCelebration(mode: CelebrateMode, origin: CelebrateOrigin | null) {
  const e = ensureEngine();
  if (!e) return;

  playCelebrateSound(mode === "fullscreen" ? 1.15 : 0.85);
  shakeViewport(mode === "fullscreen" ? 1.15 : 0.55);

  const now = performance.now();
  e.mode = mode;
  e.startedAt = now;
  e.lastActivityAt = now;
  e.idleFadeAt = 0;
  // Ne pas vider le tas : on accumule entre les lancements (F5 = reset mémoire).
  for (const p of e.pieces) {
    if (p.settled || p.canPile) p.alpha = 1;
  }

  if (mode === "local" && origin) {
    const pad = 160;
    e.clip = {
      x: origin.x - pad,
      y: origin.y - pad,
      w: pad * 2,
      h: pad * 2.2,
    };
    e.rainUntil = now + 1400;
  } else {
    e.clip = null;
    e.rainUntil = now + 2800;
  }

  spawnFlashBurst(e, origin, mode);
  startLoop();
}

function startLoop() {
  if (!engine || engine.running) return;
  engine.running = true;

  const step = (t: number) => {
    if (!engine) return;
    updateAndDraw(engine, t);

    const hasPieces = engine.pieces.length > 0;
    const raining = t < engine.rainUntil;
    const fading = engine.idleFadeAt > 0 && t < engine.idleFadeAt + 900;

    if (hasPieces || raining || fading) {
      engine.rafId = window.requestAnimationFrame(step);
      return;
    }

    engine.running = false;
    engine.ctx.clearRect(0, 0, engine.width, engine.height);
    if (engine.rafId) {
      window.cancelAnimationFrame(engine.rafId);
      engine.rafId = null;
    }
  };

  engine.rafId = window.requestAnimationFrame(step);
}

function updateAndDraw(e: Engine, now: number) {
  const { ctx, width, height } = e;
  const elapsed = now - e.startedAt;
  const airDrag = 0.992;

  // Inactivité 10s → fade du tas
  if (e.idleFadeAt === 0 && now - e.lastActivityAt >= IDLE_CLEAR_MS) {
    e.idleFadeAt = now;
  }
  const idleFade =
    e.idleFadeAt > 0 ? clamp((now - e.idleFadeAt) / 850, 0, 1) : 0;

  // Phase pluie (selon le dernier mode lancé)
  if (elapsed > 280 && now < e.rainUntil) {
    const rate = e.mode === "local" ? 2 : 5;
    const origin =
      e.mode === "local" && e.clip
        ? { x: e.clip.x + e.clip.w / 2, y: e.clip.y + e.clip.h * 0.45 }
        : null;
    for (let i = 0; i < rate; i += 1) {
      if (Math.random() < 0.85) spawnRainDrop(e, origin, e.mode);
    }
  }

  const next: Piece[] = [];
  for (const p of e.pieces) {
    if (idleFade > 0) {
      p.alpha = clamp(p.alpha * (1 - idleFade * 0.35) - idleFade * 0.04, 0, 1);
      if (p.alpha < 0.03) continue;
    }

    if (p.settled) {
      p.flutter += p.flutterSpeed * 0.35;
      next.push(p);
      continue;
    }

    const age = now - p.bornAt;
    if (!p.canPile && age > p.lifeMs) continue;

    const gravity = p.canPile ? 0.11 : 0.085;
    p.windPhase += 0.03;
    p.flutter += p.flutterSpeed;
    p.vx += Math.sin(p.windPhase) * p.windAmp * 0.04;
    p.vy += gravity;
    p.vx *= airDrag;
    p.vy *= airDrag;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin * (0.55 + Math.abs(Math.sin(p.flutter)) * 0.45);

    if (p.canPile) {
      const floorY = height - FLOOR_PAD - pileHeightAt(e, p.x);
      if (p.y >= floorY && p.vy >= 0) {
        p.y = floorY;
        p.vy *= -0.18;
        p.vx *= 0.55;
        p.spin *= 0.4;
        if (Math.abs(p.vy) < 0.55 && Math.abs(p.vx) < 0.9) {
          p.settled = true;
          p.vx = 0;
          p.vy = 0;
          p.spin = 0;
          p.y = height - FLOOR_PAD - pileHeightAt(e, p.x);
          growPile(e, p.x, Math.max(p.w, p.h) * PILE_GROW * (0.55 + Math.random() * 0.5));
          p.alpha = 1;
        }
        next.push(p);
        continue;
      }
      if (p.x < -20) {
        p.x = 2;
        p.vx = Math.abs(p.vx) * 0.3;
      } else if (p.x > width + 20) {
        p.x = width - 2;
        p.vx = -Math.abs(p.vx) * 0.3;
      }
      next.push(p);
      continue;
    }

    const lifeFade = 1 - age / p.lifeMs;
    p.alpha = clamp(lifeFade, 0, 1);
    if (p.alpha < 0.02) continue;
    if (p.y > height + 40 || p.x < -60 || p.x > width + 60) continue;
    next.push(p);
  }

  if (idleFade >= 1) {
    e.pieces = [];
    clearPile(e);
    e.idleFadeAt = 0;
  } else {
    e.pieces = next;
  }

  ctx.clearRect(0, 0, width, height);

  const localFlying: Piece[] = [];
  const pileFlying: Piece[] = [];
  const settled: Piece[] = [];
  for (const p of e.pieces) {
    if (p.settled) settled.push(p);
    else if (p.canPile) pileFlying.push(p);
    else localFlying.push(p);
  }

  for (const p of settled) drawConfettiPiece(ctx, p);
  for (const p of pileFlying) drawConfettiPiece(ctx, p);

  if (localFlying.length > 0 && e.clip && e.mode === "local") {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      e.clip.x + e.clip.w / 2,
      e.clip.y + e.clip.h / 2,
      e.clip.w * 0.55,
      e.clip.h * 0.55,
      0,
      0,
      Math.PI * 2,
    );
    ctx.clip();
    for (const p of localFlying) drawConfettiPiece(ctx, p);
    ctx.restore();
  } else {
    for (const p of localFlying) drawConfettiPiece(ctx, p);
  }
}

function drawConfettiPiece(ctx: CanvasRenderingContext2D, p: Piece) {
  const scaleX = p.settled ? 0.55 + Math.abs(Math.sin(p.flutter)) * 0.45 : 0.18 + Math.abs(Math.sin(p.flutter)) * 0.82;
  const scaleY = 0.85 + Math.abs(Math.cos(p.flutter * 0.7)) * 0.15;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(scaleX, scaleY);
  ctx.globalAlpha = p.alpha;
  ctx.fillStyle = p.color;

  if (p.shape === "dot") {
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(p.w, p.h) * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.shape === "streamer") {
    ctx.beginPath();
    ctx.moveTo(-p.w * 0.5, -p.h * 0.5);
    ctx.quadraticCurveTo(p.w * 0.2, -p.h * 0.1, -p.w * 0.25, p.h * 0.5);
    ctx.lineTo(p.w * 0.25, p.h * 0.5);
    ctx.quadraticCurveTo(-p.w * 0.1, p.h * 0.1, p.w * 0.5, -p.h * 0.5);
    ctx.closePath();
    ctx.fill();
  } else {
    const r = Math.min(1.5, p.w * 0.2);
    const w = p.w;
    const h = p.h;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5 + r, -h * 0.5);
    ctx.lineTo(w * 0.5 - r, -h * 0.5);
    ctx.quadraticCurveTo(w * 0.5, -h * 0.5, w * 0.5, -h * 0.5 + r);
    ctx.lineTo(w * 0.5, h * 0.5 - r);
    ctx.quadraticCurveTo(w * 0.5, h * 0.5, w * 0.5 - r, h * 0.5);
    ctx.lineTo(-w * 0.5 + r, h * 0.5);
    ctx.quadraticCurveTo(-w * 0.5, h * 0.5, -w * 0.5, h * 0.5 - r);
    ctx.lineTo(-w * 0.5, -h * 0.5 + r);
    ctx.quadraticCurveTo(-w * 0.5, -h * 0.5, -w * 0.5 + r, -h * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Micro-célébration autour de la carte (usage quotidien « Terminé »).
 */
export function celebrateTaskDone(options?: CelebrateOptions): void {
  if (prefersReducedMotion()) return;
  const now = Date.now();
  if (now - lastCelebrateAt < THROTTLE_MS) return;
  lastCelebrateAt = now;

  const run = () => {
    const origin = resolveOrigin(options);
    startCelebration(origin ? "local" : "fullscreen", origin);
  };

  if (options?.taskId && !options.origin) {
    requestAnimationFrame(() => requestAnimationFrame(run));
    return;
  }
  run();
}

/**
 * Fête plein écran : canons centre → extérieur + pluie + empilement.
 */
export function celebrateTaskManually(): void {
  if (prefersReducedMotion()) return;
  lastCelebrateAt = Date.now();
  startCelebration("fullscreen", null);
}
