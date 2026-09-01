use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::Duration;

use sdkwork_account_service::{AccountLedgerAppendPort, AppendLedgerEntryCommand};
use sdkwork_contract_service::{
    CommerceAccountAssetType, CommerceLedgerDirection, CommerceMoney, CommerceRequestHash,
    CommerceServiceError,
};
use crate::infrastructure::decimal_math::{decimal_to_scaled, scaled_to_decimal, DecimalRounding};
use sdkwork_utils_rust::sha256_hash;
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::DomainError;
use crate::infrastructure::sql::postgres::admin_marketing_store::load_recharge_settings_model;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    parse_recharge_settings_model, token_points_for_charge, AdminMarketingSubject,
    RechargeSettingsModel, UsageSettlementCommand, UsageSettlementFuture, UsageSettlementOutcome,
    UsageSettlementStore, MAX_PRICING_SNAPSHOT_BYTES,
};

/// Token Bank currency label (matches the account-platform convention used by
/// the gateway balance endpoint, which reads the same Token Bank wallet).
const TOKEN_BANK_CURRENCY_CODE: &str = "TOKEN_BANK";
const USAGE_SETTLEMENT_BUSINESS_TYPE: &str = "usage_settlement";
/// Stable account-domain contract message for a debit that the wallet cannot
/// satisfy (either the token bank account is missing or its balance is too low).
const INSUFFICIENT_BALANCE_MESSAGE: &str = "insufficient account balance";
const USAGE_SETTLEMENT_PENDING: i64 = 0;
const USAGE_SETTLEMENT_SUCCESS: i64 = 2;
/// Retryable failure (e.g. insufficient token balance): the fact is
/// re-selected on later runs after a backoff window so a topped-up wallet can
/// settle it.
const USAGE_SETTLEMENT_RETRYABLE_FAILED: i64 = 3;
/// Terminal failure (invalid amount/snapshot): the fact is never retried so
/// permanently unpayable or malformed facts cannot churn the settlement batch.
const USAGE_SETTLEMENT_TERMINAL_FAILED: i64 = 4;
const MICRO_SETTLEMENT_MAX_AGE_SECONDS: i64 = 15 * 60;
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
    /// Account-domain ledger append port on the shared commerce pool. Usage
    /// settlement debits the USER token bank wallet through this port — the
    /// account ledger (`acct_*`) is the only writer of balances. The concrete
    /// repository is injected at runtime by the wiring layer.
    account_store: Arc<dyn AccountLedgerAppendPort + Send + Sync>,
}

impl PostgresUsageSettlementStore {
    pub fn new(
        pool: PgPool,
        account_store: Arc<dyn AccountLedgerAppendPort + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            account_store,
        }
    }
}

impl UsageSettlementStore for PostgresUsageSettlementStore {
    fn settle_pending_usage<'a>(
        &'a self,
        command: UsageSettlementCommand,
    ) -> UsageSettlementFuture<'a> {
        Box::pin(async move {
            settle_pending_usage(&self.pool, self.account_store.as_ref(), command).await
        })
    }
}

#[derive(Debug, Clone)]
struct UsageFactForSettlement {
    id: i64,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    request_id: String,
    billing_meter_code: String,
    amount: String,
    currency: String,
    pricing_snapshot_bytes: i64,
    occurred_at_epoch: i64,
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
    account_store: &dyn AccountLedgerAppendPort,
    command: UsageSettlementCommand,
) -> Result<UsageSettlementOutcome, DomainError> {
    let command = command.bounded();
    if command.limit <= 0 {
        return Ok(UsageSettlementOutcome {
            settled_count: 0,
            failed_count: 0,
            debited_tokens: 0,
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
    account_store: &dyn AccountLedgerAppendPort,
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
        debited_tokens: 0,
    };
    let groups = collect_settlement_groups(&mut tx, &command, usage_facts, &mut outcome).await?;
    for group in groups {
        let first = &group.candidates[0].usage_fact;
        let settings = load_group_settings(
            pool,
            first.tenant_id,
            first.organization_id,
            first.user_id,
        )
        .await?;
        let group_outcome =
            settle_usage_group(&mut tx, &command, &group, &settings, account_store).await?;
        outcome.settled_count += group_outcome.settled_count;
        outcome.failed_count += group_outcome.failed_count;
        outcome.debited_tokens += group_outcome.debited_tokens;
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
            request_id,
            billing_meter_code,
            CAST(COALESCE(NULLIF(CAST(customer_charge_amount AS TEXT), ''), '0') AS TEXT) AS amount,
            COALESCE(NULLIF(currency, ''), 'USD') AS currency,
            CAST(octet_length(CAST(COALESCE(pricing_snapshot, '{}'::jsonb) AS TEXT)) AS TEXT) AS pricing_snapshot_bytes,
            CAST(EXTRACT(EPOCH FROM COALESCE(occurred_at, CURRENT_TIMESTAMP)) AS BIGINT) AS occurred_at_epoch
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
            request_id: string_cell(row, "request_id"),
            billing_meter_code: string_cell(row, "billing_meter_code"),
            amount: string_cell(row, "amount"),
            currency: string_cell(row, "currency"),
            pricing_snapshot_bytes: integer_cell(row, "pricing_snapshot_bytes"),
            occurred_at_epoch: integer_cell(row, "occurred_at_epoch"),
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
                command,
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
                    command,
                    &usage_fact,
                    "INVALID_USAGE_AMOUNT",
                    &error.to_string(),
                )
                .await?;
                outcome.failed_count += 1;
                continue;
            }
        };
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
    command: &UsageSettlementCommand,
    usage_fact: &UsageFactForSettlement,
    failure_code: &str,
    failure_message: &str,
) -> SettlementResult<()> {
    mark_settlement_terminal_failed(
        tx,
        command,
        usage_fact,
        usage_fact.id,
        failure_code,
        failure_message,
    )
    .await
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

async fn load_group_settings(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
) -> SettlementResult<RechargeSettingsModel> {
    // Tenant-scoped cash→points rule first; falls back to the platform catalog
    // and finally to the model defaults (CNY base, 10 points/CNY, USD→CNY 7).
    load_recharge_settings_model(
        pool,
        AdminMarketingSubject {
            tenant_id,
            organization_id,
            operator_id: user_id,
            operator_type: 1,
        },
    )
    .await
    .or_else(|_| parse_recharge_settings_model(None, None, None))
    .map_err(Into::into)
}

async fn settle_usage_group(
    tx: &mut Transaction<'_, Postgres>,
    command: &UsageSettlementCommand,
    group: &SettlementGroup,
    settings: &RechargeSettingsModel,
    account_store: &dyn AccountLedgerAppendPort,
) -> SettlementResult<UsageSettlementOutcome> {
    if group.candidates.is_empty() {
        return Ok(empty_outcome());
    }
    let currency = &group.candidates[0].usage_fact.currency;

    let mut candidates_by_request: BTreeMap<String, Vec<SettlementCandidate>> = BTreeMap::new();
    for candidate in &group.candidates {
        candidates_by_request
            .entry(candidate.usage_fact.request_id.clone())
            .or_default()
            .push(candidate.clone());
    }

    let mut outcome = empty_outcome();
    // Never combine different invocation request ids into one Account ledger
    // append. Account's idempotency and recovery contract has one request_no
    // per ledger entry; a cross-request batch would let a crash after the
    // debit commit re-charge every request except the one whose request_no
    // was written on the entry. Keep aggregation bounded to one request.
    let mut unreserved_by_request: BTreeMap<String, Vec<SettlementCandidate>> = BTreeMap::new();
    for candidates in candidates_by_request.into_values() {
        let request_id = candidates[0].usage_fact.request_id.clone();
        let first_usage_fact = &candidates[0].usage_fact;
        // A synchronous settlement can commit its account ledger entry and
        // then lose the following usage-status update (for example, a
        // database connection failure). The usage fact remains pending and
        // is later picked up by this worker. Reusing the request-scoped
        // settlement marker makes that recovery idempotent instead of
        // charging the request a second time.
        if has_existing_request_settlement(tx, first_usage_fact).await? {
            for candidate in &candidates {
                mark_settlement_success(
                    tx,
                    command,
                    &candidate.usage_fact,
                    candidate.usage_fact.id,
                )
                .await?;
            }
            outcome.settled_count += candidates.len() as i64;
            continue;
        }
        let reserved_tokens = precharge_tokens(tx, first_usage_fact).await?;
        if reserved_tokens == 0 {
            // A zero-priced usage fact is a valid, terminal accounting fact.
            // It must not be kept pending until the micro-settlement age
            // threshold (which is only for positive sub-token amounts).
            let mut positive_candidates = Vec::with_capacity(candidates.len());
            for candidate in candidates {
                if candidate.scaled_amount == 0 {
                    mark_settlement_success(
                        tx,
                        command,
                        &candidate.usage_fact,
                        candidate.usage_fact.id,
                    )
                    .await?;
                    outcome.settled_count += 1;
                } else {
                    positive_candidates.push(candidate);
                }
            }
            if !positive_candidates.is_empty() {
                unreserved_by_request
                    .entry(request_id)
                    .or_default()
                    .extend(positive_candidates);
            }
            continue;
        }
        // A synchronous precharge already established a per-request token
        // reservation. Its final amount must use the same upward rounding as
        // the synchronous interceptor, even when the request is below the
        // worker's cross-request micro-amount aggregation threshold.
        let actual_tokens =
            charge_precharged_tokens(candidate_total_scaled(&candidates)?, currency, settings)?;
        let transaction_id = if actual_tokens > reserved_tokens {
            format!(
                "cloudrouter:{}:async-adjust-debit",
                first_usage_fact.request_id
            )
        } else {
            format!(
                "cloudrouter:{}:async-adjust-credit",
                first_usage_fact.request_id
            )
        };
        let request_outcome = settle_candidates(
            tx,
            command,
            &candidates,
            account_store,
            settings,
            reserved_tokens,
            actual_tokens,
            &transaction_id,
        )
        .await?;
        add_outcome(&mut outcome, request_outcome);
    }

    for candidates in unreserved_by_request.into_values() {
        let total_scaled = candidate_total_scaled(&candidates)?;
        let mut actual_tokens = charge_tokens_from_scaled(total_scaled, currency, settings)?;
        if actual_tokens == 0 && total_scaled > 0 && candidates.iter().any(micro_candidate_expired)
        {
            // Do not leave a positive billable amount pending forever just
            // because it is below one Token Bank unit. The same ceil rule as
            // synchronous settlement is applied once the bounded wait has
            // elapsed; a true zero amount remains free.
            actual_tokens = 1;
        }
        if actual_tokens == 0 {
            defer_usage_candidates(tx, &candidates).await?;
        } else {
            // `candidates` contains one request id only, so this operation's
            // request_no and idempotency key cover every fact in the group.
            let transaction_id = settlement_batch_no(&candidates);
            let postpaid_outcome = settle_candidates(
                tx,
                command,
                &candidates,
                account_store,
                settings,
                0,
                actual_tokens,
                &transaction_id,
            )
            .await?;
            add_outcome(&mut outcome, postpaid_outcome);
        }
    }

    Ok(outcome)
}

fn micro_candidate_expired(candidate: &SettlementCandidate) -> bool {
    let now = chrono::Utc::now().timestamp();
    candidate
        .usage_fact
        .occurred_at_epoch
        .saturating_add(MICRO_SETTLEMENT_MAX_AGE_SECONDS)
        <= now
}

async fn has_existing_request_settlement(
    tx: &mut Transaction<'_, Postgres>,
    usage_fact: &UsageFactForSettlement,
) -> SettlementResult<bool> {
    let request_id = &usage_fact.request_id;
    // The synchronous gateway path now settles each hold with a single ledger
    // debit (`business_no = cloudrouter:<request_id>:consumption`), so recovery
    // must recognize that marker. The legacy sync postpaid and async-worker
    // reconciliation suffixes are kept for backwards compatibility with
    // historical and asynchronous records.
    let sync_consumption = format!("cloudrouter:{request_id}:consumption");
    let sync_adjust_debit = format!("cloudrouter:{request_id}:adjust-debit");
    let sync_adjust_credit = format!("cloudrouter:{request_id}:adjust-credit");
    let sync_postpaid = format!("cloudrouter:{request_id}:postpaid");
    let async_adjust_debit = format!("cloudrouter:{request_id}:async-adjust-debit");
    let async_adjust_credit = format!("cloudrouter:{request_id}:async-adjust-credit");
    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS (
            SELECT 1
            FROM acct_ledger_entry
            WHERE tenant_id = $1
              AND request_no = $2
              AND organization_id = $3
              AND asset_code = 'token_bank'
              AND business_no IN ($4, $5, $6, $7, $8, $9)
        )
        "#,
    )
    .bind(usage_fact.tenant_id)
    .bind(request_id)
    .bind(usage_fact.organization_id)
    .bind(sync_consumption)
    .bind(sync_adjust_debit)
    .bind(sync_adjust_credit)
    .bind(sync_postpaid)
    .bind(async_adjust_debit)
    .bind(async_adjust_credit)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load existing invocation settlement", error))?;
    Ok(exists)
}

#[allow(clippy::too_many_arguments)]
async fn settle_candidates(
    tx: &mut Transaction<'_, Postgres>,
    command: &UsageSettlementCommand,
    candidates: &[SettlementCandidate],
    account_store: &dyn AccountLedgerAppendPort,
    settings: &RechargeSettingsModel,
    reserved_tokens: i64,
    actual_tokens: i64,
    transaction_id: &str,
) -> SettlementResult<UsageSettlementOutcome> {
    let first_usage_fact = &candidates[0].usage_fact;
    let (direction, tokens, transaction_id) = if reserved_tokens > 0 {
        if actual_tokens > reserved_tokens {
            (
                CommerceLedgerDirection::Debit,
                actual_tokens - reserved_tokens,
                transaction_id.to_owned(),
            )
        } else if reserved_tokens > actual_tokens {
            (
                CommerceLedgerDirection::Credit,
                reserved_tokens - actual_tokens,
                transaction_id.to_owned(),
            )
        } else {
            (CommerceLedgerDirection::Debit, 0, String::new())
        }
    } else {
        (
            CommerceLedgerDirection::Debit,
            actual_tokens,
            transaction_id.to_owned(),
        )
    };

    // Validate that per-candidate rounding sums to the batch total before
    // touching the account ledger. This also keeps a zero-amount request
    // eligible for releasing a precharge reservation.
    let _ = allocate_candidate_tokens(candidates, actual_tokens, settings)?;
    let ledger_result = if tokens == 0 {
        Ok(())
    } else {
        append_user_token_bank(
            account_store,
            first_usage_fact,
            tokens,
            direction.clone(),
            &transaction_id,
        )
        .await
    };
    match ledger_result {
        Ok(_) => {
            for candidate in candidates {
                mark_settlement_success(
                    tx,
                    command,
                    &candidate.usage_fact,
                    candidate.usage_fact.id,
                )
                .await?;
            }
            Ok(UsageSettlementOutcome {
                settled_count: candidates.len() as i64,
                failed_count: 0,
                debited_tokens: if direction == CommerceLedgerDirection::Debit {
                    tokens
                } else {
                    0
                },
            })
        }
        Err(error) if error.message() == INSUFFICIENT_BALANCE_MESSAGE => {
            for candidate in candidates {
                mark_settlement_failed(
                    tx,
                    command,
                    &candidate.usage_fact,
                    candidate.usage_fact.id,
                    "INSUFFICIENT_TOKEN_BANK",
                    "usage settlement account has insufficient token bank balance",
                )
                .await?;
            }
            Ok(UsageSettlementOutcome {
                settled_count: 0,
                failed_count: candidates.len() as i64,
                debited_tokens: 0,
            })
        }
        Err(error) => Err(settlement_account_error(error)),
    }
}

/// Debits the USER Token Bank wallet through the account-domain port on the
/// shared commerce pool. The Token Bank is the wallet the gateway balance
/// endpoint and the app token wallet surface read, so settlement must draw
/// from the same asset; debiting the separate Points wallet would leave users
/// with a visible balance they cannot actually spend. The batch number is
/// both the transaction number and the idempotency key, so a crash between
/// the debit commit and the usage-fact status update replays idempotently on
/// the next settlement run — the account ledger (`acct_*`) is the only writer
/// of balances.
async fn append_user_token_bank(
    account_store: &dyn AccountLedgerAppendPort,
    usage_fact: &UsageFactForSettlement,
    tokens: i64,
    direction: CommerceLedgerDirection,
    transaction_id: &str,
) -> Result<(), CommerceServiceError> {
    let append = AppendLedgerEntryCommand {
        tenant_id: usage_fact.tenant_id.to_string(),
        organization_id: Some(usage_fact.organization_id.to_string()),
        owner_user_id: usage_fact.user_id.to_string(),
        account_id: String::new(),
        asset_type: CommerceAccountAssetType::TokenBank,
        currency_code: Some(TOKEN_BANK_CURRENCY_CODE.to_owned()),
        direction,
        amount: CommerceMoney::new(&tokens.to_string()).map_err(|error| {
            CommerceServiceError::validation(format!(
                "invalid usage settlement token amount: {error}"
            ))
        })?,
        business_type: USAGE_SETTLEMENT_BUSINESS_TYPE.to_owned(),
        transaction_no: transaction_id.to_owned(),
        // Keep the original invocation request number on every settlement
        // entry. Recovery probes are request-scoped, while transaction_no /
        // idempotency_key remain the operation-specific replay keys.
        request_no: usage_fact.request_id.clone(),
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

async fn precharge_tokens(
    tx: &mut Transaction<'_, Postgres>,
    usage_fact: &UsageFactForSettlement,
) -> SettlementResult<i64> {
    // `PostgresGatewayBillingStore` stores the deterministic transaction
    // number in acct_ledger_entry.business_no. `business_type` is the stable
    // category (`gateway_invocation_billing`), so querying business_no with
    // the category silently treated every precharged request as postpaid and
    // charged the full amount a second time in asynchronous settlement.
    let transaction_no = format!("cloudrouter:{}:precharge", usage_fact.request_id);
    let amount = sqlx::query_scalar::<_, Option<i64>>(
        r#"
        SELECT COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE -amount END), 0)
        FROM acct_ledger_entry
        WHERE tenant_id = $1
          AND request_no = $2
          AND organization_id = $3
          AND business_no = $4
          AND asset_code = 'token_bank'
        "#,
    )
    .bind(usage_fact.tenant_id)
    .bind(&usage_fact.request_id)
    .bind(usage_fact.organization_id)
    .bind(transaction_no)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load invocation precharge", error))?;
    Ok(amount.unwrap_or(0).max(0))
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
          AND tenant_id = $5
          AND organization_id = $6
        "#,
    )
    .bind(USAGE_SETTLEMENT_SUCCESS)
    .bind(settlement_id)
    .bind(&command.requested_at)
    .bind(usage_fact.id)
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark usage fact settled", error))?;
    sync_charge_line_settlement(
        tx,
        usage_fact,
        "settled",
        Some(settlement_id),
        Some(&command.requested_at),
    )
    .await
}

/// Mirrors a settled or terminally failed usage fact onto its shadow-write
/// charge line in the same transaction, so the new billing ledger and the
/// legacy settlement input can never disagree. Charge lines are linked to the
/// usage fact through the measurement/decision chain that the gateway usage
/// recorder persists in one transaction: `measurement.invocation_id` is the
/// gateway request id and `charge.meter_code` is the billing meter code, which
/// together identify the exact `(request_id, usage_type)` fact row. Retryable
/// failures keep the charge line `rated` so a topped-up wallet settles it on a
/// later run.
async fn sync_charge_line_settlement(
    tx: &mut Transaction<'_, Postgres>,
    usage_fact: &UsageFactForSettlement,
    charge_status: &str,
    settlement_id: Option<i64>,
    settled_at: Option<&str>,
) -> SettlementResult<()> {
    sqlx::query(
        r#"
        UPDATE cloudrouter_charge_line charge
        SET charge_status = $4,
            settlement_id = $5,
            settled_at = $6::timestamp AT TIME ZONE 'UTC'
        FROM cloudrouter_rating_decision decision
        JOIN cloudrouter_usage_measurement measurement
          ON measurement.id = decision.measurement_id
        WHERE charge.rating_decision_id = decision.id
          AND charge.tenant_id = $1
          AND charge.organization_id = $2
          AND measurement.invocation_id = $3
          AND charge.meter_code = $7
          AND charge.charge_status = 'rated'
        "#,
    )
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .bind(&usage_fact.request_id)
    .bind(charge_status)
    .bind(settlement_id)
    .bind(settled_at)
    .bind(&usage_fact.billing_meter_code)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to sync charge line settlement", error))?;
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
          AND tenant_id = $7
          AND organization_id = $8
        "#,
    )
    .bind(USAGE_SETTLEMENT_RETRYABLE_FAILED)
    .bind(settlement_id)
    .bind(&command.requested_at)
    .bind(failure_code)
    .bind(truncate_message(failure_message))
    .bind(usage_fact.id)
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
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
    command: &UsageSettlementCommand,
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
          AND tenant_id = $6
          AND organization_id = $7
        "#,
    )
    .bind(USAGE_SETTLEMENT_TERMINAL_FAILED)
    .bind(settlement_id)
    .bind(failure_code)
    .bind(truncate_message(failure_message))
    .bind(usage_fact.id)
    .bind(usage_fact.tenant_id)
    .bind(usage_fact.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| {
        store_error(
            "failed to mark usage fact settlement terminally failed",
            error,
        )
    })?;
    sync_charge_line_settlement(
        tx,
        usage_fact,
        "failed",
        Some(settlement_id),
        Some(&command.requested_at),
    )
    .await
}

fn charge_tokens_from_scaled(
    scaled: i128,
    currency: &str,
    settings: &RechargeSettingsModel,
) -> Result<i64, DomainError> {
    token_points_for_charge(&scaled_to_amount_string(scaled), currency, settings)
}

fn charge_precharged_tokens(
    scaled: i128,
    currency: &str,
    settings: &RechargeSettingsModel,
) -> Result<i64, DomainError> {
    token_points_for_charge(&scaled_to_amount_string(scaled), currency, settings)
}

/// Reconstructs a scale-12 billing amount string (e.g. `0.000000000001`) from
/// its integer scaled representation so the shared charge→points conversion
/// (`token_points_for_charge`) can parse it back losslessly. Delegates to the
/// shared `scaled_to_decimal` formatter (settlement inputs are non-negative).
fn scaled_to_amount_string(scaled: i128) -> String {
    scaled_to_decimal(scaled, 12).unwrap_or_else(|_| "0".to_owned())
}

fn candidate_total_scaled(candidates: &[SettlementCandidate]) -> Result<i128, DomainError> {
    candidates.iter().try_fold(0_i128, |total, candidate| {
        total
            .checked_add(candidate.scaled_amount)
            .ok_or_else(|| DomainError::new("usage settlement amount is too large"))
    })
}

fn settlement_no(usage_fact_id: i64) -> String {
    format!("usage-settlement-{usage_fact_id}")
}

fn allocate_candidate_tokens(
    candidates: &[SettlementCandidate],
    total_tokens: i64,
    settings: &RechargeSettingsModel,
) -> Result<Vec<i64>, DomainError> {
    let currency = &candidates[0].usage_fact.currency;
    let mut allocations = Vec::with_capacity(candidates.len());
    let mut cumulative_amount = 0_i128;
    let mut allocated_tokens = 0_i64;
    for candidate in candidates {
        cumulative_amount = cumulative_amount
            .checked_add(candidate.scaled_amount)
            .ok_or_else(|| DomainError::new("usage settlement amount is too large"))?;
        let cumulative_tokens = charge_tokens_from_scaled(cumulative_amount, currency, settings)?;
        let candidate_tokens = cumulative_tokens
            .checked_sub(allocated_tokens)
            .ok_or_else(|| DomainError::new("usage settlement token allocation underflow"))?;
        allocations.push(candidate_tokens);
        allocated_tokens = cumulative_tokens;
    }
    if allocated_tokens != total_tokens {
        return Err(DomainError::new(
            "usage settlement token allocation does not match batch total",
        ));
    }
    Ok(allocations)
}

fn empty_outcome() -> UsageSettlementOutcome {
    UsageSettlementOutcome {
        settled_count: 0,
        failed_count: 0,
        debited_tokens: 0,
    }
}

fn add_outcome(total: &mut UsageSettlementOutcome, item: UsageSettlementOutcome) {
    total.settled_count += item.settled_count;
    total.failed_count += item.failed_count;
    total.debited_tokens += item.debited_tokens;
}

async fn defer_usage_candidates(
    tx: &mut Transaction<'_, Postgres>,
    candidates: &[SettlementCandidate],
) -> SettlementResult<()> {
    for candidate in candidates {
        sqlx::query(
            r#"
            UPDATE ai_metering_usage
            SET settlement_status = $1
            WHERE id = $2
              AND tenant_id = $3
              AND organization_id = $4
            "#,
        )
        .bind(USAGE_SETTLEMENT_PENDING)
        .bind(candidate.usage_fact.id)
        .bind(candidate.usage_fact.tenant_id)
        .bind(candidate.usage_fact.organization_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to defer micro usage settlement fact", error))?;
    }
    Ok(())
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
    // Settlement amounts are authoritative ≤12-decimal values, so a longer
    // fraction must be rejected rather than silently rounded by the shared
    // parser (which rounds excess fractional digits by design).
    if let Some((_, fraction)) = value.split_once('.') {
        if fraction.len() > 12 {
            return Err(DomainError::new(format!(
                "invalid usage settlement amount: {value}"
            )));
        }
    }
    decimal_to_scaled(value, 12, DecimalRounding::Floor)
        .map_err(|error| DomainError::new(error.to_string()))
}

fn settlement_batch_no(candidates: &[SettlementCandidate]) -> String {
    if candidates.len() == 1 {
        return settlement_no(candidates[0].usage_fact.id);
    }
    let mut ids: Vec<String> = candidates
        .iter()
        .map(|candidate| candidate.usage_fact.id.to_string())
        .collect();
    ids.sort();
    let digest = sha256_hash(ids.join(",").as_bytes());
    format!("usage-settlement-batch-{digest}")
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
