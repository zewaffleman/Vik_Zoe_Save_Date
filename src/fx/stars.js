/**
 * STARFIELD: parallax layers + twinkles.
 *
 * Each layer is an oversized div with a repeating star tile as its
 * background. We slide it with a GPU transform and wrap the offset every
 * tileSize px, so it scrolls forever without seams.
 *
 * `state.speed` is the "flight speed" multiplier (0 = still, 1 = cruising).
 * The master timeline tweens it, and the ticker below integrates it into
 * movement. Stars stay SMOOTH (not stepped); that contrast is what makes
 * the stepped characters read as hand-animated.
 */
import { gsap } from 'gsap';

export function createStars(root, cfg, assets, { reduced }) {
  const state = { speed: cfg.idleSpeed };
  const tile = cfg.tileSize;

  const layers = Object.entries(cfg.layers).map(([name, l]) => {
    const el = document.createElement('div');
    el.className = `star-layer star-layer--${name}`;
    el.style.cssText = `
      inset: ${-tile}px;
      background-image: url("${assets.stars[name]}");
      background-size: ${tile}px ${tile}px;
      opacity: ${l.opacity};`;
    root.appendChild(el);
    return { el, ...l, ox: Math.random() * tile, oy: Math.random() * tile };
  });

  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.min(deltaMs, 100) / 1000; // clamp so a background tab doesn't jump
    const speed = reduced ? 0 : state.speed;
    for (const l of layers) {
      l.oy = (l.oy + l.speed * speed * dt) % tile;
      if (!reduced) l.ox = (l.ox + l.drift * dt) % tile;
      l.el.style.transform = `translate3d(${l.ox}px, ${l.oy}px, 0)`;
    }
  });

  if (!reduced) startTwinkles(root, cfg.twinkle, assets.twinkle);
  return state;
}

function startTwinkles(root, t, src) {
  const rand = gsap.utils.random;
  for (let i = 0; i < t.count; i++) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.className = 'twinkle';
    root.appendChild(img);
    gsap.set(img, { scale: 0, xPercent: -50, yPercent: -50 });

    const pop = () => {
      const size = rand(t.size[0], t.size[1]);
      gsap.set(img, { left: `${rand(4, 96)}%`, top: `${rand(4, 96)}%`, width: size, height: size, rotation: 0 });
      gsap.to(img, {
        scale: 1,
        rotation: 45,
        duration: t.duration / 2,
        ease: `steps(${t.steps})`, // chunky pop, like a few drawn frames
        yoyo: true,
        repeat: 1,
        onComplete: () => gsap.delayedCall(rand(t.every[0], t.every[1]), pop),
      });
    };
    gsap.delayedCall(rand(0, t.every[1] * 2), pop);
  }
}
