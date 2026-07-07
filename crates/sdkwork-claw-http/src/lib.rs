pub mod auth;
pub mod claw_web_resolver;
pub mod contract_routes;
pub mod error;
pub mod headers;
pub mod health;
pub mod metrics;
pub mod readiness;
pub mod router;
pub mod shutdown;
pub mod signing_service;
pub mod tenant_isolation;
pub mod web_bridge;
pub mod web_framework_compat;
pub mod web_security;

pub use auth::{
    app_request_subject_boundary, attach_trusted_request_subject,
    decode_app_session_token_claims_unverified, optional_app_request_subject,
    optional_app_request_subject_boundary, project_trusted_subject_for_legacy_handlers,
    sign_app_session_token, sign_app_session_token_with_claims,
    sign_app_session_token_with_claims_and_secret, sign_app_session_token_with_claims_and_store,
    sign_trusted_request_subject, trusted_request_subject_boundary, verified_app_request_subject,
    verified_signed_trusted_request_subject, verify_app_session_authorization_header,
    verify_app_session_token, verify_app_session_token_claims,
    verify_app_session_token_claims_with_resolver,
    verify_app_session_token_claims_with_signing_secret, ApiKeyCredential, ApiKeyCredentialSource,
    ApiKeyIdentity, ApiKeyIdentityError, AppSessionTokenClaims, AppSessionTokenError,
    AppSessionTokenKind, AppSubjectBoundaryConfig, TrustedRequestSubject,
    TrustedRequestSubjectError, TrustedSubjectBoundaryError,
};
pub use claw_web_resolver::{
    ensure_iam_database_env_for_claw_database, iam_web_resolver_for_claw_database,
    materialize_federated_database_env_from_claw_config,
};
pub use contract_routes::{
    app_openapi_response, backend_openapi_response, cloud_services_openapi_response,
    contract_fallback, gateway_openapi_response, openapi_schema_tabs_response_for_surface,
    paas_openapi_response, payment_aggregate_openapi_response, APP_OPENAPI_PATH,
    BACKEND_OPENAPI_PATH, CLOUD_SERVICES_OPENAPI_PATH, GATEWAY_OPENAPI_PATH,
    OPENAPI_SCHEMA_TABS_PATH, PAAS_OPENAPI_PATH, PAYMENT_AGGREGATE_OPENAPI_PATH,
};
pub use error::{not_implemented_response, NotImplementedData};
pub use headers::{default_security_headers, redact_http_header};
pub use metrics::{metrics, metrics_middleware, record_readiness_check};
pub use readiness::{combine_readiness_checks, ReadinessCheckFn};
pub use router::{
    service_router, service_router_with_contract_routes,
    service_router_with_contract_routes_and_database_config, service_router_with_database_config,
    service_router_with_database_config_and_readiness_check,
    service_router_with_filtered_contract_routes_and_database_config,
    service_router_with_filtered_contract_routes_database_config_and_readiness_check,
    ContractOperationFilter,
};
pub use sdkwork_claw_contract::{ApiSurface, ContractOperation};
pub use sdkwork_iam_web_adapter::TenantSigningKeyResolver;
pub use shutdown::{subscribe_shutdown_signal, wait_for_shutdown_signal};
pub use signing_service::{
    InMemorySigningKeyStore, SessionTokenSigningService, SigningServiceConfig, TokenWithKid,
};
pub use tenant_isolation::{
    ensure_row_tenant_matches, record_tenant_isolation_violation, TenantIsolationViolation,
};
pub use web_bridge::{
    authenticated_principal_failed_trusted_subject_projection,
    inject_legacy_handler_context_from_web_context, trusted_request_subject_from_web_context,
};
pub use web_framework_compat::{
    apply_app_subject_boundary_if_legacy, apply_optional_app_subject_boundary_if_legacy,
    claw_web_framework_enabled_from_env, ensure_production_web_framework_security_policy,
    merge_federated_app_capability_router,
    merge_federated_app_capability_router_with_optional_auth,
    merge_web_framework_scoped_app_read_router, merge_web_framework_scoped_app_router,
    project_trusted_subject_from_web_request_context,
};
pub use web_security::{
    claw_service_security_policy, resolve_claw_web_environment_from_process_env,
};
