# SDKWork Claw Router Repository Contracts

This directory contains repository-wide machine contracts for SDKWork Claw Router.
Global standards remain authoritative at [sdkwork-specs](../../sdkwork-specs/README.md).
This directory does not copy global `*_SPEC.md` bodies.

## Contracts

- [component.spec.json](component.spec.json): repository/application component identity,
  public surfaces, SDK dependencies, and verification entrypoints.
- [topology.spec.json](topology.spec.json): v5 standalone/cloud runtime topology.
- [application-env-standard.md](application-env-standard.md): current v4 application
  lifecycle namespaces, profile values, visibility boundaries, and verification rules.
- [database-store-migration.manifest.json](database-store-migration.manifest.json): active
  PostgreSQL store extraction inventory until the remaining router-service stores move to
  their owning repository crates. It does not track a server-side SQLite implementation.
- [process-database-pool.spec.json](process-database-pool.spec.json): PostgreSQL process pool
  ownership and injection evidence for each executable runtime.

Generated application composition is materialized at
`generated/composition.resolved.json`; it is not duplicated as a hand-maintained contract here.

## Verification

```bash
pnpm topology:validate
python -B tools/sdkwork_standard_alignment_guardian.py --strict
pnpm check
pnpm verify
```
