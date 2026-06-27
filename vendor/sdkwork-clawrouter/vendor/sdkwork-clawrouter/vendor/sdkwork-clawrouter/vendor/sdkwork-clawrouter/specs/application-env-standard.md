# SDKWork Application Environment Profile Standard

Version: 1.0  
Scope: Claw Router repository; reusable by other SDKWork application roots.

## 1. Naming Rule (No `.local`)

SDKWork profile env files use **profile name only**. Do not add a `.local` suffix.

| Role | Pattern | Git |
| --- | --- | --- |
| Template | `.env.{profile}.example` | tracked |
| Host profile | `.env.{profile}` | ignored (via `.env.*`) |

Examples:

```text
.env.development.example   →   .env.development
.env.release.example       →   .env.release
.env.postgres.example      →   .env.postgres
```

Rationale:

- `.local` duplicates Vite's legacy override layer and confuses operators.
- One profile → one file is easier to document, generate, and audit.
- Vite, Node, and release tooling all load `.env.{mode}` directly.

## 2. Profile Matrix

| Script alias | Canonical environment | Profile file | Template |
| --- | --- | --- | --- |
| `dev` | `development` | `.env.development` | `.env.development.example` |
| `test` | `test` | `.env.test` | `.env.test.example` |
| `staging` | `staging` | `.env.staging` | `.env.staging.example` |
| `prod` | `production` | `.env.production` | `.env.production.example` |
| `release` | `production` (release host) | `.env.release` | `.env.release.example` |
| `postgres` | database overlay | `.env.postgres` | `.env.postgres.example` |

Every generated profile file should declare:

```text
SDKWORK_<APP>_CONFIG_PROFILE
SDKWORK_<APP>_ENVIRONMENT
SDKWORK_<APP>_DEPLOYMENT_PROFILE
SDKWORK_<APP>_RUNTIME_TARGET
```

## 3. Runtime Target Roots

| Runtime target | Env root | Typical framework |
| --- | --- | --- |
| `browser` | `apps/sdkwork-<app>-pc/` | Vite / React |
| `desktop` | `apps/sdkwork-<app>-pc/` or user config dir | Tauri |
| `server` | repository root | Node / Rust service launcher |
| `container` | repository root or mounted config | Node / Rust |
| `test-runner` | ephemeral or repo root | Node test harness |

Database overlays (`postgres` profile) always live at **repository root** unless the app spec narrows otherwise.

## 4. Load Precedence

Within one env root, later layers override earlier keys:

```text
1. .env                      (optional shared base)
2. .env.{profile}            (host profile; startup-managed)
```

Startup merge rule for managed keys:

1. Read existing `.env.{profile}`.
2. Generate defaults from template + runtime topology.
3. **Keep existing non-empty values**; fill only missing or empty keys.
4. Write merged result back to `.env.{profile}`.

## 5. Framework Notes

### Vite (browser / PC)

- `loadEnv(mode, appRoot)` loads `.env.development` when `mode=development`.
- Production builds load `.env.production` when `mode=production`.
- Private bootstrap credential `SDKWORK_ACCESS_TOKEN` is stored in gitignored `.env.{profile}.bootstrap.local` files (for example `.env.development.bootstrap.local` and `.env.production.bootstrap.local`). Tracked profile files keep `SDKWORK_ACCESS_TOKEN` blank; never place live tokens in `VITE_*` or `PORTAL_PUBLIC_*`.
- Vite may inject `SDKWORK_ACCESS_TOKEN` into the development client bundle only from the bootstrap local layer. Production portal builds must not embed bootstrap tokens in static assets; release host tokens stay in `.env.release` for server processes.

### Node (workspace launchers)

- `scripts/lib/sdkwork-application-env.mjs` resolves paths and ensures profile files.
- `scripts/dev/claw-router-application-env.mjs` supplies Claw Router generated values.

### Release / production host

- Template: `.env.release.example`
- Host file: `.env.release`
- `pnpm start` and `pnpm release:env:write` both target `.env.release`.
- Release host startup also generates `SDKWORK_ACCESS_TOKEN` into `.env.release`.
- Never package `.env.release` in install archives.

### Spring / Flutter / Tauri (future)

- Map canonical profile to framework config:
  - Spring: `application-{profile}.yml` examples + host file outside git
  - Flutter: `--dart-define-from-file=config/app/.env.{profile}`
  - Tauri: server profile separate from `tauri.conf.json` packaging metadata

Use the same profile names and merge semantics even when the on-disk format is TOML/YAML/JSON.

## 6. Claw Router Commands

| Command | Ensures |
| --- | --- |
| `pnpm dev` | `apps/sdkwork-clawrouter-pc/.env.development` |
| `pnpm build` | `apps/sdkwork-clawrouter-pc/.env.production` |
| `pnpm check` | `check:application-env` guard + portal product check (includes production build) |
| `pnpm start` | `.env.release` and `apps/sdkwork-clawrouter-pc/.env.production` |
| `node scripts/ensure-claw-router-env.mjs --lifecycle dev` | browser development profile |
| `node scripts/ensure-claw-router-env.mjs --lifecycle build` | browser production profile |
| `node scripts/ensure-claw-router-env.mjs --lifecycle start` | release host + browser production profiles |
| `node scripts/dev/claw-router-application-env.mjs --profile development` | browser development profile |
| `node scripts/dev/claw-router-application-env.mjs --profile production` | browser production profile |
| `node scripts/dev/claw-router-application-env.mjs --profile release` | release host profile |

## 7. Secrets

- Templates (`.env.*.example`) must not contain live secrets or tokens.
- Host files (`.env.{profile}`) are gitignored; may contain development-only secrets.
- Production secrets prefer TOML + secret files (`database.secret`) on Linux service installs.

## 8. Verification

```bash
node --test scripts/dev/claw-router-application-env.test.mjs
node --test scripts/lib/claw-router-browser-env-contract.test.mjs
node --test scripts/lib/claw-router-edge-env-contract.test.mjs
node --test scripts/dev/ensure-claw-router-env.test.mjs
node --test scripts/write-release-env.test.mjs
node --test scripts/release-environment-validation.test.mjs
node scripts/check-claw-router-application-env.mjs
pnpm check:gateway-request-identity
```

## 9. Claw Router Browser Env Namespaces

Aligned with `../sdkwork-specs/ENVIRONMENT_SPEC.md`:

| Namespace | Profile | Purpose |
| --- | --- | --- |
| `SDKWORK_CLAW_*` | development, production, release | Private application metadata and process-only settings |
| `SDKWORK_CLAW_EDGE_*` / `SDKWORK_CLAW_TOOL_API_*` | release host only (`.env.release`) | Private Rust edge-server CSP, tool API, and archive settings |
| `SDKWORK_ACCESS_TOKEN` | development, production, release | Private bootstrap credential in `.env.{profile}.bootstrap.local` (browser profiles) or `.env.release` (release host); tracked profile files keep this blank; never `VITE_*` or `PORTAL_PUBLIC_*` |
| `SDKWORK_CLAW_BROWSER_DEV_PROXY_*_ORIGIN` | development only | Private Vite dev-server proxy upstream origins |
| `VITE_*` | development (inlined), release (via `/runtime-env.js`) | Browser-visible SDK and runtime configuration |
| `PORTAL_PUBLIC_*` | release host only (`.env.release`) | Server inputs mapped to `VITE_*` by `/runtime-env.js` |

Rules:

- `.env.development` must **not** contain `PORTAL_PUBLIC_*` or legacy `PORTAL_DEV_PROXY_*`.
- `.env.production` must **not** contain any `PORTAL_*` keys; production browser bundles read public runtime from `/runtime-env.js`, not build-time env files.
- Legacy `PORTAL_FORWARD_*` keys are retired; use topology profile URLs and `SDKWORK_CLAW_BROWSER_DEV_PROXY_*_ORIGIN` instead.
- Use `VITE_CLAWROUTER_*`, `VITE_API_BASE_URL`, and `VITE_TOOL_API_ENABLED` in development.
- Legacy keys in an existing `.env.development` are migrated and stripped on the next workspace ensure.

## 10. PORTAL Keyword Policy (SDKWork Alignment)

`PORTAL` is **not** a blanket legacy prefix. SDKWork `ENVIRONMENT_SPEC.md` defines three distinct layers:

| Layer | Prefix | Profile / process | Role |
| --- | --- | --- | --- |
| Release browser public runtime | `PORTAL_PUBLIC_*` | `.env.release`, Rust edge server | Server inputs mapped to browser `VITE_*` via `/runtime-env.js` |
| Development browser runtime | `VITE_*` | `.env.development`, Vite dev server | Build-time / dev inlined SDK URLs |
| Private dev proxy upstream | `SDKWORK_CLAW_BROWSER_DEV_PROXY_*_ORIGIN` | `.env.development`, Vite dev server | Process-only proxy targets |

**Retired (must not appear in browser profile files or Vite config):**

- `PORTAL_DEV_PROXY_*` → `SDKWORK_CLAW_BROWSER_DEV_PROXY_*_ORIGIN`
- `PORTAL_FORWARD_*` → topology profile URLs / edge forwarding env
- `PORTAL_PUBLIC_*` in `.env.development` or `.env.production` → use `VITE_*` or release profile respectively

**Still required by spec (not debt):**

- `PORTAL_PUBLIC_*` on the release host and in Rust edge startup for production `/runtime-env.js`
- `PORTAL_PUBLIC_TOOL_API_ENABLED` as the browser-visible tool UI gate on release hosts

**Private edge server settings** (gateway process only; not browser-visible):

| Canonical key | Legacy alias (read-only fallback) |
| --- | --- |
| `SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC` | `PORTAL_CSP_CONNECT_SRC` |
| `SDKWORK_CLAW_EDGE_PORTAL_STATIC_*_CACHE_CONTROL` | `PORTAL_STATIC_*` |
| `SDKWORK_CLAW_EDGE_HSTS_*` | `PORTAL_SECURITY_HSTS_*` |
| `SDKWORK_CLAW_EDGE_CSP_FRAME_SRC` | `PORTAL_SECURITY_CSP_FRAME_SRC` |
| `SDKWORK_CLAW_TOOL_API_*` | `PORTAL_TOOL_API_*` |

Orchestration scripts (`start-workspace`, `start-claw-router-production`) emit canonical `SDKWORK_CLAW_*` keys through `buildRuntimeEdgePrivateEnv()`. The Rust gateway reads canonical keys first and accepts legacy aliases during migration. Do not assign new `PORTAL_TOOL_API_*`, `PORTAL_CSP_*`, `PORTAL_SECURITY_*`, or `PORTAL_STATIC_*` values in tracked templates.

**Release host profile (`.env.release`):**

- `PORTAL_PUBLIC_*` browser runtime inputs for `/runtime-env.js`
- `SDKWORK_CLAW_EDGE_*` / `SDKWORK_CLAW_TOOL_API_*` private edge-server settings
- `ensureClawRouterReleaseEnv()` backfills every `CLAW_ROUTER_RELEASE_ENV_KEY_ORDER` key, including empty optional values, so partial host files are expanded on ensure

**Development workspace rule:** the portal Vite process receives only `VITE_*` and `SDKWORK_CLAW_*` browser/dev keys. The integrated edge/server process receives `PORTAL_PUBLIC_*` for runtime script generation and `SDKWORK_CLAW_EDGE_*` / `SDKWORK_CLAW_TOOL_API_*` for private edge configuration.

**Development database overlay (`.env.postgres`):**

- When a complete split PostgreSQL profile is present, it takes precedence over a stale `SDKWORK_CLAW_DATABASE_URL` in the process environment.
- Explicit process overrides still win when tests or operators pass `skipDevEnvFile` isolation or set split fields directly without a conflicting file overlay.

## 11. HTTP Web Framework (Rust Edge / API Processes)

Aligned with `../sdkwork-specs/WEB_FRAMEWORK_SPEC.md` and `docs/standard-alignment-audit.md` §1.

| Variable | Default | Process | Purpose |
| --- | --- | --- | --- |
| `SDKWORK_CLAW_WEB_FRAMEWORK_ENABLED` | `true` (implicit) | Rust app/backend route servers | When `false`, skip `WebFrameworkLayer` wrapping |
| `SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY` | unset | Rust route integration tests | When `true`, use claw app-session token boundaries instead of IAM JWT web-framework path |
| `SDKWORK_IAM_DATABASE_URL` | bridged from claw postgres | Rust IAM resolver | IAM token validation database; auto-materialized from unified claw postgres profile when unset |

Production browser traffic (`pnpm dev` unified edge on port 3900) must use IAM dual-token JWTs resolved by sdkwork-web-framework. Do not set `SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY` in production profiles.
