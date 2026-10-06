// Timeline for the arrival sequence, in milliseconds from first paint.
// The scene and the UI both read from here so they stay in step.
export const TIMELINE = {
  darkHold: 350, // pure black before any light (a beat, not a wait)
  sunRise: 3400, // how long the light takes to fully arrive
  wordmark: 3600, // MELANGE / MERCANTILE begins to resolve, once the pillar is mostly lit
  interface: 5600, // the rest of the UI fades in
};

// Jump straight to the settled state (skip button, reduced motion, ?t=final)
export const SETTLED_TIME = TIMELINE.interface + 3000;

export const CONTENT = {
  wordmarkTop: 'MELANGE',
  wordmarkBottom: 'MERCANTILE',
  statement: 'A chartered, discreet source of melange for the Great Houses of the Imperium.',
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

// The Source: Arrakis, where every gram begins
export const ARRAKIS = {
  eyebrow: 'Arrakis',
  headline: ['EVERY GRAM', 'BEGINS ON ARRAKIS'],
  body: 'Melange is found on one world only. Our crews harvest it in four basins of the deep desert and assay it where it lies.',
  stats: [
    { value: '4', label: 'Basins under charter' },
    { value: '99.4', suffix: '%', label: 'Highest purity on record' },
    { value: '10,104', suffix: ' AG', label: 'Chartered since' },
  ],
  video: '/video/arrakis-1920.mp4',
  poster: '/video/arrakis-poster.jpg',
};

// The Melange: what it is and why it matters; the capsule is the specimen
export const MELANGE = {
  eyebrow: 'The Melange',
  headline: ['BEYOND', 'PRICE'],
  body: "It lengthens life, sharpens the mind, and lets the Guild's Navigators fold space. The Imperium runs on melange. The Great Houses keep it close.",
  specimen: { label: 'Shown', grade: 'Imperial Reserve', purity: '99.4', basin: 'Imperial Basin' },
};

// The Passage: the five hands that carry a consignment, in the order it travels,
// panned sideways by scroll
export const GALLERY = {
  eyebrow: 'The Passage',
  headline: ['FROM THE DEEP DESERT', 'TO YOUR HALL'],
  body: 'Five hands carry every consignment. Each one signs the ledger.',
  items: [
    { src: '/photos/seal.webp', word: 'Sealed', line: 'Assayed and sealed in wax where it was found.', alt: 'A black wax seal pressed with the Melange Mercantile pillar beside a pewter seal stamp' },
    { src: '/photos/tag.webp', word: 'Traced', line: 'Every sack tagged and entered in the ledger.', alt: 'A pewter tag engraved with the pillar tied to a canvas sack of melange' },
    { src: '/photos/crate.webp', word: 'Crated', line: 'Crated at origin. Opened only by the buyer.', alt: 'An iron-bound cargo crate marked Melange Mercantile in a desert hangar' },
    { src: '/photos/ship.webp', word: 'Lifted', line: 'Carried by our frigates to a Guild heighliner.', alt: 'The hull of a Melange Mercantile frigate engraved with the pillar on a desert landing field' },
    { src: '/photos/banner.webp', word: 'Received', line: 'Delivered to the halls of the Great Houses.', alt: 'A black banner bearing the Melange Mercantile pillar in a vast stone hall' },
  ],
};

// Discretion opens on one full-bleed image: a frigate arriving, its buyers waiting
export const ARRIVAL = {
  src: '/photos/arrival.webp',
  alt: 'A colossal Melange Mercantile frigate descends through hazy golden light over empty dunes as a line of robed figures waits below',
  eyebrow: 'Discretion',
  headline: ['NEVER', 'ANNOUNCED,', 'NEVER LATE'],
  body: 'Our ledger is open to CHOAM, and to no one else. Our clients are never named, and never need to be.',
  record: '0 seals broken in transit',
};

// Menu: each entry scrolls to a settled moment in its section (in viewport heights)
// and shows a photograph behind the list on hover.
export const MENU = [
  { label: 'Arrival', at: 0, image: null },
  { label: 'Arrakis', at: 1.5, image: '/video/arrakis-poster.jpg' },
  { label: 'The Melange', at: 5.0, image: '/photos/capsule.webp' },
  { label: 'The Reserve', at: 7.2, image: '/photos/reserve.webp' },
  { label: 'The Passage', at: 8.9, image: '/photos/seal.webp' },
  { label: 'Discretion', at: 15.8, image: '/photos/arrival.webp' },
  { label: 'Allocation', action: 'allocation', image: '/photos/crate.webp' },
  { label: 'Verify', action: 'verify', image: '/photos/certificate.webp' },
];
