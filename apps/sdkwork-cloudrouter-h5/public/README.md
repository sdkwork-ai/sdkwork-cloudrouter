# Public Assets

## Purpose
`public/` stores static browser assets served by the H5 renderer, including the generated `runtime-env.json` document.

## Owner
SDKWork CloudRouter H5 frontend maintainers.

## Allowed Content
Static assets, site icons, public OpenAPI snapshots used by local tools, and the materialized `runtime-env.json` produced by `pnpm workflow:materialize-client-env`.

## Forbidden Content
Secrets, backend-only config, runtime user data, private service endpoints, generated SDK packages, catalog or store media (that belongs in `../assets/media/`), logs, and caches.

## Note
`runtime-env.json` is generated output owned by the materializer. Edit the `etc/browser/runtime-env.*.json` profile sources and re-run the materializer; do not hand-edit the public copy.

`favicon.ico`, `favicon-16.png`, `favicon-32.png` and `apple-touch-icon.png` are the shipped brand
mark for this renderer's own document root. They are generated from the same master artwork as the
PC copies under `../../sdkwork-cloudrouter-pc/public/`; regenerate both sets together so the tab
icon never disagrees between the PC and H5 surfaces, and follow the derivation rules documented in
that README.

## Related Specs
- `../../../../sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/BROWSER_RUNTIME_ENV_SPEC.md`
- `../../../../sdkwork-specs/FRONTEND_SPEC.md`

## Verification
- `pnpm workflow:materialize-client-env --check`
- `node ../../../../sdkwork-specs/tools/check-browser-runtime-env-standard.mjs --root ../..`
