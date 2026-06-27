# Route Manifests

Canonical `sdkwork.route.manifest` documents for Commerce HTTP route crates.

| File | Route crate | API surface |
| --- | --- | --- |
| `app-api/sdkwork-commerce-api-server.route-manifest.json` | `sdkwork-commerce-api-server` | `app-api` |
| `backend-api/sdkwork-commerce-api-server.route-manifest.json` | `sdkwork-commerce-api-server` | `backend-api` |

Regenerate after OpenAPI authority changes:

```powershell
pnpm run route-manifest:export
pnpm run openapi:export
pnpm run sdk:generate
```

Verification:

```powershell
pnpm run route-manifest:check
pnpm run verify
```

Related specs: `WEB_FRAMEWORK_SPEC.md`, `API_SPEC.md`, `SDK_WORKSPACE_GENERATION_SPEC.md`.
