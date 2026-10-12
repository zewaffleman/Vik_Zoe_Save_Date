/**
 * STEPPED ANIMATION ("on twos")
 *
 * GSAP normally updates an element every screen refresh (60–120fps), which
 * looks silky but computer-made. Hand animation holds each drawing for a few
 * frames. To get that feel without giving up GSAP's easing/timeline control:
 *
 *   1. GSAP tweens a plain JS object (the "pose") smoothly, as usual.
 *   2. A ticker copies the pose onto the real element only N times a second.
 *
 * So the timeline stays smooth and scrubbable, but what you SEE snaps from
 * pose to pose at the element's own fps. Each element gets its own rate.
 *
 *   const pose = stepped(el, 12);                 // 12fps
 *   tl.to(pose, { y: 100, ease: 'back.out' });    // tween the pose, not the element
 */
import { gsap } from 'gsap';

const actors = [];
let smoothAll = false; // reduced motion: ignore fps and update every frame

export function stepped(el, fps, initial = {}) {
  // `scale` multiplies scaleX/scaleY, so an overall size change (e.g. the
  // rocket's forced-perspective zoom) stacks with squash & stretch.
  const pose = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, scale: 1, ...initial };
  const actor = { el, fps, pose, last: -Infinity };
  actors.push(actor);
  if (actors.length === 1) gsap.ticker.add(tick);
  apply(actor);
  return pose;
}

/** Force every stepped element to be smooth (used for reduced motion). */
export function setSmoothAll(on) {
  smoothAll = on;
}

function apply(actor) {
  const { x, y, rotation, scaleX, scaleY, scale } = actor.pose;
  gsap.set(actor.el, { x, y, rotation, scaleX: scaleX * scale, scaleY: scaleY * scale });
}

function tick(time) {
  for (const a of actors) {
    const fps = smoothAll ? 0 : a.fps;
    if (!fps || time - a.last >= 1 / fps) {
      a.last = time;
      apply(a);
    }
  }
}
