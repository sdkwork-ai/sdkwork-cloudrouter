//! Model access policy persistence backed by the unified `ai_model_access_policy`
//! table (scope_type ∈ supplier | account_group; effect ∈ allow | deny).
//!
//! Legacy columnar model blacklist/whitelist storage on the supplier / account
//! group tables has been replaced by this single table. An `AdminUpstreamModelListEntry`
//! blacklist entry becomes one `deny` row per vendor/model; a whitelist entry becomes
//! one `allow` row. At read time the rows are aggregated back into the blacklist /
//! whitelist lists the routing filter consumes (deny → blacklist, allow → whitelist),
//! preserving the existing filter semantics while making the storage authoritative.

use sqlx::{Postgres, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::ports::{AdminUpstreamModelListEntry, AdminUpstreamSubject};

use super::shared::{column, generated_uuid, store_error, DEFAULT_DATA_SCOPE};

/// Number of individual policy rows allowed per scope (protects against
/// unbounded vendor×model expansion).
pub(super) const MAX_MODEL_ACCESS_ROWS: usize = 500;

fn scope_key(scope_type: &str, scope_id: i64, scope_code: Option<&str>) -> String {
    format!("{scope_type}:{scope_id}:{}", scope_code.unwrap_or(""))
}

/// Replaces the entire model-access rule set for one scope in a transaction:
/// soft-deletes existing rows and inserts the blacklist (deny) + whitelist
/// (allow) rows derived from the admin lists. Returns the number of inserted rows.
pub(super) async fn replace_scope_model_access(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    requested_at: &str,
    scope_type: &str,
    scope_id: i64,
    scope_code: Option<&str>,
    blacklist: &[AdminUpstreamModelListEntry],
    whitelist: &[AdminUpstreamModelListEntry],
) -> DomainResult<usize> {
    let mut rows = Vec::new();
    for entry in blacklist {
        expand_entries(&mut rows, "deny", entry);
    }
    for entry in whitelist {
        expand_entries(&mut rows, "allow", entry);
    }
    if rows.len() > MAX_MODEL_ACCESS_ROWS {
        return Err(DomainError::new(format!(
            "model access rules for scope {} exceed the {MAX_MODEL_ACCESS_ROWS} row limit",
            scope_key(scope_type, scope_id, scope_code)
        )));
    }

    // Soft-delete the previous rule set (keeps audit history; unique index is
    // deleted_at-aware via the full_lifecycle_unique policy).
    sqlx::query(
        r#"
        UPDATE ai_model_access_policy
        SET deleted_at = $4, deleted_by = $5, updated_at = $4
        WHERE tenant_id = $1 AND organization_id = $2
          AND scope_type = $3 AND scope_id = $6
          AND deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(scope_type)
    .bind(requested_at)
    .bind(subject.operator_id)
    .bind(scope_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to retire model access rules", error))?;

    for (index, (effect, vendor_code, model_pattern)) in rows.iter().enumerate() {
        let policy_id = next_cloud_runtime_id("model access policy")?;
        sqlx::query(
            r#"
            INSERT INTO ai_model_access_policy (
                id, uuid, tenant_id, organization_id, data_scope, status,
                created_at, updated_at, version, metadata,
                scope_type, scope_id, scope_code, effect,
                vendor_code, model_pattern, priority, description
            ) VALUES (
                $1, $2, $3, $4, $5, 1,
                $6::timestamptz, $6::timestamptz, 0, '{}'::jsonb,
                $7, $8, $9, $10,
                $11, $12, $13, $14
            )
            "#,
        )
        .bind(policy_id)
        .bind(generated_uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(DEFAULT_DATA_SCOPE)
        .bind(requested_at)
        .bind(scope_type)
        .bind(scope_id)
        .bind(scope_code)
        .bind(effect)
        .bind(vendor_code)
        .bind(model_pattern)
        .bind((index as i32) + 1)
        .bind(format!(
            "{} model access rule for {scope_type} {}",
            effect, scope_id
        ))
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to insert model access rule", error))?;
    }
    Ok(rows.len())
}

/// Expands a vendor/model list entry into individual (effect, vendor, model) rows.
/// An empty model list means every model of the vendor → one row with NULL pattern.
fn expand_entries(
    rows: &mut Vec<(&'static str, Option<String>, Option<String>)>,
    effect: &'static str,
    entry: &AdminUpstreamModelListEntry,
) {
    let vendor_code = entry.vendor_code.trim();
    if vendor_code.is_empty() {
        return;
    }
    if entry.models.is_empty() {
        rows.push((effect, Some(vendor_code.to_owned()), None));
        return;
    }
    for model in &entry.models {
        let model = model.trim();
        if model.is_empty() {
            continue;
        }
        rows.push((effect, Some(vendor_code.to_owned()), Some(model.to_owned())));
    }
}

/// Loads the model access rules of a scope and aggregates them back into the
/// blacklist / whitelist lists the routing filter consumes. Empty rules → `None`.
pub(super) async fn load_scope_model_access(
    pool: &sqlx::PgPool,
    subject: &AdminUpstreamSubject,
    scope_type: &str,
    scope_id: i64,
) -> DomainResult<Option<(Vec<AdminUpstreamModelListEntry>, Vec<AdminUpstreamModelListEntry>)>> {
    let rows = sqlx::query(
        r#"
        SELECT scope_type, scope_id, scope_code, effect,
               vendor_code, model_pattern, priority, status
        FROM ai_model_access_policy
        WHERE tenant_id = $1 AND organization_id = $2
          AND scope_type = $3 AND scope_id = $4
          AND status = 1 AND deleted_at IS NULL
        ORDER BY priority ASC, id ASC
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(scope_type)
    .bind(scope_id)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to load model access rules", error))?;

    let mut blacklist: Vec<AdminUpstreamModelListEntry> = Vec::new();
    let mut whitelist: Vec<AdminUpstreamModelListEntry> = Vec::new();
    for row in rows {
        let effect: String = column(&row, "effect", "failed to map model access effect")?;
        let vendor_code: Option<String> =
            column(&row, "vendor_code", "failed to map model access vendor")?;
        let model_pattern: Option<String> =
            column(&row, "model_pattern", "failed to map model access pattern")?;
        let Some(vendor_code) = vendor_code else {
            continue;
        };
        let target = if effect == "deny" {
            &mut blacklist
        } else {
            &mut whitelist
        };
        push_aggregated(target, vendor_code, model_pattern);
    }
    if blacklist.is_empty() && whitelist.is_empty() {
        return Ok(None);
    }
    Ok(Some((blacklist, whitelist)))
}

fn push_aggregated(
    target: &mut Vec<AdminUpstreamModelListEntry>,
    vendor_code: String,
    model_pattern: Option<String>,
) {
    if let Some(model) = model_pattern {
        if let Some(entry) = target
            .iter_mut()
            .find(|entry| entry.vendor_code == vendor_code)
        {
            entry.models.push(model);
            return;
        }
        target.push(AdminUpstreamModelListEntry {
            vendor_code,
            models: vec![model],
        });
        return;
    }
    // NULL pattern = every model of the vendor → empty models list entry.
    if let Some(entry) = target
        .iter_mut()
        .find(|entry| entry.vendor_code == vendor_code && entry.models.is_empty())
    {
        let _ = entry;
        return;
    }
    target.push(AdminUpstreamModelListEntry {
        vendor_code,
        models: Vec::new(),
    });
}

/// Transaction-scoped variant of [`load_scope_model_access`] used while reloading
/// an entity inside its own save transaction.
pub(super) async fn load_scope_model_access_in_tx(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    scope_type: &str,
    scope_id: i64,
) -> DomainResult<Option<(Vec<AdminUpstreamModelListEntry>, Vec<AdminUpstreamModelListEntry>)>> {
    let rows = sqlx::query(
        r#"
        SELECT scope_type, scope_id, scope_code, effect,
               vendor_code, model_pattern, priority, status
        FROM ai_model_access_policy
        WHERE tenant_id = $1 AND organization_id = $2
          AND scope_type = $3 AND scope_id = $4
          AND status = 1 AND deleted_at IS NULL
        ORDER BY priority ASC, id ASC
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(scope_type)
    .bind(scope_id)
    .fetch_all(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load model access rules", error))?;

    let mut blacklist: Vec<AdminUpstreamModelListEntry> = Vec::new();
    let mut whitelist: Vec<AdminUpstreamModelListEntry> = Vec::new();
    for row in rows {
        let effect: String = column(&row, "effect", "failed to map model access effect")?;
        let vendor_code: Option<String> =
            column(&row, "vendor_code", "failed to map model access vendor")?;
        let model_pattern: Option<String> =
            column(&row, "model_pattern", "failed to map model access pattern")?;
        let Some(vendor_code) = vendor_code else {
            continue;
        };
        let target = if effect == "deny" {
            &mut blacklist
        } else {
            &mut whitelist
        };
        push_aggregated(target, vendor_code, model_pattern);
    }
    if blacklist.is_empty() && whitelist.is_empty() {
        return Ok(None);
    }
    Ok(Some((blacklist, whitelist)))
}


