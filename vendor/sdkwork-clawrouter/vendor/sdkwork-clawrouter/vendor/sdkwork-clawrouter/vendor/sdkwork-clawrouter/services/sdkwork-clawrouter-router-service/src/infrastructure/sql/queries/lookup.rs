use super::PricingCatalogSql;

impl PricingCatalogSql {
    pub fn list_models() -> &'static str {
        r#"
SELECT
    catalog_key,
    model,
    display_name,
    vendor_code,
    COALESCE((
        SELECT jsonb_agg(DISTINCT capability_code ORDER BY capability_code)::text
        FROM (
            SELECT CASE m.capability
                WHEN 1 THEN CASE
                    WHEN COALESCE(m.modalities, '[]'::jsonb) ? 'embedding' THEN 'embedding'
                    WHEN COALESCE(m.input_modalities, '[]'::jsonb) ? 'embedding' THEN 'embedding'
                    WHEN COALESCE(m.output_modalities, '[]'::jsonb) ? 'embedding' THEN 'embedding'
                    ELSE 'chat'
                END
                WHEN 2 THEN 'image'
                WHEN 3 THEN 'audio'
                WHEN 4 THEN 'music'
                WHEN 5 THEN 'video'
                WHEN 6 THEN 'embedding'
                WHEN 7 THEN 'rerank'
                ELSE 'chat'
            END AS capability_code
            UNION ALL
            SELECT 'responses'
            WHERE COALESCE(m.api_format, '') = 'openai_responses'
              AND COALESCE(m.capability, 1) = 1
            UNION ALL
            SELECT 'tools' WHERE COALESCE(m.supports_tools, false)
            UNION ALL
            SELECT 'json_schema' WHERE COALESCE(m.supports_json_schema, false)
            UNION ALL
            SELECT capability_code
            FROM ai_model_capability c
            WHERE c.model_id = m.id
              AND c.deleted_at IS NULL
              AND c.status = 1
              AND capability_code IS NOT NULL
        ) capabilities
    ), '[]') AS capabilities_json,
    description,
    COALESCE(modalities::text, '[]') AS modalities_json,
    COALESCE(input_modalities::text, '[]') AS input_modalities_json,
    COALESCE(output_modalities::text, '[]') AS output_modalities_json,
    api_format,
    capability_intro,
    COALESCE(limitations::text, '[]') AS limitations_json,
    COALESCE(supported_languages::text, '[]') AS supported_languages_json,
    COALESCE(use_cases::text, '[]') AS use_cases_json,
    training_data_cutoff,
    context_tokens,
    max_output_tokens,
    COALESCE(supports_streaming, false) AS supports_streaming,
    COALESCE(supports_tools, false) AS supports_tools,
    COALESCE(supports_json_schema, false) AS supports_json_schema,
    release_stage,
    shelf_state,
    routing_state,
    replacement_model
FROM ai_model m
WHERE deleted_at IS NULL
  AND status = 1
  AND COALESCE(release_stage, 1) IN (1, 2)
  AND COALESCE(shelf_state, 1) = 1
  AND COALESCE(routing_state, 1) = 1
  AND ($1 IS NULL OR vendor_code = $1)
ORDER BY rank_score DESC, display_name ASC, id ASC
"#
    }

    pub fn list_provider_routes() -> &'static str {
        r#"
WITH RECURSIVE resource_group_tree AS (
    SELECT
        item.tenant_id,
        item.organization_id,
        item.resource_group_id AS root_group_id,
        item.resource_group_code AS root_group_code,
        item.resource_id,
        item.resource_code,
        item.child_resource_group_id,
        item.child_resource_group_code,
        0 AS depth
    FROM ai_resource_group_item item
    WHERE item.deleted_at IS NULL
      AND item.status = 1
    UNION ALL
    SELECT
        tree.tenant_id,
        tree.organization_id,
        tree.root_group_id,
        tree.root_group_code,
        child.resource_id,
        child.resource_code,
        child.child_resource_group_id,
        child.child_resource_group_code,
        tree.depth + 1 AS depth
    FROM resource_group_tree tree
    JOIN ai_resource_group_item child
      ON child.tenant_id = tree.tenant_id
     AND child.organization_id = tree.organization_id
     AND child.deleted_at IS NULL
     AND child.status = 1
     AND (
          (tree.child_resource_group_id IS NOT NULL AND child.resource_group_id = tree.child_resource_group_id)
          OR (NULLIF(tree.child_resource_group_code, '') IS NOT NULL AND child.resource_group_code = tree.child_resource_group_code)
     )
    WHERE tree.depth < 8
      AND (
          tree.child_resource_group_id IS NOT NULL
          OR NULLIF(tree.child_resource_group_code, '') IS NOT NULL
      )
),
resource_group_leaf AS (
    SELECT DISTINCT
        tenant_id,
        organization_id,
        root_group_id AS resource_group_id,
        root_group_code AS resource_group_code,
        resource_id,
        resource_code
    FROM resource_group_tree
    WHERE resource_id IS NOT NULL
       OR NULLIF(resource_code, '') IS NOT NULL
),
channel_resource_scope AS (
    SELECT DISTINCT
        cr.tenant_id,
        cr.organization_id,
        cr.channel_id,
        r.resource_type,
        r.vendor_code,
        r.api_code,
        r.catalog_key,
        r.model,
        r.provider_native_model,
        cr.priority,
        cr.weight,
        cr.id AS binding_id
    FROM ai_channel_resource cr
    LEFT JOIN resource_group_leaf rgi
      ON rgi.tenant_id = cr.tenant_id
     AND rgi.organization_id = cr.organization_id
     AND (
         (cr.resource_group_id IS NOT NULL AND rgi.resource_group_id = cr.resource_group_id)
         OR (NULLIF(cr.resource_group_code, '') IS NOT NULL AND rgi.resource_group_code = cr.resource_group_code)
         OR (NULLIF(cr.resource_code, '') IS NOT NULL AND rgi.resource_group_code = cr.resource_code)
     )
    JOIN ai_resource r
      ON r.tenant_id = cr.tenant_id
     AND r.organization_id = cr.organization_id
     AND r.deleted_at IS NULL
     AND r.status = 1
     AND (
         r.id = cr.resource_id
         OR r.id = rgi.resource_id
         OR (NULLIF(cr.resource_code, '') IS NOT NULL AND r.resource_code = cr.resource_code)
         OR (NULLIF(rgi.resource_code, '') IS NOT NULL AND r.resource_code = rgi.resource_code)
     )
    WHERE cr.deleted_at IS NULL
      AND cr.status = 1
      AND cr.grant_type = 'allow'
      AND (cr.effective_from IS NULL OR cr.effective_from <= CURRENT_TIMESTAMP)
      AND (cr.effective_to IS NULL OR cr.effective_to > CURRENT_TIMESTAMP)
)
SELECT
    m.catalog_key AS catalog_key,
    m.model AS model,
    c.provider_code AS provider_code,
    c.id AS channel_id,
    COALESCE(NULLIF(scope.provider_native_model, ''), NULLIF(scope.model, ''), NULLIF(m.model, ''), m.catalog_key) AS provider_model
FROM ai_model m
JOIN ai_channel c
  ON c.deleted_at IS NULL
 AND c.tenant_id = m.tenant_id
 AND c.organization_id = m.organization_id
LEFT JOIN ai_provider p
  ON p.provider_code = c.provider_code
 AND p.tenant_id = c.tenant_id
 AND p.organization_id = c.organization_id
LEFT JOIN channel_resource_scope scope
  ON scope.channel_id = c.id
 AND scope.tenant_id = c.tenant_id
 AND scope.organization_id = c.organization_id
 AND (
      scope.catalog_key = m.catalog_key
      OR (
          NULLIF(scope.model, '') IS NOT NULL
          AND (scope.model = m.model OR scope.model = m.catalog_key)
      )
      OR (
          NULLIF(scope.vendor_code, '') IS NOT NULL
          AND scope.vendor_code = m.vendor_code
          AND scope.resource_type = 'vendor'
      )
      OR (
          NULLIF(scope.api_code, '') IS NOT NULL
          AND scope.resource_type = 'api_endpoint'
          AND (NULLIF(scope.vendor_code, '') IS NULL OR scope.vendor_code = m.vendor_code)
      )
 )
WHERE m.catalog_key = $1
  AND m.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND (p.id IS NULL OR p.deleted_at IS NULL)
  AND m.status = 1
  AND COALESCE(m.release_stage, 1) IN (1, 2)
  AND COALESCE(m.shelf_state, 1) = 1
  AND COALESCE(m.routing_state, 1) = 1
  AND c.status = 1
  AND COALESCE(c.health_status, 1) = 1
  AND (p.id IS NULL OR p.status = 1)
  AND scope.binding_id IS NOT NULL
ORDER BY COALESCE(scope.priority, c.priority, 100) ASC,
         COALESCE(scope.weight, c.weight, 100) DESC,
         m.id ASC,
         scope.binding_id ASC,
         c.id ASC
"#
    }

    pub fn list_model_prices() -> &'static str {
        r#"
SELECT
    catalog_key,
    model,
    COALESCE(NULLIF(region_code, ''), 'global') AS region_code,
    CASE price_side
        WHEN 1 THEN 'official_reference'
        WHEN 2 THEN 'upstream_cost'
        WHEN 3 THEN 'customer_charge'
        WHEN 4 THEN 'internal_transfer'
        ELSE 'unknown'
    END AS price_side_code,
    billing_meter_code,
    unit_price::text AS unit_price,
    currency,
    provider_code,
    channel_id,
    pricing_plan_code
FROM ai_model_pricing
WHERE deleted_at IS NULL
  AND status = 1
  AND catalog_key = $1
  AND price_side = $2
  AND billing_meter_code = $3
  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
ORDER BY priority ASC, effective_from DESC, id DESC
"#
    }

    pub fn find_api_key() -> &'static str {
        r#"
SELECT
    id,
    COALESCE(tenant_id, 0) AS tenant_id,
    COALESCE(organization_id, 0) AS organization_id,
    COALESCE(user_id, 0) AS user_id,
    COALESCE(channel_group_id, 0) AS group_id,
    COALESCE(name, '') AS name,
    COALESCE(key_prefix, '') AS key_prefix,
    COALESCE(NULLIF(key_display_masked, ''), COALESCE(key_prefix, '') || '********') AS key_display_masked,
    COALESCE(key_hash, '') AS key_hash,
    policy_id,
    quota_policy_id,
    created_at::text AS created_at,
    expire_at::text AS expire_at,
    status AS status_code
FROM iam_gateway_api_key
WHERE deleted_at IS NULL
  AND status = 1
  AND revoked_at IS NULL
  AND (expire_at IS NULL OR expire_at > CURRENT_TIMESTAMP)
  AND id = $1
LIMIT 1
"#
    }

    pub fn find_channel_group() -> &'static str {
        r#"
SELECT
    id,
    COALESCE(tenant_id, 0) AS tenant_id,
    COALESCE(organization_id, 0) AS organization_id,
    group_code AS code,
    COALESCE(NULLIF(BTRIM(pricing_plan_code), ''), 'standard') AS pricing_plan_code,
    rate_multiplier::text AS rate_multiplier,
    official_price_multiplier::text AS official_price_multiplier
FROM ai_channel_group
WHERE deleted_at IS NULL
  AND status = 1
  AND id = $1
LIMIT 1
"#
    }

    pub fn find_pricing_plan() -> &'static str {
        r#"
SELECT
    plan_code,
    CASE base_price_side
        WHEN 1 THEN 'official_reference'
        WHEN 2 THEN 'upstream_cost'
        WHEN 3 THEN 'customer_charge'
        WHEN 4 THEN 'internal_transfer'
        ELSE 'unknown'
    END AS base_price_side_code,
    default_multiplier::text AS default_multiplier,
    default_markup_amount::text AS default_markup_amount,
    currency
FROM ai_pricing_plan
WHERE deleted_at IS NULL
  AND status = 1
  AND plan_code = $1
  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
ORDER BY priority ASC, effective_from DESC, id DESC
LIMIT 1
"#
    }

    pub fn find_model() -> &'static str {
        r#"
SELECT
    catalog_key,
    model,
    display_name,
    vendor_code,
    COALESCE((
        SELECT jsonb_agg(DISTINCT capability_code ORDER BY capability_code)::text
        FROM (
            SELECT CASE m.capability
                WHEN 1 THEN CASE
                    WHEN COALESCE(m.modalities, '[]'::jsonb) ? 'embedding' THEN 'embedding'
                    WHEN COALESCE(m.input_modalities, '[]'::jsonb) ? 'embedding' THEN 'embedding'
                    WHEN COALESCE(m.output_modalities, '[]'::jsonb) ? 'embedding' THEN 'embedding'
                    ELSE 'chat'
                END
                WHEN 2 THEN 'image'
                WHEN 3 THEN 'audio'
                WHEN 4 THEN 'music'
                WHEN 5 THEN 'video'
                WHEN 6 THEN 'embedding'
                WHEN 7 THEN 'rerank'
                ELSE 'chat'
            END AS capability_code
            UNION ALL
            SELECT 'responses'
            WHERE COALESCE(m.api_format, '') = 'openai_responses'
              AND COALESCE(m.capability, 1) = 1
            UNION ALL
            SELECT 'tools' WHERE COALESCE(m.supports_tools, false)
            UNION ALL
            SELECT 'json_schema' WHERE COALESCE(m.supports_json_schema, false)
            UNION ALL
            SELECT capability_code
            FROM ai_model_capability c
            WHERE c.model_id = m.id
              AND c.deleted_at IS NULL
              AND c.status = 1
              AND capability_code IS NOT NULL
        ) capabilities
    ), '[]') AS capabilities_json,
    description,
    COALESCE(modalities::text, '[]') AS modalities_json,
    COALESCE(input_modalities::text, '[]') AS input_modalities_json,
    COALESCE(output_modalities::text, '[]') AS output_modalities_json,
    api_format,
    capability_intro,
    COALESCE(limitations::text, '[]') AS limitations_json,
    COALESCE(supported_languages::text, '[]') AS supported_languages_json,
    COALESCE(use_cases::text, '[]') AS use_cases_json,
    training_data_cutoff,
    context_tokens,
    max_output_tokens,
    COALESCE(supports_streaming, false) AS supports_streaming,
    COALESCE(supports_tools, false) AS supports_tools,
    COALESCE(supports_json_schema, false) AS supports_json_schema,
    release_stage,
    shelf_state,
    routing_state,
    replacement_model
FROM ai_model m
WHERE deleted_at IS NULL
  AND status = 1
  AND COALESCE(release_stage, 1) IN (1, 2)
  AND COALESCE(shelf_state, 1) = 1
  AND COALESCE(routing_state, 1) = 1
  AND m.catalog_key = $1
LIMIT 1
"#
    }

    pub fn find_vendor() -> &'static str {
        r#"
SELECT
    vendor_code,
    display_name
FROM ai_model_vendor
WHERE deleted_at IS NULL
  AND status = 1
  AND vendor_code = $1
LIMIT 1
"#
    }

    pub fn find_provider_route() -> &'static str {
        r#"
WITH RECURSIVE resource_group_tree AS (
    SELECT
        item.tenant_id,
        item.organization_id,
        item.resource_group_id AS root_group_id,
        item.resource_group_code AS root_group_code,
        item.resource_id,
        item.resource_code,
        item.child_resource_group_id,
        item.child_resource_group_code,
        0 AS depth
    FROM ai_resource_group_item item
    WHERE item.deleted_at IS NULL
      AND item.status = 1
    UNION ALL
    SELECT
        tree.tenant_id,
        tree.organization_id,
        tree.root_group_id,
        tree.root_group_code,
        child.resource_id,
        child.resource_code,
        child.child_resource_group_id,
        child.child_resource_group_code,
        tree.depth + 1 AS depth
    FROM resource_group_tree tree
    JOIN ai_resource_group_item child
      ON child.tenant_id = tree.tenant_id
     AND child.organization_id = tree.organization_id
     AND child.deleted_at IS NULL
     AND child.status = 1
     AND (
          (tree.child_resource_group_id IS NOT NULL AND child.resource_group_id = tree.child_resource_group_id)
          OR (NULLIF(tree.child_resource_group_code, '') IS NOT NULL AND child.resource_group_code = tree.child_resource_group_code)
     )
    WHERE tree.depth < 8
      AND (
          tree.child_resource_group_id IS NOT NULL
          OR NULLIF(tree.child_resource_group_code, '') IS NOT NULL
      )
),
resource_group_leaf AS (
    SELECT DISTINCT
        tenant_id,
        organization_id,
        root_group_id AS resource_group_id,
        root_group_code AS resource_group_code,
        resource_id,
        resource_code
    FROM resource_group_tree
    WHERE resource_id IS NOT NULL
       OR NULLIF(resource_code, '') IS NOT NULL
),
channel_resource_scope AS (
    SELECT DISTINCT
        cr.tenant_id,
        cr.organization_id,
        cr.channel_id,
        r.resource_type,
        r.vendor_code,
        r.api_code,
        r.catalog_key,
        r.model,
        r.provider_native_model,
        cr.priority,
        cr.weight,
        cr.id AS binding_id
    FROM ai_channel_resource cr
    LEFT JOIN resource_group_leaf rgi
      ON rgi.tenant_id = cr.tenant_id
     AND rgi.organization_id = cr.organization_id
     AND (
         (cr.resource_group_id IS NOT NULL AND rgi.resource_group_id = cr.resource_group_id)
         OR (NULLIF(cr.resource_group_code, '') IS NOT NULL AND rgi.resource_group_code = cr.resource_group_code)
         OR (NULLIF(cr.resource_code, '') IS NOT NULL AND rgi.resource_group_code = cr.resource_code)
     )
    JOIN ai_resource r
      ON r.tenant_id = cr.tenant_id
     AND r.organization_id = cr.organization_id
     AND r.deleted_at IS NULL
     AND r.status = 1
     AND (
         r.id = cr.resource_id
         OR r.id = rgi.resource_id
         OR (NULLIF(cr.resource_code, '') IS NOT NULL AND r.resource_code = cr.resource_code)
         OR (NULLIF(rgi.resource_code, '') IS NOT NULL AND r.resource_code = rgi.resource_code)
     )
    WHERE cr.deleted_at IS NULL
      AND cr.status = 1
      AND cr.grant_type = 'allow'
      AND (cr.effective_from IS NULL OR cr.effective_from <= CURRENT_TIMESTAMP)
      AND (cr.effective_to IS NULL OR cr.effective_to > CURRENT_TIMESTAMP)
)
SELECT
    m.catalog_key AS catalog_key,
    m.model AS model,
    c.provider_code AS provider_code,
    c.id AS channel_id,
    COALESCE(NULLIF(scope.provider_native_model, ''), NULLIF(scope.model, ''), NULLIF(m.model, ''), m.catalog_key) AS provider_model
FROM ai_model m
JOIN ai_channel c
  ON c.deleted_at IS NULL
 AND c.tenant_id = m.tenant_id
 AND c.organization_id = m.organization_id
LEFT JOIN ai_provider p
  ON p.provider_code = c.provider_code
 AND p.tenant_id = c.tenant_id
 AND p.organization_id = c.organization_id
LEFT JOIN channel_resource_scope scope
  ON scope.channel_id = c.id
 AND scope.tenant_id = c.tenant_id
 AND scope.organization_id = c.organization_id
 AND (
      scope.catalog_key = m.catalog_key
      OR (
          NULLIF(scope.model, '') IS NOT NULL
          AND (scope.model = m.model OR scope.model = m.catalog_key)
      )
      OR (
          NULLIF(scope.vendor_code, '') IS NOT NULL
          AND scope.vendor_code = m.vendor_code
          AND scope.resource_type = 'vendor'
      )
      OR (
          NULLIF(scope.api_code, '') IS NOT NULL
          AND scope.resource_type = 'api_endpoint'
          AND (NULLIF(scope.vendor_code, '') IS NULL OR scope.vendor_code = m.vendor_code)
      )
 )
WHERE m.catalog_key = $1
  AND c.provider_code = $2
  AND m.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND (p.id IS NULL OR p.deleted_at IS NULL)
  AND m.status = 1
  AND COALESCE(m.release_stage, 1) IN (1, 2)
  AND COALESCE(m.shelf_state, 1) = 1
  AND COALESCE(m.routing_state, 1) = 1
  AND c.status = 1
  AND COALESCE(c.health_status, 1) = 1
  AND (p.id IS NULL OR p.status = 1)
  AND scope.binding_id IS NOT NULL
ORDER BY COALESCE(scope.priority, c.priority, 100) ASC,
         COALESCE(scope.weight, c.weight, 100) DESC,
         m.id ASC,
         scope.binding_id ASC,
         c.id ASC
LIMIT 1
"#
    }

    pub fn find_model_price() -> &'static str {
        r#"
SELECT
    catalog_key,
    model,
    COALESCE(NULLIF(region_code, ''), 'global') AS region_code,
    CASE price_side
        WHEN 1 THEN 'official_reference'
        WHEN 2 THEN 'upstream_cost'
        WHEN 3 THEN 'customer_charge'
        WHEN 4 THEN 'internal_transfer'
        ELSE 'unknown'
    END AS price_side_code,
    billing_meter_code,
    unit_price::text AS unit_price,
    currency,
    provider_code,
    channel_id,
    pricing_plan_code
FROM ai_model_pricing
WHERE deleted_at IS NULL
  AND status = 1
  AND catalog_key = $1
  AND price_side = $2
  AND billing_meter_code = $3
  AND (($4 IS NULL AND provider_code IS NULL) OR provider_code = $4)
  AND (($5 IS NULL AND pricing_plan_code IS NULL) OR pricing_plan_code = $5)
  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
ORDER BY priority ASC, effective_from DESC, id DESC
LIMIT 1
"#
    }
}
