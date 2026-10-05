import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import SunlitScene from './components/SunlitScene/SunlitScene.jsx';
import LandingUI from './components/LandingUI/LandingUI.jsx';
import ArrakisSection from './components/ArrakisSection/ArrakisSection.jsx';
import MelangeSection from './components/MelangeSection/MelangeSection.jsx';
import GallerySection from './components/GallerySection/GallerySection.jsx';
import ArrivalSection from './components/ArrivalSection/ArrivalSection.jsx';
import Menu from './components/Menu/Menu.jsx';
import Verify from './components/Verify/Verify.jsx';
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
  const verifyRef = useRef(null);
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
    let galleryWindows = null;
    // true only while a gallery photo is physically passing behind the top bar logo
    const galleryOverLogo = () => {
      if (!galleryWindows) galleryWindows = document.querySelectorAll('.gallery__window');
      for (const w of galleryWindows) {
        const r = w.getBoundingClientRect();
        if (r.top < 100 && r.bottom > 30 && r.right > 0 && r.left < window.innerWidth) return true;
      }
      return false;
    };
    const apply = (y) => {
      const s = updateScrollState(y, window.innerHeight);
      root.style.setProperty('--dock', s.dock.toFixed(4));
      root.style.setProperty('--copy', s.copy.toFixed(4));
      root.style.setProperty('--vialcopy', s.vialCopy.toFixed(4));
      root.style.setProperty('--gallery', s.gallery.toFixed(4));
      root.style.setProperty('--gallery-in', s.galleryIn.toFixed(4));
      root.style.setProperty('--arrive', s.arrive.toFixed(4));
      root.style.setProperty('--arrive-copy', s.arriveCopy.toFixed(4));
      // the docked logo appears as the 3D pillar finishes docking. It sits above
      // everything except the gallery's last photos, which slide up over it as the
      // row scrolls away
      const docked = Math.min(1, Math.max(0, (s.dock - 0.95) / 0.05));
      root.style.setProperty('--mark-show', docked.toFixed(4));
      root.classList.toggle('mark-under', s.y > window.innerHeight * 7 && galleryOverLogo());
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

  // Verify is the last section of the page. The header link and the menu glide down
  // to it and put the cursor in the field; #verify in the address lands there too.
  const scrollToEl = useCallback((el, opts = {}) => {
    if (!el) return;
    if (lenis) {
      lenis.start();
      lenis.scrollTo(el, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
    } else {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      opts.onComplete?.();
    }
  }, [lenis, reducedMotion]);
  const openVerify = useCallback(() => {
    setMenuOpen(false);
    const v = verifyRef.current;
    if (window.location.hash !== '#verify') window.history.replaceState(null, '', '#verify');
    scrollToEl(v?.section, { onComplete: () => v?.focusInput() });
  }, [scrollToEl]);
  // keep each Verify result in view as the section grows or shrinks
  const onVerifyResult = useCallback((el) => scrollToEl(el, { duration: 0.9 }), [scrollToEl]);
  useEffect(() => {
    if (phase !== 'interface' || !lenis || window.location.hash !== '#verify') return;
    const v = verifyRef.current;
    lenis.scrollTo(v?.section, { immediate: true });
  }, [phase, lenis]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const navigate = useCallback((at) => {
    if (at === 'verify') { openVerify(); return; }
    setMenuOpen(false);
    const y = at * window.innerHeight;
    if (lenis) {
      lenis.start();
      lenis.scrollTo(y, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    } else {
      window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [lenis, reducedMotion, openVerify]);

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
      <div className="topbar-fade" aria-hidden="true" />
      <img className="site-mark" src="/models/logo-chrome.svg" alt="" aria-hidden="true" />
      <LandingUI
        phase={phase}
        onSkip={skip}
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen(true)}
        menuButtonRef={menuButtonRef}
        onVerify={openVerify}
      />
      <div className="track">
        <section className="track__arrival" id="arrival" aria-label="Arrival" />
        <ArrakisSection active={arrakisActive} />
        <MelangeSection active={melangeActive} />
        <GallerySection />
        <ArrivalSection />
        <Verify ref={verifyRef} onResult={onVerifyResult} />
      </div>
      <Menu open={menuOpen} onClose={closeMenu} onNavigate={navigate} returnFocusTo={menuButtonRef} />
    </>
  );
}

