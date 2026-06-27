# Contributing to SDKWork Claw Router

Status: active
Owner: SDKWork Claw Router maintainers
Application: sdkwork-clawrouter
Updated: 2026-06-26
Specs: ENGINEERING_WORKFLOW_SPEC.md, CODE_REVIEW_SPEC.md, GITHUB_WORKFLOW_SPEC.md, NAMING_SPEC.md, RUST_CODE_SPEC.md, TYPESCRIPT_CODE_SPEC.md

## Welcome

Contributions to SDKWork Claw Router must follow `sdkwork-specs/` standards,
preserve commercial-grade quality, and pass the full `pnpm verify` gate before
merge. This document captures the binding rules for code, contract, schema, and
documentation changes.

## Repository Entry Points

- Workspace root: `e:\sdkwork-space\sdkwork-clawrouter`
- Workspace specs: `../sdkwork-specs/`
- Application manifest: `sdkwork.app.config.json`
- Repository agent rules: `AGENTS.md`

Read `AGENTS.md` and `../sdkwork-specs/SOUL.md` before any change. SOUL enforces
*specs before memory, dictionary before context, stop on ambiguity, evidence
before completion*.

## Development Setup

```powershell
pnpm install --no-frozen-lockfile
pnpm dev                 # default PostgreSQL unified-process standalone
pnpm dev:server:sqlite   # SQLite variant for fast local iteration
```

Required tooling:

- Node 20+ with pnpm 10.33.0
- Rust stable (pinned via `rust-toolchain.toml`)
- Python 3.11+ (for tools/ guardians and tests/)
- PostgreSQL 16+ (for `pnpm test:postgres:required` and integration tests)
- Docker Desktop (optional, for `pnpm test:postgres:docker`)

## Branch And Commit Model

- Default branch: `main`. Do not open PRs against `master`.
- Branch naming: `feat/<scope>-<short-desc>`, `fix/<scope>-<short-desc>`,
  `chore/<scope>-<short-desc>`, `docs/<scope>-<short-desc>`.
- Commits must be conventional-commit style:
  `feat(gateway): add circuit breaker interceptor`,
  `fix(security): rotate tenant signing keys`, `docs(prd): expand release 0.4 scope`.
- Squash-merge on green CI; the squash subject becomes the canonical commit.

## Code Review Checklist

Before requesting review, confirm:

- [ ] `pnpm verify:fast` passes locally
- [ ] `cargo fmt --check` passes
- [ ] `cargo check --all-targets` with `RUSTFLAGS=-D warnings` passes
- [ ] Touched Rust crate tests pass (`pnpm test:rust:auto`)
- [ ] Touched frontend package typecheck passes (`pnpm --dir apps/sdkwork-clawrouter-pc typecheck`)
- [ ] No raw `/app/v3/api` or `/backend/v3/api` fetch in frontend code
- [ ] No hand-edits to generated SDK output under `sdks/clawrouter-*-sdk/`
- [ ] No new secrets, tokens, or credentials in source, logs, or fixtures
- [ ] No new `unwrap()`/`expect()` in production Rust paths
- [ ] No new `as any` in TypeScript code
- [ ] No new hardcoded user-facing strings — i18n keys only
- [ ] Schema changes go through schema registry + migration files, never direct
  baseline edits
- [ ] API contract changes regenerate OpenAPI + SDKs via the contract pipeline
- [ ] Documentation is updated in the same PR as the code change

Reviewers must enforce `CODE_REVIEW_SPEC.md`. Any blocking review comment blocks
merge; non-blocking comments may be tracked as follow-up issues.

## Spec Resolution

Before writing code, identify the touched surfaces and load only the relevant
specs from `../sdkwork-specs/`:

| Surface | Required specs |
| --- | --- |
| Rust code | RUST_CODE_SPEC.md, NAMING_SPEC.md, CODE_STYLE_SPEC.md |
| TypeScript/Node | TYPESCRIPT_CODE_SPEC.md, NAMING_SPEC.md |
| Frontend UI | FRONTEND_CODE_SPEC.md, FRONTEND_SPEC.md, UI_ARCHITECTURE_SPEC.md, APP_PC_REACT_UI_SPEC.md |
| API / SDK | API_SPEC.md, SDK_SPEC.md, SDK_WORKSPACE_GENERATION_SPEC.md |
| Database | DATABASE_SPEC.md, DATABASE_FRAMEWORK_SPEC.md, MIGRATION_SPEC.md, SCHEMA_REGISTRY_SPEC.md |
| Security / IAM | SECURITY_SPEC.md, IAM_SPEC.md, IAM_LOGIN_INTEGRATION_SPEC.md, PRIVACY_SPEC.md |
| Deployment / Release | DEPLOYMENT_SPEC.md, RELEASE_SPEC.md, SUPPLY_CHAIN_SECURITY_SPEC.md, GITHUB_WORKFLOW_SPEC.md |
| Observability | OBSERVABILITY_SPEC.md, HEALTH_CHECK_SPEC.md |
| Tests | TEST_SPEC.md, QUALITY_GATE_SPEC.md |

Do not load unrelated specs. Stop and surface ambiguity if a spec path does not
resolve.

## Contract-Driven Workflow

1. Schema first: edit `docs/schema-registry/tables/*.yaml`, regenerate via
   `python -B -m tools.schema_quality_gate`.
2. OpenAPI next: edit `apis/`, regenerate via
   `python -B -m tools.clawrouter_openapi_generator`.
3. SDK after: regenerate via the per-SDK `bin/generate-sdk.mjs` entry point.
4. Rust handlers and SQL repositories follow the contract.
5. Frontend consumes the generated SDK; never raw fetch.

Hand-editing generated output is forbidden (AGENTS rule). If a generator is
broken, fix the generator source, not the generated artifact.

## Testing Expectations

- Every Rust PR touching `services/` or `crates/` must include or update
  integration tests under the touched crate's `tests/` directory.
- Every frontend PR touching `packages/` must include vitest specs.
- New API operations must extend `tests/test_*_runtime_standard.py` coverage.
- Schema changes must extend `tests/test_schema_*.py` and
  `tests/test_flyway_schema_contract_audit.py`.

## Signing The Contribution

By submitting a pull request you agree that:

- You authored the change yourself or have the right to contribute it
- The contribution is licensed under the repository's
  `AGPL-3.0-or-later AND LicenseRef-SDKWork-Commercial-Restriction` license
- Commercial restriction clauses in `COMMERCIAL-LICENSE.md` are preserved
- You will not introduce third-party code without compatible license and
  attribution

## Release And Verification

Release candidates must run the full gate:

```powershell
pnpm release:preflight -- --strict --env-file .env.release --strict-root-clean
pnpm verify
pnpm test:postgres:required
CLAWROUTER_BROWSER_SMOKE_REQUIRED=1 pnpm verify
CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED=1 pnpm verify -- --with-edge-dev-smoke
```

Record exact command output in `CHECK_RESULT.md` before tagging a release.

## Getting Help

- Architecture questions: `docs/architecture/tech/TECH_ARCHITECTURE.md`
- API contract questions: `specs/API_SPEC.md`
- Schema questions: `specs/DATABASE_SPEC.md` and `docs/schema-registry/table-catalog.md`
- Operations questions: `deployments/runbooks/production-operations.md`

If the docs do not answer the question, open a `docs` labeled issue rather than
guessing.
