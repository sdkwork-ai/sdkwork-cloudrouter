# PostgreSQL migrations

Versioned incremental migrations for post-baseline schema changes. These files
remain immutable after their checksums enter lifecycle history, including during
pre-release baseline consolidation.

Pre-release consolidation (2026-08-06) folded migrations `0002`–`0014` into the
baseline `0001_cloudrouter_baseline.sql`; their files were removed from this
directory. Their purpose is recorded under "Historical migrations" below so the
development lifecycle history stays readable.

## Current migrations

- `0015_upstream_account_resource.up.sql` adds per-account resource and
  resource-group bindings so each upstream account can scope which catalog
  resources it serves, independently of account groups.
- `0018_user_settings_console.up.sql` materializes the console user settings
  tables backing the app settings surface (`/app/v3/api/iam/users/settings`):
  per-user preferences and integration webhook endpoints.
- `0019_organization_id_not_null_legacy_tables.up.sql` enforces
  `organization_id NOT NULL DEFAULT` on tables created by earlier migrations
  that predate the standard column contract.
- `0020_upstream_account_group_default_flag.up.sql` adds the `is_default`
  flag to `ai_upstream_account_group` with a partial unique index enforcing at
  most one default group per tenant and organization, and promotes the seeded
  `standard-group` to the default group. The API transaction clears the previous
  default when a new one is set.
- `0021_add_runtime_event_artifact_tables.up.sql` creates `ai_runtime_invocation_event`
  and `ai_runtime_artifact` so the app runtime store contract (invocation
  events and artifacts) is backed by real tables, closing the schema drift
  where the store wrote tables that had no DDL or migration. The baseline
  (0001) carries the same definitions for clean installs.
- `0022_runtime_invocation_scope_sequence_guard.up.sql` closes the invocation
  ordinal race: the scope key columns (`conversation_id`, `chat_turn_id`,
  `agent_session_id`) become NOT NULL with an empty-string default so the
  scoped sequence unique index guards every row.
- `0023_ops_metric_snapshot_period_indexes.up.sql` adds period-range indexes
  to `ops_metric_snapshot` so the admin monitor performance query is served by
  an index; the baseline carries the same definitions for clean installs.
- `0024_add_upstream_supplier_protocols.up.sql` adds the `protocols` JSONB
  array to `ai_upstream_supplier` so a supplier can declare multiple LLM API
  protocols.
- `0025_upstream_account_group_model_lists.up.sql` adds model
  blacklist/whitelist JSONB arrays to `ai_upstream_account_group` so a group
  can declare per-vendor model access rules.
- `0026_add_upstream_supplier_model_lists.up.sql` adds model
  blacklist/whitelist JSONB arrays to `ai_upstream_supplier` with the same
  field names as the group lists.
- `0027_add_upstream_supplier_endpoint_vendors.up.sql` adds a `vendor_codes`
  JSONB array to `ai_upstream_supplier_endpoint` so a relay station (endpoint)
  can serve multiple official vendors at once.
- `0028_add_upstream_supplier_default_base_url.up.sql` adds a
  `default_base_url` column to `ai_upstream_supplier` so a supplier can declare
  a fallback Base URL used when an invocation resource (e.g. image, video,
  audio APIs) does not match any configured LLM API protocol endpoint. When
  absent, routing falls back to the protocol endpoint Base URL.
- `0029_api_key_group_binding_routing_strategy.up.sql` migrates legacy API key
  account group bindings from `routing_strategy` `auto` (follow group default)
  to the default business routing strategy.

## Historical migrations

Folded into the baseline (`0001_cloudrouter_baseline.sql`) during pre-release
consolidation; the files no longer exist in this directory.

- `0002_ai_request_trace_gateway_attribution.up.sql` is the historical migration
  recorded in existing development lifecycle history.
- `0003_standardize_upstream_supplier_routing.up.sql` migrates the legacy
  provider/site/channel model to supplier/account aggregates. It is an
  irreversible, forward-fix migration that required human review before
  execution because its verified contract phase drops retired legacy tables.
- `0004_add_chat_runtime_schema.up.sql` creates the user-scoped chat transcript,
  context snapshot, runtime invocation, and usage-link authority. It accepts
  either an empty pre-launch schema or the complete folded-baseline shape and
  fails closed when only part of the eight-table contract exists.
- `0005_reconcile_upstream_supplier_routing.up.sql` repairs a partially applied
  `0003` without changing lifecycle history. It backfills canonical supplier and
  account references, retires remaining provider/channel columns and empty
  prototype tables, and fails closed on conflicts, orphan references, or legacy
  fields that still contain data.
- `0006_align_chat_runtime_optional_cost.up.sql` keeps `0004` immutable while
  aligning chat turn and runtime usage costs with the optional decimal contract.
  It performs metadata-only nullability/default changes and replaces the two
  non-negative checks with null-aware constraints.
- `0007_reconcile_canonical_contract_constraints.up.sql` reconciles legacy
  nullability, validated constraints, and soft-delete-aware unique indexes with
  the materialized Cloud Router contract. It fails closed on null, scope, range,
  relationship, or uniqueness violations instead of rewriting business data.
- `0009_account_group_vendor_modalities.up.sql` adds optional model vendor
  binding (`vendor_code`, NULL = not vendor-bound) and the supported modality
  set (`modalities` JSONB array of text/audio/image/video/music) to
  `ai_upstream_account_group`, with a vendor lookup index. It is a
  column-addition-only migration with no row backfill.
- `0014_ops_referral_invite.up.sql` adds the invite-code registration capability
  tables: `ops_referral_invite_code` (per-user referral code),
  `ops_referral_relation` (inviter/invitee binding on invite-code registration),
  and `ops_referral_strategy` (marketing-center referral reward strategy
  configuration). Reward granting is a follow-up phase; relations carry a
  `reward_status` marker only.

## Naming

Add SQL files using `{version}_{name}.up.sql` and optional `{version}_{name}.down.sql`.

Example:

```
0005_usage_settlement_index.up.sql
0005_usage_settlement_index.down.sql
```

## Rules

- The baseline in `database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql` represents the initial installed schema.
- Development migrations run only in the shared `sdkwork_ai_dev` database and
  `sdkwork_ai_dev` schema. They must not create, drop, alter, or switch databases
  or schemas.
- Do not replay the baseline over a non-empty shared schema or replace an applied
  migration with a folded-baseline revision. Repair drift through a reviewed
  forward migration while preserving lifecycle history.
- After GA, **do not** change production schema only by regenerating the baseline; add an incremental migration and update the schema registry contract.
- Run `pnpm db:plan` and `pnpm db:drift:check` before merge.
- Production upgrades use controlled jobs (`deployments/kubernetes/cloud-router-migration-job.yaml`) with `SDKWORK_CLOUDROUTER_STARTUP_INSTALL_MODE=skip`.
