import React from 'react';
import './RollingNumber.css';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * A figure whose digits roll up into place, like a mechanical counter.
 * Screen readers get the plain value.
 */
export default function RollingNumber({ value, suffix = '', active, delay = 0 }) {
  const chars = (value + suffix).split('');
  return (
    <span className="rolling" aria-label={value + suffix} role="text">
      {chars.map((ch, i) => {
        const isDigit = /\d/.test(ch);
        const style = { transitionDelay: `${delay + i * 90}ms` };
        if (!isDigit) {
          return (
            <span key={i} className={`rolling__static${active ? ' is-active' : ''}`} style={style} aria-hidden="true">
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          );
        }
        return (
          <span key={i} className="rolling__window" aria-hidden="true">
            <span
              className="rolling__column"
              style={{ ...style, transform: `translateY(${active ? -Number(ch) * 10 : 0}%)` }}
            >
              {DIGITS.map((d) => <span key={d} className="rolling__digit">{d}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}
