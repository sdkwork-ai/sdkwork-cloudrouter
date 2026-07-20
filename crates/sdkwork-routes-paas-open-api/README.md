# sdkwork-routes-paas-open-api

Executable PaaS open-api route crate for `sdkwork-clawrouter.paas-open-api`.

`gateway_mount(upstream)` returns an `axum::Router` for the authored `/paas/v3/**` operations. Requests run through the shared provider invocation runtime supplied by `sdkwork-api-clawrouter-assembly`; provider plugins and credentials remain behind runtime ports.

The route manifest and schema metadata remain inventory inputs only and cannot replace the executable mount.

Verification:

```text
cargo check -p sdkwork-routes-paas-open-api
pnpm api:assembly:validate
```
