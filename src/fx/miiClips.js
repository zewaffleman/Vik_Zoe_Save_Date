/**
 * MII CLIP PLAYER: your rendered Mii animations, stuck to the planets.
 *
 * Each Mii has a set of clips (see CONFIG.assets.miis):
 *   walk       – walk cycle (can loop just a section of the file)
 *   idleEarth  – idles picked at random on Earth
 *   impatient  – mixed into the Earth idles once the guest has waited a while
 *   idleIo     – idles picked at random on Io
 *
 * The timeline only says WHAT the Mii is doing (data-pose="idle" | "walk")
 * and main.js says WHERE (Earth or Io). This player picks the clip. An idle
 * repeats until it has been on screen for a random `idleHold` time, then
 * another one is chosen (never the same twice in a row when there's a
 * choice), so short clips don't flicker and long waits don't feel looped.
 *
 * Per-clip options (a clip can be a plain path or an object):
 *   { src, mirror: true }       flip it horizontally (to face the other way)
 *   { src, foot: { x, y } }     where the feet are in THIS render (0–1), so
 *                               clips framed differently still line up
 *   { src, loop: [start, end] } loop only this section (seconds)
 *
 * Two kinds of clip file:
 *  - Video (.mp4 / .webm) on a green screen: drawn to a <canvas> through a
 *    tiny WebGL "chroma key" shader that turns the green transparent and
 *    removes green spill from the edges.
 *  - Image (.gif / .webp) with its own transparency: shown as-is. Browsers
 *    can't report when a GIF finishes, so it counts as "ended" after
 *    `imageClipDuration` seconds.
 */
import { gsap } from 'gsap';

const allPlayers = [];
/** Pause/resume every Mii and passenger clip (e.g. while the info card covers them). */
export function pauseClips(on) {
  allPlayers.forEach((p) => p.freeze(on));
}

const isImage = (src) => /\.(gif|webp|png|apng)(\?|#|$)/i.test(src);
const now = () => performance.now() / 1000;

export function createMiiPlayer(container, clipSet, opts) {
  const {
    fps = 0,
    key,
    resolution = 256,
    imageClipDuration = 3,
    reduced = false,
    anchor = { x: 0.5, y: 0.89 }, // where the sprite's "feet" point is in its box
    idleHold = [3, 6],
    impatientChance = 0.5,
    onClip, // optional: called with each clip as it starts (e.g. to show the "!")
    eager = true, // false: don't download until unlock() (the first tap)
  } = opts;

  // --- one element per distinct file (several clips can share a file) --------
  const files = new Map();
  const file = (src) => {
    if (files.has(src)) return files.get(src);
    let f;
    if (isImage(src)) {
      const img = document.createElement('img');
      img.alt = '';
      img.className = 'mii-clip';
      img.style.visibility = 'hidden';
      img.src = src;
      container.appendChild(img);
      f = { src, kind: 'image', el: img, ready: img.decode().catch(() => {}) };
    } else {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, playsInline: true, preload: 'auto', src });
      v.setAttribute('muted', ''); // iOS needs the attribute, not just the property
      v.setAttribute('playsinline', '');
      v.className = 'mii-src';
      container.appendChild(v);
      f = {
        src,
        kind: 'video',
        el: v,
        active: v, // the copy currently on screen (see `twin` below)
        ready: new Promise((res) => {
          if (v.readyState >= 2) res();
          v.addEventListener('loadeddata', res, { once: true });
          v.addEventListener('error', () => (console.warn('[mii] could not load', src), res()), { once: true });
        }),
      };
      v.addEventListener('ended', () => current?.file === f && clipEnded());
    }
    files.set(src, f);
    return f;
  };

  /**
   * Looping a SECTION means jumping back in the video, and seeks aren't
   * instant: you'd see a hitch at every seam. So section-looped clips get a
   * second copy of the video (a "twin") that waits, already parked at the
   * loop start; at the seam we swap which copy is drawn. No seek on screen.
   */
  const addTwin = (f) => {
    if (f.twin || f.kind !== 'video') return;
    const t = f.el.cloneNode();
    t.muted = true; // cloneNode copies attributes, not the muted property
    container.appendChild(t);
    f.twin = t;
  };
  const videosOf = (f) => (f.twin ? [f.el, f.twin] : [f.el]);

  // A clip = a file + how to show it (mirror, foot alignment, loop section)
  const clip = (spec) => {
    const s = typeof spec === 'string' ? { src: spec } : spec;
    if (s.loop) addTwin(file(s.src));
    const foot = { x: s.foot?.x ?? anchor.x, y: s.foot?.y ?? anchor.y };
    const fx = s.mirror ? 1 - foot.x : foot.x;
    const shift = `translate(${((anchor.x - fx) * 100).toFixed(2)}%, ${((anchor.y - foot.y) * 100).toFixed(2)}%)`;
    return { ...s, file: file(s.src), transform: s.mirror ? `${shift} scaleX(-1)` : shift };
  };
  const clips = {
    walk: clip(clipSet.walk),
    idle: [(clipSet.idleEarth ?? []).map(clip), (clipSet.idleIo ?? []).map(clip)], // [Earth, Io]
    impatient: (clipSet.impatient ?? []).map((spec) => ({ ...clip(spec), impatient: true })),
  };

  // Only the clips on screen at the start download straight away (walk +
  // Earth idles). The rest wait for the first tap (see unlock()), so the
  // title screen loads faster.
  const firstNeeded = new Set(eager ? [clips.walk, ...clips.idle[0]].map((c) => c.file) : []);
  for (const f of files.values()) {
    if (f.kind === 'video' && !firstNeeded.has(f)) videosOf(f).forEach((v) => (v.preload = 'metadata'));
  }

  // --- canvas + keyer for video clips ----------------------------------------
  const canvas = document.createElement('canvas');
  canvas.className = 'mii-canvas';
  canvas.width = canvas.height = resolution;
  container.appendChild(canvas);
  const keyer = createKeyer(canvas, key);

  // --- playback state --------------------------------------------------------
  let current = null; // current clip
  let mode = null; // 'idle' | 'walk'
  let body = -1;
  let impatient = false;
  let lastIdle = null;
  let holdUntil = 0;
  let imageTimer = null;
  let lastDraw = -Infinity;
  let needsDraw = false; // reduced motion: draw a single still frame
  let frozen = false; // paused while the info card covers the scene

  function show(c, { loop = false } = {}) {
    if (current && current.file !== c.file) {
      if (current.file.kind === 'video') videosOf(current.file).forEach((v) => v.pause());
      else current.file.el.style.visibility = 'hidden';
    }
    imageTimer?.kill();
    if (c !== current) onClip?.(c);
    current = c;
    const f = c.file;
    if (f.kind === 'video') {
      canvas.style.visibility = 'visible';
      canvas.style.transform = c.transform;
      f.active = f.el;
      f.el.loop = loop && !c.loop; // a loop *section* is handled in the ticker below
      f.el.currentTime = c.loop ? c.loop[0] : 0;
      if (reduced) {
        f.el.pause(); // hold the first frame
        needsDraw = true;
      } else {
        f.el.play().catch(() => {}); // may be blocked until the first tap; unlock() retries
      }
    } else {
      canvas.style.visibility = 'hidden';
      f.el.style.transform = c.transform;
      f.el.style.visibility = 'visible';
      f.el.src = `${f.src.split('#')[0]}#${Date.now()}`; // restart the GIF from frame 1
      if (!loop && !reduced) imageTimer = gsap.delayedCall(imageClipDuration, clipEnded);
    }
  }

  function idleList() {
    const list = clips.idle[body] ?? clips.idle[0];
    if (body === 0 && impatient && clips.impatient.length && Math.random() < impatientChance) return clips.impatient;
    return list;
  }

  function pickIdle(list = idleList()) {
    const pool = list.length > 1 ? list.filter((c) => c !== lastIdle) : list;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    lastIdle = pick;
    holdUntil = now() + gsap.utils.random(idleHold[0], idleHold[1]);
    // nothing else to switch to → let the browser loop it seamlessly
    const only = (clips.idle[body] ?? []).length <= 1 && !(body === 0 && impatient && clips.impatient.length);
    show(pick, { loop: only || reduced });
  }

  /** The current idle finished a pass: repeat it, or move on once held long enough. */
  function clipEnded() {
    if (mode !== 'idle') return;
    if (now() < holdUntil) show(current);
    else pickIdle();
  }

  gsap.ticker.add((time) => {
    if (frozen || !current || current.file.kind !== 'video') return;
    const f = current.file;
    let v = f.active;
    // looping just a section (e.g. the part of a walk render facing one way)
    if (current.loop && !reduced) {
      const [from, to] = current.loop;
      const spare = f.twin && (v === f.el ? f.twin : f.el);
      // keep the spare copy parked at the loop start, ready to take over
      if (spare && spare.paused && !spare.seeking && Math.abs(spare.currentTime - from) > 0.02) spare.currentTime = from;
      if (v.currentTime >= to - 1 / 120) {
        if (spare && spare.readyState >= 2 && !spare.seeking) {
          spare.play().catch(() => {});
          v.pause();
          f.active = v = spare; // swap: no visible seek
        } else {
          v.currentTime = from; // fallback: plain jump back
        }
      }
    }
    // draw the current frame through the keyer, at `fps` (0 = every frame)
    if (v.readyState < 2 || (reduced && !needsDraw)) return;
    if (fps && time - lastDraw < 1 / fps) return;
    lastDraw = time;
    needsDraw = false;
    keyer.draw(v);
  });

  const player = {
    /** Files needed before the title screen shows (walk + Earth idles). */
    ready: Promise.all([clips.walk, ...clips.idle[0]].map((c) => c.file.ready)),

    /** Called every frame by main.js; only acts when something changes. */
    update(newMode, newBody) {
      const m = newMode === 'walk' ? 'walk' : 'idle';
      if (m === mode && newBody === body) return;
      mode = m;
      body = newBody;
      if (m === 'walk') show(clips.walk, { loop: true });
      else pickIdle();
    },

    /** Guest is taking a while: start mixing in the impatient clips (Earth only). */
    setImpatient(on) {
      if (on === impatient) return;
      impatient = on;
      if (on && mode === 'idle' && body === 0 && clips.impatient.length) pickIdle(clips.impatient);
    },

    /**
     * Call inside the first tap. iOS Low Power Mode blocks video autoplay
     * until a user gesture, so "touch" every video once, then resume. This
     * also starts downloading the clips that were held back.
     */
    unlock() {
      for (const f of files.values()) {
        if (f.kind !== 'video') continue;
        for (const v of videosOf(f)) {
          v.preload = 'auto';
          v.play().then(() => (current?.file !== f || v !== f.active) && v.pause()).catch(() => {});
        }
      }
    },

    /** Hold the current frame (true) or carry on playing (false). */
    freeze(on) {
      if (on === frozen) return;
      frozen = on;
      if (!current || current.file.kind !== 'video' || reduced) return;
      if (on) current.file.active.pause();
      else current.file.active.play().catch(() => {});
    },
  };
  allPlayers.push(player);
  return player;
}

// ---------------------------------------------------------------------------
// Chroma key: WebGL shader (fast), with a 2D-canvas fallback.
// ---------------------------------------------------------------------------
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function createKeyer(canvas, key) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  if (!gl) return create2DKeyer(canvas, key);

  const vs = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // video rows go top→bottom
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;
  // Distance from the key colour measured in chroma (CbCr) only, so shading
  // and lighting on the green don't matter, just "how green-screen-ish".
  const fs = `
    precision mediump float;
    uniform sampler2D uTex;
    uniform vec3 uKey;
    uniform float uSim, uSmooth, uSpill;
    varying vec2 vUv;
    vec2 chroma(vec3 c) {
      float y = dot(c, vec3(0.299, 0.587, 0.114));
      return vec2((c.b - y) * 0.565, (c.r - y) * 0.713);
    }
    void main() {
      vec3 c = texture2D(uTex, vUv).rgb;
      float d = distance(chroma(c), chroma(uKey));
      float a = smoothstep(uSim, uSim + uSmooth, d);
      // spill: near the edges, stop green being brighter than red/blue
      float edge = 1.0 - smoothstep(uSim, uSim + uSmooth * 4.0, d);
      c.g = mix(c.g, min(c.g, max(c.r, c.b)), edge * uSpill);
      gl_FragColor = vec4(c * a, a);
    }`;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.uniform3fv(gl.getUniformLocation(prog, 'uKey'), hexToRgb(key.color));
  gl.uniform1f(gl.getUniformLocation(prog, 'uSim'), key.similarity);
  gl.uniform1f(gl.getUniformLocation(prog, 'uSmooth'), key.smoothness);
  gl.uniform1f(gl.getUniformLocation(prog, 'uSpill'), key.spill);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);

  return {
    draw(video) {
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      } catch {
        return; // frame not ready yet
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}

/** Same maths on the CPU, for the rare browser without WebGL. */
function create2DKeyer(canvas, key) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const [kr, kg, kb] = hexToRgb(key.color);
  const ky = 0.299 * kr + 0.587 * kg + 0.114 * kb;
  const kcb = (kb - ky) * 0.565, kcr = (kr - ky) * 0.713;
  const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  return {
    draw(video) {
      const { width: w, height: h } = canvas;
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const dist = Math.hypot((b - y) * 0.565 - kcb, (r - y) * 0.713 - kcr);
        const a = smoothstep(key.similarity, key.similarity + key.smoothness, dist);
        const edge = 1 - smoothstep(key.similarity, key.similarity + key.smoothness * 4, dist);
        d[i + 1] = 255 * (g + (Math.min(g, Math.max(r, b)) - g) * edge * key.spill);
        d[i + 3] = 255 * a;
      }
      ctx.putImageData(img, 0, 0);
    },
  };
}
