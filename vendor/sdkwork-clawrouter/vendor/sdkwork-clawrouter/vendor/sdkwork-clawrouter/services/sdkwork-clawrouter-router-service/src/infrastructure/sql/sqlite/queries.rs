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
WITH model_base AS (
    SELECT
        m.*
    FROM ai_model m
    WHERE m.deleted_at IS NULL
      AND m.status = 1
      AND COALESCE(m.release_stage, 1) IN (1, 2)
      AND COALESCE(m.shelf_state, 1) = 1
      AND COALESCE(m.routing_state, 1) = 1
)
SELECT
    catalog_key,
    model,
    display_name,
    vendor_code,
    description,
    COALESCE(modalities, '[]') AS modalities_json,
    COALESCE(input_modalities, '[]') AS input_modalities_json,
    COALESCE(output_modalities, '[]') AS output_modalities_json,
    api_format,
    capability_intro,
    COALESCE(limitations, '[]') AS limitations_json,
    COALESCE(supported_languages, '[]') AS supported_languages_json,
    COALESCE(use_cases, '[]') AS use_cases_json,
    training_data_cutoff,
    context_tokens,
    max_output_tokens,
    COALESCE(supports_streaming, 0) AS supports_streaming,
    COALESCE(supports_tools, 0) AS supports_tools,
    COALESCE(supports_json_schema, 0) AS supports_json_schema,
    release_stage,
    shelf_state,
    routing_state,
    replacement_model,
    CAST(COALESCE(rank_score, '0') AS REAL) AS rank_score_order,
    COALESCE(
        json_group_array(DISTINCT capability_code),
        '[]'
    ) AS capabilities_json
FROM (
    SELECT
        m.id,
        m.model,
        m.catalog_key,
        m.display_name,
        m.vendor_code,
        m.description,
        m.modalities,
        m.input_modalities,
        m.output_modalities,
        m.api_format,
        m.capability_intro,
        m.limitations,
        m.supported_languages,
        m.use_cases,
        m.training_data_cutoff,
        m.context_tokens,
        m.max_output_tokens,
        m.supports_streaming,
        m.supports_tools,
        m.supports_json_schema,
        m.release_stage,
        m.shelf_state,
        m.routing_state,
        m.replacement_model,
        m.rank_score,
        CASE m.capability
            WHEN 1 THEN CASE
                WHEN COALESCE(m.modalities, '[]') LIKE '%"embedding"%' THEN 'embedding'
                WHEN COALESCE(m.input_modalities, '[]') LIKE '%"embedding"%' THEN 'embedding'
                WHEN COALESCE(m.output_modalities, '[]') LIKE '%"embedding"%' THEN 'embedding'
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
    FROM model_base m
    UNION ALL
    SELECT m.id, m.model, m.catalog_key, m.display_name, m.vendor_code, m.description, m.modalities, m.input_modalities, m.output_modalities, m.api_format, m.capability_intro, m.limitations, m.supported_languages, m.use_cases, m.training_data_cutoff, m.context_tokens, m.max_output_tokens, m.supports_streaming, m.supports_tools, m.supports_json_schema, m.release_stage, m.shelf_state, m.routing_state, m.replacement_model, m.rank_score, 'responses'
    FROM model_base m
    WHERE COALESCE(m.api_format, '') = 'openai_responses'
      AND COALESCE(m.capability, 1) = 1
    UNION ALL
    SELECT m.id, m.model, m.catalog_key, m.display_name, m.vendor_code, m.description, m.modalities, m.input_modalities, m.output_modalities, m.api_format, m.capability_intro, m.limitations, m.supported_languages, m.use_cases, m.training_data_cutoff, m.context_tokens, m.max_output_tokens, m.supports_streaming, m.supports_tools, m.supports_json_schema, m.release_stage, m.shelf_state, m.routing_state, m.replacement_model, m.rank_score, 'tools'
    FROM model_base m
    WHERE COALESCE(m.supports_tools, 0) = 1
    UNION ALL
    SELECT m.id, m.model, m.catalog_key, m.display_name, m.vendor_code, m.description, m.modalities, m.input_modalities, m.output_modalities, m.api_format, m.capability_intro, m.limitations, m.supported_languages, m.use_cases, m.training_data_cutoff, m.context_tokens, m.max_output_tokens, m.supports_streaming, m.supports_tools, m.supports_json_schema, m.release_stage, m.shelf_state, m.routing_state, m.replacement_model, m.rank_score, 'json_schema'
    FROM model_base m
    WHERE COALESCE(m.supports_json_schema, 0) = 1
    UNION ALL
    SELECT m.id, m.model, m.catalog_key, m.display_name, m.vendor_code, m.description, m.modalities, m.input_modalities, m.output_modalities, m.api_format, m.capability_intro, m.limitations, m.supported_languages, m.use_cases, m.training_data_cutoff, m.context_tokens, m.max_output_tokens, m.supports_streaming, m.supports_tools, m.supports_json_schema, m.release_stage, m.shelf_state, m.routing_state, m.replacement_model, m.rank_score, c.capability_code
    FROM model_base m
    JOIN ai_model_capability c ON c.model_id = m.id
    WHERE c.deleted_at IS NULL
      AND c.status = 1
      AND c.capability_code IS NOT NULL
) m
GROUP BY id, catalog_key, model, display_name, vendor_code, description, modalities, input_modalities, output_modalities, api_format, capability_intro, limitations, supported_languages, use_cases, training_data_cutoff, context_tokens, max_output_tokens, supports_streaming, supports_tools, supports_json_schema, release_stage, shelf_state, routing_state, replacement_model, rank_score
ORDER BY rank_score_order DESC, display_name ASC, id ASC
"#;

pub const LOAD_PROVIDER_ROUTES: &str = r#"
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
        r.resource_code,
        r.resource_type,
        r.vendor_code,
        r.modality_code,
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
      AND (cr.effective_from IS NULL OR datetime(cr.effective_from) <= CURRENT_TIMESTAMP)
      AND (cr.effective_to IS NULL OR datetime(cr.effective_to) > CURRENT_TIMESTAMP)
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
    c.provider_code AS provider_code,
    c.id AS channel_id,
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
  ON c.id = scope.channel_id
 AND c.tenant_id = scope.tenant_id
 AND c.organization_id = scope.organization_id
 AND c.deleted_at IS NULL
JOIN ai_channel_credential cc
  ON cc.channel_id = c.id
 AND cc.tenant_id = c.tenant_id
 AND cc.organization_id = c.organization_id
 AND cc.deleted_at IS NULL
 AND cc.status = 1
LEFT JOIN ai_provider p
  ON p.provider_code = c.provider_code
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
group_resource_scope AS (
    SELECT DISTINCT
        gr.tenant_id,
        gr.organization_id,
        gr.channel_group_id,
        r.resource_code,
        r.resource_type,
        r.vendor_code,
        r.modality_code,
        r.api_code,
        r.catalog_key,
        r.model,
        r.provider_native_model
    FROM ai_channel_group_resource gr
    LEFT JOIN resource_group_leaf rgi
      ON rgi.tenant_id = gr.tenant_id
     AND rgi.organization_id = gr.organization_id
     AND (
         (gr.resource_group_id IS NOT NULL AND rgi.resource_group_id = gr.resource_group_id)
         OR (NULLIF(gr.resource_group_code, '') IS NOT NULL AND rgi.resource_group_code = gr.resource_group_code)
         OR (NULLIF(gr.resource_code, '') IS NOT NULL AND rgi.resource_group_code = gr.resource_code)
     )
    JOIN ai_resource r
      ON r.tenant_id = gr.tenant_id
     AND r.organization_id = gr.organization_id
     AND r.deleted_at IS NULL
     AND r.status = 1
     AND (
         r.id = gr.resource_id
         OR r.id = rgi.resource_id
         OR (NULLIF(gr.resource_code, '') IS NOT NULL AND r.resource_code = gr.resource_code)
         OR (NULLIF(rgi.resource_code, '') IS NOT NULL AND r.resource_code = rgi.resource_code)
     )
    WHERE gr.deleted_at IS NULL
      AND gr.status = 1
      AND gr.grant_type = 'allow'
      AND (gr.effective_from IS NULL OR datetime(gr.effective_from) <= CURRENT_TIMESTAMP)
      AND (gr.effective_to IS NULL OR datetime(gr.effective_to) > CURRENT_TIMESTAMP)
),
channel_resource_scope AS (
    SELECT DISTINCT
        cr.tenant_id,
        cr.organization_id,
        cr.channel_id,
        r.resource_code,
        r.resource_type,
        r.vendor_code,
        r.modality_code,
        r.api_code,
        r.catalog_key,
        r.model,
        r.provider_native_model
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
      AND (cr.effective_from IS NULL OR datetime(cr.effective_from) <= CURRENT_TIMESTAMP)
      AND (cr.effective_to IS NULL OR datetime(cr.effective_to) > CURRENT_TIMESTAMP)
),
matched_resource_scope AS (
    SELECT DISTINCT
        gr.tenant_id,
        gr.organization_id,
        gr.channel_group_id,
        cr.channel_id,
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
    c.provider_code,
    c.id AS channel_id,
    cc.id AS credential_id,
    COALESCE(NULLIF(c.credential_rotation_strategy, ''), 'default') AS credential_rotation,
    COALESCE(cc.priority, 100) AS credential_priority,
    COALESCE(cc.weight, 100) AS credential_weight,
    NULLIF(c.channel_code, '') AS channel_code,
    COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code,
    c.site_id AS site_id,
    NULLIF(c.site_code, '') AS site_code,
    c.site_service_id AS site_service_id,
    NULLIF(c.site_service_code, '') AS site_service_code,
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
                'groupId', binding.channel_group_id,
                'priority', binding.priority,
                'weight', binding.weight,
                'apiScope', json(binding.api_scope),
                'capabilities', json(binding.capabilities)
            )
        )
        FROM (
            SELECT
                b.channel_group_id AS channel_group_id,
                COALESCE(b.priority, 100) AS priority,
                COALESCE(b.weight, 100) AS weight,
                CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM matched_resource_scope mrs
                        WHERE mrs.tenant_id = b.tenant_id
                          AND mrs.organization_id = b.organization_id
                          AND mrs.channel_group_id = b.channel_group_id
                          AND mrs.channel_id = c.id
                    ) THEN json_array('__deny__')
                    ELSE COALESCE((
                        SELECT json_group_array(scope.value)
                        FROM (
                            SELECT DISTINCT NULLIF(mrs.api_code, '') AS value
                            FROM matched_resource_scope mrs
                            WHERE mrs.tenant_id = b.tenant_id
                              AND mrs.organization_id = b.organization_id
                              AND mrs.channel_group_id = b.channel_group_id
                              AND mrs.channel_id = c.id
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
                          AND mrs.channel_group_id = b.channel_group_id
                          AND mrs.channel_id = c.id
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
                                  AND mrs.channel_group_id = b.channel_group_id
                                  AND mrs.channel_id = c.id
                                UNION ALL
                                SELECT NULLIF(mrs.modality_code, '') AS value, 2 AS sort_order
                                FROM matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.channel_group_id = b.channel_group_id
                                  AND mrs.channel_id = c.id
                                UNION ALL
                                SELECT NULLIF(mrs.api_code, '') AS value, 3 AS sort_order
                                FROM matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.channel_group_id = b.channel_group_id
                                  AND mrs.channel_id = c.id
                            ) capability_values
                            WHERE value IS NOT NULL AND value <> ''
                            ORDER BY sort_order, value
                        ) capability
                    ), '[]')
                END AS capabilities
            FROM ai_channel_group_member b
            WHERE b.deleted_at IS NULL
              AND b.status = 1
              AND COALESCE(b.enabled, 1) = 1
              AND b.tenant_id = c.tenant_id
              AND b.organization_id = c.organization_id
              AND b.channel_id = c.id
              AND (b.effective_from IS NULL OR datetime(b.effective_from) <= CURRENT_TIMESTAMP)
              AND (b.effective_to IS NULL OR datetime(b.effective_to) > CURRENT_TIMESTAMP)
            ORDER BY COALESCE(b.priority, 100) ASC, COALESCE(b.weight, 100) DESC, b.channel_group_id ASC, b.id ASC
        ) binding
    ), '[]') AS group_bindings_json
FROM ai_channel c
JOIN ai_channel_credential cc
  ON cc.channel_id = c.id
 AND cc.tenant_id = c.tenant_id
 AND cc.organization_id = c.organization_id
 AND cc.deleted_at IS NULL
 AND cc.status = 1
LEFT JOIN ai_provider p
  ON p.provider_code = c.provider_code
 AND p.tenant_id = c.tenant_id
 AND p.organization_id = c.organization_id
WHERE c.deleted_at IS NULL
  AND (p.id IS NULL OR p.deleted_at IS NULL)
  AND c.status = 1
  AND cc.status = 1
  AND (p.id IS NULL OR p.status = 1)
  AND EXISTS (
      SELECT 1
      FROM ai_channel_group_member member
      WHERE member.status = 1
        AND member.deleted_at IS NULL
        AND member.tenant_id = c.tenant_id
        AND member.organization_id = c.organization_id
        AND member.channel_id = c.id
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
    COALESCE(r.candidate_channels, '[]') AS candidate_channels_json,
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
      WHEN 'channel_group' THEN 2
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
FROM ai_channel_group
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
    COALESCE(channel_group_id, 0) AS group_id,
    COALESCE((
        SELECT json_group_array(
            json_object(
                'groupId', binding.channel_group_id,
                'groupCode', COALESCE(NULLIF(binding.channel_group_code, ''), g.group_code, ''),
                'pricingPlanCode', COALESCE(NULLIF(g.pricing_plan_code, ''), 'standard'),
                'bindingRole', COALESCE(NULLIF(binding.binding_role, ''), 'route'),
                'routingStrategy', COALESCE(NULLIF(binding.routing_strategy, ''), 'auto'),
                'priority', COALESCE(binding.priority, 100),
                'weight', COALESCE(binding.weight, 100)
            )
        )
        FROM (
            SELECT
                kg.channel_group_id,
                kg.channel_group_code,
                kg.binding_role,
                kg.routing_strategy,
                COALESCE(kg.priority, 100) AS priority,
                COALESCE(kg.weight, 100) AS weight
            FROM iam_gateway_api_key_channel_group kg
            WHERE kg.deleted_at IS NULL
              AND kg.status = 1
              AND kg.tenant_id = iam_gateway_api_key.tenant_id
              AND kg.organization_id = iam_gateway_api_key.organization_id
              AND kg.api_key_id = iam_gateway_api_key.id
              AND (kg.effective_from IS NULL OR datetime(kg.effective_from) <= CURRENT_TIMESTAMP)
              AND (kg.effective_to IS NULL OR datetime(kg.effective_to) > CURRENT_TIMESTAMP)
            UNION ALL
            SELECT
                iam_gateway_api_key.channel_group_id,
                NULL AS channel_group_code,
                'route' AS binding_role,
                'auto' AS routing_strategy,
                100 AS priority,
                100 AS weight
            WHERE iam_gateway_api_key.channel_group_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM iam_gateway_api_key_channel_group kg
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
                     channel_group_id ASC
        ) binding
        LEFT JOIN ai_channel_group g
          ON g.deleted_at IS NULL
         AND g.status = 1
         AND g.tenant_id = iam_gateway_api_key.tenant_id
         AND g.organization_id = iam_gateway_api_key.organization_id
         AND g.id = binding.channel_group_id
    ), '[]') AS group_bindings_json,
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
    COALESCE(channel_group_id, 0) AS group_id,
    CAST(capacity_used AS TEXT) AS capacity_used,
    CAST(capacity_limit AS TEXT) AS capacity_limit,
    CAST(usage_amount_total AS TEXT) AS usage_amount_total,
    CAST(snapshot_at AS TEXT) AS snapshot_at
FROM ai_channel_group_metric_snapshot
WHERE status = 1
ORDER BY channel_group_id ASC, snapshot_at DESC, id DESC
"#;

pub const LOAD_PRICES: &str = r#"
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
    CAST(unit_price AS TEXT) AS unit_price,
    currency,
    provider_code,
    channel_id,
    pricing_plan_code
FROM ai_model_pricing
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR datetime(effective_from) <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR datetime(effective_to) > CURRENT_TIMESTAMP)
ORDER BY priority ASC, datetime(effective_from) DESC, id DESC
"#;
