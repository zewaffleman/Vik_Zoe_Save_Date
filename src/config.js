/**
 * ============================================================================
 *  CONFIG: every tweakable value for the save-the-date lives here.
 * ============================================================================
 *
 *  UNITS
 *  - Times are in SECONDS.
 *  - Positions/sizes are in STAGE UNITS. The stage is a 400 × 800 portrait
 *    box scaled to fit the screen, so "y: 400" is always the vertical middle
 *    of the stage whatever the phone size. (0,0) = top-left of the stage.
 *    The sky and stars are NOT on the stage; they fill the whole screen.
 *  - Mii positions are "dx": distance left (−) or right (+) of the
 *    top of the planet they're standing on, measured along x. They're
 *    automatically stuck to the curved surface and tilted to match.
 *  - Star speeds are in screen px/second.
 *
 *  EASING
 *  Strings are GSAP ease names: "power2.out", "back.out(1.7)",
 *  "elastic.out(1, 0.4)", "sine.inOut"… Try them at https://gsap.com/docs/v3/Eases
 *    • .out = fast then slow (arrivals)    • .in = slow then fast (departures)
 *    • back = overshoots then settles       • elastic = wobbles into place
 *
 *  FPS ("on twos")
 *  Stepped elements only update their pose N times a second, like classic
 *  hand animation (12fps = "on twos"). 0 = perfectly smooth. Per element.
 *  The 3D planets always SPIN smoothly; only their on-screen position steps.
 *
 *  Tip: ?debug in the URL = scrubber + scene jumps. ?reduced = reduced motion.
 * ============================================================================
 */

import { DETAILS } from './details.js';

export const CONFIG = {
  // Wedding details & wording live in details.js (one place for it all)
  event: DETAILS,

  // --------------------------------------------------------------------------
  //  COLOURS (concept board). Applied as CSS variables, e.g. var(--rust).
  // --------------------------------------------------------------------------
  colors: {
    blush: '#F6CFC4',
    lilac: '#C7B0DA',
    rust: '#C24A33',
    berry: '#EC9AA3',
    peach: '#F2825E',
    matcha: '#A3B437',
    brass: '#C39B55',
    wordmark: '#8A4FC4', // chunky purple names
    ink: '#2E1A3A', // body text on paper
    cream: '#FBF4E8', // text on the night sky
    paper: '#FBF7F0', // info card background
    // Night sky gradient, top → bottom
    skyTop: '#140C26',
    skyMid: '#ec9aa480',
    skyBottom: '#c24b3386',
  },

  // --------------------------------------------------------------------------
  //  ASSETS (paths relative to /public). Hand-drawn = transparent PNGs.
  //  Boil = 2–3 slightly different drawings cycled for the redraw wobble.
  // --------------------------------------------------------------------------
  assets: {
    rocket: ['assets/rocket/rocket_boil1.png', 'assets/rocket/rocket_boil2.png', 'assets/rocket/rocket_boil3.png'],
    // Heads in the porthole during the flight (green-screen loops, keyed like the Miis)
    passengers: {
      a: 'assets/rocket/Vik1_passenger.mp4',
      b: 'assets/rocket/zoy1_passenger.mp4',
    },
    flame: [1, 2, 3, 4].map((n) => `assets/rocket/rocket_flame${n}.png`),
    // Rendered Mii clips (A = Vik, B = Zoe), green screen, keyed out live.
    // A clip is a path, or { src, mirror, foot, loop }:
    //   mirror: true        flip horizontally (Vik stands RIGHT of the rocket and
    //                       Zoe LEFT, so each should angle in toward the middle)
    //   foot: { x, y }      where the feet are in that render (0–1), measured
    //                       from each file so switching clips doesn't jump
    //   loop: [from, to]    loop only this section (seconds)
    // Walk renders face LEFT for their first ~1.8s, then turn to camera, so
    // we loop the left-facing strides only (two full strides each).
    miis: {
      a: {
        walk: { src: 'assets/miis/mii_a_walk1.mp4', loop: [0, 1.42], foot: { x: 0.55, y: 0.861 } },
        idleEarth: [
          // one idle = a seamless loop (switching between idles looked janky)
          { src: 'assets/miis/mii_a_stand1_idle_on_earth.mp4', foot: { x: 0.495, y: 0.887 } }, // points left, at the rocket
        ],
        impatient: [{ src: 'assets/miis/mii_a_impatient_stand1_idle_on_earth.mp4', foot: { x: 0.489, y: 0.891 } }],
        idleIo: [{ src: 'assets/miis/mii_a_stand1_idle_on_moon.mp4', foot: { x: 0.5, y: 0.83 } }], // sitting
      },
      b: {
        walk: { src: 'assets/miis/mii_b_walk1.mp4', loop: [0, 1.47], foot: { x: 0.55, y: 0.834 } },
        idleEarth: [
          { src: 'assets/miis/mii_b_stand1_idle_on_earth.mp4', mirror: true, foot: { x: 0.461, y: 0.938 } }, // flipped so legs point at the rocket
        ],
        impatient: [{ src: 'assets/miis/mii_b_impatient_stand1_idle_on_earth.mp4', mirror: true, foot: { x: 0.496, y: 0.893 } }], // flipped to face in
        idleIo: [{ src: 'assets/miis/mii_b_stand1_Idle_on_moon.mp4', foot: { x: 0.472, y: 0.893 } }], // happy jump
      },
    },
    stars: {
      far: 'assets/stars/stars_far.png',
      mid: 'assets/stars/stars_mid.png',
      near: 'assets/stars/stars_near.png',
    },
    twinkle: 'assets/stars/twinkle.png',
    // Realistic planet textures (NASA / USGS, public domain)
    textures: {
      earth: 'assets/textures/earth_day.jpg',
      earthClouds: 'assets/textures/earth_clouds.jpg',
      io: 'assets/textures/io.jpg',
    },
    background: null, // optional full-screen image over the sky gradient
  },

  stage: { width: 400, height: 800, maxScale: 1.25 },

  boil: { fps: 4, enabled: true },

  // --------------------------------------------------------------------------
  //  ROCKET. Position = bottom-centre (base of the fins).
  // --------------------------------------------------------------------------
  rocket: {
    width: 100,
    height: 180,
    // Where the bottom of the fins is in the drawing, in rocket units from the
    // top (the PNG has a little empty space below the fins). This point sits
    // on the ground.
    artBottom: 168,
    fps: 12,
    onEarth: { x: 200, y: 664 },
    // Porthole window, in rocket units, matching the see-through egg in the
    // drawing. The heads sit BEHIND the rocket drawing, so they only show
    // through the window and get its exact shape for free.
    porthole: { x: 43, y: 55, width: 20, height: 30, cabin: '#2A1B45' }, // cabin = colour behind the heads
    // Each head: centre (in rocket units) and how big its render is drawn.
    // The heads fill ~20% of their (square) render, so size ≈ 5× head width.
    passengerHeads: {
      a: { x: 58, y: 69, size: 58 }, // Vik on the right
      b: { x: 47.5, y: 70, size: 58 }, // Zoe on the left
    },
    flame: { width: 60, height: 80, overlap: 38, fps: 12 },
  },

  // --------------------------------------------------------------------------
  //  PLANETS: real 3D globes. Position = centre.
  // --------------------------------------------------------------------------
  earth: {
    size: 1200, // big and fairly flat, so the couple have room to walk to the rocket
    fps: 12,
    rest: { x: 200, y: 1260 }, // mostly below the stage; the top curve (y 660) shows
    globe: {
      face: [-27.47, 153.03], // Brisbane at the top, under the rocket
      faceTilt: 30, // degrees Brisbane is tipped toward us (low values roll Antarctica into view)
      spin: 0, // radians/sec. Keep 0 so Brisbane stays put
      cloudSpin: 0.012,
      cloudOpacity: 0.85,
      glow: { color: '#9CC6FF', size: 0.07, strength: 0.9, limb: 0.55 },
      maxPixelRatio: 1.25, // big globe: cap resolution to keep phones smooth
      light: { dir: [-2, 1.6, 2.2], intensity: 3.4 },
      ambient: { color: '#8C78B8', intensity: 0.7 },
    },
  },
  planet: {
    size: 520, // wider than the stage on purpose: a big, flatter horizon
    fps: 12,
    rest: { x: 200, y: 780 }, // top of Io = y − size/2 = 520
    rocketLandingY: 524,
    tapLabel: 'the moon', // used in the hint + screen-reader label
    globe: {
      face: [-18.7, 104.7], // Pele volcano (the orange ring) toward us
      faceTilt: 55,
      spin: 0.04,
      glow: { color: '#F6C37A', size: 0.05, strength: 0.45, limb: 0.35 },
      maxPixelRatio: 1.75,
      light: { dir: [-2, 1.6, 2.2], intensity: 3.6 },
      ambient: { color: '#8C78B8', intensity: 0.75 },
    },
  },

  // --------------------------------------------------------------------------
  //  THE COUPLE: your rendered Miis. Position = feet.
  // --------------------------------------------------------------------------
  miis: {
    size: 130, // the (square) render shown this big on stage
    // The sprite's ground point, in the render box (0–1). Each clip's own
    // `foot` (in assets.miis) is shifted to line up with this.
    foot: { x: 0.5, y: 0.89 },
    // Movement step rate. 0 = smooth: the renders are already smooth 60fps
    // animation, and stepping their position on top made the walk stutter.
    // (The rocket and planets keep their hand-drawn "on twos" steps.)
    fps: 0,
    clipFps: 0, // redraw rate of the renders: 0 = every frame, 12 = "on twos" too
    resolution: 256, // pixels the render is drawn at (256 is plenty for this size)
    // Walk speed in stage units/sec, per Mii. Measured from the renders (how
    // fast the planted foot slides back in the in-place walk), so the feet
    // stay planted. Every walk duration is worked out from these.
    walkSpeed: { a: 80, b: 67 },
    walkFacesRight: false, // the walk renders face LEFT (mirrored when walking right)
    // Idles repeat until they've been on screen this long (random in range,
    // seconds), then switch. Stops the short clips flickering.
    idleHold: [3, 6],
    // Impatience easter egg: after this long on the title screen without a
    // tap, the impatient clips start mixing in (this fraction of the time),
    // with a red "!" popping up over the impatient Mii's head.
    impatientAfter: 45,
    impatientChance: 0.7,
    imageClipDuration: 3,
    exclaim: { x: 0.5, y: 0.1, size: 30, color: '#E2312B' }, // the "!" (position in the Mii box, 0–1) // GIF/WebP idles switch after this long (browsers can't tell when a GIF ends)
    chromaKey: {
      color: '#00FE00', // the green screen colour
      similarity: 0.16, // raise if green is left behind; lower if the Mii gets eaten
      smoothness: 0.08, // softness of the edge
      spill: 0.85, // how much green glow to remove from edges (0–1)
    },
    onEarth: { a: 135, b: -135 }, // start: Vik right of the rocket, Zoe left
    onIo: { a: 92, b: -92 }, // where they end up on Io, one each side of the rocket
  },

  // --------------------------------------------------------------------------
  //  STARS: parallax layers + twinkles
  // --------------------------------------------------------------------------
  stars: {
    tileSize: 512,
    layers: {
      far: { speed: 60, drift: 3, opacity: 0.8 },
      mid: { speed: 160, drift: 6, opacity: 0.9 },
      near: { speed: 380, drift: 10, opacity: 1 },
    },
    idleSpeed: 0.05, // flight speed while not flying
    twinkle: { count: 6, size: [12, 26], every: [0.8, 2.6], duration: 0.7, steps: 5 },
  },

  // --------------------------------------------------------------------------
  //  TITLE SCREEN (text on the night sky)
  // --------------------------------------------------------------------------
  title: {
    kicker: 'Save the date',
    names: DETAILS.couple,
    tagline: DETAILS.tagline,
    dateLine: DETAILS.dateLine,
    button: 'Tap to begin',
    exitDuration: 0.6,
    exitEase: 'power2.in',
    gapAfter: 0.1,
  },

  // --------------------------------------------------------------------------
  //  SCENE: BOARDING (they walk over and in behind the rocket)
  // --------------------------------------------------------------------------
  board: {
    stagger: 0.25, // Mii B sets off this much later
    vanish: 0.3, // fade as they step "inside" (behind the rocket)
    passengersPop: 0.25,
  },

  // --------------------------------------------------------------------------
  //  SCENE: LIFTOFF
  // --------------------------------------------------------------------------
  liftoff: {
    crouchDuration: 0.35,
    crouchScale: { x: 1.16, y: 0.8 },
    crouchEase: 'power2.out',
    rumbleDuration: 0.35,
    rumbleAngle: 4,
    launchDuration: 1.1,
    launchEase: 'back.out(1.1)',
    launchStretch: { x: 0.86, y: 1.2 },
    stretchRelax: 0.6,
    // Forced perspective: the rocket grows as it flies "toward" us, so the
    // heads in the window are easy to see, then shrinks back for landing.
    flightScale: 1.9,
    growDuration: 1.6, // starts at launch
    growEase: 'power2.inOut',
    cruise: { x: 200, y: 590 }, // base of the (big) rocket while flying
    earthDropDistance: 900,
    earthDropDuration: 1.2,
    earthDropEase: 'power2.in',
    starRampDuration: 1.2,
    starRampEase: 'power2.in',
  },

  // --------------------------------------------------------------------------
  //  SCENE: JOURNEY
  // --------------------------------------------------------------------------
  journey: {
    duration: 6.2,
    weaves: 3,
    weaveDistance: 70,
    weaveTilt: 12,
    weaveEase: 'sine.inOut',
    bobDistance: 14,
  },

  // --------------------------------------------------------------------------
  //  SCENE: LANDING
  // --------------------------------------------------------------------------
  landing: {
    planetEnterFrom: 900,
    planetEnterDuration: 1.4,
    planetEnterEase: 'power3.out',
    starSlowDuration: 1.2,
    starSlowEase: 'power2.out',
    hoverY: 330,
    hoverDuration: 0.6,
    hoverEase: 'power2.out',
    descendDuration: 0.8,
    descendEase: 'power2.in',
    retroFlame: 0.7,
    shrinkEase: 'power2.inOut', // back to normal size over hover + descent
    squash: { x: 1.22, y: 0.76 },
    squashDuration: 0.12,
    recoverDuration: 0.7,
    recoverEase: 'elastic.out(1, 0.35)',
    planetSquash: { x: 1.03, y: 0.97 }, // subtle: it's a "real" moon
    flameOffDuration: 0.25,
  },

  // --------------------------------------------------------------------------
  //  SCENE: DISEMBARK (they walk out onto Io)
  // --------------------------------------------------------------------------
  disembark: {
    delay: 0.35, // after touchdown settles
    stagger: 0.35, // Mii B follows this much later
    appear: 0.3, // fade in as they step out from behind the rocket
  },

  // --------------------------------------------------------------------------
  //  IDLE → PROMPT (the moon wiggles to invite a tap)
  // --------------------------------------------------------------------------
  idle: { duration: 1.5 },
  shake: {
    // The wiggle only starts after this many seconds with NO input (any tap,
    // key or scroll restarts the countdown and calms the moon). Once the
    // guest has opened and closed the card it never wiggles again; tapping
    // the moon still opens it.
    startAfter: 30,
    fps: 12,
    wiggles: 5,
    wiggleDuration: 0.1,
    angle: 3.5, // gentle
    scale: 0.018,
    decay: 0.6,
    pause: 2.4,
    rocketHop: 3, // rocket jiggles on each burst (0 = off)
    hint: 'Tap the moon',
    hintAfter: 1.5, // seconds after the couple settle before the hint text fades in
  },

  // --------------------------------------------------------------------------
  //  TAP REVEAL (info card)
  // --------------------------------------------------------------------------
  reveal: {
    planetBoing: { x: 1.06, y: 0.94 },
    boingDuration: 0.5,
    boingEase: 'elastic.out(1, 0.35)',
    panelDelay: 0.2,
    panelDuration: 0.7,
    panelEase: 'back.out(1.15)', // just a hint of bounce
    panelFrom: { y: 60, scale: 0.94 },
    panelCloseDuration: 0.3,
    panelCloseEase: 'power2.in',
  },

  // --------------------------------------------------------------------------
  //  REDUCED MOTION (prefers-reduced-motion, or ?reduced)
  // --------------------------------------------------------------------------
  reducedMotion: {
    crossfadeDuration: 1.2,
    hintDelay: 0.5,
    disableBoil: true,
    stopSpin: true, // planets and clouds hold still
  },
};
