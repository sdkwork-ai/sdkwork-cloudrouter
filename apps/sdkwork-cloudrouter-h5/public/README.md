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

## Related Specs
- `../../../../sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/BROWSER_RUNTIME_ENV_SPEC.md`
- `../../../../sdkwork-specs/FRONTEND_SPEC.md`

## Verification
- `pnpm workflow:materialize-client-env --check`
- `node ../../../../sdkwork-specs/tools/check-browser-runtime-env-standard.mjs --root ../..`
