# sdkwork-routes-iaas-open-api

Executable IaaS open-api route crate for `sdkwork-clawrouter.iaas-open-api`.

`gateway_mount(upstream)` returns an `axum::Router` for the authored `/cloud/v3/**` IaaS and cloud-storage operations. Requests run through the provider edge runtime supplied by `sdkwork-api-clawrouter-assembly`; the crate owns no listener and does not copy provider adapters.

The route manifest and schema metadata remain inventory inputs only and cannot replace the executable mount.

Verification:

```text
cargo check -p sdkwork-routes-iaas-open-api
pnpm api:assembly:validate
```
