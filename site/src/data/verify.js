// Verify a consignment: copy, code format, and the demo register.

export const VERIFY_COPY = {
  eyebrow: 'Verify',
  title: 'VERIFY A CONSIGNMENT',
  intro: 'Your consignment code is pressed into the wax seal and stamped on the sack tag and the certificate of origin.',
  label: 'Consignment code',
  placeholder: 'MM-000-Δ',
  hint: 'Codes are MM, three digits and a Greek letter, like MM-114-Δ. You can type D for Δ.',
  submit: 'Verify',
  checking: 'Consulting the Melange Mercantile ledger',
  noCode: "Don't have a code? Request an allocation",
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

export const REGISTER = {
  'MM-114-Δ': {
    status: 'active',
    basin: 'Imperial Basin',
    grade: 'Imperial Reserve',
    purity: '99.4%',
    sealed: '10,181 AG',
    mass: '12.480 kg',
    reference: '0X7F2A',
    custody: [
      { when: '10,181 AG · 06:14', what: 'Harvested', detail: 'Imperial Basin, crew 14' },
      { when: '10,181 AG · 19:40', what: 'Assayed', detail: 'Reference 0X7F2A · purity 99.4%' },
      { when: '10,181 AG · 22:05', what: 'Sealed by Melange Mercantile', detail: 'Seal MM-114-Δ' },
      { when: '10,182 AG · 03:30', what: 'Lifted to heighliner', detail: 'Guild heighliner, berth 7' },
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
    lapsedOn: '10,188 AG',
    custody: [
      { when: '10,176 AG · 05:50', what: 'Harvested', detail: 'Sihaya Ridge, crew 9' },
      { when: '10,176 AG · 17:12', what: 'Assayed', detail: 'Reference 0X5C19 · purity 97.1%' },
      { when: '10,176 AG · 21:40', what: 'Sealed by Melange Mercantile', detail: 'Seal MM-207-Σ' },
      { when: '10,188 AG · 00:00', what: 'Guarantee lapsed', detail: 'Twelve years after sealing' },
    ],
  },
};
