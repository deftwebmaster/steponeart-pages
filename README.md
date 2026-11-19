# Step One Art — StepOneArt24.com

A static artwork showcase for Step One Art, a project by John Hyder in Dallas, Texas. John sells artwork he makes and artwork donated by others, and the proceeds help pay rent for residents of sober living.

> **Wording rule:** the site must not name any specific sober living organization or club. Describe the beneficiaries only as "residents of sober living".

Website development was donated by [ManicWebmaster](https://manicwebmaster.com).

The site is a showcase with **purchase inquiries by email**. It has no cart, no payments, no accounts and no database. It builds to plain HTML, CSS and images that any static or shared host can serve.

> **Content status:** the 16 listings are John's real drawings and prints, made from the supplied photos, with working titles and no prices yet. Two more are held as drafts pending a decision. See [docs/CONTENT-STATUS.md](docs/CONTENT-STATUS.md).

| Guide | For |
| --- | --- |
| [docs/EDITING-GUIDE.md](docs/EDITING-GUIDE.md) | John: add artwork, upload photos, change a price, mark a piece sold |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Connecting a host so CMS saves publish automatically |
| [docs/CONTENT-STATUS.md](docs/CONTENT-STATUS.md) | What's real, what still needs details, the held drafts, and the launch checklist |

---

## Stack

- **[Astro](https://astro.build) 7** (static output), plain CSS and two small inline scripts (gallery filters, image viewer). There's no UI framework.
- **[Pages CMS](https://pagescms.org)** for editing content in GitHub ([`.pages.yml`](.pages.yml)).
- **sharp** (through Astro) resizes images at build time into AVIF/WebP/JPEG.
- Self-hosted fonts from Fontsource: Source Serif 4 (headings) and Nunito Sans (text).
- All dependencies are pinned to exact versions, and `package-lock.json` is committed.

**Node.js 22.23.4 or newer is required (Node 24 LTS recommended, see `.nvmrc`).** Astro 7 refuses to run on older Node versions.

## Setup and commands

```bash
nvm use            # or install Node 24 another way
npm ci             # install exact locked dependencies
npm run dev        # local dev server at http://localhost:4321
npm run build      # production build into dist/, then scripts/verify-dist.mjs
npm run preview    # serve dist/ with Astro
npm run check      # TypeScript/Astro diagnostics
node scripts/serve-dist.mjs   # serve dist/ like a plain static host (with 404 page)
```

`npm run build` fails, rather than publishing a broken site, if content is invalid. That includes a missing required field, an unsupported photo format, a duplicate filename/URL, a leaked draft, or a broken internal link.

## Project structure

```
.pages.yml                    Pages CMS configuration (fields mirror src/content.config.ts)
src/content.config.ts         Artwork content schema + loader that drops drafts
src/content/artwork/*.md      One file per artwork (YAML front matter + optional Markdown body)
src/assets/artwork/           Artwork photos (CMS uploads go here; optimized at build)
src/assets/brand/             Logo and default social-sharing image
src/data/settings.json        Site settings (contact email, hero copy, demo mode…)
src/lib/                      Content helpers (artwork queries, price formatting, mailto links)
src/components/               Header, footer, hero frame, cards, gallery filters, image viewer
src/layouts/Base.astro        <head> metadata (title, description, canonical, Open Graph, robots)
src/pages/                    Routes: /, /artwork/, /artwork/[slug]/, /our-purpose/, /donate-art/, 404,
                              sitemap.xml, robots.txt
scripts/                      verify-dist, static preview server, artwork-photo and logo preparation
photo-originals/              Unedited phone photos of the artwork (input for scripts/prepare-artwork-photos.mjs)
reference/homepage-mockup.webp  Design reference supplied for the project
```

### Routes

| Route | Source |
| --- | --- |
| `/` | `src/pages/index.astro`: hero, featured artwork (up to 6 with `featured: true`), mission |
| `/artwork/` | All published artwork with category and availability filters (Available shown by default) |
| `/artwork/<slug>/` | One page per published artwork from the single template `src/pages/artwork/[slug].astro` |
| `/our-purpose/`, `/donate-art/` | Static copy |
| `/404.html` | Not-found page |
| `/sitemap.xml`, `/robots.txt` | Generated from published content and settings |

### Content model (artwork)

| Field | Notes |
| --- | --- |
| `title` | Required. Pages CMS suggests the filename (URL) from the title when creating. |
| filename / URL | The Markdown filename is the URL slug (`hillside-church.md` → `/artwork/hillside-church/`). Unique by filesystem; duplicates fail the build. |
| `summary` | Description (required). Shown on the artwork page and in previews. |
| `price` | Optional USD number, formatted as `$1,250`. Empty shows "Price on request". |
| `artist` | Required |
| `source` | `john` (John's original) or `donated` |
| `category` | One of Paintings, Photography, Drawings, Prints, Mixed media, Sculpture, Other. Filters only show categories that have published work. To add a category, edit both `CATEGORIES` in `src/content.config.ts` and the `category` values in `.pages.yml`. |
| `medium`, `dimensions` | Optional text. Rows are hidden when empty. |
| `framing` | Optional text |
| body | Optional longer description (Markdown) |
| `image` + `imageAlt` | Cover photo and its alt text, both required |
| `gallery[]` | Optional extra photos, each `{ image, alt }` |
| `availability` | `Available`, `Reserved` or `Sold` (default Available) |
| `featured` | Show on the homepage (default false) |
| `published` | Default true. `false` means it's a draft. |
| `dateAdded` | `YYYY-MM-DD`, newest first |

**Drafts (`published: false`)** are dropped inside the content loader (`publishedOnly()` in `src/content.config.ts`). They never enter the content store, so they can't reach any page, the gallery, related works, the sitemap, the structured data or the built image folder. `scripts/verify-dist.mjs` checks this after every build, using the two real listings currently held as drafts.

> **Draft privacy:** drafts are hidden from the *website*, not from GitHub. In a **public** repository anyone can read draft files and their full history. Use a **private** repository if draft listings, prices or photos must stay private. Pages CMS and the build workflow both work with private repos.

### Site settings (`src/data/settings.json`)

`siteName`, `siteDescription`, `contactEmail`, `heroHeading`, `heroText`, `missionHeading`, `missionText`, `socialLinks[]`, `demoMode`, `demoNotice`. All of them can be edited in Pages CMS under **Site settings**.

**Contact email:** no address was supplied, so it's empty. While it's empty, artwork and donate pages say plainly that online inquiries aren't open yet, and no email buttons are shown. Once an address is set, "Ask about buying this piece" opens a `mailto:` link whose subject and body contain the artwork title, artist, price and page URL. Reserved works offer only "ask to hear if it becomes available", and sold works offer no inquiry.

**Demo mode** (`demoMode: true`, the current setting) shows the preview notice and adds `noindex, nofollow` to every page. **Production switch:** once titles and prices are final, set Demo mode off in Site settings. Pages become indexable and the notice disappears.

## Images

- Sources live in `src/assets/artwork/`. At build time each is resized: cards get 360/560/800 px AVIF + WebP + JPEG, artwork pages get up to 1280 px, and the viewer gets up to 2400 px WebP. Social-sharing images are 1200 px JPEG. Originals are never copied to `dist/`, so full-size phone photos aren't shipped.
- Every `<img>` has explicit `width`/`height`. Below-the-fold images lazy-load. The hero logo and each artwork's main image load eagerly with high priority.
- Cards show the whole artwork. If a photo's shape is close to the card shape it fills the card; otherwise it's shown uncropped on a soft background. Artwork pages never crop.
- **Supported upload formats: JPG, PNG, WebP.** The CMS only accepts those extensions. **HEIC (iPhone) is not supported.** It was tested: Astro does not process HEIC, and the build stops with the message *"Photos must be JPG, PNG or WebP. iPhone HEIC photos are not supported — export or convert the photo to JPG…"*. Uploading from an iPhone through Safari usually converts to JPEG automatically. Otherwise set Camera → Formats → *Most Compatible*, or export as JPEG. Keep uploads under about 10 MB each, because originals are stored in the repository.

### The logo

The supplied logo files are in `src/assets/brand/source/`. `scripts/prepare-logo.mjs` (`npm run logo:prepare`) trims the white-background version and makes the white transparent, without altering the artwork or lettering. That produces `src/assets/brand/step-one-art-logo.png` for the hero frame and the header's mountain mark. The link-preview (share) image is the supplied card `src/assets/brand/og-share-card.jpg`; artwork pages use a photo of the piece instead. The faces-background version appears on the Our purpose page. The hero frame, wall, shelf and vase are CSS and inline SVG around the logo.

### Artwork photos

`scripts/prepare-artwork-photos.mjs` (`npm run photos:prepare`) turns the phone photos in `photo-originals/` into the listing images. It flattens the perspective, crops away tape, cardboard and background, and corrects lamp-light colour casts. Photos on the blue tape mat are detected automatically; the others use the hand-set crops listed in the script. New listings added through Pages CMS don't need this step. The script is only for re-processing these originals.

The favicon is a simple typographic "S1" (`public/favicon.svg`, `.ico`, `apple-touch-icon.png`), because the detailed logo doesn't read at 16 px.

## SEO

Every page has a unique title, description and canonical URL on `https://steponeart24.com`. Artwork pages also have their own Open Graph image, `VisualArtwork` + `BreadcrumbList` JSON-LD, and an `Offer` only for Available (InStock) or Sold (SoldOut) works, using the listed price. There are no ratings or reviews. `sitemap.xml` lists only published pages, and `robots.txt` points to it.

## CMS connection (Pages CMS)

1. Push this repository to GitHub (private recommended, see draft privacy).
2. Go to [app.pagescms.org](https://app.pagescms.org), sign in with GitHub, and install the Pages CMS GitHub App on this repository only.
3. Open the repository in Pages CMS. It reads `.pages.yml` from the branch, and you'll see **Artwork** and **Site settings**.
4. To give John access, either add him as a collaborator on the GitHub repo, or invite him by email from the repository's collaborators settings in Pages CMS, which doesn't need a GitHub account. (Not done yet: creating accounts and sending invites needs the owner's go-ahead.)

Every save in Pages CMS is a commit to the repository. **That commit does not update the live site by itself.** A host or workflow has to build and publish it (next section).

## Builds, hosting and deployment

`dist/` is a host-neutral static folder: plain `index.html` files in directories, fingerprinted assets in `assets/` (deliberately not `_astro/`, which GitHub Pages' Jekyll step would drop), `404.html`, `sitemap.xml`, `robots.txt`, and a `.htaccess` used only by Apache shared hosting.

`.github/workflows/build-check.yml` runs on every push to `main` (so on every CMS save) and on pull requests. It installs, type-checks, builds and verifies the site, and keeps `dist/` as a downloadable artifact for 14 days. **It does not deploy**, and its summary says so. The hosting destination isn't decided yet. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) explains how to connect automatic publishing.

## Backups

The Git repository is the backup. All content, photos and settings are files, and every CMS save is a commit you can revert. To keep an off-GitHub copy, clone the repo or download a ZIP periodically. `dist/` can always be rebuilt from the repo.

## Reference

- `reference/homepage-mockup.webp` is the supplied design reference. It's not used by the site and can be deleted.
