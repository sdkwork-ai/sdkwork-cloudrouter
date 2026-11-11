# Public Assets

## Purpose
`public/` stores static browser assets served by the PC React portal.

## Owner
SDKWork CloudRouter PC frontend maintainers.

## Allowed Content
Static assets, public OpenAPI snapshots used by local tools, WASM assets, and documented public files that are safe to serve to browsers.

## Brand Assets
The shipped brand mark lives here and is what every surface renders until an operator publishes a
logo in `/admin/site` (see `DEFAULT_BRAND_LOGO_URL` in
`../packages/sdkwork-cloudroutes-pc-commons/src/siteBranding.ts`).

| File | Rendered at | Purpose |
| --- | --- | --- |
| `brand/logo.png` (128×128, RGBA) | 20–36 CSS px | Default mark in the navbar, footer, admin header and auth window chrome |
| `favicon-32.png`, `favicon-16.png` | Browser tab | PNG favicon for clients that ignore `favicon.ico` |
| `favicon.ico` (16/32/48) | Browser tab, bookmarks | Legacy and pinned-tab favicon |
| `apple-touch-icon.png` (180×180, opaque) | iOS home screen | No alpha: iOS composites the icon on its own background |

Rules for regenerating them from the master artwork:

- Crop to the plate, not to the canvas: the source is the product app icon on a black background,
  and the plate's own rounded corners must become transparency so the mark sits cleanly on both the
  light and the dark theme. Never crop into the plate, and never leave the black canvas inside the
  rounded corner.
- Keep the square unpadded aspect: pad the plate to a square with transparency instead of stretching
  the artwork.
- 128px is the source for `brand/logo.png` because the largest render is the 36px footer mark; that
  keeps three device pixels per CSS pixel without shipping a viewport-sized image.
- Do not palette-quantise the artwork. The blue gradient bands visibly at 256 colours, so the
  smaller payload is not worth the artifact.
- Keep the touch icon opaque; the transparent-cornered variants are only for CSS/`img` surfaces.

The H5 renderer serves its own copies of the favicon set from `../sdkwork-cloudrouter-h5/public/`
because each renderer is its own document root.

## Forbidden Content
Secrets, backend-only config, runtime user data, private service endpoints, generated SDK packages, logs, caches, and production credentials.

## Related Specs
- `../../../../sdkwork-specs/FRONTEND_SPEC.md`
- `../../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`

## Verification
- `pnpm.cmd --dir apps/sdkwork-cloudrouter-pc typecheck`
- `python -B tools/architecture_standard_guardian.py` from the repository root
