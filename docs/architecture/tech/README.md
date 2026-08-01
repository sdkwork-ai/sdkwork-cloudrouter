# Technical Architecture Directory

This directory owns the technical architecture Canon for the repository.

## Fixed Entry

- [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md) — required entry document. Keep summary, status, and links here.

## Splitting Rules

- Split large architecture content into sibling shards named `TECH-<kebab-topic>.md`.
- Every shard `MUST` be linked from `TECH_ARCHITECTURE.md`.
- Do not create competing architecture roots such as `docs/architecture/TECH_ARCHITECTURE.md`; that path is retired and redirect-only.

See `DOCUMENTATION_SPEC.md` section 2.2.

## Superseded Stable Paths

`TECH-12-featuresmodules.md`, `TECH-13-schemaregistry-design.md`,
`TECH-16-design.md`, `TECH-usage.md`, and `TECH-usage-2.md` are redirect stubs
retained for stable links. They are not active architecture shards and must not
be used as route, schema, or implementation authority.
