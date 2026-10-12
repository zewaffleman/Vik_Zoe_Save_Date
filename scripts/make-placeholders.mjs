/**
 * Generates PLACEHOLDER hand-drawn-style art into public/assets/ so the
 * animation can be built and timed before the real drawings exist.
 *
 *   npm run placeholders
 *
 * The look it fakes: sketchy double-pass ink lines, fills that don't quite
 * line up with the outline (like risograph/colouring-in), and paper grain.
 * Each "boil" frame is the same drawing redrawn with a different wobble
 * seed. Replace any file with your real drawing (same name, transparent
 * PNG) and the animation picks it up.
 *
 * Earth and Io are NOT drawn here. They're real 3D globes using NASA/USGS
 * textures in public/assets/textures/.
 *
 * Everything is designed in on-screen "stage units" and rendered at 3x for
 * crisp phones (see `S`).
 */
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
const S = 3; // render scale

const C = {
  ink: '#2E1A3A',
  cream: '#FBF4E8',
  blush: '#F6CFC4',
  lilac: '#C7B0DA',
  rust: '#C24A33',
  berry: '#EC9AA3',
  peach: '#F2825E',
  matcha: '#A3B437',
  brass: '#C39B55',
  flameCore: '#FFE4A6',
  flameMid: '#F8C35A',
  skin: '#E6B893', // placeholder only
  hairA: '#2A1B18',
  hairB: '#5B3424',
};

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wobble = (pts, amp, r) => pts.map(([x, y]) => [x + (r() * 2 - 1) * amp, y + (r() * 2 - 1) * amp]);

function smoothPath(ctx, pts, closed = true) {
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  if (!closed) {
    ctx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(...pts[i], ...mid(pts[i], pts[i + 1]));
    ctx.lineTo(...pts[pts.length - 1]);
    return;
  }
  ctx.moveTo(...mid(pts[pts.length - 1], pts[0]));
  for (let i = 0; i < pts.length; i++) ctx.quadraticCurveTo(...pts[i], ...mid(pts[i], pts[(i + 1) % pts.length]));
  ctx.closePath();
}

const ellipse = (cx, cy, rx, ry, n = 22) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });

/**
 * The core "hand-drawn" mark: a slightly offset colour fill, then two ink
 * passes that each wobble differently, so the line looks re-traced.
 */
function sketch(ctx, pts, r, { fill, amp = 0.6, lw = 1.1, closed = true, ink = C.ink, passes = 2 } = {}) {
  if (fill) {
    ctx.save();
    ctx.translate((r() - 0.5) * 1.2, (r() - 0.5) * 1.2); // misregistered fill
    smoothPath(ctx, wobble(pts, amp * 1.2, r), closed);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < passes; i++) {
    ctx.globalAlpha = i === 0 ? 0.92 : 0.45;
    ctx.lineWidth = i === 0 ? lw : lw * 0.6;
    smoothPath(ctx, wobble(pts, amp, r), closed);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A single wobbly pencil line. */
function line(ctx, pts, r, { lw = 1.1, amp = 0.4, color = C.ink, alpha = 0.9 } = {}) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  smoothPath(ctx, wobble(pts, amp, r), false);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Diagonal pencil hatching inside a clip shape (for shading). */
function hatch(ctx, clipPts, r, { from, to, gap = 2.2, color = C.ink, alpha = 0.28, lw = 0.6 }) {
  ctx.save();
  smoothPath(ctx, clipPts);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.globalAlpha = alpha;
  for (let x = from[0]; x < to[0]; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x + (r() - 0.5), from[1]);
    ctx.lineTo(x + (to[1] - from[1]) * 0.5 + (r() - 0.5), to[1]);
    ctx.stroke();
  }
  ctx.restore();
}

/** Paper grain: specks only where something is already drawn. */
function grain(ctx, w, h, r, amount = 0.06) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  const n = (w * h) / 14;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = r() > 0.5 ? `rgba(46,26,58,${amount})` : `rgba(255,255,255,${amount * 1.4})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  ctx.restore();
}

function canvas(w, h) {
  const cv = createCanvas(w * S, h * S);
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);
  return { cv, ctx, finish: (r) => (grain(ctx, w * S, h * S, r), cv) };
}

function save(cv, rel) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, cv.toBuffer('image/png'));
  console.log('  wrote', rel);
}

// ---------------------------------------------------------------------------
// Rocket: 100 × 180 stage units. Base of fins/nozzle at y≈168.
// Porthole glass: centre (50, 78), r 10 (passengers image sits on top).
// ---------------------------------------------------------------------------

const ROCKET_BODY = [
  [50, 6], [63, 22], [71, 48], [75, 85], [74, 120], [68, 145], [58, 156],
  [42, 156], [32, 145], [26, 120], [25, 85], [29, 48], [37, 22],
];

function rocket(seed) {
  const { ctx, finish } = canvas(100, 180);
  const r = rng(seed);

  for (const s of [-1, 1]) {
    const fin = [[50 + s * 20, 112], [50 + s * 42, 150], [50 + s * 40, 168], [50 + s * 16, 150]];
    sketch(ctx, fin, r, { fill: C.rust });
  }
  sketch(ctx, [[40, 152], [60, 152], [57, 168], [43, 168]], r, { fill: C.brass });

  sketch(ctx, ROCKET_BODY, r, { fill: C.cream, passes: 0 });
  ctx.save();
  smoothPath(ctx, ROCKET_BODY);
  ctx.clip();
  smoothPath(ctx, wobble([[0, 0], [100, 0], [100, 42], [50, 50], [0, 42]], 0.8, r));
  ctx.fillStyle = C.berry;
  ctx.fill();
  smoothPath(ctx, wobble([[0, 130], [100, 130], [100, 137], [0, 137]], 0.6, r));
  ctx.fillStyle = C.lilac;
  ctx.fill();
  ctx.restore();
  hatch(ctx, ROCKET_BODY, r, { from: [60, 0], to: [110, 170] }); // shading on the right
  sketch(ctx, ROCKET_BODY, r, { lw: 1.3 });

  // Door hatch (where the couple climb in)
  sketch(ctx, [[40, 98], [60, 98], [61, 124], [39, 124]], r, { lw: 0.8, amp: 0.4 });
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(56, 112, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Porthole
  sketch(ctx, ellipse(50, 78, 15, 15), r, { fill: C.brass, lw: 1.1 });
  sketch(ctx, ellipse(50, 78, 10.5, 10.5), r, { fill: '#9E8BC0', lw: 0.8 });

  return finish(r);
}

// Two tiny faces in the porthole during the flight (20 × 20 units)
function passengers(seed) {
  const { ctx, finish } = canvas(20, 20);
  const r = rng(seed);
  ctx.save();
  ctx.beginPath();
  ctx.arc(10, 10, 10, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#B7A5D4';
  ctx.fillRect(0, 0, 20, 20);
  const face = (cx, hair, long) => {
    if (long) sketch(ctx, ellipse(cx, 11, 5.2, 6), r, { fill: hair, lw: 0.4, amp: 0.2, passes: 1 });
    sketch(ctx, ellipse(cx, 12, 4, 4.3), r, { fill: C.skin, lw: 0.45, amp: 0.2 });
    sketch(ctx, [[cx - 4.2, 11], [cx - 3, 7.6], [cx + 3, 7.6], [cx + 4.2, 11], [cx, 9]], r, { fill: hair, lw: 0.4, amp: 0.2, passes: 1 });
    ctx.fillStyle = C.ink;
    for (const dx of [-1.4, 1.4]) ctx.fillRect(cx + dx - 0.4, 12, 0.8, 0.9);
  };
  face(6.5, C.hairA, false);
  face(13.5, C.hairB, true);
  ctx.restore();
  return finish(r);
}

// ---------------------------------------------------------------------------
// Flame: 60 × 80 units, 4 flicker frames
// ---------------------------------------------------------------------------

function flame(i) {
  const { ctx, finish } = canvas(60, 80);
  const r = rng(500 + i);
  const len = [66, 76, 58, 72][i];
  const lean = [-2, 3, 1, -3][i];
  const shape = (w, l) => [
    [30 - w, 3], [30 + w, 3], [30 + w * 0.8, l * 0.45], [30 + lean + w * 0.2, l * 0.85],
    [30 + lean, l], [30 + lean - w * 0.2, l * 0.85], [30 - w * 0.8, l * 0.45],
  ];
  sketch(ctx, shape(15, len), r, { fill: C.peach, lw: 0.9, amp: 1 });
  sketch(ctx, shape(9, len * 0.7), r, { fill: C.flameMid, lw: 0, amp: 0.8, passes: 0 });
  sketch(ctx, shape(4.5, len * 0.42), r, { fill: C.flameCore, lw: 0, amp: 0.6, passes: 0 });
  return finish(r);
}

// ---------------------------------------------------------------------------
// Miis: 44 × 64 units, bottom-centre = feet. Mii-INSPIRED originals:
// big round head, dot eyes, simple body. A = Vik, B = Zoe (placeholders!)
// Poses: stand (boil ×2), walk (2 steps), sit (boil ×2)
// ---------------------------------------------------------------------------

const MII = {
  a: { hair: C.hairA, long: false, outfit: C.rust, dress: false },
  b: { hair: C.hairB, long: true, outfit: C.lilac, dress: true },
};

function mii(who, pose, frame) {
  const { ctx, finish } = canvas(44, 64);
  const r = rng(who.charCodeAt(0) * 100 + pose.length * 10 + frame);
  const m = MII[who];
  const sit = pose === 'sit';
  const oy = sit ? 10 : 0; // sitting = everything lower

  // Legs
  if (sit) {
    for (const y of [59, 61.5]) line(ctx, [[20, y - 3], [30, y - 1], [37, y]], r, { lw: 2.2 });
  } else if (pose === 'walk' && frame === 1) {
    line(ctx, [[19, 49], [15, 62]], r, { lw: 2.4 });
    line(ctx, [[25, 49], [30, 62]], r, { lw: 2.4 });
  } else {
    line(ctx, [[19, 49], [19, 62]], r, { lw: 2.4 });
    line(ctx, [[25, 49], [25, 62]], r, { lw: 2.4 });
  }

  // Arms
  const swing = pose === 'walk' ? (frame === 1 ? 4 : -2) : 0;
  line(ctx, [[14, 32 + oy], [10 - swing, 44 + oy]], r, { lw: 1.6 });
  line(ctx, [[30, 32 + oy], [34 + swing, 44 + oy]], r, { lw: 1.6 });

  // Body
  const body = m.dress
    ? [[16, 29], [28, 29], [33, 50], [11, 50]]
    : [[14, 29], [30, 29], [31, 49], [13, 49]];
  sketch(ctx, body.map(([x, y]) => [x, y + oy]), r, { fill: m.outfit, lw: 1 });
  if (!m.dress) line(ctx, [[22, 30 + oy], [22, 48 + oy]], r, { lw: 0.6, alpha: 0.5 }); // jacket seam

  // Head + hair
  const hy = 16 + oy;
  if (m.long) sketch(ctx, [[8, hy + 2], [11, hy - 11], [33, hy - 11], [36, hy + 2], [35, hy + 11], [9, hy + 11]], r, { fill: m.hair, lw: 0.8 });
  sketch(ctx, ellipse(22, hy, 11.5, 12), r, { fill: C.skin, lw: 1 });
  sketch(ctx, [[10, hy - 1], [12, hy - 10], [22, hy - 13.5], [32, hy - 10], [34, hy - 1], [26, hy - 6], [17, hy - 5]], r, { fill: m.hair, lw: 0.9 });
  ctx.fillStyle = C.ink;
  for (const x of [18, 26]) {
    ctx.beginPath();
    ctx.ellipse(x, hy + 1.5, 1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  line(ctx, [[19.5, hy + 6], [22, hy + 7.4], [24.5, hy + 6]], r, { lw: 0.8 });
  ctx.fillStyle = 'rgba(236,154,163,0.55)';
  for (const x of [15, 29]) {
    ctx.beginPath();
    ctx.arc(x, hy + 5, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(r);
}

// ---------------------------------------------------------------------------
// Flag: 40 × 56 units, bottom of pole = bottom-centre-left. Text is HTML
// (see CONFIG.flag.text) so the date is editable; cloth area ≈ x 7–37, y 5–25.
// ---------------------------------------------------------------------------

function flag(seed) {
  const { ctx, finish } = canvas(40, 56);
  const r = rng(seed);
  line(ctx, [[6, 56], [6, 30], [6, 4]], r, { lw: 1.6 });
  sketch(ctx, ellipse(6, 3.5, 2.2, 2.2, 10), r, { fill: C.brass, lw: 0.6 });
  sketch(ctx, [[7, 5], [22, 3], [37, 6], [36, 16], [37, 25], [22, 23], [7, 26]], r, { fill: C.cream, lw: 1 });
  return finish(r);
}

// ---------------------------------------------------------------------------
// Stars: tileable hand-drawn layers (displayed at 512 css px, drawn at 2x)
// ---------------------------------------------------------------------------

function starTile(seed, count, kind) {
  const T = 1024;
  const cv = createCanvas(T, T);
  const ctx = cv.getContext('2d');
  const r = rng(seed);
  const draw = (x, y) => {
    if (kind === 'dot') {
      ctx.fillStyle = r() > 0.3 ? 'rgba(251,244,232,0.6)' : 'rgba(199,176,218,0.7)';
      ctx.beginPath();
      ctx.arc(x, y, 1 + r() * 1.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const s = kind === 'cross' ? 4 + r() * 3 : 8 + r() * 5;
      const col = r() > 0.5 ? C.cream : C.brass;
      line(ctx, [[x - s, y + (r() - 0.5)], [x + s, y + (r() - 0.5)]], r, { lw: 1.6, color: col, amp: 0.6 });
      line(ctx, [[x + (r() - 0.5), y - s], [x + (r() - 0.5), y + s]], r, { lw: 1.6, color: col, amp: 0.6 });
      if (kind === 'star') {
        const d = s * 0.45;
        line(ctx, [[x - d, y - d], [x + d, y + d]], r, { lw: 1, color: col, alpha: 0.6 });
        line(ctx, [[x + d, y - d], [x - d, y + d]], r, { lw: 1, color: col, alpha: 0.6 });
      }
    }
  };
  for (let i = 0; i < count; i++) {
    const x = r() * T, y = r() * T;
    for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) draw(x + ox, y + oy);
  }
  return cv;
}

function twinkle() {
  const cv = createCanvas(128, 128);
  const ctx = cv.getContext('2d');
  const r = rng(7);
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? 14 : 58;
    pts.push([64 + Math.cos(a) * rad, 64 + Math.sin(a) * rad]);
  }
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  line(ctx, [...pts, pts[0]], r, { lw: 3, color: C.brass, amp: 1.5 });
  return cv;
}

// ---------------------------------------------------------------------------

console.log('Generating placeholder assets →', OUT);
for (let f = 1; f <= 3; f++) save(rocket(100 + f), `rocket/rocket_boil${f}.png`);
for (let f = 1; f <= 2; f++) save(passengers(200 + f), `rocket/rocket_passengers${f}.png`);
for (let i = 0; i < 4; i++) save(flame(i), `rocket/rocket_flame${i + 1}.png`);
for (const who of ['a', 'b']) {
  for (let f = 1; f <= 2; f++) {
    save(mii(who, 'stand', f), `miis/mii_${who}_stand${f}.png`);
    save(mii(who, 'walk', f), `miis/mii_${who}_walk${f}.png`);
    save(mii(who, 'sit', f), `miis/mii_${who}_sit${f}.png`);
  }
}
for (let f = 1; f <= 2; f++) save(flag(300 + f), `flag/flag_boil${f}.png`);
save(starTile(11, 160, 'dot'), 'stars/stars_far.png');
save(starTile(22, 40, 'cross'), 'stars/stars_mid.png');
save(starTile(33, 10, 'star'), 'stars/stars_near.png');
save(twinkle(), 'stars/twinkle.png');
console.log('Done.');
