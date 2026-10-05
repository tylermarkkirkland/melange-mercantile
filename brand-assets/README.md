# Melange Mercantile — mark

Vectorized from `logo-primary-1254.png` (potrace, 12% threshold, 4× upsample).
4 paths, ~7KB each. Mark only — the wordmark is not yet vectorized.

| File | Fill | Use |
|---|---|---|
| `logo-mark.svg` | `currentColor` | **Inline / React only.** Inherits CSS `color`. |
| `logo-mark-black.svg` | `#101010` | `<img>` on light backgrounds |
| `logo-mark-white.svg` | `#FFFFFF` | `<img>` on dark backgrounds |
| `logo-mark-chrome.svg` | vertical steel gradient | Flat metal, cheapest |
| `logo-mark-lit.svg` | brand metals + `feSpecularLighting` | **Hero / display.** Real beveled lighting. |

## Gotcha

`currentColor` does **not** work via `<img src="logo-mark.svg">` — an `<img>` SVG is an
isolated document with no CSS to inherit, so it renders black. Use it inlined in JSX,
or reach for the `-black` / `-white` variants.

## Lighting

`logo-mark-lit.svg` blurs the shape's own alpha into a height map and runs a real point
light over it (`feGaussianBlur` -> `feSpecularLighting` -> `feComposite`). The browser
computes the shading. Move `fePointLight`'s `x`/`y` from JS and the highlight tracks it.

Open `logo-lab.html` in a browser to tune bevel depth / softness / polish / intensity
against both grounds, then "Copy SVG" to lift the tuned markup.

Gate cursor tracking behind `prefers-reduced-motion` — the lab does.

## Still to do

- Wordmark — set in **Cinzel** (already the ceremonial face in BRAND.md), capitals,
  then convert to outlines. Do not trace it.
- Full lockup SVG combining mark + wordmark.
