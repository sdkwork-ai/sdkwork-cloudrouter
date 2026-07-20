# Claw Router topology profiles

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
pnpm dev:browser:cloud
```
