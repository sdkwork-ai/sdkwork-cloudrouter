# sdkwork-routes-clawrouter-llm-open-api

Executable LLM open-api route crate for `sdkwork-clawrouter.llm-open-api`.

`gateway_mount(upstream)` returns an `axum::Router` that owns the LLM operations selected from the authored Clawrouter OpenAPI document. Requests run through the shared provider invocation runtime supplied by `sdkwork-api-clawrouter-assembly`; the crate does not create a listener or duplicate provider handlers.

The route manifest and path constants remain available for inventory, OpenAPI, SDK generation, and collision validation. They are not substitutes for `gateway_mount`.

Verification:

```text
cargo check -p sdkwork-routes-clawrouter-llm-open-api
pnpm api:assembly:validate
```
