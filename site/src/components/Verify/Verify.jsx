import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { VERIFY_COPY, REGISTER, formatCode, isValidCode, isOffTrack } from '../../data/verify.js';
import './Verify.css';

const EASE = [0.16, 1, 0.3, 1];
const LOOKUP_MS = 2100; // form leaves, the seal draws, then the answer arrives

// each stage slides on from the right and leaves to the left
const screen = {
  initial: { opacity: 0, x: 48 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.9, ease: EASE } },
  exit: { opacity: 0, x: -48, transition: { duration: 0.45, ease: EASE } },
};

const DEMOS = [
  { code: 'MM-114-Δ', note: 'active' },
  { code: 'MM-207-Σ', note: 'lapsed' },
  { code: 'MM-411-Δ', note: 'no record' },
];

function Field({ label, value, mono, i = 0 }) {
  return (
    <div className="verify__field" style={{ '--i': i }}>
      <dt>{label}</dt>
      <dd className={mono ? 'is-mono' : undefined}>{value}</dd>
    </div>
  );
}

function Custody({ steps }) {
  return (
    <ol className="verify__custody" aria-label="Chain of custody">
      {steps.map((s, i) => (
        <li key={s.when} style={{ '--i': i + 3 }}>
          <span className="verify__when">{s.when}</span>
          <span className="verify__what">{s.what}</span>
          <span className="verify__detail">{s.detail}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Verify a consignment. One calm input; malformed codes get an inline hint
 * (never a page change); a real lookup sits under the seal-press moment; the
 * result is a certificate (active), an advisory (lapsed) or a dignified
 * "no record" with a way forward.
 */
const Verify = forwardRef(function Verify({ onResult }, ref) {
  const [code, setCode] = useState('');
  const [state, setState] = useState('entry'); // entry | checking | active | lapsed | notfound
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef(null);
  const headingRef = useRef(null);
  const timer = useRef(0);

  const record = REGISTER[code];
  const sectionRef = useRef(null);
  const prevState = useRef(state);

  // The page can focus the field after scrolling here ("Verify a consignment", the menu, #verify)
  useImperativeHandle(ref, () => ({
    section: sectionRef.current,
    focusInput: () => inputRef.current?.focus({ preventScroll: true }),
  }));

  useEffect(() => () => clearTimeout(timer.current), []);

  // After each result, bring the section's top back into view and move focus to
  // the heading so screen readers announce it. Only on a real change of state,
  // never on load, so the page never steals focus.
  useEffect(() => {
    if (prevState.current === state) return undefined;
    prevState.current = state;
    if (state === 'checking') return undefined;
    onResult?.(sectionRef.current);
    // wait for the previous stage to slide out and this one to mount
    const t = setTimeout(() => {
      if (state === 'entry') inputRef.current?.focus({ preventScroll: true });
      else headingRef.current?.focus({ preventScroll: true });
    }, 800);
    return () => clearTimeout(t);
  }, [state, onResult]);

  const onChange = (e) => {
    const next = formatCode(e.target.value);
    setCode(next);
    setShowHint(isOffTrack(next));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!isValidCode(code)) {
      setShowHint(true);
      inputRef.current?.focus();
      return;
    }
    setState('checking');
    timer.current = setTimeout(() => {
      const found = REGISTER[code];
      setState(found ? found.status : 'notfound');
    }, LOOKUP_MS);
  };

  const again = () => { setState('entry'); setShowHint(false); };

  return (
        <section className="verify" id="verify" ref={sectionRef} aria-label="Verify a consignment">
          <div className="verify__stage" aria-live="polite" aria-busy={state === 'checking'}>
            <AnimatePresence mode="wait">
              {state === 'entry' && (
                <motion.form key="entry" className="verify__entry" onSubmit={onSubmit} noValidate {...screen}>
                  <p className="verify__eyebrow">{VERIFY_COPY.eyebrow}</p>
                  <h2 className="verify__title" id="verify-title">{VERIFY_COPY.title}</h2>
                  <p className="verify__intro">{VERIFY_COPY.intro}</p>

                  <div className="verify__control">
                    <label className="verify__label" htmlFor="verify-code">{VERIFY_COPY.label}</label>
                    <div className="verify__input-wrap">
                      <input
                        ref={inputRef}
                        id="verify-code"
                        className="verify__input"
                        value={code}
                        onChange={onChange}
                        placeholder={VERIFY_COPY.placeholder}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck="false"
                        inputMode="text"
                        aria-describedby="verify-hint"
                        aria-invalid={showHint || undefined}
                      />
                      <span className="verify__underline" aria-hidden="true" />
                    </div>
                    <p id="verify-hint" className={`verify__hint${showHint ? ' is-shown' : ''}`}>
                      <span className="verify__hint-icon" aria-hidden="true">i</span>
                      {VERIFY_COPY.hint}
                    </p>
                  </div>

                  <button className="verify__submit" type="submit">
                    {VERIFY_COPY.submit}
                    <span className="verify__arrow" aria-hidden="true" />
                  </button>
                  <div className="verify__demo">
                    <span>Demo codes</span>
                    {DEMOS.map((d) => (
                      <button
                        key={d.code}
                        type="button"
                        className="verify__chip"
                        onClick={() => { setCode(d.code); setShowHint(false); inputRef.current?.focus(); }}
                        aria-label={`Fill in ${d.code} (${d.note})`}
                      >
                        {d.code} <em>{d.note}</em>
                      </button>
                    ))}
                  </div>
                </motion.form>
              )}

              {state === 'checking' && (
                <motion.div key="checking" className="verify__checking" {...screen} role="status">
                  <span className="verify__seal-ring" aria-hidden="true">
                    <svg viewBox="0 0 120 120">
                      <circle className="verify__ring-track" cx="60" cy="60" r="56" />
                      <circle className="verify__ring-draw" cx="60" cy="60" r="56" />
                    </svg>
                    <img src="/models/pillar.svg" alt="" />
                  </span>
                  <p className="verify__checking-label">{VERIFY_COPY.checking}</p>
                  <p className="verify__checking-code">{code}</p>
                </motion.div>
              )}

              {state === 'active' && record && (
                <motion.article key="active" className="verify__certificate" {...screen} aria-labelledby="verify-result">
                  <header className="verify__cert-head">
                    <img className="verify__seal" src="/models/pillar.svg" alt="" aria-hidden="true" />
                    <div>
                      <h2 id="verify-result" ref={headingRef} tabIndex={-1} className="verify__result-title">CERTIFIED RESERVE</h2>
                      <p className="verify__eyebrow">House register · {record.basin}</p>
                    </div>
                  </header>
                  <div className="verify__cert-body">
                    <div>
                      <dl className="verify__fields">
                        <Field label="Consignment" value={code} mono i={0} />
                        <Field label="Grade" value={record.grade} i={1} />
                        <Field label="Purity" value={record.purity} mono i={2} />
                        <Field label="Mass" value={record.mass} mono i={3} />
                        <Field label="Sealed" value={record.sealed} mono i={4} />
                        <Field label="Reference" value={record.reference} mono i={5} />
                      </dl>
                      <p className="verify__status is-active">
                        <span className="verify__diamond" aria-hidden="true" />
                        Warrant active
                      </p>
                    </div>
                    <Custody steps={record.custody} />
                  </div>
                  <div className="verify__actions">
                    <button type="button" className="verify__button" onClick={() => window.print()}>Print certificate</button>
                    <button type="button" className="verify__link" onClick={again}>Verify another code</button>
                  </div>
                </motion.article>
              )}

              {state === 'lapsed' && record && (
                <motion.article key="lapsed" className="verify__certificate is-lapsed" {...screen} aria-labelledby="verify-result">
                  <header className="verify__cert-head">
                    <img className="verify__seal" src="/models/pillar.svg" alt="" aria-hidden="true" />
                    <div>
                      <h2 id="verify-result" ref={headingRef} tabIndex={-1} className="verify__result-title">RECORD FOUND</h2>
                      <p className="verify__eyebrow">House register · {record.basin}</p>
                    </div>
                  </header>
                  <p className="verify__advisory">
                    This consignment is genuine and was sealed by the House. Its warrant lapsed on {record.lapsedOn},
                    so the House no longer guarantees its condition. Nothing is wrong with the record itself.
                  </p>
                  <div className="verify__cert-body">
                    <div>
                      <dl className="verify__fields">
                        <Field label="Consignment" value={code} mono i={0} />
                        <Field label="Grade" value={record.grade} i={1} />
                        <Field label="Purity at sealing" value={record.purity} mono i={2} />
                        <Field label="Sealed" value={record.sealed} mono i={3} />
                      </dl>
                      <p className="verify__status is-lapsed">
                        <span className="verify__diamond" aria-hidden="true" />
                        Warrant lapsed · {record.lapsedOn}
                      </p>
                    </div>
                    <Custody steps={record.custody} />
                  </div>
                  <div className="verify__actions">
                    <a className="verify__button" href="mailto:register@melange.house?subject=Re-sealing%20request">Ask the House to re-seal</a>
                    <button type="button" className="verify__link" onClick={again}>Verify another code</button>
                  </div>
                </motion.article>
              )}

              {state === 'notfound' && (
                <motion.div key="notfound" className="verify__notfound" {...screen}>
                  <img className="verify__mark-dim" src="/models/pillar.svg" alt="" aria-hidden="true" />
                  <h2 ref={headingRef} tabIndex={-1} className="verify__result-title">NO RECORD FOUND</h2>
                  <p className="verify__intro">
                    This code isn't in the House register. It may have been mistyped, or the consignment
                    wasn't sealed by Melange Mercantile.
                  </p>
                  <div className="verify__echo">
                    <span className="verify__label">You searched</span>
                    <span className="verify__echo-code">{code}</span>
                  </div>
                  <div className="verify__actions is-centered">
                    <button type="button" className="verify__button is-primary" onClick={again}>Check the code again</button>
                    <a className="verify__button" href="mailto:register@melange.house?subject=Unrecognised%20consignment">Contact the House</a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
  );
});

export default Verify;
