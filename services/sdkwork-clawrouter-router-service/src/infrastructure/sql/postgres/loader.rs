use std::collections::BTreeMap;

use sqlx::PgPool;

use crate::application::{
    ApiKeySecretContext, ApiKeySecretStorageConfig, UpstreamCredentialSecretCodec,
    UpstreamCredentialSecretContext,
};
use crate::domain::{
    DomainError, DomainResult, GatewayApiKey, DEFAULT_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_SECONDS,
};
use crate::infrastructure::sql::catalog::{PricingCatalogRows, SqlPricingCatalogSnapshot};
use crate::infrastructure::sql::model_catalog_import::{
    merge_runtime_pricing_dictionary_rows, runtime_pricing_dictionary_rows,
};
use crate::infrastructure::sql::postgres::error::PostgresCatalogLoadError;
use crate::infrastructure::sql::postgres::row_mapping;
use crate::infrastructure::sql::routing_config_change::AI_ROUTING_CONFIG_SCOPE;
use crate::infrastructure::sql::rows::GatewayApiKeyRow;
use crate::infrastructure::sql::PricingCatalogSql;
use crate::ports::{
    ApiKeyManagementReadFuture, GatewayApiKeyListPage, GatewayApiKeyManagementReadStore,
    GatewayApiKeyManagementSnapshot, ListGatewayApiKeysQuery,
};

const API_KEY_SECRET_MODE_CIPHERTEXT: &str = "ciphertext";

pub struct PostgresPricingCatalogLoader {
    pool: PgPool,
    credential_secret_codec:
        Option<std::sync::Arc<dyn UpstreamCredentialSecretCodec + Send + Sync>>,
    api_key_secret_storage: Option<ApiKeySecretStorageConfig>,
    circuit_breaker_recovery_window_seconds: i64,
}

impl PostgresPricingCatalogLoader {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            credential_secret_codec: None,
            api_key_secret_storage: None,
            circuit_breaker_recovery_window_seconds:
                default_circuit_breaker_recovery_window_seconds(),
        }
    }

    pub fn with_credential_secret_codec(
        pool: PgPool,
        credential_secret_codec: std::sync::Arc<dyn UpstreamCredentialSecretCodec + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            credential_secret_codec: Some(credential_secret_codec),
            api_key_secret_storage: None,
            circuit_breaker_recovery_window_seconds:
                default_circuit_breaker_recovery_window_seconds(),
        }
    }

    pub fn with_credential_secret_codec_and_api_key_secret_storage(
        pool: PgPool,
        credential_secret_codec: std::sync::Arc<dyn UpstreamCredentialSecretCodec + Send + Sync>,
        api_key_secret_storage: ApiKeySecretStorageConfig,
    ) -> Self {
        Self {
            pool,
            credential_secret_codec: Some(credential_secret_codec),
            api_key_secret_storage: Some(api_key_secret_storage),
            circuit_breaker_recovery_window_seconds:
                default_circuit_breaker_recovery_window_seconds(),
        }
    }

    pub fn with_circuit_breaker_recovery_window_seconds(mut self, seconds: u64) -> Self {
        self.circuit_breaker_recovery_window_seconds = i64::try_from(seconds).unwrap_or(i64::MAX);
        self
    }

    pub async fn load_rows(&self) -> Result<PricingCatalogRows, PostgresCatalogLoadError> {
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
        sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
            .execute(&mut *tx)
            .await
            .map_err(PostgresCatalogLoadError::from)?;
        let api_keys = self.load_api_key_rows(&mut *tx).await?;
        let database_rows = merge_runtime_pricing_dictionary_rows(
            dictionary,
            row_mapping::load_vendors(&mut *tx, PricingCatalogSql::load_vendors()).await?,
            row_mapping::load_models(&mut *tx, PricingCatalogSql::load_models()).await?,
            row_mapping::load_prices(&mut *tx, PricingCatalogSql::load_prices()).await?,
        );
        let rows = PricingCatalogRows {
            vendors: database_rows.vendors,
            models: database_rows.models,
            // Model routes are derived from the effective resource entitlements carried by
            // upstream account routes. Keeping a second SQL authority here would allow the two
            // snapshots to disagree and would reintroduce the retired channel tables.
            model_upstream_routes: Vec::new(),
            upstream_account_routes: row_mapping::load_upstream_account_routes(
                &mut *tx,
                PricingCatalogSql::load_upstream_account_routes(),
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
            upstream_account_groups: row_mapping::load_upstream_account_groups(
                &mut *tx,
                PricingCatalogSql::load_upstream_account_groups(),
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
            upstream_account_group_metric_snapshots:
                row_mapping::load_upstream_account_group_metric_snapshots(
                    &mut *tx,
                    PricingCatalogSql::load_upstream_account_group_metric_snapshots(),
                )
                .await?,
            prices: database_rows.prices,
        };
        tx.commit().await.map_err(PostgresCatalogLoadError::from)?;
        Ok(rows)
    }

    pub async fn load_snapshot(
        &self,
    ) -> Result<SqlPricingCatalogSnapshot, PostgresCatalogLoadError> {
        let rows = self.load_rows().await?;
        let managed_provider_secrets = managed_provider_secrets_from_rows(
            &rows.upstream_account_routes,
            self.credential_secret_codec.as_deref(),
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
        row_mapping::load_api_keys(executor, PricingCatalogSql::load_api_keys())
            .await
            .map_err(PostgresCatalogLoadError::from)
    }
}

fn default_circuit_breaker_recovery_window_seconds() -> i64 {
    i64::try_from(DEFAULT_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_SECONDS).unwrap_or(i64::MAX)
}

fn managed_provider_secrets_from_rows(
    upstream_account_routes: &[crate::infrastructure::sql::rows::UpstreamAccountRouteRow],
    credential_secret_codec: Option<&(dyn UpstreamCredentialSecretCodec + Send + Sync)>,
) -> DomainResult<BTreeMap<String, String>> {
    let mut secrets = BTreeMap::new();
    for row in upstream_account_routes {
        let Some(credential_id) = row.credential_id else {
            continue;
        };
        let Some(secret_ref) = row.secret_ref.as_deref() else {
            continue;
        };
        let Some(ciphertext) = row.secret_ciphertext.as_deref() else {
            continue;
        };
        let Some(key_id) = row.secret_key_id.as_deref() else {
            continue;
        };
        collect_managed_provider_secret(
            &mut secrets,
            secret_ref,
            UpstreamCredentialSecretContext::new(
                row.tenant_id,
                row.organization_id,
                row.account_id,
                credential_id,
            ),
            key_id,
            ciphertext,
            credential_secret_codec,
        )?;
    }
    Ok(secrets)
}

fn collect_managed_provider_secret(
    secrets: &mut BTreeMap<String, String>,
    secret_ref: &str,
    context: UpstreamCredentialSecretContext,
    key_id: &str,
    ciphertext: &str,
    credential_secret_codec: Option<&(dyn UpstreamCredentialSecretCodec + Send + Sync)>,
) -> DomainResult<()> {
    let Some(credential_secret_codec) = credential_secret_codec else {
        return Err(DomainError::new(
            "upstream account credential requires an encrypted secret codec",
        ));
    };
    secrets.insert(
        secret_ref.trim().to_owned(),
        credential_secret_codec.decode_secret(context, key_id, ciphertext)?,
    );
    Ok(())
}

impl GatewayApiKeyManagementReadStore for PostgresPricingCatalogLoader {
    fn load_gateway_api_key_management_snapshot<'a>(
        &'a self,
    ) -> ApiKeyManagementReadFuture<'a, GatewayApiKeyManagementSnapshot> {
        Box::pin(async move {
            let rows = self.load_rows().await.map_err(postgres_load_error)?;
            let api_key_rows = rows.api_keys.clone();
            let managed_provider_secrets = managed_provider_secrets_from_rows(
                &rows.upstream_account_routes,
                self.credential_secret_codec.as_deref(),
            )?;
            let snapshot = SqlPricingCatalogSnapshot::from_rows_and_managed_provider_secrets(
                rows,
                managed_provider_secrets,
            )?;
            let mut management = GatewayApiKeyManagementSnapshot::from_pricing_catalog(&snapshot);
            attach_api_key_raw_keys(
                &mut management.api_keys,
                &api_key_rows,
                self.api_key_secret_storage.as_ref(),
            )?;
            Ok(management)
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
                row_mapping::ApiKeyPageQuery {
                    tenant_id: query.tenant_id,
                    organization_id: query.organization_id,
                    user_id: query.user_id,
                    search: search.as_deref(),
                    page_size: query.page_size,
                    offset: query.offset,
                },
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
            let mut items = rows
                .iter()
                .cloned()
                .map(GatewayApiKeyRow::try_into_domain)
                .collect::<DomainResult<Vec<_>>>()?;
            attach_api_key_raw_keys(
                &mut items,
                &rows,
                self.api_key_secret_storage.as_ref(),
            )?;
            Ok(GatewayApiKeyListPage {
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

/// Attaches raw key material to API key domain items from their persisted
/// secret columns. Plaintext rows pass through directly; ciphertext rows are
/// decrypted with the configured api key secret storage. Keys without a stored
/// secret (legacy rows or deployments without storage wiring) keep `None`.
///
/// Decryption failures degrade per row instead of failing the whole read:
/// the affected key keeps `raw_key: None` (masked display) and the failure is
/// logged. This keeps management surfaces available when the api key pepper
/// rotates or a single ciphertext row is damaged; AEAD still guarantees
/// tampered ciphertexts can never be mis-decrypted into a wrong plaintext.
fn attach_api_key_raw_keys(
    keys: &mut [GatewayApiKey],
    rows: &[GatewayApiKeyRow],
    storage: Option<&ApiKeySecretStorageConfig>,
) -> DomainResult<()> {
    for row in rows {
        let raw_key = if row.key_secret_mode == API_KEY_SECRET_MODE_CIPHERTEXT {
            let Some(storage) = storage else {
                tracing::warn!(
                    api_key_id = row.id,
                    "api key secret storage is not configured for ciphertext rows; raw key is unavailable"
                );
                continue;
            };
            let ciphertext = match row.key_secret_ciphertext.as_deref() {
                Some(ciphertext) => ciphertext,
                None => {
                    tracing::warn!(
                        api_key_id = row.id,
                        "api key secret ciphertext is missing; raw key is unavailable"
                    );
                    continue;
                }
            };
            let key_id = match row.key_secret_key_id.as_deref() {
                Some(key_id) => key_id,
                None => {
                    tracing::warn!(
                        api_key_id = row.id,
                        "api key secret key id is missing; raw key is unavailable"
                    );
                    continue;
                }
            };
            match storage.codec().decode_secret(
                ApiKeySecretContext::new(row.tenant_id, row.organization_id, row.id),
                key_id,
                ciphertext,
            ) {
                Ok(plaintext) => plaintext,
                Err(error) => {
                    tracing::warn!(
                        api_key_id = row.id,
                        %error,
                        "failed to decrypt api key secret; raw key is unavailable"
                    );
                    continue;
                }
            }
        } else {
            match row
                .key_secret_plaintext
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
            {
                Some(plaintext) => plaintext.to_owned(),
                None => continue,
            }
        };
        if let Some(key) = keys.iter_mut().find(|key| key.id == row.id) {
            key.raw_key = Some(raw_key);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{attach_api_key_raw_keys, managed_provider_secrets_from_rows};
    use crate::application::{
        ApiKeySecretContext, ApiKeySecretStorageConfig, UpstreamCredentialSecretCodec,
        UpstreamCredentialSecretContext,
    };
    use crate::domain::GatewayApiKey;
    use crate::infrastructure::crypto::{
        RingAeadApiKeySecretCodec, RingAeadCredentialSecretCodec,
    };
    use crate::infrastructure::sql::rows::{GatewayApiKeyRow, UpstreamAccountRouteRow};
    use sdkwork_claw_config::ApiKeySecretStorageMode;

    #[test]
    fn managed_upstream_credentials_are_decrypted_only_at_the_loader_boundary() {
        let codec =
            RingAeadCredentialSecretCodec::new("test-upstream-credential-pepper-32-bytes").unwrap();
        let context = UpstreamCredentialSecretContext::new(100001, 200001, 11, 12);
        let encoded = codec
            .encode_secret(context, "sk-sensitive-upstream-secret")
            .unwrap();
        let rows = vec![UpstreamAccountRouteRow {
            tenant_id: 100001,
            organization_id: 200001,
            supplier_code: "openai".to_owned(),
            account_id: 11,
            credential_id: Some(12),
            credential_rotation: "default".to_owned(),
            credential_priority: 10,
            credential_weight: 100,
            contract_cost_multiplier: "1".to_owned(),
            last_latency_ms: None,
            account_code: Some("primary".to_owned()),
            region_code: "global".to_owned(),
            supplier_id: 13,
            endpoint_id: Some(14),
            endpoint_code: Some("global".to_owned()),
            endpoint_priority: 10,
            endpoint_weight: 100,
            endpoint_health_status: 1,
            base_url: Some("https://api.openai.com/v1".to_owned()),
            secret_ref: Some("managed://upstream-account-credential/12".to_owned()),
            secret_ciphertext: Some(encoded.ciphertext.clone()),
            secret_key_id: Some(encoded.key_id.clone()),
            auth_type: Some("api_key".to_owned()),
            runtime_auth_config_json: r#"{"credentialTransport":"bearer","defaultHeaders":{}}"#
                .to_owned(),
            timeout_ms: Some(30_000),
            retry_policy_json: None,
            account_group_bindings_json: "[]".to_owned(),
            account_health_status: 1,
            credential_health_status: 1,
        }];

        let secrets = managed_provider_secrets_from_rows(&rows, Some(&codec)).unwrap();

        assert_eq!(
            Some(&"sk-sensitive-upstream-secret".to_owned()),
            secrets.get("managed://upstream-account-credential/12")
        );
        assert!(!secrets.contains_key(&encoded.ciphertext));
        assert!(managed_provider_secrets_from_rows(&rows, None).is_err());
    }

    fn api_key_row(
        id: i64,
        mode: &str,
        plaintext: Option<&str>,
        ciphertext: Option<&str>,
        key_id: Option<&str>,
    ) -> GatewayApiKeyRow {
        GatewayApiKeyRow {
            id,
            tenant_id: 10,
            organization_id: 20,
            user_id: 30,
            group_id: 501,
            account_group_bindings_json: "[]".to_owned(),
            name: format!("Key {id}"),
            key_prefix: format!("sk-{id}"),
            key_display_masked: format!("sk-{id}********abcd"),
            key_hash: format!("hash:{id}"),
            key_secret_mode: mode.to_owned(),
            key_secret_plaintext: plaintext.map(str::to_owned),
            key_secret_ciphertext: ciphertext.map(str::to_owned),
            key_secret_key_id: key_id.map(str::to_owned),
            policy_id: None,
            quota_policy_id: None,
            created_at: "2026-05-17 10:00:00".to_owned(),
            expire_at: None,
            status_code: 1,
            default_for_runtime: false,
        }
    }

    fn api_key_domain(id: i64) -> GatewayApiKey {
        GatewayApiKey::new(id, 501, &format!("sk-{id}"), &format!("hash:{id}"))
    }

    fn plaintext_storage() -> ApiKeySecretStorageConfig {
        ApiKeySecretStorageConfig::new(
            ApiKeySecretStorageMode::Plaintext,
            std::sync::Arc::new(
                RingAeadApiKeySecretCodec::new("0123456789abcdef0123456789abcdef").unwrap(),
            ),
        )
    }

    fn ciphertext_storage(pepper: &str) -> ApiKeySecretStorageConfig {
        ApiKeySecretStorageConfig::new(
            ApiKeySecretStorageMode::Ciphertext,
            std::sync::Arc::new(RingAeadApiKeySecretCodec::new(pepper).unwrap()),
        )
    }

    #[test]
    fn api_key_raw_keys_attach_plaintext_rows_directly() {
        let rows = vec![api_key_row(1, "plaintext", Some("sk-plain-1"), None, None)];
        let mut keys = vec![api_key_domain(1)];

        attach_api_key_raw_keys(&mut keys, &rows, Some(&plaintext_storage())).unwrap();

        assert_eq!(Some("sk-plain-1".to_owned()), keys[0].raw_key);
    }

    #[test]
    fn api_key_raw_keys_leave_legacy_rows_masked() {
        let rows = vec![api_key_row(1, "plaintext", None, None, None)];
        let mut keys = vec![api_key_domain(1)];

        attach_api_key_raw_keys(&mut keys, &rows, Some(&plaintext_storage())).unwrap();

        assert_eq!(None, keys[0].raw_key);
    }

    #[test]
    fn api_key_raw_keys_decrypt_ciphertext_rows_with_the_matching_codec() {
        let storage = ciphertext_storage("0123456789abcdef0123456789abcdef");
        let encoded = storage
            .codec()
            .encode_secret(ApiKeySecretContext::new(10, 20, 1), "sk-cipher-1")
            .unwrap();
        let rows = vec![api_key_row(
            1,
            "ciphertext",
            None,
            Some(&encoded.ciphertext),
            Some(&encoded.key_id),
        )];
        let mut keys = vec![api_key_domain(1)];

        attach_api_key_raw_keys(&mut keys, &rows, Some(&storage)).unwrap();

        assert_eq!(Some("sk-cipher-1".to_owned()), keys[0].raw_key);
    }

    #[test]
    fn api_key_raw_keys_degrade_per_row_when_decryption_fails() {
        // A different pepper (e.g. after rotation) must degrade to masked
        // instead of failing the whole management read.
        let rows = vec![
            api_key_row(1, "plaintext", Some("sk-plain-1"), None, None),
            api_key_row(2, "ciphertext", None, Some("v1:deadbeef:deadbeef"), Some("key-x")),
        ];
        let mut keys = vec![api_key_domain(1), api_key_domain(2)];

        attach_api_key_raw_keys(&mut keys, &rows, Some(&ciphertext_storage("fedcba9876543210fedcba9876543210")))
            .unwrap();

        assert_eq!(Some("sk-plain-1".to_owned()), keys[0].raw_key);
        assert_eq!(None, keys[1].raw_key);
    }

    #[test]
    fn api_key_raw_keys_without_storage_wiring_stay_masked() {
        let rows = vec![api_key_row(1, "ciphertext", None, Some("v1:aa:bb"), Some("key-x"))];
        let mut keys = vec![api_key_domain(1)];

        attach_api_key_raw_keys(&mut keys, &rows, None).unwrap();

        assert_eq!(None, keys[0].raw_key);
    }
}
