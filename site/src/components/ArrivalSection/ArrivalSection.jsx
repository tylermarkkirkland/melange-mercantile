import React from 'react';
import { ARRIVAL } from '../../data/intro.js';
import './ArrivalSection.css';

/**
 * A single full-bleed moment: the image opens from a window to fill the
 * screen as you scroll (--arrive, 0 → 1), then one line settles in (--arrive-copy).
 */
export default function ArrivalSection() {
  return (
    <section className="arrival" id="discretion" aria-labelledby="arrival-title">
      <div className="arrival__frame">
        <div className="arrival__window">
          <img className="arrival__image" src={ARRIVAL.src} alt={ARRIVAL.alt} loading="lazy" decoding="async" />
        </div>
        <div className="arrival__copy">
          <p className="arrival__eyebrow">{ARRIVAL.eyebrow}</p>
          <h2 className="arrival__headline" id="arrival-title">
            {ARRIVAL.headline.map((line) => <span key={line}>{line}</span>)}
          </h2>
          <p className="arrival__body">{ARRIVAL.body}</p>
        </div>
      </div>
    </section>
  );
}
