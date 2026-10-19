// The Reserve: the four grades Melange Mercantile offers. This is the one list of
// grades; the Allocation letter and Verify read their names and purities from here.

export const RESERVE = {
  eyebrow: 'The Reserve',
  headline: ['FOUR GRADES', 'ONE STANDARD'],
  intro: 'Every consignment is assayed and graded before it leaves Arrakis. Melange Mercantile offers four.',
  warrantNote: 'Imperial Reserve is allocated only to Houses holding a Melange Mercantile warrant. Warrants are extended, never applied for.',
  request: 'Request',
  image: '/photos/reserve.webp',
  alt: 'Four sealed glass vessels of melange stand in a row on black basalt in a dark stone vault, from glowing pure melange on the left to raw desert sand flecked with orange on the right',
};

// Finest to rawest, the same order as the vessels in the photograph, left to right
export const GRADES = [
  {
    name: 'Imperial Reserve',
    purity: '99.4',
    basin: 'Imperial Basin',
    line: "The Emperor's own grade, in every respect but the paperwork.",
    tag: 'By warrant',
    warrant: true,
  },
  {
    name: 'House Select',
    purity: '97.1',
    basin: 'Sihaya Ridge',
    line: 'The standing grade of the Great Houses. Pure enough for any House, short of the Emperor himself.',
    tag: 'Available',
  },
  {
    name: 'Guild Standard',
    purity: '94.8',
    basin: 'Hagga Basin',
    line: 'Navigation grade. Good enough for the Spacing Guild, who are not easily pleased.',
    tag: 'By volume',
  },
  {
    name: 'Raw Harvest',
    purity: '88.2',
    basin: 'Cielago Deep',
    line: 'Gathered from the open sand and sold before refining. For Houses that prefer to refine their own.',
    tag: 'By mass',
  },
];
