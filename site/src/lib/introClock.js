import { SETTLED_TIME } from '../data/intro.js';

// One clock for the whole intro so the scene and the UI never drift apart.
// ?t=final skips the intro: the clock starts settled and keeps running, so the
// dust and the light still move. ?t=3000 freezes it at that moment, which is
// only for screenshots: the whole scene stands still.
export function createIntroClock({ settled = false } = {}) {
  const param = new URLSearchParams(window.location.search).get('t');
  const frozen = param != null && param !== 'final' && !Number.isNaN(Number(param)) ? Number(param) : null;
  const start = performance.now();
  let offset = settled || param === 'final' ? SETTLED_TIME : 0;

  return {
    now: () => (frozen != null ? frozen : performance.now() - start + offset),
    skip: () => {
      const elapsed = performance.now() - start + offset;
      if (elapsed < SETTLED_TIME) offset += SETTLED_TIME - elapsed;
    },
  };
}
