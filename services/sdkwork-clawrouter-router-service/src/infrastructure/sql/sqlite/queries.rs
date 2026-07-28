pub const LOAD_VENDORS: &str = r#"
SELECT
    vendor_code,
    display_name
FROM ai_model_vendor
WHERE deleted_at IS NULL
  AND status = 1
ORDER BY sort_order ASC, display_name ASC, id ASC
"#;

pub const LOAD_MODELS: &str = r#"
SELECT
    catalog_key,
    model,
    display_name,
    vendor_code,
    COALESCE(NULLIF(capabilities, ''), '[]') AS capabilities_json,
    description,
    COALESCE(NULLIF(modalities, ''), '[]') AS modalities_json,
    COALESCE(NULLIF(input_modalities, ''), '[]') AS input_modalities_json,
    COALESCE(NULLIF(output_modalities, ''), '[]') AS output_modalities_json,
    api_format,
    capability_intro,
    COALESCE(NULLIF(limitations, ''), '[]') AS limitations_json,
    COALESCE(NULLIF(supported_languages, ''), '[]') AS supported_languages_json,
    COALESCE(NULLIF(use_cases, ''), '[]') AS use_cases_json,
    training_data_cutoff,
    context_tokens,
    max_output_tokens,
    COALESCE(supports_streaming, 0) = 1 AS supports_streaming,
    COALESCE(supports_tools, 0) = 1 AS supports_tools,
    COALESCE(supports_json_schema, 0) = 1 AS supports_json_schema,
    release_stage,
    shelf_state,
    routing_state,
    replacement_model
FROM ai_model
WHERE deleted_at IS NULL
  AND status = 1
  AND COALESCE(release_stage, 1) IN (1, 2)
  AND COALESCE(shelf_state, 1) = 1
  AND COALESCE(routing_state, 1) = 1
ORDER BY display_name ASC, id ASC
"#;

pub const LOAD_PRICES: &str = r#"
SELECT
    tenant_id,
    organization_id,
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
    CAST(unit_price AS TEXT) AS unit_price,
    currency,
    supplier_code,
    account_id,
    pricing_plan_code
FROM ai_model_pricing
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR datetime(effective_from) <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR datetime(effective_to) > CURRENT_TIMESTAMP)
ORDER BY priority ASC, datetime(effective_from) DESC, id DESC
"#;

pub const LOAD_PROVIDER_ROUTES: &str = r#"
WITH RECURSIVE
active_channel_resource AS (
    SELECT cr.*
    FROM ai_channel_resource cr
    WHERE cr.deleted_at IS NULL
      AND cr.status = 1
      AND cr.grant_type = 'allow'
      AND (cr.tenant_id > 0 OR cr.organization_id = 0)
      AND (cr.effective_from IS NULL OR datetime(cr.effective_from) <= CURRENT_TIMESTAMP)
      AND (cr.effective_to IS NULL OR datetime(cr.effective_to) > CURRENT_TIMESTAMP)
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
upstream_account_group_binding AS (
    SELECT
        cr.id AS binding_id,
        cr.tenant_id AS scope_tenant_id,
        cr.organization_id AS scope_organization_id,
        cr.account_id,
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
        binding.account_id,
        binding.priority,
        binding.weight,
        item.resource_id,
        item.resource_code,
        item.child_resource_group_id,
        item.child_resource_group_code,
        0 AS depth
    FROM upstream_account_group_binding binding
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
        tree.account_id,
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
        cr.account_id,
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
        account_id,
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
        reference.account_id,
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
        account_id,
        resolved_resource_code AS resource_code,
        resource_type,
        vendor_code,
        modality_code,
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
    COALESCE(NULLIF(scope.catalog_key, ''), NULLIF(scope.model, '')) AS catalog_key,
    COALESCE(NULLIF(scope.model, ''), NULLIF(scope.catalog_key, '')) AS model,
    NULLIF(COALESCE(NULLIF(scope.api_code, ''), CASE
        WHEN COALESCE(scope.modality_code, '') IN ('embedding', 'embeddings') THEN 'openai.embeddings'
        WHEN COALESCE(scope.modality_code, '') IN ('image', 'images') THEN 'openai.images'
        WHEN COALESCE(scope.modality_code, '') IN ('audio', 'speech', 'tts', 'stt') THEN 'openai.audio'
        WHEN COALESCE(scope.modality_code, '') IN ('music', 'suno') THEN 'suno.music'
        WHEN COALESCE(scope.modality_code, '') IN ('video', 'videos') THEN 'openai.video'
        WHEN COALESCE(scope.modality_code, '') IN ('rerank') THEN 'rerank'
        WHEN scope.resource_type = 'api_endpoint' THEN COALESCE(NULLIF(scope.api_code, ''), 'openai.chat_completions')
        ELSE 'openai.chat_completions'
    END), '') AS api_code,
    COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code,
    c.supplier_code AS supplier_code,
    c.id AS account_id,
    cc.id AS credential_id,
    COALESCE(NULLIF(c.credential_rotation_strategy, ''), 'default') AS credential_rotation,
    COALESCE(cc.priority, 100) AS credential_priority,
    COALESCE(cc.weight, 100) AS credential_weight,
    COALESCE(
        NULLIF(scope.provider_native_model, ''),
        NULLIF(scope.model, ''),
        NULLIF(scope.catalog_key, '')
    ) AS provider_model,
    COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url) AS base_url,
    cc.credential_ref AS secret_ref,
    CAST(c.auth_type AS TEXT) AS auth_type,
    CAST(cc.auth_config AS TEXT) AS auth_config_json,
    c.timeout_ms AS timeout_ms,
    c.retry_policy AS retry_policy_json
FROM channel_resource_scope scope
JOIN ai_channel c
  ON c.id = scope.account_id
 AND c.tenant_id = scope.tenant_id
 AND c.organization_id = scope.organization_id
 AND c.deleted_at IS NULL
JOIN ai_channel_credential cc
  ON cc.account_id = c.id
 AND cc.tenant_id = c.tenant_id
 AND cc.organization_id = c.organization_id
 AND cc.deleted_at IS NULL
 AND cc.status = 1
LEFT JOIN ai_provider p
  ON p.supplier_code = c.supplier_code
 AND p.tenant_id = c.tenant_id
 AND p.organization_id = c.organization_id
WHERE (
      NULLIF(scope.catalog_key, '') IS NOT NULL
      OR NULLIF(scope.model, '') IS NOT NULL
  )
  AND c.deleted_at IS NULL
  AND (p.id IS NULL OR p.deleted_at IS NULL)
  AND c.status = 1
  AND (
      COALESCE(c.health_status, 1) = 1
      OR datetime(
          COALESCE(c.updated_at, CURRENT_TIMESTAMP),
          '+' || CAST(? AS TEXT) || ' seconds'
      ) <= CURRENT_TIMESTAMP
  )
  AND (
      COALESCE(cc.health_status, 1) = 1
      OR datetime(
          COALESCE(cc.updated_at, CURRENT_TIMESTAMP),
          '+' || CAST(? AS TEXT) || ' seconds'
      ) <= CURRENT_TIMESTAMP
  )
  AND (p.id IS NULL OR p.status = 1)
  AND scope.binding_id IS NOT NULL
  AND COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url) IS NOT NULL
  AND NULLIF(COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url), '') IS NOT NULL
  AND NULLIF(cc.credential_ref, '') IS NOT NULL
ORDER BY COALESCE(scope.priority, c.priority, 100) ASC,
         COALESCE(scope.weight, c.weight, 100) DESC,
         COALESCE(cc.priority, 100) ASC,
         COALESCE(cc.weight, 100) DESC,
         scope.binding_id ASC,
         cc.id ASC
"#;

pub const LOAD_PROVIDER_CHANNEL_ROUTES: &str = r#"
WITH RECURSIVE
active_routing_resource_binding AS (
    SELECT
        'group' AS binding_kind,
        gr.id AS binding_id,
        gr.tenant_id AS scope_tenant_id,
        gr.organization_id AS scope_organization_id,
        gr.account_group_id AS subject_id,
        gr.resource_id,
        gr.resource_code,
        gr.resource_group_id,
        gr.resource_group_code
    FROM ai_upstream_account_group_resource gr
    WHERE gr.deleted_at IS NULL
      AND gr.status = 1
      AND gr.grant_type = 'allow'
      AND (gr.tenant_id > 0 OR gr.organization_id = 0)
      AND (gr.effective_from IS NULL OR datetime(gr.effective_from) <= CURRENT_TIMESTAMP)
      AND (gr.effective_to IS NULL OR datetime(gr.effective_to) > CURRENT_TIMESTAMP)
    UNION ALL
    SELECT
        'channel' AS binding_kind,
        cr.id AS binding_id,
        cr.tenant_id AS scope_tenant_id,
        cr.organization_id AS scope_organization_id,
        cr.account_id AS subject_id,
        cr.resource_id,
        cr.resource_code,
        cr.resource_group_id,
        cr.resource_group_code
    FROM ai_channel_resource cr
    WHERE cr.deleted_at IS NULL
      AND cr.status = 1
      AND cr.grant_type = 'allow'
      AND (cr.tenant_id > 0 OR cr.organization_id = 0)
      AND (cr.effective_from IS NULL OR datetime(cr.effective_from) <= CURRENT_TIMESTAMP)
      AND (cr.effective_to IS NULL OR datetime(cr.effective_to) > CURRENT_TIMESTAMP)
),
routing_scope_owner AS (
    SELECT DISTINCT scope_tenant_id AS tenant_id, scope_organization_id AS organization_id
    FROM active_routing_resource_binding
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
routing_group_binding AS (
    SELECT
        binding.binding_kind,
        binding.binding_id,
        binding.scope_tenant_id,
        binding.scope_organization_id,
        binding.subject_id,
        resource_group.resource_group_id,
        resource_group.definition_tenant_id,
        resource_group.definition_organization_id,
        resource_group.group_code
    FROM active_routing_resource_binding binding
    LEFT JOIN resource_group_candidate referenced_group
      ON referenced_group.scope_tenant_id = binding.scope_tenant_id
     AND referenced_group.scope_organization_id = binding.scope_organization_id
     AND binding.resource_group_id IS NOT NULL
     AND referenced_group.resource_group_id = binding.resource_group_id
    JOIN effective_resource_group resource_group
      ON resource_group.scope_tenant_id = binding.scope_tenant_id
     AND resource_group.scope_organization_id = binding.scope_organization_id
     AND resource_group.group_code = CASE
         WHEN binding.resource_group_id IS NOT NULL THEN referenced_group.group_code
         ELSE COALESCE(NULLIF(binding.resource_group_code, ''), NULLIF(binding.resource_code, ''))
     END
),
resource_group_tree AS (
    SELECT
        binding.binding_kind,
        binding.binding_id,
        binding.scope_tenant_id,
        binding.scope_organization_id,
        binding.subject_id,
        item.resource_id,
        item.resource_code,
        item.child_resource_group_id,
        item.child_resource_group_code,
        0 AS depth
    FROM routing_group_binding binding
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
        tree.binding_kind,
        tree.binding_id,
        tree.scope_tenant_id,
        tree.scope_organization_id,
        tree.subject_id,
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
routing_resource_reference AS (
    SELECT
        binding_kind,
        binding_id,
        scope_tenant_id,
        scope_organization_id,
        subject_id,
        resource_id,
        resource_code
    FROM active_routing_resource_binding
    WHERE resource_id IS NOT NULL
       OR NULLIF(resource_code, '') IS NOT NULL
    UNION ALL
    SELECT
        binding_kind,
        binding_id,
        scope_tenant_id,
        scope_organization_id,
        subject_id,
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
    FROM routing_resource_reference reference
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
        reference.binding_kind,
        reference.binding_id,
        reference.scope_tenant_id,
        reference.scope_organization_id,
        reference.subject_id,
        resource.resource_code,
        resource.resource_type,
        resource.vendor_code,
        resource.modality_code,
        resource.api_code,
        resource.catalog_key,
        resource.model,
        resource.provider_native_model,
        ROW_NUMBER() OVER (
            PARTITION BY reference.binding_kind, reference.binding_id, resource.resource_code
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
group_resource_scope AS (
    SELECT DISTINCT
        scope_tenant_id AS tenant_id,
        scope_organization_id AS organization_id,
        subject_id AS account_group_id,
        resource_code,
        resource_type,
        vendor_code,
        modality_code,
        api_code,
        catalog_key,
        model,
        provider_native_model
    FROM resource_candidate
    WHERE binding_kind = 'group'
      AND candidate_rank = 1
),
channel_resource_scope AS (
    SELECT DISTINCT
        scope_tenant_id AS tenant_id,
        scope_organization_id AS organization_id,
        subject_id AS account_id,
        resource_code,
        resource_type,
        vendor_code,
        modality_code,
        api_code,
        catalog_key,
        model,
        provider_native_model
    FROM resource_candidate
    WHERE binding_kind = 'channel'
      AND candidate_rank = 1
),
matched_resource_scope AS (
    SELECT DISTINCT
        gr.tenant_id,
        gr.organization_id,
        gr.account_group_id,
        cr.account_id,
        COALESCE(NULLIF(gr.resource_code, ''), NULLIF(cr.resource_code, '')) AS resource_code,
        COALESCE(NULLIF(gr.resource_type, ''), NULLIF(cr.resource_type, '')) AS resource_type,
        COALESCE(NULLIF(gr.vendor_code, ''), NULLIF(cr.vendor_code, '')) AS vendor_code,
        COALESCE(NULLIF(gr.modality_code, ''), NULLIF(cr.modality_code, '')) AS modality_code,
        COALESCE(NULLIF(gr.api_code, ''), NULLIF(cr.api_code, '')) AS api_code,
        COALESCE(NULLIF(gr.catalog_key, ''), NULLIF(cr.catalog_key, '')) AS catalog_key,
        COALESCE(NULLIF(gr.model, ''), NULLIF(cr.model, '')) AS model,
        COALESCE(NULLIF(gr.provider_native_model, ''), NULLIF(cr.provider_native_model, '')) AS provider_native_model
    FROM group_resource_scope gr
    JOIN channel_resource_scope cr
      ON cr.tenant_id = gr.tenant_id
     AND cr.organization_id = gr.organization_id
     AND (
          NULLIF(gr.resource_code, '') = NULLIF(cr.resource_code, '')
          OR (
              NULLIF(gr.catalog_key, '') IS NOT NULL
              AND gr.catalog_key = cr.catalog_key
              AND (NULLIF(gr.api_code, '') IS NULL OR NULLIF(cr.api_code, '') IS NULL OR gr.api_code = cr.api_code)
          )
          OR (
              NULLIF(gr.api_code, '') IS NOT NULL
              AND gr.api_code = cr.api_code
              AND (gr.resource_type = 'api_endpoint' OR cr.resource_type = 'api_endpoint')
          )
          OR (
              NULLIF(gr.vendor_code, '') IS NOT NULL
              AND gr.vendor_code = cr.vendor_code
              AND (gr.resource_type = 'vendor' OR cr.resource_type = 'vendor')
          )
          OR (
              NULLIF(gr.modality_code, '') IS NOT NULL
              AND gr.modality_code = cr.modality_code
              AND (gr.resource_type = 'modality' OR cr.resource_type = 'modality')
          )
     )
)
SELECT
    c.supplier_code,
    c.id AS account_id,
    cc.id AS credential_id,
    COALESCE(NULLIF(c.credential_rotation_strategy, ''), 'default') AS credential_rotation,
    COALESCE(cc.priority, 100) AS credential_priority,
    COALESCE(cc.weight, 100) AS credential_weight,
    NULLIF(c.account_code, '') AS account_code,
    COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code,
    c.supplier_id AS supplier_id,
    NULLIF(c.supplier_code, '') AS supplier_code,
    c.endpoint_id AS endpoint_id,
    NULLIF(c.endpoint_code, '') AS endpoint_code,
    COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url) AS base_url,
    cc.credential_ref AS secret_ref,
    CAST(c.auth_type AS TEXT) AS auth_type,
    CAST(cc.auth_config AS TEXT) AS auth_config_json,
    c.timeout_ms AS timeout_ms,
    c.retry_policy AS retry_policy_json,
    CASE
        WHEN COALESCE(c.health_status, 1) = 1 THEN 1
        WHEN datetime(
            COALESCE(c.updated_at, CURRENT_TIMESTAMP),
            '+' || CAST(? AS TEXT) || ' seconds'
        ) <= CURRENT_TIMESTAMP THEN 1
        ELSE COALESCE(c.health_status, 1)
    END AS channel_health_status,
    CASE
        WHEN COALESCE(cc.health_status, 1) = 1 THEN 1
        WHEN datetime(
            COALESCE(cc.updated_at, CURRENT_TIMESTAMP),
            '+' || CAST(? AS TEXT) || ' seconds'
        ) <= CURRENT_TIMESTAMP THEN 1
        ELSE COALESCE(cc.health_status, 1)
    END AS credential_health_status,
    COALESCE((
        SELECT json_group_array(
            json_object(
                'groupId', binding.account_group_id,
                'priority', binding.priority,
                'weight', binding.weight,
                'apiScope', json(binding.api_scope),
                'capabilities', json(binding.capabilities)
            )
        )
        FROM (
            SELECT
                b.account_group_id AS account_group_id,
                COALESCE(b.priority, 100) AS priority,
                COALESCE(b.weight, 100) AS weight,
                CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM matched_resource_scope mrs
                        WHERE mrs.tenant_id = b.tenant_id
                          AND mrs.organization_id = b.organization_id
                          AND mrs.account_group_id = b.account_group_id
                          AND mrs.account_id = c.id
                    ) THEN json_array('__deny__')
                    ELSE COALESCE((
                        SELECT json_group_array(scope.value)
                        FROM (
                            SELECT DISTINCT NULLIF(mrs.api_code, '') AS value
                            FROM matched_resource_scope mrs
                            WHERE mrs.tenant_id = b.tenant_id
                              AND mrs.organization_id = b.organization_id
                              AND mrs.account_group_id = b.account_group_id
                              AND mrs.account_id = c.id
                              AND NULLIF(mrs.api_code, '') IS NOT NULL
                            ORDER BY value
                        ) scope
                    ), '[]')
                END AS api_scope,
                CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM matched_resource_scope mrs
                        WHERE mrs.tenant_id = b.tenant_id
                          AND mrs.organization_id = b.organization_id
                          AND mrs.account_group_id = b.account_group_id
                          AND mrs.account_id = c.id
                    ) THEN json_array('__deny__')
                    ELSE COALESCE((
                        SELECT json_group_array(capability.value)
                        FROM (
                            SELECT DISTINCT value, sort_order
                            FROM (
                                SELECT
                                    CASE
                                        WHEN mrs.api_code IN ('chat_completions', 'openai.chat_completions', 'responses', 'openai.responses', 'completions', 'openai.completions', 'embeddings', 'embedding', 'openai.embeddings')
                                             OR mrs.modality_code IN ('chat', 'embedding', 'rerank')
                                        THEN 'llm'
                                    END AS value,
                                    1 AS sort_order
                                FROM matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.account_group_id = b.account_group_id
                                  AND mrs.account_id = c.id
                                UNION ALL
                                SELECT NULLIF(mrs.modality_code, '') AS value, 2 AS sort_order
                                FROM matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.account_group_id = b.account_group_id
                                  AND mrs.account_id = c.id
                                UNION ALL
                                SELECT NULLIF(mrs.api_code, '') AS value, 3 AS sort_order
                                FROM matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.account_group_id = b.account_group_id
                                  AND mrs.account_id = c.id
                            ) capability_values
                            WHERE value IS NOT NULL AND value <> ''
                            ORDER BY sort_order, value
                        ) capability
                    ), '[]')
                END AS capabilities
            FROM ai_upstream_account_group_member b
            WHERE b.deleted_at IS NULL
              AND b.status = 1
              AND COALESCE(b.enabled, 1) = 1
              AND b.tenant_id = c.tenant_id
              AND b.organization_id = c.organization_id
              AND b.account_id = c.id
              AND (b.effective_from IS NULL OR datetime(b.effective_from) <= CURRENT_TIMESTAMP)
              AND (b.effective_to IS NULL OR datetime(b.effective_to) > CURRENT_TIMESTAMP)
            ORDER BY COALESCE(b.priority, 100) ASC, COALESCE(b.weight, 100) DESC, b.account_group_id ASC, b.id ASC
        ) binding
    ), '[]') AS account_group_bindings_json
FROM ai_channel c
JOIN ai_channel_credential cc
  ON cc.account_id = c.id
 AND cc.tenant_id = c.tenant_id
 AND cc.organization_id = c.organization_id
 AND cc.deleted_at IS NULL
 AND cc.status = 1
LEFT JOIN ai_provider p
  ON p.supplier_code = c.supplier_code
 AND p.tenant_id = c.tenant_id
 AND p.organization_id = c.organization_id
WHERE c.deleted_at IS NULL
  AND (p.id IS NULL OR p.deleted_at IS NULL)
  AND c.status = 1
  AND cc.status = 1
  AND (p.id IS NULL OR p.status = 1)
  AND EXISTS (
      SELECT 1
      FROM ai_upstream_account_group_member member
      WHERE member.status = 1
        AND member.deleted_at IS NULL
        AND member.tenant_id = c.tenant_id
        AND member.organization_id = c.organization_id
        AND member.account_id = c.id
        AND COALESCE(member.enabled, 1) = 1
        AND (member.effective_from IS NULL OR datetime(member.effective_from) <= CURRENT_TIMESTAMP)
        AND (member.effective_to IS NULL OR datetime(member.effective_to) > CURRENT_TIMESTAMP)
  )
  AND COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url) IS NOT NULL
  AND NULLIF(COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url), '') IS NOT NULL
  AND NULLIF(cc.credential_ref, '') IS NOT NULL
ORDER BY COALESCE(c.priority, 100) ASC,
         COALESCE(c.weight, 100) DESC,
         COALESCE(cc.priority, 100) ASC,
         COALESCE(cc.weight, 100) DESC,
         c.id ASC,
         cc.id ASC
"#;

pub const LOAD_ROUTING_POLICIES: &str = r#"
SELECT
    p.id,
    COALESCE(p.tenant_id, 0) AS tenant_id,
    COALESCE(p.organization_id, 0) AS organization_id,
    p.policy_code,
    p.policy_scope,
    p.subject_id,
    p.capability,
    p.default_profile_id,
    p.fallback_mode
FROM ai_routing_policy p
JOIN ai_routing_profile pr ON pr.id = p.default_profile_id
WHERE p.deleted_at IS NULL
  AND pr.deleted_at IS NULL
  AND p.status = 1
  AND pr.status = 1
ORDER BY p.policy_scope DESC, p.updated_at DESC, p.id DESC
"#;

pub const LOAD_ROUTING_RULES: &str = r#"
SELECT
    r.id,
    COALESCE(r.tenant_id, 0) AS tenant_id,
    COALESCE(r.organization_id, 0) AS organization_id,
    r.profile_id,
    r.rule_code,
    r.priority,
    COALESCE(r.match_expression, '{}') AS match_expression_json,
    r.target_model,
    COALESCE(r.candidate_account_groups, '[]') AS candidate_account_groups_json,
    COALESCE(r.fallback_chain, '[]') AS fallback_chain_json,
    COALESCE(r.constraints, '{}') AS constraints_json
FROM ai_routing_rule r
JOIN ai_routing_profile pr ON pr.id = r.profile_id
WHERE r.deleted_at IS NULL
  AND pr.deleted_at IS NULL
  AND r.status = 1
  AND pr.status = 1
  AND (r.effective_from IS NULL OR datetime(r.effective_from) <= CURRENT_TIMESTAMP)
  AND (r.effective_to IS NULL OR datetime(r.effective_to) > CURRENT_TIMESTAMP)
ORDER BY r.profile_id ASC, r.priority ASC, r.id ASC
"#;

pub const LOAD_MODEL_MAPPINGS: &str = r#"
SELECT
    r.id AS id,
    b.binding_type AS binding_type,
    b.binding_id AS binding_id,
    NULLIF(b.binding_code, '') AS binding_code,
    i.source_model AS source_model,
    NULLIF(i.source_catalog_key, '') AS source_catalog_key,
    i.target_model AS target_model,
    NULLIF(i.target_catalog_key, '') AS target_catalog_key,
    NULLIF(target_vendor_code, '') AS target_vendor_code,
    NULLIF(i.target_provider_model, '') AS target_provider_model,
    NULLIF(i.target_provider_native_model, '') AS target_provider_native_model,
    COALESCE(b.sort_order, 100) AS binding_sort_order,
    COALESCE(i.sort_order, 100) AS item_sort_order
FROM ai_model_mapping_rule r
JOIN ai_model_mapping_rule_binding b
  ON b.rule_id = r.id
 AND b.tenant_id = r.tenant_id
 AND b.organization_id = r.organization_id
 AND b.deleted_at IS NULL
 AND b.status = 1
 AND b.enabled = 1
JOIN ai_model_mapping_rule_item i
  ON i.rule_id = r.id
 AND i.tenant_id = r.tenant_id
 AND i.organization_id = r.organization_id
 AND i.deleted_at IS NULL
 AND i.status = 1
 AND i.enabled = 1
WHERE r.deleted_at IS NULL
  AND r.status = 1
  AND r.enabled = 1
  AND r.match_type = 'exact'
  AND r.mapping_mode = 'alias'
ORDER BY
  CASE b.binding_type
      WHEN 'provider_account' THEN 0
      WHEN 'channel' THEN 1
      WHEN 'upstream_account_group' THEN 2
      WHEN 'vendor' THEN 3
      WHEN 'global' THEN 4
      WHEN 'site' THEN 5
      WHEN 'site_service' THEN 6
      ELSE 7
  END,
  b.sort_order ASC,
  i.sort_order ASC,
  r.updated_at DESC,
  r.id DESC
"#;

pub const LOAD_PRICING_PLANS: &str = r#"
SELECT
    tenant_id,
    organization_id,
    plan_code,
    CASE base_price_side
        WHEN 1 THEN 'official_reference'
        WHEN 2 THEN 'upstream_cost'
        WHEN 3 THEN 'customer_charge'
        WHEN 4 THEN 'internal_transfer'
        ELSE 'unknown'
    END AS base_price_side_code,
    CAST(default_multiplier AS TEXT) AS default_multiplier,
    CAST(default_markup_amount AS TEXT) AS default_markup_amount,
    currency
FROM ai_pricing_plan
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR datetime(effective_from) <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR datetime(effective_to) > CURRENT_TIMESTAMP)
ORDER BY priority ASC, datetime(effective_from) DESC, id DESC
"#;

pub const LOAD_API_KEY_GROUPS: &str = r#"
SELECT
    id,
    COALESCE(tenant_id, 0) AS tenant_id,
    COALESCE(organization_id, 0) AS organization_id,
    COALESCE(NULLIF(group_name, ''), group_code) AS name,
    group_code AS code,
    COALESCE(NULLIF(TRIM(pricing_plan_code), ''), 'standard') AS pricing_plan_code,
    CAST(rate_multiplier AS TEXT) AS rate_multiplier,
    CAST(official_price_multiplier AS TEXT) AS official_price_multiplier
FROM ai_upstream_account_group
WHERE deleted_at IS NULL
  AND status = 1
ORDER BY updated_at DESC, id DESC
"#;

pub const LOAD_API_KEYS: &str = r#"
SELECT
    id,
    COALESCE(tenant_id, 0) AS tenant_id,
    COALESCE(organization_id, 0) AS organization_id,
    COALESCE(user_id, 0) AS user_id,
    COALESCE(account_group_id, 0) AS group_id,
    COALESCE((
        SELECT json_group_array(
            json_object(
                'groupId', binding.account_group_id,
                'groupCode', COALESCE(NULLIF(binding.account_group_code, ''), g.group_code, ''),
                'pricingPlanCode', COALESCE(NULLIF(g.pricing_plan_code, ''), 'standard'),
                'bindingRole', COALESCE(NULLIF(binding.binding_role, ''), 'route'),
                'routingStrategy', COALESCE(NULLIF(binding.routing_strategy, ''), 'auto'),
                'priority', COALESCE(binding.priority, 100),
                'weight', COALESCE(binding.weight, 100)
            )
        )
        FROM (
            SELECT
                kg.account_group_id,
                kg.account_group_code,
                kg.binding_role,
                kg.routing_strategy,
                COALESCE(kg.priority, 100) AS priority,
                COALESCE(kg.weight, 100) AS weight
            FROM iam_gateway_api_key_upstream_account_group kg
            WHERE kg.deleted_at IS NULL
              AND kg.status = 1
              AND kg.tenant_id = iam_gateway_api_key.tenant_id
              AND kg.organization_id = iam_gateway_api_key.organization_id
              AND kg.api_key_id = iam_gateway_api_key.id
              AND (kg.effective_from IS NULL OR datetime(kg.effective_from) <= CURRENT_TIMESTAMP)
              AND (kg.effective_to IS NULL OR datetime(kg.effective_to) > CURRENT_TIMESTAMP)
            UNION ALL
            SELECT
                iam_gateway_api_key.account_group_id,
                NULL AS account_group_code,
                'route' AS binding_role,
                'auto' AS routing_strategy,
                100 AS priority,
                100 AS weight
            WHERE iam_gateway_api_key.account_group_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM iam_gateway_api_key_upstream_account_group kg
                  WHERE kg.deleted_at IS NULL
                    AND kg.status = 1
                    AND kg.tenant_id = iam_gateway_api_key.tenant_id
                    AND kg.organization_id = iam_gateway_api_key.organization_id
                    AND kg.api_key_id = iam_gateway_api_key.id
                    AND (kg.effective_from IS NULL OR datetime(kg.effective_from) <= CURRENT_TIMESTAMP)
                    AND (kg.effective_to IS NULL OR datetime(kg.effective_to) > CURRENT_TIMESTAMP)
              )
            ORDER BY priority ASC,
                     weight DESC,
                     account_group_id ASC
        ) binding
        LEFT JOIN ai_upstream_account_group g
          ON g.deleted_at IS NULL
         AND g.status = 1
         AND g.tenant_id = iam_gateway_api_key.tenant_id
         AND g.organization_id = iam_gateway_api_key.organization_id
         AND g.id = binding.account_group_id
    ), '[]') AS account_group_bindings_json,
    COALESCE(name, '') AS name,
    COALESCE(key_prefix, '') AS key_prefix,
    COALESCE(NULLIF(key_display_masked, ''), COALESCE(key_prefix, '') || '********') AS key_display_masked,
    COALESCE(key_hash, '') AS key_hash,
    json_extract(COALESCE(metadata, '{}'), '$.copyableKeyCiphertext') AS copyable_key,
    policy_id,
    quota_policy_id,
    CAST(created_at AS TEXT) AS created_at,
    CAST(expire_at AS TEXT) AS expire_at,
    status AS status_code,
    COALESCE(json_extract(COALESCE(metadata, '{}'), '$.runtime.defaultForRuntime'), false) AS default_for_runtime
FROM iam_gateway_api_key
WHERE deleted_at IS NULL
  AND status = 1
  AND revoked_at IS NULL
  AND (expire_at IS NULL OR datetime(expire_at) > CURRENT_TIMESTAMP)
ORDER BY updated_at DESC, id DESC
"#;

pub const LOAD_ACCESS_POLICIES: &str = r#"
SELECT
    id,
    COALESCE(allowed_capabilities, '[]') AS allowed_capabilities_json,
    COALESCE(ip_allowlist, '[]') AS ip_allowlist_json
FROM iam_gateway_access_policy
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR datetime(effective_from) <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR datetime(effective_to) > CURRENT_TIMESTAMP)
ORDER BY updated_at DESC, id DESC
"#;

pub const LOAD_QUOTA_POLICIES: &str = r#"
SELECT
    id,
    CAST(quota_limit AS TEXT) AS quota_limit,
    requests_per_second,
    requests_per_day,
    CAST(burst_limit AS TEXT) AS burst_limit
FROM ai_quota_policy
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR datetime(effective_from) <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR datetime(effective_to) > CURRENT_TIMESTAMP)
ORDER BY updated_at DESC, id DESC
"#;

pub const LOAD_GATEWAY_RISK_RULES: &str = r#"
SELECT
    id,
    COALESCE(tenant_id, 0) AS tenant_id,
    COALESCE(organization_id, 0) AS organization_id,
    COALESCE(rule_category, 0) AS rule_category,
    COALESCE(rule_type, 0) AS rule_type,
    scope_type,
    scope_id,
    COALESCE(target_type, 0) AS target_type,
    COALESCE(target_value, '') AS target_value,
    COALESCE(match_mode, 0) AS match_mode,
    COALESCE(action, 0) AS action,
    COALESCE(priority, 0) AS priority,
    requests_per_second,
    requests_per_minute,
    requests_per_day,
    CAST(burst_limit AS TEXT) AS burst_limit,
    block_duration_seconds
FROM iam_gateway_risk_rule
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR datetime(effective_from) <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR datetime(effective_to) > CURRENT_TIMESTAMP)
ORDER BY priority ASC, id ASC
"#;

pub const LOAD_API_KEY_GROUP_METRIC_SNAPSHOTS: &str = r#"
SELECT
    COALESCE(account_group_id, 0) AS group_id,
    CAST(capacity_used AS TEXT) AS capacity_used,
    CAST(capacity_limit AS TEXT) AS capacity_limit,
    CAST(usage_amount_total AS TEXT) AS usage_amount_total,
    CAST(snapshot_at AS TEXT) AS snapshot_at
FROM ai_upstream_account_group_metric_snapshot
WHERE status = 1
ORDER BY account_group_id ASC, snapshot_at DESC, id DESC
"#;
