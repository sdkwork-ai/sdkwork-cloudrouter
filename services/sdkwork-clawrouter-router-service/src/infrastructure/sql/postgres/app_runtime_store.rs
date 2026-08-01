use serde_json::Value;
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::sql_admin_product_center::drive_uri_from_resource;
use crate::ports::{
    AppRuntimeArtifactItem, AppRuntimeArtifactList, AppRuntimeEventItem, AppRuntimeEventList,
    AppRuntimeFuture, AppRuntimeInvocationExecution, AppRuntimeInvocationItem,
    AppRuntimeInvocationList, AppRuntimeInvocationQuery, AppRuntimeStore, AppRuntimeSubject,
    CompleteAppRuntimeInvocationCommand, CreateAppRuntimeArtifactCommand,
    CreateAppRuntimeEventCommand, CreateAppRuntimeInvocationCommand,
};

#[derive(Debug, Clone)]
pub struct PostgresAppRuntimeStore {
    pool: PgPool,
}

impl PostgresAppRuntimeStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AppRuntimeStore for PostgresAppRuntimeStore {
    fn list_invocations<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        query: AppRuntimeInvocationQuery,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationList> {
        Box::pin(async move {
            let page = query.page.max(1);
            let page_size = query.page_size.max(1);
            let offset = (page - 1) * page_size;
            let sql = invocation_select_sql(
                r#"
                  AND ($4 IS NULL OR conversation_id = $4)
                  AND ($5 IS NULL OR chat_turn_id = $5)
                  AND ($6 IS NULL OR agent_session_id = $6)
                  AND ($7 IS NULL OR runtime = $7)
                  AND ($8 IS NULL OR status = $8)
                ORDER BY created_at DESC NULLS LAST, id DESC
                LIMIT $9 OFFSET $10
                "#,
                true,
            );
            let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .bind(&query.conversation_id)
                .bind(&query.chat_turn_id)
                .bind(&query.agent_session_id)
                .bind(&query.runtime)
                .bind(&query.status)
                .bind(page_size)
                .bind(offset)
                .fetch_all(&self.pool)
                .await
                .map_err(sql_error)?;
            let total = rows
                .first()
                .and_then(|row| row.try_get::<i64, _>("total").ok())
                .unwrap_or(0);
            let items = rows
                .into_iter()
                .map(row_to_invocation)
                .collect::<DomainResult<Vec<_>>>()?;
            Ok(AppRuntimeInvocationList {
                items,
                total,
                page_no: page,
                page_size,
            })
        })
    }

    fn get_invocation<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeInvocationItem>> {
        Box::pin(async move {
            let row = load_invocation_row_by_uuid(&self.pool, subject, &invocation_id)
                .await?
                .map(row_to_invocation)
                .transpose()?;
            Ok(row)
        })
    }

    fn get_invocation_execution<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeInvocationExecution>> {
        Box::pin(async move {
            load_invocation_row_by_uuid(&self.pool, subject, &invocation_id)
                .await?
                .map(row_to_invocation_execution)
                .transpose()
        })
    }

    fn create_invocation<'a>(
        &'a self,
        command: CreateAppRuntimeInvocationCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationItem> {
        Box::pin(async move {
            let request_json = json_string(&command.request_json, "runtime request json")?;
            let metadata = json_string(&command.metadata, "runtime metadata")?;
            validate_invocation_context(&self.pool, &command).await?;
            let invocation_no = next_invocation_no(&self.pool, command.subject, &command).await?;
            sqlx::query(
                r#"
                INSERT INTO ai_runtime_invocation (
                    uuid,
                    tenant_id,
                    organization_id,
                    user_id,
                    conversation_id,
                    chat_turn_id,
                    chat_item_id,
                    agent_session_id,
                    agent_run_id,
                    agent_run_step_id,
                    invocation_no,
                    invocation_type,
                    runtime,
                    endpoint,
                    attempt_no,
                    status,
                    request_id,
                    trace_id,
                    model,
                    provider,
                    tool_name,
                    tool_call_id,
                    cwd,
                    sandbox_policy,
                    approval_policy,
                    permission_mode,
                    streaming,
                    started_at,
                    request_json,
                    created_at,
                    metadata,
                    id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27::timestamp AT TIME ZONE 'UTC', $28::jsonb, $27::timestamp AT TIME ZONE 'UTC', $29::jsonb, $30)
                "#,
            )
            .bind(&command.invocation_uuid)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.subject.user_id)
            .bind(&command.conversation_id)
            .bind(&command.chat_turn_id)
            .bind(&command.chat_item_id)
            .bind(&command.agent_session_id)
            .bind(&command.agent_run_id)
            .bind(&command.agent_run_step_id)
            .bind(invocation_no)
            .bind(&command.invocation_type)
            .bind(&command.runtime)
            .bind(&command.endpoint)
            .bind(&command.status)
            .bind(&command.request_id)
            .bind(&command.trace_id)
            .bind(&command.model)
            .bind(&command.provider)
            .bind(&command.tool_name)
            .bind(&command.tool_call_id)
            .bind(&command.cwd)
            .bind(&command.sandbox_policy)
            .bind(&command.approval_policy)
            .bind(&command.permission_mode)
            .bind(command.streaming)
            .bind(&command.requested_at)
            .bind(&request_json)
            .bind(&metadata)
            .bind(next_claw_runtime_id("ai_runtime_invocation")?)
            .execute(&self.pool)
            .await
            .map_err(sql_error)?;

            self.get_invocation(command.subject, command.invocation_uuid)
                .await?
                .ok_or_else(|| DomainError::new("created runtime invocation was not found"))
        })
    }

    fn complete_invocation<'a>(
        &'a self,
        command: CompleteAppRuntimeInvocationCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationItem> {
        Box::pin(async move {
            let response_json = json_string(&command.response_json, "runtime response json")?;
            let usage_json = json_string(&command.usage_json, "runtime usage json")?;
            let metadata = json_string(&command.metadata, "runtime metadata")?;
            let result = sqlx::query(
                r#"
                UPDATE ai_runtime_invocation
                SET status = $1,
                    provider_response_id = $2,
                    provider_session_id = $3,
                    provider_conversation_id = $4,
                    provider_step_id = $5,
                    finish_reason = $6,
                    latency_ms = $7,
                    ttft_ms = $8,
                    exit_code = $9,
                    error_type = $10,
                    error_code = $11,
                    error_message_masked = $12,
                    response_json = $13::jsonb,
                    usage_json = $14::jsonb,
                    completed_at = $15::timestamp AT TIME ZONE 'UTC',
                    metadata = $16::jsonb
                WHERE tenant_id = $17
                  AND organization_id = $18
                  AND user_id = $19
                  AND uuid = $20
                "#,
            )
            .bind(&command.status)
            .bind(&command.provider_response_id)
            .bind(&command.provider_session_id)
            .bind(&command.provider_conversation_id)
            .bind(&command.provider_step_id)
            .bind(&command.finish_reason)
            .bind(command.latency_ms)
            .bind(command.ttft_ms)
            .bind(command.exit_code)
            .bind(&command.error_type)
            .bind(&command.error_code)
            .bind(&command.error_message_masked)
            .bind(&response_json)
            .bind(&usage_json)
            .bind(&command.requested_at)
            .bind(&metadata)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.subject.user_id)
            .bind(&command.invocation_id)
            .execute(&self.pool)
            .await
            .map_err(sql_error)?;
            if result.rows_affected() == 0 {
                return Err(DomainError::not_found("runtime invocation was not found"));
            }
            self.get_invocation(command.subject, command.invocation_id)
                .await?
                .ok_or_else(|| DomainError::not_found("runtime invocation was not found"))
        })
    }

    fn list_events<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
        page: i64,
        page_size: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventList> {
        Box::pin(async move {
            let page = page.max(1);
            let page_size = page_size.max(1);
            let offset = (page - 1) * page_size;
            let invocation = load_invocation_row_by_uuid(&self.pool, subject, &invocation_id)
                .await?
                .ok_or_else(|| DomainError::not_found("runtime invocation was not found"))?;
            let rows = sqlx::query(
                r#"
                SELECT
                    e.*,
                    i.uuid AS invocation_uuid,
                    CAST(e.created_at AS TEXT) AS created_at_text,
                    COUNT(*) OVER() AS total
                FROM ai_runtime_invocation_event e
                INNER JOIN ai_runtime_invocation i
                  ON i.id = e.invocation_id
                 AND i.tenant_id = e.tenant_id
                 AND i.organization_id = e.organization_id
                WHERE e.tenant_id = $1
                  AND e.organization_id = $2
                  AND e.invocation_id = $3
                  AND e.user_id = $4
                ORDER BY e.event_no ASC, e.id ASC
                LIMIT $5 OFFSET $6
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(integer_cell(&invocation, "id"))
            .bind(subject.user_id)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(sql_error)?;
            let total = rows
                .first()
                .and_then(|row| row.try_get::<i64, _>("total").ok())
                .unwrap_or(0);
            let items = rows
                .into_iter()
                .map(row_to_event)
                .collect::<DomainResult<Vec<_>>>()?;
            Ok(AppRuntimeEventList {
                items,
                total,
                page_no: page,
                page_size,
            })
        })
    }

    fn list_events_after<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
        after_event_no: i64,
        limit: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventList> {
        Box::pin(async move {
            let invocation = load_invocation_row_by_uuid(&self.pool, subject, &invocation_id)
                .await?
                .ok_or_else(|| DomainError::not_found("runtime invocation was not found"))?;
            let rows = sqlx::query(
                r#"
                SELECT
                    e.*,
                    i.uuid AS invocation_uuid,
                    CAST(e.created_at AS TEXT) AS created_at_text
                FROM ai_runtime_invocation_event e
                INNER JOIN ai_runtime_invocation i
                  ON i.id = e.invocation_id
                 AND i.tenant_id = e.tenant_id
                 AND i.organization_id = e.organization_id
                WHERE e.tenant_id = $1
                  AND e.organization_id = $2
                  AND e.invocation_id = $3
                  AND e.user_id = $4
                  AND e.event_no > $5
                ORDER BY e.event_no ASC, e.id ASC
                LIMIT $6
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(integer_cell(&invocation, "id"))
            .bind(subject.user_id)
            .bind(after_event_no.max(0))
            .bind(limit.max(1))
            .fetch_all(&self.pool)
            .await
            .map_err(sql_error)?;
            rows.into_iter()
                .map(row_to_event)
                .collect::<DomainResult<Vec<_>>>()
                .map(|items| {
                    let total = items.len() as i64;
                    AppRuntimeEventList {
                        items,
                        total,
                        page_no: 1,
                        page_size: limit.max(1),
                    }
                })
        })
    }

    fn has_terminal_event<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, bool> {
        Box::pin(async move {
            let exists = sqlx::query_scalar::<_, bool>(
                r#"
                SELECT EXISTS(
                    SELECT 1
                    FROM ai_runtime_invocation_event e
                    INNER JOIN ai_runtime_invocation i
                      ON i.id = e.invocation_id
                     AND i.tenant_id = e.tenant_id
                     AND i.organization_id = e.organization_id
                    WHERE e.tenant_id = $1
                      AND e.organization_id = $2
                      AND e.user_id = $3
                      AND i.uuid = $4
                      AND e.event_type IN ('runtime.completed', 'runtime.failed', 'runtime.cancelled')
                    LIMIT 1
                )
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(subject.user_id)
            .bind(&invocation_id)
            .fetch_one(&self.pool)
            .await
            .map_err(sql_error)?;
            Ok(exists)
        })
    }

    fn get_terminal_event<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeEventItem>> {
        Box::pin(async move {
            let row = sqlx::query(
                r#"
                SELECT e.*, i.uuid AS invocation_uuid, CAST(e.created_at AS TEXT) AS created_at_text
                FROM ai_runtime_invocation_event e
                INNER JOIN ai_runtime_invocation i
                  ON i.id = e.invocation_id
                 AND i.tenant_id = e.tenant_id
                 AND i.organization_id = e.organization_id
                WHERE e.tenant_id = $1
                  AND e.organization_id = $2
                  AND e.user_id = $3
                  AND i.uuid = $4
                  AND e.event_type IN ('runtime.completed', 'runtime.failed', 'runtime.cancelled')
                ORDER BY e.event_no ASC, e.id ASC
                LIMIT 1
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(subject.user_id)
            .bind(&invocation_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(sql_error)?;
            row.map(row_to_event).transpose()
        })
    }

    fn create_event<'a>(
        &'a self,
        command: CreateAppRuntimeEventCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventItem> {
        Box::pin(async move { create_event(&self.pool, command).await })
    }

    fn list_artifacts<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
        page: i64,
        page_size: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeArtifactList> {
        Box::pin(async move {
            let page = page.max(1);
            let page_size = page_size.max(1);
            let offset = (page - 1) * page_size;
            load_invocation_row_by_uuid(&self.pool, subject, &invocation_id)
                .await?
                .ok_or_else(|| DomainError::not_found("runtime invocation was not found"))?;
            let rows = sqlx::query(
                r#"
                SELECT *, CAST(created_at AS TEXT) AS created_at_text, COUNT(*) OVER() AS total
                FROM ai_runtime_artifact
                WHERE tenant_id = $1
                  AND organization_id = $2
                  AND user_id = $3
                  AND runtime_invocation_id = $4
                ORDER BY created_at ASC, id ASC
                LIMIT $5 OFFSET $6
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(subject.user_id)
            .bind(&invocation_id)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(sql_error)?;
            let total = rows
                .first()
                .and_then(|row| row.try_get::<i64, _>("total").ok())
                .unwrap_or(0);
            let items = rows
                .into_iter()
                .map(row_to_artifact)
                .collect::<DomainResult<Vec<_>>>()?;
            Ok(AppRuntimeArtifactList {
                items,
                total,
                page_no: page,
                page_size,
            })
        })
    }

    fn create_artifact<'a>(
        &'a self,
        command: CreateAppRuntimeArtifactCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeArtifactItem> {
        Box::pin(async move { create_artifact(&self.pool, command).await })
    }
}

async fn create_event(
    pool: &PgPool,
    command: CreateAppRuntimeEventCommand,
) -> DomainResult<AppRuntimeEventItem> {
    let payload_json = json_string(&command.payload_json, "runtime event payload json")?;
    let metadata = json_string(&command.metadata, "runtime event metadata")?;
    let mut tx = pool.begin().await.map_err(|error| {
        DomainError::new(format!("failed to begin runtime transaction: {error}"))
    })?;
    let invocation = load_invocation_row_by_uuid_for_update_in_tx(
        &mut tx,
        command.subject,
        &command.invocation_id,
    )
    .await?
    .ok_or_else(|| DomainError::not_found("runtime invocation was not found"))?;
    let invocation_pk = integer_cell(&invocation, "id");
    if is_runtime_terminal_event_type(&command.event_type) {
        if let Some(row) =
            load_terminal_event_row_in_tx(&mut tx, command.subject, invocation_pk).await?
        {
            let item = row_to_event(row)?;
            tx.commit().await.map_err(|error| {
                DomainError::new(format!("failed to commit runtime transaction: {error}"))
            })?;
            return Ok(item);
        }
    }
    let event_no = next_event_no(&mut tx, command.subject, invocation_pk).await?;
    sqlx::query(
        r#"
        INSERT INTO ai_runtime_invocation_event (
            uuid,
            tenant_id,
            organization_id,
            user_id,
            invocation_id,
            conversation_id,
            chat_turn_id,
            agent_session_id,
            agent_run_id,
            agent_run_step_id,
            event_no,
            event_type,
            event_source,
            payload_json,
            text_delta,
            created_at,
            metadata,
            id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16::timestamp AT TIME ZONE 'UTC', $17::jsonb, $18)
        "#,
    )
    .bind(&command.event_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(invocation_pk)
    .bind(optional_string_cell(&invocation, "conversation_id"))
    .bind(optional_string_cell(&invocation, "chat_turn_id"))
    .bind(optional_string_cell(&invocation, "agent_session_id"))
    .bind(optional_string_cell(&invocation, "agent_run_id"))
    .bind(optional_string_cell(&invocation, "agent_run_step_id"))
    .bind(event_no)
    .bind(&command.event_type)
    .bind(&command.event_source)
    .bind(&payload_json)
    .bind(&command.text_delta)
    .bind(&command.requested_at)
    .bind(&metadata)
    .bind(next_claw_runtime_id("ai_runtime_invocation_event")?)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;
    tx.commit().await.map_err(|error| {
        DomainError::new(format!("failed to commit runtime transaction: {error}"))
    })?;

    let row = sqlx::query(
        r#"
        SELECT e.*, i.uuid AS invocation_uuid, CAST(e.created_at AS TEXT) AS created_at_text
        FROM ai_runtime_invocation_event e
        INNER JOIN ai_runtime_invocation i
          ON i.id = e.invocation_id
         AND i.tenant_id = e.tenant_id
         AND i.organization_id = e.organization_id
        WHERE e.uuid = $1
          AND e.tenant_id = $2
          AND e.organization_id = $3
          AND i.user_id = $4
        "#,
    )
    .bind(&command.event_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .fetch_one(pool)
    .await
    .map_err(sql_error)?;
    row_to_event(row)
}

async fn create_artifact(
    pool: &PgPool,
    command: CreateAppRuntimeArtifactCommand,
) -> DomainResult<AppRuntimeArtifactItem> {
    let content_json = json_string(&command.content_json, "runtime artifact content json")?;
    let metadata = json_string(&command.metadata, "runtime artifact metadata")?;
    let resource_snapshot = command.resource.as_ref().map(Value::to_string);
    let drive_uri = command.resource.as_ref().and_then(drive_uri_from_resource);
    let invocation = load_invocation_row_by_uuid(pool, command.subject, &command.invocation_id)
        .await?
        .ok_or_else(|| DomainError::not_found("runtime invocation was not found"))?;
    sqlx::query(
        r#"
        INSERT INTO ai_runtime_artifact (
            uuid,
            tenant_id,
            organization_id,
            user_id,
            conversation_id,
            chat_turn_id,
            chat_item_id,
            agent_session_id,
            agent_run_id,
            agent_run_step_id,
            runtime_invocation_id,
            artifact_type,
            name,
            mime_type,
            content_text,
            content_json,
            drive_uri,
            resource_snapshot,
            sha256,
            size_bytes,
            created_at,
            metadata,
            id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18::jsonb, $19, $20, $21::timestamp AT TIME ZONE 'UTC', $22::jsonb, $23)
        "#,
    )
    .bind(&command.artifact_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(optional_string_cell(&invocation, "conversation_id"))
    .bind(optional_string_cell(&invocation, "chat_turn_id"))
    .bind(optional_string_cell(&invocation, "chat_item_id"))
    .bind(optional_string_cell(&invocation, "agent_session_id"))
    .bind(optional_string_cell(&invocation, "agent_run_id"))
    .bind(optional_string_cell(&invocation, "agent_run_step_id"))
    .bind(&command.invocation_id)
    .bind(&command.artifact_type)
    .bind(&command.name)
    .bind(&command.mime_type)
    .bind(&command.content_text)
    .bind(&content_json)
    .bind(drive_uri)
    .bind(resource_snapshot)
    .bind(&command.sha256)
    .bind(command.size_bytes)
    .bind(&command.requested_at)
    .bind(&metadata)
    .bind(next_claw_runtime_id("ai_runtime_artifact")?)
    .execute(pool)
    .await
    .map_err(sql_error)?;

    let row = sqlx::query(
        r#"
        SELECT *, CAST(created_at AS TEXT) AS created_at_text
        FROM ai_runtime_artifact
        WHERE uuid = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND runtime_invocation_id = $4
        "#,
    )
    .bind(&command.artifact_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.invocation_id)
    .fetch_one(pool)
    .await
    .map_err(sql_error)?;
    row_to_artifact(row)
}

async fn next_invocation_no(
    pool: &PgPool,
    subject: AppRuntimeSubject,
    command: &CreateAppRuntimeInvocationCommand,
) -> DomainResult<i64> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) + 1 AS next_value
        FROM ai_runtime_invocation
        WHERE tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
          AND COALESCE(conversation_id, '') = COALESCE($4, '')
          AND COALESCE(chat_turn_id, '') = COALESCE($5, '')
          AND COALESCE(agent_session_id, '') = COALESCE($6, '')
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(&command.conversation_id)
    .bind(&command.chat_turn_id)
    .bind(&command.agent_session_id)
    .fetch_one(pool)
    .await
    .map_err(sql_error)?;
    Ok(integer_cell(&row, "next_value"))
}

async fn next_event_no(
    tx: &mut Transaction<'_, Postgres>,
    subject: AppRuntimeSubject,
    invocation_pk: i64,
) -> DomainResult<i64> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) + 1 AS next_value
        FROM ai_runtime_invocation_event
        WHERE tenant_id = $1
          AND organization_id = $2
          AND invocation_id = $3
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(invocation_pk)
    .fetch_one(&mut **tx)
    .await
    .map_err(sql_error)?;
    Ok(integer_cell(&row, "next_value"))
}

async fn load_terminal_event_row_in_tx(
    tx: &mut Transaction<'_, Postgres>,
    subject: AppRuntimeSubject,
    invocation_pk: i64,
) -> DomainResult<Option<sqlx::postgres::PgRow>> {
    sqlx::query(
        r#"
        SELECT e.*, i.uuid AS invocation_uuid, CAST(e.created_at AS TEXT) AS created_at_text
        FROM ai_runtime_invocation_event e
        INNER JOIN ai_runtime_invocation i
          ON i.id = e.invocation_id
         AND i.tenant_id = e.tenant_id
         AND i.organization_id = e.organization_id
        WHERE e.tenant_id = $1
          AND e.organization_id = $2
          AND e.user_id = $3
          AND e.invocation_id = $4
          AND e.event_type IN ('runtime.completed', 'runtime.failed', 'runtime.cancelled')
        ORDER BY e.event_no ASC, e.id ASC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(invocation_pk)
    .fetch_optional(&mut **tx)
    .await
    .map_err(sql_error)
}

fn is_runtime_terminal_event_type(event_type: &str) -> bool {
    matches!(
        event_type,
        "runtime.completed" | "runtime.failed" | "runtime.cancelled"
    )
}

async fn load_invocation_row_by_uuid(
    pool: &PgPool,
    subject: AppRuntimeSubject,
    invocation_id: &str,
) -> DomainResult<Option<sqlx::postgres::PgRow>> {
    let sql = invocation_select_sql("AND uuid = $4 LIMIT 1", false);
    sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(invocation_id)
        .fetch_optional(pool)
        .await
        .map_err(sql_error)
}

async fn load_invocation_row_by_uuid_for_update_in_tx(
    tx: &mut Transaction<'_, Postgres>,
    subject: AppRuntimeSubject,
    invocation_id: &str,
) -> DomainResult<Option<sqlx::postgres::PgRow>> {
    let sql = invocation_select_sql("AND uuid = $4 LIMIT 1 FOR UPDATE", false);
    sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(invocation_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(sql_error)
}

async fn validate_invocation_context(
    pool: &PgPool,
    command: &CreateAppRuntimeInvocationCommand,
) -> DomainResult<()> {
    validate_chat_context(pool, command).await?;
    validate_agent_context(pool, command).await
}

async fn validate_chat_context(
    pool: &PgPool,
    command: &CreateAppRuntimeInvocationCommand,
) -> DomainResult<()> {
    let conversation =
        validate_context_conversation(pool, command.subject, command.conversation_id.as_deref())
            .await?;
    let conversation_pk = conversation.as_ref().map(|(id, _)| *id);
    let turn_pk = validate_context_turn(
        pool,
        command.subject,
        command.chat_turn_id.as_deref(),
        conversation_pk,
    )
    .await?;
    validate_context_item(
        pool,
        command.subject,
        command.chat_item_id.as_deref(),
        conversation_pk,
        turn_pk,
    )
    .await?;
    Ok(())
}

async fn validate_context_conversation(
    pool: &PgPool,
    subject: AppRuntimeSubject,
    conversation_id: Option<&str>,
) -> DomainResult<Option<(i64, String)>> {
    let Some(conversation_id) = non_empty(conversation_id) else {
        return Ok(None);
    };
    let row = sqlx::query(
        r#"
        SELECT id, conversation_code
        FROM ai_chat_conversation
        WHERE tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
          AND (conversation_code = $4 OR uuid = $4)
          AND status <> 'deleted'
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(conversation_id)
    .fetch_optional(pool)
    .await
    .map_err(sql_error)?;
    row.map(|row| {
        (
            integer_cell(&row, "id"),
            string_cell(&row, "conversation_code"),
        )
    })
    .map(Some)
    .ok_or_else(|| DomainError::not_found("chat conversation was not found"))
}

async fn validate_context_turn(
    pool: &PgPool,
    subject: AppRuntimeSubject,
    turn_id: Option<&str>,
    conversation_pk: Option<i64>,
) -> DomainResult<Option<i64>> {
    let Some(turn_id) = non_empty(turn_id) else {
        return Ok(None);
    };
    let id = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT id
        FROM ai_chat_turn
        WHERE tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
          AND uuid = $4
          AND ($5 IS NULL OR conversation_id = $5)
          AND status <> 'deleted'
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(turn_id)
    .bind(conversation_pk)
    .fetch_optional(pool)
    .await
    .map_err(sql_error)?;
    id.map(Some)
        .ok_or_else(|| DomainError::not_found("chat turn was not found"))
}

async fn validate_context_item(
    pool: &PgPool,
    subject: AppRuntimeSubject,
    item_id: Option<&str>,
    conversation_pk: Option<i64>,
    turn_pk: Option<i64>,
) -> DomainResult<Option<i64>> {
    let Some(item_id) = non_empty(item_id) else {
        return Ok(None);
    };
    let id = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT id
        FROM ai_chat_item
        WHERE tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
          AND uuid = $4
          AND ($5 IS NULL OR conversation_id = $5)
          AND ($6 IS NULL OR turn_id = $6)
          AND status <> 'deleted'
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(item_id)
    .bind(conversation_pk)
    .bind(turn_pk)
    .fetch_optional(pool)
    .await
    .map_err(sql_error)?;
    id.map(Some)
        .ok_or_else(|| DomainError::not_found("chat item was not found"))
}

async fn validate_agent_context(
    pool: &PgPool,
    command: &CreateAppRuntimeInvocationCommand,
) -> DomainResult<()> {
    let session_code =
        validate_context_agent_session(pool, command.subject, command.agent_session_id.as_deref())
            .await?;
    let run_pk = validate_context_agent_run(
        pool,
        command.subject,
        command.agent_run_id.as_deref(),
        session_code.as_deref(),
    )
    .await?;
    validate_context_agent_step(
        pool,
        command.subject,
        command.agent_run_step_id.as_deref(),
        run_pk,
    )
    .await?;
    Ok(())
}

async fn validate_context_agent_session(
    pool: &PgPool,
    subject: AppRuntimeSubject,
    session_id: Option<&str>,
) -> DomainResult<Option<String>> {
    let Some(session_id) = non_empty(session_id) else {
        return Ok(None);
    };
    let code = sqlx::query_scalar::<_, String>(
        r#"
        SELECT session_code
        FROM ai_agent_session
        WHERE tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
          AND (session_code = $4 OR uuid = $4)
          AND status <> 'deleted'
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(session_id)
    .fetch_optional(pool)
    .await
    .map_err(sql_error)?;
    code.map(Some)
        .ok_or_else(|| DomainError::not_found("agent session was not found"))
}

async fn validate_context_agent_run(
    pool: &PgPool,
    subject: AppRuntimeSubject,
    run_id: Option<&str>,
    session_code: Option<&str>,
) -> DomainResult<Option<i64>> {
    let Some(run_id) = non_empty(run_id) else {
        return Ok(None);
    };
    let id = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT id
        FROM ai_agent_run
        WHERE tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
          AND (run_uuid = $4 OR uuid = $4)
          AND ($5 IS NULL OR agent_session_id = $5)
          AND status <> 'deleted'
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(run_id)
    .bind(session_code)
    .fetch_optional(pool)
    .await
    .map_err(sql_error)?;
    id.map(Some)
        .ok_or_else(|| DomainError::not_found("agent run was not found"))
}

async fn validate_context_agent_step(
    pool: &PgPool,
    subject: AppRuntimeSubject,
    step_id: Option<&str>,
    run_pk: Option<i64>,
) -> DomainResult<Option<i64>> {
    let Some(step_id) = non_empty(step_id) else {
        return Ok(None);
    };
    let id = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT id
        FROM ai_agent_run_step
        WHERE tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
          AND uuid = $4
          AND ($5 IS NULL OR run_id = $5)
          AND status <> 'deleted'
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(step_id)
    .bind(run_pk)
    .fetch_optional(pool)
    .await
    .map_err(sql_error)?;
    id.map(Some)
        .ok_or_else(|| DomainError::not_found("agent run step was not found"))
}

fn invocation_select_sql(extra: &'static str, include_total: bool) -> String {
    let total_expr = if include_total {
        ", COUNT(*) OVER() AS total"
    } else {
        ""
    };
    format!(
        r#"
        SELECT
            id,
            uuid,
            conversation_id,
            chat_turn_id,
            chat_item_id,
            agent_session_id,
            agent_run_id,
            agent_run_step_id,
            invocation_no,
            invocation_type,
            runtime,
            endpoint,
            attempt_no,
            status,
            request_id,
            trace_id,
            provider_response_id,
            provider_session_id,
            provider_conversation_id,
            provider_step_id,
            model,
            provider,
            tool_name,
            tool_call_id,
            cwd,
            sandbox_policy,
            approval_policy,
            permission_mode,
            streaming,
            CAST(started_at AS TEXT) AS started_at,
            CAST(completed_at AS TEXT) AS completed_at,
            latency_ms,
            ttft_ms,
            exit_code,
            finish_reason,
            error_type,
            error_code,
            error_message_masked,
            request_json::text AS request_json,
            metadata::text AS metadata,
            CAST(created_at AS TEXT) AS created_at
            {total_expr}
        FROM ai_runtime_invocation
        WHERE tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
        {extra}
        "#
    )
}

fn row_to_invocation(row: sqlx::postgres::PgRow) -> DomainResult<AppRuntimeInvocationItem> {
    Ok(AppRuntimeInvocationItem {
        id: string_cell(&row, "uuid"),
        invocation_no: integer_cell(&row, "invocation_no"),
        invocation_type: string_cell(&row, "invocation_type"),
        runtime: string_cell(&row, "runtime"),
        endpoint: optional_string_cell(&row, "endpoint"),
        attempt_no: integer_cell(&row, "attempt_no"),
        status: string_cell(&row, "status"),
        conversation_id: optional_string_cell(&row, "conversation_id"),
        chat_turn_id: optional_string_cell(&row, "chat_turn_id"),
        chat_item_id: optional_string_cell(&row, "chat_item_id"),
        agent_session_id: optional_string_cell(&row, "agent_session_id"),
        agent_run_id: optional_string_cell(&row, "agent_run_id"),
        agent_run_step_id: optional_string_cell(&row, "agent_run_step_id"),
        request_id: optional_string_cell(&row, "request_id"),
        trace_id: optional_string_cell(&row, "trace_id"),
        provider_response_id: optional_string_cell(&row, "provider_response_id"),
        provider_session_id: optional_string_cell(&row, "provider_session_id"),
        provider_conversation_id: optional_string_cell(&row, "provider_conversation_id"),
        provider_step_id: optional_string_cell(&row, "provider_step_id"),
        model: optional_string_cell(&row, "model"),
        provider: optional_string_cell(&row, "provider"),
        tool_name: optional_string_cell(&row, "tool_name"),
        tool_call_id: optional_string_cell(&row, "tool_call_id"),
        cwd: optional_string_cell(&row, "cwd"),
        sandbox_policy: optional_string_cell(&row, "sandbox_policy"),
        approval_policy: optional_string_cell(&row, "approval_policy"),
        permission_mode: optional_string_cell(&row, "permission_mode"),
        streaming: bool_cell(&row, "streaming"),
        started_at: optional_string_cell(&row, "started_at"),
        completed_at: optional_string_cell(&row, "completed_at"),
        latency_ms: optional_integer_cell(&row, "latency_ms"),
        ttft_ms: optional_integer_cell(&row, "ttft_ms"),
        exit_code: optional_integer_cell(&row, "exit_code"),
        finish_reason: optional_string_cell(&row, "finish_reason"),
        error_type: optional_string_cell(&row, "error_type"),
        error_code: optional_string_cell(&row, "error_code"),
        error_message_masked: optional_string_cell(&row, "error_message_masked"),
        created_at: string_cell(&row, "created_at"),
    })
}

fn row_to_invocation_execution(
    row: sqlx::postgres::PgRow,
) -> DomainResult<AppRuntimeInvocationExecution> {
    let request_json = json_cell(&row, "request_json")?;
    let metadata = json_cell(&row, "metadata")?;
    let item = row_to_invocation(row)?;
    Ok(AppRuntimeInvocationExecution {
        item,
        request_json,
        metadata,
    })
}

fn row_to_event(row: sqlx::postgres::PgRow) -> DomainResult<AppRuntimeEventItem> {
    Ok(AppRuntimeEventItem {
        id: string_cell(&row, "uuid"),
        invocation_id: string_cell(&row, "invocation_uuid"),
        event_no: integer_cell(&row, "event_no"),
        event_type: string_cell(&row, "event_type"),
        event_source: string_cell(&row, "event_source"),
        payload_json: json_cell(&row, "payload_json")?,
        text_delta: optional_text_cell(&row, "text_delta"),
        created_at: optional_string_cell(&row, "created_at_text")
            .unwrap_or_else(|| string_cell(&row, "created_at")),
    })
}

fn row_to_artifact(row: sqlx::postgres::PgRow) -> DomainResult<AppRuntimeArtifactItem> {
    Ok(AppRuntimeArtifactItem {
        id: string_cell(&row, "uuid"),
        invocation_id: string_cell(&row, "runtime_invocation_id"),
        artifact_type: string_cell(&row, "artifact_type"),
        name: optional_string_cell(&row, "name"),
        mime_type: optional_string_cell(&row, "mime_type"),
        content_text: optional_string_cell(&row, "content_text"),
        storage_key: resource_storage_key(&json_cell(&row, "resource_snapshot")?),
        resource: Some(json_cell(&row, "resource_snapshot")?),
        sha256: optional_string_cell(&row, "sha256"),
        size_bytes: optional_integer_cell(&row, "size_bytes"),
        created_at: optional_string_cell(&row, "created_at_text")
            .unwrap_or_else(|| string_cell(&row, "created_at")),
    })
}

fn resource_storage_key(resource: &serde_json::Value) -> Option<String> {
    resource
        .get("objectKey")
        .or_else(|| resource.get("object_key"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn json_string(value: &serde_json::Value, field: &str) -> DomainResult<String> {
    serde_json::to_string(value)
        .map_err(|error| DomainError::new(format!("invalid {field}: {error}")))
}

fn json_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<serde_json::Value> {
    if let Ok(Some(value)) = row.try_get::<Option<serde_json::Value>, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<serde_json::Value, _>(column) {
        return Ok(value);
    }
    let raw = row
        .try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<String, _>(column).ok())
        .unwrap_or_else(|| "{}".to_owned());
    if raw.trim().is_empty() {
        return Ok(serde_json::Value::Object(Default::default()));
    }
    serde_json::from_str(&raw)
        .map_err(|error| DomainError::new(format!("invalid runtime {column}: {error}")))
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    optional_string_cell(row, column).unwrap_or_default()
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<String, _>(column).ok())
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn optional_text_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<String, _>(column).ok())
        .filter(|value| !value.is_empty())
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
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
        .unwrap_or_default()
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

fn bool_cell(row: &sqlx::postgres::PgRow, column: &str) -> bool {
    row.try_get::<Option<bool>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<bool, _>(column).ok())
        .unwrap_or(false)
}

fn non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(format!("postgres app runtime store error: {error}"))
}
