# public

Purpose: browser-served static assets for the SDKWork Commerce PC Vite renderer.

Owner: `sdkwork-commerce-pc` application shell.

Allowed content: public icons, non-secret runtime placeholders, static images, and browser assets that are safe to ship to users.

Forbidden content: access tokens, refresh tokens, API keys, private service endpoints, database URLs, generated SDK source, and host-local config files.

Related specs: `../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`, `../../../sdkwork-specs/CONFIG_SPEC.md`, and `../../../sdkwork-specs/ENVIRONMENT_SPEC.md`.

Verification: run `pnpm --dir apps/sdkwork-commerce-pc run build` and `node --test sdks/test/verify-commerce-standard-architecture.test.mjs`.
