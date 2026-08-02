use crate::infrastructure::sql::commerce_bootstrap::{
    commerce_recharge_package_seeds, commerce_recharge_settings_seeds,
};
use sdkwork_contract_service::{CommercePaymentStatus, CommerceRechargeStatus};
use sqlx::{PgPool, Postgres, Row, Transaction};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::admin_marketing_recharge::{
    canonical_decimal_string, parse_recharge_settings_model,
    recharge_package_item as build_recharge_package_item, recharge_package_name,
    recharge_settings_to_item, recharge_sku_specs, serialize_recharge_settings_remark,
    RechargePackageRecord, RechargeSettingsModel, RECHARGE_RULE_NO,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminExchangeRuleItem, AdminMarketingCommandFuture, AdminMarketingListPage,
    AdminMarketingStore, AdminMarketingSubject, AdminPaymentAttemptItem, AdminRechargePackageItem,
    AdminRechargePackageStatus, AdminRechargeRecordItem, AdminReferralStatItem,
    CreateAdminRechargePackageCommand, DeleteAdminRechargePackageCommand,
    ListAdminExchangeRulesQuery, ListAdminPaymentAttemptsQuery, ListAdminRechargePackagesQuery,
    ListAdminRechargeRecordsQuery, ListAdminReferralStatsQuery, LoadAdminRechargeRecordQuery,
    RechargeSettingsUpdateCommand, UpdateAdminExchangeRuleCommand,
    UpdateAdminRechargePackageCommand,
};

const TARGET_TYPE_RECHARGE_PACKAGE: i32 = 74;
const TARGET_TYPE_EXCHANGE_RULE: i32 = 75;
const TARGET_TYPE_RECHARGE_SETTINGS: i32 = 76;
const POINTS_ASSET_TYPE: &str = "POINTS";
const CASH_ASSET_TYPE: &str = "CASH";
const POINTS_STORAGE_ASSET_TYPE: &str = "points";
const CASH_STORAGE_ASSET_TYPE: &str = "cash";
const EXCHANGE_RULE_STATUS_ACTIVE: &str = "active";
const POINTS_TO_CASH_RULE_NO: &str = "POINTS_TO_CASH";
const RECHARGE_PRODUCT_GROUP_CNY: &str = "cny";
const RECHARGE_PRODUCT_GROUP_NON_CNY: &str = "non-cny";

#[derive(Debug, Clone)]
struct RechargePackageSkuBinding {
    sku_id: String,
    currency_code: String,
}

#[derive(Debug, Clone, Copy)]
struct RechargeSkuMutation<'a> {
    requested_at: &'a str,
    tenant_id: i64,
    organization_id: i64,
    product_id: &'a str,
    price_amount: &'a str,
    currency_code: &'a str,
    status: AdminRechargePackageStatus,
}

#[derive(Debug, Clone, Copy)]
struct MarketingAuditContext<'a> {
    audit_log_uuid: &'a str,
    request_id: &'a str,
    subject: AdminMarketingSubject,
}

impl<'a> MarketingAuditContext<'a> {
    fn new(audit_log_uuid: &'a str, request_id: &'a str, subject: AdminMarketingSubject) -> Self {
        Self {
            audit_log_uuid,
            request_id,
            subject,
        }
    }
}

#[derive(Debug, Clone)]
pub struct PostgresAdminMarketingStore {
    pool: PgPool,
}

impl PostgresAdminMarketingStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminMarketingStore for PostgresAdminMarketingStore {
    fn list_recharge_records<'a>(
        &'a self,
        query: ListAdminRechargeRecordsQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminRechargeRecordItem>> {
        Box::pin(async move { list_recharge_records(&self.pool, query).await })
    }

    fn load_recharge_record<'a>(
        &'a self,
        query: LoadAdminRechargeRecordQuery,
    ) -> AdminMarketingCommandFuture<'a, Option<AdminRechargeRecordItem>> {
        Box::pin(async move { load_recharge_record(&self.pool, query).await })
    }

    fn list_recharge_packages<'a>(
        &'a self,
        query: ListAdminRechargePackagesQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminRechargePackageItem>> {
        Box::pin(async move { list_recharge_packages(&self.pool, query).await })
    }

    fn list_exchange_rules<'a>(
        &'a self,
        query: ListAdminExchangeRulesQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminExchangeRuleItem>> {
        Box::pin(async move { list_exchange_rules(&self.pool, query).await })
    }

    fn load_recharge_settings<'a>(
        &'a self,
        subject: AdminMarketingSubject,
    ) -> AdminMarketingCommandFuture<'a, crate::ports::AdminRechargeSettingsItem> {
        Box::pin(async move { load_recharge_settings(&self.pool, subject).await })
    }

    fn create_recharge_package<'a>(
        &'a self,
        command: CreateAdminRechargePackageCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargePackageItem> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error(
                    "failed to begin recharge package creation transaction",
                    error,
                )
            })?;
            let package_sequence = insert_recharge_package(&mut tx, &command).await?;
            let package_id = recharge_package_id(
                command.subject.tenant_id,
                command.subject.organization_id,
                package_sequence,
            );
            sync_recharge_package_product_for_create(&mut tx, &command, package_sequence).await?;
            insert_audit_log(
                &mut tx,
                MarketingAuditContext::new(
                    &command.audit_log_uuid,
                    &command.request_id,
                    command.subject,
                ),
                "create_recharge_package",
                TARGET_TYPE_RECHARGE_PACKAGE,
                0,
                serde_json::json!({
                    "action": "create_recharge_package",
                    "packageId": &package_id,
                    "priceAmount": &command.price_amount,
                    "currencyCode": &command.currency_code,
                    "bonusPoints": command.bonus_points,
                    "status": recharge_package_status_label(command.status)
                }),
            )
            .await?;
            let item = load_recharge_package_by_id(
                &mut tx,
                &package_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created recharge package could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error(
                    "failed to commit recharge package creation transaction",
                    error,
                )
            })?;
            Ok(item)
        })
    }

    fn update_recharge_package<'a>(
        &'a self,
        command: UpdateAdminRechargePackageCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargePackageItem> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin recharge package update transaction", error)
            })?;
            let updated = update_recharge_package_row(&mut tx, &command).await?;
            if !updated {
                return Err(DomainError::not_found("recharge package was not found"));
            }
            sync_recharge_package_product_for_update(&mut tx, &command).await?;
            insert_audit_log(
                &mut tx,
                MarketingAuditContext::new(
                    &command.audit_log_uuid,
                    &command.request_id,
                    command.subject,
                ),
                "update_recharge_package",
                TARGET_TYPE_RECHARGE_PACKAGE,
                0,
                serde_json::json!({
                    "action": "update_recharge_package",
                    "packageId": &command.package_id,
                    "priceAmount": &command.price_amount,
                    "currencyCode": &command.currency_code,
                    "bonusPoints": command.bonus_points,
                    "status": recharge_package_status_label(command.status)
                }),
            )
            .await?;
            let item = load_recharge_package_by_id(
                &mut tx,
                &command.package_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("updated recharge package could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error(
                    "failed to commit recharge package update transaction",
                    error,
                )
            })?;
            Ok(item)
        })
    }

    fn delete_recharge_package<'a>(
        &'a self,
        command: DeleteAdminRechargePackageCommand,
    ) -> AdminMarketingCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin recharge package delete transaction", error)
            })?;
            let deleted = soft_delete_recharge_package(&mut tx, &command).await?;
            if deleted {
                disable_recharge_product_and_sku_for_amount(&mut tx, &command).await?;
                insert_audit_log(
                    &mut tx,
                    MarketingAuditContext::new(
                        &command.audit_log_uuid,
                        &command.request_id,
                        command.subject,
                    ),
                    "delete_recharge_package",
                    TARGET_TYPE_RECHARGE_PACKAGE,
                    0,
                    serde_json::json!({
                        "action": "delete_recharge_package",
                        "packageId": &command.package_id,
                        "deleted": true
                    }),
                )
                .await?;
            }
            tx.commit().await.map_err(|error| {
                store_error(
                    "failed to commit recharge package delete transaction",
                    error,
                )
            })?;
            Ok(deleted)
        })
    }

    fn update_exchange_rule<'a>(
        &'a self,
        command: UpdateAdminExchangeRuleCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminExchangeRuleItem> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin exchange rule update transaction", error)
            })?;
            let exchange_rule_id = upsert_exchange_rule(&mut tx, &command).await?;
            insert_audit_log_for_target_uuid(
                &mut tx,
                MarketingAuditContext::new(
                    &command.audit_log_uuid,
                    &command.request_id,
                    command.subject,
                ),
                "update_exchange_rule",
                TARGET_TYPE_EXCHANGE_RULE,
                &exchange_rule_id,
                serde_json::json!({
                    "action": "update_exchange_rule",
                    "exchangeRuleId": &exchange_rule_id,
                    "sourceAssetType": &command.source_asset_type,
                    "targetAssetType": &command.target_asset_type,
                    "rate": &command.rate
                }),
            )
            .await?;
            let item = load_exchange_rule_by_id(
                &mut tx,
                &exchange_rule_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("updated exchange rule could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit exchange rule update transaction", error)
            })?;
            Ok(item)
        })
    }

    fn update_recharge_settings<'a>(
        &'a self,
        command: RechargeSettingsUpdateCommand,
    ) -> AdminMarketingCommandFuture<'a, crate::ports::AdminRechargeSettingsItem> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error(
                    "failed to begin recharge settings update transaction",
                    error,
                )
            })?;
            let settings = upsert_recharge_settings(&mut tx, &command).await?;
            insert_audit_log_for_target_uuid(
                &mut tx,
                MarketingAuditContext::new(
                    &command.audit_log_uuid,
                    &command.request_id,
                    command.subject,
                ),
                "update_recharge_settings",
                TARGET_TYPE_RECHARGE_SETTINGS,
                RECHARGE_RULE_NO,
                serde_json::json!({
                    "action": "update_recharge_settings",
                    "baseCurrencyCode": &command.base_currency_code,
                    "basePointsPerCny": &command.base_points_per_cny,
                    "currencyToCnyRates": &command.currency_to_cny_rates
                }),
            )
            .await?;
            tx.commit().await.map_err(|error| {
                store_error(
                    "failed to commit recharge settings update transaction",
                    error,
                )
            })?;
            Ok(settings)
        })
    }

    fn list_payment_attempts<'a>(
        &'a self,
        query: ListAdminPaymentAttemptsQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminPaymentAttemptItem>> {
        Box::pin(async move { list_payment_attempts(&self.pool, query).await })
    }

    fn list_referral_stats<'a>(
        &'a self,
        query: ListAdminReferralStatsQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminReferralStatItem>> {
        Box::pin(async move { list_referral_stats(&self.pool, query).await })
    }
}

async fn list_recharge_records(
    pool: &PgPool,
    query: ListAdminRechargeRecordsQuery,
) -> DomainResult<AdminMarketingListPage<AdminRechargeRecordItem>> {
    let rows = sqlx::query(
        r#"
        SELECT
            pa.id::text AS id,
            COALESCE(NULLIF(pa.out_trade_no, ''), NULLIF(o.order_no, ''), pa.id::text) AS trade_no,
            pa.owner_user_id::text AS user_id,
            COALESCE(NULLIF(u.email, ''), NULLIF(u.username, ''), '') AS user_name,
            COALESCE(pa.amount, '0')::text AS amount,
            COALESCE(NULLIF(pa.callback_payload::jsonb ->> 'points', ''), '0') AS point_amount,
            COALESCE(NULLIF(pm.display_name, ''), NULLIF(pa.provider, ''), 'manual') AS method,
            COALESCE(NULLIF(o.status, ''), NULLIF(pa.status, ''), 'pending') AS status,
            COALESCE(pa.paid_at, pa.updated_at, pa.created_at, o.updated_at, o.created_at)::text AS time,
            COUNT(*) OVER() AS total
        FROM commerce_payment_attempt pa
        JOIN commerce_order o
          ON o.id = pa.order_id
         AND o.tenant_id = pa.tenant_id
         AND (o.organization_id IS NULL OR pa.organization_id IS NULL OR o.organization_id = pa.organization_id)
         AND o.subject = 'points_recharge'
        LEFT JOIN commerce_payment_method pm
          ON pm.tenant_id = pa.tenant_id
         AND (pm.organization_id IS NULL OR pa.organization_id IS NULL OR pm.organization_id = pa.organization_id)
         AND pm.method_key = pa.provider
        LEFT JOIN iam_user u
          ON u.id = pa.owner_user_id::text
         AND u.tenant_id = pa.tenant_id
        WHERE pa.tenant_id = $1::text
          AND pa.organization_id = $2::text
        ORDER BY COALESCE(pa.paid_at, pa.updated_at, pa.created_at, o.updated_at, o.created_at) DESC, pa.id DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list recharge records", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(recharge_record_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminMarketingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn load_recharge_record(
    pool: &PgPool,
    query: LoadAdminRechargeRecordQuery,
) -> DomainResult<Option<AdminRechargeRecordItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            pa.id::text AS id,
            COALESCE(NULLIF(pa.out_trade_no, ''), NULLIF(o.order_no, ''), pa.id::text) AS trade_no,
            pa.owner_user_id::text AS user_id,
            COALESCE(NULLIF(u.email, ''), NULLIF(u.username, ''), '') AS user_name,
            COALESCE(pa.amount, '0')::text AS amount,
            COALESCE(NULLIF(pa.callback_payload::jsonb ->> 'points', ''), '0') AS point_amount,
            COALESCE(NULLIF(pm.display_name, ''), NULLIF(pa.provider, ''), 'manual') AS method,
            COALESCE(NULLIF(o.status, ''), NULLIF(pa.status, ''), 'pending') AS status,
            COALESCE(pa.paid_at, pa.updated_at, pa.created_at, o.updated_at, o.created_at)::text AS time
        FROM commerce_payment_attempt pa
        JOIN commerce_order o
          ON o.id = pa.order_id
         AND o.tenant_id = pa.tenant_id
         AND (o.organization_id IS NULL OR pa.organization_id IS NULL OR o.organization_id = pa.organization_id)
         AND o.subject = 'points_recharge'
        LEFT JOIN commerce_payment_method pm
          ON pm.tenant_id = pa.tenant_id
         AND (pm.organization_id IS NULL OR pa.organization_id IS NULL OR pm.organization_id = pa.organization_id)
         AND pm.method_key = pa.provider
        LEFT JOIN iam_user u
          ON u.id = pa.owner_user_id::text
         AND u.tenant_id = pa.tenant_id
        WHERE pa.tenant_id = $1::text
          AND pa.organization_id = $2::text
          AND (
              pa.out_trade_no = $3
              OR o.order_no = $3
              OR pa.id = $3
          )
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(&query.order_no)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load recharge record", error))?;

    row.as_ref().map(recharge_record_from_row).transpose()
}

async fn list_recharge_packages(
    pool: &PgPool,
    query: ListAdminRechargePackagesQuery,
) -> DomainResult<AdminMarketingListPage<AdminRechargePackageItem>> {
    ensure_recharge_catalog_initialized(pool, query.subject).await?;
    let settings = load_recharge_settings_model(pool, query.subject).await?;
    let mut sql = String::from(
        r#"
        SELECT
            id::text AS id,
            COALESCE(package_no, '') AS package_no,
            COALESCE(name, '') AS name,
            COALESCE(sku_id, '') AS sku_id,
            price_amount::text AS price_amount,
            COALESCE(NULLIF(currency_code, ''), 'CNY') AS currency_code,
            COALESCE(bonus_points, 0)::bigint AS bonus_points,
            COALESCE(status, '') AS status,
            COALESCE(updated_at::text, '') AS updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_recharge_package
        WHERE tenant_id = $1::text
          AND organization_id = $2::text
        "#,
    );
    let mut limit_bind = 3;
    if query.status.is_some() {
        sql.push_str(" AND status = $3");
        limit_bind = 4;
    } else {
        sql.push_str(" AND status <> 'deleted'");
    }
    sql.push_str(&format!(
        " ORDER BY COALESCE(sort_weight, 0) ASC, id ASC LIMIT ${limit_bind} OFFSET ${}",
        limit_bind + 1
    ));

    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id);
    if let Some(status) = query.status {
        query_builder = query_builder.bind(recharge_package_status_label(status));
    }
    let query_builder = query_builder.bind(query.page_size).bind(query.offset);
    let rows = query_builder
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list recharge packages", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(|row| recharge_package_from_row(row, &settings))
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminMarketingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn load_recharge_settings(
    pool: &PgPool,
    subject: AdminMarketingSubject,
) -> DomainResult<crate::ports::AdminRechargeSettingsItem> {
    ensure_recharge_catalog_initialized(pool, subject).await?;
    let settings = load_recharge_settings_model(pool, subject).await?;
    Ok(recharge_settings_to_item(settings))
}

async fn load_recharge_settings_model(
    pool: &PgPool,
    subject: AdminMarketingSubject,
) -> DomainResult<RechargeSettingsModel> {
    let row = sqlx::query(
        r#"
        SELECT
            rate,
            remark
        FROM commerce_exchange_rule
        WHERE tenant_id = $1::text
          AND organization_id = $2::text
          AND LOWER(source_asset_type) = 'cash'
          AND LOWER(target_asset_type) = 'points'
          AND status = 'active'
        ORDER BY
            CASE
                WHEN rule_no = $3 THEN 0
                ELSE 1
            END ASC,
            updated_at DESC,
            id DESC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(RECHARGE_RULE_NO)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load recharge settings", error))?;
    parse_recharge_settings_model(
        row.as_ref()
            .map(|item| string_cell(item, "rate"))
            .as_deref(),
        row.as_ref()
            .map(|item| string_cell(item, "remark"))
            .as_deref(),
    )
}

async fn ensure_recharge_catalog_initialized(
    pool: &PgPool,
    subject: AdminMarketingSubject,
) -> DomainResult<()> {
    let mut tx = pool.begin().await.map_err(|error| {
        store_error(
            "failed to begin recharge catalog initialization transaction",
            error,
        )
    })?;
    ensure_recharge_catalog_initialized_in_transaction(
        &mut tx,
        subject.tenant_id,
        subject.organization_id,
    )
    .await?;
    tx.commit().await.map_err(|error| {
        store_error(
            "failed to commit recharge catalog initialization transaction",
            error,
        )
    })?;
    Ok(())
}

async fn ensure_recharge_catalog_initialized_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<()> {
    let recharge_settings_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_exchange_rule
        WHERE tenant_id = $1::text
          AND organization_id = $2::text
          AND LOWER(source_asset_type) = 'cash'
          AND LOWER(target_asset_type) = 'points'
          AND status = 'active'
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to inspect recharge settings catalog", error))?;
    if recharge_settings_count == 0 {
        seed_recharge_settings(tx, tenant_id, organization_id).await?;
    }

    let recharge_package_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_recharge_package
        WHERE tenant_id = $1::text
          AND organization_id = $2::text
          AND status <> 'deleted'
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to inspect recharge package catalog", error))?;
    if recharge_package_count == 0 {
        seed_recharge_packages(tx, tenant_id, organization_id).await?;
    }

    Ok(())
}

async fn seed_recharge_settings(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<()> {
    let requested_at = current_timestamp_string();
    for setting in commerce_recharge_settings_seeds() {
        let currency_to_cny_rates = setting
            .currency_to_cny_rates
            .iter()
            .map(|(currency_code, rate)| {
                (
                    (*currency_code).to_owned(),
                    canonical_decimal_string(rate, 6, "recharge settings currency to cny rate")
                        .expect("bootstrap recharge settings seed rates must be valid"),
                )
            })
            .collect();
        let remark =
            serialize_recharge_settings_remark(setting.base_currency_code, &currency_to_cny_rates);
        let rule_id = format!(
            "recharge-settings-{tenant_id}-{organization_id}-{}",
            setting.rule_no.to_ascii_lowercase()
        );
        let request_id = format!(
            "seed-recharge-settings-{tenant_id}-{organization_id}-{}",
            setting.rule_no.to_ascii_lowercase()
        );
        sqlx::query(
            r#"
            INSERT INTO commerce_exchange_rule
                (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, remark, request_no, idempotency_key, created_at, updated_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $7, 'active', $8, $9, $10, $11, $12)
            ON CONFLICT(tenant_id, organization_id, source_asset_type, target_asset_type) DO UPDATE SET
                id = excluded.id,
                rule_no = excluded.rule_no,
                rate = excluded.rate,
                status = excluded.status,
                remark = excluded.remark,
                request_no = excluded.request_no,
                idempotency_key = excluded.idempotency_key,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&rule_id)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(setting.rule_no)
        .bind(setting.source_asset_type)
        .bind(setting.target_asset_type)
        .bind(setting.rate)
        .bind(&remark)
        .bind(&request_id)
        .bind(&request_id)
        .bind(&requested_at)
        .bind(&requested_at)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to seed recharge settings", error))?;
    }
    Ok(())
}

async fn seed_recharge_packages(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<()> {
    let requested_at = current_timestamp_string();
    let mut sequence = next_recharge_package_sequence(tx, tenant_id, organization_id).await?;
    for package in commerce_recharge_package_seeds() {
        let request_id = format!("seed-recharge-package-{tenant_id}-{organization_id}-{sequence}");
        let status = recharge_package_status_from_storage(package.status)?;
        let package_id = recharge_package_id(tenant_id, organization_id, sequence);
        let product_id = insert_recharge_product_row(
            tx,
            &requested_at,
            &request_id,
            tenant_id,
            organization_id,
            package.currency_code,
        )
        .await?;
        insert_recharge_sku_row(
            tx,
            sequence,
            RechargeSkuMutation {
                requested_at: &requested_at,
                tenant_id,
                organization_id,
                product_id: &product_id,
                price_amount: package.price_amount,
                currency_code: package.currency_code,
                status,
            },
        )
        .await?;
        refresh_recharge_product_status(tx, &product_id, &requested_at, &request_id).await?;
        sqlx::query(
            r#"
            INSERT INTO commerce_recharge_package
                (id, tenant_id, organization_id, external_id, package_no, sku_id, name, price_amount, currency_code, bonus_points, status, valid_from, valid_to, sort_weight, request_no, idempotency_key, created_at, updated_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NULL, $12, $13, $14, $15, $16)
            ON CONFLICT(tenant_id, package_no) DO UPDATE SET
                id = excluded.id,
                organization_id = excluded.organization_id,
                external_id = excluded.external_id,
                sku_id = excluded.sku_id,
                name = excluded.name,
                price_amount = excluded.price_amount,
                currency_code = excluded.currency_code,
                bonus_points = excluded.bonus_points,
                status = excluded.status,
                valid_from = excluded.valid_from,
                valid_to = excluded.valid_to,
                sort_weight = excluded.sort_weight,
                request_no = excluded.request_no,
                idempotency_key = excluded.idempotency_key,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&package_id)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(sequence)
        .bind(recharge_package_no(sequence))
        .bind(recharge_sku_id(tenant_id, organization_id, sequence))
        .bind(recharge_package_name(package.price_amount, package.currency_code))
        .bind(package.price_amount)
        .bind(package.currency_code)
        .bind(package.bonus_points)
        .bind(package.status)
        .bind(package.sort_weight)
        .bind(&request_id)
        .bind(&request_id)
        .bind(&requested_at)
        .bind(&requested_at)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to seed recharge package", error))?;
        sequence += 1;
    }
    Ok(())
}

async fn list_exchange_rules(
    pool: &PgPool,
    query: ListAdminExchangeRulesQuery,
) -> DomainResult<AdminMarketingListPage<AdminExchangeRuleItem>> {
    let source_filter = query
        .source_asset_type
        .as_deref()
        .map(storage_asset_type)
        .transpose()?;
    let target_filter = query
        .target_asset_type
        .as_deref()
        .map(storage_asset_type)
        .transpose()?;
    let status_filter = query.status.as_deref();

    let rows = sqlx::query(
        r#"
        SELECT
            id,
            source_asset_type,
            target_asset_type,
            rate,
            status,
            COUNT(*) OVER() AS total
        FROM commerce_exchange_rule
        WHERE tenant_id = $1::text
          AND organization_id = $2::text
          AND ($3 IS NULL OR source_asset_type = $3)
          AND ($4 IS NULL OR target_asset_type = $4)
          AND ($5 IS NULL OR status = $5)
        ORDER BY updated_at DESC, id DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(source_filter)
    .bind(target_filter)
    .bind(status_filter)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list exchange rules", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(exchange_rule_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminMarketingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn insert_recharge_package(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminRechargePackageCommand,
) -> DomainResult<i64> {
    let sequence = next_recharge_package_sequence(
        tx,
        command.subject.tenant_id,
        command.subject.organization_id,
    )
    .await?;
    let package_id = recharge_package_id(
        command.subject.tenant_id,
        command.subject.organization_id,
        sequence,
    );
    let sku_id = recharge_sku_id(
        command.subject.tenant_id,
        command.subject.organization_id,
        sequence,
    );
    sqlx::query(
        r#"
        INSERT INTO commerce_recharge_package
            (id, tenant_id, organization_id, external_id, package_no, sku_id, name, price_amount, currency_code, bonus_points, status, valid_from, valid_to, sort_weight, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NULL, $12, $13, $14, $15, $16)
        "#,
    )
    .bind(&package_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(sequence)
    .bind(recharge_package_no(sequence))
    .bind(&sku_id)
    .bind(recharge_package_name(&command.price_amount, &command.currency_code))
    .bind(&command.price_amount)
    .bind(&command.currency_code)
    .bind(command.bonus_points)
    .bind(recharge_package_status_label(command.status))
    .bind(sequence)
    .bind(&command.request_id)
    .bind(&command.request_id)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create recharge package", error))?;

    Ok(sequence)
}

async fn next_recharge_package_sequence(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<i64> {
    let current: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT MAX(external_id)
        FROM commerce_recharge_package
        WHERE tenant_id = $1::text
          AND organization_id = $2::text
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to allocate recharge package id", error))?;
    Ok(current.unwrap_or(0) + 1)
}

async fn update_recharge_package_row(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminRechargePackageCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE commerce_recharge_package
        SET name = $1,
            price_amount = $2,
            currency_code = $3,
            bonus_points = $4,
            status = $5,
            request_no = $6,
            idempotency_key = $7,
            updated_at = $8
        WHERE id = $9
          AND tenant_id = $10::text
          AND organization_id = $11::text
          AND status <> 'deleted'
        "#,
    )
    .bind(recharge_package_name(
        &command.price_amount,
        &command.currency_code,
    ))
    .bind(&command.price_amount)
    .bind(&command.currency_code)
    .bind(command.bonus_points)
    .bind(recharge_package_status_label(command.status))
    .bind(&command.request_id)
    .bind(&command.request_id)
    .bind(&command.requested_at)
    .bind(&command.package_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update recharge package", error))?;
    Ok(result.rows_affected() > 0)
}

async fn soft_delete_recharge_package(
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteAdminRechargePackageCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE commerce_recharge_package
        SET status = $1,
            request_no = $2,
            idempotency_key = $3,
            updated_at = $4
        WHERE id = $5
          AND tenant_id = $6::text
          AND organization_id = $7::text
          AND status <> 'deleted'
        "#,
    )
    .bind("deleted")
    .bind(&command.request_id)
    .bind(&command.request_id)
    .bind(&command.requested_at)
    .bind(&command.package_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete recharge package", error))?;
    Ok(result.rows_affected() > 0)
}

async fn load_recharge_package_sku_binding(
    tx: &mut Transaction<'_, Postgres>,
    package_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<RechargePackageSkuBinding>> {
    let row = sqlx::query(
        r#"
        SELECT
            COALESCE(sku_id, '') AS sku_id,
            COALESCE(NULLIF(currency_code, ''), 'CNY') AS currency_code
        FROM commerce_recharge_package
        WHERE id = $1
          AND tenant_id = $2::text
          AND organization_id = $3::text
        LIMIT 1
        "#,
    )
    .bind(package_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load recharge package sku binding", error))?;
    Ok(row.map(|row| RechargePackageSkuBinding {
        sku_id: string_cell(&row, "sku_id"),
        currency_code: string_cell(&row, "currency_code"),
    }))
}

async fn load_recharge_sku_product_id(
    tx: &mut Transaction<'_, Postgres>,
    sku_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<String>> {
    sqlx::query_scalar(
        r#"
        SELECT spu_id
        FROM commerce_product_sku
        WHERE id = $1
          AND tenant_id = $2::text
          AND (
                organization_id = $3::text
                OR organization_id IS NULL
              )
        LIMIT 1
        "#,
    )
    .bind(sku_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load recharge sku product id", error))
}

async fn load_recharge_package_by_id(
    tx: &mut Transaction<'_, Postgres>,
    package_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminRechargePackageItem>> {
    let settings =
        load_recharge_settings_model_for_transaction(tx, tenant_id, organization_id).await?;
    let row = sqlx::query(
        r#"
        SELECT
            id::text AS id,
            COALESCE(package_no, '') AS package_no,
            COALESCE(name, '') AS name,
            COALESCE(sku_id, '') AS sku_id,
            price_amount::text AS price_amount,
            COALESCE(NULLIF(currency_code, ''), 'CNY') AS currency_code,
            COALESCE(bonus_points, 0)::bigint AS bonus_points,
            COALESCE(status, '') AS status,
            COALESCE(updated_at::text, '') AS updated_at
        FROM commerce_recharge_package
        WHERE id = $1
          AND tenant_id = $2::text
          AND organization_id = $3::text
          AND status <> 'deleted'
        LIMIT 1
        "#,
    )
    .bind(package_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load recharge package", error))?;

    row.as_ref()
        .map(|row| recharge_package_from_row(row, &settings))
        .transpose()
}

async fn load_recharge_settings_model_for_transaction(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<RechargeSettingsModel> {
    let row = sqlx::query(
        r#"
        SELECT
            rate,
            remark
        FROM commerce_exchange_rule
        WHERE tenant_id = $1::text
          AND organization_id = $2::text
          AND LOWER(source_asset_type) = 'cash'
          AND LOWER(target_asset_type) = 'points'
          AND status = 'active'
        ORDER BY
            CASE
                WHEN rule_no = $3 THEN 0
                ELSE 1
            END ASC,
            updated_at DESC,
            id DESC
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(RECHARGE_RULE_NO)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load recharge settings", error))?;
    parse_recharge_settings_model(
        row.as_ref()
            .map(|item| string_cell(item, "rate"))
            .as_deref(),
        row.as_ref()
            .map(|item| string_cell(item, "remark"))
            .as_deref(),
    )
}

async fn upsert_exchange_rule(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminExchangeRuleCommand,
) -> DomainResult<String> {
    let rule_id = exchange_rule_id(command);
    let source_asset_type = storage_asset_type(&command.source_asset_type)?;
    let target_asset_type = storage_asset_type(&command.target_asset_type)?;
    sqlx::query(
        r#"
        INSERT INTO commerce_exchange_rule
            (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, remark, request_no, idempotency_key, created_at, updated_at)
        VALUES
            (
            $1,
            $2::text,
            $3::text,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13
            )
        ON CONFLICT (tenant_id, organization_id, source_asset_type, target_asset_type) DO UPDATE SET
            rate = EXCLUDED.rate,
            status = EXCLUDED.status,
            remark = EXCLUDED.remark,
            request_no = EXCLUDED.request_no,
            idempotency_key = EXCLUDED.idempotency_key,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&rule_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(POINTS_TO_CASH_RULE_NO)
    .bind(source_asset_type)
    .bind(target_asset_type)
    .bind(&command.rate)
    .bind(EXCHANGE_RULE_STATUS_ACTIVE)
    .bind(&command.remark)
    .bind(&command.request_id)
    .bind(&command.request_id)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to upsert exchange rule", error))?;

    load_exchange_rule_id(
        tx,
        command.subject.tenant_id,
        command.subject.organization_id,
        source_asset_type,
        target_asset_type,
    )
    .await?
    .ok_or_else(|| DomainError::new("upserted exchange rule id could not be reloaded"))
}

async fn load_exchange_rule_id(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
    source_asset_type: &str,
    target_asset_type: &str,
) -> DomainResult<Option<String>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM commerce_exchange_rule
        WHERE tenant_id = $1::text
          AND organization_id = $2::text
          AND source_asset_type = $3
          AND target_asset_type = $4
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(source_asset_type)
    .bind(target_asset_type)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load exchange rule id", error))
}

async fn load_exchange_rule_by_id(
    tx: &mut Transaction<'_, Postgres>,
    exchange_rule_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminExchangeRuleItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id,
            source_asset_type,
            target_asset_type,
            rate,
            status
        FROM commerce_exchange_rule
        WHERE id = $1
          AND tenant_id = $2::text
          AND organization_id = $3::text
          AND source_asset_type = 'points'
          AND target_asset_type = 'cash'
        LIMIT 1
        "#,
    )
    .bind(exchange_rule_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load exchange rule", error))?;

    row.as_ref().map(exchange_rule_from_row).transpose()
}

async fn sync_recharge_package_product_for_create(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminRechargePackageCommand,
    sequence: i64,
) -> DomainResult<()> {
    let product_id = insert_recharge_product_row(
        tx,
        &command.requested_at,
        &command.request_id,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.currency_code,
    )
    .await?;
    insert_recharge_sku_row(
        tx,
        sequence,
        RechargeSkuMutation {
            requested_at: &command.requested_at,
            tenant_id: command.subject.tenant_id,
            organization_id: command.subject.organization_id,
            product_id: &product_id,
            price_amount: &command.price_amount,
            currency_code: &command.currency_code,
            status: command.status,
        },
    )
    .await?;
    refresh_recharge_product_status(tx, &product_id, &command.requested_at, &command.request_id)
        .await
}

async fn sync_recharge_package_product_for_update(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminRechargePackageCommand,
) -> DomainResult<()> {
    let Some(binding) = load_recharge_package_sku_binding(
        tx,
        &command.package_id,
        command.subject.tenant_id,
        command.subject.organization_id,
    )
    .await?
    else {
        return Ok(());
    };
    if binding.sku_id.trim().is_empty() {
        return Err(DomainError::new(
            "recharge package is missing sku binding for product sync",
        ));
    }
    let previous_product_id = load_recharge_sku_product_id(
        tx,
        &binding.sku_id,
        command.subject.tenant_id,
        command.subject.organization_id,
    )
    .await?;
    let product_id = insert_recharge_product_row(
        tx,
        &command.requested_at,
        &command.request_id,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.currency_code,
    )
    .await?;
    let updated = update_recharge_sku_row_by_id(
        tx,
        &binding.sku_id,
        RechargeSkuMutation {
            requested_at: &command.requested_at,
            tenant_id: command.subject.tenant_id,
            organization_id: command.subject.organization_id,
            product_id: &product_id,
            price_amount: &command.price_amount,
            currency_code: &command.currency_code,
            status: command.status,
        },
    )
    .await?;
    if !updated {
        return Err(DomainError::new("recharge package sku was not found"));
    }
    refresh_recharge_product_status(tx, &product_id, &command.requested_at, &command.request_id)
        .await?;
    if let Some(previous_product_id) = previous_product_id {
        if previous_product_id != product_id {
            refresh_recharge_product_status(
                tx,
                &previous_product_id,
                &command.requested_at,
                &command.request_id,
            )
            .await?;
        }
    } else {
        let previous_group_product_id = recharge_product_id(
            command.subject.tenant_id,
            command.subject.organization_id,
            recharge_product_group_key(&binding.currency_code),
        );
        if previous_group_product_id != product_id {
            refresh_recharge_product_status(
                tx,
                &previous_group_product_id,
                &command.requested_at,
                &command.request_id,
            )
            .await?;
        }
    }
    Ok(())
}

async fn disable_recharge_product_and_sku_for_amount(
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteAdminRechargePackageCommand,
) -> DomainResult<()> {
    let Some(binding) = load_recharge_package_sku_binding(
        tx,
        &command.package_id,
        command.subject.tenant_id,
        command.subject.organization_id,
    )
    .await?
    else {
        return Ok(());
    };
    if binding.sku_id.trim().is_empty() {
        return Ok(());
    }
    let product_id = load_recharge_sku_product_id(
        tx,
        &binding.sku_id,
        command.subject.tenant_id,
        command.subject.organization_id,
    )
    .await?;
    let updated = update_recharge_sku_status_by_id(
        tx,
        &binding.sku_id,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.requested_at,
        AdminRechargePackageStatus::Inactive,
    )
    .await?;
    if !updated {
        return Ok(());
    }
    if let Some(product_id) = product_id {
        refresh_recharge_product_status(
            tx,
            &product_id,
            &command.requested_at,
            &command.request_id,
        )
        .await?;
    } else {
        let product_id = recharge_product_id(
            command.subject.tenant_id,
            command.subject.organization_id,
            recharge_product_group_key(&binding.currency_code),
        );
        refresh_recharge_product_status(
            tx,
            &product_id,
            &command.requested_at,
            &command.request_id,
        )
        .await?;
    }
    Ok(())
}

async fn insert_recharge_product_row(
    tx: &mut Transaction<'_, Postgres>,
    requested_at: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    currency_code: &str,
) -> DomainResult<String> {
    let group_key = recharge_product_group_key(currency_code);
    let product_id = recharge_product_id(tenant_id, organization_id, group_key);
    sqlx::query(
        r#"
        INSERT INTO commerce_product_spu
            (id, tenant_id, organization_id, spu_no, title, subtitle, description, product_type, status, visible_surfaces, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, $5, $6, $7, 'points_recharge', 'active', '["app","console","admin"]', $8, $9)
        ON CONFLICT (tenant_id, spu_no) DO UPDATE SET
            id = EXCLUDED.id,
            organization_id = EXCLUDED.organization_id,
            title = EXCLUDED.title,
            subtitle = EXCLUDED.subtitle,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            visible_surfaces = EXCLUDED.visible_surfaces,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&product_id)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(recharge_product_no(group_key))
    .bind(recharge_product_group_title(group_key))
    .bind("SDKWork points recharge catalog")
    .bind(format!("request_id={request_id}"))
    .bind(requested_at)
    .bind(requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create recharge product", error))?;

    let spu_category_id = format!("{product_id}:commerce-recharge");
    sqlx::query(
        r#"
        INSERT INTO commerce_product_spu_category
            (id, tenant_id, organization_id, spu_id, category_id, primary_flag, sort_order, status, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, 'commerce-recharge', 1, 0, 'active', $5, $6)
        ON CONFLICT (tenant_id, spu_id, category_id) DO UPDATE SET
            organization_id = EXCLUDED.organization_id,
            primary_flag = EXCLUDED.primary_flag,
            sort_order = EXCLUDED.sort_order,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(spu_category_id)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(&product_id)
    .bind(requested_at)
    .bind(requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to link recharge product category", error))?;

    Ok(product_id)
}

async fn insert_recharge_sku_row(
    tx: &mut Transaction<'_, Postgres>,
    sequence: i64,
    mutation: RechargeSkuMutation<'_>,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO commerce_product_sku
            (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, original_price_amount, currency_code, fulfillment_type, inventory_tracking, status, spec_json, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, $5, $6, $6, $7, $7, $8, 'points_credit', 'untracked', $9, $10, $11, $11)
        ON CONFLICT (tenant_id, sku_no) DO UPDATE SET
            spu_id = EXCLUDED.spu_id,
            name = EXCLUDED.name,
            title = EXCLUDED.title,
            price_amount = EXCLUDED.price_amount,
            original_price_amount = EXCLUDED.original_price_amount,
            currency_code = EXCLUDED.currency_code,
            status = EXCLUDED.status,
            spec_json = EXCLUDED.spec_json,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(recharge_sku_id(
        mutation.tenant_id,
        mutation.organization_id,
        sequence,
    ))
    .bind(mutation.tenant_id)
    .bind(mutation.organization_id)
    .bind(mutation.product_id)
    .bind(recharge_sku_no(sequence))
    .bind(recharge_package_name(
        mutation.price_amount,
        mutation.currency_code,
    ))
    .bind(mutation.price_amount)
    .bind(mutation.currency_code)
    .bind(recharge_package_status_label(mutation.status))
    .bind(recharge_sku_specs(
        mutation.price_amount,
        mutation.currency_code,
    ))
    .bind(mutation.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create recharge sku", error))?;
    Ok(())
}

async fn update_recharge_sku_row_by_id(
    tx: &mut Transaction<'_, Postgres>,
    sku_id: &str,
    mutation: RechargeSkuMutation<'_>,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE commerce_product_sku
        SET spu_id = $1,
            name = $2,
            title = $2,
            price_amount = $3,
            original_price_amount = $3,
            currency_code = $4,
            status = $5,
            spec_json = $6,
            updated_at = $7
        WHERE id = $8
          AND tenant_id = $9::text
          AND (
                organization_id = $10::text
                OR organization_id IS NULL
              )
        "#,
    )
    .bind(mutation.product_id)
    .bind(recharge_package_name(
        mutation.price_amount,
        mutation.currency_code,
    ))
    .bind(mutation.price_amount)
    .bind(mutation.currency_code)
    .bind(recharge_package_status_label(mutation.status))
    .bind(recharge_sku_specs(
        mutation.price_amount,
        mutation.currency_code,
    ))
    .bind(mutation.requested_at)
    .bind(sku_id)
    .bind(mutation.tenant_id)
    .bind(mutation.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update recharge sku", error))?;
    Ok(result.rows_affected() > 0)
}

async fn update_recharge_sku_status_by_id(
    tx: &mut Transaction<'_, Postgres>,
    sku_id: &str,
    tenant_id: i64,
    organization_id: i64,
    requested_at: &str,
    status: AdminRechargePackageStatus,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE commerce_product_sku
        SET status = $1,
            updated_at = $2
        WHERE id = $3
          AND tenant_id = $4::text
          AND (
                organization_id = $5::text
                OR organization_id IS NULL
              )
        "#,
    )
    .bind(recharge_package_status_label(status))
    .bind(requested_at)
    .bind(sku_id)
    .bind(tenant_id)
    .bind(organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to disable recharge sku", error))?;
    Ok(result.rows_affected() > 0)
}

async fn refresh_recharge_product_status(
    tx: &mut Transaction<'_, Postgres>,
    product_id: &str,
    requested_at: &str,
    request_id: &str,
) -> DomainResult<()> {
    let active_sku_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_product_sku
        WHERE spu_id = $1
          AND status = 'active'
        "#,
    )
    .bind(product_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to count active recharge skus", error))?;

    sqlx::query(
        r#"
        UPDATE commerce_product_spu
        SET description = $1,
            status = $2,
            updated_at = $3
        WHERE id = $4
        "#,
    )
    .bind(format!("request_id={request_id}"))
    .bind(if active_sku_count > 0 {
        "active"
    } else {
        "inactive"
    })
    .bind(requested_at)
    .bind(product_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to refresh recharge product status", error))?;
    Ok(())
}

async fn upsert_recharge_settings(
    tx: &mut Transaction<'_, Postgres>,
    command: &RechargeSettingsUpdateCommand,
) -> DomainResult<crate::ports::AdminRechargeSettingsItem> {
    let remark = serialize_recharge_settings_remark(
        &command.base_currency_code,
        &command.currency_to_cny_rates,
    );
    let rule_id = format!(
        "exchange-rule-{}-{}-cash-points",
        command.subject.tenant_id, command.subject.organization_id
    );
    sqlx::query(
        r#"
        INSERT INTO commerce_exchange_rule
            (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, remark, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, 'cash', 'points', $5, 'active', $6, $7, $8, $9, $9)
        ON CONFLICT (tenant_id, organization_id, source_asset_type, target_asset_type) DO UPDATE SET
            rule_no = EXCLUDED.rule_no,
            rate = EXCLUDED.rate,
            status = EXCLUDED.status,
            remark = EXCLUDED.remark,
            request_no = EXCLUDED.request_no,
            idempotency_key = EXCLUDED.idempotency_key,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&rule_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(RECHARGE_RULE_NO)
    .bind(&command.base_points_per_cny)
    .bind(&remark)
    .bind(&command.request_id)
    .bind(&command.request_id)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update recharge settings", error))?;
    Ok(recharge_settings_to_item(RechargeSettingsModel {
        base_currency_code: command.base_currency_code.clone(),
        base_points_per_cny: command.base_points_per_cny.clone(),
        currency_to_cny_rates: command.currency_to_cny_rates.clone(),
    }))
}

async fn list_referral_stats(
    pool: &PgPool,
    query: ListAdminReferralStatsQuery,
) -> DomainResult<AdminMarketingListPage<AdminReferralStatItem>> {
    let rows = sqlx::query(
        r#"
        SELECT
            id::text AS id,
            COALESCE(NULLIF(inviter_name_snapshot, ''), NULLIF(inviter_email_snapshot, ''), inviter_user_id::text, '') AS inviter,
            COALESCE(total_invited_count, 0) AS total_invited,
            COALESCE(total_revenue_amount, 0)::text AS total_revenue,
            COALESCE(reward_awarded_amount, 0)::text AS bonus_awarded,
            COALESCE(invite_link, '') AS link,
            COUNT(*) OVER() AS total
        FROM ops_referral_stat_snapshot
        WHERE tenant_id = $1
          AND organization_id = $2
          AND status = 1
        ORDER BY snapshot_at DESC, id DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list referral stats", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(|row| {
            Ok(AdminReferralStatItem {
                id: string_cell(row, "id"),
                inviter: string_cell(row, "inviter"),
                total_invited: integer_cell(row, "total_invited"),
                total_revenue: decimal_money_string(&string_cell(row, "total_revenue")),
                bonus_awarded: decimal_money_string(&string_cell(row, "bonus_awarded")),
                link: string_cell(row, "link"),
            })
        })
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminMarketingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn list_payment_attempts(
    pool: &PgPool,
    query: ListAdminPaymentAttemptsQuery,
) -> DomainResult<AdminMarketingListPage<AdminPaymentAttemptItem>> {
    let rows = sqlx::query(
        r#"
        SELECT
            pa.id::text AS id,
            COALESCE(NULLIF(o.order_no, ''), NULLIF(pa.out_trade_no, ''), '') AS order_no,
            pa.provider AS provider,
            COALESCE(pa.amount, '0')::text AS amount,
            pa.status AS status,
            COALESCE(pa.paid_at, pa.updated_at, pa.created_at)::text AS created_at,
            COUNT(*) OVER() AS total
        FROM commerce_payment_attempt pa
        LEFT JOIN commerce_order o
          ON o.id = pa.order_id
         AND o.tenant_id = pa.tenant_id
         AND (o.organization_id IS NULL OR pa.organization_id IS NULL OR o.organization_id = pa.organization_id)
        WHERE pa.tenant_id = $1::text
          AND pa.organization_id = $2::text
        ORDER BY COALESCE(pa.paid_at, pa.updated_at, pa.created_at) DESC, pa.id DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list payment attempts", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(payment_attempt_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminMarketingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
    context: MarketingAuditContext<'_>,
    action: &'static str,
    target_type: i32,
    target_id: i64,
    change_summary: serde_json::Value,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        "#,
    )
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(context.audit_log_uuid)
    .bind(context.subject.tenant_id)
    .bind(context.subject.organization_id)
    .bind(action)
    .bind(target_type)
    .bind(target_id)
    .bind(context.request_id)
    .bind(context.subject.operator_id)
    .bind(context.subject.operator_type)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write marketing audit log", error))?;
    Ok(())
}

async fn insert_audit_log_for_target_uuid(
    tx: &mut Transaction<'_, Postgres>,
    context: MarketingAuditContext<'_>,
    action: &'static str,
    target_type: i32,
    target_uuid: &str,
    change_summary: serde_json::Value,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_uuid, request_id, operator_id, operator_type, change_summary)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        "#,
    )
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(context.audit_log_uuid)
    .bind(context.subject.tenant_id)
    .bind(context.subject.organization_id)
    .bind(action)
    .bind(target_type)
    .bind(target_uuid)
    .bind(context.request_id)
    .bind(context.subject.operator_id)
    .bind(context.subject.operator_type)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write marketing audit log", error))?;
    Ok(())
}

fn recharge_record_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminRechargeRecordItem> {
    let status = recharge_status_label(&string_cell(row, "status"))?.to_owned();
    Ok(AdminRechargeRecordItem {
        id: string_cell(row, "id"),
        trade_no: string_cell(row, "trade_no"),
        user_id: string_cell(row, "user_id"),
        user: string_cell(row, "user_name"),
        amount: decimal_money_string(&string_cell(row, "amount")),
        usd_credited: string_cell(row, "point_amount"),
        method: string_cell(row, "method"),
        status,
        time: string_cell(row, "time"),
    })
}

fn recharge_status_label(value: &str) -> DomainResult<&'static str> {
    match value.trim().to_ascii_lowercase().as_str() {
        "" | "pending" | "pending_payment" => Ok("pending"),
        status if status == CommerceRechargeStatus::Pending.as_str() => Ok("pending"),
        status if status == CommerceRechargeStatus::Paid.as_str() => Ok("success"),
        status if status == CommerceRechargeStatus::Fulfilled.as_str() => Ok("success"),
        "succeeded" | "success" => Ok("success"),
        "failed" | "cancelled" | "canceled" => Ok("failed"),
        status if status == CommerceRechargeStatus::Closed.as_str() => Ok("closed"),
        "expired" => Ok("closed"),
        status => Err(DomainError::new(format!(
            "unsupported admin recharge status: {status}"
        ))),
    }
}

fn recharge_package_from_row(
    row: &sqlx::postgres::PgRow,
    settings: &RechargeSettingsModel,
) -> DomainResult<AdminRechargePackageItem> {
    let price_amount = canonical_money_string(
        &string_cell(row, "price_amount"),
        "recharge package price amount",
    )?;
    let currency_code = string_cell(row, "currency_code")
        .trim()
        .to_ascii_uppercase();
    let bonus_points = integer_cell(row, "bonus_points").max(0);
    build_recharge_package_item(
        RechargePackageRecord {
            id: string_cell(row, "id"),
            package_no: string_cell(row, "package_no"),
            name: string_cell(row, "name"),
            sku_id: string_cell(row, "sku_id"),
            price_amount,
            currency_code: if currency_code.is_empty() {
                "CNY".to_owned()
            } else {
                currency_code
            },
            bonus_points,
            status: string_cell(row, "status"),
            updated_at: string_cell(row, "updated_at"),
        },
        settings,
    )
}

fn exchange_rule_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminExchangeRuleItem> {
    Ok(AdminExchangeRuleItem {
        id: string_cell(row, "id"),
        source_asset_type: display_asset_type(&string_cell(row, "source_asset_type"))?,
        target_asset_type: display_asset_type(&string_cell(row, "target_asset_type"))?,
        rate: canonical_decimal_string(&string_cell(row, "rate"), 6, "exchange rule rate")?,
        status: string_cell(row, "status"),
    })
}

fn payment_attempt_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminPaymentAttemptItem> {
    Ok(AdminPaymentAttemptItem {
        id: string_cell(row, "id"),
        order_no: string_cell(row, "order_no"),
        provider: payment_provider_label(&string_cell(row, "provider")),
        amount: canonical_money_string(&string_cell(row, "amount"), "payment attempt amount")?,
        status: payment_status_label(&string_cell(row, "status"))?.to_owned(),
        created_at: string_cell(row, "created_at"),
    })
}

fn recharge_package_status_label(status: AdminRechargePackageStatus) -> &'static str {
    match status {
        AdminRechargePackageStatus::Active => "active",
        AdminRechargePackageStatus::Inactive => "inactive",
    }
}

fn recharge_package_status_from_storage(value: &str) -> DomainResult<AdminRechargePackageStatus> {
    match value.trim().to_ascii_lowercase().as_str() {
        "active" => Ok(AdminRechargePackageStatus::Active),
        "inactive" => Ok(AdminRechargePackageStatus::Inactive),
        status => Err(DomainError::new(format!(
            "unsupported recharge package seed status: {status}"
        ))),
    }
}

fn payment_provider_label(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() {
        return "unknown".to_owned();
    }
    if value.bytes().all(|byte| byte.is_ascii_digit()) {
        format!("provider-{value}")
    } else {
        value.to_owned()
    }
}

fn payment_status_label(value: &str) -> DomainResult<&'static str> {
    match value.trim().to_ascii_lowercase().as_str() {
        "" => Ok("pending"),
        status if status == CommercePaymentStatus::Pending.as_str() => Ok("pending"),
        status if status == CommercePaymentStatus::Succeeded.as_str() => Ok("success"),
        "success" => Ok("success"),
        status if status == CommercePaymentStatus::Failed.as_str() => Ok("failed"),
        status if status == CommercePaymentStatus::Canceled.as_str() => Ok("expired"),
        "cancelled" | "expired" => Ok("expired"),
        status => Err(DomainError::new(format!(
            "unsupported admin payment attempt status: {status}"
        ))),
    }
}

fn current_timestamp_string() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    format_unix_timestamp(seconds)
}

fn format_unix_timestamp(seconds: i64) -> String {
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    format!("{year:04}-{month:02}-{day:02} {hour:02}:{minute:02}:{second:02}")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days = days + 719_468;
    let era = if days >= 0 { days } else { days - 146_096 } / 146_097;
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    let year = year + if month <= 2 { 1 } else { 0 };
    (year, month, day)
}

fn canonical_money_string(value: &str, field_name: &str) -> DomainResult<String> {
    let cents = money_cents(value)
        .map_err(|_| DomainError::new(format!("invalid {field_name}: {value}")))?;
    Ok(format!("{}.{:02}", cents / 100, cents.rem_euclid(100)))
}

fn exchange_rule_id(command: &UpdateAdminExchangeRuleCommand) -> String {
    format!(
        "exchange-rule-{}-{}-{}-{}",
        command.subject.tenant_id,
        command.subject.organization_id,
        storage_asset_type(&command.source_asset_type).unwrap_or(POINTS_STORAGE_ASSET_TYPE),
        storage_asset_type(&command.target_asset_type).unwrap_or(CASH_STORAGE_ASSET_TYPE)
    )
}

fn storage_asset_type(value: &str) -> DomainResult<&'static str> {
    match value.trim() {
        POINTS_ASSET_TYPE => Ok(POINTS_STORAGE_ASSET_TYPE),
        CASH_ASSET_TYPE => Ok(CASH_STORAGE_ASSET_TYPE),
        value => Err(DomainError::new(format!(
            "unsupported exchange rule asset type: {value}"
        ))),
    }
}

fn display_asset_type(value: &str) -> DomainResult<String> {
    match value.trim() {
        POINTS_STORAGE_ASSET_TYPE => Ok(POINTS_ASSET_TYPE.to_owned()),
        CASH_STORAGE_ASSET_TYPE => Ok(CASH_ASSET_TYPE.to_owned()),
        value => Err(DomainError::new(format!(
            "unsupported exchange rule asset type: {value}"
        ))),
    }
}

fn money_cents(amount: &str) -> DomainResult<i64> {
    let amount = amount.trim().trim_start_matches('$').replace(',', "");
    if amount.is_empty() || amount.starts_with('-') {
        return Err(DomainError::new("invalid money amount"));
    }
    let mut parts = amount.split('.');
    let whole = parts
        .next()
        .unwrap_or_default()
        .parse::<i64>()
        .map_err(|_| DomainError::new("invalid money amount"))?;
    let fraction = parts.next().unwrap_or_default();
    if parts.next().is_some() || fraction.len() > 2 {
        return Err(DomainError::new("invalid money amount"));
    }
    let mut padded = fraction.to_owned();
    while padded.len() < 2 {
        padded.push('0');
    }
    let cents = if padded.is_empty() {
        0
    } else {
        padded
            .parse::<i64>()
            .map_err(|_| DomainError::new("invalid money amount"))?
    };
    let total = whole
        .checked_mul(100)
        .and_then(|value| value.checked_add(cents))
        .ok_or_else(|| DomainError::new("invalid money amount"))?;
    if total <= 0 {
        return Err(DomainError::new("invalid money amount"));
    }
    Ok(total)
}

fn recharge_package_id(tenant_id: i64, organization_id: i64, sequence: i64) -> String {
    format!("recharge-package-{tenant_id}-{organization_id}-{sequence}")
}

fn recharge_package_no(sequence: i64) -> String {
    format!("RECHARGE-PACKAGE-{sequence}")
}

fn is_cny_currency(code: &str) -> bool {
    let normalized = code.trim();
    normalized.is_empty() || normalized.eq_ignore_ascii_case("CNY")
}

fn recharge_product_group_key(currency_code: &str) -> &'static str {
    if is_cny_currency(currency_code) {
        RECHARGE_PRODUCT_GROUP_CNY
    } else {
        RECHARGE_PRODUCT_GROUP_NON_CNY
    }
}

fn recharge_product_group_title(group_key: &str) -> &'static str {
    match group_key {
        RECHARGE_PRODUCT_GROUP_CNY => "Points recharge (CNY)",
        _ => "Points recharge (Non-CNY)",
    }
}

fn recharge_product_id(tenant_id: i64, organization_id: i64, group_key: &str) -> String {
    format!("recharge-product-{tenant_id}-{organization_id}-{group_key}")
}

fn recharge_product_no(group_key: &str) -> String {
    format!("RECHARGE-PRODUCT-{}", group_key.to_ascii_uppercase())
}

fn recharge_sku_id(tenant_id: i64, organization_id: i64, sequence: i64) -> String {
    format!("recharge-sku-{tenant_id}-{organization_id}-{sequence}")
}

fn recharge_sku_no(sequence: i64) -> String {
    format!("RECHARGE-SKU-{sequence}")
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<String, _>(column).ok())
        .or_else(|| {
            row.try_get::<Option<i64>, _>(column)
                .ok()
                .flatten()
                .map(|value| value.to_string())
        })
        .or_else(|| {
            row.try_get::<i64, _>(column)
                .ok()
                .map(|value| value.to_string())
        })
}

fn list_total(rows: &[sqlx::postgres::PgRow]) -> i64 {
    rows.first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0)
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    optional_string_cell(row, column).unwrap_or_default()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
    row.try_get::<i64, _>(column)
        .ok()
        .or_else(|| row.try_get::<Option<i64>, _>(column).ok().flatten())
        .or_else(|| {
            string_cell(row, column)
                .split('.')
                .next()
                .and_then(|value| value.parse().ok())
        })
}

fn decimal_money_string(value: &str) -> String {
    let normalized = value.trim();
    if normalized.is_empty() {
        return "$0.00".to_owned();
    }
    if let Some((whole, fraction)) = normalized.split_once('.') {
        let mut cents: String = fraction.chars().take(2).collect();
        while cents.len() < 2 {
            cents.push('0');
        }
        format!("${whole}.{cents}")
    } else {
        format!("${normalized}.00")
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recharge_status_label_rejects_unknown_database_status() {
        assert_eq!("pending", recharge_status_label("pending_payment").unwrap());
        assert_eq!(
            "pending",
            recharge_status_label(CommerceRechargeStatus::Pending.as_str()).unwrap()
        );
        assert_eq!(
            "success",
            recharge_status_label(CommerceRechargeStatus::Paid.as_str()).unwrap()
        );
        assert_eq!(
            "success",
            recharge_status_label(CommerceRechargeStatus::Fulfilled.as_str()).unwrap()
        );
        assert_eq!("failed", recharge_status_label("cancelled").unwrap());
        assert_eq!(
            "closed",
            recharge_status_label(CommerceRechargeStatus::Closed.as_str()).unwrap()
        );
        assert_eq!("closed", recharge_status_label("expired").unwrap());

        let unsupported =
            recharge_status_label("legacy-status").expect_err("unknown recharge status must fail");
        assert!(
            unsupported
                .to_string()
                .contains("unsupported admin recharge status: legacy-status"),
            "{unsupported}"
        );
    }

    #[test]
    fn payment_status_label_rejects_unknown_database_status() {
        assert_eq!(
            "pending",
            payment_status_label(CommercePaymentStatus::Pending.as_str()).unwrap()
        );
        assert_eq!(
            "success",
            payment_status_label(CommercePaymentStatus::Succeeded.as_str()).unwrap()
        );
        assert_eq!(
            "failed",
            payment_status_label(CommercePaymentStatus::Failed.as_str()).unwrap()
        );
        assert_eq!(
            "expired",
            payment_status_label(CommercePaymentStatus::Canceled.as_str()).unwrap()
        );

        let unsupported =
            payment_status_label("legacy-status").expect_err("unknown payment status must fail");
        assert!(
            unsupported
                .to_string()
                .contains("unsupported admin payment attempt status: legacy-status"),
            "{unsupported}"
        );
    }
}
