/**
 * BOOT: wires everything together.
 *
 *   1. Theme + text from CONFIG
 *   2. Stage scaling and sprite sizes
 *   3. Sprites (frame cyclers), 3D globes, stepped poses, Mii walkers
 *   4. Stars, moon wiggle
 *   5. Master timeline (or the reduced-motion one)
 *   6. Title tap → play, moon tap → info card
 *   7. Preload, then reveal the title screen
 *
 * URL flags:  ?debug   → scrubber / scene jumps
 *             ?reduced → force the reduced-motion version
 */
import './styles.css';
import { gsap } from 'gsap';
import { CONFIG } from './config.js';
import { stepped, setSmoothAll } from './fx/stepped.js';
import { frameCycler } from './fx/boil.js';
import { createStars } from './fx/stars.js';
import { createShake } from './fx/shake.js';
import { createGlobe, pauseGlobes } from './fx/globe.js';
import { initDoodles } from './fx/doodles.js';
import { createMiiPlayer, pauseClips } from './fx/miiClips.js';
import { buildMasterTimeline, buildReducedTimeline, surfacePoint } from './timeline.js';
import { DETAILS } from './details.js';
import { googleCalendarUrl, bestMapsLink } from './calendar.js';
import { initRsvp } from './rsvp.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const REDUCED = params.has('reduced') || matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (sel) => document.querySelector(sel);
const els = {
  sky: $('#sky'),
  stars: $('#stars'),
  earth: $('#earth'),
  planet: $('#planet'),
  planetShake: $('#planet-shake'),
  rocket: $('#rocket'),
  rocketBody: $('#rocket-body'),
  passengers: $('#passengers'),
  flame: $('#flame'),
  mii: { a: $('#mii-a'), b: $('#mii-b') },
  hint: $('#hint'),
  title: $('#title'),
  titleInner: $('#title-inner'),
  panel: $('#panel'),
  card: $('.card'),
  cardWrap: $('.card-wrap'),
  loader: $('#loader'),
};
const A = CONFIG.assets;

// ---------------------------------------------------------------------------
// 1. Theme + text
// ---------------------------------------------------------------------------
const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
for (const [name, value] of Object.entries(CONFIG.colors)) {
  document.documentElement.style.setProperty(`--${kebab(name)}`, value);
}
if (A.background) els.sky.style.backgroundImage = `url("${A.background}")`;

// <el data-text="title.names"> gets CONFIG.title.names
document.querySelectorAll('[data-text]').forEach((el) => {
  el.textContent = el.dataset.text.split('.').reduce((o, k) => o[k], CONFIG);
});

initDoodles({ fps: CONFIG.boil.fps, animate: !REDUCED });
if (REDUCED) document.documentElement.classList.add('reduced');

// ---------------------------------------------------------------------------
// 2. Stage + sprite sizes (stage units)
// ---------------------------------------------------------------------------
const px = (n) => `${n}px`;
const size = (el, w, h = w) => Object.assign(el.style, { width: px(w), height: px(h) });
const R = CONFIG.rocket;
size(els.rocket, R.width, R.height);
size(els.flame, R.flame.width, R.flame.height);
els.flame.style.top = px(R.height - R.flame.overlap);
// Passengers: a rocket-sized layer BEHIND the drawing, so the heads only
// show through the see-through window. The cabin fill hides the stars.
const PH = R.porthole;
const cabin = els.rocket.querySelector('.cabin'); // always there: the window's dark glass
Object.assign(cabin.style, { left: px(PH.x), top: px(PH.y), background: PH.cabin });
size(cabin, PH.width, PH.height);
size(els.earth, CONFIG.earth.size);
size(els.planet, CONFIG.planet.size);
const MI = CONFIG.miis;
for (const el of Object.values(els.mii)) size(el, MI.size);

// Anchor points: poses' x/y = rocket/Mii feet, planet centres
const rocketFoot = (R.artBottom / R.height) * 100; // % down the image where the fins end
gsap.set(els.rocket, { xPercent: -50, yPercent: -rocketFoot, transformOrigin: `50% ${rocketFoot}%` });
gsap.set(els.flame, { xPercent: -50, transformOrigin: '50% 0%' });
gsap.set([els.earth, els.planet], { xPercent: -50, yPercent: -50 });
gsap.set(Object.values(els.mii), {
  xPercent: -MI.foot.x * 100,
  yPercent: -MI.foot.y * 100,
  transformOrigin: `${MI.foot.x * 100}% ${MI.foot.y * 100}%`,
});
// the passengers pop in/out from the middle of the window
gsap.set(els.passengers, { transformOrigin: `${PH.x + PH.width / 2}px ${PH.y + PH.height / 2}px` });
gsap.set(els.hint, { xPercent: -50 });

// ---------------------------------------------------------------------------
// 3. Sprites, globes, poses
// ---------------------------------------------------------------------------
const boilOn = CONFIG.boil.enabled && !(REDUCED && CONFIG.reducedMotion.disableBoil);
const boil = (el, srcs, fps = CONFIG.boil.fps) => frameCycler(el, srcs, fps, { enabled: boilOn });
boil(els.rocketBody, A.rocket);
frameCycler(els.flame, A.flame, R.flame.fps);
// Red "!" over a Mii's head while an impatient clip plays
const EX = MI.exclaim;
function setExclaim(who, on) {
  const ex = els.mii[who].querySelector('.exclaim');
  if (on === (ex.dataset.on === '1')) return;
  ex.dataset.on = on ? '1' : '0';
  gsap.killTweensOf(ex);
  if (on) {
    gsap.fromTo(ex, { autoAlpha: 0, scale: 0, rotation: -20 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.35, ease: 'back.out(3)' });
    gsap.to(ex, { y: -4, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.35 });
  } else {
    gsap.to(ex, { autoAlpha: 0, scale: 0.5, y: 0, duration: 0.15 });
  }
}

// Rendered Mii clips (idle/walk), keyed off their green screen
const miiPlayers = {};
for (const who of ['a', 'b']) {
  const ex = els.mii[who].querySelector('.exclaim');
  Object.assign(ex.style, { left: `${EX.x * 100}%`, top: `${EX.y * 100}%`, fontSize: px(EX.size), color: EX.color });
  gsap.set(ex, { xPercent: -50, yPercent: -100, autoAlpha: 0, transformOrigin: '50% 100%' });
  miiPlayers[who] = createMiiPlayer(els.mii[who].querySelector('.mii-inner'), A.miis[who], {
    fps: MI.clipFps,
    key: MI.chromaKey,
    resolution: MI.resolution,
    imageClipDuration: MI.imageClipDuration,
    anchor: MI.foot,
    idleHold: MI.idleHold,
    impatientChance: MI.impatientChance,
    onClip: (c) => setExclaim(who, !!c.impatient),
    reduced: REDUCED,
  });
}

// Passenger heads: the same keyed-video player, with one looping clip each
const passengerPlayers = {};
for (const who of ['a', 'b']) {
  const h = R.passengerHeads[who];
  const el = els.passengers.querySelector(`.head-${who}`);
  Object.assign(el.style, { left: px(h.x - h.size / 2), top: px(h.y - h.size / 2) });
  size(el, h.size);
  const src = A.passengers[who];
  passengerPlayers[who] = createMiiPlayer(el, { walk: src, idleEarth: [src], idleIo: [src] }, {
    key: MI.chromaKey,
    resolution: 128,
    anchor: { x: 0.5, y: 0.5 },
    eager: false, // not needed until liftoff: don't compete with the title screen's downloads
    reduced: REDUCED,
  });
}
// Heads only start (and download) once the guest taps start: see the title click
const startPassengers = () => Object.values(passengerPlayers).forEach((p) => p.update('idle', 0)); // single clip → seamless loop

const still = REDUCED && CONFIG.reducedMotion.stopSpin;
const globeOpts = (g) => ({ ...g, spin: still ? 0 : g.spin, cloudSpin: still ? 0 : g.cloudSpin });
const globes = [
  createGlobe(els.earth, {
    ...globeOpts(CONFIG.earth.globe),
    size: CONFIG.earth.size,
    map: A.textures.earth,
    clouds: A.textures.earthClouds,
  }),
  createGlobe(els.planetShake, { ...globeOpts(CONFIG.planet.globe), size: CONFIG.planet.size, map: A.textures.io }),
];

function fitStage() {
  const { width, height, maxScale } = CONFIG.stage;
  const scale = Math.min(innerWidth / width, innerHeight / height, maxScale);
  document.documentElement.style.setProperty('--stage-scale', scale);
  globes.forEach((g) => g.setStageScale(scale));
}
fitStage();
addEventListener('resize', fitStage);

setSmoothAll(REDUCED);
const poses = {
  rocket: stepped(els.rocket, R.fps),
  flame: stepped(els.flame, R.fps),
  earth: stepped(els.earth, CONFIG.earth.fps),
  planet: stepped(els.planet, CONFIG.planet.fps),
  shake: stepped(els.planetShake, CONFIG.shake.fps),
  mii: { a: stepped(els.mii.a, MI.fps), b: stepped(els.mii.b, MI.fps) },
};

// Walkers: where each Mii is along a planet's surface. Converted to a pose
// every frame, so the timeline only has to tween dx / lift.
const walkers = {
  a: { body: 0, dx: MI.onEarth.a, lift: 0 },
  b: { body: 0, dx: MI.onEarth.b, lift: 0 },
};
gsap.ticker.add(() => {
  for (const who of ['a', 'b']) {
    const w = walkers[who];
    const body = Math.round(w.body);
    Object.assign(poses.mii[who], surfacePoint(body, w.dx, w.lift));
    miiPlayers[who].update(els.mii[who].dataset.pose, body); // idle on Earth / walk / idle on Io
  }
});

// ---------------------------------------------------------------------------
// 4. Stars, moon wiggle
// ---------------------------------------------------------------------------
const starState = createStars(els.stars, CONFIG.stars, A, { reduced: REDUCED });


let hopTl = null;
const shake = createShake(poses.shake, CONFIG.shake, {
  onBurst: () => rocketJiggle(),
});

/** Rocket gives a little jiggle in sympathy with each wiggle burst. */
function rocketJiggle() {
  const hop = CONFIG.shake.rocketHop;
  if (!hop) return;
  const y = CONFIG.planet.rocketLandingY;
  hopTl?.kill();
  hopTl = gsap
    .timeline()
    .to(poses.rocket, { y: y - hop, duration: 0.14, ease: 'power2.out' })
    .to(poses.rocket, { y, duration: 0.12, ease: 'power2.in' })
    .to(poses.rocket, { scaleX: 1.08, scaleY: 0.92, duration: 0.06 })
    .to(poses.rocket, { scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' });
}

els.hint.querySelector('.hint__text').textContent = CONFIG.shake.hint;
function showHint() {
  if (gsap.getProperty(els.hint, 'autoAlpha') > 0.5) return;
  gsap.fromTo(els.hint, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: REDUCED ? 0.3 : 0.6, ease: 'power2.out' });
}
function hideHint() {
  gsap.to(els.hint, { autoAlpha: 0, duration: 0.2 });
}

// ---------------------------------------------------------------------------
// 5. Timeline
// ---------------------------------------------------------------------------
const setMoonTappable = (on) => (els.planet.disabled = !on);

// Moon invitation: the hint fades in, then the wiggle waits for
// CONFIG.shake.startAfter seconds of no input. After the card has been
// opened and closed once, the moon stops inviting (it still opens on tap).
let invited = true; // false once the guest has seen the card
let prompting = false; // the couple have settled on Io
let nudge = null;
let hintTimer = null;
function armNudge() {
  nudge?.kill();
  if (!REDUCED && invited && prompting) nudge = gsap.delayedCall(CONFIG.shake.startAfter, () => shake.start());
}
function stopPrompt() {
  prompting = false;
  for (const t of [nudge, hintTimer]) t?.kill();
  shake.stop();
  hideHint();
}
// Any input restarts the countdown (and calms a moon that's already wiggling)
for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
  addEventListener(type, () => {
    if (!prompting || !invited) return;
    shake.stop();
    armNudge();
  }, { passive: true, capture: true });
}

const hooks = {
  onTappable: () => setMoonTappable(true),
  onPrompt: () => {
    prompting = true;
    if (!invited) return;
    hintTimer?.kill();
    hintTimer = gsap.delayedCall(REDUCED ? 0 : CONFIG.shake.hintAfter, showHint);
    armNudge();
  },
};
const build = REDUCED ? buildReducedTimeline : buildMasterTimeline;
const tl = build({ els, poses, walkers, stars: starState, hooks });
tl.progress(0.0001, true).progress(0, true); // render the t=0 starting pose

/** Re-sync what normally changes via timeline callbacks (after scrub/replay). */
function syncToTimeline() {
  const t = tl.time();
  setMoonTappable(t >= tl.labels.idle);
  if (t > tl.labels.board) startPassengers(); // jumped past the tap in ?debug
  stopPrompt();
  if (t >= tl.labels.prompt && els.panel.hidden) hooks.onPrompt();
}

// ---------------------------------------------------------------------------
// 6. Interaction
// ---------------------------------------------------------------------------
els.title.addEventListener('click', () => {
  // video playback must be unlocked inside the tap handler (iOS)
  Object.values(miiPlayers).forEach((p) => (p.unlock(), p.setImpatient(false)));
  Object.values(passengerPlayers).forEach((p) => p.unlock());
  startPassengers();
  if (tl.time() < tl.labels.board) tl.play();
});

let boing = null;
els.planet.setAttribute('aria-label', `Open wedding details (tap ${CONFIG.planet.tapLabel})`);
els.planet.addEventListener('click', () => {
  const V = CONFIG.reveal;
  for (const t of [nudge, hintTimer]) t?.kill();
  shake.stop();
  hideHint();
  boing?.kill();
  boing = gsap
    .timeline()
    .to(poses.planet, { scaleX: V.planetBoing.x, scaleY: V.planetBoing.y, duration: 0.08, ease: 'power2.out' })
    .to(poses.planet, { scaleX: 1, scaleY: 1, duration: V.boingDuration, ease: V.boingEase });
  gsap.delayedCall(V.panelDelay, openPanel);
});

// Info card content: everything comes from details.js
const ev = DETAILS;
const day = new Date(`${ev.date}T00:00:00Z`); // all-day: no time zone maths needed
const fmt = (opts) => new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', ...opts }).format(day);
const slot = (name, text) => els.card.querySelectorAll(`[data-slot="${name}"]`).forEach((el) => (el.textContent = text));
slot('names', ev.couple);
slot('day', fmt({ weekday: 'long' }));
slot('date', fmt({ day: 'numeric', month: 'long', year: 'numeric' }));
slot('timeNote', ev.timeNote);
slot('venue', ev.venue.name);
slot('area', ev.venue.area);
slot('address', ev.venue.address);
slot('note', ev.note);
slot('vibesLabel', ev.pinterest.label);
slot('vibesButton', ev.pinterest.button);

const link = (name, href) => (els.card.querySelector(`[data-link="${name}"]`).href = href);
link('gcal', googleCalendarUrl(ev));
link('ics', ev.calendar.fileName); // real file (see vite.config.js) → iPhone "Add to Calendar"
link('pinterest', ev.pinterest.url);
const maps = bestMapsLink(ev);
const mapsLink = els.card.querySelector('[data-link="maps"]');
mapsLink.href = maps.href;
mapsLink.setAttribute('aria-label', `${ev.venue.name}, ${ev.venue.address}. Open in maps`);
if (maps.newTab) Object.assign(mapsLink, { target: '_blank', rel: 'noopener' });

const copyBtn = els.card.querySelector('[data-copy-address]');
copyBtn.addEventListener('click', async () => {
  const text = `${ev.venue.name}, ${ev.venue.address}`;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // older browsers: copy via a temporary text field
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  copyBtn.textContent = 'Copied ✓';
  gsap.delayedCall(2, () => (copyBtn.textContent = 'Copy address'));
});

initRsvp(els.card.querySelector('.rsvp'), { reduced: REDUCED });

/**
 * While the card is open: make the scene behind it `inert` (so Tab and screen
 * readers stay inside the card), and pause the 3D planets + Mii videos once
 * the card has covered them. A blurred backdrop over live WebGL is very
 * expensive on phones and would make typing in the form feel sluggish.
 */
const behindCard = [$('#stage'), els.title];
function setCardOpen(open) {
  behindCard.forEach((el) => (el.inert = open));
  if (!open) {
    pauseGlobes(false);
    pauseClips(false);
  }
}

function openPanel() {
  const V = CONFIG.reveal;
  els.panel.hidden = false;
  setCardOpen(true);
  gsap.fromTo('.panel__backdrop', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 });
  gsap.fromTo(
    els.cardWrap,
    // opacity (not autoAlpha) keeps the card focusable while it animates in
    { opacity: 0, y: V.panelFrom.y, scale: V.panelFrom.scale },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: REDUCED ? 0.25 : V.panelDuration,
      ease: REDUCED ? 'none' : V.panelEase,
      onComplete: () => !els.panel.hidden && (pauseGlobes(true), pauseClips(true)),
    },
  );
  els.panel.scrollTop = 0; // the whole popup scrolls (not the card)
  els.card.focus({ preventScroll: true });
}

function closePanel({ restoreFocus = true } = {}) {
  if (els.panel.hidden) return;
  const V = CONFIG.reveal;
  setCardOpen(false);
  gsap.to('.panel__backdrop', { autoAlpha: 0, duration: 0.25 });
  gsap.to(els.cardWrap, {
    opacity: 0,
    y: V.panelFrom.y,
    duration: V.panelCloseDuration,
    ease: V.panelCloseEase,
    onComplete: () => (els.panel.hidden = true),
  });
  if (restoreFocus) els.planet.focus();
  // They've found it: no more wiggling or hints (tapping still reopens it)
  invited = false;
  stopPrompt();
}

els.panel.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) closePanel();
  if (e.target.closest('[data-replay]')) replay();
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePanel();
});

function replay() {
  closePanel({ restoreFocus: false });
  for (const t of [hopTl, boing]) t?.kill();
  stopPrompt();
  setMoonTappable(false);
  tl.play('board');
}

// ---------------------------------------------------------------------------
// 7. Debug bar
// ---------------------------------------------------------------------------
if (DEBUG) {
  Object.assign(window, { tl, gsap, miiPlayers }); // poke at them from the browser console
  import('./debug.js').then((m) => m.initDebug(tl, { onSeek: syncToTimeline }));
}

// ---------------------------------------------------------------------------
// 8. Preload, then show the title screen
// ---------------------------------------------------------------------------
const allImages = [
  ...A.rocket, ...A.flame,
  ...Object.values(A.stars), A.twinkle, ...Object.values(A.textures), A.background,
].filter(Boolean);
const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => img.decode().catch(() => {}).then(resolve);
    img.onerror = () => {
      console.warn('[preload] missing', src);
      resolve();
    };
    img.src = src;
  });
const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);

// Mii renders: wait for the first frames, but never more than a few seconds
const miisReady = Promise.race([
  Promise.all(Object.values(miiPlayers).map((p) => p.ready)),
  new Promise((r) => setTimeout(r, 4000)),
]);

Promise.all([...allImages.map(loadImage), fontsReady, miisReady]).then(() => {
  // Waited too long on the title screen? The Miis get impatient.
  if (!REDUCED) {
    gsap.delayedCall(MI.impatientAfter, () => {
      if (tl.time() < tl.labels.board) Object.values(miiPlayers).forEach((p) => p.setImpatient(true));
    });
  }
  gsap.to(els.loader, { autoAlpha: 0, duration: 0.4, onComplete: () => els.loader.remove() });
  const kids = [...els.titleInner.children];
  gsap.from(kids.filter((el) => !el.classList.contains('doodle')), {
    y: 14,
    autoAlpha: 0,
    duration: REDUCED ? 0.01 : 0.8,
    ease: 'power2.out',
    stagger: REDUCED ? 0 : 0.09,
  });
  // doodles pop in together once the text is mostly there
  gsap.from(kids.filter((el) => el.classList.contains('doodle')), {
    autoAlpha: 0,
    duration: REDUCED ? 0.01 : 0.5,
    delay: REDUCED ? 0 : 0.5,
    stagger: REDUCED ? 0 : 0.06,
  });
});
