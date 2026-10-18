// Two lint families are waived crate-wide, with the reason recorded here so the
// next audit re-checks these specific decisions instead of rediscovering them.
//
// `result_large_err`: the flagged functions return `Result<Response, Response>`,
// which is the axum handler contract. `hyper::Response<Body>` is at least 128
// bytes, so every one of these trips the lint. The value is only ever
// constructed on the error path, and boxing it would change the public handler
// signature of the chat, responses, and embeddings ingress for no runtime
// benefit.
//
// `too_many_arguments`: the flagged functions are route assembly and relay
// dependency injection (`openai_chat_completions_router_with_auth_extensions`,
// `resolve_openai_upstream_route_plan`, `StreamingUsageRecordingBody::new`, the
// route-selection diagnostics builders, and the two admin store query helpers).
// Each parameter is a distinct collaborator — catalog, hasher, relay, recorder,
// plugins, request parts — that the caller supplies separately. Collapsing them
// into a struct would move the assembly into a builder and touch the routing and
// billing hot paths for a lint that measures a count, not a defect.
#![allow(clippy::result_large_err, clippy::too_many_arguments)]

pub mod api;
pub mod application;
pub mod domain;
pub mod identity;
pub mod infrastructure;
pub mod ports;
pub mod redaction;

pub use identity::product_name;

/// Hidden helper for integration tests that must mirror catalog import accepted_count semantics.
#[doc(hidden)]
pub struct CatalogScopeCountSnapshot {
    pub meter_count: i64,
    pub vendor_count: i64,
    pub family_count: i64,
    pub model_count: i64,
    pub capability_count: i64,
    pub price_count: i64,
    pub ranking_count: i64,
    pub voice_count: i64,
    pub voice_binding_count: i64,
    pub video_profile_count: i64,
}

#[doc(hidden)]
pub fn catalog_scope_count_snapshot(
    catalog: &sdkwork_models::ModelCatalog,
) -> CatalogScopeCountSnapshot {
    let counts = infrastructure::sql::model_catalog_import::catalog_scope_counts(catalog);
    CatalogScopeCountSnapshot {
        meter_count: counts.meter_count as i64,
        vendor_count: counts.vendor_count as i64,
        family_count: counts.family_count as i64,
        model_count: counts.model_count as i64,
        capability_count: counts.capability_count as i64,
        price_count: counts.price_count as i64,
        ranking_count: counts.ranking_count as i64,
        voice_count: counts.voice_count as i64,
        voice_binding_count: counts.voice_binding_count as i64,
        video_profile_count: counts.video_profile_count as i64,
    }
}

#[doc(hidden)]
pub fn catalog_accepted_count(catalog: &sdkwork_models::ModelCatalog) -> i64 {
    infrastructure::sql::model_catalog_import::catalog_scope_counts(catalog).accepted_count()
}
