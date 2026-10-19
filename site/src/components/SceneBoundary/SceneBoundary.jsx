import React from 'react';
import './SceneBoundary.css';

/**
 * Keeps the site standing when the 3D scene can't run: if the browser refuses a
 * WebGL context (blocked, out of contexts, no GPU), the scene's error stops here
 * instead of taking the whole page down, and a still stands in for it: the pillar
 * on black, fading as it would dock. Every chapter's words, photographs, the letter
 * and Verify carry on as normal.
 *
 * React only catches render errors in class components, so this is the one class
 * in the project.
 */
export default class SceneBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('Melange Mercantile: the 3D scene could not start, showing a still instead.', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="scene-fallback" aria-hidden="true">
        <img className="scene-fallback__mark" src="/models/logo-chrome.svg" alt="" />
      </div>
    );
  }
}
