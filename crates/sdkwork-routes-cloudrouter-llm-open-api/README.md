# sdkwork-routes-cloudrouter-llm-open-api

Executable LLM open-api route crate for `sdkwork-cloudrouter.llm-open-api`.

`gateway_mount(upstream)` returns an `axum::Router` that owns the LLM operations selected from the authored Cloudrouter OpenAPI document. Requests run through the shared provider invocation runtime supplied by `sdkwork-api-cloudrouter-assembly`; the crate does not create a listener or duplicate provider handlers.

The route manifest and path constants remain available for inventory, OpenAPI, SDK generation, and collision validation. They are not substitutes for `gateway_mount`.

Verification:

```text
cargo check -p sdkwork-routes-cloudrouter-llm-open-api
pnpm api:assembly:validate
```
