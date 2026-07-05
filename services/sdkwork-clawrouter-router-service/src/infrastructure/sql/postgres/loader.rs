use std::collections::BTreeMap;

use sqlx::{PgPool, Row};

use crate::application::ApiKeySecretCodec;
use crate::domain::{
    DomainError, DomainResult, DEFAULT_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_SECONDS,
};
use crate::infrastructure::sql::catalog::{PricingCatalogRows, SqlPricingCatalogSnapshot};
use crate::infrastructure::sql::model_catalog_import::runtime_pricing_dictionary_rows;
use crate::infrastructure::sql::postgres::error::PostgresCatalogLoadError;
use crate::infrastructure::sql::postgres::row_mapping;
use crate::infrastructure::sql::routing_config_change::AI_ROUTING_CONFIG_SCOPE;
use crate::infrastructure::sql::rows::GatewayApiKeyRow;
use crate::infrastructure::sql::PricingCatalogSql;
use crate::ports::{
    ApiKeyManagementReadFuture, AppChannelGroupListPage, GatewayApiKeyListPage,
    GatewayApiKeyManagementReadStore, GatewayApiKeyManagementSnapshot, ListAppChannelGroupsQuery,
    ListGatewayApiKeysQuery,
};

pub struct PostgresPricingCatalogLoader {
    pool: PgPool,
    api_key_secret_codec: Option<std::sync::Arc<dyn ApiKeySecretCodec + Send + Sync>>,
    circuit_breaker_recovery_window_seconds: i64,
}

impl PostgresPricingCatalogLoader {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            api_key_secret_codec: None,
            circuit_breaker_recovery_window_seconds:
                default_circuit_breaker_recovery_window_seconds(),
        }
    }

    pub fn with_api_key_secret_codec(
        pool: PgPool,
        api_key_secret_codec: std::sync::Arc<dyn ApiKeySecretCodec + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            api_key_secret_codec: Some(api_key_secret_codec),
            circuit_breaker_recovery_window_seconds:
                default_circuit_breaker_recovery_window_seconds(),
        }
    }

    pub fn with_circuit_breaker_recovery_window_seconds(mut self, seconds: u64) -> Self {
        self.circuit_breaker_recovery_window_seconds = i64::try_from(seconds).unwrap_or(i64::MAX);
        self
    }

    pub async fn load_snapshot(
        &self,
    ) -> Result<SqlPricingCatalogSnapshot, PostgresCatalogLoadError> {
        let dictionary = runtime_pricing_dictionary_rows()?;
        // M-4: wrap all catalog SELECTs in a single transaction so the
        // pointer-swapped snapshot reflects one consistent database state.
        // Without this, interleaved writes between individual SELECTs could
        // produce a snapshot that mixes old and new rows (e.g. a routing rule
        // referencing a model mapping that was just deleted).
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(PostgresCatalogLoadError::from)?;
        let api_keys = self.load_api_key_rows(&mut *tx).await?;
        let rows = PricingCatalogRows {
            vendors: dictionary.vendors,
            models: dictionary.models,
            provider_routes: row_mapping::load_provider_routes(
                &mut *tx,
                PricingCatalogSql::load_provider_routes(),
                self.circuit_breaker_recovery_window_seconds,
            )
            .await?,
            provider_channel_routes: row_mapping::load_provider_channel_routes(
                &mut *tx,
                PricingCatalogSql::load_provider_channel_routes(),
                self.circuit_breaker_recovery_window_seconds,
            )
            .await?,
            routing_policies: row_mapping::load_routing_policies(
                &mut *tx,
                PricingCatalogSql::load_routing_policies(),
            )
            .await?,
            routing_rules: row_mapping::load_routing_rules(
                &mut *tx,
                PricingCatalogSql::load_routing_rules(),
            )
            .await?,
            model_mappings: row_mapping::load_model_mappings(
                &mut *tx,
                PricingCatalogSql::load_model_mappings(),
            )
            .await?,
            pricing_plans: row_mapping::load_pricing_plans(
                &mut *tx,
                PricingCatalogSql::load_pricing_plans(),
            )
            .await?,
            channel_groups: row_mapping::load_channel_groups(
                &mut *tx,
                PricingCatalogSql::load_channel_groups(),
            )
            .await?,
            api_keys,
            access_policies: row_mapping::load_access_policies(
                &mut *tx,
                PricingCatalogSql::load_access_policies(),
            )
            .await?,
            quota_policies: row_mapping::load_quota_policies(
                &mut *tx,
                PricingCatalogSql::load_quota_policies(),
            )
            .await?,
            gateway_risk_rules: row_mapping::load_gateway_risk_rules(
                &mut *tx,
                PricingCatalogSql::load_gateway_risk_rules(),
            )
            .await?,
            channel_group_metric_snapshots: row_mapping::load_channel_group_metric_snapshots(
                &mut *tx,
                PricingCatalogSql::load_channel_group_metric_snapshots(),
            )
            .await?,
            prices: dictionary.prices,
        };
        tx.commit().await.map_err(PostgresCatalogLoadError::from)?;
        let managed_provider_secrets = managed_provider_secrets_from_rows(
            &rows.provider_routes,
            &rows.provider_channel_routes,
            self.api_key_secret_codec.as_deref(),
        )?;
        Ok(
            SqlPricingCatalogSnapshot::from_rows_and_managed_provider_secrets(
                rows,
                managed_provider_secrets,
            )?,
        )
    }

    pub async fn load_routing_config_version(&self) -> Result<i64, PostgresCatalogLoadError> {
        sqlx::query_scalar(
            r#"
            SELECT CAST(COALESCE(
                (
                    SELECT config_version
                    FROM ai_config_version
                    WHERE tenant_id = 0
                      AND organization_id = 0
                      AND config_scope = $1
                      AND status = 1
                      AND deleted_at IS NULL
                    LIMIT 1
                ),
                (
                    SELECT COALESCE(SUM(config_version), 0)
                    FROM ai_config_version
                    WHERE config_scope = $2
                      AND status = 1
                      AND deleted_at IS NULL
                      AND NOT (tenant_id = 0 AND organization_id = 0)
                ),
                0
            ) AS BIGINT)
            "#,
        )
        .bind(AI_ROUTING_CONFIG_SCOPE)
        .bind(AI_ROUTING_CONFIG_SCOPE)
        .fetch_one(&self.pool)
        .await
        .map_err(PostgresCatalogLoadError::from)
    }

    async fn load_api_key_rows<'e, E>(
        &self,
        executor: E,
    ) -> Result<Vec<GatewayApiKeyRow>, PostgresCatalogLoadError>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let rows = row_mapping::load_api_keys(executor, PricingCatalogSql::load_api_keys()).await?;
        rows.into_iter()
            .map(|row| decode_api_key_row_copyable_key(row, self.api_key_secret_codec.as_deref()))
            .collect::<DomainResult<Vec<_>>>()
            .map_err(PostgresCatalogLoadError::from)
    }
}

fn default_circuit_breaker_recovery_window_seconds() -> i64 {
    i64::try_from(DEFAULT_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_SECONDS).unwrap_or(i64::MAX)
}

fn managed_provider_secrets_from_rows(
    provider_routes: &[crate::infrastructure::sql::rows::ModelProviderRouteRow],
    provider_channel_routes: &[crate::infrastructure::sql::rows::ProviderChannelRouteRow],
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<BTreeMap<String, String>> {
    let mut secrets = BTreeMap::new();
    for (secret_ref, auth_config_json) in provider_routes
        .iter()
        .filter_map(|row| {
            row.secret_ref
                .as_deref()
                .zip(row.auth_config_json.as_deref())
        })
        .chain(provider_channel_routes.iter().filter_map(|row| {
            row.secret_ref
                .as_deref()
                .zip(row.auth_config_json.as_deref())
        }))
    {
        collect_managed_provider_secret(
            &mut secrets,
            secret_ref,
            auth_config_json,
            api_key_secret_codec,
        )?;
    }
    Ok(secrets)
}

fn collect_managed_provider_secret(
    secrets: &mut BTreeMap<String, String>,
    secret_ref: &str,
    auth_config_json: &str,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<()> {
    let Some(ciphertext) = managed_provider_secret_ciphertext(auth_config_json)? else {
        return Ok(());
    };
    let Some(api_key_secret_codec) = api_key_secret_codec else {
        return Err(DomainError::new(
            "managed provider account secret requires an encrypted secret codec",
        ));
    };
    secrets.insert(
        secret_ref.trim().to_owned(),
        api_key_secret_codec.decode_secret(&ciphertext)?,
    );
    Ok(())
}

fn managed_provider_secret_ciphertext(auth_config_json: &str) -> DomainResult<Option<String>> {
    let auth_config_json = auth_config_json.trim();
    if auth_config_json.is_empty() {
        return Ok(None);
    }
    let value: serde_json::Value = serde_json::from_str(auth_config_json).map_err(|error| {
        DomainError::new(format!(
            "integration_provider_account.auth_config must be valid JSON: {error}"
        ))
    })?;
    Ok(value
        .get("secretMaterialCiphertext")
        .or_else(|| value.get("providerSecretCiphertext"))
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned))
}

impl GatewayApiKeyManagementReadStore for PostgresPricingCatalogLoader {
    fn load_gateway_api_key_management_snapshot<'a>(
        &'a self,
    ) -> ApiKeyManagementReadFuture<'a, GatewayApiKeyManagementSnapshot> {
        Box::pin(async move {
            let snapshot = self.load_snapshot().await.map_err(postgres_load_error)?;
            Ok(GatewayApiKeyManagementSnapshot::from_pricing_catalog(
                &snapshot,
            ))
        })
    }

    fn list_gateway_api_keys<'a>(
        &'a self,
        query: ListGatewayApiKeysQuery,
    ) -> ApiKeyManagementReadFuture<'a, GatewayApiKeyListPage> {
        Box::pin(async move {
            let search = query
                .q
                .as_ref()
                .map(|value| format!("%{}%", value.to_lowercase()));
            let base_sql = gateway_api_keys_base_sql();
            let rows = row_mapping::load_api_keys_paginated(
                &self.pool,
                &base_sql,
                query.tenant_id,
                query.organization_id,
                query.user_id,
                search.as_deref(),
                query.page_size,
                query.offset,
            )
            .await
            .map_err(sqlx_load_error)?;
            let total = row_mapping::count_api_keys_paginated(
                &self.pool,
                &base_sql,
                query.tenant_id,
                query.organization_id,
                query.user_id,
                search.as_deref(),
            )
            .await
            .map_err(sqlx_load_error)?;
            let items = rows
                .into_iter()
                .map(|row| {
                    decode_api_key_row_copyable_key(row, self.api_key_secret_codec.as_deref())
                        .and_then(|row| row.try_into_domain())
                })
                .collect::<DomainResult<Vec<_>>>()?;
            Ok(GatewayApiKeyListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn list_app_channel_groups<'a>(
        &'a self,
        query: ListAppChannelGroupsQuery,
    ) -> ApiKeyManagementReadFuture<'a, AppChannelGroupListPage> {
        Box::pin(async move {
            let search = query
                .q
                .as_ref()
                .map(|value| format!("%{}%", value.to_lowercase()));
            let rows = row_mapping::load_paginated_channel_groups(
                &self.pool,
                query.tenant_id,
                query.organization_id,
                search.as_deref(),
                query.page_size,
                query.offset,
            )
            .await
            .map_err(sqlx_load_error)?;
            let total = rows
                .first()
                .and_then(|row| row.try_get::<i64, _>("total").ok())
                .unwrap_or(0);
            let items = rows
                .into_iter()
                .map(|row| row_mapping::channel_group_from_row(&row))
                .collect::<DomainResult<Vec<_>>>()?;
            Ok(AppChannelGroupListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}

fn postgres_load_error(error: PostgresCatalogLoadError) -> DomainError {
    DomainError::new(error.to_string())
}

fn sqlx_load_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn gateway_api_keys_base_sql() -> String {
    let base = PricingCatalogSql::load_api_keys().trim();
    base.strip_suffix("ORDER BY updated_at DESC, id DESC")
        .unwrap_or(base)
        .to_owned()
}

fn decode_api_key_row_copyable_key(
    row: GatewayApiKeyRow,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<GatewayApiKeyRow> {
    let Some(copyable_key_ciphertext) = row.copyable_key.as_deref() else {
        return Ok(row);
    };
    let Some(api_key_secret_codec) = api_key_secret_codec else {
        return Ok(row.with_copyable_key(None));
    };
    let copyable_key = api_key_secret_codec.decode_secret(copyable_key_ciphertext)?;
    Ok(row.with_copyable_key(Some(copyable_key)))
}
