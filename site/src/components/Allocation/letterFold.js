// Folding the sealed request into an envelope. The sheet on the page is copied
// into paper panels that fold like the back of a classic envelope:
//   1. the left and right sides fold in to meet in the middle,
//   2. the top corners tuck away behind along the diagonals, leaving a triangle,
//   3. the bottom folds up into the pocket,
//   4. the triangle folds down over the front as the flap.
// The seal then goes on the flap's point, and the envelope slides off the page.
//
// Lighting: one light from the upper left, as on the rest of the site. Every
// turning face is shaded from its angle to that light at each moment of the fold
// (darker turning away, a touch brighter turning toward it), and every flap
// casts a soft shadow onto the paper it closes over, sharpening into a contact
// shadow as it lands.
//
// Everything is plain DOM and the Web Animations API, in one 3D space so faces
// sort by depth. The copies are inert pictures of the letter (no ids, no focus),
// so the real form stays the only one.

const FOLD_MS = 760;
const EASE = 'cubic-bezier(0.6, 0, 0.25, 1)'; // lifts away briskly, lands softly
const STAGGER = 110; // a hand folds one side, then the other
// How the sheet's height divides: the triangular top flap, the envelope's body,
// and the bottom flap that folds up into the pocket
const TOP = 0.28;
const BODY = 0.42;
const MIN_WIDTH_FOR_SIDES = 560; // narrower sheets skip the side folds

// The light: up and to the left, in front of the page (CSS axes: y down, z toward the reader)
const LIGHT = (() => {
  const v = [-0.35, -0.55, 0.76];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();
const SHADOW_DIR = [0.54, 0.84]; // shadows fall down and to the right
const SAMPLES = 12;

const px = (n) => `${Math.round(n * 100) / 100}px`;
const pct = (n) => `${Math.round(n * 10000) / 100}%`;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// An inert copy of the sheet, positioned so the given window of it shows
function copyOf(paper, W, H, left, top) {
  const copy = paper.cloneNode(true);
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  copy.querySelectorAll('canvas').forEach((el) => el.remove());
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  Object.assign(copy.style, {
    position: 'absolute', inset: 'auto', left: px(left), top: px(top),
    width: px(W), height: px(H), clipPath: 'none', visibility: 'visible',
  });
  return copy;
}

const div = (className, style) => {
  const el = document.createElement('div');
  el.className = className;
  Object.assign(el.style, style);
  return el;
};

// A face of paper, with a dark and a light overlay for its shading
function face(className, child, clip) {
  const el = div(`alloc__face ${className}`, clip ? { clipPath: clip } : {});
  if (child) el.appendChild(child);
  el.appendChild(div('alloc__shade'));
  el.appendChild(div('alloc__light'));
  return el;
}

// How lit a face with normal n is, relative to lying flat (1 = as lit as the flat
// sheet). Light bounced around the room keeps even a face turned away from showing
// some of the paper's colour.
const AMBIENT = 0.35;
const brightness = (n) => AMBIENT + (1 - AMBIENT) * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / LIGHT[2];
const darkFor = (b) => Math.min(0.78, Math.max(0, 1 - b) * 0.72);
const lightFor = (b) => Math.min(0.16, Math.max(0, b - 1) * 0.6);

/**
 * Keyframes for a face's dark and light overlays, from its normal at each step
 * of the turn. `normalAt(p)` gives the front's normal at progress p (0..1);
 * `back` shades the reverse side instead.
 */
function lightingFrames(normalAt, back = false) {
  const dark = [];
  const light = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const n = normalAt(i / SAMPLES);
    const b = brightness(back ? n.map((c) => -c) : n);
    dark.push({ opacity: darkFor(b) });
    light.push({ opacity: lightFor(b) });
  }
  return { dark, light };
}

// Normals of the front face for each kind of turn (angle in degrees at progress p)
const turnY = (sign) => (p) => { const a = sign * p * Math.PI; return [Math.sin(a), 0, Math.cos(a)]; };
const turnX = (sign) => (p) => { const a = sign * p * Math.PI; return [0, -Math.sin(a), Math.cos(a)]; };
const turnAbout = (kx, ky, sign) => (p) => {
  const a = sign * p * Math.PI;
  return [ky * Math.sin(a), -kx * Math.sin(a), Math.cos(a)];
};

/**
 * Build the fold over the sheet. `layer` is a positioned element covering the
 * same box as `frame`; the folding paper is drawn into it.
 * Returns { center, sealAt, bottom, fold(), away(), clear() }.
 */
export function createFold({ frame, paper, layer }) {
  const fr = frame.getBoundingClientRect();
  const pr = paper.getBoundingClientRect();
  const W = pr.width;
  const H = pr.height;
  const left = pr.left - fr.left;
  const top = pr.top - fr.top;

  // the sides fold in a quarter each, meeting in the middle
  const a = W >= MIN_WIDTH_FOR_SIDES ? W / 4 : 0;
  const Wc = W - 2 * a; // the envelope's width
  const t = H * TOP;
  const m = H * BODY;
  const b = H - t - m;

  // the perspective lives on the outer box; everything inside shares one 3D space
  const root = div('alloc__fold', { left: px(left), top: px(top), width: px(W), height: px(H) });
  const stage = div('alloc__stage', {});
  root.appendChild(stage);

  // the envelope's own shadow on the page, gathering as it closes
  const envShadow = div('alloc__fold-shadow', { left: px(a), top: px(t), width: px(Wc), height: px(m), transform: 'translateZ(-2px)' });
  stage.appendChild(envShadow);

  const turns = []; // { el, from, to, normalAt, delay, faces: [{ el, back }], extra }
  const casts = []; // { el, axis, sign, reach, delay } shadows thrown by a turning flap

  // A soft shadow on the paper where a flap will land, thrown by the flap as it turns
  // (the shape is cut on an inner layer, so the blur on the outer one softens its edges)
  const castShadow = (parent, style, origin, axis, reach, z, clip) => {
    const el = div('alloc__cast', { ...style, transformOrigin: origin, transform: `translateZ(${z}px)` });
    el.appendChild(div('alloc__cast-ink', clip ? { clipPath: clip } : {}));
    parent.appendChild(el);
    return { el, axis, reach, z };
  };

  // body and bottom: each with its own side flaps, which fold in first
  const band = (y, h, origin) => {
    const panel = div('alloc__panel', { left: px(a), top: px(y), width: px(Wc), height: px(h), transformOrigin: origin });
    const front = face('alloc__face--front', copyOf(paper, W, H, -a, -y));
    const back = face('alloc__face--back alloc__face--x');
    panel.appendChild(front);
    panel.appendChild(back);
    const sideFlaps = [];
    if (a > 0) {
      ['l', 'r'].forEach((side, i) => {
        const flap = div('alloc__flap', {
          left: side === 'l' ? px(-a) : px(Wc), top: '0px', width: px(a), height: '100%',
          transformOrigin: side === 'l' ? '100% 50%' : '0% 50%',
        });
        const flapFront = face('alloc__face--front', copyOf(paper, W, H, side === 'l' ? 0 : -(a + Wc), -y));
        const flapBack = face('alloc__face--back alloc__face--y');
        flap.appendChild(flapFront);
        flap.appendChild(flapBack);
        panel.appendChild(flap);
        const sign = side === 'l' ? 1 : -1;
        const delay = i * STAGGER;
        turns.push({
          el: flap, delay,
          from: 'rotateY(0deg) translateZ(0px)',
          to: `rotateY(${sign * 180}deg) translateZ(-1px)`,
          normalAt: turnY(sign),
          faces: [{ el: flapFront, back: false }, { el: flapBack, back: true }],
        });
        // its shadow falls on the band's own front, where it will land
        const cast = castShadow(panel, {
          left: side === 'l' ? '0px' : px(Wc - a), top: '0px', width: px(a), height: '100%',
        }, side === 'l' ? '0% 50%' : '100% 50%', 'x', a, 0.5);
        casts.push({ ...cast, sign, delay });
        sideFlaps.push(flapBack);
      });
    }
    stage.appendChild(panel);
    return { panel, front, back, sideFlaps };
  };
  band(t, m, '50% 50%');
  const bottom = band(t + m, b, '50% 0%');

  // the top: a triangle on the envelope's width, its point at the top centre.
  // The corners either side tuck away behind it along the diagonals.
  const l = a / W; // where the envelope's sides fall, as fractions of the width
  const r = (a + Wc) / W;
  const flapPanel = div('alloc__panel', { left: '0px', top: '0px', width: px(W), height: px(t), transformOrigin: '50% 100%' });
  const flapFront = face('alloc__face--front', copyOf(paper, W, H, 0, 0), `polygon(${pct(l)} 100%, 50% 0%, ${pct(r)} 100%)`);
  const flapBack = face('alloc__face--back alloc__face--x', null, `polygon(${pct(l)} 0%, ${pct(r)} 0%, 50% 100%)`);
  flapPanel.appendChild(flapFront);
  flapPanel.appendChild(flapBack);
  stage.appendChild(flapPanel);

  const corners = ['l', 'r'].map((side, i) => {
    const clip = side === 'l'
      ? `polygon(0% 0%, 50% 0%, ${pct(l)} 100%, 0% 100%)`
      : `polygon(50% 0%, 100% 0%, 100% 100%, ${pct(r)} 100%)`;
    // the back is flipped about the corner piece's centre line, so its outline is mirrored
    const backClip = side === 'l'
      ? `polygon(100% 0%, 50% 0%, ${pct(1 - l)} 100%, 100% 100%)`
      : `polygon(50% 0%, 0% 0%, 0% 100%, ${pct(1 - r)} 100%)`;
    const corner = div('alloc__corner', { left: '0px', top: '0px', width: px(W), height: px(t), transformOrigin: '50% 0%' });
    const front = face('alloc__face--front', copyOf(paper, W, H, 0, 0), clip);
    // its back, seen only as it tucks away: mirrored by the same flip as the corner
    const back = face('alloc__face--back alloc__face--corner', null, backClip);
    corner.appendChild(front);
    corner.appendChild(back);
    stage.appendChild(corner);
    // the hinge runs from the point at the top centre down to the envelope's side
    const ax = side === 'l' ? a - W / 2 : a + Wc - W / 2;
    const len = Math.hypot(ax, t);
    const sign = ax < 0 ? -1 : 1; // both corners turn away from the reader
    turns.push({
      el: corner, delay: i * STAGGER, duration: FOLD_MS * 0.85,
      from: `rotate3d(${ax}, ${t}, 0, 0deg)`,
      to: `rotate3d(${ax}, ${t}, 0, ${sign * 180}deg)`,
      normalAt: turnAbout(ax / len, t / len, sign),
      faces: [{ el: front, back: false }, { el: back, back: true }],
    });
    return corner;
  });

  // the bottom flap's shadow on the body, and the top flap's on the closed pocket and body
  const bottomCast = castShadow(stage, { left: px(a), top: px(t + m - b), width: px(Wc), height: px(b) }, '50% 100%', 'y', b, 1.5);
  const flapCast = castShadow(stage, { left: px(a), top: px(t), width: px(Wc), height: px(t) }, '50% 0%', 'y', t, 3.5, 'polygon(0% 0%, 100% 0%, 50% 100%)');

  layer.appendChild(root);

  const running = [];
  const animate = (el, keyframes, delay, duration = FOLD_MS) => {
    const anim = el.animate(keyframes, { duration, delay, easing: EASE, fill: 'forwards' });
    running.push(anim);
    return anim;
  };

  // turn a piece of paper, shading each of its faces from the light as it goes
  const playTurn = ({ el, from, to, normalAt, delay, duration = FOLD_MS, faces }) => {
    const anim = animate(el, [{ transform: from }, { transform: to }], delay, duration);
    for (const f of faces) {
      const { dark, light } = lightingFrames(normalAt, f.back);
      animate(f.el.querySelector(':scope > .alloc__shade'), dark, delay, duration);
      animate(f.el.querySelector(':scope > .alloc__light'), light, delay, duration);
    }
    return anim;
  };

  // a flap's shadow: none while it stands on its own side, then thrown across as it
  // comes over, softest at its height, gathering into a contact shadow as it lands
  const playCast = ({ el, axis, reach, z }, sign, delay, duration = FOLD_MS) => {
    const frames = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const p = i / SAMPLES;
      const lift = Math.sin(p * Math.PI); // how high the flap stands
      const over = smoothstep(0.42, 0.98, p); // how far it has come over this side
      const spread = 0.15 + 0.85 * over; // the shadow grows out from the hinge
      const drift = reach * 0.08 * lift;
      const dx = SHADOW_DIR[0] * drift * (axis === 'x' ? sign : 1);
      const dy = SHADOW_DIR[1] * drift;
      const scale = axis === 'x' ? `scaleX(${spread})` : `scaleY(${spread})`;
      frames.push({
        transform: `translate3d(${px(dx)}, ${px(dy)}, ${z}px) ${scale}`,
        opacity: 0.5 * over * (0.55 + 0.45 * (1 - lift)),
        filter: `blur(${px(1.5 + 22 * lift)})`,
      });
    }
    return animate(el, frames, delay, duration);
  };

  const timeline = () => {
    const sidesDone = FOLD_MS + STAGGER;
    const bottomAt = a > 0 ? sidesDone - 120 : 0;
    const flapAt = bottomAt + FOLD_MS - 140;
    return { bottomAt, flapAt };
  };

  return {
    /** the middle of the envelope, in the layer's coordinates */
    center: { x: left + W / 2, y: top + t + m / 2 },
    /** where the seal goes: on the flap, just above its point */
    sealAt: { x: left + W / 2, y: top + 2 * t - Math.min(36, t * 0.18) },
    /** the envelope's bottom edge, so the seal's shadow can stop there */
    bottom: top + t + m,

    /** fold the sheet; resolves when the envelope is closed */
    fold() {
      const { bottomAt, flapAt } = timeline();
      turns.forEach(playTurn);
      casts.forEach((c) => playCast(c, c.sign, c.delay));
      // the corners slip away behind the sheet as they start to turn, rather than
      // swinging out across the empty page
      corners.forEach((el, i) => animate(el, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0, offset: 0.42 }, { opacity: 0, offset: 1 }], i * STAGGER, FOLD_MS * 0.85));

      // the bottom folds up into the pocket, carrying its side flaps with it
      playTurn({
        el: bottom.panel, delay: bottomAt,
        from: 'rotateX(0deg) translateZ(0px)', to: 'rotateX(180deg) translateZ(-3px)',
        normalAt: turnX(1),
        faces: [{ el: bottom.front, back: false }, { el: bottom.back, back: true }],
      });
      // its folded side flaps tilt with it, and once it has turned past upright they
      // are underneath it for good (hidden, so no sliver of their writing peeks out at the crease)
      for (const flapBackFace of bottom.sideFlaps) {
        const { dark } = lightingFrames(turnX(1), false);
        const overlay = div('alloc__shade');
        flapBackFace.appendChild(overlay);
        animate(overlay, dark, bottomAt);
        animate(flapBackFace.parentElement, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.52 }, { opacity: 0, offset: 1 }], bottomAt);
      }
      playCast(bottomCast, 1, bottomAt);
      animate(envShadow, [{ opacity: 0 }, { opacity: 1 }], bottomAt, FOLD_MS * 2);

      // and the triangle comes down over it all
      playCast(flapCast, 1, flapAt);
      return playTurn({
        el: flapPanel, delay: flapAt,
        from: 'rotateX(0deg) translateZ(0px)', to: 'rotateX(-180deg) translateZ(-5px)',
        normalAt: turnX(-1),
        faces: [{ el: flapFront, back: false }, { el: flapBack, back: true }],
      }).finished;
    },

    /** slide the sealed envelope off the page (together with `carry`, e.g. the seal) */
    away(carry = []) {
      const keyframes = [
        { transform: 'translate(0, 0) rotate(0deg)' },
        { transform: 'translate(115vw, -4vh) rotate(5deg)' },
      ];
      const opts = { duration: 1100, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' };
      [root, ...carry].forEach((el) => running.push(el.animate(keyframes, opts)));
      return running[running.length - 1].finished;
    },

    /** remove the paper and any held transforms */
    clear(carry = []) {
      running.forEach((anim) => anim.cancel());
      carry.forEach((el) => el.getAnimations().forEach((anim) => anim.cancel()));
      root.remove();
    },
  };
}
