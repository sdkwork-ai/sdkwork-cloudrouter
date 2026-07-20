# sdkwork-routes-clawrouter-app-api Specs

Local component contract for the Claw Router **app-api** Rust route crate.

- Component type: `rust-route-crate`
- Surface: `app-api`
- Route manifest: `../src/http_route_manifest.rs` (generated)
- Web framework bootstrap: `../src/web_bootstrap.rs`

## Web Framework Integration

Externally served routers must be finalized exactly once through `web_bootstrap`:

| Entry | Use |
| --- | --- |
| `router_from_env()` | Standalone app-api process — `maybe_wrap_router_with_web_framework_and_database_config` |
| `maybe_wrap_router_with_web_framework_and_iam_pool` | All-in-one gateway — shared Postgres pool + `database_config` |
| `finalize_served_router` | Thin alias for single wrap |

IAM app-api remains owned by `sdkwork-api-iam-assembly`. A host that selects both applications composes that dependency assembly alongside `sdkwork-api-clawrouter-assembly`; this product route crate does not copy IAM handlers.

Product-owned gateway API keys live at `/app/v3/api/iam/api_keys` and resolve to this route crate before the broad IAM catch-all.

`ClawRouterAppDomainInjector` projects `IamAppContext` from canonical `WebRequestContext`.

SQL-scoped app routes use `merge_web_framework_scoped_app_router` (all app-api handlers migrated).

Backend pilot: `admin_record` uses `admin_sql_subject` + `admin_web_framework_access_boundary` when web-framework mode is active.

Remaining backend `admin_*` routes still use `admin_request_subject_boundary` until migrated to `admin_sql_subject`.

## Related Specs

- [API_SPEC.md](../../../../sdkwork-specs/API_SPEC.md)
- [WEB_FRAMEWORK_SPEC.md](../../../../sdkwork-specs/WEB_FRAMEWORK_SPEC.md)
- [SDK_WORKSPACE_GENERATION_SPEC.md](../../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md)
- [RUST_CODE_SPEC.md](../../../../sdkwork-specs/RUST_CODE_SPEC.md)

## Verification

```bash
cargo check -p sdkwork-routes-clawrouter-app-api
cargo test -p sdkwork-routes-clawrouter-app-api claw_router_app_domain_injector
python ../../../tools/sdkwork_standard_alignment_guardian.py --strict
```
