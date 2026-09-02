use serde_json::Value;
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminDefaultRegionItem, AdminPricingCommandFuture, AdminPricingListPage, AdminPricingPlanItem,
    AdminPricingRuleItem, AdminPricingStatus, AdminPricingStore, AdminPricingSubject,
    AdminRateCardItem, CreateAdminPricingPlanCommand, CreateAdminPricingRuleCommand,
    CreateAdminRateCardCommand, DeleteAdminDefaultRegionCommand, DeleteAdminPricingRuleCommand,
    DeleteAdminRateCardCommand, ListAdminDefaultRegionsQuery, ListAdminPricingPlansQuery,
    ListAdminPricingRulesQuery, ListAdminRateCardsQuery, LoadAdminPricingPlanQuery,
    SaveAdminDefaultRegionCommand, UpdateAdminDefaultRegionCommand,
    UpdateAdminPricingPlanCommand, UpdateAdminPricingRuleCommand, UpdateAdminRateCardCommand,
};

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
        .map_err(|error| {
            store_error("failed to begin default region update transaction", error)
        })?;
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
            .map_err(|error| {
                store_error("failed to commit default region update", error)
            })?;
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
            .map_err(|error| {
                store_error("failed to commit default region update", error)
            })?;
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
        .map_err(|error| {
            store_error("failed to commit default region update", error)
        })?;
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
