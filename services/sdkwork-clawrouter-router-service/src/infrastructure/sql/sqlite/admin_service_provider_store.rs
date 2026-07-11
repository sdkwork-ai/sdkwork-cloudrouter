use sha2::{Digest, Sha256};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::domain::{DecimalValue, DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::sql_admin_service_provider::{
    risk_label_sql, status_label_sql, SERVICE_PROVIDER_AUDIT_TARGET_ADJUSTMENT,
    SERVICE_PROVIDER_AUDIT_TARGET_CONTRACT, SERVICE_PROVIDER_AUDIT_TARGET_EDGE,
    SERVICE_PROVIDER_AUDIT_TARGET_PRICE_RULE, SERVICE_PROVIDER_AUDIT_TARGET_PROVIDER,
    SERVICE_PROVIDER_AUDIT_TARGET_RECONCILIATION_RUN, SERVICE_PROVIDER_AUDIT_TARGET_STATEMENT,
};
use crate::ports::{
    AdminServiceProviderCollection, AdminServiceProviderCommandFuture,
    AdminServiceProviderDashboardItem, AdminServiceProviderDownstreamMutationItem,
    AdminServiceProviderJsonRecord, AdminServiceProviderPriceSimulationCommand,
    AdminServiceProviderPriceSimulationItem, AdminServiceProviderPricingRuleMutationItem,
    AdminServiceProviderStore, CreateAdminServiceProviderDownstreamCommand,
    CreateAdminServiceProviderPricingRuleCommand, ListAdminServiceProviderRecordsQuery,
    UpdateAdminServiceProviderPricingRuleCommand,
};

#[derive(Debug, Clone)]
pub struct SqliteAdminServiceProviderStore {
    pool: SqlitePool,
}

const SERVICE_PROVIDER_DOWNSTREAM_CREATE_ACTION: &str = "service_provider.downstream.create";
const SERVICE_PROVIDER_PRICE_RULE_CREATE_ACTION: &str = "service_provider.price_rule.create";
const SERVICE_PROVIDER_PRICE_RULE_UPDATE_ACTION: &str = "service_provider.price_rule.update";

impl SqliteAdminServiceProviderStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminServiceProviderStore for SqliteAdminServiceProviderStore {
    fn retrieve_dashboard<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderDashboardItem> {
        Box::pin(async move { retrieve_dashboard(&self.pool, query).await })
    }

    fn list_providers<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_providers(&self.pool, query).await })
    }

    fn list_relations<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_edges(&self.pool, query).await })
    }

    fn list_downstreams<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_downstreams(&self.pool, query).await })
    }

    fn create_downstream<'a>(
        &'a self,
        command: CreateAdminServiceProviderDownstreamCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderDownstreamMutationItem> {
        Box::pin(async move { create_downstream(&self.pool, command).await })
    }

    fn list_members<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_members(&self.pool, query).await })
    }

    fn list_bindings<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_subject_bindings(&self.pool, query).await })
    }

    fn list_contracts<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_contracts(&self.pool, query).await })
    }

    fn list_pricing_rules<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_pricing_rules(&self.pool, query).await })
    }

    fn create_pricing_rule<'a>(
        &'a self,
        command: CreateAdminServiceProviderPricingRuleCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderPricingRuleMutationItem> {
        Box::pin(async move { create_pricing_rule(&self.pool, command).await })
    }

    fn update_pricing_rule<'a>(
        &'a self,
        command: UpdateAdminServiceProviderPricingRuleCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderPricingRuleMutationItem> {
        Box::pin(async move { update_pricing_rule(&self.pool, command).await })
    }

    fn simulate_price<'a>(
        &'a self,
        command: AdminServiceProviderPriceSimulationCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderPriceSimulationItem> {
        Box::pin(async move { simulate_price(&self.pool, command).await })
    }

    fn list_usage<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_usage(&self.pool, query).await })
    }

    fn list_wallet_accounts<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_wallet_accounts(&self.pool, query).await })
    }

    fn list_statements<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_statements(&self.pool, query).await })
    }

    fn list_reconciliation_runs<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_reconciliation_runs(&self.pool, query).await })
    }

    fn list_adjustments<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_adjustments(&self.pool, query).await })
    }

    fn list_risk_events<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_risk_events(&self.pool, query).await })
    }

    fn list_audit_events<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { list_audit_events(&self.pool, query).await })
    }
}

async fn retrieve_dashboard(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderDashboardItem> {
    let row = sqlx::query(&format!(
        r#"
        WITH member_scope AS (
            SELECT service_provider_id
            FROM integration_service_provider_member
            WHERE tenant_id = ?1
              AND organization_id = ?2
              AND member_user_id = ?3
              AND status = 1
              AND deleted_at IS NULL
        ),
        visible_provider AS (
            SELECT service_provider_id AS provider_id FROM member_scope
            UNION
            SELECT c.descendant_provider_id AS provider_id
            FROM integration_service_provider_closure c
            JOIN member_scope m ON m.service_provider_id = c.ancestor_provider_id
            WHERE c.tenant_id = ?1
              AND c.organization_id = ?2
              AND c.status = 1
              AND c.deleted_at IS NULL
        ),
        filter_state AS (
            SELECT CASE
                WHEN ?4 IS NULL AND ?5 IS NULL AND ?6 IS NULL AND ?7 IS NULL THEN 0
                ELSE 1
            END AS has_chain_filter
        ),
        scoped_provider AS (
            SELECT p.id, p.status, p.risk_level
            FROM integration_service_provider p
            WHERE p.tenant_id = ?1
              AND p.organization_id = ?2
              AND p.deleted_at IS NULL
              AND (NOT EXISTS (SELECT 1 FROM member_scope)
                   OR p.id IN (SELECT provider_id FROM visible_provider))
              AND ((SELECT has_chain_filter FROM filter_state) = 0
                   OR ((?4 IS NULL OR CAST(p.id AS TEXT) = ?4)
                       AND (?5 IS NULL OR EXISTS (
                            SELECT 1 FROM integration_service_provider_edge edge_filter
                            WHERE edge_filter.tenant_id = p.tenant_id
                              AND edge_filter.organization_id = p.organization_id
                              AND edge_filter.deleted_at IS NULL
                              AND CAST(edge_filter.seller_provider_id AS TEXT) = ?5
                              AND (edge_filter.seller_provider_id = p.id
                                   OR edge_filter.buyer_provider_id = p.id)
                       ))
                       AND (?6 IS NULL OR EXISTS (
                            SELECT 1 FROM integration_service_provider_edge edge_filter
                            WHERE edge_filter.tenant_id = p.tenant_id
                              AND edge_filter.organization_id = p.organization_id
                              AND edge_filter.deleted_at IS NULL
                              AND CAST(edge_filter.buyer_provider_id AS TEXT) = ?6
                              AND (edge_filter.seller_provider_id = p.id
                                   OR edge_filter.buyer_provider_id = p.id)
                       ))
                       AND (?7 IS NULL OR EXISTS (
                            SELECT 1 FROM integration_service_provider_edge edge_filter
                            WHERE edge_filter.tenant_id = p.tenant_id
                              AND edge_filter.organization_id = p.organization_id
                              AND edge_filter.deleted_at IS NULL
                              AND CAST(edge_filter.id AS TEXT) = ?7
                              AND (edge_filter.seller_provider_id = p.id
                                   OR edge_filter.buyer_provider_id = p.id)
                       ))))
        ),
        filtered_edge_daily AS (
            SELECT ed.*
            FROM analytics_service_provider_edge_daily ed
            WHERE ed.tenant_id = ?1
              AND ed.organization_id = ?2
              AND ed.status = 1
              AND (NOT EXISTS (SELECT 1 FROM member_scope)
                   OR ed.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                   OR ed.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
              AND (?4 IS NULL OR CAST(ed.seller_provider_id AS TEXT) = ?4 OR CAST(ed.buyer_provider_id AS TEXT) = ?4)
              AND (?5 IS NULL OR CAST(ed.seller_provider_id AS TEXT) = ?5)
              AND (?6 IS NULL OR CAST(ed.buyer_provider_id AS TEXT) = ?6)
              AND (?7 IS NULL OR CAST(ed.edge_id AS TEXT) = ?7)
        )
        SELECT
            'service-provider-dashboard' AS id,
            CASE
                WHEN (SELECT has_chain_filter FROM filter_state) = 1
                THEN CASE WHEN EXISTS (SELECT 1 FROM filtered_edge_daily) THEN 'active' ELSE 'inactive' END
                ELSE CASE WHEN EXISTS (SELECT 1 FROM scoped_provider WHERE status = 1) THEN 'active' ELSE 'inactive' END
            END AS status,
            CASE
                WHEN (SELECT has_chain_filter FROM filter_state) = 1
                THEN (SELECT GROUP_CONCAT(CAST(income_amount AS TEXT), char(31)) FROM filtered_edge_daily)
                ELSE (
                    SELECT GROUP_CONCAT(CAST(d.income_amount AS TEXT), char(31))
                    FROM analytics_service_provider_daily d
                    JOIN scoped_provider p ON p.id = d.provider_id
                    WHERE d.tenant_id = ?1
                      AND d.organization_id = ?2
                      AND d.status = 1
                )
            END AS income_amount_values,
            CASE
                WHEN (SELECT has_chain_filter FROM filter_state) = 1
                THEN (SELECT GROUP_CONCAT(CAST(expense_amount AS TEXT), char(31)) FROM filtered_edge_daily)
                ELSE (
                    SELECT GROUP_CONCAT(CAST(d.expense_amount AS TEXT), char(31))
                    FROM analytics_service_provider_daily d
                    JOIN scoped_provider p ON p.id = d.provider_id
                    WHERE d.tenant_id = ?1
                      AND d.organization_id = ?2
                      AND d.status = 1
                )
            END AS expense_amount_values,
            CASE
                WHEN (SELECT has_chain_filter FROM filter_state) = 1
                THEN (SELECT GROUP_CONCAT(CAST(margin_amount AS TEXT), char(31)) FROM filtered_edge_daily)
                ELSE (
                    SELECT GROUP_CONCAT(CAST(d.margin_amount AS TEXT), char(31))
                    FROM analytics_service_provider_daily d
                    JOIN scoped_provider p ON p.id = d.provider_id
                    WHERE d.tenant_id = ?1
                      AND d.organization_id = ?2
                      AND d.status = 1
                )
            END AS margin_amount_values,
            CASE
                WHEN (SELECT has_chain_filter FROM filter_state) = 1
                THEN (SELECT CAST(COALESCE(SUM(request_count), 0) AS INTEGER) FROM filtered_edge_daily)
                ELSE (
                    SELECT CAST(COALESCE(SUM(d.request_count), 0) AS INTEGER)
                    FROM analytics_service_provider_daily d
                    JOIN scoped_provider p ON p.id = d.provider_id
                    WHERE d.tenant_id = ?1
                      AND d.organization_id = ?2
                      AND d.status = 1
                )
            END AS request_count,
            CASE
                WHEN (SELECT has_chain_filter FROM filter_state) = 1
                THEN (SELECT CAST(COUNT(DISTINCT buyer_provider_id) AS INTEGER) FROM filtered_edge_daily)
                ELSE (
                    SELECT CAST(COUNT(1) AS INTEGER)
                    FROM integration_service_provider_closure c
                    JOIN scoped_provider p ON p.id = c.ancestor_provider_id
                    WHERE c.tenant_id = ?1
                      AND c.organization_id = ?2
                      AND c.depth > 0
                      AND c.status = 1
                      AND c.deleted_at IS NULL
                )
            END AS active_downstream_count,
            (
                SELECT CAST(COUNT(1) AS INTEGER)
                FROM scoped_provider p
                WHERE p.status = 1
                  AND {risk_label} IN ('high', 'critical')
            ) AS risk_provider_count
        "#,
        risk_label = risk_label_sql("p.risk_level")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_one(pool)
    .await
    .map_err(store_error)?;

    Ok(AdminServiceProviderDashboardItem {
        id: string_cell(&row, "id")?,
        status: string_cell(&row, "status")?,
        income_amount: decimal_sum_cell(&row, "income_amount_values")?,
        expense_amount: decimal_sum_cell(&row, "expense_amount_values")?,
        margin_amount: decimal_sum_cell(&row, "margin_amount_values")?,
        request_count: integer_cell(&row, "request_count")?,
        active_downstream_count: integer_cell(&row, "active_downstream_count")?,
        risk_provider_count: integer_cell(&row, "risk_provider_count")?,
    })
}

async fn list_providers(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(p.id AS TEXT) AS id,
            p.provider_no AS providerNo,
            p.display_name AS displayName,
            COALESCE(p.provider_type, '') AS providerType,
            {status_label} AS status,
            {risk_label} AS riskLevel,
            COALESCE(p.default_currency, '') AS currency,
            GROUP_CONCAT(CAST(d.income_amount AS TEXT), char(31)) AS incomeAmountValues,
            GROUP_CONCAT(CAST(d.expense_amount AS TEXT), char(31)) AS expenseAmountValues,
            GROUP_CONCAT(CAST(d.margin_amount AS TEXT), char(31)) AS marginAmountValues,
            CAST(COALESCE(SUM(d.request_count), 0) AS INTEGER) AS requestCount,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_service_provider p
        LEFT JOIN analytics_service_provider_daily d
          ON d.tenant_id = ?1
         AND d.organization_id = ?2
         AND d.provider_id = p.id
         AND d.status = 1
        WHERE p.tenant_id = ?1
          AND p.organization_id = ?2
          AND p.deleted_at IS NULL
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR p.id IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST(p.id AS TEXT) = ?7)
          AND (?8 IS NULL OR EXISTS (
                SELECT 1 FROM integration_service_provider_edge edge_filter
                WHERE edge_filter.tenant_id = p.tenant_id
                  AND edge_filter.organization_id = p.organization_id
                  AND edge_filter.deleted_at IS NULL
                  AND CAST(edge_filter.seller_provider_id AS TEXT) = ?8
                  AND (edge_filter.seller_provider_id = p.id
                       OR edge_filter.buyer_provider_id = p.id)
          ))
          AND (?9 IS NULL OR EXISTS (
                SELECT 1 FROM integration_service_provider_edge edge_filter
                WHERE edge_filter.tenant_id = p.tenant_id
                  AND edge_filter.organization_id = p.organization_id
                  AND edge_filter.deleted_at IS NULL
                  AND CAST(edge_filter.buyer_provider_id AS TEXT) = ?9
                  AND (edge_filter.seller_provider_id = p.id
                       OR edge_filter.buyer_provider_id = p.id)
          ))
          AND (?10 IS NULL OR EXISTS (
                SELECT 1 FROM integration_service_provider_edge edge_filter
                WHERE edge_filter.tenant_id = p.tenant_id
                  AND edge_filter.organization_id = p.organization_id
                  AND edge_filter.deleted_at IS NULL
                  AND CAST(edge_filter.id AS TEXT) = ?10
                  AND (edge_filter.seller_provider_id = p.id
                       OR edge_filter.buyer_provider_id = p.id)
          ))
        GROUP BY p.id
        ORDER BY p.id ASC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("p.status"),
        risk_label = risk_label_sql("p.risk_level")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("providerNo"),
            Field::String("displayName"),
            Field::String("providerType"),
            Field::String("status"),
            Field::String("riskLevel"),
            Field::String("currency"),
            Field::DecimalSum {
                output: "incomeAmount",
                values: "incomeAmountValues",
            },
            Field::DecimalSum {
                output: "expenseAmount",
                values: "expenseAmountValues",
            },
            Field::DecimalSum {
                output: "marginAmount",
                values: "marginAmountValues",
            },
            Field::Integer("requestCount"),
        ],
    )
}

async fn list_downstreams(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(p.id AS TEXT) AS id,
            p.provider_no AS providerNo,
            p.display_name AS displayName,
            COALESCE(p.provider_type, '') AS providerType,
            {status_label} AS status,
            GROUP_CONCAT(CAST(ed.income_amount AS TEXT), char(31)) AS incomeAmountValues,
            GROUP_CONCAT(CAST(ed.expense_amount AS TEXT), char(31)) AS expenseAmountValues,
            GROUP_CONCAT(CAST(ed.margin_amount AS TEXT), char(31)) AS marginAmountValues,
            CAST(COALESCE(SUM(ed.request_count), 0) AS INTEGER) AS requestCount,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_service_provider_closure c
        JOIN integration_service_provider p
          ON p.tenant_id = c.tenant_id
         AND p.organization_id = c.organization_id
         AND p.id = c.descendant_provider_id
         AND p.deleted_at IS NULL
        LEFT JOIN analytics_service_provider_edge_daily ed
          ON ed.tenant_id = c.tenant_id
         AND ed.organization_id = c.organization_id
         AND ed.buyer_provider_id = p.id
         AND ed.status = 1
        WHERE c.tenant_id = ?1
          AND c.organization_id = ?2
          AND c.status = 1
          AND c.deleted_at IS NULL
          AND c.depth > 0
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR c.ancestor_provider_id IN (SELECT service_provider_id FROM member_scope))
          AND (?7 IS NULL OR CAST(c.ancestor_provider_id AS TEXT) = ?7 OR CAST(p.id AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST(c.ancestor_provider_id AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST(p.id AS TEXT) = ?9)
          AND (?10 IS NULL OR CAST(COALESCE(c.direct_edge_id, 0) AS TEXT) = ?10 OR CAST(COALESCE(ed.edge_id, 0) AS TEXT) = ?10)
        GROUP BY p.id
        ORDER BY p.id ASC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("p.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("providerNo"),
            Field::String("displayName"),
            Field::String("providerType"),
            Field::String("status"),
            Field::Integer("requestCount"),
            Field::DecimalSum {
                output: "incomeAmount",
                values: "incomeAmountValues",
            },
            Field::DecimalSum {
                output: "expenseAmount",
                values: "expenseAmountValues",
            },
            Field::DecimalSum {
                output: "marginAmount",
                values: "marginAmountValues",
            },
        ],
    )
}

async fn create_downstream(
    pool: &SqlitePool,
    command: CreateAdminServiceProviderDownstreamCommand,
) -> DomainResult<AdminServiceProviderDownstreamMutationItem> {
    let mut tx = pool.begin().await.map_err(store_error)?;
    let audit_request_id =
        audit_request_id(command.request_id.as_deref(), &command.idempotency_key);
    if let Some(item) = load_downstream_by_audit(
        &mut tx,
        command.subject,
        SERVICE_PROVIDER_DOWNSTREAM_CREATE_ACTION,
        &audit_request_id,
    )
    .await?
    {
        tx.commit().await.map_err(store_error)?;
        return Ok(item);
    }

    let seller_provider_id = parse_required_id(&command.seller_provider_id, "sellerProviderId")?;
    ensure_visible_provider(&mut tx, command.subject, seller_provider_id).await?;
    ensure_provider_no_available(&mut tx, command.subject, &command.provider_no).await?;

    let provider_uuid = stable_uuid(
        "sp-provider",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.provider_no,
            &command.idempotency_key,
        ],
    );
    let buyer_provider_id = next_claw_runtime_id("integration_service_provider")?;
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider
            (uuid, tenant_id, organization_id, status, created_at, updated_at, provider_no, display_name, provider_type, default_currency, default_timezone, risk_level, id)
        VALUES
            (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, 'UTC', 1, ?)
        "#,
    )
    .bind(provider_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.provider_no)
    .bind(&command.display_name)
    .bind(command.provider_type.as_deref())
    .bind(command.default_currency.as_deref().unwrap_or("USD"))
    .bind(buyer_provider_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| write_error("failed to create service provider downstream", error))?;

    let edge_no = stable_uuid(
        "sp-edge",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &seller_provider_id.to_string(),
            &buyer_provider_id.to_string(),
            &command.idempotency_key,
        ],
    );
    let edge_id = next_claw_runtime_id("integration_service_provider_edge")?;
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_edge
            (uuid, tenant_id, organization_id, status, edge_no, seller_provider_id, buyer_provider_id, edge_type, settlement_mode, id)
        VALUES
            (?, ?, ?, 1, ?, ?, ?, 'resale', ?, ?)
        "#,
    )
    .bind(stable_uuid("sp-edge-row", &[&edge_no]))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&edge_no)
    .bind(seller_provider_id)
    .bind(buyer_provider_id)
    .bind(command.settlement_mode.as_deref())
    .bind(edge_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| write_error("failed to create service provider edge", error))?;

    insert_downstream_closure_rows(
        &mut tx,
        command.subject,
        seller_provider_id,
        buyer_provider_id,
        edge_id,
    )
    .await?;

    let price_plan_id = create_default_price_plan_for_downstream(
        &mut tx,
        &command,
        seller_provider_id,
        buyer_provider_id,
        edge_id,
    )
    .await?;

    insert_audit_if_absent(
        &mut tx,
        command.subject,
        &command.idempotency_key,
        command.request_id.as_deref(),
        SERVICE_PROVIDER_DOWNSTREAM_CREATE_ACTION,
        SERVICE_PROVIDER_AUDIT_TARGET_PROVIDER,
        buyer_provider_id,
        None,
    )
    .await?;

    let item = load_downstream_by_provider_id(&mut tx, command.subject, buyer_provider_id).await?;
    tx.commit().await.map_err(store_error)?;
    Ok(AdminServiceProviderDownstreamMutationItem {
        price_plan_id: price_plan_id.map(|id| id.to_string()),
        ..item
    })
}

async fn list_edges(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(e.id AS TEXT) AS id,
            e.edge_no AS edgeNo,
            CAST(e.seller_provider_id AS TEXT) AS sellerProviderId,
            CAST(e.buyer_provider_id AS TEXT) AS buyerProviderId,
            COALESCE(e.edge_type, '') AS edgeType,
            COALESCE(e.settlement_mode, '') AS settlementMode,
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_service_provider_edge e
        WHERE e.tenant_id = ?1
          AND e.organization_id = ?2
          AND e.deleted_at IS NULL
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR e.seller_provider_id IN (SELECT provider_id FROM visible_provider)
               OR e.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST(e.seller_provider_id AS TEXT) = ?7 OR CAST(e.buyer_provider_id AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST(e.seller_provider_id AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST(e.buyer_provider_id AS TEXT) = ?9)
          AND (?10 IS NULL OR CAST(e.id AS TEXT) = ?10)
        ORDER BY e.id ASC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("e.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("edgeNo"),
            Field::String("sellerProviderId"),
            Field::String("buyerProviderId"),
            Field::String("edgeType"),
            Field::String("settlementMode"),
            Field::String("status"),
        ],
    )
}

async fn list_members(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    list_simple_provider_scoped(
        pool,
        query,
        "integration_service_provider_member",
        "m",
        &[
            "CAST(m.id AS TEXT) AS id",
            "CAST(m.service_provider_id AS TEXT) AS serviceProviderId",
            "CAST(m.member_user_id AS TEXT) AS memberUserId",
            "COALESCE(m.role_code, '') AS roleCode",
        ],
        "m.service_provider_id",
        &[
            Field::String("id"),
            Field::String("serviceProviderId"),
            Field::String("memberUserId"),
            Field::String("roleCode"),
            Field::String("status"),
        ],
    )
    .await
}

async fn list_subject_bindings(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    list_simple_provider_scoped(
        pool,
        query,
        "integration_service_provider_subject_binding",
        "b",
        &[
            "CAST(b.id AS TEXT) AS id",
            "CAST(b.service_provider_id AS TEXT) AS serviceProviderId",
            "COALESCE(b.subject_type, '') AS subjectType",
            "CAST(b.subject_id AS TEXT) AS subjectId",
            "COALESCE(b.subject_code, '') AS subjectCode",
            "CAST(COALESCE(b.binding_priority, 0) AS INTEGER) AS bindingPriority",
        ],
        "b.service_provider_id",
        &[
            Field::String("id"),
            Field::String("serviceProviderId"),
            Field::String("subjectType"),
            Field::String("subjectId"),
            Field::String("subjectCode"),
            Field::Integer("bindingPriority"),
            Field::String("status"),
        ],
    )
    .await
}

async fn list_contracts(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(c.id AS TEXT) AS id,
            COALESCE(c.contract_no, '') AS contractNo,
            CAST(c.edge_id AS TEXT) AS edgeId,
            CAST(COALESCE(c.seller_provider_id, 0) AS TEXT) AS sellerProviderId,
            CAST(COALESCE(c.buyer_provider_id, 0) AS TEXT) AS buyerProviderId,
            COALESCE(c.contract_type, '') AS contractType,
            COALESCE(fp.settlement_mode, '') AS settlementMode,
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_service_provider_contract c
        LEFT JOIN integration_service_provider_finance_profile fp
          ON fp.tenant_id = c.tenant_id
         AND fp.organization_id = c.organization_id
         AND fp.service_provider_id = c.buyer_provider_id
         AND fp.deleted_at IS NULL
        WHERE c.tenant_id = ?1
          AND c.organization_id = ?2
          AND c.deleted_at IS NULL
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR c.seller_provider_id IN (SELECT provider_id FROM visible_provider)
               OR c.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST(c.seller_provider_id AS TEXT) = ?7 OR CAST(c.buyer_provider_id AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST(c.seller_provider_id AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST(c.buyer_provider_id AS TEXT) = ?9)
          AND (?10 IS NULL OR CAST(c.edge_id AS TEXT) = ?10)
        ORDER BY c.id ASC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("c.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("contractNo"),
            Field::String("edgeId"),
            Field::String("sellerProviderId"),
            Field::String("buyerProviderId"),
            Field::String("contractType"),
            Field::String("settlementMode"),
            Field::String("status"),
        ],
    )
}

async fn list_pricing_rules(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(r.id AS TEXT) AS id,
            COALESCE(p.plan_code, '') AS planCode,
            COALESCE(r.catalog_key, '') AS catalogKey,
            COALESCE(r.model, '') AS model,
            COALESCE(r.billing_meter_code, '') AS billingMeterCode,
            COALESCE(r.token_kind, '') AS tokenKind,
            CAST(COALESCE(r.unit_price, 0) AS TEXT) AS unitPrice,
            CAST(COALESCE(r.unit_size, 1) AS TEXT) AS unitSize,
            CAST(COALESCE(r.minimum_charge, 0) AS TEXT) AS minimumCharge,
            COALESCE(p.currency, '') AS currency,
            CAST(COALESCE(r.priority, 0) AS INTEGER) AS priority,
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_service_provider_price_rule r
        LEFT JOIN integration_service_provider_price_plan p
          ON p.tenant_id = r.tenant_id
         AND p.organization_id = r.organization_id
         AND p.id = r.price_plan_id
         AND p.deleted_at IS NULL
        WHERE r.tenant_id = ?1
          AND r.organization_id = ?2
          AND r.deleted_at IS NULL
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR r.seller_provider_id IN (SELECT provider_id FROM visible_provider)
               OR r.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST(r.seller_provider_id AS TEXT) = ?7 OR CAST(r.buyer_provider_id AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST(r.seller_provider_id AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST(r.buyer_provider_id AS TEXT) = ?9)
          AND (?10 IS NULL OR CAST(r.edge_id AS TEXT) = ?10)
        ORDER BY r.priority DESC, r.id ASC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("r.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("planCode"),
            Field::String("catalogKey"),
            Field::String("model"),
            Field::String("billingMeterCode"),
            Field::String("tokenKind"),
            Field::String("unitPrice"),
            Field::String("unitSize"),
            Field::String("minimumCharge"),
            Field::String("currency"),
            Field::Integer("priority"),
            Field::String("status"),
        ],
    )
}

async fn create_pricing_rule(
    pool: &SqlitePool,
    command: CreateAdminServiceProviderPricingRuleCommand,
) -> DomainResult<AdminServiceProviderPricingRuleMutationItem> {
    let mut tx = pool.begin().await.map_err(store_error)?;
    let audit_request_id =
        audit_request_id(command.request_id.as_deref(), &command.idempotency_key);
    if let Some(item) = load_pricing_rule_by_audit(
        &mut tx,
        command.subject,
        SERVICE_PROVIDER_PRICE_RULE_CREATE_ACTION,
        &audit_request_id,
    )
    .await?
    {
        tx.commit().await.map_err(store_error)?;
        return Ok(item);
    }

    let seller_provider_id = parse_required_id(&command.seller_provider_id, "sellerProviderId")?;
    let buyer_provider_id = parse_required_id(&command.buyer_provider_id, "buyerProviderId")?;
    ensure_visible_provider(&mut tx, command.subject, seller_provider_id).await?;
    ensure_visible_provider(&mut tx, command.subject, buyer_provider_id).await?;

    let edge_id = resolve_pricing_edge_id(
        &mut tx,
        command.subject,
        seller_provider_id,
        buyer_provider_id,
        command.edge_id.as_deref(),
        command.price_plan_id.as_deref(),
    )
    .await?;
    let price_plan_id = resolve_or_create_price_plan(
        &mut tx,
        command.subject,
        seller_provider_id,
        buyer_provider_id,
        edge_id,
        command.price_plan_id.as_deref(),
        command.currency.as_deref(),
        &command.idempotency_key,
    )
    .await?;
    ensure_price_rule_billable_point_available(
        &mut tx,
        command.subject,
        edge_id,
        command.catalog_key.as_deref(),
        command.model.as_deref(),
        &command.billing_meter_code,
        command.token_kind.as_deref(),
    )
    .await?;

    let rule_id = next_claw_runtime_id("integration_service_provider_price_rule")?;
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_price_rule
            (uuid, tenant_id, organization_id, status, seller_provider_id, buyer_provider_id, edge_id, price_plan_id, catalog_key, model, billing_meter_code, token_kind, unit_price, unit_size, minimum_charge, priority, id)
        VALUES
            (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(stable_uuid(
        "sp-price-rule",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &edge_id.to_string(),
            &command.billing_meter_code,
            command.token_kind.as_deref().unwrap_or("default"),
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(seller_provider_id)
    .bind(buyer_provider_id)
    .bind(edge_id)
    .bind(price_plan_id)
    .bind(command.catalog_key.as_deref())
    .bind(command.model.as_deref())
    .bind(&command.billing_meter_code)
    .bind(command.token_kind.as_deref())
    .bind(&command.unit_price)
    .bind(&command.unit_size)
    .bind(&command.minimum_charge)
    .bind(command.priority)
    .bind(rule_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| write_error("failed to create service provider price rule", error))?;

    insert_audit_if_absent(
        &mut tx,
        command.subject,
        &command.idempotency_key,
        command.request_id.as_deref(),
        SERVICE_PROVIDER_PRICE_RULE_CREATE_ACTION,
        SERVICE_PROVIDER_AUDIT_TARGET_PRICE_RULE,
        rule_id,
        None,
    )
    .await?;

    let item = load_pricing_rule_by_id(&mut tx, command.subject, rule_id).await?;
    tx.commit().await.map_err(store_error)?;
    Ok(item)
}

async fn update_pricing_rule(
    pool: &SqlitePool,
    command: UpdateAdminServiceProviderPricingRuleCommand,
) -> DomainResult<AdminServiceProviderPricingRuleMutationItem> {
    let mut tx = pool.begin().await.map_err(store_error)?;
    let audit_request_id =
        audit_request_id(command.request_id.as_deref(), &command.idempotency_key);
    if let Some(item) = load_pricing_rule_by_audit(
        &mut tx,
        command.subject,
        SERVICE_PROVIDER_PRICE_RULE_UPDATE_ACTION,
        &audit_request_id,
    )
    .await?
    {
        tx.commit().await.map_err(store_error)?;
        return Ok(item);
    }

    let rule_id = parse_required_id(&command.rule_id, "ruleId")?;
    ensure_visible_price_rule(&mut tx, command.subject, rule_id).await?;
    let status = command.status.as_deref().map(status_code).transpose()?;
    sqlx::query(
        r#"
        UPDATE integration_service_provider_price_rule
        SET unit_price = COALESCE(?, unit_price),
            unit_size = COALESCE(?, unit_size),
            minimum_charge = COALESCE(?, minimum_charge),
            priority = COALESCE(?, priority),
            status = COALESCE(?, status)
        WHERE tenant_id = ?
          AND organization_id = ?
          AND id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.unit_price.as_deref())
    .bind(command.unit_size.as_deref())
    .bind(command.minimum_charge.as_deref())
    .bind(command.priority)
    .bind(status)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(rule_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| write_error("failed to update service provider price rule", error))?;

    insert_audit_if_absent(
        &mut tx,
        command.subject,
        &command.idempotency_key,
        command.request_id.as_deref(),
        SERVICE_PROVIDER_PRICE_RULE_UPDATE_ACTION,
        SERVICE_PROVIDER_AUDIT_TARGET_PRICE_RULE,
        rule_id,
        None,
    )
    .await?;

    let item = load_pricing_rule_by_id(&mut tx, command.subject, rule_id).await?;
    tx.commit().await.map_err(store_error)?;
    Ok(item)
}

async fn simulate_price(
    pool: &SqlitePool,
    command: AdminServiceProviderPriceSimulationCommand,
) -> DomainResult<AdminServiceProviderPriceSimulationItem> {
    let row = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(r.id AS TEXT) AS matchedRuleId,
            COALESCE(p.currency, '') AS currency,
            CAST(COALESCE(r.unit_price, 0) AS TEXT) AS unitPrice,
            CAST(COALESCE(r.unit_size, 1) AS TEXT) AS unitSize,
            CAST(COALESCE(r.minimum_charge, 0) AS TEXT) AS minimumCharge
        FROM integration_service_provider_price_rule r
        LEFT JOIN integration_service_provider_price_plan p
          ON p.tenant_id = r.tenant_id
         AND p.organization_id = r.organization_id
         AND p.id = r.price_plan_id
         AND p.deleted_at IS NULL
        WHERE r.tenant_id = ?1
          AND r.organization_id = ?2
          AND r.deleted_at IS NULL
          AND r.status = 1
          AND CAST(r.buyer_provider_id AS TEXT) = ?4
          AND (?5 IS NULL OR r.catalog_key = ?5)
          AND (?6 IS NULL OR r.model = ?6)
          AND r.billing_meter_code = ?7
          AND (?9 IS NULL OR r.token_kind = ?9)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR r.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
        ORDER BY r.priority DESC, r.id ASC
        LIMIT 1
        "#,
        scope_cte = scope_cte()
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.operator_id)
    .bind(&command.buyer_provider_id)
    .bind(command.catalog_key.as_deref())
    .bind(command.model.as_deref())
    .bind(&command.billing_meter_code)
    .bind(&command.quantity)
    .bind(command.token_kind.as_deref())
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    let charge_amount = row
        .as_ref()
        .map(|row| {
            simulate_charge_amount(
                &string_cell(row, "unitPrice")?,
                &string_cell(row, "unitSize")?,
                &string_cell(row, "minimumCharge")?,
                &command.quantity,
            )
        })
        .transpose()?;
    let matched_rule_id = row
        .as_ref()
        .map(|row| string_cell(row, "matchedRuleId"))
        .transpose()?;
    let currency = row
        .as_ref()
        .map(|row| string_cell(row, "currency"))
        .transpose()?
        .filter(|value| !value.is_empty());
    let audit_target_type = if matched_rule_id.is_some() {
        SERVICE_PROVIDER_AUDIT_TARGET_PRICE_RULE
    } else {
        SERVICE_PROVIDER_AUDIT_TARGET_PROVIDER
    };
    let audit_target_id = matched_rule_id
        .as_deref()
        .unwrap_or(&command.buyer_provider_id)
        .parse::<i64>()
        .unwrap_or_default();
    insert_price_simulation_audit(pool, &command, audit_target_type, audit_target_id).await?;

    Ok(AdminServiceProviderPriceSimulationItem {
        id: format!(
            "service-provider-price-simulation:{}:{}:{}",
            command.buyer_provider_id,
            command.billing_meter_code,
            command.token_kind.as_deref().unwrap_or("default")
        ),
        buyer_provider_id: command.buyer_provider_id,
        billing_meter_code: command.billing_meter_code,
        token_kind: command.token_kind,
        quantity: command.quantity,
        charge_amount,
        matched_rule_id,
        currency,
    })
}

fn simulate_charge_amount(
    unit_price: &str,
    unit_size: &str,
    minimum_charge: &str,
    quantity: &str,
) -> DomainResult<String> {
    let unit_price = service_provider_decimal(unit_price, "unitPrice")?;
    let unit_size = service_provider_decimal(unit_size, "unitSize")?;
    let minimum_charge = service_provider_decimal(minimum_charge, "minimumCharge")?;
    let quantity = service_provider_decimal(quantity, "quantity")?;
    if unit_size <= DecimalValue::ZERO {
        return Err(DomainError::new(
            "service provider unitSize must be positive",
        ));
    }
    if quantity <= DecimalValue::ZERO {
        return Err(DomainError::new(
            "service provider quantity must be positive",
        ));
    }

    let variable_charge = unit_price
        .checked_multiply(quantity)?
        .checked_divide(unit_size)?;
    let charge = if variable_charge < minimum_charge {
        minimum_charge
    } else {
        variable_charge
    };
    Ok(compact_decimal_string(charge))
}

fn service_provider_decimal(value: &str, field_name: &str) -> DomainResult<DecimalValue> {
    DecimalValue::parse(value).map_err(|error| {
        DomainError::new(format!("invalid service provider {field_name}: {error}"))
    })
}

fn compact_decimal_string(value: DecimalValue) -> String {
    let mut text = value.to_fixed_string(12);
    if let Some(dot_index) = text.find('.') {
        while text.ends_with('0') {
            text.pop();
        }
        if text.len() == dot_index + 1 {
            text.pop();
        }
    }
    text
}

async fn insert_price_simulation_audit(
    pool: &SqlitePool,
    command: &AdminServiceProviderPriceSimulationCommand,
    target_type: i32,
    target_id: i64,
) -> DomainResult<()> {
    let audit_request_id = command
        .request_id
        .as_deref()
        .unwrap_or(&command.idempotency_key);
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, request_id, operator_id, operator_type, action, target_type, target_id, created_at, id)
        SELECT
            ?1, ?2, ?3, ?4, ?5, ?6, 'service_provider.price_simulation.create', ?7, ?8, CURRENT_TIMESTAMP, ?9
        WHERE NOT EXISTS (
            SELECT 1
            FROM ops_audit_log
            WHERE tenant_id = ?2
              AND organization_id = ?3
              AND action = 'service_provider.price_simulation.create'
              AND request_id = ?4
        )
        "#,
    )
    .bind(format!(
        "service-provider-price-simulation-audit:{}",
        command.idempotency_key
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(audit_request_id)
    .bind(command.subject.operator_id)
    .bind(command.subject.operator_type)
    .bind(target_type)
    .bind(target_id)
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .execute(pool)
    .await
    .map_err(store_error)?;
    Ok(())
}

async fn list_usage(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(u.id AS TEXT) AS id,
            CAST(u.usage_fact_id AS TEXT) AS usageFactId,
            CAST(COALESCE(u.seller_provider_id, 0) AS TEXT) AS sellerProviderId,
            CAST(COALESCE(u.buyer_provider_id, 0) AS TEXT) AS buyerProviderId,
            COALESCE(u.billing_meter_code, '') AS billingMeterCode,
            COALESCE(u.token_kind, '') AS tokenKind,
            CAST(COALESCE(u.billable_quantity, 0) AS TEXT) AS billableQuantity,
            CAST(COALESCE(u.unit_price, 0) AS TEXT) AS unitPrice,
            CAST(COALESCE(u.charge_amount, 0) AS TEXT) AS chargeAmount,
            COALESCE(u.currency, '') AS currency,
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM ai_usage_service_provider_edge u
        WHERE u.tenant_id = ?1
          AND u.organization_id = ?2
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR u.seller_provider_id IN (SELECT provider_id FROM visible_provider)
               OR u.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST(u.seller_provider_id AS TEXT) = ?7 OR CAST(u.buyer_provider_id AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST(u.seller_provider_id AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST(u.buyer_provider_id AS TEXT) = ?9)
          AND (?10 IS NULL OR CAST(u.edge_id AS TEXT) = ?10)
        ORDER BY u.id DESC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("u.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("usageFactId"),
            Field::String("sellerProviderId"),
            Field::String("buyerProviderId"),
            Field::String("billingMeterCode"),
            Field::String("tokenKind"),
            Field::String("billableQuantity"),
            Field::String("unitPrice"),
            Field::String("chargeAmount"),
            Field::String("currency"),
            Field::String("status"),
        ],
    )
}

async fn list_wallet_accounts(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(e.id AS TEXT) AS id,
            CAST(e.service_provider_id AS TEXT) AS serviceProviderId,
            CAST(COALESCE(e.balance_amount, 0) AS TEXT) AS balanceAmount,
            CAST(COALESCE(e.frozen_amount, 0) AS TEXT) AS frozenAmount,
            CAST(COALESCE(e.credit_limit_amount, 0) AS TEXT) AS creditLimitAmount,
            CAST(COALESCE(e.used_credit_amount, 0) AS TEXT) AS usedCreditAmount,
            CAST(COALESCE(e.exposure_amount, 0) AS TEXT) AS exposureAmount,
            CAST(COALESCE(e.overdue_amount, 0) AS TEXT) AS overdueAmount,
            COALESCE(e.currency, '') AS currency,
            COALESCE(e.risk_status, '') AS riskStatus,
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_provider_exposure_snapshot e
        WHERE e.tenant_id = ?1
          AND e.organization_id = ?2
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR e.service_provider_id IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST(e.service_provider_id AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST(e.service_provider_id AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST(e.service_provider_id AS TEXT) = ?9)
          AND (?10 IS NULL OR EXISTS (
                SELECT 1 FROM integration_service_provider_edge edge_filter
                WHERE edge_filter.tenant_id = e.tenant_id
                  AND edge_filter.organization_id = e.organization_id
                  AND edge_filter.deleted_at IS NULL
                  AND CAST(edge_filter.id AS TEXT) = ?10
                  AND (edge_filter.seller_provider_id = e.service_provider_id
                       OR edge_filter.buyer_provider_id = e.service_provider_id)
          ))
        ORDER BY e.id ASC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("e.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("serviceProviderId"),
            Field::String("balanceAmount"),
            Field::String("frozenAmount"),
            Field::String("creditLimitAmount"),
            Field::String("usedCreditAmount"),
            Field::String("exposureAmount"),
            Field::String("overdueAmount"),
            Field::String("currency"),
            Field::String("riskStatus"),
            Field::String("status"),
        ],
    )
}

async fn list_statements(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(s.id AS TEXT) AS id,
            COALESCE(s.statement_no, '') AS statementNo,
            CAST(COALESCE(s.seller_provider_id, 0) AS TEXT) AS sellerProviderId,
            CAST(COALESCE(s.buyer_provider_id, 0) AS TEXT) AS buyerProviderId,
            COALESCE(s.period, '') AS period,
            CAST(COALESCE(s.total_requests, 0) AS INTEGER) AS totalRequests,
            CAST(COALESCE(s.total_tokens, 0) AS INTEGER) AS totalTokens,
            CAST(COALESCE(s.receivable_amount, 0) AS TEXT) AS receivableAmount,
            CAST(COALESCE(s.payable_amount, 0) AS TEXT) AS payableAmount,
            COALESCE(s.currency, '') AS currency,
            CAST(COALESCE(s.statement_status, 0) AS TEXT) AS statementStatus,
            CAST(COALESCE(s.payment_status, 0) AS TEXT) AS paymentStatus,
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_provider_statement s
        WHERE s.tenant_id = ?1
          AND s.organization_id = ?2
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR s.seller_provider_id IN (SELECT provider_id FROM visible_provider)
               OR s.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST(s.seller_provider_id AS TEXT) = ?7 OR CAST(s.buyer_provider_id AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST(s.seller_provider_id AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST(s.buyer_provider_id AS TEXT) = ?9)
          AND (?10 IS NULL OR EXISTS (
                SELECT 1 FROM integration_service_provider_edge edge_filter
                WHERE edge_filter.tenant_id = s.tenant_id
                  AND edge_filter.organization_id = s.organization_id
                  AND edge_filter.deleted_at IS NULL
                  AND CAST(edge_filter.id AS TEXT) = ?10
                  AND edge_filter.seller_provider_id = s.seller_provider_id
                  AND edge_filter.buyer_provider_id = s.buyer_provider_id
          ))
        ORDER BY s.id DESC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("s.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("statementNo"),
            Field::String("sellerProviderId"),
            Field::String("buyerProviderId"),
            Field::String("period"),
            Field::Integer("totalRequests"),
            Field::Integer("totalTokens"),
            Field::String("receivableAmount"),
            Field::String("payableAmount"),
            Field::String("currency"),
            Field::String("statementStatus"),
            Field::String("paymentStatus"),
            Field::String("status"),
        ],
    )
}

async fn list_reconciliation_runs(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(r.id AS TEXT) AS id,
            COALESCE(r.run_no, '') AS runNo,
            COALESCE(r.scope_type, '') AS scopeType,
            COALESCE(r.scope_id, '') AS scopeId,
            CAST(COALESCE(r.matched_count, 0) AS INTEGER) AS matchedCount,
            CAST(COALESCE(r.mismatch_count, 0) AS INTEGER) AS mismatchCount,
            CAST(COALESCE(r.missing_internal_count, 0) AS INTEGER) AS missingInternalCount,
            CAST(COALESCE(r.missing_external_count, 0) AS INTEGER) AS missingExternalCount,
            CAST(COALESCE(r.total_internal_amount, 0) AS TEXT) AS totalInternalAmount,
            CAST(COALESCE(r.total_external_amount, 0) AS TEXT) AS totalExternalAmount,
            CAST(COALESCE(r.difference_amount, 0) AS TEXT) AS differenceAmount,
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_provider_reconciliation_run r
        WHERE r.tenant_id = ?1
          AND r.organization_id = ?2
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR (r.scope_type IN ('service_provider', 'provider')
                   AND CAST(r.scope_id AS INTEGER) IN (SELECT provider_id FROM visible_provider))
               OR (r.scope_type IN ('service_provider_edge', 'edge')
                   AND EXISTS (
                        SELECT 1 FROM integration_service_provider_edge edge_scope
                        WHERE edge_scope.tenant_id = r.tenant_id
                          AND edge_scope.organization_id = r.organization_id
                          AND edge_scope.deleted_at IS NULL
                          AND CAST(edge_scope.id AS TEXT) = r.scope_id
                          AND (edge_scope.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                               OR edge_scope.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
                   ))
               OR EXISTS (
                    SELECT 1
                    FROM integration_provider_reconciliation_item item_scope
                    JOIN ai_usage_service_provider_edge usage_scope
                      ON usage_scope.tenant_id = item_scope.tenant_id
                     AND usage_scope.organization_id = item_scope.organization_id
                     AND usage_scope.id = item_scope.usage_edge_id
                    WHERE item_scope.tenant_id = r.tenant_id
                      AND item_scope.organization_id = r.organization_id
                      AND item_scope.run_id = r.id
                      AND (usage_scope.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                           OR usage_scope.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
               ))
          AND (?7 IS NULL OR (r.scope_type IN ('service_provider', 'provider') AND r.scope_id = ?7)
               OR (r.scope_type IN ('service_provider_edge', 'edge') AND EXISTS (
                    SELECT 1 FROM integration_service_provider_edge edge_filter
                    WHERE edge_filter.tenant_id = r.tenant_id
                      AND edge_filter.organization_id = r.organization_id
                      AND edge_filter.deleted_at IS NULL
                      AND CAST(edge_filter.id AS TEXT) = r.scope_id
                      AND (CAST(edge_filter.seller_provider_id AS TEXT) = ?7
                           OR CAST(edge_filter.buyer_provider_id AS TEXT) = ?7)
               ))
               OR EXISTS (
                    SELECT 1
                    FROM integration_provider_reconciliation_item item_filter
                    JOIN ai_usage_service_provider_edge usage_filter
                      ON usage_filter.tenant_id = item_filter.tenant_id
                     AND usage_filter.organization_id = item_filter.organization_id
                     AND usage_filter.id = item_filter.usage_edge_id
                    WHERE item_filter.tenant_id = r.tenant_id
                      AND item_filter.organization_id = r.organization_id
                      AND item_filter.run_id = r.id
                      AND (CAST(usage_filter.seller_provider_id AS TEXT) = ?7
                           OR CAST(usage_filter.buyer_provider_id AS TEXT) = ?7)
               ))
          AND (?8 IS NULL OR (r.scope_type IN ('service_provider', 'provider') AND r.scope_id = ?8)
               OR (r.scope_type IN ('service_provider_edge', 'edge') AND EXISTS (
                    SELECT 1 FROM integration_service_provider_edge edge_filter
                    WHERE edge_filter.tenant_id = r.tenant_id
                      AND edge_filter.organization_id = r.organization_id
                      AND edge_filter.deleted_at IS NULL
                      AND CAST(edge_filter.id AS TEXT) = r.scope_id
                      AND CAST(edge_filter.seller_provider_id AS TEXT) = ?8
               ))
               OR EXISTS (
                    SELECT 1
                    FROM integration_provider_reconciliation_item item_filter
                    JOIN ai_usage_service_provider_edge usage_filter
                      ON usage_filter.tenant_id = item_filter.tenant_id
                     AND usage_filter.organization_id = item_filter.organization_id
                     AND usage_filter.id = item_filter.usage_edge_id
                    WHERE item_filter.tenant_id = r.tenant_id
                      AND item_filter.organization_id = r.organization_id
                      AND item_filter.run_id = r.id
                      AND CAST(usage_filter.seller_provider_id AS TEXT) = ?8
               ))
          AND (?9 IS NULL OR (r.scope_type IN ('service_provider', 'provider') AND r.scope_id = ?9)
               OR (r.scope_type IN ('service_provider_edge', 'edge') AND EXISTS (
                    SELECT 1 FROM integration_service_provider_edge edge_filter
                    WHERE edge_filter.tenant_id = r.tenant_id
                      AND edge_filter.organization_id = r.organization_id
                      AND edge_filter.deleted_at IS NULL
                      AND CAST(edge_filter.id AS TEXT) = r.scope_id
                      AND CAST(edge_filter.buyer_provider_id AS TEXT) = ?9
               ))
               OR EXISTS (
                    SELECT 1
                    FROM integration_provider_reconciliation_item item_filter
                    JOIN ai_usage_service_provider_edge usage_filter
                      ON usage_filter.tenant_id = item_filter.tenant_id
                     AND usage_filter.organization_id = item_filter.organization_id
                     AND usage_filter.id = item_filter.usage_edge_id
                    WHERE item_filter.tenant_id = r.tenant_id
                      AND item_filter.organization_id = r.organization_id
                      AND item_filter.run_id = r.id
                      AND CAST(usage_filter.buyer_provider_id AS TEXT) = ?9
               ))
          AND (?10 IS NULL OR (r.scope_type IN ('service_provider_edge', 'edge') AND r.scope_id = ?10)
               OR EXISTS (
                    SELECT 1
                    FROM integration_provider_reconciliation_item item_filter
                    JOIN ai_usage_service_provider_edge usage_filter
                      ON usage_filter.tenant_id = item_filter.tenant_id
                     AND usage_filter.organization_id = item_filter.organization_id
                     AND usage_filter.id = item_filter.usage_edge_id
                    WHERE item_filter.tenant_id = r.tenant_id
                      AND item_filter.organization_id = r.organization_id
                      AND item_filter.run_id = r.id
                      AND CAST(usage_filter.edge_id AS TEXT) = ?10
               ))
        ORDER BY r.id DESC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("r.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("runNo"),
            Field::String("scopeType"),
            Field::String("scopeId"),
            Field::Integer("matchedCount"),
            Field::Integer("mismatchCount"),
            Field::Integer("missingInternalCount"),
            Field::Integer("missingExternalCount"),
            Field::String("totalInternalAmount"),
            Field::String("totalExternalAmount"),
            Field::String("differenceAmount"),
            Field::String("status"),
        ],
    )
}

async fn list_adjustments(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(a.id AS TEXT) AS id,
            COALESCE(a.adjustment_no, '') AS adjustmentNo,
            CAST(COALESCE(a.seller_provider_id, 0) AS TEXT) AS sellerProviderId,
            CAST(COALESCE(a.buyer_provider_id, 0) AS TEXT) AS buyerProviderId,
            COALESCE(a.adjustment_type, '') AS adjustmentType,
            CAST(COALESCE(a.amount, 0) AS TEXT) AS amount,
            COALESCE(a.currency, '') AS currency,
            COALESCE(a.reason_code, '') AS reasonCode,
            COALESCE(a.approval_status, '') AS approvalStatus,
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_provider_adjustment a
        WHERE a.tenant_id = ?1
          AND a.organization_id = ?2
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR a.seller_provider_id IN (SELECT provider_id FROM visible_provider)
               OR a.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST(a.seller_provider_id AS TEXT) = ?7 OR CAST(a.buyer_provider_id AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST(a.seller_provider_id AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST(a.buyer_provider_id AS TEXT) = ?9)
          AND (?10 IS NULL OR EXISTS (
                SELECT 1 FROM ai_usage_service_provider_edge edge_usage_filter
                WHERE edge_usage_filter.tenant_id = a.tenant_id
                  AND edge_usage_filter.organization_id = a.organization_id
                  AND edge_usage_filter.id = a.usage_edge_id
                  AND CAST(edge_usage_filter.edge_id AS TEXT) = ?10
          ) OR EXISTS (
                SELECT 1 FROM integration_service_provider_edge edge_filter
                WHERE edge_filter.tenant_id = a.tenant_id
                  AND edge_filter.organization_id = a.organization_id
                  AND edge_filter.deleted_at IS NULL
                  AND CAST(edge_filter.id AS TEXT) = ?10
                  AND edge_filter.seller_provider_id = a.seller_provider_id
                  AND edge_filter.buyer_provider_id = a.buyer_provider_id
          ))
        ORDER BY a.id DESC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("a.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("adjustmentNo"),
            Field::String("sellerProviderId"),
            Field::String("buyerProviderId"),
            Field::String("adjustmentType"),
            Field::String("amount"),
            Field::String("currency"),
            Field::String("reasonCode"),
            Field::String("approvalStatus"),
            Field::String("status"),
        ],
    )
}

async fn list_risk_events(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(e.id AS TEXT) AS id,
            CAST(e.service_provider_id AS TEXT) AS serviceProviderId,
            CAST(COALESCE(e.balance_amount, 0) AS TEXT) AS balanceAmount,
            CAST(COALESCE(e.frozen_amount, 0) AS TEXT) AS frozenAmount,
            CAST(COALESCE(e.credit_limit_amount, 0) AS TEXT) AS creditLimitAmount,
            CAST(COALESCE(e.used_credit_amount, 0) AS TEXT) AS usedCreditAmount,
            CAST(COALESCE(e.exposure_amount, 0) AS TEXT) AS exposureAmount,
            CAST(COALESCE(e.overdue_amount, 0) AS TEXT) AS overdueAmount,
            COALESCE(e.currency, '') AS currency,
            COALESCE(e.risk_status, '') AS riskStatus,
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_provider_exposure_snapshot e
        WHERE e.tenant_id = ?1
          AND e.organization_id = ?2
          AND (?4 IS NULL OR {status_label} = ?4)
          AND TRIM(COALESCE(e.risk_status, '')) != ''
          AND lower(TRIM(COALESCE(e.risk_status, ''))) NOT IN ('healthy', 'normal', 'ok', 'none', 'low')
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR e.service_provider_id IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST(e.service_provider_id AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST(e.service_provider_id AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST(e.service_provider_id AS TEXT) = ?9)
          AND (?10 IS NULL OR EXISTS (
                SELECT 1 FROM integration_service_provider_edge edge_filter
                WHERE edge_filter.tenant_id = e.tenant_id
                  AND edge_filter.organization_id = e.organization_id
                  AND edge_filter.deleted_at IS NULL
                  AND CAST(edge_filter.id AS TEXT) = ?10
                  AND (edge_filter.seller_provider_id = e.service_provider_id
                       OR edge_filter.buyer_provider_id = e.service_provider_id)
          ))
        ORDER BY e.id DESC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        status_label = status_label_sql("e.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("serviceProviderId"),
            Field::String("balanceAmount"),
            Field::String("frozenAmount"),
            Field::String("creditLimitAmount"),
            Field::String("usedCreditAmount"),
            Field::String("exposureAmount"),
            Field::String("overdueAmount"),
            Field::String("currency"),
            Field::String("riskStatus"),
            Field::String("status"),
        ],
    )
}

async fn list_audit_events(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
) -> DomainResult<AdminServiceProviderCollection> {
    let rows = sqlx::query(&format!(
        r#"
        {scope_cte}
        SELECT
            CAST(a.id AS TEXT) AS id,
            COALESCE(a.action, '') AS action,
            CAST(COALESCE(a.operator_id, 0) AS TEXT) AS operatorId,
            CAST(COALESCE(a.target_type, 0) AS TEXT) AS targetType,
            CAST(COALESCE(a.target_id, 0) AS TEXT) AS targetId,
            COALESCE(a.request_id, '') AS requestId,
            CAST(a.created_at AS TEXT) AS createdAt,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM ops_audit_log a
        WHERE a.tenant_id = ?1
          AND a.organization_id = ?2
          AND COALESCE(a.action, '') LIKE 'service_provider.%'
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR (a.target_type = ?4 AND a.target_id IN (SELECT provider_id FROM visible_provider))
               OR (a.target_type = ?5 AND a.target_id IN (
                    SELECT e.id FROM integration_service_provider_edge e
                    WHERE e.tenant_id = ?1
                      AND e.organization_id = ?2
                      AND e.deleted_at IS NULL
                      AND (e.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                           OR e.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
               ))
               OR (a.target_type = ?6 AND a.target_id IN (
                    SELECT c.id FROM integration_service_provider_contract c
                    WHERE c.tenant_id = ?1
                      AND c.organization_id = ?2
                      AND c.deleted_at IS NULL
                      AND (c.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                           OR c.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
               ))
               OR (a.target_type = ?7 AND a.target_id IN (
                    SELECT r.id FROM integration_service_provider_price_rule r
                    WHERE r.tenant_id = ?1
                      AND r.organization_id = ?2
                      AND r.deleted_at IS NULL
                      AND (r.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                           OR r.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
               ))
               OR (a.target_type = ?8 AND a.target_id IN (
                    SELECT s.id FROM integration_provider_statement s
                    WHERE s.tenant_id = ?1
                      AND s.organization_id = ?2
                      AND (s.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                           OR s.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
               ))
               OR (a.target_type = ?9 AND a.target_id IN (
                    SELECT adj.id FROM integration_provider_adjustment adj
                    WHERE adj.tenant_id = ?1
                      AND adj.organization_id = ?2
                      AND (adj.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                           OR adj.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
               ))
               OR (a.target_type = ?10 AND a.target_id IN (
                    SELECT rr.id FROM integration_provider_reconciliation_run rr
                    WHERE rr.tenant_id = ?1
                      AND rr.organization_id = ?2
                      AND ((rr.scope_type IN ('service_provider', 'provider')
                            AND CAST(rr.scope_id AS INTEGER) IN (SELECT provider_id FROM visible_provider))
                           OR (rr.scope_type IN ('service_provider_edge', 'edge')
                               AND EXISTS (
                                    SELECT 1 FROM integration_service_provider_edge edge_scope
                                    WHERE edge_scope.tenant_id = rr.tenant_id
                                      AND edge_scope.organization_id = rr.organization_id
                                      AND edge_scope.deleted_at IS NULL
                                      AND CAST(edge_scope.id AS TEXT) = rr.scope_id
                                      AND (edge_scope.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                                           OR edge_scope.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
                               ))
                           OR EXISTS (
                                SELECT 1
                                FROM integration_provider_reconciliation_item item_scope
                                JOIN ai_usage_service_provider_edge usage_scope
                                  ON usage_scope.tenant_id = item_scope.tenant_id
                                 AND usage_scope.organization_id = item_scope.organization_id
                                 AND usage_scope.id = item_scope.usage_edge_id
                                WHERE item_scope.tenant_id = rr.tenant_id
                                  AND item_scope.organization_id = rr.organization_id
                                  AND item_scope.run_id = rr.id
                                  AND (usage_scope.seller_provider_id IN (SELECT provider_id FROM visible_provider)
                                       OR usage_scope.buyer_provider_id IN (SELECT provider_id FROM visible_provider))
                           ))
               )))
          AND (?13 IS NULL
               OR (a.target_type = ?4 AND CAST(a.target_id AS TEXT) = ?13)
               OR (a.target_type = ?5 AND a.target_id IN (
                    SELECT e.id FROM integration_service_provider_edge e
                    WHERE e.tenant_id = ?1
                      AND e.organization_id = ?2
                      AND e.deleted_at IS NULL
                      AND (CAST(e.seller_provider_id AS TEXT) = ?13
                           OR CAST(e.buyer_provider_id AS TEXT) = ?13)
               ))
               OR (a.target_type = ?6 AND a.target_id IN (
                    SELECT c.id FROM integration_service_provider_contract c
                    WHERE c.tenant_id = ?1
                      AND c.organization_id = ?2
                      AND c.deleted_at IS NULL
                      AND (CAST(c.seller_provider_id AS TEXT) = ?13
                           OR CAST(c.buyer_provider_id AS TEXT) = ?13)
               ))
               OR (a.target_type = ?7 AND a.target_id IN (
                    SELECT r.id FROM integration_service_provider_price_rule r
                    WHERE r.tenant_id = ?1
                      AND r.organization_id = ?2
                      AND r.deleted_at IS NULL
                      AND (CAST(r.seller_provider_id AS TEXT) = ?13
                           OR CAST(r.buyer_provider_id AS TEXT) = ?13)
               ))
               OR (a.target_type = ?8 AND a.target_id IN (
                    SELECT s.id FROM integration_provider_statement s
                    WHERE s.tenant_id = ?1
                      AND s.organization_id = ?2
                      AND (CAST(s.seller_provider_id AS TEXT) = ?13
                           OR CAST(s.buyer_provider_id AS TEXT) = ?13)
               ))
               OR (a.target_type = ?9 AND a.target_id IN (
                    SELECT adj.id FROM integration_provider_adjustment adj
                    WHERE adj.tenant_id = ?1
                      AND adj.organization_id = ?2
                      AND (CAST(adj.seller_provider_id AS TEXT) = ?13
                           OR CAST(adj.buyer_provider_id AS TEXT) = ?13)
               ))
               OR (a.target_type = ?10 AND a.target_id IN (
                    SELECT rr.id FROM integration_provider_reconciliation_run rr
                    WHERE rr.tenant_id = ?1
                      AND rr.organization_id = ?2
                      AND ((rr.scope_type IN ('service_provider', 'provider') AND rr.scope_id = ?13)
                           OR (rr.scope_type IN ('service_provider_edge', 'edge') AND EXISTS (
                                SELECT 1 FROM integration_service_provider_edge edge_filter
                                WHERE edge_filter.tenant_id = rr.tenant_id
                                  AND edge_filter.organization_id = rr.organization_id
                                  AND edge_filter.deleted_at IS NULL
                                  AND CAST(edge_filter.id AS TEXT) = rr.scope_id
                                  AND (CAST(edge_filter.seller_provider_id AS TEXT) = ?13
                                       OR CAST(edge_filter.buyer_provider_id AS TEXT) = ?13)
                           ))
                           OR EXISTS (
                                SELECT 1
                                FROM integration_provider_reconciliation_item item_filter
                                JOIN ai_usage_service_provider_edge usage_filter
                                  ON usage_filter.tenant_id = item_filter.tenant_id
                                 AND usage_filter.organization_id = item_filter.organization_id
                                 AND usage_filter.id = item_filter.usage_edge_id
                                WHERE item_filter.tenant_id = rr.tenant_id
                                  AND item_filter.organization_id = rr.organization_id
                                  AND item_filter.run_id = rr.id
                                  AND (CAST(usage_filter.seller_provider_id AS TEXT) = ?13
                                       OR CAST(usage_filter.buyer_provider_id AS TEXT) = ?13)
                           ))
               )))
          AND (?14 IS NULL
               OR (a.target_type = ?4 AND CAST(a.target_id AS TEXT) = ?14)
               OR (a.target_type = ?5 AND a.target_id IN (
                    SELECT e.id FROM integration_service_provider_edge e
                    WHERE e.tenant_id = ?1
                      AND e.organization_id = ?2
                      AND e.deleted_at IS NULL
                      AND CAST(e.seller_provider_id AS TEXT) = ?14
               ))
               OR (a.target_type = ?6 AND a.target_id IN (
                    SELECT c.id FROM integration_service_provider_contract c
                    WHERE c.tenant_id = ?1
                      AND c.organization_id = ?2
                      AND c.deleted_at IS NULL
                      AND CAST(c.seller_provider_id AS TEXT) = ?14
               ))
               OR (a.target_type = ?7 AND a.target_id IN (
                    SELECT r.id FROM integration_service_provider_price_rule r
                    WHERE r.tenant_id = ?1
                      AND r.organization_id = ?2
                      AND r.deleted_at IS NULL
                      AND CAST(r.seller_provider_id AS TEXT) = ?14
               ))
               OR (a.target_type = ?8 AND a.target_id IN (
                    SELECT s.id FROM integration_provider_statement s
                    WHERE s.tenant_id = ?1
                      AND s.organization_id = ?2
                      AND CAST(s.seller_provider_id AS TEXT) = ?14
               ))
               OR (a.target_type = ?9 AND a.target_id IN (
                    SELECT adj.id FROM integration_provider_adjustment adj
                    WHERE adj.tenant_id = ?1
                      AND adj.organization_id = ?2
                      AND CAST(adj.seller_provider_id AS TEXT) = ?14
               ))
               OR (a.target_type = ?10 AND a.target_id IN (
                    SELECT rr.id FROM integration_provider_reconciliation_run rr
                    WHERE rr.tenant_id = ?1
                      AND rr.organization_id = ?2
                      AND ((rr.scope_type IN ('service_provider', 'provider') AND rr.scope_id = ?14)
                           OR (rr.scope_type IN ('service_provider_edge', 'edge') AND EXISTS (
                                SELECT 1 FROM integration_service_provider_edge edge_filter
                                WHERE edge_filter.tenant_id = rr.tenant_id
                                  AND edge_filter.organization_id = rr.organization_id
                                  AND edge_filter.deleted_at IS NULL
                                  AND CAST(edge_filter.id AS TEXT) = rr.scope_id
                                  AND CAST(edge_filter.seller_provider_id AS TEXT) = ?14
                           ))
                           OR EXISTS (
                                SELECT 1
                                FROM integration_provider_reconciliation_item item_filter
                                JOIN ai_usage_service_provider_edge usage_filter
                                  ON usage_filter.tenant_id = item_filter.tenant_id
                                 AND usage_filter.organization_id = item_filter.organization_id
                                 AND usage_filter.id = item_filter.usage_edge_id
                                WHERE item_filter.tenant_id = rr.tenant_id
                                  AND item_filter.organization_id = rr.organization_id
                                  AND item_filter.run_id = rr.id
                                  AND CAST(usage_filter.seller_provider_id AS TEXT) = ?14
                           ))
               )))
          AND (?15 IS NULL
               OR (a.target_type = ?4 AND CAST(a.target_id AS TEXT) = ?15)
               OR (a.target_type = ?5 AND a.target_id IN (
                    SELECT e.id FROM integration_service_provider_edge e
                    WHERE e.tenant_id = ?1
                      AND e.organization_id = ?2
                      AND e.deleted_at IS NULL
                      AND CAST(e.buyer_provider_id AS TEXT) = ?15
               ))
               OR (a.target_type = ?6 AND a.target_id IN (
                    SELECT c.id FROM integration_service_provider_contract c
                    WHERE c.tenant_id = ?1
                      AND c.organization_id = ?2
                      AND c.deleted_at IS NULL
                      AND CAST(c.buyer_provider_id AS TEXT) = ?15
               ))
               OR (a.target_type = ?7 AND a.target_id IN (
                    SELECT r.id FROM integration_service_provider_price_rule r
                    WHERE r.tenant_id = ?1
                      AND r.organization_id = ?2
                      AND r.deleted_at IS NULL
                      AND CAST(r.buyer_provider_id AS TEXT) = ?15
               ))
               OR (a.target_type = ?8 AND a.target_id IN (
                    SELECT s.id FROM integration_provider_statement s
                    WHERE s.tenant_id = ?1
                      AND s.organization_id = ?2
                      AND CAST(s.buyer_provider_id AS TEXT) = ?15
               ))
               OR (a.target_type = ?9 AND a.target_id IN (
                    SELECT adj.id FROM integration_provider_adjustment adj
                    WHERE adj.tenant_id = ?1
                      AND adj.organization_id = ?2
                      AND CAST(adj.buyer_provider_id AS TEXT) = ?15
               ))
               OR (a.target_type = ?10 AND a.target_id IN (
                    SELECT rr.id FROM integration_provider_reconciliation_run rr
                    WHERE rr.tenant_id = ?1
                      AND rr.organization_id = ?2
                      AND ((rr.scope_type IN ('service_provider', 'provider') AND rr.scope_id = ?15)
                           OR (rr.scope_type IN ('service_provider_edge', 'edge') AND EXISTS (
                                SELECT 1 FROM integration_service_provider_edge edge_filter
                                WHERE edge_filter.tenant_id = rr.tenant_id
                                  AND edge_filter.organization_id = rr.organization_id
                                  AND edge_filter.deleted_at IS NULL
                                  AND CAST(edge_filter.id AS TEXT) = rr.scope_id
                                  AND CAST(edge_filter.buyer_provider_id AS TEXT) = ?15
                           ))
                           OR EXISTS (
                                SELECT 1
                                FROM integration_provider_reconciliation_item item_filter
                                JOIN ai_usage_service_provider_edge usage_filter
                                  ON usage_filter.tenant_id = item_filter.tenant_id
                                 AND usage_filter.organization_id = item_filter.organization_id
                                 AND usage_filter.id = item_filter.usage_edge_id
                                WHERE item_filter.tenant_id = rr.tenant_id
                                  AND item_filter.organization_id = rr.organization_id
                                  AND item_filter.run_id = rr.id
                                  AND CAST(usage_filter.buyer_provider_id AS TEXT) = ?15
                           ))
               )))
          AND (?16 IS NULL
               OR (a.target_type = ?5 AND CAST(a.target_id AS TEXT) = ?16)
               OR (a.target_type = ?6 AND a.target_id IN (
                    SELECT c.id FROM integration_service_provider_contract c
                    WHERE c.tenant_id = ?1
                      AND c.organization_id = ?2
                      AND c.deleted_at IS NULL
                      AND CAST(c.edge_id AS TEXT) = ?16
               ))
               OR (a.target_type = ?7 AND a.target_id IN (
                    SELECT r.id FROM integration_service_provider_price_rule r
                    WHERE r.tenant_id = ?1
                      AND r.organization_id = ?2
                      AND r.deleted_at IS NULL
                      AND CAST(r.edge_id AS TEXT) = ?16
               ))
               OR (a.target_type = ?8 AND a.target_id IN (
                    SELECT s.id FROM integration_provider_statement s
                    WHERE s.tenant_id = ?1
                      AND s.organization_id = ?2
                      AND EXISTS (
                            SELECT 1 FROM integration_service_provider_edge edge_filter
                            WHERE edge_filter.tenant_id = s.tenant_id
                              AND edge_filter.organization_id = s.organization_id
                              AND edge_filter.deleted_at IS NULL
                              AND CAST(edge_filter.id AS TEXT) = ?16
                              AND edge_filter.seller_provider_id = s.seller_provider_id
                              AND edge_filter.buyer_provider_id = s.buyer_provider_id
                      )
               ))
               OR (a.target_type = ?9 AND a.target_id IN (
                    SELECT adj.id FROM integration_provider_adjustment adj
                    WHERE adj.tenant_id = ?1
                      AND adj.organization_id = ?2
                      AND (EXISTS (
                            SELECT 1 FROM ai_usage_service_provider_edge edge_usage_filter
                            WHERE edge_usage_filter.tenant_id = adj.tenant_id
                              AND edge_usage_filter.organization_id = adj.organization_id
                              AND edge_usage_filter.id = adj.usage_edge_id
                              AND CAST(edge_usage_filter.edge_id AS TEXT) = ?16
                       ) OR EXISTS (
                            SELECT 1 FROM integration_service_provider_edge edge_filter
                            WHERE edge_filter.tenant_id = adj.tenant_id
                              AND edge_filter.organization_id = adj.organization_id
                              AND edge_filter.deleted_at IS NULL
                              AND CAST(edge_filter.id AS TEXT) = ?16
                              AND edge_filter.seller_provider_id = adj.seller_provider_id
                              AND edge_filter.buyer_provider_id = adj.buyer_provider_id
                       ))
               ))
               OR (a.target_type = ?10 AND a.target_id IN (
                    SELECT rr.id FROM integration_provider_reconciliation_run rr
                    WHERE rr.tenant_id = ?1
                      AND rr.organization_id = ?2
                      AND ((rr.scope_type IN ('service_provider_edge', 'edge') AND rr.scope_id = ?16)
                           OR EXISTS (
                                SELECT 1
                                FROM integration_provider_reconciliation_item item_filter
                                JOIN ai_usage_service_provider_edge usage_filter
                                  ON usage_filter.tenant_id = item_filter.tenant_id
                                 AND usage_filter.organization_id = item_filter.organization_id
                                 AND usage_filter.id = item_filter.usage_edge_id
                                WHERE item_filter.tenant_id = rr.tenant_id
                                  AND item_filter.organization_id = rr.organization_id
                                  AND item_filter.run_id = rr.id
                                  AND CAST(usage_filter.edge_id AS TEXT) = ?16
                           ))
               )))
        ORDER BY a.id DESC
        LIMIT ?11 OFFSET ?12
        "#,
        scope_cte = scope_cte()
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.operator_id)
    .bind(SERVICE_PROVIDER_AUDIT_TARGET_PROVIDER)
    .bind(SERVICE_PROVIDER_AUDIT_TARGET_EDGE)
    .bind(SERVICE_PROVIDER_AUDIT_TARGET_CONTRACT)
    .bind(SERVICE_PROVIDER_AUDIT_TARGET_PRICE_RULE)
    .bind(SERVICE_PROVIDER_AUDIT_TARGET_STATEMENT)
    .bind(SERVICE_PROVIDER_AUDIT_TARGET_ADJUSTMENT)
    .bind(SERVICE_PROVIDER_AUDIT_TARGET_RECONCILIATION_RUN)
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.provider_id.as_deref())
    .bind(query.seller_provider_id.as_deref())
    .bind(query.buyer_provider_id.as_deref())
    .bind(query.edge_id.as_deref())
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(
        rows,
        query,
        &[
            Field::String("id"),
            Field::String("action"),
            Field::String("operatorId"),
            Field::String("targetType"),
            Field::String("targetId"),
            Field::String("requestId"),
            Field::String("createdAt"),
        ],
    )
}

async fn list_simple_provider_scoped(
    pool: &SqlitePool,
    query: ListAdminServiceProviderRecordsQuery,
    table: &str,
    alias: &str,
    select_fields: &[&str],
    provider_column: &str,
    fields: &[Field],
) -> DomainResult<AdminServiceProviderCollection> {
    let status_label = status_label_sql(&format!("{alias}.status"));
    let sql = format!(
        r#"
        {scope_cte}
        SELECT
            {select_fields},
            {status_label} AS status,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM {table} {alias}
        WHERE {alias}.tenant_id = ?1
          AND {alias}.organization_id = ?2
          AND {alias}.deleted_at IS NULL
          AND (?4 IS NULL OR {status_label} = ?4)
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR {provider_column} IN (SELECT provider_id FROM visible_provider))
          AND (?7 IS NULL OR CAST({provider_column} AS TEXT) = ?7)
          AND (?8 IS NULL OR CAST({provider_column} AS TEXT) = ?8)
          AND (?9 IS NULL OR CAST({provider_column} AS TEXT) = ?9)
          AND (?10 IS NULL OR EXISTS (
                SELECT 1 FROM integration_service_provider_edge edge_filter
                WHERE edge_filter.tenant_id = {alias}.tenant_id
                  AND edge_filter.organization_id = {alias}.organization_id
                  AND edge_filter.deleted_at IS NULL
                  AND CAST(edge_filter.id AS TEXT) = ?10
                  AND (edge_filter.seller_provider_id = {provider_column}
                       OR edge_filter.buyer_provider_id = {provider_column})
          ))
        ORDER BY {alias}.id ASC
        LIMIT ?5 OFFSET ?6
        "#,
        scope_cte = scope_cte(),
        select_fields = select_fields.join(",\n            "),
    );
    let rows = sqlx::query(&sql)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.subject.operator_id)
        .bind(query.status.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .bind(query.provider_id.as_deref())
        .bind(query.seller_provider_id.as_deref())
        .bind(query.buyer_provider_id.as_deref())
        .bind(query.edge_id.as_deref())
        .fetch_all(pool)
        .await
        .map_err(store_error)?;
    collection_from_rows(rows, query, fields)
}

async fn load_downstream_by_audit(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    action: &str,
    request_id: &str,
) -> DomainResult<Option<AdminServiceProviderDownstreamMutationItem>> {
    let provider_id = audit_target_id(
        tx,
        subject,
        action,
        SERVICE_PROVIDER_AUDIT_TARGET_PROVIDER,
        request_id,
    )
    .await?;
    match provider_id {
        Some(provider_id) => {
            ensure_visible_provider(tx, subject, provider_id).await?;
            load_downstream_by_provider_id_optional(tx, subject, provider_id).await
        }
        None => Ok(None),
    }
}

async fn load_downstream_by_provider_id(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    provider_id: i64,
) -> DomainResult<AdminServiceProviderDownstreamMutationItem> {
    load_downstream_by_provider_id_optional(tx, subject, provider_id)
        .await?
        .ok_or_else(|| DomainError::not_found("service provider downstream was not found"))
}

async fn load_downstream_by_provider_id_optional(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    provider_id: i64,
) -> DomainResult<Option<AdminServiceProviderDownstreamMutationItem>> {
    let row = sqlx::query(&format!(
        r#"
        SELECT
            CAST(p.id AS TEXT) AS id,
            p.provider_no AS providerNo,
            p.display_name AS displayName,
            COALESCE(p.provider_type, '') AS providerType,
            {provider_status} AS status,
            CAST(e.seller_provider_id AS TEXT) AS sellerProviderId,
            CAST(e.id AS TEXT) AS edgeId,
            CAST(pp.id AS TEXT) AS pricePlanId,
            COALESCE(p.default_currency, '') AS defaultCurrency,
            COALESCE(e.settlement_mode, '') AS settlementMode
        FROM integration_service_provider p
        JOIN integration_service_provider_edge e
          ON e.tenant_id = p.tenant_id
         AND e.organization_id = p.organization_id
         AND e.buyer_provider_id = p.id
         AND e.deleted_at IS NULL
        LEFT JOIN integration_service_provider_price_plan pp
          ON pp.tenant_id = e.tenant_id
         AND pp.organization_id = e.organization_id
         AND pp.edge_id = e.id
         AND pp.deleted_at IS NULL
        WHERE p.tenant_id = ?1
          AND p.organization_id = ?2
          AND p.id = ?3
          AND p.deleted_at IS NULL
        ORDER BY pp.id ASC
        LIMIT 1
        "#,
        provider_status = status_label_sql("p.status")
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(provider_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(store_error)?;

    row.map(|row| {
        Ok(AdminServiceProviderDownstreamMutationItem {
            id: string_cell(&row, "id")?,
            provider_no: string_cell(&row, "providerNo")?,
            display_name: string_cell(&row, "displayName")?,
            provider_type: optional_cell(&row, "providerType")?,
            status: string_cell(&row, "status")?,
            seller_provider_id: string_cell(&row, "sellerProviderId")?,
            edge_id: string_cell(&row, "edgeId")?,
            price_plan_id: optional_cell(&row, "pricePlanId")?,
            default_currency: optional_cell(&row, "defaultCurrency")?,
            settlement_mode: optional_cell(&row, "settlementMode")?,
        })
    })
    .transpose()
}

async fn load_pricing_rule_by_audit(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    action: &str,
    request_id: &str,
) -> DomainResult<Option<AdminServiceProviderPricingRuleMutationItem>> {
    let rule_id = audit_target_id(
        tx,
        subject,
        action,
        SERVICE_PROVIDER_AUDIT_TARGET_PRICE_RULE,
        request_id,
    )
    .await?;
    match rule_id {
        Some(rule_id) => {
            ensure_visible_price_rule(tx, subject, rule_id).await?;
            load_pricing_rule_by_id_optional(tx, subject, rule_id).await
        }
        None => Ok(None),
    }
}

async fn load_pricing_rule_by_id(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    rule_id: i64,
) -> DomainResult<AdminServiceProviderPricingRuleMutationItem> {
    load_pricing_rule_by_id_optional(tx, subject, rule_id)
        .await?
        .ok_or_else(|| DomainError::not_found("service provider price rule was not found"))
}

async fn load_pricing_rule_by_id_optional(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    rule_id: i64,
) -> DomainResult<Option<AdminServiceProviderPricingRuleMutationItem>> {
    let row = sqlx::query(&format!(
        r#"
        SELECT
            CAST(r.id AS TEXT) AS id,
            CAST(COALESCE(r.seller_provider_id, 0) AS TEXT) AS sellerProviderId,
            CAST(COALESCE(r.buyer_provider_id, 0) AS TEXT) AS buyerProviderId,
            CAST(r.edge_id AS TEXT) AS edgeId,
            CAST(r.price_plan_id AS TEXT) AS pricePlanId,
            COALESCE(r.catalog_key, '') AS catalogKey,
            COALESCE(r.model, '') AS model,
            COALESCE(r.billing_meter_code, '') AS billingMeterCode,
            COALESCE(r.token_kind, '') AS tokenKind,
            CAST(COALESCE(r.unit_price, 0) AS TEXT) AS unitPrice,
            CAST(COALESCE(r.unit_size, 1) AS TEXT) AS unitSize,
            CAST(COALESCE(r.minimum_charge, 0) AS TEXT) AS minimumCharge,
            COALESCE(p.currency, '') AS currency,
            CAST(COALESCE(r.priority, 0) AS INTEGER) AS priority,
            {rule_status} AS status
        FROM integration_service_provider_price_rule r
        LEFT JOIN integration_service_provider_price_plan p
          ON p.tenant_id = r.tenant_id
         AND p.organization_id = r.organization_id
         AND p.id = r.price_plan_id
         AND p.deleted_at IS NULL
        WHERE r.tenant_id = ?1
          AND r.organization_id = ?2
          AND r.id = ?3
          AND r.deleted_at IS NULL
        LIMIT 1
        "#,
        rule_status = status_label_sql("r.status")
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(rule_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(store_error)?;

    row.map(|row| {
        Ok(AdminServiceProviderPricingRuleMutationItem {
            id: string_cell(&row, "id")?,
            seller_provider_id: string_cell(&row, "sellerProviderId")?,
            buyer_provider_id: string_cell(&row, "buyerProviderId")?,
            edge_id: string_cell(&row, "edgeId")?,
            price_plan_id: string_cell(&row, "pricePlanId")?,
            catalog_key: optional_cell(&row, "catalogKey")?,
            model: optional_cell(&row, "model")?,
            billing_meter_code: string_cell(&row, "billingMeterCode")?,
            token_kind: optional_cell(&row, "tokenKind")?,
            unit_price: string_cell(&row, "unitPrice")?,
            unit_size: string_cell(&row, "unitSize")?,
            minimum_charge: string_cell(&row, "minimumCharge")?,
            currency: optional_cell(&row, "currency")?,
            priority: integer_cell(&row, "priority")? as i32,
            status: string_cell(&row, "status")?,
        })
    })
    .transpose()
}

async fn audit_target_id(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    action: &str,
    target_type: i32,
    request_id: &str,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT target_id
        FROM ops_audit_log
        WHERE tenant_id = ?
          AND organization_id = ?
          AND action = ?
          AND target_type = ?
          AND request_id = ?
        ORDER BY id DESC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(action)
    .bind(target_type)
    .bind(request_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(store_error)
}

async fn ensure_visible_provider(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    provider_id: i64,
) -> DomainResult<()> {
    let count: i64 = sqlx::query_scalar(&format!(
        r#"
        {scope_cte}
        SELECT COUNT(1)
        FROM integration_service_provider p
        WHERE p.tenant_id = ?1
          AND p.organization_id = ?2
          AND p.id = ?4
          AND p.deleted_at IS NULL
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR p.id IN (SELECT provider_id FROM visible_provider))
        "#,
        scope_cte = scope_cte()
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.operator_id)
    .bind(provider_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(store_error)?;
    if count == 0 {
        return Err(DomainError::not_found(
            "service provider was not found in the visible chain",
        ));
    }
    Ok(())
}

async fn ensure_visible_price_rule(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    rule_id: i64,
) -> DomainResult<()> {
    let count: i64 = sqlx::query_scalar(&format!(
        r#"
        {scope_cte}
        SELECT COUNT(1)
        FROM integration_service_provider_price_rule r
        WHERE r.tenant_id = ?1
          AND r.organization_id = ?2
          AND r.id = ?4
          AND r.deleted_at IS NULL
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR r.seller_provider_id IN (SELECT provider_id FROM visible_provider))
        "#,
        scope_cte = scope_cte()
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.operator_id)
    .bind(rule_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(store_error)?;
    if count == 0 {
        return Err(DomainError::not_found(
            "service provider price rule was not found in the writable chain",
        ));
    }
    Ok(())
}

async fn ensure_provider_no_available(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    provider_no: &str,
) -> DomainResult<()> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM integration_service_provider
        WHERE tenant_id = ?
          AND organization_id = ?
          AND provider_no = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(provider_no)
    .fetch_one(&mut **tx)
    .await
    .map_err(store_error)?;
    if count > 0 {
        return Err(DomainError::conflict(
            "service provider number already exists",
        ));
    }
    Ok(())
}

async fn insert_downstream_closure_rows(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    seller_provider_id: i64,
    buyer_provider_id: i64,
    edge_id: i64,
) -> DomainResult<()> {
    let ancestors = sqlx::query(
        r#"
        SELECT ancestor_provider_id, depth, COALESCE(path, '') AS path
        FROM integration_service_provider_closure
        WHERE tenant_id = ?
          AND organization_id = ?
          AND descendant_provider_id = ?
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY depth ASC
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(seller_provider_id)
    .fetch_all(&mut **tx)
    .await
    .map_err(store_error)?;

    let mut has_seller_self = false;
    for row in ancestors {
        let ancestor_provider_id = integer_cell(&row, "ancestor_provider_id")?;
        if ancestor_provider_id == seller_provider_id {
            has_seller_self = true;
        }
        let depth = integer_cell(&row, "depth")? + 1;
        let ancestor_path = string_cell(&row, "path")?;
        let path = if ancestor_path.trim().is_empty() {
            format!("{ancestor_provider_id}/{buyer_provider_id}")
        } else {
            format!("{ancestor_path}/{buyer_provider_id}")
        };
        insert_closure_row(
            tx,
            subject,
            ancestor_provider_id,
            buyer_provider_id,
            depth,
            &path,
            Some(edge_id),
        )
        .await?;
    }

    if !has_seller_self {
        insert_closure_row(
            tx,
            subject,
            seller_provider_id,
            buyer_provider_id,
            1,
            &format!("{seller_provider_id}/{buyer_provider_id}"),
            Some(edge_id),
        )
        .await?;
    }

    insert_closure_row(
        tx,
        subject,
        buyer_provider_id,
        buyer_provider_id,
        0,
        &buyer_provider_id.to_string(),
        None,
    )
    .await
}

async fn insert_closure_row(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    ancestor_provider_id: i64,
    descendant_provider_id: i64,
    depth: i64,
    path: &str,
    direct_edge_id: Option<i64>,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_closure
            (uuid, tenant_id, organization_id, status, ancestor_provider_id, descendant_provider_id, depth, path, direct_edge_id, id)
        VALUES
            (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(stable_uuid(
        "sp-closure",
        &[
            &subject.tenant_id.to_string(),
            &subject.organization_id.to_string(),
            &ancestor_provider_id.to_string(),
            &descendant_provider_id.to_string(),
            &depth.to_string(),
        ],
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(ancestor_provider_id)
    .bind(descendant_provider_id)
    .bind(depth)
    .bind(path)
    .bind(direct_edge_id)
    .bind(next_claw_runtime_id(
        "integration_service_provider_closure",
    )?)
    .execute(&mut **tx)
    .await
    .map_err(|error| write_error("failed to create service provider closure row", error))?;
    Ok(())
}

async fn create_default_price_plan_for_downstream(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminServiceProviderDownstreamCommand,
    seller_provider_id: i64,
    buyer_provider_id: i64,
    edge_id: i64,
) -> DomainResult<Option<i64>> {
    let plan_code = command
        .price_plan_code
        .clone()
        .unwrap_or_else(|| format!("default-{edge_id}"));
    let plan_id = next_claw_runtime_id("integration_service_provider_price_plan")?;
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_price_plan
            (uuid, tenant_id, organization_id, status, seller_provider_id, buyer_provider_id, edge_id, plan_code, plan_name, base_amount_source, pricing_mode, default_multiplier, default_markup_amount, currency, id)
        VALUES
            (?, ?, ?, 1, ?, ?, ?, ?, ?, 'upstream_cost', 'multiplier', ?, '0', ?, ?)
        "#,
    )
    .bind(stable_uuid(
        "sp-price-plan",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &edge_id.to_string(),
            &plan_code,
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(seller_provider_id)
    .bind(buyer_provider_id)
    .bind(edge_id)
    .bind(&plan_code)
    .bind(format!("Default plan for {}", command.provider_no))
    .bind(command.default_multiplier.as_deref().unwrap_or("1"))
    .bind(command.default_currency.as_deref().unwrap_or("USD"))
    .bind(plan_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| write_error("failed to create service provider price plan", error))?;
    Ok(Some(plan_id))
}

async fn resolve_pricing_edge_id(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    seller_provider_id: i64,
    buyer_provider_id: i64,
    edge_id: Option<&str>,
    price_plan_id: Option<&str>,
) -> DomainResult<i64> {
    let edge_id = match edge_id {
        Some(edge_id) => parse_required_id(edge_id, "edgeId")?,
        None => {
            let price_plan_id = price_plan_id
                .ok_or_else(|| {
                    DomainError::not_found("service provider pricing edge was not found")
                })
                .and_then(|value| parse_required_id(value, "pricePlanId"))?;
            sqlx::query_scalar(
                r#"
                SELECT edge_id
                FROM integration_service_provider_price_plan
                WHERE tenant_id = ?
                  AND organization_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(price_plan_id)
            .fetch_optional(&mut **tx)
            .await
            .map_err(store_error)?
            .ok_or_else(|| DomainError::not_found("service provider price plan was not found"))?
        }
    };

    let count: i64 = sqlx::query_scalar(&format!(
        r#"
        {scope_cte}
        SELECT COUNT(1)
        FROM integration_service_provider_edge e
        WHERE e.tenant_id = ?1
          AND e.organization_id = ?2
          AND e.id = ?4
          AND e.seller_provider_id = ?5
          AND e.buyer_provider_id = ?6
          AND e.deleted_at IS NULL
          AND (NOT EXISTS (SELECT 1 FROM member_scope)
               OR e.seller_provider_id IN (SELECT provider_id FROM visible_provider))
        "#,
        scope_cte = scope_cte()
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.operator_id)
    .bind(edge_id)
    .bind(seller_provider_id)
    .bind(buyer_provider_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(store_error)?;
    if count == 0 {
        return Err(DomainError::not_found(
            "service provider pricing edge was not found in the writable chain",
        ));
    }
    Ok(edge_id)
}

async fn resolve_or_create_price_plan(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    seller_provider_id: i64,
    buyer_provider_id: i64,
    edge_id: i64,
    price_plan_id: Option<&str>,
    currency: Option<&str>,
    idempotency_key: &str,
) -> DomainResult<i64> {
    if let Some(price_plan_id) = price_plan_id {
        let price_plan_id = parse_required_id(price_plan_id, "pricePlanId")?;
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(1)
            FROM integration_service_provider_price_plan
            WHERE tenant_id = ?
              AND organization_id = ?
              AND id = ?
              AND edge_id = ?
              AND seller_provider_id = ?
              AND buyer_provider_id = ?
              AND deleted_at IS NULL
            "#,
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(price_plan_id)
        .bind(edge_id)
        .bind(seller_provider_id)
        .bind(buyer_provider_id)
        .fetch_one(&mut **tx)
        .await
        .map_err(store_error)?;
        if count == 0 {
            return Err(DomainError::not_found(
                "service provider price plan was not found for the selected edge",
            ));
        }
        return Ok(price_plan_id);
    }

    if let Some(existing_id) = sqlx::query_scalar(
        r#"
        SELECT id
        FROM integration_service_provider_price_plan
        WHERE tenant_id = ?
          AND organization_id = ?
          AND edge_id = ?
          AND deleted_at IS NULL
        ORDER BY id ASC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(edge_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(store_error)?
    {
        return Ok(existing_id);
    }

    let plan_code = format!("default-{edge_id}");
    let plan_id = next_claw_runtime_id("integration_service_provider_price_plan")?;
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_price_plan
            (uuid, tenant_id, organization_id, status, seller_provider_id, buyer_provider_id, edge_id, plan_code, plan_name, base_amount_source, pricing_mode, default_multiplier, default_markup_amount, currency, id)
        VALUES
            (?, ?, ?, 1, ?, ?, ?, ?, ?, 'upstream_cost', 'specific_rule', '1', '0', ?, ?)
        "#,
    )
    .bind(stable_uuid(
        "sp-price-plan",
        &[
            &subject.tenant_id.to_string(),
            &subject.organization_id.to_string(),
            &edge_id.to_string(),
            idempotency_key,
        ],
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(seller_provider_id)
    .bind(buyer_provider_id)
    .bind(edge_id)
    .bind(&plan_code)
    .bind(format!("Default plan for edge {edge_id}"))
    .bind(currency.unwrap_or("USD"))
    .bind(plan_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| write_error("failed to create service provider price plan", error))?;
    Ok(plan_id)
}

async fn ensure_price_rule_billable_point_available(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    edge_id: i64,
    catalog_key: Option<&str>,
    model: Option<&str>,
    billing_meter_code: &str,
    token_kind: Option<&str>,
) -> DomainResult<()> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM integration_service_provider_price_rule r
        WHERE r.tenant_id = ?
          AND r.organization_id = ?
          AND r.edge_id = ?
          AND ((? IS NULL AND r.catalog_key IS NULL) OR r.catalog_key = ?)
          AND ((? IS NULL AND r.model IS NULL) OR r.model = ?)
          AND r.billing_meter_code = ?
          AND ((? IS NULL AND r.token_kind IS NULL) OR r.token_kind = ?)
          AND r.status = 1
          AND r.deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(edge_id)
    .bind(catalog_key)
    .bind(catalog_key)
    .bind(model)
    .bind(model)
    .bind(billing_meter_code)
    .bind(token_kind)
    .bind(token_kind)
    .fetch_one(&mut **tx)
    .await
    .map_err(store_error)?;
    if count > 0 {
        return Err(DomainError::conflict(
            "active service provider price rule already exists for this billable point",
        ));
    }
    Ok(())
}

async fn insert_audit_if_absent(
    tx: &mut Transaction<'_, Sqlite>,
    subject: crate::ports::AdminServiceProviderSubject,
    idempotency_key: &str,
    request_id: Option<&str>,
    action: &str,
    target_type: i32,
    target_id: i64,
    target_uuid: Option<&str>,
) -> DomainResult<()> {
    let audit_request_id = audit_request_id(request_id, idempotency_key);
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, request_id, operator_id, operator_type, action, target_type, target_id, target_uuid, created_at, id)
        SELECT
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?
        WHERE NOT EXISTS (
            SELECT 1
            FROM ops_audit_log
            WHERE tenant_id = ?
              AND organization_id = ?
              AND action = ?
              AND request_id = ?
        )
        "#,
    )
    .bind(stable_uuid(
        "sp-audit",
        &[
            &subject.tenant_id.to_string(),
            &subject.organization_id.to_string(),
            action,
            &audit_request_id,
        ],
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(&audit_request_id)
    .bind(subject.operator_id)
    .bind(subject.operator_type)
    .bind(action)
    .bind(target_type)
    .bind(target_id)
    .bind(target_uuid)
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(action)
    .bind(&audit_request_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| write_error("failed to write service provider audit log", error))?;
    Ok(())
}

fn audit_request_id(request_id: Option<&str>, idempotency_key: &str) -> String {
    request_id.unwrap_or(idempotency_key).to_owned()
}

fn parse_required_id(value: &str, field_name: &str) -> DomainResult<i64> {
    let parsed = value.trim().parse::<i64>().map_err(|error| {
        DomainError::new(format!("invalid service provider {field_name}: {error}"))
    })?;
    if parsed <= 0 {
        return Err(DomainError::new(format!(
            "invalid service provider {field_name}: value must be positive"
        )));
    }
    Ok(parsed)
}

fn status_code(status: &str) -> DomainResult<i32> {
    match status {
        "active" => Ok(1),
        "inactive" => Ok(0),
        "suspended" => Ok(2),
        value => Err(DomainError::conflict(format!(
            "unsupported service provider status: {value}"
        ))),
    }
}

fn optional_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<Option<String>> {
    let value = string_cell(row, column)?;
    Ok((!value.trim().is_empty()).then_some(value))
}

fn stable_uuid(prefix: &str, parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    for part in parts {
        hasher.update([0]);
        hasher.update(part.as_bytes());
    }
    let digest = hasher.finalize();
    let mut suffix = String::with_capacity(32);
    for byte in &digest[..16] {
        suffix.push_str(&format!("{byte:02x}"));
    }
    format!("{prefix}-{suffix}")
}

fn scope_cte() -> &'static str {
    r#"
        WITH member_scope AS (
            SELECT service_provider_id
            FROM integration_service_provider_member
            WHERE tenant_id = ?1
              AND organization_id = ?2
              AND member_user_id = ?3
              AND status = 1
              AND deleted_at IS NULL
        ),
        visible_provider AS (
            SELECT service_provider_id AS provider_id FROM member_scope
            UNION
            SELECT c.descendant_provider_id AS provider_id
            FROM integration_service_provider_closure c
            JOIN member_scope m ON m.service_provider_id = c.ancestor_provider_id
            WHERE c.tenant_id = ?1
              AND c.organization_id = ?2
              AND c.status = 1
              AND c.deleted_at IS NULL
        )
    "#
}

#[derive(Clone, Copy)]
enum Field {
    String(&'static str),
    Integer(&'static str),
    DecimalSum {
        output: &'static str,
        values: &'static str,
    },
}

fn collection_from_rows(
    rows: Vec<sqlx::sqlite::SqliteRow>,
    query: ListAdminServiceProviderRecordsQuery,
    fields: &[Field],
) -> DomainResult<AdminServiceProviderCollection> {
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        let mut record = AdminServiceProviderJsonRecord::new();
        for field in fields {
            match *field {
                Field::String(name) => {
                    record.insert(
                        name.to_owned(),
                        serde_json::Value::String(string_cell(&row, name)?),
                    );
                }
                Field::Integer(name) => {
                    record.insert(
                        name.to_owned(),
                        serde_json::Value::from(integer_cell(&row, name)?),
                    );
                }
                Field::DecimalSum { output, values } => {
                    record.insert(
                        output.to_owned(),
                        serde_json::Value::String(decimal_sum_cell(&row, values)?),
                    );
                }
            }
        }
        items.push(record);
    }
    Ok(AdminServiceProviderCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<String> {
    if let Ok(value) = row.try_get::<Option<String>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<String, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.map(|value| value.to_string()).unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value.to_string());
    }
    Err(DomainError::new(format!(
        "service provider row column {column} is not readable as text"
    )))
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<i64> {
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    let value = string_cell(row, column)?;
    if value.trim().is_empty() {
        return Ok(0);
    }
    value.parse::<i64>().map_err(|error| {
        DomainError::new(format!(
            "invalid service provider integer {column}: {error}"
        ))
    })
}

fn decimal_sum_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<String> {
    let values = string_cell(row, column)?;
    let mut total = DecimalValue::ZERO;
    for value in values.split('\x1f') {
        let value = value.trim();
        if value.is_empty() {
            continue;
        }
        total = total.checked_add(service_provider_decimal(value, column)?)?;
    }
    Ok(finance_decimal_string(total))
}

fn finance_decimal_string(value: DecimalValue) -> String {
    let mut text = value.to_fixed_string(12);
    if let Some(dot_index) = text.find('.') {
        while text.len() > dot_index + 3 && text.ends_with('0') {
            text.pop();
        }
    }
    text
}

fn write_error(context: &str, error: sqlx::Error) -> DomainError {
    let message = error.to_string();
    if message.contains("UNIQUE constraint failed") || message.contains("unique constraint") {
        return DomainError::conflict(format!("{context}: record already exists"));
    }
    DomainError::new(format!("{context}: {message}"))
}

fn store_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}
