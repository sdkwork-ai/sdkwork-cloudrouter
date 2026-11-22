-- sdkwork:migration
-- id: 0054_user_model_group_routing
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add the user-scoped model routing control plane:
--   `ai_user_account_group_route` stores the ordered upstream account groups a
--   user wants for one scope (a modality, a vendor, or a single model). A scope
--   is **one-to-many**: the same model can list several groups; the router
--   tries them in `priority` order and skips a group that cannot serve the
--   requested model. Auth-token open-api traffic resolves the caller's rules
--   (model > vendor > modality) and routes to the first usable group; when no
--   rule is usable, the existing account-level default group remains the
--   fallback.
--
--   Ownership: Cloud Router routing control plane. Read by the pricing/routing
--   snapshot, written by the console surface
--   (`/app/v3/api/ai/routing/model_group_defaults`), and exposed read-only by
--   the open-api model group surfaces. Rules are soft-deleted with the standard
--   column contract.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS ai_user_account_group_route (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- 'model' applies to one model; 'vendor' to every model of a vendor;
    -- 'modality' to every model of a modality (text/image/video/audio/music).
    scope_type VARCHAR(16) NOT NULL,
    -- Catalog modality vocabulary. Empty only for a vendor/model rule that is
    -- not modality-bound.
    modality VARCHAR(32) NOT NULL DEFAULT '',
    -- Catalog vendor code. Required for 'vendor', optional for 'model'.
    vendor_code VARCHAR(128) NOT NULL DEFAULT '',
    -- Requested model name / catalog key. Required for 'model' only.
    model VARCHAR(200) NOT NULL DEFAULT '',
    account_group_id BIGINT NOT NULL,
    -- Denormalized group code so a routing read never needs a second lookup and
    -- the rule survives a group rename with an explainable diagnostic.
    account_group_code VARCHAR(128) NOT NULL DEFAULT '',
    -- Lower value = tried first. A scope may list the same group only once.
    priority INTEGER NOT NULL DEFAULT 100,
    CONSTRAINT ck_ai_user_account_group_route_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_user_account_group_route_user
        CHECK (user_id > 0),
    CONSTRAINT ck_ai_user_account_group_route_scope CHECK (
        scope_type IN ('model', 'vendor', 'modality')
        AND modality IN ('', 'text', 'image', 'video', 'audio', 'music')
        AND priority >= 0
        AND (
            (scope_type = 'modality' AND vendor_code = '' AND model = '' AND modality <> '')
            OR (scope_type = 'vendor' AND vendor_code <> '' AND model = '')
            OR (scope_type = 'model' AND model <> '')
        )
    )
);

-- One-to-many: the same scope may point at several account groups. Priority
-- orders the failover list; the group is part of the key so a scope cannot
-- list the same group twice.
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_user_account_group_route_scope_group
    ON ai_user_account_group_route (
        tenant_id, organization_id, user_id, scope_type, modality, vendor_code, model,
        account_group_id
    )
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_ai_user_account_group_route_user
    ON ai_user_account_group_route (tenant_id, organization_id, user_id, id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_ai_user_account_group_route_group
    ON ai_user_account_group_route (account_group_id, id)
    WHERE deleted_at IS NULL;

COMMIT;
