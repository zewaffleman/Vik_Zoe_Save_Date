/**
 * DEBUG BAR: only loaded when the URL has ?debug
 *
 *   - scene-jump buttons (one per timeline label)
 *   - play/pause, restart, speed (slows EVERYTHING incl. shake & twinkles)
 *   - scrubber + live readout of current label and time
 *   - link to toggle the reduced-motion version
 *
 * Scrubbing doesn't fire timeline callbacks (e.g. starting the moon wiggle), so
 * `onSeek` re-syncs things that depend on "where are we".
 */
import { gsap } from 'gsap';

export function initDebug(tl, { onSeek }) {
  const bar = document.createElement('div');
  bar.className = 'debug';
  const labels = Object.entries(tl.labels).sort((a, b) => a[1] - b[1]);

  const params = new URLSearchParams(location.search);
  const reduced = params.has('reduced');
  reduced ? params.delete('reduced') : params.set('reduced', '');
  const toggleHref = `?${params.toString().replace(/=(&|$)/g, '$1')}`;

  bar.innerHTML = `
    <div class="debug__row">
      ${labels.map(([name]) => `<button data-jump="${name}">${name}</button>`).join('')}
    </div>
    <div class="debug__row">
      <button data-act="toggle" aria-label="Play/pause">❚❚</button>
      <button data-act="restart" aria-label="Restart">↺</button>
      <select data-act="speed" aria-label="Speed">
        <option value="0.25">0.25×</option><option value="0.5">0.5×</option>
        <option value="1" selected>1×</option><option value="2">2×</option>
      </select>
      <input type="range" min="0" max="1" step="0.0005" value="0" aria-label="Scrub timeline" />
      <span class="debug__readout"></span>
      <a href="${toggleHref}">${reduced ? 'full motion' : 'reduced'}</a>
    </div>`;
  document.body.appendChild(bar);

  const range = bar.querySelector('input');
  const readout = bar.querySelector('.debug__readout');
  const toggle = bar.querySelector('[data-act="toggle"]');
  let dragging = false;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.jump) {
      tl.play(btn.dataset.jump);
      onSeek();
    } else if (btn.dataset.act === 'toggle') {
      tl.paused(!tl.paused());
    } else if (btn.dataset.act === 'restart') {
      tl.restart();
      onSeek();
    }
  });
  bar.querySelector('select').addEventListener('change', (e) => {
    gsap.globalTimeline.timeScale(Number(e.target.value));
  });
  range.addEventListener('pointerdown', () => (dragging = true));
  range.addEventListener('pointerup', () => (dragging = false));
  range.addEventListener('input', () => {
    tl.pause();
    tl.progress(Number(range.value), true); // true = don't fire callbacks
    onSeek();
  });

  gsap.ticker.add(() => {
    if (!dragging) range.value = tl.progress();
    toggle.textContent = tl.paused() || tl.progress() === 1 ? '▶' : '❚❚';
    readout.textContent = `${tl.currentLabel() || 'title'} · ${tl.time().toFixed(2)}s / ${tl.duration().toFixed(2)}s`;
  });
}
