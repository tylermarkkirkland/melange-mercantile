import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { TIMELINE, ARRAKIS } from '../../data/intro.js';
import { scrollState } from '../../lib/scrollState.js';
import { LIGHTING } from '../../data/lighting.js';
import { createVial } from './vial.js';
import { raysVertex, raysFragment, dustVertex, dustFragment, videoVertex, videoFragment } from './shaders.js';
import './SunlitScene.css';

const FOV = 35;
const CAM_Z = 10;
const HALF_H = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z; // visible half-height at z=0
const MARK_HEIGHT = 2.5; // world units; about 40% of the viewport height
const MARK_Y = 0.55;
const DOCK_HEIGHT_PX = 46; // docked pillar, top centre
const DOCK_CENTER_PX = 64; // from the top of the viewport

const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;

// How much sunlight is in the room at time t (ms)
const sunAt = (t) => easeInOutCubic(clamp01((t - TIMELINE.darkHold) / TIMELINE.sunRise));

// The light reaches the pillar a beat after it fills the air
const MARK_LAG = 1400;
const markLightAt = (t) => Math.pow(sunAt(t - MARK_LAG), 1.6);

/**
 * The arrival scene: sunlight slowly fills a dark room, catching drifting
 * spice and the silver pillar. On scroll the pillar docks top-centre and
 * Arrakis rises into frame. `clock.now()` returns ms since the intro began.
 */
export default function SunlitScene({ clock, reducedMotion }) {
  const mountRef = useRef(null);
  // a live copy so the ?controls panel can tune the light without a reload
  const light = useRef({ ...LIGHTING }).current;

  useEffect(() => {
    const mount = mountRef.current;
    const isSmall = window.innerWidth < 768;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, mount.clientWidth / mount.clientHeight, 0.1, 100);
    if (import.meta.env.DEV) window.__melangeScene = scene; // for inspecting in devtools
    camera.position.set(0, 0, CAM_Z);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0;
    // tip the reflected room so its ceiling lights sit behind the mark, not straight above it
    scene.environmentRotation.set(Math.PI * 0.42, 0.5, 0);

    // Lights stay fixed: the sun from the upper left, a cool rim behind.
    // Everything scales with the sun so the room starts truly black.
    const key = new THREE.DirectionalLight(0xffe2c0, 0);
    key.position.set(-6, 3.5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fb6d4, 0);
    rim.position.set(4, 2, -5);
    scene.add(rim);
    // A warm patch of sun that drifts across the face of the pillar
    const glint = new THREE.PointLight(0xffcf9a, 0, 0, 2);
    scene.add(glint);

    const shared = {
      uRes: { value: new THREE.Vector2(mount.clientWidth, mount.clientHeight) },
      uTime: { value: 0 },
      uSun: { value: 0 },
    };

    // Arrakis, drawn behind everything so the dust floats in front of it
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    const videoTex = new THREE.VideoTexture(video);
    videoTex.colorSpace = THREE.SRGBColorSpace;
    const onSeeked = () => { videoTex.needsUpdate = true; };
    video.addEventListener('seeked', onSeeked);
    // hold the download until the landing has had the network to itself
    const videoTimer = setTimeout(() => { video.src = ARRAKIS.video; video.load(); }, 2500);
    const videoMat = new THREE.ShaderMaterial({
      uniforms: {
        uVideo: { value: videoTex },
        uRes: shared.uRes,
        uVideoAspect: { value: 1920 / 1012 },
        uRise: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: videoVertex,
      fragmentShader: videoFragment,
      depthTest: false,
      depthWrite: false,
    });
    const videoPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), videoMat);
    videoPlane.frustumCulled = false;
    videoPlane.renderOrder = -20;
    scene.add(videoPlane);

    // Light shafts: one layer behind everything, a fainter one in front for air
    const makeRays = (depth, gain, order) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...shared, uDepth: { value: depth }, uGain: { value: gain } },
        vertexShader: raysVertex,
        fragmentShader: raysFragment,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      scene.add(mesh);
      return mesh;
    };
    const raysBack = makeRays(0.9999, 1.0, -10);
    const raysFront = makeRays(0.0, 0.22, 10);

    // Spice in the air
    const count = isSmall ? 1400 : 3200;
    const box = new THREE.Vector3(7, 4.5, 6);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * box.x;
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * box.y;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * box.z;
      for (let k = 0; k < 4; k++) seeds[i * 4 + k] = Math.random();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const dustMat = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uBox: { value: box },
        uFall: { value: new THREE.Vector3(0.42, -1, -0.1).normalize() },
        uMouse: { value: new THREE.Vector2(0, -3) },
        uMouseStrength: { value: 0 },
        uAspect: { value: camera.aspect },
        uTanHalf: { value: Math.tan(THREE.MathUtils.degToRad(FOV / 2)) },
        uCamZ: { value: CAM_Z },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uRayVis: { value: 1 },
        uAmbient: { value: 0 },
      },
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    scene.add(dust);

    // The vial of melange (third section)
    const vial = createVial(renderer);
    scene.add(vial.group);
    const vialTilt = { x: 0, y: 0 };

    // The pillar
    let markMaterial = null;
    const markGroup = new THREE.Group();
    markGroup.position.y = MARK_Y;
    scene.add(markGroup);
    new GLTFLoader().load('/models/melange-mark.glb', (gltf) => {
      const mark = gltf.scene;
      mark.scale.setScalar(MARK_HEIGHT / 600);
      mark.traverse((o) => {
        if (o.isMesh) {
          o.material.color = new THREE.Color(0x8c9196);
          o.material.metalness = 0.9;
          // a little rougher spreads the sun's highlight so it never flares
          o.material.roughness = light.roughness;
          markMaterial = o.material;
        }
      });
      markGroup.add(mark);
    });

    // Post: a gentle bloom on only the very brightest edges
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), light.bloomStrength, 0.5, light.bloomThreshold);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // Pointer: smoothed, so the dust eases apart and the pillar leans rather than snaps
    const target = new THREE.Vector2(0, -3);
    const pointer = new THREE.Vector2(0, -3);
    let pointerIn = 0;
    let pointerStrength = 0;
    const tilt = { x: 0, y: 0 };
    const onMove = (e) => {
      target.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      pointerIn = 1;
    };
    const onLeave = () => { pointerIn = 0; };
    if (!reducedMotion) {
      window.addEventListener('pointermove', onMove);
      document.addEventListener('pointerleave', onLeave);
    }

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      shared.uRes.value.set(w, h);
      dustMat.uniforms.uAspect.value = camera.aspect;
    };
    window.addEventListener('resize', onResize);

    // ?controls opens a small panel for placing the light by hand
    let gui = null;
    let disposed = false;
    if (new URLSearchParams(window.location.search).has('controls')) {
      import('lil-gui').then(({ default: GUI }) => {
        if (disposed) return;
        gui = new GUI({ title: 'Pillar lighting' });
        const sun = gui.addFolder('Sun (fixed)');
        sun.add(light, 'keyX', -12, 12, 0.1).name('x');
        sun.add(light, 'keyY', -6, 12, 0.1).name('y');
        sun.add(light, 'keyZ', -6, 12, 0.1).name('z');
        sun.add(light, 'keyIntensity', 0, 10, 0.1).name('intensity');
        const glintFolder = gui.addFolder('Warm glint');
        glintFolder.add(light, 'glintX', -4, 4, 0.05).name('x');
        glintFolder.add(light, 'glintY', -3, 3, 0.05).name('y (from centre)');
        glintFolder.add(light, 'glintZ', 0.5, 6, 0.05).name('z (toward you)');
        glintFolder.add(light, 'glintIntensity', 0, 60, 0.5).name('intensity');
        const finish = gui.addFolder('Finish');
        finish.add(light, 'environment', 0, 1.5, 0.01).name('reflections');
        finish.add(light, 'roughness', 0.05, 0.8, 0.01);
        finish.add(light, 'bloomStrength', 0, 1.5, 0.01).name('glow');
        finish.add(light, 'bloomThreshold', 0.5, 1, 0.01).name('glow threshold');
        gui.add({
          copy: () => {
            const text = JSON.stringify(light, null, 2);
            navigator.clipboard?.writeText(text);
            window.prompt('Lighting values (copied to clipboard):', text.replace(/\s+/g, ' '));
          },
        }, 'copy').name('Copy values');
      });
    }

    let videoTime = 0;
    let raf = 0;
    const frame = () => {
      const t = clock.now();
      const seconds = reducedMotion ? 12 : t / 1000;
      const sun = sunAt(t);
      const markSun = markLightAt(t);
      const { dock, rise, scrub, planetOut, vialSpin } = scrollState;
      const vialIn = scrollState.vial * (1 - scrollState.vialOut);
      const vh = mount.clientHeight;

      shared.uTime.value = seconds;
      shared.uSun.value = sun;

      pointer.lerp(target, 0.06);
      pointerStrength += ((pointerIn ? 1 : 0) - pointerStrength) * 0.04;
      dustMat.uniforms.uMouse.value.copy(pointer);
      dustMat.uniforms.uMouseStrength.value = pointerStrength * sun;

      // beams give way to the planet as you scroll; dust keeps a quiet glitter
      const rayVis = 1 - 0.9 * dock;
      raysBack.material.uniforms.uGain.value = rayVis;
      raysFront.material.uniforms.uGain.value = 0.22 * rayVis;
      dustMat.uniforms.uRayVis.value = rayVis;
      dustMat.uniforms.uAmbient.value = 0.3 * dock;

      // Fixed lights: the highlight only moves when the pillar tilts.
      // The warm glint belongs to the landing; docked, the mark is simply lit.
      key.position.set(light.keyX, light.keyY, light.keyZ);
      // the landing's strong sun is eased back for the capsule, which has its own lamp
      key.intensity = light.keyIntensity * markSun * (1 - 0.65 * vialIn);
      rim.intensity = 1.2 * markSun;
      glint.position.set(light.glintX, MARK_Y + light.glintY, light.glintZ);
      glint.intensity = light.glintIntensity * markSun * (1 - dock);
      // the room dims a little for the capsule so its trim and glass don't flare
      scene.environmentIntensity = light.environment * markSun * (1 - 0.45 * vialIn);
      bloom.strength = light.bloomStrength * (1 - 0.85 * dock) + 0.35 * vialIn;
      bloom.threshold = light.bloomThreshold;
      if (markMaterial) markMaterial.roughness = light.roughness;

      // Dock: shrink and spin up to the top centre
      const dockY = (1 - (2 * DOCK_CENTER_PX) / vh) * HALF_H;
      const dockScale = ((DOCK_HEIGHT_PX / vh) * 2 * HALF_H) / MARK_HEIGHT;
      const scale = lerp(1, dockScale, dock);
      markGroup.scale.setScalar(scale);
      markGroup.position.y = lerp(MARK_Y, dockY, dock);

      // Tilt toward the cursor when it's over (or near) the pillar
      if (!reducedMotion && finePointer) {
        const cy = markGroup.position.y / HALF_H;
        const dx = pointer.x * camera.aspect;
        const dy = pointer.y - cy;
        const reach = 1.1 * scale + 0.15;
        const near = clamp01(1 - Math.hypot(dx, dy) / reach) * pointerStrength;
        const proximity = near * near * (3 - 2 * near);
        const tx = Math.max(-1, Math.min(1, dx / reach)) * 0.34 * proximity;
        const ty = -Math.max(-1, Math.min(1, dy / reach)) * 0.24 * proximity;
        tilt.y += (tx - tilt.y) * 0.07;
        tilt.x += (ty - tilt.x) * 0.07;
      }

      const idle = reducedMotion ? 0 : Math.sin(seconds * 0.22) * 0.04;
      const spin = reducedMotion ? 0 : dock * Math.PI * 2;
      markGroup.rotation.y = idle + spin + tilt.y;
      markGroup.rotation.x = tilt.x;
      if (!reducedMotion) markGroup.position.y += Math.sin(seconds * 0.5) * 0.02 * (1 - dock);

      // Arrakis rises, scrolling turns the planet, then it sinks away for the vial
      videoMat.uniforms.uRise.value = rise * (1 - 0.6 * planetOut);
      videoMat.uniforms.uOpacity.value = Math.min(1, rise * 1.6) * (1 - planetOut);
      if (video.duration && rise > 0 && planetOut < 1) {
        const goal = scrub * (video.duration - 0.1);
        videoTime += (goal - videoTime) * 0.12;
        if (!video.seeking && Math.abs(video.currentTime - videoTime) > 1 / 60) video.currentTime = videoTime;
      }

      // The vial leans gently toward the cursor wherever it is on screen
      if (!reducedMotion && finePointer && vialIn > 0) {
        vialTilt.y += (pointer.x * 0.35 * pointerStrength - vialTilt.y) * 0.05;
        vialTilt.x += (-pointer.y * 0.2 * pointerStrength - vialTilt.x) * 0.05;
      }
      vial.update(seconds, { show: vialIn, spin: reducedMotion ? 0 : vialSpin, tilt: vialTilt }, camera);

      composer.render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(videoTimer);
      disposed = true;
      if (gui) gui.destroy();
      vial.dispose();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
      video.removeEventListener('seeked', onSeeked);
      video.removeAttribute('src');
      video.load();
      videoTex.dispose();
      videoMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      raysBack.material.dispose();
      raysFront.material.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [clock, reducedMotion]);

  return <div className="sunlit-scene" ref={mountRef} aria-hidden="true" />;
}
