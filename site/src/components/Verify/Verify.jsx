import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { VERIFY_COPY, REGISTER, formatCode, isValidCode, isOffTrack } from '../../data/verify.js';
import './Verify.css';

const EASE = [0.16, 1, 0.3, 1];
const PRESS_MS = 1300;

const screen = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.35, ease: EASE } },
};

function Field({ label, value, mono }) {
  return (
    <div className="verify__field">
      <dt>{label}</dt>
      <dd className={mono ? 'is-mono' : undefined}>{value}</dd>
    </div>
  );
}

function Custody({ steps }) {
  return (
    <ol className="verify__custody" aria-label="Chain of custody">
      {steps.map((s) => (
        <li key={s.when}>
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
    const t = setTimeout(() => {
      if (state === 'entry') inputRef.current?.focus({ preventScroll: true });
      else headingRef.current?.focus({ preventScroll: true });
    }, 450);
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
    }, PRESS_MS);
  };

  const again = () => { setState('entry'); setShowHint(false); };

  return (
        <section className="verify" id="verify" ref={sectionRef} aria-label="Verify a consignment">
          <div className="verify__stage" aria-live="polite" aria-busy={state === 'checking'}>
            <AnimatePresence mode="wait">
              {(state === 'entry' || state === 'checking') && (
                <motion.form key="entry" className="verify__entry" onSubmit={onSubmit} noValidate {...screen}>
                  <p className="verify__eyebrow">{VERIFY_COPY.eyebrow}</p>
                  <h2 className="verify__title" id="verify-title">{VERIFY_COPY.title}</h2>
                  <p className="verify__intro">{VERIFY_COPY.intro}</p>

                  <div className="verify__control">
                    <label className="verify__label" htmlFor="verify-code">{VERIFY_COPY.label}</label>
                    <div className={`verify__input-wrap${state === 'checking' ? ' is-pressing' : ''}`}>
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
                        disabled={state === 'checking'}
                      />
                      {state === 'checking' && (
                        <span className="verify__press" aria-hidden="true">
                          <img src="/models/pillar.svg" alt="" />
                          <span className="verify__ripple" />
                        </span>
                      )}
                    </div>
                    <p id="verify-hint" className={`verify__hint${showHint ? ' is-shown' : ''}`}>
                      <span className="verify__hint-icon" aria-hidden="true">i</span>
                      {VERIFY_COPY.hint}
                    </p>
                  </div>

                  <button className="verify__submit" type="submit" disabled={state === 'checking'}>
                    {state === 'checking' ? VERIFY_COPY.checking : VERIFY_COPY.submit}
                  </button>
                  <p className="verify__demo">{VERIFY_COPY.demo}</p>
                </motion.form>
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
                        <Field label="Consignment" value={code} mono />
                        <Field label="Grade" value={record.grade} />
                        <Field label="Purity" value={record.purity} mono />
                        <Field label="Mass" value={record.mass} mono />
                        <Field label="Sealed" value={record.sealed} mono />
                        <Field label="Reference" value={record.reference} mono />
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
                        <Field label="Consignment" value={code} mono />
                        <Field label="Grade" value={record.grade} />
                        <Field label="Purity at sealing" value={record.purity} mono />
                        <Field label="Sealed" value={record.sealed} mono />
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
