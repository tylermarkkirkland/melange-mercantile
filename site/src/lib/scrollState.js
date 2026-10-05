// Scroll-driven values shared by the WebGL scene and the DOM.
// Everything is a 0..1 progress so timing lives in one place.
// Page layout (in viewport heights): Arrival 0–1, Arrakis 1–4.2, Melange 4.2–7.2, Gallery 7.2–13.5 (holds 7.2–8.0, then pans over 4.5), Arrival 13.5–16.1.
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// half linear, half smoothstep: soft ends without rushing the middle (peak speed 1.25×)
const easeSoft = (x) => 0.5 * x + 0.5 * x * x * (3 - 2 * x);

export const scrollState = {
  y: 0,
  dock: 0, // pillar travels from centre to the top-centre dock
  rise: 0, // the planet rises into frame
  scrub: 0, // the planet's rotation, tied to scroll
  copy: 0, // Arrakis headline and figures
  planetOut: 0, // the planet sinks away as the vial arrives
  vial: 0, // the vial rises into frame
  vialSpin: 0, // the vial turns as you scroll through the section
  vialCopy: 0, // Melange copy and figures
  vialOut: 0, // the capsule sinks away as the gallery arrives
  galleryIn: 0, // gallery title fades in
  gallery: 0, // the photo row pans sideways
  arrive: 0, // the arrival image opens to full bleed
  arriveCopy: 0, // its line settles in
  galleryLeaving: false, // the gallery's last photo scrolls up past the top bar
};

export function updateScrollState(y, vh) {
  const at = (start, length) => clamp01((y - vh * start) / (vh * length));
  scrollState.y = y;
  scrollState.dock = easeInOut(at(0, 0.85));
  scrollState.rise = easeInOut(at(0.25, 1.1));
  scrollState.scrub = at(0.4, 2.8);
  scrollState.copy = at(0.9, 0.5);
  scrollState.planetOut = easeInOut(at(3.1, 0.9));
  scrollState.vial = at(3.5, 1.2); // eased inside the capsule itself; the lamp comes on as it settles
  scrollState.vialSpin = at(3.8, 3.0);
  scrollState.vialCopy = at(4.5, 0.5);
  scrollState.vialOut = easeInOut(at(6.1, 0.8));
  scrollState.galleryIn = at(6.6, 0.5);
  // the gallery holds still for ~one screen of scroll, then pans with an eased start and finish
  scrollState.gallery = easeSoft(at(8.0, 4.5));
  scrollState.arrive = easeInOut(at(12.7, 1.4));
  scrollState.arriveCopy = at(13.9, 0.6);
  // the gallery unpins at 12.5 and has scrolled away by 13.5
  scrollState.galleryLeaving = y >= vh * 12.45 && y < vh * 13.5;
  return scrollState;
}
