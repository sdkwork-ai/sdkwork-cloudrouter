use super::PricingCatalogSql;

impl PricingCatalogSql {
    pub fn snapshot_load_queries() -> Vec<&'static str> {
        vec![
            Self::load_vendors(),
            Self::load_models(),
            Self::load_upstream_account_routes(),
            Self::load_model_mappings(),
            Self::load_pricing_plans(),
            Self::load_pricing_rules(),
            Self::load_account_rate_cards(),
            Self::load_upstream_account_groups(),
            Self::load_upstream_supplier_model_access(),
            Self::load_upstream_account_model_access(),
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
    COALESCE(usage_scopes::text, '[]') AS usage_scopes_json,
    COALESCE(coding_visible, false) AS coding_visible,
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
        CASE binding.binding_scope
            WHEN 'supplier' THEN 'supplier'
            WHEN 'account_group' THEN 'group'
            WHEN 'account' THEN 'account'
            ELSE 'group'
        END AS binding_kind,
        binding.id AS binding_id,
        binding.tenant_id AS scope_tenant_id,
        binding.organization_id AS scope_organization_id,
        CASE binding.binding_scope
            WHEN 'supplier' THEN binding.supplier_id
            WHEN 'account' THEN binding.account_id
            ELSE binding.account_group_id
        END AS subject_id,
        binding.grant_type,
        binding.resource_id,
        binding.resource_code,
        -- The unified binding row carries only resource_group_code; the numeric
        -- resource_group_id path is a compatibility branch kept for the child-group
        -- expansion below, so its placeholder must be typed BIGINT to compare with
        -- ai_resource_group_item.resource_group_id (bigint). An untyped NULL would
        -- resolve to text and fail with "operator does not exist: bigint = text".
        NULL::BIGINT AS resource_group_id,
        binding.resource_group_code
    FROM ai_resource_binding binding
    WHERE binding.deleted_at IS NULL
      AND binding.status = 1
      AND (binding.tenant_id > 0 OR binding.organization_id = 0)
      AND (binding.effective_from IS NULL OR binding.effective_from <= CURRENT_TIMESTAMP)
      AND (binding.effective_to IS NULL OR binding.effective_to > CURRENT_TIMESTAMP)
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
        resource.route_kind,
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
        route_kind,
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
        route_kind,
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
        COALESCE(NULLIF(gr.route_kind, ''), NULLIF(sr.route_kind, '')) AS route_kind,
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
),
account_resource_scope AS (
    SELECT DISTINCT
        scope_tenant_id AS tenant_id,
        scope_organization_id AS organization_id,
        subject_id AS account_id,
        resource_code,
        resource_type,
        route_kind,
        vendor_code,
        modality_code,
        api_code,
        catalog_key,
        model,
        provider_native_model
    FROM resource_candidate
    WHERE binding_kind = 'account'
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
account_has_resource_scope AS (
    SELECT DISTINCT
        scope_tenant_id AS tenant_id,
        scope_organization_id AS organization_id,
        subject_id AS account_id
    FROM resource_candidate
    WHERE binding_kind = 'account'
      AND candidate_rank = 1
),
effective_matched_resource_scope AS (
    SELECT DISTINCT
        mrs.tenant_id,
        mrs.organization_id,
        mrs.account_group_id,
        mrs.supplier_id,
        member.account_id,
        COALESCE(NULLIF(mrs.resource_code, ''), NULLIF(ars.resource_code, '')) AS resource_code,
        COALESCE(NULLIF(mrs.resource_type, ''), NULLIF(ars.resource_type, '')) AS resource_type,
        COALESCE(NULLIF(mrs.route_kind, ''), NULLIF(ars.route_kind, '')) AS route_kind,
        COALESCE(NULLIF(mrs.vendor_code, ''), NULLIF(ars.vendor_code, '')) AS vendor_code,
        COALESCE(NULLIF(mrs.modality_code, ''), NULLIF(ars.modality_code, '')) AS modality_code,
        COALESCE(NULLIF(mrs.api_code, ''), NULLIF(ars.api_code, '')) AS api_code,
        COALESCE(NULLIF(mrs.catalog_key, ''), NULLIF(ars.catalog_key, '')) AS catalog_key,
        COALESCE(NULLIF(mrs.model, ''), NULLIF(ars.model, '')) AS model,
        COALESCE(NULLIF(mrs.provider_native_model, ''), NULLIF(ars.provider_native_model, '')) AS provider_native_model
    FROM matched_resource_scope mrs
    JOIN ai_upstream_account_group_member member
      ON member.tenant_id = mrs.tenant_id
     AND member.organization_id = mrs.organization_id
     AND member.account_group_id = mrs.account_group_id
     AND member.deleted_at IS NULL
     AND member.status = 1
     AND COALESCE(member.enabled, true)
    JOIN account_has_resource_scope has_scope
      ON has_scope.tenant_id = mrs.tenant_id
     AND has_scope.organization_id = mrs.organization_id
     AND has_scope.account_id = member.account_id
    JOIN account_resource_scope ars
      ON ars.tenant_id = mrs.tenant_id
     AND ars.organization_id = mrs.organization_id
     AND ars.account_id = member.account_id
     AND (
          NULLIF(mrs.resource_code, '') = NULLIF(ars.resource_code, '')
          OR (
              NULLIF(mrs.catalog_key, '') IS NOT NULL
              AND mrs.catalog_key = ars.catalog_key
              AND (NULLIF(mrs.api_code, '') IS NULL OR NULLIF(ars.api_code, '') IS NULL OR mrs.api_code = ars.api_code)
          )
          OR (
              NULLIF(mrs.api_code, '') IS NOT NULL
              AND mrs.api_code = ars.api_code
              AND (mrs.resource_type = 'api_endpoint' OR ars.resource_type = 'api_endpoint')
          )
          OR (
              NULLIF(mrs.vendor_code, '') IS NOT NULL
              AND mrs.vendor_code = ars.vendor_code
              AND (mrs.resource_type = 'vendor' OR ars.resource_type = 'vendor')
          )
          OR (
              NULLIF(mrs.modality_code, '') IS NOT NULL
              AND mrs.modality_code = ars.modality_code
              AND (mrs.resource_type = 'modality' OR ars.resource_type = 'modality')
          )
     )
    UNION ALL
    SELECT DISTINCT
        mrs.tenant_id,
        mrs.organization_id,
        mrs.account_group_id,
        mrs.supplier_id,
        member.account_id,
        mrs.resource_code,
        mrs.resource_type,
        mrs.route_kind,
        mrs.vendor_code,
        mrs.modality_code,
        mrs.api_code,
        mrs.catalog_key,
        mrs.model,
        mrs.provider_native_model
    FROM matched_resource_scope mrs
    JOIN ai_upstream_account_group_member member
      ON member.tenant_id = mrs.tenant_id
     AND member.organization_id = mrs.organization_id
     AND member.account_group_id = mrs.account_group_id
     AND member.deleted_at IS NULL
     AND member.status = 1
     AND COALESCE(member.enabled, true)
    WHERE NOT EXISTS (
        SELECT 1
        FROM account_has_resource_scope has_scope
        WHERE has_scope.tenant_id = mrs.tenant_id
          AND has_scope.organization_id = mrs.organization_id
          AND has_scope.account_id = member.account_id
    )
)
SELECT
    c.tenant_id,
    c.organization_id,
    c.supplier_code,
    c.id AS account_id,
    cc.id AS credential_id,
    COALESCE(NULLIF(c.credential_rotation_strategy, ''), 'default') AS credential_rotation,
    COALESCE(cc.priority, 100) AS credential_priority,
    100 AS credential_weight,
    c.contract_cost_multiplier::text AS contract_cost_multiplier,
    account_health.last_latency_ms,
    account_health.consecutive_error_count AS account_consecutive_error_count,
    NULLIF(c.account_code, '') AS account_code,
    COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code,
    COALESCE(NULLIF(c.billing_mode, ''), 'prepay') AS billing_mode,
    c.supplier_id,
    e.id AS endpoint_id,
    NULLIF(e.endpoint_code, '') AS endpoint_code,
    COALESCE(e.priority, 100) AS endpoint_priority,
    COALESCE(e.routing_weight, 100) AS endpoint_weight,
    CASE
        -- 无端点（仅供应商默认 Base URL）的兜底行视为健康，否则会被 is_account_healthy 剔除
        WHEN e.id IS NULL THEN 1
        -- 无健康记录 = 未知 = 放行（新端点初始化为 0，剔除会导致新建资源无法路由的死锁）
        WHEN endpoint_health.endpoint_id IS NULL THEN 1
        WHEN endpoint_health.health_status IN (0, 1)
          OR (
              endpoint_health.health_status = 2
              AND endpoint_health.updated_at + ($1 * INTERVAL '1 second') <= CURRENT_TIMESTAMP
          )
        THEN 1
        ELSE endpoint_health.health_status
    END AS endpoint_health_status,
    e.base_url,
    c.default_base_url AS account_default_base_url,
    c.protocols::text AS account_protocols_json,
    s.default_base_url AS supplier_default_base_url,
    s.protocols::text AS supplier_protocols_json,
    'managed://upstream-account-credential/' || cc.id::text AS secret_ref,
    cc.secret_ciphertext,
    cc.secret_key_id,
    am.auth_type,
    am.runtime_auth_config::text AS runtime_auth_config_json,
    COALESCE(c.timeout_ms, e.timeout_ms) AS timeout_ms,
    c.retry_policy::text AS retry_policy_json,
    CASE
        -- 无健康记录 = 未知 = 放行（新账号初始化为 0，剔除会导致新建账号无法路由的死锁）
        WHEN account_health.account_id IS NULL THEN 1
        WHEN account_health.health_status IN (0, 1)
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
                        SELECT 1 FROM effective_matched_resource_scope mrs
                        WHERE mrs.tenant_id = b.tenant_id
                          AND mrs.organization_id = b.organization_id
                          AND mrs.account_group_id = b.account_group_id
                          AND mrs.supplier_id = c.supplier_id
                          AND mrs.account_id = c.id
                    )
                         AND EXISTS (
                             SELECT 1 FROM account_has_resource_scope has
                             WHERE has.tenant_id = c.tenant_id
                               AND has.organization_id = c.organization_id
                               AND has.account_id = c.id
                         )
                    THEN jsonb_build_array('__deny__')
                    ELSE COALESCE((
                        SELECT jsonb_agg(scope.value ORDER BY scope.value)
                        FROM (
                            SELECT DISTINCT NULLIF(mrs.api_code, '') AS value
                            FROM effective_matched_resource_scope mrs
                            WHERE mrs.tenant_id = b.tenant_id
                              AND mrs.organization_id = b.organization_id
                              AND mrs.account_group_id = b.account_group_id
                              AND mrs.supplier_id = c.supplier_id
                              AND mrs.account_id = c.id
                              AND NULLIF(mrs.api_code, '') IS NOT NULL
                        ) scope
                    ), '[]'::jsonb)
                END,
                'capabilities', CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM effective_matched_resource_scope mrs
                        WHERE mrs.tenant_id = b.tenant_id
                          AND mrs.organization_id = b.organization_id
                          AND mrs.account_group_id = b.account_group_id
                          AND mrs.supplier_id = c.supplier_id
                          AND mrs.account_id = c.id
                    )
                         AND EXISTS (
                             SELECT 1 FROM account_has_resource_scope has
                             WHERE has.tenant_id = c.tenant_id
                               AND has.organization_id = c.organization_id
                               AND has.account_id = c.id
                         )
                    THEN jsonb_build_array('__deny__')
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
                                FROM effective_matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.account_group_id = b.account_group_id
                                  AND mrs.supplier_id = c.supplier_id
                                  AND mrs.account_id = c.id
                                UNION ALL
                                SELECT NULLIF(mrs.modality_code, '') AS value, 2 AS sort_order
                                FROM effective_matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.account_group_id = b.account_group_id
                                  AND mrs.supplier_id = c.supplier_id
                                  AND mrs.account_id = c.id
                                UNION ALL
                                SELECT NULLIF(mrs.api_code, '') AS value, 3 AS sort_order
                                FROM effective_matched_resource_scope mrs
                                WHERE mrs.tenant_id = b.tenant_id
                                  AND mrs.organization_id = b.organization_id
                                  AND mrs.account_group_id = b.account_group_id
                                  AND mrs.supplier_id = c.supplier_id
                                  AND mrs.account_id = c.id
                            ) capability_values
                            WHERE value IS NOT NULL AND value <> ''
                        ) capability
                    ), '[]'::jsonb)
                END,
                'resourceEntitlements', CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM account_has_resource_scope has
                        WHERE has.tenant_id = c.tenant_id
                          AND has.organization_id = c.organization_id
                          AND has.account_id = c.id
                    ) THEN NULL
                    ELSE COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'resourceCode', resource.resource_code,
                                'resourceType', resource.resource_type,
                                'routeKind', resource.route_kind,
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
                                mrs.route_kind,
                                mrs.vendor_code,
                                mrs.modality_code,
                                mrs.api_code,
                                mrs.catalog_key,
                                mrs.model,
                                mrs.provider_native_model
                            FROM effective_matched_resource_scope mrs
                            WHERE mrs.tenant_id = b.tenant_id
                              AND mrs.organization_id = b.organization_id
                              AND mrs.account_group_id = b.account_group_id
                              AND mrs.supplier_id = c.supplier_id
                              AND mrs.account_id = c.id
                        ) resource
                    ), '[]'::jsonb)
                END
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
LEFT JOIN ai_upstream_supplier_endpoint e
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
  AND NULLIF(cc.secret_ciphertext, '') IS NOT NULL
  -- 可调用判定：端点 URL、供应商默认/协议 URL、账号默认/协议 URL 任一存在即可路由
  -- （账号级配置优先于供应商级配置，见 rows.rs / route_planning 的解析链）
  AND (
        NULLIF(e.base_url, '') IS NOT NULL
        OR NULLIF(s.default_base_url, '') IS NOT NULL
        OR s.protocols <> '[]'::jsonb
        OR NULLIF(c.default_base_url, '') IS NOT NULL
        OR c.protocols <> '[]'::jsonb
  )
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
    plan.id,
    plan.tenant_id,
    plan.organization_id,
    plan.plan_code,
    plan.base_price_side AS base_price_side_code,
    default_rule.multiplier::text AS default_multiplier,
    default_rule.markup_amount::text AS default_markup_amount,
    plan.currency_code AS currency,
    plan.rounding_mode,
    plan.minimum_charge_amount::text AS minimum_charge_amount,
    plan.fallback_policy
FROM cloudrouter_pricing_plan plan
JOIN LATERAL (
    SELECT rule.multiplier, rule.markup_amount
    FROM cloudrouter_pricing_rule rule
    WHERE rule.tenant_id = plan.tenant_id
      AND rule.organization_id = plan.organization_id
      AND rule.pricing_plan_id = plan.id
      AND rule.formula_mode = 'multiplier_markup'
      AND rule.product_code IS NULL
      AND rule.operation_code IS NULL
      AND rule.meter_code IS NULL
      AND rule.provider_code IS NULL
      AND rule.region_code IS NULL
      AND rule.catalog_key IS NULL
      AND rule.status = 1
      AND rule.deleted_at IS NULL
      AND rule.effective_from <= CURRENT_TIMESTAMP
      AND (rule.effective_to IS NULL OR rule.effective_to > CURRENT_TIMESTAMP)
    ORDER BY rule.priority ASC, rule.effective_from DESC, rule.id DESC
    LIMIT 1
) default_rule ON TRUE
WHERE plan.deleted_at IS NULL
  AND plan.status = 1
  AND plan.fallback_policy = 'fail_closed'
  AND plan.effective_from <= CURRENT_TIMESTAMP
  AND (plan.effective_to IS NULL OR plan.effective_to > CURRENT_TIMESTAMP)
ORDER BY plan.effective_from DESC, plan.id DESC
"#
    }

    pub fn load_upstream_account_groups() -> &'static str {
        r#"
SELECT
    account_group.id,
    account_group.tenant_id,
    account_group.organization_id,
    COALESCE(NULLIF(account_group.group_name, ''), account_group.group_code) AS name,
    account_group.group_code AS code,
    COALESCE(account_group.is_default, FALSE) AS is_default,
    selected_plan.pricing_plan_tenant_id,
    selected_plan.pricing_plan_organization_id,
    selected_plan.pricing_plan_id,
    selected_plan.pricing_plan_code,
    account_group.routing_strategy,
    account_group.fallback_mode,
    account_group.priority,
    account_group.cost_multiplier::text AS cost_multiplier,
    account_group.sale_multiplier::text AS sale_multiplier,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object('vendorCode', policy.vendor_code, 'models', model_access_models.model_patterns) ORDER BY policy.priority ASC, policy.id ASC)
        FROM ai_model_access_policy policy
        LEFT JOIN LATERAL (
            SELECT jsonb_agg(model.model_pattern) AS model_patterns
            FROM ai_model_access_policy model
            WHERE model.tenant_id = policy.tenant_id
              AND model.organization_id = policy.organization_id
              AND model.scope_type = policy.scope_type
              AND model.scope_id = policy.scope_id
              AND model.effect = policy.effect
              AND model.vendor_code = policy.vendor_code
              AND model.status = 1 AND model.deleted_at IS NULL
        ) model_access_models ON TRUE
        WHERE policy.tenant_id = account_group.tenant_id
          AND policy.organization_id = account_group.organization_id
          AND policy.scope_type = 'account_group'
          AND policy.scope_id = account_group.id
          AND policy.effect = 'deny'
          AND policy.status = 1 AND policy.deleted_at IS NULL
    ), '[]'::jsonb)::text AS model_blacklist,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object('vendorCode', policy.vendor_code, 'models', model_access_models.model_patterns) ORDER BY policy.priority ASC, policy.id ASC)
        FROM ai_model_access_policy policy
        LEFT JOIN LATERAL (
            SELECT jsonb_agg(model.model_pattern) AS model_patterns
            FROM ai_model_access_policy model
            WHERE model.tenant_id = policy.tenant_id
              AND model.organization_id = policy.organization_id
              AND model.scope_type = policy.scope_type
              AND model.scope_id = policy.scope_id
              AND model.effect = policy.effect
              AND model.vendor_code = policy.vendor_code
              AND model.status = 1 AND model.deleted_at IS NULL
        ) model_access_models ON TRUE
        WHERE policy.tenant_id = account_group.tenant_id
          AND policy.organization_id = account_group.organization_id
          AND policy.scope_type = 'account_group'
          AND policy.scope_id = account_group.id
          AND policy.effect = 'allow'
          AND policy.status = 1 AND policy.deleted_at IS NULL
    ), '[]'::jsonb)::text AS model_whitelist
FROM ai_upstream_account_group account_group
JOIN LATERAL (
    SELECT
        rate_card.pricing_plan_tenant_id,
        rate_card.pricing_plan_organization_id,
        rate_card.pricing_plan_id,
        plan.plan_code AS pricing_plan_code
    FROM cloudrouter_account_rate_card rate_card
    JOIN cloudrouter_pricing_plan plan
      ON plan.tenant_id = rate_card.pricing_plan_tenant_id
     AND plan.organization_id = rate_card.pricing_plan_organization_id
     AND plan.id = rate_card.pricing_plan_id
     AND plan.status = 1
     AND plan.deleted_at IS NULL
     AND plan.effective_from <= CURRENT_TIMESTAMP
     AND (plan.effective_to IS NULL OR plan.effective_to > CURRENT_TIMESTAMP)
    WHERE rate_card.tenant_id = account_group.tenant_id
      AND rate_card.organization_id = account_group.organization_id
      AND rate_card.subject_type = 'account_group'
      AND rate_card.subject_id = account_group.id
      AND rate_card.status = 1
      AND rate_card.deleted_at IS NULL
      AND rate_card.effective_from <= CURRENT_TIMESTAMP
      AND (rate_card.effective_to IS NULL OR rate_card.effective_to > CURRENT_TIMESTAMP)
    ORDER BY rate_card.priority ASC, rate_card.effective_from DESC, rate_card.id DESC
    LIMIT 1
) selected_plan ON TRUE
WHERE account_group.deleted_at IS NULL
  AND account_group.status = 1
ORDER BY account_group.updated_at DESC, account_group.id DESC
"#
    }

    pub fn load_pricing_rules() -> &'static str {
        r#"
SELECT
    rule.id,
    rule.tenant_id,
    rule.organization_id,
    rule.pricing_plan_id,
    plan.plan_code,
    plan.currency_code,
    rule.rule_code,
    rule.product_code,
    rule.operation_code,
    rule.meter_code,
    rule.provider_code,
    rule.region_code,
    rule.catalog_key,
    rule.formula_mode,
    rule.multiplier::text AS multiplier,
    rule.markup_amount::text AS markup_amount,
    rule.unit_price_override::text AS unit_price_override,
    rule.priority,
    rule.effective_from,
    rule.effective_to,
    rule.conditions::text AS conditions_json,
    rule.schedule::text AS schedule_json
FROM cloudrouter_pricing_rule rule
JOIN cloudrouter_pricing_plan plan
  ON plan.tenant_id = rule.tenant_id
 AND plan.organization_id = rule.organization_id
 AND plan.id = rule.pricing_plan_id
WHERE rule.status = 1
  AND rule.deleted_at IS NULL
  AND plan.status = 1
  AND plan.deleted_at IS NULL
  AND plan.fallback_policy = 'fail_closed'
ORDER BY rule.priority ASC, rule.effective_from DESC, rule.id DESC
"#
    }

    pub fn load_account_rate_cards() -> &'static str {
        r#"
SELECT
    card.id,
    card.tenant_id,
    card.organization_id,
    card.subject_type,
    card.subject_id,
    card.subject_code,
    card.pricing_plan_tenant_id,
    card.pricing_plan_organization_id,
    card.pricing_plan_id,
    plan.plan_code AS pricing_plan_code,
    card.id::text AS rate_card_code,
    card.priority,
    card.effective_from,
    card.effective_to
FROM cloudrouter_account_rate_card card
JOIN cloudrouter_pricing_plan plan
  ON plan.tenant_id = card.pricing_plan_tenant_id
 AND plan.organization_id = card.pricing_plan_organization_id
 AND plan.id = card.pricing_plan_id
WHERE card.status = 1
  AND card.deleted_at IS NULL
  AND plan.status = 1
  AND plan.deleted_at IS NULL
ORDER BY card.priority ASC, card.effective_from DESC, card.id DESC
"#
    }

    pub fn load_upstream_supplier_model_access() -> &'static str {
        r#"
SELECT
    supplier.id AS supplier_id,
    supplier.supplier_code,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object('vendorCode', policy.vendor_code, 'models', model_access_models.model_patterns) ORDER BY policy.priority ASC, policy.id ASC)
        FROM ai_model_access_policy policy
        LEFT JOIN LATERAL (
            SELECT jsonb_agg(model.model_pattern) AS model_patterns
            FROM ai_model_access_policy model
            WHERE model.tenant_id = policy.tenant_id
              AND model.organization_id = policy.organization_id
              AND model.scope_type = policy.scope_type
              AND model.scope_id = policy.scope_id
              AND model.effect = policy.effect
              AND model.vendor_code = policy.vendor_code
              AND model.status = 1 AND model.deleted_at IS NULL
        ) model_access_models ON TRUE
        WHERE policy.tenant_id = supplier.tenant_id
          AND policy.organization_id = supplier.organization_id
          AND policy.scope_type = 'supplier'
          AND policy.scope_id = supplier.id
          AND policy.effect = 'deny'
          AND policy.status = 1 AND policy.deleted_at IS NULL
    ), '[]'::jsonb)::text AS model_blacklist,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object('vendorCode', policy.vendor_code, 'models', model_access_models.model_patterns) ORDER BY policy.priority ASC, policy.id ASC)
        FROM ai_model_access_policy policy
        LEFT JOIN LATERAL (
            SELECT jsonb_agg(model.model_pattern) AS model_patterns
            FROM ai_model_access_policy model
            WHERE model.tenant_id = policy.tenant_id
              AND model.organization_id = policy.organization_id
              AND model.scope_type = policy.scope_type
              AND model.scope_id = policy.scope_id
              AND model.effect = policy.effect
              AND model.vendor_code = policy.vendor_code
              AND model.status = 1 AND model.deleted_at IS NULL
        ) model_access_models ON TRUE
        WHERE policy.tenant_id = supplier.tenant_id
          AND policy.organization_id = supplier.organization_id
          AND policy.scope_type = 'supplier'
          AND policy.scope_id = supplier.id
          AND policy.effect = 'allow'
          AND policy.status = 1 AND policy.deleted_at IS NULL
    ), '[]'::jsonb)::text AS model_whitelist
FROM ai_upstream_supplier supplier
WHERE supplier.deleted_at IS NULL
  AND supplier.status = 1
ORDER BY supplier.updated_at DESC, supplier.id DESC
"#
    }

    pub fn load_upstream_account_model_access() -> &'static str {
        r#"
SELECT
    account.id AS account_id,
    account.account_code,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object('vendorCode', policy.vendor_code, 'models', model_access_models.model_patterns) ORDER BY policy.priority ASC, policy.id ASC)
        FROM ai_model_access_policy policy
        LEFT JOIN LATERAL (
            SELECT jsonb_agg(model.model_pattern) AS model_patterns
            FROM ai_model_access_policy model
            WHERE model.tenant_id = policy.tenant_id
              AND model.organization_id = policy.organization_id
              AND model.scope_type = policy.scope_type
              AND model.scope_id = policy.scope_id
              AND model.effect = policy.effect
              AND model.vendor_code = policy.vendor_code
              AND model.status = 1 AND model.deleted_at IS NULL
        ) model_access_models ON TRUE
        WHERE policy.tenant_id = account.tenant_id
          AND policy.organization_id = account.organization_id
          AND policy.scope_type = 'account'
          AND policy.scope_id = account.id
          AND policy.effect = 'deny'
          AND policy.status = 1 AND policy.deleted_at IS NULL
    ), '[]'::jsonb)::text AS model_blacklist,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object('vendorCode', policy.vendor_code, 'models', model_access_models.model_patterns) ORDER BY policy.priority ASC, policy.id ASC)
        FROM ai_model_access_policy policy
        LEFT JOIN LATERAL (
            SELECT jsonb_agg(model.model_pattern) AS model_patterns
            FROM ai_model_access_policy model
            WHERE model.tenant_id = policy.tenant_id
              AND model.organization_id = policy.organization_id
              AND model.scope_type = policy.scope_type
              AND model.scope_id = policy.scope_id
              AND model.effect = policy.effect
              AND model.vendor_code = policy.vendor_code
              AND model.status = 1 AND model.deleted_at IS NULL
        ) model_access_models ON TRUE
        WHERE policy.tenant_id = account.tenant_id
          AND policy.organization_id = account.organization_id
          AND policy.scope_type = 'account'
          AND policy.scope_id = account.id
          AND policy.effect = 'allow'
          AND policy.status = 1 AND policy.deleted_at IS NULL
    ), '[]'::jsonb)::text AS model_whitelist
FROM ai_upstream_account account
WHERE account.deleted_at IS NULL
  AND account.status = 1
ORDER BY account.updated_at DESC, account.id DESC
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
                'pricingPlanCode', COALESCE(selected_plan.plan_code, ''),
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
        LEFT JOIN LATERAL (
            SELECT plan.plan_code
            FROM cloudrouter_account_rate_card rate_card
            JOIN cloudrouter_pricing_plan plan
              ON plan.tenant_id = rate_card.pricing_plan_tenant_id
             AND plan.organization_id = rate_card.pricing_plan_organization_id
             AND plan.id = rate_card.pricing_plan_id
             AND plan.status = 1
             AND plan.deleted_at IS NULL
             AND plan.effective_from <= CURRENT_TIMESTAMP
             AND (plan.effective_to IS NULL OR plan.effective_to > CURRENT_TIMESTAMP)
            WHERE rate_card.tenant_id = g.tenant_id
              AND rate_card.organization_id = g.organization_id
              AND rate_card.subject_type = 'account_group'
              AND rate_card.subject_id = g.id
              AND rate_card.status = 1
              AND rate_card.deleted_at IS NULL
              AND rate_card.effective_from <= CURRENT_TIMESTAMP
              AND (rate_card.effective_to IS NULL OR rate_card.effective_to > CURRENT_TIMESTAMP)
            ORDER BY rate_card.priority ASC, rate_card.effective_from DESC, rate_card.id DESC
            LIMIT 1
        ) selected_plan ON TRUE
    ), '[]') AS account_group_bindings_json,
    COALESCE(name, '') AS name,
    COALESCE(key_prefix, '') AS key_prefix,
    COALESCE(NULLIF(key_display_masked, ''), COALESCE(key_prefix, '') || '********') AS key_display_masked,
    COALESCE(key_hash, '') AS key_hash,
    COALESCE(key_secret_mode, 'plaintext') AS key_secret_mode,
    key_secret_plaintext,
    key_secret_ciphertext,
    key_secret_key_id,
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
    book.tenant_id AS price_book_tenant_id,
    book.organization_id AS price_book_organization_id,
    book.id AS price_book_id,
    rate.id AS rate_id,
    rate.tenant_id,
    rate.organization_id,
    COALESCE(NULLIF(rate.catalog_key, ''), rate.resource_code) AS catalog_key,
    COALESCE(model.model, NULLIF(rate.catalog_key, ''), rate.resource_code) AS model,
    COALESCE(NULLIF(rate.region_code, ''), book.region_code, 'global') AS region_code,
    book.price_side AS price_side_code,
    rate.meter_code AS billing_meter_code,
    rate.unit_size::text AS unit_size,
    rate.unit_price::text AS unit_price,
    rate.currency_code AS currency,
    CASE WHEN book.price_side = 'upstream_cost' THEN NULLIF(rate.provider_code, '') END AS supplier_code,
    CASE WHEN book.price_side = 'upstream_cost' THEN rate.account_id END AS account_id,
    NULL::text AS pricing_plan_code,
    book.price_book_code,
    rate.rate_hash,
    rate.product_code,
    rate.operation_code,
    rate.billability,
    rate.charge_timing,
    rate.calculation_mode,
    rate.quantity_aggregation,
    rate.minimum_quantity::text AS minimum_quantity,
    rate.quantity_step::text AS quantity_step,
    rate.priority,
    rate.rate_variant,
    rate.schedule::text AS schedule_json,
    GREATEST(rate.effective_from, book.effective_from) AS effective_from,
    CASE
      WHEN rate.effective_to IS NULL THEN book.effective_to
      WHEN book.effective_to IS NULL THEN rate.effective_to
      ELSE LEAST(rate.effective_to, book.effective_to)
    END AS effective_to,
    rate.conditions::text AS conditions_json,
    rate.tiers::text AS tiers_json,
    rate.formula::text AS formula_json
FROM pricing_rate rate
JOIN pricing_price_book book
  ON book.tenant_id = rate.tenant_id
 AND book.organization_id = rate.organization_id
 AND book.id = rate.price_book_id
LEFT JOIN ai_model model
  ON model.catalog_key = rate.catalog_key
 AND model.deleted_at IS NULL
 AND model.status = 1
WHERE book.lifecycle_state IN ('active', 'retired')
  AND book.status = 1
  AND book.deleted_at IS NULL
  AND rate.status = 1
  AND rate.deleted_at IS NULL
ORDER BY rate.priority ASC, rate.effective_from DESC, rate.id DESC
"#
    }
}
