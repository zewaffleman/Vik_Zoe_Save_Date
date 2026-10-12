/**
 * PLANET SHAKE: "tap me!" wiggle.
 *
 * One burst = a few back-and-forth swings, each smaller than the last
 * (decay), with a squishy scale pulse. Bursts repeat after a pause until
 * stop() is called (planet tapped).
 *
 * `pose` should be a stepped() pose for an INNER wrapper of the planet, so
 * the shake stacks on top of whatever the outer planet is doing.
 */
import { gsap } from 'gsap';

export function createShake(pose, cfg, { onBurst } = {}) {
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: cfg.pause });
  tl.call(() => onBurst?.());

  let angle = cfg.angle;
  let scale = cfg.scale;
  for (let i = 0; i < cfg.wiggles; i++) {
    const dir = i % 2 ? -1 : 1;
    tl.to(pose, {
      rotation: dir * angle,
      // squash one way, stretch the other: reads as jelly-ish
      scaleX: 1 + dir * scale,
      scaleY: 1 - dir * scale * 0.6,
      duration: cfg.wiggleDuration,
      ease: 'sine.inOut',
    });
    angle *= cfg.decay;
    scale *= cfg.decay;
  }
  tl.to(pose, { rotation: 0, scaleX: 1, scaleY: 1, duration: cfg.wiggleDuration * 1.5, ease: 'sine.out' });

  return {
    get running() {
      return !tl.paused();
    },
    start() {
      if (!tl.paused()) return;
      tl.restart();
    },
    stop() {
      tl.pause();
      gsap.to(pose, { rotation: 0, scaleX: 1, scaleY: 1, duration: 0.2 });
    },
  };
}
