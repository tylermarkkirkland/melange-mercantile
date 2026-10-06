// Request an allocation: the House has no "Buy Now". A sheet unrolls across the
// page, you write your request by hand, and it is sealed in wax.

export const ALLOCATION_COPY = {
  eyebrow: 'Allocation',
  title: 'REQUEST AN ALLOCATION',
  salutation: 'To the House of Melange Mercantile,',
  closing: 'Yours in trade,',
  submit: 'Seal and send',
  sealing: 'Sealing your letter…',
  gradeLegend: 'Circle one grade',
};

export const GRADES = [
  { name: 'Imperial Reserve', purity: '99.4%', warrant: true },
  { name: 'House Select', purity: '97.1%' },
  { name: 'Guild Standard', purity: '94.8%' },
  { name: 'Raw Harvest', purity: '88.2%' },
];

// Each handwritten blank. `caption` is printed under the line like a form;
// `hint` replaces it when the blank needs attention (guidance, never scolding).
export const FIELDS = {
  destination: {
    caption: 'World or port',
    placeholder: 'Caladan',
    hint: 'Add where it should be delivered',
  },
  email: {
    caption: 'Where the House may reply',
    placeholder: 'steward@atreides.house',
    hint: 'Add an address with an @ in it',
  },
  grade: {
    hint: 'Circle one of the four grades',
  },
  name: {
    caption: 'Your name or House',
    placeholder: 'House Atreides',
    hint: 'Sign with your name or House',
  },
};

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// A believable reference number for the reply
export const makeReference = () => `MM-REQ-${String(Math.floor(1000 + Math.random() * 8999))}`;

// The two answers, written onto the letter under the seal. Imperial Reserve is
// warrant-only, so without one the request is entered on the register instead:
// a waiting place, not a refusal.
export const RESULTS = {
  received: {
    label: 'Sealed and sent.',
    body: (r) => `A steward will review your request for ${r.grade} and reply to ${r.email} within seven days.`,
  },
  register: {
    label: 'Entered on the register.',
    body: (r) =>
      `Imperial Reserve is granted by warrant only, so ${r.name} is now on the Imperial register. The House will write to ${r.email} when an allocation opens.`,
    offer: 'Request House Select instead',
  },
};
