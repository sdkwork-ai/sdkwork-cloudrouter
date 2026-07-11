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
WITH RECURSIVE
active_channel_resource AS (
    SELECT cr.*
    FROM ai_channel_resource cr
    WHERE cr.deleted_at IS NULL
      AND cr.status = 1
      AND cr.grant_type = 'allow'
      AND (cr.tenant_id > 0 OR cr.organization_id = 0)
      AND (cr.effective_from IS NULL OR cr.effective_from <= CURRENT_TIMESTAMP)
      AND (cr.effective_to IS NULL OR cr.effective_to > CURRENT_TIMESTAMP)
),
routing_scope_owner AS (
    SELECT DISTINCT tenant_id, organization_id
    FROM active_channel_resource
),
resource_group_candidate AS (
    SELECT
        owner.tenant_id AS scope_tenant_id,
        owner.organization_id AS scope_organization_id,
        resource_group.id AS resource_group_id,
        resource_group.tenant_id AS definition_tenant_id,
        resource_group.organization_id AS definition_organization_id,
        resource_group.group_code,
        ROW_NUMBER() OVER (
            PARTITION BY owner.tenant_id, owner.organization_id, resource_group.group_code
            ORDER BY CASE
                WHEN resource_group.tenant_id = owner.tenant_id
                 AND resource_group.organization_id = owner.organization_id THEN 0
                WHEN owner.tenant_id > 0
                 AND resource_group.tenant_id = owner.tenant_id
                 AND resource_group.organization_id = 0 THEN 1
                ELSE 2
            END,
            resource_group.id ASC
        ) AS candidate_rank
    FROM routing_scope_owner owner
    JOIN ai_resource_group resource_group
      ON resource_group.deleted_at IS NULL
     AND resource_group.status = 1
     AND (resource_group.tenant_id > 0 OR resource_group.organization_id = 0)
     AND (
          (resource_group.tenant_id = owner.tenant_id AND resource_group.organization_id = owner.organization_id)
          OR (owner.tenant_id > 0 AND resource_group.tenant_id = owner.tenant_id AND resource_group.organization_id = 0)
          OR (resource_group.tenant_id = 0 AND resource_group.organization_id = 0)
     )
),
effective_resource_group AS (
    SELECT *
    FROM resource_group_candidate
    WHERE candidate_rank = 1
),
channel_group_binding AS (
    SELECT
        cr.id AS binding_id,
        cr.tenant_id AS scope_tenant_id,
        cr.organization_id AS scope_organization_id,
        cr.channel_id,
        cr.priority,
        cr.weight,
        resource_group.resource_group_id,
        resource_group.definition_tenant_id,
        resource_group.definition_organization_id,
        resource_group.group_code
    FROM active_channel_resource cr
    LEFT JOIN resource_group_candidate referenced_group
      ON referenced_group.scope_tenant_id = cr.tenant_id
     AND referenced_group.scope_organization_id = cr.organization_id
     AND cr.resource_group_id IS NOT NULL
     AND referenced_group.resource_group_id = cr.resource_group_id
    JOIN effective_resource_group resource_group
      ON resource_group.scope_tenant_id = cr.tenant_id
     AND resource_group.scope_organization_id = cr.organization_id
     AND resource_group.group_code = CASE
         WHEN cr.resource_group_id IS NOT NULL THEN referenced_group.group_code
         ELSE COALESCE(NULLIF(cr.resource_group_code, ''), NULLIF(cr.resource_code, ''))
     END
),
resource_group_tree AS (
    SELECT
        binding.binding_id,
        binding.scope_tenant_id,
        binding.scope_organization_id,
        binding.channel_id,
        binding.priority,
        binding.weight,
        item.resource_id,
        item.resource_code,
        item.child_resource_group_id,
        item.child_resource_group_code,
        0 AS depth
    FROM channel_group_binding binding
    JOIN ai_resource_group_item item
      ON item.tenant_id = binding.definition_tenant_id
     AND item.organization_id = binding.definition_organization_id
     AND item.deleted_at IS NULL
     AND item.status = 1
     AND (
          item.resource_group_id = binding.resource_group_id
          OR (NULLIF(item.resource_group_code, '') IS NOT NULL AND item.resource_group_code = binding.group_code)
     )
    UNION ALL
    SELECT
        tree.binding_id,
        tree.scope_tenant_id,
        tree.scope_organization_id,
        tree.channel_id,
        tree.priority,
        tree.weight,
        child.resource_id,
        child.resource_code,
        child.child_resource_group_id,
        child.child_resource_group_code,
        tree.depth + 1 AS depth
    FROM resource_group_tree tree
    LEFT JOIN resource_group_candidate referenced_child_group
      ON referenced_child_group.scope_tenant_id = tree.scope_tenant_id
     AND referenced_child_group.scope_organization_id = tree.scope_organization_id
     AND tree.child_resource_group_id IS NOT NULL
     AND referenced_child_group.resource_group_id = tree.child_resource_group_id
    JOIN effective_resource_group child_group
      ON child_group.scope_tenant_id = tree.scope_tenant_id
     AND child_group.scope_organization_id = tree.scope_organization_id
     AND child_group.group_code = CASE
         WHEN tree.child_resource_group_id IS NOT NULL THEN referenced_child_group.group_code
         ELSE NULLIF(tree.child_resource_group_code, '')
     END
    JOIN ai_resource_group_item child
      ON child.tenant_id = child_group.definition_tenant_id
     AND child.organization_id = child_group.definition_organization_id
     AND child.deleted_at IS NULL
     AND child.status = 1
     AND (
          child.resource_group_id = child_group.resource_group_id
          OR (NULLIF(child.resource_group_code, '') IS NOT NULL AND child.resource_group_code = child_group.group_code)
     )
    WHERE tree.depth < 8
      AND (
          tree.child_resource_group_id IS NOT NULL
          OR NULLIF(tree.child_resource_group_code, '') IS NOT NULL
      )
),
channel_resource_reference AS (
    SELECT
        cr.id AS binding_id,
        cr.tenant_id AS scope_tenant_id,
        cr.organization_id AS scope_organization_id,
        cr.channel_id,
        cr.priority,
        cr.weight,
        cr.resource_id,
        cr.resource_code
    FROM active_channel_resource cr
    WHERE cr.resource_id IS NOT NULL
       OR NULLIF(cr.resource_code, '') IS NOT NULL
    UNION ALL
    SELECT
        binding_id,
        scope_tenant_id,
        scope_organization_id,
        channel_id,
        priority,
        weight,
        resource_id,
        resource_code
    FROM resource_group_tree
    WHERE resource_id IS NOT NULL
       OR NULLIF(resource_code, '') IS NOT NULL
),
resource_reference_target AS (
    SELECT
        reference.*,
        referenced_resource.resource_code AS referenced_resource_code
    FROM channel_resource_reference reference
    LEFT JOIN ai_resource referenced_resource
      ON reference.resource_id IS NOT NULL
     AND referenced_resource.id = reference.resource_id
     AND referenced_resource.deleted_at IS NULL
     AND referenced_resource.status = 1
     AND (referenced_resource.tenant_id > 0 OR referenced_resource.organization_id = 0)
     AND (
          (referenced_resource.tenant_id = reference.scope_tenant_id AND referenced_resource.organization_id = reference.scope_organization_id)
          OR (reference.scope_tenant_id > 0 AND referenced_resource.tenant_id = reference.scope_tenant_id AND referenced_resource.organization_id = 0)
          OR (referenced_resource.tenant_id = 0 AND referenced_resource.organization_id = 0)
     )
),
resource_candidate AS (
    SELECT
        reference.binding_id,
        reference.scope_tenant_id,
        reference.scope_organization_id,
        reference.channel_id,
        reference.priority,
        reference.weight,
        resource.resource_code AS resolved_resource_code,
        resource.resource_type,
        resource.vendor_code,
        resource.modality_code,
        resource.api_code,
        resource.catalog_key,
        resource.model,
        resource.provider_native_model,
        ROW_NUMBER() OVER (
            PARTITION BY reference.binding_id, resource.resource_code
            ORDER BY CASE
                WHEN resource.tenant_id = reference.scope_tenant_id
                 AND resource.organization_id = reference.scope_organization_id THEN 0
                WHEN reference.scope_tenant_id > 0
                 AND resource.tenant_id = reference.scope_tenant_id
                 AND resource.organization_id = 0 THEN 1
                ELSE 2
            END,
            resource.id ASC
        ) AS candidate_rank
    FROM resource_reference_target reference
    JOIN ai_resource resource
      ON resource.deleted_at IS NULL
     AND resource.status = 1
     AND (resource.tenant_id > 0 OR resource.organization_id = 0)
     AND resource.resource_code = CASE
         WHEN reference.resource_id IS NOT NULL THEN reference.referenced_resource_code
         ELSE NULLIF(reference.resource_code, '')
     END
     AND (
          (resource.tenant_id = reference.scope_tenant_id AND resource.organization_id = reference.scope_organization_id)
          OR (reference.scope_tenant_id > 0 AND resource.tenant_id = reference.scope_tenant_id AND resource.organization_id = 0)
          OR (resource.tenant_id = 0 AND resource.organization_id = 0)
     )
),
channel_resource_scope AS (
    SELECT DISTINCT
        scope_tenant_id AS tenant_id,
        scope_organization_id AS organization_id,
        channel_id,
        resource_type,
        vendor_code,
        api_code,
        catalog_key,
        model,
        provider_native_model,
        priority,
        weight,
        binding_id
    FROM resource_candidate
    WHERE candidate_rank = 1
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
WITH RECURSIVE
active_channel_resource AS (
    SELECT cr.*
    FROM ai_channel_resource cr
    WHERE cr.deleted_at IS NULL
      AND cr.status = 1
      AND cr.grant_type = 'allow'
      AND (cr.tenant_id > 0 OR cr.organization_id = 0)
      AND (cr.effective_from IS NULL OR cr.effective_from <= CURRENT_TIMESTAMP)
      AND (cr.effective_to IS NULL OR cr.effective_to > CURRENT_TIMESTAMP)
),
routing_scope_owner AS (
    SELECT DISTINCT tenant_id, organization_id
    FROM active_channel_resource
),
resource_group_candidate AS (
    SELECT
        owner.tenant_id AS scope_tenant_id,
        owner.organization_id AS scope_organization_id,
        resource_group.id AS resource_group_id,
        resource_group.tenant_id AS definition_tenant_id,
        resource_group.organization_id AS definition_organization_id,
        resource_group.group_code,
        ROW_NUMBER() OVER (
            PARTITION BY owner.tenant_id, owner.organization_id, resource_group.group_code
            ORDER BY CASE
                WHEN resource_group.tenant_id = owner.tenant_id
                 AND resource_group.organization_id = owner.organization_id THEN 0
                WHEN owner.tenant_id > 0
                 AND resource_group.tenant_id = owner.tenant_id
                 AND resource_group.organization_id = 0 THEN 1
                ELSE 2
            END,
            resource_group.id ASC
        ) AS candidate_rank
    FROM routing_scope_owner owner
    JOIN ai_resource_group resource_group
      ON resource_group.deleted_at IS NULL
     AND resource_group.status = 1
     AND (resource_group.tenant_id > 0 OR resource_group.organization_id = 0)
     AND (
          (resource_group.tenant_id = owner.tenant_id AND resource_group.organization_id = owner.organization_id)
          OR (owner.tenant_id > 0 AND resource_group.tenant_id = owner.tenant_id AND resource_group.organization_id = 0)
          OR (resource_group.tenant_id = 0 AND resource_group.organization_id = 0)
     )
),
effective_resource_group AS (
    SELECT *
    FROM resource_group_candidate
    WHERE candidate_rank = 1
),
channel_group_binding AS (
    SELECT
        cr.id AS binding_id,
        cr.tenant_id AS scope_tenant_id,
        cr.organization_id AS scope_organization_id,
        cr.channel_id,
        cr.priority,
        cr.weight,
        resource_group.resource_group_id,
        resource_group.definition_tenant_id,
        resource_group.definition_organization_id,
        resource_group.group_code
    FROM active_channel_resource cr
    LEFT JOIN resource_group_candidate referenced_group
      ON referenced_group.scope_tenant_id = cr.tenant_id
     AND referenced_group.scope_organization_id = cr.organization_id
     AND cr.resource_group_id IS NOT NULL
     AND referenced_group.resource_group_id = cr.resource_group_id
    JOIN effective_resource_group resource_group
      ON resource_group.scope_tenant_id = cr.tenant_id
     AND resource_group.scope_organization_id = cr.organization_id
     AND resource_group.group_code = CASE
         WHEN cr.resource_group_id IS NOT NULL THEN referenced_group.group_code
         ELSE COALESCE(NULLIF(cr.resource_group_code, ''), NULLIF(cr.resource_code, ''))
     END
),
resource_group_tree AS (
    SELECT
        binding.binding_id,
        binding.scope_tenant_id,
        binding.scope_organization_id,
        binding.channel_id,
        binding.priority,
        binding.weight,
        item.resource_id,
        item.resource_code,
        item.child_resource_group_id,
        item.child_resource_group_code,
        0 AS depth
    FROM channel_group_binding binding
    JOIN ai_resource_group_item item
      ON item.tenant_id = binding.definition_tenant_id
     AND item.organization_id = binding.definition_organization_id
     AND item.deleted_at IS NULL
     AND item.status = 1
     AND (
          item.resource_group_id = binding.resource_group_id
          OR (NULLIF(item.resource_group_code, '') IS NOT NULL AND item.resource_group_code = binding.group_code)
     )
    UNION ALL
    SELECT
        tree.binding_id,
        tree.scope_tenant_id,
        tree.scope_organization_id,
        tree.channel_id,
        tree.priority,
        tree.weight,
        child.resource_id,
        child.resource_code,
        child.child_resource_group_id,
        child.child_resource_group_code,
        tree.depth + 1 AS depth
    FROM resource_group_tree tree
    LEFT JOIN resource_group_candidate referenced_child_group
      ON referenced_child_group.scope_tenant_id = tree.scope_tenant_id
     AND referenced_child_group.scope_organization_id = tree.scope_organization_id
     AND tree.child_resource_group_id IS NOT NULL
     AND referenced_child_group.resource_group_id = tree.child_resource_group_id
    JOIN effective_resource_group child_group
      ON child_group.scope_tenant_id = tree.scope_tenant_id
     AND child_group.scope_organization_id = tree.scope_organization_id
     AND child_group.group_code = CASE
         WHEN tree.child_resource_group_id IS NOT NULL THEN referenced_child_group.group_code
         ELSE NULLIF(tree.child_resource_group_code, '')
     END
    JOIN ai_resource_group_item child
      ON child.tenant_id = child_group.definition_tenant_id
     AND child.organization_id = child_group.definition_organization_id
     AND child.deleted_at IS NULL
     AND child.status = 1
     AND (
          child.resource_group_id = child_group.resource_group_id
          OR (NULLIF(child.resource_group_code, '') IS NOT NULL AND child.resource_group_code = child_group.group_code)
     )
    WHERE tree.depth < 8
      AND (
          tree.child_resource_group_id IS NOT NULL
          OR NULLIF(tree.child_resource_group_code, '') IS NOT NULL
      )
),
channel_resource_reference AS (
    SELECT
        cr.id AS binding_id,
        cr.tenant_id AS scope_tenant_id,
        cr.organization_id AS scope_organization_id,
        cr.channel_id,
        cr.priority,
        cr.weight,
        cr.resource_id,
        cr.resource_code
    FROM active_channel_resource cr
    WHERE cr.resource_id IS NOT NULL
       OR NULLIF(cr.resource_code, '') IS NOT NULL
    UNION ALL
    SELECT
        binding_id,
        scope_tenant_id,
        scope_organization_id,
        channel_id,
        priority,
        weight,
        resource_id,
        resource_code
    FROM resource_group_tree
    WHERE resource_id IS NOT NULL
       OR NULLIF(resource_code, '') IS NOT NULL
),
resource_reference_target AS (
    SELECT
        reference.*,
        referenced_resource.resource_code AS referenced_resource_code
    FROM channel_resource_reference reference
    LEFT JOIN ai_resource referenced_resource
      ON reference.resource_id IS NOT NULL
     AND referenced_resource.id = reference.resource_id
     AND referenced_resource.deleted_at IS NULL
     AND referenced_resource.status = 1
     AND (referenced_resource.tenant_id > 0 OR referenced_resource.organization_id = 0)
     AND (
          (referenced_resource.tenant_id = reference.scope_tenant_id AND referenced_resource.organization_id = reference.scope_organization_id)
          OR (reference.scope_tenant_id > 0 AND referenced_resource.tenant_id = reference.scope_tenant_id AND referenced_resource.organization_id = 0)
          OR (referenced_resource.tenant_id = 0 AND referenced_resource.organization_id = 0)
     )
),
resource_candidate AS (
    SELECT
        reference.binding_id,
        reference.scope_tenant_id,
        reference.scope_organization_id,
        reference.channel_id,
        reference.priority,
        reference.weight,
        resource.resource_type,
        resource.vendor_code,
        resource.modality_code,
        resource.api_code,
        resource.catalog_key,
        resource.model,
        resource.provider_native_model,
        ROW_NUMBER() OVER (
            PARTITION BY reference.binding_id, resource.resource_code
            ORDER BY CASE
                WHEN resource.tenant_id = reference.scope_tenant_id
                 AND resource.organization_id = reference.scope_organization_id THEN 0
                WHEN reference.scope_tenant_id > 0
                 AND resource.tenant_id = reference.scope_tenant_id
                 AND resource.organization_id = 0 THEN 1
                ELSE 2
            END,
            resource.id ASC
        ) AS candidate_rank
    FROM resource_reference_target reference
    JOIN ai_resource resource
      ON resource.deleted_at IS NULL
     AND resource.status = 1
     AND (resource.tenant_id > 0 OR resource.organization_id = 0)
     AND resource.resource_code = CASE
         WHEN reference.resource_id IS NOT NULL THEN reference.referenced_resource_code
         ELSE NULLIF(reference.resource_code, '')
     END
     AND (
          (resource.tenant_id = reference.scope_tenant_id AND resource.organization_id = reference.scope_organization_id)
          OR (reference.scope_tenant_id > 0 AND resource.tenant_id = reference.scope_tenant_id AND resource.organization_id = 0)
          OR (resource.tenant_id = 0 AND resource.organization_id = 0)
     )
),
channel_resource_scope AS (
    SELECT DISTINCT
        scope_tenant_id AS tenant_id,
        scope_organization_id AS organization_id,
        channel_id,
        resource_type,
        vendor_code,
        api_code,
        catalog_key,
        model,
        provider_native_model,
        priority,
        weight,
        binding_id
    FROM resource_candidate
    WHERE candidate_rank = 1
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
