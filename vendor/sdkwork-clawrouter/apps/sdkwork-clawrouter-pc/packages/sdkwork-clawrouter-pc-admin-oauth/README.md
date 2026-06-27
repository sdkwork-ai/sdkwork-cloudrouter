# sdkwork-clawrouter-pc-admin-oauth

Domain: iam
Capability: oauth
Package type: node-package
Status: standardizing

This package owns the Claw Router backend-admin OAuth account management page at `/admin/oauth`. The page is reached from Operations and only manages platform integration account records for OAuth login platforms, official accounts, and mini-programs.

## Public API

- `src/index.tsx`

## Required SDK Surface

- `@sdkwork/iam-backend-sdk`
- Backend-admin IAM OAuth resource accounts under the generated SDK tree `iamOauth.iam.oauth.resourceAccounts.*`
- The service boundary also accepts the legacy/direct `iam.oauth.resourceAccounts.*` tree during appbase SDK transition, but new generated SDK verification is anchored on `iamOauth.iam.oauth.resourceAccounts.*`.

## Boundary

This package does not own OAuth persistence, provider callback ingress, app login callbacks, account linking runtime, provider token exchange, diagnostics, or provider catalog configuration. Those are appbase IAM responsibilities. This package is only the backend-admin operator page for appbase-owned OAuth resource account intake.

## Runtime Coverage

The appbase backend TypeScript SDK exposes the OAuth management resources consumed by this package. Claw Router's database-configured admin runtime mounts production-capable `/backend/v3/api/iam/oauth/*` handlers through `services/sdkwork-claw-product/src/api/admin_appbase_backend_iam_oauth.rs` and installs appbase IAM OAuth SQL tables through `services/sdkwork-claw-product/src/infrastructure/sql/installer.rs`.

The default no-database admin router still does not mount demo OAuth routes. Runtime coverage is considered valid only when the database-backed admin runtime is configured or when an explicit appbase backend base URL is provided.

## Verification

- `pnpm --filter sdkwork-clawrouter-pc-admin-oauth typecheck`
- `pnpm --dir apps/sdkwork-clawrouter-pc exec tsx admin-oauth-runtime.test.ts`
