use super::PricingCatalogSql;

impl PricingCatalogSql {
    pub fn snapshot_load_queries() -> Vec<&'static str> {
        vec![
            Self::load_vendors(),
            Self::load_models(),
            Self::load_upstream_account_routes(),
            Self::load_routing_policies(),
            Self::load_routing_rules(),
            Self::load_model_mappings(),
            Self::load_pricing_plans(),
            Self::load_upstream_account_groups(),
            Self::load_api_keys(),
            Self::load_access_policies(),
            Self::load_quota_policies(),
            Self::load_gateway_risk_rules(),
            Self::load_upstream_account_group_metric_snapshots(),
            Self::load_prices(),
        ]
    }

    pub fn load_vendors() -> &'static str {
        r#"
SELECT
    vendor_code,
    display_name
FROM ai_model_vendor
WHERE deleted_at IS NULL
  AND status = 1
ORDER BY sort_order ASC, display_name ASC, id ASC
"#
    }

    pub fn load_models() -> &'static str {
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
ORDER BY rank_score DESC, display_name ASC, id ASC
"#
    }

    pub fn load_upstream_account_routes() -> &'static str {
        r#"
WITH RECURSIVE
active_routing_resource_binding AS (
    SELECT
        'group' AS binding_kind,
        gr.id AS binding_id,
        gr.tenant_id AS scope_tenant_id,
        gr.organization_id AS scope_organization_id,
        gr.account_group_id AS subject_id,
        gr.grant_type,
        gr.resource_id,
        gr.resource_code,
        gr.resource_group_id,
        gr.resource_group_code
    FROM ai_upstream_account_group_resource gr
    WHERE gr.deleted_at IS NULL
      AND gr.status = 1
      AND (gr.tenant_id > 0 OR gr.organization_id = 0)
      AND (gr.effective_from IS NULL OR gr.effective_from <= CURRENT_TIMESTAMP)
      AND (gr.effective_to IS NULL OR gr.effective_to > CURRENT_TIMESTAMP)
    UNION ALL
    SELECT
        'supplier' AS binding_kind,
        sr.id AS binding_id,
        sr.tenant_id AS scope_tenant_id,
        sr.organization_id AS scope_organization_id,
        sr.supplier_id AS subject_id,
        sr.grant_type,
        sr.resource_id,
        sr.resource_code,
        sr.resource_group_id,
        sr.resource_group_code
    FROM ai_upstream_supplier_resource sr
    WHERE sr.deleted_at IS NULL
      AND sr.status = 1
      AND (sr.tenant_id > 0 OR sr.organization_id = 0)
      AND (sr.effective_from IS NULL OR sr.effective_from <= CURRENT_TIMESTAMP)
      AND (sr.effective_to IS NULL OR sr.effective_to > CURRENT_TIMESTAMP)
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
        binding.grant_type,
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
        binding.grant_type,
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
        tree.grant_type,
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
        grant_type,
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
        grant_type,
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
        reference.grant_type,
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
      AND grant_type = 'allow'
      AND candidate_rank = 1
      AND NOT EXISTS (
          SELECT 1
          FROM resource_candidate denied
          WHERE denied.binding_kind = resource_candidate.binding_kind
            AND denied.scope_tenant_id = resource_candidate.scope_tenant_id
            AND denied.scope_organization_id = resource_candidate.scope_organization_id
            AND denied.subject_id = resource_candidate.subject_id
            AND denied.resource_code = resource_candidate.resource_code
            AND denied.grant_type = 'deny'
            AND denied.candidate_rank = 1
      )
),
supplier_resource_scope AS (
    SELECT DISTINCT
        scope_tenant_id AS tenant_id,
        scope_organization_id AS organization_id,
        subject_id AS supplier_id,
        resource_code,
        resource_type,
        vendor_code,
        modality_code,
        api_code,
        catalog_key,
        model,
        provider_native_model
    FROM resource_candidate
    WHERE binding_kind = 'supplier'
      AND grant_type = 'allow'
      AND candidate_rank = 1
      AND NOT EXISTS (
          SELECT 1
          FROM resource_candidate denied
          WHERE denied.binding_kind = resource_candidate.binding_kind
            AND denied.scope_tenant_id = resource_candidate.scope_tenant_id
            AND denied.scope_organization_id = resource_candidate.scope_organization_id
            AND denied.subject_id = resource_candidate.subject_id
            AND denied.resource_code = resource_candidate.resource_code
            AND denied.grant_type = 'deny'
            AND denied.candidate_rank = 1
      )
),
matched_resource_scope AS (
    SELECT DISTINCT
        gr.tenant_id,
        gr.organization_id,
        gr.account_group_id,
        sr.supplier_id,
        COALESCE(NULLIF(gr.resource_code, ''), NULLIF(sr.resource_code, '')) AS resource_code,
        COALESCE(NULLIF(gr.resource_type, ''), NULLIF(sr.resource_type, '')) AS resource_type,
        COALESCE(NULLIF(gr.vendor_code, ''), NULLIF(sr.vendor_code, '')) AS vendor_code,
        COALESCE(NULLIF(gr.modality_code, ''), NULLIF(sr.modality_code, '')) AS modality_code,
        COALESCE(NULLIF(gr.api_code, ''), NULLIF(sr.api_code, '')) AS api_code,
        COALESCE(NULLIF(gr.catalog_key, ''), NULLIF(sr.catalog_key, '')) AS catalog_key,
        COALESCE(NULLIF(gr.model, ''), NULLIF(sr.model, '')) AS model,
        COALESCE(NULLIF(gr.provider_native_model, ''), NULLIF(sr.provider_native_model, '')) AS provider_native_model
    FROM group_resource_scope gr
    JOIN supplier_resource_scope sr
      ON sr.tenant_id = gr.tenant_id
     AND sr.organization_id = gr.organization_id
     AND (
          NULLIF(gr.resource_code, '') = NULLIF(sr.resource_code, '')
          OR (
              NULLIF(gr.catalog_key, '') IS NOT NULL
              AND gr.catalog_key = sr.catalog_key
              AND (NULLIF(gr.api_code, '') IS NULL OR NULLIF(sr.api_code, '') IS NULL OR gr.api_code = sr.api_code)
          )
          OR (
              NULLIF(gr.api_code, '') IS NOT NULL
              AND gr.api_code = sr.api_code
              AND (gr.resource_type = 'api_endpoint' OR sr.resource_type = 'api_endpoint')
          )
          OR (
              NULLIF(gr.vendor_code, '') IS NOT NULL
              AND gr.vendor_code = sr.vendor_code
              AND (gr.resource_type = 'vendor' OR sr.resource_type = 'vendor')
          )
          OR (
              NULLIF(gr.modality_code, '') IS NOT NULL
              AND gr.modality_code = sr.modality_code
              AND (gr.resource_type = 'modality' OR sr.resource_type = 'modality')
          )
     )
)
SELECT
    c.supplier_code,
    c.id AS account_id,
    cc.id AS credential_id,
    COALESCE(NULLIF(c.credential_rotation_strategy, ''), 'default') AS credential_rotation,
    COALESCE(cc.priority, 100) AS credential_priority,
    100 AS credential_weight,
    c.contract_cost_multiplier::text AS contract_cost_multiplier,
    account_health.last_latency_ms,
    NULLIF(c.account_code, '') AS account_code,
    COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code,
    c.supplier_id,
    e.id AS endpoint_id,
    NULLIF(e.endpoint_code, '') AS endpoint_code,
    COALESCE(e.priority, 100) AS endpoint_priority,
    COALESCE(e.routing_weight, 100) AS endpoint_weight,
    CASE
        WHEN endpoint_health.endpoint_id IS NULL THEN 0
        WHEN endpoint_health.health_status = 1
          OR (
              endpoint_health.health_status = 2
              AND endpoint_health.updated_at + ($1 * INTERVAL '1 second') <= CURRENT_TIMESTAMP
          )
        THEN 1
        ELSE endpoint_health.health_status
    END AS endpoint_health_status,
    e.base_url,
    'managed://upstream-account-credential/' || cc.id::text AS secret_ref,
    cc.credential_ref AS secret_ciphertext,
    am.auth_type,
    am.runtime_auth_config::text AS runtime_auth_config_json,
    COALESCE(c.timeout_ms, e.timeout_ms) AS timeout_ms,
    c.retry_policy::text AS retry_policy_json,
    CASE
        WHEN account_health.account_id IS NULL THEN 0
        WHEN account_health.health_status = 1
          OR (
              account_health.health_status = 2
              AND account_health.updated_at + ($1 * INTERVAL '1 second') <= CURRENT_TIMESTAMP
          )
        THEN 1
        ELSE account_health.health_status
    END AS account_health_status,
    1 AS credential_health_status,
    COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'accountGroupId', b.account_group_id,
                'priority', COALESCE(b.priority, 100),
                'weight', COALESCE(b.routing_weight, 100),
                'costMultiplierOverride', b.cost_multiplier_override::text,
                'apiScope', CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM matched_resource_scope mrs
                        WHERE mrs.tenant_id = b.tenant_id
                          AND mrs.organization_id = b.organization_id
                          AND mrs.account_group_id = b.account_group_id
                          AND mrs.supplier_id = c.supplier_id
                    ) THEN jsonb_build_array('__deny__')
                    ELSE COALESCE((
                        SELECT jsonb_agg(scope.value ORDER BY scope.value)
                        FROM (
                            SELECT DISTINCT NULLIF(mrs.api_code, '') AS value
                            FROM matched_resource_scope mrs
                            WHERE mrs.tenant_id = b.tenant_id
                              AND mrs.organization_id = b.organization_id
                              AND mrs.account_group_id = b.account_group_id
                              AND mrs.supplier_id = c.supplier_id
                              AND NULLIF(mrs.api_code, '') IS NOT NULL
                        ) scope
                    ), '[]'::jsonb)
                END,
                'capabilities', CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM matched_resource_scope mrs
                        WHERE mrs.tenant_id = b.tenant_id
                          AND mrs.organization_id = b.organization_id
                          AND mrs.account_group_id = b.account_group_id
                          AND mrs.supplier_id = c.supplier_id
                    ) THEN jsonb_build_array('__deny__')
                    ELSE COALESCE((
                        SELECT jsonb_agg(capability.value ORDER BY capability.sort_order, capability.value)
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
                                  AND mrs.supplier_id = c.supplier_id
                                UNION ALL
                                SELECT NULLIF(mrs.modality_code, '') AS value, 2 AS sort_order
                                FROM matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.account_group_id = b.account_group_id
                                  AND mrs.supplier_id = c.supplier_id
                                UNION ALL
                                SELECT NULLIF(mrs.api_code, '') AS value, 3 AS sort_order
                                FROM matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.account_group_id = b.account_group_id
                                  AND mrs.supplier_id = c.supplier_id
                            ) capability_values
                            WHERE value IS NOT NULL AND value <> ''
                        ) capability
                    ), '[]'::jsonb)
                END,
                'resourceEntitlements', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'resourceCode', resource.resource_code,
                            'resourceType', resource.resource_type,
                            'vendorCode', resource.vendor_code,
                            'modalityCode', resource.modality_code,
                            'apiCode', resource.api_code,
                            'catalogKey', resource.catalog_key,
                            'model', resource.model,
                            'providerNativeModel', resource.provider_native_model
                        )
                        ORDER BY resource.resource_code
                    )
                    FROM (
                        SELECT DISTINCT
                            mrs.resource_code,
                            mrs.resource_type,
                            mrs.vendor_code,
                            mrs.modality_code,
                            mrs.api_code,
                            mrs.catalog_key,
                            mrs.model,
                            mrs.provider_native_model
                        FROM matched_resource_scope mrs
                        WHERE mrs.tenant_id = b.tenant_id
                          AND mrs.organization_id = b.organization_id
                          AND mrs.account_group_id = b.account_group_id
                          AND mrs.supplier_id = c.supplier_id
                    ) resource
                ), '[]'::jsonb)
            )
            ORDER BY COALESCE(b.priority, 100) ASC, COALESCE(b.routing_weight, 100) DESC, b.account_group_id ASC, b.id ASC
        )
        FROM ai_upstream_account_group_member b
        WHERE b.deleted_at IS NULL
          AND b.status = 1
          AND COALESCE(b.enabled, true)
          AND b.tenant_id = c.tenant_id
          AND b.organization_id = c.organization_id
          AND b.account_id = c.id
          AND (b.effective_from IS NULL OR b.effective_from <= CURRENT_TIMESTAMP)
          AND (b.effective_to IS NULL OR b.effective_to > CURRENT_TIMESTAMP)
    ), '[]'::jsonb)::text AS account_group_bindings_json
FROM ai_upstream_account c
JOIN ai_upstream_supplier s
  ON s.id = c.supplier_id
 AND s.supplier_code = c.supplier_code
 AND s.tenant_id = c.tenant_id
 AND s.organization_id = c.organization_id
 AND s.deleted_at IS NULL
 AND s.status = 1
JOIN ai_upstream_supplier_auth_method am
  ON am.supplier_id = c.supplier_id
 AND am.auth_method_code = c.auth_method_code
 AND am.tenant_id = c.tenant_id
 AND am.organization_id = c.organization_id
 AND am.deleted_at IS NULL
 AND am.status = 1
JOIN ai_upstream_account_credential cc
  ON cc.account_id = c.id
 AND cc.tenant_id = c.tenant_id
 AND cc.organization_id = c.organization_id
 AND cc.deleted_at IS NULL
 AND cc.status = 1
 AND cc.is_active
 AND (cc.expires_at IS NULL OR cc.expires_at > CURRENT_TIMESTAMP)
JOIN ai_upstream_supplier_endpoint e
  ON e.supplier_id = c.supplier_id
 AND e.tenant_id = c.tenant_id
 AND e.organization_id = c.organization_id
 AND e.deleted_at IS NULL
 AND e.status = 1
LEFT JOIN ai_upstream_account_health_state account_health
  ON account_health.tenant_id = c.tenant_id
 AND account_health.organization_id = c.organization_id
 AND account_health.account_id = c.id
LEFT JOIN ai_upstream_supplier_endpoint_health_state endpoint_health
  ON endpoint_health.tenant_id = e.tenant_id
 AND endpoint_health.organization_id = e.organization_id
 AND endpoint_health.endpoint_id = e.id
WHERE c.deleted_at IS NULL
  AND c.status = 1
  AND EXISTS (
      SELECT 1
      FROM ai_upstream_account_group_member member
      WHERE member.status = 1
        AND member.deleted_at IS NULL
        AND member.tenant_id = c.tenant_id
        AND member.organization_id = c.organization_id
        AND member.account_id = c.id
        AND COALESCE(member.enabled, true)
        AND (member.effective_from IS NULL OR member.effective_from <= CURRENT_TIMESTAMP)
        AND (member.effective_to IS NULL OR member.effective_to > CURRENT_TIMESTAMP)
  )
  AND NULLIF(cc.credential_ref, '') IS NOT NULL
  AND NULLIF(e.base_url, '') IS NOT NULL
ORDER BY CASE WHEN e.id = c.preferred_endpoint_id THEN 0 ELSE 1 END ASC,
         COALESCE(e.priority, 100) ASC,
         COALESCE(e.routing_weight, 100) DESC,
         COALESCE(cc.priority, 100) ASC,
         cc.credential_version DESC,
         c.id ASC,
         e.id ASC,
         cc.id ASC
"#
    }

    pub fn load_routing_policies() -> &'static str {
        r#"
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
"#
    }

    pub fn load_routing_rules() -> &'static str {
        r#"
SELECT
    r.id,
    COALESCE(r.tenant_id, 0) AS tenant_id,
    COALESCE(r.organization_id, 0) AS organization_id,
    r.profile_id,
    r.rule_code,
    r.priority,
    COALESCE(r.match_expression::text, '{}') AS match_expression_json,
    r.target_model,
    COALESCE(r.candidate_account_groups::text, '[]') AS candidate_account_groups_json,
    COALESCE(r.fallback_chain::text, '[]') AS fallback_chain_json,
    COALESCE(r.constraints::text, '{}') AS constraints_json
FROM ai_routing_rule r
JOIN ai_routing_profile pr ON pr.id = r.profile_id
WHERE r.deleted_at IS NULL
  AND pr.deleted_at IS NULL
  AND r.status = 1
  AND pr.status = 1
  AND (r.effective_from IS NULL OR r.effective_from <= CURRENT_TIMESTAMP)
  AND (r.effective_to IS NULL OR r.effective_to > CURRENT_TIMESTAMP)
ORDER BY r.profile_id ASC, r.priority ASC, r.id ASC
"#
    }

    pub fn load_model_mappings() -> &'static str {
        r#"
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
 AND b.enabled = true
JOIN ai_model_mapping_rule_item i
  ON i.rule_id = r.id
 AND i.tenant_id = r.tenant_id
 AND i.organization_id = r.organization_id
 AND i.deleted_at IS NULL
 AND i.status = 1
 AND i.enabled = true
WHERE r.deleted_at IS NULL
  AND r.status = 1
  AND r.enabled = true
  AND r.match_type = 'exact'
  AND r.mapping_mode = 'alias'
ORDER BY
  CASE b.binding_type
      WHEN 'upstream_account' THEN 0
      WHEN 'upstream_account_group' THEN 1
      WHEN 'supplier_endpoint' THEN 2
      WHEN 'upstream_supplier' THEN 3
      WHEN 'vendor' THEN 4
      WHEN 'global' THEN 5
      ELSE 6
  END,
  b.sort_order ASC,
  i.sort_order ASC,
  r.updated_at DESC,
  r.id DESC
"#
    }

    pub fn load_pricing_plans() -> &'static str {
        r#"
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
    default_multiplier::text AS default_multiplier,
    default_markup_amount::text AS default_markup_amount,
    currency
FROM ai_pricing_plan
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
ORDER BY priority ASC, effective_from DESC, id DESC
"#
    }

    pub fn load_upstream_account_groups() -> &'static str {
        r#"
SELECT
    id,
    COALESCE(tenant_id, 0) AS tenant_id,
    COALESCE(organization_id, 0) AS organization_id,
    COALESCE(NULLIF(group_name, ''), group_code) AS name,
    group_code AS code,
    COALESCE(NULLIF(BTRIM(pricing_plan_code), ''), 'standard') AS pricing_plan_code,
    routing_strategy,
    fallback_mode,
    priority,
    cost_multiplier::text AS cost_multiplier,
    sale_multiplier::text AS sale_multiplier
FROM ai_upstream_account_group
WHERE deleted_at IS NULL
  AND status = 1
ORDER BY updated_at DESC, id DESC
"#
    }

    pub fn load_api_keys() -> &'static str {
        r#"
SELECT
    id,
    COALESCE(tenant_id, 0) AS tenant_id,
    COALESCE(organization_id, 0) AS organization_id,
    COALESCE(user_id, 0) AS user_id,
    COALESCE(account_group_id, 0) AS group_id,
    COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'groupId', binding.account_group_id,
                'groupCode', COALESCE(NULLIF(binding.account_group_code, ''), g.group_code, ''),
                'pricingPlanCode', COALESCE(NULLIF(g.pricing_plan_code, ''), 'standard'),
                'bindingRole', COALESCE(NULLIF(binding.binding_role, ''), 'route'),
                'routingStrategy', COALESCE(NULLIF(binding.routing_strategy, ''), 'auto'),
                'priority', COALESCE(binding.priority, 100),
                'weight', COALESCE(binding.weight, 100)
            )
            ORDER BY COALESCE(binding.priority, 100) ASC,
                     COALESCE(binding.weight, 100) DESC,
                     binding.account_group_id ASC
        )::text
        FROM (
            SELECT
                kg.account_group_id,
                kg.account_group_code,
                kg.binding_role,
                kg.routing_strategy,
                kg.priority,
                kg.weight
            FROM iam_gateway_api_key_account_group kg
            WHERE kg.deleted_at IS NULL
              AND kg.status = 1
              AND kg.tenant_id = iam_gateway_api_key.tenant_id
              AND kg.organization_id = iam_gateway_api_key.organization_id
              AND kg.api_key_id = iam_gateway_api_key.id
              AND (kg.effective_from IS NULL OR kg.effective_from <= CURRENT_TIMESTAMP)
              AND (kg.effective_to IS NULL OR kg.effective_to > CURRENT_TIMESTAMP)
            UNION ALL
            SELECT
                iam_gateway_api_key.account_group_id,
                NULL::text AS account_group_code,
                'route'::text AS binding_role,
                'auto'::text AS routing_strategy,
                100 AS priority,
                100 AS weight
            WHERE iam_gateway_api_key.account_group_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM iam_gateway_api_key_account_group kg
                  WHERE kg.deleted_at IS NULL
                    AND kg.status = 1
                    AND kg.tenant_id = iam_gateway_api_key.tenant_id
                    AND kg.organization_id = iam_gateway_api_key.organization_id
                    AND kg.api_key_id = iam_gateway_api_key.id
                    AND (kg.effective_from IS NULL OR kg.effective_from <= CURRENT_TIMESTAMP)
                    AND (kg.effective_to IS NULL OR kg.effective_to > CURRENT_TIMESTAMP)
              )
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
    policy_id,
    quota_policy_id,
    created_at::text AS created_at,
    expire_at::text AS expire_at,
    status AS status_code,
    COALESCE((metadata #>> '{runtime,defaultForRuntime}')::boolean, false) AS default_for_runtime
FROM iam_gateway_api_key
WHERE deleted_at IS NULL
  AND status = 1
  AND revoked_at IS NULL
  AND (expire_at IS NULL OR expire_at > CURRENT_TIMESTAMP)
ORDER BY updated_at DESC, id DESC
"#
    }

    pub fn load_access_policies() -> &'static str {
        r#"
SELECT
    id,
    COALESCE(allowed_capabilities::text, '[]') AS allowed_capabilities_json,
    COALESCE(ip_allowlist::text, '[]') AS ip_allowlist_json
FROM iam_gateway_access_policy
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
ORDER BY updated_at DESC, id DESC
"#
    }

    pub fn load_quota_policies() -> &'static str {
        r#"
SELECT
    id,
    quota_limit::text AS quota_limit,
    requests_per_second,
    requests_per_day,
    burst_limit::text AS burst_limit
FROM ai_quota_policy
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
ORDER BY updated_at DESC, id DESC
"#
    }

    pub fn load_gateway_risk_rules() -> &'static str {
        r#"
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
    burst_limit::text AS burst_limit,
    block_duration_seconds
FROM iam_gateway_risk_rule
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
ORDER BY priority ASC, id ASC
"#
    }

    pub fn load_upstream_account_group_metric_snapshots() -> &'static str {
        r#"
SELECT
    COALESCE(account_group_id, 0) AS group_id,
    capacity_used::text AS capacity_used,
    capacity_limit::text AS capacity_limit,
    usage_amount_total::text AS usage_amount_total,
    snapshot_at::text AS snapshot_at
FROM ai_upstream_account_group_metric_snapshot
WHERE status = 1
ORDER BY account_group_id ASC, snapshot_at DESC, id DESC
"#
    }

    pub fn load_prices() -> &'static str {
        r#"
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
    unit_price::text AS unit_price,
    currency,
    supplier_code,
    account_id,
    pricing_plan_code
FROM ai_model_pricing
WHERE deleted_at IS NULL
  AND status = 1
  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
ORDER BY priority ASC, effective_from DESC, id DESC
"#
    }
}
