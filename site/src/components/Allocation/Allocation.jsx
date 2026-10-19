import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ALLOCATION_COPY, FIELDS, GRADES, RESULTS, SAMPLE_LETTER, isEmail, makeReference } from '../../data/allocation.js';
import { createSealPress } from './sealPress.js';
import { createFold } from './letterFold.js';
import './Allocation.css';

const EMPTY = { destination: '', email: '', grade: '', name: '' };

// ?replay shows a "Replay fold" button for reviewing the send animation
const SHOW_REPLAY = new URLSearchParams(window.location.search).has('replay');

const problemsIn = (v) => ({
  grade: !v.grade,
  destination: !v.destination.trim(),
  email: !isEmail(v.email),
  name: !v.name.trim(),
});
const hasProblems = (v) => Object.values(problemsIn(v)).some(Boolean);

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const smooth = (x) => x * x * (3 - 2 * x);

/** A handwritten blank: script on a fine ruled line, its caption printed beneath. */
function Blank({ name, flagged, className = '', inputProps }) {
  const f = FIELDS[name];
  return (
    <span className={`alloc__blank alloc__blank--${name}${flagged ? ' is-flagged' : ''} ${className}`}>
      <input
        id={`alloc-${name}`}
        className="alloc__hand"
        placeholder={f.placeholder}
        aria-label={f.caption}
        aria-describedby={`alloc-${name}-caption`}
        aria-invalid={flagged || undefined}
        autoComplete="off"
        spellCheck="false"
        {...inputProps}
      />
      <span className="alloc__caption" id={`alloc-${name}-caption`}>
        {flagged ? <span className="alloc__hint">{f.hint}</span> : f.caption}
      </span>
    </span>
  );
}

// A quick tick of the pen in the chosen grade's box
const TICK = 'M 3 12 C 6 14, 8 17, 10 21 C 13 13, 18 6, 25 2';

/**
 * Request an allocation. As the section arrives a sheet unrolls across the page
 * (scroll drives --unroll from App). The request is a letter: Melange Mercantile's
 * printed form, filled in in your own hand, with the grade ticked in a printed box.
 * Sending folds the letter into an envelope, seals it in black wax and sends it
 * off the page. What was sent is noted on the dark page; asking for another
 * unrolls a fresh sheet.
 */
const Allocation = forwardRef(function Allocation(props, ref) {
  const reduced = useReducedMotion();
  const [values, setValues] = useState(EMPTY);
  const [flagged, setFlagged] = useState({});
  const [phase, setPhase] = useState('letter'); // letter | sending | sent | unrolling
  const [receipt, setReceipt] = useState(null); // what was last sent: { kind, values, reference }
  const sectionRef = useRef(null);
  const anchorRef = useRef(null);
  const frameRef = useRef(null);
  const paperRef = useRef(null);
  const letterRef = useRef(null);
  const layerRef = useRef(null);
  const canvasRef = useRef(null);
  const pressRef = useRef(null);
  const sentRef = useRef(null);
  const fieldRefs = useRef({});

  // A fresh sheet unrolls across the page, as the first one did as you arrived
  const unrollFresh = async () => {
    const frame = frameRef.current;
    paperRef.current.style.visibility = '';
    if (prefersReducedMotion()) return;
    const start = performance.now();
    const MS = 1700;
    frame.style.setProperty('--unroll', '0');
    await new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - start) / MS);
        frame.style.setProperty('--unroll', smooth(t).toFixed(4));
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    frame.style.removeProperty('--unroll'); // back to the scroll's own value (fully open here)
  };

  // From the note on the dark page: a new sheet, blank or already partly written
  const anotherSheet = async (keep = EMPTY) => {
    setValues(keep);
    setFlagged({});
    setPhase('unrolling');
    await nextFrame();
    await unrollFresh();
    setReceipt(null);
    setPhase('letter');
    await nextFrame(); // the fields unlock before the cursor goes in
    const first = keep.grade ? (keep.destination ? 'name' : 'destination') : null;
    if (first) fieldRefs.current[first]?.focus({ preventScroll: true });
    else document.querySelector('.alloc__grade input')?.focus({ preventScroll: true });
  };

  // the page scrolls to the anchor (the moment the sheet is fully open), not the section top.
  // The Reserve can arrive with a grade already ticked, on a fresh sheet if need be.
  useImperativeHandle(ref, () => ({
    section: anchorRef.current,
    focusInput: () => fieldRefs.current.destination?.focus({ preventScroll: true }),
    circleGrade: (name) => {
      if (phase === 'sent') { anotherSheet({ ...EMPTY, grade: name }); return; }
      if (phase !== 'letter') return;
      setValues((v) => ({ ...v, grade: name }));
      setFlagged((f) => ({ ...f, grade: false }));
    },
  }));

  // The seal's 3D scene (its own WebGL context) is only built as the letter comes
  // near, so the rest of the page runs on a single context
  useEffect(() => {
    let press = null;
    const onResize = () => press?.resize();
    const build = () => {
      if (press) return;
      // without WebGL the letter still folds and sends, just without the press
      try {
        press = createSealPress(canvasRef.current, { reducedMotion: prefersReducedMotion() });
      } catch (err) {
        console.warn('Melange Mercantile: the seal press could not start.', err);
        return;
      }
      pressRef.current = press;
      if (import.meta.env.DEV) window.__sealPress = press; // poseAt(ms) for reviewing frames
      window.addEventListener('resize', onResize);
    };
    const near = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { build(); near.disconnect(); }
    }, { rootMargin: '150% 0px' });
    near.observe(sectionRef.current);
    return () => {
      near.disconnect();
      window.removeEventListener('resize', onResize);
      press?.dispose();
      pressRef.current = null;
    };
  }, []);

  // announce what was sent once the note is on the page
  useEffect(() => {
    if (phase === 'sent') sentRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const locked = phase !== 'letter';
  const grade = GRADES.find((g) => g.name === values.grade);

  const update = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    // a flagged blank clears itself as soon as it's filled in properly
    if (flagged[name] && !problemsIn(next)[name]) setFlagged((f) => ({ ...f, [name]: false }));
  };

  // Fold a complete letter into an envelope, seal it and send it off the page
  const send = async (letter) => {
    setFlagged({});
    document.activeElement?.blur();
    const chosen = GRADES.find((g) => g.name === letter.grade);
    const sent = { kind: chosen?.warrant ? 'register' : 'received', values: letter, reference: makeReference() };

    if (prefersReducedMotion()) {
      paperRef.current.style.visibility = 'hidden';
      setReceipt(sent);
      setPhase('sent');
      return;
    }

    setPhase('sending');
    await nextFrame(); // the buttons and fields settle into their locked look before they're copied
    const fold = createFold({ frame: frameRef.current, paper: paperRef.current, layer: layerRef.current });
    paperRef.current.style.visibility = 'hidden'; // the copies take its place
    await fold.fold();

    // the seal comes down on the flap's point. Its canvas is cut off at the
    // envelope's lower edge, so the stamp's shadow doesn't fall onto the dark page.
    const canvas = canvasRef.current;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const canvasTop = fold.sealAt.y - h / 2;
    canvas.style.left = `${fold.sealAt.x - w / 2}px`;
    canvas.style.top = `${canvasTop}px`;
    canvas.style.clipPath = `inset(0 0 ${Math.max(0, canvasTop + h - fold.bottom)}px 0)`;
    canvas.classList.add('is-on');
    await wait(150);
    await pressRef.current?.press();
    await wait(400);

    await fold.away([canvas]);
    fold.clear([canvas]);
    canvas.classList.remove('is-on');
    canvas.style.clipPath = '';
    pressRef.current?.reset();

    setValues(EMPTY);
    setReceipt(sent);
    setPhase('sent');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (locked) return;
    const problems = problemsIn(values);
    const first = Object.keys(problems).find((k) => problems[k]);
    if (first) {
      setFlagged(problems);
      if (first === 'grade') document.querySelector('.alloc__grade input')?.focus();
      else fieldRefs.current[first]?.focus();
      return;
    }
    send(values);
  };

  // Reviewing: play the whole send again. An unfinished letter is filled in with a
  // sample first, so there's always something to fold.
  const replay = async () => {
    if (phase === 'sending' || phase === 'unrolling') return;
    if (phase === 'sent') await anotherSheet(SAMPLE_LETTER);
    const letter = phase === 'sent' || hasProblems(values) ? SAMPLE_LETTER : values;
    setValues(letter);
    await nextFrame();
    await nextFrame(); // let the sample be written onto the sheet before it's copied
    send(letter);
  };
  if (import.meta.env.DEV) window.__allocation = { replay };

  const hand = (name) => ({
    ref: (el) => { fieldRefs.current[name] = el; },
    value: values[name],
    onChange: (e) => update(name, e.target.value),
    readOnly: locked,
  });

  const result = receipt && RESULTS[receipt.kind];

  return (
    <section className={`alloc is-${phase}`} id="allocation" ref={sectionRef} aria-labelledby="alloc-title">
      <span className="alloc__anchor" ref={anchorRef} aria-hidden="true" />
      <div className="alloc__frame" ref={frameRef}>
        <div className="alloc__paper" ref={paperRef}>
          <motion.form
            layout="position"
            transition={{ duration: reduced ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="alloc__letter"
            ref={letterRef}
            onSubmit={onSubmit}
            noValidate
          >
            <header className="alloc__head">
              <h2 className="alloc__title" id="alloc-title">{ALLOCATION_COPY.title}</h2>
              <span className="alloc__flourish" aria-hidden="true"><i /></span>
            </header>

            <p className="alloc__salutation">{ALLOCATION_COPY.salutation}</p>

            {/* the grades as printed tick boxes, ahead of the request */}
            <fieldset
              className={`alloc__grades${flagged.grade ? ' is-flagged' : ''}`}
              disabled={locked}
              aria-describedby="alloc-grade-note"
            >
              <legend className="sr-only">{ALLOCATION_COPY.gradeLegend}</legend>
              <div className="alloc__grade-row">
                {GRADES.map((g) => (
                  <label key={g.name} className={`alloc__grade${values.grade === g.name ? ' is-marked' : ''}`}>
                    <input
                      type="radio"
                      name="grade"
                      value={g.name}
                      checked={values.grade === g.name}
                      onChange={() => update('grade', g.name)}
                    />
                    <span className="alloc__box" aria-hidden="true">
                      <svg viewBox="0 0 28 24"><path d={TICK} pathLength="1" /></svg>
                    </span>
                    <span className="alloc__grade-name">{g.name}</span>
                    <span className="alloc__purity">{g.purity}%</span>
                  </label>
                ))}
              </div>
              <p className="alloc__grade-note" id="alloc-grade-note">
                {flagged.grade ? (
                  <span className="alloc__hint">{FIELDS.grade.hint}</span>
                ) : grade?.warrant && !locked ? (
                  <span className="alloc__hint">Imperial Reserve is allocated only to Houses holding a Melange Mercantile warrant. Without one, your request joins the waiting register.</span>
                ) : (
                  ALLOCATION_COPY.gradeLegend
                )}
              </p>
            </fieldset>

            <p className="alloc__prose">
              I request an allocation of the grade ticked above, to be delivered to{' '}
              <span className="alloc__keep"><Blank name="destination" flagged={flagged.destination} inputProps={hand('destination')} /><span className="alloc__stop">,</span></span> with your reply sent to{' '}
              <span className="alloc__keep"><Blank name="email" flagged={flagged.email} inputProps={{ ...hand('email'), type: 'email', inputMode: 'email' }} /><span className="alloc__stop">.</span></span>
            </p>

            {/* signature on the left; on the right, the send button */}
            <div className="alloc__close">
              <div className="alloc__sign">
                <p className="alloc__closing">{ALLOCATION_COPY.closing}</p>
                <Blank name="name" flagged={flagged.name} className="alloc__blank--signature" inputProps={hand('name')} />
              </div>
              <div className="alloc__seal-spot">
                <button className="alloc__submit" type="submit" disabled={locked}>{ALLOCATION_COPY.submit}</button>
              </div>
            </div>
          </motion.form>
        </div>
        <div className="alloc__roll" aria-hidden="true" />
        {/* the folding envelope and its seal are drawn here, over the sheet */}
        <div className="alloc__dispatch" ref={layerRef} aria-hidden="true">
          <canvas ref={canvasRef} className="alloc__seal-canvas" />
        </div>

        {/* once the envelope has gone: what was sent, on the dark page */}
        {phase === 'sent' && result && (
          <div className="alloc__sent">
            <p className="alloc__sent-ref">Reference {receipt.reference}</p>
            <h3 className="alloc__sent-title" ref={sentRef} tabIndex={-1}>{result.title}</h3>
            <p className="alloc__sent-body">{result.body(receipt.values)}</p>
            <p className="alloc__sent-actions">
              <button type="button" className="alloc__sent-button is-primary" onClick={() => anotherSheet()}>
                {ALLOCATION_COPY.another}
              </button>
              {result.offer && (
                <button type="button" className="alloc__sent-button" onClick={() => anotherSheet({ ...receipt.values, grade: 'House Select' })}>
                  {result.offer}
                </button>
              )}
            </p>
          </div>
        )}

        {SHOW_REPLAY && (phase === 'letter' || phase === 'sent') && (
          <button type="button" className={`alloc__replay${phase === 'sent' ? ' is-dark' : ''}`} onClick={replay}>
            Replay fold
          </button>
        )}
        <p className="sr-only" role="status">{phase === 'sending' ? ALLOCATION_COPY.sealing : ''}</p>
      </div>
    </section>
  );
});

export default Allocation;
