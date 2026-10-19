import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import RollingNumber from '../RollingNumber/RollingNumber.jsx';
import { GRADES, RESERVE } from '../../data/reserve.js';
import './ReserveSection.css';

const EASE = [0.16, 1, 0.3, 1];

/**
 * The Reserve: what a House can have. One photograph of the four grades in their
 * vessels, finest to rawest, then the four grades beneath it in the same order,
 * purity leading. "Request" opens the Allocation letter with that grade ticked.
 */
export default function ReserveSection({ onRequest }) {
  const reduced = useReducedMotion();
  const headRef = useRef(null);
  const gradesRef = useRef(null);
  const headIn = useInView(headRef, { once: true, amount: 0.6 });
  const gradesIn = useInView(gradesRef, { once: true, amount: 0.35 });
  // the figures roll as the row arrives, and again each time it comes back into view (like Arakis)
  const rolling = useInView(gradesRef, { amount: 0.35 });

  const rise = (i, shown) => ({
    initial: reduced ? false : { opacity: 0, y: 18 },
    animate: shown || reduced ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 1, ease: EASE, delay: 0.12 * i },
  });

  return (
    <section className="reserve" id="reserve" aria-labelledby="reserve-title">
      <div className="reserve__photo">
        <img src={RESERVE.image} alt={RESERVE.alt} loading="lazy" decoding="async" />
      </div>

      <header className="reserve__head" ref={headRef}>
        <motion.p className="reserve__eyebrow" {...rise(0, headIn)}>{RESERVE.eyebrow}</motion.p>
        <motion.h2 className="reserve__headline" id="reserve-title" {...rise(1, headIn)}>
          {RESERVE.headline.map((line) => <span key={line}>{line}</span>)}
        </motion.h2>
        <motion.p className="reserve__intro" {...rise(2, headIn)}>{RESERVE.intro}</motion.p>
      </header>

      <div className="reserve__grades" ref={gradesRef}>
        <ol className="reserve__list">
          {GRADES.map((g, i) => (
            <motion.li key={g.name} className="reserve__grade" {...rise(i, gradesIn)}>
              <p className="reserve__purity">
                <RollingNumber value={g.purity} suffix="%" active={rolling || reduced} delay={200 + i * 140} />
              </p>
              <h3 className="reserve__name">{g.name}</h3>
              <p className="reserve__basin">{g.basin}</p>
              <p className="reserve__line">{g.line}</p>
              <div className="reserve__foot">
                <span className={`reserve__tag${g.warrant ? ' is-warrant' : ''}`}>
                  <span className="reserve__diamond" aria-hidden="true" />
                  {g.tag}
                </span>
                <button
                  type="button"
                  className="reserve__request"
                  onClick={() => onRequest?.(g.name)}
                  aria-label={`Request an allocation of ${g.name}`}
                >
                  {RESERVE.request}
                  <span className="reserve__arrow" aria-hidden="true" />
                </button>
              </div>
            </motion.li>
          ))}
        </ol>
        <motion.p className="reserve__note" {...rise(4, gradesIn)}>{RESERVE.warrantNote}</motion.p>
      </div>
    </section>
  );
}
