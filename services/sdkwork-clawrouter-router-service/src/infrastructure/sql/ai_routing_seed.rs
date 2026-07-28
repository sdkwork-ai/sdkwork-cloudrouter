use std::collections::{BTreeMap, BTreeSet};
use std::fmt::{Display, Formatter};

use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row, SqlitePool};

use sdkwork_iam_bootstrap::{DEFAULT_IAM_ORGANIZATION_ID, DEFAULT_IAM_TENANT_ID};

const MANIFEST_JSON: &str = include_str!("../../../../../data/ai-routing/install-manifest.json");
const CORE_RESOURCES_JSON: &str =
    include_str!("../../../../../data/ai-routing/resources/core-resources.json");
const OPENAI_RESOURCES_JSON: &str =
    include_str!("../../../../../data/ai-routing/resources/openai-resources.json");
const VENDOR_NATIVE_RESOURCES_JSON: &str =
    include_str!("../../../../../data/ai-routing/resources/vendor-native-resources.json");
const ADMIN_API_GROUPS_JSON: &str =
    include_str!("../../../../../data/ai-routing/resource-groups/admin-api-groups.json");
const OFFICIAL_PROVIDER_GROUPS_JSON: &str =
    include_str!("../../../../../data/ai-routing/resource-groups/official-provider-groups.json");
const RELAY_PROVIDER_GROUPS_JSON: &str =
    include_str!("../../../../../data/ai-routing/resource-groups/relay-provider-groups.json");

const ACTIVE_STATUS: i32 = 1;
const DISABLED_STATUS: i32 = 0;
const HEALTHY_STATUS: i32 = 1;
const SYSTEM_TENANT_ID: i64 = 0;
const SYSTEM_ORGANIZATION_ID: i64 = 0;
const SYSTEM_DATA_SCOPE: i32 = 1;
const DEFAULT_ADMIN_DATA_SCOPE: i32 = 1;
const MAX_SEED_UUID_LENGTH: usize = 64;
const DEFAULT_OPENAI_BASE_URL: &str = "https://api.openai.com/v1";
const DEFAULT_ADMIN_ROUTING_TOPOLOGY_SEED_SOURCE: &str = "default-admin-routing-topology-seed.v2|openai-default|standard-group|official.openai.full|openai|official|openai_compatible|https://api.openai.com/v1";

#[derive(Debug)]
pub(crate) enum AiRoutingSeedLoadError {
    Json(serde_json::Error),
    Validation(String),
}

impl Display for AiRoutingSeedLoadError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Json(error) => write!(formatter, "{error}"),
            Self::Validation(message) => formatter.write_str(message),
        }
    }
}

impl std::error::Error for AiRoutingSeedLoadError {}

impl From<serde_json::Error> for AiRoutingSeedLoadError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiRoutingManifest {
    catalog_code: String,
    schema_version: String,
    source: String,
    sections: AiRoutingManifestSections,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiRoutingManifestSections {
    resources: Vec<String>,
    resource_groups: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceBundle {
    kind: String,
    items: Vec<ResourceSeed>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceSeed {
    resource_code: String,
    resource_type: String,
    display_name: String,
    vendor_code: Option<String>,
    modality_code: Option<String>,
    api_code: Option<String>,
    catalog_key: Option<String>,
    model: Option<String>,
    provider_native_model: Option<String>,
    capability: String,
    capabilities: Vec<String>,
    sort_order: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceGroupBundle {
    kind: String,
    items: Vec<ResourceGroupSeed>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceGroupSeed {
    group_code: String,
    group_name: String,
    group_type: String,
    selection_mode: String,
    description: Option<String>,
    sort_order: i32,
    items: Vec<ResourceGroupItemSeed>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceGroupItemSeed {
    item_type: String,
    resource_code: Option<String>,
    group_code: Option<String>,
}

#[derive(Debug, Clone)]
struct AiRoutingSeedCatalog {
    manifest: AiRoutingManifest,
    resources: Vec<ResourceSeed>,
    resource_groups: Vec<ResourceGroupSeed>,
}

#[derive(Debug, Clone)]
struct EndpointSeedDefinition<'a> {
    resource: &'a ResourceSeed,
}

#[derive(Debug, Clone, Copy)]
struct DefaultAdminChannelSeed {
    account_code: &'static str,
    channel_name: &'static str,
    supplier_code: &'static str,
    channel_type: &'static str,
    protocol_code: &'static str,
    base_url: &'static str,
    priority: i32,
    weight: i32,
}

#[derive(Debug, Clone, Copy)]
struct DefaultAdminUpstreamAccountGroupSeed {
    group_code: &'static str,
    group_name: &'static str,
    supplier_code: &'static str,
    group_type: &'static str,
    account_code: &'static str,
    resource_group_code: &'static str,
    priority: i32,
    weight: i32,
}

static DEFAULT_ADMIN_CHANNELS: [DefaultAdminChannelSeed; 1] = [DefaultAdminChannelSeed {
    account_code: "openai-default",
    channel_name: "OpenAI Default",
    supplier_code: "openai",
    channel_type: "official",
    protocol_code: "openai_compatible",
    base_url: DEFAULT_OPENAI_BASE_URL,
    priority: 100,
    weight: 100,
}];

static DEFAULT_ADMIN_CHANNEL_GROUPS: [DefaultAdminUpstreamAccountGroupSeed; 1] =
    [DefaultAdminUpstreamAccountGroupSeed {
        group_code: "standard-group",
        group_name: "Standard Group",
        supplier_code: "openai",
        group_type: "official",
        account_code: "openai-default",
        resource_group_code: "official.openai.full",
        priority: 100,
        weight: 100,
    }];

impl EndpointSeedDefinition<'_> {
    fn api_code(&self) -> &str {
        self.resource.api_code.as_deref().unwrap_or_default()
    }

    fn protocol_code(&self) -> &str {
        default_protocol_code(self.resource)
    }

    fn display_name(&self) -> &str {
        self.resource.display_name.as_str()
    }

    fn method(&self) -> &str {
        default_endpoint_method(self.api_code())
    }

    fn path_template(&self) -> String {
        default_path_template(self.api_code())
    }

    fn streaming_supported(&self) -> bool {
        let api_code = self.api_code();
        api_code == "openai.responses"
            || api_code == "openai.chat_completions"
            || api_code == "openai.completions"
            || api_code == "openai.realtime"
            || api_code == "openai.audio.speech"
            || api_code == "gemini.stream_generate_content"
            || api_code == "gemini.live"
            || self
                .resource
                .capabilities
                .iter()
                .any(|capability| capability.trim().eq_ignore_ascii_case("streaming"))
    }

    fn sort_order(&self) -> i32 {
        self.resource.sort_order
    }
}

impl DefaultAdminChannelSeed {
    fn credential_name(&self) -> String {
        format!("{} default credential", self.channel_name)
    }

    fn credential_ref(&self) -> String {
        format!(
            "secret://ai-channel-credentials/{}/default",
            self.supplier_code
        )
    }

    fn credential_hash(&self) -> String {
        stable_hash(&[
            self.account_code,
            self.supplier_code,
            self.base_url,
            self.credential_ref().as_str(),
        ])
    }

    fn credential_masked_label(&self) -> String {
        format!("{} default credential", self.supplier_code)
    }
}

impl AiRoutingSeedCatalog {
    fn load() -> Result<Self, AiRoutingSeedLoadError> {
        let manifest = serde_json::from_str::<AiRoutingManifest>(MANIFEST_JSON)?;
        let resources = resource_bundles()?
            .into_iter()
            .flat_map(|bundle| bundle.items)
            .collect::<Vec<_>>();
        let resource_groups = resource_group_bundles()?
            .into_iter()
            .flat_map(|bundle| bundle.items)
            .collect::<Vec<_>>();
        let catalog = Self {
            manifest,
            resources,
            resource_groups,
        };
        validate_catalog(&catalog)?;
        Ok(catalog)
    }

    fn payload(&self) -> String {
        serde_json::json!({
            "catalogCode": self.manifest.catalog_code,
            "schemaVersion": self.manifest.schema_version,
            "source": self.manifest.source,
            "resourceCount": self.resources.len(),
            "resourceGroupCount": self.resource_groups.len(),
            "defaultAdminChannelCount": default_admin_channels().len(),
            "defaultAdminUpstreamAccountGroupCount": default_admin_upstream_account_groups().len(),
            "sourceHash": source_hash(),
        })
        .to_string()
    }
}

pub(crate) fn bundled_ai_routing_seed_payload() -> Result<String, AiRoutingSeedLoadError> {
    Ok(AiRoutingSeedCatalog::load()?.payload())
}

pub(crate) async fn import_sqlite_ai_routing_seed(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let catalog = AiRoutingSeedCatalog::load().map_err(json_decode_error)?;
    let mut tx = pool.begin().await?;
    import_sqlite_api_endpoints(&mut tx, &catalog).await?;
    import_sqlite_resources(&mut tx, &catalog).await?;
    import_sqlite_resource_groups(&mut tx, &catalog).await?;
    disable_removed_sqlite_resource_groups(&mut tx, &catalog).await?;
    import_sqlite_resource_group_items(&mut tx, &catalog).await?;
    import_sqlite_default_admin_channels(&mut tx, &catalog).await?;
    import_sqlite_default_admin_channel_credentials(&mut tx, &catalog).await?;
    import_sqlite_default_admin_upstream_account_groups(&mut tx, &catalog).await?;
    import_sqlite_default_admin_upstream_account_account_group_bindings(&mut tx, &catalog).await?;
    tx.commit().await?;
    Ok(())
}

pub(crate) async fn import_postgres_ai_routing_seed(pool: &PgPool) -> Result<(), sqlx::Error> {
    let catalog = AiRoutingSeedCatalog::load().map_err(json_decode_error)?;
    let mut tx = pool.begin().await?;
    import_postgres_api_endpoints(&mut tx, &catalog).await?;
    import_postgres_resources(&mut tx, &catalog).await?;
    import_postgres_resource_groups(&mut tx, &catalog).await?;
    disable_removed_postgres_resource_groups(&mut tx, &catalog).await?;
    import_postgres_resource_group_items(&mut tx, &catalog).await?;
    import_postgres_default_admin_channels(&mut tx, &catalog).await?;
    import_postgres_default_admin_channel_credentials(&mut tx, &catalog).await?;
    import_postgres_default_admin_upstream_account_groups(&mut tx, &catalog).await?;
    import_postgres_default_admin_upstream_account_account_group_bindings(&mut tx, &catalog).await?;
    tx.commit().await?;
    Ok(())
}

pub(crate) async fn sqlite_ai_routing_seed_complete(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let catalog = AiRoutingSeedCatalog::load().map_err(json_decode_error)?;
    let resource_codes = sqlite_string_set(
        pool,
        "SELECT resource_code FROM ai_resource WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .await?;
    let group_codes = sqlite_string_set(
        pool,
        "SELECT group_code FROM ai_resource_group WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .await?;
    let endpoint_codes = sqlite_string_set(
        pool,
        "SELECT endpoint_code FROM ai_api_endpoint WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .await?;
    let default_account_codes = sqlite_default_admin_account_codes(pool).await?;
    let default_channel_credential_codes =
        sqlite_default_admin_channel_credential_codes(pool).await?;
    let default_account_group_codes = sqlite_default_admin_account_group_codes(pool).await?;
    let default_upstream_account_group_binding_codes =
        sqlite_default_admin_upstream_account_group_binding_codes(pool).await?;

    Ok(expected_resource_codes(&catalog).is_subset(&resource_codes)
        && expected_group_codes(&catalog).is_subset(&group_codes)
        && expected_endpoint_codes(&catalog).is_subset(&endpoint_codes)
        && expected_default_admin_account_codes().is_subset(&default_account_codes)
        && expected_default_admin_account_codes().is_subset(&default_channel_credential_codes)
        && expected_default_admin_account_group_codes().is_subset(&default_account_group_codes)
        && expected_default_admin_account_group_codes()
            .is_subset(&default_upstream_account_group_binding_codes)
        && sqlite_resource_group_item_count(pool, &catalog).await?
            >= expected_resource_group_item_count(&catalog))
}

pub(crate) async fn postgres_ai_routing_seed_complete(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let catalog = AiRoutingSeedCatalog::load().map_err(json_decode_error)?;
    let resource_codes = postgres_string_set(
        pool,
        "SELECT resource_code FROM ai_resource WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .await?;
    let group_codes = postgres_string_set(
        pool,
        "SELECT group_code FROM ai_resource_group WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .await?;
    let endpoint_codes = postgres_string_set(
        pool,
        "SELECT endpoint_code FROM ai_api_endpoint WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .await?;
    let default_account_codes = postgres_default_admin_account_codes(pool).await?;
    let default_channel_credential_codes =
        postgres_default_admin_channel_credential_codes(pool).await?;
    let default_account_group_codes = postgres_default_admin_account_group_codes(pool).await?;
    let default_upstream_account_group_binding_codes =
        postgres_default_admin_upstream_account_group_binding_codes(pool).await?;

    Ok(expected_resource_codes(&catalog).is_subset(&resource_codes)
        && expected_group_codes(&catalog).is_subset(&group_codes)
        && expected_endpoint_codes(&catalog).is_subset(&endpoint_codes)
        && expected_default_admin_account_codes().is_subset(&default_account_codes)
        && expected_default_admin_account_codes().is_subset(&default_channel_credential_codes)
        && expected_default_admin_account_group_codes().is_subset(&default_account_group_codes)
        && expected_default_admin_account_group_codes()
            .is_subset(&default_upstream_account_group_binding_codes)
        && postgres_resource_group_item_count(pool, &catalog).await?
            >= expected_resource_group_item_count(&catalog))
}

async fn import_sqlite_api_endpoints(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for resource in api_endpoint_resources(catalog) {
        let item = EndpointSeedDefinition { resource };
        let path_template = item.path_template();
        sqlx::query(
            r#"
            INSERT INTO ai_api_endpoint
                (uuid, tenant_id, organization_id, data_scope, status, metadata, endpoint_code, protocol_code, display_name, method, path_template, request_schema, response_schema, streaming_supported, sort_order, id)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '{}', ?, ?, ?)
            ON CONFLICT(tenant_id, organization_id, endpoint_code) DO UPDATE SET
                protocol_code = excluded.protocol_code,
                display_name = excluded.display_name,
                method = excluded.method,
                path_template = excluded.path_template,
                request_schema = excluded.request_schema,
                response_schema = excluded.response_schema,
                streaming_supported = excluded.streaming_supported,
                sort_order = excluded.sort_order,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL,
                status = excluded.status
            "#,
        )
        .bind(stable_seed_uuid("sdk-ai-api-endpoint", &[item.api_code()]))
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(SYSTEM_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(endpoint_metadata(catalog, &item))
        .bind(item.api_code())
        .bind(item.protocol_code())
        .bind(item.display_name())
        .bind(item.method())
        .bind(path_template)
        .bind(item.streaming_supported())
        .bind(item.sort_order())
        .bind(stable_seed_id("sdk-ai-api-endpoint-id", &[item.api_code()]))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_postgres_api_endpoints(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for resource in api_endpoint_resources(catalog) {
        let item = EndpointSeedDefinition { resource };
        let path_template = item.path_template();
        sqlx::query(
            r#"
            INSERT INTO ai_api_endpoint
                (uuid, tenant_id, organization_id, data_scope, status, metadata, endpoint_code, protocol_code, display_name, method, path_template, request_schema, response_schema, streaming_supported, sort_order, id)
            VALUES
                ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, '{}'::jsonb, '{}'::jsonb, $12, $13, $14)
            ON CONFLICT(tenant_id, organization_id, endpoint_code) DO UPDATE SET
                protocol_code = excluded.protocol_code,
                display_name = excluded.display_name,
                method = excluded.method,
                path_template = excluded.path_template,
                request_schema = excluded.request_schema,
                response_schema = excluded.response_schema,
                streaming_supported = excluded.streaming_supported,
                sort_order = excluded.sort_order,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL,
                status = excluded.status
            "#,
        )
        .bind(stable_seed_uuid("sdk-ai-api-endpoint", &[item.api_code()]))
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(SYSTEM_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(endpoint_metadata(catalog, &item))
        .bind(item.api_code())
        .bind(item.protocol_code())
        .bind(item.display_name())
        .bind(item.method())
        .bind(path_template)
        .bind(item.streaming_supported())
        .bind(item.sort_order())
        .bind(stable_seed_id("sdk-ai-api-endpoint-id", &[item.api_code()]))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_sqlite_resources(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for item in &catalog.resources {
        sqlx::query(resource_upsert_sqlite())
            .bind(stable_seed_uuid("sdk-ai-resource", &[&item.resource_code]))
            .bind(SYSTEM_TENANT_ID)
            .bind(SYSTEM_ORGANIZATION_ID)
            .bind(SYSTEM_DATA_SCOPE)
            .bind(ACTIVE_STATUS)
            .bind(seed_metadata(
                catalog,
                "resource",
                &item.resource_code,
                resource_metadata(item),
            ))
            .bind(&item.resource_code)
            .bind(&item.resource_type)
            .bind(&item.display_name)
            .bind(&item.vendor_code)
            .bind(&item.modality_code)
            .bind(&item.api_code)
            .bind(&item.catalog_key)
            .bind(&item.model)
            .bind(&item.provider_native_model)
            .bind(resource_schema(item))
            .bind(metadata_schema(item))
            .bind(resource_description(item))
            .bind(item.sort_order)
            .bind(stable_seed_id("sdk-ai-resource-id", &[&item.resource_code]))
            .execute(&mut **tx)
            .await?;
    }
    Ok(())
}

async fn import_postgres_resources(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for item in &catalog.resources {
        sqlx::query(resource_upsert_postgres())
            .bind(stable_seed_uuid("sdk-ai-resource", &[&item.resource_code]))
            .bind(SYSTEM_TENANT_ID)
            .bind(SYSTEM_ORGANIZATION_ID)
            .bind(SYSTEM_DATA_SCOPE)
            .bind(ACTIVE_STATUS)
            .bind(seed_metadata(
                catalog,
                "resource",
                &item.resource_code,
                resource_metadata(item),
            ))
            .bind(&item.resource_code)
            .bind(&item.resource_type)
            .bind(&item.display_name)
            .bind(&item.vendor_code)
            .bind(&item.modality_code)
            .bind(&item.api_code)
            .bind(&item.catalog_key)
            .bind(&item.model)
            .bind(&item.provider_native_model)
            .bind(resource_schema(item))
            .bind(metadata_schema(item))
            .bind(resource_description(item))
            .bind(item.sort_order)
            .bind(stable_seed_id("sdk-ai-resource-id", &[&item.resource_code]))
            .execute(&mut **tx)
            .await?;
    }
    Ok(())
}

async fn import_sqlite_resource_groups(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for item in &catalog.resource_groups {
        sqlx::query(
            r#"
            INSERT INTO ai_resource_group
                (uuid, tenant_id, organization_id, data_scope, status, metadata, group_code, group_name, group_type, selection_mode, description, sort_order, id)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tenant_id, organization_id, group_code) DO UPDATE SET
                group_name = excluded.group_name,
                group_type = excluded.group_type,
                selection_mode = excluded.selection_mode,
                description = excluded.description,
                sort_order = excluded.sort_order,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL,
                status = excluded.status
            "#,
        )
        .bind(stable_seed_uuid("sdk-ai-resource-group", &[&item.group_code]))
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(SYSTEM_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(seed_metadata(
            catalog,
            "resource_group",
            &item.group_code,
            serde_json::json!({
                "groupType": item.group_type,
                "selectionMode": item.selection_mode,
            }),
        ))
        .bind(&item.group_code)
        .bind(&item.group_name)
        .bind(&item.group_type)
        .bind(&item.selection_mode)
        .bind(&item.description)
        .bind(item.sort_order)
        .bind(stable_seed_id("sdk-ai-resource-group-id", &[&item.group_code]))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_postgres_resource_groups(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for item in &catalog.resource_groups {
        sqlx::query(
            r#"
            INSERT INTO ai_resource_group
                (uuid, tenant_id, organization_id, data_scope, status, metadata, group_code, group_name, group_type, selection_mode, description, sort_order, id)
            VALUES
                ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT(tenant_id, organization_id, group_code) DO UPDATE SET
                group_name = excluded.group_name,
                group_type = excluded.group_type,
                selection_mode = excluded.selection_mode,
                description = excluded.description,
                sort_order = excluded.sort_order,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL,
                status = excluded.status
            "#,
        )
        .bind(stable_seed_uuid("sdk-ai-resource-group", &[&item.group_code]))
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(SYSTEM_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(seed_metadata(
            catalog,
            "resource_group",
            &item.group_code,
            serde_json::json!({
                "groupType": item.group_type,
                "selectionMode": item.selection_mode,
            }),
        ))
        .bind(&item.group_code)
        .bind(&item.group_name)
        .bind(&item.group_type)
        .bind(&item.selection_mode)
        .bind(&item.description)
        .bind(item.sort_order)
        .bind(stable_seed_id("sdk-ai-resource-group-id", &[&item.group_code]))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn disable_removed_sqlite_resource_groups(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    let expected_group_codes = expected_group_codes(catalog);
    let rows = sqlx::query(
        r#"
        SELECT id, group_code
        FROM ai_resource_group
        WHERE tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = ?
        "#,
    )
    .bind(SYSTEM_TENANT_ID)
    .bind(SYSTEM_ORGANIZATION_ID)
    .bind(&catalog.manifest.catalog_code)
    .fetch_all(&mut **tx)
    .await?;

    for row in rows {
        let group_code = row.get::<String, _>("group_code");
        if expected_group_codes.contains(group_code.as_str()) {
            continue;
        }
        let group_id = row.get::<i64, _>("id");
        sqlx::query(
            r#"
            UPDATE ai_resource_group_item
            SET status = ?, deleted_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?
              AND organization_id = ?
              AND resource_group_id = ?
              AND deleted_at IS NULL
            "#,
        )
        .bind(DISABLED_STATUS)
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(group_id)
        .execute(&mut **tx)
        .await?;
        sqlx::query(
            r#"
            UPDATE ai_resource_group
            SET status = ?, deleted_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?
              AND organization_id = ?
              AND id = ?
              AND deleted_at IS NULL
            "#,
        )
        .bind(DISABLED_STATUS)
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(group_id)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn disable_removed_postgres_resource_groups(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    let expected_group_codes = expected_group_codes(catalog);
    let rows = sqlx::query(
        r#"
        SELECT id, group_code
        FROM ai_resource_group
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND metadata ->> 'catalogCode' = $3
        "#,
    )
    .bind(SYSTEM_TENANT_ID)
    .bind(SYSTEM_ORGANIZATION_ID)
    .bind(&catalog.manifest.catalog_code)
    .fetch_all(&mut **tx)
    .await?;

    for row in rows {
        let group_code = row.get::<String, _>("group_code");
        if expected_group_codes.contains(group_code.as_str()) {
            continue;
        }
        let group_id = row.get::<i64, _>("id");
        sqlx::query(
            r#"
            UPDATE ai_resource_group_item
            SET status = $1, deleted_at = NOW()
            WHERE tenant_id = $2
              AND organization_id = $3
              AND resource_group_id = $4
              AND deleted_at IS NULL
            "#,
        )
        .bind(DISABLED_STATUS)
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(group_id)
        .execute(&mut **tx)
        .await?;
        sqlx::query(
            r#"
            UPDATE ai_resource_group
            SET status = $1, deleted_at = NOW()
            WHERE tenant_id = $2
              AND organization_id = $3
              AND id = $4
              AND deleted_at IS NULL
            "#,
        )
        .bind(DISABLED_STATUS)
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(group_id)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_sqlite_resource_group_items(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    let group_ids = sqlite_group_ids(tx).await?;
    clear_sqlite_seed_resource_group_items(tx, catalog, &group_ids).await?;
    for group in &catalog.resource_groups {
        let Some(group_id) = group_ids.get(group.group_code.as_str()).copied() else {
            continue;
        };
        for (index, item) in group.items.iter().enumerate() {
            let resource_code = resource_item_code(item);
            let child_group_code = child_group_item_code(item);
            sqlx::query(group_item_upsert_sqlite())
                .bind(stable_group_item_uuid(group, item))
                .bind(SYSTEM_TENANT_ID)
                .bind(SYSTEM_ORGANIZATION_ID)
                .bind(SYSTEM_DATA_SCOPE)
                .bind(ACTIVE_STATUS)
                .bind(seed_metadata(
                    catalog,
                    "resource_group_item",
                    &group.group_code,
                    serde_json::json!({
                        "resourceCode": resource_code,
                        "childResourceGroupCode": child_group_code,
                    }),
                ))
                .bind(group_id)
                .bind(&group.group_code)
                .bind(&item.item_type)
                .bind(resource_code)
                .bind(child_group_code)
                .bind("included")
                .bind((index as i32) + 1)
                .bind(stable_group_item_id(group, item))
                .execute(&mut **tx)
                .await?;
        }
    }
    Ok(())
}

async fn import_postgres_resource_group_items(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    let group_ids = postgres_group_ids(tx).await?;
    clear_postgres_seed_resource_group_items(tx, catalog, &group_ids).await?;
    for group in &catalog.resource_groups {
        let Some(group_id) = group_ids.get(group.group_code.as_str()).copied() else {
            continue;
        };
        for (index, item) in group.items.iter().enumerate() {
            let resource_code = resource_item_code(item);
            let child_group_code = child_group_item_code(item);
            sqlx::query(group_item_upsert_postgres())
                .bind(stable_group_item_uuid(group, item))
                .bind(SYSTEM_TENANT_ID)
                .bind(SYSTEM_ORGANIZATION_ID)
                .bind(SYSTEM_DATA_SCOPE)
                .bind(ACTIVE_STATUS)
                .bind(seed_metadata(
                    catalog,
                    "resource_group_item",
                    &group.group_code,
                    serde_json::json!({
                        "resourceCode": resource_code,
                        "childResourceGroupCode": child_group_code,
                    }),
                ))
                .bind(group_id)
                .bind(&group.group_code)
                .bind(&item.item_type)
                .bind(resource_code)
                .bind(child_group_code)
                .bind("included")
                .bind((index as i32) + 1)
                .bind(stable_group_item_id(group, item))
                .execute(&mut **tx)
                .await?;
        }
    }
    Ok(())
}

async fn clear_sqlite_seed_resource_group_items(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
    group_ids: &BTreeMap<String, i64>,
) -> Result<(), sqlx::Error> {
    for group in &catalog.resource_groups {
        let Some(group_id) = group_ids.get(group.group_code.as_str()).copied() else {
            continue;
        };
        sqlx::query(
            r#"
            UPDATE ai_resource_group_item
            SET status = ?, deleted_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?
              AND organization_id = ?
              AND resource_group_id = ?
              AND deleted_at IS NULL
            "#,
        )
        .bind(DISABLED_STATUS)
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(group_id)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn clear_postgres_seed_resource_group_items(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
    group_ids: &BTreeMap<String, i64>,
) -> Result<(), sqlx::Error> {
    for group in &catalog.resource_groups {
        let Some(group_id) = group_ids.get(group.group_code.as_str()).copied() else {
            continue;
        };
        sqlx::query(
            r#"
            UPDATE ai_resource_group_item
            SET status = $1, deleted_at = NOW()
            WHERE tenant_id = $2
              AND organization_id = $3
              AND resource_group_id = $4
              AND deleted_at IS NULL
            "#,
        )
        .bind(DISABLED_STATUS)
        .bind(SYSTEM_TENANT_ID)
        .bind(SYSTEM_ORGANIZATION_ID)
        .bind(group_id)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_sqlite_default_admin_channels(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for channel in default_admin_channels() {
        sqlx::query(
            r#"
            INSERT INTO ai_channel
                (uuid, tenant_id, organization_id, data_scope, status, metadata,
                 supplier_code, account_code, channel_name, channel_type, protocol_code,
                 auth_type, base_url, credential_rotation_strategy, environment, priority, weight, health_status,
                 consecutive_error_count, id)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'default', 1, ?, ?, ?, 0, ?)
            ON CONFLICT(tenant_id, organization_id, account_code) DO UPDATE SET
                supplier_code = excluded.supplier_code,
                channel_type = excluded.channel_type,
                protocol_code = excluded.protocol_code,
                credential_rotation_strategy = excluded.credential_rotation_strategy,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_uuid(
            "sdk-ai-channel",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                channel.account_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(DISABLED_STATUS)
        .bind(default_admin_channel_metadata(catalog, *channel))
        .bind(channel.supplier_code)
        .bind(channel.account_code)
        .bind(channel.channel_name)
        .bind(channel.channel_type)
        .bind(channel.protocol_code)
        .bind(channel.base_url)
        .bind(channel.priority)
        .bind(channel.weight)
        .bind(HEALTHY_STATUS)
        .bind(stable_default_admin_account_id(channel))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_postgres_default_admin_channels(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for channel in default_admin_channels() {
        sqlx::query(
            r#"
            INSERT INTO ai_channel
                (uuid, tenant_id, organization_id, data_scope, status, metadata,
                 supplier_code, account_code, channel_name, channel_type, protocol_code,
                 auth_type, base_url, credential_rotation_strategy, environment, priority, weight, health_status,
                 consecutive_error_count, id)
            VALUES
                ($1, $2::bigint, $3::bigint, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, 1, $12, 'default', 1, $13, $14, $15, 0, $16)
            ON CONFLICT(tenant_id, organization_id, account_code) DO UPDATE SET
                supplier_code = excluded.supplier_code,
                channel_type = excluded.channel_type,
                protocol_code = excluded.protocol_code,
                credential_rotation_strategy = excluded.credential_rotation_strategy,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_uuid(
            "sdk-ai-channel",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                channel.account_code,
            ],
        ))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(DISABLED_STATUS)
        .bind(default_admin_channel_metadata(catalog, *channel))
        .bind(channel.supplier_code)
        .bind(channel.account_code)
        .bind(channel.channel_name)
        .bind(channel.channel_type)
        .bind(channel.protocol_code)
        .bind(channel.base_url)
        .bind(channel.priority)
        .bind(channel.weight)
        .bind(HEALTHY_STATUS)
        .bind(stable_default_admin_account_id(channel))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_sqlite_default_admin_channel_credentials(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for channel in default_admin_channels() {
        let result = sqlx::query(
            r#"
            INSERT INTO ai_channel_credential
                (uuid, tenant_id, organization_id, data_scope, status, metadata,
                 account_id, supplier_code, account_code, credential_name, base_url,
                 auth_config, credential_ref, credential_hash, masked_label, priority, weight,
                 health_status, consecutive_error_count, id)
            SELECT
                ?, c.tenant_id, c.organization_id, ?, ?, ?,
                c.id, c.supplier_code, c.account_code, ?, ?,
                '{}', ?, ?, ?, ?, ?, ?, 0, ?
            FROM ai_channel c
            WHERE c.tenant_id = ?
              AND c.organization_id = ?
              AND c.account_code = ?
              AND c.deleted_at IS NULL
            ON CONFLICT(uuid) DO UPDATE SET
                data_scope = excluded.data_scope,
                status = excluded.status,
                account_id = excluded.account_id,
                supplier_code = excluded.supplier_code,
                account_code = excluded.account_code,
                credential_name = excluded.credential_name,
                base_url = excluded.base_url,
                auth_config = excluded.auth_config,
                credential_ref = excluded.credential_ref,
                credential_hash = excluded.credential_hash,
                masked_label = excluded.masked_label,
                priority = excluded.priority,
                weight = excluded.weight,
                health_status = excluded.health_status,
                consecutive_error_count = excluded.consecutive_error_count,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_uuid(
            "sdk-ai-channel-credential",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                channel.account_code,
                channel.supplier_code,
            ],
        ))
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(default_admin_channel_credential_metadata(catalog, *channel))
        .bind(channel.credential_name())
        .bind(channel.base_url)
        .bind(channel.credential_ref())
        .bind(channel.credential_hash())
        .bind(channel.credential_masked_label())
        .bind(channel.priority)
        .bind(channel.weight)
        .bind(HEALTHY_STATUS)
        .bind(stable_default_admin_channel_credential_id(channel))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(channel.account_code)
        .execute(&mut **tx)
        .await?;
        if result.rows_affected() == 0 {
            return Err(sqlx::Error::RowNotFound);
        }
    }
    Ok(())
}

async fn import_postgres_default_admin_channel_credentials(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for channel in default_admin_channels() {
        let result = sqlx::query(
            r#"
            INSERT INTO ai_channel_credential
                (uuid, tenant_id, organization_id, data_scope, status, metadata,
                 account_id, supplier_code, account_code, credential_name, base_url,
                 auth_config, credential_ref, credential_hash, masked_label, priority, weight,
                 health_status, consecutive_error_count, id)
            SELECT
                $1, c.tenant_id, c.organization_id, $2, $3, $4::jsonb,
                c.id, c.supplier_code, c.account_code, $5, $6,
                '{}'::jsonb, $7, $8, $9, $10, $11, $12, 0, $13
            FROM ai_channel c
            WHERE c.tenant_id = $14::bigint
              AND c.organization_id = $15::bigint
              AND c.account_code = $16
              AND c.deleted_at IS NULL
            ON CONFLICT(uuid) DO UPDATE SET
                data_scope = excluded.data_scope,
                status = excluded.status,
                account_id = excluded.account_id,
                supplier_code = excluded.supplier_code,
                account_code = excluded.account_code,
                credential_name = excluded.credential_name,
                base_url = excluded.base_url,
                auth_config = excluded.auth_config,
                credential_ref = excluded.credential_ref,
                credential_hash = excluded.credential_hash,
                masked_label = excluded.masked_label,
                priority = excluded.priority,
                weight = excluded.weight,
                health_status = excluded.health_status,
                consecutive_error_count = excluded.consecutive_error_count,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_seed_uuid(
            "sdk-ai-channel-credential",
            &[
                &DEFAULT_IAM_TENANT_ID.to_string(),
                &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
                channel.account_code,
                channel.supplier_code,
            ],
        ))
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(default_admin_channel_credential_metadata(catalog, *channel))
        .bind(channel.credential_name())
        .bind(channel.base_url)
        .bind(channel.credential_ref())
        .bind(channel.credential_hash())
        .bind(channel.credential_masked_label())
        .bind(channel.priority)
        .bind(channel.weight)
        .bind(HEALTHY_STATUS)
        .bind(stable_default_admin_channel_credential_id(channel))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(channel.account_code)
        .execute(&mut **tx)
        .await?;
        if result.rows_affected() == 0 {
            return Err(sqlx::Error::RowNotFound);
        }
    }
    Ok(())
}

async fn import_sqlite_default_admin_upstream_account_groups(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for group in default_admin_upstream_account_groups() {
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_group
                (uuid, tenant_id, organization_id, data_scope, status, metadata,
                 group_code, group_name, description, supplier_code, group_type, environment,
                 pricing_plan_code, rate_multiplier, price_reference_mode,
                 official_price_multiplier, billing_type, allowed_origin, id)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'standard', '1.000000000000', 1,
                 '1.000000000000', 1, '[]', ?)
            ON CONFLICT(tenant_id, organization_id, group_code) DO UPDATE SET
                data_scope = excluded.data_scope,
                status = excluded.status,
                group_name = excluded.group_name,
                description = excluded.description,
                supplier_code = excluded.supplier_code,
                group_type = excluded.group_type,
                environment = excluded.environment,
                pricing_plan_code = excluded.pricing_plan_code,
                rate_multiplier = excluded.rate_multiplier,
                price_reference_mode = excluded.price_reference_mode,
                official_price_multiplier = excluded.official_price_multiplier,
                billing_type = excluded.billing_type,
                allowed_origin = excluded.allowed_origin,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_default_admin_upstream_account_group_uuid(group))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(default_admin_upstream_account_group_metadata(catalog, *group))
        .bind(group.group_code)
        .bind(group.group_name)
        .bind(format!(
            "Default {} routing group backed by {}",
            group.supplier_code, group.resource_group_code
        ))
        .bind(group.supplier_code)
        .bind(group.group_type)
        .bind(stable_default_admin_account_group_id(group))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_postgres_default_admin_upstream_account_groups(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for group in default_admin_upstream_account_groups() {
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_group
                (uuid, tenant_id, organization_id, data_scope, status, metadata,
                 group_code, group_name, description, supplier_code, group_type, environment,
                 pricing_plan_code, rate_multiplier, price_reference_mode,
                 official_price_multiplier, billing_type, allowed_origin, id)
            VALUES
                ($1, $2::bigint, $3::bigint, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, 1,
                 'standard', '1.000000000000'::numeric, 1, '1.000000000000'::numeric, 1,
                 '[]'::jsonb, $12)
            ON CONFLICT(tenant_id, organization_id, group_code) DO UPDATE SET
                data_scope = excluded.data_scope,
                status = excluded.status,
                group_name = excluded.group_name,
                description = excluded.description,
                supplier_code = excluded.supplier_code,
                group_type = excluded.group_type,
                environment = excluded.environment,
                pricing_plan_code = excluded.pricing_plan_code,
                rate_multiplier = excluded.rate_multiplier,
                price_reference_mode = excluded.price_reference_mode,
                official_price_multiplier = excluded.official_price_multiplier,
                billing_type = excluded.billing_type,
                allowed_origin = excluded.allowed_origin,
                metadata = excluded.metadata,
                deleted_at = NULL,
                deleted_by = NULL
            "#,
        )
        .bind(stable_default_admin_upstream_account_group_uuid(group))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(DEFAULT_ADMIN_DATA_SCOPE)
        .bind(ACTIVE_STATUS)
        .bind(default_admin_upstream_account_group_metadata(catalog, *group))
        .bind(group.group_code)
        .bind(group.group_name)
        .bind(format!(
            "Default {} routing group backed by {}",
            group.supplier_code, group.resource_group_code
        ))
        .bind(group.supplier_code)
        .bind(group.group_type)
        .bind(stable_default_admin_account_group_id(group))
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn import_sqlite_default_admin_upstream_account_account_group_bindings(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for group in default_admin_upstream_account_groups() {
        let account_id = sqlite_seed_account_id(tx, group.account_code).await?;
        let account_group_id = sqlite_seed_account_group_id(tx, group.group_code).await?;
        let resource_group_id =
            sqlite_seed_resource_group_id(tx, group.resource_group_code).await?;
        import_sqlite_default_admin_upstream_account_group_member(
            tx,
            catalog,
            *group,
            account_group_id,
            account_id,
        )
        .await?;
        import_sqlite_default_admin_channel_resource(
            tx,
            catalog,
            *group,
            account_id,
            resource_group_id,
        )
        .await?;
        import_sqlite_default_admin_upstream_account_group_resource(
            tx,
            catalog,
            *group,
            account_group_id,
            resource_group_id,
        )
        .await?;
    }
    Ok(())
}

async fn import_postgres_default_admin_upstream_account_account_group_bindings(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
) -> Result<(), sqlx::Error> {
    for group in default_admin_upstream_account_groups() {
        let account_id = postgres_seed_account_id(tx, group.account_code).await?;
        let account_group_id = postgres_seed_account_group_id(tx, group.group_code).await?;
        let resource_group_id =
            postgres_seed_resource_group_id(tx, group.resource_group_code).await?;
        import_postgres_default_admin_upstream_account_group_member(
            tx,
            catalog,
            *group,
            account_group_id,
            account_id,
        )
        .await?;
        import_postgres_default_admin_channel_resource(
            tx,
            catalog,
            *group,
            account_id,
            resource_group_id,
        )
        .await?;
        import_postgres_default_admin_upstream_account_group_resource(
            tx,
            catalog,
            *group,
            account_group_id,
            resource_group_id,
        )
        .await?;
    }
    Ok(())
}

async fn import_sqlite_default_admin_upstream_account_group_member(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
    account_group_id: i64,
    account_id: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_group_member
            (uuid, tenant_id, organization_id, data_scope, status, metadata,
             account_group_id, account_id, priority, weight, enabled, id)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(tenant_id, organization_id, account_group_id, account_id) DO UPDATE SET
            data_scope = excluded.data_scope,
            status = excluded.status,
            priority = excluded.priority,
            weight = excluded.weight,
            enabled = excluded.enabled,
            metadata = excluded.metadata,
            deleted_at = NULL,
            deleted_by = NULL
        "#,
    )
    .bind(stable_default_admin_upstream_account_group_member_uuid(&group))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(DEFAULT_ADMIN_DATA_SCOPE)
    .bind(ACTIVE_STATUS)
    .bind(default_admin_upstream_account_group_member_metadata(catalog, group))
    .bind(account_group_id)
    .bind(account_id)
    .bind(group.priority)
    .bind(group.weight)
    .bind(stable_default_admin_upstream_account_group_member_id(&group))
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn import_postgres_default_admin_upstream_account_group_member(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
    account_group_id: i64,
    account_id: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_group_member
            (uuid, tenant_id, organization_id, data_scope, status, metadata,
             account_group_id, account_id, priority, weight, enabled, id)
        VALUES
            ($1, $2::bigint, $3::bigint, $4, $5, $6::jsonb, $7, $8, $9, $10, TRUE, $11)
        ON CONFLICT(tenant_id, organization_id, account_group_id, account_id) DO UPDATE SET
            data_scope = excluded.data_scope,
            status = excluded.status,
            priority = excluded.priority,
            weight = excluded.weight,
            enabled = excluded.enabled,
            metadata = excluded.metadata,
            deleted_at = NULL,
            deleted_by = NULL
        "#,
    )
    .bind(stable_default_admin_upstream_account_group_member_uuid(&group))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(DEFAULT_ADMIN_DATA_SCOPE)
    .bind(ACTIVE_STATUS)
    .bind(default_admin_upstream_account_group_member_metadata(catalog, group))
    .bind(account_group_id)
    .bind(account_id)
    .bind(group.priority)
    .bind(group.weight)
    .bind(stable_default_admin_upstream_account_group_member_id(&group))
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn import_sqlite_default_admin_channel_resource(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
    account_id: i64,
    resource_group_id: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (uuid, tenant_id, organization_id, data_scope, status, metadata,
             account_id, supplier_code, account_code, resource_id, resource_code,
             resource_group_id, resource_group_code, grant_type, priority, weight, id)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, '', ?, ?, 'allow', ?, ?, ?)
        ON CONFLICT(tenant_id, organization_id, account_id, resource_code, resource_group_code)
        DO UPDATE SET
            data_scope = excluded.data_scope,
            status = excluded.status,
            supplier_code = excluded.supplier_code,
            account_code = excluded.account_code,
            resource_id = excluded.resource_id,
            resource_group_id = excluded.resource_group_id,
            grant_type = excluded.grant_type,
            priority = excluded.priority,
            weight = excluded.weight,
            metadata = excluded.metadata,
            deleted_at = NULL,
            deleted_by = NULL
        "#,
    )
    .bind(stable_default_admin_channel_resource_uuid(&group))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(DEFAULT_ADMIN_DATA_SCOPE)
    .bind(ACTIVE_STATUS)
    .bind(default_admin_channel_resource_metadata(catalog, group))
    .bind(account_id)
    .bind(group.supplier_code)
    .bind(group.account_code)
    .bind(resource_group_id)
    .bind(group.resource_group_code)
    .bind(group.priority)
    .bind(group.weight)
    .bind(stable_default_admin_channel_resource_id(&group))
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn import_postgres_default_admin_channel_resource(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
    account_id: i64,
    resource_group_id: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (uuid, tenant_id, organization_id, data_scope, status, metadata,
             account_id, supplier_code, account_code, resource_id, resource_code,
             resource_group_id, resource_group_code, grant_type, priority, weight, id)
        VALUES
            ($1, $2::bigint, $3::bigint, $4, $5, $6::jsonb, $7, $8, $9, NULL, '', $10,
             $11, 'allow', $12, $13, $14)
        ON CONFLICT(tenant_id, organization_id, account_id, resource_code, resource_group_code)
        DO UPDATE SET
            data_scope = excluded.data_scope,
            status = excluded.status,
            supplier_code = excluded.supplier_code,
            account_code = excluded.account_code,
            resource_id = excluded.resource_id,
            resource_group_id = excluded.resource_group_id,
            grant_type = excluded.grant_type,
            priority = excluded.priority,
            weight = excluded.weight,
            metadata = excluded.metadata,
            deleted_at = NULL,
            deleted_by = NULL
        "#,
    )
    .bind(stable_default_admin_channel_resource_uuid(&group))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(DEFAULT_ADMIN_DATA_SCOPE)
    .bind(ACTIVE_STATUS)
    .bind(default_admin_channel_resource_metadata(catalog, group))
    .bind(account_id)
    .bind(group.supplier_code)
    .bind(group.account_code)
    .bind(resource_group_id)
    .bind(group.resource_group_code)
    .bind(group.priority)
    .bind(group.weight)
    .bind(stable_default_admin_channel_resource_id(&group))
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn import_sqlite_default_admin_upstream_account_group_resource(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
    account_group_id: i64,
    resource_group_id: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_group_resource
            (uuid, tenant_id, organization_id, data_scope, status, metadata,
             account_group_id, resource_id, resource_code, resource_group_id,
             resource_group_code, grant_type, priority, id)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, NULL, '', ?, ?, 'allow', ?, ?)
        ON CONFLICT(tenant_id, organization_id, account_group_id, resource_code, resource_group_code)
        DO UPDATE SET
            data_scope = excluded.data_scope,
            status = excluded.status,
            resource_id = excluded.resource_id,
            resource_group_id = excluded.resource_group_id,
            grant_type = excluded.grant_type,
            priority = excluded.priority,
            metadata = excluded.metadata,
            deleted_at = NULL,
            deleted_by = NULL
        "#,
    )
    .bind(stable_default_admin_upstream_account_group_resource_uuid(&group))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(DEFAULT_ADMIN_DATA_SCOPE)
    .bind(ACTIVE_STATUS)
    .bind(default_admin_upstream_account_group_resource_metadata(catalog, group))
    .bind(account_group_id)
    .bind(resource_group_id)
    .bind(group.resource_group_code)
    .bind(group.priority)
    .bind(stable_default_admin_upstream_account_group_resource_id(&group))
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn import_postgres_default_admin_upstream_account_group_resource(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
    account_group_id: i64,
    resource_group_id: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_group_resource
            (uuid, tenant_id, organization_id, data_scope, status, metadata,
             account_group_id, resource_id, resource_code, resource_group_id,
             resource_group_code, grant_type, priority, id)
        VALUES
            ($1, $2::bigint, $3::bigint, $4, $5, $6::jsonb, $7, NULL, '', $8, $9,
             'allow', $10, $11)
        ON CONFLICT(tenant_id, organization_id, account_group_id, resource_code, resource_group_code)
        DO UPDATE SET
            data_scope = excluded.data_scope,
            status = excluded.status,
            resource_id = excluded.resource_id,
            resource_group_id = excluded.resource_group_id,
            grant_type = excluded.grant_type,
            priority = excluded.priority,
            metadata = excluded.metadata,
            deleted_at = NULL,
            deleted_by = NULL
        "#,
    )
    .bind(stable_default_admin_upstream_account_group_resource_uuid(&group))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(DEFAULT_ADMIN_DATA_SCOPE)
    .bind(ACTIVE_STATUS)
    .bind(default_admin_upstream_account_group_resource_metadata(catalog, group))
    .bind(account_group_id)
    .bind(resource_group_id)
    .bind(group.resource_group_code)
    .bind(group.priority)
    .bind(stable_default_admin_upstream_account_group_resource_id(&group))
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn sqlite_seed_account_id(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    account_code: &str,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT id FROM ai_channel WHERE tenant_id = ? AND organization_id = ? AND account_code = ? AND deleted_at IS NULL LIMIT 1",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(account_code)
    .fetch_one(&mut **tx)
    .await
}

async fn postgres_seed_account_id(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    account_code: &str,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT id FROM ai_channel WHERE tenant_id = $1::bigint AND organization_id = $2::bigint AND account_code = $3 AND deleted_at IS NULL LIMIT 1",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(account_code)
    .fetch_one(&mut **tx)
    .await
}

async fn sqlite_seed_account_group_id(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    group_code: &str,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT id FROM ai_upstream_account_group WHERE tenant_id = ? AND organization_id = ? AND group_code = ? AND deleted_at IS NULL LIMIT 1",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(group_code)
    .fetch_one(&mut **tx)
    .await
}

async fn postgres_seed_account_group_id(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    group_code: &str,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT id FROM ai_upstream_account_group WHERE tenant_id = $1::bigint AND organization_id = $2::bigint AND group_code = $3 AND deleted_at IS NULL LIMIT 1",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(group_code)
    .fetch_one(&mut **tx)
    .await
}

async fn sqlite_seed_resource_group_id(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    group_code: &str,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT id FROM ai_resource_group WHERE tenant_id = 0 AND organization_id = 0 AND group_code = ? AND status = 1 AND deleted_at IS NULL LIMIT 1",
    )
    .bind(group_code)
    .fetch_one(&mut **tx)
    .await
}

async fn postgres_seed_resource_group_id(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    group_code: &str,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT id FROM ai_resource_group WHERE tenant_id = 0 AND organization_id = 0 AND group_code = $1 AND status = 1 AND deleted_at IS NULL LIMIT 1",
    )
    .bind(group_code)
    .fetch_one(&mut **tx)
    .await
}

fn resource_bundles() -> Result<Vec<ResourceBundle>, AiRoutingSeedLoadError> {
    [
        CORE_RESOURCES_JSON,
        OPENAI_RESOURCES_JSON,
        VENDOR_NATIVE_RESOURCES_JSON,
    ]
    .into_iter()
    .map(|payload| {
        let bundle = serde_json::from_str::<ResourceBundle>(payload)?;
        validate_bundle_kind(&bundle.kind, "ai-routing.resources")?;
        Ok(bundle)
    })
    .collect()
}

fn resource_group_bundles() -> Result<Vec<ResourceGroupBundle>, AiRoutingSeedLoadError> {
    [
        ADMIN_API_GROUPS_JSON,
        OFFICIAL_PROVIDER_GROUPS_JSON,
        RELAY_PROVIDER_GROUPS_JSON,
    ]
    .into_iter()
    .map(|payload| {
        let bundle = serde_json::from_str::<ResourceGroupBundle>(payload)?;
        validate_bundle_kind(&bundle.kind, "ai-routing.resource-groups")?;
        Ok(bundle)
    })
    .collect()
}

fn validate_catalog(catalog: &AiRoutingSeedCatalog) -> Result<(), AiRoutingSeedLoadError> {
    if catalog.manifest.catalog_code != "sdkwork-ai-routing"
        || catalog.manifest.schema_version != "ai-routing-seed.v1"
        || catalog.manifest.source != "bundled"
    {
        return Err(AiRoutingSeedLoadError::Validation(
            "invalid AI routing seed manifest identity".to_owned(),
        ));
    }
    validate_manifest_files(catalog)?;
    let resource_codes = validate_unique(
        catalog
            .resources
            .iter()
            .map(|item| item.resource_code.as_str()),
        "AI routing resource code",
    )?;
    let group_codes = validate_unique(
        catalog
            .resource_groups
            .iter()
            .map(|item| item.group_code.as_str()),
        "AI routing resource group code",
    )?;
    for resource in &catalog.resources {
        if resource.resource_code.trim().is_empty()
            || resource.resource_type.trim().is_empty()
            || resource.display_name.trim().is_empty()
            || resource.capability.trim().is_empty()
            || resource.capabilities.is_empty()
        {
            return Err(AiRoutingSeedLoadError::Validation(format!(
                "invalid AI routing resource `{}`",
                resource.resource_code
            )));
        }
        if resource.resource_type == "api_endpoint" {
            let api_code = resource.api_code.as_deref().unwrap_or_default();
            if api_code.trim().is_empty() {
                return Err(AiRoutingSeedLoadError::Validation(format!(
                    "AI routing API endpoint resource `{}` must define apiCode",
                    resource.resource_code
                )));
            }
        }
    }
    for group in &catalog.resource_groups {
        if group.items.is_empty()
            && group.group_code != "api.all"
            && group.selection_mode != "dynamic_all_api"
        {
            return Err(AiRoutingSeedLoadError::Validation(format!(
                "AI routing resource group `{}` must not be empty",
                group.group_code
            )));
        }
        for item in &group.items {
            match item.item_type.as_str() {
                "resource" => {
                    let code = item.resource_code.as_deref().unwrap_or_default();
                    if !resource_codes.contains(code) {
                        return Err(AiRoutingSeedLoadError::Validation(format!(
                            "AI routing resource group `{}` references unknown resource `{code}`",
                            group.group_code
                        )));
                    }
                }
                "group" => {
                    let code = item.group_code.as_deref().unwrap_or_default();
                    if !group_codes.contains(code) {
                        return Err(AiRoutingSeedLoadError::Validation(format!(
                            "AI routing resource group `{}` references unknown group `{code}`",
                            group.group_code
                        )));
                    }
                }
                _ => {
                    return Err(AiRoutingSeedLoadError::Validation(format!(
                        "AI routing resource group `{}` contains unsupported item type `{}`",
                        group.group_code, item.item_type
                    )));
                }
            }
        }
    }
    Ok(())
}

fn validate_manifest_files(catalog: &AiRoutingSeedCatalog) -> Result<(), AiRoutingSeedLoadError> {
    if catalog.manifest.sections.resources
        != [
            "core-resources.json",
            "openai-resources.json",
            "vendor-native-resources.json",
        ]
    {
        return Err(AiRoutingSeedLoadError::Validation(
            "AI routing resources manifest section is out of sync".to_owned(),
        ));
    }
    if catalog.manifest.sections.resource_groups
        != [
            "admin-api-groups.json",
            "official-provider-groups.json",
            "relay-provider-groups.json",
        ]
    {
        return Err(AiRoutingSeedLoadError::Validation(
            "AI routing resource groups manifest section is out of sync".to_owned(),
        ));
    }
    Ok(())
}

fn validate_unique<'a, I>(
    values: I,
    label: &str,
) -> Result<BTreeSet<&'a str>, AiRoutingSeedLoadError>
where
    I: IntoIterator<Item = &'a str>,
{
    let mut set = BTreeSet::new();
    for value in values {
        if value.trim().is_empty() || !set.insert(value) {
            return Err(AiRoutingSeedLoadError::Validation(format!(
                "{label} must be unique and non-empty"
            )));
        }
    }
    Ok(set)
}

fn validate_bundle_kind(kind: &str, expected: &str) -> Result<(), AiRoutingSeedLoadError> {
    if kind == expected {
        return Ok(());
    }
    Err(AiRoutingSeedLoadError::Validation(format!(
        "AI routing seed bundle kind `{kind}` must be `{expected}`"
    )))
}

fn api_endpoint_resources(catalog: &AiRoutingSeedCatalog) -> Vec<&ResourceSeed> {
    catalog
        .resources
        .iter()
        .filter(|resource| resource.resource_type == "api_endpoint")
        .collect()
}

fn default_admin_channels() -> &'static [DefaultAdminChannelSeed] {
    &DEFAULT_ADMIN_CHANNELS
}

fn default_admin_upstream_account_groups() -> &'static [DefaultAdminUpstreamAccountGroupSeed] {
    &DEFAULT_ADMIN_CHANNEL_GROUPS
}

fn resource_upsert_sqlite() -> &'static str {
    r#"
    INSERT INTO ai_resource
        (uuid, tenant_id, organization_id, data_scope, status, metadata, resource_code, resource_type, display_name, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model, resource_schema, metadata_schema, description, sort_order, id)
    VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
        resource_type = excluded.resource_type,
        display_name = excluded.display_name,
        vendor_code = excluded.vendor_code,
        modality_code = excluded.modality_code,
        api_code = excluded.api_code,
        catalog_key = excluded.catalog_key,
        model = excluded.model,
        provider_native_model = excluded.provider_native_model,
        resource_schema = excluded.resource_schema,
        metadata_schema = excluded.metadata_schema,
        description = excluded.description,
        sort_order = excluded.sort_order,
        metadata = excluded.metadata,
        deleted_at = NULL,
        deleted_by = NULL,
        status = excluded.status
    "#
}

fn resource_upsert_postgres() -> &'static str {
    r#"
    INSERT INTO ai_resource
        (uuid, tenant_id, organization_id, data_scope, status, metadata, resource_code, resource_type, display_name, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model, resource_schema, metadata_schema, description, sort_order, id)
    VALUES
        ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb, $18, $19, $20)
    ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
        resource_type = excluded.resource_type,
        display_name = excluded.display_name,
        vendor_code = excluded.vendor_code,
        modality_code = excluded.modality_code,
        api_code = excluded.api_code,
        catalog_key = excluded.catalog_key,
        model = excluded.model,
        provider_native_model = excluded.provider_native_model,
        resource_schema = excluded.resource_schema,
        metadata_schema = excluded.metadata_schema,
        description = excluded.description,
        sort_order = excluded.sort_order,
        metadata = excluded.metadata,
        deleted_at = NULL,
        deleted_by = NULL,
        status = excluded.status
    "#
}

fn group_item_upsert_sqlite() -> &'static str {
    r#"
    INSERT INTO ai_resource_group_item
        (uuid, tenant_id, organization_id, data_scope, status, metadata, resource_group_id, resource_group_code, item_type, resource_code, child_resource_group_code, item_role, sort_order, id)
    VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id, organization_id, resource_group_id, item_type, resource_code, child_resource_group_code) DO UPDATE SET
        resource_group_code = excluded.resource_group_code,
        item_role = excluded.item_role,
        sort_order = excluded.sort_order,
        metadata = excluded.metadata,
        deleted_at = NULL,
        deleted_by = NULL,
        status = excluded.status
    "#
}

fn group_item_upsert_postgres() -> &'static str {
    r#"
    INSERT INTO ai_resource_group_item
        (uuid, tenant_id, organization_id, data_scope, status, metadata, resource_group_id, resource_group_code, item_type, resource_code, child_resource_group_code, item_role, sort_order, id)
    VALUES
        ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT(tenant_id, organization_id, resource_group_id, item_type, resource_code, child_resource_group_code) DO UPDATE SET
        resource_group_code = excluded.resource_group_code,
        item_role = excluded.item_role,
        sort_order = excluded.sort_order,
        metadata = excluded.metadata,
        deleted_at = NULL,
        deleted_by = NULL,
        status = excluded.status
    "#
}

async fn sqlite_group_ids(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
) -> Result<BTreeMap<String, i64>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, group_code FROM ai_resource_group WHERE tenant_id = 0 AND organization_id = 0",
    )
    .fetch_all(&mut **tx)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| (row.get::<String, _>("group_code"), row.get::<i64, _>("id")))
        .collect())
}

async fn postgres_group_ids(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
) -> Result<BTreeMap<String, i64>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, group_code FROM ai_resource_group WHERE tenant_id = 0 AND organization_id = 0",
    )
    .fetch_all(&mut **tx)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| (row.get::<String, _>("group_code"), row.get::<i64, _>("id")))
        .collect())
}

fn expected_resource_codes(catalog: &AiRoutingSeedCatalog) -> BTreeSet<String> {
    catalog
        .resources
        .iter()
        .map(|item| item.resource_code.clone())
        .collect()
}

fn expected_group_codes(catalog: &AiRoutingSeedCatalog) -> BTreeSet<String> {
    catalog
        .resource_groups
        .iter()
        .map(|item| item.group_code.clone())
        .collect()
}

fn expected_endpoint_codes(catalog: &AiRoutingSeedCatalog) -> BTreeSet<String> {
    api_endpoint_resources(catalog)
        .into_iter()
        .filter_map(|item| item.api_code.clone())
        .collect()
}

fn expected_default_admin_account_codes() -> BTreeSet<String> {
    default_admin_channels()
        .iter()
        .map(|channel| channel.account_code.to_owned())
        .collect()
}

fn expected_default_admin_account_group_codes() -> BTreeSet<String> {
    default_admin_upstream_account_groups()
        .iter()
        .map(|group| group.group_code.to_owned())
        .collect()
}

fn expected_resource_group_item_count(catalog: &AiRoutingSeedCatalog) -> i64 {
    catalog
        .resource_groups
        .iter()
        .map(|group| group.items.len() as i64)
        .sum()
}

async fn sqlite_resource_group_item_count(
    pool: &SqlitePool,
    catalog: &AiRoutingSeedCatalog,
) -> Result<i64, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT metadata FROM ai_resource_group_item WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter(|row| {
            row.try_get::<String, _>("metadata")
                .ok()
                .and_then(|value| serde_json::from_str::<Value>(&value).ok())
                .and_then(|value| {
                    value
                        .get("catalogCode")
                        .and_then(Value::as_str)
                        .map(str::to_owned)
                })
                .is_some_and(|catalog_code| catalog_code == catalog.manifest.catalog_code)
        })
        .count() as i64)
}

async fn postgres_resource_group_item_count(
    pool: &PgPool,
    catalog: &AiRoutingSeedCatalog,
) -> Result<i64, sqlx::Error> {
    let row = sqlx::query(
        r#"
        SELECT (COUNT(1))::bigint AS count
        FROM ai_resource_group_item
        WHERE tenant_id = 0
          AND organization_id = 0
          AND status = 1
          AND deleted_at IS NULL
          AND metadata ->> 'catalogCode' = $1
        "#,
    )
    .bind(&catalog.manifest.catalog_code)
    .fetch_one(pool)
    .await?;
    Ok(row.get::<i64, _>("count"))
}

async fn sqlite_string_set(
    pool: &SqlitePool,
    query: &str,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(query).fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn postgres_string_set(pool: &PgPool, query: &str) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(query).fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn sqlite_default_admin_account_codes(
    pool: &SqlitePool,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT account_code
        FROM ai_channel
        WHERE tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn sqlite_default_admin_channel_credential_codes(
    pool: &SqlitePool,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT c.account_code
        FROM ai_channel c
        JOIN ai_channel_credential cc
          ON cc.account_id = c.id
         AND cc.tenant_id = c.tenant_id
         AND cc.organization_id = c.organization_id
        WHERE c.tenant_id = ?
          AND c.organization_id = ?
          AND c.deleted_at IS NULL
          AND cc.status = 1
          AND cc.deleted_at IS NULL
          AND NULLIF(cc.base_url, '') IS NOT NULL
          AND NULLIF(cc.credential_ref, '') IS NOT NULL
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn sqlite_default_admin_account_group_codes(
    pool: &SqlitePool,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT group_code
        FROM ai_upstream_account_group
        WHERE tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn sqlite_default_admin_upstream_account_group_binding_codes(
    pool: &SqlitePool,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT DISTINCT g.group_code
        FROM ai_upstream_account_group g
        JOIN ai_upstream_account_group_member m
          ON m.tenant_id = g.tenant_id
         AND m.organization_id = g.organization_id
         AND m.account_group_id = g.id
         AND m.deleted_at IS NULL
        JOIN ai_channel c
          ON c.tenant_id = m.tenant_id
         AND c.organization_id = m.organization_id
         AND c.id = m.account_id
         AND c.account_code = 'openai-default'
         AND c.deleted_at IS NULL
        JOIN ai_channel_resource cr
          ON cr.tenant_id = c.tenant_id
         AND cr.organization_id = c.organization_id
         AND cr.account_id = c.id
         AND cr.resource_group_code = 'official.openai.full'
         AND cr.deleted_at IS NULL
        JOIN ai_upstream_account_group_resource gr
          ON gr.tenant_id = g.tenant_id
         AND gr.organization_id = g.organization_id
         AND gr.account_group_id = g.id
         AND gr.resource_group_code = 'official.openai.full'
         AND gr.deleted_at IS NULL
        WHERE g.tenant_id = ?
          AND g.organization_id = ?
          AND g.deleted_at IS NULL
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn postgres_default_admin_account_codes(
    pool: &PgPool,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT account_code
        FROM ai_channel
        WHERE tenant_id = $1::bigint
          AND organization_id = $2::bigint
          AND deleted_at IS NULL
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn postgres_default_admin_channel_credential_codes(
    pool: &PgPool,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT c.account_code
        FROM ai_channel c
        JOIN ai_channel_credential cc
          ON cc.account_id = c.id
         AND cc.tenant_id = c.tenant_id
         AND cc.organization_id = c.organization_id
        WHERE c.tenant_id = $1::bigint
          AND c.organization_id = $2::bigint
          AND c.deleted_at IS NULL
          AND cc.status = 1
          AND cc.deleted_at IS NULL
          AND NULLIF(cc.base_url, '') IS NOT NULL
          AND NULLIF(cc.credential_ref, '') IS NOT NULL
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn postgres_default_admin_account_group_codes(
    pool: &PgPool,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT group_code
        FROM ai_upstream_account_group
        WHERE tenant_id = $1::bigint
          AND organization_id = $2::bigint
          AND deleted_at IS NULL
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn postgres_default_admin_upstream_account_group_binding_codes(
    pool: &PgPool,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT DISTINCT g.group_code
        FROM ai_upstream_account_group g
        JOIN ai_upstream_account_group_member m
          ON m.tenant_id = g.tenant_id
         AND m.organization_id = g.organization_id
         AND m.account_group_id = g.id
         AND m.deleted_at IS NULL
        JOIN ai_channel c
          ON c.tenant_id = m.tenant_id
         AND c.organization_id = m.organization_id
         AND c.id = m.account_id
         AND c.account_code = 'openai-default'
         AND c.deleted_at IS NULL
        JOIN ai_channel_resource cr
          ON cr.tenant_id = c.tenant_id
         AND cr.organization_id = c.organization_id
         AND cr.account_id = c.id
         AND cr.resource_group_code = 'official.openai.full'
         AND cr.deleted_at IS NULL
        JOIN ai_upstream_account_group_resource gr
          ON gr.tenant_id = g.tenant_id
         AND gr.organization_id = g.organization_id
         AND gr.account_group_id = g.id
         AND gr.resource_group_code = 'official.openai.full'
         AND gr.deleted_at IS NULL
        WHERE g.tenant_id = $1::bigint
          AND g.organization_id = $2::bigint
          AND g.deleted_at IS NULL
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

fn resource_item_code(item: &ResourceGroupItemSeed) -> &str {
    if item.item_type == "resource" {
        item.resource_code.as_deref().unwrap_or("")
    } else {
        ""
    }
}

fn child_group_item_code(item: &ResourceGroupItemSeed) -> &str {
    if item.item_type == "group" {
        item.group_code.as_deref().unwrap_or("")
    } else {
        ""
    }
}

fn resource_metadata(item: &ResourceSeed) -> Value {
    serde_json::json!({
        "capability": item.capability,
        "capabilities": item.capabilities,
        "resourceBillingCategory": resource_billing_category(item),
        "defaultBillingMeter": default_billing_meter_code(item),
    })
}

fn resource_schema(item: &ResourceSeed) -> String {
    serde_json::json!({
        "compositionMode": match item.resource_type.as_str() {
            "bundle" => "all",
            _ => "single",
        },
        "capabilities": item.capabilities,
        "resourceBillingCategory": resource_billing_category(item),
        "defaultBillingMeter": default_billing_meter_code(item),
    })
    .to_string()
}

fn metadata_schema(item: &ResourceSeed) -> String {
    serde_json::json!({
        "capability": item.capability,
        "capabilities": item.capabilities,
    })
    .to_string()
}

fn resource_description(item: &ResourceSeed) -> String {
    format!("Bundled AI routing {} resource", item.display_name)
}

fn resource_billing_category(item: &ResourceSeed) -> &'static str {
    match item.modality_code.as_deref().unwrap_or_default() {
        "image" => "image",
        "video" => "video",
        "audio" => "audio",
        "music" => "music",
        "sfx" => "sfx",
        "network" => "api_resource",
        _ => "model",
    }
}

fn default_billing_meter_code(item: &ResourceSeed) -> &'static str {
    match item.modality_code.as_deref().unwrap_or_default() {
        "image" => "image_result",
        "video" => "video_result",
        "audio" => "audio_input_second",
        "music" => "music_output_second",
        "sfx" => "sfx_result",
        "network" => "api_request",
        "embedding" => "embedding_input_token",
        _ => "llm_input_token",
    }
}

fn endpoint_metadata(catalog: &AiRoutingSeedCatalog, item: &EndpointSeedDefinition<'_>) -> String {
    seed_metadata(
        catalog,
        "api_endpoint",
        item.api_code(),
        serde_json::json!({
            "resourceCode": &item.resource.resource_code,
            "vendorCode": &item.resource.vendor_code,
            "modalityCode": &item.resource.modality_code,
            "capability": &item.resource.capability,
            "capabilities": &item.resource.capabilities,
        }),
    )
}

fn default_admin_channel_metadata(
    catalog: &AiRoutingSeedCatalog,
    channel: DefaultAdminChannelSeed,
) -> String {
    seed_metadata(
        catalog,
        "default_admin_channel",
        channel.account_code,
        serde_json::json!({
            "tenantId": DEFAULT_IAM_TENANT_ID,
            "organizationId": DEFAULT_IAM_ORGANIZATION_ID,
            "providerCode": channel.supplier_code,
            "channelType": channel.channel_type,
            "protocolCode": channel.protocol_code,
            "baseUrl": channel.base_url,
            "initialStatus": "disabled",
        }),
    )
}

fn default_admin_channel_credential_metadata(
    catalog: &AiRoutingSeedCatalog,
    channel: DefaultAdminChannelSeed,
) -> String {
    seed_metadata(
        catalog,
        "default_admin_channel_credential",
        channel.account_code,
        serde_json::json!({
            "tenantId": DEFAULT_IAM_TENANT_ID,
            "organizationId": DEFAULT_IAM_ORGANIZATION_ID,
            "channelCode": channel.account_code,
            "providerCode": channel.supplier_code,
            "baseUrl": channel.base_url,
            "secretRef": channel.credential_ref(),
            "initialStatus": "active",
        }),
    )
}

fn default_admin_upstream_account_group_metadata(
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
) -> String {
    seed_metadata(
        catalog,
        "default_admin_upstream_account_group",
        group.group_code,
        serde_json::json!({
            "tenantId": DEFAULT_IAM_TENANT_ID,
            "organizationId": DEFAULT_IAM_ORGANIZATION_ID,
            "groupCode": group.group_code,
            "providerCode": group.supplier_code,
            "channelCode": group.account_code,
            "resourceGroupCode": group.resource_group_code,
            "initialStatus": "active",
        }),
    )
}

fn default_admin_upstream_account_group_member_metadata(
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
) -> String {
    seed_metadata(
        catalog,
        "default_admin_upstream_account_group_member",
        group.group_code,
        serde_json::json!({
            "tenantId": DEFAULT_IAM_TENANT_ID,
            "organizationId": DEFAULT_IAM_ORGANIZATION_ID,
            "groupCode": group.group_code,
            "channelCode": group.account_code,
            "initialStatus": "active",
        }),
    )
}

fn default_admin_channel_resource_metadata(
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
) -> String {
    seed_metadata(
        catalog,
        "default_admin_channel_resource",
        group.account_code,
        serde_json::json!({
            "tenantId": DEFAULT_IAM_TENANT_ID,
            "organizationId": DEFAULT_IAM_ORGANIZATION_ID,
            "channelCode": group.account_code,
            "resourceGroupCode": group.resource_group_code,
            "initialStatus": "active",
        }),
    )
}

fn default_admin_upstream_account_group_resource_metadata(
    catalog: &AiRoutingSeedCatalog,
    group: DefaultAdminUpstreamAccountGroupSeed,
) -> String {
    seed_metadata(
        catalog,
        "default_admin_upstream_account_group_resource",
        group.group_code,
        serde_json::json!({
            "tenantId": DEFAULT_IAM_TENANT_ID,
            "organizationId": DEFAULT_IAM_ORGANIZATION_ID,
            "groupCode": group.group_code,
            "resourceGroupCode": group.resource_group_code,
            "initialStatus": "active",
        }),
    )
}

fn default_protocol_code(item: &ResourceSeed) -> &'static str {
    match item.vendor_code.as_deref().unwrap_or_default() {
        "openai" | "openai_compatible" => "openai_compatible",
        _ => "vendor_native",
    }
}

fn default_path_template(api_code: &str) -> String {
    format!("/v1/{}", api_code.trim().replace('.', "/"))
}

fn default_endpoint_method(api_code: &str) -> &'static str {
    match api_code {
        "openai.models"
        | "openai.containers.files.retrieve"
        | "openai.containers.files.content"
        | "kling.task_query"
        | "jimeng.task_query"
        | "volcengine.task_query"
        | "vidu.task_query" => "GET",
        "openai.containers.delete" | "openai.containers.files.delete" => "DELETE",
        _ => "POST",
    }
}

fn seed_metadata(
    catalog: &AiRoutingSeedCatalog,
    item_type: &str,
    item_code: &str,
    extra: Value,
) -> String {
    serde_json::json!({
        "catalogCode": catalog.manifest.catalog_code,
        "schemaVersion": catalog.manifest.schema_version,
        "source": catalog.manifest.source,
        "itemType": item_type,
        "itemCode": item_code,
        "sourceHash": source_hash(),
        "extra": extra,
    })
    .to_string()
}

fn stable_group_item_uuid(group: &ResourceGroupSeed, item: &ResourceGroupItemSeed) -> String {
    stable_seed_uuid(
        "sdk-ai-resource-group-item",
        &[
            &group.group_code,
            &item.item_type,
            item.resource_code.as_deref().unwrap_or_default(),
            item.group_code.as_deref().unwrap_or_default(),
        ],
    )
}

fn stable_group_item_id(group: &ResourceGroupSeed, item: &ResourceGroupItemSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-resource-group-item-id",
        &[
            &group.group_code,
            &item.item_type,
            item.resource_code.as_deref().unwrap_or_default(),
            item.group_code.as_deref().unwrap_or_default(),
        ],
    )
}

fn stable_default_admin_account_id(channel: &DefaultAdminChannelSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-channel-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            channel.account_code,
        ],
    )
}

fn stable_default_admin_channel_credential_id(channel: &DefaultAdminChannelSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-channel-credential-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            channel.account_code,
            channel.supplier_code,
        ],
    )
}

fn stable_default_admin_upstream_account_group_uuid(group: &DefaultAdminUpstreamAccountGroupSeed) -> String {
    stable_seed_uuid(
        "sdk-ai-channel-group",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            group.group_code,
        ],
    )
}

fn stable_default_admin_account_group_id(group: &DefaultAdminUpstreamAccountGroupSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-channel-group-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            group.group_code,
        ],
    )
}

fn stable_default_admin_upstream_account_group_member_uuid(group: &DefaultAdminUpstreamAccountGroupSeed) -> String {
    stable_seed_uuid(
        "sdk-ai-channel-group-member",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            group.group_code,
            group.account_code,
        ],
    )
}

fn stable_default_admin_upstream_account_group_member_id(group: &DefaultAdminUpstreamAccountGroupSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-channel-group-member-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            group.group_code,
            group.account_code,
        ],
    )
}

fn stable_default_admin_channel_resource_uuid(group: &DefaultAdminUpstreamAccountGroupSeed) -> String {
    stable_seed_uuid(
        "sdk-ai-channel-resource",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            group.account_code,
            group.resource_group_code,
        ],
    )
}

fn stable_default_admin_channel_resource_id(group: &DefaultAdminUpstreamAccountGroupSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-channel-resource-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            group.account_code,
            group.resource_group_code,
        ],
    )
}

fn stable_default_admin_upstream_account_group_resource_uuid(
    group: &DefaultAdminUpstreamAccountGroupSeed,
) -> String {
    stable_seed_uuid(
        "sdk-ai-channel-group-resource",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            group.group_code,
            group.resource_group_code,
        ],
    )
}

fn stable_default_admin_upstream_account_group_resource_id(group: &DefaultAdminUpstreamAccountGroupSeed) -> i64 {
    stable_seed_id(
        "sdk-ai-channel-group-resource-id",
        &[
            &DEFAULT_IAM_TENANT_ID.to_string(),
            &DEFAULT_IAM_ORGANIZATION_ID.to_string(),
            group.group_code,
            group.resource_group_code,
        ],
    )
}

fn stable_seed_uuid(prefix: &str, parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    for part in parts {
        hasher.update([0]);
        hasher.update(part.as_bytes());
    }
    let digest = hasher.finalize();
    let digest_hex = hex::encode(digest);
    let digest_chars = MAX_SEED_UUID_LENGTH - prefix.len() - 1;
    format!("{prefix}-{}", &digest_hex[..digest_chars])
}

fn stable_seed_id(prefix: &str, parts: &[&str]) -> i64 {
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    for part in parts {
        hasher.update([0]);
        hasher.update(part.as_bytes());
    }
    let digest = hasher.finalize();
    let mut bytes = [0_u8; 8];
    bytes.copy_from_slice(&digest[..8]);
    let value = u64::from_be_bytes(bytes) & 0x3fff_ffff_ffff_ffff;
    (value as i64) + 1
}

fn stable_hash(parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    for part in parts {
        hasher.update([0]);
        hasher.update(part.as_bytes());
    }
    hex::encode(hasher.finalize())
}

fn source_hash() -> String {
    let mut hasher = Sha256::new();
    for payload in [
        MANIFEST_JSON,
        CORE_RESOURCES_JSON,
        OPENAI_RESOURCES_JSON,
        VENDOR_NATIVE_RESOURCES_JSON,
        ADMIN_API_GROUPS_JSON,
        OFFICIAL_PROVIDER_GROUPS_JSON,
        RELAY_PROVIDER_GROUPS_JSON,
        DEFAULT_ADMIN_ROUTING_TOPOLOGY_SEED_SOURCE,
    ] {
        hasher.update(payload.as_bytes());
        hasher.update([0]);
    }
    hex::encode(hasher.finalize())
}

fn json_decode_error(error: AiRoutingSeedLoadError) -> sqlx::Error {
    sqlx::Error::Protocol(format!("invalid bundled AI routing seed data: {error}"))
}
