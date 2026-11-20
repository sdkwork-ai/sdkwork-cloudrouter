# ADR-20261121-wechat-channel-dual-mode

Status: accepted
Requirement: REQ-2026-1121
Owner: cloudrouter-platform
Date: 2026-11-21
Specs: `API_SPEC.md`, `DATABASE_SPEC.md`, `IAM_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `DEPLOYMENT_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`

## Context

The application delivery system already binds Deploy applications to channel
accounts through `deploy_application_resource_link`
(`sdkwork-deployments/crates/sdkwork-deploy-contract/src/app_resource_link.rs`),
and IAM already owns `iam_oauth_operator_platform`,
`iam_oauth_resource_account`, `iam_oauth_resource_authorization`,
`iam_oauth_webhook_config`, and `iam_oauth_secret`
(`docs/architecture/tech/TECH-2026-06-09-appbase-oauth-system-design.md`).
Customer-owned accounts are usable today: WeChat official-account menus, QR
codes, message callbacks, web OAuth, mini-program code-to-session, and phone
authorization are implemented against `appid + appsecret`.

Three capabilities are missing and block commercial operation:

1. **Third-party platform (component) runtime is absent.** No
   `component_verify_ticket` ingress, no `component_access_token`, no
   `pre_auth_code`, no `auth_code` exchange, no authorizer-token refresh, no
   authorization-event callback, and no full-release verification. The
   `pre_authorizations` operation writes a diagnostic row only.
2. **The release pipeline stops before the provider.** Deploy builds, packages,
   validates, and records releases, but never uploads code, submits review,
   queries audit status, publishes, gray-releases, or rolls back. The review
   observer is a no-op (`sdkwork-deployments/crates/sdkwork-deploy-build-runner/src/review_observer.rs`).
3. **Channel onboarding has no commercial shape.** There is no entitlement for
   managed accounts or monthly publishes, no metering at publish time, and no
   operator-facing surface that distinguishes a service provider from a tenant
   administrator.

The business needs both modes simultaneously: customers who keep their own
WeChat AppID and development workflow, and customers who authorize SDKWork (or
an external service provider) to develop and operate for them.

## Decision

### 1. One channel-access model, three access modes, many operator platforms

Every channel account carries an `access_mode`:

- `self_managed` — the customer owns AppID/AppSecret or a CI upload key; the
  platform calls WeChat with the customer's own credential.
- `operator_authorized` — an operator platform (WeChat third-party platform,
  `component_appid`) holds the authorization; the platform calls WeChat with
  `authorizer_access_token`.
- `external_provider` — the same authorizer flow, but the component instance is
  owned by an external service provider and registered in the platform.

`iam_oauth_operator_platform` is **multi-instance**, not a singleton. One
deployment may register the platform's own component, an external provider's
component, and customized-type third-party platform records (appid only, no
secret, no API capability). `platform_type ∈ {platform, customized}` gates
capability operations.

### 2. Authority split: IAM authorizes, Deploy orchestrates

- IAM owns authorization, callback ingress, token custody, quota observation,
  secret storage, and the provider capability adapter.
- Deploy owns release orchestration and release state
  (`deploy_channel_release`), calling IAM's capability facade over internal RPC.
- Deploy, the admin frontend, and generated SDK clients never receive
  `component_access_token`, `authorizer_access_token`, or
  `authorizer_refresh_token`.

### 3. Component ingress is a cloud capability

Third-party-platform mode requires a publicly reachable HTTPS callback URL. It
is supported in the cloud deployment only. `standalone` and desktop
distributions support `self_managed` and `external_provider` registration, but
receive callbacks through a later cloud relay rather than a direct public
endpoint. No public callback listener is added to desktop or standalone
topologies in this decision.

### 4. Secrets are fail-closed and single-sourced

- `SDKWORK_IAM_SIGNING_MASTER_SECRET` is required at startup outside an
  explicitly declared development deployment (`assert_production_hardening`),
  so a cloud or production process cannot silently store a base64 plaintext
  secret ref. An explicit local development profile keeps the database-native
  fallback so a developer can run without a provisioned key; that exception is
  visible in configuration and never applies to production posture.
- `secret_owner_kind` gains `operator_platform` and `resource_authorization`;
  `secret_kind` gains `component_app_secret`, `encoding_aes_key`,
  `component_verify_ticket`, and `authorizer_refresh_token`.
- `component_access_token` is cached in `iam_ephemeral_artifact` with
  single-flight refresh and a PostgreSQL advisory lock;
  `authorizer_access_token` is cached per `(operator_platform, authorizer)`.
  Both refresh ahead of expiry, and a `40001/40014/42001` reply forces exactly
  one refresh-and-retry.

### 5. Release uses the provider-native pipeline

- `self_managed` mini programs publish with `miniprogram-ci` and a customer
  upload key (IP-allow-listed), not with third-party-platform APIs.
- `operator_authorized` / `external_provider` mini programs publish through
  draft → template → `commit` → privacy check → `submit_audit` →
  `get_auditstatus` → `release`, with `grayrelease` and `revertcoderelease` as
  first-class operations.
- Deploy's package is projected into a WeChat-buildable tree (strip
  `sdkwork.deploy-package.v1.json`, emit `project.config.json`) before upload.
- The review observer becomes a real implementation fed by the message-event
  callback first, polling second, manual sync last.

### 6. Data changes are additive

`deploy_application_resource_link` gains nullable `access_mode`,
`channel_account_id`, `operator_platform_id`, `authorization_ref`, and
`capability_snapshot_json`. New tables: `deploy_channel_release`,
`deploy_channel_template`, `deploy_channel_domain`,
`iam_oauth_channel_callback_event`, `iam_oauth_authorizer_inbox`. Existing
rows keep working unchanged.

### 7. Commercialization reuses the pricing and membership authorities

Entitlements (`channel.accounts.max`, `channel.managed_accounts.max`,
`channel.publishes.monthly`, `channel.operator_platforms.max`) live in
membership; prices live in `pricing` and are resolved through `PriceService`
with a quantity strategy. Cloud Router adds metering events only; it does not
create a second billing authority.

### 8. Scope order

WeChat first (mini program, then official account), open-platform web/mobile
apps later, Alipay/Douyin only after the capability facade proves a second
driver. WeChat "fast register mini program" stays disabled by default because
of qualification and quota risk.

## Alternatives

- **One platform-wide component only.** Rejected: SaaS tenants and external
  service providers need independent component identities, callback URLs, and
  quota budgets.
- **Hand tokens to Deploy and call WeChat from Deploy.** Rejected: token and
  refresh-token sprawl, duplicated rate-limit handling, and two audit trails.
- **Create a new integration service now.** Rejected for this round; the
  capability facade lives inside IAM behind an internal RPC boundary so it can
  be extracted later without changing API contracts.
- **Reuse `open_platform_*` naming.** Rejected: that surface is retired by
  `TECH-2026-06-09-appbase-oauth-system-design.md`.

## Consequences

Positive: both onboarding modes share one resource/state model; existing
self-managed accounts keep working; commercial metering attaches to the same
release records that operators already see.

Negative: a secret-master fail-closed migration is required; WeChat component
review and full-release are calendar-bound and cannot be compressed by code;
the Deploy review-state update path needs repair before it can own audit
transitions; generated SDKs and OpenAPI contracts must be regenerated through
the canonical generator.

## Verification

- `node <sdkwork-specs>/tools/check-api-operation-patterns.mjs --workspace .`
- `node <sdkwork-specs>/tools/check-api-response-envelope.mjs --workspace .`
- `node <sdkwork-specs>/tools/check-i18n-standard.mjs --root .`
- IAM: operator-platform component tests, callback signature/decrypt tests,
  token single-flight tests, storage-standard schema assertions.
- Deploy: channel-release state transition tests, projection tests, review
  observer tests against fixture payloads.
- End-to-end: one self-managed mini program and one authorized test mini
  program complete upload → audit → release → rollback.

## Supersedes / Superseded By

None. Extends `TECH-2026-06-09-appbase-oauth-system-design.md` without
superseding its identity model.
