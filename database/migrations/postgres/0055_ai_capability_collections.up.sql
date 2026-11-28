-- sdkwork:migration
-- id: 0055_ai_capability_collections
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Provision the AI capability collection plane ("合集") owned by the
--   Cloud Router admin AI-foundation surface:
--
--     * `ai_collection_category` -- typed collection taxonomy. A category
--       belongs to one collection kind (mixed / skill / mcp / agent /
--       plugin), so a skills-only collection cannot be filed under an MCP
--       category.
--     * `ai_collection`          -- a named, ordered capability set for one
--       workspace, with visibility, publish state, and display metadata.
--     * `ai_collection_item`     -- one capability reference (skill / mcp /
--       agent / plugin) inside a collection, with a display snapshot and an
--       ordered position. The capability record itself stays owned by its
--       sibling repository; this table stores the owning capability key.
--     * `ai_collection_release`  -- immutable publish history: every publish
--       freezes the collection name and the enabled-item snapshot under a
--       monotonic release number.
--
--   Kind integrity is enforced transactionally by the collection store, which
--   locks the collection/category scope before writing: a collection may only
--   be filed under a category of the same kind, and a single-kind collection
--   accepts only its own capability type (`mixed` accepts every type). The
--   database also pins each item's denormalized `collection_kind` to its
--   `capability_type` through `ck_ai_collection_item_kind_matches`, and the
--   single-column foreign keys keep category/collection references valid.
--   JSON shapes are pinned too: `tags` and `item_snapshot` must be arrays and
--   item `config` must be an object, so a malformed JSON value cannot bypass
--   the handler's shape validation.
--
--   These tables are also declared in the project schema registry
--   (`docs/schema-registry/tables/ai-collection.yaml`) and appear in the
--   recompiled baseline for fresh installs. Every statement is
--   `IF NOT EXISTS`, so replaying against a baseline-built database is a no-op.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS ai_collection_category (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    collection_kind VARCHAR(32) NOT NULL,
    category_code VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(4000) NOT NULL DEFAULT '',
    icon_ref VARCHAR(512) NOT NULL DEFAULT '',
    parent_id BIGINT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_ai_collection_category_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_collection_category_parent FOREIGN KEY (parent_id) REFERENCES ai_collection_category (id) ON DELETE SET NULL,
    CONSTRAINT ck_ai_collection_category_kind CHECK (collection_kind IN ('mixed', 'skill', 'mcp', 'agent', 'plugin')),
    CONSTRAINT ck_ai_collection_category_code CHECK ((category_code ~ '^[a-z0-9][a-z0-9_-]{0,127}$' OR category_code ~ '^[a-z0-9][a-z0-9_-]{0,99}#deleted-[0-9]{1,19}$')),
    CONSTRAINT ck_ai_collection_category_values CHECK (length(trim(name)) > 0 AND sort_order >= 0 AND (parent_id IS NULL OR parent_id > 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_collection_category_scope_code ON ai_collection_category (tenant_id, organization_id, collection_kind, category_code);
CREATE INDEX IF NOT EXISTS idx_ai_collection_category_scope_kind ON ai_collection_category (tenant_id, organization_id, collection_kind, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_collection_category_parent ON ai_collection_category (parent_id);

CREATE TABLE IF NOT EXISTS ai_collection (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    collection_key VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    summary VARCHAR(1024) NOT NULL DEFAULT '',
    description VARCHAR(8000) NOT NULL DEFAULT '',
    icon_ref VARCHAR(512) NOT NULL DEFAULT '',
    collection_kind VARCHAR(32) NOT NULL,
    category_id BIGINT,
    visibility VARCHAR(32) NOT NULL DEFAULT 'organization',
    publish_status VARCHAR(32) NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    item_count BIGINT NOT NULL DEFAULT 0,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    featured BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    owner_user_id BIGINT NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_ai_collection_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_collection_category FOREIGN KEY (category_id) REFERENCES ai_collection_category (id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_collection_kind CHECK (collection_kind IN ('mixed', 'skill', 'mcp', 'agent', 'plugin')),
    CONSTRAINT ck_ai_collection_visibility CHECK (visibility IN ('private', 'organization', 'public')),
    CONSTRAINT ck_ai_collection_publish_status CHECK (publish_status IN ('draft', 'published', 'archived')),
    CONSTRAINT ck_ai_collection_values CHECK (length(trim(collection_key)) > 0 AND length(trim(name)) > 0 AND item_count >= 0 AND sort_order >= 0 AND (publish_status <> 'published' OR published_at IS NOT NULL)),
    CONSTRAINT ck_ai_collection_tags_array CHECK (jsonb_typeof(tags) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_collection_scope_key ON ai_collection (tenant_id, organization_id, collection_key);
CREATE INDEX IF NOT EXISTS idx_ai_collection_scope_kind_status ON ai_collection (tenant_id, organization_id, collection_kind, publish_status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_collection_scope_category ON ai_collection (tenant_id, organization_id, category_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_collection_scope_featured ON ai_collection (tenant_id, organization_id, featured, sort_order, id);

CREATE TABLE IF NOT EXISTS ai_collection_item (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    collection_id BIGINT NOT NULL,
    collection_kind VARCHAR(32) NOT NULL,
    capability_type VARCHAR(32) NOT NULL,
    capability_key VARCHAR(191) NOT NULL,
    capability_name VARCHAR(255) NOT NULL DEFAULT '',
    capability_version VARCHAR(64) NOT NULL DEFAULT '',
    capability_icon_ref VARCHAR(512) NOT NULL DEFAULT '',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT ck_ai_collection_item_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_collection_item_collection FOREIGN KEY (collection_id) REFERENCES ai_collection (id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_collection_item_capability_type CHECK (capability_type IN ('skill', 'mcp', 'agent', 'plugin')),
    CONSTRAINT ck_ai_collection_item_kind_matches CHECK (collection_kind IN ('mixed', 'skill', 'mcp', 'agent', 'plugin') AND (collection_kind = 'mixed' OR collection_kind = capability_type)),
    CONSTRAINT ck_ai_collection_item_values CHECK (length(trim(capability_key)) > 0 AND sort_order >= 0),
    CONSTRAINT ck_ai_collection_item_config_object CHECK (jsonb_typeof(config) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_collection_item_capability ON ai_collection_item (collection_id, capability_type, capability_key);
CREATE INDEX IF NOT EXISTS idx_ai_collection_item_order ON ai_collection_item (collection_id, sort_order, id);

CREATE TABLE IF NOT EXISTS ai_collection_release (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    collection_id BIGINT NOT NULL,
    release_no INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    item_count BIGINT NOT NULL DEFAULT 0,
    item_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    release_status VARCHAR(32) NOT NULL DEFAULT 'published',
    notes VARCHAR(1024) NOT NULL DEFAULT '',
    published_by BIGINT NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_ai_collection_release_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_collection_release_collection FOREIGN KEY (collection_id) REFERENCES ai_collection (id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_collection_release_values CHECK (release_no > 0 AND item_count >= 0 AND release_status IN ('published', 'revoked')),
    CONSTRAINT ck_ai_collection_release_snapshot_array CHECK (jsonb_typeof(item_snapshot) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_collection_release_order ON ai_collection_release (collection_id, release_no);
CREATE INDEX IF NOT EXISTS idx_ai_collection_release_published ON ai_collection_release (collection_id, published_at, id);

COMMIT;

