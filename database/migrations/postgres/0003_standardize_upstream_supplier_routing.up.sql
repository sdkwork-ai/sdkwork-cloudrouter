-- sdkwork:migration
-- id: 0003_standardize_upstream_supplier_routing
-- engine: postgres
-- module: clawrouter
-- purpose: Replace provider/site/channel persistence with supplier/account/account-group aggregates.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: access-exclusive-on-legacy-routing-tables
-- lock_timeout: 5s
-- statement_timeout: 10min
-- rewrite: Legacy routing tables are copied into canonical tables and removed after verification.
-- replication_impact: Bounded by the pre-launch routing catalog size; monitor WAL bytes and replica lag.
-- backfill: Single-transaction deterministic copy with explicit orphan and ambiguity checks.
-- observability: Migration history, row-count verification, PostgreSQL lock waits, WAL bytes, and replica lag.
-- cancellation: Cancel before the contract-phase DROP TABLE statements; transaction rollback restores all state.
-- recovery: Fix rejected legacy rows and rerun, or deploy a reviewed forward-fix before accepting writes.
-- contract_version: 0.3.0

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10min';

DO $sdkwork_migration$
DECLARE
    missing_table TEXT;
    integration_account_count BIGINT := 0;
    service_provider_edge_count BIGINT := 0;
    max_supplier_id BIGINT;
    site_count BIGINT;
    max_child_id BIGINT;
    credential_candidate_count BIGINT;
BEGIN
    -- The current folded baseline already contains the canonical model. A
    -- legacy schema is identified by ai_channel, the former account authority.
    IF to_regclass('ai_channel') IS NULL THEN
        RETURN;
    END IF;

    FOREACH missing_table IN ARRAY ARRAY[
        'ai_provider',
        'ai_site',
        'ai_site_service',
        'ai_channel_credential',
        'ai_channel_group',
        'ai_channel_group_member',
        'ai_channel_group_metric_snapshot',
        'ai_channel_group_resource',
        'ai_channel_resource'
    ] LOOP
        IF to_regclass(missing_table) IS NULL THEN
            RAISE EXCEPTION 'legacy upstream migration is incomplete: required table % is missing', missing_table;
        END IF;
    END LOOP;

    FOREACH missing_table IN ARRAY ARRAY[
        'ai_upstream_supplier',
        'ai_upstream_supplier_endpoint',
        'ai_upstream_supplier_auth_method',
        'ai_upstream_supplier_resource',
        'ai_upstream_account',
        'ai_upstream_account_credential',
        'ai_upstream_account_group',
        'ai_upstream_account_group_member',
        'ai_upstream_account_group_metric_snapshot',
        'ai_upstream_account_group_resource'
    ] LOOP
        IF to_regclass(missing_table) IS NOT NULL THEN
            RAISE EXCEPTION 'legacy upstream migration refuses a mixed schema: canonical table % already exists', missing_table;
        END IF;
    END LOOP;

    IF to_regclass('integration_provider_account') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM integration_provider_account WHERE deleted_at IS NULL'
            INTO integration_account_count;
        IF integration_account_count > 0 THEN
            RAISE EXCEPTION
                'integration_provider_account contains % active cross-domain accounts; classify them before retiring the integration prototype',
                integration_account_count;
        END IF;
    END IF;
    IF to_regclass('ai_usage_service_provider_edge') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM ai_usage_service_provider_edge'
            INTO service_provider_edge_count;
        IF service_provider_edge_count > 0 THEN
            RAISE EXCEPTION
                'ai_usage_service_provider_edge contains % legacy settlement rows; export and reconcile them before retiring the prototype',
                service_provider_edge_count;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM ai_provider p
          JOIN ai_site s
            ON s.tenant_id = p.tenant_id
           AND s.organization_id = p.organization_id
           AND lower(trim(s.site_code)) = lower(trim(p.provider_code))
         WHERE p.deleted_at IS NULL
           AND s.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'provider/site supplier-code collision is ambiguous; assign distinct supplier codes before migration';
    END IF;

    IF EXISTS (
        SELECT 1 FROM ai_provider WHERE nullif(trim(provider_code), '') IS NULL
        UNION ALL
        SELECT 1 FROM ai_site WHERE nullif(trim(site_code), '') IS NULL
    ) THEN
        RAISE EXCEPTION 'legacy provider/site contains a blank supplier code';
    END IF;

    CREATE TABLE ai_upstream_supplier
        (LIKE ai_provider INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
    INSERT INTO ai_upstream_supplier SELECT * FROM ai_provider;
    ALTER TABLE ai_upstream_supplier RENAME COLUMN provider_code TO supplier_code;
    ALTER TABLE ai_upstream_supplier RENAME COLUMN provider_type TO supplier_type;
    ALTER TABLE ai_upstream_supplier
        ADD COLUMN supplier_name VARCHAR(128),
        ADD COLUMN adapter_code VARCHAR(64),
        ADD COLUMN owner_kind VARCHAR(32),
        ADD COLUMN region_code VARCHAR(64),
        ADD COLUMN environment INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN health_status INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN last_latency_ms INTEGER,
        ADD COLUMN consecutive_error_count BIGINT NOT NULL DEFAULT 0,
        ADD COLUMN last_checked_at TIMESTAMPTZ,
        ADD COLUMN last_sync_at TIMESTAMPTZ;
    UPDATE ai_upstream_supplier
       SET supplier_name = display_name,
           supplier_type = CASE lower(trim(coalesce(supplier_type, 'official')))
               WHEN 'relay' THEN 'relay'
               WHEN 'site' THEN 'relay'
               ELSE 'official'
           END,
           adapter_code = coalesce(nullif(trim(default_vendor_code), ''), supplier_code),
           protocol_code = coalesce(nullif(trim(protocol_code), ''), 'openai'),
           sort_order = coalesce(sort_order, 100),
           metadata = coalesce(metadata, '{}'::jsonb)
               || jsonb_build_object('legacyProviderId', id);
    ALTER TABLE ai_upstream_supplier
        ALTER COLUMN supplier_name SET NOT NULL,
        ALTER COLUMN supplier_type SET DEFAULT 'official',
        ALTER COLUMN supplier_type SET NOT NULL,
        ALTER COLUMN adapter_code SET NOT NULL,
        ALTER COLUMN protocol_code SET NOT NULL,
        ALTER COLUMN sort_order SET DEFAULT 100,
        ALTER COLUMN sort_order SET NOT NULL,
        DROP COLUMN base_url,
        DROP COLUMN auth_type,
        DROP COLUMN resource_schema,
        DROP CONSTRAINT IF EXISTS ck_ai_provider_tenant_scope;
    ALTER TABLE ai_upstream_supplier
        ADD CONSTRAINT ck_ai_upstream_supplier_tenant_scope
            CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
        ADD CONSTRAINT ck_ai_upstream_supplier_type
            CHECK (supplier_type IN ('official', 'relay')),
        ADD CONSTRAINT ck_ai_upstream_supplier_health_values
            CHECK ((last_latency_ms IS NULL OR last_latency_ms >= 0) AND consecutive_error_count >= 0);

    SELECT coalesce(max(id), 0) INTO max_supplier_id FROM ai_upstream_supplier;
    SELECT count(*) INTO site_count FROM ai_site;
    IF max_supplier_id > 9223372036854775807 - site_count THEN
        RAISE EXCEPTION 'supplier id allocation would overflow BIGINT';
    END IF;

    CREATE TEMP TABLE _site_supplier_map ON COMMIT DROP AS
    SELECT s.tenant_id,
           s.organization_id,
           s.id AS site_id,
           max_supplier_id + row_number() OVER (ORDER BY s.tenant_id, s.organization_id, s.id) AS supplier_id
      FROM ai_site s;

    INSERT INTO ai_upstream_supplier (
        id, uuid, tenant_id, organization_id, data_scope, status,
        created_at, updated_at, version, deleted_at, deleted_by, metadata,
        supplier_code, supplier_name, display_name, description,
        icon_drive_uri, icon_resource_snapshot, color_token, docs_url, website_url,
        default_vendor_code, supplier_type, adapter_code, protocol_code,
        owner_kind, region_code, environment, health_status, last_latency_ms,
        consecutive_error_count, last_checked_at, last_sync_at,
        metadata_schema_version, sort_order
    )
    SELECT m.supplier_id,
           substr('legacy-site-supplier-' || m.supplier_id::text, 1, 64),
           s.tenant_id, s.organization_id, s.data_scope, s.status,
           s.created_at, s.updated_at, s.version, s.deleted_at, s.deleted_by,
           coalesce(s.metadata, '{}'::jsonb) || jsonb_build_object('legacySiteId', s.id),
           s.site_code, s.site_name, s.display_name, s.description,
           s.logo_drive_uri, s.logo_resource_snapshot, s.color_token, s.docs_url, s.website_url,
           NULL, 'relay', s.site_code, 'openai',
           s.owner_kind, s.region_code, s.environment, s.health_status, s.last_latency_ms,
           s.consecutive_error_count, s.last_checked_at, s.last_sync_at,
           NULL, s.sort_order
      FROM ai_site s
      JOIN _site_supplier_map m
        ON m.tenant_id = s.tenant_id
       AND m.organization_id = s.organization_id
       AND m.site_id = s.id;

    CREATE UNIQUE INDEX uk_ai_upstream_supplier_uuid
        ON ai_upstream_supplier (uuid);
    ALTER TABLE ai_upstream_supplier ADD PRIMARY KEY (id);
    CREATE UNIQUE INDEX uk_ai_upstream_supplier_tenant_code
        ON ai_upstream_supplier (tenant_id, organization_id, supplier_code);
    CREATE UNIQUE INDEX uk_ai_upstream_supplier_scope_id
        ON ai_upstream_supplier (tenant_id, organization_id, id);
    CREATE UNIQUE INDEX uk_ai_upstream_supplier_scope_identity
        ON ai_upstream_supplier (tenant_id, organization_id, id, supplier_code);
    CREATE INDEX idx_ai_upstream_supplier_status_sort
        ON ai_upstream_supplier (tenant_id, organization_id, status, sort_order, id);
    CREATE INDEX idx_ai_upstream_supplier_adapter_status
        ON ai_upstream_supplier (tenant_id, organization_id, adapter_code, protocol_code, status, id);

    CREATE TEMP TABLE _legacy_service_credential ON COMMIT DROP AS
    SELECT ss.tenant_id, ss.organization_id, ss.id AS site_service_id,
           ss.credential_ref, ss.credential_hash, ss.masked_label,
           ss.credential_version, ss.last_verified_at
      FROM ai_site_service ss
     WHERE nullif(trim(coalesce(ss.credential_ref, '')), '') IS NOT NULL
        OR nullif(trim(coalesce(ss.credential_hash, '')), '') IS NOT NULL;
    IF EXISTS (
        SELECT 1 FROM _legacy_service_credential
         WHERE nullif(trim(coalesce(credential_ref, '')), '') IS NULL
            OR nullif(trim(coalesce(credential_hash, '')), '') IS NULL
    ) THEN
        RAISE EXCEPTION 'site service contains a partial credential reference/hash pair';
    END IF;
    IF EXISTS (
        SELECT 1 FROM ai_site_service ss
         WHERE NOT EXISTS (
             SELECT 1 FROM ai_site s
              WHERE s.tenant_id = ss.tenant_id
                AND s.organization_id = ss.organization_id
                AND s.id = ss.site_id
         )
    ) THEN
        RAISE EXCEPTION 'site service contains an orphan supplier reference';
    END IF;

    CREATE TABLE ai_upstream_supplier_endpoint
        (LIKE ai_site_service INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
    INSERT INTO ai_upstream_supplier_endpoint SELECT * FROM ai_site_service;
    UPDATE ai_upstream_supplier_endpoint e
       SET base_url = coalesce(nullif(trim(e.base_url), ''), nullif(trim(s.base_url), ''))
      FROM ai_site s
     WHERE s.tenant_id = e.tenant_id
       AND s.organization_id = e.organization_id
       AND s.id = e.site_id;
    IF EXISTS (SELECT 1 FROM ai_upstream_supplier_endpoint WHERE nullif(trim(base_url), '') IS NULL) THEN
        RAISE EXCEPTION 'site service has no usable Base URL and cannot become a supplier endpoint';
    END IF;
    ALTER TABLE ai_upstream_supplier_endpoint RENAME COLUMN site_id TO supplier_id;
    ALTER TABLE ai_upstream_supplier_endpoint RENAME COLUMN site_code TO supplier_code;
    ALTER TABLE ai_upstream_supplier_endpoint RENAME COLUMN service_code TO endpoint_code;
    ALTER TABLE ai_upstream_supplier_endpoint RENAME COLUMN service_name TO endpoint_name;
    ALTER TABLE ai_upstream_supplier_endpoint RENAME COLUMN last_verified_at TO last_checked_at;
    ALTER TABLE ai_upstream_supplier_endpoint RENAME COLUMN sort_order TO priority;
    UPDATE ai_upstream_supplier_endpoint e
       SET supplier_id = m.supplier_id,
           supplier_code = s.site_code
      FROM _site_supplier_map m
      JOIN ai_site s
        ON s.tenant_id = m.tenant_id
       AND s.organization_id = m.organization_id
       AND s.id = m.site_id
     WHERE e.tenant_id = m.tenant_id
       AND e.organization_id = m.organization_id
       AND e.supplier_id = m.site_id;
    ALTER TABLE ai_upstream_supplier_endpoint
        ADD COLUMN routing_weight INTEGER NOT NULL DEFAULT 100,
        ADD COLUMN timeout_ms INTEGER;
    ALTER TABLE ai_upstream_supplier_endpoint
        RENAME CONSTRAINT ck_ai_site_service_tenant_scope TO ck_ai_upstream_supplier_endpoint_tenant_scope;
    ALTER TABLE ai_upstream_supplier_endpoint
        DROP COLUMN service_type,
        DROP COLUMN auth_type,
        DROP COLUMN credential_profile,
        DROP COLUMN auth_config,
        DROP COLUMN credential_ref,
        DROP COLUMN credential_hash,
        DROP COLUMN masked_label,
        DROP COLUMN credential_version;
    ALTER TABLE ai_upstream_supplier_endpoint
        ALTER COLUMN base_url SET NOT NULL,
        ADD CONSTRAINT fk_ai_upstream_supplier_endpoint_supplier
            FOREIGN KEY (tenant_id, organization_id, supplier_id, supplier_code)
            REFERENCES ai_upstream_supplier
                (tenant_id, organization_id, id, supplier_code) ON DELETE RESTRICT,
        ADD CONSTRAINT ck_ai_upstream_supplier_endpoint_values
            CHECK (priority >= 0 AND routing_weight >= 0 AND (timeout_ms IS NULL OR timeout_ms > 0)
                AND (last_latency_ms IS NULL OR last_latency_ms >= 0) AND consecutive_error_count >= 0);

    SELECT greatest(
        coalesce((SELECT max(id) FROM ai_upstream_supplier_endpoint), 0),
        coalesce((SELECT max(id) FROM ai_channel), 0),
        coalesce((SELECT max(id) FROM ai_provider), 0),
        coalesce((SELECT max(id) FROM ai_site), 0)
    ) INTO max_child_id;
    WITH endpoint_candidates AS (
        SELECT p.tenant_id, p.organization_id, p.id AS supplier_id, p.provider_code AS supplier_code,
               'provider-default'::VARCHAR(64) AS endpoint_code,
               (p.display_name || ' default')::VARCHAR(128) AS endpoint_name,
               p.base_url, p.protocol_code, NULL::VARCHAR(64) AS region_code,
               1 AS environment, coalesce(p.sort_order, 100) AS priority
          FROM ai_provider p
         WHERE nullif(trim(p.base_url), '') IS NOT NULL
        UNION ALL
        SELECT s.tenant_id, s.organization_id, m.supplier_id, s.site_code,
               'site-default'::VARCHAR(64), (s.site_name || ' default')::VARCHAR(128),
               s.base_url, 'openai'::VARCHAR(64), s.region_code, s.environment, s.sort_order
          FROM ai_site s
          JOIN _site_supplier_map m
            ON m.tenant_id = s.tenant_id AND m.organization_id = s.organization_id AND m.site_id = s.id
         WHERE nullif(trim(s.base_url), '') IS NOT NULL
    ), missing AS (
        SELECT c.*
          FROM endpoint_candidates c
         WHERE NOT EXISTS (
             SELECT 1 FROM ai_upstream_supplier_endpoint e
              WHERE e.tenant_id = c.tenant_id
                AND e.organization_id = c.organization_id
                AND e.supplier_id = c.supplier_id
                AND rtrim(e.base_url, '/') = rtrim(c.base_url, '/')
         )
    ), numbered AS (
        SELECT m.*, row_number() OVER (ORDER BY tenant_id, organization_id, supplier_id, endpoint_code) AS offset_id
          FROM missing m
    )
    INSERT INTO ai_upstream_supplier_endpoint (
        id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
        version, metadata, supplier_id, supplier_code, endpoint_code, endpoint_name,
        base_url, protocol_code, region_code, environment, health_status,
        consecutive_error_count, priority, routing_weight
    )
    SELECT max_child_id + offset_id,
           substr('legacy-supplier-endpoint-' || (max_child_id + offset_id)::text, 1, 64),
           tenant_id, organization_id, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
           0, '{}'::jsonb, supplier_id, supplier_code, endpoint_code, endpoint_name,
           base_url, protocol_code, region_code, environment, 1, 0, priority, 100
      FROM numbered;

    CREATE UNIQUE INDEX uk_ai_upstream_supplier_endpoint_uuid
        ON ai_upstream_supplier_endpoint (uuid);
    ALTER TABLE ai_upstream_supplier_endpoint ADD PRIMARY KEY (id);
    CREATE UNIQUE INDEX uk_ai_upstream_supplier_endpoint_tenant_code
        ON ai_upstream_supplier_endpoint (tenant_id, organization_id, supplier_id, endpoint_code);
    CREATE UNIQUE INDEX uk_ai_upstream_supplier_endpoint_scope_id
        ON ai_upstream_supplier_endpoint (tenant_id, organization_id, supplier_id, id);
    CREATE INDEX idx_ai_upstream_supplier_endpoint_supplier_status
        ON ai_upstream_supplier_endpoint (tenant_id, organization_id, supplier_id, status, priority, routing_weight, id);
    CREATE INDEX idx_ai_upstream_supplier_endpoint_health_status
        ON ai_upstream_supplier_endpoint (tenant_id, organization_id, status, health_status, id);

    CREATE TEMP TABLE _legacy_inline_credential ON COMMIT DROP AS
    SELECT c.tenant_id, c.organization_id, c.id AS channel_id,
           c.credential_ref, c.credential_hash, c.masked_label,
           coalesce(c.credential_version, 1) AS credential_version,
           c.last_rotated_at, c.last_verified_at, c.last_used_at
      FROM ai_channel c
     WHERE nullif(trim(coalesce(c.credential_ref, '')), '') IS NOT NULL
        OR nullif(trim(coalesce(c.credential_hash, '')), '') IS NOT NULL;
    IF EXISTS (
        SELECT 1 FROM _legacy_inline_credential
         WHERE nullif(trim(coalesce(credential_ref, '')), '') IS NULL
            OR nullif(trim(coalesce(credential_hash, '')), '') IS NULL
    ) THEN
        RAISE EXCEPTION 'channel contains a partial credential reference/hash pair';
    END IF;

    CREATE TABLE ai_upstream_account
        (LIKE ai_channel INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
    INSERT INTO ai_upstream_account SELECT * FROM ai_channel;
    ALTER TABLE ai_upstream_account RENAME COLUMN provider_id TO supplier_id;
    ALTER TABLE ai_upstream_account RENAME COLUMN provider_code TO supplier_code;
    ALTER TABLE ai_upstream_account RENAME COLUMN site_service_id TO preferred_endpoint_id;
    ALTER TABLE ai_upstream_account RENAME COLUMN channel_code TO account_code;
    ALTER TABLE ai_upstream_account RENAME COLUMN channel_name TO account_name;
    ALTER TABLE ai_upstream_account RENAME COLUMN channel_type TO account_type;
    ALTER TABLE ai_upstream_account RENAME COLUMN external_channel_id TO external_account_id;
    UPDATE ai_upstream_account a
       SET supplier_id = m.supplier_id
      FROM _site_supplier_map m
     WHERE a.tenant_id = m.tenant_id
       AND a.organization_id = m.organization_id
       AND a.site_id = m.site_id;
    UPDATE ai_upstream_account a
       SET supplier_id = s.id
      FROM ai_upstream_supplier s
     WHERE a.supplier_id IS NULL
       AND s.tenant_id = a.tenant_id
       AND s.organization_id = a.organization_id
       AND lower(s.supplier_code) = lower(coalesce(a.site_code, a.supplier_code));
    IF EXISTS (
        SELECT 1 FROM ai_upstream_account a
         WHERE a.supplier_id IS NULL
            OR NOT EXISTS (
                SELECT 1 FROM ai_upstream_supplier s
                 WHERE s.tenant_id = a.tenant_id
                   AND s.organization_id = a.organization_id
                   AND s.id = a.supplier_id
            )
    ) THEN
        RAISE EXCEPTION 'legacy channel has no unambiguous upstream supplier';
    END IF;
    UPDATE ai_upstream_account a
       SET supplier_code = s.supplier_code
      FROM ai_upstream_supplier s
     WHERE s.tenant_id = a.tenant_id
       AND s.organization_id = a.organization_id
       AND s.id = a.supplier_id;
    ALTER TABLE ai_upstream_account ADD COLUMN auth_method_code VARCHAR(64);
    UPDATE ai_upstream_account
       SET auth_method_code = CASE coalesce(auth_type, 1)
           WHEN 1 THEN 'api_key'
           WHEN 2 THEN 'oauth2_authorization_code'
           WHEN 3 THEN 'bearer_token'
           WHEN 4 THEN 'oauth2_client_credentials'
           WHEN 5 THEN 'aws_sigv4'
           ELSE 'custom'
       END,
           account_type = coalesce(nullif(trim(account_type), ''), 'standard');
    ALTER TABLE ai_upstream_account
        ADD COLUMN contract_cost_multiplier NUMERIC(38, 12) NOT NULL DEFAULT 1,
        DROP COLUMN site_id,
        DROP COLUMN site_code,
        DROP COLUMN site_service_code,
        DROP COLUMN site_channel_role,
        DROP COLUMN protocol_code,
        DROP COLUMN auth_type,
        DROP COLUMN credential_profile,
        DROP COLUMN base_url,
        DROP COLUMN auth_config,
        DROP COLUMN credential_ref,
        DROP COLUMN credential_hash,
        DROP COLUMN credential_version,
        DROP COLUMN masked_label,
        DROP COLUMN priority,
        DROP COLUMN weight,
        DROP CONSTRAINT IF EXISTS ck_ai_channel_tenant_scope;
    ALTER TABLE ai_upstream_account
        ALTER COLUMN supplier_id SET NOT NULL,
        ALTER COLUMN supplier_code SET NOT NULL,
        ALTER COLUMN auth_method_code SET NOT NULL,
        ALTER COLUMN account_type SET DEFAULT 'standard',
        ALTER COLUMN account_type SET NOT NULL,
        ADD CONSTRAINT ck_ai_upstream_account_tenant_scope
            CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0));

    SELECT greatest(
        coalesce((SELECT max(id) FROM ai_upstream_supplier_endpoint), 0),
        coalesce((SELECT max(id) FROM ai_upstream_account), 0)
    ) INTO max_child_id;
    WITH missing AS (
        SELECT a.tenant_id, a.organization_id, a.id AS account_id,
               a.supplier_id, s.supplier_code,
               ('account-' || substr(a.account_code, 1, 56))::VARCHAR(64) AS endpoint_code,
               (a.account_name || ' endpoint')::VARCHAR(128) AS endpoint_name,
               c.base_url, c.protocol_code, c.region_code, c.environment,
               coalesce(c.timeout_ms, 60000) AS timeout_ms
          FROM ai_upstream_account a
          JOIN ai_channel c
            ON c.tenant_id = a.tenant_id AND c.organization_id = a.organization_id AND c.id = a.id
          JOIN ai_upstream_supplier s
            ON s.tenant_id = a.tenant_id AND s.organization_id = a.organization_id AND s.id = a.supplier_id
         WHERE a.preferred_endpoint_id IS NULL
           AND nullif(trim(c.base_url), '') IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM ai_upstream_supplier_endpoint e
                WHERE e.tenant_id = a.tenant_id
                  AND e.organization_id = a.organization_id
                  AND e.supplier_id = a.supplier_id
                  AND rtrim(e.base_url, '/') = rtrim(c.base_url, '/')
           )
    ), numbered AS (
        SELECT m.*, row_number() OVER (ORDER BY tenant_id, organization_id, account_id) AS offset_id
          FROM missing m
    )
    INSERT INTO ai_upstream_supplier_endpoint (
        id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
        version, metadata, supplier_id, supplier_code, endpoint_code, endpoint_name,
        base_url, protocol_code, region_code, environment, health_status,
        consecutive_error_count, priority, routing_weight, timeout_ms
    )
    SELECT max_child_id + offset_id,
           substr('legacy-account-endpoint-' || (max_child_id + offset_id)::text, 1, 64),
           tenant_id, organization_id, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
           0, '{}'::jsonb, supplier_id, supplier_code, endpoint_code, endpoint_name,
           base_url, protocol_code, region_code, environment, 1, 0, 100, 100, timeout_ms
      FROM numbered;
    UPDATE ai_upstream_account a
       SET preferred_endpoint_id = e.id
      FROM ai_channel c
      JOIN ai_upstream_supplier_endpoint e
        ON e.tenant_id = c.tenant_id
       AND e.organization_id = c.organization_id
       AND rtrim(e.base_url, '/') = rtrim(c.base_url, '/')
     WHERE a.tenant_id = c.tenant_id
       AND a.organization_id = c.organization_id
       AND a.id = c.id
       AND a.supplier_id = e.supplier_id
       AND a.preferred_endpoint_id IS NULL
       AND nullif(trim(c.base_url), '') IS NOT NULL;

    CREATE TABLE ai_upstream_supplier_auth_method (
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
        supplier_id BIGINT NOT NULL,
        supplier_code VARCHAR(64) NOT NULL,
        auth_method_code VARCHAR(64) NOT NULL,
        auth_method_name VARCHAR(128) NOT NULL,
        auth_type VARCHAR(64) NOT NULL,
        config_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
        authorization_url VARCHAR(512),
        token_url VARCHAR(512),
        scopes JSONB,
        priority INTEGER NOT NULL DEFAULT 100,
        CONSTRAINT ck_ai_upstream_supplier_auth_method_tenant_scope
            CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
        CONSTRAINT fk_ai_upstream_supplier_auth_method_supplier
            FOREIGN KEY (tenant_id, organization_id, supplier_id, supplier_code)
            REFERENCES ai_upstream_supplier
                (tenant_id, organization_id, id, supplier_code) ON DELETE RESTRICT,
        CONSTRAINT ck_ai_upstream_supplier_auth_method_type
            CHECK (auth_type IN ('api_key', 'bearer_token', 'oauth2_client_credentials',
                'oauth2_authorization_code', 'aws_sigv4', 'custom') AND priority >= 0)
    );
    SELECT greatest(
        coalesce((SELECT max(id) FROM ai_upstream_supplier), 0),
        coalesce((SELECT max(id) FROM ai_upstream_account), 0),
        coalesce((SELECT max(id) FROM ai_upstream_supplier_endpoint), 0)
    ) INTO max_child_id;
    WITH methods AS (
        SELECT DISTINCT a.tenant_id, a.organization_id, a.supplier_id,
               s.supplier_code, a.auth_method_code
          FROM ai_upstream_account a
          JOIN ai_upstream_supplier s
            ON s.tenant_id = a.tenant_id AND s.organization_id = a.organization_id AND s.id = a.supplier_id
    ), numbered AS (
        SELECT m.*, row_number() OVER (
            ORDER BY tenant_id, organization_id, supplier_id, auth_method_code
        ) AS offset_id
          FROM methods m
    )
    INSERT INTO ai_upstream_supplier_auth_method (
        id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
        version, metadata, supplier_id, supplier_code, auth_method_code,
        auth_method_name, auth_type, config_schema, priority
    )
    SELECT max_child_id + offset_id,
           substr('legacy-supplier-auth-' || (max_child_id + offset_id)::text, 1, 64),
           tenant_id, organization_id, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
           0, '{}'::jsonb, supplier_id, supplier_code, auth_method_code,
           replace(initcap(replace(auth_method_code, '_', ' ')), 'Oauth2', 'OAuth2'),
           auth_method_code, '{}'::jsonb, 100
      FROM numbered;
    CREATE UNIQUE INDEX uk_ai_upstream_supplier_auth_method_uuid
        ON ai_upstream_supplier_auth_method (uuid);
    CREATE UNIQUE INDEX uk_ai_upstream_supplier_auth_method_supplier_code
        ON ai_upstream_supplier_auth_method (tenant_id, organization_id, supplier_id, auth_method_code);
    CREATE INDEX idx_ai_upstream_supplier_auth_method_supplier_status
        ON ai_upstream_supplier_auth_method (tenant_id, organization_id, supplier_id, status, priority, id);
    CREATE INDEX idx_ai_upstream_supplier_auth_method_type_status
        ON ai_upstream_supplier_auth_method (tenant_id, organization_id, auth_type, status, id);

    ALTER TABLE ai_upstream_account
        ADD CONSTRAINT fk_ai_upstream_account_supplier
            FOREIGN KEY (tenant_id, organization_id, supplier_id, supplier_code)
            REFERENCES ai_upstream_supplier
                (tenant_id, organization_id, id, supplier_code) ON DELETE RESTRICT,
        ADD CONSTRAINT fk_ai_upstream_account_preferred_endpoint
            FOREIGN KEY (tenant_id, organization_id, supplier_id, preferred_endpoint_id)
            REFERENCES ai_upstream_supplier_endpoint
                (tenant_id, organization_id, supplier_id, id) ON DELETE RESTRICT,
        ADD CONSTRAINT fk_ai_upstream_account_auth_method
            FOREIGN KEY (tenant_id, organization_id, supplier_id, auth_method_code)
            REFERENCES ai_upstream_supplier_auth_method
                (tenant_id, organization_id, supplier_id, auth_method_code) ON DELETE RESTRICT,
        ADD CONSTRAINT ck_ai_upstream_account_financial_values
            CHECK (contract_cost_multiplier > 0 AND (quota_limit IS NULL OR quota_limit >= 0)
                AND (quota_used IS NULL OR quota_used >= 0)
                AND (upstream_balance_amount IS NULL OR upstream_balance_amount >= 0)),
        ADD CONSTRAINT ck_ai_upstream_account_health_values
            CHECK ((last_latency_ms IS NULL OR last_latency_ms >= 0)
                AND (consecutive_error_count IS NULL OR consecutive_error_count >= 0)
                AND (timeout_ms IS NULL OR timeout_ms > 0));
    CREATE UNIQUE INDEX uk_ai_upstream_account_uuid
        ON ai_upstream_account (uuid);
    ALTER TABLE ai_upstream_account ADD PRIMARY KEY (id);
    CREATE UNIQUE INDEX uk_ai_upstream_account_tenant_code
        ON ai_upstream_account (tenant_id, organization_id, account_code);
    CREATE UNIQUE INDEX uk_ai_upstream_account_scope_id
        ON ai_upstream_account (tenant_id, organization_id, id);
    CREATE UNIQUE INDEX uk_ai_upstream_account_scope_auth_method
        ON ai_upstream_account (tenant_id, organization_id, id, auth_method_code);
    CREATE INDEX idx_ai_upstream_account_supplier_status
        ON ai_upstream_account (tenant_id, organization_id, supplier_id, status, id);
    CREATE INDEX idx_ai_upstream_account_health_status
        ON ai_upstream_account (tenant_id, organization_id, status, health_status, id);
    CREATE INDEX idx_ai_upstream_account_preferred_endpoint
        ON ai_upstream_account (tenant_id, organization_id, preferred_endpoint_id, status, id);

    IF EXISTS (
        SELECT 1 FROM _legacy_service_credential sc
         WHERE NOT EXISTS (
             SELECT 1 FROM ai_channel c
              WHERE c.tenant_id = sc.tenant_id
                AND c.organization_id = sc.organization_id
                AND c.site_service_id = sc.site_service_id
         )
    ) THEN
        RAISE EXCEPTION 'site service credential is orphaned because no upstream account references the service';
    END IF;
    IF EXISTS (
        SELECT 1 FROM ai_channel_credential cc
         WHERE NOT EXISTS (
             SELECT 1 FROM ai_upstream_account a
              WHERE a.tenant_id = cc.tenant_id
                AND a.organization_id = cc.organization_id
                AND a.id = cc.channel_id
         )
    ) THEN
        RAISE EXCEPTION 'channel credential contains an orphan account reference';
    END IF;

    CREATE TABLE ai_upstream_account_credential (
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
        account_id BIGINT NOT NULL,
        auth_method_code VARCHAR(64) NOT NULL,
        credential_name VARCHAR(128) NOT NULL,
        credential_ref TEXT NOT NULL,
        credential_hash VARCHAR(128) NOT NULL,
        masked_label VARCHAR(128),
        credential_version BIGINT NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 100,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at TIMESTAMPTZ,
        last_rotated_at TIMESTAMPTZ,
        last_verified_at TIMESTAMPTZ,
        last_used_at TIMESTAMPTZ,
        CONSTRAINT ck_ai_upstream_account_credential_tenant_scope
            CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
        CONSTRAINT fk_ai_upstream_account_credential_account
            FOREIGN KEY (tenant_id, organization_id, account_id, auth_method_code)
            REFERENCES ai_upstream_account
                (tenant_id, organization_id, id, auth_method_code) ON DELETE RESTRICT,
        CONSTRAINT ck_ai_upstream_account_credential_version
            CHECK (credential_version > 0 AND priority >= 0)
    );
    CREATE TEMP TABLE _credential_candidate ON COMMIT DROP AS
    SELECT cc.tenant_id, cc.organization_id, cc.channel_id AS account_id,
           1 AS source_priority, cc.credential_name,
           cc.credential_ref, cc.credential_hash, cc.masked_label,
           1::BIGINT AS credential_version, cc.priority,
           cc.status, cc.created_at, cc.updated_at, cc.deleted_at, cc.deleted_by,
           NULL::TIMESTAMPTZ AS last_rotated_at, cc.last_verified_at, cc.last_used_at
      FROM ai_channel_credential cc
    UNION ALL
    SELECT ic.tenant_id, ic.organization_id, ic.channel_id,
           2, 'Migrated inline credential', ic.credential_ref, ic.credential_hash, ic.masked_label,
           ic.credential_version, 100, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL,
           ic.last_rotated_at, ic.last_verified_at, ic.last_used_at
      FROM _legacy_inline_credential ic
    UNION ALL
    SELECT sc.tenant_id, sc.organization_id, c.id,
           3, 'Migrated service credential', sc.credential_ref, sc.credential_hash, sc.masked_label,
           greatest(coalesce(sc.credential_version, 1), 1), 100, 1,
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL,
           NULL, sc.last_verified_at, NULL
      FROM _legacy_service_credential sc
      JOIN ai_channel c
        ON c.tenant_id = sc.tenant_id
       AND c.organization_id = sc.organization_id
       AND c.site_service_id = sc.site_service_id;
    IF EXISTS (
        SELECT 1 FROM _credential_candidate
         WHERE nullif(trim(credential_ref), '') IS NULL
            OR nullif(trim(credential_hash), '') IS NULL
    ) THEN
        RAISE EXCEPTION 'credential candidate contains a blank reference or hash';
    END IF;
    SELECT count(*)
      INTO credential_candidate_count
      FROM (
          SELECT DISTINCT tenant_id, organization_id, account_id, credential_ref
            FROM _credential_candidate
      ) candidates;
    SELECT greatest(
        coalesce((SELECT max(id) FROM ai_upstream_account), 0),
        coalesce((SELECT max(id) FROM ai_channel_credential), 0),
        coalesce((SELECT max(id) FROM ai_upstream_supplier_auth_method), 0)
    ) INTO max_child_id;
    WITH deduplicated AS (
        SELECT DISTINCT ON (tenant_id, organization_id, account_id, credential_ref)
               *
          FROM _credential_candidate
         ORDER BY tenant_id, organization_id, account_id, credential_ref, source_priority
    ), numbered AS (
        SELECT d.*, row_number() OVER (
            ORDER BY tenant_id, organization_id, account_id, credential_ref
        ) AS offset_id,
        row_number() OVER (
            PARTITION BY tenant_id, organization_id, account_id
            ORDER BY credential_version, source_priority, credential_ref
        ) AS migrated_credential_version
          FROM deduplicated d
    )
    INSERT INTO ai_upstream_account_credential (
        id, uuid, tenant_id, organization_id, data_scope, status,
        created_at, updated_at, version, deleted_at, deleted_by, metadata,
        account_id, auth_method_code, credential_name, credential_ref, credential_hash,
        masked_label, credential_version, priority, is_active,
        last_rotated_at, last_verified_at, last_used_at
    )
    SELECT max_child_id + offset_id,
           substr('legacy-account-credential-' || (max_child_id + offset_id)::text, 1, 64),
           n.tenant_id, n.organization_id, 0, n.status,
           n.created_at, n.updated_at, 0, n.deleted_at, n.deleted_by,
           jsonb_build_object(
               'legacyCredentialSourcePriority', n.source_priority,
               'legacyCredentialVersion', n.credential_version
           ),
           n.account_id, a.auth_method_code, n.credential_name, n.credential_ref, n.credential_hash,
           n.masked_label, n.migrated_credential_version, n.priority,
           n.status = 1 AND n.deleted_at IS NULL,
           n.last_rotated_at, n.last_verified_at, n.last_used_at
      FROM numbered n
      JOIN ai_upstream_account a
        ON a.tenant_id = n.tenant_id
       AND a.organization_id = n.organization_id
       AND a.id = n.account_id;
    IF (SELECT count(*) FROM ai_upstream_account_credential) <> credential_candidate_count THEN
        RAISE EXCEPTION 'credential backfill row-count verification failed';
    END IF;
    CREATE UNIQUE INDEX uk_ai_upstream_account_credential_uuid
        ON ai_upstream_account_credential (uuid);
    CREATE UNIQUE INDEX uk_ai_upstream_account_credential_version
        ON ai_upstream_account_credential
            (tenant_id, organization_id, account_id, credential_version);
    CREATE INDEX idx_ai_upstream_account_credential_account
        ON ai_upstream_account_credential (tenant_id, organization_id, account_id, status, is_active, priority, id);
    CREATE TABLE ai_upstream_account_group
        (LIKE ai_channel_group INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
    INSERT INTO ai_upstream_account_group SELECT * FROM ai_channel_group;
    ALTER TABLE ai_upstream_account_group
        ADD COLUMN routing_strategy VARCHAR(32) NOT NULL DEFAULT 'weighted',
        ADD COLUMN fallback_mode VARCHAR(32) NOT NULL DEFAULT 'sequential',
        ADD COLUMN priority INTEGER NOT NULL DEFAULT 100,
        ADD COLUMN cost_multiplier NUMERIC(38, 12) NOT NULL DEFAULT 1,
        ADD COLUMN sale_multiplier NUMERIC(38, 12) NOT NULL DEFAULT 1;
    UPDATE ai_upstream_account_group
       SET group_type = coalesce(nullif(trim(group_type), ''), 'shared'),
           cost_multiplier = CASE WHEN rate_multiplier > 0 THEN rate_multiplier ELSE 1 END,
           sale_multiplier = CASE WHEN official_price_multiplier > 0 THEN official_price_multiplier ELSE 1 END;
    ALTER TABLE ai_upstream_account_group
        DROP COLUMN provider_code,
        DROP COLUMN rate_multiplier,
        DROP COLUMN price_reference_mode,
        DROP COLUMN official_price_multiplier,
        DROP CONSTRAINT IF EXISTS ck_ai_channel_group_tenant_scope;
    ALTER TABLE ai_upstream_account_group
        ALTER COLUMN group_type SET DEFAULT 'shared',
        ALTER COLUMN group_type SET NOT NULL,
        ADD CONSTRAINT ck_ai_upstream_account_group_tenant_scope
            CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
        ADD CONSTRAINT ck_ai_upstream_account_group_routing_strategy
            CHECK (routing_strategy IN ('weighted', 'round_robin', 'least_latency', 'least_cost', 'failover')),
        ADD CONSTRAINT ck_ai_upstream_account_group_fallback_mode
            CHECK (fallback_mode IN ('none', 'sequential', 'same_supplier', 'cross_supplier')),
        ADD CONSTRAINT ck_ai_upstream_account_group_financial_values
            CHECK (cost_multiplier > 0 AND sale_multiplier > 0 AND priority >= 0
                AND (capacity_limit IS NULL OR capacity_limit >= 0));
    CREATE UNIQUE INDEX uk_ai_upstream_account_group_uuid
        ON ai_upstream_account_group (uuid);
    ALTER TABLE ai_upstream_account_group ADD PRIMARY KEY (id);
    CREATE UNIQUE INDEX uk_ai_upstream_account_group_tenant_code
        ON ai_upstream_account_group (tenant_id, organization_id, group_code);
    CREATE UNIQUE INDEX uk_ai_upstream_account_group_scope_id
        ON ai_upstream_account_group (tenant_id, organization_id, id);
    CREATE INDEX idx_ai_upstream_account_group_tenant_status_updated
        ON ai_upstream_account_group (tenant_id, organization_id, status, updated_at, id);
    CREATE INDEX idx_ai_upstream_account_group_pricing
        ON ai_upstream_account_group (tenant_id, organization_id, pricing_plan_id, status, updated_at, id);

    CREATE TABLE ai_upstream_account_group_member
        (LIKE ai_channel_group_member INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
    INSERT INTO ai_upstream_account_group_member SELECT * FROM ai_channel_group_member;
    ALTER TABLE ai_upstream_account_group_member RENAME COLUMN channel_group_id TO account_group_id;
    ALTER TABLE ai_upstream_account_group_member RENAME COLUMN channel_id TO account_id;
    ALTER TABLE ai_upstream_account_group_member RENAME COLUMN weight TO routing_weight;
    ALTER TABLE ai_upstream_account_group_member
        ADD COLUMN cost_multiplier_override NUMERIC(38, 12),
        DROP CONSTRAINT IF EXISTS ck_ai_channel_group_member_tenant_scope,
        DROP CONSTRAINT IF EXISTS fk_ai_channel_group_member_group,
        DROP CONSTRAINT IF EXISTS fk_ai_channel_group_member_channel,
        DROP CONSTRAINT IF EXISTS ck_ai_channel_group_member_non_negative_weighting,
        DROP CONSTRAINT IF EXISTS ck_ai_channel_group_member_effective_interval;
    ALTER TABLE ai_upstream_account_group_member
        ADD CONSTRAINT ck_ai_upstream_account_group_member_tenant_scope
            CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
        ADD CONSTRAINT fk_ai_upstream_account_group_member_group
            FOREIGN KEY (tenant_id, organization_id, account_group_id)
            REFERENCES ai_upstream_account_group (tenant_id, organization_id, id) ON DELETE RESTRICT,
        ADD CONSTRAINT fk_ai_upstream_account_group_member_account
            FOREIGN KEY (tenant_id, organization_id, account_id)
            REFERENCES ai_upstream_account (tenant_id, organization_id, id) ON DELETE RESTRICT,
        ADD CONSTRAINT ck_ai_upstream_account_group_member_non_negative_weighting
            CHECK (priority >= 0 AND routing_weight >= 0
                AND (cost_multiplier_override IS NULL OR cost_multiplier_override > 0)),
        ADD CONSTRAINT ck_ai_upstream_account_group_member_effective_interval
            CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from);
    CREATE UNIQUE INDEX uk_ai_upstream_account_group_member_uuid
        ON ai_upstream_account_group_member (uuid);
    ALTER TABLE ai_upstream_account_group_member ADD PRIMARY KEY (id);
    CREATE UNIQUE INDEX uk_ai_upstream_account_group_member
        ON ai_upstream_account_group_member (tenant_id, organization_id, account_group_id, account_id);
    CREATE INDEX idx_ai_upstream_account_group_member_status
        ON ai_upstream_account_group_member (tenant_id, organization_id, status, account_group_id, priority, id);
    CREATE INDEX idx_ai_upstream_account_group_member_group
        ON ai_upstream_account_group_member (tenant_id, organization_id, account_group_id, status, priority, routing_weight, id);
    CREATE INDEX idx_ai_upstream_account_group_member_account
        ON ai_upstream_account_group_member (tenant_id, organization_id, account_id, status, id);

    CREATE TABLE ai_upstream_account_group_metric_snapshot
        (LIKE ai_channel_group_metric_snapshot INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
    INSERT INTO ai_upstream_account_group_metric_snapshot SELECT * FROM ai_channel_group_metric_snapshot;
    ALTER TABLE ai_upstream_account_group_metric_snapshot RENAME COLUMN channel_group_id TO account_group_id;
    ALTER TABLE ai_upstream_account_group_metric_snapshot RENAME COLUMN channel_available_count TO account_available_count;
    ALTER TABLE ai_upstream_account_group_metric_snapshot RENAME COLUMN channel_total_count TO account_total_count;
    ALTER TABLE ai_upstream_account_group_metric_snapshot
        DROP COLUMN provider_code,
        DROP CONSTRAINT IF EXISTS ck_ai_channel_group_metric_snapshot_tenant_scope,
        DROP CONSTRAINT IF EXISTS ck_ai_channel_group_metric_snapshot_non_negative_counts,
        DROP CONSTRAINT IF EXISTS ck_ai_channel_group_metric_snapshot_non_negative_amounts;
    ALTER TABLE ai_upstream_account_group_metric_snapshot
        ADD CONSTRAINT ck_ai_upstream_account_group_metric_snapshot_tenant_scope
            CHECK (tenant_id > 0 AND organization_id >= 0),
        ADD CONSTRAINT ck_ai_upstream_account_group_metric_counts
            CHECK ((account_available_count IS NULL OR account_available_count >= 0)
                AND (account_total_count IS NULL OR account_total_count >= 0)
                AND (request_count_today IS NULL OR request_count_today >= 0)
                AND (request_count_total IS NULL OR request_count_total >= 0)),
        ADD CONSTRAINT ck_ai_upstream_account_group_metric_amounts
            CHECK ((capacity_used IS NULL OR capacity_used >= 0)
                AND (capacity_limit IS NULL OR capacity_limit >= 0)
                AND (usage_amount_today IS NULL OR usage_amount_today >= 0)
                AND (usage_amount_total IS NULL OR usage_amount_total >= 0));
    CREATE UNIQUE INDEX uk_ai_upstream_account_group_metric_snapshot_uuid
        ON ai_upstream_account_group_metric_snapshot (uuid);
    ALTER TABLE ai_upstream_account_group_metric_snapshot ADD PRIMARY KEY (id);
    CREATE UNIQUE INDEX uk_ai_upstream_account_group_metric_snapshot
        ON ai_upstream_account_group_metric_snapshot (tenant_id, organization_id, account_group_id, snapshot_at);
    CREATE INDEX idx_ai_upstream_account_group_metric_tenant_status
        ON ai_upstream_account_group_metric_snapshot (tenant_id, organization_id, status, snapshot_at, id);

    CREATE TABLE ai_upstream_account_group_resource
        (LIKE ai_channel_group_resource INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
    INSERT INTO ai_upstream_account_group_resource SELECT * FROM ai_channel_group_resource;
    ALTER TABLE ai_upstream_account_group_resource RENAME COLUMN channel_group_id TO account_group_id;
    ALTER TABLE ai_upstream_account_group_resource
        DROP CONSTRAINT IF EXISTS ck_ai_channel_group_resource_tenant_scope;
    ALTER TABLE ai_upstream_account_group_resource
        ADD CONSTRAINT ck_ai_upstream_account_group_resource_tenant_scope
            CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
        ADD CONSTRAINT fk_ai_upstream_account_group_resource_group
            FOREIGN KEY (tenant_id, organization_id, account_group_id)
            REFERENCES ai_upstream_account_group (tenant_id, organization_id, id) ON DELETE RESTRICT,
        ADD CONSTRAINT ck_ai_upstream_account_group_resource_target
            CHECK ((nullif(resource_code, '') IS NOT NULL) <> (nullif(resource_group_code, '') IS NOT NULL)
                AND grant_type IN ('allow', 'deny') AND priority >= 0
                AND (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from));
    CREATE UNIQUE INDEX uk_ai_upstream_account_group_resource_uuid
        ON ai_upstream_account_group_resource (uuid);
    ALTER TABLE ai_upstream_account_group_resource ADD PRIMARY KEY (id);
    CREATE UNIQUE INDEX uk_ai_upstream_account_group_resource
        ON ai_upstream_account_group_resource
            (tenant_id, organization_id, account_group_id, resource_code, resource_group_code);
    CREATE INDEX idx_ai_upstream_account_group_resource_status
        ON ai_upstream_account_group_resource (tenant_id, organization_id, status, account_group_id, grant_type, priority, id);
    CREATE INDEX idx_ai_upstream_account_group_resource_lookup
        ON ai_upstream_account_group_resource (tenant_id, organization_id, account_group_id, status, grant_type, priority, id);

    IF EXISTS (
        SELECT 1 FROM ai_channel_resource r
         WHERE NOT EXISTS (
             SELECT 1 FROM ai_upstream_account a
              WHERE a.tenant_id = r.tenant_id
                AND a.organization_id = r.organization_id
                AND a.id = r.channel_id
         )
    ) THEN
        RAISE EXCEPTION 'channel resource contains an orphan account reference';
    END IF;
    IF EXISTS (
        SELECT 1
          FROM ai_channel_resource r
          JOIN ai_upstream_account a
            ON a.tenant_id = r.tenant_id
           AND a.organization_id = r.organization_id
           AND a.id = r.channel_id
         GROUP BY r.tenant_id, r.organization_id, a.supplier_id,
                  r.resource_code, r.resource_group_code
        HAVING count(DISTINCT r.grant_type) > 1
    ) THEN
        RAISE EXCEPTION 'account resources contain conflicting supplier-level allow/deny grants';
    END IF;
    CREATE TABLE ai_upstream_supplier_resource
        (LIKE ai_channel_resource INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
    INSERT INTO ai_upstream_supplier_resource
    SELECT DISTINCT ON (
               r.tenant_id, r.organization_id, a.supplier_id,
               r.resource_code, r.resource_group_code
           )
           r.id, r.uuid, r.tenant_id, r.organization_id, r.data_scope, r.status,
           r.created_at, r.updated_at, r.version, r.deleted_at, r.deleted_by,
           coalesce(r.metadata, '{}'::jsonb) || jsonb_build_object('legacyAccountId', r.channel_id),
           a.supplier_id, s.supplier_code, r.channel_code,
           r.resource_id, r.resource_code, r.resource_group_id, r.resource_group_code,
           r.grant_type, r.priority, r.weight, r.effective_from, r.effective_to
      FROM ai_channel_resource r
      JOIN ai_upstream_account a
        ON a.tenant_id = r.tenant_id AND a.organization_id = r.organization_id AND a.id = r.channel_id
      JOIN ai_upstream_supplier s
        ON s.tenant_id = a.tenant_id AND s.organization_id = a.organization_id AND s.id = a.supplier_id
     ORDER BY r.tenant_id, r.organization_id, a.supplier_id,
              r.resource_code, r.resource_group_code, r.priority, r.id;
    ALTER TABLE ai_upstream_supplier_resource RENAME COLUMN channel_id TO supplier_id;
    ALTER TABLE ai_upstream_supplier_resource RENAME COLUMN provider_code TO supplier_code;
    ALTER TABLE ai_upstream_supplier_resource
        DROP COLUMN channel_code,
        DROP COLUMN weight,
        DROP CONSTRAINT IF EXISTS ck_ai_channel_resource_tenant_scope;
    ALTER TABLE ai_upstream_supplier_resource
        ALTER COLUMN supplier_code SET NOT NULL,
        ADD CONSTRAINT ck_ai_upstream_supplier_resource_tenant_scope
            CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
        ADD CONSTRAINT fk_ai_upstream_supplier_resource_supplier
            FOREIGN KEY (tenant_id, organization_id, supplier_id, supplier_code)
            REFERENCES ai_upstream_supplier
                (tenant_id, organization_id, id, supplier_code) ON DELETE RESTRICT,
        ADD CONSTRAINT ck_ai_upstream_supplier_resource_target
            CHECK ((nullif(resource_code, '') IS NOT NULL) <> (nullif(resource_group_code, '') IS NOT NULL)
                AND grant_type IN ('allow', 'deny') AND priority >= 0
                AND (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from));
    CREATE UNIQUE INDEX uk_ai_upstream_supplier_resource_uuid
        ON ai_upstream_supplier_resource (uuid);
    ALTER TABLE ai_upstream_supplier_resource ADD PRIMARY KEY (id);
    CREATE UNIQUE INDEX uk_ai_upstream_supplier_resource
        ON ai_upstream_supplier_resource
            (tenant_id, organization_id, supplier_id, resource_code, resource_group_code);
    CREATE INDEX idx_ai_upstream_supplier_resource_lookup
        ON ai_upstream_supplier_resource (tenant_id, organization_id, status, supplier_id, grant_type, priority, id);

    ALTER TABLE ai_quota_policy RENAME COLUMN channel_group_id TO account_group_id;
    DROP INDEX IF EXISTS idx_ai_quota_policy_model_channel_group;
    CREATE INDEX idx_ai_quota_policy_model_account_group
        ON ai_quota_policy
            (tenant_id, organization_id, model, account_group_id, status);

    ALTER TABLE ai_routing_rule
        RENAME COLUMN candidate_channels TO candidate_account_groups;

    IF EXISTS (
        SELECT 1 FROM ai_routing_decision_log
         WHERE selected_account_id IS NOT NULL AND selected_channel_id IS NULL
    ) THEN
        RAISE EXCEPTION 'routing decision references retired integration_provider_account without a channel mapping';
    END IF;
    IF EXISTS (
        SELECT 1 FROM ai_routing_decision_log d
         WHERE d.selected_channel_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM ai_upstream_account a
                WHERE a.tenant_id = d.tenant_id
                  AND a.organization_id = d.organization_id
                  AND a.id = d.selected_channel_id
           )
    ) THEN
        RAISE EXCEPTION 'routing decision contains an orphan account reference';
    END IF;
    UPDATE ai_routing_decision_log d
       SET selected_provider_id = a.supplier_id,
           selected_account_id = coalesce(d.selected_channel_id, d.selected_account_id)
      FROM ai_upstream_account a
     WHERE a.tenant_id = d.tenant_id
       AND a.organization_id = d.organization_id
       AND a.id = d.selected_channel_id;
    ALTER TABLE ai_routing_decision_log RENAME COLUMN selected_provider_id TO selected_supplier_id;
    ALTER TABLE ai_routing_decision_log ADD COLUMN selected_credential_id BIGINT;
    ALTER TABLE ai_routing_decision_log DROP COLUMN selected_channel_id;

    ALTER TABLE ai_provider_object_route RENAME COLUMN channel_group_id TO account_group_id;
    ALTER TABLE ai_provider_object_route RENAME COLUMN provider_code TO supplier_code;
    ALTER TABLE ai_provider_object_route RENAME COLUMN channel_id TO account_id;
    UPDATE ai_provider_object_route r
       SET supplier_code = s.supplier_code
      FROM ai_upstream_account a
      JOIN ai_upstream_supplier s
        ON s.tenant_id = a.tenant_id
       AND s.organization_id = a.organization_id
       AND s.id = a.supplier_id
     WHERE a.tenant_id = r.tenant_id
       AND a.organization_id = r.organization_id
       AND a.id = r.account_id;
    DROP INDEX IF EXISTS idx_ai_provider_object_route_channel;
    CREATE INDEX IF NOT EXISTS idx_ai_provider_object_route_account
        ON ai_provider_object_route (tenant_id, organization_id, account_group_id, account_id, status, id);

    UPDATE ai_usage u
       SET provider_id = a.supplier_id
      FROM ai_upstream_account a
     WHERE a.tenant_id = u.tenant_id
       AND a.organization_id = u.organization_id
       AND a.id = u.channel_id;
    ALTER TABLE ai_usage RENAME COLUMN channel_group_id TO account_group_id;
    ALTER TABLE ai_usage RENAME COLUMN channel_group_snapshot TO account_group_snapshot;
    ALTER TABLE ai_usage RENAME COLUMN provider_id TO supplier_id;
    ALTER TABLE ai_usage RENAME COLUMN channel_id TO account_id;

    UPDATE ai_request_trace t
       SET provider_id = a.supplier_id
      FROM ai_upstream_account a
     WHERE a.tenant_id = t.tenant_id
       AND a.organization_id = t.organization_id
       AND a.id = t.channel_id;
    ALTER TABLE ai_request_trace RENAME COLUMN channel_group_id TO account_group_id;
    ALTER TABLE ai_request_trace RENAME COLUMN channel_group_snapshot TO account_group_snapshot;
    ALTER TABLE ai_request_trace RENAME COLUMN provider_id TO supplier_id;
    ALTER TABLE ai_request_trace RENAME COLUMN channel_id TO account_id;
    ALTER TABLE ai_request_trace RENAME COLUMN channel_name_snapshot TO account_name_snapshot;

    ALTER TABLE ai_pricing_rule RENAME COLUMN provider_code TO supplier_code;
    ALTER TABLE ai_pricing_rule RENAME COLUMN channel_id TO account_id;
    UPDATE ai_pricing_rule r
       SET supplier_code = s.supplier_code
      FROM ai_upstream_account a
      JOIN ai_upstream_supplier s
        ON s.tenant_id = a.tenant_id
       AND s.organization_id = a.organization_id
       AND s.id = a.supplier_id
     WHERE a.tenant_id = r.tenant_id
       AND a.organization_id = r.organization_id
       AND a.id = r.account_id;

    IF EXISTS (
        SELECT 1 FROM ai_provider_object_route r
         WHERE NOT EXISTS (
             SELECT 1 FROM ai_upstream_account a
              WHERE a.tenant_id = r.tenant_id
                AND a.organization_id = r.organization_id
                AND a.id = r.account_id
         )
    ) OR EXISTS (
        SELECT 1 FROM ai_usage u
         WHERE u.account_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM ai_upstream_account a
                WHERE a.tenant_id = u.tenant_id
                  AND a.organization_id = u.organization_id
                  AND a.id = u.account_id
           )
    ) OR EXISTS (
        SELECT 1 FROM ai_request_trace t
         WHERE t.account_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM ai_upstream_account a
                WHERE a.tenant_id = t.tenant_id
                  AND a.organization_id = t.organization_id
                  AND a.id = t.account_id
           )
    ) OR EXISTS (
        SELECT 1 FROM ai_pricing_rule r
         WHERE r.account_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM ai_upstream_account a
                WHERE a.tenant_id = r.tenant_id
                  AND a.organization_id = r.organization_id
                  AND a.id = r.account_id
           )
    ) THEN
        RAISE EXCEPTION 'legacy routing dimension contains an orphan account reference';
    END IF;

    IF (SELECT count(*) FROM ai_upstream_account) <> (SELECT count(*) FROM ai_channel) THEN
        RAISE EXCEPTION 'account backfill row-count verification failed';
    END IF;
    IF (SELECT count(*) FROM ai_upstream_account_group) <> (SELECT count(*) FROM ai_channel_group) THEN
        RAISE EXCEPTION 'account-group backfill row-count verification failed';
    END IF;
    IF (SELECT count(*) FROM ai_upstream_account_group_member) <> (SELECT count(*) FROM ai_channel_group_member) THEN
        RAISE EXCEPTION 'account-group member backfill row-count verification failed';
    END IF;
    IF EXISTS (
        SELECT 1 FROM ai_upstream_account a
         WHERE NOT EXISTS (
             SELECT 1 FROM ai_upstream_supplier s
              WHERE s.tenant_id = a.tenant_id
                AND s.organization_id = a.organization_id
                AND s.id = a.supplier_id
         )
    ) THEN
        RAISE EXCEPTION 'account-to-supplier verification failed';
    END IF;

    DROP TABLE ai_channel_group_resource;
    DROP TABLE ai_channel_group_metric_snapshot;
    DROP TABLE ai_channel_group_member;
    DROP TABLE ai_channel_group;
    DROP TABLE ai_channel_resource;
    DROP TABLE ai_channel_credential;
    DROP TABLE ai_channel;
    DROP TABLE ai_site_service;
    DROP TABLE ai_site;
    DROP TABLE ai_provider;
    DROP TABLE IF EXISTS ai_usage_service_provider_edge;
END
$sdkwork_migration$;

COMMIT;
