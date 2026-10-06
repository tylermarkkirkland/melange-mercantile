// Capsule lab (dev only, /capsule-lab.html): the melange capsule alone on black,
// lit like the site. Drag to spin it, and tune every setting of the sand live.
// It uses the same vial.js as the page, so "Copy values" → paste into
// SAND_DEFAULTS makes the site match.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import GUI from 'lil-gui';
import { createVial, SAND_DEFAULTS } from '../components/SunlitScene/vial.js';

const STORE = 'capsule-lab';
const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
    // keep only settings that still exist
    return Object.fromEntries(Object.keys(SAND_DEFAULTS).map((k) => [k, k in saved ? saved[k] : SAND_DEFAULTS[k]]));
  } catch {
    return { ...SAND_DEFAULTS };
  }
};
const save = (s) => {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* fine without */ }
};

document.body.style.cssText = 'margin:0;background:#000;overflow:hidden';
const mount = document.getElementById('lab');

// ---------- renderer and scene, matched to SunlitScene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentRotation.set(Math.PI * 0.42, 0.5, 0);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);

const key = new THREE.DirectionalLight(0xffe2c0, 1);
key.position.set(-6, 3.5, 6.9);
const rim = new THREE.DirectionalLight(0x8fb6d4, 1.2);
rim.position.set(4, 2, -5);
scene.add(key, rim);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.5, 0.96);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- the capsule ----------
const settings = load();
const vial = createVial(renderer, settings);
// the lab's drag turns this holder; the capsule inside behaves exactly as on the site
const holder = new THREE.Group();
holder.add(vial.group);
scene.add(holder);

// what the page does to it, as adjustable "view" values
const view = {
  autoSpin: false,
  spinSpeed: 0.15,
  lean: 1, // the site's resting lean (1) or upright (0)
  keyLight: 3.1, // the site eases the sun to ~35% for the capsule
  environment: 0.42,
  bloom: 0.35,
  background: '#000000',
};

window.__lab = { vial, holder, view }; // for inspecting in devtools

// Drag to tip and turn the capsule itself (not the camera), so the sand inside
// has something to settle against. Scroll to zoom; double-click to set it upright.
const turn = new THREE.Quaternion();
const turnTarget = new THREE.Quaternion();
const dragAxis = new THREE.Vector3();
const step = new THREE.Quaternion();
let dragging = null;
const el = renderer.domElement;
el.style.cursor = 'grab';
el.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
el.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - dragging.x;
  const dy = e.clientY - dragging.y;
  dragging = { x: e.clientX, y: e.clientY };
  const len = Math.hypot(dx, dy);
  if (!len) return;
  // left/right leans it sideways in the picture; up/down tips it toward or away from you
  dragAxis.set(dy / len, 0, -dx / len);
  step.setFromAxisAngle(dragAxis, len * 0.008);
  turnTarget.premultiply(step);
});
const endDrag = () => { dragging = null; el.style.cursor = 'grab'; };
el.addEventListener('pointerup', endDrag);
el.addEventListener('pointercancel', endDrag);
el.addEventListener('dblclick', () => turnTarget.identity());
el.addEventListener('wheel', (e) => {
  e.preventDefault();
  camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.01, 4, 18);
}, { passive: false });

// the page's lean lives on an inner group; scale it toward upright with `lean`
const axis = vial.group.children[0];
const LEAN = axis.rotation.clone();

// ---------- the panel ----------
const gui = new GUI({ title: 'Capsule lab' });
const changed = () => { vial.set(settings); save(settings); };
const add = (folder, k, min, max, step, name) => folder.add(settings, k, min, max, step).name(name).onChange(changed);

const sandF = gui.addFolder('Sand');
add(sandF, 'fill', 0.1, 0.9, 0.01, 'Fill');
add(sandF, 'repose', 0, 90, 1, 'Angle of repose (°)');
add(sandF, 'slump', 0.02, 1, 0.01, 'Slump speed');
add(sandF, 'settleTo', 0, 1, 0.01, 'Slump goes to (× repose)');
add(sandF, 'creep', 0, 5, 0.1, 'Creep while holding (°/s)');
add(sandF, 'mound', 0, 0.3, 0.005, 'Mound');
add(sandF, 'ripple', 0, 3, 0.05, 'Ripple height');
add(sandF, 'rippleScale', 0.3, 3, 0.05, 'Ripple tightness');

const lookF = gui.addFolder('Powder');
add(lookF, 'grain', 0.08, 1.5, 0.01, 'Grain size');
lookF.addColor(settings, 'color').name('Tint').onChange(changed);
add(lookF, 'glow', 0, 0.6, 0.01, 'Inner glow');
add(lookF, 'glints', 0, 3, 0.05, 'Glints (amount)');
add(lookF, 'glintBright', 0, 3, 0.05, 'Glints (brightness)');
add(lookF, 'cling', 0, 1, 0.01, 'Dust on glass');
add(lookF, 'clingHeight', 0, 0.4, 0.005, 'Dust height');

const moteF = gui.addFolder('Motes in the beam');
add(moteF, 'motes', 0, 1, 0.01, 'How many');
add(moteF, 'moteSize', 0.2, 4, 0.05, 'Size');
add(moteF, 'moteOpacity', 0, 1, 0.01, 'Opacity');
add(moteF, 'moteSpeed', 0, 5, 0.05, 'Rise speed');

const lightF = gui.addFolder('Capsule light');
add(lightF, 'lamp', 0, 2, 0.01, 'Lamp');
add(lightF, 'shaft', 0, 2, 0.01, 'Beam');
add(lightF, 'condensation', 0, 1, 0.01, 'Condensation');

const viewF = gui.addFolder('View (lab only)');
viewF.add(view, 'autoSpin').name('Spin by itself');
viewF.add(view, 'spinSpeed', 0, 1, 0.01).name('Spin speed');
viewF.add(view, 'lean', 0, 1.5, 0.01).name('Lean');
viewF.add(view, 'keyLight', 0, 10, 0.1).name('Sun');
viewF.add(view, 'environment', 0, 1.5, 0.01).name('Room reflections');
viewF.add(view, 'bloom', 0, 1.5, 0.01).name('Bloom');
viewF.addColor(view, 'background').name('Background');
viewF.close();

gui.add({
  copy: async () => {
    const text = `Capsule sand settings:\n${JSON.stringify(settings, null, 2)}`;
    try { await navigator.clipboard.writeText(text); } catch { window.prompt('Copy these settings:', JSON.stringify(settings)); }
  },
}, 'copy').name('Copy values');
gui.add({
  reset: () => {
    Object.assign(settings, SAND_DEFAULTS);
    try { localStorage.removeItem(STORE); } catch { /* fine without */ }
    vial.set(settings);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  },
}, 'reset').name('Reset to site defaults');

const hint = document.createElement('p');
hint.textContent = 'Drag sideways to lean it · up and down to tip it toward you · scroll to zoom · double-click to reset';
hint.style.cssText = 'position:fixed;left:20px;bottom:16px;margin:0;font:12px/1 system-ui,sans-serif;color:#75797b;letter-spacing:.08em';
document.body.appendChild(hint);

// how far the sand's surface is from level right now
const slope = document.createElement('p');
slope.style.cssText = 'position:fixed;left:20px;top:16px;margin:0;font:12px/1 ui-monospace,monospace;color:#9ea1a3;letter-spacing:.06em';
document.body.appendChild(slope);
let shownSlope = '';

// ---------- loop ----------
const start = performance.now();
let last = start;
let spin = 0;
const frame = (now) => {
  const dt = (now - last) / 1000;
  last = now;
  const t = (now - start) / 1000;
  if (view.autoSpin) spin += dt * view.spinSpeed;
  axis.rotation.set(LEAN.x * view.lean, LEAN.y * view.lean, LEAN.z * view.lean);
  key.intensity = view.keyLight;
  scene.environmentIntensity = view.environment;
  bloom.strength = view.bloom;
  renderer.setClearColor(view.background, 1);
  turn.slerp(turnTarget, 0.18);
  holder.quaternion.copy(turn);
  holder.position.y = -0.05; // centre the capsule (the site rests it a touch high)
  // show 1: risen and lit; spin turns it about its own axis like scrolling does
  vial.update(t, { show: 1, spin, tilt: { x: 0, y: 0 } }, camera); // unwrapped, so turning never jumps
  const sl = `Sand slope ${vial.slope.toFixed(1)}° · gives way past ${settings.repose}°`;
  if (sl !== shownSlope) { slope.textContent = sl; shownSlope = sl; }
  composer.render();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
