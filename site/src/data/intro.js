// Timeline for the arrival sequence, in milliseconds from first paint.
// The scene and the UI both read from here so they stay in step.
export const TIMELINE = {
  darkHold: 900, // pure black before any light
  sunRise: 4200, // how long the light takes to fully arrive
  wordmark: 5600, // MELANGE / MERCANTILE begins to resolve
  interface: 7600, // the rest of the UI fades in
};

// Jump straight to the settled state (skip button, reduced motion, ?t=final)
export const SETTLED_TIME = TIMELINE.interface + 3000;

export const CONTENT = {
  wordmarkTop: 'MELANGE',
  wordmarkBottom: 'MERCANTILE',
  statement: 'We source, authenticate, and seal the movement of melange across the Imperium.',
  verifyLink: 'Verify a consignment',
  menu: 'Menu',
  scrollCue: 'Scroll',
  skip: 'Skip intro',
};

// Brand tokens (mirrors the Melange Brand variables in Figma)
export const COLOR = {
  ink: '#000000',
  void: '#070A0C',
  chrome: '#CFCFD1',
  silverLight: '#AEAFB1',
  silver: '#98999B',
  pewter: '#858789',
  ember: '#E8822B',
  spice: '#C2410C',
  rust: '#9A3412',
  pale: '#F5E8D6',
};

// The Arrakis section that follows the landing
export const ARRAKIS = {
  eyebrow: 'Origin',
  headline: ['EVERY GRAM', 'BEGINS ON ARRAKIS'],
  body: 'Harvested in the deep desert, tested where it is found, and sealed before it ever leaves the planet.',
  stats: [
    { value: '4', label: 'Origin basins' },
    { value: '99.4', suffix: '%', label: 'Highest purity on record' },
    { value: '0', label: 'Seals broken in transit' },
  ],
  video: '/video/arrakis-1920.mp4',
  poster: '/video/arrakis-poster.jpg',
};

// The Melange: a sealed vial, turned slowly by scroll
export const MELANGE = {
  eyebrow: 'The Melange',
  headline: ['SEALED', 'AT ORIGIN'],
  body: 'Each consignment is drawn, tested and sealed under House warrant before it leaves the desert. What you receive is exactly what was found.',
  reference: 'Consignment MM-114-Δ',
  figures: [
    { label: 'Purity', value: '99.4', suffix: '%' },
    { label: 'Mass', value: '12.480', suffix: ' kg' },
    { label: 'Sealed', value: '10.181', suffix: ' AG' },
  ],
};

// Across the Imperium: the House in the world, panned sideways by scroll
export const GALLERY = {
  eyebrow: 'In the world',
  headline: ['ACROSS', 'THE IMPERIUM'],
  body: 'Wherever melange moves, the House moves with it.',
  items: [
    { src: '/photos/seal.webp', word: 'Sealed', line: 'Every consignment closed under House warrant.', alt: 'A black wax seal pressed with the House pillar beside a pewter seal stamp' },
    { src: '/photos/crate.webp', word: 'Shipped', line: 'Crated at origin. Opened only by the buyer.', alt: 'An iron-bound cargo crate marked Melange Mercantile in a desert hangar' },
    { src: '/photos/banner.webp', word: 'Honoured', line: 'Carried in the halls of the Great Houses.', alt: 'A black banner bearing the House pillar in a vast stone hall' },
    { src: '/photos/ship.webp', word: 'Flown', line: 'House vessels cross the deep desert.', alt: 'The hull of a House transport ship engraved with the pillar on a desert landing field' },
    { src: '/photos/tag.webp', word: 'Traced', line: 'Every sack tagged and accounted for.', alt: 'A pewter tag engraved with the pillar tied to a canvas sack of spice' },
  ],
};

// Influence opens on one full-bleed image: a House vessel arriving
export const ARRIVAL = {
  src: '/photos/arrival.webp',
  alt: 'A colossal House transport ship descends through hazy golden light over empty dunes as a line of robed figures waits below',
  eyebrow: 'Influence',
  headline: ['THE HOUSE', 'ARRIVES'],
  body: 'Trusted across the Imperium for our discretion, quality, and influence.',
};

// Menu: each entry scrolls to a settled moment in its section (in viewport heights)
// and shows a photograph behind the list on hover.
export const MENU = [
  { label: 'Arrival', at: 0, image: null },
  { label: 'Origin', at: 1.5, image: '/video/arrakis-poster.jpg' },
  { label: 'The Melange', at: 5.0, image: '/photos/tin.webp' },
  { label: 'The Imperium', at: 7.2, image: '/photos/seal.webp' },
  { label: 'Influence', at: 14.5, image: '/photos/arrival.webp' },
  { label: 'Allocation', action: 'allocation', image: '/photos/crate.webp' },
  { label: 'Verify', action: 'verify', image: '/photos/certificate.webp' },
];
