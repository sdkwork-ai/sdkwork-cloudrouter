# Cloud Router topology profiles

Authoritative profile env files for `specs/topology.spec.json`.

Pattern: `{deploymentProfile}.{environment}.env`

Default local development profile: `standalone.development` (single-port integrated runtime).

Validate:

```bash
pnpm topology:validate
```

Canonical dev commands (see `docs/topology-standard.md` and `specs/topology.spec.json` → `scripts.pnpm`):

```bash
pnpm dev
pnpm dev:browser:postgres:standalone:debug
pnpm dev:cloud
pnpm dev:browser:cloud
```

`pnpm dev:cloud` / `pnpm dev:browser:cloud` start only the local Vite client
against the deployed cloud API surfaces (`cloud.development` profile); they
never start a local API, gateway, or database process. The remote platform
cloud gateway origin is declared per environment in these profile files
(`SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL`:
`api-dev/api-test/api-staging.sdkwork.com` for development/test/staging, `api.sdkwork.com` for
production).
