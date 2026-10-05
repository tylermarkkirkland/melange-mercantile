import { SETTLED_TIME } from '../data/intro.js';

// One clock for the whole intro so the scene and the UI never drift apart.
// ?t=final (or ?t=3000) freezes the clock, which is handy for screenshots.
export function createIntroClock({ settled = false } = {}) {
  const param = new URLSearchParams(window.location.search).get('t');
  const frozen = param === 'final' ? SETTLED_TIME : param != null ? Number(param) : null;
  const start = performance.now();
  let offset = settled ? SETTLED_TIME : 0;

  return {
    now: () => (frozen != null && !Number.isNaN(frozen) ? frozen : performance.now() - start + offset),
    skip: () => {
      const elapsed = performance.now() - start + offset;
      if (elapsed < SETTLED_TIME) offset += SETTLED_TIME - elapsed;
    },
  };
}
