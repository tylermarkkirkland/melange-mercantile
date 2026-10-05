import React from 'react';
import { motion } from 'framer-motion';
import { CONTENT } from '../../data/intro.js';
import './LandingUI.css';

const EASE = [0.16, 1, 0.3, 1];

const letter = {
  hidden: { opacity: 0, y: 10, filter: 'blur(10px)' },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.6, ease: EASE } },
};

const fade = (delay = 0) => ({
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 1.8, ease: EASE, delay } },
});

// Splits a word into individually animated letters; screen readers get the whole word.
function RevealWord({ text, className, stagger, delay }) {
  return (
    <motion.span
      className={className}
      aria-hidden="true"
      variants={{ shown: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {text.split('').map((ch, i) => (
        <motion.span key={i} className="landing__letter" variants={letter}>
          {ch}
        </motion.span>
      ))}
    </motion.span>
  );
}

/**
 * Interface layered over the scene.
 * phase: 'dark' | 'light' | 'wordmark' | 'interface'
 */
export default function LandingUI({ phase, onSkip, menuOpen, onMenu, menuButtonRef, onVerify }) {
  const showWordmark = phase === 'wordmark' || phase === 'interface';
  const showInterface = phase === 'interface';

  return (
    <div className="landing">
      <motion.header className="landing__top" initial="hidden" animate={showInterface ? 'shown' : 'hidden'}>
        <motion.button
          className="landing__menu"
          type="button"
          ref={menuButtonRef}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={onMenu}
          variants={fade(0.2)}
        >
          <span className="landing__menu-icon" aria-hidden="true" />
          <span className="landing__menu-label">{CONTENT.menu}</span>
        </motion.button>
        <motion.a
          className="landing__link"
          href="#verify"
          onClick={(e) => { e.preventDefault(); onVerify(); }}
          variants={fade(0.35)}
        >
          {CONTENT.verifyLink}
        </motion.a>
      </motion.header>

      <div className="landing__fades">
      <div className="landing__center">
        <motion.h1
          className="landing__wordmark"
          aria-label="Melange Mercantile"
          initial="hidden"
          animate={showWordmark ? 'shown' : 'hidden'}
        >
          <RevealWord text={CONTENT.wordmarkTop} className="landing__word landing__word--top" stagger={0.11} delay={0} />
          <RevealWord text={CONTENT.wordmarkBottom} className="landing__word landing__word--bottom" stagger={0.07} delay={0.9} />
        </motion.h1>
      </div>

      <motion.footer className="landing__bottom" initial="hidden" animate={showInterface ? 'shown' : 'hidden'}>
        <motion.p className="landing__statement" variants={fade(0)}>
          {CONTENT.statement}
        </motion.p>
        <motion.div className="landing__cue" variants={fade(0.6)} aria-hidden="true">
          <span className="landing__cue-label">{CONTENT.scrollCue}</span>
          <span className="landing__cue-line" />
        </motion.div>
      </motion.footer>
      </div>

      {!showInterface && (
        <button className="landing__skip" type="button" onClick={onSkip}>
          {CONTENT.skip}
        </button>
      )}
    </div>
  );
}
