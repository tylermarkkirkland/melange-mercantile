import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { VERIFY_COPY, CERTIFICATE, REGISTER, formatCode, isValidCode, isOffTrack } from '../../data/verify.js';
import './Verify.css';

const EASE = [0.16, 1, 0.3, 1];
const LOOKUP_MS = 2100; // the form leaves, a line draws under the code, then the answer arrives

// stages cross-fade, as the rest of the site does; nothing slides sideways
const screen = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.7, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.35, ease: EASE } },
};

const SPECIMENS = [
  { code: 'MM-114-Δ', note: 'active' },
  { code: 'MM-207-Σ', note: 'lapsed' },
  { code: 'MM-411-Δ', note: 'no record' },
];

function Arrow() {
  return <span className="verify__arrow" aria-hidden="true" />;
}

// One entry on the card: a printed label over a ruled line with the value on it
function Entry({ label, value, mono, i = 0 }) {
  return (
    <div className="cert__entry" style={{ '--i': i }}>
      <dt>{label}</dt>
      <dd className={mono ? 'is-mono' : undefined}>{value}</dd>
    </div>
  );
}

/**
 * The certificate of origin: a light card with a double-ruled border, the pillar
 * embossed at the head, the consignment's entries on ruled lines, the five hands
 * of The Passage signed in the ledger, and at the foot either the black wax seal
 * (guarantee active) or a stamp across it (guarantee lapsed).
 */
function Certificate({ code, record, lapsed }) {
  return (
    <div className={`cert${lapsed ? ' is-lapsed' : ''}`}>
      <header className="cert__head">
        <img className="cert__mark" src="/models/pillar.svg" alt="" aria-hidden="true" />
        <p className="cert__house">{CERTIFICATE.house}</p>
        <h3 className="cert__title">{CERTIFICATE.title}</h3>
        <p className="cert__attest">{CERTIFICATE.attest}</p>
      </header>

      <dl className="cert__entries">
        <Entry label="Consignment" value={code} mono i={0} />
        <Entry label="Grade" value={record.grade} i={1} />
        <Entry label="Basin" value={record.basin} i={2} />
        <Entry label={lapsed ? 'Purity at sealing' : 'Purity'} value={record.purity} mono i={3} />
        <Entry label="Mass" value={record.mass} mono i={4} />
        <Entry label="Assay reference" value={record.reference} mono i={5} />
      </dl>

      <section className="cert__ledger" aria-label={CERTIFICATE.ledger}>
        <p className="cert__ledger-title">{CERTIFICATE.ledger}</p>
        <ol>
          {record.ledger.map((row, i) => (
            <li key={row.step} style={{ '--i': i + 6 }}>
              <span className="cert__step">{row.step}</span>
              <span className="cert__what">{row.what}</span>
              <span className="cert__when">{row.when}</span>
              {row.hand
                ? <span className="cert__hand">{row.hand}</span>
                : <span className="cert__withheld">Name withheld</span>}
            </li>
          ))}
        </ol>
      </section>

      <footer className="cert__foot">
        <div className="cert__signature">
          <span className="cert__hand cert__hand--factor" aria-hidden="true">{CERTIFICATE.factor}</span>
          <span className="cert__role">
            <span className="sr-only">Signed {CERTIFICATE.factor}, </span>
            {CERTIFICATE.factorRole}
          </span>
        </div>

        {lapsed ? (
          <div className="cert__stamp">
            <span>Guarantee lapsed</span>
            <span className="cert__stamp-date">{record.guaranteeUntil}</span>
          </div>
        ) : (
          <div className="cert__sealed">
            <img className="cert__seal" src="/photos/wax-seal.webp" alt="Black wax seal pressed with the Melange Mercantile pillar" />
            <p className="cert__status">
              <span className="cert__diamond" aria-hidden="true" />
              Guarantee active
            </p>
            <p className="cert__until">Until {record.guaranteeUntil}</p>
          </div>
        )}
      </footer>
    </div>
  );
}

/**
 * Verify a consignment. One calm input; malformed codes get an inline hint
 * (never a page change); the lookup is a short moment with the code alone; a
 * genuine code returns its certificate of origin, and an unknown one a dignified
 * "no record" with a way forward.
 */
const Verify = forwardRef(function Verify({ onResult, onRequestAllocation }, ref) {
  const [code, setCode] = useState('');
  const [state, setState] = useState('entry'); // entry | checking | active | lapsed | notfound
  const [showHint, setShowHint] = useState(false);
  const reduced = useReducedMotion();
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
    // wait for the previous stage to fade out and this one to mount
    const t = setTimeout(() => {
      if (state === 'entry') inputRef.current?.focus({ preventScroll: true });
      else headingRef.current?.focus({ preventScroll: true });
    }, 700);
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
    }, reduced ? 600 : LOOKUP_MS);
  };

  const again = () => { setState('entry'); setShowHint(false); };

  // the card rises a little as it's laid on the page
  const card = reduced
    ? {}
    : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0, transition: { duration: 1.1, ease: EASE, delay: 0.15 } } };

  return (
    <section className="verify" id="verify" ref={sectionRef} aria-label="Verify a consignment">
      <div className="verify__stage" aria-live="polite" aria-busy={state === 'checking'}>
        <AnimatePresence mode="wait">
          {state === 'entry' && (
            <motion.form key="entry" className="verify__entry" onSubmit={onSubmit} noValidate {...screen}>
              <p className="verify__eyebrow">{VERIFY_COPY.eyebrow}</p>
              <h2 className="verify__title" id="verify-title">
                {VERIFY_COPY.headline.map((line) => <span key={line}>{line}</span>)}
              </h2>
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

              <button className="verify__action" type="submit">
                {VERIFY_COPY.submit}
                <Arrow />
              </button>

              <p className="verify__specimens">
                <span className="verify__specimens-label">{VERIFY_COPY.specimens}</span>
                {SPECIMENS.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    className="verify__specimen"
                    onClick={() => { setCode(d.code); setShowHint(false); inputRef.current?.focus(); }}
                    aria-label={`Fill in ${d.code} (${d.note})`}
                  >
                    <span className="verify__specimen-code">{d.code}</span>
                    <span className="verify__specimen-note">{d.note}</span>
                  </button>
                ))}
              </p>

              <button type="button" className="verify__link verify__no-code" onClick={() => onRequestAllocation?.()}>
                {VERIFY_COPY.noCode}
              </button>
            </motion.form>
          )}

          {state === 'checking' && (
            <motion.div key="checking" className="verify__checking" {...screen} role="status">
              <p className="verify__eyebrow">{VERIFY_COPY.checking}</p>
              <p className="verify__checking-code">{code}</p>
              <span className="verify__checking-line" aria-hidden="true" />
            </motion.div>
          )}

          {(state === 'active' || state === 'lapsed') && record && (
            <motion.article key={state} className="verify__result" {...screen} aria-labelledby="verify-result">
              <header className="verify__result-head">
                <p className="verify__eyebrow">{VERIFY_COPY.eyebrow} · {code}</p>
                <h2 id="verify-result" ref={headingRef} tabIndex={-1} className="verify__result-title">
                  {state === 'active'
                    ? <><span>GENUINE AND</span> <span>GUARANTEED</span></>
                    : <><span>GENUINE, NO LONGER</span> <span>GUARANTEED</span></>}
                </h2>
                {state === 'lapsed' && (
                  <p className="verify__intro">
                    Its twelve-year guarantee lapsed in {record.guaranteeUntil}, so we no longer vouch for its condition.
                  </p>
                )}
              </header>

              <motion.div className="verify__card" {...card}>
                <Certificate code={code} record={record} lapsed={state === 'lapsed'} />
              </motion.div>

              <div className="verify__actions">
                {state === 'active' ? (
                  <button type="button" className="verify__action" onClick={() => window.print()}>
                    Print certificate
                  </button>
                ) : (
                  <button type="button" className="verify__action" onClick={() => onRequestAllocation?.(record.grade)}>
                    Request a fresh allocation
                    <Arrow />
                  </button>
                )}
                <button type="button" className="verify__link" onClick={again}>Verify another code</button>
              </div>
            </motion.article>
          )}

          {state === 'notfound' && (
            <motion.div key="notfound" className="verify__notfound" {...screen}>
              <p className="verify__eyebrow">{VERIFY_COPY.eyebrow}</p>
              <h2 ref={headingRef} tabIndex={-1} className="verify__result-title">NO RECORD FOUND</h2>
              <p className="verify__echo" aria-label={`You searched ${code}`}>{code}</p>
              <p className="verify__intro">
                This code isn't in the Melange Mercantile ledger. It may have been mistyped, or the
                consignment wasn't sealed by us. If it came to you as our melange, we would like to&nbsp;hear&nbsp;of&nbsp;it.
              </p>
              <div className="verify__actions is-centered">
                <button type="button" className="verify__action" onClick={again}>
                  Check the code again
                  <Arrow />
                </button>
                <a className="verify__link" href="mailto:ledger@melangemercantile.com?subject=Unrecognised%20consignment">
                  Tell us where it came from
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* what "Print certificate" prints: a still copy of the card, straight under <body>
          so it lays out on the page on its own and flows onto a second sheet if need be */}
      {(state === 'active' || state === 'lapsed') && record && createPortal(
        <div className="verify-print" aria-hidden="true">
          <Certificate code={code} record={record} lapsed={state === 'lapsed'} />
        </div>,
        document.body,
      )}
    </section>
  );
});

export default Verify;
