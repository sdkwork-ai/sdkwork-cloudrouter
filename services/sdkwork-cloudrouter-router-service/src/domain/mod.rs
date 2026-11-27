mod account_group_routing;
mod async_usage_task;
mod billing_owner;
mod model_group;
mod model_request_alias;
mod storage_delivery;
mod upstream_account_group_selection;
mod upstream_auth;
mod vendor_code_alias;

pub(crate) use account_group_routing::rule_matches_request;
pub use account_group_routing::{
    account_group_can_serve_modality, normalize_account_group_header,
    select_api_key_account_group_override, select_session_account_group_with_user_routing,
    select_session_account_group_with_user_routing_and_support, session_modality_from_wire,
    AccountGroupRouteScope, SessionAccountGroupRoutingSelection, UserAccountGroupRoute,
    ACCOUNT_GROUP_ROUTING_HEADER, ACCOUNT_GROUP_ROUTING_HEADER_MAX_LEN,
};

pub use async_usage_task::{
    AsyncUsageTask, AsyncUsageTaskKind, AsyncUsageTaskStatus, NewAsyncUsageTask,
};
pub use billing_owner::BillingOwnerKind;
pub use model_group::{
    ModelGroupCatalogModality, ModelGroupCatalogModel, ModelGroupCatalogVendor, ModelGroupOption,
};
// The alias helpers stay crate-internal (`pub(crate)` in their module); the
// re-export must not widen them to the public API.
pub(crate) use model_request_alias::{
    decode_model_path_segment, encode_model_path_segment, model_alias_probes, model_alias_slug,
    model_id_segment, model_matches_alias_probe, model_route_identities, normalize_wire_model_id,
    resolve_provider_model_id, ModelAliasProbe, MODEL_REQUEST_FIELD_NAMES,
};
pub use sdkwork_models_catalog_service::domain::ResourceDefinition;
pub use sdkwork_models_catalog_service::domain::{
    ensure_canonical_model_catalog_key, is_model_region_segment, model_catalog_scope_matches_key,
    parse_model_catalog_identity, parse_request_model_identity, provider_native_model_id,
    AccountRateCard, AiModel, AiModelPublicMetadata, AiRouteFailureStrategy,
    AiRouteModelRequirement, AiRouteStrategy, BillingMeter, DecimalValue, GatewayAccessPolicy,
    GatewayApiKey, GatewayApiKeyAccountGroupBinding, GatewayRiskRule, GroupPriceMode,
    GroupResourcePrice, IntegrationProviderType, ModelCatalogIdentity, ModelMappingBindingType,
    ModelMappingRule, ModelPrice, ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money,
    PriceSide, PricingDimensionContext, PricingFormula, PricingFormulaTerm, PricingPlan,
    PricingPolicyRecordIdentity, PricingRateCondition, PricingRateMetadata,
    PricingRateRecordIdentity, PricingRateTier, PricingRateVariant, PricingRule, PricingSchedule,
    PricingWeeklyWindow, ProviderAuthHeader, ProviderAuthProfile, ProviderAuthType,
    ProviderCircuitBreakerPolicy, ProviderRetryPolicy, QuotaPolicy, ResolveModelMappingContext,
    RouteCandidate, RoutingCapability, ScopedPricingRecordIdentity, UpstreamAccountFallbackMode,
    UpstreamAccountGroup, UpstreamAccountGroupBinding, UpstreamAccountGroupMetricSnapshot,
    UpstreamAccountRoute, UpstreamAccountRoutingStrategy, UpstreamResourceEntitlement,
    DEFAULT_PROVIDER_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    DEFAULT_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_SECONDS, DEFAULT_PROVIDER_RETRY_ATTEMPTS,
    DEFAULT_RETRYABLE_PROVIDER_STATUS_CODES,
};
pub use sdkwork_models_contract_service::{DomainError, DomainResult};
pub use storage_delivery::{
    effective_download_deadline_seconds, resolve_generation_delivery, resolve_vendor_asset_ttl,
    validate_generation_delivery_policy, validate_vendor_asset_ttl, DeliverySubjectScope,
    GenerationDeliveryMode, GenerationDeliveryPolicyRow, GenerationDeliveryScope,
    GenerationMediaKind, ResolvedGenerationDelivery, VendorAssetTtlRow, VendorExpiryAction,
    DEFAULT_DOWNLOAD_DEADLINE_TTL_PERCENT, DEFAULT_VENDOR_ASSET_TTL_SECONDS,
    DELIVERY_MODE_REMOTE_ONLY, DELIVERY_MODE_TO_DRIVE, MEDIA_KIND_ALL, MEDIA_KIND_AUDIO,
    MEDIA_KIND_IMAGE, MEDIA_KIND_VIDEO, SCOPE_ORGANIZATION, SCOPE_TENANT, SCOPE_USER,
    VENDOR_EXPIRY_ACTION_DELETE_REMOTE, VENDOR_EXPIRY_ACTION_FAIL_JOB,
    VENDOR_EXPIRY_ACTION_KEEP_REFERENCE,
};
pub use upstream_account_group_selection::{
    select_default_account_group_for_subject, select_default_session_account_group,
    upstream_account_group_in_subject_scope, AccountGroupModalityScope,
    DefaultAccountGroupSelection, DefaultAccountGroupSelectionReason, SessionAccountGroup,
    SessionAccountGroupModality, DEFAULT_ACCOUNT_GROUP_CODE,
};
pub use upstream_auth::{
    canonical_upstream_runtime_auth_config, resolve_upstream_runtime_auth_profile,
};
pub use vendor_code_alias::catalog_vendor_code;

/// True when the optional text is present and non-blank after trimming.
///
/// Shared by routing, pricing, and catalog code; keeps a single definition
/// instead of per-module copies.
pub fn has_text(value: Option<&str>) -> bool {
    value.map(str::trim).is_some_and(|value| !value.is_empty())
}
