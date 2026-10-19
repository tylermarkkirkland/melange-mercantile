// Folding the sealed request into an envelope. The sheet on the page is copied
// into paper panels that fold like the back of a classic envelope:
//   1. the left and right sides fold in to meet in the middle,
//   2. the bottom folds up into the pocket,
//   3. the top corners tuck away behind along the diagonals, leaving a triangle,
//      which folds down over the front.
// The seal then goes on the flap's point, and the envelope slides off the page.
//
// Everything is plain DOM and the Web Animations API; the copies are inert
// pictures of the letter (no ids, no focus), so the real form stays the only one.

const FOLD_MS = 700;
const IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'; // the site's even in-out curve
// How the sheet's height divides: the triangular top flap, the envelope's body,
// and the bottom flap that folds up into the pocket
const TOP = 0.28;
const BODY = 0.42;
const MIN_WIDTH_FOR_SIDES = 560; // narrower sheets skip the side folds

const px = (n) => `${Math.round(n * 100) / 100}px`;
const pct = (n) => `${Math.round(n * 10000) / 100}%`;

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

function face(className, child, clip) {
  const el = document.createElement('div');
  el.className = `alloc__face ${className}`;
  if (clip) el.style.clipPath = clip;
  if (child) el.appendChild(child);
  const shade = document.createElement('div');
  shade.className = 'alloc__shade';
  el.appendChild(shade);
  return el;
}

const div = (className, style) => {
  const el = document.createElement('div');
  el.className = className;
  Object.assign(el.style, style);
  return el;
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

  const root = div('alloc__fold', { left: px(left), top: px(top), width: px(W), height: px(H) });

  // a soft shadow under the envelope, which gathers as it closes
  const shadow = div('alloc__fold-shadow', { left: px(a), top: px(t), width: px(Wc), height: px(m) });
  root.appendChild(shadow);

  const flaps = [];
  // body and bottom: each with its own side flaps, which fold in first
  const band = (y, h, origin) => {
    const panel = div('alloc__panel', { left: px(a), top: px(y), width: px(Wc), height: px(h), transformOrigin: origin });
    panel.appendChild(face('alloc__face--front', copyOf(paper, W, H, -a, -y)));
    panel.appendChild(face('alloc__face--back alloc__face--x'));
    if (a > 0) {
      for (const side of ['l', 'r']) {
        const flap = div('alloc__flap', {
          left: side === 'l' ? px(-a) : px(Wc), top: '0px', width: px(a), height: '100%',
          transformOrigin: side === 'l' ? '100% 50%' : '0% 50%',
        });
        flap.appendChild(face('alloc__face--front', copyOf(paper, W, H, side === 'l' ? 0 : -(a + Wc), -y)));
        flap.appendChild(face('alloc__face--back alloc__face--y'));
        panel.appendChild(flap);
        flaps.push({ el: flap, side });
      }
    }
    root.appendChild(panel);
    return panel;
  };
  band(t, m, '50% 50%');
  const bottom = band(t + m, b, '50% 0%');

  // the top: a triangle on the envelope's width, its point at the top centre.
  // The corners either side of it tuck away behind along the diagonals.
  const l = a / W; // where the envelope's sides fall, as fractions of the width
  const r = (a + Wc) / W;
  const flapPanel = div('alloc__panel', { left: '0px', top: '0px', width: px(W), height: px(t), transformOrigin: '50% 100%' });
  flapPanel.appendChild(face('alloc__face--front', copyOf(paper, W, H, 0, 0), `polygon(${pct(l)} 100%, 50% 0%, ${pct(r)} 100%)`));
  flapPanel.appendChild(face('alloc__face--back alloc__face--x', null, `polygon(${pct(l)} 0%, ${pct(r)} 0%, 50% 100%)`));
  root.appendChild(flapPanel);

  const corners = ['l', 'r'].map((side) => {
    const clip = side === 'l'
      ? `polygon(0% 0%, 50% 0%, ${pct(l)} 100%, 0% 100%)`
      : `polygon(50% 0%, 100% 0%, 100% 100%, ${pct(r)} 100%)`;
    const corner = div('alloc__corner', { left: '0px', top: '0px', width: px(W), height: px(t), transformOrigin: '50% 0%' });
    corner.appendChild(face('alloc__face--front', copyOf(paper, W, H, 0, 0), clip));
    root.appendChild(corner);
    // the hinge runs from the point at the top centre down to the envelope's side
    const ax = side === 'l' ? a - W / 2 : a + Wc - W / 2;
    return { el: corner, ax, ay: t };
  });

  layer.appendChild(root);

  const running = [];
  const play = (el, keyframes, delay, duration = FOLD_MS) => {
    const anim = el.animate(keyframes, { duration, delay, easing: IN_OUT, fill: 'forwards' });
    running.push(anim);
    return anim.finished;
  };
  // the face turning away from the light darkens; the one turning toward it brightens
  const shadeTurn = (el, delay) => {
    const [front, back] = el.querySelectorAll(':scope > .alloc__face > .alloc__shade');
    if (front) play(front, [{ opacity: 0 }, { opacity: 0.5 }], delay);
    if (back) play(back, [{ opacity: 0.5 }, { opacity: 0 }], delay);
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
      const sidesAt = 0;
      const bottomAt = a > 0 ? FOLD_MS - 50 : 0;
      const flapAt = bottomAt + FOLD_MS - 100;
      for (const { el, side } of flaps) {
        // turn over toward the reader, landing a hair above the sheet so the layers never fight
        play(el, [
          { transform: 'rotateY(0deg) translateZ(0px)' },
          { transform: `rotateY(${side === 'l' ? 180 : -180}deg) translateZ(-1px)` },
        ], sidesAt);
        shadeTurn(el, sidesAt);
      }
      // the corners tuck away behind, turning about their diagonals as the sides come in
      for (const { el, ax, ay } of corners) {
        play(el, [
          { transform: `rotate3d(${ax}, ${ay}, 0, 0deg)` },
          { transform: `rotate3d(${ax}, ${ay}, 0, ${ax < 0 ? -180 : 180}deg)` },
        ], sidesAt, FOLD_MS * 0.8);
      }
      play(bottom, [
        { transform: 'rotateX(0deg) translateZ(0px)' },
        { transform: 'rotateX(180deg) translateZ(-3px)' },
      ], bottomAt);
      shadeTurn(bottom, bottomAt);
      play(shadow, [{ opacity: 0 }, { opacity: 1 }], bottomAt);
      shadeTurn(flapPanel, flapAt);
      return play(flapPanel, [
        { transform: 'rotateX(0deg) translateZ(0px)' },
        { transform: 'rotateX(-180deg) translateZ(-5px)' },
      ], flapAt);
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
