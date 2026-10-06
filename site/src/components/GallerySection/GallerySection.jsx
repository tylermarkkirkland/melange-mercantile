import React from 'react';
import { GALLERY } from '../../data/intro.js';
import './GallerySection.css';

/**
 * The Passage: a pinned frame where vertical scroll pans a row of
 * photographs sideways. Each photo drifts slightly inside its frame (parallax).
 * Progress comes from the --gallery CSS variable (0 → 1).
 */
export default function GallerySection() {
  return (
    <section className="gallery" id="passage" aria-labelledby="gallery-title">
      <div className="gallery__frame">
        <div className="gallery__track">
          <div className="gallery__intro">
            <p className="gallery__eyebrow">{GALLERY.eyebrow}</p>
            <h2 className="gallery__headline" id="gallery-title">
              {GALLERY.headline.map((line) => <span key={line}>{line}</span>)}
            </h2>
            <p className="gallery__body">{GALLERY.body}</p>
          </div>

          {GALLERY.items.map((item, i) => (
            <figure key={item.word} className="gallery__panel" style={{ '--i': i }}>
              <div className="gallery__window">
                <img className="gallery__image" src={item.src} alt={item.alt} loading="lazy" decoding="async" />
              </div>
              <figcaption className="gallery__caption">
                <span className="gallery__index">{String(i + 1).padStart(2, '0')}</span>
                <span className="gallery__word">{item.word}</span>
                <span className="gallery__line">{item.line}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
