# SDKWork Claw Http Component Specs

Local standards index for `sdkwork-claw-http`. Root SDKWork specs remain authoritative per [sdkwork-specs/README.md](../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-claw-http` |
| Type | `rust-crate` |
| Domain | `platform` |
| Capability | `router` |
| Status | `standardizing` |

## HTTP Auth and Context (sdkwork-web-framework)

Production app/backend surfaces use **sdkwork-web-framework** as the canonical HTTP auth and context pipeline. This crate provides Claw-specific IAM resolver wiring and **legacy-only** subject bridges.

| Module | Responsibility |
| --- | --- |
| `federated_database_env.rs` | Materializes IAM and federated capability database environment from `DatabaseConfig`; route crates wire `sdkwork_iam_web_adapter` directly. |
| `web_bridge.rs` | **Legacy only**: projects into `TrustedRequestSubject` for handlers not yet migrated to `TenantAppContext` |
| `web_framework_compat.rs` | Feature flags; `merge_web_framework_scoped_app_read_router`; legacy `project_trusted_subject_from_web_request_context` middleware |
| `auth.rs` | Legacy signed-subject and app-session boundaries; `TrustedRequestSubject` Axum extractors |

Migrated app-api SQL read handlers live in `sdkwork-clawrouter-router-service/src/api/app_sql_subject.rs` and consume `WebRequestContext` / `TenantAppContext` per `WEB_FRAMEWORK_SPEC.md`.

### Environment flags

| Variable | Default | Meaning |
| --- | --- | --- |
| _(unset)_ | Web Framework **on** | IAM JWT dual-token path via sdkwork-web-framework |
| `SDKWORK_CLAW_WEB_FRAMEWORK_ENABLED=false` | Off | Skip `WebFrameworkLayer` wrapping |
| `SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY=true` | Legacy session path | Use claw app-session tokens; for integration tests and explicit rollback only |

IAM database URL resolution uses `SDKWORK_IAM_DATABASE_URL` or unified claw postgres bridging via `ensure_iam_database_env_for_claw_database`.

See also: [docs/standard-alignment-audit.md](../../../docs/standard-alignment-audit.md) §1, [WEB_FRAMEWORK_SPEC.md](../../../../sdkwork-specs/WEB_FRAMEWORK_SPEC.md), [IAM_SPEC.md](../../../../sdkwork-specs/IAM_SPEC.md).

## Canonical Specs

| Spec | Purpose |
| --- | --- |
| [WEB_FRAMEWORK_SPEC.md](../../../../sdkwork-specs/WEB_FRAMEWORK_SPEC.md) | Canonical HTTP request context |
| [WEB_BACKEND_SPEC.md](../../../../sdkwork-specs/WEB_BACKEND_SPEC.md) | Backend HTTP surface rules |
| [IAM_SPEC.md](../../../../sdkwork-specs/IAM_SPEC.md) | IAM context and dual-token auth |
| [RUST_CODE_SPEC.md](../../../../sdkwork-specs/RUST_CODE_SPEC.md) | Rust crate rules |

Full manifest: [component.spec.json](./component.spec.json).

## Verification

```bash
cargo test -p sdkwork-claw-http
cargo test -p sdkwork-claw-http --test auth
python ../../../tools/sdkwork_standard_alignment_guardian.py --strict
```
