use std::collections::HashSet;

use sqlx::postgres::PgRow;
use sqlx::{Decode, Postgres, Row, Type};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{AdminUpstreamResourceInput, AdminUpstreamResourceItem};

pub(super) const DEFAULT_DATA_SCOPE: i32 = 1;
pub(super) const MAX_NESTED_ITEMS: usize = 200;

pub(super) fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}

pub(super) fn column<T>(row: &PgRow, name: &str, context: &str) -> DomainResult<T>
where
    for<'row> T: Decode<'row, Postgres> + Type<Postgres>,
{
    row.try_get(name).map_err(|error| store_error(context, error))
}

pub(super) fn conflict(message: impl Into<String>) -> DomainError {
    DomainError::conflict(message)
}

pub(super) fn not_found(entity: &str) -> DomainError {
    DomainError::not_found(format!("{entity} was not found in the active organization scope"))
}

pub(super) fn search_pattern(q: Option<&str>) -> Option<String> {
    q.map(str::trim).filter(|value| !value.is_empty()).map(|value| {
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
        priority: column(
            &row,
            "priority",
            "failed to map upstream resource priority",
        )?,
        status: column(
            &row,
            "status",
            "failed to map upstream resource status",
        )?,
    })
}

pub(super) fn generated_uuid() -> String {
    sdkwork_utils_rust::uuid()
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
