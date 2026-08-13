use std::collections::HashSet;

use sqlx::postgres::PgRow;
use sqlx::{Decode, Postgres, Row, Type};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::routing_config_change::{
    record_postgres_ai_routing_config_change, AiRoutingConfigChange,
};
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminUpstreamModelListEntry, AdminUpstreamResourceInput, AdminUpstreamResourceItem,
    AdminUpstreamSubject,
};

pub(super) const DEFAULT_DATA_SCOPE: i32 = 1;
pub(super) const MAX_NESTED_ITEMS: usize = 200;

/** 模型黑白名单条目 → JSONB 字符串（结构与账号分组一致：{vendorCode, models}） */
pub(super) fn model_list_json(entries: &[AdminUpstreamModelListEntry]) -> String {
    serde_json::to_string(
        &entries
            .iter()
            .map(|entry| {
                serde_json::json!({
                    "vendorCode": entry.vendor_code,
                    "models": entry.models,
                })
            })
            .collect::<Vec<_>>(),
    )
    .unwrap_or_else(|_| "[]".to_owned())
}

pub(super) fn parse_model_list(
    context: &str,
    value: String,
) -> DomainResult<Vec<AdminUpstreamModelListEntry>> {
    let items = serde_json::from_str::<Vec<serde_json::Value>>(&value).map_err(|error| {
        DomainError::new(format!("failed to parse {context} model list: {error}"))
    })?;
    Ok(items
        .into_iter()
        .filter_map(|item| {
            let vendor_code = item.get("vendorCode")?.as_str()?.trim();
            if vendor_code.is_empty() {
                return None;
            }
            let models = item
                .get("models")
                .and_then(|models| models.as_array())
                .map(|models| {
                    models
                        .iter()
                        .filter_map(|model| model.as_str())
                        .map(str::trim)
                        .filter(|model| !model.is_empty())
                        .map(ToOwned::to_owned)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            Some(AdminUpstreamModelListEntry {
                vendor_code: vendor_code.to_owned(),
                models,
            })
        })
        .collect())
}

pub(super) fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}

pub(super) fn column<T>(row: &PgRow, name: &str, context: &str) -> DomainResult<T>
where
    for<'row> T: Decode<'row, Postgres> + Type<Postgres>,
{
    row.try_get(name)
        .map_err(|error| store_error(context, error))
}

pub(super) fn conflict(message: impl Into<String>) -> DomainError {
    DomainError::conflict(message)
}

pub(super) fn not_found(entity: &str) -> DomainError {
    DomainError::not_found(format!(
        "{entity} was not found in the active organization scope"
    ))
}

pub(super) fn search_pattern(q: Option<&str>) -> Option<String> {
    q.map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| {
            let mut escaped = String::with_capacity(value.len() + 2);
            escaped.push('%');
            for character in value.chars() {
                if matches!(character, '%' | '_' | '\\') {
                    escaped.push('\\');
                }
                escaped.push(character);
            }
            escaped.push('%');
            escaped
        })
}

pub(super) fn ensure_bounded_collection<T>(items: &[T], name: &str) -> DomainResult<()> {
    if items.len() > MAX_NESTED_ITEMS {
        return Err(DomainError::new(format!(
            "{name} must contain at most {MAX_NESTED_ITEMS} items"
        )));
    }
    Ok(())
}

pub(super) fn validate_resource_inputs(items: &[AdminUpstreamResourceInput]) -> DomainResult<()> {
    ensure_bounded_collection(items, "resources")?;
    let mut keys = HashSet::with_capacity(items.len());
    for item in items {
        let resource_code = item.resource_code.trim();
        let resource_group_code = item.resource_group_code.trim();
        if resource_code.is_empty() == resource_group_code.is_empty() {
            return Err(DomainError::new(
                "exactly one of resourceCode or resourceGroupCode is required",
            ));
        }
        if !matches!(item.grant_type.as_str(), "allow" | "deny") {
            return Err(DomainError::new("grantType must be allow or deny"));
        }
        if item.priority < 0 {
            return Err(DomainError::new("resource priority must be non-negative"));
        }
        let key = (resource_code.to_owned(), resource_group_code.to_owned());
        if !keys.insert(key) {
            return Err(DomainError::new(
                "resourceCode/resourceGroupCode entries must be unique",
            ));
        }
    }
    Ok(())
}

pub(super) fn map_resource_row(row: PgRow) -> DomainResult<AdminUpstreamResourceItem> {
    Ok(AdminUpstreamResourceItem {
        id: column(&row, "id", "failed to map upstream resource id")?,
        resource_code: column(
            &row,
            "resource_code",
            "failed to map upstream resource resource_code",
        )?,
        resource_group_code: column(
            &row,
            "resource_group_code",
            "failed to map upstream resource resource_group_code",
        )?,
        grant_type: column(
            &row,
            "grant_type",
            "failed to map upstream resource grant_type",
        )?,
        priority: column(&row, "priority", "failed to map upstream resource priority")?,
        status: column(&row, "status", "failed to map upstream resource status")?,
    })
}

pub(super) fn generated_uuid() -> String {
    sdkwork_utils_rust::uuid()
}

pub(super) async fn record_routing_change(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    requested_at: &str,
    changed_object_type: &str,
    changed_object_id: i64,
    action: &str,
    event_payload: serde_json::Value,
) -> DomainResult<i64> {
    let request_id = generated_uuid();
    record_postgres_ai_routing_config_change(
        tx,
        AiRoutingConfigChange {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            operator_id: subject.operator_id,
            request_id: &request_id,
            requested_at,
            changed_object_type,
            changed_object_id,
            action,
            event_payload,
        },
    )
    .await
}

pub(super) fn masked_secret(secret: &str) -> String {
    let characters = secret.chars().collect::<Vec<_>>();
    match characters.len() {
        0..=4 => "****".to_owned(),
        5..=8 => format!("{}****", characters.iter().take(2).collect::<String>()),
        _ => format!(
            "{}****{}",
            characters.iter().take(4).collect::<String>(),
            characters
                .iter()
                .skip(characters.len().saturating_sub(4))
                .collect::<String>()
        ),
    }
}
