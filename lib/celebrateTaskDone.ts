const COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#ea580c", "#eab308", "#d946ef", "#06b6d4"];

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  spin: number;
  wobble: number;
  wobbleSpeed: number;
  color: string;
  shape: "rect" | "streamer";
  settled: boolean;
};

type Engine = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pieces: Piece[];
  activePieces: Piece[];
  width: number;
  height: number;
  dpr: number;
  rafId: number | null;
  running: boolean;
  floorHeights: number[];
  settledCanvas: HTMLCanvasElement;
  settledCtx: CanvasRenderingContext2D;
  settledDirty: boolean;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
};

let lastCelebrateAt = 0;
const THROTTLE_MS = 750;
const MAX_PIECES = 9000;
const FLOOR_BUCKET = 8;
const INACTIVITY_CLEAR_MS = 10_000;

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
  const settledCanvas = document.createElement("canvas");
  const settledCtx = settledCanvas.getContext("2d", { alpha: true });
  if (!settledCtx) return null;

  engine = {
    canvas,
    ctx,
    pieces: [],
    activePieces: [],
    width: 0,
    height: 0,
    dpr: 1,
    rafId: null,
    running: false,
    floorHeights: [],
    settledCanvas,
    settledCtx,
    settledDirty: true,
    cleanupTimer: null,
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
  engine.settledCanvas.width = Math.floor(w * dpr);
  engine.settledCanvas.height = Math.floor(h * dpr);
  engine.settledCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  engine.settledCtx.clearRect(0, 0, w, h);
  engine.settledDirty = true;

  const bucketCount = Math.ceil(w / FLOOR_BUCKET) + 1;
  const old = engine.floorHeights;
  engine.floorHeights = new Array(bucketCount).fill(0);
  if (old.length > 0) {
    for (let i = 0; i < engine.floorHeights.length; i += 1) {
      const oldIdx = Math.floor((i / engine.floorHeights.length) * old.length);
      engine.floorHeights[i] = old[oldIdx] ?? 0;
    }
  }
}

function scheduleCleanup() {
  if (!engine) return;
  if (engine.cleanupTimer) {
    clearTimeout(engine.cleanupTimer);
  }
  engine.cleanupTimer = setTimeout(() => {
    if (!engine) return;
    engine.pieces = [];
    engine.activePieces = [];
    engine.floorHeights.fill(0);
    engine.settledCtx.clearRect(0, 0, engine.width, engine.height);
    engine.settledDirty = false;
    engine.ctx.clearRect(0, 0, engine.width, engine.height);
  }, INACTIVITY_CLEAR_MS);
}

function spawnBurst(power: number) {
  const e = ensureEngine();
  if (!e) return;
  scheduleCleanup();

  const centerX = e.width * 0.5;
  const spawnY = e.height * 0.22;
  const count = Math.floor(220 * power);

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 8 * power;
    const isStreamer = Math.random() < 0.28;
    const w = isStreamer ? 3 + Math.random() * 2 : 5 + Math.random() * 6;
    const h = isStreamer ? 14 + Math.random() * 18 : 4 + Math.random() * 6;
    e.pieces.push({
      x: centerX + (Math.random() - 0.5) * e.width * 0.22,
      y: spawnY + (Math.random() - 0.5) * 60,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 6,
      vy: -8 - Math.random() * 7,
      w,
      h,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.34,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.12,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: isStreamer ? "streamer" : "rect",
      settled: false,
    });
  }

  if (e.pieces.length > MAX_PIECES) {
    e.pieces.splice(0, e.pieces.length - MAX_PIECES);
    e.activePieces = e.pieces.filter((p) => !p.settled);
    e.settledDirty = true;
  }

  e.activePieces = e.pieces.filter((p) => !p.settled);
  startLoop();
}

function startLoop() {
  if (!engine || engine.running) return;
  engine.running = true;

  const step = () => {
    if (!engine) return;
    updateAndDraw(engine);

    if (engine.activePieces.length > 0) {
      engine.rafId = window.requestAnimationFrame(step);
      return;
    }

    engine.running = false;
    if (engine.rafId) {
      window.cancelAnimationFrame(engine.rafId);
      engine.rafId = null;
    }
  };

  engine.rafId = window.requestAnimationFrame(step);
}

function updateAndDraw(e: Engine) {
  const { ctx, width, height } = e;
  const gravity = 0.22;
  const friction = 0.988;

  const nextActive: Piece[] = [];
  let settledThisFrame = false;

  for (const p of e.activePieces) {
    p.vy += gravity;
    p.vx *= friction;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin;
    p.wobble += p.wobbleSpeed;

    p.x = clamp(p.x, -40, width + 40);

    const col = clamp(Math.floor(p.x / FLOOR_BUCKET), 0, e.floorHeights.length - 1);
    const floorY = height - e.floorHeights[col];
    const footprint = Math.max(2, Math.min(p.w, p.h) * 0.7);

    if (p.y >= floorY - footprint) {
      p.y = floorY - footprint;
      p.vx = 0;
      p.vy = 0;
      p.spin = 0;
      p.wobbleSpeed = 0;
      p.settled = true;
      e.floorHeights[col] = Math.min(height * 0.97, e.floorHeights[col] + footprint * 0.75);
      settledThisFrame = true;
      continue;
    }
    nextActive.push(p);
  }

  e.activePieces = nextActive;

  if (settledThisFrame) {
    e.settledDirty = true;
  }
  if (e.settledDirty) {
    e.settledCtx.clearRect(0, 0, width, height);
    for (const p of e.pieces) {
      if (p.settled) drawConfettiPiece(e.settledCtx, p, true);
    }
    e.settledDirty = false;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(e.settledCanvas, 0, 0, width, height);
  for (const p of e.activePieces) {
    drawConfettiPiece(ctx, p, false);
  }
}

function drawConfettiPiece(ctx: CanvasRenderingContext2D, p: Piece, settled: boolean) {
  const flutter = settled ? 1 : 0.68 + Math.abs(Math.sin(p.wobble)) * 0.55;
  const w = p.w * flutter;
  const h = p.h;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = p.color;

  if (p.shape === "streamer") {
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.5);
    ctx.quadraticCurveTo(0, -h * 0.15, -w * 0.35, h * 0.5);
    ctx.lineTo(w * 0.35, h * 0.5);
    ctx.quadraticCurveTo(0, h * 0.12, w * 0.5, -h * 0.5);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
  }

  ctx.restore();
}

/**
 * Confettis + effet « fête » quand une tâche passe en « Terminé ».
 * Limité dans le temps pour les glisser-déposer groupés vers Terminé.
 */
export function celebrateTaskDone(): void {
  if (prefersReducedMotion()) return;
  const now = Date.now();
  if (now - lastCelebrateAt < THROTTLE_MS) return;
  lastCelebrateAt = now;
  spawnBurst(1);
}

/**
 * Lance la même animation à la demande (bouton), sans délai anti-spam.
 */
export function celebrateTaskManually(): void {
  if (prefersReducedMotion()) return;
  lastCelebrateAt = Date.now();
  spawnBurst(1.2);
}
