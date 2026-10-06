import React from 'react';
import RollingNumber from '../RollingNumber/RollingNumber.jsx';
import { MELANGE } from '../../data/intro.js';
import './MelangeSection.css';

/**
 * The Melange: the capsule (drawn in the WebGL scene) holds the centre; what
 * melange is sits left, and on the right a single specimen label names the grade
 * the capsule holds, handing off to The Reserve.
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
          <p className="melange__reference">{MELANGE.specimen.label}</p>
          <p className="melange__figure-value">
            <RollingNumber value={MELANGE.specimen.purity} suffix="%" active={active} delay={150} />
          </p>
          <p className="melange__grade">{MELANGE.specimen.grade}</p>
          <p className="melange__figure-label">{MELANGE.specimen.basin}</p>
        </div>
      </div>
    </section>
  );
}
