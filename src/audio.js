/**
 * AUDIO: Web Audio with named cues, a looping music bed, and a mute toggle.
 *
 * Browsers block sound until the user interacts, so nothing is created
 * until unlock() is called INSIDE the title-screen tap handler. Cues with
 * `file: null` in the config are silently skipped, so the timeline can call
 * cue('touchdown') today and it'll just start working once a file exists.
 *
 * Web Audio (rather than <audio> tags) is used because it fires instantly
 * and can overlap the same sound, which matters for snappy SFX on iOS.
 */
const STORAGE_KEY = 'stdMuted';

export function createAudio(cfg) {
  let ctx = null;
  let master = null;
  const buffers = {};
  let muted = readMuted();

  async function load(file) {
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(res.status);
      return await ctx.decodeAudioData(await res.arrayBuffer());
    } catch (err) {
      console.warn(`[audio] couldn't load ${file}`, err);
      return null;
    }
  }

  function play(buffer, volume, { loop = false, fadeIn = 0 } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(fadeIn ? 0 : volume, ctx.currentTime);
    if (fadeIn) gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeIn);
    src.connect(gain).connect(master);
    src.start();
  }

  return {
    get muted() {
      return muted;
    },

    /** Must be called synchronously inside a tap/click handler. */
    unlock() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : cfg.masterVolume;
      master.connect(ctx.destination);
      ctx.resume();

      for (const [name, cue] of Object.entries(cfg.cues)) {
        if (cue.file) load(cue.file).then((b) => b && (buffers[name] = b));
      }
      if (cfg.music.file) {
        load(cfg.music.file).then((b) => b && play(b, cfg.music.volume, { loop: true, fadeIn: cfg.music.fadeIn }));
      }
      // Pause everything when the tab is hidden (phone locked, app switched)
      document.addEventListener('visibilitychange', () => {
        document.hidden ? ctx.suspend() : ctx.resume();
      });
    },

    /** Play a named cue from CONFIG.audio.cues (no-op if missing/unloaded). */
    cue(name) {
      const buffer = buffers[name];
      if (!ctx || !buffer) return;
      play(buffer, cfg.cues[name].volume);
    },

    setMuted(value) {
      muted = value;
      try {
        localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
      } catch {}
      if (master) master.gain.setTargetAtTime(value ? 0 : cfg.masterVolume, ctx.currentTime, 0.05);
    },
  };
}

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
