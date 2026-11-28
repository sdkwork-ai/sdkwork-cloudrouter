> Owner: SDKWork Cloud Router maintainers
> Status: implemented (2026-11-28)

# AI Capability Collections (合集)

## 1. Problem

The admin console manages four AI capability families side by side — Skills,
MCP servers, Agents, and Plugins — but each family only knows its own catalog.
There was no way to express "this workspace gets these three skills, this MCP
server, and this agent as one unit", and no way to express "this is a
skills-only bundle". Operators had to remember a list of capability names by
hand, and there was no publishable, reviewable record of such a set.

This change adds a first-class **collection** (合集) domain to the Cloud Router
admin AI-foundation surface.

## 2. Scope and ownership

- A collection is **an ordered set of capability references plus display
  metadata**. It may be a `mixed` set (skills + MCP servers + agents + plugins,
  any combination) or a single-kind set (`skill`, `mcp`, `agent`, or `plugin`).
- Collection **categories** are typed: a category belongs to exactly one
  collection kind, so a skills-only collection cannot be filed under an MCP
  category.
- Cloud Router owns the collection records (`ai_collection*`). The capability
  records themselves remain owned by `sdkwork-skills`, `sdkwork-mcp`,
  `sdkwork-agents`, and `sdkwork-plugins`. A collection item stores the owning
  **capability key** plus a display snapshot (`capability_name`,
  `capability_version`, `capability_icon_ref`); there is deliberately no
  cross-schema foreign key.
- Capability validation is therefore by reference, not by join: the collection
  does not verify that the referenced capability still exists in the sibling
  module. This is what keeps the collection plane independent of the four
  capability release cadences, at the cost of a stale reference being possible;
  the admin surface shows the stored snapshot and lets an operator fix it.

## 3. Database design

Migration `0055_ai_capability_collections` (reversible) provisions four tables.
The registry fragment `docs/schema-registry/tables/ai-collection.yaml` is the
authored source; `generated/schema/postgres/schema.sql` and the baseline are
recompiled from it, and `database/contract/schema.yaml` is materialized from the
baseline plus migrations.

### 3.1 `ai_collection_category`

Typed taxonomy. Columns: the standard tenant-entity block (`id`, `uuid`,
`tenant_id`, `organization_id`, `data_scope`, `status`, timestamps, `version`,
soft-delete, `metadata`) plus `collection_kind`, `category_code`, `name`,
`description`, `icon_ref`, `parent_id`, `sort_order`.

- `collection_kind IN ('mixed','skill','mcp','agent','plugin')`
- `category_code ~ '^[a-z0-9][a-z0-9_-]{0,127}$'`
- unique `(tenant_id, organization_id, collection_kind, category_code)`
- self parent foreign key with `ON DELETE SET NULL`; the store rejects
  self-parenting and cycles.

### 3.2 `ai_collection`

The collection header. Columns add `collection_key`, `name`, `summary`,
`description`, `icon_ref`, `collection_kind`, `category_id`, `visibility`
(`private|organization|public`), `publish_status` (`draft|published|archived`),
`published_at`, `item_count`, `tags` (JSON array), `featured`, `sort_order`,
`owner_user_id`, `created_by`, `updated_by`.

- `fk_ai_collection_category (category_id)` →
  `ai_collection_category (id)` `ON DELETE RESTRICT`.
- `uk_ai_collection_scope_key (tenant_id, organization_id, collection_key)`.
- `(publish_status <> 'published' OR published_at IS NOT NULL)`.

Category/collection kind agreement is validated by the store
(`ensure_category_kind`) before the write. The portable baseline emits
`CREATE INDEX` statements after all `CREATE TABLE` statements, so a composite
foreign key over a unique *index* cannot be declared inline; the database
therefore enforces existence (single-column foreign key) while kind agreement
stays a service-layer invariant, covered by the route contract tests.

JSONB shapes are pinned by checks as well: collection `tags` and release
`item_snapshot` must be arrays, and item `config` must be an object, so malformed
JSON cannot bypass the handler's shape validation.

Deleting a collection is a soft delete. The store truncates the original key /
code to 100 characters and appends a `#deleted-<id>` tombstone suffix in the
same update, so the original key is immediately reusable without weakening the
unique index and the result always fits `VARCHAR(128)`. The category-code check
explicitly admits that tombstone form, because the normal lowercase slug pattern
intentionally excludes `#`.

**Publish lifecycle.** `draft` ⇄ `published` → `archived`:

- publishing requires an enabled collection (`status = 1`) with at least one
  enabled item, writes an immutable snapshot of the enabled items only, and
  records the enabled count as the release item count;
- editing content (name, summary, description, icon, tags, or the item set) on a
  published or archived collection resets `publish_status` to `draft` in the
  same transaction, so `published` always means "the current content is the
  active release"; filing/visibility/featured/sort/status changes do not reset;
- archiving keeps the last release and only moves the publish state.

### 3.3 `ai_collection_item`

One capability reference in a collection: `collection_id`, the denormalized
`collection_kind`, `capability_type` (`skill|mcp|agent|plugin`),
`capability_key`, `capability_name`, `capability_version`,
`capability_icon_ref`, `config` (JSON object), `sort_order`, `enabled`.

- `fk_ai_collection_item_collection (collection_id)` → `ai_collection (id)`
  `ON DELETE CASCADE`.
- `ck_ai_collection_item_kind_matches`: `collection_kind = 'mixed' OR
  collection_kind = capability_type`. A row cannot advertise a single-kind
  collection while holding another capability type; the service also rejects an
  item whose type differs from its (single-kind) collection before insert.
- unique `(collection_id, capability_type, capability_key)`.
- items are replaced wholesale by the item editor; the table keeps the standard
  tenant-entity columns for scope/index uniformity but is hard-deleted on
  replace.

### 3.4 `ai_collection_release`

Immutable publish history: `collection_id`, `release_no` (monotonic per
collection), `name`, `item_count`, `item_snapshot` (JSON array of the item
snapshots at publish time), `release_status` (`published|revoked`), `notes`,
`published_by`, `published_at`.

- unique `(collection_id, release_no)`.
- `fk_ai_collection_release_collection (collection_id)` → `ai_collection (id)`
  `ON DELETE CASCADE`.

Publishing validates that the collection has at least one item, writes the
snapshot and bumps `publish_status` in one transaction. Archiving keeps the last
release and only moves `publish_status`.

### 3.5 Default categories

There is no cross-tenant seed row. The admin "初始化标准分类" command
(`POST /backend/v3/api/ai/collection_categories/defaults`) inserts the five
built-in per-workspace categories idempotently (`mixed/general`, `skill/skills`,
`mcp/mcp`, `agent/agents`, `plugin/plugins`), marked
`metadata = {"system": true}`. System categories are read-only in the admin UI
and rejected by the update/delete commands; operators can create additional
workspace categories freely.

## 4. HTTP contract

All routes are backend-api, dual-token auth, and answer the standard
`SdkWorkApiResponse` / `ProblemDetail` envelopes. Every int64 crosses the wire
as a decimal string (`API_SPEC.md` §13.6).

| Method | Path | Operation id |
| --- | --- | --- |
| GET | `/backend/v3/api/ai/collection_categories` | `collectionCategories.list` |
| POST | `/backend/v3/api/ai/collection_categories` | `collectionCategories.create` |
| POST | `/backend/v3/api/ai/collection_categories/defaults` | `collectionCategories.defaults.create` |
| PATCH | `/backend/v3/api/ai/collection_categories/{categoryId}` | `collectionCategories.update` |
| DELETE | `/backend/v3/api/ai/collection_categories/{categoryId}` | `collectionCategories.delete` |
| GET | `/backend/v3/api/ai/collections` | `collections.list` |
| POST | `/backend/v3/api/ai/collections` | `collections.create` |
| GET | `/backend/v3/api/ai/collections/{collectionId}` | `collections.retrieve` |
| PATCH | `/backend/v3/api/ai/collections/{collectionId}` | `collections.update` |
| DELETE | `/backend/v3/api/ai/collections/{collectionId}` | `collections.delete` |
| PUT | `/backend/v3/api/ai/collections/{collectionId}/items` | `collections.items.update` |
| PUT | `/backend/v3/api/ai/collections/{collectionId}/status` | `collections.status.update` |
| GET | `/backend/v3/api/ai/collections/{collectionId}/releases` | `collections.releases.list` |

List filters: categories accept `collection_kind`, `status`, `q`, `page`,
`page_size`; collections accept `collection_kind`, `category_id`,
`publish_status`, `status`, `featured`, `q`, `page`, `page_size`; releases
accept `page`, `page_size`. The collection `q` search covers name, key, summary,
description, and tags.

Nullable relationship edits are explicit: `parentId` and `categoryId` accept
`null` to clear the relation and are omitted to leave it unchanged. Text fields
accept an empty string to clear; omitted text is unchanged.

Errors: 400 for validation (including typed-collection mismatches), 404 for a
missing collection/category, 409 for duplicate keys and categories still in use,
500 for infrastructure failures.

The contract chain is: frontend operation contracts →
`generated/api/api-contract-manifest.json` → `generated/openapi/*` →
`apis/backend-api/**` and `sdks/cloudrouter-backend-sdk/**`. The admin UI
consumes only the generated `@sdkwork/cloudrouter-backend-sdk`; no raw HTTP.

## 5. Admin UI

Two pages under the AI Foundation Management sidebar group:

- `/admin/collection` — collection list, create/edit drawer, ordered capability
  item editor, publish/archive, delete, and publish-release history.
- `/admin/collection/categories` — category list, create/edit, delete,
  standard-category initialization.

The editor shows the kind constraint inline: a `mixed` collection offers all
four capability types, while a single-kind collection offers only its own type.
Capability references are entered by capability key plus display snapshot; the
capability catalogs themselves stay in their owning modules.

Interaction safeguards on the list and drawer:

- list metrics derived from the current page are labelled "(page)" and the
  collection total shows the filtered total; the list never implies a global
  publish-status breakdown it does not have;
- publish is blocked (and explained) when the collection is disabled or every
  item is disabled, matching the backend precondition; the dialog previews the
  enabled count and the next release number;
- deleting a collection or category keeps the dialog open and shows the problem
  message when the backend rejects it (for example a category still in use);
- the drawer and category dialog block background scroll, close on Escape,
  start focus on the least destructive action, and ask before discarding
  unsaved metadata, item edits, or an open item form;
- action failures stay inside the dialog or drawer that triggered them (or in
  the table retry state for load failures), so an error never hides rows; a
  successful mutation renders a dismissible status notice above the table;
- system category names are localized by stable category code in the console.

## 6. Verification

- Database: `pnpm db:materialize:contract --check` equivalents —
  `python -B -m tools.database_contract_materializer --root . --check`,
  `node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .`.
- Schema registry: `python -B -m tools.schema_compiler --check --materialize`,
  `python -B -m tools.schema_guardian`.
- Contract chain: `python -B -m tools.api_contract_manifest --check`,
  `python -B -m tools.cloudrouter_openapi_generator --check`,
  `node tools/generate-cloudrouter-http-route-manifest-rs.mjs --check`,
  `node tools/sync-cloudrouter-api-standard-extensions.mjs --check`,
  `node scripts/materialize-apis-contracts.mjs --check`.
- PostgreSQL smoke (scratch database): apply the baseline plus
  `0055_ai_capability_collections.up.sql`, then soft-delete a 128-character
  category code and collection key and verify the tombstones fit `VARCHAR(128)`
  while the category-code check admits the `#deleted-<id>` form; verify content
  edits reset a published collection to draft and the release snapshot contains
  only enabled items.
- Rust:
  `cargo test -p sdkwork-cloudrouter-router-service --test admin_collection_sql_contract --test admin_collection_api`,
  plus `cargo test -p sdkwork-cloudrouter-router-service --lib admin_collection::tests`.
- Frontend: `node scripts/typecheck-owned-sources.mjs`, the collection runtime
  test, and `admin-collection.dom.test.tsx` (list, publish guard, create with
  items, publish with notes, category create, dirty-close guard, typed category
  creation, system-category protection).

## 7. Requirement coverage

| Requirement | Implementation |
| --- | --- |
| Admin supports collections for skill / MCP / agent / plugin | `/admin/collection` menu group, collection and category routes, lazy-loaded admin package, shared permission hint. |
| Complete collection database design | Four tables (`ai_collection_category`, `ai_collection`, `ai_collection_item`, `ai_collection_release`), typed kind checks, JSON shape checks, unique/index/FK constraints, soft-delete tombstones, baseline + reversible migration + schema registry. |
| Manage capabilities through a collection | Ordered item add/edit/remove/enable/reorder, capability type/key plus display snapshot, JSON config, per-item enabled flag; capability records stay in the sibling modules. |
| Mixed free combination | `collection_kind = mixed` accepts skill, MCP, agent, and plugin items in one ordered set. |
| Single skill / MCP / agent / plugin list | `collection_kind = skill|mcp|agent|plugin` accepts only its own capability type in the service, handler, UI, and `ck_ai_collection_item_kind_matches`. |
| Categories: mixed / skill / MCP / agent / plugin | Typed category kind, category/collection kind agreement, five read-only standard categories per workspace, custom category CRUD, category filter and counts. |
| Publish / archive lifecycle | Draft default, enabled-item publish guard, immutable enabled-item snapshots with monotonic release numbers, archive keeps history, content edits return to draft. |
| Admin management quality | Search/filter/pagination, status enable/disable, featured/visibility/tags/sort, confirmations, error/empty/loading states, success notices, keyboard/scroll-lock/focus handling, en/zh copy. |
| Regression evidence | Route/API tests, SQL contract tests, unit tests for tags, real PostgreSQL smoke for tombstones and JSON checks, 8 DOM interaction tests, runtime tests, i18n and quality-gate checks. |

## 8. Out of scope (next iterations)

- Catalog pickers backed by the four sibling capability catalogs.
- Binding a collection to a membership plan, role, or user group at runtime.
- Desktop/SQLite persistence: the server runtime is PostgreSQL-only; the
  collection plane follows that rule and does not add a client-local schema.

