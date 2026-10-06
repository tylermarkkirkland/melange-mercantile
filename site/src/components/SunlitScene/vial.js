import * as THREE from 'three';

// Spice held in a containment field: grains orbit the axis slowly and drift
// up the core, looping.
const grainsVertex = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uStir;
  uniform float uHalf;
  varying float vLight;
  varying float vTone;
  void main() {
    float r = position.x;
    float a = position.z + uTime * (0.06 + uStir * 0.1) * (0.6 + aSeed.x * 0.8);
    float span = uHalf * 2.0;
    float y = mod(position.y + uHalf + uTime * (0.01 + aSeed.y * 0.015), span) - uHalf;
    vec3 p = vec3(cos(a) * r, y, sin(a) * r);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed.w * 1.4) + aSeed.x * 30.0);
    float ends = smoothstep(uHalf, uHalf * 0.8, abs(y)); // fade where the loop wraps
    vLight = (0.35 + 0.65 * twinkle) * ends;
    vTone = aSeed.w;
    gl_PointSize = mix(1.2, 3.2, aSeed.y * aSeed.y) * uPixelRatio * (24.0 / -mv.z);
  }
`;

const grainsFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vLight;
  varying float vTone;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.8) * vLight * uOpacity;
    vec3 deep = vec3(0.85, 0.24, 0.04);
    vec3 ember = vec3(0.95, 0.55, 0.18);
    vec3 pale = vec3(1.0, 0.9, 0.75);
    vec3 col = vTone < 0.45 ? deep : (vTone < 0.85 ? ember : pale);
    gl_FragColor = vec4(col * a, a);
  }
`;

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
 * machined caps with panel detailing, a lamp in the top cap lighting a bed of
 * spice and grains suspended in the air. The Melange Mercantile pillar is inlaid in the top cap.
 */
export function createVial(renderer) {
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

  // A bed of spice on the floor of the chamber, rippled like dunes
  const bedGeo = track(new THREE.RingGeometry(0.0001, R - 0.01, 128, 28));
  const bp = bedGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i);
    const z = bp.getY(i);
    const r = Math.hypot(x, z) / R;
    const ripples = Math.sin(x * 26 + Math.sin(z * 9) * 1.4) * 0.008 + Math.sin(z * 17 - x * 6) * 0.005;
    const mound = 0.07 * (1 - r * r);
    bp.setZ(i, mound + ripples * (1 - r * 0.6));
  }
  bedGeo.computeVertexNormals();
  const bed = new THREE.Mesh(bedGeo, track(new THREE.MeshStandardMaterial({
    color: 0x3a1405, emissive: 0x8a2e0c, emissiveIntensity: 0.3, roughness: 0.95, metalness: 0,
  })));
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = -top0 + 0.002;
  capsule.add(bed);

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

  // Suspended grains (stored as radius, height, angle; the shader moves them)
  const HALF = GLASS_H / 2 - 0.08;
  const count = 1500;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.pow(Math.random(), 0.6) * (R - 0.06);
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * HALF;
    pos[i * 3 + 2] = Math.random() * Math.PI * 2;
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
  }
  const grainGeo = track(new THREE.BufferGeometry());
  grainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  grainGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const grainMat = track(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uStir: { value: 0 },
      uOpacity: { value: 1 },
      uHalf: { value: HALF },
    },
    vertexShader: grainsVertex,
    fragmentShader: grainsFragment,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  }));
  const grains = new THREE.Points(grainGeo, grainMat);
  grains.frustumCulled = false;
  grains.renderOrder = 5;
  capsule.add(grains);

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
      capsule.rotation.y = spin * Math.PI * 1.2 + (1 - rise) * 0.6;
      group.rotation.y = tilt.y;
      group.rotation.x = tilt.x * 0.7;

      if (camera) {
        camDir.copy(camera.position);
        capsule.worldToLocal(camDir);
        shaft.rotation.y = Math.atan2(camDir.x, camDir.z);
      }

      grainMat.uniforms.uTime.value = seconds;
      grainMat.uniforms.uStir.value = Math.abs(Math.sin(spin * Math.PI)) * 0.5;
      grainMat.uniforms.uOpacity.value = rise;
      shaftMat.uniforms.uTime.value = seconds;
      shaftMat.uniforms.uOpacity.value = lit;
      lampMat.color.setRGB(1, 0.89, 0.74).multiplyScalar(0.15 + 1.15 * lit);
      lampLight.intensity = 6 * lit;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
