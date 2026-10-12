/**
 * BOIL / FRAME CYCLING
 *
 * Stacks every frame image inside `container` and shows one at a time,
 * cycling at `fps`. Used for:
 *   - the outline "boil" (2–3 slightly different drawings of the same thing)
 *   - the rocket flame flicker (4 frames)
 *
 * All frames stay in the DOM (only visibility changes), so there's no
 * flash while a new image decodes.
 */
import { gsap } from 'gsap';

const cyclers = [];

export function frameCycler(container, srcs, fps, { enabled = true } = {}) {
  const imgs = srcs.map((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = ''; // decorative; the meaningful label lives on the parent
    img.draggable = false;
    img.className = 'frame';
    img.style.visibility = i === 0 ? 'visible' : 'hidden';
    container.appendChild(img);
    return img;
  });
  const c = { imgs, fps, enabled, current: 0 };
  cyclers.push(c);
  if (cyclers.length === 1) gsap.ticker.add(tick);
  return c;
}

function tick(time) {
  for (const c of cyclers) {
    if (!c.enabled || c.imgs.length < 2) continue;
    // Frame number derived from the clock, so all boils stay in rhythm
    const next = Math.floor(time * c.fps) % c.imgs.length;
    if (next !== c.current) {
      c.imgs[c.current].style.visibility = 'hidden';
      c.imgs[next].style.visibility = 'visible';
      c.current = next;
    }
  }
}
