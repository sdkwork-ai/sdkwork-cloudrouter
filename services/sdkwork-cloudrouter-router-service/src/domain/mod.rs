mod upstream_auth;

pub use sdkwork_models_catalog_service::domain::ResourceDefinition;
pub use sdkwork_models_catalog_service::domain::{
    ensure_canonical_model_catalog_key, is_model_region_segment, model_catalog_scope_matches_key,
    parse_model_catalog_identity, provider_native_model_id, AccountRateCard, AiModel,
    AiModelPublicMetadata, AiRouteFailureStrategy, AiRouteModelRequirement, AiRouteStrategy,
    BillingMeter, DecimalValue, GatewayAccessPolicy, GatewayApiKey,
    GatewayApiKeyAccountGroupBinding, GatewayRiskRule, IntegrationProviderType,
    ModelCatalogIdentity, ModelMappingBindingType, ModelMappingRule, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide,
    PricingDimensionContext, PricingFormula, PricingFormulaTerm, PricingPlan,
    PricingPolicyRecordIdentity, PricingRateCondition, PricingRateMetadata,
    PricingRateRecordIdentity, PricingRateTier, PricingRateVariant, PricingRule, PricingSchedule,
    PricingWeeklyWindow, ProviderAuthHeader, ProviderAuthProfile, ProviderAuthType,
    ProviderCircuitBreakerPolicy, ProviderRetryPolicy, QuotaPolicy, ResolveModelMappingContext,
    RouteCandidate, RoutingCapability, RoutingFallbackMode, RoutingPolicy, RoutingPolicyScope,
    RoutingRule, ScopedPricingRecordIdentity, UpstreamAccountFallbackMode, UpstreamAccountGroup,
    UpstreamAccountGroupBinding, UpstreamAccountGroupMetricSnapshot, UpstreamAccountRoute,
    UpstreamAccountRoutingStrategy, UpstreamResourceEntitlement,
    DEFAULT_PROVIDER_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    DEFAULT_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_SECONDS, DEFAULT_PROVIDER_RETRY_ATTEMPTS,
    DEFAULT_RETRYABLE_PROVIDER_STATUS_CODES,
};
pub use sdkwork_models_contract_service::{DomainError, DomainResult};
pub use upstream_auth::{
    canonical_upstream_runtime_auth_config, resolve_upstream_runtime_auth_profile,
};

/// True when the optional text is present and non-blank after trimming.
///
/// Shared by routing, pricing, and catalog code; keeps a single definition
/// instead of per-module copies.
pub fn has_text(value: Option<&str>) -> bool {
    value.map(str::trim).is_some_and(|value| !value.is_empty())
}
