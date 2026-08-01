use crate::infrastructure::sql::commerce_bootstrap::{
    commerce_recharge_package_seeds, commerce_recharge_settings_seeds,
};
use sdkwork_contract_service::{
    CommercePaymentStatus, CommerceRechargeStatus, PromotionCouponStatus,
};
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
    CreateAdminRechargePackageCommand, CreatePromotionOfferCommand,
    DeleteAdminRechargePackageCommand, DeletePromotionOfferCommand,
    GeneratePromotionCouponStockCommand, ListAdminExchangeRulesQuery,
    ListAdminPaymentAttemptsQuery, ListAdminRechargePackagesQuery, ListAdminRechargeRecordsQuery,
    ListAdminReferralStatsQuery, ListPromotionCodeRedemptionsQuery, ListPromotionCodesQuery,
    ListPromotionCouponStocksQuery, ListPromotionOffersQuery, LoadAdminRechargeRecordQuery,
    PromotionCodeItem, PromotionCodeRedemptionItem, PromotionCouponStockItem, PromotionOfferItem,
    RechargeSettingsUpdateCommand, UpdateAdminExchangeRuleCommand,
    UpdateAdminRechargePackageCommand, UpdatePromotionCodeStatusCommand,
    UpdatePromotionOfferCommand,
};

const TARGET_TYPE_PROMOTION_OFFER: i32 = 71;
const TARGET_TYPE_PROMOTION_COUPON_STOCK: i32 = 72;
const TARGET_TYPE_PROMOTION_CODE: i32 = 73;
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
struct PromotionCodeStatusFact {
    status: String,
    user_id: Option<String>,
    used_at: Option<String>,
}

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
    fn list_promotion_offers<'a>(
        &'a self,
        query: ListPromotionOffersQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<PromotionOfferItem>> {
        Box::pin(async move { list_promotion_offers(&self.pool, query).await })
    }

    fn create_promotion_offer<'a>(
        &'a self,
        command: CreatePromotionOfferCommand,
    ) -> AdminMarketingCommandFuture<'a, PromotionOfferItem> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin promotion offer transaction", error)
            })?;
            let offer_id = create_promotion_offer(&mut tx, &command).await?;
            insert_audit_log_for_target_uuid(
                &mut tx,
                MarketingAuditContext::new(
                    &command.audit_log_uuid,
                    &command.request_id,
                    command.subject,
                ),
                "create_promotion_offer",
                TARGET_TYPE_PROMOTION_OFFER,
                &offer_id,
                serde_json::json!({
                    "action": "create_promotion_offer",
                    "offer_id": &offer_id,
                    "name": &command.name,
                    "discount_type": &command.discount_type,
                    "value": &command.value,
                    "status": &command.status
                }),
            )
            .await?;
            let item = load_promotion_offer_by_id(
                &mut tx,
                &offer_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created promotion offer could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit promotion offer transaction", error)
            })?;
            Ok(item)
        })
    }

    fn delete_promotion_offer<'a>(
        &'a self,
        command: DeletePromotionOfferCommand,
    ) -> AdminMarketingCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin promotion offer delete transaction", error)
            })?;
            let deleted = soft_delete_promotion_offer(&mut tx, &command).await?;
            if deleted {
                insert_audit_log_for_target_uuid(
                    &mut tx,
                    MarketingAuditContext::new(
                        &command.audit_log_uuid,
                        &command.request_id,
                        command.subject,
                    ),
                    "delete_promotion_offer",
                    TARGET_TYPE_PROMOTION_OFFER,
                    &command.offer_id,
                    serde_json::json!({
                        "action": "delete_promotion_offer",
                        "offer_id": &command.offer_id,
                        "deleted": true
                    }),
                )
                .await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit promotion offer delete transaction", error)
            })?;
            Ok(deleted)
        })
    }

    fn update_promotion_offer<'a>(
        &'a self,
        command: UpdatePromotionOfferCommand,
    ) -> AdminMarketingCommandFuture<'a, PromotionOfferItem> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin promotion offer update transaction", error)
            })?;
            let updated = update_promotion_offer_row(&mut tx, &command).await?;
            if !updated {
                return Err(DomainError::not_found("promotion offer was not found"));
            }
            insert_audit_log_for_target_uuid(
                &mut tx,
                MarketingAuditContext::new(
                    &command.audit_log_uuid,
                    &command.request_id,
                    command.subject,
                ),
                "update_promotion_offer",
                TARGET_TYPE_PROMOTION_OFFER,
                &command.offer_id,
                serde_json::json!({
                    "action": "update_promotion_offer",
                    "offer_id": &command.offer_id,
                    "name": &command.name,
                    "discount_type": &command.discount_type,
                    "value": &command.value,
                    "status": &command.status
                }),
            )
            .await?;
            let item = load_promotion_offer_by_id(
                &mut tx,
                &command.offer_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("updated promotion offer could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit promotion offer update transaction", error)
            })?;
            Ok(item)
        })
    }

    fn list_promotion_coupon_stocks<'a>(
        &'a self,
        query: ListPromotionCouponStocksQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<PromotionCouponStockItem>> {
        Box::pin(async move { list_promotion_coupon_stocks(&self.pool, query).await })
    }

    fn generate_promotion_coupon_stock<'a>(
        &'a self,
        command: GeneratePromotionCouponStockCommand,
    ) -> AdminMarketingCommandFuture<'a, (PromotionCouponStockItem, Vec<PromotionCodeItem>)> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error(
                    "failed to begin promotion coupon stock generation transaction",
                    error,
                )
            })?;
            if !promotion_offer_exists(
                &mut tx,
                &command.offer_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            {
                return Err(DomainError::not_found("promotion offer was not found"));
            }
            let stock_id = insert_promotion_coupon_stock(&mut tx, &command).await?;
            let codes = insert_promotion_codes(&mut tx, &command, &stock_id).await?;
            update_promotion_offer_received_count(&mut tx, &command).await?;
            insert_audit_log_for_target_uuid(
                &mut tx,
                MarketingAuditContext::new(
                    &command.audit_log_uuid,
                    &command.request_id,
                    command.subject,
                ),
                "generate_promotion_coupon_stock",
                TARGET_TYPE_PROMOTION_COUPON_STOCK,
                &stock_id,
                serde_json::json!({
                    "action": "generate_promotion_coupon_stock",
                    "stock_id": &stock_id,
                    "offer_id": &command.offer_id,
                    "total_quantity": command.total_quantity,
                    "code_prefix": &command.code_prefix
                }),
            )
            .await?;
            let stock = load_promotion_coupon_stock_by_id(
                &mut tx,
                &stock_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| {
                DomainError::new("created promotion coupon stock could not be reloaded")
            })?;
            tx.commit().await.map_err(|error| {
                store_error(
                    "failed to commit promotion coupon stock generation transaction",
                    error,
                )
            })?;
            Ok((stock, codes))
        })
    }

    fn list_promotion_codes<'a>(
        &'a self,
        query: ListPromotionCodesQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<PromotionCodeItem>> {
        Box::pin(async move { list_promotion_codes(&self.pool, query).await })
    }

    fn update_promotion_code_status<'a>(
        &'a self,
        command: UpdatePromotionCodeStatusCommand,
    ) -> AdminMarketingCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin promotion code status transaction", error)
            })?;
            let updated = update_promotion_code_status(&mut tx, &command).await?;
            if updated {
                if let Some(stock_id) = find_stock_for_promotion_code(&mut tx, &command).await? {
                    refresh_stock_counters(&mut tx, &stock_id).await?;
                }
                insert_audit_log_for_target_uuid(
                    &mut tx,
                    MarketingAuditContext::new(
                        &command.audit_log_uuid,
                        &command.request_id,
                        command.subject,
                    ),
                    "update_promotion_code_status",
                    TARGET_TYPE_PROMOTION_CODE,
                    &command.code_id,
                    serde_json::json!({
                        "action": "update_promotion_code_status",
                        "code_id": &command.code_id,
                        "status": &command.status
                    }),
                )
                .await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit promotion code status transaction", error)
            })?;
            Ok(updated)
        })
    }

    fn list_promotion_code_redemptions<'a>(
        &'a self,
        query: ListPromotionCodeRedemptionsQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<PromotionCodeRedemptionItem>> {
        Box::pin(async move { list_promotion_code_redemptions(&self.pool, query).await })
    }

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

async fn list_promotion_offers(
    pool: &PgPool,
    query: ListPromotionOffersQuery,
) -> DomainResult<AdminMarketingListPage<PromotionOfferItem>> {
    let rows = sqlx::query(
        r#"
        SELECT
            o.id::text AS id,
            COALESCE(o.name, '') AS name,
            COALESCE(v.discount_type, '') AS type_code,
            COALESCE(v.discount_value, '0')::text AS amount,
            COALESCE(v.discount_value, '0')::text AS discount,
            o.status AS status,
            COUNT(*) OVER() AS total
        FROM promotion_offer o
        LEFT JOIN promotion_offer_version v
          ON v.tenant_id = o.tenant_id
         AND v.organization_id = o.organization_id
         AND v.offer_id = o.id
         AND v.id = o.current_offer_version_id
         AND v.lifecycle_status = 'published'
        WHERE o.tenant_id = $1::text
          AND o.organization_id = $2::text
          AND o.offer_type = 'coupon'
          AND o.status <> 'disabled'
        ORDER BY o.updated_at DESC, o.id DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list promotion offers", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(promotion_offer_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminMarketingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn create_promotion_offer(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreatePromotionOfferCommand,
) -> DomainResult<String> {
    let version_number = 1;
    let version_no = promotion_offer_version_no(version_number);
    let version_id = promotion_offer_version_id(&command.offer_uuid, version_number);
    sqlx::query(
        r#"
        INSERT INTO promotion_offer
            (id, tenant_id, organization_id, offer_no, offer_code, name, offer_type,
             audience_scope, combinability, priority, status, current_offer_version_id, starts_at, ends_at,
             created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, $5, $6, 'coupon',
             'all', 'exclusive', 0, $7, $8, NULL, NULL, $9, $10)
        "#,
    )
    .bind(&command.offer_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(promotion_offer_no(&command.offer_uuid))
    .bind(promotion_offer_code(&command.offer_uuid))
    .bind(&command.name)
    .bind(promotion_offer_status_value(&command.status))
    .bind(&version_id)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create promotion offer", error))?;
    sqlx::query(
        r#"
        INSERT INTO promotion_offer_version
            (id, tenant_id, organization_id, offer_id, version_no, lifecycle_status,
             discount_type, discount_value, minimum_amount, maximum_discount_amount,
             currency_code, rule_json, stack_rule_json, published_at, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, $5, 'published',
             $6, $7, '0', NULL, 'CNY', '{}', NULL, $8, $9, $10)
        "#,
    )
    .bind(&version_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.offer_uuid)
    .bind(&version_no)
    .bind(discount_type_code(&command.discount_type))
    .bind(promotion_offer_discount_value(command))
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to publish promotion offer version", error))?;
    Ok(command.offer_uuid.clone())
}

async fn load_promotion_offer_by_id(
    tx: &mut Transaction<'_, Postgres>,
    offer_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<PromotionOfferItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            o.id::text AS id,
            COALESCE(o.name, '') AS name,
            COALESCE(v.discount_type, '') AS type_code,
            COALESCE(v.discount_value, '0')::text AS amount,
            COALESCE(v.discount_value, '0')::text AS discount,
            o.status AS status
        FROM promotion_offer o
        LEFT JOIN promotion_offer_version v
          ON v.tenant_id = o.tenant_id
         AND v.organization_id = o.organization_id
         AND v.offer_id = o.id
         AND v.id = o.current_offer_version_id
         AND v.lifecycle_status = 'published'
        WHERE o.id = $1
          AND o.tenant_id = $2::text
          AND o.organization_id = $3::text
          AND o.offer_type = 'coupon'
          AND o.status <> 'disabled'
        LIMIT 1
        "#,
    )
    .bind(offer_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load coupon", error))?;

    row.as_ref().map(promotion_offer_from_row).transpose()
}

async fn soft_delete_promotion_offer(
    tx: &mut Transaction<'_, Postgres>,
    command: &DeletePromotionOfferCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE promotion_offer
        SET status = $1,
            updated_at = $2
        WHERE id = $3
          AND tenant_id = $4::text
          AND organization_id = $5::text
          AND status <> 'disabled'
        "#,
    )
    .bind(PromotionCouponStatus::Disabled.as_str())
    .bind(&command.requested_at)
    .bind(&command.offer_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete coupon", error))?;
    if result.rows_affected() > 0 {
        sqlx::query(
            r#"
            UPDATE promotion_coupon_stock
            SET status = $1,
                updated_at = $2
            WHERE offer_id = $3
              AND tenant_id = $4::text
              AND organization_id = $5::text
            "#,
        )
        .bind(PromotionCouponStatus::Disabled.as_str())
        .bind(&command.requested_at)
        .bind(&command.offer_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to disable coupon stocks", error))?;
        sqlx::query(
            r#"
            UPDATE promotion_code
            SET status = $1,
                updated_at = $2
            WHERE offer_id = $3
              AND tenant_id = $4::text
              AND organization_id = $5::text
            "#,
        )
        .bind(PromotionCouponStatus::Disabled.as_str())
        .bind(&command.requested_at)
        .bind(&command.offer_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to disable coupon codes", error))?;
    }
    Ok(result.rows_affected() > 0)
}

async fn update_promotion_offer_row(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdatePromotionOfferCommand,
) -> DomainResult<bool> {
    let next_version_number = next_offer_version_number(
        tx,
        &command.offer_id,
        command.subject.tenant_id,
        command.subject.organization_id,
    )
    .await?;
    let next_version_no = promotion_offer_version_no(next_version_number);
    let next_version_id = promotion_offer_version_id(&command.offer_id, next_version_number);
    let result = sqlx::query(
        r#"
        UPDATE promotion_offer
        SET name = $1,
            status = $2,
            current_offer_version_id = $3,
            updated_at = $4
        WHERE id = $5
          AND tenant_id = $6::text
          AND organization_id = $7::text
          AND status <> 'disabled'
        "#,
    )
    .bind(&command.name)
    .bind(promotion_offer_status_value(&command.status))
    .bind(&next_version_id)
    .bind(&command.requested_at)
    .bind(&command.offer_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update coupon", error))?;
    if result.rows_affected() == 0 {
        return Ok(false);
    }
    sqlx::query(
        r#"
        INSERT INTO promotion_offer_version
            (id, tenant_id, organization_id, offer_id, version_no, lifecycle_status,
             discount_type, discount_value, minimum_amount, maximum_discount_amount,
             currency_code, rule_json, stack_rule_json, published_at, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, $5, 'published',
             $6, $7, '0', NULL, 'CNY', '{}', NULL, $8, $9, $10)
        "#,
    )
    .bind(&next_version_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.offer_id)
    .bind(&next_version_no)
    .bind(discount_type_code(&command.discount_type))
    .bind(promotion_offer_discount_value(command))
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to publish coupon version", error))?;
    Ok(result.rows_affected() > 0)
}

async fn next_offer_version_number(
    tx: &mut Transaction<'_, Postgres>,
    offer_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<i64> {
    let version_numbers: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT version_no
        FROM promotion_offer_version
        WHERE offer_id = $1
          AND tenant_id = $2::text
          AND organization_id = $3::text
        "#,
    )
    .bind(offer_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_all(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load promotion offer versions", error))?;
    let current_max = version_numbers
        .iter()
        .filter_map(|version_no| promotion_offer_version_number(version_no))
        .max()
        .unwrap_or(0);
    current_max
        .checked_add(1)
        .ok_or_else(|| DomainError::conflict("promotion offer version sequence exhausted"))
}

async fn list_promotion_coupon_stocks(
    pool: &PgPool,
    query: ListPromotionCouponStocksQuery,
) -> DomainResult<AdminMarketingListPage<PromotionCouponStockItem>> {
    let rows = sqlx::query(COUPON_STOCK_LIST_SQL)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list promotion coupon stocks", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(promotion_coupon_stock_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminMarketingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn promotion_offer_exists(
    tx: &mut Transaction<'_, Postgres>,
    offer_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<bool> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM promotion_offer
        WHERE id = $1
          AND tenant_id = $2::text
          AND organization_id = $3::text
          AND offer_type = 'coupon'
          AND status <> 'disabled'
        "#,
    )
    .bind(offer_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to check promotion offer existence", error))?;
    Ok(count > 0)
}

async fn insert_promotion_coupon_stock(
    tx: &mut Transaction<'_, Postgres>,
    command: &GeneratePromotionCouponStockCommand,
) -> DomainResult<String> {
    let stock_no = promotion_coupon_stock_no(&command.code_prefix, &command.stock_uuid);
    let offer_version_id = load_published_offer_version_id(tx, command).await?;
    sqlx::query(
        r#"
        INSERT INTO promotion_coupon_stock
            (id, tenant_id, organization_id, stock_no, name, offer_id, offer_version_id,
             stock_type, total_quantity, available_quantity, claimed_quantity, redeemed_quantity,
             locked_quantity, status, starts_at, expires_at, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, $5, $6, $7, 'code_claim',
             $8, $9, 0, 0, 0, 'active', $10, NULL, $11, $12)
        "#,
    )
    .bind(&command.stock_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&stock_no)
    .bind(&command.name)
    .bind(&command.offer_id)
    .bind(&offer_version_id)
    .bind(command.total_quantity)
    .bind(command.total_quantity)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create promotion coupon stock", error))?;
    Ok(command.stock_uuid.clone())
}

async fn load_published_offer_version_id(
    tx: &mut Transaction<'_, Postgres>,
    command: &GeneratePromotionCouponStockCommand,
) -> DomainResult<String> {
    sqlx::query_scalar(
        r#"
        SELECT v.id
        FROM promotion_offer o
        JOIN promotion_offer_version v
          ON v.tenant_id = o.tenant_id
         AND v.organization_id = o.organization_id
         AND v.offer_id = o.id
         AND v.id = o.current_offer_version_id
         AND v.lifecycle_status = 'published'
        WHERE o.id = $1
          AND o.tenant_id = $2::text
          AND o.organization_id = $3::text
          AND o.offer_type = 'coupon'
          AND o.status <> 'disabled'
        LIMIT 1
        "#,
    )
    .bind(&command.offer_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load promotion offer version", error))?
    .ok_or_else(|| DomainError::conflict("promotion offer has no published version"))
}

async fn insert_promotion_codes(
    tx: &mut Transaction<'_, Postgres>,
    command: &GeneratePromotionCouponStockCommand,
    stock_id: &str,
) -> DomainResult<Vec<PromotionCodeItem>> {
    let offer_version_id = load_stock_offer_version_id(
        tx,
        stock_id,
        command.subject.tenant_id,
        command.subject.organization_id,
    )
    .await?;
    let mut codes = Vec::with_capacity(command.total_quantity as usize);
    let mut sequence = next_promotion_code_sequence(tx, command).await?;
    for _ in 0..command.total_quantity {
        loop {
            let (current_sequence, code) =
                next_available_promotion_code(tx, command, sequence).await?;
            let uuid = format!("{}-code-{current_sequence}", command.stock_uuid);
            let result = sqlx::query(
                r#"
                INSERT INTO promotion_code
                    (id, tenant_id, organization_id, code_no, stock_id, offer_id, offer_version_id, promotion_code,
                     code_type, max_claims, claimed_quantity, status, starts_at, expires_at,
                     created_at, updated_at)
                VALUES
                    ($1, $2::text, $3::text, $4, $5, $6, $7, $8,
                     'single_use', 1, 0, $9, $10, NULL, $11, $12)
                ON CONFLICT(tenant_id, promotion_code) DO NOTHING
                "#,
            )
            .bind(&uuid)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(promotion_code_no(&command.code_prefix, &command.stock_uuid, current_sequence))
            .bind(stock_id)
            .bind(&command.offer_id)
            .bind(&offer_version_id)
            .bind(&code)
            .bind(PromotionCouponStatus::Active.as_str())
            .bind(&command.requested_at)
            .bind(&command.requested_at)
            .bind(&command.requested_at)
            .execute(&mut **tx)
            .await
            .map_err(|error| store_error("failed to create promotion code", error))?;
            sequence = current_sequence
                .checked_add(1)
                .ok_or_else(|| DomainError::conflict("promotion code sequence exhausted"))?;
            if result.rows_affected() == 0 {
                continue;
            }
            codes.push(PromotionCodeItem {
                id: uuid,
                stock_id: stock_id.to_owned(),
                promotion_code: code,
                status: "available".to_owned(),
                used_by: None,
                used_at: None,
            });
            break;
        }
    }
    Ok(codes)
}

async fn load_stock_offer_version_id(
    tx: &mut Transaction<'_, Postgres>,
    stock_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<String> {
    sqlx::query_scalar(
        r#"
        SELECT offer_version_id
        FROM promotion_coupon_stock
        WHERE id = $1
          AND tenant_id = $2::text
          AND organization_id = $3::text
        LIMIT 1
        "#,
    )
    .bind(stock_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load coupon stock offer version", error))?
    .ok_or_else(|| DomainError::conflict("coupon stock has no promotion offer version"))
}

async fn next_promotion_code_sequence(
    tx: &mut Transaction<'_, Postgres>,
    command: &GeneratePromotionCouponStockCommand,
) -> DomainResult<i64> {
    let code_pattern = format!("{}-%", escape_like_pattern(&command.code_prefix));
    let existing_codes: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT promotion_code
        FROM promotion_code
        WHERE promotion_code LIKE $1 ESCAPE '!'
        "#,
    )
    .bind(code_pattern)
    .fetch_all(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load existing promotion codes", error))?;

    let max_sequence = existing_codes
        .iter()
        .filter_map(|code| promotion_code_sequence(&command.code_prefix, code))
        .max()
        .unwrap_or(0);
    max_sequence
        .checked_add(1)
        .ok_or_else(|| DomainError::conflict("promotion code sequence exhausted"))
}

async fn next_available_promotion_code(
    tx: &mut Transaction<'_, Postgres>,
    command: &GeneratePromotionCouponStockCommand,
    mut sequence: i64,
) -> DomainResult<(i64, String)> {
    loop {
        let code = format_promotion_code(&command.code_prefix, sequence);
        if !promotion_code_exists(tx, &code).await? {
            return Ok((sequence, code));
        }
        sequence = sequence
            .checked_add(1)
            .ok_or_else(|| DomainError::conflict("promotion code sequence exhausted"))?;
    }
}

async fn promotion_code_exists(
    tx: &mut Transaction<'_, Postgres>,
    promotion_code: &str,
) -> DomainResult<bool> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM promotion_code
        WHERE promotion_code = $1
        "#,
    )
    .bind(promotion_code)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to check promotion code uniqueness", error))?;
    Ok(count > 0)
}

async fn update_promotion_offer_received_count(
    tx: &mut Transaction<'_, Postgres>,
    command: &GeneratePromotionCouponStockCommand,
) -> DomainResult<()> {
    let _ = (tx, command);
    Ok(())
}

async fn load_promotion_coupon_stock_by_id(
    tx: &mut Transaction<'_, Postgres>,
    stock_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<PromotionCouponStockItem>> {
    let row = sqlx::query(COUPON_STOCK_BY_ID_SQL)
        .bind(stock_id)
        .bind(tenant_id)
        .bind(organization_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to load promotion coupon stock", error))?;

    row.as_ref()
        .map(promotion_coupon_stock_from_row)
        .transpose()
}

async fn list_promotion_codes(
    pool: &PgPool,
    query: ListPromotionCodesQuery,
) -> DomainResult<AdminMarketingListPage<PromotionCodeItem>> {
    let rows = sqlx::query(
        r#"
        SELECT
            pc.id::text AS id,
            COALESCE(pc.stock_id, '') AS stock_id,
            COALESCE(pc.promotion_code, '') AS promotion_code,
            CASE
                WHEN pc.status = 'disabled' THEN pc.status
                WHEN puc.status = 'redeemed' OR puc.redeemed_at IS NOT NULL THEN 'redeemed'
                ELSE pc.status
            END AS status,
            puc.owner_user_id AS user_id,
            puc.redeemed_at::text AS used_at,
            COALESCE(NULLIF(u.email, ''), NULLIF(u.username, ''), '') AS used_by,
            COUNT(*) OVER() AS total
        FROM promotion_code pc
        LEFT JOIN promotion_user_coupon puc
          ON puc.tenant_id = pc.tenant_id
         AND puc.organization_id = pc.organization_id
         AND puc.code_id = pc.id
        LEFT JOIN iam_user u
          ON u.id = puc.owner_user_id
         AND u.tenant_id = pc.tenant_id
        WHERE pc.tenant_id = $1::text
          AND pc.organization_id = $2::text
          AND pc.stock_id IS NOT NULL
        ORDER BY pc.created_at DESC, pc.promotion_code DESC, pc.id DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list promotion codes", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(promotion_code_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminMarketingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn update_promotion_code_status(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdatePromotionCodeStatusCommand,
) -> DomainResult<bool> {
    let status = promotion_code_status_value(&command.status);
    let Some(fact) = load_promotion_code_status_fact(tx, command).await? else {
        return Ok(false);
    };
    ensure_promotion_code_status_transition(&fact, status)?;
    let result = if status == PromotionCouponStatus::Redeemed.as_str() {
        sqlx::query(
            r#"
            UPDATE promotion_user_coupon
            SET status = $1,
                redeemed_at = COALESCE(redeemed_at, $2),
                updated_at = $3
            WHERE code_id = $4
              AND tenant_id = $5::text
              AND organization_id = $6::text
              AND status <> 'disabled'
            "#,
        )
        .bind(status)
        .bind(&command.requested_at)
        .bind(&command.requested_at)
        .bind(&command.code_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to mark user coupon redeemed", error))?
    } else {
        sqlx::query(
            r#"
            UPDATE promotion_code
            SET status = $1,
                updated_at = $2
            WHERE id = $3
              AND tenant_id = $4::text
              AND organization_id = $5::text
              AND status <> 'disabled'
            "#,
        )
        .bind(status)
        .bind(&command.requested_at)
        .bind(&command.code_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to update promotion code status", error))?
    };
    Ok(result.rows_affected() > 0)
}

async fn load_promotion_code_status_fact(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdatePromotionCodeStatusCommand,
) -> DomainResult<Option<PromotionCodeStatusFact>> {
    let row = sqlx::query(
        r#"
        SELECT
            CASE
                WHEN pc.status = 'disabled' THEN pc.status
                WHEN puc.status = 'redeemed' OR puc.redeemed_at IS NOT NULL THEN 'redeemed'
                ELSE pc.status
            END AS status,
            puc.owner_user_id AS user_id,
            puc.redeemed_at::text AS used_at
        FROM promotion_code pc
        LEFT JOIN promotion_user_coupon puc
          ON puc.tenant_id = pc.tenant_id
         AND puc.organization_id = pc.organization_id
         AND puc.code_id = pc.id
        WHERE pc.id = $1
          AND pc.tenant_id = $2::text
          AND pc.organization_id = $3::text
          AND pc.status <> 'disabled'
        LIMIT 1
        "#,
    )
    .bind(&command.code_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load promotion code status", error))?;

    row.map(|row| {
        Ok(PromotionCodeStatusFact {
            status: string_cell(&row, "status"),
            user_id: optional_string_cell(&row, "user_id").filter(|value| !value.is_empty()),
            used_at: optional_string_cell(&row, "used_at").filter(|value| !value.is_empty()),
        })
    })
    .transpose()
}

async fn find_stock_for_promotion_code(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdatePromotionCodeStatusCommand,
) -> DomainResult<Option<String>> {
    sqlx::query_scalar(
        r#"
        SELECT stock_id
        FROM promotion_code
        WHERE id = $1
          AND tenant_id = $2::text
          AND organization_id = $3::text
        LIMIT 1
        "#,
    )
    .bind(&command.code_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to find promotion code stock", error))
}

async fn refresh_stock_counters(
    tx: &mut Transaction<'_, Postgres>,
    stock_id: &str,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE promotion_coupon_stock
        SET available_quantity = (
                SELECT COUNT(*)
                FROM promotion_code c
                LEFT JOIN promotion_user_coupon uc
                  ON uc.tenant_id = c.tenant_id
                 AND uc.organization_id = c.organization_id
                 AND uc.code_id = c.id
                WHERE c.tenant_id = promotion_coupon_stock.tenant_id
                  AND c.organization_id = promotion_coupon_stock.organization_id
                  AND c.stock_id = promotion_coupon_stock.id
                  AND c.status = 'active'
                  AND uc.id IS NULL
            ),
            claimed_quantity = (
                SELECT COUNT(*)
                FROM promotion_user_coupon uc
                WHERE uc.tenant_id = promotion_coupon_stock.tenant_id
                  AND uc.organization_id = promotion_coupon_stock.organization_id
                  AND uc.stock_id = promotion_coupon_stock.id
                  AND uc.status <> 'redeemed'
                  AND uc.redeemed_at IS NULL
            ),
            redeemed_quantity = (
                SELECT COUNT(*)
                FROM promotion_user_coupon uc
                WHERE uc.tenant_id = promotion_coupon_stock.tenant_id
                  AND uc.organization_id = promotion_coupon_stock.organization_id
                  AND uc.stock_id = promotion_coupon_stock.id
                  AND (uc.status = 'redeemed' OR uc.redeemed_at IS NOT NULL)
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        "#,
    )
    .bind(stock_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to refresh promotion coupon stock counters", error))?;
    Ok(())
}

async fn list_promotion_code_redemptions(
    pool: &PgPool,
    query: ListPromotionCodeRedemptionsQuery,
) -> DomainResult<AdminMarketingListPage<PromotionCodeRedemptionItem>> {
    let rows = sqlx::query(
        r#"
        SELECT
            c.id::text AS id,
            c.owner_user_id::text AS owner_user_id,
            COALESCE(NULLIF(u.email, ''), NULLIF(u.username, ''), '') AS user_name,
            COALESCE(c.coupon_code, '') AS submitted_code,
            COALESCE(v.discount_value, '0')::text AS amount,
            COALESCE(c.redeemed_at, c.updated_at, c.claimed_at, c.created_at)::text AS occurred_at,
            COUNT(*) OVER() AS total
        FROM promotion_user_coupon c
        JOIN promotion_offer_version v
          ON v.id = c.offer_version_id
         AND v.tenant_id = c.tenant_id
        LEFT JOIN iam_user u
          ON u.id = c.owner_user_id
         AND u.tenant_id = c.tenant_id
        WHERE c.tenant_id = $1::text
          AND c.organization_id = $2::text
          AND c.owner_user_id IS NOT NULL
          AND (c.redeemed_at IS NOT NULL OR c.status = 'redeemed')
        ORDER BY COALESCE(c.redeemed_at, c.updated_at, c.claimed_at, c.created_at) DESC, c.id DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list promotion code redemptions", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(|row| {
            Ok(PromotionCodeRedemptionItem {
                id: string_cell(row, "id"),
                owner_user_id: string_cell(row, "owner_user_id"),
                user: string_cell(row, "user_name"),
                submitted_code: string_cell(row, "submitted_code"),
                amount: decimal_money_string(&string_cell(row, "amount")),
                occurred_at: string_cell(row, "occurred_at"),
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

    let mut query_builder = sqlx::query(&sql)
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

const COUPON_STOCK_LIST_SQL: &str = r#"
SELECT
    id::text AS id,
    offer_id::text AS offer_id,
    COALESCE(name, '') AS name,
    COALESCE(total_quantity, 0) AS total_quantity,
    COALESCE(SUBSTRING(stock_no FROM 7 FOR POSITION('-' IN SUBSTRING(stock_no FROM 7)) - 1), '') AS code_prefix,
    created_at::text AS created_at,
    COUNT(*) OVER() AS total
FROM promotion_coupon_stock
WHERE tenant_id = $1::text
  AND organization_id = $2::text
  AND status = 'active'
ORDER BY created_at DESC, id DESC
LIMIT $3 OFFSET $4
"#;

const COUPON_STOCK_BY_ID_SQL: &str = r#"
SELECT
    id::text AS id,
    offer_id::text AS offer_id,
    COALESCE(name, '') AS name,
    COALESCE(total_quantity, 0) AS total_quantity,
    COALESCE(SUBSTRING(stock_no FROM 7 FOR POSITION('-' IN SUBSTRING(stock_no FROM 7)) - 1), '') AS code_prefix,
    created_at::text AS created_at
FROM promotion_coupon_stock
WHERE id = $1
  AND tenant_id = $2::text
  AND organization_id = $3::text
  AND status = 'active'
LIMIT 1
"#;

fn promotion_offer_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<PromotionOfferItem> {
    let amount = string_cell(row, "amount");
    let discount = string_cell(row, "discount");
    let discount_type = discount_type_label(&string_cell(row, "type_code"))?.to_owned();
    let value = if discount_type == "discount" {
        discount_value_string(&discount)
    } else {
        decimal_money_string(&amount)
    };
    let status = promotion_offer_status_label(&string_cell(row, "status"))?.to_owned();
    Ok(PromotionOfferItem {
        id: string_cell(row, "id"),
        name: string_cell(row, "name"),
        discount_type,
        value,
        status,
    })
}

fn promotion_coupon_stock_from_row(
    row: &sqlx::postgres::PgRow,
) -> DomainResult<PromotionCouponStockItem> {
    Ok(PromotionCouponStockItem {
        id: string_cell(row, "id"),
        offer_id: string_cell(row, "offer_id"),
        name: string_cell(row, "name"),
        total_quantity: integer_cell(row, "total_quantity"),
        code_prefix: string_cell(row, "code_prefix"),
        created_at: string_cell(row, "created_at"),
    })
}

fn promotion_code_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<PromotionCodeItem> {
    let user_id = optional_string_cell(row, "user_id");
    let used_at = optional_string_cell(row, "used_at").filter(|value| !value.is_empty());
    let status = promotion_code_status_label(
        &string_cell(row, "status"),
        user_id.as_deref(),
        used_at.as_deref(),
    )?
    .to_owned();
    Ok(PromotionCodeItem {
        id: string_cell(row, "id"),
        stock_id: string_cell(row, "stock_id"),
        promotion_code: string_cell(row, "promotion_code"),
        status,
        used_by: optional_string_cell(row, "used_by").filter(|value| !value.is_empty()),
        used_at,
    })
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

fn promotion_offer_no(offer_uuid: &str) -> String {
    format!("offer-{offer_uuid}")
}

fn promotion_offer_code(offer_uuid: &str) -> String {
    offer_uuid.to_owned()
}

fn promotion_offer_version_no(version_number: i64) -> String {
    format!("v{version_number}")
}

fn promotion_offer_version_id(offer_uuid: &str, version_number: i64) -> String {
    format!(
        "{offer_uuid}-version-{}",
        promotion_offer_version_no(version_number)
    )
}

fn promotion_offer_version_number(version_no: &str) -> Option<i64> {
    version_no
        .strip_prefix('v')
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| *value > 0)
}

fn promotion_coupon_stock_no(code_prefix: &str, stock_uuid: &str) -> String {
    format!("stock-{code_prefix}-{stock_uuid}")
}

fn promotion_code_no(code_prefix: &str, stock_uuid: &str, sequence: i64) -> String {
    format!("code-{code_prefix}-{stock_uuid}-{sequence:04}")
}

fn discount_type_code(value: &str) -> &'static str {
    if value == "discount" {
        "percent_off"
    } else {
        "fixed_amount"
    }
}

trait PromotionOfferDiscountValue {
    fn discount_type(&self) -> &str;
    fn amount_cents(&self) -> i64;
    fn discount_value(&self) -> Option<&str>;
}

impl PromotionOfferDiscountValue for CreatePromotionOfferCommand {
    fn discount_type(&self) -> &str {
        &self.discount_type
    }

    fn amount_cents(&self) -> i64 {
        self.amount_cents
    }

    fn discount_value(&self) -> Option<&str> {
        self.discount_value.as_deref()
    }
}

impl PromotionOfferDiscountValue for UpdatePromotionOfferCommand {
    fn discount_type(&self) -> &str {
        &self.discount_type
    }

    fn amount_cents(&self) -> i64 {
        self.amount_cents
    }

    fn discount_value(&self) -> Option<&str> {
        self.discount_value.as_deref()
    }
}

fn promotion_offer_discount_value(command: &impl PromotionOfferDiscountValue) -> String {
    if command.discount_type() == "discount" {
        command.discount_value().unwrap_or("0").to_owned()
    } else {
        let cents = command.amount_cents();
        format!("{}.{:02}", cents / 100, cents.rem_euclid(100))
    }
}

fn discount_type_label(value: &str) -> DomainResult<&'static str> {
    match value.trim().to_ascii_lowercase().as_str() {
        "fixed_amount" => Ok("amount"),
        "percent_off" => Ok("discount"),
        value => Err(DomainError::new(format!(
            "unsupported promotion offer discount type: {value}"
        ))),
    }
}

fn promotion_offer_status_value(value: &str) -> &'static str {
    if value == "inactive" {
        PromotionCouponStatus::Draft.as_str()
    } else {
        PromotionCouponStatus::Active.as_str()
    }
}

fn promotion_offer_status_label(value: &str) -> DomainResult<&'static str> {
    match value.trim().to_ascii_lowercase().as_str() {
        status if status == PromotionCouponStatus::Active.as_str() => Ok("active"),
        status if status == PromotionCouponStatus::Draft.as_str() => Ok("inactive"),
        status if status == PromotionCouponStatus::Disabled.as_str() => Ok("inactive"),
        status if status == PromotionCouponStatus::Expired.as_str() => Ok("inactive"),
        status if status == PromotionCouponStatus::Redeemed.as_str() => Ok("inactive"),
        value => Err(DomainError::new(format!(
            "unsupported promotion offer status: {value}"
        ))),
    }
}

fn promotion_code_status_value(value: &str) -> &'static str {
    match value {
        "used" => PromotionCouponStatus::Redeemed.as_str(),
        "voided" => PromotionCouponStatus::Disabled.as_str(),
        _ => PromotionCouponStatus::Active.as_str(),
    }
}

fn ensure_promotion_code_status_transition(
    fact: &PromotionCodeStatusFact,
    target_status: &str,
) -> DomainResult<()> {
    let has_user = fact.user_id.is_some();
    let has_used_at = fact
        .used_at
        .as_deref()
        .map(|value| !value.is_empty())
        .unwrap_or(false);
    let is_used = fact.status == PromotionCouponStatus::Redeemed.as_str() || has_used_at;

    if is_used {
        if target_status == PromotionCouponStatus::Redeemed.as_str() {
            return Ok(());
        }
        return Err(DomainError::conflict(
            "used promotion code cannot be reopened",
        ));
    }

    if target_status == PromotionCouponStatus::Active.as_str() && has_user {
        return Err(DomainError::conflict(
            "claimed promotion code cannot be reopened",
        ));
    }

    if target_status == PromotionCouponStatus::Redeemed.as_str() && !has_user {
        return Err(DomainError::conflict(
            "promotion code must be claimed before it can be marked used",
        ));
    }

    Ok(())
}

fn promotion_code_status_label(
    status: &str,
    user_id: Option<&str>,
    used_at: Option<&str>,
) -> DomainResult<&'static str> {
    match status.trim().to_ascii_lowercase().as_str() {
        status if status == PromotionCouponStatus::Disabled.as_str() => Ok("voided"),
        status if status == PromotionCouponStatus::Redeemed.as_str() => Ok("used"),
        status if status == PromotionCouponStatus::Active.as_str() && used_at.is_some() => {
            Ok("used")
        }
        status
            if status == PromotionCouponStatus::Active.as_str()
                && user_id.map(|value| !value.is_empty()).unwrap_or(false) =>
        {
            Ok("claimed")
        }
        status if status == PromotionCouponStatus::Active.as_str() => Ok("available"),
        status if status == PromotionCouponStatus::Draft.as_str() => Ok("available"),
        value => Err(DomainError::new(format!(
            "unsupported promotion code status: {value}"
        ))),
    }
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

fn format_promotion_code(code_prefix: &str, sequence: i64) -> String {
    format!("{code_prefix}-{sequence:04}")
}

fn promotion_code_sequence(code_prefix: &str, promotion_code: &str) -> Option<i64> {
    let suffix = promotion_code
        .strip_prefix(code_prefix)?
        .strip_prefix('-')?;
    if suffix.is_empty() || !suffix.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    suffix.parse().ok()
}

fn escape_like_pattern(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        if matches!(character, '!' | '%' | '_') {
            escaped.push('!');
        }
        escaped.push(character);
    }
    escaped
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

fn discount_value_string(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        "0.00%".to_owned()
    } else if let Some((whole, fraction)) = trimmed.split_once('.') {
        let mut decimals: String = fraction.chars().take(2).collect();
        while decimals.len() < 2 {
            decimals.push('0');
        }
        format!("{whole}.{decimals}%")
    } else {
        format!("{trimmed}.00%")
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn promotion_offer_status_label_rejects_unknown_database_status() {
        assert_eq!(
            "active",
            promotion_offer_status_label(PromotionCouponStatus::Active.as_str()).unwrap()
        );
        assert_eq!(
            "inactive",
            promotion_offer_status_label(PromotionCouponStatus::Draft.as_str()).unwrap()
        );
        assert_eq!(
            "inactive",
            promotion_offer_status_label(PromotionCouponStatus::Disabled.as_str()).unwrap()
        );

        let unsupported = promotion_offer_status_label("legacy-status")
            .expect_err("unknown promotion offer status must fail");
        assert!(
            unsupported
                .to_string()
                .contains("unsupported promotion offer status: legacy-status"),
            "{unsupported}"
        );
    }

    #[test]
    fn discount_type_label_rejects_unknown_database_type_without_deriving_from_discount() {
        assert_eq!("amount", discount_type_label("fixed_amount").unwrap());
        assert_eq!("discount", discount_type_label("percent_off").unwrap());

        let unsupported = discount_type_label("legacy-type")
            .expect_err("unknown promotion offer discount type must fail");
        assert!(
            unsupported
                .to_string()
                .contains("unsupported promotion offer discount type: legacy-type"),
            "{unsupported}"
        );
    }

    #[test]
    fn promotion_code_status_label_rejects_unknown_database_status_without_deriving_valid_state() {
        assert_eq!(
            "available",
            promotion_code_status_label(PromotionCouponStatus::Active.as_str(), None, None)
                .unwrap()
        );
        assert_eq!(
            "claimed",
            promotion_code_status_label(PromotionCouponStatus::Active.as_str(), Some("30"), None)
                .unwrap()
        );
        assert_eq!(
            "used",
            promotion_code_status_label(
                PromotionCouponStatus::Active.as_str(),
                Some("30"),
                Some("2026-05-01")
            )
            .unwrap()
        );
        assert_eq!(
            "voided",
            promotion_code_status_label(
                PromotionCouponStatus::Disabled.as_str(),
                Some("30"),
                Some("2026-05-01")
            )
            .unwrap()
        );

        let positive = promotion_code_status_label("legacy-status", Some("30"), Some("2026-05-01"))
            .expect_err("unknown promotion code status must fail even with used metadata");
        assert!(
            positive
                .to_string()
                .contains("unsupported promotion code status: legacy-status"),
            "{positive}"
        );
    }

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
