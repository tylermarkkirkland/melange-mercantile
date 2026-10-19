// Verify a consignment: copy, code format, and the demo register.

export const VERIFY_COPY = {
  eyebrow: 'Verify',
  headline: ['EVERY CONSIGNMENT', 'ON THE LEDGER'],
  intro: "Your consignment code is engraved on the container's tag and printed on the certificate of origin.",
  label: 'Consignment code',
  placeholder: 'MM-000-Δ',
  hint: 'Codes are MM, three digits and a Greek letter, like MM-114-Δ. You can type D for Δ.',
  submit: 'Verify',
  specimens: 'Try a specimen code',
  checking: 'Consulting the Melange Mercantile ledger',
  noCode: "Don't have a code? Request an allocation",
};

// The certificate of origin: printed words on the card
export const CERTIFICATE = {
  house: 'Melange Mercantile',
  title: 'CERTIFICATE OF ORIGIN',
  attest:
    'This certifies that the consignment below was assayed and sealed by Melange Mercantile where it was found, and carried by five hands, each of whom signed the ledger.',
  ledger: 'Signed in the ledger',
  factor: 'A. Sarth',
  factorRole: 'Factor of the ledger',
};

// Letters people can actually type, mapped to the Greek suffixes Melange Mercantile uses
const GREEK = { D: 'Δ', S: 'Σ', L: 'Λ', P: 'Π', O: 'Ω', F: 'Φ', G: 'Γ', Y: 'Ψ', X: 'Ξ' };
const SUFFIXES = 'ΔΣΛΠΩΦΓΨΞ';

/** Tidy whatever was typed into MM-000-Δ shape, as far as it goes. */
export function formatCode(raw) {
  let s = raw.toUpperCase().replace(/[^A-Z0-9ΔΣΛΠΩΦΓΨΞ]/g, '');
  if (!s) return '';
  if (s.startsWith('MM')) s = s.slice(2);
  else if (s === 'M') return 'M';
  else return s; // not a Melange Mercantile code at all: leave it as typed so the hint can explain
  const digits = s.match(/^\d{0,3}/)[0];
  let rest = s.slice(digits.length);
  let out = 'MM';
  if (digits.length || rest.length) out += '-' + digits;
  if (digits.length === 3 && rest.length) {
    const ch = rest[0];
    out += '-' + (GREEK[ch] || ch);
  }
  return out;
}

export const isValidCode = (code) => new RegExp(`^MM-\\d{3}-[${SUFFIXES}]$`).test(code);

/** True when what's typed so far can't become a valid code (show the hint early). */
export function isOffTrack(code) {
  if (!code) return false;
  if (isValidCode(code)) return false;
  if (/^M{1,2}$|^MM-\d{0,3}$/.test(code)) return false;
  return true;
}

// The demo register. Each ledger follows the five hands of The Passage.
export const REGISTER = {
  'MM-114-Δ': {
    status: 'active',
    basin: 'Imperial Basin',
    grade: 'Imperial Reserve',
    purity: '99.4%',
    sealed: '10,181 AG',
    mass: '12.480 kg',
    reference: '0X7F2A',
    guaranteeUntil: '10,193 AG',
    ledger: [
      { step: 'Sealed', when: '10,181 AG · 22:05', what: 'Assayed at 99.4% and sealed in wax, Imperial Basin', hand: 'I. Thane' },
      { step: 'Traced', when: '10,181 AG · 23:40', what: 'Container tagged MM-114-Δ and entered in the ledger', hand: 'M. Halvar' },
      { step: 'Crated', when: '10,182 AG · 01:15', what: 'Crated at origin, seal intact', hand: 'R. Oduya' },
      { step: 'Lifted', when: '10,182 AG · 03:30', what: 'Carried by frigate to a Guild heighliner, berth 7', hand: 'K. Vell' },
      { step: 'Received', when: '10,182 AG · 19:20', what: "Delivered to the client's hall", hand: null },
    ],
  },
  'MM-207-Σ': {
    status: 'lapsed',
    basin: 'Sihaya Ridge',
    grade: 'House Select',
    purity: '97.1%',
    sealed: '10,176 AG',
    mass: '8.200 kg',
    reference: '0X5C19',
    guaranteeUntil: '10,188 AG',
    ledger: [
      { step: 'Sealed', when: '10,176 AG · 21:40', what: 'Assayed at 97.1% and sealed in wax, Sihaya Ridge', hand: 'I. Thane' },
      { step: 'Traced', when: '10,176 AG · 22:55', what: 'Container tagged MM-207-Σ and entered in the ledger', hand: 'M. Halvar' },
      { step: 'Crated', when: '10,177 AG · 00:30', what: 'Crated at origin, seal intact', hand: 'R. Oduya' },
      { step: 'Lifted', when: '10,177 AG · 02:10', what: 'Carried by frigate to a Guild heighliner, berth 3', hand: 'K. Vell' },
      { step: 'Received', when: '10,177 AG · 16:45', what: "Delivered to the client's hall", hand: null },
    ],
  },
};
