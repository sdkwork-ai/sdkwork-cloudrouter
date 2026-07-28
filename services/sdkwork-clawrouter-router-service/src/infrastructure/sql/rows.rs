use crate::domain::{
    ensure_canonical_model_catalog_key, provider_native_model_id, AiModel, AiModelPublicMetadata,
    BillingMeter, DecimalValue, DomainError, DomainResult, GatewayAccessPolicy, GatewayApiKey,
    GatewayApiKeyAccountGroupBinding, GatewayRiskRule, ModelMappingBindingType, ModelMappingRule,
    ModelPrice, ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide,
    PricingPlan, ProviderAuthProfile, ProviderRetryPolicy, QuotaPolicy, RouteCandidate,
    RoutingCapability, RoutingFallbackMode, RoutingPolicy, RoutingPolicyScope, RoutingRule,
    UpstreamAccountGroup, UpstreamAccountGroupBinding, UpstreamAccountGroupMetricSnapshot,
    UpstreamAccountRoute, UpstreamResourceEntitlement,
};

pub struct ModelVendorRow {
    pub vendor_code: String,
    pub display_name: String,
}

impl ModelVendorRow {
    pub fn try_into_domain(self) -> DomainResult<ModelVendorDefinition> {
        Ok(ModelVendorDefinition {
            vendor: ModelVendor::from_code(&self.vendor_code),
            vendor_code: self.vendor_code,
            display_name: self.display_name,
        })
    }
}

pub struct AiModelRow {
    pub catalog_key: String,
    pub model: String,
    pub display_name: String,
    pub vendor_code: String,
    pub capabilities_json: String,
    pub description: Option<String>,
    pub modalities_json: String,
    pub input_modalities_json: String,
    pub output_modalities_json: String,
    pub api_format: Option<String>,
    pub capability_intro: Option<String>,
    pub limitations_json: String,
    pub supported_languages_json: String,
    pub use_cases_json: String,
    pub training_data_cutoff: Option<String>,
    pub context_tokens: Option<i64>,
    pub max_output_tokens: Option<i64>,
    pub supports_streaming: bool,
    pub supports_tools: bool,
    pub supports_json_schema: bool,
    pub release_stage: Option<i32>,
    pub shelf_state: Option<i32>,
    pub routing_state: Option<i32>,
    pub replacement_model: Option<String>,
}

impl AiModelRow {
    pub fn try_into_domain(self) -> DomainResult<AiModel> {
        ensure_base_catalog_key(
            &self.catalog_key,
            "ai_model.catalog_key must use vendor/model identity",
        )?;
        let model = AiModel {
            catalog_key: self.catalog_key,
            model: self.model,
            display_name: self.display_name,
            vendor_code: self.vendor_code,
            capabilities: parse_string_array(&self.capabilities_json, "capabilities")?,
            description: None,
            modalities: Vec::new(),
            input_modalities: Vec::new(),
            output_modalities: Vec::new(),
            api_format: None,
            capability_intro: None,
            limitations: Vec::new(),
            supported_languages: Vec::new(),
            use_cases: Vec::new(),
            training_data_cutoff: None,
            context_tokens: None,
            max_output_tokens: None,
            supports_streaming: false,
            supports_tools: false,
            supports_json_schema: false,
            release_stage: None,
            shelf_state: None,
            routing_state: None,
            replacement_model: None,
        };
        Ok(model.with_public_metadata(AiModelPublicMetadata {
            description: self.description,
            modalities: parse_string_array(&self.modalities_json, "modalities")?,
            input_modalities: parse_string_array(&self.input_modalities_json, "input_modalities")?,
            output_modalities: parse_string_array(
                &self.output_modalities_json,
                "output_modalities",
            )?,
            api_format: self.api_format,
            capability_intro: self.capability_intro,
            limitations: parse_string_array(&self.limitations_json, "limitations")?,
            supported_languages: parse_string_array(
                &self.supported_languages_json,
                "supported_languages",
            )?,
            use_cases: parse_string_array(&self.use_cases_json, "use_cases")?,
            training_data_cutoff: self.training_data_cutoff,
            context_tokens: self.context_tokens,
            max_output_tokens: self.max_output_tokens,
            supports_streaming: self.supports_streaming,
            supports_tools: self.supports_tools,
            supports_json_schema: self.supports_json_schema,
            release_stage: self.release_stage,
            shelf_state: self.shelf_state,
            routing_state: self.routing_state,
            replacement_model: self.replacement_model,
        }))
    }
}

pub struct ModelUpstreamRouteRow {
    pub catalog_key: String,
    pub model: String,
    pub api_code: Option<String>,
    pub region_code: String,
    pub supplier_code: String,
    pub account_id: i64,
    pub credential_id: Option<i64>,
    pub credential_rotation: String,
    pub credential_priority: i32,
    pub credential_weight: i32,
    pub provider_model: String,
    pub base_url: Option<String>,
    pub secret_ref: Option<String>,
    pub auth_type: Option<String>,
    pub auth_config_json: Option<String>,
    pub timeout_ms: Option<i64>,
    pub retry_policy_json: Option<String>,
}

pub struct UpstreamAccountRouteRow {
    pub supplier_code: String,
    pub account_id: i64,
    pub credential_id: Option<i64>,
    pub credential_rotation: String,
    pub credential_priority: i32,
    pub credential_weight: i32,
    pub contract_cost_multiplier: String,
    pub last_latency_ms: Option<i64>,
    pub account_code: Option<String>,
    pub region_code: String,
    pub supplier_id: i64,
    pub endpoint_id: Option<i64>,
    pub endpoint_code: Option<String>,
    pub endpoint_priority: i32,
    pub endpoint_weight: i32,
    pub endpoint_health_status: i32,
    pub base_url: Option<String>,
    pub secret_ref: Option<String>,
    pub secret_ciphertext: Option<String>,
    pub auth_type: Option<String>,
    pub auth_config_json: Option<String>,
    pub timeout_ms: Option<i64>,
    pub retry_policy_json: Option<String>,
    pub account_group_bindings_json: String,
    pub account_health_status: i32,
    pub credential_health_status: i32,
}

pub struct ModelMappingRuleRow {
    pub id: i64,
    pub binding_type: String,
    pub binding_id: Option<i64>,
    pub binding_code: Option<String>,
    pub source_model: String,
    pub source_catalog_key: Option<String>,
    pub target_model: String,
    pub target_catalog_key: Option<String>,
    pub target_vendor_code: Option<String>,
    pub target_provider_model: Option<String>,
    pub target_provider_native_model: Option<String>,
    pub binding_sort_order: i32,
    pub item_sort_order: i32,
}

impl ModelMappingRuleRow {
    pub fn try_into_domain(self) -> DomainResult<ModelMappingRule> {
        if let Some(source_catalog_key) = self.source_catalog_key.as_deref() {
            ensure_base_catalog_key(
                source_catalog_key,
                "ai_model_mapping_rule_item.source_catalog_key must use vendor/model identity",
            )?;
        }
        if let Some(target_catalog_key) = self.target_catalog_key.as_deref() {
            ensure_base_catalog_key(
                target_catalog_key,
                "ai_model_mapping_rule_item.target_catalog_key must use vendor/model identity",
            )?;
        }
        let mut rule = ModelMappingRule::new(
            self.id,
            ModelMappingBindingType::from_str(&self.binding_type)?,
            &self.source_model,
            &self.target_model,
            self.binding_sort_order,
        );
        rule.binding_id = self.binding_id;
        rule.binding_code = self.binding_code.filter(|value| !value.trim().is_empty());
        rule.source_catalog_key = self
            .source_catalog_key
            .filter(|value| !value.trim().is_empty());
        rule.target_catalog_key = self
            .target_catalog_key
            .filter(|value| !value.trim().is_empty());
        rule.target_vendor_code = self
            .target_vendor_code
            .filter(|value| !value.trim().is_empty());
        rule.target_provider_model = self
            .target_provider_model
            .filter(|value| !value.trim().is_empty());
        rule.target_provider_native_model = self
            .target_provider_native_model
            .filter(|value| !value.trim().is_empty());
        rule.item_sort_order = self.item_sort_order;
        Ok(rule)
    }
}

impl UpstreamAccountRouteRow {
    pub fn try_into_domain(self) -> DomainResult<UpstreamAccountRoute> {
        let timeout_ms = parse_timeout_ms(self.timeout_ms)?;
        let retry_policy = parse_retry_policy(self.retry_policy_json)?;
        let auth_profile = ProviderAuthProfile::from_account_config(
            &self.supplier_code,
            self.auth_type.as_deref(),
            self.auth_config_json.as_deref(),
        )?;
        let last_latency_ms = self
            .last_latency_ms
            .map(u64::try_from)
            .transpose()
            .map_err(|error| {
                DomainError::new(format!(
                    "ai_upstream_account.last_latency_ms must be non-negative: {error}"
                ))
            })?;

        Ok(UpstreamAccountRoute {
            supplier_code: self.supplier_code,
            account_id: self.account_id,
            credential_id: self.credential_id.filter(|value| *value > 0),
            credential_rotation: normalized_credential_rotation(self.credential_rotation),
            credential_priority: self.credential_priority,
            credential_weight: self.credential_weight.max(0),
            contract_cost_multiplier: DecimalValue::parse(&self.contract_cost_multiplier)?,
            last_latency_ms,
            account_code: self.account_code.filter(|value| !value.trim().is_empty()),
            region_code: normalized_region_code(self.region_code),
            supplier_id: (self.supplier_id > 0).then_some(self.supplier_id),
            endpoint_id: self.endpoint_id,
            endpoint_code: self.endpoint_code.filter(|value| !value.trim().is_empty()),
            endpoint_priority: self.endpoint_priority.max(0),
            endpoint_weight: self.endpoint_weight.max(0),
            endpoint_health_status: self.endpoint_health_status,
            base_url: self.base_url,
            secret_ref: self.secret_ref,
            auth_profile,
            timeout_ms,
            retry_policy,
            account_group_bindings: parse_provider_upstream_account_group_bindings(
                &self.account_group_bindings_json,
            )?,
            account_health_status: self.account_health_status,
            credential_health_status: self.credential_health_status,
        })
    }
}

impl ModelUpstreamRouteRow {
    pub fn try_into_domain(self) -> DomainResult<ModelUpstreamRoute> {
        ensure_base_catalog_key(
            &self.catalog_key,
            "upstream route catalog_key must use vendor/model identity",
        )?;
        let timeout_ms = parse_timeout_ms(self.timeout_ms)?;
        let retry_policy = parse_retry_policy(self.retry_policy_json)?;
        let auth_profile = ProviderAuthProfile::from_account_config(
            &self.supplier_code,
            self.auth_type.as_deref(),
            self.auth_config_json.as_deref(),
        )?;
        let provider_model =
            normalized_provider_model(&self.catalog_key, &self.model, &self.provider_model);

        Ok(ModelUpstreamRoute {
            catalog_key: self.catalog_key,
            model: self.model,
            api_code: normalized_optional_api_code(self.api_code),
            region_code: normalized_region_code(self.region_code),
            supplier_code: self.supplier_code,
            account_id: self.account_id,
            credential_id: self.credential_id.filter(|value| *value > 0),
            credential_rotation: normalized_credential_rotation(self.credential_rotation),
            credential_priority: self.credential_priority,
            credential_weight: self.credential_weight.max(0),
            provider_model,
            base_url: self.base_url,
            secret_ref: self.secret_ref,
            auth_profile,
            timeout_ms,
            retry_policy,
        })
    }
}

fn normalized_optional_api_code(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn ensure_base_catalog_key(catalog_key: &str, message: &str) -> DomainResult<()> {
    ensure_canonical_model_catalog_key(catalog_key, message)
        .map_err(|_| DomainError::new(format!("{message}: {catalog_key}")))
}

fn normalized_provider_model(catalog_key: &str, model: &str, provider_model: &str) -> String {
    let provider_model = provider_model.trim();
    if !provider_model.is_empty() {
        if is_catalog_model_alias(provider_model, catalog_key, model) {
            return provider_native_model_id(provider_model);
        }
        return provider_model.to_owned();
    }
    let model = model.trim();
    if !model.is_empty() {
        return model.to_owned();
    }
    provider_native_model_id(catalog_key)
}

fn is_catalog_model_alias(provider_model: &str, catalog_key: &str, model: &str) -> bool {
    if provider_model == catalog_key.trim() {
        return true;
    }
    let native_model = provider_native_model_id(provider_model);
    !native_model.is_empty() && native_model == model.trim() && native_model != provider_model
}

fn normalized_credential_rotation(value: String) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "priority" => "priority".to_owned(),
        "round_robin" => "round_robin".to_owned(),
        "weighted_round_robin" => "weighted_round_robin".to_owned(),
        "random" => "random".to_owned(),
        _ => "default".to_owned(),
    }
}

fn parse_timeout_ms(timeout_ms: Option<i64>) -> DomainResult<Option<u64>> {
    match timeout_ms {
        Some(timeout_ms) if timeout_ms <= 0 => Err(DomainError::new(format!(
            "ai_upstream_account.timeout_ms must be positive when configured: {timeout_ms}"
        ))),
        Some(timeout_ms) => Ok(Some(u64::try_from(timeout_ms).map_err(|error| {
            DomainError::new(format!("invalid ai_upstream_account.timeout_ms: {error}"))
        })?)),
        None => Ok(None),
    }
}

fn parse_retry_policy(
    retry_policy_json: Option<String>,
) -> DomainResult<Option<ProviderRetryPolicy>> {
    retry_policy_json
        .filter(|value| !value.trim().is_empty())
        .map(|value| ProviderRetryPolicy::from_json_str(&value))
        .transpose()
}

pub struct RoutingPolicyRow {
    pub id: i64,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub policy_code: String,
    pub policy_scope: i32,
    pub subject_id: Option<i64>,
    pub capability: Option<i32>,
    pub default_profile_id: Option<i64>,
    pub fallback_mode: Option<i32>,
}

impl RoutingPolicyRow {
    pub fn try_into_domain(self) -> DomainResult<RoutingPolicy> {
        Ok(RoutingPolicy {
            id: self.id,
            tenant_id: self.tenant_id,
            organization_id: self.organization_id,
            policy_code: self.policy_code,
            policy_scope: RoutingPolicyScope::from_code(self.policy_scope)?,
            subject_id: self.subject_id,
            capability: self
                .capability
                .map(RoutingCapability::from_code)
                .transpose()?,
            default_profile_id: self.default_profile_id,
            fallback_mode: self
                .fallback_mode
                .map(RoutingFallbackMode::from_code)
                .transpose()?,
        })
    }
}

pub struct RoutingRuleRow {
    pub id: i64,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub profile_id: i64,
    pub rule_code: String,
    pub priority: i32,
    pub match_expression_json: String,
    pub target_model: Option<String>,
    pub candidate_account_groups_json: String,
    pub fallback_chain_json: String,
    pub constraints_json: String,
}

impl RoutingRuleRow {
    pub fn try_into_domain(self) -> DomainResult<RoutingRule> {
        Ok(RoutingRule {
            id: self.id,
            tenant_id: self.tenant_id,
            organization_id: self.organization_id,
            profile_id: self.profile_id,
            rule_code: self.rule_code,
            priority: self.priority,
            match_expression: parse_json_value(
                &self.match_expression_json,
                "ai_routing_rule.match_expression",
            )?,
            target_model: self
                .target_model
                .filter(|target_model| !target_model.trim().is_empty()),
            candidate_account_groups: parse_route_candidates(
                &self.candidate_account_groups_json,
                "ai_routing_rule.candidate_account_groups",
            )?,
            fallback_chain: parse_route_candidates(
                &self.fallback_chain_json,
                "ai_routing_rule.fallback_chain",
            )?,
            constraints: parse_json_value(&self.constraints_json, "ai_routing_rule.constraints")?,
        })
    }
}

pub struct GatewayApiKeyRow {
    pub id: i64,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub group_id: i64,
    pub account_group_bindings_json: String,
    pub name: String,
    pub key_prefix: String,
    pub key_display_masked: String,
    pub key_hash: String,
    pub copyable_key: Option<String>,
    pub policy_id: Option<i64>,
    pub quota_policy_id: Option<i64>,
    pub created_at: String,
    pub expire_at: Option<String>,
    pub status_code: i32,
    pub default_for_runtime: bool,
}

impl GatewayApiKeyRow {
    pub fn into_domain(self) -> GatewayApiKey {
        self.try_into_domain()
            .expect("gateway API key upstream account group bindings must be valid")
    }

    pub fn try_into_domain(self) -> DomainResult<GatewayApiKey> {
        Ok(GatewayApiKey {
            id: self.id,
            tenant_id: self.tenant_id,
            organization_id: self.organization_id,
            user_id: self.user_id,
            default_account_group_id: self.group_id,
            name: self.name,
            key_prefix: self.key_prefix,
            key_display_masked: self.key_display_masked,
            key_hash: self.key_hash,
            copyable_key: self.copyable_key,
            policy_id: self.policy_id,
            quota_policy_id: self.quota_policy_id,
            created_at: self.created_at,
            expire_at: self.expire_at,
            status_code: self.status_code,
            default_for_runtime: self.default_for_runtime,
            account_group_bindings: parse_gateway_api_key_upstream_account_group_bindings(
                &self.account_group_bindings_json,
            )?,
        })
    }

    pub fn with_copyable_key(mut self, copyable_key: Option<String>) -> Self {
        self.copyable_key = copyable_key;
        self
    }
}

fn parse_gateway_api_key_upstream_account_group_bindings(
    value: &str,
) -> DomainResult<Vec<GatewayApiKeyAccountGroupBinding>> {
    let value = parse_json_value(value, "gateway API key upstream account group bindings")?;
    let serde_json::Value::Array(items) = value else {
        return Err(DomainError::new(
            "gateway API key upstream account group bindings must be a JSON array",
        ));
    };

    let mut bindings = items
        .into_iter()
        .enumerate()
        .map(|(index, value)| parse_gateway_api_key_upstream_account_group_binding(value, index))
        .collect::<DomainResult<Vec<_>>>()?;
    bindings.sort_by_key(|binding| {
        (
            binding.priority,
            std::cmp::Reverse(binding.weight),
            binding.account_group_id,
        )
    });
    bindings.dedup_by_key(|binding| binding.account_group_id);
    Ok(bindings)
}

fn parse_gateway_api_key_upstream_account_group_binding(
    value: serde_json::Value,
    index: usize,
) -> DomainResult<GatewayApiKeyAccountGroupBinding> {
    let serde_json::Value::Object(object) = value else {
        return Err(DomainError::new(format!(
            "gateway API key upstream account group bindings[{index}] must be a JSON object"
        )));
    };
    let group_id = object
        .get("groupId")
        .or_else(|| object.get("group_id"))
        .and_then(serde_json::Value::as_i64)
        .ok_or_else(|| {
            DomainError::new(format!(
                "gateway API key upstream account group bindings[{index}] must contain integer groupId"
            ))
        })?;
    if group_id <= 0 {
        return Err(DomainError::new(format!(
            "gateway API key upstream account group bindings[{index}].groupId must be positive"
        )));
    }
    let group_code =
        parse_optional_object_string(&object, "groupCode", "group_code").unwrap_or_default();
    let pricing_plan_code =
        parse_optional_object_string(&object, "pricingPlanCode", "pricing_plan_code")
            .unwrap_or_default();
    let binding_role = parse_optional_object_string(&object, "bindingRole", "binding_role")
        .unwrap_or_else(|| "route".to_owned());
    let routing_strategy =
        parse_optional_object_string(&object, "routingStrategy", "routing_strategy")
            .unwrap_or_else(|| "auto".to_owned());
    let priority = parse_optional_i32(&object, "priority", index)?.unwrap_or(100);
    let weight = parse_optional_i32(&object, "weight", index)?.unwrap_or(100);
    Ok(GatewayApiKeyAccountGroupBinding::new(
        group_id,
        &group_code,
        &pricing_plan_code,
        priority,
        weight,
    )
    .with_binding_role(&binding_role)
    .with_routing_strategy(&routing_strategy))
}

fn parse_optional_object_string(
    object: &serde_json::Map<String, serde_json::Value>,
    camel_key: &str,
    snake_key: &str,
) -> Option<String> {
    object
        .get(camel_key)
        .or_else(|| object.get(snake_key))
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn parse_optional_i32(
    object: &serde_json::Map<String, serde_json::Value>,
    key: &str,
    index: usize,
) -> DomainResult<Option<i32>> {
    object
        .get(key)
        .and_then(serde_json::Value::as_i64)
        .map(i32::try_from)
        .transpose()
        .map_err(|error| {
            DomainError::new(format!(
                "gateway API key upstream account group bindings[{index}].{key} is invalid: {error}"
            ))
        })
}

pub struct UpstreamAccountGroupRow {
    pub id: i64,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub name: String,
    pub code: String,
    pub pricing_plan_code: String,
    pub routing_strategy: String,
    pub fallback_mode: String,
    pub priority: i32,
    pub cost_multiplier: String,
    pub sale_multiplier: String,
}

pub struct GatewayAccessPolicyRow {
    pub id: i64,
    pub allowed_capabilities_json: String,
    pub ip_allowlist_json: String,
}

impl GatewayAccessPolicyRow {
    pub fn try_into_domain(self) -> DomainResult<GatewayAccessPolicy> {
        Ok(GatewayAccessPolicy {
            id: self.id,
            allowed_capabilities: parse_string_array(
                &self.allowed_capabilities_json,
                "allowed_capabilities",
            )?,
            ip_allowlist: parse_string_array(&self.ip_allowlist_json, "ip_allowlist")?,
        })
    }
}

pub struct QuotaPolicyRow {
    pub id: i64,
    pub quota_limit: Option<String>,
    pub requests_per_second: Option<i64>,
    pub requests_per_day: Option<i64>,
    pub burst_limit: Option<String>,
}

impl QuotaPolicyRow {
    pub fn try_into_domain(self) -> DomainResult<QuotaPolicy> {
        Ok(QuotaPolicy {
            id: self.id,
            quota_limit: parse_optional_decimal(self.quota_limit)?,
            requests_per_second: self.requests_per_second,
            requests_per_day: self.requests_per_day,
            burst_limit: parse_optional_decimal(self.burst_limit)?,
        })
    }
}

pub struct GatewayRiskRuleRow {
    pub id: i64,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub rule_category: i32,
    pub rule_type: i32,
    pub scope_type: Option<i32>,
    pub scope_id: Option<i64>,
    pub target_type: i32,
    pub target_value: String,
    pub match_mode: i32,
    pub action: i32,
    pub priority: i32,
    pub requests_per_second: Option<i64>,
    pub requests_per_minute: Option<i64>,
    pub requests_per_day: Option<i64>,
    pub burst_limit: Option<String>,
    pub block_duration_seconds: Option<i64>,
}

impl GatewayRiskRuleRow {
    pub fn try_into_domain(self) -> DomainResult<GatewayRiskRule> {
        Ok(GatewayRiskRule {
            id: self.id,
            tenant_id: self.tenant_id,
            organization_id: self.organization_id,
            rule_category: self.rule_category,
            rule_type: self.rule_type,
            scope_type: self.scope_type,
            scope_id: self.scope_id,
            target_type: self.target_type,
            target_value: self.target_value,
            match_mode: self.match_mode,
            action: self.action,
            priority: self.priority,
            requests_per_second: self.requests_per_second,
            requests_per_minute: self.requests_per_minute,
            requests_per_day: self.requests_per_day,
            burst_limit: parse_optional_decimal(self.burst_limit)?,
            block_duration_seconds: self.block_duration_seconds,
        })
    }
}

pub struct UpstreamAccountGroupMetricSnapshotRow {
    pub group_id: i64,
    pub capacity_used: Option<String>,
    pub capacity_limit: Option<String>,
    pub usage_amount_total: Option<String>,
    pub snapshot_at: Option<String>,
}

impl UpstreamAccountGroupMetricSnapshotRow {
    pub fn try_into_domain(self) -> DomainResult<UpstreamAccountGroupMetricSnapshot> {
        Ok(UpstreamAccountGroupMetricSnapshot {
            account_group_id: self.group_id,
            capacity_used: parse_optional_decimal(self.capacity_used)?,
            capacity_limit: parse_optional_decimal(self.capacity_limit)?,
            usage_amount_total: parse_optional_decimal(self.usage_amount_total)?,
            snapshot_at: self.snapshot_at,
        })
    }
}

impl UpstreamAccountGroupRow {
    pub fn try_into_domain(self) -> DomainResult<UpstreamAccountGroup> {
        Ok(UpstreamAccountGroup {
            id: self.id,
            tenant_id: self.tenant_id,
            organization_id: self.organization_id,
            name: if self.name.trim().is_empty() {
                self.code.clone()
            } else {
                self.name
            },
            code: self.code,
            pricing_plan_code: self.pricing_plan_code,
            routing_strategy: crate::domain::UpstreamAccountRoutingStrategy::from_code(
                &self.routing_strategy,
            )?,
            fallback_mode: crate::domain::UpstreamAccountFallbackMode::from_code(
                &self.fallback_mode,
            )?,
            priority: self.priority.max(0),
            cost_multiplier: DecimalValue::parse(&self.cost_multiplier)?,
            sale_multiplier: DecimalValue::parse(&self.sale_multiplier)?,
        })
    }
}

pub struct PricingPlanRow {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub plan_code: String,
    pub base_price_side_code: String,
    pub default_multiplier: String,
    pub default_markup_amount: String,
    pub currency: String,
}

impl PricingPlanRow {
    pub fn try_into_domain(self) -> DomainResult<PricingPlan> {
        Ok(PricingPlan {
            plan_code: self.plan_code,
            base_price_side: parse_price_side(&self.base_price_side_code)?,
            default_multiplier: DecimalValue::parse(&self.default_multiplier)?,
            default_markup_amount: money_from_decimal(self.currency, self.default_markup_amount)?,
        })
    }
}

pub struct ModelPriceRow {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub catalog_key: String,
    pub model: String,
    pub region_code: String,
    pub price_side_code: String,
    pub billing_meter_code: String,
    pub unit_price: String,
    pub currency: String,
    pub supplier_code: Option<String>,
    pub account_id: Option<i64>,
    pub pricing_plan_code: Option<String>,
}

impl ModelPriceRow {
    pub fn try_into_domain(self) -> DomainResult<ModelPrice> {
        ensure_base_catalog_key(
            &self.catalog_key,
            "ai_model_pricing.catalog_key must use vendor/model identity",
        )?;
        Ok(ModelPrice {
            catalog_key: self.catalog_key,
            model: self.model,
            region_code: normalized_region_code(self.region_code),
            price_side: parse_price_side(&self.price_side_code)?,
            billing_meter: BillingMeter::from_code(&self.billing_meter_code),
            unit_price: money_from_decimal(self.currency, self.unit_price)?,
            supplier_code: self.supplier_code,
            account_id: self.account_id,
            pricing_plan_code: self.pricing_plan_code,
        })
    }
}

fn normalized_region_code(value: String) -> String {
    let value = value.trim();
    if value.is_empty() {
        "global".to_owned()
    } else {
        value.to_owned()
    }
}

fn parse_string_array(value: &str, field_name: &str) -> DomainResult<Vec<String>> {
    serde_json::from_str(value).map_err(|error| {
        DomainError::new(format!(
            "invalid {field_name} json array from database row: {error}"
        ))
    })
}

fn parse_json_value(value: &str, field_name: &str) -> DomainResult<serde_json::Value> {
    serde_json::from_str(value).map_err(|error| {
        DomainError::new(format!(
            "invalid {field_name} json value from database row: {error}"
        ))
    })
}

fn parse_route_candidates(value: &str, field_name: &str) -> DomainResult<Vec<RouteCandidate>> {
    let value = parse_json_value(value, field_name)?;
    let serde_json::Value::Array(items) = value else {
        return Err(DomainError::new(format!(
            "{field_name} must be a json array"
        )));
    };

    items
        .into_iter()
        .enumerate()
        .map(|(index, value)| parse_route_candidate(value, field_name, index))
        .collect()
}

fn parse_provider_upstream_account_group_bindings(
    value: &str,
) -> DomainResult<Vec<UpstreamAccountGroupBinding>> {
    let value = parse_json_value(value, "route candidate group bindings")?;
    let serde_json::Value::Array(items) = value else {
        return Err(DomainError::new(
            "route candidate group bindings must be a json array",
        ));
    };

    items
        .into_iter()
        .enumerate()
        .map(|(index, value)| parse_upstream_account_route_group_binding(value, index))
        .collect()
}

fn parse_upstream_account_route_group_binding(
    value: serde_json::Value,
    index: usize,
) -> DomainResult<UpstreamAccountGroupBinding> {
    let serde_json::Value::Object(object) = value else {
        return Err(DomainError::new(format!(
            "route candidate group bindings[{index}] must be a json object"
        )));
    };
    let account_group_id = object
        .get("accountGroupId")
        .and_then(serde_json::Value::as_i64)
        .ok_or_else(|| {
            DomainError::new(format!(
                "route candidate group bindings[{index}] must contain integer accountGroupId"
            ))
        })?;
    if account_group_id <= 0 {
        return Err(DomainError::new(format!(
            "route candidate group bindings[{index}].accountGroupId must be positive"
        )));
    }
    let priority = object
        .get("priority")
        .and_then(serde_json::Value::as_i64)
        .map(i32::try_from)
        .transpose()
        .map_err(|error| {
            DomainError::new(format!(
                "route candidate group bindings[{index}].priority is invalid: {error}"
            ))
        })?
        .unwrap_or(100);
    let weight = object
        .get("weight")
        .and_then(serde_json::Value::as_i64)
        .map(i32::try_from)
        .transpose()
        .map_err(|error| {
            DomainError::new(format!(
                "route candidate group bindings[{index}].weight is invalid: {error}"
            ))
        })?
        .unwrap_or(100);
    let api_scope = parse_binding_string_array(&object, "apiScope", "api_scope", index)?;
    let capabilities = parse_binding_string_array(&object, "capabilities", "capabilities", index)?;
    let resource_entitlements = parse_resource_entitlements(&object, index)?;
    let cost_multiplier_override = object
        .get("costMultiplierOverride")
        .and_then(serde_json::Value::as_str)
        .map(DecimalValue::parse)
        .transpose()?;
    let mut binding = UpstreamAccountGroupBinding::new_resource_scoped(
        account_group_id,
        priority,
        weight,
        api_scope,
        capabilities,
    )
    .with_cost_multiplier_override(cost_multiplier_override);
    if let Some(resource_entitlements) = resource_entitlements {
        binding = binding.with_resource_entitlements(resource_entitlements);
    }
    Ok(binding)
}

fn parse_resource_entitlements(
    object: &serde_json::Map<String, serde_json::Value>,
    binding_index: usize,
) -> DomainResult<Option<Vec<UpstreamResourceEntitlement>>> {
    let Some(value) = object
        .get("resourceEntitlements")
        .or_else(|| object.get("resource_entitlements"))
    else {
        return Ok(None);
    };
    let serde_json::Value::Array(items) = value else {
        return Err(DomainError::new(format!(
            "route candidate group bindings[{binding_index}].resourceEntitlements must be a json array"
        )));
    };

    items
        .iter()
        .enumerate()
        .map(|(resource_index, value)| {
            let serde_json::Value::Object(resource) = value else {
                return Err(DomainError::new(format!(
                    "route candidate group bindings[{binding_index}].resourceEntitlements[{resource_index}] must be a json object"
                )));
            };
            let required_text = |camel_key: &str, snake_key: &str| {
                resource
                    .get(camel_key)
                    .or_else(|| resource.get(snake_key))
                    .and_then(serde_json::Value::as_str)
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned)
                    .ok_or_else(|| {
                        DomainError::new(format!(
                            "route candidate group bindings[{binding_index}].resourceEntitlements[{resource_index}].{camel_key} is required"
                        ))
                    })
            };
            let optional_text = |camel_key: &str, snake_key: &str| {
                resource
                    .get(camel_key)
                    .or_else(|| resource.get(snake_key))
                    .and_then(serde_json::Value::as_str)
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned)
            };
            let mut entitlement = UpstreamResourceEntitlement::new(
                required_text("resourceCode", "resource_code")?,
                required_text("resourceType", "resource_type")?,
            );
            entitlement.vendor_code = optional_text("vendorCode", "vendor_code");
            entitlement.modality_code = optional_text("modalityCode", "modality_code");
            entitlement.api_code = optional_text("apiCode", "api_code");
            entitlement.catalog_key = optional_text("catalogKey", "catalog_key");
            entitlement.model = optional_text("model", "model");
            entitlement.provider_native_model =
                optional_text("providerNativeModel", "provider_native_model");
            Ok(entitlement)
        })
        .collect::<DomainResult<Vec<_>>>()
        .map(Some)
}

fn parse_binding_string_array(
    object: &serde_json::Map<String, serde_json::Value>,
    camel_key: &str,
    snake_key: &str,
    index: usize,
) -> DomainResult<Vec<String>> {
    let Some(value) = object.get(camel_key).or_else(|| object.get(snake_key)) else {
        return Ok(Vec::new());
    };
    if value.is_null() {
        return Ok(Vec::new());
    }
    let serde_json::Value::Array(items) = value else {
        return Err(DomainError::new(format!(
            "route candidate group bindings[{index}].{camel_key} must be a json array"
        )));
    };
    let mut seen = std::collections::BTreeSet::new();
    let mut normalized = Vec::new();
    for item in items {
        let Some(value) = item.as_str() else {
            return Err(DomainError::new(format!(
                "route candidate group bindings[{index}].{camel_key} must contain only strings"
            )));
        };
        let value = value.trim();
        if value.is_empty() {
            continue;
        }
        if seen.insert(value.to_owned()) {
            normalized.push(value.to_owned());
        }
    }
    Ok(normalized)
}

fn parse_route_candidate(
    value: serde_json::Value,
    field_name: &str,
    index: usize,
) -> DomainResult<RouteCandidate> {
    let serde_json::Value::Object(object) = value else {
        return Err(DomainError::new(format!(
            "{field_name}[{index}] must be a json object"
        )));
    };

    let account_group_id = object
        .get("account_group_id")
        .or_else(|| object.get("accountGroupId"))
        .and_then(serde_json::Value::as_i64)
        .ok_or_else(|| {
            DomainError::new(format!(
                "{field_name}[{index}] must contain integer account_group_id"
            ))
        })?;
    if account_group_id <= 0 {
        return Err(DomainError::new(format!(
            "{field_name}[{index}].account_group_id must be positive"
        )));
    }

    let weight = object
        .get("weight")
        .and_then(serde_json::Value::as_i64)
        .unwrap_or(0);
    if weight < 0 {
        return Err(DomainError::new(format!(
            "{field_name}[{index}].weight must be non-negative"
        )));
    }

    let region_code = object
        .get("region_code")
        .or_else(|| object.get("regionCode"))
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);

    Ok(RouteCandidate {
        account_group_id,
        weight,
        region_code,
    })
}

fn parse_price_side(value: &str) -> DomainResult<PriceSide> {
    match value {
        "official_reference" => Ok(PriceSide::OfficialReference),
        "upstream_cost" => Ok(PriceSide::UpstreamCost),
        "customer_charge" => Ok(PriceSide::CustomerCharge),
        "internal_transfer" => Ok(PriceSide::InternalTransfer),
        _ => Err(DomainError::new(format!(
            "unknown price side code: {value}"
        ))),
    }
}

fn money_from_decimal(currency: String, value: String) -> DomainResult<Money> {
    Ok(Money {
        currency,
        unit_price: DecimalValue::parse(&value)?,
    })
}

fn parse_optional_decimal(value: Option<String>) -> DomainResult<Option<DecimalValue>> {
    value
        .filter(|value| !value.trim().is_empty())
        .map(|value| DecimalValue::parse(&value))
        .transpose()
}
