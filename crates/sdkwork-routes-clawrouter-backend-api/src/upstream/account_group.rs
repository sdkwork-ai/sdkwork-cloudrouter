use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_clawrouter_router_service::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use sdkwork_clawrouter_router_service::ports::{
    AdminUpstreamAccountGroupItem, AdminUpstreamAccountGroupMemberInput,
    AdminUpstreamAccountGroupMemberItem, AdminUpstreamResourceInput,
    SaveAdminUpstreamAccountGroupCommand,
};
use sdkwork_utils_rust::SdkWorkResultCode;
use serde::{Deserialize, Serialize};

use super::shared::{
    bounded_list_response, collection_item_response, decode_json, decode_query, domain_error,
    idempotency_uuid, item_response, list_query, list_response, no_content_response, not_found,
    optional_text, parse_id, parse_if_match, positive_decimal, problem, requested_at,
    required_text, subject, ListQuery, RequestResult, UpstreamState, MAX_NESTED_ITEMS,
};
use super::supplier::ResourceResponse;

const MAX_CODE_LENGTH: usize = 128;
const MAX_NAME_LENGTH: usize = 200;
const MAX_DESCRIPTION_LENGTH: usize = 4_000;
const ACCOUNT_GROUP_CREATE_IDEMPOTENCY_SCOPE: i64 = 1_000_003;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AccountGroupCreateRequest {
    group_code: String,
    group_name: String,
    description: Option<String>,
    group_type: Option<String>,
    routing_strategy: Option<String>,
    fallback_mode: Option<String>,
    priority: Option<i32>,
    cost_multiplier: Option<String>,
    sale_multiplier: Option<String>,
    environment: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AccountGroupUpdateRequest {
    group_name: Option<String>,
    description: Option<String>,
    group_type: Option<String>,
    routing_strategy: Option<String>,
    fallback_mode: Option<String>,
    priority: Option<i32>,
    cost_multiplier: Option<String>,
    sale_multiplier: Option<String>,
    environment: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MemberReplaceRequest {
    items: Vec<MemberRequestItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MemberRequestItem {
    account_id: String,
    priority: Option<i32>,
    routing_weight: Option<i32>,
    cost_multiplier_override: Option<String>,
    enabled: Option<bool>,
    status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResourceReplaceRequest {
    items: Vec<ResourceRequestItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResourceRequestItem {
    resource_code: Option<String>,
    resource_group_code: Option<String>,
    grant_type: Option<String>,
    priority: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AccountGroupResponse {
    id: String,
    uuid: String,
    group_code: String,
    group_name: String,
    description: Option<String>,
    group_type: String,
    routing_strategy: String,
    fallback_mode: String,
    priority: i32,
    cost_multiplier: String,
    sale_multiplier: String,
    environment: Option<i32>,
    status: i32,
    version: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MemberResponse {
    id: String,
    account_id: String,
    account_code: String,
    account_name: String,
    priority: i32,
    routing_weight: i32,
    cost_multiplier_override: Option<String>,
    enabled: bool,
    status: i32,
}

pub(super) fn routes() -> Router<UpstreamState> {
    Router::new()
        .route(
            "/backend/v3/api/ai/upstream_account_groups",
            get(list_groups).post(create_group),
        )
        .route(
            "/backend/v3/api/ai/upstream_account_groups/{accountGroupId}",
            get(get_group).patch(update_group).delete(delete_group),
        )
        .route(
            "/backend/v3/api/ai/upstream_account_groups/{accountGroupId}/members",
            get(list_members).put(replace_members),
        )
        .route(
            "/backend/v3/api/ai/upstream_account_groups/{accountGroupId}/resources",
            get(list_resources).put(replace_resources),
        )
}

async fn list_groups(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    query: Result<Query<ListQuery>, QueryRejection>,
) -> Response {
    let query = match decode_query(query).and_then(|query| list_query(subject(scoped), query)) {
        Ok(query) => query,
        Err(response) => return response.into_response(),
    };
    match state.store.list_account_groups(query).await {
        Ok(page) => list_response(
            sdkwork_clawrouter_router_service::ports::AdminUpstreamPage {
                items: page
                    .items
                    .into_iter()
                    .map(AccountGroupResponse::from)
                    .collect(),
                page: page.page,
                page_size: page.page_size,
                total: page.total,
            },
        ),
        Err(error) => domain_error(error),
    }
}

async fn get_group(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(group_id): Path<String>,
) -> Response {
    let group_id = match parse_id(group_id, "accountGroupId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .get_account_group(subject(scoped), group_id)
        .await
    {
        Ok(Some(item)) => item_response(StatusCode::OK, AccountGroupResponse::from(item)),
        Ok(None) => not_found("upstream account group"),
        Err(error) => domain_error(error),
    }
}

async fn create_group(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    headers: HeaderMap,
    payload: Result<Json<AccountGroupCreateRequest>, JsonRejection>,
) -> Response {
    let scoped = subject(scoped);
    let uuid = match idempotency_uuid(&headers, &scoped, ACCOUNT_GROUP_CREATE_IDEMPOTENCY_SCOPE) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let payload = match decode_json(payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let command = match create_command(scoped, uuid, payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state.store.save_account_group(command).await {
        Ok(item) => item_response(StatusCode::CREATED, AccountGroupResponse::from(item)),
        Err(error) => domain_error(error),
    }
}

async fn update_group(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(group_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<AccountGroupUpdateRequest>, JsonRejection>,
) -> Response {
    let group_id = match parse_id(group_id, "accountGroupId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let payload = match decode_json(payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let scoped = subject(scoped);
    let existing = match state
        .store
        .get_account_group(scoped.clone(), group_id)
        .await
    {
        Ok(Some(item)) => item,
        Ok(None) => return not_found("upstream account group"),
        Err(error) => return domain_error(error),
    };
    let command = match update_command(scoped, existing, expected_version, payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state.store.save_account_group(command).await {
        Ok(item) => item_response(StatusCode::OK, AccountGroupResponse::from(item)),
        Err(error) => domain_error(error),
    }
}

async fn delete_group(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(group_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let group_id = match parse_id(group_id, "accountGroupId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .delete_account_group(subject(scoped), group_id, expected_version, requested_at())
        .await
    {
        Ok(true) => no_content_response(),
        Ok(false) => not_found("upstream account group"),
        Err(error) => domain_error(error),
    }
}

async fn list_members(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(group_id): Path<String>,
) -> Response {
    let group_id = match parse_id(group_id, "accountGroupId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .list_account_group_members(subject(scoped), group_id)
        .await
    {
        Ok(items) => bounded_list_response(items.into_iter().map(MemberResponse::from).collect()),
        Err(error) => domain_error(error),
    }
}

async fn replace_members(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(group_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<MemberReplaceRequest>, JsonRejection>,
) -> Response {
    let group_id = match parse_id(group_id, "accountGroupId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let items = match decode_json(payload).and_then(member_inputs) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .replace_account_group_members(
            subject(scoped),
            group_id,
            expected_version,
            items,
            requested_at(),
        )
        .await
    {
        Ok(items) => {
            collection_item_response(items.into_iter().map(MemberResponse::from).collect())
        }
        Err(error) => domain_error(error),
    }
}

async fn list_resources(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(group_id): Path<String>,
) -> Response {
    let group_id = match parse_id(group_id, "accountGroupId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .list_account_group_resources(subject(scoped), group_id)
        .await
    {
        Ok(items) => bounded_list_response(items.into_iter().map(ResourceResponse::from).collect()),
        Err(error) => domain_error(error),
    }
}

async fn replace_resources(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(group_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<ResourceReplaceRequest>, JsonRejection>,
) -> Response {
    let group_id = match parse_id(group_id, "accountGroupId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let items = match decode_json(payload).and_then(resource_inputs) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .replace_account_group_resources(
            subject(scoped),
            group_id,
            expected_version,
            items,
            requested_at(),
        )
        .await
    {
        Ok(items) => {
            collection_item_response(items.into_iter().map(ResourceResponse::from).collect())
        }
        Err(error) => domain_error(error),
    }
}

fn create_command(
    subject: sdkwork_clawrouter_router_service::ports::AdminUpstreamSubject,
    uuid: String,
    request: AccountGroupCreateRequest,
) -> RequestResult<SaveAdminUpstreamAccountGroupCommand> {
    Ok(SaveAdminUpstreamAccountGroupCommand {
        subject,
        account_group_id: None,
        expected_version: None,
        uuid,
        group_code: required_text(request.group_code, "groupCode", MAX_CODE_LENGTH)?,
        group_name: required_text(request.group_name, "groupName", MAX_NAME_LENGTH)?,
        description: optional_text(request.description, "description", MAX_DESCRIPTION_LENGTH)?,
        group_type: group_type(request.group_type.unwrap_or_else(|| "shared".to_owned()))?,
        routing_strategy: routing_strategy(
            request
                .routing_strategy
                .unwrap_or_else(|| "weighted".to_owned()),
        )?,
        fallback_mode: fallback_mode(
            request
                .fallback_mode
                .unwrap_or_else(|| "sequential".to_owned()),
        )?,
        priority: non_negative(request.priority.unwrap_or(100), "priority")?,
        cost_multiplier: positive_decimal(
            request.cost_multiplier.unwrap_or_else(|| "1".to_owned()),
            "costMultiplier",
        )?,
        sale_multiplier: positive_decimal(
            request.sale_multiplier.unwrap_or_else(|| "1".to_owned()),
            "saleMultiplier",
        )?,
        environment: request.environment,
        status: status(request.status.unwrap_or(1))?,
        requested_at: requested_at(),
    })
}

fn update_command(
    subject: sdkwork_clawrouter_router_service::ports::AdminUpstreamSubject,
    existing: AdminUpstreamAccountGroupItem,
    expected_version: i64,
    request: AccountGroupUpdateRequest,
) -> RequestResult<SaveAdminUpstreamAccountGroupCommand> {
    Ok(SaveAdminUpstreamAccountGroupCommand {
        subject,
        account_group_id: Some(existing.id),
        expected_version: Some(expected_version),
        uuid: existing.uuid,
        group_code: existing.group_code,
        group_name: request
            .group_name
            .map(|value| required_text(value, "groupName", MAX_NAME_LENGTH))
            .transpose()?
            .unwrap_or(existing.group_name),
        description: match request.description {
            Some(value) => optional_text(Some(value), "description", MAX_DESCRIPTION_LENGTH)?,
            None => existing.description,
        },
        group_type: request
            .group_type
            .map(group_type)
            .transpose()?
            .unwrap_or(existing.group_type),
        routing_strategy: request
            .routing_strategy
            .map(routing_strategy)
            .transpose()?
            .unwrap_or(existing.routing_strategy),
        fallback_mode: request
            .fallback_mode
            .map(fallback_mode)
            .transpose()?
            .unwrap_or(existing.fallback_mode),
        priority: non_negative(request.priority.unwrap_or(existing.priority), "priority")?,
        cost_multiplier: request
            .cost_multiplier
            .map(|value| positive_decimal(value, "costMultiplier"))
            .transpose()?
            .unwrap_or(existing.cost_multiplier),
        sale_multiplier: request
            .sale_multiplier
            .map(|value| positive_decimal(value, "saleMultiplier"))
            .transpose()?
            .unwrap_or(existing.sale_multiplier),
        environment: request.environment.or(existing.environment),
        status: status(request.status.unwrap_or(existing.status))?,
        requested_at: requested_at(),
    })
}

fn member_inputs(
    request: MemberReplaceRequest,
) -> RequestResult<Vec<AdminUpstreamAccountGroupMemberInput>> {
    ensure_count(request.items.len(), "members")?;
    request
        .items
        .into_iter()
        .map(|item| {
            Ok(AdminUpstreamAccountGroupMemberInput {
                account_id: parse_id(item.account_id, "accountId")?,
                priority: non_negative(item.priority.unwrap_or(100), "priority")?,
                routing_weight: non_negative(item.routing_weight.unwrap_or(100), "routingWeight")?,
                cost_multiplier_override: item
                    .cost_multiplier_override
                    .map(|value| positive_decimal(value, "costMultiplierOverride"))
                    .transpose()?,
                enabled: item.enabled.unwrap_or(true),
                status: status(item.status.unwrap_or(1))?,
            })
        })
        .collect()
}

fn resource_inputs(
    request: ResourceReplaceRequest,
) -> RequestResult<Vec<AdminUpstreamResourceInput>> {
    ensure_count(request.items.len(), "resources")?;
    request
        .items
        .into_iter()
        .map(|item| {
            let resource_code = optional_text(item.resource_code, "resourceCode", MAX_CODE_LENGTH)?
                .unwrap_or_default();
            let resource_group_code = optional_text(
                item.resource_group_code,
                "resourceGroupCode",
                MAX_CODE_LENGTH,
            )?
            .unwrap_or_default();
            if resource_code.is_empty() == resource_group_code.is_empty() {
                return Err(problem(
                    SdkWorkResultCode::InvalidParameter,
                    "exactly one of resourceCode or resourceGroupCode is required",
                ));
            }
            let grant_type = item.grant_type.unwrap_or_else(|| "allow".to_owned());
            if !matches!(grant_type.as_str(), "allow" | "deny") {
                return Err(problem(
                    SdkWorkResultCode::InvalidParameter,
                    "grantType must be allow or deny",
                ));
            }
            Ok(AdminUpstreamResourceInput {
                resource_code,
                resource_group_code,
                grant_type,
                priority: non_negative(item.priority.unwrap_or(0), "priority")?,
                status: status(item.status.unwrap_or(1))?,
            })
        })
        .collect()
}

fn group_type(value: String) -> RequestResult<String> {
    let value = required_text(value, "groupType", 32)?;
    if !matches!(value.as_str(), "shared" | "dedicated") {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "groupType must be shared or dedicated",
        ));
    }
    Ok(value)
}

fn routing_strategy(value: String) -> RequestResult<String> {
    let value = required_text(value, "routingStrategy", 32)?;
    if !matches!(
        value.as_str(),
        "weighted" | "round_robin" | "least_latency" | "least_cost" | "failover"
    ) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "routingStrategy is not supported",
        ));
    }
    Ok(value)
}

fn fallback_mode(value: String) -> RequestResult<String> {
    let value = required_text(value, "fallbackMode", 32)?;
    if !matches!(
        value.as_str(),
        "none" | "sequential" | "same_supplier" | "cross_supplier"
    ) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "fallbackMode is not supported",
        ));
    }
    Ok(value)
}

fn status(value: i32) -> RequestResult<i32> {
    if !matches!(value, 0 | 1) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "status must be 0 or 1",
        ));
    }
    Ok(value)
}

fn non_negative(value: i32, field: &str) -> RequestResult<i32> {
    if value < 0 {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be non-negative"),
        ));
    }
    Ok(value)
}

fn ensure_count(count: usize, field: &str) -> RequestResult<()> {
    if count > MAX_NESTED_ITEMS {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must contain at most {MAX_NESTED_ITEMS} items"),
        ));
    }
    Ok(())
}

impl From<AdminUpstreamAccountGroupItem> for AccountGroupResponse {
    fn from(item: AdminUpstreamAccountGroupItem) -> Self {
        Self {
            id: item.id.to_string(),
            uuid: item.uuid,
            group_code: item.group_code,
            group_name: item.group_name,
            description: item.description,
            group_type: item.group_type,
            routing_strategy: item.routing_strategy,
            fallback_mode: item.fallback_mode,
            priority: item.priority,
            cost_multiplier: item.cost_multiplier,
            sale_multiplier: item.sale_multiplier,
            environment: item.environment,
            status: item.status,
            version: item.version.to_string(),
            updated_at: item.updated_at,
        }
    }
}

impl From<AdminUpstreamAccountGroupMemberItem> for MemberResponse {
    fn from(item: AdminUpstreamAccountGroupMemberItem) -> Self {
        Self {
            id: item.id.to_string(),
            account_id: item.account_id.to_string(),
            account_code: item.account_code,
            account_name: item.account_name,
            priority: item.priority,
            routing_weight: item.routing_weight,
            cost_multiplier_override: item.cost_multiplier_override,
            enabled: item.enabled,
            status: item.status,
        }
    }
}
