use std::sync::Arc;

use sdkwork_account_repository_sqlx::PostgresCommerceAccountStore;
use sdkwork_account_service::{AppendLedgerEntryCommand, WalletAccountListQuery};
use sdkwork_cloudrouter_router_service::domain::DomainError;
use sdkwork_cloudrouter_router_service::ports::{
    parse_recharge_settings_model, CustomerChargeMode, GatewayBillingAmount,
    GatewayBillingContext, GatewayBillingFuture, GatewayBillingSettlementMode, GatewayBillingStore,
    RechargeSettingsModel,
};
use sdkwork_contract_service::{
    CommerceAccountAssetType, CommerceLedgerDirection, CommerceMoney, CommerceRequestHash,
};
use sqlx::{PgPool, Row};
use std::collections::BTreeMap;

const BUSINESS_TYPE: &str = "gateway_invocation_billing";
const TOKEN_BANK_CURRENCY_CODE: &str = "TOKEN_BANK";
/// Active cash→points exchange rule marker (mirrors sdkwork-order). The
/// recharge settings model is parsed from this rule's base points-per-CNY
/// rate plus its child currency→CNY rates, and is reused for usage debit
/// conversion so a funded wallet and a charged fiat amount stay consistent.
const CASH_TO_POINTS_RULE_NO: &str = "CASH_TO_POINTS";
const PLATFORM_CATALOG_ORGANIZATION_ID: i64 = 0;
const ENV_PLATFORM_CATALOG_TENANT_ID: &str = "SDKWORK_ORDER_PLATFORM_CATALOG_TENANT_ID";
const DEFAULT_PLATFORM_CATALOG_TENANT_ID: i64 = 100_001;

pub struct PostgresGatewayBillingStore {
    pool: PgPool,
    account_store: Arc<PostgresCommerceAccountStore>,
    settlement_mode: GatewayBillingSettlementMode,
    settlement_worker_enabled: bool,
}

impl PostgresGatewayBillingStore {
    pub fn new(
        pool: PgPool,
        account_store: Arc<PostgresCommerceAccountStore>,
        settlement_worker_enabled: bool,
    ) -> Self {
        let settlement_mode = match std::env::var("SDKWORK_CLOUDROUTER_BILLING_SETTLEMENT_MODE")
            .ok()
            .as_deref()
            .map(|value| value.trim().to_ascii_lowercase())
            .as_deref()
        {
            Some("async") | Some("asynchronous") => GatewayBillingSettlementMode::Asynchronous,
            _ => GatewayBillingSettlementMode::Synchronous,
        };
        Self {
            pool,
            account_store,
            settlement_mode,
            settlement_worker_enabled,
        }
    }

    async fn account(
        &self,
        context: &GatewayBillingContext,
    ) -> Result<sdkwork_account_service::WalletAccountItem, DomainError> {
        let query = WalletAccountListQuery::new(
            &context.tenant_id.to_string(),
            Some(&context.organization_id.to_string()),
            &context.user_id.to_string(),
            Some(CommerceAccountAssetType::TokenBank),
        )
        .map_err(|error| DomainError::new(error.message().to_owned()))?;
        self.account_store
            .retrieve_wallet_account_for_asset(query, CommerceAccountAssetType::TokenBank)
            .await
            .map_err(|error| DomainError::new(error.message().to_owned()))
    }

    async fn append(
        &self,
        context: &GatewayBillingContext,
        amount: &GatewayBillingAmount,
        direction: CommerceLedgerDirection,
        suffix: &str,
    ) -> Result<(), DomainError> {
        if amount.amount == "0" {
            return Ok(());
        }
        if amount
            .amount
            .parse::<i128>()
            .map_or(true, |value| value < 0)
        {
            return Err(DomainError::new(
                "billing ledger amount must be a non-negative integer",
            ));
        }
        let account = self.account(context).await?;
        let money = CommerceMoney::new(&amount.amount)
            .map_err(|error| DomainError::new(error.to_owned()))?;
        let transaction_no = format!("cloudrouter:{}:{}", context.request_id, suffix);
        let idempotency_key = transaction_no.clone();
        let command = AppendLedgerEntryCommand::new(
            &context.tenant_id.to_string(),
            Some(&context.organization_id.to_string()),
            &account.id,
            &context.user_id.to_string(),
            CommerceAccountAssetType::TokenBank,
            // Token Bank is an account asset, not a fiat pricing currency.
            // Pricing may be expressed in USD or another display currency,
            // but the account ledger must always target its canonical asset
            // currency or the debit can land in a non-spendable wallet.
            Some(TOKEN_BANK_CURRENCY_CODE),
            direction,
            money,
            BUSINESS_TYPE,
            &transaction_no,
            &context.request_id,
            &idempotency_key,
        )
        .map_err(|error| DomainError::new(error.message().to_owned()))?;
        // The account service treats an idempotency key with a different
        // request hash as payload drift. Hash the complete immutable ledger
        // command, not only the transaction number; pricing/config changes
        // must never be silently replayed as the old amount or direction.
        let request_hash_payload = format!(
            "{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}",
            command.tenant_id,
            command.organization_id.as_deref().unwrap_or_default(),
            account.id,
            command.owner_user_id,
            command.asset_type.as_str(),
            command.currency_code.as_deref().unwrap_or_default(),
            command.direction.as_str(),
            command.amount.as_str(),
            command.business_type,
            command.transaction_no,
            command.request_no,
            command.idempotency_key,
        );
        let hash = CommerceRequestHash::new(&sha256_hex(&request_hash_payload))
            .map_err(|error| DomainError::new(error.message().to_owned()))?;
        self.account_store
            .append_ledger_entry(command, hash)
            .await
            .map_err(|error| DomainError::new(error.message().to_owned()))?;
        Ok(())
    }
}

impl GatewayBillingStore for PostgresGatewayBillingStore {
    fn settlement_mode(&self) -> GatewayBillingSettlementMode {
        self.settlement_mode
    }

    fn customer_settlement_mode<'a>(
        &'a self,
        context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, GatewayBillingSettlementMode> {
        Box::pin(async move {
            let row = sqlx::query_scalar::<_, Option<String>>(
                "SELECT metadata->>'settlementMode' FROM cloudrouter_pricing_plan WHERE tenant_id IN ($1, 0) AND organization_id IN ($2, 0) AND plan_code = $3 AND deleted_at IS NULL ORDER BY (tenant_id = $1) DESC, (organization_id = $2) DESC, effective_from DESC, id DESC LIMIT 1",
            )
            .bind(context.tenant_id)
            .bind(context.organization_id)
            .bind(&context.pricing_plan_code)
            .fetch_optional(&self.pool)
            .await
            .map_err(|error| DomainError::new(error.to_string()))?
            .flatten();
            let mode = parse_settlement_mode(row.as_deref(), self.settlement_mode)?;
            if mode == GatewayBillingSettlementMode::Asynchronous && !self.settlement_worker_enabled
            {
                return Err(DomainError::new(
                    "asynchronous billing requires an enabled usage settlement worker",
                ));
            }
            Ok(mode)
        })
    }

    fn customer_charge_mode<'a>(
        &'a self,
        context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, CustomerChargeMode> {
        Box::pin(async move {
            let row = sqlx::query_scalar::<_, Option<String>>(
                "SELECT metadata->>'chargeMode' FROM cloudrouter_pricing_plan WHERE tenant_id IN ($1, 0) AND organization_id IN ($2, 0) AND plan_code = $3 AND deleted_at IS NULL ORDER BY (tenant_id = $1) DESC, (organization_id = $2) DESC, effective_from DESC, id DESC LIMIT 1",
            )
            .bind(context.tenant_id)
            .bind(context.organization_id)
            .bind(&context.pricing_plan_code)
            .fetch_optional(&self.pool)
            .await
            .map_err(|error| DomainError::new(error.to_string()))?
            .flatten();
            parse_charge_mode(row.as_deref())
        })
    }

    fn load_cash_to_points_settings<'a>(
        &'a self,
        context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, RechargeSettingsModel> {
        Box::pin(async move {
            load_cash_to_points_settings(&self.pool, context.tenant_id, context.organization_id)
                .await
        })
    }

    fn precharge<'a>(
        &'a self,
        context: GatewayBillingContext,
        amount: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async move {
            self.append(
                &context,
                &amount,
                CommerceLedgerDirection::Debit,
                "precharge",
            )
            .await
        })
    }

    fn settle<'a>(
        &'a self,
        context: GatewayBillingContext,
        reserved: GatewayBillingAmount,
        actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async move {
            if reserved.currency != actual.currency {
                return Err(DomainError::new("billing settlement currency mismatch"));
            }
            let reserved_value = reserved
                .amount
                .parse::<i128>()
                .map_err(|_| DomainError::new("invalid reserved billing amount"))?;
            let actual_value = actual
                .amount
                .parse::<i128>()
                .map_err(|_| DomainError::new("invalid actual billing amount"))?;
            if reserved_value < 0 || actual_value < 0 {
                return Err(DomainError::new(
                    "billing settlement amounts must be non-negative",
                ));
            }
            if actual_value > reserved_value {
                self.append(
                    &context,
                    &GatewayBillingAmount {
                        amount: (actual_value - reserved_value).to_string(),
                        currency: actual.currency.clone(),
                    },
                    CommerceLedgerDirection::Debit,
                    "adjust-debit",
                )
                .await?;
            } else if reserved_value > actual_value {
                self.append(
                    &context,
                    &GatewayBillingAmount {
                        amount: (reserved_value - actual_value).to_string(),
                        currency: reserved.currency.clone(),
                    },
                    CommerceLedgerDirection::Credit,
                    "adjust-credit",
                )
                .await?;
            }
            Ok(())
        })
    }

    fn charge_postpaid<'a>(
        &'a self,
        context: GatewayBillingContext,
        actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async move {
            self.append(
                &context,
                &actual,
                CommerceLedgerDirection::Debit,
                "postpaid",
            )
            .await
        })
    }

    fn refund<'a>(
        &'a self,
        context: GatewayBillingContext,
        reserved: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async move {
            self.append(
                &context,
                &reserved,
                CommerceLedgerDirection::Credit,
                "refund",
            )
            .await
        })
    }

    fn mark_usage_settled<'a>(
        &'a self,
        context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async move {
            sqlx::query(
                r#"
                UPDATE ai_metering_usage
                SET settlement_status = 2,
                    settled_at = CURRENT_TIMESTAMP,
                    failure_code = NULL,
                    failure_message = NULL
                WHERE tenant_id = $1
                  AND organization_id = $2
                  AND request_id = $3
                  AND settlement_status = 0
                "#,
            )
            .bind(context.tenant_id)
            .bind(context.organization_id)
            .bind(&context.request_id)
            .execute(&self.pool)
            .await
            .map_err(|error| DomainError::new(error.to_string()))?;
            Ok(())
        })
    }
}

/// Loads the active cash→points exchange settings for a tenant (platform
/// catalog fallback), the single source of the Token Bank points-per-currency
/// rates shared by recharge and usage billing.
async fn load_cash_to_points_settings(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
) -> Result<RechargeSettingsModel, DomainError> {
    let row = match load_cash_to_points_settings_row(pool, tenant_id, organization_id).await? {
        Some(row) => Some(row),
        None => load_cash_to_points_settings_row(
            pool,
            platform_catalog_tenant_id(),
            PLATFORM_CATALOG_ORGANIZATION_ID,
        )
        .await?,
    };
    let currency_rates = row
        .as_ref()
        .and_then(|item| {
            item.try_get::<Option<serde_json::Value>, _>("currency_rates")
                .ok()
                .flatten()
        })
        .and_then(jsonb_string_map);
    let rate = row
        .as_ref()
        .and_then(|item| item.try_get::<Option<String>, _>("rate").ok().flatten());
    let base_currency_code = row
        .as_ref()
        .and_then(|item| {
            item.try_get::<Option<String>, _>("base_currency_code")
                .ok()
                .flatten()
        });
    parse_recharge_settings_model(
        rate.as_deref(),
        base_currency_code.as_deref(),
        currency_rates,
    )
}

async fn load_cash_to_points_settings_row(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
) -> Result<Option<sqlx::postgres::PgRow>, DomainError> {
    let row = sqlx::query(
        r#"
        SELECT
            rule.rate AS rate,
            rule.base_currency_code AS base_currency_code,
            COALESCE(
                jsonb_object_agg(rate_row.currency_code, rate_row.rate)
                    FILTER (WHERE rate_row.currency_code IS NOT NULL),
                '{}'::jsonb
            ) AS currency_rates
        FROM commerce_exchange_rule rule
        LEFT JOIN commerce_exchange_currency_rate rate_row
            ON rate_row.rule_id = rule.id
        WHERE rule.tenant_id = $1::text
          AND rule.organization_id = $2::text
          AND LOWER(rule.source_asset_type) = 'cash'
          AND LOWER(rule.target_asset_type) = 'points'
          AND rule.status = 'active'
        GROUP BY rule.id
        ORDER BY
            CASE
                WHEN rule.rule_no = $3 THEN 0
                ELSE 1
            END ASC,
            rule.updated_at DESC,
            rule.id DESC
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(CASH_TO_POINTS_RULE_NO)
    .fetch_optional(pool)
    .await
    .map_err(|error| DomainError::new(error.to_string()))?;
    Ok(row)
}

fn platform_catalog_tenant_id() -> i64 {
    std::env::var(ENV_PLATFORM_CATALOG_TENANT_ID)
        .ok()
        .and_then(|value| value.trim().parse::<i64>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_PLATFORM_CATALOG_TENANT_ID)
}

fn jsonb_string_map(value: serde_json::Value) -> Option<BTreeMap<String, String>> {
    let object = value.as_object()?;
    let mut map = BTreeMap::new();
    for (key, value) in object {
        map.insert(
            key.clone(),
            value
                .as_str()
                .map(str::to_owned)
                .or_else(|| value.as_number().map(|number| number.to_string()))
                .unwrap_or_default(),
        );
    }
    Some(map)
}

fn sha256_hex(value: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut digest = Sha256::new();
    digest.update(value.as_bytes());
    format!("{:x}", digest.finalize())
}

fn parse_settlement_mode(
    value: Option<&str>,
    fallback: GatewayBillingSettlementMode,
) -> Result<GatewayBillingSettlementMode, DomainError> {
    match value.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value)
            if value.eq_ignore_ascii_case("async")
                || value.eq_ignore_ascii_case("asynchronous") =>
        {
            Ok(GatewayBillingSettlementMode::Asynchronous)
        }
        Some(value)
            if value.eq_ignore_ascii_case("sync") || value.eq_ignore_ascii_case("synchronous") =>
        {
            Ok(GatewayBillingSettlementMode::Synchronous)
        }
        Some(_) => Err(DomainError::new("invalid billing settlement mode")),
        None => Ok(fallback),
    }
}

fn parse_charge_mode(value: Option<&str>) -> Result<CustomerChargeMode, DomainError> {
    match value.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) if value.eq_ignore_ascii_case("postpaid") => Ok(CustomerChargeMode::Postpaid),
        Some(value)
            if value.eq_ignore_ascii_case("prepaid")
                || value.eq_ignore_ascii_case("prepaid_adjustment")
                || value.eq_ignore_ascii_case("prepaid-adjustment") =>
        {
            Ok(CustomerChargeMode::PrepaidAdjustment)
        }
        Some(_) => Err(DomainError::new("invalid billing charge mode")),
        None => Ok(CustomerChargeMode::PrepaidAdjustment),
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_charge_mode, parse_settlement_mode};
    use sdkwork_cloudrouter_router_service::ports::{
        CustomerChargeMode, GatewayBillingSettlementMode,
    };

    #[test]
    fn billing_mode_parsers_accept_supported_aliases_and_reject_unknown_values() {
        assert_eq!(
            Ok(CustomerChargeMode::PrepaidAdjustment),
            parse_charge_mode(Some("prepaid_adjustment"))
        );
        assert_eq!(
            Ok(CustomerChargeMode::Postpaid),
            parse_charge_mode(Some("POSTPAID"))
        );
        assert!(parse_charge_mode(Some("wallet")).is_err());
        assert_eq!(
            Ok(GatewayBillingSettlementMode::Asynchronous),
            parse_settlement_mode(Some("async"), GatewayBillingSettlementMode::Synchronous)
        );
        assert!(
            parse_settlement_mode(Some("eventual"), GatewayBillingSettlementMode::Synchronous)
                .is_err()
        );
        assert_eq!(
            Ok(GatewayBillingSettlementMode::Synchronous),
            parse_settlement_mode(None, GatewayBillingSettlementMode::Synchronous)
        );
    }
}
