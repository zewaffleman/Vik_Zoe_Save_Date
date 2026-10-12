/**
 * DOODLES: the whimsical bits on the title screen and invite card.
 *
 * Little vector drawings taken from the concept board: spiky thistle
 * "aliens", marigolds, jalebi swirls, a melted-plate blob with a hole, a
 * ringed planet, sparkles and squiggles. They're generated here as an SVG
 * <symbol> sprite (no image files), then placed in the HTML with:
 *
 *   <svg class="doodle" data-doodle="thistle"></svg>
 *
 * Every doodle runs through one SVG "boil" filter (turbulence + displacement)
 * whose random seed is swapped at CONFIG.boil.fps, so they wobble in step
 * with the hand-drawn PNGs.
 *
 * Frames (data-frame="oval" / "box") are stretchy hand-drawn outlines that
 * wrap text (the date, the "Tap to begin" button). They use
 * non-scaling strokes so the line stays the same weight at any size.
 */
import { gsap } from 'gsap';

const INK = 'var(--ink)';

// --- tiny helpers -----------------------------------------------------------
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
const f = (n) => n.toFixed(1);

/** Smooth closed path through points (midpoint quadratics). */
function smooth(pts) {
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[pts.length - 1], pts[0]);
  let d = `M${f(m0[0])} ${f(m0[1])}`;
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length]);
    d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  });
  return `${d}Z`;
}

function wobblyEllipse(cx, cy, rx, ry, n, amp, seed) {
  const r = rng(seed);
  return smooth(
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const k = 1 + (r() * 2 - 1) * amp;
      return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
    }),
  );
}

// --- the drawings (all in a 100×100 box unless noted) -----------------------
const S = {};

// Spiky thistle / alien urchin (lilac)
S.thistle = (() => {
  const r = rng(3);
  let spikes = '';
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + r() * 0.08;
    const r0 = 20, r1 = 38 + r() * 9;
    const x1 = 50 + Math.cos(a) * r1, y1 = 50 + Math.sin(a) * r1;
    spikes += `<path d="M${f(50 + Math.cos(a) * r0)} ${f(50 + Math.sin(a) * r0)}L${f(x1)} ${f(y1)}"/>`;
    spikes += `<circle cx="${f(x1)}" cy="${f(y1)}" r="2.2" style="fill:var(--lilac)"/>`;
  }
  return `
    <g style="stroke:#9B83C4;stroke-width:2.6;stroke-linecap:round">${spikes}</g>
    <path d="${wobblyEllipse(50, 50, 22, 22, 14, 0.05, 4)}" style="fill:var(--lilac);stroke:${INK};stroke-width:2.2"/>
    <path d="M40 44q4 -5 9 -4" style="fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;opacity:.7"/>`;
})();

// Marigold (peach, rust, brass centre)
S.marigold = (() => {
  const scallop = (R, bump, n, rot) => {
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 + rot;
      const am = ((i - 0.5) / n) * Math.PI * 2 + rot;
      const p = [50 + Math.cos(a) * R, 50 + Math.sin(a) * R];
      const c = [50 + Math.cos(am) * (R + bump), 50 + Math.sin(am) * (R + bump)];
      d += i === 0 ? `M${f(p[0])} ${f(p[1])}` : `Q${f(c[0])} ${f(c[1])} ${f(p[0])} ${f(p[1])}`;
    }
    return `${d}Z`;
  };
  return `
    <path d="${scallop(36, 14, 13, 0)}" style="fill:var(--peach);stroke:${INK};stroke-width:2.2;stroke-linejoin:round"/>
    <path d="${scallop(22, 10, 10, 0.3)}" style="fill:var(--rust);stroke:${INK};stroke-width:1.8;stroke-linejoin:round"/>
    <path d="${wobblyEllipse(50, 50, 9, 9, 10, 0.08, 9)}" style="fill:var(--brass);stroke:${INK};stroke-width:1.6"/>`;
})();

// Jalebi swirl: an outlined spiral "tube"
S.swirl = (() => {
  let d = '';
  for (let t = 0; t <= 13.2; t += 0.25) {
    const rad = 3 + 2.95 * t;
    const x = 50 + Math.cos(t) * rad, y = 50 + Math.sin(t) * rad;
    d += `${t === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`;
  }
  return `
    <path d="${d}" style="fill:none;stroke:${INK};stroke-width:10;stroke-linecap:round;stroke-linejoin:round"/>
    <path d="${d}" style="fill:none;stroke:var(--peach);stroke-width:6.5;stroke-linecap:round;stroke-linejoin:round"/>
    <path d="${d}" style="fill:none;stroke:#FFD08A;stroke-width:1.6;stroke-linecap:round;opacity:.8"/>`;
})();

// Melted-plate blob with an off-centre hole (from the board's silver dish)
S.blob = (() => {
  const outer = smooth([[18, 30], [40, 12], [70, 16], [88, 38], [84, 66], [62, 90], [34, 86], [14, 62]]);
  const hole = wobblyEllipse(58, 44, 13, 10, 10, 0.08, 12);
  return `<path d="${outer} ${hole}" style="fill:var(--matcha);fill-rule:evenodd;stroke:${INK};stroke-width:2.2"/>
    <path d="M30 70q10 8 22 8" style="fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;opacity:.5"/>`;
})();

// Ringed alien planet
S.planet = `
  <g transform="rotate(-18 50 50)">
    <path d="M8 50a42 12 0 0 1 84 0" style="fill:none;stroke:${INK};stroke-width:7"/>
    <path d="M8 50a42 12 0 0 1 84 0" style="fill:none;stroke:var(--matcha);stroke-width:4"/>
  </g>
  <path d="${wobblyEllipse(50, 50, 22, 22, 14, 0.04, 21)}" style="fill:var(--berry);stroke:${INK};stroke-width:2.2"/>
  <path d="M40 40q6 -6 14 -4M38 56q10 6 22 2" style="fill:none;stroke:var(--rust);stroke-width:2;stroke-linecap:round;opacity:.7"/>
  <g transform="rotate(-18 50 50)">
    <path d="M92 50a42 12 0 0 1 -84 0" style="fill:none;stroke:${INK};stroke-width:7"/>
    <path d="M92 50a42 12 0 0 1 -84 0" style="fill:none;stroke:var(--matcha);stroke-width:4"/>
  </g>`;

// Sparkle (4-point star)
S.sparkle = `<path d="M50 6Q54 46 94 50Q54 54 50 94Q46 54 6 50Q46 46 50 6Z" style="fill:var(--brass);stroke:${INK};stroke-width:2"/>`;
S['sparkle-light'] = `<path d="M50 6Q54 46 94 50Q54 54 50 94Q46 54 6 50Q46 46 50 6Z" style="fill:var(--cream)"/>`;

// Squiggle line (viewBox 0 0 120 16)
S.squiggle = (() => {
  let d = 'M2 8';
  for (let x = 2; x < 118; x += 12) d += `Q${x + 6} ${x % 24 === 2 ? 1 : 15} ${x + 12} 8`;
  return `<path d="${d}" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"/>`;
})();

// Little orbit: dashed ellipse + a moon
S.orbit = `
  <ellipse cx="50" cy="50" rx="44" ry="16" transform="rotate(-12 50 50)" style="fill:none;stroke:currentColor;stroke-width:1.6;stroke-dasharray:4 5"/>
  <circle cx="88" cy="40" r="5" style="fill:var(--peach);stroke:${INK};stroke-width:1.5"/>`;

const VIEWBOX = { squiggle: '0 0 120 16' };

// Stretchy hand-drawn frames (viewBox 0 0 200 60, stretched to fit)
const FRAMES = {
  oval: [wobblyEllipse(100, 30, 96, 26, 18, 0.03, 31), wobblyEllipse(101, 31, 95, 27, 18, 0.04, 32)],
  box: (() => {
    const pts = (seed, j) => {
      const r = rng(seed);
      const raw = [[4, 6], [60, 4], [140, 5], [196, 4], [197, 30], [195, 56], [140, 55], [60, 57], [4, 55], [3, 30]];
      return raw.map(([x, y]) => [x + (r() * 2 - 1) * j, y + (r() * 2 - 1) * j]);
    };
    const path = (p) => `M${p.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
    return [path(pts(41, 1.5)), path(pts(42, 2))];
  })(),
};

// --- mount ------------------------------------------------------------------

export function initDoodles({ fps, animate }) {
  const NS = 'http://www.w3.org/2000/svg';
  const sprite = document.createElementNS(NS, 'svg');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  sprite.innerHTML = `
    <defs>
      <filter id="doodle-boil" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1" />
        <feDisplacementMap in="SourceGraphic" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
    ${Object.entries(S)
      .map(([id, body]) => `<symbol id="d-${id}" viewBox="${VIEWBOX[id] ?? '0 0 100 100'}">${body}</symbol>`)
      .join('')}`;
  document.body.prepend(sprite);

  document.querySelectorAll('svg[data-doodle]').forEach((svg) => {
    const id = svg.dataset.doodle;
    svg.setAttribute('viewBox', VIEWBOX[id] ?? '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<use href="#d-${id}" filter="url(#doodle-boil)" />`;
  });

  document.querySelectorAll('svg[data-frame]').forEach((svg) => {
    const [a, b] = FRAMES[svg.dataset.frame];
    svg.setAttribute('viewBox', '0 0 200 60');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<g filter="url(#doodle-boil)" style="fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round">
        <path d="${a}" vector-effect="non-scaling-stroke" style="stroke-width:1.6"/>
        <path d="${b}" vector-effect="non-scaling-stroke" style="stroke-width:0.9;opacity:.55"/>
      </g>`;
  });

  // Boil: cycle the turbulence seed at the same rate as the drawings
  if (!animate || !fps) return;
  const turb = sprite.querySelector('feTurbulence');
  let last = -1;
  gsap.ticker.add((time) => {
    const frame = Math.floor(time * fps) % 3;
    if (frame !== last) {
      turb.setAttribute('seed', String(frame + 1));
      last = frame;
    }
  });
}
