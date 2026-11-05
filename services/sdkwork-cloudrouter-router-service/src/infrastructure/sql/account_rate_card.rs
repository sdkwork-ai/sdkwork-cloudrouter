use sqlx::{Postgres, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::model_catalog_import::stable_uuid;
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;

const DEFAULT_PRICING_PLAN_CODE: &str = "standard";
/// Rule code and provenance marker of the neutral plan bootstrap. Kept
/// identical to `official_pricing_sync`'s bootstrap so a database bootstrapped
/// by either path converges on the same two rows.
const DEFAULT_PRICING_PLAN_RULE_CODE: &str = "plan-default";
const DEFAULT_PRICING_PLAN_SOURCE_MARKER: &str = r#"{"source":"official_pricing_bootstrap"}"#;

/// Rows the neutral `standard` pricing-plan bootstrap created in this call.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(crate) struct DefaultPricingPlanBootstrap {
    pub plan_created: bool,
    pub rule_created: bool,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct PricingPlanIdentity {
    tenant_id: i64,
    organization_id: i64,
    id: i64,
    plan_code: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct AccountGroupPricingBinding {
    tenant_id: i64,
    organization_id: i64,
    account_group_id: i64,
    pricing_plan_tenant_id: i64,
    pricing_plan_organization_id: i64,
    pricing_plan_id: i64,
    pricing_plan_code: String,
}

pub(crate) async fn ensure_account_group_rate_card(
    transaction: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
    account_group_id: i64,
    pricing_plan_code: &str,
    effective_at: &str,
) -> DomainResult<()> {
    let plan_code = normalized_plan_code(pricing_plan_code);
    let mut plan =
        find_active_pricing_plan(transaction, tenant_id, organization_id, plan_code, effective_at)
            .await?;
    if plan.is_none() && plan_code == DEFAULT_PRICING_PLAN_CODE {
        // A database that has been migrated but never seeded has no `standard`
        // plan at all — an operator can still boot with
        // `SDKWORK_CLOUDROUTER_STARTUP_INSTALL_MODE=skip`, and a deployment
        // upgraded from a release that never ran the product bootstrap starts
        // that way. Without the plan the very first account group (including
        // the default group the console creates behind an API key) could never
        // get a rate card. The neutral plan is what the catalog bootstrap would
        // have written, so create exactly that and retry instead of failing the
        // request.
        ensure_default_pricing_plan(transaction, effective_at).await?;
        plan = find_active_pricing_plan(
            transaction,
            tenant_id,
            organization_id,
            plan_code,
            effective_at,
        )
        .await?;
    }
    let plan = plan.ok_or_else(|| {
        DomainError::new(format!(
            "pricing plan `{plan_code}` is not active for account group {account_group_id}"
        ))
    })?;

    persist_account_group_rate_card(
        transaction,
        AccountGroupPricingBinding {
            tenant_id,
            organization_id,
            account_group_id,
            pricing_plan_tenant_id: plan.tenant_id,
            pricing_plan_organization_id: plan.organization_id,
            pricing_plan_id: plan.id,
            pricing_plan_code: plan.plan_code,
        },
        effective_at,
    )
    .await
}

/// Resolves the active pricing plan an account group in `tenant_id` /
/// `organization_id` must bill against: the tenant's own plan first, then the
/// tenant-wide (`organization_id = 0`) plan, then the global (`0/0`) one.
async fn find_active_pricing_plan(
    transaction: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
    plan_code: &str,
    effective_at: &str,
) -> DomainResult<Option<PricingPlanIdentity>> {
    sqlx::query_as::<_, PricingPlanIdentity>(
        r#"
        SELECT tenant_id, organization_id, id, plan_code
        FROM cloudrouter_pricing_plan
        WHERE status = 1
          AND deleted_at IS NULL
          AND plan_code = $1
          AND ((tenant_id = $2 AND organization_id IN ($3, 0))
               OR (tenant_id = 0 AND organization_id = 0))
          AND effective_from <= $4::timestamptz
          AND (effective_to IS NULL OR effective_to > $4::timestamptz)
        ORDER BY CASE
            WHEN tenant_id = $2 AND organization_id = $3 THEN 3
            WHEN tenant_id = $2 AND organization_id = 0 THEN 2
            ELSE 1
          END DESC,
          effective_from DESC,
          id DESC
        LIMIT 1
        "#,
    )
    .bind(plan_code)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(effective_at)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(|error| store_error("failed to resolve account group pricing plan", error))
}

/// Ensures the neutral global (`tenant_id = 0`, `organization_id = 0`)
/// `standard` plan and its default rule exist, returning which rows this call
/// created.
///
/// This is the same pair of rows the official pricing catalog bootstrap writes
/// (`official_pricing_sync::bootstrap_default_pricing_plans`), extracted so the
/// API-key path can converge a migrated-but-unseeded database instead of
/// failing the operator's request. Idempotent: an existing plan or rule is
/// never modified, and concurrent creators lose the insert to `DO NOTHING` and
/// then read the winner's row.
pub(crate) async fn ensure_default_pricing_plan(
    transaction: &mut Transaction<'_, Postgres>,
    effective_from: &str,
) -> DomainResult<DefaultPricingPlanBootstrap> {
    let mut bootstrap = DefaultPricingPlanBootstrap::default();

    let plan_id = match find_global_default_plan_id(transaction).await? {
        Some(id) => id,
        None => {
            let id = next_cloud_runtime_id("cloudrouter_pricing_plan")?;
            let inserted = sqlx::query(
                r#"
                INSERT INTO cloudrouter_pricing_plan
                    (id, uuid, tenant_id, organization_id, metadata, plan_code,
                     plan_name, base_price_side, currency_code, fallback_policy,
                     rounding_mode, minimum_charge_amount, effective_from, effective_to)
                VALUES ($1, $2, 0, 0, $3::jsonb, $4, $5, $6, $7,
                        'fail_closed', 'half_up', 0, $8::timestamptz, NULL)
                ON CONFLICT (tenant_id, organization_id, plan_code)
                    WHERE deleted_at IS NULL
                DO NOTHING
                "#,
            )
            .bind(id)
            .bind(stable_uuid(
                "cloudrouter-pricing-plan",
                &["0", "0", DEFAULT_PRICING_PLAN_CODE],
            ))
            .bind(DEFAULT_PRICING_PLAN_SOURCE_MARKER)
            .bind(DEFAULT_PRICING_PLAN_CODE)
            .bind("Standard")
            .bind("official_reference")
            .bind("USD")
            .bind(effective_from)
            .execute(&mut **transaction)
            .await
            .map_err(|error| store_error("failed to create the default pricing plan", error))?
            .rows_affected();
            bootstrap.plan_created = inserted > 0;
            if inserted > 0 {
                id
            } else {
                find_global_default_plan_id(transaction).await?.ok_or_else(|| {
                    DomainError::new("default pricing plan could not be created".to_owned())
                })?
            }
        }
    };

    let existing_rule_id = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT id
        FROM cloudrouter_pricing_rule
        WHERE tenant_id = 0 AND organization_id = 0
          AND pricing_plan_id = $1 AND rule_code = $2
          AND deleted_at IS NULL
        "#,
    )
    .bind(plan_id)
    .bind(DEFAULT_PRICING_PLAN_RULE_CODE)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(|error| store_error("failed to load the default pricing rule", error))?;
    if existing_rule_id.is_none() {
        let rule_id = next_cloud_runtime_id("cloudrouter_pricing_rule")?;
        let inserted = sqlx::query(
            r#"
            INSERT INTO cloudrouter_pricing_rule
                (id, uuid, tenant_id, organization_id, metadata, pricing_plan_id,
                 rule_code, formula_mode, multiplier, markup_amount, priority,
                 effective_from, effective_to)
            VALUES ($1, $2, 0, 0, $3::jsonb, $4, $5,
                    'multiplier_markup', 1, 0, 10000,
                    $6::timestamptz, NULL)
            ON CONFLICT (tenant_id, organization_id, pricing_plan_id, rule_code)
                WHERE deleted_at IS NULL
            DO NOTHING
            "#,
        )
        .bind(rule_id)
        .bind(stable_uuid(
            "cloudrouter-pricing-rule",
            &[&plan_id.to_string(), DEFAULT_PRICING_PLAN_RULE_CODE],
        ))
        .bind(DEFAULT_PRICING_PLAN_SOURCE_MARKER)
        .bind(plan_id)
        .bind(DEFAULT_PRICING_PLAN_RULE_CODE)
        .bind(effective_from)
        .execute(&mut **transaction)
        .await
        .map_err(|error| store_error("failed to create the default pricing rule", error))?
        .rows_affected();
        bootstrap.rule_created = inserted > 0;
    }

    Ok(bootstrap)
}

async fn find_global_default_plan_id(
    transaction: &mut Transaction<'_, Postgres>,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar::<_, i64>(
        r#"
        SELECT id
        FROM cloudrouter_pricing_plan
        WHERE tenant_id = 0 AND organization_id = 0
          AND plan_code = $1
          AND deleted_at IS NULL
        "#,
    )
    .bind(DEFAULT_PRICING_PLAN_CODE)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(|error| store_error("failed to load the default pricing plan", error))
}

pub(crate) async fn sync_legacy_account_group_rate_cards(
    transaction: &mut Transaction<'_, Postgres>,
    effective_at: &str,
) -> DomainResult<usize> {
    let bindings = sqlx::query_as::<_, AccountGroupPricingBinding>(
        r#"
        SELECT
            account_group.tenant_id,
            account_group.organization_id,
            account_group.id AS account_group_id,
            selected_plan.tenant_id AS pricing_plan_tenant_id,
            selected_plan.organization_id AS pricing_plan_organization_id,
            selected_plan.id AS pricing_plan_id,
            selected_plan.plan_code AS pricing_plan_code
        FROM ai_upstream_account_group account_group
        JOIN LATERAL (
            SELECT plan.tenant_id, plan.organization_id, plan.id, plan.plan_code
            FROM cloudrouter_pricing_plan plan
            WHERE plan.status = 1
              AND plan.deleted_at IS NULL
              AND (
                  (account_group.pricing_plan_id IS NOT NULL
                   AND plan.id = account_group.pricing_plan_id)
                  OR (
                      plan.plan_code = COALESCE(
                          NULLIF(BTRIM(account_group.pricing_plan_code), ''),
                          $1
                      )
                      AND (
                          (plan.tenant_id = account_group.tenant_id
                           AND plan.organization_id IN (account_group.organization_id, 0))
                          OR (plan.tenant_id = 0 AND plan.organization_id = 0)
                      )
                  )
              )
              AND plan.effective_from <= $2::timestamptz
              AND (plan.effective_to IS NULL OR plan.effective_to > $2::timestamptz)
            ORDER BY
                (plan.id = account_group.pricing_plan_id) DESC,
                CASE
                    WHEN plan.tenant_id = account_group.tenant_id
                     AND plan.organization_id = account_group.organization_id THEN 3
                    WHEN plan.tenant_id = account_group.tenant_id
                     AND plan.organization_id = 0 THEN 2
                    ELSE 1
                END DESC,
                plan.effective_from DESC,
                plan.id DESC
            LIMIT 1
        ) selected_plan ON TRUE
        WHERE account_group.status = 1
          AND account_group.deleted_at IS NULL
        ORDER BY account_group.tenant_id, account_group.organization_id, account_group.id
        "#,
    )
    .bind(DEFAULT_PRICING_PLAN_CODE)
    .bind(effective_at)
    .fetch_all(&mut **transaction)
    .await
    .map_err(|error| {
        store_error(
            "failed to load legacy account group pricing bindings",
            error,
        )
    })?;

    for binding in &bindings {
        persist_account_group_rate_card(transaction, binding.clone(), effective_at).await?;
    }
    Ok(bindings.len())
}

pub(crate) async fn retire_account_group_rate_cards(
    transaction: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
    account_group_id: i64,
    retired_at: &str,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE cloudrouter_account_rate_card
        SET status = 0,
            effective_to = CASE
                WHEN effective_from < $4::timestamptz THEN $4::timestamptz
                ELSE effective_to
            END,
            deleted_at = CASE
                WHEN effective_from >= $4::timestamptz THEN $4::timestamptz
                ELSE deleted_at
            END,
            updated_at = $4::timestamptz,
            version = version + 1
        WHERE tenant_id = $1
          AND organization_id = $2
          AND subject_type = 'account_group'
          AND subject_id = $3
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(account_group_id)
    .bind(retired_at)
    .execute(&mut **transaction)
    .await
    .map_err(|error| store_error("failed to retire account group rate cards", error))?;
    Ok(())
}

async fn persist_account_group_rate_card(
    transaction: &mut Transaction<'_, Postgres>,
    binding: AccountGroupPricingBinding,
    effective_at: &str,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE cloudrouter_account_rate_card
        SET status = 0,
            effective_to = CASE
                WHEN effective_from < $4::timestamptz THEN $4::timestamptz
                ELSE effective_to
            END,
            deleted_at = CASE
                WHEN effective_from >= $4::timestamptz THEN $4::timestamptz
                ELSE deleted_at
            END,
            updated_at = $4::timestamptz,
            version = version + 1
        WHERE tenant_id = $1
          AND organization_id = $2
          AND subject_type = 'account_group'
          AND subject_id = $3
          AND status = 1
          AND deleted_at IS NULL
          AND effective_from <= $4::timestamptz
          AND (effective_to IS NULL OR effective_to > $4::timestamptz)
          AND (
              pricing_plan_tenant_id,
              pricing_plan_organization_id,
              pricing_plan_id
          ) <> ($5, $6, $7)
        "#,
    )
    .bind(binding.tenant_id)
    .bind(binding.organization_id)
    .bind(binding.account_group_id)
    .bind(effective_at)
    .bind(binding.pricing_plan_tenant_id)
    .bind(binding.pricing_plan_organization_id)
    .bind(binding.pricing_plan_id)
    .execute(&mut **transaction)
    .await
    .map_err(|error| store_error("failed to retire superseded account group rate card", error))?;

    let card_uuid = stable_uuid(
        "cloudrouter-account-group-rate-card",
        &[
            &binding.tenant_id.to_string(),
            &binding.organization_id.to_string(),
            &binding.account_group_id.to_string(),
            &binding.pricing_plan_tenant_id.to_string(),
            &binding.pricing_plan_organization_id.to_string(),
            &binding.pricing_plan_id.to_string(),
        ],
    );
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_account_rate_card (
            id, uuid, tenant_id, organization_id, data_scope, status, metadata,
            subject_type, subject_id, pricing_plan_tenant_id,
            pricing_plan_organization_id, pricing_plan_id, priority,
            effective_from
        ) VALUES (
            $1, $2, $3, $4, 0, 1, $5::jsonb,
            'account_group', $6, $7, $8, $9, 100, $10::timestamptz
        )
        ON CONFLICT (
            tenant_id, organization_id, subject_type, subject_id,
            pricing_plan_tenant_id, pricing_plan_organization_id, pricing_plan_id
        ) WHERE subject_id IS NOT NULL AND deleted_at IS NULL
        DO UPDATE SET
            status = 1,
            effective_to = NULL,
            updated_at = $10::timestamptz,
            version = cloudrouter_account_rate_card.version + 1,
            metadata = EXCLUDED.metadata
        "#,
    )
    .bind(next_cloud_runtime_id("cloudrouter_account_rate_card")?)
    .bind(card_uuid)
    .bind(binding.tenant_id)
    .bind(binding.organization_id)
    .bind(
        serde_json::json!({
            "source": "account_group_pricing_binding",
            "pricingPlanCode": binding.pricing_plan_code,
        })
        .to_string(),
    )
    .bind(binding.account_group_id)
    .bind(binding.pricing_plan_tenant_id)
    .bind(binding.pricing_plan_organization_id)
    .bind(binding.pricing_plan_id)
    .bind(effective_at)
    .execute(&mut **transaction)
    .await
    .map_err(|error| store_error("failed to persist account group rate card", error))?;

    // Compatibility projection only. Runtime pricing reads the rate card.
    sqlx::query(
        r#"
        UPDATE ai_upstream_account_group
        SET pricing_plan_id = $1,
            pricing_plan_code = $2,
            updated_at = GREATEST(updated_at, $3::timestamptz)
        WHERE tenant_id = $4
          AND organization_id = $5
          AND id = $6
          AND deleted_at IS NULL
        "#,
    )
    .bind(binding.pricing_plan_id)
    .bind(&binding.pricing_plan_code)
    .bind(effective_at)
    .bind(binding.tenant_id)
    .bind(binding.organization_id)
    .bind(binding.account_group_id)
    .execute(&mut **transaction)
    .await
    .map_err(|error| {
        store_error(
            "failed to update legacy account group pricing projection",
            error,
        )
    })?;
    Ok(())
}

fn normalized_plan_code(value: &str) -> &str {
    let value = value.trim();
    if value.is_empty() {
        DEFAULT_PRICING_PLAN_CODE
    } else {
        value
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
