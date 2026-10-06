// Request an allocation: Melange Mercantile has no "Buy Now". A sheet unrolls across the
// page, you write your request by hand, and it is sealed in wax.

export const ALLOCATION_COPY = {
  title: 'REQUEST AN ALLOCATION',
  salutation: 'To the Factors of Melange Mercantile,',
  closing: 'Yours in trade,',
  submit: 'Seal and send',
  sealing: 'Sealing your letter…',
  gradeLegend: 'Circle one grade',
};

// the grades themselves live in data/reserve.js
export { GRADES } from './reserve.js';

// Each handwritten blank. `caption` is printed under the line like a form;
// `hint` replaces it when the blank needs attention (guidance, never scolding).
export const FIELDS = {
  destination: {
    caption: 'World or port',
    placeholder: 'Caladan',
    hint: 'Add where it should be delivered',
  },
  email: {
    caption: 'Where your reply should go',
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

// The two answers, written onto the letter as a postscript. Imperial Reserve is
// for warrant holders only, so without one the request joins the waiting
// register instead: a waiting place, not a refusal.
export const RESULTS = {
  received: {
    label: 'Sealed and sent.',
    body: (r) => `A factor of Melange Mercantile will review your request for ${r.grade} and reply to ${r.email} within seven days.`,
  },
  register: {
    label: 'Entered on the waiting register.',
    body: (r) =>
      `Imperial Reserve is allocated only to warrant holders, so ${r.name} is now on the waiting register. Melange Mercantile will write to ${r.email} when an allocation opens.`,
    offer: 'Request House Select instead',
  },
};
