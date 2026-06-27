# Jobs

## Purpose

Job definitions, schedules, queue bindings, batch descriptors, and maintenance runbooks are placed here when Commerce owns asynchronous work.

## Owner

SDKWork Commerce maintainers own this directory. Changes must follow the repository `AGENTS.md` entrypoint and the canonical SDKWork specs under `../sdkwork-specs/`.

## Allowed Content

- Cron or scheduler descriptors.
- Queue binding metadata.
- Batch job documentation and runbooks.
- References to Rust worker crates when they exist.

## Forbidden Content

- Rust worker implementation code; that belongs under `crates/sdkwork-commerce-<capability>-worker/`.
- Secrets, live queue credentials, mutable runtime state, or production-only local overrides.

## Related Specs

- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/EVENT_SPEC.md`
- `../sdkwork-specs/RUST_CODE_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`

## Verification

Add or update job-specific verification when this directory becomes active; keep `node --test sdks/test/verify-commerce-standard-architecture.test.mjs` passing.
