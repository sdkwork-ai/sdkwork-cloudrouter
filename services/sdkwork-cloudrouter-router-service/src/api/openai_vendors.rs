//! Cloud Router `GET /v1/vendors` extension of the OpenAI-compatible surface.
//!
//! Unlike the standard `GET /v1/models` (which lists the whole public
//! catalog), this endpoint returns the model providers the authenticated
//! gateway key can actually reach — derived from the key's account group
//! bindings and the callable upstream accounts — together with the models
//! available through each provider. Desktop clients such as Birdcoder use it
//! during deep link imports to write complete channel offerings (vendor +
//! models) without the user picking vendors by hand.

use std::collections::BTreeMap;
use std::sync::Arc;

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_cloudrouter_http::ApiKeyIdentity;

use crate::api::openai_contract::{
    OpenAiModelGroupResponse, OpenAiVendorListResponse, OpenAiVendorModelResponse,
    OpenAiVendorResponse,
};
use crate::api::openai_error::openai_error;
use crate::application::{
    account_route_is_callable_for_group, model_access_forbidden_reason, ApiKeyAuthenticator,
    ApiKeySecretHasher, AuthenticateApiKeyQuery, AuthenticatedApiKeyContext,
};
use crate::ports::{PricingCatalog, UpstreamAccountRouteCatalog};

type OpenAiResponseError = Box<Response>;

/// One vendor plus the models a gateway key can reach through it (pure data,
/// shared by the axum router and the edge synthetic response).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayVendorModels {
    pub code: String,
    pub name: String,
    pub models: Vec<GatewayVendorModel>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayVendorModel {
    pub id: String,
    pub display_name: String,
    pub context_tokens: Option<i64>,
    pub max_output_tokens: Option<i64>,
    /// Account groups that can serve this model.
    pub groups: Vec<GatewayModelGroup>,
}

/// One account group that can serve a model (open-api projection).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayModelGroup {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub is_default: bool,
    pub selected: bool,
}

struct OpenAiVendorsState<C> {
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
}

impl<C> Clone for OpenAiVendorsState<C> {
    fn clone(&self) -> Self {
        Self {
            catalog: Arc::clone(&self.catalog),
            api_key_hasher: Arc::clone(&self.api_key_hasher),
        }
    }
}

pub fn openai_vendors_router<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    Router::new()
        .route("/v1/vendors", get(list_vendors::<C>))
        .with_state(OpenAiVendorsState {
            catalog,
            api_key_hasher,
        })
}

async fn list_vendors<C>(
    State(state): State<OpenAiVendorsState<C>>,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let identity = match ApiKeyIdentity::from_headers_and_uri(&headers, &uri) {
        Ok(identity) => identity,
        Err(error) => {
            return openai_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "invalid_request_error",
                error,
            );
        }
    };
    let context = match authenticate(&state, &identity) {
        Ok(context) => context,
        Err(response) => return *response,
    };
    let context = crate::api::openai_auth_token::apply_api_key_account_group_override(
        state.catalog.as_ref(),
        context,
        headers
            .get(crate::domain::ACCOUNT_GROUP_ROUTING_HEADER)
            .and_then(|value| value.to_str().ok()),
    );

    let data = list_group_scoped_vendors(state.catalog.as_ref(), context.group_id)
        .into_iter()
        .map(|vendor| OpenAiVendorResponse {
            code: vendor.code,
            name: vendor.name,
            models: vendor
                .models
                .into_iter()
                .map(|model| OpenAiVendorModelResponse {
                    id: model.id,
                    display_name: model.display_name,
                    context_tokens: model.context_tokens,
                    max_output_tokens: model.max_output_tokens,
                    groups: model
                        .groups
                        .into_iter()
                        .map(|group| OpenAiModelGroupResponse {
                            id: group.id.to_string(),
                            code: group.code,
                            name: group.name,
                            default_for_model: group.selected,
                        })
                        .collect(),
                })
                .collect(),
        })
        .collect();
    Json(OpenAiVendorListResponse {
        object: "list".to_owned(),
        data,
    })
    .into_response()
}

/// Vendors and their models reachable for the given account group, mirroring
/// the routing path's scope: an upstream account counts when it is bound to
/// the group and callable (base URL + credential, healthy), and a model
/// counts when at least one of its upstream routes lands on such an account.
/// Models are grouped by their catalog vendor code; the vendor name comes
/// from the catalog and falls back to the code itself.
///
/// Each model also carries the account groups that can serve it, so a model
/// picker can show the caller's routable groups without a second round trip.
pub fn list_group_scoped_vendors<C>(catalog: &C, account_group_id: i64) -> Vec<GatewayVendorModels>
where
    C: UpstreamAccountRouteCatalog,
{
    let callable_accounts = catalog
        .list_upstream_account_routes()
        .into_iter()
        .filter(|route| account_route_is_callable_for_group(route, account_group_id))
        .collect::<Vec<_>>();
    // 分组模型黑白名单：禁止的模型不进入可见列表（与路由执行一致，
    // 避免向调用方暴露其分组无权使用的模型）。
    let model_access = catalog.account_group_model_access(account_group_id);
    let scope = catalog
        .list_upstream_account_groups()
        .into_iter()
        .find(|group| group.id == account_group_id)
        .map(|group| (group.tenant_id, group.organization_id))
        .unwrap_or((0, 0));
    let callable_refs = callable_accounts.iter().collect::<Vec<_>>();
    let mut by_vendor: BTreeMap<String, (String, Vec<GatewayVendorModel>)> = BTreeMap::new();
    catalog.visit_models(None, &mut |model| {
        if !crate::application::model_reachable_via_routes(catalog, model, &callable_refs) {
            return true;
        }
        if let Some(access) = model_access.as_ref() {
            if model_access_forbidden_reason(Some(&model.vendor_code), &model.model, access)
                .is_some()
            {
                return true;
            }
        }
        let entry = by_vendor
            .entry(model.vendor_code.clone())
            .or_insert_with(|| {
                let name = catalog
                    .find_vendor(&model.vendor_code)
                    .map(|vendor| vendor.display_name.clone())
                    .unwrap_or_else(|| model.vendor_code.clone());
                (name, Vec::new())
            });
        let groups = crate::application::model_group_options_for_context(
            catalog,
            model,
            scope.0,
            scope.1,
            None,
            Some(account_group_id),
        )
        .into_iter()
        .map(|group| GatewayModelGroup {
            id: group.group_id,
            code: group.group_code,
            name: group.group_name,
            is_default: group.is_default,
            selected: group.selected,
        })
        .collect();
        entry.1.push(GatewayVendorModel {
            id: model.model.clone(),
            display_name: model.display_name.clone(),
            context_tokens: model.context_tokens,
            max_output_tokens: model.max_output_tokens,
            groups,
        });
        true
    });
    by_vendor
        .into_iter()
        .map(|(code, (name, models))| GatewayVendorModels { code, name, models })
        .collect()
}

fn authenticate<C>(
    state: &OpenAiVendorsState<C>,
    identity: &ApiKeyIdentity,
) -> Result<AuthenticatedApiKeyContext, OpenAiResponseError>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let Some(credential_secret) = identity.credential_secret() else {
        return Err(Box::new(openai_error(
            StatusCode::UNAUTHORIZED,
            "invalid_api_key",
            "invalid_request_error",
            "missing api key credential",
        )));
    };
    let authenticator =
        ApiKeyAuthenticator::new(state.catalog.as_ref(), state.api_key_hasher.as_ref());
    authenticator
        .authenticate(AuthenticateApiKeyQuery { credential_secret })
        .map_err(|_| {
            Box::new(openai_error(
                StatusCode::UNAUTHORIZED,
                "invalid_api_key",
                "invalid_request_error",
                "api key credential is invalid",
            ))
        })
}

#[cfg(test)]
mod list_group_scoped_vendors_tests {
    use super::list_group_scoped_vendors;
    use crate::domain::{
        AiModel, DecimalValue, ModelUpstreamRoute, ModelVendor, ModelVendorDefinition,
        UpstreamAccountGroup, UpstreamAccountRoute,
    };
    use crate::infrastructure::InMemoryPricingCatalog;
    use crate::ports::{AccountGroupModelAccess, VendorModelListEntry};

    fn catalog() -> InMemoryPricingCatalog {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_vendor(ModelVendorDefinition::new(
            "openai",
            ModelVendor::OpenAi,
            "OpenAI",
        ));
        catalog.add_model(AiModel::new(
            "gpt-4o-mini",
            "GPT-4o mini",
            "openai",
            vec!["chat"],
        ));
        catalog.add_model(AiModel::new("gpt-4o", "GPT-4o", "openai", vec!["chat"]));
        catalog.add_upstream_account_group(UpstreamAccountGroup::new(
            10,
            "standard-group",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.100000").unwrap(),
        ));
        catalog.add_upstream_account_route(
            UpstreamAccountRoute::new("openai-supplier", 1001)
                .with_account_group_binding(10, 100, 100)
                .with_upstream_endpoint(Some("https://api.openai.com"), Some("cred:openai")),
        );
        for model in ["gpt-4o-mini", "gpt-4o"] {
            catalog.add_model_upstream_route(ModelUpstreamRoute::new(
                model,
                "openai-supplier",
                1001,
                model,
            ));
        }
        catalog
    }

    #[test]
    fn vendors_exclude_blacklisted_models() {
        let mut catalog = catalog();
        catalog.set_account_group_model_access(AccountGroupModelAccess {
            group_id: 10,
            blacklist: vec![VendorModelListEntry {
                vendor_code: "openai".to_owned(),
                models: vec!["gpt-4o-mini".to_owned()],
            }],
            whitelist: Vec::new(),
        });
        let vendors = list_group_scoped_vendors(&catalog, 10);
        assert_eq!(1, vendors.len());
        assert_eq!(
            vec!["gpt-4o"],
            vendors[0]
                .models
                .iter()
                .map(|model| model.id.as_str())
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn vendors_keep_whitelisted_models_only() {
        let mut catalog = catalog();
        catalog.set_account_group_model_access(AccountGroupModelAccess {
            group_id: 10,
            blacklist: Vec::new(),
            whitelist: vec![VendorModelListEntry {
                vendor_code: "openai".to_owned(),
                models: vec!["gpt-4o-mini".to_owned()],
            }],
        });
        let vendors = list_group_scoped_vendors(&catalog, 10);
        assert_eq!(1, vendors.len());
        assert_eq!(
            vec!["gpt-4o-mini"],
            vendors[0]
                .models
                .iter()
                .map(|model| model.id.as_str())
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn vendors_unrestricted_groups_see_all_reachable_models() {
        let vendors = list_group_scoped_vendors(&catalog(), 10);
        assert_eq!(1, vendors.len());
        assert_eq!(2, vendors[0].models.len());
    }
}
