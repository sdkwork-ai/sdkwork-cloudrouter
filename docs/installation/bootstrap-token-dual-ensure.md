# Bootstrap credential dual ensure (deploy + IAM)

Status: active
Owner: Cloud Router maintainers
Related: [docker-deployment.md](docker-deployment.md) §5.2.2, `sdkwork-iam` `docs/runbooks/backfill-installation-deploy-link.md`
Change class: issuance precondition (no schema, no foreign key)
## The gap

A bootstrap access credential names an installation, and an installation is
one-to-one with a deploy application. Two independent facts have to hold before a
credential means anything:

1. the **deploy application** exists in the deployment inventory
   (`sdkwork-deployments`), and
2. the **IAM installation** serving it exists, is linked to it
   (`iam_tenant_application.deploy_application_id`), and is `enabled`.

`sdkwork_iam_web_adapter::issue_standalone_bootstrap_access_credential` checks (2)
and refuses when the row is missing or disabled, but it cannot check (1): the
deploy inventory is owned by another repository and schema, and the dependency
direction is deploy → IAM. Cross-module foreign keys are forbidden. Nothing on the
caller side created the IAM installation for the configured anchor either, so a
fresh deployment had no supported path to a valid credential.

The Deploy → IAM direction is already implemented (deploy `bf4a076`, `b32311d`):
`apps.create` provisions the installation through
`sdkwork-deploy-identity-provisioning-port`. The reverse — IAM/installer → deploy —
is what this change adds, at the only place that may own it: the issuer's caller.

## Entry points that issued without guaranteeing the deploy application

Inventory taken from every call site of the bootstrap issuers
(`issue_standalone_bootstrap_access_credential`,
`resolve_deployment_bootstrap_access_token`) across the workspace.

| # | Entry point | What it called | Deploy application guaranteed? | Status |
| --- | --- | --- | --- | --- |
| 1 | `services/sdkwork-cloudrouter-installer` → `cloudrouterctl issue-bootstrap-token` (`run_issue_bootstrap_token_postgres`) | IAM issuer only | No | **Fixed** — dual ensure, see below |
| 2 | `scripts/reset-bootstrap-access-token.mjs` (`pnpm admin:token:*`) | Plans (1) with a dev/release env | No (inherited) | **Fixed transitively**; env is passed through to (1), help text updated |
| 3 | Local application runner that plans (2) (`scripts/run-cloud-router-application.mjs` bootstrap-token step) | (2) → (1) | No (inherited) | **Fixed transitively** |
| 4 | `sdkwork-missory` → `sdkwork-api-missory-assembly::issue_standalone_bootstrap_credential` (`auth.rs:185`) and `sdkwork-api-missory-standalone-gateway issue-bootstrap-token` (`main.rs:237`) | IAM issuer only | No | **Open** (other repository) — plan below |
| 5 | `sdkwork-missory` e2e (`scripts/e2e/login-flow.e2e.mjs`) | CLI in (4) | No | **Open**, same fix as (4) |
| 6 | `sdkwork-webserver` → `sdkwork-api-webserver-standalone-gateway::issue_credential_entry_bootstrap_token_to_file` | `resolve_deployment_bootstrap_access_token` → IAM issuer | No | **Open** (other repository) — plan below |
| 7 | `sdkwork-test` `LoginHarness::bootstrap` (`rust/src/login_harness.rs:37`) | IAM issuer directly | No | **Open** (test harness) — plan below |
| 8 | `scripts/dev/cloud-router-application-env.mjs` (`buildDeployAnchoredPublicApplicationToken`) | Builds an unsigned `alg:none` dev profile token from the anchor; no IAM call | No | **Adjacent**, dev/build only — recorded, not a signed issuance |
| 9 | `sdkwork-iam` `ensure_platform_tenant_application*` | Writes the IAM row from `SDKWORK_DEPLOY_APPLICATION_ID` | Cannot check (dependency direction) | By design; this is why the caller owns the guard |

## The fix in Cloud Router

`cloudrouterctl issue-bootstrap-token` now runs a two-sided ensure before signing:

```text
resolve anchor (SDKWORK_DEPLOY_APPLICATION_ID, or the explicit --app-id)
  │
  ├─ 1. deploy ensure  (src/deploy_application.rs)
  │     GET  /app/v3/api/apps/{anchor}                     → exists, same tenant, not ARCHIVED
  │     404 → POST /app/v3/api/apps                        → created id must equal the anchor
  │           Idempotency-Key: cloudrouter-bootstrap-app:<anchor>
  │
  ├─ 2. IAM ensure     (src/iam_installation.rs)
  │     resolve_tenant_application_by_deploy_application_id(tenant, anchor)
  │       found, enabled  → use it
  │       found, disabled → enable_tenant_application(...)
  │       missing         → ensure_tenant_application_runtime(manifest, anchor override)
  │                         → must end enabled and linked to the anchor
  │
  └─ 3. issue_standalone_bootstrap_access_credential(tenant, anchor, ttl)
        (unchanged; it re-resolves the enabled installation and signs)
```

Idempotency keys / identities:

| Step | Key | Evidence |
| --- | --- | --- |
| Deploy create | `Idempotency-Key: cloudrouter-bootstrap-app:<anchor>`; deterministic body (name/slug/appKind/`defaultEnvironment`) so the request hash matches on retry | `sdkwork-routes-deploy-app-api/src/app_delivery_routes.rs:341-366`; `sdkwork-intelligence-deploy-repository-sqlx/src/apps.rs:283-332` |
| Deploy read | `deploy_app.uuid` in the `{appId}` path | `apps.rs:507-528` (`WHERE a.tenant_id = $1 AND a.uuid = $2`) |
| IAM installation | `iam_tenant_application.deploy_application_id` (partial unique index `uk_iam_tenant_application_deploy`) + IAM's own row resolution (runtime app id → instance key → canonical id) | `sdkwork-iam/database/migrations/postgres/0040_installation_deploy_link_and_provisioning_state.up.sql:38-40`; `application_registry.rs:1118-1145` |

No new table, no column, no foreign key: the IAM link is the existing unique index,
and the deploy side is an HTTP precondition.

### Route evidence (read from `sdkwork-deployments`)

- `crates/sdkwork-routes-deploy-app-api/src/http_route_manifest.rs:289-299`
  - `GET /app/v3/api/apps` — `apps.list`, `deploy.apps.read`
  - `POST /app/v3/api/apps` — `apps.create`, `deploy.apps.write`, `.with_idempotent(true)`
  - `GET /app/v3/api/apps/{appId}` — `apps.retrieve`, `deploy.apps.read`
- `crates/sdkwork-routes-deploy-backend-api/src/http_route_manifest.rs:231-237`
  - `POST /backend/v3/api/apps/{appId}/identity_provision` — the only app route on
    the backend surface; it retries provisioning for an application that already
    exists, so it cannot create one.
- `crates/sdkwork-routes-deploy-app-api/src/app_delivery_routes.rs:341-366` requires
  `Idempotency-Key` on create; `:368-383` resolves `{appId}` through the uuid.
- `crates/sdkwork-intelligence-deploy-repository-sqlx/src/apps.rs:201-202` mints
  `id` and `uuid` server-side; `:614-616` hands IAM the decimal `id`. **There is no
  route that creates an application with a caller-chosen id.**
- Deploy's own runbook states it plainly:
  `docs/runbooks/identity-provisioning-reconciliation.md:72-74` — “It is the
  application's `uuid`; the BIGINT `id` is internal and is not addressable on this
  API.”

Consequence: “create-or-get by a pre-chosen anchor” cannot be fully honoured by the
deploy surface. The installer implements the strongest available semantics — read
first, create only when absent with a deterministic key, then require the created
id to equal the anchor — and **refuses to sign** when Deploy mints a different id,
printing the minted id to configure. That refusal is the point: no credential is
ever signed for an application that does not exist.

A second visibility trap: `apps.retrieve` applies Deploy's owner gate, so a service
principal reads `PLATFORM`/`TENANT` applications but not another user's `USER`-owned
row. A credential issued for a console-created, user-owned application therefore
answers `404` and takes the create branch (minting a different id, then refusing).
The remediation is the same (adopt the application the operator can read, or move it
to the tenant level); the failure is named, never silent.

### Failure semantics

| Situation | Result |
| --- | --- |
| `SDKWORK_DEPLOY_BACKEND_API_BASE_URL` / `…_ACCESS_TOKEN` / `…_AUTH_TOKEN` missing or blank | Refuse; message names the variable |
| Base URL not `http(s)://`, or embeds userinfo | Refuse; message names `SDKWORK_DEPLOY_BACKEND_API_BASE_URL` |
| Connect error, DNS failure, or timeout (`SDKWORK_DEPLOY_BACKEND_TIMEOUT_MS`, 500..=30000) | Refuse; message names the base URL and the route |
| 401 / 403 / 409 / 4xx / 5xx from the deploy API | Refuse; message names the method, route, status, problem code, and the credential variables + required permissions |
| Application exists but belongs to another tenant | Refuse; message names both tenants |
| Application is `ARCHIVED` | Refuse; message names the application |
| Response envelope has no `data.item` / id / tenant / status | Refuse; message says the application could not be proven to exist |
| Create mints an id different from the anchor | Refuse; message names the anchor, the minted id, and the exact assignment to make |
| IAM installation cannot be provisioned / stays disabled / not linked to the anchor | Refuse; message names the anchor and tenant |
| Everything verified | Sign and print `{"status":"issued",…}` |

The refusal prints `{"status":"error","errorCode":"bootstrap_prerequisite_missing","message":"…"}`
on stdout (installer contract) and exits non-zero.

## Remaining entry points (other repositories)

These are recorded, not changed here: they live in sibling repositories, and each
needs the same guard in its own issuer caller.

### `sdkwork-missory` (entries 4, 5)

`crates/sdkwork-api-missory-assembly/src/auth.rs::issue_standalone_bootstrap_credential`
calls the IAM issuer directly. Minimal fix, mirroring Cloud Router:

1. add a `deploy_application` module with the same two calls
   (`GET /app/v3/api/apps/{anchor}`, create on 404 with a deterministic key),
2. resolve `SDKWORK_DEPLOY_BACKEND_API_BASE_URL` + credentials from the environment
   and fail closed naming them,
3. provision/`enable` the IAM installation for `(tenant, anchor)` through
   `sdkwork_iam_web_adapter::ensure_tenant_application_runtime` before signing,
4. record the deliberate HTTP call in sdkwork-missory's
   `specs/backend-module-call-boundary.allow.json`.

`console_env.rs:23` uses `resolve_deployment_bootstrap_access_token` at boot; it
inherits the same gap and needs the same precheck or a call to the guarded command.

### `sdkwork-webserver` (entry 6)

`crates/sdkwork-api-webserver-standalone-gateway/src/credential_entry_bootstrap.rs`
writes a token file from `resolve_deployment_bootstrap_access_token`. Same fix; the
anchor there is the webserver installation's deploy application.

### `sdkwork-test` (entry 7)

`rust/src/login_harness.rs` is a test harness that issues directly. It should either
call a guarded helper or keep issuing against fixtures that own both rows; it must
not be treated as production issuance.

## Verification

```bash
cargo check -p sdkwork-cloudrouter-installer
cargo test -p sdkwork-cloudrouter-installer
cargo clippy -p sdkwork-cloudrouter-installer --all-targets -- -D warnings
node ../sdkwork-specs/tools/check-backend-module-call-boundary.mjs --root .
node scripts/check-deploy-application-anchor.mjs
node --check scripts/reset-bootstrap-access-token.mjs
```

End-to-end (not run here): a live deploy backend plus a PostgreSQL with the IAM
schema. The unit tests exercise the deploy client over a real loopback socket
(exists / create / minted-id refusal / 403 refusal / unreachable), and the IAM half
is verified by IAM's own service functions; what remains unverified locally is the
cross-service handshake (real deploy token, real tenant, real `apps.create`).
