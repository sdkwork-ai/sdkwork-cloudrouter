> Migrated from `docs/superpowers/specs/2026-06-09-appbase-oauth-system-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

## Status

Draft for implementation planning.

This spec replaces Claw Router-owned `open_platform_*` management with an
appbase-owned OAuth system. Compatibility with the old Claw Router
`open_platform_*` tables, backend routes, generated SDK resources, admin
packages, and frontend URLs is intentionally not preserved.

## Goals

- Build a complete appbase OAuth system, not only an OAuth login page.
- Move OAuth provider integration, login, account linking, delegated grants,
  client credentials, surfaces, policies, diagnostics, and token-retention
  configuration to `sdkwork-appbase`.
- Remove all `sdkwork-clawrouter` `open_platform_*` technical debt.
- Support China/APAC and overseas mainstream providers across PC web, mobile
  web, native mobile apps, desktop apps, mini-programs, and service-side flows.
- Use `/admin/oauth` as the Claw Router admin module base.
- Use `/app/v3/api/oauth/*` for app-facing OAuth runtime APIs.
- Use `/iam/v3/api/oauth/provider_callbacks/*` for appbase-owned external
  provider callback ingress such as tickets, messages, events, and authorization
  notifications.
- Use `/backend/v3/api/iam/oauth/*` for backend/admin OAuth management APIs.
- Model provider-specific configuration with normalized queryable columns,
  catalog-driven field schemas, and non-secret JSON extension fields.
- Keep login/session creation in appbase app-api only.
- Keep operator configuration, tenant binding, grant remediation, secret
  rotation, and diagnostics in appbase backend-api only.

## Scope

This system models SDKWork/appbase as an OAuth client and identity federation
manager for external providers. It covers:

- OAuth/OIDC login.
- OAuth account linking.
- Provider grant retention and revocation.
- Client credentials and service-side provider integrations.
- Provider resource-account onboarding, for example WeChat Official Account,
  WeChat Mini Program, Alipay application, DingTalk/Feishu enterprise app, and
  similar provider-owned accounts.
- Self-managed account access, where the tenant owns and directly configures
  the provider account credentials.
- Operator-authorized account access, where a provider third-party platform or
  operations platform receives authorization to manage provider accounts on
  behalf of customers.
- Operational resources for provider accounts, such as official-account menus,
  message reply rules, template messages, JS-SDK domains, web authorization
  domains, callback configuration, and QR/login entry links.
- Device-code and native public-client style flows when supported.
- Mini-program code/session style provider-native flows.
- Enterprise tenant/corp/domain binding for SSO-like providers.
- Diagnostics for discovery, JWKS, redirect, callback, token exchange, and
  claim mapping.

This spec does not make SDKWork an OAuth authorization server for arbitrary
third-party developers. If SDKWork later needs to issue OAuth access tokens to
external apps, that should be a separate `iam_oauth_authorization_server_*`
extension under the same `/admin/oauth` module.

## Ownership

`sdkwork-appbase` owns:

- database schema and migrations for OAuth provider catalog, integrations,
  clients, secrets, surfaces, flows, scopes, claim mappings, policies, tenant
  bindings, authorization state, account links, grants, callback events, and
  diagnostic runs.
- `sdkwork-iam-app-api` OAuth runtime routes.
- `sdkwork-iam-backend-api` OAuth management routes.
- generated `@sdkwork/iam-app-sdk` and `@sdkwork/iam-backend-sdk`
  resources.
- reusable appbase auth UI/runtime provider lists and OAuth invocation behavior.

`sdkwork-clawrouter` owns:

- the admin module shell, sidebar placement, route registration, page-level UX,
  and generated appbase backend SDK consumption.
- removal of Claw Router `open_platform_*` tables, schema registry entries,
  backend routes, Rust stores, tests, generated backend SDK resources, frontend
  packages, i18n resources, and sidebar routes.

## Canonical Naming

| Layer | Canonical name |
| --- | --- |
| Product concept | OAuth system |
| Admin label zh-CN | `OAuth 管理` |
| Admin label en-US | `OAuth` |
| Admin sidebar key | `oauth` |
| Admin URL base | `/admin/oauth` |
| Appbase app-api resource group | `oauth` |
| Appbase provider ingress open-api resource group | `iam.oauth` |
| Appbase backend-api resource group | `iam.oauth` |
| Database table prefix | `iam_oauth_` |
| Rust module prefix | `oauth` |
| TypeScript package/module name segment | `oauth` |

Forbidden new names:

- `open_platform_*`
- `/admin/open-platform`
- `/backend/v3/api/open_platform/*`
- generated SDK resource group `openPlatform` or `open_platform`
- `third_party_login` as an API path or database prefix

`/admin/oauth` is broad by design. Login is one page under the OAuth module,
for example `/admin/oauth/login`, rather than the module name.

## Provider Coverage

The provider catalog must cover these providers at minimum.

China/APAC:

- WeChat Open Platform
- WeChat Official Account web OAuth
- WeChat Mini Program code/session login
- Alipay
- DingTalk
- Feishu/Lark
- QQ
- Weibo
- Baidu
- Douyin/TikTok China

Overseas/global:

- Google
- Apple
- Microsoft Entra ID
- GitHub
- GitLab
- Facebook/Meta
- LinkedIn
- Slack
- Discord
- X/Twitter
- TikTok global
- Okta
- Auth0
- Keycloak/custom OIDC

The catalog is a runtime-managed dictionary, not hardcoded frontend-only data.
Future providers must be possible without table redesign.

## Protocol And Flow Differences

The database and API must not assume one OAuth shape.

| Difference | Required support |
| --- | --- |
| Authorization code | Web and confidential-client flows with state, redirect URI, token exchange, scopes, and optional refresh tokens. |
| PKCE | Required for native/public clients; preferred for web providers that support it. |
| OIDC | ID token validation, nonce, issuer/audience, JWKS/discovery, userinfo endpoint, email/phone verification claims. |
| Client credentials | Server-side provider API integration without a user login session. |
| Device code | TV/CLI/device style authorization when supported by providers. |
| Refresh token | Retention policy, rotation, revocation, and encrypted storage. |
| Token exchange/JWT bearer | Provider-specific service delegation where supported. |
| OAuth 1.0a | X/Twitter-style legacy flows with token secret handling. |
| WeChat union identity | `openid` is app/account scoped; `unionid` may be cross-app and must be modeled separately. |
| WeChat Mini Program | Code-to-session flow, no browser redirect, mini-program app id, environment/path binding, optional phone/profile authorization, and unionid/openid mapping. |
| Alipay/DingTalk/Lark mini programs | Provider-native code/session login, app id binding, environment/channel binding, phone/profile authorization, and host-specific route/path binding. |
| WeChat Official Account | H5-in-WeChat redirect domain constraints and scope differences such as basic identity vs user info. |
| Alipay | App ID plus RSA/certificate signing material, gateway/environment, user ID mapping. |
| DingTalk/Feishu/Lark | Enterprise/corp/tenant IDs, tenant binding, app scopes, region-specific endpoints. |
| Apple | Team ID, key ID, service ID/client ID, private-key JWT client secret generation, bundle/service binding. |
| Microsoft Entra | Tenant-specific authority, multi-tenant vs single-tenant behavior, issuer validation. |
| Custom OIDC | Discovery URL, issuer, JWKS, claim mapping, allowed domains, and admin validation. |

## Official Account Standard Scenario

WeChat Official Account is the reference design for provider resource-account
access. The OAuth system must support both access paths:

- Self-managed account access: the tenant owns the official account and enters
  AppID, AppSecret, callback token, EncodingAESKey, web authorization domain,
  JS-SDK domain, menu entries, QR/login entries, and message reply settings.
- Operator-authorized account access: the tenant or operator configures a
  provider third-party platform, receives component tickets, generates pre-auth
  authorization, receives official-account authorization, stores authorizer
  token refs, and then manages menus/messages/domains through the granted
  capability set.

Standard mapping:

| Official-account concept | OAuth system table |
| --- | --- |
| WeChat provider template | `iam_oauth_provider_catalog` with `provider_code = wechat_official_account`. |
| Tenant's WeChat integration | `iam_oauth_integration`. |
| AppID/AppSecret or component app id | `iam_oauth_client` plus `iam_oauth_secret`. |
| Self-managed official account | `iam_oauth_resource_account` with `access_mode = self_managed_account`. |
| Third-party platform/component | `iam_oauth_operator_platform`. |
| Authorized official account | `iam_oauth_resource_account` with `access_mode = operator_authorized_account`. |
| Component authorization / authorizer token lifecycle | `iam_oauth_resource_authorization`. |
| Web OAuth redirect surface | `iam_oauth_surface` plus `iam_oauth_flow_config`. |
| Callback URL, Token, EncodingAESKey | `iam_oauth_webhook_config` plus `iam_oauth_secret`. |
| Menu entries | `iam_oauth_operational_resource` with `resource_kind = menu_entry`. |
| QR or URL login entry | `iam_oauth_operational_resource` with `resource_kind = qr_entry` or `url_entry`. |
| JS-SDK domain | `iam_oauth_operational_resource` with `resource_kind = js_sdk_domain`. |
| Web authorization domain | `iam_oauth_operational_resource` with `resource_kind = web_oauth_domain`. |
| Message reply rule | `iam_oauth_operational_resource` with `resource_kind = message_reply_rule`. |

Rules:

- Official account login must use the same appbase OAuth session creation path
  as other OAuth providers. It must not use a Claw Router-local QR or
  open-platform login route.
- Official account operational resources must be managed through backend API and
  appbase backend SDK resources, not product-local SDK forks.
- Provider access tokens, authorizer refresh tokens, callback tokens, and
  EncodingAESKey values must be secret refs only.
- Operator-authorized accounts must be constrained by granted capability JSON;
  menu/message/domain operations must fail closed when the capability was not
  granted or has expired.
- Self-managed account operations must verify AppID and callback settings before
  marking the account ready.

Self-managed official-account onboarding:

1. Create or select the WeChat Official Account integration.
2. Create a resource account with `access_mode = self_managed_account`.
3. Store AppID as `iam_oauth_client.provider_client_id`.
4. Store AppSecret, callback token, and EncodingAESKey as `iam_oauth_secret`
   rows owned by the client, resource account, or webhook config.
5. Configure web OAuth surface, JS-SDK domain, web authorization domain, callback
   URL, message handling mode, and default QR/URL login entries.
6. Run diagnostics for AppID reachability, callback verification, redirect
   domain, JS-SDK domain, token exchange, and message callback signature.
7. Mark the account ready only after required diagnostics pass.

Operator-authorized official-account onboarding:

1. Create or select the provider integration for the operator platform.
2. Create `iam_oauth_operator_platform` for the WeChat component platform and
   configure component AppID, callback URLs, and capability defaults.
3. Store component secret, component verify ticket, callback token, and
   EncodingAESKey as `iam_oauth_secret`.
4. Generate a pre-authorization entry and complete the provider authorization
   callback.
5. Create or update `iam_oauth_resource_account` with
   `access_mode = operator_authorized_account`.
6. Create `iam_oauth_resource_authorization` with granted capabilities,
   authorizer token refs, refresh metadata, and expiry.
7. Allow menu/message/domain/template/material operations only when the
   authorization row is active and the capability is granted.

## Mini Program Standard Scenario

Mini programs are a first-class OAuth/provider-native login surface. They must
not be forced through browser redirect configuration. The standard model covers
WeChat Mini Program, Alipay Mini Program, DingTalk Mini Program, Lark Mini App,
Baidu Smart Program, Douyin Mini App, QQ Mini Program, and future provider-native
mini-program hosts.

Standard mapping:

| Mini-program concept | OAuth system table |
| --- | --- |
| Provider template | `iam_oauth_provider_catalog` with `protocol_family = mini_program_code` or `provider_native`. |
| Tenant integration | `iam_oauth_integration`. |
| Mini-program AppID/AppSecret/private key | `iam_oauth_client` plus `iam_oauth_secret`. |
| Mini-program account/application | `iam_oauth_resource_account` with `resource_account_kind = mini_program`. |
| Mini-program surface | `iam_oauth_surface` with `surface_kind = mini_program`. |
| Code-to-session login | `iam_oauth_flow_config` with `flow_kind = mini_program_code`. |
| Phone/profile authorization | `iam_oauth_flow_config` plus `iam_oauth_scope_profile`. |
| OpenID/UnionID/account mapping | `iam_oauth_claim_mapping` and `iam_oauth_account_link`. |
| Retained provider session key/token | `iam_oauth_grant` plus `iam_oauth_secret` when retention is allowed. |
| Mini-program URL/path entry | `iam_oauth_operational_resource` with `resource_kind = mini_program_url`. |

Rules:

- Mini-program login uses `/app/v3/api/oauth/mini_program_sessions` or the
  generic `/app/v3/api/oauth/sessions` with `flowKind = mini_program_code`.
- Mini-program login is an anonymous credential-entry operation and must reject
  inbound SDKWork credential/context headers.
- Mini-program `code`, encrypted phone/profile payloads, provider session keys,
  and decrypted sensitive claims must never be logged.
- OpenID is scoped to the mini-program account. UnionID is optional and must be
  mapped only when the provider and account binding make it available.
- Phone authorization must be explicit in scope/profile policy. A phone number
  alone must not auto-link accounts unless policy permits it.
- Mini-program AppID, environment, page path, release channel, and host platform
  are configured in `iam_oauth_surface`; login semantics are configured in
  `iam_oauth_flow_config`.
- WeChat Official Account and WeChat Mini Program may share a union identity
  scope through `provider_union_scope_id`, but they remain separate resource
  accounts and surfaces.

## Database Design

All tables are appbase IAM tables. The system of record is `sdkwork-appbase`.
Claw Router must not create product-local copies.

All tables follow the existing appbase portable SQL profile:

- `id TEXT PRIMARY KEY`.
- `uuid TEXT NOT NULL` for externally stable mutable records.
- `tenant_id TEXT NOT NULL` for tenant-owned rows unless explicitly global.
- `organization_id TEXT NOT NULL DEFAULT '0'` when tenant-level and
  organization-level config both matter.
- `status TEXT NOT NULL`.
- `created_at TEXT NOT NULL`.
- `updated_at TEXT NOT NULL` for mutable rows.
- `version INTEGER NOT NULL DEFAULT 1` for mutable configuration rows.
- JSON columns are stored as text in the current portable SQL profile and must
  contain deterministic JSON objects or arrays.
- Secret-bearing values are stored as `*_secret_ref`, `*_secret_hash`,
  `*_token_ref`, `*_token_hash`, or `*_key_ref`; never plaintext.

### Table Catalog

| Table | Purpose |
| --- | --- |
| `iam_oauth_provider_catalog` | Global/tenant provider templates, protocol metadata, endpoint defaults, field schemas. |
| `iam_oauth_integration` | Top-level tenant/app/provider integration instance and enabled capability purposes. |
| `iam_oauth_client` | Provider-issued client/app configuration for an integration. |
| `iam_oauth_secret` | Secret, private key, certificate, callback token, AES key, ticket token, and signing material references. |
| `iam_oauth_surface` | PC web, mobile web, native app, desktop, and mini-program bindings. |
| `iam_oauth_flow_config` | Enabled OAuth/provider-native flow configuration per client/surface. |
| `iam_oauth_scope_profile` | Scope bundles, consent labels, minimum scopes, and provider API purpose mapping. |
| `iam_oauth_claim_mapping` | Provider claim to IAM identity/profile/tenant mapping. |
| `iam_oauth_policy` | Login, linking, grant, risk, tenant binding, token retention, and rate-limit policy. |
| `iam_oauth_tenant_binding` | External provider tenant/corp/domain/directory to IAM tenant/organization mapping. |
| `iam_oauth_operator_platform` | Third-party operations platform configuration, such as WeChat component platform authorization. |
| `iam_oauth_resource_account` | Provider account/application/official-account/mini-program resource attached to an integration. |
| `iam_oauth_resource_authorization` | Self-managed or operator-authorized account authorization state and token references. |
| `iam_oauth_webhook_config` | Provider callback, message/event webhook, verification token, and encryption config. |
| `iam_oauth_operational_resource` | Provider-account resources such as menus, reply rules, QR entries, JS-SDK domains, auth domains, and template-message configs. |
| `iam_oauth_authorization_state` | One-time state/nonce/PKCE/device/callback validation state. |
| `iam_oauth_account_link` | Stable IAM user to provider account link. |
| `iam_oauth_grant` | Provider user/service grant, token refs, expiry, and revocation state. |
| `iam_oauth_callback_event` | Append-oriented OAuth runtime callback and token-exchange diagnostics. |
| `iam_oauth_diagnostic_run` | Operator-triggered configuration validation runs. |

### `iam_oauth_provider_catalog`

Purpose: provider dictionary and protocol template.

Profile: `dictionary_entity`, appbase-owned, global plus optional tenant custom
templates.

Key columns:

- `id`
- `uuid`
- `owner_tenant_id`: `0` for SDKWork global catalog, tenant id for custom
  provider templates.
- `provider_code`: stable code such as `google`, `wechat_open`,
  `wechat_official_account`, `wechat_mini_program`, `alipay`, `dingtalk`,
  `feishu`, `apple`, `microsoft_entra`, `github`, `custom_oidc`.
- `provider_family`: `china_social`, `china_enterprise`, `global_social`,
  `global_enterprise`, `developer`, `custom`.
- `provider_name`
- `provider_display_name`
- `region_group`: `CN`, `APAC`, `GLOBAL`, `CUSTOM`.
- `protocol_family`: `oauth2`, `oidc`, `oauth1a`, `mini_program_code`,
  `provider_native`.
- `issuer`
- `authorization_endpoint`
- `token_endpoint`
- `userinfo_endpoint`
- `jwks_uri`
- `discovery_url`
- `revocation_endpoint`
- `introspection_endpoint`
- `device_authorization_endpoint`
- `default_scopes_json`
- `required_scopes_json`
- `supported_surface_kinds_json`
- `supported_flow_kinds_json`
- `supported_capabilities_json`: provider capabilities such as `login`,
  `account_linking`, `client_credentials`, `account_authorization`,
  `menu_management`, `message_callback`, `js_sdk`, `web_oauth_domain`,
  `template_message`, `material_management`, `enterprise_sso`.
- `supported_resource_account_kinds_json`: official account, mini-program,
  enterprise app, payment app, social app, or custom account kinds supported by
  the provider.
- `supported_access_modes_json`: `self_managed_account`,
  `operator_authorized_account`, or provider-specific onboarding modes.
- `supports_pkce`
- `supports_nonce`
- `supports_state`
- `supports_refresh_token`
- `supports_id_token`
- `supports_userinfo`
- `supports_revocation`
- `supports_introspection`
- `supports_device_code`
- `supports_union_id`
- `client_auth_methods_json`
- `provider_client_field_schema_json`
- `provider_surface_field_schema_json`
- `provider_secret_field_schema_json`
- `provider_flow_field_schema_json`
- `provider_resource_account_field_schema_json`
- `provider_operator_platform_field_schema_json`
- `provider_webhook_field_schema_json`
- `provider_operational_resource_schema_json`
- `claim_schema_json`
- `diagnostic_schema_json`
- `documentation_url`
- `status`
- `sort_order`
- `catalog_version`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_provider_catalog_owner_code` on
  `(owner_tenant_id, provider_code)`.
- `idx_iam_oauth_provider_catalog_region_status` on
  `(region_group, status, sort_order, provider_code)`.
- `idx_iam_oauth_provider_catalog_protocol` on
  `(protocol_family, status, provider_code)`.
- `idx_iam_oauth_provider_catalog_capability` on
  `(region_group, provider_family, status, provider_code)`.

Notes:

- Provider-specific field schemas define which normalized and extension fields
  are required for each provider.
- Endpoint metadata is a default. Tenant/client rows may override endpoints for
  private Keycloak/custom OIDC, regional deployments, or enterprise-specific
  authorities.

### `iam_oauth_integration`

Purpose: top-level OAuth integration instance for a tenant/app/provider. This
prevents one table named "client" from carrying all product meaning.

Profile: `tenant_entity`, aggregate root.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `app_id`: SDKWork app id or `0` for tenant-wide config.
- `environment`: `development`, `test`, `production`, or `all`.
- `deployment_mode`: `saas`, `private`, `local`, or `all`.
- `provider_code`
- `provider_catalog_id`
- `integration_code`
- `display_name`
- `purpose_json`: enabled purposes such as `login`, `account_linking`,
  `api_delegation`, `client_credentials`, `enterprise_sso`, `token_broker`.
- `capability_json`: enabled provider capabilities such as
  `account_authorization`, `menu_management`, `message_callback`, `js_sdk`,
  `web_oauth_domain`, `template_message`, `material_management`, and
  `enterprise_tenant_sync`.
- `region_group`
- `protocol_family`
- `account_operation_enabled`
- `operator_authorization_enabled`
- `default_surface_id`
- `default_policy_id`
- `enabled`
- `health_status`: `unknown`, `ready`, `incomplete`, `warning`, `error`.
- `last_diagnostic_run_id`
- `last_validated_at`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_integration_code` on
  `(tenant_id, organization_id, app_id, environment, integration_code)`.
- `idx_iam_oauth_integration_provider` on
  `(tenant_id, organization_id, app_id, environment, provider_code, status)`.
- `idx_iam_oauth_integration_enabled` on
  `(tenant_id, organization_id, app_id, environment, enabled, health_status)`.
- `idx_iam_oauth_integration_capability` on
  `(tenant_id, organization_id, app_id, environment, provider_code, account_operation_enabled, operator_authorization_enabled, status)`.

### `iam_oauth_client`

Purpose: provider-issued OAuth client/app configuration for an integration.

Profile: `tenant_entity`, child entity of integration.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `provider_code`
- `client_code`
- `display_name`
- `provider_client_id`: provider client id, app id, app key, or service id.
- `provider_app_id`: provider-specific app id when different from
  `provider_client_id`.
- `provider_tenant_id`: corp id, Entra tenant id, Feishu/Lark tenant key, or
  equivalent enterprise tenant selector.
- `provider_account_id`: official account id, mini-program original id, or
  provider account selector when applicable.
- `issuer_override`
- `authorization_endpoint_override`
- `token_endpoint_override`
- `userinfo_endpoint_override`
- `jwks_uri_override`
- `discovery_url_override`
- `revocation_endpoint_override`
- `introspection_endpoint_override`
- `device_authorization_endpoint_override`
- `default_scope_profile_id`
- `client_auth_method`: `none`, `client_secret_basic`,
  `client_secret_post`, `private_key_jwt`, `tls_client_auth`,
  `provider_signed_request`.
- `pkce_default_mode`: `required`, `preferred`, `disabled`.
- `provider_config_json`: provider-specific non-secret configuration only.
- `secret_config_status`: `missing`, `configured`, `rotating`, `expired`.
- `enabled`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_client_code` on
  `(tenant_id, organization_id, integration_id, client_code)`.
- unique `uk_iam_oauth_client_provider_client` on
  `(tenant_id, organization_id, provider_code, provider_client_id)`.
- `idx_iam_oauth_client_integration` on
  `(tenant_id, organization_id, integration_id, enabled, status)`.

Notes:

- `id`/`uuid` are internal identifiers. `provider_client_id` is the identifier
  issued by the external provider.
- This table stores no secret values. Secret material goes to
  `iam_oauth_secret`.

### `iam_oauth_secret`

Purpose: server-side references to secrets, app secrets, private keys,
certificates, provider signing material, callback tokens, EncodingAESKey values,
component verify tickets, OAuth 1 token secrets, and retained provider tokens.

Profile: `tenant_entity`, secret reference configuration. A secret can belong to
an integration, client, operator platform, resource account, resource
authorization, webhook config, or grant.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `secret_owner_kind`: `integration`, `client`, `operator_platform`,
  `resource_account`, `resource_authorization`, `webhook_config`, `grant`.
- `secret_owner_id`
- `integration_id`
- `oauth_client_id`
- `resource_account_id`
- `operator_platform_id`
- `resource_authorization_id`
- `webhook_config_id`
- `grant_id`
- `secret_kind`: `client_secret`, `app_secret`, `private_key`,
  `jwt_signing_key`, `certificate`, `provider_public_key`,
  `provider_certificate`, `oauth1_token_secret`, `callback_token`,
  `encoding_aes_key`, `component_verify_ticket`, `access_token`,
  `refresh_token`, `authorizer_refresh_token`.
- `provider_key_id`: Apple key id, certificate serial, provider key id, or
  equivalent key selector.
- `algorithm`: `RSA2`, `RS256`, `ES256`, or provider-defined algorithm.
- `secret_ref`: KMS/secret-manager reference.
- `secret_hash`: fingerprint for audit and rotation verification.
- `public_fingerprint`
- `active_from`
- `active_until`
- `rotated_at`
- `rotation_batch_id`
- `status`
- `created_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- `idx_iam_oauth_secret_owner_active` on
  `(tenant_id, organization_id, secret_owner_kind, secret_owner_id, secret_kind, status, active_from, active_until)`.
- `idx_iam_oauth_secret_client_active` on
  `(tenant_id, organization_id, oauth_client_id, secret_kind, status, active_from, active_until)`.
- `idx_iam_oauth_secret_resource_authorization_active` on
  `(tenant_id, organization_id, resource_authorization_id, secret_kind, status, active_from, active_until)`.
- `idx_iam_oauth_secret_webhook_active` on
  `(tenant_id, organization_id, webhook_config_id, secret_kind, status, active_from, active_until)`.
- unique `uk_iam_oauth_secret_hash` on
  `(tenant_id, organization_id, secret_owner_kind, secret_owner_id, secret_kind, secret_hash)`.

Notes:

- Multiple active secret rows are allowed only during explicit rotation windows.
- Backend API responses must redact `secret_ref`.
- Owner-specific id columns duplicate `secret_owner_kind`/`secret_owner_id` for
  queryability and validation. Exactly one concrete owner id column must be set
  for each row according to `secret_owner_kind`.

### `iam_oauth_surface`

Purpose: per-surface redirect URI, app binding, domain binding, and PKCE/client
auth mode.

Profile: `tenant_entity`, child entity of client or integration.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `oauth_client_id`
- `surface_kind`: `pc_web`, `mobile_web`, `ios_app`, `android_app`,
  `desktop_app`, `mini_program`, `server`.
- `surface_code`
- `display_name`
- `redirect_uri`
- `redirect_uri_hash`
- `callback_path`
- `allowed_origin`
- `allowed_redirect_hosts_json`
- `default_post_login_redirect`
- `redirect_validation_mode`: `exact`, `registered_host`,
  `private_scheme`, `universal_link`, `app_link`, `none`.
- `pkce_mode`: `required`, `preferred`, `disabled`.
- `client_auth_method`
- `web_domain`
- `h5_domain`
- `desktop_app_id`
- `custom_url_scheme`
- `universal_link_domain`
- `app_link_domain`
- `ios_bundle_id`
- `ios_team_id`
- `ios_app_store_id`
- `android_package_name`
- `android_sha1_fingerprint`
- `android_sha256_fingerprint`
- `android_play_store_package`
- `mini_program_app_id`
- `mini_program_original_id`
- `mini_program_environment`
- `mini_program_provider`: `wechat`, `alipay`, `dingtalk`, `lark`, `baidu`,
  `douyin`, `qq`, `custom`.
- `mini_program_release_channel`: `develop`, `trial`, `production`, `all`.
- `mini_program_path`
- `mini_program_query_template`
- `mini_program_scene`
- `provider_surface_config_json`
- `enabled`
- `status`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_surface_code` on
  `(tenant_id, organization_id, integration_id, surface_code)`.
- unique `uk_iam_oauth_surface_redirect` on
  `(tenant_id, organization_id, oauth_client_id, surface_kind, redirect_uri_hash)`.
- `idx_iam_oauth_surface_lookup` on
  `(tenant_id, organization_id, integration_id, oauth_client_id, surface_kind, enabled, status)`.
- `idx_iam_oauth_surface_mobile` on
  `(tenant_id, organization_id, surface_kind, ios_bundle_id, android_package_name, status)`.
- `idx_iam_oauth_surface_mini_program` on
  `(tenant_id, organization_id, mini_program_app_id, mini_program_environment, status)`.
- `idx_iam_oauth_surface_mini_program_channel` on
  `(tenant_id, organization_id, mini_program_provider, mini_program_app_id, mini_program_release_channel, enabled, status)`.

### `iam_oauth_flow_config`

Purpose: declare which OAuth/provider-native flows are enabled for an
integration, client, and optional surface.

Profile: `tenant_entity`, configuration child entity.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `oauth_client_id`
- `surface_id`
- `flow_kind`: `authorization_code`, `authorization_code_pkce`,
  `client_credentials`, `device_code`, `refresh_token`, `jwt_bearer`,
  `token_exchange`, `oauth1a`, `mini_program_code`, `provider_native`.
- `flow_purpose`: `login`, `account_linking`, `api_delegation`,
  `service_access`, `diagnostic`.
- `scope_profile_id`
- `requires_pkce`
- `requires_nonce`
- `requires_state`
- `requires_user_consent`
- `allowed_response_types_json`
- `allowed_grant_types_json`
- `token_endpoint_auth_method`
- `provider_code_exchange_endpoint_override`
- `mini_program_code_ttl_seconds`
- `mini_program_phone_authorization_enabled`
- `mini_program_profile_authorization_enabled`
- `provider_session_key_retention_policy`: `none`, `hash_only`,
  `encrypted_ref`.
- `flow_config_json`
- `enabled`
- `status`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_flow_config_scope` on
  `(tenant_id, organization_id, integration_id, oauth_client_id, surface_id, flow_kind, flow_purpose)`.
- `idx_iam_oauth_flow_config_enabled` on
  `(tenant_id, organization_id, integration_id, flow_kind, enabled, status)`.
- `idx_iam_oauth_flow_config_surface` on
  `(tenant_id, organization_id, surface_id, flow_kind, flow_purpose, enabled, status)`.

### `iam_oauth_scope_profile`

Purpose: define reusable scope bundles and consent display metadata.

Profile: `tenant_entity`, dictionary child entity.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `provider_code`
- `scope_profile_code`
- `display_name`
- `purpose`: `login`, `profile`, `email`, `phone`, `api_delegation`,
  `offline_access`, `service_access`, `custom`.
- `requested_scopes_json`
- `required_scopes_json`
- `blocked_scopes_json`
- `consent_label`
- `consent_description`
- `provider_api_purpose_json`
- `minimum_for_login`
- `offline_access_requested`
- `status`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_scope_profile_code` on
  `(tenant_id, organization_id, integration_id, scope_profile_code)`.
- `idx_iam_oauth_scope_profile_purpose` on
  `(tenant_id, organization_id, integration_id, purpose, status)`.

### `iam_oauth_claim_mapping`

Purpose: normalize provider identity claims into IAM user identity, profile, and
organization/tenant binding facts.

Profile: `tenant_entity`, child entity of integration with optional client or
surface override.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `oauth_client_id`
- `surface_id`
- `mapping_code`
- `subject_claim`
- `union_id_claim`
- `open_id_claim`
- `external_tenant_claim`
- `email_claim`
- `email_verified_claim`
- `phone_claim`
- `phone_verified_claim`
- `display_name_claim`
- `avatar_url_claim`
- `locale_claim`
- `subject_strategy`: `subject`, `union_id`, `open_id`, `tenant_subject`,
  `custom_expression`.
- `account_linking_key_kind`: `external_subject`, `union_id`,
  `verified_email`, `verified_phone`, `manual`.
- `claim_transform_rules_json`
- `profile_defaults_json`
- `tenant_binding_rules_json`
- `organization_binding_rules_json`
- `required_claims_json`
- `status`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_claim_mapping_scope` on
  `(tenant_id, organization_id, integration_id, oauth_client_id, surface_id, mapping_code)`.
- `idx_iam_oauth_claim_mapping_integration` on
  `(tenant_id, organization_id, integration_id, status)`.

### `iam_oauth_policy`

Purpose: enforce login, linking, grant, tenant binding, MFA/risk, scope,
retention, and rate-limit policy.

Profile: `tenant_entity`, policy entity.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `policy_scope`: `tenant`, `organization`, `integration`, `oauth_client`,
  `surface`, `provider`, `flow`.
- `provider_code`
- `integration_id`
- `oauth_client_id`
- `surface_id`
- `flow_kind`
- `login_enabled`
- `api_delegation_enabled`
- `client_credentials_enabled`
- `auto_registration_enabled`
- `account_linking_policy`: `disabled`, `manual`, `trusted_subject`,
  `verified_email`, `verified_phone`, `union_id`.
- `new_user_status`
- `tenant_resolution_policy`: `configured_tenant`, `provider_tenant_claim`,
  `email_domain`, `tenant_binding`, `manual_review`.
- `organization_resolution_policy`: `none`, `default_organization`,
  `tenant_binding`, `domain_mapping`, `manual_selection`.
- `email_domain_allowlist_json`
- `phone_country_allowlist_json`
- `external_tenant_allowlist_json`
- `required_scope_profile_id`
- `mfa_policy`: `none`, `risk_based`, `always`, `provider_assurance`.
- `risk_policy_code`
- `consent_required`
- `provider_token_storage_policy`: `none`, `access_token_only`,
  `refresh_token_allowed`, `service_token_allowed`.
- `provider_refresh_token_retention_days`
- `provider_access_token_retention_minutes`
- `session_lifetime_policy_json`
- `rate_limit_policy_json`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- `idx_iam_oauth_policy_scope` on
  `(tenant_id, organization_id, policy_scope, provider_code, integration_id, oauth_client_id, surface_id, status)`.
- `idx_iam_oauth_policy_login_enabled` on
  `(tenant_id, organization_id, login_enabled, status)`.
- `idx_iam_oauth_policy_delegation_enabled` on
  `(tenant_id, organization_id, api_delegation_enabled, client_credentials_enabled, status)`.

### `iam_oauth_tenant_binding`

Purpose: map provider enterprise tenants, corp IDs, domains, directories, or
issuers to IAM tenant/organization context.

Profile: `tenant_entity`, policy relation.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `provider_code`
- `integration_id`
- `oauth_client_id`
- `binding_kind`: `external_tenant`, `corp_id`, `email_domain`,
  `directory_id`, `issuer`, `custom`.
- `external_tenant_id`
- `external_tenant_name_snapshot`
- `external_domain`
- `issuer`
- `mapped_tenant_id`
- `mapped_organization_id`
- `default_department_id`
- `auto_join_enabled`
- `allowed_user_patterns_json`
- `denied_user_patterns_json`
- `binding_config_json`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_tenant_binding_external` on
  `(tenant_id, organization_id, provider_code, binding_kind, external_tenant_id, external_domain, issuer)`.
- `idx_iam_oauth_tenant_binding_target` on
  `(tenant_id, mapped_tenant_id, mapped_organization_id, status)`.
- `idx_iam_oauth_tenant_binding_integration` on
  `(tenant_id, organization_id, integration_id, oauth_client_id, status)`.

### `iam_oauth_operator_platform`

Purpose: model provider-side third-party or operations platforms that can obtain
authorization to manage provider resource accounts. The canonical example is a
WeChat Open Platform third-party platform (`component_appid`) that manages
official accounts or mini-programs after customer authorization.

Profile: `tenant_entity`, operator integration entity.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `provider_code`
- `platform_code`
- `display_name`
- `operator_mode`: `self_operated`, `agency_operated`, `marketplace_app`,
  `platform_component`.
- `provider_platform_id`: component app id, platform app id, marketplace app id,
  or provider-side platform identifier.
- `provider_tenant_id`
- `provider_account_id`: provider-side account or business id for the operator
  platform when distinct from `provider_platform_id`.
- `authorization_status`: `not_configured`, `pending_authorization`,
  `authorized`, `expired`, `revoked`, `failed`.
- `authorization_entry_url`
- `authorization_callback_url`
- `event_callback_url`
- `message_callback_url`
- `webhook_verify_status`: `unknown`, `pending`, `verified`, `failed`.
- `ticket_secret_status`: `missing`, `configured`, `rotating`, `expired`.
- `token_secret_status`: `missing`, `configured`, `rotating`, `expired`.
- `capability_json`: supported operations such as `account_authorization`,
  `menu_management`, `message_callback`, `js_sdk`, `web_oauth_domain`,
  `template_message`, `material_management`.
- `provider_config_json`: non-secret provider platform settings.
- `enabled`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_operator_platform_code` on
  `(tenant_id, organization_id, integration_id, platform_code)`.
- unique `uk_iam_oauth_operator_platform_provider_id` on
  `(tenant_id, organization_id, provider_code, provider_platform_id)`.
- `idx_iam_oauth_operator_platform_enabled` on
  `(tenant_id, organization_id, provider_code, enabled, status)`.
- `idx_iam_oauth_operator_platform_authorization` on
  `(tenant_id, organization_id, provider_code, authorization_status, status)`.

Notes:

- Component verify tickets, component access tokens, callback tokens, and AES
  keys are stored through `iam_oauth_secret`.
- This table is distinct from `iam_oauth_client`: the operator platform is the
  management platform, while clients and resource accounts are provider apps or
  customer-authorized resources.

### `iam_oauth_resource_account`

Purpose: represent provider resource accounts connected to SDKWork/appbase. For
WeChat this covers official accounts, mini-programs, and open-platform app
resources; for Alipay it covers applications; for DingTalk/Feishu it can cover
enterprise apps or tenants.

Profile: `tenant_entity`, resource account entity.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `oauth_client_id`
- `operator_platform_id`: nullable; set for operator-authorized accounts.
- `provider_code`
- `resource_account_code`
- `resource_account_kind`: `official_account`, `mini_program`, `open_app`,
  `enterprise_app`, `payment_app`, `social_app`, `custom`.
- `access_mode`: `self_managed_account`, `operator_authorized_account`.
- `display_name`
- `provider_account_id`: app id, authorizer app id, official account app id, or
  equivalent provider id.
- `provider_account_original_id`: WeChat original id or provider native account
  original id.
- `provider_union_scope_id`: open-platform id, union id scope, or provider
  grouping identifier.
- `provider_account_type`: provider-specific account type such as
  `subscription`, `service`, `verified_service`, `mini_program`, `enterprise`.
- `provider_account_region`
- `subject_name_snapshot`
- `principal_name_snapshot`
- `service_category`
- `verification_status`: `unknown`, `unverified`, `verified`, `rejected`,
  `expired`.
- `authorization_status`: `not_authorized`, `authorized`, `unauthorized`,
  `expired`, `failed`.
- `capability_json`: granted/available capabilities.
- `self_managed_config_status`: `not_required`, `missing`, `incomplete`,
  `ready`, `failed`.
- `operator_authorization_status`: `not_required`, `pending`, `authorized`,
  `expired`, `revoked`, `failed`.
- `webhook_verify_status`: `unknown`, `pending`, `verified`, `failed`.
- `domain_verify_status`: `unknown`, `pending`, `verified`, `failed`,
  `not_required`.
- `default_web_oauth_surface_id`
- `default_mini_program_surface_id`
- `default_login_entry_resource_id`
- `qr_default_enabled`
- `last_authorized_at`
- `last_authorization_refreshed_at`
- `last_verified_at`
- `provider_config_json`: non-secret account-specific settings.
- `enabled`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_resource_account_code` on
  `(tenant_id, organization_id, integration_id, resource_account_code)`.
- unique `uk_iam_oauth_resource_account_provider_id` on
  `(tenant_id, organization_id, provider_code, resource_account_kind, provider_account_id)`.
- `idx_iam_oauth_resource_account_operator` on
  `(tenant_id, organization_id, operator_platform_id, authorization_status, status)`.
- `idx_iam_oauth_resource_account_kind` on
  `(tenant_id, organization_id, provider_code, resource_account_kind, enabled, status)`.
- `idx_iam_oauth_resource_account_readiness` on
  `(tenant_id, organization_id, provider_code, resource_account_kind, self_managed_config_status, operator_authorization_status, status)`.

Notes:

- Self-managed accounts store app secret/callback token/AES key through
  `iam_oauth_secret` with owner kind `resource_account` or `webhook_config`.
- Operator-authorized accounts store authorizer refresh tokens through
  `iam_oauth_secret` with owner kind `resource_authorization`.

### `iam_oauth_resource_authorization`

Purpose: record how a provider resource account was authorized and which
capabilities were granted. This supports both self-managed account onboarding
and operator-platform authorization flows.

Profile: `tenant_entity`, authorization fact.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `resource_account_id`
- `operator_platform_id`
- `oauth_client_id`
- `provider_code`
- `authorization_mode`: `self_configured_secret`,
  `operator_authorization_code`, `provider_console_binding`,
  `manual_verified`.
- `authorization_code_hash`
- `pre_auth_code_hash`
- `authorizer_access_token_hash`
- `authorizer_refresh_token_secret_ref`
- `authorized_scopes_json`
- `authorized_capabilities_json`
- `authorization_info_json`: redacted provider authorization metadata.
- `pre_auth_expires_at`
- `authorized_at`
- `expires_at`
- `revoked_at`
- `last_refreshed_at`
- `next_refresh_at`
- `last_refresh_error_code`
- `last_refresh_error_at`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- `idx_iam_oauth_resource_authorization_account` on
  `(tenant_id, organization_id, resource_account_id, status, authorized_at)`.
- `idx_iam_oauth_resource_authorization_operator` on
  `(tenant_id, organization_id, operator_platform_id, status, authorized_at)`.
- `idx_iam_oauth_resource_authorization_expiry` on
  `(status, expires_at, last_refreshed_at)`.
- `idx_iam_oauth_resource_authorization_refresh` on
  `(tenant_id, organization_id, status, next_refresh_at)`.

Notes:

- Authorization codes, pre-auth codes, authorizer access tokens, and refresh
  tokens must not be stored plaintext.
- For WeChat third-party platforms, this table stores the authorized official
  account or mini-program capability set and token lifecycle metadata.

### `iam_oauth_webhook_config`

Purpose: provider callback and event/message webhook configuration. For WeChat
Official Account this covers URL, token, EncodingAESKey, encryption mode, event
callback status, and message callback status. For operator platforms it covers
component ticket callbacks and authorization callbacks.

Profile: `tenant_entity`, callback configuration.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `resource_account_id`
- `operator_platform_id`
- `provider_code`
- `webhook_code`
- `webhook_kind`: `oauth_callback`, `operator_authorization_callback`,
  `resource_authorization_callback`, `message_callback`, `event_callback`,
  `ticket_callback`, `payment_notify`, `custom`.
- `callback_url`
- `callback_url_hash`
- `callback_public_id`: stable non-secret id used in provider callback ingress
  URLs.
- `callback_path_token_hash`: optional random path token hash when a provider
  supports opaque callback URLs.
- `verification_token_status`: `missing`, `configured`, `rotating`, `expired`.
- `encoding_aes_key_status`: `missing`, `configured`, `rotating`, `expired`,
  `not_required`.
- `encryption_mode`: `plain`, `compatible`, `secure`, `provider_default`.
- `signature_algorithm`
- `allowed_event_types_json`
- `message_handling_mode`: `disabled`, `receive_only`, `auto_reply`,
  `forward_to_service`.
- `forward_target_ref`
- `last_verified_at`
- `last_verify_error_code`
- `last_event_at`
- `last_event_id`
- `provider_config_json`
- `enabled`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_webhook_config_code` on
  `(tenant_id, organization_id, resource_account_id, webhook_code)`.
- unique `uk_iam_oauth_webhook_config_public` on `(callback_public_id)`.
- `idx_iam_oauth_webhook_config_kind` on
  `(tenant_id, organization_id, provider_code, webhook_kind, enabled, status)`.
- `idx_iam_oauth_webhook_config_callback` on `(callback_url_hash)`.

Notes:

- Callback token and EncodingAESKey values are stored through
  `iam_oauth_secret`; this table stores only status and routing metadata.

### `iam_oauth_operational_resource`

Purpose: provider-account operational resources controlled through the OAuth
system. This covers WeChat Official Account menus, URL/QR entries, JS-SDK domain
bindings, web authorization domains, auto-reply/message rules, template-message
configs, mini-program URL entries, and provider-specific operational resources.

Profile: `tenant_entity`, provider resource configuration.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `resource_account_id`
- `provider_code`
- `resource_kind`: `menu`, `menu_entry`, `qr_entry`, `url_entry`,
  `js_sdk_domain`, `web_oauth_domain`, `message_reply_rule`,
  `template_message`, `mini_program_url`, `material_group`, `custom`.
- `resource_code`
- `display_name`
- `parent_resource_id`
- `resource_type`: provider-specific subtype such as `click`, `view`,
  `mini_program`, `text_reply`, `image_reply`, `template`.
- `target_url`
- `target_url_hash`
- `target_app_id`
- `target_path`
- `match_rule_json`
- `content_snapshot_json`
- `provider_resource_id`
- `provider_revision`
- `sync_mode`: `manual`, `auto`, `provider_managed`.
- `publish_status`: `draft`, `pending`, `published`, `failed`, `disabled`.
- `published_at`
- `last_publish_error_code`
- `last_publish_error_at`
- `last_synced_at`
- `sort_order`
- `provider_config_json`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_operational_resource_code` on
  `(tenant_id, organization_id, resource_account_id, resource_kind, resource_code)`.
- `idx_iam_oauth_operational_resource_account` on
  `(tenant_id, organization_id, resource_account_id, resource_kind, publish_status, status)`.
- `idx_iam_oauth_operational_resource_parent` on
  `(tenant_id, organization_id, parent_resource_id, sort_order, status)`.
- `idx_iam_oauth_operational_resource_target` on
  `(tenant_id, organization_id, resource_kind, target_url_hash, status)`.

Notes:

- This table replaces the old Claw Router `open_platform_entry` concept with a
  provider-agnostic operational resource model.
- Menus and message rules can be modeled as parent/child resources with
  provider-specific payload snapshots in `content_snapshot_json`.

### `iam_oauth_authorization_state`

Purpose: one-time authorization state, nonce, PKCE, device-code, callback
validation, and safe return target storage.

Profile: `temporary`, security-sensitive runtime table.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `app_id`
- `environment`
- `provider_code`
- `integration_id`
- `oauth_client_id`
- `surface_id`
- `surface_kind`
- `flow_kind`
- `state_hash`
- `nonce_hash`
- `pkce_challenge`
- `pkce_challenge_method`
- `code_verifier_secret_ref`
- `device_code_hash`
- `user_code_hash`
- `redirect_uri`
- `redirect_uri_hash`
- `requested_scopes_json`
- `return_path`
- `return_url_hash`
- `device_id_hash`
- `request_ip_hash`
- `user_agent_hash`
- `status`: `created`, `consumed`, `expired`, `failed`.
- `expires_at`
- `consumed_at`
- `failed_at`
- `created_at`

Indexes:

- unique `uk_iam_oauth_authorization_state_hash` on `(state_hash)`.
- `idx_iam_oauth_authorization_state_expiry` on
  `(status, expires_at, created_at)`.
- `idx_iam_oauth_authorization_state_client` on
  `(tenant_id, organization_id, integration_id, oauth_client_id, surface_id, status, created_at)`.

Notes:

- State values, nonces, device codes, user codes, and PKCE verifiers are never
  stored plaintext.

### `iam_oauth_account_link`

Purpose: stable link between IAM users and external provider accounts.

Profile: `tenant_entity`, identity relation.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `user_id`
- `provider_code`
- `integration_id`
- `oauth_client_id`
- `external_subject`
- `external_subject_hash`
- `external_union_id`
- `external_union_id_hash`
- `external_open_id`
- `external_open_id_hash`
- `external_tenant_id`
- `external_account_display_snapshot`
- `email_hash`
- `phone_hash`
- `email_verified`
- `phone_verified`
- `link_source`: `auto_registration`, `trusted_link`, `manual_admin`,
  `user_self_service`.
- `last_login_at`
- `linked_at`
- `unlinked_at`
- `status`
- `claim_snapshot_json`: redacted, non-secret snapshot for diagnostics.
- `created_at`
- `updated_at`
- `version`

Indexes:

- unique `uk_iam_oauth_account_link_subject` on
  `(tenant_id, provider_code, external_subject_hash)`.
- `idx_iam_oauth_account_link_user` on
  `(tenant_id, organization_id, user_id, status, provider_code)`.
- `idx_iam_oauth_account_link_union` on
  `(tenant_id, provider_code, external_union_id_hash, status)`.
- `idx_iam_oauth_account_link_external_tenant` on
  `(tenant_id, provider_code, external_tenant_id, status)`.

Notes:

- Keep `iam_user_identity` as the existing IAM identity projection. This table
  becomes the richer OAuth system of record for external identities.

### `iam_oauth_grant`

Purpose: provider user/service grant, token retention, and revocation state.

Profile: `tenant_entity`, credential-like relation.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `grant_owner_kind`: `user`, `service`, `tenant`.
- `user_id`
- `service_principal_id`
- `account_link_id`
- `provider_code`
- `integration_id`
- `oauth_client_id`
- `surface_id`
- `flow_kind`
- `authorized_scopes_json`
- `access_token_ref`
- `access_token_hash`
- `refresh_token_ref`
- `refresh_token_hash`
- `id_token_hash`
- `token_expires_at`
- `refresh_token_expires_at`
- `issued_at`
- `last_refreshed_at`
- `revoked_at`
- `status`
- `created_at`
- `updated_at`
- `version`

Indexes:

- `idx_iam_oauth_grant_user` on
  `(tenant_id, organization_id, user_id, provider_code, status)`.
- `idx_iam_oauth_grant_service` on
  `(tenant_id, organization_id, service_principal_id, provider_code, status)`.
- `idx_iam_oauth_grant_account_link` on
  `(tenant_id, account_link_id, oauth_client_id, status)`.
- `idx_iam_oauth_grant_expiry` on
  `(status, token_expires_at, refresh_token_expires_at)`.

Notes:

- Grant rows may exist without storing provider tokens when policy is `none`.
- If provider tokens are retained, refs must point to encrypted secret storage.

### `iam_oauth_callback_event`

Purpose: append-oriented diagnostics and audit-friendly runtime event record.

Profile: `event_log`.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `app_id`
- `environment`
- `provider_code`
- `integration_id`
- `oauth_client_id`
- `surface_id`
- `authorization_state_id`
- `request_id`
- `flow_kind`
- `outcome`: `authorization_url_created`, `callback_received`,
  `token_exchange_failed`, `session_created`, `account_linked`,
  `grant_created`, `grant_refreshed`, `grant_revoked`, `policy_rejected`,
  `state_invalid`, `nonce_invalid`, `pkce_invalid`,
  `provider_event_received`, `provider_event_processed`,
  `provider_event_rejected`, `operator_ticket_received`,
  `resource_authorization_completed`.
- `error_code`
- `provider_error_code`
- `provider_http_status`
- `provider_event_id`
- `provider_event_type`
- `webhook_config_id`
- `resource_account_id`
- `operator_platform_id`
- `external_subject_hash`
- `redirect_uri_hash`
- `state_valid`
- `nonce_valid`
- `pkce_valid`
- `token_exchange_ms`
- `userinfo_fetch_ms`
- `request_ip_hash`
- `user_agent_hash`
- `detail_json`: redacted structured diagnostics.
- `created_at`

Indexes:

- `idx_iam_oauth_callback_event_client` on
  `(tenant_id, organization_id, integration_id, oauth_client_id, surface_id, created_at)`.
- `idx_iam_oauth_callback_event_outcome` on
  `(tenant_id, organization_id, outcome, created_at)`.
- `idx_iam_oauth_callback_event_request` on `(request_id)`.
- `idx_iam_oauth_callback_event_provider_event` on
  `(tenant_id, organization_id, provider_code, provider_event_type, created_at)`.
- `idx_iam_oauth_callback_event_webhook` on
  `(tenant_id, organization_id, webhook_config_id, outcome, created_at)`.

### `iam_oauth_diagnostic_run`

Purpose: record operator-triggered validation of OAuth provider, integration,
client, surface, secret, discovery, JWKS, redirect, flow, scope, and claim
mapping configuration.

Profile: `event_log` plus operator audit.

Key columns:

- `id`
- `uuid`
- `tenant_id`
- `organization_id`
- `integration_id`
- `oauth_client_id`
- `surface_id`
- `provider_code`
- `run_kind`: `catalog_validation`, `config_validation`, `discovery_check`,
  `jwks_check`, `redirect_check`, `flow_check`, `scope_check`,
  `token_exchange_dry_run`, `claim_mapping_check`.
- `status`: `queued`, `running`, `passed`, `failed`, `cancelled`.
- `started_at`
- `finished_at`
- `duration_ms`
- `operator_user_id`
- `request_id`
- `result_code`
- `result_summary`
- `redacted_result_json`
- `created_at`

Indexes:

- `idx_iam_oauth_diagnostic_run_integration` on
  `(tenant_id, organization_id, integration_id, status, created_at)`.
- `idx_iam_oauth_diagnostic_run_operator` on
  `(tenant_id, organization_id, operator_user_id, created_at)`.

Notes:

- Diagnostic runs must never store raw secrets, auth codes, tokens, full state,
  nonces, PKCE verifiers, device codes, or full provider claims.

## API Design

### App API

Surface: `sdkwork-iam-app-api`

Prefix: `/app/v3/api`

Audience: application clients, PC web, mobile web, desktop shells, native apps,
mini-program bridges, and user-facing account linking.

Resource group: `oauth`

Auth rules:

- Provider discovery can be anonymous.
- Authorization URL creation, callback handling, and OAuth session creation are
  anonymous credential-entry operations.
- Credential-entry operations must declare `security: []`,
  `x-sdkwork-auth-mode: anonymous`, and
  `x-sdkwork-forbid-credential-headers: true`.
- Account link listing, unlinking, grant listing, and grant revocation are
  protected app-api operations using the standard dual-token model.

Canonical routes:

| Method | Path | Operation ID | Purpose |
| --- | --- | --- | --- |
| GET | `/app/v3/api/oauth/providers` | `oauth.providers.list` | Return enabled providers/surfaces/flows for the current app/environment/tenant context. |
| POST | `/app/v3/api/oauth/authorization_urls` | `oauth.authorizationUrls.create` | Create state/nonce/PKCE and return provider authorization URL or native handoff instruction. |
| POST | `/app/v3/api/oauth/device_authorizations` | `oauth.deviceAuthorizations.create` | Create device-code authorization when provider supports it. |
| GET | `/app/v3/api/oauth/callbacks/{providerCode}` | `oauth.callbacks.handleGet` | Browser/provider redirect callback for GET-based providers. |
| POST | `/app/v3/api/oauth/callbacks/{providerCode}` | `oauth.callbacks.handlePost` | Provider callback for POST-based providers when required. |
| POST | `/app/v3/api/oauth/mini_program_sessions` | `oauth.miniProgramSessions.create` | Exchange provider mini-program code and optional phone/profile authorization payload for an IAM session or account-link continuation. |
| POST | `/app/v3/api/oauth/sessions` | `oauth.sessions.create` | Exchange provider callback/code/id token/mini-program code for a real appbase IAM session or organization-selection continuation. |
| GET | `/app/v3/api/oauth/account_links` | `oauth.accountLinks.list` | List current user's linked OAuth accounts. |
| DELETE | `/app/v3/api/oauth/account_links/{accountLinkId}` | `oauth.accountLinks.delete` | Unlink current user's provider account when policy permits. |
| GET | `/app/v3/api/oauth/grants` | `oauth.grants.list` | List current user's retained provider grants. |
| DELETE | `/app/v3/api/oauth/grants/{grantId}` | `oauth.grants.delete` | Revoke a retained provider grant/token reference when policy permits. |

### Provider Ingress Open API

Surface: `sdkwork-iam-open-api`

Prefix: `/iam/v3/api`

Audience: external OAuth providers and provider platform servers that call back
into SDKWork/appbase for verification, message/event delivery, tickets, and
resource-account authorization notifications.

Resource group: `iam.oauth`

Auth rules:

- Provider ingress routes are not user login/session creation routes.
- Provider ingress routes must not use SDKWork user dual-token auth.
- Provider ingress routes must authenticate the provider callback using the
  configured callback public id, signature, timestamp, nonce/replay rules,
  verification token, encryption mode, and provider account/operator ownership.
- Provider ingress routes must never trust request query/body tenant fields.
  Tenant/resource resolution comes from `iam_oauth_webhook_config` and related
  appbase OAuth records.
- Provider ingress routes must produce redacted `iam_oauth_callback_event`
  records.

Canonical routes:

| Method | Path | Operation ID | Purpose |
| --- | --- | --- | --- |
| GET | `/iam/v3/api/oauth/provider_callbacks/{callbackPublicId}` | `iam.oauth.providerCallbacks.handleGet` | Provider verification/event callback ingress for providers that verify via GET. |
| POST | `/iam/v3/api/oauth/provider_callbacks/{callbackPublicId}` | `iam.oauth.providerCallbacks.handlePost` | Provider event/message/ticket/authorization callback ingress. |

### Backend API

Surface: `sdkwork-iam-backend-api`

Prefix: `/backend/v3/api`

Audience: admin consoles, internal operators, backend automation.

Resource group: `iam.oauth`

Auth rules:

- All backend routes are protected backend-api dual-token routes.
- Backend routes must not create login sessions.
- Backend routes must enforce least-privilege permissions and write audit
  events for create/update/delete/rotate/enable/disable actions.

Canonical routes:

| Method | Path | Operation ID | Purpose |
| --- | --- | --- | --- |
| GET | `/backend/v3/api/iam/oauth/provider_catalog` | `iam.oauth.providerCatalog.list` | List global and tenant custom provider templates. |
| GET | `/backend/v3/api/iam/oauth/provider_catalog/{providerCode}` | `iam.oauth.providerCatalog.retrieve` | Retrieve provider schema, protocol metadata, and requirements. |
| POST | `/backend/v3/api/iam/oauth/provider_catalog` | `iam.oauth.providerCatalog.create` | Create tenant custom provider template. |
| PATCH | `/backend/v3/api/iam/oauth/provider_catalog/{providerCatalogId}` | `iam.oauth.providerCatalog.update` | Update tenant custom provider template. |
| GET | `/backend/v3/api/iam/oauth/integrations` | `iam.oauth.integrations.list` | List top-level OAuth integrations. |
| POST | `/backend/v3/api/iam/oauth/integrations` | `iam.oauth.integrations.create` | Create top-level OAuth integration. |
| GET | `/backend/v3/api/iam/oauth/integrations/{integrationId}` | `iam.oauth.integrations.retrieve` | Retrieve OAuth integration. |
| PATCH | `/backend/v3/api/iam/oauth/integrations/{integrationId}` | `iam.oauth.integrations.update` | Update OAuth integration. |
| DELETE | `/backend/v3/api/iam/oauth/integrations/{integrationId}` | `iam.oauth.integrations.delete` | Disable/delete OAuth integration. |
| GET | `/backend/v3/api/iam/oauth/clients` | `iam.oauth.clients.list` | List OAuth clients. |
| POST | `/backend/v3/api/iam/oauth/clients` | `iam.oauth.clients.create` | Create OAuth/provider client config. |
| GET | `/backend/v3/api/iam/oauth/clients/{oauthClientId}` | `iam.oauth.clients.retrieve` | Retrieve non-secret client config. |
| PATCH | `/backend/v3/api/iam/oauth/clients/{oauthClientId}` | `iam.oauth.clients.update` | Update non-secret client config. |
| DELETE | `/backend/v3/api/iam/oauth/clients/{oauthClientId}` | `iam.oauth.clients.delete` | Disable/delete client config. |
| GET | `/backend/v3/api/iam/oauth/secrets` | `iam.oauth.secrets.list` | List redacted secret metadata across owner kinds. |
| POST | `/backend/v3/api/iam/oauth/secrets` | `iam.oauth.secrets.create` | Add or rotate any OAuth secret reference. |
| DELETE | `/backend/v3/api/iam/oauth/secrets/{secretId}` | `iam.oauth.secrets.delete` | Revoke any OAuth secret reference. |
| GET | `/backend/v3/api/iam/oauth/surfaces` | `iam.oauth.surfaces.list` | List web/mobile/native/mini-program/server bindings. |
| POST | `/backend/v3/api/iam/oauth/surfaces` | `iam.oauth.surfaces.create` | Create surface binding. |
| PATCH | `/backend/v3/api/iam/oauth/surfaces/{surfaceId}` | `iam.oauth.surfaces.update` | Update surface binding. |
| DELETE | `/backend/v3/api/iam/oauth/surfaces/{surfaceId}` | `iam.oauth.surfaces.delete` | Disable/delete surface binding. |
| GET | `/backend/v3/api/iam/oauth/flow_configs` | `iam.oauth.flowConfigs.list` | List OAuth flow configs. |
| POST | `/backend/v3/api/iam/oauth/flow_configs` | `iam.oauth.flowConfigs.create` | Create OAuth flow config. |
| PATCH | `/backend/v3/api/iam/oauth/flow_configs/{flowConfigId}` | `iam.oauth.flowConfigs.update` | Update OAuth flow config. |
| GET | `/backend/v3/api/iam/oauth/scope_profiles` | `iam.oauth.scopeProfiles.list` | List scope profiles. |
| POST | `/backend/v3/api/iam/oauth/scope_profiles` | `iam.oauth.scopeProfiles.create` | Create scope profile. |
| PATCH | `/backend/v3/api/iam/oauth/scope_profiles/{scopeProfileId}` | `iam.oauth.scopeProfiles.update` | Update scope profile. |
| GET | `/backend/v3/api/iam/oauth/claim_mappings` | `iam.oauth.claimMappings.list` | List claim mappings. |
| POST | `/backend/v3/api/iam/oauth/claim_mappings` | `iam.oauth.claimMappings.create` | Create claim mapping. |
| PATCH | `/backend/v3/api/iam/oauth/claim_mappings/{mappingId}` | `iam.oauth.claimMappings.update` | Update claim mapping. |
| GET | `/backend/v3/api/iam/oauth/policies` | `iam.oauth.policies.list` | List OAuth policies. |
| POST | `/backend/v3/api/iam/oauth/policies` | `iam.oauth.policies.create` | Create OAuth policy. |
| PATCH | `/backend/v3/api/iam/oauth/policies/{policyId}` | `iam.oauth.policies.update` | Update OAuth policy. |
| GET | `/backend/v3/api/iam/oauth/tenant_bindings` | `iam.oauth.tenantBindings.list` | List provider tenant/domain to IAM tenant/organization mappings. |
| POST | `/backend/v3/api/iam/oauth/tenant_bindings` | `iam.oauth.tenantBindings.create` | Create provider tenant binding. |
| PATCH | `/backend/v3/api/iam/oauth/tenant_bindings/{bindingId}` | `iam.oauth.tenantBindings.update` | Update provider tenant binding. |
| GET | `/backend/v3/api/iam/oauth/operator_platforms` | `iam.oauth.operatorPlatforms.list` | List third-party/operator platform configs. |
| POST | `/backend/v3/api/iam/oauth/operator_platforms` | `iam.oauth.operatorPlatforms.create` | Create operator platform config. |
| PATCH | `/backend/v3/api/iam/oauth/operator_platforms/{operatorPlatformId}` | `iam.oauth.operatorPlatforms.update` | Update operator platform config. |
| GET | `/backend/v3/api/iam/oauth/resource_accounts` | `iam.oauth.resourceAccounts.list` | List provider resource accounts such as official accounts and mini-programs. |
| POST | `/backend/v3/api/iam/oauth/resource_accounts` | `iam.oauth.resourceAccounts.create` | Create self-managed provider resource account. |
| PATCH | `/backend/v3/api/iam/oauth/resource_accounts/{resourceAccountId}` | `iam.oauth.resourceAccounts.update` | Update provider resource account. |
| POST | `/backend/v3/api/iam/oauth/resource_accounts/{resourceAccountId}/verifications` | `iam.oauth.resourceAccounts.verifications.create` | Verify self-managed account callback/domain/provider settings. |
| POST | `/backend/v3/api/iam/oauth/resource_accounts/{resourceAccountId}/mini_program_login_checks` | `iam.oauth.resourceAccounts.miniProgramLoginChecks.create` | Validate mini-program AppID, surface, code/session, phone/profile authorization, and mapping readiness. |
| POST | `/backend/v3/api/iam/oauth/resource_accounts/{resourceAccountId}/authorization_refreshes` | `iam.oauth.resourceAccounts.authorizationRefreshes.create` | Refresh resource-account authorization metadata/tokens. |
| GET | `/backend/v3/api/iam/oauth/resource_authorizations` | `iam.oauth.resourceAuthorizations.list` | List self-managed and operator-authorized account authorizations. |
| POST | `/backend/v3/api/iam/oauth/resource_authorizations` | `iam.oauth.resourceAuthorizations.create` | Create or complete resource-account authorization. |
| PATCH | `/backend/v3/api/iam/oauth/resource_authorizations/{authorizationId}` | `iam.oauth.resourceAuthorizations.update` | Update or revoke resource authorization metadata. |
| POST | `/backend/v3/api/iam/oauth/operator_platforms/{operatorPlatformId}/pre_authorizations` | `iam.oauth.operatorPlatforms.preAuthorizations.create` | Generate provider pre-authorization entry for operator-authorized accounts. |
| GET | `/backend/v3/api/iam/oauth/webhook_configs` | `iam.oauth.webhookConfigs.list` | List callback/message/event webhook configs. |
| POST | `/backend/v3/api/iam/oauth/webhook_configs` | `iam.oauth.webhookConfigs.create` | Create callback/message/event webhook config. |
| PATCH | `/backend/v3/api/iam/oauth/webhook_configs/{webhookConfigId}` | `iam.oauth.webhookConfigs.update` | Update callback/message/event webhook config. |
| POST | `/backend/v3/api/iam/oauth/webhook_configs/{webhookConfigId}/verifications` | `iam.oauth.webhookConfigs.verifications.create` | Verify callback token, encryption mode, and provider callback reachability. |
| GET | `/backend/v3/api/iam/oauth/operational_resources` | `iam.oauth.operationalResources.list` | List menus, QR entries, JS-SDK domains, auth domains, reply rules, and provider resources. |
| POST | `/backend/v3/api/iam/oauth/operational_resources` | `iam.oauth.operationalResources.create` | Create provider operational resource. |
| PATCH | `/backend/v3/api/iam/oauth/operational_resources/{resourceId}` | `iam.oauth.operationalResources.update` | Update provider operational resource. |
| DELETE | `/backend/v3/api/iam/oauth/operational_resources/{resourceId}` | `iam.oauth.operationalResources.delete` | Disable/delete provider operational resource. |
| POST | `/backend/v3/api/iam/oauth/operational_resources/{resourceId}/publishes` | `iam.oauth.operationalResources.publishes.create` | Publish/sync operational resource to provider. |
| GET | `/backend/v3/api/iam/oauth/account_links` | `iam.oauth.accountLinks.list` | Operator view of linked OAuth accounts. |
| PATCH | `/backend/v3/api/iam/oauth/account_links/{accountLinkId}` | `iam.oauth.accountLinks.update` | Admin disable/unlink/remediate account link. |
| GET | `/backend/v3/api/iam/oauth/grants` | `iam.oauth.grants.list` | Operator view of retained provider grants. |
| DELETE | `/backend/v3/api/iam/oauth/grants/{grantId}` | `iam.oauth.grants.delete` | Admin revoke retained provider grant. |
| GET | `/backend/v3/api/iam/oauth/callback_events` | `iam.oauth.callbackEvents.list` | Diagnostics and audit-friendly callback events. |
| POST | `/backend/v3/api/iam/oauth/diagnostic_runs` | `iam.oauth.diagnosticRuns.create` | Validate config without storing provider secrets in logs. |
| GET | `/backend/v3/api/iam/oauth/diagnostic_runs` | `iam.oauth.diagnosticRuns.list` | List diagnostic runs. |
| GET | `/backend/v3/api/iam/oauth/diagnostic_runs/{diagnosticRunId}` | `iam.oauth.diagnosticRuns.retrieve` | Retrieve redacted diagnostic run result. |

Backend API list endpoints must support `tenantId`, `organizationId`, `appId`,
`environment`, `providerCode`, `integrationId`, `oauthClientId`,
`operatorPlatformId`, `resourceAccountId`, `resourceAccountKind`, `accessMode`,
`surfaceKind`, `flowKind`, `secretOwnerKind`, `secretOwnerId`, `resourceKind`,
`authorizationStatus`, `publishStatus`, `status`, pagination, and sort by
`createdAt`, `updatedAt`, provider, status, and health/readiness state.

Secrets use one management resource: `/backend/v3/api/iam/oauth/secrets`.
Client-owned, webhook-owned, operator-platform-owned, resource-account-owned,
resource-authorization-owned, and grant-owned secrets are selected with
`secretOwnerKind` and `secretOwnerId`. The admin UI may present filtered pages,
such as a client detail secrets tab, but the generated SDK resource remains
`iam.oauth.secrets.*`.

### SDK Generation

Appbase SDK resources after generation:

```text
@sdkwork/iam-app-sdk
  client.oauth.providers.list(...)
  client.oauth.authorizationUrls.create(...)
  client.oauth.deviceAuthorizations.create(...)
  client.oauth.callbacks.handleGet(...)
  client.oauth.callbacks.handlePost(...)
  client.oauth.miniProgramSessions.create(...)
  client.oauth.sessions.create(...)
  client.oauth.accountLinks.list(...)
  client.oauth.accountLinks.delete(...)
  client.oauth.grants.list(...)
  client.oauth.grants.delete(...)

@sdkwork/iam-backend-sdk
  client.iam.oauth.providerCatalog.*
  client.iam.oauth.integrations.*
  client.iam.oauth.clients.*
  client.iam.oauth.secrets.*
  client.iam.oauth.surfaces.*
  client.iam.oauth.flowConfigs.*
  client.iam.oauth.scopeProfiles.*
  client.iam.oauth.claimMappings.*
  client.iam.oauth.policies.*
  client.iam.oauth.tenantBindings.*
  client.iam.oauth.operatorPlatforms.*
  client.iam.oauth.operatorPlatforms.preAuthorizations.*
  client.iam.oauth.resourceAccounts.*
  client.iam.oauth.resourceAccounts.verifications.*
  client.iam.oauth.resourceAccounts.miniProgramLoginChecks.*
  client.iam.oauth.resourceAccounts.authorizationRefreshes.*
  client.iam.oauth.resourceAuthorizations.*
  client.iam.oauth.webhookConfigs.*
  client.iam.oauth.webhookConfigs.verifications.*
  client.iam.oauth.operationalResources.*
  client.iam.oauth.operationalResources.publishes.*
  client.iam.oauth.accountLinks.*
  client.iam.oauth.grants.*
  client.iam.oauth.callbackEvents.*
  client.iam.oauth.diagnosticRuns.*
```

Generated appbase SDK artifacts must not expose an `openPlatform` API group for
this capability.

Provider callback ingress is an appbase open-api route surface, not a Claw
Router admin dependency. The current appbase SDK workspace has app and backend
SDK families; the implementation plan must either keep provider ingress as
route-manifest/runtime-only behavior or create a separate appbase open-api SDK
workspace through the standard SDK generation flow before documenting generated
SDK methods for it. Claw Router admin must not call provider callback ingress
directly.

## Claw Router Admin UX And URL Design

The Claw Router admin module must be independent from the old Open Platform
menus.

Sidebar:

- top-level group key: `oauth`
- label zh-CN: `OAuth 管理`
- label en-US: `OAuth`
- route base: `/admin/oauth`

Canonical admin URLs:

| Page | URL | Purpose |
| --- | --- | --- |
| Overview | `/admin/oauth/overview` | Health, enabled provider count, incomplete configs, recent callback failures. |
| Login | `/admin/oauth/login` | Login-focused provider availability across PC web, mobile web, native app, mini-program, redirect, code/session, mapping, and policy readiness. |
| Provider catalog | `/admin/oauth/provider-catalog` | Compare China/global provider templates and requirements. |
| Integrations | `/admin/oauth/integrations` | Top-level provider integrations and enabled purposes. |
| Clients | `/admin/oauth/clients` | Provider-issued OAuth clients and app IDs. |
| Client detail | `/admin/oauth/clients/:oauthClientId` | Edit provider-specific non-secret settings and status. |
| Secrets | `/admin/oauth/secrets` | Redacted secret/key/cert/token/callback material metadata and rotation actions across owner kinds. |
| Client secrets view | `/admin/oauth/clients/:oauthClientId/secrets` | Filtered view over `/admin/oauth/secrets` for one client. |
| Surfaces | `/admin/oauth/surfaces` | PC web, mobile web, native app, desktop, server, mini-program bindings. |
| Flow configs | `/admin/oauth/flow-configs` | Authorization code, PKCE, client credentials, device code, refresh, mini-program, and provider-native flows. |
| Scope profiles | `/admin/oauth/scope-profiles` | Scope bundles, consent labels, required scopes, provider API purposes. |
| Claim mappings | `/admin/oauth/claim-mappings` | Map provider claims to IAM identity/profile/tenant facts. |
| Policies | `/admin/oauth/policies` | Login, linking, delegation, domain allowlist, MFA/risk, token retention. |
| Tenant bindings | `/admin/oauth/tenant-bindings` | Enterprise/corp/domain to IAM tenant/organization mappings. |
| Operator platforms | `/admin/oauth/operator-platforms` | Third-party/operator platform configs, pre-authorization entries, tickets, and granted capability defaults. |
| Resource accounts | `/admin/oauth/resource-accounts` | Provider resource accounts, including official accounts, mini-programs, enterprise apps, and payment apps. |
| Resource account detail | `/admin/oauth/resource-accounts/:resourceAccountId` | Readiness, capabilities, login entries, domains, webhooks, and operational resources for one provider account. |
| Official accounts | `/admin/oauth/resource-accounts/official-accounts` | Filtered resource-account view for official-account onboarding and operation. |
| Mini programs | `/admin/oauth/resource-accounts/mini-programs` | Filtered resource-account view for mini-program login and operational bindings. |
| Mini-program login | `/admin/oauth/login/mini-programs` | Mini-program login readiness, code/session exchange, phone/profile authorization, and openid/unionid mapping. |
| Resource authorizations | `/admin/oauth/resource-authorizations` | Self-managed and operator-authorized account authorization lifecycle. |
| Webhooks | `/admin/oauth/webhooks` | OAuth callbacks, ticket callbacks, message/event callbacks, encryption, and verification status. |
| Operational resources | `/admin/oauth/operational-resources` | Menus, QR entries, URL entries, JS-SDK domains, web OAuth domains, reply rules, templates, and provider resources. |
| Account links | `/admin/oauth/account-links` | External account links and admin remediation. |
| Grants | `/admin/oauth/grants` | Retained user/service grants and revocation. |
| Callback diagnostics | `/admin/oauth/callback-diagnostics` | State/callback/token-exchange diagnostic events. |
| Diagnostic runs | `/admin/oauth/diagnostic-runs` | Operator-triggered config validation history. |

Default `/admin/oauth` redirects to `/admin/oauth/overview`.

UX requirements:

- The page title and breadcrumb must include `OAuth 管理` or `OAuth`.
- The Login page is a focused workflow inside the OAuth module, not the whole
  module.
- Provider catalog rows must show region, protocol family, supported flows,
  supported surfaces, PKCE support, secret/key requirements, and required fields.
- Client forms must be schema-driven from provider catalog metadata, but core
  fields remain first-class controls.
- Secrets are write-only. The admin page shows configured/missing/rotating
  status, key id, fingerprint, and active window only.
- Secret forms must always require an owner kind and owner id. Client,
  operator-platform, resource-account, webhook, authorization, and grant secrets
  are different owner scopes even when the provider calls them all "tokens".
- Flow config UI must separate login, account linking, API delegation, service
  access, and diagnostic flows.
- Login UI must expose separate readiness panels for redirect-based OAuth,
  native-app handoff, device-code login, and provider-native mini-program
  code/session login.
- Surface editor must use tabs or segmented controls for PC Web, Mobile Web,
  iOS, Android, Desktop, Server, and Mini Program.
- Tenant binding pages must show provider tenant/corp/domain mapping to IAM
  tenant/organization.
- Operator platform pages must guide WeChat-style component platform setup:
  component identity, callback verification, ticket state, pre-authorization
  entry generation, capability defaults, and authorized account counts.
- Resource account pages must support both onboarding modes with explicit
  controls: `self_managed_account` for customer-owned AppID/AppSecret setup and
  `operator_authorized_account` for component/third-party authorization.
- Official Account and Mini Program pages are filtered resource-account views,
  not separate Claw Router capabilities. They must use the same backend SDK
  resources as the generic resource-account pages.
- Mini-program login pages must make AppID, host provider, environment,
  release channel, page path, code/session flow, phone/profile authorization,
  openid mapping, unionid mapping, and provider session-key retention explicit.
- Operational resource pages must support provider resource kinds including
  menus, menu entries, QR entries, URL entries, mini-program URLs, JS-SDK
  domains, web OAuth domains, message reply rules, template messages, and
  material groups.
- Publish/sync actions must show the provider, account, granted capability,
  publish status, last sync time, and redacted failure reason.
- Diagnostics must display request id, provider, integration, surface, flow,
  outcome, error code, and timing. They must never show raw provider tokens,
  auth codes, full state, nonces, device codes, PKCE verifiers, or private
  claims.

Claw Router frontend integration:

- Use `getSdkworkAppbaseBackendSdkClient` from the existing commons SDK client
  boundary.
- UI calls go through service modules backed by
  `@sdkwork/iam-backend-sdk`.
- No raw `fetch`, axios, manual auth headers, or local SDK forks.
- No `@sdkwork/clawrouter-backend-sdk` usage for this appbase-owned capability
  except tests proving old Claw Router `open_platform_*` resources are removed.

## Removal From Claw Router

The implementation plan must remove all Claw Router-owned open platform
artifacts:

- schema registry source for `open_platform_*`.
- generated schema references to `open_platform_*`.
- generated Claw Router backend SDK `open_platform` resources.
- Rust API modules and stores for `admin_open_platform`.
- SQLite/Postgres open platform stores.
- `open_platform_*` tests.
- PC admin packages:
  - `sdkwork-clawrouter-pc-admin-open-platform`
  - `sdkwork-clawrouter-pc-admin-wechat-mini-program`
  - `sdkwork-clawrouter-pc-admin-wechat-official-account`
- `/admin/open-platform*` route registrations.
- open-platform i18n resources.

No compatibility route, redirect, or alias should be kept unless a later human
review explicitly requests it.

## Security Requirements

- Login/session creation starts anonymous and rejects inbound credential/context
  headers.
- State, nonce, auth code, device code, user code, PKCE verifier, access token,
  refresh token, ID token, OAuth 1 token secret, client secret, private key,
  certificate private material, mini-program login code, provider session key,
  encrypted phone/profile payload, and provider app secrets must never be
  logged.
- State, nonce, token, and subject lookup values stored for runtime use must be
  hashed or secret-ref backed where possible.
- Provider ID tokens must validate issuer, audience, expiry, signature, nonce,
  and configured tenant policy.
- OAuth callback must validate state and redirect URI before token exchange.
- Provider callback ingress must validate callback public id, signature,
  timestamp/nonce replay rules, configured verification token, encryption mode,
  and resource/operator ownership before processing messages, tickets, or
  authorization events.
- PKCE is required for native app public-client flows and preferred for web when
  provider supports it.
- Account linking must be policy-driven; verified email alone is not enough
  unless the policy explicitly allows it.
- Auto-registration must resolve real tenant and organization from IAM policy,
  tenant binding, and provider claims. It must not trust request query/body
  tenant fields.
- Client credentials grants are backend-controlled and must never be exposed to
  frontend bundles.
- Secret rotation must support overlapping active windows and audit trails.
- Diagnostics must redact raw PII and secrets.

## Testing Strategy

Use TDD before implementation.

Appbase storage tests:

- table catalog exposes every `iam_oauth_*` table.
- table constants exist in `IamTables`.
- migration declares required columns and indexes.
- migration contains no plaintext secret column such as `client_secret`.
- migration declares `iam_oauth_secret` instead of any
  `iam_oauth_client_secret` table.
- provider catalog table includes field-schema JSON columns and normalized
  protocol/surface/flow support columns.
- resource-account tables distinguish `self_managed_account` and
  `operator_authorized_account`.
- surface and flow config tables represent mini-program provider, AppID,
  environment, release channel, page path, code/session flow, phone/profile
  authorization, and provider session-key retention policy.
- operator-platform, resource-authorization, webhook-config, and
  operational-resource tables include readiness/status indexes for admin list
  pages.
- authorization state stores hashes/secret refs, not raw state/nonce/device
  code/user code/verifier.

Appbase HTTP/API tests:

- app routes expose `oauth` runtime operations.
- credential-entry app-api routes reject inbound auth/context headers.
- backend routes expose `iam.oauth` management operations only.
- backend routes do not create login sessions.
- route manifests and generated OpenAPI use `/app/v3/api/oauth/*` and
  `/backend/v3/api/iam/oauth/*`.
- app routes expose `oauth.miniProgramSessions.create`.
- appbase open/provider ingress routes expose provider callbacks under
  `/iam/v3/api/oauth/provider_callbacks/{callbackPublicId}`.
- provider callback ingress is verified through appbase open-api route metadata
  unless a separate appbase open-api SDK workspace is created through the
  standard SDK generation flow.
- generated SDK has `oauth` resources and no `openPlatform` group for this
  capability.
- backend OpenAPI exposes `iam.oauth.secrets.*`, `iam.oauth.operatorPlatforms.*`,
  `iam.oauth.resourceAccounts.*`, `iam.oauth.resourceAuthorizations.*`,
  `iam.oauth.webhookConfigs.*`, and `iam.oauth.operationalResources.*`.
- backend OpenAPI does not expose `iam.oauth.clientSecrets.*`.
- verification/pre-authorization/publish command routes require backend
  dual-token auth, permissions, audit metadata, and idempotency where retriable.
- mini-program session creation rejects inbound SDKWork credential/context
  headers and redacts provider codes, session keys, and encrypted payloads.
- provider callback ingress validates provider signatures/tokens/timestamps and
  redacts callback tokens, ticket payloads, message payload secrets, and
  authorization codes.

Claw Router removal tests:

- schema registry no longer publishes `open_platform_*`.
- generated Claw Router backend SDK no longer has `open_platform` API group or
  models.
- Rust route manifest no longer contains `/backend/v3/api/open_platform/*`.
- admin route registry no longer contains `/admin/open-platform*`.
- old open-platform admin packages are absent.

Claw Router admin tests:

- module registry includes `oauth`.
- sidebar links to `/admin/oauth/overview`.
- admin route activation recognizes every canonical `/admin/oauth/*` page.
- route activation covers resource-account filtered URLs for official accounts
  and mini-programs.
- route activation covers `/admin/oauth/login/mini-programs`.
- service code consumes appbase backend SDK client.
- services use `iam.oauth.secrets.*` for secret operations and never use
  `clientSecrets`.
- official-account and mini-program pages use the generic resource-account,
  webhook, operational-resource, and diagnostic service boundaries.
- no raw HTTP is used by OAuth admin code.

Official-account scenario tests:

- self-managed official account can be represented without plaintext AppSecret,
  callback token, or EncodingAESKey columns.
- operator-authorized official account can be represented with operator platform,
  resource account, resource authorization, webhook config, and granted
  capability records.
- menu, URL/QR entry, JS-SDK domain, web authorization domain, and message reply
  rule resources map to `iam_oauth_operational_resource`.
- operations fail closed when authorization is expired, revoked, or lacks the
  required capability.

Mini-program scenario tests:

- mini-program login configuration is represented by resource account, surface,
  flow config, scope profile, claim mapping, and policy records.
- WeChat/Alipay/DingTalk/Lark style code/session login can be represented
  without browser redirect URLs.
- phone/profile authorization flags and provider session-key retention policy
  are explicit and never stored as plaintext payloads.
- `openid` and `unionid` mapping is represented separately and account linking
  follows policy rather than trusting phone/profile fields alone.
- `/admin/oauth/login/mini-programs` and
  `/admin/oauth/resource-accounts/mini-programs` use appbase backend SDK
  resources only.

## Implementation Phases

Phase 1: appbase database and route contract

- Add appbase storage tests first.
- Add `iam_oauth_*` migration/schema.
- Add appbase route metadata for app-api and backend-api.
- Add OpenAPI contract updates and regenerate appbase SDKs.

Phase 2: appbase runtime behavior

- Replace OAuth unavailable placeholders with fail-closed provider lookup,
  authorization state creation, provider callback/session exchange skeleton, and
  policy validation.
- Implement provider adapters incrementally, starting with custom OIDC, Google,
  GitHub, WeChat Open Platform, WeChat Official Account, WeChat Mini Program,
  Alipay, DingTalk, Feishu/Lark, Microsoft Entra, and Apple.
- Implement provider resource-account orchestration skeletons for self-managed
  setup, operator-platform pre-authorization, authorization refresh, webhook
  verification, and operational-resource publish/sync.

Phase 3: Claw Router removal

- Delete Claw Router `open_platform_*` schema/API/store/frontend packages.
- Regenerate Claw Router schema/OpenAPI/SDK outputs from source contracts.
- Run contract guards proving no stale `open_platform_*` remains.

Phase 4: Claw Router admin

- Add independent `oauth` sidebar/module/page package.
- Integrate appbase backend SDK service boundary.
- Build provider catalog, integrations, clients, secrets, surfaces, flow
  configs, scope profiles, mappings, policies, tenant bindings, operator
  platforms, resource accounts, resource authorizations, webhooks, operational
  resources, account links, grants, diagnostics, and diagnostic run pages.
- Add focused filtered views for official accounts and mini-programs under
  `/admin/oauth/resource-accounts/*` using the same generic service layer.

Phase 5: verification

- Run narrow appbase storage/API tests.
- Run appbase SDK generation/contract tests.
- Run Claw Router schema and SDK generation guards.
- Run Claw Router admin frontend tests/build.

## Acceptance Criteria

- `sdkwork-appbase` is the only owner of OAuth database schema and API
  contracts.
- `sdkwork-clawrouter` contains no `open_platform_*` database, backend route,
  generated SDK, admin package, or `/admin/open-platform*` sidebar artifact.
- Claw Router admin has a visible independent sidebar item for `/admin/oauth`.
- Appbase app-api exposes OAuth runtime operations under `/app/v3/api/oauth/*`.
- Appbase provider ingress exposes external provider callback operations under
  `/iam/v3/api/oauth/provider_callbacks/*`.
- Appbase backend-api exposes management operations under
  `/backend/v3/api/iam/oauth/*`.
- Generated appbase SDK resources are named `oauth` and `iam.oauth`.
- Generated appbase SDK exposes `iam.oauth.secrets.*` and does not expose
  `iam.oauth.clientSecrets.*`.
- Provider-specific configuration differences are represented by normalized
  first-class columns plus catalog-driven field schemas and non-secret JSON.
- Login, account linking, delegated user grants, service-side client
  credentials, flow config, scope profiles, tenant bindings, diagnostics, and
  token retention are represented explicitly.
- Resource-account onboarding, self-managed provider accounts,
  operator-authorized provider accounts, webhook/message callbacks, provider
  operational resources, and authorization refresh lifecycle are represented
  explicitly.
- The WeChat Official Account reference scenario is fully representable for both
  customer-owned AppID/AppSecret setup and third-party component authorization.
- Secrets are references, hashes, or redacted metadata only.
- Tests prove app/backend API boundary separation and the absence of legacy
  Claw Router open-platform artifacts.

