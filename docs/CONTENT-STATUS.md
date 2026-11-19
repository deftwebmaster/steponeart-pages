# Content status and launch checklist

All listings are **real artwork by John Hyder**, made from the supplied photos. Most details aren't known yet, so the site shows them honestly:

- **Titles** are working titles. Drawings are named "Untitled (…)" with a short description in brackets. The three digital prints are named after the words written on them. John should rename any of them in Pages CMS.
- **Price** is empty, so the site shows "Price on request".
- **Medium, dimensions and framing** are empty, and those rows are hidden on the artwork page until they're filled in.
- **Availability** is set to Available for every piece.

While **Demo mode** is on, every page shows "Preview site: artwork titles, prices and details are still being finalized" and is hidden from search engines.

## Listings

| Slug | Working title | Category | Photo | Notes |
| --- | --- | --- | --- | --- |
| `sun-and-the-watchers` | Untitled (Sun and the Watchers) | Drawings | IMG_0316 | Featured |
| `hillside-church` | Untitled (Hillside Church) | Drawings | 20260224_232240 | Featured |
| `print-further-than-i-intended` | Further Than I Intended | Prints | IMG_0641 | Featured |
| `faces-in-the-wood` | Untitled (Faces in the Wood) | Drawings | IMG_0379 | Featured |
| `print-bird-overhead` | You Can't Control a Bird | Prints | IMG_0642 | Featured |
| `desert-ruins` | Untitled (Desert Ruins) | Drawings | 20260214_054847 | Featured |
| `face-in-the-storm` | Untitled (Face in the Storm) | Drawings | 20260224_030235 | **Check the signature:** it appears to read "Caitlin" above "J. Hyder 2026". Confirm the artist credit, or whether it's a dedication. Photos 20260223_223146/223219 show the same piece and weren't used. |
| `print-extreme-pain` | Forward, Not Backwards | Prints | IMG_0640 | |
| `river-of-faces` | Untitled (River of Faces) | Drawings | 20260224_232533 | |
| `gathering` | Untitled (Gathering) | Drawings | 20260224_232552 | |
| `canyon-wall` | Untitled (Canyon Wall) | Drawings | 20260224_232613 | |
| `desert-thicket` | Untitled (Desert Thicket) | Drawings | 20260214_054906 | 20260224_232341 is a partial photo of the same piece and wasn't used. |
| `mountain-sketch` | Untitled (Mountain Sketch) | Drawings | IMG_0458 | Looks like the original drawing behind the "Further Than I Intended" print |
| `clown` | Untitled (Clown) | Drawings | 20260224_232110 | |
| `city-portrait` | Untitled (Portrait with City) | Drawings | IMG_0607 | |
| `portrait-in-collar` | Untitled (Portrait in Open Collar) | Drawings | IMG_0668 | |

### Held as drafts (not on the website)

| Slug | Why it's held |
| --- | --- |
| `two-portraits` | The inscription next to the signature appears to read "To the 24 Club". Publishing it would show that name on the site. Publish only if that's acceptable, or use a photo where the inscription is cropped out. |
| `bearded-portrait` | The portrait may depict a well-known real person. Confirm who it is and that John wants it listed before publishing. |

To publish either one, open it in Pages CMS, tick **Published** and save.

## How the photos were prepared

`scripts/prepare-artwork-photos.mjs` turns the phone photos in `photo-originals/` into the images in `src/assets/artwork/`. It flattens the perspective, crops away the blue tape, cardboard, floor and neighbouring sketchbook pages, and corrects the lamp-light colour cast so the paper reads as paper. The drawings themselves aren't retouched. Re-run it with `npm run photos:prepare` if a crop needs adjusting. The crop for each photo is listed at the top of the script.

The **logo** comes from the supplied files: `src/assets/brand/source/step-one-art-logo-original.jpg` (white background) and `…-faces-original.jpg` (faces background, shown on the Our purpose page). `scripts/prepare-logo.mjs` makes the transparent hero version and the header mark. The link-preview image is the supplied share card, `src/assets/brand/og-share-card.jpg`.

Two of the supplied files named `.WEBP` were really JPEGs. They were saved with a `.jpg` extension.

## Launch checklist

1. Fill in real titles, prices, medium and dimensions in Pages CMS, and confirm the two notes above.
2. Decide on the two drafts.
3. In **Site settings**, set the **Contact email** for inquiries.
4. In **Site settings**, switch **Demo mode off**. This removes the notice and the `noindex` tag.
5. Connect hosting and the domain (docs/DEPLOYMENT.md), then check the live site.
6. Optionally delete `reference/` (the original design mockup).

## Wording rule

The site never names a specific sober living organization. Describe the cause only as helping pay rent for residents of sober living.
