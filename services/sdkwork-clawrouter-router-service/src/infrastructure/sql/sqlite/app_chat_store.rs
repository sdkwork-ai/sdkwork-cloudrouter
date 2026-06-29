use serde_json::{json, Value};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AppChatConversationItem, AppChatConversationList, AppChatFuture, AppChatMessageItem,
    AppChatStore, AppChatSubject, AppChatTurnItem, AppChatTurnOutcome, AppChatUsageSnapshot,
    CompleteAppChatTurnCommand, CreateAppChatConversationCommand, CreateAppChatTurnCommand,
};

#[derive(Debug, Clone)]
pub struct SqliteAppChatStore {
    pool: SqlitePool,
}

impl SqliteAppChatStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AppChatStore for SqliteAppChatStore {
    fn list_conversations<'a>(
        &'a self,
        subject: AppChatSubject,
        page: i64,
        page_size: i64,
    ) -> AppChatFuture<'a, AppChatConversationList> {
        Box::pin(async move {
            let offset = (page.max(1) - 1) * page_size.max(1);
            let rows = sqlx::query(
                r#"
                SELECT *
                FROM ai_chat_conversation
                WHERE tenant_id = ?1
                  AND organization_id = ?2
                  AND user_id = ?3
                  AND status <> 'deleted'
                ORDER BY updated_at DESC, id DESC
                LIMIT ?4 OFFSET ?5
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(subject.user_id)
            .bind(page_size.max(1))
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(sql_error)?;
            rows.into_iter()
                .map(row_to_conversation)
                .collect::<DomainResult<Vec<_>>>()
                .map(|items| AppChatConversationList { items })
        })
    }

    fn get_conversation<'a>(
        &'a self,
        subject: AppChatSubject,
        conversation_id: String,
    ) -> AppChatFuture<'a, Option<AppChatConversationItem>> {
        Box::pin(async move {
            let row = sqlx::query(
                r#"
                SELECT *
                FROM ai_chat_conversation
                WHERE tenant_id = ?1
                  AND organization_id = ?2
                  AND user_id = ?3
                  AND conversation_code = ?4
                  AND status <> 'deleted'
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(subject.user_id)
            .bind(conversation_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(sql_error)?;
            row.map(row_to_conversation).transpose()
        })
    }

    fn create_conversation<'a>(
        &'a self,
        command: CreateAppChatConversationCommand,
    ) -> AppChatFuture<'a, AppChatConversationItem> {
        Box::pin(async move {
            let title = command
                .title
                .clone()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "New conversation".to_owned());
            let metadata = serde_json::to_string(&command.metadata)
                .map_err(|error| DomainError::new(format!("invalid chat metadata: {error}")))?;
            let conversation_pk = next_claw_runtime_id("ai_chat_conversation")?;
            sqlx::query(
                r#"
                INSERT INTO ai_chat_conversation (
                    id,
                    uuid,
                    tenant_id,
                    organization_id,
                    user_id,
                    status,
                    created_at,
                    updated_at,
                    metadata,
                    conversation_code,
                    title,
                    source_surface,
                    default_provider,
                    default_model,
                    agent_id,
                    agent_session_id,
                    memory_space_id,
                    last_message_preview,
                    message_count,
                    turn_count
                )
                VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, NULL, 0, 0)
                "#,
            )
            .bind(conversation_pk)
            .bind(&command.conversation_uuid)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.subject.user_id)
            .bind(&command.requested_at)
            .bind(&metadata)
            .bind(&command.conversation_uuid)
            .bind(&title)
            .bind(&command.source_surface)
            .bind(&command.default_provider)
            .bind(&command.default_model)
            .bind(&command.agent_id)
            .bind(&command.agent_session_id)
            .bind(&command.memory_space_id)
            .execute(&self.pool)
            .await
            .map_err(sql_error)?;

            self.get_conversation(command.subject, command.conversation_uuid)
                .await?
                .ok_or_else(|| DomainError::new("created chat conversation was not found"))
        })
    }

    fn list_messages<'a>(
        &'a self,
        subject: AppChatSubject,
        conversation_id: String,
    ) -> AppChatFuture<'a, Vec<AppChatMessageItem>> {
        Box::pin(async move {
            let rows = sqlx::query(
                r#"
                SELECT
                    m.*,
                    c.conversation_code AS conversation_code,
                    t.uuid AS turn_uuid,
                    u.uuid AS usage_link_uuid,
                    u.input_tokens AS usage_input_tokens,
                    u.output_tokens AS usage_output_tokens,
                    u.cached_tokens AS usage_cached_tokens,
                    u.reasoning_tokens AS usage_reasoning_tokens,
                    u.total_tokens AS usage_total_tokens,
                    u.cost_amount AS usage_cost_amount,
                    u.currency AS usage_currency
                FROM ai_chat_message m
                INNER JOIN ai_chat_conversation c
                  ON c.id = m.conversation_id
                 AND c.tenant_id = m.tenant_id
                 AND c.organization_id = m.organization_id
                 AND c.user_id = m.user_id
                LEFT JOIN ai_chat_turn t
                  ON t.id = m.turn_id
                 AND t.tenant_id = m.tenant_id
                 AND t.organization_id = m.organization_id
                 AND t.user_id = m.user_id
                LEFT JOIN ai_runtime_usage_link u
                  ON u.uuid = m.usage_link_id
                 AND u.tenant_id = m.tenant_id
                 AND u.organization_id = m.organization_id
                WHERE m.tenant_id = ?1
                  AND m.organization_id = ?2
                  AND m.user_id = ?3
                  AND c.conversation_code = ?4
                  AND m.status <> 'deleted'
                ORDER BY m.message_no ASC, m.id ASC
                "#,
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(subject.user_id)
            .bind(conversation_id)
            .fetch_all(&self.pool)
            .await
            .map_err(sql_error)?;
            rows.into_iter().map(row_to_message).collect()
        })
    }

    fn create_turn<'a>(
        &'a self,
        command: CreateAppChatTurnCommand,
    ) -> AppChatFuture<'a, AppChatTurnOutcome> {
        Box::pin(async move { create_turn(&self.pool, command).await })
    }

    fn complete_turn_response<'a>(
        &'a self,
        command: CompleteAppChatTurnCommand,
    ) -> AppChatFuture<'a, AppChatTurnOutcome> {
        Box::pin(async move { complete_turn_response(&self.pool, command).await })
    }
}

async fn create_turn(
    pool: &SqlitePool,
    command: CreateAppChatTurnCommand,
) -> DomainResult<AppChatTurnOutcome> {
    let metadata = serde_json::to_string(&command.metadata)
        .map_err(|error| DomainError::new(format!("invalid chat turn metadata: {error}")))?;
    let mut tx = pool.begin_with("BEGIN IMMEDIATE").await.map_err(|error| {
        DomainError::new(format!(
            "failed to begin immediate chat transaction: {error}"
        ))
    })?;
    let conversation = load_conversation_row(&mut tx, command.subject, &command.conversation_id)
        .await?
        .ok_or_else(|| DomainError::not_found("chat conversation was not found"))?;
    let conversation_pk = conversation.get::<i64, _>("id");
    let next_turn_no = next_count(&mut tx, ChatCountTable::AiChatTurn, conversation_pk).await?;
    let next_sequence_no = next_count(&mut tx, ChatCountTable::AiChatItem, conversation_pk).await?;
    let next_message_no = next_count(&mut tx, ChatCountTable::AiChatMessage, conversation_pk).await?;

    let turn_id = next_claw_runtime_id("ai_chat_turn")?;
    sqlx::query(
        r#"
        INSERT INTO ai_chat_turn (
            id,
            uuid,
            tenant_id,
            organization_id,
            user_id,
            conversation_id,
            turn_no,
            status,
            created_at,
            updated_at,
            provider,
            model,
            agent_id,
            agent_session_id,
            metadata
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'running', ?8, ?8, ?9, ?10, ?11, ?12, ?13)
        "#,
    )
    .bind(turn_id)
    .bind(&command.turn_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(conversation_pk)
    .bind(next_turn_no)
    .bind(&command.requested_at)
    .bind(&command.provider)
    .bind(&command.model)
    .bind(&command.agent_id)
    .bind(&command.agent_session_id)
    .bind(&metadata)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;

    let input_item_id = insert_item(
        &mut tx,
        &command,
        conversation_pk,
        turn_id,
        &command.input_item_uuid,
        next_sequence_no,
        "message",
        Some("user"),
        "input",
        "completed",
        Some(&command.message),
    )
    .await?;

    let _output_item_id = insert_item(
        &mut tx,
        &command,
        conversation_pk,
        turn_id,
        &command.output_item_uuid,
        next_sequence_no + 1,
        "message",
        Some("assistant"),
        "output",
        "pending",
        None,
    )
    .await?;

    let input_message_id = next_claw_runtime_id("ai_chat_message")?;
    sqlx::query(
        r#"
        INSERT INTO ai_chat_message (
            id,
            uuid,
            tenant_id,
            organization_id,
            user_id,
            conversation_id,
            turn_id,
            item_id,
            message_no,
            role,
            message_kind,
            direction,
            status,
            content_text,
            model,
            provider,
            created_at,
            updated_at,
            metadata
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'user', 'prompt', 'input', 'completed', ?10, NULL, NULL, ?11, ?11, ?12)
        "#,
    )
    .bind(input_message_id)
    .bind(&command.input_message_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(conversation_pk)
    .bind(turn_id)
    .bind(input_item_id)
    .bind(next_message_no)
    .bind(&command.message)
    .bind(&command.requested_at)
    .bind(&metadata)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;

    let input_message_part_id = next_claw_runtime_id("ai_chat_message_part")?;
    sqlx::query(
        r#"
        INSERT INTO ai_chat_message_part (
            id,
            uuid,
            tenant_id,
            organization_id,
            user_id,
            message_id,
            item_id,
            part_no,
            part_type,
            text_content,
            json_content,
            created_at,
            metadata
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 'text', ?8, NULL, ?9, ?10)
        "#,
    )
    .bind(input_message_part_id)
    .bind(format!("{}-part-1", command.input_message_uuid))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(input_message_id)
    .bind(input_item_id)
    .bind(&command.message)
    .bind(&command.requested_at)
    .bind(&metadata)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;

    sqlx::query(
        r#"
        UPDATE ai_chat_conversation
        SET updated_at = ?1,
            last_message_preview = ?2,
            message_count = message_count + 1,
            turn_count = turn_count + 1
        WHERE id = ?3
        "#,
    )
    .bind(&command.requested_at)
    .bind(&command.message)
    .bind(conversation_pk)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;

    tx.commit()
        .await
        .map_err(|error| DomainError::new(format!("failed to commit chat transaction: {error}")))?;

    let turn_uuid = command.turn_uuid.clone();
    let input_message_uuid = command.input_message_uuid.clone();
    let message = command.message.clone();
    let requested_at = command.requested_at.clone();
    Ok(AppChatTurnOutcome {
        turn: AppChatTurnItem {
            id: command.turn_uuid,
            conversation_id: command.conversation_id,
            status: "running".to_owned(),
            model: command.model,
            provider: command.provider,
            agent_id: command.agent_id,
            agent_session_id: command.agent_session_id,
            created_at: command.requested_at.clone(),
            updated_at: command.requested_at.clone(),
        },
        messages: vec![AppChatMessageItem {
            id: input_message_uuid,
            conversation_id: conversation.get::<String, _>("conversation_code"),
            turn_id: Some(turn_uuid),
            role: "user".to_owned(),
            direction: "input".to_owned(),
            content: message,
            status: "completed".to_owned(),
            model: None,
            provider: None,
            runtime: None,
            runtime_invocation_id: None,
            usage_link_id: None,
            usage: None,
            created_at: requested_at,
        }],
    })
}

async fn complete_turn_response(
    pool: &SqlitePool,
    command: CompleteAppChatTurnCommand,
) -> DomainResult<AppChatTurnOutcome> {
    let metadata = serde_json::to_string(&command.metadata)
        .map_err(|error| DomainError::new(format!("invalid chat response metadata: {error}")))?;
    let mut tx = pool.begin_with("BEGIN IMMEDIATE").await.map_err(|error| {
        DomainError::new(format!(
            "failed to begin immediate chat transaction: {error}"
        ))
    })?;
    let conversation = load_conversation_row(&mut tx, command.subject, &command.conversation_id)
        .await?
        .ok_or_else(|| DomainError::not_found("chat conversation was not found"))?;
    let conversation_pk = conversation.get::<i64, _>("id");
    let turn = load_turn_row(&mut tx, command.subject, conversation_pk, &command.turn_id)
        .await?
        .ok_or_else(|| DomainError::not_found("chat turn was not found"))?;
    let turn_pk = turn.get::<i64, _>("id");
    let output_item =
        match load_pending_output_item_row(&mut tx, command.subject, conversation_pk, turn_pk)
            .await?
        {
            Some(item) => item,
            None => {
                if let Some(outcome) = update_existing_streaming_turn_response_outcome(
                    &mut tx,
                    command.subject,
                    conversation_pk,
                    turn_pk,
                    &turn,
                    &command,
                    &metadata,
                )
                .await?
                {
                    tx.commit().await.map_err(|error| {
                        DomainError::new(format!("failed to commit chat transaction: {error}"))
                    })?;
                    return Ok(outcome);
                }
                if let Some(outcome) = load_existing_turn_response_outcome(
                    &mut tx,
                    command.subject,
                    conversation_pk,
                    turn_pk,
                    &turn,
                    &command,
                )
                .await?
                {
                    return Ok(outcome);
                }
                return Err(DomainError::conflict(
                    "chat turn output item is not pending",
                ));
            }
        };
    let output_item_pk = output_item.get::<i64, _>("id");
    let input_item = load_turn_input_item_row(&mut tx, command.subject, conversation_pk, turn_pk)
        .await?
        .ok_or_else(|| DomainError::conflict("chat turn input item was not found"))?;
    let next_message_no = next_count(&mut tx, ChatCountTable::AiChatMessage, conversation_pk).await?;
    let usage = command.usage.clone().unwrap_or_default();
    let usage_link_id = if command.usage.is_some()
        || command.runtime_invocation_id.is_some()
        || command.usage_fact_id.is_some()
    {
        insert_usage_link(
            &mut tx,
            &command,
            &conversation.get::<String, _>("conversation_code"),
            &usage,
        )
        .await?;
        Some(command.usage_link_uuid.clone())
    } else {
        None
    };

    sqlx::query(
        r#"
        UPDATE ai_chat_item
        SET status = ?1,
            content_text = ?2,
            runtime_invocation_id = ?3,
            completed_at = ?4,
            metadata = ?5
        WHERE id = ?6
        "#,
    )
    .bind(&command.status)
    .bind(&command.message)
    .bind(&command.runtime_invocation_id)
    .bind(&command.requested_at)
    .bind(&metadata)
    .bind(output_item_pk)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;

    let output_message_id = next_claw_runtime_id("ai_chat_message")?;
    sqlx::query(
        r#"
        INSERT INTO ai_chat_message (
            id,
            uuid,
            tenant_id,
            organization_id,
            user_id,
            conversation_id,
            turn_id,
            item_id,
            message_no,
            role,
            message_kind,
            direction,
            status,
            content_text,
            model,
            provider,
            runtime,
            runtime_invocation_id,
            usage_link_id,
            created_at,
            updated_at,
            metadata
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'assistant', 'response', 'output', ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?17, ?18)
        "#,
    )
    .bind(output_message_id)
    .bind(&command.output_message_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(conversation_pk)
    .bind(turn_pk)
    .bind(output_item_pk)
    .bind(next_message_no)
    .bind(&command.status)
    .bind(&command.message)
    .bind(&command.model)
    .bind(&command.provider)
    .bind(&command.runtime)
    .bind(&command.runtime_invocation_id)
    .bind(&usage_link_id)
    .bind(&command.requested_at)
    .bind(&metadata)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;

    let output_message_part_id = next_claw_runtime_id("ai_chat_message_part")?;
    sqlx::query(
        r#"
        INSERT INTO ai_chat_message_part (
            id,
            uuid,
            tenant_id,
            organization_id,
            user_id,
            message_id,
            item_id,
            part_no,
            part_type,
            text_content,
            json_content,
            created_at,
            metadata
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 'text', ?8, NULL, ?9, ?10)
        "#,
    )
    .bind(output_message_part_id)
    .bind(&command.output_part_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(output_message_id)
    .bind(output_item_pk)
    .bind(&command.message)
    .bind(&command.requested_at)
    .bind(&metadata)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;

    let context_snapshot_id = insert_context_snapshot(
        &mut tx,
        &command,
        conversation_pk,
        turn_pk,
        &input_item,
        &output_item,
        &usage,
        &metadata,
    )
    .await?;

    sqlx::query(
        r#"
        UPDATE ai_chat_turn
        SET status = ?1,
            updated_at = ?2,
            completed_at = CASE WHEN ?3 IN ('completed', 'failed', 'cancelled') THEN ?2 ELSE completed_at END,
            provider = COALESCE(?4, provider),
            model = COALESCE(?5, model),
            runtime_invocation_id = ?6,
            context_snapshot_id = ?7,
            metadata = ?8
        WHERE id = ?9
        "#,
    )
    .bind(&command.status)
    .bind(&command.requested_at)
    .bind(&command.status)
    .bind(&command.provider)
    .bind(&command.model)
    .bind(&command.runtime_invocation_id)
    .bind(context_snapshot_id)
    .bind(&metadata)
    .bind(turn_pk)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;

    sqlx::query(
        r#"
        UPDATE ai_chat_conversation
        SET updated_at = ?1,
            last_message_preview = ?2,
            message_count = message_count + 1
        WHERE id = ?3
        "#,
    )
    .bind(&command.requested_at)
    .bind(&command.message)
    .bind(conversation_pk)
    .execute(&mut *tx)
    .await
    .map_err(sql_error)?;

    tx.commit()
        .await
        .map_err(|error| DomainError::new(format!("failed to commit chat transaction: {error}")))?;

    Ok(AppChatTurnOutcome {
        turn: AppChatTurnItem {
            id: command.turn_id.clone(),
            conversation_id: command.conversation_id.clone(),
            status: command.status.clone(),
            model: command
                .model
                .clone()
                .or_else(|| optional_string_cell(&turn, "model")),
            provider: command
                .provider
                .clone()
                .or_else(|| optional_string_cell(&turn, "provider")),
            agent_id: optional_string_cell(&turn, "agent_id"),
            agent_session_id: optional_string_cell(&turn, "agent_session_id"),
            created_at: string_cell(&turn, "created_at"),
            updated_at: command.requested_at.clone(),
        },
        messages: vec![AppChatMessageItem {
            id: command.output_message_uuid,
            conversation_id: conversation.get::<String, _>("conversation_code"),
            turn_id: Some(command.turn_id),
            role: "assistant".to_owned(),
            direction: "output".to_owned(),
            content: command.message,
            status: command.status,
            model: command.model,
            provider: command.provider,
            runtime: command.runtime,
            runtime_invocation_id: command.runtime_invocation_id,
            usage_link_id,
            usage: command.usage,
            created_at: command.requested_at,
        }],
    })
}

async fn load_conversation_row(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AppChatSubject,
    conversation_id: &str,
) -> DomainResult<Option<sqlx::sqlite::SqliteRow>> {
    sqlx::query(
        r#"
        SELECT *
        FROM ai_chat_conversation
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND user_id = ?3
          AND conversation_code = ?4
          AND status <> 'deleted'
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(conversation_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(sql_error)
}

async fn load_turn_row(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AppChatSubject,
    conversation_pk: i64,
    turn_id: &str,
) -> DomainResult<Option<sqlx::sqlite::SqliteRow>> {
    sqlx::query(
        r#"
        SELECT *
        FROM ai_chat_turn
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND user_id = ?3
          AND conversation_id = ?4
          AND uuid = ?5
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(conversation_pk)
    .bind(turn_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(sql_error)
}

async fn load_pending_output_item_row(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AppChatSubject,
    conversation_pk: i64,
    turn_pk: i64,
) -> DomainResult<Option<sqlx::sqlite::SqliteRow>> {
    sqlx::query(
        r#"
        SELECT *
        FROM ai_chat_item
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND user_id = ?3
          AND conversation_id = ?4
          AND turn_id = ?5
          AND direction = 'output'
          AND role = 'assistant'
          AND status = 'pending'
        ORDER BY sequence_no ASC, id ASC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(conversation_pk)
    .bind(turn_pk)
    .fetch_optional(&mut **tx)
    .await
    .map_err(sql_error)
}

async fn load_existing_turn_response_outcome(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AppChatSubject,
    conversation_pk: i64,
    turn_pk: i64,
    turn: &sqlx::sqlite::SqliteRow,
    command: &CompleteAppChatTurnCommand,
) -> DomainResult<Option<AppChatTurnOutcome>> {
    let row = sqlx::query(
        r#"
        SELECT
            m.*,
            c.conversation_code AS conversation_code,
            t.uuid AS turn_uuid,
            u.uuid AS usage_link_uuid,
            u.input_tokens AS usage_input_tokens,
            u.output_tokens AS usage_output_tokens,
            u.cached_tokens AS usage_cached_tokens,
            u.reasoning_tokens AS usage_reasoning_tokens,
            u.total_tokens AS usage_total_tokens,
            u.cost_amount AS usage_cost_amount,
            u.currency AS usage_currency
        FROM ai_chat_message m
        INNER JOIN ai_chat_conversation c
          ON c.id = m.conversation_id
         AND c.tenant_id = m.tenant_id
         AND c.organization_id = m.organization_id
         AND c.user_id = m.user_id
        LEFT JOIN ai_chat_turn t
          ON t.id = m.turn_id
         AND t.tenant_id = m.tenant_id
         AND t.organization_id = m.organization_id
         AND t.user_id = m.user_id
        LEFT JOIN ai_runtime_usage_link u
          ON u.uuid = m.usage_link_id
         AND u.tenant_id = m.tenant_id
         AND u.organization_id = m.organization_id
        WHERE m.tenant_id = ?1
          AND m.organization_id = ?2
          AND m.user_id = ?3
          AND m.conversation_id = ?4
          AND m.turn_id = ?5
          AND m.role = 'assistant'
          AND m.direction = 'output'
          AND m.status IN ('completed', 'failed', 'cancelled')
        ORDER BY m.message_no DESC, m.id DESC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(conversation_pk)
    .bind(turn_pk)
    .fetch_optional(&mut **tx)
    .await
    .map_err(sql_error)?;

    let Some(row) = row else {
        return Ok(None);
    };
    let message = row_to_message(row)?;
    if let Some(expected_invocation_id) = command.runtime_invocation_id.as_deref() {
        if message.runtime_invocation_id.as_deref() != Some(expected_invocation_id) {
            return Ok(None);
        }
    }
    Ok(Some(AppChatTurnOutcome {
        turn: AppChatTurnItem {
            id: command.turn_id.clone(),
            conversation_id: command.conversation_id.clone(),
            status: message.status.clone(),
            model: message
                .model
                .clone()
                .or_else(|| optional_string_cell(turn, "model")),
            provider: message
                .provider
                .clone()
                .or_else(|| optional_string_cell(turn, "provider")),
            agent_id: optional_string_cell(turn, "agent_id"),
            agent_session_id: optional_string_cell(turn, "agent_session_id"),
            created_at: string_cell(turn, "created_at"),
            updated_at: message.created_at.clone(),
        },
        messages: vec![message],
    }))
}

async fn update_existing_streaming_turn_response_outcome(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AppChatSubject,
    conversation_pk: i64,
    turn_pk: i64,
    turn: &sqlx::sqlite::SqliteRow,
    command: &CompleteAppChatTurnCommand,
    metadata: &str,
) -> DomainResult<Option<AppChatTurnOutcome>> {
    let row = sqlx::query(
        r#"
        SELECT
            m.id AS message_pk,
            m.uuid,
            m.role,
            m.direction,
            m.content_text,
            m.status,
            m.model,
            m.provider,
            m.runtime,
            m.runtime_invocation_id,
            m.usage_link_id,
            m.created_at,
            i.id AS output_item_pk,
            c.conversation_code AS conversation_code,
            t.uuid AS turn_uuid,
            u.uuid AS usage_link_uuid,
            u.input_tokens AS usage_input_tokens,
            u.output_tokens AS usage_output_tokens,
            u.cached_tokens AS usage_cached_tokens,
            u.reasoning_tokens AS usage_reasoning_tokens,
            u.total_tokens AS usage_total_tokens,
            u.cost_amount AS usage_cost_amount,
            u.currency AS usage_currency
        FROM ai_chat_item i
        INNER JOIN ai_chat_message m
          ON m.item_id = i.id
         AND m.tenant_id = i.tenant_id
         AND m.organization_id = i.organization_id
         AND m.user_id = i.user_id
         AND m.conversation_id = i.conversation_id
         AND m.turn_id = i.turn_id
         AND m.role = 'assistant'
         AND m.direction = 'output'
         AND m.status = 'streaming'
        INNER JOIN ai_chat_conversation c
          ON c.id = i.conversation_id
         AND c.tenant_id = i.tenant_id
         AND c.organization_id = i.organization_id
         AND c.user_id = i.user_id
        LEFT JOIN ai_chat_turn t
          ON t.id = i.turn_id
         AND t.tenant_id = i.tenant_id
         AND t.organization_id = i.organization_id
         AND t.user_id = i.user_id
        LEFT JOIN ai_runtime_usage_link u
          ON u.uuid = m.usage_link_id
         AND u.tenant_id = m.tenant_id
         AND u.organization_id = m.organization_id
        WHERE i.tenant_id = ?1
          AND i.organization_id = ?2
          AND i.user_id = ?3
          AND i.conversation_id = ?4
          AND i.turn_id = ?5
          AND i.direction = 'output'
          AND i.role = 'assistant'
          AND i.status = 'streaming'
        ORDER BY i.sequence_no ASC, i.id ASC, m.message_no DESC, m.id DESC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(conversation_pk)
    .bind(turn_pk)
    .fetch_optional(&mut **tx)
    .await
    .map_err(sql_error)?;

    let Some(row) = row else {
        return Ok(None);
    };
    if let Some(expected_invocation_id) = command.runtime_invocation_id.as_deref() {
        let existing_invocation_id = optional_string_cell(&row, "runtime_invocation_id");
        if existing_invocation_id
            .as_deref()
            .is_some_and(|value| value != expected_invocation_id)
        {
            return Ok(None);
        }
    }

    let message_pk = integer_cell(&row, "message_pk");
    let message_uuid = string_cell(&row, "uuid");
    let output_item_pk = integer_cell(&row, "output_item_pk");
    let conversation_code = string_cell(&row, "conversation_code");
    let input_item = load_turn_input_item_row(tx, subject, conversation_pk, turn_pk)
        .await?
        .ok_or_else(|| DomainError::conflict("chat turn input item was not found"))?;
    let output_item = load_output_item_row_by_pk(tx, output_item_pk).await?;
    let usage = command.usage.clone().unwrap_or_default();
    let usage_link_id = reconcile_usage_link(
        tx,
        command,
        &conversation_code,
        &message_uuid,
        optional_string_cell(&row, "usage_link_id"),
        &usage,
        metadata,
    )
    .await?;

    sqlx::query(
        r#"
        UPDATE ai_chat_item
        SET status = ?1,
            content_text = ?2,
            runtime_invocation_id = COALESCE(?3, runtime_invocation_id),
            completed_at = CASE WHEN ?4 IN ('completed', 'failed', 'cancelled') THEN ?5 ELSE completed_at END,
            metadata = ?6
        WHERE id = ?7
        "#,
    )
    .bind(&command.status)
    .bind(&command.message)
    .bind(&command.runtime_invocation_id)
    .bind(&command.status)
    .bind(&command.requested_at)
    .bind(metadata)
    .bind(output_item_pk)
    .execute(&mut **tx)
    .await
    .map_err(sql_error)?;

    sqlx::query(
        r#"
        UPDATE ai_chat_message
        SET status = ?1,
            content_text = ?2,
            model = COALESCE(?3, model),
            provider = COALESCE(?4, provider),
            runtime = COALESCE(?5, runtime),
            runtime_invocation_id = COALESCE(?6, runtime_invocation_id),
            usage_link_id = ?7,
            updated_at = ?8,
            metadata = ?9
        WHERE id = ?10
        "#,
    )
    .bind(&command.status)
    .bind(&command.message)
    .bind(&command.model)
    .bind(&command.provider)
    .bind(&command.runtime)
    .bind(&command.runtime_invocation_id)
    .bind(&usage_link_id)
    .bind(&command.requested_at)
    .bind(metadata)
    .bind(message_pk)
    .execute(&mut **tx)
    .await
    .map_err(sql_error)?;

    sqlx::query(
        r#"
        UPDATE ai_chat_message_part
        SET text_content = ?1,
            metadata = ?2
        WHERE message_id = ?3
          AND item_id = ?4
          AND part_no = 1
          AND part_type = 'text'
        "#,
    )
    .bind(&command.message)
    .bind(metadata)
    .bind(message_pk)
    .bind(output_item_pk)
    .execute(&mut **tx)
    .await
    .map_err(sql_error)?;

    let context_snapshot_id = insert_context_snapshot(
        tx,
        command,
        conversation_pk,
        turn_pk,
        &input_item,
        &output_item,
        &usage,
        metadata,
    )
    .await?;

    sqlx::query(
        r#"
        UPDATE ai_chat_turn
        SET status = ?1,
            updated_at = ?2,
            completed_at = CASE WHEN ?3 IN ('completed', 'failed', 'cancelled') THEN ?2 ELSE completed_at END,
            provider = COALESCE(?4, provider),
            model = COALESCE(?5, model),
            runtime_invocation_id = COALESCE(?6, runtime_invocation_id),
            context_snapshot_id = ?7,
            metadata = ?8
        WHERE id = ?9
        "#,
    )
    .bind(&command.status)
    .bind(&command.requested_at)
    .bind(&command.status)
    .bind(&command.provider)
    .bind(&command.model)
    .bind(&command.runtime_invocation_id)
    .bind(context_snapshot_id)
    .bind(metadata)
    .bind(turn_pk)
    .execute(&mut **tx)
    .await
    .map_err(sql_error)?;

    sqlx::query(
        r#"
        UPDATE ai_chat_conversation
        SET updated_at = ?1,
            last_message_preview = ?2
        WHERE id = ?3
        "#,
    )
    .bind(&command.requested_at)
    .bind(&command.message)
    .bind(conversation_pk)
    .execute(&mut **tx)
    .await
    .map_err(sql_error)?;

    let message = load_turn_response_message_by_pk(tx, subject, message_pk).await?;
    Ok(Some(AppChatTurnOutcome {
        turn: AppChatTurnItem {
            id: command.turn_id.clone(),
            conversation_id: command.conversation_id.clone(),
            status: command.status.clone(),
            model: command
                .model
                .clone()
                .or_else(|| optional_string_cell(turn, "model")),
            provider: command
                .provider
                .clone()
                .or_else(|| optional_string_cell(turn, "provider")),
            agent_id: optional_string_cell(turn, "agent_id"),
            agent_session_id: optional_string_cell(turn, "agent_session_id"),
            created_at: string_cell(turn, "created_at"),
            updated_at: command.requested_at.clone(),
        },
        messages: vec![message],
    }))
}

async fn load_turn_input_item_row(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AppChatSubject,
    conversation_pk: i64,
    turn_pk: i64,
) -> DomainResult<Option<sqlx::sqlite::SqliteRow>> {
    sqlx::query(
        r#"
        SELECT *
        FROM ai_chat_item
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND user_id = ?3
          AND conversation_id = ?4
          AND turn_id = ?5
          AND direction = 'input'
          AND role = 'user'
          AND status <> 'deleted'
        ORDER BY sequence_no ASC, id ASC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(conversation_pk)
    .bind(turn_pk)
    .fetch_optional(&mut **tx)
    .await
    .map_err(sql_error)
}

async fn load_output_item_row_by_pk(
    tx: &mut Transaction<'_, Sqlite>,
    output_item_pk: i64,
) -> DomainResult<sqlx::sqlite::SqliteRow> {
    sqlx::query("SELECT * FROM ai_chat_item WHERE id = ?1")
        .bind(output_item_pk)
        .fetch_one(&mut **tx)
        .await
        .map_err(sql_error)
}

async fn load_turn_response_message_by_pk(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AppChatSubject,
    message_pk: i64,
) -> DomainResult<AppChatMessageItem> {
    let row = sqlx::query(
        r#"
        SELECT
            m.*,
            c.conversation_code AS conversation_code,
            t.uuid AS turn_uuid,
            u.uuid AS usage_link_uuid,
            u.input_tokens AS usage_input_tokens,
            u.output_tokens AS usage_output_tokens,
            u.cached_tokens AS usage_cached_tokens,
            u.reasoning_tokens AS usage_reasoning_tokens,
            u.total_tokens AS usage_total_tokens,
            u.cost_amount AS usage_cost_amount,
            u.currency AS usage_currency
        FROM ai_chat_message m
        INNER JOIN ai_chat_conversation c
          ON c.id = m.conversation_id
         AND c.tenant_id = m.tenant_id
         AND c.organization_id = m.organization_id
         AND c.user_id = m.user_id
        LEFT JOIN ai_chat_turn t
          ON t.id = m.turn_id
         AND t.tenant_id = m.tenant_id
         AND t.organization_id = m.organization_id
         AND t.user_id = m.user_id
        LEFT JOIN ai_runtime_usage_link u
          ON u.uuid = m.usage_link_id
         AND u.tenant_id = m.tenant_id
         AND u.organization_id = m.organization_id
        WHERE m.tenant_id = ?1
          AND m.organization_id = ?2
          AND m.user_id = ?3
          AND m.id = ?4
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(subject.user_id)
    .bind(message_pk)
    .fetch_one(&mut **tx)
    .await
    .map_err(sql_error)?;
    row_to_message(row)
}

async fn insert_context_snapshot(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CompleteAppChatTurnCommand,
    conversation_pk: i64,
    turn_pk: i64,
    input_item: &sqlx::sqlite::SqliteRow,
    output_item: &sqlx::sqlite::SqliteRow,
    usage: &AppChatUsageSnapshot,
    metadata: &str,
) -> DomainResult<i64> {
    let snapshot_no = next_context_snapshot_no(tx, command.subject, turn_pk).await?;
    let included_item_ids = json_string(
        &json!([
            string_cell(input_item, "uuid"),
            string_cell(output_item, "uuid")
        ]),
        "chat context included item ids",
    )?;
    let empty_list = json_string(&json!([]), "chat context empty list")?;
    let memory_pack = json_string(&json!({}), "chat context memory pack")?;
    let context_json = json_string(
        &json!({
            "conversationId": command.conversation_id,
            "turnId": command.turn_id,
            "inputItemId": string_cell(input_item, "uuid"),
            "outputItemId": string_cell(output_item, "uuid"),
            "runtime": command.runtime,
            "runtimeInvocationId": command.runtime_invocation_id,
            "provider": command.provider,
            "model": command.model,
            "usage": command.usage,
            "metadata": command.metadata,
        }),
        "chat context json",
    )?;
    let snapshot_id = next_claw_runtime_id("ai_chat_context_snapshot")?;
    sqlx::query(
        r#"
        INSERT INTO ai_chat_context_snapshot (
            id,
            uuid,
            tenant_id,
            organization_id,
            user_id,
            status,
            created_at,
            metadata,
            conversation_id,
            turn_id,
            runtime_invocation_id,
            snapshot_no,
            strategy,
            included_item_ids,
            excluded_item_ids,
            included_memory_ids,
            excluded_memory_ids,
            memory_pack,
            memory_token_count,
            provider_conversation_id,
            previous_response_id,
            input_token_estimate,
            truncation_reason,
            context_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7, ?8, ?9, NULL, ?10, 'full_turn_context', ?11, ?12, ?12, ?12, ?13, 0, ?14, ?15, ?16, NULL, ?17)
        "#,
    )
    .bind(snapshot_id)
    .bind(format!("{}-context-snapshot-{snapshot_no}", command.turn_id))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(&command.requested_at)
    .bind(metadata)
    .bind(conversation_pk)
    .bind(turn_pk)
    .bind(snapshot_no)
    .bind(&included_item_ids)
    .bind(&empty_list)
    .bind(&memory_pack)
    .bind(metadata_string_field(&command.metadata, "providerConversationId"))
    .bind(metadata_string_field(&command.metadata, "previousResponseId"))
    .bind(usage.input_tokens)
    .bind(&context_json)
    .execute(&mut **tx)
    .await
    .map_err(sql_error)?;
    Ok(snapshot_id)
}

async fn next_context_snapshot_no(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AppChatSubject,
    turn_pk: i64,
) -> DomainResult<i64> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) + 1 AS next_value
        FROM ai_chat_context_snapshot
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND turn_id = ?3
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(turn_pk)
    .fetch_one(&mut **tx)
    .await
    .map_err(sql_error)?;
    Ok(row.get::<i64, _>("next_value"))
}

async fn insert_usage_link(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CompleteAppChatTurnCommand,
    conversation_code: &str,
    usage: &AppChatUsageSnapshot,
) -> DomainResult<()> {
    insert_usage_link_for_message(
        tx,
        command,
        conversation_code,
        &command.output_message_uuid,
        &command.usage_link_uuid,
        usage,
    )
    .await
}

async fn insert_usage_link_for_message(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CompleteAppChatTurnCommand,
    conversation_code: &str,
    message_id: &str,
    usage_link_uuid: &str,
    usage: &AppChatUsageSnapshot,
) -> DomainResult<()> {
    let metadata = serde_json::to_string(&command.metadata)
        .map_err(|error| DomainError::new(format!("invalid runtime usage metadata: {error}")))?;
    let usage_link_id = next_claw_runtime_id("ai_runtime_usage_link")?;
    sqlx::query(
        r#"
        INSERT INTO ai_runtime_usage_link (
            id,
            uuid,
            tenant_id,
            organization_id,
            user_id,
            conversation_id,
            chat_turn_id,
            message_id,
            runtime_invocation_id,
            usage_fact_id,
            usage_type,
            provider,
            model,
            input_tokens,
            output_tokens,
            cached_tokens,
            reasoning_tokens,
            total_tokens,
            cost_amount,
            currency,
            occurred_at,
            metadata
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'chat_response', ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
        "#,
    )
    .bind(usage_link_id)
    .bind(usage_link_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(conversation_code)
    .bind(&command.turn_id)
    .bind(message_id)
    .bind(&command.runtime_invocation_id)
    .bind(command.usage_fact_id)
    .bind(&command.provider)
    .bind(&command.model)
    .bind(usage.input_tokens)
    .bind(usage.output_tokens)
    .bind(usage.cached_tokens)
    .bind(usage.reasoning_tokens)
    .bind(usage.total_tokens)
    .bind(&usage.cost_amount)
    .bind(&usage.currency)
    .bind(&command.requested_at)
    .bind(&metadata)
    .execute(&mut **tx)
    .await
    .map_err(sql_error)?;
    Ok(())
}

async fn update_usage_link_for_message(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CompleteAppChatTurnCommand,
    conversation_code: &str,
    message_id: &str,
    usage_link_id: &str,
    usage: &AppChatUsageSnapshot,
    metadata: &str,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_runtime_usage_link
        SET user_id = ?1,
            conversation_id = ?2,
            chat_turn_id = ?3,
            message_id = ?4,
            runtime_invocation_id = ?5,
            usage_fact_id = ?6,
            provider = ?7,
            model = ?8,
            input_tokens = ?9,
            output_tokens = ?10,
            cached_tokens = ?11,
            reasoning_tokens = ?12,
            total_tokens = ?13,
            cost_amount = ?14,
            currency = ?15,
            occurred_at = ?16,
            metadata = ?17
        WHERE tenant_id = ?18
          AND organization_id = ?19
          AND uuid = ?20
        "#,
    )
    .bind(command.subject.user_id)
    .bind(conversation_code)
    .bind(&command.turn_id)
    .bind(message_id)
    .bind(&command.runtime_invocation_id)
    .bind(command.usage_fact_id)
    .bind(&command.provider)
    .bind(&command.model)
    .bind(usage.input_tokens)
    .bind(usage.output_tokens)
    .bind(usage.cached_tokens)
    .bind(usage.reasoning_tokens)
    .bind(usage.total_tokens)
    .bind(&usage.cost_amount)
    .bind(&usage.currency)
    .bind(&command.requested_at)
    .bind(metadata)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(usage_link_id)
    .execute(&mut **tx)
    .await
    .map_err(sql_error)?;
    Ok(())
}

async fn reconcile_usage_link(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CompleteAppChatTurnCommand,
    conversation_code: &str,
    message_id: &str,
    existing_usage_link_id: Option<String>,
    usage: &AppChatUsageSnapshot,
    metadata: &str,
) -> DomainResult<Option<String>> {
    if !(command.usage.is_some()
        || command.runtime_invocation_id.is_some()
        || command.usage_fact_id.is_some())
    {
        return Ok(existing_usage_link_id);
    }
    if let Some(usage_link_id) = existing_usage_link_id {
        update_usage_link_for_message(
            tx,
            command,
            conversation_code,
            message_id,
            &usage_link_id,
            usage,
            metadata,
        )
        .await?;
        return Ok(Some(usage_link_id));
    }
    insert_usage_link_for_message(
        tx,
        command,
        conversation_code,
        message_id,
        &command.usage_link_uuid,
        usage,
    )
    .await?;
    Ok(Some(command.usage_link_uuid.clone()))
}

/// Validated chat table identifiers used for sequence counting.
///
/// Using a typed enum prevents SQL injection through `format!` interpolation by
/// restricting table names to a fixed, code-owned set of values.
enum ChatCountTable {
    AiChatTurn,
    AiChatItem,
    AiChatMessage,
}

impl ChatCountTable {
    /// Returns the validated SQL identifier for this table.
    fn as_sql_identifier(&self) -> &'static str {
        match self {
            ChatCountTable::AiChatTurn => "ai_chat_turn",
            ChatCountTable::AiChatItem => "ai_chat_item",
            ChatCountTable::AiChatMessage => "ai_chat_message",
        }
    }
}

async fn next_count(
    tx: &mut Transaction<'_, Sqlite>,
    table: ChatCountTable,
    conversation_pk: i64,
) -> DomainResult<i64> {
    let table_name = table.as_sql_identifier();
    let sql = format!(
        "SELECT COUNT(*) + 1 AS next_value FROM {table_name} WHERE conversation_id = ?1"
    );
    let row = sqlx::query(&sql)
        .bind(conversation_pk)
        .fetch_one(&mut **tx)
        .await
        .map_err(sql_error)?;
    Ok(row.get::<i64, _>("next_value"))
}

async fn insert_item(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAppChatTurnCommand,
    conversation_pk: i64,
    turn_id: i64,
    uuid: &str,
    sequence_no: i64,
    item_type: &str,
    role: Option<&str>,
    direction: &str,
    status: &str,
    content_text: Option<&str>,
) -> DomainResult<i64> {
    let metadata = serde_json::to_string(&command.metadata)
        .map_err(|error| DomainError::new(format!("invalid chat item metadata: {error}")))?;
    let item_id = next_claw_runtime_id("ai_chat_item")?;
    sqlx::query(
        r#"
        INSERT INTO ai_chat_item (
            id,
            uuid,
            tenant_id,
            organization_id,
            user_id,
            conversation_id,
            turn_id,
            sequence_no,
            item_type,
            role,
            direction,
            status,
            content_text,
            content_json,
            created_at,
            completed_at,
            metadata
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, NULL, ?14, ?14, ?15)
        "#,
    )
    .bind(item_id)
    .bind(uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(conversation_pk)
    .bind(turn_id)
    .bind(sequence_no)
    .bind(item_type)
    .bind(role)
    .bind(direction)
    .bind(status)
    .bind(content_text)
    .bind(&command.requested_at)
    .bind(&metadata)
    .execute(&mut **tx)
    .await
    .map_err(sql_error)?;
    Ok(item_id)
}

fn row_to_conversation(row: sqlx::sqlite::SqliteRow) -> DomainResult<AppChatConversationItem> {
    Ok(AppChatConversationItem {
        id: string_cell(&row, "conversation_code"),
        title: string_cell(&row, "title"),
        status: string_cell(&row, "status"),
        source_surface: string_cell(&row, "source_surface"),
        default_model: optional_string_cell(&row, "default_model"),
        default_provider: optional_string_cell(&row, "default_provider"),
        agent_id: optional_string_cell(&row, "agent_id"),
        agent_session_id: optional_string_cell(&row, "agent_session_id"),
        memory_space_id: optional_string_cell(&row, "memory_space_id"),
        last_message_preview: optional_string_cell(&row, "last_message_preview"),
        message_count: integer_cell(&row, "message_count"),
        turn_count: integer_cell(&row, "turn_count"),
        created_at: string_cell(&row, "created_at"),
        updated_at: string_cell(&row, "updated_at"),
    })
}

fn row_to_message(row: sqlx::sqlite::SqliteRow) -> DomainResult<AppChatMessageItem> {
    Ok(AppChatMessageItem {
        id: string_cell(&row, "uuid"),
        conversation_id: string_cell(&row, "conversation_code"),
        turn_id: optional_string_cell(&row, "turn_uuid"),
        role: string_cell(&row, "role"),
        direction: string_cell(&row, "direction"),
        content: string_cell(&row, "content_text"),
        status: string_cell(&row, "status"),
        model: optional_string_cell(&row, "model"),
        provider: optional_string_cell(&row, "provider"),
        runtime: optional_string_cell(&row, "runtime").or_else(|| runtime_from_metadata(&row)),
        runtime_invocation_id: optional_string_cell(&row, "runtime_invocation_id"),
        usage_link_id: optional_string_cell(&row, "usage_link_id")
            .or_else(|| optional_string_cell(&row, "usage_link_uuid")),
        usage: usage_from_row(&row),
        created_at: string_cell(&row, "created_at"),
    })
}

fn usage_from_row(row: &sqlx::sqlite::SqliteRow) -> Option<AppChatUsageSnapshot> {
    let has_usage = optional_string_cell(row, "usage_link_id").is_some()
        || optional_string_cell(row, "usage_link_uuid").is_some();
    has_usage.then(|| AppChatUsageSnapshot {
        input_tokens: integer_cell(row, "usage_input_tokens"),
        output_tokens: integer_cell(row, "usage_output_tokens"),
        cached_tokens: integer_cell(row, "usage_cached_tokens"),
        reasoning_tokens: integer_cell(row, "usage_reasoning_tokens"),
        total_tokens: integer_cell(row, "usage_total_tokens"),
        cost_amount: optional_string_cell(row, "usage_cost_amount"),
        currency: optional_string_cell(row, "usage_currency"),
    })
}

fn runtime_from_metadata(row: &sqlx::sqlite::SqliteRow) -> Option<String> {
    let metadata = optional_string_cell(row, "metadata")?;
    let value = serde_json::from_str::<serde_json::Value>(&metadata).ok()?;
    value
        .get("runtime")
        .and_then(|runtime| runtime.as_str())
        .map(str::to_owned)
}

fn json_string(value: &Value, field: &str) -> DomainResult<String> {
    serde_json::to_string(value)
        .map_err(|error| DomainError::new(format!("invalid {field}: {error}")))
}

fn metadata_string_field(metadata: &Value, field: &str) -> Option<String> {
    metadata
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn optional_string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<String> {
    let value = string_cell(row, column).trim().to_owned();
    (!value.is_empty()).then_some(value)
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> i64 {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(format!("sqlite app chat store error: {error}"))
}
