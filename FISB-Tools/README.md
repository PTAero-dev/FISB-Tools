# FISB Tools v2 — redesigned UI

This is a redesign of `dist/index.html` (v1.1, JUN 26). It has the same tools and the same calculations, with a new responsive UI, new charts and 3D views. The original file has not been changed.

## Run / deploy
- **One file for phones and sharing:** run `node build-single.js` to get `FISB-Tools-v2-single.html`, which has all CSS and JS inlined. That file works on its own. Opening only `index.html` on a phone shows unstyled HTML, because `css/` and `js/` aren't next to it. Re-run the build after editing any source file.
- Open `index.html` in a browser. There is no build step.
- To publish on Cloudflare Pages, copy this whole folder (`index.html`, `css/`, `js/`) into `dist/`. The site is now several files instead of one.
- The 3D views load Three.js r128 from cdnjs the first time they are opened, so they need an internet connection. Every 3D view also has a 2D view that works offline.

## Layout
| Screen width | Navigation |
|---|---|
| ≥ 1100 px (PC) | Full sidebar, with inputs and charts side by side |
| 760–1100 px (tablet) | Icon rail; single column below 1000 px |
| < 760 px (phone) | Bottom tab bar (Gradient · PAPI · VOR · ILS · More) |

- Each tool's cards are split into sub-tabs, for example VOR: Orbit / Prediction / Siting / Signal.
- The URL hash remembers the current tool and sub-tab (`#vor/siting`).
- The dark / light theme is stored in `localStorage` under the same `theme` key as v1.

## Files
| File | Contents |
|---|---|
| `js/core.js` | Shared utils (`fmt`, `clearIds`, `formatMinSec`, …), app shell, chart helpers, Morse audio |
| `js/scene3d.js` | Three.js loader, orbit / pinch controls, model builders (aircraft, runway, towers, sectors) |
| `js/gradient.js` | IFP gradient legs + full multi-leg profile |
| `js/papi.js` | PAPI cards, angle converter, 3D approach view, side fan, plan-view reference |
| `js/vor.js` | Orbit, prediction, siting (2D + 3D screening cone), FSPL |
| `js/ils.js` | Profile (2D + 3D approach), coverage compass |
| `js/theodolite.js` | General / setup calculations + geometry diagram |
| `js/misc.js` | Fuel, units, altimeter, Morse, DDM ↔ µA |
| `js/coord.js` | 12-waypoint DMS ↔ DMM converter, CSV import / export, waypoint plot |
| `js/geo.js` | Vincenty projector (3 modes) and RF arc + plots |

## Verification
The same inputs were run through v1 and v2 for every tool. All 106 compared output values matched.

## Changes beyond the redesign
- **Startup bug fixed.** v1's `window.onload` called an undefined `showTab()`. That aborted the rest of startup, so the VOR start time was never set and some views were never initialised. Calls to the undefined `drawFltCk()` and `calcProjector()` were also removed.
- **Minute-limit warning fixed.** In the projector and RF-arc coordinate inputs, the red-border warning for minutes now flags values ≥ 60. v1 flagged ≥ 59.
- **New features:**
  - Morse ident playback (speaker buttons)
  - PAPI pilot's-eye light indicator with an aircraft-angle slider
  - Signal-chart hover readout
  - DDM needle display
