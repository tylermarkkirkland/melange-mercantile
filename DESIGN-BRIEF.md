# Melange Mercantile — Website Design Brief

**Phase 5 (UX Application) of Tyler Kirkland's design growth project. Personal project — not FamilySearch
work, no FS components, no FS design system.**

This brief is **self-contained**. Everything needed to design the screens is here: brand, tokens, concept,
site map, flow, per-screen specs, content, and constraints. Companion file `BRAND.md` holds the build-level
detail (3D model, mesh generation, measured bundle weights) and is not required reading to design.

---

## 1. The brand

**Melange Mercantile** — *"Spice · Trade · Influence."*

A **fictional** Dune-inspired luxury house that sources, authenticates, and distributes melange across the
Imperium. Think CHOAM crossed with a Swiss private bank.

| | |
|---|---|
| **Purpose** | Enable the secure movement and stewardship of the Imperium's most valuable resource. |
| **Personality** | Prestigious · Authoritative · Sophisticated · Calculated · Elite |
| **Archetypes** | Ruler (power, authority, control) + Sage (knowledge, expertise) |
| **Competitors** | CHOAM, the Great Houses, independent spice brokers, Guild-affiliated traders |
| **Moodboard** | Dune cinematography · brutalist luxury · Rolex · Bentley · NASA mission control · Bloomberg Terminal · Swiss design · ancient empires · desert architecture |
| **Keywords** | monolithic · sacred · elite · timeless · ceremonial · strategic · mysterious |

**Feel:** cinematic, sleek, **Dune-desert-luxe futurism**. Restraint and authority.
**Explicitly NOT:** neon cyberpunk, glitch, techno-maximalism, startup-friendly, playful.

**Tone of voice:** understated and certain. The House does not sell, it *states*. Never exclamation marks,
never urgency, never "Get started today." Prefer "Trusted across the Imperium" over "The best spice."

---

## 2. The concept — and why it is not just a scroll page

The obvious move is a beautiful parallax marketing page. **Do not stop there.**

Phase 5 is graded on *"UX Design — clarity of flow, usability, hierarchy,"* and its deliverable is a **user
flow + 3–5 key screens + UX rationale**. A single scrolling page has no flow to evaluate. The cinematic
work gets credited under Craft and Visual System (and again in Phase 6); the UX criterion needs a real task.

**So the site is two things at once:**

1. **A cinematic brand surface** — the showpiece. Scroll-driven, restrained, one or two wow moments.
2. **One genuine functional flow** — *verify a consignment.*

**Why verification.** The brand is already an authentication business. Its own type specimen reads:

> ASSAY 0X7F2A · ARRAKIS BASIN · CONSIGNMENT **MM-114-Δ** · PURITY **99.4%** · WARRANT **ACTIVE**
> *"Every consignment is authenticated at origin and sealed under House warrant before transit."*

Verification is on-brand, it exercises all three typographic voices at once, it gives the single accent
colour a legitimate job (status), it produces real error and empty states, and it connects directly to the
Phase 6 applications already rendered (certificate of origin, wax seal). Real-world precedent exists —
watch, diamond and whisky brands all run "enter your certificate number" lookups. Study the *interaction
model*, not their styling; those pages are utilitarian. The contribution here is making the transaction
feel **ceremonial**.

---

## 3. Deliverables

**Required (the graded ask):**
- User-flow diagram
- 3–5 key screens
- Brief written rationale for the UX decisions

**Design these five screens:**

1. Arrival / hero
2. The Reserve (product)
3. Verify — entry
4. Verify — result (warrant active)
5. Verify — not found

Screen 5 is not optional. It is the one that demonstrates UX maturity and it is the one most people skip.

---

## 4. Site map

| Page | Job | Dominant voice |
|---|---|---|
| **Arrival** | Showpiece. 3D mark, drifting spice, minimal copy. | Ceremonial |
| **The Reserve** | The product: grades, purity tiers, origin basins. | Ceremonial → Operational |
| **Verify a Consignment** | The functional flow. | Operational + Data |
| **Trade & Influence** | House story, provenance network, the case for trust. | Operational |
| **Request Allocation** | Gated CTA. Elite houses do not have "Buy Now". | Ceremonial |

Persistent: a **side / sticky nav** with an active-section indicator. Cheap polish, and it orients the user
during long scroll sections.

---

## 5. The user flow (for the diagram)

```
ARRIVAL
   │
   ├──> THE RESERVE ──> REQUEST ALLOCATION ──> confirmation
   │
   └──> VERIFY A CONSIGNMENT
            │
         [entry: consignment code]
            │
            ├── valid + active ──> RESULT: warrant active
            │                         └──> download / print certificate
            │                         └──> request allocation
            │
            ├── valid + lapsed ──> RESULT: warrant lapsed  (advisory, not an error)
            │
            ├── not found ───────> NOT FOUND  ──> retry / contact the House
            │
            └── malformed ───────> inline validation, never a page change
```

**Flow rules**
- Malformed input is corrected **inline**, before submission. Never navigate to an error page for a typo.
- "Not found" is a **destination**, not an alert. It gets a designed screen with a way forward.
- "Lapsed" is **not** a failure state — it is a valid record with an expired warrant. Design it as
  information, not as an error. This distinction is the most interesting UX decision in the project;
  call it out in the rationale.

---

## 6. Screen specs

### 6.1 Arrival

**Job:** establish authority in three seconds. Say almost nothing.

- Full-bleed **Void `#070A0C`**. The 3D pillar mark, centred, slowly rotating, catching light.
- Spice particles drifting — sparse. This is the signature moment; it should read as *rationed*, like the
  palette.
- Wordmark set as live **Cinzel** text (the wordmark is not vector — do not attempt to draw it).
  `ceremonial/display` for MELANGE, `ceremonial/label` for SPICE · TRADE · INFLUENCE.
- One line of `operational/body-lg` beneath. Not a tagline — a statement of function.
- Scroll cue, minimal.

**Do not** put a nav bar full of links across the top. One mark, one line, one way down.

### 6.2 The Reserve

**Job:** present the product as graded, scarce, and certified.

- Section header in `ceremonial/title`.
- **Three or four grades** as a comparison set — see the content kit. Each shows: name (`ceremonial/heading`),
  origin basin (`operational/label`, caps), purity (`data/figure`), a one-line description
  (`operational/body`), and allocation status (`data/tag`).
- Purity figures are the hero data. Set them large in **IBM Plex Mono**, and let them carry the hierarchy.
- Grades differ by **value and label**, never by hue. Spice is not available as a categorical colour.

### 6.3 Verify — entry

**Job:** one input, one action, total calm. This is the most restrained screen in the site.

- Centred, generous vertical space. Basalt `#121A1F` panel on Void, or Void alone.
- `ceremonial/title`: **VERIFY A CONSIGNMENT**
- `operational/body`: one sentence explaining what the code is and where to find it (on the crate seal,
  the luggage tag, the certificate of origin — tie it to the physical Phase 6 applications).
- **One text input.** Monospace (`data/row`), generous target, visible focus ring in **Ember `#E8822B`**.
  Placeholder shows the format: `MM-000-Δ`.
- Primary action: a single button. Label it **Verify**, not "Submit."
- Below: a quiet link — "Don't have a code?" → Request Allocation.

**States to design:** empty (default) · focused · typing (valid format) · typing (malformed, inline hint) ·
submitting.

Inline validation copy must be **guidance, not scolding**: *"Consignment codes are three digits and a Greek
suffix — MM-114-Δ."* Never "Invalid input."

### 6.4 Verify — result (warrant active)

**Job:** make a database lookup feel like a sealed document being presented.

This is the screen where all three voices appear together. Treat it as a **certificate**, not a dashboard.

- Header: `ceremonial/heading` — **CERTIFIED RESERVE**
- Directly under it, `operational/label` caps: ASSAY · ORIGIN
- A rule (`metal/slate #1E2B33`), then the record:

| Field | Style | Example |
|---|---|---|
| Consignment | `data/row` | `MM-114-Δ` |
| Origin basin | `operational/title-sm` | Arrakis Basin |
| Assay reference | `data/row` | `0X7F2A` |
| Purity | `data/figure` | `99.4%` |
| Sealed | `data/row` | `10.181 AG` |
| Mass | `data/row` | `12.480 kg` |
| Warrant | `data/tag` + status | `ACTIVE` |

- **Warrant status is the only Ember on the page.** Per system rule 02, pair it with a label and a shape
  (a small mark or pill) — colour must never be the sole carrier.
- A **chain of custody**: 3–4 timestamped steps, origin → assay → seal → transit. Vertical, Plex Mono
  timestamps, Plex Sans descriptions. This is where the "provenance" idea becomes visible.
- Secondary actions: print / download certificate. **Make it print-friendly** — this is a document.

### 6.5 Verify — not found

**Job:** fail with dignity and give a way forward.

- Same ceremonial frame as the result screen, so the system feels consistent rather than broken.
- `ceremonial/heading`: **NO RECORD FOUND**
- `operational/body-lg`: explain plainly what it means — the code isn't in the register. Offer the two real
  possibilities: a mistyped code, or a consignment not sealed by this House.
- Echo the code they entered, in `data/row`, so they can see what was actually searched.
- Two ways forward: **check the code again** (returns to entry, pre-filled) and **contact the House**.
- **No red.** The palette has no error colour and does not need one. Rust `#9A3412` is a pigment and is
  forbidden as text on dark ground (rule 05). Convey failure through hierarchy and copy, not alarm colour.

---

## 7. Design system

### Colour — 13 tokens

**Ground** (cold, low chroma — ~85% of coverage)

| Token | Hex | Use |
|---|---|---|
| Ink | `#000000` | logo ground only |
| Void | `#070A0C` | page ground |
| Basalt | `#121A1F` | raised surface |
| Slate | `#1E2B33` | borders and rules |
| Ice | `#E9EEF0` | light ground |

**Metal** (sampled from the logotype — ~13%)

| Token | Hex | On Void | Use |
|---|---|---|---|
| Pewter dark | `#5B5B5C` | 2.9:1 | hairlines only — **never text** |
| Pewter | `#858789` | 5.5:1 AA | secondary text |
| Silver | `#98999B` | 7.0:1 AAA | body text |
| Silver light | `#AEAFB1` | 9.0:1 AAA | emphasis |
| Chrome | `#CFCFD1` | 12.8:1 AAA | headings, logo |

**Spice** (~2% — rationed)

| Token | Hex | On Void | Use |
|---|---|---|---|
| Rust | `#9A3412` | 2.7:1 | pigment — fills, seals, print, light grounds. **Never text on dark.** |
| Spice | `#C2410C` | 3.8:1 | large marks / large text only, never body |
| Ember | `#E8822B` | 7.2:1 AAA | **the only spice value allowed to carry meaning** |

### The six system rules (non-negotiable)

1. **Spice and metal never share an edge.** Every spice/metal pair falls between 1.0:1 and 3.3:1 — a ground always separates them.
2. **Spice never carries meaning on its own.** It is the only chroma; always pair with a shape, weight or label.
3. **Cinzel is capitals only and never below 24px.** Its hairlines break up on dark grounds at small sizes.
4. **Cinzel stays on the mark and ceremonial moments.** Plex carries the speaking voice.
5. **Rust never appears as text on a dark ground.**
6. **Coverage holds at roughly 85% ground / 13% metal / 2% spice.**

### Typography — 14 styles

All Google Fonts. Sizes follow **8 with 4 as a half-step**; line-heights are **pixel values on the 4px grid**.

**Ceremonial · Cinzel** — capitals only, 24px floor, wide tracking, never running text

| Style | Font | Size | Line-height | Tracking |
|---|---|---|---|---|
| `ceremonial/display` | Cinzel Regular | 72 | 80 | 12% |
| `ceremonial/title` | Cinzel Regular | 48 | 56 | 14% |
| `ceremonial/heading` | Cinzel Regular | 32 | 40 | 15% |
| `ceremonial/label` | Cinzel Bold | 24 | 32 | 18% |

**Operational · IBM Plex Sans** — everything read or acted on; sentence case

| Style | Font | Size | Line-height | Tracking |
|---|---|---|---|---|
| `operational/title-lg` | Medium | 32 | 40 | 0 |
| `operational/title` | Medium | 24 | 32 | 0 |
| `operational/title-sm` | Medium | 20 | 28 | 0 |
| `operational/body-lg` | Regular | **18** ★ | 32 | 0 |
| `operational/body` | Regular | 16 | 28 | 0 |
| `operational/body-sm` | Regular | **14** ★ | 24 | 0 |
| `operational/label` | Medium | 12 | 16 | 8% (caps) |

**Data · IBM Plex Mono** — anything a machine assigned: codes, figures, states

| Style | Font | Size | Line-height | Tracking |
|---|---|---|---|---|
| `data/figure` | Medium | 20 | 24 | 2% |
| `data/row` | Regular | 16 | 24 | 4% |
| `data/tag` | Medium | 12 | 16 | 16% (caps) |

★ The two sanctioned exceptions to the 8/4 grid — Plex needs 2pt steps through the reading sizes.

*Cormorant Garamond is held in reserve for one editorial moment on a light ground. Not yet a style.*

### Spacing — **proposed, not yet in Figma**

There is no spacing scale in the system today. Use the same 8/4 logic so it matches the type:

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192`

Prefer the 8-multiples. Section padding 96–192, component padding 16–32, related-element gaps 8–16.
**Flag whatever you settle on so it can be added to the Figma variable collection.**

---

## 8. Content kit (use this — do not invent competing lore)

**Origin basins:** Arrakis Basin · Sihaya Ridge · Hagga Rift · Cielago Deep

**Grades** (for The Reserve)

| Grade | Purity | Basin | Character |
|---|---|---|---|
| Imperial Reserve | 99.4% | Arrakis Basin | Highest assay. Allocation by warrant only. |
| House Select | 97.1% | Sihaya Ridge | The standing grade of the Great Houses. |
| Guild Standard | 94.8% | Hagga Rift | Navigation-grade. Volume consignment. |
| Raw Harvest | 88.2% | Cielago Deep | Unrefined. Sold by mass, sealed at origin. |

**Codes and formats**
- Consignment: `MM-114-Δ` (house prefix, three digits, Greek suffix)
- Assay reference: `0X7F2A`
- Mass: `12.480 kg`
- Sealed date: `10.181 AG` (After Guild)

**Warrant states:** `ACTIVE` · `LAPSED` · `SEALED` · `VOID`

**Sample sentences (house voice)**
- "Trusted across the Imperium for our discretion, quality, and influence."
- "Every consignment is authenticated at origin and sealed under House warrant before transit."
- "Allocation is extended by invitation and reviewed each cycle."

---

## 9. Motion

The scroll journey — one feeling per section: **Arrival / mystery → the melange reveal → trade & influence
→ restrained close.**

| Effect | Priority | Notes |
|---|---|---|
| Scroll reveals (`whileInView`, staggered) | High | ~60% of the premium feel for little effort |
| Text reveal (split to lines/words, mask) | High | Hero headings only |
| Parallax depth layers | High | The backbone |
| 3D mark — shine, slow spin, scroll-linked rotation | Showpiece | Asset exists, see §11 |
| Spice particles | Showpiece | The signature moment |
| Sticky side nav + active section | Medium | Orientation |
| ~~Glitch / datamosh~~ | **Dropped** | Reads cyberpunk, fights luxury |

**Restraint budget: 2–3 strong moments, lots of calm.** Over-animating reads amateur. Animate only
`transform` and `opacity`; anything else is a red flag.

---

## 10. Accessibility

The palette was built from measured contrast, and the Figma variable **scopes already encode the rules** —
the colour picker will not offer `pewter-dark` or `rust` as text colours. Respect that.

- Body text at Silver `#98999B` or lighter (7.0:1 AAA). Secondary at Pewter (5.5:1 AA) minimum.
- **Spice is the only chroma, so it can never be the sole carrier of meaning.** Always pair with a shape,
  weight, or label. This makes the system colourblind-safe — it separates on lightness alone.
- Full keyboard path through the verify flow; visible focus states (Ember ring). Keyboard nav must survive
  smooth scroll.
- `prefers-reduced-motion` fallback on **every** effect. Never gate content behind animation.
- The certificate screen should print cleanly.

---

## 11. Assets available

| Asset | Path / status |
|---|---|
| Vector mark (canonical) | `brand-assets/logo-mark-spline.svg` — pillar only, transform baked, viewBox `0 0 1432 2180` |
| Flat variants | `logo-mark.svg` (currentColor), `-white`, `-black`, `-chrome` (gradient), `-lit` (SVG-filter fake metal, ~8 KB) |
| 3D mark | `brand-assets/melange-mark.glb` — 141 KB, beveled, PBR silver, loads in three.js / r3f |
| 3D source | Published Spline scene; regenerate mesh via `tools/build-mark-mesh.py` |
| Raster lockup | `logo-primary-1254.png` — full lockup incl. wordmark |
| Figma | [Design Development Project](https://www.figma.com/design/xaTqpuL5E3zOnM41ZwPcAS/Design-Development-Project) — `Melange Brand` variables (13 colours) + 14 text styles |

**The wordmark is not vector** — only the pillar is. Set MELANGE / MERCANTILE as live Cinzel text rather
than trying to reproduce the raster lockup.

---

## 12. Out of scope

- A production build. The target is designed screens plus 2–3 hero moments built for real.
- E-commerce, cart, checkout, payment, accounts, real auth.
- Any FamilySearch component, pattern, or token.
- The brass/gold treatment — **superseded**. If shown at all, it is an explored alternative, never current.

## 13. Open decisions

1. **Spice particles: 2D canvas or WebGL?** 2D is achievable and good; WebGL is gorgeous and riskier.
   Decide before building.
2. **Mobile story.** Decide up front what simplifies or disables — parallax and particles are heavy. Do not
   retrofit.
3. **3D delivery.** Spline embed is ~1,029 KB transferred; GLB + react-three-fiber is ~423 KB. Lighter route
   needs the material rebuilt in code. See `BRAND.md` for measured figures.
4. **Spacing scale** (§7) is proposed, not ratified.
