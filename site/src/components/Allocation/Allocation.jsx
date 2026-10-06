import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ALLOCATION_COPY, FIELDS, GRADES, RESULTS, isEmail, makeReference } from '../../data/allocation.js';
import { createSealPress } from './sealPress.js';
import './Allocation.css';

const EMPTY = { destination: '', email: '', grade: '', name: '' };

const problemsIn = (v) => ({
  destination: !v.destination.trim(),
  email: !isEmail(v.email),
  grade: !v.grade,
  name: !v.name.trim(),
});

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// An ink loop drawn around the chosen grade, a little uneven like a real pen
const LOOP = 'M 12 34 C 8 14, 60 4, 118 6 C 176 8, 214 18, 210 38 C 206 60, 150 70, 98 68 C 46 66, 6 58, 10 36 C 12 26, 30 18, 52 14';

/**
 * Request an allocation. As the section arrives a sheet unrolls across the page
 * (scroll drives --unroll from App). The request is a letter: printed in the
 * House's hand, filled in by yours. Sending pools rust wax at the signature and
 * a silver stamp presses the House pillar into it.
 */
const Allocation = forwardRef(function Allocation(props, ref) {
  const reduced = useReducedMotion();
  const [values, setValues] = useState(EMPTY);
  const [flagged, setFlagged] = useState({});
  const [state, setState] = useState('letter'); // letter | sealing | received | register
  const [reference, setReference] = useState('');
  const sectionRef = useRef(null);
  const anchorRef = useRef(null);
  const canvasRef = useRef(null);
  const pressRef = useRef(null);
  const resultRef = useRef(null);
  const fieldRefs = useRef({});

  // the page scrolls to the anchor (the moment the sheet is fully open), not the section top
  useImperativeHandle(ref, () => ({
    section: anchorRef.current,
    focusInput: () => fieldRefs.current.destination?.focus({ preventScroll: true }),
  }));

  useEffect(() => {
    const press = createSealPress(canvasRef.current, { reducedMotion: prefersReducedMotion() });
    pressRef.current = press;
    if (import.meta.env.DEV) window.__sealPress = press; // poseAt(ms) for reviewing frames
    const onResize = () => press.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      press.dispose();
    };
  }, []);

  // announce the answer once it's written onto the letter
  useEffect(() => {
    if (state === 'received' || state === 'register') resultRef.current?.focus({ preventScroll: true });
  }, [state]);

  const locked = state !== 'letter';
  const grade = GRADES.find((g) => g.name === values.grade);

  const update = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    // a flagged blank clears itself as soon as it's filled in properly
    if (flagged[name] && !problemsIn(next)[name]) setFlagged((f) => ({ ...f, [name]: false }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (locked) return;
    const problems = problemsIn(values);
    const first = Object.keys(problems).find((k) => problems[k]);
    if (first) {
      setFlagged(problems);
      (first === 'grade' ? document.querySelector('.alloc__grade input') : fieldRefs.current[first])?.focus();
      return;
    }
    setFlagged({});
    document.activeElement?.blur();
    setReference(makeReference());
    setState('sealing');
    await pressRef.current?.press();
    setState(grade?.warrant ? 'register' : 'received');
  };

  const begin = (keep) => {
    pressRef.current?.reset();
    setValues(keep);
    setState('letter');
    setTimeout(() => fieldRefs.current.destination?.focus({ preventScroll: true }), 50);
  };

  const hand = (name) => ({
    ref: (el) => { fieldRefs.current[name] = el; },
    value: values[name],
    onChange: (e) => update(name, e.target.value),
    readOnly: locked,
  });

  const result = RESULTS[state];

  return (
    <section className={`alloc is-${state}`} id="allocation" ref={sectionRef} aria-labelledby="alloc-title">
      <span className="alloc__anchor" ref={anchorRef} aria-hidden="true" />
      <div className="alloc__frame">
        <div className="alloc__paper">
          {/* when the postscript is written the letter grows; it glides to its new centre rather than jumping */}
          <motion.form
            layout="position"
            transition={{ duration: reduced ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="alloc__letter"
            onSubmit={onSubmit}
            noValidate
          >
            <header className="alloc__head">
              <h2 className="alloc__title" id="alloc-title">{ALLOCATION_COPY.title}</h2>
              <span className="alloc__flourish" aria-hidden="true"><i /></span>
            </header>

            <p className="alloc__salutation">{ALLOCATION_COPY.salutation}</p>
            <p className="alloc__prose">
              I request an allocation of the grade circled below, to be delivered to{' '}
              <Blank name="destination" flagged={flagged.destination} inputProps={hand('destination')} />
              <span className="alloc__stop">,</span> with the House&rsquo;s reply sent to{' '}
              <Blank name="email" flagged={flagged.email} inputProps={{ ...hand('email'), type: 'email', inputMode: 'email' }} />
              <span className="alloc__stop">.</span>
            </p>

            {/* the grades as a printed "circle one" line, chosen with a loop of ink */}
            <fieldset className={`alloc__grades${flagged.grade ? ' is-flagged' : ''}`} disabled={locked} aria-describedby="alloc-grade-note">
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
                    <span className="alloc__grade-name">{g.name}</span>
                    <span className="alloc__purity">{g.purity}</span>
                    <svg className="alloc__loop" viewBox="0 0 220 76" preserveAspectRatio="none" aria-hidden="true">
                      <path d={LOOP} pathLength="1" />
                    </svg>
                  </label>
                ))}
              </div>
              <p className="alloc__grade-note" id="alloc-grade-note">
                {flagged.grade ? (
                  <span className="alloc__hint">{FIELDS.grade.hint}</span>
                ) : grade?.warrant && !locked ? (
                  <span className="alloc__hint">Imperial Reserve is granted by warrant only. Without one, your request joins the register.</span>
                ) : (
                  ALLOCATION_COPY.gradeLegend
                )}
              </p>
            </fieldset>

            {/* signature on the left; on the right, the place the seal goes, where you press to send */}
            <div className="alloc__close">
              <div className="alloc__sign">
                <p className="alloc__closing">{ALLOCATION_COPY.closing}</p>
                <Blank name="name" flagged={flagged.name} className="alloc__blank--signature" inputProps={{ ...hand('name'), autoComplete: 'organization' }} />
              </div>
              <div className="alloc__seal-spot">
                <canvas ref={canvasRef} className="alloc__seal-canvas" aria-hidden="true" />
                {state === 'letter' && (
                  <button className="alloc__submit" type="submit">{ALLOCATION_COPY.submit}</button>
                )}
              </div>
              <div className="alloc__ps" aria-live="polite">
                {state === 'sealing' && <p className="alloc__sealing" role="status">{ALLOCATION_COPY.sealing}</p>}
                {result && (
                  <div className="alloc__result">
                    <div className="alloc__result-head">
                      <p className="alloc__result-label" ref={resultRef} tabIndex={-1}>
                        {result.label} <span className="alloc__ref">Reference {reference}</span>
                      </p>
                      <p className="alloc__result-actions">
                        {result.offer && (
                          <button type="button" className="alloc__link" onClick={() => begin({ ...values, grade: 'House Select' })}>
                            {result.offer}
                          </button>
                        )}
                        <button type="button" className="alloc__link" onClick={() => begin(EMPTY)}>Write another request</button>
                      </p>
                    </div>
                    <p className="alloc__result-body">{result.body(values)}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.form>
        </div>
        <div className="alloc__roll" aria-hidden="true" />
      </div>
    </section>
  );
});

export default Allocation;
