import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import SunlitScene from './components/SunlitScene/SunlitScene.jsx';
import LandingUI from './components/LandingUI/LandingUI.jsx';
import ArrakisSection from './components/ArrakisSection/ArrakisSection.jsx';
import MelangeSection from './components/MelangeSection/MelangeSection.jsx';
import ReserveSection from './components/ReserveSection/ReserveSection.jsx';
import GallerySection from './components/GallerySection/GallerySection.jsx';
import ArrivalSection from './components/ArrivalSection/ArrivalSection.jsx';
import Menu from './components/Menu/Menu.jsx';
import Verify from './components/Verify/Verify.jsx';
import Allocation from './components/Allocation/Allocation.jsx';
import { TIMELINE } from './data/intro.js';
import { createIntroClock } from './lib/introClock.js';
import { updateScrollState } from './lib/scrollState.js';

const phaseAt = (t) => {
  if (t >= TIMELINE.interface) return 'interface';
  if (t >= TIMELINE.wordmark) return 'wordmark';
  if (t >= TIMELINE.darkHold) return 'light';
  return 'dark';
};

// Where a reload should land: the spot this tab was at when it left, in viewport
// heights so it survives a resize. Only a reload restores; a fresh visit starts at
// the landing and plays the intro. Storage can be blocked, so every touch is guarded.
const SCROLL_KEY = 'mm-scroll';
const savedReloadSpot = () => {
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav?.type !== 'reload') return 0;
    const at = Number(sessionStorage.getItem(SCROLL_KEY));
    return Number.isFinite(at) && at > 0.05 ? at : 0;
  } catch {
    return 0;
  }
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const reducedMotion = useMemo(prefersReducedMotion, []);
  const reloadSpot = useMemo(savedReloadSpot, []);
  // a reload mid-page skips the intro: it only makes sense from the top
  const clock = useMemo(() => createIntroClock({ settled: reducedMotion || reloadSpot > 0 }), [reducedMotion, reloadSpot]);
  const [phase, setPhase] = useState(() => phaseAt(clock.now()));
  const [lenis, setLenis] = useState(null);
  const [arrakisActive, setArrakisActive] = useState(false);
  const [melangeActive, setMelangeActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const verifyRef = useRef(null);
  const allocationRef = useRef(null);
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
    let allocation = null;
    // Allocation's sheet unrolls while the section is pinned (wide, tall screens),
    // or simply as it arrives when the section flows (phones, short windows);
    // the same media query switches the pin in Allocation.css
    const pinnedSheet = window.matchMedia('(min-width: 761px) and (min-height: 700px)');
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
      if (!allocation) allocation = document.getElementById('allocation');
      if (allocation) {
        const vh = window.innerHeight;
        const top = allocation.getBoundingClientRect().top;
        const p = pinnedSheet.matches ? -top / (vh * 1.1) : (vh * 0.9 - top) / (vh * 0.7);
        const x = Math.min(1, Math.max(0, p));
        root.style.setProperty('--unroll', (x * x * (3 - 2 * x)).toFixed(4));
      }
      // the docked logo appears as the 3D pillar finishes docking. It sits above
      // everything except the gallery's last photos, which slide up over it as the
      // row scrolls away
      const docked = Math.min(1, Math.max(0, (s.dock - 0.95) / 0.05));
      root.style.setProperty('--mark-show', docked.toFixed(4));
      root.classList.toggle('mark-under', s.y > window.innerHeight * 8.7 && galleryOverLogo());
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
      // ?s=1.5 jumps to 1.5 viewport-heights down (for reviewing frames); otherwise
      // a reload returns to where the page was
      const s = new URLSearchParams(window.location.search).get('s');
      const at = s ? Number(s) : reloadSpot;
      if (at) lenis.scrollTo(at * window.innerHeight, { immediate: true, force: true });
    } else {
      lenis.stop();
    }
  }, [phase, lenis, reloadSpot]);

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
    scrollToEl(v?.section, { onComplete: () => v?.focusInput() });
  }, [scrollToEl]);
  // Allocation sits just before Verify; the menu and Verify's "Don't have a code?" glide
  // to the moment its sheet is fully unrolled, with the cursor in the first blank
  // The Reserve's "Request" arrives with that grade already circled on the letter
  const openAllocation = useCallback((grade) => {
    setMenuOpen(false);
    const a = allocationRef.current;
    if (typeof grade === 'string') a?.circleGrade(grade);
    scrollToEl(a?.section, { onComplete: () => a?.focusInput() });
  }, [scrollToEl]);
  // keep each Verify result in view as the section grows or shrinks
  const onVerifyResult = useCallback((el) => scrollToEl(el, { duration: 0.9 }), [scrollToEl]);
  // A shared #verify link lands there once, then clears itself so reloads start at the top
  useEffect(() => {
    if (phase !== 'interface' || !lenis || window.location.hash !== '#verify') return;
    const v = verifyRef.current;
    lenis.scrollTo(v?.section, { immediate: true });
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [phase, lenis]);

  // The browser's own scroll restoration is off: it fired while the intro still had
  // the page locked and Lenis then settled somewhere else (the old jump to Verify).
  // Instead the page starts at the top, and a reload is put back by the effect
  // above once the page can scroll. The spot is saved as the tab leaves.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    // without Lenis (reduced motion) there's no intro to wait for, so restore right away
    window.scrollTo(0, reducedMotion ? reloadSpot * window.innerHeight : 0);
    const save = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY / window.innerHeight));
      } catch {
        // storage blocked: reloads simply start at the landing
      }
    };
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, [reducedMotion, reloadSpot]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const navigate = useCallback((at) => {
    if (at === 'verify') { openVerify(); return; }
    if (at === 'allocation') { openAllocation(); return; }
    setMenuOpen(false);
    const y = at * window.innerHeight;
    if (lenis) {
      lenis.start();
      lenis.scrollTo(y, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    } else {
      window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [lenis, reducedMotion, openVerify, openAllocation]);

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
        <ReserveSection onRequest={openAllocation} />
        <GallerySection />
        <ArrivalSection />
        <Allocation ref={allocationRef} />
        <Verify ref={verifyRef} onResult={onVerifyResult} onRequestAllocation={openAllocation} />
      </div>
      <Menu open={menuOpen} onClose={closeMenu} onNavigate={navigate} returnFocusTo={menuButtonRef} />
    </>
  );
}

