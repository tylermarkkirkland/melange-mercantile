# Melange Mercantile — brand reference

Consolidated 2026-09-17 from the thinking repo (`projects/design-development/`) and pulled **live from Figma**
([Design Development Project](https://www.figma.com/design/xaTqpuL5E3zOnM41ZwPcAS/Design-Development-Project) —
`Color` frame `136:4`, `Typography` frame `136:111`).

Tagline: **Spice · Trade · Influence.** Dune-inspired luxury spice-trade brand.
Personality: Prestigious · Authoritative · Sophisticated · Calculated · Elite. Archetypes: Ruler, Sage.
Feel: cinematic, sleek, Dune-desert-luxe futurism — **not** neon cyberpunk.

---

## Color — 13 tokens

### Ground (cold, low chroma — ~85% of coverage)
| Token | Hex | Use |
|---|---|---|
| Ink | `#000000` | logo ground only |
| Void | `#070A0C` | page ground |
| Basalt | `#121A1F` | raised surface |
| Slate | `#1E2B33` | borders and rules |
| Ice | `#E9EEF0` | light ground |

### Metal (sampled from the logotype — ~13% of coverage)
| Token | Hex | Contrast on Void | Use |
|---|---|---|---|
| Pewter dark | `#5B5B5C` | 2.9:1 | hairlines only — **never text** |
| Pewter | `#858789` | 5.5:1 AA | secondary text |
| Silver | `#98999B` | 7.0:1 AAA | body text |
| Silver light | `#AEAFB1` | 9.0:1 AAA | emphasis |
| Chrome | `#CFCFD1` | 12.8:1 AAA | headings, logo |

### Spice (~2% of coverage — rationed)
| Token | Hex | Contrast on Void | Use |
|---|---|---|---|
| Rust | `#9A3412` | 2.7:1 | the pigment — fills, seals, print, light grounds (6.3:1 on Ice, 7.3:1 on white). **Never text on dark.** |
| Spice | `#C2410C` | 3.8:1 | the signature — large marks / large text only, never body copy |
| Ember | `#E8822B` | 7.2:1 AAA | the glow — the only spice value allowed to carry meaning |

### System rules (verbatim from the Figma spec)
01. **Spice and metal never share an edge.** Every spice value against every metal falls between 1.0:1 and 3.3:1, so a ground always separates them.
02. **Spice never carries meaning on its own.** It is the only chroma in the system — pair it with a shape, a weight or a label.
03. **Cinzel is capitals only and never below 24px.** Its hairlines break up on dark grounds at small sizes.
04. **Cinzel stays on the mark and on ceremonial moments.** Plex carries the brand's speaking voice.
05. **Rust never appears as text on a dark ground.** It is a pigment for fills, seals and light grounds.
06. **Coverage holds at roughly 85% ground, 13% metal, 2% spice.** Spice should read as rationed.

---

## Typography — 14 styles

Two voices with a hard boundary. *Ceremonial speaks as the House. Operational speaks to the reader.*
All faces are Google Fonts (no licensing issue).

### Ceremonial · Cinzel — capitals only, 24px floor, wide tracking, never running text
| Style | Font | Size | Line-height | Tracking |
|---|---|---|---|---|
| `ceremonial/display` | Cinzel Regular | 72 | 80 | 12% |
| `ceremonial/title` | Cinzel Regular | 48 | 56 | 14% |
| `ceremonial/heading` | Cinzel Regular | 32 | 40 | 15% |
| `ceremonial/label` | Cinzel Bold | 24 | 32 | 18% |

### Operational · IBM Plex Sans — everything that must be read or acted on; sentence case
| Style | Font | Size | Line-height | Tracking |
|---|---|---|---|---|
| `operational/title-lg` | Medium | 32 | 40 | 0 |
| `operational/title` | Medium | 24 | 32 | 0 |
| `operational/title-sm` | Medium | 20 | 28 | 0 |
| `operational/body-lg` | Regular | **18** ★ | 32 | 0 |
| `operational/body` | Regular | 16 | 28 | 0 |
| `operational/body-sm` | Regular | **14** ★ | 24 | 0 |
| `operational/label` | Medium | 12 | 16 | 8% (caps) |

★ The two sanctioned exceptions to the 8/4 grid. Plex Sans needs 2pt steps through the reading
sizes (14 / 16 / 18) to keep seven distinct styles; everywhere else the grid holds.

### Data · IBM Plex Mono — anything a machine assigned: codes, figures, states
| Style | Font | Size | Line-height | Tracking |
|---|---|---|---|---|
| `data/figure` | Medium | 20 | 24 | 2% |
| `data/row` | Regular | 16 | 24 | 4% |
| `data/tag` | Medium | 12 | 16 | 16% (caps) |

### Scale rule
Sizes come from **8 with 4 as a half-step** — 12 · 16 · 20 · 24 · 28 · 32 · 40 · 48 · 56 · 64 · 72 —
preferring the 8-multiples. The only sizes off that ramp are the two ★ exceptions above.

**Line-heights are set in pixels, not percentages**, so every line box lands exactly on a 4px
multiple (16 / 24 / 28 / 32 / 40 / 56 / 80). A percentage can't express 80/72 exactly, and
approximate line boxes defeat the point of having a grid.

*Cormorant Garamond is held in reserve for one editorial moment on a light ground. Not yet a style.*

---

## CSS token starter

```css
:root {
  /* ground */
  --ink:          #000000;
  --void:         #070A0C;
  --basalt:       #121A1F;
  --slate:        #1E2B33;
  --ice:          #E9EEF0;
  /* metal */
  --pewter-dark:  #5B5B5C; /* hairlines only — never text */
  --pewter:       #858789;
  --silver:       #98999B;
  --silver-light: #AEAFB1;
  --chrome:       #CFCFD1;
  /* spice */
  --rust:         #9A3412; /* never text on dark */
  --spice:        #C2410C; /* large marks only */
  --ember:        #E8822B; /* the only spice that may carry meaning */

  --font-ceremonial: 'Cinzel', serif;
  --font-operational: 'IBM Plex Sans', sans-serif;
  --font-data: 'IBM Plex Mono', monospace;
}
```

---

## Logo

Combination mark: a pillar / monolith forming an **M**, over a MELANGE / MERCANTILE / SPICE · TRADE · INFLUENCE
lockup. Chrome on pure black. The **pillar mark alone** is now vector; the wordmark is not (and should stay
live text in Cinzel rather than being drawn).

| File | What |
|---|---|
| `brand-assets/logo-mark-spline.svg` | **Canonical vector mark.** Potrace transform baked into the path data, viewBox normalized to `0 0 1432 2180`, no gradient. Use this for any import. |
| `brand-assets/logo-mark.svg` | Same paths, `fill="currentColor"` |
| `brand-assets/logo-mark-white.svg` / `-black.svg` | Flat one-colour variants |
| `brand-assets/logo-mark-chrome.svg` | Linear-gradient fake metal |
| `brand-assets/logo-mark-lit.svg` | SVG-filter fake lit metal (~8 KB) — the lightweight fallback for the 3D version |
| `brand-assets/logo-primary-1254.png` | 1254×1254 raster of the full lockup |
| `brand-assets/logo-raw-1.png`, `-raw-2.png` | Original raster uploads |

**Geometry note:** the mark is **4 disjoint simple polygons** — capital, shafted body, diamond, base slab —
with **no holes**. The gaps between the shafts are open at the bottom, so nothing needs hole-aware
triangulation or even-odd fill rules. At 600 units tall the mark is 394 wide and the narrowest shaft is
~27 units, which caps a believable extrusion depth at roughly 24.

### 3D version (Spline)

`Melange Mark` — the SVG contours flattened, cleaned, triangulated, **chamfered** and extruded to a solid
**393 × 600 × 24** (1,488 triangles). Front and back faces are inset and joined to the silhouette by a
45° chamfer, so every contour carries a bright edge highlight.

**Bevel: rolled, 8-step, tapered, adaptive per contour.** A tangent elliptical arc sampled at 8 steps
(18 rings, 6,032 triangles), tangent to the flat face at one end and the side wall at the other, so smooth
shading gives a rolled edge with no crease. Per contour (inset / Z-depth): capital **6.0 / 6.0**,
body **4.5 / 6.0**, diamond **1.75 / 2.45**, base slab **3.25 / 4.55**.

**Sharp corners must TAPER, not clamp — this is what causes visible creases.** At a sharp convex corner the
correct inward offset is `d / sin(half-angle)`, which explodes as the corner sharpens. Truncating it with a
miter limit makes the bevel ring fold back on itself, and the fold reads as a crease. A clamp at 2.222×
pinned 8 vertices at its ceiling and produced exactly three visible defects: **both diamond tips, the tops
of the two middle bars, and the left foot**.

The fix has two halves, and both are needed:
1. **Taper** — cap the offset *length* at 1.5×d and accept the reduced perpendicular width. The bevel then
   narrows to nothing at a point, which is what real chamfering does.
2. **Smooth the magnitude** — 3 cyclic 1-2-1 passes over the per-vertex offset lengths. Without this the
   taper still steps abruptly between neighbouring vertices and folds anyway. After smoothing, the largest
   jump between adjacent vertices is 0.12–0.43 units.

Validate at **several ring fractions (0.25 / 0.5 / 0.75 / 1.0)**, not just the final inset — a mid-ring can
self-intersect while the last one is clean. Tapering also *permits a larger bevel*, since nothing explodes:
capital went 4.5 → 6.0 and body 3.6 → 4.5 at the same validation standard.

**Lighting blemishes fixed (2026-10-09).** The lit pillar showed a dark crack where the middle shafts meet the
capital, dark specks on the cap, and dark ticks along the shaft edges. Three causes, all now handled in
`tools/build-mark-mesh.py`:
1. **Triangulate the inset outline, not the original.** The flat faces were ear-clipped on the original contour
   and then moved inward with the bevel, which flipped 18 triangles at sharp inner corners (the crack).
2. **Flat faces get their own vertices and exact ±z normals.** Sharing vertices with the bevel, area-weighted
   averaging left 9 normals pointing almost backwards (the specks).
3. **Crease angle 50°** (`CONFIG["crease"]`). Walls meeting at a sharp outline corner (feet, tips, diamond)
   get a crisp edge instead of one shared normal that shaded one wall dark (the ticks). Neighbouring points
   that the inset pushes past each other are pulled together, and folded slivers under 2 units² are dropped.
The Spline file's `Melange Mark` was rebuilt from the same data (3,887 vertices / 5,955 triangles); the old mesh
is kept hidden as `Melange Mark (old, hidden)`.

Material asset **`Melange Silver`**: `physical`, base `#9EA2A6`, **metalness 0.88, roughness 0.28**,
smooth shading, plus a **`Brushed Steel` texture layer** — drawn locally with `generateTexture` (1024px,
cloudy radial blobs + soft long streaks), `projection: triplanar`, **alpha 0.42, repeat [2,2]**, also
driving `roughnessMap` so gloss varies across the faces.

Lighting: "Studio dark" HDRI, `showBackground: false`, **rotation 205**, `lightingIntensity` 2.9;
key 3.4 at (620, 700, 820); rim 1.9 `#8fb6d4`; ambient `#9db2c2` at 0.42; ground Void `#070A0C`.

**Why rotation 205 matters more than intensity.** On metal, brightness comes almost entirely from the
environment, not the punctual lights — dropping `lightingIntensity` dims the highlights too, which is the
opposite of what "mid-grey faces, bright rims" needs. The lever is HDRI *rotation*: put the bright zone
off-axis so the flat faces reflect a dark part of the environment while the curved rolls still sweep
through the bright part. That is what produces the original's value split.

**Two traps, both cost a rebuild:**
- A texture layer at high `alpha` **caps the highlights at the texture's own luminance** — at alpha 0.85
  the brightest pixel stopped at 169 and raising the light did nothing. Keep alpha ≤ ~0.5 so the texture
  modulates rather than replaces.
- `layer("texture", {...})` **without `image`** clears the asset reference and renders a **checkerboard**.
  Always capture `generateTexture`'s return and pass `image: <id>` on every call that touches the layer.

Roughness is the finish dial: **0.18** is mirror chrome, where flat faces pick up so much environment they
read as creased; **0.32** reads as matte painted metal.

---

### Portable export — `melange-mark.glb`

`brand-assets/melange-mark.glb` — **141 KB**, glTF 2.0 binary, 2,988 vertices / 5,960 triangles, one
`Melange Silver` PBR material (metallic 0.88, roughness 0.28). Loads in three.js / react-three-fiber via
`useGLTF` with **no Spline dependency**. Verified: renders in plain three.js at bbox 393.1 x 599.9 x 24.0,
matching the Spline object exactly.

Regenerate with `python3 tools/build-mark-mesh.py` — a self-contained SVG -> mesh -> GLB pipeline
(bezier flatten, Douglas-Peucker, short-edge cleanup, tapered offset, ear-clip, extrude, GLB writer).
All tunables are in its `CONFIG` dict, so bevel depth, slab thickness and mesh density are one edit away.
This is the hedge against Spline's runtime weight: the same geometry, loadable directly.

**Spline scene weight.** `analyze_scene` rates every metric "good": 3 objects, **6,032 polygons**,
1 material, 1 texture, 2 lights, 0 post-processing, 0 booleans, 0 clones. So the scene *content* is
negligible — any bundle weight will come from the Spline runtime and the HDRI environment, not the model.
Export byte size is not in that report; the Export panel's **Run Test** computes it.

### Published Spline embed

```html
<script type="module" src="https://cdn.spline.design/@splinetool/viewer@2.0.54/build/spline-viewer.webgpu.js"></script>
<spline-viewer url="https://prod.spline.design/omQhOuQqu7kJKs8Q/scene.splinecode"></spline-viewer>
```

### Measured weight — Spline embed vs. GLB + react-three-fiber

Transfer sizes measured 2026-09-17 with `Accept-Encoding: gzip, br`.

| | transferred | uncompressed |
|---|---|---|
| `spline-viewer.webgpu.js` | **868 KB** | 2.77 MB |
| `scene.splinecode` | **161 KB** | 161 KB |
| **Spline total** | **1,029 KB** | **2.93 MB** |
| | | |
| `three.module.js` | 255 KB | 1.27 MB |
| `GLTFLoader.js` | 24 KB | 109 KB |
| `melange-mark.glb` | 144 KB | 144 KB |
| **r3f total** | **423 KB** | **1.52 MB** |

**Spline is ~2.4x the transfer and ~1.9x the parse.** The JS parse gap matters more than the bytes on
mid-range phones — 2.77 MB of JavaScript to compile before anything appears.

**The scene is fully self-contained** — no external URLs inside `scene.splinecode`, and the "Studio dark"
HDRI is embedded as a **2048x1024 WebP at just 46 KB** (29% of the scene file). So there is no hidden
runtime fetch; 1,029 KB is the real total.

**Watch the WebGPU-only build.** Counter-intuitively `spline-viewer.webgpu.js` (868 KB) is *lighter* than
the standard `spline-viewer.js` (1,109 KB) — but in a browser without WebGPU the custom element did not
boot at all in testing and the scene was never requested, i.e. the logo silently does not appear. Verify
on Safari and Firefox before shipping the WebGPU build alone, or use the standard viewer.

**Recommendation.** Design and iterate in Spline; ship the GLB through react-three-fiber. You get the same
geometry at 40% of the weight, no WebGPU dependency, and direct control of the environment — at the cost
of rebuilding the material/lighting in code (the numbers are recorded above). Either way, lazy-load the
hero and show a poster frame first.

---

## Assets that exist in Figma but are raster only
| What | Node | Notes |
|---|---|---|
| Hand-drawn thumbnail sheet (~60 pencil thumbs) | `125:3` | presentation evidence |
| Application mockups — **brass** | `72:9` | superseded direction |
| Application mockups — **pewter** | `72:12` | 12 applications: flag, banner, plaque, wax seal, shipping crate, luggage tag, certificate of origin, canvas sack, architectural signage |
| Additional mockup sheets | `72:3`, `72:6`, `72:15` | |
| Moodboard images | `58:19`–`58:55` | |

---

## Sources
- Rationale: `my-thinking-repo/projects/design-development/visual-identity-decisions.md`
- Project context + phase spec: `my-thinking-repo/projects/design-development/context.md`
- Phase 5 website plan: `my-thinking-repo/projects/design-development/phase5-website-plan.md`
