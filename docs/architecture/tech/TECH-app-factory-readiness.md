# App Factory Commercial Readiness

Status: **active** (2026-11-20). This document is the delivery checklist for the
multi-tenant SDKWork application factory. It records what is implemented, the
identity contract, the verified commands, and the remaining external
dependencies. It is not a claim that the factory is commercially complete.
Cross-repository blockers and their required contracts are tracked in
[TECH-app-factory-blockers.md](./TECH-app-factory-blockers.md).

## 1. Identity contract (IAM ↔ Deploy)

- `deploy_app.id` (decimal `BIGINT`) is the IAM installation anchor:
  `iam_application_installation.deploy_application_id`.
- `deploy_app.uuid` is the public Deploy application id used by app paths and by
  `apps/{appId}`.
- `deploy_app.identity_provisioning_key = 'deploy:' || deploy_app.id` is the
  replay key; `apps.create` calls `apps.identityProvision` once and records the
  outcome on `deploy_app.identity_status`.
- The IAM partial unique index `uk_iam_tenant_application_deploy` enforces one
  installation per anchor. The anchor is the access-token `app_id`/`aud`; token
  issuance fails closed when it is absent.
- The installer resolves the decimal anchor first (reusing the installation
  `apps.create` provisioned), then falls back to a legacy uuid anchor and
  relinks it to decimal when its instance key proves the same application.
- The console exposes `identityStatus` and a `apps.identityProvision` retry.
- `deploy_app.identity_status` values: `pending_identity`, `active`, `failed`.

## 2. Application kind matrix

| Deploy kind | IAM type | Console card |
| --- | --- | --- |
| `H5_WEB` | `h5` | H5 |
| `PC_WEB` | `pc` | PC web |
| `STATIC_WEB` / legacy `SPA_WEB` | `pc` | Static / legacy web |
| `API_SERVICE` | `api` | API service |
| `WECHAT_MINIPROGRAM` | `miniprogram` | WeChat mini program |
| `DOUYIN_MINIPROGRAM` | `miniprogram` | Douyin mini program |
| `IOS_APP` | `ios` | iOS |
| `ANDROID_APP` | `android` | Android |
| `HARMONYOS_APP` | `harmonyos` | HarmonyOS |
| `FLUTTER_APP` | `flutter` | Flutter (multi-target) |
| `DESKTOP_APP` | `desktop` | Desktop (Electron/Tauri/Qt/Flutter) |

Frameworks/languages offered by the create/publish dialog: React, Vue, Next,
Nuxt, Svelte, uni-app, Taro, React Native, Kotlin, Java, Swift, Flutter,
Electron, Tauri, Qt, Rust, Node, Go, Python.

## 3. Create and publish flow

1. An operator/user with `deploy.apps.write` creates the Deploy application
   (`apps.create`) from the app-kind card; the create provisions the IAM
   installation and records `identity_status`.
2. If identity provisioning failed, retry from the App Center row menu
   (`apps.identityProvision`).
3. Publish a source: Git repository, uploaded archive/artifact, or a local
   scaffold directory selected in the Deploy publishing dialog.
4. The publish dialog resolves the app kind to a platform target
   (`deploy_app_platform_target`), creates a release, and submits a deployment.
5. Tenant/owner isolation is enforced by `tenant_id`, `organization_id`,
   `owner_type`, and `user_id`; `ACTIVE_APPS` quota is enforced before create.

## 4. Scaffold status
- A local scaffold can be published today: any framework/language directory is
  detected, its build-output path is recorded in `metadata`, and the normal
  release/deploy path applies.
- A **free template** can be installed as a new app:
  `POST /app/v3/api/marketplace/templates/{templateUuid}/install` creates an app
  of the template's source kind and copies the source. A published version
  captures the source app's Git declaration (provider, url, default branch,
  clone mode, credential reference) in `metadata.git`; install prefers that
  version snapshot and falls back to the source app's current declaration for
  older versions. Archive sources use the published version artifact, cloned
  under the installed app (same Drive node/checksum) so the source belongs to
  that app. The App Center template panel exposes it as **Create from
  template** for `APP` + `FREE` + `PUBLISHED` listings; the marketplace
  storefront (Deploy console) calls it after a free acquire order is paid.
- The template marketplace schema/repository (`deploy_application_scaffold*`)
  and browse/authoring routes exist. `install_count` increments once per
  installed application (the `app.template.install` audit entry keys the
  idempotent replay), and the installed app records its template provenance in
  `metadata.template`. A PostgreSQL integration test covers artifact-clone
  replay.
- A **paid** template install requires the settled `orderId`; Deploy verifies the
  order read-only against `commerce_order` (buyer, paid state, `app_template`
  subject, template UUID) and uses the order id as the app-create idempotency
  key, so one purchase creates one app. The order fulfillment remains the only
  writer of the paid install count.
- **Still missing:** refund/chargeback revocation of a paid install, and a
  durable consumption ledger (the current guarantee is order-id idempotency,
  not a revocable entitlement row).

## 5. Verified commands

```bash
# Deploy identity mapping + service
CARGO_TARGET_DIR=D:\crt cargo test -p sdkwork-deploy-identity-provisioning-port \
  -p sdkwork-intelligence-deploy-service --lib
# Installer (Windows long-path workaround)
CARGO_TARGET_DIR=D:\crt cargo test -p sdkwork-cloudrouter-installer
# IAM installation registry
cargo test -p sdkwork-iam-web-adapter --lib
# Deploy create/publish service
pnpm --dir apps/sdkwork-deployments-pc exec vitest run --maxWorkers=1 \
  packages/sdkwork-deployments-pc-console-publishing/tests/deploy-app-publishing.spec.ts \
  packages/sdkwork-deployments-pc-console-publishing/tests/locked-app-type-v6.spec.ts \
  packages/sdkwork-deployments-pc-console-publishing/tests/app-publish-dialog.spec.tsx
# CloudRouter App Center
pnpm --dir apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-application \
  exec tsc --noEmit
```

Known pre-existing environment failures: Deploy console component tests resolve a
second React copy from `sdkwork-birdcoder2`; Deploy PC typecheck reports sibling
package errors; Deploy layering reports the mini-program raw-HTTP violation.
None is introduced by the factory changes.

## 6. Remaining external dependencies

1. Scaffold install route/UI and template entitlement/purchase integration
   (sdkwork-order/payment).
2. IAM runtime consumption of Deploy resource links (login/cashier currently
   resolve IAM-owned OAuth integrations).
3. Real target-environment publish/deploy verification and mobile
   signing/store-delivery pipeline.
4. Legacy duplicate IAM rows (uuid + decimal) cleanup; the installer only heals
   the single-row case.
