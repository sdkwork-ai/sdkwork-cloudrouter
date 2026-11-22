# User-level model → account-group routing (2026-11-23)

## 1. Goal

Cloud Router already had account-group pools and per-modality tenant defaults.
This change adds the missing **user-level** layer and makes the group visible at
the moment a model is chosen:

1. an open-api caller can ask which groups serve a model;
2. the console model picker (and the default-group page) shows those groups;
3. a signed-in user can pin a group per **model**, per **vendor**, or per
   **modality**;
4. every model call may pin one reachable group with a request header;
5. the auth-token open-api channel resolves the user's rule first and falls
   back to the account-level default group.

## 2. Why the account-level default was not enough

`domain/upstream_account_group_selection.rs` selects one group for the subject
per modality (`is_default` + `group_type` / `modalities`, then the
`default-group` code, then the single group in scope). That answers "which pool
serves this modality", but not "which pool does *this user* want for *this
model*". A user who runs different suppliers for `gpt-4o` and
`claude-sonnet-4-5` had no way to express it, and a model picker could not tell
which of the tenant's pools supported a given model.

## 3. Data model

Migration `0054_user_model_group_routing` creates
`ai_user_account_group_route` (registry: `docs/schema-registry/tables/ai-routing.yaml`):

| column | meaning |
| --- | --- |
| `tenant_id`, `organization_id`, `user_id` | owner of the rule |
| `scope_type` | `model`, `vendor`, or `modality` |
| `modality` | catalog modality (`text`/`image`/`video`/`audio`/`music`), empty = not modality-bound |
| `vendor_code` | required for `vendor`, optional for `model` |
| `model` | required for `model` |
| `account_group_id`, `account_group_code` | one target pool in the scope's ordered list |
| `priority` | lower value is tried first |

A scope is **one-to-many**: the same `(scope_type, modality, vendor_code,
model)` can list several account groups, ordered by `priority`. A partial unique
index over
`(tenant_id, organization_id, user_id, scope_type, modality, vendor_code, model,
account_group_id) WHERE deleted_at IS NULL` still prevents the same group from
being listed twice. The row is soft-deleted with the standard column contract;
replacing a scope's list soft-deletes every previous row and inserts the new
ordered list in one transaction, so clearing a rule is just `accountGroups: []`.

## 4. Routing precedence

`domain/account_group_routing.rs` is the single authority:

1. **Header override** — `x-sdkwork-account-group` names a group id or code that
   is in the subject's scope and serves the requested modality.
2. **User model rules** — every `model` rule for the request, in `priority`
   order; a rule whose `vendor_code` matches the requested vendor is preferred.
3. **User vendor rules** — every model of that vendor, in priority order.
4. **User modality rules** — every model of that modality, in priority order.
5. **Account-level default** — the pre-existing selection (modality default,
   mixed default, `default-group` code, single group in scope).

Within a scope, each configured group is tried in priority order and an
unusable one (unreachable, wrong modality, no callable account for the model)
falls through to the next group before the next scope.

A rule that names an unreachable group or a group scoped to another modality is
**skipped**, never fatal: stale console configuration must not make the account
pool unreachable. Only step 5 can fail closed (`503 account_group_unavailable`).

The header is opt-in and never widens authorization:

* session traffic only chooses groups in the subject's tenant/organization
  scope;
* API-key traffic only chooses one of the key's own
  `iam_gateway_api_key_account_group` bindings.

`openai_auth_token.rs` and `gateway_api_key_auth.rs` are the only places that
construct these contexts; every model surface (`/v1/chat/completions`,
`/v1/responses`, media generation, `/v1/models/{model}/groups`) inherits the
same resolution through the shared invocation path.

## 5. HTTP header contract note

`x-sdkwork-account-group` is a **request-routing selector**, not a locale or
identity projection header. It is deliberately opt-in and is validated against
the caller's existing authorization; it cannot create tenancy or identity. The
shared framework CORS default does not know it, so
`crates/sdkwork-cloudrouter-http/src/web_security.rs` adds it to the allowed
headers in every environment (development wildcard and production explicit
allow-list alike), with a regression test. The locale retirement rule
(`I18N_SPEC.md` §4) is untouched: locale remains `Accept-Language` only.

## 6. APIs

### Open-api

- `GET /v1/models/{model}/groups` — groups that can serve the model
  (`{ object: "list", data: [{ id, code, name, defaultForModel }] }`).
- `GET /v1/models` and `GET /v1/vendors` — every model entry now carries an
  optional `groups` array with the same shape.
- `GET /v1/vendors` continues to list only the models reachable for the
  authenticated key's group.
- Listing groups never requires the caller's current group to serve the model:
  an auth-token caller whose default pool lacks the model still receives the
  alternatives, so a picker can offer a switch. The model id is the catalog key
  (`<vendor>/<modelId>`); generated SDKs percent-encode the slash inside the
  path segment, which the route must match as one parameter
  (`/v1/models/deepseek%2Fdeepseek-flash/groups`).

### App-api (console)

- `GET /app/v3/api/ai/routing/model_group_catalog?modality=&vendor_code=`
  — `data.item.modalities[]` → `vendors[]` → `models[]` → `groups[]` plus the
  effective `defaultGroupCode` / `defaultSource`.
- `GET /app/v3/api/ai/routing/model_groups?model=`
  — `data.item.groups[]` for one model.
- `GET /app/v3/api/ai/routing/model_group_defaults`
  — the caller's stored rules.
- `PUT /app/v3/api/ai/routing/model_group_defaults`
  — replace one scope's ordered list (`scope`, `modality`, `vendorCode`,
  `model`, `accountGroups: string[]`); an empty list clears it.

Reads combine the routing snapshot's group membership with the caller's
**freshly persisted** rules, so a saved default appears on the next page load
even before the routing refresh interval picks it up for traffic.

## 7. Console

`/console/routing/default-groups` (`sdkwork-cloudrouter-pc-console-gateway`):
left rail selects the modality and lists that modality's vendors; the right pane
lists the selected vendor's models with the groups that can serve each model
and the caller's effective default. The vendor header offers one bulk rule for
every model of the vendor. Both language catalogs carry the copy.

## 8. Verification

```bash
cargo check -p sdkwork-cloudrouter-router-service -p sdkwork-cloudrouter-edge-runtime -p sdkwork-routes-cloudrouter-app-api
cargo test  -p sdkwork-cloudrouter-router-service --lib
cargo test  -p sdkwork-cloudrouter-router-service --test openai_models_api
cargo test  -p sdkwork-cloudrouter-router-service --test openai_vendors_api
cargo test  -p sdkwork-cloudrouter-router-service --test sql_pricing_catalog_contract
cargo test  -p sdkwork-cloudrouter-http --lib
python -B -m tools.api_contract_manifest
python -B -m tools.cloudrouter_openapi_generator
node tools/generate-cloudrouter-http-route-manifest-rs.mjs --check
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
pnpm --dir apps/sdkwork-cloudrouter-pc typecheck
```
