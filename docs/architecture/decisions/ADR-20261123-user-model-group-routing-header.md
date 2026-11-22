# ADR-20261123: User Model Group Routing And The Account-Group Selector Header

Status: accepted
Owner: cloud-router-platform
Updated: 2026-11-23
Requirement: user-level model default groups and header-selected account groups

## Context

Cloud Router already had per-tenant account-group pools and per-modality tenant
defaults. Users could not express "route this model through my preferred
pools", and model pickers could not show which pools serve a model. The product
requires:

1. one model may map to **several** account groups (an ordered failover list);
2. the console lists modality → vendor → model → groups and lets a user set
   model, vendor, and modality defaults;
3. all model-facing open-api calls may pin one reachable group through a request
   header;
4. auth-token traffic resolves the user's rule first and falls back to the
   account-level default group.

`API_SPEC.md` §10.2 forbids identity projection headers and `I18N_SPEC.md` §4
retires custom locale headers. Neither rule covers a request-routing selector:
the header below carries no tenant, user, session, or locale assertion and is
validated against the caller's existing authorization.

## Decision

### One-to-many rule table

`ai_user_account_group_route` stores one row per `(tenant, organization, user,
scope, modality, vendor_code, model, account_group_id)` with a `priority`.
A scope may therefore list several groups. Replacing a scope's list is a single
transaction: soft-delete the previous rows, then insert the new ordered list.

### Routing precedence

`domain/account_group_routing.rs` is the single authority:

1. `x-sdkwork-account-group` (group id or code) when it is in the subject's
   scope and serves the requested modality and model;
2. user model rules, in priority order;
3. user vendor rules, in priority order;
4. user modality rules, in priority order;
5. the existing account-level default group (modality default, mixed default,
   `default-group` code convention, single group in scope).

A group that cannot serve the requested model (no callable account, model
access denied, wrong modality) is skipped and the next configured group is
tried. Only step 5 can fail closed (`503 account_group_unavailable`).

### Selector header

`x-sdkwork-account-group` is an opt-in **routing selector**:

- It is not an identity, tenancy, session, or locale assertion.
- Auth-token callers may only select groups in their tenant/organization scope.
- API-key callers may only select one of the groups bound to that key; the
  header can never widen a key's authorization.
- An unknown/unreachable/unauthorized value falls back to the user/account
  rules instead of failing the request.
- Browser CORS must explicitly allow the header in every environment; the
  development wildcard and the production explicit allow-list are both
  updated in `crates/sdkwork-cloudrouter-http/src/web_security.rs` with a
  regression test.

The header is documented on the open-api model operations and in
`docs/architecture/tech/TECH-2026-11-23-user-model-group-routing.md`.

## Alternatives Considered

- **Query parameter or body field**: rejected because it changes the
  OpenAI-compatible payload shape and is forwarded to providers; a request
  header is transport-level and stripped before dispatch.
- **API key only**: rejected because signed-in portal/agent traffic uses auth
  tokens and needs the same routing control.
- **One group per model**: rejected by the product requirement; it cannot express
  a failover list and forces a user to lose routing when the first pool is
  exhausted.
- **Multiple groups merged into one candidate plan**: deferred. A single
  `AuthenticatedApiKeyContext` carries one pricing/plan identity per request;
  merging pools would require a pricing-plan-aware multi-group plan. The
  ordered failover list delivers the requirement without weakening billing.

## Consequences

- A rule change is visible to the console immediately (reads load rules from
  the database), while traffic picks it up on the next routing snapshot refresh.
- The selector header must remain in the CORS allow-list forever; removing it
  breaks browser model calls before the route runs.
- The header must never be treated as identity. Reviewers must reject any change
  that lets it bypass tenant scope or API-key bindings.
- The retired `api.routing.accountGroups`-style single default is unchanged for
  callers that never set a rule.

## Verification

```bash
cargo test -p sdkwork-cloudrouter-router-service --lib
cargo test -p sdkwork-cloudrouter-router-service --test app_model_groups_api
cargo test -p sdkwork-cloudrouter-edge-runtime --test openai_chat_auth_token_route
cargo test -p sdkwork-cloudrouter-edge-runtime --lib gateway_dispatch_defaults
cargo test -p sdkwork-cloudrouter-http --lib
pnpm --dir apps/sdkwork-cloudrouter-pc typecheck
pnpm --dir apps/sdkwork-cloudrouter-pc exec vitest run packages/sdkwork-cloudrouter-pc-console-gateway/src/ModelGroupsView.test.tsx
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .
```
