# sdkwork-routes-clawrouter-backend-api Specs

Local component contract for the Claw Router **backend-api** Rust route crate.

- Component type: `rust-route-crate`
- Surface: `backend-api`
- Route manifest: `../src/http_route_manifest.rs` (generated)
- Web framework bootstrap: `../src/web_bootstrap.rs`

## Web Framework Integration

Externally served routers must be finalized exactly once through `web_bootstrap`:

| Entry | Use |
| --- | --- |
| `router_from_env()` | Standalone backend-api process — `maybe_wrap_router_with_web_framework_and_database_config` |
| `maybe_wrap_router_with_web_framework_and_iam_pool` | All-in-one gateway — shared Postgres pool + `database_config` |
| `finalize_served_router` | Thin alias for single wrap |

`ClawRouterBackendDomainInjector` projects `IamAppContext` from canonical `WebRequestContext`.

Migrated backend routes resolve `SqlScopedAdminSubject` via `admin_sql_subject` and use `layer_with_admin_subject_boundary` (`admin_web_framework_access_boundary` when web-framework mode is active, legacy `admin_request_subject_boundary` otherwise).

## Related Specs

- [API_SPEC.md](../../../../sdkwork-specs/API_SPEC.md)
- [WEB_FRAMEWORK_SPEC.md](../../../../sdkwork-specs/WEB_FRAMEWORK_SPEC.md)
- [SDK_WORKSPACE_GENERATION_SPEC.md](../../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md)
- [RUST_CODE_SPEC.md](../../../../sdkwork-specs/RUST_CODE_SPEC.md)

## Verification

```bash
cargo check -p sdkwork-routes-clawrouter-backend-api
python ../../../tools/sdkwork_standard_alignment_guardian.py --strict
```
