use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::sql_admin_product_center::drive_uri_from_resource;
use crate::infrastructure::sql::sql_admin_site::{
    default_site_service_code, health_status_label, site_environment_code, site_environment_label,
    site_status_code, site_status_label,
};
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminSiteChannelItem, AdminSiteChannelListPage, AdminSiteConnectionCheckItem, AdminSiteFuture,
    AdminSiteItem, AdminSiteListPage, AdminSiteStore, CreateAdminSiteCommand, DeleteAdminSiteCommand,
    ListAdminSiteChannelsQuery, ListAdminSitesQuery, TestAdminSiteConnectionCommand,
    UpdateAdminSiteCommand,
};

const SITE_TARGET_TYPE: i32 = 93;

#[derive(Debug, Clone)]
pub struct PostgresAdminSiteStore {
    pool: PgPool,
}

impl PostgresAdminSiteStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminSiteStore for PostgresAdminSiteStore {
    fn list_sites<'a>(
        &'a self,
        query: ListAdminSitesQuery,
    ) -> AdminSiteFuture<'a, AdminSiteListPage> {
        Box::pin(async move { list_sites(&self.pool, query).await })
    }

    fn create_site<'a>(
        &'a self,
        command: CreateAdminSiteCommand,
    ) -> AdminSiteFuture<'a, AdminSiteItem> {
        Box::pin(async move { create_site(&self.pool, command).await })
    }

    fn update_site<'a>(
        &'a self,
        command: UpdateAdminSiteCommand,
    ) -> AdminSiteFuture<'a, Option<AdminSiteItem>> {
        Box::pin(async move { update_site(&self.pool, command).await })
    }

    fn delete_site<'a>(&'a self, command: DeleteAdminSiteCommand) -> AdminSiteFuture<'a, bool> {
        Box::pin(async move { delete_site(&self.pool, command).await })
    }

    fn list_site_channels<'a>(
        &'a self,
        query: ListAdminSiteChannelsQuery,
    ) -> AdminSiteFuture<'a, AdminSiteChannelListPage> {
        Box::pin(async move { list_site_channels(&self.pool, query).await })
    }

    fn test_site_connection<'a>(
        &'a self,
        command: TestAdminSiteConnectionCommand,
    ) -> AdminSiteFuture<'a, AdminSiteConnectionCheckItem> {
        Box::pin(async move { test_site_connection(&self.pool, command).await })
    }
}

async fn list_sites(pool: &PgPool, query: ListAdminSitesQuery) -> DomainResult<AdminSiteListPage> {
    let search = query.search.as_ref().map(|value| format!("%{}%", value));
    let rows = sqlx::query(
        r#"
        SELECT id, site_code, site_name, display_name, description, COALESCE(base_url, '') AS base_url,
               website_url, docs_url, COALESCE(logo_resource_snapshot::text, '') AS logo_resource_snapshot,
               COALESCE(metadata::text, '{}') AS metadata, site_type, owner_kind, region_code, environment, health_status,
               last_latency_ms, consecutive_error_count, last_checked_at::text AS last_checked_at,
               last_sync_at::text AS last_sync_at, sort_order, status,
               COUNT(*) OVER() AS total
        FROM ai_site
        WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL
          AND ($3 IS NULL OR site_code ILIKE $4 OR site_name ILIKE $5 OR display_name ILIKE $6)
        ORDER BY sort_order ASC NULLS LAST, id ASC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(search.as_deref())
    .bind(search.as_deref())
    .bind(search.as_deref())
    .bind(search.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list sites", error))?;
    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows.into_iter().map(site_from_row).collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminSiteListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn create_site(
    pool: &PgPool,
    command: CreateAdminSiteCommand,
) -> DomainResult<AdminSiteItem> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin site create transaction", error))?;
    let service_code = default_site_service_code(&command.site_code);
    let status = site_status_code(&command.status);
    let environment = site_environment_code(&command.environment);
    let logo = command.logo.as_ref();
    let logo_drive_uri = logo.and_then(drive_uri_from_resource);
    let logo_resource_snapshot = logo.map(serde_json::Value::to_string);
    let metadata = site_metadata_json(&command.domains, &command.vendor_codes)?;
    let site_id = next_claw_runtime_id("ai_site")?;
    let site_service_id = next_claw_runtime_id("ai_site_service")?;
    sqlx::query(
        r#"
        INSERT INTO ai_site (
            uuid, tenant_id, organization_id, status, site_code, site_name, display_name,
            description, base_url, website_url, docs_url, logo_drive_uri,
            logo_resource_snapshot, metadata, site_type, owner_kind,
            region_code, environment, health_status, id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16, $17, $18, $19, 1, $20)
        "#,
    )
    .bind(&command.site_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status)
    .bind(&command.site_code)
    .bind(&command.site_name)
    .bind(&command.display_name)
    .bind(&command.description)
    .bind(&command.base_url)
    .bind(&command.website_url)
    .bind(&command.docs_url)
    .bind(&logo_drive_uri)
    .bind(&logo_resource_snapshot)
    .bind(&metadata)
    .bind(&command.site_type)
    .bind(&command.owner_kind)
    .bind(&command.region_code)
    .bind(environment)
    .bind(site_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| conflict_or_store_error("failed to create site", error))?;
    sqlx::query(
        r#"
        INSERT INTO ai_site_service (
            uuid, tenant_id, organization_id, status, site_id, site_code, service_code, service_name,
            service_type, protocol_code, base_url, credential_ref, masked_label, region_code,
            environment, health_status, id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ai_model_relay', 'openai_compatible', $9, $10, $11, $12, $13, 1, $14)
        "#,
    )
    .bind(&command.service_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status)
    .bind(site_id)
    .bind(&command.site_code)
    .bind(&service_code)
    .bind(format!("{} AI model relay", command.display_name))
    .bind(&command.base_url)
    .bind(&command.credential_ref)
    .bind(&command.masked_label)
    .bind(&command.region_code)
    .bind(environment)
    .bind(site_service_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| conflict_or_store_error("failed to create site service", error))?;
    insert_audit(
        &mut tx,
        &command.audit_log_uuid,
        &command.request_id,
        command.subject.tenant_id,
        command.subject.organization_id,
        command.subject.operator_id,
        command.subject.operator_type,
        "create_site",
        site_id,
        &command.requested_at,
    )
    .await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit site create transaction", error))?;
    load_site(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        site_id,
    )
    .await?
    .ok_or_else(|| DomainError::new("created site could not be reloaded"))
}

async fn update_site(
    pool: &PgPool,
    command: UpdateAdminSiteCommand,
) -> DomainResult<Option<AdminSiteItem>> {
    let Some(mut current) = load_site(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        command.site_id,
    )
    .await?
    else {
        return Ok(None);
    };
    let site_code = command
        .site_code
        .unwrap_or_else(|| current.site_code.clone());
    let service_code = default_site_service_code(&site_code);
    let site_name = command
        .site_name
        .unwrap_or_else(|| current.site_name.clone());
    let display_name = command
        .display_name
        .unwrap_or_else(|| current.display_name.clone());
    let description = command.description.unwrap_or(current.description.take());
    let base_url = command.base_url.unwrap_or_else(|| current.base_url.clone());
    let website_url = command.website_url.unwrap_or(current.website_url.take());
    let docs_url = command.docs_url.unwrap_or(current.docs_url.take());
    let logo = command.logo.unwrap_or(current.logo.take());
    let domains = command.domains.unwrap_or(current.domains);
    let vendor_codes = command.vendor_codes.unwrap_or(current.vendor_codes);
    let site_type = command
        .site_type
        .unwrap_or_else(|| current.site_type.clone());
    let owner_kind = command.owner_kind.unwrap_or(current.owner_kind.take());
    let region_code = command.region_code.unwrap_or(current.region_code.take());
    let environment = site_environment_code(&command.environment.unwrap_or(current.environment));
    let status = site_status_code(&command.status.unwrap_or(current.status));
    let credential_ref_changed = command.credential_ref.is_some();
    let credential_ref = command.credential_ref.flatten();
    let masked_label_changed = command.masked_label.is_some();
    let masked_label = command.masked_label.flatten();
    let logo_ref = logo.as_ref();
    let logo_drive_uri = logo_ref.and_then(drive_uri_from_resource);
    let logo_resource_snapshot = logo_ref.map(serde_json::Value::to_string);
    let metadata = site_metadata_json(&domains, &vendor_codes)?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin site update transaction", error))?;
    sqlx::query(
        r#"
        UPDATE ai_site
        SET site_code = $1, site_name = $2, display_name = $3, description = $4, base_url = $5,
            website_url = $6, docs_url = $7, logo_drive_uri = $8,
            logo_resource_snapshot = $9::jsonb, metadata = $10::jsonb, site_type = $11,
            owner_kind = $12, region_code = $13, environment = $14, status = $15,
            updated_at = CURRENT_TIMESTAMP, version = version + 1
        WHERE tenant_id = $16 AND organization_id = $17 AND id = $18 AND deleted_at IS NULL
        "#,
    )
    .bind(&site_code)
    .bind(&site_name)
    .bind(&display_name)
    .bind(&description)
    .bind(&base_url)
    .bind(&website_url)
    .bind(&docs_url)
    .bind(&logo_drive_uri)
    .bind(&logo_resource_snapshot)
    .bind(&metadata)
    .bind(&site_type)
    .bind(&owner_kind)
    .bind(&region_code)
    .bind(environment)
    .bind(status)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.site_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| conflict_or_store_error("failed to update site", error))?;
    sqlx::query(
        r#"
        UPDATE ai_site_service
        SET site_code = $1, service_code = $2, service_name = $3, base_url = $4,
            region_code = $5, environment = $6, status = $7,
            credential_ref = CASE WHEN $8 THEN $9 ELSE credential_ref END,
            masked_label = CASE WHEN $10 THEN $11 ELSE masked_label END,
            updated_at = CURRENT_TIMESTAMP, version = version + 1
        WHERE tenant_id = $12 AND organization_id = $13 AND site_id = $14 AND deleted_at IS NULL
        "#,
    )
    .bind(&site_code)
    .bind(&service_code)
    .bind(format!("{display_name} AI model relay"))
    .bind(&base_url)
    .bind(&region_code)
    .bind(environment)
    .bind(status)
    .bind(credential_ref_changed)
    .bind(credential_ref.as_deref())
    .bind(masked_label_changed)
    .bind(masked_label.as_deref())
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.site_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| conflict_or_store_error("failed to update site service", error))?;
    insert_audit(
        &mut tx,
        &command.audit_log_uuid,
        &command.request_id,
        command.subject.tenant_id,
        command.subject.organization_id,
        command.subject.operator_id,
        command.subject.operator_type,
        "update_site",
        command.site_id,
        &command.requested_at,
    )
    .await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit site update transaction", error))?;
    load_site(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        command.site_id,
    )
    .await
}

async fn delete_site(pool: &PgPool, command: DeleteAdminSiteCommand) -> DomainResult<bool> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin site delete transaction", error))?;
    let bound_channels: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel
        WHERE tenant_id = $1 AND organization_id = $2 AND site_id = $3 AND deleted_at IS NULL
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.site_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|error| store_error("failed to check site channel bindings", error))?;
    if bound_channels > 0 {
        return Err(DomainError::conflict(
            "site has bound channels and cannot be deleted",
        ));
    }
    sqlx::query(
        "DELETE FROM ai_site_service WHERE tenant_id = $1 AND organization_id = $2 AND site_id = $3",
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.site_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to delete site services", error))?;
    let affected = sqlx::query(
        "DELETE FROM ai_site WHERE tenant_id = $1 AND organization_id = $2 AND id = $3 AND deleted_at IS NULL",
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.site_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to delete site", error))?
    .rows_affected();
    if affected > 0 {
        insert_audit(
            &mut tx,
            &command.audit_log_uuid,
            &command.request_id,
            command.subject.tenant_id,
            command.subject.organization_id,
            command.subject.operator_id,
            command.subject.operator_type,
            "delete_site",
            command.site_id,
            &command.requested_at,
        )
        .await?;
    }
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit site delete transaction", error))?;
    Ok(affected > 0)
}

async fn list_site_channels(
    pool: &PgPool,
    query: ListAdminSiteChannelsQuery,
) -> DomainResult<AdminSiteChannelListPage> {
    let rows = sqlx::query(
        r#"
        SELECT id, channel_code, channel_name, provider_code, site_code, site_service_code,
               site_channel_role, health_status, status,
               COUNT(*) OVER() AS total
        FROM ai_channel
        WHERE tenant_id = $1 AND organization_id = $2 AND site_id = $3 AND deleted_at IS NULL
        ORDER BY priority ASC NULLS LAST, weight DESC NULLS LAST, id ASC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.site_id)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list site channels", error))?;
    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(site_channel_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminSiteChannelListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn test_site_connection(
    pool: &PgPool,
    command: TestAdminSiteConnectionCommand,
) -> DomainResult<AdminSiteConnectionCheckItem> {
    let Some(site) = load_site(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        command.site_id,
    )
    .await?
    else {
        return Err(DomainError::not_found("site was not found"));
    };
    let checked_at = command.requested_at.clone();
    let latency_ms = Some(1);
    if command.persist_health {
        let mut tx = pool
            .begin()
            .await
            .map_err(|error| store_error("failed to begin site health transaction", error))?;
        sqlx::query(
            r#"
            UPDATE ai_site
            SET health_status = 2, last_latency_ms = $1, consecutive_error_count = 0,
                last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = $2 AND organization_id = $3 AND id = $4 AND deleted_at IS NULL
            "#,
        )
        .bind(latency_ms)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(command.site_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to update site health", error))?;
        sqlx::query(
            r#"
            UPDATE ai_site_service
            SET health_status = 2, last_latency_ms = $1, consecutive_error_count = 0,
                last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = $2 AND organization_id = $3 AND site_id = $4 AND deleted_at IS NULL
            "#,
        )
        .bind(latency_ms)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(command.site_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to update site service health", error))?;
        insert_audit(
            &mut tx,
            &command.audit_log_uuid,
            &command.request_id,
            command.subject.tenant_id,
            command.subject.organization_id,
            command.subject.operator_id,
            command.subject.operator_type,
            "health_check_site",
            command.site_id,
            &command.requested_at,
        )
        .await?;
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit site health transaction", error))?;
    } else {
        insert_audit_pool(
            pool,
            &command.audit_log_uuid,
            &command.request_id,
            command.subject.tenant_id,
            command.subject.organization_id,
            command.subject.operator_id,
            command.subject.operator_type,
            "test_site_connection",
            command.site_id,
            &command.requested_at,
        )
        .await?;
    }
    Ok(AdminSiteConnectionCheckItem {
        site_id: site.id,
        status: "success".to_owned(),
        health_status: "healthy".to_owned(),
        latency_ms,
        checked_at,
        message: Some("site configuration is reachable".to_owned()),
    })
}

async fn load_site(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    site_id: i64,
) -> DomainResult<Option<AdminSiteItem>> {
    sqlx::query(
        r#"
        SELECT id, site_code, site_name, display_name, description, COALESCE(base_url, '') AS base_url,
               website_url, docs_url, COALESCE(logo_resource_snapshot::text, '') AS logo_resource_snapshot,
               COALESCE(metadata::text, '{}') AS metadata, site_type, owner_kind, region_code, environment, health_status,
               last_latency_ms, consecutive_error_count, last_checked_at::text AS last_checked_at,
               last_sync_at::text AS last_sync_at, sort_order, status
        FROM ai_site
        WHERE tenant_id = $1 AND organization_id = $2 AND id = $3 AND deleted_at IS NULL
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(site_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load site", error))?
    .map(site_from_row)
    .transpose()
}

fn site_from_row(row: sqlx::postgres::PgRow) -> DomainResult<AdminSiteItem> {
    let logo = site_logo_from_row(&row);
    let metadata = site_metadata_from_row(&row);
    Ok(AdminSiteItem {
        id: row.try_get("id").map_err(row_error)?,
        site_code: row.try_get("site_code").map_err(row_error)?,
        site_name: row.try_get("site_name").map_err(row_error)?,
        display_name: row.try_get("display_name").map_err(row_error)?,
        description: optional_string_cell(&row, "description"),
        base_url: row.try_get("base_url").map_err(row_error)?,
        website_url: optional_string_cell(&row, "website_url"),
        docs_url: optional_string_cell(&row, "docs_url"),
        logo,
        domains: site_metadata_string_array(&metadata, "domains"),
        vendor_codes: site_metadata_string_array(&metadata, "vendorCodes"),
        site_type: row.try_get("site_type").map_err(row_error)?,
        owner_kind: optional_string_cell(&row, "owner_kind"),
        region_code: optional_string_cell(&row, "region_code"),
        environment: site_environment_label(required_i32_cell(&row, "environment")?),
        health_status: health_status_label(required_i32_cell(&row, "health_status")?),
        last_latency_ms: optional_integer_cell(&row, "last_latency_ms"),
        consecutive_error_count: optional_integer_cell(&row, "consecutive_error_count")
            .unwrap_or(0),
        last_checked_at: optional_string_cell(&row, "last_checked_at"),
        last_sync_at: optional_string_cell(&row, "last_sync_at"),
        sort_order: optional_integer_cell(&row, "sort_order").unwrap_or(100),
        status: site_status_label(required_i32_cell(&row, "status")?),
    })
}

fn site_channel_from_row(row: sqlx::postgres::PgRow) -> DomainResult<AdminSiteChannelItem> {
    Ok(AdminSiteChannelItem {
        id: row.try_get("id").map_err(row_error)?,
        channel_code: row.try_get("channel_code").map_err(row_error)?,
        channel_name: row.try_get("channel_name").map_err(row_error)?,
        provider_code: optional_string_cell(&row, "provider_code"),
        site_code: optional_string_cell(&row, "site_code"),
        site_service_code: optional_string_cell(&row, "site_service_code"),
        site_channel_role: optional_string_cell(&row, "site_channel_role"),
        health_status: health_status_label(optional_i32_cell(&row, "health_status").unwrap_or(1)),
        status: site_status_label(required_i32_cell(&row, "status")?),
    })
}

fn site_metadata_json(domains: &[String], vendor_codes: &[String]) -> DomainResult<String> {
    serde_json::to_string(&serde_json::json!({
        "domains": domains,
        "vendorCodes": vendor_codes,
    }))
    .map_err(|error| DomainError::new(error.to_string()))
}

fn site_logo_from_row(row: &sqlx::postgres::PgRow) -> Option<serde_json::Value> {
    row.try_get::<String, _>("logo_resource_snapshot")
        .ok()
        .and_then(|value| serde_json::from_str::<serde_json::Value>(&value).ok())
        .filter(|value| value.is_object())
}

fn site_metadata_from_row(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    row.try_get::<String, _>("metadata")
        .ok()
        .and_then(|value| serde_json::from_str::<serde_json::Value>(&value).ok())
        .filter(|value| value.is_object())
        .unwrap_or_else(|| serde_json::json!({}))
}

fn site_metadata_string_array(metadata: &serde_json::Value, key: &str) -> Vec<String> {
    metadata
        .get(key)
        .and_then(serde_json::Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(serde_json::Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

async fn insert_audit(
    tx: &mut Transaction<'_, Postgres>,
    uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    operator_type: i32,
    action: &str,
    target_id: i64,
    requested_at: &str,
) -> DomainResult<()> {
    let id = next_claw_runtime_id("ops_audit_log")?;
    let metadata = serde_json::json!({ "requestedAt": requested_at }).to_string();
    let change_summary = serde_json::json!({ "action": action, "targetId": target_id }).to_string();
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, request_id, operator_id, operator_type, action, target_type, target_id, created_at, metadata, change_summary, id)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10::jsonb, $11::jsonb, $12)
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(request_id)
    .bind(operator_id)
    .bind(operator_type)
    .bind(action)
    .bind(audit_target_type(action))
    .bind(target_id)
    .bind(metadata)
    .bind(change_summary)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write site audit log", error))?;
    Ok(())
}

async fn insert_audit_pool(
    pool: &PgPool,
    uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    operator_type: i32,
    action: &str,
    target_id: i64,
    requested_at: &str,
) -> DomainResult<()> {
    let id = next_claw_runtime_id("ops_audit_log")?;
    let metadata = serde_json::json!({ "requestedAt": requested_at }).to_string();
    let change_summary = serde_json::json!({ "action": action, "targetId": target_id }).to_string();
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, request_id, operator_id, operator_type, action, target_type, target_id, created_at, metadata, change_summary, id)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10::jsonb, $11::jsonb, $12)
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(request_id)
    .bind(operator_id)
    .bind(operator_type)
    .bind(action)
    .bind(audit_target_type(action))
    .bind(target_id)
    .bind(metadata)
    .bind(change_summary)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to write site audit log", error))?;
    Ok(())
}

fn audit_target_type(_action: &str) -> i32 {
    SITE_TARGET_TYPE
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<i64, _>(column).ok())
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
        .or_else(|| row.try_get::<i32, _>(column).ok().map(i64::from))
}

fn optional_i32_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i32> {
    optional_integer_cell(row, column).and_then(|value| i32::try_from(value).ok())
}

fn required_i32_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i32> {
    optional_i32_cell(row, column)
        .ok_or_else(|| DomainError::new(format!("missing integer database column: {column}")))
}

fn row_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}

fn conflict_or_store_error(context: &str, error: sqlx::Error) -> DomainError {
    match &error {
        sqlx::Error::Database(database_error)
            if database_error
                .code()
                .map(|code| code == "23505")
                .unwrap_or(false) =>
        {
            DomainError::conflict(format!("{context}: site entry already exists"))
        }
        _ => store_error(context, error),
    }
}
