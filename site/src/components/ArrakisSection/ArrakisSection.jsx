import React from 'react';
import RollingNumber from '../RollingNumber/RollingNumber.jsx';
import { ARRAKIS } from '../../data/intro.js';
import './ArrakisSection.css';

/**
 * Origin: the planet (drawn in the WebGL scene) rises behind this copy.
 * The section is tall so the planet's turn can play out under a pinned frame.
 */
export default function ArrakisSection({ active }) {
  return (
    <section className="arrakis" id="arrakis" aria-labelledby="arrakis-title">
      <div className="arrakis__frame">
        <div className="arrakis__copy">
          <p className="arrakis__eyebrow">{ARRAKIS.eyebrow}</p>
          <h2 className="arrakis__headline" id="arrakis-title">
            {ARRAKIS.headline.map((line, i) => (
              <span key={line} className="arrakis__line" style={{ '--i': i }}>
                <span className="arrakis__line-inner">{line}</span>
              </span>
            ))}
          </h2>
          <p className="arrakis__body">{ARRAKIS.body}</p>
        </div>

        <dl className="arrakis__stats">
          {ARRAKIS.stats.map((s, i) => (
            <div key={s.label} className="arrakis__stat">
              <dt className="arrakis__stat-label">{s.label}</dt>
              <dd className="arrakis__stat-value">
                <RollingNumber value={s.value} suffix={s.suffix} active={active} delay={200 + i * 180} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
