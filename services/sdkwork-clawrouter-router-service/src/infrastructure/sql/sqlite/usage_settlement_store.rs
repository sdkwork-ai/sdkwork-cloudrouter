use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use sdkwork_contract_service::{CommerceAccountAssetType, CommerceLedgerDirection};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::domain::DomainError;
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    UsageSettlementCommand, UsageSettlementFuture, UsageSettlementOutcome, UsageSettlementStore,
};

const POINTS_CURRENCY_CODE: &str = "POINT";
const USAGE_SETTLEMENT_PENDING: i64 = 0;
const USAGE_SETTLEMENT_SUCCESS: i64 = 2;
const USAGE_SETTLEMENT_FAILED: i64 = 3;
const DECIMAL_SCALE: i128 = 1_000_000_000_000;
const POINTS_PER_MAJOR_UNIT: i128 = 10;
const MIN_BILLABLE_POINT_SCALED: i128 = DECIMAL_SCALE;

#[derive(Debug, Clone)]
pub struct SqliteUsageSettlementStore {
    pool: SqlitePool,
}

impl SqliteUsageSettlementStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl UsageSettlementStore for SqliteUsageSettlementStore {
    fn settle_pending_usage<'a>(
        &'a self,
        command: UsageSettlementCommand,
    ) -> UsageSettlementFuture<'a> {
        Box::pin(async move { settle_pending_usage(&self.pool, command).await })
    }
}

#[derive(Debug, Clone)]
struct UsageFactForSettlement {
    id: i64,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    request_id: String,
    trace_id: Option<String>,
    amount: String,
    tokens: i64,
    currency: String,
    pricing_snapshot: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct SettlementGroupKey {
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    currency: String,
}

#[derive(Debug, Clone)]
struct SettlementCandidate {
    usage_fact: UsageFactForSettlement,
    scaled_amount: i128,
}

#[derive(Debug, Clone)]
struct SettlementGroup {
    key: SettlementGroupKey,
    candidates: Vec<SettlementCandidate>,
}

#[derive(Debug, Clone)]
struct PointsAccount {
    id: String,
    available_amount: i64,
}

fn projection_wallet_account(usage_fact: &UsageFactForSettlement) -> PointsAccount {
    PointsAccount {
        id: stable_account_id(usage_fact),
        available_amount: i64::MAX,
    }
}

async fn settle_pending_usage(
    pool: &SqlitePool,
    command: UsageSettlementCommand,
) -> Result<UsageSettlementOutcome, DomainError> {
    if command.limit <= 0 {
        return Ok(UsageSettlementOutcome {
            settled_count: 0,
            failed_count: 0,
            debited_points: 0,
        });
    }

    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin usage settlement transaction", error))?;
    let usage_facts = load_settleable_usage_facts(&mut tx, &command).await?;
    let mut outcome = UsageSettlementOutcome {
        settled_count: 0,
        failed_count: 0,
        debited_points: 0,
    };
    let groups = collect_settlement_groups(&mut tx, &command, usage_facts, &mut outcome).await?;
    for group in groups {
        let group_outcome = settle_usage_group(&mut tx, &command, &group).await?;
        outcome.settled_count += group_outcome.settled_count;
        outcome.failed_count += group_outcome.failed_count;
        outcome.debited_points += group_outcome.debited_points;
    }
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit usage settlement transaction", error))?;
    Ok(outcome)
}

async fn load_settleable_usage_facts(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UsageSettlementCommand,
) -> Result<Vec<UsageFactForSettlement>, DomainError> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            COALESCE(user_id, owner_id, 0) AS user_id,
            request_id,
            trace_id,
            CAST(COALESCE(NULLIF(customer_charge_amount, ''), '0') AS TEXT) AS amount,
            COALESCE(total_tokens, 0) AS tokens,
            COALESCE(NULLIF(currency, ''), 'USD') AS currency,
            COALESCE(NULLIF(pricing_snapshot, ''), '{}') AS pricing_snapshot
        FROM ai_usage
        WHERE (? <= 0 OR tenant_id = ?)
          AND (? <= 0 OR organization_id = ?)
          AND settlement_status IN (?, ?)
        ORDER BY COALESCE(occurred_at, ''), id
        LIMIT ?
        "#,
    )
    .bind(command.tenant_id)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.organization_id)
    .bind(USAGE_SETTLEMENT_PENDING)
    .bind(USAGE_SETTLEMENT_FAILED)
    .bind(command.limit)
    .fetch_all(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load settleable usage facts", error))?;

    Ok(rows
        .iter()
        .map(|row| UsageFactForSettlement {
            id: integer_cell(row, "id"),
            tenant_id: integer_cell(row, "tenant_id"),
            organization_id: integer_cell(row, "organization_id"),
            user_id: integer_cell(row, "user_id"),
            request_id: string_cell(row, "request_id"),
            trace_id: optional_string_cell(row, "trace_id"),
            amount: string_cell(row, "amount"),
            tokens: integer_cell(row, "tokens"),
            currency: string_cell(row, "currency"),
            pricing_snapshot: string_cell(row, "pricing_snapshot"),
        })
        .collect())
}

async fn collect_settlement_groups(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UsageSettlementCommand,
    usage_facts: Vec<UsageFactForSettlement>,
    outcome: &mut UsageSettlementOutcome,
) -> Result<Vec<SettlementGroup>, DomainError> {
    let mut groups: Vec<SettlementGroup> = Vec::new();
    for usage_fact in usage_facts {
        if already_settled(tx, &usage_fact).await? {
            continue;
        }
        let scaled_amount = match parse_decimal_scaled(&usage_fact.amount) {
            Ok(amount) => amount,
            Err(error) => {
                mark_invalid_usage_fact_failed(tx, command, &usage_fact, &error.to_string())
                    .await?;
                outcome.failed_count += 1;
                continue;
            }
        };
        if scaled_amount == 0 {
            settle_zero_usage_fact(tx, command, &usage_fact).await?;
            outcome.settled_count += 1;
            continue;
        }
        let key = SettlementGroupKey {
            tenant_id: usage_fact.tenant_id,
            organization_id: usage_fact.organization_id,
            user_id: usage_fact.user_id,
            currency: usage_fact.currency.clone(),
        };
        let candidate = SettlementCandidate {
            usage_fact,
            scaled_amount,
        };
        if let Some(group) = groups.iter_mut().find(|group| group.key == key) {
            group.candidates.push(candidate);
        } else {
            groups.push(SettlementGroup {
                key,
                candidates: vec![candidate],
            });
        }
    }
    Ok(groups)
}

async fn mark_invalid_usage_fact_failed(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UsageSettlementCommand,
    usage_fact: &UsageFactForSettlement,
    failure_message: &str,
) -> Result<(), DomainError> {
    let account = projection_wallet_account(usage_fact);
    let settlement_id =
        upsert_processing_settlement(tx, command, usage_fact, &account.id, 0).await?;
    mark_settlement_failed(
        tx,
        usage_fact,
        settlement_id,
        "INVALID_USAGE_AMOUNT",
        failure_message,
    )
    .await
}

async fn settle_zero_usage_fact(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UsageSettlementCommand,
    usage_fact: &UsageFactForSettlement,
) -> Result<(), DomainError> {
    let account = projection_wallet_account(usage_fact);
    let settlement_id =
        upsert_processing_settlement(tx, command, usage_fact, &account.id, 0).await?;
    mark_settlement_success(tx, command, usage_fact, settlement_id, None).await
}

async fn settle_usage_group(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UsageSettlementCommand,
    group: &SettlementGroup,
) -> Result<UsageSettlementOutcome, DomainError> {
    if group.candidates.is_empty() {
        return Ok(empty_outcome());
    }

    let points = charge_points_from_scaled(group_total_scaled(group)?)?;
    if points == 0 {
        defer_usage_group(tx, group).await?;
        return Ok(empty_outcome());
    }

    let first_usage_fact = &group.candidates[0].usage_fact;
    let account = ensure_points_account(tx, command, first_usage_fact).await?;
    let allocations = allocate_candidate_points(&group.candidates, points)?;
    let mut settlement_ids = Vec::with_capacity(group.candidates.len());
    for (candidate, allocated_points) in group.candidates.iter().zip(allocations.iter()) {
        settlement_ids.push(
            upsert_processing_settlement(
                tx,
                command,
                &candidate.usage_fact,
                &account.id,
                *allocated_points,
            )
            .await?,
        );
    }

    let transaction_id = settlement_batch_no(&group.candidates);
    let ledger_entry_id = match existing_account_ledger_entry_id(tx, &account.id, &transaction_id)
        .await?
    {
        Some(ledger_entry_id) => ledger_entry_id,
        None => {
            if account.available_amount < points {
                for (candidate, settlement_id) in group.candidates.iter().zip(settlement_ids.iter())
                {
                    mark_settlement_failed(
                        tx,
                        &candidate.usage_fact,
                        *settlement_id,
                        "INSUFFICIENT_POINTS",
                        "usage settlement account has insufficient points",
                    )
                    .await?;
                }
                return Ok(UsageSettlementOutcome {
                    settled_count: 0,
                    failed_count: group.candidates.len() as i64,
                    debited_points: 0,
                });
            }
            let balance_after = account.available_amount - points;
            update_account_points(tx, &account.id, points, balance_after).await?;
            insert_account_ledger_entry(
                tx,
                &stable_ledger_entry_id(&transaction_id),
                first_usage_fact,
                &account.id,
                balance_after,
                points,
                &transaction_id,
            )
            .await?
        }
    };

    for (candidate, settlement_id) in group.candidates.iter().zip(settlement_ids.iter()) {
        mark_settlement_success(
            tx,
            command,
            &candidate.usage_fact,
            *settlement_id,
            Some(&ledger_entry_id),
        )
        .await?;
    }
    Ok(UsageSettlementOutcome {
        settled_count: group.candidates.len() as i64,
        failed_count: 0,
        debited_points: points,
    })
}

async fn already_settled(
    tx: &mut Transaction<'_, Sqlite>,
    usage_fact: &UsageFactForSettlement,
) -> Result<bool, DomainError> {
    let row = sqlx::query(
        r#"
        SELECT account_ledger_entry_id
        FROM commerce_settlement
        WHERE tenant_id = ?
          AND organization_id = ?
          AND usage_fact_id = ?
          AND settlement_status = ?
        LIMIT 1
        "#,
    )
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .bind(usage_fact.id)
    .bind(USAGE_SETTLEMENT_SUCCESS)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to check usage settlement idempotency", error))?;
    Ok(row.is_some())
}

async fn ensure_points_account(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UsageSettlementCommand,
    usage_fact: &UsageFactForSettlement,
) -> Result<PointsAccount, DomainError> {
    let existing = sqlx::query(
        r#"
        SELECT id, CAST(COALESCE(available_amount, '0') AS TEXT) AS available_amount
        FROM commerce_account
        WHERE tenant_id = CAST(? AS TEXT)
          AND (organization_id IS NULL OR organization_id = CAST(? AS TEXT))
          AND owner_user_id = CAST(? AS TEXT)
          AND asset_type = ?
          AND currency_code = ?
          AND status = 'active'
        ORDER BY id ASC
        LIMIT 1
        "#,
    )
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .bind(usage_fact.user_id)
    .bind(CommerceAccountAssetType::Points.as_str())
    .bind(POINTS_CURRENCY_CODE)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load usage settlement points account", error))?;
    if let Some(row) = existing {
        return Ok(PointsAccount {
            id: string_cell(&row, "id"),
            available_amount: integer_cell(&row, "available_amount"),
        });
    }

    sqlx::query(
        r#"
        INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code, available_amount, frozen_amount, version, status, created_at, updated_at)
        VALUES
            (?, CAST(? AS TEXT), CAST(? AS TEXT), CAST(? AS TEXT), ?, ?, '0', '0', 0, 'active', ?, ?)
        ON CONFLICT(tenant_id, organization_id, owner_user_id, asset_type, currency_code) DO NOTHING
        "#,
    )
    .bind(stable_account_id(usage_fact))
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .bind(usage_fact.user_id)
    .bind(CommerceAccountAssetType::Points.as_str())
    .bind(POINTS_CURRENCY_CODE)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create usage settlement points account", error))?;

    let row = sqlx::query(
        r#"
        SELECT id, CAST(COALESCE(available_amount, '0') AS TEXT) AS available_amount
        FROM commerce_account
        WHERE tenant_id = CAST(? AS TEXT)
          AND (organization_id IS NULL OR organization_id = CAST(? AS TEXT))
          AND owner_user_id = CAST(? AS TEXT)
          AND asset_type = ?
          AND currency_code = ?
          AND status = 'active'
        ORDER BY id ASC
        LIMIT 1
        "#,
    )
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .bind(usage_fact.user_id)
    .bind(CommerceAccountAssetType::Points.as_str())
    .bind(POINTS_CURRENCY_CODE)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| {
        store_error(
            "failed to load created usage settlement points account",
            error,
        )
    })?
    .ok_or_else(|| {
        DomainError::conflict("usage settlement points account was not available after creation")
    })?;

    Ok(PointsAccount {
        id: string_cell(&row, "id"),
        available_amount: integer_cell(&row, "available_amount"),
    })
}

async fn upsert_processing_settlement(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UsageSettlementCommand,
    usage_fact: &UsageFactForSettlement,
    account_id: &str,
    points: i64,
) -> Result<i64, DomainError> {
    sqlx::query(
        r#"
        INSERT INTO commerce_settlement
            (uuid, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at,
             metadata, settlement_no, usage_fact_id, account_id, asset_type, direction, amount,
             points, tokens, currency, price_snapshot, settlement_status, id)
        VALUES
            (?, ?, ?, ?, ?, ?, 1, ?, '{}', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (tenant_id, organization_id, usage_fact_id) DO UPDATE SET
            user_id = excluded.user_id,
            request_id = excluded.request_id,
            trace_id = excluded.trace_id,
            account_id = excluded.account_id,
            asset_type = excluded.asset_type,
            direction = excluded.direction,
            amount = excluded.amount,
            points = excluded.points,
            tokens = excluded.tokens,
            currency = excluded.currency,
            price_snapshot = excluded.price_snapshot,
            settlement_status = excluded.settlement_status,
            failure_code = NULL,
            failure_message = NULL
        WHERE commerce_settlement.settlement_status <> ?
        "#,
    )
    .bind(stable_uuid("usage-settlement", usage_fact.id))
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .bind(usage_fact.user_id)
    .bind(&usage_fact.request_id)
    .bind(usage_fact.trace_id.as_deref())
    .bind(&command.requested_at)
    .bind(settlement_no(usage_fact.id))
    .bind(usage_fact.id)
    .bind(account_id)
    .bind(CommerceAccountAssetType::Points.as_str())
    .bind(CommerceLedgerDirection::Debit.as_str())
    .bind(&usage_fact.amount)
    .bind(points)
    .bind(usage_fact.tokens)
    .bind(&usage_fact.currency)
    .bind(&usage_fact.pricing_snapshot)
    .bind(USAGE_SETTLEMENT_PENDING)
    .bind(next_claw_runtime_id("commerce_settlement")?)
    .bind(USAGE_SETTLEMENT_SUCCESS)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to upsert usage settlement bridge", error))?;

    sqlx::query_scalar(
        r#"
        SELECT id
        FROM commerce_settlement
        WHERE tenant_id = ?
          AND organization_id = ?
          AND usage_fact_id = ?
        LIMIT 1
        "#,
    )
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .bind(usage_fact.id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to read usage settlement bridge id", error))
}

async fn existing_account_ledger_entry_id(
    tx: &mut Transaction<'_, Sqlite>,
    account_id: &str,
    transaction_id: &str,
) -> Result<Option<String>, DomainError> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM commerce_account_ledger_entry
        WHERE account_id = ?
          AND transaction_no = ?
          AND business_type = 'usage'
        LIMIT 1
        "#,
    )
    .bind(account_id)
    .bind(transaction_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to check usage settlement ledger idempotency", error))
}

async fn update_account_points(
    tx: &mut Transaction<'_, Sqlite>,
    account_id: &str,
    points: i64,
    balance_after: i64,
) -> Result<(), DomainError> {
    let result = sqlx::query(
        r#"
        UPDATE commerce_account
        SET available_amount = ?,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND CAST(COALESCE(available_amount, '0') AS INTEGER) >= ?
        "#,
    )
    .bind(balance_after.to_string())
    .bind(account_id)
    .bind(points)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update usage settlement account points", error))?;
    if result.rows_affected() != 1 {
        return Err(DomainError::conflict(
            "usage settlement account points update was not applied atomically",
        ));
    }
    Ok(())
}

async fn insert_account_ledger_entry(
    tx: &mut Transaction<'_, Sqlite>,
    ledger_entry_id: &str,
    usage_fact: &UsageFactForSettlement,
    account_id: &str,
    balance_after: i64,
    points: i64,
    transaction_id: &str,
) -> Result<String, DomainError> {
    sqlx::query(
        r#"
        INSERT INTO commerce_account_ledger_entry
            (id, tenant_id, organization_id, account_id, owner_user_id, asset_type, direction, amount, balance_after, business_type, transaction_no, request_no, idempotency_key, source_type, source_id, remark, created_at)
        VALUES
            (?, CAST(? AS TEXT), CAST(? AS TEXT), ?, CAST(? AS TEXT), ?, ?, ?, ?, 'usage', ?, ?, ?, 'ai_usage', ?, ?, CURRENT_TIMESTAMP)
        "#,
    )
    .bind(ledger_entry_id)
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .bind(account_id)
    .bind(usage_fact.user_id)
    .bind(CommerceAccountAssetType::Points.as_str())
    .bind(CommerceLedgerDirection::Debit.as_str())
    .bind(points.to_string())
    .bind(balance_after.to_string())
    .bind(transaction_id)
    .bind(&usage_fact.request_id)
    .bind(transaction_id)
    .bind(usage_fact.id.to_string())
    .bind(format!("usage_request={}", usage_fact.request_id))
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to insert usage settlement account ledger entry", error))?;

    Ok(ledger_entry_id.to_owned())
}

async fn mark_settlement_success(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UsageSettlementCommand,
    usage_fact: &UsageFactForSettlement,
    settlement_id: i64,
    ledger_entry_id: Option<&str>,
) -> Result<(), DomainError> {
    sqlx::query(
        r#"
        UPDATE commerce_settlement
        SET account_ledger_entry_id = COALESCE(?, account_ledger_entry_id),
            settlement_status = ?,
            settled_at = ?,
            failure_code = NULL,
            failure_message = NULL
        WHERE id = ?
        "#,
    )
    .bind(ledger_entry_id)
    .bind(USAGE_SETTLEMENT_SUCCESS)
    .bind(&command.requested_at)
    .bind(settlement_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark usage settlement success", error))?;
    sqlx::query(
        r#"
        UPDATE ai_usage
        SET settlement_status = ?,
            settlement_id = ?
        WHERE id = ?
        "#,
    )
    .bind(USAGE_SETTLEMENT_SUCCESS)
    .bind(settlement_id)
    .bind(usage_fact.id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark usage fact settled", error))?;
    Ok(())
}

async fn mark_settlement_failed(
    tx: &mut Transaction<'_, Sqlite>,
    usage_fact: &UsageFactForSettlement,
    settlement_id: i64,
    failure_code: &str,
    failure_message: &str,
) -> Result<(), DomainError> {
    sqlx::query(
        r#"
        UPDATE commerce_settlement
        SET account_ledger_entry_id = NULL,
            settlement_status = ?,
            settled_at = NULL,
            failure_code = ?,
            failure_message = ?
        WHERE id = ?
        "#,
    )
    .bind(USAGE_SETTLEMENT_FAILED)
    .bind(failure_code)
    .bind(truncate_message(failure_message))
    .bind(settlement_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark usage settlement failed", error))?;
    sqlx::query(
        r#"
        UPDATE ai_usage
        SET settlement_status = ?,
            settlement_id = ?
        WHERE id = ?
        "#,
    )
    .bind(USAGE_SETTLEMENT_FAILED)
    .bind(settlement_id)
    .bind(usage_fact.id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark usage fact settlement failed", error))?;
    Ok(())
}

fn settlement_no(usage_fact_id: i64) -> String {
    format!("usage-settlement-{usage_fact_id}")
}

fn charge_points_from_scaled(scaled: i128) -> Result<i64, DomainError> {
    if scaled <= 0 {
        return Ok(0);
    }
    let scaled_points = scaled
        .checked_mul(POINTS_PER_MAJOR_UNIT)
        .ok_or_else(|| DomainError::new("usage settlement amount is too large"))?;
    if scaled_points < MIN_BILLABLE_POINT_SCALED {
        return Ok(0);
    }
    let points = scaled_points
        .checked_add(DECIMAL_SCALE - 1)
        .ok_or_else(|| DomainError::new("usage settlement amount is too large"))?
        / DECIMAL_SCALE;
    i64::try_from(points).map_err(|_| DomainError::new("usage settlement points overflow"))
}

fn group_total_scaled(group: &SettlementGroup) -> Result<i128, DomainError> {
    group
        .candidates
        .iter()
        .try_fold(0_i128, |total, candidate| {
            total
                .checked_add(candidate.scaled_amount)
                .ok_or_else(|| DomainError::new("usage settlement amount is too large"))
        })
}

fn allocate_candidate_points(
    candidates: &[SettlementCandidate],
    total_points: i64,
) -> Result<Vec<i64>, DomainError> {
    let mut allocations = Vec::with_capacity(candidates.len());
    let mut cumulative_amount = 0_i128;
    let mut allocated_points = 0_i64;
    for candidate in candidates {
        cumulative_amount = cumulative_amount
            .checked_add(candidate.scaled_amount)
            .ok_or_else(|| DomainError::new("usage settlement amount is too large"))?;
        let cumulative_points = charge_points_from_scaled(cumulative_amount)?;
        let candidate_points = cumulative_points
            .checked_sub(allocated_points)
            .ok_or_else(|| DomainError::new("usage settlement point allocation underflow"))?;
        allocations.push(candidate_points);
        allocated_points = cumulative_points;
    }
    if allocated_points != total_points {
        return Err(DomainError::new(
            "usage settlement point allocation does not match batch total",
        ));
    }
    Ok(allocations)
}

async fn defer_usage_group(
    tx: &mut Transaction<'_, Sqlite>,
    group: &SettlementGroup,
) -> Result<(), DomainError> {
    for candidate in &group.candidates {
        sqlx::query(
            r#"
            UPDATE ai_usage
            SET settlement_status = ?
            WHERE id = ?
            "#,
        )
        .bind(USAGE_SETTLEMENT_PENDING)
        .bind(candidate.usage_fact.id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to defer micro usage settlement fact", error))?;
        sqlx::query(
            r#"
            UPDATE commerce_settlement
            SET settlement_status = ?,
                settled_at = NULL,
                failure_code = NULL,
                failure_message = NULL
            WHERE tenant_id = ?
              AND organization_id = ?
              AND usage_fact_id = ?
            "#,
        )
        .bind(USAGE_SETTLEMENT_PENDING)
        .bind(candidate.usage_fact.tenant_id)
        .bind(candidate.usage_fact.organization_id)
        .bind(candidate.usage_fact.id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to defer micro usage settlement bridge", error))?;
    }
    Ok(())
}

fn empty_outcome() -> UsageSettlementOutcome {
    UsageSettlementOutcome {
        settled_count: 0,
        failed_count: 0,
        debited_points: 0,
    }
}

fn parse_decimal_scaled(value: &str) -> Result<i128, DomainError> {
    let value = value.trim();
    if value.is_empty() {
        return Ok(0);
    }
    if value.starts_with('-') {
        return Err(DomainError::new(
            "usage settlement amount must not be negative",
        ));
    }
    let parts: Vec<&str> = value.split('.').collect();
    if parts.len() > 2 || parts[0].is_empty() || !parts[0].chars().all(|ch| ch.is_ascii_digit()) {
        return Err(DomainError::new(format!(
            "invalid usage settlement amount: {value}"
        )));
    }
    let whole = parts[0]
        .parse::<i128>()
        .map_err(|_| DomainError::new(format!("invalid usage settlement amount: {value}")))?;
    let mut scaled = whole
        .checked_mul(DECIMAL_SCALE)
        .ok_or_else(|| DomainError::new("usage settlement amount is too large"))?;
    if parts.len() == 2 {
        let fraction = parts[1];
        if fraction.len() > 12 || !fraction.chars().all(|ch| ch.is_ascii_digit()) {
            return Err(DomainError::new(format!(
                "invalid usage settlement amount: {value}"
            )));
        }
        let mut padded = fraction.to_owned();
        while padded.len() < 12 {
            padded.push('0');
        }
        let fraction_scaled = padded
            .parse::<i128>()
            .map_err(|_| DomainError::new(format!("invalid usage settlement amount: {value}")))?;
        scaled = scaled
            .checked_add(fraction_scaled)
            .ok_or_else(|| DomainError::new("usage settlement amount is too large"))?;
    }
    Ok(scaled)
}

fn stable_uuid(prefix: &str, usage_fact_id: i64) -> String {
    let mut hasher = DefaultHasher::new();
    prefix.hash(&mut hasher);
    usage_fact_id.hash(&mut hasher);
    format!("{prefix}-{:016x}", hasher.finish())
}

fn stable_ledger_entry_id(transaction_id: &str) -> String {
    let mut hasher = DefaultHasher::new();
    "usage-ledger".hash(&mut hasher);
    transaction_id.hash(&mut hasher);
    format!("usage-ledger-{:016x}", hasher.finish())
}

fn settlement_batch_no(candidates: &[SettlementCandidate]) -> String {
    if candidates.len() == 1 {
        return settlement_no(candidates[0].usage_fact.id);
    }
    let mut hasher = DefaultHasher::new();
    "usage-settlement-batch".hash(&mut hasher);
    for candidate in candidates {
        candidate.usage_fact.id.hash(&mut hasher);
    }
    format!("usage-settlement-batch-{:016x}", hasher.finish())
}

fn stable_account_id(usage_fact: &UsageFactForSettlement) -> String {
    let mut hasher = DefaultHasher::new();
    "usage-account".hash(&mut hasher);
    usage_fact.tenant_id.hash(&mut hasher);
    usage_fact.organization_id.hash(&mut hasher);
    usage_fact.user_id.hash(&mut hasher);
    format!("usage-account-{:016x}", hasher.finish())
}

fn truncate_message(message: &str) -> String {
    message.chars().take(500).collect()
}

fn optional_string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column).ok().flatten()
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {
    optional_string_cell(row, column).unwrap_or_default()
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> i64 {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| parse_integer_text(&string_cell(row, column)).ok())
        .unwrap_or(0)
}

fn parse_integer_text(value: &str) -> Result<i64, DomainError> {
    let value = value.trim();
    if value.is_empty() {
        return Err(DomainError::new("integer value must not be empty"));
    }
    if !value.chars().all(|ch| ch.is_ascii_digit()) {
        return Err(DomainError::new(format!("invalid integer value: {value}")));
    }
    value
        .parse::<i64>()
        .map_err(|_| DomainError::new(format!("invalid integer value: {value}")))
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
