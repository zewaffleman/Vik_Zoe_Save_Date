/**
 * REALISTIC 3D GLOBE (three.js) for Earth and Io.
 *
 * Each globe renders into its own transparent <canvas> inside a stage
 * sprite, so the timeline can still move/squash/shake the sprite with
 * stepped poses exactly like the drawn elements. The planet itself stays
 * smooth and photographic: that contrast with the hand-drawn characters
 * is the point.
 *
 * - Orthographic camera → the sphere exactly fills the sprite box; the
 *   canvas is a bit bigger (glowMargin) so the atmosphere glow can spill out.
 * - `face: [lat, lon]` turns the globe so that spot sits near the top,
 *   tipped `faceTilt` degrees toward the viewer (Earth: launch from Brisbane).
 * - Only renders while on screen.
 * - If WebGL isn't available, falls back to a flat CSS circle with the texture.
 */
import * as THREE from 'three';
import { gsap } from 'gsap';

const DEG = Math.PI / 180;

export function createGlobe(container, o) {
  const margin = o.glowMargin ?? 0.12; // extra canvas around the sphere, per side, as a fraction of size
  const canvas = document.createElement('canvas');
  canvas.className = 'globe-canvas';
  // (a <canvas> won't stretch to fill insets, so size it explicitly)
  Object.assign(canvas.style, {
    left: `${-margin * 100}%`,
    top: `${-margin * 100}%`,
    width: `${(1 + 2 * margin) * 100}%`,
    height: `${(1 + 2 * margin) * 100}%`,
  });
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (err) {
    console.warn('[globe] WebGL unavailable, using flat fallback', err);
    canvas.remove();
    container.classList.add('globe-fallback');
    container.style.backgroundImage = `url("${o.map}")`;
    return { setStageScale() {} };
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // --- scene + camera: radius-1 sphere fills the inner (non-margin) area
  const scene = new THREE.Scene();
  const half = 1 + 2 * margin; // canvas half-extent in sphere radii
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 10);
  camera.position.z = 5;

  const loader = new THREE.TextureLoader();
  const tex = (url) => {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };

  // Orientation: tilt group (x) › spin group (y) › meshes
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  tilt.add(spin);
  scene.add(tilt);
  if (o.face) orientToFace(tilt, spin, o.face, o.faceTilt ?? 20);

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshStandardMaterial({ map: tex(o.map), roughness: 1, metalness: 0 }),
  );
  spin.add(globe);

  let clouds = null;
  if (o.clouds) {
    const alpha = loader.load(o.clouds); // white-on-black cloud map used as transparency
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.012, 96, 64),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaMap: alpha,
        transparent: true,
        opacity: o.cloudOpacity ?? 0.9,
        depthWrite: false,
        roughness: 1,
      }),
    );
    spin.add(clouds);
  }

  // Atmosphere: soft halo outside the rim + faint haze on the limb
  if (o.glow) {
    const outer = 1 + (o.glow.size ?? 0.1);
    scene.add(halo(outer, o.glow.color, o.glow.strength ?? 1));
    scene.add(limb(o.glow.color, o.glow.limb ?? 0.5));
  }

  // Lighting: a "sun" from the upper left, plus a tinted fill so the night
  // side reads as dusk rather than black.
  const sun = new THREE.DirectionalLight(o.light?.color ?? 0xffffff, o.light?.intensity ?? 2.6);
  sun.position.set(...(o.light?.dir ?? [-2, 1.4, 2.2]));
  scene.add(sun);
  scene.add(new THREE.AmbientLight(o.ambient?.color ?? 0x8a70b0, o.ambient?.intensity ?? 0.5));

  // --- sizing: canvas pixels = stage size × stage scale × device pixel ratio
  let stageScale = 1;
  function resize() {
    const cssPx = o.size * half * stageScale;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.maxPixelRatio ?? 2));
    renderer.setSize(cssPx, cssPx, false);
  }
  resize();

  // --- render loop (skips when off screen or hidden)
  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.min(deltaMs, 100) / 1000;
    globe.rotation.y += (o.spin ?? 0) * dt;
    if (clouds) clouds.rotation.y += (o.cloudSpin ?? 0) * dt;
    if (!isVisible(container)) return;
    renderer.render(scene, camera);
  });

  return {
    setStageScale(s) {
      stageScale = s;
      resize();
    },
  };
}

/** Rotate groups so [lat, lon] sits at the top of the globe, tipped toward camera. */
function orientToFace(tilt, spin, [lat, lon], towardViewerDeg) {
  // three.js SphereGeometry maps an equirectangular texture with u=0 at -180° lon.
  // Longitude λ ends up facing the camera (+z) when spin.rotation.y = -(λ + 90°).
  spin.rotation.y = -(lon + 90) * DEG;
  // Now the spot is at elevation `lat` on the camera-facing meridian. Tip the
  // globe about x so it rises to (90° − towardViewer).
  tilt.rotation.x = (lat - (90 - towardViewerDeg)) * DEG;
}

function halo(radius, color, strength) {
  // Seen from the back, the larger sphere's normals point away from us near
  // its centre and sideways at its rim. Fade from bright (just outside the
  // globe) to nothing (at the halo's edge).
  const edge = Math.sqrt(1 - 1 / (radius * radius)); // |normal.z| where the globe's rim is
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uEdge: { value: edge }, uStrength: { value: strength } },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        void main() {
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uEdge; uniform float uStrength;
        varying vec3 vN;
        void main() {
          float t = clamp(-vN.z / uEdge, 0.0, 1.0);
          float a = pow(t, 2.2) * uStrength;
          gl_FragColor = vec4(uColor, a);
        }`,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    }),
  );
}

function limb(color, strength) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1.004, 96, 64),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        void main() {
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uStrength;
        varying vec3 vN;
        void main() {
          float a = pow(1.0 - clamp(vN.z, 0.0, 1.0), 3.0) * uStrength;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true,
      depthWrite: false,
    }),
  );
}

function isVisible(el) {
  if (getComputedStyle(el).visibility === 'hidden') return false;
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}
