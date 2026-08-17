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
  AND ($1 IS NULL OR vendor_code = $1)
ORDER BY rank_score DESC, display_name ASC, id ASC
"#
    }

    pub fn list_model_prices() -> &'static str {
        r#"
SELECT
    rate.catalog_key,
    COALESCE(model.model, rate.resource_code) AS model,
    rate.region_code,
    book.price_side AS price_side_code,
    rate.meter_code AS billing_meter_code,
    rate.unit_size::text AS unit_size,
    rate.unit_price::text AS unit_price,
    rate.currency_code AS currency,
    CASE WHEN book.price_side = 'upstream_cost' THEN NULLIF(rate.provider_code, '') END AS supplier_code,
    CASE WHEN book.price_side = 'upstream_cost' THEN rate.account_id END AS account_id,
    NULL::text AS pricing_plan_code
FROM pricing_rate rate
JOIN pricing_price_book book ON book.id = rate.price_book_id
LEFT JOIN ai_model model ON model.catalog_key = rate.catalog_key AND model.deleted_at IS NULL
WHERE rate.deleted_at IS NULL
  AND rate.status = 1
  AND book.deleted_at IS NULL
  AND book.status = 1
  AND book.lifecycle_state = 'active'
  AND rate.catalog_key = $1
  AND book.price_side = CASE $2 WHEN 1 THEN 'official_reference' WHEN 2 THEN 'upstream_cost' WHEN 3 THEN 'customer_charge' WHEN 4 THEN 'internal_transfer' ELSE 'unknown' END
  AND rate.meter_code = $3
  AND rate.effective_from <= CURRENT_TIMESTAMP
  AND (rate.effective_to IS NULL OR rate.effective_to > CURRENT_TIMESTAMP)
ORDER BY rate.priority ASC, rate.effective_from DESC, rate.id DESC
"#
    }

    pub fn find_api_key() -> &'static str {
        r#"
SELECT
    id,
    COALESCE(tenant_id, 0) AS tenant_id,
    COALESCE(organization_id, 0) AS organization_id,
    COALESCE(user_id, 0) AS user_id,
    COALESCE(account_group_id, 0) AS group_id,
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

    pub fn find_upstream_account_group() -> &'static str {
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
    account_group.model_blacklist::text AS model_blacklist,
    account_group.model_whitelist::text AS model_whitelist
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
  AND account_group.id = $1
LIMIT 1
"#
    }

    pub fn find_pricing_plan() -> &'static str {
        r#"
SELECT
    plan.id,
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
  AND plan.plan_code = $1
  AND plan.effective_from <= CURRENT_TIMESTAMP
  AND (plan.effective_to IS NULL OR plan.effective_to > CURRENT_TIMESTAMP)
ORDER BY plan.effective_from DESC, plan.id DESC
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

    pub fn find_model_price() -> &'static str {
        r#"
SELECT
    rate.catalog_key,
    COALESCE(model.model, rate.resource_code) AS model,
    rate.region_code,
    book.price_side AS price_side_code,
    rate.meter_code AS billing_meter_code,
    rate.unit_size::text AS unit_size,
    rate.unit_price::text AS unit_price,
    rate.currency_code AS currency,
    CASE WHEN book.price_side = 'upstream_cost' THEN NULLIF(rate.provider_code, '') END AS supplier_code,
    CASE WHEN book.price_side = 'upstream_cost' THEN rate.account_id END AS account_id,
    NULL::text AS pricing_plan_code
FROM pricing_rate rate
JOIN pricing_price_book book ON book.id = rate.price_book_id
LEFT JOIN ai_model model ON model.catalog_key = rate.catalog_key AND model.deleted_at IS NULL
WHERE rate.deleted_at IS NULL
  AND rate.status = 1
  AND book.deleted_at IS NULL
  AND book.status = 1
  AND book.lifecycle_state = 'active'
  AND rate.catalog_key = $1
  AND book.price_side = CASE $2 WHEN 1 THEN 'official_reference' WHEN 2 THEN 'upstream_cost' WHEN 3 THEN 'customer_charge' WHEN 4 THEN 'internal_transfer' ELSE 'unknown' END
  AND rate.meter_code = $3
  AND (($4 IS NULL AND NULLIF(rate.provider_code, '') IS NULL) OR rate.provider_code = $4)
  AND $5::text IS NULL
  AND rate.effective_from <= CURRENT_TIMESTAMP
  AND (rate.effective_to IS NULL OR rate.effective_to > CURRENT_TIMESTAMP)
ORDER BY rate.priority ASC, rate.effective_from DESC, rate.id DESC
LIMIT 1
"#
    }
}
