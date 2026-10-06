import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MENU } from '../../data/intro.js';
import './Menu.css';

const EASE = [0.16, 1, 0.3, 1];

/**
 * The menu button's two lines, drawn where the page's own Menu icon sits. On
 * open they slide together and cross into an X; on close they uncross and part
 * back into two lines, handing over to the page's icon underneath.
 */
function MorphIcon({ reduced }) {
  const bar = (side) => ({
    initial: { y: side * 3, rotate: 0 },
    animate: {
      y: 0,
      rotate: side * 32,
      transition: reduced ? { duration: 0 } : { y: { duration: 0.22, ease: EASE }, rotate: { duration: 0.34, delay: 0.16, ease: EASE } },
    },
    exit: {
      y: side * 3,
      rotate: 0,
      transition: reduced ? { duration: 0 } : { rotate: { duration: 0.24, ease: EASE }, y: { duration: 0.22, delay: 0.16, ease: EASE } },
    },
  });
  return (
    <span className="menu__close-icon" aria-hidden="true">
      <motion.span className="menu__close-bar" {...bar(-1)} />
      <motion.span className="menu__close-bar" {...bar(1)} />
    </span>
  );
}

/**
 * Full-screen menu. Hovering (or focusing) an entry fades its photograph in
 * behind the list; choosing one closes the menu and scrolls to that section.
 * Escape closes; focus stays inside while open and returns to the menu button.
 */
export default function Menu({ open, onClose, onNavigate, returnFocusTo }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(null);
  const panelRef = useRef(null);

  // Focus the first entry on open; keep Tab inside; Escape closes
  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    const focusables = () => [...panel.querySelectorAll('button:not([disabled]), a[href]')];
    const first = setTimeout(() => focusables()[1]?.focus(), 50);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key !== 'Tab') return;
      const list = focusables();
      const i = list.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); list[list.length - 1].focus(); }
      else if (!e.shiftKey && i === list.length - 1) { e.preventDefault(); list[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(first);
      document.removeEventListener('keydown', onKey);
      returnFocusTo?.current?.focus();
    };
  }, [open, onClose, returnFocusTo]);

  useEffect(() => { if (!open) setActive(null); }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="menu"
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          ref={panelRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE } }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {/* photographs behind the list, one per entry */}
          <div className="menu__backdrop" aria-hidden="true">
            {MENU.filter((m) => m.image).map((m) => (
              <img
                key={m.label}
                className={`menu__photo${active === m.label ? ' is-active' : ''}`}
                src={m.image}
                alt=""
              />
            ))}
          </div>

          <button className="menu__close" type="button" onClick={onClose}>
            <MorphIcon reduced={reduced} />
            <span>Close</span>
          </button>

          <nav className="menu__nav" aria-label="Sections">
            <ol className="menu__list" onMouseLeave={() => setActive(null)}>
              {MENU.map((m, i) => (
                <li key={m.label} className="menu__item">
                  <span className="menu__mask">
                    <motion.button
                      type="button"
                      className={`menu__link${active && active !== m.label ? ' is-dim' : ''}${m.soon ? ' is-soon' : ''}`}
                      aria-disabled={m.soon || undefined}
                      onMouseEnter={() => setActive(m.label)}
                      onFocus={() => setActive(m.label)}
                      onClick={() => { if (!m.soon) onNavigate(m.action || m.at); }}
                      initial={{ y: '110%' }}
                      animate={{ y: '0%', transition: { duration: 1.1, ease: EASE, delay: 0.15 + i * 0.06 } }}
                      exit={{ y: '110%', transition: { duration: 0.4, ease: EASE } }}
                    >
                      <span className="menu__index">{String(i + 1).padStart(2, '0')}</span>
                      <span className="menu__label">{m.label}</span>
                      {m.soon && <span className="menu__soon">In preparation</span>}
                    </motion.button>
                  </span>
                </li>
              ))}
            </ol>
          </nav>

          <p className="menu__footer">Spice · Trade · Influence</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
