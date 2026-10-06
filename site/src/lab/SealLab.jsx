import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createSealPress, DUST_DEFAULTS, PRESS_MS, T } from '../components/Allocation/sealPress.js';
import '../components/Allocation/Allocation.css';
import './SealLab.css';

const SPEEDS = [0.25, 0.5, 1];
const PHASES = [
  { label: 'Pour', at: T.pour[0] },
  { label: 'Descend', at: T.descend[0] },
  { label: 'Press', at: T.press[0] },
  { label: 'Lift', at: T.lift[0] },
];

// The silver dusting's settings, in the order they appear in the panel
const SILVER = [
  { group: 'How much' },
  { key: 'coverage', label: 'Coverage', hint: 'powder everywhere, before grain', min: 0, max: 1, step: 0.01 },
  { key: 'field', label: 'On the field', hint: 'the flat face around the pillar', min: 0, max: 1.5, step: 0.01 },
  { key: 'pillar', label: 'On the pillar', hint: 'the raised mark', min: 0, max: 1.5, step: 0.01 },
  { key: 'edges', label: 'On the edges', hint: 'steep sides; 0 leaves them bare wax', min: 0, max: 1, step: 0.01 },
  { key: 'max', label: 'Most it can cover', hint: '1 = solid silver in places', min: 0.3, max: 1, step: 0.01 },
  { group: 'Texture' },
  { key: 'grain', label: 'Grain', hint: 'how speckled the powder is', min: 0, max: 1, step: 0.01 },
  { key: 'grainSize', label: 'Grain size', hint: 'about 8 = one screen pixel', min: 2, max: 40, step: 0.5 },
  { key: 'drift', label: 'Unevenness', hint: 'where the brush laid more', min: 0, max: 0.6, step: 0.01 },
  { key: 'driftSize', label: 'Unevenness size', min: 20, max: 400, step: 5 },
  { group: 'Where the stamp reached' },
  { key: 'reachIn', label: 'Full dust out to', hint: 'radius on the wax', min: 0.4, max: 1, step: 0.01 },
  { key: 'reachOut', label: 'Fades out by', min: 0.5, max: 1.1, step: 0.01 },
  { group: 'The silver' },
  { key: 'brightness', label: 'Brightness', min: 0.2, max: 1, step: 0.01 },
  { key: 'metalness', label: 'Metallic', min: 0, max: 1, step: 0.01 },
  { key: 'roughness', label: 'Roughness', hint: 'low = shiny, high = chalky', min: 0, max: 1, step: 0.01 },
];

const STORE = 'seal-lab-dust';
const savedDust = () => {
  try {
    return { ...DUST_DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') };
  } catch {
    return { ...DUST_DEFAULTS };
  }
};

/** The Silver panel: one slider per setting, reset, and copy-out for making them the page defaults. */
function SilverPanel({ dust, onChange, onReset }) {
  const [copied, setCopied] = useState(false);
  const changed = Object.keys(dust).filter((k) => dust[k] !== DUST_DEFAULTS[k]);
  const copy = async () => {
    const text = `Seal silver settings:\n${JSON.stringify(dust, null, 2)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy these settings:', JSON.stringify(dust));
    }
  };
  return (
    <aside className="lab__silver" aria-label="Silver dusting">
      <header className="lab__silver-head">
        <h2>Silver</h2>
        <span>{changed.length ? `${changed.length} changed` : 'page defaults'}</span>
      </header>
      {SILVER.map((s) =>
        s.group ? (
          <h3 key={s.group}>{s.group}</h3>
        ) : (
          <label key={s.key} className={`lab__slider${dust[s.key] !== DUST_DEFAULTS[s.key] ? ' is-changed' : ''}`}>
            <span className="lab__slider-top">
              <span>{s.label}</span>
              <output>{Number(dust[s.key]).toFixed(s.step < 0.1 ? 2 : 1)}</output>
            </span>
            <input type="range" min={s.min} max={s.max} step={s.step} value={dust[s.key]} onChange={(e) => onChange(s.key, Number(e.target.value))} />
            {s.hint && <span className="lab__slider-hint">{s.hint}</span>}
          </label>
        ),
      )}
      <div className="lab__silver-actions">
        <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy values'}</button>
        <button type="button" onClick={onReset} disabled={!changed.length}>Reset to page defaults</button>
      </div>
    </aside>
  );
}

/**
 * Seal lab (dev only, /seal-lab.html): the Allocation seal press on its own
 * parchment, to replay and scrub while refining it. It uses the same
 * sealPress.js as the page, so edits there show up here (and on the page).
 *
 * Keys: Space replays · ← → step 50ms · 1 2 3 set speed · L toggles loop
 */
export default function SealLab() {
  const canvasRef = useRef(null);
  const pressRef = useRef(null);
  const loopRef = useRef(false);
  const [t, setT] = useState(PRESS_MS);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [spot, setSpot] = useState('letter'); // letter | centre
  const [playing, setPlaying] = useState(false);
  const [dust, setDust] = useState(savedDust);
  loopRef.current = loop;

  useEffect(() => {
    const press = createSealPress(canvasRef.current, { dust: savedDust() });
    pressRef.current = press;
    // show the finished seal once the pillar model has loaded
    const first = setTimeout(() => press.poseAt(PRESS_MS), 400);
    const onResize = () => press.resize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(first);
      window.removeEventListener('resize', onResize);
      press.dispose();
    };
  }, []);

  const play = useCallback(async () => {
    const press = pressRef.current;
    if (!press) return;
    setPlaying(true);
    do {
      await press.press({ speed, onFrame: setT });
      if (loopRef.current) await new Promise((r) => setTimeout(r, 900)); // a beat on the finished seal
    } while (loopRef.current);
    setPlaying(false);
  }, [speed]);

  // silver settings apply live and are kept between visits to the lab
  const changeDust = (key, value) => {
    setDust((d) => {
      const next = { ...d, [key]: value };
      try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* fine without */ }
      return next;
    });
    pressRef.current?.setDust({ [key]: value });
  };
  const resetDust = () => {
    setDust({ ...DUST_DEFAULTS });
    try { localStorage.removeItem(STORE); } catch { /* fine without */ }
    pressRef.current?.setDust(DUST_DEFAULTS);
  };

  const scrub = (ms) => {
    setPlaying(false);
    loopRef.current = false;
    setLoop(false);
    setT(ms);
    pressRef.current?.poseAt(ms);
  };

  // the canvas moves with the spot, so the eye-level perspective is re-measured
  useEffect(() => {
    const id = requestAnimationFrame(() => pressRef.current?.poseAt(t));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('.lab__silver')) return; // arrow keys there move the silver sliders
      if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
      if (e.code === 'Space') { e.preventDefault(); play(); }
      if (e.key === 'ArrowRight') scrub(Math.min(PRESS_MS, t + 50));
      if (e.key === 'ArrowLeft') scrub(Math.max(0, t - 50));
      if (e.key === '1') setSpeed(0.25);
      if (e.key === '2') setSpeed(0.5);
      if (e.key === '3') setSpeed(1);
      if (e.key.toLowerCase() === 'l') setLoop((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="alloc lab">
      <div className="alloc__paper lab__paper">
        {/* the signature beside it, for scale, where it sits on the letter */}
        <div className={`lab__sign${spot === 'centre' ? ' is-hidden' : ''}`} aria-hidden="true">
          <p className="alloc__closing">Yours in trade,</p>
          <span className="alloc__blank alloc__blank--signature">
            <span className="alloc__hand lab__signature">Leto Atreides</span>
            <span className="alloc__caption">Your name or House</span>
          </span>
        </div>
        <div className={`lab__spot is-${spot}`}>
          <canvas ref={canvasRef} className="alloc__seal-canvas" />
        </div>
      </div>

      <div className="lab__panel" role="group" aria-label="Seal press controls">
        <div className="lab__row">
          <button type="button" className="lab__play" onClick={play}>
            {playing ? 'Playing…' : 'Replay'} <kbd>Space</kbd>
          </button>
          <div className="lab__seg" role="radiogroup" aria-label="Speed">
            {SPEEDS.map((s, i) => (
              <button key={s} type="button" role="radio" aria-checked={speed === s} className={speed === s ? 'is-on' : ''} onClick={() => setSpeed(s)}>
                {s}× <kbd>{i + 1}</kbd>
              </button>
            ))}
          </div>
          <label className="lab__check">
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop <kbd>L</kbd>
          </label>
          <div className="lab__seg" role="radiogroup" aria-label="Seal position">
            <button type="button" role="radio" aria-checked={spot === 'letter'} className={spot === 'letter' ? 'is-on' : ''} onClick={() => setSpot('letter')}>As on the letter</button>
            <button type="button" role="radio" aria-checked={spot === 'centre'} className={spot === 'centre' ? 'is-on' : ''} onClick={() => setSpot('centre')}>Centred</button>
          </div>
        </div>

        <div className="lab__timeline">
          <input
            type="range"
            min="0"
            max={PRESS_MS}
            step="10"
            value={Math.round(t)}
            onChange={(e) => scrub(Number(e.target.value))}
            aria-label="Scrub the press"
          />
          <div className="lab__phases" role="group" aria-label="Jump to a phase">
            {PHASES.map((p) => (
              <button key={p.label} type="button" style={{ left: `${(p.at / PRESS_MS) * 100}%` }} onClick={() => scrub(p.at)}>
                {p.label}
              </button>
            ))}
          </div>
          <output className="lab__time">{Math.round(t)} / {PRESS_MS} ms</output>
        </div>
        <p className="lab__note">Scrub or press ← → to step 50ms. Edits to sealPress.js reload here.</p>
      </div>

      <SilverPanel dust={dust} onChange={changeDust} onReset={resetDust} />
    </div>
  );
}
