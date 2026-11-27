use sqlx::{PgPool, Postgres, Row, Transaction};

use super::account_group;
use super::shared::{generated_uuid, record_routing_change, store_error, MAX_NESTED_ITEMS};
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::ports::{
    AdminGroupResourcePriceInput, AdminGroupResourcePriceItem, AdminUpstreamSubject,
};

/// Closed mode set, mirroring
/// `ck_cloudrouter_group_resource_price_mode`.
const PRICE_MODES: [&str; 4] = ["multiplier", "markup", "unit_price", "free"];
/// Closed resource-type set, mirroring
/// `ck_cloudrouter_group_resource_price_resource_type`.
const RESOURCE_TYPES: [&str; 6] = ["model", "image", "video", "api", "audio", "other"];

pub(super) async fn list(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    account_group_id: i64,
) -> DomainResult<Vec<AdminGroupResourcePriceItem>> {
    let sql = format!(
        r#"
        SELECT id, uuid, account_group_id, account_group_code_snapshot, resource_type,
               catalog_key, operation_code, meter_code, region_code,
               BTRIM(provider_code) AS provider_code, price_mode,
               multiplier::text AS multiplier,
               markup_amount::text AS markup_amount,
               unit_price_override::text AS unit_price_override,
               currency_code,
               effective_from::text AS effective_from,
               effective_to::text AS effective_to,
               status
        FROM cloudrouter_group_resource_price
        WHERE tenant_id = $1 AND organization_id = $2
          AND account_group_id = $3
          AND deleted_at IS NULL
        ORDER BY catalog_key ASC, meter_code ASC, region_code ASC, provider_code ASC, id ASC
        LIMIT {limit}
        "#,
        limit = MAX_NESTED_ITEMS + 1
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_group_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list account group resource prices", error))?;
    if rows.len() > MAX_NESTED_ITEMS {
        return Err(DomainError::new(format!(
            "account group resource prices exceed the bounded maximum of {MAX_NESTED_ITEMS} items"
        )));
    }
    rows.iter().map(map_row).collect()
}

/// Replaces the whole price set of one account group in a single transaction.
///
/// Rows absent from `items` are soft-deleted, so the admin surface can
/// present the layer as an editable table without a per-row delete call. The
/// replacement runs under the same nested-write lock as the group's member and
/// resource edits, so two concurrent editors cannot interleave.
pub(super) async fn replace(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    account_group_id: i64,
    expected_version: i64,
    items: Vec<AdminGroupResourcePriceInput>,
) -> DomainResult<Vec<AdminGroupResourcePriceItem>> {
    validate_inputs(&items)?;
    let mut tx = pool.begin().await.map_err(|error| {
        store_error(
            "failed to begin account group resource price replacement",
            error,
        )
    })?;
    // Same nested-write lock order as member and resource edits: the group row
    // is locked at its expected version before the price rows change.
    account_group::lock_for_nested(&mut tx, &subject, account_group_id, expected_version).await?;
    let account_group_code = load_group_code(&mut tx, &subject, account_group_id).await?;
    let requested_at = current_timestamp(&mut tx).await?;
    let retained = items
        .iter()
        .filter_map(|item| item.id)
        .collect::<Vec<i64>>();

    // Soft-delete every live row the caller did not keep.
    sqlx::query(
        r#"
        UPDATE cloudrouter_group_resource_price
        SET deleted_at = $4::timestamptz,
            status = 0,
            updated_at = $4::timestamptz,
            version = cloudrouter_group_resource_price.version + 1
        WHERE tenant_id = $1 AND organization_id = $2
          AND account_group_id = $3
          AND deleted_at IS NULL
          AND NOT (id = ANY($5))
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_group_id)
    .bind(&requested_at)
    .bind(&retained)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to retire account group resource prices", error))?;

    for item in &items {
        let id = match item.id {
            Some(id) => id,
            None => next_cloud_runtime_id("cloudrouter_group_resource_price")?,
        };
        sqlx::query(
            r#"
            INSERT INTO cloudrouter_group_resource_price (
                id, uuid, tenant_id, organization_id, data_scope, status,
                created_at, updated_at, version, metadata,
                account_group_id, account_group_code_snapshot, resource_type,
                catalog_key, operation_code, meter_code, region_code, provider_code,
                price_mode, multiplier, markup_amount, unit_price_override,
                currency_code, effective_from, effective_to
            ) VALUES (
                $1, $2, $3, $4, 0, 1,
                $5::timestamptz, $5::timestamptz, 0, '{}'::jsonb,
                $6, $7, $8,
                $9, $10, $11, $12, $13,
                $14, $15::numeric, $16::numeric, $17::numeric,
                $18, $19::timestamptz, $20::timestamptz
            )
            ON CONFLICT (
                tenant_id, organization_id, account_group_id,
                catalog_key, operation_code, meter_code, region_code, provider_code
            ) WHERE deleted_at IS NULL
            DO UPDATE SET
                account_group_code_snapshot = EXCLUDED.account_group_code_snapshot,
                resource_type = EXCLUDED.resource_type,
                price_mode = EXCLUDED.price_mode,
                multiplier = EXCLUDED.multiplier,
                markup_amount = EXCLUDED.markup_amount,
                unit_price_override = EXCLUDED.unit_price_override,
                currency_code = EXCLUDED.currency_code,
                effective_from = EXCLUDED.effective_from,
                effective_to = EXCLUDED.effective_to,
                status = 1,
                updated_at = EXCLUDED.updated_at,
                version = cloudrouter_group_resource_price.version + 1
            "#,
        )
        .bind(id)
        .bind(generated_uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(&requested_at)
        .bind(account_group_id)
        .bind(&account_group_code)
        .bind(item.resource_type.trim())
        .bind(item.catalog_key.trim())
        .bind(item.operation_code.trim())
        .bind(item.meter_code.trim())
        .bind(item.region_code.trim())
        .bind(item.provider_code.trim())
        .bind(item.price_mode.trim())
        .bind(normalized_multiplier(item)?)
        .bind(normalized_markup(item)?)
        .bind(item.unit_price_override.as_deref().map(str::trim))
        .bind(item.currency_code.trim())
        .bind(item.effective_from.trim())
        .bind(item.effective_to.as_deref().map(str::trim))
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to upsert account group resource price", error))?;
    }

    let result = list_in_transaction(&mut tx, &subject, account_group_id).await?;
    record_routing_change(
        &mut tx,
        &subject,
        &requested_at,
        "upstream_account_group",
        account_group_id,
        "replace_upstream_account_group_resource_prices",
        serde_json::json!({"resourcePriceCount": result.len()}),
    )
    .await?;
    account_group::bump_nested_version(
        &mut tx,
        &subject,
        account_group_id,
        expected_version,
        &requested_at,
    )
    .await?;
    tx.commit().await.map_err(|error| {
        store_error(
            "failed to commit account group resource price replacement",
            error,
        )
    })?;
    Ok(result)
}

async fn list_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_group_id: i64,
) -> DomainResult<Vec<AdminGroupResourcePriceItem>> {
    let sql = format!(
        r#"
        SELECT id, uuid, account_group_id, account_group_code_snapshot, resource_type,
               catalog_key, operation_code, meter_code, region_code,
               BTRIM(provider_code) AS provider_code, price_mode,
               multiplier::text AS multiplier,
               markup_amount::text AS markup_amount,
               unit_price_override::text AS unit_price_override,
               currency_code,
               effective_from::text AS effective_from,
               effective_to::text AS effective_to,
               status
        FROM cloudrouter_group_resource_price
        WHERE tenant_id = $1 AND organization_id = $2
          AND account_group_id = $3
          AND deleted_at IS NULL
        ORDER BY catalog_key ASC, meter_code ASC, region_code ASC, provider_code ASC, id ASC
        LIMIT {MAX_NESTED_ITEMS}
        "#
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_group_id)
        .fetch_all(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reload account group resource prices", error))?;
    rows.iter().map(map_row).collect()
}

async fn load_group_code(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_group_id: i64,
) -> DomainResult<String> {
    sqlx::query_scalar::<_, String>(
        r#"
        SELECT group_code
        FROM ai_upstream_account_group
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_group_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load account group code", error))?
    .ok_or_else(|| {
        DomainError::not_found(format!(
            "account group {account_group_id} was not found for resource pricing"
        ))
    })
}

async fn current_timestamp(tx: &mut Transaction<'_, Postgres>) -> DomainResult<String> {
    sqlx::query_scalar::<_, String>("SELECT CURRENT_TIMESTAMP::text")
        .fetch_one(&mut **tx)
        .await
        .map_err(|error| store_error("failed to read the current timestamp", error))
}

fn map_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminGroupResourcePriceItem> {
    Ok(AdminGroupResourcePriceItem {
        id: row
            .try_get("id")
            .map_err(|error| store_error("read price id", error))?,
        uuid: string_cell(row, "uuid")?,
        account_group_id: row
            .try_get("account_group_id")
            .map_err(|error| store_error("read price account group", error))?,
        account_group_code_snapshot: string_cell(row, "account_group_code_snapshot")?,
        resource_type: string_cell(row, "resource_type")?,
        catalog_key: string_cell(row, "catalog_key")?,
        operation_code: string_cell(row, "operation_code")?,
        meter_code: string_cell(row, "meter_code")?,
        region_code: string_cell(row, "region_code")?,
        provider_code: string_cell(row, "provider_code")?,
        price_mode: string_cell(row, "price_mode")?,
        multiplier: string_cell(row, "multiplier")?,
        markup_amount: string_cell(row, "markup_amount")?,
        unit_price_override: optional_string_cell(row, "unit_price_override")?,
        currency_code: string_cell(row, "currency_code")?,
        effective_from: string_cell(row, "effective_from")?,
        effective_to: optional_string_cell(row, "effective_to")?,
        status: row
            .try_get("status")
            .map_err(|error| store_error("read price status", error))?,
    })
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<String> {
    row.try_get(column)
        .map_err(|error| store_error("read account group resource price column", error))
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<Option<String>> {
    row.try_get(column)
        .map_err(|error| store_error("read account group resource price column", error))
}

/// The payload is validated here as well as in the database, so an operator
/// receives a named error instead of a raw constraint violation.
fn normalized_multiplier(item: &AdminGroupResourcePriceInput) -> DomainResult<String> {
    match item.price_mode.trim() {
        "multiplier" => {
            let multiplier = crate::domain::DecimalValue::parse(item.multiplier.trim())
                .map_err(|error| DomainError::new(format!("invalid multiplier: {error}")))?;
            if multiplier <= crate::domain::DecimalValue::ZERO {
                return Err(DomainError::new("multiplier must be greater than zero"));
            }
            Ok(item.multiplier.trim().to_owned())
        }
        _ => Ok("1".to_owned()),
    }
}

fn normalized_markup(item: &AdminGroupResourcePriceInput) -> DomainResult<String> {
    match item.price_mode.trim() {
        "markup" => {
            let markup = crate::domain::DecimalValue::parse(item.markup_amount.trim())
                .map_err(|error| DomainError::new(format!("invalid markup amount: {error}")))?;
            if markup < crate::domain::DecimalValue::ZERO {
                return Err(DomainError::new("markup amount must not be negative"));
            }
            Ok(item.markup_amount.trim().to_owned())
        }
        _ => Ok("0".to_owned()),
    }
}

fn validate_inputs(items: &[AdminGroupResourcePriceInput]) -> DomainResult<()> {
    if items.len() > MAX_NESTED_ITEMS {
        return Err(DomainError::new(format!(
            "account group resource prices exceed the bounded maximum of {MAX_NESTED_ITEMS} items"
        )));
    }
    let mut seen = std::collections::BTreeSet::new();
    for item in items {
        if !RESOURCE_TYPES.contains(&item.resource_type.trim()) {
            return Err(DomainError::new(format!(
                "unsupported resource type `{}`; expected one of {}",
                item.resource_type,
                RESOURCE_TYPES.join(", ")
            )));
        }
        let price_mode = item.price_mode.trim();
        if !PRICE_MODES.contains(&price_mode) {
            return Err(DomainError::new(format!(
                "unsupported price mode `{}`; expected one of {}",
                item.price_mode,
                PRICE_MODES.join(", ")
            )));
        }
        if item.catalog_key.trim().is_empty()
            || item.operation_code.trim().is_empty()
            || item.meter_code.trim().is_empty()
            || item.region_code.trim().is_empty()
        {
            return Err(DomainError::new(
                "a group resource price requires catalogKey, operationCode, meterCode and regionCode",
            ));
        }
        if item.currency_code.trim().len() != 3 {
            return Err(DomainError::new(
                "a group resource price requires a three-letter currency code",
            ));
        }
        match price_mode {
            "unit_price" => {
                let value = item
                    .unit_price_override
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| {
                        DomainError::new("unit_price pricing requires unitPriceOverride")
                    })?;
                let price = crate::domain::DecimalValue::parse(value)
                    .map_err(|error| DomainError::new(format!("invalid unit price: {error}")))?;
                if price <= crate::domain::DecimalValue::ZERO {
                    return Err(DomainError::new(
                        "unit price override must be greater than zero",
                    ));
                }
            }
            "free" => {
                let has_price = item
                    .unit_price_override
                    .as_deref()
                    .map(str::trim)
                    .is_some_and(|value| !value.is_empty() && value != "0" && value != "0.0");
                if has_price {
                    return Err(DomainError::new(
                        "free pricing must not carry a unit price override",
                    ));
                }
            }
            _ => {
                if item.unit_price_override.is_some() {
                    return Err(DomainError::new(
                        "only unit_price pricing may carry a unit price override",
                    ));
                }
            }
        }
        let key = (
            item.catalog_key.trim().to_owned(),
            item.operation_code.trim().to_owned(),
            item.meter_code.trim().to_owned(),
            item.region_code.trim().to_owned(),
            item.provider_code.trim().to_owned(),
        );
        if !seen.insert(key.clone()) {
            return Err(DomainError::new(format!(
                "duplicate group resource price for {} / {} / {} / {} / {}",
                key.0, key.1, key.2, key.3, key.4
            )));
        }
    }
    Ok(())
}
