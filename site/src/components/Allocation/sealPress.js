import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// The sealing moment, in real light: a bead of black wax lands on the letter and
// spreads into a pool, a silver stamp comes down from above, is pressed hard and
// rocked, and lifts away leaving the House pillar raised in the wax, caught with
// silver where the stamp had been dusted. The paper is the XY plane, seen straight on, so the
// stamp travels along z toward and away from the reader.

// Black wax, glossy; the pillar is the same wax, dusted with silver
const WAX = 0x0b0c0d;
const WAX_R = 1; // world units; the canvas maps the seal to ~150px across

export const T = {
  pour: [0, 900], // a bead of wax lands and spreads from nothing
  descend: [700, 1600], // the stamp arrives from above
  press: [1600, 2700], // contact: pushed in hard, rocked, released
  lift: [2800, 3700], // and it rises away
};
export const PRESS_MS = T.lift[1];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const span = (t, [a, b]) => clamp01((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeIn = (x) => x * x * x;

// The wax's rim wanders a little, so it reads as poured rather than turned
const rimWobble = (a) => 0.045 * Math.sin(a * 7 + 0.4) + 0.025 * Math.sin(a * 13 + 2.2) + 0.02 * Math.sin(a * 3 + 5);

function lathe(profile, segments = 160) {
  // listed centre → rim for reading; built rim → centre so the faces point at the reader
  const pts = [...profile].reverse().map(([r, h]) => new THREE.Vector2(r, h));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateX(Math.PI / 2); // lathe axis (y) → toward the reader (z)
  // push the outer edge in and out by the rim wobble; the middle stays round, or
  // the wave runs inward as ridges and the pool looks like a crumpled umbrella
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.y);
    if (r < 1e-4) continue;
    const a = Math.atan2(v.y, v.x);
    const edge = THREE.MathUtils.smoothstep(r / WAX_R, 0.62, 0.98);
    const k = 1 + rimWobble(a) * edge;
    pos.setXY(i, v.x * k, v.y * k);
  }
  // weld the lathe's start and end so the shading runs on across the join (no seam line)
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const welded = mergeVertices(geo, 1e-4);
  welded.computeVertexNormals();
  return welded;
}

// A soft dome of molten wax, before the stamp
const POOL = [
  [0, 0.22], [0.35, 0.215], [0.62, 0.19], [0.8, 0.15], [0.92, 0.09], [0.98, 0.04], [1.0, 0.0],
];
// After the press: a recessed field, a rounded bead where the stamp's edge pushed
// wax outward, and a soft fall to the paper
const PRESSED = [
  // the extra points keep the field's shading flat right up to its edge
  [0, 0.12], [0.3, 0.12], [0.6, 0.12], [0.64, 0.12], [0.66, 0.12], [0.7, 0.14], [0.74, 0.2], [0.79, 0.235], [0.85, 0.225],
  [0.91, 0.18], [0.96, 0.11], [1.0, 0.05], [1.03, 0.0],
];

// The stamp: a silver die with a turned neck and a black lacquered handle
const STAMP_METAL = [
  [0, 0], [0.84, 0], [0.86, 0.02], [0.86, 0.2], [0.83, 0.24], [0.56, 0.29], [0.4, 0.36],
  [0.3, 0.52], [0.27, 0.64], [0.33, 0.69], [0.36, 0.74], [0.33, 0.79], [0.3, 0.82],
];
// a long, slender handle that swells toward the hand and ends in a small finial
const STAMP_HANDLE = [
  [0.3, 0.82], [0.25, 1.0], [0.21, 1.6], [0.22, 2.3], [0.27, 2.9], [0.33, 3.35],
  [0.35, 3.6], [0.32, 3.82], [0.22, 3.95], [0.16, 4.02], [0.17, 4.1], [0.11, 4.2], [0, 4.23],
];

// The stamp's face was dusted with silver before it was pressed, so everything
// it touched carries powder: the field and the raised pillar alike, fairly evenly,
// with a fine grain and the wax showing through a little. Steep faces (the
// pillar's bevels, the inner wall) hold less, which keeps the pillar legible.
// The rim beyond the stamp's edge stays bare black wax.
//
// The powder's look, as Tyler tuned it (2026-10-06): a light, chalky dusting
// caught mostly on the pillar, the field left nearly bare.
export const DUST_DEFAULTS = {
  coverage: 0.15, // the powder everywhere, before grain
  grain: 0.37, // how much the grain adds on top
  grainSize: 4.5, // size of the powder grain (about 8 to a screen pixel)
  drift: 0.15, // slow unevenness, where the brush laid more
  driftSize: 140,
  field: 0.03, // how much the flat field took
  pillar: 0.61, // how much the raised pillar took
  edges: 0.65, // how much the steep faces keep (0 = bare wax edges)
  max: 0.78, // never quite solid: a little wax always shows through
  reachIn: 0.6, // the stamp face's edge on the wax (full dust inside, none beyond reachOut)
  reachOut: 0.85,
  brightness: 0.43, // the silver's colour
  metalness: 0.86,
  roughness: 0.69,
};

function dustUniforms() {
  const u = {};
  for (const [k, v] of Object.entries(DUST_DEFAULTS)) u[k] = { value: v };
  return u;
}

//   unit:   object units → the pillar's units (~400 × 600), so the grain matches
//   which:  'pillar' or 'field', for the amount it took (and whether reach applies)
function dustedWax(uniforms, { unit, which }) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: WAX,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
  });
  const isField = which === 'field';
  mat.onBeforeCompile = (shader) => {
    // the shared settings, so the field and the pillar always match
    for (const k of Object.keys(DUST_DEFAULTS)) shader.uniforms[`uDust_${k}`] = uniforms[k];
    shader.uniforms.uDustUnit = { value: unit };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDustPos;\nvarying float vDustUp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDustPos = position;\nvDustUp = objectNormal.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vDustPos;
varying float vDustUp;
uniform float uDustUnit;
${Object.keys(DUST_DEFAULTS).map((k) => `uniform float uDust_${k};`).join('\n')}
float dustHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float dustNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(dustHash(i), dustHash(i + vec2(1, 0)), f.x), mix(dustHash(i + vec2(0, 1)), dustHash(i + vec2(1, 1)), f.x), f.y);
}
float dustAmount() {
  vec2 p = vDustPos.xy * uDustUnit;
  float drift = dustNoise(p / uDust_driftSize) * 0.6 + dustNoise(p / (uDust_driftSize * 0.4)) * 0.4;
  float grain = dustNoise(p / uDust_grainSize) * 0.55 + dustNoise(p / (uDust_grainSize * 0.5)) * 0.45;
  float d = uDust_coverage + uDust_grain * smoothstep(0.25, 0.85, grain) + uDust_drift * drift;
  d *= ${isField ? 'uDust_field' : 'uDust_pillar'};
  d *= mix(uDust_edges, 1.0, smoothstep(0.3, 0.9, vDustUp));
  ${isField ? 'd *= 1.0 - smoothstep(uDust_reachIn, uDust_reachOut, length(vDustPos.xy));' : ''}
  return clamp(d, 0.0, uDust_max);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float dust = dustAmount();
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(uDust_brightness, uDust_brightness + 0.01, uDust_brightness + 0.02), dust);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, uDust_metalness, dust);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, uDust_roughness, dust);`);
  };
  // the field and the pillar compile different shaders (three caches by the function's source otherwise)
  mat.customProgramCacheKey = () => `dusted-wax:${which}`;
  return mat;
}

function turned(profile, segments = 96) {
  const geo = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), segments);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createSealPress(canvas, { reducedMotion = false } = {}) {
  const dustSettings = dustUniforms();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // softened by the light's shadow.radius

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  // The camera is the reader's eye: level with the middle of the screen, looking
  // straight at the page, so the paper stays flat and true while the stamp, which
  // stands off the page, is seen in perspective. The canvas is just the window of
  // that view around the seal (an off-centre frustum).
  const camera = new THREE.PerspectiveCamera();
  const EYE_Z = 24; // world units from the page (~1800px at 75px a unit)
  const PX = 75; // screen pixels per world unit at the page

  // Light from the upper left, like the rest of the site
  const key = new THREE.DirectionalLight(0xfff4e8, 1.7);
  key.position.set(-7, 6, 5.5); // low enough to rake across the impression
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -5;
  key.shadow.camera.far = 30;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ee, 0.35);
  fill.position.set(5, -3, 6);
  scene.add(fill);

  // The letter itself only catches shadows; the paper is the page underneath
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.32 }));
  ground.receiveShadow = true;
  scene.add(ground);

  const waxMat = new THREE.MeshPhysicalMaterial({
    color: WAX,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
  });
  const reliefMat = dustedWax(dustSettings, { unit: 1, which: 'pillar' });
  // the pressed wax: dusted where the stamp's face met it, bare beyond its edge
  // (1 world unit ≈ 612 pillar units)
  const pressedMat = dustedWax(dustSettings, { unit: 612, which: 'field' });

  const seal = new THREE.Group();
  seal.visible = false;
  scene.add(seal);
  const pool = new THREE.Mesh(lathe(POOL), waxMat);
  const pressed = new THREE.Mesh(lathe(PRESSED), pressedMat);
  for (const m of [pool, pressed]) { m.castShadow = true; m.receiveShadow = true; }
  pressed.visible = false;
  seal.add(pool, pressed);

  // the pillar, raised in the wax where the die was cut
  const relief = new THREE.Group();
  relief.visible = false;
  seal.add(relief);

  const stamp = new THREE.Group();
  const silver = new THREE.MeshPhysicalMaterial({ color: 0x9ea2a6, metalness: 0.88, roughness: 0.3 });
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x121a1f, metalness: 0, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 });
  const metal = new THREE.Mesh(turned(STAMP_METAL), silver);
  const handle = new THREE.Mesh(turned(STAMP_HANDLE), lacquer);
  metal.castShadow = true;
  handle.castShadow = true;
  stamp.add(metal, handle);
  stamp.visible = false;
  scene.add(stamp);

  new GLTFLoader().load('/models/melange-mark.glb', (gltf) => {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const mark = new THREE.Mesh(o.geometry, reliefMat);
      const s = 0.98 / 600; // the pillar fills most of the pressed field
      mark.scale.set(s, s, s * 4); // deeper than true scale so the bevels catch the light
      mark.position.z = PRESSED[0][1] + 12 * s * 4 - 0.01;
      mark.castShadow = true;
      mark.receiveShadow = true;
      relief.add(mark);
    });
    render();
  });

  // Where the stamp waits, out of frame above and close to the reader
  const START = new THREE.Vector3(1.4, 8.5, 5.5);
  const CONTACT = new THREE.Vector3(0, 0, 0.12);

  const setSize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    // where the eye sits relative to the seal (the canvas centre), in world units
    const r = canvas.getBoundingClientRect();
    const ex = (window.innerWidth / 2 - (r.left + w / 2)) / PX;
    const ey = -(window.innerHeight / 2 - (r.top + h / 2)) / PX;
    camera.position.set(ex, ey, EYE_Z);
    camera.rotation.set(0, 0, 0);
    camera.near = 0.5;
    camera.far = 60;
    const k = camera.near / EYE_Z;
    const hw = w / PX / 2;
    const hh = h / PX / 2;
    camera.projectionMatrix.makePerspective((-hw - ex) * k, (hw - ex) * k, (hh - ey) * k, (-hh - ey) * k, camera.near, camera.far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld();
  };

  function render() { renderer.render(scene, camera); }

  // Pose everything for time t (ms) into the press
  function pose(t) {
    // the pour: a low bead lands and spreads out to its pool
    const p = span(t, T.pour);
    const spreadOut = easeOut(p);
    const pressedYet = t >= T.press[0];
    seal.visible = t > 0;
    const bead = Math.min(1, p * 4) * (1.15 - 0.15 * spreadOut); // only a little taller than it settles
    seal.scale.set(Math.max(0.001, spreadOut), Math.max(0.001, spreadOut), Math.max(0.001, bead));
    pool.visible = !pressedYet;
    pressed.visible = pressedYet;
    relief.visible = pressedYet;

    // descend
    const down = easeInOut(span(t, T.descend));
    const up = easeIn(span(t, T.lift));
    stamp.visible = t > T.descend[0] && up < 1;
    stamp.position.lerpVectors(START, CONTACT, down);
    // a slight lean on the way in that straightens as it lands
    let tiltX = (1 - down + up) * -0.32;
    let tiltY = (1 - down + up) * 0.16;

    // the press: driven in hard, then rocked round its rim the way a hand leans
    // into a seal to be sure of every edge, then let go
    const q = span(t, T.press);
    const bite = easeOut(clamp01(q / 0.14)) * (1 - easeInOut(clamp01((q - 0.86) / 0.14)));
    const r = clamp01((q - 0.12) / 0.76);
    const rock = Math.sin(Math.PI * r); // swells in, dies away
    const turn = Math.PI * 2 * 1.25 * r; // a little over one circuit
    const lean = 0.055 * rock; // about three degrees at most
    tiltX += lean * Math.sin(turn);
    tiltY += lean * Math.cos(turn);
    // each lean pushes a touch deeper
    const dip = 0.085 * bite + 0.02 * rock * Math.abs(Math.sin(turn * 2));
    if (q > 0 && up === 0) stamp.position.z = CONTACT.z - dip;
    if (up > 0) stamp.position.lerpVectors(CONTACT, START, up);
    stamp.rotation.x = tiltX;
    stamp.rotation.y = tiltY;

    // the wax gives under the press and spreads, and stays spread
    if (pressedYet) {
      const spread = 1 + 0.08 * easeOut(clamp01(q / 0.5));
      seal.scale.set(spread, spread, 1 - dip * 1.4);
    }
  }

  let raf = 0;
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  return {
    /** Play the whole press; resolves when the stamp has gone. */
    press() {
      stop();
      setSize();
      if (reducedMotion) {
        pose(PRESS_MS);
        render();
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(PRESS_MS, now - start);
          pose(t);
          render();
          if (t < PRESS_MS) raf = requestAnimationFrame(tick);
          else { raf = 0; resolve(); }
        };
        raf = requestAnimationFrame(tick);
      });
    },
    /** Show the finished seal without playing the press. */
    show() { stop(); setSize(); pose(PRESS_MS); render(); },
    reset() { stop(); pose(0); render(); },
    /** Freeze at one moment of the press (for reviewing frames). */
    poseAt(t) { stop(); setSize(); pose(t); render(); },
    resize() { setSize(); render(); },
    dispose() {
      stop();
      scene.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      [waxMat, reliefMat, pressedMat, silver, lacquer, ground.material].forEach((m) => m.dispose());
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
