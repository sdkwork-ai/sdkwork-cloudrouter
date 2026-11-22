//! PostgreSQL implementation of [`AppModelGroupStore`].
//!
//! Reads the caller's rules from `ai_user_account_group_route` on every request
//! (low volume, one user) and combines them with the process snapshot's group
//! membership. A scope is one-to-many: writing it soft-deletes the scope's
//! previous rows and upserts each group at its priority, so an empty list
//! clears the scope.

use std::sync::Arc;

use sqlx::{PgPool, Row};

use crate::application::{
    build_model_group_catalog, ModelGroupRoutingIndex,
};
use crate::domain::{
    upstream_account_group_in_subject_scope, AccountGroupRouteScope, AiModel, DomainError,
    DomainResult, ModelGroupCatalogModality, ModelGroupOption, SessionAccountGroupModality,
    UserAccountGroupRoute,
};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::ports::{
    AppModelGroupCatalogQuery, AppModelGroupDefaultItem, AppModelGroupFuture,
    AppModelGroupStore, AppModelGroupSubject, SetAppModelGroupDefaultCommand,
    UpstreamAccountRouteCatalog,
};

pub struct PostgresAppModelGroupStore {
    catalog: Arc<dyn UpstreamAccountRouteCatalog + Send + Sync>,
    pool: PgPool,
}

impl PostgresAppModelGroupStore {
    pub fn new<C>(catalog: Arc<C>, pool: PgPool) -> Self
    where
        C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
    {
        Self {
            catalog,
            pool,
        }
    }

    async fn load_routes(
        &self,
        subject: AppModelGroupSubject,
    ) -> DomainResult<Vec<UserAccountGroupRoute>> {
        let rows = sqlx::query(
            r#"
            SELECT
                route.scope_type,
                route.modality,
                route.vendor_code,
                route.model,
                route.account_group_id,
                COALESCE(NULLIF(route.account_group_code, ''), account_group.group_code, '') AS account_group_code,
                route.priority
            FROM ai_user_account_group_route route
            LEFT JOIN ai_upstream_account_group account_group
              ON account_group.id = route.account_group_id
             AND account_group.tenant_id = route.tenant_id
             AND account_group.organization_id = route.organization_id
             AND account_group.deleted_at IS NULL
            WHERE route.tenant_id = $1
              AND route.organization_id = $2
              AND route.user_id = $3
              AND route.status = 1
              AND route.deleted_at IS NULL
            ORDER BY route.scope_type ASC, route.priority ASC, route.id ASC
            "#,
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| DomainError::new(format!("model group defaults could not be read: {error}")))?;
        Ok(rows
            .into_iter()
            .filter_map(|row| {
                let scope = AccountGroupRouteScope::parse(&row.get::<String, _>("scope_type"))?;
                Some(UserAccountGroupRoute {
                    tenant_id: subject.tenant_id,
                    organization_id: subject.organization_id,
                    user_id: subject.user_id,
                    scope,
                    modality: row.get("modality"),
                    vendor_code: row.get("vendor_code"),
                    model: row.get("model"),
                    account_group_id: row.get("account_group_id"),
                    account_group_code: row.get("account_group_code"),
                    priority: row.get("priority"),
                })
            })
            .collect())
    }

    fn resolve_group(
        &self,
        subject: AppModelGroupSubject,
        requested: &str,
        modality: Option<SessionAccountGroupModality>,
    ) -> DomainResult<(i64, String)> {
        let requested = requested.trim();
        let groups = self
            .catalog
            .list_session_account_groups()
            .into_iter()
            .filter(|group| {
                upstream_account_group_in_subject_scope(
                    &group.group,
                    subject.tenant_id,
                    subject.organization_id,
                )
            })
            .collect::<Vec<_>>();
        let matched = groups.iter().find(|group| {
            requested
                .parse::<i64>()
                .map(|id| group.group.id == id)
                .unwrap_or_else(|_| group.group.code.eq_ignore_ascii_case(requested))
        });
        let Some(group) = matched else {
            return Err(DomainError::new(format!(
                "account group '{requested}' is not available to this user"
            )));
        };
        if let Some(modality) = modality {
            let serves = group.modality_scope.serves(modality) || group.modality_scope.is_mixed();
            if !serves {
                return Err(DomainError::new(format!(
                    "account group '{}' does not serve the {} modality",
                    group.group.code,
                    modality.wire_modality()
                )));
            }
        }
        Ok((group.group.id, group.group.code.clone()))
    }

    fn normalize_command(
        &self,
        subject: AppModelGroupSubject,
        command: SetAppModelGroupDefaultCommand,
    ) -> DomainResult<NormalizedModelGroupDefault> {
        let modality = command.modality;
        let vendor_code = command.vendor_code.trim().to_owned();
        let model = command.model.trim().to_owned();
        match command.scope {
            AccountGroupRouteScope::Model => {
                if model.is_empty() {
                    return Err(DomainError::new("a model scope requires the model name"));
                }
            }
            AccountGroupRouteScope::Vendor => {
                if vendor_code.is_empty() {
                    return Err(DomainError::new("a vendor scope requires the vendor code"));
                }
                if !model.is_empty() {
                    return Err(DomainError::new("a vendor scope must not name a model"));
                }
            }
            AccountGroupRouteScope::Modality => {
                if modality.is_none() {
                    return Err(DomainError::new("a modality scope requires the modality"));
                }
                if !vendor_code.is_empty() || !model.is_empty() {
                    return Err(DomainError::new(
                        "a modality scope must not name a vendor or model",
                    ));
                }
            }
        }
        let account_groups = command
            .account_groups
            .iter()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
            .map(|value| self.resolve_group(subject, value, modality))
            .collect::<DomainResult<Vec<_>>>()?;
        // Deduplicate while preserving the caller's priority order: the same
        // group twice would violate the partial unique index.
        let mut deduped: Vec<(i64, String)> = Vec::with_capacity(account_groups.len());
        for group in account_groups {
            if !deduped.iter().any(|(id, _)| *id == group.0) {
                deduped.push(group);
            }
        }
        if deduped.len() > MAX_USER_MODEL_GROUPS {
            return Err(DomainError::new(format!(
                "a model scope may list at most {MAX_USER_MODEL_GROUPS} account groups"
            )));
        }
        Ok(NormalizedModelGroupDefault {
            scope: command.scope,
            modality: modality.map(|value| value.wire_modality().to_owned()),
            vendor_code,
            model,
            account_groups: deduped,
        })
    }
}

/// Upper bound on the failover list of one scope. The console never needs a
/// long list, and an unbounded list would turn one request into thousands of
/// candidate lookups.
const MAX_USER_MODEL_GROUPS: usize = 32;

/// Clears the whole ordered failover list of one scope before the replacement
/// rows are written. Soft-deleting keeps the row history and frees the partial
/// unique index for the new priorities, so an empty replacement list leaves the
/// scope with no active rows at all.
const CLEAR_SCOPE_ROUTES_SQL: &str = r#"
                UPDATE ai_user_account_group_route
                   SET deleted_at = CURRENT_TIMESTAMP,
                       status = 0,
                       updated_at = CURRENT_TIMESTAMP,
                       version = version + 1
                 WHERE tenant_id = $1
                   AND organization_id = $2
                   AND user_id = $3
                   AND scope_type = $4
                   AND modality = $5
                   AND vendor_code = $6
                   AND model = $7
                   AND deleted_at IS NULL
                "#;

/// Priority of the group at `index` in one scope's failover list. Lower is
/// tried first, so the caller's order becomes 0, 10, 20, … and a scope can
/// hold several groups without them colliding.
fn scope_priority(index: usize) -> i32 {
    i32::try_from(index)
        .unwrap_or(i32::MAX / 10)
        .saturating_mul(10)
}

/// Ordered writes for one scope: `(priority, account_group_id, code)` per group
/// in the caller's failover order. An empty list yields no writes, which is the
/// clear-only path.
fn scope_route_writes(groups: &[(i64, String)]) -> Vec<(i32, i64, String)> {
    groups
        .iter()
        .enumerate()
        .map(|(index, (account_group_id, account_group_code))| {
            (
                scope_priority(index),
                *account_group_id,
                account_group_code.clone(),
            )
        })
        .collect()
}

#[derive(Debug)]
struct NormalizedModelGroupDefault {
    scope: AccountGroupRouteScope,
    modality: Option<String>,
    vendor_code: String,
    model: String,
    account_groups: Vec<(i64, String)>,
}

impl AppModelGroupStore for PostgresAppModelGroupStore {
    fn load_model_group_catalog<'a>(
        &'a self,
        subject: AppModelGroupSubject,
        query: AppModelGroupCatalogQuery,
    ) -> AppModelGroupFuture<'a, Vec<ModelGroupCatalogModality>> {
        Box::pin(async move {
            let routes = self.load_routes(subject).await?;
            let index =
                ModelGroupRoutingIndex::build_with_user_routes(self.catalog.as_ref(), routes);
            Ok(build_model_group_catalog(
                self.catalog.as_ref(),
                (subject.tenant_id, subject.organization_id, subject.user_id),
                query.modality,
                query.vendor_code.as_deref(),
                &index,
            ))
        })
    }

    fn load_model_groups<'a>(
        &'a self,
        subject: AppModelGroupSubject,
        model: String,
    ) -> AppModelGroupFuture<'a, Option<Vec<ModelGroupOption>>> {
        Box::pin(async move {
            let Some(found) = find_model(self.catalog.as_ref(), &model) else {
                return Ok(None);
            };
            let routes = self.load_routes(subject).await?;
            let index =
                ModelGroupRoutingIndex::build_with_user_routes(self.catalog.as_ref(), routes);
            Ok(Some(index.groups_for_model(
                self.catalog.as_ref(),
                &found,
                subject.tenant_id,
                subject.organization_id,
                Some(subject.user_id),
                None,
            )))
        })
    }

    fn set_model_group_default<'a>(
        &'a self,
        subject: AppModelGroupSubject,
        command: SetAppModelGroupDefaultCommand,
    ) -> AppModelGroupFuture<'a, ()> {
        Box::pin(async move {
            let normalized = self.normalize_command(subject, command)?;
            let modality = normalized.modality.clone().unwrap_or_default();
            let scope = normalized.scope.as_str();
            let mut tx = self.pool.begin().await.map_err(|error| {
                DomainError::new(format!(
                    "model group defaults transaction could not start: {error}"
                ))
            })?;
            // Replace the whole ordered list for the scope. Soft-deleting first
            // also frees the partial unique index for the new priorities.
            sqlx::query(CLEAR_SCOPE_ROUTES_SQL)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .bind(scope)
                .bind(&modality)
                .bind(&normalized.vendor_code)
                .bind(&normalized.model)
                .execute(&mut *tx)
                .await
                .map_err(|error| {
                    DomainError::new(format!("model group default could not be cleared: {error}"))
                })?;
            for (priority, account_group_id, account_group_code) in
                scope_route_writes(&normalized.account_groups)
            {
                let id = next_cloud_runtime_id("user model group default")?;
                sqlx::query(
                    r#"
                    INSERT INTO ai_user_account_group_route (
                        id, uuid, tenant_id, organization_id, user_id,
                        data_scope, status,
                        created_at, updated_at, version,
                        scope_type, modality, vendor_code, model,
                        account_group_id, account_group_code, priority
                    )
                    VALUES (
                        $1, $2, $3, $4, $5,
                        1, 1,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0,
                        $6, $7, $8, $9,
                        $10, $11, $12
                    )
                    ON CONFLICT (
                        tenant_id, organization_id, user_id, scope_type,
                        modality, vendor_code, model, account_group_id
                    )
                        WHERE deleted_at IS NULL
                    DO UPDATE SET
                        account_group_code = EXCLUDED.account_group_code,
                        priority = EXCLUDED.priority,
                        status = 1,
                        updated_at = CURRENT_TIMESTAMP,
                        version = ai_user_account_group_route.version + 1,
                        deleted_at = NULL
                    "#,
                )
                .bind(id)
                .bind(format!("ugr-{id}"))
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .bind(scope)
                .bind(&modality)
                .bind(&normalized.vendor_code)
                .bind(&normalized.model)
                .bind(account_group_id)
                .bind(&account_group_code)
                .bind(priority)
                .execute(&mut *tx)
                .await
                .map_err(|error| {
                    DomainError::new(format!("model group default could not be saved: {error}"))
                })?;
            }
            tx.commit().await.map_err(|error| {
                DomainError::new(format!(
                    "model group defaults transaction could not commit: {error}"
                ))
            })?;
            Ok(())
        })
    }

    fn list_model_group_defaults<'a>(
        &'a self,
        subject: AppModelGroupSubject,
    ) -> AppModelGroupFuture<'a, Vec<AppModelGroupDefaultItem>> {
        Box::pin(async move {
            let rows = sqlx::query(
                r#"
                SELECT
                    route.scope_type,
                    route.modality,
                    route.vendor_code,
                    route.model,
                    route.account_group_id,
                    COALESCE(NULLIF(route.account_group_code, ''), account_group.group_code, '') AS account_group_code,
                    COALESCE(NULLIF(account_group.group_name, ''), account_group.group_code, '') AS account_group_name,
                    route.priority
                FROM ai_user_account_group_route route
                LEFT JOIN ai_upstream_account_group account_group
                  ON account_group.id = route.account_group_id
                 AND account_group.tenant_id = route.tenant_id
                 AND account_group.organization_id = route.organization_id
                 AND account_group.deleted_at IS NULL
                WHERE route.tenant_id = $1
                  AND route.organization_id = $2
                  AND route.user_id = $3
                  AND route.status = 1
                  AND route.deleted_at IS NULL
                ORDER BY route.scope_type ASC, route.priority ASC, route.id ASC
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(subject.user_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|error| {
                DomainError::new(format!("model group defaults could not be listed: {error}"))
            })?;
            Ok(rows
                .into_iter()
                .filter_map(|row| {
                    let scope =
                        AccountGroupRouteScope::parse(&row.get::<String, _>("scope_type"))?;
                    Some(AppModelGroupDefaultItem {
                        scope,
                        modality: row.get("modality"),
                        vendor_code: row.get("vendor_code"),
                        model: row.get("model"),
                        account_group_id: row.get("account_group_id"),
                        account_group_code: row.get("account_group_code"),
                        account_group_name: row.get("account_group_name"),
                        priority: row.get("priority"),
                    })
                })
                .collect())
        })
    }
}

fn find_model(catalog: &(dyn UpstreamAccountRouteCatalog + Send + Sync), model: &str) -> Option<AiModel> {
    let model = model.trim();
    if model.is_empty() {
        return None;
    }
    if let Some(found) = catalog.find_model(model) {
        return Some(found);
    }
    let mut found = None;
    catalog.visit_models(None, &mut |candidate| {
        if candidate.model != model {
            return true;
        }
        found = Some(candidate.clone());
        false
    });
    found
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{
        DecimalValue, UpstreamAccountFallbackMode, UpstreamAccountGroup,
        UpstreamAccountRoutingStrategy,
    };
    use crate::infrastructure::InMemoryPricingCatalog;

    fn group(id: i64, code: &str) -> UpstreamAccountGroup {
        UpstreamAccountGroup {
            id,
            tenant_id: 100_001,
            organization_id: 0,
            name: code.to_owned(),
            code: code.to_owned(),
            is_default: false,
            pricing_plan_tenant_id: 100_001,
            pricing_plan_organization_id: 0,
            pricing_plan_id: 1,
            pricing_plan_code: "standard".to_owned(),
            routing_strategy: UpstreamAccountRoutingStrategy::LeastCost,
            fallback_mode: UpstreamAccountFallbackMode::Sequential,
            priority: 100,
            cost_multiplier: DecimalValue::ONE,
            sale_multiplier: DecimalValue::ONE,
        }
    }

    #[tokio::test]
    async fn vendor_scope_rejects_a_model_name() {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_upstream_account_group(group(10, "pool"));
        let store = PostgresAppModelGroupStore {
            catalog: Arc::new(catalog),
            pool: PgPool::connect_lazy("postgres://localhost/x").expect("lazy pool"),
        };
        let error = store
            .normalize_command(
                AppModelGroupSubject {
                    tenant_id: 100_001,
                    organization_id: 0,
                    user_id: 30,
                },
                SetAppModelGroupDefaultCommand {
                    scope: AccountGroupRouteScope::Vendor,
                    modality: Some(SessionAccountGroupModality::Llm),
                    vendor_code: "openai".to_owned(),
                    model: "gpt-4o".to_owned(),
                    account_groups: vec!["pool".to_owned()],
                },
            )
            .expect_err("vendor scope with a model");
        assert!(error.to_string().contains("must not name a model"));
    }

    #[tokio::test]
    async fn modality_scope_requires_a_modality() {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_upstream_account_group(group(10, "pool"));
        let store = PostgresAppModelGroupStore {
            catalog: Arc::new(catalog),
            pool: PgPool::connect_lazy("postgres://localhost/x").expect("lazy pool"),
        };
        let error = store
            .normalize_command(
                AppModelGroupSubject {
                    tenant_id: 100_001,
                    organization_id: 0,
                    user_id: 30,
                },
                SetAppModelGroupDefaultCommand {
                    scope: AccountGroupRouteScope::Modality,
                    modality: None,
                    vendor_code: String::new(),
                    model: String::new(),
                    account_groups: vec!["pool".to_owned()],
                },
            )
            .expect_err("modality scope without modality");
        assert!(error.to_string().contains("requires the modality"));
    }

    #[tokio::test]
    async fn a_group_outside_the_subject_scope_is_rejected() {
        let mut catalog = InMemoryPricingCatalog::default();
        let mut foreign = group(10, "foreign");
        foreign.tenant_id = 999_999;
        catalog.add_upstream_account_group(foreign);
        let store = PostgresAppModelGroupStore {
            catalog: Arc::new(catalog),
            pool: PgPool::connect_lazy("postgres://localhost/x").expect("lazy pool"),
        };
        let error = store
            .normalize_command(
                AppModelGroupSubject {
                    tenant_id: 100_001,
                    organization_id: 0,
                    user_id: 30,
                },
                SetAppModelGroupDefaultCommand {
                    scope: AccountGroupRouteScope::Model,
                    modality: Some(SessionAccountGroupModality::Llm),
                    vendor_code: String::new(),
                    model: "gpt-4o".to_owned(),
                    account_groups: vec!["foreign".to_owned()],
                },
            )
            .expect_err("foreign group");
        assert!(error.to_string().contains("not available"));
    }

    fn model_scope_store() -> PostgresAppModelGroupStore {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_upstream_account_group(group(10, "pool-a"));
        catalog.add_upstream_account_group(group(20, "pool-b"));
        PostgresAppModelGroupStore {
            catalog: Arc::new(catalog),
            pool: PgPool::connect_lazy("postgres://localhost/x").expect("lazy pool"),
        }
    }

    fn model_scope_command(account_groups: Vec<String>) -> SetAppModelGroupDefaultCommand {
        SetAppModelGroupDefaultCommand {
            scope: AccountGroupRouteScope::Model,
            modality: Some(SessionAccountGroupModality::Llm),
            vendor_code: String::new(),
            model: "gpt-4o".to_owned(),
            account_groups,
        }
    }

    fn model_scope_subject() -> AppModelGroupSubject {
        AppModelGroupSubject {
            tenant_id: 100_001,
            organization_id: 0,
            user_id: 30,
        }
    }

    /// One model scope lists several account groups; the caller's order is the
    /// failover order, so the first group is tried first (priority 0) and the
    /// write plan keeps every group instead of collapsing to one default.
    #[tokio::test]
    async fn a_model_scope_writes_two_groups_in_priority_order() {
        let store = model_scope_store();
        let normalized = store
            .normalize_command(
                model_scope_subject(),
                // The repeated "pool-b" proves the plan never emits a duplicate
                // row for the same scope+group, which the partial unique index
                // would reject.
                model_scope_command(vec![
                    "pool-b".to_owned(),
                    "pool-b".to_owned(),
                    "pool-a".to_owned(),
                ]),
            )
            .expect("two-group model scope");

        let writes = scope_route_writes(&normalized.account_groups);

        assert_eq!(
            vec![
                (0, 20, "pool-b".to_owned()),
                (10, 10, "pool-a".to_owned()),
            ],
            writes,
            "both groups must persist for the same model, in caller priority order",
        );
        assert_eq!(
            scope_priority(MAX_USER_MODEL_GROUPS - 1),
            310,
            "the 32-group upper bound still yields distinct priorities",
        );
    }

    /// Replacing the list with an empty one clears the scope: normalization
    /// accepts it and the write plan is empty, so only the soft-delete runs.
    #[tokio::test]
    async fn an_empty_group_list_clears_the_scope() {
        let store = model_scope_store();
        let normalized = store
            .normalize_command(
                model_scope_subject(),
                model_scope_command(Vec::new()),
            )
            .expect("an empty list clears the scope");

        assert!(normalized.account_groups.is_empty());
        assert!(scope_route_writes(&normalized.account_groups).is_empty());

        for predicate in [
            "UPDATE ai_user_account_group_route",
            "SET deleted_at = CURRENT_TIMESTAMP",
            "user_id = $3",
            "scope_type = $4",
            "modality = $5",
            "vendor_code = $6",
            "model = $7",
            "deleted_at IS NULL",
        ] {
            assert!(
                CLEAR_SCOPE_ROUTES_SQL.contains(predicate),
                "the clear statement must soft-delete one scope's rows; missing {predicate}",
            );
        }
    }

    /// The table key allows one model scope to hold several groups: the partial
    /// unique index includes the group id and excludes `priority`, so ordered
    /// failover rows coexist and only a duplicate group in the same scope is
    /// rejected.
    #[test]
    fn the_route_table_keys_one_model_scope_to_many_account_groups() {
        let migration = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../database/migrations/postgres/0054_user_model_group_routing.up.sql"
        ));
        let index_start = migration
            .find("CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_user_account_group_route_scope_group")
            .expect("migration must declare the scope+group unique index");
        let index_tail = &migration[index_start..];
        let index_body = &index_tail[..index_tail
            .find("WHERE deleted_at IS NULL")
            .expect("the scope+group unique index must be partial")];

        assert!(index_body.contains("account_group_id"));
        assert!(
            !index_body.contains("priority"),
            "priority must not be part of the key: one scope lists many groups ordered by priority",
        );
        assert!(migration.contains("scope_type IN ('model', 'vendor', 'modality')"));
        assert!(
            migration.contains("(scope_type = 'model' AND model <> '')"),
            "a model scope only needs the model name to hold a group row",
        );
    }
}
