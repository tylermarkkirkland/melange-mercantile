import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ALLOCATION_COPY, FIELDS, GRADES, RESULTS, isEmail, makeReference } from '../../data/allocation.js';
import { createSealPress } from './sealPress.js';
import { createFold } from './letterFold.js';
import './Allocation.css';

const EMPTY = { destination: '', email: '', grade: '', name: '' };

// Two ways of choosing the grade, on trial: ?grade=a (a blank in the sentence,
// the default) or ?grade=b (printed tick boxes above the request).
const GRADE_STYLE = new URLSearchParams(window.location.search).get('grade') === 'b' ? 'b' : 'a';

const problemsIn = (v) => ({
  grade: !v.grade,
  destination: !v.destination.trim(),
  email: !isEmail(v.email),
  name: !v.name.trim(),
});

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

/** Option A: the grade is a blank in the sentence, like the others. It opens the grades to circle. */
function GradeBlank({ value, flagged, open, locked, onToggle, buttonRef }) {
  const f = FIELDS.grade;
  return (
    <span className={`alloc__blank alloc__blank--grade${flagged ? ' is-flagged' : ''}`}>
      <button
        type="button"
        id="alloc-grade"
        ref={buttonRef}
        className={`alloc__hand alloc__pick${value ? '' : ' is-empty'}`}
        aria-expanded={open}
        aria-controls="alloc-grades"
        aria-describedby="alloc-grade-caption"
        aria-invalid={flagged || undefined}
        disabled={locked}
        onClick={onToggle}
      >
        {value || f.placeholder}
      </button>
      <span className="alloc__caption" id="alloc-grade-caption">
        {flagged ? <span className="alloc__hint">{f.hint}</span> : f.caption}
      </span>
    </span>
  );
}

// An ink loop drawn around the chosen grade, a little uneven like a real pen
const LOOP = 'M 12 34 C 8 14, 60 4, 118 6 C 176 8, 214 18, 210 38 C 206 60, 150 70, 98 68 C 46 66, 6 58, 10 36 C 12 26, 30 18, 52 14';
// and a quick tick for the boxes
const TICK = 'M 3 12 C 6 14, 8 17, 10 21 C 13 13, 18 6, 25 2';

/**
 * Request an allocation. As the section arrives a sheet unrolls across the page
 * (scroll drives --unroll from App). The request is a letter: Melange Mercantile's
 * printed form, filled in in your own hand. Sending folds the letter, seals it in
 * black wax, and sends it off the page; a fresh sheet unrolls with a note of what
 * was sent.
 */
const Allocation = forwardRef(function Allocation(props, ref) {
  const reduced = useReducedMotion();
  const [values, setValues] = useState(EMPTY);
  const [flagged, setFlagged] = useState({});
  const [phase, setPhase] = useState('letter'); // letter | sending
  const [picking, setPicking] = useState(false); // option A: the grades are showing
  const [receipt, setReceipt] = useState(null); // what was last sent: { kind, values, reference }
  const sectionRef = useRef(null);
  const anchorRef = useRef(null);
  const frameRef = useRef(null);
  const paperRef = useRef(null);
  const letterRef = useRef(null);
  const layerRef = useRef(null);
  const canvasRef = useRef(null);
  const pressRef = useRef(null);
  const receiptRef = useRef(null);
  const pickRef = useRef(null);
  const fieldRefs = useRef({});

  // the page scrolls to the anchor (the moment the sheet is fully open), not the section top.
  // The Reserve can arrive with a grade already chosen.
  useImperativeHandle(ref, () => ({
    section: anchorRef.current,
    focusInput: () => fieldRefs.current.destination?.focus({ preventScroll: true }),
    circleGrade: (name) => {
      if (phase !== 'letter') return;
      setValues((v) => ({ ...v, grade: name }));
      setFlagged((f) => ({ ...f, grade: false }));
      setPicking(true);
    },
  }));

  // The seal's 3D scene (its own WebGL context) is only built as the letter comes
  // near, so the rest of the page runs on a single context
  useEffect(() => {
    let press = null;
    const onResize = () => press?.resize();
    const build = () => {
      if (press) return;
      press = createSealPress(canvasRef.current, { reducedMotion: prefersReducedMotion() });
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

  const locked = phase !== 'letter';
  const grade = GRADES.find((g) => g.name === values.grade);

  const update = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    // a flagged blank clears itself as soon as it's filled in properly
    if (flagged[name] && !problemsIn(next)[name]) setFlagged((f) => ({ ...f, [name]: false }));
  };

  // A fresh sheet unrolls across the page, as the first one did as you arrived
  const unrollFresh = async () => {
    const frame = frameRef.current;
    const start = performance.now();
    const MS = 1700;
    frame.style.setProperty('--unroll', '0');
    paperRef.current.style.visibility = '';
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

  const startFresh = (keep, sent) => {
    setValues(keep);
    setFlagged({});
    setPicking(Boolean(keep.grade));
    if (sent) setReceipt(sent);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (locked) return;
    const problems = problemsIn(values);
    const first = Object.keys(problems).find((k) => problems[k]);
    if (first) {
      setFlagged(problems);
      if (first === 'grade') {
        if (GRADE_STYLE === 'a') { setPicking(true); pickRef.current?.focus(); }
        else document.querySelector('.alloc__grade input')?.focus();
      } else fieldRefs.current[first]?.focus();
      return;
    }
    setFlagged({});
    document.activeElement?.blur();
    const sent = { kind: grade?.warrant ? 'register' : 'received', values, reference: makeReference() };

    if (prefersReducedMotion()) {
      startFresh(EMPTY, sent);
      setTimeout(() => receiptRef.current?.focus({ preventScroll: true }), 50);
      return;
    }

    setPhase('sending');
    await nextFrame(); // the buttons and fields settle into their locked look before they're copied
    const fold = createFold({ frame: frameRef.current, paper: paperRef.current, letter: letterRef.current, layer: layerRef.current });
    paperRef.current.style.visibility = 'hidden'; // the copies take its place
    await fold.fold();

    // the seal comes down on the middle of the folded letter
    const canvas = canvasRef.current;
    canvas.style.left = `${fold.center.x - canvas.offsetWidth / 2}px`;
    canvas.style.top = `${fold.center.y - canvas.offsetHeight / 2}px`;
    canvas.classList.add('is-on');
    await wait(150);
    await pressRef.current?.press();
    await wait(400);

    await fold.away([canvas]);
    fold.clear([canvas]);
    canvas.classList.remove('is-on');
    pressRef.current?.reset();

    startFresh(EMPTY, sent);
    await nextFrame();
    await unrollFresh();
    setPhase('letter');
    receiptRef.current?.focus({ preventScroll: true });
  };

  // "Request House Select instead": the same letter again, with the grade changed
  const offer = () => {
    startFresh({ ...receipt.values, grade: 'House Select' });
    setReceipt(null);
    setTimeout(() => fieldRefs.current.name?.focus({ preventScroll: true }), 50);
  };

  const hand = (name) => ({
    ref: (el) => { fieldRefs.current[name] = el; },
    value: values[name],
    onChange: (e) => update(name, e.target.value),
    readOnly: locked,
  });

  const result = receipt && RESULTS[receipt.kind];
  const ticks = GRADE_STYLE === 'b';
  const showGrades = !ticks ? picking : true;

  const gradeChoices = (
    <fieldset
      id="alloc-grades"
      className={`alloc__grades alloc__grades--${GRADE_STYLE}${flagged.grade ? ' is-flagged' : ''}`}
      disabled={locked}
      aria-describedby="alloc-grade-note"
    >
      <legend className="sr-only">{ticks ? ALLOCATION_COPY.gradeLegendTick : ALLOCATION_COPY.gradeLegend}</legend>
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
            {ticks && (
              <span className="alloc__box" aria-hidden="true">
                <svg viewBox="0 0 28 24"><path d={TICK} pathLength="1" /></svg>
              </span>
            )}
            <span className="alloc__grade-name">{g.name}</span>
            <span className="alloc__purity">{g.purity}%</span>
            {!ticks && (
              <svg className="alloc__loop" viewBox="0 0 220 76" preserveAspectRatio="none" aria-hidden="true">
                <path d={LOOP} pathLength="1" />
              </svg>
            )}
          </label>
        ))}
      </div>
      <p className="alloc__grade-note" id="alloc-grade-note">
        {flagged.grade && ticks ? (
          <span className="alloc__hint">{FIELDS.grade.hintTick}</span>
        ) : grade?.warrant && !locked ? (
          <span className="alloc__hint">Imperial Reserve is allocated only to Houses holding a Melange Mercantile warrant. Without one, your request joins the waiting register.</span>
        ) : ticks ? (
          ALLOCATION_COPY.gradeLegendTick
        ) : (
          ALLOCATION_COPY.gradeLegend
        )}
      </p>
    </fieldset>
  );

  return (
    <section className={`alloc is-${phase}`} id="allocation" ref={sectionRef} aria-labelledby="alloc-title">
      <span className="alloc__anchor" ref={anchorRef} aria-hidden="true" />
      <div className="alloc__frame" ref={frameRef}>
        <div className="alloc__paper" ref={paperRef}>
          {/* when the grades open or a receipt is written the letter grows; it glides to its new centre */}
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

            {/* a note of the last letter sent, at the head of the fresh sheet */}
            {result && (
              <div className="alloc__receipt">
                <p className="alloc__receipt-label" ref={receiptRef} tabIndex={-1}>
                  {result.label} <span className="alloc__ref">Reference {receipt.reference}</span>
                </p>
                <p className="alloc__receipt-body">
                  {result.body(receipt.values)}
                  {result.offer && (
                    <>
                      {' '}
                      <button type="button" className="alloc__link" onClick={offer}>{result.offer}</button>
                    </>
                  )}
                </p>
              </div>
            )}

            <p className="alloc__salutation">{ALLOCATION_COPY.salutation}</p>

            {ticks && gradeChoices}

            {ticks ? (
              <p className="alloc__prose">
                I request an allocation of the grade ticked above, to be delivered to{' '}
                <span className="alloc__keep"><Blank name="destination" flagged={flagged.destination} inputProps={hand('destination')} /><span className="alloc__stop">,</span></span> with your reply sent to{' '}
                <span className="alloc__keep"><Blank name="email" flagged={flagged.email} inputProps={{ ...hand('email'), type: 'email', inputMode: 'email' }} /><span className="alloc__stop">.</span></span>
              </p>
            ) : (
              <>
                {/* the sentence breaks after the grade, so its choices open right beneath it */}
                <p className="alloc__prose">
                  I request an allocation of{' '}
                  <GradeBlank
                    value={values.grade}
                    flagged={flagged.grade}
                    open={picking}
                    locked={locked}
                    buttonRef={pickRef}
                    onToggle={() => setPicking((p) => !p)}
                  />
                  <span className="alloc__stop">,</span>
                </p>
                {showGrades && gradeChoices}
                <p className="alloc__prose">
                  to be delivered to{' '}
                  <span className="alloc__keep"><Blank name="destination" flagged={flagged.destination} inputProps={hand('destination')} /><span className="alloc__stop">,</span></span> with your reply sent to{' '}
                  <span className="alloc__keep"><Blank name="email" flagged={flagged.email} inputProps={{ ...hand('email'), type: 'email', inputMode: 'email' }} /><span className="alloc__stop">.</span></span>
                </p>
              </>
            )}

            {/* signature on the left; on the right, the place the seal goes, where you press to send */}
            <div className="alloc__close">
              <div className="alloc__sign">
                <p className="alloc__closing">{ALLOCATION_COPY.closing}</p>
                <Blank name="name" flagged={flagged.name} className="alloc__blank--signature" inputProps={{ ...hand('name'), autoComplete: 'organization' }} />
              </div>
              <div className="alloc__seal-spot">
                <button className="alloc__submit" type="submit" disabled={locked}>{ALLOCATION_COPY.submit}</button>
              </div>
            </div>
          </motion.form>
        </div>
        <div className="alloc__roll" aria-hidden="true" />
        {/* the folding letter and its seal are drawn here, over the sheet */}
        <div className="alloc__dispatch" ref={layerRef} aria-hidden="true">
          <canvas ref={canvasRef} className="alloc__seal-canvas" />
        </div>
        <p className="sr-only" role="status">{phase === 'sending' ? ALLOCATION_COPY.sealing : ''}</p>
      </div>
    </section>
  );
});

export default Allocation;
