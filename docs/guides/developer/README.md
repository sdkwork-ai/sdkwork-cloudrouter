# Developer Guide

Local setup, verification, debugging, admin module workflow, and code style summary for SDKWork Claw Router contributors.

Specs: `../../sdkwork-specs/DOCUMENTATION_SPEC.md` section 2, `../../sdkwork-specs/CODE_STYLE_SPEC.md`, `../../sdkwork-specs/NAMING_SPEC.md`, `../../sdkwork-specs/FRONTEND_CODE_SPEC.md`, `../../sdkwork-specs/RUST_CODE_SPEC.md`.

## 1. Local Setup

### Prerequisites

- Node.js 22+ (LTS)
- pnpm 10.33.0 (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
- Rust stable toolchain with `rustfmt` and `clippy`
- PostgreSQL 16 for the standalone product server; SQLite is reserved for the client-local `dev:desktop:sqlite` variant

### Install and Start

```powershell
pnpm.cmd install
pnpm.cmd dev
```

`pnpm dev` starts the default topology profile `standalone.development`. The integrated Rust edge listens on `http://127.0.0.1:3900`; the portal Vite dev server runs on `http://127.0.0.1:3901`.

For SQLite development (no PostgreSQL required):

```powershell
pnpm.cmd dev:desktop:sqlite
```

### Database

```powershell
pnpm.cmd db:status        # show migration status
pnpm.cmd db:init          # initialize schema
pnpm.cmd db:migrate       # apply pending migrations
pnpm.cmd db:seed          # seed reference data
pnpm.cmd admin:reset:dev # reset admin account (dev mode)
```

### Environment

Copy `.env.example` to `.env` and configure:

- `VITE_CLAWROUTER_*` for browser-visible SDK paths
- `SDKWORK_CLAW_BROWSER_DEV_PROXY_*` for private dev-server proxy upstreams

Do not put `PORTAL_PUBLIC_*` or legacy `PORTAL_DEV_PROXY_*` in `.env.development`. See `specs/application-env-standard.md` for the full environment contract.

## 2. Repository Layout

```
apps/sdkwork-clawrouter-pc/   React PC portal (Vite + React 19 + TypeScript)
crates/                       Rust crates (routes, gateway, services)
sdks/                         Generated TypeScript SDK families
packages/                     Governed shared TypeScript/React packages
services/                     Rust service binaries
specs/                        Local application/component contracts
tests/                        Python static hygiene guards and contract tests
docs/                         Architecture, guides, runbooks
deployments/                  Deployment descriptors and runbooks
scripts/                      Build, dev, release, and verification scripts
```

## 3. Verification

Run the narrowest relevant check first, then broader verification:

```powershell
# Frontend targeted checks
pnpm.cmd --dir apps/sdkwork-clawrouter-pc typecheck
pnpm.cmd --dir apps/sdkwork-clawrouter-pc lint
pnpm.cmd --dir apps/sdkwork-clawrouter-pc test
pnpm.cmd --dir apps/sdkwork-clawrouter-pc size

# Python static hygiene guards
python -B -m unittest tests.test_frontend_source_hygiene_standard
python -B -m unittest tests.test_frontend_xss_runtime_standard
python -B -m unittest tests.test_frontend_clipboard_standard
python -B -m unittest tests.test_frontend_contract_guardian

# Full product verification
pnpm.cmd verify
```

## 4. Debugging

### Frontend

- Vite dev server HMR is enabled by default; changes to `packages/*/src/**` hot-reload without a full page refresh.
- The portal routes all backend calls through `@sdkwork/clawrouter-app-sdk` and `@sdkwork/clawrouter-backend-sdk`. Inspect SDK request/response shapes in `sdks/clawrouter-app-sdk/` and `sdks/clawrouter-backend-sdk/`.
- The `PortalErrorBoundary` in `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/PortalErrorBoundary.tsx` catches render errors. Check browser DevTools Console for the boundary payload.
- E2E debugging: `pnpm.cmd --dir apps/sdkwork-clawrouter-pc exec playwright test --debug` opens Playwright Inspector.

### Rust

```powershell
pnpm.cmd format:rust:check         # format check
cargo clippy --all-targets -- -D warnings  # lint
pnpm.cmd test:rust:quick           # quick Rust test subset
```

Set `RUSTFLAGS="-D warnings"` in CI to enforce zero warnings.

## 5. Admin Module Workflow

Admin modules live under `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-*/`. Each admin module follows the same structure:

- `src/index.tsx` — page component (list, form, detail)
- `src/*Service.ts` — service layer calling `@sdkwork/clawrouter-backend-sdk`
- `specs/component.spec.json` — component contract and ownership metadata

### Adding a New Admin Module

1. Create `packages/sdkwork-clawrouter-pc-admin-<feature>/` with `package.json`, `tsconfig.json`, `src/index.tsx`.
2. Register the package in the portal root `package.json` workspace dependencies.
3. Implement the service layer using `readRequiredApiItems`, `readRequiredRecord`, and `readRequiredString` from `@sdkwork/clawroutes-pc-commons/runtime` to fail closed on contract drift.
4. Use `requiredSafePathSegment(id, '<featureId>')` for all SDK path ids.
5. Add the admin route to `packages/sdkwork-clawrouter-pc-admin-shell/src/adminModuleRegistry.ts`.
6. Add the permission hint to `packages/sdkwork-clawrouter-pc-admin-shell/src/admin-route-permission-hints.ts`.
7. Add a runtime test at the portal root (e.g., `admin-<feature>-runtime.test.ts`).

### Service Layer Contract

Services must:

- Call generated SDK operations (not raw fetch/axios).
- Use `ensurePlusApiSuccess` to validate SDK success status before reading items.
- Use `readRequiredApiItems` / `readRequiredRecord` to validate response shapes.
- Never use `.filter(isRecord)` or silent fallbacks that hide contract drift.
- Normalize all enum values with `throw new Error(...)` on unknown values.

## 6. Code Style Summary

### TypeScript/React

- Strict mode (`strict: true`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`).
- No `any` in production source. Use `unknown` + type guards.
- No `dangerouslySetInnerHTML`. Render content through React nodes.
- No `console.log/error/warn` in production source. Surface errors through UI state.
- Use `focus-visible:ring` (not `focus:ring`) for keyboard focus indicators.
- Icon-only buttons must carry `aria-label`.
- Overlay containers (`fixed inset-0`) must carry `role="dialog"` and `aria-modal="true"`.
- Media fields are `MediaResource` objects end-to-end. URL extraction belongs only at display/input boundaries.

### Rust

- `#![deny(warnings)]` enforced in CI.
- Use `sqlx::query!` with compile-time checked SQL.
- Modules follow `crates/sdkwork-clawroutes-<capability>-<surface>/` naming.

### Naming

- Root scripts follow `<command>[:runtimeTarget][:database][:deploymentProfile][:tier]` grammar.
- No application-code prefixes (`clawrouter:dev` is forbidden; use `dev`).
- Use `api`, not `apis`, for new root scripts.

## 7. Sourcemap Error Monitoring (Future Integration)

The portal production build is configured to emit sourcemaps for debugging, but there is currently no runtime error monitoring integration (e.g., Sentry, Glitchtip, or self-hosted collector). This section documents the planned integration path so future work can pick it up without re-discovery.

### Current State

- Vite production build emits sourcemaps for debugging.
- Runtime errors are caught by `PortalErrorBoundary` and surfaced through React error boundary UI state.
- No telemetry is sent to external services.

### Planned Integration

When error monitoring is added:

1. **Sourcemap upload**: Configure the build pipeline to upload sourcemaps to the chosen provider during `pnpm build`. Sourcemaps must not be served publicly to avoid exposing source code.
2. **Error boundary hook**: Extend `PortalErrorBoundary` to forward caught errors (with component stack and route context) to the monitoring provider. Respect user privacy: do not send request bodies, tokens, or PII.
3. **Release tagging**: Tag events with the release version from `docs/release/VERSION.md` so errors can be correlated to deployments.
4. **DSN configuration**: Add the provider DSN as a `PORTAL_PUBLIC_*` key on the release host (`.env.release`), mapped to browser `VITE_*` through `/runtime-env.js`.
5. **Consent**: If the deployment region requires it (e.g., GDPR), gate error reporting behind user consent.

### What Not to Do

- Do not add SDK error reporting to the generated SDK transport layer. Reporting belongs at the application boundary (`PortalErrorBoundary` and the top-level `App` component).
- Do not ship sourcemaps as publicly accessible static assets. Upload them to the provider and delete from the production bundle.
- Do not log secrets, auth headers, or user PII to the monitoring provider.

## 8. cc-switch Client Integration

[cc-switch](https://github.com/farion1231/cc-switch) is a cross-platform desktop manager (Tauri 2 + React + TypeScript + Rust) that switches Claude Code, Codex, Gemini CLI, OpenCode, and Hermes Agent between different provider configurations. Contributors run it locally to point these CLI agents at the dev Claw Router gateway for end-to-end routing, billing, and provider-adapter testing, without editing `~/.claude` or `~/.codex` config files by hand.

### Why use it during development

The Rust edge exposes three vendor-compatible gateway surfaces on a single origin, so one local Claw Router instance can serve all three CLI agents:

| CLI agent | Gateway surface | Base URL (dev) | Wire protocol |
| --- | --- | --- | --- |
| Claude Code | `/anthropic/v1/*` | `http://127.0.0.1:3900/anthropic` | Anthropic Messages |
| Codex | `/v1/*` | `http://127.0.0.1:3900/v1` | OpenAI Chat / Responses |
| Gemini CLI | `/google/v1beta/*` | `http://127.0.0.1:3900/google` | Google Generative Language |

### Prerequisites

1. Local dev topology running: `pnpm.cmd dev` (edge on `http://127.0.0.1:3900`, portal on `http://127.0.0.1:3901`).
2. At least one provider credential, model, and channel configured in the admin console (`/admin`) so the gateway can dispatch requests.
3. A gateway API key created in the end-user console (`/console` → API Keys). Copy the key value; it is the `Bearer` token for all three surfaces.
4. cc-switch installed from the [latest release](https://github.com/farion1231/cc-switch/releases).

### Configure Claw Router as a provider

In cc-switch, add a new provider under the tab for each CLI agent you want to test. Use the gateway API key from step 3 as the API key, and the Base URL from the table above.

| cc-switch agent tab | Base URL | API Key |
| --- | --- | --- |
| Claude Code | `http://127.0.0.1:3900/anthropic` | Claw Router gateway API key |
| Codex | `http://127.0.0.1:3900/v1` | Claw Router gateway API key |
| Gemini CLI | `http://127.0.0.1:3900/google` | Claw Router gateway API key |

Switch the active provider to the Claw Router entry, then launch (or restart) the CLI agent from cc-switch so it picks up the new base URL and token.

### Verify the request hits Claw Router

1. Send a prompt through the CLI agent (e.g. run `claude`, `codex`, or `gemini` and ask a question).
2. Confirm the model name is one configured in your Claw Router model catalog; the gateway rejects unknown models.
3. Check the gateway request landed:
   - Portal: `/console/usage` shows the call record with tokens, latency, and the routed provider.
   - Edge logs: structured stdout logs include the route, model, and provider relay latency.
   - `curl http://127.0.0.1:3900/v1/models -H "Authorization: Bearer <key>"` lists models the gateway can serve.

### Notes and limits

- The three vendor-compatible surfaces share one API key and one gateway rate-limit budget; rotating the key in `/console` invalidates all cc-switch provider entries that use it.
- Prefer `127.0.0.1` over `localhost` in Base URLs; some CLI agents reject `localhost`.
- cc-switch writes the chosen base URL and token into the CLI agent's own config (`~/.claude`, `~/.codex`, Gemini CLI config). To return to the official upstream, switch the active provider back in cc-switch rather than hand-editing those files.
- For streaming, the standalone dev profile streams directly with no buffering proxy in front.

## 9. Related

- [Portal README](../../../apps/sdkwork-clawrouter-pc/README.md)
- [Technical architecture](../../architecture/tech/TECH_ARCHITECTURE.md)
- [Standard alignment audit](../../standard-alignment-audit.md)
- [Runbooks](../../runbooks/README.md)
- [Contributing guide](../../../CONTRIBUTING.md)
