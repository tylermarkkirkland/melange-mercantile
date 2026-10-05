import React from 'react';
import RollingNumber from '../RollingNumber/RollingNumber.jsx';
import { MELANGE } from '../../data/intro.js';
import './MelangeSection.css';

/**
 * The Melange: the vial (drawn in the WebGL scene) holds the centre;
 * the statement sits left and the consignment record rolls in on the right.
 */
export default function MelangeSection({ active }) {
  return (
    <section className="melange" id="melange" aria-labelledby="melange-title">
      <div className="melange__frame">
        <div className="melange__copy">
          <p className="melange__eyebrow">{MELANGE.eyebrow}</p>
          <h2 className="melange__headline" id="melange-title">
            {MELANGE.headline.map((line, i) => (
              <span key={line} className="melange__line" style={{ '--i': i }}>
                <span className="melange__line-inner">{line}</span>
              </span>
            ))}
          </h2>
          <p className="melange__body">{MELANGE.body}</p>
        </div>

        <div className="melange__record">
          <p className="melange__reference">{MELANGE.reference}</p>
          <dl className="melange__figures">
            {MELANGE.figures.map((f, i) => (
              <div key={f.label} className="melange__figure">
                <dt className="melange__figure-label">{f.label}</dt>
                <dd className="melange__figure-value">
                  <RollingNumber value={f.value} suffix={f.suffix} active={active} delay={150 + i * 160} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
