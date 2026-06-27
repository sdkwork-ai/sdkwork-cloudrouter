use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAppChatStore;
use sdkwork_clawrouter_router_service::ports::{
    AppChatStore, AppChatSubject, AppChatUsageSnapshot, CompleteAppChatTurnCommand,
    CreateAppChatConversationCommand, CreateAppChatTurnCommand,
};
use sdkwork_clawrouter_router_service_test_support::schema_sqlite_pool;
use serde_json::json;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Row;

#[tokio::test]
async fn sqlite_app_chat_store_creates_conversation_and_turn_timeline() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_chat_tables(&pool).await;
    let store = SqliteAppChatStore::new(pool.clone());
    let subject = AppChatSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    let conversation = store
        .create_conversation(CreateAppChatConversationCommand {
            subject,
            conversation_uuid: "conv-uuid-1".to_owned(),
            title: Some("Router design".to_owned()),
            source_surface: "playground".to_owned(),
            default_model: Some("gpt-5.1".to_owned()),
            default_provider: Some("openai".to_owned()),
            agent_id: Some("agent-1".to_owned()),
            agent_session_id: Some("agent-session-1".to_owned()),
            memory_space_id: Some("memory-space-1".to_owned()),
            metadata: json!({"client":"test"}),
            requested_at: "2026-05-18 08:00:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("conv-uuid-1", conversation.id);
    assert_eq!("Router design", conversation.title);
    assert_eq!("playground", conversation.source_surface);
    assert_eq!("gpt-5.1", conversation.default_model.as_deref().unwrap());

    let turn = store
        .create_turn(CreateAppChatTurnCommand {
            subject,
            conversation_id: "conv-uuid-1".to_owned(),
            turn_uuid: "turn-uuid-1".to_owned(),
            input_item_uuid: "input-item-uuid-1".to_owned(),
            input_message_uuid: "input-message-uuid-1".to_owned(),
            output_item_uuid: "output-item-uuid-1".to_owned(),
            output_message_uuid: "output-message-uuid-1".to_owned(),
            message: "Design a standard chat system".to_owned(),
            mode: Some("agent".to_owned()),
            agent_id: Some("agent-1".to_owned()),
            agent_session_id: Some("agent-session-1".to_owned()),
            model: Some("claude-sonnet-4-5".to_owned()),
            provider: Some("anthropic".to_owned()),
            metadata: json!({"client":"test"}),
            requested_at: "2026-05-18 08:01:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("turn-uuid-1", turn.turn.id);
    assert_eq!("running", turn.turn.status);
    assert_eq!(1, turn.messages.len());
    assert_eq!("input-message-uuid-1", turn.messages[0].id);
    assert_eq!("user", turn.messages[0].role);
    assert_eq!("Design a standard chat system", turn.messages[0].content);

    let listed = store.list_conversations(subject, 1, 20).await.unwrap();
    assert_eq!(1, listed.items.len());
    assert_eq!("conv-uuid-1", listed.items[0].id);
    assert_eq!(1, listed.items[0].turn_count);
    assert_eq!(1, listed.items[0].message_count);
    assert_eq!(
        "Design a standard chat system",
        listed.items[0].last_message_preview.as_deref().unwrap()
    );

    let messages = store
        .list_messages(subject, "conv-uuid-1".to_owned())
        .await
        .unwrap();
    assert_eq!(1, messages.len());
    assert_eq!("input-message-uuid-1", messages[0].id);
    assert_eq!("conv-uuid-1", messages[0].conversation_id);
    assert_eq!(Some("turn-uuid-1"), messages[0].turn_id.as_deref());

    let completed = store
        .complete_turn_response(CompleteAppChatTurnCommand {
            subject,
            conversation_id: "conv-uuid-1".to_owned(),
            turn_id: "turn-uuid-1".to_owned(),
            output_message_uuid: "output-message-uuid-1".to_owned(),
            output_part_uuid: "output-part-uuid-1".to_owned(),
            usage_link_uuid: "usage-link-uuid-1".to_owned(),
            message: "Use a dedicated ChatConversation and ChatMessage system.".to_owned(),
            status: "completed".to_owned(),
            model: Some("claude-sonnet-4-5".to_owned()),
            provider: Some("anthropic".to_owned()),
            runtime: Some("claude_code".to_owned()),
            runtime_invocation_id: Some("runtime-invocation-1".to_owned()),
            usage_fact_id: Some(101),
            usage: Some(AppChatUsageSnapshot {
                input_tokens: 100,
                output_tokens: 200,
                cached_tokens: 10,
                reasoning_tokens: 20,
                total_tokens: 330,
                cost_amount: Some("0.123".to_owned()),
                currency: Some("USD".to_owned()),
            }),
            metadata: json!({"runtime":"claude_code","providerResponseId":"msg_123"}),
            requested_at: "2026-05-18 08:02:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("turn-uuid-1", completed.turn.id);
    assert_eq!("completed", completed.turn.status);
    assert_eq!(1, completed.messages.len());
    assert_eq!("output-message-uuid-1", completed.messages[0].id);
    assert_eq!("assistant", completed.messages[0].role);
    assert_eq!("output", completed.messages[0].direction);
    assert_eq!(
        "runtime-invocation-1",
        completed.messages[0]
            .runtime_invocation_id
            .as_deref()
            .unwrap()
    );
    assert_eq!(
        330,
        completed.messages[0].usage.as_ref().unwrap().total_tokens
    );

    let listed = store.list_conversations(subject, 1, 20).await.unwrap();
    assert_eq!(2, listed.items[0].message_count);
    assert_eq!(1, listed.items[0].turn_count);
    assert_eq!(
        "Use a dedicated ChatConversation and ChatMessage system.",
        listed.items[0].last_message_preview.as_deref().unwrap()
    );

    let messages = store
        .list_messages(subject, "conv-uuid-1".to_owned())
        .await
        .unwrap();
    assert_eq!(2, messages.len());
    assert_eq!("input-message-uuid-1", messages[0].id);
    assert_eq!("output-message-uuid-1", messages[1].id);
    assert_eq!("conv-uuid-1", messages[1].conversation_id);
    assert_eq!(Some("turn-uuid-1"), messages[1].turn_id.as_deref());
    assert_eq!("assistant", messages[1].role);
    assert_eq!("output", messages[1].direction);
    assert_eq!(
        "Use a dedicated ChatConversation and ChatMessage system.",
        messages[1].content
    );
    assert_eq!("completed", messages[1].status);
    assert_eq!("claude-sonnet-4-5", messages[1].model.as_deref().unwrap());
    assert_eq!("anthropic", messages[1].provider.as_deref().unwrap());
    assert_eq!("claude_code", messages[1].runtime.as_deref().unwrap());
    assert_eq!(
        "usage-link-uuid-1",
        messages[1].usage_link_id.as_deref().unwrap()
    );
    assert_eq!(100, messages[1].usage.as_ref().unwrap().input_tokens);
    assert_eq!(200, messages[1].usage.as_ref().unwrap().output_tokens);

    let replayed = store
        .complete_turn_response(CompleteAppChatTurnCommand {
            subject,
            conversation_id: "conv-uuid-1".to_owned(),
            turn_id: "turn-uuid-1".to_owned(),
            output_message_uuid: "output-message-uuid-retry".to_owned(),
            output_part_uuid: "output-part-uuid-retry".to_owned(),
            usage_link_uuid: "usage-link-uuid-retry".to_owned(),
            message: "Duplicate browser recovery submit must not create another output.".to_owned(),
            status: "completed".to_owned(),
            model: Some("claude-sonnet-4-5".to_owned()),
            provider: Some("anthropic".to_owned()),
            runtime: Some("claude_code".to_owned()),
            runtime_invocation_id: Some("runtime-invocation-1".to_owned()),
            usage_fact_id: Some(101),
            usage: Some(AppChatUsageSnapshot {
                input_tokens: 100,
                output_tokens: 200,
                cached_tokens: 10,
                reasoning_tokens: 20,
                total_tokens: 330,
                cost_amount: Some("0.123".to_owned()),
                currency: Some("USD".to_owned()),
            }),
            metadata: json!({"runtime":"claude_code","providerResponseId":"msg_123"}),
            requested_at: "2026-05-18 08:03:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("completed", replayed.turn.status);
    assert_eq!(1, replayed.messages.len());
    assert_eq!("output-message-uuid-1", replayed.messages[0].id);
    assert_eq!(
        "Use a dedicated ChatConversation and ChatMessage system.",
        replayed.messages[0].content
    );

    let message_count: i64 = sqlx::query("SELECT COUNT(*) AS count_value FROM ai_chat_message")
        .fetch_one(&pool)
        .await
        .unwrap()
        .get("count_value");
    assert_eq!(
        2, message_count,
        "replayed chat turn completion must not insert a duplicate assistant message"
    );

    let usage_link_count: i64 =
        sqlx::query("SELECT COUNT(*) AS count_value FROM ai_runtime_usage_link")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get("count_value");
    assert_eq!(
        1, usage_link_count,
        "replayed chat turn completion must not duplicate usage billing links"
    );

    let item_count: i64 = sqlx::query("SELECT COUNT(*) AS count_value FROM ai_chat_item")
        .fetch_one(&pool)
        .await
        .unwrap()
        .get("count_value");
    assert_eq!(2, item_count);

    let part_count: i64 = sqlx::query("SELECT COUNT(*) AS count_value FROM ai_chat_message_part")
        .fetch_one(&pool)
        .await
        .unwrap()
        .get("count_value");
    assert_eq!(2, part_count);

    let output_item = sqlx::query(
        "SELECT status, content_text, runtime_invocation_id FROM ai_chat_item WHERE uuid = 'output-item-uuid-1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("completed", output_item.get::<String, _>("status"));
    assert_eq!(
        "Use a dedicated ChatConversation and ChatMessage system.",
        output_item.get::<String, _>("content_text")
    );
    assert_eq!(
        "runtime-invocation-1",
        output_item.get::<String, _>("runtime_invocation_id")
    );

    let usage_link = sqlx::query(
        "SELECT input_tokens, output_tokens, total_tokens, cost_amount, currency FROM ai_runtime_usage_link WHERE uuid = 'usage-link-uuid-1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(100_i64, usage_link.get::<i64, _>("input_tokens"));
    assert_eq!(200_i64, usage_link.get::<i64, _>("output_tokens"));
    assert_eq!(330_i64, usage_link.get::<i64, _>("total_tokens"));
    assert_eq!("0.123", usage_link.get::<String, _>("cost_amount"));
    assert_eq!("USD", usage_link.get::<String, _>("currency"));

    let snapshot = sqlx::query(
        r#"
        SELECT
            s.uuid,
            s.status,
            s.snapshot_no,
            s.strategy,
            s.included_item_ids,
            s.context_json,
            t.context_snapshot_id
        FROM ai_chat_context_snapshot s
        INNER JOIN ai_chat_turn t ON t.context_snapshot_id = s.id
        INNER JOIN ai_chat_conversation c ON c.id = t.conversation_id
        WHERE s.tenant_id = 100001
          AND s.organization_id = 0
          AND s.user_id = 30
          AND c.uuid = 'conv-uuid-1'
          AND t.uuid = 'turn-uuid-1'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "turn-uuid-1-context-snapshot-1",
        snapshot.get::<String, _>("uuid")
    );
    assert_eq!("active", snapshot.get::<String, _>("status"));
    assert_eq!(1_i64, snapshot.get::<i64, _>("snapshot_no"));
    assert_eq!("full_turn_context", snapshot.get::<String, _>("strategy"));
    assert_eq!(
        r#"["input-item-uuid-1","output-item-uuid-1"]"#,
        snapshot.get::<String, _>("included_item_ids")
    );
    assert!(snapshot
        .get::<String, _>("context_json")
        .contains("\"runtimeInvocationId\":\"runtime-invocation-1\""));
    assert!(snapshot.get::<i64, _>("context_snapshot_id") > 0);
}

#[tokio::test]
async fn sqlite_app_chat_store_preserves_multiline_markdown_response_content() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_chat_tables(&pool).await;
    let store = SqliteAppChatStore::new(pool.clone());
    let subject = AppChatSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    store
        .create_conversation(CreateAppChatConversationCommand {
            subject,
            conversation_uuid: "markdown-conv-1".to_owned(),
            title: Some("Markdown chat".to_owned()),
            source_surface: "playground".to_owned(),
            default_model: Some("gpt-5.1".to_owned()),
            default_provider: Some("openai".to_owned()),
            agent_id: None,
            agent_session_id: None,
            memory_space_id: None,
            metadata: json!({"client":"markdown-test"}),
            requested_at: "2026-05-18 10:00:00".to_owned(),
        })
        .await
        .unwrap();

    store
        .create_turn(CreateAppChatTurnCommand {
            subject,
            conversation_id: "markdown-conv-1".to_owned(),
            turn_uuid: "markdown-turn-1".to_owned(),
            input_item_uuid: "markdown-input-item-1".to_owned(),
            input_message_uuid: "markdown-input-message-1".to_owned(),
            output_item_uuid: "markdown-output-item-1".to_owned(),
            output_message_uuid: "markdown-output-message-1".to_owned(),
            message: "Return formatted code".to_owned(),
            mode: Some("chat".to_owned()),
            agent_id: None,
            agent_session_id: None,
            model: Some("gpt-5.1".to_owned()),
            provider: Some("openai".to_owned()),
            metadata: json!({"client":"markdown-test"}),
            requested_at: "2026-05-18 10:01:00".to_owned(),
        })
        .await
        .unwrap();

    let markdown = "\n### Answer\n\n```ts\n  const first = 1;\n  const second = 2;\n```\n";
    let completed = store
        .complete_turn_response(CompleteAppChatTurnCommand {
            subject,
            conversation_id: "markdown-conv-1".to_owned(),
            turn_id: "markdown-turn-1".to_owned(),
            output_message_uuid: "markdown-output-message-1".to_owned(),
            output_part_uuid: "markdown-output-part-1".to_owned(),
            usage_link_uuid: "markdown-usage-link-1".to_owned(),
            message: markdown.to_owned(),
            status: "completed".to_owned(),
            model: Some("gpt-5.1".to_owned()),
            provider: Some("openai".to_owned()),
            runtime: Some("openai_compatible".to_owned()),
            runtime_invocation_id: Some("markdown-runtime-1".to_owned()),
            usage_fact_id: None,
            usage: None,
            metadata: json!({"runtime":"openai_compatible"}),
            requested_at: "2026-05-18 10:02:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(markdown, completed.messages[0].content);

    let messages = store
        .list_messages(subject, "markdown-conv-1".to_owned())
        .await
        .unwrap();
    assert_eq!(2, messages.len());
    assert_eq!(markdown, messages[1].content);

    let stored_message = sqlx::query(
        "SELECT content_text FROM ai_chat_message WHERE uuid = 'markdown-output-message-1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(markdown, stored_message.get::<String, _>("content_text"));

    let stored_item =
        sqlx::query("SELECT content_text FROM ai_chat_item WHERE uuid = 'markdown-output-item-1'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(markdown, stored_item.get::<String, _>("content_text"));

    let stored_part = sqlx::query(
        "SELECT text_content FROM ai_chat_message_part WHERE uuid = 'markdown-output-part-1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(markdown, stored_part.get::<String, _>("text_content"));
}

#[tokio::test]
async fn sqlite_app_chat_store_finalizes_streaming_turn_response_without_duplicate_messages() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_chat_tables(&pool).await;
    let store = SqliteAppChatStore::new(pool.clone());
    let subject = AppChatSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    store
        .create_conversation(CreateAppChatConversationCommand {
            subject,
            conversation_uuid: "streaming-conv-1".to_owned(),
            title: Some("Streaming chat".to_owned()),
            source_surface: "playground".to_owned(),
            default_model: Some("gpt-5.1".to_owned()),
            default_provider: Some("openai".to_owned()),
            agent_id: None,
            agent_session_id: None,
            memory_space_id: None,
            metadata: json!({"client":"streaming-test"}),
            requested_at: "2026-05-18 11:00:00".to_owned(),
        })
        .await
        .unwrap();

    store
        .create_turn(CreateAppChatTurnCommand {
            subject,
            conversation_id: "streaming-conv-1".to_owned(),
            turn_uuid: "streaming-turn-1".to_owned(),
            input_item_uuid: "streaming-input-item-1".to_owned(),
            input_message_uuid: "streaming-input-message-1".to_owned(),
            output_item_uuid: "streaming-output-item-1".to_owned(),
            output_message_uuid: "streaming-output-message-1".to_owned(),
            message: "Stream a response".to_owned(),
            mode: Some("chat".to_owned()),
            agent_id: None,
            agent_session_id: None,
            model: Some("gpt-5.1".to_owned()),
            provider: Some("openai".to_owned()),
            metadata: json!({"client":"streaming-test"}),
            requested_at: "2026-05-18 11:01:00".to_owned(),
        })
        .await
        .unwrap();

    let streaming = store
        .complete_turn_response(CompleteAppChatTurnCommand {
            subject,
            conversation_id: "streaming-conv-1".to_owned(),
            turn_id: "streaming-turn-1".to_owned(),
            output_message_uuid: "streaming-output-message-1".to_owned(),
            output_part_uuid: "streaming-output-part-1".to_owned(),
            usage_link_uuid: "streaming-usage-link-1".to_owned(),
            message: "partial".to_owned(),
            status: "streaming".to_owned(),
            model: Some("gpt-5.1".to_owned()),
            provider: Some("openai".to_owned()),
            runtime: Some("openai_compatible".to_owned()),
            runtime_invocation_id: Some("streaming-runtime-1".to_owned()),
            usage_fact_id: None,
            usage: None,
            metadata: json!({"runtime":"openai_compatible"}),
            requested_at: "2026-05-18 11:02:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("streaming", streaming.turn.status);
    assert_eq!("streaming-output-message-1", streaming.messages[0].id);
    assert_eq!("partial", streaming.messages[0].content);

    let completed = store
        .complete_turn_response(CompleteAppChatTurnCommand {
            subject,
            conversation_id: "streaming-conv-1".to_owned(),
            turn_id: "streaming-turn-1".to_owned(),
            output_message_uuid: "streaming-output-message-final".to_owned(),
            output_part_uuid: "streaming-output-part-final".to_owned(),
            usage_link_uuid: "streaming-usage-link-final".to_owned(),
            message: "partial and final".to_owned(),
            status: "completed".to_owned(),
            model: Some("gpt-5.1".to_owned()),
            provider: Some("openai".to_owned()),
            runtime: Some("openai_compatible".to_owned()),
            runtime_invocation_id: Some("streaming-runtime-1".to_owned()),
            usage_fact_id: Some(202),
            usage: Some(AppChatUsageSnapshot {
                input_tokens: 10,
                output_tokens: 20,
                cached_tokens: 0,
                reasoning_tokens: 0,
                total_tokens: 30,
                cost_amount: Some("0.030".to_owned()),
                currency: Some("USD".to_owned()),
            }),
            metadata: json!({"runtime":"openai_compatible","providerResponseId":"chatcmpl_123"}),
            requested_at: "2026-05-18 11:03:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("completed", completed.turn.status);
    assert_eq!(1, completed.messages.len());
    assert_eq!("streaming-output-message-1", completed.messages[0].id);
    assert_eq!("partial and final", completed.messages[0].content);
    assert_eq!("completed", completed.messages[0].status);
    assert_eq!(
        Some("streaming-runtime-1"),
        completed.messages[0].runtime_invocation_id.as_deref()
    );
    assert_eq!(
        30,
        completed.messages[0].usage.as_ref().unwrap().total_tokens
    );

    let message_count: i64 = sqlx::query("SELECT COUNT(*) AS count_value FROM ai_chat_message")
        .fetch_one(&pool)
        .await
        .unwrap()
        .get("count_value");
    assert_eq!(
        2, message_count,
        "finalizing a streaming turn response must update the assistant message instead of inserting a duplicate"
    );

    let usage_link_count: i64 =
        sqlx::query("SELECT COUNT(*) AS count_value FROM ai_runtime_usage_link")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get("count_value");
    assert_eq!(
        1, usage_link_count,
        "finalizing a streaming turn response must reuse the existing usage link"
    );

    let stored_message = sqlx::query(
        "SELECT status, content_text, usage_link_id FROM ai_chat_message WHERE uuid = 'streaming-output-message-1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("completed", stored_message.get::<String, _>("status"));
    assert_eq!(
        "partial and final",
        stored_message.get::<String, _>("content_text")
    );
    assert_eq!(
        "streaming-usage-link-1",
        stored_message.get::<String, _>("usage_link_id")
    );

    let stored_part = sqlx::query(
        "SELECT text_content FROM ai_chat_message_part WHERE uuid = 'streaming-output-part-1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "partial and final",
        stored_part.get::<String, _>("text_content")
    );

    let usage_link = sqlx::query(
        "SELECT message_id, usage_fact_id, input_tokens, output_tokens, total_tokens, cost_amount, currency FROM ai_runtime_usage_link WHERE uuid = 'streaming-usage-link-1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "streaming-output-message-1",
        usage_link.get::<String, _>("message_id")
    );
    assert_eq!(202_i64, usage_link.get::<i64, _>("usage_fact_id"));
    assert_eq!(10_i64, usage_link.get::<i64, _>("input_tokens"));
    assert_eq!(20_i64, usage_link.get::<i64, _>("output_tokens"));
    assert_eq!(30_i64, usage_link.get::<i64, _>("total_tokens"));
    assert_eq!("0.030", usage_link.get::<String, _>("cost_amount"));
    assert_eq!("USD", usage_link.get::<String, _>("currency"));

    let listed = store.list_conversations(subject, 1, 20).await.unwrap();
    assert_eq!(2, listed.items[0].message_count);
    assert_eq!(
        "partial and final",
        listed.items[0].last_message_preview.as_deref().unwrap()
    );
}

#[tokio::test]
async fn sqlite_app_chat_store_turn_lifecycle_matches_installed_product_schema() {
    let pool = schema_sqlite_pool().await;
    let store = SqliteAppChatStore::new(pool);
    let subject = AppChatSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    store
        .create_conversation(CreateAppChatConversationCommand {
            subject,
            conversation_uuid: "installed-schema-conv-1".to_owned(),
            title: Some("Installed schema chat".to_owned()),
            source_surface: "playground".to_owned(),
            default_model: Some("gpt-5.1".to_owned()),
            default_provider: Some("openai".to_owned()),
            agent_id: None,
            agent_session_id: None,
            memory_space_id: None,
            metadata: json!({"client":"installed-schema-test"}),
            requested_at: "2026-05-18 09:00:00".to_owned(),
        })
        .await
        .unwrap();

    let turn = store
        .create_turn(CreateAppChatTurnCommand {
            subject,
            conversation_id: "installed-schema-conv-1".to_owned(),
            turn_uuid: "installed-schema-turn-1".to_owned(),
            input_item_uuid: "installed-schema-input-item-1".to_owned(),
            input_message_uuid: "installed-schema-input-message-1".to_owned(),
            output_item_uuid: "installed-schema-output-item-1".to_owned(),
            output_message_uuid: "installed-schema-output-message-1".to_owned(),
            message: "Verify installed schema chat turn".to_owned(),
            mode: Some("chat".to_owned()),
            agent_id: None,
            agent_session_id: None,
            model: Some("gpt-5.1".to_owned()),
            provider: Some("openai".to_owned()),
            metadata: json!({"client":"installed-schema-test"}),
            requested_at: "2026-05-18 09:01:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("installed-schema-turn-1", turn.turn.id);
    assert_eq!("running", turn.turn.status);

    let completed = store
        .complete_turn_response(CompleteAppChatTurnCommand {
            subject,
            conversation_id: "installed-schema-conv-1".to_owned(),
            turn_id: "installed-schema-turn-1".to_owned(),
            output_message_uuid: "installed-schema-output-message-1".to_owned(),
            output_part_uuid: "installed-schema-output-part-1".to_owned(),
            usage_link_uuid: "installed-schema-usage-link-1".to_owned(),
            message: "Installed schema accepted the full chat turn lifecycle.".to_owned(),
            status: "completed".to_owned(),
            model: Some("gpt-5.1".to_owned()),
            provider: Some("openai".to_owned()),
            runtime: None,
            runtime_invocation_id: None,
            usage_fact_id: None,
            usage: None,
            metadata: json!({"client":"installed-schema-test"}),
            requested_at: "2026-05-18 09:02:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("completed", completed.turn.status);
    assert_eq!(1, completed.messages.len());
    assert_eq!("assistant", completed.messages[0].role);
}

#[tokio::test]
async fn sqlite_app_chat_store_persists_opaque_memory_space_reference() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_chat_tables(&pool).await;
    let store = SqliteAppChatStore::new(pool);
    let subject = AppChatSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    let conversation = store
        .create_conversation(CreateAppChatConversationCommand {
            subject,
            conversation_uuid: "conv-uuid-1".to_owned(),
            title: Some("External memory".to_owned()),
            source_surface: "chat".to_owned(),
            default_model: None,
            default_provider: None,
            agent_id: None,
            agent_session_id: None,
            memory_space_id: Some("memory-space-external".to_owned()),
            metadata: json!({}),
            requested_at: "2026-05-18 08:01:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(
        Some("memory-space-external".to_owned()),
        conversation.memory_space_id
    );
}

async fn create_chat_tables(pool: &sqlx::SqlitePool) {
    for statement in CHAT_SCHEMA.split(';') {
        let statement = statement.trim();
        if !statement.is_empty() {
            sqlx::query(statement).execute(pool).await.unwrap();
        }
    }
}

const CHAT_SCHEMA: &str = r#"
CREATE TABLE ai_chat_conversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    metadata TEXT NOT NULL,
    conversation_code TEXT NOT NULL,
    title TEXT NOT NULL,
    source_surface TEXT NOT NULL,
    default_provider TEXT,
    default_model TEXT,
    agent_id TEXT,
    agent_session_id TEXT,
    memory_space_id TEXT,
    last_message_preview TEXT,
    message_count INTEGER NOT NULL DEFAULT 0,
    turn_count INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_ai_chat_conversation_code ON ai_chat_conversation (tenant_id, organization_id, user_id, conversation_code);
CREATE TABLE ai_chat_turn (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    conversation_id INTEGER NOT NULL,
    turn_no INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    agent_id TEXT,
    agent_session_id TEXT,
    runtime_invocation_id TEXT,
    context_snapshot_id INTEGER,
    started_at TEXT,
    completed_at TEXT,
    error_code TEXT,
    error_message TEXT,
    metadata TEXT NOT NULL
);
CREATE TABLE ai_chat_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    conversation_id INTEGER NOT NULL,
    turn_id INTEGER,
    sequence_no INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    role TEXT,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    content_text TEXT,
    content_json TEXT,
    provider_payload TEXT,
    runtime_invocation_id TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    metadata TEXT NOT NULL
);
CREATE TABLE ai_chat_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    conversation_id INTEGER NOT NULL,
    turn_id INTEGER,
    item_id INTEGER NOT NULL,
    message_no INTEGER NOT NULL,
    role TEXT NOT NULL,
    message_kind TEXT NOT NULL,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    content_text TEXT NOT NULL,
    model TEXT,
    provider TEXT,
    runtime TEXT,
    runtime_invocation_id TEXT,
    usage_link_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    metadata TEXT NOT NULL
);
CREATE TABLE ai_chat_message_part (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    part_no INTEGER NOT NULL,
    part_type TEXT NOT NULL,
    text_content TEXT,
    json_content TEXT,
    created_at TEXT NOT NULL,
    metadata TEXT NOT NULL
);
CREATE TABLE ai_chat_context_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    request_id TEXT,
    trace_id TEXT,
    payload_hash TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT 0,
    metadata TEXT NOT NULL DEFAULT '{}',
    conversation_id INTEGER NOT NULL,
    turn_id INTEGER,
    runtime_invocation_id INTEGER,
    snapshot_no INTEGER NOT NULL,
    strategy TEXT NOT NULL,
    included_item_ids TEXT,
    excluded_item_ids TEXT,
    included_memory_ids TEXT,
    excluded_memory_ids TEXT,
    memory_pack TEXT,
    memory_token_count INTEGER,
    provider_conversation_id TEXT,
    previous_response_id TEXT,
    input_token_estimate INTEGER,
    truncation_reason TEXT,
    context_json TEXT
);
CREATE TABLE ai_runtime_usage_link (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    user_id INTEGER,
    conversation_id TEXT,
    chat_turn_id TEXT,
    message_id TEXT,
    runtime_invocation_id TEXT,
    usage_fact_id INTEGER,
    usage_type TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cached_tokens INTEGER,
    reasoning_tokens INTEGER,
    total_tokens INTEGER,
    cost_amount TEXT,
    currency TEXT,
    occurred_at TEXT NOT NULL,
    metadata TEXT NOT NULL
);
"#;
