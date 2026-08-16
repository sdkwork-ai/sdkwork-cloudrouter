use std::sync::Arc;

use axum::extract::{Extension, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use sdkwork_utils_rust::PageInfo;
use sdkwork_web_core::WebRequestContext;
use serde::{Deserialize, Serialize};

use crate::api::response::{
    json_success_response, normalize_list_search_query, offset_page_info, parse_offset_list_query,
    problem_from_wire_code_for_context, validation_problem_for_context,
};
use crate::ports::{
    OfficialPricingCatalogQuery, OfficialPricingCatalogReadFuture, OfficialPricingCatalogReadStore,
    OfficialPricingCatalogSnapshot, OfficialPricingGroupFacet, OfficialPricingMeterFacet,
    OfficialPricingRate, OfficialPricingValueFacet,
};

const SUPPORTED_CATEGORIES: [&str; 10] = [
    "all",
    "llm",
    "image",
    "video",
    "audio",
    "music",
    "embedding",
    "sound",
    "api",
    "other",
];
const MAX_FACET_CODE_LENGTH: usize = 160;

#[derive(Clone)]
struct AppPricingState {
    read_store: Arc<dyn OfficialPricingCatalogReadStore + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
struct AppPricingQuery {
    category: Option<String>,
    q: Option<String>,
    vendor_code: Option<String>,
    region_code: Option<String>,
    meter_code: Option<String>,
    currency_code: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppPricingResponse {
    items: Vec<OfficialPricingRate>,
    page_info: PageInfo,
    groups: Vec<OfficialPricingGroupFacet>,
    vendors: Vec<OfficialPricingValueFacet>,
    regions: Vec<OfficialPricingValueFacet>,
    currencies: Vec<OfficialPricingValueFacet>,
    meters: Vec<OfficialPricingMeterFacet>,
}

struct EmptyOfficialPricingCatalogReadStore;

impl OfficialPricingCatalogReadStore for EmptyOfficialPricingCatalogReadStore {
    fn load_official_pricing_catalog<'a>(
        &'a self,
        _query: OfficialPricingCatalogQuery,
    ) -> OfficialPricingCatalogReadFuture<'a> {
        Box::pin(async { Ok(OfficialPricingCatalogSnapshot::default()) })
    }
}

pub fn app_pricing_router() -> Router {
    app_pricing_router_with_read_store(Arc::new(EmptyOfficialPricingCatalogReadStore))
}

pub fn app_pricing_router_with_read_store(
    read_store: Arc<dyn OfficialPricingCatalogReadStore + Send + Sync>,
) -> Router {
    Router::new()
        .route("/app/v3/api/ai/pricing/rates", get(list_pricing_rates))
        .with_state(AppPricingState { read_store })
}

async fn list_pricing_rates(
    State(state): State<AppPricingState>,
    request_context: Option<Extension<WebRequestContext>>,
    Query(query): Query<AppPricingQuery>,
) -> Response {
    let ctx = request_context.map(|context| context.0);
    let (store_query, page_no, page_size) = match validate_query(query) {
        Ok(value) => value,
        Err(message) => {
            return validation_problem_for_context(ctx.as_ref(), message).into_response();
        }
    };

    match state
        .read_store
        .load_official_pricing_catalog(store_query)
        .await
    {
        Ok(snapshot) => json_success_response(
            ctx.as_ref(),
            AppPricingResponse {
                page_info: offset_page_info(page_no, page_size, snapshot.total_items),
                items: snapshot.items,
                groups: snapshot.groups,
                vendors: snapshot.vendors,
                regions: snapshot.regions,
                currencies: snapshot.currencies,
                meters: snapshot.meters,
            },
        ),
        Err(error) => problem_from_wire_code_for_context(
            ctx.as_ref(),
            "5000",
            format!("official pricing catalog is unavailable: {error}"),
        )
        .into_response(),
    }
}

fn validate_query(
    query: AppPricingQuery,
) -> Result<(OfficialPricingCatalogQuery, i64, i64), String> {
    let pagination = parse_offset_list_query(query.page, query.page_size)?;
    let category = query
        .category
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "all".to_owned());
    if !SUPPORTED_CATEGORIES.contains(&category.as_str()) {
        return Err(format!(
            "pricing category must be one of {}",
            SUPPORTED_CATEGORIES.join(", ")
        ));
    }

    Ok((
        OfficialPricingCatalogQuery {
            category,
            search_query: normalize_list_search_query(query.q, "q")?,
            vendor_code: normalize_facet_code(query.vendor_code, "vendor_code")?,
            region_code: normalize_facet_code(query.region_code, "region_code")?,
            meter_code: normalize_facet_code(query.meter_code, "meter_code")?,
            currency_code: normalize_currency_code(query.currency_code)?,
            page_size: pagination.page_size,
            offset: pagination.offset,
        },
        pagination.page_no,
        pagination.page_size,
    ))
}

fn normalize_currency_code(value: Option<String>) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    let normalized = value.to_ascii_uppercase();
    if normalized.len() != 3 || !normalized.chars().all(|character| character.is_ascii_alphabetic()) {
        return Err("pricing currency_code must be an ISO 4217 code".to_owned());
    }
    Ok(Some(normalized))
}

fn normalize_facet_code(value: Option<String>, field: &str) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > MAX_FACET_CODE_LENGTH
        || !value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "._:/-".contains(character))
    {
        return Err(format!("pricing {field} is invalid"));
    }
    Ok(Some(value.to_ascii_lowercase()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pricing_query_accepts_supported_categories_and_offset_pagination() {
        let (query, page, page_size) = validate_query(AppPricingQuery {
            category: Some("Video".to_owned()),
            page: Some(2),
            page_size: Some(25),
            ..AppPricingQuery::default()
        })
        .unwrap();
        assert_eq!("video", query.category);
        assert_eq!(25, query.offset);
        assert_eq!((2, 25), (page, page_size));
    }

    #[test]
    fn pricing_query_rejects_unknown_categories_and_unsafe_facets() {
        assert!(validate_query(AppPricingQuery {
            category: Some("documents".to_owned()),
            ..AppPricingQuery::default()
        })
        .is_err());
        assert!(validate_query(AppPricingQuery {
            vendor_code: Some("vendor code".to_owned()),
            ..AppPricingQuery::default()
        })
        .is_err());
    }

    #[test]
    fn pricing_query_normalizes_currency_codes() {
        let (query, _, _) = validate_query(AppPricingQuery {
            currency_code: Some("cny".to_owned()),
            ..AppPricingQuery::default()
        })
        .unwrap();
        assert_eq!(Some("CNY".to_owned()), query.currency_code);
        assert!(validate_query(AppPricingQuery {
            currency_code: Some("US".to_owned()),
            ..AppPricingQuery::default()
        })
        .is_err());
        assert!(validate_query(AppPricingQuery {
            currency_code: Some("US1".to_owned()),
            ..AppPricingQuery::default()
        })
        .is_err());
    }
}
