# Claw Router topology profiles

Authoritative profile env files for `specs/topology.spec.json`.

Pattern: `{hosting}.{serviceLayout}.{environment}.env`

Default local development profile: `standalone.unified-process.development` (single-port integrated runtime).

Validate:

```bash
pnpm topology:validate
```

Canonical dev commands (see `docs/topology-standard.md` and `specs/topology.spec.json` → `scripts.pnpm`):

```bash
pnpm dev
pnpm dev:browser:postgres:split-services:standalone
pnpm dev:browser:postgres:unified-process:cloud
```
