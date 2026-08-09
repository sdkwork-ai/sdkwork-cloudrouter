use std::collections::hash_map::DefaultHasher;
use std::collections::BTreeMap;
use std::hash::{Hash, Hasher};
use std::time::Duration;

use sdkwork_account_repository_sqlx::PostgresCommerceAccountStore;
use sdkwork_account_service::AppendLedgerEntryCommand;
use sdkwork_contract_service::{
    CommerceAccountAssetType, CommerceLedgerDirection, CommerceMoney, CommerceRequestHash,
    CommerceServiceError,
};
use sdkwork_utils_rust::sha256_hash;
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::DomainError;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    UsageSettlementCommand, UsageSettlementFuture, UsageSettlementOutcome, UsageSettlementStore,
    MAX_PRICING_SNAPSHOT_BYTES,
};

const POINTS_CURRENCY_CODE: &str = "POINT";
const USAGE_SETTLEMENT_BUSINESS_TYPE: &str = "usage_settlement";
/// Stable account-domain contract message for a debit that the wallet cannot
/// satisfy (either the points account is missing or its balance is too low).
const INSUFFICIENT_BALANCE_MESSAGE: &str = "insufficient account balance";
const USAGE_SETTLEMENT_PENDING: i64 = 0;
const USAGE_SETTLEMENT_SUCCESS: i64 = 2;
/// Retryable failure (e.g. insufficient points): the fact is re-selected on
/// later runs after a backoff window so a topped-up wallet can settle it.
const USAGE_SETTLEMENT_RETRYABLE_FAILED: i64 = 3;
/// Terminal failure (invalid amount/snapshot): the fact is never retried so
/// permanently unpayable or malformed facts cannot churn the settlement batch.
const USAGE_SETTLEMENT_TERMINAL_FAILED: i64 = 4;
const DECIMAL_SCALE: i128 = 1_000_000_000_000;
const POINTS_PER_MAJOR_UNIT: i128 = 10;
const MIN_BILLABLE_POINT_SCALED: i128 = DECIMAL_SCALE;
const MAX_SETTLEMENT_TRANSACTION_ATTEMPTS: usize = 3;
const SETTLEMENT_RETRY_INITIAL_BACKOFF_MILLIS: u64 = 25;
const SETTLEMENT_RETRY_MAX_BACKOFF_MILLIS: u64 = 250;

type SettlementResult<T> = Result<T, SettlementStoreError>;

#[derive(Debug)]
enum SettlementStoreError {
    RetryableTransaction { sqlstate: &'static str },
    Domain(DomainError),
}

impl SettlementStoreError {
    fn is_retryable_transaction(&self) -> bool {
        matches!(self, Self::RetryableTransaction { .. })
    }

    fn sqlstate(&self) -> Option<&'static str> {
        match self {
            Self::RetryableTransaction { sqlstate } => Some(*sqlstate),
            Self::Domain(_) => None,
        }
    }

    fn into_domain_error(self) -> DomainError {
        match self {
            Self::RetryableTransaction { .. } => {
                DomainError::new("usage settlement transaction retry budget exhausted")
            }
            Self::Domain(error) => error,
        }
    }
}

impl From<DomainError> for SettlementStoreError {
    fn from(error: DomainError) -> Self {
        Self::Domain(error)
    }
}

#[derive(Debug, Clone)]
pub struct PostgresUsageSettlementStore {
    pool: PgPool,
    /// Account-domain wallet store on the shared commerce pool. Usage
    /// settlement debits the USER points wallet through this port — the
    /// account ledger (`acct_*`) is the only writer of balances.
    account_store: PostgresCommerceAccountStore,
}

impl PostgresUsageSettlementStore {
    pub fn new(pool: PgPool, account_store: PostgresCommerceAccountStore) -> Self {
        Self { pool, account_store }
    }
}

impl UsageSettlementStore for PostgresUsageSettlementStore {
    fn settle_pending_usage<'a>(
        &'a self,
        command: UsageSettlementCommand,
    ) -> UsageSettlementFuture<'a> {
        Box::pin(async move {
            settle_pending_usage(&self.pool, &self.account_store, command).await
        })
    }
}

#[derive(Debug, Clone)]
struct UsageFactForSettlement {
    id: i64,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    amount: String,
    currency: String,
    pricing_snapshot_bytes: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
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
    candidates: Vec<SettlementCandidate>,
}

async fn settle_pending_usage(
    pool: &PgPool,
    account_store: &PostgresCommerceAccountStore,
    command: UsageSettlementCommand,
) -> Result<UsageSettlementOutcome, DomainError> {
    let command = command.bounded();
    if command.limit <= 0 {
        return Ok(UsageSettlementOutcome {
            settled_count: 0,
            failed_count: 0,
            debited_points: 0,
        });
    }

    let mut attempt = 0_usize;
    loop {
        match settle_pending_usage_once(pool, account_store, command.clone()).await {
            Ok(outcome) => return Ok(outcome),
            Err(error)
                if error.is_retryable_transaction()
                    && attempt + 1 < MAX_SETTLEMENT_TRANSACTION_ATTEMPTS =>
            {
                tracing::warn!(
                    attempt = attempt + 1,
                    max_attempts = MAX_SETTLEMENT_TRANSACTION_ATTEMPTS,
                    sqlstate = error.sqlstate().unwrap_or_default(),
                    "retrying usage settlement transaction after a retriable PostgreSQL conflict"
                );
                tokio::time::sleep(settlement_retry_delay(attempt)).await;
                attempt += 1;
            }
            Err(error) => return Err(error.into_domain_error()),
        }
    }
}

async fn settle_pending_usage_once(
    pool: &PgPool,
    account_store: &PostgresCommerceAccountStore,
    command: UsageSettlementCommand,
) -> SettlementResult<UsageSettlementOutcome> {
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
        let group_outcome = settle_usage_group(&mut tx, &command, &group, account_store).await?;
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
    tx: &mut Transaction<'_, Postgres>,
    command: &UsageSettlementCommand,
) -> SettlementResult<Vec<UsageFactForSettlement>> {
    let rows = sqlx::query(
        r#"
        SELECT
            CAST(id AS TEXT) AS id,
            CAST(tenant_id AS TEXT) AS tenant_id,
            CAST(organization_id AS TEXT) AS organization_id,
            CAST(COALESCE(user_id, owner_id, 0) AS TEXT) AS user_id,
            CAST(COALESCE(NULLIF(CAST(customer_charge_amount AS TEXT), ''), '0') AS TEXT) AS amount,
            COALESCE(NULLIF(currency, ''), 'USD') AS currency,
            CAST(octet_length(CAST(COALESCE(pricing_snapshot, '{}'::jsonb) AS TEXT)) AS TEXT) AS pricing_snapshot_bytes
        FROM ai_metering_usage
        WHERE ($1 <= 0 OR tenant_id = $1)
          AND ($2 <= 0 OR organization_id = $2)
          AND (
              settlement_status = $3
              OR (
                  settlement_status = $4
                  AND (settled_at IS NULL OR settled_at < now() - interval '5 minutes')
              )
          )
        ORDER BY COALESCE(occurred_at, CURRENT_TIMESTAMP), id
        LIMIT $5
        FOR UPDATE SKIP LOCKED
        "#,
    )
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(USAGE_SETTLEMENT_PENDING)
    .bind(USAGE_SETTLEMENT_RETRYABLE_FAILED)
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
            amount: string_cell(row, "amount"),
            currency: string_cell(row, "currency"),
            pricing_snapshot_bytes: integer_cell(row, "pricing_snapshot_bytes"),
        })
        .collect())
}

async fn collect_settlement_groups(
    tx: &mut Transaction<'_, Postgres>,
    command: &UsageSettlementCommand,
    usage_facts: Vec<UsageFactForSettlement>,
    outcome: &mut UsageSettlementOutcome,
) -> SettlementResult<Vec<SettlementGroup>> {
    let mut groups: BTreeMap<SettlementGroupKey, Vec<SettlementCandidate>> = BTreeMap::new();
    for usage_fact in usage_facts {
        if already_settled(tx, &usage_fact).await? {
            continue;
        }
        if usage_fact.pricing_snapshot_bytes > i64::from(MAX_PRICING_SNAPSHOT_BYTES) {
            mark_invalid_usage_fact_failed(
                tx,
                &usage_fact,
                "INVALID_PRICING_SNAPSHOT",
                "usage pricing snapshot exceeds the settlement byte budget",
            )
            .await?;
            outcome.failed_count += 1;
            continue;
        }
        let scaled_amount = match parse_decimal_scaled(&usage_fact.amount) {
            Ok(amount) => amount,
            Err(error) => {
                mark_invalid_usage_fact_failed(
                    tx,
                    &usage_fact,
                    "INVALID_USAGE_AMOUNT",
                    &error.to_string(),
                )
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
        groups.entry(key).or_default().push(candidate);
    }
    Ok(groups
        .into_values()
        .map(|candidates| SettlementGroup { candidates })
        .collect())
}

async fn mark_invalid_usage_fact_failed(
    tx: &mut Transaction<'_, Postgres>,
    usage_fact: &UsageFactForSettlement,
    failure_code: &str,
    failure_message: &str,
) -> SettlementResult<()> {
    mark_settlement_terminal_failed(
        tx,
        usage_fact,
        usage_fact.id,
        failure_code,
        failure_message,
    )
    .await
}

async fn settle_zero_usage_fact(
    tx: &mut Transaction<'_, Postgres>,
    command: &UsageSettlementCommand,
    usage_fact: &UsageFactForSettlement,
) -> SettlementResult<()> {
    mark_settlement_success(tx, command, usage_fact, usage_fact.id).await
}

async fn already_settled(
    tx: &mut Transaction<'_, Postgres>,
    usage_fact: &UsageFactForSettlement,
) -> SettlementResult<bool> {
    // Settlement state lives on the usage fact itself now that the
    // commerce_settlement bridge is retired. The loader filters pending/failed
    // facts already; this is a defensive guard for concurrent runs.
    let row = sqlx::query(
        r#"
        SELECT 1
        FROM ai_metering_usage
        WHERE tenant_id = $1
          AND organization_id = $2
          AND id = $3
          AND settlement_status = $4
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

async fn settle_usage_group(
    tx: &mut Transaction<'_, Postgres>,
    command: &UsageSettlementCommand,
    group: &SettlementGroup,
    account_store: &PostgresCommerceAccountStore,
) -> SettlementResult<UsageSettlementOutcome> {
    if group.candidates.is_empty() {
        return Ok(empty_outcome());
    }

    let points = charge_points_from_scaled(group_total_scaled(group)?)?;
    if points == 0 {
        defer_usage_group(tx, group).await?;
        return Ok(empty_outcome());
    }

    // Validate that per-candidate rounding sums to the batch total.
    let _ = allocate_candidate_points(&group.candidates, points)?;

    let first_usage_fact = &group.candidates[0].usage_fact;
    let transaction_id = settlement_batch_no(&group.candidates);
    match debit_user_points(account_store, first_usage_fact, points, &transaction_id).await {
        Ok(_) => {
            for candidate in &group.candidates {
                mark_settlement_success(
                    tx,
                    command,
                    &candidate.usage_fact,
                    candidate.usage_fact.id,
                )
                .await?;
            }
            Ok(UsageSettlementOutcome {
                settled_count: group.candidates.len() as i64,
                failed_count: 0,
                debited_points: points,
            })
        }
        Err(error) if error.message() == INSUFFICIENT_BALANCE_MESSAGE => {
            for candidate in &group.candidates {
                mark_settlement_failed(
                    tx,
                    command,
                    &candidate.usage_fact,
                    candidate.usage_fact.id,
                    "INSUFFICIENT_POINTS",
                    "usage settlement account has insufficient points",
                )
                .await?;
            }
            Ok(UsageSettlementOutcome {
                settled_count: 0,
                failed_count: group.candidates.len() as i64,
                debited_points: 0,
            })
        }
        Err(error) => Err(settlement_account_error(error)),
    }
}

/// Debits the USER points wallet through the account-domain port on the
/// shared commerce pool. The batch number is both the transaction number and
/// the idempotency key, so a crash between the debit commit and the usage-fact
/// status update replays idempotently on the next settlement run — the account
/// ledger (`acct_*`) is the only writer of balances.
async fn debit_user_points(
    account_store: &PostgresCommerceAccountStore,
    usage_fact: &UsageFactForSettlement,
    points: i64,
    transaction_id: &str,
) -> Result<(), CommerceServiceError> {
    let append = AppendLedgerEntryCommand {
        tenant_id: usage_fact.tenant_id.to_string(),
        organization_id: Some(usage_fact.organization_id.to_string()),
        owner_user_id: usage_fact.user_id.to_string(),
        account_id: String::new(),
        asset_type: CommerceAccountAssetType::Points,
        currency_code: Some(POINTS_CURRENCY_CODE.to_owned()),
        direction: CommerceLedgerDirection::Debit,
        amount: CommerceMoney::new(&points.to_string())
            .map_err(|error| CommerceServiceError::validation(format!(
                "invalid usage settlement points amount: {error}"
            )))?,
        business_type: USAGE_SETTLEMENT_BUSINESS_TYPE.to_owned(),
        transaction_no: transaction_id.to_owned(),
        request_no: transaction_id.to_owned(),
        idempotency_key: transaction_id.to_owned(),
        owner_type: None,
        account_purpose: None,
        expires_at: None,
        reversed_ledger_id: None,
    };
    let request_hash = settlement_request_hash(&append);
    account_store
        .append_ledger_entry(append, request_hash)
        .await
        .map(|_outcome| ())
}

/// Deterministic request hash for the settlement debit so the account-domain
/// idempotency replay resolves to the same record for the same batch.
fn settlement_request_hash(command: &AppendLedgerEntryCommand) -> CommerceRequestHash {
    let canonical = format!(
        "{}|{}|{}|{}|{}|{}|{}|{}|{}",
        command.tenant_id,
        command.organization_id.as_deref().unwrap_or_default(),
        command.owner_user_id,
        command.asset_type.as_str(),
        command.direction.as_str(),
        command.amount.as_str(),
        command.business_type,
        command.transaction_no,
        command.idempotency_key,
    );
    let digest = sha256_hash(canonical.as_bytes());
    CommerceRequestHash::new(&digest).expect("settlement request hash is never empty")
}

fn settlement_account_error(error: CommerceServiceError) -> SettlementStoreError {
    SettlementStoreError::Domain(DomainError::new(format!(
        "usage settlement account debit failed: {}",
        error.message()
    )))
}

async fn mark_settlement_success(
    tx: &mut Transaction<'_, Postgres>,
    command: &UsageSettlementCommand,
    usage_fact: &UsageFactForSettlement,
    settlement_id: i64,
) -> SettlementResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_metering_usage
        SET settlement_status = $1,
            settlement_id = $2,
            settled_at = $3::timestamp AT TIME ZONE 'UTC'
        WHERE id = $4
        "#,
    )
    .bind(USAGE_SETTLEMENT_SUCCESS)
    .bind(settlement_id)
    .bind(&command.requested_at)
    .bind(usage_fact.id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark usage fact settled", error))?;
    Ok(())
}

async fn mark_settlement_failed(
    tx: &mut Transaction<'_, Postgres>,
    command: &UsageSettlementCommand,
    usage_fact: &UsageFactForSettlement,
    settlement_id: i64,
    failure_code: &str,
    failure_message: &str,
) -> SettlementResult<()> {
    // `settled_at` doubles as the last-attempt timestamp for retryable
    // failures so the loader can back off re-selection (see
    // `FAILED_SETTLEMENT_RETRY_BACKOFF_SQL`).
    sqlx::query(
        r#"
        UPDATE ai_metering_usage
        SET settlement_status = $1,
            settlement_id = $2,
            settled_at = $3::timestamp AT TIME ZONE 'UTC',
            failure_code = $4,
            failure_message = $5
        WHERE id = $6
        "#,
    )
    .bind(USAGE_SETTLEMENT_RETRYABLE_FAILED)
    .bind(settlement_id)
    .bind(&command.requested_at)
    .bind(failure_code)
    .bind(truncate_message(failure_message))
    .bind(usage_fact.id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark usage fact settlement failed", error))?;
    Ok(())
}

/// Terminal failure marker for facts that can never be settled (invalid
/// amount, oversized pricing snapshot). They leave the settlement queue
/// permanently instead of churning the batch on every run.
async fn mark_settlement_terminal_failed(
    tx: &mut Transaction<'_, Postgres>,
    usage_fact: &UsageFactForSettlement,
    settlement_id: i64,
    failure_code: &str,
    failure_message: &str,
) -> SettlementResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_metering_usage
        SET settlement_status = $1,
            settlement_id = $2,
            settled_at = NULL,
            failure_code = $3,
            failure_message = $4
        WHERE id = $5
        "#,
    )
    .bind(USAGE_SETTLEMENT_TERMINAL_FAILED)
    .bind(settlement_id)
    .bind(failure_code)
    .bind(truncate_message(failure_message))
    .bind(usage_fact.id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark usage fact settlement terminally failed", error))?;
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
    tx: &mut Transaction<'_, Postgres>,
    group: &SettlementGroup,
) -> SettlementResult<()> {
    for candidate in &group.candidates {
        sqlx::query(
            r#"
            UPDATE ai_metering_usage
            SET settlement_status = $1
            WHERE id = $2
            "#,
        )
        .bind(USAGE_SETTLEMENT_PENDING)
        .bind(candidate.usage_fact.id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to defer micro usage settlement fact", error))?;
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

fn settlement_retry_delay(attempt: usize) -> Duration {
    let base_backoff_millis = settlement_retry_base_backoff_millis(attempt);
    let jitter_limit = base_backoff_millis / 4;
    let jitter_millis = retry_jitter_millis(jitter_limit);
    Duration::from_millis(
        base_backoff_millis
            .saturating_add(jitter_millis)
            .min(SETTLEMENT_RETRY_MAX_BACKOFF_MILLIS),
    )
}

fn settlement_retry_base_backoff_millis(attempt: usize) -> u64 {
    let shift = u32::try_from(attempt).unwrap_or(u32::MAX).min(4);
    let factor = 1_u64.checked_shl(shift).unwrap_or(u64::MAX);
    SETTLEMENT_RETRY_INITIAL_BACKOFF_MILLIS
        .saturating_mul(factor)
        .min(SETTLEMENT_RETRY_MAX_BACKOFF_MILLIS)
}

fn retry_jitter_millis(max_jitter_millis: u64) -> u64 {
    if max_jitter_millis == 0 {
        return 0;
    }

    let mut entropy = [0_u8; 8];
    if getrandom::fill(&mut entropy).is_err() {
        return 0;
    }
    u64::from_le_bytes(entropy) % (max_jitter_millis + 1)
}

fn retryable_postgres_sqlstate(sqlstate: &str) -> Option<&'static str> {
    match sqlstate {
        "40001" => Some("40001"),
        "40P01" => Some("40P01"),
        _ => None,
    }
}

fn truncate_message(message: &str) -> String {
    message.chars().take(500).collect()
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column).ok().flatten()
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    optional_string_cell(row, column).unwrap_or_default()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
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

fn store_error(context: &'static str, error: sqlx::Error) -> SettlementStoreError {
    if let sqlx::Error::Database(database_error) = &error {
        if let Some(sqlstate) = database_error
            .code()
            .and_then(|sqlstate| retryable_postgres_sqlstate(sqlstate.as_ref()))
        {
            return SettlementStoreError::RetryableTransaction { sqlstate };
        }
    }
    SettlementStoreError::Domain(redacted_store_error(context, error))
}

#[cfg(test)]
mod tests {
    use super::{retryable_postgres_sqlstate, settlement_retry_base_backoff_millis};

    #[test]
    fn settlement_retry_only_accepts_postgres_serialization_and_deadlock_codes() {
        assert_eq!(Some("40001"), retryable_postgres_sqlstate("40001"));
        assert_eq!(Some("40P01"), retryable_postgres_sqlstate("40P01"));
        assert_eq!(None, retryable_postgres_sqlstate("23505"));
        assert_eq!(None, retryable_postgres_sqlstate("55P03"));
    }

    #[test]
    fn settlement_retry_backoff_is_bounded() {
        assert_eq!(25, settlement_retry_base_backoff_millis(0));
        assert_eq!(50, settlement_retry_base_backoff_millis(1));
        assert_eq!(100, settlement_retry_base_backoff_millis(2));
        assert_eq!(200, settlement_retry_base_backoff_millis(3));
        assert_eq!(250, settlement_retry_base_backoff_millis(4));
        assert_eq!(250, settlement_retry_base_backoff_millis(20));
    }
}
