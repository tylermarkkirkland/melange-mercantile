// Lighting for the landing pillar. Open the page with ?controls to tune these
// live, then use "Copy values" and paste the result over this object.
export const LIGHTING = {
  // the sun: a fixed directional light from the upper left
  keyX: -6,
  keyY: 3.5,
  keyZ: 6.9,
  keyIntensity: 8.9,
  // a fixed warm patch of sun near the pillar; tilting the pillar moves the highlight
  glintX: -0.8,
  glintY: 0.2, // relative to the pillar's centre
  glintZ: 2.55,
  glintIntensity: 3,
  // room reflections and finish
  environment: 0.76,
  roughness: 0.34,
  bloomStrength: 0.19,
  bloomThreshold: 0.96,
};
