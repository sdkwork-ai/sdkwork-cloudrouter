use sha2::{Digest, Sha256};
use sqlx::{Row, SqlitePool};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::model_catalog_import::stable_uuid;
use crate::ports::{
    AdminMcpBindingItem, AdminMcpCommandFuture, AdminMcpDiscoveryResult, AdminMcpHealthCheckItem,
    AdminMcpServerItem, AdminMcpServerRevisionItem, AdminMcpStore, AdminMcpSubject,
    AdminMcpToolItem, CreateAdminMcpBindingCommand, CreateAdminMcpServerCommand,
    CreateAdminMcpServerRevisionCommand, DiscoverAdminMcpToolsCommand, GetAdminMcpServerQuery,
    ListAdminMcpBindingsQuery, ListAdminMcpServerRevisionsQuery, ListAdminMcpServersQuery,
    ListAdminMcpToolsQuery, PublishAdminMcpServerRevisionCommand, TestAdminMcpServerHealthCommand,
    UpdateAdminMcpBindingCommand, UpdateAdminMcpServerCommand, UpdateAdminMcpToolCommand,
};

#[derive(Debug, Clone)]
pub struct SqliteAdminMcpStore {
    pool: SqlitePool,
}

impl SqliteAdminMcpStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminMcpStore for SqliteAdminMcpStore {
    fn list_servers<'a>(
        &'a self,
        query: ListAdminMcpServersQuery,
    ) -> AdminMcpCommandFuture<'a, Vec<AdminMcpServerItem>> {
        Box::pin(async move { list_servers(&self.pool, query).await })
    }

    fn get_server<'a>(
        &'a self,
        query: GetAdminMcpServerQuery,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpServerItem>> {
        Box::pin(
            async move { load_server_optional(&self.pool, query.subject, query.server_id).await },
        )
    }

    fn create_server<'a>(
        &'a self,
        command: CreateAdminMcpServerCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpServerItem> {
        Box::pin(async move { create_server(&self.pool, command).await })
    }

    fn update_server<'a>(
        &'a self,
        command: UpdateAdminMcpServerCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpServerItem>> {
        Box::pin(async move { update_server(&self.pool, command).await })
    }

    fn list_revisions<'a>(
        &'a self,
        query: ListAdminMcpServerRevisionsQuery,
    ) -> AdminMcpCommandFuture<'a, Vec<AdminMcpServerRevisionItem>> {
        Box::pin(async move { list_revisions(&self.pool, query).await })
    }

    fn create_revision<'a>(
        &'a self,
        command: CreateAdminMcpServerRevisionCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpServerRevisionItem> {
        Box::pin(async move { create_revision(&self.pool, command).await })
    }

    fn publish_revision<'a>(
        &'a self,
        command: PublishAdminMcpServerRevisionCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpServerRevisionItem>> {
        Box::pin(async move { publish_revision(&self.pool, command).await })
    }

    fn discover_tools<'a>(
        &'a self,
        command: DiscoverAdminMcpToolsCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpDiscoveryResult> {
        Box::pin(async move { discover_tools(&self.pool, command).await })
    }

    fn check_health<'a>(
        &'a self,
        command: TestAdminMcpServerHealthCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpHealthCheckItem> {
        Box::pin(async move { check_health(&self.pool, command).await })
    }

    fn list_tools<'a>(
        &'a self,
        query: ListAdminMcpToolsQuery,
    ) -> AdminMcpCommandFuture<'a, Vec<AdminMcpToolItem>> {
        Box::pin(async move { list_tools(&self.pool, query).await })
    }

    fn update_tool<'a>(
        &'a self,
        command: UpdateAdminMcpToolCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpToolItem>> {
        Box::pin(async move { update_tool(&self.pool, command).await })
    }

    fn list_bindings<'a>(
        &'a self,
        query: ListAdminMcpBindingsQuery,
    ) -> AdminMcpCommandFuture<'a, Vec<AdminMcpBindingItem>> {
        Box::pin(async move { list_bindings(&self.pool, query).await })
    }

    fn create_binding<'a>(
        &'a self,
        command: CreateAdminMcpBindingCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpBindingItem> {
        Box::pin(async move { create_binding(&self.pool, command).await })
    }

    fn update_binding<'a>(
        &'a self,
        command: UpdateAdminMcpBindingCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpBindingItem>> {
        Box::pin(async move { update_binding(&self.pool, command).await })
    }
}

async fn list_servers(
    pool: &SqlitePool,
    query: ListAdminMcpServersQuery,
) -> DomainResult<Vec<AdminMcpServerItem>> {
    let status = status_code(query.status.as_deref())?;
    let (category_id, category_code) = category_filter(query.category_id.as_deref())?;
    let rows = sqlx::query(
        r#"
        SELECT
            id, uuid, tenant_id, organization_id, server_key, name, description,
            category_id, category_code, transport, visibility, owner_user_id,
            latest_revision_id, published_revision_id, health_status,
            CAST(last_checked_at AS TEXT) AS last_checked_at,
            last_error_masked,
            CASE status WHEN 1 THEN 'enabled' WHEN 0 THEN 'disabled' ELSE CAST(status AS TEXT) END AS status,
            tags,
            CAST(published_at AS TEXT) AS published_at,
            CAST(deprecated_at AS TEXT) AS deprecated_at,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at
        FROM ai_mcp_server
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND deleted_at IS NULL
          AND (?3 IS NULL OR lower(server_key) LIKE ?3 OR lower(name) LIKE ?3 OR lower(COALESCE(description, '')) LIKE ?3)
          AND (?4 IS NULL OR transport = ?4)
          AND (?5 IS NULL OR visibility = ?5)
          AND (?6 IS NULL OR status = ?6)
          AND (?7 IS NULL OR category_id = ?7)
          AND (?8 IS NULL OR category_code = ?8)
        ORDER BY updated_at DESC, id DESC
        LIMIT ?9 OFFSET ?10
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(like_filter(query.keyword.as_deref()))
    .bind(query.transport.as_deref())
    .bind(query.visibility.as_deref())
    .bind(status)
    .bind(category_id)
    .bind(category_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    rows.iter().map(row_to_server).collect()
}

async fn create_server(
    pool: &SqlitePool,
    command: CreateAdminMcpServerCommand,
) -> DomainResult<AdminMcpServerItem> {
    let (category_id, category_code) = category_filter(command.category_id.as_deref())?;
    let tags = json_text(&serde_json::Value::Array(
        command
            .tags
            .iter()
            .cloned()
            .map(serde_json::Value::String)
            .collect(),
    ));
    let result = sqlx::query(
        r#"
        INSERT INTO ai_mcp_server
            (uuid, tenant_id, organization_id, status, server_key, name, description,
             category_id, category_code, transport, visibility, owner_user_id, health_status, tags)
        VALUES
            (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'unchecked', ?12)
        "#,
    )
    .bind(stable_uuid(
        "ai-mcp-server",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.server_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.server_key)
    .bind(&command.name)
    .bind(command.description.as_deref())
    .bind(category_id)
    .bind(category_code.as_deref())
    .bind(&command.transport)
    .bind(&command.visibility)
    .bind(command.subject.operator_id)
    .bind(&tags)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create mcp server", error))?;

    load_server(pool, command.subject, result.last_insert_rowid()).await
}

async fn update_server(
    pool: &SqlitePool,
    command: UpdateAdminMcpServerCommand,
) -> DomainResult<Option<AdminMcpServerItem>> {
    if load_server_optional(pool, command.subject, command.server_id)
        .await?
        .is_none()
    {
        return Ok(None);
    }
    if let Some(server_key) = command.server_key {
        sqlx::query(update_server_sql("server_key = ?1"))
            .bind(server_key)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.server_id)
            .execute(pool)
            .await
            .map_err(|error| write_error("failed to update mcp server key", error))?;
    }
    if let Some(name) = command.name {
        sqlx::query(update_server_sql("name = ?1"))
            .bind(name)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.server_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(description) = command.description {
        sqlx::query(update_server_sql("description = ?1"))
            .bind(description.as_deref())
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.server_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(category) = command.category_id {
        let (category_id, category_code) = category_filter(category.as_deref())?;
        sqlx::query(
            r#"
            UPDATE ai_mcp_server
            SET category_id = ?1, category_code = ?2, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?3 AND organization_id = ?4 AND id = ?5 AND deleted_at IS NULL
            "#,
        )
        .bind(category_id)
        .bind(category_code.as_deref())
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(command.server_id)
        .execute(pool)
        .await
        .map_err(store_error)?;
    }
    if let Some(transport) = command.transport {
        sqlx::query(update_server_sql("transport = ?1"))
            .bind(transport)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.server_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(visibility) = command.visibility {
        sqlx::query(update_server_sql("visibility = ?1"))
            .bind(visibility)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.server_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(status) = command.status {
        sqlx::query(update_server_sql("status = ?1"))
            .bind(required_status_code(&status)?)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.server_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(tags) = command.tags {
        let tags = json_text(&serde_json::Value::Array(
            tags.into_iter().map(serde_json::Value::String).collect(),
        ));
        sqlx::query(update_server_sql("tags = ?1"))
            .bind(tags)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.server_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    load_server_optional(pool, command.subject, command.server_id).await
}

async fn list_revisions(
    pool: &SqlitePool,
    query: ListAdminMcpServerRevisionsQuery,
) -> DomainResult<Vec<AdminMcpServerRevisionItem>> {
    ensure_server_exists(pool, query.subject, query.server_id).await?;
    let rows = sqlx::query(
        r#"
        SELECT
            id, uuid, tenant_id, organization_id, server_id, revision_no, transport,
            endpoint_url, command, args_json, env_schema, auth_type, secret_ref, timeout_ms,
            retry_policy, COALESCE(config_hash, '') AS config_hash, lifecycle_status,
            CASE status WHEN 1 THEN 'enabled' WHEN 0 THEN 'disabled' ELSE CAST(status AS TEXT) END AS status,
            COALESCE(created_by, 0) AS created_by,
            CAST(published_at AS TEXT) AS published_at,
            CAST(deprecated_at AS TEXT) AS deprecated_at,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at
        FROM ai_mcp_server_revision
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND server_id = ?3
          AND deleted_at IS NULL
        ORDER BY created_at DESC, id DESC
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.server_id)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    rows.iter().map(row_to_revision).collect()
}

async fn create_revision(
    pool: &SqlitePool,
    command: CreateAdminMcpServerRevisionCommand,
) -> DomainResult<AdminMcpServerRevisionItem> {
    ensure_server_exists(pool, command.subject, command.server_id).await?;
    let config_hash = checksum_hash(&[
        &command.transport,
        command.endpoint_url.as_deref().unwrap_or(""),
        command.command.as_deref().unwrap_or(""),
        &json_text(&command.args_json),
        &json_text(&command.env_schema),
        &command.auth_type,
        command.secret_ref.as_deref().unwrap_or(""),
        &command.timeout_ms.to_string(),
        &json_text(&command.retry_policy),
    ]);
    let result = sqlx::query(
        r#"
        INSERT INTO ai_mcp_server_revision
            (uuid, tenant_id, organization_id, status, server_id, revision_no, transport,
             endpoint_url, command, args_json, env_schema, auth_type, secret_ref, timeout_ms,
             retry_policy, config_hash, lifecycle_status, created_by)
        VALUES
            (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 'draft', ?16)
        "#,
    )
    .bind(stable_uuid(
        "ai-mcp-revision",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.server_id.to_string(),
            &command.revision_no,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.server_id)
    .bind(&command.revision_no)
    .bind(&command.transport)
    .bind(command.endpoint_url.as_deref())
    .bind(command.command.as_deref())
    .bind(json_text(&command.args_json))
    .bind(json_text(&command.env_schema))
    .bind(&command.auth_type)
    .bind(command.secret_ref.as_deref())
    .bind(command.timeout_ms)
    .bind(json_text(&command.retry_policy))
    .bind(&config_hash)
    .bind(command.subject.operator_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create mcp revision", error))?;

    let revision_id = result.last_insert_rowid();
    sqlx::query(
        r#"
        UPDATE ai_mcp_server
        SET latest_revision_id = ?1, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4
        "#,
    )
    .bind(revision_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.server_id)
    .execute(pool)
    .await
    .map_err(store_error)?;

    load_revision(pool, command.subject, revision_id).await
}

async fn publish_revision(
    pool: &SqlitePool,
    command: PublishAdminMcpServerRevisionCommand,
) -> DomainResult<Option<AdminMcpServerRevisionItem>> {
    let Some(revision) = load_revision_optional(pool, command.subject, command.revision_id).await?
    else {
        return Ok(None);
    };
    sqlx::query(
        r#"
        UPDATE ai_mcp_server_revision
        SET lifecycle_status = 'published',
            published_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?1 AND organization_id = ?2 AND id = ?3
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.revision_id)
    .execute(pool)
    .await
    .map_err(store_error)?;

    sqlx::query(
        r#"
        UPDATE ai_mcp_server
        SET published_revision_id = ?1,
            latest_revision_id = COALESCE(latest_revision_id, ?1),
            published_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4
        "#,
    )
    .bind(command.revision_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(revision.server_id)
    .execute(pool)
    .await
    .map_err(store_error)?;

    load_revision_optional(pool, command.subject, command.revision_id).await
}

async fn discover_tools(
    pool: &SqlitePool,
    command: DiscoverAdminMcpToolsCommand,
) -> DomainResult<AdminMcpDiscoveryResult> {
    ensure_server_exists(pool, command.subject, command.server_id).await?;
    let tools = list_tools(
        pool,
        ListAdminMcpToolsQuery {
            subject: command.subject,
            server_id: command.server_id,
        },
    )
    .await?;
    let checked_at = tools
        .iter()
        .filter_map(|tool| tool.discovered_at.clone())
        .max()
        .unwrap_or(current_timestamp(pool).await?);
    Ok(AdminMcpDiscoveryResult {
        server_id: command.server_id,
        discovered_count: tools.len() as i64,
        tools,
        checked_at,
    })
}

async fn check_health(
    pool: &SqlitePool,
    command: TestAdminMcpServerHealthCommand,
) -> DomainResult<AdminMcpHealthCheckItem> {
    let result = sqlx::query(
        r#"
        UPDATE ai_mcp_server
        SET health_status = 'healthy',
            last_checked_at = CURRENT_TIMESTAMP,
            last_error_masked = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.server_id)
    .execute(pool)
    .await
    .map_err(store_error)?;
    if result.rows_affected() == 0 {
        return Err(DomainError::not_found("mcp server was not found"));
    }
    let checked_at: String = sqlx::query_scalar(
        r#"
        SELECT CAST(COALESCE(last_checked_at, CURRENT_TIMESTAMP) AS TEXT)
        FROM ai_mcp_server
        WHERE tenant_id = ?1 AND organization_id = ?2 AND id = ?3
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.server_id)
    .fetch_one(pool)
    .await
    .map_err(store_error)?;
    Ok(AdminMcpHealthCheckItem {
        server_id: command.server_id,
        healthy: true,
        health_status: "healthy".to_owned(),
        checked_at,
        latency_ms: None,
        error_masked: None,
    })
}

async fn list_tools(
    pool: &SqlitePool,
    query: ListAdminMcpToolsQuery,
) -> DomainResult<Vec<AdminMcpToolItem>> {
    ensure_server_exists(pool, query.subject, query.server_id).await?;
    let rows = sqlx::query(
        r#"
        SELECT
            id, uuid, tenant_id, organization_id, server_id, server_revision_id,
            tool_key, name, description, input_schema, output_schema, risk_level,
            requires_approval, enabled,
            CASE status WHEN 1 THEN 'enabled' WHEN 0 THEN 'disabled' ELSE CAST(status AS TEXT) END AS status,
            rate_limit_policy,
            COALESCE(schema_hash, '') AS schema_hash,
            CAST(discovered_at AS TEXT) AS discovered_at,
            CAST(last_invoked_at AS TEXT) AS last_invoked_at,
            sort_weight,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at
        FROM ai_mcp_tool
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND server_id = ?3
          AND deleted_at IS NULL
        ORDER BY sort_weight ASC, id ASC
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.server_id)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    rows.iter().map(row_to_tool).collect()
}

async fn update_tool(
    pool: &SqlitePool,
    command: UpdateAdminMcpToolCommand,
) -> DomainResult<Option<AdminMcpToolItem>> {
    if load_tool_optional(pool, command.subject, command.tool_id)
        .await?
        .is_none()
    {
        return Ok(None);
    }
    if let Some(name) = command.name {
        sqlx::query(update_tool_sql("name = ?1"))
            .bind(name)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(description) = command.description {
        sqlx::query(update_tool_sql("description = ?1"))
            .bind(description.as_deref())
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(input_schema) = command.input_schema {
        sqlx::query(update_tool_sql("input_schema = ?1"))
            .bind(json_text(&input_schema))
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(output_schema) = command.output_schema {
        sqlx::query(update_tool_sql("output_schema = ?1"))
            .bind(json_text(&output_schema))
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(risk_level) = command.risk_level {
        sqlx::query(update_tool_sql("risk_level = ?1"))
            .bind(risk_level)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(requires_approval) = command.requires_approval {
        sqlx::query(update_tool_sql("requires_approval = ?1"))
            .bind(requires_approval)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(enabled) = command.enabled {
        sqlx::query(update_tool_sql("enabled = ?1"))
            .bind(enabled)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(status) = command.status {
        sqlx::query(update_tool_sql("status = ?1"))
            .bind(required_status_code(&status)?)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(rate_limit_policy) = command.rate_limit_policy {
        sqlx::query(update_tool_sql("rate_limit_policy = ?1"))
            .bind(json_text(&rate_limit_policy))
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    if let Some(sort_weight) = command.sort_weight {
        sqlx::query(update_tool_sql("sort_weight = ?1"))
            .bind(sort_weight)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.tool_id)
            .execute(pool)
            .await
            .map_err(store_error)?;
    }
    load_tool_optional(pool, command.subject, command.tool_id).await
}

async fn list_bindings(
    pool: &SqlitePool,
    query: ListAdminMcpBindingsQuery,
) -> DomainResult<Vec<AdminMcpBindingItem>> {
    ensure_server_exists(pool, query.subject, query.server_id).await?;
    let rows = sqlx::query(
        r#"
        SELECT
            id, uuid, tenant_id, organization_id, server_id, server_revision_id, tool_id,
            owner_type, owner_id, allowed_tools, denied_tools, policy_json, priority, enabled,
            CASE status WHEN 1 THEN 'enabled' WHEN 0 THEN 'disabled' ELSE CAST(status AS TEXT) END AS status,
            snapshot_json,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at
        FROM ai_mcp_binding
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND server_id = ?3
          AND deleted_at IS NULL
        ORDER BY priority ASC, id ASC
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.server_id)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    rows.iter().map(row_to_binding).collect()
}

async fn create_binding(
    pool: &SqlitePool,
    command: CreateAdminMcpBindingCommand,
) -> DomainResult<AdminMcpBindingItem> {
    ensure_server_exists(pool, command.subject, command.server_id).await?;
    if let Some(revision_id) = command.server_revision_id {
        ensure_revision_belongs(pool, command.subject, command.server_id, revision_id).await?;
    }
    if let Some(tool_id) = command.tool_id {
        ensure_tool_belongs(pool, command.subject, command.server_id, tool_id).await?;
    }
    let status = required_status_code(&command.status)?;
    let snapshot = mcp_binding_snapshot(
        command.server_id,
        command.server_revision_id,
        command.tool_id,
        &command.owner_type,
        command.owner_id,
        &command.allowed_tools,
        &command.denied_tools,
        &command.policy_json,
        command.priority,
        command.enabled,
        &command.status,
    );
    let result = sqlx::query(
        r#"
        INSERT INTO ai_mcp_binding
            (uuid, tenant_id, organization_id, status, server_id, server_revision_id,
             tool_id, owner_type, owner_id, allowed_tools, denied_tools, policy_json,
             priority, enabled, snapshot_json)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
        "#,
    )
    .bind(stable_uuid(
        "ai-mcp-binding",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.server_id.to_string(),
            &command
                .server_revision_id
                .map(|value| value.to_string())
                .unwrap_or_default(),
            &command
                .tool_id
                .map(|value| value.to_string())
                .unwrap_or_default(),
            &command.owner_type,
            &command.owner_id.to_string(),
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status)
    .bind(command.server_id)
    .bind(command.server_revision_id)
    .bind(command.tool_id)
    .bind(&command.owner_type)
    .bind(command.owner_id)
    .bind(json_text(&command.allowed_tools))
    .bind(json_text(&command.denied_tools))
    .bind(json_text(&command.policy_json))
    .bind(command.priority)
    .bind(command.enabled)
    .bind(json_text(&snapshot))
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create mcp binding", error))?;

    load_binding(pool, command.subject, result.last_insert_rowid()).await
}

async fn update_binding(
    pool: &SqlitePool,
    command: UpdateAdminMcpBindingCommand,
) -> DomainResult<Option<AdminMcpBindingItem>> {
    let Some(current) = load_binding_optional(pool, command.subject, command.binding_id).await?
    else {
        return Ok(None);
    };
    let server_revision_id = command
        .server_revision_id
        .unwrap_or(current.server_revision_id);
    if let Some(revision_id) = server_revision_id {
        ensure_revision_belongs(pool, command.subject, current.server_id, revision_id).await?;
    }
    let tool_id = command.tool_id.unwrap_or(current.tool_id);
    if let Some(tool_id) = tool_id {
        ensure_tool_belongs(pool, command.subject, current.server_id, tool_id).await?;
    }
    let owner_type = command.owner_type.unwrap_or(current.owner_type);
    let owner_id = command.owner_id.unwrap_or(current.owner_id);
    let allowed_tools = command.allowed_tools.unwrap_or(current.allowed_tools);
    let denied_tools = command.denied_tools.unwrap_or(current.denied_tools);
    let policy_json = command.policy_json.unwrap_or(current.policy_json);
    let priority = command.priority.unwrap_or(current.priority);
    let enabled = command.enabled.unwrap_or(current.enabled);
    let status_text = command.status.unwrap_or(current.status);
    let status = required_status_code(&status_text)?;
    let snapshot = mcp_binding_snapshot(
        current.server_id,
        server_revision_id,
        tool_id,
        &owner_type,
        owner_id,
        &allowed_tools,
        &denied_tools,
        &policy_json,
        priority,
        enabled,
        &status_text,
    );
    sqlx::query(
        r#"
        UPDATE ai_mcp_binding
        SET server_revision_id = ?1,
            tool_id = ?2,
            owner_type = ?3,
            owner_id = ?4,
            allowed_tools = ?5,
            denied_tools = ?6,
            policy_json = ?7,
            priority = ?8,
            enabled = ?9,
            status = ?10,
            snapshot_json = ?11,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?12
          AND organization_id = ?13
          AND id = ?14
          AND deleted_at IS NULL
        "#,
    )
    .bind(server_revision_id)
    .bind(tool_id)
    .bind(&owner_type)
    .bind(owner_id)
    .bind(json_text(&allowed_tools))
    .bind(json_text(&denied_tools))
    .bind(json_text(&policy_json))
    .bind(priority)
    .bind(enabled)
    .bind(status)
    .bind(json_text(&snapshot))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.binding_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to update mcp binding", error))?;

    load_binding_optional(pool, command.subject, command.binding_id).await
}

async fn load_server(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    id: i64,
) -> DomainResult<AdminMcpServerItem> {
    load_server_optional(pool, subject, id)
        .await?
        .ok_or_else(|| DomainError::not_found("mcp server was not found"))
}

async fn load_server_optional(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    id: i64,
) -> DomainResult<Option<AdminMcpServerItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id, uuid, tenant_id, organization_id, server_key, name, description,
            category_id, category_code, transport, visibility, owner_user_id,
            latest_revision_id, published_revision_id, health_status,
            CAST(last_checked_at AS TEXT) AS last_checked_at,
            last_error_masked,
            CASE status WHEN 1 THEN 'enabled' WHEN 0 THEN 'disabled' ELSE CAST(status AS TEXT) END AS status,
            tags,
            CAST(published_at AS TEXT) AS published_at,
            CAST(deprecated_at AS TEXT) AS deprecated_at,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at
        FROM ai_mcp_server
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    row.as_ref().map(row_to_server).transpose()
}

async fn load_revision(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    id: i64,
) -> DomainResult<AdminMcpServerRevisionItem> {
    load_revision_optional(pool, subject, id)
        .await?
        .ok_or_else(|| DomainError::not_found("mcp revision was not found"))
}

async fn load_revision_optional(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    id: i64,
) -> DomainResult<Option<AdminMcpServerRevisionItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id, uuid, tenant_id, organization_id, server_id, revision_no, transport,
            endpoint_url, command, args_json, env_schema, auth_type, secret_ref, timeout_ms,
            retry_policy, COALESCE(config_hash, '') AS config_hash, lifecycle_status,
            CASE status WHEN 1 THEN 'enabled' WHEN 0 THEN 'disabled' ELSE CAST(status AS TEXT) END AS status,
            COALESCE(created_by, 0) AS created_by,
            CAST(published_at AS TEXT) AS published_at,
            CAST(deprecated_at AS TEXT) AS deprecated_at,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at
        FROM ai_mcp_server_revision
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    row.as_ref().map(row_to_revision).transpose()
}

async fn load_tool_optional(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    id: i64,
) -> DomainResult<Option<AdminMcpToolItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id, uuid, tenant_id, organization_id, server_id, server_revision_id,
            tool_key, name, description, input_schema, output_schema, risk_level,
            requires_approval, enabled,
            CASE status WHEN 1 THEN 'enabled' WHEN 0 THEN 'disabled' ELSE CAST(status AS TEXT) END AS status,
            rate_limit_policy,
            COALESCE(schema_hash, '') AS schema_hash,
            CAST(discovered_at AS TEXT) AS discovered_at,
            CAST(last_invoked_at AS TEXT) AS last_invoked_at,
            sort_weight,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at
        FROM ai_mcp_tool
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    row.as_ref().map(row_to_tool).transpose()
}

async fn load_binding(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    id: i64,
) -> DomainResult<AdminMcpBindingItem> {
    load_binding_optional(pool, subject, id)
        .await?
        .ok_or_else(|| DomainError::not_found("mcp binding was not found"))
}

async fn load_binding_optional(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    id: i64,
) -> DomainResult<Option<AdminMcpBindingItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id, uuid, tenant_id, organization_id, server_id, server_revision_id, tool_id,
            owner_type, owner_id, allowed_tools, denied_tools, policy_json, priority, enabled,
            CASE status WHEN 1 THEN 'enabled' WHEN 0 THEN 'disabled' ELSE CAST(status AS TEXT) END AS status,
            snapshot_json,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at
        FROM ai_mcp_binding
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    row.as_ref().map(row_to_binding).transpose()
}

async fn ensure_server_exists(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    server_id: i64,
) -> DomainResult<()> {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM ai_mcp_server
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(server_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    if exists.is_none() {
        return Err(DomainError::not_found("mcp server was not found"));
    }
    Ok(())
}

async fn ensure_revision_belongs(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    server_id: i64,
    revision_id: i64,
) -> DomainResult<()> {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM ai_mcp_server_revision
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND server_id = ?3
          AND id = ?4
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(server_id)
    .bind(revision_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    if exists.is_none() {
        return Err(DomainError::not_found(
            "mcp revision was not found for server",
        ));
    }
    Ok(())
}

async fn ensure_tool_belongs(
    pool: &SqlitePool,
    subject: AdminMcpSubject,
    server_id: i64,
    tool_id: i64,
) -> DomainResult<()> {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM ai_mcp_tool
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND server_id = ?3
          AND id = ?4
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(server_id)
    .bind(tool_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    if exists.is_none() {
        return Err(DomainError::not_found("mcp tool was not found for server"));
    }
    Ok(())
}

fn row_to_server(row: &sqlx::sqlite::SqliteRow) -> DomainResult<AdminMcpServerItem> {
    Ok(AdminMcpServerItem {
        id: integer_cell(row, "id")?,
        uuid: string_cell(row, "uuid")?,
        tenant_id: integer_cell(row, "tenant_id")?,
        organization_id: integer_cell(row, "organization_id")?,
        server_key: string_cell(row, "server_key")?,
        name: string_cell(row, "name")?,
        description: optional_string_cell(row, "description")?,
        category_id: optional_integer_cell(row, "category_id")?.map(|value| value.to_string()),
        category_code: optional_string_cell(row, "category_code")?,
        transport: string_cell(row, "transport")?,
        visibility: string_cell(row, "visibility")?,
        owner_user_id: optional_integer_cell(row, "owner_user_id")?,
        latest_revision_id: optional_integer_cell(row, "latest_revision_id")?,
        published_revision_id: optional_integer_cell(row, "published_revision_id")?,
        health_status: string_cell(row, "health_status")?,
        last_checked_at: optional_string_cell(row, "last_checked_at")?,
        last_error_masked: optional_string_cell(row, "last_error_masked")?,
        status: string_cell(row, "status")?,
        tags: tags_cell(row, "tags")?,
        published_at: optional_string_cell(row, "published_at")?,
        deprecated_at: optional_string_cell(row, "deprecated_at")?,
        created_at: string_cell(row, "created_at")?,
        updated_at: string_cell(row, "updated_at")?,
    })
}

fn row_to_revision(row: &sqlx::sqlite::SqliteRow) -> DomainResult<AdminMcpServerRevisionItem> {
    Ok(AdminMcpServerRevisionItem {
        id: integer_cell(row, "id")?,
        uuid: string_cell(row, "uuid")?,
        tenant_id: integer_cell(row, "tenant_id")?,
        organization_id: integer_cell(row, "organization_id")?,
        server_id: integer_cell(row, "server_id")?,
        revision_no: string_cell(row, "revision_no")?,
        transport: string_cell(row, "transport")?,
        endpoint_url: optional_string_cell(row, "endpoint_url")?,
        command: optional_string_cell(row, "command")?,
        args_json: json_cell(row, "args_json")?,
        env_schema: json_cell(row, "env_schema")?,
        auth_type: string_cell(row, "auth_type")?,
        secret_ref: optional_string_cell(row, "secret_ref")?,
        timeout_ms: integer_cell(row, "timeout_ms")? as i32,
        retry_policy: json_cell(row, "retry_policy")?,
        config_hash: string_cell(row, "config_hash")?,
        lifecycle_status: string_cell(row, "lifecycle_status")?,
        status: string_cell(row, "status")?,
        created_by: integer_cell(row, "created_by")?,
        published_at: optional_string_cell(row, "published_at")?,
        deprecated_at: optional_string_cell(row, "deprecated_at")?,
        created_at: string_cell(row, "created_at")?,
        updated_at: string_cell(row, "updated_at")?,
    })
}

fn row_to_tool(row: &sqlx::sqlite::SqliteRow) -> DomainResult<AdminMcpToolItem> {
    Ok(AdminMcpToolItem {
        id: integer_cell(row, "id")?,
        uuid: string_cell(row, "uuid")?,
        tenant_id: integer_cell(row, "tenant_id")?,
        organization_id: integer_cell(row, "organization_id")?,
        server_id: integer_cell(row, "server_id")?,
        server_revision_id: optional_integer_cell(row, "server_revision_id")?,
        tool_key: string_cell(row, "tool_key")?,
        name: string_cell(row, "name")?,
        description: optional_string_cell(row, "description")?,
        input_schema: json_cell(row, "input_schema")?,
        output_schema: json_cell(row, "output_schema")?,
        risk_level: string_cell(row, "risk_level")?,
        requires_approval: bool_cell(row, "requires_approval")?,
        enabled: bool_cell(row, "enabled")?,
        status: string_cell(row, "status")?,
        rate_limit_policy: json_cell(row, "rate_limit_policy")?,
        schema_hash: string_cell(row, "schema_hash")?,
        discovered_at: optional_string_cell(row, "discovered_at")?,
        last_invoked_at: optional_string_cell(row, "last_invoked_at")?,
        sort_weight: integer_cell(row, "sort_weight")? as i32,
        created_at: string_cell(row, "created_at")?,
        updated_at: string_cell(row, "updated_at")?,
    })
}

fn row_to_binding(row: &sqlx::sqlite::SqliteRow) -> DomainResult<AdminMcpBindingItem> {
    Ok(AdminMcpBindingItem {
        id: integer_cell(row, "id")?,
        uuid: string_cell(row, "uuid")?,
        tenant_id: integer_cell(row, "tenant_id")?,
        organization_id: integer_cell(row, "organization_id")?,
        server_id: integer_cell(row, "server_id")?,
        server_revision_id: optional_integer_cell(row, "server_revision_id")?,
        tool_id: optional_integer_cell(row, "tool_id")?,
        owner_type: string_cell(row, "owner_type")?,
        owner_id: integer_cell(row, "owner_id")?,
        allowed_tools: json_cell(row, "allowed_tools")?,
        denied_tools: json_cell(row, "denied_tools")?,
        policy_json: json_cell(row, "policy_json")?,
        priority: integer_cell(row, "priority")? as i32,
        enabled: bool_cell(row, "enabled")?,
        status: string_cell(row, "status")?,
        snapshot_json: json_cell(row, "snapshot_json")?,
        created_at: string_cell(row, "created_at")?,
        updated_at: string_cell(row, "updated_at")?,
    })
}

fn update_server_sql(set_clause: &str) -> &'static str {
    match set_clause {
        "server_key = ?1" => {
            r#"
            UPDATE ai_mcp_server
            SET server_key = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "name = ?1" => {
            r#"
            UPDATE ai_mcp_server
            SET name = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "description = ?1" => {
            r#"
            UPDATE ai_mcp_server
            SET description = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "transport = ?1" => {
            r#"
            UPDATE ai_mcp_server
            SET transport = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "visibility = ?1" => {
            r#"
            UPDATE ai_mcp_server
            SET visibility = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "status = ?1" => {
            r#"
            UPDATE ai_mcp_server
            SET status = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "tags = ?1" => {
            r#"
            UPDATE ai_mcp_server
            SET tags = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        _ => unreachable!("unsupported mcp server update clause"),
    }
}

fn update_tool_sql(set_clause: &str) -> &'static str {
    match set_clause {
        "name = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET name = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "description = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET description = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "input_schema = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET input_schema = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "output_schema = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET output_schema = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "risk_level = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET risk_level = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "requires_approval = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET requires_approval = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "enabled = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET enabled = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "status = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET status = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "rate_limit_policy = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET rate_limit_policy = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        "sort_weight = ?1" => {
            r#"
            UPDATE ai_mcp_tool
            SET sort_weight = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ?2 AND organization_id = ?3 AND id = ?4 AND deleted_at IS NULL
            "#
        }
        _ => unreachable!("unsupported mcp tool update clause"),
    }
}

fn like_filter(value: Option<&str>) -> Option<String> {
    value.map(|value| format!("%{}%", value.to_ascii_lowercase()))
}

fn category_filter(value: Option<&str>) -> DomainResult<(Option<i64>, Option<String>)> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok((None, None));
    };
    if let Ok(id) = value.parse::<i64>() {
        if id <= 0 {
            return Err(DomainError::new("mcp categoryId must be positive"));
        }
        return Ok((Some(id), None));
    }
    Ok((None, Some(value.to_owned())))
}

fn status_code(status: Option<&str>) -> DomainResult<Option<i32>> {
    match status {
        None => Ok(None),
        Some(value) => required_status_code(value).map(Some),
    }
}

fn required_status_code(status: &str) -> DomainResult<i32> {
    match status {
        "enabled" | "active" => Ok(1),
        "disabled" | "inactive" => Ok(0),
        value => Err(DomainError::conflict(format!(
            "unsupported mcp status: {value}"
        ))),
    }
}

fn checksum_hash(parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    for part in parts {
        hasher.update(part.as_bytes());
        hasher.update([0]);
    }
    format!("{:x}", hasher.finalize())
}

async fn current_timestamp(pool: &SqlitePool) -> DomainResult<String> {
    sqlx::query_scalar("SELECT CAST(CURRENT_TIMESTAMP AS TEXT)")
        .fetch_one(pool)
        .await
        .map_err(store_error)
}

fn mcp_binding_snapshot(
    server_id: i64,
    server_revision_id: Option<i64>,
    tool_id: Option<i64>,
    owner_type: &str,
    owner_id: i64,
    allowed_tools: &serde_json::Value,
    denied_tools: &serde_json::Value,
    policy_json: &serde_json::Value,
    priority: i32,
    enabled: bool,
    status: &str,
) -> serde_json::Value {
    serde_json::json!({
        "serverId": server_id,
        "serverRevisionId": server_revision_id,
        "toolId": tool_id,
        "ownerType": owner_type,
        "ownerId": owner_id,
        "allowedTools": allowed_tools,
        "deniedTools": denied_tools,
        "policyJson": policy_json,
        "priority": priority,
        "enabled": enabled,
        "status": status,
    })
}

fn json_text(value: &serde_json::Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "{}".to_owned())
}

fn tags_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<Vec<String>> {
    let value = json_cell(row, column)?;
    Ok(value
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(serde_json::Value::as_str)
                .map(ToOwned::to_owned)
                .collect()
        })
        .unwrap_or_default())
}

fn json_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<serde_json::Value> {
    let raw = string_cell(row, column)?;
    if raw.trim().is_empty() {
        return Ok(serde_json::json!({}));
    }
    serde_json::from_str(&raw)
        .map_err(|error| DomainError::new(format!("invalid mcp json {column}: {error}")))
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
    if let Ok(value) = row.try_get::<Option<i32>, _>(column) {
        return Ok(value.map(|value| value.to_string()).unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(value.to_string());
    }
    Err(DomainError::new(format!(
        "mcp row column {column} is not readable as text"
    )))
}

fn optional_string_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> DomainResult<Option<String>> {
    let value = string_cell(row, column)?;
    Ok((!value.trim().is_empty()).then_some(value))
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<i64> {
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(i64::from(value));
    }
    if let Ok(value) = row.try_get::<Option<i32>, _>(column) {
        return Ok(value.map(i64::from).unwrap_or_default());
    }
    let value = string_cell(row, column)?;
    if value.trim().is_empty() {
        return Ok(0);
    }
    value
        .parse::<i64>()
        .map_err(|error| DomainError::new(format!("invalid mcp integer {column}: {error}")))
}

fn optional_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<Option<i64>> {
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(Some(value));
    }
    if let Ok(value) = row.try_get::<Option<i32>, _>(column) {
        return Ok(value.map(i64::from));
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(Some(i64::from(value)));
    }
    let value = string_cell(row, column)?;
    if value.trim().is_empty() {
        return Ok(None);
    }
    value
        .parse::<i64>()
        .map(Some)
        .map_err(|error| DomainError::new(format!("invalid mcp integer {column}: {error}")))
}

fn bool_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<bool> {
    if let Ok(value) = row.try_get::<bool, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value != 0);
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(value != 0);
    }
    let value = string_cell(row, column)?.to_ascii_lowercase();
    Ok(matches!(value.as_str(), "1" | "true" | "t" | "yes"))
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
