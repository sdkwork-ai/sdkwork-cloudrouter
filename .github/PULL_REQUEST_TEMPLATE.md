<!--
Thank you for contributing to SDKWork Claw Router.
Read CONTRIBUTING.md and AGENTS.md before submitting.
-->

## Summary

<!-- 1-3 sentences describing what this PR changes and why. -->

## Change Type

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — code restructure, no behavior change
- [ ] perf — performance improvement
- [ ] docs — documentation only
- [ ] chore — tooling, deps, CI
- [ ] security — security hardening
- [ ] breaking — breaking change (requires major version bump)

## Touched Surfaces

- [ ] Rust gateway / router-service
- [ ] Rust admin-api / app-api
- [ ] Rust crates (claw-http / claw-security / claw-config / claw-observability)
- [ ] Provider adapter
- [ ] Frontend PC application
- [ ] Database schema / migrations / seeds
- [ ] API contract / OpenAPI / generated SDK
- [ ] K8s / nginx / deployment manifests
- [ ] CI / release governance
- [ ] Documentation

## Spec Alignment

Which sdkwork-specs are relevant to this change? (List by short name, e.g.
RUST_CODE_SPEC, API_SPEC, SECURITY_SPEC, MIGRATION_SPEC.)

<!-- e.g. RUST_CODE_SPEC §3, API_SPEC §15.1, SECURITY_SPEC §5 -->

## Verification

Run the narrowest relevant checks first; broad verification is required when a
contract boundary changes.

- [ ] `cargo fmt --check`
- [ ] `cargo check --all-targets` with `RUSTFLAGS=-D warnings`
- [ ] Touched Rust crate tests (`pnpm test:rust:auto -- --changed-file <path>`)
- [ ] `pnpm --dir apps/sdkwork-clawrouter-pc typecheck`
- [ ] `pnpm verify:fast`
- [ ] `pnpm verify` (required before merge)
- [ ] `pnpm test:postgres:required` (if database or SQL repository touched)
- [ ] `CLAWROUTER_BROWSER_SMOKE_REQUIRED=1 pnpm verify` (if frontend touched)
- [ ] `CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED=1 pnpm verify -- --with-edge-dev-smoke` (if runtime/gateway touched)
- [ ] Contract regeneration: `python -B -m tools.clawrouter_openapi_generator && python -B -m tools.schema_quality_gate`
- [ ] `pnpm check:agent-workflow-standard`
- [ ] `pnpm check:pnpm-script-standard`

## Commercial Delivery Rules

- [ ] No raw `/app/v3/api` or `/backend/v3/api` fetch in frontend product code
- [ ] No fake-success branches, local DTO forks, or mock async business data in commercial routes
- [ ] No unclassified portal route (see `docs/schema-registry/frontend-route-classification.yaml`)
- [ ] No manual edits to generated SDK output
- [ ] No schema, column, index, or migration change without explicit approval
- [ ] No sensitive values in logs, traces, UI state, screenshots, or generated docs
- [ ] Root delivery docs are readable UTF-8 (no mojibake, replacement chars, control chars)

## Documentation

- [ ] Updated affected docs in the same PR
- [ ] Updated `docs/INDEX.yaml` if a new doc was added
- [ ] Updated `docs/release/CHANGELOG.md` if user-facing
- [ ] Updated `docs/standard-alignment-audit.md` if standard alignment changed

## Risk And Rollback

<!-- What is the deployment risk? How do we rollback if this change misbehaves in production? -->

## Reviewer Notes

<!-- Anything reviewers should focus on, context, or non-obvious decisions. -->
