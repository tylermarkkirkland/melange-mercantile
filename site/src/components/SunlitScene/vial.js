import * as THREE from 'three';

// Where the sand's surface is, at any point (x, z) inside the chamber: a plane
// at the fill level, tipped to stay level with gravity (uUp is "up" as seen from
// inside the capsule), plus a soft central mound and dune ripples. The top, the
// side against the glass, the dusting on the glass, the motes and the
// condensation all ask this same function, so they always agree.
const SAND_GLSL = /* glsl */ `
  uniform vec3 uUp;
  uniform float uLevel;
  uniform float uMound;
  uniform float uRipple;
  uniform float uRippleScale;
  uniform float uFloor;
  uniform float uTop;
  uniform float uRP;
  float sandY(vec2 xz) {
    float r = min(1.0, length(xz) / uRP);
    float mound = uMound * (1.0 - r * r);
    vec2 q = xz * uRippleScale;
    float rip = (sin(q.x * 24.0 + sin(q.y * 8.0) * 1.5) * 0.014 + sin(q.y * 15.0 - q.x * 5.0) * 0.009) * uRipple * (1.0 - r * 0.5);
    float plane = uLevel - (uUp.x * xz.x + uUp.z * xz.y) / max(uUp.y, 0.3);
    return clamp(plane + mound + rip, uFloor + 0.01, uTop - 0.03);
  }
`;

// Fine melange hanging in the lamp's beam: a few soft motes lifting slowly off
// the sand toward the lamp, brightest where the beam is. Normal blending, not
// additive, so they read as powder in the air rather than sparks.
const motesVertex = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uStir;
  uniform float uMoteTop;
  uniform float uCount;
  uniform float uSize;
  uniform float uSpeed;
  ${SAND_GLSL}
  varying float vLight;
  varying float vTone;
  void main() {
    float a = position.z + uTime * 0.03 * (aSeed.x - 0.5) + uStir * (0.4 + aSeed.x);
    float r = position.x + sin(uTime * 0.4 + aSeed.w * 6.28) * 0.015; // a slight sway
    vec2 xz = vec2(cos(a) * r, sin(a) * r);
    float floorY = sandY(xz) + 0.05; // each mote lifts off the sand beneath it
    float span = max(uMoteTop - floorY, 0.05);
    float fall = mod(position.y + uTime * uSpeed * (0.012 + aSeed.y * 0.018), span); // distance risen
    vec3 p = vec3(xz.x, floorY + fall, xz.y);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float ends = smoothstep(0.0, 0.12, fall) * smoothstep(span, span - 0.1, fall); // lift into view, fade below the lamp
    float beam = 0.35 + 0.65 * exp(-r * r * 9.0);
    vLight = ends * beam * step(aSeed.x, uCount); // uCount: the share of motes shown
    vTone = aSeed.w;
    gl_PointSize = mix(0.9, 2.2, aSeed.z * aSeed.z) * uSize * uPixelRatio * (24.0 / -mv.z);
  }
`;

const motesFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uMoteOpacity;
  varying float vLight;
  varying float vTone;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vLight * uOpacity * uMoteOpacity;
    vec3 col = mix(vec3(0.62, 0.26, 0.08), vec3(0.92, 0.6, 0.32), vTone);
    gl_FragColor = vec4(col, a);
  }
`;

// Every look of the sand, live-adjustable (the capsule lab has a slider for each);
// these are what the site uses, as Tyler tuned them in the lab (2026-10-06).
export const SAND_DEFAULTS = {
  fill: 0.5, // how full the chamber is, at its axis (0 empty, 1 full)
  repose: 25, // matches the pod's 25° lean on the site. Angle of repose, in degrees: the steepest slope the sand holds
  //              before it gives way (0 behaves like liquid, 90 is stuck to the glass)
  slump: 0.02, // how fast it slides once it gives way
  settleTo: 1, // how far a slump goes: the share of the repose angle it ends at
  creep: 2.6, // degrees per second it drifts toward level while holding, so it never looks frozen
  mound: 0.1, // the soft hump in the middle
  ripple: 1, // dune ripple height
  rippleScale: 1, // dune ripple spacing (higher is tighter)
  grain: 1.19, // grain size (lower is finer)
  color: '#ffffff', // tint over the powder's own colours
  glow: 0.12, // warmth from within
  glints: 0, // how many grains catch the lamp (off: Tyler, 2026-10-06)
  glintBright: 0.9,
  cling: 0.55, // powder left on the glass above the sand
  clingHeight: 0.12,
  motes: 1, // share of the motes shown
  moteSize: 1,
  moteOpacity: 0.55,
  moteSpeed: 1, // how fast they rise
  lamp: 1, // the lamp in the top cap
  shaft: 1, // the beam beneath it
  condensation: 0, // droplets on the glass, above the sand only (off: Tyler, 2026-10-06)
};

// A shaft of light falling from the lamp in the top cap
const shaftVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const shaftFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float x = abs(vUv.x - 0.5) * 2.0;
    float glow = exp(-x * x * 7.0) * pow(vUv.y, 1.6); // strongest under the lamp
    glow *= 0.9 + 0.1 * sin(uTime * 0.7 + vUv.y * 7.0);
    vec3 col = mix(vec3(0.95, 0.55, 0.2), vec3(1.0, 0.9, 0.75), vUv.y);
    gl_FragColor = vec4(col * glow * 0.22 * uOpacity, 1.0);
  }
`;

const GUN = '#2b2f33';

/**
 * Machined panel detailing for the cap bands, drawn once to a canvas: a colour
 * map and a bump map. With `logo`, a smooth plate is set into the panels and the
 * Melange Mercantile pillar is inlaid in polished silver (recessed in the bump map).
 */
function makePanelTextures(seed, logo) {
  const W = 2048;
  const H = 160;
  const color = document.createElement('canvas');
  const bump = document.createElement('canvas');
  color.width = bump.width = W;
  color.height = bump.height = H;
  const c = color.getContext('2d');
  const b = bump.getContext('2d');
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

  c.fillStyle = GUN;
  c.fillRect(0, 0, W, H);
  b.fillStyle = '#5a5a5a';
  b.fillRect(0, 0, W, H);

  // where the logo plates sit (front and back), kept clear of panels
  const plates = logo ? [W * 0.25, W * 0.75].map((x) => ({ x: x - 70, w: 140 })) : [];
  const onPlate = (x, w) => plates.some((p) => x + w > p.x - 6 && x < p.x + p.w + 6);

  // rows of small rectangular panels, each a slightly different height and tone
  // fine machined channels running around the band
  b.fillStyle = '#404040';
  for (const y of [0, 2, H - 3, H - 1]) b.fillRect(0, y, W, 1);

  // rows of varied heights; panels of varied widths, some split, some left as bare metal
  const rowH = [4, 20, 50, 62, 92, 108, 138, 156];
  for (let r = 0; r < rowH.length - 1; r++) {
    let x = 0;
    const thin = rowH[r + 1] - rowH[r] < 18;
    while (x < W) {
      const w = thin ? 6 + Math.floor(rnd() * 22) : 10 + Math.floor(rnd() * 48);
      const y0 = rowH[r] + 1;
      const h = rowH[r + 1] - rowH[r] - 2;
      if (!onPlate(x, w) && rnd() > 0.18) {
        const tone = 40 + Math.floor(rnd() * 12);
        c.fillStyle = `rgb(${tone},${tone + 4},${tone + 8})`;
        c.fillRect(x + 1, y0, w - 2, h);
        const lift = 120 + Math.floor(rnd() * 60);
        b.fillStyle = `rgb(${lift},${lift},${lift})`;
        b.fillRect(x + 1, y0, w - 2, h);
        // occasional split or vent detail inside a panel
        const roll = rnd();
        if (roll > 0.8 && w > 20) {
          b.fillStyle = '#4a4a4a';
          b.fillRect(x + w / 2, y0, 1, h);
        } else if (roll > 0.65 && w > 24 && !thin) {
          b.fillStyle = '#4a4a4a';
          for (let v = y0 + 4; v < y0 + h - 3; v += 4) b.fillRect(x + 5, v, w - 10, 1);
        }
      }
      x += w;
    }
  }

  const textures = {
    map: new THREE.CanvasTexture(color),
    bump: new THREE.CanvasTexture(bump),
  };
  textures.map.colorSpace = THREE.SRGBColorSpace;
  for (const t of Object.values(textures)) {
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }

  if (logo) {
    const draw = (img) => {
      for (const p of plates) {
        // smooth plate, slightly raised
        c.fillStyle = '#34393d';
        c.fillRect(p.x, 6, p.w, H - 12);
        b.fillStyle = '#9a9a9a';
        b.fillRect(p.x, 6, p.w, H - 12);
        const lh = H - 34;
        const lw = lh * (1432 / 2180);
        const lx = p.x + (p.w - lw) / 2;
        const ly = 17;
        // polished silver inlay in the colour map
        const tint = document.createElement('canvas');
        tint.width = Math.ceil(lw);
        tint.height = Math.ceil(lh);
        const t = tint.getContext('2d');
        t.drawImage(img, 0, 0, lw, lh);
        t.globalCompositeOperation = 'source-in';
        t.fillStyle = '#d6d9dc';
        t.fillRect(0, 0, lw, lh);
        c.drawImage(tint, lx, ly);
        // recessed in the bump map (the svg is black, so it reads as a cut)
        b.globalAlpha = 0.85;
        b.drawImage(img, lx, ly, lw, lh);
        b.globalAlpha = 1;
      }
      textures.map.needsUpdate = true;
      textures.bump.needsUpdate = true;
    };
    const img = new Image();
    img.onload = () => draw(img);
    img.src = '/models/pillar.svg';
  }
  return textures;
}

// Settled melange, drawn once to a canvas: a fine grain of rust-orange tones with
// darker flecks and the odd bright one. Every pixel is independent, so it tiles.
function makePowderTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const tones = [
    [74, 30, 10], // shadowed grain
    [118, 50, 16],
    [150, 68, 22], // the body of it
    [174, 86, 30],
    [210, 124, 56], // catching the light
  ];
  for (let i = 0; i < size * size; i++) {
    const r = Math.random();
    const t = r < 0.08 ? tones[0] : r < 0.3 ? tones[1] : r < 0.7 ? tones[2] : r < 0.95 ? tones[3] : tones[4];
    const j = 0.82 + Math.random() * 0.36;
    img.data[i * 4] = t[0] * j;
    img.data[i * 4 + 1] = t[1] * j;
    img.data[i * 4 + 2] = t[2] * j;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Powder clinging to the inside of the glass just above the heap: dense at the
// bottom, thinning to nothing, speckled
function makeClingTexture() {
  const w = 512;
  const h = 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const fade = Math.pow(1 - y / h, 2.2); // canvas y=0 is the top of the band; flipped below
    for (let x = 0; x < w; x++) {
      const v = Math.random() < fade * 0.9 ? 255 * (0.5 + Math.random() * 0.5) * fade : 0;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false; // dense end at the bottom of the band
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// Fine condensation on the glass, as an alpha map
function makeDropletTexture() {
  const W = 1024;
  const H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  let s = 41;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * W;
    // denser toward the top and bottom, where the glass meets the cold caps
    const v = rnd();
    const y = (v < 0.5 ? Math.pow(v * 2, 2) * 0.5 : 1 - Math.pow((1 - v) * 2, 2) * 0.5) * H;
    const r = 0.4 + Math.pow(rnd(), 3) * 2.2;
    g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.6})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/**
 * A containment capsule of melange: a wide glass chamber between two heavy
 * machined caps with panel detailing, a lamp in the top cap lighting a heap of
 * settled melange, with a few fine motes lifting off it through its beam. The Melange Mercantile pillar is inlaid in the top cap.
 */
export function createVial(renderer, settings = {}) {
  const group = new THREE.Group(); // whole assembly; tilts toward the cursor
  group.visible = false;
  group.scale.setScalar(1.18);
  // the capsule spins around its own axis, which is held at an angle
  const axis = new THREE.Group();
  axis.rotation.set(0.22, 0, -0.38); // leans right and slightly toward the viewer
  group.add(axis);
  const capsule = new THREE.Group(); // turns with scroll, around the tilted axis
  axis.add(capsule);

  const disposables = [];
  const track = (item) => { disposables.push(item); return item; };

  const R = 0.55; // glass radius
  const GLASS_H = 1.5;
  const TIER_H = 0.22;
  const CAP_R = 0.6;
  const top0 = GLASS_H / 2; // where the top cap begins

  const S = { ...SAND_DEFAULTS, ...settings };
  const FLOOR = -top0;
  const RP = R - 0.004; // the sand reaches just inside the glass
  // shared by every material that needs to know where the sand is
  const sand = {
    uUp: { value: new THREE.Vector3(0, 1, 0) },
    uLevel: { value: 0 },
    uMound: { value: 0 },
    uRipple: { value: 1 },
    uRippleScale: { value: 1 },
    uFloor: { value: FLOOR },
    uTop: { value: top0 },
    uRP: { value: RP },
    uTime: { value: 0 },
  };

  // Cap materials: panelled bands, one of them carrying the inlaid pillar
  const plain = makePanelTextures(7, false);
  const marked = makePanelTextures(19, true);
  [plain.map, plain.bump, marked.map, marked.bump].forEach(track);
  const bandPlain = track(new THREE.MeshStandardMaterial({
    map: plain.map, bumpMap: plain.bump, bumpScale: 1.2, metalness: 0.95, roughness: 0.3,
  }));
  const bandMarked = track(new THREE.MeshStandardMaterial({
    map: marked.map, bumpMap: marked.bump, bumpScale: 1.2, metalness: 0.95, roughness: 0.28,
  }));
  const gun = track(new THREE.MeshStandardMaterial({ color: 0x2b2f33, metalness: 1, roughness: 0.3 }));
  // satin, not mirror: polished trim catches the room's lights and flares
  const silver = track(new THREE.MeshStandardMaterial({ color: 0xa9adb1, metalness: 1, roughness: 0.38 }));

  const ring = (radius, height, y, mat, open = false) => {
    const m = new THREE.Mesh(track(new THREE.CylinderGeometry(radius, radius, height, 128, 1, open)), mat);
    m.position.y = y;
    capsule.add(m);
    return m;
  };

  // Build one cap: lip, panelled tier, groove, panelled tier, flat crown
  const buildCap = (dir, outerTier) => {
    let y = top0;
    const at = (h) => { const mid = dir * (y + h / 2); y += h; return mid; };
    ring(CAP_R - 0.015, 0.03, at(0.03), silver); // seating lip against the glass
    ring(CAP_R, TIER_H, at(TIER_H), bandPlain); // inner tier
    ring(CAP_R - 0.03, 0.035, at(0.035), gun); // groove
    ring(CAP_R, TIER_H, at(TIER_H), outerTier); // outer tier
    ring(CAP_R - 0.01, 0.02, at(0.02), silver); // chamfer
    const crownY = dir * y;
    const crown = new THREE.Mesh(track(new THREE.CircleGeometry(CAP_R - 0.01, 128)), gun);
    crown.rotation.x = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    crown.position.y = crownY;
    capsule.add(crown);
    ring(0.2, 0.025, crownY + dir * 0.012, gun); // centre boss on the crown
    return y;
  };
  const capTop = buildCap(1, bandMarked);
  buildCap(-1, bandPlain);
  // inner faces of the caps (seen through the glass)
  for (const dir of [1, -1]) {
    const face = new THREE.Mesh(track(new THREE.CircleGeometry(R, 96)), gun);
    face.rotation.x = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    face.position.y = dir * (top0 - 0.001);
    capsule.add(face);
  }

  // Glass chamber with condensation
  const glassMat = track(new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.05,
    transmission: 1,
    thickness: 0.08,
    ior: 1.45,
    clearcoat: 0.4,
    clearcoatRoughness: 0.12,
    specularIntensity: 0.55,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  const glass = ring(R, GLASS_H + 0.02, 0, glassMat, true);
  glass.renderOrder = 2;
  const droplets = track(makeDropletTexture());
  const dropMat = track(new THREE.MeshBasicMaterial({
    color: 0xd8dde2, alphaMap: droplets, transparent: true, opacity: 0.35, depthWrite: false,
  }));
  // only above the sand: over it, droplets read as white flecks in the powder
  dropMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sand);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSandLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSandLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vSandLocal;\n${SAND_GLSL}`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vSandLocal.y < sandY(vSandLocal.xz) + 0.06) discard;');
  };
  dropMat.customProgramCacheKey = () => 'sand-drops';
  const drops = ring(R + 0.003, GLASS_H, 0, dropMat, true);
  drops.renderOrder = 3;

  // The lamp in the top cap, shining down
  const lampMat = track(new THREE.MeshBasicMaterial({ color: 0xffe2bd, toneMapped: false }));
  const lamp = new THREE.Mesh(track(new THREE.CircleGeometry(R * 0.84, 96)), lampMat);
  lamp.rotation.x = Math.PI / 2;
  lamp.position.y = top0 - 0.004;
  capsule.add(lamp);
  const lampRing = new THREE.Mesh(track(new THREE.RingGeometry(R * 0.84, R * 0.88, 96)), track(new THREE.MeshBasicMaterial({ color: 0xe8822b, toneMapped: false, side: THREE.DoubleSide })));
  lampRing.rotation.x = Math.PI / 2;
  lampRing.position.y = top0 - 0.005;
  capsule.add(lampRing);
  const lampLight = new THREE.SpotLight(0xffd6a6, 0, 3, Math.PI / 3, 0.6, 1.5);
  lampLight.position.set(0, top0 - 0.02, 0);
  lampLight.target.position.set(0, -top0, 0);
  capsule.add(lampLight, lampLight.target);

  // The sand. Its surface is worked out on the graphics card every frame from
  // sandY (above), so it can stay level as the capsule tips and turns.
  const powderMap = track(makePowderTexture());
  const wallMap = track(powderMap.clone());
  wallMap.needsUpdate = true;
  const glint = { uGlintCut: { value: 0.995 }, uGlintBright: { value: 0.9 } };

  const sandMaterial = (map) => new THREE.MeshStandardMaterial({
    map,
    bumpMap: map,
    bumpScale: 1.4,
    roughness: 0.96,
    metalness: 0,
    emissive: 0x5c1f07,
    emissiveIntensity: 0.12, // a faint warmth from within, like the finest grade
  });

  // the top: a flat disc lifted to the sand's height, its normals from the slope
  const surfaceMat = track(sandMaterial(powderMap));
  surfaceMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sand, glint);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SAND_GLSL}`)
      .replace('#include <beginnormal_vertex>', `
        float hC = sandY(position.xz);
        float e = 0.01;
        vec3 objectNormal = normalize(vec3(-(sandY(position.xz + vec2(e, 0.0)) - hC) / e, 1.0, -(sandY(position.xz + vec2(0.0, e)) - hC) / e));`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.x, hC, position.z);');
    // the odd grain glints as the lamp catches it (cells about a screen pixel across;
    // smaller cells shimmer like static)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uGlintCut;\nuniform float uGlintBright;\nfloat glintHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float h = glintHash(floor(vMapUv * 40.0));
        float twinkle = 0.5 + 0.5 * sin(uTime * (1.0 + h * 3.0) + h * 60.0);
        totalEmissiveRadiance += vec3(1.0, 0.7, 0.4) * step(uGlintCut, h) * twinkle * uGlintBright;`);
  };
  surfaceMat.customProgramCacheKey = () => 'sand-surface';
  const surfaceGeo = track(new THREE.RingGeometry(0.0001, RP, 160, 40));
  surfaceGeo.rotateX(-Math.PI / 2); // lie flat, facing up; the shader lifts it
  const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
  surface.frustumCulled = false;
  capsule.add(surface);

  // the side, pressed against the glass: from the floor up to the surface's edge
  const wallMat = track(sandMaterial(wallMap));
  wallMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sand);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SAND_GLSL}`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.x, position.y > 0.0 ? sandY(position.xz) : uFloor + 0.001, position.z);');
  };
  wallMat.customProgramCacheKey = () => 'sand-wall';
  const wall = new THREE.Mesh(track(new THREE.CylinderGeometry(RP, RP, 1, 160, 1, true)), wallMat);
  wall.frustumCulled = false;
  capsule.add(wall);

  // a fine dusting left on the glass just above the sand's edge
  const clingHeight = { value: 0.12 };
  const clingMat = track(new THREE.MeshBasicMaterial({
    color: 0xb4521c,
    alphaMap: track(makeClingTexture()),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  clingMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sand, { uClingHeight: clingHeight });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uClingHeight;\n${SAND_GLSL}`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.x, sandY(position.xz) + (position.y + 0.5) * uClingHeight, position.z);');
  };
  clingMat.customProgramCacheKey = () => 'sand-cling';
  const cling = new THREE.Mesh(track(new THREE.CylinderGeometry(R - 0.002, R - 0.002, 1, 160, 1, true)), clingMat);
  cling.frustumCulled = false;
  cling.renderOrder = 1;
  capsule.add(cling);

  // Light falling from the lamp, always facing the viewer
  const shaftMat = track(new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: shaftVertex,
    fragmentShader: shaftFragment,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  }));
  const shaft = new THREE.Mesh(track(new THREE.PlaneGeometry(0.9, GLASS_H)), shaftMat);
  shaft.renderOrder = 4;
  capsule.add(shaft);

  // Motes in the lamp's beam (stored as radius, starting fall, angle; the shader moves them)
  const count = 220;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.pow(Math.random(), 1.4) * (R - 0.08); // gathered toward the beam
    pos[i * 3 + 1] = Math.random() * 2; // how far it has already fallen (wrapped in the shader)
    pos[i * 3 + 2] = Math.random() * Math.PI * 2;
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
  }
  const moteGeo = track(new THREE.BufferGeometry());
  moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const moteMat = track(new THREE.ShaderMaterial({
    uniforms: {
      ...sand,
      uPixelRatio: { value: renderer.getPixelRatio() },
      uStir: { value: 0 },
      uOpacity: { value: 1 },
      uMoteTop: { value: top0 - 0.06 },
      uCount: { value: 1 },
      uSize: { value: 1 },
      uSpeed: { value: 1 },
      uMoteOpacity: { value: 0.55 },
    },
    vertexShader: motesVertex,
    fragmentShader: motesFragment,
    transparent: true,
    depthWrite: false,
  }));
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  motes.renderOrder = 5;
  capsule.add(motes);

  // Push the current settings into the materials
  const apply = () => {
    sand.uLevel.value = FLOOR + S.fill * GLASS_H - S.mound * 0.5; // the mound adds about half its height on average
    sand.uMound.value = S.mound;
    sand.uRipple.value = S.ripple;
    sand.uRippleScale.value = S.rippleScale;
    powderMap.repeat.set(S.grain, S.grain);
    wallMap.repeat.set(S.grain * 3.1, S.grain * 0.55); // the same grain size once round the chamber
    for (const m of [surfaceMat, wallMat]) {
      m.color.set(S.color);
      m.emissiveIntensity = S.glow;
    }
    glint.uGlintCut.value = 1 - 0.01 * S.glints;
    glint.uGlintBright.value = S.glintBright;
    clingMat.opacity = S.cling;
    clingHeight.value = S.clingHeight;
    moteMat.uniforms.uCount.value = S.motes;
    moteMat.uniforms.uSize.value = S.moteSize;
    moteMat.uniforms.uMoteOpacity.value = S.moteOpacity;
    moteMat.uniforms.uSpeed.value = S.moteSpeed;
    dropMat.opacity = S.condensation;
  };
  apply();

  // Which way is up, seen from inside the capsule; eased so the sand slides level
  const worldQ = new THREE.Quaternion();
  const upTarget = new THREE.Vector3();
  const upNow = new THREE.Vector3(0, 1, 0);
  const slideAxis = new THREE.Vector3();
  let upReady = false;
  let slumping = false;
  let lastSeconds = 0;

  const camDir = new THREE.Vector3();
  const smooth = (x) => x * x * (3 - 2 * x);
  const REST_Y = 0.05;
  const HEIGHT = capTop * 2;

  return {
    group,
    /**
     * show: 0..1 entrance (rises into frame); spin: 0..1 scroll-driven turn;
     * tilt: {x, y} from the pointer
     */
    update(seconds, { show, spin, tilt }, camera) {
      group.visible = show > 0.001;
      if (!group.visible) return;
      const rise = smooth(Math.min(1, Math.max(0, show)));
      // the lamp comes on as it settles
      const lit = smooth(Math.min(1, Math.max(0, (show - 0.6) / 0.4)));

      group.position.y = THREE.MathUtils.lerp(-HEIGHT * 2.2, REST_Y, rise) + Math.sin(seconds * 0.6) * 0.02 * rise;
      // the pillar plates sit at a quarter turn; offset so the front one faces the
      // reader squarely halfway through the section's turn (spin 0.5), not at its start
      capsule.rotation.y = spin * Math.PI * 1.2 - Math.PI * 0.1 + (1 - rise) * 0.6;
      group.rotation.y = tilt.y;
      group.rotation.x = tilt.x * 0.7;

      if (camera) {
        camDir.copy(camera.position);
        capsule.worldToLocal(camDir);
        shaft.rotation.y = Math.atan2(camDir.x, camDir.z);
      }

      const dt = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      // Sand, not liquid: the surface holds its slope until the tilt passes the
      // angle of repose, then slumps until it's back under it, and stops dead.
      capsule.updateWorldMatrix(true, false);
      capsule.getWorldQuaternion(worldQ).invert();
      upTarget.set(0, 1, 0).applyQuaternion(worldQ); // "up", as seen from inside
      if (!upReady) { upNow.copy(upTarget); upReady = true; }
      const repose = THREE.MathUtils.degToRad(S.repose);
      const slope = upNow.angleTo(upTarget);
      // slumping: slide well under the limit, the way an avalanche overshoots;
      // holding: creep toward level so slowly it reads as settling, not flowing
      let next = slope;
      if (slumping || slope > repose) {
        // an avalanche: quick, and it always finishes, even while the capsule is
        // still turning (a slower slide would just trail the glass at a fixed lag)
        const rest = repose * S.settleTo;
        const minSlide = THREE.MathUtils.degToRad(40) * dt; // at least 40° a second
        next = Math.max(rest, slope - Math.max((slope - rest) * S.slump, minSlide));
        slumping = next - rest > THREE.MathUtils.degToRad(1); // done within a degree of rest
      } else {
        next = Math.max(0, slope - THREE.MathUtils.degToRad(S.creep) * dt);
      }
      if (next < slope) {
        slideAxis.crossVectors(upTarget, upNow);
        if (slideAxis.lengthSq() > 1e-10) {
          slideAxis.normalize();
          upNow.copy(upTarget).applyAxisAngle(slideAxis, next);
        }
      }
      sand.uUp.value.copy(upNow);

      sand.uTime.value = seconds;
      moteMat.uniforms.uStir.value = spin * 0.6; // a little swirl as it turns
      moteMat.uniforms.uOpacity.value = lit;
      shaftMat.uniforms.uTime.value = seconds;
      shaftMat.uniforms.uOpacity.value = lit * S.shaft;
      lampMat.color.setRGB(1, 0.89, 0.74).multiplyScalar((0.15 + 1.15 * lit) * S.lamp);
      lampLight.intensity = 6 * lit * S.lamp;
    },
    /** Change any of SAND_DEFAULTS live. */
    set(values) {
      Object.assign(S, values);
      apply();
    },
    get settings() { return { ...S }; },
    /** The sand's current tilt from level, in degrees (for the lab's readout). */
    get slope() { return THREE.MathUtils.radToDeg(upNow.angleTo(upTarget)); },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
