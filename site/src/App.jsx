import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import SunlitScene from './components/SunlitScene/SunlitScene.jsx';
import LandingUI from './components/LandingUI/LandingUI.jsx';
import ArrakisSection from './components/ArrakisSection/ArrakisSection.jsx';
import MelangeSection from './components/MelangeSection/MelangeSection.jsx';
import GallerySection from './components/GallerySection/GallerySection.jsx';
import ArrivalSection from './components/ArrivalSection/ArrivalSection.jsx';
import Menu from './components/Menu/Menu.jsx';
import { TIMELINE } from './data/intro.js';
import { createIntroClock } from './lib/introClock.js';
import { updateScrollState } from './lib/scrollState.js';

const phaseAt = (t) => {
  if (t >= TIMELINE.interface) return 'interface';
  if (t >= TIMELINE.wordmark) return 'wordmark';
  if (t >= TIMELINE.darkHold) return 'light';
  return 'dark';
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const reducedMotion = useMemo(prefersReducedMotion, []);
  const clock = useMemo(() => createIntroClock({ settled: reducedMotion }), [reducedMotion]);
  const [phase, setPhase] = useState(() => phaseAt(clock.now()));
  const [lenis, setLenis] = useState(null);
  const [arrakisActive, setArrakisActive] = useState(false);
  const [melangeActive, setMelangeActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  // Follow the shared clock; only re-render when the phase actually changes
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const next = phaseAt(clock.now());
      setPhase((prev) => (prev === next ? prev : next));
      if (next !== 'interface') raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clock]);

  // Smooth scroll, and one place that turns scroll position into progress values
  useEffect(() => {
    const root = document.documentElement;
    const instance = reducedMotion ? null : new Lenis({ lerp: 0.075, smoothWheel: true });
    const apply = (y) => {
      const s = updateScrollState(y, window.innerHeight);
      root.style.setProperty('--dock', s.dock.toFixed(4));
      root.style.setProperty('--copy', s.copy.toFixed(4));
      root.style.setProperty('--vialcopy', s.vialCopy.toFixed(4));
      root.style.setProperty('--gallery', s.gallery.toFixed(4));
      root.style.setProperty('--gallery-in', s.galleryIn.toFixed(4));
      root.style.setProperty('--arrive', s.arrive.toFixed(4));
      root.style.setProperty('--arrive-copy', s.arriveCopy.toFixed(4));
      setArrakisActive((prev) => (prev ? s.copy > 0.2 : s.copy > 0.6));
      setMelangeActive((prev) => (prev ? s.vialCopy > 0.2 : s.vialCopy > 0.6));
    };
    let raf = 0;
    const loop = (time) => {
      if (instance) instance.raf(time);
      apply(instance ? instance.scroll : window.scrollY);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    setLenis(instance);
    return () => {
      cancelAnimationFrame(raf);
      if (instance) instance.destroy();
    };
  }, [reducedMotion]);

  // No scrolling until the intro has settled
  useEffect(() => {
    const settled = phase === 'interface';
    document.documentElement.classList.toggle('is-intro', !settled);
    if (!lenis) return;
    if (settled) {
      lenis.start();
      // ?s=1.5 jumps to 1.5 viewport-heights down (for reviewing frames)
      const s = new URLSearchParams(window.location.search).get('s');
      if (s) lenis.scrollTo(Number(s) * window.innerHeight, { immediate: true });
    } else {
      lenis.stop();
    }
  }, [phase, lenis]);

  // The page holds still while the menu is open
  useEffect(() => {
    if (!lenis || phase !== 'interface') return;
    if (menuOpen) lenis.stop();
    else lenis.start();
  }, [menuOpen, lenis, phase]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const navigate = useCallback((at) => {
    setMenuOpen(false);
    const y = at * window.innerHeight;
    if (lenis) {
      lenis.start();
      lenis.scrollTo(y, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    } else {
      window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [lenis, reducedMotion]);

  const skip = useCallback(() => {
    clock.skip();
    setPhase('interface');
  }, [clock]);

  // Escape, or any attempt to scroll, also skips the intro
  useEffect(() => {
    if (phase === 'interface') return undefined;
    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('touchmove', skip, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchmove', skip);
    };
  }, [phase, skip]);

  return (
    <>
      <SunlitScene clock={clock} reducedMotion={reducedMotion} />
      <div className="film-grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <LandingUI
        phase={phase}
        onSkip={skip}
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen(true)}
        menuButtonRef={menuButtonRef}
      />
      <div className="track">
        <section className="track__arrival" id="arrival" aria-label="Arrival" />
        <ArrakisSection active={arrakisActive} />
        <MelangeSection active={melangeActive} />
        <GallerySection />
        <ArrivalSection />
      </div>
      <Menu open={menuOpen} onClose={closeMenu} onNavigate={navigate} returnFocusTo={menuButtonRef} />
    </>
  );
}

