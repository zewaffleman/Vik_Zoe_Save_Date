/**
 * THE MASTER TIMELINE
 *
 * One GSAP timeline holds the whole sequence, with a label at each scene:
 *
 *   title → board → liftoff → launch → journey → landing → touchdown
 *         → disembark → idle → prompt
 *
 * It sits paused at `title` until the guest taps. The looping moon wiggle
 * after `prompt` runs on its own timeline (an infinite loop would make this
 * one unscrubbable); `hooks.onPrompt` starts it.
 *
 * How things move:
 *  - Rocket and planets: tween their stepped "poses" (fx/stepped.js).
 *  - Miis: tween their "walker" { body, dx, lift }. main.js converts that
 *    to a position stuck to the curved planet surface every frame (see
 *    surfacePoint below), then the stepped pose puts it on screen.
 *  - What the Miis are doing (data-pose="idle" | "walk") and which way they
 *    face (data-flip) are attributes set with tl.set, so they scrub
 *    backwards correctly. fx/miiClips.js picks the matching render.
 *  - Walk durations = distance ÷ CONFIG.miis.walkSpeed, so the walk render's
 *    stride matches the ground speed.
 *
 * All positions are computed as absolute times (seconds) from CONFIG, so
 * changing any duration re-flows everything after it.
 */
import { gsap } from 'gsap';
import { CONFIG } from './config.js';

const BODIES = [CONFIG.earth, CONFIG.planet]; // walker.body: 0 = Earth, 1 = Io
const SINK = 3; // feet sink slightly into the surface so they look grounded

/** Where a point `dx` along the top of a planet is, `lift` units off the surface. */
export function surfacePoint(bodyIndex, dx, lift = 0) {
  const b = BODIES[bodyIndex];
  const R = b.size / 2;
  const d = gsap.utils.clamp(-R + 1, R - 1, dx);
  const ang = Math.asin(d / R);
  const sx = b.rest.x + d;
  const sy = b.rest.y - Math.sqrt(R * R - d * d) + SINK;
  return {
    x: sx + lift * Math.sin(ang),
    y: sy - lift * Math.cos(ang),
    rotation: (ang * 180) / Math.PI,
  };
}

/**
 * data-flip value for a direction. The walk render faces one way
 * (CONFIG.miis.walkFacesRight); walking the other way mirrors it.
 * 'front' (idles) is never mirrored.
 */
function flipFor(dir) {
  if (dir === 'front') return '0';
  return (dir === 'left') === CONFIG.miis.walkFacesRight ? '1' : '0';
}

export function buildMasterTimeline({ els, poses, walkers, stars, cue, hooks }) {
  const { rocket, flame, earth, planet } = poses;
  const T = CONFIG.title;
  const B = CONFIG.board;
  const L = CONFIG.liftoff;
  const J = CONFIG.journey;
  const D = CONFIG.landing;
  const M = CONFIG.miis;
  const X = CONFIG.disembark;

  const tl = gsap.timeline({ paused: true });
  const miiPose = (who, pose, at) => tl.set(els.mii[who], { attr: { 'data-pose': pose } }, at);
  const miiFace = (who, dir, at) => tl.set(els.mii[who], { attr: { 'data-flip': flipFor(dir) } }, at);
  const walkTime = (from, to) => Math.abs(to - from) / M.walkSpeed;

  // =========================================================================
  // STARTING POSE (t=0). Also what restart / scrub-to-start snaps back to.
  // =========================================================================
  tl.set(rocket, { ...CONFIG.rocket.onEarth, rotation: 0, scaleX: 1, scaleY: 1, scale: 1 }, 0)
    .set(flame, { scaleX: 0, scaleY: 0 }, 0)
    .set(els.flame, { autoAlpha: 0 }, 0)
    .set(els.passengers, { autoAlpha: 0, scale: 1 }, 0)
    .set(earth, { ...CONFIG.earth.rest, scaleX: 1, scaleY: 1 }, 0)
    .set(planet, { x: CONFIG.planet.rest.x, y: CONFIG.planet.rest.y + D.planetEnterFrom, scaleX: 1, scaleY: 1 }, 0)
    .set(stars, { speed: CONFIG.stars.idleSpeed }, 0)
    .set(els.title, { autoAlpha: 1 }, 0)
    .set(els.titleInner, { y: 0, autoAlpha: 1 }, 0)
    .set(els.hint, { autoAlpha: 0 }, 0);
  for (const who of ['a', 'b']) {
    tl.set(walkers[who], { body: 0, dx: M.onEarth[who], lift: 0 }, 0)
      .set(poses.mii[who], { scaleX: 1, scaleY: 1 }, 0)
      .set(els.mii[who], { autoAlpha: 1, attr: { 'data-pose': 'idle', 'data-flip': '0' } }, 0);
  }

  // =========================================================================
  // TITLE: text drifts up and fades after the tap
  // =========================================================================
  tl.addLabel('title', 0)
    .call(cue, ['start'], 0)
    .to(els.titleInner, { y: -40, autoAlpha: 0, duration: T.exitDuration, ease: T.exitEase }, 0)
    .to(els.title, { autoAlpha: 0, duration: 0.2 }, T.exitDuration - 0.2);

  // =========================================================================
  // BOARD: both walk over to the rocket and step "inside" (they pass behind
  // it and fade), then their faces pop up in the porthole
  // =========================================================================
  const tBoard = T.exitDuration + T.gapAfter;
  tl.addLabel('board', tBoard);
  let tAboard = tBoard;
  for (const who of ['a', 'b']) {
    const from = M.onEarth[who];
    const t = tBoard + (who === 'b' ? B.stagger : 0);
    const dur = walkTime(from, 0);
    miiPose(who, 'walk', t);
    miiFace(who, from < 0 ? 'right' : 'left', t); // walking toward the rocket
    tl.to(walkers[who], { dx: 0, duration: dur, ease: 'none' }, t)
      .call(cue, ['board'], t + dur - B.vanish)
      .to(els.mii[who], { autoAlpha: 0, duration: B.vanish }, t + dur - B.vanish);
    tAboard = Math.max(tAboard, t + dur);
  }
  tl.fromTo(els.passengers, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: B.passengersPop, ease: 'back.out(2.5)' }, tAboard);

  // =========================================================================
  // LIFTOFF: crouch (anticipation) → rumble → launch
  // =========================================================================
  const tLift = tAboard + B.passengersPop;
  const tRumble = tLift + L.crouchDuration;
  tl.addLabel('liftoff', tLift)
    .call(cue, ['crouch'], tLift)
    .to(rocket, { scaleX: L.crouchScale.x, scaleY: L.crouchScale.y, duration: L.crouchDuration, ease: L.crouchEase }, tLift)
    .to(els.flame, { autoAlpha: 1, duration: 0.1 }, tRumble)
    .to(flame, { scaleX: 0.6, scaleY: 0.5, duration: L.rumbleDuration, ease: 'power1.out' }, tRumble)
    .to(rocket, {
      keyframes: [{ rotation: L.rumbleAngle }, { rotation: -L.rumbleAngle }, { rotation: L.rumbleAngle * 0.6 }, { rotation: 0 }],
      duration: L.rumbleDuration,
      ease: 'none',
    }, tRumble);

  const tLaunch = tRumble + L.rumbleDuration;
  tl.addLabel('launch', tLaunch)
    .call(cue, ['liftoff'], tLaunch)
    .to(rocket, { x: L.cruise.x, y: L.cruise.y, duration: L.launchDuration, ease: L.launchEase }, tLaunch)
    .to(rocket, { scaleX: L.launchStretch.x, scaleY: L.launchStretch.y, duration: 0.12, ease: 'power2.out' }, tLaunch)
    .to(rocket, { scaleX: 1, scaleY: 1, duration: L.stretchRelax, ease: 'elastic.out(1, 0.5)' }, tLaunch + 0.12)
    .to(rocket, { scale: L.flightScale, duration: L.growDuration, ease: L.growEase }, tLaunch)
    .to(flame, { scaleX: 1, scaleY: 1.15, duration: 0.2, ease: 'back.out(3)' }, tLaunch)
    .to(earth, { y: CONFIG.earth.rest.y + L.earthDropDistance, duration: L.earthDropDuration, ease: L.earthDropEase }, tLaunch)
    .to(stars, { speed: 1, duration: L.starRampDuration, ease: L.starRampEase }, tLaunch);

  // =========================================================================
  // JOURNEY: side-to-side swoops with a lean, plus a gentle float
  // =========================================================================
  const tJourney = tLaunch + L.launchDuration;
  tl.addLabel('journey', tJourney);
  const segments = J.weaves * 2;
  const segDur = J.duration / segments;
  let prevX = L.cruise.x;
  for (let i = 0; i < segments; i++) {
    const last = i === segments - 1;
    const x = last ? L.cruise.x : L.cruise.x + (i % 2 ? 1 : -1) * J.weaveDistance;
    const lean = Math.sign(x - prevX) * J.weaveTilt;
    const at = tJourney + i * segDur;
    tl.to(rocket, { x, duration: segDur, ease: J.weaveEase }, at).to(rocket, {
      keyframes: [
        { rotation: lean, duration: segDur / 2, ease: 'sine.out' },
        { rotation: 0, duration: segDur / 2, ease: 'sine.in' },
      ],
    }, at);
    prevX = x;
  }
  tl.to(rocket, { y: L.cruise.y - J.bobDistance, duration: segDur, ease: 'sine.inOut', repeat: segments - 1, yoyo: true }, tJourney);

  // =========================================================================
  // LANDING: Io rises into view, stars brake, rocket hovers then drops
  // =========================================================================
  const tLand = tJourney + J.duration;
  tl.addLabel('landing', tLand)
    .call(cue, ['landing'], tLand)
    .to(planet, { y: CONFIG.planet.rest.y, duration: D.planetEnterDuration, ease: D.planetEnterEase }, tLand)
    .to(stars, { speed: CONFIG.stars.idleSpeed, duration: D.starSlowDuration, ease: D.starSlowEase }, tLand)
    .to(rocket, { x: CONFIG.planet.rest.x, y: D.hoverY, rotation: 0, duration: D.hoverDuration, ease: D.hoverEase }, tLand)
    .to(rocket, { y: CONFIG.planet.rocketLandingY, duration: D.descendDuration, ease: D.descendEase }, tLand + D.hoverDuration)
    .to(flame, { scaleX: D.retroFlame, scaleY: D.retroFlame, duration: D.hoverDuration }, tLand)
    .to(rocket, { scale: 1, duration: D.hoverDuration + D.descendDuration, ease: D.shrinkEase }, tLand);

  // TOUCHDOWN: squash + elastic recover
  const tTouch = tLand + D.hoverDuration + D.descendDuration;
  tl.addLabel('touchdown', tTouch)
    .call(cue, ['touchdown'], tTouch)
    .to(rocket, { scaleX: D.squash.x, scaleY: D.squash.y, duration: D.squashDuration, ease: 'power2.out' }, tTouch)
    .to(rocket, { scaleX: 1, scaleY: 1, duration: D.recoverDuration, ease: D.recoverEase }, tTouch + D.squashDuration)
    .to(planet, { scaleX: D.planetSquash.x, scaleY: D.planetSquash.y, duration: D.squashDuration, ease: 'power2.out' }, tTouch)
    .to(planet, { scaleX: 1, scaleY: 1, duration: D.recoverDuration, ease: D.recoverEase }, tTouch + D.squashDuration)
    .to(flame, { scaleX: 0, scaleY: 0, duration: D.flameOffDuration, ease: 'back.in(2)' }, tTouch)
    .to(els.flame, { autoAlpha: 0, duration: 0.05 }, tTouch + D.flameOffDuration);

  // =========================================================================
  // DISEMBARK: faces leave the porthole, the Miis walk out from behind the
  // rocket to their spots on Io (one each side)
  // =========================================================================
  const tOut = tTouch + D.squashDuration + D.recoverDuration * 0.5 + X.delay;
  tl.addLabel('disembark', tOut)
    .call(cue, ['disembark'], tOut)
    .to(els.passengers, { autoAlpha: 0, scale: 0.4, duration: 0.15, ease: 'power2.in' }, tOut);
  const arrive = {};
  for (const who of ['a', 'b']) {
    const t = tOut + 0.1 + (who === 'b' ? X.stagger : 0);
    const to = M.onIo[who];
    const dur = walkTime(0, to);
    tl.set(walkers[who], { body: 1, dx: 0, lift: 0 }, t)
      .set(poses.mii[who], { scaleX: 1, scaleY: 1 }, t);
    miiPose(who, 'walk', t);
    miiFace(who, to < 0 ? 'left' : 'right', t);
    tl.to(els.mii[who], { autoAlpha: 1, duration: X.appear }, t)
      .to(walkers[who], { dx: to, duration: dur, ease: 'none' }, t);
    miiPose(who, 'idle', t + dur);
    miiFace(who, 'front', t + dur);
    arrive[who] = t + dur;
  }

  // =========================================================================
  // IDLE → PROMPT
  // =========================================================================
  const tIdle = Math.max(arrive.a, arrive.b);
  tl.addLabel('idle', tIdle)
    .addLabel('prompt', tIdle + CONFIG.idle.duration)
    .call(() => hooks.onPrompt?.(), null, tIdle + CONFIG.idle.duration)
    // the moon becomes tappable once everyone's settled
    .call(() => hooks.onTappable?.(), null, tIdle);

  return tl;
}

/**
 * REDUCED-MOTION version: same labels (so ?debug still works), just a short
 * crossfade from the Earth scene to the final scene on Io. No stepping,
 * walking, shaking, parallax, or squash.
 */
export function buildReducedTimeline({ els, poses, walkers, stars, cue, hooks }) {
  const { rocket, earth, planet } = poses;
  const R = CONFIG.reducedMotion;
  const M = CONFIG.miis;
  const half = R.crossfadeDuration / 2;
  const tl = gsap.timeline({ paused: true });
  const miis = [els.mii.a, els.mii.b];

  tl.set(rocket, { ...CONFIG.rocket.onEarth, rotation: 0, scaleX: 1, scaleY: 1, scale: 1 }, 0)
    .set(earth, { ...CONFIG.earth.rest }, 0)
    .set(planet, { ...CONFIG.planet.rest, scaleX: 1, scaleY: 1 }, 0)
    .set([els.flame, els.passengers, els.planet], { autoAlpha: 0 }, 0)
    .set([els.earth, els.rocket, ...miis], { autoAlpha: 1 }, 0)
    .set(stars, { speed: 0 }, 0)
    .set(els.title, { autoAlpha: 1 }, 0)
    .set(els.titleInner, { y: 0, autoAlpha: 1 }, 0)
    .set(els.hint, { autoAlpha: 0 }, 0);
  for (const who of ['a', 'b']) {
    tl.set(walkers[who], { body: 0, dx: M.onEarth[who], lift: 0 }, 0)
      .set(els.mii[who], { attr: { 'data-pose': 'idle', 'data-flip': '0' } }, 0);
  }

  tl.addLabel('title', 0)
    .call(cue, ['start'], 0)
    .to(els.title, { autoAlpha: 0, duration: 0.4 }, 0);
  const t1 = 0.4;
  ['board', 'liftoff', 'launch', 'journey'].forEach((l) => tl.addLabel(l, t1));
  tl.to([els.earth, els.rocket, ...miis], { autoAlpha: 0, duration: half }, t1);

  const t2 = t1 + half;
  tl.set(rocket, { x: CONFIG.planet.rest.x, y: CONFIG.planet.rocketLandingY }, t2);
  for (const who of ['a', 'b']) {
    tl.set(walkers[who], { body: 1, dx: M.onIo[who], lift: 0 }, t2);
  }
  ['landing', 'touchdown', 'disembark'].forEach((l) => tl.addLabel(l, t2));
  tl.to([els.planet, els.rocket, ...miis], { autoAlpha: 1, duration: half }, t2);

  const t3 = t2 + half;
  tl.addLabel('idle', t3)
    .call(() => hooks.onTappable?.(), null, t3)
    .addLabel('prompt', t3 + R.hintDelay)
    .call(() => hooks.onPrompt?.(), null, t3 + R.hintDelay);

  return tl;
}
