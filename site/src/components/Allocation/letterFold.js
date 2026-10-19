// Folding the sealed request. The sheet on the page is copied into paper panels
// that fold like a real letter: the margins either side of the writing turn in
// first, then the bottom third folds up and the top third folds down over it.
// What's left is a folded letter at the middle of the sheet, ready for the seal,
// which then slides off the page with it.
//
// Everything is plain DOM and the Web Animations API; the copies are inert
// pictures of the letter (no ids, no focus), so the real form stays the only one.

const FOLD_MS = 700;
const IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'; // the site's even in-out curve
const SIDE_MARGIN = 40; // parchment kept either side of the writing
const MIN_SIDE_FLAP = 60; // narrower than this and the sides don't fold

const px = (n) => `${Math.round(n * 100) / 100}px`;

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

function face(className, child) {
  const el = document.createElement('div');
  el.className = `alloc__face ${className}`;
  if (child) el.appendChild(child);
  const shade = document.createElement('div');
  shade.className = 'alloc__shade';
  el.appendChild(shade);
  return el;
}

/**
 * Build the fold over the sheet. `layer` is a positioned element covering the
 * same box as `frame`; the folding paper is drawn into it.
 * Returns { center, fold(), away(), clear() }.
 */
export function createFold({ frame, paper, letter, layer }) {
  const fr = frame.getBoundingClientRect();
  const pr = paper.getBoundingClientRect();
  const lr = letter.getBoundingClientRect();
  const W = pr.width;
  const H = pr.height;
  const left = pr.left - fr.left;
  const top = pr.top - fr.top;

  // the sides fold in to the writing, if there's real parchment either side of it
  let a = Math.min(lr.left - pr.left, pr.right - lr.right) - SIDE_MARGIN;
  if (a < MIN_SIDE_FLAP) a = 0;
  const Wc = W - 2 * a;
  const h3 = H / 3;

  const root = document.createElement('div');
  root.className = 'alloc__fold';
  Object.assign(root.style, { left: px(left), top: px(top), width: px(W), height: px(H) });

  // a soft shadow under the folded letter, which gathers as it closes
  const shadow = document.createElement('div');
  shadow.className = 'alloc__fold-shadow';
  Object.assign(shadow.style, { left: px(a), top: px(h3), width: px(Wc), height: px(h3) });
  root.appendChild(shadow);

  const panels = [];
  const flaps = [];
  for (let k = 0; k < 3; k += 1) {
    const panel = document.createElement('div');
    panel.className = 'alloc__panel';
    Object.assign(panel.style, {
      left: px(a), top: px(k * h3), width: px(Wc), height: px(h3),
      transformOrigin: k === 0 ? '50% 100%' : k === 2 ? '50% 0%' : '50% 50%',
    });
    panel.appendChild(face('alloc__face--front', copyOf(paper, W, H, -a, -k * h3)));
    panel.appendChild(face('alloc__face--back alloc__face--x'));
    if (a > 0) {
      for (const side of ['l', 'r']) {
        const flap = document.createElement('div');
        flap.className = 'alloc__flap';
        Object.assign(flap.style, {
          left: side === 'l' ? px(-a) : px(Wc), top: '0px', width: px(a), height: '100%',
          transformOrigin: side === 'l' ? '100% 50%' : '0% 50%',
        });
        flap.appendChild(face('alloc__face--front', copyOf(paper, W, H, side === 'l' ? 0 : -(a + Wc), -k * h3)));
        flap.appendChild(face('alloc__face--back alloc__face--y'));
        panel.appendChild(flap);
        flaps.push({ el: flap, side });
      }
    }
    root.appendChild(panel);
    panels.push(panel);
  }
  layer.appendChild(root);

  const running = [];
  const play = (el, keyframes, delay) => {
    const anim = el.animate(keyframes, { duration: FOLD_MS, delay, easing: IN_OUT, fill: 'forwards' });
    running.push(anim);
    return anim.finished;
  };
  // the face turning away from the light darkens; the one turning toward it brightens
  const shadeTurn = (el, delay) => {
    const [front, back] = el.querySelectorAll(':scope > .alloc__face > .alloc__shade');
    play(front, [{ opacity: 0 }, { opacity: 0.5 }], delay);
    play(back, [{ opacity: 0.5 }, { opacity: 0 }], delay);
  };

  return {
    /** the folded letter's centre, in the layer's coordinates */
    center: { x: left + W / 2, y: top + H / 2 },

    /** fold the sheet; resolves when the letter is closed */
    fold() {
      const sides = a > 0 ? 0 : -FOLD_MS;
      const bottomAt = sides + FOLD_MS - 50;
      const topAt = bottomAt + FOLD_MS - 100;
      for (const { el, side } of flaps) {
        // turn over toward the reader, landing a hair above the sheet so the layers never fight
        play(el, [
          { transform: 'rotateY(0deg) translateZ(0px)' },
          { transform: `rotateY(${side === 'l' ? 180 : -180}deg) translateZ(-1px)` },
        ], Math.max(0, sides));
        shadeTurn(el, Math.max(0, sides));
      }
      play(panels[2], [
        { transform: 'rotateX(0deg) translateZ(0px)' },
        { transform: 'rotateX(180deg) translateZ(-3px)' },
      ], bottomAt);
      shadeTurn(panels[2], bottomAt);
      play(shadow, [{ opacity: 0 }, { opacity: 1 }], bottomAt);
      shadeTurn(panels[0], topAt);
      return play(panels[0], [
        { transform: 'rotateX(0deg) translateZ(0px)' },
        { transform: 'rotateX(-180deg) translateZ(-5px)' },
      ], topAt);
    },

    /** slide the folded, sealed letter off the page (together with `carry`, e.g. the seal) */
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
