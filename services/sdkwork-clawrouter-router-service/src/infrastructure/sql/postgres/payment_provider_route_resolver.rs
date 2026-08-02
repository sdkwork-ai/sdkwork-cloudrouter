use std::sync::Arc;

use sdkwork_claw_config::{ProviderSecretMapConfig, RuntimeTomlConfig};
use serde_json::{Map, Value};
use sqlx::{PgPool, Row};

use crate::application::{
    resolve_payment_provider_registry_for_deployment, PaymentProviderAccountCredentialRefs,
    PaymentProviderAdapter, PaymentProviderAdapterIdentity, PaymentProviderRegistry,
    PaymentProviderRouteResolver, PaymentProviderRouteResolverFuture,
    PaymentProviderRuntimeAssembler, PaymentProviderSecretResolver, PaymentRouteDecisionRecord,
    RegistryPaymentProviderRouteResolver, ResolvePaymentProviderRouteQuery,
    ResolvedPaymentProviderRoute, UnavailablePaymentProviderRouteResolver,
};
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::payment::ProviderSecretPaymentBridge;
use crate::infrastructure::provider::ProviderSecretMapResolver;

const PAYMENT_ROUTE_CANDIDATE_LIMIT: i64 = 2;

#[derive(Clone)]
pub struct PostgresPaymentProviderRouteResolver {
    pool: PgPool,
    assembler: PaymentProviderRuntimeAssembler,
    target_environments: Arc<[String]>,
}

#[derive(Debug)]
struct PaymentProviderRouteCandidate {
    route_rule_id: String,
    route_priority: i32,
    channel_id: String,
    channel_priority: i32,
    provider_account_id: String,
    supplier_code: String,
    account_projection: Map<String, Value>,
}

impl PostgresPaymentProviderRouteResolver {
    pub fn new(
        pool: PgPool,
        assembler: PaymentProviderRuntimeAssembler,
        target_environment: &str,
    ) -> Self {
        Self {
            pool,
            assembler,
            target_environments: payment_environment_aliases(target_environment).into(),
        }
    }

    async fn resolve_account_adapter(
        &self,
        tenant_id: &str,
        organization_id: &str,
        provider_account_id: &str,
        supplier_code: &str,
        account_projection: Map<String, Value>,
    ) -> DomainResult<Arc<dyn PaymentProviderAdapter>> {
        let identity = PaymentProviderAdapterIdentity::new(
            tenant_id,
            organization_id,
            provider_account_id,
            supplier_code,
        )
        .map_err(registry_error)?;
        let account = PaymentProviderAccountCredentialRefs::from_projection(&account_projection)
            .map_err(registry_error)?;
        let registry = self
            .assembler
            .resolve_and_register_account(
                PaymentProviderRegistry::empty(),
                identity.clone(),
                account,
            )
            .await
            .map_err(registry_error)?;
        registry.resolve_account(&identity).map_err(registry_error)
    }
}

impl PaymentProviderRouteResolver for PostgresPaymentProviderRouteResolver {
    fn resolve_route(
        &self,
        query: ResolvePaymentProviderRouteQuery,
    ) -> PaymentProviderRouteResolverFuture<'_, ResolvedPaymentProviderRoute> {
        Box::pin(async move {
            let canonical_supplier =
                PaymentProviderRegistry::empty().canonical_supplier_code(&query.supplier_code);
            let candidates = load_route_candidates(
                &self.pool,
                &query,
                &canonical_supplier,
                self.target_environments.as_ref(),
            )
            .await?;
            let candidate = unique_preferred_candidate(candidates)?;
            let adapter = self
                .resolve_account_adapter(
                    &query.tenant_id,
                    &query.organization_id,
                    &candidate.provider_account_id,
                    &candidate.supplier_code,
                    candidate.account_projection,
                )
                .await?;
            Ok(ResolvedPaymentProviderRoute {
                route_rule_id: Some(candidate.route_rule_id),
                account_id: candidate.channel_id,
                provider_account_id: candidate.provider_account_id,
                supplier_code: candidate.supplier_code,
                adapter,
            })
        })
    }

    fn resolve_persisted_route(
        &self,
        decision: PaymentRouteDecisionRecord,
    ) -> PaymentProviderRouteResolverFuture<'_, Arc<dyn PaymentProviderAdapter>> {
        Box::pin(async move {
            let organization_id = decision.organization_id.as_deref().ok_or_else(|| {
                DomainError::new("persisted payment route organization_id is required")
            })?;
            let provider_account_id = decision.provider_account_id.as_deref().ok_or_else(|| {
                DomainError::new("persisted payment route provider_account_id is required")
            })?;
            let supplier_code =
                PaymentProviderRegistry::empty().canonical_supplier_code(&decision.supplier_code);
            let account_projection = load_persisted_route_account(
                &self.pool,
                &decision.tenant_id,
                organization_id,
                &decision.account_id,
                provider_account_id,
                &supplier_code,
                self.target_environments.as_ref(),
            )
            .await?;
            self.resolve_account_adapter(
                &decision.tenant_id,
                organization_id,
                provider_account_id,
                &supplier_code,
                account_projection,
            )
            .await
        })
    }
}

pub fn payment_provider_route_resolver_for_postgres(
    pool: PgPool,
    runtime_toml: Option<&RuntimeTomlConfig>,
    target_environment: &str,
) -> Arc<dyn PaymentProviderRouteResolver> {
    let deployment_registry = resolve_payment_provider_registry_for_deployment();
    if !deployment_registry.supported_supplier_codes().is_empty() {
        return Arc::new(RegistryPaymentProviderRouteResolver::new(
            deployment_registry,
        ));
    }

    let secret_map = match ProviderSecretMapConfig::from_env_or_runtime_toml(runtime_toml) {
        Ok(Some(secret_map)) => secret_map,
        Ok(None) => {
            return Arc::new(UnavailablePaymentProviderRouteResolver::new(
                "provider secret map is not configured",
            ));
        }
        Err(error) => {
            tracing::warn!(
                %error,
                "payment provider route resolver could not load the provider secret map"
            );
            return Arc::new(UnavailablePaymentProviderRouteResolver::new(
                "provider secret map configuration is invalid",
            ));
        }
    };
    let secret_resolver = Arc::new(ProviderSecretMapResolver::from_config(secret_map))
        as Arc<dyn crate::ports::ProviderSecretResolver>;
    let payment_secret_resolver: Arc<dyn PaymentProviderSecretResolver> =
        Arc::new(ProviderSecretPaymentBridge::new(secret_resolver));
    Arc::new(PostgresPaymentProviderRouteResolver::new(
        pool,
        PaymentProviderRuntimeAssembler::with_default_factory(payment_secret_resolver),
        target_environment,
    ))
}

async fn load_route_candidates(
    pool: &PgPool,
    query: &ResolvePaymentProviderRouteQuery,
    canonical_supplier: &str,
    target_environments: &[String],
) -> DomainResult<Vec<PaymentProviderRouteCandidate>> {
    let rows = sqlx::query(
        r#"
        SELECT r.id AS route_rule_id,
               r.priority AS route_priority,
               c.id AS channel_id,
               c.priority AS channel_priority,
               a.id AS provider_account_id,
               a.supplier_code,
               a.account_no,
               a.merchant_id,
               a.environment,
               a.secret_ref,
               a.webhook_secret_ref,
               a.certificate_ref,
               a.status AS account_status
        FROM commerce_payment_route_rule r
        INNER JOIN commerce_payment_channel c
          ON c.tenant_id = r.tenant_id
         AND c.organization_id = r.organization_id
         AND c.id = r.account_id
        INNER JOIN commerce_payment_method m
          ON m.tenant_id = c.tenant_id
         AND m.organization_id = c.organization_id
         AND m.id = c.method_id
        INNER JOIN commerce_payment_provider_account a
          ON a.tenant_id = c.tenant_id
         AND a.organization_id = c.organization_id
         AND a.id = c.provider_account_id
        WHERE r.tenant_id = $1
          AND r.organization_id = $2
          AND r.status = 'active'
          AND c.status = 'active'
          AND m.status = 'active'
          AND a.status = 'active'
          AND LOWER(a.supplier_code) = LOWER($3)
          AND LOWER(m.provider) = LOWER($3)
          AND m.method_key = $4
          AND c.scene_code = $5
          AND UPPER(c.currency_code) = UPPER($6)
          AND (r.purchase_type IS NULL OR r.purchase_type = $5)
          AND (r.currency_code IS NULL OR UPPER(r.currency_code) = UPPER($6))
          AND (r.country_code IS NULL OR r.country_code = '')
          AND (r.client_platform IS NULL OR LOWER(r.client_platform) = LOWER($5))
          AND r.user_segment IS NULL
          AND r.risk_level IS NULL
          AND (r.amount_min IS NULL OR r.amount_min::numeric <= $7::numeric)
          AND (r.amount_max IS NULL OR r.amount_max::numeric >= $7::numeric)
          AND (r.starts_at IS NULL OR r.starts_at::timestamptz <= CURRENT_TIMESTAMP)
          AND (r.ends_at IS NULL OR r.ends_at::timestamptz > CURRENT_TIMESTAMP)
          AND LOWER(a.environment) = ANY($8::text[])
        ORDER BY r.priority ASC, c.priority ASC, r.id ASC, c.id ASC
        LIMIT $9
        "#,
    )
    .bind(&query.tenant_id)
    .bind(&query.organization_id)
    .bind(canonical_supplier)
    .bind(&query.method_code)
    .bind(&query.scene_code)
    .bind(&query.currency_code)
    .bind(&query.amount)
    .bind(target_environments)
    .bind(PAYMENT_ROUTE_CANDIDATE_LIMIT)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to resolve payment provider route", error))?;
    rows.iter().map(candidate_from_row).collect()
}

fn unique_preferred_candidate(
    mut candidates: Vec<PaymentProviderRouteCandidate>,
) -> DomainResult<PaymentProviderRouteCandidate> {
    if candidates.is_empty() {
        return Err(DomainError::new(
            "no active payment provider account matches the requested route",
        ));
    }
    if candidates.len() > 1
        && candidates[0].route_priority == candidates[1].route_priority
        && candidates[0].channel_priority == candidates[1].channel_priority
    {
        return Err(DomainError::new(
            "multiple payment provider accounts match the requested route at the same priority",
        ));
    }
    Ok(candidates.remove(0))
}

async fn load_persisted_route_account(
    pool: &PgPool,
    tenant_id: &str,
    organization_id: &str,
    channel_id: &str,
    provider_account_id: &str,
    supplier_code: &str,
    target_environments: &[String],
) -> DomainResult<Map<String, Value>> {
    let rows = sqlx::query(
        r#"
        SELECT a.id AS provider_account_id,
               a.supplier_code,
               a.account_no,
               a.merchant_id,
               a.environment,
               a.secret_ref,
               a.webhook_secret_ref,
               a.certificate_ref,
               a.status AS account_status
        FROM commerce_payment_channel c
        INNER JOIN commerce_payment_provider_account a
          ON a.tenant_id = c.tenant_id
         AND a.organization_id = c.organization_id
         AND a.id = c.provider_account_id
        WHERE c.tenant_id = $1
          AND c.organization_id = $2
          AND c.id = $3
          AND c.provider_account_id = $4
          AND a.id = $4
          AND LOWER(a.supplier_code) = LOWER($5)
          AND c.status = 'active'
          AND a.status = 'active'
          AND LOWER(a.environment) = ANY($6::text[])
        LIMIT 2
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(channel_id)
    .bind(provider_account_id)
    .bind(supplier_code)
    .bind(target_environments)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to load persisted payment provider route", error))?;
    match rows.as_slice() {
        [] => Err(DomainError::new(
            "persisted payment provider route is unavailable or outside the request scope",
        )),
        [row] => account_projection_from_row(row),
        _ => Err(DomainError::new(
            "persisted payment provider route resolved more than one account",
        )),
    }
}

fn candidate_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<PaymentProviderRouteCandidate> {
    Ok(PaymentProviderRouteCandidate {
        route_rule_id: required_string(row, "route_rule_id")?,
        route_priority: required_i32(row, "route_priority")?,
        channel_id: required_string(row, "channel_id")?,
        channel_priority: required_i32(row, "channel_priority")?,
        provider_account_id: required_string(row, "provider_account_id")?,
        supplier_code: required_string(row, "supplier_code")?,
        account_projection: account_projection_from_row(row)?,
    })
}

fn account_projection_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<Map<String, Value>> {
    let mut projection = Map::new();
    projection.insert(
        "providerCode".to_owned(),
        Value::String(required_string(row, "supplier_code")?),
    );
    projection.insert(
        "accountNo".to_owned(),
        Value::String(required_string(row, "account_no")?),
    );
    projection.insert(
        "merchantId".to_owned(),
        Value::String(required_string(row, "merchant_id")?),
    );
    projection.insert(
        "environment".to_owned(),
        Value::String(required_string(row, "environment")?),
    );
    projection.insert(
        "secretRef".to_owned(),
        Value::String(required_string(row, "secret_ref")?),
    );
    insert_optional_string(
        row,
        &mut projection,
        "webhook_secret_ref",
        "webhookSecretRef",
    )?;
    insert_optional_string(row, &mut projection, "certificate_ref", "certificateRef")?;
    projection.insert(
        "status".to_owned(),
        Value::String(required_string(row, "account_status")?),
    );
    projection.insert("metadata".to_owned(), Value::Object(Map::new()));
    Ok(projection)
}

fn insert_optional_string(
    row: &sqlx::postgres::PgRow,
    projection: &mut Map<String, Value>,
    column: &str,
    field: &str,
) -> DomainResult<()> {
    let value = row
        .try_get::<Option<String>, _>(column)
        .map_err(|error| store_error("failed to decode payment provider account", error))?;
    if let Some(value) = value {
        projection.insert(field.to_owned(), Value::String(value));
    }
    Ok(())
}

fn required_string(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<String> {
    let value = row
        .try_get::<String, _>(column)
        .map_err(|error| store_error("failed to decode payment provider route", error))?;
    if value.trim().is_empty() {
        return Err(DomainError::new(format!(
            "payment provider route {column} is required"
        )));
    }
    Ok(value)
}

fn required_i32(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i32> {
    row.try_get::<i32, _>(column)
        .map_err(|error| store_error("failed to decode payment provider route priority", error))
}

fn payment_environment_aliases(target_environment: &str) -> Vec<String> {
    match target_environment.trim().to_ascii_lowercase().as_str() {
        "prod" | "production" | "live" => vec!["production".to_owned(), "live".to_owned()],
        "test" | "sandbox" => vec!["sandbox".to_owned(), "test".to_owned()],
        "dev" | "development" => vec!["development".to_owned(), "dev".to_owned()],
        other => vec![other.to_owned()],
    }
}

fn registry_error(error: crate::application::PaymentProviderRegistryError) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(message: &str, error: sqlx::Error) -> DomainError {
    DomainError::new(format!("{message}: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn candidate(route_priority: i32, channel_priority: i32) -> PaymentProviderRouteCandidate {
        PaymentProviderRouteCandidate {
            route_rule_id: format!("rule-{route_priority}-{channel_priority}"),
            route_priority,
            channel_id: format!("channel-{route_priority}-{channel_priority}"),
            channel_priority,
            provider_account_id: format!("account-{route_priority}-{channel_priority}"),
            supplier_code: "stripe".to_owned(),
            account_projection: Map::new(),
        }
    }

    #[test]
    fn route_selection_rejects_no_match_and_equal_priority_ambiguity() {
        assert!(unique_preferred_candidate(Vec::new()).is_err());
        let error = unique_preferred_candidate(vec![candidate(1, 10), candidate(1, 10)])
            .expect_err("same-priority routes must be ambiguous");
        assert!(error
            .to_string()
            .contains("multiple payment provider accounts"));
    }

    #[test]
    fn route_selection_accepts_one_unique_highest_priority_candidate() {
        let selected = unique_preferred_candidate(vec![candidate(1, 10), candidate(2, 0)])
            .expect("a unique route priority must select one account");
        assert_eq!("rule-1-10", selected.route_rule_id);
    }

    #[test]
    fn environment_aliases_are_bounded_and_normalized() {
        assert_eq!(
            vec!["production".to_owned(), "live".to_owned()],
            payment_environment_aliases("prod")
        );
        assert_eq!(
            vec!["sandbox".to_owned(), "test".to_owned()],
            payment_environment_aliases("sandbox")
        );
    }
}
