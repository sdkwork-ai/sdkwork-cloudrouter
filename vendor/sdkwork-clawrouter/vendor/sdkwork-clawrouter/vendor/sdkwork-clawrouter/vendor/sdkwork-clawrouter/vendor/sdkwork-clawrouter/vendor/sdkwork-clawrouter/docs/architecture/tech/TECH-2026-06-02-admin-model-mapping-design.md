> Migrated from `docs/superpowers/specs/2026-06-02-admin-model-mapping-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Admin Model Mapping Design

## Goal

Add an admin model mapping configuration surface under `/admin/model/mappings` so operators can maintain one mapping rule with multiple source-to-target model relationships and explicit associated content.

## Rule Model

Model mapping uses three AI-domain tables owned by `ai-routing-service`:

- `ai_model_mapping_rule`: rule header with source vendor, target vendor, mapping mode, match type, enabled state, audit columns, and metadata.
- `ai_model_mapping_rule_item`: child model mapping rows under one rule. Each item stores one `source_model -> target_model` relationship and supports create, update, and soft delete during rule editing.
- `ai_model_mapping_rule_binding`: associated content for the rule. This is the normalized middle table for global, vendor, channel group, channel, provider account, site, and site service bindings.

The rule table does not store `source_model`, `target_model`, `scope_type`, `vendor_id`, `channel_id`, priority, descriptions, or effective windows. Model relationships belong to `ai_model_mapping_rule_item`; scope and associated content belong to `ai_model_mapping_rule_binding`.

## Associated Content

`ai_channel_group` is the account-pool concept in this codebase. `ai_channel_group_member` already maps channel groups to channels. A mapping rule therefore binds account pools through `ai_model_mapping_rule_binding.binding_type = 'channel_group'` instead of overloading `ai_channel`.

Supported binding types are:

- `global`: applies to every request when no narrower rule matches.
- `vendor`: applies when the selected or resolved vendor matches the binding code.
- `channel_group`: applies when the selected channel belongs to an account pool.
- `channel`: applies to one concrete `ai_channel`.
- `provider_account`: applies to one concrete `integration_provider_account`.
- `site`: applies to one `ai_site`.
- `site_service`: applies to one `ai_site_service`.

The fixed resolution order is `provider_account > channel > channel_group > vendor > global`. Within one binding level, enabled active rules are ordered by binding sort order, rule update time, then rule id.

## Product Behavior

The admin page is a rule list. One row represents one mapping rule, not one model relationship. Columns are scope, associated content, source vendor, target vendor, model mappings, status, and actions.

The associated content cell renders concise entries such as `Global`, `Vendor: OpenAI`, `Pool: vip_pool`, `Channel: ch-openai-01`, or `Account: acct-openai-prod`. The model mappings cell renders multiple item rows in one table cell, for example `gpt-5.5 -> deepseek-v4-pro` and `gpt-4o -> deepseek-chat`, with overflow collapsed as `+N`.

The create/edit dialog stays simple. The left side selects source vendor, target vendor, and associated content bindings. The right side is an editable two-column model mapping table: source model and target model. Each cell is a searchable combobox that also accepts manual input. Priority, description, effective windows, provider model, native provider model, and pick/manual toggles are intentionally removed.

## Mutation Semantics

Create stores exactly one `ai_model_mapping_rule`, one or more `ai_model_mapping_rule_item` rows, and one or more `ai_model_mapping_rule_binding` rows in one transaction.

Update never creates a new rule. It updates the selected rule header and reconciles children in one transaction:

- Child item or binding with an id is updated.
- Child item or binding without an id is inserted.
- Existing active child item or binding omitted from the request is soft-deleted.

Validation requires source vendor, target vendor, at least one binding, at least one model mapping item, non-empty source and target models, and no duplicate source model inside one rule.

## API

Backend management APIs:

- `GET /backend/v3/api/ai/model_mappings`
- `POST /backend/v3/api/ai/model_mappings`
- `PATCH /backend/v3/api/ai/model_mappings/{mappingId}`
- `DELETE /backend/v3/api/ai/model_mappings/{mappingId}`
- `POST /backend/v3/api/ai/model_mappings/resolve`

Requests and responses expose `bindings` and `mappingItems`. The frontend must call these APIs through generated `@sdkwork/clawrouter-backend-sdk`, exposed as `getClawRouterBackendSdkClient().ai.modelMappings.*`.

