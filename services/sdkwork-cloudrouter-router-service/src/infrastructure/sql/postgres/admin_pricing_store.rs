use serde_json::Value;
use sqlx::{PgPool, Postgres, Row, Transaction};

use chrono::{DateTime, Utc};

use crate::domain::{
    DecimalValue, DomainError, DomainResult, Money, PricingDimensionContext, PricingRule,
};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::infrastructure::sql::PricingCatalogSql;
use crate::ports::{
    AdminDefaultRegionItem, AdminOfficialRateAnchor, AdminPriceBookDetail, AdminPriceBookItem,
    AdminPriceBookRateItem, AdminPriceSettingResolution, AdminPricingCommandFuture,
    AdminPricingFormulaMode, AdminPricingListPage, AdminPricingPlanItem, AdminPricingRuleItem,
    AdminPricingStatus, AdminPricingStore, AdminPricingSubject, AdminRateCardItem,
    CreateAdminPriceBookCommand, CreateAdminPriceBookRateCommand, CreateAdminPricingPlanCommand,
    CreateAdminPricingRuleCommand, CreateAdminRateCardCommand, DeleteAdminDefaultRegionCommand,
    DeleteAdminPriceBookRateCommand, DeleteAdminPricingRuleCommand, DeleteAdminRateCardCommand,
    ListAdminDefaultRegionsQuery, ListAdminPriceBooksQuery, ListAdminPricingPlansQuery,
    ListAdminPricingRulesQuery, ListAdminRateCardsQuery, LoadAdminPriceBookQuery,
    LoadAdminPricingPlanQuery, PriceBookLifecycleCommand, ResolveAdminPriceSettingQuery,
    SaveAdminDefaultRegionCommand, SaveAdminPriceSettingCommand, UpdateAdminDefaultRegionCommand,
    UpdateAdminPriceBookCommand, UpdateAdminPriceBookRateCommand, UpdateAdminPricingPlanCommand,
    UpdateAdminPricingRuleCommand, UpdateAdminRateCardCommand,
};

use sdkwork_models_catalog_service::select_pricing_rule_for_dimensions;

const TARGET_TYPE_PRICING_PLAN: i32 = 79;
const TARGET_TYPE_RATE_CARD: i32 = 80;
const TARGET_TYPE_PRICING_RULE: i32 = 81;
const TARGET_TYPE_DEFAULT_REGION: i32 = 82;
const FALLBACK_POLICY_FAIL_CLOSED: &str = "fail_closed";
const ADMIN_METADATA_SOURCE: &str = "admin_pricing";

#[derive(Debug, Clone, Copy)]
struct AdminPricingAuditContext<'a> {
    audit_log_uuid: &'a str,
    request_id: &'a str,
    subject: AdminPricingSubject,
}

impl<'a> AdminPricingAuditContext<'a> {
    fn new(audit_log_uuid: &'a str, request_id: &'a str, subject: AdminPricingSubject) -> Self {
        Self {
            audit_log_uuid,
            request_id,
            subject,
        }
    }
}

pub struct PostgresAdminPricingStore {
    pool: PgPool,
}

impl PostgresAdminPricingStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminPricingStore for PostgresAdminPricingStore {
    fn list_pricing_plans<'a>(
        &'a self,
        query: ListAdminPricingPlansQuery,
    ) -> AdminPricingCommandFuture<'a, AdminPricingListPage<AdminPricingPlanItem>> {
        Box::pin(list_pricing_plans(&self.pool, query))
    }

    fn load_pricing_plan<'a>(
        &'a self,
        query: LoadAdminPricingPlanQuery,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPricingPlanItem>> {
        Box::pin(load_pricing_plan(&self.pool, query))
    }

    fn create_pricing_plan<'a>(
        &'a self,
        command: CreateAdminPricingPlanCommand,
    ) -> AdminPricingCommandFuture<'a, AdminPricingPlanItem> {
        Box::pin(create_pricing_plan(&self.pool, command))
    }

    fn update_pricing_plan<'a>(
        &'a self,
        command: UpdateAdminPricingPlanCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPricingPlanItem>> {
        Box::pin(update_pricing_plan(&self.pool, command))
    }

    fn list_rate_cards<'a>(
        &'a self,
        query: ListAdminRateCardsQuery,
    ) -> AdminPricingCommandFuture<'a, AdminPricingListPage<AdminRateCardItem>> {
        Box::pin(list_rate_cards(&self.pool, query))
    }

    fn create_rate_card<'a>(
        &'a self,
        command: CreateAdminRateCardCommand,
    ) -> AdminPricingCommandFuture<'a, AdminRateCardItem> {
        Box::pin(create_rate_card(&self.pool, command))
    }

    fn update_rate_card<'a>(
        &'a self,
        command: UpdateAdminRateCardCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminRateCardItem>> {
        Box::pin(update_rate_card(&self.pool, command))
    }

    fn delete_rate_card<'a>(
        &'a self,
        command: DeleteAdminRateCardCommand,
    ) -> AdminPricingCommandFuture<'a, bool> {
        Box::pin(delete_rate_card(&self.pool, command))
    }

    fn list_pricing_rules<'a>(
        &'a self,
        query: ListAdminPricingRulesQuery,
    ) -> AdminPricingCommandFuture<'a, AdminPricingListPage<AdminPricingRuleItem>> {
        Box::pin(list_pricing_rules(&self.pool, query))
    }

    fn create_pricing_rule<'a>(
        &'a self,
        command: CreateAdminPricingRuleCommand,
    ) -> AdminPricingCommandFuture<'a, AdminPricingRuleItem> {
        Box::pin(create_pricing_rule(&self.pool, command))
    }

    fn update_pricing_rule<'a>(
        &'a self,
        command: UpdateAdminPricingRuleCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPricingRuleItem>> {
        Box::pin(update_pricing_rule(&self.pool, command))
    }

    fn delete_pricing_rule<'a>(
        &'a self,
        command: DeleteAdminPricingRuleCommand,
    ) -> AdminPricingCommandFuture<'a, bool> {
        Box::pin(delete_pricing_rule(&self.pool, command))
    }

    fn list_default_regions<'a>(
        &'a self,
        query: ListAdminDefaultRegionsQuery,
    ) -> AdminPricingCommandFuture<'a, AdminPricingListPage<AdminDefaultRegionItem>> {
        Box::pin(list_default_regions(&self.pool, query))
    }

    fn save_default_region<'a>(
        &'a self,
        command: SaveAdminDefaultRegionCommand,
    ) -> AdminPricingCommandFuture<'a, AdminDefaultRegionItem> {
        Box::pin(save_default_region(&self.pool, command))
    }

    fn update_default_region<'a>(
        &'a self,
        command: UpdateAdminDefaultRegionCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminDefaultRegionItem>> {
        Box::pin(update_default_region(&self.pool, command))
    }

    fn delete_default_region<'a>(
        &'a self,
        command: DeleteAdminDefaultRegionCommand,
    ) -> AdminPricingCommandFuture<'a, bool> {
        Box::pin(delete_default_region(&self.pool, command))
    }

    fn list_price_books<'a>(
        &'a self,
        query: ListAdminPriceBooksQuery,
    ) -> AdminPricingCommandFuture<'a, AdminPricingListPage<AdminPriceBookItem>> {
        Box::pin(list_price_books(&self.pool, query))
    }

    fn load_price_book<'a>(
        &'a self,
        query: LoadAdminPriceBookQuery,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPriceBookDetail>> {
        Box::pin(load_price_book(&self.pool, query))
    }

    fn create_price_book<'a>(
        &'a self,
        command: CreateAdminPriceBookCommand,
    ) -> AdminPricingCommandFuture<'a, AdminPriceBookItem> {
        Box::pin(create_price_book(&self.pool, command))
    }

    fn update_price_book<'a>(
        &'a self,
        command: UpdateAdminPriceBookCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPriceBookItem>> {
        Box::pin(update_price_book(&self.pool, command))
    }

    fn activate_price_book<'a>(
        &'a self,
        command: PriceBookLifecycleCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPriceBookItem>> {
        Box::pin(activate_price_book(&self.pool, command))
    }

    fn retire_price_book<'a>(
        &'a self,
        command: PriceBookLifecycleCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPriceBookItem>> {
        Box::pin(retire_price_book(&self.pool, command))
    }

    fn create_price_book_rate<'a>(
        &'a self,
        command: CreateAdminPriceBookRateCommand,
    ) -> AdminPricingCommandFuture<'a, AdminPriceBookRateItem> {
        Box::pin(create_price_book_rate(&self.pool, command))
    }

    fn update_price_book_rate<'a>(
        &'a self,
        command: UpdateAdminPriceBookRateCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPriceBookRateItem>> {
        Box::pin(update_price_book_rate(&self.pool, command))
    }

    fn delete_price_book_rate<'a>(
        &'a self,
        command: DeleteAdminPriceBookRateCommand,
    ) -> AdminPricingCommandFuture<'a, bool> {
        Box::pin(delete_price_book_rate(&self.pool, command))
    }

    fn save_price_setting<'a>(
        &'a self,
        command: SaveAdminPriceSettingCommand,
    ) -> AdminPricingCommandFuture<'a, AdminPricingRuleItem> {
        Box::pin(save_price_setting(&self.pool, command))
    }

    fn resolve_price_setting<'a>(
        &'a self,
        query: ResolveAdminPriceSettingQuery,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPriceSettingResolution>> {
        Box::pin(resolve_price_setting(&self.pool, query))
    }
}

async fn list_pricing_plans(
    pool: &PgPool,
    query: ListAdminPricingPlansQuery,
) -> DomainResult<AdminPricingListPage<AdminPricingPlanItem>> {
    let mut sql = String::from(
        r#"
        SELECT
            id::text AS id,
            plan_code,
            plan_name,
            base_price_side,
            COALESCE(metadata->>'chargeMode', 'prepaid_adjustment') AS charge_mode,
            COALESCE(metadata->>'settlementMode', 'synchronous') AS settlement_mode,
            COALESCE(fallback_policy, 'fail_closed') AS fallback_policy,
            COALESCE(rounding_mode, 'half_up') AS rounding_mode,
            COALESCE(minimum_charge_amount, 0)::text AS minimum_charge_amount,
            currency_code,
            status,
            version,
            effective_from::text AS effective_from,
            effective_to::text AS effective_to,
            created_at::text AS created_at,
            updated_at::text AS updated_at,
            COUNT(*) OVER() AS total
        FROM cloudrouter_pricing_plan
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        "#,
    );
    let mut next_bind = 3;
    if query.status.is_some() {
        sql.push_str(&format!(" AND status = ${next_bind}"));
        next_bind += 1;
    }
    if query.base_price_side.is_some() {
        sql.push_str(&format!(" AND base_price_side = ${next_bind}"));
        next_bind += 1;
    }
    if let Some(search) = query.q.as_deref() {
        let pattern = format!("%{}%", escape_like_pattern(search));
        sql.push_str(&format!(
            " AND (plan_code ILIKE ${next_bind} ESCAPE '\\' OR plan_name ILIKE ${next_bind} ESCAPE '\\')"
        ));
        next_bind += 1;
        sql.push_str(&format!(
            " ORDER BY id ASC LIMIT ${next_bind} OFFSET ${}",
            next_bind + 1
        ));
        let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql))
            .bind(query.subject.tenant_id)
            .bind(query.subject.organization_id);
        if let Some(status) = query.status {
            query_builder = query_builder.bind(status.db_value());
        }
        if let Some(base_price_side) = query.base_price_side {
            query_builder = query_builder.bind(base_price_side.label());
        }
        let query_builder = query_builder
            .bind(pattern)
            .bind(query.page_size)
            .bind(query.offset);
        let rows = query_builder
            .fetch_all(pool)
            .await
            .map_err(|error| store_error("failed to list pricing plans", error))?;
        return pricing_plan_list_from_rows(rows, query.page_no, query.page_size);
    }
    sql.push_str(&format!(
        " ORDER BY id ASC LIMIT ${next_bind} OFFSET ${}",
        next_bind + 1
    ));
    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id);
    if let Some(status) = query.status {
        query_builder = query_builder.bind(status.db_value());
    }
    if let Some(base_price_side) = query.base_price_side {
        query_builder = query_builder.bind(base_price_side.label());
    }
    let query_builder = query_builder.bind(query.page_size).bind(query.offset);
    let rows = query_builder
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list pricing plans", error))?;
    pricing_plan_list_from_rows(rows, query.page_no, query.page_size)
}

fn pricing_plan_list_from_rows(
    rows: Vec<sqlx::postgres::PgRow>,
    page_no: i64,
    page_size: i64,
) -> DomainResult<AdminPricingListPage<AdminPricingPlanItem>> {
    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(pricing_plan_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminPricingListPage {
        items,
        total,
        page_no,
        page_size,
    })
}

async fn load_pricing_plan(
    pool: &PgPool,
    query: LoadAdminPricingPlanQuery,
) -> DomainResult<Option<AdminPricingPlanItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id::text AS id,
            plan_code,
            plan_name,
            base_price_side,
            COALESCE(metadata->>'chargeMode', 'prepaid_adjustment') AS charge_mode,
            COALESCE(metadata->>'settlementMode', 'synchronous') AS settlement_mode,
            COALESCE(fallback_policy, 'fail_closed') AS fallback_policy,
            COALESCE(rounding_mode, 'half_up') AS rounding_mode,
            COALESCE(minimum_charge_amount, 0)::text AS minimum_charge_amount,
            currency_code,
            status,
            version,
            effective_from::text AS effective_from,
            effective_to::text AS effective_to,
            created_at::text AS created_at,
            updated_at::text AS updated_at
        FROM cloudrouter_pricing_plan
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(parse_pricing_id(&query.plan_id, "plan id")?)
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load pricing plan", error))?;
    row.as_ref().map(pricing_plan_from_row).transpose()
}

async fn create_pricing_plan(
    pool: &PgPool,
    command: CreateAdminPricingPlanCommand,
) -> DomainResult<AdminPricingPlanItem> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin pricing plan transaction", error))?;
    let plan_id = insert_pricing_plan_row(&mut tx, &command).await?;
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "create",
        TARGET_TYPE_PRICING_PLAN,
        &plan_id.to_string(),
        serde_json::json!({
            "action": "create",
            "planCode": command.plan_code,
            "planName": command.plan_name,
        }),
    )
    .await?;
    let item = load_pricing_plan_in_transaction(&mut tx, plan_id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit pricing plan create", error))?;
    item.ok_or_else(|| DomainError::new("pricing plan was not found after create"))
}

async fn insert_pricing_plan_row(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminPricingPlanCommand,
) -> DomainResult<i64> {
    let plan_id = next_cloud_runtime_id("cloudrouter_pricing_plan")?;
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_plan
            (id, uuid, tenant_id, organization_id, data_scope, status, metadata,
             plan_code, plan_name, base_price_side, currency_code, fallback_policy,
             rounding_mode, minimum_charge_amount, effective_from, effective_to,
             created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, 0, $5, $6::jsonb,
             $7, $8, $9, $10, $11,
             $12, $13::numeric, $14::timestamptz, $15::timestamptz,
             $16, $16)
        "#,
    )
    .bind(plan_id)
    .bind(&command.plan_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.status.db_value())
    .bind(admin_metadata_with_billing_modes(
        &command.charge_mode,
        &command.settlement_mode,
    ))
    .bind(&command.plan_code)
    .bind(&command.plan_name)
    .bind(command.base_price_side.label())
    .bind(&command.currency_code)
    .bind(FALLBACK_POLICY_FAIL_CLOSED)
    .bind(command.rounding_mode.label())
    .bind(&command.minimum_charge_amount)
    .bind(&command.effective_from)
    .bind(command.effective_to.as_deref())
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create pricing plan", error))?;
    Ok(plan_id)
}

async fn update_pricing_plan(
    pool: &PgPool,
    command: UpdateAdminPricingPlanCommand,
) -> DomainResult<Option<AdminPricingPlanItem>> {
    let plan_id = parse_pricing_id(&command.plan_id, "plan id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin pricing plan transaction", error))?;
    let updated = sqlx::query(
        r#"
        UPDATE cloudrouter_pricing_plan
        SET plan_name = $1,
            base_price_side = $2,
            currency_code = $3,
            rounding_mode = $4,
            minimum_charge_amount = $5::numeric,
            effective_from = $6::timestamptz,
            effective_to = $7::timestamptz,
            status = $8,
            metadata = jsonb_set(
                jsonb_set(COALESCE(metadata, '{}'::jsonb), '{chargeMode}', to_jsonb($9::text), true),
                '{settlementMode}', to_jsonb($10::text), true
            ),
            updated_at = $11,
            version = cloudrouter_pricing_plan.version + 1
        WHERE id = $12
          AND tenant_id = $13
          AND organization_id = $14
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.plan_name)
    .bind(command.base_price_side.label())
    .bind(&command.currency_code)
    .bind(command.rounding_mode.label())
    .bind(&command.minimum_charge_amount)
    .bind(&command.effective_from)
    .bind(command.effective_to.as_deref())
    .bind(command.status.db_value())
    .bind(&command.charge_mode)
    .bind(&command.settlement_mode)
    .bind(&command.requested_at)
    .bind(plan_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to update pricing plan", error))?;
    if updated.rows_affected() == 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit pricing plan update", error))?;
        return Ok(None);
    }
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "update",
        TARGET_TYPE_PRICING_PLAN,
        &plan_id.to_string(),
        serde_json::json!({
            "action": "update",
            "planUuid": command.plan_uuid,
            "planName": command.plan_name,
        }),
    )
    .await?;
    let item = load_pricing_plan_in_transaction(&mut tx, plan_id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit pricing plan update", error))?;
    Ok(item)
}

async fn load_pricing_plan_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    plan_id: i64,
    subject: AdminPricingSubject,
) -> DomainResult<Option<AdminPricingPlanItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id::text AS id,
            plan_code,
            plan_name,
            base_price_side,
            COALESCE(metadata->>'chargeMode', 'prepaid_adjustment') AS charge_mode,
            COALESCE(metadata->>'settlementMode', 'synchronous') AS settlement_mode,
            COALESCE(fallback_policy, 'fail_closed') AS fallback_policy,
            COALESCE(rounding_mode, 'half_up') AS rounding_mode,
            COALESCE(minimum_charge_amount, 0)::text AS minimum_charge_amount,
            currency_code,
            status,
            version,
            effective_from::text AS effective_from,
            effective_to::text AS effective_to,
            created_at::text AS created_at,
            updated_at::text AS updated_at
        FROM cloudrouter_pricing_plan
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(plan_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load pricing plan", error))?;
    row.as_ref().map(pricing_plan_from_row).transpose()
}

async fn list_rate_cards(
    pool: &PgPool,
    query: ListAdminRateCardsQuery,
) -> DomainResult<AdminPricingListPage<AdminRateCardItem>> {
    let mut sql = String::from(
        r#"
        SELECT
            rate_card.id::text AS id,
            rate_card.subject_type,
            rate_card.subject_id::text AS subject_id,
            COALESCE(rate_card.subject_code, '') AS subject_code,
            rate_card.pricing_plan_id::text AS pricing_plan_id,
            plan.plan_code AS plan_code,
            plan.plan_name AS plan_name,
            rate_card.priority,
            rate_card.status,
            rate_card.effective_from::text AS effective_from,
            rate_card.effective_to::text AS effective_to,
            rate_card.created_at::text AS created_at,
            rate_card.updated_at::text AS updated_at,
            COUNT(*) OVER() AS total
        FROM cloudrouter_account_rate_card rate_card
        LEFT JOIN cloudrouter_pricing_plan plan
          ON plan.tenant_id = rate_card.pricing_plan_tenant_id
         AND plan.organization_id = rate_card.pricing_plan_organization_id
         AND plan.id = rate_card.pricing_plan_id
        WHERE rate_card.tenant_id = $1
          AND rate_card.organization_id = $2
          AND rate_card.deleted_at IS NULL
        "#,
    );
    let mut next_bind = 3;
    if query.subject_type.is_some() {
        sql.push_str(&format!(" AND rate_card.subject_type = ${next_bind}"));
        next_bind += 1;
    }
    if query.pricing_plan_id.is_some() {
        sql.push_str(&format!(" AND rate_card.pricing_plan_id = ${next_bind}"));
        next_bind += 1;
    }
    if query.status.is_some() {
        sql.push_str(&format!(" AND rate_card.status = ${next_bind}"));
        next_bind += 1;
    }
    sql.push_str(&format!(
        " ORDER BY rate_card.id ASC LIMIT ${next_bind} OFFSET ${}",
        next_bind + 1
    ));
    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id);
    if let Some(subject_type) = query.subject_type {
        query_builder = query_builder.bind(subject_type.label());
    }
    if let Some(pricing_plan_id) = query.pricing_plan_id.as_deref() {
        query_builder = query_builder.bind(parse_pricing_id(pricing_plan_id, "pricing plan id")?);
    }
    if let Some(status) = query.status {
        query_builder = query_builder.bind(status.db_value());
    }
    let query_builder = query_builder.bind(query.page_size).bind(query.offset);
    let rows = query_builder
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list rate cards", error))?;
    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(rate_card_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminPricingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn create_rate_card(
    pool: &PgPool,
    command: CreateAdminRateCardCommand,
) -> DomainResult<AdminRateCardItem> {
    let pricing_plan_id = parse_pricing_id(&command.pricing_plan_id, "pricing plan id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin rate card transaction", error))?;
    require_plan_exists(&mut tx, pricing_plan_id, command.subject).await?;
    let rate_card_id = insert_rate_card_row(&mut tx, &command, pricing_plan_id).await?;
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "create",
        TARGET_TYPE_RATE_CARD,
        &rate_card_id.to_string(),
        serde_json::json!({
            "action": "create",
            "subjectType": command.subject_type.label(),
            "pricingPlanId": pricing_plan_id.to_string(),
        }),
    )
    .await?;
    let item = load_rate_card_in_transaction(&mut tx, rate_card_id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit rate card create", error))?;
    item.ok_or_else(|| DomainError::new("rate card was not found after create"))
}

async fn insert_rate_card_row(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminRateCardCommand,
    pricing_plan_id: i64,
) -> DomainResult<i64> {
    let rate_card_id = next_cloud_runtime_id("cloudrouter_account_rate_card")?;
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_account_rate_card
            (id, uuid, tenant_id, organization_id, data_scope, status, metadata,
             subject_type, subject_id, subject_code,
             pricing_plan_tenant_id, pricing_plan_organization_id, pricing_plan_id,
             priority, effective_from, effective_to, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, 0, $5, $6::jsonb,
             $7, $8::bigint, $9, $10, $11, $12,
             $13, $14::timestamptz, $15::timestamptz, $16, $16)
        "#,
    )
    .bind(rate_card_id)
    .bind(&command.rate_card_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.status.db_value())
    .bind(admin_metadata())
    .bind(command.subject_type.label())
    .bind(command.subject_id.as_deref())
    .bind(command.subject_code.as_deref())
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(pricing_plan_id)
    .bind(command.priority)
    .bind(&command.effective_from)
    .bind(command.effective_to.as_deref())
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create rate card", error))?;
    Ok(rate_card_id)
}

async fn require_plan_exists(
    tx: &mut Transaction<'_, Postgres>,
    pricing_plan_id: i64,
    subject: AdminPricingSubject,
) -> DomainResult<()> {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM cloudrouter_pricing_plan
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(pricing_plan_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to verify pricing plan", error))?;
    if exists.is_none() {
        return Err(DomainError::not_found(
            "pricing plan was not found for rate card",
        ));
    }
    Ok(())
}

async fn update_rate_card(
    pool: &PgPool,
    command: UpdateAdminRateCardCommand,
) -> DomainResult<Option<AdminRateCardItem>> {
    let rate_card_id = parse_pricing_id(&command.rate_card_id, "rate card id")?;
    let pricing_plan_id = parse_pricing_id(&command.pricing_plan_id, "pricing plan id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin rate card transaction", error))?;
    require_plan_exists(&mut tx, pricing_plan_id, command.subject).await?;
    let updated = sqlx::query(
        r#"
        UPDATE cloudrouter_account_rate_card
        SET subject_type = $1,
            subject_id = $2::bigint,
            subject_code = $3,
            pricing_plan_tenant_id = $4,
            pricing_plan_organization_id = $5,
            pricing_plan_id = $6,
            priority = $7,
            effective_from = $8::timestamptz,
            effective_to = $9::timestamptz,
            status = $10,
            updated_at = $11,
            version = cloudrouter_account_rate_card.version + 1
        WHERE id = $12
          AND tenant_id = $13
          AND organization_id = $14
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.subject_type.label())
    .bind(command.subject_id.as_deref())
    .bind(command.subject_code.as_deref())
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(pricing_plan_id)
    .bind(command.priority)
    .bind(&command.effective_from)
    .bind(command.effective_to.as_deref())
    .bind(command.status.db_value())
    .bind(&command.requested_at)
    .bind(rate_card_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to update rate card", error))?;
    if updated.rows_affected() == 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit rate card update", error))?;
        return Ok(None);
    }
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "update",
        TARGET_TYPE_RATE_CARD,
        &rate_card_id.to_string(),
        serde_json::json!({
            "action": "update",
            "subjectType": command.subject_type.label(),
            "pricingPlanId": pricing_plan_id.to_string(),
        }),
    )
    .await?;
    let item = load_rate_card_in_transaction(&mut tx, rate_card_id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit rate card update", error))?;
    Ok(item)
}

async fn load_rate_card_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    rate_card_id: i64,
    subject: AdminPricingSubject,
) -> DomainResult<Option<AdminRateCardItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            rate_card.id::text AS id,
            rate_card.subject_type,
            rate_card.subject_id::text AS subject_id,
            COALESCE(rate_card.subject_code, '') AS subject_code,
            rate_card.pricing_plan_id::text AS pricing_plan_id,
            plan.plan_code AS plan_code,
            plan.plan_name AS plan_name,
            rate_card.priority,
            rate_card.status,
            rate_card.effective_from::text AS effective_from,
            rate_card.effective_to::text AS effective_to,
            rate_card.created_at::text AS created_at,
            rate_card.updated_at::text AS updated_at
        FROM cloudrouter_account_rate_card rate_card
        LEFT JOIN cloudrouter_pricing_plan plan
          ON plan.tenant_id = rate_card.pricing_plan_tenant_id
         AND plan.organization_id = rate_card.pricing_plan_organization_id
         AND plan.id = rate_card.pricing_plan_id
        WHERE rate_card.id = $1
          AND rate_card.tenant_id = $2
          AND rate_card.organization_id = $3
          AND rate_card.deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(rate_card_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load rate card", error))?;
    row.as_ref().map(rate_card_from_row).transpose()
}

async fn delete_rate_card(
    pool: &PgPool,
    command: DeleteAdminRateCardCommand,
) -> DomainResult<bool> {
    let rate_card_id = parse_pricing_id(&command.rate_card_id, "rate card id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin rate card transaction", error))?;
    let result = sqlx::query(
        r#"
        UPDATE cloudrouter_account_rate_card
        SET deleted_at = $1,
            deleted_by = $2,
            updated_at = $1,
            version = cloudrouter_account_rate_card.version + 1
        WHERE id = $3
          AND tenant_id = $4
          AND organization_id = $5
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(rate_card_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to delete rate card", error))?;
    if result.rows_affected() == 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit rate card delete", error))?;
        return Ok(false);
    }
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "delete",
        TARGET_TYPE_RATE_CARD,
        &rate_card_id.to_string(),
        serde_json::json!({ "action": "delete" }),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit rate card delete", error))?;
    Ok(true)
}

async fn list_pricing_rules(
    pool: &PgPool,
    query: ListAdminPricingRulesQuery,
) -> DomainResult<AdminPricingListPage<AdminPricingRuleItem>> {
    let mut sql = String::from(
        r#"
        SELECT
            pricing_rule.id::text AS id,
            pricing_rule.pricing_plan_id::text AS pricing_plan_id,
            plan.plan_code AS plan_code,
            pricing_rule.rule_code,
            COALESCE(pricing_rule.product_code, '') AS product_code,
            COALESCE(pricing_rule.operation_code, '') AS operation_code,
            COALESCE(pricing_rule.meter_code, '') AS meter_code,
            COALESCE(pricing_rule.provider_code, '') AS provider_code,
            COALESCE(pricing_rule.region_code, '') AS region_code,
            COALESCE(pricing_rule.catalog_key, '') AS catalog_key,
            pricing_rule.formula_mode,
            COALESCE(pricing_rule.multiplier, 1)::text AS multiplier,
            COALESCE(pricing_rule.markup_amount, 0)::text AS markup_amount,
            pricing_rule.unit_price_override::text AS unit_price_override,
            pricing_rule.conditions::text AS conditions_json,
            pricing_rule.schedule::text AS schedule_json,
            pricing_rule.priority,
            pricing_rule.status,
            pricing_rule.effective_from::text AS effective_from,
            pricing_rule.effective_to::text AS effective_to,
            pricing_rule.created_at::text AS created_at,
            pricing_rule.updated_at::text AS updated_at,
            COUNT(*) OVER() AS total
        FROM cloudrouter_pricing_rule pricing_rule
        LEFT JOIN cloudrouter_pricing_plan plan
          ON plan.tenant_id = pricing_rule.tenant_id
         AND plan.organization_id = pricing_rule.organization_id
         AND plan.id = pricing_rule.pricing_plan_id
        WHERE pricing_rule.tenant_id = $1
          AND pricing_rule.organization_id = $2
          AND pricing_rule.deleted_at IS NULL
        "#,
    );
    let mut next_bind = 3;
    if query.pricing_plan_id.is_some() {
        sql.push_str(&format!(" AND pricing_rule.pricing_plan_id = ${next_bind}"));
        next_bind += 1;
    }
    if query.status.is_some() {
        sql.push_str(&format!(" AND pricing_rule.status = ${next_bind}"));
        next_bind += 1;
    }
    if let Some(search) = query.q.as_deref() {
        let pattern = format!("%{}%", escape_like_pattern(search));
        sql.push_str(&format!(
            " AND (pricing_rule.rule_code ILIKE ${next_bind} ESCAPE '\\' OR pricing_rule.product_code ILIKE ${next_bind} ESCAPE '\\')"
        ));
        next_bind += 1;
        sql.push_str(&format!(
            " ORDER BY pricing_rule.id ASC LIMIT ${next_bind} OFFSET ${}",
            next_bind + 1
        ));
        let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql))
            .bind(query.subject.tenant_id)
            .bind(query.subject.organization_id);
        if let Some(pricing_plan_id) = query.pricing_plan_id.as_deref() {
            query_builder =
                query_builder.bind(parse_pricing_id(pricing_plan_id, "pricing plan id")?);
        }
        if let Some(status) = query.status {
            query_builder = query_builder.bind(status.db_value());
        }
        let query_builder = query_builder
            .bind(pattern)
            .bind(query.page_size)
            .bind(query.offset);
        let rows = query_builder
            .fetch_all(pool)
            .await
            .map_err(|error| store_error("failed to list pricing rules", error))?;
        return pricing_rule_list_from_rows(rows, query.page_no, query.page_size);
    }
    sql.push_str(&format!(
        " ORDER BY pricing_rule.id ASC LIMIT ${next_bind} OFFSET ${}",
        next_bind + 1
    ));
    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id);
    if let Some(pricing_plan_id) = query.pricing_plan_id.as_deref() {
        query_builder = query_builder.bind(parse_pricing_id(pricing_plan_id, "pricing plan id")?);
    }
    if let Some(status) = query.status {
        query_builder = query_builder.bind(status.db_value());
    }
    let query_builder = query_builder.bind(query.page_size).bind(query.offset);
    let rows = query_builder
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list pricing rules", error))?;
    pricing_rule_list_from_rows(rows, query.page_no, query.page_size)
}

fn pricing_rule_list_from_rows(
    rows: Vec<sqlx::postgres::PgRow>,
    page_no: i64,
    page_size: i64,
) -> DomainResult<AdminPricingListPage<AdminPricingRuleItem>> {
    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(pricing_rule_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminPricingListPage {
        items,
        total,
        page_no,
        page_size,
    })
}

async fn create_pricing_rule(
    pool: &PgPool,
    command: CreateAdminPricingRuleCommand,
) -> DomainResult<AdminPricingRuleItem> {
    let pricing_plan_id = parse_pricing_id(&command.pricing_plan_id, "pricing plan id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin pricing rule transaction", error))?;
    require_plan_exists(&mut tx, pricing_plan_id, command.subject).await?;
    let rule_id = insert_pricing_rule_row(&mut tx, &command, pricing_plan_id).await?;
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "create",
        TARGET_TYPE_PRICING_RULE,
        &rule_id.to_string(),
        serde_json::json!({
            "action": "create",
            "ruleCode": command.rule_code,
            "pricingPlanId": pricing_plan_id.to_string(),
        }),
    )
    .await?;
    let item = load_pricing_rule_in_transaction(&mut tx, rule_id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit pricing rule create", error))?;
    item.ok_or_else(|| DomainError::new("pricing rule was not found after create"))
}

async fn insert_pricing_rule_row(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminPricingRuleCommand,
    pricing_plan_id: i64,
) -> DomainResult<i64> {
    let rule_id = next_cloud_runtime_id("cloudrouter_pricing_rule")?;
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_rule
            (id, uuid, tenant_id, organization_id, data_scope, status, metadata,
             pricing_plan_id, rule_code, product_code, operation_code, meter_code,
             provider_code, region_code, catalog_key, formula_mode, multiplier,
             markup_amount, unit_price_override, conditions, schedule, priority, effective_from,
             effective_to, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, 0, $5, $6::jsonb,
             $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::numeric,
             $17::numeric, $18::numeric, $19::jsonb, $20::jsonb, $21,
             $22::timestamptz, $23::timestamptz, $24, $24)
        "#,
    )
    .bind(rule_id)
    .bind(&command.rule_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.status.db_value())
    .bind(admin_metadata())
    .bind(pricing_plan_id)
    .bind(&command.rule_code)
    .bind(command.product_code.as_deref())
    .bind(command.operation_code.as_deref())
    .bind(command.meter_code.as_deref())
    .bind(command.provider_code.as_deref())
    .bind(command.region_code.as_deref())
    .bind(command.catalog_key.as_deref())
    .bind(command.formula_mode.label())
    .bind(&command.multiplier)
    .bind(&command.markup_amount)
    .bind(command.unit_price_override.as_deref())
    .bind(command.conditions.to_string())
    .bind(command.schedule.as_ref().map(Value::to_string))
    .bind(command.priority)
    .bind(&command.effective_from)
    .bind(command.effective_to.as_deref())
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create pricing rule", error))?;
    Ok(rule_id)
}

async fn update_pricing_rule(
    pool: &PgPool,
    command: UpdateAdminPricingRuleCommand,
) -> DomainResult<Option<AdminPricingRuleItem>> {
    let rule_id = parse_pricing_id(&command.rule_id, "rule id")?;
    let pricing_plan_id = parse_pricing_id(&command.pricing_plan_id, "pricing plan id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin pricing rule transaction", error))?;
    require_plan_exists(&mut tx, pricing_plan_id, command.subject).await?;
    let updated = sqlx::query(
        r#"
        UPDATE cloudrouter_pricing_rule
        SET product_code = $1,
            operation_code = $2,
            meter_code = $3,
            provider_code = $4,
            region_code = $5,
            catalog_key = $6,
            formula_mode = $7,
            multiplier = $8::numeric,
            markup_amount = $9::numeric,
            unit_price_override = $10::numeric,
            conditions = $11::jsonb,
            schedule = $12::jsonb,
            priority = $13,
            effective_from = $14::timestamptz,
            effective_to = $15::timestamptz,
            status = $16,
            updated_at = $17,
            version = cloudrouter_pricing_rule.version + 1
        WHERE id = $18
          AND tenant_id = $19
          AND organization_id = $20
          AND pricing_plan_id = $21
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.product_code.as_deref())
    .bind(command.operation_code.as_deref())
    .bind(command.meter_code.as_deref())
    .bind(command.provider_code.as_deref())
    .bind(command.region_code.as_deref())
    .bind(command.catalog_key.as_deref())
    .bind(command.formula_mode.label())
    .bind(&command.multiplier)
    .bind(&command.markup_amount)
    .bind(command.unit_price_override.as_deref())
    .bind(command.conditions.to_string())
    .bind(command.schedule.as_ref().map(Value::to_string))
    .bind(command.priority)
    .bind(&command.effective_from)
    .bind(command.effective_to.as_deref())
    .bind(command.status.db_value())
    .bind(&command.requested_at)
    .bind(rule_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(pricing_plan_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to update pricing rule", error))?;
    if updated.rows_affected() == 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit pricing rule update", error))?;
        return Ok(None);
    }
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "update",
        TARGET_TYPE_PRICING_RULE,
        &rule_id.to_string(),
        serde_json::json!({
            "action": "update",
            "pricingPlanId": pricing_plan_id.to_string(),
        }),
    )
    .await?;
    let item = load_pricing_rule_in_transaction(&mut tx, rule_id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit pricing rule update", error))?;
    Ok(item)
}

async fn load_pricing_rule_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    rule_id: i64,
    subject: AdminPricingSubject,
) -> DomainResult<Option<AdminPricingRuleItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            pricing_rule.id::text AS id,
            pricing_rule.pricing_plan_id::text AS pricing_plan_id,
            plan.plan_code AS plan_code,
            pricing_rule.rule_code,
            COALESCE(pricing_rule.product_code, '') AS product_code,
            COALESCE(pricing_rule.operation_code, '') AS operation_code,
            COALESCE(pricing_rule.meter_code, '') AS meter_code,
            COALESCE(pricing_rule.provider_code, '') AS provider_code,
            COALESCE(pricing_rule.region_code, '') AS region_code,
            COALESCE(pricing_rule.catalog_key, '') AS catalog_key,
            pricing_rule.formula_mode,
            COALESCE(pricing_rule.multiplier, 1)::text AS multiplier,
            COALESCE(pricing_rule.markup_amount, 0)::text AS markup_amount,
            pricing_rule.unit_price_override::text AS unit_price_override,
            pricing_rule.conditions::text AS conditions_json,
            pricing_rule.schedule::text AS schedule_json,
            pricing_rule.priority,
            pricing_rule.status,
            pricing_rule.effective_from::text AS effective_from,
            pricing_rule.effective_to::text AS effective_to,
            pricing_rule.created_at::text AS created_at,
            pricing_rule.updated_at::text AS updated_at
        FROM cloudrouter_pricing_rule pricing_rule
        LEFT JOIN cloudrouter_pricing_plan plan
          ON plan.tenant_id = pricing_rule.tenant_id
         AND plan.organization_id = pricing_rule.organization_id
         AND plan.id = pricing_rule.pricing_plan_id
        WHERE pricing_rule.id = $1
          AND pricing_rule.tenant_id = $2
          AND pricing_rule.organization_id = $3
          AND pricing_rule.deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(rule_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load pricing rule", error))?;
    row.as_ref().map(pricing_rule_from_row).transpose()
}

async fn delete_pricing_rule(
    pool: &PgPool,
    command: DeleteAdminPricingRuleCommand,
) -> DomainResult<bool> {
    let rule_id = parse_pricing_id(&command.rule_id, "rule id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin pricing rule transaction", error))?;
    let result = sqlx::query(
        r#"
        UPDATE cloudrouter_pricing_rule
        SET deleted_at = $1,
            deleted_by = $2,
            updated_at = $1,
            version = cloudrouter_pricing_rule.version + 1
        WHERE id = $3
          AND tenant_id = $4
          AND organization_id = $5
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(rule_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to delete pricing rule", error))?;
    if result.rows_affected() == 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit pricing rule delete", error))?;
        return Ok(false);
    }
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "delete",
        TARGET_TYPE_PRICING_RULE,
        &rule_id.to_string(),
        serde_json::json!({ "action": "delete" }),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit pricing rule delete", error))?;
    Ok(true)
}

fn pricing_plan_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminPricingPlanItem> {
    Ok(AdminPricingPlanItem {
        id: string_cell(row, "id"),
        plan_code: string_cell(row, "plan_code"),
        plan_name: string_cell(row, "plan_name"),
        base_price_side: string_cell(row, "base_price_side"),
        currency_code: string_cell(row, "currency_code"),
        fallback_policy: string_cell(row, "fallback_policy"),
        rounding_mode: string_cell(row, "rounding_mode"),
        minimum_charge_amount: string_cell(row, "minimum_charge_amount"),
        effective_from: optional_string_cell(row, "effective_from"),
        effective_to: optional_string_cell(row, "effective_to"),
        status: AdminPricingStatus::from_db(
            i32::try_from(integer_cell(row, "status")).unwrap_or(0),
        )
        .to_owned(),
        charge_mode: string_cell(row, "charge_mode"),
        settlement_mode: string_cell(row, "settlement_mode"),
        created_at: optional_string_cell(row, "created_at"),
        updated_at: optional_string_cell(row, "updated_at"),
        version: integer_cell(row, "version"),
    })
}

fn rate_card_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminRateCardItem> {
    let subject_id = optional_string_cell(row, "subject_id");
    let subject_code = string_cell(row, "subject_code");
    Ok(AdminRateCardItem {
        id: string_cell(row, "id"),
        subject_type: string_cell(row, "subject_type"),
        subject_id: subject_id.filter(|value| !value.is_empty()),
        subject_code: (!subject_code.is_empty()).then_some(subject_code),
        pricing_plan_id: string_cell(row, "pricing_plan_id"),
        plan_code: optional_blank_string_cell(row, "plan_code"),
        plan_name: optional_blank_string_cell(row, "plan_name"),
        priority: integer_cell(row, "priority"),
        effective_from: optional_string_cell(row, "effective_from"),
        effective_to: optional_string_cell(row, "effective_to"),
        status: AdminPricingStatus::from_db(
            i32::try_from(integer_cell(row, "status")).unwrap_or(0),
        )
        .to_owned(),
        created_at: optional_string_cell(row, "created_at"),
        updated_at: optional_string_cell(row, "updated_at"),
    })
}

fn pricing_rule_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminPricingRuleItem> {
    let unit_price_override = optional_string_cell(row, "unit_price_override");
    Ok(AdminPricingRuleItem {
        id: string_cell(row, "id"),
        pricing_plan_id: string_cell(row, "pricing_plan_id"),
        plan_code: optional_blank_string_cell(row, "plan_code"),
        rule_code: string_cell(row, "rule_code"),
        product_code: optional_blank_string_cell(row, "product_code"),
        operation_code: optional_blank_string_cell(row, "operation_code"),
        meter_code: optional_blank_string_cell(row, "meter_code"),
        provider_code: optional_blank_string_cell(row, "provider_code"),
        region_code: optional_blank_string_cell(row, "region_code"),
        catalog_key: optional_blank_string_cell(row, "catalog_key"),
        formula_mode: string_cell(row, "formula_mode"),
        multiplier: string_cell(row, "multiplier"),
        markup_amount: string_cell(row, "markup_amount"),
        unit_price_override: unit_price_override.filter(|value| !value.is_empty()),
        conditions: serde_json::from_str(&string_cell(row, "conditions_json")).map_err(
            |error| DomainError::new(format!("invalid pricing rule conditions: {error}")),
        )?,
        schedule: optional_string_cell(row, "schedule_json")
            .map(|value| serde_json::from_str(&value))
            .transpose()
            .map_err(|error| DomainError::new(format!("invalid pricing rule schedule: {error}")))?,
        priority: integer_cell(row, "priority"),
        effective_from: optional_string_cell(row, "effective_from"),
        effective_to: optional_string_cell(row, "effective_to"),
        status: AdminPricingStatus::from_db(
            i32::try_from(integer_cell(row, "status")).unwrap_or(0),
        )
        .to_owned(),
        created_at: optional_string_cell(row, "created_at"),
        updated_at: optional_string_cell(row, "updated_at"),
    })
}

async fn insert_audit_log_for_target_uuid(
    tx: &mut Transaction<'_, Postgres>,
    context: AdminPricingAuditContext<'_>,
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
    .bind(next_cloud_runtime_id("ops_audit_log")?)
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
    .map_err(|error| store_error("failed to write pricing audit log", error))?;
    Ok(())
}

fn admin_metadata() -> String {
    format!(r#"{{"source":"{ADMIN_METADATA_SOURCE}"}}"#)
}

fn admin_metadata_with_billing_modes(charge_mode: &str, settlement_mode: &str) -> String {
    serde_json::json!({
        "source": ADMIN_METADATA_SOURCE,
        "chargeMode": charge_mode,
        "settlementMode": settlement_mode,
    })
    .to_string()
}

fn parse_pricing_id(value: &str, field_name: &str) -> DomainResult<i64> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(DomainError::new(format!("{field_name} is required")));
    }
    normalized
        .parse::<i64>()
        .map_err(|_| DomainError::new(format!("{field_name} must be an integer")))
}

fn escape_like_pattern(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

fn optional_blank_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    let value = string_cell(row, column);
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<String, _>(column).ok())
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    optional_string_cell(row, column).unwrap_or_default()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    row.try_get::<i64, _>(column)
        .ok()
        .or_else(|| row.try_get::<Option<i64>, _>(column).ok().flatten())
        .or_else(|| {
            string_cell(row, column)
                .split('.')
                .next()
                .and_then(|value| value.parse().ok())
        })
        .unwrap_or(0)
}

fn list_total(rows: &[sqlx::postgres::PgRow]) -> i64 {
    rows.first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0)
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}

async fn list_default_regions(
    pool: &PgPool,
    query: ListAdminDefaultRegionsQuery,
) -> DomainResult<AdminPricingListPage<AdminDefaultRegionItem>> {
    let mut sql = String::from(
        r#"
        SELECT
            default_region.id::text AS id,
            default_region.catalog_key,
            default_region.vendor_code,
            default_region.provider_code,
            default_region.product_code,
            default_region.resource_code,
            default_region.default_region_code,
            default_region.currency_code,
            default_region.description,
            default_region.status,
            default_region.effective_from::text AS effective_from,
            default_region.effective_to::text AS effective_to,
            default_region.created_at::text AS created_at,
            default_region.updated_at::text AS updated_at,
            default_region.version,
            COUNT(*) OVER() AS total
        FROM pricing_default_region default_region
        WHERE default_region.tenant_id = $1
          AND default_region.organization_id = $2
          AND default_region.deleted_at IS NULL
        "#,
    );
    let mut next_bind = 3;
    if let Some(search) = query.q.as_deref() {
        let pattern = format!("%{}%", escape_like_pattern(search));
        sql.push_str(&format!(
            " AND (default_region.catalog_key ILIKE ${next_bind} ESCAPE '\\' OR default_region.default_region_code ILIKE ${next_bind} ESCAPE '\\')"
        ));
        next_bind += 1;
        sql.push_str(&format!(
            " ORDER BY default_region.id ASC LIMIT ${next_bind} OFFSET ${}",
            next_bind + 1
        ));
        let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
            .bind(query.subject.tenant_id)
            .bind(query.subject.organization_id)
            .bind(pattern)
            .bind(query.page_size)
            .bind(query.offset)
            .fetch_all(pool)
            .await
            .map_err(|error| store_error("failed to list default regions", error))?;
        return default_region_list_from_rows(rows, query.page_no, query.page_size);
    }
    sql.push_str(&format!(
        " ORDER BY default_region.id ASC LIMIT ${next_bind} OFFSET ${}",
        next_bind + 1
    ));
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list default regions", error))?;
    default_region_list_from_rows(rows, query.page_no, query.page_size)
}

fn default_region_list_from_rows(
    rows: Vec<sqlx::postgres::PgRow>,
    page_no: i64,
    page_size: i64,
) -> DomainResult<AdminPricingListPage<AdminDefaultRegionItem>> {
    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(default_region_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminPricingListPage {
        items,
        total,
        page_no,
        page_size,
    })
}

async fn save_default_region(
    pool: &PgPool,
    command: SaveAdminDefaultRegionCommand,
) -> DomainResult<AdminDefaultRegionItem> {
    if command.catalog_key.trim().is_empty() {
        return Err(DomainError::bad_request("catalog_key is required"));
    }
    if command.default_region_code.trim().is_empty() {
        return Err(DomainError::bad_request("default_region_code is required"));
    }
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin default region transaction", error))?;
    require_default_region_regions(
        &mut tx,
        command.subject,
        &command.catalog_key,
        &command.default_region_code,
    )
    .await?;
    let id = upsert_default_region_row(&mut tx, &command).await?;
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "save",
        TARGET_TYPE_DEFAULT_REGION,
        &id.to_string(),
        serde_json::json!({
            "action": "save",
            "catalogKey": command.catalog_key,
            "defaultRegionCode": command.default_region_code,
        }),
    )
    .await?;
    let item = load_default_region_in_transaction(&mut tx, id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit default region save", error))?;
    item.ok_or_else(|| DomainError::new("default region was not found after save"))
}

/// Updates an existing per-model default billing region row. The resource
/// identity (`catalog_key`) is immutable on update: a catalog key maps to at
/// most one default region within a scope (`uk_pricing_default_region_catalog_key`),
/// so switching which region is default happens on the same row instead of
/// creating a competing one. Returns `None` when the row does not exist in the
/// operator's scope.
async fn update_default_region(
    pool: &PgPool,
    command: UpdateAdminDefaultRegionCommand,
) -> DomainResult<Option<AdminDefaultRegionItem>> {
    let id = parse_pricing_id(&command.default_region_id, "default region id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin default region update transaction", error))?;
    let current = sqlx::query(
        r#"
        SELECT catalog_key
        FROM pricing_default_region
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| store_error("failed to load default region for update", error))?;
    let Some(row) = current else {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit default region update", error))?;
        return Ok(None);
    };
    let catalog_key: String = row
        .try_get("catalog_key")
        .map_err(|error| store_error("failed to read default region catalog key", error))?;
    require_default_region_regions(
        &mut tx,
        command.subject,
        &catalog_key,
        &command.default_region_code,
    )
    .await?;
    let updated = sqlx::query(
        r#"
        UPDATE pricing_default_region
        SET default_region_code = $1,
            currency_code = $2,
            description = $3,
            effective_from = $4::timestamptz,
            effective_to = $5::timestamptz,
            status = $6,
            updated_at = $7,
            version = pricing_default_region.version + 1
        WHERE id = $8
          AND tenant_id = $9
          AND organization_id = $10
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.default_region_code)
    .bind(&command.currency_code)
    .bind(command.description.as_deref())
    .bind(&command.effective_from)
    .bind(command.effective_to.as_deref())
    .bind(1_i32)
    .bind(&command.requested_at)
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to update default region", error))?;
    if updated.rows_affected() == 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit default region update", error))?;
        return Ok(None);
    }
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "update",
        TARGET_TYPE_DEFAULT_REGION,
        &id.to_string(),
        serde_json::json!({
            "action": "update",
            "catalogKey": catalog_key,
            "defaultRegionCode": command.default_region_code,
        }),
    )
    .await?;
    let item = load_default_region_in_transaction(&mut tx, id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit default region update", error))?;
    Ok(item)
}

/// Confirms a default region may be set for the model: the model must expose
/// active pricing in at least one distinct region, and the chosen default must
/// be one of those regions.
///
/// Every pricing partition qualifies as a default — including the `global`
/// bucket. `global` is a real partition (see `billing_region_prefers_china`):
/// a model priced in both `cn` and `global` — the typical mainland-china
/// deployment shape, e.g. deepseek — genuinely presents multiple billing
/// regions, and an operator who wants region-less accounts billed at the
/// global partition prices explicitly configures `global` as the default,
/// which also suppresses the automatic `cn` preference. A model priced
/// nowhere at all is rejected, since a default region would be meaningless.
///
/// Eligibility is resolved against the **official reference pricing**, not the
/// operator's own price books. The admin product list builds its region tabs
/// (and therefore the options the operator can pick) from the official catalog
/// at the global `(0, 0)` scope, so validating against any other scope would
/// reject every region the UI offers — a tenant admin owns no
/// `official_reference` book and would always fail with 40001. The operator's
/// own scope is still accepted so a tenant that publishes its own official
/// book stays configurable.
async fn require_default_region_regions(
    tx: &mut Transaction<'_, Postgres>,
    subject: AdminPricingSubject,
    catalog_key: &str,
    default_region_code: &str,
) -> DomainResult<()> {
    let requested_region = default_region_code.trim();
    if requested_region.is_empty() {
        return Err(DomainError::bad_request(
            "default billing region must name a region priced for this model",
        ));
    }
    let rows = sqlx::query(
        r#"
        SELECT DISTINCT BTRIM(rate.region_code) AS region_code
        FROM pricing_rate rate
        JOIN pricing_price_book book
          ON book.id = rate.price_book_id
         AND book.tenant_id = rate.tenant_id
         AND book.organization_id = rate.organization_id
        WHERE BTRIM(rate.catalog_key) = $3
          AND rate.status = 1
          AND rate.deleted_at IS NULL
          AND book.status = 1
          AND book.deleted_at IS NULL
          AND book.price_side = 'official_reference'
          AND book.lifecycle_state = 'active'
          AND (
                (rate.tenant_id = 0 AND rate.organization_id = 0)
             OR (rate.tenant_id = $1 AND rate.organization_id = $2)
          )
          AND book.effective_from <= CURRENT_TIMESTAMP
          AND (book.effective_to IS NULL OR book.effective_to > CURRENT_TIMESTAMP)
          AND rate.effective_from <= CURRENT_TIMESTAMP
          AND (rate.effective_to IS NULL OR rate.effective_to > CURRENT_TIMESTAMP)
          AND BTRIM(rate.region_code) <> ''
        ORDER BY region_code ASC
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(catalog_key.trim())
    .fetch_all(&mut **tx)
    .await
    .map_err(|error| store_error("failed to inspect priced regions for default region", error))?;
    let regions: Vec<String> = rows
        .iter()
        .map(|row| string_cell(row, "region_code"))
        .collect();
    if regions.is_empty() {
        return Err(DomainError::bad_request(format!(
            "model must expose active pricing in at least one region before a default billing region can be configured (catalogKey: {})",
            catalog_key.trim(),
        )));
    }
    if !regions
        .iter()
        .any(|region| region.eq_ignore_ascii_case(requested_region))
    {
        return Err(DomainError::bad_request(format!(
            "default region must be one of the regions priced for this model: {}",
            regions.join(", "),
        )));
    }
    Ok(())
}

/// Writes the resource's default billing region.
///
/// A resource owns at most one default region row within a scope
/// (`uk_pricing_default_region_resource_key`), so this is a genuine upsert:
/// switching which region is default updates the existing row instead of
/// creating a competing one. It is a single `INSERT ... ON CONFLICT DO UPDATE`
/// rather than select-then-write because two concurrent first saves would
/// otherwise both miss the pre-check and one would fail on the unique index.
///
/// The `::varchar` / `::text` casts are load bearing: every identity value
/// below is bound once but consumed twice (its own column plus the
/// `pricing_resource_key()` derivation), and Postgres refuses to infer a type
/// for a parameter compared against both `character varying` and `text`.
async fn upsert_default_region_row(
    tx: &mut Transaction<'_, Postgres>,
    command: &SaveAdminDefaultRegionCommand,
) -> DomainResult<i64> {
    let id = next_cloud_runtime_id("pricing_default_region")?;
    let saved = sqlx::query(
        r#"
        INSERT INTO pricing_default_region
            (id, uuid, tenant_id, organization_id, data_scope, status, metadata,
             vendor_code, provider_code, product_code, resource_code, catalog_key,
             resource_key, default_region_code, currency_code,
             description, effective_from, effective_to, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, 0, $5, $6::jsonb,
             $7::varchar, $8::varchar, $9::varchar, $10::varchar, $11::varchar,
             pricing_resource_key($7::text, $8::text, $11::text, $9::text, $10::text),
             $12, $13, $14,
             $15::timestamptz, $16::timestamptz, $17::timestamptz, $17::timestamptz)
        ON CONFLICT (tenant_id, organization_id, resource_key)
            WHERE deleted_at IS NULL AND BTRIM(resource_key) <> ''
        DO UPDATE SET
            default_region_code = EXCLUDED.default_region_code,
            currency_code = EXCLUDED.currency_code,
            description = EXCLUDED.description,
            effective_from = EXCLUDED.effective_from,
            effective_to = EXCLUDED.effective_to,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at,
            version = pricing_default_region.version + 1
        RETURNING id
        "#,
    )
    .bind(id)
    .bind(&command.region_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(1_i32)
    .bind(admin_metadata())
    .bind(&command.vendor_code)
    .bind(&command.provider_code)
    .bind(&command.product_code)
    .bind(&command.resource_code)
    .bind(&command.catalog_key)
    .bind(&command.default_region_code)
    .bind(&command.currency_code)
    .bind(command.description.as_deref())
    .bind(&command.effective_from)
    .bind(command.effective_to.as_deref())
    .bind(&command.requested_at)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to save default region", error))?;
    saved
        .try_get("id")
        .map_err(|error| store_error("failed to read saved default region id", error))
}

async fn delete_default_region(
    pool: &PgPool,
    command: DeleteAdminDefaultRegionCommand,
) -> DomainResult<bool> {
    let id = parse_pricing_id(&command.default_region_id, "default region id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin default region delete transaction", error))?;
    let deleted = sqlx::query(
        r#"
        UPDATE pricing_default_region
        SET deleted_at = $1,
            deleted_by = $2,
            status = 0,
            updated_at = $1
        WHERE id = $3
          AND tenant_id = $4
          AND organization_id = $5
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to delete default region", error))?;
    if deleted.rows_affected() == 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit default region delete", error))?;
        return Ok(false);
    }
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "delete",
        TARGET_TYPE_DEFAULT_REGION,
        &id.to_string(),
        serde_json::json!({ "action": "delete" }),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit default region delete", error))?;
    Ok(true)
}

async fn load_default_region_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    id: i64,
    subject: AdminPricingSubject,
) -> DomainResult<Option<AdminDefaultRegionItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id::text AS id,
            catalog_key,
            vendor_code,
            provider_code,
            product_code,
            resource_code,
            default_region_code,
            currency_code,
            description,
            status,
            effective_from::text AS effective_from,
            effective_to::text AS effective_to,
            created_at::text AS created_at,
            updated_at::text AS updated_at,
            version
        FROM pricing_default_region
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load default region", error))?;
    row.as_ref().map(default_region_from_row).transpose()
}

fn default_region_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminDefaultRegionItem> {
    Ok(AdminDefaultRegionItem {
        id: string_cell(row, "id"),
        catalog_key: string_cell(row, "catalog_key"),
        vendor_code: string_cell(row, "vendor_code"),
        provider_code: string_cell(row, "provider_code"),
        product_code: string_cell(row, "product_code"),
        resource_code: string_cell(row, "resource_code"),
        default_region_code: string_cell(row, "default_region_code"),
        currency_code: string_cell(row, "currency_code"),
        description: optional_blank_string_cell(row, "description"),
        effective_from: optional_string_cell(row, "effective_from"),
        effective_to: optional_string_cell(row, "effective_to"),
        status: AdminPricingStatus::from_db(
            i32::try_from(integer_cell(row, "status")).unwrap_or(0),
        )
        .to_owned(),
        created_at: optional_string_cell(row, "created_at"),
        updated_at: optional_string_cell(row, "updated_at"),
        version: integer_cell(row, "version"),
    })
}

// ---------------------------------------------------------------------------
// Price books (pricing_price_book / pricing_rate) — admin management surface.
// Lifecycle mirrors official_pricing_sync semantics and the DB integrity
// guards: staged books are editable, activating supersedes any other active
// book with the same identity key, retiring a book also soft-deletes its live
// rates so a retired book never carries live pricing rows.
// ---------------------------------------------------------------------------

const TARGET_TYPE_PRICE_BOOK: i32 = 83;
const PRICE_BOOK_EDITABLE_STATES: [&str; 2] = ["draft", "staged"];
const PRICE_BOOK_LIFECYCLE_STATES: [&str; 5] = ["draft", "staged", "active", "retired", "rejected"];

fn validate_price_book_lifecycle_filter(value: &str) -> DomainResult<()> {
    if PRICE_BOOK_LIFECYCLE_STATES.contains(&value) {
        Ok(())
    } else {
        Err(DomainError::bad_request(format!(
            "lifecycleState must be one of {}",
            PRICE_BOOK_LIFECYCLE_STATES.join(", ")
        )))
    }
}

const PRICE_BOOK_VISIBILITY_PREDICATE: &str =
    "((pb.tenant_id = $1 AND pb.organization_id = $2) OR (pb.tenant_id = 0 AND pb.organization_id = 0))";

const PRICE_BOOK_COLUMNS: &str = r#"
            pb.id::text AS id,
            pb.uuid,
            pb.namespace_code,
            pb.price_book_code,
            pb.price_book_version,
            pb.price_side,
            pb.vendor_code,
            pb.region_code,
            pb.currency_code,
            pb.lifecycle_state,
            pb.source_system,
            pb.source_catalog_version,
            pb.effective_from::text AS effective_from,
            pb.effective_to::text AS effective_to,
            pb.activated_at::text AS activated_at,
            pb.status,
            pb.version,
            pb.created_at::text AS created_at,
            pb.updated_at::text AS updated_at,
            COUNT(r.id) FILTER (WHERE r.deleted_at IS NULL)::bigint AS rate_count
"#;

fn price_book_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminPriceBookItem> {
    Ok(AdminPriceBookItem {
        id: string_cell(row, "id"),
        uuid: string_cell(row, "uuid"),
        namespace_code: string_cell(row, "namespace_code"),
        price_book_code: string_cell(row, "price_book_code"),
        price_book_version: string_cell(row, "price_book_version"),
        price_side: string_cell(row, "price_side"),
        vendor_code: string_cell(row, "vendor_code"),
        region_code: string_cell(row, "region_code"),
        currency_code: string_cell(row, "currency_code"),
        lifecycle_state: string_cell(row, "lifecycle_state"),
        source_system: string_cell(row, "source_system"),
        source_catalog_version: optional_string_cell(row, "source_catalog_version"),
        effective_from: optional_string_cell(row, "effective_from"),
        effective_to: optional_string_cell(row, "effective_to"),
        activated_at: optional_string_cell(row, "activated_at"),
        status: AdminPricingStatus::from_db(integer_cell(row, "status") as i32).to_string(),
        rate_count: integer_cell(row, "rate_count"),
        created_at: optional_string_cell(row, "created_at"),
        updated_at: optional_string_cell(row, "updated_at"),
        version: integer_cell(row, "version"),
    })
}

async fn list_price_books(
    pool: &PgPool,
    query: ListAdminPriceBooksQuery,
) -> DomainResult<AdminPricingListPage<AdminPriceBookItem>> {
    let mut sql = format!(
        r#"
        SELECT {PRICE_BOOK_COLUMNS}
        FROM pricing_price_book pb
        LEFT JOIN pricing_rate r ON r.price_book_id = pb.id
        WHERE pb.deleted_at IS NULL
          AND {PRICE_BOOK_VISIBILITY_PREDICATE}
        "#
    );
    let mut bind_count = 2;
    if query.q.is_some() {
        bind_count += 1;
        sql.push_str(&format!(
            " AND (pb.price_book_code ILIKE ${bind_count} ESCAPE '\\'"
        ));
        bind_count += 1;
        sql.push_str(&format!(
            " OR pb.vendor_code ILIKE ${bind_count} ESCAPE '\\')"
        ));
    }
    if let Some(price_side) = query.price_side.as_ref() {
        let _ = price_side;
        bind_count += 1;
        sql.push_str(&format!(" AND pb.price_side = ${bind_count}"));
    }
    if let Some(lifecycle_state) = query.lifecycle_state.as_deref() {
        validate_price_book_lifecycle_filter(lifecycle_state)?;
        bind_count += 1;
        sql.push_str(&format!(" AND pb.lifecycle_state = ${bind_count}"));
    }
    bind_count += 1;
    sql.push_str(&format!(
        " GROUP BY pb.id ORDER BY pb.id ASC LIMIT ${bind_count} OFFSET ${}",
        bind_count + 1
    ));

    // The dynamic filter SQL above only ever appends typed binds in a fixed
    // order; build the final bind chain in one pass to keep the placeholder
    // numbering consistent with the appended predicates.
    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id);
    if let Some(search) = query.q.as_deref() {
        let pattern = format!("%{}%", escape_like_pattern(search));
        query_builder = query_builder.bind(pattern.clone()).bind(pattern);
    }
    if let Some(price_side) = query.price_side.as_ref() {
        query_builder = query_builder.bind(price_side.label());
    }
    if let Some(lifecycle_state) = query.lifecycle_state.as_deref() {
        query_builder = query_builder.bind(lifecycle_state);
    }
    let rows = query_builder
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list price books", error))?;
    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(price_book_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminPricingListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

const PRICE_BOOK_RATE_COLUMNS: &str = r#"
            r.id::text AS id,
            r.price_book_id::text AS price_book_id,
            r.rate_code,
            r.product_code,
            r.product_kind,
            r.operation_code,
            r.meter_code,
            r.quantity_kind,
            r.unit_code,
            r.provider_code,
            r.account_id::text AS account_id,
            r.region_code,
            r.resource_type,
            r.resource_code,
            r.catalog_key,
            r.api_format,
            r.billability,
            r.charge_timing,
            r.calculation_mode,
            r.quantity_aggregation,
            r.unit_size::text AS unit_size,
            r.unit_price::text AS unit_price,
            r.minimum_quantity::text AS minimum_quantity,
            r.quantity_step::text AS quantity_step,
            r.currency_code,
            r.vendor_code,
            r.priority,
            r.rate_variant,
            r.conditions,
            r.tiers,
            r.schedule,
            r.effective_from::text AS effective_from,
            r.effective_to::text AS effective_to,
            r.status,
            r.created_at::text AS created_at,
            r.updated_at::text AS updated_at
"#;

fn price_book_rate_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminPriceBookRateItem> {
    Ok(AdminPriceBookRateItem {
        id: string_cell(row, "id"),
        price_book_id: string_cell(row, "price_book_id"),
        rate_code: string_cell(row, "rate_code"),
        product_code: string_cell(row, "product_code"),
        product_kind: string_cell(row, "product_kind"),
        operation_code: string_cell(row, "operation_code"),
        meter_code: string_cell(row, "meter_code"),
        quantity_kind: string_cell(row, "quantity_kind"),
        unit_code: string_cell(row, "unit_code"),
        provider_code: string_cell(row, "provider_code"),
        account_id: optional_string_cell(row, "account_id"),
        region_code: string_cell(row, "region_code"),
        resource_type: string_cell(row, "resource_type"),
        resource_code: string_cell(row, "resource_code"),
        catalog_key: optional_string_cell(row, "catalog_key"),
        api_format: optional_string_cell(row, "api_format"),
        billability: string_cell(row, "billability"),
        charge_timing: string_cell(row, "charge_timing"),
        calculation_mode: string_cell(row, "calculation_mode"),
        quantity_aggregation: string_cell(row, "quantity_aggregation"),
        unit_size: string_cell(row, "unit_size"),
        unit_price: string_cell(row, "unit_price"),
        minimum_quantity: string_cell(row, "minimum_quantity"),
        quantity_step: optional_string_cell(row, "quantity_step"),
        currency_code: string_cell(row, "currency_code"),
        vendor_code: string_cell(row, "vendor_code"),
        priority: integer_cell(row, "priority") as i64,
        rate_variant: string_cell(row, "rate_variant"),
        conditions: row
            .try_get("conditions")
            .map_err(|error| store_error("failed to read rate conditions", error))?,
        tiers: row
            .try_get("tiers")
            .map_err(|error| store_error("failed to read rate tiers", error))?,
        schedule: row
            .try_get("schedule")
            .map_err(|error| store_error("failed to read rate schedule", error))?,
        effective_from: optional_string_cell(row, "effective_from"),
        effective_to: optional_string_cell(row, "effective_to"),
        status: AdminPricingStatus::from_db(integer_cell(row, "status") as i32).to_string(),
        created_at: optional_string_cell(row, "created_at"),
        updated_at: optional_string_cell(row, "updated_at"),
    })
}

async fn load_price_book(
    pool: &PgPool,
    query: LoadAdminPriceBookQuery,
) -> DomainResult<Option<AdminPriceBookDetail>> {
    let id = parse_pricing_id(&query.price_book_id, "price book id")?;
    let book_row = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"
        SELECT {PRICE_BOOK_COLUMNS}
        FROM pricing_price_book pb
        LEFT JOIN pricing_rate r ON r.price_book_id = pb.id
        WHERE pb.id = $1
          AND pb.deleted_at IS NULL
          AND ((pb.tenant_id = $2 AND pb.organization_id = $3)
               OR (pb.tenant_id = 0 AND pb.organization_id = 0))
        GROUP BY pb.id
        LIMIT 1
        "#
    )))
    .bind(id)
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load price book", error))?;
    let Some(book_row) = book_row else {
        return Ok(None);
    };
    let book = price_book_from_row(&book_row)?;
    let rate_rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"
        SELECT {PRICE_BOOK_RATE_COLUMNS}
        FROM pricing_rate r
        WHERE r.price_book_id = $1
          AND r.deleted_at IS NULL
        ORDER BY r.priority ASC, r.id ASC
        "#
    )))
    .bind(id)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to load price book rates", error))?;
    let rates = rate_rows
        .iter()
        .map(price_book_rate_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(Some(AdminPriceBookDetail { book, rates }))
}

/// Loads a price book that is owned by the operator's scope (mutations are
/// never allowed on (0,0) sync-owned books). Returns the lifecycle state and
/// currency alongside the id, or `None` when the row does not exist in scope.
struct PriceBookMutationContext {
    lifecycle_state: String,
    currency_code: String,
    namespace_code: String,
    price_book_code: String,
    vendor_code: String,
    region_code: String,
    rate_count: i64,
}

async fn load_mutable_price_book(
    tx: &mut Transaction<'_, Postgres>,
    subject: AdminPricingSubject,
    id: i64,
) -> DomainResult<Option<PriceBookMutationContext>> {
    let row = sqlx::query(
        r#"
        SELECT pb.lifecycle_state,
               pb.currency_code,
               pb.namespace_code,
               pb.price_book_code,
               pb.vendor_code,
               pb.region_code,
               COUNT(r.id) FILTER (WHERE r.deleted_at IS NULL)::bigint AS rate_count
        FROM pricing_price_book pb
        LEFT JOIN pricing_rate r ON r.price_book_id = pb.id
        WHERE pb.id = $1
          AND pb.tenant_id = $2
          AND pb.organization_id = $3
          AND pb.deleted_at IS NULL
        GROUP BY pb.id
        LIMIT 1
        "#,
    )
    .bind(id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load price book for mutation", error))?;
    let Some(row) = row else {
        return Ok(None);
    };
    Ok(Some(PriceBookMutationContext {
        lifecycle_state: row
            .try_get("lifecycle_state")
            .map_err(|error| store_error("failed to read price book lifecycle", error))?,
        currency_code: row
            .try_get("currency_code")
            .map_err(|error| store_error("failed to read price book currency", error))?,
        namespace_code: row
            .try_get("namespace_code")
            .map_err(|error| store_error("failed to read price book namespace", error))?,
        price_book_code: row
            .try_get("price_book_code")
            .map_err(|error| store_error("failed to read price book code", error))?,
        vendor_code: row
            .try_get("vendor_code")
            .map_err(|error| store_error("failed to read price book vendor", error))?,
        region_code: row
            .try_get("region_code")
            .map_err(|error| store_error("failed to read price book region", error))?,
        rate_count: row
            .try_get::<i64, _>("rate_count")
            .map_err(|error| store_error("failed to read price book rate count", error))?,
    }))
}

async fn create_price_book(
    pool: &PgPool,
    command: CreateAdminPriceBookCommand,
) -> DomainResult<AdminPriceBookItem> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin price book create transaction", error))?;
    let duplicate = sqlx::query(
        r#"
        SELECT 1
        FROM pricing_price_book pb
        WHERE pb.tenant_id = $1 AND pb.organization_id = $2
          AND pb.namespace_code = $3 AND pb.price_book_code = $4
          AND pb.vendor_code = $5 AND pb.region_code = $6
          AND pb.price_book_version = $7
          AND pb.deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.namespace_code)
    .bind(&command.price_book_code)
    .bind(&command.vendor_code)
    .bind(&command.region_code)
    .bind(&command.price_book_version)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| store_error("failed to check price book duplicates", error))?;
    if duplicate.is_some() {
        return Err(DomainError::conflict(
            "a price book with the same namespace, code, version, vendor, and region already exists",
        ));
    }
    let id = next_cloud_runtime_id("pricing_price_book")?;
    sqlx::query(
        r#"
        INSERT INTO pricing_price_book
            (id, uuid, tenant_id, organization_id, data_scope, status,
             namespace_code, price_book_code, price_book_version, price_side,
             source_system, vendor_code, region_code, source_catalog_version,
             source_hash, lifecycle_state, currency_code,
             effective_from, effective_to, activated_at)
        VALUES
            ($1, $2, $3, $4, 1, 1,
             $5, $6, $7, $8,
             $9, $10, $11, $12,
             $13, 'staged', $14,
             COALESCE($15::timestamptz, CURRENT_TIMESTAMP), $16::timestamptz, NULL)
        "#,
    )
    .bind(id)
    .bind(&command.price_book_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.namespace_code)
    .bind(&command.price_book_code)
    .bind(&command.price_book_version)
    .bind(command.price_side.label())
    .bind(&command.source_system)
    .bind(&command.vendor_code)
    .bind(&command.region_code)
    .bind(&command.source_catalog_version())
    .bind(&command.source_hash())
    .bind(&command.currency_code)
    .bind(command.effective_from.as_deref())
    .bind(command.effective_to.as_deref())
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to insert price book", error))?;
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "create",
        TARGET_TYPE_PRICE_BOOK,
        &command.price_book_uuid,
        serde_json::json!({
            "action": "create",
            "priceBookCode": command.price_book_code,
            "priceSide": command.price_side.label(),
            "vendorCode": command.vendor_code,
            "regionCode": command.region_code,
            "currencyCode": command.currency_code,
        }),
    )
    .await?;
    let item = load_price_book_item_in_transaction(&mut tx, id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit price book create", error))?;
    item.ok_or_else(|| DomainError::new("price book was not found after create"))
}

impl CreateAdminPriceBookCommand {
    fn source_catalog_version(&self) -> String {
        "admin".to_string()
    }

    fn source_hash(&self) -> String {
        use std::fmt::Write;
        let mut hasher_input = String::new();
        let _ = write!(
            hasher_input,
            "admin:{}:{}:{}:{}:{}",
            self.namespace_code,
            self.price_book_code,
            self.price_book_version,
            self.vendor_code,
            self.region_code
        );
        format!("{:016x}", hasher_input.len() as u64)
    }
}

async fn load_price_book_item_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    id: i64,
    subject: AdminPricingSubject,
) -> DomainResult<Option<AdminPriceBookItem>> {
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"
        SELECT {PRICE_BOOK_COLUMNS}
        FROM pricing_price_book pb
        LEFT JOIN pricing_rate r ON r.price_book_id = pb.id
        WHERE pb.id = $1
          AND pb.deleted_at IS NULL
          AND ((pb.tenant_id = $2 AND pb.organization_id = $3)
               OR (pb.tenant_id = 0 AND pb.organization_id = 0))
        GROUP BY pb.id
        LIMIT 1
        "#
    )))
    .bind(id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load price book after mutation", error))?;
    match row {
        Some(row) => Ok(Some(price_book_from_row(&row)?)),
        None => Ok(None),
    }
}

async fn update_price_book(
    pool: &PgPool,
    command: UpdateAdminPriceBookCommand,
) -> DomainResult<Option<AdminPriceBookItem>> {
    let id = parse_pricing_id(&command.price_book_id, "price book id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin price book update transaction", error))?;
    let Some(current) = load_mutable_price_book(&mut tx, command.subject, id).await? else {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit price book update", error))?;
        return Ok(None);
    };
    if !PRICE_BOOK_EDITABLE_STATES.contains(&current.lifecycle_state.as_str()) {
        return Err(DomainError::bad_request(format!(
            "price book in lifecycle state '{}' is immutable; only draft or staged books can be edited",
            current.lifecycle_state
        )));
    }
    if command.currency_code != current.currency_code && current.rate_count > 0 {
        return Err(DomainError::bad_request(
            "currency cannot change while the price book carries live rates; remove the rates first or create a new version",
        ));
    }
    sqlx::query(
        r#"
        UPDATE pricing_price_book
        SET currency_code = $1,
            effective_from = COALESCE($2::timestamptz, effective_from),
            effective_to = $3::timestamptz,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = $4
          AND tenant_id = $5
          AND organization_id = $6
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.currency_code)
    .bind(command.effective_from.as_deref())
    .bind(command.effective_to.as_deref())
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to update price book", error))?;
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "update",
        TARGET_TYPE_PRICE_BOOK,
        &id.to_string(),
        serde_json::json!({
            "action": "update",
            "currencyCode": command.currency_code,
        }),
    )
    .await?;
    let item = load_price_book_item_in_transaction(&mut tx, id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit price book update", error))?;
    Ok(item)
}

/// Mirrors the official sync activation semantics inside one transaction:
/// retire any other active book sharing the identity key (and soft-delete its
/// live rates), then activate this one.
async fn activate_price_book(
    pool: &PgPool,
    command: PriceBookLifecycleCommand,
) -> DomainResult<Option<AdminPriceBookItem>> {
    let id = parse_pricing_id(&command.price_book_id, "price book id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin price book activation transaction", error))?;
    let Some(current) = load_mutable_price_book(&mut tx, command.subject, id).await? else {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit price book activation", error))?;
        return Ok(None);
    };
    if !PRICE_BOOK_EDITABLE_STATES.contains(&current.lifecycle_state.as_str()) {
        return Err(DomainError::bad_request(format!(
            "only draft or staged price books can be activated; book is '{}'",
            current.lifecycle_state
        )));
    }
    sqlx::query(
        r#"
        UPDATE pricing_price_book
        SET lifecycle_state = 'retired', updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE tenant_id = $1 AND organization_id = $2
          AND namespace_code = $3 AND price_book_code = $4
          AND vendor_code = $5 AND region_code = $6
          AND lifecycle_state = 'active' AND id <> $7
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&current.namespace_code)
    .bind(&current.price_book_code)
    .bind(&current.vendor_code)
    .bind(&current.region_code)
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to retire superseded price books", error))?;
    sqlx::query(
        r#"
        UPDATE pricing_rate
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL
          AND price_book_id IN (
              SELECT id FROM pricing_price_book
              WHERE tenant_id = $1 AND organization_id = $2
                AND namespace_code = $3 AND price_book_code = $4
                AND vendor_code = $5 AND region_code = $6
                AND lifecycle_state = 'retired' AND id <> $7
                AND deleted_at IS NULL
          )
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&current.namespace_code)
    .bind(&current.price_book_code)
    .bind(&current.vendor_code)
    .bind(&current.region_code)
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to soft-delete superseded price book rates", error))?;
    sqlx::query(
        r#"
        UPDATE pricing_price_book
        SET lifecycle_state = 'active',
            activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND lifecycle_state IN ('draft', 'staged')
          AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to activate price book", error))?;
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "activate",
        TARGET_TYPE_PRICE_BOOK,
        &id.to_string(),
        serde_json::json!({
            "action": "activate",
            "priceBookCode": current.price_book_code,
        }),
    )
    .await?;
    let item = load_price_book_item_in_transaction(&mut tx, id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit price book activation", error))?;
    Ok(item)
}

/// Retires an active book and soft-deletes its live rates in the same
/// transaction, so a retired book never carries live pricing rows (the
/// invariant the official sync maintains through supersede_previous_versions).
async fn retire_price_book(
    pool: &PgPool,
    command: PriceBookLifecycleCommand,
) -> DomainResult<Option<AdminPriceBookItem>> {
    let id = parse_pricing_id(&command.price_book_id, "price book id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin price book retire transaction", error))?;
    let Some(current) = load_mutable_price_book(&mut tx, command.subject, id).await? else {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit price book retire", error))?;
        return Ok(None);
    };
    if current.lifecycle_state != "active" {
        return Err(DomainError::bad_request(format!(
            "only active price books can be retired; book is '{}'",
            current.lifecycle_state
        )));
    }
    sqlx::query(
        r#"
        UPDATE pricing_price_book
        SET lifecycle_state = 'retired', updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND lifecycle_state = 'active'
          AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to retire price book", error))?;
    sqlx::query(
        r#"
        UPDATE pricing_rate
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE price_book_id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to soft-delete retired price book rates", error))?;
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "retire",
        TARGET_TYPE_PRICE_BOOK,
        &id.to_string(),
        serde_json::json!({
            "action": "retire",
            "priceBookCode": current.price_book_code,
        }),
    )
    .await?;
    let item = load_price_book_item_in_transaction(&mut tx, id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit price book retire", error))?;
    Ok(item)
}

async fn create_price_book_rate(
    pool: &PgPool,
    command: CreateAdminPriceBookRateCommand,
) -> DomainResult<AdminPriceBookRateItem> {
    let book_id = parse_pricing_id(&command.price_book_id, "price book id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin rate create transaction", error))?;
    let Some(book) = load_mutable_price_book(&mut tx, command.subject, book_id).await? else {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit rate create", error))?;
        return Err(DomainError::not_found("price book was not found"));
    };
    if !PRICE_BOOK_EDITABLE_STATES.contains(&book.lifecycle_state.as_str()) {
        return Err(DomainError::bad_request(format!(
            "rates of a '{}' price book are immutable; edit rates on a draft or staged book",
            book.lifecycle_state
        )));
    }
    let id = next_cloud_runtime_id("pricing_rate")?;
    sqlx::query(
        r#"
        INSERT INTO pricing_rate
            (id, uuid, tenant_id, organization_id, data_scope, status,
             metadata, price_book_id, rate_code, rate_hash,
             product_code, product_kind, product_display_name,
             operation_code, operation_kind, operation_display_name,
             meter_code, meter_display_name,
             quantity_kind, unit_code, vendor_code, provider_code, account_id,
             region_code, resource_type, resource_code, catalog_key, api_format,
             endpoint_code, billability, charge_timing, calculation_mode,
             quantity_aggregation, unit_size, unit_price, minimum_quantity,
             quantity_step, currency_code, conditions, tiers, formula,
             priority, rate_variant, schedule,
             effective_from, effective_to, source_url, source_observed_at)
        VALUES
            ($1, $2, $3, $4, 1, 1,
             '{}'::jsonb, $5, $6, $6,
             $7, $8, $9,
             $10, $11, $12,
             $13, $14,
             $15, $16, $17, $18, $19,
             $20, $21, $22, $23, $24,
             $25, $26, $27, $28,
             $29, $30::numeric, $31::numeric, $32::numeric,
             $33::numeric, $34, $35::jsonb, $36::jsonb, NULL,
             $37, $38, $39::jsonb,
             $40::timestamptz, $41::timestamptz, $42, CURRENT_TIMESTAMP)
        "#,
    )
    .bind(id)
    .bind(&command.rate_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(book_id)
    .bind(&command.rate_code)
    .bind(&command.product_code)
    .bind(&command.product_kind)
    .bind(&command.product_display_name)
    .bind(&command.operation_code)
    .bind(&command.operation_kind)
    .bind(&command.operation_display_name)
    .bind(&command.meter_code)
    .bind(&command.meter_display_name)
    .bind(&command.quantity_kind)
    .bind(&command.unit_code)
    .bind(&book.vendor_code)
    .bind(&command.provider_code)
    .bind(command.account_id)
    .bind(&book.region_code)
    .bind(&command.resource_type)
    .bind(&command.resource_code)
    .bind(command.catalog_key.as_deref())
    .bind(command.api_format.as_deref())
    .bind(command.endpoint_code.as_deref())
    .bind(&command.billability)
    .bind(&command.charge_timing)
    .bind(&command.calculation_mode)
    .bind(&command.quantity_aggregation)
    .bind(&command.unit_size)
    .bind(&command.unit_price)
    .bind(&command.minimum_quantity)
    .bind(command.quantity_step.as_deref())
    .bind(&book.currency_code)
    .bind(command.conditions.to_string())
    .bind(command.tiers.to_string())
    .bind(command.priority as i32)
    .bind(&command.rate_variant)
    .bind(command.schedule.as_ref().map(|value| value.to_string()))
    .bind(command.effective_from.as_str())
    .bind(command.effective_to.as_deref())
    .bind(&command.source_url)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to insert price book rate", error))?;
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "create_rate",
        TARGET_TYPE_PRICE_BOOK,
        &book_id.to_string(),
        serde_json::json!({
            "action": "create_rate",
            "rateCode": command.rate_code,
            "meterCode": command.meter_code,
            "unitPrice": command.unit_price,
        }),
    )
    .await?;
    let rate = load_price_book_rate_in_transaction(&mut tx, book_id, id).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit rate create", error))?;
    rate.ok_or_else(|| DomainError::new("price book rate was not found after create"))
}

async fn load_price_book_rate_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    book_id: i64,
    rate_id: i64,
) -> DomainResult<Option<AdminPriceBookRateItem>> {
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"
        SELECT {PRICE_BOOK_RATE_COLUMNS}
        FROM pricing_rate r
        WHERE r.price_book_id = $1
          AND r.id = $2
          AND r.deleted_at IS NULL
        LIMIT 1
        "#
    )))
    .bind(book_id)
    .bind(rate_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load price book rate after mutation", error))?;
    match row {
        Some(row) => Ok(Some(price_book_rate_from_row(&row)?)),
        None => Ok(None),
    }
}

async fn update_price_book_rate(
    pool: &PgPool,
    command: UpdateAdminPriceBookRateCommand,
) -> DomainResult<Option<AdminPriceBookRateItem>> {
    let book_id = parse_pricing_id(&command.price_book_id, "price book id")?;
    let rate_id = parse_pricing_id(&command.rate_id, "rate id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin rate update transaction", error))?;
    let Some(book) = load_mutable_price_book(&mut tx, command.subject, book_id).await? else {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit rate update", error))?;
        return Ok(None);
    };
    if !PRICE_BOOK_EDITABLE_STATES.contains(&book.lifecycle_state.as_str()) {
        return Err(DomainError::bad_request(format!(
            "rates of a '{}' price book are immutable; edit rates on a draft or staged book",
            book.lifecycle_state
        )));
    }
    let updated = sqlx::query(
        r#"
        UPDATE pricing_rate
        SET unit_size = $1::numeric,
            unit_price = $2::numeric,
            minimum_quantity = $3::numeric,
            quantity_step = $4::numeric,
            priority = $5,
            effective_from = $6::timestamptz,
            effective_to = $7::timestamptz,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE price_book_id = $8
          AND id = $9
          AND tenant_id = $10
          AND organization_id = $11
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.unit_size)
    .bind(&command.unit_price)
    .bind(&command.minimum_quantity)
    .bind(command.quantity_step.as_deref())
    .bind(command.priority as i32)
    .bind(command.effective_from.as_str())
    .bind(command.effective_to.as_deref())
    .bind(book_id)
    .bind(rate_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to update price book rate", error))?;
    if updated.rows_affected() == 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit rate update", error))?;
        return Ok(None);
    }
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "update_rate",
        TARGET_TYPE_PRICE_BOOK,
        &book_id.to_string(),
        serde_json::json!({
            "action": "update_rate",
            "rateId": rate_id.to_string(),
            "unitPrice": command.unit_price,
        }),
    )
    .await?;
    let rate = load_price_book_rate_in_transaction(&mut tx, book_id, rate_id).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit rate update", error))?;
    Ok(rate)
}

async fn delete_price_book_rate(
    pool: &PgPool,
    command: DeleteAdminPriceBookRateCommand,
) -> DomainResult<bool> {
    let book_id = parse_pricing_id(&command.price_book_id, "price book id")?;
    let rate_id = parse_pricing_id(&command.rate_id, "rate id")?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin rate delete transaction", error))?;
    let Some(book) = load_mutable_price_book(&mut tx, command.subject, book_id).await? else {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit rate delete", error))?;
        return Ok(false);
    };
    if !PRICE_BOOK_EDITABLE_STATES.contains(&book.lifecycle_state.as_str()) {
        return Err(DomainError::bad_request(format!(
            "rates of a '{}' price book are immutable; edit rates on a draft or staged book",
            book.lifecycle_state
        )));
    }
    let deleted = sqlx::query(
        r#"
        UPDATE pricing_rate
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE price_book_id = $1
          AND id = $2
          AND tenant_id = $3
          AND organization_id = $4
          AND deleted_at IS NULL
        "#,
    )
    .bind(book_id)
    .bind(rate_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to delete price book rate", error))?;
    if deleted.rows_affected() == 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit rate delete", error))?;
        return Ok(false);
    }
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "delete_rate",
        TARGET_TYPE_PRICE_BOOK,
        &book_id.to_string(),
        serde_json::json!({
            "action": "delete_rate",
            "rateId": rate_id.to_string(),
        }),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit rate delete", error))?;
    Ok(true)
}

// ---------------------------------------------------------------------------
// Price settings — resource-centric admin editing.
//
// `save_price_setting` derives the six sales-rule scope dimensions from the
// anchored official rate row (server-side truth) instead of trusting
// client-side string matching, then upserts the single standard rule backing
// one (resource, region, meter) tuple inside one transaction.
//
// `resolve_price_setting` answers "what will a customer actually pay" with the
// same shared rule selector the runtime uses, so the admin preview can never
// disagree with billing about which rule wins.
// ---------------------------------------------------------------------------

/// Maximum `cloudrouter_pricing_rule.rule_code` length (VARCHAR(96)).
const PRICE_SETTING_RULE_CODE_MAX_CHARS: usize = 96;

#[derive(Debug, Clone)]
struct PriceSettingPlan {
    id: i64,
    plan_code: String,
    currency_code: String,
}

async fn save_price_setting(
    pool: &PgPool,
    command: SaveAdminPriceSettingCommand,
) -> DomainResult<AdminPricingRuleItem> {
    let pricing_plan_id = parse_pricing_id(&command.pricing_plan_id, "pricing plan id")?;
    validate_price_setting_money(&command)?;
    if command.schedule.is_some() && command.rule_id.is_none() {
        return Err(DomainError::new(
            "a scheduled price setting must target an explicit rule_id; standard price settings are addressed by (resource, region, meter)",
        ));
    }
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin price setting transaction", error))?;
    require_plan_exists(&mut tx, pricing_plan_id, command.subject).await?;
    let anchor = load_official_rate_anchor(&mut *tx, &command.official_rate_code)
        .await?
        .ok_or_else(|| {
            DomainError::not_found(format!(
                "official rate {} was not found in the active official catalog",
                command.official_rate_code
            ))
        })?;
    let rule_id = match command
        .rule_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(rule_id_raw) => {
            // Explicit target: rewrite the rule's scope dimensions to the
            // anchored official rate's dimensions (required for time-window
            // variants that must keep their schedule/conditions identity).
            let rule_id = parse_pricing_id(rule_id_raw, "rule id")?;
            update_price_setting_rule(&mut tx, &command, &anchor, pricing_plan_id, rule_id).await?;
            rule_id
        }
        None => {
            match find_standard_price_setting_rule(&mut tx, &command, &anchor, pricing_plan_id)
                .await?
            {
                Some(rule_id) => {
                    update_price_setting_rule(&mut tx, &command, &anchor, pricing_plan_id, rule_id)
                        .await?;
                    rule_id
                }
                None => {
                    let create = CreateAdminPricingRuleCommand {
                        subject: command.subject,
                        rule_uuid: command.rule_uuid.clone(),
                        audit_log_uuid: command.audit_log_uuid.clone(),
                        pricing_plan_id: command.pricing_plan_id.clone(),
                        rule_code: price_setting_rule_code(&anchor),
                        product_code: non_empty_text(&anchor.product_code),
                        operation_code: non_empty_text(&anchor.operation_code),
                        meter_code: non_empty_text(&anchor.meter_code),
                        provider_code: non_empty_text(&anchor.provider_code),
                        region_code: non_empty_text(&anchor.region_code),
                        catalog_key: non_empty_text(&anchor.catalog_key),
                        formula_mode: command.formula_mode,
                        multiplier: command.multiplier.clone(),
                        markup_amount: command.markup_amount.clone(),
                        unit_price_override: command.unit_price_override.clone(),
                        conditions: serde_json::json!([]),
                        schedule: None,
                        priority: command.priority,
                        effective_from: command
                            .effective_from
                            .clone()
                            .unwrap_or_else(|| command.requested_at.clone()),
                        effective_to: command.effective_to.clone(),
                        status: command.status,
                        request_id: command.request_id.clone(),
                        requested_at: command.requested_at.clone(),
                    };
                    insert_pricing_rule_row(&mut tx, &create, pricing_plan_id).await?
                }
            }
        }
    };
    insert_audit_log_for_target_uuid(
        &mut tx,
        AdminPricingAuditContext::new(
            &command.audit_log_uuid,
            &command.request_id,
            command.subject,
        ),
        "save_price_setting",
        TARGET_TYPE_PRICING_RULE,
        &rule_id.to_string(),
        serde_json::json!({
            "action": "save_price_setting",
            "officialRateCode": anchor.rate_code,
            "regionCode": anchor.region_code,
            "pricingPlanId": pricing_plan_id.to_string(),
            "formulaMode": command.formula_mode.label(),
        }),
    )
    .await?;
    let item = load_pricing_rule_in_transaction(&mut tx, rule_id, command.subject).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit price setting save", error))?;
    item.ok_or_else(|| {
        DomainError::new("pricing rule was not found after saving the price setting")
    })
}

async fn resolve_price_setting(
    pool: &PgPool,
    query: ResolveAdminPriceSettingQuery,
) -> DomainResult<Option<AdminPriceSettingResolution>> {
    let anchor = match load_official_rate_anchor(pool, &query.official_rate_code).await? {
        Some(anchor) => anchor,
        None => return Ok(None),
    };
    let occurred_at = parse_occurred_at(query.occurred_at.as_deref())?;
    let plan = load_price_setting_plan(pool, &query, occurred_at).await?;

    // Region fallback chain: requested -> configured default (tenant scope,
    // then the official (0,0) scope) -> `global` -> any available. This is the
    // same chain shape the runtime price-book fallback uses.
    let requested_region = query
        .region_code
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| anchor.region_code.clone());
    let resource_key = load_pricing_resource_key(pool, &anchor).await?;
    let mut region_chain = vec![requested_region.clone()];
    if let Some(region) = load_configured_default_region(
        pool,
        query.subject.tenant_id,
        query.subject.organization_id,
        &resource_key,
    )
    .await?
    {
        region_chain.push(region);
    }
    if let Some(region) = load_configured_default_region(pool, 0, 0, &resource_key).await? {
        region_chain.push(region);
    }
    region_chain.push("global".to_owned());
    let mut deduped_chain: Vec<String> = Vec::new();
    for region in region_chain {
        if !deduped_chain.contains(&region) {
            deduped_chain.push(region);
        }
    }

    let candidates = load_official_rate_candidates(pool, &anchor, occurred_at).await?;
    if candidates.is_empty() {
        return Err(DomainError::not_found(
            "no effective official rate covers this resource in any region of the fallback chain",
        ));
    }
    let (official, region_fallback) =
        select_official_rate_for_regions(&candidates, &deduped_chain, &requested_region);

    // Sales-rule selection: reuse the shared runtime selector so the preview
    // and billing pick the same winning rule under the same precedence.
    let rules = load_active_pricing_rules(pool)
        .await?
        .into_iter()
        .filter(|rule| {
            rule.pricing_plan_id == plan.id
                && rule.tenant_id == query.subject.tenant_id
                && rule.organization_id == query.subject.organization_id
        })
        .collect::<Vec<_>>();
    // Runtime rule scope matching reads the requested billing region (rules
    // follow the request, the official rate row may fall back).
    let mut dimensions = PricingDimensionContext::new();
    dimensions.insert("vendor_code", serde_json::json!(anchor.vendor_code));
    dimensions.insert("region_code", serde_json::json!(requested_region));
    dimensions.insert("catalog_key", serde_json::json!(anchor.catalog_key));
    dimensions.insert("model", serde_json::json!(anchor.resource_code));
    dimensions.insert("meter_code", serde_json::json!(anchor.meter_code));
    dimensions.insert("provider_code", serde_json::json!(anchor.provider_code));
    dimensions.insert("product_code", serde_json::json!(anchor.product_code));
    dimensions.insert("operation_code", serde_json::json!(anchor.operation_code));
    let selected_rule =
        select_pricing_rule_for_dimensions(rules, &dimensions, occurred_at, &plan.plan_code)?;

    let (resolved_unit_price, currency_code, source) = match selected_rule.as_ref() {
        Some(rule) if rule.formula_mode == "unit_price_override" => {
            let money = rule.unit_price_override.clone().ok_or_else(|| {
                DomainError::new("unit_price_override pricing rule is missing its override price")
            })?;
            let price = money.unit_price.to_fixed_string(12);
            let currency = money.currency;
            (price, currency, "rule_override")
        }
        Some(rule) if rule.formula_mode == "multiplier_markup" => {
            let official_money = Money::new(&anchor.currency_code, anchor.unit_price.trim())?;
            if official_money.currency != plan.currency_code {
                // Cross-currency markup is not expressible; degrade to the
                // official reference the same way the runtime skips the
                // markup with a warning.
                (
                    official_money.unit_price.to_fixed_string(12),
                    official_money.currency,
                    "official_reference",
                )
            } else {
                let multiplied = official_money.checked_multiply(rule.multiplier)?;
                let with_markup = multiplied.add(&rule.markup_amount)?;
                let price = with_markup.unit_price.to_fixed_string(12);
                let currency = with_markup.currency;
                (price, currency, "rule_multiplier_markup")
            }
        }
        _ => {
            let price = DecimalValue::parse(anchor.unit_price.trim())?.to_fixed_string(12);
            let currency = anchor.currency_code.clone();
            (price, currency, "official_reference")
        }
    };

    Ok(Some(AdminPriceSettingResolution {
        official: official.clone(),
        region_code: official.region_code.clone(),
        region_fallback,
        pricing_plan_id: plan.id.to_string(),
        pricing_plan_code: plan.plan_code,
        rule: selected_rule.as_ref().map(admin_rule_item_from_domain),
        resolved_unit_price,
        currency_code,
        source: source.to_owned(),
    }))
}

fn validate_price_setting_money(command: &SaveAdminPriceSettingCommand) -> DomainResult<()> {
    match command.formula_mode {
        AdminPricingFormulaMode::UnitPriceOverride => {
            let raw = command
                .unit_price_override
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| {
                    DomainError::new(
                        "unit_price_override is required for unit_price_override price settings",
                    )
                })?;
            reject_negative_amount(raw, "unit_price_override")?;
            let price = DecimalValue::parse(raw)?;
            if price.is_zero() {
                return Err(DomainError::new(
                    "unit_price_override must be greater than zero",
                ));
            }
        }
        AdminPricingFormulaMode::MultiplierMarkup => {
            let multiplier = command.multiplier.trim();
            reject_negative_amount(multiplier, "multiplier")?;
            let value = DecimalValue::parse(multiplier)?;
            if value.is_zero() {
                return Err(DomainError::new("multiplier must be greater than zero"));
            }
            let markup = command.markup_amount.trim();
            reject_negative_amount(markup, "markup_amount")?;
            DecimalValue::parse(markup)?;
        }
    }
    Ok(())
}

fn reject_negative_amount(raw: &str, field_name: &str) -> DomainResult<()> {
    if raw.starts_with('-') {
        return Err(DomainError::new(format!(
            "{field_name} must not be negative"
        )));
    }
    Ok(())
}

fn non_empty_text(value: &str) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}

fn price_setting_rule_code(anchor: &AdminOfficialRateAnchor) -> String {
    let derived = format!("price_setting:{}", anchor.rate_code.trim());
    // rule_code is VARCHAR(96); a truncated code stays unique within the plan
    // because rate codes sharing a 96-char prefix are practically identical
    // identifiers, and a real collision surfaces as an explicit constraint
    // error instead of a silent overwrite.
    derived
        .chars()
        .take(PRICE_SETTING_RULE_CODE_MAX_CHARS)
        .collect()
}

/// Loads the official rate row a price setting edit anchors on, under the
/// official catalog scope `(0, 0)` with an active `official_reference` book.
async fn load_official_rate_anchor<'e, E>(
    executor: E,
    rate_code: &str,
) -> DomainResult<Option<AdminOfficialRateAnchor>>
where
    E: sqlx::Executor<'e, Database = Postgres>,
{
    let row = sqlx::query(
        r#"
        SELECT r.rate_code, r.product_code, r.operation_code, r.meter_code,
               r.meter_display_name, r.provider_code, r.region_code,
               COALESCE(r.catalog_key, '') AS catalog_key,
               r.vendor_code, r.resource_type, r.resource_code, r.unit_code,
               r.unit_size::text AS unit_size, r.unit_price::text AS unit_price,
               r.currency_code,
               r.effective_from::text AS effective_from,
               r.effective_to::text AS effective_to
        FROM pricing_rate r
        JOIN pricing_price_book book
          ON book.tenant_id = r.tenant_id
         AND book.organization_id = r.organization_id
         AND book.id = r.price_book_id
        WHERE r.tenant_id = 0 AND r.organization_id = 0
          AND r.status = 1 AND r.deleted_at IS NULL
          AND r.rate_code = $1
          AND book.status = 1 AND book.deleted_at IS NULL
          AND book.price_side = 'official_reference'
          AND book.lifecycle_state = 'active'
          AND book.effective_from <= CURRENT_TIMESTAMP
          AND (book.effective_to IS NULL OR book.effective_to > CURRENT_TIMESTAMP)
        ORDER BY r.id DESC
        LIMIT 1
        "#,
    )
    .bind(rate_code)
    .fetch_optional(executor)
    .await
    .map_err(|error| store_error("failed to load official rate anchor", error))?;
    row.as_ref()
        .map(|row| {
            Ok(AdminOfficialRateAnchor {
                rate_code: string_cell(row, "rate_code"),
                product_code: string_cell(row, "product_code"),
                operation_code: string_cell(row, "operation_code"),
                meter_code: string_cell(row, "meter_code"),
                meter_display_name: string_cell(row, "meter_display_name"),
                provider_code: string_cell(row, "provider_code"),
                region_code: string_cell(row, "region_code"),
                catalog_key: string_cell(row, "catalog_key"),
                vendor_code: string_cell(row, "vendor_code"),
                resource_type: string_cell(row, "resource_type"),
                resource_code: string_cell(row, "resource_code"),
                unit_code: string_cell(row, "unit_code"),
                unit_size: string_cell(row, "unit_size"),
                unit_price: string_cell(row, "unit_price"),
                currency_code: string_cell(row, "currency_code"),
                effective_from: optional_string_cell(row, "effective_from"),
                effective_to: optional_string_cell(row, "effective_to"),
            })
        })
        .transpose()
}

/// Loads every currently-effective official rate row for the anchor's
/// (resource, operation, meter) identity across all regions. Standard variants
/// rank first so the preview mirrors the runtime's standard-tab price.
async fn load_official_rate_candidates(
    pool: &PgPool,
    anchor: &AdminOfficialRateAnchor,
    occurred_at: DateTime<Utc>,
) -> DomainResult<Vec<AdminOfficialRateAnchor>> {
    let rows = sqlx::query(
        r#"
        SELECT r.rate_code, r.product_code, r.operation_code, r.meter_code,
               r.meter_display_name, r.provider_code, r.region_code,
               COALESCE(r.catalog_key, '') AS catalog_key,
               r.vendor_code, r.resource_type, r.resource_code, r.unit_code,
               r.unit_size::text AS unit_size, r.unit_price::text AS unit_price,
               r.currency_code,
               r.effective_from::text AS effective_from,
               r.effective_to::text AS effective_to
        FROM pricing_rate r
        JOIN pricing_price_book book
          ON book.tenant_id = r.tenant_id
         AND book.organization_id = r.organization_id
         AND book.id = r.price_book_id
        WHERE r.tenant_id = 0 AND r.organization_id = 0
          AND r.status = 1 AND r.deleted_at IS NULL
          AND book.status = 1 AND book.deleted_at IS NULL
          AND book.price_side = 'official_reference'
          AND book.lifecycle_state = 'active'
          AND book.effective_from <= $6::timestamptz
          AND (book.effective_to IS NULL OR book.effective_to > $6::timestamptz)
          AND r.vendor_code = $1
          AND r.provider_code = $2
          AND COALESCE(r.catalog_key, '') = $3
          AND r.product_code = $4
          AND r.resource_code = $5
          AND r.operation_code = $7
          AND r.meter_code = $8
          AND r.effective_from <= $6::timestamptz
          AND (r.effective_to IS NULL OR r.effective_to > $6::timestamptz)
        ORDER BY (r.rate_variant = 'standard') DESC, r.priority DESC, r.id DESC
        "#,
    )
    .bind(&anchor.vendor_code)
    .bind(&anchor.provider_code)
    .bind(&anchor.catalog_key)
    .bind(&anchor.product_code)
    .bind(&anchor.resource_code)
    .bind(occurred_at)
    .bind(&anchor.operation_code)
    .bind(&anchor.meter_code)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to load official rate candidates", error))?;
    rows.iter()
        .map(|row| {
            Ok(AdminOfficialRateAnchor {
                rate_code: string_cell(row, "rate_code"),
                product_code: string_cell(row, "product_code"),
                operation_code: string_cell(row, "operation_code"),
                meter_code: string_cell(row, "meter_code"),
                meter_display_name: string_cell(row, "meter_display_name"),
                provider_code: string_cell(row, "provider_code"),
                region_code: string_cell(row, "region_code"),
                catalog_key: string_cell(row, "catalog_key"),
                vendor_code: string_cell(row, "vendor_code"),
                resource_type: string_cell(row, "resource_type"),
                resource_code: string_cell(row, "resource_code"),
                unit_code: string_cell(row, "unit_code"),
                unit_size: string_cell(row, "unit_size"),
                unit_price: string_cell(row, "unit_price"),
                currency_code: string_cell(row, "currency_code"),
                effective_from: optional_string_cell(row, "effective_from"),
                effective_to: optional_string_cell(row, "effective_to"),
            })
        })
        .collect()
}

/// Walks the region fallback chain and returns the winning official rate plus
/// whether the resolution left the requested region.
fn select_official_rate_for_regions<'a>(
    candidates: &'a [AdminOfficialRateAnchor],
    region_chain: &[String],
    requested_region: &str,
) -> (&'a AdminOfficialRateAnchor, bool) {
    for region in region_chain {
        if let Some(rate) = candidates
            .iter()
            .find(|rate| rate.region_code.trim() == region.as_str())
        {
            let fell_back = rate.region_code.trim() != requested_region.trim();
            return (rate, fell_back);
        }
    }
    // "Any available" terminal probe; candidates are non-empty.
    let rate = &candidates[0];
    let fell_back = rate.region_code.trim() != requested_region.trim();
    (rate, fell_back)
}

/// Finds the existing unconditioned standard rule backing the anchored
/// (resource, region, meter) tuple, locking it for the transaction.
async fn find_standard_price_setting_rule(
    tx: &mut Transaction<'_, Postgres>,
    command: &SaveAdminPriceSettingCommand,
    anchor: &AdminOfficialRateAnchor,
    pricing_plan_id: i64,
) -> DomainResult<Option<i64>> {
    let rule_id: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM cloudrouter_pricing_rule
        WHERE tenant_id = $1
          AND organization_id = $2
          AND pricing_plan_id = $3
          AND deleted_at IS NULL
          AND conditions = '[]'::jsonb
          AND schedule IS NULL
          AND product_code IS NOT DISTINCT FROM $4
          AND operation_code IS NOT DISTINCT FROM $5
          AND meter_code IS NOT DISTINCT FROM $6
          AND provider_code IS NOT DISTINCT FROM $7
          AND region_code IS NOT DISTINCT FROM $8
          AND catalog_key IS NOT DISTINCT FROM $9
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(pricing_plan_id)
    .bind(non_empty_text(&anchor.product_code))
    .bind(non_empty_text(&anchor.operation_code))
    .bind(non_empty_text(&anchor.meter_code))
    .bind(non_empty_text(&anchor.provider_code))
    .bind(non_empty_text(&anchor.region_code))
    .bind(non_empty_text(&anchor.catalog_key))
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to find the standard price setting rule", error))?;
    Ok(rule_id)
}

/// Rewrites one rule's scope dimensions and formula fields to the anchored
/// official rate. Conditions are preserved so time-window variants keep their
/// identity.
async fn update_price_setting_rule(
    tx: &mut Transaction<'_, Postgres>,
    command: &SaveAdminPriceSettingCommand,
    anchor: &AdminOfficialRateAnchor,
    pricing_plan_id: i64,
    rule_id: i64,
) -> DomainResult<()> {
    let updated = sqlx::query(
        r#"
        UPDATE cloudrouter_pricing_rule
        SET product_code = $1,
            operation_code = $2,
            meter_code = $3,
            provider_code = $4,
            region_code = $5,
            catalog_key = $6,
            formula_mode = $7,
            multiplier = $8::numeric,
            markup_amount = $9::numeric,
            unit_price_override = $10::numeric,
            schedule = $11::jsonb,
            priority = $12,
            effective_from = $13::timestamptz,
            effective_to = $14::timestamptz,
            status = $15,
            updated_at = $16,
            version = cloudrouter_pricing_rule.version + 1
        WHERE id = $17
          AND tenant_id = $18
          AND organization_id = $19
          AND pricing_plan_id = $20
          AND deleted_at IS NULL
        "#,
    )
    .bind(non_empty_text(&anchor.product_code))
    .bind(non_empty_text(&anchor.operation_code))
    .bind(non_empty_text(&anchor.meter_code))
    .bind(non_empty_text(&anchor.provider_code))
    .bind(non_empty_text(&anchor.region_code))
    .bind(non_empty_text(&anchor.catalog_key))
    .bind(command.formula_mode.label())
    .bind(&command.multiplier)
    .bind(&command.markup_amount)
    .bind(command.unit_price_override.as_deref())
    .bind(command.schedule.as_ref().map(Value::to_string))
    .bind(command.priority)
    .bind(command.effective_from.as_deref())
    .bind(command.effective_to.as_deref())
    .bind(command.status.db_value())
    .bind(&command.requested_at)
    .bind(rule_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(pricing_plan_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update the price setting rule", error))?;
    if updated.rows_affected() == 0 {
        return Err(DomainError::not_found(
            "pricing rule was not found for the price setting",
        ));
    }
    Ok(())
}

/// Plan selection for the price preview: explicit query plan first, then the
/// active `default` rate card, then the plan coded `default`.
async fn load_price_setting_plan(
    pool: &PgPool,
    query: &ResolveAdminPriceSettingQuery,
    occurred_at: DateTime<Utc>,
) -> DomainResult<PriceSettingPlan> {
    if let Some(plan_id_raw) = query
        .pricing_plan_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let plan_id = parse_pricing_id(plan_id_raw, "pricing plan id")?;
        let row: Option<(i64, String, String)> = sqlx::query_as(
            r#"
            SELECT id, plan_code, currency_code
            FROM cloudrouter_pricing_plan
            WHERE id = $1
              AND tenant_id = $2
              AND organization_id = $3
              AND status = 1
              AND deleted_at IS NULL
            LIMIT 1
            "#,
        )
        .bind(plan_id)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| store_error("failed to load pricing plan", error))?;
        return row
            .map(|(id, plan_code, currency_code)| PriceSettingPlan {
                id,
                plan_code,
                currency_code,
            })
            .ok_or_else(|| DomainError::not_found("pricing plan was not found"));
    }
    let from_rate_card: Option<(i64, String, String)> = sqlx::query_as(
        r#"
        SELECT plan.id, plan.plan_code, plan.currency_code
        FROM cloudrouter_account_rate_card card
        JOIN cloudrouter_pricing_plan plan
          ON plan.tenant_id = card.pricing_plan_tenant_id
         AND plan.organization_id = card.pricing_plan_organization_id
         AND plan.id = card.pricing_plan_id
         AND plan.status = 1 AND plan.deleted_at IS NULL
        WHERE card.tenant_id = $1
          AND card.organization_id = $2
          AND card.subject_type = 'default'
          AND card.status = 1
          AND card.deleted_at IS NULL
          AND card.effective_from <= $3::timestamptz
          AND (card.effective_to IS NULL OR card.effective_to > $3::timestamptz)
        ORDER BY card.priority ASC, card.id ASC
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(occurred_at)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load the default rate card plan", error))?;
    if let Some((id, plan_code, currency_code)) = from_rate_card {
        return Ok(PriceSettingPlan {
            id,
            plan_code,
            currency_code,
        });
    }
    let fallback: Option<(i64, String, String)> = sqlx::query_as(
        r#"
        SELECT id, plan_code, currency_code
        FROM cloudrouter_pricing_plan
        WHERE tenant_id = $1
          AND organization_id = $2
          AND plan_code = 'default'
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY id ASC
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load the default-coded pricing plan", error))?;
    fallback
        .map(|(id, plan_code, currency_code)| PriceSettingPlan {
            id,
            plan_code,
            currency_code,
        })
        .ok_or_else(|| DomainError::not_found("no pricing plan is available for the price preview"))
}

/// Computes the resource identity key exactly as the runtime does.
async fn load_pricing_resource_key(
    pool: &PgPool,
    anchor: &AdminOfficialRateAnchor,
) -> DomainResult<String> {
    let key: String = sqlx::query_scalar("SELECT pricing_resource_key($1, $2, $3, $4, $5)")
        .bind(&anchor.vendor_code)
        .bind(&anchor.provider_code)
        .bind(&anchor.catalog_key)
        .bind(&anchor.product_code)
        .bind(&anchor.resource_code)
        .fetch_one(pool)
        .await
        .map_err(|error| store_error("failed to resolve pricing resource key", error))?;
    Ok(key)
}

/// Reads the configured default billing region for one resource under one
/// scope. `global` is never a valid default region (runtime loader rule).
async fn load_configured_default_region(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    resource_key: &str,
) -> DomainResult<Option<String>> {
    let region: Option<String> = sqlx::query_scalar(
        r#"
        SELECT default_region_code
        FROM pricing_default_region
        WHERE tenant_id = $1
          AND organization_id = $2
          AND resource_key = $3
          AND deleted_at IS NULL
          AND BTRIM(default_region_code) <> ''
          AND BTRIM(default_region_code) <> 'global'
          AND effective_from <= CURRENT_TIMESTAMP
          AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
        ORDER BY id ASC
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(resource_key)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load the default billing region", error))?;
    Ok(region
        .map(|region| region.trim().to_owned())
        .filter(|region| !region.is_empty()))
}

/// Loads every active sales rule via the runtime snapshot query and lets the
/// caller filter by plan and scope. The snapshot SQL carries no binds by
/// design; rule volumes are small enough to filter in memory.
async fn load_active_pricing_rules(pool: &PgPool) -> DomainResult<Vec<PricingRule>> {
    super::row_mapping::load_pricing_rules(pool, PricingCatalogSql::load_pricing_rules())
        .await
        .map(|rows| rows.into_iter().map(|row| row.value).collect())
        .map_err(|error| store_error("failed to load active pricing rules", error))
}

fn admin_rule_item_from_domain(rule: &PricingRule) -> AdminPricingRuleItem {
    let conditions = serde_json::Value::Array(
        rule.conditions
            .iter()
            .map(|condition| {
                serde_json::json!({
                    "dimensionCode": condition.dimension_code,
                    "operatorCode": condition.operator_code,
                    "value": condition.value,
                })
            })
            .collect(),
    );
    AdminPricingRuleItem {
        id: rule.id.to_string(),
        pricing_plan_id: rule.pricing_plan_id.to_string(),
        plan_code: Some(rule.plan_code.clone()).filter(|value| !value.is_empty()),
        rule_code: rule.rule_code.clone(),
        product_code: rule.product_code.clone().filter(|value| !value.is_empty()),
        operation_code: rule
            .operation_code
            .clone()
            .filter(|value| !value.is_empty()),
        meter_code: rule.meter_code.clone().filter(|value| !value.is_empty()),
        provider_code: rule.provider_code.clone().filter(|value| !value.is_empty()),
        region_code: rule.region_code.clone().filter(|value| !value.is_empty()),
        catalog_key: rule.catalog_key.clone().filter(|value| !value.is_empty()),
        formula_mode: rule.formula_mode.clone(),
        multiplier: rule.multiplier.to_fixed_string(12),
        markup_amount: rule.markup_amount.unit_price.to_fixed_string(12),
        unit_price_override: rule
            .unit_price_override
            .as_ref()
            .map(|money| money.unit_price.to_fixed_string(12)),
        conditions,
        // The preview item carries the matched rule identity and formula; the
        // schedule body stays on the rule detail surface.
        schedule: None,
        priority: i64::from(rule.priority),
        effective_from: Some(rule.effective_from.to_rfc3339()),
        effective_to: rule.effective_to.map(|value| value.to_rfc3339()),
        status: AdminPricingStatus::Active.label().to_owned(),
        created_at: None,
        updated_at: None,
    }
}

fn parse_occurred_at(raw: Option<&str>) -> DomainResult<DateTime<Utc>> {
    match raw.map(str::trim).filter(|value| !value.is_empty()) {
        None => Ok(Utc::now()),
        Some(value) => DateTime::parse_from_rfc3339(value)
            .map(|parsed| parsed.with_timezone(&Utc))
            .map_err(|_| DomainError::new("occurredAt must be an RFC 3339 timestamp")),
    }
}
