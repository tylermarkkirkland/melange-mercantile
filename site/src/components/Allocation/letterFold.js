// Folding the sealed request into an envelope. The sheet on the page is copied
// into paper panels that fold like the back of a classic envelope:
//   1. the left and right sides fold in, all the way up, to meet in the middle,
//   2. the top corners fold in onto the flap along lines from its point, taking the
//      side flap lying on them with them, so the flap comes to a point,
//   3. the bottom folds up into the pocket,
//   4. the flap folds down over the front, carrying everything folded onto it.
// Every piece stays attached to the paper it belongs to and ends up tucked under
// another layer; nothing fades or disappears.
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


// Where a point lands when the paper is folded flat along the line from p to q
function reflect([x, y], [px0, py0], [qx, qy]) {
  const dx = qx - px0;
  const dy = qy - py0;
  const k = ((x - px0) * dx + (y - py0) * dy) / (dx * dx + dy * dy);
  return [2 * (px0 + k * dx) - x, 2 * (py0 + k * dy) - y];
}
const poly = (pts, w, h) => `polygon(${pts.map(([x, y]) => `${pct(x / w)} ${pct(y / h)}`).join(', ')})`;

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
  const half = Wc / 2;
  const cx = a + half; // the envelope's centre line

  // The flap's corners fold in along lines from its point to a little way down each
  // side, chosen so a folded corner just reaches the crease and never overhangs it
  const q = Math.min(t, (half * (half - Math.sqrt(Math.max(0, half * half - t * t)))) / t || t);
  const P = [cx, 0]; // the flap's point
  const QL = [a, q]; // where the fold lines meet the sides
  const QR = [a + Wc, q];
  const landL = reflect([a, 0], P, QL); // where each corner's tip lands on the flap
  const landR = reflect([a + Wc, 0], P, QR);

  // the perspective lives on the outer box; everything inside shares one 3D space
  const root = div('alloc__fold', { left: px(left), top: px(top), width: px(W), height: px(H) });
  const stage = div('alloc__stage', {});
  root.appendChild(stage);

  // the envelope's own shadow on the page, gathering as it closes
  const envShadow = div('alloc__fold-shadow', { left: px(a), top: px(t), width: px(Wc), height: px(m), transform: 'translateZ(-2px)' });
  stage.appendChild(envShadow);

  const sideTurns = []; // the first stage: every side flap, left then right
  const sideCasts = [];

  // A piece of paper: an inert copy of the sheet seen through `box` (paper coordinates),
  // placed at `at` inside its parent, cut to `clip` on the front and `backClip` behind
  const piece = (parent, { at, box, origin, clip, backClip, backClass, className = 'alloc__flap' }) => {
    const el = div(className, { left: px(at[0]), top: px(at[1]), width: px(box[2]), height: px(box[3]), transformOrigin: origin });
    const front = face('alloc__face--front', copyOf(paper, W, H, -box[0], -box[1]), clip);
    const back = face(`alloc__face--back ${backClass}`, null, backClip);
    el.appendChild(front);
    el.appendChild(back);
    parent.appendChild(el);
    return { el, front, back };
  };

  // A soft shadow on the paper where a flap will land, thrown by the flap as it turns.
  // (the shape is cut on an inner layer, so the blur on the outer one softens its edges)
  const castShadow = (parent, { at, w, h, origin, axis, reach, z, clip }) => {
    const el = div('alloc__cast', { left: px(at[0]), top: px(at[1]), width: px(w), height: px(h), transformOrigin: origin, transform: `translateZ(${z}px)` });
    el.appendChild(div('alloc__cast-ink', clip ? { clipPath: clip } : {}));
    parent.appendChild(el);
    return { el, axis, reach, z };
  };

  // A side flap: it folds in over its parent, toward the reader, landing a hair above
  const sideFlap = (parent, side, { at, box, clip, backClip }) => {
    const sign = side === 'l' ? 1 : -1;
    const p = piece(parent, { at, box, origin: side === 'l' ? '100% 50%' : '0% 50%', clip, backClip, backClass: 'alloc__face--y' });
    sideTurns.push({
      el: p.el, delay: side === 'l' ? 0 : STAGGER,
      from: 'rotateY(0deg) translateZ(0px)', to: `rotateY(${sign * 180}deg) translateZ(-1px)`,
      normalAt: turnY(sign),
      faces: [{ el: p.front, back: false }, { el: p.back, back: true }],
    });
    return p;
  };

  // ---------- the body and the bottom: bands with plain rectangular side flaps ----------
  const band = (y, h, origin) => {
    const panel = div('alloc__panel', { left: px(a), top: px(y), width: px(Wc), height: px(h), transformOrigin: origin });
    const front = face('alloc__face--front', copyOf(paper, W, H, -a, -y));
    const back = face('alloc__face--back alloc__face--x');
    panel.appendChild(front);
    panel.appendChild(back);
    const flaps = [];
    if (a > 0) {
      for (const side of ['l', 'r']) {
        flaps.push(sideFlap(panel, side, { at: [side === 'l' ? -a : Wc, 0], box: [side === 'l' ? 0 : a + Wc, y, a, h] }));
        const cast = castShadow(panel, {
          at: [side === 'l' ? 0 : Wc - a, 0], w: a, h, origin: side === 'l' ? '0% 50%' : '100% 50%', axis: 'x', reach: a, z: 0.5,
        });
        sideCasts.push({ ...cast, sign: side === 'l' ? 1 : -1, delay: side === 'l' ? 0 : STAGGER });
      }
    }
    stage.appendChild(panel);
    return { panel, front, back, flaps };
  };
  const body = band(t, m, '50% 50%');
  const bottom = band(t + m, b, '50% 0%');
  // "Yours in trade" straddles the pocket's crease, so the tops of its letters sit on the
  // body's last pixel row and peeked out along the envelope's lower edge. The body's
  // writing is covered by the side flaps once folded, so it's cut a hair short there.
  body.front.style.clipPath = 'inset(0 0 2px 0)';

  // ---------- the top: the flap, its folded-in corners, and the side flaps above the body ----------
  // In the flap's own box (the sheet's full width, t tall, at the sheet's top left)
  const flap = div('alloc__panel', { left: '0px', top: '0px', width: px(W), height: px(t), transformOrigin: '50% 100%' });
  const flapShape = [P, QL, [a, t], [a + Wc, t], QR];
  const mirrorY = (pts) => pts.map(([x, y]) => [x, t - y]);
  const flapFront = face('alloc__face--front', copyOf(paper, W, H, 0, 0), poly(flapShape, W, t));
  const flapBack = face('alloc__face--back alloc__face--x', null, poly(mirrorY(flapShape), W, t));
  flap.appendChild(flapFront);
  flap.appendChild(flapBack);
  stage.appendChild(flap);

  const corners = [];
  for (const side of ['l', 'r']) {
    const Q = side === 'l' ? QL : QR;
    const edge = side === 'l' ? a : a + Wc;
    const land = side === 'l' ? landL : landR;
    // the corner of the flap above its fold line, in the flap's box
    const cornerShape = [[edge, 0], P, Q];
    const mirrorX = (pts) => pts.map(([x, y]) => [W - x, y]);
    const corner = piece(flap, {
      at: [0, 0], box: [0, 0, W, t], origin: `${pct(cx / W)} 0%`,
      clip: poly(cornerShape, W, t), backClip: poly(mirrorX(cornerShape), W, t), backClass: 'alloc__face--corner',
      className: 'alloc__corner',
    });

    if (a > 0) {
      // the side flap above the body is split by the corner's fold line: the part lying on
      // the corner goes with the corner, the rest stays on the flap
      const flapBox = [side === 'l' ? 0 : a + Wc, 0, a, t];
      const at = [flapBox[0], 0];
      const qq = q / t; // where the fold line crosses, as a fraction of the height
      const onCorner = side === 'l'
        ? { clip: `polygon(0% 0%, 100% 0%, 100% ${pct(qq)})`, backClip: `polygon(100% 0%, 0% 0%, 0% ${pct(qq)})` }
        : { clip: `polygon(0% 0%, 100% 0%, 0% ${pct(qq)})`, backClip: `polygon(100% 0%, 0% 0%, 100% ${pct(qq)})` };
      const onFlap = side === 'l'
        ? { clip: `polygon(0% 0%, 100% ${pct(qq)}, 100% 100%, 0% 100%)`, backClip: `polygon(100% 0%, 0% ${pct(qq)}, 0% 100%, 100% 100%)` }
        : { clip: `polygon(100% 0%, 0% ${pct(qq)}, 0% 100%, 100% 100%)`, backClip: `polygon(0% 0%, 100% ${pct(qq)}, 100% 100%, 0% 100%)` };
      const sa = sideFlap(corner.el, side, { at, box: flapBox, ...onCorner });
      sideFlap(flap, side, { at, box: flapBox, ...onFlap });
      // their shadows: on the corner, and on the flap below the fold line
      const landX = side === 'l' ? a : 2 * a;
      const castOnCorner = castShadow(corner.el, {
        at: [landX, 0], w: a, h: t, origin: side === 'l' ? '0% 50%' : '100% 50%', axis: 'x', reach: a, z: 0.5,
        clip: side === 'l' ? `polygon(0% 0%, 100% 0%, 0% ${pct(qq)})` : `polygon(0% 0%, 100% 0%, 100% ${pct(qq)})`,
      });
      const castOnFlap = castShadow(flap, {
        at: [landX, 0], w: a, h: t, origin: side === 'l' ? '0% 50%' : '100% 50%', axis: 'x', reach: a, z: 0.5,
        clip: side === 'l' ? `polygon(100% 0%, 100% 100%, 0% 100%, 0% ${pct(qq)})` : `polygon(0% 0%, 100% ${pct(qq)}, 100% 100%, 0% 100%)`,
      });
      const sign = side === 'l' ? 1 : -1;
      const delay = side === 'l' ? 0 : STAGGER;
      sideCasts.push({ ...castOnCorner, sign, delay }, { ...castOnFlap, sign, delay });
      corner.sideOnIt = sa;
    }

    // the corner's own shadow on the flap, where its tip lands
    const cast = castShadow(flap, {
      at: [0, 0], w: W, h: t, origin: '50% 0%', axis: 'none', reach: Math.hypot(land[0] - edge, land[1]), z: 2.5,
      clip: poly([P, Q, land], W, t),
    });

    // it turns over toward the reader about its fold line, coming to rest on the flap
    const ax = Q[0] - P[0];
    const ay = Q[1] - P[1];
    const len = Math.hypot(ax, ay);
    const sign = side === 'l' ? 1 : -1;
    corners.push({ ...corner, side, ax, ay, len, sign, cast });
  }

  const bottomCast = castShadow(stage, { at: [a, t + m - b], w: Wc, h: b, origin: '50% 100%', axis: 'y', reach: b, z: 1.5 });
  const flapCast = castShadow(stage, {
    at: [a, t], w: Wc, h: t, origin: '50% 0%', axis: 'y', reach: t, z: 3.5,
    clip: poly(mirrorY(flapShape).map(([x, y]) => [x - a, y]), Wc, t),
  });

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

  // a face already folded over keeps turning with whatever it lies on
  const shadeAlong = (faceEl, normalAt, delay, duration = FOLD_MS) => {
    const overlay = div('alloc__shade');
    faceEl.appendChild(overlay);
    animate(overlay, lightingFrames(normalAt, false).dark, delay, duration);
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
      const scale = axis === 'x' ? ` scaleX(${spread})` : axis === 'y' ? ` scaleY(${spread})` : '';
      frames.push({
        transform: `translate3d(${px(dx)}, ${px(dy)}, ${z}px)${scale}`,
        opacity: 0.5 * over * (0.55 + 0.45 * (1 - lift)),
        filter: `blur(${px(1.5 + 22 * lift)})`,
      });
    }
    return animate(el, frames, delay, duration);
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
      // 1. the sides, left then right, all the way up
      sideTurns.forEach(playTurn);
      sideCasts.forEach((c) => playCast(c, c.sign, c.delay));

      // 2. the flap's corners fold in onto it, each with the side flap lying on it
      const cornersAt = a > 0 ? FOLD_MS + STAGGER - 160 : 0;
      const CORNER_MS = FOLD_MS * 0.85;
      corners.forEach(({ el, front, back, ax, ay, len, sign, cast, sideOnIt }, i) => {
        const delay = cornersAt + i * STAGGER;
        const normalAt = turnAbout(ax / len, ay / len, sign);
        playTurn({
          el, delay, duration: CORNER_MS,
          from: `rotate3d(${ax}, ${ay}, 0, 0deg) translateZ(0px)`,
          to: `rotate3d(${ax}, ${ay}, 0, ${sign * 180}deg) translateZ(-3px)`,
          normalAt,
          faces: [{ el: front, back: false }, { el: back, back: true }],
        });
        if (sideOnIt) shadeAlong(sideOnIt.back, normalAt, delay, CORNER_MS);
        playCast(cast, 1, delay, CORNER_MS);
      });

      // 3. the bottom folds up into the pocket, carrying its side flaps with it
      const bottomAt = cornersAt + STAGGER + CORNER_MS - 160;
      playTurn({
        el: bottom.panel, delay: bottomAt,
        from: 'rotateX(0deg) translateZ(0px)', to: 'rotateX(180deg) translateZ(-3px)',
        normalAt: turnX(1),
        faces: [{ el: bottom.front, back: false }, { el: bottom.back, back: true }],
      });
      for (const f of bottom.flaps) {
        shadeAlong(f.back, turnX(1), bottomAt);
        // once the pocket is past upright they're underneath it; dropping them at the exact
        // moment it's edge-on shows nothing, and stops a sliver of writing peeking at the crease.
        // (visibility, not opacity: animating opacity on folded paper flattens its 3D)
        animate(f.el, [{ visibility: 'visible', offset: 0 }, { visibility: 'visible', offset: 0.5 }, { visibility: 'hidden', offset: 0.5 }, { visibility: 'hidden', offset: 1 }], bottomAt);
      }
      playCast(bottomCast, 1, bottomAt);
      animate(envShadow, [{ opacity: 0 }, { opacity: 1 }], bottomAt, FOLD_MS * 2);

      // 4. and the flap comes down over it all, carrying everything folded onto it
      const flapAt = bottomAt + FOLD_MS - 140;
      playCast(flapCast, 1, flapAt);
      return playTurn({
        el: flap, delay: flapAt,
        from: 'rotateX(0deg) translateZ(0px)', to: 'rotateX(-180deg) translateZ(-8px)',
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
