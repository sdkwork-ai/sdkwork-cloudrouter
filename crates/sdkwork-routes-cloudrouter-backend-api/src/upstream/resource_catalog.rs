use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use sdkwork_cloudrouter_router_service::api::admin_sql_subject::{
    RequiredAdminSqlScopedSubject, SqlScopedAdminSubject,
};
use sdkwork_models_contract_service::{
    AdminAiResourceSubject, ListAdminAiResourceGroupsQuery, ListAdminAiResourcesQuery,
};
use sdkwork_utils_rust::SdkWorkResultCode;
use serde::Serialize;

use super::shared::{domain_error, problem, success_response, UpstreamState};

const CATALOG_LIMIT: i64 = 200;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResourceCatalogResponse {
    resources: Vec<ResourceCatalogItem>,
    resource_groups: Vec<ResourceGroupCatalogItem>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResourceCatalogItem {
    resource_code: String,
    resource_type: String,
    display_name: String,
    vendor_code: Option<String>,
    modality_code: Option<String>,
    api_endpoint_code: Option<String>,
    capability: Option<String>,
    capabilities: Vec<String>,
    sort_order: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResourceGroupCatalogItem {
    group_code: String,
    group_name: String,
    group_type: String,
    selection_mode: String,
    description: Option<String>,
    vendor_codes: Vec<String>,
    capabilities: Vec<String>,
    resource_count: i64,
    sort_order: Option<i64>,
}

pub(super) fn routes() -> Router<UpstreamState> {
    Router::new().route(
        "/backend/v3/api/ai/upstream_resource_catalog",
        get(resource_catalog),
    )
}

async fn resource_catalog(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
) -> Response {
    let store = match &state.resource_store {
        Some(store) => store.clone(),
        None => {
            return problem(
                SdkWorkResultCode::UnprocessableEntity,
                "resource catalog is not available for this deployment",
            )
            .into_response()
        }
    };
    let subject = resource_subject(scoped);
    let resources = match store
        .list_ai_resources(ListAdminAiResourcesQuery {
            subject: subject.clone(),
            q: None,
            resource_type: None,
            status: Some("active".to_owned()),
            access_channel_kind: None,
            vendor_code: None,
            agent_provider_id: None,
            require_valid_access_channel_metadata: false,
            limit: Some(CATALOG_LIMIT),
            offset: None,
        })
        .await
    {
        Ok(page) => page.items,
        Err(error) => return domain_error(error),
    };
    let resource_groups = match store
        .list_ai_resource_groups(ListAdminAiResourceGroupsQuery {
            subject,
            q: None,
            limit: Some(CATALOG_LIMIT),
            offset: None,
        })
        .await
    {
        Ok(page) => page.items,
        Err(error) => return domain_error(error),
    };
    success_response(
        axum::http::StatusCode::OK,
        ResourceCatalogResponse {
            resources: resources.into_iter().map(ResourceCatalogItem::from).collect(),
            resource_groups: resource_groups
                .into_iter()
                .map(ResourceGroupCatalogItem::from)
                .collect(),
        },
    )
}

fn resource_subject(scoped: SqlScopedAdminSubject) -> AdminAiResourceSubject {
    AdminAiResourceSubject {
        tenant_id: scoped.tenant_id,
        organization_id: scoped.organization_id,
        operator_id: scoped.operator_id,
        operator_type: scoped.operator_type,
    }
}

impl From<sdkwork_models_contract_service::AdminAiResourceItem> for ResourceCatalogItem {
    fn from(item: sdkwork_models_contract_service::AdminAiResourceItem) -> Self {
        Self {
            resource_code: item.resource_code,
            resource_type: item.resource_type,
            display_name: item.display_name,
            vendor_code: item.vendor_code,
            modality_code: item.modality_code,
            api_endpoint_code: item.api_endpoint_code,
            capability: item.capability,
            capabilities: item.capabilities,
            sort_order: item.sort_order,
        }
    }
}

impl From<sdkwork_models_contract_service::AdminAiResourceGroupItem> for ResourceGroupCatalogItem {
    fn from(item: sdkwork_models_contract_service::AdminAiResourceGroupItem) -> Self {
        Self {
            group_code: item.group_code,
            group_name: item.group_name,
            group_type: item.group_type,
            selection_mode: item.selection_mode,
            description: item.description,
            vendor_codes: item.vendor_codes,
            capabilities: item.capabilities,
            resource_count: item.resource_count,
            sort_order: item.sort_order,
        }
    }
}
